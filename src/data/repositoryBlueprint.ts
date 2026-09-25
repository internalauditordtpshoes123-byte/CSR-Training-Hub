/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StoredFolderItem, TrainingDoc } from '../types';

export interface ExtendedFolderItem extends StoredFolderItem {
  rootCategory?: 'OPL' | 'Training Program';
  sectionCode?: string;
  auditTag?: string;
}

export interface DocumentTypeSpec {
  code: string;
  name: string;
  description: string;
  category: string;
  extension: string;
  retentionYears: number;
  approvalAuthority: string;
  auditRelevance: string;
  sampleFileName: string;
}

export const ESSENTIAL_DOCUMENT_TYPES: DocumentTypeSpec[] = [
  {
    code: 'OPL',
    name: 'One-Point Lesson',
    description: 'Concise, visual single-page job aids, shop floor troubleshooting tips, and maintenance cards.',
    category: 'OPL (One-Point Lesson)',
    extension: '.pdf / .png / .jpg',
    retentionYears: 5,
    approvalAuthority: 'T&D Specialist / Production Line Leader',
    auditRelevance: 'ISO 9001 / Lean Visual Workplace / Operator Competency',
    sampleFileName: 'OPL_MCH_Troubleshoot_ThreadBreakage_20260215_v1.2.pdf'
  },
  {
    code: 'SCH',
    name: 'Leadership Onboarding Schedule',
    description: 'Multi-week agenda detailing curriculum milestones, classroom dates, mentor hours, and exam timelines.',
    category: 'Training Program - New Trainee Leader',
    extension: '.xlsx / .pdf',
    retentionYears: 7,
    approvalAuthority: 'Training & Development Manager',
    auditRelevance: 'Leadership Succession Planning / Brand Labor Standards Audit',
    sampleFileName: 'TP_LEAD_2026B1_SCH_OnboardingMasterTimeline_20260105_v1.0.xlsx'
  },
  {
    code: 'ATT',
    name: 'Attendance & Roster Sheet',
    description: 'Signed or biometric attendance logs recording trainee hours, trainer sign-offs, and makeup sessions.',
    category: 'Training Program - New Trainee Leader',
    extension: '.pdf / .xlsx',
    retentionYears: 7,
    approvalAuthority: 'Lead Facilitator / HR Training Officer',
    auditRelevance: 'Social Compliance / Overtime & Training Hours Verification',
    sampleFileName: 'TP_LEAD_2026B1_ATT_LeadershipClassroomRoster_20260115_v1.0.pdf'
  },
  {
    code: 'MOD',
    name: 'Training Module & Slide Deck',
    description: 'Official slide decks, trainer facilitation guides, student handouts, and workshop exercises.',
    category: 'Training Program - Core Modules',
    extension: '.pptx / .pdf',
    retentionYears: 5,
    approvalAuthority: 'Training Manager / Technical Lead',
    auditRelevance: 'Content Validity / Instructional Integrity / ISO 9001:2015',
    sampleFileName: 'TP_LEAD_MOD_SupervisoryConflictResolution_20260120_v2.0.pdf'
  },
  {
    code: 'LOG',
    name: 'Coaching & Mentorship Log',
    description: 'Weekly 1-on-1 supervisor coaching notes, SMART milestone evaluations, and practical progress checks.',
    category: 'Training Program - New Trainee Leader',
    extension: '.docx / .pdf',
    retentionYears: 7,
    approvalAuthority: 'Assigned Department Head / Mentor',
    auditRelevance: 'Auditor Verification of Practical On-the-Job Mentorship',
    sampleFileName: 'TP_LEAD_2025B1_LOG_WeeklyMentorshipRecords_20250720_v1.0.docx'
  },
  {
    code: 'EVAL',
    name: 'Evaluation & Assessment Sheet',
    description: 'Pre-test, post-test, shop floor capstone evaluation, and trainee graduation certification rubric.',
    category: 'Training Program - New Trainee Leader',
    extension: '.xlsx / .pdf',
    retentionYears: 10,
    approvalAuthority: 'Operations Director / HR Manager',
    auditRelevance: 'Skill Qualification Audit / Promotion Eligibility Criteria',
    sampleFileName: 'TP_LEAD_2026B1_EVAL_FinalComprehensiveEvaluation_20260228_v1.0.xlsx'
  },
  {
    code: 'EHS-SOP',
    name: 'EHS Standard Operating Procedure',
    description: 'Work instructions for emergency evacuation, chemical handling, PPE compliance, and hazardous materials.',
    category: 'Training Program - EHS Relevant',
    extension: '.pdf',
    retentionYears: 10,
    approvalAuthority: 'EHS Safety Officer / General Manager',
    auditRelevance: 'OSHA / DOLE / ISO 14001 & ISO 45001 Regulatory Audits',
    sampleFileName: 'EHS_SOP_ChemicalHandlingEvacuationStandard_20260110_v3.0.pdf'
  },
  {
    code: 'EHS-INC',
    name: 'Incident Reporting & Investigation Tool',
    description: 'Near-miss reports, injury logs, root cause analysis (5-Why), and corrective action prevention (CAPA).',
    category: 'Training Program - EHS Relevant',
    extension: '.xlsx / .pdf',
    retentionYears: 30,
    approvalAuthority: 'Safety Committee Chairperson / HR Director',
    auditRelevance: 'Mandatory DOLE Incident Compliance / Buyer Safety Audits',
    sampleFileName: 'EHS_INC_NearMissCorrectiveActionLog_20260301_v1.1.xlsx'
  },
  {
    code: 'AB-POL',
    name: 'Anti-Bribery Policy & Code Handbook',
    description: 'Migrated anti-corruption charter, gift declaration threshold rules, and whistleblowing protections.',
    category: 'Training Program - Anti Bribery',
    extension: '.pdf',
    retentionYears: 10,
    approvalAuthority: 'Board of Directors / Legal Compliance Counsel',
    auditRelevance: 'ISO 37001 Anti-Bribery Management System / Buyer CSR Audit',
    sampleFileName: 'AB_POL_AntiBriberyEthicsPolicyManual_20260101_v4.0.pdf'
  },
  {
    code: 'AB-ACK',
    name: 'Employee Sign-off & Acknowledgment',
    description: 'Signed declaration acknowledging receipt, understanding, and compliance with anti-bribery policies.',
    category: 'Training Program - Anti Bribery',
    extension: '.pdf',
    retentionYears: 10,
    approvalAuthority: 'Compliance Officer / Employee Registry',
    auditRelevance: 'Legal Defense / Non-Bribery Attestation Audit Sample (100% target)',
    sampleFileName: 'AB_ACK_AnnualSignOffRosterMaster_20260210_v1.0.pdf'
  },
  {
    code: 'ST-SOP',
    name: 'Stitching Sewing Operations SOP',
    description: 'Step-by-step sewing technical instruction, needle tension specs, seam allowances, and machine setup.',
    category: 'Training Program - Stitching Skill',
    extension: '.pdf',
    retentionYears: 5,
    approvalAuthority: 'Senior Technical Trainer / Chief Quality Inspector',
    auditRelevance: 'Technical Quality Audit / Shoe Upper Construction Compliance',
    sampleFileName: 'ST_SOP_DoubleNeedleLockstitchUpperAssembly_20260220_v2.1.pdf'
  },
  {
    code: 'ST-DEF',
    name: 'Quality Defect & Blue Label Guideline',
    description: 'Visual defect catalog detailing critical/major/minor defects, acceptable quality limits (AQL), and blue label.',
    category: 'Training Program - Stitching Skill',
    extension: '.pdf',
    retentionYears: 5,
    approvalAuthority: 'QA Department Head / Stitching Supervisor',
    auditRelevance: 'Product Quality Verification / Buyer Technical Certification',
    sampleFileName: 'ST_DEF_VisualDefectCatalogBlueLabelMatrix_20260315_v2.0.pdf'
  }
];

export const STANDARDIZED_REPOSITORY_FOLDERS: ExtendedFolderItem[] = [
  // ==========================================
  // ROOT DIRECTORY 1: OPL (One-Point Lesson)
  // ==========================================
  {
    id: 'f-opl-root',
    name: 'OPL (One-Point Lesson)',
    parentId: null,
    rootCategory: 'OPL',
    createdAt: '2026-01-01',
    createdBy: 'Training & Development Manager',
    description: 'Standalone root directory dedicated to concise, visual single-point lessons, quick shop floor troubleshooting tips, and machine or process maintenance reminders.',
    icon: 'Sparkles',
    sectionCode: 'OPL'
  },

  // ==========================================
  // ROOT DIRECTORY 2: Training Program
  // ==========================================
  {
    id: 'f-tp-root',
    name: 'Training Program',
    parentId: null,
    rootCategory: 'Training Program',
    createdAt: '2026-01-01',
    createdBy: 'Training & Development Manager',
    description: 'Main directory housing the core training modules, leadership cohort tracks, EHS compliance, anti-bribery system, and technical stitching skill curricula.',
    icon: 'GraduationCap',
    sectionCode: 'TP'
  },

  // ------------------------------------------
  // Sub-Branch A: New Trainee Leader (6 Batches)
  // ------------------------------------------
  {
    id: 'f-tp-leader-root',
    name: 'New Trainee Leader',
    parentId: 'f-tp-root',
    rootCategory: 'Training Program',
    createdAt: '2026-01-01',
    createdBy: 'Training & Development Manager',
    description: 'Comprehensive leadership pipeline programs organized into 2025 and 2026 cohorts with 5 mandatory audit-ready subfolders per cohort.',
    icon: 'Users',
    sectionCode: 'TP-LDR'
  },

  // Batch 1: 2025 1st Batch (July to August)
  {
    id: 'f-ldr-2025-b1',
    name: '2025 1st Batch (July to August)',
    parentId: 'f-tp-leader-root',
    rootCategory: 'Training Program',
    createdAt: '2025-07-01',
    createdBy: 'Training & Development Manager',
    description: 'Cohort 2025-B1 leadership development archive.',
    icon: 'Folder',
    sectionCode: 'LDR-2025-B1'
  },
  { id: 'f-ldr-2025-b1-sch', name: '01 Leadership Onboarding Schedules', parentId: 'f-ldr-2025-b1', createdAt: '2025-07-01', createdBy: 'Training & Development Manager', sectionCode: 'SCH' },
  { id: 'f-ldr-2025-b1-att', name: '02 Attendance Sheets', parentId: 'f-ldr-2025-b1', createdAt: '2025-07-01', createdBy: 'Training & Development Manager', sectionCode: 'ATT' },
  { id: 'f-ldr-2025-b1-mod', name: '03 Training Modules', parentId: 'f-ldr-2025-b1', createdAt: '2025-07-01', createdBy: 'Training & Development Manager', sectionCode: 'MOD' },
  { id: 'f-ldr-2025-b1-log', name: '04 Coaching Logs', parentId: 'f-ldr-2025-b1', createdAt: '2025-07-01', createdBy: 'Training & Development Manager', sectionCode: 'LOG' },
  { id: 'f-ldr-2025-b1-eval', name: '05 Evaluations', parentId: 'f-ldr-2025-b1', createdAt: '2025-07-01', createdBy: 'Training & Development Manager', sectionCode: 'EVAL' },

  // Batch 2: 2025 2nd Batch (July to August)
  {
    id: 'f-ldr-2025-b2',
    name: '2025 2nd Batch (July to August)',
    parentId: 'f-tp-leader-root',
    rootCategory: 'Training Program',
    createdAt: '2025-07-15',
    createdBy: 'Training & Development Manager',
    description: 'Cohort 2025-B2 leadership development archive.',
    icon: 'Folder',
    sectionCode: 'LDR-2025-B2'
  },
  { id: 'f-ldr-2025-b2-sch', name: '01 Leadership Onboarding Schedules', parentId: 'f-ldr-2025-b2', createdAt: '2025-07-15', createdBy: 'Training & Development Manager', sectionCode: 'SCH' },
  { id: 'f-ldr-2025-b2-att', name: '02 Attendance Sheets', parentId: 'f-ldr-2025-b2', createdAt: '2025-07-15', createdBy: 'Training & Development Manager', sectionCode: 'ATT' },
  { id: 'f-ldr-2025-b2-mod', name: '03 Training Modules', parentId: 'f-ldr-2025-b2', createdAt: '2025-07-15', createdBy: 'Training & Development Manager', sectionCode: 'MOD' },
  { id: 'f-ldr-2025-b2-log', name: '04 Coaching Logs', parentId: 'f-ldr-2025-b2', createdAt: '2025-07-15', createdBy: 'Training & Development Manager', sectionCode: 'LOG' },
  { id: 'f-ldr-2025-b2-eval', name: '05 Evaluations', parentId: 'f-ldr-2025-b2', createdAt: '2025-07-15', createdBy: 'Training & Development Manager', sectionCode: 'EVAL' },

  // Batch 3: 2026 1st Batch (January to February)
  {
    id: 'f-ldr-2026-b1',
    name: '2026 1st Batch (January to February)',
    parentId: 'f-tp-leader-root',
    rootCategory: 'Training Program',
    createdAt: '2026-01-05',
    createdBy: 'Training & Development Manager',
    description: 'Cohort 2026-B1 leadership development archive (Q1 Active Cohort).',
    icon: 'Folder',
    sectionCode: 'LDR-2026-B1'
  },
  { id: 'f-ldr-2026-b1-sch', name: '01 Leadership Onboarding Schedules', parentId: 'f-ldr-2026-b1', createdAt: '2026-01-05', createdBy: 'Training & Development Manager', sectionCode: 'SCH' },
  { id: 'f-ldr-2026-b1-att', name: '02 Attendance Sheets', parentId: 'f-ldr-2026-b1', createdAt: '2026-01-05', createdBy: 'Training & Development Manager', sectionCode: 'ATT' },
  { id: 'f-ldr-2026-b1-mod', name: '03 Training Modules', parentId: 'f-ldr-2026-b1', createdAt: '2026-01-05', createdBy: 'Training & Development Manager', sectionCode: 'MOD' },
  { id: 'f-ldr-2026-b1-log', name: '04 Coaching Logs', parentId: 'f-ldr-2026-b1', createdAt: '2026-01-05', createdBy: 'Training & Development Manager', sectionCode: 'LOG' },
  { id: 'f-ldr-2026-b1-eval', name: '05 Evaluations', parentId: 'f-ldr-2026-b1', createdAt: '2026-01-05', createdBy: 'Training & Development Manager', sectionCode: 'EVAL' },

  // Batch 4: 2026 2nd Batch (January to February)
  {
    id: 'f-ldr-2026-b2',
    name: '2026 2nd Batch (January to February)',
    parentId: 'f-tp-leader-root',
    rootCategory: 'Training Program',
    createdAt: '2026-01-20',
    createdBy: 'Training & Development Manager',
    description: 'Cohort 2026-B2 leadership development archive (Q1 Second Track).',
    icon: 'Folder',
    sectionCode: 'LDR-2026-B2'
  },
  { id: 'f-ldr-2026-b2-sch', name: '01 Leadership Onboarding Schedules', parentId: 'f-ldr-2026-b2', createdAt: '2026-01-20', createdBy: 'Training & Development Manager', sectionCode: 'SCH' },
  { id: 'f-ldr-2026-b2-att', name: '02 Attendance Sheets', parentId: 'f-ldr-2026-b2', createdAt: '2026-01-20', createdBy: 'Training & Development Manager', sectionCode: 'ATT' },
  { id: 'f-ldr-2026-b2-mod', name: '03 Training Modules', parentId: 'f-ldr-2026-b2', createdAt: '2026-01-20', createdBy: 'Training & Development Manager', sectionCode: 'MOD' },
  { id: 'f-ldr-2026-b2-log', name: '04 Coaching Logs', parentId: 'f-ldr-2026-b2', createdAt: '2026-01-20', createdBy: 'Training & Development Manager', sectionCode: 'LOG' },
  { id: 'f-ldr-2026-b2-eval', name: '05 Evaluations', parentId: 'f-ldr-2026-b2', createdAt: '2026-01-20', createdBy: 'Training & Development Manager', sectionCode: 'EVAL' },

  // Batch 5: 2026 1st Batch (August to September)
  {
    id: 'f-ldr-2026-b3',
    name: '2026 1st Batch (August to September)',
    parentId: 'f-tp-leader-root',
    rootCategory: 'Training Program',
    createdAt: '2026-08-01',
    createdBy: 'Training & Development Manager',
    description: 'Cohort 2026-B3 leadership pipeline (Q3 Cohort).',
    icon: 'Folder',
    sectionCode: 'LDR-2026-B3'
  },
  { id: 'f-ldr-2026-b3-sch', name: '01 Leadership Onboarding Schedules', parentId: 'f-ldr-2026-b3', createdAt: '2026-08-01', createdBy: 'Training & Development Manager', sectionCode: 'SCH' },
  { id: 'f-ldr-2026-b3-att', name: '02 Attendance Sheets', parentId: 'f-ldr-2026-b3', createdAt: '2026-08-01', createdBy: 'Training & Development Manager', sectionCode: 'ATT' },
  { id: 'f-ldr-2026-b3-mod', name: '03 Training Modules', parentId: 'f-ldr-2026-b3', createdAt: '2026-08-01', createdBy: 'Training & Development Manager', sectionCode: 'MOD' },
  { id: 'f-ldr-2026-b3-log', name: '04 Coaching Logs', parentId: 'f-ldr-2026-b3', createdAt: '2026-08-01', createdBy: 'Training & Development Manager', sectionCode: 'LOG' },
  { id: 'f-ldr-2026-b3-eval', name: '05 Evaluations', parentId: 'f-ldr-2026-b3', createdAt: '2026-08-01', createdBy: 'Training & Development Manager', sectionCode: 'EVAL' },

  // Batch 6: 2026 2nd Batch (August to September)
  {
    id: 'f-ldr-2026-b4',
    name: '2026 2nd Batch (August to September)',
    parentId: 'f-tp-leader-root',
    rootCategory: 'Training Program',
    createdAt: '2026-08-15',
    createdBy: 'Training & Development Manager',
    description: 'Cohort 2026-B4 leadership pipeline (Q3 Cohort).',
    icon: 'Folder',
    sectionCode: 'LDR-2026-B4'
  },
  { id: 'f-ldr-2026-b4-sch', name: '01 Leadership Onboarding Schedules', parentId: 'f-ldr-2026-b4', createdAt: '2026-08-15', createdBy: 'Training & Development Manager', sectionCode: 'SCH' },
  { id: 'f-ldr-2026-b4-att', name: '02 Attendance Sheets', parentId: 'f-ldr-2026-b4', createdAt: '2026-08-15', createdBy: 'Training & Development Manager', sectionCode: 'ATT' },
  { id: 'f-ldr-2026-b4-mod', name: '03 Training Modules', parentId: 'f-ldr-2026-b4', createdAt: '2026-08-15', createdBy: 'Training & Development Manager', sectionCode: 'MOD' },
  { id: 'f-ldr-2026-b4-log', name: '04 Coaching Logs', parentId: 'f-ldr-2026-b4', createdAt: '2026-08-15', createdBy: 'Training & Development Manager', sectionCode: 'LOG' },
  { id: 'f-ldr-2026-b4-eval', name: '05 Evaluations', parentId: 'f-ldr-2026-b4', createdAt: '2026-08-15', createdBy: 'Training & Development Manager', sectionCode: 'EVAL' },

  // ------------------------------------------
  // Sub-Branch B: EHS Relevant
  // ------------------------------------------
  {
    id: 'f-tp-ehs-root',
    name: 'EHS Relevant',
    parentId: 'f-tp-root',
    rootCategory: 'Training Program',
    createdAt: '2026-01-01',
    createdBy: 'Training & Development Manager',
    description: 'Environment, Health, and Safety guidelines, standard operating procedures, safety compliance documentation, and incident reporting tools.',
    icon: 'Shield',
    sectionCode: 'TP-EHS'
  },
  {
    id: 'f-ehs-guidelines',
    name: '01 Safety Guidelines & Manuals',
    parentId: 'f-tp-ehs-root',
    createdAt: '2026-01-01',
    createdBy: 'EHS Safety Officer',
    description: 'General safety rulebooks, fire emergency handbooks, ergonomic principles, and chemical safety data sheets (SDS).',
    sectionCode: 'EHS-MAN'
  },
  {
    id: 'f-ehs-sops',
    name: '02 Standard Operating Procedures (SOP)',
    parentId: 'f-tp-ehs-root',
    createdAt: '2026-01-01',
    createdBy: 'EHS Safety Officer',
    description: 'Mandatory standard operating procedures for equipment lockout-tagout (LOTO), confined space entry, and hazardous disposal.',
    sectionCode: 'EHS-SOP'
  },
  {
    id: 'f-ehs-compliance',
    name: '03 Safety Compliance Documentation & Permits',
    parentId: 'f-tp-ehs-root',
    createdAt: '2026-01-01',
    createdBy: 'EHS Safety Officer',
    description: 'Regulatory audit certifications, DOLE permits, fire department inspection clearances, and environmental emission audits.',
    sectionCode: 'EHS-CMP'
  },
  {
    id: 'f-ehs-incident',
    name: '04 Incident Reporting Tools & CAPA Logs',
    parentId: 'f-tp-ehs-root',
    createdAt: '2026-01-01',
    createdBy: 'EHS Safety Officer',
    description: 'Interactive incident investigation forms, near-miss logging templates, 5-Why root cause tools, and CAPA follow-up tracker.',
    sectionCode: 'EHS-INC'
  },

  // ------------------------------------------
  // Sub-Branch C: Anti Bribery
  // ------------------------------------------
  {
    id: 'f-tp-antibribery-root',
    name: 'Anti Bribery',
    parentId: 'f-tp-root',
    rootCategory: 'Training Program',
    createdAt: '2026-01-01',
    createdBy: 'Training & Development Manager',
    description: 'The migrated anti-bribery policies, code of conduct handbooks, employee sign-off/acknowledgment forms, and compliance training records.',
    icon: 'ShieldCheck',
    sectionCode: 'TP-AB'
  },
  {
    id: 'f-ab-policies',
    name: '01 Migrated Anti-Bribery Policies',
    parentId: 'f-tp-antibribery-root',
    createdAt: '2026-01-01',
    createdBy: 'Corporate Compliance Officer',
    description: 'ISO 37001 Anti-Bribery policies, anti-corruption standards, zero-tolerance declarations, and supplier code of conduct.',
    sectionCode: 'AB-POL'
  },
  {
    id: 'f-ab-conduct',
    name: '02 Code of Conduct Handbooks',
    parentId: 'f-tp-antibribery-root',
    createdAt: '2026-01-01',
    createdBy: 'Corporate Compliance Officer',
    description: 'Bilingual employee handbooks, ethical behavior guidelines, conflicts of interest guidelines, and gift acceptance thresholds.',
    sectionCode: 'AB-HND'
  },
  {
    id: 'f-ab-signoff',
    name: '03 Employee Sign-Off & Acknowledgment Forms',
    parentId: 'f-tp-antibribery-root',
    createdAt: '2026-01-01',
    createdBy: 'HR Training Registrar',
    description: 'Signed annual acknowledgment rosters, new hire anti-bribery declarations, and digital verification certificates.',
    sectionCode: 'AB-ACK'
  },
  {
    id: 'f-ab-training',
    name: '04 Compliance Training Records & Quizzes',
    parentId: 'f-tp-antibribery-root',
    createdAt: '2026-01-01',
    createdBy: 'Training & Development Manager',
    description: 'Anti-bribery workshop agendas, post-training evaluation quizzes, passing certificates, and annual training hour audits.',
    sectionCode: 'AB-REC'
  },

  // ------------------------------------------
  // Sub-Branch D: Stitching Skill
  // ------------------------------------------
  {
    id: 'f-tp-stitching-root',
    name: 'Stitching Skill',
    parentId: 'f-tp-root',
    rootCategory: 'Training Program',
    createdAt: '2026-01-01',
    createdBy: 'Training & Development Manager',
    description: 'Technical training modules, standard operating procedures for sewing operations, quality defect guidelines, and instructional materials.',
    icon: 'Scissors',
    sectionCode: 'TP-ST'
  },
  {
    id: 'f-st-modules',
    name: '01 Technical Sewing Training Modules',
    parentId: 'f-tp-stitching-root',
    createdAt: '2026-01-01',
    createdBy: 'Technical Stitching Trainer',
    description: 'Single needle lockstitch, computerized zig-zag, overlock, post-bed stitching curriculum, and stitch speed progression.',
    sectionCode: 'ST-MOD'
  },
  {
    id: 'f-st-sops',
    name: '02 Sewing Operations Standard Operating Procedures',
    parentId: 'f-tp-stitching-root',
    createdAt: '2026-01-01',
    createdBy: 'Technical Stitching Trainer',
    description: 'Work instructions for shoe upper joining, counter reinforcement, backstay sewing, and tension gauge setup.',
    sectionCode: 'ST-SOP'
  },
  {
    id: 'f-st-defects',
    name: '03 Quality Defect Guidelines & Blue Label Criteria',
    parentId: 'f-tp-stitching-root',
    createdAt: '2026-01-01',
    createdBy: 'Quality Assurance Head',
    description: 'Visual guide to skipped stitches, needle holes, raw edges, oil marks, seam puckering, and Blue Label operator grading matrix.',
    sectionCode: 'ST-DEF'
  },
  {
    id: 'f-st-materials',
    name: '04 Instructional Materials & Visual Job Aids',
    parentId: 'f-tp-stitching-root',
    createdAt: '2026-01-01',
    createdBy: 'Technical Stitching Trainer',
    description: 'Thread type selector charts, needle size compatibility matrices, machine breakdown diagrams, and video demo transcripts.',
    sectionCode: 'ST-MAT'
  }
];

export const INITIAL_BLUEPRINT_DOCUMENTS: TrainingDoc[] = [
  // 2025 Cohorts
  {
    id: 'DOC-LDR25-01',
    name: '2025 1st Batch: Master Leadership Onboarding Schedule',
    type: 'Material',
    fileName: 'TP_LDR_2025B1_SCH_MasterOnboardingTimeline_20250701_v1.0.xlsx',
    uploadedBy: 'John Smith (T&D Manager)',
    uploadDate: '2025-07-01',
    fileSize: '450 KB',
    category: 'Leadership Onboarding',
    folderId: 'f-ldr-2025-b1-sch'
  },
  {
    id: 'DOC-LDR25-02',
    name: '2025 1st Batch: Signed Attendance Log & Biometric Summary',
    type: 'Certificate',
    fileName: 'TP_LDR_2025B1_ATT_BiometricAttendanceSummary_20250830_v1.0.pdf',
    uploadedBy: 'HR Registrar',
    uploadDate: '2025-08-30',
    fileSize: '2.1 MB',
    category: 'Attendance Sheets',
    folderId: 'f-ldr-2025-b1-att'
  },
  {
    id: 'DOC-LDR25-03',
    name: '2025 1st Batch: Supervisory Mentorship & Coaching Logs',
    type: 'Material',
    fileName: 'TP_LDR_2025B1_LOG_SupervisorMentorshipRecords_20250815_v1.0.docx',
    uploadedBy: 'Robert Vance (Floor Director)',
    uploadDate: '2025-08-15',
    fileSize: '720 KB',
    category: 'Coaching Logs',
    folderId: 'f-ldr-2025-b1-log'
  },

  // 2026 Cohorts
  {
    id: 'DOC-LDR26-01',
    name: '2026 1st Batch (Jan-Feb): Trainee Leader Orientation Calendar',
    type: 'Material',
    fileName: 'TP_LDR_2026B1_SCH_LeadershipOnboardingSchedule_20260105_v1.0.xlsx',
    uploadedBy: 'John Smith (T&D Manager)',
    uploadDate: '2026-01-05',
    fileSize: '510 KB',
    category: 'Leadership Onboarding',
    folderId: 'f-ldr-2026-b1-sch'
  },
  {
    id: 'DOC-LDR26-02',
    name: '2026 1st Batch (Jan-Feb): Classroom & Shop Floor Attendance Sheet',
    type: 'Certificate',
    fileName: 'TP_LDR_2026B1_ATT_ClassroomAttendanceRoster_20260120_v1.0.pdf',
    uploadedBy: 'Sarah Jenkins (T&D Specialist)',
    uploadDate: '2026-01-20',
    fileSize: '1.8 MB',
    category: 'Attendance Sheets',
    folderId: 'f-ldr-2026-b1-att'
  },
  {
    id: 'DOC-LDR26-03',
    name: '2026 1st Batch (Jan-Feb): Module 1 - Frontline Supervisory Principles',
    type: 'Material',
    fileName: 'TP_LDR_2026B1_MOD_FrontlineSupervisorPrinciples_20260112_v2.0.pptx',
    uploadedBy: 'John Smith (T&D Manager)',
    uploadDate: '2026-01-12',
    fileSize: '6.4 MB',
    category: 'Training Modules',
    folderId: 'f-ldr-2026-b1-mod'
  },
  {
    id: 'DOC-LDR26-04',
    name: '2026 1st Batch (Jan-Feb): Weekly Coaching & Kaizen Progress Logs',
    type: 'Material',
    fileName: 'TP_LDR_2026B1_LOG_WeeklyCoachingKaizenProgress_20260215_v1.0.docx',
    uploadedBy: 'Carlos Reyes (Production Coach)',
    uploadDate: '2026-02-15',
    fileSize: '890 KB',
    category: 'Coaching Logs',
    folderId: 'f-ldr-2026-b1-log'
  },
  {
    id: 'DOC-LDR26-05',
    name: '2026 1st Batch (Jan-Feb): Comprehensive Trainee Evaluation & Scoring',
    type: 'Certificate',
    fileName: 'TP_LDR_2026B1_EVAL_CapstoneEvaluationMatrix_20260228_v1.0.xlsx',
    uploadedBy: 'Operations Evaluation Board',
    uploadDate: '2026-02-28',
    fileSize: '1.1 MB',
    category: 'Evaluations',
    folderId: 'f-ldr-2026-b1-eval'
  },

  // EHS Relevant
  {
    id: 'DOC-EHS-01',
    name: 'Emergency Evacuation & Crisis Response Standard Guidelines',
    type: 'SOP',
    fileName: 'EHS_MAN_EmergencyEvacuationCrisisManual_20260110_v3.0.pdf',
    uploadedBy: 'Elena Torres (Safety Officer)',
    uploadDate: '2026-01-10',
    fileSize: '3.4 MB',
    category: 'EHS Guidelines',
    folderId: 'f-ehs-guidelines'
  },
  {
    id: 'DOC-EHS-02',
    name: 'Factory Machine Guarding & Lockout-Tagout (LOTO) SOP',
    type: 'SOP',
    fileName: 'EHS_SOP_LockoutTagoutMachineGuarding_20260201_v2.1.pdf',
    uploadedBy: 'Carlos Reyes (Safety Officer)',
    uploadDate: '2026-02-01',
    fileSize: '2.5 MB',
    category: 'EHS SOP',
    folderId: 'f-ehs-sops'
  },
  {
    id: 'DOC-EHS-03',
    name: 'Annual Factory Environmental & Fire Safety Audit Certification',
    type: 'Certificate',
    fileName: 'EHS_CMP_AnnualFireEnvironmentalAuditCert_20260301_v1.0.pdf',
    uploadedBy: 'Subic Bay Safety Inspection Board',
    uploadDate: '2026-03-01',
    fileSize: '1.9 MB',
    category: 'EHS Compliance',
    folderId: 'f-ehs-compliance'
  },
  {
    id: 'DOC-EHS-04',
    name: 'Digital Shop Floor Incident & Near-Miss Investigation Tool',
    type: 'Material',
    fileName: 'EHS_INC_IncidentReportingRootCauseInvestigation_20260310_v2.0.xlsx',
    uploadedBy: 'Elena Torres (Safety Officer)',
    uploadDate: '2026-03-10',
    fileSize: '1.3 MB',
    category: 'Incident Reporting',
    folderId: 'f-ehs-incident'
  },

  // Anti Bribery
  {
    id: 'DOC-AB-01',
    name: 'Migrated Anti-Bribery & Anti-Corruption Corporate Policy Manual',
    type: 'SOP',
    fileName: 'AB_POL_AntiBriberyManagementSystemManual_20260101_v4.0.pdf',
    uploadedBy: 'Compliance Committee',
    uploadDate: '2026-01-01',
    fileSize: '4.8 MB',
    category: 'Anti Bribery Policy',
    folderId: 'f-ab-policies'
  },
  {
    id: 'DOC-AB-02',
    name: 'DATIAN Employee Code of Conduct & Ethics Handbook',
    type: 'Material',
    fileName: 'AB_HND_EmployeeCodeOfConductHandbook_20260115_v3.2.pdf',
    uploadedBy: 'HR Corporate Compliance',
    uploadDate: '2026-01-15',
    fileSize: '3.6 MB',
    category: 'Code of Conduct',
    folderId: 'f-ab-conduct'
  },
  {
    id: 'DOC-AB-03',
    name: 'Annual Employee Anti-Bribery Sign-Off & Acknowledgment Master Roster',
    type: 'Certificate',
    fileName: 'AB_ACK_AnnualSignOffMasterRoster_20260215_v1.0.pdf',
    uploadedBy: 'HR Compliance Registrar',
    uploadDate: '2026-02-15',
    fileSize: '5.2 MB',
    category: 'Sign-Off Acknowledgment',
    folderId: 'f-ab-signoff'
  },
  {
    id: 'DOC-AB-04',
    name: 'Anti-Bribery Annual Training Attendance & Comprehension Exam Results',
    type: 'Certificate',
    fileName: 'AB_REC_ComplianceTrainingAttendanceExamLogs_20260228_v1.0.xlsx',
    uploadedBy: 'John Smith (T&D Manager)',
    uploadDate: '2026-02-28',
    fileSize: '2.4 MB',
    category: 'Compliance Training Records',
    folderId: 'f-ab-training'
  },

  // Stitching Skill
  {
    id: 'DOC-ST-01',
    name: 'Technical Module: Precision Sewing & Computerized Overlock Operation',
    type: 'Material',
    fileName: 'ST_MOD_PrecisionOverlockSewingCurriculum_20260115_v2.0.pptx',
    uploadedBy: 'Mary Jane (Technical Trainer)',
    uploadDate: '2026-01-15',
    fileSize: '8.5 MB',
    category: 'Stitching Module',
    folderId: 'f-st-modules'
  },
  {
    id: 'DOC-ST-02',
    name: 'Standard Operating Procedure: Single Needle Lockstitch Upper Construction',
    type: 'SOP',
    fileName: 'ST_SOP_LockstitchUpperConstructionGuide_20260205_v3.1.pdf',
    uploadedBy: 'Mary Jane (Technical Trainer)',
    uploadDate: '2026-02-05',
    fileSize: '3.9 MB',
    category: 'Stitching SOP',
    folderId: 'f-st-sops'
  },
  {
    id: 'DOC-ST-03',
    name: 'Quality Defect Handbook & Blue Label Certification Criteria',
    type: 'SOP',
    fileName: 'ST_DEF_VisualDefectAtlasBlueLabelStandards_20260220_v2.0.pdf',
    uploadedBy: 'Sarah Jenkins (QA Head)',
    uploadDate: '2026-02-20',
    fileSize: '6.1 MB',
    category: 'Quality Defect Guidelines',
    folderId: 'f-st-defects'
  },
  {
    id: 'DOC-ST-04',
    name: 'Operator Visual Aid: Needle Sizing & Thread Compatibility Chart',
    type: 'Material',
    fileName: 'ST_MAT_NeedleThreadCompatibilityChart_20260301_v1.0.pdf',
    uploadedBy: 'Technical Services Unit',
    uploadDate: '2026-03-01',
    fileSize: '1.7 MB',
    category: 'Instructional Materials',
    folderId: 'f-st-materials'
  }
];

export const FILE_NAMING_RULE = {
  formula: '[SYSTEM]_[CATEGORY/BATCH]_[DOCTYPE]_[DESCRIPTION]_[YYYYMMDD]_[vX.X].[ext]',
  explanation: 'Ensures immediate file identification, automated sorting, audit traceability, and tamper-proof version control.',
  components: [
    { label: 'SYSTEM', description: 'Root repository identifier', examples: ['OPL', 'TP', 'EHS', 'AB', 'ST'] },
    { label: 'CATEGORY/BATCH', description: 'Department or cohort track', examples: ['LDR_2025B1', 'LDR_2026B1', 'SAF', 'POL', 'MCH'] },
    { label: 'DOCTYPE', description: 'Standardized document type code', examples: ['SOP', 'SCH', 'ATT', 'MOD', 'LOG', 'EVAL', 'INC', 'ACK'] },
    { label: 'DESCRIPTION', description: 'Concise PascalCase topic title without spaces or illegal characters', examples: ['NeedleTensionAdjustment', 'FrontlineSupervisorPrinciples', 'EmergencyEvacuationManual'] },
    { label: 'YYYYMMDD', description: 'Effective / approved date in ISO standard format', examples: ['20260115', '20260228', '20250815'] },
    { label: 'vX.X', description: 'Version control (major revisions increment whole number; minor adjustments increment decimal)', examples: ['v1.0', 'v2.1', 'v3.0'] }
  ]
};
