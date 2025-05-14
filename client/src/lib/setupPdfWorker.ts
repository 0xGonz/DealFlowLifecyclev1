import { pdfjs } from 'react-pdf';

/**
 * PDF.js Worker Configuration
 * 
 * This module sets up the PDF.js worker configuration for Replit environment.
 * It uses a static path to the worker file which is stored in the public directory.
 */

// Set a simple static path to the worker
// This is the most reliable approach in Replit's environment
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.js';

// Default configuration options for PDF.js
const DEFAULT_OPTIONS = {
  // Enforce using the worker (don't fall back to main thread)
  disableWorker: false,
  
  // These settings improve compatibility and reduce errors
  disableStream: false,
  disableAutoFetch: true
};

// Apply our configuration
Object.assign(pdfjs, DEFAULT_OPTIONS);

// Simple function to log worker status
export function getWorkerStatus() {
  return {
    workerSrc: pdfjs.GlobalWorkerOptions.workerSrc,
    isConfigured: !!pdfjs.GlobalWorkerOptions.workerSrc
  };
}