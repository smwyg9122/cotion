import { db } from '../database/connection';
import { AppError } from '../middleware/error.middleware';
import { KakaoService } from './kakao.service';

export class NotificationsService {
  static async getNotifications(userId: string) {
    return db('notifications as n')
      .leftJoin('users as u', 'n.triggered_by', 'u.id')
      .where('n.user_id', userId)
      .orderBy('n.created_at', 'desc')
      .limit(50)
      .select(
        'n.id', 'n.type', 'n.message', 'n.page_id',
        'n.triggered_by', 'u.name as triggered_by_name',
        'n.is_read', 'n.created_at'
      );
  }

  static async getUnreadCount(userId: string): Promise<number> {
    const result = await db('notifications')
      .where({ user_id: userId, is_read: false })
      .count('id as count')
      .first();
    return Number(result?.count || 0);
  }

  static async createMention(
    mentionedUserId: string,
    pageId: string,
    triggeredByUserId: string
  ) {
    // Don't notify yourself
    if (mentionedUserId === triggeredByUserId) return null;

    const [triggerUser, page] = await Promise.all([
      db('users').where({ id: triggeredByUserId }).first(),
      db('pages').where({ id: pageId }).first(),
    ]);

    const message = `${triggerUser?.name || '누군가'}님이 "${page?.title || '페이지'}"에서 회원님을 멘션했습니다`;

    const [notification] = await db('notifications')
      .insert({
        user_id: mentionedUserId,
        type: 'mention',
        message,
        page_id: pageId,
        triggered_by: triggeredByUserId,
      })
      .returning('*');

    // 카카오톡 알림 발송 (비동기, 실패해도 DB 알림에는 영향 없음)
    const linkUrl = `https://cotion-ten.vercel.app`;
    KakaoService.notifyUsers(
      [mentionedUserId],
      '페이지 멘션',
      message,
      linkUrl
    );

    return notification;
  }

  static async markAsRead(notificationId: string, userId: string) {
    const updated = await db('notifications')
      .where({ id: notificationId, user_id: userId })
      .update({ is_read: true });

    if (!updated) {
      throw new AppError(404, 'NOT_FOUND', '알림을 찾을 수 없습니다');
    }
  }

  static async markAllAsRead(userId: string) {
    await db('notifications')
      .where({ user_id: userId, is_read: false })
      .update({ is_read: true });
  }
}
