import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Layout,
  Plus,
  Edit,
  Trash2,
  X,
  Check,
  Calendar,
  GripVertical,
  ChevronDown,
  User,
} from 'lucide-react';
import { api } from '../../services/api';
import { Modal } from '../common/Modal';

interface KanbanBoardProps {
  workspace: string;
  initialProjectId?: string | null;
}

interface Project {
  id: string;
  title: string;
  workspace: string;
}

interface TaskUser {
  id: string;
  nickname?: string;
  email?: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  assignees?: TaskUser[];
  dueDate?: string;
  projectId: string;
  createdAt?: string;
  updatedAt?: string;
}

interface TaskFormData {
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  assignees: string[];
  dueDate: string;
}

const INITIAL_TASK_FORM: TaskFormData = {
  title: '',
  description: '',
  status: 'todo',
  priority: 'medium',
  assignees: [],
  dueDate: '',
};

const COLUMNS: { key: Task['status']; label: string; color: string; bgColor: string }[] = [
  { key: 'todo', label: '할 일', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  { key: 'in_progress', label: '진행 중', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  { key: 'done', label: '완료', color: 'text-green-700', bgColor: 'bg-green-100' },
];

const PRIORITY_CONFIG: Record<Task['priority'], { label: string; color: string }> = {
  low: { label: '낮음', color: 'bg-gray-200 text-gray-700' },
  medium: { label: '보통', color: 'bg-blue-200 text-blue-700' },
  high: { label: '높음', color: 'bg-orange-200 text-orange-700' },
};

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500',
  'bg-pink-500', 'bg-cyan-500', 'bg-red-500', 'bg-indigo-500',
];

export function KanbanBoard({ workspace, initialProjectId }: KanbanBoardProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(initialProjectId || null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<TaskUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Project creation
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  // Task modal
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskForm, setTaskForm] = useState<TaskFormData>(INITIAL_TASK_FORM);
  const [deleteConfirmTaskId, setDeleteConfirmTaskId] = useState<string | null>(null);

  // Drag state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Project dropdown
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);

  // Fetch projects
  const fetchProjects = useCallback(async () => {
    try {
      const response = await api.get('/projects', { params: { workspace } });
      const projectList = response.data.data || [];
      setProjects(projectList);
      if (projectList.length > 0 && !selectedProjectId) {
        setSelectedProjectId(projectList[0].id);
      }
    } catch (err: any) {
      console.error('Failed to fetch projects:', err);
    }
  }, [workspace, selectedProjectId]);

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    if (!selectedProjectId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get(`/projects/${selectedProjectId}/tasks`);
      setTasks(response.data.data || []);
    } catch (err: any) {
      console.error('Failed to fetch tasks:', err);
      setError('작업 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedProjectId]);

  // Fetch users for assignee selection (filtered by workspace)
  const fetchUsers = useCallback(async () => {
    try {
      const response = await api.get('/auth/users', { params: { workspace } });
      const userList = response.data.data || response.data || [];
      setUsers(userList.map((u: any) => ({
        id: u.id,
        nickname: u.title ? `${u.name} ${u.title}` : u.name,
        email: u.email,
      })));
    } catch (err: any) {
      console.error('Failed to fetch users:', err);
    }
  }, [workspace]);

  // 외부에서 initialProjectId가 변경되면 반영
  useEffect(() => {
    if (initialProjectId) {
      setSelectedProjectId(initialProjectId);
    }
  }, [initialProjectId]);

  useEffect(() => {
    fetchProjects();
    fetchUsers();
  }, [fetchProjects, fetchUsers]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Create project
  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    try {
      const response = await api.post('/projects', { title: newProjectName, workspace });
      const newProject = response.data.data;
      setProjects((prev) => [...prev, newProject]);
      setSelectedProjectId(newProject.id);
      setNewProjectName('');
      setIsProjectModalOpen(false);
    } catch (err: any) {
      console.error('Failed to create project:', err);
      alert('프로젝트 생성에 실패했습니다.');
    }
  };

  // Task CRUD
  const handleOpenAddTask = (status: Task['status']) => {
    setSelectedTask(null);
    setTaskForm({ ...INITIAL_TASK_FORM, status });
    setIsTaskModalOpen(true);
  };

  const handleOpenEditTask = (task: Task) => {
    setSelectedTask(task);
    setTaskForm({
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      assignees: task.assignees?.map((a) => a.id) || [],
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
    });
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = async () => {
    if (!taskForm.title.trim() || !selectedProjectId) return;
    try {
      const payload = {
        title: taskForm.title,
        description: taskForm.description,
        status: taskForm.status,
        priority: taskForm.priority,
        assignees: taskForm.assignees,
        dueDate: taskForm.dueDate || null,
      };

      if (selectedTask) {
        await api.put(`/projects/tasks/${selectedTask.id}`, payload);
      } else {
        await api.post(`/projects/${selectedProjectId}/tasks`, payload);
      }
      await fetchTasks();
      setIsTaskModalOpen(false);
    } catch (err: any) {
      console.error('Failed to save task:', err);
      alert('작업 저장에 실패했습니다.');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await api.delete(`/projects/tasks/${taskId}`);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setDeleteConfirmTaskId(null);
      if (isTaskModalOpen && selectedTask?.id === taskId) {
        setIsTaskModalOpen(false);
      }
    } catch (err: any) {
      console.error('Failed to delete task:', err);
      alert('작업 삭제에 실패했습니다.');
    }
  };

  // Drag and drop
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, columnKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnKey);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: Task['status']) => {
    e.preventDefault();
    setDragOverColumn(null);
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === targetStatus) {
      setDraggedTaskId(null);
      return;
    }

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: targetStatus } : t))
    );
    setDraggedTaskId(null);

    try {
      await api.put(`/projects/tasks/${taskId}/move`, { status: targetStatus });
    } catch (err: any) {
      console.error('Failed to move task:', err);
      // Revert on failure
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: task.status } : t))
      );
    }
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverColumn(null);
  };

  const getTasksByStatus = (status: Task['status']) =>
    tasks.filter((t) => t.status === status);

  const getAvatarColor = (index: number) => AVATAR_COLORS[index % AVATAR_COLORS.length];

  const getInitials = (user: TaskUser) => {
    if (user.nickname) return user.nickname.charAt(0);
    if (user.email) return user.email.charAt(0).toUpperCase();
    return '?';
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  const toggleAssignee = (userId: string) => {
    setTaskForm((prev) => ({
      ...prev,
      assignees: prev.assignees.includes(userId)
        ? prev.assignees.filter((id) => id !== userId)
        : [...prev.assignees, userId],
    }));
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-100 rounded-lg">
                <Layout className="w-6 h-6 text-violet-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">프로젝트 보드</h1>
            </div>
          </div>

          {/* Project selector */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium text-gray-700 min-w-[200px]"
              >
                <span>{selectedProject?.title || '프로젝트 선택'}</span>
                <ChevronDown size={16} className="ml-auto" />
              </button>
              {isProjectDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  {projects.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-400">
                      프로젝트가 없습니다.
                    </div>
                  ) : (
                    projects.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setSelectedProjectId(p.id);
                          setIsProjectDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${
                          selectedProjectId === p.id
                            ? 'bg-violet-50 text-violet-700 font-medium'
                            : 'text-gray-700'
                        }`}
                      >
                        {p.title}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <button
              onClick={() => setIsProjectModalOpen(true)}
              className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 transition-colors font-medium"
            >
              <Plus size={18} />
              <span>새 프로젝트</span>
            </button>
          </div>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-auto p-6">
        {!selectedProjectId ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <Layout size={48} className="mb-4" />
            <p className="text-lg">프로젝트를 선택하거나 새로 만들어주세요.</p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">로딩 중...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-red-500">{error}</div>
          </div>
        ) : (
          <div className="flex gap-6 h-full min-h-[500px]">
            {COLUMNS.map((col) => {
              const columnTasks = getTasksByStatus(col.key);
              const isDragOver = dragOverColumn === col.key;

              return (
                <div
                  key={col.key}
                  className={`flex-1 min-w-[300px] flex flex-col rounded-xl transition-colors ${
                    isDragOver ? 'bg-violet-50 ring-2 ring-violet-300' : 'bg-gray-100'
                  }`}
                  onDragOver={(e) => handleDragOver(e, col.key)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, col.key)}
                >
                  {/* Column header */}
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${col.color}`}>
                        {col.label}
                      </span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${col.bgColor} ${col.color}`}>
                        {columnTasks.length}
                      </span>
                    </div>
                  </div>

                  {/* Task cards */}
                  <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-3">
                    {columnTasks.map((task) => (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => handleOpenEditTask(task)}
                        className={`bg-white rounded-lg p-4 shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-all group ${
                          draggedTaskId === task.id ? 'opacity-50 rotate-2' : ''
                        }`}
                      >
                        {/* Priority badge */}
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              PRIORITY_CONFIG[task.priority].color
                            }`}
                          >
                            {PRIORITY_CONFIG[task.priority].label}
                          </span>
                          <GripVertical
                            size={14}
                            className="text-gray-300 group-hover:text-gray-400"
                          />
                        </div>

                        {/* Title */}
                        <h3 className="text-sm font-medium text-gray-900 mb-2">
                          {task.title}
                        </h3>

                        {/* Footer */}
                        <div className="flex items-center justify-between mt-3">
                          {/* Assignees */}
                          <div className="flex -space-x-2">
                            {task.assignees?.slice(0, 3).map((user, idx) => (
                              <div
                                key={user.id}
                                className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium border-2 border-white ${getAvatarColor(idx)}`}
                                title={user.nickname || user.email}
                              >
                                {getInitials(user)}
                              </div>
                            ))}
                            {(task.assignees?.length || 0) > 3 && (
                              <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-medium border-2 border-white">
                                +{(task.assignees?.length || 0) - 3}
                              </div>
                            )}
                          </div>

                          {/* Due date */}
                          {task.dueDate && (
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Calendar size={12} />
                              <span>
                                {new Date(task.dueDate).toLocaleDateString('ko-KR', {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add task button */}
                  <button
                    onClick={() => handleOpenAddTask(col.key)}
                    className="mx-3 mb-3 flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 hover:text-violet-600 hover:border-violet-400 transition-colors text-sm font-medium"
                  >
                    <Plus size={16} />
                    <span>작업 추가</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Project Modal */}
      <Modal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        title="새 프로젝트"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">프로젝트 이름 *</label>
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="프로젝트 이름"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={() => setIsProjectModalOpen(false)}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
            >
              취소
            </button>
            <button
              onClick={handleCreateProject}
              disabled={!newProjectName.trim()}
              className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:bg-gray-300 transition-colors font-medium"
            >
              만들기
            </button>
          </div>
        </div>
      </Modal>

      {/* Task Modal */}
      <Modal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        title={selectedTask ? '작업 수정' : '작업 추가'}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">제목 *</label>
            <input
              type="text"
              value={taskForm.title}
              onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
              placeholder="작업 제목"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">설명</label>
            <textarea
              value={taskForm.description}
              onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
              placeholder="작업 설명 (선택사항)"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">우선순위</label>
              <select
                value={taskForm.priority}
                onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as Task['priority'] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="low">낮음</option>
                <option value="medium">보통</option>
                <option value="high">높음</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">마감일</label>
              <input
                type="date"
                value={taskForm.dueDate}
                onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">상태</label>
            <select
              value={taskForm.status}
              onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value as Task['status'] })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="todo">할 일</option>
              <option value="in_progress">진행 중</option>
              <option value="done">완료</option>
            </select>
          </div>

          {/* Assignees multi-select */}
          {users.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">담당자</label>
              <div className="flex flex-wrap gap-2 p-3 border border-gray-300 rounded-lg max-h-32 overflow-y-auto">
                {users.map((user) => {
                  const isSelected = taskForm.assignees.includes(user.id);
                  return (
                    <button
                      key={user.id}
                      onClick={() => toggleAssignee(user.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${
                        isSelected
                          ? 'bg-violet-100 text-violet-700 border border-violet-300'
                          : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                      }`}
                    >
                      <User size={14} />
                      <span>{user.nickname || user.email}</span>
                      {isSelected && <Check size={12} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4">
            {selectedTask && (
              <button
                onClick={() => handleDeleteTask(selectedTask.id)}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium mr-auto"
              >
                <Trash2 size={18} />
                <span>삭제</span>
              </button>
            )}
            <button
              onClick={() => setIsTaskModalOpen(false)}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
            >
              취소
            </button>
            <button
              onClick={handleSaveTask}
              disabled={!taskForm.title.trim()}
              className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:bg-gray-300 transition-colors font-medium"
            >
              {selectedTask ? '수정' : '추가'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
