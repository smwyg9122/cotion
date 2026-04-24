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

    if (!workspace) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'workspace is required',
        },
      });
    }

    const documents = await DocumentsService.getAll(workspace, category, search);

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
};
