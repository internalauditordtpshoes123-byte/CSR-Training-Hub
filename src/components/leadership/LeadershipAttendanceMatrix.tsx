import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Filter,
  Download,
  Printer,
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Award,
  Edit2,
  Trash2,
  RefreshCw,
  SlidersHorizontal,
  ChevronDown,
  Info,
  Calendar,
  Sparkles,
  Users,
  Check,
  RotateCcw,
  Layers,
  Table,
  Grid,
  FileSpreadsheet,
  Building2,
  TrendingUp,
  Clock,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  PieChart
} from 'lucide-react';
import {
  LeadershipTraineeRow,
  LEADERSHIP_COURSES_DEF,
  LeadershipCourseAttendance,
  calculateLeadershipStatus,
  cleanTraineeName
} from '../../data/leadershipSheetData';

interface LeadershipAttendanceMatrixProps {
  trainees: LeadershipTraineeRow[];
  onUpdateTrainee: (updated: LeadershipTraineeRow) => void;
  onAddTrainee: (newTrainee: LeadershipTraineeRow) => void;
  onDeleteTrainee: (id: string) => void;
  onResetToOfficialData?: () => void;
  onOpenCertificate?: (trainee: LeadershipTraineeRow) => void;
  addToast: (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  role?: string;
  isSyncing?: boolean;
  yearFilterOverride?: 'ALL' | '2025' | '2026';
  onSwitchToAnalytics?: () => void;
}

export const LeadershipAttendanceMatrix: React.FC<LeadershipAttendanceMatrixProps> = ({
  trainees,
  onUpdateTrainee,
  onAddTrainee,
  onDeleteTrainee,
  onResetToOfficialData,
  onOpenCertificate,
  addToast,
  role = 'Admin',
  isSyncing = false,
  yearFilterOverride,
  onSwitchToAnalytics
}) => {
  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [yearFilter, setYearFilter] = useState<'ALL' | '2025' | '2026'>(yearFilterOverride || 'ALL');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Completed' | 'Incomplete' | 'No Show'>('ALL');
  const [sectionFilter, setSectionFilter] = useState<string>('ALL');

  // Sync yearFilter when yearFilterOverride prop updates
  useEffect(() => {
    if (yearFilterOverride) {
      setYearFilter(yearFilterOverride);
    }
  }, [yearFilterOverride]);

  // View modes: 'masterTable' (the exact table requested) vs 'matrix' (checkbox grid)
  const [viewMode, setViewMode] = useState<'masterTable' | 'matrix'>('masterTable');

  // Modals & Editing
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTrainee, setEditingTrainee] = useState<LeadershipTraineeRow | null>(null);
  const [selectedTraineeForDetails, setSelectedTraineeForDetails] = useState<LeadershipTraineeRow | null>(null);

  // Form state for Add / Edit
  const [formName, setFormName] = useState('');
  const [formEmployeeNo, setFormEmployeeNo] = useState('');
  const [formDept, setFormDept] = useState('');
  const [formYear, setFormYear] = useState<2025 | 2026>(2026);
  const [formSourceSheet, setFormSourceSheet] = useState<string>('Sheet 2 (2026)');
  const [formTrainingDate, setFormTrainingDate] = useState('January 05, 2026 – February 2026');
  const [formTrainingTopic, setFormTrainingTopic] = useState('8 Core Leadership Modules');
  const [formSection, setFormSection] = useState('January – February 2026 Batch');
  const [formCourses, setFormCourses] = useState<LeadershipCourseAttendance>({
    machine: false,
    quality: false,
    sixSManagement: false,
    metalManagement: false,
    lineBalancing: false,
    teamAndManagement: false,
    effectiveCommunication: false,
    changeStyleManagement: false,
    hrManagement: false
  });

  // Extract all unique departments dynamically from BOTH sheets
  const allUniqueDepartments = useMemo(() => {
    const depts = new Set<string>();
    trainees.forEach((t) => {
      if (t.department && t.department.trim()) {
        depts.add(t.department.trim());
      }
    });
    return Array.from(depts).sort();
  }, [trainees]);

  // Extract all unique sections/batches
  const allUniqueSections = useMemo(() => {
    const sects = new Set<string>();
    trainees.forEach((t) => {
      if (t.section && t.section.trim()) {
        sects.add(t.section.trim());
      }
    });
    return Array.from(sects).sort();
  }, [trainees]);

  // Filtered dataset
  const filteredTrainees = useMemo(() => {
    return trainees.filter((t) => {
      // Search matching: Name, Employee No, Department, Topic
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = t.name?.toLowerCase().includes(q);
        const matchEmp = t.employeeNo?.toLowerCase().includes(q);
        const matchDept = t.department?.toLowerCase().includes(q);
        const matchTopic = t.trainingTopic?.toLowerCase().includes(q);
        if (!matchName && !matchEmp && !matchDept && !matchTopic) {
          return false;
        }
      }

      // Year Filter
      if (yearFilter !== 'ALL') {
        const filterYear = parseInt(yearFilter, 10);
        const derivedYear = t.year || (t.trainingDate?.includes('2026') ? 2026 : (t.trainingDate?.includes('2025') ? 2025 : (t.sourceSheet?.includes('2026') ? 2026 : 2025)));
        if (derivedYear !== filterYear) {
          return false;
        }
      }

      // Department Filter
      if (deptFilter !== 'ALL') {
        if (deptFilter === 'CAT:Stitching' && !t.department.toLowerCase().includes('stitching') && !t.department.toLowerCase().includes('punching')) return false;
        if (deptFilter === 'CAT:Assembly' && !t.department.toLowerCase().includes('assembly') && !t.department.toLowerCase().includes('midsole') && !t.department.toLowerCase().includes('vulcanizing') && !t.department.toLowerCase().includes('shoelast')) return false;
        if (deptFilter === 'CAT:Cutting' && !t.department.toLowerCase().includes('cutting')) return false;
        if (deptFilter === 'CAT:Rubber' && !t.department.toLowerCase().includes('rubber') && !t.department.toLowerCase().includes('milling') && !t.department.toLowerCase().includes('d2p') && !t.department.toLowerCase().includes('dtp')) return false;
        if (!deptFilter.startsWith('CAT:') && t.department !== deptFilter) return false;
      }

      // Status Filter
      if (statusFilter !== 'ALL' && t.status !== statusFilter) {
        return false;
      }

      // Section Filter
      if (sectionFilter !== 'ALL' && t.section !== sectionFilter) {
        return false;
      }

      return true;
    });
  }, [trainees, searchQuery, yearFilter, deptFilter, statusFilter, sectionFilter]);

  // Reactive Dashboard Summary Stats
  const stats = useMemo(() => {
    const totalCount = filteredTrainees.length;
    let count2025 = 0;
    let count2026 = 0;
    let completed = 0;
    let incomplete = 0;
    let noShow = 0;
    const deptsSet = new Set<string>();

    filteredTrainees.forEach((t) => {
      if (t.year === 2025) count2025++;
      if (t.year === 2026) count2026++;
      if (t.status === 'Completed') completed++;
      else if (t.status === 'No Show') noShow++;
      else incomplete++;

      if (t.department) deptsSet.add(t.department.trim());
    });

    const completionRate = totalCount > 0 ? ((completed / totalCount) * 100).toFixed(1) : '0.0';

    return {
      totalCount,
      count2025,
      count2026,
      totalDepartments: deptsSet.size,
      completed,
      incomplete,
      noShow,
      completionRate
    };
  }, [filteredTrainees]);

  // Handle Course Checkbox Toggle in Matrix
  const handleToggleCourse = (trainee: LeadershipTraineeRow, courseKey: keyof LeadershipCourseAttendance) => {
    const updatedCourses = {
      ...trainee.courses,
      [courseKey]: !trainee.courses[courseKey]
    };

    const { total, status } = calculateLeadershipStatus(trainee.department, updatedCourses, trainee.section);

    const updatedTrainee: LeadershipTraineeRow = {
      ...trainee,
      courses: updatedCourses,
      total,
      status,
      lastModified: new Date().toISOString()
    };

    onUpdateTrainee(updatedTrainee);
    addToast(
      'Attendance Updated',
      `${trainee.name}: ${courseKey} attendance updated. Live Score: ${total} (${status})`,
      'success'
    );
  };

  // Open Edit Modal
  const openEditModal = (t: LeadershipTraineeRow) => {
    setEditingTrainee(t);
    setFormName(t.name);
    setFormEmployeeNo(t.employeeNo || `DTP-${t.year}-${t.no.toString().padStart(4, '0')}`);
    setFormDept(t.department);
    setFormYear(t.year as 2025 | 2026);
    setFormSourceSheet(t.sourceSheet);
    setFormTrainingDate(t.trainingDate);
    setFormTrainingTopic(t.trainingTopic);
    setFormSection(t.section);
    setFormCourses({ ...t.courses });
    setIsAddModalOpen(true);
  };

  // Open Add Modal
  const openAddModal = () => {
    setEditingTrainee(null);
    setFormName('');
    const nextNo = trainees.length + 1;
    setFormEmployeeNo(`DTP-2026-${nextNo.toString().padStart(4, '0')}`);
    setFormDept('Stitching Line A1');
    setFormYear(2026);
    setFormSourceSheet('Sheet 2 (2026)');
    setFormTrainingDate('January 05, 2026 – February 2026');
    setFormTrainingTopic('8 Core Leadership Modules');
    setFormSection('January – February 2026 Batch');
    setFormCourses({
      machine: false,
      quality: false,
      sixSManagement: false,
      metalManagement: false,
      lineBalancing: false,
      teamAndManagement: false,
      effectiveCommunication: false,
      changeStyleManagement: false,
      hrManagement: false
    });
    setIsAddModalOpen(true);
  };

  // Save Trainee (Create / Edit)
  const handleSaveTrainee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      addToast('Validation Error', 'Trainee full name is required.', 'error');
      return;
    }
    if (!formDept.trim()) {
      addToast('Validation Error', 'Department is required.', 'error');
      return;
    }

    const { total, status } = calculateLeadershipStatus(formDept, formCourses, formSection);

    const getDeptCategory = (d: string) => {
      const low = d.toLowerCase();
      if (low.includes('stitching') || low.includes('punching')) return 'Stitching';
      if (low.includes('assembly') || low.includes('midsole') || low.includes('vulcanizing')) return 'Assembly';
      if (low.includes('cutting')) return 'Cutting';
      if (low.includes('rubber') || low.includes('d2p') || low.includes('dtp')) return 'Rubber';
      return 'Warehouse & Other';
    };

    if (editingTrainee) {
      const updated: LeadershipTraineeRow = {
        ...editingTrainee,
        name: cleanTraineeName(formName.trim()),
        employeeNo: formEmployeeNo.trim() || editingTrainee.employeeNo,
        department: formDept.trim(),
        departmentCategory: getDeptCategory(formDept),
        year: formYear,
        sourceSheet: formSourceSheet,
        trainingDate: formTrainingDate,
        trainingTopic: formTrainingTopic,
        section: formSection,
        courses: formCourses,
        total,
        status,
        lastModified: new Date().toISOString()
      };
      onUpdateTrainee(updated);
      addToast('Trainee Updated', `Successfully updated record for ${updated.name}`, 'success');
    } else {
      const newNo = trainees.filter((t) => t.year === formYear).length + 1;
      const newId = `lead-${formYear}-manual-${Date.now()}`;
      const newRow: LeadershipTraineeRow = {
        id: newId,
        no: newNo,
        name: cleanTraineeName(formName.trim()),
        employeeNo: formEmployeeNo.trim() || `DTP-${formYear}-${newNo.toString().padStart(4, '0')}`,
        department: formDept.trim(),
        departmentCategory: getDeptCategory(formDept),
        year: formYear,
        sourceSheet: formSourceSheet,
        trainingDate: formTrainingDate,
        trainingTopic: formTrainingTopic,
        section: formSection,
        courses: formCourses,
        total,
        status,
        lastModified: new Date().toISOString()
      };
      onAddTrainee(newRow);
      addToast('Trainee Added', `Successfully enrolled ${newRow.name} to ${formSourceSheet}`, 'success');
    }

    setIsAddModalOpen(false);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (filteredTrainees.length === 0) {
      addToast('Export Notice', 'No records match current filter criteria.', 'warning');
      return;
    }

    const headers = [
      'No.',
      'Full Name',
      'Employee No.',
      'Department',
      'Department Category',
      'Training Date',
      'Year',
      'Training Topic',
      'Status',
      'Batch Section',
      'Machine',
      'Quality',
      '6S Mgmt',
      'Metal Mgmt',
      'Line Balancing',
      'Team & Mgmt',
      'Effective Comm',
      'Change Style',
      'HR Mgmt',
      'Total Modules',
      'Certificate Qualified'
    ];

    const rows = filteredTrainees.map((t, idx) => [
      idx + 1,
      `"${t.name.replace(/"/g, '""')}"`,
      `"${t.employeeNo || ''}"`,
      `"${t.department.replace(/"/g, '""')}"`,
      `"${t.departmentCategory || ''}"`,
      `"${t.trainingDate}"`,
      t.year,
      `"${t.trainingTopic}"`,
      t.status,
      `"${t.section}"`,
      t.courses.machine ? '1' : '0',
      t.courses.quality ? '1' : '0',
      t.courses.sixSManagement ? '1' : '0',
      t.courses.metalManagement ? '1' : '0',
      t.courses.lineBalancing ? '1' : '0',
      t.courses.teamAndManagement ? '1' : '0',
      t.courses.effectiveCommunication ? '1' : '0',
      t.courses.changeStyleManagement ? '1' : '0',
      t.courses.hrManagement ? '1' : '0',
      t.total,
      t.status === 'Completed' ? 'YES' : 'NO'
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `Leadership_Training_Both_Sheets_${yearFilter === 'ALL' ? '2025_2026' : yearFilter}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('CSV Exported', `Exported ${filteredTrainees.length} records successfully.`, 'success');
  };

  return (
    <div id="leadership-matrix-container" className="space-y-3 font-sans text-xs text-slate-100">
      {/* SECTION HEADER & CONTROL BAR (CORPORATE THEME: BLACK, YELLOW, BLUE) */}
      <div className="bg-[#0f0f10] text-white rounded-xl p-3.5 sm:p-4 shadow-md border border-[#222222]">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="space-y-1 max-w-3xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 text-[10px] font-mono font-bold tracking-wide uppercase">
              <Sparkles className="w-3 h-3 text-yellow-400" />
              Da Tian Subic Shoes • Leadership Training Database
            </div>
            <h1 className="text-base sm:text-lg font-black tracking-tight text-white uppercase">
              Leadership & Supervisory Attendance Matrix
            </h1>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Consolidated supervisory monitoring across <strong>2025 Cohort</strong> and{' '}
              <strong>2026 Cohort</strong>. Includes attendance checkmarks, modular scores, employee IDs,
              double-click profile inspection, and certification tracking.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onSwitchToAnalytics && (
              <button
                id="btn-view-3d-pie"
                onClick={onSwitchToAnalytics}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-500/15 hover:bg-yellow-500/25 text-yellow-300 text-xs font-bold border border-yellow-500/30 transition cursor-pointer shadow-xs"
                title="Open 3D Interactive Pie Chart & Leadership Analytics"
              >
                <PieChart className="w-3.5 h-3.5 text-yellow-400" />
                <span>3D Pie Analytics</span>
              </button>
            )}
            <button
              id="btn-export-csv"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1a1c] hover:bg-[#252528] text-slate-200 text-xs font-bold border border-[#2e2e33] transition cursor-pointer"
              title="Export filtered records to CSV"
            >
              <Download className="w-3.5 h-3.5 text-yellow-400" />
              Export CSV
            </button>
            <button
              id="btn-print-matrix"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1a1c] hover:bg-[#252528] text-slate-200 text-xs font-bold border border-[#2e2e33] transition cursor-pointer"
              title="Print master roster"
            >
              <Printer className="w-3.5 h-3.5 text-blue-400" />
              Print Roster
            </button>
            <button
              id="btn-add-trainee"
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-black font-black text-xs shadow-xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Trainee
            </button>
          </div>
        </div>

        {/* SUMMARY STATS TILES */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5 mt-3 pt-3 border-t border-[#222222]">
          <div className="bg-[#111113] rounded-lg p-2.5 border border-[#262626]">
            <div className="flex items-center justify-between text-slate-400 text-[10px] font-mono uppercase tracking-wider mb-0.5">
              <span>Total Trainees</span>
              <Users className="w-3 h-3 text-slate-400" />
            </div>
            <div className="text-xl font-bold text-white tracking-tight">{stats.totalCount}</div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">All sheets</div>
          </div>

          <div className="bg-[#111113] rounded-lg p-2.5 border border-[#262626]">
            <div className="flex items-center justify-between text-yellow-400 text-[10px] font-mono uppercase tracking-wider mb-0.5">
              <span>2025 Trainees</span>
              <Calendar className="w-3 h-3 text-yellow-400" />
            </div>
            <div className="text-xl font-bold text-yellow-400 tracking-tight">{stats.count2025}</div>
            <div className="text-[10px] text-yellow-500/70 font-mono mt-0.5">Sheet 1 (July–Aug 2025)</div>
          </div>

          <div className="bg-[#111113] rounded-lg p-2.5 border border-[#262626]">
            <div className="flex items-center justify-between text-blue-400 text-[10px] font-mono uppercase tracking-wider mb-0.5">
              <span>2026 Trainees</span>
              <Calendar className="w-3 h-3 text-blue-400" />
            </div>
            <div className="text-xl font-bold text-blue-400 tracking-tight">{stats.count2026}</div>
            <div className="text-[10px] text-blue-400/70 font-mono mt-0.5">Sheet 2 (2026 Cohort)</div>
          </div>

          <div className="bg-[#111113] rounded-lg p-2.5 border border-[#262626]">
            <div className="flex items-center justify-between text-slate-400 text-[10px] font-mono uppercase tracking-wider mb-0.5">
              <span>Departments</span>
              <Building2 className="w-3 h-3 text-slate-400" />
            </div>
            <div className="text-xl font-bold text-white tracking-tight">{stats.totalDepartments}</div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">Factory lines & depts</div>
          </div>

          <div className="bg-[#111113] rounded-lg p-2.5 border border-[#262626]">
            <div className="flex items-center justify-between text-yellow-400 text-[10px] font-mono uppercase tracking-wider mb-0.5">
              <span>Completed</span>
              <CheckCircle2 className="w-3 h-3 text-yellow-400" />
            </div>
            <div className="text-xl font-bold text-yellow-400 tracking-tight">{stats.completed}</div>
            <div className="text-[10px] text-yellow-500/70 font-mono mt-0.5">{stats.completionRate}% Certified</div>
          </div>

          <div className="bg-[#111113] rounded-lg p-2.5 border border-[#262626]">
            <div className="flex items-center justify-between text-slate-400 text-[10px] font-mono uppercase tracking-wider mb-0.5">
              <span>Incomplete / No Show</span>
              <AlertCircle className="w-3 h-3 text-slate-400" />
            </div>
            <div className="text-xl font-bold text-slate-300 tracking-tight">
              {stats.incomplete + stats.noShow}
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
              {stats.incomplete} inc. / {stats.noShow} no-show
            </div>
          </div>
        </div>
      </div>

      {/* FILTER CONTROLS & VIEW TOGGLE BAR */}
      <div className="bg-[#0f0f10] rounded-xl p-3 shadow-md border border-[#222222] space-y-2.5">
        {/* Row 1: Search & View Modes */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="input-search-trainees"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Full Name, Employee No (e.g. DTP-2025-0001), Department, or Topic..."
              className="w-full pl-9 pr-8 py-1.5 bg-black border border-[#262628] text-white rounded-lg text-xs focus:outline-none focus:border-yellow-400 placeholder:text-slate-500 transition font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-black p-0.5 rounded-lg flex items-center border border-[#262628]">
              <button
                id="btn-view-master-table"
                onClick={() => setViewMode('masterTable')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                  viewMode === 'masterTable'
                    ? 'bg-yellow-400 text-black shadow-xs font-black'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                Master Table
              </button>
              <button
                id="btn-view-matrix"
                onClick={() => setViewMode('matrix')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                  viewMode === 'matrix'
                    ? 'bg-yellow-400 text-black shadow-xs font-black'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                Attendance Matrix
              </button>
            </div>

            <button
              id="btn-reset-filters"
              onClick={() => {
                setSearchQuery('');
                setYearFilter('ALL');
                setDeptFilter('ALL');
                setStatusFilter('ALL');
                setSectionFilter('ALL');
              }}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-yellow-400 hover:bg-[#1a1a1d] rounded-lg transition border border-[#262628] cursor-pointer"
              title="Reset all filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>
        </div>

        {/* Row 2: Comprehensive Multi-Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-2 border-t border-[#222222]">
          {/* Year Filter */}
          <div>
            <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1">
              Cohort Year Filter
            </label>
            <select
              id="select-year-filter"
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value as any)}
              className="w-full px-2 py-1 bg-black border border-[#262628] rounded-lg text-xs font-medium text-white focus:outline-none focus:border-yellow-400 font-mono"
            >
              <option value="ALL">All Cohorts (2025 & 2026)</option>
              <option value="2025">2025 Cohort</option>
              <option value="2026">2026 Cohort</option>
            </select>
          </div>

          {/* Department Filter (Dynamic & Hierarchical) */}
          <div>
            <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1">
              Department ({allUniqueDepartments.length})
            </label>
            <select
              id="select-department-filter"
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full px-2 py-1 bg-black border border-[#262628] rounded-lg text-xs font-medium text-white focus:outline-none focus:border-yellow-400"
            >
              <option value="ALL">All Departments ({trainees.length})</option>
              <optgroup label="Main Categories" className="bg-[#111113] text-slate-200">
                <option value="CAT:Stitching">All Stitching Lines & Punching</option>
                <option value="CAT:Assembly">All Assembly & Midsole Lines</option>
                <option value="CAT:Cutting">All Cutting & Warehouse Groups</option>
                <option value="CAT:Rubber">All Rubber, Milling & D2P Lines</option>
              </optgroup>
              <optgroup label="Specific Lines / Groups from Both Sheets" className="bg-[#111113] text-slate-200">
                {allUniqueDepartments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1">
              Training Status
            </label>
            <select
              id="select-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-2 py-1 bg-black border border-[#262628] rounded-lg text-xs font-medium text-white focus:outline-none focus:border-yellow-400 font-mono"
            >
              <option value="ALL">All Statuses</option>
              <option value="Completed">Completed (Certified)</option>
              <option value="Incomplete">Incomplete</option>
              <option value="No Show">No Show</option>
            </select>
          </div>

          {/* Section / Batch Filter */}
          <div>
            <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1">
              Training Batch
            </label>
            <select
              id="select-section-filter"
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="w-full px-2 py-1 bg-black border border-[#262628] rounded-lg text-xs font-medium text-white focus:outline-none focus:border-yellow-400 font-mono"
            >
              <option value="ALL">All Batches</option>
              {allUniqueSections.map((sec) => (
                <option key={sec} value={sec}>
                  {sec}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ACTIVE FILTERS CHIP BAR */}
        {(yearFilter !== 'ALL' ||
          deptFilter !== 'ALL' ||
          statusFilter !== 'ALL' ||
          sectionFilter !== 'ALL' ||
          searchQuery.trim()) && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] font-mono">
            <span className="text-slate-400 font-bold">Filters:</span>
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-yellow-500/15 text-yellow-300 border border-yellow-500/30">
                Search: "{searchQuery}"
                <button onClick={() => setSearchQuery('')} className="hover:text-white cursor-pointer">
                  ×
                </button>
              </span>
            )}
            {yearFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-yellow-500/15 text-yellow-300 border border-yellow-500/30">
                Year: {yearFilter}
                <button onClick={() => setYearFilter('ALL')} className="hover:text-white cursor-pointer">
                  ×
                </button>
              </span>
            )}
            {deptFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#1c1c20] text-slate-300 border border-[#2a2a2f]">
                Dept: {deptFilter.replace('CAT:', '')}
                <button onClick={() => setDeptFilter('ALL')} className="hover:text-white cursor-pointer">
                  ×
                </button>
              </span>
            )}
            {statusFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/40">
                Status: {statusFilter}
                <button onClick={() => setStatusFilter('ALL')} className="hover:text-white cursor-pointer">
                  ×
                </button>
              </span>
            )}
            {sectionFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#1c1c20] text-slate-300 border border-[#2a2a2f]">
                Batch: {sectionFilter}
                <button onClick={() => setSectionFilter('ALL')} className="hover:text-white cursor-pointer">
                  ×
                </button>
              </span>
            )}
            <span className="text-slate-400 ml-auto font-mono text-[10px]">
              Showing <strong>{filteredTrainees.length}</strong> of <strong>{trainees.length}</strong> records
            </span>
          </div>
        )}
      </div>

      {/* VIEW 1: MASTER ROSTER TABLE (MATCHING REQUIRED DESIGN) */}
      {viewMode === 'masterTable' && (
        <div className="bg-[#0f0f10] rounded-xl shadow-md border border-[#222222] overflow-hidden">
          <div className="p-3 bg-black border-b border-[#222222] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xs sm:text-sm font-black text-white uppercase flex items-center gap-2">
                <Table className="w-3.5 h-3.5 text-yellow-400" />
                Comprehensive Leadership Trainee Roster
              </h2>
              <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                Consolidated records across 2025 & 2026 Leadership Cohorts with Full Name, Employee No., Department, Dates, Year, Topic & Status.
              </p>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-300">
              <span className="inline-block w-2 h-2 rounded-full bg-yellow-400"></span> 2025 Cohort
              <span className="inline-block w-2 h-2 rounded-full bg-blue-500 ml-2"></span> 2026 Cohort
            </div>
          </div>

          <div className="px-3 py-1.5 bg-yellow-500/10 border-b border-yellow-500/20 text-[11px] text-yellow-300 flex items-center gap-2 font-mono">
            <span className="px-1.5 py-0.2 rounded bg-yellow-400 text-black font-black text-[9px]">DOUBLE-CLICK</span>
            <span>Tip: Double-click any row or trainee name to inspect their full modular attendance record & details.</span>
          </div>

          <div className="overflow-x-auto">
            <table id="table-master-roster" className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-[#141416] text-slate-300 border-b border-[#222222] font-mono uppercase text-[10px] tracking-wider">
                  <th className="py-2 px-2 text-center w-10">No.</th>
                  <th className="py-2 px-3">Full Name</th>
                  <th className="py-2 px-2.5">Employee No.</th>
                  <th className="py-2 px-3">Department</th>
                  <th className="py-2 px-2.5">Training Date</th>
                  <th className="py-2 px-2 text-center">Year</th>
                  <th className="py-2 px-3">Training Topic</th>
                  <th className="py-2 px-2 text-center">Score</th>
                  <th className="py-2 px-2.5 text-center">Status</th>
                  <th className="py-2 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e1e21] font-sans">
                {filteredTrainees.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-slate-500 bg-black">
                      <Users className="w-6 h-6 mx-auto text-slate-600 mb-1" />
                      <p className="font-bold text-xs text-slate-300">No trainees found matching the selected criteria.</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">Try resetting search keywords or adjusting filters.</p>
                    </td>
                  </tr>
                ) : (
                  filteredTrainees.map((t, idx) => {
                    const is2025 = t.year === 2025;
                    return (
                      <tr
                        key={t.id}
                        onDoubleClick={() => setSelectedTraineeForDetails(t)}
                        title="Double-click row or name to view modular attendance details"
                        className={`hover:bg-[#18181c] transition-colors cursor-pointer select-none ${
                          idx % 2 === 1 ? 'bg-[#0d0d0f]' : 'bg-[#09090a]'
                        }`}
                      >
                        <td className="py-1.5 px-2 text-center font-mono text-slate-500 text-[10px]">
                          {idx + 1}
                        </td>
                        <td
                          className="py-1.5 px-3 font-bold text-white hover:text-yellow-400 transition-colors cursor-pointer"
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setSelectedTraineeForDetails(t);
                          }}
                          title="Double-click to view details"
                        >
                          <span>{cleanTraineeName(t.name)}</span>
                        </td>
                        <td className="py-1.5 px-2.5 font-mono text-slate-300 text-[10px]">
                          <span className="px-1.5 py-0.5 rounded bg-black text-yellow-400 border border-[#222222]">
                            {t.employeeNo || `DTP-${t.year}-${t.no.toString().padStart(4, '0')}`}
                          </span>
                        </td>
                        <td className="py-1.5 px-3 text-slate-300">
                          <span className="font-medium">{t.department}</span>
                          {t.departmentCategory && (
                            <span className="block text-[9px] text-slate-500 font-mono">{t.departmentCategory}</span>
                          )}
                        </td>
                        <td className="py-1.5 px-2.5 text-slate-400 whitespace-nowrap text-[10px] font-mono">
                          {t.trainingDate}
                        </td>
                        <td className="py-1.5 px-2 text-center">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                              is2025
                                ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                                : 'bg-blue-600/20 text-blue-300 border border-blue-500/40'
                            }`}
                          >
                            {t.year}
                          </span>
                        </td>
                        <td className="py-1.5 px-3 text-slate-300 max-w-[200px] truncate text-[11px]" title={t.trainingTopic}>
                          {t.trainingTopic}
                        </td>
                        <td className="py-1.5 px-2 text-center font-bold text-yellow-400 font-mono text-xs">
                          {t.total}
                        </td>
                        <td className="py-1.5 px-2.5 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                              t.status === 'Completed'
                                ? 'bg-yellow-400 text-black font-black'
                                : t.status === 'No Show'
                                ? 'bg-[#18181b] text-slate-500 border border-[#27272a]'
                                : 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                            }`}
                          >
                            {t.status === 'Completed' && <Check className="w-3 h-3 stroke-[3]" />}
                            {t.status === 'Incomplete' && <AlertCircle className="w-3 h-3 text-blue-300" />}
                            {t.status === 'No Show' && <XCircle className="w-3 h-3 text-slate-500" />}
                            {t.status}
                          </span>
                        </td>
                        <td className="py-1.5 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            {t.status === 'Completed' && (
                              <button
                                onClick={() => onOpenCertificate(t)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-yellow-400 hover:bg-yellow-300 text-black text-[10px] font-black transition cursor-pointer"
                                title="Generate Official Certificate of Completion"
                              >
                                <Award className="w-3 h-3" />
                                Certificate
                              </button>
                            )}
                            <button
                              onClick={() => setSelectedTraineeForDetails(t)}
                              className="p-1 text-slate-400 hover:text-blue-400 hover:bg-neutral-800 rounded transition cursor-pointer"
                              title="View detailed modular attendance"
                            >
                              <Info className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openEditModal(t)}
                              className="p-1 text-slate-400 hover:text-yellow-400 hover:bg-neutral-800 rounded transition cursor-pointer"
                              title="Edit trainee record"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to delete ${t.name}?`)) {
                                  onDeleteTrainee(t.id);
                                  addToast('Deleted', `Removed ${t.name} from records.`, 'info');
                                }
                              }}
                              className="p-1 text-slate-500 hover:text-red-400 hover:bg-neutral-800 rounded transition cursor-pointer"
                              title="Delete record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: INTERACTIVE ATTENDANCE MATRIX (WITH INDIVIDUAL MODULE CHECKBOXES) */}
      {viewMode === 'matrix' && (
        <div className="bg-[#0f0f10] rounded-xl shadow-md border border-[#222222] overflow-hidden">
          <div className="p-3 bg-black border-b border-[#222222] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xs sm:text-sm font-black text-white uppercase flex items-center gap-2">
                <Grid className="w-3.5 h-3.5 text-yellow-400" />
                Modular Attendance Matrix Grid (Interactive Checkmarks)
              </h2>
              <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                Click any checkbox to immediately update modular attendance, recalculate passing status, and sync with master database.
              </p>
            </div>
            <div className="text-[10px] bg-blue-500/10 text-blue-300 px-2.5 py-0.5 rounded border border-blue-500/30 font-mono font-bold">
              Passing Criteria: Stitching ≥ 5 modules | Other Depts ≥ 4 modules
            </div>
          </div>

          <div className="px-3 py-1.5 bg-yellow-500/10 border-b border-yellow-500/20 text-[11px] text-yellow-300 flex items-center gap-2 font-mono">
            <span className="px-1.5 py-0.2 rounded bg-yellow-400 text-black font-black text-[9px]">DOUBLE-CLICK</span>
            <span>Tip: Double-click any row or trainee name to inspect their full modular attendance record & details.</span>
          </div>

          <div className="overflow-x-auto max-h-[700px]">
            <table id="table-attendance-matrix" className="w-full text-left border-collapse text-[11px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#141416] text-slate-300 border-b border-[#222222] font-mono uppercase text-[10px]">
                  <th className="py-2 px-2 text-center w-10 bg-[#141416]">No.</th>
                  <th className="py-2 px-3 min-w-[180px] bg-[#141416]">Name</th>
                  <th className="py-2 px-2.5 min-w-[130px] bg-[#141416]">Department</th>
                  <th className="py-2 px-1.5 text-center bg-[#141416]">Year</th>
                  {LEADERSHIP_COURSES_DEF.map((course) => (
                    <th key={course.key} className="py-1.5 px-1 text-center min-w-[75px] bg-[#141416]">
                      <div className="font-bold text-white text-[10px]">{course.title}</div>
                      <div className="text-[8px] text-slate-400 font-normal">
                        {yearFilter === '2026' ? course.dates2026.join('/') : course.dates2025.join('/')}
                      </div>
                    </th>
                  ))}
                  <th className="py-2 px-2 text-center w-14 bg-[#141416]">Total</th>
                  <th className="py-2 px-2.5 text-center min-w-[90px] bg-[#141416]">Status</th>
                  <th className="py-2 px-2.5 text-right bg-[#141416]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e1e21]">
                {filteredTrainees.map((t, idx) => {
                  const isAugSep = t.section.includes('August – September');
                  return (
                    <tr
                      key={t.id}
                      onDoubleClick={(e) => {
                        if ((e.target as HTMLElement).tagName !== 'BUTTON' && !(e.target as HTMLElement).closest('button')) {
                          setSelectedTraineeForDetails(t);
                        }
                      }}
                      title="Double-click row or name to view modular attendance details"
                      className={`hover:bg-[#18181c] transition-colors cursor-pointer select-none ${
                        idx % 2 === 1 ? 'bg-[#0d0d0f]' : 'bg-[#09090a]'
                      }`}
                    >
                      <td className="py-1.5 px-2 text-center font-mono text-slate-500 text-[10px]">
                        {idx + 1}
                      </td>
                      <td
                        className="py-1.5 px-3 font-bold text-white hover:text-yellow-400 transition-colors cursor-pointer"
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setSelectedTraineeForDetails(t);
                        }}
                        title="Double-click to view details"
                      >
                        <div className="flex flex-col">
                          <span>{cleanTraineeName(t.name)}</span>
                          <span className="text-[9px] text-slate-500 font-mono font-normal">
                            {t.employeeNo || `DTP-${t.year}-${t.no.toString().padStart(4, '0')}`}
                          </span>
                        </div>
                      </td>
                      <td className="py-1.5 px-2.5 text-slate-300 font-medium">
                        {t.department}
                      </td>
                      <td className="py-1.5 px-1.5 text-center font-mono font-bold text-yellow-400 text-[10px]">
                        {t.year}
                      </td>

                      {/* Course Checkboxes */}
                      {LEADERSHIP_COURSES_DEF.map((course) => {
                        const isChecked = !!t.courses[course.key];
                        const isNotApplicable =
                          isAugSep && course.key !== 'sixSManagement' && course.key !== 'metalManagement';

                        return (
                          <td key={course.key} className="py-1.5 px-1 text-center">
                            {isNotApplicable ? (
                              <span className="text-slate-600 text-xs">—</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleToggleCourse(t, course.key)}
                                className={`w-4.5 h-4.5 rounded inline-flex items-center justify-center transition-all cursor-pointer ${
                                  isChecked
                                    ? 'bg-yellow-400 text-black font-black'
                                    : 'bg-black text-transparent hover:text-slate-400 border border-[#2e2e33]'
                                }`}
                                title={`${t.name} - ${course.title}: ${isChecked ? 'Attended' : 'Absent'}`}
                              >
                                {isChecked ? <Check className="w-3 h-3 stroke-[3]" /> : null}
                              </button>
                            )}
                          </td>
                        );
                      })}

                      <td className="py-1.5 px-2 text-center font-mono font-bold text-yellow-400 text-xs">
                        {t.total}
                      </td>
                      <td className="py-1.5 px-2.5 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
                            t.status === 'Completed'
                              ? 'bg-yellow-400 text-black font-black'
                              : t.status === 'No Show'
                              ? 'bg-[#18181b] text-slate-500 border border-[#27272a]'
                              : 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="py-1.5 px-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {t.status === 'Completed' && (
                            <button
                              onClick={() => onOpenCertificate(t)}
                              className="p-1 text-yellow-400 hover:bg-neutral-800 rounded cursor-pointer"
                              title="Certificate"
                            >
                              <Award className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => openEditModal(t)}
                            className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DETAIL MODAL FOR A SELECTED TRAINEE */}
      {selectedTraineeForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4">
          <div className="bg-[#0f0f10] rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-[#222222] animate-fadeIn">
            <div className="bg-black text-white p-3.5 flex items-center justify-between border-b border-[#222222]">
              <div>
                <span className="text-[10px] text-yellow-400 uppercase tracking-widest font-black font-mono">
                  Trainee Attendance Profile
                </span>
                <h3 className="text-sm font-black text-white mt-0.5">{selectedTraineeForDetails.name}</h3>
              </div>
              <button
                onClick={() => setSelectedTraineeForDetails(null)}
                className="text-slate-400 hover:text-white text-base p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-black p-3 rounded-lg border border-[#222222]">
                <div>
                  <span className="text-slate-400 text-[10px] font-mono">Employee No:</span>
                  <p className="font-mono font-bold text-yellow-400 text-xs mt-0.5">
                    {selectedTraineeForDetails.employeeNo}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] font-mono">Department:</span>
                  <p className="font-semibold text-white mt-0.5">{selectedTraineeForDetails.department}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] font-mono">Training Cohort:</span>
                  <p className="font-semibold text-yellow-400 mt-0.5 font-mono">
                    Cohort Year {selectedTraineeForDetails.year}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] font-mono">Training Date Range:</span>
                  <p className="font-medium text-slate-300 mt-0.5 font-mono text-[11px]">{selectedTraineeForDetails.trainingDate}</p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-white text-xs mb-1.5 uppercase font-mono">Modular Breakdown:</h4>
                <div className="grid grid-cols-2 gap-1.5">
                  {LEADERSHIP_COURSES_DEF.map((c) => {
                    const attended = !!selectedTraineeForDetails.courses[c.key];
                    return (
                      <div
                        key={c.key}
                        className={`p-2 rounded-lg border flex items-center justify-between text-[11px] ${
                          attended
                            ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300 font-bold'
                            : 'bg-black border-[#222222] text-slate-500'
                        }`}
                      >
                        <span>{c.title}</span>
                        {attended ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-yellow-400 stroke-[2.5]" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-slate-600" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2.5 border-t border-[#222222]">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-[11px] font-mono">Passing Status:</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-black font-mono ${
                      selectedTraineeForDetails.status === 'Completed'
                        ? 'bg-yellow-400 text-black'
                        : 'bg-blue-600/20 text-blue-300 border border-blue-500/40'
                    }`}
                  >
                    {selectedTraineeForDetails.status} ({selectedTraineeForDetails.total} modules)
                  </span>
                </div>
                {selectedTraineeForDetails.status === 'Completed' && (
                  <button
                    onClick={() => {
                      const t = selectedTraineeForDetails;
                      setSelectedTraineeForDetails(null);
                      onOpenCertificate(t);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-black font-black text-xs transition cursor-pointer"
                  >
                    <Award className="w-3.5 h-3.5" />
                    Open Certificate
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT TRAINEE MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4">
          <div className="bg-[#0f0f10] rounded-xl shadow-2xl max-w-xl w-full overflow-hidden border border-[#222222] animate-fadeIn">
            <form onSubmit={handleSaveTrainee}>
              <div className="bg-black text-white p-3.5 flex items-center justify-between border-b border-[#222222]">
                <div>
                  <h3 className="text-sm font-black text-white uppercase">
                    {editingTrainee ? 'Edit Trainee Record' : 'Enroll New Trainee'}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                    {editingTrainee ? `Modifying ${editingTrainee.name}` : 'Add record to 2025 or 2026 Cohort'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-slate-400 hover:text-white text-base p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 space-y-3 text-xs max-h-[75vh] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-300 font-bold text-[10px] uppercase font-mono mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Dela Cruz, Juan, Santos"
                      className="w-full px-2.5 py-1.5 bg-black border border-[#262628] text-white rounded-lg focus:border-yellow-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold text-[10px] uppercase font-mono mb-1">Employee Number</label>
                    <input
                      type="text"
                      value={formEmployeeNo}
                      onChange={(e) => setFormEmployeeNo(e.target.value)}
                      placeholder="e.g. DTP-2026-0120"
                      className="w-full px-2.5 py-1.5 bg-black border border-[#262628] text-white rounded-lg focus:border-yellow-400 focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold text-[10px] uppercase font-mono mb-1">Department / Line *</label>
                    <input
                      type="text"
                      required
                      value={formDept}
                      onChange={(e) => setFormDept(e.target.value)}
                      placeholder="e.g. Stitching Line A8 or Assembly Line B6"
                      className="w-full px-2.5 py-1.5 bg-black border border-[#262628] text-white rounded-lg focus:border-yellow-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold text-[10px] uppercase font-mono mb-1">Target Year</label>
                    <select
                      value={formYear}
                      onChange={(e) => {
                        const y = parseInt(e.target.value, 10) as 2025 | 2026;
                        setFormYear(y);
                        if (y === 2025) {
                          setFormSourceSheet('Sheet 1 (2025)');
                          setFormTrainingDate('July 09, 2025 – August 20, 2025');
                          setFormSection('July – August 2025 Batch');
                        } else {
                          setFormSourceSheet('Sheet 2 (2026)');
                          setFormTrainingDate('January 05, 2026 – February 2026');
                          setFormSection('January – February 2026 Batch');
                        }
                      }}
                      className="w-full px-2.5 py-1.5 bg-black border border-[#262628] text-white rounded-lg focus:border-yellow-400 focus:outline-none font-mono"
                    >
                      <option value={2025}>2025 Cohort</option>
                      <option value={2026}>2026 Cohort</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold text-[10px] uppercase font-mono mb-1">Training Date Range</label>
                    <input
                      type="text"
                      value={formTrainingDate}
                      onChange={(e) => setFormTrainingDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-black border border-[#262628] text-white rounded-lg focus:border-yellow-400 focus:outline-none font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold text-[10px] uppercase font-mono mb-1">Batch Section</label>
                    <input
                      type="text"
                      value={formSection}
                      onChange={(e) => setFormSection(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-black border border-[#262628] text-white rounded-lg focus:border-yellow-400 focus:outline-none font-mono text-[11px]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold text-[10px] uppercase font-mono mb-1.5">Modular Attendance Checkmarks:</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 bg-black p-2.5 rounded-lg border border-[#222222]">
                    {LEADERSHIP_COURSES_DEF.map((c) => {
                      const isChecked = !!formCourses[c.key];
                      return (
                        <label
                          key={c.key}
                          className="flex items-center gap-2 p-1.5 rounded hover:bg-[#18181b] transition cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) =>
                              setFormCourses((prev) => ({
                                ...prev,
                                [c.key]: e.target.checked
                              }))
                            }
                            className="w-3.5 h-3.5 accent-yellow-400 rounded cursor-pointer"
                          />
                          <span className="text-slate-200 text-xs">{c.title}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-black border-t border-[#222222] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-300 hover:bg-[#18181b] font-medium text-xs transition border border-[#262628] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition cursor-pointer"
                >
                  {editingTrainee ? 'Update Trainee' : 'Save & Enroll'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
