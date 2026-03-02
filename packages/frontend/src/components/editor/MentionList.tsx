import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';

interface MentionListProps {
  items: { id: string; name: string; username: string }[];
  command: (item: { id: string; label: string }) => void;
}

export const MentionList = forwardRef<any, MentionListProps>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => setSelectedIndex(0), [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((prev) => (prev + props.items.length - 1) % props.items.length);
        return true;
      }
      if (event.key === 'ArrowDown') {
        setSelectedIndex((prev) => (prev + 1) % props.items.length);
        return true;
      }
      if (event.key === 'Enter') {
        const item = props.items[selectedIndex];
        if (item) props.command({ id: item.id, label: item.name });
        return true;
      }
      return false;
    },
  }));

  if (props.items.length === 0) {
    return <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-2 text-sm text-gray-400">결과 없음</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden max-h-48 overflow-y-auto">
      {props.items.map((item, index) => (
        <button
          key={item.id}
          onClick={() => props.command({ id: item.id, label: item.name })}
          className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
            index === selectedIndex ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'
          }`}
        >
          <span className="font-medium">{item.name}</span>
          <span className="text-gray-400">@{item.username}</span>
        </button>
      ))}
    </div>
  );
});
