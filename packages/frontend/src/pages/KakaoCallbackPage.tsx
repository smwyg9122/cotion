import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * 카카오 OAuth 콜백 페이지
 *
 * 이 페이지는 팝업 창에서 실행됩니다.
 * 중요: 메인 앱의 `api` 인스턴스를 사용하지 않습니다.
 * → api interceptor가 401 시 /login으로 리다이렉트하여 팝업이 빈 화면이 되는 문제 방지
 * → 별도 axios 인스턴스로 직접 호출합니다.
 */
export function KakaoCallbackPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    handleKakaoCallback();
  }, []);

  async function handleKakaoCallback() {
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // 사용자가 동의를 취소한 경우
    if (error) {
      setStatus('error');
      setErrorMsg(errorDescription || '카카오 인증이 취소되었습니다.');
      return;
    }

    // 코드가 없는 경우
    if (!code) {
      setStatus('error');
      setErrorMsg('인증 코드를 받지 못했습니다.');
      return;
    }

    // localStorage에서 토큰 직접 가져오기 (같은 도메인이므로 접근 가능)
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setStatus('error');
      setErrorMsg('로그인 세션이 만료되었습니다. 메인 창에서 다시 로그인해주세요.');
      return;
    }

    try {
      // 별도 axios 호출 — interceptor 우회
      await axios.post(
        `${API_URL}/kakao/callback`,
        { code },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setStatus('success');

      // 부모 창에 연동 완료 알림 (BroadcastChannel 우선, postMessage 폴백)
      notifyParent(true);

      // 자동 닫기
      setTimeout(() => {
        window.close();
      }, 2000);
    } catch (err: any) {
      console.error('Kakao callback failed:', err);

      let message = '연동에 실패했습니다.';
      if (err.response) {
        const status = err.response.status;
        const serverError = err.response.data?.error || err.response.data?.message;
        if (status === 401) {
          message = '로그인 세션이 만료되었습니다. 메인 창에서 다시 로그인 후 시도해주세요.';
        } else if (status === 400) {
          message = serverError || '인증 코드가 유효하지 않습니다. 다시 시도해주세요.';
        } else if (serverError) {
          message = serverError;
        } else {
          message = `서버 오류가 발생했습니다. (${status})`;
        }
      } else if (err.code === 'ERR_NETWORK') {
        message = '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.';
      }

      setStatus('error');
      setErrorMsg(message);

      // 실패해도 부모에게 알림 (상태 갱신 위해)
      notifyParent(false);
    }
  }

  function notifyParent(success: boolean) {
    // BroadcastChannel (크로스 도메인 팝업에서도 작동)
    try {
      const channel = new BroadcastChannel('kakao-auth');
      channel.postMessage({ type: 'kakao-linked', success });
      channel.close();
    } catch (_) {}

    // window.opener 폴백
    try {
      if (window.opener) {
        window.opener.postMessage(
          { type: 'kakao-callback', success },
          window.location.origin
        );
      }
    } catch (_) {}
  }

  function handleRetry() {
    setStatus('processing');
    setErrorMsg('');
    handleKakaoCallback();
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-yellow-50 to-white">
      <div className="text-center p-8 bg-white rounded-2xl shadow-lg border border-gray-100 max-w-sm mx-4 w-full">
        {/* 카카오 로고/아이콘 */}
        <div className="mb-6">
          <div className="w-16 h-16 bg-yellow-300 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <svg viewBox="0 0 24 24" className="w-9 h-9" fill="#3C1E1E">
              <path d="M12 3C6.48 3 2 6.58 2 10.94c0 2.8 1.86 5.27 4.66 6.67-.15.53-.96 3.4-.99 3.63 0 0-.02.17.09.24.11.06.24.01.24.01.32-.04 3.7-2.44 4.28-2.86.56.08 1.14.12 1.72.12 5.52 0 10-3.58 10-7.81C22 6.58 17.52 3 12 3z" />
            </svg>
          </div>
        </div>

        {status === 'processing' && (
          <>
            <div className="w-8 h-8 border-3 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-800 font-semibold text-lg">카카오톡 연동 중</p>
            <p className="text-sm text-gray-400 mt-2">잠시만 기다려주세요...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-[bounceIn_0.5s_ease-out]">
              <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-green-700 font-semibold text-lg">연동 완료!</p>
            <p className="text-sm text-gray-500 mt-2">카카오톡으로 알림을 받을 수 있습니다.</p>
            <p className="text-xs text-gray-400 mt-4">이 창은 자동으로 닫힙니다...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
              </svg>
            </div>
            <p className="text-red-700 font-semibold text-lg">연동 실패</p>
            <p className="text-sm text-gray-600 mt-2 leading-relaxed">{errorMsg}</p>
            <div className="flex gap-2 mt-6 justify-center">
              <button
                onClick={handleRetry}
                className="px-5 py-2.5 bg-yellow-300 hover:bg-yellow-400 text-yellow-900 rounded-lg text-sm font-medium transition-colors"
              >
                다시 시도
              </button>
              <button
                onClick={() => window.close()}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition-colors"
              >
                닫기
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
