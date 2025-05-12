// This file is kept for backward compatibility but no longer needs configuration
// when using react-pdf/dist/esm/entry.vite which auto-configures the worker

// Simple no-op function to avoid breaking existing imports
export const configurePdfWorker = () => {
  console.log('PDF worker auto-configured by entry.vite bundle');
};

// Export other PDF-related configuration and utility functions as needed
export default {
  configurePdfWorker,
};