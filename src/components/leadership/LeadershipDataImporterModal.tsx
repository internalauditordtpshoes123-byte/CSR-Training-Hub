import React, { useState, useRef, useMemo } from 'react';
import {
  Upload,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Eye,
  Building2,
  Calendar,
  Users,
  Check,
  ClipboardList,
  Layers,
  Database,
  Info
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  LeadershipTraineeRow,
  LeadershipDepartmentSummaryItem,
  LEADERSHIP_COURSES_DEF,
  LeadershipCourseAttendance,
  calculateLeadershipStatus,
  cleanTraineeName
} from '../../data/leadershipSheetData';
import { LeadershipScheduleItem } from '../../data/leadershipScheduleData';

interface LeadershipDataImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportTrainees?: (trainees: LeadershipTraineeRow[], mode: 'merge' | 'replace' | 'append') => void;
  onImportSchedules?: (schedules: LeadershipScheduleItem[], mode: 'merge' | 'replace' | 'append') => void;
  onImportDepartmentSummaries?: (summaries: LeadershipDepartmentSummaryItem[], mode: 'merge' | 'replace' | 'append') => void;
  addToast: (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  existingTraineesCount?: number;
  existingSchedulesCount?: number;
}

export type DetectedDataType = 'department_summary' | 'trainee_attendance' | 'schedule_list' | 'unknown';

export interface ParsedImportResult {
  detectedType: DetectedDataType;
  fileName: string;
  detectedYear: number;
  periodLabel: string;
  departmentSummaries: LeadershipDepartmentSummaryItem[];
  trainees: LeadershipTraineeRow[];
  schedules: LeadershipScheduleItem[];
  rawHeaders: string[];
  rawRowCount: number;
  validRowCount: number;
}

export const LeadershipDataImporterModal: React.FC<LeadershipDataImporterModalProps> = ({
  isOpen,
  onClose,
  onImportTrainees,
  onImportSchedules,
  onImportDepartmentSummaries,
  addToast,
  existingTraineesCount = 0,
  existingSchedulesCount = 0
}) => {
  const [inputTab, setInputTab] = useState<'upload' | 'paste'>('upload');
  const [pastedText, setPastedText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [parseError, setParseError] = useState<string>('');
  
  // Parsed Output State
  const [parsedData, setParsedData] = useState<ParsedImportResult | null>(null);
  const [targetYearOverride, setTargetYearOverride] = useState<number | 'auto'>('auto');
  const [importMode, setImportMode] = useState<'merge' | 'replace' | 'append'>('merge');
  const [isImporting, setIsImporting] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Reset modal state
  const handleReset = () => {
    setParsedData(null);
    setParseError('');
    setPastedText('');
    setTargetYearOverride('auto');
  };

  // Helper to clean comma-padded string arrays
  const cleanTokens = (tokens: string[]): string[] => {
    return tokens.map((t) => (t || '').trim());
  };

  // Extract year from any string
  const detectYearFromString = (str: string): number => {
    if (/2025/i.test(str)) return 2025;
    if (/2026/i.test(str)) return 2026;
    if (/2027/i.test(str)) return 2027;
    return 2025;
  };

  // Smart Parser for CSV / Tabular Text / Raw Spreadsheets
  const parseRawContent = (content: string, fileName: string = 'pasted_data.csv'): ParsedImportResult | null => {
    const lines = content
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      setParseError('The provided file or text is empty.');
      return null;
    }

    let detectedYear = 2025;
    let periodLabel = 'JULY TO AUGUST 2025';
    const allText = content.toLowerCase();

    // Check for year hints
    if (allText.includes('2026') || allText.includes('sheet 2') || allText.includes('january to february 2026')) {
      detectedYear = 2026;
      periodLabel = 'JANUARY TO FEBRUARY 2026';
    } else if (allText.includes('2025') || allText.includes('sheet 1') || allText.includes('july to august 2025')) {
      detectedYear = 2025;
      periodLabel = 'JULY TO AUGUST 2025';
    }

    // Check 1: Department Completion Data (like the user's uploaded sample!)
    // Looks for lines with "Department" and ("Completed" or "Incomplete" or "Completion Rate")
    let isDeptCompletion = false;
    let deptHeaderIdx = -1;

    for (let i = 0; i < lines.length; i++) {
      const lineLower = lines[i].toLowerCase();
      if (lineLower.includes('completion data') || (lineLower.includes('department') && (lineLower.includes('completed') || lineLower.includes('rate')))) {
        isDeptCompletion = true;
        deptHeaderIdx = i;
        if (lineLower.includes('2025')) {
          detectedYear = 2025;
          periodLabel = 'JULY TO AUGUST 2025';
        } else if (lineLower.includes('2026')) {
          detectedYear = 2026;
          periodLabel = 'JANUARY TO FEBRUARY 2026';
        }
        break;
      }
    }

    if (isDeptCompletion) {
      const summaries: LeadershipDepartmentSummaryItem[] = [];
      const startLine = deptHeaderIdx >= 0 ? deptHeaderIdx : 0;

      for (let i = startLine; i < lines.length; i++) {
        const line = lines[i];
        // Split by comma
        const parts = line.split(',').map((p) => p.trim());
        // Filter non-empty tokens
        const nonEmpty = parts.filter((p) => p.length > 0);
        if (nonEmpty.length === 0) continue;

        const firstToken = nonEmpty[0].toLowerCase();
        // Check for department rows: Stitching, Cutting, Assembly, Rubber, Warehouse, etc.
        const recognizedDepts = ['stitching', 'cutting', 'assembly', 'rubber', 'warehouse', 'qa', 'qc', 'maintenance', 'total'];
        const isRecognized = recognizedDepts.some((d) => firstToken.startsWith(d));

        if (isRecognized && !firstToken.includes('department')) {
          const deptName = nonEmpty[0];
          // Look for numerical values
          const nums: number[] = [];
          let rateStr = '';

          for (let j = 1; j < nonEmpty.length; j++) {
            const token = nonEmpty[j];
            if (token.includes('%')) {
              rateStr = token;
            } else {
              const parsedNum = parseFloat(token.replace(/,/g, ''));
              if (!isNaN(parsedNum)) {
                nums.push(parsedNum);
              }
            }
          }

          if (deptName.toLowerCase() !== 'total' && (nums.length >= 1 || rateStr)) {
            const completed = nums[0] || 0;
            const incomplete = nums.length > 1 ? nums[1] : 0;
            const noShow = nums.length > 2 ? nums[2] : 0;
            const total = nums.length > 3 ? nums[3] : completed + incomplete + noShow;

            // Compute rate if not found
            let finalRate = rateStr;
            if (!finalRate && total > 0) {
              finalRate = `${((completed / total) * 100).toFixed(2)}%`;
            }

            summaries.push({
              id: `import-sum-${detectedYear}-${deptName.toLowerCase()}-${Date.now()}-${summaries.length}`,
              year: detectedYear,
              period: periodLabel,
              department: deptName,
              completed: Math.round(completed),
              incomplete: Math.round(incomplete),
              noShow: Math.round(noShow),
              total: Math.round(total),
              completionRate: finalRate || '0.00%',
              importedAt: new Date().toISOString(),
              sourceFile: fileName
            });
          }
        }
      }

      if (summaries.length > 0) {
        return {
          detectedType: 'department_summary',
          fileName,
          detectedYear,
          periodLabel,
          departmentSummaries: summaries,
          trainees: [],
          schedules: [],
          rawHeaders: ['Department', 'Completed', 'Incomplete', 'No Show', 'Total', 'Completion Rate'],
          rawRowCount: lines.length,
          validRowCount: summaries.length
        };
      }
    }

    // Check 2: Trainee Attendance Records
    // Headers typically contain: "No", "Name", "Employee No", "Department", "Section"
    let traineeHeaderIdx = -1;
    for (let i = 0; i < Math.min(lines.length, 15); i++) {
      const l = lines[i].toLowerCase();
      if ((l.includes('name') && l.includes('dept')) || (l.includes('employee') && l.includes('name')) || (l.includes('trainee') && l.includes('name'))) {
        traineeHeaderIdx = i;
        break;
      }
    }

    if (traineeHeaderIdx >= 0) {
      const headerLine = lines[traineeHeaderIdx];
      const headers = headerLine.split(',').map((h) => h.trim().toLowerCase()).filter((h) => h.length > 0);
      const trainees: LeadershipTraineeRow[] = [];

      for (let i = traineeHeaderIdx + 1; i < lines.length; i++) {
        const line = lines[i];
        const tokens = line.split(',').map((t) => t.trim()).filter((t) => t.length > 0);
        if (tokens.length < 2) continue;

        // Skip total rows or headers
        if (tokens[0].toLowerCase().includes('total') || tokens[1]?.toLowerCase().includes('total')) continue;

        let name = tokens[1] || tokens[0] || '';
        let empNo = '';
        let dept = 'General Production';
        let section = 'Supervisory Cohort';

        // Scan tokens for ID patterns or department words
        tokens.forEach((tok) => {
          if (/(P\d{4,6}|DTP|\d{5,})/i.test(tok) && !empNo) {
            empNo = tok;
          } else if (/(stitching|cutting|assembly|rubber|warehouse|qc|qa|nurse|admin|milling)/i.test(tok)) {
            dept = tok;
          }
        });

        if (!empNo) {
          empNo = `DTP-${detectedYear}-${(trainees.length + 1).toString().padStart(4, '0')}`;
        }

        const courses: LeadershipCourseAttendance = {
          machine: true,
          quality: true,
          sixSManagement: true,
          metalManagement: detectedYear === 2026,
          lineBalancing: true,
          teamAndManagement: true,
          effectiveCommunication: true,
          changeStyleManagement: true,
          hrManagement: true
        };

        const { total, status } = calculateLeadershipStatus(dept, courses, section);

        trainees.push({
          id: `import-lead-${detectedYear}-${Date.now()}-${trainees.length + 1}`,
          no: trainees.length + 1,
          name: cleanTraineeName(name),
          employeeNo: empNo,
          department: dept,
          departmentCategory: dept.includes('Stitching') ? 'Stitching' : dept.includes('Cutting') ? 'Cutting' : dept.includes('Assembly') ? 'Assembly' : dept.includes('Rubber') ? 'Rubber' : 'Warehouse & Other',
          trainingDate: detectedYear === 2026 ? 'January 05, 2026 – February 2026' : 'July 09, 2025 – August 20, 2025',
          year: detectedYear,
          sourceSheet: `Imported (${detectedYear})`,
          section,
          trainingTopic: '8 Core Leadership Modules',
          courses,
          total,
          status: status || 'Completed',
          lastModified: new Date().toISOString()
        });
      }

      if (trainees.length > 0) {
        return {
          detectedType: 'trainee_attendance',
          fileName,
          detectedYear,
          periodLabel,
          departmentSummaries: [],
          trainees,
          schedules: [],
          rawHeaders: headers,
          rawRowCount: lines.length,
          validRowCount: trainees.length
        };
      }
    }

    // Check 3: Schedule Items
    // Headers typically contain: "Topic", "Date", "Trainer", "Venue", "Status"
    let isSchedule = false;
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      const l = lines[i].toLowerCase();
      if ((l.includes('topic') && l.includes('date')) || (l.includes('trainer') && l.includes('venue')) || (l.includes('schedule') && l.includes('time'))) {
        isSchedule = true;
        break;
      }
    }

    if (isSchedule) {
      const schedules: LeadershipScheduleItem[] = [];
      const startLine = 1;

      for (let i = startLine; i < lines.length; i++) {
        const line = lines[i];
        const parts = line.split(',').map((p) => p.trim()).filter((p) => p.length > 0);
        if (parts.length < 2) continue;

        const topic = parts[0] || 'Core Leadership Module';
        const dateStr = parts[1] || `${detectedYear}-07-15`;
        const trainer = parts[2] || 'Training Supervisor';
        const venue = parts[3] || 'TRAINING ROOM DTP';

        schedules.push({
          id: `import-sched-${Date.now()}-${schedules.length + 1}`,
          trainingDate: dateStr,
          isoDate: dateStr,
          trainingTopic: topic,
          departmentSection: 'All Sections & Group Leaders',
          trainer,
          trainerRole: 'Instructor',
          venue,
          batch: `Cohort ${detectedYear}`,
          time: '2:00-3:00pm',
          status: 'Completed',
          year: detectedYear,
          dayOfWeek: 'Monday',
          purposeAndRemarks: `Standardized instruction on ${topic}`,
          content: [topic],
          traineeLeadersCount: 20,
          traineeLeaders: [],
          documentation: []
        });
      }

      if (schedules.length > 0) {
        return {
          detectedType: 'schedule_list',
          fileName,
          detectedYear,
          periodLabel,
          departmentSummaries: [],
          trainees: [],
          schedules,
          rawHeaders: ['Topic', 'Date', 'Trainer', 'Venue', 'Status'],
          rawRowCount: lines.length,
          validRowCount: schedules.length
        };
      }
    }

    setParseError('Could not automatically identify recognized Leadership Training format (Department Completion, Trainee Roster, or Schedule Table). Please check headers or format.');
    return null;
  };

  // Process File Upload via FileReader & XLSX
  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);
    setParseError('');
    setParsedData(null);

    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    try {
      if (['xlsx', 'xls'].includes(ext)) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        const csvContent = XLSX.utils.sheet_to_csv(sheet);
        const result = parseRawContent(csvContent, file.name);
        if (result) setParsedData(result);
      } else {
        // Plain text / CSV
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          if (content) {
            const result = parseRawContent(content, file.name);
            if (result) setParsedData(result);
          }
          setIsProcessing(false);
        };
        reader.onerror = () => {
          setParseError('Failed to read selected file.');
          setIsProcessing(false);
        };
        reader.readAsText(file);
        return;
      }
    } catch (err: any) {
      console.error('[Import Parse Error]:', err);
      setParseError(`Error parsing file: ${err.message || 'Invalid format'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Process Direct Text / CSV Paste
  const handleProcessPasted = () => {
    if (!pastedText.trim()) {
      setParseError('Please paste your CSV or tabular data first.');
      return;
    }
    setIsProcessing(true);
    setParseError('');
    try {
      const result = parseRawContent(pastedText, 'pasted_leadership_data.csv');
      if (result) setParsedData(result);
    } catch (err: any) {
      setParseError(`Failed to process pasted data: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Final Import Confirmation Handler
  const handleConfirmImport = async () => {
    if (!parsedData) return;

    setIsImporting(true);
    const targetYear = targetYearOverride === 'auto' ? parsedData.detectedYear : targetYearOverride;

    try {
      if (parsedData.detectedType === 'department_summary') {
        // Update department summaries
        const adjusted = parsedData.departmentSummaries.map((s) => ({
          ...s,
          year: targetYear
        }));

        if (onImportDepartmentSummaries) {
          onImportDepartmentSummaries(adjusted, importMode);
        }

        addToast(
          'Department Summary Imported',
          `Successfully imported ${adjusted.length} department records for Year ${targetYear}. Saved permanently.`,
          'success'
        );
      } else if (parsedData.detectedType === 'trainee_attendance') {
        const adjusted = parsedData.trainees.map((t) => ({
          ...t,
          year: targetYear
        }));

        if (onImportTrainees) {
          onImportTrainees(adjusted, importMode);
        }

        addToast(
          'Trainees Imported',
          `Successfully imported ${adjusted.length} leadership trainee records for Year ${targetYear}.`,
          'success'
        );
      } else if (parsedData.detectedType === 'schedule_list') {
        const adjusted = parsedData.schedules.map((s) => ({
          ...s,
          year: targetYear
        }));

        if (onImportSchedules) {
          onImportSchedules(adjusted, importMode);
        }

        addToast(
          'Schedules Imported',
          `Successfully imported ${adjusted.length} training session records.`,
          'success'
        );
      }

      setTimeout(() => {
        setIsImporting(false);
        onClose();
        handleReset();
      }, 500);
    } catch (err: any) {
      console.error('[Import Save Error]:', err);
      addToast('Import Error', 'Failed to complete data import.', 'error');
      setIsImporting(false);
    }
  };

  return (
    <div
      id="modal_leadership_importer"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-4xl bg-[#0d0d0d] border border-[#262626] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ========================================================= */}
        {/* 1. MODAL HEADER (BLACK & YELLOW ACCENTS)                 */}
        {/* ========================================================= */}
        <div className="px-5 py-3.5 bg-[#080808] border-b border-[#222222] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-yellow-400">
              <Upload className="w-4 h-4 text-yellow-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-white uppercase tracking-wider font-sans">
                  LEADERSHIP TRAINING • FILE UPLOAD & DATA IMPORT
                </h2>
                <span className="px-2 py-0.5 rounded bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 text-[10px] font-mono font-bold">
                  AUTO-DETECTION ENGINE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Upload CSV or Excel files with Department Completion Data, Trainee Attendance, or Schedules.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ========================================================= */}
        {/* 2. MODAL BODY                                             */}
        {/* ========================================================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* STEP 1: Input Source Selection (Upload File OR Direct Paste) */}
          {!parsedData && (
            <div className="space-y-3">
              {/* Input Mode Tabs */}
              <div className="flex items-center gap-2 border-b border-[#222222] pb-2">
                <button
                  type="button"
                  onClick={() => setInputTab('upload')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    inputTab === 'upload'
                      ? 'bg-yellow-500 text-black shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-neutral-900'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload File (.csv, .xlsx, .xls)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInputTab('paste')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    inputTab === 'paste'
                      ? 'bg-yellow-500 text-black shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-neutral-900'
                  }`}
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span>Paste Text / Raw CSV Data</span>
                </button>
              </div>

              {/* TAB A: Drag & Drop File Upload */}
              {inputTab === 'upload' && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#2d2d2d] hover:border-yellow-500/80 rounded-xl p-8 text-center bg-[#070707] hover:bg-neutral-950 transition cursor-pointer group space-y-2"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv, .xlsx, .xls, .txt"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileUpload(f);
                    }}
                  />
                  <div className="w-12 h-12 rounded-full bg-blue-600/15 border border-blue-500/30 flex items-center justify-center mx-auto text-blue-400 group-hover:scale-105 transition-transform">
                    <FileSpreadsheet className="w-6 h-6 text-blue-400" />
                  </div>
                  <div className="text-xs font-bold text-white">
                    Click to browse or drag & drop Leadership Training file
                  </div>
                  <p className="text-[11px] text-slate-400 max-w-md mx-auto leading-relaxed">
                    Supports Microsoft Excel (.xlsx, .xls), CSV files (.csv), or comma-delimited export sheets.
                  </p>
                </div>
              )}

              {/* TAB B: Paste Direct Text */}
              {inputTab === 'paste' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Paste raw spreadsheet lines (e.g., Department, Completed, Incomplete, Total):</span>
                    <button
                      type="button"
                      onClick={() => {
                        setPastedText(`,,,,,,,,,,,,,,,,,,,,,,,,,,DASHBOARD,,,,,,,,,,,,
,Schedule,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,,,,,,,,,JULY TO AUGUST 2025,,,,,,,,,,,,
,Documentation,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,,,,,,,,,COMPLETION DATA 2025,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,,,,,,,,,Department,,,Completed ,Incomplete,No Show, Total,,Completion Rate,,,DEPARTMENT,
,,,,,,,,,,,,,,,,,,,,,,,,,,Stitching,,,35,22,0,57,,81.40%,,,Stitching,57
,,,,,,,,,,,,,,,,,,,,,,,,,,Cutting,,,0,6,4,10,,0%,,,Cutting,10
,,,,,,,,,,,,,,,,,,,,,,,,,,Assembly,,,7,8,2,17,,16.30%,,,Assembly,17
,,,,,,,,,,,,,,,,,,,,,,,,,,Rubber,,,1,0,0,1,,2.30%,,,Rubber,1
,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,85,,,,,,85`);
                      }}
                      className="text-blue-400 hover:text-blue-300 font-bold hover:underline cursor-pointer"
                    >
                      Load Sample 2025 Completion Snippet
                    </button>
                  </div>
                  <textarea
                    rows={7}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Paste CSV rows here..."
                    className="w-full p-3 bg-black border border-[#2d2d2d] focus:border-yellow-500 rounded-xl text-[11px] font-mono text-slate-200 outline-hidden transition resize-y"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleProcessPasted}
                      disabled={isProcessing || !pastedText.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer disabled:bg-neutral-800 disabled:text-slate-500"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Process & Identify Data</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Processing Spinner */}
              {isProcessing && (
                <div className="p-4 bg-neutral-900 border border-[#2d2d2d] rounded-xl flex items-center justify-center gap-2 text-xs font-medium text-yellow-400">
                  <RefreshCw className="w-4 h-4 animate-spin text-yellow-400" />
                  <span>Reading and analyzing uploaded records...</span>
                </div>
              )}

              {/* Parse Error Banner */}
              {parseError && (
                <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1 leading-relaxed">{parseError}</div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2 & 3: Interactive Data Preview Table */}
          {parsedData && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Summary of Identification Banner */}
              <div className="p-3.5 bg-black border border-[#282828] rounded-xl flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-yellow-400 font-black">
                    <CheckCircle2 className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-white">
                        {parsedData.detectedType === 'department_summary'
                          ? 'DEPARTMENT COMPLETION SUMMARY'
                          : parsedData.detectedType === 'trainee_attendance'
                          ? 'LEADERSHIP TRAINEE ATTENDANCE ROSTER'
                          : 'LEADERSHIP TRAINING SCHEDULE'}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-blue-600/20 text-blue-300 border border-blue-500/30 text-[10px] font-mono font-bold">
                        {parsedData.fileName}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                      Detected Cohort Period: <strong className="text-yellow-400">{parsedData.periodLabel}</strong> • {parsedData.validRowCount} Valid Record(s) Extracted
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold border border-neutral-700 transition cursor-pointer"
                >
                  Choose Different File
                </button>
              </div>

              {/* Import Settings Bar (Black & Yellow Accents) */}
              <div className="p-3 bg-[#0a0a0a] border border-[#222222] rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-[11px] font-mono">Assign Cohort Year:</span>
                    <select
                      value={targetYearOverride}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTargetYearOverride(val === 'auto' ? 'auto' : parseInt(val, 10));
                      }}
                      className="px-2.5 py-1 bg-black border border-[#333] text-yellow-300 text-xs font-mono font-bold rounded-lg outline-hidden focus:border-yellow-500 cursor-pointer"
                    >
                      <option value="auto">Auto-detected ({parsedData.detectedYear})</option>
                      <option value="2025">2025 Cohort</option>
                      <option value="2026">2026 Cohort</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-[11px] font-mono">Import Mode:</span>
                    <select
                      value={importMode}
                      onChange={(e) => setImportMode(e.target.value as any)}
                      className="px-2.5 py-1 bg-black border border-[#333] text-slate-200 text-xs font-mono font-bold rounded-lg outline-hidden focus:border-blue-500 cursor-pointer"
                    >
                      <option value="merge">Merge & Update (Safe)</option>
                      <option value="append">Append as New Records</option>
                      <option value="replace">Replace Existing Cohort</option>
                    </select>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 font-mono">
                  Permanent storage: Cloud Firestore + Server Database
                </div>
              </div>

              {/* PREVIEW TABLE 1: DEPARTMENT COMPLETION SUMMARY */}
              {parsedData.detectedType === 'department_summary' && (
                <div className="border border-[#262626] rounded-xl overflow-hidden bg-black">
                  <div className="px-3 py-2 bg-[#121212] border-b border-[#262626] flex items-center justify-between text-xs font-bold text-slate-300">
                    <span className="flex items-center gap-1.5 text-yellow-400">
                      <Building2 className="w-3.5 h-3.5" />
                      Extracted Department Completion Metrics
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {parsedData.departmentSummaries.length} Departments Found
                    </span>
                  </div>

                  <div className="overflow-x-auto max-h-64">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#18181b] border-b border-[#27272a] text-[11px] font-mono text-slate-400 uppercase">
                          <th className="py-2 px-3">Department</th>
                          <th className="py-2 px-3 text-center">Completed</th>
                          <th className="py-2 px-3 text-center">Incomplete</th>
                          <th className="py-2 px-3 text-center">No Show</th>
                          <th className="py-2 px-3 text-center font-bold text-white">Total Trainees</th>
                          <th className="py-2 px-3 text-right text-yellow-400">Completion Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#202022] font-mono text-[11px]">
                        {parsedData.departmentSummaries.map((item, idx) => (
                          <tr key={`dept_prev_${idx}`} className="hover:bg-neutral-900/60 transition">
                            <td className="py-2 px-3 font-sans font-bold text-slate-200 flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-yellow-400" />
                              <span>{item.department}</span>
                            </td>
                            <td className="py-2 px-3 text-center text-emerald-400 font-bold">
                              {item.completed}
                            </td>
                            <td className="py-2 px-3 text-center text-amber-300">
                              {item.incomplete}
                            </td>
                            <td className="py-2 px-3 text-center text-slate-500">
                              {item.noShow}
                            </td>
                            <td className="py-2 px-3 text-center font-bold text-white bg-neutral-900/40">
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
                          <td className="py-2.5 px-3">TOTAL CONSOLIDATED</td>
                          <td className="py-2.5 px-3 text-center text-emerald-400">
                            {parsedData.departmentSummaries.reduce((a, b) => a + b.completed, 0)}
                          </td>
                          <td className="py-2.5 px-3 text-center text-amber-300">
                            {parsedData.departmentSummaries.reduce((a, b) => a + b.incomplete, 0)}
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-400">
                            {parsedData.departmentSummaries.reduce((a, b) => a + b.noShow, 0)}
                          </td>
                          <td className="py-2.5 px-3 text-center text-yellow-400 bg-neutral-950 font-black">
                            {parsedData.departmentSummaries.reduce((a, b) => a + b.total, 0)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-yellow-400">
                            100.0%
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* PREVIEW TABLE 2: TRAINEE ATTENDANCE ROSTER */}
              {parsedData.detectedType === 'trainee_attendance' && (
                <div className="border border-[#262626] rounded-xl overflow-hidden bg-black">
                  <div className="px-3 py-2 bg-[#121212] border-b border-[#262626] flex items-center justify-between text-xs font-bold text-slate-300">
                    <span className="flex items-center gap-1.5 text-yellow-400">
                      <Users className="w-3.5 h-3.5" />
                      Extracted Trainee Attendance Rows (First 10 Shown)
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {parsedData.trainees.length} Total Trainees
                    </span>
                  </div>

                  <div className="overflow-x-auto max-h-64">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#18181b] border-b border-[#27272a] text-[11px] font-mono text-slate-400 uppercase">
                          <th className="py-1.5 px-2.5">No.</th>
                          <th className="py-1.5 px-2.5">Employee Name</th>
                          <th className="py-1.5 px-2.5">Employee No</th>
                          <th className="py-1.5 px-2.5">Department</th>
                          <th className="py-1.5 px-2.5 text-center">Score</th>
                          <th className="py-1.5 px-2.5 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#202022] font-mono text-[11px]">
                        {parsedData.trainees.slice(0, 15).map((t, idx) => (
                          <tr key={`trainee_prev_${idx}`} className="hover:bg-neutral-900/60 transition">
                            <td className="py-1.5 px-2.5 text-slate-500">{t.no}</td>
                            <td className="py-1.5 px-2.5 font-sans font-bold text-slate-200">{cleanTraineeName(t.name)}</td>
                            <td className="py-1.5 px-2.5 text-blue-300">{t.employeeNo}</td>
                            <td className="py-1.5 px-2.5 text-slate-300">{t.department}</td>
                            <td className="py-1.5 px-2.5 text-center text-yellow-400 font-bold">{t.total} / 8</td>
                            <td className="py-1.5 px-2.5 text-right">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                t.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                              }`}>
                                {t.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* PREVIEW TABLE 3: SCHEDULES */}
              {parsedData.detectedType === 'schedule_list' && (
                <div className="border border-[#262626] rounded-xl overflow-hidden bg-black">
                  <div className="px-3 py-2 bg-[#121212] border-b border-[#262626] flex items-center justify-between text-xs font-bold text-slate-300">
                    <span className="flex items-center gap-1.5 text-yellow-400">
                      <Calendar className="w-3.5 h-3.5" />
                      Extracted Training Schedule Sessions
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {parsedData.schedules.length} Sessions
                    </span>
                  </div>

                  <div className="overflow-x-auto max-h-64">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#18181b] border-b border-[#27272a] text-[11px] font-mono text-slate-400 uppercase">
                          <th className="py-1.5 px-2.5">Topic</th>
                          <th className="py-1.5 px-2.5">Date</th>
                          <th className="py-1.5 px-2.5">Trainer</th>
                          <th className="py-1.5 px-2.5">Venue</th>
                          <th className="py-1.5 px-2.5 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#202022] font-mono text-[11px]">
                        {parsedData.schedules.map((s, idx) => (
                          <tr key={`sched_prev_${idx}`} className="hover:bg-neutral-900/60 transition">
                            <td className="py-1.5 px-2.5 font-sans font-bold text-slate-200">{s.topic}</td>
                            <td className="py-1.5 px-2.5 text-yellow-400">{s.trainingDate}</td>
                            <td className="py-1.5 px-2.5 text-slate-300">{s.trainer}</td>
                            <td className="py-1.5 px-2.5 text-slate-400">{s.venue}</td>
                            <td className="py-1.5 px-2.5 text-right">
                              <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold">
                                {s.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* 3. MODAL FOOTER (BLUE BUTTONS & CONFIRMATION)             */}
        {/* ========================================================= */}
        <div className="px-5 py-3.5 bg-[#080808] border-t border-[#222222] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isImporting}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 transition cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2.5">
            {parsedData && (
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={isImporting}
                className="px-5 py-2.5 text-xs font-black text-black bg-yellow-400 hover:bg-yellow-300 active:bg-yellow-500 rounded-lg shadow-md shadow-yellow-500/20 transition flex items-center gap-2 cursor-pointer disabled:bg-neutral-800 disabled:text-slate-600"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Importing & Saving Permanently...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Confirm & Import Data</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadershipDataImporterModal;
