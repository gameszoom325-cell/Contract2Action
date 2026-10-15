import * as mammoth from 'mammoth';
import JSZip from 'jszip';
import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';

// Configure pdfjs worker for browser environment
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
}

export interface ParsedDocumentResult {
  fullText: string;
  documentType: 'pdf' | 'docx' | 'pptx' | 'txt' | 'image';
  documentHtml?: string;
  pdfDataUrl?: string;
  imageDataUrl?: string;
  slides?: Array<{ slideNumber: number; text: string }>;
  pageCount?: number;
  isScanned?: boolean;
  ocrPerformed?: boolean;
}

export interface ParseOptions {
  onProgress?: (progressPct: number, statusMessage: string) => void;
  forceOcr?: boolean;
}

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB

/**
 * Detects if extracted text contains excessive corrupt/replacement characters or binary garbage
 */
export function isTextGarbled(text: string): boolean {
  if (!text || text.length === 0) return false;

  // Check for common binary signatures at start
  if (text.startsWith('%PDF-') || text.startsWith('PK\x03\x04') || text.includes('\x00\x00\x00')) {
    return true;
  }

  // Count replacement characters and non-printable control characters
  let replacementCount = 0;
  let nonPrintableCount = 0;
  const sampleLength = Math.min(text.length, 5000);

  for (let i = 0; i < sampleLength; i++) {
    const code = text.charCodeAt(i);
    if (code === 0xfffd) {
      replacementCount++;
    } else if ((code < 32 && code !== 9 && code !== 10 && code !== 13) || (code >= 127 && code <= 159)) {
      nonPrintableCount++;
    }
  }

  const badRatio = (replacementCount + nonPrintableCount) / sampleLength;
  return badRatio > 0.05 || replacementCount > 5;
}

/**
 * Parses any supported document type cleanly and extracts structured text and viewer assets.
 */
export async function parseContractFile(
  file: File,
  options?: ParseOptions
): Promise<ParsedDocumentResult> {
  const onProgress = options?.onProgress || (() => {});

  if (!file) {
    throw new Error('No file provided.');
  }

  if (file.size === 0) {
    throw new Error('The uploaded file is empty (0 bytes). Please upload a valid contract document.');
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the 15 MB limit. Please compress or upload a smaller file.`);
  }

  const fileName = file.name.toLowerCase();
  const fileExt = fileName.split('.').pop() || '';

  // 1. Legacy formats rejection
  if (fileExt === 'doc' || fileExt === 'ppt') {
    throw new Error(`Legacy .${fileExt} format detected. Please save the file as modern .${fileExt}x or export as PDF before uploading.`);
  }

  // 2. Plain Text / Markdown
  if (fileExt === 'txt' || fileExt === 'md' || file.type === 'text/plain') {
    onProgress(30, 'Reading UTF-8 text file...');
    const text = await file.text();
    if (isTextGarbled(text)) {
      throw new Error('This file contains garbled or unreadable characters. Please verify the encoding.');
    }
    onProgress(100, 'Text file loaded.');
    return {
      fullText: text,
      documentType: 'txt',
      documentHtml: `<pre class="whitespace-pre-wrap font-mono p-4 text-xs">${escapeHtml(text)}</pre>`,
      pageCount: Math.max(1, Math.ceil(text.length / 2000)),
    };
  }

  // 3. DOCX (Word Document) via Mammoth.js
  if (fileExt === 'docx' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    onProgress(20, 'Reading Word document...');
    try {
      const arrayBuffer = await file.arrayBuffer();
      onProgress(50, 'Converting DOCX structure & extracting formatted HTML...');
      
      const [htmlResult, textResult] = await Promise.all([
        mammoth.convertToHtml({ arrayBuffer }),
        mammoth.extractRawText({ arrayBuffer }),
      ]);

      const plainText = textResult.value || '';
      const formattedHtml = htmlResult.value || `<p>${escapeHtml(plainText)}</p>`;

      if (!plainText.trim() && !formattedHtml.trim()) {
        throw new Error('Word document contains no extractable text. It may contain only images.');
      }

      if (isTextGarbled(plainText)) {
        throw new Error('This Word document could not be read as text. It may be corrupt or encrypted.');
      }

      onProgress(100, 'Word document parsed.');
      return {
        fullText: plainText,
        documentType: 'docx',
        documentHtml: `<div class="docx-rendered-content space-y-3 prose max-w-none text-xs leading-relaxed">${formattedHtml}</div>`,
        pageCount: Math.max(1, Math.ceil(plainText.length / 2000)),
      };
    } catch (err: any) {
      if (err.message?.includes('password') || err.message?.includes('encrypted')) {
        throw new Error('This Word document is password-protected. Please remove the password and re-upload.');
      }
      throw new Error(`Could not parse Word document: ${err.message || 'Corrupt or unsupported DOCX structure'}`);
    }
  }

  // 4. PPTX (PowerPoint) via JSZip
  if (fileExt === 'pptx' || file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
    onProgress(20, 'Unzipping PowerPoint presentation...');
    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      const slideFiles: string[] = [];

      zip.forEach((relativePath) => {
        if (relativePath.match(/^ppt\/slides\/slide\d+\.xml$/i)) {
          slideFiles.push(relativePath);
        }
      });

      // Sort slides by number
      slideFiles.sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, ''), 10);
        const numB = parseInt(b.replace(/\D/g, ''), 10);
        return numA - numB;
      });

      if (slideFiles.length === 0) {
        throw new Error('No slides found in PowerPoint presentation.');
      }

      onProgress(50, `Extracting text from ${slideFiles.length} slides...`);
      const extractedSlides: Array<{ slideNumber: number; text: string }> = [];
      const textParts: string[] = [];

      for (let i = 0; i < slideFiles.length; i++) {
        const slideXml = await zip.file(slideFiles[i])?.async('text');
        if (slideXml) {
          // Extract text inside <a:t> tags
          const textMatches = slideXml.match(/<a:t[^>]*>([^<]+)<\/a:t>/gi) || [];
          const slideText = textMatches
            .map(m => m.replace(/<[^>]+>/g, '').trim())
            .filter(Boolean)
            .join(' ');

          const slideNum = i + 1;
          extractedSlides.push({ slideNumber: slideNum, text: slideText });
          textParts.push(`[Slide ${slideNum}]\n${slideText}`);
        }
      }

      const fullText = textParts.join('\n\n');
      onProgress(100, 'PowerPoint presentation parsed.');

      return {
        fullText,
        documentType: 'pptx',
        slides: extractedSlides,
        pageCount: extractedSlides.length,
      };
    } catch (err: any) {
      throw new Error(`Could not read PowerPoint presentation: ${err.message || 'Invalid or corrupt PPTX file'}`);
    }
  }

  // 5. PDF Documents via pdfjs-dist with Scanned OCR fallback
  if (fileExt === 'pdf' || file.type === 'application/pdf') {
    onProgress(20, 'Loading PDF document...');
    const arrayBuffer = await file.arrayBuffer();
    const pdfDataUrl = URL.createObjectURL(new Blob([arrayBuffer], { type: 'application/pdf' }));

    try {
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer),
        useSystemFonts: true,
      });

      const pdfDoc = await loadingTask.promise;
      const numPages = pdfDoc.numPages;
      onProgress(40, `Extracting text across ${numPages} page(s)...`);

      const pageTexts: string[] = [];
      let totalExtractedLength = 0;

      for (let i = 1; i <= numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        const pageString = textContent.items
          .map((item: any) => item.str || '')
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();

        totalExtractedLength += pageString.length;
        pageTexts.push(`[Page ${i}]\n${pageString}`);
      }

      const rawPdfText = pageTexts.join('\n\n');

      // Check if PDF is a scanned document with little/no text (< 50 chars across entire PDF)
      if (totalExtractedLength < 50 || options?.forceOcr) {
        onProgress(60, 'Scanned PDF detected (no digital text layer). Initializing Tesseract OCR engine...');
        
        // Render first few pages to canvas and perform OCR
        const ocrResult = await performPdfCanvasOcr(pdfDoc, onProgress);
        return {
          fullText: ocrResult,
          documentType: 'pdf',
          pdfDataUrl,
          pageCount: numPages,
          isScanned: true,
          ocrPerformed: true,
        };
      }

      onProgress(100, `PDF text successfully extracted (${numPages} pages).`);
      return {
        fullText: rawPdfText,
        documentType: 'pdf',
        pdfDataUrl,
        pageCount: numPages,
        isScanned: false,
      };

    } catch (err: any) {
      if (err.name === 'PasswordException') {
        throw new Error('This PDF is password-protected. Please provide an unencrypted PDF.');
      }
      throw new Error(`Failed to read PDF: ${err.message || 'Corrupt or unreadable PDF document'}`);
    }
  }

  // 6. Scanned Images (.png, .jpg, .jpeg, .webp) via Tesseract.js
  if (['png', 'jpg', 'jpeg', 'webp', 'bmp', 'tiff'].includes(fileExt) || file.type.startsWith('image/')) {
    onProgress(10, 'Initializing OCR worker for contract image...');
    const imageDataUrl = URL.createObjectURL(file);

    try {
      const worker = await createWorker('eng');
      onProgress(30, 'Performing Optical Character Recognition (OCR)...');
      
      const ret = await worker.recognize(file);
      await worker.terminate();

      const ocrText = ret.data.text.trim();
      if (!ocrText) {
        throw new Error('No legible text could be recognized in this image.');
      }

      onProgress(100, 'Image OCR complete.');
      return {
        fullText: ocrText,
        documentType: 'image',
        imageDataUrl,
        pageCount: 1,
        isScanned: true,
        ocrPerformed: true,
      };
    } catch (err: any) {
      throw new Error(`Image OCR failed: ${err.message || 'Could not process image'}`);
    }
  }

  // 7. Unsupported File Type
  throw new Error(`Unsupported file type ".${fileExt}". Contract2Action AI supports PDF, Word (.docx), PowerPoint (.pptx), text (.txt/.md), and scanned contract images (.png, .jpg).`);
}

/**
 * Runs OCR on canvas renders of scanned PDF pages (up to 5 pages for rapid in-browser OCR)
 */
async function performPdfCanvasOcr(
  pdfDoc: any, 
  onProgress: (pct: number, status: string) => void
): Promise<string> {
  const maxPagesToOcr = Math.min(pdfDoc.numPages, 5);
  const worker = await createWorker('eng');
  const ocrPages: string[] = [];

  for (let pageNum = 1; pageNum <= maxPagesToOcr; pageNum++) {
    onProgress(60 + Math.round((pageNum / maxPagesToOcr) * 35), `OCR processing page ${pageNum} of ${maxPagesToOcr}...`);
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.5 });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      await page.render({ canvasContext: ctx, viewport }).promise;
      const { data } = await worker.recognize(canvas);
      ocrPages.push(`[Page ${pageNum} - Scanned OCR]\n${data.text.trim()}`);
    }
  }

  await worker.terminate();
  return ocrPages.join('\n\n');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
