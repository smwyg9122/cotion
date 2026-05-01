import { db } from '../database/connection';
import { AppError } from '../middleware/error.middleware';
import { API_ERRORS } from '@cotion/shared';
import { Document, DocumentCreateInput, DocumentUpdateInput } from '@cotion/shared';

// Helper function to transform snake_case DB columns to camelCase for API response
function mapDocumentToResponse(row: any): Document {
  return {
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
}

function mapDocumentsToResponse(rows: any[]): Document[] {
  return rows.map(mapDocumentToResponse);
}

export class DocumentsService {
  static async getAll(workspace: string, category?: string, search?: string): Promise<Document[]> {
    const query = db('documents')
      .where({ workspace })
      .orderBy('created_at', 'desc')
      .select('*');

    if (category) {
      query.where('category', category);
    }
    if (search) {
      query.where(function () {
        this.where('title', 'ilike', `%${search}%`)
          .orWhere('description', 'ilike', `%${search}%`);
      });
    }

    const rows = await query;
    return mapDocumentsToResponse(rows);
  }

  static async getById(id: string): Promise<Document | null> {
    const row = await db('documents')
      .where({ id })
      .first();

    return row ? mapDocumentToResponse(row) : null;
  }

  static async create(input: DocumentCreateInput, userId: string): Promise<Document> {
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

  static async update(id: string, input: DocumentUpdateInput): Promise<Document> {
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
