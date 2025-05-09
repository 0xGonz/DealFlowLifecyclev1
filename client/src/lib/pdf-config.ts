import { pdfjs } from 'react-pdf';

/**
 * Configures PDF.js worker for optimal compatibility across different environments.
 * This uses a multi-stage fallback approach to ensure PDFs can be displayed.
 */
export const configurePdfWorker = () => {
  // Check if already configured
  if (pdfjs.GlobalWorkerOptions.workerSrc && pdfjs.GlobalWorkerOptions.workerSrc !== '') {
    console.log('PDF.js worker already configured:', pdfjs.GlobalWorkerOptions.workerSrc);
    return;
  }
  
  console.log('Setting up PDF.js worker options in most compatible mode...');
  
  try {
    // APPROACH 1: Use the worker that was preloaded in HTML
    if (window.pdfjsWorkerSrc) {
      pdfjs.GlobalWorkerOptions.workerSrc = window.pdfjsWorkerSrc;
      console.log('PDF.js worker set to preloaded source:', window.pdfjsWorkerSrc);
      return;
    }
    
    // APPROACH 2: Use a CDN source for the worker
    const cdnWorkerUrl = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
    pdfjs.GlobalWorkerOptions.workerSrc = cdnWorkerUrl;
    console.log('PDF.js worker set to CDN source:', cdnWorkerUrl);
    
  } catch (error) {
    console.warn('Failed to set worker, using inline mode:', error);
    
    // APPROACH 3: Use inline worker as fallback
    try {
      // @ts-ignore - We know these properties exist even if TypeScript doesn't
      pdfjs.disableWorker = true;
      pdfjs.GlobalWorkerOptions.workerSrc = '';
      console.log('PDF.js worker disabled - using main thread for PDF operations');
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