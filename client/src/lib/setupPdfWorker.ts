import { pdfjs } from 'react-pdf';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';

/**
 * PDF.js Worker Configuration
 * 
 * This fixes the "fake worker" error by using Vite's bundled worker.
 * This approach eliminates CORS issues and ensures version consistency.
 */

const PDFJS_VERSION = '4.8.69';

try {
  // Use Vite's URL import to bundle the worker with the application
  pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;
  console.log(`✅ PDF.js worker configured with bundled worker (version ${PDFJS_VERSION})`);
  console.log('🔍 PDF.js worker configuration succeeded');
} catch (error) {
  console.error('❌ Failed to configure PDF.js worker:', error);
  throw new Error(`PDF.js worker configuration failed: ${error.message}`);
}

// Export simple status function for debugging
export function getWorkerStatus() {
  return {
    workerSrc: pdfjs.GlobalWorkerOptions.workerSrc,
    version: PDFJS_VERSION,
    isConfigured: true,
    usingBundledWorker: true
  };
}
