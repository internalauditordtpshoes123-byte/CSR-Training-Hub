export interface ScheduleCourseContent {
  stepNo: number;
  topic: string;
}

export interface TraineeLeaderInfo {
  id: string;
  name: string;
  employeeNo: string;
  department: string;
  lineOrSection: string;
  position?: string;
  attended?: boolean;
}

export interface LeadershipDocumentationItem {
  id: string;
  name: string;
  type: 'photo' | 'attendance_sheet' | 'syllabus' | 'document' | 'other';
  url?: string;
  size?: string;
  uploadedAt: string;
  uploadedBy?: string;
}

export interface LeadershipScheduleItem {
  id: string;
  trainingDate: string; // e.g. "August 27, 2026" or "July 09, 2025"
  isoDate: string; // e.g. "2026-08-27"
  year?: number | null; // 2025 | 2026 | null
  dayOfWeek: string; // e.g. "Thursday"
  time: string; // e.g. "2:00-3:00pm" or "1:00-2:00pm"
  trainingTopic: string; // e.g. "HR Management"
  trainer?: string;
  trainerRole?: string;
  departmentSection: string; // e.g. "Factory-Wide Supervisory Staff & Section Leaders"
  batch: string; // e.g. "Cohort 2026 (August Batch)"
  venue: string; // e.g. "TRAINING ROOM DTP" or "Conference Room D2P"
  status: 'Upcoming' | 'Ongoing' | 'Completed' | 'Rescheduled' | 'Cancelled';
  purposeAndRemarks: string; // e.g. "HR Management training is conducted to guide leaders..."
  content: string[]; // List of modules / contents
  traineeLeadersCount: number;
  traineeLeaders: TraineeLeaderInfo[];
  notes?: string;
  documentation?: LeadershipDocumentationItem[];
}

export interface LeadershipYearSummary {
  year: number;
  totalRecords: number;
  totalParticipants: number;
  totalHours: number;
  completedTrainings: number;
  scheduledTrainings: number;
  cancelledTrainings: number;
}

export function extractYearFromDate(dateStr?: string | null): { year: number | null; isReviewNeeded: boolean } {
  if (!dateStr || typeof dateStr !== 'string' || !dateStr.trim()) {
    return { year: null, isReviewNeeded: true };
  }
  const str = dateStr.trim();
  // Look for 4-digit year 2020-2035
  const match = str.match(/\b(20\d{2})\b/);
  if (match) {
    const y = parseInt(match[1], 10);
    return { year: y, isReviewNeeded: false };
  }
  // Try JS Date parsing
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    if (y >= 2000 && y <= 2100) {
      return { year: y, isReviewNeeded: false };
    }
  }
  return { year: null, isReviewNeeded: true };
}

export function calculateYearSummaryMetrics(schedules: LeadershipScheduleItem[], targetYear: number): LeadershipYearSummary {
  const yearRecords = schedules.filter((s) => {
    if (s.year === targetYear) return true;
    const { year } = extractYearFromDate(s.isoDate || s.trainingDate);
    return year === targetYear;
  });

  let totalParticipants = 0;
  let totalHours = 0;
  let completedTrainings = 0;
  let scheduledTrainings = 0;
  let cancelledTrainings = 0;

  yearRecords.forEach((s) => {
    const count = s.traineeLeadersCount || (s.traineeLeaders ? s.traineeLeaders.length : 0) || 0;
    totalParticipants += count;

    let hours = 1.0;
    if (s.time) {
      const match = s.time.match(/(\d+)(?::(\d+))?\s*(?:to|-)\s*(\d+)(?::(\d+))?/i);
      if (match) {
        let startH = parseInt(match[1], 10);
        const startM = match[2] ? parseInt(match[2], 10) : 0;
        let endH = parseInt(match[3], 10);
        const endM = match[4] ? parseInt(match[4], 10) : 0;
        if (s.time.toLowerCase().includes('pm') && endH < 12) endH += 12;
        if (s.time.toLowerCase().includes('pm') && startH < 12 && startH <= 6) startH += 12;
        const diff = (endH * 60 + endM) - (startH * 60 + startM);
        if (diff > 0 && diff <= 480) {
          hours = Math.round((diff / 60) * 10) / 10;
        }
      }
    }
    totalHours += hours;

    if (s.status === 'Completed') {
      completedTrainings++;
    } else if (s.status === 'Cancelled') {
      cancelledTrainings++;
    } else {
      scheduledTrainings++;
    }
  });

  return {
    year: targetYear,
    totalRecords: yearRecords.length,
    totalParticipants,
    totalHours: Math.round(totalHours * 10) / 10,
    completedTrainings,
    scheduledTrainings,
    cancelledTrainings
  };
}

// Official Schedule data strictly from uploaded document:
// 2025: Batch July - August 2025 (Sheet 1)
// 2026: SUBJECT & SCHEDULE (TRAINING ROOM DTP & Conference Room D2P)
export const OFFICIAL_LEADERSHIP_SCHEDULES: LeadershipScheduleItem[] = [
  // ==========================================
  // 2025 OFFICIAL SESSIONS (SHEET 1 BATCH)
  // ==========================================
  {
    id: 'dtp-sched-2025-mach-jul09',
    trainingDate: 'July 09, 2025',
    isoDate: '2025-07-09',
    year: 2025,
    dayOfWeek: 'Wednesday',
    time: '2:00-3:00pm',
    trainingTopic: 'Machine Maintenance & Safety Operation',
    trainer: '',
    trainerRole: '',
    departmentSection: 'Factory-Wide Supervisory Staff & Line Leaders',
    batch: 'Cohort 2025 (July - August Batch)',
    venue: 'Technical Training Lab A',
    status: 'Completed',
    purposeAndRemarks: 'Machine training is conducted to ensure supervisors understand equipment maintenance, daily pre-shift inspection, and safe operating guidelines.',
    content: [
      '1. Daily Pre-Shift Machine Safety Inspection',
      '2. Lubrication & Preventive Maintenance Protocol',
      '3. Emergency Stop & Lockout-Tagout (LOTO)'
    ],
    traineeLeadersCount: 85,
    traineeLeaders: [
      { id: 'ldr-25-01', name: '', employeeNo: 'DTP-2025-0001', department: 'Stitching', lineOrSection: 'Stitching Line A8', position: 'Line Leader', attended: true },
      { id: 'ldr-25-02', name: '', employeeNo: 'DTP-2025-0002', department: 'Stitching', lineOrSection: 'Stitching Line A10', position: 'Supervisor', attended: true },
      { id: 'ldr-25-03', name: '', employeeNo: 'DTP-2025-0003', department: 'Stitching', lineOrSection: 'Stitching Line B20', position: 'Line Leader', attended: true },
      { id: 'ldr-25-04', name: '', employeeNo: 'DTP-2025-0004', department: 'Assembly', lineOrSection: 'Assembly Line B8', position: 'Section Head', attended: true }
    ],
    notes: 'Official 2025 Sheet 1 Session. Physical sign-in sheet signed and verified.',
    documentation: [
      { id: 'doc-25-mach-1', name: 'Photo 1 - Machine Maintenance Demonstration.jpg', type: 'photo', size: '2.3 MB', uploadedAt: 'July 09, 2025', uploadedBy: 'Training Division' },
      { id: 'doc-25-mach-2', name: 'Photo 2 - Supervisory Safety Checklist Review.jpg', type: 'photo', size: '1.9 MB', uploadedAt: 'July 09, 2025', uploadedBy: 'Training Division' },
      { id: 'doc-25-mach-3', name: 'Attendance Sheet - Signed Machine Module.pdf', type: 'attendance_sheet', size: '1.1 MB', uploadedAt: 'July 09, 2025', uploadedBy: 'Training Division' }
    ]
  },
  {
    id: 'dtp-sched-2025-qc-jul10',
    trainingDate: 'July 10, 2025',
    isoDate: '2025-07-10',
    year: 2025,
    dayOfWeek: 'Thursday',
    time: '2:00-3:00pm',
    trainingTopic: 'Quality Standards & Defect Prevention',
    trainer: '',
    trainerRole: '',
    departmentSection: 'Stitching, Cutting, Assembly & QC Section Leaders',
    batch: 'Cohort 2025 (July - August Batch)',
    venue: 'QA Training Center',
    status: 'Completed',
    purposeAndRemarks: 'Quality standards training guides line leaders on zero-defect inspection, root cause identification, and quality compliance across production cells.',
    content: [
      '1. 7 Critical Inspection Points',
      '2. In-Line Quality Defect Categorization',
      '3. Immediate Containment Action Protocol'
    ],
    traineeLeadersCount: 85,
    traineeLeaders: [
      { id: 'ldr-25-01', name: '', employeeNo: 'DTP-2025-0001', department: 'Stitching', lineOrSection: 'Stitching Line A8', position: 'Line Leader', attended: true },
      { id: 'ldr-25-02', name: '', employeeNo: 'DTP-2025-0002', department: 'Stitching', lineOrSection: 'Stitching Line A10', position: 'Supervisor', attended: true },
      { id: 'ldr-25-05', name: '', employeeNo: 'DTP-2025-0005', department: 'Cutting', lineOrSection: 'Cutting Section 1', position: 'Supervisor', attended: true }
    ],
    notes: 'Official 2025 Sheet 1 Session. Complete QA standards evaluation completed.',
    documentation: [
      { id: 'doc-25-qc-1', name: 'Photo 1 - Defect Categorization Session.jpg', type: 'photo', size: '2.1 MB', uploadedAt: 'July 10, 2025', uploadedBy: 'Training Division' },
      { id: 'doc-25-qc-2', name: 'Photo 2 - QA Inspection Practice.jpg', type: 'photo', size: '2.0 MB', uploadedAt: 'July 10, 2025', uploadedBy: 'Training Division' },
      { id: 'doc-25-qc-3', name: 'Attendance Sheet - Signed Quality Module.pdf', type: 'attendance_sheet', size: '890 KB', uploadedAt: 'July 10, 2025', uploadedBy: 'Training Division' }
    ]
  },
  {
    id: 'dtp-sched-2025-line-jul11',
    trainingDate: 'July 11, 2025',
    isoDate: '2025-07-11',
    year: 2025,
    dayOfWeek: 'Friday',
    time: '2:00-3:00pm',
    trainingTopic: 'Line Balancing & Workstation Ergonomics',
    trainer: '',
    trainerRole: '',
    departmentSection: 'Factory-Wide Assembly & Stitching Leaders',
    batch: 'Cohort 2025 (July - August Batch)',
    venue: 'IE Workshop Room',
    status: 'Completed',
    purposeAndRemarks: 'Instruction on pitch time, takt time, workstation distribution, and ergonomic posture to maximize line efficiency and reduce operator strain.',
    content: [
      '1. Takt Time vs Cycle Time Calculations',
      '2. Bottleneck Station Reallocation',
      '3. Ergonomic Layout and Posture Standards'
    ],
    traineeLeadersCount: 85,
    traineeLeaders: [
      { id: 'ldr-25-01', name: '', employeeNo: 'DTP-2025-0001', department: 'Stitching', lineOrSection: 'Stitching Line A8', position: 'Line Leader', attended: true },
      { id: 'ldr-25-04', name: '', employeeNo: 'DTP-2025-0004', department: 'Assembly', lineOrSection: 'Assembly Line B8', position: 'Section Head', attended: true }
    ],
    notes: 'Official 2025 Sheet 1 Session.',
    documentation: [
      { id: 'doc-25-line-1', name: 'Photo 1 - Takt Time Floor Simulation.jpg', type: 'photo', size: '2.5 MB', uploadedAt: 'July 11, 2025', uploadedBy: 'Training Division' },
      { id: 'doc-25-line-2', name: 'Photo 2 - IE Balancing Board Practice.jpg', type: 'photo', size: '1.8 MB', uploadedAt: 'July 11, 2025', uploadedBy: 'Training Division' },
      { id: 'doc-25-line-3', name: 'Attendance Sheet - Signed Line Balancing Module.pdf', type: 'attendance_sheet', size: '1.2 MB', uploadedAt: 'July 11, 2025', uploadedBy: 'Training Division' }
    ]
  },
  {
    id: 'dtp-sched-2025-6s-jul12',
    trainingDate: 'July 12, 2025',
    isoDate: '2025-07-12',
    year: 2025,
    dayOfWeek: 'Saturday',
    time: '2:00-3:00pm',
    trainingTopic: '6S Workplace Management & Safety Discipline',
    trainer: '',
    trainerRole: '',
    departmentSection: 'All Factory Divisions',
    batch: 'Cohort 2025 (July - August Batch)',
    venue: 'Main Training Hall',
    status: 'Completed',
    purposeAndRemarks: '6S training trains supervisors in daily Sort, Set in Order, Shine, Standardize, Sustain, and Safety audits across plant work areas.',
    content: [
      '1. Red Tagging System & Sort Protocols',
      '2. Visual Management & Demarcation Lines',
      '3. Daily Supervisory 6S 5-Minute Checklist'
    ],
    traineeLeadersCount: 85,
    traineeLeaders: [
      { id: 'ldr-25-01', name: '', employeeNo: 'DTP-2025-0001', department: 'Stitching', lineOrSection: 'Stitching Line A8', position: 'Line Leader', attended: true },
      { id: 'ldr-25-06', name: '', employeeNo: 'DTP-2025-0006', department: 'QC / Lab', lineOrSection: 'Inspection Cell', position: 'Line Leader', attended: true }
    ],
    notes: 'Official 2025 Sheet 1 Session.',
    documentation: [
      { id: 'doc-25-6s-1', name: 'Photo 1 - 6S Workplace Audit Exercise.jpg', type: 'photo', size: '2.4 MB', uploadedAt: 'July 12, 2025', uploadedBy: 'Training Division' },
      { id: 'doc-25-6s-2', name: 'Photo 2 - Visual Floor Demarcation Review.jpg', type: 'photo', size: '2.1 MB', uploadedAt: 'July 12, 2025', uploadedBy: 'Training Division' },
      { id: 'doc-25-6s-3', name: 'Attendance Sheet - Signed 6S Module.pdf', type: 'attendance_sheet', size: '970 KB', uploadedAt: 'July 12, 2025', uploadedBy: 'Training Division' }
    ]
  },
  {
    id: 'dtp-sched-2025-style-jul16',
    trainingDate: 'July 16, 2025',
    isoDate: '2025-07-16',
    year: 2025,
    dayOfWeek: 'Wednesday',
    time: '2:00-3:00pm',
    trainingTopic: 'Change Style Management & Lean Leadership',
    trainer: '',
    trainerRole: '',
    departmentSection: 'Supervisory Staff & Line Leaders',
    batch: 'Cohort 2025 (July - August Batch)',
    venue: 'Lean Innovation Room',
    status: 'Completed',
    purposeAndRemarks: 'Assisting leaders to diagnose individual change styles (Conserver, Pragmatist, Originator) and overcome resistance to lean transformations.',
    content: [
      '1. Understanding Change Style Indicators',
      '2. Collaborative Problem Solving',
      '3. Leading Line Transitions & Kaizen Events'
    ],
    traineeLeadersCount: 85,
    traineeLeaders: [
      { id: 'ldr-25-02', name: '', employeeNo: 'DTP-2025-0002', department: 'Stitching', lineOrSection: 'Stitching Line A10', position: 'Supervisor', attended: true },
      { id: 'ldr-25-04', name: '', employeeNo: 'DTP-2025-0004', department: 'Assembly', lineOrSection: 'Assembly Line B8', position: 'Section Head', attended: true }
    ],
    notes: 'Official 2025 Sheet 1 Session.',
    documentation: [
      { id: 'doc-25-style-1', name: 'Photo 1 - Change Style Assessment Group.jpg', type: 'photo', size: '2.0 MB', uploadedAt: 'July 16, 2025', uploadedBy: 'Training Division' },
      { id: 'doc-25-style-2', name: 'Photo 2 - Kaizen Leadership Presentation.jpg', type: 'photo', size: '1.7 MB', uploadedAt: 'July 16, 2025', uploadedBy: 'Training Division' },
      { id: 'doc-25-style-3', name: 'Attendance Sheet - Signed Change Style Module.pdf', type: 'attendance_sheet', size: '1.0 MB', uploadedAt: 'July 16, 2025', uploadedBy: 'Training Division' }
    ]
  },
  {
    id: 'dtp-sched-2025-team-jul17',
    trainingDate: 'July 17, 2025',
    isoDate: '2025-07-17',
    year: 2025,
    dayOfWeek: 'Thursday',
    time: '2:00-3:00pm',
    trainingTopic: 'Team & Management (PDCA & Conflict Resolution)',
    trainer: '',
    trainerRole: '',
    departmentSection: 'All Factory Divisions',
    batch: 'Cohort 2025 (July - August Batch)',
    venue: 'Executive Seminar Room',
    status: 'Completed',
    purposeAndRemarks: 'Fostering teamwork, applying Plan-Do-Check-Act methodologies, and resolving line conflicts constructively.',
    content: [
      '1. Distinguishing Groups vs High-Performance Teams',
      '2. Practical PDCA Cycle for Daily Production Issues',
      '3. Conflict Mediation & Respectful Feedback'
    ],
    traineeLeadersCount: 85,
    traineeLeaders: [
      { id: 'ldr-25-01', name: '', employeeNo: 'DTP-2025-0001', department: 'Stitching', lineOrSection: 'Stitching Line A8', position: 'Line Leader', attended: true },
      { id: 'ldr-25-07', name: '', employeeNo: 'DTP-2025-0007', department: 'Rubber', lineOrSection: 'Milling & Press', position: 'Supervisor', attended: true }
    ],
    notes: 'Official 2025 Sheet 1 Session.',
    documentation: [
      { id: 'doc-25-team-1', name: 'Photo 1 - Team Dynamic Exercise.jpg', type: 'photo', size: '2.6 MB', uploadedAt: 'July 17, 2025', uploadedBy: 'Training Division' },
      { id: 'doc-25-team-2', name: 'Photo 2 - PDCA Workshop Discussion.jpg', type: 'photo', size: '1.9 MB', uploadedAt: 'July 17, 2025', uploadedBy: 'Training Division' },
      { id: 'doc-25-team-3', name: 'Attendance Sheet - Signed Team Management Module.pdf', type: 'attendance_sheet', size: '1.3 MB', uploadedAt: 'July 17, 2025', uploadedBy: 'Training Division' }
    ]
  },
  {
    id: 'dtp-sched-2025-comm-jul29',
    trainingDate: 'July 29, 2025',
    isoDate: '2025-07-29',
    year: 2025,
    dayOfWeek: 'Tuesday',
    time: '2:00-3:00pm',
    trainingTopic: 'Effective Communication & Active Listening',
    trainer: '',
    trainerRole: '',
    departmentSection: 'Factory-Wide Supervisory Staff & Section Leaders',
    batch: 'Cohort 2025 (July - August Batch)',
    venue: 'Conference Hall B',
    status: 'Completed',
    purposeAndRemarks: 'Developing clear verbal communication, active listening, and empathetic supervisory instructions across diverse floor teams.',
    content: [
      '1. Communication Cycle & Barrier Removal',
      '2. Active Listening & Verification Questions',
      '3. Giving Constructive Feedback Without Demotivation'
    ],
    traineeLeadersCount: 85,
    traineeLeaders: [
      { id: 'ldr-25-03', name: '', employeeNo: 'DTP-2025-0003', department: 'Stitching', lineOrSection: 'Stitching Line B20', position: 'Line Leader', attended: true },
      { id: 'ldr-25-05', name: '', employeeNo: 'DTP-2025-0005', department: 'Cutting', lineOrSection: 'Cutting Section 1', position: 'Supervisor', attended: true }
    ],
    notes: 'Official 2025 Sheet 1 Session.',
    documentation: [
      { id: 'doc-25-comm-1', name: 'Photo 1 - Active Listening Roleplay.jpg', type: 'photo', size: '2.2 MB', uploadedAt: 'July 29, 2025', uploadedBy: 'Training Division' },
      { id: 'doc-25-comm-2', name: 'Photo 2 - Supervisory Communication Presentation.jpg', type: 'photo', size: '1.8 MB', uploadedAt: 'July 29, 2025', uploadedBy: 'Training Division' },
      { id: 'doc-25-comm-3', name: 'Attendance Sheet - Signed Communication Module.pdf', type: 'attendance_sheet', size: '1.1 MB', uploadedAt: 'July 29, 2025', uploadedBy: 'Training Division' }
    ]
  },
  {
    id: 'dtp-sched-2025-hrm-aug20',
    trainingDate: 'August 20, 2025',
    isoDate: '2025-08-20',
    year: 2025,
    dayOfWeek: 'Wednesday',
    time: '2:00-3:00pm',
    trainingTopic: 'HR Management, Code of Conduct & Labor Standards',
    trainer: '',
    trainerRole: '',
    departmentSection: 'All Factory Divisions',
    batch: 'Cohort 2025 (July - August Batch)',
    venue: 'Executive Seminar Room',
    status: 'Completed',
    purposeAndRemarks: 'Ensuring leaders adhere strictly to Datian CSR standards, non-discrimination, lawful attendance logging, and proper grievance handling.',
    content: [
      '1. Company Code of Conduct & CSR Expectations',
      '2. Fair Disciplinary Procedures & Due Process',
      '3. Formal & Informal Grievance Handling Protocol'
    ],
    traineeLeadersCount: 85,
    traineeLeaders: [
      { id: 'ldr-25-01', name: '', employeeNo: 'DTP-2025-0001', department: 'Stitching', lineOrSection: 'Stitching Line A8', position: 'Line Leader', attended: true },
      { id: 'ldr-25-02', name: '', employeeNo: 'DTP-2025-0002', department: 'Stitching', lineOrSection: 'Stitching Line A10', position: 'Supervisor', attended: true },
      { id: 'ldr-25-04', name: '', employeeNo: 'DTP-2025-0004', department: 'Assembly', lineOrSection: 'Assembly Line B8', position: 'Section Head', attended: true },
      { id: 'ldr-25-08', name: '', employeeNo: 'DTP-2025-0008', department: 'Warehouse', lineOrSection: 'Raw Materials', position: 'Supervisor', attended: true }
    ],
    notes: 'Official 2025 Sheet 1 Session. Culmination of 2025 Cohort.',
    documentation: [
      { id: 'doc-25-hrm-1', name: 'Photo 1 - HR Labor Standards Lecture.jpg', type: 'photo', size: '2.5 MB', uploadedAt: 'August 20, 2025', uploadedBy: 'Training Division' },
      { id: 'doc-25-hrm-2', name: 'Photo 2 - Grievance Handling Simulation.jpg', type: 'photo', size: '1.9 MB', uploadedAt: 'August 20, 2025', uploadedBy: 'Training Division' },
      { id: 'doc-25-hrm-3', name: 'Attendance Sheet - Signed HR Management Module.pdf', type: 'attendance_sheet', size: '1.4 MB', uploadedAt: 'August 20, 2025', uploadedBy: 'Training Division' }
    ]
  },

  // ==========================================
  // 2026 OFFICIAL SESSIONS (TRAINING ROOM DTP)
  // ==========================================
  {
    id: 'dtp-sched-hrm-aug27',
    trainingDate: 'August 27, 2026',
    isoDate: '2026-08-27',
    year: 2026,
    dayOfWeek: 'Thursday',
    time: '2:00-3:00pm',
    trainingTopic: 'HR Management',
    trainer: '',
    trainerRole: '',
    departmentSection: 'Factory-Wide Supervisory Staff & Line Leaders',
    batch: 'Cohort 2026 (DTP Batch)',
    venue: 'TRAINING ROOM DTP',
    status: 'Completed',
    purposeAndRemarks: 'HR Management training is conducted to guide leaders in handling attendance, discipline, grievances, and promoting a respectful and compliant workplace.',
    content: [
      '1. Attendance Management',
      '2. Grievance Handle',
      '3. Code of conduct'
    ],
    traineeLeadersCount: 24,
    traineeLeaders: [
      { id: 'ldr-01', name: '', employeeNo: 'DTP-2026-0001', department: 'Stitching', lineOrSection: 'Stitching Line A8', attended: true },
      { id: 'ldr-02', name: '', employeeNo: 'DTP-2026-0002', department: 'Stitching', lineOrSection: 'Stitching Line A10', attended: true },
      { id: 'ldr-03', name: '', employeeNo: 'DTP-2026-0003', department: 'Stitching', lineOrSection: 'Stitching Line B20', attended: true },
      { id: 'ldr-04', name: '', employeeNo: 'DTP-2026-0004', department: 'Assembly', lineOrSection: 'Assembly Line B8', attended: true },
      { id: 'ldr-05', name: '', employeeNo: 'DTP-2026-0005', department: 'Cutting', lineOrSection: 'Cutting Section 1', attended: true },
      { id: 'ldr-06', name: '', employeeNo: 'DTP-2026-0006', department: 'QC / Lab', lineOrSection: 'Inspection Cell', attended: true },
      { id: 'ldr-07', name: '', employeeNo: 'DTP-2026-0007', department: 'Rubber', lineOrSection: 'Milling & Press', attended: true },
      { id: 'ldr-08', name: '', employeeNo: 'DTP-2026-0008', department: 'Warehouse', lineOrSection: 'Raw Materials', attended: true }
    ],
    notes: 'Source: SUBJECT & SCHEDULE (TRAINING ROOM DTP). Physical attendance recorded.',
    documentation: [
      { id: 'doc-dtp-aug27-1', name: 'Photo 1 - HR Code of Conduct Floor Session.jpg', type: 'photo', size: '2.4 MB', uploadedAt: 'August 27, 2026', uploadedBy: 'Training Division' },
      { id: 'doc-dtp-aug27-2', name: 'Photo 2 - Grievance Handling Roleplay.jpg', type: 'photo', size: '1.8 MB', uploadedAt: 'August 27, 2026', uploadedBy: 'Training Division' },
      { id: 'doc-dtp-aug27-3', name: 'Attendance Sheet - Signed Supervisory Roster.pdf', type: 'attendance_sheet', size: '940 KB', uploadedAt: 'August 27, 2026', uploadedBy: 'Training Division' }
    ]
  },
  {
    id: 'dtp-sched-6s-aug29',
    trainingDate: 'August 29, 2026',
    isoDate: '2026-08-29',
    year: 2026,
    dayOfWeek: 'Saturday',
    time: '2:00-3:00pm',
    trainingTopic: '6s Management',
    trainer: '',
    trainerRole: '',
    departmentSection: 'Stitching, Cutting, Assembly & QC Section Leaders',
    batch: 'Cohort 2026 (DTP Batch)',
    venue: 'TRAINING ROOM DTP',
    status: 'Completed',
    purposeAndRemarks: '6S training is conducted to teach employees how to keep the workplace clean, organized, and safe through daily discipline and teamwork.',
    content: [
      '1. What is 6S',
      '2. How to implement 6S',
      '3. Daily Checking for 6S'
    ],
    traineeLeadersCount: 22,
    traineeLeaders: [
      { id: 'ldr-01', name: '', employeeNo: 'DTP-2026-0001', department: 'Stitching', lineOrSection: 'Stitching Line A8', attended: true },
      { id: 'ldr-02', name: '', employeeNo: 'DTP-2026-0002', department: 'Stitching', lineOrSection: 'Stitching Line A10', attended: true },
      { id: 'ldr-03', name: '', employeeNo: 'DTP-2026-0003', department: 'Stitching', lineOrSection: 'Stitching Line B20', attended: true },
      { id: 'ldr-04', name: '', employeeNo: 'DTP-2026-0004', department: 'Assembly', lineOrSection: 'Assembly Line B8', attended: true },
      { id: 'ldr-05', name: '', employeeNo: 'DTP-2026-0005', department: 'Cutting', lineOrSection: 'Cutting Section 1', attended: true },
      { id: 'ldr-06', name: '', employeeNo: 'DTP-2026-0006', department: 'QC / Lab', lineOrSection: 'Inspection Cell', attended: true }
    ],
    notes: 'Source: SUBJECT & SCHEDULE (TRAINING ROOM DTP). Focus on floor safety audit.',
    documentation: [
      { id: 'doc-dtp-aug29-1', name: 'Photo 1 - 6S Floor Audit Workshop.jpg', type: 'photo', size: '2.1 MB', uploadedAt: 'August 29, 2026', uploadedBy: 'Training Division' },
      { id: 'doc-dtp-aug29-2', name: 'Photo 2 - Cleanliness and Safety Inspection.jpg', type: 'photo', size: '1.9 MB', uploadedAt: 'August 29, 2026', uploadedBy: 'Training Division' },
      { id: 'doc-dtp-aug29-3', name: 'Attendance Sheet - 6S Training Roster.pdf', type: 'attendance_sheet', size: '880 KB', uploadedAt: 'August 29, 2026', uploadedBy: 'Training Division' }
    ]
  },
  {
    id: 'dtp-sched-mach-sep02',
    trainingDate: 'September 2, 2026',
    isoDate: '2026-09-02',
    year: 2026,
    dayOfWeek: 'Wednesday',
    time: '2:00-3:00pm',
    trainingTopic: 'Machine',
    trainer: '',
    trainerRole: '',
    departmentSection: 'Stitching, Cutting & Pre-fitting Line Leaders',
    batch: 'Cohort 2026 (DTP Batch)',
    venue: 'TRAINING ROOM DTP',
    status: 'Completed',
    purposeAndRemarks: 'Machine training is conducted to ensure operators and technicians know how to safely use, clean, and maintain sewing machines properly.',
    content: [
      '1. Correct Machine usage',
      '2. Cleaning Machine and safety Operation'
    ],
    traineeLeadersCount: 20,
    traineeLeaders: [
      { id: 'ldr-01', name: '', employeeNo: 'DTP-2026-0001', department: 'Stitching', lineOrSection: 'Stitching Line A8', attended: true },
      { id: 'ldr-02', name: '', employeeNo: 'DTP-2026-0002', department: 'Stitching', lineOrSection: 'Stitching Line A10', attended: true },
      { id: 'ldr-03', name: '', employeeNo: 'DTP-2026-0003', department: 'Stitching', lineOrSection: 'Stitching Line B20', attended: true },
      { id: 'ldr-05', name: '', employeeNo: 'DTP-2026-0005', department: 'Cutting', lineOrSection: 'Cutting Section 1', attended: true }
    ],
    notes: 'Source: SUBJECT & SCHEDULE (TRAINING ROOM DTP). Machine operation and needle safety.',
    documentation: [
      { id: 'doc-dtp-sep02-1', name: 'Photo 1 - Machine Maintenance Demonstration.jpg', type: 'photo', size: '2.2 MB', uploadedAt: 'September 2, 2026', uploadedBy: 'Training Division' },
      { id: 'doc-dtp-sep02-2', name: 'Photo 2 - Needle Safety and Maintenance.jpg', type: 'photo', size: '1.7 MB', uploadedAt: 'September 2, 2026', uploadedBy: 'Training Division' },
      { id: 'doc-dtp-sep02-3', name: 'Attendance Sheet - Machine Training Roster.pdf', type: 'attendance_sheet', size: '820 KB', uploadedAt: 'September 2, 2026', uploadedBy: 'Training Division' }
    ]
  },
  {
    id: 'dtp-sched-change-sep04',
    trainingDate: 'September 4, 2026',
    isoDate: '2026-09-04',
    year: 2026,
    dayOfWeek: 'Friday',
    time: '2:00-3:00pm',
    trainingTopic: 'Change Style Management',
    trainer: '',
    trainerRole: '',
    departmentSection: 'Assembly, Stitching, Cutting & Warehouse Supervisors',
    batch: 'Cohort 2026 (DTP Batch)',
    venue: 'TRAINING ROOM DTP',
    status: 'Completed',
    purposeAndRemarks: 'Change Style Management helps leaders identify how they react to workplace change and learn to manage transitions smoothly.',
    content: [
      '1. Managing style',
      '2. 3 kinds of style change'
    ],
    traineeLeadersCount: 22,
    traineeLeaders: [
      { id: 'ldr-01', name: '', employeeNo: 'DTP-2026-0001', department: 'Stitching', lineOrSection: 'Stitching Line A8', attended: true },
      { id: 'ldr-04', name: '', employeeNo: 'DTP-2026-0004', department: 'Assembly', lineOrSection: 'Assembly Line B8', attended: true },
      { id: 'ldr-07', name: '', employeeNo: 'DTP-2026-0007', department: 'Rubber', lineOrSection: 'Milling & Press', attended: true }
    ],
    notes: 'Source: SUBJECT & SCHEDULE (TRAINING ROOM DTP). Change adaptability framework.',
    documentation: [
      { id: 'doc-dtp-sep04-1', name: 'Photo 1 - Change Style Workshop Discussion.jpg', type: 'photo', size: '2.0 MB', uploadedAt: 'September 4, 2026', uploadedBy: 'Training Division' },
      { id: 'doc-dtp-sep04-2', name: 'Photo 2 - Supervisory Adaptability Exercise.jpg', type: 'photo', size: '1.8 MB', uploadedAt: 'September 4, 2026', uploadedBy: 'Training Division' },
      { id: 'doc-dtp-sep04-3', name: 'Attendance Sheet - Change Style Management.pdf', type: 'attendance_sheet', size: '890 KB', uploadedAt: 'September 4, 2026', uploadedBy: 'Training Division' }
    ]
  },
  {
    id: 'dtp-sched-line-sep07',
    trainingDate: 'September 7, 2026',
    isoDate: '2026-09-07',
    year: 2026,
    dayOfWeek: 'Monday',
    time: '2:00-3:00pm',
    trainingTopic: 'Line Balancing',
    trainer: '',
    trainerRole: '',
    departmentSection: 'Stitching & Assembly Line Leaders',
    batch: 'Cohort 2026 (DTP Batch)',
    venue: 'TRAINING ROOM DTP',
    status: 'Upcoming',
    purposeAndRemarks: 'Line Balancing training is conducted to help leaders organize work evenly along the production line to prevent bottlenecks and delays.',
    content: [
      '1. Line Balancing Definition',
      '2. Why do we need Line Balancing?',
      '3. How to do Line Balancing?',
      '4. The Benefit of Line Balancing'
    ],
    traineeLeadersCount: 25,
    traineeLeaders: [
      { id: 'ldr-01', name: '', employeeNo: 'DTP-2026-0001', department: 'Stitching', lineOrSection: 'Stitching Line A8' },
      { id: 'ldr-02', name: '', employeeNo: 'DTP-2026-0002', department: 'Stitching', lineOrSection: 'Stitching Line A10' },
      { id: 'ldr-03', name: '', employeeNo: 'DTP-2026-0003', department: 'Stitching', lineOrSection: 'Stitching Line B20' },
      { id: 'ldr-04', name: '', employeeNo: 'DTP-2026-0004', department: 'Assembly', lineOrSection: 'Assembly Line B8' }
    ],
    notes: 'Source: SUBJECT & SCHEDULE (TRAINING ROOM DTP). Takt time optimization and line efficiency.',
    documentation: [
      { id: 'doc-dtp-sep07-1', name: 'Photo 1 - Line Balancing Pre-session Setup.jpg', type: 'photo', size: '1.9 MB', uploadedAt: 'September 07, 2026', uploadedBy: 'Training Division' },
      { id: 'doc-dtp-sep07-2', name: 'Attendance Sheet - Line Balancing Roster.pdf', type: 'attendance_sheet', size: '850 KB', uploadedAt: 'September 07, 2026', uploadedBy: 'Training Division' }
    ]
  },
  {
    id: 'dtp-sched-qual-sep09',
    trainingDate: 'September 9, 2026',
    isoDate: '2026-09-09',
    year: 2026,
    dayOfWeek: 'Wednesday',
    time: '2:00-3:00pm',
    trainingTopic: 'Basic Quality Concept',
    trainer: '',
    trainerRole: '',
    departmentSection: 'All Production Line Leaders & Supervisors',
    batch: 'Cohort 2026 (DTP Batch)',
    venue: 'TRAINING ROOM DTP',
    status: 'Upcoming',
    purposeAndRemarks: 'Basic Quality Concept training teaches leaders the fundamentals of quality control, defect prevention, and meeting production standards.',
    content: [
      '1. What is Quality',
      '2. Why Quality is Important',
      '3. Our Quality System'
    ],
    traineeLeadersCount: 23,
    traineeLeaders: [
      { id: 'ldr-01', name: '', employeeNo: 'DTP-2026-0001', department: 'Stitching', lineOrSection: 'Stitching Line A8' },
      { id: 'ldr-06', name: '', employeeNo: 'DTP-2026-0006', department: 'QC / Lab', lineOrSection: 'Inspection Cell' },
      { id: 'ldr-08', name: '', employeeNo: 'DTP-2026-0008', department: 'Warehouse', lineOrSection: 'Raw Materials' }
    ],
    notes: 'Source: SUBJECT & SCHEDULE (TRAINING ROOM DTP). Zero-defect mindset and AQL standards.',
    documentation: [
      { id: 'doc-dtp-sep09-1', name: 'Photo 1 - Quality Standard Syllabus Handout.jpg', type: 'photo', size: '2.1 MB', uploadedAt: 'September 09, 2026', uploadedBy: 'Training Division' },
      { id: 'doc-dtp-sep09-2', name: 'Attendance Sheet - Quality Training Roster.pdf', type: 'attendance_sheet', size: '900 KB', uploadedAt: 'September 09, 2026', uploadedBy: 'Training Division' }
    ]
  },
  {
    id: 'dtp-sched-team-sep11',
    trainingDate: 'September 11, 2026',
    isoDate: '2026-09-11',
    year: 2026,
    dayOfWeek: 'Friday',
    time: '2:00-3:00pm',
    trainingTopic: 'Team & Management',
    trainer: '',
    trainerRole: '',
    departmentSection: 'Factory-Wide Section Leaders & Supervisors',
    batch: 'Cohort 2026 (DTP Batch)',
    venue: 'TRAINING ROOM DTP',
    status: 'Upcoming',
    purposeAndRemarks: 'Team & Management training helps leaders understand how to build strong teams, differentiate between groups and teams, and apply effective management tools like PDCA.',
    content: [
      '1. Group vs Team',
      '2. What is Management',
      '3. PDCA',
      '4. Stone Soup'
    ],
    traineeLeadersCount: 22,
    traineeLeaders: [
      { id: 'ldr-01', name: '', employeeNo: 'DTP-2026-0001', department: 'Stitching', lineOrSection: 'Stitching Line A8' },
      { id: 'ldr-04', name: '', employeeNo: 'DTP-2026-0004', department: 'Assembly', lineOrSection: 'Assembly Line B8' },
      { id: 'ldr-05', name: '', employeeNo: 'DTP-2026-0005', department: 'Cutting', lineOrSection: 'Cutting Section 1' }
    ],
    notes: 'Source: SUBJECT & SCHEDULE (TRAINING ROOM DTP). PDCA cycle application and teamwork story.',
    documentation: [
      { id: 'doc-dtp-sep11-1', name: 'Photo 1 - PDCA Model Overview.jpg', type: 'photo', size: '1.9 MB', uploadedAt: 'September 11, 2026', uploadedBy: 'Training Division' },
      { id: 'doc-dtp-sep11-2', name: 'Attendance Sheet - Team & Management.pdf', type: 'attendance_sheet', size: '920 KB', uploadedAt: 'September 11, 2026', uploadedBy: 'Training Division' }
    ]
  },
  {
    id: 'dtp-sched-comm-sep14',
    trainingDate: 'September 14, 2026',
    isoDate: '2026-09-14',
    year: 2026,
    dayOfWeek: 'Monday',
    time: '2:00-3:00pm',
    trainingTopic: 'Effective Communication',
    trainer: '',
    trainerRole: '',
    departmentSection: 'Supervisory Staff & Line Leaders',
    batch: 'Cohort 2026 (DTP Batch)',
    venue: 'TRAINING ROOM DTP',
    status: 'Upcoming',
    purposeAndRemarks: 'Effective Communication training improves how leaders deliver messages, actively listen, and build strong teamwork through clear and respectful communication.',
    content: [
      '1. The factors of communication',
      '2. Listening',
      '3. Skills for communication'
    ],
    traineeLeadersCount: 22,
    traineeLeaders: [
      { id: 'ldr-01', name: '', employeeNo: 'DTP-2026-0001', department: 'Stitching', lineOrSection: 'Stitching Line A8' },
      { id: 'ldr-02', name: '', employeeNo: 'DTP-2026-0002', department: 'Stitching', lineOrSection: 'Stitching Line A10' },
      { id: 'ldr-07', name: '', employeeNo: 'DTP-2026-0007', department: 'Rubber', lineOrSection: 'Milling & Press' }
    ],
    notes: 'Source: SUBJECT & SCHEDULE (TRAINING ROOM DTP). Active listening exercises.',
    documentation: [
      { id: 'doc-dtp-sep14-1', name: 'Photo 1 - Communication Skills Exercise.jpg', type: 'photo', size: '2.0 MB', uploadedAt: 'September 14, 2026', uploadedBy: 'Training Division' },
      { id: 'doc-dtp-sep14-2', name: 'Attendance Sheet - Effective Communication.pdf', type: 'attendance_sheet', size: '890 KB', uploadedAt: 'September 14, 2026', uploadedBy: 'Training Division' }
    ]
  },
  {
    id: 'dtp-sched-metal-sep16',
    trainingDate: 'September 16, 2026',
    isoDate: '2026-09-16',
    year: 2026,
    dayOfWeek: 'Wednesday',
    time: '2:00-3:00pm',
    trainingTopic: 'Metal Awareness (Metal Control Management)',
    trainer: '',
    trainerRole: '',
    departmentSection: 'Stitching, Cutting, Quality & Warehouse Leaders',
    batch: 'Cohort 2026 (DTP Batch)',
    venue: 'TRAINING ROOM DTP',
    status: 'Upcoming',
    purposeAndRemarks: 'Metal Control Management involves overseeing the handling, tracking, and quality assurance of metals throughout the supply chain. This role is crucial in ensuring that all metal materials meet industry and regulatory standards while optimizing operational workflows.',
    content: [
      '1. Metal Contamination Prevention & Supply Chain Standards',
      '2. Broken Needle Replacement Procedures & Audit Log',
      '3. Calibrated 9-Point Metal Detector Operational Protocol'
    ],
    traineeLeadersCount: 21,
    traineeLeaders: [
      { id: 'ldr-01', name: '', employeeNo: 'DTP-2026-0001', department: 'Stitching', lineOrSection: 'Stitching Line A8' },
      { id: 'ldr-05', name: '', employeeNo: 'DTP-2026-0005', department: 'Cutting', lineOrSection: 'Cutting Section 1' },
      { id: 'ldr-06', name: '', employeeNo: 'DTP-2026-0006', department: 'QC / Lab', lineOrSection: 'Inspection Cell' }
    ],
    notes: 'Source: SUBJECT & SCHEDULE (TRAINING ROOM DTP). Zero metal contamination and broken needle procedure.',
    documentation: [
      { id: 'doc-dtp-sep16-1', name: 'Photo 1 - Metal Detector Calibration.jpg', type: 'photo', size: '2.3 MB', uploadedAt: 'September 16, 2026', uploadedBy: 'Training Division' },
      { id: 'doc-dtp-sep16-2', name: 'Photo 2 - Broken Needle Logbook Check.jpg', type: 'photo', size: '1.8 MB', uploadedAt: 'September 16, 2026', uploadedBy: 'Training Division' },
      { id: 'doc-dtp-sep16-3', name: 'Attendance Sheet - Metal Awareness Training.pdf', type: 'attendance_sheet', size: '910 KB', uploadedAt: 'September 16, 2026', uploadedBy: 'Training Division' }
    ]
  },

  // ==========================================
  // 2026 OFFICIAL SESSIONS (Conference Room D2P)
  // ==========================================
  {
    id: 'd2p-sched-hrm-aug26',
    trainingDate: 'August 26, 2026',
    isoDate: '2026-08-26',
    year: 2026,
    dayOfWeek: 'Wednesday',
    time: '1:00-2:00pm',
    trainingTopic: 'HR Management',
    trainer: '',
    trainerRole: '',
    departmentSection: 'D2P Supervisory & Team Leaders',
    batch: 'Cohort 2026 (D2P Batch)',
    venue: 'Conference Room D2P',
    status: 'Completed',
    purposeAndRemarks: 'HR Management training is conducted to guide leaders in handling attendance, discipline, grievances, and promoting a respectful and compliant workplace.',
    content: [
      '1. Attendance Management',
      '2. Grievance Handle',
      '3. Code of conduct'
    ],
    traineeLeadersCount: 22,
    traineeLeaders: [
      { id: 'd2p-ldr-01', name: '', employeeNo: 'D2P-2026-0001', department: 'D2P Assembly', lineOrSection: 'Assembly Line 1', attended: true },
      { id: 'd2p-ldr-02', name: '', employeeNo: 'D2P-2026-0002', department: 'D2P Stitching', lineOrSection: 'Stitching Line 2', attended: true },
      { id: 'd2p-ldr-03', name: '', employeeNo: 'D2P-2026-0003', department: 'D2P Cutting', lineOrSection: 'Cutting Cell 1', attended: true },
      { id: 'd2p-ldr-04', name: '', employeeNo: 'D2P-2026-0004', department: 'D2P Quality', lineOrSection: 'Inline Inspection', attended: true }
    ],
    notes: 'Source: SUBJECT & SCHEDULE (Conference Room D2P). Focus on attendance rules and grievance protocol.',
    documentation: [
      { id: 'doc-d2p-aug26-1', name: 'Photo 1 - D2P Leadership Seminar.jpg', type: 'photo', size: '2.1 MB', uploadedAt: 'August 26, 2026', uploadedBy: 'Training Division' },
      { id: 'doc-d2p-aug26-2', name: 'Photo 2 - Supervisory Discussion Group.jpg', type: 'photo', size: '1.9 MB', uploadedAt: 'August 26, 2026', uploadedBy: 'Training Division' },
      { id: 'doc-d2p-aug26-3', name: 'Attendance Sheet - D2P Signed Sheet.pdf', type: 'attendance_sheet', size: '920 KB', uploadedAt: 'August 26, 2026', uploadedBy: 'Training Division' }
    ]
  },
  {
    id: 'd2p-sched-6s-aug28',
    trainingDate: 'August 28, 2026',
    isoDate: '2026-08-28',
    year: 2026,
    dayOfWeek: 'Friday',
    time: '1:00-2:00pm',
    trainingTopic: '6s Management',
    trainer: '',
    trainerRole: '',
    departmentSection: 'D2P Supervisory & Team Leaders',
    batch: 'Cohort 2026 (D2P Batch)',
    venue: 'Conference Room D2P',
    status: 'Completed',
    purposeAndRemarks: '6S training is conducted to teach employees how to keep the workplace clean, organized, and safe through daily discipline and teamwork.',
    content: [
      '1. What is 6S',
      '2. How to implement 6S',
      '3. Daily Checking for 6S'
    ],
    traineeLeadersCount: 22,
    traineeLeaders: [
      { id: 'd2p-ldr-01', name: '', employeeNo: 'D2P-2026-0001', department: 'D2P Assembly', lineOrSection: 'Assembly Line 1', attended: true },
      { id: 'd2p-ldr-02', name: '', employeeNo: 'D2P-2026-0002', department: 'D2P Stitching', lineOrSection: 'Stitching Line 2', attended: true },
      { id: 'd2p-ldr-03', name: '', employeeNo: 'D2P-2026-0003', department: 'D2P Cutting', lineOrSection: 'Cutting Cell 1', attended: true }
    ],
    notes: 'Source: SUBJECT & SCHEDULE (Conference Room D2P). Clean and safe workplace standards.',
    documentation: [
      { id: 'doc-d2p-aug28-1', name: 'Photo 1 - 6S Practice Floor Tour.jpg', type: 'photo', size: '2.0 MB', uploadedAt: 'August 28, 2026', uploadedBy: 'Training Division' },
      { id: 'doc-d2p-aug28-2', name: 'Photo 2 - Organization and Safety Review.jpg', type: 'photo', size: '1.7 MB', uploadedAt: 'August 28, 2026', uploadedBy: 'Training Division' },
      { id: 'doc-d2p-aug28-3', name: 'Attendance Sheet - 6S D2P Roster.pdf', type: 'attendance_sheet', size: '840 KB', uploadedAt: 'August 28, 2026', uploadedBy: 'Training Division' }
    ]
  },
  {
    id: 'd2p-sched-mach-sep01',
    trainingDate: 'September 1, 2026',
    isoDate: '2026-09-01',
    year: 2026,
    dayOfWeek: 'Tuesday',
    time: '1:00-2:00pm',
    trainingTopic: 'Machine',
    trainer: '',
    trainerRole: '',
    departmentSection: 'D2P Supervisory & Team Leaders',
    batch: 'Cohort 2026 (D2P Batch)',
    venue: 'Conference Room D2P',
    status: 'Completed',
    purposeAndRemarks: 'Machine training is conducted to ensure operators and technicians know how to safely use, clean, and maintain sewing machines properly.',
    content: [
      '1. Correct Machine usage',
      '2. Cleaning Machine and safety Operation'
    ],
    traineeLeadersCount: 22,
    traineeLeaders: [
      { id: 'd2p-ldr-01', name: '', employeeNo: 'D2P-2026-0001', department: 'D2P Assembly', lineOrSection: 'Assembly Line 1', attended: true },
      { id: 'd2p-ldr-02', name: '', employeeNo: 'D2P-2026-0002', department: 'D2P Stitching', lineOrSection: 'Stitching Line 2', attended: true },
      { id: 'd2p-ldr-04', name: '', employeeNo: 'D2P-2026-0004', department: 'D2P Quality', lineOrSection: 'Inline Inspection', attended: true }
    ],
    notes: 'Source: SUBJECT & SCHEDULE (Conference Room D2P). Machine safety operation and clean-up.',
    documentation: [
      { id: 'doc-d2p-sep01-1', name: 'Photo 1 - Machine Cleaning Demonstration.jpg', type: 'photo', size: '2.2 MB', uploadedAt: 'September 01, 2026', uploadedBy: 'Training Division' },
      { id: 'doc-d2p-sep01-2', name: 'Attendance Sheet - Machine D2P Roster.pdf', type: 'attendance_sheet', size: '890 KB', uploadedAt: 'September 01, 2026', uploadedBy: 'Training Division' }
    ]
  },
  {
    id: 'd2p-sched-change-sep03',
    trainingDate: 'September 3, 2026',
    isoDate: '2026-09-03',
    year: 2026,
    dayOfWeek: 'Thursday',
    time: '1:00-2:00pm',
    trainingTopic: 'Change Style Management',
    trainer: '',
    trainerRole: '',
    departmentSection: 'D2P Supervisory & Team Leaders',
    batch: 'Cohort 2026 (D2P Batch)',
    venue: 'Conference Room D2P',
    status: 'Completed',
    purposeAndRemarks: 'Change Style Management helps leaders identify how they react to workplace change and learn to manage transitions smoothly.',
    content: [
      '1. Managing style',
      '2. 3 kinds of style change'
    ],
    traineeLeadersCount: 22,
    traineeLeaders: [
      { id: 'd2p-ldr-01', name: '', employeeNo: 'D2P-2026-0001', department: 'D2P Assembly', lineOrSection: 'Assembly Line 1', attended: true },
      { id: 'd2p-ldr-03', name: '', employeeNo: 'D2P-2026-0003', department: 'D2P Cutting', lineOrSection: 'Cutting Cell 1', attended: true }
    ],
    notes: 'Source: SUBJECT & SCHEDULE (Conference Room D2P). Adaptability to organizational change.',
    documentation: [
      { id: 'doc-d2p-sep03-1', name: 'Photo 1 - Leadership Change Styles.jpg', type: 'photo', size: '2.0 MB', uploadedAt: 'September 03, 2026', uploadedBy: 'Training Division' },
      { id: 'doc-d2p-sep03-2', name: 'Attendance Sheet - Change Style D2P.pdf', type: 'attendance_sheet', size: '860 KB', uploadedAt: 'September 03, 2026', uploadedBy: 'Training Division' }
    ]
  },
  {
    id: 'd2p-sched-line-sep05',
    trainingDate: 'September 5, 2026',
    isoDate: '2026-09-05',
    year: 2026,
    dayOfWeek: 'Saturday',
    time: '1:00-2:00pm',
    trainingTopic: 'Line Balancing',
    trainer: '',
    trainerRole: '',
    departmentSection: 'D2P Supervisory & Team Leaders',
    batch: 'Cohort 2026 (D2P Batch)',
    venue: 'Conference Room D2P',
    status: 'Upcoming',
    purposeAndRemarks: 'Line Balancing training is conducted to help leaders organize work evenly along the production line to prevent bottlenecks and delays.',
    content: [
      '1. Line Balancing Definition',
      '2. Why do we need Line Balancing?',
      '3. How to do Line Balancing?',
      '4. The Benefit of Line Balancing'
    ],
    traineeLeadersCount: 25,
    traineeLeaders: [
      { id: 'd2p-ldr-01', name: '', employeeNo: 'D2P-2026-0001', department: 'D2P Assembly', lineOrSection: 'Assembly Line 1' },
      { id: 'd2p-ldr-02', name: '', employeeNo: 'D2P-2026-0002', department: 'D2P Stitching', lineOrSection: 'Stitching Line 2' },
      { id: 'd2p-ldr-04', name: '', employeeNo: 'D2P-2026-0004', department: 'D2P Quality', lineOrSection: 'Inline Inspection' }
    ],
    notes: 'Source: SUBJECT & SCHEDULE (Conference Room D2P). Line flow and workstation optimization.',
    documentation: [
      { id: 'doc-d2p-sep05-1', name: 'Photo 1 - Line Flow Planning Workshop.jpg', type: 'photo', size: '2.1 MB', uploadedAt: 'September 05, 2026', uploadedBy: 'Training Division' },
      { id: 'doc-d2p-sep05-2', name: 'Attendance Sheet - Line Balancing D2P.pdf', type: 'attendance_sheet', size: '910 KB', uploadedAt: 'September 05, 2026', uploadedBy: 'Training Division' }
    ]
  },
  {
    id: 'd2p-sched-qual-sep08',
    trainingDate: 'September 8, 2026',
    isoDate: '2026-09-08',
    year: 2026,
    dayOfWeek: 'Tuesday',
    time: '1:00-2:00pm',
    trainingTopic: 'Basic Quality Concept',
    trainer: '',
    trainerRole: '',
    departmentSection: 'D2P Supervisory & Team Leaders',
    batch: 'Cohort 2026 (D2P Batch)',
    venue: 'Conference Room D2P',
    status: 'Upcoming',
    purposeAndRemarks: 'Basic Quality Concept training teaches leaders the fundamentals of quality control, defect prevention, and meeting production standards.',
    content: [
      '1. What is Quality',
      '2. Why Quality is Important',
      '3. Our Quality System'
    ],
    traineeLeadersCount: 25,
    traineeLeaders: [
      { id: 'd2p-ldr-01', name: '', employeeNo: 'D2P-2026-0001', department: 'D2P Assembly', lineOrSection: 'Assembly Line 1' },
      { id: 'd2p-ldr-02', name: '', employeeNo: 'D2P-2026-0002', department: 'D2P Stitching', lineOrSection: 'Stitching Line 2' },
      { id: 'd2p-ldr-04', name: '', employeeNo: 'D2P-2026-0004', department: 'D2P Quality', lineOrSection: 'Inline Inspection' }
    ],
    notes: 'Source: SUBJECT & SCHEDULE (Conference Room D2P). Quality assurance principles and standards.',
    documentation: [
      { id: 'doc-d2p-sep08-1', name: 'Photo 1 - Quality Control Fundamentals.jpg', type: 'photo', size: '2.0 MB', uploadedAt: 'September 08, 2026', uploadedBy: 'Training Division' },
      { id: 'doc-d2p-sep08-2', name: 'Attendance Sheet - Basic Quality Concept D2P.pdf', type: 'attendance_sheet', size: '890 KB', uploadedAt: 'September 08, 2026', uploadedBy: 'Training Division' }
    ]
  },
  {
    id: 'd2p-sched-team-sep10',
    trainingDate: 'September 10, 2026',
    isoDate: '2026-09-10',
    year: 2026,
    dayOfWeek: 'Thursday',
    time: '1:00-2:00pm',
    trainingTopic: 'Team & Management',
    trainer: '',
    trainerRole: '',
    departmentSection: 'D2P Supervisory & Team Leaders',
    batch: 'Cohort 2026 (D2P Batch)',
    venue: 'Conference Room D2P',
    status: 'Upcoming',
    purposeAndRemarks: 'Team & Management training is conducted to help leaders understand how to build strong teams, differentiate between groups and teams, and apply effective management tools like PDCA.',
    content: [
      '1. Group vs Team',
      '2. What is Management',
      '3. PDCA',
      '4. Stone Soup'
    ],
    traineeLeadersCount: 22,
    traineeLeaders: [
      { id: 'd2p-ldr-01', name: '', employeeNo: 'D2P-2026-0001', department: 'D2P Assembly', lineOrSection: 'Assembly Line 1' },
      { id: 'd2p-ldr-02', name: '', employeeNo: 'D2P-2026-0002', department: 'D2P Stitching', lineOrSection: 'Stitching Line 2' },
      { id: 'd2p-ldr-03', name: '', employeeNo: 'D2P-2026-0003', department: 'D2P Cutting', lineOrSection: 'Cutting Cell 1' }
    ],
    notes: 'Source: SUBJECT & SCHEDULE (Conference Room D2P). Team building, management fundamentals, and PDCA.',
    documentation: [
      { id: 'doc-d2p-sep10-1', name: 'Photo 1 - Team Dynamics Presentation.jpg', type: 'photo', size: '2.1 MB', uploadedAt: 'September 10, 2026', uploadedBy: 'Training Division' },
      { id: 'doc-d2p-sep10-2', name: 'Photo 2 - PDCA Problem Solving Exercise.jpg', type: 'photo', size: '1.9 MB', uploadedAt: 'September 10, 2026', uploadedBy: 'Training Division' },
      { id: 'doc-d2p-sep10-3', name: 'Attendance Sheet - D2P Leaders Signed Matrix.pdf', type: 'attendance_sheet', size: '1.2 MB', uploadedAt: 'September 10, 2026', uploadedBy: 'Training Division' }
    ]
  },
  {
    id: 'd2p-sched-comm-sep12',
    trainingDate: 'September 12, 2026',
    isoDate: '2026-09-12',
    year: 2026,
    dayOfWeek: 'Saturday',
    time: '1:00-2:00pm',
    trainingTopic: 'Effective Communication',
    trainer: '',
    trainerRole: '',
    departmentSection: 'D2P Section Supervisors & Leads',
    batch: 'Cohort 2026 (D2P Batch)',
    venue: 'Conference Room D2P',
    status: 'Upcoming',
    purposeAndRemarks: 'Effective Communication training is conducted to help leaders improve how they deliver messages, actively listen, and build strong teamwork through clear and respectful communication.',
    content: [
      '1. The factors of communication',
      '2. Listening',
      '3. Skills for communication'
    ],
    traineeLeadersCount: 22,
    traineeLeaders: [
      { id: 'd2p-ldr-01', name: '', employeeNo: 'D2P-2026-0001', department: 'D2P Assembly', lineOrSection: 'Assembly Line 1' },
      { id: 'd2p-ldr-02', name: '', employeeNo: 'D2P-2026-0002', department: 'D2P Stitching', lineOrSection: 'Stitching Line 2' }
    ],
    notes: 'Source: SUBJECT & SCHEDULE (Conference Room D2P). Communication delivery and listening practice.',
    documentation: [
      { id: 'doc-d2p-sep12-1', name: 'Photo 1 - Active Listening Roleplay.jpg', type: 'photo', size: '2.0 MB', uploadedAt: 'September 12, 2026', uploadedBy: 'Training Division' },
      { id: 'doc-d2p-sep12-2', name: 'Photo 2 - Communication Flow Chart.jpg', type: 'photo', size: '1.8 MB', uploadedAt: 'September 12, 2026', uploadedBy: 'Training Division' },
      { id: 'doc-d2p-sep12-3', name: 'Attendance Sheet - Effective Communication D2P.pdf', type: 'attendance_sheet', size: '870 KB', uploadedAt: 'September 12, 2026', uploadedBy: 'Training Division' }
    ]
  },
  {
    id: 'd2p-sched-metal-sep15',
    trainingDate: 'September 15, 2026',
    isoDate: '2026-09-15',
    year: 2026,
    dayOfWeek: 'Tuesday',
    time: '1:00-2:00pm',
    trainingTopic: 'Metal Awareness (Metal Control Management)',
    trainer: '',
    trainerRole: '',
    departmentSection: 'D2P Stitching, Cutting, Quality & Warehouse Leads',
    batch: 'Cohort 2026 (D2P Batch)',
    venue: 'Conference Room D2P',
    status: 'Upcoming',
    purposeAndRemarks: 'Metal Control Management involves overseeing the handling, tracking, and quality assurance of metals throughout the supply chain. This role is crucial in ensuring that all metal materials meet industry and regulatory standards while optimizing operational workflows.',
    content: [
      '1. Metal Contamination Prevention & Supply Chain Standards',
      '2. Broken Needle Replacement Procedures & Audit Log',
      '3. Calibrated 9-Point Metal Detector Operational Protocol'
    ],
    traineeLeadersCount: 21,
    traineeLeaders: [
      { id: 'd2p-ldr-01', name: '', employeeNo: 'D2P-2026-0001', department: 'D2P Assembly', lineOrSection: 'Assembly Line 1' },
      { id: 'd2p-ldr-02', name: '', employeeNo: 'D2P-2026-0002', department: 'D2P Stitching', lineOrSection: 'Stitching Line 2' },
      { id: 'd2p-ldr-04', name: '', employeeNo: 'D2P-2026-0004', department: 'D2P Quality', lineOrSection: 'Inline Inspection' }
    ],
    notes: 'Source: SUBJECT & SCHEDULE (Conference Room D2P). Zero metal contamination and broken needle procedure.',
    documentation: [
      { id: 'doc-d2p-sep15-1', name: 'Photo 1 - Metal Contamination Inspection.jpg', type: 'photo', size: '2.2 MB', uploadedAt: 'September 15, 2026', uploadedBy: 'Training Division' },
      { id: 'doc-d2p-sep15-2', name: 'Photo 2 - Broken Needle Register Review.jpg', type: 'photo', size: '1.9 MB', uploadedAt: 'September 15, 2026', uploadedBy: 'Training Division' },
      { id: 'doc-d2p-sep15-3', name: 'Attendance Sheet - Metal Awareness D2P.pdf', type: 'attendance_sheet', size: '930 KB', uploadedAt: 'September 15, 2026', uploadedBy: 'Training Division' }
    ]
  }
];

export const SCHEDULE_STORAGE_KEY = 'tms_leadership_schedule_v2';
