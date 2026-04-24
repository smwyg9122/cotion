export interface Client {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  visited: boolean;
  cuppingDone: boolean;
  purchased: boolean;
  assignedTo: string | null;
  assignedToName?: string;
  notes: string | null;
  workspace: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientCreateInput {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  visited?: boolean;
  cuppingDone?: boolean;
  purchased?: boolean;
  assignedTo?: string;
  notes?: string;
  workspace: string;
}

export interface ClientUpdateInput {
  name?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  visited?: boolean;
  cuppingDone?: boolean;
  purchased?: boolean;
  assignedTo?: string | null;
  notes?: string;
}
