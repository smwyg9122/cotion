import { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import { MessageCircle, Check, X, Send, RefreshCw } from 'lucide-react';

export function KakaoLinkButton() {
  const [isLinked, setIsLinked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testResultType, setTestResultType] = useState<'success' | 'error' | 'info'>('info');
  const [justLinked, setJustLinked] = useState(false); // 방금 연동 완료 애니메이션 용

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

  // Listen for OAuth callback via BroadcastChannel (primary) and postMessage (fallback)
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('kakao-auth');
      channel.onmessage = (event) => {
        if (event.data?.type === 'kakao-linked') {
          if (event.data.success) {
            setIsLinked(true);
            setJustLinked(true);
            showResult('카카오톡 연동이 완료되었습니다!', 'success', 5000);
            setTimeout(() => setJustLinked(false), 5000);
          } else {
            showResult('카카오톡 연동에 실패했습니다.', 'error', 5000);
          }
        }
      };
    } catch (_) {}

    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'kakao-callback') {
        if (event.data.success) {
          setIsLinked(true);
          setJustLinked(true);
          showResult('카카오톡 연동이 완료되었습니다!', 'success', 5000);
          setTimeout(() => setJustLinked(false), 5000);
        } else {
          showResult('카카오톡 연동에 실패했습니다.', 'error', 5000);
        }
      }
    };
    window.addEventListener('message', handler);

    return () => {
      channel?.close();
      window.removeEventListener('message', handler);
    };
  }, []);

  // 포커스 복귀 시 상태 재확인 (팝업 닫힌 후)
  useEffect(() => {
    const handleFocus = () => {
      // 팝업에서 돌아왔을 때 상태 재확인
      if (!isLinked) {
        checkStatus();
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isLinked, checkStatus]);

  function showResult(message: string, type: 'success' | 'error' | 'info', duration = 3000) {
    setTestResult(message);
    setTestResultType(type);
    setTimeout(() => setTestResult(null), duration);
  }

  const handleLink = async () => {
    try {
      const res = await api.get('/kakao/auth-url');
      const authUrl = res.data.data?.authUrl;
      if (authUrl) {
        const width = 480;
        const height = 600;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        const popup = window.open(authUrl, 'kakao-auth', `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`);
        if (!popup || popup.closed) {
          showResult('팝업이 차단되었습니다. 브라우저의 팝업 허용 설정을 확인해주세요.', 'error', 5000);
        }
      }
    } catch (err) {
      console.error('Failed to get Kakao auth URL:', err);
      showResult('연동 페이지를 열 수 없습니다.', 'error');
    }
  };

  const handleUnlink = async () => {
    if (!confirm('카카오톡 연동을 해제하시겠습니까?\n알림을 받을 수 없게 됩니다.')) return;
    try {
      await api.post('/kakao/unlink');
      setIsLinked(false);
      setJustLinked(false);
      showResult('연동이 해제되었습니다.', 'info');
    } catch (err) {
      console.error('Kakao unlink failed:', err);
      showResult('연동 해제에 실패했습니다.', 'error');
    }
  };

  const handleTest = async () => {
    try {
      showResult('발송 중...', 'info', 10000);
      const res = await api.post('/kakao/test');
      if (res.data.data?.sent) {
        showResult('테스트 메시지를 발송했습니다! 카카오톡을 확인하세요.', 'success', 5000);
      } else {
        showResult('발송 실패. 카카오 연동을 다시 시도해주세요.', 'error', 5000);
      }
    } catch (err) {
      console.error('Test message failed:', err);
      showResult('발송에 실패했습니다.', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <RefreshCw size={14} className="animate-spin" />
        <span>카카오톡 확인 중...</span>
      </div>
    );
  }

  const resultColors = {
    success: 'text-green-600 bg-green-50',
    error: 'text-red-600 bg-red-50',
    info: 'text-gray-500 bg-gray-50',
  };

  return (
    <div className="space-y-2">
      {isLinked ? (
        <div className={`space-y-2 ${justLinked ? 'animate-pulse' : ''}`}>
          {/* 연동 상태 뱃지 */}
          <div className="flex items-center gap-1.5 px-3 py-2 bg-green-50 border border-green-200/60 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
            <MessageCircle size={14} className="text-green-600 flex-shrink-0" />
            <span className="text-sm font-medium text-green-700 flex-1">카카오톡 연동됨</span>
          </div>
          {/* 액션 버튼 */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleTest}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded-md transition-colors font-medium"
            >
              <Send size={12} />
              테스트 발송
            </button>
            <button
              onClick={handleUnlink}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
            >
              <X size={12} />
              해제
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={handleLink}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FEE500] hover:bg-[#F5DC00] text-[#3C1E1E] rounded-lg text-sm font-semibold transition-colors shadow-sm"
        >
          <MessageCircle size={16} />
          카카오톡 연동하기
        </button>
      )}

      {/* 결과 메시지 */}
      {testResult && (
        <div className={`text-xs px-3 py-2 rounded-md ${resultColors[testResultType]}`}>
          {testResult}
        </div>
      )}
    </div>
  );
}
