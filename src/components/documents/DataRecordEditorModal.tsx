/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, 
  Check, 
  AlertCircle, 
  Code2, 
  FileSpreadsheet, 
  FileText, 
  Table, 
  Save, 
  Download, 
  Copy, 
  Trash2, 
  Sparkles, 
  RotateCcw,
  CheckCircle2,
  Columns,
  Eye,
  AlertTriangle
} from 'lucide-react';
import { DataRecord } from '../../types';
import { validateJsonData, validateCsvData } from '../../services/fileStorage';

interface DataRecordEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: DataRecord | null;
  onAutoSave: (updatedRecord: DataRecord) => Promise<void>;
  onDelete: (id: string, title: string) => void;
  addToast: (title: string, message: string, type: 'success' | 'warning' | 'info') => void;
  categories: string[];
}

export default function DataRecordEditorModal({
  isOpen,
  onClose,
  record,
  onAutoSave,
  onDelete,
  addToast,
  categories
}: DataRecordEditorModalProps) {
  if (!isOpen || !record) return null;

  // Local state for active editing
  const [title, setTitle] = useState(record.title);
  const [format, setFormat] = useState<'json' | 'csv' | 'text' | 'table'>(record.format || 'json');
  const [content, setContent] = useState(record.content);
  const [category, setCategory] = useState(record.category || 'General Operations');
  const [tagsInput, setTagsInput] = useState((record.tags || []).join(', '));
  
  // Auto-save status indicator
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'unsaved'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string>(
    record.autoSavedAt 
      ? new Date(record.autoSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );

  // Tab view inside editor: 'code' (raw text/json/csv) or 'preview' (formatted table/json tree)
  const [editorMode, setEditorMode] = useState<'editor' | 'preview'>('editor');
  
  // Copying state
  const [isCopied, setIsCopied] = useState(false);

  // Debounce timer ref
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstMount = useRef(true);

  // Validation state
  const validationResult = useMemo(() => {
    if (format === 'json') {
      return validateJsonData(content);
    }
    if (format === 'csv') {
      return validateCsvData(content);
    }
    return { valid: content.trim().length > 0 };
  }, [format, content]);

  // Sync state when incoming record changes
  useEffect(() => {
    setTitle(record.title);
    setFormat(record.format || 'json');
    setContent(record.content);
    setCategory(record.category || 'General Operations');
    setTagsInput((record.tags || []).join(', '));
    setSaveStatus('saved');
    isFirstMount.current = true;
  }, [record.id]);

  // Trigger Debounced Auto-Save on any modification
  const triggerAutoSave = (
    newTitle: string, 
    newFormat: 'json' | 'csv' | 'text' | 'table', 
    newContent: string, 
    newCategory: string, 
    newTagsStr: string
  ) => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    setSaveStatus('saving');

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        const parsedTags = newTagsStr
          .split(',')
          .map(t => t.trim())
          .filter(Boolean);

        const byteSize = new Blob([newContent]).size;
        let sizeStr = `${byteSize} B`;
        if (byteSize >= 1024 * 1024) sizeStr = `${(byteSize / (1024 * 1024)).toFixed(1)} MB`;
        else if (byteSize >= 1024) sizeStr = `${(byteSize / 1024).toFixed(1)} KB`;

        let recCount = 1;
        if (newFormat === 'csv') {
          const lines = newContent.trim().split('\n').filter(l => l.trim());
          recCount = Math.max(lines.length - 1, 0);
        } else if (newFormat === 'json') {
          try {
            const p = JSON.parse(newContent);
            if (Array.isArray(p)) recCount = p.length;
            else if (typeof p === 'object' && p !== null) recCount = Object.keys(p).length;
          } catch {
            recCount = 1;
          }
        }

        const updated: DataRecord = {
          ...record,
          title: newTitle.trim() || 'Untitled Dataset',
          format: newFormat,
          content: newContent,
          category: newCategory,
          tags: parsedTags,
          size: sizeStr,
          recordCount: recCount,
          updatedAt: new Date().toISOString(),
          autoSavedAt: new Date().toISOString()
        };

        await onAutoSave(updated);
        setSaveStatus('saved');
        setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      } catch (err) {
        console.error('Auto-save error:', err);
        setSaveStatus('error');
      }
    }, 450); // 450ms debounce
  };

  // Immediate Save Now button (Flushes changes instantly)
  const handleSaveNow = async () => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setSaveStatus('saving');
    
    try {
      const parsedTags = tagsInput
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      const byteSize = new Blob([content]).size;
      let sizeStr = `${byteSize} B`;
      if (byteSize >= 1024 * 1024) sizeStr = `${(byteSize / (1024 * 1024)).toFixed(1)} MB`;
      else if (byteSize >= 1024) sizeStr = `${(byteSize / 1024).toFixed(1)} KB`;

      const updated: DataRecord = {
        ...record,
        title: title.trim() || 'Untitled Dataset',
        format,
        content,
        category,
        tags: parsedTags,
        size: sizeStr,
        updatedAt: new Date().toISOString(),
        autoSavedAt: new Date().toISOString()
      };

      await onAutoSave(updated);
      setSaveStatus('saved');
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      addToast('Data Saved', `"${title}" has been saved and persisted.`, 'success');
    } catch (err: any) {
      setSaveStatus('error');
      addToast('Save Failed', err.message || 'Could not save data record.', 'warning');
    }
  };

  // Format / Beautify JSON or CSV
  const handleFormatContent = () => {
    if (format === 'json') {
      try {
        const parsed = JSON.parse(content);
        const pretty = JSON.stringify(parsed, null, 2);
        setContent(pretty);
        triggerAutoSave(title, format, pretty, category, tagsInput);
        addToast('JSON Formatted', 'Syntax formatted with 2-space indentation.', 'success');
      } catch (err: any) {
        addToast('Format Error', 'Cannot format invalid JSON. Please fix syntax errors first.', 'warning');
      }
    } else if (format === 'csv') {
      const parsed = validateCsvData(content);
      if (parsed.valid && parsed.rows && parsed.headers) {
        const formattedLines = [
          parsed.headers.join(', '),
          ...parsed.rows.map(r => r.join(', '))
        ].join('\n');
        setContent(formattedLines);
        triggerAutoSave(title, format, formattedLines, category, tagsInput);
        addToast('CSV Cleaned', 'CSV rows and columns standardized.', 'success');
      }
    }
  };

  // Copy Content
  const handleCopyContent = () => {
    navigator.clipboard.writeText(content);
    setIsCopied(true);
    addToast('Copied', 'Data record copied to clipboard.', 'info');
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Download / Export record
  const handleExport = () => {
    const ext = format === 'json' ? '.json' : format === 'csv' ? '.csv' : '.txt';
    const mime = format === 'json' ? 'application/json' : format === 'csv' ? 'text/csv' : 'text/plain';
    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast('Export Complete', `File "${link.download}" downloaded.`, 'success');
  };

  // Template loaders
  const handleLoadTemplate = (templateType: 'json_checklist' | 'csv_inventory' | 'sop_markdown') => {
    let newContent = '';
    let newFormat: 'json' | 'csv' | 'text' = 'json';
    
    if (templateType === 'json_checklist') {
      newFormat = 'json';
      newContent = JSON.stringify({
        auditName: "Machine & Safety Compliance 2026",
        facility: "DATIAN SUBIC SHOES INC.",
        auditDate: new Date().toISOString().split('T')[0],
        checklist: [
          { item: "Emergency Exits Unobstructed", status: "Pass", notes: "All 6 exits clear" },
          { item: "Overlock Machine Guards Installed", status: "Pass", notes: "Verified in Line 1 & 2" },
          { item: "First Aid Kit Restocked", status: "Pass", notes: "Updated monthly inventory" },
          { item: "Anti-Bribery Whistleblower Notice Displayed", status: "Pass", notes: "Visible at main bulletin" }
        ],
        inspector: "Internal Compliance Auditor"
      }, null, 2);
    } else if (templateType === 'csv_inventory') {
      newFormat = 'csv';
      newContent = `Asset_Tag,Equipment_Name,Line_Location,Serial_No,Last_Inspection,Status\nEQ-901,High-Speed Lockstitch,Line 1,SN-882910,2026-05-10,Operational\nEQ-902,Post-Bed Sewing Machine,Line 2,SN-441209,2026-05-12,Operational\nEQ-903,Eyelet Automatic Attacher,Line 3,SN-339102,2026-05-08,Operational\nEQ-904,Heat Transfer Press,Finishing,SN-102948,2026-05-15,Operational`;
    } else if (templateType === 'sop_markdown') {
      newFormat = 'text';
      newContent = `# STANDARD OPERATING PROCEDURE (SOP)\n## Title: Stitching Quality & Needle Inspection\n\n### 1. Purpose:\nEnsure zero broken needles remain inside footwear assemblies and verify stitch density.\n\n### 2. Mandatory Rules:\n1. Check needle integrity every 50 pairs.\n2. Replace dull needles immediately in designated disposal box.\n3. Verify tension calibration before daily line startup.`;
    }

    setFormat(newFormat);
    setContent(newContent);
    triggerAutoSave(title, newFormat, newContent, category, tagsInput);
    addToast('Template Loaded', 'Preset structured template inserted.', 'info');
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 animate-fadeIn select-none font-sans">
      <div className="bg-[#091429] border border-[#162d59] rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        
        {/* 1. Modal Top Bar with Live Auto-Save Visual Indicator */}
        <div className="p-4 bg-[#060e1d] border-b border-[#122347] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#0e2247] border border-blue-500/30 flex items-center justify-center text-amber-400 shadow-md flex-shrink-0">
              {format === 'json' ? <Code2 className="w-5 h-5" /> :
               format === 'csv' ? <FileSpreadsheet className="w-5 h-5" /> :
               <FileText className="w-5 h-5" />}
            </div>
            
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-500/30">
                  {format.toUpperCase()} Dataset
                </span>

                {/* VISUAL AUTO-SAVE INDICATOR (Requirement #1) */}
                <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold transition-all ${
                  saveStatus === 'saved' ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40' :
                  saveStatus === 'saving' ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40 animate-pulse' :
                  'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                }`}>
                  {saveStatus === 'saved' ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Saved ✓ {lastSavedTime}</span>
                    </>
                  ) : saveStatus === 'saving' ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                      <span>Save Error</span>
                    </>
                  )}
                </div>
              </div>

              <h3 className="text-sm font-bold text-white truncate mt-0.5">
                {title || 'Untitled Data Record'}
              </h3>
            </div>
          </div>

          {/* Actions & Close */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveNow}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0e2247] hover:bg-[#153166] text-blue-300 hover:text-white text-xs font-bold transition-all cursor-pointer border border-blue-500/30"
              title="Flush save immediately"
            >
              <Save className="w-3.5 h-3.5 text-amber-400" />
              <span>Save Now</span>
            </button>

            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#060e1d] hover:bg-[#122347] text-slate-200 text-xs font-bold transition-all cursor-pointer border border-[#122347]"
              title="Download formatted file"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Export</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#122347] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. Metadata Controls Row (Title, Format, Category, Tags) */}
        <div className="p-4 bg-[#071122] border-b border-[#122347] grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
          
          {/* Title Field */}
          <div className="sm:col-span-5 space-y-1">
            <label className="text-[10px] font-mono uppercase font-bold text-slate-400">Dataset Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                const val = e.target.value;
                setTitle(val);
                triggerAutoSave(val, format, content, category, tagsInput);
              }}
              placeholder="e.g. Production Standards, Safety Audit 2026..."
              className="w-full bg-[#040812] border border-[#122347] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
            />
          </div>

          {/* Format Switcher */}
          <div className="sm:col-span-3 space-y-1">
            <label className="text-[10px] font-mono uppercase font-bold text-slate-400">Data Format</label>
            <select
              value={format}
              onChange={(e) => {
                const val = e.target.value as any;
                setFormat(val);
                triggerAutoSave(title, val, content, category, tagsInput);
              }}
              className="w-full bg-[#040812] border border-[#122347] rounded-xl px-3 py-2 text-xs font-bold text-amber-400 focus:border-amber-400 focus:outline-none cursor-pointer"
            >
              <option value="json" className="bg-[#091429] text-white">JSON (Structured)</option>
              <option value="csv" className="bg-[#091429] text-white">CSV (Spreadsheet)</option>
              <option value="text" className="bg-[#091429] text-white">Text / Markdown</option>
            </select>
          </div>

          {/* Category */}
          <div className="sm:col-span-4 space-y-1">
            <label className="text-[10px] font-mono uppercase font-bold text-slate-400">Category</label>
            <input
              type="text"
              value={category}
              onChange={(e) => {
                const val = e.target.value;
                setCategory(val);
                triggerAutoSave(title, format, content, val, tagsInput);
              }}
              list="category-options"
              placeholder="Category name"
              className="w-full bg-[#040812] border border-[#122347] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
            />
            <datalist id="category-options">
              {categories.map((c, i) => (
                <option key={i} value={c} />
              ))}
            </datalist>
          </div>

        </div>

        {/* 3. Toolbar & Validation Status Bar */}
        <div className="px-4 py-2 bg-[#050b17] border-b border-[#122347] flex flex-wrap items-center justify-between gap-2 text-xs">
          
          {/* Left: View Mode Toggle & Format Tool */}
          <div className="flex items-center gap-2">
            <div className="flex bg-[#091429] p-0.5 rounded-lg border border-[#122347]">
              <button
                type="button"
                onClick={() => setEditorMode('editor')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  editorMode === 'editor' ? 'bg-[#1d4ed8] text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Code Editor</span>
              </button>
              
              <button
                type="button"
                onClick={() => setEditorMode('preview')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  editorMode === 'preview' ? 'bg-[#1d4ed8] text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Formatted Preview</span>
              </button>
            </div>

            {(format === 'json' || format === 'csv') && (
              <button
                type="button"
                onClick={handleFormatContent}
                className="px-2.5 py-1 bg-[#091429] hover:bg-[#0e2247] text-amber-300 border border-amber-500/30 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                title="Auto format and beautify syntax"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>{format === 'json' ? 'Beautify JSON' : 'Format CSV'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCopyContent}
              className="px-2.5 py-1 bg-[#091429] hover:bg-[#0e2247] text-slate-300 hover:text-white border border-[#122347] rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
              <span>{isCopied ? 'Copied ✓' : 'Copy'}</span>
            </button>
          </div>

          {/* Right: Validation Feedback Badge (Requirement #5 Data Integrity) */}
          <div className="flex items-center gap-2">
            {format === 'json' && (
              <div className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold flex items-center gap-1.5 ${
                validationResult.valid 
                  ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300' 
                  : 'bg-rose-950/60 border border-rose-500/40 text-rose-300'
              }`}>
                {validationResult.valid ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>Valid JSON Syntax</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3 h-3 text-rose-400" />
                    <span>{validationResult.error || 'Syntax Error'}</span>
                  </>
                )}
              </div>
            )}

            {format === 'csv' && (
              <div className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold flex items-center gap-1.5 ${
                validationResult.valid 
                  ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300' 
                  : 'bg-rose-950/60 border border-rose-500/40 text-rose-300'
              }`}>
                {validationResult.valid ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>CSV Valid ({('rowCount' in validationResult) ? validationResult.rowCount : 0} rows)</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3 h-3 text-rose-400" />
                    <span>{validationResult.error || 'CSV Parse Error'}</span>
                  </>
                )}
              </div>
            )}

            {/* Template dropdown */}
            <div className="relative">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleLoadTemplate(e.target.value as any);
                    e.target.value = '';
                  }
                }}
                className="bg-[#091429] border border-[#122347] text-slate-300 rounded-lg px-2 py-1 text-[10px] font-mono font-bold focus:outline-none cursor-pointer"
                defaultValue=""
              >
                <option value="" disabled>Load Template...</option>
                <option value="json_checklist" className="bg-[#091429] text-white">JSON Audit Checklist</option>
                <option value="csv_inventory" className="bg-[#091429] text-white">CSV Equipment List</option>
                <option value="sop_markdown" className="bg-[#091429] text-white">Markdown SOP Document</option>
              </select>
            </div>
          </div>

        </div>

        {/* 4. Editor / Preview Workspace Viewport */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#03060e] min-h-[350px]">
          
          {editorMode === 'editor' ? (
            /* RAW CODE / TEXT EDITOR */
            <div className="h-full flex flex-col space-y-2">
              <textarea
                value={content}
                onChange={(e) => {
                  const val = e.target.value;
                  setContent(val);
                  triggerAutoSave(title, format, val, category, tagsInput);
                }}
                placeholder={
                  format === 'json' ? '{\n  "key": "value"\n}' :
                  format === 'csv' ? 'Header1, Header2, Header3\nValue1, Value2, Value3' :
                  'Enter raw text or markdown documentation...'
                }
                className="w-full flex-1 min-h-[300px] bg-[#050b17] border border-[#122347] rounded-xl p-3.5 font-mono text-xs text-slate-100 placeholder-slate-600 focus:border-amber-400 focus:outline-none resize-y leading-relaxed shadow-inner"
                spellCheck={false}
              />
              
              {!validationResult.valid && validationResult.error && (
                <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                  <span className="font-mono text-[11px]">{validationResult.error}</span>
                </div>
              )}
            </div>
          ) : (
            /* FORMATTED PREVIEW VIEWPORT */
            <div className="h-full space-y-4">
              
              {/* CSV TABLE PREVIEW */}
              {format === 'csv' && (
                <div className="bg-[#071122] border border-[#122347] rounded-xl overflow-hidden shadow-md">
                  {(() => {
                    const csv = validateCsvData(content);
                    if (!csv.valid || !csv.headers) {
                      return (
                        <div className="p-8 text-center text-slate-400 font-mono text-xs">
                          <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                          <p>Unable to render table: {csv.error}</p>
                        </div>
                      );
                    }
                    return (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse font-sans">
                          <thead>
                            <tr className="bg-[#050b17] border-b border-[#122347] font-mono text-[10px] text-amber-400 uppercase tracking-wider">
                              <th className="p-2.5 w-12 text-center text-slate-500">#</th>
                              {csv.headers.map((h, i) => (
                                <th key={i} className="p-2.5 font-bold whitespace-nowrap">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#102040]">
                            {csv.rows && csv.rows.length > 0 ? (
                              csv.rows.map((row, rIdx) => (
                                <tr key={rIdx} className="hover:bg-[#0c1a36]/60 transition-colors">
                                  <td className="p-2.5 font-mono text-slate-500 text-center">{rIdx + 1}</td>
                                  {row.map((cell, cIdx) => (
                                    <td key={cIdx} className="p-2.5 text-slate-200 whitespace-nowrap">{cell}</td>
                                  ))}
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={csv.headers.length + 1} className="p-4 text-center text-slate-500 font-mono">
                                  No data rows
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* JSON FORMATTED VIEWER */}
              {format === 'json' && (
                <div className="bg-[#071122] border border-[#122347] rounded-xl p-4 overflow-auto max-h-[400px]">
                  {(() => {
                    const json = validateJsonData(content);
                    if (!json.valid) {
                      return (
                        <div className="p-8 text-center text-slate-400 font-mono text-xs">
                          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
                          <p className="text-rose-300 font-bold">Invalid JSON: {json.error}</p>
                        </div>
                      );
                    }
                    return (
                      <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap leading-relaxed">
                        {JSON.stringify(json.parsed, null, 2)}
                      </pre>
                    );
                  })()}
                </div>
              )}

              {/* TEXT / MARKDOWN PREVIEW */}
              {format === 'text' && (
                <div className="bg-[#071122] border border-[#122347] rounded-xl p-5 prose prose-invert max-w-none text-xs leading-relaxed font-sans whitespace-pre-wrap text-slate-200">
                  {content || <span className="text-slate-500 italic">No content available</span>}
                </div>
              )}

            </div>
          )}

        </div>

        {/* 5. Modal Footer: Manual Delete Button + Confirmation Trigger */}
        <div className="p-4 bg-[#060e1d] border-t border-[#122347] flex flex-wrap items-center justify-between gap-3 text-xs">
          
          {/* Delete button (Requirement #3 Manual Delete with confirmation) */}
          <button
            type="button"
            onClick={() => onDelete(record.id, title)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 hover:text-white font-bold cursor-pointer transition-colors"
            title="Permanently remove this data entry"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Delete Record</span>
          </button>

          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-slate-400">
              Auto-Save is active • Changes sync instantly across all devices
            </span>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#091429] hover:bg-[#122347] text-white font-bold rounded-xl cursor-pointer border border-[#122347] transition-colors"
            >
              Done / Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
