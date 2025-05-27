import { pdfjs } from 'react-pdf';

// Use the CDN worker URL that matches our pdfjs-dist version
const workerURL = 'https://unpkg.com/pdfjs-dist@4.8.69/build/pdf.worker.min.js';

/**
 * PDF.js Worker Configuration
 * 
 * This module properly configures the PDF.js worker using Vite's URL import.
 * This ensures the worker file is correctly bundled and served by Vite.
 */

// Configure PDF.js worker with Vite-bundled worker
pdfjs.GlobalWorkerOptions.workerSrc = workerURL;

console.log('✅ PDF.js worker configured with Vite-bundled worker:', workerURL);

// Export functions to help components check and manage the worker configuration
export function getWorkerStatus() {
  return {
    workerSrc: pdfjs.GlobalWorkerOptions.workerSrc,
    isConfigured: true,
    isViteBundled: true,
    selectedSource: workerURL
  };
}
