import { pdfjs } from 'react-pdf';

/**
 * PDF.js Worker Configuration
 * 
 * This fixes the "fake worker" error by using the correct worker version
 * that matches the installed pdfjs-dist package version 4.8.69.
 */

// Use CDN for the exact version that matches our pdfjs-dist package
const PDFJS_VERSION = '4.8.69';
const CDN_WORKER_URL = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.js`;

try {
  pdfjs.GlobalWorkerOptions.workerSrc = CDN_WORKER_URL;
  console.log(`✅ PDF.js worker configured with CDN: ${CDN_WORKER_URL}`);
} catch (error) {
  console.error('❌ Failed to configure PDF.js worker:', error);
  // Fallback: use a different CDN
  const fallbackUrl = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;
  pdfjs.GlobalWorkerOptions.workerSrc = fallbackUrl;
  console.warn(`⚠️ Using fallback CDN: ${fallbackUrl}`);
}

// Export simple status function for debugging
export function getWorkerStatus() {
  return {
    workerSrc: pdfjs.GlobalWorkerOptions.workerSrc,
    version: PDFJS_VERSION,
    isConfigured: true,
    usingCDN: true
  };
}
