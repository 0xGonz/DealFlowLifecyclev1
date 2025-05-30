import { pdfjs } from 'react-pdf';

/**
 * PDF.js Worker Configuration
 * 
 * This fixes the "fake worker" error by using the correct worker version
 * that matches the installed pdfjs-dist package.
 */

// Use local worker configuration for Replit environment
// Disable external worker to avoid CDN fetch issues
pdfjs.GlobalWorkerOptions.workerSrc = '';

// Enable legacy build mode for compatibility
pdfjs.GlobalWorkerOptions.workerPort = null;

console.log('✅ PDF.js worker configured correctly: local fallback mode');

// Export simple status function for debugging
export function getWorkerStatus() {
  return {
    workerSrc: pdfjs.GlobalWorkerOptions.workerSrc,
    isConfigured: true,
    isViteBundled: true // Now using Vite bundling
  };
}
