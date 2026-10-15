export type Role = 'Admin' | 'Manager' | 'Approver' | 'Employee';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar: string;
  title: string;
}

export type ObligationType = 
  | 'Payment' 
  | 'Delivery' 
  | 'Inspection' 
  | 'Compliance' 
  | 'Reporting' 
  | 'SLA' 
  | 'Termination' 
  | 'Confidentiality';

export type RiskLevel = 'Low' | 'Medium' | 'High';

export type ApprovalStatus = 'Pending' | 'Approved' | 'Rejected' | 'Needs Review';

export type TaskStatus = 'To Do' | 'In Progress' | 'In Review' | 'Completed' | 'Blocked';

export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface ExtractedObligation {
  id: string;
  contract_id: string;
  clause_reference: string;
  page: number;
  source_quote: string;
  obligated_party: string;
  obligation_summary: string;
  type: ObligationType;
  deadline: string;
  normalized_due_date: string; // ISO YYYY-MM-DD
  amount?: number;
  currency?: string;
  conditions?: string;
  risk_level: RiskLevel;
  risk_reason: string;
  confidence: number; // 0.00 to 1.00
  needs_review: boolean;
  conflicting_clause?: string;
  preconditions?: string[]; // IDs of prerequisite obligations/tasks
  suggested_task: {
    title: string;
    description: string;
    owner_role: Role;
    due_date: string;
    priority: TaskPriority;
  };
  approval_status: ApprovalStatus;
  rejection_reason?: string;
  approval_comment?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  task_id?: string;
}

export interface TaskItem {
  id: string;
  contract_id: string;
  contract_title: string;
  obligation_id: string;
  clause_reference: string;
  page: number;
  source_quote: string;
  title: string;
  description: string;
  type: ObligationType;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_role: Role;
  assigned_user?: string;
  due_date: string; // YYYY-MM-DD
  amount?: number;
  currency?: string;
  is_locked: boolean;
  lock_reason?: string;
  prerequisites: string[]; // Task IDs that must be completed
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ContractDocument {
  id: string;
  title: string;
  fileName: string;
  fileSize: string;
  uploadDate: string;
  uploadedBy: string;
  category: string;
  parties: string[];
  totalValue?: string;
  effectiveDate: string;
  expiryDate: string;
  fullText: string;
  status: 'Parsed' | 'Analyzing' | 'Ready for Review' | 'Active' | 'Archived';
  obligationsCount: number;
  approvedCount: number;
  highRiskCount: number;
  confidenceAvg: number;
  documentType?: 'pdf' | 'docx' | 'pptx' | 'txt' | 'image';
  documentHtml?: string;
  pdfDataUrl?: string;
  imageDataUrl?: string;
  slides?: Array<{ slideNumber: number; text: string }>;
  pageCount?: number;
  isScanned?: boolean;
  ocrPerformed?: boolean;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: Role;
  action: 'UPLOAD_CONTRACT' | 'EXTRACT_OBLIGATIONS' | 'APPROVE_OBLIGATION' | 'REJECT_OBLIGATION' | 'EDIT_OBLIGATION' | 'CREATE_TASK' | 'UPDATE_TASK' | 'COMPLETE_TASK' | 'OVERRIDE_LOCK';
  targetType: 'Contract' | 'Obligation' | 'Task';
  targetId: string;
  clauseReference?: string;
  page?: number;
  details: string;
  beforeValue?: any;
  afterValue?: any;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  contract_id?: string;
  citations?: Array<{
    clause: string;
    page: number;
    quote: string;
  }>;
  relatedTasks?: string[];
  isGrounded?: boolean;
}
