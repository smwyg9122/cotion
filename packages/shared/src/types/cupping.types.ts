export interface CuppingLog {
  id: string;
  visitDate: string;
  clientId: string | null;
  roasteryName: string;
  contactPerson: string | null;
  offeredBeans: string | null;
  reaction: string | null;
  purchaseIntent: string | null;
  followupDate: string | null;
  followupNotified: boolean;
  notes: string | null;
  workspace: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CuppingLogCreateInput {
  visitDate: string;
  clientId?: string;
  roasteryName: string;
  contactPerson?: string;
  offeredBeans?: string;
  reaction?: string;
  purchaseIntent?: string;
  followupDate?: string;
  followupNotified?: boolean;
  notes?: string;
  workspace: string;
}

export interface CuppingLogUpdateInput {
  visitDate?: string;
  clientId?: string | null;
  roasteryName?: string;
  contactPerson?: string;
  offeredBeans?: string;
  reaction?: string;
  purchaseIntent?: string;
  followupDate?: string | null;
  followupNotified?: boolean;
  notes?: string;
}
