import { db } from '../database/connection';

const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY || '6908ec2b32acc25f79212e05f7bf375b';
const KAKAO_REDIRECT_URI = process.env.KAKAO_REDIRECT_URI || 'https://cotion-ten.vercel.app/auth/kakao/callback';

export class KakaoService {
  // Get OAuth URL for user to link their Kakao account
  static getAuthUrl(state: string): string {
    return `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_REST_API_KEY}&redirect_uri=${encodeURIComponent(KAKAO_REDIRECT_URI)}&response_type=code&scope=talk_message&state=${state}`;
  }

  // Exchange authorization code for tokens
  static async exchangeCode(code: string): Promise<{ access_token: string; refresh_token: string; expires_in: number; kakao_user_id?: string }> {
    const response = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: KAKAO_REST_API_KEY,
        redirect_uri: KAKAO_REDIRECT_URI,
        code,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Kakao token exchange failed:', error);
      throw new Error('카카오 인증에 실패했습니다');
    }

    const data: any = await response.json();

    // Get Kakao user info
    let kakao_user_id: string | undefined;
    try {
      const userRes = await fetch('https://kapi.kakao.com/v2/user/me', {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      if (userRes.ok) {
        const userData: any = await userRes.json();
        kakao_user_id = String(userData.id);
      }
    } catch (e) {
      console.error('Failed to get Kakao user info:', e);
    }

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      kakao_user_id,
    };
  }

  // Store tokens for a user
  static async storeTokens(userId: string, accessToken: string, refreshToken: string, expiresIn: number, kakaoUserId?: string): Promise<void> {
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Upsert - delete existing then insert
    await db('kakao_tokens').where({ user_id: userId }).delete();
    await db('kakao_tokens').insert({
      user_id: userId,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      kakao_user_id: kakaoUserId || null,
      updated_at: db.fn.now(),
    });
  }

  // Refresh access token if expired
  static async refreshAccessToken(userId: string): Promise<string | null> {
    const token = await db('kakao_tokens').where({ user_id: userId }).first();
    if (!token) return null;

    // If not expired, return existing
    if (new Date(token.expires_at) > new Date()) {
      return token.access_token;
    }

    // Refresh
    try {
      const response = await fetch('https://kauth.kakao.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: KAKAO_REST_API_KEY,
          refresh_token: token.refresh_token,
        }),
      });

      if (!response.ok) {
        console.error('Kakao token refresh failed');
        // Delete invalid tokens
        await db('kakao_tokens').where({ user_id: userId }).delete();
        return null;
      }

      const data: any = await response.json();
      const expiresAt = new Date(Date.now() + data.expires_in * 1000);

      const updateFields: any = {
        access_token: data.access_token,
        expires_at: expiresAt,
        updated_at: db.fn.now(),
      };
      // Kakao may return a new refresh token
      if (data.refresh_token) {
        updateFields.refresh_token = data.refresh_token;
      }

      await db('kakao_tokens').where({ user_id: userId }).update(updateFields);
      return data.access_token;
    } catch (e) {
      console.error('Kakao refresh error:', e);
      return null;
    }
  }

  // Send "나에게 보내기" message to a user
  static async sendMessage(userId: string, title: string, description: string, linkUrl?: string): Promise<boolean> {
    const accessToken = await this.refreshAccessToken(userId);
    if (!accessToken) {
      console.log(`No Kakao token for user ${userId}, skipping notification`);
      return false;
    }

    const templateObject = {
      object_type: 'text',
      text: `[Cotion] ${title}\n${description}`,
      link: {
        web_url: linkUrl || 'https://cotion-ten.vercel.app',
        mobile_web_url: linkUrl || 'https://cotion-ten.vercel.app',
      },
      button_title: '코션에서 확인',
    };

    try {
      const response = await fetch('https://kapi.kakao.com/v2/api/talk/memo/default/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Bearer ${accessToken}`,
        },
        body: new URLSearchParams({
          template_object: JSON.stringify(templateObject),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`Kakao message send failed for user ${userId}:`, error);
        return false;
      }

      console.log(`✅ Kakao message sent to user ${userId}`);
      return true;
    } catch (e) {
      console.error(`Kakao message error for user ${userId}:`, e);
      return false;
    }
  }

  // Send notification to multiple users (non-blocking)
  static async notifyUsers(userIds: string[], title: string, description: string, linkUrl?: string): Promise<void> {
    // Fire-and-forget, don't block the main request
    Promise.allSettled(
      userIds.map((userId) => this.sendMessage(userId, title, description, linkUrl))
    ).then((results) => {
      const sent = results.filter((r) => r.status === 'fulfilled' && r.value).length;
      console.log(`Kakao notifications: ${sent}/${userIds.length} sent`);
    });
  }

  // Check if user has linked Kakao
  static async isLinked(userId: string): Promise<boolean> {
    const token = await db('kakao_tokens').where({ user_id: userId }).first();
    return !!token;
  }

  // Unlink user's Kakao
  static async unlink(userId: string): Promise<void> {
    await db('kakao_tokens').where({ user_id: userId }).delete();
  }
}
