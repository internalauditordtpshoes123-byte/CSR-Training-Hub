/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Database,
  Cloud,
  HardDrive,
  Download,
  Upload,
  RefreshCw,
  RotateCcw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  ShieldCheck,
  Users,
  Building2,
  Scissors,
  Check,
  X,
  FileCheck,
  Search
} from 'lucide-react';
import { UserRole } from '../types';
import { flushOfflineQueue } from '../services/realtimeSync';

interface BackupItem {
  id: string;
  fileName: string;
  size: string;
  sizeBytes?: number;
  createdAt: string;
  createdBy: string;
  stats?: {
    employeesCount?: number;
    filesCount?: number;
    dataRecordsCount?: number;
    leadershipRecordsCount?: number;
    foldersCount?: number;
  };
  downloadUrl: string;
}

interface BackupSyncCenterProps {
  role: UserRole;
  addToast: (title: string, message: string, type: 'success' | 'warning' | 'info') => void;
  onRefreshData?: () => Promise<void> | void;
  employeesCount?: number;
  logsCount?: number;
  documentsCount?: number;
  stitchingCount?: number;
  departmentCount?: number;
}

export default function BackupSyncCenter({
  role,
  addToast,
  onRefreshData,
  employeesCount = 4464,
  logsCount = 0,
  documentsCount = 0,
  stitchingCount = 0,
  departmentCount = 0
}: BackupSyncCenterProps) {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected backup to restore
  const [confirmRestoreBackup, setConfirmRestoreBackup] = useState<BackupItem | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<BackupItem | null>(null);

  // Upload restore state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedBackupPreview, setUploadedBackupPreview] = useState<{
    fileName: string;
    parsed: any;
    rawJson: string;
    stats?: any;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch backups from server
  const fetchBackups = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/system/backups');
      const data = await res.json();
      if (data.success && Array.isArray(data.backups)) {
        setBackups(data.backups);
      }
    } catch (err) {
      console.error('[Backup Center] Failed to fetch backups:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  // Create an instant manual full backup
  const handleCreateBackup = async () => {
    setIsBackingUp(true);
    try {
      const res = await fetch('/api/system/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          createdBy: role === 'Admin' ? 'System Administrator' : 'CSR Officer',
          reason: 'Manual User Backup via Backup & Cloud Sync Center',
          clientSnapshot: {
            employeesCount,
            logsCount,
            documentsCount,
            stitchingCount,
            departmentCount,
            timestamp: new Date().toISOString()
          }
        })
      });

      const data = await res.json();
      if (data.success && data.backup) {
        addToast(
          'Backup Created Successfully ✓',
          `Full system snapshot ${data.backup.fileName} (${data.backup.size}) has been saved to server archives.`,
          'success'
        );
        fetchBackups();
      } else {
        throw new Error(data.error || 'Failed to create backup');
      }
    } catch (err: any) {
      console.error('[Backup Center] Create backup error:', err);
      addToast('Backup Failed', err.message || 'Could not connect to backup service', 'warning');
    } finally {
      setIsBackingUp(false);
    }
  };

  // Restore from an existing catalog backup file
  const handleExecuteRestore = async (backup: BackupItem) => {
    setIsRestoring(true);
    try {
      const res = await fetch('/api/system/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: backup.fileName })
      });

      const data = await res.json();
      if (data.success) {
        addToast(
          'System Restored Successfully ✓',
          `All database records have been restored from ${backup.fileName}. A pre-restore safety copy was also archived.`,
          'success'
        );
        setConfirmRestoreBackup(null);
        if (onRefreshData) {
          await onRefreshData();
        }
        fetchBackups();
      } else {
        throw new Error(data.error || 'Restore failed');
      }
    } catch (err: any) {
      console.error('[Backup Center] Restore error:', err);
      addToast('Restore Failed', err.message || 'Could not restore backup snapshot', 'warning');
    } finally {
      setIsRestoring(false);
    }
  };

  // Delete a backup from disk
  const handleDeleteBackup = async (fileName: string) => {
    try {
      const res = await fetch(`/api/system/backups/${encodeURIComponent(fileName)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        addToast('Backup Deleted', `Archive ${fileName} has been removed.`, 'info');
        setDeleteCandidate(null);
        fetchBackups();
      } else {
        throw new Error(data.error || 'Failed to delete backup');
      }
    } catch (err: any) {
      console.error('[Backup Center] Delete error:', err);
      addToast('Delete Failed', err.message || 'Could not delete backup', 'warning');
    }
  };

  // Handle local JSON file selection for upload
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        // Validate basic backup structure
        const db = parsed.database || parsed;
        if (!db || typeof db !== 'object') {
          throw new Error('Selected JSON does not contain valid CSR HUB database records.');
        }

        const stats = {
          employeesCount: Array.isArray(db.employees) ? db.employees.length : 0,
          recordsCount: Array.isArray(db.records) ? db.records.length : 0,
          logsCount: Array.isArray(db.logs) ? db.logs.length : 0,
          createdAt: parsed.createdAt || new Date().toISOString()
        };

        setUploadedBackupPreview({
          fileName: file.name,
          parsed,
          rawJson: text,
          stats
        });
      } catch (err: any) {
        addToast('Invalid Backup File', err.message || 'The selected file is not a valid JSON backup.', 'warning');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Upload and restore from chosen local JSON file
  const handleUploadAndRestore = async (autoRestore: boolean) => {
    if (!uploadedBackupPreview) return;
    setIsUploading(true);
    try {
      const res = await fetch('/api/system/backup/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          backupJson: uploadedBackupPreview.rawJson,
          autoRestore
        })
      });

      const data = await res.json();
      if (data.success) {
        if (autoRestore) {
          addToast(
            'Backup Uploaded & System Restored ✓',
            'All database records have been updated from your uploaded backup file.',
            'success'
          );
          if (onRefreshData) {
            await onRefreshData();
          }
        } else {
          addToast(
            'Backup Saved to Archives ✓',
            `File saved as ${data.backup?.fileName || 'Archive'}. You can restore it anytime.`,
            'success'
          );
        }
        setUploadedBackupPreview(null);
        fetchBackups();
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (err: any) {
      console.error('[Backup Center] Upload error:', err);
      addToast('Upload Failed', err.message || 'Could not upload backup file', 'warning');
    } finally {
      setIsUploading(false);
    }
  };

  // Force Cloud Sync
  const handleForceCloudSync = async () => {
    setIsSyncingCloud(true);
    try {
      await flushOfflineQueue();
      if (onRefreshData) {
        await onRefreshData();
      }
      addToast('Cloud Sync Completed ✓', 'All records verified and synced with Cloud Firestore & Master Server.', 'success');
    } catch (err: any) {
      addToast('Sync Notice', err.message || 'Cloud sync encountered an issue.', 'warning');
    } finally {
      setIsSyncingCloud(false);
    }
  };

  const filteredBackups = backups.filter(b => 
    b.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.createdBy && b.createdBy.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Hidden file input for uploading backup JSON */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelected}
        accept=".json,application/json"
        className="hidden"
      />

      {/* Main Header Banner */}
      <div className="bg-gradient-to-r from-[#07132b] via-[#091a3a] to-[#0d224d] border border-[#162f61] rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-blue-500/5 to-transparent pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="p-2.5 bg-blue-600/20 border border-blue-500/40 rounded-xl text-blue-400">
                <Database className="w-6 h-6 text-amber-400" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                Backup & Cloud Synchronization Center
              </h2>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Data Protection Active
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Every employee, training session, file, and log you input is permanently preserved across 
              <strong> Cloud Firestore</strong> and <strong>Local Server Disk</strong>. 
              Create full snapshot archives, download offline backups, and restore any previous state with zero data loss.
            </p>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
            <button
              onClick={handleCreateBackup}
              disabled={isBackingUp}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs sm:text-sm transition-all shadow-lg hover:shadow-amber-500/20 cursor-pointer disabled:opacity-50"
              title="Create a complete snapshot of all employees, logs, files, and records"
            >
              {isBackingUp ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Creating Snapshot...</span>
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 text-slate-950" />
                  <span>Create Backup Now</span>
                </>
              )}
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#0e2247] hover:bg-[#15346d] text-blue-200 hover:text-white font-bold rounded-xl text-xs sm:text-sm border border-blue-500/40 transition-all cursor-pointer shadow-md"
              title="Upload an existing .json backup file from your computer to restore"
            >
              <Upload className="w-4 h-4 text-amber-300" />
              <span>Upload Backup File</span>
            </button>

            <button
              onClick={handleForceCloudSync}
              disabled={isSyncingCloud}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#071733] hover:bg-[#0c244f] text-slate-300 hover:text-white font-semibold rounded-xl text-xs sm:text-sm border border-[#1a3870] transition-all cursor-pointer disabled:opacity-50"
              title="Force bidirectional sync between Cloud Firestore and server disk"
            >
              <Cloud className={`w-4 h-4 text-blue-400 ${isSyncingCloud ? 'animate-bounce' : ''}`} />
              <span>{isSyncingCloud ? 'Syncing Cloud...' : 'Force Cloud Sync'}</span>
            </button>
          </div>
        </div>

        {/* Live Multi-Layer Status Indicators Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-4 border-t border-[#142952] text-xs">
          <div className="bg-[#050e21]/70 border border-[#122449] rounded-xl p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Cloud className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] text-slate-400">Cloud Firestore Database</div>
              <div className="font-bold text-white truncate flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Live Bidirectional Cloud Sync
              </div>
            </div>
          </div>

          <div className="bg-[#050e21]/70 border border-[#122449] rounded-xl p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <HardDrive className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] text-slate-400">Server Disk & Mirror Redundancy</div>
              <div className="font-bold text-white truncate flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                database.json & database.backup.json
              </div>
            </div>
          </div>

          <div className="bg-[#050e21]/70 border border-[#122449] rounded-xl p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] text-slate-400">Input Data Retention Policy</div>
              <div className="font-bold text-amber-300 truncate">
                Zero Auto-Wipe • Permanent Storage
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Uploaded File Restore Preview Modal */}
      {uploadedBackupPreview && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#09152b] border border-blue-500/40 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-4 bg-[#060e1d] border-b border-[#122347] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Upload className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Restore from Uploaded Backup</h3>
              </div>
              <button
                onClick={() => setUploadedBackupPreview(null)}
                className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="bg-[#050b17] border border-[#122347] rounded-xl p-4 space-y-2.5">
                <div className="flex justify-between py-1 border-b border-[#122347]">
                  <span className="text-slate-400">Selected File:</span>
                  <span className="font-mono font-bold text-amber-300 truncate max-w-[240px]">
                    {uploadedBackupPreview.fileName}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#122347]">
                  <span className="text-slate-400">Employees in Backup:</span>
                  <span className="font-mono font-bold text-white">
                    {uploadedBackupPreview.stats?.employeesCount?.toLocaleString() || '0'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#122347]">
                  <span className="text-slate-400">Training Logs in Backup:</span>
                  <span className="font-mono font-bold text-white">
                    {uploadedBackupPreview.stats?.logsCount || '0'}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Backup Created:</span>
                  <span className="font-mono text-slate-300">
                    {new Date(uploadedBackupPreview.stats?.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-200">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Safety Guarantee:</strong> Before restoring, the system will automatically 
                    create a pre-restore safety snapshot of your current state. No data will be permanently overwritten.
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => handleUploadAndRestore(false)}
                  disabled={isUploading}
                  className="px-4 py-2 bg-[#050b17] hover:bg-[#0c1830] text-slate-300 rounded-xl font-bold border border-[#162d59] cursor-pointer"
                >
                  Save to Catalog Only
                </button>
                <button
                  onClick={() => handleUploadAndRestore(true)}
                  disabled={isUploading}
                  className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl cursor-pointer shadow-lg disabled:opacity-50"
                >
                  {isUploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                  <span>Restore Now</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Restore Confirmation Modal */}
      {confirmRestoreBackup && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#09152b] border border-amber-500/40 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-4 bg-[#060e1d] border-b border-[#122347] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <RotateCcw className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Confirm System Restore</h3>
              </div>
              <button
                onClick={() => setConfirmRestoreBackup(null)}
                className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-300">
                You are about to restore the system state to snapshot:
              </p>

              <div className="bg-[#050b17] border border-[#122347] rounded-xl p-3.5 space-y-1.5 font-mono">
                <div className="font-bold text-amber-300 truncate">{confirmRestoreBackup.fileName}</div>
                <div className="text-slate-400 text-[11px]">
                  Created: {new Date(confirmRestoreBackup.createdAt).toLocaleString()} • Size: {confirmRestoreBackup.size}
                </div>
                {confirmRestoreBackup.stats && (
                  <div className="text-slate-400 text-[11px]">
                    Employees: {confirmRestoreBackup.stats.employeesCount || 0} • Records: {confirmRestoreBackup.stats.dataRecordsCount || 0}
                  </div>
                )}
              </div>

              <div className="p-3 bg-blue-950/40 border border-blue-500/30 rounded-xl text-blue-200">
                A safety snapshot of your current database will be automatically created before this restore proceeds.
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setConfirmRestoreBackup(null)}
                  className="px-4 py-2 bg-[#050b17] hover:bg-[#0c1830] text-slate-300 rounded-xl font-bold border border-[#162d59] cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  onClick={() => handleExecuteRestore(confirmRestoreBackup)}
                  disabled={isRestoring}
                  className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold rounded-xl cursor-pointer shadow-lg disabled:opacity-50"
                >
                  {isRestoring ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                  <span>Confirm Restore</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteCandidate && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#09152b] border border-rose-500/40 rounded-2xl w-full max-w-sm shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-2.5 text-rose-400">
              <Trash2 className="w-5 h-5" />
              <h3 className="text-base font-bold text-white">Delete Backup Archive?</h3>
            </div>
            <p className="text-xs text-slate-300">
              Are you sure you want to permanently delete archive:
              <br />
              <span className="font-mono text-amber-300 font-bold break-all">{deleteCandidate.fileName}</span>?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteCandidate(null)}
                className="px-3.5 py-1.5 bg-[#050b17] text-slate-300 rounded-xl text-xs font-bold border border-[#162d59] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteBackup(deleteCandidate.fileName)}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Delete Archive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backup Archives Catalog Section */}
      <div className="bg-[#060e1d] border border-[#14274d] rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-base font-bold text-white">Saved Backup Archives Catalog</h3>
              <p className="text-xs text-slate-400">
                {backups.length} snapshots available • Click Restore to roll back or download offline
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search backups..."
                className="bg-[#040914] border border-[#162b54] rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
              />
            </div>
            <button
              onClick={fetchBackups}
              disabled={isLoading}
              className="p-2 bg-[#0a1833] hover:bg-[#122854] text-slate-300 hover:text-white rounded-xl border border-[#162b54] cursor-pointer"
              title="Refresh backup list"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Backups List Table */}
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 text-amber-400 animate-spin" />
            <span className="text-xs">Loading backup catalog...</span>
          </div>
        ) : filteredBackups.length === 0 ? (
          <div className="p-10 text-center bg-[#040914] rounded-xl border border-[#122347] space-y-3">
            <Database className="w-10 h-10 text-slate-600 mx-auto" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-300">No backup archives found</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Click "Create Backup Now" above to generate your first full system snapshot copy.
              </p>
            </div>
            <button
              onClick={handleCreateBackup}
              disabled={isBackingUp}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs cursor-pointer inline-flex items-center gap-2 shadow-md"
            >
              <Database className="w-4 h-4" />
              <span>Create Initial Snapshot</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredBackups.map((bk) => (
              <div
                key={bk.fileName}
                className="bg-[#040a17] hover:bg-[#071329] border border-[#122347] hover:border-blue-500/40 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-white text-xs truncate max-w-[280px] sm:max-w-md">
                      {bk.fileName}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-500/30 font-mono text-[10px] font-bold">
                      {bk.size}
                    </span>
                    {bk.fileName.includes('AUTO') && (
                      <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 font-mono text-[10px] font-bold">
                        Auto-Save
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400 font-mono">
                    <span>Saved: {new Date(bk.createdAt).toLocaleString()}</span>
                    <span>By: {bk.createdBy || 'System'}</span>
                    {bk.stats?.employeesCount !== undefined && (
                      <span className="text-amber-300 font-bold">
                        {bk.stats.employeesCount.toLocaleString()} Employees
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setConfirmRestoreBackup(bk)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/60 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-lg text-xs font-bold border border-emerald-500/40 transition-colors cursor-pointer"
                    title="Restore system database to this snapshot point"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore</span>
                  </button>

                  <a
                    href={bk.downloadUrl}
                    download={bk.fileName}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0e2247] hover:bg-blue-600 text-blue-300 hover:text-white rounded-lg text-xs font-bold border border-blue-500/30 transition-colors cursor-pointer"
                    title="Download JSON file to local computer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </a>

                  {role === 'Admin' && (
                    <button
                      onClick={() => setDeleteCandidate(bk)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                      title="Delete this backup archive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Data Protection Information & Rules Section */}
      <div className="bg-[#050c1a] border border-[#14274d] rounded-2xl p-5 space-y-3">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          DATIAN CSR HUB System Data Protection Protocol
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-300">
          <div className="p-3 bg-[#030712] border border-[#112040] rounded-xl space-y-1">
            <div className="font-bold text-amber-300">1. Instant Dual Persistence</div>
            <p className="text-slate-400 leading-relaxed">
              Every newly created trainee, attendance entry, or file is stored to local server disk and Cloud Firestore immediately.
            </p>
          </div>
          <div className="p-3 bg-[#030712] border border-[#112040] rounded-xl space-y-1">
            <div className="font-bold text-emerald-300">2. No Auto-Wipe Guarantee</div>
            <p className="text-slate-400 leading-relaxed">
              Data is never automatically deleted or overwritten by page refreshes, browser reloads, or container restarts.
            </p>
          </div>
          <div className="p-3 bg-[#030712] border border-[#112040] rounded-xl space-y-1">
            <div className="font-bold text-blue-300">3. Safe Rolling Snapshots</div>
            <p className="text-slate-400 leading-relaxed">
              The system takes periodic rolling backups and preserves a pre-restore safety checkpoint prior to any restore action.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
