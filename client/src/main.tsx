import { createRoot } from "react-dom/client";
import App from "./App";
import { ThemeProvider } from "@/components/theme-provider";
import "./index.css";

// Import and configure PDF.js worker globally at app startup
import { pdfjs } from 'react-pdf';
import { configurePdfWorker } from '@/lib/pdf-config';

// First add a global hint that we're using the PDF.js worker
// This helps browsers understand the PDF.js worker is coming
document.addEventListener('DOMContentLoaded', () => {
  console.log('PDF.js worker preloaded in HTML');
});

// Set fallback empty worker source for maximum compatibility
pdfjs.GlobalWorkerOptions.workerSrc = '';

// Initialize PDF worker configuration as early as possible
try {
  // Also try to explicitly disable the worker
  // @ts-ignore - TypeScript doesn't know about this property
  pdfjs.disableWorker = true;
  
  configurePdfWorker();
  console.log('PDF worker configured at application startup');
} catch (error) {
  console.error('Failed to configure PDF worker at startup:', error);
}

createRoot(document.getElementById("root")!).render(
  <ThemeProvider defaultTheme="light" storageKey="doliver-theme">
    <App />
  </ThemeProvider>
);
