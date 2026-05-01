import { db } from '../database/connection';
import { AppError } from '../middleware/error.middleware';
import { API_ERRORS } from '@cotion/shared';
import { DocumentCreateInput, DocumentUpdateInput } from '@cotion/shared';

// Helper function to transform snake_case DB columns to camelCase for API response
function mapDocumentToResponse(row: any): any {
  const doc: any = {
    id: row.id,
    title: row.title,
    category: row.category,
    fileId: row.file_id,
    pageId: row.page_id,
    description: row.description,
    workspace: row.workspace,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  // Include file metadata if joined
  if (row.file_name) {
    doc.fileName = row.file_name;
    doc.fileMimeType = row.file_mime_type;
    doc.fileSize = row.file_size;
  }
  return doc;
}

function mapDocumentsToResponse(rows: any[]): any[] {
  return rows.map(mapDocumentToResponse);
}

export class DocumentsService {
  static async getAll(workspace: string, category?: string, search?: string): Promise<any[]> {
    const query = db('documents')
      .leftJoin('files', 'documents.file_id', 'files.id')
      .where('documents.workspace', workspace)
      .orderBy('documents.created_at', 'desc')
      .select(
        'documents.*',
        'files.original_name as file_name',
        'files.mime_type as file_mime_type',
        'files.size as file_size'
      );

    if (category) {
      query.where('documents.category', category);
    }
    if (search) {
      query.where(function () {
        this.where('documents.title', 'ilike', `%${search}%`)
          .orWhere('documents.description', 'ilike', `%${search}%`);
      });
    }

    const rows = await query;
    return mapDocumentsToResponse(rows);
  }

  static async getById(id: string): Promise<any | null> {
    const row = await db('documents')
      .leftJoin('files', 'documents.file_id', 'files.id')
      .where('documents.id', id)
      .select(
        'documents.*',
        'files.original_name as file_name',
        'files.mime_type as file_mime_type',
        'files.size as file_size'
      )
      .first();

    return row ? mapDocumentToResponse(row) : null;
  }

  static async create(input: DocumentCreateInput, userId: string): Promise<any> {
    const [row] = await db('documents')
      .insert({
        title: input.title,
        category: input.category || 'other',
        file_id: input.fileId || null,
        page_id: input.pageId || null,
        description: input.description || null,
        workspace: input.workspace,
        created_by: userId,
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      })
      .returning('*');

    return mapDocumentToResponse(row);
  }

  static async update(id: string, input: DocumentUpdateInput): Promise<any> {
    const existing = await db('documents')
      .where({ id })
      .first();

    if (!existing) {
      throw new AppError(404, API_ERRORS.NOT_FOUND, '문서를 찾을 수 없습니다');
    }

    const updateFields: any = { updated_at: db.fn.now() };
    if (input.title !== undefined) updateFields.title = input.title;
    if (input.category !== undefined) updateFields.category = input.category;
    if (input.fileId !== undefined) updateFields.file_id = input.fileId;
    if (input.pageId !== undefined) updateFields.page_id = input.pageId;
    if (input.description !== undefined) updateFields.description = input.description;

    const [updatedRow] = await db('documents')
      .where({ id })
      .update(updateFields)
      .returning('*');

    return mapDocumentToResponse(updatedRow);
  }

  static async delete(id: string): Promise<void> {
    const existing = await db('documents')
      .where({ id })
      .first();

    if (!existing) {
      throw new AppError(404, API_ERRORS.NOT_FOUND, '문서를 찾을 수 없습니다');
    }

    await db('documents')
      .where({ id })
      .delete();
  }
}
