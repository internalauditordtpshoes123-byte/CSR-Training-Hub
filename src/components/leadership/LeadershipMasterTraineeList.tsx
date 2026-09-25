import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  Eye,
  Award,
  Calendar,
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Download,
  ChevronRight,
  X,
  Briefcase,
  ShieldCheck
} from 'lucide-react';
import {
  LeadershipTraineeRow,
  LEADERSHIP_COURSES_DEF,
  cleanTraineeName
} from '../../data/leadershipSheetData';
import { LeadershipScheduleItem } from '../../data/leadershipScheduleData';
import { LeadershipCertificateModal } from './LeadershipCertificateModal';

export interface MasterTraineeItem {
  key: string;
  name: string;
  employeeNo: string;
  department: string;
  section: string;
  position: string;
  records2025: LeadershipTraineeRow[];
  records2026: LeadershipTraineeRow[];
  schedules2025: LeadershipScheduleItem[];
  schedules2026: LeadershipScheduleItem[];
  totalModulesAttended: number;
  totalHours: number;
  status: 'Completed' | 'In Progress' | 'Incomplete' | 'No Show';
  hasCertificate: boolean;
  rawTrainee: LeadershipTraineeRow;
}

interface LeadershipMasterTraineeListProps {
  trainees: LeadershipTraineeRow[];
  schedules: LeadershipScheduleItem[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  yearFilter: 'ALL' | '2025' | '2026';
  onSelectYear: (year: '2025' | '2026') => void;
  addToast: (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const LeadershipMasterTraineeList: React.FC<LeadershipMasterTraineeListProps> = ({
  trainees,
  schedules,
  searchQuery,
  onSearchChange,
  yearFilter,
  onSelectYear,
  addToast
}) => {
  const [deptFilter, setDeptFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedTraineeForHistory, setSelectedTraineeForHistory] = useState<MasterTraineeItem | null>(null);
  const [certModalTrainee, setCertModalTrainee] = useState<LeadershipTraineeRow | null>(null);

  // Group trainees into unique master records
  const masterTrainees = useMemo<MasterTraineeItem[]>(() => {
    const map = new Map<string, {
      name: string;
      employeeNo: string;
      department: string;
      section: string;
      position: string;
      records2025: LeadershipTraineeRow[];
      records2026: LeadershipTraineeRow[];
      representative: LeadershipTraineeRow;
    }>();

    trainees.forEach((t) => {
      const cleaned = cleanTraineeName(t.name);
      const normName = (cleaned || '').trim();
      const normNo = (t.employeeNo || '').trim().toUpperCase();
      const primaryKey = normNo ? normNo : normName.toLowerCase();

      if (!map.has(primaryKey)) {
        let pos = 'Line Leader';
        const dLower = (t.department || '').toLowerCase();
        if (dLower.includes('supervisor') || (t.section && t.section.toLowerCase().includes('supervisor'))) {
          pos = 'Supervisor';
        } else if (dLower.includes('qc') || dLower.includes('qa') || dLower.includes('quality')) {
          pos = 'Quality Section Leader';
        } else if (dLower.includes('stitching')) {
          pos = 'Stitching Section Leader';
        } else if (dLower.includes('cutting')) {
          pos = 'Cutting Group Leader';
        } else if (dLower.includes('assembly')) {
          pos = 'Assembly Line Leader';
        } else if (dLower.includes('rubber')) {
          pos = 'Rubber Preparation Leader';
        }

        map.set(primaryKey, {
          name: cleaned,
          employeeNo: t.employeeNo,
          department: t.department,
          section: t.section || t.department,
          position: pos,
          records2025: [],
          records2026: [],
          representative: t
        });
      }

      const item = map.get(primaryKey)!;
      if (t.year === 2025) {
        item.records2025.push(t);
      } else if (t.year === 2026) {
        item.records2026.push(t);
      } else {
        item.records2025.push(t);
      }
    });

    const result: MasterTraineeItem[] = [];

    map.forEach((val, key) => {
      const matchedScheds2025 = schedules.filter((s) => {
        if (s.year !== 2025) return false;
        return (s.traineeLeaders || []).some(
          (tl) =>
            (tl.employeeNo && tl.employeeNo.trim().toUpperCase() === val.employeeNo.trim().toUpperCase()) ||
            (tl.name && tl.name.trim().toLowerCase() === val.name.trim().toLowerCase())
        );
      });

      const matchedScheds2026 = schedules.filter((s) => {
        if (s.year !== 2026) return false;
        return (s.traineeLeaders || []).some(
          (tl) =>
            (tl.employeeNo && tl.employeeNo.trim().toUpperCase() === val.employeeNo.trim().toUpperCase()) ||
            (tl.name && tl.name.trim().toLowerCase() === val.name.trim().toLowerCase())
        );
      });

      let totalModules = 0;
      if (val.records2025.length > 0) {
        totalModules += val.records2025[0].total;
      }
      if (val.records2026.length > 0) {
        totalModules += val.records2026[0].total;
      } else if (matchedScheds2026.length > 0) {
        totalModules += matchedScheds2026.length;
      }

      const totalHours = totalModules * 1.0;

      let status: 'Completed' | 'In Progress' | 'Incomplete' | 'No Show' = 'Incomplete';
      if (totalModules >= 4) {
        status = 'Completed';
      } else if (val.records2026.length > 0 || matchedScheds2026.length > 0) {
        status = 'In Progress';
      } else if (totalModules > 0) {
        status = 'Incomplete';
      } else {
        status = 'No Show';
      }

      const hasCertificate = totalModules >= 4 || (val.records2025[0] && val.records2025[0].status === 'Completed');

      result.push({
        key,
        name: val.name,
        employeeNo: val.employeeNo,
        department: val.department,
        section: val.section,
        position: val.position,
        records2025: val.records2025,
        records2026: val.records2026,
        schedules2025: matchedScheds2025,
        schedules2026: matchedScheds2026,
        totalModulesAttended: totalModules,
        totalHours,
        status,
        hasCertificate,
        rawTrainee: val.representative
      });
    });

    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [trainees, schedules]);

  // Unique departments
  const departments = useMemo(() => {
    const set = new Set<string>();
    masterTrainees.forEach((t) => {
      if (t.department) set.add(t.department);
    });
    return Array.from(set).sort();
  }, [masterTrainees]);

  // Filtered trainees
  const filteredTrainees = useMemo(() => {
    return masterTrainees.filter((t) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = t.name.toLowerCase().includes(q);
        const matchNo = t.employeeNo.toLowerCase().includes(q);
        const matchDept = t.department.toLowerCase().includes(q);
        const matchPos = t.position.toLowerCase().includes(q);
        const matchStatus = t.status.toLowerCase().includes(q);
        const match2025 = t.records2025.some((r) => Object.values(r.courses).some(Boolean));
        const match2026 = t.records2026.some((r) => Object.values(r.courses).some(Boolean));

        const matchSched = [...t.schedules2025, ...t.schedules2026].some((s) =>
          (s.trainingTopic && s.trainingTopic.toLowerCase().includes(q)) ||
          (s.trainer && s.trainer.toLowerCase().includes(q)) ||
          (s.trainingDate && s.trainingDate.toLowerCase().includes(q)) ||
          (s.venue && s.venue.toLowerCase().includes(q))
        );

        if (!matchName && !matchNo && !matchDept && !matchPos && !matchStatus && !match2025 && !match2026 && !matchSched) {
          return false;
        }
      }

      if (yearFilter === '2025') {
        if (t.records2025.length === 0 && t.schedules2025.length === 0) return false;
      } else if (yearFilter === '2026') {
        if (t.records2026.length === 0 && t.schedules2026.length === 0) return false;
      }

      if (deptFilter !== 'ALL' && t.department !== deptFilter) {
        return false;
      }

      if (statusFilter !== 'ALL' && t.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [masterTrainees, searchQuery, yearFilter, deptFilter, statusFilter]);

  // Export Master List
  const handleExportCSV = () => {
    const headers = ['Employee No', 'Full Name', 'Department', 'Position', '2025 Participation', '2026 Participation', 'Total Modules', 'Total Hours', 'Status'];
    const rows = filteredTrainees.map((t) => [
      `"${t.employeeNo}"`,
      `"${t.name}"`,
      `"${t.department}"`,
      `"${t.position}"`,
      `"${t.records2025.length > 0 ? `${t.records2025[0].total}/8` : 'N/A'}"`,
      `"${t.records2026.length > 0 ? `${t.records2026[0].total}/8` : (t.schedules2026.length > 0 ? `${t.schedules2026.length} sessions` : 'N/A')}"`,
      t.totalModulesAttended,
      `${t.totalHours} hrs`,
      `"${t.status}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Datian_Leadership_Master_Trainee_List_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addToast('Export Successful', `Exported ${filteredTrainees.length} master trainee records.`, 'success');
  };

  return (
    <div className="space-y-3 font-sans text-xs text-slate-100">
      {/* 1. TOP HEADER (BLACK, YELLOW, BLUE) */}
      <div className="bg-[#0f0f10] border border-[#222222] rounded-xl p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 text-[10px] font-mono font-bold uppercase mb-1">
            <Users className="w-3 h-3 text-yellow-400" />
            UNIFIED SUPERVISORY ROSTER
          </div>
          <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
            MASTER TRAINEE LIST
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5 max-w-3xl">
            Integrated roster of all factory supervisory and line leaders. Profiles span both 2025 and 2026 leadership cohorts.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1a1c] hover:bg-[#252528] text-slate-200 border border-[#2f2f33] rounded-lg text-xs font-bold transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            Export CSV
          </button>
        </div>
      </div>

      {/* 2. SUMMARY METRIC CARDS (BLACK WITH YELLOW & BLUE HIGHLIGHTS) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-[#111111] p-3 rounded-xl border border-[#262626]">
          <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Total Master Trainees</div>
          <div className="text-xl font-bold text-white mt-0.5">{masterTrainees.length}</div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">Unique leadership personnel</div>
        </div>

        <div className="bg-[#111111] p-3 rounded-xl border border-[#262626]">
          <div className="text-[10px] text-yellow-400 uppercase font-mono tracking-wider">Certified / Passed</div>
          <div className="text-xl font-bold text-yellow-400 mt-0.5">
            {masterTrainees.filter((t) => t.status === 'Completed').length}
          </div>
          <div className="text-[10px] text-yellow-500/70 font-mono mt-0.5">≥4 modules completed</div>
        </div>

        <div className="bg-[#111111] p-3 rounded-xl border border-[#262626]">
          <div className="text-[10px] text-blue-400 uppercase font-mono tracking-wider">Active in 2026</div>
          <div className="text-xl font-bold text-blue-400 mt-0.5">
            {masterTrainees.filter((t) => t.status === 'In Progress').length}
          </div>
          <div className="text-[10px] text-blue-400/60 font-mono mt-0.5">Enrolled / ongoing</div>
        </div>

        <div className="bg-[#111111] p-3 rounded-xl border border-[#262626]">
          <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Needs Follow-up</div>
          <div className="text-xl font-bold text-slate-300 mt-0.5">
            {masterTrainees.filter((t) => t.status === 'Incomplete' || t.status === 'No Show').length}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">&lt;4 modules attended</div>
        </div>
      </div>

      {/* 3. FILTERS BAR (COMPACT, BLACK THEME) */}
      <div className="bg-[#101011] p-2.5 rounded-xl border border-[#262626] flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        {/* Cohort Tabs */}
        <div className="flex items-center gap-1 bg-black p-1 rounded-lg border border-[#262626] self-start">
          <button
            onClick={() => onSelectYear('ALL' as any)}
            className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition cursor-pointer flex items-center gap-1.5 ${
              yearFilter === 'ALL'
                ? 'bg-yellow-500 text-black shadow-xs font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>All Leaders</span>
            <span className="px-1 py-0.2 rounded text-[9px] bg-black/20 text-current font-mono">
              {masterTrainees.length}
            </span>
          </button>

          <button
            onClick={() => onSelectYear('2025')}
            className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition cursor-pointer flex items-center gap-1.5 ${
              yearFilter === '2025'
                ? 'bg-yellow-500 text-black shadow-xs font-black'
                : 'text-yellow-400 hover:text-yellow-300'
            }`}
          >
            <span>📁 2025</span>
            <span className="px-1 py-0.2 rounded text-[9px] bg-black/20 text-current font-mono">
              {masterTrainees.filter((t) => t.records2025.length > 0).length}
            </span>
          </button>

          <button
            onClick={() => onSelectYear('2026')}
            className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition cursor-pointer flex items-center gap-1.5 ${
              yearFilter === '2026'
                ? 'bg-yellow-500 text-black shadow-xs font-black'
                : 'text-yellow-400 hover:text-yellow-300'
            }`}
          >
            <span>📁 2026</span>
            <span className="px-1 py-0.2 rounded text-[9px] bg-black/20 text-current font-mono">
              {masterTrainees.filter((t) => t.records2026.length > 0 || t.schedules2026.length > 0).length}
            </span>
          </button>
        </div>

        {/* Search Field */}
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Employee No, Name, Department, Topic..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-[#0a0a0a] border border-[#2a2a2d] rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-yellow-400 transition"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Department Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 font-mono">Dept:</span>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="text-xs font-mono text-slate-200 bg-[#0a0a0a] border border-[#2a2a2d] rounded-lg px-2 py-1.5 focus:outline-none focus:border-yellow-400"
            >
              <option value="ALL">All ({departments.length})</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 font-mono">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-mono text-slate-200 bg-[#0a0a0a] border border-[#2a2a2d] rounded-lg px-2 py-1.5 focus:outline-none focus:border-yellow-400"
            >
              <option value="ALL">All</option>
              <option value="Completed">Completed</option>
              <option value="In Progress">In Progress</option>
              <option value="Incomplete">Incomplete</option>
              <option value="No Show">No Show</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. COMPACT TRAINEE TABLE (BLACK & YELLOW HIGHLIGHTS, CLEAN ALIGNMENT) */}
      <div className="bg-[#0f0f10] rounded-xl border border-[#262626] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#161618] border-b border-[#262626] text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 px-3">Employee</th>
                <th className="py-2.5 px-3">Department & Section</th>
                <th className="py-2.5 px-3">Position</th>
                <th className="py-2.5 px-3 text-center">2025 Cohort</th>
                <th className="py-2.5 px-3 text-center">2026 Cohort</th>
                <th className="py-2.5 px-3 text-center">Total Modules</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e21] font-mono">
              {filteredTrainees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 font-sans">
                    <Users className="w-8 h-8 mx-auto mb-1.5 text-slate-600 stroke-1" />
                    No leadership trainees found matching filter criteria.
                  </td>
                </tr>
              ) : (
                filteredTrainees.map((t) => {
                  const has2025 = t.records2025.length > 0;
                  const score2025 = has2025 ? t.records2025[0].total : 0;
                  const has2026 = t.records2026.length > 0 || t.schedules2026.length > 0;
                  const score2026 = t.records2026.length > 0 ? t.records2026[0].total : t.schedules2026.length;

                  return (
                    <tr
                      key={t.key}
                      className="hover:bg-neutral-900/70 transition cursor-pointer"
                      onClick={() => setSelectedTraineeForHistory(t)}
                    >
                      <td className="py-2 px-3">
                        <div className="font-bold text-slate-100 font-sans">
                          {t.name}
                        </div>
                        <div className="text-[10px] text-yellow-400/80 font-mono">
                          {t.employeeNo}
                        </div>
                      </td>

                      <td className="py-2 px-3 font-sans">
                        <div className="text-slate-300 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-slate-500" />
                          <span>{t.department}</span>
                        </div>
                        {t.section && t.section !== t.department && (
                          <div className="text-[10px] text-slate-500">
                            {t.section}
                          </div>
                        )}
                      </td>

                      <td className="py-2 px-3 font-sans">
                        <span className="text-slate-400">
                          {t.position}
                        </span>
                      </td>

                      <td className="py-2 px-3 text-center">
                        {has2025 ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectYear('2025');
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-[10px] font-bold hover:bg-yellow-500/20 transition cursor-pointer"
                            title="View in 2025 folder"
                          >
                            <Calendar className="w-2.5 h-2.5 text-yellow-400" />
                            2025: {score2025}/8
                          </button>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      <td className="py-2 px-3 text-center">
                        {has2026 ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectYear('2026');
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-blue-300 text-[10px] font-bold hover:bg-blue-500/20 transition cursor-pointer"
                            title="View in 2026 folder"
                          >
                            <Calendar className="w-2.5 h-2.5 text-blue-400" />
                            2026: {score2026}/8
                          </button>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      <td className="py-2 px-3 text-center">
                        <span className="font-bold text-white">
                          {t.totalModulesAttended}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-1">
                          ({t.totalHours}h)
                        </span>
                      </td>

                      <td className="py-2 px-3 text-center">
                        {t.status === 'Completed' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-yellow-400 text-black font-black text-[10px]">
                            <CheckCircle2 className="w-3 h-3" />
                            Completed
                          </span>
                        ) : t.status === 'In Progress' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-600/20 border border-blue-500/30 text-blue-300 text-[10px] font-bold">
                            <Clock className="w-3 h-3 text-blue-400" />
                            In Progress
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-slate-400 text-[10px]">
                            <AlertCircle className="w-3 h-3 text-slate-500" />
                            {t.status}
                          </span>
                        )}
                      </td>

                      <td className="py-2 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedTraineeForHistory(t)}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-bold transition cursor-pointer"
                            title="View Training History"
                          >
                            <Eye className="w-3 h-3" />
                            History
                          </button>

                          {t.hasCertificate && (
                            <button
                              onClick={() => setCertModalTrainee(t.rawTrainee)}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-400 hover:bg-yellow-300 text-black font-black rounded text-[11px] transition cursor-pointer"
                              title="Certificate of Completion"
                            >
                              <Award className="w-3 h-3" />
                              Cert
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-2.5 bg-[#141416] border-t border-[#262626] flex items-center justify-between text-[11px] font-mono text-slate-400">
          <div>
            Showing <span className="font-bold text-white">{filteredTrainees.length}</span> of <span className="font-bold text-white">{masterTrainees.length}</span> leaders
          </div>
          <div className="flex items-center gap-2">
            <span>DA TIAN SUBIC SHOES INC.</span>
            <span className="text-slate-600">|</span>
            <span className="text-yellow-400">Master Roster</span>
          </div>
        </div>
      </div>

      {/* 5. TRAINEE TRAINING HISTORY MODAL (BLACK THEME WITH YELLOW ACCENTS) */}
      {selectedTraineeForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-[#121214] rounded-xl max-w-3xl w-full border border-[#2e2e33] shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 bg-black border-b border-[#252528] flex items-start justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 text-[10px] font-mono font-bold uppercase mb-1">
                  <ShieldCheck className="w-3 h-3 text-yellow-400" />
                  Official Leadership Training History
                </div>
                <h3 className="text-base font-black text-white uppercase tracking-wide">
                  {selectedTraineeForHistory.name}
                </h3>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1 font-mono">
                  <span className="bg-neutral-900 border border-neutral-700 px-2 py-0.5 rounded text-yellow-400 font-bold">
                    {selectedTraineeForHistory.employeeNo}
                  </span>
                  <span>•</span>
                  <span>{selectedTraineeForHistory.department}</span>
                  <span>•</span>
                  <span className="text-slate-300">{selectedTraineeForHistory.position}</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedTraineeForHistory(null)}
                className="p-1 text-slate-400 hover:text-white hover:bg-neutral-800 rounded transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto font-sans text-xs">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-2.5 p-3 bg-black rounded-lg border border-[#252528] text-center font-mono">
                <div>
                  <div className="text-[10px] text-slate-400">Total Modules</div>
                  <div className="text-base font-bold text-white mt-0.5">
                    {selectedTraineeForHistory.totalModulesAttended}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-blue-400">Training Hours</div>
                  <div className="text-base font-bold text-blue-400 mt-0.5">
                    {selectedTraineeForHistory.totalHours} hrs
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-yellow-400">Status</div>
                  <div className="text-xs font-bold text-yellow-400 mt-1">
                    {selectedTraineeForHistory.status}
                  </div>
                </div>
              </div>

              {/* 2025 Training History */}
              <div className="border border-[#252528] rounded-lg p-3 bg-[#0d0d0f]">
                <div className="flex items-center justify-between pb-2 border-b border-[#202023]">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-yellow-500/20 text-yellow-400 flex items-center justify-center font-bold text-[10px]">
                      📁
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">2025 Training History</h4>
                      <p className="text-[10px] text-slate-400">July - August 2025 Session Batch</p>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-yellow-500/15 text-yellow-300 border border-yellow-500/30">
                    {selectedTraineeForHistory.records2025.length > 0 ? `${selectedTraineeForHistory.records2025[0].total}/8 Modules Completed` : 'No Records in 2025'}
                  </span>
                </div>

                <div className="mt-2.5 space-y-1.5">
                  {selectedTraineeForHistory.records2025.length > 0 ? (
                    LEADERSHIP_COURSES_DEF.map((course) => {
                      const row = selectedTraineeForHistory.records2025[0];
                      const attended = row.courses[course.key];
                      return (
                        <div
                          key={course.key}
                          className={`flex items-center justify-between p-2 rounded border text-xs transition ${
                            attended ? 'bg-yellow-500/10 border-yellow-500/30 text-slate-100' : 'bg-black border-[#222225] opacity-50 text-slate-400'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {attended ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            )}
                            <div>
                              <div className={`font-bold ${attended ? 'text-white' : 'text-slate-400'}`}>
                                {course.title}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                <span>📅 {course.dates2025.join(', ')}</span> • <span>👨‍🏫 {course.trainer}</span>
                              </div>
                            </div>
                          </div>

                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                            attended ? 'bg-yellow-400 text-black font-black' : 'bg-neutral-800 text-slate-400'
                          }`}>
                            {attended ? 'Attended (1.0h)' : 'Not Attended'}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-3 text-center text-[11px] text-slate-500 bg-black rounded font-mono">
                      Trainee was not enrolled in the 2025 cohort program.
                    </div>
                  )}
                </div>
              </div>

              {/* 2026 Training History */}
              <div className="border border-[#252528] rounded-lg p-3 bg-[#0d0d0f]">
                <div className="flex items-center justify-between pb-2 border-b border-[#202023]">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-[10px]">
                      📁
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">2026 Training History</h4>
                      <p className="text-[10px] text-slate-400">Cohort 2026 (DTP & D2P Batches)</p>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30">
                    {selectedTraineeForHistory.records2026.length > 0 ? `${selectedTraineeForHistory.records2026[0].total}/8 Modules Completed` : `${selectedTraineeForHistory.schedules2026.length} Enrolled Sessions`}
                  </span>
                </div>

                <div className="mt-2.5 space-y-1.5">
                  {selectedTraineeForHistory.records2026.length > 0 ? (
                    LEADERSHIP_COURSES_DEF.map((course) => {
                      const row = selectedTraineeForHistory.records2026[0];
                      const attended = row.courses[course.key];
                      return (
                        <div
                          key={course.key}
                          className={`flex items-center justify-between p-2 rounded border text-xs transition ${
                            attended ? 'bg-blue-500/10 border-blue-500/30 text-slate-100' : 'bg-black border-[#222225] opacity-50 text-slate-400'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {attended ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            )}
                            <div>
                              <div className={`font-bold ${attended ? 'text-white' : 'text-slate-400'}`}>
                                {course.title}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                <span>📅 {course.dates2026.join(', ')}</span> • <span>👨‍🏫 {course.trainer}</span>
                              </div>
                            </div>
                          </div>

                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                            attended ? 'bg-blue-600 text-white' : 'bg-neutral-800 text-slate-400'
                          }`}>
                            {attended ? 'Attended (1.0h)' : 'Pending'}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-3 text-center text-[11px] text-slate-500 bg-black rounded font-mono">
                      No 2026 records logged yet.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-black border-t border-[#252528] flex items-center justify-between">
              <div className="text-[10px] text-slate-500 font-mono">
                Permanent Master Trainee Record • Datian Subic Shoes Inc.
              </div>

              <div className="flex items-center gap-2">
                {selectedTraineeForHistory.hasCertificate && (
                  <button
                    onClick={() => {
                      setCertModalTrainee(selectedTraineeForHistory.rawTrainee);
                      setSelectedTraineeForHistory(null);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-black font-black rounded-lg text-xs transition cursor-pointer"
                  >
                    <Award className="w-3.5 h-3.5" />
                    Certificate
                  </button>
                )}

                <button
                  onClick={() => setSelectedTraineeForHistory(null)}
                  className="px-3 py-1.5 bg-[#202024] hover:bg-[#2c2c30] text-slate-200 rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Certificate Modal */}
      {certModalTrainee && (
        <LeadershipCertificateModal
          trainee={certModalTrainee}
          onClose={() => setCertModalTrainee(null)}
          addToast={addToast}
        />
      )}
    </div>
  );
};
