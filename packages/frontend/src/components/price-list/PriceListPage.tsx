import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Tag, Plus, Pencil, Trash2, Check, X, ChevronDown } from 'lucide-react';
import { api } from '../../services/api';
import { formatApiError } from '../../utils/apiError';
import { Modal } from '../common/Modal';
import type { PriceItem, PriceChannel } from '@cotion/shared';
import { PRICE_CHANNELS, CHANNEL_STYLES } from './constants';

interface PriceListPageProps {
  workspace: string;
}

interface PriceFormData {
  productName: string;
  channel: PriceChannel | '';
  unitLabel: string;
  price: string;
  note: string;
}

const INITIAL_FORM: PriceFormData = {
  productName: '',
  channel: '소매',
  unitLabel: '',
  price: '',
  note: '',
};

function formatWon(n: number): string {
  return `₩${n.toLocaleString()}`;
}

export function PriceListPage({ workspace }: PriceListPageProps) {
  const [items, setItems] = useState<PriceItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState<PriceItem | null>(null);
  const [formData, setFormData] = useState<PriceFormData>(INITIAL_FORM);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get('/price-items', { params: { workspace } });
      setItems(res.data.data || []);
    } catch (err: any) {
      console.error('Failed to fetch price items:', err);
      setError('단가표를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [workspace]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Group items by product, preserving server sort order.
  const grouped = useMemo(() => {
    const map = new Map<string, PriceItem[]>();
    for (const it of items) {
      if (!map.has(it.productName)) map.set(it.productName, []);
      map.get(it.productName)!.push(it);
    }
    return Array.from(map.entries());
  }, [items]);

  const existingProducts = useMemo(
    () => Array.from(new Set(items.map((i) => i.productName))).sort(),
    [items]
  );

  const handleOpenAdd = (presetProduct?: string) => {
    setSelected(null);
    setFormData({ ...INITIAL_FORM, productName: presetProduct || '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: PriceItem) => {
    setSelected(item);
    setFormData({
      productName: item.productName,
      channel: item.channel,
      unitLabel: item.unitLabel,
      price: item.price ? String(item.price) : '',
      note: item.note || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.productName.trim()) { alert('제품명을 입력하세요.'); return; }
    if (!formData.channel) { alert('판매 채널을 선택하세요.'); return; }
    if (!formData.unitLabel.trim()) { alert('단위를 입력하세요. (예: 1kg, 200g)'); return; }
    setSaving(true);
    try {
      const payload = {
        productName: formData.productName.trim(),
        channel: formData.channel,
        unitLabel: formData.unitLabel.trim(),
        price: formData.price ? Number(formData.price) : 0,
        note: formData.note.trim() || (selected ? null : undefined),
      };
      if (selected) {
        await api.put(`/price-items/${selected.id}`, payload, { params: { workspace } });
      } else {
        await api.post('/price-items', { ...payload, workspace });
      }
      setIsModalOpen(false);
      await fetchItems();
    } catch (err: any) {
      console.error('Failed to save price item:', err);
      alert(formatApiError(err, '단가 저장에 실패했습니다.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/price-items/${id}`, { params: { workspace } });
      setItems((prev) => prev.filter((i) => i.id !== id));
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Failed to delete price item:', err);
      alert(formatApiError(err, '삭제에 실패했습니다.'));
    }
  };

  const renderChannelBadge = (channel: PriceChannel) => {
    const s = CHANNEL_STYLES[channel];
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${s.bg} ${s.text}`}>
        {channel}
      </span>
    );
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Tag className="w-6 h-6 text-amber-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">아유타 커피 단가표</h1>
              <p className="text-sm text-gray-500 mt-0.5">제품별 판매가 (소매 · 네이버 · 도매)</p>
            </div>
          </div>
          <button
            onClick={() => handleOpenAdd()}
            className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors font-medium shadow-sm"
          >
            <Plus size={18} />
            <span>단가 추가</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64 text-gray-400">불러오는 중…</div>
        ) : error ? (
          <div className="flex items-center justify-center h-64 text-red-500">{error}</div>
        ) : grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <Tag size={48} className="mb-4" />
            <p className="text-lg">등록된 단가가 없습니다.</p>
            <button onClick={() => handleOpenAdd()} className="mt-4 text-amber-600 hover:text-amber-700 font-medium">
              + 첫 단가 추가
            </button>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-5">
            {grouped.map(([product, rows]) => (
              <div key={product} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200">
                  <h2 className="text-base font-bold text-gray-900">{product}</h2>
                  <button
                    onClick={() => handleOpenAdd(product)}
                    className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1"
                  >
                    <Plus size={13} /> 행 추가
                  </button>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="text-[11px] text-gray-500 uppercase tracking-wide border-b border-gray-100">
                      <th className="text-left px-5 py-2 font-semibold">채널</th>
                      <th className="text-left px-3 py-2 font-semibold">단위</th>
                      <th className="text-right px-3 py-2 font-semibold">가격</th>
                      <th className="text-left px-3 py-2 font-semibold">비고</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((item) => (
                      <tr key={item.id} className="border-b border-gray-50 last:border-0 hover:bg-amber-50/30 transition-colors">
                        <td className="px-5 py-2.5">{renderChannelBadge(item.channel)}</td>
                        <td className="px-3 py-2.5 text-sm text-gray-700">{item.unitLabel}</td>
                        <td className="px-3 py-2.5 text-sm text-right font-semibold text-gray-900">{formatWon(item.price)}</td>
                        <td className="px-3 py-2.5 text-xs text-gray-500">{item.note || ''}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEdit(item)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="수정"
                            >
                              <Pencil size={14} />
                            </button>
                            {deleteConfirmId === item.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleDelete(item.id)}
                                  className="p-1.5 text-white bg-red-500 hover:bg-red-600 rounded transition-colors"
                                  title="삭제 확인"
                                >
                                  <Check size={13} />
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded transition-colors"
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirmId(item.id)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="삭제"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selected ? '단가 수정' : '단가 추가'}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">제품명 *</label>
            <input
              type="text"
              list="price-products"
              value={formData.productName}
              onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
              placeholder="예: 생두, 드립, 에스프레소, 바닐라빈"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <datalist id="price-products">
              {existingProducts.map((p) => <option key={p} value={p} />)}
            </datalist>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">판매 채널 *</label>
            <div className="relative">
              <select
                value={formData.channel}
                onChange={(e) => setFormData({ ...formData, channel: e.target.value as PriceChannel })}
                className="appearance-none w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {PRICE_CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">단위 *</label>
              <input
                type="text"
                value={formData.unitLabel}
                onChange={(e) => setFormData({ ...formData, unitLabel: e.target.value })}
                placeholder="예: 1kg, 200g, 10kg 이상"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">가격 (원)</label>
              <input
                type="number"
                min="0"
                step="100"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="14000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">비고</label>
            <input
              type="text"
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              placeholder="예: 10kg 이상 시"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
            <button
              onClick={() => setIsModalOpen(false)}
              disabled={saving}
              className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg font-medium disabled:opacity-50"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !formData.productName.trim()}
              className="px-5 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:bg-gray-300 font-medium"
            >
              {saving ? '저장 중…' : selected ? '수정' : '추가'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
