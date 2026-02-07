import { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { Page, PageCreateInput, PageUpdateInput, PageTreeNode } from '@cotion/shared';

export function usePages() {
  const [pages, setPages] = useState<PageTreeNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPages();
  }, []);

  async function fetchPages() {
    try {
      setIsLoading(true);
      const response = await api.get('/pages');
      setPages(response.data.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '페이지를 불러오는데 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  }

  async function createPage(input: PageCreateInput): Promise<Page> {
    const response = await api.post('/pages', input);
    await fetchPages(); // Refresh the tree
    return response.data.data;
  }

  async function updatePage(id: string, input: PageUpdateInput): Promise<Page> {
    const response = await api.put(`/pages/${id}`, input);
    await fetchPages();
    return response.data.data;
  }

  async function deletePage(id: string): Promise<void> {
    await api.delete(`/pages/${id}`);
    await fetchPages();
  }

  async function getPage(id: string): Promise<Page> {
    const response = await api.get(`/pages/${id}`);
    return response.data.data;
  }

  return {
    pages,
    isLoading,
    error,
    createPage,
    updatePage,
    deletePage,
    getPage,
    refreshPages: fetchPages,
  };
}
