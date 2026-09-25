/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'Admin' | 'Staff' | 'Viewer' | 'User' | 'Section Leader';

export interface AppUser {
  id?: string;
  name: string;
  role: UserRole;
  avatar: string;
  email: string;
  department?: string;
  assignedSection?: string;
  section?: string;
  position?: string;
  lastActive?: string;
  status?: 'Active' | 'Inactive';
}

export interface SystemAuditLogItem {
  id: string;
  user: string;
  role: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'UPLOAD' | 'DOWNLOAD' | 'LOGIN' | 'REVERT';
  module: string;
  details: string;
  recordId?: string;
  timestamp: string;
}

export type ActiveTab =
  | 'dashboard'
  | 'employees'
  | 'leadership'
  | 'stitching'
  | 'department'
  | 'reports'
  | 'calendar'
  | 'documents'
  | 'settings'
  | 'brand-hub'
  | 'messages'
  | 'backup'
  | 'opl'
  | 'training-program'
  | 'ehs';

export interface AuthenticatedEmployee {
  id: string;
  employeeNo: string;
  name: string;
  fullName?: string;
  department: string;
  position: string;
  status: string;
  role: UserRole;
  assignedSection?: string;
  section?: string;
  avatar?: string;
  email?: string;
  onBoardDate?: string;
}

export interface PresenceUser {
  id: string;
  employeeNo: string;
  name: string;
  department: string;
  position: string;
  role: string;
  status: 'online' | 'offline' | 'away';
  lastActive: string;
  avatar?: string;
}

export interface ChatImageAttachment {
  id?: string;
  url?: string;
  previewUrl?: string;
  downloadUrl?: string;
  dataUrl?: string;
  fileName: string;
  fileSize: string;
  mimeType: string;
  width?: number;
  height?: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderEmployeeNo?: string;
  senderDepartment?: string;
  senderPosition?: string;
  senderAvatar?: string;
  senderRole?: string;
  recipientId?: string;
  recipientEmployeeNo?: string;
  recipientName?: string;
  text?: string;
  timestamp: string;
  isSelf?: boolean;
  channelId?: string;
  image?: ChatImageAttachment;
  attachment?: {
    name: string;
    type: 'pdf' | 'doc' | 'image' | 'sheet';
    size: string;
    url?: string;
  };
  reactions?: Record<string, number>;
  userReactions?: string[];
  status?: 'sending' | 'sent' | 'read' | 'error';
  readAt?: string | null;
  readBy?: Array<{ id?: string; employeeNo?: string; name?: string; readAt: string }>;
}

export interface ChatChannel {
  id: string;
  name: string;
  topic: string;
  isChannel: boolean;
  unreadCount: number;
  lastMessage?: string;
  lastTime?: string;
  avatarIcon?: string;
  memberCount?: number;
  status?: 'online' | 'offline' | 'away' | 'bot';
  role?: string;
  employeeId?: string;
  employeeNo?: string;
  department?: string;
  position?: string;
}

export interface Employee {
  id: string;
  employeeNo: string;
  name: string;
  fullName?: string;
  department: string;
  position: string;
  gender?: string;
  hireDate?: string;
  onBoardDate?: string;
  status: 'Active' | 'On Leave' | 'Probationary' | 'Done' | 'Pending' | 'In Progress' | 'Inactive';
  role?: UserRole;
  assignedSection?: string;
  section?: string;
  password?: string;
  done?: boolean;
  traineeLeader?: 'Yes' | 'No' | boolean;
  isTraineeLeader?: boolean;
  leadershipTrainingStatus?: 'Completed' | 'New Trainee Leader' | string;
  leadershipYear?: number;
  leadershipBatch?: string;
  skillLevel?: string;
  shift?: string;
  email?: string;
  phone?: string;
  notes?: string;
  avatar?: string;
  updatedAt?: string;
  createdAt?: string;
}

export type LeadershipSubModule =
  | 'schedule'
  | 'courses'
  | 'records'
  | 'documents'
  | 'analytics';

// 1. Leadership Training Interfaces
export interface TrainingLog {
  id: string;
  title: string;
  type: string;
  date: string;
  location: string;
  instructor: string;
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Pending';
  batchCode: string;
  traineesCount: number;
  section?: string;
  department?: string;
}

export interface TrainingCourse {
  id: string;
  code: string;
  name: string;
  category: 'Foundational' | 'Operation' | 'Managerial' | 'Safety' | 'Compliance';
  instructor: string;
  durationHours: number;
  description: string;
}

export interface TraineeRecord {
  id: string;
  employeeId: string;
  name: string;
  department: string;
  section?: string;
  courseName: string;
  attendance: 'Present' | 'Absent' | 'Excused';
  score: number; // 0-100
  evaluation: 'Pass' | 'Fail' | 'In Progress';
  date: string;
  historyLogs?: string[];
}

export interface TraineeSubjectRecord {
  id: string;
  subjectName: string;
  date: string;
  trainerName: string;
  status: 'Completed' | 'On-going' | 'Not yet started';
  remarks: string;
  attendance: 'Present' | 'Absent';
  timestamp: string; // Auto timestamp
}

export interface TraineeAuditLog {
  id: string;
  action: string;
  timestamp: string;
  user: string;
}

export interface TraineeProfile {
  id: string;
  name: string;
  employeeId: string;
  department: string;
  section?: string;
  position: string;
  dateStarted: string;
  photoUrl?: string; // photo/profile picture upload / URL / base64 string
  subjects: TraineeSubjectRecord[];
  auditLogs: TraineeAuditLog[];
}

export interface TrainingDoc {
  id: string;
  name: string;
  type: 'SOP' | 'Certificate' | 'Material';
  fileName: string;
  uploadedBy: string;
  uploadDate: string;
  fileSize: string;
  category: string;
  section?: string;
  department?: string;
  fileUrl?: string;
  folderId?: string;
}

export interface StitchingAuditRow {
  id: string;
  lineNo: string;
  name: string;
  date: string;
  style: string;
  findings: string;
}

export interface StitchingFolder {
  id: string;
  name: string;
  code?: string;
  auditDate: string;
  dateColumnHeader: string;
  rows: StitchingAuditRow[];
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface StitchingAuditTableData {
  auditDate: string;
  dateColumnHeader: string;
  rows: StitchingAuditRow[];
  updatedAt?: string;
  updatedBy?: string;
}

export interface StitchingFoldersResponse {
  success: boolean;
  folders: StitchingFolder[];
  activeFolderId: string;
  updatedAt?: string;
}

// 2. Stitching Training Plan (Stitching) - Google Sheets Integration Model
export interface StitchingTrainingPlanRecord {
  id: string;
  date: string;
  trainingSubject: string;
  trainer: string;
  section: string;
  noOfTrainees: number;
  totalTime: string;
  status: 'Scheduled' | 'Completed' | 'In Progress' | 'Cancelled';
  documentation: string;
  documentationUrl?: string;
  year?: string | number;
  month?: string | number;
  notes?: string;
  traineeNames?: string[];
  raw?: Record<string, any>;
}

export interface StitchingRecord {
  id: string;
  style?: string;
  line?: string;
  traineeName?: string;
  trainingProcess?: string;
  targetTaktTime?: number;
  actualTaktTime?: number;
  improvementPercentage?: number;
  blueLabelStatus?: 'Certified' | 'Candidate' | 'None';
  trainerName?: string;
  status: 'Completed' | 'In Progress' | 'Under Observation' | 'Initial Stage' | 'Scheduled' | 'Cancelled';
  outputTarget?: number;
  outputActual?: number;
  section?: string;
  department?: string;
  certificationDate?: string;
  // Google Sheets Training Plan properties
  date?: string;
  trainingSubject?: string;
  trainer?: string;
  noOfTrainees?: number;
  totalTime?: string;
  documentation?: string;
  documentationUrl?: string;
  year?: string | number;
  month?: string | number;
  notes?: string;
  traineeNames?: string[];
}

// 3. Department Training Interfaces
export interface DepartmentItem {
  id: string;
  departmentName: string;
  trainingContent: string;
  instructorName: string;
  leaderName: string;
  scheduleDate: string;
  attendanceRate: number; // Percentage
  performanceScore: number; // 1-10 scale or 1-100
  status: 'Pending' | 'In Progress' | 'Completed';
  section?: string;
}

export interface DepartmentFolder {
  id: string;
  name: string;
  code?: string;
  description?: string;
  icon?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export type CustomFieldType =
  | 'Text'
  | 'Number'
  | 'Date'
  | 'Time'
  | 'Dropdown'
  | 'Checkbox'
  | 'Long Text'
  | 'Percentage';

export interface DepartmentCustomField {
  id: string;
  name: string;
  type: CustomFieldType;
  options?: string[]; // for dropdown
  scope: 'all' | string; // 'all' or departmentId
  required?: boolean;
  order: number;
  placeholder?: string;
}

export interface DepartmentTrainingPhoto {
  id: string;
  url: string;
  downloadUrl?: string;
  dataUrl?: string;
  fileName: string;
  fileSize?: string;
  mimeType?: string;
  caption?: string;
  uploadedAt: string;
}

export interface DepartmentTrainingDoc {
  id: string;
  url: string;
  downloadUrl?: string;
  dataUrl?: string;
  fileName: string;
  fileSize: string;
  fileType: string;
  category?: string;
  uploadedAt: string;
}

export interface DepartmentTrainingRecord {
  id: string;
  departmentId: string;
  departmentName: string;
  date: string;
  subject: string;
  traineesCount: number;
  totalTime: string;
  totalHours?: number;
  trainer?: string;
  trainingType?: string;
  venue?: string;
  startTime?: string;
  endTime?: string;
  category?: string;
  targetParticipants?: string;
  batch?: string;
  trainingObjective?: string;
  remarks?: string;
  status: 'Completed' | 'In Progress' | 'Scheduled' | 'Cancelled';
  createdBy?: string;
  dateCreated: string;
  lastUpdated: string;
  year: number;
  customFields?: Record<string, any>;
  photos: DepartmentTrainingPhoto[];
  documents: DepartmentTrainingDoc[];
}

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
}

export interface Announcement {
  id: string;
  title: string;
  content?: string;
  category: 'Leadership' | 'Compliance' | 'Operations' | 'Documents' | 'Safety' | 'General';
  priority: 'Urgent' | 'High' | 'Normal' | 'Low';
  scheduledDate: string; // e.g. "2026-05-28" or "YYYY-MM-DD"
  scheduledTime: string; // e.g. "09:00 AM" or "HH:mm"
  endDate?: string;      // optional expiry date
  status: 'Active' | 'Scheduled' | 'Completed' | 'Archived';
  targetDepartment?: string;
  author?: string;
  createdAt?: string;
}

// 4. File and Data Management Interfaces
export interface DataRecord {
  id: string;
  title: string;
  format: 'json' | 'csv' | 'text' | 'table';
  content: string;
  category: string;
  folderId?: string;
  tags?: string[];
  size: string;
  recordCount?: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  autoSavedAt?: string;
  isLocked?: boolean;
}

export interface StoredFolderItem {
  id: string;
  name: string;
  parentId?: string | null;
  createdAt: string;
  createdBy: string;
  description?: string;
  icon?: string;
}

export interface StartupMediaConfig {
  type: 'default' | 'image' | 'video';
  url: string | null;
  fileName?: string;
  fileSize?: string;
  mimeType?: string;
  duration?: number; // seconds
  soundEnabled?: boolean;
  fitMode?: 'contain' | 'cover';
  title?: string;
  subtitle?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface OPLStep {
  stepNo: number;
  instruction: string;
  keyPoint: string;
  reason: string;
  imageUrl?: string;
}

export interface OPLItem {
  id: string;
  title: string;
  department: string;
  category: string;
  process: string;
  lineNo: string;
  style: string;
  topic: string;
  producerDate: string;
  reviewStatus: 'Reviewed' | 'Pending Review' | 'Needs Revision';
  reviewedBy?: string;
  reviewedDate?: string;
  approvalStatus: 'Approved' | 'Pending Approval' | 'Rejected';
  approvedBy?: string;
  approvedDate?: string;
  preparedBy: string;
  imageUrl: string;
  isFavorite?: boolean;
  description: string;
  objectives?: string;
  keyPoints?: string[];
  safetyPrecautions?: string[];
  steps?: OPLStep[];
  docNo?: string;
  revNo?: string;
  createdAt: string;
  updatedAt: string;
}


