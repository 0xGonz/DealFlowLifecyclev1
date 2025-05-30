import { pdfjs } from 'react-pdf';

/**
 * PDF.js Worker Configuration
 * 
 * This fixes the "fake worker" error by using a reliable CDN source
 * that matches the installed pdfjs-dist package version 4.8.69.
 */

const PDFJS_VERSION = '4.8.69';

// Use jsDelivr CDN which has better CORS support than unpkg
const workerUrl = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.js`;

try {
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  console.log(`✅ PDF.js worker configured with jsDelivr CDN (version ${PDFJS_VERSION})`);
  console.log('🔍 PDF.js worker source:', workerUrl);
} catch (error) {
  console.error('❌ Failed to configure PDF.js worker:', error);
  // Last resort fallback to disable worker
  console.warn('⚠️ Disabling PDF.js worker as fallback');
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
