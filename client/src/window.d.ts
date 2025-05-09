interface Window {
  /**
   * Path to the PDF.js worker script
   * This is set in the HTML file and used by pdf-config.ts
   */
  pdfjsWorkerSrc?: string;
  
  /**
   * Flag to indicate that PDF.js worker is preloaded in HTML
   */
  __pdfjsWorkerPreloaded?: boolean;
}