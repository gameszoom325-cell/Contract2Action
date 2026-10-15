import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Edit3, 
  ShieldAlert, 
  Clock, 
  AlertTriangle, 
  Filter, 
  CheckSquare, 
  Square, 
  ExternalLink, 
  Check, 
  X,
  Lock,
  ArrowRight
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { ExtractedObligation, ApprovalStatus, RiskLevel } from '../types/contract.ts';
import { ApproveModal } from './ApproveModal.tsx';
import { RejectModal } from './RejectModal.tsx';
import { EditApproveModal } from './EditApproveModal.tsx';
import { NavTab } from './Header.tsx';

interface ApprovalsHubProps {
  setActiveTab: (tab: NavTab) => void;
}

export const ApprovalsHub: React.FC<ApprovalsHubProps> = ({ setActiveTab }) => {
  const { 
    obligations, 
    tasks, 
    currentUser, 
    approveObligation, 
    rejectObligation, 
    editAndApproveObligation,
    bulkApproveObligations,
    confidenceThreshold,
    showToast 
  } = useApp();

  const [activeTabFilter, setActiveTabFilter] = useState<'Pending' | 'Approved' | 'Rejected' | 'Needs Review' | 'High Risk' | 'All'>('Pending');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals state
  const [modalApproveItem, setModalApproveItem] = useState<ExtractedObligation | null>(null);
  const [modalRejectItem, setModalRejectItem] = useState<ExtractedObligation | null>(null);
  const [modalEditItem, setModalEditItem] = useState<ExtractedObligation | null>(null);

  // Filter list
  const filteredList = obligations.filter(o => {
    if (activeTabFilter === 'Pending') return o.approval_status === 'Pending';
    if (activeTabFilter === 'Approved') return o.approval_status === 'Approved';
    if (activeTabFilter === 'Rejected') return o.approval_status === 'Rejected';
    if (activeTabFilter === 'Needs Review') return o.approval_status === 'Needs Review' || o.needs_review || o.confidence < confidenceThreshold;
    if (activeTabFilter === 'High Risk') return o.risk_level === 'High';
    return true; // All
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAllVisible = () => {
    if (selectedIds.length === filteredList.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredList.map(o => o.id));
    }
  };

  const selectedItems = obligations.filter(o => selectedIds.includes(o.id));
  const selectedHasHighRisk = selectedItems.some(o => o.risk_level === 'High');

  const handleBulkApprove = () => {
    if (selectedIds.length === 0) return;
    const res = bulkApproveObligations(selectedIds);
    if (res.success) {
      setSelectedIds([]);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold" style={{ color: 'var(--muted)' }}>
            <span>Human-in-the-Loop Gateway</span>
            <span>•</span>
            <span style={{ color: 'var(--accent)' }}>Deterministic Execution Guard</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text)' }}>
            Approvals Hub
          </h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Review AI-extracted obligations before they become actionable business tasks. High-risk items require mandatory written rationale.
          </p>
        </div>

        {/* User Role Indicator */}
        <div 
          className="p-3 rounded-xl border text-xs flex items-center space-x-2.5 self-start md:self-auto"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <div className="text-right">
            <div className="font-bold" style={{ color: 'var(--text)' }}>{currentUser.name}</div>
            <div className="text-[10px] uppercase font-bold" style={{ color: 'var(--accent)' }}>{currentUser.role}</div>
          </div>
          <img 
            src={currentUser.avatar} 
            alt={currentUser.name} 
            className="w-8 h-8 rounded-full object-cover border" 
            style={{ borderColor: 'var(--border)' }}
          />
        </div>
      </div>

      {/* Filter Tabs & Bulk Actions */}
      <div 
        className="p-4 rounded-2xl border shadow-xs space-y-4"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Tab Filter Pills */}
          <div className="flex flex-wrap gap-1.5">
            {(['Pending', 'Needs Review', 'High Risk', 'Approved', 'Rejected', 'All'] as const).map(tab => {
              const count = obligations.filter(o => {
                if (tab === 'Pending') return o.approval_status === 'Pending';
                if (tab === 'Approved') return o.approval_status === 'Approved';
                if (tab === 'Rejected') return o.approval_status === 'Rejected';
                if (tab === 'Needs Review') return o.approval_status === 'Needs Review' || o.needs_review || o.confidence < confidenceThreshold;
                if (tab === 'High Risk') return o.risk_level === 'High';
                return true;
              }).length;

              const isSelected = activeTabFilter === tab;

              return (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTabFilter(tab);
                    setSelectedIds([]);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
                  style={{
                    backgroundColor: isSelected ? 'var(--accent)' : 'var(--surface-raised)',
                    color: isSelected ? 'var(--accent-foreground)' : 'var(--text-secondary)',
                    boxShadow: isSelected ? '0 1px 3px rgba(37,99,235,0.2)' : 'none',
                  }}
                >
                  <span>{tab}</span>
                  <span 
                    className="text-[10px] px-1.5 py-0.2 rounded-full font-mono"
                    style={{
                      backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : 'var(--border)',
                      color: isSelected ? '#ffffff' : 'var(--text)'
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Select All Toggle */}
          <div className="flex items-center space-x-2">
            <button
              onClick={selectAllVisible}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors flex items-center space-x-1.5"
              style={{ backgroundColor: 'var(--surface-raised)', borderColor: 'var(--border)', color: 'var(--text)' }}
            >
              {selectedIds.length > 0 && selectedIds.length === filteredList.length ? (
                <CheckSquare className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
              ) : (
                <Square className="w-3.5 h-3.5" style={{ color: 'var(--muted)' }} />
              )}
              <span>Select All ({filteredList.length})</span>
            </button>
          </div>
        </div>

        {/* Bulk Action Bar (Visible when items selected) */}
        {selectedIds.length > 0 && (
          <div 
            className="p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in"
            style={{ backgroundColor: 'var(--background)', borderColor: 'var(--accent)' }}
          >
            <div className="flex items-center space-x-2 text-xs">
              <span className="font-bold" style={{ color: 'var(--accent)' }}>
                {selectedIds.length} item{selectedIds.length === 1 ? '' : 's'} selected
              </span>
              {selectedHasHighRisk && (
                <span 
                  className="text-[10px] font-bold px-2 py-0.5 rounded border inline-flex items-center space-x-1"
                  style={{ backgroundColor: 'var(--danger-subtle)', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                >
                  <AlertTriangle className="w-3 h-3" />
                  <span>Contains High-Risk (Bulk Approve Disabled)</span>
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleBulkApprove}
                disabled={selectedHasHighRisk || currentUser.role === 'Employee'}
                className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: 'var(--success)',
                  color: 'var(--accent-foreground)',
                }}
              >
                Bulk Approve Selected
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border"
                style={{ backgroundColor: 'var(--surface-raised)', borderColor: 'var(--border)', color: 'var(--text)' }}
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Obligations Queue Cards */}
      <div className="space-y-4">
        {filteredList.length === 0 ? (
          <div 
            className="p-12 text-center rounded-2xl border text-sm space-y-2"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--muted)' }}
          >
            <CheckCircle2 className="w-8 h-8 mx-auto" style={{ color: 'var(--success)' }} />
            <h3 className="font-bold text-base" style={{ color: 'var(--text)' }}>
              Queue is Clear for "{activeTabFilter}"
            </h3>
            <p className="text-xs">
              No obligations require action under this filter.
            </p>
          </div>
        ) : (
          filteredList.map(obl => {
            const isHighRisk = obl.risk_level === 'High';
            const isSelected = selectedIds.includes(obl.id);
            const isPending = obl.approval_status === 'Pending' || obl.approval_status === 'Needs Review';
            const isApproved = obl.approval_status === 'Approved';
            const isRejected = obl.approval_status === 'Rejected';

            return (
              <div
                key={obl.id}
                className="p-5 rounded-2xl border shadow-xs transition-all space-y-4 relative"
                style={{
                  backgroundColor: isSelected ? 'var(--accent-subtle)' : 'var(--surface)',
                  borderColor: isSelected ? 'var(--accent)' : isHighRisk ? 'var(--danger)' : 'var(--border)',
                }}
              >
                {/* Top Row: Select Checkbox, Badges, Status */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-3">
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleSelect(obl.id)}
                      className="cursor-pointer"
                      aria-label="Select obligation"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                      ) : (
                        <Square className="w-4 h-4" style={{ color: 'var(--muted)' }} />
                      )}
                    </button>

                    {/* Clause Reference */}
                    <span 
                      className="font-mono text-xs font-black px-2 py-0.5 rounded border"
                      style={{
                        backgroundColor: 'var(--surface-raised)',
                        borderColor: 'var(--border)',
                        color: 'var(--text)'
                      }}
                    >
                      {obl.clause_reference} (P.{obl.page})
                    </span>

                    {/* Type Badge */}
                    <span 
                      className="text-[10px] font-bold uppercase px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: obl.type === 'Payment' ? 'var(--accent-subtle)' :
                                        obl.type === 'Delivery' ? 'var(--success-subtle)' :
                                        obl.type === 'Inspection' ? 'var(--info-subtle)' :
                                        obl.type === 'Compliance' ? 'var(--purple-subtle)' : 'var(--warning-subtle)',
                        color: obl.type === 'Payment' ? 'var(--accent)' :
                               obl.type === 'Delivery' ? 'var(--success)' :
                               obl.type === 'Inspection' ? 'var(--info)' :
                               obl.type === 'Compliance' ? 'var(--purple)' : 'var(--warning)',
                      }}
                    >
                      {obl.type}
                    </span>

                    {/* Risk Badge */}
                    {isHighRisk ? (
                      <span 
                        className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded border"
                        style={{
                          backgroundColor: 'var(--danger-subtle)',
                          color: 'var(--danger)',
                          borderColor: 'var(--danger)'
                        }}
                      >
                        <ShieldAlert className="w-3 h-3" />
                        <span>High Risk</span>
                      </span>
                    ) : (
                      <span 
                        className="text-[10px] font-bold px-2 py-0.5 rounded"
                        style={{ backgroundColor: 'var(--surface-raised)', color: 'var(--muted)' }}
                      >
                        {obl.risk_level} Risk
                      </span>
                    )}

                    {/* Confidence Meter */}
                    <span className="text-[11px] font-mono" style={{ color: 'var(--muted)' }}>
                      AI Confidence: <strong style={{ color: obl.confidence >= 0.7 ? 'var(--success)' : 'var(--danger)' }}>{Math.round(obl.confidence * 100)}%</strong>
                    </span>
                  </div>

                  {/* Status Indicator */}
                  <div>
                    <span 
                      className="text-xs font-bold px-2.5 py-1 rounded-full uppercase"
                      style={{
                        backgroundColor: isApproved ? 'var(--success-subtle)' :
                                        isRejected ? 'var(--danger-subtle)' : 'var(--warning-subtle)',
                        color: isApproved ? 'var(--success)' :
                               isRejected ? 'var(--danger)' : 'var(--warning)',
                      }}
                    >
                      {obl.approval_status}
                    </span>
                  </div>
                </div>

                {/* Obligation Summary & Party */}
                <div>
                  <h3 className="text-base font-bold" style={{ color: 'var(--text)' }}>
                    {obl.obligation_summary}
                  </h3>
                  <div className="text-xs mt-1 flex flex-wrap gap-x-4 gap-y-1" style={{ color: 'var(--text-secondary)' }}>
                    <span>Obligated Party: <strong style={{ color: 'var(--text)' }}>{obl.obligated_party}</strong></span>
                    <span>•</span>
                    <span>Deadline: <strong style={{ color: 'var(--text)' }}>{obl.deadline}</strong></span>
                    {obl.amount && (
                      <>
                        <span>•</span>
                        <span>Amount: <strong className="font-mono" style={{ color: 'var(--accent)' }}>${obl.amount.toLocaleString()} {obl.currency}</strong></span>
                      </>
                    )}
                  </div>
                </div>

                {/* Verbatim Grounded Quote */}
                <div 
                  className="p-3.5 rounded-xl border text-xs font-mono space-y-1"
                  style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
                >
                  <div className="text-[10px] uppercase font-bold tracking-wider" style={{ color: 'var(--muted)' }}>
                    Verbatim Contract Text:
                  </div>
                  <blockquote className="italic leading-relaxed" style={{ color: 'var(--text)' }}>
                    "{obl.source_quote}"
                  </blockquote>
                </div>

                {/* Preconditions & Risk Reason */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-xl border" style={{ backgroundColor: 'var(--surface-raised)', borderColor: 'var(--border)' }}>
                    <span className="font-bold block text-[11px]" style={{ color: 'var(--muted)' }}>
                      Risk Assessment Rationale:
                    </span>
                    <span style={{ color: 'var(--text)' }}>
                      {obl.risk_reason}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl border" style={{ backgroundColor: 'var(--surface-raised)', borderColor: 'var(--border)' }}>
                    <span className="font-bold block text-[11px]" style={{ color: 'var(--muted)' }}>
                      Conditional Execution Preconditions:
                    </span>
                    <span style={{ color: 'var(--text)' }}>
                      {obl.conditions || 'No upstream prerequisites. Independent obligation.'}
                    </span>
                  </div>
                </div>

                {/* Suggested Task Preview */}
                <div 
                  className="p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
                >
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: 'var(--accent)' }}>
                      Automated Task Output:
                    </span>
                    <div className="font-bold" style={{ color: 'var(--text)' }}>
                      {obl.suggested_task.title}
                    </div>
                    <div className="text-[11px]" style={{ color: 'var(--muted)' }}>
                      Assignee: {obl.suggested_task.owner_role} • Priority: {obl.suggested_task.priority} • Due: {obl.suggested_task.due_date}
                    </div>
                  </div>

                  {obl.task_id && (
                    <button
                      onClick={() => setActiveTab('tasks')}
                      className="text-xs font-bold inline-flex items-center space-x-1 hover:underline cursor-pointer"
                      style={{ color: 'var(--accent)' }}
                    >
                      <span>View in Tasks Board</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Reviewer Audit Stamp if already reviewed */}
                {obl.reviewed_by && (
                  <div className="text-[11px] p-2 rounded-lg border text-muted flex items-center justify-between" style={{ backgroundColor: 'var(--surface-raised)', borderColor: 'var(--border)' }}>
                    <span>
                      Reviewed by <strong>{obl.reviewed_by}</strong> on {new Date(obl.reviewed_at || '').toLocaleString()}
                    </span>
                    {obl.approval_comment && (
                      <span className="italic truncate max-w-xs">
                        "{obl.approval_comment}"
                      </span>
                    )}
                    {obl.rejection_reason && (
                      <span className="italic truncate max-w-xs" style={{ color: 'var(--danger)' }}>
                        "{obl.rejection_reason}"
                      </span>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-between pt-2 border-t gap-2" style={{ borderColor: 'var(--border)' }}>
                  <div className="text-[11px]" style={{ color: 'var(--muted)' }}>
                    {isHighRisk && (
                      <span className="text-danger font-semibold flex items-center space-x-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>High risk: Cannot be bulk-approved. Written justification required.</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Edit & Approve */}
                    <button
                      onClick={() => setModalEditItem(obl)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors flex items-center space-x-1.5 cursor-pointer"
                      style={{
                        backgroundColor: 'var(--surface-raised)',
                        borderColor: 'var(--border)',
                        color: 'var(--text)'
                      }}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit & Approve</span>
                    </button>

                    {/* Reject */}
                    {isPending && (
                      <button
                        onClick={() => setModalRejectItem(obl)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors flex items-center space-x-1.5 cursor-pointer"
                        style={{
                          backgroundColor: 'var(--danger-subtle)',
                          borderColor: 'var(--danger)',
                          color: 'var(--danger)'
                        }}
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    )}

                    {/* Approve */}
                    {isPending && (
                      <button
                        onClick={() => setModalApproveItem(obl)}
                        className="px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs"
                        style={{
                          backgroundColor: 'var(--success)',
                          color: 'var(--accent-foreground)'
                        }}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modals */}
      {modalApproveItem && (
        <ApproveModal
          obligation={modalApproveItem}
          currentUser={currentUser}
          onClose={() => setModalApproveItem(null)}
          onConfirm={(comment) => {
            approveObligation(modalApproveItem.id, comment);
            setModalApproveItem(null);
          }}
        />
      )}

      {modalRejectItem && (
        <RejectModal
          obligation={modalRejectItem}
          currentUser={currentUser}
          onClose={() => setModalRejectItem(null)}
          onConfirm={(reason) => {
            rejectObligation(modalRejectItem.id, reason);
            setModalRejectItem(null);
          }}
        />
      )}

      {modalEditItem && (
        <EditApproveModal
          obligation={modalEditItem}
          currentUser={currentUser}
          allTasks={tasks}
          onClose={() => setModalEditItem(null)}
          onConfirm={(updatedFields, comment) => {
            editAndApproveObligation(modalEditItem.id, updatedFields, comment);
            setModalEditItem(null);
          }}
        />
      )}
    </div>
  );
};
