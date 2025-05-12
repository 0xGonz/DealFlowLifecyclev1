/**
 * Custom wrapper for pdf-parse that avoids importing the module directly
 * to prevent it from automatically loading test files
 */

import { promisify } from 'util';
import { exec } from 'child_process';
import fs from 'fs';

const execAsync = promisify(exec);

interface PdfData {
  text: string;
  numpages: number;
  info?: any;
  metadata?: any;
  version?: string;
}

/**
 * Parse PDF using a safer approach that doesn't require loading the pdf-parse module directly
 * 
 * @param filePath Path to the PDF file
 * @returns Promise with PDF data
 */
export async function parsePdf(filePath: string): Promise<PdfData> {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`PDF file not found at path: ${filePath}`);
    }

    // Create a simple script to extract text using the pdf-parse module
    const scriptContent = `
      const fs = require('fs');
      const pdfParse = require('pdf-parse');
      
      const dataBuffer = fs.readFileSync('${filePath.replace(/'/g, "\\'")}');
      
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
    
    // Create a temporary file for our script
    const tempScriptPath = './temp-pdf-extract.js';
    fs.writeFileSync(tempScriptPath, scriptContent);
    
    try {
      // Execute the script as a separate process
      const { stdout } = await execAsync(`node ${tempScriptPath}`);
      
      // Parse the result
      const result = JSON.parse(stdout);
      return result;
    } finally {
      // Clean up the temporary file
      if (fs.existsSync(tempScriptPath)) {
        fs.unlinkSync(tempScriptPath);
      }
    }
  } catch (error: any) {
    console.error('Error parsing PDF:', error);
    // Return minimal data with error information
    return {
      text: `Error parsing PDF: ${error.message || 'Unknown error'}`,
      numpages: 0
    };
  }
}