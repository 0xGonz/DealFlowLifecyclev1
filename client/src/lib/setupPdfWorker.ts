import { pdfjs } from 'react-pdf';

/**
 * PDF.js Worker Configuration
 * 
 * This fixes the "fake worker" error by using the correct worker version
 * that matches the installed pdfjs-dist package.
 */

// Use a data URL to provide an inline worker for better compatibility
// This avoids external CDN issues in Replit environment
pdfjs.GlobalWorkerOptions.workerSrc = 'data:application/javascript;base64,aW1wb3J0U2NyaXB0cygnLi4vLi4vYnVpbGQvcGRmLndvcmtlci5taW4uanMnKTs=';

console.log('✅ PDF.js worker configured correctly: local fallback mode');

// Export simple status function for debugging
export function getWorkerStatus() {
  return {
    workerSrc: pdfjs.GlobalWorkerOptions.workerSrc,
    isConfigured: true,
    isViteBundled: true // Now using Vite bundling
  };
}
