import { pdfjs } from 'react-pdf';

// Configure PDF.js with appropriate worker
// Direct CDN version is more reliable than dynamic imports
const CDN_WORKER_URL = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.8.69/build/pdf.worker.min.js';

// Try the local worker first, but fall back to CDN if that fails
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.js';

// Adjust configuration for better reliability
pdfjs.GlobalWorkerOptions.workerPort = null; // Force main thread operation if worker fails

// Export function to allow manual worker reset if needed
export function resetPdfWorker() {
  // Switch to the CDN version which is more reliable
  pdfjs.GlobalWorkerOptions.workerSrc = CDN_WORKER_URL;
  
  console.log('PDF Worker reset to use CDN version');
  
  // Also clear any caches that might be causing issues
  if (typeof caches !== 'undefined') {
    // This is a best-effort attempt, we don't wait for it
    caches.keys().then(keyList => {
      keyList.forEach(key => {
        if (key.includes('pdf') || key.includes('PDF')) {
          caches.delete(key);
        }
      });
    }).catch(() => {
      // Silently fail if browser doesn't support Cache API
    });
  }
}

// This is primarily a side-effect module that configures pdfjs when imported