import React, { useState } from 'react';
import { PageTreeNode } from '@cotion/shared';
import { ChevronRight, ChevronDown, FileText, Plus, Trash2, Folder } from 'lucide-react';

interface PageTreeProps {
  pages: PageTreeNode[];
  onPageSelect?: (pageId: string) => void;
  onCreatePage?: (parentId?: string) => void;
  onDeletePage?: (pageId: string) => void;
  selectedPageId?: string;
}

export function PageTree({ pages, onPageSelect, onCreatePage, onDeletePage, selectedPageId }: PageTreeProps) {
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

  return (
    <div className="space-y-0.5">
      {/* Categorized page groups */}
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

      {/* Uncategorized pages */}
      {uncategorized.map((page) => (
        <PageNode
          key={page.id}
          page={page}
          onPageSelect={onPageSelect}
          onCreatePage={onCreatePage}
          onDeletePage={onDeletePage}
          selectedPageId={selectedPageId}
          level={0}
        />
      ))}

      <button
        onClick={() => onCreatePage?.()}
        className="flex items-center gap-2 px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-200/70 rounded-md w-full mt-2 transition-colors font-medium"
      >
        <Plus size={16} />
        <span>새 페이지</span>
      </button>
    </div>
  );
}

interface CategorySectionProps {
  name: string;
  pages: PageTreeNode[];
  onPageSelect?: (pageId: string) => void;
  onCreatePage?: (parentId?: string) => void;
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
        <div>
          {pages.map((page) => (
            <PageNode
              key={page.id}
              page={page}
              onPageSelect={onPageSelect}
              onCreatePage={onCreatePage}
              onDeletePage={onDeletePage}
              selectedPageId={selectedPageId}
              level={0}
            />
          ))}
        </div>
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
}

function PageNode({ page, onPageSelect, onCreatePage, onDeletePage, selectedPageId, level }: PageNodeProps) {
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
        <div>
          {page.children!.map((child) => (
            <PageNode
              key={child.id}
              page={child}
              onPageSelect={onPageSelect}
              onCreatePage={onCreatePage}
              onDeletePage={onDeletePage}
              selectedPageId={selectedPageId}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
