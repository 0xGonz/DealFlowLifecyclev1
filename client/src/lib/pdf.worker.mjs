// This is just a simple wrapper that imports from the global worker file
// This pattern directly addresses the "Failed to resolve module specifier 'pdf.worker.mjs'" error

// This imports and re-exports the worker from a locally hosted file
const workerPath = '/pdfjs/pdf.worker.min.js';

// Export a simple object to be the worker target
export default {
  workerPath
};

// This file exists solely to resolve the module import error when pdf.worker.mjs is imported