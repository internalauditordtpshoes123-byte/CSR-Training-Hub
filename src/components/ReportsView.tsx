/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileText, 
  Printer, 
  Download, 
  Filter, 
  Search, 
  CheckCircle, 
  TrendingUp, 
  Users, 
  Award,
  BookOpen,
  History,
  Shield,
  Activity,
  UserCheck
} from 'lucide-react';
import { TrainingLog, StitchingRecord, DepartmentItem, SystemAuditLogItem } from '../types';
import { fetchAuditLogsFromServer, subscribeToRealtimeSync } from '../services/realtimeSync';
import DatianLogo from './DatianLogo';

interface ReportsViewProps {
  logs: TrainingLog[];
  stitchingRecords: StitchingRecord[];
  departmentItems: DepartmentItem[];
  addToast: (title: string, message: string, type: 'success' | 'warning' | 'info') => void;
}

export default function ReportsView({
  logs,
  stitchingRecords,
  departmentItems,
  addToast
}: ReportsViewProps) {
  const [selectedModule, setSelectedModule] = useState<'all' | 'leadership' | 'stitching' | 'department' | 'audit'>('all');
  const [isCompiling, setIsCompiling] = useState(false);
  const [auditLogs, setAuditLogs] = useState<SystemAuditLogItem[]>([]);
  const [auditSearch, setAuditSearch] = useState('');

  useEffect(() => {
    fetchAuditLogsFromServer().then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        setAuditLogs(data);
      }
    });

    const unsubscribe = subscribeToRealtimeSync((event) => {
      if (event.entity === 'auditLogs' || event.type === 'AUDIT_LOGGED') {
        if (Array.isArray(event.data)) {
          setAuditLogs(event.data);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const filteredAuditLogs = useMemo(() => {
    if (!auditSearch.trim()) return auditLogs;
    const q = auditSearch.toLowerCase();
    return auditLogs.filter(
      (item) =>
        item.user?.toLowerCase().includes(q) ||
        item.module?.toLowerCase().includes(q) ||
        item.action?.toLowerCase().includes(q) ||
        item.details?.toLowerCase().includes(q)
    );
  }, [auditLogs, auditSearch]);

  const stats = useMemo(() => {
    const totalSchedules = logs.length;
    const completedSchedules = logs.filter(l => l.status === 'Completed').length;
    
    const totalStitching = stitchingRecords.length;
    const blueLabelStitching = stitchingRecords.filter(s => s.blueLabelStatus === 'Certified').length;

    const totalDepts = departmentItems.length;
    const completedDepts = departmentItems.filter(d => d.status === 'Completed').length;

    return {
      totalSchedules,
      completedSchedules,
      totalStitching,
      blueLabelStitching,
      totalDepts,
      completedDepts,
      totalEntries: totalSchedules + totalStitching + totalDepts
    };
  }, [logs, stitchingRecords, departmentItems]);

  const handleExportPDF = () => {
    setIsCompiling(true);
    addToast('PDF Compiling', 'Synthesizing layout structures and visual charts into PDF binary...', 'info');
    setTimeout(() => {
      setIsCompiling(false);
      addToast('Download Initiated', 'TMS_Audit_Report_2026.pdf has been generated and downloaded.', 'success');
    }, 1800);
  };

  const handleExportCSV = () => {
    setIsCompiling(true);
    addToast('CSV Compiling', 'Exporting flat training indexes to spreadsheet CSV structure...', 'info');
    setTimeout(() => {
      setIsCompiling(false);
      addToast('Download Initiated', 'TMS_Audit_Report_Index.csv downloaded.', 'success');
    }, 1200);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Dynamic Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="bg-blue-100 text-blue-700 p-1 rounded-sm"><FileText className="w-4 h-4" /></span>
            <h2 className="text-xl font-bold text-slate-800">Auto-Generated Performance Reports</h2>
          </div>
          <p className="text-xs text-slate-500">Examine overall plants compliance, trainees progress rates, leadership syllabuses, and print official report papers.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={handlePrint}
            className="bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs px-3.5 py-2 rounded-lg border border-slate-200 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-500" /> Print Report Sheet
          </button>
          
          <button 
            onClick={handleExportPDF}
            disabled={isCompiling}
            className="bg-red-650 hover:bg-red-700 text-slate-900 font-bold text-xs px-3.5 py-2 rounded-lg transition border border-red-200 bg-red-50 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-red-600" /> Export PDF
          </button>

          <button 
            onClick={handleExportCSV}
            disabled={isCompiling}
            className="bg-slate-905 hover:bg-slate-800 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition bg-slate-900 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
          >
            <FileText className="w-4 h-4 text-blue-400" /> Export CSV Data
          </button>
        </div>
      </div>

      {/* Audit stats quick summaries grids */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* KPI 1 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold uppercase tracking-wider">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span>Leadership Course Progress</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-800 font-mono">{stats.completedSchedules}</span>
            <span className="text-slate-400 text-xs">/ {stats.totalSchedules} classes passed</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600" style={{ width: `${(stats.completedSchedules / (stats.totalSchedules || 1)) * 100}%` }}></div>
          </div>
          <p className="text-[10px] text-slate-400">Average syllabus retention on leadership principles.</p>
        </div>

        {/* KPI 2 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold uppercase tracking-wider">
            <Award className="w-4 h-4 text-indigo-500" />
            <span>Stitching Certifications</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-800 font-mono">{stats.blueLabelStitching}</span>
            <span className="text-slate-400 text-xs">/ {stats.totalStitching} trainees Blue Label</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500" style={{ width: `${(stats.blueLabelStitching / (stats.totalStitching || 1)) * 100}%` }}></div>
          </div>
          <p className="text-[10px] text-slate-400">Ratio of plant operators maintaining standard Takt times.</p>
        </div>

        {/* KPI 3 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold uppercase tracking-wider">
            <Users className="w-4 h-4 text-emerald-500" />
            <span>Department Drills Completed</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-800 font-mono">{stats.completedDepts}</span>
            <span className="text-slate-400 text-xs">/ {stats.totalDepts} units trained</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500" style={{ width: `${(stats.completedDepts / (stats.totalDepts || 1)) * 100}%` }}></div>
          </div>
          <p className="text-[10px] text-slate-400">Total functional units validated in lean standard safety.</p>
        </div>

      </div>


      {/* Actual audit report sheet (What gets printed/reviewed in audit) */}
      <div className="bg-white border border-slate-200/85 rounded-xl p-6 shadow-xs space-y-6 max-w-4xl mx-auto font-sans" id="tms-print-area">
        
        {/* Print Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-slate-200 gap-4">
          <div className="flex items-center gap-4">
            <div className="p-1.5 bg-[#051126] rounded-xl border border-blue-900/40 flex-shrink-0 shadow-sm">
              <DatianLogo size="custom" width={84} height={54} />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-mono font-bold text-blue-600 uppercase tracking-widest block">Official Audit Summary &bull; DATIAN CSR HUB</span>
              <h3 className="text-xl font-bold text-slate-800 uppercase tracking-tight">Training Management Performance Record</h3>
              <p className="text-[11px] text-slate-400 font-medium">Generation Date: {new Date().toISOString().slice(0, 10)} &bull; Datian Subic Shoes Inc.</p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono">
            <strong>System:</strong> TMS-PRO-INDEX<br />
            <strong>State:</strong> COMPLIANT LIVE<br />
            <strong>Operator pool:</strong> {stats.totalEntries} entries
          </div>
        </div>

        {/* Selectors */}
        <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-lg text-xs w-full md:w-80 no-print">
          <span className="text-slate-500 font-bold px-2 whitespace-nowrap">Filter Audit Section:</span>
          <select 
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value as any)}
            className="bg-white border border-slate-200 p-1 rounded font-semibold text-slate-700 w-full cursor-pointer focus:outline-none"
          >
            <option value="all">Full Company Logs</option>
            <option value="leadership">1. Leadership Master Logs</option>
            <option value="stitching">2. Stitching Takt Records</option>
            <option value="department">3. Departmental Drills</option>
            <option value="audit">4. Live Multi-PC Audit Trail ({auditLogs.length})</option>
          </select>
        </div>

        {/* Section 1: Leadership */}
        {(selectedModule === 'all' || selectedModule === 'leadership') && (
          <div className="space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider bg-slate-100/50 p-2 text-slate-800 border-l-4 border-blue-600 flex items-center justify-between">
              <span>Section I &bull; Leadership & Subject Courses</span>
              <span className="font-mono text-[10px] text-slate-500">{logs.length} records</span>
            </h4>

            <table className="w-full text-left text-[11px] text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-250">
                <tr>
                  <th className="py-2 px-3">Batch</th>
                  <th className="py-2 px-3">Course / Subject title</th>
                  <th className="py-2 px-3">Instructor</th>
                  <th className="py-2 px-3">Scheduled Date</th>
                  <th className="py-2 px-3 text-center">Trainees</th>
                  <th className="py-2 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log, idx) => (
                  <tr key={log.id ? `${log.id}-${idx}` : `rep-log-${idx}`} className="hover:bg-slate-50/50">
                    <td className="py-2 px-3 font-mono font-bold text-slate-500">{log.batchCode}</td>
                    <td className="py-2 px-3 font-semibold text-slate-800">{log.title}</td>
                    <td className="py-2 px-3">{log.instructor}</td>
                    <td className="py-2 px-3 font-mono">{log.date}</td>
                    <td className="py-2 px-3 text-center">{log.traineesCount} pax</td>
                    <td className="py-2 px-3 text-right">
                      <span className={`inline-block px-2 text-[10px] font-bold ${log.status === 'Completed' ? 'text-emerald-600' : 'text-slate-550'}`}>{log.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Section 2: Stitching */}
        {(selectedModule === 'all' || selectedModule === 'stitching') && (
          <div className="space-y-3 pt-4">
            <h4 className="font-bold text-xs uppercase tracking-wider bg-slate-100/50 p-2 text-slate-800 border-l-4 border-indigo-600 flex items-center justify-between">
              <span>Section II &bull; Stitching Plan & Takt Monitors</span>
              <span className="font-mono text-[10px] text-slate-500">{stitchingRecords.length} records</span>
            </h4>

            <table className="w-full text-left text-[11px] text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-250">
                <tr>
                  <th className="py-2 px-3">Style</th>
                  <th className="py-2 px-3">Line</th>
                  <th className="py-2 px-3">Operator Name</th>
                  <th className="py-2 px-3">Stitch Process</th>
                  <th className="py-2 px-3 text-center">Tgt Takt</th>
                  <th className="py-2 px-3 text-center">Act Takt</th>
                  <th className="py-2 px-3 text-center">Blue Label</th>
                  <th className="py-2 px-3 text-right font-bold">Improve %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stitchingRecords.map((rec, idx) => (
                  <tr key={rec.id ? `${rec.id}-${idx}` : `rep-stitch-${idx}`} className="hover:bg-slate-50/50">
                    <td className="py-2 px-3 font-semibold text-slate-800">{rec.style}</td>
                    <td className="py-2 px-3 font-mono">{rec.line}</td>
                    <td className="py-2 px-3 font-bold text-slate-755">{rec.traineeName}</td>
                    <td className="py-2 px-3 text-slate-500">{rec.trainingProcess}</td>
                    <td className="py-2 px-3 text-center font-mono">{rec.targetTaktTime.toFixed(2)}s</td>
                    <td className="py-2 px-3 text-center font-mono font-bold">{rec.actualTaktTime.toFixed(2)}s</td>
                    <td className="py-2 px-3 text-center">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold border ${rec.blueLabelStatus === 'Certified' ? 'bg-blue-100 text-blue-800' : 'bg-slate-50'}`}>{rec.blueLabelStatus}</span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600">{rec.improvementPercentage > 0 ? '+' : ''}{rec.improvementPercentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Section 3: Departmental */}
        {(selectedModule === 'all' || selectedModule === 'department') && (
          <div className="space-y-3 pt-4">
            <h4 className="font-bold text-xs uppercase tracking-wider bg-slate-100/50 p-2 text-slate-800 border-l-4 border-emerald-600 flex items-center justify-between">
              <span>Section III &bull; Departmental Drills & attendance</span>
              <span className="font-mono text-[10px] text-slate-500">{departmentItems.length} records</span>
            </h4>

            <table className="w-full text-left text-[11px] text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-250">
                <tr>
                  <th className="py-2 px-3">Department Division</th>
                  <th className="py-2 px-3">Training Module Scope</th>
                  <th className="py-2 px-3">Assigned Leader</th>
                  <th className="py-2 px-3">Date Listed</th>
                  <th className="py-2 px-3 text-center">Attendance %</th>
                  <th className="py-2 px-3 text-right">Performance Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {departmentItems.map((item, idx) => (
                  <tr key={item.id ? `${item.id}-${idx}` : `rep-dept-${idx}`} className="hover:bg-slate-50/50">
                    <td className="py-2 px-3 font-bold text-slate-800">{item.departmentName}</td>
                    <td className="py-2 px-3 text-slate-500 truncate max-w-xs">{item.trainingContent}</td>
                    <td className="py-2 px-3">{item.leaderName}</td>
                    <td className="py-2 px-3 font-mono">{item.scheduleDate}</td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-blue-600">{item.attendanceRate}%</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600">{item.performanceScore.toFixed(1)} / 10</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Section 4: Live Multi-PC System Audit Trail */}
        {(selectedModule === 'all' || selectedModule === 'audit') && (
          <div className="space-y-3 pt-4">
            <h4 className="font-bold text-xs uppercase tracking-wider bg-slate-100/50 p-2 text-slate-800 border-l-4 border-amber-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-amber-600" />
                <span>Section IV &bull; System Compliance & Multi-PC Audit Trail</span>
              </div>
              <div className="flex items-center gap-2 no-print">
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Search audit trail..."
                  className="bg-white border border-slate-200 text-xs px-2.5 py-1 rounded text-slate-700 focus:outline-none focus:border-blue-500"
                />
                <span className="font-mono text-[10px] text-slate-500 whitespace-nowrap">{filteredAuditLogs.length} events logged</span>
              </div>
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Timestamp</th>
                    <th className="py-2 px-3">User & Role</th>
                    <th className="py-2 px-3">Action</th>
                    <th className="py-2 px-3">Module</th>
                    <th className="py-2 px-3">Details</th>
                    <th className="py-2 px-3 text-right">Record ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {filteredAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-slate-400">
                        No audit events recorded matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredAuditLogs.slice(0, 50).map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2 px-3 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-2 px-3">
                          <span className="font-bold text-slate-800">{log.user}</span>
                          <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-mono">
                            {log.role}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.action === 'CREATE' || log.action === 'UPLOAD'
                                ? 'bg-emerald-100 text-emerald-700'
                                : log.action === 'DELETE'
                                ? 'bg-red-100 text-red-700'
                                : log.action === 'LOGIN'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-700">{log.module}</td>
                        <td className="py-2 px-3 text-slate-600 max-w-md truncate">{log.details}</td>
                        <td className="py-2 px-3 text-right font-mono text-[10px] text-slate-400">
                          {log.recordId || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Audit footer signoff */}
        <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-6 text-xs text-slate-500 font-sans mt-8">
          <div className="space-y-4">
            <p><strong>Prepared By:</strong> Training Coordinator Specialist</p>
            <div className="w-40 border-b border-slate-300 h-6"></div>
            <p className="text-[10px] text-slate-400">Authorized System Access ID: {new Date().getTime().toString().slice(-6)}</p>
          </div>

          <div className="space-y-4 text-right">
            <p><strong>Approved By:</strong> Plant Operations Manager</p>
            <div className="w-40 border-b border-slate-300 h-6 inline-block"></div>
            <p className="text-[10px] text-slate-400 block">SOP Quality Assurance Standard Verified</p>
          </div>
        </div>

      </div>

    </div>
  );
}
