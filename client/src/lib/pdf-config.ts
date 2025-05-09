import { pdfjs } from 'react-pdf';

/**
 * Configures PDF.js worker for optimal compatibility across different environments.
 * This uses a multi-stage fallback approach to ensure PDFs can be displayed.
 */
export const configurePdfWorker = () => {
  // Only configure once
  if (pdfjs.GlobalWorkerOptions.workerSrc) {
    return;
  }

  console.log('Setting up PDF.js worker options in most compatible mode...');

  // MOST COMPATIBLE APPROACH: Explicitly use no worker - inline operation
  try {
    // Option 1: Set to empty string to use "fake worker"
    pdfjs.GlobalWorkerOptions.workerSrc = '';
    
    // Option 2: Explicitly disable worker (legacy method, but sometimes works better)
    // @ts-ignore - We know these properties exist even if TypeScript doesn't
    pdfjs.disableWorker = true;
    
    // Option 3: Use a dummy data URL as worker source
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
      pdfjs.GlobalWorkerOptions.workerSrc = 'data:application/javascript;base64,';
    }
    
    console.log('PDF.js worker disabled - using main thread for PDF operations');
    return;
  } catch (error) {
    console.error('Failed to configure PDF.js worker:', error);
  }
};

// Call this function immediately when imported
configurePdfWorker();

// Export other PDF-related configuration and utility functions as needed
export default {
  configurePdfWorker,
};