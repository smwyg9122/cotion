import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DatePickerPopupProps {
  onSelect: (date: string) => void;
  onClose: () => void;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function DatePickerPopup({ onSelect, onClose }: DatePickerPopupProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  function prevMonth() {
    if (month === 0) { setYear(year - 1); setMonth(11); }
    else setMonth(month - 1);
  }

  function nextMonth() {
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else setMonth(month + 1);
  }

  function handleSelect(day: number) {
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    onSelect(`${year}/${m}/${d}`);
  }

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl border border-gray-200 p-3 w-[280px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-gray-800">
            {year}년 {month + 1}월
          </span>
          <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded">
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map((w, i) => (
            <div key={w} className={`text-center text-xs font-medium py-1 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'}`}>
              {w}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7">
          {days.map((day, i) => (
            <div key={i} className="aspect-square flex items-center justify-center">
              {day && (
                <button
                  onClick={() => handleSelect(day)}
                  className={`w-8 h-8 rounded-full text-sm transition-colors
                    ${isToday(day) ? 'bg-blue-600 text-white font-semibold' : 'text-gray-700 hover:bg-gray-100'}
                  `}
                >
                  {day}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Today button */}
        <button
          onClick={() => handleSelect(today.getDate())}
          className="mt-2 w-full text-center text-xs text-blue-600 hover:text-blue-700 font-medium py-1"
        >
          오늘
        </button>
      </div>
    </div>
  );
}
