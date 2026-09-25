import React, { useState, useMemo } from 'react';
import {
  CalendarDays,
  Calendar as CalendarIcon,
  Table as TableIcon,
  Search,
  Filter,
  Clock,
  MapPin,
  User,
  Users,
  Building2,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  X,
  ExternalLink,
  RotateCcw,
  Sparkles,
  Info,
  Award,
  Layers
} from 'lucide-react';
import {
  LeadershipScheduleItem,
  OFFICIAL_LEADERSHIP_SCHEDULES,
  SCHEDULE_STORAGE_KEY
} from '../data/leadershipScheduleData';

interface TrainingMasterCalendarProps {
  onNavigateToTab?: (tab: any) => void;
  addToast?: (title: string, message: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

export const TrainingMasterCalendar: React.FC<TrainingMasterCalendarProps> = ({
  onNavigateToTab,
  addToast
}) => {
  // 1. Schedules Data
  const [schedules] = useState<LeadershipScheduleItem[]>(() => {
    try {
      const saved = localStorage.getItem(SCHEDULE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((s: any) => ({
            ...s,
            trainer: '',
            trainerRole: '',
            traineeLeaders: (s.traineeLeaders || []).map((tl: any) => ({ ...tl, name: '' })),
            documentation: (s.documentation || []).map((d: any) => ({ ...d, uploadedBy: 'Training Division' }))
          }));
        }
      }
    } catch (e) {
      console.warn('Could not read saved schedule:', e);
    }
    return OFFICIAL_LEADERSHIP_SCHEDULES;
  });

  // 2. Active View Mode: 'calendar' | 'table'
  const [viewMode, setViewMode] = useState<'calendar' | 'table'>('calendar');

  // 3. Calendar Month & Year State (Defaults to September 2026 as per official schedule)
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 8, 1)); // September 2026

  // 4. Search and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [venueFilter, setVenueFilter] = useState<string>('ALL');
  const [topicFilter, setTopicFilter] = useState<string>('ALL');
  const [trainerFilter, setTrainerFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // 5. Selected Event for Detailed Modal
  const [selectedEvent, setSelectedEvent] = useState<LeadershipScheduleItem | null>(null);

  // Unique Filter Lists
  const uniqueVenues = useMemo(() => {
    const venues = new Set<string>();
    schedules.forEach(s => {
      if (s.venue) venues.add(s.venue);
    });
    return ['ALL', ...Array.from(venues)];
  }, [schedules]);

  const uniqueTopics = useMemo(() => {
    const topics = new Set<string>();
    schedules.forEach(s => {
      if (s.trainingTopic) topics.add(s.trainingTopic);
    });
    return ['ALL', ...Array.from(topics).sort()];
  }, [schedules]);

  const uniqueTrainers = useMemo(() => {
    const trainers = new Set<string>();
    schedules.forEach(s => {
      if (s.trainer) trainers.add(s.trainer);
    });
    return ['ALL', ...Array.from(trainers).sort()];
  }, [schedules]);

  // Filtered Schedules
  const filteredSchedules = useMemo(() => {
    return schedules.filter(item => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = 
        !searchQuery ||
        item.trainingTopic.toLowerCase().includes(q) ||
        item.venue.toLowerCase().includes(q) ||
        item.departmentSection.toLowerCase().includes(q) ||
        item.trainingDate.toLowerCase().includes(q) ||
        (item.purposeAndRemarks && item.purposeAndRemarks.toLowerCase().includes(q));

      const matchesVenue = venueFilter === 'ALL' || item.venue === venueFilter;
      const matchesTopic = topicFilter === 'ALL' || item.trainingTopic === topicFilter;
      const matchesTrainer = trainerFilter === 'ALL' || item.trainer === trainerFilter;
      const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;

      return matchesSearch && matchesVenue && matchesTopic && matchesTrainer && matchesStatus;
    });
  }, [schedules, searchQuery, venueFilter, topicFilter, trainerFilter, statusFilter]);

  // Calendar Navigation
  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleToday = () => {
    // Navigate to August/September 2026 or current active schedule month
    setCurrentDate(new Date(2026, 8, 1));
  };

  // Calendar Grid Calculation
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun, 1 = Mon...
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: { date: Date; isCurrentMonth: boolean; isoString: string; events: LeadershipScheduleItem[] }[] = [];

    // Previous month filler days
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthDays - i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const events = filteredSchedules.filter(s => s.isoDate === iso);
      days.push({ date: d, isCurrentMonth: false, isoString: iso, events });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const events = filteredSchedules.filter(s => s.isoDate === iso);
      days.push({ date: d, isCurrentMonth: true, isoString: iso, events });
    }

    // Next month filler days to complete 35 or 42 grid cells
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      const d = new Date(year, month + 1, day);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const events = filteredSchedules.filter(s => s.isoDate === iso);
      days.push({ date: d, isCurrentMonth: false, isoString: iso, events });
    }

    return days;
  }, [currentDate, filteredSchedules]);

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Counts
  const totalCount = filteredSchedules.length;
  const completedCount = filteredSchedules.filter(s => s.status === 'Completed').length;
  const upcomingCount = filteredSchedules.filter(s => s.status === 'Upcoming').length;

  return (
    <div className="bg-[#081223] border border-[#14294a] rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4">
      
      {/* ========================================================= */}
      {/* 1. MASTER HEADER                                          */}
      {/* ========================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#0f2344]">
        
        {/* Left Title & Status Badges */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/10 border border-cyan-500/30 flex items-center justify-center shadow-lg shadow-cyan-950/40 flex-shrink-0">
            <CalendarDays className="w-6 h-6 text-cyan-400" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base sm:text-lg font-black text-white tracking-wide font-sans">
                TRAINING SCHEDULE — MASTER CALENDAR
              </span>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                OFFICIAL SOURCE OF TRUTH (2026)
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-sans">
              Complete official training schedule extracted directly from Training Room DTP & Conference Room D2P masters.
            </p>
          </div>
        </div>

        {/* Right Summary Metrics & View Toggle */}
        <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
          <div className="px-3 py-1.5 rounded-xl bg-[#050c18] border border-[#122442] text-slate-300 flex items-center gap-1.5">
            <span className="text-slate-400">Total:</span>
            <span className="font-bold text-white">{totalCount} Sessions</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-[#050c18] border border-[#122442] text-emerald-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-slate-400">Completed:</span>
            <span className="font-bold text-emerald-400">{completedCount}</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-[#050c18] border border-[#122442] text-cyan-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-slate-400">Upcoming:</span>
            <span className="font-bold text-cyan-400">{upcomingCount}</span>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-[#050c18] border border-[#132747] rounded-xl p-0.5 ml-1">
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                viewMode === 'calendar'
                  ? 'bg-[#0f274a] text-cyan-300 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Calendar Month View"
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Calendar</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-[#0f274a] text-cyan-300 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Table List View"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
          </div>
        </div>

      </div>

      {/* ========================================================= */}
      {/* 2. SEARCH & MULTI-DIMENSIONAL FILTERS BAR                 */}
      {/* ========================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search training topic, venue, day, content..."
            className="w-full bg-[#050c18] border border-[#132747] rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Dropdowns Suite */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Venue / Room Filter */}
          <div className="flex items-center gap-1 bg-[#050c18] border border-[#132747] rounded-xl px-2.5 py-1">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={venueFilter}
              onChange={(e) => setVenueFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-300 font-mono focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-[#081223] text-white">All Venues & Rooms</option>
              {uniqueVenues.filter(v => v !== 'ALL').map(v => (
                <option key={v} value={v} className="bg-[#081223] text-white">{v}</option>
              ))}
            </select>
          </div>

          {/* Topic Filter */}
          <div className="flex items-center gap-1 bg-[#050c18] border border-[#132747] rounded-xl px-2.5 py-1">
            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-300 font-mono focus:outline-none cursor-pointer max-w-[160px] truncate"
            >
              <option value="ALL" className="bg-[#081223] text-white">All Topics</option>
              {uniqueTopics.filter(t => t !== 'ALL').map(t => (
                <option key={t} value={t} className="bg-[#081223] text-white">{t}</option>
              ))}
            </select>
          </div>

          {/* Trainer Filter (only if trainers exist) */}
          {uniqueTrainers.filter(tr => tr !== 'ALL').length > 0 && (
            <div className="flex items-center gap-1 bg-[#050c18] border border-[#132747] rounded-xl px-2.5 py-1">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={trainerFilter}
                onChange={(e) => setTrainerFilter(e.target.value)}
                className="bg-transparent text-xs text-slate-300 font-mono focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-[#081223] text-white">All Trainers</option>
                {uniqueTrainers.filter(tr => tr !== 'ALL').map(tr => (
                  <option key={tr} value={tr} className="bg-[#081223] text-white">{tr}</option>
                ))}
              </select>
            </div>
          )}

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-[#050c18] border border-[#132747] rounded-xl px-2.5 py-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-300 font-mono focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-[#081223] text-white">All Statuses</option>
              <option value="Upcoming" className="bg-[#081223] text-white">Upcoming</option>
              <option value="Completed" className="bg-[#081223] text-white">Completed</option>
              <option value="Rescheduled" className="bg-[#081223] text-white">Rescheduled</option>
            </select>
          </div>

          {/* Reset Filters button if any active */}
          {(searchQuery || venueFilter !== 'ALL' || topicFilter !== 'ALL' || trainerFilter !== 'ALL' || statusFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setVenueFilter('ALL');
                setTopicFilter('ALL');
                setTrainerFilter('ALL');
                setStatusFilter('ALL');
              }}
              className="px-2 py-1 rounded-xl bg-[#091833] hover:bg-[#0f274a] text-cyan-300 hover:text-white text-xs font-mono transition cursor-pointer border border-[#142f59] flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}

        </div>

      </div>

      {/* ========================================================= */}
      {/* 3. CALENDAR MONTH NAVIGATION (Calendar View)              */}
      {/* ========================================================= */}
      {viewMode === 'calendar' && (
        <div className="flex items-center justify-between gap-3 pt-2 pb-1 border-t border-[#0e213f]">
          
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white font-sans flex items-center gap-2">
              <span>{monthName}</span>
              <span className="text-xs font-mono text-cyan-400 font-normal px-2 py-0.5 rounded-md bg-[#071d38] border border-[#0d3b6e]">
                {calendarDays.filter(d => d.isCurrentMonth && d.events.length > 0).reduce((acc, d) => acc + d.events.length, 0)} Sessions this month
              </span>
            </h3>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Quick August / September buttons */}
            <button
              onClick={() => setCurrentDate(new Date(2026, 7, 1))}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition cursor-pointer border ${
                currentDate.getMonth() === 7 && currentDate.getFullYear() === 2026
                  ? 'bg-cyan-600 text-white font-bold border-cyan-400'
                  : 'bg-[#050c18] text-slate-300 border-[#132747] hover:text-white'
              }`}
            >
              August 2026
            </button>
            <button
              onClick={() => setCurrentDate(new Date(2026, 8, 1))}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition cursor-pointer border ${
                currentDate.getMonth() === 8 && currentDate.getFullYear() === 2026
                  ? 'bg-cyan-600 text-white font-bold border-cyan-400'
                  : 'bg-[#050c18] text-slate-300 border-[#132747] hover:text-white'
              }`}
            >
              September 2026
            </button>

            {/* Today Button */}
            <button
              onClick={handleToday}
              className="px-2.5 py-1 rounded-lg bg-[#050c18] border border-[#132747] text-slate-300 hover:text-white text-xs font-mono transition cursor-pointer"
            >
              Today
            </button>

            {/* Prev / Next Month Buttons */}
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg bg-[#050c18] border border-[#132747] text-slate-300 hover:text-white hover:border-cyan-500/40 transition cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg bg-[#050c18] border border-[#132747] text-slate-300 hover:text-white hover:border-cyan-500/40 transition cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* 4. CALENDAR GRID VIEW                                     */}
      {/* ========================================================= */}
      {viewMode === 'calendar' ? (
        <div className="rounded-xl border border-[#0e213f] bg-[#050c18]/90 overflow-hidden">
          
          {/* Day of week headers */}
          <div className="grid grid-cols-7 border-b border-[#0e213f] bg-[#071326] text-center font-mono text-[11px] font-bold text-slate-300 py-2">
            <div className="text-red-400">SUN</div>
            <div>MON</div>
            <div>TUE</div>
            <div>WED</div>
            <div>THU</div>
            <div>FRI</div>
            <div className="text-cyan-400">SAT</div>
          </div>

          {/* Calendar Day Cells */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-[#0e213f] bg-[#050c18]">
            {calendarDays.map((cell, idx) => {
              const dayNum = cell.date.getDate();
              const isSunday = cell.date.getDay() === 0;
              const isSaturday = cell.date.getDay() === 6;

              return (
                <div
                  key={idx}
                  className={`min-h-[105px] sm:min-h-[120px] p-1.5 flex flex-col justify-between transition-colors ${
                    cell.isCurrentMonth ? 'bg-[#050c18]/90 hover:bg-[#07162e]' : 'bg-[#03070f]/70 opacity-40'
                  }`}
                >
                  {/* Top Day Header */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded-md ${
                        cell.events.length > 0
                          ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/60'
                          : isSunday
                          ? 'text-red-400'
                          : isSaturday
                          ? 'text-cyan-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {dayNum}
                    </span>

                    {cell.events.length > 0 && (
                      <span className="text-[9px] font-mono font-bold text-cyan-400">
                        {cell.events.length} {cell.events.length === 1 ? 'event' : 'events'}
                      </span>
                    )}
                  </div>

                  {/* Events Container */}
                  <div className="space-y-1 flex-1 overflow-y-auto max-h-[90px] scrollbar-none">
                    {cell.events.map((ev) => {
                      const isCompleted = ev.status === 'Completed';
                      const isDTP = ev.venue.includes('DTP');

                      return (
                        <div
                          key={ev.id}
                          onClick={() => setSelectedEvent(ev)}
                          className={`p-1 rounded-md text-[10px] font-sans border transition cursor-pointer group shadow-sm ${
                            isCompleted
                              ? 'bg-emerald-950/40 border-emerald-800/40 hover:border-emerald-500 text-emerald-200'
                              : isDTP
                              ? 'bg-cyan-950/40 border-cyan-800/40 hover:border-cyan-400 text-cyan-200'
                              : 'bg-purple-950/40 border-purple-800/40 hover:border-purple-400 text-purple-200'
                          }`}
                          title={`Click to view details: ${ev.trainingTopic} (${ev.time})`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold truncate group-hover:text-white">
                              {ev.trainingTopic}
                            </span>
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isCompleted ? 'bg-emerald-400' : 'bg-cyan-400 animate-pulse'}`} />
                          </div>
                          
                          <div className="flex items-center justify-between text-[9px] opacity-80 font-mono mt-0.5">
                            <span className="truncate">{ev.time}</span>
                            <span className="truncate max-w-[70px] text-slate-300">{ev.venue}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                </div>
              );
            })}
          </div>

        </div>
      ) : (
        /* ========================================================= */
        /* 5. TABLE / LIST VIEW                                      */
        /* ========================================================= */
        <div className="overflow-x-auto rounded-xl border border-[#0e213f] bg-[#050c18]/90">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead>
              <tr className="bg-[#09152b] text-slate-300 border-b border-[#122749] font-mono text-[10px] uppercase tracking-wider">
                <th className="py-2.5 px-3">Date & Day</th>
                <th className="py-2.5 px-3">Time</th>
                <th className="py-2.5 px-3">Training Topic</th>
                <th className="py-2.5 px-3">Venue / Room</th>
                <th className="py-2.5 px-3">Department / Section</th>
                <th className="py-2.5 px-3 text-center">Leaders</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0e1f3d]">
              {filteredSchedules.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-mono">
                    <AlertCircle className="w-6 h-6 mx-auto text-slate-500 mb-1.5" />
                    No training schedules matching your search filters.
                  </td>
                </tr>
              ) : (
                filteredSchedules.map((schedule) => {
                  const isCompleted = schedule.status === 'Completed';

                  return (
                    <tr
                      key={schedule.id}
                      onClick={() => setSelectedEvent(schedule)}
                      className="hover:bg-[#0a1b38]/60 transition-colors cursor-pointer group"
                    >
                      {/* Date & Day */}
                      <td className="py-3 px-3 font-mono text-[11px] whitespace-nowrap">
                        <div className="font-bold text-white group-hover:text-cyan-300 transition-colors">{schedule.trainingDate}</div>
                        <div className="text-[10px] text-slate-400">{schedule.dayOfWeek}</div>
                      </td>

                      {/* Time */}
                      <td className="py-3 px-3 font-mono text-[11px] text-cyan-300 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                          <span>{schedule.time}</span>
                        </div>
                      </td>

                      {/* Topic */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-white group-hover:text-cyan-300 transition-colors">
                          {schedule.trainingTopic}
                        </div>
                        {schedule.content && schedule.content.length > 0 && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[220px]">
                            {schedule.content[0]}
                          </div>
                        )}
                      </td>

                      {/* Venue */}
                      <td className="py-3 px-3 font-mono text-[11px]">
                        <span className={`px-2 py-0.5 rounded-md border ${
                          schedule.venue.includes('DTP')
                            ? 'bg-cyan-950/50 text-cyan-300 border-cyan-800/50'
                            : 'bg-purple-950/50 text-purple-300 border-purple-800/50'
                        }`}>
                          {schedule.venue}
                        </span>
                      </td>

                      {/* Department */}
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-300 max-w-[180px] truncate">
                        {schedule.departmentSection}
                      </td>

                      {/* Leaders Count */}
                      <td className="py-3 px-3 text-center font-mono text-xs">
                        <span className="font-bold text-white">{schedule.traineeLeadersCount}</span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                          isCompleted
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                        }`}>
                          {isCompleted ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {schedule.status}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEvent(schedule);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#091833] hover:bg-[#0e2652] text-cyan-300 text-[11px] font-semibold transition cursor-pointer border border-[#142f59]"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ========================================================= */}
      {/* 6. DETAILED TRAINING EVENT INSPECTION MODAL               */}
      {/* ========================================================= */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#09152b] border border-[#16315c] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-[#12284d] flex items-center justify-between bg-[#061022]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shadow-md">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-base font-sans">
                      {selectedEvent.trainingTopic}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      selectedEvent.status === 'Completed'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    }`}>
                      {selectedEvent.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono">
                    {selectedEvent.trainingDate} ({selectedEvent.dayOfWeek}) • {selectedEvent.time}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#102347] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs font-sans">
              
              {/* Key Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#050c18] border border-[#122442]">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-mono uppercase">Cohort Batch:</span>
                  <div className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
                    <CalendarIcon className="w-4 h-4 text-amber-400" />
                    <span>{selectedEvent.batch}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-mono uppercase">Venue & Facility:</span>
                  <div className="text-sm font-bold text-white flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-purple-400" />
                    <span>{selectedEvent.venue}</span>
                  </div>
                  <span className="text-[11px] text-slate-400 block font-mono">{selectedEvent.time}</span>
                </div>

                <div className="space-y-1 sm:col-span-2 pt-2 border-t border-[#0f213f]">
                  <span className="text-[10px] text-slate-400 font-mono uppercase">Target Department & Section:</span>
                  <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5 font-mono">
                    <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{selectedEvent.departmentSection}</span>
                  </div>
                </div>
              </div>

              {/* Training Purpose & Objectives */}
              <div>
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono block mb-1.5 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Purpose & Executive Description</span>
                </span>
                <p className="p-3 rounded-xl bg-[#050c18] border border-[#122442] text-slate-300 leading-relaxed italic">
                  "{selectedEvent.purposeAndRemarks}"
                </p>
              </div>

              {/* Syllabus / Content Modules from Sheet */}
              <div>
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono block mb-1.5 flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                  <span>Curriculum Content & Key Topics</span>
                </span>
                <div className="p-3 rounded-xl bg-[#050c18] border border-[#122442] space-y-1.5">
                  {selectedEvent.content.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-slate-200 font-mono text-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trainee Leaders Enrolled */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Enrolled Section Leaders ({selectedEvent.traineeLeadersCount} Trainees)</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    Official Roster
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#050c18] border border-[#122442] grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {selectedEvent.traineeLeaders.map((ldr) => (
                    <div key={ldr.id} className="flex items-center justify-between p-1.5 rounded-lg bg-[#07152b] border border-[#102344] text-[11px] font-mono">
                      <div>
                        <span className="text-white font-bold block">{ldr.name}</span>
                        <span className="text-[9px] text-slate-400">{ldr.department} • {ldr.lineOrSection}</span>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        ldr.attended ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {ldr.attended ? 'Present' : 'Enrolled'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Source Document Note */}
              {selectedEvent.notes && (
                <div className="p-2.5 rounded-xl bg-[#071933] border border-[#12366b] text-[11px] font-mono text-cyan-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  <span>{selectedEvent.notes}</span>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-3.5 border-t border-[#12284d] bg-[#061022] flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-500">
                Source Document: SUBJECT & SCHEDULE 2026
              </span>
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-1.5 rounded-xl bg-[#091833] hover:bg-[#0f274a] text-cyan-300 hover:text-white font-semibold transition cursor-pointer border border-[#142f59]"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default TrainingMasterCalendar;
