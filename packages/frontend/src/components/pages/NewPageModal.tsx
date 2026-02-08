import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { EmojiPicker } from '../common/EmojiPicker';

interface NewPageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, icon?: string, category?: string) => void;
  parentTitle?: string;
  existingCategories?: string[];
}

export function NewPageModal({ isOpen, onClose, onSubmit, parentTitle, existingCategories = [] }: NewPageModalProps) {
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState('');
  const [category, setCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setIcon('');
      setCategory('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim() && !isSubmitting) {
      setIsSubmitting(true);
      try {
        await onSubmit(title.trim(), icon || undefined, category.trim() || undefined);
        onClose();
      } catch (error) {
        console.error('Failed to create page:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={parentTitle ? `"${parentTitle}"에 페이지 추가` : '새 페이지 만들기'}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            아이콘 (선택사항)
          </label>
          <EmojiPicker
            selected={icon}
            onSelect={setIcon}
          />
        </div>

        <Input
          label="제목"
          placeholder="페이지 제목"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
          required
        />

        {!parentTitle && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              카테고리 (선택사항)
            </label>
            <input
              type="text"
              list="category-list"
              placeholder="예: 운영, 메뉴, 직원"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {existingCategories.length > 0 && (
              <datalist id="category-list">
                {existingCategories.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            )}
          </div>
        )}

        <div className="flex gap-2 justify-end pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
          >
            취소
          </Button>
          <Button
            type="submit"
            isLoading={isSubmitting}
            disabled={!title.trim()}
          >
            만들기
          </Button>
        </div>
      </form>
    </Modal>
  );
}
