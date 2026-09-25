/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Plus, 
  Edit3, 
  Search, 
  Filter, 
  ExternalLink, 
  Database, 
  ShieldCheck, 
  Save, 
  Sparkles,
  ArrowUpDown,
  Download,
  Code2,
  Calendar,
  Layers,
  ChevronRight
} from 'lucide-react';
import { StitchingRecord, UserRole } from '../../types';
import { 
  getStitchingSheetConfig, 
  updateStitchingSheetConfig, 
  getStitchingSheetData, 
  syncStitchingGoogleSheet, 
  addStitchingSheetRecord, 
  editStitchingSheetRecord,
  StitchingSheetConfig 
} from '../../services/stitchingSheetService';

interface StitchingGoogleSheetSyncViewProps {
  records: StitchingRecord[];
  setRecords: React.Dispatch<React.SetStateAction<StitchingRecord[]>>;
  role: UserRole;
  addToast: (title: string, message: string, type: 'success' | 'warning' | 'info') => void;
  lastSynced: string;
  setLastSynced: React.Dispatch<React.SetStateAction<string>>;
  syncStatus: 'synced' | 'syncing' | 'error';
  setSyncStatus: React.Dispatch<React.SetStateAction<'synced' | 'syncing' | 'error'>>;
  recordsSyncedCount: number;
  setRecordsSyncedCount: React.Dispatch<React.SetStateAction<number>>;
  onTriggerSync: () => Promise<void>;
  isSyncing: boolean;
}

export default function StitchingGoogleSheetSyncView({
  records,
  setRecords,
  role,
  addToast,
  lastSynced,
  setLastSynced,
  syncStatus,
  setSyncStatus,
  recordsSyncedCount,
  setRecordsSyncedCount,
  onTriggerSync,
  isSyncing
}: StitchingGoogleSheetSyncViewProps) {
  const [config, setConfig] = useState<StitchingSheetConfig>({
    sheetUrl: 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',
    sheetName: 'Stitching Training Plan',
    autoSync: true,
    syncIntervalSeconds: 15,
    lastSynced: new Date().toISOString(),
    syncStatus: 'synced',
    recordsSyncedCount: records.length,
    totalRecords: records.length
  });

  const [sheetRows, setSheetRows] = useState<any[]>([]);
  const [isLoadingSheet, setIsLoadingSheet] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<'All' | '2025' | '2026'>('All');
  const [selectedLine, setSelectedLine] = useState<string>('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Partial<StitchingRecord> | null>(null);
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Form state for adding a new record in Google Sheet
  const [newRecordForm, setNewRecordForm] = useState<Partial<StitchingRecord>>({
    traineeName: '',
    line: 'Stitching Line A8',
    style: 'Modern Sports Runner X1',
    trainingProcess: 'Sewing',
    targetTaktTime: 12.0,
    actualTaktTime: 11.5,
    blueLabelStatus: 'Candidate',
    trainerName: 'Mary Jane',
    status: 'In Progress',
    outputTarget: 100,
    outputActual: 95,
    certificationDate: '2026-06-15',
    year: 2026
  });

  // Load config on mount
  useEffect(() => {
    loadConfigAndSheetData();
  }, []);

  const loadConfigAndSheetData = async () => {
    setIsLoadingSheet(true);
    try {
      const cfg = await getStitchingSheetConfig();
      setConfig(cfg);
      if (cfg.lastSynced) setLastSynced(cfg.lastSynced);
      if (cfg.recordsSyncedCount) setRecordsSyncedCount(cfg.recordsSyncedCount);
      if (cfg.syncStatus) setSyncStatus(cfg.syncStatus);

      const sheetData = await getStitchingSheetData();
      if (sheetData && sheetData.sheetRows) {
        setSheetRows(sheetData.sheetRows);
      }
    } catch (err) {
      console.warn('Could not load sheet data:', err);
    } finally {
      setIsLoadingSheet(false);
    }
  };

  // Handle Save Google Sheet Configuration
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    try {
      const updated = await updateStitchingSheetConfig(config);
      setConfig(updated);
      addToast('Configuration Saved', 'Google Sheet synchronization settings updated.', 'success');
      // Trigger sync with new config
      await onTriggerSync();
    } catch (err: any) {
      addToast('Error', err.message || 'Failed to save configuration', 'warning');
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Handle Add Record to Google Sheet
  const handleAddRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecordForm.traineeName?.trim()) {
      addToast('Validation', 'Please provide a Trainee Name.', 'warning');
      return;
    }

    try {
      const res = await addStitchingSheetRecord(newRecordForm);
      if (res.success) {
        setRecords(res.records);
        setLastSynced(res.lastSynced);
        setRecordsSyncedCount(res.recordsSyncedCount);
        setSyncStatus('synced');
        setIsAddModalOpen(false);
        // Refresh sheet rows
        const sheetData = await getStitchingSheetData();
        if (sheetData?.sheetRows) setSheetRows(sheetData.sheetRows);
        
        addToast(
          'Google Sheet Record Added',
          `New trainee "${res.newRecord.traineeName}" (${res.newRecord.id}) added to Google Sheet and synchronized into the system.`,
          'success'
        );

        // Reset form
        setNewRecordForm({
          traineeName: '',
          line: 'Stitching Line A8',
          style: 'Modern Sports Runner X1',
          trainingProcess: 'Sewing',
          targetTaktTime: 12.0,
          actualTaktTime: 11.5,
          blueLabelStatus: 'Candidate',
          trainerName: 'Mary Jane',
          status: 'In Progress',
          outputTarget: 100,
          outputActual: 95,
          certificationDate: '2026-06-15',
          year: 2026
        });
      }
    } catch (err: any) {
      addToast('Error', err.message || 'Failed to add record to Google Sheet', 'warning');
    }
  };

  // Handle Edit Record in Google Sheet
  const handleEditRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord || !editingRecord.id) return;

    try {
      const res = await editStitchingSheetRecord(editingRecord);
      if (res.success) {
        setRecords(res.records);
        setLastSynced(res.lastSynced);
        setRecordsSyncedCount(res.recordsSyncedCount);
        setSyncStatus('synced');
        setIsEditModalOpen(false);
        setEditingRecord(null);
        // Refresh sheet rows
        const sheetData = await getStitchingSheetData();
        if (sheetData?.sheetRows) setSheetRows(sheetData.sheetRows);

        addToast(
          'Google Sheet Record Updated',
          `Record ${res.updatedRecord.id} (${res.updatedRecord.traineeName}) updated in Google Sheet and synchronized into the system.`,
          'success'
        );
      }
    } catch (err: any) {
      addToast('Error', err.message || 'Failed to update record in Google Sheet', 'warning');
    }
  };

  // Open Edit Modal for a given record
  const handleOpenEdit = (rec: any) => {
    setEditingRecord({ ...rec });
    setIsEditModalOpen(true);
  };

  // Distinct lines for filter
  const distinctLines = useMemo(() => {
    const set = new Set<string>();
    records.forEach(r => { if (r.line) set.add(r.line); });
    return Array.from(set).sort();
  }, [records]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      // Year filter
      if (selectedYear !== 'All') {
        const recordYear = (r as any).year ? String((r as any).year) : (r.certificationDate?.includes('2025') ? '2025' : '2026');
        if (recordYear !== selectedYear) return false;
      }

      // Line filter
      if (selectedLine !== 'All' && r.line !== selectedLine) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = r.traineeName?.toLowerCase().includes(q);
        const matchesId = r.id?.toLowerCase().includes(q);
        const matchesStyle = r.style?.toLowerCase().includes(q);
        const matchesProcess = r.trainingProcess?.toLowerCase().includes(q);
        const matchesLine = r.line?.toLowerCase().includes(q);
        const matchesTrainer = r.trainerName?.toLowerCase().includes(q);
        return matchesName || matchesId || matchesStyle || matchesProcess || matchesLine || matchesTrainer;
      }

      return true;
    });
  }, [records, selectedYear, selectedLine, searchQuery]);

  // Year statistics
  const yearStats = useMemo(() => {
    const count2025 = records.filter(r => (r as any).year === 2025 || r.certificationDate?.includes('2025')).length;
    const count2026 = records.filter(r => (r as any).year === 2026 || r.certificationDate?.includes('2026') || !(r as any).year).length;
    const certifiedCount = records.filter(r => r.blueLabelStatus === 'Certified').length;
    const completedCount = records.filter(r => r.status === 'Completed').length;
    return { count2025, count2026, certifiedCount, completedCount };
  }, [records]);

  const formattedLastSynced = useMemo(() => {
    if (!lastSynced) return 'Never';
    try {
      const date = new Date(lastSynced);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch {
      return lastSynced;
    }
  }, [lastSynced]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 1. Core Synchronization Status & Action Header */}
      <div className="bg-gradient-to-r from-[#0b172e] via-[#0f244a] to-[#0d1d3a] rounded-2xl border border-blue-800/40 p-5 text-white shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-sm">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold tracking-tight text-white flex items-center gap-2.5">
                  Google Sheets Synchronization Center
                  <span className={`text-[10px] uppercase font-mono px-2.5 py-0.5 rounded-full border ${
                    syncStatus === 'synced'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                      : syncStatus === 'syncing'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-400/40 animate-pulse'
                      : 'bg-red-500/20 text-red-300 border-red-400/40'
                  }`}>
                    {syncStatus === 'synced' ? 'Connected & Synchronized' : syncStatus === 'syncing' ? 'Syncing...' : 'Sync Warning'}
                  </span>
                </h3>
                <p className="text-xs text-slate-300">
                  Google Sheet is the authoritative data source for the Stitching Training Plan. Updates in the sheet propagate reliably to the system.
                </p>
              </div>
            </div>
          </div>

          {/* Core Status Metrics & Manual Sync Trigger */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Sync Metadata Cards */}
            <div className="flex items-center gap-2 bg-slate-900/80 px-3.5 py-2 rounded-xl border border-slate-700/80 text-xs">
              <Clock className="w-4 h-4 text-blue-400" />
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 uppercase font-mono leading-none">Last Synced</span>
                <span className="font-semibold text-white font-mono text-xs mt-0.5" id="metric-last-synced">
                  {formattedLastSynced}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-900/80 px-3.5 py-2 rounded-xl border border-slate-700/80 text-xs">
              <Database className="w-4 h-4 text-emerald-400" />
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 uppercase font-mono leading-none">Records Synced</span>
                <span className="font-semibold text-emerald-300 font-mono text-xs mt-0.5" id="metric-records-synced">
                  {recordsSyncedCount} Records
                </span>
              </div>
            </div>

            {/* Manual Sync Button */}
            <button
              onClick={onTriggerSync}
              disabled={isSyncing}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer ${
                isSyncing 
                  ? 'bg-amber-500/50 text-slate-900 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 hover:shadow-amber-500/25 active:scale-95'
              }`}
              id="btn-sync-google-sheet-manual"
              title="Click for manual backup synchronization"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'SYNCING...' : 'SYNC GOOGLE SHEET'}</span>
            </button>
          </div>
        </div>

        {/* Safeguard Assurance Banner */}
        <div className="mt-4 pt-3.5 border-t border-blue-900/40 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span><strong>Data Protection Active:</strong> System never automatically deletes records.</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <span><strong>Intact Archives:</strong> 2025 ({yearStats.count2025}) & 2026 ({yearStats.count2026}) data preserved.</span>
          </div>
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span><strong>Persistent Storage:</strong> Backed by Cloud Firestore & Server Database.</span>
          </div>
        </div>
      </div>

      {/* 2. Connected Google Sheet URL Configuration & Auto-Sync Settings */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h4 className="font-bold text-sm text-slate-800 dark:text-white">
              Google Sheet Connection & Source Settings
            </h4>
          </div>
          <button
            type="button"
            onClick={() => setShowScriptModal(true)}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Google Apps Script Real-Time Setup</span>
          </button>
        </div>

        <form onSubmit={handleSaveConfig} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-6 space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Google Sheet Document URL / Share Link
            </label>
            <input
              type="url"
              value={config.sheetUrl}
              onChange={e => setConfig({ ...config, sheetUrl: e.target.value })}
              placeholder="https://docs.google.com/spreadsheets/d/your-sheet-id/edit"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          <div className="md:col-span-3 space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Worksheet / Tab Name
            </label>
            <input
              type="text"
              value={config.sheetName}
              onChange={e => setConfig({ ...config, sheetName: e.target.value })}
              placeholder="Stitching Training Plan"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="md:col-span-3 flex items-center gap-2">
            <button
              type="submit"
              disabled={isSavingConfig}
              className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSavingConfig ? 'Saving...' : 'Save & Connect'}</span>
            </button>
            <a
              href={config.sheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
              title="Open Google Sheet in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </form>
      </div>

      {/* 3. Live Google Sheet Records Management & Interactive Test Simulator */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
              Synchronized Training Plan Records
              <span className="text-xs font-normal text-slate-500 font-mono">
                ({filteredRecords.length} of {records.length})
              </span>
            </h4>

            {/* Year Filter Buttons (2025 / 2026 Data Protection) */}
            <div className="flex items-center bg-slate-200 dark:bg-slate-800 p-0.5 rounded-lg text-xs ml-2">
              <button
                type="button"
                onClick={() => setSelectedYear('All')}
                className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                  selectedYear === 'All' 
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-xs' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                All Years ({records.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedYear('2025')}
                className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                  selectedYear === '2025' 
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-xs' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                2025 Data ({yearStats.count2025})
              </button>
              <button
                type="button"
                onClick={() => setSelectedYear('2026')}
                className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                  selectedYear === '2026' 
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-xs' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                2026 Data ({yearStats.count2026})
              </button>
            </div>
          </div>

          {/* Action and Filter Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search trainee, ID, line..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-44"
              />
            </div>

            {/* Line Filter */}
            <select
              value={selectedLine}
              onChange={e => setSelectedLine(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
            >
              <option value="All">All Lines / Groups</option>
              {distinctLines.map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>

            {/* Add Record to Google Sheet Button (for immediate testing & production insertion) */}
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              id="btn-add-sheet-record"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Record to Google Sheet</span>
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto max-h-[550px]">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 sticky top-0 z-10 text-[11px] uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-2.5 px-3">ID</th>
                <th className="py-2.5 px-3">Trainee Name</th>
                <th className="py-2.5 px-3">Line / Dept</th>
                <th className="py-2.5 px-3">Style</th>
                <th className="py-2.5 px-3">Process</th>
                <th className="py-2.5 px-3 text-center">Target Takt</th>
                <th className="py-2.5 px-3 text-center">Actual Takt</th>
                <th className="py-2.5 px-3 text-center">Imp %</th>
                <th className="py-2.5 px-3">Blue Label</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-center">Target/hr</th>
                <th className="py-2.5 px-3 text-center">Actual/hr</th>
                <th className="py-2.5 px-3">Cert Date</th>
                <th className="py-2.5 px-3 text-center">Year</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={15} className="py-8 text-center text-slate-400">
                    No matching records found in Stitching Training Plan.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec, idx) => {
                  const recYear = (rec as any).year || (rec.certificationDate?.includes('2025') ? 2025 : 2026);
                  return (
                    <tr 
                      key={rec.id || `rec-${idx}`}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors group"
                      id={`row-${rec.id}`}
                    >
                      <td className="py-2 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {rec.id}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">
                        {rec.traineeName}
                      </td>
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-400">
                        {rec.line}
                      </td>
                      <td className="py-2 px-3 text-slate-700 dark:text-slate-300 truncate max-w-[150px]">
                        {rec.style}
                      </td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 text-[10px]">
                          {rec.trainingProcess}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center font-mono">
                        {rec.targetTaktTime}s
                      </td>
                      <td className="py-2 px-3 text-center font-mono font-medium">
                        {rec.actualTaktTime}s
                      </td>
                      <td className={`py-2 px-3 text-center font-mono font-semibold ${
                        rec.improvementPercentage >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {rec.improvementPercentage > 0 ? `+${rec.improvementPercentage}%` : `${rec.improvementPercentage}%`}
                      </td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          rec.blueLabelStatus === 'Certified'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : rec.blueLabelStatus === 'Candidate'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {rec.blueLabelStatus}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          rec.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : rec.status === 'In Progress'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          {rec.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center font-mono">
                        {rec.outputTarget}
                      </td>
                      <td className="py-2 px-3 text-center font-mono font-semibold text-slate-900 dark:text-white">
                        {rec.outputActual}
                      </td>
                      <td className="py-2 px-3 text-slate-500 font-mono text-[10px]">
                        {rec.certificationDate || '—'}
                      </td>
                      <td className="py-2 px-3 text-center font-mono text-xs font-bold text-slate-600 dark:text-slate-400">
                        {recYear}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button
                          onClick={() => handleOpenEdit(rec)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 font-semibold text-[11px] flex items-center gap-1 ml-auto cursor-pointer transition"
                          title="Edit row in Google Sheet"
                          id={`btn-edit-${rec.id}`}
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit Sheet</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: ADD RECORD TO GOOGLE SHEET */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 w-full max-w-xl shadow-2xl animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <Plus className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Add New Record to Google Sheet
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddRecordSubmit} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Trainee Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Santos, Maria Dela Cruz"
                    value={newRecordForm.traineeName || ''}
                    onChange={e => setNewRecordForm({ ...newRecordForm, traineeName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                    id="input-new-trainee-name"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Line / Department
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Stitching Line A8"
                    value={newRecordForm.line || ''}
                    onChange={e => setNewRecordForm({ ...newRecordForm, line: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Style Name
                  </label>
                  <input
                    type="text"
                    value={newRecordForm.style || ''}
                    onChange={e => setNewRecordForm({ ...newRecordForm, style: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Training Process
                  </label>
                  <select
                    value={newRecordForm.trainingProcess || 'Sewing'}
                    onChange={e => setNewRecordForm({ ...newRecordForm, trainingProcess: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="Sewing">Sewing</option>
                    <option value="Overlock">Overlock</option>
                    <option value="Join / Attach">Join / Attach</option>
                    <option value="Topstitch">Topstitch</option>
                    <option value="Back Pocket">Back Pocket</option>
                    <option value="Hemming">Hemming</option>
                    <option value="Sole Bonding">Sole Bonding</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Target Takt Time (s)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={newRecordForm.targetTaktTime || 12}
                    onChange={e => setNewRecordForm({ ...newRecordForm, targetTaktTime: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Actual Takt Time (s)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={newRecordForm.actualTaktTime || 11.5}
                    onChange={e => setNewRecordForm({ ...newRecordForm, actualTaktTime: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Blue Label Status
                  </label>
                  <select
                    value={newRecordForm.blueLabelStatus || 'Candidate'}
                    onChange={e => setNewRecordForm({ ...newRecordForm, blueLabelStatus: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="Candidate">Candidate</option>
                    <option value="Certified">Certified</option>
                    <option value="None">None</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Training Status
                  </label>
                  <select
                    value={newRecordForm.status || 'In Progress'}
                    onChange={e => setNewRecordForm({ ...newRecordForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Under Observation">Under Observation</option>
                    <option value="Initial Stage">Initial Stage</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Training Year
                  </label>
                  <select
                    value={(newRecordForm as any).year || 2026}
                    onChange={e => setNewRecordForm({ ...newRecordForm, year: Number(e.target.value) } as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  >
                    <option value={2026}>2026 Training Plan</option>
                    <option value={2025}>2025 Training Plan</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Trainer Name
                  </label>
                  <input
                    type="text"
                    value={newRecordForm.trainerName || 'Mary Jane'}
                    onChange={e => setNewRecordForm({ ...newRecordForm, trainerName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer shadow-md transition"
                  id="btn-submit-add-sheet-record"
                >
                  Add to Google Sheet & Sync
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT RECORD IN GOOGLE SHEET */}
      {isEditModalOpen && editingRecord && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 w-full max-w-xl shadow-2xl animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <Edit3 className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Edit Record in Google Sheet ({editingRecord.id})
                </h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditRecordSubmit} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Trainee Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editingRecord.traineeName || ''}
                    onChange={e => setEditingRecord({ ...editingRecord, traineeName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                    id="input-edit-trainee-name"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Line / Department
                  </label>
                  <input
                    type="text"
                    value={editingRecord.line || ''}
                    onChange={e => setEditingRecord({ ...editingRecord, line: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Training Status
                  </label>
                  <select
                    value={editingRecord.status || 'In Progress'}
                    onChange={e => setEditingRecord({ ...editingRecord, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                    id="select-edit-status"
                  >
                    <option value="Completed">Completed</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Under Observation">Under Observation</option>
                    <option value="Initial Stage">Initial Stage</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Blue Label Status
                  </label>
                  <select
                    value={editingRecord.blueLabelStatus || 'Candidate'}
                    onChange={e => setEditingRecord({ ...editingRecord, blueLabelStatus: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                    id="select-edit-blue-label"
                  >
                    <option value="Certified">Certified</option>
                    <option value="Candidate">Candidate</option>
                    <option value="None">None</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Actual Output / Hour
                  </label>
                  <input
                    type="number"
                    value={editingRecord.outputActual || 0}
                    onChange={e => setEditingRecord({ ...editingRecord, outputActual: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                    id="input-edit-output-actual"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Actual Takt Time (s)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingRecord.actualTaktTime || 0}
                    onChange={e => setEditingRecord({ ...editingRecord, actualTaktTime: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                    id="input-edit-actual-takt"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Certification Date
                  </label>
                  <input
                    type="date"
                    value={editingRecord.certificationDate || ''}
                    onChange={e => setEditingRecord({ ...editingRecord, certificationDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Training Year
                  </label>
                  <select
                    value={(editingRecord as any).year || 2026}
                    onChange={e => setEditingRecord({ ...editingRecord, year: Number(e.target.value) } as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  >
                    <option value={2026}>2026</option>
                    <option value={2025}>2025</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer shadow-md transition"
                  id="btn-submit-edit-sheet-record"
                >
                  Save Google Sheet & Synchronize
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: GOOGLE APPS SCRIPT SNIPPET FOR REAL-TIME SHEET TRIGGERS */}
      {showScriptModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 w-full max-w-2xl shadow-2xl animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <Code2 className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Real-Time Google Apps Script Webhook Setup
                </h3>
              </div>
              <button
                onClick={() => setShowScriptModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <p>
                To enable <strong>instant real-time synchronization</strong> whenever you edit cells inside your Google Sheet:
              </p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>In your Google Sheet, click <strong>Extensions &gt; Apps Script</strong>.</li>
                <li>Paste the script below into the editor.</li>
                <li>Save and click <strong>Triggers (alarm icon) &gt; Add Trigger &gt; onEdit or onChange</strong>.</li>
              </ol>

              <pre className="p-3 bg-slate-950 text-emerald-400 rounded-xl font-mono text-[11px] overflow-x-auto select-all border border-slate-800 max-h-56">
{`function onEdit(e) {
  var webhookUrl = "${window.location.origin}/api/stitching/webhook";
  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({
      timestamp: new Date().toISOString(),
      event: "sheet_edited",
      sheetName: e ? e.source.getActiveSheet().getName() : "Stitching Training Plan"
    }),
    muteHttpExceptions: true
  };
  UrlFetchApp.fetch(webhookUrl, options);
}`}
              </pre>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`function onEdit(e) {
  var webhookUrl = "${window.location.origin}/api/stitching/webhook";
  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({
      timestamp: new Date().toISOString(),
      event: "sheet_edited"
    }),
    muteHttpExceptions: true
  };
  UrlFetchApp.fetch(webhookUrl, options);
}`);
                    addToast('Script Copied', 'Google Apps Script snippet copied to clipboard.', 'success');
                    setShowScriptModal(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer"
                >
                  Copy Script Code
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
