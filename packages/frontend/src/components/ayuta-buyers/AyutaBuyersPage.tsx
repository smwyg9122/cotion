import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Search,
  LayoutGrid,
  List,
  CalendarDays,
  TrendingUp,
  Users,
  Sparkles,
  AlertCircle,
  ChevronDown,
  Phone,
  Mail,
  MessageCircle,
  Instagram,
  MapPin,
  User,
} from 'lucide-react';
import { api } from '../../services/api';
import { formatApiError } from '../../utils/apiError';
import { formatPhoneNumber } from '../../utils/phone';
import { Modal } from '../common/Modal';
import type {
  AyutaBuyer,
  BuyerBusinessType,
  BuyerSize,
  BuyerSource,
  BuyerInterestItem,
  BuyerStatus,
  BuyerInterestLevel,
} from '@cotion/shared';
// Runtime constants live in a frontend-local file because vite/rollup's
// CJS->ESM interop fails to statically extract named exports forwarded
// via `export *` from the shared dist. See constants.ts for details.
import {
  BUYER_BUSINESS_TYPES,
  BUYER_SIZES,
  BUYER_SOURCES,
  BUYER_INTEREST_ITEMS,
  BUYER_STATUSES,
} from './constants';

interface AyutaBuyersPageProps {
  workspace: string;
}

type ViewMode = 'table' | 'card';

interface BuyerFormData {
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  kakaoId: string;
  instagram: string;
  region: string;
  address: string;
  businessType: BuyerBusinessType | '';
  size: BuyerSize | '';
  source: BuyerSource | '';
  interestItems: BuyerInterestItem[];
  interestProducts: string;
  monthlyVolume: string;
  sampleSent: boolean;
  cuppingDone: boolean;
  status: BuyerStatus;
  interestLevel: BuyerInterestLevel;
  lastContactDate: string;
  nextAction: string;
  followUpDate: string;
  firstOrderDate: string;
  lastOrderDate: string;
  totalPurchaseAmount: string;
  totalPurchaseKg: string;
  repeatCount: string;
  notes: string;
}

const INITIAL_FORM: BuyerFormData = {
  companyName: '',
  contactPerson: '',
  phone: '',
  email: '',
  kakaoId: '',
  instagram: '',
  region: '',
  address: '',
  businessType: '',
  size: '',
  source: '',
  interestItems: [],
  interestProducts: '',
  monthlyVolume: '',
  sampleSent: false,
  cuppingDone: false,
  status: '신규문의',
  interestLevel: 'medium',
  lastContactDate: '',
  nextAction: '',
  followUpDate: '',
  firstOrderDate: '',
  lastOrderDate: '',
  totalPurchaseAmount: '',
  totalPurchaseKg: '',
  repeatCount: '',
  notes: '',
};

// Claude design — muted, warm status palette
const STATUS_STYLES: Record<BuyerStatus, { bg: string; text: string; dot: string; label: string }> = {
  신규문의: { bg: 'bg-[#EDEAE4]', text: 'text-[#5B5B5A]', dot: 'bg-[#9C9A93]', label: '신규문의' },
  연락완료: { bg: 'bg-[#E3E8EF]', text: 'text-[#4B5C73]', dot: 'bg-[#7388A6]', label: '연락완료' },
  샘플발송: { bg: 'bg-[#DCE7F1]', text: 'text-[#3F5C7E]', dot: 'bg-[#5C7CA3]', label: '샘플발송' },
  커핑완료: { bg: 'bg-[#E5DEF0]', text: 'text-[#5B4A7E]', dot: 'bg-[#7E6BA8]', label: '커핑완료' },
  견적전달: { bg: 'bg-[#EBDFEF]', text: 'text-[#6B4A75]', dot: 'bg-[#9268A0]', label: '견적전달' },
  테스트중: { bg: 'bg-[#F5E4C1]', text: 'text-[#7A5B1F]', dot: 'bg-[#B58A3E]', label: '테스트중' },
  구매완료: { bg: 'bg-[#DDE9DC]', text: 'text-[#3F6240]', dot: 'bg-[#65885E]', label: '구매완료' },
  재구매:   { bg: 'bg-[#C9DAC4]', text: 'text-[#2D5535]', dot: 'bg-[#4E7A4A]', label: '재구매' },
  보류:     { bg: 'bg-[#F4D9C2]', text: 'text-[#7A4A1A]', dot: 'bg-[#B57534]', label: '보류' },
  종료:     { bg: 'bg-[#EDD2CF]', text: 'text-[#7A3F37]', dot: 'bg-[#A35A50]', label: '종료' },
};

const INTEREST_LEVEL_STYLES: Record<BuyerInterestLevel, { icon: string; bg: string; text: string; label: string }> = {
  high:   { icon: '🔥', bg: 'bg-[#FAEAE4]', text: 'text-[#9C4A2D]', label: '높음' },
  medium: { icon: '🟡', bg: 'bg-[#F5EBD3]', text: 'text-[#7A5B1F]', label: '중간' },
  low:    { icon: '⚪', bg: 'bg-[#EDEAE4]', text: 'text-[#7B7975]', label: '낮음' },
};

interface BuyerStats {
  todayFollowUp: number;
  purchased: number;
  leads: number;
  newThisMonth: number;
}

function todayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function AyutaBuyersPage({ workspace }: AyutaBuyersPageProps) {
  const [buyers, setBuyers] = useState<AyutaBuyer[]>([]);
  const [stats, setStats] = useState<BuyerStats>({
    todayFollowUp: 0,
    purchased: 0,
    leads: 0,
    newThisMonth: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<BuyerStatus | ''>('');
  const [regionFilter, setRegionFilter] = useState<string>('');
  const [businessTypeFilter, setBusinessTypeFilter] = useState<BuyerBusinessType | ''>('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBuyer, setSelectedBuyer] = useState<AyutaBuyer | null>(null);
  const [formData, setFormData] = useState<BuyerFormData>(INITIAL_FORM);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const today = todayDateString();

  const fetchBuyers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { workspace };
      if (statusFilter) params.status = statusFilter;
      if (regionFilter) params.region = regionFilter;
      if (businessTypeFilter) params.businessType = businessTypeFilter;
      if (searchTerm.trim()) params.search = searchTerm.trim();
      const res = await api.get('/ayuta-buyers', { params });
      setBuyers(res.data.data || []);
    } catch (err: any) {
      console.error('Failed to fetch buyers:', err);
      setError('구매처 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [workspace, statusFilter, regionFilter, businessTypeFilter, searchTerm]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/ayuta-buyers/stats', { params: { workspace } });
      setStats(res.data.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, [workspace]);

  useEffect(() => { fetchBuyers(); }, [fetchBuyers]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  const availableRegions = useMemo(() => {
    const set = new Set<string>();
    buyers.forEach((b) => { if (b.region && b.region.trim()) set.add(b.region.trim()); });
    return Array.from(set).sort();
  }, [buyers]);

  const todayFollowUpBuyers = useMemo(
    () => buyers.filter((b) => b.followUpDate === today),
    [buyers, today]
  );

  const handleOpenAdd = () => {
    setSelectedBuyer(null);
    setFormData(INITIAL_FORM);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (buyer: AyutaBuyer) => {
    setSelectedBuyer(buyer);
    setFormData({
      companyName: buyer.companyName,
      contactPerson: buyer.contactPerson || '',
      phone: buyer.phone || '',
      email: buyer.email || '',
      kakaoId: buyer.kakaoId || '',
      instagram: buyer.instagram || '',
      region: buyer.region || '',
      address: buyer.address || '',
      businessType: buyer.businessType || '',
      size: buyer.size || '',
      source: buyer.source || '',
      interestItems: buyer.interestItems || [],
      interestProducts: buyer.interestProducts || '',
      monthlyVolume: buyer.monthlyVolume || '',
      sampleSent: buyer.sampleSent,
      cuppingDone: buyer.cuppingDone,
      status: buyer.status,
      interestLevel: buyer.interestLevel,
      lastContactDate: buyer.lastContactDate || '',
      nextAction: buyer.nextAction || '',
      followUpDate: buyer.followUpDate || '',
      firstOrderDate: buyer.firstOrderDate || '',
      lastOrderDate: buyer.lastOrderDate || '',
      totalPurchaseAmount: buyer.totalPurchaseAmount ? String(buyer.totalPurchaseAmount) : '',
      totalPurchaseKg: buyer.totalPurchaseKg ? String(buyer.totalPurchaseKg) : '',
      repeatCount: buyer.repeatCount ? String(buyer.repeatCount) : '',
      notes: buyer.notes || '',
    });
    setIsModalOpen(true);
  };

  // For edits we send null on cleared optional fields so the backend
  // actually persists the clear; for creates we omit empty fields entirely.
  const buildPayload = (isEdit: boolean) => {
    const strOpt = (val: string) => {
      const t = val.trim();
      if (t) return t;
      return isEdit ? null : undefined;
    };
    const dropdownOpt = (val: string) => {
      if (val) return val;
      return isEdit ? null : undefined;
    };
    return {
      companyName: formData.companyName.trim(),
      contactPerson: strOpt(formData.contactPerson),
      phone: strOpt(formData.phone),
      email: strOpt(formData.email),
      kakaoId: strOpt(formData.kakaoId),
      instagram: strOpt(formData.instagram),
      region: strOpt(formData.region),
      address: strOpt(formData.address),
      businessType: dropdownOpt(formData.businessType),
      size: dropdownOpt(formData.size),
      source: dropdownOpt(formData.source),
      interestItems: formData.interestItems,
      interestProducts: strOpt(formData.interestProducts),
      monthlyVolume: strOpt(formData.monthlyVolume),
      sampleSent: formData.sampleSent,
      cuppingDone: formData.cuppingDone,
      status: formData.status,
      interestLevel: formData.interestLevel,
      lastContactDate: formData.lastContactDate || null,
      nextAction: strOpt(formData.nextAction),
      followUpDate: formData.followUpDate || null,
      firstOrderDate: formData.firstOrderDate || null,
      lastOrderDate: formData.lastOrderDate || null,
      totalPurchaseAmount: formData.totalPurchaseAmount ? Number(formData.totalPurchaseAmount) : 0,
      totalPurchaseKg: formData.totalPurchaseKg ? Number(formData.totalPurchaseKg) : 0,
      repeatCount: formData.repeatCount ? Number(formData.repeatCount) : 0,
      notes: strOpt(formData.notes),
    };
  };

  const handleSave = async () => {
    if (!formData.companyName.trim()) {
      alert('업체명을 입력하세요.');
      return;
    }
    setSaving(true);
    try {
      if (selectedBuyer) {
        await api.put(`/ayuta-buyers/${selectedBuyer.id}`, buildPayload(true), {
          params: { workspace },
        });
      } else {
        await api.post('/ayuta-buyers', { ...buildPayload(false), workspace });
      }
      setIsModalOpen(false);
      await Promise.all([fetchBuyers(), fetchStats()]);
    } catch (err: any) {
      console.error('Failed to save buyer:', err);
      alert(formatApiError(err, '구매처 저장에 실패했습니다.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/ayuta-buyers/${id}`, { params: { workspace } });
      setBuyers((prev) => prev.filter((b) => b.id !== id));
      setDeleteConfirmId(null);
      fetchStats();
    } catch (err) {
      console.error('Failed to delete buyer:', err);
      alert(formatApiError(err, '구매처 삭제에 실패했습니다.'));
    }
  };

  const handleQuickStatusChange = async (buyer: AyutaBuyer, status: BuyerStatus) => {
    try {
      await api.put(`/ayuta-buyers/${buyer.id}`, { status }, { params: { workspace } });
      setBuyers((prev) => prev.map((b) => (b.id === buyer.id ? { ...b, status } : b)));
      fetchStats();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const toggleInterestItem = (item: BuyerInterestItem) => {
    setFormData((prev) => ({
      ...prev,
      interestItems: prev.interestItems.includes(item)
        ? prev.interestItems.filter((i) => i !== item)
        : [...prev.interestItems, item],
    }));
  };

  const renderStatusBadge = (status: BuyerStatus) => {
    const s = STATUS_STYLES[status];
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${s.bg} ${s.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
        {s.label}
      </span>
    );
  };

  const renderInterestLevel = (level: BuyerInterestLevel) => {
    const s = INTEREST_LEVEL_STYLES[level];
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${s.bg} ${s.text}`} title={`관심도: ${s.label}`}>
        <span className="text-[10px]">{s.icon}</span>
        <span>{s.label}</span>
      </span>
    );
  };

  return (
    <div className="h-full flex flex-col bg-[#F5F2EE] claude-page">
      {/* Header */}
      <header className="bg-[#FAF9F7] border-b border-[#E8E4DC]">
        <div className="px-8 pt-8 pb-6">
          <div className="flex items-start justify-between mb-7">
            <div>
              <p className="text-xs font-medium text-[#9C9A93] uppercase tracking-[0.12em] mb-2">Ayuta · CRM</p>
              <h1 className="claude-heading text-[28px] leading-tight font-semibold text-[#1F1E1D]">
                구매처 관리
              </h1>
              <p className="text-sm text-[#5B5B5A] mt-1.5">아유타 커피의 구매처를 한곳에서 추적하고 영업 파이프라인을 관리하세요.</p>
            </div>
            <button
              onClick={handleOpenAdd}
              className="claude-btn-primary inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium"
            >
              <Plus size={16} strokeWidth={2.2} />
              <span>신규 구매처</span>
            </button>
          </div>

          {/* Dashboard */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <StatCard
              icon={<CalendarDays className="w-[18px] h-[18px]" strokeWidth={1.8} />}
              label="오늘 재연락"
              value={stats.todayFollowUp}
              accent={stats.todayFollowUp > 0}
            />
            <StatCard
              icon={<TrendingUp className="w-[18px] h-[18px]" strokeWidth={1.8} />}
              label="구매 완료"
              value={stats.purchased}
            />
            <StatCard
              icon={<Users className="w-[18px] h-[18px]" strokeWidth={1.8} />}
              label="잠재 고객"
              value={stats.leads}
            />
            <StatCard
              icon={<Sparkles className="w-[18px] h-[18px]" strokeWidth={1.8} />}
              label="이번 달 신규"
              value={stats.newThisMonth}
            />
          </div>

          {/* Today follow-up */}
          {todayFollowUpBuyers.length > 0 && (
            <div className="mb-5 px-4 py-3 bg-[#FAEAE4] border border-[#F0D2C5] rounded-xl flex items-start gap-2.5">
              <AlertCircle size={15} className="text-[#9C4A2D] mt-0.5 flex-shrink-0" strokeWidth={2} />
              <div className="flex-1 text-sm">
                <span className="font-semibold text-[#9C4A2D]">오늘 재연락 {todayFollowUpBuyers.length}건 · </span>
                <span className="text-[#7A4127]">
                  {todayFollowUpBuyers.slice(0, 5).map((b) => b.companyName).join(', ')}
                  {todayFollowUpBuyers.length > 5 && ` 외 ${todayFollowUpBuyers.length - 5}건`}
                </span>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search size={15} strokeWidth={1.8} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9C9A93]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="업체명, 담당자, 연락처, 인스타, 메모 검색"
                className="claude-input w-full pl-9 pr-3 py-2 text-sm"
              />
            </div>
            <FilterSelect
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as BuyerStatus | '')}
              placeholder="상태 전체"
              options={BUYER_STATUSES.map((s) => ({ value: s, label: s }))}
            />
            <FilterSelect
              value={regionFilter}
              onChange={(v) => setRegionFilter(v)}
              placeholder="지역 전체"
              options={availableRegions.map((r) => ({ value: r, label: r }))}
            />
            <FilterSelect
              value={businessTypeFilter}
              onChange={(v) => setBusinessTypeFilter(v as BuyerBusinessType | '')}
              placeholder="업종 전체"
              options={BUYER_BUSINESS_TYPES.map((b) => ({ value: b, label: b }))}
            />
            {(searchTerm || statusFilter || regionFilter || businessTypeFilter) && (
              <button
                onClick={() => {
                  setSearchTerm(''); setStatusFilter(''); setRegionFilter(''); setBusinessTypeFilter('');
                }}
                className="px-3 py-2 text-xs text-[#7B7975] hover:text-[#1F1E1D] hover:bg-[#EFECE7] rounded-lg transition-colors"
              >
                필터 초기화
              </button>
            )}
            <div className="ml-auto flex items-center gap-0.5 bg-[#EFECE7] rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'table' ? 'bg-white shadow-[0_1px_2px_rgba(31,30,29,0.06)] text-[#1F1E1D]' : 'text-[#7B7975]'
                }`}
                title="테이블 보기"
              >
                <List size={15} strokeWidth={1.8} />
              </button>
              <button
                onClick={() => setViewMode('card')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'card' ? 'bg-white shadow-[0_1px_2px_rgba(31,30,29,0.06)] text-[#1F1E1D]' : 'text-[#7B7975]'
                }`}
                title="카드 보기"
              >
                <LayoutGrid size={15} strokeWidth={1.8} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto px-8 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64 text-[#7B7975] text-sm">불러오는 중…</div>
        ) : error ? (
          <div className="flex items-center justify-center h-64 text-[#7A3F37] text-sm">{error}</div>
        ) : buyers.length === 0 ? (
          <EmptyState onAdd={handleOpenAdd} />
        ) : viewMode === 'table' ? (
          <BuyerTable
            buyers={buyers}
            renderStatusBadge={renderStatusBadge}
            renderInterestLevel={renderInterestLevel}
            onEdit={handleOpenEdit}
            onDelete={handleDelete}
            deleteConfirmId={deleteConfirmId}
            setDeleteConfirmId={setDeleteConfirmId}
            onQuickStatusChange={handleQuickStatusChange}
            today={today}
          />
        ) : (
          <BuyerCardGrid
            buyers={buyers}
            renderStatusBadge={renderStatusBadge}
            renderInterestLevel={renderInterestLevel}
            onEdit={handleOpenEdit}
            today={today}
          />
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedBuyer ? '구매처 수정' : '신규 구매처 등록'}
        size="xl"
      >
        <BuyerForm
          formData={formData}
          setFormData={setFormData}
          onSave={handleSave}
          onCancel={() => setIsModalOpen(false)}
          isEdit={!!selectedBuyer}
          toggleInterestItem={toggleInterestItem}
          saving={saving}
        />
      </Modal>

      <style>{`
        .claude-page { font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif; }
        .claude-heading { font-family: 'Tiempos Headline', 'GT Sectra', 'Source Serif Pro', Georgia, serif; letter-spacing: -0.01em; }
        .claude-btn-primary {
          background: #C96442; color: #FFFFFF; border-radius: 8px;
          transition: background-color 120ms ease, transform 80ms ease;
          box-shadow: 0 1px 2px rgba(31, 30, 29, 0.08);
        }
        .claude-btn-primary:hover { background: #B5573A; }
        .claude-btn-primary:active { transform: translateY(1px); }
        .claude-btn-primary:disabled { background: #D7D3CC; cursor: not-allowed; box-shadow: none; }
        .claude-btn-ghost {
          background: transparent; color: #1F1E1D; border-radius: 8px;
        }
        .claude-btn-ghost:hover { background: #EFECE7; }
        .claude-input {
          background: #FFFFFF; border: 1px solid #E8E4DC; border-radius: 8px;
          color: #1F1E1D; outline: none;
          transition: border-color 100ms ease, box-shadow 100ms ease;
        }
        .claude-input:focus { border-color: #C96442; box-shadow: 0 0 0 3px rgba(201, 100, 66, 0.15); }
        .claude-card {
          background: #FAF9F7; border: 1px solid #E8E4DC; border-radius: 12px;
        }
        .claude-card-elevated {
          background: #FFFFFF; border: 1px solid #E8E4DC; border-radius: 12px;
          box-shadow: 0 1px 2px rgba(31, 30, 29, 0.04);
        }
      `}</style>
    </div>
  );
}

// ---------- StatCard ----------
function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent?: boolean }) {
  return (
    <div
      className={`claude-card-elevated px-5 py-4 transition-colors ${
        accent ? 'ring-1 ring-[#F0D2C5] bg-[#FBF3EE]' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-[#7B7975] uppercase tracking-[0.08em]">{label}</p>
          <p className="claude-heading text-[26px] leading-none font-semibold text-[#1F1E1D] mt-2">{value}</p>
        </div>
        <div className={`p-1.5 rounded-lg ${accent ? 'text-[#9C4A2D] bg-[#FAEAE4]' : 'text-[#7B7975] bg-[#EFECE7]'}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// ---------- FilterSelect ----------
function FilterSelect({ value, onChange, placeholder, options }: {
  value: string; onChange: (v: string) => void; placeholder: string; options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="claude-input appearance-none cursor-pointer pl-3 pr-8 py-2 text-sm"
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown size={13} strokeWidth={2} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9C9A93] pointer-events-none" />
    </div>
  );
}

// ---------- EmptyState ----------
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="claude-card flex flex-col items-center justify-center py-20 text-center">
      <div className="w-12 h-12 rounded-full bg-[#FAEAE4] flex items-center justify-center mb-4">
        <Sparkles className="text-[#9C4A2D]" size={20} strokeWidth={1.8} />
      </div>
      <h3 className="claude-heading text-xl text-[#1F1E1D] font-semibold mb-1.5">아직 구매처가 없습니다</h3>
      <p className="text-sm text-[#7B7975] mb-5">첫 구매처를 등록하여 CRM을 시작해보세요.</p>
      <button onClick={onAdd} className="claude-btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-medium">
        <Plus size={14} /> 신규 구매처 등록
      </button>
    </div>
  );
}

// ---------- BuyerTable ----------
interface BuyerTableProps {
  buyers: AyutaBuyer[];
  renderStatusBadge: (s: BuyerStatus) => React.ReactNode;
  renderInterestLevel: (l: BuyerInterestLevel) => React.ReactNode;
  onEdit: (b: AyutaBuyer) => void;
  onDelete: (id: string) => void;
  deleteConfirmId: string | null;
  setDeleteConfirmId: (id: string | null) => void;
  onQuickStatusChange: (b: AyutaBuyer, s: BuyerStatus) => void;
  today: string;
}
function BuyerTable({
  buyers, renderStatusBadge, renderInterestLevel, onEdit, onDelete,
  deleteConfirmId, setDeleteConfirmId, onQuickStatusChange, today,
}: BuyerTableProps) {
  return (
    <div className="claude-card-elevated overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-[#F5F2EE] border-b border-[#E8E4DC]">
              {['업체', '담당자', '연락', '업종 · 지역', '관심 품목', '상태', '관심도', '다음 액션', '재연락일', '누적', ''].map((h, i) => (
                <th
                  key={i}
                  className={`text-[11px] font-semibold text-[#7B7975] uppercase tracking-[0.08em] px-4 py-3.5 ${
                    h === '' ? 'text-center' : h === '누적' ? 'text-right' : 'text-left'
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {buyers.map((b) => {
              const isOverdue = b.followUpDate && b.followUpDate < today;
              const isToday = b.followUpDate === today;
              return (
                <tr key={b.id} className="border-b border-[#EFECE7] last:border-0 hover:bg-[#FBF8F4] transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="font-semibold text-[#1F1E1D] text-sm">{b.companyName}</div>
                    {b.size && <div className="text-[11px] text-[#9C9A93] mt-0.5">{b.size}</div>}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-[#3F3E3D]">{b.contactPerson || '—'}</td>
                  <td className="px-4 py-3.5 text-sm">
                    <div className="space-y-0.5">
                      {b.phone && <div className="text-[12px] text-[#3F3E3D]">{b.phone}</div>}
                      {b.kakaoId && <div className="text-[11px] text-[#7A5B1F]">카 · {b.kakaoId}</div>}
                      {b.instagram && <div className="text-[11px] text-[#9C4A2D]">@{b.instagram.replace(/^@/, '')}</div>}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-sm">
                    <div className="text-[#3F3E3D]">{b.businessType || '—'}</div>
                    {b.region && <div className="text-[11px] text-[#9C9A93]">{b.region}</div>}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-wrap gap-1 max-w-[160px]">
                      {b.interestItems.slice(0, 3).map((it) => (
                        <span key={it} className="text-[10px] px-1.5 py-0.5 bg-[#F5EBD3] text-[#7A5B1F] rounded">
                          {it}
                        </span>
                      ))}
                      {b.interestItems.length > 3 && (
                        <span className="text-[10px] text-[#9C9A93]">+{b.interestItems.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <QuickStatusSelect current={b.status} onChange={(s) => onQuickStatusChange(b, s)} />
                  </td>
                  <td className="px-4 py-3.5">{renderInterestLevel(b.interestLevel)}</td>
                  <td className="px-4 py-3.5 text-sm text-[#3F3E3D] max-w-[180px] truncate" title={b.nextAction || ''}>
                    {b.nextAction || '—'}
                  </td>
                  <td className="px-4 py-3.5 text-sm">
                    {b.followUpDate ? (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          isOverdue
                            ? 'bg-[#EDD2CF] text-[#7A3F37]'
                            : isToday
                            ? 'bg-[#FAEAE4] text-[#9C4A2D]'
                            : 'text-[#5B5B5A]'
                        }`}
                      >
                        {b.followUpDate}
                      </span>
                    ) : (
                      <span className="text-[#C2BFB8]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-right">
                    {b.totalPurchaseAmount > 0 ? (
                      <div>
                        <div className="text-[12px] text-[#1F1E1D] font-medium">₩{b.totalPurchaseAmount.toLocaleString()}</div>
                        {b.totalPurchaseKg > 0 && <div className="text-[10px] text-[#9C9A93]">{b.totalPurchaseKg}kg</div>}
                        {b.repeatCount > 0 && <div className="text-[10px] text-[#3F6240]">재구매 {b.repeatCount}회</div>}
                      </div>
                    ) : (
                      <span className="text-[#C2BFB8]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => onEdit(b)}
                        className="p-1.5 text-[#7B7975] hover:text-[#1F1E1D] hover:bg-[#EFECE7] rounded transition-colors"
                        title="수정"
                      >
                        <Pencil size={14} strokeWidth={1.8} />
                      </button>
                      {deleteConfirmId === b.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onDelete(b.id)}
                            className="p-1.5 text-white bg-[#A35A50] hover:bg-[#8C4A41] rounded transition-colors"
                            title="삭제 확인"
                          >
                            <Check size={13} strokeWidth={2} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="p-1.5 text-[#7B7975] hover:bg-[#EFECE7] rounded transition-colors"
                          >
                            <X size={13} strokeWidth={2} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(b.id)}
                          className="p-1.5 text-[#7B7975] hover:text-[#7A3F37] hover:bg-[#EDD2CF]/40 rounded transition-colors"
                          title="삭제"
                        >
                          <Trash2 size={14} strokeWidth={1.8} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- QuickStatusSelect ----------
function QuickStatusSelect({ current, onChange }: { current: BuyerStatus; onChange: (s: BuyerStatus) => void }) {
  const s = STATUS_STYLES[current];
  return (
    <div className="relative inline-block">
      <select
        value={current}
        onChange={(e) => onChange(e.target.value as BuyerStatus)}
        className={`appearance-none cursor-pointer pl-2.5 pr-7 py-1 text-[11px] font-medium rounded-full border-0 focus:outline-none focus:ring-2 focus:ring-[#C96442]/30 ${s.bg} ${s.text}`}
      >
        {BUYER_STATUSES.map((st) => (
          <option key={st} value={st}>{st}</option>
        ))}
      </select>
      <ChevronDown size={10} strokeWidth={2.5} className={`absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${s.text}`} />
    </div>
  );
}

// ---------- BuyerCardGrid ----------
interface BuyerCardGridProps {
  buyers: AyutaBuyer[];
  renderStatusBadge: (s: BuyerStatus) => React.ReactNode;
  renderInterestLevel: (l: BuyerInterestLevel) => React.ReactNode;
  onEdit: (b: AyutaBuyer) => void;
  today: string;
}
function BuyerCardGrid({ buyers, renderStatusBadge, renderInterestLevel, onEdit, today }: BuyerCardGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {buyers.map((b) => {
        const isOverdue = b.followUpDate && b.followUpDate < today;
        const isToday = b.followUpDate === today;
        return (
          <div
            key={b.id}
            onClick={() => onEdit(b)}
            className="claude-card-elevated p-5 cursor-pointer hover:border-[#D7CFC0] hover:shadow-[0_4px_14px_rgba(31,30,29,0.06)] transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="claude-heading text-[15px] font-semibold text-[#1F1E1D] truncate">{b.companyName}</h3>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-[#7B7975]">
                  {b.businessType && <span>{b.businessType}</span>}
                  {b.region && (
                    <span className="flex items-center gap-0.5">
                      <MapPin size={10} /> {b.region}
                    </span>
                  )}
                </div>
              </div>
              {renderInterestLevel(b.interestLevel)}
            </div>

            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {renderStatusBadge(b.status)}
              {b.size && (
                <span className="text-[11px] px-2 py-0.5 bg-[#EFECE7] text-[#5B5B5A] rounded-full">{b.size}</span>
              )}
            </div>

            {b.interestItems.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {b.interestItems.map((it) => (
                  <span key={it} className="text-[10px] px-1.5 py-0.5 bg-[#F5EBD3] text-[#7A5B1F] rounded">
                    {it}
                  </span>
                ))}
              </div>
            )}

            <div className="space-y-1 text-[12px] text-[#5B5B5A] mb-3">
              {b.contactPerson && <Row icon={<User size={11} />}>{b.contactPerson}</Row>}
              {b.phone && <Row icon={<Phone size={11} />}>{b.phone}</Row>}
              {b.email && <Row icon={<Mail size={11} />}><span className="truncate">{b.email}</span></Row>}
              {b.kakaoId && <Row icon={<MessageCircle size={11} className="text-[#7A5B1F]" />}>{b.kakaoId}</Row>}
              {b.instagram && <Row icon={<Instagram size={11} className="text-[#9C4A2D]" />}>@{b.instagram.replace(/^@/, '')}</Row>}
            </div>

            {(b.nextAction || b.followUpDate) && (
              <div className="border-t border-[#EFECE7] pt-3 space-y-1">
                {b.nextAction && (
                  <div className="text-[12px] text-[#3F3E3D]">
                    <span className="font-medium text-[#1F1E1D]">다음: </span>{b.nextAction}
                  </div>
                )}
                {b.followUpDate && (
                  <div
                    className={`text-[11px] flex items-center gap-1 ${
                      isOverdue
                        ? 'text-[#7A3F37] font-semibold'
                        : isToday
                        ? 'text-[#9C4A2D] font-semibold'
                        : 'text-[#7B7975]'
                    }`}
                  >
                    <CalendarDays size={11} />
                    재연락 · {b.followUpDate}
                    {isOverdue && ' (지연)'}
                    {isToday && ' (오늘)'}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
function Row({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[#9C9A93] flex-shrink-0">{icon}</span>
      <span>{children}</span>
    </div>
  );
}

// ---------- BuyerForm ----------
interface BuyerFormProps {
  formData: BuyerFormData;
  setFormData: React.Dispatch<React.SetStateAction<BuyerFormData>>;
  onSave: () => void;
  onCancel: () => void;
  isEdit: boolean;
  toggleInterestItem: (item: BuyerInterestItem) => void;
  saving: boolean;
}
function BuyerForm({ formData, setFormData, onSave, onCancel, isEdit, toggleInterestItem, saving }: BuyerFormProps) {
  const update = <K extends keyof BuyerFormData>(key: K, value: BuyerFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };
  return (
    <div className="space-y-6 claude-form">
      <Section title="기본 정보">
        <Grid cols={2}>
          <Field label="업체명" required>
            <input type="text" value={formData.companyName} onChange={(e) => update('companyName', e.target.value)} className="claude-input w-full px-3 py-2 text-sm" placeholder="예: 아유타 카페" />
          </Field>
          <Field label="담당자명">
            <input type="text" value={formData.contactPerson} onChange={(e) => update('contactPerson', e.target.value)} className="claude-input w-full px-3 py-2 text-sm" placeholder="담당자 이름" />
          </Field>
          <Field label="연락처">
            <input type="tel" inputMode="numeric" value={formData.phone} onChange={(e) => update('phone', formatPhoneNumber(e.target.value))} className="claude-input w-full px-3 py-2 text-sm" placeholder="010-0000-0000" maxLength={13} />
          </Field>
          <Field label="이메일">
            <input type="email" value={formData.email} onChange={(e) => update('email', e.target.value)} className="claude-input w-full px-3 py-2 text-sm" placeholder="example@email.com" />
          </Field>
          <Field label="카카오톡 ID">
            <input type="text" value={formData.kakaoId} onChange={(e) => update('kakaoId', e.target.value)} className="claude-input w-full px-3 py-2 text-sm" placeholder="카카오 ID" />
          </Field>
          <Field label="인스타그램">
            <input type="text" value={formData.instagram} onChange={(e) => update('instagram', e.target.value)} className="claude-input w-full px-3 py-2 text-sm" placeholder="@username" />
          </Field>
          <Field label="지역">
            <input type="text" value={formData.region} onChange={(e) => update('region', e.target.value)} className="claude-input w-full px-3 py-2 text-sm" placeholder="예: 부산, 서울" />
          </Field>
          <Field label="업종">
            <select value={formData.businessType} onChange={(e) => update('businessType', e.target.value as BuyerBusinessType | '')} className="claude-input w-full px-3 py-2 text-sm">
              <option value="">선택</option>
              {BUYER_BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="규모">
            <select value={formData.size} onChange={(e) => update('size', e.target.value as BuyerSize | '')} className="claude-input w-full px-3 py-2 text-sm">
              <option value="">선택</option>
              {BUYER_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="유입 경로">
            <select value={formData.source} onChange={(e) => update('source', e.target.value as BuyerSource | '')} className="claude-input w-full px-3 py-2 text-sm">
              <option value="">선택</option>
              {BUYER_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </Grid>
        <Field label="주소">
          <input type="text" value={formData.address} onChange={(e) => update('address', e.target.value)} className="claude-input w-full px-3 py-2 text-sm" placeholder="상세 주소" />
        </Field>
      </Section>

      <Section title="관심 · 구매 정보">
        <Field label="관심 품목 (복수 선택)">
          <div className="flex flex-wrap gap-1.5">
            {BUYER_INTEREST_ITEMS.map((item) => {
              const checked = formData.interestItems.includes(item);
              return (
                <button
                  type="button"
                  key={item}
                  onClick={() => toggleInterestItem(item)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                    checked
                      ? 'bg-[#C96442] text-white border-[#C96442]'
                      : 'bg-white text-[#3F3E3D] border-[#E8E4DC] hover:border-[#D7CFC0]'
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </Field>
        <Grid cols={2}>
          <Field label="관심 제품">
            <input type="text" value={formData.interestProducts} onChange={(e) => update('interestProducts', e.target.value)} className="claude-input w-full px-3 py-2 text-sm" placeholder="예: 베트남 G1, 콜롬비아 디카페인" />
          </Field>
          <Field label="월 예상 물량">
            <input type="text" value={formData.monthlyVolume} onChange={(e) => update('monthlyVolume', e.target.value)} className="claude-input w-full px-3 py-2 text-sm" placeholder="예: 5kg, 10kg" />
          </Field>
        </Grid>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-[#3F3E3D]">
            <input type="checkbox" checked={formData.sampleSent} onChange={(e) => update('sampleSent', e.target.checked)} className="w-4 h-4 accent-[#C96442]" />
            샘플 발송
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-[#3F3E3D]">
            <input type="checkbox" checked={formData.cuppingDone} onChange={(e) => update('cuppingDone', e.target.checked)} className="w-4 h-4 accent-[#C96442]" />
            커핑 진행
          </label>
        </div>
      </Section>

      <Section title="영업 파이프라인">
        <Grid cols={2}>
          <Field label="상태">
            <select value={formData.status} onChange={(e) => update('status', e.target.value as BuyerStatus)} className="claude-input w-full px-3 py-2 text-sm">
              {BUYER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="관심도">
            <select value={formData.interestLevel} onChange={(e) => update('interestLevel', e.target.value as BuyerInterestLevel)} className="claude-input w-full px-3 py-2 text-sm">
              <option value="high">🔥 높음</option>
              <option value="medium">🟡 중간</option>
              <option value="low">⚪ 낮음</option>
            </select>
          </Field>
          <Field label="마지막 연락일">
            <input type="date" value={formData.lastContactDate} onChange={(e) => update('lastContactDate', e.target.value)} className="claude-input w-full px-3 py-2 text-sm" />
          </Field>
          <Field label="재연락 예정일">
            <input type="date" value={formData.followUpDate} onChange={(e) => update('followUpDate', e.target.value)} className="claude-input w-full px-3 py-2 text-sm" />
          </Field>
        </Grid>
        <Field label="다음 액션">
          <input type="text" value={formData.nextAction} onChange={(e) => update('nextAction', e.target.value)} className="claude-input w-full px-3 py-2 text-sm" placeholder="예: 500g 샘플 발송, 견적 전달" />
        </Field>
      </Section>

      <Section title="주문 관리">
        <Grid cols={2}>
          <Field label="첫 주문일">
            <input type="date" value={formData.firstOrderDate} onChange={(e) => update('firstOrderDate', e.target.value)} className="claude-input w-full px-3 py-2 text-sm" />
          </Field>
          <Field label="최근 주문일">
            <input type="date" value={formData.lastOrderDate} onChange={(e) => update('lastOrderDate', e.target.value)} className="claude-input w-full px-3 py-2 text-sm" />
          </Field>
          <Field label="누적 구매액 (원)">
            <input type="number" value={formData.totalPurchaseAmount} onChange={(e) => update('totalPurchaseAmount', e.target.value)} className="claude-input w-full px-3 py-2 text-sm" min="0" step="1000" />
          </Field>
          <Field label="총 구매량 (KG)">
            <input type="number" value={formData.totalPurchaseKg} onChange={(e) => update('totalPurchaseKg', e.target.value)} className="claude-input w-full px-3 py-2 text-sm" min="0" step="0.1" />
          </Field>
          <Field label="재구매 횟수">
            <input type="number" value={formData.repeatCount} onChange={(e) => update('repeatCount', e.target.value)} className="claude-input w-full px-3 py-2 text-sm" min="0" step="1" />
          </Field>
        </Grid>
      </Section>

      <Section title="메모">
        <Field label="">
          <textarea value={formData.notes} onChange={(e) => update('notes', e.target.value)} className="claude-input w-full px-3 py-2 text-sm min-h-[100px]" placeholder="예: 산미 약한 원두 선호, 가격 민감, 인스타 DM 선호" rows={4} />
        </Field>
      </Section>

      <div className="flex justify-end gap-2 pt-3 border-t border-[#EFECE7]">
        <button
          onClick={onCancel}
          disabled={saving}
          className="claude-btn-ghost px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          취소
        </button>
        <button
          onClick={onSave}
          disabled={saving || !formData.companyName.trim()}
          className="claude-btn-primary inline-flex items-center gap-2 px-5 py-2 text-sm font-medium"
        >
          {saving ? '저장 중…' : isEdit ? '수정' : '등록'}
        </button>
      </div>
    </div>
  );
}

// ---------- Layout helpers ----------
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="claude-heading text-[15px] font-semibold text-[#1F1E1D] pb-1.5 border-b border-[#EFECE7]">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
function Grid({ cols, children }: { cols: number; children: React.ReactNode }) {
  const cls = cols === 2 ? 'grid grid-cols-1 md:grid-cols-2 gap-3' : 'grid grid-cols-1 gap-3';
  return <div className={cls}>{children}</div>;
}
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      {label && (
        <label className="block text-[11px] font-medium text-[#5B5B5A] mb-1.5 uppercase tracking-[0.06em]">
          {label}
          {required && <span className="text-[#C96442] ml-0.5">*</span>}
        </label>
      )}
      {children}
    </div>
  );
}
