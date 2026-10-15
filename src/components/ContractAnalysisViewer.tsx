import React, { useState } from 'react';
import { 
  FileText, 
  Search, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ExternalLink, 
  Filter, 
  ChevronRight, 
  Lock, 
  FileCheck2,
  DollarSign,
  ArrowRight,
  BookOpen
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { ExtractedObligation, ObligationType, RiskLevel } from '../types/contract.ts';
import { NavTab } from './Header.tsx';

import { InbuiltDocumentViewer } from './InbuiltDocumentViewer.tsx';
import { findQuoteInText, QuoteMatchResult } from '../utils/contractParser.ts';

interface ContractAnalysisViewerProps {
  setActiveTab: (tab: NavTab) => void;
}

export const ContractAnalysisViewer: React.FC<ContractAnalysisViewerProps> = ({ setActiveTab }) => {
  const { 
    contracts, 
    activeContractId, 
    setActiveContractId, 
    activeContract, 
    obligations,
    confidenceThreshold,
    showToast 
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<string>('all');
  const [highlightResult, setHighlightResult] = useState<QuoteMatchResult | null>(null);

  const handleLocateQuote = (quote: string) => {
    if (!activeContract?.fullText) return;
    const match = findQuoteInText(quote, activeContract.fullText);
    setHighlightResult(match);
    if (!match.found) {
      showToast('Source quote not found in current document text.', 'warning');
    } else if (!match.isExact) {
      showToast(`Located with fuzzy matching on Page ${match.page || 1}`, 'info');
    } else {
      showToast(`Exact verbatim quote located on Page ${match.page || 1}`, 'success');
    }
  };

  // Obligations for currently selected contract
  const contractObligations = obligations.filter(o => o.contract_id === activeContractId);

  // Filtered list
  const filteredObligations = contractObligations.filter(o => {
    if (selectedTypeFilter !== 'all' && o.type !== selectedTypeFilter) return false;
    if (selectedRiskFilter !== 'all' && o.risk_level !== selectedRiskFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchQuote = o.source_quote.toLowerCase().includes(q);
      const matchSummary = o.obligation_summary.toLowerCase().includes(q);
      const matchClause = o.clause_reference.toLowerCase().includes(q);
      const matchParty = o.obligated_party.toLowerCase().includes(q);
      return matchQuote || matchSummary || matchClause || matchParty;
    }
    return true;
  });

  if (!activeContract) {
    return (
      <div 
        className="p-12 text-center rounded-2xl border space-y-4"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <FileText className="w-12 h-12 mx-auto" style={{ color: 'var(--muted)' }} />
        <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>No Contract Selected</h2>
        <p className="text-xs" style={{ color: 'var(--muted)' }}>
          Please upload a contract or select one from the upload tab to begin grounded analysis.
        </p>
        <button
          onClick={() => setActiveTab('upload')}
          className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
        >
          Go to Upload Tab
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Contract Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold" style={{ color: 'var(--muted)' }}>
            <span>Contract Grounding & Extraction</span>
            <span>•</span>
            <span style={{ color: 'var(--success)' }}>Anti-Hallucination Verified</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text)' }}>
            Clause Extraction & Source Grounding
          </h1>
        </div>

        {/* Contract Switcher */}
        <div className="flex items-center space-x-2">
          <label className="text-xs font-bold whitespace-nowrap" style={{ color: 'var(--text)' }}>
            Active Contract:
          </label>
          <select
            value={activeContractId}
            onChange={(e) => setActiveContractId(e.target.value)}
            className="px-3 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer"
            style={{
              backgroundColor: 'var(--surface)',
              borderColor: 'var(--border)',
              color: 'var(--text)'
            }}
          >
            {contracts.map(c => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Contract Metadata Header Card */}
      <div 
        className="p-5 rounded-2xl border shadow-xs flex flex-wrap items-center justify-between gap-4"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded border" style={{ backgroundColor: 'var(--accent-subtle)', color: 'var(--accent)', borderColor: 'var(--border)' }}>
              {activeContract.category}
            </span>
            <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>
              {activeContract.fileName}
            </span>
          </div>
          <h2 className="text-base font-bold" style={{ color: 'var(--text)' }}>
            {activeContract.title}
          </h2>
          <div className="text-xs flex flex-wrap gap-x-4 gap-y-1" style={{ color: 'var(--text-secondary)' }}>
            <span>Parties: <strong>{activeContract.parties.join(' & ')}</strong></span>
            {activeContract.totalValue && <span>• Value: <strong style={{ color: 'var(--text)' }}>{activeContract.totalValue}</strong></span>}
            <span>• Term: {activeContract.effectiveDate} to {activeContract.expiryDate}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('approvals')}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--accent-foreground)'
            }}
          >
            <span>Go to Approvals Hub</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Split View: Left Inbuilt Document Viewer, Right Extracted Obligations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Pane: Inbuilt Document Viewer (5 cols) */}
        <div className="lg:col-span-5">
          <InbuiltDocumentViewer
            contract={activeContract}
            highlightResult={highlightResult}
            onClearHighlight={() => setHighlightResult(null)}
          />
        </div>

        {/* Right Pane: Extracted Obligations List (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Filters Bar */}
          <div 
            className="p-4 rounded-2xl border shadow-xs flex flex-wrap items-center justify-between gap-3"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3" style={{ color: 'var(--muted)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search extracted obligations or quotes..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border text-xs transition-colors focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--background)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)'
                }}
              />
            </div>

            {/* Type Filter */}
            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className="px-2.5 py-2 rounded-xl border text-xs font-semibold cursor-pointer"
              style={{
                backgroundColor: 'var(--background)',
                borderColor: 'var(--border)',
                color: 'var(--text)'
              }}
            >
              <option value="all">All Types</option>
              <option value="Payment">Payment</option>
              <option value="Delivery">Delivery</option>
              <option value="Inspection">Inspection</option>
              <option value="Compliance">Compliance</option>
              <option value="Reporting">Reporting</option>
              <option value="SLA">SLA</option>
            </select>

            {/* Risk Filter */}
            <select
              value={selectedRiskFilter}
              onChange={(e) => setSelectedRiskFilter(e.target.value)}
              className="px-2.5 py-2 rounded-xl border text-xs font-semibold cursor-pointer"
              style={{
                backgroundColor: 'var(--background)',
                borderColor: 'var(--border)',
                color: 'var(--text)'
              }}
            >
              <option value="all">All Risks</option>
              <option value="High">High Risk</option>
              <option value="Medium">Medium Risk</option>
              <option value="Low">Low Risk</option>
            </select>
          </div>

          {/* Obligations Count Summary */}
          <div className="flex items-center justify-between text-xs px-1" style={{ color: 'var(--muted)' }}>
            <span>
              Showing {filteredObligations.length} of {contractObligations.length} extracted obligations
            </span>
            <span className="font-semibold" style={{ color: 'var(--accent)' }}>
              Confidence Gate: {Math.round(confidenceThreshold * 100)}%
            </span>
          </div>

          {/* Obligations Cards List */}
          <div className="space-y-3.5 max-h-[680px] overflow-y-auto pr-1">
            {filteredObligations.length === 0 ? (
              <div 
                className="p-12 text-center rounded-2xl border text-sm"
                style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--muted)' }}
              >
                No extracted obligations match the selected filters.
              </div>
            ) : (
              filteredObligations.map(obl => {
                const isBelowConfidence = obl.confidence < confidenceThreshold;
                const isHighRisk = obl.risk_level === 'High';
                const isSelected = Boolean(
                  highlightResult?.found && 
                  highlightResult?.matchText && 
                  (highlightResult.matchText.includes(obl.source_quote.slice(0, 30)) || obl.source_quote.includes(highlightResult.matchText.slice(0, 30)))
                );

                return (
                  <div
                    key={obl.id}
                    className="p-5 rounded-2xl border shadow-xs transition-all space-y-3 relative"
                    style={{
                      backgroundColor: isSelected ? 'var(--accent-subtle)' : 'var(--surface)',
                      borderColor: isSelected ? 'var(--accent)' : 'var(--border)',
                    }}
                  >
                    {/* Card Top: Clause Ref, Type Badge, Risk, Confidence */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span 
                          className="font-mono text-xs font-black px-2 py-0.5 rounded border"
                          style={{
                            backgroundColor: 'var(--surface-raised)',
                            borderColor: 'var(--border)',
                            color: 'var(--text)',
                          }}
                        >
                          {obl.clause_reference} (P.{obl.page})
                        </span>

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
                            style={{
                              backgroundColor: 'var(--surface-raised)',
                              color: 'var(--muted)',
                            }}
                          >
                            {obl.risk_level} Risk
                          </span>
                        )}

                        {isBelowConfidence && (
                          <span 
                            className="text-[10px] font-bold px-2 py-0.5 rounded border"
                            style={{
                              backgroundColor: 'var(--warning-subtle)',
                              color: 'var(--warning)',
                              borderColor: 'var(--warning)'
                            }}
                          >
                            Needs Review
                          </span>
                        )}

                        {obl.conflicting_clause && (
                          <span 
                            className="text-[10px] font-bold px-2 py-0.5 rounded border"
                            style={{
                              backgroundColor: 'var(--danger-subtle)',
                              color: 'var(--danger)',
                              borderColor: 'var(--danger)'
                            }}
                            title={obl.conflicting_clause}
                          >
                            Clause Conflict
                          </span>
                        )}
                      </div>

                      {/* Confidence Meter */}
                      <div className="flex items-center space-x-1.5 text-xs font-mono">
                        <span style={{ color: 'var(--muted)' }}>Confidence:</span>
                        <span 
                          className="font-bold"
                          style={{
                            color: obl.confidence >= 0.85 ? 'var(--success)' :
                                   obl.confidence >= 0.70 ? 'var(--warning)' : 'var(--danger)'
                          }}
                        >
                          {Math.round(obl.confidence * 100)}%
                        </span>
                      </div>
                    </div>

                    {/* Summary */}
                    <div>
                      <h4 className="text-sm font-bold leading-snug" style={{ color: 'var(--text)' }}>
                        {obl.obligation_summary}
                      </h4>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        Obligated Party: <strong style={{ color: 'var(--text)' }}>{obl.obligated_party}</strong> • Deadline: <strong style={{ color: 'var(--text)' }}>{obl.deadline}</strong>
                      </p>
                    </div>

                    {/* Verbatim Grounded Quote Box */}
                    <div 
                      className="p-3 rounded-xl border text-xs font-mono space-y-1"
                      style={{
                        backgroundColor: 'var(--background)',
                        borderColor: 'var(--border)'
                      }}
                    >
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                        <span>Exact Grounded Clause Quote</span>
                        <button
                          onClick={() => handleLocateQuote(obl.source_quote)}
                          className="hover:underline flex items-center space-x-1 cursor-pointer font-sans"
                          style={{ color: 'var(--accent)' }}
                        >
                          <span>Locate in viewer</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                      <blockquote className="italic leading-relaxed" style={{ color: 'var(--text)' }}>
                        "{obl.source_quote}"
                      </blockquote>
                    </div>

                    {/* Preconditions, Conflicts, or Risk reason */}
                    <div className="text-[11px] flex flex-wrap gap-x-3 gap-y-1" style={{ color: 'var(--muted)' }}>
                      <span><strong>Risk Rationale:</strong> {obl.risk_reason}</span>
                      {obl.conditions && (
                        <span>• <strong style={{ color: 'var(--warning)' }}>Conditions:</strong> {obl.conditions}</span>
                      )}
                      {obl.conflicting_clause && (
                        <span className="w-full text-danger font-medium mt-1">
                          ⚠️ {obl.conflicting_clause}
                        </span>
                      )}
                    </div>

                    {/* Suggested Task Preview */}
                    <div 
                      className="p-2.5 rounded-xl border flex items-center justify-between text-xs"
                      style={{
                        backgroundColor: 'var(--surface-raised)',
                        borderColor: 'var(--border)'
                      }}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }} />
                        <div className="truncate">
                          <span className="font-semibold" style={{ color: 'var(--text)' }}>
                            Suggested Task: {obl.suggested_task.title}
                          </span>
                          <span className="text-[10px] ml-2" style={{ color: 'var(--muted)' }}>
                            (Assignee: {obl.suggested_task.owner_role} • Due: {obl.suggested_task.due_date})
                          </span>
                        </div>
                      </div>

                      <span 
                        className="text-[10px] font-bold px-2 py-0.5 rounded ml-2 shrink-0"
                        style={{
                          backgroundColor: obl.approval_status === 'Approved' ? 'var(--success-subtle)' :
                                          obl.approval_status === 'Rejected' ? 'var(--danger-subtle)' : 'var(--warning-subtle)',
                          color: obl.approval_status === 'Approved' ? 'var(--success)' :
                                 obl.approval_status === 'Rejected' ? 'var(--danger)' : 'var(--warning)',
                        }}
                      >
                        {obl.approval_status}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
