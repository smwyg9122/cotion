import { db } from '../database/connection';
import { AppError } from '../middleware/error.middleware';
import { API_ERRORS } from '@cotion/shared';
import { KakaoService } from './kakao.service';
import {
  Project,
  ProjectCreateInput,
  ProjectUpdateInput,
  Task,
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

function mapTaskToResponse(row: any, assignees: string[] = []): Task {
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

// Helper to fetch assignees for a list of tasks
async function fetchTaskAssignees(taskIds: string[]): Promise<Record<string, string[]>> {
  if (taskIds.length === 0) return {};

  const rows = await db('task_assignees')
    .whereIn('task_id', taskIds)
    .select('task_id', 'user_id');

  const map: Record<string, string[]> = {};
  for (const row of rows) {
    if (!map[row.task_id]) {
      map[row.task_id] = [];
    }
    map[row.task_id].push(row.user_id);
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

    return mapProjectToResponse(row);
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

      // Send Kakao notification to assignees
      KakaoService.notifyUsers(
        assignees,
        '새 업무 배정',
        `"${input.title}" 업무가 배정되었습니다.`,
        'https://cotion.vercel.app'
      );
    }

    return mapTaskToResponse(row, assignees);
  }

  static async updateTask(id: string, input: TaskUpdateInput): Promise<Task> {
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
        if (newAssignees.length > 0) {
          const taskTitle = input.title || existing.title;
          KakaoService.notifyUsers(
            newAssignees,
            '업무 담당 배정',
            `"${taskTitle}" 업무가 배정되었습니다.`,
            'https://cotion.vercel.app'
          );
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
