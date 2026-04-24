import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import { MessageCircle, Check, X, Send } from 'lucide-react';

export function KakaoLinkButton() {
  const [isLinked, setIsLinked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [testResult, setTestResult] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    try {
      const res = await api.get('/kakao/status');
      setIsLinked(res.data.data?.linked || false);
    } catch (err) {
      console.error('Failed to check Kakao status:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Listen for OAuth callback message from popup
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'kakao-callback' && event.data?.code) {
        handleCallback(event.data.code);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const handleLink = async () => {
    try {
      const res = await api.get('/kakao/auth-url');
      const authUrl = res.data.data?.authUrl;
      if (authUrl) {
        // Open popup for Kakao OAuth
        const width = 500;
        const height = 600;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        window.open(authUrl, 'kakao-auth', `width=${width},height=${height},left=${left},top=${top}`);
      }
    } catch (err) {
      console.error('Failed to get Kakao auth URL:', err);
    }
  };

  const handleCallback = async (code: string) => {
    try {
      await api.post('/kakao/callback', { code });
      setIsLinked(true);
      setTestResult('카카오톡 연동 완료!');
      setTimeout(() => setTestResult(null), 3000);
    } catch (err) {
      console.error('Kakao callback failed:', err);
      setTestResult('연동 실패. 다시 시도해주세요.');
      setTimeout(() => setTestResult(null), 3000);
    }
  };

  const handleUnlink = async () => {
    if (!confirm('카카오톡 연동을 해제하시겠습니까? 알림을 받을 수 없게 됩니다.')) return;
    try {
      await api.post('/kakao/unlink');
      setIsLinked(false);
    } catch (err) {
      console.error('Kakao unlink failed:', err);
    }
  };

  const handleTest = async () => {
    try {
      setTestResult('발송 중...');
      const res = await api.post('/kakao/test');
      if (res.data.data?.sent) {
        setTestResult('테스트 메시지 발송 완료!');
      } else {
        setTestResult('발송 실패. 연동 상태를 확인해주세요.');
      }
      setTimeout(() => setTestResult(null), 3000);
    } catch (err) {
      console.error('Test message failed:', err);
      setTestResult('발송 실패');
      setTimeout(() => setTestResult(null), 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400">
        <MessageCircle size={16} />
        <span>확인 중...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {isLinked ? (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-medium">
            <Check size={14} />
            카카오톡 연동됨
          </span>
          <button
            onClick={handleTest}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
          >
            <Send size={12} />
            테스트 발송
          </button>
          <button
            onClick={handleUnlink}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-500 hover:bg-red-50 rounded-md transition-colors"
          >
            <X size={12} />
            연동 해제
          </button>
        </div>
      ) : (
        <button
          onClick={handleLink}
          className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-300 hover:bg-yellow-400 text-yellow-900 rounded-lg text-sm font-medium transition-colors"
        >
          <MessageCircle size={16} />
          카카오톡 연동하기
        </button>
      )}
      {testResult && (
        <span className="text-xs text-gray-500 ml-1">{testResult}</span>
      )}
    </div>
  );
}
