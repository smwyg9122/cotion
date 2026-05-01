import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  Search,
  Upload,
  Link,
  Check,
  X,
  File,
  BookOpen,
  DollarSign,
  ClipboardList,
  ScrollText,
  Download,
  Eye,
  ArrowLeft,
  Paperclip,
  Calendar,
  User,
  Tag,
} from 'lucide-react';
import { api } from '../../services/api';
import { Modal } from '../common/Modal';

interface DocumentLibraryProps {
  workspace: string;
}

interface Document {
  id: string;
  title: string;
  category: string;
  description?: string | null;
  fileId?: string | null;
  pageId?: string | null;
  workspace: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  // File metadata (from backend JOIN)
  fileName?: string;
  fileMimeType?: string;
  fileSize?: number;
}

interface DocumentFormData {
  title: string;
  category: string;
  description: string;
  pageId: string;
  file: File | null;
}

const INITIAL_FORM: DocumentFormData = {
  title: '',
  category: 'other',
  description: '',
  pageId: '',
  file: null,
};

type CategoryKey = 'plan' | 'pricelist' | 'form' | 'whitepaper' | 'other';
type CategoryFilter = 'all' | CategoryKey;

const CATEGORY_CONFIG: Record<CategoryKey, { label: string; icon: React.ElementType; color: string }> = {
  plan: { label: '기획안', icon: BookOpen, color: 'bg-blue-100 text-blue-700' },
  pricelist: { label: '가격표', icon: DollarSign, color: 'bg-emerald-100 text-emerald-700' },
  form: { label: '양식', icon: ClipboardList, color: 'bg-purple-100 text-purple-700' },
  whitepaper: { label: '백서', icon: ScrollText, color: 'bg-amber-100 text-amber-700' },
  other: { label: '기타', icon: File, color: 'bg-gray-100 text-gray-700' },
};

// Safe category lookup — unknown categories fall back to 'other'
function getCategoryConfig(category: string) {
  return CATEGORY_CONFIG[category as CategoryKey] || CATEGORY_CONFIG.other;
}

const CATEGORY_FILTERS: { key: CategoryFilter; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'plan', label: '기획안' },
  { key: 'pricelist', label: '가격표' },
  { key: 'form', label: '양식' },
  { key: 'whitepaper', label: '백서' },
  { key: 'other', label: '기타' },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileDownloadUrl(fileId: string): string {
  const baseUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000/api';
  return `${baseUrl}/files/${fileId}`;
}

export function DocumentLibrary({ workspace }: DocumentLibraryProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Add/Edit modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [formData, setFormData] = useState<DocumentFormData>(INITIAL_FORM);
  const [isSaving, setIsSaving] = useState(false);

  // Detail view
  const [detailDocument, setDetailDocument] = useState<Document | null>(null);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { workspace };
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const response = await api.get('/documents', { params });
      setDocuments(response.data.data || []);
    } catch (err: any) {
      console.error('Failed to fetch documents:', err);
      setError('문서 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [workspace, categoryFilter, searchQuery]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleOpenAdd = () => {
    setSelectedDocument(null);
    setFormData(INITIAL_FORM);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (e: React.MouseEvent, doc: Document) => {
    e.stopPropagation();
    setSelectedDocument(doc);
    setFormData({
      title: doc.title,
      category: doc.category,
      description: doc.description || '',
      pageId: doc.pageId || '',
      file: null,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) return;
    setIsSaving(true);
    try {
      // Step 1: Upload file if one is selected
      let fileId: string | undefined;
      if (formData.file) {
        console.log('[DocumentLibrary] Uploading file:', formData.file.name, formData.file.size, 'bytes');
        const uploadData = new FormData();
        uploadData.append('file', formData.file);
        const uploadRes = await api.post('/files/upload', uploadData);
        console.log('[DocumentLibrary] File upload response:', uploadRes.data);
        fileId = uploadRes.data.data?.id || uploadRes.data.id;
        if (!fileId) {
          throw new Error('파일 업로드 응답에 ID가 없습니다');
        }
        console.log('[DocumentLibrary] Got fileId:', fileId);
      }

      // Step 2: Build document payload — strip empty strings to avoid Zod validation errors
      const payload: Record<string, any> = {
        title: formData.title.trim(),
        category: formData.category || 'other',
      };
      if (formData.description && formData.description.trim()) {
        payload.description = formData.description.trim();
      }
      // Only include pageId if it's a valid non-empty string
      if (formData.pageId && formData.pageId.trim()) {
        payload.pageId = formData.pageId.trim();
      }
      if (fileId) {
        payload.fileId = fileId;
      }
      if (!selectedDocument) {
        payload.workspace = workspace;
      }

      console.log('[DocumentLibrary] Saving document:', selectedDocument ? 'UPDATE' : 'CREATE', payload);

      // Step 3: Create or update the document
      if (selectedDocument) {
        await api.put(`/documents/${selectedDocument.id}`, payload);
      } else {
        await api.post('/documents', payload);
      }

      console.log('[DocumentLibrary] Document saved successfully');
      const refreshed = await fetchDocuments();
      setIsModalOpen(false);
      // Update detail view if the edited document was being viewed
      if (selectedDocument && detailDocument?.id === selectedDocument.id) {
        // Re-fetch the specific document to get updated data with file metadata
        try {
          const detailRes = await api.get(`/documents/${selectedDocument.id}`);
          if (detailRes.data.data) {
            setDetailDocument(detailRes.data.data);
          }
        } catch {
          // If fetch fails, just close detail view
          setDetailDocument(null);
        }
      }
    } catch (err: any) {
      console.error('[DocumentLibrary] Failed to save document:', err);
      console.error('[DocumentLibrary] Error response:', err?.response?.data);
      const serverMsg = err?.response?.data?.error?.message || '';
      const details = err?.response?.data?.error?.details;
      let msg = serverMsg || err.message || '문서 저장에 실패했습니다.';
      if (details) {
        msg += '\n\n상세: ' + JSON.stringify(details, null, 2);
      }
      alert(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await api.delete(`/documents/${id}`);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      setDeleteConfirmId(null);
      // Close detail view if the deleted document was being viewed
      if (detailDocument?.id === id) {
        setDetailDocument(null);
      }
    } catch (err: any) {
      console.error('Failed to delete document:', err);
      alert('문서 삭제에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({ ...prev, file }));
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      fetchDocuments();
    }
  };

  const handleCardClick = (doc: Document) => {
    setDetailDocument(doc);
  };

  const handleDownloadFile = (fileId: string) => {
    const url = getFileDownloadUrl(fileId);
    window.open(url, '_blank');
  };

  // Drag-and-drop quick upload
  const handleQuickUpload = async (files: FileList) => {
    if (files.length === 0) return;
    setIsUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log('[DocumentLibrary] Quick upload file:', file.name, file.size, 'bytes');

        // 1. Upload file
        const uploadData = new FormData();
        uploadData.append('file', file);
        const uploadRes = await api.post('/files/upload', uploadData);
        console.log('[DocumentLibrary] Quick upload response:', uploadRes.data);
        const fileId = uploadRes.data.data?.id || uploadRes.data.id;

        if (!fileId) {
          console.error('[DocumentLibrary] No fileId in upload response');
          throw new Error('파일 업로드 응답에 ID가 없습니다');
        }

        // 2. Create document record (filename → title, extension → category guess)
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        let category = 'other';
        if (['pdf', 'doc', 'docx', 'hwp', 'hwpx', 'rtf', 'txt'].includes(ext)) category = 'whitepaper';
        if (['xls', 'xlsx', 'csv'].includes(ext)) category = 'pricelist';
        if (['ppt', 'pptx'].includes(ext)) category = 'plan';

        await api.post('/documents', {
          title: file.name,
          category,
          fileId,
          workspace,
        });
        console.log('[DocumentLibrary] Document created for:', file.name);
      }
      await fetchDocuments();
    } catch (err: any) {
      console.error('[DocumentLibrary] Quick upload failed:', err);
      console.error('[DocumentLibrary] Error response:', err?.response?.data);
      const serverMsg = err?.response?.data?.error?.message || '';
      alert(serverMsg || '파일 업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleQuickUpload(e.dataTransfer.files);
    }
  };

  // ─── Detail View ───────────────────────────────────────────
  if (detailDocument) {
    const catConfig = getCategoryConfig(detailDocument.category);
    const CatIcon = catConfig.icon;

    return (
      <div className="h-full flex flex-col bg-gray-50">
        {/* Detail Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="p-6">
            <button
              onClick={() => setDetailDocument(null)}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4 transition-colors"
            >
              <ArrowLeft size={18} />
              <span className="text-sm font-medium">목록으로 돌아가기</span>
            </button>

            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${catConfig.color}`}>
                  <CatIcon size={28} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">
                    {detailDocument.title}
                  </h1>
                  <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${catConfig.color}`}>
                    {catConfig.label}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => handleOpenEdit(e, detailDocument)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit size={16} />
                  <span>수정</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Detail Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Description */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">설명</h2>
              <p className="text-gray-700 whitespace-pre-wrap">
                {detailDocument.description || '설명이 없습니다.'}
              </p>
            </div>

            {/* Attached File */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                첨부 파일
              </h2>
              {detailDocument.fileId ? (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <Paperclip size={20} className="text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {detailDocument.fileName || '첨부 파일'}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                        {detailDocument.fileMimeType && (
                          <span>{detailDocument.fileMimeType}</span>
                        )}
                        {detailDocument.fileSize && (
                          <span>{formatFileSize(detailDocument.fileSize)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {detailDocument.fileMimeType?.startsWith('image/') && (
                      <button
                        onClick={() => handleDownloadFile(detailDocument.fileId!)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Eye size={16} />
                        <span>보기</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleDownloadFile(detailDocument.fileId!)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition-colors"
                    >
                      <Download size={16} />
                      <span>다운로드</span>
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400 text-sm">첨부된 파일이 없습니다.</p>
              )}

              {/* Image preview */}
              {detailDocument.fileId && detailDocument.fileMimeType?.startsWith('image/') && (
                <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
                  <img
                    src={getFileDownloadUrl(detailDocument.fileId)}
                    alt={detailDocument.fileName || detailDocument.title}
                    className="max-w-full max-h-96 object-contain mx-auto"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            {/* Metadata */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">정보</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Calendar size={16} className="text-gray-400" />
                  <span className="text-gray-500">생성일:</span>
                  <span className="text-gray-900">
                    {detailDocument.createdAt
                      ? new Date(detailDocument.createdAt).toLocaleString('ko-KR')
                      : '-'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Calendar size={16} className="text-gray-400" />
                  <span className="text-gray-500">수정일:</span>
                  <span className="text-gray-900">
                    {detailDocument.updatedAt
                      ? new Date(detailDocument.updatedAt).toLocaleString('ko-KR')
                      : '-'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Tag size={16} className="text-gray-400" />
                  <span className="text-gray-500">카테고리:</span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${catConfig.color}`}>
                    {catConfig.label}
                  </span>
                </div>
                {detailDocument.pageId && (
                  <div className="flex items-center gap-3 text-sm">
                    <Link size={16} className="text-gray-400" />
                    <span className="text-gray-500">연결 페이지:</span>
                    <span className="text-indigo-600">{detailDocument.pageId}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── List View ─────────────────────────────────────────────
  return (
    <div
      className="h-full flex flex-col bg-gray-50 relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-indigo-50/90 border-4 border-dashed border-indigo-400 rounded-xl flex flex-col items-center justify-center pointer-events-none">
          <Upload size={64} className="text-indigo-500 mb-4" />
          <p className="text-2xl font-bold text-indigo-700">파일을 여기에 놓으세요</p>
          <p className="text-sm text-indigo-500 mt-2">파일이 자동으로 문서 라이브러리에 추가됩니다</p>
        </div>
      )}

      {/* Upload spinner */}
      {isUploading && (
        <div className="absolute inset-0 z-50 bg-white/80 flex flex-col items-center justify-center">
          <div className="animate-spin w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full mb-4"></div>
          <p className="text-lg font-semibold text-indigo-700">파일 업로드 중...</p>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <FileText className="w-6 h-6 text-indigo-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">문서 라이브러리</h1>
            </div>
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              <Plus size={20} />
              <span>문서 추가</span>
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="문서 검색..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50"
            />
          </div>

          {/* Category filter tabs */}
          <div className="flex gap-2 flex-wrap">
            {CATEGORY_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setCategoryFilter(f.key)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                  categoryFilter === f.key
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">로딩 중...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-red-500">{error}</div>
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <FileText size={48} className="mb-4" />
            <p className="text-lg">등록된 문서가 없습니다.</p>
            <p className="text-sm mt-1">파일을 드래그하여 빠르게 추가할 수도 있습니다.</p>
            <button
              onClick={handleOpenAdd}
              className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium"
            >
              + 새 문서 추가
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {documents.map((doc) => {
              const catConfig = getCategoryConfig(doc.category);
              const CatIcon = catConfig.icon;

              return (
                <div
                  key={doc.id}
                  onClick={() => handleCardClick(doc)}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all overflow-hidden group cursor-pointer"
                >
                  {/* Card icon area */}
                  <div className="px-5 pt-5 pb-3">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`p-2.5 rounded-lg ${catConfig.color}`}>
                        <CatIcon size={22} />
                      </div>
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${catConfig.color}`}>
                        {catConfig.label}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-semibold text-gray-900 mb-1.5 line-clamp-2">
                      {doc.title}
                    </h3>

                    {/* Description */}
                    {doc.description && (
                      <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                        {doc.description}
                      </p>
                    )}

                    {/* File indicator */}
                    {doc.fileId && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                        <Paperclip size={12} />
                        <span className="truncate">
                          {doc.fileName || '첨부 파일'}
                        </span>
                        {doc.fileSize && (
                          <span className="text-gray-300">({formatFileSize(doc.fileSize)})</span>
                        )}
                      </div>
                    )}

                    {/* Linked page indicator */}
                    {doc.pageId && (
                      <div className="flex items-center gap-1.5 text-xs text-indigo-400 mb-2">
                        <Link size={12} />
                        <span>연결된 페이지</span>
                      </div>
                    )}
                  </div>

                  {/* Card footer */}
                  <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      {doc.createdAt
                        ? new Date(doc.createdAt).toLocaleDateString('ko-KR')
                        : '-'}
                    </span>
                    <div className="flex items-center gap-1">
                      {doc.fileId && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadFile(doc.fileId!);
                          }}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                          title="다운로드"
                        >
                          <Download size={14} />
                        </button>
                      )}
                      <button
                        onClick={(e) => handleOpenEdit(e, doc)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                        title="수정"
                      >
                        <Edit size={14} />
                      </button>
                      {deleteConfirmId === doc.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => handleDelete(e, doc.id)}
                            className="p-1.5 text-white bg-red-500 hover:bg-red-600 rounded transition-colors"
                          >
                            <Check size={12} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmId(null);
                            }}
                            className="p-1.5 text-gray-400 hover:text-gray-600 rounded transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(doc.id);
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                          title="삭제"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedDocument ? '문서 수정' : '문서 추가'}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">제목 *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="문서 제목"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">카테고리 *</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="plan">기획안</option>
              <option value="pricelist">가격표</option>
              <option value="form">양식</option>
              <option value="whitepaper">백서</option>
              <option value="other">기타</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">설명</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="문서 설명 (선택사항)"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">파일 업로드 (선택)</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
            >
              <Upload size={24} className="mx-auto mb-2 text-gray-400" />
              {formData.file ? (
                <div>
                  <p className="text-sm text-indigo-600 font-medium">{formData.file.name}</p>
                  <p className="text-xs text-gray-400 mt-1">{formatFileSize(formData.file.size)}</p>
                </div>
              ) : selectedDocument?.fileId ? (
                <div>
                  <p className="text-sm text-gray-500">
                    현재 파일: {selectedDocument.fileName || '첨부 파일'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">클릭하여 새 파일로 변경</p>
                </div>
              ) : (
                <p className="text-sm text-gray-400">클릭하여 파일 선택 (모든 파일 형식 허용)</p>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">연결 페이지 ID (선택)</label>
            <input
              type="text"
              value={formData.pageId}
              onChange={(e) => setFormData({ ...formData, pageId: e.target.value })}
              placeholder="연결할 페이지 ID"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
              disabled={isSaving}
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={!formData.title.trim() || isSaving}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 transition-colors font-medium min-w-[80px] flex items-center justify-center"
            >
              {isSaving ? (
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
              ) : (
                selectedDocument ? '수정' : '추가'
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
