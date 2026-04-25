import React, { useEffect, useState } from 'react';
import { Page } from '@cotion/shared';
import { Trash2, RotateCcw, X, FileText } from 'lucide-react';
import { api } from '../../services/api';

interface TrashViewProps {
  onClose: () => void;
  onRestore: () => void;
  isSuperAdmin?: boolean;
}

export function TrashView({ onClose, onRestore, isSuperAdmin }: TrashViewProps) {
  const [deletedPages, setDeletedPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDeletedPages();
  }, []);

  const loadDeletedPages = async () => {
    try {
      setLoading(true);
      const response = await api.get('/pages/trash/all');
      setDeletedPages(response.data.data);
    } catch (error) {
      console.error('Failed to load trash:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (pageId: string) => {
    try {
      await api.put(`/pages/${pageId}/restore`, {});
      await loadDeletedPages();
      onRestore();
    } catch (error) {
      console.error('Failed to restore page:', error);
      alert('페이지 복원에 실패했습니다');
    }
  };

  const handlePermanentDelete = async (pageId: string) => {
    if (!confirm('정말로 영구적으로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    try {
      await api.delete(`/pages/${pageId}/permanent`);
      await loadDeletedPages();
    } catch (error) {
      console.error('Failed to permanently delete page:', error);
      alert('페이지 삭제에 실패했습니다');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trash2 size={20} className="text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">{isSuperAdmin ? '전체 휴지통 (관리자)' : '휴지통'}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500">로딩 중...</div>
          ) : deletedPages.length === 0 ? (
            <div className="text-center py-12">
              <Trash2 size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">휴지통이 비어있습니다</p>
            </div>
          ) : (
            <div className="space-y-2">
              {deletedPages.map((page) => (
                <div
                  key={page.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {page.icon ? (
                      <span className="text-base">{page.icon}</span>
                    ) : (
                      <FileText size={16} className="flex-shrink-0 text-gray-400" />
                    )}
                    <span className="truncate text-sm text-gray-700">{page.title}</span>
                    {isSuperAdmin && (page as any).deleted_by_name && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded flex-shrink-0">
                        {(page as any).deleted_by_name}
                      </span>
                    )}
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {page.deletedAt && new Date(page.deletedAt).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleRestore(page.id)}
                      className="p-1.5 hover:bg-blue-50 hover:text-blue-600 rounded transition-colors"
                      title="복원"
                    >
                      <RotateCcw size={16} />
                    </button>
                    <button
                      onClick={() => handlePermanentDelete(page.id)}
                      className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded transition-colors"
                      title="영구 삭제"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {deletedPages.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-200 text-sm text-gray-500">
            총 {deletedPages.length}개의 페이지가 휴지통에 있습니다
          </div>
        )}
      </div>
    </div>
  );
}
