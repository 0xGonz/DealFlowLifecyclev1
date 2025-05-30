import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

// Create database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrateDocumentsToBlob() {
  console.log('Starting document migration to PostgreSQL blob storage...');
  
  try {
    // Get all documents that don't have file_data populated
    const { rows: documents } = await pool.query(
      `SELECT id, file_name, file_path FROM documents WHERE file_data IS NULL`
    );
    
    console.log(`Found ${documents.length} documents to migrate`);
    
    for (const doc of documents) {
      console.log(`Processing document ${doc.id}: ${doc.file_name}`);
      
      // Try different possible file paths
      const possiblePaths = [
        doc.file_path,
        path.join('uploads', doc.file_name),
        path.join('uploads', path.basename(doc.file_name)),
      ];
      
      let fileBuffer: Buffer | null = null;
      let actualPath: string | null = null;
      
      // Find the actual file
      for (const filePath of possiblePaths) {
        if (filePath && fs.existsSync(filePath)) {
          try {
            fileBuffer = fs.readFileSync(filePath);
            actualPath = filePath;
            break;
          } catch (error) {
            console.log(`Could not read file at ${filePath}: ${error}`);
          }
        }
      }
      
      // Also try searching for the file by name in uploads directory
      if (!fileBuffer) {
        const uploadsDir = 'uploads';
        if (fs.existsSync(uploadsDir)) {
          const findFile = (dir: string, filename: string): string | null => {
            const files = fs.readdirSync(dir, { withFileTypes: true });
            for (const file of files) {
              const fullPath = path.join(dir, file.name);
              if (file.isDirectory()) {
                const found = findFile(fullPath, filename);
                if (found) return found;
              } else if (file.name === filename || file.name.includes(path.parse(filename).name)) {
                return fullPath;
              }
            }
            return null;
          };
          
          actualPath = findFile(uploadsDir, doc.file_name);
          if (actualPath && fs.existsSync(actualPath)) {
            try {
              fileBuffer = fs.readFileSync(actualPath);
            } catch (error) {
              console.log(`Could not read found file at ${actualPath}: ${error}`);
            }
          }
        }
      }
      
      if (fileBuffer) {
        console.log(`Found file for document ${doc.id} at ${actualPath}, size: ${fileBuffer.length} bytes`);
        
        // Update the database with the file data
        await pool.query(
          `UPDATE documents SET file_data = $1 WHERE id = $2`,
          [fileBuffer, doc.id]
        );
        
        console.log(`✓ Successfully migrated document ${doc.id}: ${doc.file_name}`);
      } else {
        console.log(`✗ Could not find file for document ${doc.id}: ${doc.file_name}`);
      }
    }
    
    console.log('Document migration completed!');
    
    // Show migration results
    const { rows: results } = await pool.query(
      `SELECT 
        COUNT(*) as total_documents,
        COUNT(file_data) as documents_with_data,
        COUNT(*) - COUNT(file_data) as documents_without_data
       FROM documents`
    );
    
    console.log('Migration Results:');
    console.log(`Total documents: ${results[0].total_documents}`);
    console.log(`Documents with data: ${results[0].documents_with_data}`);
    console.log(`Documents without data: ${results[0].documents_without_data}`);
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

// Run the migration
migrateDocumentsToBlob();