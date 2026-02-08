/**
 * PDF.js client utilities for loading and parsing PDFs
 * Dynamically loads PDF.js from CDN to avoid bundling large library
 */

export interface TextItem {
  str: string;
  transform?: number[];
  width?: number;
  height?: number;
}

export interface PDFPageProxy {
  getTextContent(): Promise<{ items: any[] }>;
  getViewport(params: { scale: number }): any;
  render(params: { canvasContext: CanvasRenderingContext2D; viewport: any }): { promise: Promise<void> };
}

export interface PDFDocumentProxy {
  numPages: number;
  getPage(pageNumber: number): Promise<PDFPageProxy>;
}

let pdfjsLib: any = null;

/**
 * Load PDF.js library from CDN
 */
async function loadPdfJs(): Promise<any> {
  if (pdfjsLib) return pdfjsLib;

  // Load from CDN
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  
  await new Promise((resolve, reject) => {
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });

  // @ts-ignore
  pdfjsLib = window.pdfjsLib;
  
  if (!pdfjsLib) {
    throw new Error('Failed to load PDF.js library');
  }

  // Set worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = 
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  return pdfjsLib;
}

/**
 * Load a PDF document from a File object
 */
export async function loadPdfFromFile(file: File): Promise<PDFDocumentProxy> {
  const lib = await loadPdfJs();
  
  const arrayBuffer = await file.arrayBuffer();
  const typedArray = new Uint8Array(arrayBuffer);
  
  const loadingTask = lib.getDocument({ data: typedArray });
  const pdf = await loadingTask.promise;
  
  return pdf;
}
