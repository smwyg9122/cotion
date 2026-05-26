import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  ChevronDown,
} from 'lucide-react';
import { api } from '../../services/api';
import { formatApiError } from '../../utils/apiError';
import { Modal } from '../common/Modal';

interface ClientsPageProps {
  workspace: string;
}

// ─── Enum-like constants (mirror shared types) ─────────────────────
// Inlined here for the same Rollup CJS-interop reason as ayuta-buyers/constants.
const BUSINESS_TYPES = ['카페', '로스터리', '도매', '기업', '유통사', '기타'] as const;
const STATUSES = ['신규', '진행중', '정기거래', '휴면', '중단'] as const;
const PAYMENT_TERMS = ['선불', '후불', '월말정산'] as const;

type ClientStatus = typeof STATUSES[number];
type ClientBusinessType = typeof BUSINESS_TYPES[number];
type ClientPaymentTerms = typeof PAYMENT_TERMS[number];

const STATUS_STYLES: Record<ClientStatus, { bg: string; text: string; dot: string }> = {
  신규:   { bg: 'bg-gray-100',   text: 'text-gray-700',   dot: 'bg-gray-400' },
  진행중: { bg: 'bg-blue-50',    text: 'text-blue-700',   dot: 'bg-blue-500' },
  정기거래:{ bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  휴면:   { bg: 'bg-amber-50',   text: 'text-amber-700',  dot: 'bg-amber-500' },
  중단:   { bg: 'bg-red-50',     text: 'text-red-700',    dot: 'bg-red-500' },
};

interface Client {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  visited: boolean;
  cuppingDone: boolean;
  purchased: boolean;
  assignedTo: string;
  notes: string;
  workspace: string;

  // A. 영업 관리
  kakaoId: string | null;
  instagram: string | null;
  region: string | null;
  businessType: ClientBusinessType | null;
  status: ClientStatus;
  followUpDate: string | null;

  // B. 거래 추적
  firstOrderDate: string | null;
  lastOrderDate: string | null;
  totalOrderAmount: number;
  monthlyVolumeKg: number;
  preferredItems: string[];

  // C. B2B
  taxId: string | null;
  invoiceEmail: string | null;
  paymentTerms: ClientPaymentTerms | null;
  shippingAddress: string | null;

  createdAt?: string;
  updatedAt?: string;
}

interface ClientFormData {
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  visited: boolean;
  cuppingDone: boolean;
  purchased: boolean;
  assignedTo: string;
  notes: string;

  kakaoId: string;
  instagram: string;
  region: string;
  businessType: ClientBusinessType | '';
  status: ClientStatus;
  followUpDate: string;

  firstOrderDate: string;
  lastOrderDate: string;
  totalOrderAmount: string;
  monthlyVolumeKg: string;
  preferredItemsCsv: string; // comma-separated for the input field

  taxId: string;
  invoiceEmail: string;
  paymentTerms: ClientPaymentTerms | '';
  shippingAddress: string;
}

const INITIAL_FORM: ClientFormData = {
  name: '',
  contactPerson: '',
  phone: '',
  email: '',
  address: '',
  visited: false,
  cuppingDone: false,
  purchased: false,
  assignedTo: '',
  notes: '',

  kakaoId: '',
  instagram: '',
  region: '',
  businessType: '',
  status: '신규',
  followUpDate: '',

  firstOrderDate: '',
  lastOrderDate: '',
  totalOrderAmount: '',
  monthlyVolumeKg: '',
  preferredItemsCsv: '',

  taxId: '',
  invoiceEmail: '',
  paymentTerms: '',
  shippingAddress: '',
};

type FilterType = 'all' | 'visited' | 'cupping' | 'purchased';

interface TeamUser {
  id: string;
  name: string;
  title: string | null;
  username: string;
}

export function ClientsPage({ workspace }: ClientsPageProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [teamUsers, setTeamUsers] = useState<TeamUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [statusFilter, setStatusFilter] = useState<ClientStatus | ''>('');
  const [businessFilter, setBusinessFilter] = useState<ClientBusinessType | ''>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState<ClientFormData>(INITIAL_FORM);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Fetch team users for assignee dropdown (filtered by workspace)
  const fetchUsers = useCallback(async () => {
    try {
      const response = await api.get('/auth/users', { params: { workspace } });
      const userList = response.data.data || response.data || [];
      setTeamUsers(userList.map((u: any) => ({
        id: u.id,
        name: u.name,
        title: u.title || null,
        username: u.username,
      })));
    } catch (err: any) {
      console.error('Failed to fetch users:', err);
    }
  }, [workspace]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const getUserDisplayName = (userId: string) => {
    const user = teamUsers.find((u) => u.id === userId);
    if (!user) return userId;
    return user.title ? `${user.name} ${user.title}` : user.name;
  };

  const fetchClients = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get('/clients', { params: { workspace } });
      setClients(response.data.data || []);
    } catch (err: any) {
      console.error('Failed to fetch clients:', err);
      setError('거래처 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [workspace]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      if (filter === 'visited' && !client.visited) return false;
      if (filter === 'cupping' && !client.cuppingDone) return false;
      if (filter === 'purchased' && !client.purchased) return false;
      if (statusFilter && client.status !== statusFilter) return false;
      if (businessFilter && client.businessType !== businessFilter) return false;
      return true;
    });
  }, [clients, filter, statusFilter, businessFilter]);

  const handleOpenAdd = () => {
    setSelectedClient(null);
    setFormData(INITIAL_FORM);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (client: Client) => {
    setSelectedClient(client);
    setFormData({
      name: client.name || '',
      contactPerson: client.contactPerson || '',
      phone: client.phone || '',
      email: client.email || '',
      address: client.address || '',
      visited: client.visited,
      cuppingDone: client.cuppingDone,
      purchased: client.purchased,
      assignedTo: client.assignedTo || '',
      notes: client.notes || '',

      kakaoId: client.kakaoId || '',
      instagram: client.instagram || '',
      region: client.region || '',
      businessType: client.businessType || '',
      status: client.status || '신규',
      followUpDate: client.followUpDate || '',

      firstOrderDate: client.firstOrderDate || '',
      lastOrderDate: client.lastOrderDate || '',
      totalOrderAmount: client.totalOrderAmount ? String(client.totalOrderAmount) : '',
      monthlyVolumeKg: client.monthlyVolumeKg ? String(client.monthlyVolumeKg) : '',
      preferredItemsCsv: (client.preferredItems || []).join(', '),

      taxId: client.taxId || '',
      invoiceEmail: client.invoiceEmail || '',
      paymentTerms: client.paymentTerms || '',
      shippingAddress: client.shippingAddress || '',
    });
    setIsModalOpen(true);
  };

  // On EDIT we send `null` for cleared optional fields so they actually
  // clear in DB. On CREATE we omit them (undefined) so DB defaults apply.
  const buildPayload = (isEdit: boolean) => {
    const strOpt = (v: string) => {
      const t = v.trim();
      if (t) return t;
      return isEdit ? null : undefined;
    };
    const enumOpt = (v: string) => {
      if (v) return v;
      return isEdit ? null : undefined;
    };
    const preferredItems = formData.preferredItemsCsv
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    return {
      name: formData.name.trim(),
      contactPerson: strOpt(formData.contactPerson),
      phone: strOpt(formData.phone),
      email: strOpt(formData.email),
      address: strOpt(formData.address),
      visited: formData.visited,
      cuppingDone: formData.cuppingDone,
      purchased: formData.purchased,
      assignedTo: strOpt(formData.assignedTo),
      notes: strOpt(formData.notes),

      // A
      kakaoId: strOpt(formData.kakaoId),
      instagram: strOpt(formData.instagram),
      region: strOpt(formData.region),
      businessType: enumOpt(formData.businessType),
      status: formData.status,
      followUpDate: formData.followUpDate || null,

      // B
      firstOrderDate: formData.firstOrderDate || null,
      lastOrderDate: formData.lastOrderDate || null,
      totalOrderAmount: formData.totalOrderAmount ? Number(formData.totalOrderAmount) : 0,
      monthlyVolumeKg: formData.monthlyVolumeKg ? Number(formData.monthlyVolumeKg) : 0,
      preferredItems,

      // C
      taxId: strOpt(formData.taxId),
      invoiceEmail: strOpt(formData.invoiceEmail),
      paymentTerms: enumOpt(formData.paymentTerms),
      shippingAddress: strOpt(formData.shippingAddress),
    };
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('거래처명을 입력하세요.');
      return;
    }
    try {
      if (selectedClient) {
        await api.put(`/clients/${selectedClient.id}`, buildPayload(true), {
          params: { workspace },
        });
      } else {
        await api.post('/clients', { ...buildPayload(false), workspace });
      }
      await fetchClients();
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Failed to save client:', err);
      alert(formatApiError(err, '거래처 저장에 실패했습니다.'));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/clients/${id}`, { params: { workspace } });
      setClients((prev) => prev.filter((c) => c.id !== id));
      setDeleteConfirmId(null);
    } catch (err: any) {
      console.error('Failed to delete client:', err);
      alert(formatApiError(err, '거래처 삭제에 실패했습니다.'));
    }
  };

  const handleToggleField = async (client: Client, field: 'visited' | 'cuppingDone' | 'purchased') => {
    try {
      await api.put(`/clients/${client.id}`, { [field]: !client[field] }, { params: { workspace } });
      setClients((prev) => prev.map((c) => (c.id === client.id ? { ...c, [field]: !c[field] } : c)));
    } catch (err: any) {
      console.error('Failed to update client:', err);
      alert(formatApiError(err, '상태 변경에 실패했습니다.'));
    }
  };

  const handleQuickStatusChange = async (client: Client, status: ClientStatus) => {
    try {
      await api.put(`/clients/${client.id}`, { status }, { params: { workspace } });
      setClients((prev) => prev.map((c) => (c.id === client.id ? { ...c, status } : c)));
    } catch (err: any) {
      console.error('Failed to update status:', err);
      alert(formatApiError(err, '상태 변경에 실패했습니다.'));
    }
  };

  const FILTERS: { key: FilterType; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'visited', label: '방문완료' },
    { key: 'cupping', label: '커핑완료' },
    { key: 'purchased', label: '구매완료' },
  ];

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Users className="w-6 h-6 text-emerald-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">거래처 관리</h1>
            </div>
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors font-medium"
            >
              <Plus size={20} />
              <span>거래처 추가</span>
            </button>
          </div>

          {/* Filter tabs + dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === f.key
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {f.label}
              </button>
            ))}
            <div className="ml-3 flex items-center gap-2">
              <FilterSelect
                value={statusFilter}
                onChange={(v) => setStatusFilter(v as ClientStatus | '')}
                placeholder="거래 상태"
                options={STATUSES.map((s) => ({ value: s, label: s }))}
              />
              <FilterSelect
                value={businessFilter}
                onChange={(v) => setBusinessFilter(v as ClientBusinessType | '')}
                placeholder="업종"
                options={BUSINESS_TYPES.map((b) => ({ value: b, label: b }))}
              />
              {(statusFilter || businessFilter) && (
                <button
                  onClick={() => { setStatusFilter(''); setBusinessFilter(''); }}
                  className="px-2 py-1 text-xs text-gray-500 hover:text-gray-800"
                >
                  필터 초기화
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64 text-gray-500">로딩 중...</div>
        ) : error ? (
          <div className="flex items-center justify-center h-64 text-red-500">{error}</div>
        ) : filteredClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <Users size={48} className="mb-4" />
            <p className="text-lg">등록된 거래처가 없습니다.</p>
            <button
              onClick={handleOpenAdd}
              className="mt-4 text-emerald-600 hover:text-emerald-700 font-medium"
            >
              + 새 거래처 추가
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wide">이름</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wide">담당자</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wide">연락처</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wide">업종/지역</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wide">거래 상태</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wide">방문</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wide">커핑</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wide">구매</th>
                    <th className="text-right px-3 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wide">누적 거래액</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wide">배정</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wide">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client) => (
                    <tr
                      key={client.id}
                      className="border-b border-gray-100 hover:bg-emerald-50/30 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{client.name}</td>
                      <td className="px-3 py-3 text-sm text-gray-700">{client.contactPerson || '—'}</td>
                      <td className="px-3 py-3 text-sm text-gray-700">
                        <div className="space-y-0.5">
                          {client.phone && <div>{client.phone}</div>}
                          {client.kakaoId && <div className="text-xs text-yellow-700">카 · {client.kakaoId}</div>}
                          {client.instagram && <div className="text-xs text-pink-600">@{client.instagram.replace(/^@/, '')}</div>}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-sm">
                        <div className="text-gray-700">{client.businessType || '—'}</div>
                        {client.region && <div className="text-xs text-gray-400">{client.region}</div>}
                      </td>
                      <td className="px-3 py-3">
                        <QuickStatusSelect
                          current={client.status}
                          onChange={(s) => handleQuickStatusChange(client, s)}
                        />
                      </td>
                      <td className="px-3 py-3 text-center">
                        <ToggleCheckbox
                          checked={client.visited}
                          onClick={() => handleToggleField(client, 'visited')}
                        />
                      </td>
                      <td className="px-3 py-3 text-center">
                        <ToggleCheckbox
                          checked={client.cuppingDone}
                          onClick={() => handleToggleField(client, 'cuppingDone')}
                        />
                      </td>
                      <td className="px-3 py-3 text-center">
                        <ToggleCheckbox
                          checked={client.purchased}
                          onClick={() => handleToggleField(client, 'purchased')}
                        />
                      </td>
                      <td className="px-3 py-3 text-sm text-right">
                        {client.totalOrderAmount > 0 ? (
                          <div>
                            <div className="text-gray-900 font-medium">
                              ₩{client.totalOrderAmount.toLocaleString()}
                            </div>
                            {client.monthlyVolumeKg > 0 && (
                              <div className="text-xs text-gray-400">
                                {client.monthlyVolumeKg}kg/월
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-700">
                        {client.assignedTo ? getUserDisplayName(client.assignedTo) : '—'}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(client)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="수정"
                          >
                            <Edit size={16} />
                          </button>
                          {deleteConfirmId === client.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDelete(client.id)}
                                className="p-1.5 text-white bg-red-500 hover:bg-red-600 rounded transition-colors"
                                title="삭제 확인"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="p-1.5 text-gray-400 hover:text-gray-600 rounded transition-colors"
                                title="취소"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(client.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="삭제"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedClient ? '거래처 수정' : '거래처 추가'}
        size="xl"
      >
        <ClientForm
          formData={formData}
          setFormData={setFormData}
          teamUsers={teamUsers}
          onSave={handleSave}
          onCancel={() => setIsModalOpen(false)}
          isEdit={!!selectedClient}
        />
      </Modal>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────

function ToggleCheckbox({ checked, onClick }: { checked: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-6 h-6 rounded border-2 flex items-center justify-center mx-auto transition-colors ${
        checked
          ? 'bg-emerald-500 border-emerald-500 text-white'
          : 'border-gray-300 hover:border-emerald-400'
      }`}
    >
      {checked && <Check size={14} />}
    </button>
  );
}

function QuickStatusSelect({ current, onChange }: { current: ClientStatus; onChange: (s: ClientStatus) => void }) {
  const s = STATUS_STYLES[current];
  return (
    <div className="relative inline-block">
      <select
        value={current}
        onChange={(e) => onChange(e.target.value as ClientStatus)}
        className={`appearance-none cursor-pointer pl-2.5 pr-7 py-1 text-xs font-medium rounded-full border-0 focus:outline-none focus:ring-2 focus:ring-emerald-300 ${s.bg} ${s.text}`}
      >
        {STATUSES.map((st) => (
          <option key={st} value={st}>{st}</option>
        ))}
      </select>
      <ChevronDown size={11} strokeWidth={2.5} className={`absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${s.text}`} />
    </div>
  );
}

function FilterSelect({ value, onChange, placeholder, options }: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none cursor-pointer pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  );
}

// ─── ClientForm modal body ─────────────────────────────────────────

interface ClientFormProps {
  formData: ClientFormData;
  setFormData: React.Dispatch<React.SetStateAction<ClientFormData>>;
  teamUsers: TeamUser[];
  onSave: () => void;
  onCancel: () => void;
  isEdit: boolean;
}

function ClientForm({ formData, setFormData, teamUsers, onSave, onCancel, isEdit }: ClientFormProps) {
  const update = <K extends keyof ClientFormData>(key: K, value: ClientFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };
  const input = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500';

  return (
    <div className="space-y-6">
      {/* 기본 정보 */}
      <Section title="기본 정보">
        <Grid>
          <Field label="거래처명" required>
            <input className={input} type="text" value={formData.name}
              onChange={(e) => update('name', e.target.value)} placeholder="거래처명" />
          </Field>
          <Field label="담당자">
            <input className={input} type="text" value={formData.contactPerson}
              onChange={(e) => update('contactPerson', e.target.value)} placeholder="담당자 이름" />
          </Field>
          <Field label="연락처">
            <input className={input} type="text" value={formData.phone}
              onChange={(e) => update('phone', e.target.value)} placeholder="010-0000-0000" />
          </Field>
          <Field label="이메일">
            <input className={input} type="email" value={formData.email}
              onChange={(e) => update('email', e.target.value)} placeholder="example@email.com" />
          </Field>
          <Field label="주소">
            <input className={input} type="text" value={formData.address}
              onChange={(e) => update('address', e.target.value)} placeholder="주소" />
          </Field>
          <Field label="담당자 배정">
            <select className={input} value={formData.assignedTo}
              onChange={(e) => update('assignedTo', e.target.value)}>
              <option value="">담당자 선택</option>
              {teamUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.title ? `${u.name} ${u.title}` : u.name}
                </option>
              ))}
            </select>
          </Field>
        </Grid>
      </Section>

      {/* A. 영업 관리 */}
      <Section title="영업 관리">
        <Grid>
          <Field label="카카오톡 ID">
            <input className={input} type="text" value={formData.kakaoId}
              onChange={(e) => update('kakaoId', e.target.value)} placeholder="카카오톡 ID" />
          </Field>
          <Field label="인스타그램">
            <input className={input} type="text" value={formData.instagram}
              onChange={(e) => update('instagram', e.target.value)} placeholder="@username" />
          </Field>
          <Field label="지역">
            <input className={input} type="text" value={formData.region}
              onChange={(e) => update('region', e.target.value)} placeholder="예: 부산, 서울" />
          </Field>
          <Field label="업종">
            <select className={input} value={formData.businessType}
              onChange={(e) => update('businessType', e.target.value as ClientBusinessType | '')}>
              <option value="">선택</option>
              {BUSINESS_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </Field>
          <Field label="거래 상태">
            <select className={input} value={formData.status}
              onChange={(e) => update('status', e.target.value as ClientStatus)}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="재연락 예정일">
            <input className={input} type="date" value={formData.followUpDate}
              onChange={(e) => update('followUpDate', e.target.value)} />
          </Field>
        </Grid>
      </Section>

      {/* B. 거래 추적 */}
      <Section title="거래 추적">
        <Grid>
          <Field label="첫 거래일">
            <input className={input} type="date" value={formData.firstOrderDate}
              onChange={(e) => update('firstOrderDate', e.target.value)} />
          </Field>
          <Field label="최근 거래일">
            <input className={input} type="date" value={formData.lastOrderDate}
              onChange={(e) => update('lastOrderDate', e.target.value)} />
          </Field>
          <Field label="누적 거래액 (원)">
            <input className={input} type="number" min="0" step="1000" value={formData.totalOrderAmount}
              onChange={(e) => update('totalOrderAmount', e.target.value)} />
          </Field>
          <Field label="월 평균 발주량 (KG)">
            <input className={input} type="number" min="0" step="0.1" value={formData.monthlyVolumeKg}
              onChange={(e) => update('monthlyVolumeKg', e.target.value)} />
          </Field>
        </Grid>
        <Field label="선호 품목 (쉼표로 구분)">
          <input className={input} type="text" value={formData.preferredItemsCsv}
            onChange={(e) => update('preferredItemsCsv', e.target.value)}
            placeholder="예: 에티오피아, 콜롬비아 디카페인, 드립백" />
        </Field>
      </Section>

      {/* C. B2B */}
      <Section title="청구 정보 (B2B)">
        <Grid>
          <Field label="사업자등록번호">
            <input className={input} type="text" value={formData.taxId}
              onChange={(e) => update('taxId', e.target.value)} placeholder="000-00-00000" />
          </Field>
          <Field label="세금계산서 이메일">
            <input className={input} type="email" value={formData.invoiceEmail}
              onChange={(e) => update('invoiceEmail', e.target.value)} placeholder="account@example.com" />
          </Field>
          <Field label="결제 조건">
            <select className={input} value={formData.paymentTerms}
              onChange={(e) => update('paymentTerms', e.target.value as ClientPaymentTerms | '')}>
              <option value="">선택</option>
              {PAYMENT_TERMS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
        </Grid>
        <Field label="배송지 주소 (본점과 다른 경우)">
          <input className={input} type="text" value={formData.shippingAddress}
            onChange={(e) => update('shippingAddress', e.target.value)} placeholder="배송지" />
        </Field>
      </Section>

      {/* 진행 체크 + 메모 */}
      <Section title="메모 & 진행 체크">
        <Field label="메모">
          <textarea className={`${input} resize-vertical`} rows={3} value={formData.notes}
            onChange={(e) => update('notes', e.target.value)} placeholder="메모" />
        </Field>
        <div className="flex flex-wrap gap-6 pt-1">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
            <input type="checkbox" checked={formData.visited}
              onChange={(e) => update('visited', e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500" />
            방문여부
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
            <input type="checkbox" checked={formData.cuppingDone}
              onChange={(e) => update('cuppingDone', e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500" />
            커핑진행
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
            <input type="checkbox" checked={formData.purchased}
              onChange={(e) => update('purchased', e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500" />
            구매여부
          </label>
        </div>
      </Section>

      <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
        <button onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg font-medium">
          취소
        </button>
        <button onClick={onSave} disabled={!formData.name.trim()}
          className="px-5 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 font-medium">
          {isEdit ? '수정' : '추가'}
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide border-b border-gray-100 pb-1.5">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>;
}
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
