import { pdfjs } from 'react-pdf';

/**
 * PDF.js Worker Configuration
 * 
 * This module sets up the PDF.js worker configuration for reliable PDF viewing.
 * Uses a CDN approach that works reliably in the current environment.
 */

// Use the CDN version that matches the installed pdfjs-dist version
const PDFJS_VERSION = '4.8.69'; // Match the version in package.json
const workerSrc = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.js`;

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

console.log('PDF.js worker configured with CDN worker:', workerSrc);

// Export simple status function for debugging
export function getWorkerStatus() {
  return {
    workerSrc: pdfjs.GlobalWorkerOptions.workerSrc,
    isConfigured: true,
    isViteBundled: true // Now using Vite bundling
  };
}
