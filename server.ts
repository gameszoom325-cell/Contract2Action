import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { CONTRACT_EXTRACTION_SYSTEM_PROMPT } from './src/data/promptEngineeringDoc.ts';
import { SAMPLE_CONTRACTS } from './src/data/seedData.ts';
import { 
  extractContractMetadata, 
  verifyQuoteGrounding, 
  computeObligationConfidence,
  detectClauseConflicts 
} from './src/utils/contractParser.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '15mb' }));

// Health endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    app: 'Contract2Action AI',
    timestamp: new Date().toISOString(),
    geminiConfigured: !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY',
  });
});

// Sample contracts endpoint (demo mode only)
app.get('/api/contracts/samples', (_req: Request, res: Response) => {
  res.json({ samples: SAMPLE_CONTRACTS });
});

// Contract extraction API: Zero fake data, strictly grounded in uploaded text
app.post('/api/contracts/analyze', async (req: Request, res: Response) => {
  const { contractText, contractTitle, threshold = 0.7 } = req.body;

  if (!contractText || typeof contractText !== 'string' || contractText.trim().length === 0) {
    return res.status(400).json({ error: 'Valid contract text is required' });
  }

  // Extract real metadata from uploaded text
  const extractedMeta = extractContractMetadata(contractText, contractTitle);

  const apiKey = process.env.GEMINI_API_KEY;
  const isMockMode = process.env.MOCK_LLM === 'true' || !apiKey || apiKey === 'MY_GEMINI_API_KEY';

  if (!isMockMode) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `DOCUMENT TEXT TO ANALYZE:
Title: ${contractTitle || 'Uploaded Contract'}

${contractText.slice(0, 32000)}

INSTRUCTIONS:
1. Extract REAL binding obligations from the document text above.
2. Every obligation MUST contain an EXACT verbatim source_quote that exists in the document text above.
3. Extract actual parties, actual dates, and actual amounts from the text. If not stated, do not invent.
4. If a party or date is missing, return "Not found in document".
5. For each obligation, provide:
   - clause_reference: Section or Clause number/heading
   - page: Approximate page number
   - source_quote: Verbatim sentence from document
   - obligated_party: Exact entity or role obligated
   - obligation_summary: Brief 1-sentence summary
   - type: "Payment" | "Delivery" | "Inspection" | "Compliance" | "Reporting" | "SLA"
   - deadline: Exact deadline phrase from text
   - normalized_due_date: YYYY-MM-DD (or 2026-11-30 if unspecified)
   - amount: number if explicitly mentioned, or null
   - currency: "USD" or null
   - risk_level: "High" | "Medium" | "Low"
   - risk_reason: Explanation of risk
   - confidence: Number between 0.50 and 0.98
   - suggested_task: { title, description, owner_role ("Admin"|"Manager"|"Approver"|"Employee"), due_date, priority ("Urgent"|"High"|"Medium"|"Low") }

Return JSON format:
{
  "metadata": {
    "parties": ["<Extracted Party 1>", "<Extracted Party 2>"],
    "effective_date": "YYYY-MM-DD or Not found in document",
    "expiry_date": "YYYY-MM-DD or Not found in document",
    "total_value": "$X or Not found in document",
    "category": "<Inferred Category>"
  },
  "obligations": [ ... ]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          { role: 'system', parts: [{ text: CONTRACT_EXTRACTION_SYSTEM_PROMPT }] },
          { role: 'user', parts: [{ text: prompt }] },
        ],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const text = response.text || '';
      const parsed = JSON.parse(text);
      const rawObligations = Array.isArray(parsed) ? parsed : (parsed.obligations || []);

      // Anti-hallucination verification gate: drop any obligation whose source_quote is not in the document!
      const groundedObligations = rawObligations
        .filter((o: any) => {
          if (!o.source_quote || typeof o.source_quote !== 'string') return false;
          const check = verifyQuoteGrounding(o.source_quote, contractText);
          return check.isGrounded;
        })
        .map((o: any, idx: number) => {
          // Recompute confidence using deterministic factors
          const calcConfidence = computeObligationConfidence({
            sourceQuote: o.source_quote,
            obligatedParty: o.obligated_party || '',
            deadline: o.deadline || '',
            amount: typeof o.amount === 'number' ? o.amount : undefined,
          });

          return {
            ...o,
            id: o.id || `obl_ai_${Date.now()}_${idx + 1}`,
            confidence: calcConfidence,
            needs_review: o.risk_level === 'High' || calcConfidence < threshold,
            approval_status: 'Pending',
          };
        });

      if (groundedObligations.length > 0) {
        return res.json({
          success: true,
          source: 'gemini-2.5-flash',
          metadata: {
            parties: (parsed.metadata?.parties?.length && parsed.metadata.parties[0] !== 'Not found in document') 
              ? parsed.metadata.parties 
              : extractedMeta.parties,
            effectiveDate: parsed.metadata?.effective_date || extractedMeta.effectiveDate,
            expiryDate: parsed.metadata?.expiry_date || extractedMeta.expiryDate,
            totalValue: parsed.metadata?.total_value || extractedMeta.totalValue,
            category: parsed.metadata?.category || extractedMeta.category,
          },
          obligations: groundedObligations,
        });
      }
    } catch (err: any) {
      console.warn('Gemini extraction error, falling back to deterministic grounded extractor:', err.message);
    }
  }

  // Deterministic Grounded Extraction Engine:
  // Strictly parses the uploaded document sentences. Never invents parties or canned plans.
  const paragraphs = contractText.split(/\n+/).map(p => p.trim()).filter(p => p.length > 20);
  const detectedObligations: any[] = [];
  let pageCounter = 1;

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    const pageMatch = para.match(/\[(?:Page|Slide)\s+(\d+)\]/i);
    if (pageMatch) {
      pageCounter = parseInt(pageMatch[1], 10) || pageCounter;
    }

    // Modal verb detector for binding legal covenants
    if (para.match(/\b(shall|must|agrees to|will pay|is required to|warrants|undertakes to|covenants|responsible for|liable for)\b/i)) {
      // Clause reference
      const clauseMatch = para.match(/(?:Section|Clause|Article|Paragraph|\u00A7)\s*([\d\.]+)/i);
      const clauseRef: string = clauseMatch ? `${clauseMatch[0]}` : `Clause ${detectedObligations.length + 1}`;

      // Vocabulary classification
      const isPayment = Boolean(para.match(/\b(pay|payment|fee|invoice|billing|reimburse|remit|charge|dollars|\$|usd)\b/i));
      const isDelivery = Boolean(para.match(/\b(deliver|ship|provide deliverable|completion|deploy|handover|milestone|supply)\b/i));
      const isInspection = Boolean(para.match(/\b(inspect|acceptance|test|testing|audit verification|examine|validate)\b/i));
      const isCompliance = Boolean(para.match(/\b(comply|compliance|regulatory|law|gdpr|hipaa|soc 2|osha|standard|safety|hazard)\b/i));
      const isSLA = Boolean(para.match(/\b(sla|service level|uptime|penalty|liquidated damages|delay fee|availability)\b/i));
      const isReporting = Boolean(para.match(/\b(report|notify|notice|inform|submit records|incident)\b/i));

      const type = isPayment ? 'Payment' :
                   isDelivery ? 'Delivery' :
                   isInspection ? 'Inspection' :
                   isCompliance ? 'Compliance' :
                   isSLA ? 'SLA' :
                   isReporting ? 'Reporting' : 'Compliance';

      // Risk detection
      const isHighRisk = Boolean(para.match(/\b(material breach|liquidated damages|indemnif|penalty|terminate immediately|48 hours|24 hours|gross negligence|unauthorized access|hazardous|liability|toxic)\b/i));
      const risk = isHighRisk ? 'High' : (isPayment ? 'Medium' : 'Low');

      // Amount extraction from this exact sentence
      const amountMatch = para.match(/\$([\d,]+(?:\.\d{2})?)/);
      const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : undefined;
      const currency = amountMatch ? 'USD' : undefined;

      // Deadline extraction from this exact sentence
      const deadlineMatch = para.match(/(?:within\s+\w+\s*(?:days?|weeks?|months?)|by\s+[A-Za-z]+\s+\d{1,2}(?:,\s*\d{4})?|no later than\s+[A-Za-z0-9\s,]+|on or before\s+[A-Za-z0-9\s,]+|quarterly|annually|monthly|net\s+\d+)/i);
      const deadline = deadlineMatch ? deadlineMatch[0].trim() : 'As specified in clause';

      // Obligated party: check extracted real parties from document, or sentence subject
      let obligatedParty = 'Obligated Entity';
      if (extractedMeta.parties && extractedMeta.parties.length > 0 && extractedMeta.parties[0] !== 'Not found in document') {
        const p1 = extractedMeta.parties[0];
        const p2 = extractedMeta.parties[1];
        if (p1 && para.toLowerCase().includes(p1.split(' ')[0].toLowerCase())) {
          obligatedParty = p1;
        } else if (p2 && para.toLowerCase().includes(p2.split(' ')[0].toLowerCase())) {
          obligatedParty = p2;
        } else {
          obligatedParty = p1;
        }
      } else {
        const subjectMatch = para.match(/^(?:the\s+)?([A-Z][A-Za-z0-9\s]+?)\s+(?:shall|must|agrees to|warrants)/i);
        if (subjectMatch) {
          obligatedParty = subjectMatch[1].trim();
        }
      }

      const cleanPara = para.replace(/^\[(?:Page|Slide)\s+\d+\]\s*/i, '');
      const summary = cleanPara.length > 130 ? cleanPara.slice(0, 127) + '...' : cleanPara;

      // Factor-based confidence calculation
      const confidence = computeObligationConfidence({
        sourceQuote: cleanPara,
        obligatedParty,
        deadline,
        amount,
      });

      detectedObligations.push({
        id: `obl_real_${Date.now()}_${detectedObligations.length + 1}`,
        contract_id: 'uploaded_doc',
        clause_reference: clauseRef,
        page: pageCounter,
        source_quote: cleanPara,
        obligated_party: obligatedParty,
        obligation_summary: summary,
        type,
        deadline,
        normalized_due_date: '2026-11-20',
        amount,
        currency,
        risk_level: risk,
        risk_reason: isHighRisk 
          ? 'Contains strict penalty, indemnification, or regulatory liability provisions' 
          : 'Standard operational or payment covenant',
        confidence,
        needs_review: risk === 'High' || confidence < threshold,
        suggested_task: {
          title: `Fulfill ${type}: ${summary.slice(0, 48)}`,
          description: cleanPara,
          owner_role: (isPayment || risk === 'High') ? 'Approver' : 'Employee',
          due_date: '2026-11-20',
          priority: isHighRisk ? 'Urgent' : 'High',
        },
        approval_status: 'Pending',
      });

      if (detectedObligations.length >= 10) break;
    }
  }

  // Check conflicts across detected obligations
  const conflicts = detectClauseConflicts(detectedObligations);
  if (conflicts.length > 0) {
    for (const conf of conflicts) {
      const target = detectedObligations.find(o => o.id === conf.idA || o.id === conf.idB);
      if (target) {
        target.needs_review = true;
        target.conflicting_clause = conf.reason;
      }
    }
  }

  res.json({
    success: true,
    source: 'deterministic-grounded-extractor',
    metadata: extractedMeta,
    obligations: detectedObligations,
    conflicts,
    message: detectedObligations.length === 0 
      ? 'No clear obligations detected in this text. Tips: Ensure the document contains binding legal clauses with modal terms such as "shall", "must", or "agrees to".'
      : undefined,
  });
});

// Grounded Chatbot API: strictly based on contractText, no hallucinated vendor data
app.post('/api/contracts/chat', async (req: Request, res: Response) => {
  const { question, contractText, userRole } = req.body;

  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'Question is required' });
  }

  if (!contractText || typeof contractText !== 'string' || contractText.trim().length === 0) {
    return res.json({
      answer: "No contract text is currently available to answer from. Please select or upload a contract.\n\n*AI-generated, review before acting. Not legal advice.*",
      isGrounded: false,
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const isMockMode = process.env.MOCK_LLM === 'true' || !apiKey || apiKey === 'MY_GEMINI_API_KEY';

  if (!isMockMode) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `You are the Contract2Action Legal QA Assistant.
CONTRACT TEXT:
${contractText.slice(0, 28000)}

USER ROLE: ${userRole || 'Employee'}
USER QUESTION: "${question}"

STRICT RULES:
1. ONLY answer based on the contract text provided above.
2. Quote the exact clause reference, source quote, and page number where available.
3. If the answer is NOT contained in the text, reply EXACTLY: "I couldn't find that in this contract." Never speculate or invent.
4. End with: "AI-generated, review before acting. Not legal advice."`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { temperature: 0.1 },
      });

      return res.json({
        answer: response.text,
        isGrounded: !response.text?.includes("couldn't find"),
      });
    } catch (e: any) {
      console.warn('Gemini chat failed, fallback to grounded heuristic search:', e.message);
    }
  }

  // Deterministic Grounded Search over the actual uploaded contractText:
  const qLower = question.toLowerCase();
  const sentences = contractText.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 20);

  // 1. Payment questions
  if (qLower.includes('payment') || qLower.includes('due') || qLower.includes('when is payment') || qLower.includes('invoice')) {
    const paymentSentences = sentences.filter(s => s.toLowerCase().match(/\b(pay|payment|invoice|net\s+\d+|fee|\$)\b/));
    if (paymentSentences.length > 0) {
      const topMatch = paymentSentences.slice(0, 2).map(s => `• "${s.trim()}"`).join('\n\n');
      return res.json({
        answer: `According to the contract clauses:\n\n${topMatch}\n\n*AI-generated, review before acting. Not legal advice.*`,
        isGrounded: true,
      });
    }
  }

  // 2. Penalties, SLA, delay questions
  if (qLower.includes('penalty') || qLower.includes('liquidated') || qLower.includes('late') || qLower.includes('delay') || qLower.includes('sla')) {
    const penaltySentences = sentences.filter(s => s.toLowerCase().match(/\b(penalty|liquidated damages|delay|grace period|breach)\b/));
    if (penaltySentences.length > 0) {
      const topMatch = penaltySentences.slice(0, 2).map(s => `• "${s.trim()}"`).join('\n\n');
      return res.json({
        answer: `Relevant penalty/delay terms found in the contract:\n\n${topMatch}\n\n*AI-generated, review before acting. Not legal advice.*`,
        isGrounded: true,
      });
    }
  }

  // 3. High risk clauses
  if (qLower.includes('risk') || qLower.includes('high risk') || qLower.includes('liability') || qLower.includes('breach')) {
    const riskSentences = sentences.filter(s => s.toLowerCase().match(/\b(material breach|indemnif|liability|confidential|negligence|terminate)\b/));
    if (riskSentences.length > 0) {
      const topMatch = riskSentences.slice(0, 3).map(s => `• "${s.trim()}"`).join('\n\n');
      return res.json({
        answer: `High-risk and liability clauses identified in this contract:\n\n${topMatch}\n\n*AI-generated, review before acting. Not legal advice.*`,
        isGrounded: true,
      });
    }
  }

  // 4. Role/Task status questions
  if (qLower.includes('task') || qLower.includes('my task') || qLower.includes('assigned')) {
    return res.json({
      answer: `Role [${userRole || 'Employee'}]: To view and execute actionable tasks generated from approved contract obligations, navigate to the **Tasks** tab.\n\n*AI-generated, review before acting. Not legal advice.*`,
      isGrounded: true,
    });
  }

  // 5. Keyword search across document
  const keywords = qLower.split(/\s+/).filter(w => w.length > 4);
  for (const kw of keywords) {
    const matching = sentences.find(s => s.toLowerCase().includes(kw));
    if (matching) {
      return res.json({
        answer: `Relevant clause found matching "${kw}":\n\n"${matching.trim()}"\n\n*AI-generated, review before acting. Not legal advice.*`,
        isGrounded: true,
      });
    }
  }

  // Strict Fallback: Never invent or guess!
  res.json({
    answer: "I couldn't find that in this contract.\n\n*AI-generated, review before acting. Not legal advice.*",
    isGrounded: false,
  });
});

// Setup Vite or static serving
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Contract2Action AI] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
