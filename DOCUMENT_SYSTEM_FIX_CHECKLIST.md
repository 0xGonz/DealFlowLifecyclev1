# Document System Fix Checklist

## Critical Issues Identified:

### 1. Database-Storage Path Mismatch ❌
- **Problem**: Document ID 64 points to `uploads/6db33e50-...pdf` but file is in `storage/documents/temp/6db33e50-...pdf`
- **Fix**: Update database record to correct path

### 2. Deal ID Assignment Error ❌
- **Problem**: Document for deal 84 (High Road Partners) is stored correctly in `storage/documents/deal-84/` but database record points to deal 48 (Valor Equity Partners)
- **Fix**: Update database record deal_id from 48 to 84

### 3. Broken Storage Factory Import ❌
- **Problem**: `documents-simple.ts` imports StorageFactory but calls fail
- **Fix**: Fix import and ensure proper storage connection

### 4. Schema Column Inconsistency ❌
- **Problem**: Mixed camelCase (`dealId`) and snake_case (`deal_id`) usage
- **Fix**: Standardize on schema column names

### 5. Multiple Competing Document Services ❌
- **Problem**: 5 different document services causing conflicts
- **Fix**: Consolidate to single active service

## Fix Order:

1. Fix immediate database-storage sync ⏳
2. Repair storage factory imports ⏳
3. Standardize schema usage ⏳
4. Remove unused services ⏳
5. Test document upload/download ⏳
6. Verify frontend displays correctly ⏳

## Status: In Progress