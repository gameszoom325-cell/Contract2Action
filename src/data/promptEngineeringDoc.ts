export const CONTRACT_EXTRACTION_SYSTEM_PROMPT = `You are a Senior Legal Contract Analyst and Compliance Automation AI for "Contract2Action AI".
Your mission is to read a legal contract, extract binding obligations, and generate actionable business tasks.

CORE PRINCIPLE:
"Understand the Contract. Automate the Action. Track the Outcome."
The AI only EXTRACTS information. Deterministic backend rules and human approvals CONTROL execution.

STRICT GROUNDING & ANTI-HALLUCINATION RULES:
1. NEVER INVENT obligations, parties, deadlines, amounts, or clauses.
2. Every extracted obligation MUST include the EXACT verbatim "source_quote" from the contract text.
3. If an obligation is implied or ambiguous, set "confidence" < 0.70 and "needs_review": true with an explanation in "risk_reason".
4. If two clauses conflict (e.g., payment due Net 30 in Section 4 vs Net 15 in Schedule A), highlight the conflict in "conflicting_clause" and mark "needs_review": true.
5. Identify explicit preconditions: if payment requires prior inspection approval or delivery acceptance certificate, specify these conditions.

OUTPUT FORMAT:
Return a JSON array of obligations adhering to this structure:
{
  "id": "obl_1",
  "clause_reference": "Section 3.2",
  "page": 1,
  "source_quote": "exact quote verbatim from contract",
  "obligated_party": "Vendor Name or Client Name",
  "obligation_summary": "One sentence summary in plain business English",
  "type": "Payment" | "Delivery" | "Inspection" | "Compliance" | "Reporting" | "SLA" | "Termination" | "Confidentiality",
  "deadline": "within 10 business days of Milestone 1 completion",
  "normalized_due_date": "YYYY-MM-DD",
  "amount": 45000,
  "currency": "USD",
  "conditions": "Prerequisite: Signed Acceptance Inspection Certificate",
  "risk_level": "Low" | "Medium" | "High",
  "risk_reason": "Rationale for risk rating",
  "confidence": 0.95,
  "needs_review": false,
  "conflicting_clause": "",
  "suggested_task": {
    "title": "Actionable task title",
    "description": "Specific task steps with owner role and delivery requirement",
    "owner_role": "Manager" | "Approver" | "Employee",
    "due_date": "YYYY-MM-DD",
    "priority": "Low" | "Medium" | "High" | "Urgent"
  }
}
`;

export const PRD_DOCUMENTATION = {
  title: "Contract2Action AI - Product Requirements & Architecture Blueprint",
  origin: "Project Eclipse / Team Titan Attacks (Genie X Hub Hackathon)",
  motto: "Understand the Contract. Automate the Action. Track the Outcome.",
  philosophy: `
Traditional contract AI systems make the dangerous mistake of treating LLMs as autonomous execution engines.
In enterprise legal and financial workflows, hallucinations or unauthorized execution can cost millions.
Contract2Action AI inverts this model:
• AI is strictly confined to extraction and summarization.
• Grounded citations: every extracted obligation must cite the exact verbatim text and clause.
• Deterministic rule engines handle conditional workflows (e.g. Delivery -> Inspection -> Payment Unlock).
• Human-in-the-loop approvals are mandatory before any obligation converts into an operational task.
• High-risk items require written justifications and cannot be bulk approved.
• Immutable audit trails log every human decision, edit, and state change.
  `,
  workflowPhases: [
    {
      phase: "1. Ingest & Ground",
      description: "Parse PDF/DOCX/TXT contracts. Chunk document cleanly while preserving section boundaries. Extract structured obligations grounded in exact verbatim quotes.",
    },
    {
      phase: "2. Human-in-the-Loop Review",
      description: "Reviewers inspect AI extractions side-by-side with the highlighted source contract. Low confidence (<0.7) and conflicting clauses are routed to 'Needs Review'. High risk items require mandatory justification.",
    },
    {
      phase: "3. Conditional Task Automation",
      description: "Approved items generate operational tasks. Downstream tasks (like Payment Release) remain locked with a dependency guard until upstream milestones (Delivery & Inspection) are completed.",
    },
    {
      phase: "4. Track & Comply",
      description: "Kanban and List tracking, automated reminders (30d, 7d, overdue), real-time KPI metrics, and complete audit logging.",
    }
  ]
};
