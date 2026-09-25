import rawData from './leadershipSheetData.json';

export interface LeadershipCourseAttendance {
  machine?: boolean;
  quality?: boolean;
  sixSManagement?: boolean;
  metalManagement?: boolean;
  lineBalancing?: boolean;
  teamAndManagement?: boolean;
  effectiveCommunication?: boolean;
  changeStyleManagement?: boolean;
  hrManagement?: boolean;
}

export interface LeadershipTraineeRow {
  id: string;
  no: number;
  name: string;
  employeeNo: string;
  department: string;
  departmentCategory: 'Stitching' | 'Assembly' | 'Cutting' | 'Rubber' | 'Warehouse & Other' | string;
  trainingDate: string;
  year: 2025 | 2026 | number;
  sourceSheet: 'Sheet 1 (2025)' | 'Sheet 2 (2026)' | string;
  section: string;
  trainingTopic: string;
  courses: LeadershipCourseAttendance;
  total: number;
  status: 'Completed' | 'Incomplete' | 'No Show';
  notes?: string;
  certificateIssued?: boolean;
  certificateDate?: string;
  lastModified?: string;
}

export interface LeadershipDepartmentSummaryItem {
  id: string;
  year: number;
  period?: string;
  department: string;
  completed: number;
  incomplete: number;
  noShow: number;
  total: number;
  completionRate: string;
  importedAt?: string;
  sourceFile?: string;
}

export const INITIAL_LEADERSHIP_COMPLETION_SUMMARIES: LeadershipDepartmentSummaryItem[] = [
  // 2025: JULY TO AUGUST 2025 (85 Total)
  {
    id: 'sum-2025-stitching',
    year: 2025,
    period: 'JULY TO AUGUST 2025',
    department: 'Stitching',
    completed: 35,
    incomplete: 22,
    noShow: 0,
    total: 57,
    completionRate: '81.40%'
  },
  {
    id: 'sum-2025-cutting',
    year: 2025,
    period: 'JULY TO AUGUST 2025',
    department: 'Cutting',
    completed: 0,
    incomplete: 6,
    noShow: 4,
    total: 10,
    completionRate: '0.00%'
  },
  {
    id: 'sum-2025-assembly',
    year: 2025,
    period: 'JULY TO AUGUST 2025',
    department: 'Assembly',
    completed: 7,
    incomplete: 8,
    noShow: 2,
    total: 17,
    completionRate: '16.30%'
  },
  {
    id: 'sum-2025-rubber',
    year: 2025,
    period: 'JULY TO AUGUST 2025',
    department: 'Rubber',
    completed: 1,
    incomplete: 0,
    noShow: 0,
    total: 1,
    completionRate: '2.30%'
  },
  // 2026: JANUARY TO FEBRUARY 2026 (71 Total)
  {
    id: 'sum-2026-stitching',
    year: 2026,
    period: 'JANUARY TO FEBRUARY 2026',
    department: 'Stitching',
    completed: 23,
    incomplete: 16,
    noShow: 9,
    total: 48,
    completionRate: '47.92%'
  },
  {
    id: 'sum-2026-cutting',
    year: 2026,
    period: 'JANUARY TO FEBRUARY 2026',
    department: 'Cutting',
    completed: 0,
    incomplete: 0,
    noShow: 0,
    total: 0,
    completionRate: '0.00%'
  },
  {
    id: 'sum-2026-assembly',
    year: 2026,
    period: 'JANUARY TO FEBRUARY 2026',
    department: 'Assembly',
    completed: 11,
    incomplete: 9,
    noShow: 0,
    total: 20,
    completionRate: '55.00%'
  },
  {
    id: 'sum-2026-rubber',
    year: 2026,
    period: 'JANUARY TO FEBRUARY 2026',
    department: 'Rubber',
    completed: 3,
    incomplete: 0,
    noShow: 0,
    total: 3,
    completionRate: '52.11%'
  }
];

export interface LeadershipUploadedFile {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: string;
  mimeType: string;
  dataUrl?: string;
  uploadedAt: string;
  uploadedBy: string;
  category: 'Attendance Sheet' | 'Training Matrix' | 'Syllabus' | 'Assessment' | 'Certificate' | 'Other';
  description?: string;
}

export interface CourseColumnDef {
  key: keyof LeadershipCourseAttendance;
  title: string;
  dates2025: string[];
  dates2026: string[];
  description: string;
  trainer: string;
  venue: string;
}

export const LEADERSHIP_COURSES_DEF: CourseColumnDef[] = [
  {
    key: 'machine',
    title: 'Machine',
    dates2025: ['July 09'],
    dates2026: ['Jan 05', 'Feb 2026'],
    description: 'Equipment Operation, Preventive Maintenance, and Machine Safety Protocols',
    trainer: '',
    venue: 'Technical Training Lab A'
  },
  {
    key: 'quality',
    title: 'Quality',
    dates2025: ['July 10', 'Aug 05'],
    dates2026: ['Jan 05', 'Feb 2026'],
    description: 'Quality Assurance Standards, Defect Prevention, and Zero-Defect Inspection',
    trainer: '',
    venue: 'QA Training Center'
  },
  {
    key: 'sixSManagement',
    title: '6S Management',
    dates2025: ['July 12', 'Aug 13'],
    dates2026: ['Jan 05', 'Aug/Sep 2026'],
    description: 'Sort, Set in order, Shine, Standardize, Sustain, Safety in Production Areas',
    trainer: '',
    venue: 'Main Training Hall'
  },
  {
    key: 'metalManagement',
    title: 'Metal Mgmt',
    dates2025: ['N/A'],
    dates2026: ['Aug/Sep 2026'],
    description: 'Needle & Metal Contamination Control, Metal Detector Calibration, Broken Needle Log',
    trainer: '',
    venue: 'Metal Detection Facility'
  },
  {
    key: 'lineBalancing',
    title: 'Line Balancing',
    dates2025: ['July 11'],
    dates2026: ['Jan 05', 'Feb 2026'],
    description: 'Takt Time Optimization, Bottleneck Resolution, and Workstation Ergonomics',
    trainer: '',
    venue: 'IE Workshop Room'
  },
  {
    key: 'teamAndManagement',
    title: 'Team and Mgmt',
    dates2025: ['July 17'],
    dates2026: ['Jan 05', 'Feb 2026'],
    description: 'Supervisory Leadership, Conflict Resolution, and Team Motivation',
    trainer: '',
    venue: 'Executive Seminar Room'
  },
  {
    key: 'effectiveCommunication',
    title: 'Effective Comm',
    dates2025: ['July 29', 'July 30'],
    dates2026: ['Jan 05', 'Feb 2026'],
    description: 'Cross-Departmental Collaboration, Active Listening, and Clear Reporting',
    trainer: '',
    venue: 'Conference Hall B'
  },
  {
    key: 'changeStyleManagement',
    title: 'Change Style',
    dates2025: ['July 16'],
    dates2026: ['Jan 05', 'Feb 2026'],
    description: 'Adaptability in Manufacturing Transitions and Lean Transformation Leadership',
    trainer: '',
    venue: 'Lean Innovation Room'
  },
  {
    key: 'hrManagement',
    title: 'HR Management',
    dates2025: ['August 20'],
    dates2026: ['Jan 05', 'Feb 2026'],
    description: 'Company Policies, Labor Standards, Grievance Handling, and Employee Welfare',
    trainer: '',
    venue: 'Executive Seminar Room'
  }
];

export function calculateLeadershipStatus(
  dept: string,
  courses: LeadershipCourseAttendance,
  section?: string
): { total: number; status: 'Completed' | 'Incomplete' | 'No Show' } {
  // If special Aug-Sep 2026 batch (2 modules: 6S & Metal)
  if (section && section.includes('August – September 2026')) {
    const sCount = (courses.sixSManagement ? 1 : 0) + (courses.metalManagement ? 1 : 0);
    if (sCount === 0) return { total: 0, status: 'No Show' };
    return { total: sCount, status: sCount >= 1 ? 'Completed' : 'Incomplete' };
  }

  const score =
    (courses.machine ? 1 : 0) +
    (courses.quality ? 1 : 0) +
    (courses.sixSManagement ? 1 : 0) +
    (courses.lineBalancing ? 1 : 0) +
    (courses.teamAndManagement ? 1 : 0) +
    (courses.effectiveCommunication ? 1 : 0) +
    (courses.changeStyleManagement ? 1 : 0) +
    (courses.hrManagement ? 1 : 0);

  if (score === 0) {
    return { total: 0, status: 'No Show' };
  }

  const deptLower = (dept || '').toLowerCase();
  const isStitching = deptLower.includes('stitching');

  if (isStitching) {
    // Stitching: If the score is 5–8, Completed. If 0–4, Incomplete.
    return {
      total: score,
      status: score >= 5 ? 'Completed' : 'Incomplete'
    };
  } else {
    // Rubber, Assembly, and Cutting: If score is 4–5 (or >=4), Completed. If 0–3, Incomplete.
    return {
      total: score,
      status: score >= 4 ? 'Completed' : 'Incomplete'
    };
  }
}

/**
 * Strict Trainee Name Sanitizer:
 * Ensures any suffix or tag such as "6s/metal", "6S/Metal", "6s", or "metal" beside trainee names
 * is cleanly removed, showing the clean employee name only.
 */
export function cleanTraineeName(rawName: string): string {
  if (!rawName) return '';
  return rawName
    .replace(/\s*[\(\[\{/]?\s*6s\s*[\/\-&]?\s*metal(\s*mgmt|\s*management)?\s*[\)\]\}]?/gi, '')
    .replace(/\s*[\(\[\{/]?\s*metal\s*[\/\-&]?\s*6s(\s*mgmt|\s*management)?\s*[\)\]\}]?/gi, '')
    .replace(/\s*[\(\[\{/]?\s*6s(\s*mgmt|\s*management)?\s*[\)\]\}]?/gi, '')
    .replace(/\s*[\(\[\{/]?\s*metal(\s*mgmt|\s*management)?\s*[\)\]\}]?/gi, '')
    .replace(/\s*-\s*6s.*$/gi, '')
    .replace(/\s*-\s*metal.*$/gi, '')
    .trim();
}

export const INITIAL_LEADERSHIP_SHEET_DATA: LeadershipTraineeRow[] = (rawData as any[]).map((r, idx) => ({
  id: r.id || `lead-${r.year || 2025}-${r.no || idx + 1}`,
  no: r.no || idx + 1,
  name: cleanTraineeName(r.name),
  employeeNo: r.employeeNo || `DTP-${r.year || 2025}-${(r.no || idx + 1).toString().padStart(4, '0')}`,
  department: r.department || 'General Production',
  departmentCategory: r.departmentCategory || 'Stitching',
  trainingDate: r.trainingDate || (r.year === 2026 ? 'January 05, 2026 – February 2026' : 'July 09, 2025 – August 20, 2025'),
  year: r.year || 2025,
  sourceSheet: r.sourceSheet || (r.year === 2026 ? 'Sheet 2 (2026)' : 'Sheet 1 (2025)'),
  section: r.section || (r.year === 2026 ? 'January – February 2026 Batch' : 'July – August 2025 Batch'),
  trainingTopic: r.trainingTopic || '8 Core Leadership Modules',
  courses: {
    machine: !!r.courses?.machine,
    quality: !!r.courses?.quality,
    sixSManagement: !!r.courses?.sixSManagement,
    metalManagement: !!r.courses?.metalManagement,
    lineBalancing: !!r.courses?.lineBalancing,
    teamAndManagement: !!r.courses?.teamAndManagement,
    effectiveCommunication: !!r.courses?.effectiveCommunication,
    changeStyleManagement: !!r.courses?.changeStyleManagement,
    hrManagement: !!r.courses?.hrManagement
  },
  total: r.total || 0,
  status: (r.status as 'Completed' | 'Incomplete' | 'No Show') || 'Incomplete'
}));

export const INITIAL_LEADERSHIP_FILES: LeadershipUploadedFile[] = [
  {
    id: 'file-lead-001',
    fileName: 'LEADERSHIP_TRAINING_2025_2026_MASTER_WORKBOOK.xlsx',
    fileType: 'Excel Spreadsheet',
    fileSize: '1.8 MB',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    uploadedAt: '2026-01-10T08:30:00Z',
    uploadedBy: 'Internal Auditor (Auditor-01)',
    category: 'Training Matrix',
    description: 'Official Consolidated Workbook containing Sheet 1 (2025 Cohort) & Sheet 2 (2026 Cohort) attendance records.'
  },
  {
    id: 'file-lead-002',
    fileName: 'Leadership_Training_Syllabus_&_Course_Outline_2025_2026.pdf',
    fileType: 'PDF Document',
    fileSize: '1.4 MB',
    mimeType: 'application/pdf',
    uploadedAt: '2025-07-08T09:15:00Z',
    uploadedBy: 'HR & Training Department',
    category: 'Syllabus',
    description: 'Approved 8-Module Leadership Curriculum, Course Objectives, and Trainer Qualifications for 2025 & 2026.'
  },
  {
    id: 'file-lead-003',
    fileName: 'Signed_Attendance_Sheets_Batch_2025_July_August.pdf',
    fileType: 'PDF Document',
    fileSize: '3.8 MB',
    mimeType: 'application/pdf',
    uploadedAt: '2025-08-22T14:45:00Z',
    uploadedBy: 'Training Coordinator',
    category: 'Attendance Sheet',
    description: 'Scanned physical sign-in sheets with signatures from all 85 participants of Sheet 1 across 8 training dates.'
  },
  {
    id: 'file-lead-004',
    fileName: 'Signed_Attendance_Sheets_Batch_2026_Jan_Feb_Aug_Sep.pdf',
    fileType: 'PDF Document',
    fileSize: '4.2 MB',
    mimeType: 'application/pdf',
    uploadedAt: '2026-02-15T11:20:00Z',
    uploadedBy: 'Training Coordinator',
    category: 'Attendance Sheet',
    description: 'Scanned sign-in sheets with signatures from all 116 participants of Sheet 2 across 2026 training dates.'
  }
];
