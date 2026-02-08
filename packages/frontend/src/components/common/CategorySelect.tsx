import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Tag } from 'lucide-react';

interface CategorySelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
}

export function CategorySelect({ value, onChange, options, placeholder = '카테고리 입력 또는 선택' }: CategorySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = options.filter(
    (opt) => opt.toLowerCase().includes(inputValue.toLowerCase()) && opt !== inputValue
  );

  function handleSelect(opt: string) {
    setInputValue(opt);
    onChange(opt);
    setIsOpen(false);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInputValue(e.target.value);
    onChange(e.target.value);
    setIsOpen(true);
  }

  function handleClear() {
    setInputValue('');
    onChange('');
    inputRef.current?.focus();
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors ${
          isOpen ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-300 hover:border-gray-400'
        } bg-white`}
      >
        <Tag size={14} className="text-gray-400 flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="flex-1 outline-none bg-transparent text-gray-700 placeholder-gray-400 min-w-0"
        />
        {inputValue && (
          <button
            type="button"
            onClick={handleClear}
            className="p-0.5 text-gray-400 hover:text-gray-600 rounded transition-colors"
          >
            <X size={12} />
          </button>
        )}
        {options.length > 0 && (
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-0.5 text-gray-400 hover:text-gray-600 rounded transition-colors"
          >
            <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {isOpen && (filtered.length > 0 || (options.length > 0 && !inputValue)) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="py-1 max-h-48 overflow-y-auto">
            {(inputValue ? filtered : options).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => handleSelect(opt)}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center gap-2 ${
                  opt === value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                }`}
              >
                <Tag size={12} className="flex-shrink-0 opacity-60" />
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
