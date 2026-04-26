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
}
