import { createRoot } from "react-dom/client";
import App from "./App";
import { ThemeProvider } from "@/components/theme-provider";
import "./index.css";

// Import and configure PDF.js worker globally at app startup
import { configurePdfWorker } from '@/lib/pdf-config';

// Initialize PDF worker configuration as early as possible
try {
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
