/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users,
  Search,
  Bell,
  MessageSquare,
  LogOut,
  Shield,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Info,
  X,
  Sparkles,
  Menu,
  ChevronRight,
  UserCheck,
  Building2,
  RefreshCw,
  SlidersHorizontal,
  ChevronDown,
  Clock,
  User,
  Laptop,
  BellRing
} from 'lucide-react';

import {
  ActiveTab,
  UserRole,
  Employee,
  TrainingLog,
  TrainingCourse,
  TraineeRecord,
  TrainingDoc,
  StitchingRecord,
  DepartmentItem,
  DepartmentFolder,
  DepartmentTrainingRecord,
  DepartmentCustomField,
  SystemNotification,
  AuthenticatedEmployee,
  StartupMediaConfig
} from './types';

import {
  DEFAULT_TRAINING_LOGS,
  DEFAULT_COURSES,
  DEFAULT_TRAINEE_RECORDS,
  DEFAULT_DOCUMENTS,
  DEFAULT_STITCHING_RECORDS,
  DEFAULT_DEPARTMENT_ITEMS,
  DEFAULT_NOTIFICATIONS,
  INITIAL_EMPLOYEES,
  getSavedEmployees,
  saveSavedEmployees,
  getSavedState,
  saveStateToStorage
} from './data';

import {
  DEFAULT_DEPARTMENT_FOLDERS,
  DEFAULT_TRAINING_RECORDS,
  DEFAULT_CUSTOM_FIELDS
} from './components/departmentTraining/defaultData';

import {
  fetchEmployeesFromSupabase,
  mergeSupabaseEmployeesWithLocal
} from './services/employeeService';

import {
  AppearanceSettings,
  getInitialAppearance,
  fetchServerAppearance,
  applyAppearanceToDOM,
  saveAppearanceSettings,
  resetAppearanceSettings
} from './services/appearanceService';

import Sidebar from './components/Sidebar';
import DashboardOverview from './components/DashboardOverview';
import EmployeesView from './components/EmployeesView';
import LeadershipTrainingView from './components/LeadershipTrainingView';
import TrainingPlanStitchingView from './components/TrainingPlanStitchingView';
import DepartmentTrainingView from './components/DepartmentTrainingView';
import ReportsView from './components/ReportsView';
import CalendarView from './components/CalendarView';
import DocumentsView from './components/DocumentsView';
import OPLDocumentStudio from './components/opl/OPLDocumentStudio';
import SettingsView from './components/SettingsView';
import AntiBriberyView from './components/AntiBriberyView';
import MessageHubView from './components/MessageHubView';
import BackupSyncCenter from './components/BackupSyncCenter';
import MultiLogoSuite from './components/MultiLogoSuite';
import StartupSplashScreen from './components/StartupSplashScreen';
import LoginScreen from './components/LoginScreen';
import DatianLogo from './components/DatianLogo';
import RealTimeClock from './components/RealTimeClock';
import SyncStatusBadge from './components/SyncStatusBadge';
import { useLanguage } from './services/i18n';
import { 
  initRealtimeSync, 
  subscribeToRealtimeSync, 
  fetchMasterBootstrap, 
  syncEntityToMaster,
  logAuditEventToServer,
  logoutEmployeeSession
} from './services/realtimeSync';

import {
  initNotificationServiceWorker,
  showDesktopChatMessageNotification,
  requestDesktopNotificationPermission,
  getNotificationPermissionStatus,
  triggerTestDesktopNotification,
  isDesktopNotificationSupported
} from './services/desktopNotifications';

interface ToastItem {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'info';
}

export default function App() {
  const { language, setLanguage, t } = useLanguage();

  // 1. Authentication State - strictly requires successful login session
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('csr_hub_auth_session');
      const rawEmp = localStorage.getItem('csr_hub_auth_employee');
      return saved === 'true' && !!rawEmp;
    } catch {
      return false;
    }
  });

  const [authenticatedUser, setAuthenticatedUser] = useState<string>(() => {
    try {
      return localStorage.getItem('csr_hub_auth_user') || '';
    } catch {
      return '';
    }
  });

  const [currentEmployee, setCurrentEmployee] = useState<AuthenticatedEmployee | null>(() => {
    try {
      const raw = localStorage.getItem('csr_hub_auth_employee');
      if (raw) return JSON.parse(raw);
      return null;
    } catch {
      return null;
    }
  });

  const currentEmployeeRef = useRef<AuthenticatedEmployee | null>(currentEmployee);
  useEffect(() => {
    currentEmployeeRef.current = currentEmployee;
  }, [currentEmployee]);

  // 2. Startup Splash Screen - always runs on application launch
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [startupMedia, setStartupMedia] = useState<StartupMediaConfig | null>(() => {
    try {
      const stored = localStorage.getItem('csr_startup_media_config');
      if (stored) return JSON.parse(stored);
    } catch {}
    return null;
  });

  // Fetch startup media configuration on initialization
  useEffect(() => {
    // Purge obsolete legacy sample image from localStorage
    try {
      const stored = localStorage.getItem('csr_startup_media_config');
      if (stored && (stored.includes('Your_paragraph_text') || stored.includes('Your paragraph text'))) {
        localStorage.removeItem('csr_startup_media_config');
      }
    } catch {}

    fetch('/api/startup/media')
      .then(res => res.json())
      .then(data => {
        const media = data.startupMedia !== undefined ? data.startupMedia : data.media;
        if (data.success && media) {
          if (media.url && (media.url.includes('Your_paragraph_text') || media.url.includes('Your paragraph text'))) {
            setStartupMedia(null);
            try { localStorage.removeItem('csr_startup_media_config'); } catch {}
          } else {
            setStartupMedia(media);
            try {
              localStorage.setItem('csr_startup_media_config', JSON.stringify(media));
            } catch {}
          }
        } else if (data.success && (data.startupMedia === null || data.media === null)) {
          setStartupMedia(null);
          try { localStorage.removeItem('csr_startup_media_config'); } catch {}
        }
      })
      .catch(err => console.warn('[App] Could not fetch startup media:', err));
  }, []);

  // Fetch official persisted company logo on mount
  useEffect(() => {
    fetch('/api/company-logo')
      .then(res => res.json())
      .then(data => {
        if (data && data.success && data.logo) {
          setCompanyLogo(data.logo);
          try {
            localStorage.setItem('tms_company_logo', data.logo);
            localStorage.setItem('csr_company_logo', data.logo);
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  // Background Cloud Sync Status
  const [syncStatus, setSyncStatus] = useState<'syncing' | 'synced' | 'cached' | 'offline'>('syncing');

  // 3. User Role & Preferences
  const [role, setRole] = useState<UserRole>(() => {
    try {
      const savedRole = localStorage.getItem('tms_user_role');
      return (savedRole === 'Admin' || savedRole === 'User') ? savedRole : 'Admin';
    } catch {
      return 'Admin';
    }
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('tms_dark_mode') === 'true';
    } catch {
      return false;
    }
  });

  const [companyLogo, setCompanyLogo] = useState<string | null>(() => {
    try {
      const stored = localStorage.getItem('tms_company_logo');
      return stored || null;
    } catch {
      return null;
    }
  });

  // Appearance & Visual Theme Customization State
  const [appearance, setAppearance] = useState<AppearanceSettings>(() => {
    const initial = getInitialAppearance();
    applyAppearanceToDOM(initial);
    return initial;
  });

  useEffect(() => {
    applyAppearanceToDOM(appearance);
  }, [appearance]);

  useEffect(() => {
    fetchServerAppearance().then(remote => {
      if (remote) {
        setAppearance(remote);
        applyAppearanceToDOM(remote);
      }
    });
  }, []);

  const handleSaveAppearance = async (newSettings: AppearanceSettings) => {
    const saved = await saveAppearanceSettings(newSettings, currentEmployee?.name || role);
    setAppearance(saved);
  };

  const handleResetAppearance = async () => {
    const reset = await resetAppearanceSettings(currentEmployee?.name || role);
    setAppearance(reset);
  };

  const [isLogoSuiteOpen, setIsLogoSuiteOpen] = useState<boolean>(false);
  const [searchQueryGlobal, setSearchQueryGlobal] = useState<string>('');
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState<boolean>(false);
  const [showUserDropdown, setShowUserDropdown] = useState<boolean>(false);

  // Live Real-Time Clock
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const clockTimeString = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  const clockDateString = currentTime.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  const clockDayString = currentTime.toLocaleDateString('en-US', {
    weekday: 'long'
  });

  // 4. Toast System
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((title: string, message: string, type: 'success' | 'warning' | 'info' = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setToasts(prev => [...prev.slice(-4), { id, title, message, type }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // 5. Core Data Records (Instant local cache hydration)
  const [employees, setEmployees] = useState<Employee[]>(() => getSavedEmployees());
  const [logs, setLogs] = useState<TrainingLog[]>(() => getSavedState('logs', DEFAULT_TRAINING_LOGS));
  const [courses, setCourses] = useState<TrainingCourse[]>(() => getSavedState('courses', DEFAULT_COURSES));
  const [records, setRecords] = useState<TraineeRecord[]>(() => getSavedState('records', DEFAULT_TRAINEE_RECORDS));
  const [documents, setDocuments] = useState<TrainingDoc[]>(() => getSavedState('documents', DEFAULT_DOCUMENTS));
  const [stitchingRecords, setStitchingRecords] = useState<StitchingRecord[]>(() => getSavedState('stitching', DEFAULT_STITCHING_RECORDS));
  const [departmentItems, setDepartmentItems] = useState<DepartmentItem[]>(() => getSavedState('department', DEFAULT_DEPARTMENT_ITEMS));
  const [departmentFolders, setDepartmentFolders] = useState<DepartmentFolder[]>(() => {
    try {
      const saved = localStorage.getItem('csr_cached_departmentFolders');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_DEPARTMENT_FOLDERS;
  });
  const [departmentTrainingRecords, setDepartmentTrainingRecords] = useState<DepartmentTrainingRecord[]>(() => {
    try {
      const saved = localStorage.getItem('csr_cached_departmentTrainingRecords');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_TRAINING_RECORDS;
  });
  const [departmentCustomFields, setDepartmentCustomFields] = useState<DepartmentCustomField[]>(() => {
    try {
      const saved = localStorage.getItem('csr_cached_departmentCustomFields');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_CUSTOM_FIELDS;
  });
  const [notifications, setNotifications] = useState<SystemNotification[]>(() => getSavedState('notifications', DEFAULT_NOTIFICATIONS));

  // 5.1 Realtime Unread Messages & Notification System
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('csr_chat_channels');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.reduce((acc: number, c: any) => acc + (c.unreadCount || 0), 0);
        }
      }
      return 3;
    } catch {
      return 3;
    }
  });

  interface IncomingMessageAlert {
    id: string;
    chatId: string;
    senderName: string;
    senderRole?: string;
    senderDepartment?: string;
    senderAvatar?: string;
    text: string;
    imagePreview?: string;
    timestamp: string;
  }

  const [selectedChatIdForMessages, setSelectedChatIdForMessages] = useState<string | null>(null);
  const [incomingMessageAlerts, setIncomingMessageAlerts] = useState<IncomingMessageAlert[]>([]);

  const activeTabRef = useRef<ActiveTab>(activeTab);
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  const selectedChatIdRef = useRef<string | null>(selectedChatIdForMessages);
  useEffect(() => {
    selectedChatIdRef.current = selectedChatIdForMessages;
  }, [selectedChatIdForMessages]);

  const handleOpenMessageAlert = (alert: IncomingMessageAlert) => {
    setSelectedChatIdForMessages(alert.chatId);
    setActiveTab('messages');
    setIncomingMessageAlerts(prev => prev.filter(a => a.id !== alert.id));
    setUnreadMessagesCount(prev => Math.max(0, prev - 1));
  };

  const handleDismissMessageAlert = (alertId: string) => {
    setIncomingMessageAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  // 5.2 Desktop & Background OS Notification Service
  const [desktopNotifPermission, setDesktopNotifPermission] = useState<NotificationPermission | 'unsupported'>(() => getNotificationPermissionStatus());
  const [showDesktopPrompt, setShowDesktopPrompt] = useState<boolean>(() => {
    if (!isDesktopNotificationSupported()) return false;
    const dismissed = localStorage.getItem('csr_dismissed_desktop_prompt');
    return Notification.permission === 'default' && dismissed !== 'true';
  });

  const handleEnableDesktopNotifications = async () => {
    const perm = await requestDesktopNotificationPermission();
    setDesktopNotifPermission(perm);
    setShowDesktopPrompt(false);
    if (perm === 'granted') {
      addToast('Desktop Alerts Activated', 'You will now receive desktop notifications even when this window is minimized or in the background.', 'success');
      await triggerTestDesktopNotification();
    } else if (perm === 'denied') {
      addToast('Notifications Blocked', 'Please allow notifications in your browser settings to receive desktop alerts.', 'warning');
    }
  };

  const handleDismissDesktopPrompt = () => {
    setShowDesktopPrompt(false);
    localStorage.setItem('csr_dismissed_desktop_prompt', 'true');
  };

  useEffect(() => {
    initNotificationServiceWorker();

    const handleOpenFromNotification = (e: any) => {
      const targetChatId = e.detail?.chatId;
      if (targetChatId) {
        setActiveTab('messages');
        setSelectedChatIdForMessages(targetChatId);
        setUnreadMessagesCount(prev => Math.max(0, prev - 1));
      }
    };

    window.addEventListener('open-chat-from-notification', handleOpenFromNotification);

    // Also check if opened from notification with ?tab=messages&chatId=...
    try {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab') as ActiveTab | null;
      const chatIdParam = params.get('chatId');
      if (tabParam) {
        setActiveTab(tabParam);
      }
      if (chatIdParam) {
        setSelectedChatIdForMessages(chatIdParam);
      }
    } catch {}

    return () => {
      window.removeEventListener('open-chat-from-notification', handleOpenFromNotification);
    };
  }, []);

  // 6. Navigation Back Handler Stack
  const backHandlersRef = useRef<(() => boolean)[]>([]);

  const registerBackHandler = useCallback((handler: () => boolean) => {
    backHandlersRef.current.push(handler);
    return () => {
      backHandlersRef.current = backHandlersRef.current.filter(h => h !== handler);
    };
  }, []);

  // Browser back / ESC handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isLogoSuiteOpen) {
          setIsLogoSuiteOpen(false);
          return;
        }
        if (showNotificationsDropdown) {
          setShowNotificationsDropdown(false);
          return;
        }
        if (showUserDropdown) {
          setShowUserDropdown(false);
          return;
        }
        const handlers = backHandlersRef.current;
        for (let i = handlers.length - 1; i >= 0; i--) {
          if (handlers[i]()) {
            e.preventDefault();
            return;
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLogoSuiteOpen, showNotificationsDropdown, showUserDropdown]);

  // 7. Multi-PC Master Online Database Realtime Synchronization
  const isSyncingFromRemoteRef = useRef(false);
  const isBootstrappedRef = useRef(false);

  const handleFullMasterResync = useCallback(async () => {
    try {
      const masterData = await fetchMasterBootstrap();
      if (!masterData) {
        isBootstrappedRef.current = true;
        return;
      }

      isSyncingFromRemoteRef.current = true;

      // Authoritative employees from cloud/server
      if (masterData.employees && Array.isArray(masterData.employees) && masterData.employees.length > 0) {
        setEmployees(masterData.employees);
        saveSavedEmployees(masterData.employees);
      }

      // Merge logs
      if (masterData.logs && Array.isArray(masterData.logs) && masterData.logs.length > 0) {
        setLogs(prev => {
          const map = new Map<string, TrainingLog>(prev.map(l => [l.id, l]));
          masterData.logs.forEach((l: TrainingLog) => map.set(l.id, l));
          const merged = Array.from(map.values());
          saveStateToStorage('logs', merged);
          return merged;
        });
      }

      // Merge courses
      if (masterData.courses && Array.isArray(masterData.courses) && masterData.courses.length > 0) {
        setCourses(masterData.courses);
        saveStateToStorage('courses', masterData.courses);
      }

      // Merge records
      if (masterData.records && Array.isArray(masterData.records) && masterData.records.length > 0) {
        setRecords(masterData.records);
        saveStateToStorage('records', masterData.records);
      }

      // Merge documents
      if (masterData.documents && Array.isArray(masterData.documents) && masterData.documents.length > 0) {
        setDocuments(prev => {
          const map = new Map<string, TrainingDoc>(prev.map(d => [d.id, d]));
          masterData.documents.forEach((d: TrainingDoc) => map.set(d.id, d));
          const merged = Array.from(map.values());
          saveStateToStorage('documents', merged);
          return merged;
        });
      }

      // Merge stitching records
      if (masterData.stitchingRecords && Array.isArray(masterData.stitchingRecords) && masterData.stitchingRecords.length > 0) {
        setStitchingRecords(masterData.stitchingRecords);
        saveStateToStorage('stitching', masterData.stitchingRecords);
      }

      // Merge department items
      if (masterData.departmentItems && Array.isArray(masterData.departmentItems) && masterData.departmentItems.length > 0) {
        setDepartmentItems(masterData.departmentItems);
        saveStateToStorage('department', masterData.departmentItems);
      }

      // Merge department folders & training records & custom fields
      if (masterData.departmentFolders && Array.isArray(masterData.departmentFolders) && masterData.departmentFolders.length > 0) {
        setDepartmentFolders(masterData.departmentFolders);
        saveStateToStorage('departmentFolders', masterData.departmentFolders);
      }
      if (masterData.departmentTrainingRecords && Array.isArray(masterData.departmentTrainingRecords) && masterData.departmentTrainingRecords.length > 0) {
        setDepartmentTrainingRecords(masterData.departmentTrainingRecords);
        saveStateToStorage('departmentTrainingRecords', masterData.departmentTrainingRecords);
      }
      if (masterData.departmentCustomFields && Array.isArray(masterData.departmentCustomFields) && masterData.departmentCustomFields.length > 0) {
        setDepartmentCustomFields(masterData.departmentCustomFields);
        saveStateToStorage('departmentCustomFields', masterData.departmentCustomFields);
      }

      // Sync logo
      if (masterData.companyLogo) {
        setCompanyLogo(masterData.companyLogo);
      }

      // Sync startup media configuration
      if (masterData.startupMedia) {
        setStartupMedia(masterData.startupMedia);
        try {
          localStorage.setItem('csr_startup_media_config', JSON.stringify(masterData.startupMedia));
        } catch {}
      }

      setTimeout(() => {
        isSyncingFromRemoteRef.current = false;
        isBootstrappedRef.current = true;
      }, 500);

      setSyncStatus('synced');
    } catch (err) {
      console.warn('[Realtime Sync] Resync error:', err);
      isSyncingFromRemoteRef.current = false;
      isBootstrappedRef.current = true;
    }
  }, []);

  // Initialize Real-Time SSE Stream and Master Bootstrap on Mount
  useEffect(() => {
    const cleanupStream = initRealtimeSync();

    // Initial Master Database Hydration
    handleFullMasterResync();

    // Listen to real-time events broadcast from other connected PCs
    const unsubscribeSync = subscribeToRealtimeSync((event) => {
      isSyncingFromRemoteRef.current = true;
      console.log(`[Realtime Event Received from Peer]: ${event.entity}`, event.type);

      if (event.type === 'SYSTEM_RESTORED') {
        console.log('[Realtime Event] System restored, refreshing all data from master...');
        handleFullMasterResync();
        addToast('System Restored', 'Database has been synchronized with the latest restored snapshot.', 'success');
        setTimeout(() => {
          isSyncingFromRemoteRef.current = false;
        }, 500);
        return;
      }

      switch (event.entity) {
        case 'employees':
          if (Array.isArray(event.data)) {
            setEmployees(event.data);
            saveSavedEmployees(event.data);
          }
          break;
        case 'logs':
          if (Array.isArray(event.data)) {
            setLogs(event.data);
            saveStateToStorage('logs', event.data);
          }
          break;
        case 'courses':
          if (Array.isArray(event.data)) {
            setCourses(event.data);
            saveStateToStorage('courses', event.data);
          }
          break;
        case 'records':
          if (Array.isArray(event.data)) {
            setRecords(event.data);
            saveStateToStorage('records', event.data);
          }
          break;
        case 'documents':
          if (event.type === 'FILE_UPLOADED' && event.data?.docItem) {
            setDocuments(prev => [event.data.docItem, ...prev.filter(d => d.id !== event.data.docItem.id)]);
          } else if (event.type === 'FILE_DELETED' && event.data?.fileId) {
            setDocuments(prev => prev.filter(d => d.id !== event.data.fileId));
          } else if (Array.isArray(event.data)) {
            setDocuments(event.data);
            saveStateToStorage('documents', event.data);
          }
          break;
        case 'stitching':
        case 'stitchingRecords':
          if (Array.isArray(event.data)) {
            setStitchingRecords(event.data);
            saveStateToStorage('stitching', event.data);
          }
          break;
        case 'department':
        case 'departmentItems':
          if (Array.isArray(event.data)) {
            setDepartmentItems(event.data);
            saveStateToStorage('department', event.data);
          }
          break;
        case 'departmentFolders':
          if (Array.isArray(event.data)) {
            setDepartmentFolders(event.data);
            saveStateToStorage('departmentFolders', event.data);
          }
          break;
        case 'departmentTrainingRecords':
          if (Array.isArray(event.data)) {
            setDepartmentTrainingRecords(event.data);
            saveStateToStorage('departmentTrainingRecords', event.data);
          }
          break;
        case 'departmentCustomFields':
          if (Array.isArray(event.data)) {
            setDepartmentCustomFields(event.data);
            saveStateToStorage('departmentCustomFields', event.data);
          }
          break;
        case 'companyLogo':
          setCompanyLogo(event.data);
          break;
        case 'startupMedia':
          setStartupMedia(event.data);
          try {
            localStorage.setItem('csr_startup_media_config', JSON.stringify(event.data));
          } catch {}
          break;
        case 'appearanceSettings':
          if (event.data) {
            setAppearance(event.data);
            applyAppearanceToDOM(event.data);
            try {
              localStorage.setItem('datian_csr_appearance_settings_v2', JSON.stringify(event.data));
            } catch {}
          }
          break;
        case 'notifications':
          if (Array.isArray(event.data)) {
            setNotifications(event.data);
            saveStateToStorage('notifications', event.data);
          }
          break;
        default:
          break;
      }

      setTimeout(() => {
        isSyncingFromRemoteRef.current = false;
      }, 500);

      // Realtime Startup Media Update Broadcast
      if (event.type === 'STARTUP_MEDIA_UPDATED' && event.data !== undefined) {
        setStartupMedia(event.data);
        try {
          localStorage.setItem('csr_startup_media_config', JSON.stringify(event.data));
        } catch {}
      }

      // Realtime Incoming Chat Message Notification & Alert Trigger with Strict Recipient Routing
      if (event.type === 'CHAT_MESSAGE_SENT' && event.data?.chatId && event.data?.message) {
        const { chatId, message, isPrivateDM, senderId, senderEmployeeNo, recipientId, recipientEmployeeNo } = event.data;
        
        const activeEmp = currentEmployeeRef.current || (function() {
          try {
            const saved = localStorage.getItem('csr_hub_auth_employee');
            return saved ? JSON.parse(saved) : null;
          } catch {
            return null;
          }
        })();

        const myId = (activeEmp?.id || '').toLowerCase();
        const myNo = (activeEmp?.employeeNo || '').toLowerCase();
        const myName = (activeEmp?.name || '').toLowerCase();

        const sId = (senderId || message.senderId || '').toLowerCase();
        const sNo = (senderEmployeeNo || message.senderEmployeeNo || '').toLowerCase();
        const sName = (message.senderName || '').toLowerCase();

        const rId = (recipientId || message.recipientId || '').toLowerCase();
        const rNo = (recipientEmployeeNo || message.recipientEmployeeNo || '').toLowerCase();
        const rName = (message.recipientName || '').toLowerCase();

        const isSelf = (myId && sId === myId) || (myNo && sNo === myNo) || (myName && sName === myName);

        // In 1-to-1 Private DMs: ONLY show alert/sound if current user is the intended recipient!
        const isPrivate = isPrivateDM || chatId.startsWith('dm_');
        let shouldDeliverAlert = !isSelf;

        if (isPrivate && chatId !== 'dm-ai') {
          const dmParts = chatId.replace(/^dm_/, '').toLowerCase().split('_');
          const isTargetRecipient = 
            (myId && (rId === myId || dmParts.includes(myId))) ||
            (myNo && (rNo === myNo || dmParts.includes(myNo))) ||
            (rName && rName === myName);

          if (!isTargetRecipient) {
            // Drop completely — private conversation between other colleagues!
            shouldDeliverAlert = false;
          }
        }

        if (shouldDeliverAlert) {
          // Play audio notification chime
          try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15);
            gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.18);
          } catch {}

          // Increment unread count
          setUnreadMessagesCount(prev => prev + 1);

          const previewText = message.image 
            ? (message.text ? `📷 Photo: ${message.text}` : '📷 Sent a photo')
            : message.text || (message.attachment ? `📎 Attached: ${message.attachment.name}` : 'Sent a message');

          // Trigger Native Desktop Operating System Notification (Windows / macOS / Linux Toast)
          // Displays even when the app is minimized, tab is in the background, or user is working in another app
          const isCurrentlyViewingThisChat = activeTabRef.current === 'messages' && selectedChatIdRef.current === chatId;
          const isPageHidden = typeof document !== 'undefined' && document.hidden;

          if (!isCurrentlyViewingThisChat || isPageHidden) {
            showDesktopChatMessageNotification({
              title: `${message.senderName || 'Colleague'} (DATIAN CSR HUB)`,
              body: previewText,
              chatId,
              senderName: message.senderName || 'Colleague',
              senderRole: message.senderRole || message.senderPosition || 'Staff',
              senderAvatar: message.senderAvatar,
              requireInteraction: true,
              timestamp: message.timestamp
            });
          }

          // If the user is not currently viewing this exact conversation, show the in-app pop-up notification
          if (!isCurrentlyViewingThisChat) {
            const alertId = `msg-alert-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

            const newAlert: IncomingMessageAlert = {
              id: alertId,
              chatId,
              senderName: message.senderName || 'Colleague',
              senderRole: message.senderRole || message.senderPosition || 'Staff',
              senderDepartment: message.senderDepartment,
              senderAvatar: message.senderAvatar,
              text: previewText,
              imagePreview: message.image?.previewUrl || message.image?.dataUrl,
              timestamp: message.timestamp || new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
            };

            setIncomingMessageAlerts(prev => [newAlert, ...prev.slice(0, 2)]);

            // Auto-dismiss after 9 seconds
            setTimeout(() => {
              setIncomingMessageAlerts(prev => prev.filter(a => a.id !== alertId));
            }, 9000);
          }
        }
      }

      // Realtime Read Receipts handler in App-level
      if (event.type === 'CHAT_MESSAGES_READ' && event.data?.chatId) {
        // If current user is the reader, we decrement our unread counter if needed
        const activeEmp = currentEmployeeRef.current;
        if (activeEmp && event.data.readerId === activeEmp.id) {
          setUnreadMessagesCount(prev => Math.max(0, prev - (event.data.messageIds?.length || 1)));
        }
      }

      setTimeout(() => {
        isSyncingFromRemoteRef.current = false;
      }, 500);
    });

    return () => {
      cleanupStream();
      unsubscribeSync();
    };
  }, [handleFullMasterResync]);

  // Non-blocking Asynchronous Supabase Synchronization in Background
  const performBackgroundSync = useCallback(async () => {
    setSyncStatus('syncing');
    try {
      const { data: cloudEmployees, error } = await fetchEmployeesFromSupabase();
      if (error) {
        console.warn('[CSR HUB] Supabase background sync (using cached records):', error.message);
        setSyncStatus('cached');
        return;
      }

      if (cloudEmployees && cloudEmployees.length > 0) {
        setEmployees(prev => {
          const merged = mergeSupabaseEmployeesWithLocal(prev, cloudEmployees);
          saveSavedEmployees(merged);
          return merged;
        });
        setSyncStatus('synced');
      } else {
        setSyncStatus('synced');
      }
    } catch (err) {
      console.warn('[CSR HUB] Background sync catch:', err);
      setSyncStatus('cached');
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      performBackgroundSync();
    }
  }, [isAuthenticated, performBackgroundSync]);

  // 8. Persist and Broadcast State Changes to Online Master Server
  useEffect(() => {
    if (!isBootstrappedRef.current) return;
    saveSavedEmployees(employees);
    if (!isSyncingFromRemoteRef.current && employees.length > 0) {
      syncEntityToMaster('employees', employees);
    }
  }, [employees]);

  useEffect(() => {
    if (!isBootstrappedRef.current) return;
    saveStateToStorage('logs', logs);
    if (!isSyncingFromRemoteRef.current && logs.length > 0) {
      syncEntityToMaster('logs', logs);
    }
  }, [logs]);

  useEffect(() => {
    if (!isBootstrappedRef.current) return;
    saveStateToStorage('courses', courses);
    if (!isSyncingFromRemoteRef.current && courses.length > 0) {
      syncEntityToMaster('courses', courses);
    }
  }, [courses]);

  useEffect(() => {
    if (!isBootstrappedRef.current) return;
    saveStateToStorage('records', records);
    if (!isSyncingFromRemoteRef.current && records.length > 0) {
      syncEntityToMaster('records', records);
    }
  }, [records]);

  useEffect(() => {
    if (!isBootstrappedRef.current) return;
    saveStateToStorage('documents', documents);
    if (!isSyncingFromRemoteRef.current && documents.length > 0) {
      syncEntityToMaster('documents', documents);
    }
  }, [documents]);

  useEffect(() => {
    if (!isBootstrappedRef.current) return;
    saveStateToStorage('stitching', stitchingRecords);
    if (!isSyncingFromRemoteRef.current && stitchingRecords.length > 0) {
      syncEntityToMaster('stitchingRecords', stitchingRecords);
    }
  }, [stitchingRecords]);

  useEffect(() => {
    if (!isBootstrappedRef.current) return;
    saveStateToStorage('department', departmentItems);
    if (!isSyncingFromRemoteRef.current && departmentItems.length > 0) {
      syncEntityToMaster('departmentItems', departmentItems);
    }
  }, [departmentItems]);

  useEffect(() => {
    if (!isBootstrappedRef.current) return;
    saveStateToStorage('notifications', notifications);
    if (!isSyncingFromRemoteRef.current && notifications.length > 0) {
      syncEntityToMaster('notifications', notifications);
    }
  }, [notifications]);

  useEffect(() => {
    try {
      localStorage.setItem('tms_user_role', role);
    } catch (e) {
      console.warn('Error saving role', e);
    }
  }, [role]);

  useEffect(() => {
    try {
      localStorage.setItem('tms_dark_mode', String(darkMode));
    } catch (e) {
      console.warn('Error saving dark mode', e);
    }
  }, [darkMode]);

  useEffect(() => {
    try {
      if (companyLogo) {
        localStorage.setItem('tms_company_logo', companyLogo);
        if (isBootstrappedRef.current && !isSyncingFromRemoteRef.current) {
          syncEntityToMaster('companyLogo', companyLogo);
        }
      }
    } catch (e) {
      console.warn('Error saving company logo', e);
    }
  }, [companyLogo]);

  // 9. Login Handler
  const handleLoginSuccess = (
    user: string, 
    newRole?: UserRole, 
    userEmail?: string,
    employeeProfile?: AuthenticatedEmployee
  ) => {
    setIsAuthenticated(true);
    setAuthenticatedUser(user);
    if (employeeProfile) {
      setCurrentEmployee(employeeProfile);
      try {
        localStorage.setItem('csr_hub_auth_employee', JSON.stringify(employeeProfile));
      } catch {}
    }
    if (newRole) {
      setRole(newRole);
      try {
        localStorage.setItem('tms_user_role', newRole);
      } catch {}
    }
    try {
      localStorage.setItem('csr_hub_auth_session', 'true');
      localStorage.setItem('csr_hub_auth_user', user);
      if (userEmail) {
        localStorage.setItem('csr_hub_auth_email', userEmail);
      }
    } catch (e) {
      console.warn('Error persisting auth state', e);
    }
    logAuditEventToServer({
      user: user,
      role: newRole || role,
      action: 'LOGIN',
      module: 'Authentication',
      details: `Employee "${user}" (ID: ${employeeProfile?.employeeNo || 'ADMIN-01'}) signed in successfully.`
    });
    addToast('Authentication Verified', `Welcome back to CSR HUB, ${user} (${newRole || role}).`, 'success');
  };

  // 10. Logout Handler
  const handleLogout = () => {
    if (currentEmployee?.id) {
      logoutEmployeeSession(currentEmployee.id);
    }
    setIsAuthenticated(false);
    setCurrentEmployee(null);
    setShowUserDropdown(false);
    try {
      localStorage.removeItem('csr_hub_auth_session');
      localStorage.removeItem('csr_hub_auth_user');
      localStorage.removeItem('csr_hub_auth_email');
      localStorage.removeItem('csr_hub_auth_employee');
    } catch (e) {
      console.warn('Error clearing auth state', e);
    }
    addToast('Session Ended', 'You have been safely signed out.', 'info');
  };

  // 11. Reset All Data Handler
  const handleResetData = () => {
    setEmployees(INITIAL_EMPLOYEES);
    setLogs(DEFAULT_TRAINING_LOGS);
    setCourses(DEFAULT_COURSES);
    setRecords(DEFAULT_TRAINEE_RECORDS);
    setDocuments(DEFAULT_DOCUMENTS);
    setStitchingRecords(DEFAULT_STITCHING_RECORDS);
    setDepartmentItems(DEFAULT_DEPARTMENT_ITEMS);
    setNotifications(DEFAULT_NOTIFICATIONS);
    setCompanyLogo(null);

    try {
      localStorage.removeItem('tms_employees_diffs');
      localStorage.removeItem('tms_employees_records');
      localStorage.removeItem('tms_logs');
      localStorage.removeItem('tms_courses');
      localStorage.removeItem('tms_records');
      localStorage.removeItem('tms_documents');
      localStorage.removeItem('tms_stitching');
      localStorage.removeItem('tms_department');
      localStorage.removeItem('tms_notifications');
      localStorage.removeItem('tms_company_logo');
      localStorage.removeItem('csr_hub_antibribery_workbook_v3');
    } catch (e) {
      console.warn('Error resetting data in storage', e);
    }

    addToast('System Reset Complete', 'All records restored to default baseline state.', 'success');
  };

  const handleSplashComplete = () => {
    setShowSplash(false);
    setActiveTab('dashboard');
    try {
      sessionStorage.setItem('csr_hub_splash_shown', 'true');
    } catch {
      // ignore
    }
  };

  const handleReplayStartup = () => {
    setShowSplash(true);
  };

  // 12. Splash Screen View
  if (showSplash) {
    return (
      <StartupSplashScreen 
        onComplete={handleSplashComplete} 
        logoSrc={companyLogo} 
        startupMedia={startupMedia} 
      />
    );
  }

  // 13. Login Screen View
  if (!isAuthenticated) {
    return (
      <LoginScreen
        onLoginSuccess={handleLoginSuccess}
        customLogo={companyLogo}
        employees={employees}
        onLogoChange={(newLogo) => {
          setCompanyLogo(newLogo);
        }}
      />
    );
  }

  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  const getTabLabel = (tab: ActiveTab): string => {
    switch (tab) {
      case 'dashboard': return t('nav.dashboard', 'Dashboard');
      case 'employees': return t('nav.employees', 'Employee List');
      case 'leadership': return t('nav.leadership', 'Leadership Training');
      case 'stitching': return t('nav.stitching', 'Training Plan (Stitching)');
      case 'department': return t('nav.department', 'Department Training');
      case 'reports': return t('nav.reports', 'Reports & Analytics');
      case 'calendar': return t('nav.calendar', 'Training Calendar');
      case 'documents': return t('nav.documents', 'File Management');
      case 'settings': return t('nav.settings', 'System Settings');
      case 'brand-hub': return t('nav.antiBribery', 'Anti-Bribery Compliance Hub');
      case 'messages': return t('nav.messages', 'Message Hub');
      case 'backup': return t('nav.backup', 'Backup & Cloud Sync Center');
      default: return 'DATIAN CSR HUB';
    }
  };

  return (
    <div className={`flex h-screen w-screen overflow-hidden ${darkMode ? 'bg-slate-950 text-slate-100 dark' : 'bg-slate-50 text-slate-900'} font-sans select-none antialiased relative`}>
      
      {/* Background Wallpaper Layer with User-Adjusted Transparency & Blur */}
      {appearance.backgroundImage && (
        <div 
          className="fixed inset-0 pointer-events-none transition-all duration-300 z-0 overflow-hidden"
          style={{
            backgroundImage: `url(${appearance.backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            opacity: (appearance.backgroundOpacity ?? 45) / 100,
            filter: (appearance.backgroundBlur || 0) > 0 ? `blur(${appearance.backgroundBlur}px)` : 'none',
            transform: (appearance.backgroundBlur || 0) > 0 ? 'scale(1.05)' : 'none'
          }}
        />
      )}

      {/* Realtime Incoming Message Notification Alert Popups */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-md w-full pointer-events-none">
        {incomingMessageAlerts.map((alert) => (
          <div
            key={alert.id}
            onClick={() => handleOpenMessageAlert(alert)}
            className="pointer-events-auto bg-[#071326]/95 border-2 border-amber-500/80 rounded-2xl p-4 shadow-[0_12px_40px_rgba(0,0,0,0.85),0_0_25px_rgba(245,158,11,0.3)] backdrop-blur-md text-white cursor-pointer transform transition-all duration-300 hover:scale-[1.02] hover:border-amber-400 animate-slideIn group"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                </span>
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 font-mono flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  {t('header.newMessage', 'New Message')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-mono">{alert.timestamp}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDismissMessageAlert(alert.id);
                  }}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#12223d] transition-colors cursor-pointer"
                  title="Dismiss notification"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-blue-600/30 border border-amber-500/40 flex items-center justify-center font-bold text-xs text-amber-300 flex-shrink-0 shadow-sm">
                {alert.senderAvatar || alert.senderName.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-white truncate">{alert.senderName}</p>
                  {alert.senderRole && (
                    <span className="text-[9px] bg-[#102445] text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-mono font-medium truncate">
                      {alert.senderRole}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed font-sans">
                  {alert.text}
                </p>
                {alert.imagePreview && (
                  <div className="mt-2 w-28 h-20 rounded-xl overflow-hidden border border-amber-500/40 bg-black/40">
                    <img 
                      src={alert.imagePreview} 
                      alt="Photo preview" 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
                <div className="mt-2.5 flex items-center justify-between text-[11px] text-amber-400 font-medium group-hover:underline">
                  <span>{t('header.clickToOpen', 'Click to open conversation')}</span>
                  <span className="font-mono font-bold">{t('header.openChat', 'Open Chat')} &rarr;</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Toast Notification Container */}
      <div className="fixed top-20 right-4 z-40 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast, idx) => (
          <div
            key={toast.id ? `${toast.id}-${idx}` : `toast-${idx}`}
            className={`pointer-events-auto p-3.5 rounded-xl shadow-xl border backdrop-blur-md flex items-start gap-3 transform transition-all duration-300 animate-slideIn ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-600/50 text-emerald-100'
                : toast.type === 'warning'
                ? 'bg-amber-950/90 border-amber-600/50 text-amber-100'
                : 'bg-blue-950/90 border-blue-600/50 text-blue-100'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : toast.type === 'warning' ? (
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            ) : (
              <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold font-mono tracking-tight leading-none mb-1">{toast.title}</p>
              <p className="text-[11px] opacity-90 leading-snug">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Desktop Notification Permission Prompt Banner */}
      {showDesktopPrompt && (
        <div className="fixed bottom-4 right-4 z-50 max-w-md w-full p-4 bg-[#071326]/95 border-2 border-blue-500/80 rounded-2xl shadow-2xl backdrop-blur-md text-white animate-slideIn">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-400 flex-shrink-0">
              <Laptop className="w-5 h-5 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5 font-sans">
                  <span>Enable Desktop Message Alerts</span>
                  <span className="text-[9px] bg-blue-900/60 text-blue-300 px-1.5 py-0.2 rounded font-mono font-bold">
                    Windows & Mac
                  </span>
                </h4>
                <button
                  onClick={handleDismissDesktopPrompt}
                  className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
                  title="Dismiss"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                Receive instant desktop notifications whenever someone messages you, even if the system is closed, minimized, or in the background.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={handleEnableDesktopNotifications}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition cursor-pointer shadow-md flex items-center gap-1.5"
                >
                  <BellRing className="w-3.5 h-3.5" />
                  Enable Desktop Alerts
                </button>
                <button
                  onClick={handleDismissDesktopPrompt}
                  className="px-2.5 py-1.5 rounded-xl bg-[#0e2447] hover:bg-[#153463] text-slate-300 hover:text-white font-medium text-xs transition cursor-pointer"
                >
                  Maybe Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        role={role}
        setRole={setRole}
        companyLogo={companyLogo}
        unreadCount={unreadMessagesCount}
        onClickLogo={() => setIsLogoSuiteOpen(true)}
        onTriggerBackup={() => setActiveTab('backup')}
      />

      {/* Main Content Workspace */}
      <div className={`flex-1 flex flex-col min-w-0 h-full overflow-hidden relative z-10 transition-colors ${
        appearance.backgroundImage
          ? (appearance.panelTransparency > 0 ? 'bg-[#040a17]/75 backdrop-blur-[2px]' : 'bg-[#040a17]/90')
          : 'bg-[#040a17]'
      }`}>
        
        {/* Top Master Header Bar (Matching Reference) */}
        <header className="h-16 bg-[#060c18] border-b border-[#121f38] px-5 flex items-center justify-between gap-4 flex-shrink-0 z-20 shadow-md">
          
          {/* Left Title & Mobile Menu Toggle */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#0f1d38] transition cursor-pointer md:hidden"
              title="Toggle sidebar"
            >
              <Menu className="w-5 h-5 text-slate-300" />
            </button>

            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-sm sm:text-base font-black uppercase tracking-wider text-white font-mono truncate">
                {getTabLabel(activeTab).toUpperCase()}
              </h1>
            </div>
          </div>

          {/* Center Search Input (Matching Reference) */}
          <div className="hidden sm:flex flex-1 max-w-md mx-2">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQueryGlobal}
                onChange={(e) => setSearchQueryGlobal(e.target.value)}
                placeholder={t('header.searchPlaceholder', 'Search anything in DATIAN CSR HUB...')}
                className="w-full bg-[#081224] border border-[#16274a] rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-amber-500/60 transition shadow-inner"
              />
              {searchQueryGlobal && (
                <button
                  onClick={() => setSearchQueryGlobal('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Right Control Suite: Multi-PC Sync Status, Live Clock, Language Switcher, Notifications, User */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Multi-PC Realtime Master Online Sync Status Indicator */}
            <SyncStatusBadge 
              onForceResync={handleFullMasterResync} 
              onOpenBackupCenter={() => setActiveTab('backup')}
              addToast={addToast} 
            />

            {/* Real-Time Live Counting Clock Widget */}
            <div className="hidden xl:flex items-center">
              <RealTimeClock variant="compact" showSeconds={true} />
            </div>

            {/* Global Language Switcher Toggle Pill */}
            <div className="flex items-center bg-[#081224] border border-[#16274a] rounded-xl p-0.5 shadow-xs">
              <button
                onClick={() => setLanguage('en')}
                className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                  language === 'en'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="English Interface"
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('zh')}
                className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                  language === 'zh'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="中文界面 (Chinese)"
              >
                中文
              </button>
            </div>

            {/* Notification Bell with Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
                className="relative p-2 rounded-xl text-slate-300 hover:text-white hover:bg-[#0c1933] border border-transparent hover:border-[#16274a] cursor-pointer transition-colors"
                title={t('header.notifications', 'System Notifications')}
              >
                <Bell className="w-4.5 h-4.5" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#f59e0b] rounded-full ring-2 ring-[#060c18]" />
                )}
              </button>

              {showNotificationsDropdown && (
                <div className="absolute right-0 mt-2 w-80 bg-[#091429] rounded-2xl shadow-2xl border border-[#162d59] py-2 z-50 animate-fadeIn">
                  <div className="px-3.5 py-2.5 border-b border-[#122347] flex items-center justify-between">
                    <span className="text-xs font-bold text-white font-mono">{t('header.notifications', 'Notifications')}</span>
                    <button
                      onClick={() => {
                        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                        setShowNotificationsDropdown(false);
                      }}
                      className="text-[10px] text-amber-400 hover:underline cursor-pointer font-bold"
                    >
                      {t('header.markAllRead', 'Mark all read')}
                    </button>
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-[#101e3b]">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400">{t('header.noNotifications', 'No new alerts')}</div>
                    ) : (
                      notifications.map((n, idx) => (
                        <div key={n.id ? `${n.id}-${idx}` : `notif-${idx}`} className={`p-3 text-xs ${n.read ? 'opacity-60' : 'bg-[#0d1e3d]/60'}`}>
                          <p className="font-semibold text-white">{n.title}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">{n.message}</p>
                          <span className="text-[9px] text-amber-400/80 font-mono mt-1 inline-block">{n.time}</span>
                        </div>
                      ))
                    )}
                  </div>
                  {/* Desktop OS Notification Status Control */}
                  <div className="p-2.5 bg-[#061022] border-t border-[#122347] flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
                      <Laptop className="w-3.5 h-3.5 text-blue-400" />
                      <span>Desktop Alerts:</span>
                      <span className={`font-bold ${desktopNotifPermission === 'granted' ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {desktopNotifPermission === 'granted' ? 'Active' : 'Off'}
                      </span>
                    </div>
                    <button
                      onClick={handleEnableDesktopNotifications}
                      className="text-[10px] px-2 py-0.8 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer transition shadow-xs"
                    >
                      {desktopNotifPermission === 'granted' ? 'Test Alert' : 'Turn On'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Role Switcher Badge */}
            <button
              onClick={() => {
                const nextRole = role === 'Admin' ? 'User' : 'Admin';
                setRole(nextRole);
                addToast('Role Switched', `Active access mode changed to ${nextRole}.`, 'info');
              }}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold font-mono border transition-all cursor-pointer flex items-center gap-1.5 ${
                role === 'Admin'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/40 hover:bg-amber-500/20'
                  : 'bg-blue-500/10 text-blue-400 border-blue-500/40 hover:bg-blue-500/20'
              }`}
              title="Click to toggle Admin / User permission view"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{role === 'Admin' ? (language === 'zh' ? '管理员' : 'ADMIN') : (language === 'zh' ? '操作员' : 'OPERATOR')}</span>
            </button>

            {/* User Profile Area (Matching Reference) */}
            <div className="relative pl-2 border-l border-[#122347]">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-[#0c1933] cursor-pointer transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#f59e0b] to-[#d97706] text-slate-950 font-black text-xs flex items-center justify-center shadow-md flex-shrink-0">
                  {currentEmployee?.avatar || (currentEmployee?.name ? currentEmployee.name.slice(0, 2).toUpperCase() : 'AU')}
                </div>
                <div className="hidden md:flex flex-col text-left">
                  <span className="text-xs font-bold text-white leading-none">
                    {currentEmployee?.name || authenticatedUser || 'Admin User'}
                  </span>
                  <span className="text-[10px] text-slate-400 leading-tight mt-0.5 font-mono">
                    {currentEmployee?.employeeNo ? `${currentEmployee.employeeNo} • ` : ''}{currentEmployee?.position || 'Administrator'}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-[#091429] rounded-2xl shadow-2xl border border-[#162d59] py-1 z-50 animate-fadeIn text-xs">
                  <div className="px-3.5 py-2.5 border-b border-[#122347]">
                    <p className="font-bold text-white truncate">{currentEmployee?.name || authenticatedUser}</p>
                    <p className="text-[10px] text-amber-400 font-mono uppercase">
                      {currentEmployee?.employeeNo ? `ID: ${currentEmployee.employeeNo} • ` : ''}{role} Permission
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                      {currentEmployee?.department || 'Executive Administration'}
                    </p>
                  </div>
                  
                  <button
                    onClick={() => {
                      setActiveTab('settings');
                      setShowUserDropdown(false);
                    }}
                    className="w-full text-left px-3.5 py-2 text-slate-300 hover:bg-[#0d1e3d] hover:text-white cursor-pointer"
                  >
                    {t('header.settings', 'System Settings')}
                  </button>

                  <button
                    onClick={() => {
                      setIsLogoSuiteOpen(true);
                      setShowUserDropdown(false);
                    }}
                    className="w-full text-left px-3.5 py-2 text-slate-300 hover:bg-[#0d1e3d] hover:text-white cursor-pointer"
                  >
                    {t('header.branding', 'Customize Branding')}
                  </button>

                  <div className="border-t border-[#122347] my-1" />

                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3.5 py-2 text-red-400 hover:bg-red-950/30 flex items-center gap-2 cursor-pointer font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{t('header.signOut', 'Sign Out')}</span>
                  </button>
                </div>
              )}
            </div>

          </div>
        </header>

        {/* View Workspace Renderer */}
        <main className="flex-1 overflow-y-auto relative">
          
          {activeTab === 'dashboard' && (
            <DashboardOverview
              logs={logs}
              stitchingRecords={stitchingRecords}
              departmentItems={departmentItems}
              notifications={notifications}
              setNotifications={setNotifications}
              setActiveTab={setActiveTab}
              setSearchQueryGlobal={setSearchQueryGlobal}
              role={role}
              companyLogo={companyLogo}
              employees={employees}
              currentEmployee={currentEmployee}
              authenticatedUser={authenticatedUser}
              records={records}
              setRecords={setRecords}
              courses={courses}
              addToast={addToast}
              syncStatus={syncStatus}
              onManualSync={performBackgroundSync}
            />
          )}

          {activeTab === 'employees' && (
            <EmployeesView
              employees={employees}
              setEmployees={setEmployees}
              role={role}
              addToast={addToast}
              registerBackHandler={registerBackHandler}
              currentEmployee={currentEmployee}
            />
          )}

          {activeTab === 'leadership' && (
            <LeadershipTrainingView
              logs={logs}
              setLogs={setLogs}
              courses={courses}
              setCourses={setCourses}
              records={records}
              setRecords={setRecords}
              documents={documents}
              setDocuments={setDocuments}
              role={role}
              addToast={addToast}
              registerBackHandler={registerBackHandler}
            />
          )}

          {activeTab === 'stitching' && (
            <TrainingPlanStitchingView
              records={stitchingRecords}
              setRecords={setStitchingRecords}
              role={role}
              addToast={addToast}
              registerBackHandler={registerBackHandler}
            />
          )}

          {activeTab === 'department' && (
            <DepartmentTrainingView
              items={departmentItems}
              setItems={setDepartmentItems}
              role={role}
              addToast={addToast}
              registerBackHandler={registerBackHandler}
              currentUser={{ name: authenticatedUser?.name || 'System User', role: role }}
              departmentFolders={departmentFolders}
              setDepartmentFolders={setDepartmentFolders}
              departmentTrainingRecords={departmentTrainingRecords}
              setDepartmentTrainingRecords={setDepartmentTrainingRecords}
              departmentCustomFields={departmentCustomFields}
              setDepartmentCustomFields={setDepartmentCustomFields}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              logs={logs}
              stitchingRecords={stitchingRecords}
              departmentItems={departmentItems}
              addToast={addToast}
            />
          )}

          {activeTab === 'calendar' && (
            <CalendarView
              logs={logs}
              setLogs={setLogs}
              role={role}
              addToast={addToast}
              registerBackHandler={registerBackHandler}
            />
          )}

          {activeTab === 'documents' && (
            <DocumentsView
              documents={documents}
              setDocuments={setDocuments}
              role={role}
              addToast={addToast}
              registerBackHandler={registerBackHandler}
              initialFolderId={null}
              initialRootCategory="ALL"
            />
          )}

          {activeTab === 'opl' && (
            <OPLDocumentStudio
              role={role}
              addToast={addToast}
              onBackToDocuments={() => setActiveTab('documents')}
            />
          )}

          {activeTab === 'training-program' && (
            <DocumentsView
              documents={documents}
              setDocuments={setDocuments}
              role={role}
              addToast={addToast}
              registerBackHandler={registerBackHandler}
              initialFolderId="f-tp-root"
              initialRootCategory="TP"
            />
          )}

          {activeTab === 'ehs' && (
            <DocumentsView
              documents={documents}
              setDocuments={setDocuments}
              role={role}
              addToast={addToast}
              registerBackHandler={registerBackHandler}
              initialFolderId="f-tp-ehs-root"
              initialRootCategory="EHS"
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              role={role}
              setRole={setRole}
              onResetData={handleResetData}
              darkMode={darkMode}
              setDarkMode={setDarkMode}
              addToast={addToast}
              companyLogo={companyLogo}
              setCompanyLogo={setCompanyLogo}
              registerBackHandler={registerBackHandler}
              onReplayStartup={handleReplayStartup}
              startupMedia={startupMedia}
              setStartupMedia={setStartupMedia}
              appearance={appearance}
              setAppearance={setAppearance}
              onSaveAppearance={handleSaveAppearance}
              onResetAppearance={handleResetAppearance}
            />
          )}

          {activeTab === 'brand-hub' && (
            <AntiBriberyView
              role={role}
              addToast={addToast}
              registerBackHandler={registerBackHandler}
            />
          )}

          {activeTab === 'messages' && (
            <MessageHubView
              role={role}
              currentUser={currentEmployee}
              employees={employees}
              addToast={addToast}
              registerBackHandler={registerBackHandler}
              selectedChatId={selectedChatIdForMessages}
              onUnreadCountChange={setUnreadMessagesCount}
            />
          )}

          {activeTab === 'backup' && (
            <div className="p-4 sm:p-6 max-w-7xl mx-auto">
              <BackupSyncCenter
                role={role}
                addToast={addToast}
                onRefreshData={handleFullMasterResync}
                employeesCount={employees.length}
                logsCount={logs.length}
                documentsCount={documents.length}
                stitchingCount={stitchingRecords.length}
                departmentCount={departmentItems.length}
              />
            </div>
          )}

        </main>
      </div>

      {/* Corporate Branding MultiLogoSuite Modal */}
      {isLogoSuiteOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 font-mono">Corporate Identity & Logo Suite</h2>
              <button
                onClick={() => setIsLogoSuiteOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <MultiLogoSuite
                companyLogo={companyLogo}
                setCompanyLogo={setCompanyLogo}
                addToast={addToast}
                role={role}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
