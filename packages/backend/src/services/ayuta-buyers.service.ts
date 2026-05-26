import { db } from '../database/connection';
import { AppError } from '../middleware/error.middleware';
import {
  API_ERRORS,
  AyutaBuyer,
  AyutaBuyerCreateInput,
  AyutaBuyerUpdateInput,
  BuyerInterestItem,
  BuyerStatus,
  BuyerInterestLevel,
  BuyerBusinessType,
  BuyerSize,
  BuyerSource,
} from '@cotion/shared';

function parseInterestItems(value: unknown): BuyerInterestItem[] {
  if (Array.isArray(value)) return value as BuyerInterestItem[];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as BuyerInterestItem[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === 'string' ? parseFloat(value) : (value as number);
  return isNaN(n) ? 0 : n;
}

function toDateString(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value);
}

function mapRowToBuyer(row: any): AyutaBuyer {
  return {
    id: row.id,
    companyName: row.company_name,
    contactPerson: row.contact_person,
    phone: row.phone,
    email: row.email,
    kakaoId: row.kakao_id,
    instagram: row.instagram,
    region: row.region,
    address: row.address,
    businessType: row.business_type as BuyerBusinessType | null,
    size: row.size as BuyerSize | null,
    source: row.source as BuyerSource | null,
    interestItems: parseInterestItems(row.interest_items),
    interestProducts: row.interest_products,
    monthlyVolume: row.monthly_volume,
    sampleSent: row.sample_sent,
    cuppingDone: row.cupping_done,
    status: row.status as BuyerStatus,
    interestLevel: row.interest_level as BuyerInterestLevel,
    lastContactDate: toDateString(row.last_contact_date),
    nextAction: row.next_action,
    followUpDate: toDateString(row.follow_up_date),
    firstOrderDate: toDateString(row.first_order_date),
    lastOrderDate: toDateString(row.last_order_date),
    totalPurchaseAmount: toNumber(row.total_purchase_amount),
    totalPurchaseKg: toNumber(row.total_purchase_kg),
    repeatCount: row.repeat_count ?? 0,
    notes: row.notes,
    workspace: row.workspace,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowsToBuyers(rows: any[]): AyutaBuyer[] {
  return rows.map(mapRowToBuyer);
}

interface BuyerFilters {
  status?: string;
  region?: string;
  businessType?: string;
  interestLevel?: string;
  search?: string;
}

const SEARCH_MAX_LEN = 100;

// Escape PostgreSQL ILIKE wildcards so a search like "50%" matches literally.
function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, '\\$&');
}

export class AyutaBuyersService {
  static async getAll(
    workspace: string,
    filters?: BuyerFilters
  ): Promise<AyutaBuyer[]> {
    const query = db('ayuta_buyers')
      .where('workspace', workspace)
      .orderBy('updated_at', 'desc');

    if (filters?.status) query.where('status', filters.status);
    if (filters?.region) query.where('region', filters.region);
    if (filters?.businessType) query.where('business_type', filters.businessType);
    if (filters?.interestLevel) query.where('interest_level', filters.interestLevel);

    if (filters?.search) {
      const raw = filters.search.slice(0, SEARCH_MAX_LEN);
      const term = `%${escapeLike(raw)}%`;
      query.where((qb) => {
        qb.where('company_name', 'ilike', term)
          .orWhere('contact_person', 'ilike', term)
          .orWhere('phone', 'ilike', term)
          .orWhere('instagram', 'ilike', term)
          .orWhere('notes', 'ilike', term);
      });
    }

    const rows = await query.select('*');
    return mapRowsToBuyers(rows);
  }

  // workspace enforces tenant isolation. Internal callers (re-fetch after
  // mutation) may pass undefined, but every external entry point (controller)
  // must provide it — see ayuta-buyers.controller.ts.
  static async getById(id: string, workspace?: string): Promise<AyutaBuyer | null> {
    const q = db('ayuta_buyers').where({ id });
    if (workspace) q.andWhere({ workspace });
    const row = await q.first();
    return row ? mapRowToBuyer(row) : null;
  }

  static async create(
    input: AyutaBuyerCreateInput,
    userId: string
  ): Promise<AyutaBuyer> {
    const [row] = await db('ayuta_buyers')
      .insert({
        company_name: input.companyName,
        contact_person: input.contactPerson || null,
        phone: input.phone || null,
        email: input.email || null,
        kakao_id: input.kakaoId || null,
        instagram: input.instagram || null,
        region: input.region || null,
        address: input.address || null,
        business_type: input.businessType || null,
        size: input.size || null,
        source: input.source || null,
        interest_items: JSON.stringify(input.interestItems ?? []),
        interest_products: input.interestProducts || null,
        monthly_volume: input.monthlyVolume || null,
        sample_sent: input.sampleSent ?? false,
        cupping_done: input.cuppingDone ?? false,
        status: input.status ?? '신규문의',
        interest_level: input.interestLevel ?? 'medium',
        last_contact_date: input.lastContactDate || null,
        next_action: input.nextAction || null,
        follow_up_date: input.followUpDate || null,
        first_order_date: input.firstOrderDate || null,
        last_order_date: input.lastOrderDate || null,
        total_purchase_amount: input.totalPurchaseAmount ?? 0,
        total_purchase_kg: input.totalPurchaseKg ?? 0,
        repeat_count: input.repeatCount ?? 0,
        notes: input.notes || null,
        workspace: input.workspace,
        created_by: userId,
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      })
      .returning('*');

    return mapRowToBuyer(row);
  }

  static async update(
    id: string,
    input: AyutaBuyerUpdateInput,
    workspace?: string
  ): Promise<AyutaBuyer> {
    const q = db('ayuta_buyers').where({ id });
    if (workspace) q.andWhere({ workspace });
    const existing = await q.first();
    if (!existing) {
      throw new AppError(404, API_ERRORS.NOT_FOUND, '구매처를 찾을 수 없습니다');
    }

    const update: any = { updated_at: db.fn.now() };

    if (input.companyName !== undefined) update.company_name = input.companyName;
    if (input.contactPerson !== undefined) update.contact_person = input.contactPerson;
    if (input.phone !== undefined) update.phone = input.phone;
    if (input.email !== undefined) update.email = input.email;
    if (input.kakaoId !== undefined) update.kakao_id = input.kakaoId;
    if (input.instagram !== undefined) update.instagram = input.instagram;
    if (input.region !== undefined) update.region = input.region;
    if (input.address !== undefined) update.address = input.address;
    if (input.businessType !== undefined) update.business_type = input.businessType;
    if (input.size !== undefined) update.size = input.size;
    if (input.source !== undefined) update.source = input.source;

    if (input.interestItems !== undefined)
      update.interest_items = JSON.stringify(input.interestItems);
    if (input.interestProducts !== undefined) update.interest_products = input.interestProducts;
    if (input.monthlyVolume !== undefined) update.monthly_volume = input.monthlyVolume;
    if (input.sampleSent !== undefined) update.sample_sent = input.sampleSent;
    if (input.cuppingDone !== undefined) update.cupping_done = input.cuppingDone;

    if (input.status !== undefined) update.status = input.status;
    if (input.interestLevel !== undefined) update.interest_level = input.interestLevel;
    if (input.lastContactDate !== undefined) update.last_contact_date = input.lastContactDate;
    if (input.nextAction !== undefined) update.next_action = input.nextAction;
    if (input.followUpDate !== undefined) update.follow_up_date = input.followUpDate;

    if (input.firstOrderDate !== undefined) update.first_order_date = input.firstOrderDate;
    if (input.lastOrderDate !== undefined) update.last_order_date = input.lastOrderDate;
    if (input.totalPurchaseAmount !== undefined)
      update.total_purchase_amount = input.totalPurchaseAmount;
    if (input.totalPurchaseKg !== undefined) update.total_purchase_kg = input.totalPurchaseKg;
    if (input.repeatCount !== undefined) update.repeat_count = input.repeatCount;

    if (input.notes !== undefined) update.notes = input.notes;

    // Scope the actual UPDATE by workspace too (defense-in-depth: TOCTOU-safe
    // even if the row's workspace was changed between the existence check and
    // the write).
    const writeQuery = db('ayuta_buyers').where({ id });
    if (workspace) writeQuery.andWhere({ workspace });
    await writeQuery.update(update);

    const buyer = await this.getById(id, workspace);
    return buyer!;
  }

  static async delete(id: string, workspace?: string): Promise<void> {
    const q = db('ayuta_buyers').where({ id });
    if (workspace) q.andWhere({ workspace });
    const existing = await q.first();
    if (!existing) {
      throw new AppError(404, API_ERRORS.NOT_FOUND, '구매처를 찾을 수 없습니다');
    }
    const deleteQuery = db('ayuta_buyers').where({ id });
    if (workspace) deleteQuery.andWhere({ workspace });
    await deleteQuery.delete();
  }

  static async getStats(workspace: string): Promise<{
    todayFollowUp: number;
    purchased: number;
    leads: number;
    newThisMonth: number;
  }> {
    // Compare boundaries in Asia/Seoul so "today" and "this month" align with
    // KST business hours, not UTC midnight.
    const kstToday = db.raw("(now() AT TIME ZONE 'Asia/Seoul')::date");
    const kstMonthStart = db.raw(
      "(date_trunc('month', now() AT TIME ZONE 'Asia/Seoul')) AT TIME ZONE 'Asia/Seoul'"
    );

    const [todayFollowUpRow] = await db('ayuta_buyers')
      .where('workspace', workspace)
      .andWhere('follow_up_date', kstToday)
      .count<{ count: string }[]>('id as count');

    const [purchasedRow] = await db('ayuta_buyers')
      .where('workspace', workspace)
      .whereIn('status', ['구매완료', '재구매'])
      .count<{ count: string }[]>('id as count');

    const [leadsRow] = await db('ayuta_buyers')
      .where('workspace', workspace)
      .whereIn('status', ['신규문의', '연락완료', '샘플발송', '커핑완료', '견적전달', '테스트중'])
      .count<{ count: string }[]>('id as count');

    const [newThisMonthRow] = await db('ayuta_buyers')
      .where('workspace', workspace)
      .andWhere('created_at', '>=', kstMonthStart)
      .count<{ count: string }[]>('id as count');

    return {
      todayFollowUp: parseInt(todayFollowUpRow.count as string, 10) || 0,
      purchased: parseInt(purchasedRow.count as string, 10) || 0,
      leads: parseInt(leadsRow.count as string, 10) || 0,
      newThisMonth: parseInt(newThisMonthRow.count as string, 10) || 0,
    };
  }
}
