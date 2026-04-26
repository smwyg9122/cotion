import React, { useState, useEffect, useCallback } from 'react';
import { Users, FileText, Activity, Building2, Plus, RefreshCw, ChevronDown, ChevronUp, Trash2, UserPlus, RotateCcw, Eye, EyeOff } from 'lucide-react';
import { api } from '../../services/api';
import { Modal } from '../common/Modal';

type AdminTab = 'users' | 'content' | 'system' | 'workspaces';

interface AdminUser {
  id: string;
  username: string;
  name: string;
  email: string;
  title?: string;
  role: string;
  kakao_linked?: boolean;
  is_active: boolean;
  allowed_workspaces?: string[];
}

interface AdminPage {
  id: string;
  title: string;
  workspace: string;
  category?: string;
  creator_name?: string;
  created_at: string;
  is_deleted: boolean;
}

interface Workspace {
  id?: string;
  name: string;
  description?: string;
  member_count?: number;
  created_at?: string;
}

interface WorkspaceMember {
  id: string;
  username: string;
  name: string;
  email: string;
}

interface ActivityLog {
  id: string;
  timestamp: string;
  user_name: string;
  action: string;
  target?: string;
  details?: string;
}

interface KakaoLog {
  id: string;
  timestamp: string;
  user_name: string;
  type: string;
  message: string;
  status: 'sent' | 'failed';
}

const TABS: { key: AdminTab; label: string; icon: React.ReactNode }[] = [
  { key: 'users', label: '사용자 관리', icon: <Users size={16} /> },
  { key: 'content', label: '콘텐츠 관리', icon: <FileText size={16} /> },
  { key: 'system', label: '시스템 관리', icon: <Activity size={16} /> },
  { key: 'workspaces', label: '워크스페이스', icon: <Building2 size={16} /> },
];

export function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('users');

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900 mb-4">관리자 패널</h1>
        <div className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'content' && <ContentTab />}
        {activeTab === 'system' && <SystemTab />}
        {activeTab === 'workspaces' && <WorkspacesTab />}
      </div>
    </div>
  );
}

/* ============================================================
   TAB 1: 사용자 관리
   ============================================================ */
function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [allWorkspaces, setAllWorkspaces] = useState<string[]>([]);
  const [selectedWorkspaces, setSelectedWorkspaces] = useState<string[]>([]);

  // Create user form
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'member' | 'superadmin'>('member');
  const [newWorkspaces, setNewWorkspaces] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/users');
      setUsers(res.data.data || res.data || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchWorkspaces = useCallback(async () => {
    try {
      const res = await api.get('/admin/workspaces');
      const ws = res.data.data || res.data || [];
      setAllWorkspaces(ws.map((w: any) => w.name || w));
    } catch (err) {
      console.error('Failed to fetch workspaces:', err);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchWorkspaces();
  }, [fetchUsers, fetchWorkspaces]);

  async function handleToggleActive(userId: string) {
    try {
      await api.put(`/admin/users/${userId}/toggle-active`);
      fetchUsers();
    } catch (err) {
      console.error('Failed to toggle user active status:', err);
    }
  }

  async function handleResetPassword(userId: string, userName: string) {
    if (!confirm(`${userName}의 비밀번호를 초기화하시겠습니까?`)) return;
    try {
      const res = await api.post(`/admin/users/${userId}/reset-password`);
      const tempPassword = res.data?.tempPassword || res.data?.data?.tempPassword;
      if (tempPassword) {
        alert(`임시 비밀번호: ${tempPassword}`);
      } else {
        alert('비밀번호가 초기화되었습니다.');
      }
    } catch (err) {
      console.error('Failed to reset password:', err);
      alert('비밀번호 초기화에 실패했습니다.');
    }
  }

  function openWorkspaceModal(user: AdminUser) {
    setSelectedUser(user);
    setSelectedWorkspaces(user.allowed_workspaces || []);
    setShowWorkspaceModal(true);
  }

  async function handleSaveWorkspaces() {
    if (!selectedUser) return;
    try {
      await api.put(`/admin/users/${selectedUser.id}/workspaces`, { workspaces: selectedWorkspaces });
      setShowWorkspaceModal(false);
      fetchUsers();
    } catch (err) {
      console.error('Failed to update workspaces:', err);
      alert('워크스페이스 변경에 실패했습니다.');
    }
  }

  async function handleCreateUser() {
    if (!newUsername || !newEmail || !newName || !newPassword) {
      alert('모든 필수 필드를 입력해주세요.');
      return;
    }
    try {
      setCreating(true);
      await api.post('/admin/users', {
        username: newUsername,
        email: newEmail,
        name: newName,
        password: newPassword,
        role: newRole,
        workspaces: newWorkspaces,
      });
      setShowCreateModal(false);
      setNewUsername('');
      setNewEmail('');
      setNewName('');
      setNewPassword('');
      setNewRole('member');
      setNewWorkspaces([]);
      fetchUsers();
    } catch (err) {
      console.error('Failed to create user:', err);
      alert('사용자 생성에 실패했습니다.');
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">로딩 중...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">사용자 목록</h2>
        <div className="flex gap-2">
          <button
            onClick={fetchUsers}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw size={14} />
            새로고침
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
          >
            <Plus size={14} />
            새 사용자 추가
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">이름</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">아이디</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">이메일</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">직함</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">역할</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">카카오</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">상태</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">작업</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{user.name}</td>
                  <td className="px-4 py-3 text-gray-600">{user.username}</td>
                  <td className="px-4 py-3 text-gray-600">{user.email}</td>
                  <td className="px-4 py-3 text-gray-600">{user.title || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      user.role === 'superadmin'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block w-2 h-2 rounded-full ${user.kakao_linked ? 'bg-green-500' : 'bg-gray-300'}`} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      user.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {user.is_active ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleToggleActive(user.id)}
                        title={user.is_active ? '비활성화' : '활성화'}
                        className={`p-1.5 rounded-md transition-colors ${
                          user.is_active
                            ? 'text-red-500 hover:bg-red-50'
                            : 'text-green-500 hover:bg-green-50'
                        }`}
                      >
                        {user.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button
                        onClick={() => openWorkspaceModal(user)}
                        title="워크스페이스 편집"
                        className="p-1.5 rounded-md text-blue-500 hover:bg-blue-50 transition-colors"
                      >
                        <Building2 size={14} />
                      </button>
                      <button
                        onClick={() => handleResetPassword(user.id, user.name)}
                        title="비밀번호 초기화"
                        className="p-1.5 rounded-md text-orange-500 hover:bg-orange-50 transition-colors"
                      >
                        <RotateCcw size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users.length === 0 && (
          <div className="text-center py-8 text-gray-400">사용자가 없습니다.</div>
        )}
      </div>

      {/* Create User Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="새 사용자 추가" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">아이디 *</label>
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="username"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">이메일 *</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="email@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">이름 *</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="홍길동"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호 *</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="비밀번호"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">역할</label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as 'member' | 'superadmin')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="member">Member</option>
              <option value="superadmin">Superadmin</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">워크스페이스</label>
            <div className="space-y-2">
              {allWorkspaces.map((ws) => (
                <label key={ws} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={newWorkspaces.includes(ws)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setNewWorkspaces([...newWorkspaces, ws]);
                      } else {
                        setNewWorkspaces(newWorkspaces.filter((w) => w !== ws));
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  {ws}
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleCreateUser}
              disabled={creating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors disabled:opacity-50"
            >
              {creating ? '생성 중...' : '생성'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Workspace Edit Modal */}
      <Modal isOpen={showWorkspaceModal} onClose={() => setShowWorkspaceModal(false)} title={`${selectedUser?.name || ''} - 워크스페이스 편집`} size="sm">
        <div className="space-y-3">
          {allWorkspaces.map((ws) => (
            <label key={ws} className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={selectedWorkspaces.includes(ws)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedWorkspaces([...selectedWorkspaces, ws]);
                  } else {
                    setSelectedWorkspaces(selectedWorkspaces.filter((w) => w !== ws));
                  }
                }}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              {ws}
            </label>
          ))}
          <div className="flex justify-end gap-2 pt-3">
            <button
              onClick={() => setShowWorkspaceModal(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSaveWorkspaces}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
            >
              저장
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ============================================================
   TAB 2: 콘텐츠 관리
   ============================================================ */
function ContentTab() {
  const [pages, setPages] = useState<AdminPage[]>([]);
  const [loadingPages, setLoadingPages] = useState(true);
  const [workspaceFilter, setWorkspaceFilter] = useState('');
  const [workspaces, setWorkspaces] = useState<string[]>([]);

  // Dashboard
  const [projectCount, setProjectCount] = useState(0);
  const [taskStats, setTaskStats] = useState<{ todo: number; in_progress: number; done: number }>({ todo: 0, in_progress: 0, done: 0 });
  const [recentTasks, setRecentTasks] = useState<any[]>([]);

  const fetchPages = useCallback(async () => {
    try {
      setLoadingPages(true);
      const params: any = {};
      if (workspaceFilter) params.workspace = workspaceFilter;
      const res = await api.get('/admin/pages', { params });
      setPages(res.data.data || res.data || []);
    } catch (err) {
      console.error('Failed to fetch pages:', err);
    } finally {
      setLoadingPages(false);
    }
  }, [workspaceFilter]);

  const fetchWorkspaces = useCallback(async () => {
    try {
      const res = await api.get('/admin/workspaces');
      const ws = res.data.data || res.data || [];
      setWorkspaces(ws.map((w: any) => w.name || w));
    } catch (err) {
      console.error('Failed to fetch workspaces:', err);
    }
  }, []);

  const fetchDashboard = useCallback(async () => {
    try {
      const [projRes, taskRes] = await Promise.all([
        api.get('/admin/dashboard/projects'),
        api.get('/admin/dashboard/tasks'),
      ]);
      const projData = projRes.data.data || projRes.data || {};
      setProjectCount(projData.total || projData.count || 0);
      const taskData = taskRes.data.data || taskRes.data || {};
      setTaskStats({
        todo: taskData.todo || 0,
        in_progress: taskData.in_progress || 0,
        done: taskData.done || 0,
      });
      setRecentTasks(taskData.recent || []);
    } catch (err) {
      console.error('Failed to fetch dashboard:', err);
    }
  }, []);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  useEffect(() => {
    fetchWorkspaces();
    fetchDashboard();
  }, [fetchWorkspaces, fetchDashboard]);

  async function handleRestore(pageId: string) {
    try {
      await api.post(`/admin/pages/${pageId}/restore`);
      fetchPages();
    } catch (err) {
      console.error('Failed to restore page:', err);
      alert('페이지 복원에 실패했습니다.');
    }
  }

  return (
    <div className="space-y-8">
      {/* Pages Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">전체 페이지</h2>
          <div className="flex items-center gap-2">
            <select
              value={workspaceFilter}
              onChange={(e) => setWorkspaceFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="">전체 워크스페이스</option>
              {workspaces.map((ws) => (
                <option key={ws} value={ws}>{ws}</option>
              ))}
            </select>
            <button
              onClick={fetchPages}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {loadingPages ? (
            <div className="text-center py-8 text-gray-400">로딩 중...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">제목</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">워크스페이스</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">카테고리</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">작성자</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">생성일</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">상태</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {pages.map((page) => (
                    <tr key={page.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{page.title || '제목 없음'}</td>
                      <td className="px-4 py-3 text-gray-600">{page.workspace}</td>
                      <td className="px-4 py-3 text-gray-600">{page.category || '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{page.creator_name || '-'}</td>
                      <td className="px-4 py-3 text-gray-500">{new Date(page.created_at).toLocaleDateString('ko-KR')}</td>
                      <td className="px-4 py-3 text-center">
                        {page.is_deleted && (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">삭제됨</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {page.is_deleted && (
                          <button
                            onClick={() => handleRestore(page.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          >
                            <RotateCcw size={12} />
                            복원
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {pages.length === 0 && (
                <div className="text-center py-8 text-gray-400">페이지가 없습니다.</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Dashboard Section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">프로젝트/업무 현황</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="총 프로젝트" value={projectCount} color="blue" />
          <StatCard label="할 일" value={taskStats.todo} color="yellow" />
          <StatCard label="진행 중" value={taskStats.in_progress} color="blue" />
          <StatCard label="완료" value={taskStats.done} color="green" />
        </div>

        {recentTasks.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">최근 업무</h3>
            <div className="space-y-2">
              {recentTasks.map((task: any, idx: number) => (
                <div key={task.id || idx} className="flex items-center gap-3 text-sm py-1.5 border-b border-gray-50 last:border-0">
                  <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${
                    task.status === 'done' ? 'bg-green-500' : task.status === 'in_progress' ? 'bg-blue-500' : 'bg-yellow-500'
                  }`} />
                  <span className="text-gray-800 flex-1 truncate">{task.title}</span>
                  <span className="text-gray-400 text-xs flex-shrink-0">{task.assignee_name || ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   TAB 3: 시스템 관리
   ============================================================ */
function SystemTab() {
  const [systemStats, setSystemStats] = useState<any>({});
  const [fileStats, setFileStats] = useState<any>({});
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [activityOffset, setActivityOffset] = useState(0);
  const [activityHasMore, setActivityHasMore] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [kakaoLogs, setKakaoLogs] = useState<KakaoLog[]>([]);
  const [kakaoOffset, setKakaoOffset] = useState(0);
  const [kakaoHasMore, setKakaoHasMore] = useState(true);
  const [loadingKakao, setLoadingKakao] = useState(false);

  const fetchSystemStats = useCallback(async () => {
    try {
      const [sysRes, fileRes] = await Promise.all([
        api.get('/admin/stats/system'),
        api.get('/admin/stats/files'),
      ]);
      setSystemStats(sysRes.data.data || sysRes.data || {});
      setFileStats(fileRes.data.data || fileRes.data || {});
    } catch (err) {
      console.error('Failed to fetch system stats:', err);
    }
  }, []);

  const fetchActivityLogs = useCallback(async (offset: number, append: boolean) => {
    try {
      setLoadingActivity(true);
      const res = await api.get('/admin/logs/activity', { params: { limit: 50, offset } });
      const data = res.data.data || res.data || [];
      const logs = Array.isArray(data) ? data : data.logs || [];
      if (append) {
        setActivityLogs((prev) => [...prev, ...logs]);
      } else {
        setActivityLogs(logs);
      }
      setActivityHasMore(logs.length >= 50);
    } catch (err) {
      console.error('Failed to fetch activity logs:', err);
    } finally {
      setLoadingActivity(false);
    }
  }, []);

  const fetchKakaoLogs = useCallback(async (offset: number, append: boolean) => {
    try {
      setLoadingKakao(true);
      const res = await api.get('/admin/logs/kakao', { params: { limit: 50, offset } });
      const data = res.data.data || res.data || [];
      const logs = Array.isArray(data) ? data : data.logs || [];
      if (append) {
        setKakaoLogs((prev) => [...prev, ...logs]);
      } else {
        setKakaoLogs(logs);
      }
      setKakaoHasMore(logs.length >= 50);
    } catch (err) {
      console.error('Failed to fetch kakao logs:', err);
    } finally {
      setLoadingKakao(false);
    }
  }, []);

  useEffect(() => {
    fetchSystemStats();
    fetchActivityLogs(0, false);
    fetchKakaoLogs(0, false);
  }, [fetchSystemStats, fetchActivityLogs, fetchKakaoLogs]);

  function formatBytes(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  }

  return (
    <div className="space-y-8">
      {/* System Stats */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">시스템 통계</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="총 사용자" value={systemStats.total_users || 0} color="blue" />
          <StatCard label="총 페이지" value={systemStats.total_pages || 0} color="green" />
          <StatCard label="총 프로젝트" value={systemStats.total_projects || 0} color="purple" />
          <StatCard label="총 일정" value={systemStats.total_events || 0} color="yellow" />
          <StatCard label="총 파일" value={fileStats.total_files || 0} color="blue" />
          <StatCard label="총 파일 크기" value={formatBytes(fileStats.total_size || 0)} color="gray" isText />
        </div>
      </div>

      {/* Activity Logs */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">활동 로그</h2>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">시간</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">사용자</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">작업</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">대상</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">상세</th>
                </tr>
              </thead>
              <tbody>
                {activityLogs.map((log, idx) => (
                  <tr key={log.id || idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{new Date(log.timestamp).toLocaleString('ko-KR')}</td>
                    <td className="px-4 py-3 text-gray-700">{log.user_name}</td>
                    <td className="px-4 py-3 text-gray-700">{log.action}</td>
                    <td className="px-4 py-3 text-gray-600">{log.target || '-'}</td>
                    <td className="px-4 py-3 text-gray-500 truncate max-w-xs">{log.details || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {activityLogs.length === 0 && !loadingActivity && (
              <div className="text-center py-8 text-gray-400">활동 로그가 없습니다.</div>
            )}
          </div>
          {activityHasMore && (
            <div className="p-3 border-t border-gray-100 text-center">
              <button
                onClick={() => {
                  const newOffset = activityOffset + 50;
                  setActivityOffset(newOffset);
                  fetchActivityLogs(newOffset, true);
                }}
                disabled={loadingActivity}
                className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
              >
                {loadingActivity ? '로딩 중...' : '더 보기'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Kakao Notification Logs */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">카카오 알림 로그</h2>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">시간</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">사용자</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">유형</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">메시지</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">상태</th>
                </tr>
              </thead>
              <tbody>
                {kakaoLogs.map((log, idx) => (
                  <tr key={log.id || idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{new Date(log.timestamp).toLocaleString('ko-KR')}</td>
                    <td className="px-4 py-3 text-gray-700">{log.user_name}</td>
                    <td className="px-4 py-3 text-gray-600">{log.type}</td>
                    <td className="px-4 py-3 text-gray-600 truncate max-w-sm">{log.message}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        log.status === 'sent'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {log.status === 'sent' ? '전송됨' : '실패'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {kakaoLogs.length === 0 && !loadingKakao && (
              <div className="text-center py-8 text-gray-400">카카오 알림 로그가 없습니다.</div>
            )}
          </div>
          {kakaoHasMore && (
            <div className="p-3 border-t border-gray-100 text-center">
              <button
                onClick={() => {
                  const newOffset = kakaoOffset + 50;
                  setKakaoOffset(newOffset);
                  fetchKakaoLogs(newOffset, true);
                }}
                disabled={loadingKakao}
                className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
              >
                {loadingKakao ? '로딩 중...' : '더 보기'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   TAB 4: 워크스페이스
   ============================================================ */
function WorkspacesTab() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedWorkspace, setExpandedWorkspace] = useState<string | null>(null);
  const [members, setMembers] = useState<Record<string, WorkspaceMember[]>>({});
  const [allUsers, setAllUsers] = useState<AdminUser[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [newWsDesc, setNewWsDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [addMemberDropdown, setAddMemberDropdown] = useState<string | null>(null);

  const fetchWorkspaces = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/workspaces');
      setWorkspaces(res.data.data || res.data || []);
    } catch (err) {
      console.error('Failed to fetch workspaces:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAllUsers = useCallback(async () => {
    try {
      const res = await api.get('/admin/users');
      setAllUsers(res.data.data || res.data || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  }, []);

  useEffect(() => {
    fetchWorkspaces();
    fetchAllUsers();
  }, [fetchWorkspaces, fetchAllUsers]);

  async function fetchMembers(wsName: string) {
    try {
      const res = await api.get(`/admin/workspaces/${encodeURIComponent(wsName)}/members`);
      setMembers((prev) => ({ ...prev, [wsName]: res.data.data || res.data || [] }));
    } catch (err) {
      console.error('Failed to fetch members:', err);
    }
  }

  function toggleExpand(wsName: string) {
    if (expandedWorkspace === wsName) {
      setExpandedWorkspace(null);
    } else {
      setExpandedWorkspace(wsName);
      if (!members[wsName]) {
        fetchMembers(wsName);
      }
    }
    setAddMemberDropdown(null);
  }

  async function handleRemoveMember(wsName: string, userId: string) {
    if (!confirm('이 멤버를 워크스페이스에서 제거하시겠습니까?')) return;
    try {
      await api.delete(`/admin/workspaces/${encodeURIComponent(wsName)}/members/${userId}`);
      fetchMembers(wsName);
      fetchWorkspaces();
    } catch (err) {
      console.error('Failed to remove member:', err);
      alert('멤버 제거에 실패했습니다.');
    }
  }

  async function handleAddMember(wsName: string, userId: string) {
    try {
      await api.post(`/admin/workspaces/${encodeURIComponent(wsName)}/members`, { userId });
      fetchMembers(wsName);
      fetchWorkspaces();
      setAddMemberDropdown(null);
    } catch (err) {
      console.error('Failed to add member:', err);
      alert('멤버 추가에 실패했습니다.');
    }
  }

  async function handleCreateWorkspace() {
    if (!newWsName.trim()) {
      alert('워크스페이스 이름을 입력해주세요.');
      return;
    }
    try {
      setCreating(true);
      await api.post('/admin/workspaces', { name: newWsName.trim(), description: newWsDesc.trim() });
      setShowCreateModal(false);
      setNewWsName('');
      setNewWsDesc('');
      fetchWorkspaces();
    } catch (err) {
      console.error('Failed to create workspace:', err);
      alert('워크스페이스 생성에 실패했습니다.');
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteWorkspace(wsId: string, wsName: string) {
    if (!confirm(`"${wsName}" 워크스페이스를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return;
    try {
      await api.delete(`/admin/workspaces/${wsId}`);
      fetchWorkspaces();
    } catch (err) {
      console.error('Failed to delete workspace:', err);
      alert('워크스페이스 삭제에 실패했습니다.');
    }
  }

  function getNonMembers(wsName: string): AdminUser[] {
    const memberIds = new Set((members[wsName] || []).map((m) => m.id));
    return allUsers.filter((u) => !memberIds.has(u.id));
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">로딩 중...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">워크스페이스 목록</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
        >
          <Plus size={14} />
          새 워크스페이스
        </button>
      </div>

      <div className="space-y-4">
        {workspaces.map((ws) => (
          <div key={ws.name} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div
              className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleExpand(ws.name)}
            >
              <div className="flex items-center gap-3">
                <Building2 size={20} className="text-blue-500" />
                <div>
                  <h3 className="font-semibold text-gray-900">{ws.name}</h3>
                  {ws.description && <p className="text-sm text-gray-500">{ws.description}</p>}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500">{ws.member_count ?? '?'}명</span>
                {ws.created_at && (
                  <span className="text-xs text-gray-400">{new Date(ws.created_at).toLocaleDateString('ko-KR')}</span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (ws.id) handleDeleteWorkspace(ws.id, ws.name);
                  }}
                  className="p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-md transition-colors"
                  title="워크스페이스 삭제"
                >
                  <Trash2 size={14} />
                </button>
                {expandedWorkspace === ws.name ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              </div>
            </div>

            {expandedWorkspace === ws.name && (
              <div className="border-t border-gray-100 px-5 py-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-700">멤버</h4>
                  <div className="relative">
                    <button
                      onClick={() => setAddMemberDropdown(addMemberDropdown === ws.name ? null : ws.name)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    >
                      <UserPlus size={12} />
                      멤버 추가
                    </button>
                    {addMemberDropdown === ws.name && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setAddMemberDropdown(null)} />
                        <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                          {getNonMembers(ws.name).length === 0 ? (
                            <div className="px-3 py-2 text-xs text-gray-400">추가할 사용자가 없습니다.</div>
                          ) : (
                            getNonMembers(ws.name).map((u) => (
                              <button
                                key={u.id}
                                onClick={() => handleAddMember(ws.name, u.id)}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                              >
                                <span className="font-medium text-gray-800">{u.name}</span>
                                <span className="text-gray-400 ml-1.5 text-xs">{u.username}</span>
                              </button>
                            ))
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                {members[ws.name] ? (
                  members[ws.name].length > 0 ? (
                    <div className="space-y-1">
                      {members[ws.name].map((member) => (
                        <div key={member.id} className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-700">
                              {member.name.charAt(0)}
                            </div>
                            <div>
                              <span className="text-sm font-medium text-gray-800">{member.name}</span>
                              <span className="text-xs text-gray-400 ml-2">{member.email}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveMember(ws.name, member.id)}
                            className="px-2.5 py-1 text-xs font-medium text-red-500 hover:bg-red-50 rounded-md transition-colors"
                          >
                            제거
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-400 text-sm">멤버가 없습니다.</div>
                  )
                ) : (
                  <div className="text-center py-4 text-gray-400 text-sm">로딩 중...</div>
                )}
              </div>
            )}
          </div>
        ))}
        {workspaces.length === 0 && (
          <div className="text-center py-12 text-gray-400">워크스페이스가 없습니다.</div>
        )}
      </div>

      {/* Create Workspace Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="새 워크스페이스" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">이름 *</label>
            <input
              type="text"
              value={newWsName}
              onChange={(e) => setNewWsName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="워크스페이스 이름"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
            <textarea
              value={newWsDesc}
              onChange={(e) => setNewWsDesc(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
              rows={3}
              placeholder="워크스페이스 설명 (선택)"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleCreateWorkspace}
              disabled={creating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors disabled:opacity-50"
            >
              {creating ? '생성 중...' : '생성'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ============================================================
   SHARED: Stat Card
   ============================================================ */
function StatCard({ label, value, color, isText }: { label: string; value: number | string; color: string; isText?: boolean }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    yellow: 'bg-yellow-50 text-yellow-700',
    purple: 'bg-purple-50 text-purple-700',
    gray: 'bg-gray-50 text-gray-700',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colorMap[color]?.split(' ')[1] || 'text-gray-900'}`}>
        {isText ? value : typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  );
}
