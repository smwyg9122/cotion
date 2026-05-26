import { db } from '../database/connection';
import { AppError } from '../middleware/error.middleware';
import { API_ERRORS } from '@cotion/shared';
import { Page, PageCreateInput, PageUpdateInput, PageMoveInput, PageTreeNode } from '@cotion/shared';

// ─── Workspace access helper ─────────────────────────────────────
// Returns the list of workspaces the user can read/write to, or null for
// superadmin (= unrestricted). Bounded TTL cache so we don't query
// users-table on every page request.

const workspaceCache = new Map<string, { workspaces: string[] | null; expiresAt: number }>();
const WORKSPACE_CACHE_TTL_MS = 60 * 1000;

export async function getUserAccessibleWorkspaces(userId: string): Promise<string[] | null> {
  const now = Date.now();
  const cached = workspaceCache.get(userId);
  if (cached && cached.expiresAt > now) return cached.workspaces;

  const user = await db('users')
    .where({ id: userId })
    .select('role', 'allowed_workspaces')
    .first();
  if (!user) throw new AppError(403, API_ERRORS.FORBIDDEN, '사용자를 찾을 수 없습니다');

  let workspaces: string[] | null;
  if (user.role === 'superadmin') {
    workspaces = null; // unrestricted
  } else {
    const aw = user.allowed_workspaces;
    if (!aw) {
      workspaces = [];
    } else {
      try {
        const parsed = typeof aw === 'string' ? JSON.parse(aw) : aw;
        workspaces = Array.isArray(parsed) ? parsed : [];
      } catch {
        workspaces = [];
      }
    }
  }

  workspaceCache.set(userId, { workspaces, expiresAt: now + WORKSPACE_CACHE_TTL_MS });
  return workspaces;
}

export function invalidatePagesWorkspaceCache(userId: string) {
  workspaceCache.delete(userId);
}

/**
 * Guard for any HTTP handler that takes a workspace from request input.
 * The service layer alone enforces "the row's workspace matches the query
 * workspace" — but without this check, an authenticated user who simply
 * sends ?workspace=OtherCompany can read/mutate rows there as long as the
 * row IDs match. This closes that gap by verifying the requested workspace
 * is in the user's allowlist (or the user is superadmin).
 *
 * Throws 403 on mismatch so the controller's handler aborts immediately.
 */
export async function assertWorkspaceAccess(userId: string, workspace: string): Promise<void> {
  if (!workspace) {
    throw new AppError(400, API_ERRORS.VALIDATION_ERROR, 'workspace is required');
  }
  const allowed = await getUserAccessibleWorkspaces(userId);
  if (allowed === null) return; // superadmin → unrestricted
  if (!allowed.includes(workspace)) {
    throw new AppError(403, API_ERRORS.FORBIDDEN, '해당 워크스페이스에 접근 권한이 없습니다');
  }
}

export class PagesService {
  static async getAllPages(userId: string): Promise<PageTreeNode[]> {
    const accessible = await getUserAccessibleWorkspaces(userId);

    const query = db('pages').where({ is_deleted: false }).orderBy('path');
    if (accessible !== null) {
      // Members only see pages from workspaces they are allowed in.
      // Empty list → empty result (no access at all).
      if (accessible.length === 0) return [];
      query.whereIn('workspace', accessible);
    }
    const pages = await query.select('*');
    return this.buildTree(pages);
  }

  static async getPageById(pageId: string, userId: string): Promise<Page | null> {
    const accessible = await getUserAccessibleWorkspaces(userId);

    const query = db('pages').where({ id: pageId, is_deleted: false });
    if (accessible !== null) {
      if (accessible.length === 0) return null;
      query.whereIn('workspace', accessible);
    }
    const page = await query.first();
    return page || null;
  }

  static async createPage(input: PageCreateInput, userId: string): Promise<Page> {
    const accessible = await getUserAccessibleWorkspaces(userId);

    // Enforce workspace access when explicit workspace is requested.
    if (input.workspace && accessible !== null && !accessible.includes(input.workspace)) {
      throw new AppError(403, API_ERRORS.FORBIDDEN, '해당 워크스페이스에 접근 권한이 없습니다');
    }

    let path: string;
    let position = 0;

    if (input.parentId) {
      // Get parent page — also scoped by accessible workspace
      const parentQuery = db('pages').where({ id: input.parentId, is_deleted: false });
      if (accessible !== null) parentQuery.whereIn('workspace', accessible);
      const parent = await parentQuery.first();

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
    const accessible = await getUserAccessibleWorkspaces(userId);

    const q = db('pages').where({ id: pageId, is_deleted: false });
    if (accessible !== null) {
      if (accessible.length === 0) throw new AppError(404, API_ERRORS.NOT_FOUND, '페이지를 찾을 수 없습니다');
      q.whereIn('workspace', accessible);
    }
    const page = await q.first();

    if (!page) {
      throw new AppError(404, API_ERRORS.NOT_FOUND, '페이지를 찾을 수 없습니다');
    }

    const writeQ = db('pages').where({ id: pageId });
    if (accessible !== null) writeQ.whereIn('workspace', accessible);
    const [updatedPage] = await writeQ
      .update({
        ...input,
        updated_by: userId,
      })
      .returning('*');

    return updatedPage;
  }

  static async deletePage(pageId: string, userId: string): Promise<void> {
    const accessible = await getUserAccessibleWorkspaces(userId);

    const q = db('pages').where({ id: pageId, is_deleted: false });
    if (accessible !== null) {
      if (accessible.length === 0) throw new AppError(404, API_ERRORS.NOT_FOUND, '페이지를 찾을 수 없습니다');
      q.whereIn('workspace', accessible);
    }
    const page = await q.first();

    if (!page) {
      throw new AppError(404, API_ERRORS.NOT_FOUND, '페이지를 찾을 수 없습니다');
    }

    // Soft delete the page and all its descendants. The cascade is scoped
    // to the same workspace via the parent path being in the user's reach.
    await db('pages')
      .where('path', '<@', page.path) // All descendants (using LTREE operator)
      .orWhere({ id: pageId })
      .update({
        is_deleted: true,
        deleted_at: db.fn.now(),
        updated_by: userId,
      });
  }

  static async getDeletedPages(userId: string, _isSuperAdmin = false): Promise<any[]> {
    const accessible = await getUserAccessibleWorkspaces(userId);

    const query = db('pages')
      .leftJoin('users', 'pages.updated_by', 'users.id')
      .where({ 'pages.is_deleted': true })
      .orderBy('pages.deleted_at', 'desc')
      .select('pages.*', 'users.name as deleted_by_name');

    if (accessible !== null) {
      if (accessible.length === 0) return [];
      query.whereIn('pages.workspace', accessible);
    }

    const pages = await query;
    return pages;
  }

  static async restorePage(pageId: string, userId: string): Promise<void> {
    const accessible = await getUserAccessibleWorkspaces(userId);

    const q = db('pages').where({ id: pageId, is_deleted: true });
    if (accessible !== null) {
      if (accessible.length === 0) throw new AppError(404, API_ERRORS.NOT_FOUND, '삭제된 페이지를 찾을 수 없습니다');
      q.whereIn('workspace', accessible);
    }
    const page = await q.first();

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
    const accessible = await getUserAccessibleWorkspaces(userId);

    const q = db('pages').where({ id: pageId, is_deleted: true });
    if (accessible !== null) {
      if (accessible.length === 0) throw new AppError(404, API_ERRORS.NOT_FOUND, '삭제된 페이지를 찾을 수 없습니다');
      q.whereIn('workspace', accessible);
    }
    const page = await q.first();

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
    const accessible = await getUserAccessibleWorkspaces(userId);

    const q = db('pages').where({ id: pageId, is_deleted: false });
    if (accessible !== null) {
      if (accessible.length === 0) throw new AppError(404, API_ERRORS.NOT_FOUND, '페이지를 찾을 수 없습니다');
      q.whereIn('workspace', accessible);
    }
    const page = await q.first();

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
    const accessible = await getUserAccessibleWorkspaces(userId);

    const q = db('pages').where({ id: pageId, is_deleted: false });
    if (accessible !== null) {
      if (accessible.length === 0) throw new AppError(404, API_ERRORS.NOT_FOUND, '페이지를 찾을 수 없습니다');
      q.whereIn('workspace', accessible);
    }
    const page = await q.first();

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
    const accessible = await getUserAccessibleWorkspaces(userId);

    const q = db('pages').where({ id: pageId, is_deleted: false });
    if (accessible !== null) {
      if (accessible.length === 0) throw new AppError(404, API_ERRORS.NOT_FOUND, '페이지를 찾을 수 없습니다');
      q.whereIn('workspace', accessible);
    }
    const page = await q.first();

    if (!page) {
      throw new AppError(404, API_ERRORS.NOT_FOUND, '페이지를 찾을 수 없습니다');
    }

    // Check if trying to move to a descendant (would create a cycle)
    if (input.newParentId) {
      const parentQ = db('pages').where({ id: input.newParentId, is_deleted: false });
      if (accessible !== null) parentQ.whereIn('workspace', accessible);
      const newParent = await parentQ.first();

      if (!newParent) {
        throw new AppError(404, API_ERRORS.NOT_FOUND, '대상 페이지를 찾을 수 없습니다');
      }

      // Disallow cross-workspace move: source and destination must share workspace.
      if (newParent.workspace !== page.workspace) {
        throw new AppError(400, API_ERRORS.VALIDATION_ERROR, '다른 워크스페이스로 이동할 수 없습니다');
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
    const accessible = await getUserAccessibleWorkspaces(userId);

    // Cap input length and escape LIKE wildcards so a literal "50%" search
    // matches a literal "50%" and doesn't melt the DB on a large term.
    const capped = query.slice(0, 100);
    const escapeLike = (s: string) => s.replace(/[\\%_]/g, '\\$&');
    const searchPattern = `%${escapeLike(capped)}%`;

    const q = db('pages')
      .where({ is_deleted: false })
      .andWhere(function () {
        this.where('title', 'ILIKE', searchPattern)
          .orWhere('content', 'ILIKE', searchPattern);
      })
      .orderBy('updated_at', 'desc')
      .limit(20);

    if (accessible !== null) {
      if (accessible.length === 0) return [];
      q.whereIn('workspace', accessible);
    }

    return q.select('id', 'title', 'icon', 'category', 'path', 'parent_id', 'updated_at');
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
    newName: string,
    userId: string
  ): Promise<number> {
    const accessible = await getUserAccessibleWorkspaces(userId);
    if (accessible !== null && !accessible.includes(workspace)) {
      throw new AppError(403, API_ERRORS.FORBIDDEN, '해당 워크스페이스에 접근 권한이 없습니다');
    }
    const updated = await db('pages')
      .where({ workspace, category: oldName, is_deleted: false })
      .update({ category: newName, updated_at: db.fn.now() });
    return updated;
  }

  // ─── 카테고리(폴더) 삭제 (페이지를 미분류로 이동) ─────────
  static async deleteCategory(
    workspace: string,
    categoryName: string,
    userId: string
  ): Promise<number> {
    const accessible = await getUserAccessibleWorkspaces(userId);
    if (accessible !== null && !accessible.includes(workspace)) {
      throw new AppError(403, API_ERRORS.FORBIDDEN, '해당 워크스페이스에 접근 권한이 없습니다');
    }
    const updated = await db('pages')
      .where({ workspace, category: categoryName, is_deleted: false })
      .update({ category: null, updated_at: db.fn.now() });
    return updated;
  }
}
