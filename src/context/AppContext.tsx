import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, 
  Role, 
  ContractDocument, 
  ExtractedObligation, 
  TaskItem, 
  AuditLogEntry, 
  TaskStatus, 
  RiskLevel 
} from '../types/contract.ts';
import { 
  DEMO_USERS, 
  SAMPLE_CONTRACTS, 
  SEED_OBLIGATIONS, 
  SEED_TASKS, 
  SEED_AUDIT_LOGS 
} from '../data/seedData.ts';
import { evaluateTaskPrerequisites } from '../utils/workflowEngine.ts';
import { canUserApprove, canUserBulkApprove } from '../utils/rbac.ts';
import confetti from 'canvas-confetti';

interface AppContextType {
  currentUser: User;
  setCurrentUser: (user: User) => void;
  switchUserByRole: (role: Role) => void;
  allUsers: User[];

  contracts: ContractDocument[];
  activeContractId: string;
  setActiveContractId: (id: string) => void;
  activeContract: ContractDocument | undefined;
  addContract: (contract: ContractDocument, obligations: ExtractedObligation[]) => void;

  obligations: ExtractedObligation[];
  filteredObligations: ExtractedObligation[];
  approveObligation: (obligationId: string, comment?: string) => { success: boolean; error?: string };
  rejectObligation: (obligationId: string, reason: string) => { success: boolean; error?: string };
  editAndApproveObligation: (
    obligationId: string, 
    updatedFields: Partial<ExtractedObligation>, 
    comment?: string
  ) => { success: boolean; error?: string };
  bulkApproveObligations: (obligationIds: string[]) => { success: boolean; approvedCount: number; error?: string };

  tasks: TaskItem[];
  userVisibleTasks: TaskItem[];
  updateTaskStatus: (taskId: string, newStatus: TaskStatus) => { success: boolean; unlockedTasks: string[]; error?: string };
  createManualTask: (task: Omit<TaskItem, 'id' | 'created_at' | 'updated_at'>) => void;

  auditLogs: AuditLogEntry[];
  addAuditLog: (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => void;

  confidenceThreshold: number;
  setConfidenceThreshold: (val: number) => void;
  isMockLLM: boolean;
  setIsMockLLM: (val: boolean) => void;

  toast: { message: string; type: 'success' | 'warning' | 'danger' | 'info' } | null;
  showToast: (message: string, type?: 'success' | 'warning' | 'danger' | 'info') => void;
  clearToast: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Demo users & auth state
  const [currentUser, setCurrentUser] = useState<User>(() => {
    try {
      const savedRoleId = localStorage.getItem('c2a_active_role');
      if (savedRoleId) {
        const found = DEMO_USERS.find(u => u.role === savedRoleId);
        if (found) return found;
      }
    } catch {}
    return DEMO_USERS[0]; // Eleanor Vance (Admin) by default
  });

  const [contracts, setContracts] = useState<ContractDocument[]>(() => {
    try {
      const saved = localStorage.getItem('c2a_contracts');
      if (saved) return JSON.parse(saved);
    } catch {}
    return SAMPLE_CONTRACTS;
  });

  const [activeContractId, setActiveContractId] = useState<string>(SAMPLE_CONTRACTS[0].id);

  const [obligations, setObligations] = useState<ExtractedObligation[]>(() => {
    try {
      const saved = localStorage.getItem('c2a_obligations');
      if (saved) return JSON.parse(saved);
    } catch {}
    return SEED_OBLIGATIONS;
  });

  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    try {
      const saved = localStorage.getItem('c2a_tasks');
      if (saved) return JSON.parse(saved);
    } catch {}
    return SEED_TASKS;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem('c2a_audit_logs');
      if (saved) return JSON.parse(saved);
    } catch {}
    return SEED_AUDIT_LOGS;
  });

  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.70);
  const [isMockLLM, setIsMockLLM] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' | 'danger' | 'info' } | null>(null);

  // Sync state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('c2a_active_role', currentUser.role);
    } catch {}
  }, [currentUser]);

  useEffect(() => {
    try {
      localStorage.setItem('c2a_contracts', JSON.stringify(contracts));
    } catch {}
  }, [contracts]);

  useEffect(() => {
    try {
      localStorage.setItem('c2a_obligations', JSON.stringify(obligations));
    } catch {}
  }, [obligations]);

  useEffect(() => {
    try {
      localStorage.setItem('c2a_tasks', JSON.stringify(tasks));
    } catch {}
  }, [tasks]);

  useEffect(() => {
    try {
      localStorage.setItem('c2a_audit_logs', JSON.stringify(auditLogs));
    } catch {}
  }, [auditLogs]);

  const showToast = (message: string, type: 'success' | 'warning' | 'danger' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => (prev?.message === message ? null : prev));
    }, 4500);
  };

  const clearToast = () => setToast(null);

  const switchUserByRole = (role: Role) => {
    const user = DEMO_USERS.find(u => u.role === role);
    if (user) {
      setCurrentUser(user);
      showToast(`Switched active session to ${user.name} (${user.role})`, 'info');
    }
  };

  const addAuditLog = (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => {
    const newEntry: AuditLogEntry = {
      ...entry,
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
    };
    setAuditLogs(prev => [newEntry, ...prev]);
  };

  const activeContract = contracts.find(c => c.id === activeContractId) || contracts[0];

  const addContract = (newContract: ContractDocument, newObligations: ExtractedObligation[]) => {
    setContracts(prev => [newContract, ...prev]);
    setObligations(prev => [...newObligations, ...prev]);
    setActiveContractId(newContract.id);

    addAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'UPLOAD_CONTRACT',
      targetType: 'Contract',
      targetId: newContract.id,
      details: `Uploaded contract "${newContract.title}" (${newContract.fileSize}). Parsed ${newObligations.length} obligations.`,
    });

    showToast(`Contract "${newContract.title}" parsed with ${newObligations.length} obligations!`, 'success');
  };

  // Helper to re-evaluate locks across tasks
  const recomputeTaskLocks = (taskList: TaskItem[]): { updatedList: TaskItem[]; unlockedIds: string[] } => {
    const unlockedIds: string[] = [];
    const updated = taskList.map(task => {
      const check = evaluateTaskPrerequisites(task, taskList);
      if (task.is_locked && !check.isLocked) {
        unlockedIds.push(task.id);
      }
      return {
        ...task,
        is_locked: check.isLocked,
        lock_reason: check.reason,
      };
    });
    return { updatedList: updated, unlockedIds };
  };

  const approveObligation = (obligationId: string, comment?: string): { success: boolean; error?: string } => {
    const obl = obligations.find(o => o.id === obligationId);
    if (!obl) return { success: false, error: 'Obligation not found' };

    const check = canUserApprove(currentUser.role, obl.risk_level, comment);
    if (!check.allowed) {
      showToast(check.reason || 'Action unauthorized', 'danger');
      return { success: false, error: check.reason };
    }

    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    
    // Create new operational task
    const contract = contracts.find(c => c.id === obl.contract_id);
    const prerequisiteTaskIds: string[] = [];

    // Map obligation preconditions to task IDs
    if (obl.preconditions && obl.preconditions.length > 0) {
      for (const preId of obl.preconditions) {
        const preObl = obligations.find(o => o.id === preId);
        if (preObl?.task_id) {
          prerequisiteTaskIds.push(preObl.task_id);
        }
      }
    }

    const newTask: TaskItem = {
      id: taskId,
      contract_id: obl.contract_id,
      contract_title: contract ? contract.title : 'Contract Document',
      obligation_id: obl.id,
      clause_reference: obl.clause_reference,
      page: obl.page,
      source_quote: obl.source_quote,
      title: obl.suggested_task.title,
      description: obl.suggested_task.description,
      type: obl.type,
      status: 'To Do',
      priority: obl.suggested_task.priority,
      assigned_role: obl.suggested_task.owner_role,
      assigned_user: obl.suggested_task.owner_role === 'Employee' ? 'user_employee' : currentUser.id,
      due_date: obl.normalized_due_date || obl.suggested_task.due_date,
      amount: obl.amount,
      currency: obl.currency,
      is_locked: false,
      prerequisites: prerequisiteTaskIds,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Calculate initial lock state
    const allCandidateTasks = [...tasks, newTask];
    const { updatedList } = recomputeTaskLocks(allCandidateTasks);

    setTasks(updatedList);

    setObligations(prev => prev.map(o => {
      if (o.id === obligationId) {
        return {
          ...o,
          approval_status: 'Approved',
          approval_comment: comment,
          reviewed_by: currentUser.name,
          reviewed_at: new Date().toISOString(),
          task_id: taskId,
        };
      }
      return o;
    }));

    addAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'APPROVE_OBLIGATION',
      targetType: 'Obligation',
      targetId: obligationId,
      clauseReference: obl.clause_reference,
      page: obl.page,
      details: `Approved ${obl.risk_level}-risk obligation "${obl.obligation_summary}". Generated operational task ${taskId}.${comment ? ` Comment: "${comment}"` : ''}`,
      beforeValue: { approval_status: obl.approval_status },
      afterValue: { approval_status: 'Approved', task_id: taskId },
    });

    try {
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.8 } });
    } catch {}

    showToast(`Obligation approved! Task generated: "${newTask.title}"`, 'success');
    return { success: true };
  };

  const rejectObligation = (obligationId: string, reason: string): { success: boolean; error?: string } => {
    if (currentUser.role === 'Employee') {
      const err = 'Employees do not have rejection permissions.';
      showToast(err, 'danger');
      return { success: false, error: err };
    }

    if (!reason || reason.trim().length < 5) {
      const err = 'A specific rejection reason (min 5 characters) is required for audit compliance.';
      showToast(err, 'danger');
      return { success: false, error: err };
    }

    const obl = obligations.find(o => o.id === obligationId);
    if (!obl) return { success: false, error: 'Obligation not found' };

    setObligations(prev => prev.map(o => {
      if (o.id === obligationId) {
        return {
          ...o,
          approval_status: 'Rejected',
          rejection_reason: reason,
          reviewed_by: currentUser.name,
          reviewed_at: new Date().toISOString(),
        };
      }
      return o;
    }));

    addAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'REJECT_OBLIGATION',
      targetType: 'Obligation',
      targetId: obligationId,
      clauseReference: obl.clause_reference,
      page: obl.page,
      details: `Rejected obligation "${obl.obligation_summary}". Reason: "${reason}".`,
      beforeValue: { approval_status: obl.approval_status },
      afterValue: { approval_status: 'Rejected', rejection_reason: reason },
    });

    showToast(`Obligation rejected with audit reason logged.`, 'warning');
    return { success: true };
  };

  const editAndApproveObligation = (
    obligationId: string, 
    updatedFields: Partial<ExtractedObligation>, 
    comment?: string
  ): { success: boolean; error?: string } => {
    const obl = obligations.find(o => o.id === obligationId);
    if (!obl) return { success: false, error: 'Obligation not found' };

    const check = canUserApprove(currentUser.role, updatedFields.risk_level || obl.risk_level, comment);
    if (!check.allowed) {
      showToast(check.reason || 'Action unauthorized', 'danger');
      return { success: false, error: check.reason };
    }

    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const contract = contracts.find(c => c.id === obl.contract_id);

    const mergedSuggested = {
      ...obl.suggested_task,
      ...(updatedFields.suggested_task || {}),
    };

    const newTask: TaskItem = {
      id: taskId,
      contract_id: obl.contract_id,
      contract_title: contract ? contract.title : 'Contract Document',
      obligation_id: obl.id,
      clause_reference: updatedFields.clause_reference || obl.clause_reference,
      page: updatedFields.page || obl.page,
      source_quote: obl.source_quote,
      title: mergedSuggested.title,
      description: mergedSuggested.description,
      type: updatedFields.type || obl.type,
      status: 'To Do',
      priority: mergedSuggested.priority,
      assigned_role: mergedSuggested.owner_role,
      assigned_user: mergedSuggested.owner_role === 'Employee' ? 'user_employee' : currentUser.id,
      due_date: updatedFields.normalized_due_date || obl.normalized_due_date || mergedSuggested.due_date,
      amount: updatedFields.amount !== undefined ? updatedFields.amount : obl.amount,
      currency: updatedFields.currency || obl.currency,
      is_locked: false,
      prerequisites: updatedFields.preconditions || obl.preconditions || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const allCandidateTasks = [...tasks, newTask];
    const { updatedList } = recomputeTaskLocks(allCandidateTasks);
    setTasks(updatedList);

    setObligations(prev => prev.map(o => {
      if (o.id === obligationId) {
        return {
          ...o,
          ...updatedFields,
          suggested_task: mergedSuggested,
          approval_status: 'Approved',
          approval_comment: comment || 'Edited and approved by reviewer.',
          reviewed_by: currentUser.name,
          reviewed_at: new Date().toISOString(),
          task_id: taskId,
        };
      }
      return o;
    }));

    addAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'EDIT_OBLIGATION',
      targetType: 'Obligation',
      targetId: obligationId,
      clauseReference: obl.clause_reference,
      page: obl.page,
      details: `Modified obligation parameters and approved. Created task ${taskId}.`,
      beforeValue: obl,
      afterValue: { ...obl, ...updatedFields, task_id: taskId },
    });

    try {
      confetti({ particleCount: 30, spread: 50 });
    } catch {}

    showToast(`Obligation updated and approved! Task "${newTask.title}" is ready.`, 'success');
    return { success: true };
  };

  const bulkApproveObligations = (obligationIds: string[]): { success: boolean; approvedCount: number; error?: string } => {
    const selected = obligations.filter(o => obligationIds.includes(o.id));
    if (selected.length === 0) return { success: false, approvedCount: 0, error: 'No obligations selected' };

    const check = canUserBulkApprove(currentUser.role, selected);
    if (!check.allowed) {
      showToast(check.reason || 'Bulk approval denied', 'danger');
      return { success: false, approvedCount: 0, error: check.reason };
    }

    let count = 0;
    for (const obl of selected) {
      if (obl.approval_status === 'Pending' || obl.approval_status === 'Needs Review') {
        approveObligation(obl.id, 'Bulk approved standard low/medium risk items');
        count++;
      }
    }

    showToast(`Successfully bulk-approved ${count} obligations.`, 'success');
    return { success: true, approvedCount: count };
  };

  const updateTaskStatus = (taskId: string, newStatus: TaskStatus): { success: boolean; unlockedTasks: string[]; error?: string } => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return { success: false, unlockedTasks: [], error: 'Task not found' };

    // Check RBAC permission for employee
    if (currentUser.role === 'Employee') {
      const allowed = task.assigned_role === 'Employee' || task.assigned_user === currentUser.id;
      if (!allowed) {
        const err = 'Employees can only update tasks assigned directly to them or their role.';
        showToast(err, 'danger');
        return { success: false, unlockedTasks: [], error: err };
      }
    }

    // Check locked guard
    if (task.is_locked && newStatus !== 'Blocked' && newStatus !== 'To Do') {
      const err = `Cannot progress task: ${task.lock_reason || 'Task is locked by prerequisites'}`;
      showToast(err, 'warning');
      return { success: false, unlockedTasks: [], error: err };
    }

    const updatedTasksRaw = tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          status: newStatus,
          completed_at: newStatus === 'Completed' ? new Date().toISOString() : undefined,
          updated_at: new Date().toISOString(),
        };
      }
      return t;
    });

    // Recompute downstream task locks! E.g. delivery completion -> unlocks inspection -> unlocks payment!
    const { updatedList, unlockedIds } = recomputeTaskLocks(updatedTasksRaw);
    setTasks(updatedList);

    addAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'UPDATE_TASK',
      targetType: 'Task',
      targetId: taskId,
      details: `Updated task "${task.title}" status from "${task.status}" to "${newStatus}".${unlockedIds.length > 0 ? ` Automatically unlocked ${unlockedIds.length} dependent task(s).` : ''}`,
      beforeValue: { status: task.status },
      afterValue: { status: newStatus },
    });

    if (unlockedIds.length > 0) {
      showToast(`Prerequisite completed! Unlocked ${unlockedIds.length} dependent task(s).`, 'success');
      try {
        confetti({ particleCount: 30, spread: 70 });
      } catch {}
    } else {
      showToast(`Task status updated to "${newStatus}"`, 'info');
    }

    return { success: true, unlockedTasks: unlockedIds };
  };

  const createManualTask = (taskData: Omit<TaskItem, 'id' | 'created_at' | 'updated_at'>) => {
    const taskId = `task_manual_${Date.now()}`;
    const newTask: TaskItem = {
      ...taskData,
      id: taskId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { updatedList } = recomputeTaskLocks([...tasks, newTask]);
    setTasks(updatedList);

    addAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'CREATE_TASK',
      targetType: 'Task',
      targetId: taskId,
      details: `Created manual operational task "${newTask.title}".`,
      afterValue: newTask,
    });

    showToast(`Task "${newTask.title}" created.`, 'success');
  };

  // Filter tasks based on role: Employees see only their assigned tasks
  const userVisibleTasks = tasks.filter(t => {
    if (currentUser.role === 'Admin' || currentUser.role === 'Manager' || currentUser.role === 'Approver') {
      return true;
    }
    return t.assigned_role === 'Employee' || t.assigned_user === currentUser.id;
  });

  const filteredObligations = obligations;

  return (
    <AppContext.Provider value={{
      currentUser,
      setCurrentUser,
      switchUserByRole,
      allUsers: DEMO_USERS,

      contracts,
      activeContractId,
      setActiveContractId,
      activeContract,
      addContract,

      obligations,
      filteredObligations,
      approveObligation,
      rejectObligation,
      editAndApproveObligation,
      bulkApproveObligations,

      tasks,
      userVisibleTasks,
      updateTaskStatus,
      createManualTask,

      auditLogs,
      addAuditLog,

      confidenceThreshold,
      setConfidenceThreshold,
      isMockLLM,
      setIsMockLLM,

      toast,
      showToast,
      clearToast,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
