import { createRoot } from "react-dom/client";
import App from "./App";
import { ThemeProvider } from "@/components/theme-provider";
import "./index.css";

// Import PDF worker setup as early as possible
import './lib/setupPdfWorker';

createRoot(document.getElementById("root")!).render(
  <ThemeProvider defaultTheme="light" storageKey="doliver-theme">
    <App />
  </ThemeProvider>
);
