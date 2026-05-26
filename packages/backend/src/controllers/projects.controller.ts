import { Response } from 'express';
import { ProjectsService } from '../services/projects.service';
import { asyncHandler } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';
import { projectCreateSchema, projectUpdateSchema, taskCreateSchema, taskUpdateSchema, taskMoveSchema } from '@cotion/shared';

export const projectsController = {
  getAll: asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspace = req.query.workspace as string;

    if (!workspace) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'workspace is required',
        },
      });
    }

    const projects = await ProjectsService.getAll(workspace);

    res.json({
      success: true,
      data: projects,
    });
  }),

  getById: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const workspace = (req.query.workspace as string) || '';
    if (!workspace) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'workspace is required' },
      });
    }
    const project = await ProjectsService.getById(id, workspace);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '프로젝트를 찾을 수 없습니다',
        },
      });
    }

    res.json({
      success: true,
      data: project,
    });
  }),

  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const input = projectCreateSchema.parse(req.body);
    const project = await ProjectsService.create(input, req.user!.userId);

    res.status(201).json({
      success: true,
      data: project,
    });
  }),

  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const workspace = (req.query.workspace as string) || '';
    if (!workspace) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'workspace is required' },
      });
    }
    const input = projectUpdateSchema.parse(req.body);
    const project = await ProjectsService.update(id, input, workspace);

    res.json({
      success: true,
      data: project,
    });
  }),

  delete: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const workspace = (req.query.workspace as string) || '';
    if (!workspace) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'workspace is required' },
      });
    }
    await ProjectsService.delete(id, workspace);

    res.json({
      success: true,
      data: { message: '프로젝트가 삭제되었습니다' },
    });
  }),

  // Task endpoints — workspace is needed because tasks inherit it from the
  // parent project. We accept it as a query param on every entry point.
  getTasks: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const workspace = (req.query.workspace as string) || '';
    if (!workspace) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'workspace is required' },
      });
    }
    const tasks = await ProjectsService.getTasks(id, undefined, workspace);

    res.json({
      success: true,
      data: tasks,
    });
  }),

  createTask: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const workspace = (req.query.workspace as string) || '';
    if (!workspace) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'workspace is required' },
      });
    }
    const input = taskCreateSchema.parse(req.body);
    const task = await ProjectsService.createTask(id, input, req.user!.userId, workspace);

    res.status(201).json({
      success: true,
      data: task,
    });
  }),

  updateTask: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { taskId } = req.params;
    const workspace = (req.query.workspace as string) || '';
    if (!workspace) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'workspace is required' },
      });
    }
    const input = taskUpdateSchema.parse(req.body);
    const task = await ProjectsService.updateTask(taskId, input, req.user!.userId, workspace);

    res.json({
      success: true,
      data: task,
    });
  }),

  moveTask: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { taskId } = req.params;
    const workspace = (req.query.workspace as string) || '';
    if (!workspace) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'workspace is required' },
      });
    }
    const input = taskMoveSchema.parse(req.body);
    const task = await ProjectsService.moveTask(taskId, input.status, input.position, workspace);

    res.json({
      success: true,
      data: task,
    });
  }),

  deleteTask: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { taskId } = req.params;
    const workspace = (req.query.workspace as string) || '';
    if (!workspace) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'workspace is required' },
      });
    }
    await ProjectsService.deleteTask(taskId, workspace);

    res.json({
      success: true,
      data: { message: '태스크가 삭제되었습니다' },
    });
  }),
};
