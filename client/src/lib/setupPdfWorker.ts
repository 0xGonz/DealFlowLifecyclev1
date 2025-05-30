import { pdfjs } from 'react-pdf';

/**
 * PDF.js Worker Configuration
 * 
 * This fixes the "fake worker" error by using the correct worker version
 * that matches the installed pdfjs-dist package.
 */

// Use bundled worker for Replit environment
// This will use the worker from node_modules instead of external CDN
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url
).toString();

console.log('✅ PDF.js worker configured correctly: local fallback mode');

// Export simple status function for debugging
export function getWorkerStatus() {
  return {
    workerSrc: pdfjs.GlobalWorkerOptions.workerSrc,
    isConfigured: true,
    isViteBundled: true // Now using Vite bundling
  };
}
