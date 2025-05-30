import { db } from '../db';
import { documents } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import * as fs from 'fs/promises';
import * as path from 'path';

export class UnifiedDocumentStorage {
  
  async getDocumentsByDeal(dealId: number) {
    try {
      const result = await db
        .select()
        .from(documents)
        .where(eq(documents.dealId, dealId))
        .orderBy(documents.uploadedAt);
      
      return result;
    } catch (error) {
      console.error('Error fetching documents by deal:', error);
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
      
      return newDocument;
    } catch (error) {
      console.error('Error creating document:', error);
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