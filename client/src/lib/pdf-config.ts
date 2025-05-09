import { pdfjs } from 'react-pdf';

/**
 * Force disables the worker and uses the main thread for PDF operations.
 * This approach is simpler and more reliable, though less performant.
 */
export const configurePdfWorker = () => {
  // Only configure once
  if (pdfjs.GlobalWorkerOptions.workerSrc) {
    return;
  }

  console.log('Setting up PDF.js worker options in most compatible mode...');

  // SIMPLEST APPROACH: Disable worker mode completely
  // This is the most compatible solution, though less performant
  try {
    // @ts-ignore - We know these properties exist
    pdfjs.disableWorker = true;
    console.log('PDF worker disabled - using main thread for PDF operations');
    return;
  } catch (error) {
    console.error('Failed to disable PDF worker:', error);
  }
  
  // FALLBACK: If we can't disable the worker, try to set a worker URL
  try {
    const localWorkerUrl = '/pdfjs/pdf.worker.min.js';
    pdfjs.GlobalWorkerOptions.workerSrc = localWorkerUrl;
    console.log('PDF worker URL set to local file:', localWorkerUrl);
    return;
  } catch (error) {
    console.error('Failed to set up PDF worker with local file:', error);
  }
  
  // Last resort - set a dummy worker source
  try {
    pdfjs.GlobalWorkerOptions.workerSrc = 'data:application/javascript;base64,';
    console.warn('Using dummy worker source as final fallback');
  } catch (error) {
    console.error('Critical PDF.js configuration failure:', error);
  }
};

// Call this function immediately when imported
configurePdfWorker();

// Export other PDF-related configuration and utility functions as needed
export default {
  configurePdfWorker,
};