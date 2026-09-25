/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { UserRole } from '../types';
import { 
  DepartmentFolder, 
  DepartmentTrainingRecord, 
  DepartmentCustomField, 
  DepartmentTrainingPhoto 
} from '../types';
import { 
  DEFAULT_DEPARTMENT_FOLDERS, 
  DEFAULT_TRAINING_RECORDS, 
  DEFAULT_CUSTOM_FIELDS 
} from './departmentTraining/defaultData';
import { syncEntityToMaster } from '../services/realtimeSync';
import DepartmentFolderGrid from './departmentTraining/DepartmentFolderGrid';
import DepartmentRecordList from './departmentTraining/DepartmentRecordList';
import DepartmentDashboard from './departmentTraining/DepartmentDashboard';
import DepartmentModal from './departmentTraining/DepartmentModal';
import TrainingRecordModal from './departmentTraining/TrainingRecordModal';
import TrainingRecordDetailsModal from './departmentTraining/TrainingRecordDetailsModal';
import CustomFieldsManagerModal from './departmentTraining/CustomFieldsManagerModal';
import PhotoLightboxModal from './departmentTraining/PhotoLightboxModal';
import ExcelSpreadsheet from './ExcelSpreadsheet';
import { ArrowLeft, FileSpreadsheet, Folder } from 'lucide-react';

interface DepartmentTrainingViewProps {
  items: any[];
  setItems: React.Dispatch<React.SetStateAction<any[]>>;
  role: UserRole;
  addToast: (title: string, message: string, type: 'success' | 'warning' | 'info') => void;
  registerBackHandler?: (handler: () => boolean) => () => void;
  currentUser?: { name: string; role: string };
  // Optional controlled state from App.tsx
  departmentFolders?: DepartmentFolder[];
  setDepartmentFolders?: React.Dispatch<React.SetStateAction<DepartmentFolder[]>>;
  departmentTrainingRecords?: DepartmentTrainingRecord[];
  setDepartmentTrainingRecords?: React.Dispatch<React.SetStateAction<DepartmentTrainingRecord[]>>;
  departmentCustomFields?: DepartmentCustomField[];
  setDepartmentCustomFields?: React.Dispatch<React.SetStateAction<DepartmentCustomField[]>>;
}

type ViewMode = 'folders' | 'department_records' | 'dashboard' | 'excel_ledger';

export default function DepartmentTrainingView({
  items,
  role,
  addToast,
  registerBackHandler,
  currentUser = { name: 'System Administrator', role: 'Admin' },
  departmentFolders: propFolders,
  setDepartmentFolders: propSetFolders,
  departmentTrainingRecords: propRecords,
  setDepartmentTrainingRecords: propSetRecords,
  departmentCustomFields: propCustomFields,
  setDepartmentCustomFields: propSetCustomFields,
}: DepartmentTrainingViewProps) {

  // Local fallback storage if props not passed directly from App.tsx
  const [internalFolders, setInternalFolders] = useState<DepartmentFolder[]>(() => {
    try {
      const saved = localStorage.getItem('csr_cached_departmentFolders');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_DEPARTMENT_FOLDERS;
  });

  const [internalRecords, setInternalRecords] = useState<DepartmentTrainingRecord[]>(() => {
    try {
      const saved = localStorage.getItem('csr_cached_departmentTrainingRecords');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_TRAINING_RECORDS;
  });

  const [internalCustomFields, setInternalCustomFields] = useState<DepartmentCustomField[]>(() => {
    try {
      const saved = localStorage.getItem('csr_cached_departmentCustomFields');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_CUSTOM_FIELDS;
  });

  // Effective state hooks
  const folders = propFolders || internalFolders;
  const setFolders = propSetFolders || setInternalFolders;

  const records = propRecords || internalRecords;
  const setRecords = propSetRecords || setInternalRecords;

  const customFields = propCustomFields || internalCustomFields;
  const setCustomFields = propSetCustomFields || setInternalCustomFields;

  // Auto-hydrate exact default data if state is empty
  useEffect(() => {
    if (!folders || folders.length === 0) {
      setFolders(DEFAULT_DEPARTMENT_FOLDERS);
      try {
        localStorage.setItem('csr_cached_departmentFolders', JSON.stringify(DEFAULT_DEPARTMENT_FOLDERS));
      } catch {}
      syncEntityToMaster('departmentFolders', DEFAULT_DEPARTMENT_FOLDERS);
    }
    if (!records || records.length === 0) {
      setRecords(DEFAULT_TRAINING_RECORDS);
      try {
        localStorage.setItem('csr_cached_departmentTrainingRecords', JSON.stringify(DEFAULT_TRAINING_RECORDS));
      } catch {}
      syncEntityToMaster('departmentTrainingRecords', DEFAULT_TRAINING_RECORDS);
    }
    if (!customFields || customFields.length === 0) {
      setCustomFields(DEFAULT_CUSTOM_FIELDS);
      try {
        localStorage.setItem('csr_cached_departmentCustomFields', JSON.stringify(DEFAULT_CUSTOM_FIELDS));
      } catch {}
      syncEntityToMaster('departmentCustomFields', DEFAULT_CUSTOM_FIELDS);
    }
  }, [folders, records, customFields, setFolders, setRecords, setCustomFields]);

  // Explicit user action to restore all exact data
  const handleRestoreExactData = useCallback(() => {
    setFolders(DEFAULT_DEPARTMENT_FOLDERS);
    setRecords(DEFAULT_TRAINING_RECORDS);
    setCustomFields(DEFAULT_CUSTOM_FIELDS);
    try {
      localStorage.setItem('csr_cached_departmentFolders', JSON.stringify(DEFAULT_DEPARTMENT_FOLDERS));
      localStorage.setItem('csr_cached_departmentTrainingRecords', JSON.stringify(DEFAULT_TRAINING_RECORDS));
      localStorage.setItem('csr_cached_departmentCustomFields', JSON.stringify(DEFAULT_CUSTOM_FIELDS));
    } catch {}
    syncEntityToMaster('departmentFolders', DEFAULT_DEPARTMENT_FOLDERS);
    syncEntityToMaster('departmentTrainingRecords', DEFAULT_TRAINING_RECORDS);
    syncEntityToMaster('departmentCustomFields', DEFAULT_CUSTOM_FIELDS);
    addToast('Exact Data Restored', 'All 13 factory department folders, 7 complete training records, and custom evaluation fields have been restored.', 'success');
  }, [setFolders, setRecords, setCustomFields, addToast]);

  // Navigation View State
  const [viewMode, setViewMode] = useState<ViewMode>('folders');
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);

  // Modal States
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [deptToEdit, setDeptToEdit] = useState<DepartmentFolder | null>(null);

  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<DepartmentTrainingRecord | null>(null);

  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedRecordForDetails, setSelectedRecordForDetails] = useState<DepartmentTrainingRecord | null>(null);

  const [isCustomFieldsModalOpen, setIsCustomFieldsModalOpen] = useState(false);

  // Lightbox State
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxPhotos, setLightboxPhotos] = useState<DepartmentTrainingPhoto[]>([]);
  const [lightboxInitialIndex, setLightboxInitialIndex] = useState(0);

  // Selected Department object
  const currentDepartment = useMemo(() => {
    if (!selectedDeptId) return null;
    return folders.find(d => d.id === selectedDeptId) || null;
  }, [folders, selectedDeptId]);

  // Back handler navigation stack integration
  useEffect(() => {
    if (!registerBackHandler) return;

    const unregister = registerBackHandler(() => {
      // 1. Lightbox takes top priority
      if (isLightboxOpen) {
        setIsLightboxOpen(false);
        return true;
      }
      // 2. Modals
      if (isDetailsModalOpen) {
        setIsDetailsModalOpen(false);
        return true;
      }
      if (isRecordModalOpen) {
        setIsRecordModalOpen(false);
        return true;
      }
      if (isDeptModalOpen) {
        setIsDeptModalOpen(false);
        return true;
      }
      if (isCustomFieldsModalOpen) {
        setIsCustomFieldsModalOpen(false);
        return true;
      }
      // 3. Sub-views return to main folders grid
      if (viewMode !== 'folders') {
        setViewMode('folders');
        setSelectedDeptId(null);
        return true;
      }
      return false;
    });

    return unregister;
  }, [
    registerBackHandler, 
    isLightboxOpen, 
    isDetailsModalOpen, 
    isRecordModalOpen, 
    isDeptModalOpen, 
    isCustomFieldsModalOpen, 
    viewMode
  ]);

  // ==================== ACTIONS: DEPARTMENTS ====================
  const handleOpenAddDepartment = () => {
    setDeptToEdit(null);
    setIsDeptModalOpen(true);
  };

  const handleOpenEditDepartment = (dept: DepartmentFolder) => {
    setDeptToEdit(dept);
    setIsDeptModalOpen(true);
  };

  const handleSaveDepartment = (deptData: Partial<DepartmentFolder>) => {
    let updated: DepartmentFolder[];
    if (deptData.id) {
      // Update existing
      updated = folders.map(d => {
        if (d.id === deptData.id) {
          return {
            ...d,
            ...deptData,
            updatedAt: new Date().toISOString(),
          } as DepartmentFolder;
        }
        return d;
      });
      addToast('Department Updated', `Folder "${deptData.name}" updated successfully.`, 'success');
    } else {
      // Create new
      const newDept: DepartmentFolder = {
        id: `dept-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: deptData.name || 'New Department',
        code: deptData.code,
        description: deptData.description,
        icon: deptData.icon || 'Building2',
        color: deptData.color || '#3b82f6',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      updated = [...folders, newDept];
      addToast('Department Created', `New folder "${newDept.name}" added to filing system.`, 'success');
    }

    setFolders(updated);
    try {
      localStorage.setItem('csr_cached_departmentFolders', JSON.stringify(updated));
    } catch {}
    syncEntityToMaster('departmentFolders', updated);
  };

  const handleDeleteDepartment = (deptId: string) => {
    const targetDept = folders.find(d => d.id === deptId);
    const updatedFolders = folders.filter(d => d.id !== deptId);
    const updatedRecords = records.filter(r => r.departmentId !== deptId);

    setFolders(updatedFolders);
    setRecords(updatedRecords);

    try {
      localStorage.setItem('csr_cached_departmentFolders', JSON.stringify(updatedFolders));
      localStorage.setItem('csr_cached_departmentTrainingRecords', JSON.stringify(updatedRecords));
    } catch {}

    syncEntityToMaster('departmentFolders', updatedFolders);
    syncEntityToMaster('departmentTrainingRecords', updatedRecords);

    if (selectedDeptId === deptId) {
      setSelectedDeptId(null);
      setViewMode('folders');
    }

    addToast('Department Deleted', `Folder "${targetDept?.name || deptId}" and records removed.`, 'info');
  };

  // ==================== ACTIONS: TRAINING RECORDS ====================
  const handleOpenAddRecord = (deptId?: string) => {
    setRecordToEdit(null);
    if (deptId) setSelectedDeptId(deptId);
    setIsRecordModalOpen(true);
  };

  const handleOpenEditRecord = (record: DepartmentTrainingRecord) => {
    setRecordToEdit(record);
    setIsRecordModalOpen(true);
  };

  const handleSaveRecord = (recordData: DepartmentTrainingRecord) => {
    let updated: DepartmentTrainingRecord[];
    const exists = records.some(r => r.id === recordData.id);

    if (exists) {
      updated = records.map(r => r.id === recordData.id ? recordData : r);
      addToast('Training Record Updated', `Record "${recordData.subject}" has been updated.`, 'success');
    } else {
      updated = [recordData, ...records];
      addToast('Training Record Saved', `Record "${recordData.subject}" successfully added.`, 'success');
    }

    setRecords(updated);
    try {
      localStorage.setItem('csr_cached_departmentTrainingRecords', JSON.stringify(updated));
    } catch {}
    syncEntityToMaster('departmentTrainingRecords', updated);

    // If details modal was open, refresh it
    if (selectedRecordForDetails?.id === recordData.id) {
      setSelectedRecordForDetails(recordData);
    }
  };

  const handleDeleteRecord = (recordId: string) => {
    const updated = records.filter(r => r.id !== recordId);
    setRecords(updated);
    try {
      localStorage.setItem('csr_cached_departmentTrainingRecords', JSON.stringify(updated));
    } catch {}
    syncEntityToMaster('departmentTrainingRecords', updated);

    if (selectedRecordForDetails?.id === recordId) {
      setSelectedRecordForDetails(null);
      setIsDetailsModalOpen(false);
    }
    addToast('Record Deleted', `Training record ${recordId} removed.`, 'info');
  };

  const handleViewRecordDetails = (record: DepartmentTrainingRecord) => {
    setSelectedRecordForDetails(record);
    setIsDetailsModalOpen(true);
  };

  // ==================== ACTIONS: CUSTOM FIELDS ====================
  const handleSaveCustomFields = (updatedFields: DepartmentCustomField[]) => {
    setCustomFields(updatedFields);
    try {
      localStorage.setItem('csr_cached_departmentCustomFields', JSON.stringify(updatedFields));
    } catch {}
    syncEntityToMaster('departmentCustomFields', updatedFields);
    addToast('Custom Fields Saved', 'Evaluation attributes updated successfully.', 'success');
  };

  // ==================== ACTIONS: PHOTO LIGHTBOX ====================
  const handleOpenLightbox = (photosList: DepartmentTrainingPhoto[], index: number) => {
    setLightboxPhotos(photosList);
    setLightboxInitialIndex(index);
    setIsLightboxOpen(true);
  };

  const handleUpdatePhotoCaptionFromLightbox = (photoId: string, newCaption: string) => {
    // Update in records
    const updatedRecords = records.map(r => {
      if (!r.photos) return r;
      const photoExists = r.photos.some(p => p.id === photoId);
      if (!photoExists) return r;

      return {
        ...r,
        photos: r.photos.map(p => p.id === photoId ? { ...p, caption: newCaption } : p),
      };
    });

    setRecords(updatedRecords);
    try {
      localStorage.setItem('csr_cached_departmentTrainingRecords', JSON.stringify(updatedRecords));
    } catch {}
    syncEntityToMaster('departmentTrainingRecords', updatedRecords);

    // Update in lightbox
    setLightboxPhotos(prev => prev.map(p => p.id === photoId ? { ...p, caption: newCaption } : p));
  };

  const handleDeletePhotoFromLightbox = (photoId: string) => {
    const updatedRecords = records.map(r => {
      if (!r.photos) return r;
      return {
        ...r,
        photos: r.photos.filter(p => p.id !== photoId),
      };
    });

    setRecords(updatedRecords);
    try {
      localStorage.setItem('csr_cached_departmentTrainingRecords', JSON.stringify(updatedRecords));
    } catch {}
    syncEntityToMaster('departmentTrainingRecords', updatedRecords);

    setLightboxPhotos(prev => prev.filter(p => p.id !== photoId));
    addToast('Photo Removed', 'Documentation photo removed from record.', 'info');
  };

  // Legacy Excel Workspace configuration for backward compatibility
  const initialWorkspace = useMemo(() => {
    const cells: { [key: string]: any } = {};

    const headers = [
      'Record ID', 'Department', 'Training Subject', 
      'Trainer', 'Date', 'Trainees', 
      'Total Time', 'Status', 'Venue'
    ];

    headers.forEach((h, colIdx) => {
      cells[`0,${colIdx}`] = {
        value: h,
        bold: true,
        backgroundColor: '#0f172a',
        color: '#ffffff',
        align: 'center',
        borderAll: true
      };
    });

    records.forEach((rec, rowIdx) => {
      const r = rowIdx + 1;
      const values = [
        rec.id,
        rec.departmentName || 'General',
        rec.subject || '',
        rec.trainer || '',
        rec.date || '',
        rec.traineesCount ?? 0,
        rec.totalTime || '',
        rec.status || 'Completed',
        rec.venue || ''
      ];

      values.forEach((val, colIdx) => {
        let align: 'left' | 'center' | 'right' = 'left';
        if ([0, 4, 5, 6, 7].includes(colIdx)) align = 'center';

        let backgroundColor = '#ffffff';
        if (colIdx === 7) {
          backgroundColor = val === 'Completed' ? '#ecfdf5' : (val === 'In Progress' ? '#f0f9ff' : '#fffbeb');
        }

        cells[`${r},${colIdx}`] = {
          value: val,
          align,
          backgroundColor,
          borderAll: true,
          dropdown: colIdx === 7 ? ['Completed', 'In Progress', 'Scheduled', 'Cancelled'] : undefined
        };
      });
    });

    return [
      {
        id: 'dept_training_ledger_master',
        name: 'Master Training Records',
        updatedAt: new Date().toISOString(),
        sheets: [
          {
            name: 'All Records Ledger',
            cells,
            rowsCount: Math.max(80, records.length + 15),
            colsCount: 12,
            columnWidths: {
              0: 160, // Record ID
              1: 140, // Dept
              2: 280, // Subject
              3: 160, // Trainer
              4: 120, // Date
              5: 90,  // Trainees
              6: 120, // Time
              7: 120, // Status
              8: 160  // Venue
            },
            rowHeights: {},
            freezeRows: 1,
            freezeCols: 2,
            merges: [],
            shapes: [],
            images: []
          }
        ],
        activeSheetIndex: 0
      }
    ];
  }, [records]);

  const canEdit = role === 'Admin';

  return (
    <div id="department-training-view-container" className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      
      {/* 1. MAIN DEPARTMENT FOLDERS GRID */}
      {viewMode === 'folders' && (
        <DepartmentFolderGrid
          departments={folders}
          records={records}
          onSelectDepartment={(deptId) => {
            setSelectedDeptId(deptId);
            setViewMode('department_records');
          }}
          onAddDepartment={handleOpenAddDepartment}
          onEditDepartment={handleOpenEditDepartment}
          onDeleteDepartment={handleDeleteDepartment}
          onAddRecordForDept={(deptId) => handleOpenAddRecord(deptId)}
          onOpenCustomFieldsModal={() => setIsCustomFieldsModalOpen(true)}
          onSwitchToDashboard={() => setViewMode('dashboard')}
          onSwitchToExcel={() => setViewMode('excel_ledger')}
          onRestoreExactData={handleRestoreExactData}
          canEdit={canEdit}
        />
      )}

      {/* 2. INSIDE SPECIFIC DEPARTMENT FOLDER */}
      {viewMode === 'department_records' && currentDepartment && (
        <DepartmentRecordList
          department={currentDepartment}
          allDepartments={folders}
          records={records}
          customFields={customFields}
          onBackToDepartments={() => {
            setViewMode('folders');
            setSelectedDeptId(null);
          }}
          onSelectDepartment={(deptId) => setSelectedDeptId(deptId)}
          onAddRecord={() => handleOpenAddRecord(currentDepartment.id)}
          onEditRecord={handleOpenEditRecord}
          onDeleteRecord={handleDeleteRecord}
          onViewRecordDetails={handleViewRecordDetails}
          onOpenCustomFieldsModal={() => setIsCustomFieldsModalOpen(true)}
          onOpenPhotoLightbox={handleOpenLightbox}
          canEdit={canEdit}
        />
      )}

      {/* 3. MASTER ANALYTICS DASHBOARD */}
      {viewMode === 'dashboard' && (
        <DepartmentDashboard
          departments={folders}
          records={records}
          onBackToFolders={() => setViewMode('folders')}
          onSelectDepartment={(deptId) => {
            setSelectedDeptId(deptId);
            setViewMode('department_records');
          }}
          onViewRecordDetails={handleViewRecordDetails}
        />
      )}

      {/* 4. LEGACY EXCEL SPREADSHEET VIEW (For backward compatibility) */}
      {viewMode === 'excel_ledger' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-[#09162e] border border-blue-900/40">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setViewMode('folders')}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Department Folders</span>
              </button>
              <div className="h-6 w-[1px] bg-slate-800" />
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  Spreadsheet Matrix Ledger
                </h2>
                <p className="text-xs text-slate-400">
                  Tabular view with custom cell formatting, math formulas, and instant print preview.
                </p>
              </div>
            </div>
          </div>

          <ExcelSpreadsheet
            storageKey="department_training_ledger_master"
            role={role}
            addToast={addToast}
            defaultTemplateName="Dept Training Ledger"
            initialTemplateData={initialWorkspace}
          />
        </div>
      )}

      {/* ==================== ALL MODALS ==================== */}

      {/* Department Add/Edit Modal */}
      <DepartmentModal
        isOpen={isDeptModalOpen}
        onClose={() => setIsDeptModalOpen(false)}
        departmentToEdit={deptToEdit}
        onSaveDepartment={handleSaveDepartment}
        onDeleteDepartment={handleDeleteDepartment}
        recordCount={deptToEdit ? records.filter(r => r.departmentId === deptToEdit.id).length : 0}
      />

      {/* Training Record Add/Edit Modal */}
      <TrainingRecordModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        recordToEdit={recordToEdit}
        departments={folders}
        defaultDepartmentId={selectedDeptId || folders[0]?.id}
        customFields={customFields}
        onSaveRecord={handleSaveRecord}
        existingRecords={records}
        currentUser={currentUser}
        onOpenPhotoLightbox={handleOpenLightbox}
      />

      {/* Training Record Details & Printable Sheet Modal */}
      <TrainingRecordDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        record={selectedRecordForDetails}
        department={folders.find(d => d.id === selectedRecordForDetails?.departmentId)}
        customFields={customFields}
        onEdit={(rec) => {
          setIsDetailsModalOpen(false);
          handleOpenEditRecord(rec);
        }}
        onDelete={handleDeleteRecord}
        onOpenPhotoLightbox={handleOpenLightbox}
        canEdit={canEdit}
      />

      {/* Custom Fields Configuration Modal */}
      <CustomFieldsManagerModal
        isOpen={isCustomFieldsModalOpen}
        onClose={() => setIsCustomFieldsModalOpen(false)}
        customFields={customFields}
        onSaveCustomFields={handleSaveCustomFields}
        currentDepartment={currentDepartment}
        departments={folders}
      />

      {/* Fullscreen Photo Lightbox Modal */}
      <PhotoLightboxModal
        isOpen={isLightboxOpen}
        photos={lightboxPhotos}
        initialIndex={lightboxInitialIndex}
        onClose={() => setIsLightboxOpen(false)}
        onUpdateCaption={handleUpdatePhotoCaptionFromLightbox}
        onDeletePhoto={handleDeletePhotoFromLightbox}
        canEdit={canEdit}
      />

    </div>
  );
}
