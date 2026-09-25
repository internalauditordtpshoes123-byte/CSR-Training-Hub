/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { INITIAL_EMPLOYEES } from './employeesData';

export interface AntiBriberySheetFolder {
  id: string;
  name: string; // Sanitized folder name matching sheet name
  rawSheetName: string; // Original sheet name from Excel
  headers: string[];
  rows: (string | number | null)[][];
  rowCount: number;
  colCount: number;
  uploadedAt: string;
  sourceFileName: string;
  category: string;
  description: string;
  year?: number; // Explicit year association: 2025 | 2026
}

export interface AntiBriberyTrainingRecord {
  id: string; // e.g. "AB-2025-0001" or "AB-2026-0001"
  year: number; // 2025 | 2026 (stored in database)
  date: string;
  topic: string;
  department: string;
  category: 'Indirect' | 'Direct';
  trainer: string;
  venue: string;
  targetEmployees: number;
  attendeesCount: number;
  status: 'Completed' | 'In Progress' | 'Scheduled' | 'Pending Verification';
  notes?: string;
  trainees?: Array<{
    employeeNo: string;
    name: string;
    department: string;
    status: 'done' | 'pending' | 'absent';
  }>;
  files?: Array<{
    id: string;
    name: string;
    size: string;
    type: string;
    url: string;
    uploadedAt: string;
  }>;
  createdAt: string;
  createdBy: string;
}

export interface AntiBriberyUploadedFile {
  id: string;
  fileName: string;
  fileSize: string;
  fileType: string;
  mimeType: string;
  url: string;
  downloadUrl: string;
  dataUrl?: string;
  uploadedAt: string;
  uploadedBy: string;
  year: number; // 2025 | 2026
  folderId?: string;
  category?: string;
  description?: string;
}

export interface AntiBriberyWorkbookState {
  sourceFileName: string;
  uploadedAt: string;
  totalSheets: number;
  totalRows: number;
  folders: AntiBriberySheetFolder[];
}

export interface AntiBriberyYearData {
  year: number; // 2025 | 2026
  workbook: AntiBriberyWorkbookState;
  records: AntiBriberyTrainingRecord[];
  files: AntiBriberyUploadedFile[];
}

export interface AntiBriberyMasterState {
  // Legacy backward-compatible fields
  sourceFileName: string;
  uploadedAt: string;
  totalSheets: number;
  totalRows: number;
  folders: AntiBriberySheetFolder[]; // Top level folders for any legacy caller
  // Year-specific isolated states
  year2025: AntiBriberyYearData;
  year2026: AntiBriberyYearData;
}

// Helper to sanitize sheet names for safe folder naming
export function sanitizeFolderName(name: string): string {
  const sanitized = name.replace(/[\\/:*?"<>|]/g, '_').trim();
  return sanitized || 'Sheet';
}

// Generate default sheet folders from the official 4,358 Anti-Bribery roster data
export function generateDefaultAntiBriberyWorkbook(): AntiBriberyWorkbookState {
  const allEmployees = INITIAL_EMPLOYEES;
  const now = '2026-08-14';

  const defaultSheetsDef = [
    {
      sheetName: 'Administration',
      category: 'Executive & Admin',
      filter: (dept: string) => dept.toLowerCase().includes('admin') || dept.toLowerCase().includes('expat') || dept.toLowerCase().includes('finance') || dept.toLowerCase().includes('business planning'),
      description: 'Administration, Expatriate leadership, Finance & Business Planning department personnel.'
    },
    {
      sheetName: 'Assembly Department',
      category: 'Assembly Operations',
      filter: (dept: string) => dept.toLowerCase().includes('assembly'),
      description: 'Assembly Lines A1-A12, B2-B13, Chemical Groups, Midsole and auxiliary assembly sections.'
    },
    {
      sheetName: 'Cutting Department',
      category: 'Cutting Operations',
      filter: (dept: string) => dept.toLowerCase().includes('cutting'),
      description: 'Auto Machine Cutting A, B, D, E, Component Warehouse, Preparation & Processing groups.'
    },
    {
      sheetName: 'Stitching Department',
      category: 'Stitching Operations',
      filter: (dept: string) => dept.toLowerCase().includes('stitching'),
      description: 'Stitching Lines A1-A22, B1-B22, D1-D18, E1-E12, Punching and Training groups.'
    },
    {
      sheetName: 'Quality Control (QC)',
      category: 'Quality Assurance',
      filter: (dept: string) => dept.toLowerCase().includes('qc') || dept.toLowerCase().includes('quality'),
      description: 'Quality Control Assembly, IQC, Laboratory, Stitching QC, Cutting QC, Rubber QC and Final QA.'
    },
    {
      sheetName: 'Rubber Department',
      category: 'Rubber & Molding',
      filter: (dept: string) => dept.toLowerCase().includes('rubber'),
      description: 'Rubber Extruding, Milling, Outsole Pressing, Outsole Processing, and Material Preparation groups.'
    },
    {
      sheetName: 'Warehouse & PMC',
      category: 'Logistics & Supply',
      filter: (dept: string) => dept.toLowerCase().includes('warehouse') || dept.toLowerCase().includes('pmc') || dept.toLowerCase().includes('procurement'),
      description: 'Warehouse Loaders, Leather/Fabric storage, Finished Goods Warehouse, Material Preparation, and PMC.'
    },
    {
      sheetName: 'General Affairs & HR',
      category: 'Plant Support',
      filter: (dept: string) => dept.toLowerCase().includes('general affair') || dept.toLowerCase().includes('hr') || dept.toLowerCase().includes('ie') || dept.toLowerCase().includes('audit') || dept.toLowerCase().includes('safety'),
      description: 'Human Resources, Engineering, Plant Technicians, Drivers, Safety Officers, IE, and System Audit.'
    },
    {
      sheetName: 'Master Attendance Roster',
      category: 'Consolidated Roster',
      filter: () => true, // All records
      description: 'Master consolidated Anti-Bribery attendance registry of all 4,358 factory staff at Subic Bay Freeport Zone.'
    }
  ];

  const headers = ['Employee No.', 'Employee Name', 'Department', 'On-Board Date', 'Position', 'Training Status'];

  const folders: AntiBriberySheetFolder[] = defaultSheetsDef.map((def, idx) => {
    const matchingEmps = allEmployees.filter(emp => def.filter(emp.department || ''));
    const rows = matchingEmps.map(emp => [
      emp.employeeNo,
      emp.name,
      emp.department || 'General',
      emp.onBoardDate || emp.hireDate || '2023-01-15',
      emp.position || 'Plant Operator',
      'done'
    ]);

    return {
      id: `ab-sheet-folder-${idx + 1}-${sanitizeFolderName(def.sheetName).toLowerCase()}`,
      name: sanitizeFolderName(def.sheetName),
      rawSheetName: def.sheetName,
      headers,
      rows,
      rowCount: rows.length,
      colCount: headers.length,
      uploadedAt: now,
      sourceFileName: 'DATIAN_SUBIC_SHOES_Anti_Bribery_Training_Master.xlsx',
      category: def.category,
      description: def.description,
      year: 2025
    };
  });

  const totalRows = folders.reduce((sum, f) => sum + (f.rawSheetName === 'Master Attendance Roster' ? f.rowCount : 0), 0) || allEmployees.length;

  return {
    sourceFileName: 'DATIAN_SUBIC_SHOES_Anti_Bribery_Training_Master.xlsx',
    uploadedAt: now,
    totalSheets: folders.length,
    totalRows,
    folders
  };
}

// Initial 2025 sample records representing certified compliance sessions
export function getInitial2025Records(): AntiBriberyTrainingRecord[] {
  return [
    {
      id: 'AB-2025-0001',
      year: 2025,
      date: '2025-04-18',
      topic: 'Corporate Anti-Bribery & FCPA Code of Conduct Master Certification',
      department: 'Administration Department',
      category: 'Indirect',
      trainer: 'Atty. Maria Santos (Chief Compliance Legal Counsel)',
      venue: 'Executive Boardroom & Training Hall Alpha',
      targetEmployees: 61,
      attendeesCount: 60,
      status: 'Completed',
      notes: 'Subic Bay Freeport Zone annual anti-bribery certification for executive, finance, and expatriate personnel.',
      createdAt: '2025-04-18T10:00:00Z',
      createdBy: 'System Administrator'
    },
    {
      id: 'AB-2025-0002',
      year: 2025,
      date: '2025-06-22',
      topic: 'Frontline Production Anti-Corruption & Ethical Procurement SOP',
      department: 'Assembly A',
      category: 'Direct',
      trainer: 'Engr. Roberto Reyes (CSR Plant Safety & Ethics Officer)',
      venue: 'Main Assembly Hall Line A1-A12',
      targetEmployees: 544,
      attendeesCount: 544,
      status: 'Completed',
      notes: 'Frontline operational guidelines on vendor gift refusal and whistleblower protection policies.',
      createdAt: '2025-06-22T08:30:00Z',
      createdBy: 'System Administrator'
    },
    {
      id: 'AB-2025-0003',
      year: 2025,
      date: '2025-08-14',
      topic: 'Factory-Wide Anti-Bribery Compliance & Audit Review 2025',
      department: 'General Affairs Team',
      category: 'Indirect',
      trainer: 'Internal Audit & HR Training Committee',
      venue: 'Subic Bay Central Training Pavilion',
      targetEmployees: 122,
      attendeesCount: 122,
      status: 'Completed',
      notes: '100% compliance verified across plant support, drivers, security, and maintenance personnel.',
      createdAt: '2025-08-14T09:00:00Z',
      createdBy: 'System Administrator'
    }
  ];
}

// Generate default clean master state containing 2025 and 2026 data
export function generateDefaultAntiBriberyMasterState(): AntiBriberyMasterState {
  const wb2025 = generateDefaultAntiBriberyWorkbook();
  const records2025 = getInitial2025Records();

  const empty2026Workbook: AntiBriberyWorkbookState = {
    sourceFileName: 'Ready for 2026 Uploads',
    uploadedAt: new Date().toISOString().split('T')[0],
    totalSheets: 0,
    totalRows: 0,
    folders: []
  };

  return {
    sourceFileName: wb2025.sourceFileName,
    uploadedAt: wb2025.uploadedAt,
    totalSheets: wb2025.totalSheets,
    totalRows: wb2025.totalRows,
    folders: wb2025.folders, // Top-level backward compatibility
    year2025: {
      year: 2025,
      workbook: wb2025,
      records: records2025,
      files: []
    },
    year2026: {
      year: 2026,
      workbook: empty2026Workbook,
      records: [],
      files: []
    }
  };
}

// Normalize any raw loaded data (from localStorage or server) without breaking or resetting existing data
export function normalizeAntiBriberyMasterState(raw: any): AntiBriberyMasterState {
  const defaultState = generateDefaultAntiBriberyMasterState();

  if (!raw || typeof raw !== 'object') {
    return defaultState;
  }

  // If already in new MasterState format with year2025 and year2026
  if (raw.year2025 && typeof raw.year2025 === 'object') {
    const y2025Wb: AntiBriberyWorkbookState = raw.year2025.workbook && Array.isArray(raw.year2025.workbook.folders)
      ? raw.year2025.workbook
      : defaultState.year2025.workbook;

    // Ensure all 2025 folders have year: 2025
    y2025Wb.folders = y2025Wb.folders.map(f => ({ ...f, year: 2025 }));

    const y2026Wb: AntiBriberyWorkbookState = raw.year2026?.workbook && Array.isArray(raw.year2026.workbook.folders)
      ? raw.year2026.workbook
      : {
          sourceFileName: raw.year2026?.workbook?.sourceFileName || 'Ready for 2026 Uploads',
          uploadedAt: raw.year2026?.workbook?.uploadedAt || new Date().toISOString().split('T')[0],
          totalSheets: raw.year2026?.workbook?.folders?.length || 0,
          totalRows: raw.year2026?.workbook?.totalRows || 0,
          folders: (raw.year2026?.workbook?.folders || []).map((f: any) => ({ ...f, year: 2026 }))
        };

    const records2025 = Array.isArray(raw.year2025.records) && raw.year2025.records.length > 0
      ? raw.year2025.records.map((r: any) => ({ ...r, year: 2025 }))
      : defaultState.year2025.records;

    const records2026 = Array.isArray(raw.year2026?.records)
      ? raw.year2026.records.map((r: any) => ({ ...r, year: 2026 }))
      : [];

    const files2025 = Array.isArray(raw.year2025.files) ? raw.year2025.files.map((f: any) => ({ ...f, year: 2025 })) : [];
    const files2026 = Array.isArray(raw.year2026?.files) ? raw.year2026.files.map((f: any) => ({ ...f, year: 2026 })) : [];

    return {
      sourceFileName: raw.sourceFileName || y2025Wb.sourceFileName,
      uploadedAt: raw.uploadedAt || y2025Wb.uploadedAt,
      totalSheets: y2025Wb.folders.length,
      totalRows: y2025Wb.totalRows,
      folders: y2025Wb.folders,
      year2025: {
        year: 2025,
        workbook: y2025Wb,
        records: records2025,
        files: files2025
      },
      year2026: {
        year: 2026,
        workbook: y2026Wb,
        records: records2026,
        files: files2026
      }
    };
  }

  // Otherwise, it was the legacy v3 structure with raw.folders. Migrate seamlessly into year 2025:
  if (Array.isArray(raw.folders) && raw.folders.length > 0) {
    const folders2025: AntiBriberySheetFolder[] = raw.folders.map((f: any) => ({
      ...f,
      year: 2025
    }));

    const wb2025: AntiBriberyWorkbookState = {
      sourceFileName: raw.sourceFileName || 'DATIAN_SUBIC_SHOES_Anti_Bribery_Training_Master.xlsx',
      uploadedAt: raw.uploadedAt || '2026-08-14',
      totalSheets: folders2025.length,
      totalRows: raw.totalRows || folders2025.reduce((sum, f) => sum + (f.rowCount || 0), 0),
      folders: folders2025
    };

    return {
      sourceFileName: wb2025.sourceFileName,
      uploadedAt: wb2025.uploadedAt,
      totalSheets: wb2025.totalSheets,
      totalRows: wb2025.totalRows,
      folders: wb2025.folders,
      year2025: {
        year: 2025,
        workbook: wb2025,
        records: getInitial2025Records(),
        files: []
      },
      year2026: {
        year: 2026,
        workbook: {
          sourceFileName: 'Ready for 2026 Uploads',
          uploadedAt: new Date().toISOString().split('T')[0],
          totalSheets: 0,
          totalRows: 0,
          folders: []
        },
        records: [],
        files: []
      }
    };
  }

  return defaultState;
}
