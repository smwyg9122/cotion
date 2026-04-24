export interface Project {
  id: string;
  title: string;
  description: string | null;
  status: string;
  workspace: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectCreateInput {
  title: string;
  description?: string;
  status?: string;
  workspace: string;
}

export interface ProjectUpdateInput {
  title?: string;
  description?: string;
  status?: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  position: number;
  dueDate: string | null;
  assignees: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskCreateInput {
  title: string;
  description?: string;
  status?: 'todo' | 'in_progress' | 'done';
  priority?: 'low' | 'medium' | 'high';
  position?: number;
  dueDate?: string;
  assignees?: string[];
}

export interface TaskUpdateInput {
  title?: string;
  description?: string;
  status?: 'todo' | 'in_progress' | 'done';
  priority?: 'low' | 'medium' | 'high';
  position?: number;
  dueDate?: string | null;
  assignees?: string[];
}

export interface TaskMoveInput {
  status: 'todo' | 'in_progress' | 'done';
  position: number;
}
