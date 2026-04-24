import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export function KakaoCallbackPage() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    if (code && window.opener) {
      // Send code to parent window
      window.opener.postMessage({ type: 'kakao-callback', code }, window.location.origin);
      window.close();
    }
  }, [searchParams]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <p className="text-gray-600">카카오톡 인증 처리 중...</p>
        <p className="text-sm text-gray-400 mt-2">이 창은 자동으로 닫힙니다.</p>
      </div>
    </div>
  );
}
