import { db } from '../database/connection';
import { AppError } from '../middleware/error.middleware';
import { API_ERRORS } from '@cotion/shared';
import {
  Inventory,
  InventoryCreateInput,
  InventoryUpdateInput,
  InventoryTransaction,
  InventoryTransactionCreateInput,
} from '@cotion/shared';

// Helper function to transform snake_case DB columns to camelCase for API response
function mapInventoryToResponse(row: any): Inventory {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    origin: row.origin,
    variety: row.variety,
    process: row.process,
    totalIn: row.total_in,
    currentStock: row.current_stock,
    storageLocation: row.storage_location,
    workspace: row.workspace,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapInventoriesToResponse(rows: any[]): Inventory[] {
  return rows.map(mapInventoryToResponse);
}

function mapTransactionToResponse(row: any): InventoryTransaction {
  return {
    id: row.id,
    inventoryId: row.inventory_id,
    type: row.type,
    quantity: row.quantity,
    note: row.note,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

function mapTransactionsToResponse(rows: any[]): InventoryTransaction[] {
  return rows.map(mapTransactionToResponse);
}

interface InventoryFilters {
  type?: string;
  origin?: string;
}

export class InventoryService {
  static async getAll(workspace: string, filters?: InventoryFilters): Promise<Inventory[]> {
    const query = db('inventory')
      .where({ workspace })
      .orderBy('created_at', 'desc')
      .select('*');

    if (filters?.type) {
      query.where('type', filters.type);
    }
    if (filters?.origin) {
      query.where('origin', filters.origin);
    }

    const rows = await query;
    return mapInventoriesToResponse(rows);
  }

  static async getById(id: string): Promise<Inventory | null> {
    const row = await db('inventory')
      .where({ id })
      .first();

    return row ? mapInventoryToResponse(row) : null;
  }

  static async create(input: InventoryCreateInput, userId: string): Promise<Inventory> {
    const [row] = await db('inventory')
      .insert({
        name: input.name,
        type: input.type,
        origin: input.origin || null,
        variety: input.variety || null,
        process: input.process || null,
        total_in: input.totalIn ?? 0,
        current_stock: input.currentStock ?? 0,
        storage_location: input.storageLocation || null,
        workspace: input.workspace,
        created_by: userId,
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      })
      .returning('*');

    return mapInventoryToResponse(row);
  }

  static async update(id: string, input: InventoryUpdateInput): Promise<Inventory> {
    const existing = await db('inventory')
      .where({ id })
      .first();

    if (!existing) {
      throw new AppError(404, API_ERRORS.NOT_FOUND, '재고를 찾을 수 없습니다');
    }

    const updateFields: any = { updated_at: db.fn.now() };
    if (input.name !== undefined) updateFields.name = input.name;
    if (input.type !== undefined) updateFields.type = input.type;
    if (input.origin !== undefined) updateFields.origin = input.origin;
    if (input.variety !== undefined) updateFields.variety = input.variety;
    if (input.process !== undefined) updateFields.process = input.process;
    if (input.totalIn !== undefined) updateFields.total_in = input.totalIn;
    if (input.currentStock !== undefined) updateFields.current_stock = input.currentStock;
    if (input.storageLocation !== undefined) updateFields.storage_location = input.storageLocation;

    const [updatedRow] = await db('inventory')
      .where({ id })
      .update(updateFields)
      .returning('*');

    return mapInventoryToResponse(updatedRow);
  }

  static async delete(id: string): Promise<void> {
    const existing = await db('inventory')
      .where({ id })
      .first();

    if (!existing) {
      throw new AppError(404, API_ERRORS.NOT_FOUND, '재고를 찾을 수 없습니다');
    }

    await db('inventory')
      .where({ id })
      .delete();
  }

  static async addTransaction(
    inventoryId: string,
    input: InventoryTransactionCreateInput,
    userId: string
  ): Promise<InventoryTransaction> {
    const existing = await db('inventory')
      .where({ id: inventoryId })
      .first();

    if (!existing) {
      throw new AppError(404, API_ERRORS.NOT_FOUND, '재고를 찾을 수 없습니다');
    }

    // Use knex transaction for atomic stock update
    const result = await db.transaction(async (trx) => {
      const [transaction] = await trx('inventory_transactions')
        .insert({
          inventory_id: inventoryId,
          type: input.type,
          quantity: input.quantity,
          note: input.note || null,
          created_by: userId,
          created_at: db.fn.now(),
        })
        .returning('*');

      // Update stock based on transaction type
      if (input.type === 'in') {
        await trx('inventory')
          .where({ id: inventoryId })
          .increment('current_stock', input.quantity)
          .increment('total_in', input.quantity)
          .update({ updated_at: db.fn.now() });
      } else {
        await trx('inventory')
          .where({ id: inventoryId })
          .decrement('current_stock', input.quantity)
          .update({ updated_at: db.fn.now() });
      }

      return transaction;
    });

    return mapTransactionToResponse(result);
  }

  static async getTransactions(inventoryId: string): Promise<InventoryTransaction[]> {
    const rows = await db('inventory_transactions')
      .where({ inventory_id: inventoryId })
      .orderBy('created_at', 'desc')
      .select('*');

    return mapTransactionsToResponse(rows);
  }
}
