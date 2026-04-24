export interface Inventory {
  id: string;
  name: string;
  type: string;
  origin: string | null;
  variety: string | null;
  process: string | null;
  totalIn: number;
  currentStock: number;
  storageLocation: string | null;
  workspace: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryCreateInput {
  name: string;
  type: string;
  origin?: string;
  variety?: string;
  process?: string;
  totalIn?: number;
  currentStock?: number;
  storageLocation?: string;
  workspace: string;
}

export interface InventoryUpdateInput {
  name?: string;
  type?: string;
  origin?: string;
  variety?: string;
  process?: string;
  totalIn?: number;
  currentStock?: number;
  storageLocation?: string;
}

export interface InventoryTransaction {
  id: string;
  inventoryId: string;
  type: 'in' | 'out';
  quantity: number;
  note: string | null;
  createdBy: string;
  createdAt: string;
}

export interface InventoryTransactionCreateInput {
  type: 'in' | 'out';
  quantity: number;
  note?: string;
}
