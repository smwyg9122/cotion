export interface DocumentTagUser {
  id: string;
  userId: string;
  userName: string;
  taggedAt: string;
}

export interface Document {
  id: string;
  title: string;
  category: string | null;
  status: string;
  fileId: string | null;
  pageId: string | null;
  description: string | null;
  workspace: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  // File metadata (from JOIN)
  fileName?: string;
  fileMimeType?: string;
  fileSize?: number;
  // Tagged users
  taggedUsers?: DocumentTagUser[];
}

export interface DocumentCreateInput {
  title: string;
  category?: string;
  status?: string;
  fileId?: string;
  pageId?: string;
  description?: string;
  workspace: string;
}

export interface DocumentUpdateInput {
  title?: string;
  category?: string;
  status?: string;
  fileId?: string | null;
  pageId?: string | null;
  description?: string;
}
