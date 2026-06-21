import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { api } from '../services/api';

/**
 * 네이티브 앱(Capacitor)에서 FCM 푸시 권한을 요청하고
 * 디바이스 토큰을 백엔드(/devices/register)에 등록한다.
 *
 * - 웹에서는 아무 동작도 하지 않는다 (Capacitor.isNativePlatform() === false).
 * - @capacitor/push-notifications는 동적 import라 웹 번들에 포함되지 않는다.
 * - 등록된 토큰은 localStorage('fcmToken')에 저장해 로그아웃 시 해제에 사용한다.
 */
export function usePushNotifications(isAuthenticated: boolean) {
  const setupRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!Capacitor.isNativePlatform()) return;
    if (setupRef.current) return;
    setupRef.current = true;

    const listeners: Array<{ remove: () => void }> = [];

    (async () => {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');

        let perm = await PushNotifications.checkPermissions();
        if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
          perm = await PushNotifications.requestPermissions();
        }
        if (perm.receive !== 'granted') {
          console.warn('[push] 알림 권한이 허용되지 않았습니다');
          return;
        }

        // OS에 디바이스 등록 → 'registration' 이벤트로 FCM 토큰 수신
        await PushNotifications.register();

        listeners.push(
          await PushNotifications.addListener('registration', async (token) => {
            try {
              await api.post('/devices/register', {
                token: token.value,
                platform: Capacitor.getPlatform(),
              });
              localStorage.setItem('fcmToken', token.value);
            } catch (e) {
              console.error('[push] 토큰 등록 실패', e);
            }
          })
        );

        listeners.push(
          await PushNotifications.addListener('registrationError', (err) => {
            console.error('[push] 등록 에러', err);
          })
        );

        // 알림 탭 시 앱 포그라운드 전환(기본 동작). 추후 pageId 딥링크 정교화 가능.
        listeners.push(
          await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
            const data = action.notification.data as Record<string, string> | undefined;
            if (data?.pageId) {
              window.location.hash = '#/';
            }
          })
        );
      } catch (e) {
        console.error('[push] 초기화 실패', e);
      }
    })();

    return () => {
      listeners.forEach((l) => l.remove());
      setupRef.current = false;
    };
  }, [isAuthenticated]);
}
