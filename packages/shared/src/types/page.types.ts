export interface Page {
  id: string;
  title: string;
  content?: string;
  icon?: string;
  coverImage?: string;
  path: string;
  parentId?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  updatedBy?: string;
  isDeleted: boolean;
  deletedAt?: Date;
  position: number;
}

export interface PageCreateInput {
  title: string;
  content?: string;
  icon?: string;
  parentId?: string;
}

export interface PageUpdateInput {
  title?: string;
  content?: string;
  icon?: string;
  coverImage?: string;
}

export interface PageMoveInput {
  newParentId?: string;
  position?: number;
}

export interface PageTreeNode extends Page {
  children?: PageTreeNode[];
}
