import React from 'react';
import { 
  X, 
  ShieldCheck, 
  Calendar, 
  Building2, 
  Users, 
  UserCheck, 
  CheckCircle2, 
  Lock, 
  FileSpreadsheet, 
  Paperclip,
  Download,
  MapPin,
  Award,
  Clock
} from 'lucide-react';
import { AntiBriberyTrainingRecord } from '../data/antiBriberyMasterDoc';

interface AntiBriberyRecordDetailModalProps {
  record: AntiBriberyTrainingRecord | null;
  onClose: () => void;
  onEdit?: (record: AntiBriberyTrainingRecord) => void;
  onDelete?: (recordId: string, year: number) => void;
}

export default function AntiBriberyRecordDetailModal({
  record,
  onClose,
  onEdit,
  onDelete
}: AntiBriberyRecordDetailModalProps) {
  if (!record) return null;

  const pct = record.targetEmployees > 0 
    ? Math.round((record.attendeesCount / record.targetEmployees) * 1000) / 10 
    : 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-8 text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  {record.id}
                </span>
                <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Year {record.year}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
                  {record.category} Operations
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-slate-100 mt-1">
                {record.topic}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto custom-scrollbar">
          
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
              <div className="text-[10px] uppercase font-mono text-slate-400">Date Conducted</div>
              <div className="text-xs font-bold text-slate-200 mt-1 font-mono flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>{record.date}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
              <div className="text-[10px] uppercase font-mono text-slate-400">Attendees / Target</div>
              <div className="text-xs font-bold text-emerald-400 mt-1 font-mono">
                {record.attendeesCount} / {record.targetEmployees}
              </div>
            </div>

            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
              <div className="text-[10px] uppercase font-mono text-slate-400">Pass Percentage</div>
              <div className="text-xs font-bold text-blue-400 mt-1 font-mono">
                {pct}% Verified
              </div>
            </div>

            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
              <div className="text-[10px] uppercase font-mono text-slate-400">Audit Status</div>
              <div className="text-xs font-bold text-emerald-400 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{record.status}</span>
              </div>
            </div>
          </div>

          {/* Details Block */}
          <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl space-y-2.5 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-slate-400 font-mono">Department:</span>
              <span className="font-semibold text-slate-200">{record.department}</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-slate-400 font-mono">Facilitator / Trainer:</span>
              <span className="font-semibold text-slate-200">{record.trainer || 'CSR Compliance Team'}</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-slate-400 font-mono">Venue / Location:</span>
              <span className="font-semibold text-slate-200">{record.venue || 'Subic Bay Freeport Zone'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-mono">Created By / Timestamp:</span>
              <span className="text-slate-400 font-mono text-[11px]">
                {record.createdBy} • {new Date(record.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Audit Notes */}
          {record.notes && (
            <div className="p-4 bg-slate-800/40 border border-slate-700/50 rounded-xl space-y-1">
              <div className="text-[11px] font-bold text-amber-400 font-mono uppercase tracking-wider">
                Verification & Compliance Notes
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {record.notes}
              </p>
            </div>
          )}

          {/* Attached Evidence Files */}
          {record.files && record.files.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Paperclip className="w-4 h-4 text-amber-400" />
                <span>Attached Training Evidence & Sign-Off Sheets ({record.files.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {record.files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs"
                  >
                    <div className="flex items-center gap-2 truncate max-w-[200px]">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span className="truncate text-slate-200 font-mono text-[11px]">{file.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">({file.size})</span>
                    </div>
                    {file.url && (
                      <a
                        href={file.url}
                        download={file.name}
                        className="p-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg transition"
                        title="Download file"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trainees Roster */}
          {record.trainees && record.trainees.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span>Logged Trainee Roster ({record.trainees.length})</span>
                </span>
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                {record.trainees.map((t, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-3 py-1.5 bg-slate-950 border border-slate-800/80 rounded-lg text-xs font-mono"
                  >
                    <span className="text-slate-300">{t.name}</span>
                    <span className="text-slate-500 text-[11px]">{t.employeeNo}</span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                      verified
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            {onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Are you sure you want to delete training record ${record.id}?`)) {
                    onDelete(record.id, record.year);
                    onClose();
                  }
                }}
                className="px-3.5 py-1.5 bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Delete Record
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              {onEdit && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEdit(record);
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  Edit Record
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
