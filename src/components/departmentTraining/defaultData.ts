/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DepartmentFolder, DepartmentTrainingRecord, DepartmentCustomField } from '../../types';

// Helper to generate SVG data URIs for realistic factory training photo previews
function createTrainingPhotoSvg(title: string, subtitle: string, color1: string, color2: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${color1}" />
        <stop offset="100%" stop-color="${color2}" />
      </linearGradient>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#grad)" />
    <rect width="100%" height="100%" fill="url(#grid)" />
    
    <!-- Factory silhouette accent -->
    <path d="M 50 480 L 150 400 L 150 480 L 250 400 L 250 480 L 400 370 L 400 480 L 750 480 L 750 540 L 50 540 Z" fill="rgba(0,0,0,0.25)" />
    
    <!-- Frame badge -->
    <rect x="50" y="45" width="220" height="34" rx="17" fill="rgba(0,0,0,0.4)" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" />
    <circle cx="70" cy="62" r="6" fill="#10b981" />
    <text x="86" y="67" fill="#ffffff" font-family="system-ui, sans-serif" font-size="13" font-weight="700" letter-spacing="1">DATIAN CSR HUB</text>
    
    <!-- Main Center Badge -->
    <g transform="translate(400, 260)">
      <circle cx="0" cy="0" r="70" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.4)" stroke-width="2" />
      <!-- Camera/training icon -->
      <path d="M -30 -10 L -20 -25 L 20 -25 L 30 -10 L 35 -10 C 40 -10 44 -6 44 0 L 44 25 C 44 30 40 35 35 35 L -35 35 C -40 35 -44 30 -44 25 L -44 0 C -44 -6 -40 -10 -35 -10 Z" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="0" cy="12" r="16" fill="none" stroke="#ffffff" stroke-width="3"/>
    </g>

    <!-- Bottom Caption Plaque -->
    <rect x="60" y="380" width="680" height="150" rx="12" fill="rgba(10,20,35,0.85)" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" />
    <text x="90" y="425" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="14" font-weight="bold" letter-spacing="1.5">OFFICIAL TRAINING DOCUMENTATION</text>
    <text x="90" y="465" fill="#ffffff" font-family="system-ui, sans-serif" font-size="24" font-weight="800">${title}</text>
    <text x="90" y="498" fill="#cbd5e1" font-family="system-ui, sans-serif" font-size="15">${subtitle}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const DEFAULT_DEPARTMENT_FOLDERS: DepartmentFolder[] = [
  {
    id: 'dept-csr',
    name: 'CSR',
    code: 'CSR',
    description: 'Corporate Social Responsibility, Labor Standards, Human Rights & Code of Conduct',
    icon: 'ShieldCheck',
    color: '#3b82f6', // Blue
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: '2026-09-14T08:00:00.000Z',
  },
  {
    id: 'dept-hr',
    name: 'HR',
    code: 'HR',
    description: 'Human Resources Management, Onboarding, Employee Welfare & Labor Relations',
    icon: 'Users',
    color: '#0ea5e9', // Sky
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: '2026-09-12T08:00:00.000Z',
  },
  {
    id: 'dept-stitching',
    name: 'Stitching',
    code: 'STITCH',
    description: 'Sewing Operations, Pattern Alignment, Needle Safety & Operator Skill Matrix',
    icon: 'Scissors',
    color: '#10b981', // Emerald
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: '2026-09-16T14:30:00.000Z',
  },
  {
    id: 'dept-rubber',
    name: 'Rubber',
    code: 'RUB',
    description: 'Rubber Outsole Compounding, Banbury Mixing, Calendering & Press Molding',
    icon: 'Layers',
    color: '#f59e0b', // Amber
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: '2026-09-10T08:00:00.000Z',
  },
  {
    id: 'dept-assembly',
    name: 'Assembly',
    code: 'ASY',
    description: 'Upper-to-Sole Bonding, Primer Application, Heat Tunnel & Final Shoe Finishing',
    icon: 'Wrench',
    color: '#06b6d4', // Cyan
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: '2026-09-11T08:00:00.000Z',
  },
  {
    id: 'dept-production',
    name: 'Production',
    code: 'PROD',
    description: 'Lean Manufacturing, Daily Output Targets, 6S Workshop & Floor Operations',
    icon: 'Factory',
    color: '#8b5cf6', // Violet
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: '2026-09-08T08:00:00.000Z',
  },
  {
    id: 'dept-ga',
    name: 'GA',
    code: 'GA',
    description: 'General Affairs, Security, Facility Maintenance, Dormitory & Transport',
    icon: 'Building2',
    color: '#14b8a6', // Teal
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: '2026-09-05T08:00:00.000Z',
  },
  {
    id: 'dept-engineering',
    name: 'Engineering',
    code: 'ENG',
    description: 'Preventive Maintenance, Electrical Automation, Machine Setup & Industrial Eng.',
    icon: 'Cog',
    color: '#f97316', // Orange
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: '2026-09-09T08:00:00.000Z',
  },
  {
    id: 'dept-qa',
    name: 'QA',
    code: 'QA',
    description: 'Quality Assurance, In-line Inspection, Lab Physical Testing & AQL Standards',
    icon: 'CheckCircle2',
    color: '#f43f5e', // Rose
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: '2026-09-13T08:00:00.000Z',
  },
  {
    id: 'dept-ems',
    name: 'EMS',
    code: 'EMS',
    description: 'Environmental Management System, ISO 14001, Waste Management & Energy Conservation',
    icon: 'Leaf',
    color: '#22c55e', // Green
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: '2026-09-07T08:00:00.000Z',
  },
  {
    id: 'dept-it',
    name: 'IT',
    code: 'IT',
    description: 'Information Technology, Network Infrastructure, Data Security & Terminal Support',
    icon: 'Cpu',
    color: '#6366f1', // Indigo
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: '2026-09-04T08:00:00.000Z',
  },
  {
    id: 'dept-finance',
    name: 'Finance',
    code: 'FIN',
    description: 'Financial Accounting, Payroll Verification, Cost Analysis & Statutory Reporting',
    icon: 'BadgeDollarSign',
    color: '#eab308', // Yellow
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: '2026-09-02T08:00:00.000Z',
  },
  {
    id: 'dept-admin',
    name: 'Admin',
    code: 'ADM',
    description: 'Executive Office, Legal Compliance, Government Permits & Subic Bay Liaison',
    icon: 'Crown',
    color: '#d946ef', // Fuchsia
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: '2026-09-01T08:00:00.000Z',
  },
];

export const DEFAULT_CUSTOM_FIELDS: DepartmentCustomField[] = [
  {
    id: 'cf-eval-score',
    name: 'Training Evaluation Score',
    type: 'Number',
    scope: 'all',
    required: false,
    order: 1,
    placeholder: 'Score out of 100 (e.g. 92)',
  },
  {
    id: 'cf-effectiveness',
    name: 'Training Effectiveness',
    type: 'Dropdown',
    options: ['Excellent', 'Good', 'Fair', 'Needs Improvement'],
    scope: 'all',
    required: false,
    order: 2,
  },
  {
    id: 'cf-exam-pass-rate',
    name: 'Exam / Assessment Pass Rate (%)',
    type: 'Percentage',
    scope: 'all',
    required: false,
    order: 3,
    placeholder: 'Pass rate percentage (e.g. 96%)',
  },
  {
    id: 'cf-supervisor-sign',
    name: 'Supervisor Attendance Verified',
    type: 'Checkbox',
    scope: 'all',
    required: false,
    order: 4,
  },
  {
    id: 'cf-followup-action',
    name: 'Required Follow-up Action',
    type: 'Long Text',
    scope: 'all',
    required: false,
    order: 5,
    placeholder: 'Document any post-training re-evaluations or follow-up milestones...',
  },
];

export const DEFAULT_TRAINING_RECORDS: DepartmentTrainingRecord[] = [
  {
    id: 'DTR-STITCH-2026-0001',
    departmentId: 'dept-stitching',
    departmentName: 'Stitching',
    date: '2026-09-16',
    subject: 'Effective Communication / Team and Management',
    traineesCount: 25,
    totalTime: '1 Hour',
    totalHours: 1.0,
    trainer: 'Ms. Shireen Li',
    trainingType: 'Leadership & SOP Compliance',
    venue: 'DTP Training Room',
    startTime: '09:00 AM',
    endTime: '10:00 AM',
    category: 'Management & Communication',
    targetParticipants: 'Line Supervisors, Group Leaders & Stitching Line A Leads',
    batch: 'Batch 2026-03',
    trainingObjective: 'Equip stitching supervisors with structured communication frameworks, conflict resolution techniques, and standardized line handoff procedures.',
    remarks: 'Full 100% attendance. Trainees completed interactive pair exercises with high engagement.',
    status: 'Completed',
    createdBy: 'System Administrator',
    dateCreated: '2026-09-16T10:15:00.000Z',
    lastUpdated: '2026-09-16T14:30:00.000Z',
    year: 2026,
    customFields: {
      'cf-eval-score': 94,
      'cf-effectiveness': 'Excellent',
      'cf-exam-pass-rate': 98,
      'cf-supervisor-sign': true,
      'cf-followup-action': 'Conduct monthly refresher on line communication and check supervisor logbooks by end of Q3.',
    },
    photos: [
      {
        id: 'photo-stitch-01',
        url: createTrainingPhotoSvg('Opening Discussion', 'Ms. Shireen Li introducing effective communication concepts', '#0f172a', '#0284c7'),
        fileName: 'stitching_opening_discussion.jpg',
        fileSize: '1.8 MB',
        caption: 'Opening discussion: Welcome and agenda review with Line Supervisors',
        uploadedAt: '2026-09-16T10:30:00.000Z',
      },
      {
        id: 'photo-stitch-02',
        url: createTrainingPhotoSvg('Training Proper', 'Active presentation on team management frameworks', '#1e293b', '#0d9488'),
        fileName: 'stitching_training_proper.jpg',
        fileSize: '2.4 MB',
        caption: 'Training proper: Multi-line team coordination and escalation matrix',
        uploadedAt: '2026-09-16T10:32:00.000Z',
      },
      {
        id: 'photo-stitch-03',
        url: createTrainingPhotoSvg('Group Activity', 'Pair exercises simulating real-time factory line scenarios', '#1e1b4b', '#4338ca'),
        fileName: 'stitching_group_activity.jpg',
        fileSize: '2.1 MB',
        caption: 'Group activity: Case study role-play on defect resolution handoff',
        uploadedAt: '2026-09-16T10:35:00.000Z',
      },
      {
        id: 'photo-stitch-04',
        url: createTrainingPhotoSvg('Training Completion', 'Closing ceremony and certificate distribution', '#14532d', '#059669'),
        fileName: 'stitching_completion.jpg',
        fileSize: '1.9 MB',
        caption: 'Training completion: All 25 leaders awarded verified completion records',
        uploadedAt: '2026-09-16T10:38:00.000Z',
      },
    ],
    documents: [
      {
        id: 'doc-stitch-01',
        url: '#',
        fileName: 'Attendance_Sheet_Signed_Stitching_Sept16_2026.pdf',
        fileSize: '1.2 MB',
        fileType: 'pdf',
        category: 'Attendance Sheet',
        uploadedAt: '2026-09-16T11:00:00.000Z',
      },
      {
        id: 'doc-stitch-02',
        url: '#',
        fileName: 'Effective_Communication_SlideDeck_DTP.pptx',
        fileSize: '4.8 MB',
        fileType: 'pptx',
        category: 'Training Material',
        uploadedAt: '2026-09-16T11:05:00.000Z',
      },
      {
        id: 'doc-stitch-03',
        url: '#',
        fileName: 'Post_Training_Evaluation_Summary.xlsx',
        fileSize: '420 KB',
        fileType: 'xlsx',
        category: 'Training Evaluation',
        uploadedAt: '2026-09-16T11:10:00.000Z',
      },
    ],
  },
  {
    id: 'DTR-STITCH-2026-0002',
    departmentId: 'dept-stitching',
    departmentName: 'Stitching',
    date: '2026-08-14',
    subject: 'Lockstitch Needle Tension & Thread Breakage Prevention',
    traineesCount: 32,
    totalTime: '2.5 Hours',
    totalHours: 2.5,
    trainer: 'Engr. Marco Santos (Technical IE)',
    trainingType: 'Technical Operations',
    venue: 'Stitching Line Workshop Floor',
    startTime: '08:30 AM',
    endTime: '11:00 AM',
    category: 'Technical Skills',
    targetParticipants: 'Sewing Machine Operators & Line Mechanics',
    batch: 'Batch 2026-02',
    trainingObjective: 'Calibrate tension mechanisms on Juki high-speed lockstitch heads to minimize thread shear on synthetic upper materials.',
    remarks: 'Hands-on calibration executed on Line 2. Defect re-work dropped by 18% during subsequent run.',
    status: 'Completed',
    createdBy: 'Engr. Marco Santos',
    dateCreated: '2026-08-14T11:30:00.000Z',
    lastUpdated: '2026-08-14T14:00:00.000Z',
    year: 2026,
    customFields: {
      'cf-eval-score': 91,
      'cf-effectiveness': 'Good',
      'cf-exam-pass-rate': 95,
      'cf-supervisor-sign': true,
    },
    photos: [
      {
        id: 'photo-stitch-201',
        url: createTrainingPhotoSvg('Tension Calibration Demo', 'Mechanic demonstrating needle tension gauge adjustment', '#312e81', '#1d4ed8'),
        fileName: 'needle_calibration_demo.jpg',
        fileSize: '2.2 MB',
        caption: 'Demonstrating electronic tension calibration on Juki DDL-9000C',
        uploadedAt: '2026-08-14T11:45:00.000Z',
      },
      {
        id: 'photo-stitch-202',
        url: createTrainingPhotoSvg('Hands-on Practice', 'Operators adjusting bobbin case tension with spring gauges', '#064e3b', '#047857'),
        fileName: 'bobbin_tension_practice.jpg',
        fileSize: '2.0 MB',
        caption: 'Hands-on practice: Bobbin tension fine-tuning by line operators',
        uploadedAt: '2026-08-14T11:50:00.000Z',
      },
    ],
    documents: [
      {
        id: 'doc-stitch-201',
        url: '#',
        fileName: 'SOP_Needle_Tension_Maintenance.pdf',
        fileSize: '890 KB',
        fileType: 'pdf',
        category: 'Training Material',
        uploadedAt: '2026-08-14T12:00:00.000Z',
      },
    ],
  },
  {
    id: 'DTR-STITCH-2026-0003',
    departmentId: 'dept-stitching',
    departmentName: 'Stitching',
    date: '2026-10-08',
    subject: 'Ergonomic Seating & Repetitive Motion Injury Prevention',
    traineesCount: 40,
    totalTime: '1.5 Hours',
    totalHours: 1.5,
    trainer: 'Dr. Elena Ramos (Factory Clinic)',
    trainingType: 'Health & Safety',
    venue: 'DTP Training Room',
    startTime: '01:30 PM',
    endTime: '03:00 PM',
    category: 'Occupational Health',
    targetParticipants: 'All Stitching Line Operators & Helpers',
    batch: 'Batch 2026-04',
    trainingObjective: 'Teach micro-break stretching routines, foot pedal posture adjustment, and eye fatigue mitigation.',
    remarks: 'Scheduled session in Q4. Materials pre-approved by Occupational Safety Committee.',
    status: 'Scheduled',
    createdBy: 'System Administrator',
    dateCreated: '2026-09-01T09:00:00.000Z',
    lastUpdated: '2026-09-01T09:00:00.000Z',
    year: 2026,
    customFields: {},
    photos: [],
    documents: [
      {
        id: 'doc-stitch-301',
        url: '#',
        fileName: 'Stitching_Ergonomics_Guide_2026.pdf',
        fileSize: '1.5 MB',
        fileType: 'pdf',
        category: 'Training Material',
        uploadedAt: '2026-09-01T09:10:00.000Z',
      },
    ],
  },
  {
    id: 'DTR-CSR-2026-0001',
    departmentId: 'dept-csr',
    departmentName: 'CSR',
    date: '2026-07-22',
    subject: 'Workplace Human Rights, Anti-Harassment & Whistleblower Protections',
    traineesCount: 65,
    totalTime: '2 Hours',
    totalHours: 2.0,
    trainer: 'Atty. Liza Delgado (Compliance Counsel)',
    trainingType: 'CSR Compliance',
    venue: 'Main Factory Auditorium',
    startTime: '09:00 AM',
    endTime: '11:00 AM',
    category: 'CSR & Ethics',
    targetParticipants: 'Line Leaders, Supervisors & Workers Representatives',
    batch: 'CSR Annual Refresh 2026',
    trainingObjective: 'Educate on international labor standards, grievance box protocols, and zero-tolerance policies on retaliation.',
    remarks: 'Auditor verification completed. Anonymous suggestion hotline briefed to all attendees.',
    status: 'Completed',
    createdBy: 'System Administrator',
    dateCreated: '2026-07-22T12:00:00.000Z',
    lastUpdated: '2026-07-22T15:00:00.000Z',
    year: 2026,
    customFields: {
      'cf-eval-score': 96,
      'cf-effectiveness': 'Excellent',
      'cf-exam-pass-rate': 100,
      'cf-supervisor-sign': true,
    },
    photos: [
      {
        id: 'photo-csr-01',
        url: createTrainingPhotoSvg('Auditorium Session', 'Comprehensive presentation of worker rights and dispute channels', '#1e1b4b', '#4f46e5'),
        fileName: 'csr_auditorium_session.jpg',
        fileSize: '2.5 MB',
        caption: 'Full auditorium attendance with simultaneous bilingual translation',
        uploadedAt: '2026-07-22T12:30:00.000Z',
      },
      {
        id: 'photo-csr-02',
        url: createTrainingPhotoSvg('Q&A Dialogue', 'Interactive open-floor questions on confidential reporting channels', '#111827', '#0891b2'),
        fileName: 'csr_open_dialogue.jpg',
        fileSize: '1.9 MB',
        caption: 'Open Q&A addressing worker feedback mechanisms and anonymity',
        uploadedAt: '2026-07-22T12:35:00.000Z',
      },
    ],
    documents: [
      {
        id: 'doc-csr-01',
        url: '#',
        fileName: 'CSR_Code_Of_Conduct_Manual_2026.pdf',
        fileSize: '3.4 MB',
        fileType: 'pdf',
        category: 'Training Material',
        uploadedAt: '2026-07-22T13:00:00.000Z',
      },
      {
        id: 'doc-csr-02',
        url: '#',
        fileName: 'Worker_Acknowledgment_Roster_Signed.pdf',
        fileSize: '2.1 MB',
        fileType: 'pdf',
        category: 'Attendance Sheet',
        uploadedAt: '2026-07-22T13:10:00.000Z',
      },
    ],
  },
  {
    id: 'DTR-RUB-2026-0001',
    departmentId: 'dept-rubber',
    departmentName: 'Rubber',
    date: '2026-06-18',
    subject: 'High-Temperature Vulcanizing Press Safety & Lockout/Tagout (LOTO)',
    traineesCount: 28,
    totalTime: '3 Hours',
    totalHours: 3.0,
    trainer: 'Safety Officer Ramon Valenzuela',
    trainingType: 'Safety & Technical',
    venue: 'Rubber Molding Section',
    startTime: '08:00 AM',
    endTime: '11:00 AM',
    category: 'Machinery Safety',
    targetParticipants: 'Hydraulic Press Operators & Maintenance Technicians',
    batch: 'Rubber Safety 2026-Q2',
    trainingObjective: 'Establish strict LOTO compliance during mold replacement and mold cleaning cycles.',
    remarks: '100% practical demonstration pass rate. Lockout stations inspected and validated.',
    status: 'Completed',
    createdBy: 'System Administrator',
    dateCreated: '2026-06-18T11:30:00.000Z',
    lastUpdated: '2026-06-18T14:00:00.000Z',
    year: 2026,
    customFields: {
      'cf-eval-score': 95,
      'cf-effectiveness': 'Excellent',
      'cf-exam-pass-rate': 100,
      'cf-supervisor-sign': true,
    },
    photos: [
      {
        id: 'photo-rub-01',
        url: createTrainingPhotoSvg('LOTO Demonstration', 'Lockout tagout padlock application on 200-ton hydraulic press', '#78350f', '#b45309'),
        fileName: 'loto_drill_press.jpg',
        fileSize: '2.1 MB',
        caption: 'Practical demonstration of hydraulic power zero-energy isolation',
        uploadedAt: '2026-06-18T12:00:00.000Z',
      },
    ],
    documents: [
      {
        id: 'doc-rub-01',
        url: '#',
        fileName: 'Rubber_Press_LOTO_Procedure_2026.pdf',
        fileSize: '1.4 MB',
        fileType: 'pdf',
        category: 'Training Material',
        uploadedAt: '2026-06-18T12:30:00.000Z',
      },
    ],
  },
  {
    id: 'DTR-ASY-2026-0001',
    departmentId: 'dept-assembly',
    departmentName: 'Assembly',
    date: '2026-05-24',
    subject: 'Eco-Friendly Water-Based Primer & Outsole Cementing Accuracy',
    traineesCount: 35,
    totalTime: '2 Hours',
    totalHours: 2.0,
    trainer: 'Carlos Reyes (Chemical Engineer)',
    trainingType: 'SOP & Quality',
    venue: 'Assembly Conveyor Line 2',
    startTime: '01:00 PM',
    endTime: '03:00 PM',
    category: 'Quality & Process',
    targetParticipants: 'Sole Priming & Bonding Line Operators',
    batch: 'Batch 2026-05',
    trainingObjective: 'Standardize primer dry-film thickness and heat flash tunnel settings to eliminate bond failure.',
    remarks: 'Peel test strength verified in testing lab with zero delamination on test batch.',
    status: 'Completed',
    createdBy: 'System Administrator',
    dateCreated: '2026-05-24T15:30:00.000Z',
    lastUpdated: '2026-05-24T16:00:00.000Z',
    year: 2026,
    customFields: {
      'cf-eval-score': 89,
      'cf-effectiveness': 'Good',
      'cf-exam-pass-rate': 92,
      'cf-supervisor-sign': true,
    },
    photos: [
      {
        id: 'photo-asy-01',
        url: createTrainingPhotoSvg('Primer Application', 'Operator applying calibrated primer coat under extraction hood', '#083344', '#0891b2'),
        fileName: 'primer_conveyor_demo.jpg',
        fileSize: '2.3 MB',
        caption: 'Calibration of manual brush stroke width and adhesive weight',
        uploadedAt: '2026-05-24T15:45:00.000Z',
      },
    ],
    documents: [],
  },
  {
    id: 'DTR-QA-2025-0001',
    departmentId: 'dept-qa',
    departmentName: 'QA',
    date: '2025-11-18',
    subject: 'AQL 2.5 Major vs Minor Defect Visual Classification Masterclass',
    traineesCount: 20,
    totalTime: '4 Hours',
    totalHours: 4.0,
    trainer: 'Senior QA Manager Lin',
    trainingType: 'Quality Standards',
    venue: 'QA Testing Laboratory',
    startTime: '08:00 AM',
    endTime: '12:00 PM',
    category: 'Inspection & Compliance',
    targetParticipants: 'Final Quality Inspectors & Roaming QCs',
    batch: 'QA Annual 2025',
    trainingObjective: 'Align defect scoring with international brand buyer acceptance criteria.',
    remarks: 'Historical baseline training for annual certification.',
    status: 'Completed',
    createdBy: 'System Administrator',
    dateCreated: '2025-11-18T13:00:00.000Z',
    lastUpdated: '2025-11-18T13:00:00.000Z',
    year: 2025,
    customFields: {
      'cf-eval-score': 98,
      'cf-effectiveness': 'Excellent',
      'cf-exam-pass-rate': 100,
    },
    photos: [],
    documents: [],
  }
];
