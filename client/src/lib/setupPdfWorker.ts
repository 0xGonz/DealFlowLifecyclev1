import { pdfjs } from 'react-pdf';

// Tell Vite to copy the worker file to /assets and give us its final URL.
// The `?url` suffix tells Vite to handle the import as a URL.
// Note: For version 4.8.69, the worker file has .mjs extension
import workerURL from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Register the URL with pdf.js at runtime (side effect)
pdfjs.GlobalWorkerOptions.workerSrc = workerURL;

// This is a side-effect module - it doesn't export anything
// but configures pdfjs when imported