import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getMessaging, Messaging } from 'firebase-admin/messaging';
import { db } from '../database/connection';

/**
 * FCM 푸시 알림 발송 서비스.
 *
 * 설계 원칙:
 * - Firebase 서비스 계정 키(FIREBASE_SERVICE_ACCOUNT)가 없으면 조용히 비활성화된다.
 *   키가 없어도 앱의 다른 기능(인앱 알림·카카오 알림)은 정상 동작한다.
 * - 발송은 fire-and-forget. 실패해도 호출부(알림 생성)에 영향을 주지 않는다
 *   (KakaoService.notifyUsers와 동일한 패턴).
 * - FCM이 "토큰 미등록/무효"로 응답하면 해당 device_token을 DB에서 정리한다.
 */

let messagingClient: Messaging | null = null;
let initialized = false;

/** Firebase Admin을 lazy 초기화한다. 키가 없으면 null을 반환(비활성화). */
function getMessagingClient(): Messaging | null {
  if (initialized) return messagingClient;
  initialized = true;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    console.warn('[push] FIREBASE_SERVICE_ACCOUNT 미설정 — 푸시 알림 비활성화 (인앱·카카오 알림은 정상)');
    return null;
  }

  try {
    const serviceAccount = JSON.parse(raw);
    const app = getApps().length ? getApp() : initializeApp({ credential: cert(serviceAccount) });
    messagingClient = getMessaging(app);
    console.log('[push] Firebase Admin 초기화 완료 — 푸시 알림 활성화');
    return messagingClient;
  } catch (err) {
    console.error('[push] Firebase 초기화 실패 (FIREBASE_SERVICE_ACCOUNT JSON 확인):', err);
    return null;
  }
}

export interface PushPayload {
  title: string;
  body: string;
  /** 알림 탭 시 앱이 라우팅에 사용할 데이터. FCM 제약상 값은 모두 문자열이어야 함. */
  data?: Record<string, string>;
}

export class PushService {
  /** 푸시가 설정되어 활성 상태인지 (테스트/상태 확인용) */
  static isEnabled(): boolean {
    return getMessagingClient() !== null;
  }

  /**
   * 여러 사용자의 모든 등록 기기로 푸시를 발송한다. fire-and-forget.
   * 무효 토큰은 발송 응답을 보고 DB에서 자동 삭제한다.
   */
  static async sendToUsers(userIds: string[], payload: PushPayload): Promise<void> {
    const m = getMessagingClient();
    if (!m) return;

    const uniqueUserIds = [...new Set(userIds)].filter(Boolean);
    if (uniqueUserIds.length === 0) return;

    const rows = await db('device_tokens').whereIn('user_id', uniqueUserIds).select('token');
    const tokens = rows.map((r: { token: string }) => r.token);
    if (tokens.length === 0) return;

    try {
      const res = await m.sendEachForMulticast({
        tokens,
        notification: { title: payload.title, body: payload.body },
        data: payload.data || {},
        android: { priority: 'high', notification: { sound: 'default' } },
        apns: { payload: { aps: { sound: 'default' } } },
      });

      // FCM이 무효라고 표시한 토큰을 정리한다 (앱 삭제·재설치·토큰 만료 등).
      const invalid: string[] = [];
      res.responses.forEach((r, i) => {
        if (!r.success) {
          const code = r.error?.code;
          if (
            code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-registration-token' ||
            code === 'messaging/invalid-argument'
          ) {
            invalid.push(tokens[i]);
          }
        }
      });
      if (invalid.length > 0) {
        await db('device_tokens').whereIn('token', invalid).del();
        console.log(`[push] 무효 토큰 ${invalid.length}건 정리`);
      }
    } catch (err) {
      console.error('[push] 발송 실패:', err);
    }
  }

  /** 단일 사용자 편의 래퍼 */
  static async sendToUser(userId: string, payload: PushPayload): Promise<void> {
    return PushService.sendToUsers([userId], payload);
  }

  /** 로그인한 기기의 FCM 토큰을 등록(또는 갱신)한다. token 기준 upsert. */
  static async registerToken(userId: string, token: string, platform: string): Promise<void> {
    await db('device_tokens')
      .insert({ user_id: userId, token, platform, last_used_at: db.fn.now() })
      .onConflict('token')
      .merge({ user_id: userId, platform, last_used_at: db.fn.now() });
  }

  /** 로그아웃 등으로 기기 토큰을 해제한다. */
  static async unregisterToken(token: string): Promise<void> {
    await db('device_tokens').where({ token }).del();
  }
}
