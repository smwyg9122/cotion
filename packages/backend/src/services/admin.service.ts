import { db } from '../database/connection';
import { AppError } from '../middleware/error.middleware';
import { API_ERRORS } from '@cotion/shared';
import bcrypt from 'bcrypt';

const DEFAULT_PASSWORD = 'cotion123';
const SALT_ROUNDS = 10;

export class AdminService {
  // =====================
  // User Management
  // =====================

  static async getAllUsersAdmin() {
    const users = await db('users')
      .leftJoin('kakao_tokens', 'users.id', 'kakao_tokens.user_id')
      .select(
        'users.id',
        'users.email',
        'users.name',
        'users.username',
        'users.title',
        'users.avatar_url',
        'users.role',
        'users.is_active',
        'users.allowed_workspaces',
        'users.created_at',
        'users.updated_at',
        'users.last_login_at',
        db.raw('CASE WHEN kakao_tokens.user_id IS NOT NULL THEN true ELSE false END as kakao_linked')
      )
      .orderBy('users.created_at', 'asc');

    return users;
  }

  static async toggleUserActive(userId: string, isActive: boolean) {
    const user = await db('users').where({ id: userId }).first();
    if (!user) {
      throw new AppError(404, API_ERRORS.NOT_FOUND, '사용자를 찾을 수 없습니다');
    }

    await db('users').where({ id: userId }).update({ is_active: isActive });

    return { id: userId, is_active: isActive };
  }

  static async updateUserWorkspaces(userId: string, workspaces: string[]) {
    const user = await db('users').where({ id: userId }).first();
    if (!user) {
      throw new AppError(404, API_ERRORS.NOT_FOUND, '사용자를 찾을 수 없습니다');
    }

    await db('users').where({ id: userId }).update({
      allowed_workspaces: JSON.stringify(workspaces),
    });

    return { id: userId, allowed_workspaces: workspaces };
  }

  static async resetUserPassword(userId: string) {
    const user = await db('users').where({ id: userId }).first();
    if (!user) {
      throw new AppError(404, API_ERRORS.NOT_FOUND, '사용자를 찾을 수 없습니다');
    }

    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);
    await db('users').where({ id: userId }).update({ password_hash: hashedPassword });

    return { id: userId, message: '비밀번호가 초기화되었습니다' };
  }

  static async createUser(input: {
    email: string;
    password: string;
    name: string;
    role?: string;
    allowed_workspaces?: string[];
  }) {
    // Check if email already exists
    const existing = await db('users').where({ email: input.email }).first();
    if (existing) {
      throw new AppError(409, API_ERRORS.VALIDATION_ERROR, '이미 존재하는 이메일입니다');
    }

    const hashedPassword = await bcrypt.hash(input.password, SALT_ROUNDS);

    const [user] = await db('users')
      .insert({
        email: input.email,
        password_hash: hashedPassword,
        name: input.name,
        role: input.role || 'member',
        allowed_workspaces: JSON.stringify(input.allowed_workspaces || []),
        is_active: true,
      })
      .returning(['id', 'email', 'name', 'role', 'allowed_workspaces', 'is_active', 'created_at']);

    return user;
  }

  // =====================
  // Content Management
  // =====================

  static async getAllPages(workspace?: string) {
    let query = db('pages')
      .leftJoin('users', 'pages.created_by', 'users.id')
      .select(
        'pages.id',
        'pages.title',
        'pages.icon',
        'pages.workspace',
        'pages.category',
        'pages.is_deleted',
        'pages.deleted_at',
        'pages.created_by',
        'pages.created_at',
        'pages.updated_at',
        'users.name as creator_name'
      )
      .orderBy('pages.updated_at', 'desc');

    if (workspace) {
      query = query.where('pages.workspace', workspace);
    }

    return query;
  }

  static async restoreDeletedPage(pageId: string) {
    const page = await db('pages').where({ id: pageId }).first();
    if (!page) {
      throw new AppError(404, API_ERRORS.NOT_FOUND, '페이지를 찾을 수 없습니다');
    }

    if (!page.is_deleted) {
      throw new AppError(400, API_ERRORS.VALIDATION_ERROR, '삭제된 페이지가 아닙니다');
    }

    await db('pages').where({ id: pageId }).update({
      is_deleted: false,
      deleted_at: null,
      deleted_by: null,
    });

    return { id: pageId, message: '페이지가 복원되었습니다' };
  }

  static async getProjectsDashboard() {
    const projects = await db('projects')
      .leftJoin('users', 'projects.created_by', 'users.id')
      .select(
        'projects.id',
        'projects.title',
        'projects.status',
        'projects.workspace',
        'projects.created_by',
        'projects.created_at',
        'users.name as creator_name'
      )
      .orderBy('projects.created_at', 'desc');

    // Get task counts by status for each project
    const taskCounts = await db('tasks')
      .select('project_id', 'status')
      .count('* as count')
      .groupBy('project_id', 'status');

    const taskCountMap: Record<string, Record<string, number>> = {};
    for (const row of taskCounts) {
      if (!taskCountMap[row.project_id]) {
        taskCountMap[row.project_id] = {};
      }
      taskCountMap[row.project_id][row.status] = Number(row.count);
    }

    return projects.map((project: any) => ({
      ...project,
      task_counts: taskCountMap[project.id] || {},
    }));
  }

  static async getTasksDashboard() {
    const tasks = await db('tasks')
      .leftJoin('projects', 'tasks.project_id', 'projects.id')
      .leftJoin('task_assignees', 'tasks.id', 'task_assignees.task_id')
      .leftJoin('users', 'task_assignees.user_id', 'users.id')
      .select(
        'tasks.id',
        'tasks.title',
        'tasks.status',
        'tasks.priority',
        'tasks.due_date',
        'tasks.project_id',
        'tasks.created_at',
        'projects.title as project_title',
        'users.name as assignee_name',
        'users.id as assignee_id'
      )
      .orderBy('tasks.created_at', 'desc')
      .limit(100);

    return tasks;
  }

  // =====================
  // System Management
  // =====================

  static async getActivityLogs(limit: number = 50, offset: number = 0) {
    const logs = await db('activity_logs')
      .leftJoin('users', 'activity_logs.user_id', 'users.id')
      .select(
        'activity_logs.id',
        'activity_logs.user_id',
        'activity_logs.action',
        'activity_logs.target_type',
        'activity_logs.target_id',
        'activity_logs.details',
        'activity_logs.created_at',
        'users.name as user_name',
        'users.email as user_email'
      )
      .orderBy('activity_logs.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db('activity_logs').count('* as count');

    return { logs, total: Number(count) };
  }

  static async getKakaoNotificationLogs(limit: number = 50, offset: number = 0) {
    const logs = await db('kakao_notification_logs')
      .leftJoin('users', 'kakao_notification_logs.user_id', 'users.id')
      .select(
        'kakao_notification_logs.id',
        'kakao_notification_logs.user_id',
        'kakao_notification_logs.type',
        'kakao_notification_logs.message',
        'kakao_notification_logs.status',
        'kakao_notification_logs.created_at',
        'users.name as user_name',
        'users.email as user_email'
      )
      .orderBy('kakao_notification_logs.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db('kakao_notification_logs').count('* as count');

    return { logs, total: Number(count) };
  }

  static async getFileStats() {
    try {
      const [stats] = await db('files')
        .select(
          db.raw('COUNT(*) as file_count'),
          db.raw('COALESCE(SUM(size), 0) as total_size')
        );

      return {
        file_count: Number(stats.file_count),
        total_size: Number(stats.total_size),
      };
    } catch (err) {
      // files table might not exist
      return { file_count: 0, total_size: 0 };
    }
  }

  static async getSystemStats() {
    const [userCount] = await db('users').count('* as count');
    const [pageCount] = await db('pages').count('* as count');
    const [activePageCount] = await db('pages').where({ is_deleted: false }).count('* as count');
    const [deletedPageCount] = await db('pages').where({ is_deleted: true }).count('* as count');

    let projectCount = { count: 0 };
    let eventCount = { count: 0 };
    let fileCount = { count: 0 };

    try {
      [projectCount] = await db('projects').count('* as count');
    } catch (_) {}

    try {
      [eventCount] = await db('calendar_events').count('* as count');
    } catch (_) {}

    try {
      [fileCount] = await db('files').count('* as count');
    } catch (_) {}

    return {
      users: Number(userCount.count),
      pages: Number(pageCount.count),
      active_pages: Number(activePageCount.count),
      deleted_pages: Number(deletedPageCount.count),
      projects: Number(projectCount.count),
      events: Number(eventCount.count),
      files: Number(fileCount.count),
    };
  }

  // =====================
  // Workspace Management
  // =====================

  static async getWorkspaces() {
    return db('workspaces').orderBy('created_at', 'asc');
  }

  static async createWorkspace(name: string, description: string | null, userId: string) {
    const existing = await db('workspaces').where({ name }).first();
    if (existing) {
      throw new AppError(409, API_ERRORS.VALIDATION_ERROR, '이미 존재하는 워크스페이스 이름입니다');
    }

    const [workspace] = await db('workspaces')
      .insert({
        name,
        description,
        created_by: userId,
      })
      .returning('*');

    return workspace;
  }

  static async deleteWorkspace(id: string) {
    const workspace = await db('workspaces').where({ id }).first();
    if (!workspace) {
      throw new AppError(404, API_ERRORS.NOT_FOUND, '워크스페이스를 찾을 수 없습니다');
    }

    await db('workspaces').where({ id }).delete();

    return { id, message: '워크스페이스가 삭제되었습니다' };
  }

  static async getWorkspaceMembers(workspaceName: string) {
    // allowed_workspaces is a JSON string array in the users table
    const users = await db('users')
      .select('id', 'email', 'name', 'role', 'is_active', 'allowed_workspaces')
      .orderBy('name', 'asc');

    // Filter users whose allowed_workspaces includes the workspace name
    return users.filter((user: any) => {
      try {
        const workspaces = typeof user.allowed_workspaces === 'string'
          ? JSON.parse(user.allowed_workspaces)
          : user.allowed_workspaces;
        return Array.isArray(workspaces) && workspaces.includes(workspaceName);
      } catch {
        return false;
      }
    });
  }

  static async addWorkspaceMember(workspaceName: string, userId: string) {
    const user = await db('users').where({ id: userId }).first();
    if (!user) {
      throw new AppError(404, API_ERRORS.NOT_FOUND, '사용자를 찾을 수 없습니다');
    }

    let workspaces: string[] = [];
    try {
      workspaces = typeof user.allowed_workspaces === 'string'
        ? JSON.parse(user.allowed_workspaces)
        : user.allowed_workspaces || [];
    } catch {
      workspaces = [];
    }

    if (!Array.isArray(workspaces)) {
      workspaces = [];
    }

    if (workspaces.includes(workspaceName)) {
      throw new AppError(400, API_ERRORS.VALIDATION_ERROR, '이미 해당 워크스페이스에 속해있습니다');
    }

    workspaces.push(workspaceName);
    await db('users').where({ id: userId }).update({
      allowed_workspaces: JSON.stringify(workspaces),
    });

    return { userId, workspaceName, message: '워크스페이스 멤버가 추가되었습니다' };
  }

  static async removeWorkspaceMember(workspaceName: string, userId: string) {
    const user = await db('users').where({ id: userId }).first();
    if (!user) {
      throw new AppError(404, API_ERRORS.NOT_FOUND, '사용자를 찾을 수 없습니다');
    }

    let workspaces: string[] = [];
    try {
      workspaces = typeof user.allowed_workspaces === 'string'
        ? JSON.parse(user.allowed_workspaces)
        : user.allowed_workspaces || [];
    } catch {
      workspaces = [];
    }

    if (!Array.isArray(workspaces)) {
      workspaces = [];
    }

    const idx = workspaces.indexOf(workspaceName);
    if (idx === -1) {
      throw new AppError(400, API_ERRORS.VALIDATION_ERROR, '해당 워크스페이스에 속해있지 않습니다');
    }

    workspaces.splice(idx, 1);
    await db('users').where({ id: userId }).update({
      allowed_workspaces: JSON.stringify(workspaces),
    });

    return { userId, workspaceName, message: '워크스페이스 멤버가 제거되었습니다' };
  }
}
