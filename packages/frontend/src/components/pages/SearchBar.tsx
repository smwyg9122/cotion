import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import type { Page } from '@cotion/shared';

interface SearchBarProps {
  onSearch: (query: string) => Promise<Page[]>;
  onPageSelect: (pageId: string) => void;
}

export function SearchBar({ onSearch, onPageSelect }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Page[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const data = await onSearch(query);
        setResults(data);
        setIsOpen(true);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, onSearch]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(pageId: string) {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    onPageSelect(pageId);
  }

  function handleClear() {
    setQuery('');
    setResults([]);
    setIsOpen(false);
  }

  return (
    <div className="relative px-2 mb-2" ref={containerRef}>
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="검색..."
          className="w-full pl-8 pr-8 py-1.5 text-sm bg-gray-200/50 rounded-md border-none outline-none focus:bg-gray-200 focus:ring-1 focus:ring-gray-300 placeholder-gray-400 transition-colors"
        />
        {query && (
          <button onClick={handleClear} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X size={14} />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute left-2 right-2 top-full mt-1 bg-white rounded-md shadow-lg border border-gray-200 max-h-64 overflow-y-auto z-50">
          {isSearching ? (
            <div className="px-3 py-2 text-sm text-gray-400">검색 중...</div>
          ) : results.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-400">결과 없음</div>
          ) : (
            results.map((page) => (
              <button
                key={page.id}
                onClick={() => handleSelect(page.id)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 transition-colors"
              >
                <span>{page.icon || '📄'}</span>
                <span className="truncate">{page.title}</span>
                {page.category && (
                  <span className="ml-auto text-xs text-gray-400 flex-shrink-0">{page.category}</span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
