const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function findAllPDFFiles() {
  const searchDirs = ['./uploads', './public/uploads', './data/uploads'];
  const allFiles = [];
  
  for (const dir of searchDirs) {
    try {
      const files = await fs.readdir(dir);
      const pdfFiles = files.filter(f => f.endsWith('.pdf'));
      
      for (const file of pdfFiles) {
        allFiles.push({
          filename: file,
          fullPath: path.join(dir, file),
          directory: dir
        });
      }
    } catch (error) {
      console.log(`Directory ${dir} not accessible, skipping...`);
    }
  }
  
  return allFiles;
}

async function reconcileDocuments() {
  console.log('🔍 Starting document reconciliation...');
  
  // Get all documents from database
  const documentsResult = await pool.query(
    'SELECT id, file_name, file_path FROM documents ORDER BY id'
  );
  
  // Get all PDF files on disk
  const diskFiles = await findAllPDFFiles();
  
  console.log(`📄 Found ${documentsResult.rows.length} documents in database`);
  console.log(`💾 Found ${diskFiles.length} PDF files on disk`);
  
  let fixedCount = 0;
  
  for (const doc of documentsResult.rows) {
    const currentPath = doc.file_path;
    const expectedFilename = path.basename(currentPath);
    
    // Try to find matching file on disk
    let matchingFile = diskFiles.find(f => f.filename === expectedFilename);
    
    if (!matchingFile) {
      // Try partial UUID matching
      const uuid = extractUUID(expectedFilename);
      if (uuid) {
        matchingFile = diskFiles.find(f => f.filename.includes(uuid));
      }
    }
    
    if (!matchingFile) {
      // Try normalized name matching
      const normalizedName = normalizeFileName(doc.file_name);
      matchingFile = diskFiles.find(f => 
        normalizeFileName(f.filename).includes(normalizedName.substring(0, 20))
      );
    }
    
    if (matchingFile) {
      // Update database with correct path
      const newPath = `uploads/${matchingFile.filename}`;
      
      if (currentPath !== newPath) {
        await pool.query(
          'UPDATE documents SET file_path = $1 WHERE id = $2',
          [newPath, doc.id]
        );
        
        console.log(`✅ Fixed doc ${doc.id}: ${currentPath} → ${newPath}`);
        fixedCount++;
        
        // Copy file to standard location if needed
        if (matchingFile.directory !== './uploads') {
          try {
            await fs.mkdir('./uploads', { recursive: true });
            await fs.copyFile(matchingFile.fullPath, `./uploads/${matchingFile.filename}`);
            console.log(`📁 Copied file to standard location: ${matchingFile.filename}`);
          } catch (error) {
            console.log(`⚠️ Could not copy file: ${error.message}`);
          }
        }
      }
    } else {
      console.log(`❌ No file found for document ${doc.id}: ${doc.file_name}`);
    }
  }
  
  console.log(`🎉 Reconciliation complete! Fixed ${fixedCount} documents.`);
}

function extractUUID(filename) {
  const uuidRegex = /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i;
  const match = filename.match(uuidRegex);
  return match ? match[1] : null;
}

function normalizeFileName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Run the reconciliation
reconcileDocuments()
  .then(() => {
    console.log('✅ Document reconciliation completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Document reconciliation failed:', error);
    process.exit(1);
  });