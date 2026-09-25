/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  BarChart3, 
  Users, 
  Clock, 
  Calendar, 
  Image as ImageIcon, 
  FileText, 
  Building2, 
  CheckCircle2, 
  Award, 
  ArrowRight,
  TrendingUp,
  Folder
} from 'lucide-react';
import { DepartmentFolder, DepartmentTrainingRecord } from '../../types';

interface DepartmentDashboardProps {
  departments: DepartmentFolder[];
  records: DepartmentTrainingRecord[];
  onBackToFolders: () => void;
  onSelectDepartment: (deptId: string) => void;
  onViewRecordDetails: (record: DepartmentTrainingRecord) => void;
}

export const DepartmentDashboard: React.FC<DepartmentDashboardProps> = ({
  departments,
  records,
  onBackToFolders,
  onSelectDepartment,
  onViewRecordDetails,
}) => {
  const [selectedYear, setSelectedYear] = useState<string>('all');

  // Available years
  const availableYears = useMemo(() => {
    const set = new Set<number>();
    set.add(new Date().getFullYear());
    records.forEach(r => {
      if (r.year) set.add(r.year);
      else if (r.date) {
        const y = new Date(r.date).getFullYear();
        if (!isNaN(y)) set.add(y);
      }
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [records]);

  // Filtered records by year
  const filteredRecords = useMemo(() => {
    if (selectedYear === 'all') return records;
    return records.filter(r => {
      const y = r.year || (r.date ? new Date(r.date).getFullYear() : null);
      return String(y) === selectedYear;
    });
  }, [records, selectedYear]);

  // Overall metrics calculation
  const metrics = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    let totalTrainees = 0;
    let totalHours = 0;
    let thisMonthCount = 0;
    let thisYearCount = 0;
    let totalPhotos = 0;
    let totalDocs = 0;

    const statusCounts: Record<string, number> = {
      Completed: 0,
      'In Progress': 0,
      Scheduled: 0,
      Cancelled: 0,
    };

    filteredRecords.forEach(r => {
      totalTrainees += Number(r.traineesCount) || 0;
      totalHours += Number(r.totalHours) || 0;
      if (r.photos) totalPhotos += r.photos.length;
      if (r.documents) totalDocs += r.documents.length;

      if (r.status && statusCounts[r.status] !== undefined) {
        statusCounts[r.status]++;
      }

      if (r.date) {
        const d = new Date(r.date);
        if (d.getFullYear() === currentYear) {
          thisYearCount++;
          if (d.getMonth() + 1 === currentMonth) {
            thisMonthCount++;
          }
        }
      }
    });

    return {
      totalRecords: filteredRecords.length,
      totalTrainees,
      totalHours: Number(totalHours.toFixed(1)),
      thisMonthCount,
      thisYearCount,
      totalPhotos,
      totalDocs,
      statusCounts,
    };
  }, [filteredRecords]);

  // Department breakdown list
  const departmentBreakdown = useMemo(() => {
    return departments.map(d => {
      const deptRecs = filteredRecords.filter(r => r.departmentId === d.id);
      const trainees = deptRecs.reduce((acc, r) => acc + (Number(r.traineesCount) || 0), 0);
      const hours = deptRecs.reduce((acc, r) => acc + (Number(r.totalHours) || 0), 0);
      const photos = deptRecs.reduce((acc, r) => acc + (r.photos?.length || 0), 0);

      return {
        department: d,
        recordsCount: deptRecs.length,
        traineesCount: trainees,
        hoursCount: Number(hours.toFixed(1)),
        photosCount: photos,
      };
    }).sort((a, b) => b.recordsCount - a.recordsCount);
  }, [departments, filteredRecords]);

  const maxDeptRecords = Math.max(1, ...departmentBreakdown.map(d => d.recordsCount));
  const maxDeptTrainees = Math.max(1, ...departmentBreakdown.map(d => d.traineesCount));

  // Recent 5 training activities
  const recentRecords = useMemo(() => {
    return [...filteredRecords]
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
      .slice(0, 6);
  }, [filteredRecords]);

  return (
    <div id="department-training-dashboard" className="space-y-6 animate-fadeIn">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#09162e] border border-blue-900/40 shadow-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToFolders}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold shadow"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Folder Cards</span>
          </button>

          <div className="h-6 w-[1px] bg-slate-800 hidden sm:block" />

          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
              Department Training Master Dashboard
            </h1>
            <p className="text-xs text-slate-400">
              Cross-department training delivery, participant volumes, and compliance verification metrics.
            </p>
          </div>
        </div>

        {/* Year Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Filter Year:</span>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="all">All Available Years</option>
            {availableYears.map(y => (
              <option key={y} value={String(y)}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards Row (Section 14) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-xl bg-[#0a1832] border border-blue-900/30">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
            Active Departments
          </span>
          <div className="text-2xl font-black text-white font-mono">
            {departments.length}
          </div>
          <span className="text-[10px] text-blue-400 mt-1 block">Filing Folders</span>
        </div>

        <div className="p-4 rounded-xl bg-[#0a1832] border border-blue-900/30">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
            Total Records Logged
          </span>
          <div className="text-2xl font-black text-blue-300 font-mono">
            {metrics.totalRecords}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Sessions Conducted</span>
        </div>

        <div className="p-4 rounded-xl bg-[#0a1832] border border-blue-900/30">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Total Trainees
            </span>
            <Users className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-300 font-mono">
            {metrics.totalTrainees}
          </div>
          <span className="text-[10px] text-emerald-500/80 mt-1 block">Participants Trained</span>
        </div>

        <div className="p-4 rounded-xl bg-[#0a1832] border border-blue-900/30">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Training Hours
            </span>
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-300 font-mono">
            {metrics.totalHours}h
          </div>
          <span className="text-[10px] text-amber-500/80 mt-1 block">Cumulative Time</span>
        </div>

        <div className="p-4 rounded-xl bg-[#0a1832] border border-blue-900/30">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
            This Month
          </span>
          <div className="text-2xl font-black text-cyan-300 font-mono">
            {metrics.thisMonthCount}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Sessions Active</span>
        </div>

        <div className="p-4 rounded-xl bg-[#0a1832] border border-blue-900/30">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Documentation
            </span>
            <ImageIcon className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-300 font-mono">
            {metrics.totalPhotos} <span className="text-xs font-normal text-slate-400">/ {metrics.totalDocs} docs</span>
          </div>
          <span className="text-[10px] text-rose-500/80 mt-1 block">Evidence Attached</span>
        </div>
      </div>

      {/* Main Breakdown Section: Left Departments Volume, Right Recent Activity & Status */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Department Comparison Progress Bars */}
        <div className="lg:col-span-7 bg-[#09152a] rounded-2xl border border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Department Activity Breakdown
              </h3>
              <p className="text-[11px] text-slate-400">
                Comparison of training records and trainee attendance across all factory units
              </p>
            </div>
            <span className="text-xs text-blue-400 font-mono">
              {departments.length} Units
            </span>
          </div>

          <div className="space-y-3 pt-2">
            {departmentBreakdown.map(({ department, recordsCount, traineesCount, hoursCount }) => {
              const recordPct = (recordsCount / maxDeptRecords) * 100;
              const color = department.color || '#3b82f6';

              return (
                <div
                  key={department.id}
                  onClick={() => onSelectDepartment(department.id)}
                  className="p-3 rounded-xl bg-[#06101f] border border-slate-800/80 hover:border-blue-500/50 transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2">
                      <span 
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="font-bold text-white group-hover:text-blue-300 transition">
                        {department.name}
                      </span>
                      {department.code && (
                        <span className="text-[9px] font-mono text-slate-400 px-1.5 py-0.2 rounded bg-slate-900">
                          {department.code}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
                      <span><strong className="text-white">{recordsCount}</strong> records</span>
                      <span>•</span>
                      <span><strong className="text-emerald-400">{traineesCount}</strong> trainees</span>
                      <span>•</span>
                      <span><strong className="text-amber-300">{hoursCount}h</strong></span>
                      <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>

                  {/* Relative bar */}
                  <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(5, recordPct)}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Status Distribution & Recent Activities */}
        <div className="lg:col-span-5 space-y-6">
          {/* Status Breakdown Box */}
          <div className="bg-[#09152a] rounded-2xl border border-slate-800 p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Training Delivery Status
            </h3>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/40">
                <span className="text-[10px] text-emerald-400 font-bold block uppercase">Completed</span>
                <span className="text-xl font-mono font-bold text-emerald-300">
                  {metrics.statusCounts['Completed'] || 0}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-800/40">
                <span className="text-[10px] text-blue-400 font-bold block uppercase">In Progress</span>
                <span className="text-xl font-mono font-bold text-blue-300">
                  {metrics.statusCounts['In Progress'] || 0}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/40">
                <span className="text-[10px] text-amber-400 font-bold block uppercase">Scheduled</span>
                <span className="text-xl font-mono font-bold text-amber-300">
                  {metrics.statusCounts['Scheduled'] || 0}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-red-950/30 border border-red-800/40">
                <span className="text-[10px] text-red-400 font-bold block uppercase">Cancelled</span>
                <span className="text-xl font-mono font-bold text-red-300">
                  {metrics.statusCounts['Cancelled'] || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Recent Training Feed */}
          <div className="bg-[#09152a] rounded-2xl border border-slate-800 p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Recent Training Activities
            </h3>

            <div className="space-y-2.5">
              {recentRecords.map(r => (
                <div
                  key={r.id}
                  onClick={() => onViewRecordDetails(r)}
                  className="p-3 rounded-xl bg-[#06101f] border border-slate-800 hover:border-blue-500/50 transition cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/60 text-blue-300 font-mono font-bold">
                        {r.departmentName}
                      </span>
                      <span className="text-xs font-bold text-white truncate group-hover:text-blue-300 transition">
                        {r.subject}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                      <span>{r.date}</span>
                      <span>•</span>
                      <span>{r.traineesCount} Trainees</span>
                      <span>•</span>
                      <span>{r.trainer}</span>
                    </div>
                  </div>

                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default DepartmentDashboard;
