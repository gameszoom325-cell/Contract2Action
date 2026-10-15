import test from 'node:test';
import assert from 'node:assert/strict';
import { canUserApprove, canUserBulkApprove } from './rbac.ts';
import { 
  evaluateTaskPrerequisites, 
  computeDeadlineStatus, 
  evaluateObligationReviewStatus
} from './workflowEngine.ts';
import { 
  verifyQuoteGrounding, 
  extractContractMetadata, 
  findQuoteInText, 
  computeObligationConfidence,
  detectClauseConflicts
} from './contractParser.ts';

test('RBAC: Employee cannot approve obligations', () => {
  const result = canUserApprove('Employee', 'Low');
  assert.equal(result.allowed, false);
  assert.match(result.reason || '', /Employees do not have approval permissions/);
});

test('RBAC: Approver can approve Low/Medium risk without comment, but High risk requires comment', () => {
  const lowResult = canUserApprove('Approver', 'Low');
  assert.equal(lowResult.allowed, true);

  const highWithoutComment = canUserApprove('Approver', 'High');
  assert.equal(highWithoutComment.allowed, false);
  assert.match(highWithoutComment.reason || '', /written rationale comment/);

  const highWithComment = canUserApprove('Approver', 'High', 'Approved per legal counsel review of section 4.2');
  assert.equal(highWithComment.allowed, true);
});

test('RBAC: Bulk approval prohibits High risk items', () => {
  const safeItems = [{ risk_level: 'Low' as const }, { risk_level: 'Medium' as const }];
  const bulkSafe = canUserBulkApprove('Approver', safeItems);
  assert.equal(bulkSafe.allowed, true);

  const riskyItems = [{ risk_level: 'Low' as const }, { risk_level: 'High' as const }];
  const bulkRisky = canUserBulkApprove('Approver', riskyItems);
  assert.equal(bulkRisky.allowed, false);
  assert.match(bulkRisky.reason || '', /High-risk obligations cannot be bulk approved/);
});

test('Workflow: Preconditions correctly lock dependent payment task', () => {
  const tasks = [
    { id: 't1', title: 'Phase 1 Delivery', status: 'Completed' as const, type: 'Delivery' as const, prerequisites: [] },
    { id: 't2', title: 'Acceptance Inspection', status: 'In Progress' as const, type: 'Inspection' as const, prerequisites: [] },
    { id: 't3', title: 'Payment Milestone 1', status: 'To Do' as const, type: 'Payment' as const, prerequisites: ['t1', 't2'] }
  ];

  const check = evaluateTaskPrerequisites(tasks[2], tasks);
  assert.equal(check.isLocked, true);
  assert.deepEqual(check.unmetPrerequisites, ['t2']);
  assert.match(check.reason || '', /Acceptance Inspection/);
});

test('Workflow: Task unlocks once all prerequisites are completed', () => {
  const tasks = [
    { id: 't1', title: 'Phase 1 Delivery', status: 'Completed' as const, type: 'Delivery' as const, prerequisites: [] },
    { id: 't2', title: 'Acceptance Inspection', status: 'Completed' as const, type: 'Inspection' as const, prerequisites: [] },
    { id: 't3', title: 'Payment Milestone 1', status: 'To Do' as const, type: 'Payment' as const, prerequisites: ['t1', 't2'] }
  ];

  const check = evaluateTaskPrerequisites(tasks[2], tasks);
  assert.equal(check.isLocked, false);
  assert.deepEqual(check.unmetPrerequisites, []);
});

test('Workflow: Deadline calculation flags overdue and approaching dates', () => {
  const refDate = '2026-10-15';
  
  const overdue = computeDeadlineStatus('2026-10-10', refDate);
  assert.equal(overdue.isOverdue, true);
  assert.equal(overdue.urgency, 'overdue');
  assert.equal(overdue.daysRemaining, -5);

  const urgent = computeDeadlineStatus('2026-10-17', refDate);
  assert.equal(urgent.isOverdue, false);
  assert.equal(urgent.urgency, 'urgent');
  assert.equal(urgent.daysRemaining, 2);

  const approaching = computeDeadlineStatus('2026-10-21', refDate);
  assert.equal(approaching.urgency, 'approaching');
  assert.equal(approaching.daysRemaining, 6);
});

test('Workflow: Review status flags items below threshold or with conflicts', () => {
  const highConf = evaluateObligationReviewStatus(0.95, 0.70, 'Low');
  assert.equal(highConf.needsReview, false);

  const lowConf = evaluateObligationReviewStatus(0.62, 0.70, 'Low');
  assert.equal(lowConf.needsReview, true);

  const conflicting = evaluateObligationReviewStatus(0.95, 0.70, 'Low', true);
  assert.equal(conflicting.needsReview, true);
  assert.match(conflicting.reason || '', /Conflicting clauses detected/);
});

test('Contract Parser: Quotes verify grounding and reject hallucinated strings', () => {
  const contract = `SECTION 4. PAYMENT TERMS. The Client shall pay all undisputed invoices within thirty (30) calendar days of receipt. Late payments shall accrue interest at 1.5% per month.`;
  
  const validQuote = 'The Client shall pay all undisputed invoices within thirty (30) calendar days of receipt.';
  const groundedCheck = verifyQuoteGrounding(validQuote, contract);
  assert.equal(groundedCheck.isGrounded, true);

  const fakeQuote = 'The Client shall pay immediately upon verbal request within 24 hours.';
  const ungroundedCheck = verifyQuoteGrounding(fakeQuote, contract);
  assert.equal(ungroundedCheck.isGrounded, false);
});

test('File Reader: isTextGarbled detects replacement characters and binary signatures', async () => {
  const { isTextGarbled } = await import('./fileReader.ts');
  
  assert.equal(isTextGarbled('%PDF-1.4\x00\x00\x00'), true);
  assert.equal(isTextGarbled('This is valid plain English text without corruption.'), false);
  assert.equal(isTextGarbled('Corrupt string with replacement chars: \uFFFD \uFFFD \uFFFD \uFFFD \uFFFD \uFFFD'), true);
});

test('Contract Parser: extractContractMetadata extracts real parties and dates, never fake defaults', () => {
  const chemDryText = `CHEM DRY LAB SERVICES AGREEMENT
This Agreement is entered into by and between Chem Dry Laboratories Inc. and BioTech Solutions LLC.
Effective Date: March 15, 2026. Term ends on March 14, 2028. Total consideration of $75,000 USD.
Section 1. Chem Dry Laboratories shall perform monthly solvent purity tests.`;

  const meta = extractContractMetadata(chemDryText, 'Chem Dry Lab Agreement');
  assert.equal(meta.category, 'Laboratory & Chemistry Services');
  assert.equal(meta.parties.length >= 2, true);
  assert.match(meta.parties[0], /Chem Dry/i);
  assert.match(meta.parties[1], /BioTech Solutions/i);
  assert.equal(meta.effectiveDate, 'March 15, 2026');
  assert.equal(meta.expiryDate, 'March 14, 2028');
  assert.equal(meta.totalValue, '$75,000 USD');

  const meta2 = extractContractMetadata(
    'This Agreement is entered into by and between Chem Dry Laboratories Inc. ("Provider") and BioTech Solutions LLC ("Client"), effective October 1, 2026 until October 1, 2027.'
  );
  assert.equal(meta2.parties.length, 2);
  assert.equal(meta2.parties[0], 'Chem Dry Laboratories Inc.');
  assert.equal(meta2.parties[1], 'BioTech Solutions LLC');
  assert.equal(meta2.effectiveDate, 'October 1, 2026');
  assert.equal(meta2.expiryDate, 'October 1, 2027');

  const emptyMeta = extractContractMetadata('No dates or parties mentioned here.');
  assert.deepEqual(emptyMeta.parties, ['Not found in document']);
  assert.equal(emptyMeta.effectiveDate, 'Not found in document');
  assert.equal(emptyMeta.expiryDate, 'Not found in document');
});

test('Contract Parser: findQuoteInText performs exact and fuzzy quote matching', () => {
  const contract = `[Page 1]\nSection 3.2. All undisputed invoices shall be settled within thirty (30) days of verified delivery.`;
  
  // Exact match
  const exact = findQuoteInText('All undisputed invoices shall be settled within thirty (30) days of verified delivery.', contract);
  assert.equal(exact.found, true);
  assert.equal(exact.isExact, true);
  assert.equal(exact.page, 1);

  // Minor whitespace/punctuation difference (fuzzy)
  const fuzzy = findQuoteInText('“All undisputed invoices shall be settled within thirty (30) days”', contract);
  assert.equal(fuzzy.found, true);
  assert.equal(fuzzy.page, 1);
});

test('Contract Parser: computeObligationConfidence evaluates factors', () => {
  const highConfidence = computeObligationConfidence({
    sourceQuote: 'The Contractor shall pay the sum of $10,000 within thirty (30) days of delivery.',
    obligatedParty: 'Apex Cloud Solutions LLC',
    deadline: 'within 30 days of delivery',
    amount: 10000,
  });
  assert.equal(highConfidence >= 0.85, true);

  const lowConfidence = computeObligationConfidence({
    sourceQuote: 'Party agrees to cooperate on reasonable efforts.',
    obligatedParty: 'Party A',
    deadline: 'As specified in clause',
  });
  assert.equal(lowConfidence <= 0.70, true);
});

test('Contract Parser: detectClauseConflicts detects conflicting payment terms', () => {
  const obligations = [
    { id: '1', clause_reference: 'Section 3.1', type: 'Payment', deadline: 'Net 30 days from invoice' },
    { id: '2', clause_reference: 'Section 8.4', type: 'Payment', deadline: 'Within 10 calendar days of invoice' },
  ];

  const conflicts = detectClauseConflicts(obligations);
  assert.equal(conflicts.length, 1);
  assert.match(conflicts[0].reason, /Conflicting payment terms/);
});
