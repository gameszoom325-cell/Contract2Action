import React, { useState } from 'react';
import { X, Edit3, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { ExtractedObligation, User, Role, TaskPriority, TaskItem } from '../types/contract.ts';

interface EditApproveModalProps {
  obligation: ExtractedObligation | null;
  currentUser: User;
  allTasks: TaskItem[];
  onClose: () => void;
  onConfirm: (updated: Partial<ExtractedObligation>, comment?: string) => void;
}

export const EditApproveModal: React.FC<EditApproveModalProps> = ({
  obligation,
  currentUser,
  allTasks,
  onClose,
  onConfirm,
}) => {
  if (!obligation) return null;

  const [title, setTitle] = useState(obligation.suggested_task.title);
  const [description, setDescription] = useState(obligation.suggested_task.description);
  const [assignedRole, setAssignedRole] = useState<Role>(obligation.suggested_task.owner_role);
  const [priority, setPriority] = useState<TaskPriority>(obligation.suggested_task.priority);
  const [dueDate, setDueDate] = useState(obligation.normalized_due_date || obligation.suggested_task.due_date);
  const [selectedPrereqs, setSelectedPrereqs] = useState<string[]>(obligation.preconditions || []);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isHighRisk = obligation.risk_level === 'High';

  const handleSaveAndApprove = () => {
    if (currentUser.role === 'Employee') {
      setError('Employees do not have approval permissions.');
      return;
    }

    if (!title.trim()) {
      setError('Task title is required.');
      return;
    }

    if (isHighRisk && comment.trim().length < 8) {
      setError('High-risk obligations mandate a written rationale comment (min 8 chars).');
      return;
    }

    const updated: Partial<ExtractedObligation> = {
      normalized_due_date: dueDate,
      preconditions: selectedPrereqs,
      suggested_task: {
        title,
        description,
        owner_role: assignedRole,
        due_date: dueDate,
        priority,
      },
    };

    onConfirm(updated, comment.trim() || undefined);
  };

  const togglePrereq = (taskId: string) => {
    setSelectedPrereqs(prev => 
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div 
        className="w-full max-w-xl rounded-2xl border shadow-2xl p-6 space-y-4 my-8 animate-in fade-in zoom-in-95"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl" style={{ backgroundColor: 'var(--accent-subtle)' }}>
              <Edit3 className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <h3 className="text-base font-bold" style={{ color: 'var(--text)' }}>
                Edit & Approve Obligation Task
              </h3>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                Ref: {obligation.clause_reference} (Page {obligation.page})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-muted hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Source Quote */}
        <div className="p-3 rounded-xl border text-xs font-mono space-y-1" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
          <span className="text-[10px] uppercase font-bold" style={{ color: 'var(--muted)' }}>Verbatim Clause Quote:</span>
          <p className="italic" style={{ color: 'var(--text)' }}>"{obligation.source_quote}"</p>
        </div>

        {/* Form fields */}
        <div className="space-y-3 text-xs">
          <div>
            <label className="font-bold block mb-1" style={{ color: 'var(--text)' }}>
              Actionable Task Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2"
              style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)', color: 'var(--text)' }}
            />
          </div>

          <div>
            <label className="font-bold block mb-1" style={{ color: 'var(--text)' }}>
              Task Execution Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2"
              style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)', color: 'var(--text)' }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold block mb-1" style={{ color: 'var(--text)' }}>
                Assigned Role
              </label>
              <select
                value={assignedRole}
                onChange={(e) => setAssignedRole(e.target.value as Role)}
                className="w-full px-3 py-2 rounded-xl border text-xs cursor-pointer"
                style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)', color: 'var(--text)' }}
              >
                <option value="Employee">Employee</option>
                <option value="Manager">Manager</option>
                <option value="Approver">Approver</option>
                <option value="Admin">Admin</option>
              </select>
            </div>

            <div>
              <label className="font-bold block mb-1" style={{ color: 'var(--text)' }}>
                Priority Level
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 rounded-xl border text-xs cursor-pointer"
                style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)', color: 'var(--text)' }}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="font-bold block mb-1" style={{ color: 'var(--text)' }}>
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border text-xs cursor-pointer"
                style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)', color: 'var(--text)' }}
              >
              </input>
            </div>
          </div>

          {/* Conditional Workflow Preconditions */}
          <div className="space-y-1.5 pt-1">
            <label className="font-bold block" style={{ color: 'var(--text)' }}>
              Conditional Workflow Prerequisites (Locks task until completed)
            </label>
            <div className="max-h-28 overflow-y-auto rounded-xl border p-2 space-y-1" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
              {allTasks.length === 0 ? (
                <div className="text-[11px] text-muted p-1">No other active tasks to depend on.</div>
              ) : (
                allTasks.map(t => (
                  <label key={t.id} className="flex items-center space-x-2 text-[11px] p-1 rounded hover:bg-surface-raised cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedPrereqs.includes(t.id)}
                      onChange={() => togglePrereq(t.id)}
                      className="rounded accent-blue-600"
                    />
                    <span className="font-semibold" style={{ color: 'var(--text)' }}>{t.title}</span>
                    <span className="text-muted text-[10px]">({t.status})</span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className="font-bold block mb-1" style={{ color: 'var(--text)' }}>
              Approval Comment & Audit Rationale {isHighRisk && '(Required)'}
            </label>
            <textarea
              value={comment}
              onChange={(e) => {
                setComment(e.target.value);
                if (error) setError(null);
              }}
              rows={2}
              placeholder={isHighRisk ? "Enter mandatory legal/operational reason for approving this high-risk item..." : "Notes on adjustments made before approval..."}
              className="w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2"
              style={{ backgroundColor: 'var(--background)', borderColor: error ? 'var(--danger)' : 'var(--border)', color: 'var(--text)' }}
            />
            {error && (
              <p className="text-[11px] font-semibold mt-1" style={{ color: 'var(--danger)' }}>
                {error}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end space-x-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer"
            style={{ backgroundColor: 'var(--surface-raised)', borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSaveAndApprove}
            className="px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
          >
            Save & Approve Task
          </button>
        </div>
      </div>
    </div>
  );
};
