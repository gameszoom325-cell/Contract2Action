import React, { useState } from 'react';
import { 
  BookOpen, 
  Code, 
  Copy, 
  Check, 
  ShieldCheck, 
  Sparkles, 
  Layers, 
  GitFork, 
  CheckCircle2, 
  ExternalLink 
} from 'lucide-react';
import { CONTRACT_EXTRACTION_SYSTEM_PROMPT, PRD_DOCUMENTATION } from '../data/promptEngineeringDoc.ts';
import { useApp } from '../context/AppContext.tsx';

export const PRDDocView: React.FC = () => {
  const { showToast } = useApp();
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(CONTRACT_EXTRACTION_SYSTEM_PROMPT);
    setCopiedPrompt(true);
    showToast('Copied System Prompt to clipboard.', 'success');
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Hero Header */}
      <div 
        className="p-8 rounded-3xl border shadow-xs space-y-4 text-center relative overflow-hidden"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div 
          className="inline-flex items-center space-x-2 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border mx-auto"
          style={{ backgroundColor: 'var(--accent-subtle)', color: 'var(--accent)', borderColor: 'var(--border)' }}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{PRD_DOCUMENTATION.origin}</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black tracking-tight" style={{ color: 'var(--text)' }}>
          {PRD_DOCUMENTATION.title}
        </h1>

        <div className="text-base sm:text-lg font-bold" style={{ color: 'var(--accent)' }}>
          "{PRD_DOCUMENTATION.motto}"
        </div>

        <p className="max-w-2xl mx-auto text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Enterprise architectural blueprint and prompt design specifications submitted for the Genie X Hub Hackathon.
        </p>
      </div>

      {/* Core Philosophy Section */}
      <div 
        className="p-6 sm:p-8 rounded-2xl border shadow-xs space-y-4"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center space-x-2">
          <Layers className="w-5 h-5" style={{ color: 'var(--accent)' }} />
          <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>
            1. Core Architectural Philosophy
          </h2>
        </div>

        <div className="p-4 rounded-xl border text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans" style={{ backgroundColor: 'var(--surface-raised)', borderColor: 'var(--border)', color: 'var(--text)' }}>
          {PRD_DOCUMENTATION.philosophy.trim()}
        </div>

        {/* 3 Pillars Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl border space-y-1.5" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
            <span className="text-[10px] uppercase font-bold text-accent">Pillar 1: Extract</span>
            <h3 className="font-bold text-xs" style={{ color: 'var(--text)' }}>AI-Grounded Extraction</h3>
            <p className="text-[11px]" style={{ color: 'var(--muted)' }}>
              LLM never executes or invents. It reads contract chunks and produces structured JSON strictly linked to verbatim quotes.
            </p>
          </div>

          <div className="p-4 rounded-xl border space-y-1.5" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
            <span className="text-[10px] uppercase font-bold text-warning">Pillar 2: Guard</span>
            <h3 className="font-bold text-xs" style={{ color: 'var(--text)' }}>Human-in-the-Loop Review</h3>
            <p className="text-[11px]" style={{ color: 'var(--muted)' }}>
              Mandatory human review gateways. High-risk items require written justifications and cannot be bulk-approved.
            </p>
          </div>

          <div className="p-4 rounded-xl border space-y-1.5" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
            <span className="text-[10px] uppercase font-bold text-success">Pillar 3: Control</span>
            <h3 className="font-bold text-xs" style={{ color: 'var(--text)' }}>Deterministic Rules Engine</h3>
            <p className="text-[11px]" style={{ color: 'var(--muted)' }}>
              Precondition workflows (Delivery &rarr; Inspection &rarr; Payment) enforced by pure deterministic state logic.
            </p>
          </div>
        </div>
      </div>

      {/* Workflow Phases */}
      <div 
        className="p-6 sm:p-8 rounded-2xl border shadow-xs space-y-4"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center space-x-2">
          <GitFork className="w-5 h-5" style={{ color: 'var(--accent)' }} />
          <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>
            2. End-to-End Workflow Pipeline
          </h2>
        </div>

        <div className="space-y-3">
          {PRD_DOCUMENTATION.workflowPhases.map((phase, idx) => (
            <div 
              key={phase.phase} 
              className="p-4 rounded-xl border flex items-start space-x-3.5"
              style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
            >
              <div 
                className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5"
                style={{ backgroundColor: 'var(--accent-subtle)', color: 'var(--accent)' }}
              >
                {idx + 1}
              </div>
              <div className="space-y-1">
                <h3 className="text-xs font-bold" style={{ color: 'var(--text)' }}>
                  {phase.phase}
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {phase.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Production System Prompt Specification */}
      <div 
        className="p-6 sm:p-8 rounded-2xl border shadow-xs space-y-4"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Code className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>
              3. Production Prompt Engineering Design
            </h2>
          </div>

          <button
            onClick={handleCopyPrompt}
            className="px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs"
            style={{ backgroundColor: 'var(--surface-raised)', borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            {copiedPrompt ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedPrompt ? 'Copied' : 'Copy Prompt'}</span>
          </button>
        </div>

        <p className="text-xs" style={{ color: 'var(--muted)' }}>
          This prompt is sent to Google Gemini 2.5 Flash / Gemini 2.0. Notice the zero-tolerance hallucination rules, grounded quote requirement, and structured schema definitions.
        </p>

        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          <pre 
            className="p-4 overflow-x-auto text-[11px] font-mono leading-relaxed max-h-96"
            style={{ backgroundColor: 'var(--background)', color: 'var(--text)' }}
          >
            {CONTRACT_EXTRACTION_SYSTEM_PROMPT}
          </pre>
        </div>
      </div>
    </div>
  );
};
