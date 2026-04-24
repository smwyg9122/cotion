import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  Search,
  Filter,
} from 'lucide-react';
import { api } from '../../services/api';
import { Modal } from '../common/Modal';

interface ClientsPageProps {
  workspace: string;
}

interface Client {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  visited: boolean;
  cuppingDone: boolean;
  purchased: boolean;
  assigneeSlot: string;
  workspace: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ClientFormData {
  name: string;
  contactPerson: string;
  phone: string;
  visited: boolean;
  cuppingDone: boolean;
  purchased: boolean;
  assigneeSlot: string;
}

const INITIAL_FORM: ClientFormData = {
  name: '',
  contactPerson: '',
  phone: '',
  visited: false,
  cuppingDone: false,
  purchased: false,
  assigneeSlot: '',
};

type FilterType = 'all' | 'visited' | 'cupping' | 'purchased';

export function ClientsPage({ workspace }: ClientsPageProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState<ClientFormData>(INITIAL_FORM);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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

  const filteredClients = clients.filter((client) => {
    switch (filter) {
      case 'visited':
        return client.visited;
      case 'cupping':
        return client.cuppingDone;
      case 'purchased':
        return client.purchased;
      default:
        return true;
    }
  });

  const handleOpenAdd = () => {
    setSelectedClient(null);
    setFormData(INITIAL_FORM);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (client: Client) => {
    setSelectedClient(client);
    setFormData({
      name: client.name,
      contactPerson: client.contactPerson,
      phone: client.phone,
      visited: client.visited,
      cuppingDone: client.cuppingDone,
      purchased: client.purchased,
      assigneeSlot: client.assigneeSlot,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;
    try {
      if (selectedClient) {
        await api.put(`/clients/${selectedClient.id}`, formData);
      } else {
        await api.post('/clients', { ...formData, workspace });
      }
      await fetchClients();
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Failed to save client:', err);
      alert('거래처 저장에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/clients/${id}`);
      setClients((prev) => prev.filter((c) => c.id !== id));
      setDeleteConfirmId(null);
    } catch (err: any) {
      console.error('Failed to delete client:', err);
      alert('거래처 삭제에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleToggleField = async (client: Client, field: 'visited' | 'cuppingDone' | 'purchased') => {
    try {
      const updated = { ...client, [field]: !client[field] };
      await api.put(`/clients/${client.id}`, { [field]: !client[field] });
      setClients((prev) => prev.map((c) => (c.id === client.id ? { ...c, [field]: !c[field] } : c)));
    } catch (err: any) {
      console.error('Failed to update client:', err);
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

          {/* Filter tabs */}
          <div className="flex gap-2">
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
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">이름</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">담당자</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">연락처</th>
                    <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">방문여부</th>
                    <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">커핑진행</th>
                    <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">구매여부</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">담당자슬롯</th>
                    <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client) => (
                    <tr
                      key={client.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{client.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{client.contactPerson}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{client.phone}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggleField(client, 'visited')}
                          className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                            client.visited
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-gray-300 hover:border-emerald-400'
                          }`}
                        >
                          {client.visited && <Check size={14} />}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggleField(client, 'cuppingDone')}
                          className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                            client.cuppingDone
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-gray-300 hover:border-emerald-400'
                          }`}
                        >
                          {client.cuppingDone && <Check size={14} />}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggleField(client, 'purchased')}
                          className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                            client.purchased
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-gray-300 hover:border-emerald-400'
                          }`}
                        >
                          {client.purchased && <Check size={14} />}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{client.assigneeSlot}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
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
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">이름 *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="거래처명"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">담당자</label>
            <input
              type="text"
              value={formData.contactPerson}
              onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
              placeholder="담당자 이름"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">연락처</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="010-0000-0000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">담당자 슬롯</label>
            <input
              type="text"
              value={formData.assigneeSlot}
              onChange={(e) => setFormData({ ...formData, assigneeSlot: e.target.value })}
              placeholder="담당자 슬롯"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.visited}
                onChange={(e) => setFormData({ ...formData, visited: e.target.checked })}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-sm text-gray-700">방문여부</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.cuppingDone}
                onChange={(e) => setFormData({ ...formData, cuppingDone: e.target.checked })}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-sm text-gray-700">커핑진행</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.purchased}
                onChange={(e) => setFormData({ ...formData, purchased: e.target.checked })}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-sm text-gray-700">구매여부</span>
            </label>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={!formData.name.trim()}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 transition-colors font-medium"
            >
              {selectedClient ? '수정' : '추가'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
