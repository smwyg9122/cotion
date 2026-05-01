export interface Document {
  id: string;
  title: string;
  category: string | null;
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
}

export interface DocumentCreateInput {
  title: string;
  category?: string;
  fileId?: string;
  pageId?: string;
  description?: string;
  workspace: string;
}

export interface DocumentUpdateInput {
  title?: string;
  category?: string;
  fileId?: string | null;
  pageId?: string | null;
  description?: string;
}
