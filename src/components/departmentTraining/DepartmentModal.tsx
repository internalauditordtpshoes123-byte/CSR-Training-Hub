/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  X, 
  FolderPlus, 
  Check, 
  Trash2, 
  Building2, 
  Users, 
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
  ShieldCheck,
  Package,
  HardHat,
  Sparkles
} from 'lucide-react';
import { DepartmentFolder } from '../../types';

interface DepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  departmentToEdit?: DepartmentFolder | null;
  onSaveDepartment: (dept: Partial<DepartmentFolder>) => void;
  onDeleteDepartment?: (id: string) => void;
  recordCount?: number;
}

const ICONS = [
  { id: 'Building2', name: 'Building', component: Building2 },
  { id: 'ShieldCheck', name: 'Shield', component: ShieldCheck },
  { id: 'Users', name: 'Team', component: Users },
  { id: 'Scissors', name: 'Sewing / Stitching', component: Scissors },
  { id: 'Layers', name: 'Rubber / Layers', component: Layers },
  { id: 'Wrench', name: 'Assembly / Tools', component: Wrench },
  { id: 'Factory', name: 'Production Plant', component: Factory },
  { id: 'HardHat', name: 'Safety / Operations', component: HardHat },
  { id: 'Cog', name: 'Engineering', component: Cog },
  { id: 'CheckCircle2', name: 'Quality QA', component: CheckCircle2 },
  { id: 'Leaf', name: 'EMS / Eco', component: Leaf },
  { id: 'Cpu', name: 'IT / Tech', component: Cpu },
  { id: 'BadgeDollarSign', name: 'Finance / Cost', component: BadgeDollarSign },
  { id: 'Crown', name: 'Admin / Executive', component: Crown },
  { id: 'Package', name: 'Warehouse / GA', component: Package },
];

const COLORS = [
  { label: 'Blue', value: '#3b82f6', border: 'border-blue-500', bg: 'bg-blue-600' },
  { label: 'Sky', value: '#0ea5e9', border: 'border-sky-500', bg: 'bg-sky-600' },
  { label: 'Emerald', value: '#10b981', border: 'border-emerald-500', bg: 'bg-emerald-600' },
  { label: 'Amber', value: '#f59e0b', border: 'border-amber-500', bg: 'bg-amber-600' },
  { label: 'Cyan', value: '#06b6d4', border: 'border-cyan-500', bg: 'bg-cyan-600' },
  { label: 'Violet', value: '#8b5cf6', border: 'border-violet-500', bg: 'bg-violet-600' },
  { label: 'Teal', value: '#14b8a6', border: 'border-teal-500', bg: 'bg-teal-600' },
  { label: 'Orange', value: '#f97316', border: 'border-orange-500', bg: 'bg-orange-600' },
  { label: 'Rose', value: '#f43f5e', border: 'border-rose-500', bg: 'bg-rose-600' },
  { label: 'Green', value: '#22c55e', border: 'border-green-500', bg: 'bg-green-600' },
  { label: 'Indigo', value: '#6366f1', border: 'border-indigo-500', bg: 'bg-indigo-600' },
  { label: 'Fuchsia', value: '#d946ef', border: 'border-fuchsia-500', bg: 'bg-fuchsia-600' },
];

export const DepartmentModal: React.FC<DepartmentModalProps> = ({
  isOpen,
  onClose,
  departmentToEdit,
  onSaveDepartment,
  onDeleteDepartment,
  recordCount = 0,
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('Building2');
  const [color, setColor] = useState('#3b82f6');

  useEffect(() => {
    if (departmentToEdit) {
      setName(departmentToEdit.name || '');
      setCode(departmentToEdit.code || '');
      setDescription(departmentToEdit.description || '');
      setIcon(departmentToEdit.icon || 'Building2');
      setColor(departmentToEdit.color || '#3b82f6');
    } else {
      setName('');
      setCode('');
      setDescription('');
      setIcon('Building2');
      setColor('#3b82f6');
    }
  }, [departmentToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSaveDepartment({
      ...(departmentToEdit ? { id: departmentToEdit.id } : {}),
      name: name.trim(),
      code: code.trim().toUpperCase() || undefined,
      description: description.trim() || undefined,
      icon,
      color,
    });
    onClose();
  };

  const SelectedIconComponent = ICONS.find(i => i.id === icon)?.component || Building2;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div 
        id="department-modal"
        className="w-full max-w-lg bg-[#09152a] border border-blue-900/60 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-blue-900/40 bg-[#071120] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-inner"
              style={{ backgroundColor: `${color}25`, color }}
            >
              <SelectedIconComponent className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {departmentToEdit ? 'Edit Department Folder' : 'Add New Department Folder'}
              </h2>
              <p className="text-xs text-slate-400">
                {departmentToEdit ? 'Update department details and theme styling.' : 'Create a dedicated training documentation folder for a factory team.'}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Department Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Department Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                // Auto generate a short code if creating new
                if (!departmentToEdit && !code) {
                  setCode(e.target.value.substring(0, 5).toUpperCase().replace(/[^A-Z]/g, ''));
                }
              }}
              placeholder="e.g. Stitching, Rubber, Quality Assurance, Logistics"
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Department Code */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Department Code / Abbreviation (optional)
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. STITCH, RUB, QA, EMS"
              maxLength={10}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-mono uppercase focus:outline-none focus:border-blue-500"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Used as a prefix for record IDs (e.g. DTR-STITCH-2026-0001).
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Description / Scope of Operations (optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Sewing line assembly, needle safety protocols, operator certifications..."
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Icon Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Folder Icon
            </label>
            <div className="grid grid-cols-5 gap-2 max-h-36 overflow-y-auto p-1 bg-slate-900/50 rounded-xl border border-slate-800">
              {ICONS.map(i => {
                const IconComp = i.component;
                const isSelected = icon === i.id;
                return (
                  <button
                    key={i.id}
                    type="button"
                    onClick={() => setIcon(i.id)}
                    className={`p-2 rounded-lg flex flex-col items-center gap-1 transition cursor-pointer ${
                      isSelected 
                        ? 'bg-blue-600 text-white shadow-md' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                    title={i.name}
                  >
                    <IconComp className="w-5 h-5" />
                    <span className="text-[9px] truncate max-w-[50px] leading-tight">{i.name.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Palette */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Folder Accent Color
            </label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-7 h-7 rounded-full transition transform cursor-pointer flex items-center justify-center ${
                    color === c.value 
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110 shadow-lg' 
                      : 'hover:scale-105 opacity-80'
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                >
                  {color === c.value && <Check className="w-3.5 h-3.5 text-white drop-shadow" />}
                </button>
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            {departmentToEdit && onDeleteDepartment ? (
              <button
                type="button"
                onClick={() => {
                  const msg = recordCount > 0
                    ? `Warning: This department has ${recordCount} training record(s). Deleting the folder will also remove its associated records. Are you sure you want to proceed?`
                    : 'Are you sure you want to delete this department folder?';
                  if (window.confirm(msg)) {
                    onDeleteDepartment(departmentToEdit.id);
                    onClose();
                  }
                }}
                className="px-3 py-2 rounded-xl bg-red-950/40 hover:bg-red-900 border border-red-800/40 text-red-300 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Folder
              </button>
            ) : <div />}

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
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition cursor-pointer"
              >
                <Check className="w-4 h-4" />
                {departmentToEdit ? 'Save Changes' : 'Create Department'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
export default DepartmentModal;
