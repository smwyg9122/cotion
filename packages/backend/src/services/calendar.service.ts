import { db } from '../database/connection';
import { AppError } from '../middleware/error.middleware';
import { API_ERRORS } from '@cotion/shared';
import { CalendarEvent, CalendarEventCreateInput, CalendarEventUpdateInput } from '@cotion/shared';
import { NotificationsService } from './notifications.service';

// Helper function to transform snake_case DB columns to camelCase for API response
function mapEventToResponse(event: any, attendees?: string[]): CalendarEvent {
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
    attendees: attendees || [],
    createdBy: event.created_by,
    createdAt: event.created_at,
    updatedAt: event.updated_at,
  };
}

// Helper to fetch attendees for a list of events
async function fetchEventAttendees(eventIds: string[]): Promise<Record<string, string[]>> {
  if (eventIds.length === 0) return {};

  const rows = await db('calendar_event_attendees')
    .whereIn('event_id', eventIds)
    .select('event_id', 'user_id');

  const map: Record<string, string[]> = {};
  for (const row of rows) {
    if (!map[row.event_id]) map[row.event_id] = [];
    map[row.event_id].push(row.user_id);
  }
  return map;
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

    const eventIds = events.map((e: any) => e.id);
    const attendeesMap = await fetchEventAttendees(eventIds);

    return events.map((e: any) => mapEventToResponse(e, attendeesMap[e.id] || []));
  }

  static async getEventById(id: string): Promise<CalendarEvent | null> {
    const event = await db('calendar_events')
      .where({ id })
      .first();

    if (!event) return null;

    const attendeesMap = await fetchEventAttendees([id]);
    return mapEventToResponse(event, attendeesMap[id] || []);
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

    // Insert attendees
    const attendees = input.attendees || [];
    if (attendees.length > 0) {
      const attendeeRows = attendees.map((uid: string) => ({
        event_id: event.id,
        user_id: uid,
      }));
      await db('calendar_event_attendees').insert(attendeeRows);

      // 인앱 알림 + 카카오톡 알림
      const ws = input.workspace || '';
      NotificationsService.notifyMany(
        attendees,
        userId,
        'calendar_invite',
        `[${ws}] "${input.title}" 일정에 참석자로 추가되었습니다.`,
        `[${ws}] 캘린더 일정 초대`
      ).catch(() => {});
    }

    return mapEventToResponse(event, attendees);
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

    // Update attendees if provided
    let finalAttendees: string[] = [];
    if (input.attendees !== undefined) {
      // Get old attendees for comparison
      const oldRows = await db('calendar_event_attendees').where({ event_id: id }).select('user_id');
      const oldAttendeeIds = oldRows.map((r: any) => r.user_id);

      await db('calendar_event_attendees').where({ event_id: id }).delete();

      if (input.attendees.length > 0) {
        const attendeeRows = input.attendees.map((uid: string) => ({
          event_id: id,
          user_id: uid,
        }));
        await db('calendar_event_attendees').insert(attendeeRows);

        // Notify newly added attendees only
        const newAttendees = input.attendees.filter((uid: string) => !oldAttendeeIds.includes(uid));
        if (newAttendees.length > 0) {
          const eventTitle = input.title || event.title;
          const ws = event.workspace || '';
          NotificationsService.notifyMany(
            newAttendees,
            userId,
            'calendar_invite',
            `[${ws}] "${eventTitle}" 일정에 참석자로 추가되었습니다.`,
            `[${ws}] 캘린더 일정 초대`
          ).catch(() => {});
        }
      }
      finalAttendees = input.attendees;
    } else {
      const rows = await db('calendar_event_attendees').where({ event_id: id }).select('user_id');
      finalAttendees = rows.map((r: any) => r.user_id);
    }

    return mapEventToResponse(updatedEvent, finalAttendees);
  }

  static async deleteEvent(id: string, userId: string): Promise<void> {
    const event = await db('calendar_events')
      .where({ id })
      .first();

    if (!event) {
      throw new AppError(404, API_ERRORS.NOT_FOUND, '이벤트를 찾을 수 없습니다');
    }

    // Attendees are deleted via CASCADE
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
