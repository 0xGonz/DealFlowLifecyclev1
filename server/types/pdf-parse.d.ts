declare module 'pdf-parse' {
  interface PdfData {
    /** PDF text content */
    text: string;
    /** Number of pages */
    numpages: number;
    /** PDF.js version */
    version: string;
    /** PDF info dictionary */
    info: Record<string, any>;
    /** PDF metadata */
    metadata: Record<string, any>;
  }

  /**
   * Parse PDF file content
   * @param dataBuffer PDF file buffer
   * @param options PDF parse options
   * @returns Promise with PdfData
   */
  function pdfParse(dataBuffer: Buffer, options?: Record<string, any>): Promise<PdfData>;

  export default pdfParse;
}