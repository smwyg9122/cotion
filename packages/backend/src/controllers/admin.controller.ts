import { Response } from 'express';
import { AdminService } from '../services/admin.service';
import { asyncHandler } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';

export const adminController = {
  // =====================
  // User Management
  // =====================

  getAllUsers: asyncHandler(async (req: AuthRequest, res: Response) => {
    const users = await AdminService.getAllUsersAdmin();

    res.json({
      success: true,
      data: users,
    });
  }),

  toggleUserActive: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'is_active (boolean) 값이 필요합니다',
        },
      });
    }

    const result = await AdminService.toggleUserActive(id, is_active);

    res.json({
      success: true,
      data: result,
    });
  }),

  updateUserWorkspaces: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { workspaces } = req.body;

    if (!Array.isArray(workspaces)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'workspaces (string[]) 값이 필요합니다',
        },
      });
    }

    const result = await AdminService.updateUserWorkspaces(id, workspaces);

    res.json({
      success: true,
      data: result,
    });
  }),

  resetUserPassword: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const result = await AdminService.resetUserPassword(id);

    res.json({
      success: true,
      data: result,
    });
  }),

  createUser: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { email, password, name, role, allowed_workspaces } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'email, password, name은 필수 항목입니다',
        },
      });
    }

    const user = await AdminService.createUser({
      email,
      password,
      name,
      role,
      allowed_workspaces,
    });

    res.status(201).json({
      success: true,
      data: user,
    });
  }),

  // =====================
  // Content Management
  // =====================

  getAllPages: asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspace = req.query.workspace as string | undefined;
    const pages = await AdminService.getAllPages(workspace);

    res.json({
      success: true,
      data: pages,
    });
  }),

  restoreDeletedPage: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const result = await AdminService.restoreDeletedPage(id);

    res.json({
      success: true,
      data: result,
    });
  }),

  getProjectsDashboard: asyncHandler(async (req: AuthRequest, res: Response) => {
    const projects = await AdminService.getProjectsDashboard();

    res.json({
      success: true,
      data: projects,
    });
  }),

  getTasksDashboard: asyncHandler(async (req: AuthRequest, res: Response) => {
    const tasks = await AdminService.getTasksDashboard();

    res.json({
      success: true,
      data: tasks,
    });
  }),

  // =====================
  // System Management
  // =====================

  getActivityLogs: asyncHandler(async (req: AuthRequest, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const result = await AdminService.getActivityLogs(limit, offset);

    res.json({
      success: true,
      data: result,
    });
  }),

  getKakaoNotificationLogs: asyncHandler(async (req: AuthRequest, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const result = await AdminService.getKakaoNotificationLogs(limit, offset);

    res.json({
      success: true,
      data: result,
    });
  }),

  getFileStats: asyncHandler(async (req: AuthRequest, res: Response) => {
    const stats = await AdminService.getFileStats();

    res.json({
      success: true,
      data: stats,
    });
  }),

  getSystemStats: asyncHandler(async (req: AuthRequest, res: Response) => {
    const stats = await AdminService.getSystemStats();

    res.json({
      success: true,
      data: stats,
    });
  }),

  // =====================
  // Workspace Management
  // =====================

  getWorkspaces: asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspaces = await AdminService.getWorkspaces();

    res.json({
      success: true,
      data: workspaces,
    });
  }),

  createWorkspace: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'name은 필수 항목입니다',
        },
      });
    }

    const workspace = await AdminService.createWorkspace(name, description || null, req.user!.userId);

    res.status(201).json({
      success: true,
      data: workspace,
    });
  }),

  deleteWorkspace: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const result = await AdminService.deleteWorkspace(id);

    res.json({
      success: true,
      data: result,
    });
  }),

  getWorkspaceMembers: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { name } = req.params;
    const members = await AdminService.getWorkspaceMembers(decodeURIComponent(name));

    res.json({
      success: true,
      data: members,
    });
  }),

  addWorkspaceMember: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { name } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'userId는 필수 항목입니다',
        },
      });
    }

    const result = await AdminService.addWorkspaceMember(decodeURIComponent(name), userId);

    res.json({
      success: true,
      data: result,
    });
  }),

  removeWorkspaceMember: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { name, userId } = req.params;
    const result = await AdminService.removeWorkspaceMember(decodeURIComponent(name), userId);

    res.json({
      success: true,
      data: result,
    });
  }),
};
