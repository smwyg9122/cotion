import React, { useState, useEffect, useCallback } from 'react';
import {
  Coffee,
  Plus,
  Edit,
  Trash2,
  Calendar,
  User,
  Check,
  X,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { api } from '../../services/api';
import { formatApiError } from '../../utils/apiError';
import { Modal } from '../common/Modal';

function toLocalDateStr(d: Date): string {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

interface CuppingLogPageProps {
  workspace: string;
}

interface CuppingLog {
  id: string;
  visitDate: string;
  roasteryName: string;
  contactPerson: string;
  offeredBeans?: string;
  reaction?: string;
  purchaseIntent: 'high' | 'medium' | 'low' | 'none';
  followupDate?: string;
  notes?: string;
  workspace: string;
  createdAt?: string;
  updatedAt?: string;
}

interface CuppingFormData {
  visitDate: string;
  roasteryName: string;
  contactPerson: string;
  offeredBeans: string;
  reaction: string;
  purchaseIntent: 'high' | 'medium' | 'low' | 'none';
  followupDate: string;
  notes: string;
}

const INITIAL_FORM: CuppingFormData = {
  visitDate: toLocalDateStr(new Date()),
  roasteryName: '',
  contactPerson: '',
  offeredBeans: '',
  reaction: '',
  purchaseIntent: 'medium',
  followupDate: '',
  notes: '',
};

type FilterType = 'all' | 'high_intent' | 'follow_up';

const INTENT_CONFIG: Record<CuppingLog['purchaseIntent'], { label: string; color: string }> = {
  high: { label: '높음', color: 'bg-[#E7F5EC] text-[#2C8A4A]' },
  medium: { label: '보통', color: 'bg-[#FBF2DF] text-[#9A6B16]' },
  low: { label: '낮음', color: 'bg-[#F2F2F7] text-[#6E6E73]' },
  none: { label: '없음', color: 'bg-[#FBEBEB] text-[#C0392B]' },
};

export function CuppingLogPage({ workspace }: CuppingLogPageProps) {
  const [logs, setLogs] = useState<CuppingLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<CuppingLog | null>(null);
  const [formData, setFormData] = useState<CuppingFormData>(INITIAL_FORM);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get('/cupping-logs', { params: { workspace } });
      setLogs(response.data.data || []);
    } catch (err: any) {
      console.error('Failed to fetch cupping logs:', err);
      setError('커핑 로그를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [workspace]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const isOverdue = (dateStr: string | undefined): boolean => {
    if (!dateStr) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const followUp = new Date(dateStr);
    followUp.setHours(0, 0, 0, 0);
    return followUp < today;
  };

  const isUpcoming = (dateStr: string | undefined): boolean => {
    if (!dateStr) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const followUp = new Date(dateStr);
    followUp.setHours(0, 0, 0, 0);
    const weekLater = new Date(today);
    weekLater.setDate(weekLater.getDate() + 7);
    return followUp >= today && followUp <= weekLater;
  };

  const filteredLogs = logs.filter((log) => {
    switch (filter) {
      case 'high_intent':
        return log.purchaseIntent === 'high';
      case 'follow_up':
        return log.followupDate && (isOverdue(log.followupDate) || isUpcoming(log.followupDate));
      default:
        return true;
    }
  });

  const handleOpenAdd = () => {
    setSelectedLog(null);
    setFormData(INITIAL_FORM);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (log: CuppingLog) => {
    setSelectedLog(log);
    setFormData({
      visitDate: log.visitDate ? log.visitDate.split('T')[0] : '',
      roasteryName: log.roasteryName,
      contactPerson: log.contactPerson,
      offeredBeans: log.offeredBeans || '',
      reaction: log.reaction || '',
      purchaseIntent: log.purchaseIntent,
      followupDate: log.followupDate ? log.followupDate.split('T')[0] : '',
      notes: log.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.roasteryName.trim()) return;
    try {
      const payload = {
        ...formData,
        followupDate: formData.followupDate || null,
      };
      if (selectedLog) {
        await api.put(`/cupping-logs/${selectedLog.id}`, payload, { params: { workspace } });
      } else {
        await api.post('/cupping-logs', { ...payload, workspace });
      }
      await fetchLogs();
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Failed to save cupping log:', err);
      alert(formatApiError(err, '커핑 로그 저장에 실패했습니다.'));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/cupping-logs/${id}`, { params: { workspace } });
      setLogs((prev) => prev.filter((l) => l.id !== id));
      setDeleteConfirmId(null);
    } catch (err: any) {
      console.error('Failed to delete cupping log:', err);
      alert(formatApiError(err, '커핑 로그 삭제에 실패했습니다.'));
    }
  };

  const FILTERS: { key: FilterType; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'high_intent', label: '구매의향 높음' },
    { key: 'follow_up', label: '팔로업 예정' },
  ];

  return (
    <div className="h-full flex flex-col bg-[#F5F5F7]">
      {/* Header */}
      <div className="bg-white border-b border-[#E5E5EA] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#F4E7E0] rounded-[10px]">
                <Coffee className="w-6 h-6 text-[#C56A3E]" />
              </div>
              <h1 className="text-3xl font-bold text-[#1D1D1F]">커핑 로그</h1>
            </div>
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 bg-[#C56A3E] text-white px-4 py-2 rounded-[10px] hover:bg-[#B45C33] transition-colors font-medium"
            >
              <Plus size={20} />
              <span>커핑 로그 추가</span>
            </button>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-4 py-2 rounded-[10px] font-medium transition-colors ${
                  filter === f.key
                    ? 'bg-[#C56A3E] text-white'
                    : 'bg-[#F2F2F7] text-[#3A3A3C] hover:bg-[#E8E8ED]'
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
            <div className="text-[#6E6E73]">로딩 중...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-[#C0392B]">{error}</div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-[#86868B]">
            <Coffee size={48} className="mb-4" />
            <p className="text-lg">등록된 커핑 로그가 없습니다.</p>
            <button
              onClick={handleOpenAdd}
              className="mt-4 text-[#C56A3E] hover:text-[#B45C33] font-medium"
            >
              + 새 커핑 로그 추가
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="bg-white rounded-2xl border border-[#E5E5EA] shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-shadow p-5"
              >
                {/* Card header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-[#1D1D1F]">{log.roasteryName}</h3>
                    <div className="flex items-center gap-2 mt-1 text-sm text-[#86868B]">
                      <Calendar size={14} />
                      <span>
                        {log.visitDate
                          ? new Date(log.visitDate).toLocaleDateString('ko-KR')
                          : '-'}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                      INTENT_CONFIG[log.purchaseIntent].color
                    }`}
                  >
                    {INTENT_CONFIG[log.purchaseIntent].label}
                  </span>
                </div>

                {/* Contact person */}
                <div className="flex items-center gap-2 mb-3 text-sm text-[#6E6E73]">
                  <User size={14} />
                  <span>{log.contactPerson || '-'}</span>
                </div>

                {/* Follow-up date */}
                {log.followupDate && (
                  <div
                    className={`flex items-center gap-2 mb-3 text-sm font-medium ${
                      isOverdue(log.followupDate)
                        ? 'text-[#C0392B]'
                        : isUpcoming(log.followupDate)
                        ? 'text-[#9A6B16]'
                        : 'text-[#86868B]'
                    }`}
                  >
                    {isOverdue(log.followupDate) ? (
                      <AlertCircle size={14} />
                    ) : (
                      <Clock size={14} />
                    )}
                    <span>
                      팔로업: {new Date(log.followupDate).toLocaleDateString('ko-KR')}
                      {isOverdue(log.followupDate) && ' (기한 초과)'}
                    </span>
                  </div>
                )}

                {/* Memo preview */}
                {log.notes && (
                  <p className="text-sm text-[#86868B] line-clamp-2 mb-4">{log.notes}</p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-[#F2F2F2]">
                  <button
                    onClick={() => handleOpenEdit(log)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#6E6E73] hover:text-[#C56A3E] hover:bg-[#F4E7E0] rounded-[10px] transition-colors"
                  >
                    <Edit size={14} />
                    <span>수정</span>
                  </button>
                  {deleteConfirmId === log.id ? (
                    <div className="flex items-center gap-1 ml-auto">
                      <span className="text-xs text-[#C0392B] mr-1">삭제?</span>
                      <button
                        onClick={() => handleDelete(log.id)}
                        className="p-1.5 text-white bg-[#C0392B] hover:bg-[#A93226] rounded-[8px] transition-colors"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="p-1.5 text-[#86868B] hover:text-[#6E6E73] rounded-[8px] transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(log.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#6E6E73] hover:text-[#C0392B] hover:bg-[#FBEBEB] rounded-[10px] transition-colors ml-auto"
                    >
                      <Trash2 size={14} />
                      <span>삭제</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedLog ? '커핑 로그 수정' : '커핑 로그 추가'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1D1D1F] mb-2">방문일 *</label>
              <input
                type="date"
                value={formData.visitDate}
                onChange={(e) => setFormData({ ...formData, visitDate: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#D2D2D7] rounded-[10px] focus:outline-none focus:border-[#C56A3E] focus:ring-2 focus:ring-[#C56A3E]/15"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1D1D1F] mb-2">로스터리명 *</label>
              <input
                type="text"
                value={formData.roasteryName}
                onChange={(e) => setFormData({ ...formData, roasteryName: e.target.value })}
                placeholder="로스터리명 또는 거래처명"
                className="w-full px-3 py-2 bg-white border border-[#D2D2D7] rounded-[10px] focus:outline-none focus:border-[#C56A3E] focus:ring-2 focus:ring-[#C56A3E]/15"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1D1D1F] mb-2">담당자</label>
            <input
              type="text"
              value={formData.contactPerson}
              onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
              placeholder="담당자 이름"
              className="w-full px-3 py-2 bg-white border border-[#D2D2D7] rounded-[10px] focus:outline-none focus:border-[#C56A3E] focus:ring-2 focus:ring-[#C56A3E]/15"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1D1D1F] mb-2">제시 생두</label>
            <input
              type="text"
              value={formData.offeredBeans}
              onChange={(e) => setFormData({ ...formData, offeredBeans: e.target.value })}
              placeholder="제시한 생두 품종"
              className="w-full px-3 py-2 bg-white border border-[#D2D2D7] rounded-[10px] focus:outline-none focus:border-[#C56A3E] focus:ring-2 focus:ring-[#C56A3E]/15"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1D1D1F] mb-2">반응</label>
            <textarea
              value={formData.reaction}
              onChange={(e) => setFormData({ ...formData, reaction: e.target.value })}
              placeholder="거래처 반응"
              rows={2}
              className="w-full px-3 py-2 bg-white border border-[#D2D2D7] rounded-[10px] focus:outline-none focus:border-[#C56A3E] focus:ring-2 focus:ring-[#C56A3E]/15 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1D1D1F] mb-2">구매의향</label>
              <select
                value={formData.purchaseIntent}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    purchaseIntent: e.target.value as CuppingLog['purchaseIntent'],
                  })
                }
                className="w-full px-3 py-2 bg-white border border-[#D2D2D7] rounded-[10px] focus:outline-none focus:border-[#C56A3E] focus:ring-2 focus:ring-[#C56A3E]/15"
              >
                <option value="high">높음</option>
                <option value="medium">보통</option>
                <option value="low">낮음</option>
                <option value="none">없음</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1D1D1F] mb-2">팔로업 날짜</label>
              <input
                type="date"
                value={formData.followupDate}
                onChange={(e) => setFormData({ ...formData, followupDate: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#D2D2D7] rounded-[10px] focus:outline-none focus:border-[#C56A3E] focus:ring-2 focus:ring-[#C56A3E]/15"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1D1D1F] mb-2">메모</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="추가 메모"
              rows={3}
              className="w-full px-3 py-2 bg-white border border-[#D2D2D7] rounded-[10px] focus:outline-none focus:border-[#C56A3E] focus:ring-2 focus:ring-[#C56A3E]/15 resize-none"
            />
          </div>

          <div className="flex gap-3 justify-end pt-4">
            {selectedLog && (
              <button
                onClick={() => {
                  handleDelete(selectedLog.id);
                  setIsModalOpen(false);
                }}
                className="flex items-center gap-2 px-4 py-2 text-[#C0392B] hover:bg-[#FBEBEB] rounded-[10px] transition-colors font-medium mr-auto"
              >
                <Trash2 size={18} />
                <span>삭제</span>
              </button>
            )}
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-[#E5E5EA] text-[#3A3A3C] hover:bg-[#F2F2F7] rounded-[10px] transition-colors font-medium"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={!formData.roasteryName.trim()}
              className="px-4 py-2 bg-[#C56A3E] text-white rounded-[10px] hover:bg-[#B45C33] disabled:bg-[#D2D2D7] disabled:text-white transition-colors font-medium"
            >
              {selectedLog ? '수정' : '추가'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
