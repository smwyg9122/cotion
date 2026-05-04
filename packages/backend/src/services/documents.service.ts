import { db } from '../database/connection';
import { AppError } from '../middleware/error.middleware';
import { API_ERRORS } from '@cotion/shared';
import { DocumentCreateInput, DocumentUpdateInput } from '@cotion/shared';
import { NotificationsService } from './notifications.service';

// Helper function to transform snake_case DB columns to camelCase for API response
function mapDocumentToResponse(row: any): any {
  const doc: any = {
    id: row.id,
    title: row.title,
    category: row.category,
    status: row.status || 'draft',
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

// Fetch tagged users for given document IDs
async function fetchDocumentTags(documentIds: string[]): Promise<Record<string, any[]>> {
  if (documentIds.length === 0) return {};

  const tags = await db('document_tags')
    .join('users', 'document_tags.user_id', 'users.id')
    .whereIn('document_tags.document_id', documentIds)
    .select(
      'document_tags.id',
      'document_tags.document_id',
      'document_tags.user_id',
      'users.name as user_name',
      'document_tags.created_at as tagged_at'
    );

  const map: Record<string, any[]> = {};
  for (const tag of tags) {
    const docId = tag.document_id;
    if (!map[docId]) map[docId] = [];
    map[docId].push({
      id: tag.id,
      userId: tag.user_id,
      userName: tag.user_name,
      taggedAt: tag.tagged_at,
    });
  }
  return map;
}

// ─── Auto-ensure schema (self-healing if migrations fail) ──────────
let _statusColumnReady = false;
async function ensureStatusColumn(): Promise<boolean> {
  if (_statusColumnReady) return true;
  try {
    const exists = await db.schema.hasColumn('documents', 'status');
    if (!exists) {
      await db.schema.alterTable('documents', (table) => {
        table.string('status', 30).notNullable().defaultTo('draft');
      });
      await db.schema.alterTable('documents', (table) => {
        table.index(['status'], 'idx_documents_status');
      });
      console.log('✅ Auto-created documents.status column');
    }
    _statusColumnReady = true;
    return true;
  } catch (err) {
    console.error('❌ Failed to ensure status column:', err);
    return false;
  }
}

let _tagsTableReady = false;
async function ensureDocumentTagsTable(): Promise<boolean> {
  if (_tagsTableReady) return true;
  try {
    const exists = await db.schema.hasTable('document_tags');
    if (!exists) {
      await db.schema.createTable('document_tags', (table) => {
        table.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
        table.uuid('document_id').notNullable().references('id').inTable('documents').onDelete('CASCADE');
        table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
        table.uuid('tagged_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
        table.timestamp('created_at').notNullable().defaultTo(db.fn.now());
        table.unique(['document_id', 'user_id']);
        table.index(['document_id'], 'idx_document_tags_document_id');
        table.index(['user_id'], 'idx_document_tags_user_id');
      });
      console.log('✅ Auto-created document_tags table');
    }
    _tagsTableReady = true;
    return true;
  } catch (err) {
    console.error('❌ Failed to ensure document_tags table:', err);
    return false;
  }
}

export class DocumentsService {
  static async getAll(workspace: string, category?: string, search?: string, status?: string): Promise<any[]> {
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
    if (status && await ensureStatusColumn()) {
      query.where('documents.status', status);
    }
    if (search) {
      query.where(function () {
        this.where('documents.title', 'ilike', `%${search}%`)
          .orWhere('documents.description', 'ilike', `%${search}%`);
      });
    }

    const rows = await query;
    const docs = mapDocumentsToResponse(rows);

    // Attach tagged users (only if table exists)
    if (await ensureDocumentTagsTable()) {
      const docIds = docs.map((d: any) => d.id);
      const tagsMap = await fetchDocumentTags(docIds);
      for (const doc of docs) {
        doc.taggedUsers = tagsMap[doc.id] || [];
      }
    }

    return docs;
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

    if (!row) return null;

    const doc = mapDocumentToResponse(row);
    if (await ensureDocumentTagsTable()) {
      const tagsMap = await fetchDocumentTags([doc.id]);
      doc.taggedUsers = tagsMap[doc.id] || [];
    }
    return doc;
  }

  static async create(input: DocumentCreateInput, userId: string): Promise<any> {
    const insertData: any = {
      title: input.title,
      category: input.category || 'other',
      file_id: input.fileId || null,
      page_id: input.pageId || null,
      description: input.description || null,
      workspace: input.workspace,
      created_by: userId,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    };

    // Only include status if the column exists in DB
    if (await ensureStatusColumn()) {
      insertData.status = (input as any).status || 'draft';
    }

    const [row] = await db('documents')
      .insert(insertData)
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
    if ((input as any).status !== undefined && await ensureStatusColumn()) {
      updateFields.status = (input as any).status;
    }
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

  // ─── Tag management ────────────────────────────────────────

  static async addTags(documentId: string, userIds: string[], taggedBy: string): Promise<any[]> {
    await ensureDocumentTagsTable();

    const existing = await db('documents').where({ id: documentId }).first();
    if (!existing) {
      throw new AppError(404, API_ERRORS.NOT_FOUND, '문서를 찾을 수 없습니다');
    }

    // Get already-tagged user IDs to avoid duplicates and identify new tags
    const existingTags = await db('document_tags')
      .where({ document_id: documentId })
      .select('user_id');
    const existingUserIds = new Set(existingTags.map((t: any) => t.user_id));

    const newUserIds = userIds.filter((uid) => !existingUserIds.has(uid));

    if (newUserIds.length > 0) {
      await db('document_tags').insert(
        newUserIds.map((userId) => ({
          document_id: documentId,
          user_id: userId,
          tagged_by: taggedBy,
        }))
      );

      // 인앱 알림 + 카카오톡 알림 (fire-and-forget)
      const ws = existing.workspace || '';
      NotificationsService.notifyMany(
        newUserIds,
        taggedBy,
        'document_tag',
        `[${ws}] "${existing.title}" 문서에 태그되었습니다.`,
        `📎 [${ws}] 문서 태그 알림`
      ).catch(() => {});
    }

    // Return all current tags
    const tagsMap = await fetchDocumentTags([documentId]);
    return tagsMap[documentId] || [];
  }

  static async removeTags(documentId: string, userIds: string[]): Promise<any[]> {
    await ensureDocumentTagsTable();

    const existing = await db('documents').where({ id: documentId }).first();
    if (!existing) {
      throw new AppError(404, API_ERRORS.NOT_FOUND, '문서를 찾을 수 없습니다');
    }

    await db('document_tags')
      .where({ document_id: documentId })
      .whereIn('user_id', userIds)
      .delete();

    const tagsMap = await fetchDocumentTags([documentId]);
    return tagsMap[documentId] || [];
  }

  static async getTagsByDocumentId(documentId: string): Promise<any[]> {
    await ensureDocumentTagsTable();
    const tagsMap = await fetchDocumentTags([documentId]);
    return tagsMap[documentId] || [];
  }

  // ─── Status update (for kanban drag) ───────────────────────

  static async updateStatus(id: string, status: string): Promise<any> {
    await ensureStatusColumn();

    const existing = await db('documents').where({ id }).first();
    if (!existing) {
      throw new AppError(404, API_ERRORS.NOT_FOUND, '문서를 찾을 수 없습니다');
    }

    const [updatedRow] = await db('documents')
      .where({ id })
      .update({ status, updated_at: db.fn.now() })
      .returning('*');

    return mapDocumentToResponse(updatedRow);
  }
}
