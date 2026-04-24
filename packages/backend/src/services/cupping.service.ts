import { db } from '../database/connection';
import { AppError } from '../middleware/error.middleware';
import { API_ERRORS } from '@cotion/shared';
import { CuppingLog, CuppingLogCreateInput, CuppingLogUpdateInput } from '@cotion/shared';

// Helper function to transform snake_case DB columns to camelCase for API response
function mapCuppingLogToResponse(row: any): CuppingLog {
  return {
    id: row.id,
    visitDate: row.visit_date,
    clientId: row.client_id,
    roasteryName: row.roastery_name,
    contactPerson: row.contact_person,
    offeredBeans: row.offered_beans,
    reaction: row.reaction,
    purchaseIntent: row.purchase_intent,
    followupDate: row.followup_date,
    followupNotified: row.followup_notified,
    notes: row.notes,
    workspace: row.workspace,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCuppingLogsToResponse(rows: any[]): CuppingLog[] {
  return rows.map(mapCuppingLogToResponse);
}

interface CuppingFilters {
  clientId?: string;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
}

export class CuppingService {
  static async getAll(workspace: string, filters?: CuppingFilters): Promise<CuppingLog[]> {
    const query = db('cupping_logs')
      .where({ workspace })
      .orderBy('visit_date', 'desc')
      .select('*');

    if (filters?.clientId) {
      query.where('client_id', filters.clientId);
    }
    if (filters?.dateRange) {
      query.whereBetween('visit_date', [filters.dateRange.startDate, filters.dateRange.endDate]);
    }

    const rows = await query;
    return mapCuppingLogsToResponse(rows);
  }

  static async getById(id: string): Promise<CuppingLog | null> {
    const row = await db('cupping_logs')
      .where({ id })
      .first();

    return row ? mapCuppingLogToResponse(row) : null;
  }

  static async create(input: CuppingLogCreateInput, userId: string): Promise<CuppingLog> {
    const [row] = await db('cupping_logs')
      .insert({
        visit_date: input.visitDate,
        client_id: input.clientId || null,
        roastery_name: input.roasteryName,
        contact_person: input.contactPerson || null,
        offered_beans: input.offeredBeans || null,
        reaction: input.reaction || null,
        purchase_intent: input.purchaseIntent || null,
        followup_date: input.followupDate || null,
        followup_notified: input.followupNotified ?? false,
        notes: input.notes || null,
        workspace: input.workspace,
        created_by: userId,
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      })
      .returning('*');

    return mapCuppingLogToResponse(row);
  }

  static async update(id: string, input: CuppingLogUpdateInput): Promise<CuppingLog> {
    const existing = await db('cupping_logs')
      .where({ id })
      .first();

    if (!existing) {
      throw new AppError(404, API_ERRORS.NOT_FOUND, '커핑 로그를 찾을 수 없습니다');
    }

    const updateFields: any = { updated_at: db.fn.now() };
    if (input.visitDate !== undefined) updateFields.visit_date = input.visitDate;
    if (input.clientId !== undefined) updateFields.client_id = input.clientId;
    if (input.roasteryName !== undefined) updateFields.roastery_name = input.roasteryName;
    if (input.contactPerson !== undefined) updateFields.contact_person = input.contactPerson;
    if (input.offeredBeans !== undefined) updateFields.offered_beans = input.offeredBeans;
    if (input.reaction !== undefined) updateFields.reaction = input.reaction;
    if (input.purchaseIntent !== undefined) updateFields.purchase_intent = input.purchaseIntent;
    if (input.followupDate !== undefined) updateFields.followup_date = input.followupDate;
    if (input.followupNotified !== undefined) updateFields.followup_notified = input.followupNotified;
    if (input.notes !== undefined) updateFields.notes = input.notes;

    const [updatedRow] = await db('cupping_logs')
      .where({ id })
      .update(updateFields)
      .returning('*');

    return mapCuppingLogToResponse(updatedRow);
  }

  static async delete(id: string): Promise<void> {
    const existing = await db('cupping_logs')
      .where({ id })
      .first();

    if (!existing) {
      throw new AppError(404, API_ERRORS.NOT_FOUND, '커핑 로그를 찾을 수 없습니다');
    }

    await db('cupping_logs')
      .where({ id })
      .delete();
  }

  static async getDueFollowups(workspace: string): Promise<CuppingLog[]> {
    const today = new Date().toISOString().split('T')[0];

    const rows = await db('cupping_logs')
      .where({ workspace, followup_notified: false })
      .where('followup_date', '<=', today)
      .whereNotNull('followup_date')
      .orderBy('followup_date', 'asc')
      .select('*');

    return mapCuppingLogsToResponse(rows);
  }
}
