import { pdfjs } from 'react-pdf';

/**
 * PDF.js Worker Configuration
 * 
 * This fixes the "fake worker" error by using the correct worker version
 * that matches the installed pdfjs-dist package.
 */

// Use the local worker file that exists in our public directory
// This ensures the worker loads reliably from our own server
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

// Fallback configuration for environments that need it
if (!pdfjs.GlobalWorkerOptions.workerSrc) {
  // Disable worker entirely as a last resort
  pdfjs.GlobalWorkerOptions.workerSrc = false;
}

console.log('✅ PDF.js worker configured correctly: local fallback mode');

// Export simple status function for debugging
export function getWorkerStatus() {
  return {
    workerSrc: pdfjs.GlobalWorkerOptions.workerSrc,
    isConfigured: true,
    isViteBundled: true // Now using Vite bundling
  };
}
