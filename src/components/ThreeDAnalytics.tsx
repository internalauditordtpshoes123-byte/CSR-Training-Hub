import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  PieChart, 
  Layers, 
  ShieldCheck, 
  Lock, 
  Sparkles, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  Users, 
  Award,
  ChevronRight,
  Filter
} from 'lucide-react';
import { 
  Employee, 
  StitchingRecord, 
  DepartmentItem, 
  TraineeRecord, 
  TrainingLog,
  AuthenticatedEmployee,
  UserRole
} from '../types';
import { 
  isSectionLeader, 
  getUserAssignedSection, 
  filterRecordsForUser,
  resolveRecordSection,
  resolveRecordDepartment 
} from '../utils/sectionSecurity';

interface ThreeDAnalyticsProps {
  employees: Employee[];
  stitchingRecords: StitchingRecord[];
  departmentItems: DepartmentItem[];
  records: TraineeRecord[];
  logs: TrainingLog[];
  currentEmployee?: AuthenticatedEmployee | null;
  role: UserRole;
  onNavigateTab?: (tab: string) => void;
}

export default function ThreeDAnalytics({
  employees = [],
  stitchingRecords = [],
  departmentItems = [],
  records = [],
  logs = [],
  currentEmployee,
  role,
  onNavigateTab
}: ThreeDAnalyticsProps) {
  const isLeader = isSectionLeader(currentEmployee);
  const userAssignedSection = isLeader ? getUserAssignedSection(currentEmployee) : null;

  // Selected section for Admin drilldown (Section Leaders are strictly locked to their assigned section)
  const [adminSelectedSection, setAdminSelectedSection] = useState<string>('ALL');
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);
  const [activeMetricMode, setActiveMetricMode] = useState<'employees' | 'training' | 'compliance'>('employees');

  const effectiveSection = isLeader ? userAssignedSection : (adminSelectedSection === 'ALL' ? null : adminSelectedSection);

  // 1. Scoped Data Filtering
  const scopedEmployees = useMemo(() => {
    if (isLeader) {
      return filterRecordsForUser(currentEmployee, employees);
    }
    if (adminSelectedSection !== 'ALL') {
      return employees.filter(e => {
        const sec = resolveRecordSection(e);
        return sec && sec.toUpperCase().includes(adminSelectedSection.toUpperCase());
      });
    }
    return employees;
  }, [employees, isLeader, currentEmployee, adminSelectedSection]);

  const scopedStitching = useMemo(() => {
    if (isLeader) {
      return filterRecordsForUser(currentEmployee, stitchingRecords);
    }
    if (adminSelectedSection !== 'ALL') {
      return stitchingRecords.filter(s => {
        const sec = resolveRecordSection(s);
        return sec && sec.toUpperCase().includes(adminSelectedSection.toUpperCase());
      });
    }
    return stitchingRecords;
  }, [stitchingRecords, isLeader, currentEmployee, adminSelectedSection]);

  const scopedDeptItems = useMemo(() => {
    if (isLeader) {
      return filterRecordsForUser(currentEmployee, departmentItems);
    }
    if (adminSelectedSection !== 'ALL') {
      return departmentItems.filter(d => {
        const sec = resolveRecordSection(d);
        return sec && sec.toUpperCase().includes(adminSelectedSection.toUpperCase());
      });
    }
    return departmentItems;
  }, [departmentItems, isLeader, currentEmployee, adminSelectedSection]);

  const scopedTrainees = useMemo(() => {
    if (isLeader) {
      return filterRecordsForUser(currentEmployee, records);
    }
    if (adminSelectedSection !== 'ALL') {
      return records.filter(r => {
        const sec = resolveRecordSection(r);
        return sec && sec.toUpperCase().includes(adminSelectedSection.toUpperCase());
      });
    }
    return records;
  }, [records, isLeader, currentEmployee, adminSelectedSection]);

  // 2. Metrics Calculated STRICTLY from actual records currently in system (0 if none)
  const totalEmployees = scopedEmployees.length;
  const activeEmployees = scopedEmployees.filter(e => e.status === 'Active').length;
  const pendingEmployees = totalEmployees - activeEmployees;

  // Stitching certifications from actual records
  const certifiedStitchers = scopedStitching.filter(s => 
    s.blueLabelStatus === 'Certified' || s.status === 'Completed'
  ).length;

  const inProgressTraining = scopedStitching.filter(s => 
    s.status === 'In Progress' || s.status === 'Initial Stage'
  ).length + scopedDeptItems.filter(d => 
    d.status === 'In Progress' || d.status === 'Pending'
  ).length;

  const totalTrainingSessions = scopedStitching.length + scopedDeptItems.length;

  const completedTraineeRecords = scopedTrainees.filter(r => 
    r.status === 'Completed' || r.completionStatus === 'Completed'
  ).length;

  // 3. Section/Department Breakdown strictly derived from real records
  const sectionBreakdown = useMemo(() => {
    const map: Record<string, { label: string; employees: number; training: number; certified: number }> = {};

    scopedEmployees.forEach(emp => {
      const sec = resolveRecordSection(emp) || resolveRecordDepartment(emp) || 'General';
      if (!map[sec]) {
        map[sec] = { label: sec, employees: 0, training: 0, certified: 0 };
      }
      map[sec].employees++;
    });

    scopedStitching.forEach(st => {
      const sec = resolveRecordSection(st) || 'Stitching';
      if (!map[sec]) {
        map[sec] = { label: sec, employees: 0, training: 0, certified: 0 };
      }
      map[sec].training++;
      if (st.blueLabelStatus === 'Certified' || st.status === 'Completed') {
        map[sec].certified++;
      }
    });

    scopedDeptItems.forEach(di => {
      const sec = resolveRecordSection(di) || di.department || 'Department';
      if (!map[sec]) {
        map[sec] = { label: sec, employees: 0, training: 0, certified: 0 };
      }
      map[sec].training++;
      if (di.status === 'Completed') {
        map[sec].certified++;
      }
    });

    const list = Object.values(map);
    // Sort descending by employees or training
    list.sort((a, b) => b.employees - a.employees);
    return list.slice(0, 8); // Top 8 sections represented
  }, [scopedEmployees, scopedStitching, scopedDeptItems]);

  const maxBarValue = useMemo(() => {
    if (sectionBreakdown.length === 0) return 10;
    const maxVal = Math.max(
      ...sectionBreakdown.map(s => activeMetricMode === 'employees' ? s.employees : s.training)
    );
    return maxVal > 0 ? maxVal : 10;
  }, [sectionBreakdown, activeMetricMode]);

  // Unique sections available for Admin filter
  const allAvailableSections = useMemo(() => {
    const set = new Set<string>();
    employees.forEach(e => {
      const sec = resolveRecordSection(e);
      if (sec) set.add(sec);
    });
    return Array.from(set).sort();
  }, [employees]);

  return (
    <div id="section_3d_analytics" className="w-full space-y-4">
      
      {/* Header Bar with 3D Status & RBAC Indicator */}
      <div className="bg-[#0a1628] border border-[#162d4e] rounded-2xl p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-600/30 to-blue-600/30 border border-cyan-500/30 text-cyan-400 shadow-inner">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>3D Enterprise Analytics Engine</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-950 text-cyan-400 border border-cyan-800">
                  REAL RECORDS ONLY
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Isometric depth models synchronized with master database records in real-time.
            </p>
          </div>
        </div>

        {/* Section Restriction Badge / Admin Filter */}
        <div className="flex items-center gap-2.5">
          {isLeader ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-300 text-xs font-semibold shadow-xs">
              <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Restricted Section Leader Scope:</span>
              <span className="px-2 py-0.5 rounded-md bg-amber-900/80 text-white font-mono font-bold border border-amber-400/50">
                {userAssignedSection}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-cyan-400" />
                <span>Scope Filter:</span>
              </span>
              <select
                id="select_analytics_section_scope"
                value={adminSelectedSection}
                onChange={(e) => setAdminSelectedSection(e.target.value)}
                className="bg-[#07111e] border border-[#1b355a] text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-cyan-500 transition-colors font-medium cursor-pointer"
              >
                <option value="ALL">Enterprise Consolidated (All Sections)</option>
                {allAvailableSections.map(sec => (
                  <option key={sec} value={sec}>{sec}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Grid of 3D Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Card 1: 3D Isometric Extruded Column Bars (Col 7) */}
        <div className="lg:col-span-7 bg-[#07111f] border border-[#152a48] rounded-2xl p-5 shadow-2xl flex flex-col justify-between relative overflow-hidden">
          
          {/* Subtle 3D background grid mesh */}
          <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />

          <div className="flex items-center justify-between mb-4 relative z-10">
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                <span>3D Isometric Volume by Section</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isLeader ? `Active workforce in ${userAssignedSection}` : 'Comparative record volumes across active sections'}
              </p>
            </div>

            {/* Metric Mode Toggle */}
            <div className="flex items-center gap-1 bg-[#040a14] p-1 rounded-xl border border-[#132742]">
              <button
                type="button"
                onClick={() => setActiveMetricMode('employees')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeMetricMode === 'employees' 
                    ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-600/50' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Employees
              </button>
              <button
                type="button"
                onClick={() => setActiveMetricMode('training')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeMetricMode === 'training' 
                    ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/50' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Training
              </button>
            </div>
          </div>

          {/* 3D Isometric Stage Canvas */}
          <div className="relative h-60 w-full pt-6 pb-2 px-3 border-b border-[#12243d] flex items-end justify-around gap-2 select-none">
            {sectionBreakdown.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                <Users className="w-8 h-8 text-slate-600 mb-2" />
                <span>No records found currently registered in this section scope (Count: 0).</span>
              </div>
            ) : (
              sectionBreakdown.map((sec, idx) => {
                const val = activeMetricMode === 'employees' ? sec.employees : sec.training;
                const heightPct = maxBarValue > 0 ? Math.max(12, Math.min(92, Math.round((val / maxBarValue) * 88))) : 12;
                const isHovered = hoveredBarIndex === idx;

                const primaryColor = activeMetricMode === 'employees' ? '#06b6d4' : '#f59e0b';
                const shadowColor = activeMetricMode === 'employees' ? '#0891b2' : '#d97706';
                const topCapColor = activeMetricMode === 'employees' ? '#67e8f9' : '#fcd34d';

                return (
                  <div
                    key={sec.label}
                    className="flex-1 flex flex-col items-center justify-end h-full group cursor-pointer relative"
                    onMouseEnter={() => setHoveredBarIndex(idx)}
                    onMouseLeave={() => setHoveredBarIndex(null)}
                    onClick={() => onNavigateTab && onNavigateTab(activeMetricMode === 'employees' ? 'employees' : 'stitching')}
                  >
                    {/* Tooltip on Hover */}
                    {isHovered && (
                      <div className="absolute -top-10 z-30 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-white text-[11px] font-mono shadow-xl whitespace-nowrap animate-in fade-in zoom-in-95 duration-150">
                        <span className="font-bold text-cyan-300">{sec.label}:</span> {val} {activeMetricMode === 'employees' ? 'Employees' : 'Sessions'}
                      </div>
                    )}

                    {/* Numeric Count Label */}
                    <span className={`text-[10px] font-mono font-bold transition-all mb-1.5 ${
                      isHovered ? 'text-cyan-300 scale-110' : 'text-slate-300'
                    }`}>
                      {val}
                    </span>

                    {/* 3D Isometric Column (3-facet extruded bar) */}
                    <div 
                      className="relative w-full max-w-[46px] transition-all duration-300 ease-out"
                      style={{ height: `${heightPct}%` }}
                    >
                      {/* Top Isometric Diamond Cap */}
                      <svg 
                        viewBox="0 0 46 16" 
                        className="w-full h-3.5 absolute -top-3 left-0 z-20 drop-shadow-sm"
                        preserveAspectRatio="none"
                      >
                        <polygon
                          points="23,0 46,8 23,16 0,8"
                          fill={isHovered ? '#a5f3fc' : topCapColor}
                        />
                      </svg>

                      {/* Front Facet */}
                      <div 
                        className="absolute inset-0 rounded-b-xs transition-all duration-300"
                        style={{
                          background: `linear-gradient(180deg, ${isHovered ? '#22d3ee' : primaryColor} 0%, #083344 100%)`,
                          boxShadow: isHovered ? '0 0 16px rgba(6,182,212,0.45)' : 'none'
                        }}
                      />

                      {/* Right Edge Depth Extrusion Overlay */}
                      <div 
                        className="absolute top-0 right-0 bottom-0 w-[30%] opacity-40 rounded-br-xs pointer-events-none"
                        style={{
                          background: `linear-gradient(180deg, ${shadowColor} 0%, #02121e 100%)`
                        }}
                      />

                      {/* 3D Base Shadow on Floor */}
                      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-[110%] h-2.5 bg-black/50 rounded-full blur-xs pointer-events-none" />
                    </div>

                    {/* Section Label */}
                    <span className={`text-[8.5px] font-mono uppercase tracking-tight truncate w-full text-center mt-2.5 transition-colors ${
                      isHovered ? 'text-white font-bold' : 'text-slate-400'
                    }`}>
                      {sec.label}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Legend */}
          <div className="flex items-center justify-between pt-3 text-xs font-mono text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400" />
              <span>Active Workforce: <strong className="text-white">{totalEmployees}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
              <span>Training Plans: <strong className="text-white">{totalTrainingSessions}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
              <span>Certified Passed: <strong className="text-white">{certifiedStitchers}</strong></span>
            </div>
          </div>
        </div>

        {/* Card 2: 3D Perspective Donut & Status Distribution (Col 5) */}
        <div className="lg:col-span-5 bg-[#07111f] border border-[#152a48] rounded-2xl p-5 shadow-2xl flex flex-col justify-between relative overflow-hidden">
          
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                <PieChart className="w-4 h-4 text-emerald-400" />
                <span>3D Status Perspective Wheel</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Record fulfillment computed from live system registers
              </p>
            </div>
            <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800/40">
              SYNCHRONIZED
            </span>
          </div>

          {/* 3D Tilted Perspective Ring Canvas */}
          <div className="relative py-4 flex items-center justify-center">
            
            {/* Perspective Ring Container with 3D Rotate */}
            <div 
              className="relative w-44 h-44 flex items-center justify-center"
              style={{
                perspective: '600px',
                transformStyle: 'preserve-3d'
              }}
            >
              {/* Floor Shadow for 3D Ring */}
              <div 
                className="absolute w-40 h-28 bg-emerald-950/30 rounded-full blur-md"
                style={{
                  transform: 'rotateX(62deg) translateY(45px)',
                }}
              />

              {/* Tilted Ring SVG with genuine 3D feel */}
              <div
                style={{
                  transform: 'rotateX(38deg) rotateZ(-18deg)',
                  transition: 'transform 0.5s ease-out'
                }}
                className="w-full h-full relative"
              >
                <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_12px_20px_rgba(0,0,0,0.6)]">
                  {/* Outer Depth Base Ring (Layer 1 - Darker Extrusion) */}
                  <circle
                    cx="50"
                    cy="53"
                    r="38"
                    fill="none"
                    stroke="#021c16"
                    strokeWidth="14"
                  />

                  {/* Active Employees Segment (Emerald) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="13"
                    strokeDasharray={`${totalEmployees > 0 ? (activeEmployees / totalEmployees) * 238.7 : 0} 238.7`}
                    strokeDashoffset="0"
                    strokeLinecap="round"
                  />

                  {/* Certified Passed Segment (Cyan) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="13"
                    strokeDasharray={`${totalEmployees > 0 ? (certifiedStitchers / totalEmployees) * 238.7 : 0} 238.7`}
                    strokeDashoffset={`${totalEmployees > 0 ? -((activeEmployees / totalEmployees) * 238.7) : 0}`}
                    strokeLinecap="round"
                  />

                  {/* Training In Progress Segment (Amber) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="13"
                    strokeDasharray={`${totalEmployees > 0 ? (inProgressTraining / totalEmployees) * 238.7 : 0} 238.7`}
                    strokeDashoffset={`${totalEmployees > 0 ? -(((activeEmployees + certifiedStitchers) / totalEmployees) * 238.7) : 0}`}
                    strokeLinecap="round"
                  />

                  {/* Bevel Highlight Ring */}
                  <circle
                    cx="50"
                    cy="50"
                    r="44.5"
                    fill="none"
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth="0.8"
                  />
                </svg>

                {/* Center Core Badge */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                  <span className="text-xl font-black text-white font-sans tracking-tight leading-none drop-shadow-md">
                    {totalEmployees}
                  </span>
                  <span className="text-[8.5px] text-slate-300 font-mono uppercase tracking-wider mt-1">
                    {isLeader ? 'Section Roster' : 'Total Workforce'}
                  </span>
                </div>
              </div>
            </div>

            {/* Metrics Breakdown Side Stack */}
            <div className="ml-4 space-y-2 text-xs font-mono min-w-[130px]">
              <div className="p-2 rounded-xl bg-[#040c17] border border-[#11243d] flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/50" />
                  <span className="text-slate-300 text-[11px]">Active</span>
                </div>
                <span className="font-bold text-white font-mono">{activeEmployees}</span>
              </div>

              <div className="p-2 rounded-xl bg-[#040c17] border border-[#11243d] flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-xs shadow-cyan-500/50" />
                  <span className="text-slate-300 text-[11px]">Certified</span>
                </div>
                <span className="font-bold text-white font-mono">{certifiedStitchers}</span>
              </div>

              <div className="p-2 rounded-xl bg-[#040c17] border border-[#11243d] flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-xs shadow-amber-500/50" />
                  <span className="text-slate-300 text-[11px]">In Training</span>
                </div>
                <span className="font-bold text-white font-mono">{inProgressTraining}</span>
              </div>

              <div className="p-2 rounded-xl bg-[#040c17] border border-[#11243d] flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                  <span className="text-slate-300 text-[11px]">Pending</span>
                </div>
                <span className="font-bold text-white font-mono">{pendingEmployees}</span>
              </div>
            </div>

          </div>

          {/* Section Leader Notice if active */}
          <div className="mt-2 pt-2 border-t border-[#12243d] flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Synchronized System Total:</span>
            <span className="text-cyan-400 font-bold">{totalEmployees} Records</span>
          </div>

        </div>

      </div>

    </div>
  );
}
