# Document Management System Cleanup & Consolidation Checklist

## Current Scattered Storage Locations (PROBLEMS):
- [ ] `./uploads/` - Main upload folder
- [ ] `./data/uploads/` - Duplicate upload folder  
- [ ] `./public/documents/` - Public documents folder
- [ ] `./public/uploads/` - Public uploads folder
- [ ] `./server/modules/documents/` - Server document modules
- [ ] Multiple document service files scattered across codebase

## Target: Single Unified Document Storage System

### ✅ PHASE 1: CODE CONSOLIDATION (COMPLETED)
- [x] Created unified document manager service
- [x] Consolidated document routes into single endpoint
- [x] Removed duplicate document route files
- [x] Fixed database schema compatibility issues

### 🔄 PHASE 2: STORAGE CONSOLIDATION (IN PROGRESS)
- [ ] **Step 1**: Audit all document folders and their contents
- [ ] **Step 2**: Migrate all documents to single `./storage/documents/` folder
- [ ] **Step 3**: Update database records with correct file paths
- [ ] **Step 4**: Remove empty/duplicate folders
- [ ] **Step 5**: Update all references to use unified storage path

### 📋 PHASE 3: SYSTEM VERIFICATION
- [ ] **Step 1**: Test document upload functionality
- [ ] **Step 2**: Test document viewing/download
- [ ] **Step 3**: Verify database integrity
- [ ] **Step 4**: Test PDF viewer functionality
- [ ] **Step 5**: Confirm deal-document associations work

### 🎯 FINAL TARGET ARCHITECTURE:
```
./storage/
  └── documents/
      ├── deal-[id]/
      │   ├── term-sheets/
      │   ├── financial-models/
      │   ├── legal-docs/
      │   └── other/
      └── temp/ (for processing)
```

### 🔧 UNIFIED API ENDPOINTS:
- `POST /api/documents/upload` - Upload documents
- `GET /api/documents/deal/:dealId` - Get documents for deal
- `GET /api/documents/:id/download` - Download document
- `DELETE /api/documents/:id` - Delete document

### 📊 DATABASE INTEGRATION:
- Single `documents` table with proper foreign keys
- Consistent file path format: `storage/documents/deal-[id]/[filename]`
- Metadata tracking: type, size, upload date, user

## NEXT IMMEDIATE ACTIONS NEEDED:
1. Consolidate all document storage folders
2. Update database file paths
3. Test end-to-end document workflow