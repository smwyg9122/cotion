import { Response } from 'express';
import { PagesService } from '../services/pages.service';
import { asyncHandler } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';
import { pageCreateSchema, pageUpdateSchema, pageMoveSchema } from '@cotion/shared';
import { ActivityLogService } from '../services/activity-log.service';

export const pagesController = {
  getAll: asyncHandler(async (req: AuthRequest, res: Response) => {
    const pages = await PagesService.getAllPages(req.user!.userId);

    res.json({
      success: true,
      data: pages,
    });
  }),

  search: asyncHandler(async (req: AuthRequest, res: Response) => {
    const query = (req.query.q as string) || '';
    if (!query.trim()) {
      return res.json({ success: true, data: [] });
    }

    const results = await PagesService.searchPages(query.trim(), req.user!.userId);

    res.json({
      success: true,
      data: results,
    });
  }),

  getById: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const page = await PagesService.getPageById(id, req.user!.userId);

    if (!page) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '페이지를 찾을 수 없습니다',
        },
      });
    }

    res.json({
      success: true,
      data: page,
    });
  }),

  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const input = pageCreateSchema.parse(req.body);
    const page = await PagesService.createPage(input, req.user!.userId);

    ActivityLogService.log(req.user!.userId, 'page_create', 'page', page.id, { title: page.title });

    res.status(201).json({
      success: true,
      data: page,
    });
  }),

  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const input = pageUpdateSchema.parse(req.body);
    const page = await PagesService.updatePage(id, input, req.user!.userId);

    ActivityLogService.log(req.user!.userId, 'page_update', 'page', id, { title: req.body.title });

    res.json({
      success: true,
      data: page,
    });
  }),

  delete: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    await PagesService.deletePage(id, req.user!.userId);

    ActivityLogService.log(req.user!.userId, 'page_delete', 'page', id);

    res.json({
      success: true,
      data: { message: '페이지가 휴지통으로 이동되었습니다' },
    });
  }),

  getDeleted: asyncHandler(async (req: AuthRequest, res: Response) => {
    const isSuperAdmin = req.user!.role === 'superadmin';
    const pages = await PagesService.getDeletedPages(req.user!.userId, isSuperAdmin);

    res.json({
      success: true,
      data: pages,
    });
  }),

  restore: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    await PagesService.restorePage(id, req.user!.userId);

    res.json({
      success: true,
      data: { message: '페이지가 복원되었습니다' },
    });
  }),

  permanentDelete: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    await PagesService.permanentDeletePage(id, req.user!.userId);

    res.json({
      success: true,
      data: { message: '페이지가 영구적으로 삭제되었습니다' },
    });
  }),

  getChildren: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const children = await PagesService.getChildren(id, req.user!.userId);

    res.json({
      success: true,
      data: children,
    });
  }),

  getBreadcrumb: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const breadcrumb = await PagesService.getBreadcrumb(id, req.user!.userId);

    res.json({
      success: true,
      data: breadcrumb,
    });
  }),

  move: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const input = pageMoveSchema.parse(req.body);
    const page = await PagesService.movePage(id, input, req.user!.userId);

    res.json({
      success: true,
      data: page,
    });
  }),

  renameCategory: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { workspace, oldName, newName } = req.body;
    if (!workspace || !oldName || !newName) {
      return res.status(400).json({ success: false, error: 'workspace, oldName, newName 필수' });
    }
    const count = await PagesService.renameCategory(workspace, oldName, newName.trim());
    res.json({ success: true, data: { updatedCount: count } });
  }),

  deleteCategory: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { workspace, categoryName } = req.body;
    if (!workspace || !categoryName) {
      return res.status(400).json({ success: false, error: 'workspace, categoryName 필수' });
    }
    const count = await PagesService.deleteCategory(workspace, categoryName);
    res.json({ success: true, data: { updatedCount: count } });
  }),
};
