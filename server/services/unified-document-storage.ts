import { db } from '../db';
import { documents } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import * as fs from 'fs/promises';
import * as path from 'path';

export class UnifiedDocumentStorage {
  
  async getDocumentsByDeal(dealId: number) {
    try {
      console.log(`📁 Fetching documents for deal ${dealId}`);
      const result = await db
        .select()
        .from(documents)
        .where(eq(documents.dealId, dealId))
        .orderBy(documents.uploadedAt);
      
      console.log(`✅ Found ${result.length} documents for deal ${dealId}`);
      return result;
    } catch (error) {
      console.error(`❌ Error fetching documents for deal ${dealId}:`, error);
      return [];
    }
  }

  async getDocument(documentId: number) {
    try {
      const [document] = await db
        .select()
        .from(documents)
        .where(eq(documents.id, documentId));
      
      return document;
    } catch (error) {
      console.error('Error fetching document:', error);
      return null;
    }
  }

  async createDocument(documentData: any) {
    try {
      console.log(`📄 Creating document: ${documentData.fileName} for deal ${documentData.dealId}`);
      
      const [newDocument] = await db
        .insert(documents)
        .values({
          dealId: documentData.dealId,
          fileName: documentData.fileName,
          fileType: documentData.fileType,
          fileSize: documentData.fileSize,
          filePath: documentData.filePath,
          uploadedBy: documentData.uploadedBy,
          description: documentData.description || null,
          documentType: documentData.documentType || 'other'
        })
        .returning();
      
      console.log(`✅ Document created with ID: ${newDocument.id}`);
      return newDocument;
    } catch (error) {
      console.error(`❌ Error creating document ${documentData.fileName}:`, error);
      throw error;
    }
  }

  async validateFileType(fileName: string, mimeType: string): Promise<{ valid: boolean; reason?: string }> {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'image/jpeg',
      'image/png'
    ];

    const allowedExtensions = ['.pdf', '.docx', '.xlsx', '.xls', '.csv', '.jpg', '.jpeg', '.png'];
    const fileExtension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));

    if (!allowedTypes.includes(mimeType)) {
      return { valid: false, reason: `File type ${mimeType} not allowed` };
    }

    if (!allowedExtensions.includes(fileExtension)) {
      return { valid: false, reason: `File extension ${fileExtension} not allowed` };
    }

    return { valid: true };
  }

  async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
      console.log(`📁 Directory ensured: ${dirPath}`);
    } catch (error) {
      console.error(`❌ Error creating directory ${dirPath}:`, error);
      throw error;
    }
  }

  async downloadDocument(documentId: number) {
    try {
      const document = await this.getDocument(documentId);
      if (!document) {
        return null;
      }

      const fullPath = path.join(process.cwd(), document.filePath);
      const fileBuffer = await fs.readFile(fullPath);
      
      return {
        buffer: fileBuffer,
        fileName: document.fileName,
        mimeType: document.fileType
      };
    } catch (error) {
      console.error('Error downloading document:', error);
      return null;
    }
  }
}