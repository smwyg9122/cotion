import { useState, useCallback } from 'react';
import { api } from '../services/api';
import { CalendarEvent, CalendarEventCreateInput, CalendarEventUpdateInput } from '@cotion/shared';

interface PageDeadline {
  id: string;
  title: string;
  icon?: string;
  deadline: string;
  workspace: string;
  category?: string;
}

export function useCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [deadlines, setDeadlines] = useState<PageDeadline[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchEvents = useCallback(async (workspace: string, startDate: string, endDate: string, showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      const response = await api.get('/calendar', {
        params: { workspace, startDate, endDate }
      });
      setEvents(response.data.data);
    } catch (error) {
      console.error('Failed to fetch calendar events:', error);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  const fetchDeadlines = useCallback(async (workspace: string) => {
    try {
      const response = await api.get('/calendar/deadlines', {
        params: { workspace }
      });
      setDeadlines(response.data.data);
    } catch (error) {
      console.error('Failed to fetch deadlines:', error);
    }
  }, []);

  const createEvent = useCallback(async (input: CalendarEventCreateInput): Promise<CalendarEvent | null> => {
    try {
      const response = await api.post('/calendar', input);
      return response.data.data;
    } catch (error) {
      console.error('Failed to create event:', error);
      return null;
    }
  }, []);

  const updateEvent = useCallback(async (id: string, input: CalendarEventUpdateInput): Promise<CalendarEvent | null> => {
    try {
      const response = await api.put(`/calendar/${id}`, input);
      return response.data.data;
    } catch (error) {
      console.error('Failed to update event:', error);
      return null;
    }
  }, []);

  const deleteEvent = useCallback(async (id: string): Promise<boolean> => {
    try {
      await api.delete(`/calendar/${id}`);
      return true;
    } catch (error) {
      console.error('Failed to delete event:', error);
      return false;
    }
  }, []);

  return {
    events,
    deadlines,
    isLoading,
    fetchEvents,
    fetchDeadlines,
    createEvent,
    updateEvent,
    deleteEvent,
  };
}
