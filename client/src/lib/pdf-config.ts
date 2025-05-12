import { pdfjs } from 'react-pdf';

// Set the worker source URL for PDF.js
const workerSrc = '/pdf.worker.js'; // We copy this file to public/

export const configurePdfWorker = () => {
  try {
    // Ensure we only set the worker src once
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
      console.log('Setting PDF worker URL to:', workerSrc);
      pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
    }
  } catch (error) {
    console.error('Failed to set PDF.js worker:', error);
  }
};

// Call this function immediately when imported
configurePdfWorker();

// Export other PDF-related configuration and utility functions as needed
export default {
  configurePdfWorker,
};