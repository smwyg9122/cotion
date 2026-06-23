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
  LayoutGrid,
  Columns,
  UserPlus,
  XCircle,
  GripVertical,
} from 'lucide-react';
import { api } from '../../services/api';
import { formatApiError } from '../../utils/apiError';
import { Modal } from '../common/Modal';

/* ───────────────── Types ────────────────── */

interface DocumentLibraryProps {
  workspace: string;
}

interface TagUser {
  id: string;
  userId: string;
  userName: string;
  taggedAt: string;
}

interface UserInfo {
  id: string;
  name: string;
  username: string;
  title?: string;
}

interface Document {
  id: string;
  title: string;
  category: string;
  status: string;
  description?: string | null;
  fileId?: string | null;
  pageId?: string | null;
  workspace: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  fileName?: string;
  fileMimeType?: string;
  fileSize?: number;
  taggedUsers?: TagUser[];
}

interface DocumentFormData {
  title: string;
  category: string;
  status: string;
  description: string;
  pageId: string;
  file: File | null;
}

const INITIAL_FORM: DocumentFormData = {
  title: '',
  category: 'other',
  status: 'draft',
  description: '',
  pageId: '',
  file: null,
};

/* ───────────────── Constants ────────────────── */

type CategoryKey = 'plan' | 'pricelist' | 'form' | 'whitepaper' | 'other';
type CategoryFilter = 'all' | CategoryKey;

const CATEGORY_CONFIG: Record<CategoryKey, { label: string; icon: React.ElementType; color: string }> = {
  plan: { label: '기획안', icon: BookOpen, color: 'bg-[#EAF1FB] text-[#2D6CDF]' },
  pricelist: { label: '가격표', icon: DollarSign, color: 'bg-[#E7F5EC] text-[#2C8A4A]' },
  form: { label: '양식', icon: ClipboardList, color: 'bg-[#F4EAFB] text-[#8A4FD8]' },
  whitepaper: { label: '백서', icon: ScrollText, color: 'bg-[#FBEAE3] text-[#C2410C]' },
  other: { label: '기타', icon: File, color: 'bg-[#F2F2F7] text-[#6E6E73]' },
};

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

type StatusKey = 'draft' | 'review' | 'complete' | 'archive';

const STATUS_CONFIG: Record<StatusKey, { label: string; color: string; bgColor: string }> = {
  draft: { label: '작성중', color: 'text-[#6E6E73]', bgColor: 'bg-[#F2F2F7]' },
  review: { label: '검토중', color: 'text-[#B25E00]', bgColor: 'bg-[#FCEFD9]' },
  complete: { label: '완료', color: 'text-[#2C8A4A]', bgColor: 'bg-[#E7F5EC]' },
  archive: { label: '보관', color: 'text-[#9C4A2D]', bgColor: 'bg-[#F4E7E0]' },
};

const STATUS_COLUMNS: StatusKey[] = ['draft', 'review', 'complete', 'archive'];

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status as StatusKey] || STATUS_CONFIG.draft;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileDownloadUrl(fileId: string): string {
  const baseUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000/api';
  return `${baseUrl}/files/${fileId}`;
}

/* ───────────────── Component ────────────────── */

type ViewMode = 'grid' | 'kanban';

export function DocumentLibrary({ workspace }: DocumentLibraryProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Users for tagging
  const [users, setUsers] = useState<UserInfo[]>([]);

  // Add/Edit modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [formData, setFormData] = useState<DocumentFormData>(INITIAL_FORM);
  const [isSaving, setIsSaving] = useState(false);

  // Tag modal
  const [tagModalDocId, setTagModalDocId] = useState<string | null>(null);
  const [tagModalUsers, setTagModalUsers] = useState<TagUser[]>([]);

  // Detail view
  const [detailDocument, setDetailDocument] = useState<Document | null>(null);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  // ─── Data Fetching ──────────────────────────────────────

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

  // Fetch workspace users for tagging
  useEffect(() => {
    api.get('/auth/users', { params: { workspace } })
      .then((res) => setUsers(res.data.data || []))
      .catch(() => {});
  }, [workspace]);

  // Handle browser back button — close detail view instead of navigating away
  useEffect(() => {
    if (!detailDocument) return;

    // Push a history entry when opening detail view
    window.history.pushState({ docDetail: true }, '');

    const handlePopState = () => {
      setDetailDocument(null);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [detailDocument?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Handlers ───────────────────────────────────────────

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
      status: doc.status || 'draft',
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
      let fileId: string | undefined;
      if (formData.file) {
        const uploadData = new FormData();
        uploadData.append('file', formData.file);
        const uploadRes = await api.post('/files/upload', uploadData);
        fileId = uploadRes.data.data?.id || uploadRes.data.id;
        if (!fileId) throw new Error('파일 업로드 응답에 ID가 없습니다');
      }

      const payload: Record<string, any> = {
        title: formData.title.trim(),
        category: formData.category || 'other',
        status: formData.status || 'draft',
      };
      if (formData.description && formData.description.trim()) {
        payload.description = formData.description.trim();
      }
      if (formData.pageId && formData.pageId.trim()) {
        payload.pageId = formData.pageId.trim();
      }
      if (fileId) payload.fileId = fileId;
      if (!selectedDocument) payload.workspace = workspace;

      if (selectedDocument) {
        await api.put(`/documents/${selectedDocument.id}`, payload, { params: { workspace } });
      } else {
        await api.post('/documents', payload);
      }

      await fetchDocuments();
      setIsModalOpen(false);

      if (selectedDocument && detailDocument?.id === selectedDocument.id) {
        try {
          const detailRes = await api.get(`/documents/${selectedDocument.id}`, { params: { workspace } });
          if (detailRes.data.data) setDetailDocument(detailRes.data.data);
        } catch { setDetailDocument(null); }
      }
    } catch (err: any) {
      console.error('Failed to save document:', err);
      alert(formatApiError(err, '문서 저장에 실패했습니다.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await api.delete(`/documents/${id}`, { params: { workspace } });
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      setDeleteConfirmId(null);
      if (detailDocument?.id === id) setDetailDocument(null);
    } catch (err) {
      alert(formatApiError(err, '문서 삭제에 실패했습니다.'));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setFormData((prev) => ({ ...prev, file }));
  };

  const handleCardClick = (doc: Document) => setDetailDocument(doc);

  const handleDownloadFile = (fileId: string) => window.open(getFileDownloadUrl(fileId), '_blank');

  // ─── Status change (kanban drag) ────────────────────────

  const handleStatusChange = async (docId: string, newStatus: string) => {
    try {
      await api.patch(`/documents/${docId}/status`, { status: newStatus }, { params: { workspace } });
      setDocuments((prev) =>
        prev.map((d) => (d.id === docId ? { ...d, status: newStatus } : d))
      );
    } catch (err) {
      alert(formatApiError(err, '상태 변경에 실패했습니다.'));
    }
  };

  // Kanban drag
  const handleKanbanDragStart = (e: React.DragEvent, docId: string) => {
    e.dataTransfer.setData('docId', docId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleKanbanDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const docId = e.dataTransfer.getData('docId');
    if (docId) handleStatusChange(docId, newStatus);
  };

  // ─── Tags ───────────────────────────────────────────────

  const handleOpenTagModal = async (e: React.MouseEvent, doc: Document) => {
    e.stopPropagation();
    setTagModalDocId(doc.id);
    setTagModalUsers(doc.taggedUsers || []);
  };

  const [tagSaving, setTagSaving] = useState(false);
  const [tagSuccess, setTagSuccess] = useState('');

  const handleAddTag = async (userId: string) => {
    if (!tagModalDocId) return;
    try {
      const res = await api.post(`/documents/${tagModalDocId}/tags`, { userIds: [userId] }, { params: { workspace } });
      const newTags = res.data.data || [];
      setTagModalUsers(newTags);
      setDocuments((prev) =>
        prev.map((d) => (d.id === tagModalDocId ? { ...d, taggedUsers: newTags } : d))
      );
      const taggedUser = users.find((u) => u.id === userId);
      setTagSuccess(`${taggedUser?.name || '사용자'}님을 태그하고 알림을 보냈습니다.`);
      setTimeout(() => setTagSuccess(''), 3000);
    } catch (err) {
      alert(formatApiError(err, '태그 추가에 실패했습니다.'));
    }
  };

  const handleRemoveTag = async (userId: string) => {
    if (!tagModalDocId) return;
    try {
      const res = await api.delete(`/documents/${tagModalDocId}/tags`, { data: { userIds: [userId] }, params: { workspace } });
      const newTags = res.data.data || [];
      setTagModalUsers(newTags);
      setDocuments((prev) =>
        prev.map((d) => (d.id === tagModalDocId ? { ...d, taggedUsers: newTags } : d))
      );
    } catch (err) {
      alert(formatApiError(err, '태그 제거에 실패했습니다.'));
    }
  };

  // ─── Drag & Drop file upload ────────────────────────────

  const handleQuickUpload = async (files: FileList) => {
    if (files.length === 0) return;
    setIsUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const uploadData = new FormData();
        uploadData.append('file', file);
        const uploadRes = await api.post('/files/upload', uploadData);
        const fileId = uploadRes.data.data?.id || uploadRes.data.id;
        if (!fileId) throw new Error('파일 업로드 응답에 ID가 없습니다');

        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        let category = 'other';
        if (['pdf', 'doc', 'docx', 'hwp', 'hwpx', 'rtf', 'txt'].includes(ext)) category = 'whitepaper';
        if (['xls', 'xlsx', 'csv'].includes(ext)) category = 'pricelist';
        if (['ppt', 'pptx'].includes(ext)) category = 'plan';

        await api.post('/documents', { title: file.name, category, fileId, workspace });
      }
      await fetchDocuments();
    } catch (err: any) {
      alert(formatApiError(err, '파일 업로드에 실패했습니다.'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); dragCounterRef.current++; if (e.dataTransfer.items?.length) setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); dragCounterRef.current--; if (dragCounterRef.current === 0) setIsDragging(false); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false); dragCounterRef.current = 0;
    if (e.dataTransfer.files?.length) handleQuickUpload(e.dataTransfer.files);
  };

  // ─── Shared Card Component ──────────────────────────────

  const renderDocCard = (doc: Document, compact = false) => {
    const catConfig = getCategoryConfig(doc.category);
    const CatIcon = catConfig.icon;
    const statusCfg = getStatusConfig(doc.status);

    return (
      <div
        key={doc.id}
        onClick={() => handleCardClick(doc)}
        draggable={viewMode === 'kanban'}
        onDragStart={viewMode === 'kanban' ? (e) => handleKanbanDragStart(e, doc.id) : undefined}
        className={`bg-white rounded-2xl border border-[#E5E5EA] shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_14px_rgba(0,0,0,0.06)] transition-all overflow-hidden group cursor-pointer ${compact ? '' : ''}`}
      >
        <div className={compact ? 'px-4 pt-3 pb-2' : 'px-5 pt-5 pb-3'}>
          {/* Header row */}
          <div className="flex items-start justify-between mb-2">
            <div className={`p-1.5 rounded-xl ${catConfig.color}`}>
              <CatIcon size={compact ? 16 : 22} />
            </div>
            <div className="flex items-center gap-1">
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusCfg.bgColor} ${statusCfg.color}`}>
                {statusCfg.label}
              </span>
            </div>
          </div>

          <h3 className={`font-semibold text-[#1D1D1F] mb-1 line-clamp-2 ${compact ? 'text-sm' : 'text-base'}`}>
            {doc.title}
          </h3>

          {!compact && doc.description && (
            <p className="text-sm text-[#6E6E73] line-clamp-2 mb-2">{doc.description}</p>
          )}

          {doc.fileId && (
            <div className="flex items-center gap-1.5 text-xs text-[#86868B] mb-1">
              <Paperclip size={11} />
              <span className="truncate">{doc.fileName || '첨부 파일'}</span>
            </div>
          )}

          {/* Tagged users */}
          {doc.taggedUsers && doc.taggedUsers.length > 0 && (
            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
              {doc.taggedUsers.slice(0, 3).map((t) => (
                <span key={t.userId} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#F4E7E0] text-[#9C4A2D] rounded text-xs">
                  <User size={10} />
                  {t.userName}
                </span>
              ))}
              {doc.taggedUsers.length > 3 && (
                <span className="text-xs text-[#86868B]">+{doc.taggedUsers.length - 3}</span>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-[#F2F2F2] flex items-center justify-between">
          <span className="text-xs text-[#86868B]">
            {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('ko-KR') : '-'}
          </span>
          <div className="flex items-center gap-0.5">
            <button onClick={(e) => handleOpenTagModal(e, doc)} className="p-1 text-[#86868B] hover:text-[#C56A3E] hover:bg-[#F4E7E0] rounded transition-colors opacity-0 group-hover:opacity-100" title="태그" aria-label="태그">
              <UserPlus size={13} />
            </button>
            {doc.fileId && (
              <button onClick={(e) => { e.stopPropagation(); handleDownloadFile(doc.fileId!); }} className="p-1 text-[#86868B] hover:text-[#C56A3E] hover:bg-[#F4E7E0] rounded transition-colors opacity-0 group-hover:opacity-100" title="다운로드" aria-label="다운로드">
                <Download size={13} />
              </button>
            )}
            <button onClick={(e) => handleOpenEdit(e, doc)} className="p-1 text-[#86868B] hover:text-[#C56A3E] hover:bg-[#F4E7E0] rounded transition-colors opacity-0 group-hover:opacity-100" title="수정" aria-label="수정">
              <Edit size={13} />
            </button>
            {deleteConfirmId === doc.id ? (
              <div className="flex items-center gap-0.5">
                <button onClick={(e) => handleDelete(e, doc.id)} className="p-1 text-white bg-[#E0352B] hover:bg-[#C42B22] rounded" aria-label="삭제 확인"><Check size={11} /></button>
                <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(null); }} className="p-1 text-[#86868B] hover:text-[#3A3A3C] rounded" aria-label="삭제 취소"><X size={11} /></button>
              </div>
            ) : (
              <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(doc.id); }} className="p-1 text-[#86868B] hover:text-[#E0352B] hover:bg-[#FBEAE3] rounded transition-colors opacity-0 group-hover:opacity-100" title="삭제" aria-label="삭제">
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════
  //  RENDER — modals + detail or list view
  // ═══════════════════════════════════════════════════════════

  // Helper: render detail view content
  const renderDetailView = () => {
    if (!detailDocument) return null;
    const catConfig = getCategoryConfig(detailDocument.category);
    const CatIcon = catConfig.icon;
    const statusCfg = getStatusConfig(detailDocument.status);

    return (
      <div className="h-full flex flex-col bg-[#F5F5F7]">
        <div className="bg-white border-b border-[#E5E5EA] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="p-6">
            <button onClick={() => { window.history.back(); }} className="flex items-center gap-2 text-[#6E6E73] hover:text-[#1D1D1F] mb-4">
              <ArrowLeft size={18} /><span className="text-sm font-medium">목록으로 돌아가기</span>
            </button>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-2xl ${catConfig.color}`}><CatIcon size={28} /></div>
                <div>
                  <h1 className="text-2xl font-bold text-[#1D1D1F] mb-1">{detailDocument.title}</h1>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${catConfig.color}`}>{catConfig.label}</span>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusCfg.bgColor} ${statusCfg.color}`}>{statusCfg.label}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Status dropdown */}
                <select
                  value={detailDocument.status}
                  onChange={(e) => {
                    handleStatusChange(detailDocument.id, e.target.value);
                    setDetailDocument({ ...detailDocument, status: e.target.value });
                  }}
                  className="text-sm bg-white border border-[#D2D2D7] rounded-[10px] px-3 py-1.5 focus:outline-none focus:border-[#C56A3E] focus:ring-2 focus:ring-[#C56A3E]/15"
                >
                  {STATUS_COLUMNS.map((s) => (
                    <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                  ))}
                </select>
                <button onClick={(e) => handleOpenEdit(e, detailDocument)} className="flex items-center gap-2 px-3 py-2 text-sm text-[#3A3A3C] border border-[#E5E5EA] hover:bg-[#F2F2F7] rounded-[10px]">
                  <Edit size={16} /><span>수정</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Description */}
            <div className="bg-white rounded-2xl border border-[#E5E5EA] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-6">
              <h2 className="text-sm font-semibold text-[#86868B] uppercase tracking-wider mb-3">설명</h2>
              <p className="text-[#3A3A3C] whitespace-pre-wrap">{detailDocument.description || '설명이 없습니다.'}</p>
            </div>

            {/* Tagged Users */}
            <div className="bg-white rounded-2xl border border-[#E5E5EA] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-[#86868B] uppercase tracking-wider">태그된 사용자</h2>
                <button
                  onClick={(e) => handleOpenTagModal(e, detailDocument)}
                  className="text-sm text-[#C56A3E] hover:text-[#B45C33] flex items-center gap-1"
                >
                  <UserPlus size={14} />관리
                </button>
              </div>
              {detailDocument.taggedUsers && detailDocument.taggedUsers.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {detailDocument.taggedUsers.map((t) => (
                    <span key={t.userId} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F4E7E0] text-[#9C4A2D] rounded-[10px] text-sm">
                      <User size={14} />{t.userName}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[#86868B] text-sm">태그된 사용자가 없습니다.</p>
              )}
            </div>

            {/* File */}
            <div className="bg-white rounded-2xl border border-[#E5E5EA] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-6">
              <h2 className="text-sm font-semibold text-[#86868B] uppercase tracking-wider mb-3">첨부 파일</h2>
              {detailDocument.fileId ? (
                <div className="flex items-center justify-between p-4 bg-[#F5F5F7] rounded-[10px] border border-[#E5E5EA]">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#F4E7E0] rounded-[10px]"><Paperclip size={20} className="text-[#C56A3E]" /></div>
                    <div>
                      <p className="text-sm font-medium text-[#1D1D1F]">{detailDocument.fileName || '첨부 파일'}</p>
                      <div className="flex items-center gap-3 text-xs text-[#6E6E73] mt-0.5">
                        {detailDocument.fileMimeType && <span>{detailDocument.fileMimeType}</span>}
                        {detailDocument.fileSize && <span>{formatFileSize(detailDocument.fileSize)}</span>}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => handleDownloadFile(detailDocument.fileId!)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[#C56A3E] text-white hover:bg-[#B45C33] rounded-[10px]">
                    <Download size={16} /><span>다운로드</span>
                  </button>
                </div>
              ) : (
                <p className="text-[#86868B] text-sm">첨부된 파일이 없습니다.</p>
              )}
              {detailDocument.fileId && detailDocument.fileMimeType?.startsWith('image/') && (
                <div className="mt-4 border border-[#E5E5EA] rounded-[10px] overflow-hidden">
                  <img src={getFileDownloadUrl(detailDocument.fileId)} alt={detailDocument.fileName || detailDocument.title} className="max-w-full max-h-96 object-contain mx-auto" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </div>
              )}
            </div>

            {/* Metadata */}
            <div className="bg-white rounded-2xl border border-[#E5E5EA] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-6">
              <h2 className="text-sm font-semibold text-[#86868B] uppercase tracking-wider mb-3">정보</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm"><Calendar size={16} className="text-[#86868B]" /><span className="text-[#6E6E73]">생성일:</span><span className="text-[#1D1D1F]">{detailDocument.createdAt ? new Date(detailDocument.createdAt).toLocaleString('ko-KR') : '-'}</span></div>
                <div className="flex items-center gap-3 text-sm"><Calendar size={16} className="text-[#86868B]" /><span className="text-[#6E6E73]">수정일:</span><span className="text-[#1D1D1F]">{detailDocument.updatedAt ? new Date(detailDocument.updatedAt).toLocaleString('ko-KR') : '-'}</span></div>
                <div className="flex items-center gap-3 text-sm"><Tag size={16} className="text-[#86868B]" /><span className="text-[#6E6E73]">카테고리:</span><span className={`px-2 py-0.5 text-xs font-medium rounded-full ${catConfig.color}`}>{catConfig.label}</span></div>
                {detailDocument.pageId && <div className="flex items-center gap-3 text-sm"><Link size={16} className="text-[#86868B]" /><span className="text-[#6E6E73]">연결 페이지:</span><span className="text-[#C56A3E]">{detailDocument.pageId}</span></div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
    {detailDocument ? renderDetailView() : (
    <div
      className="h-full flex flex-col bg-[#F5F5F7] relative"
      onDragEnter={viewMode === 'grid' ? handleDragEnter : undefined}
      onDragLeave={viewMode === 'grid' ? handleDragLeave : undefined}
      onDragOver={viewMode === 'grid' ? handleDragOver : undefined}
      onDrop={viewMode === 'grid' ? handleDrop : undefined}
    >
      {/* Drag overlay (grid mode only) */}
      {isDragging && viewMode === 'grid' && (
        <div className="absolute inset-0 z-50 bg-[#F4E7E0]/90 border-4 border-dashed border-[#C56A3E] rounded-2xl flex flex-col items-center justify-center pointer-events-none">
          <Upload size={64} className="text-[#C56A3E] mb-4" />
          <p className="text-2xl font-bold text-[#9C4A2D]">파일을 여기에 놓으세요</p>
          <p className="text-sm text-[#C56A3E] mt-2">파일이 자동으로 문서 라이브러리에 추가됩니다</p>
        </div>
      )}

      {isUploading && (
        <div className="absolute inset-0 z-50 bg-white/80 flex flex-col items-center justify-center">
          <div className="animate-spin w-10 h-10 border-4 border-[#C56A3E] border-t-transparent rounded-full mb-4"></div>
          <p className="text-lg font-semibold text-[#9C4A2D]">파일 업로드 중...</p>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-[#E5E5EA] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#F4E7E0] rounded-[10px]"><FileText className="w-6 h-6 text-[#C56A3E]" /></div>
              <h1 className="text-3xl font-bold text-[#1D1D1F]">문서 라이브러리</h1>
            </div>
            <div className="flex items-center gap-2">
              {/* View mode toggle */}
              <div className="flex bg-[#F2F2F7] rounded-[10px] p-0.5">
                <button onClick={() => setViewMode('grid')} className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] text-[#C56A3E]' : 'text-[#6E6E73] hover:text-[#1D1D1F]'}`} title="그리드 보기" aria-label="그리드 보기">
                  <LayoutGrid size={18} />
                </button>
                <button onClick={() => setViewMode('kanban')} className={`p-2 rounded-md transition-colors ${viewMode === 'kanban' ? 'bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] text-[#C56A3E]' : 'text-[#6E6E73] hover:text-[#1D1D1F]'}`} title="칸반 보기" aria-label="칸반 보기">
                  <Columns size={18} />
                </button>
              </div>
              <button onClick={handleOpenAdd} className="flex items-center gap-2 bg-[#C56A3E] text-white px-4 py-2 rounded-[10px] hover:bg-[#B45C33] transition-colors font-medium">
                <Plus size={20} /><span>문서 추가</span>
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#86868B]" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchDocuments()} placeholder="문서 검색..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#D2D2D7] rounded-[10px] focus:outline-none focus:border-[#C56A3E] focus:ring-2 focus:ring-[#C56A3E]/15" />
          </div>

          {/* Category filters (grid mode only) */}
          {viewMode === 'grid' && (
            <div className="flex gap-2 flex-wrap">
              {CATEGORY_FILTERS.map((f) => (
                <button key={f.key} onClick={() => setCategoryFilter(f.key)} className={`px-4 py-2 rounded-[10px] font-medium transition-colors text-sm ${categoryFilter === f.key ? 'bg-[#C56A3E] text-white' : 'bg-white border border-[#E5E5EA] text-[#3A3A3C] hover:bg-[#F2F2F7]'}`}>
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64"><div className="text-[#6E6E73]">로딩 중...</div></div>
        ) : error ? (
          <div className="flex items-center justify-center h-64"><div className="text-[#E0352B]">{error}</div></div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-[#86868B]">
            <FileText size={48} className="mb-4" />
            <p className="text-lg">등록된 문서가 없습니다.</p>
            <p className="text-sm mt-1">파일을 드래그하여 빠르게 추가할 수도 있습니다.</p>
            <button onClick={handleOpenAdd} className="mt-4 text-[#C56A3E] hover:text-[#B45C33] font-medium">+ 새 문서 추가</button>
          </div>
        ) : viewMode === 'kanban' ? (
          /* ── Kanban View ── */
          <div className="flex gap-4 h-full overflow-x-auto pb-4">
            {STATUS_COLUMNS.map((statusKey) => {
              const cfg = STATUS_CONFIG[statusKey];
              const columnDocs = documents.filter((d) => (d.status || 'draft') === statusKey);

              return (
                <div
                  key={statusKey}
                  className="flex-shrink-0 w-72 flex flex-col bg-[#F2F2F7] rounded-2xl"
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('ring-2', 'ring-[#C56A3E]/20'); }}
                  onDragLeave={(e) => { e.currentTarget.classList.remove('ring-2', 'ring-[#C56A3E]/20'); }}
                  onDrop={(e) => { e.currentTarget.classList.remove('ring-2', 'ring-[#C56A3E]/20'); handleKanbanDrop(e, statusKey); }}
                >
                  {/* Column header */}
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${cfg.bgColor} border ${statusKey === 'draft' ? 'border-[#D2D2D7]' : statusKey === 'review' ? 'border-[#F5D9A8]' : statusKey === 'complete' ? 'border-[#B6E3C4]' : 'border-[#E2C3B5]'}`}></span>
                      <span className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</span>
                    </div>
                    <span className="text-xs text-[#86868B] bg-white px-2 py-0.5 rounded-full">{columnDocs.length}</span>
                  </div>

                  {/* Column cards */}
                  <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
                    {columnDocs.map((doc) => renderDocCard(doc, true))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── Grid View ── */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {documents.map((doc) => renderDocCard(doc))}
          </div>
        )}
      </div>

    </div>
    )}

      {/* ── Add/Edit Modal (always rendered) ── */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedDocument ? '문서 수정' : '문서 추가'} size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#3A3A3C] mb-2">제목 *</label>
            <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="문서 제목" className="w-full px-3 py-2 bg-white border border-[#D2D2D7] rounded-[10px] focus:outline-none focus:border-[#C56A3E] focus:ring-2 focus:ring-[#C56A3E]/15" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#3A3A3C] mb-2">카테고리</label>
              <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full px-3 py-2 bg-white border border-[#D2D2D7] rounded-[10px] focus:outline-none focus:border-[#C56A3E] focus:ring-2 focus:ring-[#C56A3E]/15">
                <option value="plan">기획안</option>
                <option value="pricelist">가격표</option>
                <option value="form">양식</option>
                <option value="whitepaper">백서</option>
                <option value="other">기타</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#3A3A3C] mb-2">상태</label>
              <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full px-3 py-2 bg-white border border-[#D2D2D7] rounded-[10px] focus:outline-none focus:border-[#C56A3E] focus:ring-2 focus:ring-[#C56A3E]/15">
                {STATUS_COLUMNS.map((s) => (
                  <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#3A3A3C] mb-2">설명</label>
            <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="문서 설명 (선택사항)" rows={3} className="w-full px-3 py-2 bg-white border border-[#D2D2D7] rounded-[10px] focus:outline-none focus:border-[#C56A3E] focus:ring-2 focus:ring-[#C56A3E]/15 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#3A3A3C] mb-2">파일 업로드 (선택)</label>
            <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-[#D2D2D7] rounded-[10px] p-4 text-center cursor-pointer hover:border-[#C56A3E] hover:bg-[#F4E7E0] transition-colors">
              <Upload size={24} className="mx-auto mb-2 text-[#86868B]" />
              {formData.file ? (
                <div><p className="text-sm text-[#C56A3E] font-medium">{formData.file.name}</p><p className="text-xs text-[#86868B] mt-1">{formatFileSize(formData.file.size)}</p></div>
              ) : selectedDocument?.fileId ? (
                <div><p className="text-sm text-[#6E6E73]">현재 파일: {selectedDocument.fileName || '첨부 파일'}</p><p className="text-xs text-[#86868B] mt-1">클릭하여 새 파일로 변경</p></div>
              ) : (
                <p className="text-sm text-[#86868B]">클릭하여 파일 선택 (모든 파일 형식 허용)</p>
              )}
            </div>
            <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" />
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-[#3A3A3C] border border-[#E5E5EA] hover:bg-[#F2F2F7] rounded-[10px] font-medium" disabled={isSaving}>취소</button>
            <button onClick={handleSave} disabled={!formData.title.trim() || isSaving} className="px-4 py-2 bg-[#C56A3E] text-white rounded-[10px] hover:bg-[#B45C33] disabled:bg-[#D2D2D7] transition-colors font-medium min-w-[80px] flex items-center justify-center">
              {isSaving ? <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div> : selectedDocument ? '수정' : '추가'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Tag Modal (always rendered) ── */}
      <Modal isOpen={!!tagModalDocId} onClose={() => { setTagModalDocId(null); setTagSuccess(''); }} title="사용자 태그 관리" size="sm">
        <div className="space-y-4">
          {/* Success feedback */}
          {tagSuccess && (
            <div className="flex items-center gap-2 p-2.5 bg-[#E7F5EC] border border-[#B6E3C4] rounded-[10px] text-sm text-[#2C8A4A]">
              <Check size={16} className="text-[#2C8A4A] shrink-0" />
              <span>{tagSuccess}</span>
            </div>
          )}

          {/* Currently tagged */}
          <div>
            <h3 className="text-sm font-medium text-[#3A3A3C] mb-2">태그된 사용자 ({tagModalUsers.length}명)</h3>
            {tagModalUsers.length === 0 ? (
              <p className="text-sm text-[#86868B]">아직 태그된 사용자가 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {tagModalUsers.map((t) => (
                  <div key={t.userId} className="flex items-center justify-between p-2 bg-[#F4E7E0] rounded-[10px]">
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-[#C56A3E]" />
                      <span className="text-sm font-medium text-[#9C4A2D]">{t.userName}</span>
                    </div>
                    <button onClick={() => handleRemoveTag(t.userId)} className="p-1 text-[#C56A3E] hover:text-[#E0352B] transition-colors" aria-label="태그 제거">
                      <XCircle size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Available users */}
          <div>
            <h3 className="text-sm font-medium text-[#3A3A3C] mb-2">사용자 추가</h3>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {users
                .filter((u) => !tagModalUsers.some((t) => t.userId === u.id))
                .map((u) => (
                  <button
                    key={u.id}
                    onClick={() => handleAddTag(u.id)}
                    className="w-full flex items-center gap-2 p-2 text-left text-sm text-[#3A3A3C] hover:bg-[#F2F2F7] rounded-[10px] transition-colors"
                  >
                    <UserPlus size={14} className="text-[#86868B]" />
                    <span>{u.name}</span>
                    {u.title && <span className="text-xs text-[#86868B]">({u.title})</span>}
                  </button>
                ))}
              {users.filter((u) => !tagModalUsers.some((t) => t.userId === u.id)).length === 0 && (
                <p className="text-sm text-[#86868B]">추가할 수 있는 사용자가 없습니다.</p>
              )}
            </div>
          </div>

          {/* Info + Close button */}
          <div className="pt-2 border-t border-[#F2F2F2]">
            <p className="text-xs text-[#86868B] mb-3">태그된 사용자에게 인앱 알림과 카카오톡 알림이 자동 전송됩니다.</p>
            <button
              onClick={() => { setTagModalDocId(null); setTagSuccess(''); }}
              className="w-full px-4 py-2.5 bg-[#C56A3E] text-white rounded-[10px] hover:bg-[#B45C33] transition-colors font-medium"
            >
              확인
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
