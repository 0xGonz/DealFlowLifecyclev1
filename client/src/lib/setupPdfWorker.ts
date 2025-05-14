import { pdfjs } from 'react-pdf';

/**
 * PDF.js Worker Configuration
 * 
 * This module sets up the PDF.js worker configuration for Replit environment.
 * It uses a CDN hosted worker file that matches the pdfjs-dist version in the project.
 */

// Use the CDN-hosted worker file that matches our version (4.8.69)
pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.8.69/legacy/build/pdf.worker.min.js';

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
    isConfigured: !!pdfjs.GlobalWorkerOptions.workerSrc,
    version: '4.8.69' // Track the version for easier debugging
  };
}