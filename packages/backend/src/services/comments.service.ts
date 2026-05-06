import { db } from '../database/connection';
import { AppError } from '../middleware/error.middleware';
import { NotificationsService } from './notifications.service';

export class CommentsService {
  static async getCommentsByPage(pageId: string) {
    return db('comments')
      .join('users', 'comments.user_id', 'users.id')
      .where('comments.page_id', pageId)
      .orderBy('comments.created_at', 'asc')
      .select(
        'comments.id',
        'comments.page_id',
        'comments.user_id',
        'comments.content',
        'comments.created_at',
        'comments.updated_at',
        'users.name as user_name',
        'users.username'
      );
  }

  static async createComment(pageId: string, userId: string, content: string) {
    const [comment] = await db('comments')
      .insert({ page_id: pageId, user_id: userId, content })
      .returning('*');

    const [user, page] = await Promise.all([
      db('users').where({ id: userId }).first('name', 'username'),
      db('pages').where({ id: pageId }).first('title', 'created_by', 'workspace'),
    ]);

    const ws = page?.workspace || '';
    const notifiedUserIds = new Set<string>();

    // 페이지 작성자에게 댓글 알림 (자기 자신 제외)
    if (page?.created_by && page.created_by !== userId) {
      const msg = `[${ws}] ${user?.name || '누군가'}님이 "${page?.title || '페이지'}"에 댓글을 남겼습니다`;
      NotificationsService.createGeneral(
        page.created_by,
        userId,
        'comment',
        msg,
        `[${ws}] 새 댓글 알림`,
        pageId
      ).catch((err) => console.error('댓글 알림 발송 실패:', err));
      notifiedUserIds.add(page.created_by);
    }

    // 댓글 내 @멘션된 사용자에게도 알림 발송
    const mentionPattern = /@([^\s@]+)/g;
    let match;
    const mentionedNames: string[] = [];
    while ((match = mentionPattern.exec(content)) !== null) {
      mentionedNames.push(match[1]);
    }

    if (mentionedNames.length > 0) {
      const mentionedUsers = await db('users')
        .whereIn('name', mentionedNames)
        .select('id', 'name');

      for (const mu of mentionedUsers) {
        if (mu.id === userId || notifiedUserIds.has(mu.id)) continue;
        const mentionMsg = `[${ws}] ${user?.name || '누군가'}님이 "${page?.title || '페이지'}" 댓글에서 회원님을 멘션했습니다`;
        NotificationsService.createGeneral(
          mu.id,
          userId,
          'mention',
          mentionMsg,
          `[${ws}] 댓글 멘션`,
          pageId
        ).catch((err) => console.error('댓글 멘션 알림 실패:', err));
        notifiedUserIds.add(mu.id);
      }
    }

    return {
      ...comment,
      user_name: user?.name,
      username: user?.username,
    };
  }

  static async deleteComment(commentId: string, userId: string) {
    const comment = await db('comments').where({ id: commentId }).first();

    if (!comment) {
      throw new AppError(404, 'NOT_FOUND', '댓글을 찾을 수 없습니다');
    }

    if (comment.user_id !== userId) {
      throw new AppError(403, 'FORBIDDEN', '본인의 댓글만 삭제할 수 있습니다');
    }

    await db('comments').where({ id: commentId }).del();
  }
}
