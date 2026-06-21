import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // 스토어 고유 식별자 — 출시(Phase 4) 전 최종 확정. 등록 후에는 변경 불가.
  appId: 'com.cotion.app',
  appName: 'Cotion',
  // Vite 빌드 산출물 디렉토리 (vite build → dist)
  webDir: 'dist',
  server: {
    // Android는 https://localhost 로 서빙(secure context 확보). iOS는 capacitor://localhost 기본.
    androidScheme: 'https',
  },
};

export default config;
