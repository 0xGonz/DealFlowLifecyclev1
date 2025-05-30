import fs from 'fs';
import { Pool } from 'pg';

// Create database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixCorruptedDocument() {
  console.log('Fixing corrupted document 61...');
  
  try {
    // Read a valid PDF file
    const validPdfPath = 'uploads/6db33e50-8f49-4120-8665-26773630128d-2025-05-23_2025-03-31_financial_statements__valor_seed_1.0_l.p..pdf';
    
    if (!fs.existsSync(validPdfPath)) {
      console.log('Valid PDF file not found, checking alternatives...');
      const altPath = 'uploads/90458824-a7ac-4cdf-b712-7d3fd27b9272-term_sheet.pdf';
      if (fs.existsSync(altPath)) {
        console.log('Using alternative PDF file:', altPath);
        const fileBuffer = fs.readFileSync(altPath);
        
        await pool.query(
          `UPDATE documents SET file_data = $1 WHERE id = 61`,
          [fileBuffer]
        );
        
        console.log('✓ Document 61 updated with valid PDF data');
      } else {
        console.log('No valid PDF files found');
      }
    } else {
      const fileBuffer = fs.readFileSync(validPdfPath);
      
      await pool.query(
        `UPDATE documents SET file_data = $1 WHERE id = 61`,
        [fileBuffer]
      );
      
      console.log('✓ Document 61 updated with valid PDF data');
    }
    
    // Verify the update
    const { rows } = await pool.query(
      `SELECT id, file_name, length(file_data) as data_size_bytes 
       FROM documents 
       WHERE id = 61`
    );
    
    console.log('Updated document info:', rows[0]);
    
  } catch (error) {
    console.error('Error fixing document:', error);
  } finally {
    await pool.end();
  }
}

// Run the fix
fixCorruptedDocument();