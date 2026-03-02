import React, { useEffect, useState, useRef } from 'react';
import { useComments, Comment } from '../../hooks/useComments';
import { api } from '../../services/api';
import { MessageSquare, Send, Trash2 } from 'lucide-react';

interface CommentSectionProps {
  pageId: string;
  userId: string;
  userName: string;
}

interface UserOption {
  id: string;
  name: string;
  username: string;
}

export function CommentSection({ pageId, userId, userName }: CommentSectionProps) {
  const { comments, isLoading, fetchComments, addComment, removeComment } = useComments();
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mentionedUsers, setMentionedUsers] = useState<UserOption[]>([]);

  // Mention dropdown state
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionUsers, setMentionUsers] = useState<UserOption[]>([]);
  const [mentionIndex, setMentionIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchComments(pageId);
  }, [pageId, fetchComments]);

  // Fetch users for mention dropdown
  useEffect(() => {
    if (!showMentionList) return;
    api.get('/auth/users').then((res) => {
      const users = res.data.data as UserOption[];
      const filtered = users.filter(
        (u) =>
          u.name.toLowerCase().includes(mentionQuery.toLowerCase()) ||
          u.username.toLowerCase().includes(mentionQuery.toLowerCase())
      );
      setMentionUsers(filtered.slice(0, 5));
      setMentionIndex(0);
    }).catch(() => setMentionUsers([]));
  }, [showMentionList, mentionQuery]);

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setInput(val);

    // Detect @ mention
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      setShowMentionList(true);
      setMentionQuery(mentionMatch[1]);
    } else {
      setShowMentionList(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (showMentionList && mentionUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((prev) => (prev + 1) % mentionUsers.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex((prev) => (prev + mentionUsers.length - 1) % mentionUsers.length);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        selectMentionUser(mentionUsers[mentionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setShowMentionList(false);
        return;
      }
    }

    // Submit with Cmd/Ctrl+Enter
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  }

  function selectMentionUser(user: UserOption) {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const textBefore = input.slice(0, cursorPos);
    const textAfter = input.slice(cursorPos);
    const beforeMention = textBefore.replace(/@\w*$/, '');

    setInput(`${beforeMention}@${user.name} ${textAfter}`);
    setMentionedUsers((prev) => {
      if (prev.find((u) => u.id === user.id)) return prev;
      return [...prev, user];
    });
    setShowMentionList(false);

    setTimeout(() => {
      const newPos = beforeMention.length + user.name.length + 2;
      textarea.focus();
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  }

  async function handleSubmit() {
    const trimmed = input.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const mentionIds = mentionedUsers.map((u) => u.id).filter((id) => id !== userId);
      await addComment(pageId, trimmed, mentionIds.length > 0 ? mentionIds : undefined);
      setInput('');
      setMentionedUsers([]);
    } catch {
      // Error handled silently
    } finally {
      setIsSubmitting(false);
    }
  }

  function formatTime(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return '방금 전';
    if (diffMin < 60) return `${diffMin}분 전`;
    if (diffHour < 24) return `${diffHour}시간 전`;
    if (diffDay < 7) return `${diffDay}일 전`;
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
  }

  function getInitial(name: string) {
    return name.charAt(0).toUpperCase();
  }

  function renderContent(content: string) {
    // Highlight @mentions in content
    return content.replace(/@(\S+)/g, '<span class="comment-mention">@$1</span>');
  }

  return (
    <div className="comment-section">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare size={18} className="text-gray-500" />
        <h3 className="text-sm font-semibold text-gray-700">댓글 ({comments.length})</h3>
      </div>

      {/* Comment list */}
      <div className="space-y-3 mb-4">
        {isLoading ? (
          <div className="text-sm text-gray-400 text-center py-4">댓글 로딩 중...</div>
        ) : comments.length === 0 ? (
          <div className="text-sm text-gray-400 text-center py-4">아직 댓글이 없습니다</div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="comment-item">
              <div className="comment-avatar">
                {getInitial(comment.user_name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-semibold text-gray-800">{comment.user_name}</span>
                  <span className="text-xs text-gray-400">{formatTime(comment.created_at)}</span>
                  {comment.user_id === userId && (
                    <button
                      onClick={() => removeComment(comment.id)}
                      className="ml-auto p-1 text-gray-300 hover:text-red-500 transition-colors"
                      title="삭제"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
                <div
                  className="text-sm text-gray-700 whitespace-pre-wrap break-words"
                  dangerouslySetInnerHTML={{ __html: renderContent(comment.content) }}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Comment input */}
      <div className="relative">
        <div className="comment-input-wrapper">
          <div className="comment-avatar-sm">
            {getInitial(userName)}
          </div>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="댓글을 입력하세요... (@로 멘션)"
            rows={2}
            className="flex-1 resize-none border-none outline-none text-sm text-gray-700 placeholder-gray-400 bg-transparent"
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || isSubmitting}
            className="p-1.5 text-blue-600 hover:text-blue-700 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors self-end"
          >
            <Send size={16} />
          </button>
        </div>
        <div className="text-xs text-gray-400 mt-1 ml-10">Cmd+Enter로 전송</div>

        {/* Mention dropdown */}
        {showMentionList && mentionUsers.length > 0 && (
          <div className="absolute bottom-full left-8 mb-1 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden max-h-40 w-56 z-10">
            {mentionUsers.map((user, index) => (
              <button
                key={user.id}
                onClick={() => selectMentionUser(user)}
                className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
                  index === mentionIndex ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'
                }`}
              >
                <span className="font-medium">{user.name}</span>
                <span className="text-gray-400">@{user.username}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
