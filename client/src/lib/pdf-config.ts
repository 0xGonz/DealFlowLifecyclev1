import { pdfjs } from 'react-pdf';

// Set the worker source URL to match the react-pdf version being used
// For react-pdf 9.2.1, the PDFjs version is 4.8.69
// This ensures the API and worker versions match
export const configurePdfWorker = () => {
  // Ensure we only set the worker src once
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@4.8.69/build/pdf.worker.min.js`;
  }
};

// Call this function immediately when imported
configurePdfWorker();

// Export other PDF-related configuration and utility functions as needed
export default {
  configurePdfWorker,
};