import { db } from '../database/connection';
import { AppError } from '../middleware/error.middleware';
import { API_ERRORS } from '@cotion/shared';
import { Client, ClientCreateInput, ClientUpdateInput } from '@cotion/shared';

// Helper function to transform snake_case DB columns to camelCase for API response
function mapClientToResponse(row: any): Client {
  return {
    id: row.id,
    name: row.name,
    contactPerson: row.contact_person,
    phone: row.phone,
    email: row.email,
    address: row.address,
    visited: row.visited,
    cuppingDone: row.cupping_done,
    purchased: row.purchased,
    assignedTo: row.assigned_to,
    assignedToName: row.assigned_to_name || undefined,
    notes: row.notes,
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
  visited?: boolean;
  cuppingDone?: boolean;
  purchased?: boolean;
  assignedTo?: string;
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

    if (filters?.visited !== undefined) {
      query.where('clients.visited', filters.visited);
    }
    if (filters?.cuppingDone !== undefined) {
      query.where('clients.cupping_done', filters.cuppingDone);
    }
    if (filters?.purchased !== undefined) {
      query.where('clients.purchased', filters.purchased);
    }
    if (filters?.assignedTo !== undefined) {
      query.where('clients.assigned_to', filters.assignedTo);
    }

    const rows = await query;
    return mapClientsToResponse(rows);
  }

  static async getById(id: string): Promise<Client | null> {
    const row = await db('clients')
      .leftJoin('users', 'clients.assigned_to', 'users.id')
      .where('clients.id', id)
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
        visited: input.visited ?? false,
        cupping_done: input.cuppingDone ?? false,
        purchased: input.purchased ?? false,
        assigned_to: input.assignedTo || null,
        notes: input.notes || null,
        workspace: input.workspace,
        created_by: userId,
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      })
      .returning('*');

    // Re-fetch with join to get assignedToName
    const client = await this.getById(row.id);
    return client!;
  }

  static async update(id: string, input: ClientUpdateInput): Promise<Client> {
    const existing = await db('clients')
      .where({ id })
      .first();

    if (!existing) {
      throw new AppError(404, API_ERRORS.NOT_FOUND, '클라이언트를 찾을 수 없습니다');
    }

    const updateFields: any = { updated_at: db.fn.now() };
    if (input.name !== undefined) updateFields.name = input.name;
    if (input.contactPerson !== undefined) updateFields.contact_person = input.contactPerson;
    if (input.phone !== undefined) updateFields.phone = input.phone;
    if (input.email !== undefined) updateFields.email = input.email;
    if (input.address !== undefined) updateFields.address = input.address;
    if (input.visited !== undefined) updateFields.visited = input.visited;
    if (input.cuppingDone !== undefined) updateFields.cupping_done = input.cuppingDone;
    if (input.purchased !== undefined) updateFields.purchased = input.purchased;
    if (input.assignedTo !== undefined) updateFields.assigned_to = input.assignedTo;
    if (input.notes !== undefined) updateFields.notes = input.notes;

    await db('clients')
      .where({ id })
      .update(updateFields);

    // Re-fetch with join to get assignedToName
    const client = await this.getById(id);
    return client!;
  }

  static async delete(id: string): Promise<void> {
    const existing = await db('clients')
      .where({ id })
      .first();

    if (!existing) {
      throw new AppError(404, API_ERRORS.NOT_FOUND, '클라이언트를 찾을 수 없습니다');
    }

    await db('clients')
      .where({ id })
      .delete();
  }
}
