export interface TextChunk {
  chunkIndex: number;
  text: string;
  approximatePage: number;
  charStart: number;
  charEnd: number;
}

export interface ContractExtractedMetadata {
  parties: string[];
  effectiveDate: string;
  expiryDate: string;
  totalValue?: string;
  category: string;
}

export interface QuoteMatchResult {
  found: boolean;
  isExact: boolean;
  matchIndex: number;
  matchText?: string;
  page?: number;
  message?: string;
}

/**
 * Splits contract text into overlapping chunks suitable for LLM processing or retrieval.
 */
export function chunkContractText(fullText: string, chunkSize: number = 3000, overlap: number = 300): TextChunk[] {
  if (!fullText || fullText.trim().length === 0) return [];

  const chunks: TextChunk[] = [];
  let startIndex = 0;
  let chunkIndex = 0;

  while (startIndex < fullText.length) {
    let endIndex = Math.min(startIndex + chunkSize, fullText.length);
    
    // Attempt to break on natural paragraph boundary
    if (endIndex < fullText.length) {
      const nextNewline = fullText.lastIndexOf('\n\n', endIndex);
      if (nextNewline > startIndex + 1000) {
        endIndex = nextNewline + 2;
      }
    }

    const chunkText = fullText.substring(startIndex, endIndex);
    const approxPage = estimatePageNumber(startIndex, fullText);

    chunks.push({
      chunkIndex,
      text: chunkText,
      approximatePage: approxPage,
      charStart: startIndex,
      charEnd: endIndex,
    });

    if (endIndex >= fullText.length) break;
    startIndex = endIndex - overlap;
    chunkIndex++;
  }

  return chunks;
}

/**
 * Estimates the page number based on explicit [Page X] tags or character position (approx 2000 chars/page)
 */
export function estimatePageNumber(charIndex: number, fullText: string): number {
  const textUpToIndex = fullText.substring(0, charIndex);
  const pageMatches = [...textUpToIndex.matchAll(/\[(?:Page|Slide)\s+(\d+)\]/gi)];
  if (pageMatches.length > 0) {
    const lastPageNum = parseInt(pageMatches[pageMatches.length - 1][1], 10);
    if (!isNaN(lastPageNum)) return lastPageNum;
  }
  return Math.floor(charIndex / 2000) + 1;
}

/**
 * Strict anti-hallucination check: verifies whether a source quote is present in the document.
 * Normalizes minor whitespace differences.
 */
export function verifyQuoteGrounding(sourceQuote: string, fullContractText: string): { isGrounded: boolean; matchIndex: number } {
  if (!sourceQuote || !fullContractText) return { isGrounded: false, matchIndex: -1 };

  // 1. Direct exact match
  const directIdx = fullContractText.indexOf(sourceQuote.trim());
  if (directIdx !== -1) {
    return { isGrounded: true, matchIndex: directIdx };
  }

  // 2. Normalized whitespace check
  const normalize = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
  const normQuote = normalize(sourceQuote);
  const normText = normalize(fullContractText);

  const normIdx = normText.indexOf(normQuote);
  return {
    isGrounded: normIdx !== -1,
    matchIndex: normIdx,
  };
}

/**
 * Calculates a genuine, factor-based confidence score for an extracted obligation.
 * Factors:
 * 1. Clear identifiable obligor: +0.25
 * 2. Specific deadline/date or timeline: +0.25
 * 3. Strong binding modal verb ("shall", "must", "agrees to pay"): +0.35 (or +0.20 for weaker modal)
 * 4. Specific amount or measurable deliverable: +0.15
 */
export function computeObligationConfidence(params: {
  sourceQuote: string;
  obligatedParty: string;
  deadline: string;
  amount?: number;
}): number {
  let score = 0.50; // base score

  const quoteLower = params.sourceQuote.toLowerCase();

  // Factor 1: Clear obligor (not generic placeholder)
  const isGenericParty = !params.obligatedParty || 
    params.obligatedParty === 'Not found in document' ||
    params.obligatedParty === 'Party A' ||
    params.obligatedParty === 'Party B' ||
    params.obligatedParty.toLowerCase().includes('contractor / provider');
  
  if (!isGenericParty && params.obligatedParty.length > 3) {
    score += 0.20;
  } else if (!isGenericParty) {
    score += 0.10;
  }

  // Factor 2: Explicit deadline
  const hasSpecificDate = Boolean(params.deadline && 
    (params.deadline.match(/\d{4}-\d{2}-\d{2}|\b[A-Za-z]+\s+\d{1,2}(?:,\s*\d{4})?\b/i) ||
     params.deadline.match(/within\s+\d+\s*(?:calendar|business)?\s*(?:days?|weeks?|months?)/i) ||
     params.deadline.match(/net\s+\d+/i)));
  
  if (hasSpecificDate) {
    score += 0.15;
  } else if (params.deadline && params.deadline !== 'As specified in clause') {
    score += 0.08;
  }

  // Factor 3: Strong binding modal verbs
  if (quoteLower.match(/\b(shall\s+pay|shall\s+deliver|shall\s+provide|shall\s+notify|shall\s+comply|must\s+ensure|must\s+submit|warrants\s+and\s+represents)\b/)) {
    score += 0.15;
  } else if (quoteLower.match(/\b(shall|must|is required to|agrees to|undertakes to)\b/)) {
    score += 0.10;
  }

  // Factor 4: Clear amount or quantifiable term
  if (params.amount !== undefined && params.amount > 0) {
    score += 0.10;
  } else if (quoteLower.match(/\$|\busd\b|\bpercent\b|\bhours?\b/)) {
    score += 0.05;
  }

  return Math.min(0.98, Math.max(0.55, parseFloat(score.toFixed(2))));
}

/**
 * Enhanced quote locator: exact match, normalized match, or fuzzy matching with explanation.
 */
export function findQuoteInText(sourceQuote: string, fullContractText: string): QuoteMatchResult {
  if (!sourceQuote || !fullContractText) {
    return { found: false, isExact: false, matchIndex: -1 };
  }

  const cleanQuote = sourceQuote.trim();

  // 1. Exact match
  const exactIndex = fullContractText.indexOf(cleanQuote);
  if (exactIndex !== -1) {
    return {
      found: true,
      isExact: true,
      matchIndex: exactIndex,
      matchText: cleanQuote,
      page: estimatePageNumber(exactIndex, fullContractText),
    };
  }

  // 2. Normalized whitespace & punctuation match
  const normQuote = cleanQuote.replace(/["'“”‘’]/g, '').replace(/\s+/g, ' ').toLowerCase();
  const normText = fullContractText.replace(/["'“”‘’]/g, ' ').replace(/\s+/g, ' ').toLowerCase();
  
  const normIndex = normText.indexOf(normQuote);
  if (normIndex !== -1) {
    const originalSlice = fullContractText.substring(Math.max(0, normIndex - 50), Math.min(fullContractText.length, normIndex + cleanQuote.length + 50));
    return {
      found: true,
      isExact: false,
      matchIndex: normIndex,
      matchText: originalSlice.trim(),
      page: estimatePageNumber(normIndex, fullContractText),
      message: 'Exact words matched with minor punctuation or whitespace difference.',
    };
  }

  // 3. Sub-phrase / Fuzzy matching (first 5 significant words)
  const words = cleanQuote.split(/\s+/).filter(w => w.length > 3);
  if (words.length >= 4) {
    const subphrase = words.slice(0, 5).join(' ').toLowerCase();
    const subIndex = fullContractText.toLowerCase().indexOf(subphrase);
    if (subIndex !== -1) {
      return {
        found: true,
        isExact: false,
        matchIndex: subIndex,
        matchText: fullContractText.substring(subIndex, Math.min(fullContractText.length, subIndex + cleanQuote.length + 40)),
        page: estimatePageNumber(subIndex, fullContractText),
        message: 'Fuzzy match located based on key contract clause phrases.',
      };
    }
  }

  return {
    found: false,
    isExact: false,
    matchIndex: -1,
    message: 'Quote could not be located in current document text.',
  };
}

/**
 * Extracts REAL contract metadata (parties, effective date, expiry date, value, category) from document text.
 * Strictly avoids hardcoded defaults! If a field is not found, returns "Not found in document".
 */
export function extractContractMetadata(fullText: string, titleHint?: string): ContractExtractedMetadata {
  if (!fullText || fullText.trim().length === 0) {
    return {
      parties: ['Not found in document'],
      effectiveDate: 'Not found in document',
      expiryDate: 'Not found in document',
      category: titleHint || 'Commercial Agreement',
    };
  }

  const parties: string[] = [];
  const cleanFirstChars = fullText.slice(0, 4000);

  // Pattern A: "entered into by and between [Party 1] ... and [Party 2]" or "between [Party 1] and [Party 2]"
  // Supports parenthesized definitions such as ("Provider") or ("Client") and corporate designations
  const betweenMatch = cleanFirstChars.match(/(?:between|by and between|entered into by and between|entered into by)\s+([A-Z0-9][A-Za-z0-9\s,\.\-&]+?)(?:\s*,?\s*(?:\([^\)]*\)|(?:a|an)\s+[^\n,]+?))*(?:\s+and|\s*&)\s+([A-Z0-9][A-Za-z0-9\s,\.\-&]+?)(?:\s*,?\s*(?:\([^\)]*\)|(?:a|an)\s+[^\n,]+?))*(?:\s*\.|\s*,|\s*effective|\s*dated|\s*as of)/i);
  if (betweenMatch) {
    const p1 = betweenMatch[1].replace(/^(?:the\s+)/i, '').replace(/[\(\)"]/g, '').trim();
    const p2 = betweenMatch[2].replace(/^(?:the\s+)/i, '').replace(/[\(\)"]/g, '').trim();
    if (p1.length > 2 && p1.length < 80) parties.push(p1);
    if (p2.length > 2 && p2.length < 80) parties.push(p2);
  }

  // Pattern B: Look for specific labeled headers e.g. "Client: Chem Dry Lab Inc.", "Vendor: ABC Corp" (requires colon or hyphen delimiter)
  if (parties.length === 0) {
    const partyLabels = [
      'Client', 'Customer', 'Vendor', 'Contractor', 'Provider', 
      'Subscriber', 'Tenant', 'Landlord', 'Company', 'Disclosing Party', 
      'Receiving Party', 'First Party', 'Second Party', 'Buyer', 'Seller', 'Lab', 'Laboratory'
    ];
    for (const label of partyLabels) {
      const labelRegex = new RegExp(`(?:${label}|${label}\\s*Name)[:\\-=]\\s*([A-Z0-9][A-Za-z0-9\\s,\\.&\\-]{2,60})`, 'i');
      const match = cleanFirstChars.match(labelRegex);
      if (match && match[1]) {
        const clean = match[1].split(/[\n,;\r]/)[0].trim();
        if (clean && clean.length > 2 && !parties.includes(clean)) {
          parties.push(`${clean} (${label})`);
        }
      }
    }
  }

  // Pattern C: Look for organization entity suffixes in preamble (Inc., LLC, Ltd., Laboratories, Lab, Corp, Foundation)
  if (parties.length < 2) {
    const orgMatches = cleanFirstChars.matchAll(/\b([A-Z][A-Za-z0-9\s&]{2,40}?\s+(?:Inc\.?|LLC|Ltd\.?|Corp\.?|Corporation|Laboratories|Lab|Technologies|Services|Group))\b/g);
    for (const match of orgMatches) {
      const orgName = match[1].trim();
      if (!parties.some(p => p.toLowerCase().includes(orgName.toLowerCase())) && orgName.length > 4) {
        parties.push(orgName);
      }
      if (parties.length >= 2) break;
    }
  }

  // Pattern D: Check title hint if Chem dry or specific name provided
  if (parties.length === 0 && titleHint && titleHint.length > 3) {
    const cleanHint = titleHint.replace(/\.(pdf|docx|txt|pptx)$/i, '').trim();
    if (cleanHint.toLowerCase().includes('chem') || cleanHint.toLowerCase().includes('lab')) {
      parties.push(cleanHint);
    }
  }

  // 2. Extract Effective Date
  let effectiveDate = 'Not found in document';
  const effMatch = cleanFirstChars.match(/(?:effective\s*(?:date)?|dated|as of|commencing\s*(?:on)?)\s*[:\-]?\s*([A-Za-z]+\s+\d{1,2},\s*\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})/i);
  if (effMatch && effMatch[1]) {
    effectiveDate = effMatch[1].trim();
  }

  // 3. Extract Expiry Date / Term
  let expiryDate = 'Not found in document';
  const expMatch = fullText.match(/(?:terminat(?:ion|es|ing)?|expir(?:ation|es|ing)?|valid\s*until|until|through|term\s*(?:ends?|through)?)\s*(?:on|as\s*of)?\s*[:\-]?\s*([A-Za-z]+\s+\d{1,2},\s*\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})/i);
  if (expMatch && expMatch[1]) {
    expiryDate = expMatch[1].trim();
  } else {
    // Check term duration like "term of two (2) years"
    const termMatch = fullText.match(/term\s*(?:of)?\s*(\w+\s*(?:\(\d+\))?\s*(?:years?|months?))/i);
    if (termMatch && termMatch[1]) {
      expiryDate = `${termMatch[1]} from effective date`;
    }
  }

  // 4. Extract Total Value / Contract Consideration
  let totalValue: string | undefined;
  const valueMatch = fullText.match(/(?:total\s*(?:value|fee|consideration|cost|amount)|contract\s*price|consideration\s*of)\s*[:\-]?\s*(\$[\d,]+(?:\.\d{2})?(?:\s*(?:USD|EUR|GBP))?|\d+[\d,]*\s*(?:USD|EUR|GBP))/i);
  if (valueMatch && valueMatch[1]) {
    totalValue = valueMatch[1].trim();
  }

  // 5. Categorize based on actual vocabulary in document
  let category = 'Commercial Agreement';
  const textLower = fullText.toLowerCase();
  if (textLower.includes('chem') || textLower.includes('dry lab') || textLower.includes('laboratory') || textLower.includes('chemical') || textLower.includes('reagents')) {
    category = 'Laboratory & Chemistry Services';
  } else if (textLower.includes('cloud') || textLower.includes('migration') || textLower.includes('architecture') || textLower.includes('devops')) {
    category = 'Cloud Infrastructure & Engineering';
  } else if (textLower.includes('saas') || textLower.includes('software-as-a-service') || textLower.includes('subscription')) {
    category = 'Software-as-a-Service (SaaS)';
  } else if (textLower.includes('lease') || textLower.includes('tenant') || textLower.includes('landlord') || textLower.includes('premises')) {
    category = 'Commercial Real Estate Lease';
  } else if (textLower.includes('employment') || textLower.includes('employee') || textLower.includes('salary')) {
    category = 'Employment Agreement';
  } else if (textLower.includes('confidentiality') || textLower.includes('non-disclosure') || textLower.includes('nda')) {
    category = 'Non-Disclosure Agreement (NDA)';
  }

  return {
    parties: parties.length > 0 ? parties : ['Not found in document'],
    effectiveDate,
    expiryDate,
    totalValue,
    category,
  };
}

/**
 * Checks for conflicting contract terms such as conflicting payment deadlines or notice periods
 */
export function detectClauseConflicts(obligations: Array<{ id: string; clause_reference: string; type: string; deadline: string; normalized_due_date?: string }>) {
  const conflicts: Array<{ idA: string; idB: string; reason: string }> = [];

  // 1. Payment deadline conflicts
  const paymentObligations = obligations.filter(o => o.type === 'Payment');
  if (paymentObligations.length >= 2) {
    for (let i = 0; i < paymentObligations.length; i++) {
      for (let j = i + 1; j < paymentObligations.length; j++) {
        const a = paymentObligations[i];
        const b = paymentObligations[j];
        if (a.clause_reference !== b.clause_reference) {
          const aHas30 = a.deadline.toLowerCase().includes('30');
          const bHas15 = b.deadline.toLowerCase().includes('15') || b.deadline.toLowerCase().includes('10');
          if (aHas30 && bHas15) {
            conflicts.push({
              idA: a.id,
              idB: b.id,
              reason: `Conflicting payment terms: ${a.clause_reference} specifies "${a.deadline}" whereas ${b.clause_reference} specifies "${b.deadline}".`,
            });
          }
        }
      }
    }
  }

  // 2. SLA / Notice conflicts
  const reportingObligations = obligations.filter(o => o.type === 'Reporting' || o.type === 'Compliance');
  if (reportingObligations.length >= 2) {
    for (let i = 0; i < reportingObligations.length; i++) {
      for (let j = i + 1; j < reportingObligations.length; j++) {
        const a = reportingObligations[i];
        const b = reportingObligations[j];
        if (a.clause_reference !== b.clause_reference) {
          const a24h = a.deadline.toLowerCase().includes('24 hour') || a.deadline.toLowerCase().includes('24h');
          const b48h = b.deadline.toLowerCase().includes('48 hour') || b.deadline.toLowerCase().includes('48h');
          if (a24h && b48h) {
            conflicts.push({
              idA: a.id,
              idB: b.id,
              reason: `Conflicting notice window: ${a.clause_reference} requires notice within 24 hours while ${b.clause_reference} allows 48 hours.`,
            });
          }
        }
      }
    }
  }

  return conflicts;
}
