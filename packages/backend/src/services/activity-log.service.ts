import { db } from '../database/connection';

export class ActivityLogService {
  static async log(
    userId: string | null,
    action: string,
    targetType?: string,
    targetId?: string,
    details?: Record<string, any>
  ): Promise<void> {
    try {
      await db('activity_logs').insert({
        user_id: userId,
        action,
        target_type: targetType || null,
        target_id: targetId || null,
        details: details ? JSON.stringify(details) : null,
      });
    } catch (err) {
      console.error('Failed to log activity:', err);
      // Don't throw — logging should never break the main flow
    }
  }

  /**
   * Convenience: log a security-relevant event (ACL deny, CSRF block,
   * deactivated user attempt, etc). These are surfaced separately so an
   * admin dashboard / SIEM pipeline can filter for anomalies.
   *
   * Fire-and-forget — never awaited from the caller; we never want
   * logging to break the response path.
   */
  static security(
    userId: string | null,
    event:
      | 'acl_deny'
      | 'csrf_block'
      | 'deactivated_user_attempt'
      | 'ws_unauthorized'
      | 'workspace_member_added'
      | 'workspace_member_removed',
    details: Record<string, any> = {}
  ): void {
    this.log(userId, `security:${event}`, 'security', undefined, details).catch(() => {
      // already swallowed inside log(), but defensive
    });
  }
}
