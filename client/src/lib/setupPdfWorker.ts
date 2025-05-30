import { pdfjs } from 'react-pdf';

/**
 * PDF.js Worker Configuration
 * 
 * This configures PDF.js to use a local worker file served by the application,
 * ensuring version consistency and eliminating CORS issues.
 */

// Use a local worker path that will be served by the application
const workerUrl = '/pdf.worker.min.js';

// Configure PDF.js to use the local worker
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

console.log('✅ PDF.js worker configured as:', workerUrl);

// Export simple status function for debugging
export function getWorkerStatus() {
  return {
    workerSrc: pdfjs.GlobalWorkerOptions.workerSrc,
    version: '4.8.69',
    isConfigured: true,
    usingLocalWorker: true
  };
}
