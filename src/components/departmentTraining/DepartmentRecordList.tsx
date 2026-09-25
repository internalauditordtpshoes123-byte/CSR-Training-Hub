/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Users, 
  Clock, 
  FileText, 
  Image as ImageIcon, 
  Download, 
  Edit3, 
  Trash2, 
  Eye, 
  Settings2, 
  Sparkles, 
  Building2, 
  ArrowUpDown,
  Printer,
  ChevronDown,
  X,
  FileSpreadsheet
} from 'lucide-react';
import { 
  DepartmentFolder, 
  DepartmentTrainingRecord, 
  DepartmentCustomField,
  DepartmentTrainingPhoto 
} from '../../types';

interface DepartmentRecordListProps {
  department: DepartmentFolder;
  allDepartments: DepartmentFolder[];
  records: DepartmentTrainingRecord[];
  customFields: DepartmentCustomField[];
  onBackToDepartments: () => void;
  onSelectDepartment: (deptId: string) => void;
  onAddRecord: () => void;
  onEditRecord: (record: DepartmentTrainingRecord) => void;
  onDeleteRecord: (recordId: string) => void;
  onViewRecordDetails: (record: DepartmentTrainingRecord) => void;
  onOpenCustomFieldsModal: () => void;
  onOpenPhotoLightbox: (photos: DepartmentTrainingPhoto[], index: number) => void;
  canEdit?: boolean;
}

export const DepartmentRecordList: React.FC<DepartmentRecordListProps> = ({
  department,
  allDepartments,
  records,
  customFields,
  onBackToDepartments,
  onSelectDepartment,
  onAddRecord,
  onEditRecord,
  onDeleteRecord,
  onViewRecordDetails,
  onOpenCustomFieldsModal,
  onOpenPhotoLightbox,
  canEdit = true,
}) => {
  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [sortField, setSortField] = useState<'date' | 'trainees' | 'subject'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Filter records belonging to this department
  const deptRecords = useMemo(() => {
    return records.filter(r => r.departmentId === department.id);
  }, [records, department.id]);

  // Extract unique years from this department's records
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    yearsSet.add(new Date().getFullYear());
    deptRecords.forEach(r => {
      if (r.year) yearsSet.add(r.year);
      else if (r.date) {
        const y = new Date(r.date).getFullYear();
        if (!isNaN(y)) yearsSet.add(y);
      }
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [deptRecords]);

  // Extract training types
  const availableTypes = useMemo(() => {
    const set = new Set<string>();
    deptRecords.forEach(r => {
      if (r.trainingType) set.add(r.trainingType);
    });
    return Array.from(set);
  }, [deptRecords]);

  // Top Summary Cards metrics for this department
  const stats = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // 1-12

    let totalTrainees = 0;
    let totalHours = 0;
    let thisMonthCount = 0;
    let thisYearCount = 0;
    let totalPhotos = 0;
    let totalDocs = 0;

    deptRecords.forEach(r => {
      totalTrainees += Number(r.traineesCount) || 0;
      totalHours += Number(r.totalHours) || 0;
      if (r.photos) totalPhotos += r.photos.length;
      if (r.documents) totalDocs += r.documents.length;

      if (r.date) {
        const d = new Date(r.date);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        if (y === currentYear) {
          thisYearCount++;
          if (m === currentMonth) {
            thisMonthCount++;
          }
        }
      }
    });

    return {
      totalRecords: deptRecords.length,
      totalTrainees,
      totalHours: Number(totalHours.toFixed(1)),
      thisMonthCount,
      thisYearCount,
      totalPhotos,
      totalDocs,
    };
  }, [deptRecords]);

  // Filter and sort records
  const filteredRecords = useMemo(() => {
    return deptRecords.filter(r => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSubject = r.subject?.toLowerCase().includes(q);
        const matchTrainer = r.trainer?.toLowerCase().includes(q);
        const matchVenue = r.venue?.toLowerCase().includes(q);
        const matchType = r.trainingType?.toLowerCase().includes(q);
        const matchBatch = r.batch?.toLowerCase().includes(q);
        const matchId = r.id?.toLowerCase().includes(q);
        if (!matchSubject && !matchTrainer && !matchVenue && !matchType && !matchBatch && !matchId) {
          return false;
        }
      }

      // Year filter
      if (selectedYear !== 'all') {
        const y = r.year || (r.date ? new Date(r.date).getFullYear() : null);
        if (String(y) !== selectedYear) return false;
      }

      // Month filter
      if (selectedMonth !== 'all' && r.date) {
        const m = String(new Date(r.date).getMonth() + 1);
        if (m !== selectedMonth) return false;
      }

      // Status filter
      if (selectedStatus !== 'all' && r.status !== selectedStatus) {
        return false;
      }

      // Type filter
      if (selectedType !== 'all' && r.trainingType !== selectedType) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortField === 'date') {
        const da = new Date(a.date || 0).getTime();
        const db = new Date(b.date || 0).getTime();
        return sortDirection === 'asc' ? da - db : db - da;
      }
      if (sortField === 'trainees') {
        const ta = a.traineesCount || 0;
        const tb = b.traineesCount || 0;
        return sortDirection === 'asc' ? ta - tb : tb - ta;
      }
      if (sortField === 'subject') {
        const sa = a.subject || '';
        const sb = b.subject || '';
        return sortDirection === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa);
      }
      return 0;
    });
  }, [deptRecords, searchQuery, selectedYear, selectedMonth, selectedStatus, selectedType, sortField, sortDirection]);

  // Export department records to CSV
  const handleExportCSV = () => {
    if (deptRecords.length === 0) {
      alert('No training records to export.');
      return;
    }

    const headers = [
      'Record ID',
      'Department',
      'Date',
      'Subject',
      'No. of Trainees',
      'Total Time',
      'Total Hours',
      'Trainer',
      'Training Type',
      'Venue',
      'Status',
      'Photos Count',
      'Docs Count',
      'Remarks',
    ];

    const rows = deptRecords.map(r => [
      `"${r.id}"`,
      `"${r.departmentName}"`,
      `"${r.date}"`,
      `"${(r.subject || '').replace(/"/g, '""')}"`,
      r.traineesCount || 0,
      `"${r.totalTime || ''}"`,
      r.totalHours || 0,
      `"${(r.trainer || '').replace(/"/g, '""')}"`,
      `"${(r.trainingType || '').replace(/"/g, '""')}"`,
      `"${(r.venue || '').replace(/"/g, '""')}"`,
      `"${r.status}"`,
      r.photos?.length || 0,
      r.documents?.length || 0,
      `"${(r.remarks || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DATIAN_${department.name}_Training_Records_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'Completed':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40';
      case 'In Progress':
        return 'bg-blue-950/80 text-blue-300 border-blue-500/40';
      case 'Scheduled':
        return 'bg-amber-950/80 text-amber-300 border-amber-500/40';
      case 'Cancelled':
        return 'bg-red-950/80 text-red-300 border-red-500/40';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div id="department-record-list" className="space-y-6 animate-fadeIn">
      {/* Top Header & Breadcrumb Nav */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-[#09162e] border border-blue-900/40 shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToDepartments}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold shadow"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">All Departments</span>
          </button>

          <div className="h-6 w-[1px] bg-slate-800 hidden sm:block" />

          {/* Department Name & Selector */}
          <div className="flex items-center gap-2">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md font-bold text-white"
              style={{ backgroundColor: `${department.color || '#3b82f6'}30`, color: department.color || '#3b82f6' }}
            >
              <Building2 className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  {department.name}
                </h1>
                {department.code && (
                  <span className="text-xs px-2 py-0.5 rounded bg-blue-900/50 text-blue-300 font-mono font-bold">
                    {department.code}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 truncate max-w-md">
                {department.description || 'Department Training Records & Documentation System'}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Dept Switcher & Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Dept Switcher */}
          <div className="relative">
            <select
              value={department.id}
              onChange={(e) => onSelectDepartment(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-xs focus:outline-none focus:border-blue-500 font-medium cursor-pointer"
            >
              {allDepartments.map(d => (
                <option key={d.id} value={d.id}>
                  Switch to: {d.name} {d.code ? `(${d.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Fields button */}
          <button
            onClick={onOpenCustomFieldsModal}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow"
            title="Configure Custom Fields"
          >
            <Settings2 className="w-4 h-4 text-blue-400" />
            <span className="hidden sm:inline">Custom Fields</span>
          </button>

          {/* Export CSV button */}
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow"
            title="Export Records to Excel / CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* Add Record Primary Button */}
          {canEdit && (
            <button
              onClick={onAddRecord}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Training Record</span>
            </button>
          )}
        </div>
      </div>

      {/* SUMMARY DASHBOARD CARDS FOR THIS DEPARTMENT (Section 13) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-xl bg-[#0a1832] border border-blue-900/30">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
            Total Records
          </span>
          <div className="text-xl font-bold text-white font-mono">
            {stats.totalRecords}
          </div>
          <span className="text-[10px] text-blue-400 mt-1 block">In {department.name}</span>
        </div>

        <div className="p-4 rounded-xl bg-[#0a1832] border border-blue-900/30">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Total Trainees
            </span>
            <Users className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-300 font-mono">
            {stats.totalTrainees}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Participants</span>
        </div>

        <div className="p-4 rounded-xl bg-[#0a1832] border border-blue-900/30">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Training Hours
            </span>
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-amber-300 font-mono">
            {stats.totalHours} hrs
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Total Delivered</span>
        </div>

        <div className="p-4 rounded-xl bg-[#0a1832] border border-blue-900/30">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
            This Month
          </span>
          <div className="text-xl font-bold text-cyan-300 font-mono">
            {stats.thisMonthCount}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Current Month Sessions</span>
        </div>

        <div className="p-4 rounded-xl bg-[#0a1832] border border-blue-900/30">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
            This Year ({new Date().getFullYear()})
          </span>
          <div className="text-xl font-bold text-violet-300 font-mono">
            {stats.thisYearCount}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">YTD Sessions</span>
        </div>

        <div className="p-4 rounded-xl bg-[#0a1832] border border-blue-900/30">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Documentation
            </span>
            <ImageIcon className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-xl font-bold text-rose-300 font-mono">
            {stats.totalPhotos} <span className="text-xs font-normal text-slate-400">/ {stats.totalDocs} docs</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Proof & Files</span>
        </div>
      </div>

      {/* SEARCH AND FILTER BAR (Section 12) */}
      <div className="p-4 rounded-2xl bg-[#09152a] border border-slate-800 flex flex-col md:flex-row items-center gap-3">
        {/* Search input */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by subject, trainer, venue, batch code..."
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500 placeholder-slate-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter dropdowns */}
        <div className="flex items-center flex-wrap gap-2 w-full md:w-auto">
          {/* Year Filter */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-xs focus:outline-none"
          >
            <option value="all">All Years</option>
            {availableYears.map(y => (
              <option key={y} value={String(y)}>{y}</option>
            ))}
          </select>

          {/* Month Filter */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-xs focus:outline-none"
          >
            <option value="all">All Months</option>
            <option value="1">January</option>
            <option value="2">February</option>
            <option value="3">March</option>
            <option value="4">April</option>
            <option value="5">May</option>
            <option value="6">June</option>
            <option value="7">July</option>
            <option value="8">August</option>
            <option value="9">September</option>
            <option value="10">October</option>
            <option value="11">November</option>
            <option value="12">December</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-xs focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="Completed">Completed</option>
            <option value="In Progress">In Progress</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          {/* Reset Filters if active */}
          {(searchQuery || selectedYear !== 'all' || selectedMonth !== 'all' || selectedStatus !== 'all' || selectedType !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedYear('all');
                setSelectedMonth('all');
                setSelectedStatus('all');
                setSelectedType('all');
              }}
              className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* TRAINING RECORDS TABLE (Section 5) */}
      <div className="bg-[#09152a] rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="px-5 py-3.5 border-b border-slate-800 bg-[#071120] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Training Records Log
            </span>
            <span className="px-2 py-0.5 rounded-full bg-blue-900/50 text-blue-300 text-xs font-mono font-bold">
              {filteredRecords.length} of {deptRecords.length}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Sort by:</span>
            <button
              onClick={() => {
                if (sortField === 'date') setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                else { setSortField('date'); setSortDirection('desc'); }
              }}
              className={`flex items-center gap-1 hover:text-white ${sortField === 'date' ? 'text-blue-400 font-bold' : ''}`}
            >
              Date {sortField === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
            </button>
            <span>•</span>
            <button
              onClick={() => {
                if (sortField === 'trainees') setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                else { setSortField('trainees'); setSortDirection('desc'); }
              }}
              className={`flex items-center gap-1 hover:text-white ${sortField === 'trainees' ? 'text-blue-400 font-bold' : ''}`}
            >
              Trainees {sortField === 'trainees' && (sortDirection === 'asc' ? '↑' : '↓')}
            </button>
          </div>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-950/40 border border-blue-800/40 flex items-center justify-center text-blue-400 mx-auto mb-3">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white">No Training Records Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {deptRecords.length === 0
                ? `No training sessions have been logged yet for ${department.name}. Click below to add the first record.`
                : 'No training records matched your active search and filter criteria.'}
            </p>
            {deptRecords.length === 0 && canEdit && (
              <button
                onClick={onAddRecord}
                className="mt-4 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow transition"
              >
                <Plus className="w-4 h-4" />
                Add First Training Record
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800/80 bg-[#06101f] text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Subject / Training Title</th>
                  <th className="px-4 py-3 text-center">Trainees</th>
                  <th className="px-4 py-3 text-center">Duration</th>
                  <th className="px-4 py-3">Trainer</th>
                  <th className="px-4 py-3">Venue</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Documentation</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredRecords.map((r) => {
                  const photoCount = r.photos?.length || 0;
                  const docCount = r.documents?.length || 0;

                  return (
                    <tr 
                      key={r.id} 
                      className="hover:bg-blue-950/30 transition group cursor-pointer"
                      onClick={() => onViewRecordDetails(r)}
                    >
                      {/* Date */}
                      <td className="px-4 py-3 font-mono text-slate-300 whitespace-nowrap">
                        {r.date}
                      </td>

                      {/* Subject */}
                      <td className="px-4 py-3 max-w-xs">
                        <div className="font-bold text-white group-hover:text-blue-300 transition line-clamp-1">
                          {r.subject}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">
                          {r.id} • {r.trainingType || 'Standard'}
                        </div>
                      </td>

                      {/* Trainees */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className="font-mono font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/30">
                          {r.traineesCount}
                        </span>
                      </td>

                      {/* Total Time */}
                      <td className="px-4 py-3 text-center whitespace-nowrap font-mono text-amber-300">
                        {r.totalTime}
                      </td>

                      {/* Trainer */}
                      <td className="px-4 py-3 whitespace-nowrap text-slate-200">
                        {r.trainer || '—'}
                      </td>

                      {/* Venue */}
                      <td className="px-4 py-3 whitespace-nowrap text-slate-400">
                        {r.venue || '—'}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(r.status)}`}>
                          {r.status}
                        </span>
                      </td>

                      {/* Documentation proof icons */}
                      <td className="px-4 py-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          {photoCount > 0 ? (
                            <button
                              onClick={() => r.photos && onOpenPhotoLightbox(r.photos, 0)}
                              className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-700/40 text-emerald-300 hover:text-white text-[10px] font-mono flex items-center gap-1 transition"
                              title="Click to view photos in Lightbox"
                            >
                              <ImageIcon className="w-3 h-3" />
                              <span>{photoCount}</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-600 font-mono">—</span>
                          )}

                          {docCount > 0 && (
                            <span 
                              className="px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-700/40 text-amber-300 text-[10px] font-mono flex items-center gap-0.5"
                              title={`${docCount} supporting documents`}
                            >
                              <FileText className="w-3 h-3" />
                              <span>{docCount}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onViewRecordDetails(r)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                            title="View Full Training Record Sheet"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {canEdit && (
                            <>
                              <button
                                onClick={() => onEditRecord(r)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-blue-600 text-blue-400 hover:text-white transition cursor-pointer"
                                title="Edit Record"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm(`Delete record "${r.subject}"?`)) {
                                    onDeleteRecord(r.id);
                                  }
                                }}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-600 text-red-400 hover:text-white transition cursor-pointer"
                                title="Delete Record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
export default DepartmentRecordList;
