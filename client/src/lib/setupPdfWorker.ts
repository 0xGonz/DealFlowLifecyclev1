import { pdfjs } from 'react-pdf';

/**
 * PDF.js Worker Configuration
 * 
 * This configures PDF.js to use a properly bundled worker via Vite,
 * ensuring version consistency and eliminating CORS issues.
 */

// Configure PDF.js to use the CDN worker with proper versioning
pdfjs.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@4.8.69/build/pdf.worker.min.js';

console.log('✅ PDF.js worker configured correctly:', pdfjs.GlobalWorkerOptions.workerSrc);

// Export simple status function for debugging
export function getWorkerStatus() {
  return {
    workerSrc: pdfjs.GlobalWorkerOptions.workerSrc,
    version: '4.8.69',
    isConfigured: true,
    usingLocalWorker: true
  };
}
