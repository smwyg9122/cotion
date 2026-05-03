import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Palette,
  Plus,
  Edit,
  Trash2,
  Search,
  Upload,
  Check,
  X,
  Image,
  Layers,
  Layout,
  Figma,
  Download,
  Eye,
  ArrowLeft,
  Calendar,
  Tag,
  ExternalLink,
  Paperclip,
} from 'lucide-react';
import { api } from '../../services/api';
import { Modal } from '../common/Modal';

/* ───────────────── Types ────────────────── */

interface DesignLibraryProps {
  workspace: string;
}

interface DesignAsset {
  id: string;
  title: string;
  category: string;
  description?: string | null;
  fileId?: string | null;
  figmaUrl?: string | null;
  workspace: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  fileName?: string;
  fileMimeType?: string;
  fileSize?: number;
}

interface DesignFormData {
  title: string;
  category: string;
  description: string;
  figmaUrl: string;
  file: File | null;
}

const INITIAL_FORM: DesignFormData = {
  title: '',
  category: 'ui',
  description: '',
  figmaUrl: '',
  file: null,
};

/* ───────────────── Constants ────────────────── */

type CategoryKey = 'ui' | 'logo' | 'banner' | 'icon' | 'photo' | 'other';
type CategoryFilter = 'all' | CategoryKey;

const CATEGORY_CONFIG: Record<CategoryKey, { label: string; icon: React.ElementType; color: string }> = {
  ui: { label: 'UI 디자인', icon: Layout, color: 'bg-blue-100 text-blue-700' },
  logo: { label: '로고', icon: Layers, color: 'bg-purple-100 text-purple-700' },
  banner: { label: '배너', icon: Image, color: 'bg-emerald-100 text-emerald-700' },
  icon: { label: '아이콘', icon: Palette, color: 'bg-amber-100 text-amber-700' },
  photo: { label: '사진', icon: Image, color: 'bg-pink-100 text-pink-700' },
  other: { label: '기타', icon: Layers, color: 'bg-gray-100 text-gray-700' },
};

function getCategoryConfig(category: string) {
  return CATEGORY_CONFIG[category as CategoryKey] || CATEGORY_CONFIG.other;
}

const CATEGORY_FILTERS: { key: CategoryFilter; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'ui', label: 'UI 디자인' },
  { key: 'logo', label: '로고' },
  { key: 'banner', label: '배너' },
  { key: 'icon', label: '아이콘' },
  { key: 'photo', label: '사진' },
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

/* ───────────────── Component ────────────────── */

export function DesignLibrary({ workspace }: DesignLibraryProps) {
  const [assets, setAssets] = useState<DesignAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Add/Edit modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<DesignAsset | null>(null);
  const [formData, setFormData] = useState<DesignFormData>(INITIAL_FORM);
  const [isSaving, setIsSaving] = useState(false);

  // Detail view
  const [detailAsset, setDetailAsset] = useState<DesignAsset | null>(null);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  // ─── Data Fetching ──────────────────────────────────────

  const fetchAssets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { workspace };
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const response = await api.get('/documents', { params });
      setAssets(response.data.data || []);
    } catch (err: any) {
      console.error('Failed to fetch design assets:', err);
      setError('디자인 자산 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [workspace, categoryFilter, searchQuery]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // Handle browser back button
  useEffect(() => {
    if (!detailAsset) return;
    window.history.pushState({ designDetail: true }, '');
    const handlePopState = () => setDetailAsset(null);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [detailAsset?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Handlers ───────────────────────────────────────────

  const handleOpenAdd = () => {
    setSelectedAsset(null);
    setFormData(INITIAL_FORM);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (e: React.MouseEvent, asset: DesignAsset) => {
    e.stopPropagation();
    setSelectedAsset(asset);
    setFormData({
      title: asset.title,
      category: asset.category,
      description: asset.description || '',
      figmaUrl: asset.figmaUrl || '',
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
      };
      if (formData.description?.trim()) payload.description = formData.description.trim();
      if (fileId) payload.fileId = fileId;
      if (!selectedAsset) payload.workspace = workspace;

      if (selectedAsset) {
        await api.put(`/documents/${selectedAsset.id}`, payload);
      } else {
        await api.post('/documents', payload);
      }

      await fetchAssets();
      setIsModalOpen(false);

      if (selectedAsset && detailAsset?.id === selectedAsset.id) {
        try {
          const detailRes = await api.get(`/documents/${selectedAsset.id}`);
          if (detailRes.data.data) setDetailAsset(detailRes.data.data);
        } catch { setDetailAsset(null); }
      }
    } catch (err: any) {
      console.error('Failed to save design asset:', err);
      const serverMsg = err?.response?.data?.error?.message || '';
      alert(serverMsg || '디자인 자산 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await api.delete(`/documents/${id}`);
      setAssets((prev) => prev.filter((d) => d.id !== id));
      setDeleteConfirmId(null);
      if (detailAsset?.id === id) setDetailAsset(null);
    } catch {
      alert('디자인 자산 삭제에 실패했습니다.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setFormData((prev) => ({ ...prev, file }));
  };

  const handleDownloadFile = (fileId: string) => window.open(getFileDownloadUrl(fileId), '_blank');

  // ─── Drag & Drop ──────────────────────────────────────

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
        if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) category = 'photo';
        if (['fig', 'sketch'].includes(ext)) category = 'ui';
        if (['ai', 'eps', 'pdf'].includes(ext)) category = 'logo';

        await api.post('/documents', { title: file.name, category, fileId, workspace });
      }
      await fetchAssets();
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || '파일 업로드에 실패했습니다.');
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

  // ─── Render Card ──────────────────────────────────────

  const renderAssetCard = (asset: DesignAsset) => {
    const catConfig = getCategoryConfig(asset.category);
    const CatIcon = catConfig.icon;
    const isImage = asset.fileMimeType?.startsWith('image/');

    return (
      <div
        key={asset.id}
        onClick={() => setDetailAsset(asset)}
        className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-violet-200 transition-all overflow-hidden group cursor-pointer"
      >
        {/* Image preview */}
        {isImage && asset.fileId ? (
          <div className="h-40 bg-gray-100 flex items-center justify-center overflow-hidden">
            <img
              src={getFileDownloadUrl(asset.fileId)}
              alt={asset.title}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        ) : (
          <div className="h-28 bg-gradient-to-br from-violet-50 to-purple-50 flex items-center justify-center">
            <CatIcon size={40} className="text-violet-300" />
          </div>
        )}

        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${catConfig.color}`}>
              {catConfig.label}
            </span>
          </div>
          <h3 className="font-semibold text-gray-900 text-sm line-clamp-1 mb-1">{asset.title}</h3>
          {asset.description && (
            <p className="text-xs text-gray-500 line-clamp-1">{asset.description}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {asset.createdAt ? new Date(asset.createdAt).toLocaleDateString('ko-KR') : '-'}
          </span>
          <div className="flex items-center gap-0.5">
            {asset.fileId && (
              <button onClick={(e) => { e.stopPropagation(); handleDownloadFile(asset.fileId!); }} className="p-1 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded transition-colors opacity-0 group-hover:opacity-100" title="다운로드">
                <Download size={13} />
              </button>
            )}
            <button onClick={(e) => handleOpenEdit(e, asset)} className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors opacity-0 group-hover:opacity-100" title="수정">
              <Edit size={13} />
            </button>
            {deleteConfirmId === asset.id ? (
              <div className="flex items-center gap-0.5">
                <button onClick={(e) => handleDelete(e, asset.id)} className="p-1 text-white bg-red-500 hover:bg-red-600 rounded"><Check size={11} /></button>
                <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(null); }} className="p-1 text-gray-400 hover:text-gray-600 rounded"><X size={11} /></button>
              </div>
            ) : (
              <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(asset.id); }} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100" title="삭제">
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ─── Detail View ──────────────────────────────────────

  const renderDetailView = () => {
    if (!detailAsset) return null;
    const catConfig = getCategoryConfig(detailAsset.category);
    const CatIcon = catConfig.icon;
    const isImage = detailAsset.fileMimeType?.startsWith('image/');

    return (
      <div className="h-full flex flex-col bg-gray-50">
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="p-6">
            <button onClick={() => window.history.back()} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4">
              <ArrowLeft size={18} /><span className="text-sm font-medium">목록으로 돌아가기</span>
            </button>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${catConfig.color}`}><CatIcon size={28} /></div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">{detailAsset.title}</h1>
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${catConfig.color}`}>{catConfig.label}</span>
                </div>
              </div>
              <button onClick={(e) => handleOpenEdit(e, detailAsset)} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                <Edit size={16} /><span>수정</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Image preview */}
            {isImage && detailAsset.fileId && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <img
                  src={getFileDownloadUrl(detailAsset.fileId)}
                  alt={detailAsset.title}
                  className="max-w-full max-h-[500px] object-contain mx-auto rounded-lg"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}

            {/* Description */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">설명</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{detailAsset.description || '설명이 없습니다.'}</p>
            </div>

            {/* File */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">첨부 파일</h2>
              {detailAsset.fileId ? (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-100 rounded-lg"><Paperclip size={20} className="text-violet-600" /></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{detailAsset.fileName || '첨부 파일'}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                        {detailAsset.fileMimeType && <span>{detailAsset.fileMimeType}</span>}
                        {detailAsset.fileSize && <span>{formatFileSize(detailAsset.fileSize)}</span>}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => handleDownloadFile(detailAsset.fileId!)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-violet-600 text-white hover:bg-violet-700 rounded-lg">
                    <Download size={16} /><span>다운로드</span>
                  </button>
                </div>
              ) : (
                <p className="text-gray-400 text-sm">첨부된 파일이 없습니다.</p>
              )}
            </div>

            {/* Metadata */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">정보</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm"><Calendar size={16} className="text-gray-400" /><span className="text-gray-500">생성일:</span><span className="text-gray-900">{detailAsset.createdAt ? new Date(detailAsset.createdAt).toLocaleString('ko-KR') : '-'}</span></div>
                <div className="flex items-center gap-3 text-sm"><Calendar size={16} className="text-gray-400" /><span className="text-gray-500">수정일:</span><span className="text-gray-900">{detailAsset.updatedAt ? new Date(detailAsset.updatedAt).toLocaleString('ko-KR') : '-'}</span></div>
                <div className="flex items-center gap-3 text-sm"><Tag size={16} className="text-gray-400" /><span className="text-gray-500">카테고리:</span><span className={`px-2 py-0.5 text-xs font-medium rounded-full ${catConfig.color}`}>{catConfig.label}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════

  return (
    <>
    {detailAsset ? renderDetailView() : (
    <div
      className="h-full flex flex-col bg-gray-50 relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-violet-50/90 border-4 border-dashed border-violet-400 rounded-xl flex flex-col items-center justify-center pointer-events-none">
          <Upload size={64} className="text-violet-500 mb-4" />
          <p className="text-2xl font-bold text-violet-700">디자인 파일을 여기에 놓으세요</p>
          <p className="text-sm text-violet-500 mt-2">이미지, AI, Sketch 등 모든 파일 형식 지원</p>
        </div>
      )}

      {isUploading && (
        <div className="absolute inset-0 z-50 bg-white/80 flex flex-col items-center justify-center">
          <div className="animate-spin w-10 h-10 border-4 border-violet-600 border-t-transparent rounded-full mb-4"></div>
          <p className="text-lg font-semibold text-violet-700">파일 업로드 중...</p>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-100 rounded-lg"><Palette className="w-6 h-6 text-violet-600" /></div>
              <h1 className="text-3xl font-bold text-gray-900">디자인 라이브러리</h1>
            </div>
            <button onClick={handleOpenAdd} className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 transition-colors font-medium">
              <Plus size={20} /><span>디자인 추가</span>
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchAssets()} placeholder="디자인 검색..." className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 bg-gray-50" />
          </div>

          {/* Category filters */}
          <div className="flex gap-2 flex-wrap">
            {CATEGORY_FILTERS.map((f) => (
              <button key={f.key} onClick={() => setCategoryFilter(f.key)} className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${categoryFilter === f.key ? 'bg-violet-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64"><div className="text-gray-500">로딩 중...</div></div>
        ) : error ? (
          <div className="flex items-center justify-center h-64"><div className="text-red-500">{error}</div></div>
        ) : assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <Palette size={48} className="mb-4" />
            <p className="text-lg">등록된 디자인 자산이 없습니다.</p>
            <p className="text-sm mt-1">파일을 드래그하여 빠르게 추가할 수도 있습니다.</p>
            <button onClick={handleOpenAdd} className="mt-4 text-violet-600 hover:text-violet-700 font-medium">+ 새 디자인 추가</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {assets.map((asset) => renderAssetCard(asset))}
          </div>
        )}
      </div>
    </div>
    )}

      {/* ── Add/Edit Modal ── */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedAsset ? '디자인 수정' : '디자인 추가'} size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">제목 *</label>
            <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="디자인 제목" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">카테고리</label>
            <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500">
              <option value="ui">UI 디자인</option>
              <option value="logo">로고</option>
              <option value="banner">배너</option>
              <option value="icon">아이콘</option>
              <option value="photo">사진</option>
              <option value="other">기타</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">설명</label>
            <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="디자인 설명 (선택사항)" rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">파일 업로드</label>
            <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-violet-400 hover:bg-violet-50 transition-colors">
              <Upload size={24} className="mx-auto mb-2 text-gray-400" />
              {formData.file ? (
                <div><p className="text-sm text-violet-600 font-medium">{formData.file.name}</p><p className="text-xs text-gray-400 mt-1">{formatFileSize(formData.file.size)}</p></div>
              ) : selectedAsset?.fileId ? (
                <div><p className="text-sm text-gray-500">현재 파일: {selectedAsset.fileName || '첨부 파일'}</p><p className="text-xs text-gray-400 mt-1">클릭하여 새 파일로 변경</p></div>
              ) : (
                <p className="text-sm text-gray-400">클릭하여 파일 선택 (이미지, AI, Sketch 등)</p>
              )}
            </div>
            <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" accept="image/*,.ai,.eps,.svg,.fig,.sketch,.psd,.xd" />
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium" disabled={isSaving}>취소</button>
            <button onClick={handleSave} disabled={!formData.title.trim() || isSaving} className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:bg-gray-300 transition-colors font-medium min-w-[80px] flex items-center justify-center">
              {isSaving ? <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div> : selectedAsset ? '수정' : '추가'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
