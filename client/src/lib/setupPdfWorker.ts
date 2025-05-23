import { pdfjs } from 'react-pdf';

/**
 * PDF.js Worker Configuration
 * 
 * This module sets up the PDF.js worker configuration for Replit environment.
 * It uses a CDN hosted worker file that matches the pdfjs-dist version in the project.
 * 
 * Important: PDF.js v4+ uses frozen objects, so we can't use Object.assign to modify
 * the configuration. Instead, we must use the standard workerSrc configuration.
 */

// Define the current PDF.js version we're targeting - must match the installed pdfjs-dist
const PDFJS_VERSION = '4.10.38'; 

// Use local worker first - CDNs are blocked in this environment
const workerSources = [
  // Use local worker that's already in public folder
  '/pdf.worker.min.js',
  '/pdf.worker.js',
  // Only try CDN as absolute last resort (likely blocked)
  `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.js`
];

// Try to set the worker source from our list
let workerConfigured = false;
let selectedSource = '';

// Configure the worker synchronously to avoid loading issues
selectedSource = workerSources[0]; // Use local worker first
pdfjs.GlobalWorkerOptions.workerSrc = selectedSource;
workerConfigured = true;

console.log('PDF.js worker configured with local file:', selectedSource);

// Export functions to help components check and manage the worker configuration
export function getWorkerStatus() {
  return {
    workerSrc: pdfjs.GlobalWorkerOptions.workerSrc,
    isConfigured: workerConfigured,
    version: PDFJS_VERSION,
    isViteBundled: false, // We're using a CDN URL, not Vite bundling
    selectedSource
  };
}

/**
 * Try to fix the worker source if it's not set or not working
 * This is called by components if they detect PDF.js worker issues
 */
export function tryFixPdfWorker() {
  // If already working, don't try to fix
  if (workerConfigured && pdfjs.GlobalWorkerOptions.workerSrc === selectedSource) {
    return getWorkerStatus();
  }
  
  // Try alternative worker sources if the first one failed
  for (let i = 1; i < workerSources.length; i++) {
    try {
      pdfjs.GlobalWorkerOptions.workerSrc = workerSources[i];
      selectedSource = workerSources[i];
      workerConfigured = true;
      console.log('PDF.js worker fallback configured with:', selectedSource);
      break;
    } catch (error) {
      console.error(`Error using alternative worker source (${i}):`, error);
    }
  }
  
  return getWorkerStatus();
}
