import React from 'react';
import { 
  X, 
  Bell, 
  AlertCircle, 
  Clock, 
  Mail, 
  CheckCircle2, 
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { computeDeadlineStatus } from '../utils/workflowEngine.ts';
import { NavTab } from './Header.tsx';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  setActiveTab: (tab: NavTab) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  setActiveTab,
}) => {
  const { tasks, obligations, showToast } = useApp();

  if (!isOpen) return null;

  // Overdue and approaching tasks
  const taskAlerts = tasks
    .map(t => ({
      ...t,
      deadlineInfo: computeDeadlineStatus(t.due_date),
    }))
    .filter(t => t.status !== 'Completed' && (t.deadlineInfo.isOverdue || t.deadlineInfo.daysRemaining <= 7))
    .sort((a, b) => a.deadlineInfo.daysRemaining - b.deadlineInfo.daysRemaining);

  // High risk pending obligations
  const highRiskApprovals = obligations.filter(
    o => o.risk_level === 'High' && (o.approval_status === 'Pending' || o.approval_status === 'Needs Review')
  );

  const handleSimulateEmailReminder = () => {
    showToast('Simulated email reminders dispatched to contract owners & legal team.', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end">
      <div 
        className="w-full max-w-md h-full shadow-2xl border-l flex flex-col p-6 space-y-5 animate-in slide-in-from-right duration-200"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl" style={{ backgroundColor: 'var(--accent-subtle)' }}>
              <Bell className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <h3 className="text-base font-bold" style={{ color: 'var(--text)' }}>
                Notifications & Reminders
              </h3>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                Automated deadline alerts & approvals
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-muted hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Multi-channel dispatch button */}
        <div 
          className="p-3.5 rounded-xl border flex items-center justify-between text-xs"
          style={{ backgroundColor: 'var(--surface-raised)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center space-x-2">
            <Mail className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <span style={{ color: 'var(--text)' }}>Email Reminders Dispatch</span>
          </div>
          <button
            onClick={handleSimulateEmailReminder}
            className="px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer shadow-2xs hover:bg-surface"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            Send Test Alert
          </button>
        </div>

        {/* Alerts List */}
        <div className="flex-1 overflow-y-auto space-y-3.5 text-xs pr-1">
          {/* High risk pending obligations */}
          {highRiskApprovals.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-danger tracking-wider">
                High Risk Approvals Requiring Action:
              </span>
              {highRiskApprovals.map(obl => (
                <div 
                  key={obl.id} 
                  className="p-3 rounded-xl border space-y-1.5 cursor-pointer hover:border-danger transition-colors"
                  style={{ backgroundColor: 'var(--danger-subtle)', borderColor: 'var(--danger)' }}
                  onClick={() => {
                    setActiveTab('approvals');
                    onClose();
                  }}
                >
                  <div className="flex items-center justify-between text-danger font-bold text-[11px]">
                    <span className="flex items-center space-x-1">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>{obl.clause_reference} (P.{obl.page})</span>
                    </span>
                    <span>Needs Justification</span>
                  </div>
                  <div className="font-semibold text-xs text-foreground">
                    {obl.obligation_summary}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Task deadline alerts */}
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold text-muted tracking-wider">
              Upcoming & Overdue Milestones:
            </span>

            {taskAlerts.length === 0 ? (
              <div className="p-6 text-center text-muted border rounded-xl" style={{ borderColor: 'var(--border)' }}>
                No urgent milestone deadlines within 7 days.
              </div>
            ) : (
              taskAlerts.map(task => (
                <div 
                  key={task.id}
                  className="p-3 rounded-xl border space-y-1.5 cursor-pointer hover:border-accent transition-colors"
                  style={{
                    backgroundColor: task.deadlineInfo.isOverdue ? 'var(--danger-subtle)' : 'var(--background)',
                    borderColor: task.deadlineInfo.isOverdue ? 'var(--danger)' : 'var(--border)',
                  }}
                  onClick={() => {
                    setActiveTab('tasks');
                    onClose();
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase" style={{ color: task.deadlineInfo.isOverdue ? 'var(--danger)' : 'var(--accent)' }}>
                      {task.deadlineInfo.formattedText}
                    </span>
                    <span className="text-[10px] font-mono text-muted">
                      Due: {task.due_date}
                    </span>
                  </div>
                  <div className="font-bold text-xs" style={{ color: 'var(--text)' }}>
                    {task.title}
                  </div>
                  <div className="text-[10px] text-muted flex items-center justify-between">
                    <span>Role: {task.assigned_role}</span>
                    <span>Status: {task.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 text-center text-[10px] text-muted border-t" style={{ borderColor: 'var(--border)' }}>
          Notifications are automatically triggered by deadline calculators and compliance rule engines.
        </div>
      </div>
    </div>
  );
};
