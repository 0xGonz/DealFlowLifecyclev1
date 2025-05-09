import { pdfjs } from 'react-pdf';

/**
 * Configures PDF.js worker for optimal compatibility across different environments.
 * Using a CDN approach for maximum reliability.
 */
export const configurePdfWorker = () => {
  // Check if already configured
  if (pdfjs.GlobalWorkerOptions.workerSrc && pdfjs.GlobalWorkerOptions.workerSrc !== '') {
    console.log('PDF.js worker already configured:', pdfjs.GlobalWorkerOptions.workerSrc);
    return;
  }
  
  console.log('Setting up PDF.js worker using CDN approach...');
  
  try {
    // APPROACH 1: Use the worker that was preloaded in HTML
    if (window.pdfjsWorkerSrc) {
      pdfjs.GlobalWorkerOptions.workerSrc = window.pdfjsWorkerSrc;
      console.log('PDF.js worker set to preloaded CDN source:', window.pdfjsWorkerSrc);
      
      // Extra check for specific worker loading modes
      if (window.__pdfjsWorkerPreloaded) {
        console.log('Using preloaded worker from CDN - should be most reliable');
      }
      return;
    }
    
    // APPROACH 2: Direct CDN with specific version
    // Using jsdelivr as primary and unpkg as backup
    const cdnWorkerUrl = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
    pdfjs.GlobalWorkerOptions.workerSrc = cdnWorkerUrl;
    console.log('PDF.js worker set to explicit CDN source:', cdnWorkerUrl);
    
  } catch (error) {
    console.warn('Failed to set worker, using baseline mode:', error);
    
    // APPROACH 3: Force worker-less operation as a last resort
    try {
      // @ts-ignore - These are internal properties that exist but aren't in the types
      pdfjs.disableWorker = true;
      pdfjs.GlobalWorkerOptions.workerSrc = '';
      console.log('PDF.js worker disabled - using main thread for PDF operations (fallback mode)');
    } catch (e) {
      console.error('Critical PDF.js configuration failure:', e);
    }
  }
};

// Call this function immediately when imported
configurePdfWorker();

// Export other PDF-related configuration and utility functions as needed
export default {
  configurePdfWorker,
};