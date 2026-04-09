import { db } from '../database/connection';
import { AppError } from '../middleware/error.middleware';
import { API_ERRORS } from '@cotion/shared';
import { CalendarEvent, CalendarEventCreateInput, CalendarEventUpdateInput } from '@cotion/shared';

// Helper function to transform snake_case DB columns to camelCase for API response
function mapEventToResponse(event: any): CalendarEvent {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    startDate: event.start_date,
    endDate: event.end_date,
    allDay: event.all_day,
    color: event.color,
    workspace: event.workspace,
    pageId: event.page_id,
    createdBy: event.created_by,
    createdAt: event.created_at,
    updatedAt: event.updated_at,
  };
}

function mapEventsToResponse(events: any[]): CalendarEvent[] {
  return events.map(mapEventToResponse);
}

export class CalendarService {
  static async getEvents(
    workspace: string,
    startDate: string,
    endDate: string
  ): Promise<CalendarEvent[]> {
    const events = await db('calendar_events')
      .where({ workspace })
      .whereBetween('start_date', [startDate, endDate])
      .orderBy('start_date', 'asc')
      .select('*');

    return mapEventsToResponse(events);
  }

  static async getEventById(id: string): Promise<CalendarEvent | null> {
    const event = await db('calendar_events')
      .where({ id })
      .first();

    return event ? mapEventToResponse(event) : null;
  }

  static async createEvent(input: CalendarEventCreateInput, userId: string): Promise<CalendarEvent> {
    const [event] = await db('calendar_events')
      .insert({
        title: input.title,
        description: input.description || null,
        start_date: input.startDate,
        end_date: input.endDate || null,
        all_day: input.allDay ?? true,
        color: input.color || null,
        workspace: input.workspace,
        page_id: input.pageId || null,
        created_by: userId,
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      })
      .returning('*');

    return mapEventToResponse(event);
  }

  static async updateEvent(
    id: string,
    input: CalendarEventUpdateInput,
    userId: string
  ): Promise<CalendarEvent> {
    const event = await db('calendar_events')
      .where({ id })
      .first();

    if (!event) {
      throw new AppError(404, API_ERRORS.NOT_FOUND, '이벤트를 찾을 수 없습니다');
    }

    const updateFields: any = { updated_at: db.fn.now() };
    if (input.title !== undefined) updateFields.title = input.title;
    if (input.description !== undefined) updateFields.description = input.description;
    if (input.startDate !== undefined) updateFields.start_date = input.startDate;
    if (input.endDate !== undefined) updateFields.end_date = input.endDate;
    if (input.allDay !== undefined) updateFields.all_day = input.allDay;
    if (input.color !== undefined) updateFields.color = input.color;
    if (input.pageId !== undefined) updateFields.page_id = input.pageId;

    const [updatedEvent] = await db('calendar_events')
      .where({ id })
      .update(updateFields)
      .returning('*');

    return mapEventToResponse(updatedEvent);
  }

  static async deleteEvent(id: string, userId: string): Promise<void> {
    const event = await db('calendar_events')
      .where({ id })
      .first();

    if (!event) {
      throw new AppError(404, API_ERRORS.NOT_FOUND, '이벤트를 찾을 수 없습니다');
    }

    await db('calendar_events')
      .where({ id })
      .delete();
  }

  static async getPageDeadlines(workspace: string): Promise<any[]> {
    const pages = await db('pages')
      .where({ workspace, is_deleted: false })
      .whereNotNull('deadline')
      .select('id', 'title', 'icon', 'deadline', 'workspace', 'category')
      .orderBy('deadline', 'asc');

    return pages;
  }
}
