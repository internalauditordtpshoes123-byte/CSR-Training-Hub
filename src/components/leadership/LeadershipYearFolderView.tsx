import React, { useState, useMemo, useRef } from 'react';
import {
  Folder,
  Calendar,
  Clock,
  MapPin,
  User,
  Users,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Sparkles,
  Plus,
  Search,
  Filter,
  FileText,
  Image as ImageIcon,
  Upload,
  Download,
  Printer,
  ChevronRight,
  Eye,
  Trash2,
  Edit3,
  Award,
  BookOpen,
  ArrowRight,
  Layers,
  X,
  ShieldCheck,
  Building2
} from 'lucide-react';
import {
  LeadershipScheduleItem,
  LeadershipDocumentationItem,
  calculateYearSummaryMetrics,
  extractYearFromDate
} from '../../data/leadershipScheduleData';
import {
  LeadershipTraineeRow,
  LEADERSHIP_COURSES_DEF
} from '../../data/leadershipSheetData';
import { LeadershipAttendanceMatrix } from './LeadershipAttendanceMatrix';

interface LeadershipYearFolderViewProps {
  year: 2025 | 2026;
  schedules: LeadershipScheduleItem[];
  trainees: LeadershipTraineeRow[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onAddSchedule: (newSched: LeadershipScheduleItem) => void;
  onUpdateSchedule: (updated: LeadershipScheduleItem) => void;
  onDeleteSchedule: (id: string) => void;
  onUpdateTrainee: (updated: LeadershipTraineeRow) => void;
  onAddTrainee: (newRow: LeadershipTraineeRow) => void;
  onDeleteTrainee: (id: string) => void;
  onOpenAnalytics: () => void;
  onOpenImporter?: () => void;
  addToast: (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const LeadershipYearFolderView: React.FC<LeadershipYearFolderViewProps> = ({
  year,
  schedules,
  trainees,
  searchQuery,
  onSearchChange,
  onAddSchedule,
  onUpdateSchedule,
  onDeleteSchedule,
  onUpdateTrainee,
  onAddTrainee,
  onDeleteTrainee,
  onOpenAnalytics,
  onOpenImporter,
  addToast
}) => {
  const [folderSubTab, setFolderSubTab] = useState<'records' | 'attendance'>('records');
  const [selectedRecordForDetail, setSelectedRecordForDetail] = useState<LeadershipScheduleItem | null>(null);
  const [isAddRecordModalOpen, setIsAddRecordModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<LeadershipScheduleItem | null>(null);

  // Form State for Add / Edit Training Record
  const [formDate, setFormDate] = useState('');
  const [formIsoDate, setFormIsoDate] = useState('');
  const [formTopic, setFormTopic] = useState('');
  const [formTrainer, setFormTrainer] = useState('Mr. Erwin (HR)');
  const [formTrainerRole, setFormTrainerRole] = useState('Human Resources Division Lead');
  const [formVenue, setFormVenue] = useState('TRAINING ROOM DTP');
  const [formTime, setFormTime] = useState('2:00-3:00pm');
  const [formCapacity, setFormCapacity] = useState(24);
  const [formDepartment, setFormDepartment] = useState('Factory-Wide Supervisory Staff & Section Leaders');
  const [formBatch, setFormBatch] = useState(`Cohort ${year}`);
  const [formStatus, setFormStatus] = useState<LeadershipScheduleItem['status']>('Completed');
  const [formRemarks, setFormRemarks] = useState('');
  const [formContentStr, setFormContentStr] = useState('');
  const [formDocumentation, setFormDocumentation] = useState<LeadershipDocumentationItem[]>([]);

  // 1. Filter Schedules for this SPECIFIC year
  const yearSchedules = useMemo(() => {
    return schedules.filter((s) => s.year === year);
  }, [schedules, year]);

  // 2. Filter Trainees for this SPECIFIC year
  const yearTrainees = useMemo(() => {
    return trainees.filter((t) => t.year === year);
  }, [trainees, year]);

  // 3. Compute Operational Summary Metrics for THIS year only
  const summaryMetrics = useMemo(() => {
    return calculateYearSummaryMetrics(schedules, year);
  }, [year, schedules]);

  // 4. Search Filter within this year's records
  const filteredRecords = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return yearSchedules;

    return yearSchedules.filter((s) => {
      const matchTopic = (s.trainingTopic || '').toLowerCase().includes(q);
      const matchTrainer = (s.trainer || '').toLowerCase().includes(q);
      const matchVenue = (s.venue || '').toLowerCase().includes(q);
      const matchDate = (s.trainingDate || '').toLowerCase().includes(q);
      const matchStatus = (s.status || '').toLowerCase().includes(q);
      const matchDept = (s.departmentSection || '').toLowerCase().includes(q);

      const matchTrainee = (s.traineeLeaders || []).some(
        (tl) =>
          tl.name.toLowerCase().includes(q) ||
          tl.employeeNo.toLowerCase().includes(q) ||
          tl.department.toLowerCase().includes(q)
      );

      return (
        matchTopic ||
        matchTrainer ||
        matchVenue ||
        matchDate ||
        matchStatus ||
        matchDept ||
        matchTrainee
      );
    });
  }, [yearSchedules, searchQuery]);

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingRecord(null);
    const defaultDateStr = year === 2026 ? 'September 16, 2026' : 'July 15, 2025';
    const defaultIso = year === 2026 ? '2026-09-16' : '2025-07-15';
    setFormDate(defaultDateStr);
    setFormIsoDate(defaultIso);
    setFormTopic('');
    setFormTrainer('Mr. Erwin (HR)');
    setFormTrainerRole('Human Resources Division Lead');
    setFormVenue('TRAINING ROOM DTP');
    setFormTime('2:00-3:00pm');
    setFormCapacity(24);
    setFormDepartment('Factory-Wide Supervisory Staff & Section Leaders');
    setFormBatch(`Cohort ${year}`);
    setFormStatus(year === 2025 ? 'Completed' : 'Upcoming');
    setFormRemarks('');
    setFormContentStr('1. Training Overview\n2. Key Operational Principles\n3. Practical Floor Application');
    setFormDocumentation([
      {
        id: `doc-${Date.now()}-1`,
        name: 'Photo 1 - Floor Workshop Group.jpg',
        type: 'photo',
        size: '2.1 MB',
        uploadedAt: defaultDateStr,
        uploadedBy: 'Training Lead'
      },
      {
        id: `doc-${Date.now()}-2`,
        name: 'Attendance Sheet - Signed Supervisory Roster.pdf',
        type: 'attendance_sheet',
        size: '950 KB',
        uploadedAt: defaultDateStr,
        uploadedBy: 'Training Division'
      }
    ]);
    setIsAddRecordModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (rec: LeadershipScheduleItem) => {
    setEditingRecord(rec);
    setFormDate(rec.trainingDate);
    setFormIsoDate(rec.isoDate);
    setFormTopic(rec.trainingTopic);
    setFormTrainer(rec.trainer);
    setFormTrainerRole(rec.trainerRole || '');
    setFormVenue(rec.venue);
    setFormTime(rec.time);
    setFormCapacity(rec.traineeLeadersCount || (rec.traineeLeaders ? rec.traineeLeaders.length : 20));
    setFormDepartment(rec.departmentSection);
    setFormBatch(rec.batch);
    setFormStatus(rec.status);
    setFormRemarks(rec.purposeAndRemarks);
    setFormContentStr(rec.content ? rec.content.join('\n') : '');
    setFormDocumentation(rec.documentation || []);
    setIsAddRecordModalOpen(true);
  };

  // Determine year from input date
  const detectedYearInfo = useMemo(() => {
    return extractYearFromDate(formIsoDate || formDate);
  }, [formIsoDate, formDate]);

  // Handle Save Record (Add or Edit)
  const handleSaveRecord = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formDate.trim()) {
      addToast('Validation Error', 'Training date is required.', 'error');
      return;
    }
    if (!formTopic.trim()) {
      addToast('Validation Error', 'Training subject / title is required.', 'error');
      return;
    }
    if (!formTrainer.trim()) {
      addToast('Validation Error', 'Trainer name is required.', 'error');
      return;
    }

    const assignedYear: 2025 | 2026 = detectedYearInfo.year;

    const parsedContent = formContentStr
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    if (editingRecord) {
      const updated: LeadershipScheduleItem = {
        ...editingRecord,
        trainingDate: formDate,
        isoDate: formIsoDate || editingRecord.isoDate,
        year: assignedYear,
        trainingTopic: formTopic,
        trainer: formTrainer,
        trainerRole: formTrainerRole,
        venue: formVenue,
        time: formTime,
        traineeLeadersCount: Number(formCapacity) || 20,
        departmentSection: formDepartment,
        batch: formBatch,
        status: formStatus,
        purposeAndRemarks: formRemarks,
        content: parsedContent.length > 0 ? parsedContent : editingRecord.content,
        documentation: formDocumentation
      };

      onUpdateSchedule(updated);
      setIsAddRecordModalOpen(false);
      setEditingRecord(null);

      if (assignedYear !== year) {
        addToast(
          'Moved to Another Folder',
          `Because the date was set to ${formDate}, this record was automatically stored in the 📁 ${assignedYear} folder.`,
          'info'
        );
      } else {
        addToast('Training Record Updated', `Successfully saved changes for "${formTopic}".`, 'success');
      }
    } else {
      const newId = `sched-${Date.now()}`;
      const newRecord: LeadershipScheduleItem = {
        id: newId,
        trainingDate: formDate,
        isoDate: formIsoDate || (assignedYear === 2026 ? '2026-09-16' : '2025-07-15'),
        dayOfWeek: 'Wednesday',
        time: formTime,
        year: assignedYear,
        trainingTopic: formTopic,
        trainer: formTrainer,
        trainerRole: formTrainerRole,
        departmentSection: formDepartment,
        batch: formBatch,
        venue: formVenue,
        status: formStatus,
        purposeAndRemarks: formRemarks,
        content: parsedContent.length > 0 ? parsedContent : ['1. Training Overview', '2. Floor Implementation'],
        traineeLeadersCount: Number(formCapacity) || 20,
        traineeLeaders: [],
        documentation: formDocumentation
      };

      onAddSchedule(newRecord);
      setIsAddRecordModalOpen(false);

      if (assignedYear !== year) {
        addToast(
          'Saved to Target Folder',
          `Because the date was set to ${formDate}, this record was saved directly into the 📁 ${assignedYear} folder.`,
          'info'
        );
      } else {
        addToast(
          'Training Record Added',
          `Added new training record to 📁 ${year} Leadership Folder.`,
          'success'
        );
      }
    }
  };

  // Attach file to active detail record
  const handleAttachFileToRecord = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedRecordForDetail) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newDocs: LeadershipDocumentationItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isPhoto = file.type.startsWith('image/') || /\.(jpe?g|png|webp)$/i.test(file.name);
      newDocs.push({
        id: `doc-${Date.now()}-${i}`,
        name: file.name,
        type: isPhoto ? 'photo' : 'attendance_sheet',
        size: `${(file.size / 1024).toFixed(1)} KB`,
        uploadedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        uploadedBy: 'HR Training Lead'
      });
    }

    const updatedDocs = [...(selectedRecordForDetail.documentation || []), ...newDocs];
    const updatedRecord: LeadershipScheduleItem = {
      ...selectedRecordForDetail,
      documentation: updatedDocs
    };
    onUpdateSchedule(updatedRecord);
    setSelectedRecordForDetail(updatedRecord);
    addToast('Documentation Updated', `Attached ${newDocs.length} file(s) to ${selectedRecordForDetail.trainingTopic}.`, 'success');

    e.target.value = '';
  };

  // Toggle Trainee Attendance inside record
  const handleToggleLeaderAttendance = (recordId: string, leaderId: string) => {
    const record = schedules.find((s) => s.id === recordId);
    if (!record) return;

    const updatedLeaders = (record.traineeLeaders || []).map((l) => {
      if (l.id === leaderId) {
        return { ...l, attended: !l.attended };
      }
      return l;
    });

    const updated: LeadershipScheduleItem = {
      ...record,
      traineeLeaders: updatedLeaders
    };

    onUpdateSchedule(updated);
    if (selectedRecordForDetail && selectedRecordForDetail.id === recordId) {
      setSelectedRecordForDetail(updated);
    }
  };

  return (
    <div className="space-y-3 font-sans text-xs text-slate-100">
      {/* 1. TOP FOLDER HEADER (BLACK, YELLOW, BLUE CORPORATE THEME) */}
      <div className="bg-[#0f0f10] rounded-xl p-3.5 sm:p-4 border border-[#222222] shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 text-[10px] font-mono font-bold uppercase mb-1">
            <Folder className="w-3 h-3 text-yellow-400" />
            Active Folder: 📁 {year}
          </div>
          <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
            <span>Leadership Training</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-yellow-400">📁 {year} Cohort</span>
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5 max-w-3xl">
            {year === 2025
              ? 'Official 2025 historical leadership records, supervisory attendance matrix, and compliance documentation.'
              : '2026 leadership training cohort, verified attendance matrix, ongoing operational modules, and photo documentation.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenImporter && (
            <button
              onClick={onOpenImporter}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload File / Import Data
            </button>
          )}

          <button
            onClick={onOpenAnalytics}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1a1c] hover:bg-[#252528] border border-[#2f2f33] text-slate-200 rounded-lg text-xs font-bold transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            {year} Analytics
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-black font-black rounded-lg text-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add New {year} Training Record
          </button>
        </div>
      </div>

      {/* 2. YEAR SUMMARY METRICS (BLACK WITH YELLOW & BLUE HIGHLIGHTS) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div className="bg-[#111111] p-3 rounded-xl border border-[#262626]">
          <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Total Training Records</div>
          <div className="text-xl font-bold text-white mt-0.5">{summaryMetrics.totalRecords}</div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">Sessions logged</div>
        </div>

        <div className="bg-[#111111] p-3 rounded-xl border border-[#262626]">
          <div className="text-[10px] text-yellow-400 uppercase font-mono tracking-wider">Total Participants</div>
          <div className="text-xl font-bold text-yellow-400 mt-0.5">{summaryMetrics.totalParticipants}</div>
          <div className="text-[10px] text-yellow-500/70 font-mono mt-0.5">Trainee attendances</div>
        </div>

        <div className="bg-[#111111] p-3 rounded-xl border border-[#262626]">
          <div className="text-[10px] text-blue-400 uppercase font-mono tracking-wider">Total Training Hours</div>
          <div className="text-xl font-bold text-blue-400 mt-0.5">{summaryMetrics.totalHours} hrs</div>
          <div className="text-[10px] text-blue-400/60 font-mono mt-0.5">Contact duration</div>
        </div>

        <div className="bg-[#111111] p-3 rounded-xl border border-[#262626]">
          <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Completed Sessions</div>
          <div className="text-xl font-bold text-slate-200 mt-0.5">{summaryMetrics.completedTrainings}</div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">Verified complete</div>
        </div>

        <div className="bg-[#111111] p-3 rounded-xl border border-[#262626]">
          <div className="text-[10px] text-yellow-400 uppercase font-mono tracking-wider">Scheduled / Ongoing</div>
          <div className="text-xl font-bold text-yellow-400 mt-0.5">{summaryMetrics.scheduledTrainings}</div>
          <div className="text-[10px] text-yellow-500/70 font-mono mt-0.5">In progress / planned</div>
        </div>

        <div className="bg-[#111111] p-3 rounded-xl border border-[#262626]">
          <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Cancelled</div>
          <div className="text-xl font-bold text-slate-400 mt-0.5">{summaryMetrics.cancelledTrainings}</div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">Zero disruptions</div>
        </div>
      </div>

      {/* 3. SUB-TAB NAVIGATION INSIDE YEAR FOLDER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#262626] pb-2">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setFolderSubTab('records')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer ${
              folderSubTab === 'records'
                ? 'bg-yellow-400 text-black shadow-xs font-black'
                : 'bg-[#141416] text-slate-300 hover:text-white border border-[#262626]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Training Records & Docs ({yearSchedules.length})
          </button>

          <button
            onClick={() => setFolderSubTab('attendance')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer ${
              folderSubTab === 'attendance'
                ? 'bg-yellow-400 text-black shadow-xs font-black'
                : 'bg-[#141416] text-slate-300 hover:text-white border border-[#262626]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            {year} Trainee Attendance Matrix ({yearTrainees.length})
          </button>
        </div>

        {folderSubTab === 'records' && (
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`Search ${year} records...`}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-[#0a0a0a] border border-[#2a2a2d] rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-yellow-400"
            />
          </div>
        )}
      </div>

      {/* 4. MAIN CONTENT AREA */}
      {folderSubTab === 'records' ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredRecords.length === 0 ? (
              <div className="col-span-full bg-[#101012] p-8 rounded-xl border border-[#262626] text-center text-slate-500">
                <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-600 stroke-1" />
                <p className="font-bold text-xs text-slate-300 font-sans">No training records found for {year}.</p>
                <p className="text-[11px] text-slate-500 mt-1 font-mono">
                  Click "+ Add New {year} Training Record" or "Upload File / Import Data" to import sessions.
                </p>
              </div>
            ) : (
              filteredRecords.map((record) => {
                const docsCount = (record.documentation || []).length;
                const leadersCount = record.traineeLeadersCount || (record.traineeLeaders ? record.traineeLeaders.length : 0);

                return (
                  <div
                    key={record.id}
                    onClick={() => setSelectedRecordForDetail(record)}
                    className="bg-[#121214] rounded-xl border border-[#262626] p-3.5 shadow-sm hover:border-yellow-400/60 transition cursor-pointer flex flex-col justify-between group"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 text-[10px] font-mono font-bold">
                          <Calendar className="w-3 h-3 text-yellow-400" />
                          {record.trainingDate}
                        </span>

                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                            record.status === 'Completed'
                              ? 'bg-yellow-400 text-black font-black'
                              : record.status === 'Ongoing'
                              ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                              : record.status === 'Cancelled'
                              ? 'bg-neutral-900 text-slate-400 border border-neutral-700'
                              : 'bg-neutral-800 text-slate-300'
                          }`}
                        >
                          {record.status}
                        </span>
                      </div>

                      {/* Topic Title */}
                      <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-yellow-400 transition line-clamp-2">
                        {record.trainingTopic}
                      </h4>

                      {/* Venue & Time */}
                      <div className="mt-2.5 space-y-1 text-[11px] text-slate-400 font-mono">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="truncate text-slate-300">{record.departmentSection}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="truncate">{record.venue}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                          <span>{record.time}</span>
                        </div>
                      </div>

                      {/* Remarks Snippet */}
                      {record.purposeAndRemarks && (
                        <p className="text-[11px] text-slate-400 mt-2 line-clamp-2 bg-[#0a0a0c] p-2 rounded border border-[#202022] font-sans">
                          {record.purposeAndRemarks}
                        </p>
                      )}
                    </div>

                    {/* Bottom Metadata */}
                    <div className="mt-3 pt-2.5 border-t border-[#202022] flex items-center justify-between text-[11px] font-mono">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-slate-300">
                          <Users className="w-3 h-3 text-yellow-400" />
                          {leadersCount} Trainees
                        </span>

                        {docsCount > 0 && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-blue-500/10 border border-blue-500/30 text-blue-300 text-[10px]">
                            <FileText className="w-2.5 h-2.5 text-blue-400" />
                            {docsCount} Files
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-blue-400 font-bold group-hover:text-blue-300 transition">
                        Details <ArrowRight className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* Attendance Matrix for this Year */
        <LeadershipAttendanceMatrix
          trainees={trainees}
          onUpdateTrainee={onUpdateTrainee}
          onAddTrainee={onAddTrainee}
          onDeleteTrainee={onDeleteTrainee}
          addToast={addToast}
          yearFilterOverride={year.toString() as '2025' | '2026'}
        />
      )}

      {/* 5. TRAINING RECORD DETAIL & DOCUMENTATION MODAL */}
      {selectedRecordForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-[#121214] rounded-xl max-w-3xl w-full border border-[#2e2e33] shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-black border-b border-[#252528] flex items-start justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 text-[10px] font-mono font-bold uppercase mb-1">
                  <Folder className="w-3 h-3 text-yellow-400" />
                  📁 {year} Folder • Training Record
                </div>
                <h3 className="text-base font-black text-white uppercase tracking-wide">
                  {selectedRecordForDetail.trainingTopic}
                </h3>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1 font-mono">
                  <span>📅 {selectedRecordForDetail.trainingDate}</span>
                  <span>•</span>
                  <span>⏱️ {selectedRecordForDetail.time}</span>
                  <span>•</span>
                  <span>📍 {selectedRecordForDetail.venue}</span>
                  <span>•</span>
                  <span className="text-yellow-400 font-bold">{selectedRecordForDetail.status}</span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenEditModal(selectedRecordForDetail)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-neutral-800 rounded transition cursor-pointer"
                  title="Edit Record"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedRecordForDetail(null)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-neutral-800 rounded transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-4 space-y-3.5 max-h-[70vh] overflow-y-auto text-xs">
              {/* Record Summary Info Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-black rounded-lg border border-[#252528] font-mono">
                <div>
                  <div className="text-[10px] text-slate-400">Department / Line</div>
                  <div className="font-bold text-white mt-0.5 truncate">
                    {selectedRecordForDetail.departmentSection}
                  </div>
                  <div className="text-slate-500 text-[9px] truncate">Factory Leadership</div>
                </div>

                <div>
                  <div className="text-[10px] text-slate-400">Target Participants</div>
                  <div className="font-bold text-white mt-0.5">
                    {selectedRecordForDetail.traineeLeadersCount} Trainee Leaders
                  </div>
                  <div className="text-slate-500 text-[9px]">{selectedRecordForDetail.batch}</div>
                </div>

                <div>
                  <div className="text-[10px] text-slate-400">Venue & Environment</div>
                  <div className="font-bold text-white mt-0.5 truncate">
                    {selectedRecordForDetail.venue}
                  </div>
                  <div className="text-slate-500 text-[9px]">Factory Facility</div>
                </div>

                <div>
                  <div className="text-[10px] text-yellow-400">Compliance Folder</div>
                  <div className="font-bold text-yellow-400 mt-0.5">
                    Year {year} Folder
                  </div>
                  <div className="text-slate-500 text-[9px]">Validated Date</div>
                </div>
              </div>

              {/* Purpose & Remarks */}
              {selectedRecordForDetail.purposeAndRemarks && (
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider mb-1">
                    Purpose & Operational Remarks
                  </h4>
                  <p className="text-xs text-slate-300 bg-black p-3 rounded-lg border border-[#252528] font-sans">
                    {selectedRecordForDetail.purposeAndRemarks}
                  </p>
                </div>
              )}

              {/* Modules / Content Covered */}
              {selectedRecordForDetail.content && selectedRecordForDetail.content.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider mb-1">
                    Curriculum & Module Outline
                  </h4>
                  <div className="space-y-1">
                    {selectedRecordForDetail.content.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-slate-200 bg-black px-2.5 py-1.5 rounded border border-[#252528]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* DOCUMENTATION SECTION */}
              <div className="border border-[#252528] rounded-lg p-3 bg-[#0d0d0f]">
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#202023]">
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-400" />
                      Documentation & Attached Files
                    </h4>
                    <p className="text-[10px] text-slate-400 font-mono">
                      Permanently saved to this training record ({selectedRecordForDetail.trainingDate}).
                    </p>
                  </div>

                  <label className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold cursor-pointer transition">
                    <Upload className="w-3 h-3" />
                    Attach Files
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleAttachFileToRecord}
                    />
                  </label>
                </div>

                {(!selectedRecordForDetail.documentation || selectedRecordForDetail.documentation.length === 0) ? (
                  <div className="text-center py-4 text-xs text-slate-500 bg-black rounded font-mono">
                    No files attached yet. Click "Attach Files" to upload photos or signed sheets.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedRecordForDetail.documentation.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-2 rounded border border-[#252528] bg-black text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          {doc.type === 'photo' ? (
                            <ImageIcon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          ) : (
                            <FileText className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                          )}
                          <div className="truncate">
                            <div className="font-bold text-slate-200 truncate">{doc.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              {doc.size || '1.2 MB'} • {doc.uploadedAt}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            addToast('Download Initiated', `Opening attachment "${doc.name}"`, 'info');
                          }}
                          className="p-1 hover:bg-neutral-800 rounded text-slate-400 hover:text-white transition"
                          title="Download / View"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* TRAINEE LEADERS ATTENDANCE ROSTER */}
              {selectedRecordForDetail.traineeLeaders && selectedRecordForDetail.traineeLeaders.length > 0 && (
                <div className="border border-[#252528] rounded-lg p-3 bg-[#0d0d0f]">
                  <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#202023]">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-yellow-400" />
                      Enrolled Trainee Leaders ({selectedRecordForDetail.traineeLeaders.length})
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono">Interactive Attendance Checklist</span>
                  </div>

                  <div className="divide-y divide-[#1e1e21] max-h-44 overflow-y-auto border border-[#252528] rounded bg-black">
                    {selectedRecordForDetail.traineeLeaders.map((tl) => (
                      <div
                        key={tl.id}
                        className="flex items-center justify-between p-2 text-xs hover:bg-neutral-900 transition"
                      >
                        <div>
                          <div className="font-bold text-slate-200">{tl.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {tl.employeeNo} • {tl.department} ({tl.lineOrSection})
                          </div>
                        </div>

                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tl.attended ?? true}
                            onChange={() => handleToggleLeaderAttendance(selectedRecordForDetail.id, tl.id)}
                            className="rounded border-[#333] text-yellow-400 focus:ring-yellow-400 bg-black"
                          />
                          <span className={`text-[11px] font-mono font-bold ${tl.attended ? 'text-yellow-400' : 'text-slate-500'}`}>
                            {tl.attended ? 'Present' : 'Absent'}
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-black border-t border-[#252528] flex items-center justify-between">
              <button
                onClick={() => {
                  if (confirm(`Are you sure you want to delete this training record for ${selectedRecordForDetail.trainingTopic}?`)) {
                    onDeleteSchedule(selectedRecordForDetail.id);
                    setSelectedRecordForDetail(null);
                    addToast('Record Deleted', 'Training record was removed.', 'info');
                  }
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 text-red-400 hover:bg-red-950/40 rounded text-xs font-mono transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Record
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenEditModal(selectedRecordForDetail)}
                  className="px-3 py-1.5 bg-[#1e1e22] hover:bg-[#28282d] text-slate-200 border border-[#2f2f33] rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  Edit Information
                </button>
                <button
                  onClick={() => setSelectedRecordForDetail(null)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. ADD / EDIT TRAINING RECORD MODAL */}
      {isAddRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-[#121214] rounded-xl max-w-2xl w-full border border-[#2e2e33] shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-black border-b border-[#252528] flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
                  {editingRecord ? 'Edit Leadership Training Record' : `Add New Leadership Training Record`}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                  System automatically classifies folder by training date.
                </p>
              </div>

              <button
                onClick={() => setIsAddRecordModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-neutral-800 rounded transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveRecord} className="p-4 space-y-3 max-h-[75vh] overflow-y-auto text-xs">
              {/* Year badge */}
              <div className="p-2.5 rounded-lg border flex items-center justify-between bg-black border-[#252528]">
                <div className="flex items-center gap-2">
                  <Folder className="w-4 h-4 text-yellow-400" />
                  <span className="text-[11px] text-slate-400 font-mono">
                    Target Storage Classification:
                  </span>
                </div>

                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 text-xs font-mono font-bold">
                  📁 {detectedYearInfo.year} Training Folder
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                    Training Date (e.g. July 15, 2025 or Sept 16, 2026) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    placeholder="e.g. September 16, 2026"
                    className="w-full px-2.5 py-1.5 bg-black border border-[#2a2a2d] rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-yellow-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                    ISO Date (Calendar Reference)
                  </label>
                  <input
                    type="date"
                    value={formIsoDate}
                    onChange={(e) => {
                      setFormIsoDate(e.target.value);
                      if (e.target.value) {
                        const d = new Date(e.target.value + 'T00:00:00');
                        if (!isNaN(d.getTime())) {
                          setFormDate(d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }));
                        }
                      }
                    }}
                    className="w-full px-2.5 py-1.5 bg-black border border-[#2a2a2d] rounded-lg text-slate-100 focus:outline-none focus:border-yellow-400 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                  Training Subject / Topic *
                </label>
                <input
                  type="text"
                  required
                  value={formTopic}
                  onChange={(e) => setFormTopic(e.target.value)}
                  placeholder="e.g. 6S Management & Metal Contamination Control"
                  className="w-full px-2.5 py-1.5 bg-black border border-[#2a2a2d] rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                    Training Venue
                  </label>
                  <input
                    type="text"
                    value={formVenue}
                    onChange={(e) => setFormVenue(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-black border border-[#2a2a2d] rounded-lg text-slate-100 focus:outline-none focus:border-yellow-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                    Schedule Time
                  </label>
                  <input
                    type="text"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-black border border-[#2a2a2d] rounded-lg text-slate-100 focus:outline-none focus:border-yellow-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                    Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-black border border-[#2a2a2d] rounded-lg text-slate-100 focus:outline-none focus:border-yellow-400 font-mono"
                  >
                    <option value="Completed">Completed</option>
                    <option value="Upcoming">Upcoming</option>
                    <option value="Ongoing">Ongoing</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                  Purpose, Target Audience & Executive Remarks
                </label>
                <textarea
                  rows={2}
                  value={formRemarks}
                  onChange={(e) => setFormRemarks(e.target.value)}
                  placeholder="Provide brief operational context or training objectives..."
                  className="w-full px-2.5 py-1.5 bg-black border border-[#2a2a2d] rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                  Curriculum Outline (One topic per line)
                </label>
                <textarea
                  rows={3}
                  value={formContentStr}
                  onChange={(e) => setFormContentStr(e.target.value)}
                  placeholder="1. Overview\n2. Key Operations\n3. Workshop Demonstration"
                  className="w-full px-2.5 py-1.5 bg-black border border-[#2a2a2d] rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-yellow-400 font-mono"
                />
              </div>

              <div className="pt-2 border-t border-[#252528] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddRecordModalOpen(false)}
                  className="px-3 py-1.5 bg-[#1a1a1d] hover:bg-[#26262a] text-slate-300 rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-black font-black rounded-lg text-xs transition cursor-pointer"
                >
                  {editingRecord ? 'Save Changes' : `Add to ${detectedYearInfo.year} Folder`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
