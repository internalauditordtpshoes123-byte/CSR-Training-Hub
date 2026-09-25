/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  X, 
  Printer, 
  Edit3, 
  Trash2, 
  Calendar, 
  Clock, 
  Users, 
  MapPin, 
  UserCheck, 
  Award, 
  FileText, 
  Image as ImageIcon, 
  Download, 
  ExternalLink,
  ChevronLeft,
  Building2,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { 
  DepartmentTrainingRecord, 
  DepartmentFolder, 
  DepartmentCustomField, 
  DepartmentTrainingPhoto 
} from '../../types';

interface TrainingRecordDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: DepartmentTrainingRecord | null;
  department?: DepartmentFolder | null;
  customFields: DepartmentCustomField[];
  onEdit: (record: DepartmentTrainingRecord) => void;
  onDelete: (recordId: string) => void;
  onOpenPhotoLightbox: (photos: DepartmentTrainingPhoto[], index: number) => void;
  canEdit?: boolean;
}

export const TrainingRecordDetailsModal: React.FC<TrainingRecordDetailsModalProps> = ({
  isOpen,
  onClose,
  record,
  department,
  customFields,
  onEdit,
  onDelete,
  onOpenPhotoLightbox,
  canEdit = true,
}) => {
  if (!isOpen || !record) return null;

  const handlePrint = () => {
    window.print();
  };

  // Get status color
  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'Completed':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-600/40';
      case 'In Progress':
        return 'bg-blue-950/80 text-blue-300 border-blue-600/40';
      case 'Scheduled':
        return 'bg-amber-950/80 text-amber-300 border-amber-600/40';
      case 'Cancelled':
        return 'bg-red-950/80 text-red-300 border-red-600/40';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  // Format date nicely
  const formatDateStr = (d: string) => {
    try {
      const dateObj = new Date(d);
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return d;
    }
  };

  // Filter applicable custom fields
  const applicableCustomFields = customFields.filter(f => 
    f.scope === 'all' || f.scope === record.departmentId
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div 
        id="training-record-details-modal"
        className="w-full max-w-4xl bg-[#08152b] border border-blue-900/60 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Top Control Bar */}
        <div className="px-6 py-3.5 border-b border-blue-900/40 bg-[#06101f] flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1 text-xs"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <span className="text-xs text-slate-400 font-mono hidden sm:inline">
              | {record.id}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1.5 text-xs"
              title="Print Official Record Sheet"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print Sheet</span>
            </button>

            {canEdit && (
              <>
                <button
                  onClick={() => {
                    onClose();
                    onEdit(record);
                  }}
                  className="p-2 rounded-lg bg-blue-600/80 hover:bg-blue-600 text-white transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Edit</span>
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to delete training record "${record.subject}"?`)) {
                      onDelete(record.id);
                      onClose();
                    }
                  }}
                  className="p-2 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-300 hover:text-white transition cursor-pointer flex items-center gap-1.5 text-xs"
                  title="Delete Record"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            <button 
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Official Printable Record Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 scrollbar-thin print:p-0 print:text-black">
          
          {/* Header Plaque */}
          <div className="border-b-2 border-blue-600 pb-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-blue-400 font-mono">
                    DATIAN SUBIC SHOES INC. • CSR & OPERATIONS
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  DEPARTMENT TRAINING RECORD
                </h1>
              </div>

              <div className="flex sm:flex-col items-start sm:items-end gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadge(record.status)}`}>
                  {record.status}
                </span>
                <span className="font-mono text-xs text-blue-300 bg-blue-950/60 px-2.5 py-0.5 rounded border border-blue-900/60 font-semibold">
                  {record.id}
                </span>
              </div>
            </div>

            {/* Department banner */}
            <div className="mt-4 p-3 rounded-xl bg-[#0e2142] border border-blue-800/40 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Building2 className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-slate-400">Department:</span>
                <span className="text-sm font-bold text-white">
                  {department?.name || record.departmentName}
                  {department?.code && ` (${department.code})`}
                </span>
              </div>
              <div className="text-xs text-slate-300 font-mono">
                {record.trainingType}
              </div>
            </div>
          </div>

          {/* Core Subject Title Card */}
          <div className="bg-[#0b1b36] p-5 rounded-2xl border border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Training Title / Subject
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-white mt-1 leading-snug">
              {record.subject}
            </h2>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-[#0b1b36] border border-slate-800">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                <span>Date</span>
              </div>
              <div className="text-xs sm:text-sm font-bold text-white">
                {formatDateStr(record.date)}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0b1b36] border border-slate-800">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span>No. of Trainees</span>
              </div>
              <div className="text-xs sm:text-sm font-bold text-emerald-300 font-mono">
                {record.traineesCount} Trainees
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0b1b36] border border-slate-800">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Total Time</span>
              </div>
              <div className="text-xs sm:text-sm font-bold text-amber-300 font-mono">
                {record.totalTime}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0b1b36] border border-slate-800">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1">
                <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>Trainer / Lead</span>
              </div>
              <div className="text-xs sm:text-sm font-bold text-white truncate" title={record.trainer}>
                {record.trainer || 'Not specified'}
              </div>
            </div>
          </div>

          {/* Secondary Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[#071326] border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block mb-0.5">Venue:</span>
              <div className="flex items-center gap-1.5 text-slate-200 font-medium">
                <MapPin className="w-3.5 h-3.5 text-red-400" />
                <span>{record.venue || 'N/A'}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#071326] border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block mb-0.5">Time Schedule:</span>
              <div className="text-slate-200 font-mono">
                {record.startTime || '—'} – {record.endTime || '—'}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#071326] border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block mb-0.5">Category:</span>
              <div className="text-slate-200 font-medium">
                {record.category || 'General'}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#071326] border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block mb-0.5">Batch:</span>
              <div className="text-slate-200 font-mono">
                {record.batch || '—'}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#071326] border border-slate-800/80 sm:col-span-2">
              <span className="text-[10px] text-slate-400 block mb-0.5">Target Participants:</span>
              <div className="text-slate-200 font-medium truncate" title={record.targetParticipants}>
                {record.targetParticipants || 'All designated operators'}
              </div>
            </div>
          </div>

          {/* Objectives & Remarks */}
          {(record.trainingObjective || record.remarks) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {record.trainingObjective && (
                <div className="p-4 rounded-xl bg-[#0b1b36] border border-slate-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Training Objective
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {record.trainingObjective}
                  </p>
                </div>
              )}

              {record.remarks && (
                <div className="p-4 rounded-xl bg-[#0b1b36] border border-slate-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Remarks & Observations
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {record.remarks}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Custom Fields Section */}
          {applicableCustomFields.length > 0 && record.customFields && Object.keys(record.customFields).length > 0 && (
            <div className="p-4 rounded-xl bg-[#0b1c38]/70 border border-blue-900/40 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-blue-300">
                  Custom Evaluation & Compliance Fields
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {applicableCustomFields.map(f => {
                  const val = record.customFields?.[f.id];
                  if (val === undefined || val === null || val === '') return null;

                  return (
                    <div key={f.id} className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block mb-0.5">{f.name}:</span>
                      <div className="text-xs font-semibold text-white">
                        {f.type === 'Checkbox' ? (
                          val ? (
                            <span className="text-emerald-400 flex items-center gap-1 font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Verified / Completed
                            </span>
                          ) : (
                            <span className="text-slate-400">Not Completed</span>
                          )
                        ) : f.type === 'Percentage' ? (
                          <span className="font-mono text-cyan-300">{val}%</span>
                        ) : (
                          <span>{String(val)}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION: DOCUMENTATION / PHOTO GALLERY */}
          <div className="p-5 rounded-2xl bg-[#0b1b36] border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Documentation Photos ({record.photos?.length || 0})
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">
                Click photo to enlarge
              </span>
            </div>

            {(!record.photos || record.photos.length === 0) ? (
              <div className="p-6 rounded-xl border border-dashed border-slate-800 text-center">
                <ImageIcon className="w-7 h-7 text-slate-600 mx-auto mb-1.5" />
                <p className="text-xs text-slate-400">No documentation photos attached to this record.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {record.photos.map((p, idx) => (
                  <div
                    key={p.id || idx}
                    onClick={() => onOpenPhotoLightbox(record.photos, idx)}
                    className="group relative rounded-xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-emerald-500/60 transition cursor-pointer shadow-md"
                  >
                    <div className="aspect-video relative overflow-hidden bg-black/40">
                      <img
                        src={p.dataUrl || p.url}
                        alt={p.caption || p.fileName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <span className="px-3 py-1 rounded-full bg-emerald-600/90 text-white text-[11px] font-bold shadow">
                          View Photo
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-[#09162c]">
                      <p className="text-xs font-medium text-slate-200 truncate">
                        {p.caption || `Photo ${idx + 1}`}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                        {p.fileName}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION: SUPPORTING DOCUMENTS */}
          <div className="p-5 rounded-2xl bg-[#0b1b36] border border-slate-800 space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Supporting Documents ({record.documents?.length || 0})
              </h3>
            </div>

            {(!record.documents || record.documents.length === 0) ? (
              <div className="p-5 rounded-xl border border-dashed border-slate-800 text-center">
                <FileText className="w-6 h-6 text-slate-600 mx-auto mb-1" />
                <p className="text-xs text-slate-400">No supporting documents attached.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {record.documents.map((doc, idx) => (
                  <div
                    key={doc.id || idx}
                    className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate" title={doc.fileName}>
                          {doc.fileName}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {doc.category || 'File'} • {doc.fileSize}
                        </div>
                      </div>
                    </div>

                    <a
                      href={doc.downloadUrl || doc.url}
                      download={doc.fileName}
                      className="px-3 py-1.5 rounded-lg bg-blue-600/80 hover:bg-blue-600 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer transition shadow"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download</span>
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Audit Metadata Footer */}
          <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400 font-mono">
            <div>
              Recorded by: <span className="text-slate-200">{record.createdBy || 'System Administrator'}</span>
            </div>
            <div>
              Last Updated: {new Date(record.lastUpdated || record.dateCreated).toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default TrainingRecordDetailsModal;
