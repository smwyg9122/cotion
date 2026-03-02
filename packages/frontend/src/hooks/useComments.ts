import { useState, useCallback } from 'react';
import { api } from '../services/api';

export interface Comment {
  id: string;
  page_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_name: string;
  username: string;
}

export function useComments() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchComments = useCallback(async (pageId: string) => {
    setIsLoading(true);
    try {
      const res = await api.get(`/comments/${pageId}`);
      setComments(res.data.data);
    } catch {
      setComments([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addComment = useCallback(async (pageId: string, content: string, mentionedUserIds?: string[]) => {
    const res = await api.post(`/comments/${pageId}`, { content });
    setComments((prev) => [...prev, res.data.data]);

    // Send mention notifications
    if (mentionedUserIds?.length) {
      for (const userId of mentionedUserIds) {
        api.post('/notifications/mention', {
          mentionedUserId: userId,
          pageId,
        }).catch(() => {});
      }
    }
  }, []);

  const removeComment = useCallback(async (commentId: string) => {
    await api.delete(`/comments/${commentId}`);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }, []);

  return { comments, isLoading, fetchComments, addComment, removeComment };
}
