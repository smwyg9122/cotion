import React, { useState } from 'react';
import { PageTreeNode } from '@cotion/shared';
import { ChevronRight, ChevronDown, FileText, Plus, Trash2, GripVertical, Folder } from 'lucide-react';
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
  onCreatePage?: (parentId?: string, category?: string) => void;
  onDeletePage?: (pageId: string) => void;
  onMovePage?: (pageId: string, newParentId?: string, position?: number, category?: string) => void;
  selectedPageId?: string;
}

export function PageTree({ pages, onPageSelect, onCreatePage, onDeletePage, onMovePage, selectedPageId }: PageTreeProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Group root pages by category
  const categoryMap = new Map<string, PageTreeNode[]>();
  const uncategorized: PageTreeNode[] = [];

  pages.forEach((page) => {
    if (page.category) {
      if (!categoryMap.has(page.category)) {
        categoryMap.set(page.category, []);
      }
      categoryMap.get(page.category)!.push(page);
    } else {
      uncategorized.push(page);
    }
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!active || !over || active.id === over.id) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const allPages = flattenPages(pages);
    const activePage = allPages.find((p) => p.id === activeId);
    const overPage = allPages.find((p) => p.id === overId);

    if (!activePage || !overPage) return;

    const activeParentId = (activePage as any).parent_id;
    const overParentId = (overPage as any).parent_id;

    if (activeParentId === overParentId) {
      const activeCat = (activePage as any).category || '';
      const overCat = (overPage as any).category || '';

      if (!activeParentId && activeCat !== overCat) return;

      const parentId = activeParentId;
      let siblings: PageTreeNode[];
      if (parentId) {
        const parent = allPages.find((p) => p.id === parentId);
        siblings = parent?.children || [];
      } else {
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
        {Array.from(categoryMap.entries()).map(([category, categoryPages]) => (
          <CategorySection
            key={category}
            name={category}
            pages={categoryPages}
            onPageSelect={onPageSelect}
            onCreatePage={onCreatePage}
            onDeletePage={onDeletePage}
            selectedPageId={selectedPageId}
          />
        ))}

        <SortableContext items={uncategorized.map((p) => p.id)} strategy={verticalListSortingStrategy}>
          {uncategorized.map((page) => (
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

        {pages.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-gray-400">페이지 없음</div>
        )}
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

interface CategorySectionProps {
  name: string;
  pages: PageTreeNode[];
  onPageSelect?: (pageId: string) => void;
  onCreatePage?: (parentId?: string, category?: string) => void;
  onDeletePage?: (pageId: string) => void;
  selectedPageId?: string;
}

function CategorySection({ name, pages, onPageSelect, onCreatePage, onDeletePage, selectedPageId }: CategorySectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="mb-1">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-200/50 rounded-md w-full transition-colors uppercase tracking-wide"
      >
        {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <Folder size={12} />
        <span className="flex-1 text-left">{name}</span>
        <span className="text-gray-400 font-normal normal-case tracking-normal">{pages.length}</span>
      </button>
      {isExpanded && (
        <SortableContext items={pages.map((p) => p.id)} strategy={verticalListSortingStrategy}>
          {pages.map((page) => (
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
    </div>
  );
}

interface PageNodeProps {
  page: PageTreeNode;
  onPageSelect?: (pageId: string) => void;
  onCreatePage?: (parentId?: string, category?: string) => void;
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
