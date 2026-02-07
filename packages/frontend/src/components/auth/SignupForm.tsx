import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../common';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { Alert } from '../common/Alert';

export function SignupForm() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      const errorMsg = '비밀번호는 최소 8자 이상이어야 합니다';
      setError(errorMsg);
      showToast(errorMsg, 'error');
      return;
    }

    setIsLoading(true);

    try {
      await signup({ username, email, password, name });
      showToast('회원가입이 완료되었습니다', 'success');
      navigate('/');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || '회원가입에 실패했습니다';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-xl p-8 space-y-6">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <img
                src="/logo.png"
                alt="Ayuta Coffee Logo"
                className="h-24 w-auto object-contain"
              />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Cotion</h1>
            <p className="text-gray-600 font-medium">Ayuta 전용 협업 문서 관리 시스템</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert type="error" message={error} onClose={() => setError('')} />
            )}

            <Input
              label="아이디"
              type="text"
              placeholder="ayuta4"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              helperText="영문, 숫자, _만 사용 가능 (3-50자)"
              required
            />

            <Input
              label="이름"
              type="text"
              placeholder="홍길동"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <Input
              label="이메일"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />

            <Input
              label="비밀번호"
              type="password"
              placeholder="최소 8자 이상"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              helperText="비밀번호는 최소 8자 이상이어야 합니다"
              required
            />

            <Button
              type="submit"
              className="w-full"
              isLoading={isLoading}
              disabled={isLoading}
            >
              회원가입
            </Button>
          </form>

          <div className="text-center pt-4 border-t border-gray-200">
            <Link
              to="/login"
              className="text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              이미 계정이 있으신가요? <span className="underline">로그인</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
