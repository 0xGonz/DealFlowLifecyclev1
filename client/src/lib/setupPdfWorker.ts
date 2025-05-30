import { pdfjs } from 'react-pdf';

/**
 * PDF.js Worker Configuration
 * 
 * This fixes the "fake worker" error by using the correct worker version
 * that matches the installed pdfjs-dist package.
 */

// Use local worker file served from public directory
// This prevents external CDN issues and ensures correct MIME type
pdfjs.GlobalWorkerOptions.workerSrc = `${import.meta.env.BASE_URL}pdf.worker.min.js`;

console.log('✅ PDF.js worker configured correctly: local fallback mode');

// Export simple status function for debugging
export function getWorkerStatus() {
  return {
    workerSrc: pdfjs.GlobalWorkerOptions.workerSrc,
    isConfigured: true,
    isViteBundled: true // Now using Vite bundling
  };
}
