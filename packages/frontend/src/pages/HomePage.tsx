import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { usePages } from '../hooks/usePages';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/common';
import { PageTree } from '../components/pages/PageTree';
import { NewPageModal } from '../components/pages/NewPageModal';
import { PasswordChangeModal } from '../components/auth/PasswordChangeModal';
import { TrashView } from '../components/pages/TrashView';
import { TiptapEditor } from '../components/editor/TiptapEditor';
import { Menu, X, FileText, Trash2 } from 'lucide-react';
import type { Page } from '@cotion/shared';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export function HomePage() {
  const { user, logout } = useAuth();
  const { pages, isLoading, createPage, updatePage, getPage, refreshPages } = usePages();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const [isNewPageModalOpen, setIsNewPageModalOpen] = useState(false);
  const [isPasswordChangeModalOpen, setIsPasswordChangeModalOpen] = useState(false);
  const [isTrashViewOpen, setIsTrashViewOpen] = useState(false);
  const [newPageParentId, setNewPageParentId] = useState<string | undefined>();
  const [editedTitle, setEditedTitle] = useState('');
  const [editedContent, setEditedContent] = useState('');

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  async function handlePageSelect(pageId: string) {
    try {
      setSelectedPageId(pageId);
      const page = await getPage(pageId);
      setSelectedPage(page);
      setEditedTitle(page.title);
      setEditedContent(page.content || '');
    } catch (error) {
      showToast('페이지를 불러오는데 실패했습니다', 'error');
      console.error('Failed to load page:', error);
    }
  }

  async function handleCreatePage(title: string, icon?: string) {
    try {
      await createPage({
        title,
        icon,
        parentId: newPageParentId,
      });
      setNewPageParentId(undefined);
      showToast('페이지가 생성되었습니다', 'success');
    } catch (error) {
      showToast('페이지 생성에 실패했습니다', 'error');
      console.error('Failed to create page:', error);
      throw error;
    }
  }

  function openNewPageModal(parentId?: string) {
    setNewPageParentId(parentId);
    setIsNewPageModalOpen(true);
  }

  async function handleSave() {
    if (selectedPageId && selectedPage) {
      try {
        await updatePage(selectedPageId, {
          title: editedTitle,
          content: editedContent,
        });
        setSelectedPage({ ...selectedPage, title: editedTitle, content: editedContent });
        showToast('저장되었습니다', 'success', 1500);
      } catch (error) {
        showToast('저장에 실패했습니다', 'error');
        console.error('Failed to save page:', error);
      }
    }
  }

  async function handleDeletePage(pageId: string) {
    if (!confirm('이 페이지를 휴지통으로 이동하시겠습니까?')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/pages/${pageId}`, {
        withCredentials: true,
      });
      showToast('페이지가 휴지통으로 이동되었습니다', 'success');

      // If the deleted page is currently selected, clear selection
      if (selectedPageId === pageId) {
        setSelectedPageId(null);
        setSelectedPage(null);
      }

      // Refresh the page tree
      refreshPages();
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
  }, [selectedPageId, editedTitle, editedContent]);

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <div
        className={`${
          isSidebarOpen ? 'w-64' : 'w-0'
        } bg-[#f7f6f3] border-r border-gray-200 transition-all duration-200 overflow-hidden flex flex-col`}
      >
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-gray-900">Cotion</h1>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-1 text-gray-500 hover:bg-gray-200 rounded"
            >
              <X size={18} />
            </button>
          </div>
          <div className="text-sm text-gray-600 font-medium">{user?.name}</div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-3">
          {isLoading ? (
            <div className="text-center py-8 text-gray-400 text-sm">로딩 중...</div>
          ) : (
            <PageTree
              pages={pages}
              onPageSelect={handlePageSelect}
              onCreatePage={openNewPageModal}
              onDeletePage={handleDeletePage}
              selectedPageId={selectedPageId || undefined}
            />
          )}
        </div>
        <div className="p-3 border-t border-gray-200 space-y-1">
          <button
            onClick={() => setIsTrashViewOpen(true)}
            className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-200/70 rounded-md text-left transition-colors flex items-center gap-2"
          >
            <Trash2 size={16} />
            휴지통
          </button>
          <button
            onClick={() => setIsPasswordChangeModalOpen(true)}
            className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-200/70 rounded-md text-left transition-colors"
          >
            비밀번호 변경
          </button>
          <button
            onClick={handleLogout}
            className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-200/70 rounded-md text-left transition-colors"
          >
            로그아웃
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {selectedPage ? (
            <div className="max-w-[900px] mx-auto px-16 py-8">
              {/* Menu Button for Mobile */}
              {!isSidebarOpen && (
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="mb-4 p-2 text-gray-500 hover:bg-gray-100 rounded-md lg:hidden"
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
                className="text-[2.75rem] font-bold border-none outline-none focus:ring-0 w-full mb-4 text-gray-900 placeholder-gray-300"
                placeholder="제목 없음"
              />

              {/* Editor */}
              <TiptapEditor
                content={editedContent}
                onChange={setEditedContent}
                onSave={handleSave}
                pageId={selectedPageId!}
                userId={user?.id || ''}
                userName={user?.name || 'Anonymous'}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full relative">
              {/* Background Logo */}
              <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
                <img
                  src="/logo.png"
                  alt="Ayuta Coffee Logo"
                  className="h-96 w-auto object-contain"
                />
              </div>

              {/* Content */}
              <div className="text-center relative z-10">
                <div className="mb-6">
                  <img
                    src="/logo.png"
                    alt="Ayuta Coffee Logo"
                    className="h-32 w-auto object-contain mx-auto mb-4"
                  />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-3">Cotion</h2>
                <p className="text-xl font-semibold text-gray-700 mb-6">Ayuta 전용 협업 문서 관리 시스템</p>
                <p className="text-lg text-gray-500">페이지를 선택하거나 새로 만들어보세요</p>
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
        }}
        onSubmit={handleCreatePage}
      />

      <PasswordChangeModal
        isOpen={isPasswordChangeModalOpen}
        onClose={() => setIsPasswordChangeModalOpen(false)}
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
