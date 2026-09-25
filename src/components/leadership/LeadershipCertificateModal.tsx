import React, { useRef } from 'react';
import {
  Award,
  Download,
  Printer,
  X,
  CheckCircle2,
  ShieldCheck,
  Building,
  Calendar,
  Sparkles
} from 'lucide-react';
import { LeadershipTraineeRow, LEADERSHIP_COURSES_DEF } from '../../data/leadershipSheetData';

interface LeadershipCertificateModalProps {
  trainee: LeadershipTraineeRow | null;
  onClose: () => void;
  addToast: (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const LeadershipCertificateModal: React.FC<LeadershipCertificateModalProps> = ({
  trainee,
  onClose,
  addToast
}) => {
  const certRef = useRef<HTMLDivElement>(null);

  if (!trainee) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    addToast(
      'Certificate Ready',
      `Generated official Certificate of Completion for ${trainee.name}. Use Print > Save as PDF.`,
      'success'
    );
    window.print();
  };

  const attendedCourses = LEADERSHIP_COURSES_DEF.filter((c) => trainee.courses[c.key]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-[#0f0f10] border border-[#222222] rounded-xl max-w-4xl w-full flex flex-col shadow-2xl overflow-hidden print:border-none print:shadow-none print:max-w-full">
        {/* Modal Controls Header */}
        <div className="p-3.5 border-b border-[#222222] flex items-center justify-between bg-black print:hidden">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-yellow-400" />
            <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider font-mono">
              Official Certificate of Completion · Leadership Training {trainee.year}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Certificate
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-black rounded-lg text-xs font-black shadow transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-neutral-800 text-base font-bold cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Certificate Canvas Frame */}
        <div className="p-6 md:p-8 bg-[#08080a] flex items-center justify-center print:p-0 print:bg-white">
          <div
            ref={certRef}
            className="w-full max-w-3xl bg-[#fdfcf7] text-slate-900 border-[10px] border-[#0a2540] rounded-xl p-8 md:p-12 relative shadow-2xl overflow-hidden print:border-[8px] print:rounded-none print:shadow-none print:w-full"
            style={{
              backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)',
              backgroundSize: '20px 20px'
            }}
          >
            {/* Inner Golden Border */}
            <div className="absolute inset-2 border-2 border-[#c59b27] rounded pointer-events-none"></div>
            <div className="absolute inset-3 border border-[#c59b27]/40 rounded pointer-events-none"></div>

            {/* Corner Filigrees */}
            <div className="absolute top-4 left-4 text-[#c59b27] font-serif text-xl select-none">❖</div>
            <div className="absolute top-4 right-4 text-[#c59b27] font-serif text-xl select-none">❖</div>
            <div className="absolute bottom-4 left-4 text-[#c59b27] font-serif text-xl select-none">❖</div>
            <div className="absolute bottom-4 right-4 text-[#c59b27] font-serif text-xl select-none">❖</div>

            {/* Top Brand Header */}
            <div className="text-center relative z-10 mb-6">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Building className="w-6 h-6 text-[#0a2540]" />
                <span className="font-serif tracking-[0.2em] font-black text-sm text-[#0a2540] uppercase">
                  DA TIAN SUBIC SHOES INC.
                </span>
              </div>
              <p className="text-[10px] tracking-widest text-slate-600 uppercase font-sans">
                Corporate Social Responsibility & Workforce Leadership Academy
              </p>
            </div>

            {/* Main Title */}
            <div className="text-center relative z-10 mb-6">
              <h1 className="font-serif text-2xl md:text-3xl font-black tracking-widest text-[#0a2540] uppercase">
                CERTIFICATE OF COMPLETION
              </h1>
              <div className="w-48 h-1 bg-gradient-to-r from-transparent via-[#c59b27] to-transparent mx-auto mt-2"></div>
              <p className="text-xs text-slate-600 font-serif italic mt-2">
                This prestigious credential is proudly presented to
              </p>
            </div>

            {/* Trainee Name */}
            <div className="text-center relative z-10 my-4 py-2 border-b-2 border-slate-300 max-w-lg mx-auto">
              <h2 className="text-2xl md:text-3xl font-serif font-black text-[#0a2540] tracking-wide">
                {trainee.name}
              </h2>
              <p className="text-xs font-sans font-bold text-sky-900 mt-1 uppercase tracking-wider">
                {trainee.department} · Employee No: {trainee.employeeNo || `DTP-${trainee.year}-${trainee.no.toString().padStart(4, '0')}`}
              </p>
            </div>

            {/* Body Citation */}
            <div className="text-center relative z-10 max-w-xl mx-auto my-5 text-xs md:text-sm text-slate-700 leading-relaxed font-serif">
              <p>
                for exceptional dedication and successful mastery of the official{' '}
                <strong className="text-[#0a2540] font-sans font-bold">
                  {trainee.year} Leadership & Supervisory Development Program
                </strong>{' '}
                ({trainee.trainingTopic}), having demonstrated excellence across key managerial competencies including
                Quality Standards, 6S Management, Operational Coordination, and Professional Accountability.
              </p>
            </div>

            {/* Attended Competencies Chips */}
            <div className="relative z-10 my-4 max-w-xl mx-auto">
              <div className="flex flex-wrap justify-center gap-1.5">
                {attendedCourses.map((c) => (
                  <span
                    key={c.key}
                    className="text-[10px] font-sans font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-700" />
                    {c.title}
                  </span>
                ))}
              </div>
            </div>

            {/* Signatures & Seal Section */}
            <div className="grid grid-cols-3 items-end justify-between mt-8 pt-4 relative z-10 text-center">
              {/* Signature 1 */}
              <div>
                <div className="font-serif italic text-sm text-slate-800 font-bold border-b border-slate-400 pb-1 mb-1 mx-2">
                  Atty. Patricia Ramos
                </div>
                <p className="text-[10px] font-bold text-slate-700 uppercase font-sans">
                  Human Resources Director
                </p>
                <p className="text-[9px] text-slate-500 font-sans">Training & Development Lead</p>
              </div>

              {/* Central Golden Seal */}
              <div className="flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#96741b] via-[#e5be4a] to-[#c59b27] border-2 border-white shadow-lg flex flex-col items-center justify-center text-white p-1 text-center select-none">
                  <Sparkles className="w-4 h-4 text-amber-100" />
                  <span className="text-[7px] font-black uppercase tracking-tighter leading-none mt-0.5">
                    OFFICIAL
                  </span>
                  <span className="text-[8px] font-black tracking-widest leading-none">SEAL</span>
                  <span className="text-[6px] font-mono text-amber-100 mt-0.5">{trainee.year}</span>
                </div>
                <span className="text-[8px] font-mono text-slate-500 mt-1 font-bold">
                  RECORD: {trainee.sourceSheet}
                </span>
              </div>

              {/* Signature 2 */}
              <div>
                <div className="font-serif italic text-sm text-slate-800 font-bold border-b border-slate-400 pb-1 mb-1 mx-2">
                  Engr. Carlos Mendoza
                </div>
                <p className="text-[10px] font-bold text-slate-700 uppercase font-sans">
                  Plant Operations Director
                </p>
                <p className="text-[9px] text-slate-500 font-sans">Da Tian Subic Shoes Inc.</p>
              </div>
            </div>

            {/* Footer Dates */}
            <div className="mt-6 pt-3 border-t border-slate-300 text-center text-[9px] text-slate-500 font-sans relative z-10 flex items-center justify-between">
              <span>Program Dates: {trainee.trainingDate}</span>
              <span>Issued at: Subic Bay Freeport Zone, Philippines</span>
              <span>Score: {trainee.total} Modules Passed (Status: Completed)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
