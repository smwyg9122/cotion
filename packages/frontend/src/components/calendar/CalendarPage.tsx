import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  FileText,
  X,
  Trash2,
  Edit,
} from 'lucide-react';
import { api } from '../../services/api';
import { Modal } from '../common/Modal';

interface CalendarPageProps {
  workspace: string;
  onNavigateToPage?: (pageId: string) => void;
}

interface EventWithPageDeadline {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  allDay: boolean;
  color?: string;
  workspace: string;
  pageId?: string;
  isDeadline?: boolean;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface EventModalData {
  title: string;
  description: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  allDay: boolean;
  color: string;
  workspace: string;
}

const COLORS = [
  { name: 'Red', value: '#ef4444', tailwind: 'bg-red-500' },
  { name: 'Orange', value: '#f97316', tailwind: 'bg-orange-500' },
  { name: 'Yellow', value: '#eab308', tailwind: 'bg-yellow-500' },
  { name: 'Green', value: '#22c55e', tailwind: 'bg-green-500' },
  { name: 'Blue', value: '#3b82f6', tailwind: 'bg-blue-500' },
  { name: 'Purple', value: '#a855f7', tailwind: 'bg-purple-500' },
  { name: 'Pink', value: '#ec4899', tailwind: 'bg-pink-500' },
  { name: 'Gray', value: '#6b7280', tailwind: 'bg-gray-500' },
];

const KOREAN_DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const KOREAN_MONTHS = [
  '1월', '2월', '3월', '4월', '5월', '6월',
  '7월', '8월', '9월', '10월', '11월', '12월',
];

export function CalendarPage({ workspace, onNavigateToPage }: CalendarPageProps) {
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<EventWithPageDeadline[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventWithPageDeadline | null>(null);
  const [modalData, setModalData] = useState<EventModalData>({
    title: '',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endDate: new Date().toISOString().split('T')[0],
    endTime: '10:00',
    allDay: false,
    color: COLORS[4].value,
    workspace,
  });

  // Helper: get date range for current view
  const getViewStartDate = useCallback(() => {
    const d = new Date(currentDate);
    if (viewMode === 'month') {
      d.setDate(1);
      d.setDate(d.getDate() - d.getDay()); // go to start of week
    } else if (viewMode === 'week') {
      d.setDate(d.getDate() - d.getDay());
    }
    return d.toISOString().split('T')[0];
  }, [currentDate, viewMode]);

  const getViewEndDate = useCallback(() => {
    const d = new Date(currentDate);
    if (viewMode === 'month') {
      d.setMonth(d.getMonth() + 1, 0); // last day of month
      d.setDate(d.getDate() + (6 - d.getDay())); // go to end of week
    } else if (viewMode === 'week') {
      d.setDate(d.getDate() - d.getDay() + 6);
    }
    return d.toISOString().split('T')[0];
  }, [currentDate, viewMode]);

  // Extract fetch logic into reusable function (Bug #2)
  const fetchEventsAndDeadlines = useCallback(async () => {
    setIsLoading(true);
    try {
      const startDate = getViewStartDate();
      const endDate = getViewEndDate();
      const [eventsRes, pagesRes] = await Promise.all([
        api.get('/calendar', { params: { workspace, startDate, endDate } }),
        api.get('/pages', { params: { workspace } }),
      ]);

      const allEvents: EventWithPageDeadline[] = eventsRes.data?.data || [];

      // Add page deadlines as calendar events
      const pagesData = pagesRes.data?.data;
      if (pagesData && Array.isArray(pagesData)) {
        const deadlines = pagesData
          .filter((page: any) => page.deadline)
          .map((page: any) => ({
            id: `deadline-${page.id}`,
            title: `${page.title}의 마감일`,
            startDate: page.deadline,
            endDate: page.deadline,
            allDay: true,
            color: '#9ca3af',
            workspace,
            isDeadline: true,
            pageId: page.id,
          }));
        allEvents.push(...deadlines);
      }

      setEvents(allEvents);
    } catch (error) {
      console.error('Failed to fetch calendar data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [workspace, getViewStartDate, getViewEndDate]);

  // Fetch events and deadlines (Bug #3: removed getViewStartDate/getViewEndDate from deps)
  useEffect(() => {
    fetchEventsAndDeadlines();
  }, [workspace, currentDate, viewMode, fetchEventsAndDeadlines]);

  // Date calculations
  const monthStart = useMemo(() => {
    return new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  }, [currentDate]);

  const monthEnd = useMemo(() => {
    return new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  }, [currentDate]);

  const firstDay = useMemo(() => {
    const date = new Date(monthStart);
    return date.getDay();
  }, [monthStart]);

  const daysInMonth = useMemo(() => monthEnd.getDate(), [monthEnd]);

  const weekStart = useMemo(() => {
    const date = new Date(currentDate);
    const day = date.getDay();
    const diff = date.getDate() - day;
    return new Date(date.setDate(diff));
  }, [currentDate]);

  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      days.push(date);
    }
    return days;
  }, [weekStart]);

  // Get events for specific date
  const getEventsForDate = useCallback((date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter((event) => {
      const eventStart = new Date(event.startDate).toISOString().split('T')[0];
      const eventEnd = event.endDate ? new Date(event.endDate).toISOString().split('T')[0] : eventStart;
      return dateStr >= eventStart && dateStr <= eventEnd;
    });
  }, [events]);

  // Get events for specific time slot
  const getEventsForTimeSlot = useCallback((date: Date, hour: number) => {
    const dateStr = date.toISOString().split('T')[0];
    const slotStart = `${hour.toString().padStart(2, '0')}:00`;
    const slotEnd = `${(hour + 1).toString().padStart(2, '0')}:00`;

    return events.filter((event) => {
      const eventStart = new Date(event.startDate).toISOString().split('T')[0];
      const eventEnd = event.endDate ? new Date(event.endDate).toISOString().split('T')[0] : eventStart;

      if (dateStr < eventStart || dateStr > eventEnd) return false;
      if (event.allDay) return false;

      const eventStartTime = event.startDate.split('T')[1]?.substring(0, 5) || '00:00';
      const eventEndTime = event.endDate?.split('T')[1]?.substring(0, 5) || '23:59';

      return eventStartTime < slotEnd && eventEndTime > slotStart;
    });
  }, [events]);

  // Navigation handlers
  const handlePrevious = useCallback(() => {
    setCurrentDate((date) => {
      const newDate = new Date(date);
      if (viewMode === 'month') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else if (viewMode === 'week') {
        newDate.setDate(newDate.getDate() - 7);
      } else {
        newDate.setDate(newDate.getDate() - 1);
      }
      return newDate;
    });
  }, [viewMode]);

  const handleNext = useCallback(() => {
    setCurrentDate((date) => {
      const newDate = new Date(date);
      if (viewMode === 'month') {
        newDate.setMonth(newDate.getMonth() + 1);
      } else if (viewMode === 'week') {
        newDate.setDate(newDate.getDate() + 7);
      } else {
        newDate.setDate(newDate.getDate() + 1);
      }
      return newDate;
    });
  }, [viewMode]);

  const handleToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  // Event handlers
  const handleCellClick = useCallback((date: Date, hour?: number) => {
    setSelectedEvent(null);
    const dateStr = date.toISOString().split('T')[0];
    setModalData({
      title: '',
      description: '',
      startDate: dateStr,
      startTime: hour !== undefined ? `${hour.toString().padStart(2, '0')}:00` : '09:00',
      endDate: dateStr,
      endTime: hour !== undefined ? `${(hour + 1).toString().padStart(2, '0')}:00` : '10:00',
      allDay: hour !== undefined ? false : true,
      color: COLORS[4].value,
      workspace,
    });
    setIsModalOpen(true);
  }, [workspace]);

  const handleEventClick = useCallback((event: EventWithPageDeadline, e: React.MouseEvent) => {
    e.stopPropagation();
    if (event.isDeadline && event.pageId && onNavigateToPage) {
      onNavigateToPage(event.pageId);
      return;
    }
    setSelectedEvent(event);
    setModalData({
      title: event.title,
      description: event.description || '',
      startDate: event.startDate.split('T')[0],
      startTime: event.startDate.split('T')[1]?.substring(0, 5) || '09:00',
      endDate: (event.endDate || event.startDate).split('T')[0],
      endTime: (event.endDate || event.startDate).split('T')[1]?.substring(0, 5) || '10:00',
      allDay: event.allDay || false,
      color: event.color || COLORS[4].value,
      workspace: event.workspace,
    });
    setIsModalOpen(true);
  }, [onNavigateToPage]);

  const handleSaveEvent = async () => {
    if (!modalData.title.trim()) return;

    try {
      const eventData = {
        title: modalData.title,
        description: modalData.description,
        startDate: modalData.allDay
          ? modalData.startDate
          : `${modalData.startDate}T${modalData.startTime}:00`,
        endDate: modalData.allDay
          ? modalData.endDate
          : `${modalData.endDate}T${modalData.endTime}:00`,
        allDay: modalData.allDay,
        color: modalData.color,
        ...(selectedEvent ? {} : { workspace: modalData.workspace }),
      };

      if (selectedEvent) {
        await api.put(`/calendar/${selectedEvent.id}`, eventData);
      } else {
        await api.post('/calendar', eventData);
      }

      await fetchEventsAndDeadlines();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to save event:', error);
      alert('이벤트 저장에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;

    try {
      await api.delete(`/calendar/${selectedEvent.id}`);
      setEvents((prev) => prev.filter((e) => e.id !== selectedEvent.id));
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to delete event:', error);
      alert('이벤트 삭제에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  };

  // Get title for current view
  const getViewTitle = () => {
    if (viewMode === 'month') {
      return `${currentDate.getFullYear()}년 ${KOREAN_MONTHS[currentDate.getMonth()]}`;
    } else if (viewMode === 'week') {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      return `${weekStart.getFullYear()}년 ${KOREAN_MONTHS[weekStart.getMonth()]} ${weekStart.getDate()}일 ~ ${weekEnd.getDate()}일`;
    } else {
      return `${currentDate.getFullYear()}년 ${KOREAN_MONTHS[currentDate.getMonth()]} ${currentDate.getDate()}일`;
    }
  };

  // Render month view
  const renderMonthView = () => {
    const calendarDays = [];

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      calendarDays.push(<div key={`empty-${i}`} className="bg-gray-50 min-h-24"></div>);
    }

    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayEvents = getEventsForDate(date);
      const isToday =
        date.toDateString() === new Date().toDateString();
      const isCurrentMonth = true;

      calendarDays.push(
        <div
          key={`day-${day}`}
          onClick={() => handleCellClick(date)}
          className={`min-h-24 p-2 cursor-pointer hover:bg-blue-50 border border-gray-200 transition-colors ${
            isToday ? 'bg-blue-50' : 'bg-white'
          }`}
        >
          <div
            className={`text-sm font-semibold mb-1 ${
              isToday ? 'text-blue-600' : 'text-gray-700'
            }`}
          >
            {day}
          </div>
          <div className="space-y-1">
            {dayEvents.slice(0, 2).map((event) => (
              <div
                key={event.id}
                onClick={(e) => handleEventClick(event, e)}
                style={{
                  backgroundColor: event.color || COLORS[4].value,
                }}
                className="text-xs text-white px-2 py-1 rounded-md truncate font-medium hover:shadow-md transition-shadow cursor-pointer flex items-center gap-1"
              >
                {event.isDeadline && <FileText size={12} />}
                <span>{event.title}</span>
              </div>
            ))}
            {dayEvents.length > 2 && (
              <div className="text-xs text-gray-500 px-2">+{dayEvents.length - 2}개</div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-7 gap-0 border border-gray-300 rounded-lg overflow-hidden shadow-sm">
        {/* Day headers */}
        {KOREAN_DAYS.map((day, idx) => (
          <div
            key={day}
            className={`py-3 text-center text-sm font-semibold ${
              idx === 0 || idx === 6 ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-700'
            }`}
          >
            {day}
          </div>
        ))}
        {/* Calendar cells */}
        {calendarDays}
      </div>
    );
  };

  // Render week view
  const renderWeekView = () => {
    const hours = Array.from({ length: 13 }, (_, i) => i + 8); // 8am to 8pm

    return (
      <div className="border border-gray-300 rounded-lg overflow-hidden shadow-sm bg-white">
        {/* Header */}
        <div className="grid grid-cols-8 border-b border-gray-300">
          <div className="py-3 px-2 bg-gray-100 text-sm font-semibold text-gray-700 border-r border-gray-300">
            시간
          </div>
          {weekDays.map((date, idx) => (
            <div
              key={idx}
              className={`py-3 px-2 text-center border-r border-gray-300 ${
                idx === 0 || idx === 6 ? 'bg-red-50' : 'bg-gray-100'
              }`}
            >
              <div className="text-sm font-semibold text-gray-700">{KOREAN_DAYS[date.getDay()]}</div>
              <div
                className={`text-xs ${
                  date.toDateString() === new Date().toDateString()
                    ? 'text-blue-600 font-bold'
                    : 'text-gray-600'
                }`}
              >
                {date.getDate()}
              </div>
            </div>
          ))}
        </div>

        {/* Time slots */}
        {hours.map((hour) => (
          <div key={hour} className="grid grid-cols-8 border-b border-gray-200 min-h-16">
            <div className="py-2 px-2 bg-gray-50 text-xs font-semibold text-gray-600 border-r border-gray-200">
              {hour}:00
            </div>
            {weekDays.map((date, idx) => {
              const slotEvents = getEventsForTimeSlot(date, hour);
              return (
                <div
                  key={idx}
                  onClick={() => handleCellClick(date, hour)}
                  className={`px-2 py-2 cursor-pointer hover:bg-blue-50 border-r border-gray-200 transition-colors ${
                    idx === 0 || idx === 6 ? 'bg-red-50' : 'bg-white'
                  }`}
                >
                  {slotEvents.slice(0, 1).map((event) => (
                    <div
                      key={event.id}
                      onClick={(e) => handleEventClick(event, e)}
                      style={{
                        backgroundColor: event.color || COLORS[4].value,
                      }}
                      className="text-xs text-white px-2 py-1 rounded-md font-medium hover:shadow-md transition-shadow cursor-pointer mb-1"
                    >
                      {event.title}
                    </div>
                  ))}
                  {slotEvents.length > 1 && (
                    <div className="text-xs text-gray-500">+{slotEvents.length - 1}</div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  // Render day view
  const renderDayView = () => {
    const hours = Array.from({ length: 13 }, (_, i) => i + 8); // 8am to 8pm
    const dayEvents = getEventsForDate(currentDate);
    const allDayEvents = dayEvents.filter((e) => e.allDay);
    const timedEvents = dayEvents.filter((e) => !e.allDay);

    return (
      <div className="space-y-6">
        {/* All day events */}
        {allDayEvents.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-3">하루 종일</h3>
            <div className="space-y-2">
              {allDayEvents.map((event) => (
                <div
                  key={event.id}
                  onClick={(e) => handleEventClick(event, e)}
                  style={{
                    backgroundColor: event.color || COLORS[4].value,
                  }}
                  className="text-white px-3 py-2 rounded-md font-medium hover:shadow-md transition-shadow cursor-pointer flex items-center gap-2"
                >
                  {event.isDeadline && <FileText size={16} />}
                  <span>{event.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timed events */}
        <div className="border border-gray-300 rounded-lg overflow-hidden shadow-sm bg-white">
          {hours.map((hour) => {
            const slotEvents = timedEvents.filter((event) => {
              const eventStartTime = event.startDate.split('T')[1]?.substring(0, 5) || '00:00';
              const eventEndTime = event.endDate?.split('T')[1]?.substring(0, 5) || '23:59';
              const slotStart = `${hour.toString().padStart(2, '0')}:00`;
              const slotEnd = `${(hour + 1).toString().padStart(2, '0')}:00`;
              return eventStartTime < slotEnd && eventEndTime > slotStart;
            });

            return (
              <div
                key={hour}
                className="grid grid-cols-2 border-b border-gray-200 min-h-16"
              >
                <div className="py-2 px-3 bg-gray-50 text-sm font-semibold text-gray-600 border-r border-gray-200">
                  {hour}:00
                </div>
                <div
                  onClick={() => handleCellClick(currentDate, hour)}
                  className="px-3 py-2 cursor-pointer hover:bg-blue-50 transition-colors space-y-1"
                >
                  {slotEvents.map((event) => (
                    <div
                      key={event.id}
                      onClick={(e) => handleEventClick(event, e)}
                      style={{
                        backgroundColor: event.color || COLORS[4].value,
                      }}
                      className="text-xs text-white px-2 py-1 rounded-md font-medium hover:shadow-md transition-shadow cursor-pointer"
                    >
                      {event.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">캘린더</h1>
            </div>
            <button
              onClick={() => {
                setSelectedEvent(null);
                setModalData({
                  title: '',
                  description: '',
                  startDate: new Date().toISOString().split('T')[0],
                  startTime: '09:00',
                  endDate: new Date().toISOString().split('T')[0],
                  endTime: '10:00',
                  allDay: false,
                  color: COLORS[4].value,
                  workspace,
                });
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Plus size={20} />
              <span>이벤트 추가</span>
            </button>
          </div>

          {/* View mode tabs */}
          <div className="flex gap-2 mb-6">
            {(['month', 'week', 'day'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === mode
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {mode === 'month' ? '월간' : mode === 'week' ? '주간' : '일간'}
              </button>
            ))}
          </div>

          {/* Navigation controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handlePrevious}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft size={20} className="text-gray-600" />
              </button>
              <h2 className="text-xl font-semibold text-gray-900 min-w-[180px]">
                {getViewTitle()}
              </h2>
              <button
                onClick={handleNext}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight size={20} className="text-gray-600" />
              </button>
            </div>
            <button
              onClick={handleToday}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              오늘
            </button>
          </div>
        </div>
      </div>

      {/* Calendar view */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">로딩 중...</div>
          </div>
        ) : (
          <>
            {viewMode === 'month' && renderMonthView()}
            {viewMode === 'week' && renderWeekView()}
            {viewMode === 'day' && renderDayView()}
          </>
        )}
      </div>

      {/* Event Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={selectedEvent ? '이벤트 수정' : '이벤트 생성'}
        size="md"
      >
        <div className="space-y-4">
          {/* Title input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              제목 *
            </label>
            <input
              type="text"
              value={modalData.title}
              onChange={(e) =>
                setModalData({ ...modalData, title: e.target.value })
              }
              placeholder="이벤트 제목"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Description input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              설명
            </label>
            <textarea
              value={modalData.description}
              onChange={(e) =>
                setModalData({ ...modalData, description: e.target.value })
              }
              placeholder="이벤트 설명 (선택사항)"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* All day toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="allDay"
              checked={modalData.allDay}
              onChange={(e) =>
                setModalData({ ...modalData, allDay: e.target.checked })
              }
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <label htmlFor="allDay" className="text-sm font-medium text-gray-700">
              하루 종일
            </label>
          </div>

          {/* Date and time inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                시작 날짜 *
              </label>
              <input
                type="date"
                value={modalData.startDate}
                onChange={(e) =>
                  setModalData({ ...modalData, startDate: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {!modalData.allDay && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  시작 시간
                </label>
                <input
                  type="time"
                  value={modalData.startTime}
                  onChange={(e) =>
                    setModalData({ ...modalData, startTime: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                종료 날짜 *
              </label>
              <input
                type="date"
                value={modalData.endDate}
                onChange={(e) =>
                  setModalData({ ...modalData, endDate: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {!modalData.allDay && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  종료 시간
                </label>
                <input
                  type="time"
                  value={modalData.endTime}
                  onChange={(e) =>
                    setModalData({ ...modalData, endTime: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          {/* Color picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              색상
            </label>
            <div className="flex gap-3 flex-wrap">
              {COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() =>
                    setModalData({ ...modalData, color: color.value })
                  }
                  className={`w-8 h-8 rounded-full transition-transform ${
                    modalData.color === color.value ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          {/* Workspace display */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              워크스페이스
            </label>
            <div className="px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-700">
              {workspace}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 justify-end pt-4">
            {selectedEvent && !selectedEvent.isDeadline && (
              <button
                onClick={handleDeleteEvent}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
              >
                <Trash2 size={18} />
                <span>삭제</span>
              </button>
            )}
            <button
              onClick={handleCloseModal}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
            >
              취소
            </button>
            <button
              onClick={handleSaveEvent}
              disabled={!modalData.title.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors font-medium"
            >
              {selectedEvent ? '수정' : '생성'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
