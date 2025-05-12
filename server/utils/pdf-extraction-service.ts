/**
 * PDF Extraction Service
 * 
 * This service provides functionality to extract text content from PDF files
 * stored in the application's upload directory.
 */

import fs from 'fs';
import path from 'path';
import { parsePdf } from './pdf-parser';

/**
 * Class providing methods for PDF content extraction
 */
export class PdfExtractionService {
  /**
   * Extract text from a PDF file
   * 
   * @param filePath The path to the PDF file relative to the upload directory
   * @returns A promise that resolves to the extracted text content
   */
  static async extractText(filePath: string): Promise<string> {
    try {
      // Construct the absolute path to the file
      // The file path in DB starts with '/uploads/...' but the actual files are in './uploads/...'
      const fullPath = path.join(process.cwd(), filePath.replace(/^\/uploads/, 'uploads'));
      
      // Check if the file exists
      if (!fs.existsSync(fullPath)) {
        throw new Error(`PDF file not found at path: ${fullPath}`);
      }
      
      // Parse the PDF using our safer wrapper
      const data = await parsePdf(fullPath);
      
      // Return the text content
      return data.text || '';
    } catch (error: any) {
      console.error('Error extracting PDF text:', error);
      throw new Error(`Failed to extract PDF text: ${error.message || 'Unknown error'}`);
    }
  }
  
  /**
   * Get metadata from a PDF file
   * 
   * @param filePath The path to the PDF file relative to the upload directory
   * @returns A promise that resolves to an object containing PDF metadata
   */
  static async getMetadata(filePath: string): Promise<Record<string, any>> {
    try {
      // Construct the absolute path to the file
      const fullPath = path.join(process.cwd(), filePath.replace(/^\/uploads/, 'uploads'));
      
      // Check if the file exists
      if (!fs.existsSync(fullPath)) {
        throw new Error(`PDF file not found at path: ${fullPath}`);
      }
      
      // Parse the PDF using our safer wrapper
      const data = await parsePdf(fullPath);
      
      // Return metadata
      return {
        pages: data.numpages,
        info: data.info,
        metadata: data.metadata,
        version: data.version
      };
    } catch (error: any) {
      console.error('Error extracting PDF metadata:', error);
      throw new Error(`Failed to extract PDF metadata: ${error.message || 'Unknown error'}`);
    }
  }
}