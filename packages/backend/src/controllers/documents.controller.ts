import { Response } from 'express';
import { DocumentsService } from '../services/documents.service';
import { asyncHandler } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';
import { documentCreateSchema, documentUpdateSchema } from '@cotion/shared';

export const documentsController = {
  getAll: asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspace = req.query.workspace as string;
    const category = req.query.category as string;
    const search = req.query.search as string;
    const status = req.query.status as string;

    if (!workspace) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'workspace is required',
        },
      });
    }

    const documents = await DocumentsService.getAll(workspace, category, search, status);

    res.json({
      success: true,
      data: documents,
    });
  }),

  getById: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const document = await DocumentsService.getById(id);

    if (!document) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '문서를 찾을 수 없습니다',
        },
      });
    }

    res.json({
      success: true,
      data: document,
    });
  }),

  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const input = documentCreateSchema.parse(req.body);
    const document = await DocumentsService.create(input, req.user!.userId);

    res.status(201).json({
      success: true,
      data: document,
    });
  }),

  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const input = documentUpdateSchema.parse(req.body);
    const document = await DocumentsService.update(id, input);

    res.json({
      success: true,
      data: document,
    });
  }),

  delete: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    await DocumentsService.delete(id);

    res.json({
      success: true,
      data: { message: '문서가 삭제되었습니다' },
    });
  }),

  // ��── Tags ──────────────────────────────────────────────────

  addTags: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { userIds } = req.body as { userIds: string[] };

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'userIds 배열이 필요합니다' },
      });
    }

    const tags = await DocumentsService.addTags(id, userIds, req.user!.userId);

    res.json({ success: true, data: tags });
  }),

  removeTags: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { userIds } = req.body as { userIds: string[] };

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'userIds 배열이 필요합니다' },
      });
    }

    const tags = await DocumentsService.removeTags(id, userIds);

    res.json({ success: true, data: tags });
  }),

  getTags: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const tags = await DocumentsService.getTagsByDocumentId(id);

    res.json({ success: true, data: tags });
  }),

  // ─── Status (kanban) ───────────────────────────────────────

  updateStatus: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { status } = req.body as { status: string };

    if (!status) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'status가 필요합니다' },
      });
    }

    const document = await DocumentsService.updateStatus(id, status);

    res.json({ success: true, data: document });
  }),
};
