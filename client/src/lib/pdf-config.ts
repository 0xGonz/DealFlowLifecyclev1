import { pdfjs } from 'react-pdf';

// Set the worker source URL to match the react-pdf version being used
// For react-pdf 9.2.1, the PDFjs version is 4.8.69
// This ensures the API and worker versions match
export const configurePdfWorker = () => {
  try {
    // Ensure we only set the worker src once
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
      // Using CDN-hosted worker for better reliability
      const workerUrl = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.worker.min.js`;
      console.log('Setting PDF worker URL:', workerUrl);
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
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