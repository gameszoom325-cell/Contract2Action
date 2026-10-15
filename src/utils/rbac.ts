import type { Role, RiskLevel, TaskItem } from '../types/contract.ts';

export interface RolePermissions {
  canUploadContract: boolean;
  canViewAllContracts: boolean;
  canViewAllTasks: boolean;
  canApproveObligation: (risk: RiskLevel) => boolean;
  canRejectObligation: boolean;
  canBulkApprove: boolean;
  canEditObligation: boolean;
  canUpdateTaskStatus: (task: TaskItem, userId: string) => boolean;
  canViewAuditLog: boolean;
  canConfigureSystem: boolean;
  canExportData: boolean;
}

export const ROLE_PERMISSIONS: Record<Role, RolePermissions> = {
  Admin: {
    canUploadContract: true,
    canViewAllContracts: true,
    canViewAllTasks: true,
    canApproveObligation: (_risk: RiskLevel) => true,
    canRejectObligation: true,
    canBulkApprove: true,
    canEditObligation: true,
    canUpdateTaskStatus: (_task: TaskItem, _userId: string) => true,
    canViewAuditLog: true,
    canConfigureSystem: true,
    canExportData: true,
  },
  Manager: {
    canUploadContract: true,
    canViewAllContracts: true,
    canViewAllTasks: true,
    canApproveObligation: (_risk: RiskLevel) => true,
    canRejectObligation: true,
    canBulkApprove: true,
    canEditObligation: true,
    canUpdateTaskStatus: (_task: TaskItem, _userId: string) => true,
    canViewAuditLog: true,
    canConfigureSystem: false,
    canExportData: true,
  },
  Approver: {
    canUploadContract: false,
    canViewAllContracts: true,
    canViewAllTasks: true,
    canApproveObligation: (_risk: RiskLevel) => true,
    canRejectObligation: true,
    canBulkApprove: true,
    canEditObligation: true,
    canUpdateTaskStatus: (_task: TaskItem, _userId: string) => true,
    canViewAuditLog: true,
    canConfigureSystem: false,
    canExportData: true,
  },
  Employee: {
    canUploadContract: false,
    canViewAllContracts: false,
    canViewAllTasks: false,
    canApproveObligation: (_risk: RiskLevel) => false,
    canRejectObligation: false,
    canBulkApprove: false,
    canEditObligation: false,
    canUpdateTaskStatus: (task: TaskItem, userId: string) => {
      return task.assigned_role === 'Employee' || task.assigned_user === userId;
    },
    canViewAuditLog: false,
    canConfigureSystem: false,
    canExportData: false,
  },
};

export function canUserApprove(role: Role, risk: RiskLevel, comment?: string): { allowed: boolean; reason?: string } {
  if (role === 'Employee') {
    return { allowed: false, reason: 'Employees do not have approval permissions. Only Approver, Manager, or Admin roles can approve.' };
  }
  
  if (risk === 'High') {
    if (!comment || comment.trim().length < 8) {
      return { allowed: false, reason: 'High-risk obligations mandate a written rationale comment (min 8 characters) before approval.' };
    }
  }

  return { allowed: true };
}

export function canUserBulkApprove(role: Role, obligations: Array<{ risk_level: RiskLevel }>): { allowed: boolean; reason?: string } {
  if (role === 'Employee') {
    return { allowed: false, reason: 'Employees cannot approve obligations.' };
  }
  
  const hasHighRisk = obligations.some(o => o.risk_level === 'High');
  if (hasHighRisk) {
    return { allowed: false, reason: 'Selection contains High-Risk items. High-risk obligations cannot be bulk approved and require individual written rationale.' };
  }

  return { allowed: true };
}
