#!/usr/bin/env node

/**
 * Document Storage Consolidation Script
 * Consolidates all scattered document folders into unified storage/documents/ structure
 */

import { promises as fs } from 'fs';
import path from 'path';

const STORAGE_ROOT = 'storage/documents';
const SOURCE_FOLDERS = [
  'uploads/',
  'data/uploads/',
  'public/documents/',
  'public/uploads/'
];

async function ensureDirectory(dirPath) {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
}

async function moveFile(sourcePath, destPath) {
  try {
    // Ensure destination directory exists
    await ensureDirectory(path.dirname(destPath));
    
    // Copy file to new location
    await fs.copyFile(sourcePath, destPath);
    console.log(`Moved: ${sourcePath} -> ${destPath}`);
    
    // Remove original file
    await fs.unlink(sourcePath);
    
    return true;
  } catch (error) {
    console.error(`Failed to move ${sourcePath}:`, error.message);
    return false;
  }
}

async function getFilesByFolder(folderPath) {
  try {
    const files = [];
    const items = await fs.readdir(folderPath, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(folderPath, item.name);
      if (item.isDirectory()) {
        // Recursively get files from subdirectories
        const subFiles = await getFilesByFolder(fullPath);
        files.push(...subFiles);
      } else if (item.isFile()) {
        files.push(fullPath);
      }
    }
    
    return files;
  } catch (error) {
    console.log(`Folder ${folderPath} doesn't exist or is empty`);
    return [];
  }
}

async function consolidateDocuments() {
  console.log('🚀 Starting document storage consolidation...\n');
  
  // Ensure storage directory exists
  await ensureDirectory(STORAGE_ROOT);
  await ensureDirectory(`${STORAGE_ROOT}/temp`);
  
  let totalFiles = 0;
  let movedFiles = 0;
  
  for (const sourceFolder of SOURCE_FOLDERS) {
    console.log(`📁 Processing folder: ${sourceFolder}`);
    
    const files = await getFilesByFolder(sourceFolder);
    console.log(`   Found ${files.length} files`);
    
    for (const filePath of files) {
      totalFiles++;
      const fileName = path.basename(filePath);
      
      // Determine destination based on file structure
      let destPath;
      
      // If file is in deal-specific folder, preserve that structure
      if (filePath.includes('deal-')) {
        const dealMatch = filePath.match(/deal-(\d+)/);
        if (dealMatch) {
          const dealId = dealMatch[1];
          destPath = path.join(STORAGE_ROOT, `deal-${dealId}`, fileName);
        } else {
          destPath = path.join(STORAGE_ROOT, 'temp', fileName);
        }
      } else {
        // Move to temp folder for processing
        destPath = path.join(STORAGE_ROOT, 'temp', fileName);
      }
      
      // Avoid overwriting existing files
      let counter = 1;
      let finalDestPath = destPath;
      while (true) {
        try {
          await fs.access(finalDestPath);
          // File exists, add counter
          const ext = path.extname(fileName);
          const base = path.basename(fileName, ext);
          const dir = path.dirname(destPath);
          finalDestPath = path.join(dir, `${base}_${counter}${ext}`);
          counter++;
        } catch {
          // File doesn't exist, we can use this path
          break;
        }
      }
      
      const success = await moveFile(filePath, finalDestPath);
      if (success) movedFiles++;
    }
    
    // Remove empty source directory if possible
    try {
      const remainingItems = await fs.readdir(sourceFolder);
      if (remainingItems.length === 0) {
        await fs.rmdir(sourceFolder);
        console.log(`   Removed empty folder: ${sourceFolder}`);
      }
    } catch {
      // Folder not empty or doesn't exist
    }
    
    console.log('');
  }
  
  console.log('✅ Document consolidation complete!');
  console.log(`📊 Summary: ${movedFiles}/${totalFiles} files successfully moved`);
  console.log(`📁 New storage location: ${STORAGE_ROOT}/`);
  
  // List final structure
  console.log('\n📋 Final storage structure:');
  await listDirectory(STORAGE_ROOT, '');
}

async function listDirectory(dirPath, indent) {
  try {
    const items = await fs.readdir(dirPath, { withFileTypes: true });
    for (const item of items) {
      if (item.isDirectory()) {
        console.log(`${indent}📁 ${item.name}/`);
        await listDirectory(path.join(dirPath, item.name), indent + '  ');
      } else {
        console.log(`${indent}📄 ${item.name}`);
      }
    }
  } catch (error) {
    console.log(`${indent}❌ Cannot read directory`);
  }
}

// Run the consolidation
consolidateDocuments().catch(console.error);