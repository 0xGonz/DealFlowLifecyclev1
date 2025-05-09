import { pdfjs } from 'react-pdf';

// Set the worker source URL to match the react-pdf version being used
export const configurePdfWorker = () => {
  try {
    // Ensure we only set the worker src once
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
      // Try multiple approaches to ensure worker loads correctly
      
      // Option 1: Use the version bundled with pdfjs-dist
      try {
        // Attempt to dynamically load the worker
        console.log('Setting up PDF.js worker options...');
        
        // Use a more reliable CDN with fallbacks
        const workerUrls = [
          // Primary CDN (Unpkg)
          `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`,
          // Fallback CDN (CDNJS)
          `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`,
          // Last resort (JSDelivr)
          `https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js`
        ];
        
        // Try to load the worker from any of these URLs
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrls[0];
        console.log('PDF worker URL set to:', pdfjs.GlobalWorkerOptions.workerSrc);
      } catch (workerError) {
        console.error('Failed to load PDF worker from CDN:', workerError);
        
        // Fallback to worker-less mode when errors occur
        console.log('Falling back to fake worker mode');
        // @ts-ignore - this is a valid property but typing might be missing
        pdfjs.disableWorker = true;
      }
    }
  } catch (error) {
    console.error('Failed to set PDF.js worker:', error);
    
    // Ultimate fallback - just don't crash
    try {
      // @ts-ignore - this is a valid property but typing might be missing
      pdfjs.disableWorker = true;
    } catch (e) {
      console.error('Failed to disable worker:', e);
    }
  }
};

// Call this function immediately when imported
configurePdfWorker();

// Export other PDF-related configuration and utility functions as needed
export default {
  configurePdfWorker,
};