import { db } from '../database/connection';
import { AppError } from '../middleware/error.middleware';
import { API_ERRORS } from '@cotion/shared';
import { Page, PageCreateInput, PageUpdateInput, PageMoveInput, PageTreeNode } from '@cotion/shared';

export class PagesService {
  static async getAllPages(userId: string): Promise<PageTreeNode[]> {
    const pages = await db('pages')
      .where({ is_deleted: false })
      .orderBy('path')
      .select('*');

    return this.buildTree(pages);
  }

  static async getPageById(pageId: string, userId: string): Promise<Page | null> {
    const page = await db('pages')
      .where({ id: pageId, is_deleted: false })
      .first();

    return page || null;
  }

  static async createPage(input: PageCreateInput, userId: string): Promise<Page> {
    let path: string;
    let position = 0;

    if (input.parentId) {
      // Get parent page
      const parent = await db('pages')
        .where({ id: input.parentId, is_deleted: false })
        .first();

      if (!parent) {
        throw new AppError(404, API_ERRORS.NOT_FOUND, '상위 페이지를 찾을 수 없습니다');
      }

      // Get the highest position among siblings
      const siblings = await db('pages')
        .where({ parent_id: input.parentId, is_deleted: false })
        .max('position as max_position')
        .first();

      position = (siblings?.max_position || 0) + 1;

      // Create path: parent.path + new_page_id
      // We'll update this after insertion since we need the ID first
      path = parent.path;
    } else {
      // Root level page
      const rootPages = await db('pages')
        .whereNull('parent_id')
        .where({ is_deleted: false })
        .max('position as max_position')
        .first();

      position = (rootPages?.max_position || 0) + 1;
      path = 'root';
    }

    const [page] = await db('pages')
      .insert({
        title: input.title,
        content: input.content || '',
        icon: input.icon,
        parent_id: input.parentId || null,
        category: input.category || null,
        created_by: userId,
        updated_by: userId,
        position,
        path: path, // temporary path
      })
      .returning('*');

    // Update path with the actual page ID (replace hyphens with underscores for LTREE compatibility)
    const sanitizedId = page.id.replace(/-/g, '_');
    const finalPath = input.parentId ? `${path}.${sanitizedId}` : `root.${sanitizedId}`;
    await db('pages').where({ id: page.id }).update({ path: finalPath });

    return { ...page, path: finalPath };
  }

  static async updatePage(pageId: string, input: PageUpdateInput, userId: string): Promise<Page> {
    const page = await db('pages')
      .where({ id: pageId, is_deleted: false })
      .first();

    if (!page) {
      throw new AppError(404, API_ERRORS.NOT_FOUND, '페이지를 찾을 수 없습니다');
    }

    const [updatedPage] = await db('pages')
      .where({ id: pageId })
      .update({
        ...input,
        updated_by: userId,
      })
      .returning('*');

    return updatedPage;
  }

  static async deletePage(pageId: string, userId: string): Promise<void> {
    const page = await db('pages')
      .where({ id: pageId, is_deleted: false })
      .first();

    if (!page) {
      throw new AppError(404, API_ERRORS.NOT_FOUND, '페이지를 찾을 수 없습니다');
    }

    // Soft delete the page and all its descendants
    await db('pages')
      .where('path', '<@', page.path) // All descendants (using LTREE operator)
      .orWhere({ id: pageId })
      .update({
        is_deleted: true,
        deleted_at: db.fn.now(),
        updated_by: userId,
      });
  }

  static async getDeletedPages(userId: string): Promise<Page[]> {
    const pages = await db('pages')
      .where({ is_deleted: true })
      .orderBy('deleted_at', 'desc')
      .select('*');

    return pages;
  }

  static async restorePage(pageId: string, userId: string): Promise<void> {
    const page = await db('pages')
      .where({ id: pageId, is_deleted: true })
      .first();

    if (!page) {
      throw new AppError(404, API_ERRORS.NOT_FOUND, '삭제된 페이지를 찾을 수 없습니다');
    }

    // Restore the page and all its descendants
    await db('pages')
      .where('path', '<@', page.path)
      .orWhere({ id: pageId })
      .update({
        is_deleted: false,
        deleted_at: null,
        updated_by: userId,
      });
  }

  static async permanentDeletePage(pageId: string, userId: string): Promise<void> {
    const page = await db('pages')
      .where({ id: pageId, is_deleted: true })
      .first();

    if (!page) {
      throw new AppError(404, API_ERRORS.NOT_FOUND, '삭제된 페이지를 찾을 수 없습니다');
    }

    // Permanently delete the page and all its descendants
    await db('pages')
      .where('path', '<@', page.path)
      .orWhere({ id: pageId })
      .delete();
  }

  static async getChildren(pageId: string, userId: string): Promise<Page[]> {
    const page = await db('pages')
      .where({ id: pageId, is_deleted: false })
      .first();

    if (!page) {
      throw new AppError(404, API_ERRORS.NOT_FOUND, '페이지를 찾을 수 없습니다');
    }

    const children = await db('pages')
      .where({ parent_id: pageId, is_deleted: false })
      .orderBy('position')
      .select('*');

    return children;
  }

  static async getBreadcrumb(pageId: string, userId: string): Promise<Page[]> {
    const page = await db('pages')
      .where({ id: pageId, is_deleted: false })
      .first();

    if (!page) {
      throw new AppError(404, API_ERRORS.NOT_FOUND, '페이지를 찾을 수 없습니다');
    }

    // Get all ancestors using LTREE path
    const pathParts = page.path.split('.');
    const sanitizedIds = pathParts.slice(1); // Remove 'root'

    if (sanitizedIds.length === 0) {
      return [page];
    }

    // Convert sanitized IDs back to UUIDs (replace underscores with hyphens)
    const ancestorIds = sanitizedIds.map((id: string) => id.replace(/_/g, '-'));

    const ancestors = await db('pages')
      .whereIn('id', ancestorIds)
      .where({ is_deleted: false })
      .orderBy('path')
      .select('*');

    return ancestors;
  }

  static async movePage(pageId: string, input: PageMoveInput, userId: string): Promise<Page> {
    const page = await db('pages')
      .where({ id: pageId, is_deleted: false })
      .first();

    if (!page) {
      throw new AppError(404, API_ERRORS.NOT_FOUND, '페이지를 찾을 수 없습니다');
    }

    // Check if trying to move to a descendant (would create a cycle)
    if (input.newParentId) {
      const newParent = await db('pages')
        .where({ id: input.newParentId, is_deleted: false })
        .first();

      if (!newParent) {
        throw new AppError(404, API_ERRORS.NOT_FOUND, '대상 페이지를 찾을 수 없습니다');
      }

      // Check if newParent is a descendant of the page being moved
      if (newParent.path.includes(page.path)) {
        throw new AppError(400, API_ERRORS.VALIDATION_ERROR, '하위 페이지로 이동할 수 없습니다');
      }
    }

    // Update parent and recalculate paths
    const newPath = input.newParentId
      ? await this.calculateNewPath(input.newParentId)
      : 'root';

    const sanitizedId = pageId.replace(/-/g, '_');
    const finalPath = `${newPath}.${sanitizedId}`;

    // Update the page and all its descendants
    const oldPath = page.path;
    await db.transaction(async (trx) => {
      // Update the page itself
      await trx('pages')
        .where({ id: pageId })
        .update({
          parent_id: input.newParentId || null,
          path: finalPath,
          position: input.position ?? page.position,
          updated_by: userId,
        });

      // Update all descendants' paths
      await trx.raw(
        `
        UPDATE pages
        SET path = ? || subpath(path, nlevel(?))
        WHERE path <@ ? AND id != ?
      `,
        [finalPath, oldPath, oldPath, pageId]
      );
    });

    const [updatedPage] = await db('pages').where({ id: pageId }).select('*');
    return updatedPage;
  }

  private static async calculateNewPath(parentId: string): Promise<string> {
    const parent = await db('pages').where({ id: parentId }).first();
    return parent.path;
  }

  private static buildTree(pages: any[]): PageTreeNode[] {
    const map = new Map<string, PageTreeNode>();
    const roots: PageTreeNode[] = [];

    // Initialize all nodes
    pages.forEach((page) => {
      map.set(page.id, { ...page, children: [] });
    });

    // Build the tree
    pages.forEach((page) => {
      const node = map.get(page.id)!;
      if (page.parent_id && map.has(page.parent_id)) {
        const parent = map.get(page.parent_id)!;
        parent.children!.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }
}
