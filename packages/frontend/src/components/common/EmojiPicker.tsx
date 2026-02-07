import React, { useState } from 'react';
import { Smile } from 'lucide-react';

const EMOJI_CATEGORIES = {
  '자주 사용': ['📄', '📝', '📋', '📌', '📁', '🗂️', '📊', '📈'],
  '사물': ['💡', '🔧', '⚙️', '🔑', '🎯', '🎨', '🎭', '🎪'],
  '자연': ['🌟', '⭐', '🌙', '☀️', '🌈', '🔥', '💧', '🌱'],
  '기호': ['✅', '❌', '⚡', '💎', '🎁', '🏆', '🎖️', '🔔'],
};

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  selected?: string;
}

export function EmojiPicker({ onSelect, selected }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-12 h-12 text-2xl border-2 border-gray-300 rounded-lg hover:border-blue-500 transition-colors"
        title="아이콘 선택"
      >
        {selected || <Smile size={20} className="text-gray-400" />}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 top-14 z-20 bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-64">
            <div className="space-y-3">
              {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
                <div key={category}>
                  <h4 className="text-xs font-medium text-gray-500 mb-2">
                    {category}
                  </h4>
                  <div className="grid grid-cols-8 gap-1">
                    {emojis.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          onSelect(emoji);
                          setIsOpen(false);
                        }}
                        className={`
                          w-8 h-8 text-xl rounded hover:bg-gray-100 transition-colors
                          ${selected === emoji ? 'bg-blue-100 ring-2 ring-blue-500' : ''}
                        `}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                onSelect('');
                setIsOpen(false);
              }}
              className="mt-3 w-full px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded"
            >
              아이콘 제거
            </button>
          </div>
        </>
      )}
    </div>
  );
}
