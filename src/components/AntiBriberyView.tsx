/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  ShieldCheck, 
  Search, 
  Upload, 
  Download, 
  Folder, 
  FolderOpen,
  FileSpreadsheet, 
  ArrowLeft, 
  Filter, 
  CheckCircle2, 
  ChevronRight, 
  FileText, 
  RefreshCw, 
  Trash2,
  Table as TableIcon,
  HardDrive,
  Eye,
  SlidersHorizontal,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Database,
  X,
  Plus,
  Calendar,
  Users,
  BarChart3,
  Layers,
  Lock,
  PlusCircle,
  Clock,
  Building2,
  Paperclip,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { UserRole } from '../types';
import { 
  AntiBriberySheetFolder, 
  AntiBriberyWorkbookState, 
  AntiBriberyTrainingRecord,
  AntiBriberyMasterState,
  generateDefaultAntiBriberyWorkbook, 
  generateDefaultAntiBriberyMasterState,
  normalizeAntiBriberyMasterState,
  sanitizeFolderName 
} from '../data/antiBriberyMasterDoc';
import AntiBriberyComplianceChart from './AntiBriberyComplianceChart';
import AntiBriberyRecordModal from './AntiBriberyRecordModal';
import AntiBriberyRecordDetailModal from './AntiBriberyRecordDetailModal';
import { syncEntityToMaster, subscribeToRealtimeSync } from '../services/realtimeSync';

interface AntiBriberyViewProps {
  role: UserRole;
  addToast: (title: string, message: string, type?: 'success' | 'warning' | 'info') => void;
  registerBackHandler?: (handler: () => boolean) => () => void;
}

export default function AntiBriberyView({
  role,
  addToast,
  registerBackHandler
}: AntiBriberyViewProps) {
  // Master State containing isolated 2025 and 2026 data structures
  const [masterState, setMasterState] = useState<AntiBriberyMasterState>(() => {
    try {
      const v4 = localStorage.getItem('csr_hub_antibribery_master_v4');
      if (v4) {
        const parsed = JSON.parse(v4);
        return normalizeAntiBriberyMasterState(parsed);
      }
      const v3 = localStorage.getItem('csr_hub_antibribery_workbook_v3');
      if (v3) {
        const parsed = JSON.parse(v3);
        return normalizeAntiBriberyMasterState(parsed);
      }
    } catch (e) {
      console.warn('Could not load cached anti-bribery master state:', e);
    }
    return generateDefaultAntiBriberyMasterState();
  });

  // Active Year Selection: 2025 vs 2026
  const [activeYear, setActiveYear] = useState<2025 | 2026>(2025);

  // Sub-tab navigation within the selected year
  const [activeTab, setActiveTab] = useState<'sheets' | 'records' | 'analytics' | 'comparison'>('sheets');

  // Active folder selection (null = root folder view for active year)
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // Record modal states
  const [isRecordModalOpen, setIsRecordModalOpen] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<AntiBriberyTrainingRecord | null>(null);
  const [detailRecord, setDetailRecord] = useState<AntiBriberyTrainingRecord | null>(null);

  // Current year data slice
  const currentYearData = useMemo(() => {
    return activeYear === 2025 ? masterState.year2025 : masterState.year2026;
  }, [masterState, activeYear]);

  // Current year workbook
  const currentWorkbook = currentYearData.workbook;

  // Active selected folder object
  const activeFolder = useMemo(() => {
    if (!selectedFolderId) return null;
    return currentWorkbook.folders.find(f => f.id === selectedFolderId) || null;
  }, [selectedFolderId, currentWorkbook.folders]);

  // Handle hardware / global back button
  useEffect(() => {
    if (!registerBackHandler) return;
    const unregister = registerBackHandler(() => {
      if (detailRecord) {
        setDetailRecord(null);
        return true;
      }
      if (isRecordModalOpen) {
        setIsRecordModalOpen(false);
        return true;
      }
      if (selectedFolderId) {
        setSelectedFolderId(null);
        return true;
      }
      if (activeTab !== 'sheets') {
        setActiveTab('sheets');
        return true;
      }
      return false;
    });
    return unregister;
  }, [detailRecord, isRecordModalOpen, selectedFolderId, activeTab, registerBackHandler]);

  const isSyncingFromPeerRef = useRef(false);

  // Subscribe to real-time updates from other PCs
  useEffect(() => {
    const unsubscribe = subscribeToRealtimeSync((event) => {
      if (event.entity === 'antiBriberyWorkbook' && event.data) {
        isSyncingFromPeerRef.current = true;
        const normalized = normalizeAntiBriberyMasterState(event.data);
        setMasterState(normalized);
        try {
          localStorage.setItem('csr_hub_antibribery_master_v4', JSON.stringify(normalized));
          localStorage.setItem('csr_hub_antibribery_workbook_v3', JSON.stringify(normalized));
        } catch {}
        setTimeout(() => {
          isSyncingFromPeerRef.current = false;
        }, 300);
      }
    });
    return () => unsubscribe();
  }, []);

  // Persist master state safely & broadcast to server
  useEffect(() => {
    try {
      // Create compact representation for storage quota safety
      const compactMaster: AntiBriberyMasterState = {
        sourceFileName: masterState.sourceFileName,
        uploadedAt: masterState.uploadedAt,
        totalSheets: masterState.year2025.workbook.folders.length + masterState.year2026.workbook.folders.length,
        totalRows: masterState.year2025.workbook.totalRows + masterState.year2026.workbook.totalRows,
        // Legacy backward compatibility: Top level folders contain 2025 folders
        folders: masterState.year2025.workbook.folders.map(f => ({
          ...f,
          rows: f.rows.slice(0, 500)
        })),
        year2025: {
          year: 2025,
          workbook: {
            ...masterState.year2025.workbook,
            folders: masterState.year2025.workbook.folders.map(f => ({
              ...f,
              rows: f.rows.slice(0, 500)
            }))
          },
          records: masterState.year2025.records,
          files: masterState.year2025.files
        },
        year2026: {
          year: 2026,
          workbook: {
            ...masterState.year2026.workbook,
            folders: masterState.year2026.workbook.folders.map(f => ({
              ...f,
              rows: f.rows.slice(0, 500)
            }))
          },
          records: masterState.year2026.records,
          files: masterState.year2026.files
        }
      };

      localStorage.setItem('csr_hub_antibribery_master_v4', JSON.stringify(compactMaster));
      localStorage.setItem('csr_hub_antibribery_workbook_v3', JSON.stringify(compactMaster));

      if (!isSyncingFromPeerRef.current) {
        syncEntityToMaster('antiBriberyWorkbook', compactMaster);
      }
    } catch (e) {
      console.warn('LocalStorage save skipped for large master state:', e);
    }
  }, [masterState]);

  // Upload Workbook Handler (Saves strictly to activeYear)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const processUploadedFile = (file: File) => {
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv');
    if (!isExcel) {
      addToast('Invalid File Type', 'Please upload an Excel workbook (.xlsx, .xls) or CSV file (.csv).', 'warning');
      return;
    }

    setIsProcessing(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        if (!buffer) {
          throw new Error('Could not read file buffer.');
        }

        // Read entire workbook with all sheets preserved
        const wb = XLSX.read(buffer, { type: 'array' });
        const sheetNames = wb.SheetNames;

        if (!sheetNames || sheetNames.length === 0) {
          throw new Error('The uploaded file does not contain any readable sheets.');
        }

        const now = new Date().toISOString().split('T')[0];
        const newFolders: AntiBriberySheetFolder[] = [];
        let totalRecordsCount = 0;

        // Iterate through EVERY sheet in the workbook and create a separate folder for each
        sheetNames.forEach((sheetName, index) => {
          const worksheet = wb.Sheets[sheetName];
          if (!worksheet) return;

          // Extract 2D matrix of sheet data
          const rawMatrix: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
          
          if (!rawMatrix || rawMatrix.length === 0) {
            // Empty sheet fallback
            const sanitizedName = sanitizeFolderName(sheetName);
            newFolders.push({
              id: `ab-${activeYear}-sheet-${Date.now()}-${index}-${sanitizedName.toLowerCase()}`,
              name: sanitizedName,
              rawSheetName: sheetName,
              headers: ['Column 1', 'Column 2', 'Column 3'],
              rows: [],
              rowCount: 0,
              colCount: 3,
              uploadedAt: now,
              sourceFileName: file.name,
              category: 'Excel Sheet',
              description: `Empty sheet "${sheetName}" from uploaded workbook ${file.name} (${activeYear}).`,
              year: activeYear
            });
            return;
          }

          // Locate header row (first non-empty row or row 0)
          let headerRowIndex = 0;
          for (let r = 0; r < Math.min(rawMatrix.length, 5); r++) {
            const row = rawMatrix[r];
            if (row && row.some(cell => String(cell).trim().length > 0)) {
              headerRowIndex = r;
              break;
            }
          }

          const rawHeaders = rawMatrix[headerRowIndex] || [];
          const headers: string[] = rawHeaders.map((h, colIdx) => {
            const str = String(h || '').trim();
            return str.length > 0 ? str : `Column ${colIdx + 1}`;
          });

          // All data rows following the header
          const rawDataRows = rawMatrix.slice(headerRowIndex + 1);
          const dataRows = rawDataRows.filter(row => row && row.some(cell => String(cell).trim().length > 0));

          const sanitizedName = sanitizeFolderName(sheetName);
          totalRecordsCount += dataRows.length;

          newFolders.push({
            id: `ab-${activeYear}-sheet-${Date.now()}-${index}-${sanitizedName.toLowerCase()}`,
            name: sanitizedName,
            rawSheetName: sheetName,
            headers,
            rows: dataRows,
            rowCount: dataRows.length,
            colCount: headers.length,
            uploadedAt: now,
            sourceFileName: file.name,
            category: `Sheet ${index + 1}`,
            description: `Imported sheet "${sheetName}" with ${dataRows.length.toLocaleString()} rows and ${headers.length} columns from ${file.name} (${activeYear}).`,
            year: activeYear
          });
        });

        const newYearWorkbook: AntiBriberyWorkbookState = {
          sourceFileName: file.name,
          uploadedAt: now,
          totalSheets: newFolders.length,
          totalRows: totalRecordsCount,
          folders: newFolders
        };

        // Update strictly the activeYear data slice in masterState
        setMasterState(prev => {
          if (activeYear === 2025) {
            return {
              ...prev,
              sourceFileName: file.name,
              uploadedAt: now,
              year2025: {
                ...prev.year2025,
                workbook: newYearWorkbook
              },
              // Keep top level folders updated for legacy
              folders: newFolders
            };
          } else {
            return {
              ...prev,
              year2026: {
                ...prev.year2026,
                workbook: newYearWorkbook
              }
            };
          }
        });

        setSelectedFolderId(null);
        setIsProcessing(false);

        addToast(
          `${activeYear} Workbook Uploaded Successfully`,
          `Created ${newFolders.length} separate sheet folders under Anti-Bribery ${activeYear} from "${file.name}" with ${totalRecordsCount.toLocaleString()} records.`,
          'success'
        );
      } catch (err: any) {
        console.error('Error processing workbook:', err);
        setIsProcessing(false);
        addToast('Upload Error', err?.message || 'Failed to parse Excel workbook sheets.', 'warning');
      }
    };

    reader.onerror = () => {
      setIsProcessing(false);
      addToast('File Read Error', 'Unable to read file from disk.', 'warning');
    };

    reader.readAsArrayBuffer(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
    if (e.target) e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  // Reset to default data source (2025 only)
  const handleResetToDefault = () => {
    if (window.confirm('Reset Anti-Bribery 2025 module to the official default 9-sheet master roster structure? (2026 will not be touched)')) {
      const defaultState = generateDefaultAntiBriberyWorkbook();
      setMasterState(prev => ({
        ...prev,
        sourceFileName: defaultState.sourceFileName,
        uploadedAt: defaultState.uploadedAt,
        folders: defaultState.folders,
        year2025: {
          ...prev.year2025,
          workbook: defaultState
        }
      }));
      setSelectedFolderId(null);
      addToast('Reset Complete', 'Anti-Bribery 2025 reset to official 9-sheet master roster structure.', 'info');
    }
  };

  // Save Training Record (from modal)
  const handleSaveRecord = (record: AntiBriberyTrainingRecord) => {
    setMasterState(prev => {
      const targetYearKey = record.year === 2026 ? 'year2026' : 'year2025';
      const existingList = prev[targetYearKey].records;
      const index = existingList.findIndex(r => r.id === record.id);

      let updatedRecords: AntiBriberyTrainingRecord[];
      if (index >= 0) {
        updatedRecords = [...existingList];
        updatedRecords[index] = record;
      } else {
        updatedRecords = [record, ...existingList];
      }

      return {
        ...prev,
        [targetYearKey]: {
          ...prev[targetYearKey],
          records: updatedRecords
        }
      };
    });

    addToast(
      'Training Record Saved',
      `Record ${record.id} successfully saved under Anti-Bribery ${record.year}.`,
      'success'
    );
  };

  // Delete Training Record
  const handleDeleteRecord = (recordId: string, recordYear: number) => {
    setMasterState(prev => {
      const targetYearKey = recordYear === 2026 ? 'year2026' : 'year2025';
      return {
        ...prev,
        [targetYearKey]: {
          ...prev[targetYearKey],
          records: prev[targetYearKey].records.filter(r => r.id !== recordId)
        }
      };
    });

    addToast('Record Deleted', `Training session ${recordId} removed from ${recordYear}.`, 'info');
  };

  // Export current folder sheet as Excel
  const handleExportSheetExcel = (folder: AntiBriberySheetFolder) => {
    try {
      const wb = XLSX.utils.book_new();
      const aoaData = [folder.headers, ...folder.rows];
      const ws = XLSX.utils.aoa_to_sheet(aoaData);
      XLSX.utils.book_append_sheet(wb, ws, folder.name.substring(0, 31));
      XLSX.writeFile(wb, `${folder.name}_${activeYear}_Records.xlsx`);
      addToast('Export Successful', `Exported sheet "${folder.name}" to Excel.`, 'success');
    } catch (e) {
      console.error('Export error:', e);
      addToast('Export Failed', 'Could not generate Excel file.', 'warning');
    }
  };

  // Export current folder sheet as CSV
  const handleExportSheetCSV = (folder: AntiBriberySheetFolder) => {
    try {
      const headerLine = folder.headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(',');
      const rowLines = folder.rows.map(row => 
        row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
      );
      const csv = [headerLine, ...rowLines].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${folder.name}_${activeYear}_Records.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast('CSV Exported', `Downloaded "${folder.name}.csv".`, 'success');
    } catch (e) {
      console.error('CSV Export error:', e);
    }
  };

  // Export entire multi-sheet workbook for activeYear
  const handleExportAllWorkbook = () => {
    try {
      if (currentWorkbook.folders.length === 0) {
        addToast('No Sheets to Export', `Anti-Bribery ${activeYear} has no spreadsheet folders yet.`, 'info');
        return;
      }
      const wb = XLSX.utils.book_new();
      currentWorkbook.folders.forEach(folder => {
        const aoaData = [folder.headers, ...folder.rows];
        const ws = XLSX.utils.aoa_to_sheet(aoaData);
        const safeSheetName = folder.name.substring(0, 31);
        XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
      });
      XLSX.writeFile(wb, `DATIAN_Anti_Bribery_${activeYear}_All_Sheets.xlsx`);
      addToast('Workbook Exported', `Exported all ${currentWorkbook.folders.length} sheets in ${activeYear} workbook.`, 'success');
    } catch (e) {
      console.error('Workbook export error:', e);
      addToast('Export Error', 'Failed to export complete workbook.', 'warning');
    }
  };

  // Root folder search query
  const [folderSearchQuery, setFolderSearchQuery] = useState<string>('');

  const filteredFolders = useMemo(() => {
    if (!folderSearchQuery.trim()) return currentWorkbook.folders;
    const q = folderSearchQuery.toLowerCase();
    return currentWorkbook.folders.filter(f => 
      f.name.toLowerCase().includes(q) || 
      f.rawSheetName.toLowerCase().includes(q) ||
      f.category.toLowerCase().includes(q) ||
      f.description.toLowerCase().includes(q)
    );
  }, [currentWorkbook.folders, folderSearchQuery]);

  // Inside Folder: Table Search, Filter, Sort & Pagination
  const [tableSearch, setTableSearch] = useState<string>('');
  const [sortColIdx, setSortColIdx] = useState<number | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  // Reset pagination when folder or search changes
  useEffect(() => {
    setCurrentPage(1);
    setTableSearch('');
    setSortColIdx(null);
  }, [selectedFolderId, activeYear]);

  const filteredRows = useMemo(() => {
    if (!activeFolder) return [];
    let list = activeFolder.rows;

    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase();
      list = list.filter(row => 
        row.some(cell => String(cell ?? '').toLowerCase().includes(q))
      );
    }

    if (sortColIdx !== null) {
      list = [...list].sort((a, b) => {
        const valA = String(a[sortColIdx] ?? '');
        const valB = String(b[sortColIdx] ?? '');
        const cmp = valA.localeCompare(valB, undefined, { numeric: true });
        return sortDirection === 'asc' ? cmp : -cmp;
      });
    }

    return list;
  }, [activeFolder, tableSearch, sortColIdx, sortDirection]);

  const totalPages = Math.ceil(filteredRows.length / (pageSize === -1 ? filteredRows.length || 1 : pageSize)) || 1;
  const paginatedRows = useMemo(() => {
    if (pageSize === -1) return filteredRows;
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  const handleSort = (idx: number) => {
    if (sortColIdx === idx) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortColIdx(null);
        setSortDirection('asc');
      }
    } else {
      setSortColIdx(idx);
      setSortDirection('asc');
    }
  };

  // Search filter for Records tab
  const [recordsSearchQuery, setRecordsSearchQuery] = useState<string>('');
  const filteredRecords = useMemo(() => {
    const list = currentYearData.records;
    if (!recordsSearchQuery.trim()) return list;
    const q = recordsSearchQuery.toLowerCase();
    return list.filter(r => 
      r.id.toLowerCase().includes(q) ||
      r.topic.toLowerCase().includes(q) ||
      r.department.toLowerCase().includes(q) ||
      r.trainer.toLowerCase().includes(q) ||
      r.status.toLowerCase().includes(q)
    );
  }, [currentYearData.records, recordsSearchQuery]);

  // Compute stats for Comparative tab
  const stats2025 = useMemo(() => {
    const totalRecords = masterState.year2025.records.length;
    const totalSheets = masterState.year2025.workbook.folders.length;
    const totalRows = masterState.year2025.workbook.totalRows;
    const verifiedAtt = masterState.year2025.workbook.folders.reduce(
      (sum, f) => sum + (f.rawSheetName === 'Master Attendance Roster' ? f.rowCount : 0), 
      0
    ) || 4358;
    return { totalRecords, totalSheets, totalRows, verifiedAtt, passPct: 99.98 };
  }, [masterState.year2025]);

  const stats2026 = useMemo(() => {
    const totalRecords = masterState.year2026.records.length;
    const totalSheets = masterState.year2026.workbook.folders.length;
    const totalRows = masterState.year2026.workbook.totalRows;
    const totalTarget = masterState.year2026.records.reduce((sum, r) => sum + (r.targetEmployees || 0), 0);
    const totalAtt = masterState.year2026.records.reduce((sum, r) => sum + (r.attendeesCount || 0), 0);
    const passPct = totalTarget > 0 ? Math.round((totalAtt / totalTarget) * 1000) / 10 : 0;
    return { totalRecords, totalSheets, totalRows, totalTarget, totalAtt, passPct };
  }, [masterState.year2026]);

  return (
    <div className="space-y-6">
      {/* Hidden File Input for Excel/CSV Workbooks */}
      <input 
        type="file" 
        ref={fileInputRef} 
        accept=".xlsx, .xls, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv" 
        onChange={handleFileChange} 
        className="hidden" 
      />

      {/* Main Module Header & Navigation */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            {/* Breadcrumb path */}
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <button 
                onClick={() => {
                  setSelectedFolderId(null);
                  setActiveTab('sheets');
                }}
                className={`hover:text-amber-400 transition flex items-center gap-1 cursor-pointer ${!selectedFolderId ? 'text-amber-400 font-bold' : ''}`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Anti-Bribery Training</span>
              </button>

              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              <button
                onClick={() => setSelectedFolderId(null)}
                className={`hover:text-amber-400 transition flex items-center gap-1 font-bold ${!selectedFolderId ? 'text-amber-300' : 'text-slate-300'}`}
              >
                <Folder className="w-3.5 h-3.5 text-amber-400" />
                <span>Folder {activeYear}</span>
              </button>
              
              {activeFolder && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                  <span className="text-amber-300 font-semibold flex items-center gap-1">
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>{activeFolder.name}</span>
                  </span>
                </>
              )}
            </div>

            {/* Title & Description */}
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 rounded-xl text-amber-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
                  <span>Anti-Bribery & Compliance Repository</span>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Active: {activeYear}
                  </span>
                </h1>
                <p className="text-xs text-slate-400">
                  {selectedFolderId 
                    ? `Sheet folder "${activeFolder?.name}" in ${activeYear} structure (${activeFolder?.rowCount.toLocaleString()} records)`
                    : `Year-based anti-bribery management with isolated 2025 baseline and 2026 operational records.`}
                </p>
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Year Switcher Buttons */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setActiveYear(2025);
                  setSelectedFolderId(null);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                  activeYear === 2025
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Folder className="w-3.5 h-3.5" />
                <span>2025</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeYear === 2025 ? 'bg-slate-950/20 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'}`}>
                  4.3k
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveYear(2026);
                  setSelectedFolderId(null);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                  activeYear === 2026
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Folder className="w-3.5 h-3.5" />
                <span>2026</span>
                {masterState.year2026.records.length > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeYear === 2026 ? 'bg-slate-950/20 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'}`}>
                    {masterState.year2026.records.length}
                  </span>
                )}
              </button>
            </div>

            {/* + Add Training Record button */}
            <button
              type="button"
              onClick={() => {
                setEditingRecord(null);
                setIsRecordModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold rounded-xl transition shadow-md cursor-pointer active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Add {activeYear} Training Record</span>
            </button>

            {/* Export or Upload in Active Year */}
            {selectedFolderId ? (
              <>
                <button
                  type="button"
                  onClick={() => setSelectedFolderId(null)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to {activeYear} Folders</span>
                </button>

                {activeFolder && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleExportSheetExcel(activeFolder)}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 text-xs font-semibold rounded-xl transition cursor-pointer"
                      title="Export this sheet to Excel"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>Export Sheet (.xlsx)</span>
                    </button>
                  </>
                )}
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleExportAllWorkbook}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
                  title="Export all sheets combined in one Excel workbook"
                >
                  <Download className="w-4 h-4 text-amber-400" />
                  <span>Export {activeYear} Workbook</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
                  title={`Upload Excel workbook to ${activeYear}`}
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Upload {activeYear} Excel</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Navigation Tabs Bar inside Active Year */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-800/80 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setActiveTab('sheets');
              setSelectedFolderId(null);
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'sheets'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Folder className="w-4 h-4" />
            <span>Sheet Folders ({currentWorkbook.folders.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('records');
              setSelectedFolderId(null);
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'records'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            <span>{activeYear} Training Sessions ({currentYearData.records.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('analytics');
              setSelectedFolderId(null);
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>{activeYear} Compliance Analytics</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('comparison');
              setSelectedFolderId(null);
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'comparison'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Comparative Audit (2025 vs 2026)</span>
          </button>
        </div>
      </div>

      {/* TWO SEPARATE YEAR ROOT FOLDER CARDS (When at root overview) */}
      {!selectedFolderId && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 2025 Folder Card */}
          <div
            onClick={() => {
              setActiveYear(2025);
              setSelectedFolderId(null);
            }}
            className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
              activeYear === 2025 
                ? 'bg-slate-900 border-amber-500/60 shadow-md ring-1 ring-amber-500/30' 
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
                  <Folder className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-100">2025 Anti-Bribery Folder</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-emerald-950 text-emerald-400 border border-emerald-800">
                      Official Master Archive
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Subic Bay Freeport Zone verified master anti-bribery attendance registry.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-slate-500">Sheets: </span>
                  <span className="text-amber-400 font-bold">{masterState.year2025.workbook.folders.length}</span>
                </div>
                <div>
                  <span className="text-slate-500">Records: </span>
                  <span className="text-emerald-400 font-bold">{masterState.year2025.workbook.totalRows.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-500">Compliance: </span>
                  <span className="text-blue-400 font-bold">99.98%</span>
                </div>
              </div>

              <span className={`text-xs font-bold flex items-center gap-1 ${activeYear === 2025 ? 'text-amber-400' : 'text-slate-500'}`}>
                <span>{activeYear === 2025 ? 'Currently Selected' : 'Select Folder'}</span>
                <ChevronRight className="w-4 h-4" />
              </span>
            </div>
          </div>

          {/* 2026 Folder Card */}
          <div
            onClick={() => {
              setActiveYear(2026);
              setSelectedFolderId(null);
            }}
            className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
              activeYear === 2026 
                ? 'bg-slate-900 border-amber-500/60 shadow-md ring-1 ring-amber-500/30' 
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
                  <Folder className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-100">2026 Anti-Bribery Folder</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-blue-950 text-blue-400 border border-blue-800">
                      Operational Year
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Operational training registry and live session logging for 2026.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-slate-500">Sessions: </span>
                  <span className="text-amber-400 font-bold">{masterState.year2026.records.length}</span>
                </div>
                <div>
                  <span className="text-slate-500">Sheets: </span>
                  <span className="text-emerald-400 font-bold">{masterState.year2026.workbook.folders.length}</span>
                </div>
                <div>
                  <span className="text-slate-500">Status: </span>
                  <span className="text-blue-400 font-bold">
                    {masterState.year2026.records.length > 0 ? 'Active Records' : 'Ready for Records'}
                  </span>
                </div>
              </div>

              <span className={`text-xs font-bold flex items-center gap-1 ${activeYear === 2026 ? 'text-amber-400' : 'text-slate-500'}`}>
                <span>{activeYear === 2026 ? 'Currently Selected' : 'Select Folder'}</span>
                <ChevronRight className="w-4 h-4" />
              </span>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: COMPARATIVE AUDIT (2025 vs 2026) */}
      {activeTab === 'comparison' && !selectedFolderId && (
        <div className="space-y-6">
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-amber-400" />
                  <span>Comparative Anti-Bribery Compliance Audit (2025 vs 2026)</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Side-by-side audit of factory personnel training, certification rates, and operational coverage.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Independent Year Structures
              </span>
            </div>

            {/* Comparison Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 2025 Column */}
              <div className="p-5 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="font-bold text-amber-400 font-mono text-sm">2025 Master Baseline</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                    Certified & Audited
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                  <div className="p-3 bg-slate-900 rounded-xl">
                    <div className="text-slate-500 text-[10px]">TOTAL HEADCOUNT</div>
                    <div className="text-lg font-bold text-slate-100 mt-0.5">4,358</div>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-xl">
                    <div className="text-slate-500 text-[10px]">VERIFIED ATTENDEES</div>
                    <div className="text-lg font-bold text-emerald-400 mt-0.5">4,357</div>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-xl">
                    <div className="text-slate-500 text-[10px]">COMPLIANCE RATE</div>
                    <div className="text-lg font-bold text-blue-400 mt-0.5">99.98%</div>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-xl">
                    <div className="text-slate-500 text-[10px]">SHEET FOLDERS</div>
                    <div className="text-lg font-bold text-amber-400 mt-0.5">{stats2025.totalSheets}</div>
                  </div>
                </div>

                <div className="text-xs text-slate-400 leading-relaxed p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  Verified corporate compliance report covering all 27 operational units at Subic Bay Freeport Zone.
                </div>
              </div>

              {/* 2026 Column */}
              <div className="p-5 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="font-bold text-blue-400 font-mono text-sm">2026 Operational Year</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800">
                    Active Logging
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                  <div className="p-3 bg-slate-900 rounded-xl">
                    <div className="text-slate-500 text-[10px]">TRAINING SESSIONS</div>
                    <div className="text-lg font-bold text-slate-100 mt-0.5">{stats2026.totalRecords}</div>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-xl">
                    <div className="text-slate-500 text-[10px]">LOGGED ATTENDEES</div>
                    <div className="text-lg font-bold text-emerald-400 mt-0.5">{stats2026.totalAtt}</div>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-xl">
                    <div className="text-slate-500 text-[10px]">PASS PERCENTAGE</div>
                    <div className="text-lg font-bold text-blue-400 mt-0.5">
                      {stats2026.totalTarget > 0 ? `${stats2026.passPct}%` : 'N/A'}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-xl">
                    <div className="text-slate-500 text-[10px]">SHEET FOLDERS</div>
                    <div className="text-lg font-bold text-amber-400 mt-0.5">{stats2026.totalSheets}</div>
                  </div>
                </div>

                <div className="text-xs text-slate-400 leading-relaxed p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  {stats2026.totalRecords > 0
                    ? `Currently tracking ${stats2026.totalRecords} anti-bribery sessions conducted in 2026.`
                    : 'No 2026 sessions conducted yet. Use the "+ Add 2026 Training Record" button to start logging.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: COMPLIANCE ANALYTICS TAB */}
      {activeTab === 'analytics' && !selectedFolderId && (
        <div className="space-y-4">
          <AntiBriberyComplianceChart 
            workbook={currentWorkbook}
            year={activeYear}
            records={currentYearData.records}
            onAddRecord={() => {
              setEditingRecord(null);
              setIsRecordModalOpen(true);
            }}
          />
        </div>
      )}

      {/* VIEW: TRAINING SESSIONS / RECORDS TAB */}
      {activeTab === 'records' && !selectedFolderId && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <span>Anti-Bribery Training Sessions ({activeYear})</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                    {filteredRecords.length} records
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Individual compliance records with date, facilitator, venue, and audit evidence.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search sessions..."
                  value={recordsSearchQuery}
                  onChange={(e) => setRecordsSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingRecord(null);
                  setIsRecordModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Record</span>
              </button>
            </div>
          </div>

          {/* Table of Records */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-950 text-slate-300 font-mono text-[11px] uppercase border-b border-slate-800 select-none">
                  <tr>
                    <th className="py-3 px-3.5 w-32 border-r border-slate-800/80">Record ID</th>
                    <th className="py-3 px-3.5 w-28 border-r border-slate-800/80">Date</th>
                    <th className="py-3 px-3.5 border-r border-slate-800/80">Topic / Module</th>
                    <th className="py-3 px-3.5 border-r border-slate-800/80">Department</th>
                    <th className="py-3 px-3.5 w-28 border-r border-slate-800/80">Attendance</th>
                    <th className="py-3 px-3.5 w-32 border-r border-slate-800/80">Status</th>
                    <th className="py-3 px-3.5 w-24 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {filteredRecords.map((rec) => {
                    const pct = rec.targetEmployees > 0 
                      ? Math.round((rec.attendeesCount / rec.targetEmployees) * 1000) / 10 
                      : 100;
                    return (
                      <tr 
                        key={rec.id}
                        className="hover:bg-slate-800/50 transition cursor-pointer"
                        onClick={() => setDetailRecord(rec)}
                      >
                        <td className="py-3 px-3.5 font-mono font-bold text-amber-400 border-r border-slate-800/50">
                          {rec.id}
                        </td>
                        <td className="py-3 px-3.5 font-mono text-slate-400 border-r border-slate-800/50 whitespace-nowrap">
                          {rec.date}
                        </td>
                        <td className="py-3 px-3.5 text-slate-200 font-medium border-r border-slate-800/50">
                          <div className="font-semibold">{rec.topic}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">Trainer: {rec.trainer}</div>
                        </td>
                        <td className="py-3 px-3.5 text-slate-300 border-r border-slate-800/50">
                          <div>{rec.department}</div>
                          <span className="text-[10px] text-slate-500 font-mono">({rec.category})</span>
                        </td>
                        <td className="py-3 px-3.5 font-mono border-r border-slate-800/50">
                          <div className="text-slate-200 font-semibold">{rec.attendeesCount} / {rec.targetEmployees}</div>
                          <div className="text-[10px] text-emerald-400 font-bold">{pct}% pass</div>
                        </td>
                        <td className="py-3 px-3.5 border-r border-slate-800/50">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{rec.status}</span>
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => setDetailRecord(rec)}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                              title="View Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingRecord(rec);
                                setIsRecordModalOpen(true);
                              }}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg transition"
                              title="Edit Record"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Delete training record ${rec.id}?`)) {
                                  handleDeleteRecord(rec.id, rec.year);
                                }
                              }}
                              className="p-1.5 bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 rounded-lg transition"
                              title="Delete Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredRecords.length === 0 && (
              <div className="p-12 text-center space-y-3">
                <CheckCircle className="w-10 h-10 text-slate-600 mx-auto" />
                <div className="text-sm font-semibold text-slate-300">
                  {activeYear === 2026 ? 'No 2026 Training Sessions Recorded Yet' : 'No records match search'}
                </div>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {activeYear === 2026 
                    ? 'Click "+ Add 2026 Training Record" above to record a new anti-bribery training session for 2026.'
                    : 'Try clearing your search query.'}
                </p>
                {activeYear === 2026 && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingRecord(null);
                      setIsRecordModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>+ Add 2026 Training Record</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW: SHEET FOLDERS TAB */}
      {activeTab === 'sheets' && (
        <>
          {/* KPI Overview Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-mono">
                  {activeYear} Sheet Folders
                </div>
                <div className="text-2xl font-bold text-amber-400 mt-1 font-mono">
                  {currentWorkbook.folders.length}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">1 Folder created per sheet</div>
              </div>
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
                <Folder className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-mono">
                  {activeFolder ? 'Folder Records' : `${activeYear} Sheet Records`}
                </div>
                <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono">
                  {activeFolder ? activeFolder.rowCount.toLocaleString() : currentWorkbook.totalRows.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {activeFolder ? `${activeFolder.colCount} columns preserved` : 'Original values preserved'}
                </div>
              </div>
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                <TableIcon className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-mono">Active Source</div>
                <div className="text-sm font-bold text-slate-200 mt-1 truncate max-w-[180px]" title={currentWorkbook.sourceFileName}>
                  {currentWorkbook.sourceFileName}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Updated: {currentWorkbook.uploadedAt}</div>
              </div>
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
                <HardDrive className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-mono">Compliance Status</div>
                <div className="text-sm font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{activeYear === 2025 ? 'Approved & Synced' : 'Active Operational'}</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Subic Bay Freeport Zone</div>
              </div>
              <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* REAL DYNAMIC ANTI-BRIBERY COMPLIANCE LINE GRAPH & ANALYSIS FOR ACTIVE YEAR */}
          <AntiBriberyComplianceChart 
            workbook={currentWorkbook}
            year={activeYear}
            records={currentYearData.records}
            onAddRecord={() => {
              setEditingRecord(null);
              setIsRecordModalOpen(true);
            }}
          />

          {/* VIEW 1: ROOT FOLDER VIEW (List of Sheet Folders for activeYear) */}
          {!selectedFolderId && (
            <div className="space-y-5">
              {/* Drag and drop upload banner */}
              <div 
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                  isDragOver 
                    ? 'border-amber-400 bg-amber-500/10' 
                    : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                }`}
              >
                <div className="max-w-md mx-auto space-y-2">
                  <div className="w-10 h-10 mx-auto rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div className="text-sm font-semibold text-slate-200">
                    Upload New Excel Workbook or CSV File for {activeYear}
                  </div>
                  <p className="text-xs text-slate-400">
                    {activeYear === 2026
                      ? 'Upload a 2026 workbook to create separate sheet folders under 2026. Does not affect 2025.'
                      : 'Upload an updated 2025 workbook. Automatically creates separate sheet folders for 2025.'}
                  </p>
                  <div className="pt-1 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-bold rounded-lg transition cursor-pointer"
                    >
                      Browse Computer
                    </button>
                    {activeYear === 2025 && (
                      <button
                        type="button"
                        onClick={handleResetToDefault}
                        className="px-3 py-1.5 text-slate-400 hover:text-slate-200 text-xs transition cursor-pointer"
                      >
                        Reset 2025 Default Roster
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Search bar & Filter */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder={`Search ${activeYear} sheet folders...`}
                    value={folderSearchQuery}
                    onChange={(e) => setFolderSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition"
                  />
                  {folderSearchQuery && (
                    <button 
                      onClick={() => setFolderSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="text-xs font-mono text-slate-400">
                  Showing <span className="text-amber-400 font-bold">{filteredFolders.length}</span> of {currentWorkbook.folders.length} sheet folders in {activeYear}
                </div>
              </div>

              {/* Grid of Sheet Folders */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredFolders.map((folder, index) => (
                  <div
                    key={folder.id}
                    onClick={() => setSelectedFolderId(folder.id)}
                    className="group p-5 bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-2xl shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="p-3 bg-amber-500/10 group-hover:bg-amber-500/20 border border-amber-500/20 rounded-xl text-amber-400 transition">
                          <Folder className="w-6 h-6" />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono text-amber-400/80 px-2 py-0.5 bg-amber-500/10 rounded border border-amber-500/20">
                            {activeYear}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 px-2 py-0.5 bg-slate-800 rounded border border-slate-700">
                            Sheet {index + 1}
                          </span>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-slate-100 group-hover:text-amber-300 transition flex items-center gap-1.5">
                          <span>{folder.name}</span>
                        </h3>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {folder.description || `Dedicated folder for sheet "${folder.rawSheetName}"`}
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between">
                      <div className="space-y-0.5 font-mono text-[11px]">
                        <div className="text-emerald-400 font-semibold">
                          {folder.rowCount.toLocaleString()} rows
                        </div>
                        <div className="text-slate-500 text-[10px]">
                          {folder.colCount} columns
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-xs font-semibold text-amber-400 group-hover:translate-x-1 transition">
                        <span>Open Folder</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredFolders.length === 0 && (
                <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                  <Folder className="w-10 h-10 text-slate-600 mx-auto" />
                  <div className="text-sm font-semibold text-slate-300">
                    {activeYear === 2026 && currentWorkbook.folders.length === 0
                      ? 'No Spreadsheet Folders in 2026 Yet'
                      : 'No sheet folders matched your search'}
                  </div>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    {activeYear === 2026 && currentWorkbook.folders.length === 0
                      ? 'Upload a 2026 Excel workbook above to automatically populate 2026 sheet folders, or add training session records.'
                      : 'Try clearing the search query or upload a new Excel file.'}
                  </p>
                  {folderSearchQuery && (
                    <button
                      onClick={() => setFolderSearchQuery('')}
                      className="px-3.5 py-1.5 bg-slate-800 text-xs text-slate-200 rounded-lg hover:bg-slate-700"
                    >
                      Clear Search
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* VIEW 2: INSIDE SPECIFIC SHEET FOLDER */}
          {selectedFolderId && activeFolder && (
            <div className="space-y-4">
              {/* Folder Content Toolbar */}
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
                    <FolderOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <span>Folder: {activeFolder.name}</span>
                      <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        {activeYear}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                        Sheet: "{activeFolder.rawSheetName}"
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">
                      Showing {filteredRows.length.toLocaleString()} total rows across {activeFolder.colCount} columns
                    </div>
                  </div>
                </div>

                {/* Table Search & Page Size */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder={`Search ${activeFolder.name} rows...`}
                      value={tableSearch}
                      onChange={(e) => setTableSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition"
                    />
                    {tableSearch && (
                      <button 
                        onClick={() => setTableSearch('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-amber-500 font-mono cursor-pointer"
                  >
                    <option value={25}>25 / page</option>
                    <option value={50}>50 / page</option>
                    <option value={100}>100 / page</option>
                    <option value={250}>250 / page</option>
                    <option value={-1}>All Rows</option>
                  </select>
                </div>
              </div>

              {/* Table Container */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-slate-950 text-slate-300 font-mono text-[11px] uppercase border-b border-slate-800 z-10 select-none">
                      <tr>
                        <th className="py-3 px-3.5 w-12 text-center text-slate-500 font-mono border-r border-slate-800/80">
                          #
                        </th>
                        {activeFolder.headers.map((header, colIdx) => {
                          const isSorted = sortColIdx === colIdx;
                          return (
                            <th
                              key={colIdx}
                              onClick={() => handleSort(colIdx)}
                              className="py-3 px-3.5 font-semibold text-slate-200 border-r border-slate-800/80 last:border-r-0 hover:bg-slate-900 transition cursor-pointer whitespace-nowrap"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span>{header}</span>
                                <span className="text-[10px] text-slate-500">
                                  {isSorted ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                                </span>
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-800/60 font-sans">
                      {paginatedRows.map((row, rowIdx) => {
                        const absoluteIndex = pageSize === -1 ? rowIdx + 1 : (currentPage - 1) * pageSize + rowIdx + 1;
                        return (
                          <tr 
                            key={rowIdx}
                            className="hover:bg-slate-800/50 transition-colors group"
                          >
                            <td className="py-2.5 px-3.5 text-center text-slate-500 font-mono text-[11px] border-r border-slate-800/50">
                              {absoluteIndex}
                            </td>
                            {activeFolder.headers.map((_, colIdx) => {
                              const cellVal = row[colIdx];
                              const cellStr = cellVal !== undefined && cellVal !== null ? String(cellVal) : '';
                              const isDone = cellStr.toLowerCase() === 'done';
                              
                              return (
                                <td 
                                  key={colIdx}
                                  className="py-2.5 px-3.5 text-slate-300 border-r border-slate-800/50 last:border-r-0 whitespace-nowrap"
                                >
                                  {isDone ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span>done</span>
                                    </span>
                                  ) : (
                                    <span>{cellStr || '—'}</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {filteredRows.length === 0 && (
                  <div className="p-12 text-center space-y-2">
                    <TableIcon className="w-8 h-8 text-slate-600 mx-auto" />
                    <div className="text-sm font-semibold text-slate-300">No records found in this sheet</div>
                    <p className="text-xs text-slate-500">Try adjusting your search query.</p>
                  </div>
                )}

                {/* Pagination Footer */}
                {filteredRows.length > 0 && pageSize !== -1 && (
                  <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <div className="text-slate-400 font-mono">
                      Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredRows.length)} of {filteredRows.length.toLocaleString()} records
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 hover:bg-slate-800 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                        title="First Page"
                      >
                        <ChevronsLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 hover:bg-slate-800 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                        title="Previous Page"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      <span className="px-3 py-1 font-mono text-xs text-amber-400 bg-slate-900 border border-slate-800 rounded-lg">
                        Page {currentPage} of {totalPages}
                      </span>

                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 hover:bg-slate-800 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                        title="Next Page"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                        className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 hover:bg-slate-800 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                        title="Last Page"
                      >
                        <ChevronsRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Record Creation / Editing Modal */}
      <AntiBriberyRecordModal
        isOpen={isRecordModalOpen}
        onClose={() => {
          setIsRecordModalOpen(false);
          setEditingRecord(null);
        }}
        year={activeYear}
        onSave={handleSaveRecord}
        initialRecord={editingRecord}
        existingRecordsCount={currentYearData.records.length}
      />

      {/* Record Detail Modal */}
      <AntiBriberyRecordDetailModal
        record={detailRecord}
        onClose={() => setDetailRecord(null)}
        onEdit={(rec) => {
          setEditingRecord(rec);
          setIsRecordModalOpen(true);
        }}
        onDelete={handleDeleteRecord}
      />
    </div>
  );
}
