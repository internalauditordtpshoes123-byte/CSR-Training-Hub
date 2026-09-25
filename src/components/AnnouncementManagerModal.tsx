/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Megaphone, Plus, Edit2, Trash2, Calendar, Clock, AlertCircle, 
  CheckCircle2, X, Filter, Search, Tag, Building2, Eye, ShieldAlert,
  ArrowUpDown, Sparkles
} from 'lucide-react';
import { Announcement } from '../types';

interface AnnouncementManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  announcements: Announcement[];
  onSaveAnnouncement: (item: Announcement) => void;
  onDeleteAnnouncement: (id: string) => void;
}

export default function AnnouncementManagerModal({
  isOpen,
  onClose,
  announcements,
  onSaveAnnouncement,
  onDeleteAnnouncement,
}: AnnouncementManagerModalProps) {
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Editor State
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [formData, setFormData] = useState<Partial<Announcement>>({
    title: '',
    content: '',
    category: 'Leadership',
    priority: 'Normal',
    scheduledDate: new Date().toISOString().split('T')[0],
    scheduledTime: '09:00 AM',
    endDate: '',
    status: 'Active',
    targetDepartment: 'All Departments',
  });

  if (!isOpen) return null;

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      title: '',
      content: '',
      category: 'Leadership',
      priority: 'Normal',
      scheduledDate: new Date().toISOString().split('T')[0],
      scheduledTime: '09:00 AM',
      endDate: '',
      status: 'Active',
      targetDepartment: 'All Departments',
    });
    setIsEditing(true);
  };

  const handleOpenEdit = (item: Announcement) => {
    setEditingId(item.id);
    setFormData({
      ...item
    });
    setIsEditing(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim()) return;

    // Auto-detect status if scheduled in the future
    let autoStatus = formData.status || 'Active';
    if (formData.scheduledDate) {
      const today = new Date().toISOString().split('T')[0];
      if (formData.scheduledDate > today && autoStatus !== 'Archived') {
        autoStatus = 'Scheduled';
      }
    }

    const payload: Announcement = {
      id: editingId || `ann_${Date.now()}`,
      title: formData.title.trim(),
      content: formData.content?.trim() || '',
      category: (formData.category as any) || 'General',
      priority: (formData.priority as any) || 'Normal',
      scheduledDate: formData.scheduledDate || new Date().toISOString().split('T')[0],
      scheduledTime: formData.scheduledTime || '09:00 AM',
      endDate: formData.endDate || undefined,
      status: autoStatus,
      targetDepartment: formData.targetDepartment || 'All Departments',
      author: formData.author || 'Corporate Admin',
      createdAt: formData.createdAt || new Date().toISOString(),
    };

    onSaveAnnouncement(payload);
    setIsEditing(false);
    setEditingId(null);
  };

  // Filtering
  const filteredAnnouncements = announcements.filter(item => {
    const matchesCat = filterCategory === 'All' || item.category === filterCategory;
    const matchesStatus = filterStatus === 'All' || item.status === filterStatus;
    const matchesSearch = 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.content && item.content.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.targetDepartment && item.targetDepartment.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesStatus && matchesSearch;
  });

  const getPriorityBadge = (p: Announcement['priority']) => {
    switch (p) {
      case 'Urgent':
        return 'bg-red-500/10 border-red-500/30 text-red-400';
      case 'High':
        return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
      case 'Low':
        return 'bg-slate-500/10 border-slate-500/30 text-slate-400';
      default:
        return 'bg-blue-500/10 border-blue-500/30 text-blue-400';
    }
  };

  const getStatusBadge = (s: Announcement['status']) => {
    switch (s) {
      case 'Active':
        return 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400';
      case 'Scheduled':
        return 'bg-amber-950/60 border-amber-500/40 text-amber-400';
      case 'Completed':
        return 'bg-blue-950/60 border-blue-500/40 text-blue-400';
      default:
        return 'bg-slate-900 border-slate-700 text-slate-400';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-[#091429] border border-[#162d59] rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#122347] flex items-center justify-between bg-[#060e1d]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[#f59e0b]">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <span>Corporate Announcements & Schedule</span>
                <span className="text-xs font-normal text-slate-400">({announcements.length} Total)</span>
              </h2>
              <p className="text-xs text-slate-400">Create, edit, schedule, and broadcast company notices</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                onClick={handleOpenAdd}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f59e0b] hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl cursor-pointer transition-all shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ New Announcement</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-[#122347] cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* ================= EDIT / ADD FORM DRAWER ================= */}
          {isEditing ? (
            <form onSubmit={handleSave} className="p-5 rounded-2xl bg-[#0c1b38] border border-[#1d386f] space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between pb-3 border-b border-[#162d59]">
                <div className="flex items-center gap-2 text-sm font-bold text-amber-400 font-mono">
                  {editingId ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  <span>{editingId ? 'Edit Announcement' : 'Schedule New Announcement'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => { setIsEditing(false); setEditingId(null); }}
                  className="text-xs text-slate-400 hover:text-white font-medium"
                >
                  Cancel
                </button>
              </div>

              {/* Title Field */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 font-mono uppercase">
                  Announcement Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title || ''}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Mandatory Leadership & Compliance Training Session"
                  className="w-full px-3.5 py-2.5 bg-[#060e1d] border border-[#162d59] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Message Content */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 font-mono uppercase">
                  Announcement Details / Description
                </label>
                <textarea
                  rows={3}
                  value={formData.content || ''}
                  onChange={e => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Provide meeting room details, required materials, or action items for employees..."
                  className="w-full px-3.5 py-2 bg-[#060e1d] border border-[#162d59] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Grid Form Fields: Category, Priority, Department */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                
                {/* Category */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1 font-mono">Category</label>
                  <select
                    value={formData.category || 'Leadership'}
                    onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-3 py-2 bg-[#060e1d] border border-[#162d59] rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="Leadership">Leadership</option>
                    <option value="Compliance">Compliance</option>
                    <option value="Operations">Operations</option>
                    <option value="Safety">Safety</option>
                    <option value="Documents">Documents</option>
                    <option value="General">General</option>
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1 font-mono">Priority Level</label>
                  <select
                    value={formData.priority || 'Normal'}
                    onChange={e => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full px-3 py-2 bg-[#060e1d] border border-[#162d59] rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                {/* Target Department */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1 font-mono">Target Department</label>
                  <select
                    value={formData.targetDepartment || 'All Departments'}
                    onChange={e => setFormData({ ...formData, targetDepartment: e.target.value })}
                    className="w-full px-3 py-2 bg-[#060e1d] border border-[#162d59] rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="All Departments">All Departments</option>
                    <option value="Stitching Line A1">Stitching Line A1</option>
                    <option value="Stitching Line B2">Stitching Line B2</option>
                    <option value="Cutting Division">Cutting Division</option>
                    <option value="Assembly & Lasting">Assembly & Lasting</option>
                    <option value="Quality Assurance">Quality Assurance</option>
                    <option value="Administration">Administration</option>
                  </select>
                </div>

              </div>

              {/* Schedule Fields: Date, Time, Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-[#060e1d] border border-[#16274a]">
                
                {/* Scheduled Date */}
                <div>
                  <label className="block text-[11px] font-bold text-amber-400 mb-1 font-mono flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Scheduled Date</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.scheduledDate || ''}
                    onChange={e => setFormData({ ...formData, scheduledDate: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#09152b] border border-[#162d59] rounded-lg text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                {/* Scheduled Time */}
                <div>
                  <label className="block text-[11px] font-bold text-amber-400 mb-1 font-mono flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Scheduled Time</span>
                  </label>
                  <input
                    type="text"
                    value={formData.scheduledTime || '09:00 AM'}
                    onChange={e => setFormData({ ...formData, scheduledTime: e.target.value })}
                    placeholder="e.g. 09:00 AM"
                    className="w-full px-3 py-1.5 bg-[#09152b] border border-[#162d59] rounded-lg text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                {/* Status Toggle */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1 font-mono">Status</label>
                  <select
                    value={formData.status || 'Active'}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-1.5 bg-[#09152b] border border-[#162d59] rounded-lg text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                  >
                    <option value="Active">Active (Live Now)</option>
                    <option value="Scheduled">Scheduled (Upcoming)</option>
                    <option value="Completed">Completed</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>

              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsEditing(false); setEditingId(null); }}
                  className="px-4 py-2 bg-[#122347] hover:bg-[#162d59] text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#f59e0b] hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl cursor-pointer transition-all shadow-md flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingId ? 'Save Changes' : 'Schedule Announcement'}</span>
                </button>
              </div>
            </form>
          ) : null}

          {/* ================= SEARCH & FILTERS ================= */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#060e1d] p-3 rounded-xl border border-[#122347]">
            
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search announcements..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-[#09152b] border border-[#16274a] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-mono">Category:</span>
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="px-2.5 py-1.5 bg-[#09152b] border border-[#16274a] rounded-lg text-xs text-slate-200 font-mono focus:outline-none"
              >
                <option value="All">All Categories</option>
                <option value="Leadership">Leadership</option>
                <option value="Compliance">Compliance</option>
                <option value="Operations">Operations</option>
                <option value="Safety">Safety</option>
                <option value="Documents">Documents</option>
                <option value="General">General</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-mono">Status:</span>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="px-2.5 py-1.5 bg-[#09152b] border border-[#16274a] rounded-lg text-xs text-slate-200 font-mono focus:outline-none"
              >
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Completed">Completed</option>
                <option value="Archived">Archived</option>
              </select>
            </div>

          </div>

          {/* ================= ANNOUNCEMENTS LIST ================= */}
          <div className="space-y-3">
            {filteredAnnouncements.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-[#060e1d] border border-[#122347] text-slate-400">
                <Megaphone className="w-8 h-8 mx-auto text-slate-600 mb-2 opacity-50" />
                <p className="text-xs font-bold text-slate-300">No announcements match your filter.</p>
                <p className="text-[11px] text-slate-500 mt-1">Click "+ New Announcement" above to schedule a new corporate notice.</p>
              </div>
            ) : (
              filteredAnnouncements.map((item, idx) => (
                <div
                  key={item.id ? `${item.id}-${idx}` : `modal-ann-${idx}`}
                  className="p-4 rounded-xl bg-[#0a1833] border border-[#162e5e] hover:border-amber-500/40 transition-all space-y-2 group shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    
                    <div className="space-y-1 flex-1 min-w-0">
                      
                      {/* Badges row */}
                      <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
                        <span className={`px-2 py-0.5 rounded-md border font-bold ${getStatusBadge(item.status)}`}>
                          {item.status === 'Active' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1" />}
                          {item.status}
                        </span>

                        <span className={`px-2 py-0.5 rounded-md border font-bold ${getPriorityBadge(item.priority)}`}>
                          {item.priority} Priority
                        </span>

                        <span className="px-2 py-0.5 rounded-md bg-[#102347] border border-[#1c3a70] text-amber-300 font-bold">
                          {item.category}
                        </span>

                        {item.targetDepartment && item.targetDepartment !== 'All Departments' && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                            {item.targetDepartment}
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                        {item.title}
                      </h3>

                      {/* Content Description */}
                      {item.content && (
                        <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                          {item.content}
                        </p>
                      )}

                    </div>

                    {/* Action Buttons: Edit, Delete */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-2 rounded-lg bg-[#122347] hover:bg-amber-500 hover:text-slate-950 text-slate-300 transition-colors cursor-pointer"
                        title="Edit Announcement & Schedule"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete "${item.title}"?`)) {
                            onDeleteAnnouncement(item.id);
                          }
                        }}
                        className="p-2 rounded-lg bg-[#122347] hover:bg-red-500 hover:text-white text-slate-300 transition-colors cursor-pointer"
                        title="Delete Announcement"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>

                  {/* Schedule Footer */}
                  <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 font-mono pt-2 border-t border-[#122347]">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-slate-300">
                        <Calendar className="w-3.5 h-3.5 text-amber-400" />
                        <span>Date: {item.scheduledDate}</span>
                      </span>
                      <span className="flex items-center gap-1 text-slate-300">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Time: {item.scheduledTime}</span>
                      </span>
                    </div>

                    <span className="text-[10px] text-slate-500">
                      By: {item.author || 'Corporate Admin'}
                    </span>
                  </div>

                </div>
              ))
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-3.5 border-t border-[#122347] bg-[#060e1d] flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-mono">
            DATIAN Subic CSR &bull; Live Broadcast Engine
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#122347] hover:bg-[#183060] text-slate-200 text-xs font-bold rounded-xl cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
