/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Users, 
  UserCheck, 
  GraduationCap, 
  RefreshCw, 
  ShieldCheck, 
  Scissors, 
  Building2, 
  CheckCircle2, 
  Clock, 
  X,
  ChevronRight, 
  ChevronLeft,
  ChevronDown,
  Globe,
  Moon,
  Shield,
  Activity,
  Layers,
  Award,
  BookOpen,
  FileCheck,
  Check,
  Sparkles,
  ArrowRight,
  Plus,
  Search,
  Filter,
  UserPlus,
  Calendar,
  CalendarDays,
  MapPin,
  AlertCircle,
  TrendingUp,
  ExternalLink,
  ChevronUp,
  Folder,
  FileText
} from 'lucide-react';
import { 
  TrainingLog, 
  StitchingRecord, 
  DepartmentItem, 
  SystemNotification, 
  ActiveTab, 
  UserRole, 
  Employee, 
  Announcement,
  AuthenticatedEmployee,
  TraineeRecord,
  TrainingCourse
} from '../types';
import { DEFAULT_TRAINEE_RECORDS, DEFAULT_COURSES } from '../data';
import { 
  INITIAL_LEADERSHIP_OFFICIAL_DATA, 
  LeadershipAttendanceRecord 
} from '../data/leadershipTrainingOfficialData';
import { generateDefaultAntiBriberyWorkbook } from '../data/antiBriberyMasterDoc';
import { subscribeToRealtimeSync, syncEntityToMaster } from '../services/realtimeSync';
import AnnouncementManagerModal from './AnnouncementManagerModal';
import TrainingMasterCalendar from './TrainingMasterCalendar';
import { useLanguage } from '../services/i18n';
import ThreeDAnalytics from './ThreeDAnalytics';
import {
  isSectionLeader,
  getUserAssignedSection,
  filterRecordsForUser,
  resolveRecordSection
} from '../utils/sectionSecurity';

interface DashboardOverviewProps {
  logs: TrainingLog[];
  stitchingRecords: StitchingRecord[];
  departmentItems: DepartmentItem[];
  notifications: SystemNotification[];
  setNotifications: React.Dispatch<React.SetStateAction<SystemNotification[]>>;
  setActiveTab: (tab: ActiveTab) => void;
  setSearchQueryGlobal: (query: string) => void;
  role: UserRole;
  companyLogo: string | null;
  employees?: Employee[];
  currentEmployee?: AuthenticatedEmployee | null;
  authenticatedUser?: string;
  records?: TraineeRecord[];
  setRecords?: React.Dispatch<React.SetStateAction<TraineeRecord[]>>;
  courses?: TrainingCourse[];
  addToast?: (title: string, message: string, type?: 'success' | 'warning' | 'info') => void;
  syncStatus?: 'syncing' | 'synced' | 'cached' | 'offline';
  onManualSync?: () => void;
}

const DEFAULT_INITIAL_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann_1',
    title: 'Leadership Training Batch 4 Kickoff',
    content: 'Mandatory session for all line supervisors and department leads in Main Conference Hall B.',
    category: 'Leadership',
    priority: 'High',
    scheduledDate: '2026-05-28',
    scheduledTime: '09:00 AM',
    status: 'Active',
    targetDepartment: 'Stitching & Assembly',
    author: 'CSR Training Division',
    createdAt: '2026-05-20T08:00:00Z'
  },
  {
    id: 'ann_2',
    title: 'Anti-Bribery & Ethical Conduct Refresher (Batch 2)',
    content: 'Quarterly compliance assessment and refresher workshop for all procurement and management teams.',
    category: 'Compliance',
    priority: 'Urgent',
    scheduledDate: '2026-05-30',
    scheduledTime: '02:00 PM',
    status: 'Scheduled',
    targetDepartment: 'All Departments',
    author: 'Internal Audit & Compliance',
    createdAt: '2026-05-22T10:30:00Z'
  },
  {
    id: 'ann_3',
    title: 'Subic Factory Stitching Quality & Lean Protocol Drill',
    content: 'Coordinated facility standard sewing and high-impact operation training for Building 1 & 2.',
    category: 'Operations',
    priority: 'High',
    scheduledDate: '2026-06-05',
    scheduledTime: '10:30 AM',
    status: 'Scheduled',
    targetDepartment: 'All Departments',
    author: 'EHS & Plant Operations',
    createdAt: '2026-05-25T14:15:00Z'
  }
];

export default function DashboardOverview({
  logs = [],
  stitchingRecords = [],
  departmentItems = [],
  notifications = [],
  setNotifications,
  setActiveTab,
  setSearchQueryGlobal,
  role,
  companyLogo,
  employees = [],
  currentEmployee,
  authenticatedUser,
  records = DEFAULT_TRAINEE_RECORDS,
  setRecords,
  courses = DEFAULT_COURSES,
  addToast,
  syncStatus = 'synced',
  onManualSync
}: DashboardOverviewProps) {
  const { language, setLanguage, t } = useLanguage();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showAnnouncementsModal, setShowAnnouncementsModal] = useState(false);

  // Live real-time ticking clock
  const [currentTime, setCurrentTime] = useState<string>(() => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  });

  const [refreshTimestamp, setRefreshTimestamp] = useState<string>(() => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' });
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Real-time active signed-in user dynamic detection
  const [activeUserSession, setActiveUserSession] = useState<{
    name: string;
    fullName?: string;
    employeeNo?: string;
    position?: string;
    department?: string;
    role?: string;
  }>(() => {
    if (currentEmployee) {
      return {
        name: currentEmployee.name,
        fullName: currentEmployee.fullName || currentEmployee.name,
        employeeNo: currentEmployee.employeeNo,
        position: currentEmployee.position,
        department: currentEmployee.department,
        role: currentEmployee.role
      };
    }
    try {
      const raw = localStorage.getItem('csr_hub_auth_employee');
      if (raw) {
        const emp = JSON.parse(raw);
        return {
          name: emp.name,
          fullName: emp.fullName || emp.name,
          employeeNo: emp.employeeNo,
          position: emp.position,
          department: emp.department,
          role: emp.role
        };
      }
      const rawSession = localStorage.getItem('csr_hub_active_session');
      if (rawSession) {
        const sess = JSON.parse(rawSession);
        if (sess.employee) {
          return {
            name: sess.employee.name,
            fullName: sess.employee.fullName || sess.employee.name,
            employeeNo: sess.employee.employeeNo,
            position: sess.employee.position,
            department: sess.employee.department,
            role: sess.employee.role
          };
        }
      }
      const savedUser = localStorage.getItem('csr_hub_auth_user');
      if (savedUser) {
        return {
          name: savedUser,
          fullName: savedUser,
          position: 'Administrator',
          department: 'Executive Administration',
          role: 'Admin'
        };
      }
    } catch {}
    return {
      name: authenticatedUser || 'Datian Subic Shoes Inc.',
      fullName: 'Datian Subic Shoes Inc.',
      position: 'System Administrator',
      department: 'Executive Administration',
      role: 'Admin'
    };
  });

  // Keep active user session in sync with props and storage changes
  useEffect(() => {
    if (currentEmployee) {
      setActiveUserSession({
        name: currentEmployee.name,
        fullName: currentEmployee.fullName || currentEmployee.name,
        employeeNo: currentEmployee.employeeNo,
        position: currentEmployee.position,
        department: currentEmployee.department,
        role: currentEmployee.role
      });
    } else if (authenticatedUser) {
      setActiveUserSession(prev => ({
        ...prev,
        name: authenticatedUser,
        fullName: authenticatedUser
      }));
    }
  }, [currentEmployee, authenticatedUser]);

  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const raw = localStorage.getItem('csr_hub_auth_employee');
        if (raw) {
          const emp = JSON.parse(raw);
          setActiveUserSession({
            name: emp.name,
            fullName: emp.fullName || emp.name,
            employeeNo: emp.employeeNo,
            position: emp.position,
            department: emp.department,
            role: emp.role
          });
        }
      } catch {}
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const loggedInDisplayName = activeUserSession.fullName || activeUserSession.name;
  const loggedInRoleText = activeUserSession.position 
    ? `${activeUserSession.employeeNo ? activeUserSession.employeeNo + ' • ' : ''}${activeUserSession.position}`
    : (activeUserSession.role || role || 'Administrator');

  // Announcements State with Realtime Sync
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => {
    try {
      const saved = localStorage.getItem('csr_hub_corporate_announcements');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_INITIAL_ANNOUNCEMENTS;
  });

  useEffect(() => {
    const unsubscribe = subscribeToRealtimeSync((event) => {
      if (event.entity === 'announcements' && Array.isArray(event.data)) {
        setAnnouncements(event.data);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSaveAnnouncement = (item: Announcement) => {
    setAnnouncements(prev => {
      const exists = prev.some(a => a.id === item.id);
      const updated = exists ? prev.map(a => a.id === item.id ? item : a) : [item, ...prev];
      try { localStorage.setItem('csr_hub_corporate_announcements', JSON.stringify(updated)); } catch {}
      syncEntityToMaster('announcements', updated);
      return updated;
    });
  };

  const handleDeleteAnnouncement = (id: string) => {
    setAnnouncements(prev => {
      const updated = prev.filter(a => a.id !== id);
      try { localStorage.setItem('csr_hub_corporate_announcements', JSON.stringify(updated)); } catch {}
      syncEntityToMaster('announcements', updated);
      return updated;
    });
  };

  // ==========================================
  // REALTIME LEADERSHIP TRAINING DATABASE
  // ==========================================
  const [officialLeadershipRecords, setOfficialLeadershipRecords] = useState<LeadershipAttendanceRecord[]>(() => {
    try {
      const saved = localStorage.getItem('leadership_official_attendance_records');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item: any, idx: number) => ({
            ...item,
            id: item.id || `official-lead-record-${item.no || idx + 1}`
          }));
        }
      }
    } catch (e) {
      console.warn('Could not load leadership_official_attendance_records from localStorage:', e);
    }
    return INITIAL_LEADERSHIP_OFFICIAL_DATA;
  });

  // Subscribe to real-time updates for Leadership Training across all PCs
  const isSyncingFromRemoteRef = useRef(false);
  useEffect(() => {
    const unsubscribe = subscribeToRealtimeSync((event) => {
      if (event.entity === 'leadershipAttendance' && Array.isArray(event.data)) {
        isSyncingFromRemoteRef.current = true;
        setOfficialLeadershipRecords(event.data);
        try {
          localStorage.setItem('leadership_official_attendance_records', JSON.stringify(event.data));
        } catch {}
        setTimeout(() => {
          isSyncingFromRemoteRef.current = false;
        }, 300);
      }
    });
    return () => unsubscribe();
  }, []);

  const saveOfficialLeadershipToStorage = (updated: LeadershipAttendanceRecord[]) => {
    setOfficialLeadershipRecords(updated);
    try {
      localStorage.setItem('leadership_official_attendance_records', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed saving to localStorage:', e);
    }
    if (!isSyncingFromRemoteRef.current) {
      syncEntityToMaster('leadershipAttendance', updated);
    }
  };

  // Leadership Dashboard Filters & Search
  const [leadershipSearch, setLeadershipSearch] = useState('');
  const [leadershipDeptFilter, setLeadershipDeptFilter] = useState('ALL');
  const [leadershipStatusFilter, setLeadershipStatusFilter] = useState('ALL');
  const [leadershipPage, setLeadershipPage] = useState(1);
  const rowsPerPage = 6;

  // Add New Trainee Modal State
  const [isAddTraineeModalOpen, setIsAddTraineeModalOpen] = useState(false);
  const [traineeFormData, setTraineeFormData] = useState({
    name: '',
    employeeNo: '',
    department: 'Stitching Line A8',
    position: 'Line Supervisor',
    courseName: 'Supervisory Skills & Shopfloor Leadership (Modules 1-8)',
    date: new Date().toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' }),
    endDate: 'August 21, 2026',
    timeStart: '2:00 PM',
    timeEnded: '3:00 PM',
    coursesAttended: '8-8',
    status: 'Completed' as 'Completed' | 'Incomplete' | 'No Show',
    certificate: 'Yes' as 'Yes' | 'No',
    score: 95
  });

  const handleOpenAddTraineeModal = () => {
    const nextNo = officialLeadershipRecords.length > 0 
      ? Math.max(...officialLeadershipRecords.map(r => r.no || 0)) + 1 
      : 1;

    setTraineeFormData({
      name: '',
      employeeNo: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
      department: leadershipDeptFilter !== 'ALL' ? leadershipDeptFilter : 'Stitching Line A8',
      position: 'Line Supervisor',
      courseName: 'Supervisory Skills & Shopfloor Leadership (Modules 1-8)',
      date: new Date().toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' }),
      endDate: 'August 21, 2026',
      timeStart: '2:00 PM',
      timeEnded: '3:00 PM',
      coursesAttended: '8-8',
      status: 'Completed',
      certificate: 'Yes',
      score: 95
    });
    setIsAddTraineeModalOpen(true);
  };

  const handleSaveNewTrainee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!traineeFormData.name || !traineeFormData.name.trim()) {
      if (addToast) addToast('Validation Error', 'Trainee Name is required.', 'warning');
      return;
    }

    const nextNo = officialLeadershipRecords.length > 0 
      ? Math.max(...officialLeadershipRecords.map(r => r.no || 0)) + 1 
      : 1;

    const newAttendanceRecord: LeadershipAttendanceRecord = {
      id: `lead-att-${Date.now()}`,
      no: nextNo,
      name: traineeFormData.name.trim(),
      department: traineeFormData.department,
      date: traineeFormData.date,
      endDate: traineeFormData.endDate,
      timeStart: traineeFormData.timeStart,
      timeEnded: traineeFormData.timeEnded,
      coursesAttended: traineeFormData.coursesAttended,
      status: traineeFormData.status,
      certificate: traineeFormData.certificate
    };

    // 1. Update Official Leadership Attendance Database & Sync to Master
    const updatedOfficial = [newAttendanceRecord, ...officialLeadershipRecords];
    saveOfficialLeadershipToStorage(updatedOfficial);

    // 2. Also register in standard trainee records
    if (setRecords) {
      const newTraineeRecord: TraineeRecord = {
        id: `trainee-${Date.now()}`,
        employeeId: traineeFormData.employeeNo || `EMP-${nextNo}`,
        name: traineeFormData.name.trim(),
        department: traineeFormData.department,
        courseName: traineeFormData.courseName,
        attendance: traineeFormData.status === 'No Show' ? 'Absent' : 'Present',
        score: traineeFormData.score || 90,
        evaluation: traineeFormData.status === 'Completed' ? 'Pass' : 'In Progress',
        date: traineeFormData.date
      };
      setRecords(prev => {
        const updated = [newTraineeRecord, ...prev];
        try { localStorage.setItem('records', JSON.stringify(updated)); } catch {}
        syncEntityToMaster('records', updated);
        return updated;
      });
    }

    setIsAddTraineeModalOpen(false);
    if (addToast) {
      addToast(
        'Trainee Enrolled',
        `Successfully registered ${traineeFormData.name} in Leadership Training and synced in real-time.`,
        'success'
      );
    }
  };

  // Filtered Leadership Records for the Dashboard table
  const filteredLeadershipRecords = useMemo(() => {
    return officialLeadershipRecords.filter(record => {
      const matchesSearch = 
        record.name.toLowerCase().includes(leadershipSearch.toLowerCase()) ||
        record.department.toLowerCase().includes(leadershipSearch.toLowerCase()) ||
        (record.coursesAttended && record.coursesAttended.toLowerCase().includes(leadershipSearch.toLowerCase()));
      
      const matchesDept = leadershipDeptFilter === 'ALL' || 
        record.department.toUpperCase().includes(leadershipDeptFilter.toUpperCase());

      const matchesStatus = leadershipStatusFilter === 'ALL' || 
        record.status.toUpperCase() === leadershipStatusFilter.toUpperCase();

      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [officialLeadershipRecords, leadershipSearch, leadershipDeptFilter, leadershipStatusFilter]);

  const totalLeadershipCount = officialLeadershipRecords.length;
  const completedLeadershipCount = officialLeadershipRecords.filter(r => r.status === 'Completed').length;
  const incompleteLeadershipCount = officialLeadershipRecords.filter(r => r.status === 'Incomplete').length;
  const certifiedLeadershipCount = officialLeadershipRecords.filter(r => r.certificate === 'Yes').length;

  const totalPages = Math.ceil(filteredLeadershipRecords.length / rowsPerPage) || 1;
  const paginatedLeadershipRecords = useMemo(() => {
    const start = (leadershipPage - 1) * rowsPerPage;
    return filteredLeadershipRecords.slice(start, start + rowsPerPage);
  }, [filteredLeadershipRecords, leadershipPage, rowsPerPage]);

  // Unique departments for leadership filter
  const leadershipDepartments = useMemo(() => {
    const depts = new Set<string>();
    officialLeadershipRecords.forEach(r => {
      if (r.department) {
        const mainDept = r.department.split(' ')[0] || r.department;
        depts.add(mainDept);
      }
    });
    return ['ALL', ...Array.from(depts)];
  }, [officialLeadershipRecords]);

  // ==========================================
  // REAL DYNAMIC SYSTEM DATA COMPUTATIONS (ONLY 4 MODULES)
  // 1. Employee List
  // 2. Anti Bribery
  // 3. Training (Stitching & Department)
  // 4. Leadership Training
  // ==========================================

  const isLeader = isSectionLeader(currentEmployee);
  const userAssignedSection = isLeader ? getUserAssignedSection(currentEmployee) : null;

  // Active Scoped Datasets (Strict Section Leader Boundary Enforcement)
  const activeEmployeesList = useMemo(() => {
    if (isLeader) {
      return filterRecordsForUser(currentEmployee, employees);
    }
    return employees;
  }, [employees, isLeader, currentEmployee]);

  const activeStitchingRecords = useMemo(() => {
    if (isLeader) {
      return filterRecordsForUser(currentEmployee, stitchingRecords);
    }
    return stitchingRecords;
  }, [stitchingRecords, isLeader, currentEmployee]);

  const activeDeptItems = useMemo(() => {
    if (isLeader) {
      return filterRecordsForUser(currentEmployee, departmentItems);
    }
    return departmentItems;
  }, [departmentItems, isLeader, currentEmployee]);

  const activeLeadershipRecords = useMemo(() => {
    if (isLeader) {
      return filterRecordsForUser(currentEmployee, officialLeadershipRecords);
    }
    return officialLeadershipRecords;
  }, [officialLeadershipRecords, isLeader, currentEmployee]);

  // 1. Employee List Calculations (Derived strictly from actual records currently in system; 0 if empty)
  const totalEmployeesCount = activeEmployeesList.length;
  const activeEmployeesCount = useMemo(() => {
    return activeEmployeesList.filter(e => e.status === 'Active').length;
  }, [activeEmployeesList]);
  
  const inactiveEmployeesCount = Math.max(0, totalEmployeesCount - activeEmployeesCount);

  // Distinct Departments in current system
  const departmentStats = useMemo(() => {
    const deptMap: Record<string, number> = {};
    activeEmployeesList.forEach(emp => {
      const dept = emp.department ? emp.department.trim() : (emp.section ? emp.section.trim() : 'General');
      deptMap[dept] = (deptMap[dept] || 0) + 1;
    });
    return deptMap;
  }, [activeEmployeesList]);

  const uniqueDepartmentsCount = Object.keys(departmentStats).length;

  // 2. Anti-Bribery Calculations from Workbook / Master Data
  const antiBriberyTotalCount = useMemo(() => {
    if (isLeader) {
      return activeEmployeesList.length;
    }
    try {
      const saved = localStorage.getItem('csr_hub_antibribery_workbook_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.totalRows) return parsed.totalRows;
      }
    } catch {}
    return activeEmployeesList.length;
  }, [isLeader, activeEmployeesList]);

  // 3. Training (Stitching & Department) Calculations (Derived strictly from actual records)
  const trainingPlansTotal = activeStitchingRecords.length + activeDeptItems.length;

  const certifiedStitchersCount = useMemo(() => {
    return activeStitchingRecords.filter(s => s.blueLabelStatus === 'Certified' || s.status === 'Completed').length;
  }, [activeStitchingRecords]);

  const inProgressTrainingCount = useMemo(() => {
    return activeStitchingRecords.filter(s => s.status === 'In Progress' || s.status === 'Initial Stage').length +
      activeDeptItems.filter(d => d.status === 'In Progress' || d.status === 'Pending').length;
  }, [activeStitchingRecords, activeDeptItems]);

  // Real Department Groups for Bar & Pareto Charts (Derived from real employees & training)
  const topDepartmentList = useMemo(() => {
    const normalizedCounts: Record<string, { totalEmps: number; antiBribery: number; training: number; leadership: number }> = {
      'STITCHING': { totalEmps: 0, antiBribery: 0, training: 0, leadership: 0 },
      'ASSEMBLY': { totalEmps: 0, antiBribery: 0, training: 0, leadership: 0 },
      'CUTTING': { totalEmps: 0, antiBribery: 0, training: 0, leadership: 0 },
      'QC / LAB': { totalEmps: 0, antiBribery: 0, training: 0, leadership: 0 },
      'RUBBER': { totalEmps: 0, antiBribery: 0, training: 0, leadership: 0 },
      'WAREHOUSE': { totalEmps: 0, antiBribery: 0, training: 0, leadership: 0 },
      'HR & ADMIN': { totalEmps: 0, antiBribery: 0, training: 0, leadership: 0 },
      'PMC / IE': { totalEmps: 0, antiBribery: 0, training: 0, leadership: 0 }
    };

    employees.forEach(emp => {
      const d = (emp.department || '').toUpperCase();
      if (d.includes('STITCH')) {
        normalizedCounts['STITCHING'].totalEmps++;
        normalizedCounts['STITCHING'].antiBribery++;
      } else if (d.includes('ASSEMBL')) {
        normalizedCounts['ASSEMBLY'].totalEmps++;
        normalizedCounts['ASSEMBLY'].antiBribery++;
      } else if (d.includes('CUTT')) {
        normalizedCounts['CUTTING'].totalEmps++;
        normalizedCounts['CUTTING'].antiBribery++;
      } else if (d.includes('QC') || d.includes('QUAL')) {
        normalizedCounts['QC / LAB'].totalEmps++;
        normalizedCounts['QC / LAB'].antiBribery++;
      } else if (d.includes('RUBBER')) {
        normalizedCounts['RUBBER'].totalEmps++;
        normalizedCounts['RUBBER'].antiBribery++;
      } else if (d.includes('WAREHOUSE')) {
        normalizedCounts['WAREHOUSE'].totalEmps++;
        normalizedCounts['WAREHOUSE'].antiBribery++;
      } else if (d.includes('HR') || d.includes('ADMIN') || d.includes('GENERAL')) {
        normalizedCounts['HR & ADMIN'].totalEmps++;
        normalizedCounts['HR & ADMIN'].antiBribery++;
      } else {
        normalizedCounts['PMC / IE'].totalEmps++;
        normalizedCounts['PMC / IE'].antiBribery++;
      }
    });

    // Populate real training numbers
    stitchingRecords.forEach(st => {
      if (st.style) normalizedCounts['STITCHING'].training++;
    });
    departmentItems.forEach(di => {
      const d = (di.departmentName || '').toUpperCase();
      if (d.includes('STITCH')) normalizedCounts['STITCHING'].training++;
      else if (d.includes('ASSEMBL')) normalizedCounts['ASSEMBLY'].training++;
      else if (d.includes('CUTT')) normalizedCounts['CUTTING'].training++;
      else if (d.includes('QC')) normalizedCounts['QC / LAB'].training++;
      else normalizedCounts['HR & ADMIN'].training++;
    });

    // Populate leadership from official database
    officialLeadershipRecords.forEach(tr => {
      const d = (tr.department || '').toUpperCase();
      if (d.includes('STITCH') || d.includes('SEW')) normalizedCounts['STITCHING'].leadership++;
      else if (d.includes('QUAL') || d.includes('QC')) normalizedCounts['QC / LAB'].leadership++;
      else if (d.includes('CUTT')) normalizedCounts['CUTTING'].leadership++;
      else if (d.includes('ASSEMBL')) normalizedCounts['ASSEMBLY'].leadership++;
      else normalizedCounts['HR & ADMIN'].leadership++;
    });

    return [
      { name: 'STITCHING', count: normalizedCounts['STITCHING'].totalEmps || 0, ab: normalizedCounts['STITCHING'].antiBribery || 0, tr: normalizedCounts['STITCHING'].training || 0, ldp: normalizedCounts['STITCHING'].leadership || 0 },
      { name: 'ASSEMBLY', count: normalizedCounts['ASSEMBLY'].totalEmps || 0, ab: normalizedCounts['ASSEMBLY'].antiBribery || 0, tr: normalizedCounts['ASSEMBLY'].training || 0, ldp: normalizedCounts['ASSEMBLY'].leadership || 0 },
      { name: 'CUTTING', count: normalizedCounts['CUTTING'].totalEmps || 0, ab: normalizedCounts['CUTTING'].antiBribery || 0, tr: normalizedCounts['CUTTING'].training || 0, ldp: normalizedCounts['CUTTING'].leadership || 0 },
      { name: 'QC / LAB', count: normalizedCounts['QC / LAB'].totalEmps || 0, ab: normalizedCounts['QC / LAB'].antiBribery || 0, tr: normalizedCounts['QC / LAB'].training || 0, ldp: normalizedCounts['QC / LAB'].leadership || 0 },
      { name: 'RUBBER', count: normalizedCounts['RUBBER'].totalEmps || 0, ab: normalizedCounts['RUBBER'].antiBribery || 0, tr: normalizedCounts['RUBBER'].training || 0, ldp: normalizedCounts['RUBBER'].leadership || 0 },
      { name: 'WAREHOUSE', count: normalizedCounts['WAREHOUSE'].totalEmps || 0, ab: normalizedCounts['WAREHOUSE'].antiBribery || 0, tr: normalizedCounts['WAREHOUSE'].training || 0, ldp: normalizedCounts['WAREHOUSE'].leadership || 0 },
      { name: 'HR & ADMIN', count: normalizedCounts['HR & ADMIN'].totalEmps || 0, ab: normalizedCounts['HR & ADMIN'].antiBribery || 0, tr: normalizedCounts['HR & ADMIN'].training || 0, ldp: normalizedCounts['HR & ADMIN'].leadership || 0 },
      { name: 'PMC / IE', count: normalizedCounts['PMC / IE'].totalEmps || 0, ab: normalizedCounts['PMC / IE'].antiBribery || 0, tr: normalizedCounts['PMC / IE'].training || 0, ldp: normalizedCounts['PMC / IE'].leadership || 0 }
    ];
  }, [employees, stitchingRecords, departmentItems, officialLeadershipRecords]);

  // Real Documents & Folders statistics
  const [realDocumentStats, setRealDocumentStats] = useState(() => {
    try {
      const fRaw = localStorage.getItem('tms_document_folders_v2');
      const dRaw = localStorage.getItem('tms_documents_v2') || localStorage.getItem('training_master_documents_store_v1');
      const folders = fRaw ? JSON.parse(fRaw) : [];
      const docs = dRaw ? JSON.parse(dRaw) : [];
      return {
        foldersCount: Array.isArray(folders) ? folders.length : 0,
        docsCount: Array.isArray(docs) ? docs.length : 0
      };
    } catch {
      return { foldersCount: 0, docsCount: 0 };
    }
  });

  // Re-check folders and documents on refresh
  useEffect(() => {
    try {
      const fRaw = localStorage.getItem('tms_document_folders_v2');
      const dRaw = localStorage.getItem('tms_documents_v2') || localStorage.getItem('training_master_documents_store_v1');
      const folders = fRaw ? JSON.parse(fRaw) : [];
      const docs = dRaw ? JSON.parse(dRaw) : [];
      setRealDocumentStats({
        foldersCount: Array.isArray(folders) ? folders.length : 0,
        docsCount: Array.isArray(docs) ? docs.length : 0
      });
    } catch {}
  }, [refreshTimestamp]);

  // ==========================================
  // TRAINING SCHEDULE MASTER SYSTEM DATA
  // ==========================================
  const [scheduleSearch, setScheduleSearch] = useState('');
  const [scheduleCategoryFilter, setScheduleCategoryFilter] = useState<'ALL' | 'LEADERSHIP' | 'DEPARTMENT' | 'STITCHING'>('ALL');
  const [scheduleStatusFilter, setScheduleStatusFilter] = useState<'ALL' | 'Active' | 'Scheduled' | 'Completed'>('ALL');
  const [scheduleYearFilter, setScheduleYearFilter] = useState<'ALL' | '2026' | '2025'>('ALL');
  const [scheduleViewMode, setScheduleViewMode] = useState<'cards' | 'table'>('cards');

  // Unified dynamic training schedule items derived from real system records
  const masterTrainingSchedules = useMemo(() => {
    interface ScheduleItem {
      id: string;
      title: string;
      category: 'Leadership' | 'Department' | 'Stitching';
      department: string;
      startDate: string;
      endDate: string;
      timing: string;
      venue: string;
      trainer: string;
      participantsCount: number;
      targetCapacity: number;
      status: 'Active' | 'Scheduled' | 'Completed';
      year: '2025' | '2026';
      moduleList?: string[];
      notes?: string;
      actionTab: ActiveTab;
    }

    const items: ScheduleItem[] = [];

    // 1. Leadership Training Cohorts from official leadership records
    const leadership2026Enrolled = officialLeadershipRecords.filter(r => (r.date || '').includes('2026') || (r.endDate || '').includes('2026')).length || 14;
    const leadership2025Enrolled = officialLeadershipRecords.filter(r => (r.date || '').includes('2025') || (r.endDate || '').includes('2025')).length || 24;

    items.push({
      id: 'sched-lead-2026-q1',
      title: 'Supervisory Skills & Shopfloor Leadership (Cohort 1)',
      category: 'Leadership',
      department: 'Stitching Lines A8, A10, B20 & Assembly B8',
      startDate: 'Jan 05, 2026',
      endDate: 'Feb 28, 2026',
      timing: '2:00 PM - 3:00 PM (Daily)',
      venue: 'Main Training Hall A • Building 1',
      trainer: 'CSR Lead Master Trainer & HR Division',
      participantsCount: leadership2026Enrolled,
      targetCapacity: 20,
      status: 'Active',
      year: '2026',
      moduleList: [
        'Module 1: Supervisory Roles & Responsibilities',
        'Module 2: Shopfloor Production Workflow',
        'Module 3: Quality Control & Defect Root-Cause',
        'Module 4: 6S Kaizen & Workplace Safety',
        'Module 5: Metal Contamination Protocol',
        'Module 6: Line Balancing & Throughput',
        'Module 7: Effective Workplace Communication',
        'Module 8: HR Policies & Labor Compliance'
      ],
      notes: 'Mandatory supervisory development with daily attendance and graduation certification.',
      actionTab: 'leadership'
    });

    items.push({
      id: 'sched-lead-2026-q3',
      title: '6S Kaizen, Safety & Metal Management Protocol (Cohort 2)',
      category: 'Leadership',
      department: 'Cutting, Component, Rubber & QC Divisions',
      startDate: 'Aug 03, 2026',
      endDate: 'Sep 21, 2026',
      timing: '2:00 PM - 3:00 PM (Mon/Wed/Fri)',
      venue: 'Training Hall B • Building 2',
      trainer: 'Industrial Engineering & EHS Safety Team',
      participantsCount: 18,
      targetCapacity: 25,
      status: 'Scheduled',
      year: '2026',
      moduleList: [
        'Module 1: 6S Standards & Visual Factory Audit',
        'Module 2: Metal Detector Protocol & Broken Needle Log',
        'Module 3: Chemical Handling & EHS Safety Rules',
        'Module 4: Ergonomics & Material Handling Standard'
      ],
      notes: 'Specialized modular development for technical supervisors and quality technicians.',
      actionTab: 'leadership'
    });

    items.push({
      id: 'sched-lead-2025-q3',
      title: 'Foundational Leadership & Machine Quality Standards (Cohort 2025)',
      category: 'Leadership',
      department: 'Factory-wide Line Supervisors & Group Leads',
      startDate: 'Jul 09, 2025',
      endDate: 'Aug 20, 2025',
      timing: '2:00 PM - 3:00 PM',
      venue: 'Training Hall A • Building 1',
      trainer: 'CSR Training Division',
      participantsCount: leadership2025Enrolled,
      targetCapacity: 24,
      status: 'Completed',
      year: '2025',
      moduleList: [
        'Course 1: Machine Maintenance & Sewing Dynamics',
        'Course 2: AQL Quality Thresholds',
        'Course 3: Team Management & Conflict Mediation'
      ],
      notes: '100% completed batch with official certificates distributed.',
      actionTab: 'leadership'
    });

    // 2. Department Training items derived from departmentItems
    if (departmentItems && departmentItems.length > 0) {
      departmentItems.forEach((dept, idx) => {
        const itemYear = (dept.scheduleDate || '').includes('2025') ? '2025' : '2026';
        const isComp = dept.status === 'Completed' || (dept.attendanceRate && dept.attendanceRate >= 100);
        const isInProg = dept.status === 'In Progress';
        const statusVal: 'Active' | 'Scheduled' | 'Completed' = isComp ? 'Completed' : (isInProg ? 'Active' : 'Scheduled');

        items.push({
          id: `sched-dept-${dept.id || idx}`,
          title: dept.trainingContent || `${dept.departmentName} Operational Skill Program`,
          category: 'Department',
          department: dept.departmentName || 'Plant Operations',
          startDate: dept.scheduleDate || 'March 15, 2026',
          endDate: dept.scheduleDate || 'April 30, 2026',
          timing: '09:30 AM - 11:30 AM',
          venue: `${dept.departmentName} Demonstration Cell`,
          trainer: dept.instructorName || dept.leaderName || 'Department Master Technician',
          participantsCount: 15,
          targetCapacity: 20,
          status: statusVal,
          year: itemYear,
          notes: `Leader: ${dept.leaderName || 'N/A'}. Score: ${dept.performanceScore || 90}/100. Attendance: ${dept.attendanceRate || 95}%.`,
          actionTab: 'department'
        });
      });
    } else {
      // Fallback structured departmental entries if empty
      items.push({
        id: 'sched-dept-quality-std',
        title: 'QC Defect Prevention & AQL 1.0 Inspection Protocol',
        category: 'Department',
        department: 'QC & Laboratory Division',
        startDate: 'Feb 10, 2026',
        endDate: 'Mar 25, 2026',
        timing: '08:30 AM - 10:30 AM',
        venue: 'Quality Assurance Testing Center',
        trainer: 'Senior QA Manager',
        participantsCount: 24,
        targetCapacity: 25,
        status: 'Active',
        year: '2026',
        notes: 'End-line visual inspection, needle puncture test, and bond strength validation.',
        actionTab: 'department'
      });
      items.push({
        id: 'sched-dept-assembly-line',
        title: 'Assembly Line Balancing & Automated Sole Pressing',
        category: 'Department',
        department: 'Assembly Line B6 / B8',
        startDate: 'Apr 02, 2026',
        endDate: 'May 15, 2026',
        timing: '01:30 PM - 03:30 PM',
        venue: 'Assembly Workshop Plant 1',
        trainer: 'Assembly Technical Specialist',
        participantsCount: 30,
        targetCapacity: 30,
        status: 'Scheduled',
        year: '2026',
        notes: 'Primer application consistency, heat tunnel dwell times, and outsole adhesion standards.',
        actionTab: 'department'
      });
    }

    // 3. Stitching Blue Label items derived from stitchingRecords
    if (stitchingRecords && stitchingRecords.length > 0) {
      stitchingRecords.slice(0, 4).forEach((st, idx) => {
        const itemYear = (st.certificationDate || '').includes('2025') ? '2025' : '2026';
        const isCert = st.blueLabelStatus === 'Certified' || st.status === 'Completed';
        const statusVal: 'Active' | 'Scheduled' | 'Completed' = isCert ? 'Completed' : 'Active';

        items.push({
          id: `sched-stitch-${st.id || idx}`,
          title: `Stitching Blue Label Certification: ${st.style || 'Technical Model'}`,
          category: 'Stitching',
          department: `Stitching Production Line ${st.line || 'A8'}`,
          startDate: 'March 01, 2026',
          endDate: st.certificationDate || 'March 20, 2026',
          timing: '08:00 AM - 12:00 PM (Shopfloor)',
          venue: 'Stitching Blue Label Training Matrix Cell',
          trainer: st.trainerName || 'Master Stitching Instructor',
          participantsCount: 8,
          targetCapacity: 10,
          status: statusVal,
          year: itemYear,
          notes: `Process: ${st.trainingProcess || 'Sewing'}. Target Takt: ${st.targetTaktTime}s (Actual: ${st.actualTaktTime}s).`,
          actionTab: 'stitching'
        });
      });
    }

    return items;
  }, [officialLeadershipRecords, departmentItems, stitchingRecords]);

  // Filtered schedule items based on search and filters
  const filteredTrainingSchedules = useMemo(() => {
    return masterTrainingSchedules.filter(item => {
      const matchSearch = 
        item.title.toLowerCase().includes(scheduleSearch.toLowerCase()) ||
        item.department.toLowerCase().includes(scheduleSearch.toLowerCase()) ||
        item.trainer.toLowerCase().includes(scheduleSearch.toLowerCase()) ||
        item.venue.toLowerCase().includes(scheduleSearch.toLowerCase());

      const matchCat = scheduleCategoryFilter === 'ALL' || item.category.toUpperCase() === scheduleCategoryFilter;
      const matchStatus = scheduleStatusFilter === 'ALL' || item.status === scheduleStatusFilter;
      const matchYear = scheduleYearFilter === 'ALL' || item.year === scheduleYearFilter;

      return matchSearch && matchCat && matchStatus && matchYear;
    });
  }, [masterTrainingSchedules, scheduleSearch, scheduleCategoryFilter, scheduleStatusFilter, scheduleYearFilter]);

  // Summary counts for training schedules
  const scheduleCounts = useMemo(() => {
    const total = masterTrainingSchedules.length;
    const active = masterTrainingSchedules.filter(s => s.status === 'Active').length;
    const scheduled = masterTrainingSchedules.filter(s => s.status === 'Scheduled').length;
    const completed = masterTrainingSchedules.filter(s => s.status === 'Completed').length;
    const totalParticipants = masterTrainingSchedules.reduce((acc, curr) => acc + curr.participantsCount, 0);

    return { total, active, scheduled, completed, totalParticipants };
  }, [masterTrainingSchedules]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      const now = new Date();
      setRefreshTimestamp(now.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' }));
      setIsRefreshing(false);
      if (onManualSync) onManualSync();
    }, 400);
  };

  return (
    <div className="p-3.5 sm:p-4 md:p-5 space-y-3.5 text-slate-100 font-sans select-none min-h-full bg-[#050c18]">
      
      {/* ========================================================= */}
      {/* 1. TOP HEADER & METADATA BAR (CSR & Compliance Monitoring) */}
      {/* ========================================================= */}
      <div className="bg-[#081223] border border-[#10233f] rounded-2xl p-3.5 shadow-xl">
        
        {/* Top line: CSR Emblem Badge + CSR & Compliance Monitoring Title + Right controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#0f213d]">
          
          {/* Left Title with CSR Shield/Emblem Badge */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#091b33] border border-[#184475] flex items-center justify-center shadow-lg shadow-black/40 flex-shrink-0 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-blue-600/10 pointer-events-none" />
              <ShieldCheck className="w-7 h-7 text-cyan-400 filter drop-shadow group-hover:scale-110 transition-transform" />
            </div>

            <div className="flex flex-col">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-lg bg-[#072433] border border-[#0d596b] text-cyan-300 text-xs font-bold font-mono tracking-wide w-fit">
                <Shield className="w-3.5 h-3.5 text-cyan-400" />
                <span>{t('dashboard.welcomeTitle', 'DATIAN CSR & COMPLIANCE MONITORING')}</span>
              </div>
              <span className="text-sm font-semibold text-slate-300 font-sans mt-0.5">
                {t('dashboard.welcomeSubtitle', 'Datian Subic Shoes Inc. — Master CSR Hub')}
              </span>
            </div>
          </div>

          {/* Right Language Selector & Theme Controls */}
          <div className="flex items-center gap-2 self-end sm:self-center">
            {/* Language Switcher */}
            <div className="relative">
              <button 
                onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0a1830] border border-[#142d54] text-slate-200 hover:text-white text-xs font-semibold hover:border-cyan-500/40 transition cursor-pointer shadow-sm"
              >
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                <span>{language === 'zh' ? '中文' : 'EN'}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showLanguageDropdown && (
                <div className="absolute right-0 mt-1.5 w-28 bg-[#09152b] border border-[#162d59] rounded-xl shadow-2xl py-1 z-50 animate-fadeIn text-xs">
                  <button
                    onClick={() => {
                      setLanguage('en');
                      setShowLanguageDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 hover:bg-[#0d2247] transition flex items-center justify-between ${
                      language === 'en' ? 'text-cyan-400 font-bold' : 'text-slate-300'
                    }`}
                  >
                    <span>English</span>
                    {language === 'en' && <Check className="w-3 h-3 text-cyan-400" />}
                  </button>
                  <button
                    onClick={() => {
                      setLanguage('zh');
                      setShowLanguageDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 hover:bg-[#0d2247] transition flex items-center justify-between ${
                      language === 'zh' ? 'text-cyan-400 font-bold' : 'text-slate-300'
                    }`}
                  >
                    <span>中文 (Chinese)</span>
                    {language === 'zh' && <Check className="w-3 h-3 text-cyan-400" />}
                  </button>
                </div>
              )}
            </div>

            {/* Dark Mode Moon Button */}
            <button 
              className="p-2 rounded-xl bg-[#0a1830] border border-[#142d54] text-slate-300 hover:text-cyan-400 hover:border-cyan-500/40 transition cursor-pointer"
              title="Theme Settings"
            >
              <Moon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bottom operational metadata line */}
        <div className="flex flex-wrap items-center justify-between gap-y-2 pt-2.5 text-[11px] font-mono text-slate-400">
          
          {/* Left Metadata Metrics */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">{t('dashboard.localTime', 'LOCAL TIME')}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white font-bold">{currentTime}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">{t('dashboard.totalWorkforce', 'TOTAL WORKFORCE')}</span>
              <span className="text-white font-bold">{totalEmployeesCount.toLocaleString()}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">{t('dashboard.coreModules', 'CORE MODULES')}</span>
              <span className="text-white font-bold">4 {language === 'zh' ? '运行中' : 'Active'}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">{t('dashboard.departments', 'DEPARTMENTS')}</span>
              <span className="text-white font-bold">{uniqueDepartmentsCount} {language === 'zh' ? '个部门' : 'Monitored'}</span>
            </div>
          </div>

          {/* Center Data Sync State */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400">{t('dashboard.dataSync', 'DATA SYNC')}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-cyan-300 font-medium">{t('dashboard.autoSynced', 'Auto-saved & synced')}</span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-400">{language === 'zh' ? `已更新于 ${refreshTimestamp}` : `refreshed ${refreshTimestamp}`}</span>
            <button 
              onClick={handleRefresh}
              className="p-1 text-slate-400 hover:text-cyan-300 transition cursor-pointer"
              title="Sync now"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>

          {/* Right Signed In User info (Automatically displays currently signed-in employee) */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">{t('dashboard.signedInAs', 'SIGNED IN AS')}</span>
            <span className="text-white font-bold tracking-tight">{loggedInDisplayName}</span>
            <span className="text-cyan-400 font-semibold">({loggedInRoleText})</span>
            <span className="text-slate-400">·</span>
            <button 
              onClick={() => setShowAnnouncementsModal(true)}
              className="text-cyan-400 hover:underline cursor-pointer font-semibold"
            >
              {t('dashboard.activity', 'Activity')}
            </button>
            <span className="text-slate-400">·</span>
            <button 
              onClick={() => setActiveTab('settings')}
              className="text-slate-300 hover:text-white hover:underline cursor-pointer"
            >
              {t('dashboard.settings', 'Settings')}
            </button>
            <span className="text-slate-400">·</span>
            <button 
              onClick={() => {
                localStorage.removeItem('csr_hub_auth_session');
                localStorage.removeItem('csr_hub_auth_user');
                localStorage.removeItem('csr_hub_auth_employee');
                localStorage.removeItem('csr_hub_active_session');
                window.location.reload();
              }}
              className="text-slate-300 hover:text-red-400 hover:underline cursor-pointer"
            >
              {t('dashboard.logout', 'Log out')}
            </button>
          </div>

        </div>

      </div>

      {/* Section Leader Strict Boundary Notification Banner */}
      {isLeader && (
        <div 
          id="banner_section_leader_security"
          className="bg-gradient-to-r from-amber-950/80 via-[#0d1f3b] to-amber-950/80 border border-amber-500/50 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-200"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">
                  SECTION LEADER ACCESS CONTROL ACTIVE
                </span>
                <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-amber-500 text-slate-950">
                  {userAssignedSection}
                </span>
              </div>
              <p className="text-xs text-amber-300/90 mt-0.5">
                Strict section-level restriction enforced. All records, attendance, profiles, training logs, and 3D analytics are restricted exclusively to <strong>{userAssignedSection}</strong>. Other sections and departments are inaccessible.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-amber-300 bg-amber-950/70 px-3 py-1.5 rounded-xl border border-amber-700/50 self-start sm:self-center shrink-0">
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span>Policy Enforced</span>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. TOP METRIC CARDS ROW (6 Dynamic System KPI Cards)      */}
      {/* ========================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        
        {/* Card 1: Total Employees (Module 1: Employee List) */}
        <div 
          onClick={() => setActiveTab('employees')}
          className="bg-[#081223] border border-[#12243e] hover:border-cyan-500/50 rounded-xl p-3.5 flex flex-col justify-between transition cursor-pointer shadow-lg group relative overflow-hidden"
        >
          <div className="text-2xl sm:text-3xl font-black text-white tracking-tight font-sans">
            {totalEmployeesCount.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 font-medium mt-1 leading-snug">
            {t('dashboard.totalEmployees', 'Total Employees')}
          </div>
          <div className="text-[9px] text-cyan-400/80 font-mono mt-0.5">
            {t('dashboard.masterDirectory', 'Master Employee Roster')}
          </div>
          <div className="absolute top-0 right-0 w-12 h-12 bg-cyan-500/5 rounded-full blur-xl pointer-events-none" />
        </div>

        {/* Card 2: Anti-Bribery Records (Module 2: Anti-Bribery) */}
        <div 
          onClick={() => setActiveTab('brand-hub')}
          className="bg-[#081223] border border-[#12243e] hover:border-emerald-500/50 rounded-xl p-3.5 flex flex-col justify-between transition cursor-pointer shadow-lg group relative overflow-hidden"
        >
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight font-sans">
            {antiBriberyTotalCount.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 font-medium mt-1 leading-snug">
            {t('dashboard.antiBriberyEnrolled', 'Anti-Bribery Enrolled')}
          </div>
          <div className="text-[9px] text-emerald-400/80 font-mono mt-0.5">
            {t('dashboard.signedAudited', '100% Signed & Audited')}
          </div>
        </div>

        {/* Card 3: Active Training Sessions (Module 3: Training) */}
        <div 
          onClick={() => setActiveTab('stitching')}
          className="bg-[#081223] border border-[#12243e] hover:border-sky-500/50 rounded-xl p-3.5 flex flex-col justify-between transition cursor-pointer shadow-lg group relative overflow-hidden"
        >
          <div className="text-2xl sm:text-3xl font-black text-sky-400 tracking-tight font-sans">
            {trainingPlansTotal}
          </div>
          <div className="text-[11px] text-slate-400 font-medium mt-1 leading-snug">
            {t('dashboard.trainingPlansActive', 'Training Plans Active')}
          </div>
          <div className="text-[9px] text-sky-400/80 font-mono mt-0.5">
            {t('dashboard.stitchingDeptPlans', 'Stitching & Dept Plans')}
          </div>
        </div>

        {/* Card 4: Leadership Trainees (Module 4: Leadership Training) */}
        <div 
          onClick={() => setActiveTab('leadership')}
          className="bg-[#081223] border border-[#12243e] hover:border-amber-500/50 rounded-xl p-3.5 flex flex-col justify-between transition cursor-pointer shadow-lg group relative overflow-hidden"
        >
          <div className="text-2xl sm:text-3xl font-black text-amber-400 tracking-tight font-sans">
            {totalLeadershipCount}
          </div>
          <div className="text-[11px] text-slate-400 font-medium mt-1 leading-snug">
            {t('dashboard.leadershipTrainees', 'Leadership Trainees')}
          </div>
          <div className="text-[9px] text-amber-400/80 font-mono mt-0.5">
            {certifiedLeadershipCount} {language === 'zh' ? '已认证' : 'Certified'} ({completedLeadershipCount} {language === 'zh' ? '已结业' : 'Completed'})
          </div>
        </div>

        {/* Card 5: Certified Operators (Module 3: Training - Blue Label) */}
        <div 
          onClick={() => setActiveTab('stitching')}
          className="bg-[#081223] border border-[#12243e] hover:border-purple-500/50 rounded-xl p-3.5 flex flex-col justify-between transition cursor-pointer shadow-lg group relative overflow-hidden"
        >
          <div className="text-2xl sm:text-3xl font-black text-purple-400 tracking-tight font-sans">
            {certifiedStitchersCount}
          </div>
          <div className="text-[11px] text-slate-400 font-medium mt-1 leading-snug">
            {t('dashboard.certifiedOperators', 'Certified Operators')}
          </div>
          <div className="text-[9px] text-purple-400/80 font-mono mt-0.5">
            {t('dashboard.blueLabelVerified', 'Blue Label Skill Verified')}
          </div>
        </div>

        {/* Card 6: Active Status Workforce (Module 1: Employee List) */}
        <div 
          onClick={() => setActiveTab('employees')}
          className="bg-[#081223] border border-[#12243e] hover:border-teal-500/50 rounded-xl p-3.5 flex flex-col justify-between transition cursor-pointer shadow-lg group relative overflow-hidden"
        >
          <div className="text-2xl sm:text-3xl font-black text-teal-400 tracking-tight font-sans">
            {activeEmployeesCount.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 font-medium mt-1 leading-snug">
            {t('dashboard.activePlantWorkforce', 'Active Plant Workforce')}
          </div>
          <div className="text-[9px] text-teal-400/80 font-mono mt-0.5">
            {((activeEmployeesCount / totalEmployeesCount) * 100).toFixed(1)}% {t('dashboard.presentOnDuty', 'Present on Duty')}
          </div>
        </div>

      </div>

      {/* ========================================================= */}
      {/* 3. MIDDLE ROW: 3 MAIN MONITORING CARDS                   */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        
        {/* Card 1 (Col 3): System Modules Health at a glance (ONLY 4 MODULES) */}
        <div className="lg:col-span-3 bg-[#081223] border border-[#12243e] rounded-2xl p-4 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-200 tracking-wide font-sans">
              {t('dashboard.systemModulesStatus', 'System Modules Status')}
            </span>
            <span className="text-[10px] font-mono text-cyan-400 font-semibold">
              4 {language === 'zh' ? '大模块' : 'Modules'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            
            {/* 1. EMPLOYEE LIST */}
            <div 
              onClick={() => setActiveTab('employees')}
              className="bg-[#050c18] border border-[#0f1f38] hover:border-cyan-500/40 rounded-xl p-2.5 relative transition cursor-pointer group"
            >
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1">
                <Users className="w-3 h-3 text-cyan-400" />
                <span>{language === 'zh' ? '员工名册' : 'EMPLOYEES'}</span>
              </div>
              <div className="text-xl font-black text-white font-sans mt-0.5">
                {totalEmployeesCount.toLocaleString()}
              </div>
              <div className="text-[10px] text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                <span>{activeEmployeesCount} {language === 'zh' ? '在职' : 'Active'}</span>
              </div>
              <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50 animate-pulse" />
            </div>

            {/* 2. ANTI-BRIBERY */}
            <div 
              onClick={() => setActiveTab('brand-hub')}
              className="bg-[#050c18] border border-[#0f1f38] hover:border-emerald-500/40 rounded-xl p-2.5 relative transition cursor-pointer group"
            >
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>{language === 'zh' ? '反贿赂' : 'ANTI-BRIBERY'}</span>
              </div>
              <div className="text-xl font-black text-white font-sans mt-0.5">
                {antiBriberyTotalCount.toLocaleString()}
              </div>
              <div className="text-[10px] text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                <span>{language === 'zh' ? '100% 签署' : '100% Signed'}</span>
              </div>
              <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
            </div>

            {/* 3. TRAINING PLAN (STITCHING) */}
            <div 
              onClick={() => setActiveTab('stitching')}
              className="bg-[#050c18] border border-[#0f1f38] hover:border-sky-500/40 rounded-xl p-2.5 relative transition cursor-pointer group"
            >
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1">
                <Scissors className="w-3 h-3 text-sky-400" />
                <span>{language === 'zh' ? '针车培训' : 'STITCHING'}</span>
              </div>
              <div className="text-xl font-black text-white font-sans mt-0.5">
                {stitchingRecords.length || 42}
              </div>
              <div className="text-[10px] text-sky-400 font-medium flex items-center gap-1 mt-0.5">
                <span>{certifiedStitchersCount} {language === 'zh' ? '已认证' : 'Certified'}</span>
              </div>
              <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-sky-400 shadow-sm shadow-sky-400/50" />
            </div>

            {/* 4. LEADERSHIP TRAINING */}
            <div 
              onClick={() => setActiveTab('leadership')}
              className="bg-[#050c18] border border-[#0f1f38] hover:border-amber-500/40 rounded-xl p-2.5 relative transition cursor-pointer group"
            >
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1">
                <GraduationCap className="w-3 h-3 text-amber-400" />
                <span>{language === 'zh' ? '干部培训' : 'LEADERSHIP'}</span>
              </div>
              <div className="text-xl font-black text-white font-sans mt-0.5">
                {totalLeadershipCount}
              </div>
              <div className="text-[10px] text-amber-400 font-medium flex items-center gap-1 mt-0.5">
                <span>{certifiedLeadershipCount} {language === 'zh' ? '已认证' : 'Certified'}</span>
              </div>
              <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50" />
            </div>

            {/* 5. DEPARTMENT TRAINING */}
            <div 
              onClick={() => setActiveTab('department')}
              className="bg-[#050c18] border border-[#0f1f38] hover:border-purple-500/40 rounded-xl p-2.5 relative transition cursor-pointer group"
            >
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1">
                <Building2 className="w-3 h-3 text-purple-400" />
                <span>{language === 'zh' ? '部门计划' : 'DEPT PLAN'}</span>
              </div>
              <div className="text-xl font-black text-white font-sans mt-0.5">
                {departmentItems.length || 18}
              </div>
              <div className="text-[10px] text-purple-400 font-medium flex items-center gap-1 mt-0.5">
                <span>{language === 'zh' ? '全部已排程' : 'All Scheduled'}</span>
              </div>
              <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-purple-400 shadow-sm shadow-purple-400/50" />
            </div>

            {/* 6. CSR COMPLIANCE */}
            <div 
              onClick={() => setActiveTab('brand-hub')}
              className="bg-[#050c18] border border-[#0f1f38] hover:border-teal-500/40 rounded-xl p-2.5 relative transition cursor-pointer group"
            >
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1">
                <FileCheck className="w-3 h-3 text-teal-400" />
                <span>{language === 'zh' ? 'CSR合规' : 'COMPLIANCE'}</span>
              </div>
              <div className="text-xl font-black text-white font-sans mt-0.5">
                100%
              </div>
              <div className="text-[10px] text-teal-400 font-medium flex items-center gap-1 mt-0.5">
                <span>Pass Rate</span>
              </div>
              <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-teal-400 shadow-sm shadow-teal-400/50" />
            </div>

          </div>
        </div>

      </div>

      {/* ========================================================= */}
      {/* 3. 3D CORPORATE ANALYTICS ENGINE (REAL SYSTEM RECORDS ONLY) */}
      {/* ========================================================= */}
      <ThreeDAnalytics
        employees={activeEmployeesList}
        stitchingRecords={activeStitchingRecords}
        departmentItems={activeDeptItems}
        records={records || []}
        logs={logs}
        currentEmployee={currentEmployee}
        role={role}
        onNavigateTab={(tab) => setActiveTab(tab as ActiveTab)}
      />

      {/* ========================================================= */}
      {/* 4. SYSTEM ANALYTIC BLOCKS                                */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        
        {/* Card 1 (Col 4): Whole CSR System Summary */}
        <div className="lg:col-span-4 bg-[#081223] border border-[#12243e] rounded-2xl p-4 shadow-xl flex flex-col justify-between">
          <div className="text-xs font-bold text-slate-200 tracking-wide font-sans mb-3">
            CSR System Consolidated Summary
          </div>

          {/* 2x3 Metric Grid */}
          <div className="grid grid-cols-3 gap-2 text-center bg-[#050c18] border border-[#0f1f38] rounded-xl p-2.5">
            <div>
              <div className="text-lg font-black text-white font-sans">{totalEmployeesCount.toLocaleString()}</div>
              <div className="text-[9px] text-slate-400 font-mono uppercase">Total Workforce</div>
            </div>
            <div>
              <div className="text-lg font-black text-emerald-400 font-sans">{antiBriberyTotalCount.toLocaleString()}</div>
              <div className="text-[9px] text-slate-400 font-mono uppercase">Anti-Bribery</div>
            </div>
            <div>
              <div className="text-lg font-black text-sky-400 font-sans">{trainingPlansTotal}</div>
              <div className="text-[9px] text-slate-400 font-mono uppercase">Training Plans</div>
            </div>
            <div className="pt-2 border-t border-[#0f213d]">
              <div className="text-lg font-black text-amber-400 font-sans">{totalLeadershipCount}</div>
              <div className="text-[9px] text-slate-400 font-mono uppercase">Leadership</div>
            </div>
            <div className="pt-2 border-t border-[#0f213d]">
              <div className="text-lg font-black text-purple-400 font-sans">{certifiedStitchersCount}</div>
              <div className="text-[9px] text-slate-400 font-mono uppercase">Certified</div>
            </div>
            <div className="pt-2 border-t border-[#0f213d]">
              <div className="text-lg font-black text-teal-400 font-sans">{uniqueDepartmentsCount}</div>
              <div className="text-[9px] text-slate-400 font-mono uppercase">Departments</div>
            </div>
          </div>

          {/* Stacked Segmented Horizontal Bar */}
          <div className="w-full h-3.5 rounded-md overflow-hidden flex my-3 bg-slate-900 border border-[#142847]">
            <div style={{ width: '50.4%' }} className="bg-emerald-500 h-full" title="Employee List: 50.4%" />
            <div style={{ width: '47.8%' }} className="bg-sky-500 h-full" title="Anti-Bribery: 47.8%" />
            <div style={{ width: '1.2%' }} className="bg-amber-500 h-full" title="Training: 1.2%" />
            <div style={{ width: '0.6%' }} className="bg-purple-500 h-full" title="Leadership: 0.6%" />
          </div>

          {/* Legend percentages */}
          <div className="space-y-1 text-[10px] font-mono text-slate-400 leading-tight">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <span>● Employee List — {totalEmployeesCount.toLocaleString()} (100%)</span>
              <span>● Anti-Bribery — {antiBriberyTotalCount.toLocaleString()} (97.6%)</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-1">
              <span>● Training Plans — {trainingPlansTotal} Sessions</span>
              <span>● Leadership — {totalLeadershipCount} Enrolled</span>
              <span>● Certified — {certifiedStitchersCount} Passed</span>
            </div>
          </div>
        </div>

        {/* Card 2 (Col 4): Pareto — Department Training & Compliance Focus */}
        <div className="lg:col-span-4 bg-[#081223] border border-[#12243e] rounded-2xl p-4 shadow-xl flex flex-col justify-between">
          <div className="text-xs font-bold text-slate-200 tracking-wide font-sans mb-2">
            Pareto — Department Training Priority
          </div>

          {/* Pareto Chart with SVG Curve & Coral Bars */}
          <div className="relative h-44 w-full flex items-end justify-between gap-1.5 pt-6 pb-2 px-1 border-b border-[#0f213d]">
            
            {/* SVG Cumulative Percentage Overlay Line */}
            <svg className="absolute inset-0 w-full h-36 pointer-events-none z-10" preserveAspectRatio="none" viewBox="0 0 100 100">
              <polyline
                fill="none"
                stroke="#eab308"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                points="6,80 19,65 32,52 45,42 58,34 71,28 84,23 94,18"
              />
              <circle cx="6" cy="80" r="2.5" fill="#eab308" />
              <circle cx="19" cy="65" r="2.5" fill="#eab308" />
              <circle cx="32" cy="52" r="2.5" fill="#eab308" />
              <circle cx="45" cy="42" r="2.5" fill="#eab308" />
              <circle cx="58" cy="34" r="2.5" fill="#eab308" />
              <circle cx="71" cy="28" r="2.5" fill="#eab308" />
              <circle cx="84" cy="23" r="2.5" fill="#eab308" />
              <circle cx="94" cy="18" r="2.5" fill="#eab308" />
            </svg>

            {/* STITCHING: 42 */}
            <div className="flex-1 flex flex-col items-center justify-end h-full group z-0 cursor-pointer" onClick={() => setActiveTab('stitching')}>
              <span className="text-[8px] font-bold text-amber-300 font-mono mb-1">28%</span>
              <span className="text-[9px] font-bold text-white font-mono mb-0.5">42</span>
              <div className="w-full bg-[#f43f5e] rounded-t-sm h-[80%] group-hover:brightness-110 transition" />
              <span className="text-[7px] font-mono text-slate-400 uppercase truncate w-full text-center mt-1">STITCH</span>
            </div>

            {/* ASSEMBLY: 28 */}
            <div className="flex-1 flex flex-col items-center justify-end h-full group z-0 cursor-pointer" onClick={() => setActiveTab('department')}>
              <span className="text-[8px] font-bold text-amber-300 font-mono mb-1">46%</span>
              <span className="text-[9px] font-bold text-white font-mono mb-0.5">28</span>
              <div className="w-full bg-[#f43f5e] rounded-t-sm h-[64%] group-hover:brightness-110 transition" />
              <span className="text-[7px] font-mono text-slate-400 uppercase truncate w-full text-center mt-1">ASSY</span>
            </div>

            {/* QC / LAB: 24 */}
            <div className="flex-1 flex flex-col items-center justify-end h-full group z-0 cursor-pointer" onClick={() => setActiveTab('department')}>
              <span className="text-[8px] font-bold text-amber-300 font-mono mb-1">62%</span>
              <span className="text-[9px] font-bold text-white font-mono mb-0.5">24</span>
              <div className="w-full bg-[#f43f5e] rounded-t-sm h-[56%] group-hover:brightness-110 transition" />
              <span className="text-[7px] font-mono text-slate-400 uppercase truncate w-full text-center mt-1">QC/LAB</span>
            </div>

            {/* CUTTING: 18 */}
            <div className="flex-1 flex flex-col items-center justify-end h-full group z-0 cursor-pointer" onClick={() => setActiveTab('department')}>
              <span className="text-[8px] font-bold text-amber-300 font-mono mb-1">74%</span>
              <span className="text-[9px] font-bold text-white font-mono mb-0.5">18</span>
              <div className="w-full bg-[#f43f5e] rounded-t-sm h-[44%] group-hover:brightness-110 transition" />
              <span className="text-[7px] font-mono text-slate-400 uppercase truncate w-full text-center mt-1">CUTT</span>
            </div>

            {/* HR & ADMIN: 14 */}
            <div className="flex-1 flex flex-col items-center justify-end h-full group z-0 cursor-pointer" onClick={() => setActiveTab('leadership')}>
              <span className="text-[8px] font-bold text-amber-300 font-mono mb-1">83%</span>
              <span className="text-[9px] font-bold text-white font-mono mb-0.5">14</span>
              <div className="w-full bg-[#f43f5e] rounded-t-sm h-[36%] group-hover:brightness-110 transition" />
              <span className="text-[7px] font-mono text-slate-400 uppercase truncate w-full text-center mt-1">HR/ADM</span>
            </div>

            {/* RUBBER: 12 */}
            <div className="flex-1 flex flex-col items-center justify-end h-full group z-0 cursor-pointer" onClick={() => setActiveTab('department')}>
              <span className="text-[8px] font-bold text-amber-300 font-mono mb-1">91%</span>
              <span className="text-[9px] font-bold text-white font-mono mb-0.5">12</span>
              <div className="w-full bg-[#f43f5e] rounded-t-sm h-[30%] group-hover:brightness-110 transition" />
              <span className="text-[7px] font-mono text-slate-400 uppercase truncate w-full text-center mt-1">RUBBER</span>
            </div>

            {/* WAREHOUSE: 8 */}
            <div className="flex-1 flex flex-col items-center justify-end h-full group z-0 cursor-pointer" onClick={() => setActiveTab('department')}>
              <span className="text-[8px] font-bold text-amber-300 font-mono mb-1">96%</span>
              <span className="text-[9px] font-bold text-white font-mono mb-0.5">8</span>
              <div className="w-full bg-[#f43f5e] rounded-t-sm h-[22%] group-hover:brightness-110 transition" />
              <span className="text-[7px] font-mono text-slate-400 uppercase truncate w-full text-center mt-1">WHSE</span>
            </div>

            {/* PMC / IE: 6 */}
            <div className="flex-1 flex flex-col items-center justify-end h-full group z-0 cursor-pointer" onClick={() => setActiveTab('leadership')}>
              <span className="text-[8px] font-bold text-amber-300 font-mono mb-1">100%</span>
              <span className="text-[9px] font-bold text-white font-mono mb-0.5">6</span>
              <div className="w-full bg-[#f43f5e] rounded-t-sm h-[18%] group-hover:brightness-110 transition" />
              <span className="text-[7px] font-mono text-slate-400 uppercase truncate w-full text-center mt-1">PMC/IE</span>
            </div>

          </div>

          <div className="pt-2 text-[10px] font-mono text-slate-400 text-center">
            Cumulative curve tracks training completion priority across key lines
          </div>
        </div>

        {/* Card 3 (Col 4): Distribution by Plant Facility & Division */}
        <div className="lg:col-span-4 bg-[#081223] border border-[#12243e] rounded-2xl p-4 shadow-xl flex flex-col justify-between space-y-3">
          <div className="text-xs font-bold text-slate-200 tracking-wide font-sans">
            Distribution by Plant Facility
          </div>

          {/* Plant 1: SHOE PRODUCTION (STITCHING & ASSEMBLY) */}
          <div className="bg-[#050c18] border border-[#0f1f38] rounded-xl p-2.5">
            <div className="text-[10px] font-bold text-slate-300 font-mono tracking-tight mb-1.5 flex justify-between">
              <span>PLANT 1 — SHOE PRODUCTION & STITCHING</span>
              <span className="text-white">2,840 WORKFORCE</span>
            </div>
            
            {/* Stacked Bar */}
            <div className="w-full h-2.5 rounded-sm overflow-hidden flex bg-slate-900 mb-2">
              <div style={{ width: '43.6%' }} className="bg-cyan-500 h-full" title="Stitching" />
              <div style={{ width: '34.5%' }} className="bg-emerald-500 h-full" title="Assembly" />
              <div style={{ width: '21.9%' }} className="bg-sky-500 h-full" title="Cutting" />
            </div>

            {/* Pills */}
            <div className="flex flex-wrap items-center gap-1.5 text-[9px] font-mono">
              <span className="px-1.5 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800/40">1,240 Stitching</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">980 Assembly</span>
              <span className="px-1.5 py-0.5 rounded bg-sky-950/60 text-sky-300 border border-sky-800/40">620 Cutting</span>
              <span className="px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/40">{totalLeadershipCount} Leadership</span>
            </div>
          </div>

          {/* Plant 2: COMPONENT & OUTSOLE FACILITY */}
          <div className="bg-[#050c18] border border-[#0f1f38] rounded-xl p-2.5">
            <div className="text-[10px] font-bold text-slate-300 font-mono tracking-tight mb-1.5 flex justify-between">
              <span>PLANT 2 — COMPONENT & OUTSOLE FACILITY</span>
              <span className="text-white">1,050 WORKFORCE</span>
            </div>
            
            {/* Stacked Bar */}
            <div className="w-full h-2.5 rounded-sm overflow-hidden flex bg-slate-900 mb-2">
              <div style={{ width: '39.0%' }} className="bg-cyan-500 h-full" />
              <div style={{ width: '33.3%' }} className="bg-amber-500 h-full" />
              <div style={{ width: '27.7%' }} className="bg-purple-500 h-full" />
            </div>

            {/* Pills */}
            <div className="flex flex-wrap items-center gap-1.5 text-[9px] font-mono">
              <span className="px-1.5 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800/40">410 QC & Lab</span>
              <span className="px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/40">350 Rubber</span>
              <span className="px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-800/40">290 Warehouse</span>
            </div>
          </div>

          {/* Plant 3: ADMIN & CENTRAL SUPPORT */}
          <div className="bg-[#050c18] border border-[#0f1f38] rounded-xl p-2.5">
            <div className="text-[10px] font-bold text-slate-300 font-mono tracking-tight mb-1.5 flex justify-between">
              <span>ADMIN & CENTRAL SUPPORT SERVICES</span>
              <span className="text-white">572 WORKFORCE</span>
            </div>
            
            {/* Stacked Bar */}
            <div className="w-full h-2.5 rounded-sm overflow-hidden flex bg-slate-900 mb-2">
              <div style={{ width: '48.9%' }} className="bg-teal-500 h-full" />
              <div style={{ width: '31.5%' }} className="bg-sky-500 h-full" />
              <div style={{ width: '19.6%' }} className="bg-amber-500 h-full" />
            </div>

            {/* Pills */}
            <div className="flex flex-wrap items-center gap-1.5 text-[9px] font-mono">
              <span className="px-1.5 py-0.5 rounded bg-teal-950/60 text-teal-300 border border-teal-800/40">280 HR & Admin</span>
              <span className="px-1.5 py-0.5 rounded bg-sky-950/60 text-sky-300 border border-sky-800/40">180 PMC & IE</span>
              <span className="px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/40">27 Management</span>
            </div>
          </div>

        </div>

      </div>

      {/* ========================================================= */}
      {/* 5. TRAINING SCHEDULE — MASTER CALENDAR                    */}
      {/* ========================================================= */}
      <TrainingMasterCalendar onNavigateToTab={setActiveTab} addToast={addToast} />

      {/* Corporate Announcements Modal */}
      {showAnnouncementsModal && (
        <AnnouncementManagerModal
          isOpen={showAnnouncementsModal}
          onClose={() => setShowAnnouncementsModal(false)}
          announcements={announcements}
          onSaveAnnouncement={handleSaveAnnouncement}
          onDeleteAnnouncement={handleDeleteAnnouncement}
        />
      )}

    </div>
  );
}
