import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart3,
  Users,
  CheckCircle2,
  TrendingUp,
  Layers,
  Award,
  Calendar,
  Building2,
  Sparkles,
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  Check
} from 'lucide-react';
import {
  LeadershipTraineeRow,
  LeadershipDepartmentSummaryItem,
  LEADERSHIP_COURSES_DEF,
  INITIAL_LEADERSHIP_COMPLETION_SUMMARIES
} from '../../data/leadershipSheetData';
import {
  LeadershipScheduleItem,
  calculateYearSummaryMetrics
} from '../../data/leadershipScheduleData';
import { Leadership3DPieChart } from './Leadership3DPieChart';

interface LeadershipAnalyticsViewProps {
  trainees: LeadershipTraineeRow[];
  schedules?: LeadershipScheduleItem[];
  departmentSummaries?: LeadershipDepartmentSummaryItem[];
  initialYear?: 'ALL' | '2025' | '2026';
  onBackToFolder?: () => void;
  onOpenImporter?: () => void;
}

interface DeptSummary {
  total: number;
  completed: number;
  incomplete: number;
  noShow: number;
  totalScore: number;
}

export const LeadershipAnalyticsView: React.FC<LeadershipAnalyticsViewProps> = ({
  trainees,
  schedules = [],
  departmentSummaries = INITIAL_LEADERSHIP_COMPLETION_SUMMARIES,
  initialYear = 'ALL',
  onBackToFolder,
  onOpenImporter
}) => {
  const [selectedYear, setSelectedYear] = useState<'ALL' | '2025' | '2026'>(initialYear);

  useEffect(() => {
    if (initialYear) {
      setSelectedYear(initialYear);
    }
  }, [initialYear]);

  const filteredTrainees = useMemo(() => {
    if (selectedYear === 'ALL') return trainees;
    return trainees.filter((t) => t.year === parseInt(selectedYear, 10));
  }, [trainees, selectedYear]);

  // Operational metrics from schedules
  const operationalKPIs = useMemo(() => {
    if (selectedYear === '2025') {
      return calculateYearSummaryMetrics(schedules, 2025);
    } else if (selectedYear === '2026') {
      return calculateYearSummaryMetrics(schedules, 2026);
    } else {
      const m25 = calculateYearSummaryMetrics(schedules, 2025);
      const m26 = calculateYearSummaryMetrics(schedules, 2026);
      return {
        year: 0,
        totalRecords: m25.totalRecords + m26.totalRecords,
        totalParticipants: m25.totalParticipants + m26.totalParticipants,
        totalHours: m25.totalHours + m26.totalHours,
        completedTrainings: m25.completedTrainings + m26.completedTrainings,
        scheduledTrainings: m25.scheduledTrainings + m26.scheduledTrainings,
        cancelledTrainings: m25.cancelledTrainings + m26.cancelledTrainings
      };
    }
  }, [schedules, selectedYear]);

  // Filter department completion summaries (imported or default)
  const activeSummaries = useMemo(() => {
    if (selectedYear === 'ALL') return departmentSummaries;
    const y = parseInt(selectedYear, 10);
    return departmentSummaries.filter((s) => s.year === y);
  }, [departmentSummaries, selectedYear]);

  // Dynamic Trainee-derived stats
  const departmentStats = useMemo<Record<string, DeptSummary>>(() => {
    const groups: Record<string, DeptSummary> = {
      Stitching: { total: 0, completed: 0, incomplete: 0, noShow: 0, totalScore: 0 },
      Assembly: { total: 0, completed: 0, incomplete: 0, noShow: 0, totalScore: 0 },
      Cutting: { total: 0, completed: 0, incomplete: 0, noShow: 0, totalScore: 0 },
      Rubber: { total: 0, completed: 0, incomplete: 0, noShow: 0, totalScore: 0 },
      'Warehouse & Other': { total: 0, completed: 0, incomplete: 0, noShow: 0, totalScore: 0 }
    };

    filteredTrainees.forEach((t) => {
      const deptLower = (t.department || '').toLowerCase();
      let groupKey = 'Warehouse & Other';
      if (deptLower.includes('stitching') || deptLower.includes('punching')) groupKey = 'Stitching';
      else if (deptLower.includes('assembly') || deptLower.includes('midsole') || deptLower.includes('vulcanizing')) groupKey = 'Assembly';
      else if (deptLower.includes('cutting')) groupKey = 'Cutting';
      else if (deptLower.includes('rubber') || deptLower.includes('milling') || deptLower.includes('d2p') || deptLower.includes('dtp')) groupKey = 'Rubber';

      groups[groupKey].total++;
      groups[groupKey].totalScore += t.total;
      if (t.status === 'Completed') groups[groupKey].completed++;
      else if (t.status === 'No Show') groups[groupKey].noShow++;
      else groups[groupKey].incomplete++;
    });

    return groups;
  }, [filteredTrainees]);

  // Course completion ranking
  const courseStats = useMemo(() => {
    const list = LEADERSHIP_COURSES_DEF.map((c) => {
      const count = filteredTrainees.filter((t) => t.courses[c.key]).length;
      const percent = filteredTrainees.length > 0 ? (count / filteredTrainees.length) * 100 : 0;
      return {
        ...c,
        count,
        percent: percent.toFixed(1)
      };
    });

    return list.sort((a, b) => b.count - a.count);
  }, [filteredTrainees]);

  const totalCount = filteredTrainees.length;
  const totalCompleted = filteredTrainees.filter((t) => t.status === 'Completed').length;
  const overallRate = totalCount > 0 ? ((totalCompleted / totalCount) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-4 text-slate-100 font-sans">
      {/* 1. HEADER & YEAR SELECTOR (BLACK, YELLOW & BLUE ACCENTS) */}
      <div className="bg-[#0e0e0e] border border-[#242424] rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            {onBackToFolder && (
              <button
                onClick={onBackToFolder}
                className="inline-flex items-center gap-1 text-xs font-bold text-slate-300 hover:text-white bg-neutral-900 border border-neutral-800 px-2.5 py-1 rounded-lg transition cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3 text-yellow-400" />
                Back to Folder View
              </button>
            )}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-[11px] font-mono font-bold uppercase">
              <TrendingUp className="w-3 h-3 text-yellow-400" />
              Executive Metrics & Completion Analytics
            </div>
          </div>
          <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wide">
            LEADERSHIP TRAINING ANALYTICS & INSIGHTS
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Operational KPIs, modular attendance rates, and official department completion data across {selectedYear === 'ALL' ? 'All Cohorts (2025 + 2026)' : `Cohort ${selectedYear}`}.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          {onOpenImporter && (
            <button
              onClick={onOpenImporter}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import Completion Data</span>
            </button>
          )}

          <div className="flex items-center gap-1 bg-black p-1 rounded-lg border border-[#262626]">
            <button
              onClick={() => setSelectedYear('ALL')}
              className={`px-3 py-1 rounded text-xs font-mono font-bold transition cursor-pointer ${
                selectedYear === 'ALL'
                  ? 'bg-yellow-500 text-black shadow-xs font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Cohorts
            </button>
            <button
              onClick={() => setSelectedYear('2025')}
              className={`px-3 py-1 rounded text-xs font-mono font-bold transition cursor-pointer ${
                selectedYear === '2025'
                  ? 'bg-yellow-500 text-black shadow-xs font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              2025 Cohort
            </button>
            <button
              onClick={() => setSelectedYear('2026')}
              className={`px-3 py-1 rounded text-xs font-mono font-bold transition cursor-pointer ${
                selectedYear === '2026'
                  ? 'bg-yellow-500 text-black shadow-xs font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              2026 Cohort
            </button>
          </div>
        </div>
      </div>

      {/* 2. OPERATIONAL KPI SUMMARY CARDS (COMPACT, BLACK WITH YELLOW/BLUE METRICS) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div className="bg-[#111111] p-3 rounded-xl border border-[#262626]">
          <div className="text-[11px] text-slate-400 font-mono">Total Sessions</div>
          <div className="text-xl font-bold text-white mt-0.5">{operationalKPIs.totalRecords}</div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">{selectedYear === 'ALL' ? 'All years' : `In ${selectedYear}`}</div>
        </div>

        <div className="bg-[#111111] p-3 rounded-xl border border-[#262626]">
          <div className="text-[11px] text-blue-300 font-mono">Total Attendees</div>
          <div className="text-xl font-bold text-blue-400 mt-0.5">{operationalKPIs.totalParticipants}</div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">Participant count</div>
        </div>

        <div className="bg-[#111111] p-3 rounded-xl border border-[#262626]">
          <div className="text-[11px] text-blue-300 font-mono">Training Hours</div>
          <div className="text-xl font-bold text-blue-400 mt-0.5">{operationalKPIs.totalHours} hrs</div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">Instruction time</div>
        </div>

        <div className="bg-[#111111] p-3 rounded-xl border border-[#262626]">
          <div className="text-[11px] text-yellow-300 font-mono">Completed</div>
          <div className="text-xl font-bold text-yellow-400 mt-0.5">{operationalKPIs.completedTrainings}</div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">Finished sessions</div>
        </div>

        <div className="bg-[#111111] p-3 rounded-xl border border-[#262626]">
          <div className="text-[11px] text-slate-400 font-mono">Active / Scheduled</div>
          <div className="text-xl font-bold text-white mt-0.5">{operationalKPIs.scheduledTrainings}</div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">Ongoing modules</div>
        </div>

        <div className="bg-[#111111] p-3 rounded-xl border border-[#262626]">
          <div className="text-[11px] text-yellow-300 font-mono">Program Pass Rate</div>
          <div className="text-xl font-bold text-yellow-400 mt-0.5">{overallRate}%</div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">{totalCompleted} / {totalCount} Leaders</div>
        </div>
      </div>

      {/* 3. 3D ANALYTICS PIE CHART (INTERACTIVE 3D PERSPECTIVE BREAKDOWN) */}
      <Leadership3DPieChart
        trainees={filteredTrainees}
        departmentSummaries={departmentSummaries}
        currentYearFilter={selectedYear}
      />

      {/* 3. OFFICIAL DEPARTMENT COMPLETION DATA (USER FORMAT MATCH) */}
      <div className="bg-[#0f0f10] border border-[#262626] rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 bg-[#141416] border-b border-[#262626] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-yellow-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              DEPARTMENT COMPLETION DATA TABLE {selectedYear !== 'ALL' ? `(${selectedYear})` : ''}
            </span>
            <span className="px-2 py-0.5 rounded bg-blue-600/20 text-blue-300 border border-blue-500/30 text-[10px] font-mono font-bold">
              VERIFIED CORPORATE MATRIX
            </span>
          </div>

          <div className="text-[11px] text-slate-400 font-mono hidden sm:block">
            Permanent record sync: Cloud Firestore active
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#18181b] border-b border-[#27272a] text-[11px] font-mono text-slate-400 uppercase">
                <th className="py-2 px-3">Department</th>
                <th className="py-2 px-3 text-center">Completed</th>
                <th className="py-2 px-3 text-center">Incomplete</th>
                <th className="py-2 px-3 text-center">No Show</th>
                <th className="py-2 px-3 text-center font-bold text-white">Total</th>
                <th className="py-2 px-3 text-right text-yellow-400">Completion Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#202022] font-mono text-xs">
              {activeSummaries.map((item, idx) => (
                <tr key={`comp_row_${idx}`} className="hover:bg-neutral-900/60 transition">
                  <td className="py-2 px-3 font-sans font-bold text-white">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-yellow-400 shrink-0" />
                      <span>{item.department}</span>
                      {selectedYear === 'ALL' && (
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                          item.year === 2025
                            ? 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/30'
                            : 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                        }`}>
                          {item.year}
                        </span>
                      )}
                    </div>
                    {item.period && (
                      <div className="text-[10px] text-slate-500 font-mono pl-4">
                        {item.period}
                      </div>
                    )}
                  </td>
                  <td className="py-2 px-3 text-center text-blue-400 font-bold">
                    {item.completed}
                  </td>
                  <td className="py-2 px-3 text-center text-slate-300">
                    {item.incomplete}
                  </td>
                  <td className="py-2 px-3 text-center text-slate-500">
                    {item.noShow}
                  </td>
                  <td className="py-2 px-3 text-center font-bold text-white bg-neutral-900/30">
                    {item.total}
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-yellow-400">
                    {item.completionRate}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#141416] border-t border-[#2a2a2e] font-bold text-xs font-mono text-slate-200">
                <td className="py-2 px-3">TOTAL CONSOLIDATED</td>
                <td className="py-2 px-3 text-center text-blue-400 font-black">
                  {activeSummaries.reduce((a, b) => a + b.completed, 0)}
                </td>
                <td className="py-2 px-3 text-center text-slate-300 font-black">
                  {activeSummaries.reduce((a, b) => a + b.incomplete, 0)}
                </td>
                <td className="py-2 px-3 text-center text-slate-400 font-black">
                  {activeSummaries.reduce((a, b) => a + b.noShow, 0)}
                </td>
                <td className="py-2 px-3 text-center text-yellow-400 bg-neutral-950 font-black">
                  {activeSummaries.reduce((a, b) => a + b.total, 0)}
                </td>
                <td className="py-2 px-3 text-right text-yellow-400 font-black">
                  100.00%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 4. DEPARTMENT QUALIFICATION CARDS (BLACK PANELS, YELLOW HIGHLIGHTS, BLUE BARS) */}
      <div>
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-2 font-mono">
          <Building2 className="w-3.5 h-3.5 text-yellow-400" />
          Individual Department Breakdown ({selectedYear === 'ALL' ? 'Combined Cohorts' : `Year ${selectedYear}`})
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {(Object.entries(departmentStats) as [string, DeptSummary][]).map(([dept, data]) => {
            const completionPct = data.total > 0 ? ((data.completed / data.total) * 100).toFixed(0) : '0';
            const avgScore = data.total > 0 ? (data.totalScore / data.total).toFixed(1) : '0.0';

            return (
              <div
                key={dept}
                className="bg-[#111111] border border-[#262626] rounded-xl p-3.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-white">{dept}</h4>
                    <span className="text-[11px] font-mono font-bold text-blue-300 bg-blue-950/40 px-2 py-0.5 rounded border border-blue-800/40">
                      {data.total} Leaders
                    </span>
                  </div>

                  <div className="space-y-1.5 my-3 text-xs">
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-slate-400">Passed Rate:</span>
                      <span className="font-bold text-yellow-400">{completionPct}%</span>
                    </div>
                    <div className="w-full bg-neutral-900 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-yellow-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${completionPct}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-1 pt-1.5 text-[10px] text-center font-mono">
                      <div className="bg-neutral-900/60 p-1 rounded border border-neutral-800">
                        <span className="block text-yellow-400 font-bold">{data.completed}</span>
                        <span className="text-slate-500 text-[9px]">Passed</span>
                      </div>
                      <div className="bg-neutral-900/60 p-1 rounded border border-neutral-800">
                        <span className="block text-slate-300 font-bold">{data.incomplete}</span>
                        <span className="text-slate-500 text-[9px]">Incompl.</span>
                      </div>
                      <div className="bg-neutral-900/60 p-1 rounded border border-neutral-800">
                        <span className="block text-slate-500 font-bold">{data.noShow}</span>
                        <span className="text-slate-500 text-[9px]">No Show</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>Avg Modules:</span>
                  <span className="font-bold text-white">{avgScore} / 8.0</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. COURSE ATTENDANCE RANKING (COMPACT, BLACK & BLUE/YELLOW THEME) */}
      <div className="bg-[#111111] rounded-xl p-4 border border-[#262626]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <BarChart3 className="w-3.5 h-3.5 text-yellow-400" />
              Leadership Module Participation & Attendance Ranking
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Ranked by participant attendance volume among active trainees ({filteredTrainees.length} total in {selectedYear === 'ALL' ? 'all cohorts' : selectedYear})
            </p>
          </div>
          <div className="text-[11px] font-mono font-bold text-yellow-300 bg-yellow-500/10 border border-yellow-500/30 px-2.5 py-1 rounded">
            Overall Pass Rate: {overallRate}%
          </div>
        </div>

        <div className="space-y-2">
          {courseStats.map((course, idx) => {
            const isTop = idx < 3;
            return (
              <div key={course.key} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-mono font-bold ${
                        isTop ? 'bg-yellow-400 text-black font-black' : 'bg-neutral-800 text-slate-400'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="font-bold text-slate-200">{course.title}</span>
                    <span className="text-slate-500 text-[11px] hidden sm:inline font-mono">— {course.trainer}</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono text-[11px]">
                    <span className="text-slate-400">{course.count} Attendees</span>
                    <span className="font-bold text-blue-400 w-12 text-right">{course.percent}%</span>
                  </div>
                </div>

                <div className="w-full bg-black rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isTop ? 'bg-yellow-400' : 'bg-blue-600'
                    }`}
                    style={{ width: `${course.percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LeadershipAnalyticsView;
