/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Edit2, 
  ArrowUp, 
  ArrowDown, 
  Check, 
  Settings2,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { DepartmentCustomField, CustomFieldType, DepartmentFolder } from '../../types';

interface CustomFieldsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customFields: DepartmentCustomField[];
  onSaveCustomFields: (fields: DepartmentCustomField[]) => void;
  currentDepartment?: DepartmentFolder | null;
  departments: DepartmentFolder[];
}

const FIELD_TYPES: { type: CustomFieldType; label: string; description: string }[] = [
  { type: 'Text', label: 'Single-line Text', description: 'Brief text entry (e.g. Assessment Code, Lead Evaluator)' },
  { type: 'Number', label: 'Numeric Value', description: 'Raw numbers or scores (e.g. 95)' },
  { type: 'Date', label: 'Date Picker', description: 'Calendar date (e.g. Re-audit Due Date)' },
  { type: 'Time', label: 'Time Picker', description: 'Clock time (e.g. 10:30 AM)' },
  { type: 'Dropdown', label: 'Dropdown Selection', description: 'Single choice from custom options (e.g. Excellent, Good, Fair)' },
  { type: 'Checkbox', label: 'Yes/No Checkbox', description: 'Boolean status (e.g. Supervisor Sign-off Received)' },
  { type: 'Long Text', label: 'Paragraph / Notes', description: 'Multi-line detailed text entry (e.g. Follow-up plan)' },
  { type: 'Percentage', label: 'Percentage (%)', description: 'Numerical percentage from 0 to 100%' },
];

export const CustomFieldsManagerModal: React.FC<CustomFieldsManagerModalProps> = ({
  isOpen,
  onClose,
  customFields,
  onSaveCustomFields,
  currentDepartment,
  departments,
}) => {
  const [fields, setFields] = useState<DepartmentCustomField[]>(customFields);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  
  // Form state for new or editing field
  const [name, setName] = useState('');
  const [type, setType] = useState<CustomFieldType>('Text');
  const [scope, setScope] = useState<'all' | string>('all');
  const [required, setRequired] = useState(false);
  const [placeholder, setPlaceholder] = useState('');
  const [dropdownOptions, setDropdownOptions] = useState('Excellent, Good, Fair, Needs Improvement');

  if (!isOpen) return null;

  const resetForm = () => {
    setName('');
    setType('Text');
    setScope(currentDepartment ? currentDepartment.id : 'all');
    setRequired(false);
    setPlaceholder('');
    setDropdownOptions('Option 1, Option 2, Option 3');
    setEditingFieldId(null);
  };

  const handleStartEdit = (f: DepartmentCustomField) => {
    setEditingFieldId(f.id);
    setName(f.name);
    setType(f.type);
    setScope(f.scope);
    setRequired(!!f.required);
    setPlaceholder(f.placeholder || '');
    setDropdownOptions(f.options ? f.options.join(', ') : '');
  };

  const handleSaveField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const parsedOptions = type === 'Dropdown' 
      ? dropdownOptions.split(',').map(s => s.trim()).filter(Boolean)
      : undefined;

    if (editingFieldId) {
      // Update existing
      const updated = fields.map(f => {
        if (f.id === editingFieldId) {
          return {
            ...f,
            name: name.trim(),
            type,
            scope,
            required,
            placeholder: placeholder.trim() || undefined,
            options: parsedOptions,
          };
        }
        return f;
      });
      setFields(updated);
      onSaveCustomFields(updated);
    } else {
      // Add new
      const newField: DepartmentCustomField = {
        id: `cf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: name.trim(),
        type,
        scope,
        required,
        order: fields.length + 1,
        placeholder: placeholder.trim() || undefined,
        options: parsedOptions,
      };
      const updated = [...fields, newField];
      setFields(updated);
      onSaveCustomFields(updated);
    }
    resetForm();
  };

  const handleDeleteField = (id: string) => {
    if (window.confirm('Delete this custom field? Existing values stored under this field will remain in database records.')) {
      const updated = fields.filter(f => f.id !== id);
      setFields(updated);
      onSaveCustomFields(updated);
      if (editingFieldId === id) resetForm();
    }
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= fields.length) return;

    const newArr = [...fields];
    const temp = newArr[index];
    newArr[index] = newArr[targetIdx];
    newArr[targetIdx] = temp;

    // re-assign orders
    const reordered = newArr.map((f, i) => ({ ...f, order: i + 1 }));
    setFields(reordered);
    onSaveCustomFields(reordered);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div 
        id="custom-fields-manager-modal"
        className="w-full max-w-4xl bg-[#09152a] border border-blue-900/60 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-blue-900/40 bg-[#071120] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Settings2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Custom Fields Configuration
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-300 font-mono">
                  {fields.length} Active Fields
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Define specialized attributes for training records across departments or tailored to specific teams.
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

        {/* Content Body: Left List, Right Form */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Existing Fields List */}
          <div className="lg:col-span-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Configured Custom Fields
              </h3>
              <span className="text-[11px] text-slate-400">Drag or use arrows to reorder</span>
            </div>

            {fields.length === 0 ? (
              <div className="p-8 rounded-xl border border-dashed border-slate-800 text-center bg-[#071326]/50">
                <Sparkles className="w-8 h-8 text-blue-400 mx-auto mb-2 opacity-60" />
                <p className="text-sm font-semibold text-slate-300">No Custom Fields Defined</p>
                <p className="text-xs text-slate-400 mt-1">
                  Create custom attributes on the right (e.g. Training Effectiveness, Exam Pass Rate, Signatures).
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {fields.map((f, idx) => {
                  const isCurrentScope = f.scope === 'all' || (currentDepartment && f.scope === currentDepartment.id);
                  const scopeName = f.scope === 'all' 
                    ? 'All Departments' 
                    : departments.find(d => d.id === f.scope)?.name || 'Specific Dept';

                  return (
                    <div
                      key={f.id}
                      className={`p-3 rounded-xl border transition flex items-center justify-between gap-3 ${
                        editingFieldId === f.id
                          ? 'bg-blue-950/60 border-blue-500 shadow-md'
                          : 'bg-[#0b1b36] border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white truncate">{f.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-blue-300 font-mono">
                            {f.type}
                          </span>
                          {f.required && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-950/60 text-red-300 font-bold">
                              Required
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                          <span>Scope: {scopeName}</span>
                          {f.options && f.options.length > 0 && (
                            <span className="truncate">({f.options.length} options)</span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleMove(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                          title="Move Up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMove(idx, 'down')}
                          disabled={idx === fields.length - 1}
                          className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                          title="Move Down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleStartEdit(f)}
                          className="p-1 rounded bg-slate-800 text-blue-400 hover:text-blue-300 cursor-pointer"
                          title="Edit Field"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteField(f.id)}
                          className="p-1 rounded bg-slate-800 text-red-400 hover:text-red-300 cursor-pointer"
                          title="Delete Field"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Add / Edit Form */}
          <div className="lg:col-span-6 bg-[#071326] p-5 rounded-xl border border-blue-900/30">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-4 flex items-center gap-2">
              {editingFieldId ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {editingFieldId ? 'Edit Custom Field' : 'Create New Custom Field'}
            </h3>

            <form onSubmit={handleSaveField} className="space-y-4">
              {/* Field Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Field Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Training Evaluation Score, Effectiveness, Sign-off"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Field Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Field Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as CustomFieldType)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
                >
                  {FIELD_TYPES.map(ft => (
                    <option key={ft.type} value={ft.type}>
                      {ft.label} ({ft.type})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  {FIELD_TYPES.find(ft => ft.type === type)?.description}
                </p>
              </div>

              {/* If Dropdown, options editor */}
              {type === 'Dropdown' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Dropdown Options (comma-separated)
                  </label>
                  <textarea
                    rows={2}
                    value={dropdownOptions}
                    onChange={(e) => setDropdownOptions(e.target.value)}
                    placeholder="Excellent, Good, Fair, Needs Improvement"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Separate multiple choices with commas.
                  </p>
                </div>
              )}

              {/* Scope: All Departments or specific */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Applicability Scope
                </label>
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
                >
                  <option value="all">Global (All Departments)</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} {d.code ? `(${d.code})` : ''} only
                    </option>
                  ))}
                </select>
              </div>

              {/* Placeholder text (optional) */}
              {type !== 'Checkbox' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Input Hint / Placeholder (optional)
                  </label>
                  <input
                    type="text"
                    value={placeholder}
                    onChange={(e) => setPlaceholder(e.target.value)}
                    placeholder="e.g. Enter numerical score between 0-100"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              {/* Checkbox: Required */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="field-required"
                  checked={required}
                  onChange={(e) => setRequired(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="field-required" className="text-xs text-slate-300 cursor-pointer">
                  Mandatory (Record cannot be saved without filling this field)
                </label>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
                <button
                  type="submit"
                  className="flex-1 py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  {editingFieldId ? 'Update Field' : 'Add Custom Field'}
                </button>
                {editingFieldId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-blue-900/40 bg-[#071120] flex items-center justify-between text-xs text-slate-400">
          <span>Changes are saved automatically to master database.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium cursor-pointer transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
export default CustomFieldsManagerModal;
