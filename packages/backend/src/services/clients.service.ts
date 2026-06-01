import { db } from '../database/connection';
import { AppError } from '../middleware/error.middleware';
import { API_ERRORS } from '@cotion/shared';
import {
  Client,
  ClientCreateInput,
  ClientUpdateInput,
  ClientBusinessType,
  ClientStatus,
  ClientPaymentTerms,
} from '@cotion/shared';
import { KakaoService } from './kakao.service';

// jsonb columns come back from pg as parsed arrays already; legacy rows
// might still have the column NULL, so guard against that.
function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value as string[];
  if (typeof value === 'string') {
    try {
      const p = JSON.parse(value);
      return Array.isArray(p) ? p : [];
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
  if (value instanceof Date) {
    // pg returns DATE columns as Date objects at 00:00:00 in the server's
    // local TZ. Using toISOString shifts west of UTC into the prior day.
    // Read local components instead so "2026-06-10" round-trips intact.
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(value);
}

// Helper function to transform snake_case DB columns to camelCase for API response
function mapClientToResponse(row: any): Client {
  return {
    id: row.id,
    name: row.name,
    contactPerson: row.contact_person,
    phone: row.phone,
    email: row.email,
    address: row.address,
    assignedTo: row.assigned_to,
    assignedToName: row.assigned_to_name || undefined,
    notes: row.notes,

    // A. 영업 관리 (nullable for legacy rows; status has a DB default)
    kakaoId: row.kakao_id ?? null,
    instagram: row.instagram ?? null,
    region: row.region ?? null,
    businessType: (row.business_type ?? null) as ClientBusinessType | null,
    status: (row.status ?? '신규') as ClientStatus,
    followUpDate: toDateString(row.follow_up_date),

    // B. 거래 추적
    firstOrderDate: toDateString(row.first_order_date),
    lastOrderDate: toDateString(row.last_order_date),
    totalOrderAmount: toNumber(row.total_order_amount),
    monthlyVolumeKg: toNumber(row.monthly_volume_kg),
    preferredItems: parseStringArray(row.preferred_items),

    // C. B2B
    taxId: row.tax_id ?? null,
    invoiceEmail: row.invoice_email ?? null,
    paymentTerms: (row.payment_terms ?? null) as ClientPaymentTerms | null,
    shippingAddress: row.shipping_address ?? null,

    workspace: row.workspace,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapClientsToResponse(rows: any[]): Client[] {
  return rows.map(mapClientToResponse);
}

interface ClientFilters {
  assignedTo?: string;
  status?: string;
  businessType?: string;
  region?: string;
}

export class ClientsService {
  static async getAll(workspace: string, filters?: ClientFilters): Promise<Client[]> {
    const query = db('clients')
      .leftJoin('users', 'clients.assigned_to', 'users.id')
      .where('clients.workspace', workspace)
      .select(
        'clients.*',
        db.raw('users.name as assigned_to_name')
      )
      .orderBy('clients.created_at', 'desc');

    if (filters?.assignedTo !== undefined) {
      query.where('clients.assigned_to', filters.assignedTo);
    }
    if (filters?.status) query.where('clients.status', filters.status);
    if (filters?.businessType) query.where('clients.business_type', filters.businessType);
    if (filters?.region) query.where('clients.region', filters.region);

    const rows = await query;
    return mapClientsToResponse(rows);
  }

  // workspace enforces tenant isolation when provided. Controllers must
  // always pass it; internal callers may omit when they've already verified.
  static async getById(id: string, workspace?: string): Promise<Client | null> {
    const q = db('clients')
      .leftJoin('users', 'clients.assigned_to', 'users.id')
      .where('clients.id', id);
    if (workspace) q.andWhere('clients.workspace', workspace);
    const row = await q
      .select(
        'clients.*',
        db.raw('users.name as assigned_to_name')
      )
      .first();

    return row ? mapClientToResponse(row) : null;
  }

  static async create(input: ClientCreateInput, userId: string): Promise<Client> {
    const [row] = await db('clients')
      .insert({
        name: input.name,
        contact_person: input.contactPerson || null,
        phone: input.phone || null,
        email: input.email || null,
        address: input.address || null,
        assigned_to: input.assignedTo || null,
        notes: input.notes || null,

        // A. 영업 관리
        kakao_id: input.kakaoId || null,
        instagram: input.instagram || null,
        region: input.region || null,
        business_type: input.businessType || null,
        status: input.status ?? '신규',
        follow_up_date: input.followUpDate || null,

        // B. 거래 추적
        first_order_date: input.firstOrderDate || null,
        last_order_date: input.lastOrderDate || null,
        total_order_amount: input.totalOrderAmount ?? 0,
        monthly_volume_kg: input.monthlyVolumeKg ?? 0,
        preferred_items: JSON.stringify(input.preferredItems ?? []),

        // C. B2B
        tax_id: input.taxId || null,
        invoice_email: input.invoiceEmail || null,
        payment_terms: input.paymentTerms || null,
        shipping_address: input.shippingAddress || null,

        workspace: input.workspace,
        created_by: userId,
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      })
      .returning('*');

    // Re-fetch with join to get assignedToName
    const client = await this.getById(row.id);

    // Send Kakao notification to assigned user
    if (input.assignedTo) {
      KakaoService.notifyUsers(
        [input.assignedTo],
        '새 거래처 담당 배정',
        `거래처 "${input.name}"의 담당자로 배정되었습니다.`,
        'https://cotion-ten.vercel.app'
      );
    }

    return client!;
  }

  static async update(id: string, input: ClientUpdateInput, workspace?: string): Promise<Client> {
    const q = db('clients').where({ id });
    if (workspace) q.andWhere({ workspace });
    const existing = await q.first();

    if (!existing) {
      throw new AppError(404, API_ERRORS.NOT_FOUND, '클라이언트를 찾을 수 없습니다');
    }

    const updateFields: any = { updated_at: db.fn.now() };
    if (input.name !== undefined) updateFields.name = input.name;
    if (input.contactPerson !== undefined) updateFields.contact_person = input.contactPerson;
    if (input.phone !== undefined) updateFields.phone = input.phone;
    if (input.email !== undefined) updateFields.email = input.email;
    if (input.address !== undefined) updateFields.address = input.address;
    if (input.assignedTo !== undefined) updateFields.assigned_to = input.assignedTo;
    if (input.notes !== undefined) updateFields.notes = input.notes;

    // A. 영업 관리
    if (input.kakaoId !== undefined) updateFields.kakao_id = input.kakaoId;
    if (input.instagram !== undefined) updateFields.instagram = input.instagram;
    if (input.region !== undefined) updateFields.region = input.region;
    if (input.businessType !== undefined) updateFields.business_type = input.businessType;
    if (input.status !== undefined) updateFields.status = input.status;
    if (input.followUpDate !== undefined) updateFields.follow_up_date = input.followUpDate;

    // B. 거래 추적
    if (input.firstOrderDate !== undefined) updateFields.first_order_date = input.firstOrderDate;
    if (input.lastOrderDate !== undefined) updateFields.last_order_date = input.lastOrderDate;
    if (input.totalOrderAmount !== undefined) updateFields.total_order_amount = input.totalOrderAmount;
    if (input.monthlyVolumeKg !== undefined) updateFields.monthly_volume_kg = input.monthlyVolumeKg;
    if (input.preferredItems !== undefined)
      updateFields.preferred_items = JSON.stringify(input.preferredItems);

    // C. B2B
    if (input.taxId !== undefined) updateFields.tax_id = input.taxId;
    if (input.invoiceEmail !== undefined) updateFields.invoice_email = input.invoiceEmail;
    if (input.paymentTerms !== undefined) updateFields.payment_terms = input.paymentTerms;
    if (input.shippingAddress !== undefined) updateFields.shipping_address = input.shippingAddress;

    // Scope the actual UPDATE by workspace too (TOCTOU defense).
    const writeQ = db('clients').where({ id });
    if (workspace) writeQ.andWhere({ workspace });
    await writeQ.update(updateFields);

    // Send Kakao notification if assignee changed
    if (input.assignedTo && input.assignedTo !== existing.assigned_to) {
      const clientName = input.name || existing.name;
      KakaoService.notifyUsers(
        [input.assignedTo],
        '거래처 담당 변경',
        `거래처 "${clientName}"의 담당자로 배정되었습니다.`,
        'https://cotion-ten.vercel.app'
      );
    }

    // Re-fetch with join to get assignedToName
    const client = await this.getById(id, workspace);
    return client!;
  }

  static async delete(id: string, workspace?: string): Promise<void> {
    const q = db('clients').where({ id });
    if (workspace) q.andWhere({ workspace });
    const existing = await q.first();

    if (!existing) {
      throw new AppError(404, API_ERRORS.NOT_FOUND, '클라이언트를 찾을 수 없습니다');
    }

    const deleteQ = db('clients').where({ id });
    if (workspace) deleteQ.andWhere({ workspace });
    await deleteQ.delete();
  }
}
