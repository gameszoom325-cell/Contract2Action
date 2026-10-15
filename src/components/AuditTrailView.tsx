import React, { useState } from 'react';
import { 
  History, 
  Search, 
  Download, 
  ShieldCheck, 
  User, 
  CheckCircle2, 
  XCircle, 
  Edit3, 
  Upload,
  ArrowRight
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { AuditLogEntry } from '../types/contract.ts';

export const AuditTrailView: React.FC = () => {
  const { auditLogs, showToast } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedActionFilter, setSelectedActionFilter] = useState<string>('all');

  const filteredLogs = auditLogs.filter(log => {
    if (selectedActionFilter !== 'all' && log.action !== selectedActionFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        log.details.toLowerCase().includes(q) ||
        log.userName.toLowerCase().includes(q) ||
        log.userRole.toLowerCase().includes(q) ||
        (log.clauseReference && log.clauseReference.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const exportAuditLogJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(auditLogs, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute('download', `Contract2Action_AuditTrail_${new Date().toISOString().split('T')[0]}.json`);
    dlAnchorElem.click();
    showToast('Exported audit trail JSON.', 'success');
  };

  const getActionBadge = (action: AuditLogEntry['action']) => {
    switch (action) {
      case 'APPROVE_OBLIGATION':
        return { label: 'Approved', bg: 'var(--success-subtle)', text: 'var(--success)', icon: CheckCircle2 };
      case 'REJECT_OBLIGATION':
        return { label: 'Rejected', bg: 'var(--danger-subtle)', text: 'var(--danger)', icon: XCircle };
      case 'EDIT_OBLIGATION':
        return { label: 'Modified & Approved', bg: 'var(--accent-subtle)', text: 'var(--accent)', icon: Edit3 };
      case 'UPLOAD_CONTRACT':
        return { label: 'Contract Ingested', bg: 'var(--surface-raised)', text: 'var(--text)', icon: Upload };
      case 'EXTRACT_OBLIGATIONS':
        return { label: 'AI Extraction', bg: 'var(--purple-subtle)', text: 'var(--purple)', icon: ShieldCheck };
      case 'UPDATE_TASK':
        return { label: 'Task Status', bg: 'var(--accent-subtle)', text: 'var(--accent)', icon: CheckCircle2 };
      default:
        return { label: action, bg: 'var(--surface-raised)', text: 'var(--muted)', icon: History };
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold" style={{ color: 'var(--muted)' }}>
            <span>SOC 2 & Enterprise Compliance</span>
            <span>•</span>
            <span style={{ color: 'var(--success)' }}>Cryptographic Immutability</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text)' }}>
            Enterprise Audit Trail
          </h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Complete tamper-proof timeline of all contract extractions, human approvals, edits, and task workflow transitions.
          </p>
        </div>

        <button
          onClick={exportAuditLogJSON}
          className="px-4 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center space-x-2 self-start md:self-auto cursor-pointer shadow-xs"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Audit Log (JSON)</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div 
        className="p-4 rounded-2xl border shadow-xs flex flex-wrap items-center justify-between gap-3"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3" style={{ color: 'var(--muted)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search audit trail by user, clause, or action details..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2"
            style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)', color: 'var(--text)' }}
          />
        </div>

        <select
          value={selectedActionFilter}
          onChange={(e) => setSelectedActionFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer"
          style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)', color: 'var(--text)' }}
        >
          <option value="all">All Actions</option>
          <option value="APPROVE_OBLIGATION">Approvals</option>
          <option value="REJECT_OBLIGATION">Rejections</option>
          <option value="EDIT_OBLIGATION">Edits & Approvals</option>
          <option value="UPDATE_TASK">Task Progressions</option>
          <option value="UPLOAD_CONTRACT">Contract Ingestions</option>
        </select>
      </div>

      {/* Timeline List */}
      <div 
        className="rounded-2xl border shadow-xs divide-y overflow-hidden"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted">
            No audit log records match the current filters.
          </div>
        ) : (
          filteredLogs.map(entry => {
            const badge = getActionBadge(entry.action);
            const Icon = badge.icon;

            return (
              <div key={entry.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4 hover:bg-surface-raised transition-colors">
                <div className="flex items-start space-x-3.5 flex-1">
                  <div 
                    className="p-2 rounded-xl shrink-0 mt-0.5"
                    style={{ backgroundColor: badge.bg, color: badge.text }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span 
                        className="text-[10px] font-bold uppercase px-2 py-0.5 rounded"
                        style={{ backgroundColor: badge.bg, color: badge.text }}
                      >
                        {badge.label}
                      </span>
                      {entry.clauseReference && (
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded border" style={{ backgroundColor: 'var(--surface-raised)', borderColor: 'var(--border)' }}>
                          {entry.clauseReference} {entry.page ? `(P.${entry.page})` : ''}
                        </span>
                      )}
                      <span className="text-[11px] font-mono text-muted">
                        ID: {entry.id}
                      </span>
                    </div>

                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text)' }}>
                      {entry.details}
                    </p>

                    {/* Before & After Values comparison if present */}
                    {(entry.beforeValue || entry.afterValue) && (
                      <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                        {entry.beforeValue && (
                          <div className="p-2 rounded-lg border text-muted" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
                            <span className="font-bold text-[9px] uppercase tracking-wider block text-danger">Before:</span>
                            <pre className="truncate whitespace-pre-wrap">{JSON.stringify(entry.beforeValue, null, 2)}</pre>
                          </div>
                        )}
                        {entry.afterValue && (
                          <div className="p-2 rounded-lg border" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
                            <span className="font-bold text-[9px] uppercase tracking-wider block text-success">After:</span>
                            <pre className="truncate whitespace-pre-wrap">{JSON.stringify(entry.afterValue, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Actor & Timestamp */}
                <div className="text-right sm:self-start shrink-0 text-xs space-y-0.5">
                  <div className="font-bold flex items-center justify-end space-x-1" style={{ color: 'var(--text)' }}>
                    <User className="w-3.5 h-3.5 text-muted" />
                    <span>{entry.userName}</span>
                  </div>
                  <div className="text-[10px] uppercase font-bold" style={{ color: 'var(--accent)' }}>
                    {entry.userRole}
                  </div>
                  <div className="text-[10px] font-mono" style={{ color: 'var(--muted)' }}>
                    {new Date(entry.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
