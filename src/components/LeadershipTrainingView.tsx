import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  CalendarDays,
  BookOpen,
  BarChart3,
  FolderOpen,
  Folder,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Award,
  Search,
  Plus,
  ArrowRight,
  Filter,
  Upload
} from 'lucide-react';
import {
  INITIAL_LEADERSHIP_SHEET_DATA,
  INITIAL_LEADERSHIP_FILES,
  INITIAL_LEADERSHIP_COMPLETION_SUMMARIES,
  LeadershipTraineeRow,
  LeadershipUploadedFile,
  LeadershipDepartmentSummaryItem,
  cleanTraineeName
} from '../data/leadershipSheetData';
import {
  OFFICIAL_LEADERSHIP_SCHEDULES,
  LeadershipScheduleItem,
  calculateYearSummaryMetrics,
  extractYearFromDate
} from '../data/leadershipScheduleData';
import {
  syncEntityToMaster,
  subscribeToRealtimeSync,
  fetchMasterBootstrap
} from '../services/realtimeSync';

import { LeadershipMasterTraineeList } from './leadership/LeadershipMasterTraineeList';
import { LeadershipAttendanceMatrix } from './leadership/LeadershipAttendanceMatrix';
import { LeadershipScheduleView } from './leadership/LeadershipScheduleView';
import { LeadershipSyllabusView } from './leadership/LeadershipSyllabusView';
import { LeadershipAnalyticsView } from './leadership/LeadershipAnalyticsView';
import { LeadershipFileUploader } from './leadership/LeadershipFileUploader';
import { LeadershipCertificateModal } from './leadership/LeadershipCertificateModal';
import { LeadershipDataImporterModal } from './leadership/LeadershipDataImporterModal';

interface LeadershipTrainingViewProps {
  logs?: any[];
  setLogs?: React.Dispatch<React.SetStateAction<any[]>>;
  courses?: any[];
  setCourses?: React.Dispatch<React.SetStateAction<any[]>>;
  records?: any[];
  setRecords?: React.Dispatch<React.SetStateAction<any[]>>;
  documents?: any[];
  setDocuments?: React.Dispatch<React.SetStateAction<any[]>>;
  role?: string;
  addToast: (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  registerBackHandler?: (handler: () => boolean) => () => void;
}

export type LeadershipMainTab =
  | 'matrix'
  | 'schedules'
  | 'analytics'
  | 'files'
  | 'master-trainees'
  | 'syllabus';

export const LeadershipTrainingView: React.FC<LeadershipTrainingViewProps> = ({
  role = 'Admin',
  addToast,
  registerBackHandler
}) => {
  // 1. Navigation State (Unified Section)
  const [activeTab, setActiveTab] = useState<LeadershipMainTab>(() => {
    try {
      const saved = localStorage.getItem('csr_leadership_active_tab_v3');
      if (saved && ['matrix', 'schedules', 'analytics', 'files', 'master-trainees', 'syllabus'].includes(saved)) {
        return saved as LeadershipMainTab;
      }
    } catch {}
    return 'matrix';
  });

  // Top-level Global Year Filter: 'ALL' | '2025' | '2026'
  const [yearFilter, setYearFilter] = useState<'ALL' | '2025' | '2026'>('ALL');

  // Search query state
  const [globalSearch, setGlobalSearch] = useState<string>('');

  // Importer Modal State
  const [isImporterOpen, setIsImporterOpen] = useState<boolean>(false);

  const handleSelectTab = (tab: LeadershipMainTab) => {
    setActiveTab(tab);
    try {
      localStorage.setItem('csr_leadership_active_tab_v3', tab);
    } catch {}
  };

  // 2. Trainees Master Data (Sheet 1 2025: 85 records + Sheet 2 2026: 116 records = 201 total)
  const [trainees, setTrainees] = useState<LeadershipTraineeRow[]>(() => {
    try {
      const cached = localStorage.getItem('csr_cached_leadershipAttendance');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = parsed.map((t: any) => ({ ...t, name: cleanTraineeName(t.name) }));
          const has2025 = cleaned.some((t: any) => t.year === 2025);
          if (has2025) return cleaned;
          const default2025 = INITIAL_LEADERSHIP_SHEET_DATA.filter((t) => t.year === 2025);
          return [...default2025, ...cleaned];
        }
      }
    } catch (e) {
      console.warn('Error reading cached leadershipAttendance:', e);
    }
    return INITIAL_LEADERSHIP_SHEET_DATA;
  });

  // 3. Schedules Master Data
  const [schedules, setSchedules] = useState<LeadershipScheduleItem[]>(() => {
    try {
      const cached = localStorage.getItem('csr_cached_leadershipSchedules');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const sanitized = parsed.map((s: any) => ({
            ...s,
            trainer: '',
            trainerRole: '',
            traineeLeaders: (s.traineeLeaders || []).map((tl: any) => ({ ...tl, name: '' })),
            documentation: (s.documentation || []).map((d: any) => ({ ...d, uploadedBy: 'Training Division' }))
          }));
          const has2025 = sanitized.some(
            (s: any) => s.year === 2025 || (s.trainingDate && s.trainingDate.includes('2025'))
          );
          if (has2025) return sanitized;
          const default2025 = OFFICIAL_LEADERSHIP_SCHEDULES.filter((s) => s.year === 2025);
          return [...default2025, ...sanitized];
        }
      }
    } catch (e) {
      console.warn('Error reading cached leadershipSchedules:', e);
    }
    return OFFICIAL_LEADERSHIP_SCHEDULES;
  });

  // 4. Department Completion Summaries (2025 Stitching 35/22/0/57, Cutting 0/6/4/10, etc.)
  const [departmentSummaries, setDepartmentSummaries] = useState<LeadershipDepartmentSummaryItem[]>(() => {
    try {
      const cached = localStorage.getItem('csr_cached_leadershipDeptSummaries');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Error reading cached leadershipDeptSummaries:', e);
    }
    return INITIAL_LEADERSHIP_COMPLETION_SUMMARIES;
  });

  // 5. Files Master Data
  const [files, setFiles] = useState<LeadershipUploadedFile[]>(() => {
    try {
      const cached = localStorage.getItem('csr_cached_leadershipFiles');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Error reading cached leadershipFiles:', e);
    }
    return INITIAL_LEADERSHIP_FILES;
  });

  // 6. Cloud Sync State & Certificate Modal State
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [selectedTraineeForCert, setSelectedTraineeForCert] = useState<LeadershipTraineeRow | null>(null);

  // 7. Bootstrap Data from Server on Mount
  useEffect(() => {
    let isMounted = true;
    async function loadServerData() {
      try {
        const serverDb = await fetchMasterBootstrap();
        if (serverDb && isMounted) {
          if (Array.isArray(serverDb.leadershipAttendance) && serverDb.leadershipAttendance.length > 0) {
            let loadedTrainees = serverDb.leadershipAttendance.map((t: any) => ({
              ...t,
              name: cleanTraineeName(t.name)
            }));
            const has2025 = loadedTrainees.some((t: any) => t.year === 2025);
            if (!has2025) {
              const default2025 = INITIAL_LEADERSHIP_SHEET_DATA.filter((t) => t.year === 2025);
              loadedTrainees = [...default2025, ...loadedTrainees];
            }
            setTrainees(loadedTrainees);
            localStorage.setItem('csr_cached_leadershipAttendance', JSON.stringify(loadedTrainees));
          }
          if (Array.isArray(serverDb.leadershipSchedules) && serverDb.leadershipSchedules.length > 0) {
            let loadedSchedules = serverDb.leadershipSchedules.map((s: any) => ({
              ...s,
              trainer: '',
              trainerRole: '',
              traineeLeaders: (s.traineeLeaders || []).map((tl: any) => ({ ...tl, name: '' })),
              documentation: (s.documentation || []).map((d: any) => ({ ...d, uploadedBy: 'Training Division' }))
            }));
            const has2025 = loadedSchedules.some(
              (s: any) => s.year === 2025 || (s.trainingDate && s.trainingDate.includes('2025'))
            );
            if (!has2025) {
              const default2025 = OFFICIAL_LEADERSHIP_SCHEDULES.filter((s) => s.year === 2025);
              loadedSchedules = [...default2025, ...loadedSchedules];
            }
            setSchedules(loadedSchedules);
            localStorage.setItem('csr_cached_leadershipSchedules', JSON.stringify(loadedSchedules));
          }
          if (Array.isArray((serverDb as any).leadershipDeptSummaries) && (serverDb as any).leadershipDeptSummaries.length > 0) {
            setDepartmentSummaries((serverDb as any).leadershipDeptSummaries);
            localStorage.setItem('csr_cached_leadershipDeptSummaries', JSON.stringify((serverDb as any).leadershipDeptSummaries));
          }
          if (Array.isArray(serverDb.leadershipFiles) && serverDb.leadershipFiles.length > 0) {
            setFiles(serverDb.leadershipFiles);
            localStorage.setItem('csr_cached_leadershipFiles', JSON.stringify(serverDb.leadershipFiles));
          }
        }
      } catch (err) {
        console.warn('Bootstrap fetch failed for Leadership Training:', err);
      }
    }
    loadServerData();
    return () => {
      isMounted = false;
    };
  }, []);

  // 8. Subscribe to Real-Time SSE Events for Multi-Device Synchronisation
  useEffect(() => {
    const unsubscribe = subscribeToRealtimeSync((event) => {
      if (!event) return;

      if (event.type === 'ENTITY_UPDATED' || event.type === 'BATCH_UPDATED') {
        if (event.entity === 'leadershipAttendance' && Array.isArray(event.data)) {
          setTrainees(event.data);
          localStorage.setItem('csr_cached_leadershipAttendance', JSON.stringify(event.data));
        } else if (event.entity === 'leadershipSchedules' && Array.isArray(event.data)) {
          setSchedules(event.data);
          localStorage.setItem('csr_cached_leadershipSchedules', JSON.stringify(event.data));
        } else if (event.entity === 'leadershipDeptSummaries' && Array.isArray(event.data)) {
          setDepartmentSummaries(event.data);
          localStorage.setItem('csr_cached_leadershipDeptSummaries', JSON.stringify(event.data));
        } else if (event.entity === 'leadershipFiles' && Array.isArray(event.data)) {
          setFiles(event.data);
          localStorage.setItem('csr_cached_leadershipFiles', JSON.stringify(event.data));
        } else if (event.entity === 'all' && event.data) {
          if (Array.isArray(event.data.leadershipAttendance)) {
            setTrainees(event.data.leadershipAttendance);
          }
          if (Array.isArray(event.data.leadershipSchedules)) {
            setSchedules(event.data.leadershipSchedules);
          }
          if (Array.isArray(event.data.leadershipFiles)) {
            setFiles(event.data.leadershipFiles);
          }
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // 9. Register Back Button Handler
  useEffect(() => {
    if (!registerBackHandler) return;
    return registerBackHandler(() => {
      if (isImporterOpen) {
        setIsImporterOpen(false);
        return true;
      }
      if (selectedTraineeForCert) {
        setSelectedTraineeForCert(null);
        return true;
      }
      if (activeTab !== 'master-trainees') {
        setActiveTab('master-trainees');
        return true;
      }
      return false;
    });
  }, [selectedTraineeForCert, isImporterOpen, activeTab, registerBackHandler]);

  // 10. Persistent Update Handlers
  const handleUpdateTrainees = useCallback(async (newTrainees: LeadershipTraineeRow[]) => {
    const cleaned = newTrainees.map((t) => ({ ...t, name: cleanTraineeName(t.name) }));
    setTrainees(cleaned);
    setIsSyncing(true);
    try {
      localStorage.setItem('csr_cached_leadershipAttendance', JSON.stringify(cleaned));
      await syncEntityToMaster('leadershipAttendance', cleaned, 'update');
    } catch (e) {
      console.error('Error saving leadership attendance:', e);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const handleUpdateSingleTrainee = useCallback((updated: LeadershipTraineeRow) => {
    const newTrainees = trainees.map((t) => (t.id === updated.id ? updated : t));
    handleUpdateTrainees(newTrainees);
    addToast('Record Updated', `Updated training records for ${updated.name}.`, 'success');
  }, [trainees, handleUpdateTrainees, addToast]);

  const handleAddTrainee = useCallback((newTrainee: LeadershipTraineeRow) => {
    const newTrainees = [newTrainee, ...trainees];
    handleUpdateTrainees(newTrainees);
    addToast('Trainee Leader Added', `Added ${newTrainee.name} to leadership training database.`, 'success');
  }, [trainees, handleUpdateTrainees, addToast]);

  const handleDeleteTrainee = useCallback((id: string) => {
    const newTrainees = trainees.filter((t) => t.id !== id);
    handleUpdateTrainees(newTrainees);
    addToast('Record Removed', 'Trainee leader record removed from database.', 'info');
  }, [trainees, handleUpdateTrainees, addToast]);

  const handleUpdateSchedules = useCallback(async (newSchedules: LeadershipScheduleItem[]) => {
    setSchedules(newSchedules);
    setIsSyncing(true);
    try {
      localStorage.setItem('csr_cached_leadershipSchedules', JSON.stringify(newSchedules));
      await syncEntityToMaster('leadershipSchedules', newSchedules, 'update');
    } catch (e) {
      console.error('Error saving leadership schedules:', e);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const handleAddSchedule = useCallback((newSched: LeadershipScheduleItem) => {
    const updated = [newSched, ...schedules];
    handleUpdateSchedules(updated);
  }, [schedules, handleUpdateSchedules]);

  const handleUpdateSingleSchedule = useCallback((updatedSched: LeadershipScheduleItem) => {
    const updated = schedules.map((s) => (s.id === updatedSched.id ? updatedSched : s));
    handleUpdateSchedules(updated);
  }, [schedules, handleUpdateSchedules]);

  const handleDeleteSchedule = useCallback((id: string) => {
    const updated = schedules.filter((s) => s.id !== id);
    handleUpdateSchedules(updated);
  }, [schedules, handleUpdateSchedules]);

  const handleUpdateSummaries = useCallback(async (newSummaries: LeadershipDepartmentSummaryItem[]) => {
    setDepartmentSummaries(newSummaries);
    setIsSyncing(true);
    try {
      localStorage.setItem('csr_cached_leadershipDeptSummaries', JSON.stringify(newSummaries));
      await syncEntityToMaster('leadershipDeptSummaries', newSummaries, 'update');
    } catch (e) {
      console.error('Error saving leadership department summaries:', e);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const handleUpdateFiles = useCallback(async (newFiles: LeadershipUploadedFile[]) => {
    setFiles(newFiles);
    setIsSyncing(true);
    try {
      localStorage.setItem('csr_cached_leadershipFiles', JSON.stringify(newFiles));
      await syncEntityToMaster('leadershipFiles', newFiles, 'update');
    } catch (e) {
      console.error('Error saving leadership files:', e);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const handleAddFile = useCallback((newFile: LeadershipUploadedFile) => {
    const updated = [newFile, ...files];
    handleUpdateFiles(updated);
    addToast('File Uploaded', `Saved ${newFile.fileName} to shared cloud repository.`, 'success');
  }, [files, handleUpdateFiles, addToast]);

  const handleDeleteFile = useCallback((id: string) => {
    const updated = files.filter((f) => f.id !== id);
    handleUpdateFiles(updated);
    addToast('File Deleted', 'File record removed from repository.', 'info');
  }, [files, handleUpdateFiles, addToast]);

  // Importer Integration Handlers
  const handleImportTrainees = (imported: LeadershipTraineeRow[], mode: 'merge' | 'replace' | 'append') => {
    let combined: LeadershipTraineeRow[] = [];
    if (mode === 'replace') {
      const yearToReplace = imported[0]?.year;
      combined = [...trainees.filter((t) => t.year !== yearToReplace), ...imported];
    } else if (mode === 'append') {
      combined = [...imported, ...trainees];
    } else {
      // Merge mode
      const map = new Map<string, LeadershipTraineeRow>();
      trainees.forEach((t) => {
        const key = (t.employeeNo || t.name).trim().toUpperCase();
        map.set(key, t);
      });
      imported.forEach((t) => {
        const key = (t.employeeNo || t.name).trim().toUpperCase();
        map.set(key, { ...(map.get(key) || {}), ...t });
      });
      combined = Array.from(map.values());
    }
    handleUpdateTrainees(combined);
  };

  const handleImportSchedules = (imported: LeadershipScheduleItem[], mode: 'merge' | 'replace' | 'append') => {
    let combined: LeadershipScheduleItem[] = [];
    if (mode === 'replace') {
      const yearToReplace = imported[0]?.year;
      combined = [...schedules.filter((s) => s.year !== yearToReplace), ...imported];
    } else if (mode === 'append') {
      combined = [...imported, ...schedules];
    } else {
      const map = new Map<string, LeadershipScheduleItem>();
      schedules.forEach((s) => map.set(`${s.trainingDate}_${s.trainingTopic}`, s));
      imported.forEach((s) => map.set(`${s.trainingDate}_${s.trainingTopic}`, s));
      combined = Array.from(map.values());
    }
    handleUpdateSchedules(combined);
  };

  const handleImportDepartmentSummaries = (imported: LeadershipDepartmentSummaryItem[], mode: 'merge' | 'replace' | 'append') => {
    let combined: LeadershipDepartmentSummaryItem[] = [];
    if (mode === 'replace') {
      const yearToReplace = imported[0]?.year;
      combined = [...departmentSummaries.filter((s) => s.year !== yearToReplace), ...imported];
    } else {
      const map = new Map<string, LeadershipDepartmentSummaryItem>();
      departmentSummaries.forEach((s) => map.set(`${s.year}_${s.department.toLowerCase()}`, s));
      imported.forEach((s) => map.set(`${s.year}_${s.department.toLowerCase()}`, s));
      combined = Array.from(map.values());
    }
    handleUpdateSummaries(combined);
  };

  // Unified Year Statistics (Reflects yearFilter across all 2025 and 2026 data)
  const unifiedYearStats = useMemo(() => {
    const filterYearNum = yearFilter === 'ALL' ? null : parseInt(yearFilter, 10);

    const matchTraineeYear = (t: LeadershipTraineeRow) => {
      if (!filterYearNum) return true;
      const derived = t.year || (t.trainingDate?.includes('2026') ? 2026 : (t.trainingDate?.includes('2025') ? 2025 : (t.sourceSheet?.includes('2026') ? 2026 : 2025)));
      return derived === filterYearNum;
    };

    const matchScheduleYear = (s: LeadershipScheduleItem) => {
      if (!filterYearNum) return true;
      if (s.year === filterYearNum) return true;
      if (s.trainingDate && s.trainingDate.includes(String(filterYearNum))) return true;
      if (s.isoDate && s.isoDate.startsWith(String(filterYearNum))) return true;
      return false;
    };

    const currentTrainees = trainees.filter(matchTraineeYear);
    const currentSchedules = schedules.filter(matchScheduleYear);
    const completedCount = currentTrainees.filter((t) => t.status === 'Completed').length;
    const completionRate =
      currentTrainees.length > 0 ? ((completedCount / currentTrainees.length) * 100).toFixed(1) : '0.0';

    return {
      traineesCount: currentTrainees.length,
      schedulesCount: currentSchedules.length,
      completedCount,
      completionRate,
      count2025: trainees.filter((t) => t.year === 2025).length,
      count2026: trainees.filter((t) => t.year === 2026).length
    };
  }, [trainees, schedules, yearFilter]);

  // Records needing review (unparseable dates)
  const recordsNeedingReview = useMemo(() => {
    return schedules.filter((s) => {
      if (s.year === 2025 || s.year === 2026) return false;
      const { isReviewNeeded } = extractYearFromDate(s.isoDate || s.trainingDate);
      return isReviewNeeded;
    });
  }, [schedules]);

  return (
    <div className="space-y-3 p-2 md:p-4 max-w-[1850px] mx-auto min-h-screen bg-[#070707] text-slate-100 font-sans text-xs">
      {/* ========================================================= */}
      {/* 1. TOP HUB BANNER & NAVIGATION (BLACK, YELLOW & BLUE)     */}
      {/* ========================================================= */}
      <div className="bg-[#0f0f10] border border-[#222222] rounded-xl p-3.5 sm:p-4 shadow-xl space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[#1f1f22]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-yellow-400" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm sm:text-base font-black text-white uppercase tracking-wider font-sans">
                  DA TIAN SUBIC SHOES • LEADERSHIP TRAINING HUB
                </h1>
                <span className="px-2 py-0.5 rounded bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 text-[10px] font-mono font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-yellow-400" />
                  SUPERVISORY MATRIX
                </span>
                <span className="px-2 py-0.5 rounded bg-blue-600/20 border border-blue-500/30 text-blue-300 text-[10px] font-mono font-bold">
                  UNIFIED 2025 &amp; 2026 COHORTS
                </span>
                {isSyncing && (
                  <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-yellow-400 text-[10px] font-mono font-bold flex items-center gap-1">
                    <RefreshCw className="w-2.5 h-2.5 animate-spin text-yellow-400" />
                    Syncing...
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Standardized modular instruction records with unified cross-cohort archives and instant Year Filtering.
              </p>
            </div>
          </div>

          {/* Action Buttons: Import Data & Year Filters */}
          <div className="flex items-center gap-2 flex-wrap self-start lg:self-auto">
            {/* PROMINENT UPLOAD FILE / IMPORT DATA ACTION */}
            <button
              id="btn_leadership_import_data"
              onClick={() => setIsImporterOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-400 hover:bg-yellow-300 active:bg-yellow-500 text-black font-black rounded-lg text-xs transition shadow-md shadow-yellow-500/20 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Upload File / Import Data</span>
            </button>

            {/* Top-Level Year Filter (Select Dropdown) */}
            <div className="flex items-center gap-2 bg-black border border-[#27272a] px-3 py-1.5 rounded-lg shadow-sm">
              <span className="text-[11px] font-mono font-bold text-yellow-400 uppercase tracking-wider flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-yellow-400" />
                Year:
              </span>
              <select
                id="select_leadership_year_filter"
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value as 'ALL' | '2025' | '2026')}
                className="bg-[#141416] text-white border border-[#3f3f46] text-xs font-mono font-bold rounded px-2.5 py-1 focus:outline-none focus:border-yellow-400 cursor-pointer"
              >
                <option value="ALL">All Years</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
              </select>
            </div>

            {/* Quick-Toggle Year Buttons */}
            <div className="flex items-center gap-1 bg-black border border-[#262626] p-1 rounded-lg">
              <button
                onClick={() => setYearFilter('ALL')}
                className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold transition cursor-pointer ${
                  yearFilter === 'ALL'
                    ? 'bg-neutral-800 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All
              </button>

              <button
                onClick={() => setYearFilter('2025')}
                className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold transition cursor-pointer flex items-center gap-1 ${
                  yearFilter === '2025'
                    ? 'bg-yellow-500 text-black font-black'
                    : 'text-yellow-400 hover:text-yellow-300'
                }`}
              >
                2025
              </button>

              <button
                onClick={() => setYearFilter('2026')}
                className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold transition cursor-pointer flex items-center gap-1 ${
                  yearFilter === '2026'
                    ? 'bg-yellow-500 text-black font-black'
                    : 'text-yellow-400 hover:text-yellow-300'
                }`}
              >
                2026
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Metric Bar (Responding live to yearFilter) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          <div className="bg-[#141416] border border-[#222225] rounded-lg p-2.5">
            <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">Total Trainees</div>
            <div className="text-base sm:text-lg font-mono font-black text-yellow-400 mt-0.5">
              {unifiedYearStats.traineesCount}
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
              {yearFilter === 'ALL'
                ? '85 (2025) + 116 (2026)'
                : yearFilter === '2025'
                ? '2025 Cohort (Sheet 1)'
                : '2026 Cohort (Sheet 2)'}
            </div>
          </div>

          <div className="bg-[#141416] border border-[#222225] rounded-lg p-2.5">
            <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">Training Sessions</div>
            <div className="text-base sm:text-lg font-mono font-black text-blue-400 mt-0.5">
              {unifiedYearStats.schedulesCount}
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
              {yearFilter === 'ALL'
                ? '8 (2025) + 18 (2026)'
                : yearFilter === '2025'
                ? '8 Sessions (July–Aug)'
                : '18 Sessions (Jan–Feb)'}
            </div>
          </div>

          <div className="bg-[#141416] border border-[#222225] rounded-lg p-2.5">
            <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">Certified Leaders</div>
            <div className="text-base sm:text-lg font-mono font-black text-white mt-0.5">
              {unifiedYearStats.completedCount}
            </div>
            <div className="text-[10px] text-yellow-400 font-mono mt-0.5 font-bold">
              {unifiedYearStats.completionRate}% Completion Rate
            </div>
          </div>

          <div className="bg-[#141416] border border-[#222225] rounded-lg p-2.5">
            <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">Plant Coverage</div>
            <div className="text-base sm:text-lg font-mono font-black text-blue-300 mt-0.5">
              4 Lines
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
              Stitching • Cutting • Assembly • Rubber
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. PRIMARY UNIFIED ARCHITECTURE TABS                      */}
        {/* ========================================================= */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-thin border-t border-[#1f1f22] pt-2">
          {/* TAB 1: ATTENDANCE MATRIX & ROSTER (PRIMARY VIEW) */}
          <button
            onClick={() => handleSelectTab('matrix')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold transition cursor-pointer whitespace-nowrap border ${
              activeTab === 'matrix'
                ? 'bg-yellow-500 text-black border-yellow-400 font-black shadow-sm'
                : 'bg-black text-slate-300 hover:text-white border-[#222222] hover:bg-neutral-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>ATTENDANCE MATRIX &amp; ROSTER</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                activeTab === 'matrix'
                  ? 'bg-black/25 text-black font-black'
                  : 'bg-[#18181b] text-yellow-400'
              }`}
            >
              {unifiedYearStats.traineesCount}
            </span>
          </button>

          {/* TAB 2: TRAINING SCHEDULES */}
          <button
            onClick={() => handleSelectTab('schedules')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold transition cursor-pointer whitespace-nowrap border ${
              activeTab === 'schedules'
                ? 'bg-yellow-500 text-black border-yellow-400 font-black shadow-sm'
                : 'bg-black text-slate-300 hover:text-white border-[#222222] hover:bg-neutral-900'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>TRAINING SCHEDULES</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                activeTab === 'schedules'
                  ? 'bg-black/25 text-black font-black'
                  : 'bg-[#18181b] text-blue-400'
              }`}
            >
              {unifiedYearStats.schedulesCount}
            </span>
          </button>

          {/* TAB 3: COMPLETION DATA & ANALYTICS */}
          <button
            onClick={() => handleSelectTab('analytics')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold transition cursor-pointer whitespace-nowrap border ${
              activeTab === 'analytics'
                ? 'bg-yellow-500 text-black border-yellow-400 font-black shadow-sm'
                : 'bg-black text-slate-300 hover:text-white border-[#222222] hover:bg-neutral-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
            <span>3D ANALYTICS &amp; COMPLETION</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                activeTab === 'analytics'
                  ? 'bg-black/25 text-black font-black'
                  : 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/30'
              }`}
            >
              3D PIE
            </span>
          </button>

          {/* TAB 4: DOCUMENTS & REPOSITORY */}
          <button
            onClick={() => handleSelectTab('files')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold transition cursor-pointer whitespace-nowrap border ${
              activeTab === 'files'
                ? 'bg-yellow-500 text-black border-yellow-400 font-black shadow-sm'
                : 'bg-black text-slate-300 hover:text-white border-[#222222] hover:bg-neutral-900'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5 text-blue-400" />
            <span>DOCUMENTS ({files.length})</span>
          </button>

          {/* TAB 5: MASTER SUPERVISORY DIRECTORY */}
          <button
            onClick={() => handleSelectTab('master-trainees')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold transition cursor-pointer whitespace-nowrap border ${
              activeTab === 'master-trainees'
                ? 'bg-yellow-500 text-black border-yellow-400 font-black shadow-sm'
                : 'bg-black text-slate-300 hover:text-white border-[#222222] hover:bg-neutral-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-yellow-400" />
            <span>SUPERVISORY PROFILES</span>
          </button>

          {/* TAB 6: COURSE OUTLINE */}
          <button
            onClick={() => handleSelectTab('syllabus')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold transition cursor-pointer whitespace-nowrap border ${
              activeTab === 'syllabus'
                ? 'bg-yellow-500 text-black border-yellow-400 font-black shadow-sm'
                : 'bg-black text-slate-300 hover:text-white border-[#222222] hover:bg-neutral-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-400" />
            <span>COURSE OUTLINE</span>
          </button>
        </div>
      </div>

      {/* Needs Review Notice */}
      {recordsNeedingReview.length > 0 && (
        <div className="bg-[#121008] border border-yellow-500/40 rounded-xl p-3 flex items-center justify-between text-xs text-yellow-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0" />
            <span>
              <strong>Safe Archive Check:</strong> {recordsNeedingReview.length} record(s) have unstandardized dates and are preserved safely.
            </span>
          </div>
          <button
            onClick={() => handleSelectTab('schedules')}
            className="px-2.5 py-1 bg-yellow-500 text-black rounded font-bold hover:bg-yellow-400 transition cursor-pointer"
          >
            Review Dates
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. ACTIVE TAB CONTENT                                     */}
      {/* ========================================================= */}

      {/* 1. ATTENDANCE MATRIX & ROSTER (PRIMARY UNIFIED WORKSPACE) */}
      {activeTab === 'matrix' && (
        <LeadershipAttendanceMatrix
          trainees={trainees}
          onUpdateTrainee={handleUpdateSingleTrainee}
          onAddTrainee={handleAddTrainee}
          onDeleteTrainee={handleDeleteTrainee}
          onOpenCertificate={(trainee) => setSelectedTraineeForCert(trainee)}
          addToast={addToast}
          role={role}
          isSyncing={isSyncing}
          yearFilterOverride={yearFilter}
          onSwitchToAnalytics={() => handleSelectTab('analytics')}
        />
      )}

      {/* 2. MASTER TRAINEE DIRECTORY & PROFILES */}
      {activeTab === 'master-trainees' && (
        <LeadershipMasterTraineeList
          trainees={trainees}
          schedules={schedules}
          searchQuery={globalSearch}
          onSearchChange={setGlobalSearch}
          yearFilter={yearFilter}
          onSelectYear={(yr) => setYearFilter(yr)}
          addToast={addToast}
        />
      )}

      {/* 3. ALL SCHEDULES & CALENDAR */}
      {activeTab === 'schedules' && (
        <LeadershipScheduleView
          role={role}
          addToast={addToast}
          registerBackHandler={registerBackHandler}
          schedules={schedules}
          onUpdateSchedules={handleUpdateSchedules}
          allTrainees={trainees}
          initialYearFilter={yearFilter}
        />
      )}

      {/* 4. ANALYTICS & COMPLETION DATA */}
      {activeTab === 'analytics' && (
        <LeadershipAnalyticsView
          trainees={trainees}
          schedules={schedules}
          departmentSummaries={departmentSummaries}
          initialYear={yearFilter}
          onBackToFolder={() => handleSelectTab('matrix')}
          onOpenImporter={() => setIsImporterOpen(true)}
        />
      )}

      {/* 5. MODULES & SYLLABUS */}
      {activeTab === 'syllabus' && (
        <LeadershipSyllabusView />
      )}

      {/* 6. DOCUMENTS & REPOSITORY */}
      {activeTab === 'files' && (
        <LeadershipFileUploader
          files={files}
          onUploadFile={handleAddFile}
          onDeleteFile={handleDeleteFile}
          addToast={addToast}
          currentUser="System Admin"
          isSyncing={isSyncing}
        />
      )}

      {/* Official Certificate of Completion Modal */}
      {selectedTraineeForCert && (
        <LeadershipCertificateModal
          trainee={selectedTraineeForCert}
          onClose={() => setSelectedTraineeForCert(null)}
          addToast={addToast}
        />
      )}

      {/* Dedicated Upload File / Import Data Modal (Mandated) */}
      <LeadershipDataImporterModal
        isOpen={isImporterOpen}
        onClose={() => setIsImporterOpen(false)}
        onImportTrainees={handleImportTrainees}
        onImportSchedules={handleImportSchedules}
        onImportDepartmentSummaries={handleImportDepartmentSummaries}
        addToast={addToast}
        existingTraineesCount={trainees.length}
        existingSchedulesCount={schedules.length}
      />
    </div>
  );
};

export default LeadershipTrainingView;
