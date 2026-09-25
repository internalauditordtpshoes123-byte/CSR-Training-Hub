/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  Clock, 
  BookOpen, 
  CheckCircle,
  HelpCircle,
  Plus
} from 'lucide-react';
import { TrainingLog, UserRole } from '../types';

interface CalendarViewProps {
  logs: TrainingLog[];
  setLogs: React.Dispatch<React.SetStateAction<TrainingLog[]>>;
  role: UserRole;
  addToast: (title: string, message: string, type: 'success' | 'warning' | 'info') => void;
  registerBackHandler?: (handler: () => boolean) => () => void;
}

export default function CalendarView({
  logs,
  setLogs,
  role,
  addToast,
  registerBackHandler
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 4, 1)); // Start at May 2026 as per logs context
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  useEffect(() => {
    if (registerBackHandler) {
      const handleBack = () => {
        if (selectedDay !== null) {
          setSelectedDay(null);
          return true; // consumed
        }
        return false; // let master handle
      };
      return registerBackHandler(handleBack);
    }
  }, [selectedDay, registerBackHandler]);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const year = currentDate.getFullYear();
  const monthIdx = currentDate.getMonth();

  // Compute number of days in the active month
  const daysInMonth = useMemo(() => {
    return new Date(year, monthIdx + 1, 0).getDate();
  }, [year, monthIdx]);

  // Compute first day of the month offset
  const firstDayIndex = useMemo(() => {
    return new Date(year, monthIdx, 1).getDay();
  }, [year, monthIdx]);

  // Map log schedules by specific day in active month
  const logsByDay = useMemo(() => {
    const map: Record<number, TrainingLog[]> = {};
    logs.forEach(log => {
      const parts = log.date.split('-');
      if (parts.length === 3) {
        const logYear = parseInt(parts[0], 10);
        const logMonth = parseInt(parts[1], 10) - 1; // 0-indexed
        const logDay = parseInt(parts[2], 10);

        if (logYear === year && logMonth === monthIdx) {
          if (!map[logDay]) {
            map[logDay] = [];
          }
          map[logDay].push(log);
        }
      }
    });
    return map;
  }, [logs, year, monthIdx]);

  const handlePrevMonth = () => {
    setSelectedDay(null);
    setCurrentDate(prev => {
      if (prev.getMonth() === 0) {
        return new Date(prev.getFullYear() - 1, 11, 1);
      } else {
        return new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
      }
    });
  };

  const handleNextMonth = () => {
    setSelectedDay(null);
    setCurrentDate(prev => {
      if (prev.getMonth() === 11) {
        return new Date(prev.getFullYear() + 1, 0, 1);
      } else {
        return new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
      }
    });
  };

  const activeDayEvents = useMemo(() => {
    if (selectedDay === null) return [];
    return logsByDay[selectedDay] || [];
  }, [selectedDay, logsByDay]);

  const handleDaySelect = (dayNum: number) => {
    setSelectedDay(dayNum);
  };

  return (
    <div className="space-y-6">
      
      {/* Dynamic Upper Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="bg-blue-100 text-blue-700 p-1 rounded-sm"><CalendarIcon className="w-4 h-4" /></span>
            <h2 className="text-xl font-bold text-slate-800">Master Training Calendar</h2>
          </div>
          <p className="text-xs text-slate-500">Coordinate and schedules, resolve timeline collisions, and check batch classrooms on a classic monthly scheduler.</p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-lg text-xs self-start md:self-auto font-sans font-bold">
          <button 
            onClick={handlePrevMonth}
            className="p-1 px-2 hover:bg-white rounded cursor-pointer transition text-slate-600"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <select
            value={monthIdx}
            onChange={(e) => {
              const newMonth = parseInt(e.target.value, 10);
              setCurrentDate(new Date(year, newMonth, 1));
              setSelectedDay(null);
            }}
            className="bg-transparent border-none text-xs font-bold text-slate-700 focus:outline-none cursor-pointer uppercase py-1 px-1.5 hover:bg-white rounded transition"
          >
            {months.map((m, idx) => (
              <option key={m} value={idx}>{m}</option>
            ))}
          </select>

          <select
            value={year}
            onChange={(e) => {
              const newYear = parseInt(e.target.value, 10);
              setCurrentDate(new Date(newYear, monthIdx, 1));
              setSelectedDay(null);
            }}
            className="bg-transparent border-none text-xs font-bold text-slate-700 focus:outline-none cursor-pointer py-1 px-1.5 hover:bg-white rounded transition"
          >
            {Array.from({ length: 16 }, (_, i) => 2020 + i).map(yr => (
              <option key={yr} value={yr}>{yr}</option>
            ))}
          </select>

          <button 
            onClick={handleNextMonth}
            className="p-1 px-2 hover:bg-white rounded cursor-pointer transition text-slate-600"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid: Calendar Layout (Left) + Selected Day Info (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Calendar Grid Box */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/85 p-5 shadow-sm space-y-4">
          
          {/* Days of week header */}
          <div className="grid grid-cols-7 text-center text-xs font-bold text-slate-400 py-1 uppercase tracking-wider">
            {daysOfWeek.map(d => (
              <div key={d} className="py-1">{d}</div>
            ))}
          </div>

          {/* Grid Cells */}
          <div className="grid grid-cols-7 gap-1.5 h-96">
            
            {/* Blank placeholder cells for offset */}
            {Array.from({ length: firstDayIndex }).map((_, idx) => (
              <div key={`empty-${idx}`} className="bg-slate-50/40 rounded-lg p-1 border border-dotted border-slate-100"></div>
            ))}

            {/* Actual day cells */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const hasEvents = logsByDay[dayNum] && logsByDay[dayNum].length > 0;
              const isSelected = selectedDay === dayNum;
              
              // Find if any event of that day has completed or scheduled
              const events = logsByDay[dayNum] || [];
              const containsInProgress = events.some(e => e.status === 'In Progress');
              const containsScheduled = events.some(e => e.status === 'Scheduled');
              const containsCompleted = events.some(e => e.status === 'Completed');

              let eventIndicatorDotColor = 'bg-blue-500';
              if (containsInProgress) eventIndicatorDotColor = 'bg-amber-400';
              else if (containsCompleted && !containsScheduled) eventIndicatorDotColor = 'bg-emerald-500';

              return (
                <div 
                  key={`day-${dayNum}`}
                  onClick={() => handleDaySelect(dayNum)}
                  className={`border rounded-lg p-2 flex flex-col justify-between cursor-pointer transition-all duration-150 select-none overflow-hidden relative ${
                    isSelected 
                      ? 'border-blue-600 bg-blue-50/40 ring-1 ring-blue-600' 
                      : 'border-slate-150 bg-white hover:bg-slate-50/50 hover:border-slate-350'
                  }`}
                >
                  <span className={`text-[11px] font-mono leading-none ${
                    isSelected ? 'font-bold text-blue-800' : 'text-slate-650'
                  }`}>
                    {dayNum}
                  </span>

                  {hasEvents && (
                    <div className="flex items-center gap-1">
                      <span className={`w-2.5 h-2.5 rounded-full ${eventIndicatorDotColor} flex-shrink-0`} />
                      <span className="text-[10px] font-bold text-slate-500 truncate hidden md:inline">
                        {events.length} session{events.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}

          </div>

          {/* Calendar status legend foot */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              <span>Scheduled Class</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400"></span>
              <span>Active Drills</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>Completed SOPs</span>
            </div>
          </div>

        </div>

        {/* Selected Date Summary & Logs details (Right) */}
        <div className="bg-white rounded-xl border border-slate-200/85 p-5 shadow-sm space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-600" />
              Day Itinerary Review
            </h3>
            <p className="text-xs text-slate-500">Selected: <strong className="text-slate-700 font-bold font-mono">{selectedDay !== null ? `${months[monthIdx]} ${selectedDay}, ${year}` : 'Select a date from cell'}</strong></p>
          </div>

          <div className="space-y-3">
            {selectedDay === null ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                <HelpCircle className="w-8 h-8 mx-auto text-slate-300 mb-2 animate-bounce" />
                <p>Click on any date inside the monthly calendar grid to pull active schedules details.</p>
              </div>
            ) : activeDayEvents.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 text-slate-400 text-xs rounded-xl border border-dashed border-slate-200">
                <p>No training sessions allocated on this specific day.</p>
                <p className="text-[10px] text-slate-400 mt-1">Select and customize batches under 1st module tab.</p>
              </div>
            ) : (
              activeDayEvents.map((ev) => {
                return (
                  <div 
                    key={ev.id} 
                    className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-2 text-xs relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                        {ev.batchCode}
                      </span>
                      <span className={`inline-block text-[9px] font-black px-1.5 py-0.5 rounded ${
                        ev.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                        ev.status === 'In Progress' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {ev.status}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-800 font-sans leading-snug">{ev.title}</h4>
                    
                    <div className="text-[10px] text-slate-450 space-y-1">
                      <p className="flex items-center gap-1"><strong>Instructor:</strong> {ev.instructor}</p>
                      <p className="flex items-center gap-1"><strong>Location:</strong> {ev.location}</p>
                      <p className="flex items-center gap-1"><strong>Syllabus Code:</strong> {ev.type}</p>
                      <p className="flex items-center gap-1"><strong>Personnel Count:</strong> {ev.traineesCount} operators</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
