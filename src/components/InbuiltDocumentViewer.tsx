import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  BookOpen, 
  Eye, 
  Layers, 
  Image, 
  Maximize2,
  FileCheck2,
  CheckCircle,
  AlertCircle,
  Search
} from 'lucide-react';
import { ContractDocument } from '../types/contract.ts';
import { QuoteMatchResult } from '../utils/contractParser.ts';

interface InbuiltDocumentViewerProps {
  contract: ContractDocument;
  highlightResult: QuoteMatchResult | null;
  onClearHighlight: () => void;
}

export const InbuiltDocumentViewer: React.FC<InbuiltDocumentViewerProps> = ({
  contract,
  highlightResult,
  onClearHighlight,
}) => {
  const [viewMode, setViewMode] = useState<'original' | 'extracted'>('original');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const highlightRef = useRef<HTMLSpanElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const docType = contract.documentType || 'txt';
  const totalPages = contract.pageCount || 1;
  const slides = contract.slides || [];

  // When highlight changes, switch page or slide if indicated
  useEffect(() => {
    if (highlightResult?.page && highlightResult.page > 0) {
      setCurrentPage(Math.min(highlightResult.page, totalPages));
      if (slides.length > 0) {
        setCurrentSlideIndex(Math.min(highlightResult.page - 1, slides.length - 1));
      }
    }

    // Auto-scroll to highlight
    setTimeout(() => {
      if (highlightRef.current) {
        highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  }, [highlightResult]);

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 20, 200));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 20, 60));
  const handleResetZoom = () => setZoomLevel(100);

  // Render text with highlight
  const renderTextContentWithHighlight = (content: string) => {
    if (!highlightResult?.matchText || !highlightResult.found) {
      return <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed">{content}</pre>;
    }

    const target = highlightResult.matchText;
    const parts = content.split(target);

    if (parts.length === 1) {
      // Try normalized split
      const lowerContent = content.toLowerCase();
      const lowerTarget = target.toLowerCase();
      const idx = lowerContent.indexOf(lowerTarget);

      if (idx !== -1) {
        const before = content.substring(0, idx);
        const match = content.substring(idx, idx + target.length);
        const after = content.substring(idx + target.length);

        return (
          <div className="font-mono text-xs leading-relaxed whitespace-pre-wrap">
            {before}
            <mark
              ref={highlightRef}
              className="px-1.5 py-0.5 rounded font-bold shadow-xs animate-pulse"
              style={{
                backgroundColor: highlightResult.isExact ? 'var(--accent-subtle)' : 'var(--warning-subtle)',
                color: highlightResult.isExact ? 'var(--accent)' : 'var(--warning)',
                border: `1.5px solid ${highlightResult.isExact ? 'var(--accent)' : 'var(--warning)'}`
              }}
            >
              {match}
            </mark>
            {after}
          </div>
        );
      }

      return <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed">{content}</pre>;
    }

    return (
      <div className="font-mono text-xs leading-relaxed whitespace-pre-wrap">
        {parts.map((part, index) => (
          <React.Fragment key={index}>
            {part}
            {index < parts.length - 1 && (
              <mark
                ref={index === 0 ? highlightRef : undefined}
                className="px-1.5 py-0.5 rounded font-bold shadow-xs transition-all"
                style={{
                  backgroundColor: highlightResult.isExact ? 'var(--accent-subtle)' : 'var(--warning-subtle)',
                  color: highlightResult.isExact ? 'var(--accent)' : 'var(--warning)',
                  border: `1.5px solid ${highlightResult.isExact ? 'var(--accent)' : 'var(--warning)'}`
                }}
              >
                {target}
              </mark>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div 
      className="flex flex-col h-[750px] rounded-2xl border shadow-xs overflow-hidden"
      style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      {/* Viewer Header / Toolbar */}
      <div 
        className="p-3 border-b flex flex-wrap items-center justify-between gap-2"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        {/* Left: Mode Switcher */}
        <div 
          className="inline-flex rounded-xl p-0.5 border text-xs"
          style={{ backgroundColor: 'var(--surface-raised)', borderColor: 'var(--border)' }}
        >
          <button
            onClick={() => setViewMode('original')}
            className="px-3 py-1 rounded-lg font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
            style={{
              backgroundColor: viewMode === 'original' ? 'var(--surface)' : 'transparent',
              color: viewMode === 'original' ? 'var(--accent)' : 'var(--text-secondary)',
              boxShadow: viewMode === 'original' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            }}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Original Document</span>
          </button>
          <button
            onClick={() => setViewMode('extracted')}
            className="px-3 py-1 rounded-lg font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
            style={{
              backgroundColor: viewMode === 'extracted' ? 'var(--surface)' : 'transparent',
              color: viewMode === 'extracted' ? 'var(--accent)' : 'var(--text-secondary)',
              boxShadow: viewMode === 'extracted' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            }}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Extracted Text</span>
          </button>
        </div>

        {/* Center: Page Navigation / Slide navigation */}
        {docType === 'pptx' && slides.length > 0 ? (
          <div className="flex items-center space-x-2 text-xs font-semibold">
            <button
              onClick={() => setCurrentSlideIndex(prev => Math.max(0, prev - 1))}
              disabled={currentSlideIndex === 0}
              className="p-1 rounded-md border disabled:opacity-40 cursor-pointer"
              style={{ backgroundColor: 'var(--surface-raised)', borderColor: 'var(--border)' }}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-xs">
              Slide {currentSlideIndex + 1} of {slides.length}
            </span>
            <button
              onClick={() => setCurrentSlideIndex(prev => Math.min(slides.length - 1, prev + 1))}
              disabled={currentSlideIndex === slides.length - 1}
              className="p-1 rounded-md border disabled:opacity-40 cursor-pointer"
              style={{ backgroundColor: 'var(--surface-raised)', borderColor: 'var(--border)' }}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : totalPages > 1 ? (
          <div className="flex items-center space-x-2 text-xs font-semibold">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage <= 1}
              className="p-1 rounded-md border disabled:opacity-40 cursor-pointer"
              style={{ backgroundColor: 'var(--surface-raised)', borderColor: 'var(--border)' }}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-xs">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage >= totalPages}
              className="p-1 rounded-md border disabled:opacity-40 cursor-pointer"
              style={{ backgroundColor: 'var(--surface-raised)', borderColor: 'var(--border)' }}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : null}

        {/* Right: Zoom controls & Format badge */}
        <div className="flex items-center space-x-1.5 text-xs">
          <span 
            className="text-[10px] font-bold uppercase px-2 py-0.5 rounded border"
            style={{ backgroundColor: 'var(--accent-subtle)', color: 'var(--accent)', borderColor: 'var(--border)' }}
          >
            {docType.toUpperCase()}
          </span>

          <button
            onClick={handleZoomOut}
            className="p-1 rounded-md border hover:bg-surface-raised cursor-pointer"
            style={{ borderColor: 'var(--border)' }}
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-[11px] w-9 text-center">{zoomLevel}%</span>
          <button
            onClick={handleZoomIn}
            className="p-1 rounded-md border hover:bg-surface-raised cursor-pointer"
            style={{ borderColor: 'var(--border)' }}
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleResetZoom}
            className="p-1 rounded-md border hover:bg-surface-raised cursor-pointer"
            style={{ borderColor: 'var(--border)' }}
            title="Reset Zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Highlight Notification Banner */}
      {highlightResult?.found && (
        <div 
          className="px-4 py-2 border-b text-xs flex items-center justify-between"
          style={{
            backgroundColor: highlightResult.isExact ? 'var(--accent-subtle)' : 'var(--warning-subtle)',
            borderColor: 'var(--border)',
            color: highlightResult.isExact ? 'var(--accent)' : 'var(--warning)',
          }}
        >
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>
              <strong>{highlightResult.isExact ? 'Exact Verbatim Match' : 'Fuzzy Grounded Match'}:</strong>{' '}
              {highlightResult.message || `Located on Page ${highlightResult.page || 1}`}
            </span>
          </div>
          <button
            onClick={onClearHighlight}
            className="underline font-semibold hover:opacity-80"
          >
            Clear
          </button>
        </div>
      )}

      {/* Viewer Canvas / Scroll Area */}
      <div 
        ref={containerRef}
        className="flex-1 p-5 overflow-auto relative"
        style={{ backgroundColor: 'var(--background)' }}
      >
        <div 
          className="transition-transform origin-top-left"
          style={{ transform: `scale(${zoomLevel / 100})`, width: `${(100 / zoomLevel) * 100}%` }}
        >
          {/* A. Extracted Raw Text View */}
          {viewMode === 'extracted' ? (
            <div className="p-4 rounded-xl border bg-surface space-y-4" style={{ borderColor: 'var(--border)' }}>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                Extracted Clean Text Stream ({contract.fullText.length.toLocaleString()} characters)
              </div>
              {renderTextContentWithHighlight(contract.fullText)}
            </div>
          ) : (
            /* B. Original Formatted Document View by File Type */
            <div>
              {/* 1. PDF Document */}
              {docType === 'pdf' && (
                <div className="space-y-4">
                  {contract.pdfDataUrl ? (
                    <div className="w-full rounded-xl overflow-hidden border shadow-sm bg-surface" style={{ borderColor: 'var(--border)' }}>
                      <iframe
                        src={`${contract.pdfDataUrl}#page=${currentPage}&toolbar=0&navpanes=0`}
                        title="PDF Document Viewer"
                        className="w-full h-[640px] border-none"
                      />
                    </div>
                  ) : (
                    <div className="p-6 rounded-xl border bg-surface space-y-3" style={{ borderColor: 'var(--border)' }}>
                      <div className="flex items-center space-x-2 text-xs font-bold text-accent">
                        <FileText className="w-4 h-4" />
                        <span>PDF Document Stream (Page {currentPage} of {totalPages})</span>
                      </div>
                      {renderTextContentWithHighlight(contract.fullText)}
                    </div>
                  )}
                </div>
              )}

              {/* 2. Word (.docx) Formatted HTML View */}
              {docType === 'docx' && (
                <div 
                  className="p-8 rounded-xl border bg-surface shadow-sm max-w-3xl mx-auto space-y-4"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <div className="border-b pb-3 flex items-center justify-between text-xs text-muted" style={{ borderColor: 'var(--border)' }}>
                    <span className="font-bold">Word Document (.docx) Formatted View</span>
                    <span>Mammoth.js Clean Render</span>
                  </div>
                  {contract.documentHtml ? (
                    <div 
                      className="docx-formatted-html text-xs leading-relaxed space-y-3"
                      dangerouslySetInnerHTML={{ __html: contract.documentHtml }}
                    />
                  ) : (
                    renderTextContentWithHighlight(contract.fullText)
                  )}
                </div>
              )}

              {/* 3. PowerPoint (.pptx) Slide-by-Slide View */}
              {docType === 'pptx' && (
                <div className="space-y-4 max-w-2xl mx-auto">
                  {slides.length > 0 ? (
                    <div 
                      className="p-8 rounded-2xl border bg-surface shadow-md aspect-video flex flex-col justify-between"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <div className="flex items-center justify-between text-xs text-muted border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                        <span className="font-bold uppercase tracking-wider text-accent">
                          Slide {slides[currentSlideIndex].slideNumber} of {slides.length}
                        </span>
                        <span className="text-[10px]">PowerPoint Presentation</span>
                      </div>

                      <div className="my-auto py-4 text-sm font-medium leading-relaxed whitespace-pre-wrap">
                        {renderTextContentWithHighlight(slides[currentSlideIndex].text || 'Empty Slide')}
                      </div>

                      <div className="flex justify-between items-center text-xs text-muted border-t pt-2" style={{ borderColor: 'var(--border)' }}>
                        <span>Use toolbar arrows to navigate slides</span>
                        <span>Contract2Action AI</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border bg-surface">
                      {renderTextContentWithHighlight(contract.fullText)}
                    </div>
                  )}
                </div>
              )}

              {/* 4. Scanned Contract Image View */}
              {docType === 'image' && (
                <div className="space-y-4 max-w-2xl mx-auto">
                  {contract.imageDataUrl && (
                    <div className="rounded-xl border overflow-hidden shadow-sm bg-surface p-2" style={{ borderColor: 'var(--border)' }}>
                      <img 
                        src={contract.imageDataUrl} 
                        alt="Scanned Contract" 
                        className="w-full object-contain max-h-[400px] rounded-lg"
                      />
                    </div>
                  )}
                  <div className="p-4 rounded-xl border bg-surface space-y-2" style={{ borderColor: 'var(--border)' }}>
                    <div className="text-xs font-bold text-accent flex items-center space-x-1.5">
                      <FileCheck2 className="w-4 h-4" />
                      <span>Optical Character Recognition (OCR) Extracted Text:</span>
                    </div>
                    {renderTextContentWithHighlight(contract.fullText)}
                  </div>
                </div>
              )}

              {/* 5. Plain Text (.txt / .md) View */}
              {docType === 'txt' && (
                <div className="p-6 rounded-xl border bg-surface shadow-sm space-y-3" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center justify-between text-xs text-muted border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                    <span className="font-bold">Contract Source View</span>
                    <span>Page {currentPage} of {totalPages}</span>
                  </div>
                  {renderTextContentWithHighlight(contract.fullText)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
