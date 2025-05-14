import { pdfjs } from 'react-pdf';

// Configure PDF.js with appropriate worker
// Use a consistent URL pattern that works in both development and production
// Using an absolute path helps avoid issues with relative paths and CDN domains
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.js';

// Increased cmap URL timeout to handle potential network delays
pdfjs.GlobalWorkerOptions.workerPort = null; // Force main thread operation if worker fails

// Export function to allow manual worker reset if needed
export function resetPdfWorker() {
  // Re-applying the worker source can sometimes help recover from a bad state
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.js';
}

// This is primarily a side-effect module that configures pdfjs when imported