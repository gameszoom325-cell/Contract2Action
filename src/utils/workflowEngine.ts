import type { TaskItem, ExtractedObligation, RiskLevel } from '../types/contract.ts';

export interface PreconditionCheckResult {
  isLocked: boolean;
  unmetPrerequisites: string[];
  reason?: string;
}

/**
 * Evaluates whether a task has unmet prerequisite tasks.
 * In Contract2Action, conditional workflows enforce:
 * Delivery completion -> Inspection acceptance -> Payment release.
 */
export function evaluateTaskPrerequisites(
  task: { id: string; type?: any; prerequisites?: string[] },
  allTasks: Array<Pick<TaskItem, 'id' | 'title' | 'status' | 'type'>>
): PreconditionCheckResult {
  if (!task.prerequisites || task.prerequisites.length === 0) {
    return { isLocked: false, unmetPrerequisites: [] };
  }

  const unmet: string[] = [];
  const unmetTitles: string[] = [];

  for (const prereqId of task.prerequisites) {
    const parent = allTasks.find(t => t.id === prereqId);
    if (!parent || parent.status !== 'Completed') {
      unmet.push(prereqId);
      unmetTitles.push(parent ? parent.title : `Task ${prereqId}`);
    }
  }

  if (unmet.length > 0) {
    return {
      isLocked: true,
      unmetPrerequisites: unmet,
      reason: `Locked pending completion of: ${unmetTitles.join(', ')}`,
    };
  }

  return { isLocked: false, unmetPrerequisites: [] };
}

export type DeadlineUrgency = 'overdue' | 'urgent' | 'approaching' | 'upcoming' | 'normal';

export interface DeadlineInfo {
  daysRemaining: number;
  urgency: DeadlineUrgency;
  isOverdue: boolean;
  formattedText: string;
}

export function computeDeadlineStatus(dueDateIso: string, referenceDateStr?: string): DeadlineInfo {
  const ref = referenceDateStr ? new Date(referenceDateStr) : new Date();
  ref.setHours(0, 0, 0, 0);

  const due = new Date(dueDateIso);
  due.setHours(0, 0, 0, 0);

  if (isNaN(due.getTime())) {
    return {
      daysRemaining: 0,
      urgency: 'normal',
      isOverdue: false,
      formattedText: dueDateIso,
    };
  }

  const diffTime = due.getTime() - ref.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    return {
      daysRemaining,
      urgency: 'overdue',
      isOverdue: true,
      formattedText: `${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? '' : 's'} overdue`,
    };
  }

  if (daysRemaining <= 2) {
    return {
      daysRemaining,
      urgency: 'urgent',
      isOverdue: false,
      formattedText: daysRemaining === 0 ? 'Due Today' : `${daysRemaining} day left`,
    };
  }

  if (daysRemaining <= 7) {
    return {
      daysRemaining,
      urgency: 'approaching',
      isOverdue: false,
      formattedText: `${daysRemaining} days left`,
    };
  }

  if (daysRemaining <= 30) {
    return {
      daysRemaining,
      urgency: 'upcoming',
      isOverdue: false,
      formattedText: `${daysRemaining} days remaining`,
    };
  }

  return {
    daysRemaining,
    urgency: 'normal',
    isOverdue: false,
    formattedText: `${daysRemaining} days remaining`,
  };
}

export function evaluateObligationReviewStatus(
  confidence: number,
  threshold: number,
  risk: RiskLevel = 'Low',
  hasConflicts: boolean = false
): { needsReview: boolean; reason?: string } {
  if (hasConflicts) {
    return { needsReview: true, reason: 'Conflicting clauses detected in contract' };
  }
  if (risk === 'High') {
    return { needsReview: true, reason: 'High-risk obligation requires human oversight' };
  }
  if (confidence < threshold) {
    return { 
      needsReview: true, 
      reason: `Confidence score (${Math.round(confidence * 100)}%) is below human review threshold (${Math.round(threshold * 100)}%)` 
    };
  }
  return { needsReview: false };
}

export interface RiskDistribution {
  total: number;
  counts: Record<RiskLevel, number>;
  percentages: Record<RiskLevel, number>;
}

export function computeRiskDistribution(obligations: Array<{ risk_level: RiskLevel }>): RiskDistribution {
  const counts: Record<RiskLevel, number> = { High: 0, Medium: 0, Low: 0 };
  for (const o of obligations) {
    if (counts[o.risk_level] !== undefined) {
      counts[o.risk_level]++;
    } else {
      counts.Low++;
    }
  }
  const total = obligations.length;
  const percentages: Record<RiskLevel, number> = {
    High: total > 0 ? Math.round((counts.High / total) * 100) : 0,
    Medium: total > 0 ? Math.round((counts.Medium / total) * 100) : 0,
    Low: total > 0 ? Math.round((counts.Low / total) * 100) : 0,
  };

  return { total, counts, percentages };
}

