import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2, X, AlertTriangle } from 'lucide-react';
import { ExtractedObligation, User } from '../types/contract.ts';

interface ApproveModalProps {
  obligation: ExtractedObligation | null;
  currentUser: User;
  onClose: () => void;
  onConfirm: (comment?: string) => void;
}

export const ApproveModal: React.FC<ApproveModalProps> = ({
  obligation,
  currentUser,
  onClose,
  onConfirm,
}) => {
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!obligation) return null;

  const isHighRisk = obligation.risk_level === 'High';
  const isEmployee = currentUser.role === 'Employee';

  const handleApprove = () => {
    if (isEmployee) {
      setError('Employees do not have approval permissions. Please switch to Approver or Manager role.');
      return;
    }

    if (isHighRisk && comment.trim().length < 8) {
      setError('High-risk obligations mandate a written rationale comment (minimum 8 characters) for compliance.');
      return;
    }

    onConfirm(comment.trim() ? comment.trim() : undefined);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        className="w-full max-w-lg rounded-2xl border shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div 
                className="p-2 rounded-xl"
                style={{ backgroundColor: isHighRisk ? 'var(--danger-subtle)' : 'var(--success-subtle)' }}
              >
                {isHighRisk ? (
                  <ShieldAlert className="w-5 h-5" style={{ color: 'var(--danger)' }} />
                ) : (
                  <CheckCircle2 className="w-5 h-5" style={{ color: 'var(--success)' }} />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--text)' }}>
                  Approve Contract Obligation
                </h3>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  Ref: {obligation.clause_reference} (Page {obligation.page})
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Obligation Summary Preview */}
        <div 
          className="p-3.5 rounded-xl border space-y-2 text-xs"
          style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
        >
          <div className="font-bold" style={{ color: 'var(--text)' }}>
            {obligation.obligation_summary}
          </div>
          <blockquote className="font-mono text-[11px] italic" style={{ color: 'var(--text-secondary)' }}>
            "{obligation.source_quote}"
          </blockquote>
          <div className="text-[11px] flex items-center space-x-2" style={{ color: 'var(--muted)' }}>
            <span>Type: {obligation.type}</span>
            <span>•</span>
            <span>Party: {obligation.obligated_party}</span>
            <span>•</span>
            <span>Due: {obligation.normalized_due_date || obligation.deadline}</span>
          </div>
        </div>

        {/* High Risk Notice */}
        {isHighRisk && (
          <div 
            className="p-3 rounded-xl border text-xs flex items-start space-x-2"
            style={{ backgroundColor: 'var(--danger-subtle)', borderColor: 'var(--danger)', color: 'var(--danger)' }}
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">High-Risk Enforcement:</span> This item carries significant operational or legal risk. A formal written rationale comment is strictly required before execution approval.
            </div>
          </div>
        )}

        {/* Written Comment Field */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold flex items-center justify-between" style={{ color: 'var(--text)' }}>
            <span>Approval Rationale & Audit Comment {isHighRisk ? '(Mandatory)' : '(Optional)'}</span>
            <span className="text-[10px]" style={{ color: 'var(--muted)' }}>Signed by: {currentUser.name} ({currentUser.role})</span>
          </label>
          <textarea
            value={comment}
            onChange={(e) => {
              setComment(e.target.value);
              if (error) setError(null);
            }}
            placeholder={isHighRisk ? "Enter legal/commercial justification for approving this high-risk obligation..." : "Optional reviewer notes..."}
            rows={3}
            className="w-full p-3 rounded-xl border text-xs transition-colors focus:outline-none focus:ring-2 resize-y"
            style={{
              backgroundColor: 'var(--background)',
              borderColor: error ? 'var(--danger)' : 'var(--border)',
              color: 'var(--text)'
            }}
          />
          {error && (
            <p className="text-[11px] font-semibold" style={{ color: 'var(--danger)' }}>
              {error}
            </p>
          )}
        </div>

        {/* Conversion Info */}
        <div className="text-[11px]" style={{ color: 'var(--muted)' }}>
          Upon approval, an operational task will be created on the Kanban Board. Immutable audit entry will be logged under your identity.
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer"
            style={{ backgroundColor: 'var(--surface-raised)', borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleApprove}
            className="px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
            style={{ backgroundColor: 'var(--success)', color: 'var(--accent-foreground)' }}
          >
            Confirm Approval
          </button>
        </div>
      </div>
    </div>
  );
};
