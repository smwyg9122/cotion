import React, { useState } from 'react';
import { api } from '../../services/api';

interface NicknameModalProps {
  isOpen: boolean;
  currentName: string;
  onComplete: (newName: string) => void;
}

export function NicknameModal({ isOpen, currentName, onComplete }: NicknameModalProps) {
  const [nickname, setNickname] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (nickname.trim().length < 2) {
      setError('닉네임은 최소 2자 이상이어야 합니다');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await api.put('/auth/me', { name: nickname.trim() });
      onComplete(nickname.trim());
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '닉네임 설정에 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
        <h2 className="text-lg font-bold text-gray-900 mb-1">닉네임 설정</h2>
        <p className="text-sm text-gray-500 mb-4">다른 멤버들이 @태그할 때 사용할 닉네임을 설정하세요</p>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-3 p-2 bg-red-50 text-red-600 text-sm rounded-md">{error}</div>
          )}

          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="닉네임을 입력하세요"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
            autoFocus
          />

          <button
            type="submit"
            disabled={isLoading || nickname.trim().length < 2}
            className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
          >
            {isLoading ? '설정 중...' : '설정 완료'}
          </button>
        </form>
      </div>
    </div>
  );
}
