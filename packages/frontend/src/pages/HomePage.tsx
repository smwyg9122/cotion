import React, { useState, useEffect, useMemo } from 'react';
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
import { TiptapEditor } from '../components/editor/TiptapEditor';
import { CommentSection } from '../components/comments/CommentSection';
import { Menu, X, Trash2, Plus, ChevronDown, Check, Calendar, Users, Package, Kanban, Coffee, FolderOpen, Zap } from 'lucide-react';
import { CalendarPage } from '../components/calendar/CalendarPage';
import { ClientsPage } from '../components/clients/ClientsPage';
import { InventoryPage } from '../components/inventory/InventoryPage';
import { KanbanBoard } from '../components/projects/KanbanBoard';
import { CuppingLogPage } from '../components/cupping/CuppingLogPage';
import { DocumentLibrary } from '../components/documents/DocumentLibrary';
import { V2TestPage } from '../components/test/V2TestPage';
import { CategorySelect } from '../components/common';
import type { Page } from '@cotion/shared';

const ALL_WORKSPACES = [
  { name: '아유타', icon: '☕', label: 'Ayuta' },
  { name: '제이로텍', icon: '🏢', label: '제이로텍' },
];

export function HomePage() {
  const { user, logout } = useAuth();
  const { pages, isLoading, createPage, updatePage, deletePage, getPage, refreshPages, searchPages, movePage } = usePages();
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
  const [currentView, setCurrentView] = useState<'pages' | 'calendar' | 'clients' | 'inventory' | 'kanban' | 'cupping' | 'documents' | 'v2test'>('pages');

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
    <div className="flex h-screen bg-white">
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
        } bg-[#f7f6f3] border-r border-gray-200 overflow-hidden flex flex-col`}
      >
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => { setSelectedPageId(null); setSelectedPage(null); }}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <img src="/logo.png" alt="Cotion" className="h-7 w-7 object-contain" />
              <span className="text-xl font-bold text-gray-900">Cotion</span>
            </button>
            <div className="flex items-center gap-1">
              <NotificationBell onPageSelect={handlePageSelect} />
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-1 text-gray-500 hover:bg-gray-200 rounded"
              >
                <X size={18} />
              </button>
            </div>
          </div>
          {/* Workspace Switcher */}
          <div className="relative">
            <button
              onClick={() => setIsWorkspaceSwitcherOpen(!isWorkspaceSwitcherOpen)}
              className="flex items-center gap-1.5 px-2 py-1.5 -mx-2 rounded-md hover:bg-gray-200/70 transition-colors w-full"
            >
              <span className="text-base">{selectedWorkspace.icon}</span>
              <span className="text-sm font-semibold text-gray-800">{selectedWorkspace.label}</span>
              <ChevronDown size={14} className="text-gray-400 ml-auto" />
            </button>
            {isWorkspaceSwitcherOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsWorkspaceSwitcherOpen(false)} />
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  {allowedWorkspaces.map((ws) => (
                    <button
                      key={ws.name}
                      onClick={() => {
                        setSelectedWorkspace(ws);
                        setIsWorkspaceSwitcherOpen(false);
                        setSelectedPageId(null);
                        setSelectedPage(null);
                        // 제이로텍으로 전환 시 아유타 전용 뷰이면 pages로 리셋
                        if (ws.name !== '아유타' && ['clients', 'inventory', 'kanban', 'cupping', 'documents', 'v2test'].includes(currentView)) {
                          setCurrentView('pages');
                        }
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-100 transition-colors"
                    >
                      <span className="text-base">{ws.icon}</span>
                      <span className="font-medium text-gray-700">{ws.label}</span>
                      {selectedWorkspace.name === ws.name && (
                        <Check size={14} className="text-blue-600 ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button
            onClick={() => openNewPageModal(undefined, undefined)}
            className="mt-2 w-full px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
          >
            <Plus size={16} />
            새 페이지
          </button>
        </div>
        <SearchBar onSearch={searchPages} onPageSelect={handlePageSelect} />
        <div className="flex-1 overflow-y-auto px-2 py-3">
          {isLoading ? (
            <div className="text-center py-8 text-gray-400 text-sm">로딩 중...</div>
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
              selectedPageId={selectedPageId || undefined}
            />
          )}
        </div>
        <div className="p-3 border-t border-gray-200 space-y-1">
          {/* 업무 관리 섹션 — 아유타 워크스페이스에서만 표시 */}
          {selectedWorkspace.name === '아유타' && (
            <>
              <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">업무 관리</div>
              <button
                onClick={() => {
                  setCurrentView('clients');
                  setSelectedPageId(null);
                  setSelectedPage(null);
                  if (isMobile) setIsSidebarOpen(false);
                }}
                className={`w-full px-3 py-2.5 text-sm rounded-md text-left transition-colors flex items-center gap-2 ${
                  currentView === 'clients'
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-200/70'
                }`}
              >
                <Users size={16} />
                거래처 DB
              </button>
              <button
                onClick={() => {
                  setCurrentView('inventory');
                  setSelectedPageId(null);
                  setSelectedPage(null);
                  if (isMobile) setIsSidebarOpen(false);
                }}
                className={`w-full px-3 py-2.5 text-sm rounded-md text-left transition-colors flex items-center gap-2 ${
                  currentView === 'inventory'
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-200/70'
                }`}
              >
                <Package size={16} />
                재고 관리
              </button>
              <button
                onClick={() => {
                  setCurrentView('kanban');
                  setSelectedPageId(null);
                  setSelectedPage(null);
                  if (isMobile) setIsSidebarOpen(false);
                }}
                className={`w-full px-3 py-2.5 text-sm rounded-md text-left transition-colors flex items-center gap-2 ${
                  currentView === 'kanban'
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-200/70'
                }`}
              >
                <Kanban size={16} />
                프로젝트 보드
              </button>
              <button
                onClick={() => {
                  setCurrentView('cupping');
                  setSelectedPageId(null);
                  setSelectedPage(null);
                  if (isMobile) setIsSidebarOpen(false);
                }}
                className={`w-full px-3 py-2.5 text-sm rounded-md text-left transition-colors flex items-center gap-2 ${
                  currentView === 'cupping'
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-200/70'
                }`}
              >
                <Coffee size={16} />
                커핑 로그
              </button>
              <button
                onClick={() => {
                  setCurrentView('documents');
                  setSelectedPageId(null);
                  setSelectedPage(null);
                  if (isMobile) setIsSidebarOpen(false);
                }}
                className={`w-full px-3 py-2.5 text-sm rounded-md text-left transition-colors flex items-center gap-2 ${
                  currentView === 'documents'
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-200/70'
                }`}
              >
                <FolderOpen size={16} />
                문서 라이브러리
              </button>
              {user?.email === 'shoutlim@gmail.com' && (
                <button
                  onClick={() => {
                    setCurrentView('v2test');
                    setSelectedPageId(null);
                    setSelectedPage(null);
                    if (isMobile) setIsSidebarOpen(false);
                  }}
                  className={`w-full px-3 py-2.5 text-sm rounded-md text-left transition-colors flex items-center gap-2 ${
                    currentView === 'v2test'
                      ? 'bg-amber-50 text-amber-700 font-medium'
                      : 'text-amber-600 hover:bg-amber-50/70'
                  }`}
                >
                  <Zap size={16} />
                  V2 기능 테스트
                </button>
              )}
              <div className="border-t border-gray-200 my-1"></div>
            </>
          )}
          <button
            onClick={() => {
              setCurrentView('calendar');
              setSelectedPageId(null);
              setSelectedPage(null);
              if (isMobile) setIsSidebarOpen(false);
            }}
            className={`w-full px-3 py-2.5 text-sm rounded-md text-left transition-colors flex items-center gap-2 ${
              currentView === 'calendar'
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'text-gray-700 hover:bg-gray-200/70'
            }`}
          >
            <Calendar size={16} />
            캘린더
          </button>
          <button
            onClick={() => setIsTrashViewOpen(true)}
            className="w-full px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-200/70 rounded-md text-left transition-colors flex items-center gap-2"
          >
            <Trash2 size={16} />
            휴지통
          </button>
          <button
            onClick={() => setIsPasswordChangeModalOpen(true)}
            className="w-full px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-200/70 rounded-md text-left transition-colors"
          >
            비밀번호 변경
          </button>
          <button
            onClick={handleLogout}
            className="w-full px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-200/70 rounded-md text-left transition-colors"
          >
            로그아웃
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white min-w-0">
        {/* Mobile top bar */}
        {isMobile && (
          <div className="sticky top-0 z-20 bg-white border-b border-gray-100 px-3 py-2 flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-md"
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
            <CalendarPage
              workspace={selectedWorkspace.name}
              onNavigateToPage={handlePageSelect}
            />
          ) : currentView === 'clients' ? (
            <ClientsPage workspace={selectedWorkspace.name} />
          ) : currentView === 'inventory' ? (
            <InventoryPage workspace={selectedWorkspace.name} />
          ) : currentView === 'kanban' ? (
            <KanbanBoard workspace={selectedWorkspace.name} />
          ) : currentView === 'cupping' ? (
            <CuppingLogPage workspace={selectedWorkspace.name} />
          ) : currentView === 'documents' ? (
            <DocumentLibrary workspace={selectedWorkspace.name} />
          ) : currentView === 'v2test' ? (
            <V2TestPage workspace={selectedWorkspace.name} />
          ) : selectedPage ? (
            <div className="max-w-[900px] mx-auto px-4 py-4 sm:px-16 sm:py-8">
              {/* Menu Button for Desktop when sidebar collapsed */}
              {!isMobile && !isSidebarOpen && (
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="mb-4 p-2 text-gray-500 hover:bg-gray-100 rounded-md"
                >
                  <Menu size={20} />
                </button>
              )}

              {/* Page Title */}
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={handleSave}
                className="text-2xl sm:text-[2.75rem] font-bold border-none outline-none focus:ring-0 w-full mb-2 text-gray-900 placeholder-gray-300"
                placeholder="제목 없음"
              />

              {/* Category + Save bar */}
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 text-sm text-gray-400 flex-wrap">
                {/* Category select */}
                <div className="w-44 sm:w-52">
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

                <span className="hidden sm:inline select-none">
                  {navigator.platform.includes('Mac') ? '⌘S' : 'Ctrl+S'} 또는 버튼으로 저장
                </span>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium transition-colors"
                >
                  {isSaving ? '저장 중...' : '저장'}
                </button>
              </div>

              {/* Editor */}
              <TiptapEditor
                key={selectedPageId}
                content={editedContent}
                onChange={setEditedContent}
                onSave={handleSave}
                pageId={selectedPageId!}
                userId={user?.id || ''}
                userName={user?.name || 'Anonymous'}
              />

              {/* Comments */}
              <CommentSection
                pageId={selectedPageId!}
                userId={user?.id || ''}
                userName={user?.name || 'Anonymous'}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full relative px-4">
              {/* Background Logo */}
              <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
                <img
                  src="/logo.png"
                  alt="Cotion Logo"
                  className="h-64 sm:h-96 w-auto object-contain"
                />
              </div>

              {/* Content */}
              <div className="text-center relative z-10">
                <div className="mb-4 sm:mb-6">
                  <img
                    src="/logo.png"
                    alt="Cotion Logo"
                    className="h-20 sm:h-32 w-auto object-contain mx-auto mb-3 sm:mb-4"
                  />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-3">Cotion</h2>
                <p className="text-base sm:text-xl font-semibold text-gray-700 mb-3 sm:mb-6">우리만의 워크스페이스</p>
                <p className="text-sm sm:text-lg text-gray-500">페이지를 선택하거나 새로 만들어보세요</p>
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
        />
      )}
    </div>
  );
}
