/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { INITIAL_EMPLOYEES } from "./src/data/employeesData";
import {
  canAccessRecord,
  resolveRecordSection,
  resolveRecordDepartment,
  isSectionLeader,
  getUserAssignedSection,
  normalizeSection,
  DEFAULT_SECTION_LEADERS
} from "./src/utils/sectionSecurity";
import {
  DEFAULT_DEPARTMENT_FOLDERS,
  DEFAULT_TRAINING_RECORDS,
  DEFAULT_CUSTOM_FIELDS
} from "./src/components/departmentTraining/defaultData";
import { DEFAULT_DEPARTMENT_ITEMS } from "./src/data";
import { STANDARDIZED_REPOSITORY_FOLDERS, INITIAL_BLUEPRINT_DOCUMENTS } from "./src/data/repositoryBlueprint";

// Active user sessions map for stateful security tokens
const activeSessions = new Map<string, any>();

function getRequestUser(req: Request): any {
  // 1. Authorization header Bearer token
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    if (activeSessions.has(token)) {
      return activeSessions.get(token);
    }
  }

  // 2. Custom header token
  const userTokenHeader = req.headers["x-user-token"] as string;
  if (userTokenHeader && activeSessions.has(userTokenHeader)) {
    return activeSessions.get(userTokenHeader);
  }

  // 3. Custom role/section headers
  const userRoleHeader = (req.headers["x-user-role"] as string) || (req.headers["x-role"] as string);
  const userSectionHeader = (req.headers["x-user-section"] as string) || (req.headers["x-assigned-section"] as string);
  const userDeptHeader = (req.headers["x-user-department"] as string) || (req.headers["x-department"] as string);
  const userIdHeader = (req.headers["x-user-id"] as string) || (req.headers["x-employee-id"] as string);
  if (userRoleHeader) {
    return {
      id: userIdHeader,
      role: userRoleHeader,
      assignedSection: userSectionHeader,
      section: userSectionHeader,
      department: userDeptHeader
    };
  }

  // 4. Request body user context
  if (req.body && req.body.authenticatedUser) {
    return req.body.authenticatedUser;
  }
  if (req.body && req.body.currentUser) {
    return req.body.currentUser;
  }

  // 5. Query parameters (e.g. for direct file download links)
  if (req.query.token && typeof req.query.token === "string" && activeSessions.has(req.query.token)) {
    return activeSessions.get(req.query.token);
  }
  if (req.query.userRole && typeof req.query.userRole === "string") {
    return {
      role: req.query.userRole as string,
      assignedSection: req.query.userSection as string,
      section: req.query.userSection as string,
      department: req.query.userDept as string
    };
  }

  return null;
}

// Storage directory configuration
const DATA_DIR = path.join(process.cwd(), "storage_data");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
const DB_FILE = path.join(DATA_DIR, "database.json");

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
const CHAT_IMAGES_DIR = path.join(UPLOADS_DIR, "chat_images");
if (!fs.existsSync(CHAT_IMAGES_DIR)) {
  fs.mkdirSync(CHAT_IMAGES_DIR, { recursive: true });
}
const DEPT_FILES_DIR = path.join(UPLOADS_DIR, "department_training");
if (!fs.existsSync(DEPT_FILES_DIR)) {
  fs.mkdirSync(DEPT_FILES_DIR, { recursive: true });
}
const BACKUPS_DIR = path.join(DATA_DIR, "backups");
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

// Initial Database Structure
interface ServerDatabase {
  employees: any[];
  logs: any[];
  courses: any[];
  records: any[];
  documents: any[];
  folders: any[];
  stitchingRecords: any[];
  stitchingFolders?: {
    id: string;
    name: string;
    code?: string;
    auditDate: string;
    dateColumnHeader: string;
    rows: any[];
    createdAt?: string;
    updatedAt?: string;
    updatedBy?: string;
  }[];
  activeStitchingFolderId?: string;
  stitchingAuditTable?: {
    auditDate: string;
    dateColumnHeader: string;
    rows: any[];
    updatedAt?: string;
    updatedBy?: string;
  };
  departmentItems: any[];
  departmentFolders?: any[];
  departmentTrainingRecords?: any[];
  departmentCustomFields?: any[];
  departmentTrainingFiles?: Record<string, any>;
  notifications: any[];
  leadershipAttendance: any[];
  leadershipFiles: any[];
  leadershipSchedules?: any[];
  chatChannels: any[];
  chatDMs: any[];
  chatMessages: Record<string, any[]>;
  chatImages?: Record<string, {
    id: string;
    fileName: string;
    fileSize: string;
    mimeType: string;
    diskPath: string;
    dataUrl?: string;
    senderId?: string;
    recipientId?: string;
    chatId?: string;
    uploadedAt: string;
  }>;
  announcements: any[];
  antiBriberyWorkbook: any | null;
  spreadsheets: Record<string, any>;
  auditLogs: any[];
  users: any[];
  companyLogo: string | null;
  startupMedia?: {
    type: 'default' | 'image' | 'video';
    url: string | null;
    fileName?: string;
    fileSize?: string;
    mimeType?: string;
    duration?: number;
    soundEnabled?: boolean;
    fitMode?: 'contain' | 'cover';
    title?: string;
    subtitle?: string;
    updatedAt?: string;
    updatedBy?: string;
  } | null;
  settings: Record<string, any>;
  files: Record<string, {
    id: string;
    fileName: string;
    fileType: string;
    fileSize: string;
    mimeType: string;
    dataUrl?: string;
    diskPath?: string;
    uploadedAt: string;
    uploadedBy?: string;
    folderId?: string;
  }>;
  dataRecords?: any[];
  lastUpdated: string;
}

// Load or initialize database
function loadDatabase(): ServerDatabase {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      const employeesLoaded = (Array.isArray(parsed.employees) && parsed.employees.length > 0)
        ? parsed.employees
        : INITIAL_EMPLOYEES;

      // Ensure standard Section Leader accounts are seeded for testing and production
      DEFAULT_SECTION_LEADERS.forEach(sl => {
        const exists = employeesLoaded.some((e: any) => 
          e.employeeNo === sl.employeeNo || e.id === sl.id || (e.name && e.name.toLowerCase() === sl.name.toLowerCase())
        );
        if (!exists) {
          employeesLoaded.push(sl);
        }
      });

      return {
        employees: employeesLoaded,
        logs: parsed.logs || [],
        courses: parsed.courses || [],
        records: parsed.records || [],
        documents: (() => {
          const docs = Array.isArray(parsed.documents) ? [...parsed.documents] : [];
          const existingIds = new Set(docs.map((d: any) => d.id));
          INITIAL_BLUEPRINT_DOCUMENTS.forEach(bd => {
            if (!existingIds.has(bd.id)) docs.push(bd);
          });
          return docs;
        })(),
        folders: (() => {
          const flds = Array.isArray(parsed.folders) ? [...parsed.folders] : [];
          const existingIds = new Set(flds.map((f: any) => f.id));
          STANDARDIZED_REPOSITORY_FOLDERS.forEach(sf => {
            if (!existingIds.has(sf.id)) flds.push(sf);
          });
          return flds;
        })(),
        stitchingRecords: parsed.stitchingRecords || [],
        stitchingFolders: (() => {
          const defaultFolders = [
            {
              id: "stitching-a",
              name: "Stitching A",
              code: "STA",
              auditDate: "",
              dateColumnHeader: "(Date)",
              rows: [
                { id: "row-1", lineNo: "", name: "", date: "", style: "", findings: "" },
                { id: "row-2", lineNo: "", name: "", date: "", style: "", findings: "" },
                { id: "row-3", lineNo: "", name: "", date: "", style: "", findings: "" }
              ],
              updatedAt: new Date().toISOString()
            },
            {
              id: "stitching-b",
              name: "Stitching B",
              code: "STB",
              auditDate: "",
              dateColumnHeader: "(Date)",
              rows: [
                { id: "row-1", lineNo: "", name: "", date: "", style: "", findings: "" },
                { id: "row-2", lineNo: "", name: "", date: "", style: "", findings: "" },
                { id: "row-3", lineNo: "", name: "", date: "", style: "", findings: "" }
              ],
              updatedAt: new Date().toISOString()
            },
            {
              id: "stitching-d",
              name: "Stitching D",
              code: "STD",
              auditDate: "",
              dateColumnHeader: "(Date)",
              rows: [
                { id: "row-1", lineNo: "", name: "", date: "", style: "", findings: "" },
                { id: "row-2", lineNo: "", name: "", date: "", style: "", findings: "" },
                { id: "row-3", lineNo: "", name: "", date: "", style: "", findings: "" }
              ],
              updatedAt: new Date().toISOString()
            },
            {
              id: "stitching-f",
              name: "Stitching F",
              code: "STF",
              auditDate: "",
              dateColumnHeader: "(Date)",
              rows: [
                { id: "row-1", lineNo: "", name: "", date: "", style: "", findings: "" },
                { id: "row-2", lineNo: "", name: "", date: "", style: "", findings: "" },
                { id: "row-3", lineNo: "", name: "", date: "", style: "", findings: "" }
              ],
              updatedAt: new Date().toISOString()
            }
          ];

          if (Array.isArray(parsed.stitchingFolders) && parsed.stitchingFolders.length > 0) {
            const existing = [...parsed.stitchingFolders];
            for (const def of defaultFolders) {
              if (!existing.some(f => f.id === def.id || f.name.toLowerCase() === def.name.toLowerCase())) {
                existing.push(def);
              }
            }
            return existing;
          }
          return defaultFolders;
        })(),
        activeStitchingFolderId: parsed.activeStitchingFolderId || "stitching-a",
        stitchingAuditTable: parsed.stitchingAuditTable || {
          auditDate: "",
          dateColumnHeader: "(Date)",
          rows: [
            { id: "row-1", lineNo: "", name: "", date: "", style: "", findings: "" },
            { id: "row-2", lineNo: "", name: "", date: "", style: "", findings: "" },
            { id: "row-3", lineNo: "", name: "", date: "", style: "", findings: "" }
          ]
        },
        departmentItems: Array.isArray(parsed.departmentItems) && parsed.departmentItems.length > 0 ? parsed.departmentItems : DEFAULT_DEPARTMENT_ITEMS,
        departmentFolders: Array.isArray(parsed.departmentFolders) && parsed.departmentFolders.length > 0 ? parsed.departmentFolders : DEFAULT_DEPARTMENT_FOLDERS,
        departmentTrainingRecords: Array.isArray(parsed.departmentTrainingRecords) && parsed.departmentTrainingRecords.length > 0 ? parsed.departmentTrainingRecords : DEFAULT_TRAINING_RECORDS,
        departmentCustomFields: Array.isArray(parsed.departmentCustomFields) && parsed.departmentCustomFields.length > 0 ? parsed.departmentCustomFields : DEFAULT_CUSTOM_FIELDS,
        departmentTrainingFiles: parsed.departmentTrainingFiles || {},
        notifications: parsed.notifications || [],
        leadershipAttendance: parsed.leadershipAttendance || [],
        leadershipFiles: parsed.leadershipFiles || [],
        leadershipSchedules: parsed.leadershipSchedules || [],
        chatChannels: parsed.chatChannels || [],
        chatDMs: parsed.chatDMs || [],
        chatMessages: parsed.chatMessages || {},
        announcements: parsed.announcements || [],
        antiBriberyWorkbook: parsed.antiBriberyWorkbook || null,
        spreadsheets: parsed.spreadsheets || {},
        auditLogs: parsed.auditLogs || [],
        users: parsed.users || [],
        companyLogo: parsed.companyLogo || null,
        startupMedia: parsed.startupMedia || null,
        settings: parsed.settings || {},
        files: parsed.files || {},
        dataRecords: parsed.dataRecords || [
          {
            id: 'drec-1',
            title: 'CSR Audit Compliance Parameters',
            format: 'json',
            content: JSON.stringify({
              company: "DATIAN SUBIC SHOES INC.",
              auditStandard: "CSR & Anti-Bribery ISO 37001",
              effectiveYear: 2026,
              parameters: [
                { category: "Anti-Bribery Policy", minScoreRequired: 95, status: "Mandatory" },
                { category: "Emergency Preparedness", minScoreRequired: 100, status: "Mandatory" },
                { category: "Fair Labor Standards", minScoreRequired: 90, status: "Critical" },
                { category: "Machine Safety SOPs", minScoreRequired: 95, status: "Operational" }
              ],
              approvedBy: "Executive Compliance Officer",
              lastAuditCycle: "2026-Q1"
            }, null, 2),
            category: 'Audit & Compliance',
            tags: ['Compliance', 'Audit', 'JSON'],
            size: '1.2 KB',
            recordCount: 4,
            createdAt: '2026-05-01',
            updatedAt: '2026-05-18T10:30:00Z',
            createdBy: 'System Administrator',
            autoSavedAt: '2026-05-18T10:30:00Z'
          },
          {
            id: 'drec-2',
            title: 'Stitching Machine Preventive Maintenance Schedule',
            format: 'csv',
            content: `Machine_ID,Line_Name,Machine_Type,Last_Serviced,Next_Due_Date,Technician,Status\nMCH-101,Line 1 - Stitching,Single Needle Lockstitch,2026-05-10,2026-06-10,R. Dela Cruz,Operational\nMCH-102,Line 1 - Stitching,High Speed Overlock,2026-05-12,2026-06-12,M. Santos,Operational\nMCH-201,Line 2 - Assembly,Heavy Duty Post-Bed,2026-05-08,2026-06-08,R. Dela Cruz,Operational\nMCH-202,Line 2 - Assembly,Computerized Pattern Stitcher,2026-05-15,2026-06-15,E. Fernandez,Operational\nMCH-301,Line 3 - Finishing,Automated Eyelet Puncher,2026-05-01,2026-06-01,M. Santos,Needs Calibration`,
            category: 'Machine Maintenance',
            tags: ['Machines', 'CSV', 'Schedule'],
            size: '850 B',
            recordCount: 5,
            createdAt: '2026-05-05',
            updatedAt: '2026-05-19T14:15:00Z',
            createdBy: 'Operations Supervisor',
            autoSavedAt: '2026-05-19T14:15:00Z'
          },
          {
            id: 'drec-3',
            title: 'Emergency Safety & Evacuation SOP Guideline',
            format: 'text',
            content: `# DATIAN SUBIC SHOES INC. - EMERGENCY PROTOCOL\n\n## 1. Scope & Objective\nThis standard operating procedure mandates immediate response steps during seismic events, electrical hazards, or chemical containment.\n\n## 2. Immediate Actions:\n- Line Supervisors must halt production lines immediately.\n- Designated floor marshals guide all staff toward Assembly Area Alpha & Beta.\n- Roll call must be executed within 3 minutes of alarm sounding.\n\n## 3. Communication Channel:\nEmergency radio channel Frequency 4; direct line to Subic Bay Health & Safety Marshall.`,
            category: 'Safety & SOP',
            tags: ['Emergency', 'Safety', 'Markdown'],
            size: '620 B',
            recordCount: 1,
            createdAt: '2026-05-10',
            updatedAt: '2026-05-20T09:00:00Z',
            createdBy: 'System Administrator',
            autoSavedAt: '2026-05-20T09:00:00Z'
          }
        ],
        lastUpdated: parsed.lastUpdated || new Date().toISOString()
      };
    }
  } catch (err) {
    console.error("[Server DB] Error reading database.json, initializing fresh state:", err);
  }

  const defaultDb: ServerDatabase = {
    employees: INITIAL_EMPLOYEES,
    logs: [],
    courses: [],
    records: [],
    documents: INITIAL_BLUEPRINT_DOCUMENTS,
    folders: STANDARDIZED_REPOSITORY_FOLDERS,
    stitchingRecords: [],
    stitchingFolders: [
      {
        id: "stitching-a",
        name: "Stitching A",
        code: "STA",
        auditDate: "",
        dateColumnHeader: "(Date)",
        rows: [
          { id: "row-1", lineNo: "", name: "", date: "", style: "", findings: "" },
          { id: "row-2", lineNo: "", name: "", date: "", style: "", findings: "" },
          { id: "row-3", lineNo: "", name: "", date: "", style: "", findings: "" }
        ],
        updatedAt: new Date().toISOString()
      },
      {
        id: "stitching-b",
        name: "Stitching B",
        code: "STB",
        auditDate: "",
        dateColumnHeader: "(Date)",
        rows: [
          { id: "row-1", lineNo: "", name: "", date: "", style: "", findings: "" },
          { id: "row-2", lineNo: "", name: "", date: "", style: "", findings: "" },
          { id: "row-3", lineNo: "", name: "", date: "", style: "", findings: "" }
        ],
        updatedAt: new Date().toISOString()
      },
      {
        id: "stitching-d",
        name: "Stitching D",
        code: "STD",
        auditDate: "",
        dateColumnHeader: "(Date)",
        rows: [
          { id: "row-1", lineNo: "", name: "", date: "", style: "", findings: "" },
          { id: "row-2", lineNo: "", name: "", date: "", style: "", findings: "" },
          { id: "row-3", lineNo: "", name: "", date: "", style: "", findings: "" }
        ],
        updatedAt: new Date().toISOString()
      },
      {
        id: "stitching-f",
        name: "Stitching F",
        code: "STF",
        auditDate: "",
        dateColumnHeader: "(Date)",
        rows: [
          { id: "row-1", lineNo: "", name: "", date: "", style: "", findings: "" },
          { id: "row-2", lineNo: "", name: "", date: "", style: "", findings: "" },
          { id: "row-3", lineNo: "", name: "", date: "", style: "", findings: "" }
        ],
        updatedAt: new Date().toISOString()
      }
    ],
    activeStitchingFolderId: "stitching-a",
    stitchingAuditTable: {
      auditDate: "",
      dateColumnHeader: "(Date)",
      rows: [
        { id: "row-1", lineNo: "", name: "", date: "", style: "", findings: "" },
        { id: "row-2", lineNo: "", name: "", date: "", style: "", findings: "" },
        { id: "row-3", lineNo: "", name: "", date: "", style: "", findings: "" }
      ]
    },
    departmentItems: DEFAULT_DEPARTMENT_ITEMS,
    departmentFolders: DEFAULT_DEPARTMENT_FOLDERS,
    departmentTrainingRecords: DEFAULT_TRAINING_RECORDS,
    departmentCustomFields: DEFAULT_CUSTOM_FIELDS,
    departmentTrainingFiles: {},
    notifications: [],
    leadershipAttendance: [],
    leadershipFiles: [],
    leadershipSchedules: [],
    chatChannels: [],
    chatDMs: [],
    chatMessages: {},
    announcements: [],
    antiBriberyWorkbook: null,
    spreadsheets: {},
    auditLogs: [
      {
        id: 'audit-init',
        user: 'System Admin',
        role: 'Admin',
        action: 'LOGIN',
        module: 'System',
        details: 'DATIAN CSR HUB Master Cloud Database online and synchronizing.',
        timestamp: new Date().toISOString()
      }
    ],
    users: [
      {
        id: 'usr-1',
        name: 'Datian Subic Shoes Inc.',
        role: 'Admin',
        email: 'internalauditordtpshoes123@gmail.com',
        avatar: '👑',
        department: 'Executive Compliance',
        position: 'System Administrator',
        status: 'Active'
      },
      {
        id: 'usr-2',
        name: 'Internal Auditor',
        role: 'Staff',
        email: 'auditor@datianshoes.com',
        avatar: '📋',
        department: 'Internal Audit',
        position: 'Compliance Lead',
        status: 'Active'
      },
      {
        id: 'usr-3',
        name: 'Guest Inspector',
        role: 'Viewer',
        email: 'inspector@brandclient.com',
        avatar: '🔍',
        department: 'External Audit',
        position: 'Brand Compliance Auditor',
        status: 'Active'
      }
    ],
    companyLogo: null,
    startupMedia: null,
    settings: {
      companyName: 'DATIAN SUBIC SHOES INC.',
      systemTitle: 'CSR HUB (CORPORATE SOCIAL RESPONSIBILITY)',
      contactEmail: 'internalauditordtpshoes123@gmail.com',
      systemVersion: 'v2.4.0',
      autoSyncInterval: 3000,
      offlineCacheEnabled: true,
      persistentStorageGuaranteed: true
    },
    files: {},
    dataRecords: [
      {
        id: 'drec-1',
        title: 'CSR Audit Compliance Parameters',
        format: 'json',
        content: JSON.stringify({
          company: "DATIAN SUBIC SHOES INC.",
          auditStandard: "CSR & Anti-Bribery ISO 37001",
          effectiveYear: 2026,
          parameters: [
            { category: "Anti-Bribery Policy", minScoreRequired: 95, status: "Mandatory" },
            { category: "Emergency Preparedness", minScoreRequired: 100, status: "Mandatory" },
            { category: "Fair Labor Standards", minScoreRequired: 90, status: "Critical" },
            { category: "Machine Safety SOPs", minScoreRequired: 95, status: "Operational" }
          ],
          approvedBy: "Executive Compliance Officer",
          lastAuditCycle: "2026-Q1"
        }, null, 2),
        category: 'Audit & Compliance',
        tags: ['Compliance', 'Audit', 'JSON'],
        size: '1.2 KB',
        recordCount: 4,
        createdAt: '2026-05-01',
        updatedAt: '2026-05-18T10:30:00Z',
        createdBy: 'System Administrator',
        autoSavedAt: '2026-05-18T10:30:00Z'
      },
      {
        id: 'drec-2',
        title: 'Stitching Machine Preventive Maintenance Schedule',
        format: 'csv',
        content: `Machine_ID,Line_Name,Machine_Type,Last_Serviced,Next_Due_Date,Technician,Status\nMCH-101,Line 1 - Stitching,Single Needle Lockstitch,2026-05-10,2026-06-10,R. Dela Cruz,Operational\nMCH-102,Line 1 - Stitching,High Speed Overlock,2026-05-12,2026-06-12,M. Santos,Operational\nMCH-201,Line 2 - Assembly,Heavy Duty Post-Bed,2026-05-08,2026-06-08,R. Dela Cruz,Operational\nMCH-202,Line 2 - Assembly,Computerized Pattern Stitcher,2026-05-15,2026-06-15,E. Fernandez,Operational\nMCH-301,Line 3 - Finishing,Automated Eyelet Puncher,2026-05-01,2026-06-01,M. Santos,Needs Calibration`,
        category: 'Machine Maintenance',
        tags: ['Machines', 'CSV', 'Schedule'],
        size: '850 B',
        recordCount: 5,
        createdAt: '2026-05-05',
        updatedAt: '2026-05-19T14:15:00Z',
        createdBy: 'Operations Supervisor',
        autoSavedAt: '2026-05-19T14:15:00Z'
      },
      {
        id: 'drec-3',
        title: 'Emergency Safety & Evacuation SOP Guideline',
        format: 'text',
        content: `# DATIAN SUBIC SHOES INC. - EMERGENCY PROTOCOL\n\n## 1. Scope & Objective\nThis standard operating procedure mandates immediate response steps during seismic events, electrical hazards, or chemical containment.\n\n## 2. Immediate Actions:\n- Line Supervisors must halt production lines immediately.\n- Designated floor marshals guide all staff toward Assembly Area Alpha & Beta.\n- Roll call must be executed within 3 minutes of alarm sounding.\n\n## 3. Communication Channel:\nEmergency radio channel Frequency 4; direct line to Subic Bay Health & Safety Marshall.`,
        category: 'Safety & SOP',
        tags: ['Emergency', 'Safety', 'Markdown'],
        size: '620 B',
        recordCount: 1,
        createdAt: '2026-05-10',
        updatedAt: '2026-05-20T09:00:00Z',
        createdBy: 'System Administrator',
        autoSavedAt: '2026-05-20T09:00:00Z'
      }
    ],
    lastUpdated: new Date().toISOString()
  };

  saveDatabase(defaultDb);
  return defaultDb;
}

let dbCache: ServerDatabase = loadDatabase();

// Track auto-backup schedule
let lastAutoBackupTime = Date.now();
const AUTO_BACKUP_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

// Create an automated snapshot
function triggerAutoSnapshot(data: ServerDatabase, reason = "Auto-Save") {
  try {
    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }
    const timestampStr = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `CSR_HUB_AUTOBKP_${timestampStr}.json`;
    const filePath = path.join(BACKUPS_DIR, filename);
    const snapshot = {
      backupId: `AUTO-${Date.now()}`,
      backupFilename: filename,
      createdAt: new Date().toISOString(),
      createdBy: "Automated Data Protection Engine",
      reason,
      stats: {
        employeesCount: Array.isArray(data.employees) ? data.employees.length : 0,
        filesCount: Object.keys(data.files || {}).length,
        dataRecordsCount: Array.isArray(data.dataRecords) ? data.dataRecords.length : 0,
        leadershipRecordsCount: Array.isArray(data.leadershipAttendance) ? data.leadershipAttendance.length : 0,
        foldersCount: Array.isArray(data.folders) ? data.folders.length : 0
      },
      database: data
    };
    fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), "utf-8");
    lastAutoBackupTime = Date.now();
    console.log(`[Auto Data Protection] Created rolling snapshot: ${filename}`);

    // Keep only last 10 auto-backups to preserve disk space
    try {
      const autoFiles = fs.readdirSync(BACKUPS_DIR)
        .filter(f => f.startsWith("CSR_HUB_AUTOBKP_") && f.endsWith(".json"))
        .map(f => ({ name: f, time: fs.statSync(path.join(BACKUPS_DIR, f)).mtimeMs }))
        .sort((a, b) => b.time - a.time);
      if (autoFiles.length > 10) {
        autoFiles.slice(10).forEach(f => {
          try { fs.unlinkSync(path.join(BACKUPS_DIR, f.name)); } catch {}
        });
      }
    } catch {}
  } catch (err) {
    console.warn("[Auto Data Protection] Snapshot notice:", err);
  }
}

// Save database to disk safely with mirror redundancy
function saveDatabase(data: ServerDatabase) {
  try {
    data.lastUpdated = new Date().toISOString();
    dbCache = data;
    const tempFile = `${DB_FILE}.tmp`;
    const serialized = JSON.stringify(data, null, 2);
    fs.writeFileSync(tempFile, serialized, "utf-8");
    fs.renameSync(tempFile, DB_FILE);

    // Maintain a secondary mirror backup for fail-safe recovery
    try {
      const mirrorBackup = path.join(DATA_DIR, "database.backup.json");
      fs.writeFileSync(mirrorBackup, serialized, "utf-8");
    } catch (mErr) {
      console.warn("[Server DB] Mirror backup warning:", mErr);
    }

    // Trigger periodic rolling snapshot if interval elapsed
    if (Date.now() - lastAutoBackupTime > AUTO_BACKUP_INTERVAL_MS) {
      triggerAutoSnapshot(data, "Periodic Automated Rolling Backup");
    }
  } catch (err) {
    console.error("[Server DB] Error writing database.json:", err);
  }
}

// Active Server-Sent Events (SSE) Clients for Multi-PC Realtime Synchronization
interface SSEClient {
  id: string;
  res: Response;
  ip: string;
  connectedAt: Date;
  employeeId?: string;
}
const sseClients = new Map<string, SSEClient>();

// Real-Time Employee Presence Tracking
interface PresenceItem {
  id: string;
  employeeNo: string;
  name: string;
  department: string;
  position: string;
  role: string;
  status: 'online' | 'offline' | 'away';
  lastActive: string;
  avatar?: string;
  clientIds: Set<string>;
}
const activePresences = new Map<string, PresenceItem>();

function getOnlinePresenceList() {
  return Array.from(activePresences.values()).map(p => ({
    id: p.id,
    employeeNo: p.employeeNo,
    name: p.name,
    department: p.department,
    position: p.position,
    role: p.role,
    status: p.status,
    lastActive: p.lastActive,
    avatar: p.avatar
  }));
}

function broadcastPresenceUpdate(senderClientId?: string) {
  broadcastToClients({
    type: "PRESENCE_UPDATED",
    entity: "presence",
    data: getOnlinePresenceList(),
    senderClientId,
    timestamp: new Date().toISOString()
  });
}

function cleanText(str: any): string {
  if (!str) return "";
  return String(str).toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeEmpNo(str: any): string {
  if (!str) return "";
  return String(str).toLowerCase().trim();
}

// Broadcast event to all connected PCs
function broadcastToClients(event: {
  type: string;
  entity: string;
  data: any;
  senderClientId?: string;
  timestamp?: string;
}) {
  const payload = JSON.stringify({
    ...event,
    timestamp: event.timestamp || new Date().toISOString()
  });

  sseClients.forEach((client, clientId) => {
    try {
      client.res.write(`data: ${payload}\n\n`);
    } catch (err) {
      console.warn(`[Realtime SSE] Failed to write to client ${clientId}, removing:`, err);
      sseClients.delete(clientId);
    }
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON Body Parser with 100MB limit for large document uploads and Excel matrices
  app.use(express.json({ limit: "100mb" }));
  app.use(express.urlencoded({ limit: "100mb", extended: true }));

  // CORS Headers for multi-origin iframe resilience
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Client-ID");
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // =========================================================================
  // REAL-TIME SYNCHRONIZATION API ROUTES
  // =========================================================================

  // Health check endpoint
  app.get("/api/health", (req: Request, res: Response) => {
    res.json({
      status: "ok",
      connectedClients: sseClients.size,
      databaseLastUpdated: dbCache.lastUpdated,
      timestamp: new Date().toISOString()
    });
  });

  // SSE Stream Endpoint - All connected PCs connect here for instant live updates
  app.get("/api/realtime/stream", (req: Request, res: Response) => {
    const clientId = (req.query.clientId as string) || `client_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const employeeId = req.query.employeeId as string | undefined;
    const clientIp = req.ip || req.socket.remoteAddress || "unknown";

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no"
    });

    res.write(`data: ${JSON.stringify({ type: "CONNECTED", clientId, connectedClients: sseClients.size + 1, timestamp: new Date().toISOString() })}\n\n`);

    const client: SSEClient = { id: clientId, res, ip: clientIp, connectedAt: new Date(), employeeId };
    sseClients.set(clientId, client);
    console.log(`[Realtime SSE] Client connected: ${clientId} (${clientIp}). Total connected PCs/tabs: ${sseClients.size}`);

    // If employeeId is attached, associate client ID to presence
    if (employeeId && activePresences.has(employeeId)) {
      const p = activePresences.get(employeeId)!;
      p.clientIds.add(clientId);
      p.lastActive = new Date().toISOString();
      p.status = 'online';
      broadcastPresenceUpdate();
    }

    // Send immediate presence snapshot to this client
    res.write(`data: ${JSON.stringify({ type: "PRESENCE_UPDATED", entity: "presence", data: getOnlinePresenceList(), timestamp: new Date().toISOString() })}\n\n`);

    // Notify all clients of new connected count
    broadcastToClients({
      type: "PEER_COUNT_UPDATED",
      entity: "system",
      data: { connectedCount: sseClients.size }
    });

    // Keep-alive ping every 15 seconds to prevent browser timeouts
    const pingInterval = setInterval(() => {
      try {
        res.write(": keepalive ping\n\n");
      } catch {
        clearInterval(pingInterval);
        sseClients.delete(clientId);
      }
    }, 15000);

    req.on("close", () => {
      clearInterval(pingInterval);
      sseClients.delete(clientId);
      console.log(`[Realtime SSE] Client disconnected: ${clientId}. Total active: ${sseClients.size}`);

      // Handle presence disconnection
      let presenceChanged = false;
      activePresences.forEach((presence, empId) => {
        if (presence.clientIds.has(clientId)) {
          presence.clientIds.delete(clientId);
          if (presence.clientIds.size === 0) {
            // Remove from online after client disconnects
            activePresences.delete(empId);
            presenceChanged = true;
          }
        }
      });

      if (presenceChanged) {
        broadcastPresenceUpdate();
      }

      broadcastToClients({
        type: "PEER_COUNT_UPDATED",
        entity: "system",
        data: { connectedCount: sseClients.size }
      });
    });
  });

  // =========================================================================
  // EMPLOYEE AUTHENTICATION & SECURE SESSION API
  // =========================================================================

  app.post("/api/auth/employee-login", (req: Request, res: Response) => {
    try {
      const { fullName, employeeNo, password, employeeId, clientId } = req.body;
      const submittedPassword = String(password || employeeNo || "").trim();

      if (!submittedPassword) {
        res.status(400).json({ success: false, error: "Please enter your password." });
        return;
      }

      if (!fullName && !employeeId) {
        res.status(400).json({ success: false, error: "Please select your Employee Name." });
        return;
      }

      const inputNameClean = cleanText(fullName || "");
      const inputPasswordClean = normalizeEmpNo(submittedPassword);
      const inputEmpNoClean = employeeNo ? normalizeEmpNo(String(employeeNo)) : "";
      const inputEmpId = employeeId ? String(employeeId) : "";

      // 1. Master System Administrator / Auditor Account
      if (
        inputEmpId === "admin-master" ||
        inputNameClean.includes("datian") || 
        inputNameClean.includes("admin") || 
        inputNameClean.includes("auditor")
      ) {
        // Verify Admin credentials
        const isAdminValid = 
          inputPasswordClean === "datian123*" || 
          inputPasswordClean === "admin" || 
          inputPasswordClean === "admin-01" ||
          inputPasswordClean === "admin01" ||
          submittedPassword === "Datian123*" ||
          submittedPassword === "ADMIN-01";

        if (!isAdminValid) {
          res.status(401).json({ 
            success: false, 
            error: "Invalid password. Please check your password and try again." 
          });
          return;
        }

        const adminId = "admin-master";
        const adminUser = {
          id: adminId,
          employeeNo: "ADMIN-01",
          name: "Datian Subic Shoes Inc.",
          fullName: "Datian Subic Shoes Inc. (System Administrator)",
          department: "Executive Administration",
          position: "System Administrator",
          status: "Active",
          role: "Admin" as const,
          avatar: "👑",
          email: "internalauditordtpshoes123@gmail.com"
        };

        const existingP = activePresences.get(adminId);
        const clientIds = existingP ? existingP.clientIds : new Set<string>();
        if (clientId) clientIds.add(clientId);

        activePresences.set(adminId, {
          id: adminId,
          employeeNo: adminUser.employeeNo,
          name: adminUser.name,
          department: adminUser.department,
          position: adminUser.position,
          role: "Admin",
          status: "online",
          lastActive: new Date().toISOString(),
          avatar: adminUser.avatar,
          clientIds
        });

        broadcastPresenceUpdate(clientId);

        res.json({
          success: true,
          token: `session_${adminId}_${Date.now()}`,
          employee: adminUser
        });
        return;
      }

      // 2. Search against Employee Master List
      const employees: any[] = (dbCache.employees && dbCache.employees.length > 0)
        ? dbCache.employees
        : INITIAL_EMPLOYEES;
      
      let matchedEmployee = null;

      // Match by ID if provided
      if (inputEmpId) {
        matchedEmployee = employees.find((emp) => emp && (String(emp.id) === inputEmpId || String(emp.employeeNo) === inputEmpId || normalizeEmpNo(emp.employeeNo) === normalizeEmpNo(inputEmpId)));
      }

      // Match by employeeNo directly
      if (!matchedEmployee && inputEmpNoClean) {
        matchedEmployee = employees.find((emp) => emp && normalizeEmpNo(emp.employeeNo) === inputEmpNoClean);
      }

      // Fallback match by Name
      if (!matchedEmployee && inputNameClean) {
        matchedEmployee = employees.find((emp) => {
          if (!emp) return false;
          const empNameClean = cleanText(emp.name || "");
          const empFullNameClean = cleanText(emp.fullName || "");

          if (empNameClean === inputNameClean || empFullNameClean === inputNameClean) {
            return true;
          }

          const inputTokens = inputNameClean.split(" ").filter(Boolean);
          const nameTokens = empNameClean.split(" ").filter(Boolean);
          if (inputTokens.length > 0 && nameTokens.length > 0) {
            const matchAll = inputTokens.every((tok: string) => nameTokens.includes(tok));
            if (matchAll) return true;
          }
          return false;
        });
      }

      if (!matchedEmployee) {
        res.status(401).json({ 
          success: false, 
          error: "Invalid credentials. No employee record found matching the provided Name and Employee Number." 
        });
        return;
      }

      // If matched by employeeNo, verify that entered name (if provided) matches the employee
      if (inputNameClean) {
        const empNameClean = cleanText(matchedEmployee.name || "");
        const empFullNameClean = cleanText(matchedEmployee.fullName || "");
        const inputTokens = inputNameClean.split(" ").filter(Boolean);
        const nameTokens = (empNameClean + " " + empFullNameClean).split(" ").filter(Boolean);
        
        const hasTokenMatch = inputTokens.some((tok: string) => nameTokens.includes(tok));
        const hasExactMatch = 
          empNameClean === inputNameClean || 
          empFullNameClean === inputNameClean || 
          empNameClean.includes(inputNameClean) || 
          inputNameClean.includes(empNameClean);

        if (!hasTokenMatch && !hasExactMatch) {
          res.status(401).json({ 
            success: false, 
            error: `Invalid credentials. The provided Name does not match Employee Number ${matchedEmployee.employeeNo}.` 
          });
          return;
        }
      }

      // Check account status
      const statusLower = String(matchedEmployee.status || "Active").toLowerCase().trim();
      if (statusLower === "inactive" || statusLower === "resigned" || statusLower === "terminated") {
        res.status(403).json({ 
          success: false, 
          error: "This employee account is marked as inactive or resigned. Please contact the CSR department." 
        });
        return;
      }

      // Verify Password (Authentication)
      const correctEmpNo = normalizeEmpNo(matchedEmployee.employeeNo || "");
      const customPassword = matchedEmployee.password ? String(matchedEmployee.password).trim() : "";
      const isPasswordMatch = 
        (customPassword && submittedPassword === customPassword) ||
        inputPasswordClean === correctEmpNo ||
        submittedPassword.toLowerCase() === String(matchedEmployee.employeeNo || "").trim().toLowerCase();

      if (!isPasswordMatch) {
        res.status(401).json({ 
          success: false, 
          error: "Invalid password. Please check your password and try again." 
        });
        return;
      }

      const empId = String(matchedEmployee.id || `emp_${matchedEmployee.employeeNo}`);
      const posLower = String(matchedEmployee.position || "").toLowerCase();
      const deptLower = String(matchedEmployee.department || "").toLowerCase();
      const nameLower = String(matchedEmployee.name || "").toLowerCase();
      
      let role = matchedEmployee.role;
      if (!role) {
        if (posLower.includes("section leader") || nameLower.includes("section leader")) {
          role = "Section Leader";
        } else {
          role = (posLower.includes("admin") || posLower.includes("manager") || posLower.includes("executive") || posLower.includes("supervisor") || posLower.includes("officer") || posLower.includes("auditor") || deptLower.includes("admin") || deptLower.includes("compliance")) ? "Admin" : "Staff";
        }
      } else if (String(role).toLowerCase() === "section leader" || posLower.includes("section leader")) {
        role = "Section Leader";
      }

      // Explicit assigned section resolution for section leaders
      const assignedSection = matchedEmployee.assignedSection || matchedEmployee.section || resolveRecordSection(matchedEmployee);
      const section = matchedEmployee.section || assignedSection;
      const department = matchedEmployee.department || resolveRecordDepartment(matchedEmployee);

      const authenticatedProfile = {
        id: empId,
        employeeNo: matchedEmployee.employeeNo,
        name: matchedEmployee.name,
        fullName: matchedEmployee.fullName || matchedEmployee.name,
        department,
        position: matchedEmployee.position || (role === "Section Leader" ? "Section Leader" : "Staff"),
        status: matchedEmployee.status || "Active",
        role: role as any,
        assignedSection: role === "Section Leader" ? assignedSection : undefined,
        section: section,
        avatar: matchedEmployee.avatar,
        email: matchedEmployee.email,
        onBoardDate: matchedEmployee.onBoardDate || matchedEmployee.hireDate
      };

      const sessionToken = `session_${empId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      activeSessions.set(sessionToken, authenticatedProfile);

      // Register presence
      const existingPres = activePresences.get(empId);
      const clientIds = existingPres ? existingPres.clientIds : new Set<string>();
      if (clientId) clientIds.add(clientId);

      activePresences.set(empId, {
        id: empId,
        employeeNo: authenticatedProfile.employeeNo,
        name: authenticatedProfile.name,
        department: authenticatedProfile.department,
        position: authenticatedProfile.position,
        role: authenticatedProfile.role,
        status: "online",
        lastActive: new Date().toISOString(),
        avatar: authenticatedProfile.avatar,
        clientIds
      });

      broadcastPresenceUpdate(clientId);

      // Append login to audit logs
      const auditItem = {
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        user: authenticatedProfile.name,
        role: authenticatedProfile.role,
        action: "LOGIN",
        module: "Authentication",
        details: `Employee "${authenticatedProfile.name}" (No. ${authenticatedProfile.employeeNo}) logged in successfully.`,
        recordId: authenticatedProfile.employeeNo,
        timestamp: new Date().toISOString()
      };
      if (!Array.isArray(dbCache.auditLogs)) dbCache.auditLogs = [];
      dbCache.auditLogs.unshift(auditItem);
      if (dbCache.auditLogs.length > 1000) dbCache.auditLogs = dbCache.auditLogs.slice(0, 1000);
      saveDatabase(dbCache);

      broadcastToClients({
        type: "AUDIT_LOGGED",
        entity: "auditLogs",
        data: dbCache.auditLogs,
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        token: sessionToken,
        employee: authenticatedProfile
      });
    } catch (err: any) {
      console.error("[Auth Login Error]:", err);
      res.status(500).json({ success: false, error: "Authentication system error" });
    }
  });

  // Logout Endpoint
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    try {
      const { employeeId, clientId } = req.body;

      if (employeeId && activePresences.has(employeeId)) {
        const presence = activePresences.get(employeeId)!;
        if (clientId) {
          presence.clientIds.delete(clientId);
          if (presence.clientIds.size === 0) {
            activePresences.delete(employeeId);
          }
        } else {
          activePresences.delete(employeeId);
        }
        broadcastPresenceUpdate(clientId);
      }

      res.json({ success: true });
    } catch (err: any) {
      console.error("[Auth Logout Error]:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // =========================================================================
  // REAL-TIME PRESENCE API
  // =========================================================================

  app.get("/api/presence/online", (req: Request, res: Response) => {
    res.json({
      success: true,
      onlineUsers: getOnlinePresenceList()
    });
  });

  app.post("/api/presence/heartbeat", (req: Request, res: Response) => {
    try {
      const { employee, clientId, status } = req.body;
      if (employee && employee.id) {
        const empId = employee.id;
        const existing = activePresences.get(empId);
        const clientIds = existing ? existing.clientIds : new Set<string>();
        if (clientId) clientIds.add(clientId);

        const wasOnline = activePresences.has(empId);

        activePresences.set(empId, {
          id: empId,
          employeeNo: employee.employeeNo || "",
          name: employee.name || "Employee",
          department: employee.department || "General",
          position: employee.position || "Staff",
          role: employee.role || "Staff",
          status: status || "online",
          lastActive: new Date().toISOString(),
          avatar: employee.avatar,
          clientIds
        });

        if (!wasOnline) {
          broadcastPresenceUpdate(clientId);
        }
      }

      res.json({
        success: true,
        onlineUsers: getOnlinePresenceList()
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // =========================================================================
  // REAL-TIME PRIVATE & GROUP CHAT MESSAGING API
  // =========================================================================

  // Helper to check if chat is a private 1-to-1 DM
  const isPrivateDMChat = (chatId: string) => {
    return chatId.startsWith("dm_") && chatId !== "dm-ai";
  };

  // Helper to check whether an employee is authorized to access a conversation
  const canEmployeeAccessChat = (
    chatId: string,
    empId?: string,
    empNo?: string,
    role?: string
  ): boolean => {
    // 1. Group channels and public AI bot are accessible to all registered staff
    if (!isPrivateDMChat(chatId)) {
      return true;
    }

    // 2. Normalize requester keys
    const cleanEmpId = (empId || "").trim().toLowerCase();
    const cleanEmpNo = (empNo || "").trim().toLowerCase();

    if (!cleanEmpId && !cleanEmpNo) {
      return false;
    }

    // 3. Check against canonical DM ID tokens (e.g. dm_emp1_emp2)
    const dmParts = chatId.replace(/^dm_/, "").toLowerCase().split("_");
    for (const part of dmParts) {
      if (
        part &&
        (part === cleanEmpId ||
         part === cleanEmpNo ||
         cleanEmpId.includes(part) ||
         part.includes(cleanEmpId) ||
         cleanEmpNo.includes(part) ||
         part.includes(cleanEmpNo))
      ) {
        return true;
      }
    }

    // 4. Check if any message in this conversation was sent or received by this employee
    const messages = dbCache.chatMessages?.[chatId] || [];
    const isParticipant = messages.some((m: any) => {
      const sId = (m.senderId || "").toLowerCase();
      const sNo = (m.senderEmployeeNo || "").toLowerCase();
      const rId = (m.recipientId || "").toLowerCase();
      const rNo = (m.recipientEmployeeNo || "").toLowerCase();
      return (
        sId === cleanEmpId ||
        sNo === cleanEmpNo ||
        rId === cleanEmpId ||
        rNo === cleanEmpNo
      );
    });

    return isParticipant;
  };

  // 1. Query Messages for a Specific Chat / DM with Participant Access Control
  app.get("/api/chat/messages/:chatId", (req: Request, res: Response) => {
    try {
      const chatId = req.params.chatId;
      const empId = (req.headers["x-employee-id"] as string) || (req.query.employeeId as string);
      const empNo = (req.headers["x-employee-no"] as string) || (req.query.employeeNo as string);
      const role = (req.headers["x-user-role"] as string) || (req.query.role as string);

      if (!canEmployeeAccessChat(chatId, empId, empNo, role)) {
        res.status(403).json({
          success: false,
          error: "Access denied. You can only view private conversations that belong to your account.",
          chatId,
          messages: []
        });
        return;
      }

      const messages = dbCache.chatMessages?.[chatId] || [];
      res.json({ success: true, chatId, messages });
    } catch (err: any) {
      console.error("[Chat Fetch Error]:", err);
      res.status(500).json({ success: false, error: err.message, messages: [] });
    }
  });

  // 2. Send Message with Server-Side Realtime Broadcast & Recipient Tagging
  app.post("/api/chat/messages", (req: Request, res: Response) => {
    try {
      const { chatId, message, senderClientId } = req.body;

      if (!chatId || !message) {
        res.status(400).json({ success: false, error: "chatId and message are required" });
        return;
      }

      if (!dbCache.chatMessages) dbCache.chatMessages = {};
      if (!Array.isArray(dbCache.chatMessages[chatId])) {
        dbCache.chatMessages[chatId] = [];
      }

      // Append verified message ensuring initial single-check status
      const messageToSave = {
        ...message,
        status: "sent",
        readAt: null,
        readBy: null
      };

      dbCache.chatMessages[chatId].push(messageToSave);

      // Update summary for channels or DMs
      const previewText = messageToSave.image
        ? "📷 Photo"
        : messageToSave.attachment
          ? `📎 ${messageToSave.attachment.name || "Attachment"}`
          : messageToSave.text
            ? messageToSave.text.slice(0, 50)
            : "Message";

      const timeString = messageToSave.timestamp || new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

      if (Array.isArray(dbCache.chatChannels)) {
        const ch = dbCache.chatChannels.find((c: any) => c.id === chatId);
        if (ch) {
          ch.lastMessage = previewText;
          ch.lastTime = timeString;
        }
      }

      if (Array.isArray(dbCache.chatDMs)) {
        const dm = dbCache.chatDMs.find((d: any) => d.id === chatId);
        if (dm) {
          dm.lastMessage = previewText;
          dm.lastTime = timeString;
        }
      }

      saveDatabase(dbCache);

      // Broadcast new message to other clients in realtime with participant routing
      const isPrivate = isPrivateDMChat(chatId);
      broadcastToClients({
        type: "CHAT_MESSAGE_SENT",
        entity: `chat_${chatId}`,
        data: {
          chatId,
          message: messageToSave,
          isPrivateDM: isPrivate,
          senderId: messageToSave.senderId,
          senderEmployeeNo: messageToSave.senderEmployeeNo,
          senderName: messageToSave.senderName,
          recipientId: messageToSave.recipientId,
          recipientEmployeeNo: messageToSave.recipientEmployeeNo,
          recipientName: messageToSave.recipientName
        },
        senderClientId: senderClientId || (req.headers["x-client-id"] as string),
        timestamp: new Date().toISOString()
      });

      res.json({ success: true, message: messageToSave });
    } catch (err: any) {
      console.error("[Chat Message Send Error]:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 2.1 Mark Chat Messages as Seen / Read Endpoint (Real-Time Read Receipts)
  app.post("/api/chat/messages/read", (req: Request, res: Response) => {
    try {
      const { chatId, readerId, readerEmployeeNo, readerName, messageIds, senderClientId } = req.body;

      if (!chatId) {
        res.status(400).json({ success: false, error: "chatId is required" });
        return;
      }

      const cleanReaderId = (readerId || "").toString().trim().toLowerCase();
      const cleanReaderNo = (readerEmployeeNo || "").toString().trim().toUpperCase();

      if (!dbCache.chatMessages) dbCache.chatMessages = {};
      const chatList = dbCache.chatMessages[chatId] || [];

      const readTimestamp = new Date().toISOString();
      const updatedMessageIds: string[] = [];

      chatList.forEach((msg: any) => {
        if (!msg) return;

        // Message was sent by someone else
        const sId = (msg.senderId || "").toString().trim().toLowerCase();
        const sNo = (msg.senderEmployeeNo || "").toString().trim().toUpperCase();

        const isSentByOther = (cleanReaderId && sId !== cleanReaderId) || (cleanReaderNo && sNo !== cleanReaderNo);

        if (isSentByOther) {
          // If specific messageIds are provided, only mark those, otherwise mark all unread from other
          const matchesTarget = !Array.isArray(messageIds) || messageIds.length === 0 || messageIds.includes(msg.id);

          if (matchesTarget && msg.status !== "read") {
            msg.status = "read";
            msg.readAt = readTimestamp;
            msg.readBy = {
              id: readerId,
              employeeNo: readerEmployeeNo,
              name: readerName || "Recipient",
              readAt: readTimestamp
            };
            updatedMessageIds.push(msg.id);
          }
        }
      });

      if (updatedMessageIds.length > 0) {
        saveDatabase(dbCache);

        // Broadcast real-time read receipt to all clients (especially sender)
        broadcastToClients({
          type: "CHAT_MESSAGES_READ",
          entity: `chat_${chatId}`,
          data: {
            chatId,
            readerId,
            readerEmployeeNo,
            readerName,
            readAt: readTimestamp,
            messageIds: updatedMessageIds
          },
          senderClientId: senderClientId || (req.headers["x-client-id"] as string),
          timestamp: readTimestamp
        });
      }

      res.json({
        success: true,
        chatId,
        updatedCount: updatedMessageIds.length,
        messageIds: updatedMessageIds,
        readAt: readTimestamp
      });
    } catch (err: any) {
      console.error("[Chat Read Receipt Error]:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 2.2 Delete / Clear Chat Conversation Endpoint
  app.delete("/api/chat/conversations/:chatId", (req: Request, res: Response) => {
    try {
      const chatId = req.params.chatId;
      const empId = (req.headers["x-employee-id"] as string) || (req.query.employeeId as string);
      const empNo = (req.headers["x-employee-no"] as string) || (req.query.employeeNo as string);
      const role = (req.headers["x-user-role"] as string) || (req.query.role as string);

      if (!canEmployeeAccessChat(chatId, empId, empNo, role)) {
        res.status(403).json({ success: false, error: "Access denied to delete this conversation." });
        return;
      }

      if (!dbCache.chatMessages) dbCache.chatMessages = {};
      dbCache.chatMessages[chatId] = [];

      // Update channel / DM last message preview
      if (Array.isArray(dbCache.chatChannels)) {
        const ch = dbCache.chatChannels.find((c: any) => c.id === chatId);
        if (ch) {
          ch.lastMessage = "Conversation cleared";
          ch.lastTime = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
          ch.unreadCount = 0;
        }
      }

      if (Array.isArray(dbCache.chatDMs)) {
        const dm = dbCache.chatDMs.find((d: any) => d.id === chatId);
        if (dm) {
          dm.lastMessage = "Conversation cleared";
          dm.lastTime = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
          dm.unreadCount = 0;
        }
      }

      saveDatabase(dbCache);

      broadcastToClients({
        type: "CHAT_CONVERSATION_DELETED",
        entity: `chat_${chatId}`,
        data: {
          chatId,
          deletedBy: empId || empNo || "User",
          timestamp: new Date().toISOString()
        },
        senderClientId: (req.headers["x-client-id"] as string),
        timestamp: new Date().toISOString()
      });

      res.json({ success: true, chatId, message: "Conversation deleted successfully." });
    } catch (err: any) {
      console.error("[Chat Conversation Delete Error]:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 2.3 Toggle Message Reaction with Emoji
  app.post("/api/chat/messages/react", (req: Request, res: Response) => {
    try {
      const { chatId, messageId, emoji, userId, senderClientId } = req.body;
      if (!chatId || !messageId || !emoji) {
        res.status(400).json({ success: false, error: "chatId, messageId and emoji are required" });
        return;
      }

      if (!dbCache.chatMessages) dbCache.chatMessages = {};
      const list = dbCache.chatMessages[chatId] || [];
      const msg = list.find((m: any) => m.id === messageId);
      if (!msg) {
        res.status(404).json({ success: false, error: "Message not found" });
        return;
      }

      if (!msg.reactions) msg.reactions = {};
      if (!msg.reactedUsers) msg.reactedUsers = {};

      const currentCount = msg.reactions[emoji] || 0;
      const usersForEmoji: string[] = msg.reactedUsers[emoji] || [];
      const uId = (userId || "anonymous").toString();
      const userIndex = usersForEmoji.indexOf(uId);

      if (userIndex > -1) {
        usersForEmoji.splice(userIndex, 1);
        if (currentCount <= 1) {
          delete msg.reactions[emoji];
        } else {
          msg.reactions[emoji] = currentCount - 1;
        }
      } else {
        usersForEmoji.push(uId);
        msg.reactions[emoji] = currentCount + 1;
      }
      msg.reactedUsers[emoji] = usersForEmoji;

      saveDatabase(dbCache);

      broadcastToClients({
        type: "CHAT_MESSAGE_REACTED",
        entity: `chat_${chatId}`,
        data: {
          chatId,
          messageId,
          emoji,
          reactions: msg.reactions,
          reactedUsers: msg.reactedUsers,
          userId: uId
        },
        senderClientId: senderClientId || (req.headers["x-client-id"] as string),
        timestamp: new Date().toISOString()
      });

      res.json({ success: true, reactions: msg.reactions, reactedUsers: msg.reactedUsers });
    } catch (err: any) {
      console.error("[Chat Reaction Error]:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3. Upload and Send Real Chat Image (JPG, PNG, WEBP, GIF)
  app.post("/api/chat/upload-image", (req: Request, res: Response) => {
    try {
      const {
        chatId,
        fileName,
        fileType,
        dataUrl,
        senderId,
        senderName,
        senderEmployeeNo,
        senderDepartment,
        senderPosition,
        senderAvatar,
        senderRole,
        recipientId,
        recipientEmployeeNo,
        recipientName,
        caption,
        senderClientId
      } = req.body;

      if (!chatId || !dataUrl) {
        res.status(400).json({ success: false, error: "chatId and image data are required" });
        return;
      }

      // Extract binary buffer from dataUrl
      let base64Data = dataUrl;
      if (dataUrl.includes(",")) {
        base64Data = dataUrl.split(",")[1];
      }
      const buffer = Buffer.from(base64Data, "base64");

      // Validate image size (e.g. max 15MB)
      if (buffer.length > 15 * 1024 * 1024) {
        res.status(400).json({ success: false, error: "Image file exceeds 15MB limit." });
        return;
      }

      const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const extMatch = (fileType || "image/jpeg").split("/")[1] || "jpg";
      const cleanFileName = (fileName || `image_${imageId}.${extMatch}`).replace(/[^a-zA-Z0-9.-]/g, "_");
      const diskFilePath = path.join(CHAT_IMAGES_DIR, `${imageId}_${cleanFileName}`);

      // Write image to disk securely
      fs.writeFileSync(diskFilePath, buffer);

      const fileSizeStr = buffer.length > 1024 * 1024 
        ? `${(buffer.length / (1024 * 1024)).toFixed(2)} MB`
        : `${(buffer.length / 1024).toFixed(1)} KB`;

      const imageAttachment = {
        id: imageId,
        fileName: cleanFileName,
        fileSize: fileSizeStr,
        mimeType: fileType || "image/jpeg",
        previewUrl: `/api/chat/images/${imageId}`,
        downloadUrl: `/api/chat/images/${imageId}?download=1`,
        dataUrl: dataUrl // for instant memory rendering
      };

      // Save to chatImages registry
      if (!dbCache.chatImages) dbCache.chatImages = {};
      dbCache.chatImages[imageId] = {
        id: imageId,
        fileName: cleanFileName,
        fileSize: fileSizeStr,
        mimeType: fileType || "image/jpeg",
        diskPath: diskFilePath,
        dataUrl,
        senderId,
        recipientId,
        chatId,
        uploadedAt: new Date().toISOString()
      };

      const timeNow = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

      // Create complete chat message
      const chatMessage = {
        id: `msg_img_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        chatId,
        senderId: senderId || "user",
        senderName: senderName || "Employee",
        senderEmployeeNo,
        senderDepartment,
        senderPosition,
        senderAvatar,
        senderRole,
        recipientId,
        recipientEmployeeNo,
        recipientName,
        text: caption ? caption.trim() : "",
        image: imageAttachment,
        timestamp: timeNow,
        status: "sent",
        readAt: null,
        readBy: null
      };

      if (!dbCache.chatMessages) dbCache.chatMessages = {};
      if (!Array.isArray(dbCache.chatMessages[chatId])) {
        dbCache.chatMessages[chatId] = [];
      }
      dbCache.chatMessages[chatId].push(chatMessage);

      // Update last message summary
      if (Array.isArray(dbCache.chatChannels)) {
        const ch = dbCache.chatChannels.find((c: any) => c.id === chatId);
        if (ch) {
          ch.lastMessage = caption ? `📷 ${caption.slice(0, 35)}` : "📷 Photo";
          ch.lastTime = timeNow;
        }
      }

      if (Array.isArray(dbCache.chatDMs)) {
        const dm = dbCache.chatDMs.find((d: any) => d.id === chatId);
        if (dm) {
          dm.lastMessage = caption ? `📷 ${caption.slice(0, 35)}` : "📷 Photo";
          dm.lastTime = timeNow;
        }
      }

      saveDatabase(dbCache);

      // Broadcast realtime message with photo
      const isPrivate = isPrivateDMChat(chatId);
      broadcastToClients({
        type: "CHAT_MESSAGE_SENT",
        entity: `chat_${chatId}`,
        data: {
          chatId,
          message: chatMessage,
          isPrivateDM: isPrivate,
          senderId,
          senderEmployeeNo,
          senderName,
          recipientId,
          recipientEmployeeNo,
          recipientName
        },
        senderClientId: senderClientId || (req.headers["x-client-id"] as string),
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        message: chatMessage,
        image: imageAttachment
      });
    } catch (err: any) {
      console.error("[Chat Image Upload Error]:", err);
      res.status(500).json({ success: false, error: err.message || "Failed to upload image" });
    }
  });

  // 4. Stream or Download Chat Image with Proper Content-Type & Headers
  app.get("/api/chat/images/:imageId", (req: Request, res: Response) => {
    try {
      const imageId = req.params.imageId;
      const isDownload = req.query.download === "1" || req.query.download === "true";
      const imgRecord = dbCache.chatImages?.[imageId];

      if (!imgRecord) {
        res.status(404).send("Image not found");
        return;
      }

      if (imgRecord.diskPath && fs.existsSync(imgRecord.diskPath)) {
        res.setHeader("Content-Type", imgRecord.mimeType || "image/jpeg");
        res.setHeader("Cache-Control", "public, max-age=86400");
        if (isDownload) {
          res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(imgRecord.fileName)}"`);
        } else {
          res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(imgRecord.fileName)}"`);
        }
        fs.createReadStream(imgRecord.diskPath).pipe(res);
        return;
      }

      if (imgRecord.dataUrl) {
        let base64Data = imgRecord.dataUrl;
        if (imgRecord.dataUrl.includes(",")) {
          base64Data = imgRecord.dataUrl.split(",")[1];
        }
        const buffer = Buffer.from(base64Data, "base64");
        res.setHeader("Content-Type", imgRecord.mimeType || "image/jpeg");
        res.setHeader("Cache-Control", "public, max-age=86400");
        if (isDownload) {
          res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(imgRecord.fileName)}"`);
        } else {
          res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(imgRecord.fileName)}"`);
        }
        res.send(buffer);
        return;
      }

      res.status(404).send("Image data unavailable");
    } catch (err: any) {
      console.error("[Chat Image Stream Error]:", err);
      res.status(500).send("Error serving image");
    }
  });

  // =========================================================================
  // DEPARTMENT TRAINING MANAGEMENT SYSTEM - FILE & PHOTO UPLOAD APIS
  // =========================================================================

  // Upload Department Training Photo or Document
  app.post("/api/department-training/upload", (req: Request, res: Response) => {
    try {
      const {
        fileName,
        fileType,
        mimeType,
        dataUrl,
        category,
        caption,
        recordId,
        departmentId,
        uploadedBy
      } = req.body;

      if (!dataUrl) {
        res.status(400).json({ success: false, error: "File data (dataUrl) is required" });
        return;
      }

      // Extract binary buffer from dataUrl
      let base64Data = dataUrl;
      if (dataUrl.includes(",")) {
        base64Data = dataUrl.split(",")[1];
      }
      const buffer = Buffer.from(base64Data, "base64");

      // Validate size (max 25MB)
      if (buffer.length > 25 * 1024 * 1024) {
        res.status(400).json({ success: false, error: "File exceeds 25MB limit." });
        return;
      }

      const fileId = `dtfile_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const safeName = (fileName || `file_${fileId}`).replace(/[^a-zA-Z0-9._-]/g, "_");
      const diskPath = path.join(DEPT_FILES_DIR, `${fileId}_${safeName}`);

      // Write to disk
      fs.writeFileSync(diskPath, buffer);

      const fileSizeStr = buffer.length > 1024 * 1024
        ? `${(buffer.length / (1024 * 1024)).toFixed(2)} MB`
        : `${(buffer.length / 1024).toFixed(1)} KB`;

      const resolvedMime = mimeType || fileType || "application/octet-stream";

      const fileRecord = {
        id: fileId,
        fileName: safeName,
        fileSize: fileSizeStr,
        fileType: fileType || "file",
        mimeType: resolvedMime,
        diskPath,
        dataUrl, // stored for instant local offline render
        url: `/api/department-training/files/${fileId}`,
        downloadUrl: `/api/department-training/files/${fileId}?download=1`,
        category: category || "General",
        caption: caption || "",
        recordId: recordId || "",
        departmentId: departmentId || "",
        uploadedBy: uploadedBy || "User",
        uploadedAt: new Date().toISOString()
      };

      if (!dbCache.departmentTrainingFiles) {
        dbCache.departmentTrainingFiles = {};
      }
      dbCache.departmentTrainingFiles[fileId] = fileRecord;
      saveDatabase(dbCache);

      res.json({
        success: true,
        file: fileRecord
      });
    } catch (err: any) {
      console.error("[Department Training Upload Error]:", err);
      res.status(500).json({ success: false, error: err.message || "Failed to upload file" });
    }
  });

  // Stream or Download Department Training File / Photo
  app.get("/api/department-training/files/:fileId", (req: Request, res: Response) => {
    try {
      const fileId = req.params.fileId;
      const isDownload = req.query.download === "1" || req.query.download === "true";
      const fileRecord = dbCache.departmentTrainingFiles?.[fileId];

      if (!fileRecord) {
        res.status(404).send("File not found");
        return;
      }

      if (fileRecord.diskPath && fs.existsSync(fileRecord.diskPath)) {
        res.setHeader("Content-Type", fileRecord.mimeType || "application/octet-stream");
        res.setHeader("Cache-Control", "public, max-age=86400");
        if (isDownload) {
          res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(fileRecord.fileName)}"`);
        } else {
          res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(fileRecord.fileName)}"`);
        }
        fs.createReadStream(fileRecord.diskPath).pipe(res);
        return;
      }

      if (fileRecord.dataUrl) {
        let base64Data = fileRecord.dataUrl;
        if (fileRecord.dataUrl.includes(",")) {
          base64Data = fileRecord.dataUrl.split(",")[1];
        }
        const buffer = Buffer.from(base64Data, "base64");
        res.setHeader("Content-Type", fileRecord.mimeType || "application/octet-stream");
        res.setHeader("Cache-Control", "public, max-age=86400");
        if (isDownload) {
          res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(fileRecord.fileName)}"`);
        } else {
          res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(fileRecord.fileName)}"`);
        }
        res.send(buffer);
        return;
      }

      res.status(404).send("File data not available");
    } catch (err: any) {
      console.error("[Department Training File Stream Error]:", err);
      res.status(500).send("Error serving file");
    }
  });

  // Delete Department Training File
  app.delete("/api/department-training/files/:fileId", (req: Request, res: Response) => {
    try {
      const fileId = req.params.fileId;
      const fileRecord = dbCache.departmentTrainingFiles?.[fileId];
      if (fileRecord) {
        if (fileRecord.diskPath && fs.existsSync(fileRecord.diskPath)) {
          try { fs.unlinkSync(fileRecord.diskPath); } catch {}
        }
        delete dbCache.departmentTrainingFiles[fileId];
        saveDatabase(dbCache);
      }
      res.json({ success: true });
    } catch (err: any) {
      console.error("[Department Training File Delete Error]:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Master Bootstrap Endpoint - Initial sync with strict section leader RBAC boundary
  app.get("/api/sync/bootstrap", (req: Request, res: Response) => {
    const user = getRequestUser(req);

    // If Section Leader, filter all records strictly to their assigned section
    if (user && isSectionLeader(user)) {
      const userSec = getUserAssignedSection(user);
      const filteredEmployees = (dbCache.employees || []).filter((e: any) => canAccessRecord(user, e).allowed);
      const filteredRecords = (dbCache.records || []).filter((r: any) => canAccessRecord(user, r).allowed);
      const filteredLogs = (dbCache.logs || []).filter((l: any) => canAccessRecord(user, l).allowed);
      const filteredStitching = (dbCache.stitchingRecords || []).filter((s: any) => canAccessRecord(user, s).allowed);
      const filteredDeptItems = (dbCache.departmentItems || []).filter((d: any) => canAccessRecord(user, d).allowed);
      const filteredDeptTraining = (dbCache.departmentTrainingRecords || []).filter((d: any) => canAccessRecord(user, d).allowed);
      const filteredLeadership = (dbCache.leadershipAttendance || []).filter((l: any) => canAccessRecord(user, l).allowed);
      const filteredDocuments = (dbCache.documents || []).filter((d: any) => canAccessRecord(user, d).allowed);

      const filteredFiles: Record<string, any> = {};
      Object.entries(dbCache.files || {}).forEach(([id, f]: [string, any]) => {
        if (canAccessRecord(user, f).allowed) {
          filteredFiles[id] = f;
        }
      });

      res.json({
        success: true,
        data: {
          ...dbCache,
          employees: filteredEmployees,
          records: filteredRecords,
          logs: filteredLogs,
          stitchingRecords: filteredStitching,
          departmentItems: filteredDeptItems,
          departmentTrainingRecords: filteredDeptTraining,
          leadershipAttendance: filteredLeadership,
          documents: filteredDocuments,
          files: filteredFiles
        },
        restrictedToSection: userSec,
        connectedClients: sseClients.size,
        serverTime: new Date().toISOString()
      });
      return;
    }

    res.json({
      success: true,
      data: dbCache,
      connectedClients: sseClients.size,
      serverTime: new Date().toISOString()
    });
  });

  // Dedicated Employee Lookup Endpoint with Section Leader Boundary Enforcement
  app.get("/api/employees/:id", (req: Request, res: Response) => {
    try {
      const empId = req.params.id;
      const user = getRequestUser(req);
      const employee = (dbCache.employees || []).find((e: any) => 
        String(e.id) === empId || 
        String(e.employeeNo) === empId || 
        normalizeEmpNo(e.employeeNo) === normalizeEmpNo(empId)
      );

      if (!employee) {
        res.status(404).json({ success: false, error: "Employee record not found." });
        return;
      }

      if (user && isSectionLeader(user)) {
        const access = canAccessRecord(user, employee);
        if (!access.allowed) {
          res.status(403).json({
            success: false,
            error: access.reason || `Access Denied: Section Leader is strictly restricted to assigned section [${getUserAssignedSection(user)}].`
          });
          return;
        }
      }

      res.json({ success: true, employee });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Entity Sync Endpoint - Updates single entity category and broadcasts to all other PCs
  app.post("/api/sync/entity", (req: Request, res: Response) => {
    try {
      const { entity, data, senderClientId, action } = req.body;
      if (!entity) {
        res.status(400).json({ success: false, error: "Entity name is required" });
        return;
      }

      // Defensive Protection: NEVER automatically wipe 4,400+ employees with a small sample array
      if (entity === "employees" && Array.isArray(data)) {
        if (dbCache.employees && dbCache.employees.length > 50 && data.length < 50 && action !== "force_wipe") {
          console.log(`[Safety Guard] Merging ${data.length} incoming employees with existing ${dbCache.employees.length} employees to prevent accidental data loss.`);
          const map = new Map<string, any>(dbCache.employees.map((e: any) => [String(e.id || e.employeeNo), e]));
          data.forEach((e: any) => {
            const key = String(e.id || e.employeeNo);
            const existing = map.get(key) || {};
            map.set(key, { ...existing, ...e });
          });
          dbCache.employees = Array.from(map.values());
        } else {
          dbCache.employees = data;
        }
      } else if ((entity === "stitching" || entity === "stitchingRecords") && Array.isArray(data)) {
        // Defensive Protection: NEVER automatically delete existing stitching records
        if (dbCache.stitchingRecords && dbCache.stitchingRecords.length > 10 && data.length < 10 && action !== "admin_delete") {
          console.log(`[Safety Guard] Merging ${data.length} incoming stitching records with existing ${dbCache.stitchingRecords.length} records to protect 2025/2026 data.`);
          const map = new Map<string, any>(dbCache.stitchingRecords.map((r: any) => [String(r.id), r]));
          data.forEach((r: any) => {
            const key = String(r.id);
            const existing = map.get(key) || {};
            map.set(key, { ...existing, ...r });
          });
          dbCache.stitchingRecords = Array.from(map.values());
        } else {
          dbCache.stitchingRecords = data;
        }
      } else {
        (dbCache as any)[entity] = data;
      }

      saveDatabase(dbCache);

      // Broadcast update to ALL other connected PCs
      broadcastToClients({
        type: "ENTITY_UPDATED",
        entity,
        data: (dbCache as any)[entity],
        senderClientId: senderClientId || (req.headers["x-client-id"] as string),
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        entity,
        action: action || "update",
        lastUpdated: dbCache.lastUpdated
      });
    } catch (err: any) {
      console.error("[Server Sync] Error syncing entity:", err);
      res.status(500).json({ success: false, error: err.message || "Sync failed" });
    }
  });

  // =========================================================================
  // STITCHING TRAINING PLAN - GOOGLE SHEETS SYNCHRONIZATION API
  // =========================================================================

  const STITCHING_SHEET_FILE = path.join(DATA_DIR, "stitching_google_sheet.json");
  const STITCHING_CONFIG_FILE = path.join(DATA_DIR, "stitching_sheet_config.json");

  // Load or initialize stitching_sheet_config.json
  let stitchingConfig: {
    sheetId: string;
    sheetUrl: string;
    sheetName: string;
    apiKey: string;
    autoSync: boolean;
    syncIntervalSeconds: number;
    lastSynced: string;
    syncStatus: "synced" | "syncing" | "error" | "connected" | "empty";
    recordsSyncedCount: number;
  } = {
    sheetId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
    sheetUrl: "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit",
    sheetName: "Training Plan - Stitching",
    apiKey: "",
    autoSync: true,
    syncIntervalSeconds: 30,
    lastSynced: new Date().toISOString(),
    syncStatus: (dbCache.stitchingRecords || []).length > 0 ? "synced" : "connected",
    recordsSyncedCount: (dbCache.stitchingRecords || []).length
  };

  try {
    if (fs.existsSync(STITCHING_CONFIG_FILE)) {
      const saved = JSON.parse(fs.readFileSync(STITCHING_CONFIG_FILE, "utf-8"));
      stitchingConfig = { ...stitchingConfig, ...saved };
    } else {
      fs.writeFileSync(STITCHING_CONFIG_FILE, JSON.stringify(stitchingConfig, null, 2), "utf-8");
    }
  } catch (err) {
    console.warn("[Stitching Sync] Could not read stitching_sheet_config.json:", err);
  }

  function getGoogleSheetRows(): any[] {
    try {
      if (fs.existsSync(STITCHING_SHEET_FILE)) {
        return JSON.parse(fs.readFileSync(STITCHING_SHEET_FILE, "utf-8"));
      }
    } catch (err) {
      console.warn("[Stitching Sync] Error reading stitching_google_sheet.json:", err);
    }
    return [];
  }

  function saveGoogleSheetRows(rows: any[]) {
    try {
      fs.writeFileSync(STITCHING_SHEET_FILE, JSON.stringify(rows, null, 2), "utf-8");
    } catch (err) {
      console.error("[Stitching Sync] Failed to write stitching_google_sheet.json:", err);
    }
  }

  function saveStitchingConfig(cfg: any) {
    try {
      fs.writeFileSync(STITCHING_CONFIG_FILE, JSON.stringify(cfg, null, 2), "utf-8");
    } catch (err) {
      console.error("[Stitching Sync] Failed to write stitching_sheet_config.json:", err);
    }
  }

  // Parse CSV text into array of rows
  function parseCSVRows(csvText: string): string[][] {
    const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
    return lines.map(line => {
      const row: string[] = [];
      let inQuotes = false;
      let cur = "";
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (ch === ',' && !inQuotes) {
          row.push(cur.trim());
          cur = "";
        } else {
          cur += ch;
        }
      }
      row.push(cur.trim());
      return row;
    });
  }

  // Transform raw Google Sheet rows (either matrix from Sheets API / CSV, or array of objects)
  // into clean Training Plan records: | Date | Training Subject | Trainer | Section | No. of Trainees | Total Time | Status | Documentation |
  function transformGoogleSheetDataToTrainingPlans(rawInput: any): any[] {
    if (!rawInput) return [];

    // Case 1: Array of arrays (matrix from Sheets API or CSV)
    if (Array.isArray(rawInput) && rawInput.length > 0 && Array.isArray(rawInput[0])) {
      const rows: string[][] = rawInput;
      if (rows.length < 2) return [];

      // Find header row (row that contains 'subject', 'topic', 'trainer', or 'date')
      let headerIdx = -1;
      for (let i = 0; i < Math.min(5, rows.length); i++) {
        const rowStr = rows[i].map(c => String(c).toLowerCase()).join(" ");
        if (rowStr.includes("subject") || rowStr.includes("trainer") || rowStr.includes("trainee") || rowStr.includes("section")) {
          headerIdx = i;
          break;
        }
      }
      if (headerIdx === -1) headerIdx = 0;

      const headers = rows[headerIdx].map(h => String(h || "").trim().toLowerCase());
      
      const findCol = (keywords: string[]) => {
        return headers.findIndex(h => keywords.some(k => h.includes(k)));
      };

      const dateCol = findCol(["date", "schedule", "day", "time"]);
      const subjectCol = findCol(["subject", "topic", "course", "module", "training plan", "title", "process"]);
      const trainerCol = findCol(["trainer", "instructor", "facilitator", "conducted", "lead", "teacher"]);
      const sectionCol = findCol(["section", "line", "dept", "department", "area", "unit", "group"]);
      const traineesCol = findCol(["trainee", "participant", "attendee", "pax", "count", "headcount", "number"]);
      const timeCol = findCol(["total time", "duration", "hours", "hrs", "time"]);
      const statusCol = findCol(["status", "state", "progress", "completion"]);
      const docCol = findCol(["doc", "evidence", "sop", "remarks", "notes", "file", "record"]);

      const records: any[] = [];
      for (let i = headerIdx + 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r || r.every(c => !c || String(c).trim() === "")) continue;

        const dateVal = (dateCol >= 0 && r[dateCol]) ? String(r[dateCol]).trim() : new Date().toISOString().split("T")[0];
        const subjectVal = (subjectCol >= 0 && r[subjectCol]) ? String(r[subjectCol]).trim() : "Stitching Process Training";
        const trainerVal = (trainerCol >= 0 && r[trainerCol]) ? String(r[trainerCol]).trim() : "Internal Trainer";
        const sectionVal = (sectionCol >= 0 && r[sectionCol]) ? String(r[sectionCol]).trim() : "Stitching Department";
        
        let traineesCount = 0;
        if (traineesCol >= 0 && r[traineesCol]) {
          const parsed = parseInt(String(r[traineesCol]).replace(/[^\d]/g, ""), 10);
          if (!isNaN(parsed)) traineesCount = parsed;
        }
        if (traineesCount <= 0) traineesCount = 1;

        const totalTimeVal = (timeCol >= 0 && r[timeCol]) ? String(r[timeCol]).trim() : "2.0 Hours";
        
        let statusVal: "Scheduled" | "Completed" | "In Progress" | "Cancelled" = "Scheduled";
        if (statusCol >= 0 && r[statusCol]) {
          const s = String(r[statusCol]).trim().toLowerCase();
          if (s.includes("complete") || s.includes("done") || s.includes("finish") || s.includes("pass")) {
            statusVal = "Completed";
          } else if (s.includes("prog") || s.includes("on-going") || s.includes("under") || s.includes("run")) {
            statusVal = "In Progress";
          } else if (s.includes("cancel") || s.includes("drop") || s.includes("postpone")) {
            statusVal = "Cancelled";
          } else {
            statusVal = "Scheduled";
          }
        }

        const docVal = (docCol >= 0 && r[docCol]) ? String(r[docCol]).trim() : "Verified";

        // Extract year and month
        let yearVal = 2026;
        let monthVal = "September";
        const yearMatch = dateVal.match(/202\d/);
        if (yearMatch) yearVal = parseInt(yearMatch[0], 10);

        try {
          const d = new Date(dateVal);
          if (!isNaN(d.getTime())) {
            monthVal = d.toLocaleString("en-US", { month: "long" });
            yearVal = d.getFullYear();
          }
        } catch {}

        records.push({
          id: `ST-TP-${String(records.length + 1).padStart(3, "0")}`,
          date: dateVal,
          trainingSubject: subjectVal,
          trainer: trainerVal,
          section: sectionVal,
          noOfTrainees: traineesCount,
          totalTime: totalTimeVal,
          status: statusVal,
          documentation: docVal,
          year: yearVal,
          month: monthVal,
          // Backward compatibility mappings
          traineeName: subjectVal,
          line: sectionVal,
          trainerName: trainerVal,
          trainingProcess: subjectVal,
          outputActual: traineesCount,
          outputTarget: traineesCount,
          updatedAt: new Date().toISOString()
        });
      }
      return records;
    }

    // Case 2: Array of objects
    if (Array.isArray(rawInput)) {
      return rawInput.map((row: any, idx: number) => {
        const dateVal = row.date || row.trainingDate || row.scheduleDate || new Date().toISOString().split("T")[0];
        const subjectVal = row.trainingSubject || row.subject || row.course || row.trainingTopic || row.trainingProcess || "Stitching Process Training";
        const trainerVal = row.trainer || row.trainerName || row.instructor || "Internal Trainer";
        const sectionVal = row.section || row.line || row.department || "Stitching Department";
        const traineesCount = Number(row.noOfTrainees || row.trainees || row.participants || row.outputActual || 1);
        const totalTimeVal = row.totalTime || row.duration || row.hours || "2.0 Hours";
        
        let statusVal: "Scheduled" | "Completed" | "In Progress" | "Cancelled" = "Scheduled";
        const s = String(row.status || "").toLowerCase();
        if (s.includes("complete") || s.includes("done") || s.includes("finish") || s.includes("pass")) {
          statusVal = "Completed";
        } else if (s.includes("prog") || s.includes("on-going") || s.includes("under")) {
          statusVal = "In Progress";
        } else if (s.includes("cancel")) {
          statusVal = "Cancelled";
        } else if (row.status === "Scheduled") {
          statusVal = "Scheduled";
        }

        const docVal = row.documentation || row.notes || "Verified";

        let yearVal = row.year ? Number(row.year) : 2026;
        let monthVal = row.month || "September";
        try {
          const d = new Date(dateVal);
          if (!isNaN(d.getTime())) {
            monthVal = d.toLocaleString("en-US", { month: "long" });
            yearVal = d.getFullYear();
          }
        } catch {}

        return {
          id: row.id || `ST-TP-${String(idx + 1).padStart(3, "0")}`,
          date: dateVal,
          trainingSubject: subjectVal,
          trainer: trainerVal,
          section: sectionVal,
          noOfTrainees: traineesCount,
          totalTime: totalTimeVal,
          status: statusVal,
          documentation: docVal,
          year: yearVal,
          month: monthVal,
          // Backward compatibility mappings
          traineeName: subjectVal,
          line: sectionVal,
          trainerName: trainerVal,
          trainingProcess: subjectVal,
          outputActual: traineesCount,
          outputTarget: traineesCount,
          updatedAt: new Date().toISOString()
        };
      });
    }

    return [];
  }

  // Parse raw Google Sheet matrix into structured Training Plan Stitching Audit Folder
  // Preserves ALL rows, blanks, and exact values without altering spelling, numbers, dates, or casing.
  function parseGoogleSheetMatrixToAuditFolder(matrix: string[][], fallbackLinePrefix: string = 'A'): {
    auditDate: string;
    dateColumnHeader: string;
    rows: any[];
  } {
    let auditDate = 'Audit Date: September 24, 2026';
    let dateColumnHeader = '(09/21~26/26)';
    const rows: any[] = [];

    if (!matrix || !Array.isArray(matrix) || matrix.length === 0) {
      return { auditDate, dateColumnHeader, rows: [] };
    }

    // 1. Scan for Audit Date in the first 10 rows
    for (let r = 0; r < Math.min(matrix.length, 10); r++) {
      const row = matrix[r] || [];
      for (let c = 0; c < row.length; c++) {
        const cell = String(row[c] || '').trim();
        if (cell.toLowerCase().includes('audit date')) {
          auditDate = cell;
        }
      }
    }

    // 2. Scan for Header row with "Line No." or "Line"
    let headerRowIndex = -1;
    let lineNoCol = -1;
    let nameCol = -1;
    let dateCol = -1;
    let styleCol = -1;
    let findingsCol = -1;

    for (let r = 0; r < Math.min(matrix.length, 12); r++) {
      const row = matrix[r] || [];
      for (let c = 0; c < row.length; c++) {
        const cell = String(row[c] || '').trim().toLowerCase();
        if (cell === 'line no.' || cell === 'line no' || cell === 'line') {
          headerRowIndex = r;
          lineNoCol = c;
          break;
        }
      }
      if (headerRowIndex !== -1) break;
    }

    if (headerRowIndex !== -1) {
      const headerRow = matrix[headerRowIndex] || [];
      for (let c = 0; c < headerRow.length; c++) {
        const val = String(headerRow[c] || '').trim();
        const lower = val.toLowerCase();
        if (c === lineNoCol) continue;
        if (lower === 'name' || lower.includes('operator')) {
          nameCol = c;
        } else if (lower.includes('style')) {
          styleCol = c;
        } else if (lower.includes('finding') || lower.includes('remark') || lower.includes('result')) {
          findingsCol = c;
        } else if (val.includes('/') || lower.includes('date') || val.startsWith('(')) {
          dateCol = c;
          dateColumnHeader = val;
        }
      }

      if (nameCol === -1 && lineNoCol + 1 < headerRow.length) nameCol = lineNoCol + 1;
      if (dateCol === -1 && lineNoCol + 2 < headerRow.length) dateCol = lineNoCol + 2;
      if (styleCol === -1 && lineNoCol + 3 < headerRow.length) styleCol = lineNoCol + 3;
      if (findingsCol === -1 && lineNoCol + 4 < headerRow.length) findingsCol = lineNoCol + 4;

      for (let r = headerRowIndex + 1; r < matrix.length; r++) {
        const row = matrix[r] || [];
        const lineNo = lineNoCol !== -1 && row[lineNoCol] !== undefined ? String(row[lineNoCol]).trim() : '';
        const name = nameCol !== -1 && row[nameCol] !== undefined ? String(row[nameCol]) : '';
        const date = dateCol !== -1 && row[dateCol] !== undefined ? String(row[dateCol]) : '';
        const style = styleCol !== -1 && row[styleCol] !== undefined ? String(row[styleCol]) : '';
        const findings = findingsCol !== -1 && row[findingsCol] !== undefined ? String(row[findingsCol]) : '';

        rows.push({
          id: `row-${r}-${lineNo || Math.random().toString(36).substr(2, 4)}`,
          lineNo: lineNo || (r <= headerRowIndex + 22 ? `${fallbackLinePrefix}${r - headerRowIndex}` : ''),
          name,
          date,
          style,
          findings
        });
      }
    }

    if (rows.length === 0) {
      for (let i = 1; i <= 22; i++) {
        rows.push({
          id: `row-${fallbackLinePrefix}${i}`,
          lineNo: `${fallbackLinePrefix}${i}`,
          name: '',
          date: '',
          style: '',
          findings: ''
        });
      }
    }

    return { auditDate, dateColumnHeader, rows };
  }

  // Core Synchronization Function: Takes raw rows or parsed records and updates dbCache.stitchingRecords
  function setSynchronizedStitchingData(records: any[]) {
    dbCache.stitchingRecords = records;
    saveDatabase(dbCache);

    stitchingConfig.lastSynced = new Date().toISOString();
    stitchingConfig.recordsSyncedCount = records.length;
    stitchingConfig.syncStatus = records.length > 0 ? "synced" : "connected";
    saveStitchingConfig(stitchingConfig);

    // Save to local sheet cache as well
    saveGoogleSheetRows(records);

    // Broadcast live updates to all connected clients
    broadcastToClients({
      type: "ENTITY_UPDATED",
      entity: "stitching",
      data: dbCache.stitchingRecords,
      timestamp: new Date().toISOString()
    });
    broadcastToClients({
      type: "ENTITY_UPDATED",
      entity: "stitchingRecords",
      data: dbCache.stitchingRecords,
      timestamp: new Date().toISOString()
    });
    broadcastToClients({
      type: "STITCHING_SHEET_SYNCED",
      entity: "stitching",
      data: {
        lastSynced: stitchingConfig.lastSynced,
        recordsSyncedCount: stitchingConfig.recordsSyncedCount,
        syncStatus: stitchingConfig.syncStatus
      },
      timestamp: new Date().toISOString()
    });

    return {
      records: dbCache.stitchingRecords,
      count: dbCache.stitchingRecords.length,
      lastSynced: stitchingConfig.lastSynced,
      syncStatus: stitchingConfig.syncStatus
    };
  }

  // 1. Get Google Sheet Configuration
  app.get("/api/stitching/sheet-config", (_req: Request, res: Response) => {
    stitchingConfig.recordsSyncedCount = (dbCache.stitchingRecords || []).length;
    res.json({
      success: true,
      config: stitchingConfig
    });
  });

  // 2. Update Google Sheet Configuration
  app.post("/api/stitching/sheet-config", (req: Request, res: Response) => {
    try {
      const updates = req.body;
      stitchingConfig = { ...stitchingConfig, ...updates };
      if (stitchingConfig.sheetUrl && !stitchingConfig.sheetId) {
        const match = stitchingConfig.sheetUrl.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (match && match[1]) stitchingConfig.sheetId = match[1];
      }
      saveStitchingConfig(stitchingConfig);
      res.json({
        success: true,
        config: stitchingConfig
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3. Get Google Sheet Data Rows & Training Plan Records
  app.get("/api/stitching/sheet-data", (_req: Request, res: Response) => {
    try {
      const records = Array.isArray(dbCache.stitchingRecords) ? dbCache.stitchingRecords : [];
      res.json({
        success: true,
        records,
        totalRecords: records.length,
        lastSynced: stitchingConfig.lastSynced,
        syncStatus: stitchingConfig.syncStatus,
        config: stitchingConfig
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 4. Sync / Fetch from Google Sheet (via Google Sheets API v4 or CSV export)
  app.post("/api/stitching/sync-google-sheet", async (_req: Request, res: Response) => {
    try {
      stitchingConfig.syncStatus = "syncing";
      
      let sheetId = stitchingConfig.sheetId;
      if (!sheetId && stitchingConfig.sheetUrl) {
        const match = stitchingConfig.sheetUrl.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (match && match[1]) sheetId = match[1];
      }

      let fetchedRows: any[] | null = null;

      // Method 1: Google Sheets API v4 (if API Key is configured)
      if (sheetId && stitchingConfig.apiKey && stitchingConfig.apiKey.trim().length > 10) {
        try {
          const range = encodeURIComponent(stitchingConfig.sheetName || "Sheet1");
          const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${stitchingConfig.apiKey.trim()}`;
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 4000);
          const resp = await fetch(apiUrl, { signal: controller.signal });
          clearTimeout(timeout);
          if (resp.ok) {
            const json = await resp.json();
            if (json.values && Array.isArray(json.values)) {
              console.log(`[Google Sheets API v4] Retrieved ${json.values.length} rows from Google Sheets.`);
              fetchedRows = transformGoogleSheetDataToTrainingPlans(json.values);
            }
          }
        } catch (apiErr) {
          console.warn("[Google Sheets API v4] Fetch error:", apiErr);
        }
      }

      // Method 2: Public / Shared Sheet CSV Export
      if (!fetchedRows && sheetId) {
        try {
          const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&sheet=${encodeURIComponent(stitchingConfig.sheetName || 'Sheet1')}`;
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 3500);
          const resp = await fetch(csvUrl, { signal: controller.signal });
          clearTimeout(timeout);
          if (resp.ok) {
            const csvText = await resp.text();
            if (csvText && csvText.trim().length > 20) {
              const parsedMatrix = parseCSVRows(csvText);
              if (parsedMatrix.length > 1) {
                console.log(`[Google Sheet CSV] Successfully fetched ${parsedMatrix.length} rows from Google Sheet.`);
                fetchedRows = transformGoogleSheetDataToTrainingPlans(parsedMatrix);
              }
            }
          }
        } catch (csvErr) {
          console.warn("[Google Sheet CSV] Fetch skipped or timed out:", csvErr);
        }
      }

      // If fetched, update live database
      if (fetchedRows !== null) {
        const result = setSynchronizedStitchingData(fetchedRows);
        return res.json({
          success: true,
          count: result.count,
          records: result.records,
          lastSynced: result.lastSynced,
          syncStatus: result.syncStatus,
          recordsSyncedCount: result.count
        });
      }

      // Otherwise, return current clean database state
      const currentRecords = Array.isArray(dbCache.stitchingRecords) ? dbCache.stitchingRecords : [];
      stitchingConfig.lastSynced = new Date().toISOString();
      stitchingConfig.recordsSyncedCount = currentRecords.length;
      stitchingConfig.syncStatus = currentRecords.length > 0 ? "synced" : "connected";
      saveStitchingConfig(stitchingConfig);

      res.json({
        success: true,
        count: currentRecords.length,
        records: currentRecords,
        lastSynced: stitchingConfig.lastSynced,
        syncStatus: stitchingConfig.syncStatus,
        recordsSyncedCount: currentRecords.length,
        message: currentRecords.length === 0 ? "Google Sheet connected. Empty state ready for incoming training records." : "Synchronized successfully."
      });
    } catch (err: any) {
      stitchingConfig.syncStatus = "error";
      res.status(500).json({ success: false, error: err.message || "Sync failed" });
    }
  });

  // 5. Receive Direct Synchronized Rows (from client or Google Apps Script)
  app.post("/api/stitching/sync-rows", (req: Request, res: Response) => {
    try {
      const { rows } = req.body;
      const transformed = transformGoogleSheetDataToTrainingPlans(rows || []);
      const result = setSynchronizedStitchingData(transformed);
      res.json({
        success: true,
        count: result.count,
        records: result.records,
        lastSynced: result.lastSynced
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 6. Reset / Clear Stitching Records (to maintain clean empty state on demand)
  app.post("/api/stitching/clear-records", (_req: Request, res: Response) => {
    try {
      const result = setSynchronizedStitchingData([]);
      res.json({
        success: true,
        message: "Stitching training plan cleared to clean empty state.",
        count: 0
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 7. Webhook for Google Apps Script
  app.post("/api/stitching/webhook", (req: Request, res: Response) => {
    try {
      const incoming = req.body.values || req.body.records || req.body;
      const transformed = transformGoogleSheetDataToTrainingPlans(incoming);
      const result = setSynchronizedStitchingData(transformed);
      res.json({
        success: true,
        message: "Webhook processed and Stitching Training Plan synchronized",
        count: result.count,
        lastSynced: result.lastSynced
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 8. Stitching Audit Table - Manual Entry Persistent Store
  app.get("/api/stitching/audit-table", (_req: Request, res: Response) => {
    try {
      if (!dbCache.stitchingAuditTable) {
        dbCache.stitchingAuditTable = {
          auditDate: "",
          dateColumnHeader: "(Date)",
          rows: [
            { id: "row-1", lineNo: "", name: "", date: "", style: "", findings: "" },
            { id: "row-2", lineNo: "", name: "", date: "", style: "", findings: "" },
            { id: "row-3", lineNo: "", name: "", date: "", style: "", findings: "" }
          ],
          updatedAt: new Date().toISOString()
        };
        saveDatabase(dbCache);
      }
      res.json({
        success: true,
        data: dbCache.stitchingAuditTable
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/stitching/audit-table", (req: Request, res: Response) => {
    try {
      const { auditDate, dateColumnHeader, rows, updatedBy, senderClientId } = req.body;
      
      const updatedTable = {
        auditDate: auditDate !== undefined ? String(auditDate) : (dbCache.stitchingAuditTable?.auditDate || ""),
        dateColumnHeader: dateColumnHeader !== undefined ? String(dateColumnHeader) : (dbCache.stitchingAuditTable?.dateColumnHeader || "(Date)"),
        rows: Array.isArray(rows) ? rows : (dbCache.stitchingAuditTable?.rows || []),
        updatedAt: new Date().toISOString(),
        updatedBy: updatedBy || "Internal Auditor"
      };

      dbCache.stitchingAuditTable = updatedTable;
      saveDatabase(dbCache);

      // Broadcast to all connected clients
      broadcastToClients({
        type: "ENTITY_UPDATED",
        entity: "stitchingAuditTable",
        data: updatedTable,
        senderClientId: senderClientId || (req.headers["x-client-id"] as string),
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        data: updatedTable
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 9. Stitching Audit Folders - Stitching A, Stitching B, Stitching D, Stitching F
  const generateInitial22Rows = () => {
    const rows = [];
    for (let i = 1; i <= 22; i++) {
      rows.push({
        id: `row-A${i}`,
        lineNo: `A${i}`,
        name: "",
        date: "",
        style: "",
        findings: ""
      });
    }
    return rows;
  };

  const ENSURE_DEFAULT_STITCHING_FOLDERS = () => {
    const defaultTemplates = [
      { id: "stitching-a", name: "Stitching A", code: "STA" },
      { id: "stitching-b", name: "Stitching B", code: "STB" },
      { id: "stitching-d", name: "Stitching D", code: "STD" },
      { id: "stitching-f", name: "Stitching F", code: "STF" }
    ];

    if (!Array.isArray(dbCache.stitchingFolders) || dbCache.stitchingFolders.length === 0) {
      dbCache.stitchingFolders = defaultTemplates.map(t => ({
        id: t.id,
        name: t.name,
        code: t.code,
        auditDate: "Audit Date: September 24, 2026",
        dateColumnHeader: "(09/21~26/26)",
        rows: generateInitial22Rows(),
        updatedAt: new Date().toISOString()
      }));
    } else {
      // Ensure all 4 requested folders exist and have standard audit date / headers
      for (const t of defaultTemplates) {
        const existing = dbCache.stitchingFolders.find(f => f.id === t.id || f.name.toLowerCase() === t.name.toLowerCase());
        if (!existing) {
          dbCache.stitchingFolders.push({
            id: t.id,
            name: t.name,
            code: t.code,
            auditDate: "Audit Date: September 24, 2026",
            dateColumnHeader: "(09/21~26/26)",
            rows: generateInitial22Rows(),
            updatedAt: new Date().toISOString()
          });
        } else {
          if (!existing.auditDate) existing.auditDate = "Audit Date: September 24, 2026";
          if (!existing.dateColumnHeader || existing.dateColumnHeader === "(Date)") existing.dateColumnHeader = "(09/21~26/26)";
          if (!existing.rows || existing.rows.length <= 3) {
            existing.rows = generateInitial22Rows();
          }
        }
      }
    }

    if (!dbCache.activeStitchingFolderId) {
      dbCache.activeStitchingFolderId = "stitching-a";
    }
  };

  // Google Sheets Direct Bidirectional Sync Endpoints for Training Plan Module
  app.post("/api/stitching/google-sheet/sync-from-sheet", (req: Request, res: Response) => {
    try {
      ENSURE_DEFAULT_STITCHING_FOLDERS();
      const { folderId, auditDate, dateColumnHeader, rows, sheetId, sheetUrl, senderClientId } = req.body;

      if (!folderId) {
        return res.status(400).json({ success: false, error: "folderId is required" });
      }

      const folderIndex = dbCache.stitchingFolders!.findIndex(f => f.id === folderId);
      if (folderIndex === -1) {
        return res.status(404).json({ success: false, error: `Folder ${folderId} not found` });
      }

      const existingFolder = dbCache.stitchingFolders![folderIndex];
      const updatedFolder = {
        ...existingFolder,
        auditDate: auditDate !== undefined ? String(auditDate) : existingFolder.auditDate,
        dateColumnHeader: dateColumnHeader !== undefined ? String(dateColumnHeader) : existingFolder.dateColumnHeader,
        rows: Array.isArray(rows) && rows.length > 0 ? rows : existingFolder.rows,
        updatedAt: new Date().toISOString(),
        updatedBy: "Google Sheets Sync"
      };

      dbCache.stitchingFolders![folderIndex] = updatedFolder;
      dbCache.activeStitchingFolderId = folderId;

      if (sheetId) stitchingConfig.sheetId = sheetId;
      if (sheetUrl) stitchingConfig.sheetUrl = sheetUrl;
      stitchingConfig.lastSynced = new Date().toISOString();
      stitchingConfig.syncStatus = "synced";
      saveStitchingConfig(stitchingConfig);
      saveDatabase(dbCache);

      // Broadcast real-time update to all connected sessions
      broadcastToClients({
        type: "ENTITY_UPDATED",
        entity: "stitchingFolders",
        data: {
          folders: dbCache.stitchingFolders,
          activeFolderId: dbCache.activeStitchingFolderId,
          updatedFolder
        },
        senderClientId: senderClientId || (req.headers["x-client-id"] as string),
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        folder: updatedFolder,
        folders: dbCache.stitchingFolders,
        activeFolderId: dbCache.activeStitchingFolderId,
        lastSynced: stitchingConfig.lastSynced
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Live Read Tab from Google Sheet (Read-Only Google Sheet -> System)
  app.get("/api/stitching/google-sheet/read-live-tab", async (req: Request, res: Response) => {
    try {
      ENSURE_DEFAULT_STITCHING_FOLDERS();
      const sheetId = (req.query.sheetId as string) || stitchingConfig.sheetId;
      const tabName = (req.query.tabName as string) || "Stitching A";
      const folderId = (req.query.folderId as string) || "stitching-a";
      const fallbackPrefix = tabName.includes("B") ? "B" : tabName.includes("D") ? "D" : tabName.includes("F") ? "F" : "A";

      if (!sheetId) {
        return res.status(400).json({ success: false, error: "sheetId is required" });
      }

      // 1. Try reading via public CSV export
      let csvText: string | null = null;
      const candidateUrls = [
        `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&sheet=${encodeURIComponent(tabName)}`,
        `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`,
        `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`
      ];

      for (const url of candidateUrls) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 4000);
          const fetchRes = await fetch(url, { signal: controller.signal });
          clearTimeout(timeout);
          if (fetchRes.ok) {
            const text = await fetchRes.text();
            // Verify it's not a Google HTML login/error page
            if (text && !text.trim().startsWith("<!DOCTYPE") && !text.trim().startsWith("<html")) {
              csvText = text;
              break;
            }
          }
        } catch (fetchErr) {
          // Continue to next candidate
        }
      }

      if (csvText) {
        const matrix = parseCSVRows(csvText);
        const parsed = parseGoogleSheetMatrixToAuditFolder(matrix, fallbackPrefix);
        
        const folderIndex = dbCache.stitchingFolders!.findIndex(f => f.id === folderId);
        if (folderIndex !== -1) {
          dbCache.stitchingFolders![folderIndex] = {
            ...dbCache.stitchingFolders![folderIndex],
            auditDate: parsed.auditDate,
            dateColumnHeader: parsed.dateColumnHeader,
            rows: parsed.rows,
            updatedAt: new Date().toISOString(),
            updatedBy: "Google Sheet Direct Sync"
          };
        }
        
        stitchingConfig.lastSynced = new Date().toISOString();
        stitchingConfig.syncStatus = "synced";
        stitchingConfig.recordsSyncedCount = parsed.rows.length;
        saveStitchingConfig(stitchingConfig);
        saveDatabase(dbCache);

        broadcastToClients({
          type: "ENTITY_UPDATED",
          entity: "stitchingFolders",
          data: {
            folders: dbCache.stitchingFolders,
            activeFolderId: folderId,
            updatedFolder: folderIndex !== -1 ? dbCache.stitchingFolders![folderIndex] : null
          },
          timestamp: new Date().toISOString()
        });

        return res.json({
          success: true,
          auditDate: parsed.auditDate,
          dateColumnHeader: parsed.dateColumnHeader,
          rows: parsed.rows,
          count: parsed.rows.length,
          lastSynced: stitchingConfig.lastSynced,
          folder: folderIndex !== -1 ? dbCache.stitchingFolders![folderIndex] : null
        });
      }

      // If CSV export requires authentication, tell client explicitly
      return res.json({
        success: false,
        requiresAuth: true,
        message: "Google Sheet requires authentication. Sign in with Google to grant access to this spreadsheet."
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get("/api/stitching/google-sheet/config", (_req: Request, res: Response) => {
    res.json({
      success: true,
      config: stitchingConfig,
      activeFolderId: dbCache.activeStitchingFolderId || "stitching-a"
    });
  });

  app.get("/api/stitching/folders", (_req: Request, res: Response) => {
    try {
      ENSURE_DEFAULT_STITCHING_FOLDERS();
      res.json({
        success: true,
        folders: dbCache.stitchingFolders,
        activeFolderId: dbCache.activeStitchingFolderId || "stitching-a"
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/stitching/folders", (req: Request, res: Response) => {
    try {
      ENSURE_DEFAULT_STITCHING_FOLDERS();
      const { activeFolderId, newFolder, folders, senderClientId } = req.body;

      if (Array.isArray(folders)) {
        dbCache.stitchingFolders = folders;
      }

      if (newFolder && typeof newFolder.name === "string" && newFolder.name.trim()) {
        const folderName = newFolder.name.trim();
        const folderId = `stitching-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`;
        const createdFolder = {
          id: folderId,
          name: folderName,
          code: newFolder.code || folderName.replace(/[^A-Za-z0-9]/g, "").slice(0, 4).toUpperCase(),
          auditDate: "",
          dateColumnHeader: "(Date)",
          rows: [
            { id: "row-1", lineNo: "", name: "", date: "", style: "", findings: "" },
            { id: "row-2", lineNo: "", name: "", date: "", style: "", findings: "" },
            { id: "row-3", lineNo: "", name: "", date: "", style: "", findings: "" }
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        dbCache.stitchingFolders!.push(createdFolder);
        dbCache.activeStitchingFolderId = folderId;
      }

      if (activeFolderId && dbCache.stitchingFolders!.some(f => f.id === activeFolderId)) {
        dbCache.activeStitchingFolderId = activeFolderId;
      }

      saveDatabase(dbCache);

      broadcastToClients({
        type: "ENTITY_UPDATED",
        entity: "stitchingFolders",
        data: {
          folders: dbCache.stitchingFolders,
          activeFolderId: dbCache.activeStitchingFolderId
        },
        senderClientId: senderClientId || (req.headers["x-client-id"] as string),
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        folders: dbCache.stitchingFolders,
        activeFolderId: dbCache.activeStitchingFolderId
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put("/api/stitching/folders/:folderId", (req: Request, res: Response) => {
    try {
      ENSURE_DEFAULT_STITCHING_FOLDERS();
      const { folderId } = req.params;
      const { auditDate, dateColumnHeader, rows, name, code, updatedBy, senderClientId } = req.body;

      const folderIndex = dbCache.stitchingFolders!.findIndex(f => f.id === folderId);
      if (folderIndex === -1) {
        return res.status(404).json({ success: false, error: `Folder ${folderId} not found` });
      }

      const existingFolder = dbCache.stitchingFolders![folderIndex];
      const updatedFolder = {
        ...existingFolder,
        name: name !== undefined ? String(name).trim() : existingFolder.name,
        code: code !== undefined ? String(code).trim() : existingFolder.code,
        auditDate: auditDate !== undefined ? String(auditDate) : existingFolder.auditDate,
        dateColumnHeader: dateColumnHeader !== undefined ? String(dateColumnHeader) : existingFolder.dateColumnHeader,
        rows: Array.isArray(rows) ? rows : existingFolder.rows,
        updatedAt: new Date().toISOString(),
        updatedBy: updatedBy || "Internal Auditor"
      };

      dbCache.stitchingFolders![folderIndex] = updatedFolder;
      dbCache.activeStitchingFolderId = folderId;
      saveDatabase(dbCache);

      broadcastToClients({
        type: "ENTITY_UPDATED",
        entity: "stitchingFolders",
        data: {
          folders: dbCache.stitchingFolders,
          activeFolderId: dbCache.activeStitchingFolderId,
          updatedFolder
        },
        senderClientId: senderClientId || (req.headers["x-client-id"] as string),
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        folder: updatedFolder,
        folders: dbCache.stitchingFolders,
        activeFolderId: dbCache.activeStitchingFolderId
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete("/api/stitching/folders/:folderId", (req: Request, res: Response) => {
    try {
      ENSURE_DEFAULT_STITCHING_FOLDERS();
      const { folderId } = req.params;
      const { senderClientId } = req.body || {};

      if (dbCache.stitchingFolders!.length <= 1) {
        return res.status(400).json({ success: false, error: "Cannot delete the only remaining folder" });
      }

      dbCache.stitchingFolders = dbCache.stitchingFolders!.filter(f => f.id !== folderId);
      if (dbCache.activeStitchingFolderId === folderId) {
        dbCache.activeStitchingFolderId = dbCache.stitchingFolders![0].id;
      }

      saveDatabase(dbCache);

      broadcastToClients({
        type: "ENTITY_UPDATED",
        entity: "stitchingFolders",
        data: {
          folders: dbCache.stitchingFolders,
          activeFolderId: dbCache.activeStitchingFolderId
        },
        senderClientId: senderClientId || (req.headers["x-client-id"] as string),
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        folders: dbCache.stitchingFolders,
        activeFolderId: dbCache.activeStitchingFolderId
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // =========================================================================
  // DEDICATED COMPANY LOGO PERSISTENCE API
  // =========================================================================

  app.get("/api/company-logo", (_req: Request, res: Response) => {
    res.json({
      success: true,
      logo: dbCache.companyLogo || "/datian-logo.svg",
      isCustom: Boolean(dbCache.companyLogo && dbCache.companyLogo !== "/datian-logo.svg")
    });
  });

  app.post("/api/company-logo", (req: Request, res: Response) => {
    try {
      const { logoData, fileName, senderClientId } = req.body;
      if (!logoData || typeof logoData !== "string") {
        res.status(400).json({ success: false, error: "Logo image data is required." });
        return;
      }

      // If it is a base64 image data URL, persist raw binary file to disk as well
      let diskUrl = logoData;
      if (logoData.startsWith("data:image/")) {
        try {
          const matches = logoData.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
          if (matches) {
            const ext = matches[1].replace("svg+xml", "svg");
            const base64Data = matches[2];
            const buffer = Buffer.from(base64Data, "base64");
            const logoDiskName = `company_logo_${Date.now()}.${ext}`;
            const targetPath = path.join(UPLOADS_DIR, logoDiskName);
            fs.writeFileSync(targetPath, buffer);
            console.log(`[Logo Master] Successfully saved permanent logo file to disk: ${targetPath}`);
          }
        } catch (fileErr) {
          console.warn("[Logo Master] Could not save binary file, relying on data URL:", fileErr);
        }
      }

      // Persist permanently in database cache
      dbCache.companyLogo = logoData;
      saveDatabase(dbCache);

      // Broadcast to all connected clients immediately
      broadcastToClients({
        type: "ENTITY_UPDATED",
        entity: "companyLogo",
        data: logoData,
        senderClientId: senderClientId || (req.headers["x-client-id"] as string),
        timestamp: new Date().toISOString()
      });

      console.log(`[Logo Master] Permanent company logo updated and broadcasted.`);
      res.json({
        success: true,
        logo: dbCache.companyLogo,
        message: "Company logo permanently saved."
      });
    } catch (err: any) {
      console.error("[Logo Master Error]:", err);
      res.status(500).json({ success: false, error: err.message || "Failed to save company logo." });
    }
  });

  app.post("/api/company-logo/reset", (req: Request, res: Response) => {
    try {
      const senderClientId = req.body?.senderClientId || (req.headers["x-client-id"] as string);
      dbCache.companyLogo = "/datian-logo.svg";
      saveDatabase(dbCache);

      broadcastToClients({
        type: "ENTITY_UPDATED",
        entity: "companyLogo",
        data: "/datian-logo.svg",
        senderClientId,
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        logo: "/datian-logo.svg",
        message: "Reset to default DA TIAN company logo."
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // =========================================================================
  // DEDICATED EMPLOYEE PERSISTENCE API (Prevent Unintended Duplicates)
  // =========================================================================

  app.post("/api/employees/save", (req: Request, res: Response) => {
    try {
      const { employee, senderClientId } = req.body;
      if (!employee || (!employee.employeeNo && !employee.id)) {
        res.status(400).json({ success: false, error: "Employee Number is required." });
        return;
      }

      if (!Array.isArray(dbCache.employees)) {
        dbCache.employees = [];
      }

      const user = getRequestUser(req);

      // Strict Section Leader write enforcement
      if (user && isSectionLeader(user)) {
        const userSec = getUserAssignedSection(user);

        // 1. If editing existing employee, verify target employee belongs to Section Leader's section
        const empNoClean = normalizeEmpNo(employee.employeeNo);
        const empId = employee.id ? String(employee.id) : "";
        const targetExisting = dbCache.employees.find((e: any) => 
          (empId && String(e.id) === empId) || 
          (empNoClean && normalizeEmpNo(e.employeeNo) === empNoClean)
        );

        if (targetExisting) {
          const existingAccess = canAccessRecord(user, targetExisting);
          if (!existingAccess.allowed) {
            res.status(403).json({
              success: false,
              error: `Access Denied: You cannot modify employee records outside your assigned section [${userSec}].`
            });
            return;
          }
        }

        // 2. Prevent setting or transferring section to anything other than user's section
        const newSec = resolveRecordSection(employee);
        if (newSec && normalizeSection(newSec) !== normalizeSection(userSec)) {
          res.status(403).json({
            success: false,
            error: `Access Denied: Section Leaders can only register or assign employees to their own section [${userSec}]. Attempted section: [${newSec}].`
          });
          return;
        }

        // 3. Section Leaders cannot grant Admin roles
        if (employee.role === "Admin" || employee.role === "Super Admin") {
          res.status(403).json({
            success: false,
            error: "Access Denied: Section Leaders cannot promote users to Administrator."
          });
          return;
        }

        // Ensure record is strictly tagged with leader's assigned section
        employee.section = userSec;
        employee.assignedSection = userSec;
        if (user.department && !employee.department) {
          employee.department = user.department;
        }
      }

      const empNoClean = normalizeEmpNo(employee.employeeNo);
      const empId = employee.id ? String(employee.id) : "";

      // Find existing index by ID or Employee Number
      const existingIdx = dbCache.employees.findIndex((e: any) => 
        (empId && String(e.id) === empId) || 
        (empNoClean && normalizeEmpNo(e.employeeNo) === empNoClean)
      );

      let savedRecord: any;
      if (existingIdx >= 0) {
        // Update in-place to prevent unintended duplicates
        savedRecord = {
          ...dbCache.employees[existingIdx],
          ...employee,
          updatedAt: new Date().toISOString()
        };
        dbCache.employees[existingIdx] = savedRecord;
      } else {
        // Create new record
        savedRecord = {
          id: employee.id || `emp_${Date.now()}`,
          ...employee,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        dbCache.employees.push(savedRecord);
      }

      saveDatabase(dbCache);

      // Broadcast update
      broadcastToClients({
        type: "ENTITY_UPDATED",
        entity: "employees",
        data: dbCache.employees,
        senderClientId: senderClientId || (req.headers["x-client-id"] as string),
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        employee: savedRecord,
        totalCount: dbCache.employees.length
      });
    } catch (err: any) {
      console.error("[Employee Save Error]:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Batch Sync Endpoint - Sync multiple entities at once (e.g. on full client bootstrap/reconnect)
  app.post("/api/sync/batch", (req: Request, res: Response) => {
    try {
      const { updates, senderClientId } = req.body;
      if (!updates || typeof updates !== "object") {
        res.status(400).json({ success: false, error: "Updates object is required" });
        return;
      }

      Object.keys(updates).forEach((key) => {
        if (key in dbCache) {
          (dbCache as any)[key] = updates[key];
        }
      });
      saveDatabase(dbCache);

      // Broadcast batch update
      broadcastToClients({
        type: "BATCH_UPDATED",
        entity: "all",
        data: updates,
        senderClientId: senderClientId || (req.headers["x-client-id"] as string),
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        updatedKeys: Object.keys(updates),
        lastUpdated: dbCache.lastUpdated
      });
    } catch (err: any) {
      console.error("[Server Sync] Error in batch sync:", err);
      res.status(500).json({ success: false, error: err.message || "Batch sync failed" });
    }
  });

  // =========================================================================
  // CUSTOM STARTUP SCREEN MEDIA (IMAGE / VIDEO) API
  // =========================================================================

  // GET /api/startup/media - Retrieve current custom startup screen configuration
  app.get("/api/startup/media", (req: Request, res: Response) => {
    // Purge obsolete sample images if lingering in cache
    if (
      dbCache.startupMedia &&
      (dbCache.startupMedia.url?.includes("Your_paragraph_text") ||
        dbCache.startupMedia.fileName?.includes("Your paragraph text"))
    ) {
      dbCache.startupMedia = null;
      saveDatabase(dbCache);
    }

    res.json({
      success: true,
      media: dbCache.startupMedia || null,
      startupMedia: dbCache.startupMedia || null
    });
  });

  // POST /api/startup/media - Upload or configure custom startup screen image/video
  app.post("/api/startup/media", (req: Request, res: Response) => {
    try {
      const { 
        type, 
        dataUrl, 
        fileName, 
        fileSize, 
        mimeType, 
        duration, 
        soundEnabled, 
        fitMode, 
        title, 
        subtitle, 
        updatedBy, 
        reset, 
        senderClientId 
      } = req.body;

      if (reset || type === 'default') {
        dbCache.startupMedia = null;
        saveDatabase(dbCache);

        broadcastToClients({
          type: "ENTITY_UPDATED",
          entity: "startupMedia",
          data: null,
          senderClientId: senderClientId || (req.headers["x-client-id"] as string),
          timestamp: new Date().toISOString()
        });

        res.json({
          success: true,
          action: "reset",
          startupMedia: null
        });
        return;
      }

      let finalUrl = dataUrl;

      // If a binary base64 dataUrl was uploaded, save it to persistent disk in UPLOADS_DIR
      if (dataUrl && dataUrl.startsWith("data:")) {
        try {
          const extension = mimeType?.split("/")[1]?.split("+")[0] || (type === 'video' ? 'mp4' : 'png');
          const cleanName = (fileName || `startup_${Date.now()}.${extension}`).replace(/[^a-zA-Z0-9.-]/g, "_");
          const diskFileName = `startup_${Date.now()}_${cleanName}`;
          const diskFilePath = path.join(UPLOADS_DIR, diskFileName);

          const base64Data = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
          const buffer = Buffer.from(base64Data, "base64");
          fs.writeFileSync(diskFilePath, buffer);

          finalUrl = `/api/startup/media/file/${encodeURIComponent(diskFileName)}`;
        } catch (diskErr) {
          console.warn("[Startup Media] Failed to save to disk, retaining dataUrl:", diskErr);
          finalUrl = dataUrl;
        }
      }

      const mediaConfig = {
        type: (type === 'video' ? 'video' : type === 'image' ? 'image' : 'default') as 'default' | 'image' | 'video',
        url: finalUrl,
        fileName: fileName || (type === 'video' ? 'startup-video.mp4' : 'startup-image.png'),
        fileSize: fileSize || 'Custom Media',
        mimeType: mimeType || (type === 'video' ? 'video/mp4' : 'image/png'),
        duration: typeof duration === 'number' ? duration : 5,
        soundEnabled: Boolean(soundEnabled),
        fitMode: (fitMode === 'cover' ? 'cover' : 'contain') as 'contain' | 'cover',
        title: title || '',
        subtitle: subtitle || '',
        updatedAt: new Date().toISOString(),
        updatedBy: updatedBy || 'System Administrator'
      };

      dbCache.startupMedia = mediaConfig;
      saveDatabase(dbCache);

      // Broadcast to all connected clients immediately
      broadcastToClients({
        type: "ENTITY_UPDATED",
        entity: "startupMedia",
        data: mediaConfig,
        senderClientId: senderClientId || (req.headers["x-client-id"] as string),
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        action: "saved",
        media: mediaConfig,
        startupMedia: mediaConfig
      });
    } catch (err: any) {
      console.error("[Startup Media] Save failed:", err);
      res.status(500).json({ success: false, error: err.message || "Failed to save startup media" });
    }
  });

  // GET /api/startup/media/file/:fileName - Stream uploaded startup screen media
  app.get("/api/startup/media/file/:fileName", (req: Request, res: Response) => {
    try {
      const fileName = path.basename(req.params.fileName);
      const filePath = path.join(UPLOADS_DIR, fileName);

      if (!fs.existsSync(filePath)) {
        res.status(404).json({ success: false, error: "Startup media file not found" });
        return;
      }

      // Automatically handles range requests and mime types
      res.sendFile(filePath);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || "Failed to read startup media" });
    }
  });

  // =========================================================================
  // APPEARANCE & THEME PERSONALIZATION API
  // =========================================================================

  const DEFAULT_APPEARANCE_SERVER = {
    fontSize: 100,
    themeColor: "#205b9f",
    customColors: ["#205b9f", "#f59e0b", "#10b981", "#e11d48", "#8b5cf6", "#06b6d4", "#f97316", "#6366f1"],
    backgroundImage: null,
    backgroundOpacity: 45,
    backgroundBlur: 2,
    panelTransparency: 20
  };

  // GET /api/settings/appearance - Retrieve saved appearance settings
  app.get("/api/settings/appearance", (_req: Request, res: Response) => {
    try {
      const appearance = (dbCache.settings && dbCache.settings.appearance) 
        ? dbCache.settings.appearance 
        : DEFAULT_APPEARANCE_SERVER;
      res.json({ success: true, appearance });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/settings/appearance - Save and persist appearance settings
  app.post("/api/settings/appearance", (req: Request, res: Response) => {
    try {
      const {
        fontSize,
        themeColor,
        customColors,
        backgroundImage,
        backgroundOpacity,
        backgroundBlur,
        panelTransparency,
        updatedBy,
        senderClientId
      } = req.body;

      if (!dbCache.settings) {
        dbCache.settings = {};
      }

      let finalBgImage = backgroundImage ?? null;

      // If user uploaded a base64 background image, write it to persistent storage disk
      if (finalBgImage && typeof finalBgImage === "string" && finalBgImage.startsWith("data:")) {
        try {
          const mimeMatch = finalBgImage.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,/);
          const ext = mimeMatch ? (mimeMatch[1] === 'svg+xml' ? 'svg' : mimeMatch[1]) : 'png';
          const diskFileName = `background_${Date.now()}.${ext}`;
          const diskFilePath = path.join(UPLOADS_DIR, diskFileName);

          const base64Data = finalBgImage.includes(",") ? finalBgImage.split(",")[1] : finalBgImage;
          fs.writeFileSync(diskFilePath, Buffer.from(base64Data, "base64"));
          finalBgImage = `/api/settings/background/file/${encodeURIComponent(diskFileName)}`;
        } catch (diskErr) {
          console.warn("[Background Image Disk Save Warning]:", diskErr);
        }
      }

      const prev = dbCache.settings.appearance || DEFAULT_APPEARANCE_SERVER;
      const updatedAppearance = {
        fontSize: typeof fontSize === "number" ? Math.max(75, Math.min(160, fontSize)) : (prev.fontSize || 100),
        themeColor: typeof themeColor === "string" && themeColor.trim() ? themeColor.trim() : (prev.themeColor || "#205b9f"),
        customColors: Array.isArray(customColors) ? customColors : (prev.customColors || DEFAULT_APPEARANCE_SERVER.customColors),
        backgroundImage: finalBgImage,
        backgroundOpacity: typeof backgroundOpacity === "number" ? Math.max(0, Math.min(100, backgroundOpacity)) : (prev.backgroundOpacity ?? 45),
        backgroundBlur: typeof backgroundBlur === "number" ? Math.max(0, Math.min(25, backgroundBlur)) : (prev.backgroundBlur ?? 2),
        panelTransparency: typeof panelTransparency === "number" ? Math.max(0, Math.min(80, panelTransparency)) : (prev.panelTransparency ?? 20),
        updatedAt: new Date().toISOString(),
        updatedBy: updatedBy || "User"
      };

      dbCache.settings.appearance = updatedAppearance;
      saveDatabase(dbCache);

      // Broadcast real-time update to all connected clients
      broadcastToClients({
        type: "ENTITY_UPDATED",
        entity: "appearanceSettings",
        data: updatedAppearance,
        senderClientId: senderClientId || (req.headers["x-client-id"] as string),
        timestamp: new Date().toISOString()
      });

      res.json({ success: true, appearance: updatedAppearance });
    } catch (err: any) {
      console.error("[Appearance Settings Save Error]:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/settings/appearance/reset - Reset appearance back to factory defaults
  app.post("/api/settings/appearance/reset", (req: Request, res: Response) => {
    try {
      const { updatedBy, senderClientId } = req.body;
      if (!dbCache.settings) dbCache.settings = {};

      const resetAppearance = {
        ...DEFAULT_APPEARANCE_SERVER,
        updatedAt: new Date().toISOString(),
        updatedBy: updatedBy || "User"
      };

      dbCache.settings.appearance = resetAppearance;
      saveDatabase(dbCache);

      broadcastToClients({
        type: "ENTITY_UPDATED",
        entity: "appearanceSettings",
        data: resetAppearance,
        senderClientId: senderClientId || (req.headers["x-client-id"] as string),
        timestamp: new Date().toISOString()
      });

      res.json({ success: true, appearance: resetAppearance });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET /api/settings/background/file/:fileName - Stream custom background image
  app.get("/api/settings/background/file/:fileName", (req: Request, res: Response) => {
    try {
      const fileName = path.basename(req.params.fileName);
      const filePath = path.join(UPLOADS_DIR, fileName);

      if (!fs.existsSync(filePath)) {
        res.status(404).json({ success: false, error: "Background wallpaper file not found" });
        return;
      }
      res.sendFile(filePath);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });


  // =========================================================================
  // AUDIT LOGGING API
  // =========================================================================

  app.get("/api/audit/logs", (req: Request, res: Response) => {
    res.json({
      success: true,
      logs: dbCache.auditLogs || []
    });
  });

  app.post("/api/audit/log", (req: Request, res: Response) => {
    try {
      const { user, role, action, module, details, recordId, senderClientId } = req.body;
      const logItem = {
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        user: user || "Corporate User",
        role: role || "Staff",
        action: action || "UPDATE",
        module: module || "System",
        details: details || "Action executed",
        recordId: recordId || "",
        timestamp: new Date().toISOString()
      };

      if (!Array.isArray(dbCache.auditLogs)) {
        dbCache.auditLogs = [];
      }
      dbCache.auditLogs.unshift(logItem);
      // Keep last 1000 audit logs
      if (dbCache.auditLogs.length > 1000) {
        dbCache.auditLogs = dbCache.auditLogs.slice(0, 1000);
      }
      saveDatabase(dbCache);

      // Broadcast audit event
      broadcastToClients({
        type: "AUDIT_LOGGED",
        entity: "auditLogs",
        data: dbCache.auditLogs,
        senderClientId: senderClientId || (req.headers["x-client-id"] as string),
        timestamp: new Date().toISOString()
      });

      res.json({ success: true, log: logItem });
    } catch (err: any) {
      console.error("[Audit Log Error]:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // =========================================================================
  // SPREADSHEETS REAL-TIME API
  // =========================================================================

  app.get("/api/spreadsheets/:key", (req: Request, res: Response) => {
    const key = req.params.key;
    const data = dbCache.spreadsheets?.[key] || null;
    res.json({ success: true, key, data });
  });

  app.post("/api/spreadsheets/:key", (req: Request, res: Response) => {
    try {
      const key = req.params.key;
      const { data, senderClientId } = req.body;

      if (!dbCache.spreadsheets) dbCache.spreadsheets = {};
      dbCache.spreadsheets[key] = data;
      saveDatabase(dbCache);

      broadcastToClients({
        type: "SPREADSHEET_UPDATED",
        entity: `spreadsheet_${key}`,
        data: { key, spreadsheet: data },
        senderClientId: senderClientId || (req.headers["x-client-id"] as string),
        timestamp: new Date().toISOString()
      });

      res.json({ success: true, key, lastUpdated: dbCache.lastUpdated });
    } catch (err: any) {
      console.error("[Spreadsheet Sync Error]:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // =========================================================================
  // FILE STORAGE & MULTI-PC BINARY SHARING API
  // =========================================================================

  // Upload file (PDF, Excel, Images, Word, Video, ZIP, Audio, etc.)
  app.post("/api/files/upload", (req: Request, res: Response) => {
    try {
      const { id, fileName, fileType, fileSize, mimeType, dataUrl, folderId, category, description, uploadedBy, senderClientId } = req.body;

      if (!fileName || !dataUrl) {
        res.status(400).json({ success: false, error: "fileName and dataUrl are required" });
        return;
      }

      const fileId = id || `file_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const safeFileName = `${fileId}_${fileName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const diskFilePath = path.join(UPLOADS_DIR, safeFileName);

      // Extract binary buffer from data URL and save to server disk
      let base64Data = dataUrl;
      if (dataUrl.includes(",")) {
        base64Data = dataUrl.split(",")[1];
      }
      const buffer = Buffer.from(base64Data, "base64");
      fs.writeFileSync(diskFilePath, buffer);

      const user = getRequestUser(req);
      const assignedSec = user && isSectionLeader(user) ? getUserAssignedSection(user) : (req.body.section || req.body.assignedSection);
      const assignedDept = user && user.department ? user.department : req.body.department;

      const fileRecord = {
        id: fileId,
        fileName,
        fileType: fileType || "Document",
        fileSize: fileSize || `${(buffer.length / 1024).toFixed(1)} KB`,
        mimeType: mimeType || "application/octet-stream",
        diskPath: diskFilePath,
        dataUrl, // Retain dataUrl for instant memory preview
        uploadedAt: new Date().toISOString(),
        uploadedBy: uploadedBy || (user ? user.name : "Corporate User"),
        folderId: folderId || "folder-2",
        category: category || "General",
        description: description || "",
        section: assignedSec,
        assignedSection: assignedSec,
        department: assignedDept
      };

      // Add to server database
      if (!dbCache.files) dbCache.files = {};
      dbCache.files[fileId] = fileRecord;

      // Also ensure document listing in dbCache.documents is updated
      const existingDocIdx = dbCache.documents.findIndex((d: any) => d.id === fileId);
      const docItem = {
        id: fileId,
        name: fileName,
        category: category || "General",
        version: "v1.0",
        uploadDate: new Date().toISOString().split("T")[0],
        fileSize: fileRecord.fileSize,
        type: mimeType?.includes("pdf") ? "PDF" : mimeType?.includes("sheet") || fileName.endsWith(".xlsx") ? "XLSX" : "DOCX",
        folderId: folderId || "folder-2",
        fileUrl: dataUrl,
        downloadUrl: `/api/files/download/${fileId}`,
        previewUrl: `/api/files/preview/${fileId}`,
        section: assignedSec,
        assignedSection: assignedSec,
        department: assignedDept
      };

      if (existingDocIdx >= 0) {
        dbCache.documents[existingDocIdx] = docItem;
      } else {
        dbCache.documents.unshift(docItem);
      }

      saveDatabase(dbCache);

      // Broadcast file upload to all other connected PCs
      broadcastToClients({
        type: "FILE_UPLOADED",
        entity: "documents",
        data: { fileRecord, docItem },
        senderClientId: senderClientId || (req.headers["x-client-id"] as string),
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        file: fileRecord,
        downloadUrl: `/api/files/download/${fileId}`,
        previewUrl: `/api/files/preview/${fileId}`
      });
    } catch (err: any) {
      console.error("[Server File Upload] Error saving file:", err);
      res.status(500).json({ success: false, error: err.message || "File upload failed" });
    }
  });

  // Download stored file
  app.get("/api/files/download/:id", (req: Request, res: Response) => {
    try {
      const fileId = req.params.id;
      const fileRecord = dbCache.files?.[fileId];

      if (!fileRecord) {
        res.status(404).send("File not found on server");
        return;
      }

      const user = getRequestUser(req);
      if (user && isSectionLeader(user)) {
        const access = canAccessRecord(user, fileRecord);
        if (!access.allowed) {
          res.status(403).send(access.reason || `Access Denied: Section Leaders can only access files in their assigned section [${getUserAssignedSection(user)}].`);
          return;
        }
      }

      if (fileRecord.diskPath && fs.existsSync(fileRecord.diskPath)) {
        res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(fileRecord.fileName)}"`);
        res.setHeader("Content-Type", fileRecord.mimeType || "application/octet-stream");
        fs.createReadStream(fileRecord.diskPath).pipe(res);
        return;
      }

      if (fileRecord.dataUrl) {
        let base64Data = fileRecord.dataUrl;
        if (fileRecord.dataUrl.includes(",")) {
          base64Data = fileRecord.dataUrl.split(",")[1];
        }
        const buffer = Buffer.from(base64Data, "base64");
        res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(fileRecord.fileName)}"`);
        res.setHeader("Content-Type", fileRecord.mimeType || "application/octet-stream");
        res.send(buffer);
        return;
      }

      res.status(404).send("File payload missing");
    } catch (err: any) {
      console.error("[Server File Download] Error:", err);
      res.status(500).send("Error downloading file");
    }
  });

  // Preview stored file directly in browser
  app.get("/api/files/preview/:id", (req: Request, res: Response) => {
    try {
      const fileId = req.params.id;
      const fileRecord = dbCache.files?.[fileId];

      if (!fileRecord) {
        res.status(404).send("File not found on server");
        return;
      }

      const user = getRequestUser(req);
      if (user && isSectionLeader(user)) {
        const access = canAccessRecord(user, fileRecord);
        if (!access.allowed) {
          res.status(403).send(access.reason || `Access Denied: Section Leaders can only preview files in their assigned section [${getUserAssignedSection(user)}].`);
          return;
        }
      }

      if (fileRecord.diskPath && fs.existsSync(fileRecord.diskPath)) {
        res.setHeader("Content-Type", fileRecord.mimeType || "application/octet-stream");
        res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(fileRecord.fileName)}"`);
        fs.createReadStream(fileRecord.diskPath).pipe(res);
        return;
      }

      if (fileRecord.dataUrl) {
        let base64Data = fileRecord.dataUrl;
        if (fileRecord.dataUrl.includes(",")) {
          base64Data = fileRecord.dataUrl.split(",")[1];
        }
        const buffer = Buffer.from(base64Data, "base64");
        res.setHeader("Content-Type", fileRecord.mimeType || "application/octet-stream");
        res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(fileRecord.fileName)}"`);
        res.send(buffer);
        return;
      }

      res.status(404).send("File content not available");
    } catch (err: any) {
      console.error("[Server File Preview] Error:", err);
      res.status(500).send("Error previewing file");
    }
  });

  // Delete file from storage and database
  app.delete("/api/files/:id", (req: Request, res: Response) => {
    try {
      const fileId = req.params.id;
      const senderClientId = (req.query.senderClientId as string) || (req.headers["x-client-id"] as string);

      if (dbCache.files && dbCache.files[fileId]) {
        const record = dbCache.files[fileId];
        if (record.diskPath && fs.existsSync(record.diskPath)) {
          try { fs.unlinkSync(record.diskPath); } catch {}
        }
        delete dbCache.files[fileId];
      }

      dbCache.documents = (dbCache.documents || []).filter((d: any) => d.id !== fileId);
      saveDatabase(dbCache);

      // Broadcast file deletion
      broadcastToClients({
        type: "FILE_DELETED",
        entity: "documents",
        data: { fileId },
        senderClientId,
        timestamp: new Date().toISOString()
      });

      res.json({ success: true, fileId });
    } catch (err: any) {
      console.error("[Server File Delete] Error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // List all stored files
  app.get("/api/files/list", (req: Request, res: Response) => {
    res.json({
      success: true,
      files: Object.values(dbCache.files || {}),
      documents: dbCache.documents || []
    });
  });

  // =========================================================================
  // STRUCTURED DATA MANAGEMENT & AUTO-SAVE API (JSON, CSV, Raw Data, Docs)
  // =========================================================================

  // List all data records
  app.get("/api/data-records", (req: Request, res: Response) => {
    res.json({
      success: true,
      records: dbCache.dataRecords || []
    });
  });

  // Create or Auto-Save / Update data record
  app.post("/api/data-records", (req: Request, res: Response) => {
    try {
      const { id, title, format, content, category, folderId, tags, createdBy, senderClientId } = req.body;

      if (!title || content === undefined) {
        res.status(400).json({ success: false, error: "Title and content are required" });
        return;
      }

      if (!Array.isArray(dbCache.dataRecords)) {
        dbCache.dataRecords = [];
      }

      const recordId = id || `drec_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const now = new Date().toISOString();
      const contentStr = String(content);
      const byteSize = Buffer.byteLength(contentStr, "utf8");
      
      let sizeStr = `${byteSize} B`;
      if (byteSize >= 1024 * 1024) {
        sizeStr = `${(byteSize / (1024 * 1024)).toFixed(1)} MB`;
      } else if (byteSize >= 1024) {
        sizeStr = `${(byteSize / 1024).toFixed(1)} KB`;
      }

      let recordCount = 1;
      if (format === 'csv') {
        const lines = contentStr.trim().split('\n').filter(l => l.trim());
        recordCount = Math.max(lines.length - 1, 0);
      } else if (format === 'json') {
        try {
          const parsed = JSON.parse(contentStr);
          if (Array.isArray(parsed)) recordCount = parsed.length;
          else if (typeof parsed === 'object' && parsed !== null) recordCount = Object.keys(parsed).length;
        } catch {
          recordCount = 1;
        }
      }

      const existingIndex = dbCache.dataRecords.findIndex((r: any) => r.id === recordId);
      
      const recordItem = {
        id: recordId,
        title: title.trim(),
        format: format || 'json',
        content: contentStr,
        category: category || 'General Operations',
        folderId: folderId || undefined,
        tags: Array.isArray(tags) ? tags : [],
        size: sizeStr,
        recordCount,
        createdAt: existingIndex >= 0 ? dbCache.dataRecords[existingIndex].createdAt : now.split('T')[0],
        updatedAt: now,
        createdBy: createdBy || (existingIndex >= 0 ? dbCache.dataRecords[existingIndex].createdBy : 'System User'),
        autoSavedAt: now
      };

      if (existingIndex >= 0) {
        dbCache.dataRecords[existingIndex] = recordItem;
      } else {
        dbCache.dataRecords.unshift(recordItem);
      }

      saveDatabase(dbCache);

      // Broadcast to other connected clients in real-time
      broadcastToClients({
        type: "DATA_RECORD_SAVED",
        entity: "dataRecords",
        data: recordItem,
        senderClientId: senderClientId || (req.headers["x-client-id"] as string),
        timestamp: now
      });

      res.json({
        success: true,
        record: recordItem,
        autoSavedAt: now
      });
    } catch (err: any) {
      console.error("[Data Record Save Error]:", err);
      res.status(500).json({ success: false, error: err.message || "Failed to save data record" });
    }
  });

  // Export / Download raw data record
  app.get("/api/data-records/:id/export", (req: Request, res: Response) => {
    try {
      const recordId = req.params.id;
      const record = (dbCache.dataRecords || []).find((r: any) => r.id === recordId);
      if (!record) {
        res.status(404).send("Data record not found");
        return;
      }

      const ext = record.format === 'json' ? '.json' : record.format === 'csv' ? '.csv' : '.txt';
      const mime = record.format === 'json' ? 'application/json' : record.format === 'csv' ? 'text/csv' : 'text/plain';
      const safeFilename = `${record.title.replace(/[^a-zA-Z0-9_-]/g, '_')}${ext}`;

      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(safeFilename)}"`);
      res.setHeader("Content-Type", `${mime}; charset=utf-8`);
      res.send(record.content);
    } catch (err: any) {
      console.error("[Data Record Export Error]:", err);
      res.status(500).send("Error exporting data record");
    }
  });

  // Delete data record manually (Permanent delete after confirmation)
  app.delete("/api/data-records/:id", (req: Request, res: Response) => {
    try {
      const recordId = req.params.id;
      const senderClientId = (req.query.senderClientId as string) || (req.headers["x-client-id"] as string);

      if (!Array.isArray(dbCache.dataRecords)) {
        dbCache.dataRecords = [];
      }

      const prevLength = dbCache.dataRecords.length;
      dbCache.dataRecords = dbCache.dataRecords.filter((r: any) => r.id !== recordId);
      saveDatabase(dbCache);

      // Broadcast deletion
      broadcastToClients({
        type: "DATA_RECORD_DELETED",
        entity: "dataRecords",
        data: { recordId },
        senderClientId,
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        recordId,
        deleted: prevLength !== dbCache.dataRecords.length
      });
    } catch (err: any) {
      console.error("[Data Record Delete Error]:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // =========================================================================
  // SYSTEM BACKUP ENDPOINTS (Full Data & File Snapshot)
  // Creates a non-destructive copy/backup of all files, datasets, and records
  // =========================================================================

  // POST /api/system/backup - Trigger a complete system backup
  app.post("/api/system/backup", (req: Request, res: Response) => {
    try {
      const now = new Date();
      const timestampStr = now.toISOString().replace(/[:.]/g, "-");
      const backupId = `BKP-${Date.now()}`;
      const backupFilename = `CSR_HUB_BACKUP_${timestampStr}.json`;
      const backupFilePath = path.join(BACKUPS_DIR, backupFilename);

      // Gather full system snapshot
      const snapshot = {
        backupId,
        backupFilename,
        createdAt: now.toISOString(),
        createdBy: req.body.createdBy || "System Administrator",
        reason: req.body.reason || "Manual User Backup",
        stats: {
          employeesCount: Array.isArray(dbCache.employees) ? dbCache.employees.length : 0,
          filesCount: Object.keys(dbCache.files || {}).length,
          dataRecordsCount: Array.isArray(dbCache.dataRecords) ? dbCache.dataRecords.length : 0,
          leadershipRecordsCount: Array.isArray(dbCache.leadershipAttendance) ? dbCache.leadershipAttendance.length : 0,
          foldersCount: Array.isArray(dbCache.folders) ? dbCache.folders.length : 0
        },
        database: dbCache,
        clientData: req.body.clientSnapshot || null
      };

      const serialized = JSON.stringify(snapshot, null, 2);
      fs.writeFileSync(backupFilePath, serialized, "utf-8");

      const stats = fs.statSync(backupFilePath);
      const sizeBytes = stats.size;
      const sizeFormatted = sizeBytes > 1024 * 1024 
        ? `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`
        : `${(sizeBytes / 1024).toFixed(2)} KB`;

      res.json({
        success: true,
        message: "Backup completed ✓",
        backup: {
          id: backupId,
          fileName: backupFilename,
          size: sizeFormatted,
          sizeBytes,
          createdAt: now.toISOString(),
          stats: snapshot.stats,
          downloadUrl: `/api/system/backups/${encodeURIComponent(backupFilename)}/download`
        }
      });
    } catch (err: any) {
      console.error("[System Backup Error]:", err);
      res.status(500).json({
        success: false,
        error: `Backup failed: ${err.message || "Unknown error"}`
      });
    }
  });

  // GET /api/system/backups - List all available backups
  app.get("/api/system/backups", (req: Request, res: Response) => {
    try {
      if (!fs.existsSync(BACKUPS_DIR)) {
        return res.json({ success: true, backups: [] });
      }

      const files = fs.readdirSync(BACKUPS_DIR).filter(f => f.endsWith(".json"));
      const backups = files.map(file => {
        const filePath = path.join(BACKUPS_DIR, file);
        const stat = fs.statSync(filePath);
        let summary: any = null;
        try {
          const raw = fs.readFileSync(filePath, "utf-8");
          const parsed = JSON.parse(raw);
          summary = {
            id: parsed.backupId || file,
            createdAt: parsed.createdAt || stat.mtime.toISOString(),
            stats: parsed.stats || {},
            createdBy: parsed.createdBy || "System User"
          };
        } catch {
          summary = {
            id: file,
            createdAt: stat.mtime.toISOString(),
            stats: {},
            createdBy: "System User"
          };
        }

        const sizeBytes = stat.size;
        const sizeFormatted = sizeBytes > 1024 * 1024 
          ? `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`
          : `${(sizeBytes / 1024).toFixed(2)} KB`;

        return {
          id: summary.id,
          fileName: file,
          size: sizeFormatted,
          sizeBytes,
          createdAt: summary.createdAt,
          stats: summary.stats,
          createdBy: summary.createdBy,
          downloadUrl: `/api/system/backups/${encodeURIComponent(file)}/download`
        };
      }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      res.json({ success: true, backups });
    } catch (err: any) {
      console.error("[System Backups List Error]:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET /api/system/backups/:fileName/download - Download a backup snapshot
  app.get("/api/system/backups/:fileName/download", (req: Request, res: Response) => {
    try {
      const fileName = path.basename(req.params.fileName);
      const filePath = path.join(BACKUPS_DIR, fileName);

      if (!fs.existsSync(filePath)) {
        return res.status(404).send("Backup file not found");
      }

      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(fileName)}"`);
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      const readStream = fs.createReadStream(filePath);
      readStream.pipe(res);
    } catch (err: any) {
      console.error("[System Backup Download Error]:", err);
      res.status(500).send("Error downloading backup");
    }
  });

  // POST /api/system/restore - Restore entire system state from a backup snapshot
  app.post("/api/system/restore", (req: Request, res: Response) => {
    try {
      const { fileName, backupData, senderClientId } = req.body;
      let targetSnapshot: any = null;

      if (backupData && typeof backupData === "object") {
        targetSnapshot = backupData;
      } else if (fileName) {
        const cleanName = path.basename(fileName);
        const filePath = path.join(BACKUPS_DIR, cleanName);
        if (!fs.existsSync(filePath)) {
          return res.status(404).json({ success: false, error: `Backup file ${cleanName} not found` });
        }
        const fileContent = fs.readFileSync(filePath, "utf-8");
        targetSnapshot = JSON.parse(fileContent);
      } else {
        return res.status(400).json({ success: false, error: "Either fileName or backupData is required to restore" });
      }

      // 1. SAFETY FIRST: Take an automatic pre-restore safety snapshot before altering anything
      triggerAutoSnapshot(dbCache, "Pre-Restore Safety Checkpoint");

      // 2. Extract database payload (supports full snapshot format or raw database object)
      const restoredDb: any = targetSnapshot.database || targetSnapshot;

      if (!restoredDb || typeof restoredDb !== "object") {
        return res.status(400).json({ success: false, error: "Invalid backup format: No database content found" });
      }

      // 3. Selectively restore all database tables / entities to guarantee data integrity
      const allowedKeys: (keyof ServerDatabase)[] = [
        "employees", "logs", "courses", "records", "documents", "folders",
        "stitchingRecords", "departmentItems", "departmentFolders",
        "departmentTrainingRecords", "departmentCustomFields", "departmentTrainingFiles",
        "notifications", "leadershipAttendance", "leadershipFiles", "leadershipSchedules",
        "chatChannels", "chatDMs", "chatMessages", "announcements",
        "antiBriberyWorkbook", "spreadsheets", "auditLogs", "users",
        "companyLogo", "startupMedia", "settings", "files", "dataRecords"
      ];

      let restoredKeysCount = 0;
      allowedKeys.forEach(key => {
        if (key in restoredDb && restoredDb[key] !== undefined) {
          (dbCache as any)[key] = restoredDb[key];
          restoredKeysCount++;
        }
      });

      dbCache.lastUpdated = new Date().toISOString();

      // 4. Save to disk and mirror backup safely
      saveDatabase(dbCache);

      // 5. Broadcast SYSTEM_RESTORED to all active SSE clients
      broadcastToClients({
        type: "SYSTEM_RESTORED",
        entity: "all",
        data: dbCache,
        senderClientId: senderClientId || (req.headers["x-client-id"] as string),
        timestamp: new Date().toISOString()
      });

      const stats = {
        employeesCount: Array.isArray(dbCache.employees) ? dbCache.employees.length : 0,
        filesCount: Object.keys(dbCache.files || {}).length,
        dataRecordsCount: Array.isArray(dbCache.dataRecords) ? dbCache.dataRecords.length : 0,
        leadershipRecordsCount: Array.isArray(dbCache.leadershipAttendance) ? dbCache.leadershipAttendance.length : 0,
        foldersCount: Array.isArray(dbCache.folders) ? dbCache.folders.length : 0
      };

      console.log(`[System Restore] System restored successfully. Restored ${restoredKeysCount} entities. Employees: ${stats.employeesCount}`);

      res.json({
        success: true,
        message: "System successfully restored from backup snapshot ✓",
        restoredFrom: fileName || targetSnapshot.backupFilename || "Uploaded JSON",
        stats,
        data: dbCache
      });
    } catch (err: any) {
      console.error("[System Restore Error]:", err);
      res.status(500).json({ success: false, error: `Restore failed: ${err.message || "Unknown error"}` });
    }
  });

  // POST /api/system/backup/upload - Upload a JSON backup file to server archives
  app.post("/api/system/backup/upload", (req: Request, res: Response) => {
    try {
      const { backupJson, autoRestore, senderClientId } = req.body;
      if (!backupJson) {
        return res.status(400).json({ success: false, error: "backupJson content is required" });
      }

      let parsed: any;
      try {
        parsed = typeof backupJson === "string" ? JSON.parse(backupJson) : backupJson;
      } catch (pErr: any) {
        return res.status(400).json({ success: false, error: "Invalid JSON format: " + pErr.message });
      }

      if (!fs.existsSync(BACKUPS_DIR)) {
        fs.mkdirSync(BACKUPS_DIR, { recursive: true });
      }

      const timestampStr = new Date().toISOString().replace(/[:.]/g, "-");
      const savedFileName = `CSR_HUB_UPLOADED_${timestampStr}.json`;
      const savedFilePath = path.join(BACKUPS_DIR, savedFileName);

      fs.writeFileSync(savedFilePath, JSON.stringify(parsed, null, 2), "utf-8");

      const stats = fs.statSync(savedFilePath);
      const sizeBytes = stats.size;
      const sizeFormatted = sizeBytes > 1024 * 1024 
        ? `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`
        : `${(sizeBytes / 1024).toFixed(2)} KB`;

      let restored = false;
      if (autoRestore) {
        triggerAutoSnapshot(dbCache, "Pre-Upload-Restore Safety Checkpoint");
        const restoredDb: any = parsed.database || parsed;
        const allowedKeys: (keyof ServerDatabase)[] = [
          "employees", "logs", "courses", "records", "documents", "folders",
          "stitchingRecords", "departmentItems", "departmentFolders",
          "departmentTrainingRecords", "departmentCustomFields", "departmentTrainingFiles",
          "notifications", "leadershipAttendance", "leadershipFiles", "leadershipSchedules",
          "chatChannels", "chatDMs", "chatMessages", "announcements",
          "antiBriberyWorkbook", "spreadsheets", "auditLogs", "users",
          "companyLogo", "startupMedia", "settings", "files", "dataRecords"
        ];
        allowedKeys.forEach(key => {
          if (key in restoredDb && restoredDb[key] !== undefined) {
            (dbCache as any)[key] = restoredDb[key];
          }
        });
        dbCache.lastUpdated = new Date().toISOString();
        saveDatabase(dbCache);
        broadcastToClients({
          type: "SYSTEM_RESTORED",
          entity: "all",
          data: dbCache,
          senderClientId: senderClientId || (req.headers["x-client-id"] as string),
          timestamp: new Date().toISOString()
        });
        restored = true;
      }

      res.json({
        success: true,
        message: restored ? "Backup uploaded and system restored ✓" : "Backup file uploaded to archives ✓",
        restored,
        backup: {
          id: `UPL-${Date.now()}`,
          fileName: savedFileName,
          size: sizeFormatted,
          sizeBytes,
          createdAt: new Date().toISOString(),
          downloadUrl: `/api/system/backups/${encodeURIComponent(savedFileName)}/download`
        }
      });
    } catch (err: any) {
      console.error("[Backup Upload Error]:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // DELETE /api/system/backups/:fileName - Delete a backup archive
  app.delete("/api/system/backups/:fileName", (req: Request, res: Response) => {
    try {
      const fileName = path.basename(req.params.fileName);
      const filePath = path.join(BACKUPS_DIR, fileName);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, error: "Backup file not found" });
      }

      fs.unlinkSync(filePath);
      console.log(`[Backup System] Deleted backup archive: ${fileName}`);
      res.json({ success: true, message: `Backup ${fileName} deleted successfully` });
    } catch (err: any) {
      console.error("[Backup Delete Error]:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Serve static public assets directly
  const publicDir = path.join(process.cwd(), "public");
  app.use(express.static(publicDir));

  // Upload custom login background image asset
  app.post("/api/upload-login-bg", (req: Request, res: Response) => {
    try {
      const { imageData } = req.body;
      if (!imageData || typeof imageData !== "string") {
        return res.status(400).json({ error: "No image data provided" });
      }
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      fs.writeFileSync(path.join(publicDir, "login-background.png"), buffer);
      fs.writeFileSync(path.join(publicDir, "Your paragraph text.png"), buffer);
      const distDir = path.join(process.cwd(), "dist");
      if (fs.existsSync(distDir)) {
        fs.writeFileSync(path.join(distDir, "login-background.png"), buffer);
        fs.writeFileSync(path.join(distDir, "Your paragraph text.png"), buffer);
      }
      console.log(`[Upload] Login background saved (${buffer.length} bytes)`);
      res.json({ success: true, url: "/login-background.png" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // =========================================================================
  // VITE MIDDLEWARE SETUP (Development vs Production SPA Fallback)
  // =========================================================================

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[CSR HUB Master Server] Live and synchronizing on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("[Server Fatal Error]:", err);
});
