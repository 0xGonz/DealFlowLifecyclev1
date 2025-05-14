/**
 * PDF.js Worker File
 * This file is just a proxy that will redirect to the actual worker file hosted on CDN.
 * This ensures the worker can be found at the correct path.
 */

// Immediately redirect any requests for this worker to the CDN version
self.importScripts("https://cdn.jsdelivr.net/npm/pdfjs-dist@4.8.69/build/pdf.worker.min.js");