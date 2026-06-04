import { db } from '../database/connection';
import { AppError } from '../middleware/error.middleware';
import {
  API_ERRORS,
  PriceItem,
  PriceItemCreateInput,
  PriceItemUpdateInput,
  PriceChannel,
} from '@cotion/shared';

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === 'string' ? parseFloat(value) : (value as number);
  return isNaN(n) ? 0 : n;
}

function mapRow(row: any): PriceItem {
  return {
    id: row.id,
    productName: row.product_name,
    channel: row.channel as PriceChannel,
    unitLabel: row.unit_label,
    price: toNumber(row.price),
    note: row.note ?? null,
    sortOrder: row.sort_order ?? 0,
    workspace: row.workspace,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class PriceItemsService {
  static async getAll(workspace: string): Promise<PriceItem[]> {
    const rows = await db('price_items')
      .where({ workspace })
      .orderBy([
        { column: 'product_name', order: 'asc' },
        { column: 'sort_order', order: 'asc' },
        { column: 'created_at', order: 'asc' },
      ])
      .select('*');
    return rows.map(mapRow);
  }

  static async getById(id: string, workspace?: string): Promise<PriceItem | null> {
    const q = db('price_items').where({ id });
    if (workspace) q.andWhere({ workspace });
    const row = await q.first();
    return row ? mapRow(row) : null;
  }

  static async create(input: PriceItemCreateInput, userId: string): Promise<PriceItem> {
    const [row] = await db('price_items')
      .insert({
        product_name: input.productName,
        channel: input.channel,
        unit_label: input.unitLabel,
        price: input.price ?? 0,
        note: input.note || null,
        sort_order: input.sortOrder ?? 0,
        workspace: input.workspace,
        created_by: userId,
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      })
      .returning('*');
    return mapRow(row);
  }

  static async update(
    id: string,
    input: PriceItemUpdateInput,
    workspace?: string
  ): Promise<PriceItem> {
    const q = db('price_items').where({ id });
    if (workspace) q.andWhere({ workspace });
    const existing = await q.first();
    if (!existing) {
      throw new AppError(404, API_ERRORS.NOT_FOUND, '단가 항목을 찾을 수 없습니다');
    }

    const update: any = { updated_at: db.fn.now() };
    if (input.productName !== undefined) update.product_name = input.productName;
    if (input.channel !== undefined) update.channel = input.channel;
    if (input.unitLabel !== undefined) update.unit_label = input.unitLabel;
    if (input.price !== undefined) update.price = input.price;
    if (input.note !== undefined) update.note = input.note;
    if (input.sortOrder !== undefined) update.sort_order = input.sortOrder;

    const writeQ = db('price_items').where({ id });
    if (workspace) writeQ.andWhere({ workspace });
    await writeQ.update(update);

    const item = await this.getById(id, workspace);
    return item!;
  }

  static async delete(id: string, workspace?: string): Promise<void> {
    const q = db('price_items').where({ id });
    if (workspace) q.andWhere({ workspace });
    const existing = await q.first();
    if (!existing) {
      throw new AppError(404, API_ERRORS.NOT_FOUND, '단가 항목을 찾을 수 없습니다');
    }
    const delQ = db('price_items').where({ id });
    if (workspace) delQ.andWhere({ workspace });
    await delQ.delete();
  }
}
