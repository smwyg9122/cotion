import React from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './components/common';
import { LoginForm } from './components/auth/LoginForm';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { HomePage } from './pages/HomePage';
import { KakaoCallbackPage } from './pages/KakaoCallbackPage';
import { useAuth } from './hooks/useAuth';
import { usePushNotifications } from './hooks/usePushNotifications';

// 네이티브 앱(Capacitor)은 file:// 기반이라 HashRouter가 필요.
// 웹은 기존 URL·카카오 OAuth·SEO를 보존하기 위해 BrowserRouter를 그대로 유지한다.
const Router = Capacitor.isNativePlatform() ? HashRouter : BrowserRouter;

/** 로그인 상태에서 네이티브 푸시 토큰을 등록하는 부수효과 전용 컴포넌트 (웹에서는 무동작) */
function PushInit() {
  const { isAuthenticated } = useAuth();
  usePushNotifications(isAuthenticated);
  return null;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <PushInit />
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<LoginForm />} />
            <Route path="/signup" element={<Navigate to="/login" replace />} />
            <Route path="/auth/kakao/callback" element={<KakaoCallbackPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <HomePage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
