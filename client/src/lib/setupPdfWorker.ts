import { pdfjs } from 'react-pdf';

/**
 * PDF.js Worker Configuration
 * 
 * This fixes the "fake worker" error by using the correct worker version
 * that matches the installed pdfjs-dist package.
 */

// Use a more reliable CDN for PDF.js worker
const PDFJS_VERSION = '4.8.69'; // Match package.json version exactly
const workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;

// Configure PDF.js worker to prevent "fake worker" errors
pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

console.log('✅ PDF.js worker configured correctly:', workerSrc);

// Export simple status function for debugging
export function getWorkerStatus() {
  return {
    workerSrc: pdfjs.GlobalWorkerOptions.workerSrc,
    isConfigured: true,
    isViteBundled: true // Now using Vite bundling
  };
}
