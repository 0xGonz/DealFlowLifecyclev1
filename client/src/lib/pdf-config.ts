import { pdfjs } from 'react-pdf';

// Set the worker source URL to specifically address the 'pdf.worker.mjs' error
export const configurePdfWorker = () => {
  // Only configure once
  if (pdfjs.GlobalWorkerOptions.workerSrc) {
    return;
  }

  console.log('Setting up PDF.js worker options...');

  try {
    // Method 1: Direct CDN approach with specific worker file
    // Using the minified version from jsdelivr which is more reliable
    const workerUrl = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    console.log('PDF worker URL set to:', workerUrl);
    
    // Explicitly log success
    return;
  } catch (error) {
    console.error('Failed to set PDF worker URL:', error);
    
    // Method 2: Try alternate worker configuration approach
    try {
      console.log('Trying alternate worker configuration...');
      // Use inline worker via blob URL as fallback
      const workerCode = `
        self.onmessage = function(e) {
          self.postMessage({ isWorkerReady: true });
        };
      `;
      
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const blobUrl = URL.createObjectURL(blob);
      
      // Use the blob URL as worker source
      pdfjs.GlobalWorkerOptions.workerSrc = blobUrl;
      console.log('Using blob URL worker fallback');
      return;
    } catch (blobError) {
      console.error('Failed to create blob worker:', blobError);
    }
    
    // Method 3: Try workerless mode
    try {
      console.warn('Falling back to worker-less mode for PDF.js');
      // @ts-ignore
      pdfjs.disableWorker = true;
      
      // Set a dummy worker source to satisfy react-pdf
      pdfjs.GlobalWorkerOptions.workerSrc = 'data:application/javascript;base64,';
      
      return;
    } catch (disableError) {
      console.error('Failed to disable worker:', disableError);
    }
  }
  
  // If all else fails, try to continue without explicit configuration
  console.error('All PDF worker configuration methods failed. Document viewer may not function correctly.');
};

// Call this function immediately when imported
configurePdfWorker();

// Export other PDF-related configuration and utility functions as needed
export default {
  configurePdfWorker,
};