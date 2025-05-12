import { pdfjs } from 'react-pdf';

// Tell Vite to copy the worker file to /assets and give us its final URL.
// The `?url` suffix is the magic.
import workerURL from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Register the URL with pdf.js at runtime (side effect)
pdfjs.GlobalWorkerOptions.workerSrc = workerURL;