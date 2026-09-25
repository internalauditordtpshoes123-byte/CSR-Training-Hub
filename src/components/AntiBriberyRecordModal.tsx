import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  Calendar, 
  Building2, 
  Users, 
  UserCheck, 
  FileText, 
  Upload, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Lock,
  FileSpreadsheet,
  Paperclip
} from 'lucide-react';
import { AntiBriberyTrainingRecord } from '../data/antiBriberyMasterDoc';

interface AntiBriberyRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  year: number; // 2025 | 2026
  onSave: (record: AntiBriberyTrainingRecord) => void;
  initialRecord?: AntiBriberyTrainingRecord | null;
  existingRecordsCount: number;
}

const DEPARTMENTS_LIST = [
  { name: 'Administration Department', category: 'Indirect' as const },
  { name: 'Administration(Expat-CN) , (Expat-TW)', category: 'Indirect' as const },
  { name: 'Assembly Office', category: 'Indirect' as const },
  { name: 'Cutting A Office', category: 'Indirect' as const },
  { name: 'Cutting C Office', category: 'Indirect' as const },
  { name: 'Development Dept.', category: 'Indirect' as const },
  { name: 'Finance Department', category: 'Indirect' as const },
  { name: 'General Affairs Team', category: 'Indirect' as const },
  { name: 'HR Department', category: 'Indirect' as const },
  { name: 'Stitching A Office', category: 'Indirect' as const },
  { name: 'Stitching C Office', category: 'Indirect' as const },
  { name: 'Assembly A', category: 'Direct' as const },
  { name: 'Assembly B', category: 'Direct' as const },
  { name: 'Cutting A', category: 'Direct' as const },
  { name: 'Cutting C', category: 'Direct' as const },
  { name: 'Cutting Material Preparation', category: 'Direct' as const },
  { name: 'Cutting Production Preparation', category: 'Direct' as const },
  { name: 'Outsole Pressing', category: 'Direct' as const },
  { name: 'Outsole Processing', category: 'Direct' as const },
  { name: 'Quality Control Department', category: 'Direct' as const },
  { name: 'Rubber Extruding', category: 'Direct' as const },
  { name: 'Rubber Material Preparation', category: 'Direct' as const },
  { name: 'Rubber Milling', category: 'Direct' as const },
  { name: 'Stitching A', category: 'Direct' as const },
  { name: 'Stitching B', category: 'Direct' as const },
  { name: 'Stitching C', category: 'Direct' as const },
  { name: 'Warehouse', category: 'Direct' as const },
];

const SUGGESTED_TOPICS = [
  'Corporate Anti-Bribery & FCPA Code of Conduct Refresher',
  'Frontline Anti-Corruption & Ethical Procurement SOP',
  'Vendor Gift Refusal, Entertainment & Whistleblower Protection',
  'ISO 37001 Anti-Bribery Management Systems (ABMS) Verification',
  'Supply Chain Due Diligence & Conflict of Interest Prevention',
  'Subic Bay Freeport Zone Ethical Labor Standards & Compliance'
];

export default function AntiBriberyRecordModal({
  isOpen,
  onClose,
  year,
  onSave,
  initialRecord,
  existingRecordsCount
}: AntiBriberyRecordModalProps) {
  // Generate auto-formatted record ID: AB-YEAR-XXXX
  const nextSeq = String(existingRecordsCount + 1).padStart(4, '0');
  const generatedId = initialRecord?.id || `AB-${year}-${nextSeq}`;

  const [recordId, setRecordId] = useState<string>(generatedId);
  const [date, setDate] = useState<string>(initialRecord?.date || new Date().toISOString().split('T')[0]);
  const [topic, setTopic] = useState<string>(initialRecord?.topic || '');
  const [department, setDepartment] = useState<string>(initialRecord?.department || 'Administration Department');
  const [category, setCategory] = useState<'Indirect' | 'Direct'>(initialRecord?.category || 'Indirect');
  const [trainer, setTrainer] = useState<string>(initialRecord?.trainer || 'CSR Compliance Officer');
  const [venue, setVenue] = useState<string>(initialRecord?.venue || 'Subic Bay Training Pavilion');
  const [targetEmployees, setTargetEmployees] = useState<number>(initialRecord?.targetEmployees || 25);
  const [attendeesCount, setAttendeesCount] = useState<number>(initialRecord?.attendeesCount || 25);
  const [status, setStatus] = useState<'Completed' | 'In Progress' | 'Scheduled' | 'Pending Verification'>(
    initialRecord?.status || 'Completed'
  );
  const [notes, setNotes] = useState<string>(initialRecord?.notes || '');
  const [traineeInput, setTraineeInput] = useState<string>('');
  const [trainees, setTrainees] = useState<Array<{ employeeNo: string; name: string; department: string; status: 'done' | 'pending' | 'absent' }>>(
    initialRecord?.trainees || []
  );
  const [files, setFiles] = useState<Array<{ id: string; name: string; size: string; type: string; url: string; uploadedAt: string }>>(
    initialRecord?.files || []
  );

  useEffect(() => {
    if (initialRecord) {
      setRecordId(initialRecord.id);
      setDate(initialRecord.date);
      setTopic(initialRecord.topic);
      setDepartment(initialRecord.department);
      setCategory(initialRecord.category);
      setTrainer(initialRecord.trainer);
      setVenue(initialRecord.venue);
      setTargetEmployees(initialRecord.targetEmployees);
      setAttendeesCount(initialRecord.attendeesCount);
      setStatus(initialRecord.status);
      setNotes(initialRecord.notes || '');
      setTrainees(initialRecord.trainees || []);
      setFiles(initialRecord.files || []);
    } else {
      const newSeq = String(existingRecordsCount + 1).padStart(4, '0');
      setRecordId(`AB-${year}-${newSeq}`);
      setDate(new Date().toISOString().split('T')[0]);
      setTopic('');
      setDepartment('Administration Department');
      setCategory('Indirect');
      setTrainer('CSR Compliance Officer');
      setVenue('Subic Bay Training Pavilion');
      setTargetEmployees(25);
      setAttendeesCount(25);
      setStatus('Completed');
      setNotes('');
      setTrainees([]);
      setFiles([]);
    }
  }, [initialRecord, year, existingRecordsCount, isOpen]);

  // Auto-set category when department changes
  const handleDepartmentChange = (deptName: string) => {
    setDepartment(deptName);
    const found = DEPARTMENTS_LIST.find(d => d.name === deptName);
    if (found) {
      setCategory(found.category);
    }
  };

  // Add individual trainee
  const handleAddTrainee = () => {
    if (!traineeInput.trim()) return;
    const parts = traineeInput.split(/[,-]/).map(s => s.trim());
    const name = parts[0] || `Employee ${trainees.length + 1}`;
    const empNo = parts[1] || `EMP-${1000 + trainees.length + 1}`;
    setTrainees(prev => [
      ...prev,
      {
        employeeNo: empNo,
        name,
        department,
        status: 'done'
      }
    ]);
    setTraineeInput('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const newFileItem = {
          id: `file-${Date.now()}-${i}`,
          name: file.name,
          size: `${(file.size / 1024).toFixed(1)} KB`,
          type: file.type || 'application/octet-stream',
          url: dataUrl,
          uploadedAt: new Date().toISOString().split('T')[0]
        };
        setFiles(prev => [...prev, newFileItem]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      alert('Please enter a training topic.');
      return;
    }

    const record: AntiBriberyTrainingRecord = {
      id: recordId,
      year, // Guaranteed year association stored in database/model
      date,
      topic: topic.trim(),
      department,
      category,
      trainer: trainer.trim(),
      venue: venue.trim(),
      targetEmployees: Number(targetEmployees) || 0,
      attendeesCount: Number(attendeesCount) || 0,
      status,
      notes: notes.trim(),
      trainees,
      files,
      createdAt: initialRecord?.createdAt || new Date().toISOString(),
      createdBy: initialRecord?.createdBy || 'Compliance Officer'
    };

    onSave(record);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">
                  {initialRecord ? 'Edit Anti-Bribery Training Record' : 'Add Anti-Bribery Training Record'}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-400" />
                  <span>Year: {year}</span>
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {year === 2026 
                  ? 'Record will be persistently saved under 2026 Anti-Bribery Training.'
                  : 'Record will be persistently saved under 2025 Anti-Bribery Training.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto custom-scrollbar">
          
          {/* Top Key Identifiers Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1 flex items-center gap-1">
                <Lock className="w-3 h-3 text-amber-400" />
                <span>Record ID (Auto-Generated)</span>
              </label>
              <input
                type="text"
                readOnly
                value={recordId}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-amber-400 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1 flex items-center gap-1">
                <Lock className="w-3 h-3 text-emerald-400" />
                <span>Operating Year (Inherited)</span>
              </label>
              <div className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-emerald-400">
                {year} Folder Association
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">
                Training Date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          {/* Topic with Quick Select suggestions */}
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">
              Training Topic / Module Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Corporate Anti-Bribery & Code of Conduct Refresher"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500 transition"
            />
            <div className="flex items-center gap-1.5 flex-wrap mt-2">
              <span className="text-[10px] text-slate-500 font-mono">Suggested:</span>
              {SUGGESTED_TOPICS.slice(0, 3).map((sugg, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setTopic(sugg)}
                  className="px-2 py-0.5 text-[10px] bg-slate-800/80 hover:bg-slate-800 text-slate-300 rounded border border-slate-700/60 transition cursor-pointer"
                >
                  {sugg}
                </button>
              ))}
            </div>
          </div>

          {/* Department & Operational Unit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">
                Department / Operational Unit *
              </label>
              <select
                value={department}
                onChange={(e) => handleDepartmentChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                {DEPARTMENTS_LIST.map((dept, i) => (
                  <option key={i} value={dept.name}>
                    {dept.name} ({dept.category})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">
                Operational Classification
              </label>
              <div className="flex items-center gap-3 pt-1">
                <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="category"
                    checked={category === 'Indirect'}
                    onChange={() => setCategory('Indirect')}
                    className="accent-amber-500"
                  />
                  <span>Indirect (Office/Support)</span>
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="category"
                    checked={category === 'Direct'}
                    onChange={() => setCategory('Direct')}
                    className="accent-amber-500"
                  />
                  <span>Direct (Manufacturing/Plant)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Trainer & Venue */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">
                Trainer / Facilitator
              </label>
              <input
                type="text"
                placeholder="e.g. Atty. Maria Santos / CSR Specialist"
                value={trainer}
                onChange={(e) => setTrainer(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">
                Training Venue / Location
              </label>
              <input
                type="text"
                placeholder="e.g. Executive Boardroom / Line Hall"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Attendance Numbers & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">
                Target Headcount
              </label>
              <input
                type="number"
                min="1"
                value={targetEmployees}
                onChange={(e) => setTargetEmployees(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">
                Verified Attendees
              </label>
              <input
                type="number"
                min="0"
                value={attendeesCount}
                onChange={(e) => setAttendeesCount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-emerald-400 font-bold focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">
                Compliance Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-semibold cursor-pointer"
              >
                <option value="Completed">Completed & Verified</option>
                <option value="In Progress">In Progress</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Pending Verification">Pending Verification</option>
              </select>
            </div>
          </div>

          {/* Compliance Remarks */}
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">
              Audit Notes & Verification Remarks
            </label>
            <textarea
              rows={2}
              placeholder="Add audit reference, verification stamp, or specific training notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Document & Evidence Upload */}
          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <Paperclip className="w-4 h-4 text-amber-400" />
                <span>Attach Files / Attendance Sign-off Sheets (Optional)</span>
              </div>
              <label className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg cursor-pointer transition flex items-center gap-1">
                <Upload className="w-3.5 h-3.5 text-amber-400" />
                <span>Upload File</span>
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {files.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs"
                  >
                    <div className="flex items-center gap-2 truncate max-w-[200px]">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span className="truncate text-slate-300 font-mono text-[11px]">{file.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">({file.size})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(file.id)}
                      className="text-slate-500 hover:text-red-400 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Trainee Roster Entry */}
          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-400" />
                <span>Trainee Attendance Registry ({trainees.length})</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Optional employee logging</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Format: Employee Name, EMP-ID"
                value={traineeInput}
                onChange={(e) => setTraineeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTrainee();
                  }
                }}
                className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={handleAddTrainee}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition cursor-pointer"
              >
                + Add
              </button>
            </div>

            {trainees.length > 0 && (
              <div className="max-h-24 overflow-y-auto space-y-1 pr-1 custom-scrollbar pt-1">
                {trainees.map((t, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-2.5 py-1 bg-slate-900/80 rounded text-[11px] font-mono border border-slate-800"
                  >
                    <span className="text-slate-300">{t.name} ({t.employeeNo})</span>
                    <button
                      type="button"
                      onClick={() => setTrainees(prev => prev.filter((_, i) => i !== idx))}
                      className="text-slate-500 hover:text-red-400 text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold rounded-xl transition shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save Record to {year}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
