import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { useToast } from '../common';
import axios from 'axios';

interface PasswordChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PasswordChangeModal({ isOpen, onClose }: PasswordChangeModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('새 비밀번호가 일치하지 않습니다');
      return;
    }

    if (newPassword.length < 8) {
      setError('새 비밀번호는 최소 8자 이상이어야 합니다');
      return;
    }

    setIsLoading(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      await axios.post(
        `${API_URL}/auth/change-password`,
        { currentPassword, newPassword },
        { withCredentials: true }
      );

      showToast('비밀번호가 변경되었습니다', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onClose();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || '비밀번호 변경에 실패했습니다';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  }

  function handleClose() {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="비밀번호 변경" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="현재 비밀번호"
          type="password"
          placeholder="현재 비밀번호"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          error={error && error.includes('현재') ? error : ''}
          required
        />

        <Input
          label="새 비밀번호"
          type="password"
          placeholder="새 비밀번호 (최소 8자)"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          helperText="최소 8자 이상"
          required
        />

        <Input
          label="새 비밀번호 확인"
          type="password"
          placeholder="새 비밀번호 확인"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={error && !error.includes('현재') ? error : ''}
          required
        />

        <div className="flex gap-2 justify-end pt-2">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={isLoading}>
            취소
          </Button>
          <Button type="submit" isLoading={isLoading} disabled={isLoading}>
            변경
          </Button>
        </div>
      </form>
    </Modal>
  );
}
