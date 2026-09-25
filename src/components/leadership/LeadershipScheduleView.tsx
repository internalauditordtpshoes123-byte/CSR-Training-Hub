import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
  Clock3,
  CalendarCheck2,
  XCircle,
  FileSpreadsheet,
  Download,
  Upload,
  Plus,
  Edit,
  Trash2,
  Eye,
  RefreshCw,
  Printer,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Info,
  X,
  Share2,
  ShieldCheck,
  Sparkles,
  Play,
  RotateCcw,
  Check
} from 'lucide-react';
import {
  LeadershipScheduleItem,
  TraineeLeaderInfo,
  OFFICIAL_LEADERSHIP_SCHEDULES,
  SCHEDULE_STORAGE_KEY
} from '../../data/leadershipScheduleData';
import {
  INITIAL_LEADERSHIP_SHEET_DATA,
  LeadershipTraineeRow
} from '../../data/leadershipSheetData';
import { syncEntityToMaster } from '../../services/realtimeSync';

interface LeadershipScheduleViewProps {
  role?: string;
  addToast: (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  registerBackHandler?: (handler: () => boolean) => () => void;
  schedules?: LeadershipScheduleItem[];
  onUpdateSchedules?: (schedules: LeadershipScheduleItem[]) => void;
  allTrainees?: LeadershipTraineeRow[];
  initialYearFilter?: 'ALL' | '2025' | '2026';
}

export const LeadershipScheduleView: React.FC<LeadershipScheduleViewProps> = ({
  role = 'Admin',
  addToast,
  registerBackHandler,
  schedules: controlledSchedules,
  onUpdateSchedules,
  allTrainees = [],
  initialYearFilter = 'ALL'
}) => {
  // 1. Schedule Master State (controlled from parent or local fallback)
  const [internalSchedules, setInternalSchedules] = useState<LeadershipScheduleItem[]>(() => {
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
      console.warn('Error loading cached leadership schedule:', e);
    }
    return OFFICIAL_LEADERSHIP_SCHEDULES;
  });

  const schedules = controlledSchedules || internalSchedules;

  // Save to parent & localStorage on change & broadcast to other PCs
  const updateSchedulesState = useCallback((newSchedules: LeadershipScheduleItem[]) => {
    if (onUpdateSchedules) {
      onUpdateSchedules(newSchedules);
    } else {
      setInternalSchedules(newSchedules);
      try {
        localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(newSchedules));
      } catch (e) {
        console.error('Error saving leadership schedule:', e);
      }
      syncEntityToMaster('leadershipSchedules', newSchedules, 'update');
    }
  }, [onUpdateSchedules]);

  // 2. View Mode (List vs Calendar)
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  // 3. Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Upcoming' | 'Ongoing' | 'Completed' | 'Rescheduled' | 'Cancelled'>('ALL');
  const [trainerFilter, setTrainerFilter] = useState<string>('ALL');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');
  const [yearFilter, setYearFilter] = useState<'ALL' | '2025' | '2026'>(initialYearFilter);

  // 4. Expanded Rows in List View
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  // 5. Calendar Active Month State (Defaults to September 2026 or August 2026)
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date(2026, 8, 1)); // Sept 2026

  // 6. Selected Schedule for Details / Trainee Leaders Modal
  const [selectedSession, setSelectedSession] = useState<LeadershipScheduleItem | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isTraineesModalOpen, setIsTraineesModalOpen] = useState(false);

  // 7. Add / Edit Schedule Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<LeadershipScheduleItem> | null>(null);

  // 8. Reschedule Modal State
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<LeadershipScheduleItem | null>(null);
  const [newRescheduleDate, setNewRescheduleDate] = useState('');
  const [newRescheduleTime, setNewRescheduleTime] = useState('');
  const [newRescheduleVenue, setNewRescheduleVenue] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');

  // Sync yearFilter when initialYearFilter prop changes
  useEffect(() => {
    if (initialYearFilter) {
      setYearFilter(initialYearFilter);
    }
  }, [initialYearFilter]);

  // Register back button handler
  useEffect(() => {
    if (!registerBackHandler) return;
    return registerBackHandler(() => {
      if (isDetailsModalOpen) {
        setIsDetailsModalOpen(false);
        return true;
      }
      if (isTraineesModalOpen) {
        setIsTraineesModalOpen(false);
        return true;
      }
      if (isEditModalOpen) {
        setIsEditModalOpen(false);
        return true;
      }
      if (isRescheduleModalOpen) {
        setIsRescheduleModalOpen(false);
        return true;
      }
      return false;
    });
  }, [isDetailsModalOpen, isTraineesModalOpen, isEditModalOpen, isRescheduleModalOpen, registerBackHandler]);

  // Unique Trainers list for filter
  const trainersList = useMemo(() => {
    const set = new Set<string>();
    schedules.forEach(s => {
      if (s.trainer) set.add(s.trainer);
    });
    return Array.from(set).sort();
  }, [schedules]);

  // Filtered Schedules computation
  const filteredSchedules = useMemo(() => {
    return schedules.filter(item => {
      // Text search
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.trainingTopic.toLowerCase().includes(q) ||
        item.trainer.toLowerCase().includes(q) ||
        item.departmentSection.toLowerCase().includes(q) ||
        item.trainingDate.toLowerCase().includes(q) ||
        item.dayOfWeek.toLowerCase().includes(q) ||
        item.venue.toLowerCase().includes(q) ||
        item.batch.toLowerCase().includes(q) ||
        item.purposeAndRemarks.toLowerCase().includes(q) ||
        (item.notes && item.notes.toLowerCase().includes(q)) ||
        item.content.some(c => c.toLowerCase().includes(q)) ||
        item.traineeLeaders.some(l => l.name.toLowerCase().includes(q) || l.employeeNo.toLowerCase().includes(q));

      // Status filter
      const matchStatus = statusFilter === 'ALL' || item.status === statusFilter;

      // Trainer filter
      const matchTrainer = trainerFilter === 'ALL' || item.trainer === trainerFilter;

      // Dept filter
      const matchDept =
        deptFilter === 'ALL' ||
        item.departmentSection.toLowerCase().includes(deptFilter.toLowerCase()) ||
        item.traineeLeaders.some(l => l.department.toLowerCase().includes(deptFilter.toLowerCase()));

      // Year filter
      const matchYear =
        yearFilter === 'ALL' ||
        (item.year !== null && item.year !== undefined
          ? item.year === parseInt(yearFilter, 10)
          : item.isoDate.startsWith(yearFilter) || item.trainingDate.includes(yearFilter));

      return matchSearch && matchStatus && matchTrainer && matchDept && matchYear;
    }).sort((a, b) => a.isoDate.localeCompare(b.isoDate));
  }, [schedules, searchQuery, statusFilter, trainerFilter, deptFilter, yearFilter]);

  // Summary counts
  const counts = useMemo(() => {
    const total = schedules.length;
    const upcoming = schedules.filter(s => s.status === 'Upcoming').length;
    const ongoing = schedules.filter(s => s.status === 'Ongoing').length;
    const completed = schedules.filter(s => s.status === 'Completed').length;
    const rescheduled = schedules.filter(s => s.status === 'Rescheduled').length;
    const cancelled = schedules.filter(s => s.status === 'Cancelled').length;
    const totalTraineeSpots = schedules.reduce((acc, curr) => acc + (curr.traineeLeadersCount || curr.traineeLeaders.length), 0);

    return { total, upcoming, ongoing, completed, rescheduled, cancelled, totalTraineeSpots };
  }, [schedules]);

  // Toggle Row expansion
  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Toggle Trainee Attendance in session
  const toggleTraineeAttendance = (sessionId: string, leaderId: string) => {
    const updated = schedules.map(s => {
      if (s.id !== sessionId) return s;
      const updatedLeaders = s.traineeLeaders.map(l => {
        if (l.id !== leaderId) return l;
        return { ...l, attended: !l.attended };
      });
      return { ...s, traineeLeaders: updatedLeaders };
    });
    updateSchedulesState(updated);
    if (selectedSession && selectedSession.id === sessionId) {
      setSelectedSession(updated.find(s => s.id === sessionId) || null);
    }
  };

  // Quick Status Transition Actions
  const handleMarkStatus = (sessionId: string, newStatus: 'Upcoming' | 'Ongoing' | 'Completed' | 'Cancelled') => {
    const target = schedules.find(s => s.id === sessionId);
    if (!target) return;

    const updated = schedules.map(s => {
      if (s.id !== sessionId) return s;
      return { ...s, status: newStatus };
    });

    updateSchedulesState(updated);
    addToast(
      'Schedule Status Updated',
      `"${target.trainingTopic}" marked as ${newStatus}. Synced to database in real-time.`,
      newStatus === 'Completed' ? 'success' : newStatus === 'Ongoing' ? 'info' : 'warning'
    );
  };

  // Open Reschedule Modal
  const handleOpenReschedule = (schedule: LeadershipScheduleItem) => {
    setRescheduleTarget(schedule);
    setNewRescheduleDate(schedule.trainingDate);
    setNewRescheduleTime(schedule.time);
    setNewRescheduleVenue(schedule.venue);
    setRescheduleReason(schedule.notes || '');
    setIsRescheduleModalOpen(true);
  };

  // Confirm Reschedule Action
  const handleConfirmReschedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleTarget) return;

    if (!newRescheduleDate.trim()) {
      addToast('Validation Error', 'Please provide the new rescheduled date.', 'error');
      return;
    }

    const updated = schedules.map(s => {
      if (s.id !== rescheduleTarget.id) return s;
      return {
        ...s,
        trainingDate: newRescheduleDate.trim(),
        time: newRescheduleTime.trim() || s.time,
        venue: newRescheduleVenue.trim() || s.venue,
        status: 'Rescheduled' as const,
        notes: rescheduleReason ? `Rescheduled: ${rescheduleReason}` : s.notes
      };
    });

    updateSchedulesState(updated);
    addToast(
      'Session Rescheduled',
      `Rescheduled "${rescheduleTarget.trainingTopic}" to ${newRescheduleDate}. Updated in central database and broadcasted to all PCs.`,
      'success'
    );

    setIsRescheduleModalOpen(false);
    setRescheduleTarget(null);
  };

  // Reset to original file data
  const handleResetToOfficial = () => {
    updateSchedulesState(OFFICIAL_LEADERSHIP_SCHEDULES);
    addToast('Schedule Restored', 'Restored exact training schedule from uploaded official file.', 'success');
  };

  // Delete a session (Admin only)
  const handleDeleteSession = (id: string) => {
    if (confirm('Are you sure you want to remove this training schedule entry? This will be permanently deleted from the database.')) {
      const updated = schedules.filter(s => s.id !== id);
      updateSchedulesState(updated);
      addToast('Schedule Deleted', 'The training session has been removed from the schedule database.', 'info');
    }
  };

  // Save / Update session from Add/Edit modal
  const handleSaveEditSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.trainingTopic || !editingItem.trainingDate) {
      addToast('Validation Error', 'Please specify at least Training Topic and Date.', 'error');
      return;
    }

    if (editingItem.id) {
      // Update existing
      const updated = schedules.map(s => (s.id === editingItem.id ? (editingItem as LeadershipScheduleItem) : s));
      updateSchedulesState(updated);
      addToast('Schedule Updated', `Updated schedule for ${editingItem.trainingTopic}.`, 'success');
    } else {
      // Add new
      const newItem: LeadershipScheduleItem = {
        id: `sched-custom-${Date.now()}`,
        trainingDate: editingItem.trainingDate || 'September 20, 2026',
        isoDate: editingItem.isoDate || '2026-09-20',
        dayOfWeek: editingItem.dayOfWeek || 'Sunday',
        time: editingItem.time || '2:00-3:00pm',
        trainingTopic: editingItem.trainingTopic || 'Custom Module',
        trainer: editingItem.trainer || 'Master Instructor',
        trainerRole: editingItem.trainerRole || 'Department Trainer',
        departmentSection: editingItem.departmentSection || 'Production Leadership',
        batch: editingItem.batch || 'Cohort 2026',
        venue: editingItem.venue || 'TRAINING ROOM DTP',
        status: editingItem.status || 'Upcoming',
        purposeAndRemarks: editingItem.purposeAndRemarks || '',
        content: editingItem.content && editingItem.content.length > 0 ? editingItem.content : ['1. Key Concepts', '2. Practical Application'],
        traineeLeadersCount: editingItem.traineeLeaders?.length || (editingItem.traineeLeadersCount || 15),
        traineeLeaders: editingItem.traineeLeaders || [],
        notes: editingItem.notes || ''
      };
      updateSchedulesState([...schedules, newItem]);
      addToast('Schedule Added', `Added ${newItem.trainingTopic} to training calendar.`, 'success');
    }

    setIsEditModalOpen(false);
    setEditingItem(null);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Training Date',
      'Day',
      'Time',
      'Training Topic/Module',
      'Department/Section',
      'Batch',
      'Venue',
      'Trainee Leaders Count',
      'Training Status',
      'Remarks & Objectives',
      'Notes',
      'Syllabus Content'
    ];

    const rows = filteredSchedules.map(s => [
      `"${s.trainingDate}"`,
      `"${s.dayOfWeek}"`,
      `"${s.time}"`,
      `"${s.trainingTopic.replace(/"/g, '""')}"`,
      `"${s.departmentSection.replace(/"/g, '""')}"`,
      `"${s.batch.replace(/"/g, '""')}"`,
      `"${s.venue.replace(/"/g, '""')}"`,
      s.traineeLeadersCount || s.traineeLeaders.length,
      `"${s.status}"`,
      `"${s.purposeAndRemarks.replace(/"/g, '""')}"`,
      `"${(s.notes || '').replace(/"/g, '""')}"`,
      `"${s.content.join(' | ').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Leadership_Training_Schedule_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Schedule Exported', 'Downloaded complete training schedule in CSV format.', 'success');
  };

  // Print Formatted Sheet
  const handlePrintSchedule = () => {
    window.print();
  };

  // Calendar Day Computation
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const startingDayOfWeek = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];

    // Pad previous month days
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({ dayNumber: null, isCurrentMonth: false, dateStr: '' });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const mm = String(month + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      const iso = `${year}-${mm}-${dd}`;
      days.push({ dayNumber: d, isCurrentMonth: true, dateStr: iso });
    }

    return days;
  }, [calendarMonth]);

  const monthNameYear = calendarMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-4 max-w-[1850px] mx-auto text-slate-100 font-sans">
      
      {/* ========================================================= */}
      {/* 1. TOP HEADER & METRIC STRIP                              */}
      {/* ========================================================= */}
      <div className="bg-[#081223] border border-[#14294a] rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#0f2344]">
          
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-blue-600/10 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-950/40 flex-shrink-0">
              <CalendarDays className="w-6 h-6 text-amber-400" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base sm:text-lg font-black text-white tracking-wide font-sans">
                  LEADERSHIP TRAINING SCHEDULE
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-mono font-bold flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-amber-400" />
                  SUBJECT & SCHEDULE (TRAINING ROOM DTP & CONFERENCE ROOM D2P)
                </span>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-bold">
                  DATABASE SYNCHRONIZED
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Manage upcoming, ongoing, completed, and rescheduled training sessions. Fully synced with cloud database in real-time.
              </p>
            </div>
          </div>

          {/* Action Suite */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleResetToOfficial}
              className="px-3 py-1.5 rounded-xl bg-[#0a1b38] hover:bg-[#10274f] text-slate-300 hover:text-amber-300 text-xs font-mono font-semibold transition cursor-pointer border border-[#173059] flex items-center gap-1.5"
              title="Reload exact schedule from uploaded file"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              <span>Reload Source</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 rounded-xl bg-[#0a1b38] hover:bg-[#10274f] text-slate-300 hover:text-cyan-300 text-xs font-mono font-semibold transition cursor-pointer border border-[#173059] flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handlePrintSchedule}
              className="px-3 py-1.5 rounded-xl bg-[#0a1b38] hover:bg-[#10274f] text-slate-300 hover:text-white text-xs font-mono font-semibold transition cursor-pointer border border-[#173059] flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5 text-slate-400" />
              <span>Print Schedule</span>
            </button>

            {role === 'Admin' && (
              <button
                onClick={() => {
                  setEditingItem({
                    trainingDate: 'September 18, 2026',
                    isoDate: '2026-09-18',
                    dayOfWeek: 'Friday',
                    time: '2:00-3:00pm',
                    trainingTopic: '',
                    trainer: '',
                    trainerRole: '',
                    departmentSection: 'Factory Leadership & Supervisory Staff',
                    batch: 'Cohort 2026 (September Batch)',
                    venue: 'TRAINING ROOM DTP',
                    status: 'Upcoming',
                    purposeAndRemarks: '',
                    content: ['1. Overview & Objectives', '2. Practical Application'],
                    traineeLeadersCount: 20,
                    traineeLeaders: [],
                    notes: ''
                  });
                  setIsEditModalOpen(true);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition cursor-pointer shadow-md flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Schedule</span>
              </button>
            )}
          </div>

        </div>

        {/* Schedule Metric Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <div 
            onClick={() => setStatusFilter('ALL')}
            className={`bg-[#050c18] border rounded-xl p-3 flex flex-col cursor-pointer transition ${
              statusFilter === 'ALL' ? 'border-amber-500/60 bg-[#0a1b38]' : 'border-[#122442] hover:border-slate-700'
            }`}
          >
            <span className="text-[11px] font-mono text-slate-400">Total Sessions</span>
            <span className="text-xl font-black text-white font-mono mt-0.5">{counts.total}</span>
          </div>

          <div 
            onClick={() => setStatusFilter('Upcoming')}
            className={`bg-[#050c18] border rounded-xl p-3 flex flex-col cursor-pointer transition ${
              statusFilter === 'Upcoming' ? 'border-sky-500/60 bg-[#0a1b38]' : 'border-[#122442] hover:border-slate-700'
            }`}
          >
            <span className="text-[11px] font-mono text-sky-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              Upcoming
            </span>
            <span className="text-xl font-black text-sky-300 font-mono mt-0.5">{counts.upcoming}</span>
          </div>

          <div 
            onClick={() => setStatusFilter('Ongoing')}
            className={`bg-[#050c18] border rounded-xl p-3 flex flex-col cursor-pointer transition ${
              statusFilter === 'Ongoing' ? 'border-emerald-500/60 bg-[#0a1b38]' : 'border-[#122442] hover:border-slate-700'
            }`}
          >
            <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Ongoing
            </span>
            <span className="text-xl font-black text-emerald-300 font-mono mt-0.5">{counts.ongoing}</span>
          </div>

          <div 
            onClick={() => setStatusFilter('Completed')}
            className={`bg-[#050c18] border rounded-xl p-3 flex flex-col cursor-pointer transition ${
              statusFilter === 'Completed' ? 'border-teal-500/60 bg-[#0a1b38]' : 'border-[#122442] hover:border-slate-700'
            }`}
          >
            <span className="text-[11px] font-mono text-teal-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-teal-400" />
              Completed
            </span>
            <span className="text-xl font-black text-teal-300 font-mono mt-0.5">{counts.completed}</span>
          </div>

          <div 
            onClick={() => setStatusFilter('Rescheduled')}
            className={`bg-[#050c18] border rounded-xl p-3 flex flex-col cursor-pointer transition ${
              statusFilter === 'Rescheduled' ? 'border-amber-500/60 bg-[#0a1b38]' : 'border-[#122442] hover:border-slate-700'
            }`}
          >
            <span className="text-[11px] font-mono text-amber-400 flex items-center gap-1">
              <Clock3 className="w-3 h-3 text-amber-400" />
              Rescheduled
            </span>
            <span className="text-xl font-black text-amber-300 font-mono mt-0.5">{counts.rescheduled}</span>
          </div>

          <div className="bg-[#050c18] border border-[#122442] rounded-xl p-3 flex flex-col">
            <span className="text-[11px] font-mono text-purple-400">Enrolled Leaders</span>
            <span className="text-xl font-black text-amber-400 font-mono mt-0.5">{counts.totalTraineeSpots}</span>
          </div>
        </div>

      </div>

      {/* ========================================================= */}
      {/* 2. FILTER, SEARCH & VIEW MODE SWITCHER                    */}
      {/* ========================================================= */}
      <div className="bg-[#081223] border border-[#14294a] rounded-2xl p-4 shadow-xl space-y-3">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search topic, venue, date, department, section..."
              className="w-full bg-[#050c18] border border-[#132747] rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 font-sans"
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

          {/* Filters & View Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-[#050c18] border border-[#132747] rounded-xl px-2.5 py-1 text-xs font-mono">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-transparent text-slate-300 focus:outline-none cursor-pointer text-xs"
              >
                <option value="ALL" className="bg-[#081223] text-white">All Statuses</option>
                <option value="Upcoming" className="bg-[#081223] text-sky-400">Upcoming / Scheduled</option>
                <option value="Ongoing" className="bg-[#081223] text-emerald-400">Ongoing (Active)</option>
                <option value="Completed" className="bg-[#081223] text-teal-400">Completed</option>
                <option value="Rescheduled" className="bg-[#081223] text-amber-400">Rescheduled</option>
                <option value="Cancelled" className="bg-[#081223] text-rose-400">Cancelled</option>
              </select>
            </div>

            {/* Trainer Filter (only if trainers exist) */}
            {trainersList.length > 0 && (
              <div className="flex items-center gap-1 bg-[#050c18] border border-[#132747] rounded-xl px-2.5 py-1 text-xs font-mono">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={trainerFilter}
                  onChange={(e) => setTrainerFilter(e.target.value)}
                  className="bg-transparent text-slate-300 focus:outline-none cursor-pointer text-xs max-w-[150px] truncate"
                >
                  <option value="ALL" className="bg-[#081223] text-white">All Trainers</option>
                  {trainersList.map(t => (
                    <option key={t} value={t} className="bg-[#081223] text-white">{t}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Year Filter */}
            <div className="flex items-center gap-1 bg-[#050c18] border border-[#132747] rounded-xl px-2.5 py-1 text-xs font-mono">
              <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value as any)}
                className="bg-transparent text-slate-300 focus:outline-none cursor-pointer text-xs"
              >
                <option value="ALL" className="bg-[#081223] text-white">All Years (2025 + 2026)</option>
                <option value="2025" className="bg-[#081223] text-white">📁 2025 Folder</option>
                <option value="2026" className="bg-[#081223] text-white">📁 2026 Folder</option>
              </select>
            </div>

            {/* View Mode Toggle: List vs Calendar */}
            <div className="flex items-center bg-[#050c18] border border-[#132747] rounded-xl p-0.5">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>List View</span>
              </button>

              <button
                onClick={() => setViewMode('calendar')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                  viewMode === 'calendar'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>Calendar View</span>
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* ========================================================= */}
      {/* 3. SCHEDULE MAIN DISPLAY (LIST VIEW vs CALENDAR VIEW)      */}
      {/* ========================================================= */}
      
      {filteredSchedules.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-[#122544] bg-[#081223] text-slate-400 font-mono">
          <CalendarDays className="w-10 h-10 mx-auto text-slate-600 mb-2" />
          <p className="text-sm font-bold text-slate-300">No training schedules matching your selected filters.</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('ALL');
              setTrainerFilter('ALL');
              setDeptFilter('ALL');
              setYearFilter('ALL');
            }}
            className="mt-3 px-4 py-2 rounded-xl bg-[#0c1e3d] border border-[#193766] text-amber-400 hover:text-white text-xs font-mono transition cursor-pointer"
          >
            Clear All Filters
          </button>
        </div>
      ) : viewMode === 'list' ? (
        
        /* ========================================================= */
        /* LIST / TABLE VIEW                                         */
        /* ========================================================= */
        <div className="bg-[#081223] border border-[#14294a] rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead>
                <tr className="bg-[#09152b] text-slate-300 border-b border-[#142a4f] font-mono text-[11px] uppercase tracking-wider">
                  <th className="py-3.5 px-3 w-8"></th>
                  <th className="py-3.5 px-3 whitespace-nowrap">Training Date & Day</th>
                  <th className="py-3.5 px-3 whitespace-nowrap">Time</th>
                  <th className="py-3.5 px-3">Training Topic / Module</th>
                  <th className="py-3.5 px-3">Department / Section</th>
                  <th className="py-3.5 px-3">Venue</th>
                  <th className="py-3.5 px-3 text-center">Trainee Leaders</th>
                  <th className="py-3.5 px-3 text-center">Status</th>
                  <th className="py-3.5 px-3 text-right">Actions & Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0f2142]">
                {filteredSchedules.map((schedule) => {
                  const isExpanded = !!expandedRows[schedule.id];
                  const isUpcoming = schedule.status === 'Upcoming';
                  const isOngoing = schedule.status === 'Ongoing';
                  const isCompleted = schedule.status === 'Completed';
                  const isRescheduled = schedule.status === 'Rescheduled';
                  const isCancelled = schedule.status === 'Cancelled';

                  return (
                    <React.Fragment key={schedule.id}>
                      <tr className={`hover:bg-[#0c1c38]/70 transition-colors group ${
                        isOngoing ? 'bg-emerald-950/20 border-l-4 border-l-emerald-500' : ''
                      }`}>
                        
                        {/* Expand Row Toggle */}
                        <td className="py-3 px-2 text-center">
                          <button
                            onClick={() => toggleRow(schedule.id)}
                            className="p-1 text-slate-400 hover:text-amber-400 rounded-md transition cursor-pointer"
                            title="Toggle syllabus & leader roster"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-amber-400" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </td>

                        {/* Training Date & Day */}
                        <td className="py-3 px-3 whitespace-nowrap font-mono text-xs">
                          <div className="font-bold text-white">{schedule.trainingDate}</div>
                          <div className="text-[11px] text-amber-400/90 font-medium">{schedule.dayOfWeek}</div>
                        </td>

                        {/* Time */}
                        <td className="py-3 px-3 whitespace-nowrap font-mono text-xs text-slate-200">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                            <span>{schedule.time}</span>
                          </div>
                        </td>

                        {/* Training Topic / Module */}
                        <td className="py-3 px-3 max-w-xs">
                          <div className="font-bold text-white group-hover:text-amber-300 transition-colors font-sans text-sm">
                            {schedule.trainingTopic}
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5 font-sans">
                            {schedule.purposeAndRemarks}
                          </p>
                          {schedule.notes && (
                            <p className="text-[10px] text-amber-400/80 italic mt-0.5 font-sans">
                              📌 {schedule.notes}
                            </p>
                          )}
                        </td>

                        {/* Department / Section */}
                        <td className="py-3 px-3 max-w-[180px]">
                          <div className="text-slate-300 truncate" title={schedule.departmentSection}>
                            {schedule.departmentSection}
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">{schedule.batch}</span>
                        </td>

                        {/* Venue */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-lg bg-[#050c18] border border-[#152a4e] text-slate-300 text-[11px] font-mono flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-cyan-400" />
                            {schedule.venue}
                          </span>
                        </td>

                        {/* Trainee Leaders */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <button
                            onClick={() => {
                              setSelectedSession(schedule);
                              setIsTraineesModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-xl bg-[#091833] hover:bg-[#0f2854] border border-[#16315c] text-slate-200 hover:text-amber-300 text-xs font-mono font-bold transition cursor-pointer inline-flex items-center gap-1 shadow-sm"
                            title="Click to view trainee leaders roster"
                          >
                            <Users className="w-3.5 h-3.5 text-amber-400" />
                            <span>{schedule.traineeLeadersCount || schedule.traineeLeaders.length} Leaders</span>
                          </button>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold font-mono ${
                            isCompleted
                              ? 'bg-teal-500/10 text-teal-400 border border-teal-500/30'
                              : isOngoing
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                              : isUpcoming
                              ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                              : isRescheduled
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          }`}>
                            {isOngoing && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
                            {isUpcoming && <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />}
                            {isCompleted && <CheckCircle2 className="w-3 h-3 text-teal-400" />}
                            {isRescheduled && <Clock3 className="w-3 h-3 text-amber-400" />}
                            {isCancelled && <XCircle className="w-3 h-3 text-rose-400" />}
                            <span>{schedule.status}</span>
                          </span>
                        </td>

                        {/* Actions & Function Controls */}
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1 flex-wrap">
                            
                            {/* View Details */}
                            <button
                              onClick={() => {
                                setSelectedSession(schedule);
                                setIsDetailsModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg bg-[#091833] hover:bg-[#102a57] text-slate-300 hover:text-cyan-300 border border-[#16315c] transition cursor-pointer"
                              title="View Full Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Mark as Ongoing (if not already ongoing) */}
                            {schedule.status !== 'Ongoing' && schedule.status !== 'Completed' && (
                              <button
                                onClick={() => handleMarkStatus(schedule.id, 'Ongoing')}
                                className="px-2 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/50 text-[10px] font-mono font-bold transition cursor-pointer flex items-center gap-1"
                                title="Mark session as currently ongoing"
                              >
                                <Play className="w-3 h-3 text-emerald-400 fill-emerald-400" />
                                <span>Ongoing</span>
                              </button>
                            )}

                            {/* Mark as Completed */}
                            {schedule.status !== 'Completed' && (
                              <button
                                onClick={() => handleMarkStatus(schedule.id, 'Completed')}
                                className="px-2 py-1 rounded-lg bg-teal-950/60 hover:bg-teal-900 text-teal-300 border border-teal-700/50 text-[10px] font-mono font-bold transition cursor-pointer flex items-center gap-1"
                                title="Mark session as completed"
                              >
                                <Check className="w-3 h-3 text-teal-400" />
                                <span>Done</span>
                              </button>
                            )}

                            {/* Reschedule button */}
                            {role === 'Admin' && (
                              <button
                                onClick={() => handleOpenReschedule(schedule)}
                                className="px-2 py-1 rounded-lg bg-amber-950/60 hover:bg-amber-900 text-amber-300 border border-amber-700/50 text-[10px] font-mono font-bold transition cursor-pointer flex items-center gap-1"
                                title="Reschedule session date/time/venue"
                              >
                                <Clock3 className="w-3 h-3 text-amber-400" />
                                <span>Reschedule</span>
                              </button>
                            )}

                            {/* Edit */}
                            {role === 'Admin' && (
                              <button
                                onClick={() => {
                                  setEditingItem({ ...schedule });
                                  setIsEditModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg bg-[#091833] hover:bg-[#102a57] text-slate-300 hover:text-amber-300 border border-[#16315c] transition cursor-pointer"
                                title="Edit Full Schedule"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Cancel */}
                            {role === 'Admin' && schedule.status !== 'Cancelled' && (
                              <button
                                onClick={() => handleMarkStatus(schedule.id, 'Cancelled')}
                                className="p-1.5 rounded-lg bg-[#091833] hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-[#16315c] transition cursor-pointer"
                                title="Cancel Schedule"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Delete */}
                            {role === 'Admin' && (
                              <button
                                onClick={() => handleDeleteSession(schedule.id)}
                                className="p-1.5 rounded-lg bg-[#091833] hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-[#16315c] transition cursor-pointer"
                                title="Delete Entry Permanently"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                          </div>
                        </td>

                      </tr>

                      {/* Expandable Syllabus & Content Details */}
                      {isExpanded && (
                        <tr className="bg-[#050c18]/95 border-b border-[#14294a]">
                          <td colSpan={9} className="p-4">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
                              
                              {/* Objectives & Remarks */}
                              <div className="bg-[#081427] border border-[#102547] rounded-xl p-3.5 space-y-2">
                                <div className="flex items-center gap-2 text-amber-400 font-bold font-mono">
                                  <Info className="w-4 h-4" />
                                  <span>Training Purpose & Remarks</span>
                                </div>
                                <p className="text-slate-300 leading-relaxed text-xs">
                                  {schedule.purposeAndRemarks}
                                </p>
                                {schedule.notes && (
                                  <div className="p-2 rounded bg-[#0a1b38] text-[11px] text-amber-300 border border-amber-500/20">
                                    <strong>Notes:</strong> {schedule.notes}
                                  </div>
                                )}
                              </div>

                              {/* Syllabus & Core Modules */}
                              <div className="bg-[#081427] border border-[#102547] rounded-xl p-3.5 space-y-2">
                                <div className="flex items-center gap-2 text-cyan-400 font-bold font-mono">
                                  <BookOpen className="w-4 h-4" />
                                  <span>Key Syllabus Topics & Steps</span>
                                </div>
                                <ul className="space-y-1 text-slate-300">
                                  {schedule.content.map((c, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 flex-shrink-0" />
                                      <span>{c}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              {/* Trainee Leaders Enrolled Summary */}
                              <div className="bg-[#081427] border border-[#102547] rounded-xl p-3.5 space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 text-purple-400 font-bold font-mono">
                                    <Users className="w-4 h-4" />
                                    <span>Trainee Leaders Roster</span>
                                  </div>
                                  <button
                                    onClick={() => {
                                      setSelectedSession(schedule);
                                      setIsTraineesModalOpen(true);
                                    }}
                                    className="text-[11px] text-amber-400 hover:underline font-mono"
                                  >
                                    Manage Attendance &rarr;
                                  </button>
                                </div>

                                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                  {schedule.traineeLeaders.length > 0 ? (
                                    schedule.traineeLeaders.map((ldr, idx) => (
                                      <div key={ldr.id || idx} className="flex items-center justify-between text-[11px] bg-[#050c18] px-2 py-1 rounded border border-[#122442]">
                                        <span className="font-semibold text-slate-200 truncate">{ldr.lineOrSection || ldr.position || `Leader #${idx + 1}`}</span>
                                        <span className="font-mono text-slate-400 text-[10px]">{ldr.department}</span>
                                      </div>
                                    ))
                                  ) : (
                                    <p className="text-slate-500 italic text-[11px]">Factory-wide cohort attendance registered.</p>
                                  )}
                                </div>
                              </div>

                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      ) : (

        /* ========================================================= */
        /* CALENDAR VIEW                                             */
        /* ========================================================= */
        <div className="bg-[#081223] border border-[#14294a] rounded-2xl p-4 shadow-2xl space-y-4">
          
          {/* Calendar Month Navigation Header */}
          <div className="flex items-center justify-between border-b border-[#122444] pb-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                className="p-1.5 rounded-lg bg-[#050c18] border border-[#162d59] text-slate-300 hover:text-white cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-amber-400" />
                <span>{monthNameYear}</span>
              </h3>

              <button
                onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                className="p-1.5 rounded-lg bg-[#050c18] border border-[#162d59] text-slate-300 hover:text-white cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="flex items-center gap-1 text-sky-400">
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                Upcoming
              </span>
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Ongoing
              </span>
              <span className="flex items-center gap-1 text-teal-400">
                <span className="w-2 h-2 rounded-full bg-teal-400" />
                Completed
              </span>
              <span className="flex items-center gap-1 text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Rescheduled
              </span>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1.5 text-xs font-mono">
            
            {/* Days of week header */}
            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
              <div key={day} className="py-2 text-center text-[11px] font-bold text-slate-400 bg-[#060e1d] rounded-lg border border-[#0e1d38]">
                {day}
              </div>
            ))}

            {/* Month Day Cells */}
            {calendarDays.map((day, idx) => {
              if (!day.dayNumber) {
                return <div key={`empty-${idx}`} className="min-h-[110px] bg-[#060e1d]/30 rounded-xl border border-transparent" />;
              }

              const daySchedules = schedules.filter(s => s.isoDate === day.dateStr);

              return (
                <div
                  key={day.dateStr}
                  className={`min-h-[110px] p-2 rounded-xl border transition-all flex flex-col justify-between ${
                    daySchedules.length > 0
                      ? 'bg-[#0a1b38] border-amber-500/40 shadow-md'
                      : 'bg-[#050c18] border-[#102445] hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-300 text-xs">{day.dayNumber}</span>
                    {daySchedules.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[9px] font-bold">
                        {daySchedules.length} {daySchedules.length === 1 ? 'Session' : 'Sessions'}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 mt-1 flex-1 overflow-y-auto max-h-24">
                    {daySchedules.map(s => {
                      const isCompleted = s.status === 'Completed';
                      const isOngoing = s.status === 'Ongoing';
                      const isRescheduled = s.status === 'Rescheduled';

                      return (
                        <div
                          key={s.id}
                          onClick={() => {
                            setSelectedSession(s);
                            setIsDetailsModalOpen(true);
                          }}
                          className={`p-1.5 rounded-lg border text-[10px] font-sans cursor-pointer transition ${
                            isCompleted
                              ? 'bg-teal-950/40 border-teal-500/30 text-teal-200'
                              : isOngoing
                              ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-200 shadow-sm'
                              : isRescheduled
                              ? 'bg-amber-950/40 border-amber-500/30 text-amber-200'
                              : 'bg-sky-950/40 border-sky-500/30 text-sky-200'
                          }`}
                        >
                          <div className="font-bold truncate">{s.trainingTopic}</div>
                          <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono mt-0.5">
                            <span>{s.time}</span>
                            <span>{s.trainer.split(' ')[0]}</span>
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

      )}

      {/* ========================================================= */}
      {/* MODAL 1: VIEW SCHEDULE DETAILS MODAL                      */}
      {/* ========================================================= */}
      {isDetailsModalOpen && selectedSession && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#081223] border border-[#162d59] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-fadeIn text-xs">
            
            {/* Header */}
            <div className="p-4 border-b border-[#122444] flex items-center justify-between bg-[#09152b]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white font-sans">{selectedSession.trainingTopic}</h3>
                  <span className="text-[11px] text-amber-400 font-mono">{selectedSession.batch}</span>
                </div>
              </div>
              <button
                onClick={() => setIsDetailsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#0f244a] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto space-y-4">
              
              {/* Quick Status and Timeline Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
                <div className="bg-[#050c18] p-2 rounded-xl border border-[#122442]">
                  <span className="text-[10px] text-slate-500 block">Status</span>
                  <span className="font-bold text-white text-xs">{selectedSession.status}</span>
                </div>
                <div className="bg-[#050c18] p-2 rounded-xl border border-[#122442]">
                  <span className="text-[10px] text-slate-500 block">Date & Day</span>
                  <span className="font-bold text-amber-400 text-xs">{selectedSession.trainingDate}</span>
                </div>
                <div className="bg-[#050c18] p-2 rounded-xl border border-[#122442]">
                  <span className="text-[10px] text-slate-500 block">Time</span>
                  <span className="font-bold text-cyan-300 text-xs">{selectedSession.time}</span>
                </div>
                <div className="bg-[#050c18] p-2 rounded-xl border border-[#122442]">
                  <span className="text-[10px] text-slate-500 block">Venue</span>
                  <span className="font-bold text-purple-300 text-xs">{selectedSession.venue}</span>
                </div>
              </div>

              {/* Department & Batch Information */}
              <div className="bg-[#050c18] border border-[#122442] rounded-xl p-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 font-mono">Department / Section</span>
                  <p className="text-xs font-semibold text-slate-200">{selectedSession.departmentSection}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 font-mono">Cohort Batch</span>
                  <p className="text-xs font-semibold text-amber-400">{selectedSession.batch}</p>
                </div>
              </div>

              {/* Purpose & Remarks */}
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-amber-400 font-mono uppercase tracking-wider">Training Purpose & Objectives</h4>
                <div className="p-3 bg-[#050c18] border border-[#122442] rounded-xl text-slate-200 leading-relaxed font-sans">
                  {selectedSession.purposeAndRemarks}
                </div>
              </div>

              {/* Notes */}
              {selectedSession.notes && (
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-cyan-400 font-mono uppercase tracking-wider">Notes & Remarks</h4>
                  <div className="p-2.5 bg-[#050c18] border border-[#122442] rounded-xl text-amber-300 font-sans text-xs">
                    {selectedSession.notes}
                  </div>
                </div>
              )}

              {/* Syllabus Topics */}
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-cyan-400 font-mono uppercase tracking-wider">Curriculum Syllabus & Content</h4>
                <div className="p-3 bg-[#050c18] border border-[#122442] rounded-xl space-y-1.5">
                  {selectedSession.content.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-slate-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-3 border-t border-[#122444] bg-[#09152b] flex items-center justify-between">
              {role === 'Admin' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setIsDetailsModalOpen(false);
                      handleOpenReschedule(selectedSession);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-950 text-amber-300 border border-amber-600/40 text-xs font-mono font-bold hover:bg-amber-900 cursor-pointer"
                  >
                    Reschedule Session
                  </button>
                  <button
                    onClick={() => {
                      setIsDetailsModalOpen(false);
                      setEditingItem({ ...selectedSession });
                      setIsEditModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#0c1e3d] text-slate-200 border border-[#193766] text-xs font-mono font-bold hover:bg-[#122c54] cursor-pointer"
                  >
                    Edit
                  </button>
                </div>
              )}
              <button
                onClick={() => setIsDetailsModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-mono font-bold text-xs hover:bg-amber-400 cursor-pointer ml-auto"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: RESCHEDULE MODAL                                 */}
      {/* ========================================================= */}
      {isRescheduleModalOpen && rescheduleTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#081223] border border-[#162d59] rounded-2xl max-w-lg w-full overflow-hidden flex flex-col shadow-2xl animate-fadeIn text-xs">
            
            <div className="p-4 border-b border-[#122444] flex items-center justify-between bg-[#09152b]">
              <div className="flex items-center gap-2">
                <Clock3 className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white font-sans">
                  Reschedule Training Session
                </h3>
              </div>
              <button
                onClick={() => setIsRescheduleModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#0f244a] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmReschedule} className="p-4 space-y-3">
              
              <div className="p-3 bg-[#050c18] border border-[#122442] rounded-xl">
                <span className="text-[10px] text-slate-500 font-mono uppercase block">Module</span>
                <p className="text-sm font-bold text-white font-sans">{rescheduleTarget.trainingTopic}</p>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">{rescheduleTarget.departmentSection}</p>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-300 mb-1">New Training Date *</label>
                <input
                  type="text"
                  required
                  value={newRescheduleDate}
                  onChange={(e) => setNewRescheduleDate(e.target.value)}
                  placeholder="e.g. September 22, 2026"
                  className="w-full bg-[#050c18] border border-[#132747] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/60 font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-mono text-slate-300 mb-1">New Time</label>
                  <input
                    type="text"
                    value={newRescheduleTime}
                    onChange={(e) => setNewRescheduleTime(e.target.value)}
                    placeholder="e.g. 2:00-3:00pm"
                    className="w-full bg-[#050c18] border border-[#132747] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/60 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-300 mb-1">Venue</label>
                  <input
                    type="text"
                    value={newRescheduleVenue}
                    onChange={(e) => setNewRescheduleVenue(e.target.value)}
                    placeholder="e.g. TRAINING ROOM DTP"
                    className="w-full bg-[#050c18] border border-[#132747] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/60 font-sans"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-300 mb-1">Reason for Rescheduling / Remarks</label>
                <textarea
                  rows={3}
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="e.g. Rescheduled due to department production schedule adjustment."
                  className="w-full bg-[#050c18] border border-[#132747] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/60 font-sans"
                />
              </div>

              <div className="pt-2 border-t border-[#122444] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRescheduleModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-[#0c1e3d] text-slate-300 font-mono text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-mono text-xs cursor-pointer shadow-md"
                >
                  Confirm Reschedule
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: TRAINEE LEADERS ROSTER & ATTENDANCE MODAL        */}
      {/* ========================================================= */}
      {isTraineesModalOpen && selectedSession && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#081223] border border-[#162d59] rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-fadeIn text-xs">
            
            {/* Header */}
            <div className="p-4 border-b border-[#122444] flex items-center justify-between bg-[#09152b]">
              <div>
                <h3 className="text-sm font-bold text-white font-sans flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" />
                  <span>Trainee Leaders Roster: {selectedSession.trainingTopic}</span>
                </h3>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  {selectedSession.trainingDate} • {selectedSession.time} • {selectedSession.venue}
                </p>
              </div>
              <button
                onClick={() => setIsTraineesModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#0f244a] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search & Stats Bar */}
            <div className="p-3 border-b border-[#122444] bg-[#050c18] flex items-center justify-between gap-3 font-mono">
              <span className="text-slate-300">
                Total Enrolled: <strong className="text-white">{selectedSession.traineeLeaders.length}</strong> | 
                Attended: <strong className="text-emerald-400">{selectedSession.traineeLeaders.filter(l => l.attended).length}</strong>
              </span>
              <span className="text-[10px] text-slate-500">
                Click attendance pill to toggle status
              </span>
            </div>

            {/* Trainee Roster Table */}
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {selectedSession.traineeLeaders.length === 0 ? (
                <div className="py-8 text-center text-slate-400 font-mono">
                  <p>No individual leaders attached to this general cohort session.</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse font-sans">
                  <thead>
                    <tr className="bg-[#09152b] text-slate-300 border-b border-[#14294f] font-mono text-[10px] uppercase">
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Role / Position</th>
                      <th className="py-2.5 px-3">Employee ID</th>
                      <th className="py-2.5 px-3">Department</th>
                      <th className="py-2.5 px-3">Line / Section</th>
                      <th className="py-2.5 px-3 text-center">Attendance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#0e2142]">
                    {selectedSession.traineeLeaders.map((ldr, idx) => (
                      <tr key={ldr.id || idx} className="hover:bg-[#0c1c38]/60 transition-colors">
                        <td className="py-2 px-3 font-mono text-slate-500">{idx + 1}</td>
                        <td className="py-2 px-3 font-bold text-white">{ldr.position || ldr.lineOrSection || `Leader #${idx + 1}`}</td>
                        <td className="py-2 px-3 font-mono text-slate-400">{ldr.employeeNo}</td>
                        <td className="py-2 px-3 font-mono text-slate-300">{ldr.department}</td>
                        <td className="py-2 px-3 font-mono text-slate-400">{ldr.lineOrSection}</td>
                        <td className="py-2 px-3 text-center">
                          <button
                            onClick={() => toggleTraineeAttendance(selectedSession.id, ldr.id)}
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold transition cursor-pointer ${
                              ldr.attended
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'
                            }`}
                          >
                            {ldr.attended ? 'Attended ✓' : 'Pending'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-[#122444] bg-[#09152b] flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">
                Changes persist automatically in workstation database.
              </span>
              <button
                onClick={() => setIsTraineesModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold font-mono text-xs hover:bg-amber-400 cursor-pointer"
              >
                Save & Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: ADD / EDIT SCHEDULE MODAL                        */}
      {/* ========================================================= */}
      {isEditModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#081223] border border-[#162d59] rounded-2xl max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-fadeIn text-xs">
            
            <div className="p-4 border-b border-[#122444] flex items-center justify-between bg-[#09152b]">
              <h3 className="text-sm font-bold text-white font-sans">
                {editingItem.id ? 'Edit Training Schedule' : 'Add New Training Schedule'}
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#0f244a] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditSession} className="p-4 overflow-y-auto space-y-3">
              
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Training Topic / Module *</label>
                <input
                  type="text"
                  required
                  value={editingItem.trainingTopic || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, trainingTopic: e.target.value })}
                  placeholder="e.g. 6s Management"
                  className="w-full bg-[#050c18] border border-[#132747] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/60 font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Training Date *</label>
                  <input
                    type="text"
                    required
                    value={editingItem.trainingDate || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, trainingDate: e.target.value })}
                    placeholder="e.g. August 29, 2026"
                    className="w-full bg-[#050c18] border border-[#132747] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/60 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Day of Week</label>
                  <input
                    type="text"
                    value={editingItem.dayOfWeek || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, dayOfWeek: e.target.value })}
                    placeholder="e.g. Saturday"
                    className="w-full bg-[#050c18] border border-[#132747] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/60 font-sans"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Time Range</label>
                  <input
                    type="text"
                    value={editingItem.time || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, time: e.target.value })}
                    placeholder="e.g. 2:00-3:00pm"
                    className="w-full bg-[#050c18] border border-[#132747] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/60 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Status</label>
                  <select
                    value={editingItem.status || 'Upcoming'}
                    onChange={(e) => setEditingItem({ ...editingItem, status: e.target.value as any })}
                    className="w-full bg-[#050c18] border border-[#132747] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/60 font-mono"
                  >
                    <option value="Upcoming">Upcoming / Scheduled</option>
                    <option value="Ongoing">Ongoing</option>
                    <option value="Completed">Completed</option>
                    <option value="Rescheduled">Rescheduled</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Venue & Facility Room</label>
                <input
                  type="text"
                  value={editingItem.venue || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, venue: e.target.value })}
                  placeholder="e.g. TRAINING ROOM DTP"
                  className="w-full bg-[#050c18] border border-[#132747] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/60 font-sans"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Department / Section</label>
                <input
                  type="text"
                  value={editingItem.departmentSection || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, departmentSection: e.target.value })}
                  placeholder="e.g. Stitching, Assembly & QC Section Leaders"
                  className="w-full bg-[#050c18] border border-[#132747] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/60 font-sans"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Objective & Remarks</label>
                <textarea
                  rows={2}
                  value={editingItem.purposeAndRemarks || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, purposeAndRemarks: e.target.value })}
                  placeholder="Describe the training purpose, regulations, and objectives..."
                  className="w-full bg-[#050c18] border border-[#132747] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/60 font-sans"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  value={editingItem.notes || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value })}
                  placeholder="e.g. Reschedule details, requirements, room reservations"
                  className="w-full bg-[#050c18] border border-[#132747] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/60 font-sans"
                />
              </div>

              <div className="pt-2 border-t border-[#122444] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-[#0c1e3d] text-slate-300 font-mono text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-mono text-xs cursor-pointer shadow-md"
                >
                  Save Schedule
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};

export default LeadershipScheduleView;
