/**
 * PDF.js worker proxy file
 * 
 * This is a simpler version that loads the PDF.js worker script directly from a CDN
 * which is more reliable than trying to use dynamic imports that can be problematic
 * in certain environments.
 */

// Instead of trying to use dynamic imports, redirect to a CDN-hosted worker
const workerScript = document.createElement('script');
workerScript.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.8.69/build/pdf.worker.min.js';
workerScript.async = true;
document.head.appendChild(workerScript);

// This notifies the main thread that we've handled it
if (typeof window !== 'undefined') {
  window.pdfjsWorkerLoaded = true;
}
