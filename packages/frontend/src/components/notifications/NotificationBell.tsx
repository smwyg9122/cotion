import React, { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const past = new Date(dateStr).getTime();
  const diff = now - past;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '방금';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return new Date(dateStr).toLocaleDateString('ko-KR');
}

interface NotificationBellProps {
  onPageSelect: (pageId: string) => void;
}

export function NotificationBell({ onPageSelect }: NotificationBellProps) {
  const { notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleToggle() {
    if (!isOpen) fetchNotifications();
    setIsOpen(!isOpen);
  }

  function handleClickNotification(n: typeof notifications[0]) {
    if (!n.is_read) markAsRead(n.id);
    if (n.page_id) onPageSelect(n.page_id);
    setIsOpen(false);
  }

  // Notification type to icon/label
  function getTypeLabel(type: string) {
    switch (type) {
      case 'mention': return '멘션';
      case 'comment': return '댓글';
      case 'task_assign': return '업무';
      case 'calendar_invite': return '일정';
      case 'document_tag': return '문서';
      default: return '알림';
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleToggle}
        aria-label="알림"
        className="relative p-2 text-gray-500 hover:text-gray-700 transition-colors"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 max-h-[28rem] overflow-y-auto z-50">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-xl">
            <span className="text-sm font-bold text-gray-800">알림</span>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                모두 읽음
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">알림이 없습니다</div>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleClickNotification(n)}
                className={`w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-50 transition-colors ${
                  n.is_read ? 'text-gray-500' : 'text-gray-900 bg-blue-50/40'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className={`inline-block mt-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                    n.is_read ? 'bg-gray-100 text-gray-400' : 'bg-blue-100 text-blue-600'
                  }`}>
                    {getTypeLabel(n.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-relaxed break-words">{n.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {n.triggered_by_name && (
                        <span className="text-xs text-gray-400">{n.triggered_by_name}</span>
                      )}
                      <span className="text-xs text-gray-300">{timeAgo(n.created_at)}</span>
                    </div>
                  </div>
                  {!n.is_read && (
                    <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
