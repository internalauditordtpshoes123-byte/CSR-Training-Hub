/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TrainingLog, TrainingCourse, TraineeRecord, TrainingDoc, StitchingRecord, DepartmentItem, SystemNotification, Employee } from './types';
import { rawEmployees } from './data/defaultTrainees';
import { INITIAL_EMPLOYEES } from './data/employeesData';
import { INITIAL_BLUEPRINT_DOCUMENTS, STANDARDIZED_REPOSITORY_FOLDERS } from './data/repositoryBlueprint';

export { INITIAL_EMPLOYEES, STANDARDIZED_REPOSITORY_FOLDERS };

// Initial logs/schedules
export const DEFAULT_TRAINING_LOGS: TrainingLog[] = [
  {
    id: 'TL-101',
    title: 'Effective Leadership Skills',
    type: 'Leadership Training',
    date: '2026-05-21',
    location: 'Training Room 1',
    instructor: 'John Smith',
    status: 'Scheduled',
    batchCode: 'LDP-2026-B1',
    traineesCount: 12,
  },
  {
    id: 'TL-102',
    title: 'Standard Sewing & Operating Procedures',
    type: 'Training Plan (Stitching)',
    date: '2026-05-23',
    location: 'Production Floor - Line 3',
    instructor: 'Mary Jane',
    status: 'In Progress',
    batchCode: 'ST-2026-B2',
    traineesCount: 24,
  },
  {
    id: 'TL-103',
    title: 'Quality Quality Awareness Core',
    type: 'Department Training',
    date: '2026-05-25',
    location: 'Training Room 2',
    instructor: 'Carlos Reyes',
    status: 'Scheduled',
    batchCode: 'DPT-QA-03',
    traineesCount: 8,
  },
  {
    id: 'TL-104',
    title: 'Supervisor Conflict Resolution',
    type: 'Leadership Training',
    date: '2026-05-18',
    location: 'Exec Lounge',
    instructor: 'Sarah Jenkins',
    status: 'Completed',
    batchCode: 'LDP-MGT-02',
    traineesCount: 15,
  },
  {
    id: 'TL-105',
    title: 'Lean Manufacturing 5S Standards',
    type: 'Department Training',
    date: '2026-05-15',
    location: 'Main Conference Room',
    instructor: 'Robert Vance',
    status: 'Completed',
    batchCode: 'LDP-LEAN-01',
    traineesCount: 30,
  },
  {
    id: 'TL-106',
    title: 'High-Speed Stitching Techniques',
    type: 'Training Plan (Stitching)',
    date: '2026-05-28',
    location: 'Stitching Cluster 2',
    instructor: 'Mary Jane',
    status: 'Pending',
    batchCode: 'ST-2026-B3',
    traineesCount: 10,
  }
];

// Initial subjects / courses
export const DEFAULT_COURSES: TrainingCourse[] = [
  {
    id: 'C-01',
    code: 'LDP-01',
    name: 'Strategic Management Essentials',
    category: 'Managerial',
    instructor: 'John Smith',
    durationHours: 16,
    description: 'Core tactical decision management course addressing organizational scaling and supervisor alignments.',
  },
  {
    id: 'C-02',
    code: 'ST-02',
    name: 'Overlock Machine Operation & Mastery',
    category: 'Operation',
    instructor: 'Mary Jane',
    durationHours: 24,
    description: 'Precision safety steps, tension control, speed ratios, and thread selection for industrial overlocking.',
  },
  {
    id: 'C-03',
    code: 'QA-03',
    name: 'Zero-Defect Quality Control Standard',
    category: 'Compliance',
    instructor: 'Carlos Reyes',
    durationHours: 8,
    description: 'Understanding blue label inspection checklists, defect classification, and rework tracking metrics.',
  },
  {
    id: 'C-04',
    code: 'SOP-04',
    name: 'Emergency Response & Safety Rules',
    category: 'Safety',
    instructor: 'Elena Torres',
    durationHours: 4,
    description: 'Interactive walkthrough of immediate safety drills, line evacuation plans, and equipment lock-out procedures.',
  }
];

// Initial trainee records (Leadership module)
export const DEFAULT_TRAINEE_RECORDS: TraineeRecord[] = [
  {
    id: 'TR-01',
    employeeId: 'EMP-9021',
    name: 'Juan Dela Cruz',
    department: 'Sewing Department',
    courseName: 'Strategic Management Essentials',
    attendance: 'Present',
    score: 88,
    evaluation: 'Pass',
    date: '2026-05-18',
    historyLogs: ['Enrolled: 2026-05-01', 'Mid-term eval: 82%', 'Final Exam: 88%'],
  },
  {
    id: 'TR-02',
    employeeId: 'EMP-3882',
    name: 'Maria Santos',
    department: 'Quality Assurance',
    courseName: 'Strategic Management Essentials',
    attendance: 'Present',
    score: 95,
    evaluation: 'Pass',
    date: '2026-05-18',
    historyLogs: ['Enrolled: 2026-05-01', 'Exemplary mid-term performance', 'Final Exam: 95%'],
  },
  {
    id: 'TR-03',
    employeeId: 'EMP-4412',
    name: 'Ana Reyes',
    department: 'Cutting Line 2',
    courseName: 'Zero-Defect Quality Control Standard',
    attendance: 'Present',
    score: 55,
    evaluation: 'Fail',
    date: '2026-05-21',
    historyLogs: ['Enrolled: 2026-05-10', 'Incomplete exercises', 'Failed final inspection exam'],
  },
  {
    id: 'TR-04',
    employeeId: 'EMP-7331',
    name: 'Pedro Garcia',
    department: 'Stitching Line A',
    courseName: 'Emergency Response & Safety Rules',
    attendance: 'Absent',
    score: 0,
    evaluation: 'In Progress',
    date: '2026-05-22',
    historyLogs: ['Enrolled: 2026-05-11', 'Absent during scheduled shift'],
  }
];

// Initial documents
export const DEFAULT_DOCUMENTS: TrainingDoc[] = [
  ...INITIAL_BLUEPRINT_DOCUMENTS,
  {
    id: 'DOC-01',
    name: 'High-Impact Stitching SOP V2',
    type: 'SOP',
    fileName: 'high_impact_stitching_sop_v2.pdf',
    uploadedBy: 'John Smith',
    uploadDate: '2026-05-10',
    fileSize: '4.2 MB',
    category: 'Stitching Standard',
  },
  {
    id: 'DOC-02',
    name: 'Supervisor Leadership Certificate Template',
    type: 'Certificate',
    fileName: 'leadership_cert_template.docx',
    uploadedBy: 'Sarah Jenkins',
    uploadDate: '2026-05-12',
    fileSize: '1.8 MB',
    category: 'Management Standards',
  },
  {
    id: 'DOC-03',
    name: 'Overlock Machine Guidebook & Troubleshooting',
    type: 'Material',
    fileName: 'overlock_guidebook_v4.pdf',
    uploadedBy: 'Mary Jane',
    uploadDate: '2026-05-14',
    fileSize: '12.5 MB',
    category: 'Operator Training',
  },
  {
    id: 'DOC-04',
    name: 'Zero-Defect Inspection Quality Guide',
    type: 'SOP',
    fileName: 'inspection_quality_guidelines.pdf',
    uploadedBy: 'Carlos Reyes',
    uploadDate: '2026-05-15',
    fileSize: '2.9 MB',
    category: 'Quality Assurance',
  },
  {
    id: 'DOC-05',
    name: 'Brother Overlock Sewing Machine Parts Blueprint',
    type: 'Material',
    fileName: 'overlock_machine_parts.png',
    uploadedBy: 'Elena Rostova',
    uploadDate: '2026-05-16',
    fileSize: '1.4 MB',
    category: 'Operator Training',
    fileUrl: 'https://images.unsplash.com/photo-1590105251760-af8f9bb19ac4?q=80&w=640&auto=format&fit=crop'
  },
  {
    id: 'DOC-06',
    name: 'Floor Operator Personal Protective Equipment Layout',
    type: 'SOP',
    fileName: 'safety_ppe_checklist.jpg',
    uploadedBy: 'Carlos Reyes',
    uploadDate: '2026-05-18',
    fileSize: '890 KB',
    category: 'Stitching Standard',
    fileUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=640&auto=format&fit=crop'
  }
];

// Initial Stitching Training plan (Stitching module) - Connected live to Google Sheets
export const DEFAULT_STITCHING_RECORDS: StitchingRecord[] = [];

// Initial Department training records
export const DEFAULT_DEPARTMENT_ITEMS: DepartmentItem[] = [
  {
    id: 'DPT-01',
    departmentName: 'Assembly Line',
    trainingContent: 'Standard Work Combination Sheets',
    instructorName: 'John Smith',
    leaderName: 'Arthur Dent',
    scheduleDate: '2026-05-24',
    attendanceRate: 94.5,
    performanceScore: 8.5,
    status: 'In Progress',
  },
  {
    id: 'DPT-02',
    departmentName: 'Cutting Department',
    trainingContent: 'Knife Safety and Die Alignment Guides',
    instructorName: 'Sarah Jenkins',
    leaderName: 'Monica Geller',
    scheduleDate: '2026-05-20',
    attendanceRate: 100,
    performanceScore: 9.2,
    status: 'Completed',
  },
  {
    id: 'DPT-03',
    departmentName: 'Outsole Unit Preparation',
    trainingContent: 'Eco-Friendly Adhesive Operations',
    instructorName: 'Carlos Reyes',
    leaderName: 'Tony Stark',
    scheduleDate: '2026-05-26',
    attendanceRate: 88,
    performanceScore: 7.8,
    status: 'Pending',
  },
  {
    id: 'DPT-04',
    departmentName: 'Warehouse Logistics',
    trainingContent: 'Overhead Crane Operation & Stacking Certs',
    instructorName: 'Robert Vance',
    leaderName: 'Michael Scott',
    scheduleDate: '2026-05-14',
    attendanceRate: 91.2,
    performanceScore: 8.9,
    status: 'Completed',
  }
];

// Initial Notifications
export const DEFAULT_NOTIFICATIONS: SystemNotification[] = [
  {
    id: 'N-1',
    title: 'New SOP Document Uploaded',
    message: 'Carlos Reyes uploaded "Zero-Defect Inspection Quality Guide V3.pdf" inside Quality SOPs.',
    time: '2 hours ago',
    type: 'success',
    read: false,
  },
  {
    id: 'N-2',
    title: 'Trainee At Risk Notification',
    message: 'Trainee Kevin Thompson actual Takt Time is 20% slower than Target Takt Time on Modern Sports Runner.',
    time: '4 hours ago',
    type: 'warning',
    read: false,
  },
  {
    id: 'N-3',
    title: 'Calendar Alert',
    message: 'Upcoming "Strategic Management Essentials" Training starts tomorrow at Room 1.',
    time: '1 day ago',
    type: 'info',
    read: true,
  }
];

export interface EmployeeDiffs {
  added?: Employee[];
  modified?: Record<string, Partial<Employee>>;
  deleted?: string[];
}

// Map of initial employees for fast lookup
const INITIAL_MAP = new Map<string, Employee>();
INITIAL_EMPLOYEES.forEach(e => INITIAL_MAP.set(e.id, e));

export function getSavedEmployees(): Employee[] {
  try {
    // 1. Remove old huge key if it exists in localStorage to free up browser quota
    localStorage.removeItem('tms_employees_records');

    // Invalidate stale client diffs when roster is freshly updated
    const CURRENT_ROSTER_VERSION = 'roster_2026_deduped_v1';
    if (localStorage.getItem('tms_roster_ver') !== CURRENT_ROSTER_VERSION) {
      localStorage.removeItem('tms_employees_diffs');
      localStorage.removeItem('csr_cached_employees');
      localStorage.setItem('tms_roster_ver', CURRENT_ROSTER_VERSION);
      return INITIAL_EMPLOYEES;
    }

    // 2. Read diffs
    const diffsRaw = localStorage.getItem('tms_employees_diffs');
    if (!diffsRaw) {
      return INITIAL_EMPLOYEES;
    }

    const diffs: EmployeeDiffs = JSON.parse(diffsRaw);
    const deletedSet = new Set(diffs.deleted || []);
    const modifiedMap = diffs.modified || {};
    const addedList = diffs.added || [];

    const seenIds = new Set<string>();
    const seenNos = new Set<string>();
    const result: Employee[] = [];

    // Added list (new records)
    for (let i = 0; i < addedList.length; i++) {
      const emp = addedList[i];
      if (!emp) continue;
      const id = String(emp.id || `emp-add-${i}`);
      const empNo = emp.employeeNo ? String(emp.employeeNo) : '';
      if (!seenIds.has(id) && (!empNo || !seenNos.has(empNo))) {
        seenIds.add(id);
        if (empNo) seenNos.add(empNo);
        result.push({ ...emp, id });
      }
    }

    // Base roster
    for (let i = 0; i < INITIAL_EMPLOYEES.length; i++) {
      const original = INITIAL_EMPLOYEES[i];
      if (deletedSet.has(original.id)) continue;
      const id = String(original.id);
      const empNo = original.employeeNo ? String(original.employeeNo) : '';
      
      if (!seenIds.has(id) && (!empNo || !seenNos.has(empNo))) {
        seenIds.add(id);
        if (empNo) seenNos.add(empNo);
        if (modifiedMap[original.id]) {
          result.push({ ...original, ...modifiedMap[original.id], id });
        } else {
          result.push(original);
        }
      }
    }

    return result;
  } catch (e) {
    console.warn('Error loading employees diffs, defaulting to master roster', e);
    return INITIAL_EMPLOYEES;
  }
}

export function saveSavedEmployees(currentList: Employee[]): void {
  try {
    // Clean up any legacy full key
    localStorage.removeItem('tms_employees_records');

    if (!currentList || currentList.length === 0) return;

    const added: Employee[] = [];
    const modified: Record<string, Partial<Employee>> = {};
    const currentIdSet = new Set<string>();
    const seenAddedIds = new Set<string>();

    for (let i = 0; i < currentList.length; i++) {
      const emp = currentList[i];
      if (!emp) continue;
      currentIdSet.add(emp.id);
      const original = INITIAL_MAP.get(emp.id);
      if (!original) {
        // It's a new added employee (ensure no duplicates in added array)
        if (!seenAddedIds.has(emp.id)) {
          seenAddedIds.add(emp.id);
          added.push(emp);
        }
      } else {
        // Check if modified
        const diff: Partial<Employee> = {};
        let isDiff = false;
        if (emp.name !== original.name) { diff.name = emp.name; isDiff = true; }
        if (emp.employeeNo !== original.employeeNo) { diff.employeeNo = emp.employeeNo; isDiff = true; }
        if (emp.department !== original.department) { diff.department = emp.department; isDiff = true; }
        if (emp.position !== original.position) { diff.position = emp.position; isDiff = true; }
        if (emp.onBoardDate !== original.onBoardDate) { diff.onBoardDate = emp.onBoardDate; isDiff = true; }
        if (emp.status !== original.status) { diff.status = emp.status; isDiff = true; }
        if (emp.done !== original.done) { diff.done = emp.done; isDiff = true; }

        if (isDiff) {
          modified[emp.id] = diff;
        }
      }
    }

    const deleted: string[] = [];
    INITIAL_MAP.forEach((_, id) => {
      if (!currentIdSet.has(id)) {
        deleted.push(id);
      }
    });

    // Only save if there are diffs
    if (added.length === 0 && Object.keys(modified).length === 0 && deleted.length === 0) {
      localStorage.removeItem('tms_employees_diffs');
    } else {
      const diffs: EmployeeDiffs = { added, modified, deleted };
      localStorage.setItem('tms_employees_diffs', JSON.stringify(diffs));
    }
  } catch (e) {
    console.warn('Error saving employee diffs to storage', e);
  }
}

// Simple helper local storage loaders
export function getSavedState<T>(key: string, defaultData: T): T {
  if (key === 'employees_records') {
    return getSavedEmployees() as unknown as T;
  }
  try {
    const saved = localStorage.getItem(`tms_${key}`);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.warn(`Error reading ${key} from storage`, e);
  }
  return defaultData;
}

export function saveStateToStorage<T>(key: string, data: T): void {
  if (key === 'employees_records') {
    saveSavedEmployees(data as unknown as Employee[]);
    return;
  }
  try {
    localStorage.setItem(`tms_${key}`, JSON.stringify(data));
  } catch (e) {
    console.warn(`Storage quota or write issue for ${key}:`, e);
  }
}
