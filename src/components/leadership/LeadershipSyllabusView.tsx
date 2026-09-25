import React, { useState } from 'react';
import {
  BookOpen,
  Calendar,
  User,
  MapPin,
  CheckCircle2,
  Clock,
  Layers,
  Award,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { LEADERSHIP_COURSES_DEF } from '../../data/leadershipSheetData';

export const LeadershipSyllabusView: React.FC = () => {
  const [selectedYear, setSelectedYear] = useState<'2025' | '2026'>('2026');

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-900 flex items-center justify-center text-amber-400 shadow-md">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 text-[11px] font-semibold uppercase tracking-wider mb-1">
              Official Supervisory Curriculum
            </div>
            <h2 className="text-xl font-bold text-slate-900 font-serif">
              Leadership & Core Competency Course Syllabi
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Standardized modular instruction for Section Leaders, Line Supervisors & Group Leaders
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200 self-start sm:self-auto">
          <button
            onClick={() => setSelectedYear('2025')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              selectedYear === '2025'
                ? 'bg-blue-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            2025 Schedule (Sheet 1)
          </button>
          <button
            onClick={() => setSelectedYear('2026')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              selectedYear === '2026'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            2026 Schedule (Sheet 2)
          </button>
        </div>
      </div>

      {/* Course Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {LEADERSHIP_COURSES_DEF.map((course, idx) => {
          const dates = selectedYear === '2026' ? course.dates2026 : course.dates2025;
          return (
            <div
              key={course.key}
              className="bg-white border border-slate-200 hover:border-blue-300 rounded-2xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-[11px] font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
                    MODULE 0{idx + 1}
                  </span>
                  <span className="text-[11px] font-mono text-amber-800 font-bold bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                    {dates.join(' / ')}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-900 transition mb-1 font-serif">
                  {course.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  {course.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="truncate font-medium">{course.trainer}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">{course.venue}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>2:00 PM – 3:00 PM (Subic Training Center)</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
