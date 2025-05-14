import { pdfjs } from 'react-pdf';

/**
 * PDF.js Worker Configuration
 * 
 * This module sets up the PDF.js worker configuration with multiple fallbacks
 * to handle various deployment scenarios and ensure PDF rendering works reliably.
 */

// Possible worker locations in order of preference
const WORKER_SOURCES = [
  // Local path in the public directory (handled by our proxy)
  '/pdf.worker.js',
  
  // Direct CDN locations as fallbacks
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js',
  'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
];

// Default configuration options for PDF.js
const DEFAULT_OPTIONS = {
  // Disable worker to fall back to main thread if workers fail
  disableWorker: false,
  
  // These settings improve compatibility and reduce errors
  disableStream: false,
  disableAutoFetch: true,
  
  // Higher verbosity for better debugging
  verbosity: 1
};

// Apply our configuration
pdfjs.GlobalWorkerOptions.workerSrc = WORKER_SOURCES[0];

// Set additional options to improve reliability
Object.assign(pdfjs, DEFAULT_OPTIONS);

// Track which worker source we're currently using
let currentWorkerIndex = 0;

/**
 * Reset the PDF worker to use a different source
 * This is useful when the primary worker fails to load
 */
export function resetPdfWorker() {
  // Try the next worker source in our list
  currentWorkerIndex = (currentWorkerIndex + 1) % WORKER_SOURCES.length;
  const newWorkerSrc = WORKER_SOURCES[currentWorkerIndex];
  
  console.log(`Resetting PDF Worker to use source ${currentWorkerIndex}: ${newWorkerSrc}`);
  pdfjs.GlobalWorkerOptions.workerSrc = newWorkerSrc;
  
  // Clear any caches that might be causing issues
  if (typeof caches !== 'undefined') {
    try {
      // This is a best-effort attempt to clear PDF-related caches
      caches.keys().then(keyList => {
        Promise.all(
          keyList
            .filter(key => key.includes('pdf') || key.includes('PDF'))
            .map(key => caches.delete(key))
        );
      });
    } catch (err) {
      // Silently ignore cache API errors
      console.log('Cache API not available or error occurred:', err);
    }
  }
  
  return newWorkerSrc;
}