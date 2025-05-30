import { pool } from '../db';

export interface DocumentBlob {
  id: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  dealId: number;
}

export async function saveDocumentBlob(
  dealId: number, 
  fileName: string, 
  fileType: string, 
  fileSize: number,
  data: Buffer,
  uploadedBy: number,
  description?: string,
  documentType?: string
): Promise<DocumentBlob> {
  const { rows } = await pool.query(
    `INSERT INTO documents (deal_id, file_name, file_type, file_size, file_data, uploaded_by, description, document_type)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
     RETURNING id, file_name AS "fileName", file_type AS "fileType", file_size AS "fileSize", deal_id AS "dealId"`,
    [dealId, fileName, fileType, fileSize, data, uploadedBy, description || '', documentType || 'other']
  );
  return rows[0];
}

export async function getDocumentBlob(id: number): Promise<{
  fileName: string;
  fileType: string;
  fileData: Buffer;
} | null> {
  const { rows } = await pool.query(
    `SELECT file_name AS "fileName", file_type AS "fileType", file_data AS "fileData"
     FROM documents WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

export async function listDocumentsByDeal(dealId: number): Promise<DocumentBlob[]> {
  const { rows } = await pool.query(
    `SELECT id, file_name AS "fileName", file_type AS "fileType", file_size AS "fileSize", deal_id AS "dealId"
     FROM documents 
     WHERE deal_id = $1 
     ORDER BY uploaded_at DESC`,
    [dealId]
  );
  return rows;
}

export async function deleteDocumentBlob(id: number): Promise<boolean> {
  const { rowCount } = await pool.query(
    `DELETE FROM documents WHERE id = $1`,
    [id]
  );
  return (rowCount || 0) > 0;
}