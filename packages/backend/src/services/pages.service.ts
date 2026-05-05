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
        workspace: input.workspace || null,
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

  static async getDeletedPages(userId: string, isSuperAdmin = false): Promise<any[]> {
    const query = db('pages')
      .leftJoin('users', 'pages.updated_by', 'users.id')
      .where({ 'pages.is_deleted': true })
      .orderBy('pages.deleted_at', 'desc')
      .select('pages.*', 'users.name as deleted_by_name');

    const pages = await query;
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
    const newParentId = input.newParentId || null;
    const targetPosition = input.position ?? page.position;

    await db.transaction(async (trx) => {
      // 1. Get all siblings (excluding the moved page) in current position order
      const siblingsQuery = trx('pages')
        .where({ is_deleted: false })
        .where('id', '!=', pageId)
        .orderBy('position');

      if (newParentId) {
        siblingsQuery.where({ parent_id: newParentId });
      } else {
        siblingsQuery.whereNull('parent_id');
        // For root-level pages, filter by category to reorder within the same group
        if (input.category) {
          siblingsQuery.where({ category: input.category });
        } else {
          siblingsQuery.whereNull('category');
        }
      }

      const siblings = await siblingsQuery.select('id');

      // 2. Insert the moved page at the target position
      const reordered = [...siblings.map((s) => s.id)];
      const clampedPos = Math.max(0, Math.min(targetPosition, reordered.length));
      reordered.splice(clampedPos, 0, pageId);

      // 3. Update all positions sequentially
      for (let i = 0; i < reordered.length; i++) {
        await trx('pages').where({ id: reordered[i] }).update({ position: i });
      }

      // 4. Update the moved page's parent, path, and category
      const updateFields: any = {
        parent_id: newParentId,
        path: finalPath,
        updated_by: userId,
      };
      if (input.category !== undefined) {
        updateFields.category = input.category || null;
      }
      await trx('pages')
        .where({ id: pageId })
        .update(updateFields);

      // 5. Update all descendants' paths
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

  static async searchPages(query: string, userId: string): Promise<Page[]> {
    const searchPattern = `%${query}%`;

    const pages = await db('pages')
      .where({ is_deleted: false })
      .andWhere(function () {
        this.where('title', 'ILIKE', searchPattern)
          .orWhere('content', 'ILIKE', searchPattern);
      })
      .orderBy('updated_at', 'desc')
      .limit(20)
      .select('id', 'title', 'icon', 'category', 'path', 'parent_id', 'updated_at');

    return pages;
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

    // Sort children by position at every level
    function sortByPosition(nodes: PageTreeNode[]) {
      nodes.sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0));
      nodes.forEach((node) => {
        if (node.children && node.children.length > 0) {
          sortByPosition(node.children);
        }
      });
    }
    sortByPosition(roots);

    return roots;
  }

  // ─── 카테고리(폴더) 이름 변경 ─────────────────────────────
  static async renameCategory(
    workspace: string,
    oldName: string,
    newName: string
  ): Promise<number> {
    const updated = await db('pages')
      .where({ workspace, category: oldName, is_deleted: false })
      .update({ category: newName, updated_at: db.fn.now() });
    return updated;
  }

  // ─── 카테고리(폴더) 삭제 (페이지를 미분류로 이동) ─────────
  static async deleteCategory(
    workspace: string,
    categoryName: string
  ): Promise<number> {
    const updated = await db('pages')
      .where({ workspace, category: categoryName, is_deleted: false })
      .update({ category: null, updated_at: db.fn.now() });
    return updated;
  }
}
