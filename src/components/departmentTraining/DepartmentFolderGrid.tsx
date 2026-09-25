/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Folder, 
  FolderPlus, 
  Search, 
  Plus, 
  Building2, 
  Users, 
  Clock, 
  Image as ImageIcon, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  Sparkles, 
  ArrowRight,
  ShieldCheck,
  Scissors,
  Layers,
  Wrench,
  Factory,
  Cog,
  CheckCircle2,
  Leaf,
  Cpu,
  BadgeDollarSign,
  Crown,
  Package,
  HardHat,
  Settings2,
  FileSpreadsheet,
  BarChart3,
  Calendar,
  RotateCcw,
  AlertCircle
} from 'lucide-react';
import { DepartmentFolder, DepartmentTrainingRecord, DepartmentCustomField } from '../../types';

interface DepartmentFolderGridProps {
  departments: DepartmentFolder[];
  records: DepartmentTrainingRecord[];
  onSelectDepartment: (deptId: string) => void;
  onAddDepartment: () => void;
  onEditDepartment: (dept: DepartmentFolder) => void;
  onDeleteDepartment: (deptId: string) => void;
  onAddRecordForDept: (deptId: string) => void;
  onOpenCustomFieldsModal: () => void;
  onSwitchToDashboard: () => void;
  onSwitchToExcel: () => void;
  onRestoreExactData?: () => void;
  canEdit?: boolean;
}

// Icon helper
const getIconComponent = (iconName?: string) => {
  switch (iconName) {
    case 'ShieldCheck': return ShieldCheck;
    case 'Users': return Users;
    case 'Scissors': return Scissors;
    case 'Layers': return Layers;
    case 'Wrench': return Wrench;
    case 'Factory': return Factory;
    case 'Cog': return Cog;
    case 'CheckCircle2': return CheckCircle2;
    case 'Leaf': return Leaf;
    case 'Cpu': return Cpu;
    case 'BadgeDollarSign': return BadgeDollarSign;
    case 'Crown': return Crown;
    case 'Package': return Package;
    case 'HardHat': return HardHat;
    default: return Building2;
  }
};

export const DepartmentFolderGrid: React.FC<DepartmentFolderGridProps> = ({
  departments,
  records,
  onSelectDepartment,
  onAddDepartment,
  onEditDepartment,
  onDeleteDepartment,
  onAddRecordForDept,
  onOpenCustomFieldsModal,
  onSwitchToDashboard,
  onSwitchToExcel,
  onRestoreExactData,
  canEdit = true,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'records' | 'trainees' | 'recent'>('name');

  // Calculate metrics per department
  const deptStatsMap = useMemo(() => {
    const map: Record<string, { recordCount: number; traineesCount: number; hoursCount: number; photosCount: number; lastDate: string }> = {};

    departments.forEach(d => {
      map[d.id] = { recordCount: 0, traineesCount: 0, hoursCount: 0, photosCount: 0, lastDate: '' };
    });

    records.forEach(r => {
      if (!map[r.departmentId]) {
        map[r.departmentId] = { recordCount: 0, traineesCount: 0, hoursCount: 0, photosCount: 0, lastDate: '' };
      }
      map[r.departmentId].recordCount += 1;
      map[r.departmentId].traineesCount += Number(r.traineesCount) || 0;
      map[r.departmentId].hoursCount += Number(r.totalHours) || 0;
      if (r.photos) {
        map[r.departmentId].photosCount += r.photos.length;
      }
      if (r.date && (!map[r.departmentId].lastDate || r.date > map[r.departmentId].lastDate)) {
        map[r.departmentId].lastDate = r.date;
      }
    });

    return map;
  }, [departments, records]);

  // Filter & sort departments
  const filteredDepartments = useMemo(() => {
    return departments.filter(d => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        d.name.toLowerCase().includes(q) ||
        (d.code && d.code.toLowerCase().includes(q)) ||
        (d.description && d.description.toLowerCase().includes(q))
      );
    }).sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'records') {
        return (deptStatsMap[b.id]?.recordCount || 0) - (deptStatsMap[a.id]?.recordCount || 0);
      }
      if (sortBy === 'trainees') {
        return (deptStatsMap[b.id]?.traineesCount || 0) - (deptStatsMap[a.id]?.traineesCount || 0);
      }
      if (sortBy === 'recent') {
        const da = deptStatsMap[a.id]?.lastDate || '';
        const db = deptStatsMap[b.id]?.lastDate || '';
        return db.localeCompare(da);
      }
      return 0;
    });
  }, [departments, searchQuery, sortBy, deptStatsMap]);

  return (
    <div id="department-folder-grid" className="space-y-6 animate-fadeIn">
      {/* Top Banner with Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-[#09162e] border border-blue-900/40 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-widest text-blue-400 font-mono">
              DATIAN CSR HUB • DIGITAL FILING SYSTEM
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Folder className="w-6 h-6 text-blue-500 fill-blue-500/20" />
            Department Training Folders
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Access organized training documentation, attendee rosters, and photo proof for each factory department.
          </p>
        </div>

        {/* View mode switcher & primary actions */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Dashboard switch */}
          <button
            onClick={onSwitchToDashboard}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow"
            title="View Overall Training Analytics"
          >
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Analytics</span>
          </button>

          {/* Legacy Excel switch (for 100% backward compatibility) */}
          <button
            onClick={onSwitchToExcel}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow"
            title="Open Master Spreadsheet View"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Spreadsheet</span>
          </button>

          {/* Custom Fields configuration */}
          <button
            onClick={onOpenCustomFieldsModal}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow"
            title="Configure Custom Fields"
          >
            <Settings2 className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Custom Fields</span>
          </button>

          {/* Restore Exact Data Button */}
          {onRestoreExactData && (
            <button
              onClick={() => {
                if (window.confirm('Restore all official factory Department Training exact records (13 department folders, 7 complete training records, and custom evaluation metrics)?')) {
                  onRestoreExactData();
                }
              }}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-emerald-950/80 border border-slate-700 hover:border-emerald-600/60 text-slate-300 hover:text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow"
              title="Restore all official factory Department Training exact data"
            >
              <RotateCcw className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Restore Exact Data</span>
            </button>
          )}

          {/* Add Department */}
          {canEdit && (
            <button
              onClick={onAddDepartment}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg transition flex items-center gap-1.5 cursor-pointer"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Add Department</span>
            </button>
          )}
        </div>
      </div>

      {/* Warning banner if records are 0 */}
      {records.length === 0 && onRestoreExactData && (
        <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg animate-fadeIn">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-amber-300">No Department Training Records Loaded:</span> Click to populate all factory exact department training records and folders.
            </div>
          </div>
          <button
            onClick={onRestoreExactData}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs cursor-pointer flex items-center gap-1.5 shadow transition shrink-0"
          >
            <RotateCcw className="w-4 h-4 text-black" />
            <span>Restore Exact Department Data</span>
          </button>
        </div>
      )}

      {/* Search & Sort Filters Bar */}
      <div className="p-4 rounded-2xl bg-[#09152a] border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search departments by name, code (e.g. Stitching, CSR, RUB)..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500 placeholder-slate-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs text-slate-400 whitespace-nowrap">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-xs focus:outline-none focus:border-blue-500"
          >
            <option value="name">Name (A – Z)</option>
            <option value="records">Most Training Records</option>
            <option value="trainees">Most Trainees Trained</option>
            <option value="recent">Recently Active</option>
          </select>
        </div>
      </div>

      {/* Grid of Department Folders (Section 1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredDepartments.map((dept) => {
          const stats = deptStatsMap[dept.id] || { recordCount: 0, traineesCount: 0, hoursCount: 0, photosCount: 0, lastDate: '' };
          const IconComp = getIconComponent(dept.icon);
          const color = dept.color || '#3b82f6';

          return (
            <div
              key={dept.id}
              onClick={() => onSelectDepartment(dept.id)}
              className="group relative bg-[#09152a] hover:bg-[#0c1c38] border border-slate-800 hover:border-blue-500/60 rounded-2xl p-5 transition-all duration-200 cursor-pointer shadow-lg hover:shadow-2xl flex flex-col justify-between"
            >
              <div>
                {/* Folder Top Tab & Icon */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    {/* Folder Icon with Department Theme */}
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 shadow-inner"
                      style={{ 
                        backgroundColor: `${color}20`,
                        color: color,
                        border: `1px solid ${color}40`
                      }}
                    >
                      <IconComp className="w-6 h-6" />
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-base font-bold text-white group-hover:text-blue-300 transition">
                          {dept.name}
                        </h3>
                      </div>
                      {dept.code && (
                        <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-slate-900 text-slate-300 border border-slate-800">
                          {dept.code}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Menu options for edit/delete */}
                  {canEdit && (
                    <div 
                      className="opacity-0 group-hover:opacity-100 transition flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => onEditDepartment(dept)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                        title="Edit Department"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Description */}
                <p className="text-xs text-slate-400 line-clamp-2 min-h-[32px] mb-4">
                  {dept.description || 'Dedicated department training folder.'}
                </p>

                {/* Department Stats Bar */}
                <div className="grid grid-cols-3 gap-2 py-2.5 px-3 rounded-xl bg-[#06101f] border border-slate-800/80 text-center mb-4">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Records</span>
                    <span className="text-xs font-bold text-white font-mono">{stats.recordCount}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Trainees</span>
                    <span className="text-xs font-bold text-emerald-400 font-mono">{stats.traineesCount}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Hours</span>
                    <span className="text-xs font-bold text-amber-300 font-mono">{Number(stats.hoursCount.toFixed(1))}h</span>
                  </div>
                </div>
              </div>

              {/* Bottom Card Footer with Quick Open */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                  <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                  <span>{stats.photosCount} Photos</span>
                </div>

                <div className="flex items-center gap-1 text-blue-400 group-hover:text-blue-300 font-semibold group-hover:translate-x-0.5 transition-transform">
                  <span>Open Folder</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          );
        })}

        {/* Add Department Card at end of grid */}
        {canEdit && (
          <div
            onClick={onAddDepartment}
            className="border-2 border-dashed border-slate-800 hover:border-blue-500/50 bg-[#09152a]/40 hover:bg-[#0c1c38]/40 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition min-h-[220px] group"
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-950/40 border border-blue-800/40 group-hover:border-blue-500 text-blue-400 flex items-center justify-center mb-3 transition group-hover:scale-110">
              <Plus className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-300 group-hover:text-white">
              Create New Department
            </h4>
            <p className="text-xs text-slate-500 mt-1 max-w-[200px]">
              Add a specialized folder for any factory division or line.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
export default DepartmentFolderGrid;
