import { pdfjs } from 'react-pdf';

// Specific version that matches our installed version
const PDFJS_VERSION = '3.11.174';

// Set the worker source URL to match the react-pdf version being used
export const configurePdfWorker = () => {
  try {
    // Ensure we only set the worker src once
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
      console.log('Setting up PDF.js worker options...');

      // First try: Use a static local worker file with forced cache bypass
      try {
        // This approach is most reliable because we control the file,
        // but it requires the file to be present in the public folder
        // Create direct URL from UNPKG CDN but with cache-busting query parameter
        const cdnUrl = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.js?t=${Date.now()}`;
        pdfjs.GlobalWorkerOptions.workerSrc = cdnUrl;
        console.log('PDF worker URL set to:', pdfjs.GlobalWorkerOptions.workerSrc);
        
        // Successfully set worker URL
        return;
      } catch (localWorkerError) {
        console.warn('Failed to use local PDF worker:', localWorkerError);
      }

      // Second try: Fallback to alternative CDNs if local worker loading fails
      try {
        // Use a more reliable CDN with fallbacks
        const workerUrls = [
          // Primary CDN (JSDelivr - often more reliable than unpkg)
          `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.js`,
          // Secondary CDN (CDNJS)
          `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`,
          // Tertiary CDN (Unpkg)
          `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.js`
        ];
        
        // Try to load the worker from the first CDN URL
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrls[0];
        console.log('PDF worker URL set to fallback CDN:', pdfjs.GlobalWorkerOptions.workerSrc);
        
        // Successfully set worker URL
        return;
      } catch (cdnError) {
        console.error('Failed to load PDF worker from CDNs:', cdnError);
      }
      
      // Final fallback: Use worker-less mode when all else fails
      console.warn('Falling back to worker-less mode for PDF.js');
      // @ts-ignore - this is a valid property but typing might be missing
      pdfjs.disableWorker = true;
    }
  } catch (error) {
    console.error('Failed to set PDF.js worker:', error);
    
    // Ultimate fallback - just don't crash
    try {
      // @ts-ignore - this is a valid property but typing might be missing
      pdfjs.disableWorker = true;
      console.warn('Using worker-less mode for PDF.js as last resort');
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