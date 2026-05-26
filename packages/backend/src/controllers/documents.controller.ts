import { Response } from 'express';
import { DocumentsService } from '../services/documents.service';
import { assertWorkspaceAccess } from '../services/pages.service';
import { asyncHandler } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';
import { documentCreateSchema, documentUpdateSchema } from '@cotion/shared';

export const documentsController = {
  getAll: asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspace = (req.query.workspace as string) || '';
    await assertWorkspaceAccess(req.user!.userId, workspace);

    const category = req.query.category as string;
    const search = req.query.search as string;
    const status = req.query.status as string;

    const documents = await DocumentsService.getAll(workspace, category, search, status);
    res.json({ success: true, data: documents });
  }),

  getById: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const workspace = (req.query.workspace as string) || '';
    await assertWorkspaceAccess(req.user!.userId, workspace);

    const document = await DocumentsService.getById(id, workspace);
    if (!document) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '문서를 찾을 수 없습니다' },
      });
    }
    res.json({ success: true, data: document });
  }),

  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const input = documentCreateSchema.parse(req.body);
    await assertWorkspaceAccess(req.user!.userId, input.workspace);

    const document = await DocumentsService.create(input, req.user!.userId);
    res.status(201).json({ success: true, data: document });
  }),

  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const workspace = (req.query.workspace as string) || '';
    await assertWorkspaceAccess(req.user!.userId, workspace);

    const input = documentUpdateSchema.parse(req.body);
    const document = await DocumentsService.update(id, input, workspace);
    res.json({ success: true, data: document });
  }),

  delete: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const workspace = (req.query.workspace as string) || '';
    await assertWorkspaceAccess(req.user!.userId, workspace);

    await DocumentsService.delete(id, workspace);
    res.json({ success: true, data: { message: '문서가 삭제되었습니다' } });
  }),

  // ─── Tags ──────────────────────────────────────────────────

  addTags: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const workspace = (req.query.workspace as string) || '';
    await assertWorkspaceAccess(req.user!.userId, workspace);

    const { userIds } = req.body as { userIds: string[] };
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'userIds 배열이 필요합니다' },
      });
    }

    const tags = await DocumentsService.addTags(id, userIds, req.user!.userId, workspace);
    res.json({ success: true, data: tags });
  }),

  removeTags: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const workspace = (req.query.workspace as string) || '';
    await assertWorkspaceAccess(req.user!.userId, workspace);

    const { userIds } = req.body as { userIds: string[] };
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'userIds 배열이 필요합니다' },
      });
    }

    const tags = await DocumentsService.removeTags(id, userIds, workspace);
    res.json({ success: true, data: tags });
  }),

  getTags: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    // tags exposed via document — caller must demonstrate access to the
    // parent doc, which we infer by requiring workspace in query.
    const workspace = (req.query.workspace as string) || '';
    await assertWorkspaceAccess(req.user!.userId, workspace);

    // Verify the doc actually belongs to that workspace before exposing tags.
    const doc = await DocumentsService.getById(id, workspace);
    if (!doc) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '문서를 찾을 수 없습니다' },
      });
    }
    const tags = await DocumentsService.getTagsByDocumentId(id);
    res.json({ success: true, data: tags });
  }),

  // ─── Status (kanban) ───────────────────────────────────────

  updateStatus: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const workspace = (req.query.workspace as string) || '';
    await assertWorkspaceAccess(req.user!.userId, workspace);

    const { status } = req.body as { status: string };
    if (!status) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'status가 필요합니다' },
      });
    }

    const document = await DocumentsService.updateStatus(id, status, workspace);
    res.json({ success: true, data: document });
  }),
};
