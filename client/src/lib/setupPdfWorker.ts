import { pdfjs } from 'react-pdf';

/**
 * PDF.js Worker Configuration
 * 
 * This module sets up the PDF.js worker configuration for Replit environment.
 * It uses Vite's URL import to properly bundle and serve the worker file.
 */

// Import the worker directly from the CDN to ensure version compatibility
// This is the most reliable approach for Replit, ensuring the worker matches the pdfjs-dist version
pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.8.69/build/pdf.worker.min.mjs';

// Default configuration options for PDF.js
const DEFAULT_OPTIONS = {
  // Enforce using the worker (don't fall back to main thread)
  disableWorker: false,
  
  // These settings improve compatibility and reduce errors
  disableStream: false,
  disableAutoFetch: true,
  
  // Extended options for better browser support
  isEvalSupported: true,
  useSystemFonts: true
};

// Apply our configuration
Object.assign(pdfjs, DEFAULT_OPTIONS);

// Make sure worker will load by explicitly setting disableWorker = false
pdfjs.disableWorker = false;

// Simple function to log worker status
export function getWorkerStatus() {
  return {
    workerSrc: pdfjs.GlobalWorkerOptions.workerSrc,
    isConfigured: !!pdfjs.GlobalWorkerOptions.workerSrc,
    version: '4.8.69', // Track the version for easier debugging
    isViteBundled: true // Track if we're using Vite's bundling
  };
}
