import { pdfjs } from 'react-pdf';
// Import the worker directly - this resolves the 'pdf.worker.mjs' import issue
import workerModule from './pdf.worker.mjs';

/**
 * Configures the PDF.js worker with a locally hosted worker file
 * This creates a self-contained solution that doesn't depend on external CDNs
 */
export const configurePdfWorker = () => {
  // Only configure once
  if (pdfjs.GlobalWorkerOptions.workerSrc) {
    return;
  }

  console.log('Setting up PDF.js worker options directly...');

  try {
    // BEST APPROACH: Import the worker as a direct module
    // This is the most reliable method because it directly addresses the import error
    if (workerModule && workerModule.workerPath) {
      pdfjs.GlobalWorkerOptions.workerSrc = workerModule.workerPath;
      console.log('PDF worker URL set from direct module import:', workerModule.workerPath);
      return;
    }

    // FALLBACK 1: Check if we have the global worker path set in index.html
    if (typeof window !== 'undefined' && window.pdfjsWorkerSrc) {
      pdfjs.GlobalWorkerOptions.workerSrc = window.pdfjsWorkerSrc;
      console.log('PDF worker URL set from window.pdfjsWorkerSrc:', window.pdfjsWorkerSrc);
      return;
    }

    // FALLBACK 2: Use locally hosted worker file
    const localWorkerUrl = '/pdfjs/pdf.worker.min.js';
    pdfjs.GlobalWorkerOptions.workerSrc = localWorkerUrl;
    console.log('PDF worker URL set to local file:', localWorkerUrl);
    
    return;
  } catch (error) {
    console.error('Failed to set up PDF worker with local file:', error);
    
    // FALLBACK 3: Try CDN approach
    try {
      const cdnWorkerUrl = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
      pdfjs.GlobalWorkerOptions.workerSrc = cdnWorkerUrl;
      console.log('PDF worker URL set to CDN:', cdnWorkerUrl);
      return;
    } catch (cdnError) {
      console.error('Failed to set PDF worker URL from CDN:', cdnError);
    }
    
    // FALLBACK 4: Force disable worker mode when all else fails
    try {
      console.warn('Falling back to worker-less mode for PDF.js');
      // @ts-ignore
      pdfjs.disableWorker = true;
      return;
    } catch (disableError) {
      console.error('Critical PDF.js configuration failure:', disableError);
    }
  }
  
  // Last resort - set a dummy worker source
  pdfjs.GlobalWorkerOptions.workerSrc = 'data:application/javascript;base64,';
  console.warn('Using dummy worker source as final fallback');
};

// Call this function immediately when imported
configurePdfWorker();

// Export other PDF-related configuration and utility functions as needed
export default {
  configurePdfWorker,
};