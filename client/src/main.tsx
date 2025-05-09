import { createRoot } from "react-dom/client";
import App from "./App";
import { ThemeProvider } from "@/components/theme-provider";
import "./index.css";

// Import PDF.js for configuration
import { pdfjs } from 'react-pdf';

// Configure PDF.js worker at app startup
// The most reliable approach is to use the path defined in HTML
document.addEventListener('DOMContentLoaded', () => {
  // If the path was defined in HTML, use it directly - no multiple imports
  if (window.pdfjsWorkerSrc) {
    console.log('Using PDF.js worker path from HTML:', window.pdfjsWorkerSrc);
    pdfjs.GlobalWorkerOptions.workerSrc = window.pdfjsWorkerSrc;
  } else {
    // Fallback to a direct local file reference
    const localWorkerPath = '/pdfjs/pdf.worker.min.js';
    console.log('Setting PDF.js worker to local path:', localWorkerPath);
    pdfjs.GlobalWorkerOptions.workerSrc = localWorkerPath;
  }
});

createRoot(document.getElementById("root")!).render(
  <ThemeProvider defaultTheme="light" storageKey="doliver-theme">
    <App />
  </ThemeProvider>
);
