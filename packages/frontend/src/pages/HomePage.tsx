import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { useAuth } from '../hooks/useAuth';
import { usePages } from '../hooks/usePages';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/common';
import { PageTree } from '../components/pages/PageTree';
import { NewPageModal } from '../components/pages/NewPageModal';
import { PasswordChangeModal } from '../components/auth/PasswordChangeModal';
import { NicknameModal } from '../components/auth/NicknameModal';
import { TrashView } from '../components/pages/TrashView';
import { SearchBar } from '../components/pages/SearchBar';
import { NotificationBell } from '../components/notifications/NotificationBell';
import { Menu, X, Trash2, Plus, ChevronDown, ChevronRight, Check, Calendar, Package, Kanban, Coffee, FolderOpen, Palette, Zap, MessageCircle, FileText, Settings, Shield, Tag } from 'lucide-react';
import { api } from '../services/api';
import { KakaoLinkButton } from '../components/settings/KakaoLinkButton';
// Heavy view components are lazy-loaded so the initial bundle stays small.
// Routes that the user may never visit (admin, test, CRM, etc.) shouldn't
// pay the cost upfront. Each chunk is downloaded on first navigation only.
const CalendarPage = lazy(() => import('../components/calendar/CalendarPage').then((m) => ({ default: m.CalendarPage })));
const AyutaBuyersPage = lazy(() => import('../components/ayuta-buyers/AyutaBuyersPage').then((m) => ({ default: m.AyutaBuyersPage })));
const PriceListPage = lazy(() => import('../components/price-list/PriceListPage').then((m) => ({ default: m.PriceListPage })));
const InventoryPage = lazy(() => import('../components/inventory/InventoryPage').then((m) => ({ default: m.InventoryPage })));
const KanbanBoard = lazy(() => import('../components/projects/KanbanBoard').then((m) => ({ default: m.KanbanBoard })));
const CuppingLogPage = lazy(() => import('../components/cupping/CuppingLogPage').then((m) => ({ default: m.CuppingLogPage })));
const DocumentLibrary = lazy(() => import('../components/documents/DocumentLibrary').then((m) => ({ default: m.DocumentLibrary })));
const DesignLibrary = lazy(() => import('../components/design/DesignLibrary').then((m) => ({ default: m.DesignLibrary })));
const V2TestPage = lazy(() => import('../components/test/V2TestPage').then((m) => ({ default: m.V2TestPage })));
const AdminPage = lazy(() => import('../components/admin/AdminPage').then((m) => ({ default: m.AdminPage })));
// The rich-text editor (Tiptap + ProseMirror) is the single heaviest dependency
// (~600KB). It's only needed once a page is opened for editing, so lazy-load it
// to keep the initial app bundle small and the first paint fast. Same for the
// comment thread.
const TiptapEditor = lazy(() => import('../components/editor/TiptapEditor').then((m) => ({ default: m.TiptapEditor })));
const CommentSection = lazy(() => import('../components/comments/CommentSection').then((m) => ({ default: m.CommentSection })));
import { CategorySelect } from '../components/common';

// Simple loading state for lazy chunks — kept minimal because chunks load
// in < 200ms over typical broadband for ~50-300KB bundles.
function ViewLoading() {
  return (
    <div className="flex items-center justify-center h-full text-[#86868B] text-sm">
      불러오는 중…
    </div>
  );
}
import type { Page } from '@cotion/shared';

const ALL_WORKSPACES = [
  { name: '아유타', icon: '☕', label: 'Ayuta' },
  { name: '제이로텍', icon: '🏢', label: '제이로텍' },
];

export function HomePage() {
  const { user, logout } = useAuth();
  const { pages, isLoading, createPage, updatePage, deletePage, getPage, refreshPages, searchPages, movePage, renameCategory, deleteCategory } = usePages();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth >= 768);

  // Filter workspaces based on user permissions
  const allowedWorkspaces = useMemo(() => {
    const userWorkspaces = (user as any)?.allowed_workspaces || ['아유타', '제이로텍'];
    return ALL_WORKSPACES.filter((ws) => userWorkspaces.includes(ws.name));
  }, [user]);

  const [selectedWorkspace, setSelectedWorkspace] = useState(ALL_WORKSPACES[0]);
  const [isWorkspaceSwitcherOpen, setIsWorkspaceSwitcherOpen] = useState(false);

  // Set initial workspace to first allowed workspace
  useEffect(() => {
    if (allowedWorkspaces.length > 0 && !allowedWorkspaces.find((ws) => ws.name === selectedWorkspace.name)) {
      setSelectedWorkspace(allowedWorkspaces[0]);
    }
  }, [allowedWorkspaces]);

  useEffect(() => {
    function handleResize() {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setIsSidebarOpen(true);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (user && user.name && /^Admin \d+$/.test(user.name)) {
      setShowNicknameModal(true);
    }
  }, [user]);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const [isNewPageModalOpen, setIsNewPageModalOpen] = useState(false);
  const [isPasswordChangeModalOpen, setIsPasswordChangeModalOpen] = useState(false);
  const [isTrashViewOpen, setIsTrashViewOpen] = useState(false);
  const [newPageParentId, setNewPageParentId] = useState<string | undefined>();
  const [newPageCategory, setNewPageCategory] = useState<string | undefined>();
  const [editedTitle, setEditedTitle] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [editedCategory, setEditedCategory] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [currentView, setCurrentView] = useState<'pages' | 'calendar' | 'ayuta-buyers' | 'price-list' | 'inventory' | 'kanban' | 'cupping' | 'documents' | 'design' | 'v2test' | 'admin'>('pages');
  const [selectedKanbanProjectId, setSelectedKanbanProjectId] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<'pages' | 'business' | 'admin'>('pages');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const handleToggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);
  const [sidebarProjects, setSidebarProjects] = useState<{ id: string; title: string }[]>([]);
  const [isProjectListOpen, setIsProjectListOpen] = useState(true);

  // Fetch projects for sidebar
  const fetchSidebarProjects = useCallback(async () => {
    if (selectedWorkspace.name !== '아유타') return;
    try {
      const res = await api.get('/projects', { params: { workspace: selectedWorkspace.name } });
      setSidebarProjects(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch sidebar projects:', err);
    }
  }, [selectedWorkspace.name]);

  useEffect(() => {
    fetchSidebarProjects();
  }, [fetchSidebarProjects]);

  async function handleDeleteProject(projectId: string) {
    if (!confirm('이 프로젝트와 관련 태스크를 모두 삭제하시겠습니까?')) return;
    try {
      await api.delete(`/projects/${projectId}`, { params: { workspace: selectedWorkspace.name } });
      setSidebarProjects((prev) => prev.filter((p) => p.id !== projectId));
      showToast('프로젝트가 삭제되었습니다', 'success');
    } catch (err) {
      showToast('프로젝트 삭제에 실패했습니다', 'error');
      console.error('Failed to delete project:', err);
    }
  }

  // Filter pages by selected workspace
  const filteredPages = useMemo(() => {
    return pages.filter((page) => page.workspace === selectedWorkspace.name);
  }, [pages, selectedWorkspace]);

  // Collect all existing categories from pages
  const existingCategories = useMemo(() => {
    const cats = new Set<string>();
    pages.forEach((page) => {
      if (page.category) cats.add(page.category);
    });
    return Array.from(cats).sort();
  }, [pages]);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  async function handlePageSelect(pageId: string) {
    try {
      if (isMobile) setIsSidebarOpen(false);
      setCurrentView('pages');
      setSidebarTab('pages');
      setSelectedPageId(pageId);
      // Reset content immediately so the editor doesn't use stale content
      setEditedTitle('');
      setEditedContent('');
      setEditedCategory('');
      const page = await getPage(pageId);
      setSelectedPage(page);
      setEditedTitle(page.title);
      setEditedContent(page.content || '');
      setEditedCategory(page.category || '');
    } catch (error) {
      showToast('페이지를 불러오는데 실패했습니다', 'error');
      console.error('Failed to load page:', error);
    }
  }

  async function handleCreatePage(title: string, icon?: string, category?: string) {
    try {
      await createPage({
        title,
        icon,
        parentId: newPageParentId,
        category,
        workspace: selectedWorkspace.name,
      });
      setNewPageParentId(undefined);
      showToast('페이지가 생성되었습니다', 'success');
    } catch (error) {
      showToast('페이지 생성에 실패했습니다', 'error');
      console.error('Failed to create page:', error);
      throw error;
    }
  }

  function openNewPageModal(parentId?: string, category?: string) {
    setNewPageParentId(parentId);
    setNewPageCategory(category);
    setIsNewPageModalOpen(true);
  }

  async function handleSave() {
    if (selectedPageId && selectedPage && !isSaving) {
      try {
        setIsSaving(true);
        await updatePage(selectedPageId, {
          title: editedTitle,
          content: editedContent,
          category: editedCategory || undefined,
        });
        setSelectedPage({ ...selectedPage, title: editedTitle, content: editedContent, category: editedCategory || undefined });
        showToast('저장되었습니다', 'success', 1500);
      } catch (error) {
        showToast('저장에 실패했습니다', 'error');
        console.error('Failed to save page:', error);
      } finally {
        setIsSaving(false);
      }
    }
  }

  async function handleDeletePage(pageId: string) {
    if (!confirm('이 페이지를 휴지통으로 이동하시겠습니까?')) {
      return;
    }

    try {
      await deletePage(pageId);
      showToast('페이지가 휴지통으로 이동되었습니다', 'success');

      if (selectedPageId === pageId) {
        setSelectedPageId(null);
        setSelectedPage(null);
      }
    } catch (error) {
      showToast('페이지 삭제에 실패했습니다', 'error');
      console.error('Failed to delete page:', error);
    }
  }

  function handleTrashRestore() {
    refreshPages();
    showToast('페이지가 복원되었습니다', 'success');
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPageId, editedTitle, editedContent, editedCategory]);

  return (
    <div className="flex h-screen bg-[#F5F5F7]">
      {/* Mobile overlay backdrop */}
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`${
          isMobile
            ? `fixed top-0 bottom-0 left-0 z-40 w-72 transform transition-transform duration-200 ${
                isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
              }`
            : `${isSidebarOpen ? 'w-64' : 'w-0'} transition-all duration-200`
        } bg-[#FBFBFD] border-r border-[#E5E5EA] overflow-hidden flex flex-col`}
      >
        <div className="p-4 border-b border-[#E5E5EA]">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => { setSelectedPageId(null); setSelectedPage(null); }}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <img src="/logo.png" alt="Cotion" className="h-7 w-7 object-contain" />
              <span className="text-xl font-bold text-[#1D1D1F]">Cotion</span>
            </button>
            <div className="flex items-center gap-1">
              <NotificationBell onPageSelect={handlePageSelect} />
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-1 text-gray-500 hover:bg-[#ECECEF] rounded"
              >
                <X size={18} />
              </button>
            </div>
          </div>
          {/* Workspace Switcher */}
          <div className="relative">
            <button
              onClick={() => setIsWorkspaceSwitcherOpen(!isWorkspaceSwitcherOpen)}
              className="flex items-center gap-1.5 px-2 py-1.5 -mx-2 rounded-md hover:bg-[#ECECEF] transition-colors w-full"
            >
              <span className="text-base">{selectedWorkspace.icon}</span>
              <span className="text-sm font-semibold text-gray-800">{selectedWorkspace.label}</span>
              <ChevronDown size={14} className="text-gray-400 ml-auto" />
            </button>
            {isWorkspaceSwitcherOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsWorkspaceSwitcherOpen(false)} />
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-[#E5E5EA] py-1 z-50">
                  {allowedWorkspaces.map((ws) => (
                    <button
                      key={ws.name}
                      onClick={() => {
                        setSelectedWorkspace(ws);
                        setIsWorkspaceSwitcherOpen(false);
                        setSelectedPageId(null);
                        setSelectedPage(null);
                        // 제이로텍으로 전환 시 아유타 전용 뷰이면 pages로 리셋 (admin은 유지)
                        if (ws.name !== '아유타') {
                          if (sidebarTab !== 'admin') setSidebarTab('pages');
                          if (['ayuta-buyers', 'price-list', 'inventory', 'kanban', 'cupping', 'documents', 'v2test'].includes(currentView)) {
                            setCurrentView('pages');
                          }
                        }
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-[#F2F2F7] transition-colors"
                    >
                      <span className="text-base">{ws.icon}</span>
                      <span className="font-medium text-gray-700">{ws.label}</span>
                      {selectedWorkspace.name === ws.name && (
                        <Check size={14} className="text-[#C56A3E] ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Tab Bar — 아유타에서만 탭 표시, 제이로텍은 페이지만 */}
        {selectedWorkspace.name === '아유타' ? (
          <div className="flex border-b border-[#E5E5EA] bg-[#f0efec]">
            <button
              onClick={() => setSidebarTab('pages')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold transition-colors ${
                sidebarTab === 'pages'
                  ? 'text-[#9C4A2D] border-b-2 border-[#C56A3E] bg-[#FAF7F4]'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-[#ECECEF]'
              }`}
            >
              <FileText size={14} />
              페이지
            </button>
            <button
              onClick={() => setSidebarTab('business')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold transition-colors ${
                sidebarTab === 'business'
                  ? 'text-[#9C4A2D] border-b-2 border-[#C56A3E] bg-[#FAF7F4]'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-[#ECECEF]'
              }`}
            >
              <Settings size={14} />
              업무 관리
            </button>
            {(user as any)?.role === 'superadmin' && (
              <button
                onClick={() => { setSidebarTab('admin'); setCurrentView('admin'); }}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold transition-colors ${
                  sidebarTab === 'admin'
                    ? 'text-purple-700 border-b-2 border-purple-600 bg-purple-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-[#ECECEF]'
                }`}
              >
                <Shield size={14} />
                관리자
              </button>
            )}
          </div>
        ) : (user as any)?.role === 'superadmin' ? (
          <div className="flex border-b border-[#E5E5EA] bg-[#f0efec]">
            <button
              onClick={() => setSidebarTab('pages')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold transition-colors ${
                sidebarTab === 'pages'
                  ? 'text-[#9C4A2D] border-b-2 border-[#C56A3E] bg-[#FAF7F4]'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-[#ECECEF]'
              }`}
            >
              <FileText size={14} />
              페이지
            </button>
            <button
              onClick={() => { setSidebarTab('admin'); setCurrentView('admin'); }}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold transition-colors ${
                sidebarTab === 'admin'
                  ? 'text-purple-700 border-b-2 border-purple-600 bg-purple-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-[#ECECEF]'
              }`}
            >
              <Shield size={14} />
              관리자
            </button>
          </div>
        ) : null}

        {/* Tab Content */}
        {sidebarTab === 'admin' ? (
          <div className="flex-1 flex items-center justify-center px-4 py-8">
            <div className="text-center text-gray-500 text-sm">
              <Shield size={24} className="mx-auto mb-2 text-purple-400" />
              <p className="font-medium text-gray-700">관리자 패널</p>
              <p className="text-xs text-gray-400 mt-1">오른쪽 메인 영역에서 관리자 기능을 사용하세요.</p>
            </div>
          </div>
        ) : sidebarTab === 'pages' || selectedWorkspace.name !== '아유타' ? (
          <>
            <div className="px-3 pt-3 pb-1">
              <button
                onClick={() => openNewPageModal(undefined, undefined)}
                className="w-full px-3 py-2 bg-[#C56A3E] text-white rounded-md hover:bg-[#B45C33] text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus size={16} />
                새 페이지
              </button>
            </div>
            <SearchBar onSearch={searchPages} onPageSelect={handlePageSelect} />
            <div className="flex-1 overflow-y-auto px-3 py-2">
              {isLoading ? (
                <div className="text-center py-8 text-[#86868B] text-sm">로딩 중...</div>
              ) : (
                <PageTree
                  pages={filteredPages}
                  onPageSelect={handlePageSelect}
                  onCreatePage={openNewPageModal}
                  onDeletePage={handleDeletePage}
                  onMovePage={async (pageId, parentId, position, category) => {
                    try {
                      await movePage(pageId, parentId, position, category);
                    } catch {
                      showToast('페이지 이동에 실패했습니다', 'error');
                    }
                  }}
                  onRenameCategory={async (oldName, newName) => {
                    try {
                      await renameCategory(selectedWorkspace.name, oldName, newName);
                      showToast(`폴더 이름이 "${newName}"으로 변경되었습니다`, 'success');
                    } catch {
                      showToast('폴더 이름 변경에 실패했습니다', 'error');
                    }
                  }}
                  onDeleteCategory={async (categoryName) => {
                    try {
                      await deleteCategory(selectedWorkspace.name, categoryName);
                      showToast('폴더가 삭제되었습니다', 'success');
                    } catch {
                      showToast('폴더 삭제에 실패했습니다', 'error');
                    }
                  }}
                  selectedPageId={selectedPageId || undefined}
                  expandedIds={expandedIds}
                  onToggleExpand={handleToggleExpand}
                />
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
            <div className="px-2 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">재고</div>
            <button
              onClick={() => {
                setCurrentView('inventory');
                setSelectedPageId(null);
                setSelectedPage(null);
                if (isMobile) setIsSidebarOpen(false);
              }}
              className={`w-full px-3 py-2.5 text-sm rounded-lg text-left transition-all flex items-center gap-2.5 ${
                currentView === 'inventory'
                  ? 'bg-[#F4E7E0] text-[#9C4A2D] font-medium border border-transparent'
                  : 'text-gray-700 hover:bg-[#ECECEF] border border-transparent'
              }`}
            >
              <Package size={16} />
              재고 관리
            </button>

            <div className="px-2 py-1.5 mt-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">프로젝트 & 품질</div>
            <button
              onClick={() => {
                setCurrentView('kanban');
                setSelectedPageId(null);
                setSelectedPage(null);
                if (isMobile) setIsSidebarOpen(false);
              }}
              className={`w-full px-3 py-2.5 text-sm rounded-lg text-left transition-all flex items-center gap-2.5 ${
                currentView === 'kanban'
                  ? 'bg-[#F4E7E0] text-[#9C4A2D] font-medium border border-transparent'
                  : 'text-gray-700 hover:bg-[#ECECEF] border border-transparent'
              }`}
            >
              <Kanban size={16} />
              프로젝트 보드
            </button>

            {/* 프로젝트 리스트 펼침 */}
            {sidebarProjects.length > 0 && (
              <div className="ml-2">
                <button
                  onClick={() => setIsProjectListOpen(!isProjectListOpen)}
                  className="flex items-center gap-1 px-2 py-1 text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {isProjectListOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  프로젝트 {sidebarProjects.length}개
                </button>
                {isProjectListOpen && (
                  <div className="space-y-0.5 mt-0.5">
                    {sidebarProjects.map((project) => (
                      <div
                        key={project.id}
                        onClick={() => {
                          setSelectedKanbanProjectId(project.id);
                          setCurrentView('kanban');
                          setSelectedPageId(null);
                          setSelectedPage(null);
                          if (isMobile) setIsSidebarOpen(false);
                        }}
                        className="flex items-center gap-1.5 pl-4 pr-1 py-1.5 rounded-md hover:bg-[#ECECEF]/50 group transition-colors cursor-pointer"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-[#C56A3E] flex-shrink-0" />
                        <span className="text-xs text-gray-600 truncate flex-1">{project.title}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProject(project.id);
                          }}
                          className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 rounded transition-all"
                          title="프로젝트 삭제"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <button
              onClick={() => {
                setCurrentView('cupping');
                setSelectedPageId(null);
                setSelectedPage(null);
                if (isMobile) setIsSidebarOpen(false);
              }}
              className={`w-full px-3 py-2.5 text-sm rounded-lg text-left transition-all flex items-center gap-2.5 ${
                currentView === 'cupping'
                  ? 'bg-[#F4E7E0] text-[#9C4A2D] font-medium border border-transparent'
                  : 'text-gray-700 hover:bg-[#ECECEF] border border-transparent'
              }`}
            >
              <Coffee size={16} />
              커핑 로그
            </button>

            <div className="px-2 py-1.5 mt-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">자료</div>
            <button
              onClick={() => {
                setCurrentView('documents');
                setSelectedPageId(null);
                setSelectedPage(null);
                if (isMobile) setIsSidebarOpen(false);
              }}
              className={`w-full px-3 py-2.5 text-sm rounded-lg text-left transition-all flex items-center gap-2.5 ${
                currentView === 'documents'
                  ? 'bg-[#F4E7E0] text-[#9C4A2D] font-medium border border-transparent'
                  : 'text-gray-700 hover:bg-[#ECECEF] border border-transparent'
              }`}
            >
              <FolderOpen size={16} />
              문서 라이브러리
            </button>

            <button
              onClick={() => {
                setCurrentView('design');
                setSelectedPageId(null);
                setSelectedPage(null);
                if (isMobile) setIsSidebarOpen(false);
              }}
              className={`w-full px-3 py-2.5 text-sm rounded-lg text-left transition-all flex items-center gap-2.5 ${
                currentView === 'design'
                  ? 'bg-violet-50 text-violet-700 font-medium border border-violet-200/60'
                  : 'text-gray-700 hover:bg-[#ECECEF] border border-transparent'
              }`}
            >
              <Palette size={16} />
              디자인 라이브러리
            </button>

            {user?.username === 'admin1' && (
              <>
                <div className="px-2 py-1.5 mt-3 text-[11px] font-semibold text-amber-500 uppercase tracking-wider">개발</div>
                <button
                  onClick={() => {
                    setCurrentView('v2test');
                    setSelectedPageId(null);
                    setSelectedPage(null);
                    if (isMobile) setIsSidebarOpen(false);
                  }}
                  className={`w-full px-3 py-2.5 text-sm rounded-lg text-left transition-all flex items-center gap-2.5 ${
                    currentView === 'v2test'
                      ? 'bg-amber-50 text-amber-700 font-medium border border-amber-200/60'
                      : 'text-amber-600 hover:bg-amber-50/70 border border-transparent'
                  }`}
                >
                  <Zap size={16} />
                  V2 기능 테스트
                </button>
              </>
            )}
          </div>
        )}

        {/* Bottom — 공통 영역 */}
        <div className="p-3 border-t border-[#E5E5EA] space-y-1">
          <button
            onClick={() => {
              setCurrentView('calendar');
              setSelectedPageId(null);
              setSelectedPage(null);
              if (isMobile) setIsSidebarOpen(false);
            }}
            className={`w-full px-3 py-2.5 text-sm rounded-md text-left transition-colors flex items-center gap-2 ${
              currentView === 'calendar'
                ? 'bg-[#F4E7E0] text-[#9C4A2D] font-medium'
                : 'text-gray-700 hover:bg-[#ECECEF]'
            }`}
          >
            <Calendar size={16} />
            캘린더
          </button>
          {selectedWorkspace.name === '아유타' && (
            <button
              onClick={() => {
                setCurrentView('ayuta-buyers');
                setSelectedPageId(null);
                setSelectedPage(null);
                if (isMobile) setIsSidebarOpen(false);
              }}
              className={`w-full px-3 py-2.5 text-sm rounded-md text-left transition-colors flex items-center gap-2 ${
                currentView === 'ayuta-buyers'
                  ? 'bg-[#FAEAE4] text-[#9C4A2D] font-medium'
                  : 'text-gray-700 hover:bg-[#ECECEF]'
              }`}
            >
              <Coffee size={16} />
              거래처 관리
            </button>
          )}
          {selectedWorkspace.name === '아유타' && (
            <button
              onClick={() => {
                setCurrentView('price-list');
                setSelectedPageId(null);
                setSelectedPage(null);
                if (isMobile) setIsSidebarOpen(false);
              }}
              className={`w-full px-3 py-2.5 text-sm rounded-md text-left transition-colors flex items-center gap-2 ${
                currentView === 'price-list'
                  ? 'bg-[#FAEAE4] text-[#9C4A2D] font-medium'
                  : 'text-gray-700 hover:bg-[#ECECEF]'
              }`}
            >
              <Tag size={16} />
              단가표
            </button>
          )}
          <button
            onClick={() => setIsTrashViewOpen(true)}
            className="w-full px-3 py-2.5 text-sm text-gray-700 hover:bg-[#ECECEF] rounded-md text-left transition-colors flex items-center gap-2"
          >
            <Trash2 size={16} />
            휴지통
          </button>
          <div className="px-3 py-2">
            <KakaoLinkButton username={user?.username} />
          </div>
          <button
            onClick={() => setIsPasswordChangeModalOpen(true)}
            className="w-full px-3 py-2.5 text-sm text-gray-700 hover:bg-[#ECECEF] rounded-md text-left transition-colors"
          >
            비밀번호 변경
          </button>
          <button
            onClick={handleLogout}
            className="w-full px-3 py-2.5 text-sm text-gray-700 hover:bg-[#ECECEF] rounded-md text-left transition-colors"
          >
            로그아웃
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#F5F5F7] min-w-0">
        {/* Mobile top bar */}
        {isMobile && (
          <div className="sticky top-0 z-20 bg-white border-b border-[#E5E5EA] px-3 py-2 flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-gray-500 hover:bg-[#F2F2F7] rounded-md"
            >
              <Menu size={20} />
            </button>
            <span className="font-semibold text-gray-800 text-sm truncate">
              {selectedPage?.title || 'Cotion'}
            </span>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {currentView === 'calendar' ? (
            <Suspense fallback={<ViewLoading />}>
              <CalendarPage workspace={selectedWorkspace.name} onNavigateToPage={handlePageSelect} />
            </Suspense>
          ) : currentView === 'ayuta-buyers' ? (
            <Suspense fallback={<ViewLoading />}>
              <AyutaBuyersPage workspace={selectedWorkspace.name} />
            </Suspense>
          ) : currentView === 'price-list' ? (
            <Suspense fallback={<ViewLoading />}>
              <PriceListPage workspace={selectedWorkspace.name} />
            </Suspense>
          ) : currentView === 'inventory' ? (
            <Suspense fallback={<ViewLoading />}>
              <InventoryPage workspace={selectedWorkspace.name} />
            </Suspense>
          ) : currentView === 'kanban' ? (
            <Suspense fallback={<ViewLoading />}>
              <KanbanBoard workspace={selectedWorkspace.name} initialProjectId={selectedKanbanProjectId} />
            </Suspense>
          ) : currentView === 'cupping' ? (
            <Suspense fallback={<ViewLoading />}>
              <CuppingLogPage workspace={selectedWorkspace.name} />
            </Suspense>
          ) : currentView === 'documents' ? (
            <Suspense fallback={<ViewLoading />}>
              <DocumentLibrary workspace={selectedWorkspace.name} />
            </Suspense>
          ) : currentView === 'design' ? (
            <Suspense fallback={<ViewLoading />}>
              <DesignLibrary workspace={selectedWorkspace.name} />
            </Suspense>
          ) : currentView === 'v2test' ? (
            <Suspense fallback={<ViewLoading />}>
              <V2TestPage workspace={selectedWorkspace.name} />
            </Suspense>
          ) : currentView === 'admin' ? (
            <Suspense fallback={<ViewLoading />}>
              <AdminPage />
            </Suspense>
          ) : selectedPage ? (
            <div className="max-w-5xl mx-auto px-6 py-6 sm:px-12 sm:py-10">
              {/* Menu Button for Desktop when sidebar collapsed */}
              {!isMobile && !isSidebarOpen && (
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="mb-4 p-2 text-gray-500 hover:bg-[#F2F2F7] rounded-md"
                >
                  <Menu size={20} />
                </button>
              )}

              {/* Page Header Card */}
              <div className="bg-white rounded-2xl border border-[#E5E5EA] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-6 sm:p-8 mb-6">
                {/* Page Title */}
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onBlur={handleSave}
                  className="text-2xl sm:text-3xl font-bold border-none outline-none focus:ring-0 w-full mb-4 text-[#1D1D1F] placeholder-gray-300"
                  placeholder="제목 없음"
                />

                {/* Category + Save bar */}
                <div className="flex items-center gap-3 text-sm text-gray-400 flex-wrap border-t border-[#E5E5EA] pt-4">
                  <div className="w-48 sm:w-56">
                    <CategorySelect
                      value={editedCategory}
                      onChange={(val) => {
                        setEditedCategory(val);
                      }}
                      options={existingCategories}
                      placeholder="카테고리 없음"
                    />
                  </div>

                  <span className="hidden sm:inline text-gray-300">|</span>

                  <span className="hidden sm:inline select-none text-xs">
                    {navigator.platform.includes('Mac') ? '⌘S' : 'Ctrl+S'} 또는 버튼으로 저장
                  </span>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="ml-auto px-4 py-2 bg-[#C56A3E] text-white rounded-lg hover:bg-[#B45C33] disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                  >
                    {isSaving ? '저장 중...' : '저장'}
                  </button>
                </div>
              </div>

              {/* Editor Card */}
              <div className="bg-white rounded-2xl border border-[#E5E5EA] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-6 sm:p-8">
                <Suspense fallback={<div className="text-[#86868B] text-sm py-10 text-center">에디터 불러오는 중…</div>}>
                  <TiptapEditor
                    key={selectedPageId}
                    content={editedContent}
                    onChange={setEditedContent}
                    onSave={handleSave}
                    pageId={selectedPageId!}
                    userId={user?.id || ''}
                    userName={user?.name || 'Anonymous'}
                  />
                </Suspense>
              </div>

              {/* Comments Card */}
              <div className="bg-white rounded-2xl border border-[#E5E5EA] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-6 sm:p-8 mt-6">
                <Suspense fallback={<div className="text-[#86868B] text-sm py-6 text-center">댓글 불러오는 중…</div>}>
                  <CommentSection
                    pageId={selectedPageId!}
                    userId={user?.id || ''}
                    userName={user?.name || 'Anonymous'}
                  />
                </Suspense>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full relative px-4">
              {/* Content */}
              <div className="text-center relative z-10 bg-white rounded-2xl border border-[#E5E5EA] shadow-[0_1px_3px_rgba(0,0,0,0.04)] px-10 py-12 sm:px-16 sm:py-16 max-w-lg">
                <div className="mb-6">
                  <img
                    src="/logo.png"
                    alt="Cotion Logo"
                    className="h-16 sm:h-24 w-auto object-contain mx-auto mb-4"
                  />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-[#1D1D1F] mb-2">Cotion</h2>
                <p className="text-base sm:text-lg font-semibold text-gray-700 mb-4">우리만의 워크스페이스</p>
                <p className="text-sm text-gray-400">페이지를 선택하거나 새로 만들어보세요</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <NewPageModal
        isOpen={isNewPageModalOpen}
        onClose={() => {
          setIsNewPageModalOpen(false);
          setNewPageParentId(undefined);
          setNewPageCategory(undefined);
        }}
        onSubmit={handleCreatePage}
        existingCategories={existingCategories}
        defaultCategory={newPageCategory}
      />

      <PasswordChangeModal
        isOpen={isPasswordChangeModalOpen}
        onClose={() => setIsPasswordChangeModalOpen(false)}
      />

      <NicknameModal
        isOpen={showNicknameModal}
        currentName={user?.name || ''}
        onComplete={(newName) => {
          setShowNicknameModal(false);
          window.location.reload();
        }}
      />

      {isTrashViewOpen && (
        <TrashView
          onClose={() => setIsTrashViewOpen(false)}
          onRestore={handleTrashRestore}
          isSuperAdmin={(user as any)?.role === 'superadmin'}
        />
      )}
    </div>
  );
}
