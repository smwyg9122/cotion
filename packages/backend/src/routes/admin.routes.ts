import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { superadminMiddleware } from '../middleware/admin.middleware';

const router = Router();

// All routes require authentication + superadmin role
router.use(authMiddleware);
router.use(superadminMiddleware);

// User management
router.get('/users', adminController.getAllUsers);
router.put('/users/:id/toggle-active', adminController.toggleUserActive);
router.put('/users/:id/workspaces', adminController.updateUserWorkspaces);
router.post('/users/:id/reset-password', adminController.resetUserPassword);
router.post('/users', adminController.createUser);

// Content management
router.get('/pages', adminController.getAllPages);
router.post('/pages/:id/restore', adminController.restoreDeletedPage);
router.get('/dashboard/projects', adminController.getProjectsDashboard);
router.get('/dashboard/tasks', adminController.getTasksDashboard);

// System management
router.get('/logs/activity', adminController.getActivityLogs);
router.get('/logs/kakao', adminController.getKakaoNotificationLogs);
router.get('/stats/files', adminController.getFileStats);
router.get('/stats/system', adminController.getSystemStats);

// Workspace management
router.get('/workspaces', adminController.getWorkspaces);
router.post('/workspaces', adminController.createWorkspace);
router.delete('/workspaces/:id', adminController.deleteWorkspace);
router.get('/workspaces/:name/members', adminController.getWorkspaceMembers);
router.post('/workspaces/:name/members', adminController.addWorkspaceMember);
router.delete('/workspaces/:name/members/:userId', adminController.removeWorkspaceMember);

export default router;
