import { useState } from 'react';
import { PageTreeNode } from '@cotion/shared';
import { ChevronRight, ChevronDown, FileText, Plus, Trash2, GripVertical, Building2 } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface PageTreeProps {
  pages: PageTreeNode[];
  onPageSelect?: (pageId: string) => void;
  onCreatePage?: (parentId?: string) => void;
  onDeletePage?: (pageId: string) => void;
  onMovePage?: (pageId: string, newParentId?: string, position?: number, category?: string) => void;
  selectedPageId?: string;
}

export function PageTree({ pages, onPageSelect, onCreatePage, onDeletePage, onMovePage, selectedPageId }: PageTreeProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Separate workspace pages from regular pages
  const workspacePages = pages.filter((p) => (p as any).is_workspace || (p as any).isWorkspace);
  const regularPages = pages.filter((p) => !((p as any).is_workspace || (p as any).isWorkspace));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!active || !over || active.id === over.id) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find pages in the flat list
    const allPages = flattenPages(pages);
    const activePage = allPages.find((p) => p.id === activeId);
    const overPage = allPages.find((p) => p.id === overId);

    if (!activePage || !overPage) return;

    const activeParentId = (activePage as any).parent_id;
    const overParentId = (overPage as any).parent_id;

    // Only reorder within the same parent
    if (activeParentId === overParentId) {
      const parentId = activeParentId;
      let siblings: PageTreeNode[];
      if (parentId) {
        const parent = allPages.find((p) => p.id === parentId);
        siblings = parent?.children || [];
      } else {
        const activeCat = (activePage as any).category || '';
        siblings = pages.filter((p) => (p.category || '') === activeCat);
      }

      const oldIndex = siblings.findIndex((p) => p.id === activeId);
      const newIndex = siblings.findIndex((p) => p.id === overId);

      if (oldIndex === -1 || newIndex === -1) return;

      const category = (activePage as any).category || undefined;
      onMovePage?.(activeId, parentId || undefined, newIndex, category);
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="space-y-0.5">
        {/* Workspace sections */}
        {workspacePages.map((workspace) => (
          <WorkspaceSection
            key={workspace.id}
            workspace={workspace}
            onPageSelect={onPageSelect}
            onCreatePage={onCreatePage}
            onDeletePage={onDeletePage}
            selectedPageId={selectedPageId}
          />
        ))}

        {/* Regular uncategorized pages (fallback for pages without workspace) */}
        {regularPages.length > 0 && (
          <SortableContext items={regularPages.map((p) => p.id)} strategy={verticalListSortingStrategy}>
            {regularPages.map((page) => (
              <SortablePageNode
                key={page.id}
                page={page}
                onPageSelect={onPageSelect}
                onCreatePage={onCreatePage}
                onDeletePage={onDeletePage}
                selectedPageId={selectedPageId}
                level={0}
              />
            ))}
          </SortableContext>
        )}

        <button
          onClick={() => onCreatePage?.()}
          className="flex items-center gap-2 px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-200/70 rounded-md w-full mt-2 transition-colors font-medium"
        >
          <Plus size={16} />
          <span>새 페이지</span>
        </button>
      </div>
    </DndContext>
  );
}

function flattenPages(pages: PageTreeNode[]): PageTreeNode[] {
  const result: PageTreeNode[] = [];
  function traverse(nodes: PageTreeNode[]) {
    nodes.forEach((node) => {
      result.push(node);
      if (node.children && node.children.length > 0) {
        traverse(node.children);
      }
    });
  }
  traverse(pages);
  return result;
}

interface WorkspaceSectionProps {
  workspace: PageTreeNode;
  onPageSelect?: (pageId: string) => void;
  onCreatePage?: (parentId?: string) => void;
  onDeletePage?: (pageId: string) => void;
  selectedPageId?: string;
}

function WorkspaceSection({ workspace, onPageSelect, onCreatePage, onDeletePage, selectedPageId }: WorkspaceSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const children = workspace.children || [];

  return (
    <div className="mb-2">
      {/* Workspace header */}
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-gray-200/50 transition-colors group"
      >
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-0.5 hover:bg-gray-300/50 rounded transition-colors"
        >
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        <div
          onClick={() => onPageSelect?.(workspace.id)}
          className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
        >
          {workspace.icon ? (
            <span className="text-base">{workspace.icon}</span>
          ) : (
            <Building2 size={16} className="flex-shrink-0 text-gray-500" />
          )}
          <span className="text-sm font-semibold text-gray-700 truncate">{workspace.title}</span>
          <span className="text-xs text-gray-400 font-normal">{children.length}</span>
        </div>

        {isHovered && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCreatePage?.(workspace.id);
            }}
            className="p-1 hover:bg-gray-300/50 rounded transition-colors"
            title="페이지 추가"
          >
            <Plus size={14} className="text-gray-500" />
          </button>
        )}
      </div>

      {/* Workspace children */}
      {isExpanded && (
        <SortableContext items={children.map((p) => p.id)} strategy={verticalListSortingStrategy}>
          {children.map((page) => (
            <SortablePageNode
              key={page.id}
              page={page}
              onPageSelect={onPageSelect}
              onCreatePage={onCreatePage}
              onDeletePage={onDeletePage}
              selectedPageId={selectedPageId}
              level={1}
            />
          ))}
          {children.length === 0 && (
            <div className="pl-10 py-2 text-xs text-gray-400">
              아직 페이지가 없습니다
            </div>
          )}
        </SortableContext>
      )}
    </div>
  );
}

interface PageNodeProps {
  page: PageTreeNode;
  onPageSelect?: (pageId: string) => void;
  onCreatePage?: (parentId?: string) => void;
  onDeletePage?: (pageId: string) => void;
  selectedPageId?: string;
  level: number;
  dragHandleProps?: Record<string, any>;
}

function SortablePageNode(props: Omit<PageNodeProps, 'dragHandleProps'>) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.page.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <PageNode {...props} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

function PageNode({ page, onPageSelect, onCreatePage, onDeletePage, selectedPageId, level, dragHandleProps }: PageNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const hasChildren = page.children && page.children.length > 0;
  const isSelected = selectedPageId === page.id;

  return (
    <div>
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`group flex items-center gap-1 px-2 py-1.5 text-sm rounded-md cursor-pointer transition-colors ${
          isSelected
            ? 'bg-gray-200/80 text-gray-900 font-medium'
            : 'text-gray-700 hover:bg-gray-200/50'
        }`}
        style={{ paddingLeft: `${level * 20 + 8}px` }}
      >
        {/* Drag handle */}
        <div
          {...dragHandleProps}
          className={`p-0.5 rounded transition-all cursor-grab active:cursor-grabbing ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={14} className="text-gray-400" />
        </div>

        {hasChildren ? (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-0.5 hover:bg-gray-300/50 rounded transition-colors"
          >
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        ) : (
          <span className="w-5" />
        )}
        <div
          onClick={() => onPageSelect?.(page.id)}
          className="flex items-center gap-2 flex-1 min-w-0"
        >
          {page.icon ? (
            <span className="text-base">{page.icon}</span>
          ) : (
            <FileText size={16} className="flex-shrink-0 text-gray-500" />
          )}
          <span className="truncate">{page.title}</span>
        </div>
        {(isHovered || isSelected) && (
          <div className="flex items-center gap-0.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCreatePage?.(page.id);
              }}
              className="p-1 hover:bg-gray-300/50 rounded transition-colors"
              title="하위 페이지 추가"
            >
              <Plus size={14} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeletePage?.(page.id);
              }}
              className="p-1 hover:bg-red-100 hover:text-red-600 rounded transition-colors"
              title="휴지통으로 이동"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>
      {isExpanded && hasChildren && (
        <SortableContext items={page.children!.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {page.children!.map((child) => (
            <SortablePageNode
              key={child.id}
              page={child}
              onPageSelect={onPageSelect}
              onCreatePage={onCreatePage}
              onDeletePage={onDeletePage}
              selectedPageId={selectedPageId}
              level={level + 1}
            />
          ))}
        </SortableContext>
      )}
    </div>
  );
}
