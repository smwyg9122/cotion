export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string; // ISO date string
  endDate?: string; // ISO date string
  allDay: boolean;
  color?: string; // hex color for display
  workspace: string;
  pageId?: string; // linked page (for deadlines)
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CalendarEventCreateInput {
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  allDay?: boolean;
  color?: string;
  workspace: string;
  pageId?: string;
}

export interface CalendarEventUpdateInput {
  title?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  allDay?: boolean;
  color?: string;
  pageId?: string | null;
}
