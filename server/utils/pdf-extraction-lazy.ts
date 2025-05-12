/**
 * PDF Extraction Service with lazy loading
 * 
 * This service provides functionality to extract text content from PDF files
 * stored in the application's upload directory without loading the pdf-parse
 * module at server startup.
 */

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

/**
 * Class providing methods for PDF content extraction with lazy loading
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
      
      // Use Node's child_process to extract text from PDF without requiring pdf-parse at load time
      const tempScriptPath = path.join(process.cwd(), 'temp-pdf-extract.js');
      
      // Create a temporary script to extract PDF text
      const scriptContent = `
        const fs = require('fs');
        
        // Only require pdf-parse when needed
        const pdfParse = require('pdf-parse');
        
        const pdfPath = '${fullPath.replace(/'/g, "\\'")}';
        const dataBuffer = fs.readFileSync(pdfPath);
        
        pdfParse(dataBuffer).then(data => {
          console.log(JSON.stringify({
            text: data.text,
            numpages: data.numpages,
            info: data.info,
            metadata: data.metadata,
            version: data.version
          }));
          process.exit(0);
        }).catch(err => {
          console.error(err);
          process.exit(1);
        });
      `;
      
      fs.writeFileSync(tempScriptPath, scriptContent);
      
      try {
        // Run the script as a separate process
        const { stdout } = await execAsync(`node ${tempScriptPath}`);
        const data = JSON.parse(stdout);
        return data.text || '';
      } finally {
        // Clean up
        if (fs.existsSync(tempScriptPath)) {
          fs.unlinkSync(tempScriptPath);
        }
      }
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
      // Extract text with metadata
      const fullPath = path.join(process.cwd(), filePath.replace(/^\/uploads/, 'uploads'));
      
      if (!fs.existsSync(fullPath)) {
        throw new Error(`PDF file not found at path: ${fullPath}`);
      }
      
      // Use the same approach as extractText but return metadata
      const tempScriptPath = path.join(process.cwd(), 'temp-pdf-metadata.js');
      
      const scriptContent = `
        const fs = require('fs');
        const pdfParse = require('pdf-parse');
        
        const pdfPath = '${fullPath.replace(/'/g, "\\'")}';
        const dataBuffer = fs.readFileSync(pdfPath);
        
        pdfParse(dataBuffer).then(data => {
          console.log(JSON.stringify({
            numpages: data.numpages,
            info: data.info,
            metadata: data.metadata,
            version: data.version
          }));
          process.exit(0);
        }).catch(err => {
          console.error(err);
          process.exit(1);
        });
      `;
      
      fs.writeFileSync(tempScriptPath, scriptContent);
      
      try {
        const { stdout } = await execAsync(`node ${tempScriptPath}`);
        return JSON.parse(stdout);
      } finally {
        if (fs.existsSync(tempScriptPath)) {
          fs.unlinkSync(tempScriptPath);
        }
      }
    } catch (error: any) {
      console.error('Error extracting PDF metadata:', error);
      throw new Error(`Failed to extract PDF metadata: ${error.message || 'Unknown error'}`);
    }
  }
}