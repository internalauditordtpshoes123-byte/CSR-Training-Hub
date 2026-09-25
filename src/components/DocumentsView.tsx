/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  BookOpen, 
  Search, 
  Upload, 
  Download, 
  Trash2, 
  X, 
  Edit2, 
  CheckCircle2,
  FolderOpen,
  Folder,
  FolderPlus,
  ArrowLeft,
  ChevronRight,
  Eye,
  FileText,
  FileSpreadsheet,
  AlertCircle,
  Shield,
  HardDrive,
  FileCheck,
  RotateCcw,
  Check,
  FolderEdit,
  Sparkles,
  UserCheck,
  FileCode,
  FileArchive,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Filter,
  File,
  Paperclip,
  ExternalLink,
  Copy,
  Plus,
  Database,
  Save,
  RefreshCw,
  Table,
  Code2,
  CheckCheck,
  Clock,
  AlertTriangle,
  Layers,
  FilePlus,
  Columns,
  FolderTree,
  GraduationCap,
  Scissors,
  ShieldCheck,
  ArrowRight,
  HelpCircle,
  Wrench,
  Users
} from 'lucide-react';
import { TrainingDoc, UserRole, DataRecord, StoredFolderItem } from '../types';
import { 
  saveFileToIndexedDB, 
  getFileFromIndexedDB, 
  deleteFileFromIndexedDB, 
  triggerFileDownload, 
  StoredFileRecord,
  validateJsonData,
  validateCsvData,
  formatFileSize
} from '../services/fileStorage';
import { 
  uploadSharedFileToServer, 
  deleteSharedFileFromServer, 
  syncEntityToMaster 
} from '../services/realtimeSync';
import DataRecordEditorModal from './documents/DataRecordEditorModal';
import DataRecordTableViewerModal from './documents/DataRecordTableViewerModal';
import BlueprintArchitectureModal from './documents/BlueprintArchitectureModal';
import { 
  STANDARDIZED_REPOSITORY_FOLDERS, 
  INITIAL_BLUEPRINT_DOCUMENTS, 
  ExtendedFolderItem 
} from '../data/repositoryBlueprint';

interface DocumentsViewProps {
  documents: TrainingDoc[];
  setDocuments: React.Dispatch<React.SetStateAction<TrainingDoc[]>>;
  role: UserRole;
  addToast: (title: string, message: string, type: 'success' | 'warning' | 'info') => void;
  registerBackHandler?: (handler: () => boolean) => () => void;
  initialFolderId?: string | null;
  initialRootCategory?: 'ALL' | 'OPL' | 'TP' | 'LDR' | 'EHS' | 'AB' | 'ST';
}

export interface ExtendedDoc extends TrainingDoc {
  folderId?: string;
  fileUrl?: string;
  originalName?: string;
  mimeType?: string;
  storageKey?: string;
  autoSavedAt?: string;
}

interface UploadProgressState {
  name: string;
  size: string;
  progress: number;
  totalBytes: number;
  uploadedBytes: number;
  status: 'uploading' | 'saving' | 'saved' | 'error';
}

interface FileAuditLog {
  id: string;
  fileName: string;
  fileSize: string;
  fileType: string;
  action: 'Upload' | 'Download' | 'Rename' | 'Delete' | 'AutoSave';
  details: string;
  performedBy: string;
  timestamp: string;
}

export default function DocumentsView({
  documents,
  setDocuments,
  role: globalRole,
  addToast,
  registerBackHandler,
  initialFolderId = null,
  initialRootCategory = 'ALL'
}: DocumentsViewProps) {
  // Navigation & Sub-Tabs: 'files' (File Storage) | 'datasets' (Data Records / Auto-Save) | 'audit_logs' (Storage Health & Logs)
  const [activeMainTab, setActiveMainTab] = useState<'files' | 'datasets' | 'audit_logs'>('files');
  
  // Active Folder State
  const [activeFolderId, setActiveFolderId] = useState<string | null>(initialFolderId);

  // Blueprint Architecture Modal State
  const [showBlueprintModal, setShowBlueprintModal] = useState(false);

  // Root Category Navigation & Filter: 'ALL' | 'OPL' | 'TP' | 'LDR' | 'EHS' | 'AB' | 'ST'
  const [rootCategoryFilter, setRootCategoryFilter] = useState<'ALL' | 'OPL' | 'TP' | 'LDR' | 'EHS' | 'AB' | 'ST'>(initialRootCategory);

  useEffect(() => {
    if (initialFolderId !== undefined) {
      setActiveFolderId(initialFolderId);
    }
  }, [initialFolderId]);

  useEffect(() => {
    if (initialRootCategory !== undefined) {
      setRootCategoryFilter(initialRootCategory);
    }
  }, [initialRootCategory]);

  // Remap any legacy folder files to the standardized audit architecture
  useEffect(() => {
    setDocuments(prev => prev.map(d => {
      const ext = d as ExtendedDoc;
      if (ext.folderId === 'folder-1') return { ...d, folderId: 'f-opl-maintenance' };
      if (ext.folderId === 'folder-2') return { ...d, folderId: 'f-st-modules' };
      if (ext.folderId === 'folder-3') return { ...d, folderId: 'f-ab-policies' };
      if (ext.folderId === 'folder-4') return { ...d, folderId: 'f-opl-quality' };
      return d;
    }));
  }, []);

  // Folders management with persistent initial state (Standardized Audit-Ready Hierarchy)
  const [folders, setFolders] = useState<StoredFolderItem[]>(() => {
    const stored = localStorage.getItem('tms_document_folders_v2');
    if (stored) {
      try { 
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Remove legacy placeholder folders (folder-1..folder-4)
          const legacyIds = new Set(['folder-1', 'folder-2', 'folder-3', 'folder-4']);
          const cleaned = parsed.filter(f => !legacyIds.has(f.id));
          const hasStandardRoots = cleaned.some(f => f.id === 'f-opl-root');
          if (hasStandardRoots) return cleaned;
          
          const existingIds = new Set(cleaned.map(f => f.id));
          const merged = [...STANDARDIZED_REPOSITORY_FOLDERS];
          cleaned.forEach(f => {
            if (!existingIds.has(f.id)) merged.push(f);
          });
          return merged;
        }
      } catch (e) { /* fallback */ }
    }
    return STANDARDIZED_REPOSITORY_FOLDERS;
  });

  // Calculate folder breadcrumb hierarchy path for multi-level navigation
  const folderBreadcrumbTrail = useMemo(() => {
    if (!activeFolderId) return [];
    const trail: StoredFolderItem[] = [];
    let currentId: string | null | undefined = activeFolderId;
    const visited = new Set<string>();
    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      const folder = folders.find(f => f.id === currentId);
      if (folder) {
        trail.unshift(folder);
        currentId = folder.parentId || null;
      } else {
        break;
      }
    }
    return trail;
  }, [folders, activeFolderId]);

  // Go back one level in the folder hierarchy
  const handleGoBackOneLevel = () => {
    if (!activeFolderId) return;
    const current = folders.find(f => f.id === activeFolderId);
    if (current && current.parentId) {
      setActiveFolderId(current.parentId);
    } else {
      setActiveFolderId(null);
    }
  };

  // Folder Back Handler integration
  useEffect(() => {
    if (registerBackHandler) {
      const handleBack = () => {
        if (activeFolderId) {
          handleGoBackOneLevel();
          return true;
        }
        return false;
      };
      return registerBackHandler(handleBack);
    }
  }, [activeFolderId, folders, registerBackHandler]);

  // Backup state
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupModalData, setBackupModalData] = useState<{
    isOpen: boolean;
    backup?: any;
  } | null>(null);
  const [showPastBackupsModal, setShowPastBackupsModal] = useState(false);
  const [pastBackupsList, setPastBackupsList] = useState<any[]>([]);
  const [isLoadingPastBackups, setIsLoadingPastBackups] = useState(false);

  // Trigger System Backup handler
  const handleTriggerSystemBackup = async () => {
    setIsBackingUp(true);
    try {
      const clientSnapshot = {
        documentsCount: documents.length,
        dataRecordsCount: dataRecords.length,
        foldersCount: folders.length,
        timestamp: new Date().toISOString()
      };

      const res = await fetch('/api/system/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          createdBy: globalRole === 'Admin' ? 'System Administrator' : 'CSR Officer',
          reason: 'User Manual Full System Backup',
          clientSnapshot
        })
      });

      const data = await res.json();
      if (data.success && data.backup) {
        addToast('Backup completed ✓', `System snapshot saved: ${data.backup.fileName} (${data.backup.size})`, 'success');
        setBackupModalData({
          isOpen: true,
          backup: data.backup
        });
      } else {
        throw new Error(data.error || 'Failed to create backup snapshot');
      }
    } catch (err: any) {
      console.error('Backup error:', err);
      addToast('Backup Failed', err.message || 'Could not connect to backup service', 'warning');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleFetchPastBackups = async () => {
    setIsLoadingPastBackups(true);
    setShowPastBackupsModal(true);
    try {
      const res = await fetch('/api/system/backups');
      const data = await res.json();
      if (data.success && Array.isArray(data.backups)) {
        setPastBackupsList(data.backups);
      }
    } catch (err) {
      console.error('Error fetching past backups:', err);
    } finally {
      setIsLoadingPastBackups(false);
    }
  };

  // Sync folders to local storage & server/cloud master
  useEffect(() => {
    try {
      localStorage.setItem('tms_document_folders_v2', JSON.stringify(folders));
      syncEntityToMaster('folders', folders);
    } catch (e) {
      console.warn('Error saving folders:', e);
    }
  }, [folders]);

  // Ensure Initial Blueprint Documents are present in repository
  useEffect(() => {
    const hasBlueprintDocs = documents.some(d => d.id.startsWith('DOC-OPL') || d.id.startsWith('DOC-LDR'));
    if (!hasBlueprintDocs) {
      setDocuments(prev => {
        const existingIds = new Set(prev.map(d => d.id));
        const toAdd = INITIAL_BLUEPRINT_DOCUMENTS.filter(d => !existingIds.has(d.id));
        if (toAdd.length > 0) {
          const combined = [...toAdd, ...prev];
          syncEntityToMaster('documents', combined);
          return combined;
        }
        return prev;
      });
    }
  }, []);

  // One-Click Re-alignment of Audit Repository Architecture
  const handleApplyStandardFolders = () => {
    // 1. Ensure all 42 standardized folders exist
    setFolders(prev => {
      const existingIds = new Set(prev.map(f => f.id));
      const updated = [...prev];
      STANDARDIZED_REPOSITORY_FOLDERS.forEach(sf => {
        if (!existingIds.has(sf.id)) {
          updated.push(sf);
        }
      });
      try {
        localStorage.setItem('tms_document_folders_v2', JSON.stringify(updated));
        syncEntityToMaster('folders', updated);
      } catch (e) {}
      return updated;
    });

    // 2. Ensure INITIAL_BLUEPRINT_DOCUMENTS are in documents
    setDocuments(prev => {
      const existingDocIds = new Set(prev.map(d => d.id));
      const docsToAdd = INITIAL_BLUEPRINT_DOCUMENTS.filter(d => !existingDocIds.has(d.id));
      if (docsToAdd.length > 0) {
        const mergedDocs = [...docsToAdd, ...prev];
        syncEntityToMaster('documents', mergedDocs);
        return mergedDocs;
      }
      return prev;
    });

    addToast(
      'Repository Structure Aligned ✓',
      'Established complete OPL & Training Program root hierarchy with 42 audit-ready directories and template documents.',
      'success'
    );
  };

  // Structured Data Records state (JSON, CSV, Text/Markdown)
  const [dataRecords, setDataRecords] = useState<DataRecord[]>(() => {
    const stored = localStorage.getItem('tms_data_records_master');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return [
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
    ];
  });

  // Fetch latest data records from backend on mount
  useEffect(() => {
    const fetchDataRecords = async () => {
      try {
        const res = await fetch('/api/data-records');
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.records) && json.records.length > 0) {
            setDataRecords(json.records);
            localStorage.setItem('tms_data_records_master', JSON.stringify(json.records));
          }
        }
      } catch (e) {
        console.warn('Could not fetch server data records, using cached records:', e);
      }
    };
    fetchDataRecords();
  }, []);

  // Sync data records to localStorage & server/cloud master
  useEffect(() => {
    try {
      localStorage.setItem('tms_data_records_master', JSON.stringify(dataRecords));
      syncEntityToMaster('dataRecords', dataRecords);
    } catch (e) {
      console.warn('Error saving data records:', e);
    }
  }, [dataRecords]);

  // File Audit Trail logs
  const [auditLogs, setAuditLogs] = useState<FileAuditLog[]>(() => {
    const stored = localStorage.getItem('tms_file_audit_logs');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error('Error parsing saved file audit logs', e);
      }
    }
    return [
      {
        id: 'FLOG-1',
        fileName: 'high_impact_stitching_sop_v2.pdf',
        fileSize: '4.2 MB',
        fileType: 'PDF Document',
        action: 'Upload',
        details: 'Initial upload to directory Machine Maintenance SOP.',
        performedBy: 'System Admin',
        timestamp: '2026-05-10T08:30:00Z'
      },
      {
        id: 'FLOG-2',
        fileName: 'overlock_guidebook_v4.pdf',
        fileSize: '12.5 MB',
        fileType: 'PDF Document',
        action: 'Upload',
        details: 'Initial upload to directory Training Materials & Guides.',
        performedBy: 'Operations Supervisor',
        timestamp: '2026-05-14T10:15:00Z'
      }
    ];
  });

  // Sync audit logs to local storage
  useEffect(() => {
    try {
      localStorage.setItem('tms_file_audit_logs', JSON.stringify(auditLogs));
    } catch (e) {
      console.warn('Error saving audit logs:', e);
    }
  }, [auditLogs]);

  const addAuditLog = (
    fileName: string, 
    fileSize: string, 
    fileType: string, 
    action: 'Upload' | 'Download' | 'Rename' | 'Delete' | 'AutoSave', 
    details: string
  ) => {
    const newLogItem: FileAuditLog = {
      id: `FLOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      fileName,
      fileSize,
      fileType,
      action,
      details,
      performedBy: globalRole === 'Admin' ? 'System Admin' : 'Operations Supervisor',
      timestamp: new Date().toISOString()
    };
    setAuditLogs(prev => [newLogItem, ...prev]);
  };

  // Restore file binary data from IndexedDB for any documents missing fileUrl in memory
  useEffect(() => {
    let isMounted = true;
    const hydrateFilesFromIndexedDB = async () => {
      for (const doc of documents) {
        const extDoc = doc as ExtendedDoc;
        if (!extDoc.fileUrl && extDoc.id) {
          const stored = await getFileFromIndexedDB(extDoc.id);
          if (stored && isMounted && stored.dataUrl) {
            setDocuments(prev => prev.map(d => d.id === extDoc.id ? { ...d, fileUrl: stored.dataUrl } : d));
          }
        }
      }
    };
    hydrateFilesFromIndexedDB();
    return () => { isMounted = false; };
  }, []);

  // Ensure documents without folderId are assigned to default folder
  useEffect(() => {
    const hasUnfolderId = documents.some(d => !(d as ExtendedDoc).folderId);
    if (hasUnfolderId) {
      const updated = documents.map(d => {
        const extDoc = d as ExtendedDoc;
        if (extDoc.folderId) return d;
        
        let assignedFolderId = 'folder-2';
        const nameLower = (d.name || '').toLowerCase();
        const catLower = (d.category || '').toLowerCase();
        
        if (nameLower.includes('stitch') || nameLower.includes('overlock') || nameLower.includes('machine') || catLower.includes('stitching')) {
          assignedFolderId = 'folder-1';
        } else if (nameLower.includes('audit') || nameLower.includes('report') || nameLower.includes('compliance')) {
          assignedFolderId = 'folder-3';
        } else if (nameLower.includes('photo') || nameLower.includes('img') || nameLower.includes('picture')) {
          assignedFolderId = 'folder-4';
        }
        
        return {
          ...d,
          folderId: assignedFolderId
        } as ExtendedDoc;
      });
      setDocuments(updated);
    }
  }, [documents, setDocuments]);

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [formatFilter, setFormatFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'az' | 'za' | 'size'>('newest');

  // Create / Rename states for folders
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renamingFolderName, setRenamingFolderName] = useState('');

  // Editing file title
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editingDocName, setEditingDocName] = useState('');

  // Active uploading state with visual progress
  const [uploadingFile, setUploadingFile] = useState<UploadProgressState | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [recentAutoSavedId, setRecentAutoSavedId] = useState<string | null>(null);

  // File previewer light-box modal with interactive zoom metrics
  const [previewDoc, setPreviewDoc] = useState<ExtendedDoc | null>(null);
  const [zoom, setZoom] = useState(1);

  // Data Record Editor & Viewer Modals
  const [activeEditingRecord, setActiveEditingRecord] = useState<DataRecord | null>(null);
  const [activeViewingTableRecord, setActiveViewingTableRecord] = useState<DataRecord | null>(null);

  // Confirmation modal for Strict Manual Deletes (Requirement #3)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    itemType?: 'file' | 'dataset' | 'folder';
    onConfirm: () => void;
  } | null>(null);

  // Reset zoom on document toggle
  useEffect(() => {
    setZoom(1);
  }, [previewDoc]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate storage metrics
  const storageMetrics = useMemo(() => {
    let totalFileBytes = 0;
    documents.forEach(d => {
      const sz = d.fileSize || '';
      if (sz.includes('MB')) totalFileBytes += parseFloat(sz) * 1024 * 1024;
      else if (sz.includes('KB')) totalFileBytes += parseFloat(sz) * 1024;
      else if (sz.includes('GB')) totalFileBytes += parseFloat(sz) * 1024 * 1024 * 1024;
      else if (sz.includes('B')) totalFileBytes += parseFloat(sz);
    });

    let totalDataBytes = 0;
    dataRecords.forEach(r => {
      totalDataBytes += new Blob([r.content || '']).size;
    });

    const totalBytes = totalFileBytes + totalDataBytes;
    return {
      fileCount: documents.length,
      datasetCount: dataRecords.length,
      folderCount: folders.length,
      totalUsageStr: formatFileSize(totalBytes),
      isPermanent: true
    };
  }, [documents, dataRecords, folders]);

  // Folder-wise document count
  const folderFileCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    folders.forEach(f => {
      counts[f.id] = documents.filter(d => (d as ExtendedDoc).folderId === f.id).length;
    });
    return counts;
  }, [folders, documents]);

  // Filtered folders supporting search & root navigation category filters
  const filteredFolders = useMemo(() => {
    let list = folders;

    if (rootCategoryFilter !== 'ALL' && !activeFolderId) {
      if (rootCategoryFilter === 'OPL') {
        list = list.filter(f => f.id === 'f-opl-root' || f.parentId === 'f-opl-root');
      } else if (rootCategoryFilter === 'TP') {
        list = list.filter(f => f.id === 'f-tp-root' || f.parentId === 'f-tp-root');
      } else if (rootCategoryFilter === 'LDR') {
        list = list.filter(f => f.id === 'f-tp-leader-root' || f.parentId === 'f-tp-leader-root');
      } else if (rootCategoryFilter === 'EHS') {
        list = list.filter(f => f.id === 'f-tp-ehs-root' || f.parentId === 'f-tp-ehs-root');
      } else if (rootCategoryFilter === 'AB') {
        list = list.filter(f => f.id === 'f-tp-antibribery-root' || f.parentId === 'f-tp-antibribery-root');
      } else if (rootCategoryFilter === 'ST') {
        list = list.filter(f => f.id === 'f-tp-stitching-root' || f.parentId === 'f-tp-stitching-root');
      }
    }

    if (!searchQuery) return list;
    return list.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [folders, searchQuery, rootCategoryFilter, activeFolderId]);

  // Find current active folder
  const activeFolder = useMemo(() => {
    return folders.find(f => f.id === activeFolderId) || null;
  }, [folders, activeFolderId]);

  // Current folder's file listing with search, type filter, and sort
  const currentFolderFiles = useMemo(() => {
    const allInFolder = documents.filter(d => (d as ExtendedDoc).folderId === activeFolderId) as ExtendedDoc[];
    
    let filtered = allInFolder;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(f => 
        (f.name || '').toLowerCase().includes(q) || 
        (f.fileName || '').toLowerCase().includes(q) ||
        (f.category || '').toLowerCase().includes(q)
      );
    }

    if (typeFilter !== 'ALL') {
      filtered = filtered.filter(f => {
        const ext = (f.fileName || '').substring(f.fileName.lastIndexOf('.')).toLowerCase();
        if (typeFilter === 'IMAGE') return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext);
        if (typeFilter === 'PDF') return ext === '.pdf';
        if (typeFilter === 'SPREADSHEET') return ['.xlsx', '.xls', '.csv'].includes(ext);
        if (typeFilter === 'DOCUMENT') return ['.docx', '.doc', '.txt', '.rtf', '.pptx', '.ppt'].includes(ext);
        if (typeFilter === 'ARCHIVE') return ['.zip', '.rar', '.7z', '.tar'].includes(ext);
        return true;
      });
    }
    
    const sorted = [...filtered];
    if (sortBy === 'newest') {
      sorted.sort((a, b) => new Date(b.uploadDate || 0).getTime() - new Date(a.uploadDate || 0).getTime());
    } else if (sortBy === 'oldest') {
      sorted.sort((a, b) => new Date(a.uploadDate || 0).getTime() - new Date(b.uploadDate || 0).getTime());
    } else if (sortBy === 'az') {
      sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sortBy === 'za') {
      sorted.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
    }
    return sorted;
  }, [documents, activeFolderId, searchQuery, typeFilter, sortBy]);

  // Filtered Data Records
  const filteredDataRecords = useMemo(() => {
    let list = [...dataRecords];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r => 
        r.title.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        (r.tags || []).some(t => t.toLowerCase().includes(q)) ||
        r.content.toLowerCase().includes(q)
      );
    }
    if (formatFilter !== 'ALL') {
      list = list.filter(r => r.format === formatFilter);
    }
    if (sortBy === 'newest') {
      list.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
    } else if (sortBy === 'oldest') {
      list.sort((a, b) => new Date(a.updatedAt || 0).getTime() - new Date(b.updatedAt || 0).getTime());
    } else if (sortBy === 'az') {
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'za') {
      list.sort((a, b) => b.title.localeCompare(a.title));
    }
    return list;
  }, [dataRecords, searchQuery, formatFilter, sortBy]);

  // Folder Management Handlers
  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    const nFolder: StoredFolderItem = {
      id: `folder-${Date.now()}`,
      name: newFolderName.trim(),
      parentId: activeFolderId || null,
      createdAt: new Date().toISOString().split('T')[0],
      createdBy: globalRole === 'Admin' ? 'System Admin' : 'Operations Lead'
    };

    setFolders(prev => [...prev, nFolder]);
    addAuditLog(nFolder.name, 'N/A', 'Folder', 'Upload', `Created workspace folder "${newFolderName.trim()}" in ${activeFolder ? activeFolder.name : 'Root'}`);
    setNewFolderName('');
    setIsNewFolderOpen(false);
    addToast('Folder Created', `Workspace folder "${nFolder.name}" has been created successfully.`, 'success');
  };

  const handleStartRenameFolder = (folder: StoredFolderItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingFolderId(folder.id);
    setRenamingFolderName(folder.name);
  };

  const handleSaveRenameFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingFolderName.trim()) return;

    const currentFolderName = folders.find(f => f.id === renamingFolderId)?.name || 'Unknown';
    setFolders(prev => prev.map(f => f.id === renamingFolderId ? { ...f, name: renamingFolderName.trim() } : f));
    
    // Update category name in files inside folder
    setDocuments(prev => prev.map(d => {
      const extDoc = d as ExtendedDoc;
      if (extDoc.folderId === renamingFolderId) {
        return { ...d, category: renamingFolderName.trim() };
      }
      return d;
    }));

    addAuditLog('N/A', 'N/A', 'Folder', 'Rename', `Renamed folder "${currentFolderName}" to "${renamingFolderName.trim()}"`);
    setRenamingFolderId(null);
    addToast('Folder Renamed', `Folder updated to "${renamingFolderName.trim()}".`, 'success');
  };

  const handleDeleteFolder = (folderId: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();

    setConfirmModal({
      isOpen: true,
      title: 'Delete Folder Workspace',
      message: `Are you sure you want to delete the folder "${name}"? This action will permanently remove this folder and all associated files from disk and browser storage.`,
      itemType: 'folder',
      confirmText: 'Delete Folder Permanently',
      onConfirm: async () => {
        // Delete internal files from IndexedDB and Server
        const filesToDelete = documents.filter(d => (d as ExtendedDoc).folderId === folderId);
        for (const file of filesToDelete) {
          await deleteFileFromIndexedDB(file.id);
          deleteSharedFileFromServer(file.id);
        }

        setFolders(prev => prev.filter(f => f.id !== folderId));
        setDocuments(prev => prev.filter(d => (d as ExtendedDoc).folderId !== folderId));
        addAuditLog('N/A', 'N/A', 'Folder', 'Delete', `Deleted folder "${name}" along with ${filesToDelete.length} internal files`);
        addToast('Folder Deleted', `Folder "${name}" and all associated files removed.`, 'info');
        if (activeFolderId === folderId) {
          setActiveFolderId(null);
        }
        setConfirmModal(null);
      }
    });
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!activeFolderId) {
      // Default to first folder if none active
      if (folders.length > 0) {
        setActiveFolderId(folders[0].id);
      }
    }
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  // =========================================================================
  // REQUIREMENT #1: AUTO-SAVE FUNCTIONALITY FOR FILE UPLOADS
  // Automatically saves to storage/database with immediate visual indicator
  // =========================================================================
  const handleFileUpload = (file: File) => {
    // 1. Data Integrity & Validation (Requirement #5)
    if (file.size === 0) {
      addToast('Empty File', 'Cannot upload a 0-byte empty file.', 'warning');
      return;
    }

    const ONE_GB = 1024 * 1024 * 1024;
    if (file.size > ONE_GB) {
      addToast('File Too Large', 'File exceeds maximum 1GB size limit.', 'warning');
      return;
    }

    const originalName = file.name;
    const dotIdx = originalName.lastIndexOf('.');
    const ext = dotIdx !== -1 ? originalName.substring(dotIdx).toLowerCase() : '';

    let type: 'SOP' | 'Certificate' | 'Material' = 'Material';
    if (ext === '.pdf') type = 'SOP';
    else if (['.docx', '.doc', '.pptx', '.ppt'].includes(ext)) type = 'Certificate';
    else if (['.xlsx', '.xls', '.csv'].includes(ext)) type = 'SOP';
    else if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)) type = 'Material';

    let sizeStr = formatFileSize(file.size);

    setUploadingFile({
      name: file.name,
      size: sizeStr,
      progress: 0,
      totalBytes: file.size,
      uploadedBytes: 0,
      status: 'uploading'
    });

    // Read file as Base64 Data URL and auto-save immediately
    const reader = new FileReader();
    reader.onload = async (event) => {
      const fileDataUrl = event.target?.result as string;
      await executeAutoSaveUpload(file, type, sizeStr, fileDataUrl);
    };
    reader.onerror = async () => {
      await executeAutoSaveUpload(file, type, sizeStr, null);
    };
    reader.readAsDataURL(file);
  };

  const executeAutoSaveUpload = async (file: File, type: 'SOP' | 'Certificate' | 'Material', sizeStr: string, fileDataUrl: string | null) => {
    let progress = 0;
    const timer = setInterval(async () => {
      progress += 25;
      if (progress >= 100) {
        clearInterval(timer);

        const rawName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        const formattedTitle = rawName
          .split(/[-_]+/)
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');

        const fileId = `DOC-${Date.now().toString().slice(-6)}`;
        const nowIso = new Date().toISOString();

        const newDoc: ExtendedDoc = {
          id: fileId,
          name: formattedTitle,
          type: type,
          fileName: file.name,
          uploadedBy: globalRole === 'Admin' ? 'Administrator' : 'CSR Officer',
          uploadDate: nowIso.split('T')[0],
          fileSize: sizeStr,
          category: activeFolder?.name || (folders[0]?.name || 'General Operations'),
          folderId: activeFolderId || folders[0]?.id || 'folder-1',
          fileUrl: fileDataUrl || undefined,
          mimeType: file.type || 'application/octet-stream',
          autoSavedAt: nowIso
        };

        // 1. Persist in IndexedDB (Browser cache)
        if (fileDataUrl) {
          const storedRecord: StoredFileRecord = {
            id: fileId,
            fileName: file.name,
            fileType: type,
            fileSize: sizeStr,
            mimeType: file.type || 'application/octet-stream',
            dataUrl: fileDataUrl,
            uploadedAt: nowIso,
            folderId: activeFolderId || folders[0]?.id || 'folder-1'
          };
          await saveFileToIndexedDB(storedRecord);

          // 2. Persist to Master Backend Disk Storage (/storage_data/uploads/)
          uploadSharedFileToServer({
            id: fileId,
            fileName: file.name,
            fileType: type,
            fileSize: sizeStr,
            mimeType: file.type || 'application/octet-stream',
            dataUrl: fileDataUrl,
            folderId: activeFolderId || folders[0]?.id || 'folder-1',
            category: activeFolder?.name || 'General Operations',
            uploadedBy: globalRole === 'Admin' ? 'Administrator' : 'CSR Officer'
          });
        }

        setDocuments(prev => [newDoc, ...prev]);
        setRecentAutoSavedId(fileId);
        addAuditLog(file.name, sizeStr, type, 'AutoSave', `Auto-saved successfully into "${activeFolder?.name || 'General Operations'}"`);
        
        // Show visual success state
        setUploadingFile({
          name: file.name,
          size: sizeStr,
          progress: 100,
          totalBytes: file.size,
          uploadedBytes: file.size,
          status: 'saved'
        });

        setTimeout(() => {
          setUploadingFile(null);
        }, 1500);

        addToast('Saved ✓', `"${file.name}" automatically saved to permanent storage.`, 'success');
        
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }

        setTimeout(() => setRecentAutoSavedId(null), 4000);
      } else {
        setUploadingFile(prev => prev ? { ...prev, progress } : null);
      }
    }, 50);
  };

  // =========================================================================
  // REQUIREMENT #1 & #2: DATA RECORD AUTO-SAVE & PERSISTENCE
  // =========================================================================
  const handleAutoSaveDataRecord = async (record: DataRecord) => {
    // 1. Update React State immediately
    setDataRecords(prev => {
      const idx = prev.findIndex(r => r.id === record.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = record;
        return copy;
      }
      return [record, ...prev];
    });

    // 2. Persist to backend server API
    try {
      await fetch('/api/data-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      });
    } catch (e) {
      console.warn('Backend sync failed, stored in local cache:', e);
    }

    addAuditLog(record.title, record.size, record.format.toUpperCase(), 'AutoSave', `Auto-saved dataset record "${record.title}"`);
  };

  const handleCreateNewDataRecord = (format: 'json' | 'csv' | 'text') => {
    const newId = `drec_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const now = new Date().toISOString();
    
    let defaultContent = '{\n  "name": "Sample Audit Dataset",\n  "status": "Active"\n}';
    let defaultTitle = 'New JSON Dataset';
    let recCount = 1;

    if (format === 'csv') {
      defaultTitle = 'New CSV Table Dataset';
      defaultContent = 'ID, Item_Name, Quantity, Location, Status\n1, Safety Glasses, 120, Warehouse A, Verified\n2, Kevlar Gloves, 85, Line 1, Verified\n3, Ear Plugs, 300, Line 2, Verified';
      recCount = 3;
    } else if (format === 'text') {
      defaultTitle = 'New SOP Document';
      defaultContent = '# STANDARD OPERATING PROCEDURE\n\n## Overview\nEnter procedure details, safety precautions, and execution steps here.';
      recCount = 1;
    }

    const nRecord: DataRecord = {
      id: newId,
      title: defaultTitle,
      format,
      content: defaultContent,
      category: activeFolder?.name || 'Audit & Compliance',
      tags: ['Operations', format.toUpperCase()],
      size: `${new Blob([defaultContent]).size} B`,
      recordCount: recCount,
      createdAt: now.split('T')[0],
      updatedAt: now,
      createdBy: globalRole === 'Admin' ? 'System Administrator' : 'CSR Officer',
      autoSavedAt: now
    };

    handleAutoSaveDataRecord(nRecord);
    setActiveEditingRecord(nRecord);
    addToast('Dataset Created', `"${nRecord.title}" created with instant auto-save.`, 'success');
  };

  // =========================================================================
  // REQUIREMENT #3: MANUAL DELETE ONLY (Strict Confirmation Prompts)
  // =========================================================================
  const handleDeleteFile = (doc: ExtendedDoc, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    setConfirmModal({
      isOpen: true,
      title: 'Delete File Permanently?',
      message: `Are you sure you want to delete "${doc.name}" (${doc.fileName})? This action will permanently remove this file from both server disk storage and browser cache. This cannot be undone.`,
      itemType: 'file',
      confirmText: 'Confirm Delete',
      onConfirm: async () => {
        // 1. Delete from IndexedDB
        await deleteFileFromIndexedDB(doc.id);
        // 2. Delete from Server Master Storage
        deleteSharedFileFromServer(doc.id);
        // 3. Remove from UI State
        setDocuments(prev => prev.filter(d => d.id !== doc.id));
        addAuditLog(doc.fileName, doc.fileSize, doc.type, 'Delete', `Permanently deleted file from storage`);
        addToast('File Deleted', `"${doc.fileName}" has been permanently removed.`, 'info');
        setConfirmModal(null);
        if (previewDoc?.id === doc.id) setPreviewDoc(null);
      }
    });
  };

  const handleDeleteDataRecord = (id: string, title: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Data Record Permanently?',
      message: `Are you sure you want to delete "${title}"? This dataset will be permanently removed from disk storage and IndexedDB. This action cannot be undone.`,
      itemType: 'dataset',
      confirmText: 'Confirm Delete',
      onConfirm: async () => {
        // 1. Delete from Server API
        try {
          await fetch(`/api/data-records/${id}`, { method: 'DELETE' });
        } catch (e) {
          console.warn('Error deleting data record from server:', e);
        }
        // 2. Delete from UI state
        setDataRecords(prev => prev.filter(r => r.id !== id));
        addAuditLog(title, 'N/A', 'Dataset', 'Delete', `Permanently removed data record`);
        addToast('Record Deleted', `"${title}" has been permanently removed.`, 'info');
        setConfirmModal(null);
        if (activeEditingRecord?.id === id) setActiveEditingRecord(null);
        if (activeViewingTableRecord?.id === id) setActiveViewingTableRecord(null);
      }
    });
  };

  // One-click file download helper
  const handleDownloadDoc = (doc: ExtendedDoc, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    if (doc.fileUrl) {
      triggerFileDownload(doc.fileUrl, doc.fileName);
      addAuditLog(doc.fileName, doc.fileSize, doc.type, 'Download', `Downloaded file from browser storage`);
      addToast('Download Started', `"${doc.fileName}" is downloading.`, 'success');
      return;
    }

    // Direct server download
    const downloadUrl = `/api/files/download/${doc.id}`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = doc.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addAuditLog(doc.fileName, doc.fileSize, doc.type, 'Download', `Downloaded file from server storage`);
    addToast('Download Started', `"${doc.fileName}" is downloading.`, 'success');
  };

  // Batch download all files in current view
  const handleBatchDownloadAll = () => {
    if (currentFolderFiles.length === 0) {
      addToast('No Files', 'There are no files in this folder to download.', 'info');
      return;
    }

    currentFolderFiles.forEach((doc, i) => {
      setTimeout(() => {
        handleDownloadDoc(doc);
      }, i * 300);
    });

    addToast('Batch Download', `Queued ${currentFolderFiles.length} files for download.`, 'info');
  };

  // Save renamed document title
  const handleSaveDocName = (docId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDocName.trim()) return;

    setDocuments(prev => prev.map(d => {
      if (d.id === docId) {
        return { ...d, name: editingDocName.trim() };
      }
      return d;
    }));

    addAuditLog(editingDocName.trim(), 'N/A', 'Document', 'Rename', `Renamed document title`);
    setEditingDocId(null);
    addToast('Renamed', 'File display name updated.', 'success');
  };

  // Categories list for datalist suggestions
  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    folders.forEach(f => set.add(f.name));
    dataRecords.forEach(r => set.add(r.category));
    return Array.from(set);
  }, [folders, dataRecords]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12 font-sans select-none text-slate-100">
      
      {/* 1. Header & Persistent Storage Status Overview Banner */}
      <div className="bg-[#091429] border border-[#162d59] rounded-2xl p-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-blue-600/20 border border-blue-500/30 rounded-xl text-amber-400">
                <HardDrive className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                    File & Data Management System
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Auto-Save Active
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium">
                  Permanent Dual-Layer Storage (Disk & IndexedDB) • Zero Auto-Cleanup • Manual Delete Only
                </p>
              </div>
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* System Backup Button (Must Be Fully Functional) */}
            <button
              onClick={handleTriggerSystemBackup}
              disabled={isBackingUp}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border shadow-md cursor-pointer ${
                isBackingUp 
                  ? 'bg-amber-950/60 border-amber-500/50 text-amber-300 animate-pulse' 
                  : 'bg-[#0a2040] hover:bg-[#123060] border-emerald-500/40 text-emerald-300 hover:text-white'
              }`}
              title="Create a complete snapshot copy of all files, datasets, and records"
            >
              {isBackingUp ? (
                <>
                  <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
                  <span>Creating Backup...</span>
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 text-emerald-400" />
                  <span>Backup System Data</span>
                </>
              )}
            </button>

            <button
              onClick={handleFetchPastBackups}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#09162e] hover:bg-[#102449] text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-all border border-[#162d59] cursor-pointer"
              title="View past backup archives"
            >
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>Past Backups</span>
            </button>

            <button
              onClick={() => setShowBlueprintModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500/20 to-blue-600/20 hover:from-amber-500/30 hover:to-blue-600/30 text-amber-300 hover:text-white rounded-xl text-xs font-extrabold transition-all border border-amber-400/40 shadow-sm cursor-pointer"
              title="Inspect standardized repository blueprint, separated root layout, and naming conventions"
            >
              <FolderTree className="w-4 h-4 text-amber-400" />
              <span>Repository Blueprint</span>
            </button>

            {activeMainTab === 'files' ? (
              <>
                <button
                  onClick={() => setIsNewFolderOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0e2247] hover:bg-[#153166] text-blue-300 hover:text-white rounded-xl text-xs font-bold transition-all border border-blue-500/30 cursor-pointer shadow-md"
                >
                  <FolderPlus className="w-4 h-4 text-amber-400" />
                  <span>{activeFolderId ? 'New Subfolder' : 'New Folder'}</span>
                </button>

                <button
                  onClick={triggerFileInput}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-extrabold transition-all shadow-lg shadow-blue-900/40 cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-amber-300" />
                  <span>Upload & Auto-Save</span>
                </button>
              </>
            ) : activeMainTab === 'datasets' ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCreateNewDataRecord('json')}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0e2247] hover:bg-[#153166] text-blue-300 hover:text-white rounded-xl text-xs font-bold transition-all border border-blue-500/30 cursor-pointer shadow-md"
                >
                  <Code2 className="w-4 h-4 text-amber-400" />
                  <span>New JSON</span>
                </button>

                <button
                  onClick={() => handleCreateNewDataRecord('csv')}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0e2247] hover:bg-[#153166] text-blue-300 hover:text-white rounded-xl text-xs font-bold transition-all border border-blue-500/30 cursor-pointer shadow-md"
                >
                  <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                  <span>New CSV</span>
                </button>

                <button
                  onClick={() => handleCreateNewDataRecord('text')}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-extrabold transition-all shadow-lg shadow-blue-900/40 cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-amber-300" />
                  <span>New SOP Doc</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {/* Storage Metrics Mini Dashboard (Requirement #2 Persistent Storage Guarantee) */}
        <div className="mt-4 pt-4 border-t border-[#122347] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-[#050b17]/80 border border-[#122347] rounded-xl p-2.5">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Total Binary Files</span>
            <p className="text-base font-extrabold text-white mt-0.5">{storageMetrics.fileCount} Files</p>
          </div>

          <div className="bg-[#050b17]/80 border border-[#122347] rounded-xl p-2.5">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Data Datasets (JSON/CSV)</span>
            <p className="text-base font-extrabold text-amber-400 mt-0.5">{storageMetrics.datasetCount} Records</p>
          </div>

          <div className="bg-[#050b17]/80 border border-[#122347] rounded-xl p-2.5">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Storage Footprint</span>
            <p className="text-base font-extrabold text-emerald-400 mt-0.5">{storageMetrics.totalUsageStr}</p>
          </div>

          <div className="bg-[#050b17]/80 border border-[#122347] rounded-xl p-2.5 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Retention Policy</span>
              <p className="text-xs font-bold text-blue-300 mt-0.5">Permanent • No Auto-Cleanup</p>
            </div>
            <Shield className="w-5 h-5 text-emerald-400" />
          </div>
        </div>
      </div>

      {/* 2. Main Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#162d59] pb-3">
        <div className="flex items-center gap-2 bg-[#060e1d] p-1 rounded-2xl border border-[#162d59]">
          <button
            onClick={() => {
              setActiveMainTab('files');
              setSearchQuery('');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeMainTab === 'files'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FolderOpen className="w-4 h-4 text-amber-300" />
            <span>File Storage ({documents.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveMainTab('datasets');
              setSearchQuery('');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeMainTab === 'datasets'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Code2 className="w-4 h-4 text-amber-300" />
            <span>Data Records (JSON/CSV) ({dataRecords.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveMainTab('audit_logs');
              setSearchQuery('');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeMainTab === 'audit_logs'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-300" />
            <span>Audit Trail & Sync Health</span>
          </button>
        </div>

        {/* Global Search & Filters */}
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeMainTab === 'files' ? "Search files, folders..." : "Search data records, tags, JSON..."}
              className="w-full pl-9 pr-3 py-1.5 bg-[#060e1d] border border-[#162d59] rounded-xl text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-[#060e1d] border border-[#162d59] text-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none cursor-pointer"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="az">Name A-Z</option>
            <option value="za">Name Z-A</option>
          </select>
        </div>
      </div>

      {/* Hidden File Input for Auto-Save Uploads */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        className="hidden"
        multiple={false}
      />

      {/* =========================================================================
          TAB 1: FILE STORAGE (Folders, Drag & Drop, Auto-Save Uploads, Lightbox)
          ========================================================================= */}
      {activeMainTab === 'files' && (
        <div className="space-y-5">
          
          {/* Breadcrumb Navigation & Batch Download */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#060e1d] border border-[#162d59] rounded-xl p-3 text-xs">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              {/* Back Button for Hierarchical Folder Navigation */}
              {activeFolderId && (
                <button
                  id="btn-folder-back"
                  onClick={handleGoBackOneLevel}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0e2247] hover:bg-[#153166] text-amber-300 hover:text-white rounded-lg text-xs font-extrabold transition-all border border-amber-400/40 cursor-pointer shadow-sm active:scale-95 mr-1"
                  title="Return to previous folder level or root directory"
                >
                  <ArrowLeft className="w-4 h-4 text-amber-400" />
                  <span>← Back</span>
                </button>
              )}

              <button
                onClick={() => setActiveFolderId(null)}
                className={`flex items-center gap-1.5 font-bold transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-[#0c1b36] ${
                  !activeFolderId ? 'text-amber-400' : 'text-slate-400 hover:text-white'
                }`}
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span>Root Storage</span>
              </button>

              {/* Dynamic Multi-Level Breadcrumb Chain */}
              {folderBreadcrumbTrail.map((crumb, idx) => {
                const isLast = idx === folderBreadcrumbTrail.length - 1;
                return (
                  <React.Fragment key={crumb.id}>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                    {isLast ? (
                      <span className="text-white font-extrabold flex items-center gap-1 truncate bg-blue-950/60 px-2.5 py-1 rounded-lg border border-blue-500/30">
                        <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                        {crumb.name}
                      </span>
                    ) : (
                      <button
                        onClick={() => setActiveFolderId(crumb.id)}
                        className="text-slate-300 hover:text-amber-300 font-bold flex items-center gap-1 truncate transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-[#0c1b36]"
                      >
                        <Folder className="w-3.5 h-3.5 text-blue-400" />
                        {crumb.name}
                      </button>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {activeFolderId && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBatchDownloadAll}
                  className="flex items-center gap-1 px-3 py-1 bg-[#091429] hover:bg-[#0e2247] text-blue-300 hover:text-white border border-blue-500/30 rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
                  title="Download all files in this directory"
                >
                  <Download className="w-3 h-3 text-amber-400" />
                  <span>Download Folder ({currentFolderFiles.length})</span>
                </button>

                <button
                  onClick={handleGoBackOneLevel}
                  className="px-2.5 py-1 bg-[#091429] hover:bg-[#122347] text-slate-300 rounded-lg text-[11px] font-bold cursor-pointer"
                >
                  Back One Level
                </button>
              </div>
            )}
          </div>

          {/* Active Uploading / Auto-Saving Visual Progress Bar */}
          {uploadingFile && (
            <div className="p-4 bg-[#091429] border border-blue-500/40 rounded-2xl shadow-xl animate-fadeIn space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {uploadingFile.status === 'saved' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-bounce" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
                  )}
                  <span className="font-bold text-white">
                    {uploadingFile.status === 'saved' ? 'Saved ✓' : 'Auto-Saving to Storage...'}
                  </span>
                  <span className="text-slate-400 font-mono">({uploadingFile.name} - {uploadingFile.size})</span>
                </div>
                <span className="font-mono font-bold text-amber-400">{uploadingFile.progress}%</span>
              </div>
              <div className="w-full h-2 bg-[#040812] rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-200 ${
                    uploadingFile.status === 'saved' ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-500 to-amber-400'
                  }`}
                  style={{ width: `${uploadingFile.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* VIEW: FOLDER DIRECTORY (When no folder is opened) */}
          {!activeFolderId ? (
            <div className="space-y-6">
              
              {/* Separated Root Navigation Layout Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                
                {/* ROOT 1: OPL (One-Point Lesson) Card */}
                <div className="bg-gradient-to-br from-[#07152e] to-[#0a1f42] border border-blue-500/40 rounded-3xl p-5 shadow-xl relative overflow-hidden flex flex-col justify-between group">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-600/20 text-amber-400 border border-blue-500/40 rounded-2xl shadow-inner group-hover:scale-105 transition-transform">
                          <Sparkles className="w-6 h-6 text-amber-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-extrabold text-white">OPL (One-Point Lesson)</h3>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40">
                              Standalone Root
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-slate-400">/01_OPL_One_Point_Lessons/</span>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-blue-300 bg-[#061021] px-2.5 py-1 rounded-lg border border-blue-900/50">
                        {folders.filter(f => f.parentId === 'f-opl-root').length} Sub-Directories
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      A standalone main directory dedicated to concise, visual single-point lessons, quick shop floor troubleshooting tips, and machine or process maintenance reminders.
                    </p>

                    {/* Quick Sub-folder Badges */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {[
                        { id: 'f-opl-safety', name: '01 Safety & PPE Visuals', icon: Shield },
                        { id: 'f-opl-troubleshoot', name: '02 Machine Troubleshooting', icon: HelpCircle },
                        { id: 'f-opl-maintenance', name: '03 Maintenance Reminders', icon: Wrench },
                        { id: 'f-opl-quality', name: '04 Quality Standard Guides', icon: CheckCircle2 }
                      ].map(sub => (
                        <button
                          key={sub.id}
                          onClick={() => setActiveFolderId(sub.id)}
                          className="flex items-center gap-2 p-2 rounded-xl bg-[#061022]/80 hover:bg-[#0c1f40] border border-[#162e5c] text-left transition-all cursor-pointer group/item"
                        >
                          <sub.icon className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                          <span className="text-[11px] font-bold text-slate-200 group-hover/item:text-white truncate">
                            {sub.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-blue-900/30 flex items-center justify-between">
                    <button
                      onClick={() => setRootCategoryFilter('OPL')}
                      className={`text-xs font-bold transition-colors cursor-pointer ${
                        rootCategoryFilter === 'OPL' ? 'text-amber-400 underline' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Filter View to OPL
                    </button>
                    <button
                      onClick={() => setActiveFolderId('f-opl-root')}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-extrabold shadow-md cursor-pointer transition-all active:scale-95"
                    >
                      <span>Open OPL Root</span>
                      <ArrowRight className="w-3.5 h-3.5 text-amber-300" />
                    </button>
                  </div>
                </div>

                {/* ROOT 2: Training Program Card */}
                <div className="bg-gradient-to-br from-[#07182a] to-[#09243b] border border-emerald-500/40 rounded-3xl p-5 shadow-xl relative overflow-hidden flex flex-col justify-between group">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 rounded-2xl shadow-inner group-hover:scale-105 transition-transform">
                          <GraduationCap className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-extrabold text-white">Training Program</h3>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/40">
                              Core Master Hub
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-slate-400">/02_Training_Program/</span>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-300 bg-[#05141e] px-2.5 py-1 rounded-lg border border-emerald-900/50">
                        4 Branches • 6 Cohorts
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      A main directory housing the core training modules and cohorts, subdivided into New Trainee Leader (6 batches), EHS Relevant, Anti-Bribery, and Stitching Skill.
                    </p>

                    {/* Quick Branch Navigation */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {[
                        { id: 'f-tp-leader-root', name: 'New Trainee Leader (6 Batches)', badge: '6 Cohorts', icon: Users },
                        { id: 'f-tp-ehs-root', name: 'EHS Relevant (SOP & Incidents)', badge: 'Safety', icon: Shield },
                        { id: 'f-tp-antibribery-root', name: 'Anti Bribery (ISO 37001)', badge: 'Compliance', icon: ShieldCheck },
                        { id: 'f-tp-stitching-root', name: 'Stitching Skill (Tech & QA)', badge: 'Operations', icon: Scissors }
                      ].map(br => (
                        <button
                          key={br.id}
                          onClick={() => setActiveFolderId(br.id)}
                          className="flex items-center justify-between p-2 rounded-xl bg-[#05141e]/80 hover:bg-[#0c293d] border border-[#163e52] text-left transition-all cursor-pointer group/item"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <br.icon className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                            <span className="text-[11px] font-bold text-slate-200 group-hover/item:text-white truncate">
                              {br.name}
                            </span>
                          </div>
                          <ChevronRight className="w-3 h-3 text-slate-500 group-hover/item:text-emerald-300 flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-emerald-900/30 flex items-center justify-between">
                    <button
                      onClick={() => setRootCategoryFilter('TP')}
                      className={`text-xs font-bold transition-colors cursor-pointer ${
                        rootCategoryFilter === 'TP' ? 'text-emerald-400 underline' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Filter View to Training Program
                    </button>
                    <button
                      onClick={() => setActiveFolderId('f-tp-root')}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold shadow-md cursor-pointer transition-all active:scale-95"
                    >
                      <span>Open Training Program Root</span>
                      <ArrowRight className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                </div>

              </div>

              {/* Root Navigation Filter Chips */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#060e1d] p-3 rounded-2xl border border-[#162d59]">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-slate-400 font-mono mr-1">Root View Filter:</span>
                  {[
                    { id: 'ALL', label: 'All Workspaces' },
                    { id: 'OPL', label: 'OPL (One-Point Lesson)' },
                    { id: 'TP', label: 'Training Program' },
                    { id: 'LDR', label: 'New Trainee Leader (6 Batches)' },
                    { id: 'EHS', label: 'EHS Relevant' },
                    { id: 'AB', label: 'Anti Bribery' },
                    { id: 'ST', label: 'Stitching Skill' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setRootCategoryFilter(tab.id as any)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        rootCategoryFilter === tab.id 
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40' 
                          : 'bg-[#0a1832] text-slate-300 hover:text-white border border-[#162d59]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setShowBlueprintModal(true)}
                  className="flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-white transition-colors cursor-pointer"
                >
                  <FolderTree className="w-3.5 h-3.5" />
                  <span>View Full Architecture Blueprint →</span>
                </button>
              </div>

              {/* Directory Grid Header */}
              <div className="flex items-center justify-between pt-1">
                <h2 className="text-sm font-extrabold text-white uppercase font-mono tracking-wider flex items-center gap-2">
                  <Folder className="w-4 h-4 text-amber-400" />
                  {rootCategoryFilter === 'ALL' 
                    ? `Workspace Directories (${filteredFolders.filter(f => !f.parentId || f.parentId === 'root').length})` 
                    : `Filtered Directories (${filteredFolders.length})`}
                </h2>
                <span className="text-xs text-slate-400">Click any directory to navigate its audit hierarchy</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredFolders.filter(f => rootCategoryFilter === 'ALL' ? (!f.parentId || f.parentId === 'root') : true).map((folder) => {
                  const count = folderFileCounts[folder.id] || 0;
                  const subCount = folders.filter(f => f.parentId === folder.id).length;
                  const isRenaming = renamingFolderId === folder.id;

                  return (
                    <div
                      key={folder.id}
                      onClick={() => !isRenaming && setActiveFolderId(folder.id)}
                      className="group bg-[#071122] hover:bg-[#0b1b36] border border-[#162d59] hover:border-blue-500/50 rounded-2xl p-4 transition-all duration-200 cursor-pointer shadow-lg relative flex flex-col justify-between"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="p-3 bg-[#0e2247] rounded-xl text-amber-400 border border-blue-500/20 group-hover:scale-105 transition-transform">
                          <Folder className="w-6 h-6 fill-amber-400/20 text-amber-400" />
                        </div>

                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => handleStartRenameFolder(folder, e)}
                            className="p-1 text-slate-400 hover:text-white rounded hover:bg-[#122347]"
                            title="Rename folder"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          
                          <button
                            onClick={(e) => handleDeleteFolder(folder.id, folder.name, e)}
                            className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-rose-950/40"
                            title="Delete folder and internal files"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 space-y-1">
                        {isRenaming ? (
                          <form onSubmit={handleSaveRenameFolder} onClick={(e) => e.stopPropagation()} className="space-y-1.5">
                            <input
                              type="text"
                              value={renamingFolderName}
                              onChange={(e) => setRenamingFolderName(e.target.value)}
                              className="w-full bg-[#040812] border border-amber-400 rounded px-2 py-1 text-xs text-white focus:outline-none"
                              autoFocus
                            />
                            <div className="flex items-center gap-1">
                              <button type="submit" className="px-2 py-0.5 bg-blue-600 text-white rounded text-[10px] font-bold">Save</button>
                              <button type="button" onClick={() => setRenamingFolderId(null)} className="px-2 py-0.5 bg-[#091429] text-slate-300 rounded text-[10px]">Cancel</button>
                            </div>
                          </form>
                        ) : (
                          <>
                            <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-1">
                              {folder.name}
                            </h3>
                            <p className="text-[11px] text-slate-400 font-mono">
                              {count} {count === 1 ? 'file' : 'files'} {subCount > 0 ? `• ${subCount} subfolder${subCount > 1 ? 's' : ''}` : ''}
                            </p>
                          </>
                        )}
                      </div>

                      <div className="mt-3 pt-3 border-t border-[#122347] flex items-center justify-between text-[10px] font-mono text-slate-500">
                        <span>Created: {folder.createdAt}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-amber-400 transition-colors" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* VIEW: ACTIVE FOLDER FILE LISTING & SUBFOLDERS */
            <div className="space-y-4">
              
              {/* Nested Subfolders in this Directory (if any) */}
              {folders.filter(f => f.parentId === activeFolderId).length > 0 && (
                <div className="space-y-2.5 pb-2">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                    <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
                    <span>Subfolders in "{activeFolder?.name}" ({folders.filter(f => f.parentId === activeFolderId).length})</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {folders.filter(f => f.parentId === activeFolderId).map(sub => {
                      const count = folderFileCounts[sub.id] || 0;
                      return (
                        <div
                          key={sub.id}
                          onClick={() => setActiveFolderId(sub.id)}
                          className="bg-[#071122] hover:bg-[#0b1b36] border border-[#162d59] hover:border-amber-400/50 rounded-xl p-3 flex items-center justify-between gap-2 cursor-pointer transition-all shadow-md group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-2 bg-[#0e2247] rounded-lg text-amber-400 group-hover:scale-105 transition-transform">
                              <Folder className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-white group-hover:text-amber-300 truncate">{sub.name}</h4>
                              <p className="text-[10px] text-slate-400 font-mono">{count} files</p>
                            </div>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-amber-400 transition-colors" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Drag & Drop Upload Zone with Instant Auto-Save */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={triggerFileInput}
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer relative overflow-hidden ${
                  isDragOver 
                    ? 'border-amber-400 bg-blue-950/40 scale-[1.01]' 
                    : 'border-[#162d59] bg-[#071122] hover:border-blue-500/60 hover:bg-[#0a1832]'
                }`}
              >
                <div className="max-w-md mx-auto space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-[#0e2247] border border-blue-500/30 mx-auto flex items-center justify-center text-amber-400 shadow-md">
                    <Upload className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-extrabold text-white">
                    Drop Files Here to Auto-Save into "{activeFolder?.name}"
                  </h3>
                  <p className="text-xs text-slate-400">
                    Supports Images, PDF, Word, Excel, CSV, PPTX, TXT, Archives (Up to 1GB). Automatically saves upon drop — no confirm button needed.
                  </p>
                </div>
              </div>

              {/* Type Filter Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1 bg-[#060e1d] p-1 rounded-xl border border-[#162d59]">
                  {['ALL', 'IMAGE', 'PDF', 'SPREADSHEET', 'DOCUMENT', 'ARCHIVE'].map((ft) => (
                    <button
                      key={ft}
                      onClick={() => setTypeFilter(ft)}
                      className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                        typeFilter === ft ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {ft}
                    </button>
                  ))}
                </div>

                <span className="text-[11px] font-mono text-slate-400">
                  Showing {currentFolderFiles.length} files
                </span>
              </div>

              {/* Files Grid */}
              {currentFolderFiles.length === 0 ? (
                <div className="p-12 text-center bg-[#071122] rounded-2xl border border-[#162d59] space-y-3">
                  <File className="w-10 h-10 text-slate-500 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-300">No files in this directory</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Click "Upload & Auto-Save" or drag files directly into the upload area above.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {currentFolderFiles.map((doc) => {
                    const ext = (doc.fileName || '').substring(doc.fileName.lastIndexOf('.')).toLowerCase();
                    const isImg = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext);
                    const isPdf = ext === '.pdf';
                    const isSheet = ['.xlsx', '.xls', '.csv'].includes(ext);
                    const isDoc = ['.docx', '.doc', '.txt', '.rtf', '.pptx', '.ppt'].includes(ext);
                    const isRecent = recentAutoSavedId === doc.id;

                    return (
                      <div
                        key={doc.id}
                        className={`bg-[#071122] border rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 hover:border-blue-500/50 shadow-lg group relative ${
                          isRecent ? 'border-emerald-500/80 bg-emerald-950/20 ring-2 ring-emerald-500/30' : 'border-[#162d59]'
                        }`}
                      >
                        {/* Auto-Save Badge */}
                        {isRecent && (
                          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 text-[10px] font-mono font-bold border border-emerald-500/40 flex items-center gap-1 animate-pulse">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>Saved ✓</span>
                          </div>
                        )}

                        <div>
                          {/* Thumbnail / Icon preview */}
                          <div 
                            onClick={() => setPreviewDoc(doc)}
                            className="w-full h-32 bg-[#040812] rounded-xl overflow-hidden mb-3 border border-[#122347] flex items-center justify-center cursor-pointer group-hover:border-blue-500/40 transition-colors relative"
                          >
                            {isImg && doc.fileUrl ? (
                              <img 
                                src={doc.fileUrl} 
                                alt={doc.name} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : isPdf ? (
                              <div className="text-center space-y-1">
                                <FileText className="w-10 h-10 text-rose-400 mx-auto" />
                                <span className="text-[10px] font-mono text-rose-300 font-bold">PDF DOCUMENT</span>
                              </div>
                            ) : isSheet ? (
                              <div className="text-center space-y-1">
                                <FileSpreadsheet className="w-10 h-10 text-emerald-400 mx-auto" />
                                <span className="text-[10px] font-mono text-emerald-300 font-bold">SPREADSHEET</span>
                              </div>
                            ) : (
                              <div className="text-center space-y-1">
                                <File className="w-10 h-10 text-blue-400 mx-auto" />
                                <span className="text-[10px] font-mono text-blue-300 font-bold">{ext.replace('.', '').toUpperCase() || 'FILE'}</span>
                              </div>
                            )}

                            <div className="absolute inset-0 bg-blue-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[1px]">
                              <span className="px-2.5 py-1 bg-black/80 rounded-lg text-[11px] font-bold text-white flex items-center gap-1">
                                <Eye className="w-3.5 h-3.5 text-amber-400" />
                                Preview
                              </span>
                            </div>
                          </div>

                          {/* File Details */}
                          <div className="space-y-1">
                            {editingDocId === doc.id ? (
                              <form onSubmit={(e) => handleSaveDocName(doc.id, e)} className="space-y-1">
                                <input
                                  type="text"
                                  value={editingDocName}
                                  onChange={(e) => setEditingDocName(e.target.value)}
                                  className="w-full bg-[#040812] border border-amber-400 rounded px-2 py-1 text-xs text-white focus:outline-none"
                                  autoFocus
                                />
                                <div className="flex items-center gap-1">
                                  <button type="submit" className="px-2 py-0.5 bg-blue-600 text-white rounded text-[10px] font-bold">Save</button>
                                  <button type="button" onClick={() => setEditingDocId(null)} className="px-2 py-0.5 bg-[#091429] text-slate-300 rounded text-[10px]">Cancel</button>
                                </div>
                              </form>
                            ) : (
                              <h4 
                                onClick={() => setPreviewDoc(doc)}
                                className="text-xs font-bold text-white hover:text-amber-300 transition-colors line-clamp-1 cursor-pointer"
                              >
                                {doc.name}
                              </h4>
                            )}
                            
                            <p className="text-[10px] font-mono text-slate-400 truncate">{doc.fileName}</p>
                          </div>
                        </div>

                        {/* File Action Toolbar */}
                        <div className="mt-3 pt-3 border-t border-[#122347] flex items-center justify-between text-xs">
                          <div className="text-[10px] font-mono text-slate-400">
                            {doc.fileSize}
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setEditingDocId(doc.id);
                                setEditingDocName(doc.name);
                              }}
                              className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-[#122347] cursor-pointer"
                              title="Rename display name"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={(e) => handleDownloadDoc(doc, e)}
                              className="p-1.5 text-slate-400 hover:text-amber-400 rounded hover:bg-[#122347] cursor-pointer"
                              title="Download file"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>

                            {/* REQUIREMENT #3: MANUAL DELETE WITH CONFIRMATION */}
                            <button
                              onClick={(e) => handleDeleteFile(doc, e)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 rounded hover:bg-rose-950/40 cursor-pointer"
                              title="Delete file permanently"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* =========================================================================
          TAB 2: DATA RECORDS & DATASETS (JSON, CSV, Raw Text/Markdown with Auto-Save)
          ========================================================================= */}
      {activeMainTab === 'datasets' && (
        <div className="space-y-4">
          
          {/* Format Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#060e1d] border border-[#162d59] rounded-xl p-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-slate-400 uppercase font-bold mr-1">Format:</span>
              {['ALL', 'json', 'csv', 'text'].map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setFormatFilter(fmt)}
                  className={`px-3 py-1 rounded-lg font-bold text-[11px] uppercase transition-all cursor-pointer ${
                    formatFilter === fmt ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Live Auto-Save Enabled
              </span>
            </div>
          </div>

          {/* Dataset Cards Grid */}
          {filteredDataRecords.length === 0 ? (
            <div className="p-12 text-center bg-[#071122] rounded-2xl border border-[#162d59] space-y-3">
              <Code2 className="w-10 h-10 text-slate-500 mx-auto" />
              <h4 className="text-sm font-bold text-slate-300">No data records found</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Create a new JSON, CSV, or SOP document dataset using the buttons above.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDataRecords.map((record) => {
                const isJson = record.format === 'json';
                const isCsv = record.format === 'csv';

                return (
                  <div
                    key={record.id}
                    className="bg-[#071122] border border-[#162d59] hover:border-blue-500/50 rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 shadow-lg group"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${
                          isJson ? 'bg-blue-950/80 text-blue-300 border-blue-500/40' :
                          isCsv ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40' :
                          'bg-amber-950/80 text-amber-300 border-amber-500/40'
                        }`}>
                          {record.format.toUpperCase()} DATASET
                        </span>

                        <span className="text-[10px] font-mono text-slate-400">
                          {record.size}
                        </span>
                      </div>

                      {/* Title & Category */}
                      <h3 
                        onClick={() => setActiveEditingRecord(record)}
                        className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-1 cursor-pointer"
                      >
                        {record.title}
                      </h3>
                      
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Category: <strong className="text-slate-200">{record.category}</strong>
                      </p>

                      {/* Content Preview Snippet */}
                      <div 
                        onClick={() => setActiveEditingRecord(record)}
                        className="mt-3 p-2.5 bg-[#040812] border border-[#122347] rounded-xl font-mono text-[11px] text-slate-300 max-h-24 overflow-hidden line-clamp-3 leading-relaxed cursor-pointer hover:border-blue-500/30 transition-colors"
                      >
                        {record.content}
                      </div>

                      {/* Tags */}
                      {record.tags && record.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2.5">
                          {record.tags.map((t, idx) => (
                            <span key={idx} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#0e2247] text-blue-300 border border-blue-500/20">
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-4 pt-3 border-t border-[#122347] flex items-center justify-between text-xs">
                      <span className="text-[10px] font-mono text-slate-500">
                        {record.autoSavedAt ? `Saved ${new Date(record.autoSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : `Updated ${record.updatedAt.split('T')[0]}`}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {isCsv && (
                          <button
                            onClick={() => setActiveViewingTableRecord(record)}
                            className="p-1.5 text-slate-300 hover:text-emerald-400 rounded hover:bg-[#122347] cursor-pointer"
                            title="Open Tabular Grid View"
                          >
                            <Table className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => setActiveEditingRecord(record)}
                          className="p-1.5 text-slate-300 hover:text-amber-400 rounded hover:bg-[#122347] cursor-pointer"
                          title="Edit dataset in workspace"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            const ext = isJson ? '.json' : isCsv ? '.csv' : '.txt';
                            const blob = new Blob([record.content], { type: 'text/plain;charset=utf-8' });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `${record.title.replace(/[^a-zA-Z0-9_-]/g, '_')}${ext}`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            URL.revokeObjectURL(url);
                            addToast('Exported', `File "${link.download}" exported.`, 'success');
                          }}
                          className="p-1.5 text-slate-300 hover:text-white rounded hover:bg-[#122347] cursor-pointer"
                          title="Export / Download raw file"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        {/* REQUIREMENT #3: MANUAL DELETE DATA ENTRY */}
                        <button
                          onClick={() => handleDeleteDataRecord(record.id, record.title)}
                          className="p-1.5 text-slate-300 hover:text-rose-400 rounded hover:bg-rose-950/40 cursor-pointer"
                          title="Delete dataset permanently"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* =========================================================================
          TAB 3: STORAGE HEALTH & AUDIT TRAIL
          ========================================================================= */}
      {activeMainTab === 'audit_logs' && (
        <div className="space-y-4">
          
          <div className="bg-[#071122] border border-[#162d59] rounded-2xl p-5 shadow-xl space-y-3">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              Storage Integrity & Retention Verification
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              DATIAN CSR HUB operates under a <strong>Dual-Layer Storage Architecture</strong>. All files and data entries are immediately written to the server container disk storage (`/storage_data/uploads/` & `database.json`) and synchronized to the browser’s persistent IndexedDB (`datian_csr_hub_files_db`).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3 bg-[#040812] border border-[#122347] rounded-xl text-xs">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Auto-Cleanup Status</span>
                <p className="font-extrabold text-emerald-400 mt-1">DISABLED (Permanent Retention)</p>
              </div>
              <div className="p-3 bg-[#040812] border border-[#122347] rounded-xl text-xs">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Disk Synchronization</span>
                <p className="font-extrabold text-blue-300 mt-1">Active SSE Stream (0.0.0.0:3000)</p>
              </div>
              <div className="p-3 bg-[#040812] border border-[#122347] rounded-xl text-xs">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Client Persistence</span>
                <p className="font-extrabold text-amber-400 mt-1">IndexedDB + LocalStorage</p>
              </div>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-[#071122] border border-[#162d59] rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 bg-[#050b17] border-b border-[#122347] flex items-center justify-between">
              <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                File & Data Operational Log ({auditLogs.length} Events)
              </h3>
              <button
                onClick={() => addToast('Refreshed', 'Storage logs synchronized.', 'info')}
                className="flex items-center gap-1 text-[11px] text-blue-300 hover:text-white cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Refresh Log</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className="bg-[#040812] border-b border-[#122347] font-mono text-[10px] text-amber-400 uppercase tracking-wider">
                    <th className="p-3">Event Time</th>
                    <th className="p-3">Action</th>
                    <th className="p-3">Target Name</th>
                    <th className="p-3">Size / Format</th>
                    <th className="p-3">Details</th>
                    <th className="p-3">User</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#102040]">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#0c1a36]/60 transition-colors text-slate-300">
                      <td className="p-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Just now'}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          log.action === 'AutoSave' || log.action === 'Upload' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' :
                          log.action === 'Delete' ? 'bg-rose-950 text-rose-300 border border-rose-500/30' :
                          'bg-blue-950 text-blue-300 border border-blue-500/30'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-white">{log.fileName}</td>
                      <td className="p-3 font-mono text-[11px] text-amber-300">{log.fileSize || log.fileType}</td>
                      <td className="p-3 text-slate-400 max-w-xs truncate">{log.details}</td>
                      <td className="p-3 font-mono text-[11px] text-slate-300">{log.performedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* =========================================================================
          MODALS & OVERLAYS
          ========================================================================= */}

      {/* 1. Lightbox / Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
          <div className="bg-[#091429] border border-[#162d59] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Lightbox Header */}
            <div className="p-4 bg-[#060e1d] border-b border-[#122347] flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <File className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <h3 className="font-bold text-white truncate">{previewDoc.name}</h3>
                <span className="text-[11px] font-mono text-slate-400">({previewDoc.fileSize})</span>
              </div>

              <div className="flex items-center gap-2">
                {/* Zoom Controls for Images */}
                {previewDoc.fileUrl && ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].some(ext => (previewDoc.fileName || '').toLowerCase().endsWith(ext)) && (
                  <div className="flex items-center gap-1 bg-[#040812] px-2 py-1 rounded-lg border border-[#122347]">
                    <button
                      onClick={() => setZoom(prev => Math.max(prev - 0.25, 0.5))}
                      className="p-1 text-slate-400 hover:text-white"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] font-mono text-amber-400 w-10 text-center">{Math.round(zoom * 100)}%</span>
                    <button
                      onClick={() => setZoom(prev => Math.min(prev + 0.25, 3))}
                      className="p-1 text-slate-400 hover:text-white"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setZoom(1)}
                      className="text-[10px] font-mono text-slate-400 hover:text-white px-1"
                    >
                      Reset
                    </button>
                  </div>
                )}

                <button
                  onClick={(e) => handleDownloadDoc(previewDoc, e)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>

                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#122347] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Lightbox Content Viewport */}
            <div className="flex-1 overflow-auto p-4 bg-[#03060e] flex items-center justify-center min-h-[300px]">
              {previewDoc.fileUrl ? (
                (() => {
                  const ext = (previewDoc.fileName || '').substring(previewDoc.fileName.lastIndexOf('.')).toLowerCase();
                  if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)) {
                    return (
                      <img 
                        src={previewDoc.fileUrl} 
                        alt={previewDoc.name}
                        style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
                        className="max-h-[60vh] max-w-full object-contain rounded-lg transition-transform duration-200"
                      />
                    );
                  }
                  if (ext === '.pdf') {
                    return (
                      <div className="w-full h-[60vh]">
                        <iframe 
                          src={previewDoc.fileUrl} 
                          title={previewDoc.name}
                          className="w-full h-full rounded-lg border border-[#122347]"
                        />
                      </div>
                    );
                  }
                  return (
                    <div className="p-8 text-center space-y-3">
                      <File className="w-16 h-16 text-blue-400 mx-auto" />
                      <h4 className="text-base font-bold text-white">{previewDoc.fileName}</h4>
                      <p className="text-xs text-slate-400">File is stored and ready for download.</p>
                      <button
                        onClick={(e) => handleDownloadDoc(previewDoc, e)}
                        className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs"
                      >
                        Download File
                      </button>
                    </div>
                  );
                })()
              ) : (
                <div className="p-8 text-center space-y-2">
                  <File className="w-12 h-12 text-slate-500 mx-auto" />
                  <p className="text-xs text-slate-400">Binary preview cached in server storage.</p>
                  <button
                    onClick={(e) => handleDownloadDoc(previewDoc, e)}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold"
                  >
                    Download from Server
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* 2. New Folder Creator Modal */}
      {isNewFolderOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#091429] border border-[#162d59] rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-amber-400" />
                Create New Directory Folder
              </h3>
              <button onClick={() => setIsNewFolderOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-mono uppercase font-bold text-slate-400">Folder Name</label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g. Safety SOP 2026, Chemical Inspection..."
                  className="w-full mt-1 bg-[#040812] border border-[#122347] rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewFolderOpen(false)}
                  className="px-3 py-2 bg-[#040812] hover:bg-[#091429] text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl cursor-pointer shadow-md"
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. REQUIREMENT #3: MANUAL DELETE CONFIRMATION PROMPT MODAL */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#091429] border border-rose-500/50 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-950/80 border border-rose-500/40 rounded-xl text-rose-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white">{confirmModal.title}</h3>
                <span className="text-[10px] font-mono text-rose-300">Permanent Removal Action</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {confirmModal.message}
            </p>

            <div className="p-3 bg-rose-950/30 border border-rose-500/30 rounded-xl text-[11px] text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>This record will be permanently deleted from both server disk and client cache.</span>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 bg-[#040812] hover:bg-[#091429] border border-[#162d59] text-slate-300 font-bold rounded-xl text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-extrabold rounded-xl text-xs cursor-pointer shadow-lg shadow-rose-950/50 transition-colors"
              >
                {confirmModal.confirmText || 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Structured Data Record Editor Modal (With Live Auto-Save) */}
      {activeEditingRecord && (
        <DataRecordEditorModal
          isOpen={!!activeEditingRecord}
          onClose={() => setActiveEditingRecord(null)}
          record={activeEditingRecord}
          onAutoSave={handleAutoSaveDataRecord}
          onDelete={handleDeleteDataRecord}
          addToast={addToast}
          categories={categoryOptions}
        />
      )}

      {/* 5. Structured Data Record Tabular Viewer Modal */}
      {activeViewingTableRecord && (
        <DataRecordTableViewerModal
          isOpen={!!activeViewingTableRecord}
          onClose={() => setActiveViewingTableRecord(null)}
          record={activeViewingTableRecord}
          onEdit={(rec) => setActiveEditingRecord(rec)}
          addToast={addToast}
        />
      )}

      {/* 6. System Backup Completed Modal */}
      {backupModalData?.isOpen && backupModalData.backup && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#09152b] border border-[#162d59] rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Backup Completed ✓</h3>
                  <p className="text-xs text-emerald-400 font-mono">Full System Snapshot Saved</p>
                </div>
              </div>
              <button
                onClick={() => setBackupModalData(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#050b17] border border-[#122347] rounded-xl p-4 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-[#122347]">
                <span className="text-slate-400">Archive File:</span>
                <span className="font-mono font-bold text-amber-300">{backupModalData.backup.fileName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#122347]">
                <span className="text-slate-400">Archive Size:</span>
                <span className="font-mono font-bold text-white">{backupModalData.backup.size}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#122347]">
                <span className="text-slate-400">Created At:</span>
                <span className="font-mono text-slate-300">{new Date(backupModalData.backup.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Created By:</span>
                <span className="font-bold text-blue-300">{backupModalData.backup.createdBy}</span>
              </div>
            </div>

            <div className="p-3 bg-blue-950/40 border border-blue-500/30 rounded-xl text-xs text-blue-200">
              This snapshot preserves all uploaded documents, data datasets, folders, and sync caches without altering or deleting any original files.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <a
                href={backupModalData.backup.downloadUrl}
                download={backupModalData.backup.fileName}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs shadow-md"
              >
                <Download className="w-4 h-4 text-amber-300" />
                <span>Download Archive (.json)</span>
              </a>

              <button
                onClick={() => setBackupModalData(null)}
                className="px-4 py-2 bg-[#050b17] hover:bg-[#0c1830] text-slate-300 rounded-xl text-xs font-bold border border-[#162d59]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Past System Backups History Modal */}
      {showPastBackupsModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#09152b] border border-[#162d59] rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 bg-[#060e1d] border-b border-[#122347] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Database className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">System Backup Snapshots & Archive History</h3>
              </div>
              <button
                onClick={() => setShowPastBackupsModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-3">
              {isLoadingPastBackups ? (
                <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
                  <span>Loading backup catalog...</span>
                </div>
              ) : pastBackupsList.length === 0 ? (
                <div className="p-8 text-center bg-[#050b17] rounded-xl border border-[#122347] space-y-2">
                  <Database className="w-8 h-8 text-slate-500 mx-auto" />
                  <p className="text-xs text-slate-400 font-medium">No previous snapshot archives found.</p>
                  <p className="text-[11px] text-slate-500">Click "Backup System Data" in the top bar to create your first backup.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {pastBackupsList.map((bk, i) => (
                    <div
                      key={bk.fileName || i}
                      className="bg-[#050b17] border border-[#122347] hover:border-blue-500/40 rounded-xl p-3 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white truncate">{bk.fileName}</span>
                          <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 font-mono text-[10px] font-bold">
                            {bk.size}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono">
                          Saved: {new Date(bk.createdAt).toLocaleString()} • Created By: {bk.createdBy || 'System Admin'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={async () => {
                            if (window.confirm(`Are you sure you want to restore system state to ${bk.fileName}? A safety copy of current data will be archived automatically.`)) {
                              try {
                                const res = await fetch('/api/system/restore', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ fileName: bk.fileName })
                                });
                                const json = await res.json();
                                if (json.success) {
                                  addToast('System Restored ✓', `Database restored from ${bk.fileName}.`, 'success');
                                  setShowPastBackupsModal(false);
                                  handleFetchPastBackups();
                                } else {
                                  throw new Error(json.error || 'Restore failed');
                                }
                              } catch (err: any) {
                                addToast('Restore Failed', err.message || 'Error restoring backup', 'warning');
                              }
                            }
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/70 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-lg text-xs font-bold border border-emerald-500/40 transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Restore</span>
                        </button>

                        <a
                          href={bk.downloadUrl}
                          download={bk.fileName}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0e2247] hover:bg-blue-600 text-blue-300 hover:text-white rounded-lg text-xs font-bold border border-blue-500/30 transition-colors flex-shrink-0"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-3 bg-[#060e1d] border-t border-[#122347] flex justify-end">
              <button
                onClick={() => setShowPastBackupsModal(false)}
                className="px-4 py-1.5 bg-[#0e2247] hover:bg-[#153166] text-slate-200 rounded-lg text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Standard Audit Blueprint & Architecture Specification Modal */}
      <BlueprintArchitectureModal
        isOpen={showBlueprintModal}
        onClose={() => setShowBlueprintModal(false)}
        onApplyStandardFolders={handleApplyStandardFolders}
        foldersCount={folders.length}
        documentsCount={documents.length}
        onSelectFolder={(targetFolderId) => setActiveFolderId(targetFolderId)}
      />

    </div>
  );
}
