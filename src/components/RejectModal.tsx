import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { ExtractedObligation, User } from '../types/contract.ts';

interface RejectModalProps {
  obligation: ExtractedObligation | null;
  currentUser: User;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export const RejectModal: React.FC<RejectModalProps> = ({
  obligation,
  currentUser,
  onClose,
  onConfirm,
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!obligation) return null;

  const handleReject = () => {
    if (currentUser.role === 'Employee') {
      setError('Employees do not have rejection permissions.');
      return;
    }

    if (!reason || reason.trim().length < 5) {
      setError('Please provide a specific business or legal reason for rejection (min 5 characters).');
      return;
    }

    onConfirm(reason.trim());
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        className="w-full max-w-lg rounded-2xl border shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl" style={{ backgroundColor: 'var(--danger-subtle)' }}>
              <AlertCircle className="w-5 h-5" style={{ color: 'var(--danger)' }} />
            </div>
            <div>
              <h3 className="text-base font-bold" style={{ color: 'var(--text)' }}>
                Reject Contract Obligation
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

        <div className="p-3.5 rounded-xl border text-xs space-y-1.5" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
          <div className="font-bold" style={{ color: 'var(--text)' }}>
            {obligation.obligation_summary}
          </div>
          <p className="font-mono text-[11px] italic" style={{ color: 'var(--text-secondary)' }}>
            "{obligation.source_quote}"
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold" style={{ color: 'var(--text)' }}>
            Rejection Rationale (Required for Audit Trail)
          </label>
          <textarea
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Non-binding preamble statement, superseded by amendment, or outside project scope..."
            rows={3}
            className="w-full p-3 rounded-xl border text-xs transition-colors focus:outline-none focus:ring-2 resize-y"
            style={{
              backgroundColor: 'var(--background)',
              borderColor: error ? 'var(--danger)' : 'var(--border)',
              color: 'var(--text)',
            }}
          />
          {error && (
            <p className="text-[11px] font-semibold" style={{ color: 'var(--danger)' }}>
              {error}
            </p>
          )}
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
            onClick={handleReject}
            className="px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
            style={{ backgroundColor: 'var(--danger)', color: 'var(--accent-foreground)' }}
          >
            Confirm Rejection
          </button>
        </div>
      </div>
    </div>
  );
};
