/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Upload, 
  Image as ImageIcon, 
  FileText, 
  Trash2, 
  Check, 
  Sparkles, 
  Calendar, 
  Clock, 
  Users, 
  MapPin, 
  Award, 
  HelpCircle,
  Eye,
  Plus,
  Paperclip,
  FileSpreadsheet,
  FileCheck
} from 'lucide-react';
import { 
  DepartmentTrainingRecord, 
  DepartmentFolder, 
  DepartmentCustomField, 
  DepartmentTrainingPhoto, 
  DepartmentTrainingDoc 
} from '../../types';

interface TrainingRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  recordToEdit?: DepartmentTrainingRecord | null;
  departments: DepartmentFolder[];
  defaultDepartmentId?: string;
  customFields: DepartmentCustomField[];
  onSaveRecord: (record: DepartmentTrainingRecord) => void;
  existingRecords: DepartmentTrainingRecord[];
  currentUser?: { name: string; role: string };
  onOpenPhotoLightbox?: (photos: DepartmentTrainingPhoto[], index: number) => void;
}

const TRAINING_TYPES = [
  'Internal Technical Training',
  'External / Buyer Certified',
  'New Hire Orientation',
  'Annual Refresher Course',
  'SOP & Compliance Standards',
  'On-the-job Training (OJT)',
  'Health & Safety / Fire Drill',
  'Leadership & Supervisory Skills',
  'Lean 6S / Continuous Improvement',
  'Other Specialized Workshop'
];

const TRAINING_CATEGORIES = [
  'CSR & Code of Conduct',
  'Quality Assurance & AQL',
  'Technical Line Operations',
  'Occupational Safety & Health',
  'Environmental Management (EMS)',
  'Human Resources & Welfare',
  'Machinery Preventive Maintenance',
  'Information Technology & Cyber'
];

const DOC_CATEGORIES = [
  'Attendance Sheet',
  'Training Material / Slide Deck',
  'Training Evaluation / Exam',
  'Training Report & Metrics',
  'Training Certificate',
  'Other Supporting Document'
];

export const TrainingRecordModal: React.FC<TrainingRecordModalProps> = ({
  isOpen,
  onClose,
  recordToEdit,
  departments,
  defaultDepartmentId,
  customFields,
  onSaveRecord,
  existingRecords,
  currentUser,
  onOpenPhotoLightbox,
}) => {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [recordId, setRecordId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [subject, setSubject] = useState('');
  const [traineesCount, setTraineesCount] = useState<number | ''>(20);
  const [totalTime, setTotalTime] = useState('1 Hour');
  const [totalHours, setTotalHours] = useState<number | ''>(1.0);
  const [trainer, setTrainer] = useState('');
  const [trainingType, setTrainingType] = useState('Internal Technical Training');
  const [venue, setVenue] = useState('DTP Training Room');
  const [startTime, setStartTime] = useState('09:00 AM');
  const [endTime, setEndTime] = useState('10:00 AM');
  const [category, setCategory] = useState('Technical Line Operations');
  const [targetParticipants, setTargetParticipants] = useState('');
  const [batch, setBatch] = useState('');
  const [trainingObjective, setTrainingObjective] = useState('');
  const [remarks, setRemarks] = useState('');
  const [status, setStatus] = useState<'Completed' | 'In Progress' | 'Scheduled' | 'Cancelled'>('Completed');

  // Custom field values state: customFieldId -> value
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});

  // Documentation states
  const [photos, setPhotos] = useState<DepartmentTrainingPhoto[]>([]);
  const [documents, setDocuments] = useState<DepartmentTrainingDoc[]>([]);

  // Selected doc category for next upload
  const [selectedDocCategory, setSelectedDocCategory] = useState('Attendance Sheet');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  // Auto-generate next record ID when department or date changes
  const generateRecordId = (deptId: string, recordDate: string): string => {
    const dept = departments.find(d => d.id === deptId);
    const code = dept?.code || 'GEN';
    const year = recordDate ? new Date(recordDate).getFullYear() : new Date().getFullYear();
    const countForDeptAndYear = existingRecords.filter(r => 
      r.departmentId === deptId && r.year === year
    ).length + 1;
    const padded = String(countForDeptAndYear).padStart(4, '0');
    return `DTR-${code}-${year}-${padded}`;
  };

  useEffect(() => {
    if (isOpen) {
      if (recordToEdit) {
        setRecordId(recordToEdit.id);
        setDepartmentId(recordToEdit.departmentId);
        setDate(recordToEdit.date || new Date().toISOString().split('T')[0]);
        setSubject(recordToEdit.subject || '');
        setTraineesCount(recordToEdit.traineesCount ?? 0);
        setTotalTime(recordToEdit.totalTime || '1 Hour');
        setTotalHours(recordToEdit.totalHours ?? 1);
        setTrainer(recordToEdit.trainer || '');
        setTrainingType(recordToEdit.trainingType || 'Internal Technical Training');
        setVenue(recordToEdit.venue || 'DTP Training Room');
        setStartTime(recordToEdit.startTime || '09:00 AM');
        setEndTime(recordToEdit.endTime || '10:00 AM');
        setCategory(recordToEdit.category || 'Technical Line Operations');
        setTargetParticipants(recordToEdit.targetParticipants || '');
        setBatch(recordToEdit.batch || '');
        setTrainingObjective(recordToEdit.trainingObjective || '');
        setRemarks(recordToEdit.remarks || '');
        setStatus(recordToEdit.status || 'Completed');
        setCustomFieldValues(recordToEdit.customFields || {});
        setPhotos(recordToEdit.photos || []);
        setDocuments(recordToEdit.documents || []);
      } else {
        const initialDeptId = defaultDepartmentId || departments[0]?.id || '';
        const today = new Date().toISOString().split('T')[0];
        setDepartmentId(initialDeptId);
        setDate(today);
        setRecordId(generateRecordId(initialDeptId, today));
        setSubject('');
        setTraineesCount(20);
        setTotalTime('1 Hour');
        setTotalHours(1.0);
        setTrainer(currentUser?.name || '');
        setTrainingType('Internal Technical Training');
        setVenue('DTP Training Room');
        setStartTime('09:00 AM');
        setEndTime('10:00 AM');
        setCategory('Technical Line Operations');
        setTargetParticipants('');
        setBatch(`Batch ${new Date().getFullYear()}-01`);
        setTrainingObjective('');
        setRemarks('');
        setStatus('Completed');
        setCustomFieldValues({});
        setPhotos([]);
        setDocuments([]);
      }
    }
  }, [isOpen, recordToEdit, defaultDepartmentId, departments]);

  if (!isOpen) return null;

  // Recalculate hours helper from totalTime string if user edits totalTime
  const handleTotalTimeChange = (val: string) => {
    setTotalTime(val);
    const numMatch = val.match(/([0-9]+(\.[0-9]+)?)/);
    if (numMatch) {
      const num = parseFloat(numMatch[1]);
      if (val.toLowerCase().includes('min')) {
        setTotalHours(Number((num / 60).toFixed(2)));
      } else {
        setTotalHours(num);
      }
    }
  };

  // Upload Photo handler (JPG, JPEG, PNG, WEBP)
  const handlePhotoFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploadingPhoto(true);

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const newPhotos: DepartmentTrainingPhoto[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!allowedTypes.includes(file.type.toLowerCase())) {
        alert(`File "${file.name}" is not a supported image format. Please upload JPG, PNG, or WEBP.`);
        continue;
      }

      // Convert to base64
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const fileSizeStr = file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
        : `${(file.size / 1024).toFixed(1)} KB`;

      // Try uploading to backend API
      let photoObj: DepartmentTrainingPhoto = {
        id: `photo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        url: dataUrl,
        dataUrl,
        downloadUrl: dataUrl,
        fileName: file.name,
        fileSize: fileSizeStr,
        mimeType: file.type,
        caption: `Photo ${photos.length + newPhotos.length + 1}`,
        uploadedAt: new Date().toISOString(),
      };

      try {
        const res = await fetch('/api/department-training/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
            mimeType: file.type,
            dataUrl,
            category: 'Photo',
            caption: photoObj.caption,
            recordId,
            departmentId,
            uploadedBy: currentUser?.name || 'User',
          }),
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success && json.file) {
            photoObj = {
              ...photoObj,
              id: json.file.id,
              url: json.file.url,
              downloadUrl: json.file.downloadUrl,
            };
          }
        }
      } catch (err) {
        console.warn('[Photo Upload Server Warn] Storing locally with instant dataUrl:', err);
      }

      newPhotos.push(photoObj);
    }

    setPhotos(prev => [...prev, ...newPhotos]);
    setIsUploadingPhoto(false);
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  // Upload Document handler (PDF, DOCX, XLSX, PPTX)
  const handleDocFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploadingDoc(true);

    const newDocs: DepartmentTrainingDoc[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split('.').pop()?.toLowerCase() || 'file';

      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const fileSizeStr = file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
        : `${(file.size / 1024).toFixed(1)} KB`;

      let docObj: DepartmentTrainingDoc = {
        id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        url: dataUrl,
        dataUrl,
        downloadUrl: dataUrl,
        fileName: file.name,
        fileSize: fileSizeStr,
        fileType: ext,
        category: selectedDocCategory,
        uploadedAt: new Date().toISOString(),
      };

      try {
        const res = await fetch('/api/department-training/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            fileType: ext,
            mimeType: file.type || 'application/octet-stream',
            dataUrl,
            category: selectedDocCategory,
            recordId,
            departmentId,
            uploadedBy: currentUser?.name || 'User',
          }),
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success && json.file) {
            docObj = {
              ...docObj,
              id: json.file.id,
              url: json.file.url,
              downloadUrl: json.file.downloadUrl,
            };
          }
        }
      } catch (err) {
        console.warn('[Doc Upload Server Warn] Storing locally:', err);
      }

      newDocs.push(docObj);
    }

    setDocuments(prev => [...prev, ...newDocs]);
    setIsUploadingDoc(false);
    if (docInputRef.current) docInputRef.current.value = '';
  };

  const handleUpdatePhotoCaption = (photoId: string, newCaption: string) => {
    setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, caption: newCaption } : p));
  };

  const handleDeletePhoto = (photoId: string) => {
    setPhotos(prev => prev.filter(p => p.id !== photoId));
  };

  const handleDeleteDoc = (docId: string) => {
    setDocuments(prev => prev.filter(d => d.id !== docId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim()) {
      alert('Please enter the Subject / Training Title.');
      return;
    }
    if (!departmentId) {
      alert('Please select a Department.');
      return;
    }

    const selectedDept = departments.find(d => d.id === departmentId);
    const parsedYear = date ? new Date(date).getFullYear() : new Date().getFullYear();

    const finalRecord: DepartmentTrainingRecord = {
      id: recordId.trim() || generateRecordId(departmentId, date),
      departmentId,
      departmentName: selectedDept?.name || 'General',
      date,
      subject: subject.trim(),
      traineesCount: Number(traineesCount) || 0,
      totalTime: totalTime.trim() || '1 Hour',
      totalHours: typeof totalHours === 'number' ? totalHours : parseFloat(String(totalHours)) || 1.0,
      trainer: trainer.trim() || 'N/A',
      trainingType,
      venue: venue.trim(),
      startTime: startTime.trim(),
      endTime: endTime.trim(),
      category,
      targetParticipants: targetParticipants.trim(),
      batch: batch.trim(),
      trainingObjective: trainingObjective.trim(),
      remarks: remarks.trim(),
      status,
      createdBy: recordToEdit?.createdBy || currentUser?.name || 'System User',
      dateCreated: recordToEdit?.dateCreated || new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      year: parsedYear,
      customFields: customFieldValues,
      photos,
      documents,
    };

    onSaveRecord(finalRecord);
    onClose();
  };

  // Filter applicable custom fields for this department
  const applicableCustomFields = customFields.filter(f => 
    f.scope === 'all' || f.scope === departmentId
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div 
        id="training-record-modal"
        className="w-full max-w-4xl bg-[#09152a] border border-blue-900/60 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-blue-900/40 bg-[#071120] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  {recordToEdit ? 'Edit Training Record' : 'New Department Training Record'}
                </h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-900/60 border border-blue-500/40 text-blue-300 font-bold">
                  {recordId}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Log comprehensive training activities, photos, documentation, and evaluation data.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          
          {/* SECTION 1: CORE REQUIRED IDENTIFIERS */}
          <div className="bg-[#0b1c38]/60 p-4 rounded-xl border border-blue-900/30 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5" />
              1. Core Information (Mandatory)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* Department */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Department <span className="text-red-400">*</span>
                </label>
                <select
                  required
                  value={departmentId}
                  onChange={(e) => {
                    setDepartmentId(e.target.value);
                    if (!recordToEdit) {
                      setRecordId(generateRecordId(e.target.value, date));
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
                >
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} {d.code ? `(${d.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Record ID */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Record ID
                </label>
                <input
                  type="text"
                  value={recordId}
                  onChange={(e) => setRecordId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Training Date <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    if (!recordToEdit) {
                      setRecordId(generateRecordId(departmentId, e.target.value));
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Training Status <span className="text-red-400">*</span>
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
                >
                  <option value="Completed">Completed</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Subject / Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Subject / Training Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Effective Communication / Team and Management, Needle Tension Calibration"
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm font-medium focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Trainees & Time Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  No. of Trainees <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={traineesCount}
                  onChange={(e) => setTraineesCount(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                  placeholder="e.g. 25"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Total Training Time <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={totalTime}
                  onChange={(e) => handleTotalTimeChange(e.target.value)}
                  placeholder="e.g. 1 Hour, 2.5 Hours, 45 Minutes"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Calculated Hours (for Stats)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min={0.1}
                  value={totalHours}
                  onChange={(e) => setTotalHours(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  placeholder="e.g. 1.0"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: ADDITIONAL TRAINING DETAILS */}
          <div className="bg-[#0b1c38]/60 p-4 rounded-xl border border-blue-900/30 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              2. Facilitator, Venue & Participant Scope
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Trainer / Facilitator
                </label>
                <input
                  type="text"
                  value={trainer}
                  onChange={(e) => setTrainer(e.target.value)}
                  placeholder="e.g. Ms. Shireen Li, Engr. Santos"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Training Venue
                </label>
                <input
                  type="text"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="e.g. DTP Training Room, Stitching Line 3"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Training Type
                </label>
                <select
                  value={trainingType}
                  onChange={(e) => setTrainingType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
                >
                  {TRAINING_TYPES.map(tt => (
                    <option key={tt} value={tt}>{tt}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Start Time
                </label>
                <input
                  type="text"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  placeholder="e.g. 09:00 AM"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  End Time
                </label>
                <input
                  type="text"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  placeholder="e.g. 10:00 AM"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Training Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
                >
                  {TRAINING_CATEGORIES.map(tc => (
                    <option key={tc} value={tc}>{tc}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Batch Code / Run
                </label>
                <input
                  type="text"
                  value={batch}
                  onChange={(e) => setBatch(e.target.value)}
                  placeholder="e.g. Batch 2026-03"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Target Participants
              </label>
              <input
                type="text"
                value={targetParticipants}
                onChange={(e) => setTargetParticipants(e.target.value)}
                placeholder="e.g. Line Supervisors, Sewing Machine Operators, Quality Control Leads"
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Training Objectives
                </label>
                <textarea
                  rows={2}
                  value={trainingObjective}
                  onChange={(e) => setTrainingObjective(e.target.value)}
                  placeholder="Outline the key learning objectives and expected performance improvements..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Remarks / Audit Observations
                </label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Any notable feedback, trainee engagement, follow-up actions..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: CUSTOM FIELDS (IF ANY CONFIGURED) */}
          {applicableCustomFields.length > 0 && (
            <div className="bg-[#0b1c38]/60 p-4 rounded-xl border border-blue-900/30 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  3. Custom Fields
                </h3>
                <span className="text-[11px] text-slate-400">
                  Configured custom metrics
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {applicableCustomFields.map(field => {
                  const val = customFieldValues[field.id];

                  if (field.type === 'Checkbox') {
                    return (
                      <div key={field.id} className="flex items-center gap-2 pt-2">
                        <input
                          type="checkbox"
                          id={`cf-${field.id}`}
                          checked={!!val}
                          onChange={(e) => setCustomFieldValues(prev => ({
                            ...prev,
                            [field.id]: e.target.checked
                          }))}
                          className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0 cursor-pointer"
                        />
                        <label htmlFor={`cf-${field.id}`} className="text-xs text-slate-300 cursor-pointer">
                          {field.name}
                        </label>
                      </div>
                    );
                  }

                  if (field.type === 'Dropdown') {
                    return (
                      <div key={field.id}>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          {field.name} {field.required && <span className="text-red-400">*</span>}
                        </label>
                        <select
                          value={val || ''}
                          required={field.required}
                          onChange={(e) => setCustomFieldValues(prev => ({
                            ...prev,
                            [field.id]: e.target.value
                          }))}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
                        >
                          <option value="">Select an option...</option>
                          {field.options?.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                    );
                  }

                  if (field.type === 'Long Text') {
                    return (
                      <div key={field.id} className="sm:col-span-2 md:col-span-3">
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          {field.name} {field.required && <span className="text-red-400">*</span>}
                        </label>
                        <textarea
                          rows={2}
                          value={val || ''}
                          required={field.required}
                          onChange={(e) => setCustomFieldValues(prev => ({
                            ...prev,
                            [field.id]: e.target.value
                          }))}
                          placeholder={field.placeholder || ''}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    );
                  }

                  return (
                    <div key={field.id}>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        {field.name} {field.required && <span className="text-red-400">*</span>}
                      </label>
                      <input
                        type={field.type === 'Number' || field.type === 'Percentage' ? 'number' : field.type === 'Date' ? 'date' : field.type === 'Time' ? 'time' : 'text'}
                        value={val !== undefined ? val : ''}
                        required={field.required}
                        placeholder={field.placeholder || ''}
                        onChange={(e) => setCustomFieldValues(prev => ({
                          ...prev,
                          [field.id]: field.type === 'Number' || field.type === 'Percentage' 
                            ? (e.target.value === '' ? '' : Number(e.target.value)) 
                            : e.target.value
                        }))}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION 4: DOCUMENTATION / PHOTO UPLOAD (VERY IMPORTANT) */}
          <div className="bg-[#0b1c38]/60 p-4 rounded-xl border border-blue-900/30 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4" />
                  4. Documentation Photos (Multi-photo upload)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Upload JPG, PNG, WEBP photos with custom captions (e.g. Opening discussion, Training proper, Group activity, Training completion).
                </p>
              </div>

              {/* Upload Photos Trigger */}
              <div>
                <input
                  type="file"
                  ref={photoInputRef}
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  onChange={(e) => handlePhotoFilesSelected(e.target.files)}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {isUploadingPhoto ? 'Uploading...' : 'Upload Photos'}
                </button>
              </div>
            </div>

            {/* Photo Gallery Grid */}
            {photos.length === 0 ? (
              <div 
                onClick={() => photoInputRef.current?.click()}
                className="p-6 rounded-xl border-2 border-dashed border-slate-800 hover:border-emerald-500/50 bg-[#071326]/50 text-center cursor-pointer transition"
              >
                <ImageIcon className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-300">Click or Drag & Drop Photos Here</p>
                <p className="text-[11px] text-slate-500 mt-1">Supports multiple JPG, PNG, WEBP</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {photos.map((p, idx) => (
                  <div 
                    key={p.id || idx}
                    className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex flex-col group relative"
                  >
                    {/* Thumbnail Image */}
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-black/40">
                      <img
                        src={p.dataUrl || p.url}
                        alt={p.caption || p.fileName}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      
                      {/* Action overlays */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => onOpenPhotoLightbox ? onOpenPhotoLightbox(photos, idx) : window.open(p.url, '_blank')}
                          className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs transition cursor-pointer"
                          title="View Fullscreen"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePhoto(p.id)}
                          className="p-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs transition cursor-pointer"
                          title="Remove Photo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-[9px] text-slate-300 font-mono">
                        Photo {idx + 1}
                      </div>
                    </div>

                    {/* Caption Input */}
                    <div className="mt-2">
                      <label className="block text-[10px] text-slate-400 font-medium mb-0.5">
                        Photo Caption:
                      </label>
                      <input
                        type="text"
                        value={p.caption || ''}
                        onChange={(e) => handleUpdatePhotoCaption(p.id, e.target.value)}
                        placeholder={`e.g. Photo ${idx + 1}: Training session`}
                        className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 5: SUPPORTING DOCUMENTS (PDF, DOCX, XLSX, PPTX) */}
          <div className="bg-[#0b1c38]/60 p-4 rounded-xl border border-blue-900/30 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <FileText className="w-4 h-4" />
                  5. Supporting Documents (Attendance, Slide Decks, Evaluations)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Upload signed attendance sheets, slide decks, certificates (PDF, DOCX, XLSX, PPTX).
                </p>
              </div>

              {/* Document upload controls */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedDocCategory}
                  onChange={(e) => setSelectedDocCategory(e.target.value)}
                  className="px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 text-xs focus:outline-none"
                >
                  {DOC_CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <input
                  type="file"
                  ref={docInputRef}
                  multiple
                  accept=".pdf,.docx,.xlsx,.pptx,.doc,.xls,.ppt"
                  onChange={(e) => handleDocFilesSelected(e.target.files)}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => docInputRef.current?.click()}
                  disabled={isUploadingDoc}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow disabled:opacity-50"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  {isUploadingDoc ? 'Uploading...' : 'Upload Document'}
                </button>
              </div>
            </div>

            {/* Document list */}
            {documents.length === 0 ? (
              <div 
                onClick={() => docInputRef.current?.click()}
                className="p-5 rounded-xl border border-dashed border-slate-800 hover:border-amber-500/50 bg-[#071326]/50 text-center cursor-pointer transition"
              >
                <Paperclip className="w-6 h-6 text-slate-500 mx-auto mb-1" />
                <p className="text-xs text-slate-400">No supporting documents attached</p>
                <p className="text-[10px] text-slate-500">Attach attendance sheets, training decks or post-training summaries</p>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc, idx) => (
                  <div
                    key={doc.id || idx}
                    className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white truncate max-w-sm">
                            {doc.fileName}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-mono">
                            {doc.fileType.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <span>{doc.category || 'General'}</span>
                          <span>•</span>
                          <span>{doc.fileSize}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <a
                        href={doc.downloadUrl || doc.url}
                        download={doc.fileName}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition cursor-pointer"
                      >
                        Download
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDeleteDoc(doc.id)}
                        className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-950/40 transition cursor-pointer"
                        title="Remove Document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Actions Footer */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <div className="text-[11px] text-slate-400">
              * Required fields must be completed before saving.
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg transition flex items-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                {recordToEdit ? 'Update Record' : 'Save Training Record'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
export default TrainingRecordModal;
