import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';

export function KakaoCallbackPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      setStatus('error');
      setErrorMsg('카카오 인증이 취소되었습니다.');
      return;
    }

    if (!code) {
      setStatus('error');
      setErrorMsg('인증 코드가 없습니다.');
      return;
    }

    // Directly call the backend API from this popup window
    // (same domain, so localStorage auth token is available)
    api.post('/kakao/callback', { code })
      .then(() => {
        setStatus('success');

        // Notify parent window via BroadcastChannel
        try {
          const channel = new BroadcastChannel('kakao-auth');
          channel.postMessage({ type: 'kakao-linked', success: true });
          channel.close();
        } catch (e) {
          // BroadcastChannel not supported, try window.opener as fallback
          try {
            if (window.opener) {
              window.opener.postMessage({ type: 'kakao-callback', success: true }, window.location.origin);
            }
          } catch (_) {}
        }

        // Auto-close popup after short delay
        setTimeout(() => {
          window.close();
        }, 1500);
      })
      .catch((err) => {
        console.error('Kakao callback API failed:', err);
        setStatus('error');
        setErrorMsg(err.response?.data?.error || '연동에 실패했습니다. 다시 시도해주세요.');
      });
  }, [searchParams]);

  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="text-center p-8 bg-white rounded-xl shadow-sm border border-gray-200 max-w-sm mx-4">
        {status === 'processing' && (
          <>
            <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-700 font-medium">카카오톡 연동 처리 중...</p>
            <p className="text-sm text-gray-400 mt-2">잠시만 기다려주세요.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-green-700 font-medium">카카오톡 연동 완료!</p>
            <p className="text-sm text-gray-400 mt-2">이 창은 자동으로 닫힙니다.</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-red-700 font-medium">연동 실패</p>
            <p className="text-sm text-gray-500 mt-2">{errorMsg}</p>
            <button
              onClick={() => window.close()}
              className="mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition-colors"
            >
              닫기
            </button>
          </>
        )}
      </div>
    </div>
  );
}
