import React, { useState } from 'react';
import { 
  Upload, 
  FileText, 
  Sliders, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  FileUp, 
  ShieldCheck,
  Info
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { SAMPLE_CONTRACTS } from '../data/seedData.ts';
import { ContractDocument, ExtractedObligation } from '../types/contract.ts';
import { NavTab } from './Header.tsx';
import { ParsedDocumentResult } from '../utils/fileReader.ts';

interface ContractUploadProps {
  setActiveTab: (tab: NavTab) => void;
}

export const ContractUpload: React.FC<ContractUploadProps> = ({ setActiveTab }) => {
  const { 
    currentUser,
    addContract, 
    confidenceThreshold, 
    setConfidenceThreshold, 
    isMockLLM, 
    setIsMockLLM,
    showToast 
  } = useApp();

  const [activeInputTab, setActiveInputTab] = useState<'upload' | 'paste'>('upload');
  const [contractTitle, setContractTitle] = useState('');
  const [contractText, setContractText] = useState('');
  const [parsedDoc, setParsedDoc] = useState<ParsedDocumentResult | null>(null);
  const [fileParsingState, setFileParsingState] = useState<{ isParsing: boolean; pct: number; message: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);

  const processingStages = [
    { title: 'Document Parsing & OCR', desc: 'Ingesting clean text & extracting structure via PDF.js/Mammoth/JSZip/Tesseract' },
    { title: 'Clause Boundary Chunking', desc: 'Segmenting sections into context windows with page references' },
    { title: 'Grounded Extraction', desc: 'Verifying verbatim quotes & detecting real binding obligations' },
    { title: 'Rule-Based Validation', desc: 'Calculating risk ratings & enforcing human-in-the-loop gates' },
  ];

  const handleSelectSample = (sample: ContractDocument) => {
    setContractTitle(sample.title);
    setContractText(sample.fullText);
    setParsedDoc({
      fullText: sample.fullText,
      documentType: sample.documentType || 'txt',
      documentHtml: sample.documentHtml,
      pdfDataUrl: sample.pdfDataUrl,
      pageCount: sample.pageCount || 2,
    });
    showToast(`Loaded sample contract: "${sample.title}"`, 'info');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const baseName = file.name.replace(/\.[^/.]+$/, '');
    setContractTitle(baseName);
    setFileParsingState({ isParsing: true, pct: 10, message: `Reading ${file.name}...` });

    try {
      const { parseContractFile } = await import('../utils/fileReader.ts');
      const result = await parseContractFile(file, {
        onProgress: (pct, message) => {
          setFileParsingState({ isParsing: true, pct, message });
        },
      });

      setContractText(result.fullText);
      setParsedDoc(result);
      setFileParsingState(null);

      showToast(
        `Successfully parsed ${file.name} (${result.documentType.toUpperCase()}${result.pageCount ? ` • ${result.pageCount} pages/slides` : ''}${result.ocrPerformed ? ' • OCR processed' : ''})`, 
        'success'
      );
    } catch (err: any) {
      setFileParsingState(null);
      showToast(err.message || 'Failed to read file format.', 'danger');
    }
  };

  const handleRunAnalysis = async () => {
    if (!contractText || contractText.trim().length < 30) {
      showToast('Please upload a contract or paste contract text (minimum 30 characters).', 'warning');
      return;
    }

    setIsProcessing(true);
    setProcessingStep(0);

    const stepInterval = setInterval(() => {
      setProcessingStep(prev => (prev < 3 ? prev + 1 : prev));
    }, 600);

    try {
      // Call backend /api/contracts/analyze
      const response = await fetch('/api/contracts/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractText,
          contractTitle: contractTitle || 'Uploaded Contract',
          threshold: confidenceThreshold,
        }),
      });

      const data = await response.json();
      clearInterval(stepInterval);
      setProcessingStep(3);

      const contractId = `contract_${Date.now()}`;
      const meta = data.metadata || {};

      const newContract: ContractDocument = {
        id: contractId,
        title: contractTitle || 'Uploaded Contract',
        fileName: `${(contractTitle || 'Contract').replace(/\s+/g, '_')}.${parsedDoc?.documentType || 'txt'}`,
        fileSize: `${Math.round(contractText.length / 1024) || 1} KB`,
        uploadDate: new Date().toISOString().split('T')[0],
        uploadedBy: currentUser?.name || 'Current User',
        category: meta.category || (contractTitle?.toLowerCase().includes('lab') ? 'Laboratory & Chemistry Services' : 'Commercial Agreement'),
        parties: Array.isArray(meta.parties) && meta.parties.length > 0 ? meta.parties : ['Not found in document'],
        effectiveDate: meta.effective_date || meta.effectiveDate || 'Not found in document',
        expiryDate: meta.expiry_date || meta.expiryDate || 'Not found in document',
        totalValue: meta.total_value || meta.totalValue,
        fullText: contractText,
        status: 'Ready for Review',
        obligationsCount: data.obligations?.length || 0,
        approvedCount: 0,
        highRiskCount: data.obligations?.filter((o: any) => o.risk_level === 'High').length || 0,
        confidenceAvg: data.obligations?.length 
          ? parseFloat((data.obligations.reduce((acc: number, curr: any) => acc + (curr.confidence || 0.8), 0) / data.obligations.length).toFixed(2))
          : 0.85,
        documentType: parsedDoc?.documentType || 'txt',
        documentHtml: parsedDoc?.documentHtml,
        pdfDataUrl: parsedDoc?.pdfDataUrl,
        imageDataUrl: parsedDoc?.imageDataUrl,
        slides: parsedDoc?.slides,
        pageCount: parsedDoc?.pageCount || Math.max(1, Math.ceil(contractText.length / 2000)),
        isScanned: parsedDoc?.isScanned,
        ocrPerformed: parsedDoc?.ocrPerformed,
      };

      // Map generated obligations with contract_id
      const formattedObligations: ExtractedObligation[] = (data.obligations || []).map((o: any, idx: number) => ({
        ...o,
        id: o.id || `obl_${contractId}_${idx + 1}`,
        contract_id: contractId,
        approval_status: 'Pending',
      }));

      setTimeout(() => {
        setIsProcessing(false);
        addContract(newContract, formattedObligations);
        if (formattedObligations.length === 0) {
          showToast(data.message || 'No clear binding obligations detected in this text.', 'warning');
        }
        setActiveTab('analysis');
      }, 400);

    } catch (err: any) {
      clearInterval(stepInterval);
      setIsProcessing(false);
      showToast('Error during extraction: ' + err.message, 'danger');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text)' }}>
            Contract Ingestion & Analysis
          </h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Upload legal agreements (PDF, DOCX, PPTX, TXT) or paste clauses for grounded obligation extraction.
          </p>
        </div>

        {/* Preset Sample Contracts Selector */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>
            Demo Presets:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {SAMPLE_CONTRACTS.map((sample, idx) => (
              <button
                key={sample.id}
                onClick={() => handleSelectSample(sample)}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer shadow-xs hover:border-accent"
                style={{
                  backgroundColor: 'var(--surface-raised)',
                  color: 'var(--text)',
                  borderColor: 'var(--border)'
                }}
              >
                Sample {idx + 1}: {sample.category.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Form & Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Ingestion Surface */}
        <div 
          className="lg:col-span-2 p-6 rounded-2xl border shadow-xs space-y-5"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          {/* Tabs: Upload File vs Paste Text */}
          <div className="flex border-b" style={{ borderColor: 'var(--border)' }}>
            <button
              onClick={() => setActiveInputTab('upload')}
              className="pb-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center space-x-2"
              style={{
                borderColor: activeInputTab === 'upload' ? 'var(--accent)' : 'transparent',
                color: activeInputTab === 'upload' ? 'var(--accent)' : 'var(--text-secondary)',
              }}
            >
              <FileUp className="w-4 h-4" />
              <span>Upload Document</span>
            </button>
            <button
              onClick={() => setActiveInputTab('paste')}
              className="pb-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center space-x-2"
              style={{
                borderColor: activeInputTab === 'paste' ? 'var(--accent)' : 'transparent',
                color: activeInputTab === 'paste' ? 'var(--accent)' : 'var(--text-secondary)',
              }}
            >
              <FileText className="w-4 h-4" />
              <span>Paste Text</span>
            </button>
          </div>

          {/* Contract Title Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold" style={{ color: 'var(--text)' }}>
              Contract Title / Reference
            </label>
            <input 
              type="text"
              value={contractTitle}
              onChange={(e) => setContractTitle(e.target.value)}
              placeholder="e.g. Master Services Agreement - Chem Dry Lab & BioTech Solutions"
              className="w-full px-3.5 py-2.5 rounded-xl border text-xs transition-colors focus:outline-none focus:ring-2"
              style={{
                backgroundColor: 'var(--background)',
                borderColor: 'var(--border)',
                color: 'var(--text)',
              }}
            />
          </div>

          {/* Upload Dropzone */}
          {activeInputTab === 'upload' ? (
            <div 
              className="border-2 border-dashed rounded-2xl p-8 text-center transition-colors cursor-pointer"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)' }}
              onClick={() => document.getElementById('contract-file-input')?.click()}
            >
              <input 
                id="contract-file-input"
                type="file" 
                accept=".txt,.md,.pdf,.docx,.pptx,.png,.jpg,.jpeg,.webp" 
                className="hidden" 
                onChange={handleFileUpload}
              />
              <div 
                className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center mb-3"
                style={{ backgroundColor: 'var(--accent-subtle)', color: 'var(--accent)' }}
              >
                <Upload className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold" style={{ color: 'var(--text)' }}>
                Drop contract files here, or <span style={{ color: 'var(--accent)' }}>browse files</span>
              </h3>
              <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                Word (.docx), PDF (.pdf), PowerPoint (.pptx), Text (.txt), or Scanned Images (up to 15 MB)
              </p>

              {/* Real-time file parsing progress */}
              {fileParsingState?.isParsing && (
                <div className="mt-4 p-3 rounded-xl border max-w-md mx-auto text-xs space-y-2 text-left" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--accent)' }}>
                  <div className="flex items-center justify-between font-bold" style={{ color: 'var(--accent)' }}>
                    <span>{fileParsingState.message}</span>
                    <span>{fileParsingState.pct}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--surface-raised)' }}>
                    <div 
                      className="h-full rounded-full transition-all"
                      style={{ width: `${fileParsingState.pct}%`, backgroundColor: 'var(--accent)' }}
                    />
                  </div>
                </div>
              )}

              {contractText && !fileParsingState?.isParsing && (
                <div 
                  className="mt-4 p-3 rounded-xl border text-xs inline-flex items-center space-x-2 text-left"
                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--success)' }}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: 'var(--success)' }} />
                  <div>
                    <span className="font-semibold block" style={{ color: 'var(--text)' }}>
                      Document loaded: {contractText.length.toLocaleString()} characters
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--muted)' }}>
                      Format: {parsedDoc?.documentType?.toUpperCase() || 'TEXT'} {parsedDoc?.pageCount ? `• ${parsedDoc.pageCount} page(s)/slide(s)` : ''} {parsedDoc?.ocrPerformed ? '• Optical Character Recognition (OCR) applied' : ''}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs font-bold" style={{ color: 'var(--text)' }}>
                Contract Text Content
              </label>
              <textarea
                value={contractText}
                onChange={(e) => setContractText(e.target.value)}
                rows={10}
                placeholder="Paste the legal contract or agreement clauses here..."
                className="w-full p-3.5 rounded-xl border text-xs font-mono transition-colors focus:outline-none focus:ring-2 resize-y"
                style={{
                  backgroundColor: 'var(--background)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)',
                }}
              />
              <div className="text-[11px] text-right" style={{ color: 'var(--muted)' }}>
                {contractText.length.toLocaleString()} characters
              </div>
            </div>
          )}

          {/* Action Button */}
          <div className="pt-2">
            <button
              onClick={handleRunAnalysis}
              disabled={isProcessing || !contractText}
              className="w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-sm disabled:opacity-50"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'var(--accent-foreground)',
              }}
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Analyzing Contract with Gemini AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Start Grounded Extraction & Rule Validation</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Col: AI Configuration & Human-in-the-Loop Controls */}
        <div className="space-y-5">
          {/* HITL Confidence Threshold Card */}
          <div 
            className="p-5 rounded-2xl border shadow-xs space-y-4"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center space-x-2">
              <Sliders className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <h3 className="text-sm font-bold" style={{ color: 'var(--text)' }}>
                Human Review Threshold
              </h3>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Obligations below this AI confidence score are automatically flagged as <strong style={{ color: 'var(--warning)' }}>Needs Review</strong> and require human auditor sign-off.
            </p>

            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>
                  Threshold Gate
                </span>
                <span className="text-xs font-bold font-mono px-2 py-0.5 rounded border" style={{ backgroundColor: 'var(--surface-raised)', borderColor: 'var(--border)', color: 'var(--accent)' }}>
                  {Math.round(confidenceThreshold * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="0.95"
                step="0.05"
                value={confidenceThreshold}
                onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px]" style={{ color: 'var(--muted)' }}>
                <span>50% (Permissive)</span>
                <span>70% (Standard)</span>
                <span>95% (Strict)</span>
              </div>
            </div>

            <div 
              className="p-3 rounded-xl border text-xs flex items-start space-x-2"
              style={{ backgroundColor: 'var(--surface-raised)', borderColor: 'var(--border)' }}
            >
              <Info className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--info)' }} />
              <div className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                Conflicting clauses and High-Risk clauses always route to human review regardless of confidence score.
              </div>
            </div>
          </div>

          {/* Demo Mode & Environment Switcher Card */}
          <div 
            className="p-5 rounded-2xl border shadow-xs space-y-3"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4" style={{ color: 'var(--success)' }} />
                <h3 className="text-sm font-bold" style={{ color: 'var(--text)' }}>
                  Offline Demo Mode
                </h3>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={isMockLLM} 
                  onChange={(e) => setIsMockLLM(e.target.checked)}
                  className="sr-only peer" 
                />
                <div 
                  className="w-9 h-5 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all"
                  style={{
                    backgroundColor: isMockLLM ? 'var(--accent)' : 'var(--surface-raised)'
                  }}
                />
              </label>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Enable to force deterministic local extraction for presentations and offline judging without API key dependencies.
            </p>
          </div>
        </div>
      </div>

      {/* Extraction Process Flow Modal / Overlay during Processing */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div 
            className="w-full max-w-lg rounded-2xl border p-6 shadow-2xl space-y-6 animate-in fade-in zoom-in-95"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <div className="text-center space-y-1.5">
              <div 
                className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center"
                style={{ backgroundColor: 'var(--accent-subtle)', color: 'var(--accent)' }}
              >
                <Sparkles className="w-6 h-6 animate-spin" />
              </div>
              <h3 className="text-lg font-black" style={{ color: 'var(--text)' }}>
                Contract2Action Extraction Pipeline
              </h3>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                Executing deterministic analysis and grounded quote verification
              </p>
            </div>

            <div className="space-y-3">
              {processingStages.map((stage, idx) => {
                const isDone = processingStep > idx;
                const isCurrent = processingStep === idx;
                return (
                  <div 
                    key={stage.title}
                    className="p-3 rounded-xl border flex items-center space-x-3 transition-colors"
                    style={{
                      backgroundColor: isCurrent ? 'var(--accent-subtle)' : isDone ? 'var(--surface-raised)' : 'transparent',
                      borderColor: isCurrent ? 'var(--accent)' : 'var(--border)',
                    }}
                  >
                    <div className="shrink-0">
                      {isDone ? (
                        <CheckCircle2 className="w-5 h-5" style={{ color: 'var(--success)' }} />
                      ) : isCurrent ? (
                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" style={{ color: 'var(--accent)' }} />
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-dashed flex items-center justify-center text-[10px]" style={{ borderColor: 'var(--muted)', color: 'var(--muted)' }}>
                          {idx + 1}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold" style={{ color: 'var(--text)' }}>
                        {stage.title}
                      </div>
                      <div className="text-[11px]" style={{ color: 'var(--muted)' }}>
                        {stage.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
