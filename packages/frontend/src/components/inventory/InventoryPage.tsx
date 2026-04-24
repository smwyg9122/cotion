import React, { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Plus,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  ArrowUpCircle,
  ArrowDownCircle,
  X,
  Check,
} from 'lucide-react';
import { api } from '../../services/api';
import { Modal } from '../common/Modal';

interface InventoryPageProps {
  workspace: string;
}

interface InventoryItem {
  id: string;
  name: string;
  type: 'green' | 'roasted';
  origin: string;
  variety: string;
  currentStock: number;
  storageLocation: string;
  workspace: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Transaction {
  id: string;
  inventoryId: string;
  type: 'in' | 'out';
  quantity: number;
  note?: string;
  createdAt: string;
}

interface InventoryFormData {
  name: string;
  type: 'green' | 'roasted';
  origin: string;
  variety: string;
  currentStock: number;
  storageLocation: string;
}

const INITIAL_FORM: InventoryFormData = {
  name: '',
  type: 'green',
  origin: '',
  variety: '',
  currentStock: 0,
  storageLocation: '',
};

type FilterType = 'all' | 'green' | 'roasted';

export function InventoryPage({ workspace }: InventoryPageProps) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState<InventoryFormData>(INITIAL_FORM);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Transaction modal state
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<'in' | 'out'>('in');
  const [transactionQuantity, setTransactionQuantity] = useState<number>(0);
  const [transactionNote, setTransactionNote] = useState('');
  const [transactionItemId, setTransactionItemId] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get('/inventory', { params: { workspace } });
      setItems(response.data.data || []);
    } catch (err: any) {
      console.error('Failed to fetch inventory:', err);
      setError('재고 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [workspace]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const fetchTransactions = useCallback(async (itemId: string) => {
    setTransactionsLoading(true);
    try {
      const response = await api.get(`/inventory/${itemId}/transactions`);
      setTransactions(response.data.data || []);
    } catch (err: any) {
      console.error('Failed to fetch transactions:', err);
      setTransactions([]);
    } finally {
      setTransactionsLoading(false);
    }
  }, []);

  const handleToggleExpand = (itemId: string) => {
    if (expandedId === itemId) {
      setExpandedId(null);
      setTransactions([]);
    } else {
      setExpandedId(itemId);
      fetchTransactions(itemId);
    }
  };

  const filteredItems = items.filter((item) => {
    if (filter === 'all') return true;
    return item.type === filter;
  });

  const handleOpenAdd = () => {
    setSelectedItem(null);
    setFormData(INITIAL_FORM);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: InventoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedItem(item);
    setFormData({
      name: item.name,
      type: item.type,
      origin: item.origin,
      variety: item.variety,
      currentStock: item.currentStock,
      storageLocation: item.storageLocation,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;
    try {
      if (selectedItem) {
        await api.put(`/inventory/${selectedItem.id}`, formData);
      } else {
        await api.post('/inventory', { ...formData, workspace });
      }
      await fetchItems();
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Failed to save inventory item:', err);
      alert('재고 저장에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.delete(`/inventory/${id}`);
      setItems((prev) => prev.filter((i) => i.id !== id));
      setDeleteConfirmId(null);
      if (expandedId === id) setExpandedId(null);
    } catch (err: any) {
      console.error('Failed to delete inventory item:', err);
      alert('재고 삭제에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleOpenTransaction = (itemId: string, type: 'in' | 'out', e: React.MouseEvent) => {
    e.stopPropagation();
    setTransactionItemId(itemId);
    setTransactionType(type);
    setTransactionQuantity(0);
    setTransactionNote('');
    setIsTransactionModalOpen(true);
  };

  const handleSaveTransaction = async () => {
    if (!transactionItemId || transactionQuantity <= 0) return;
    try {
      await api.post(`/inventory/${transactionItemId}/transactions`, {
        type: transactionType,
        quantity: transactionQuantity,
        note: transactionNote,
      });
      await fetchItems();
      if (expandedId === transactionItemId) {
        await fetchTransactions(transactionItemId);
      }
      setIsTransactionModalOpen(false);
    } catch (err: any) {
      console.error('Failed to save transaction:', err);
      alert('입출고 처리에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const FILTERS: { key: FilterType; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'green', label: '생두' },
    { key: 'roasted', label: '원두' },
  ];

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Package className="w-6 h-6 text-amber-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">재고 관리</h1>
            </div>
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors font-medium"
            >
              <Plus size={20} />
              <span>재고 추가</span>
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
                    ? 'bg-amber-600 text-white'
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
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <Package size={48} className="mb-4" />
            <p className="text-lg">등록된 재고가 없습니다.</p>
            <button
              onClick={handleOpenAdd}
              className="mt-4 text-amber-600 hover:text-amber-700 font-medium"
            >
              + 새 재고 추가
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="w-8 px-4 py-3"></th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">품종명</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">종류</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">원산지</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">품종</th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700">현재재고(kg)</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">보관위치</th>
                    <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <React.Fragment key={item.id}>
                      <tr
                        onClick={() => handleToggleExpand(item.id)}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-3">
                          {expandedId === item.id ? (
                            <ChevronDown size={16} className="text-gray-400" />
                          ) : (
                            <ChevronRight size={16} className="text-gray-400" />
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.name}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                              item.type === 'green'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-orange-100 text-orange-700'
                            }`}
                          >
                            {item.type === 'green' ? '생두' : '원두'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{item.origin}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{item.variety}</td>
                        <td className="px-4 py-3 text-sm text-right font-mono font-medium text-gray-900">
                          {item.currentStock.toFixed(1)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{item.storageLocation}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={(e) => handleOpenTransaction(item.id, 'in', e)}
                              className="p-1.5 text-green-500 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
                              title="입고"
                            >
                              <ArrowDownCircle size={18} />
                            </button>
                            <button
                              onClick={(e) => handleOpenTransaction(item.id, 'out', e)}
                              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="출고"
                            >
                              <ArrowUpCircle size={18} />
                            </button>
                            <button
                              onClick={(e) => handleOpenEdit(item, e)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="수정"
                            >
                              <Edit size={16} />
                            </button>
                            {deleteConfirmId === item.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={(e) => handleDelete(item.id, e)}
                                  className="p-1.5 text-white bg-red-500 hover:bg-red-600 rounded transition-colors"
                                >
                                  <Check size={14} />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(null); }}
                                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded transition-colors"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(item.id); }}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="삭제"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {/* Expanded transactions */}
                      {expandedId === item.id && (
                        <tr>
                          <td colSpan={8} className="bg-gray-50 px-8 py-4">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3">입출고 내역</h4>
                            {transactionsLoading ? (
                              <div className="text-sm text-gray-400">로딩 중...</div>
                            ) : transactions.length === 0 ? (
                              <div className="text-sm text-gray-400">내역이 없습니다.</div>
                            ) : (
                              <div className="space-y-2">
                                {transactions.map((tx) => (
                                  <div
                                    key={tx.id}
                                    className="flex items-center gap-4 text-sm bg-white px-4 py-2 rounded-lg border border-gray-200"
                                  >
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                        tx.type === 'in'
                                          ? 'bg-green-100 text-green-700'
                                          : 'bg-red-100 text-red-700'
                                      }`}
                                    >
                                      {tx.type === 'in' ? '입고' : '출고'}
                                    </span>
                                    <span className="font-mono font-medium">
                                      {tx.type === 'in' ? '+' : '-'}{tx.quantity}kg
                                    </span>
                                    {tx.note && <span className="text-gray-500">{tx.note}</span>}
                                    <span className="text-gray-400 ml-auto">
                                      {new Date(tx.createdAt).toLocaleDateString('ko-KR')}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
        title={selectedItem ? '재고 수정' : '재고 추가'}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">품종명 *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="품종명"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">종류 *</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as 'green' | 'roasted' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="green">생두</option>
              <option value="roasted">원두</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">원산지</label>
            <input
              type="text"
              value={formData.origin}
              onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
              placeholder="예: 에티오피아"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">품종</label>
            <input
              type="text"
              value={formData.variety}
              onChange={(e) => setFormData({ ...formData, variety: e.target.value })}
              placeholder="예: 게이샤"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">현재 재고(kg)</label>
            <input
              type="number"
              value={formData.currentStock}
              onChange={(e) => setFormData({ ...formData, currentStock: parseFloat(e.target.value) || 0 })}
              min={0}
              step={0.1}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">보관위치</label>
            <input
              type="text"
              value={formData.storageLocation}
              onChange={(e) => setFormData({ ...formData, storageLocation: e.target.value })}
              placeholder="예: A동 1층 창고"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
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
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:bg-gray-300 transition-colors font-medium"
            >
              {selectedItem ? '수정' : '추가'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Transaction Modal */}
      <Modal
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        title={transactionType === 'in' ? '입고 처리' : '출고 처리'}
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">수량(kg) *</label>
            <input
              type="number"
              value={transactionQuantity}
              onChange={(e) => setTransactionQuantity(parseFloat(e.target.value) || 0)}
              min={0.1}
              step={0.1}
              placeholder="0.0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">메모</label>
            <input
              type="text"
              value={transactionNote}
              onChange={(e) => setTransactionNote(e.target.value)}
              placeholder="메모 (선택)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              onClick={() => setIsTransactionModalOpen(false)}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
            >
              취소
            </button>
            <button
              onClick={handleSaveTransaction}
              disabled={transactionQuantity <= 0}
              className={`px-4 py-2 text-white rounded-lg transition-colors font-medium disabled:bg-gray-300 ${
                transactionType === 'in'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {transactionType === 'in' ? '입고' : '출고'} 처리
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
