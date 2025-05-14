import { pdfjs } from 'react-pdf';

/**
 * PDF.js Worker Configuration
 * 
 * This module sets up the PDF.js worker configuration for Replit environment.
 * It uses a CDN hosted worker file that matches the pdfjs-dist version in the project.
 */

// Set the worker source to a CDN-hosted file from the same version as our pdfjs-dist (4.8.69)
// This is the most reliable approach for Replit deployment
pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.8.69/build/pdf.worker.min.mjs';

// In PDF.js v4+, we cannot modify the frozen pdfjs object with Object.assign
// Instead, we configure the viewer with these options when we render <Document>
// These are provided in the useMemo of PdfViewer.tsx

// Simple function to log worker status
export function getWorkerStatus() {
  return {
    workerSrc: pdfjs.GlobalWorkerOptions.workerSrc,
    isConfigured: !!pdfjs.GlobalWorkerOptions.workerSrc,
    version: '4.8.69', // Track the version for easier debugging
    isViteBundled: false // We're using a CDN URL, not Vite bundling
  };
}
