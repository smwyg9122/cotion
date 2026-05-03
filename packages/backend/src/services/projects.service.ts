import { db } from '../database/connection';
import { AppError } from '../middleware/error.middleware';
import { API_ERRORS } from '@cotion/shared';
import { ActivityLogService } from './activity-log.service';
import { NotificationsService } from './notifications.service';
import {
  Project,
  ProjectCreateInput,
  ProjectUpdateInput,
  Task,
  TaskAssignee,
  TaskCreateInput,
  TaskUpdateInput,
  TaskMoveInput,
} from '@cotion/shared';

// Helper function to transform snake_case DB columns to camelCase for API response
function mapProjectToResponse(row: any): Project {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    workspace: row.workspace,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapProjectsToResponse(rows: any[]): Project[] {
  return rows.map(mapProjectToResponse);
}

function mapTaskToResponse(row: any, assignees: TaskAssignee[] = []): Task {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    position: row.position,
    dueDate: row.due_date,
    assignees: assignees,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Helper to fetch assignees with user info for a list of tasks
async function fetchTaskAssignees(taskIds: string[]): Promise<Record<string, TaskAssignee[]>> {
  if (taskIds.length === 0) return {};

  const rows = await db('task_assignees')
    .join('users', 'task_assignees.user_id', 'users.id')
    .whereIn('task_assignees.task_id', taskIds)
    .select('task_assignees.task_id', 'task_assignees.user_id', 'users.name', 'users.username');

  const map: Record<string, TaskAssignee[]> = {};
  for (const row of rows) {
    if (!map[row.task_id]) {
      map[row.task_id] = [];
    }
    map[row.task_id].push({
      id: row.user_id,
      nickname: row.name || row.username,
      email: row.username,
    });
  }
  return map;
}

export class ProjectsService {
  // ── Projects ──

  static async getAll(workspace: string): Promise<Project[]> {
    const rows = await db('projects')
      .where({ workspace })
      .orderBy('created_at', 'desc')
      .select('*');

    return mapProjectsToResponse(rows);
  }

  static async getById(id: string): Promise<Project | null> {
    const row = await db('projects')
      .where({ id })
      .first();

    return row ? mapProjectToResponse(row) : null;
  }

  static async create(input: ProjectCreateInput, userId: string): Promise<Project> {
    const [row] = await db('projects')
      .insert({
        title: input.title,
        description: input.description || null,
        status: input.status || 'active',
        workspace: input.workspace,
        created_by: userId,
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      })
      .returning('*');

    const project = mapProjectToResponse(row);

    ActivityLogService.log(userId, 'project_create', 'project', project.id, { title: project.title });

    return project;
  }

  static async update(id: string, input: ProjectUpdateInput): Promise<Project> {
    const existing = await db('projects')
      .where({ id })
      .first();

    if (!existing) {
      throw new AppError(404, API_ERRORS.NOT_FOUND, '프로젝트를 찾을 수 없습니다');
    }

    const updateFields: any = { updated_at: db.fn.now() };
    if (input.title !== undefined) updateFields.title = input.title;
    if (input.description !== undefined) updateFields.description = input.description;
    if (input.status !== undefined) updateFields.status = input.status;

    const [updatedRow] = await db('projects')
      .where({ id })
      .update(updateFields)
      .returning('*');

    return mapProjectToResponse(updatedRow);
  }

  static async delete(id: string): Promise<void> {
    const existing = await db('projects')
      .where({ id })
      .first();

    if (!existing) {
      throw new AppError(404, API_ERRORS.NOT_FOUND, '프로젝트를 찾을 수 없습니다');
    }

    // Delete associated tasks and their assignees first
    const taskIds = await db('tasks')
      .where({ project_id: id })
      .pluck('id');

    if (taskIds.length > 0) {
      await db('task_assignees')
        .whereIn('task_id', taskIds)
        .delete();
    }

    await db('tasks')
      .where({ project_id: id })
      .delete();

    await db('projects')
      .where({ id })
      .delete();

    // Note: delete method doesn't have userId parameter, skipping activity log
  }

  // ── Tasks ──

  static async getTasks(projectId: string, status?: string): Promise<Task[]> {
    const query = db('tasks')
      .where({ project_id: projectId })
      .orderBy('position', 'asc')
      .select('*');

    if (status) {
      query.where('status', status);
    }

    const rows = await query;
    const taskIds = rows.map((r: any) => r.id);
    const assigneesMap = await fetchTaskAssignees(taskIds);

    return rows.map((row: any) => mapTaskToResponse(row, assigneesMap[row.id] || []));
  }

  static async createTask(projectId: string, input: TaskCreateInput, userId: string): Promise<Task> {
    const project = await db('projects')
      .where({ id: projectId })
      .first();

    if (!project) {
      throw new AppError(404, API_ERRORS.NOT_FOUND, '프로젝트를 찾을 수 없습니다');
    }

    // Determine position if not provided
    let position = input.position;
    if (position === undefined) {
      const maxPos = await db('tasks')
        .where({ project_id: projectId, status: input.status || 'todo' })
        .max('position as max')
        .first();
      position = (maxPos?.max ?? -1) + 1;
    }

    const [row] = await db('tasks')
      .insert({
        project_id: projectId,
        title: input.title,
        description: input.description || null,
        status: input.status || 'todo',
        priority: input.priority || 'medium',
        position: position,
        due_date: input.dueDate || null,
        created_by: userId,
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      })
      .returning('*');

    // Insert assignees if provided
    const assignees = input.assignees || [];
    if (assignees.length > 0) {
      const assigneeRows = assignees.map((userId: string) => ({
        task_id: row.id,
        user_id: userId,
      }));
      await db('task_assignees').insert(assigneeRows);

      // 인앱 알림 + 카카오톡 알림
      NotificationsService.notifyMany(
        assignees,
        userId,
        'task_assign',
        `"${input.title}" 업무가 배정되었습니다.`,
        '새 업무 배정'
      ).catch(() => {});
    }

    ActivityLogService.log(userId, 'task_create', 'task', row.id, { title: input.title });

    // Fetch assignees with user info for response
    const assigneesMap = await fetchTaskAssignees([row.id]);
    return mapTaskToResponse(row, assigneesMap[row.id] || []);
  }

  static async updateTask(id: string, input: TaskUpdateInput, userId?: string): Promise<Task> {
    const existing = await db('tasks')
      .where({ id })
      .first();

    if (!existing) {
      throw new AppError(404, API_ERRORS.NOT_FOUND, '태스크를 찾을 수 없습니다');
    }

    const updateFields: any = { updated_at: db.fn.now() };
    if (input.title !== undefined) updateFields.title = input.title;
    if (input.description !== undefined) updateFields.description = input.description;
    if (input.status !== undefined) updateFields.status = input.status;
    if (input.priority !== undefined) updateFields.priority = input.priority;
    if (input.position !== undefined) updateFields.position = input.position;
    if (input.dueDate !== undefined) updateFields.due_date = input.dueDate;

    const [updatedRow] = await db('tasks')
      .where({ id })
      .update(updateFields)
      .returning('*');

    // Update assignees if provided
    if (input.assignees !== undefined) {
      // Get old assignees for comparison
      const oldAssigneeRows = await db('task_assignees').where({ task_id: id }).select('user_id');
      const oldAssigneeIds = oldAssigneeRows.map((r: any) => r.user_id);

      await db('task_assignees')
        .where({ task_id: id })
        .delete();

      if (input.assignees.length > 0) {
        const assigneeRows = input.assignees.map((userId: string) => ({
          task_id: id,
          user_id: userId,
        }));
        await db('task_assignees').insert(assigneeRows);

        // Notify newly added assignees only
        const newAssignees = input.assignees.filter((uid: string) => !oldAssigneeIds.includes(uid));
        if (newAssignees.length > 0 && userId) {
          const taskTitle = input.title || existing.title;
          NotificationsService.notifyMany(
            newAssignees,
            userId,
            'task_assign',
            `"${taskTitle}" 업무가 배정되었습니다.`,
            '업무 담당 배정'
          ).catch(() => {});
        }
      }
    }

    // Fetch current assignees
    const assigneesMap = await fetchTaskAssignees([id]);
    return mapTaskToResponse(updatedRow, assigneesMap[id] || []);
  }

  static async moveTask(id: string, status: string, position: number): Promise<Task> {
    const existing = await db('tasks')
      .where({ id })
      .first();

    if (!existing) {
      throw new AppError(404, API_ERRORS.NOT_FOUND, '태스크를 찾을 수 없습니다');
    }

    const [updatedRow] = await db('tasks')
      .where({ id })
      .update({
        status: status,
        position: position,
        updated_at: db.fn.now(),
      })
      .returning('*');

    const assigneesMap = await fetchTaskAssignees([id]);
    return mapTaskToResponse(updatedRow, assigneesMap[id] || []);
  }

  static async deleteTask(id: string): Promise<void> {
    const existing = await db('tasks')
      .where({ id })
      .first();

    if (!existing) {
      throw new AppError(404, API_ERRORS.NOT_FOUND, '태스크를 찾을 수 없습니다');
    }

    await db('task_assignees')
      .where({ task_id: id })
      .delete();

    await db('tasks')
      .where({ id })
      .delete();
  }
}
