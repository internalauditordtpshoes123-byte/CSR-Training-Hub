/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Printer,
  Download,
  Save,
  Plus,
  Trash2,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Upload,
  Image as ImageIcon,
  Check,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  Shield,
  Wrench,
  HelpCircle,
  TrendingUp,
  Clock,
  UserCheck,
  Settings,
  Eye,
  FileEdit,
  RotateCcw,
  Maximize2,
  Minimize2,
  ExternalLink
} from 'lucide-react';
import { UserRole } from '../../types';
import { syncEntityToMaster } from '../../services/realtimeSync';

export interface OPLStepItem {
  stepNo: number;
  instruction: string;
  keyPoint: string;
  reason: string;
  imageUrl?: string;
}

export interface OPLTraineeSignOff {
  id: string;
  date: string;
  traineeName: string;
  traineeId: string;
  station: string;
  trainerSign: string;
  result: 'OK' | 'NG';
}

export interface OPLDocument {
  id: string;
  docNo: string;
  revNo: string;
  effectiveDate: string;
  pageNo: string;
  plantName: string;
  divisionName: string;
  title: string;
  department: string;
  lineNo: string;
  process: string;
  style: string;
  oplType: 'Basic' | 'Trouble' | 'Kaizen' | 'Safety';
  preparedBy: string;
  preparedDate: string;
  reviewedBy: string;
  reviewedDate: string;
  approvedBy: string;
  approvedDate: string;
  approvalStatus: 'Approved' | 'Pending Review' | 'Draft';
  purpose: string;
  
  // Visual NG (Not Good / Wrong) vs OK (Good / Standard)
  ngTitle: string;
  ngDescription: string;
  ngImageUrl: string;
  okTitle: string;
  okDescription: string;
  okImageUrl: string;

  // Step-by-step procedures
  steps: OPLStepItem[];

  // Safety & Quality precautions
  safetyPrecaution: string;
  qualityAlert: string;

  // Trainee Roster
  traineeRoster: OPLTraineeSignOff[];

  createdAt: string;
  updatedAt: string;
}

interface OPLDocumentStudioProps {
  role?: UserRole;
  addToast?: (title: string, message: string, type: 'success' | 'warning' | 'info') => void;
  onBackToDocuments?: () => void;
}

// Clean initial empty document template
const createBlankOPL = (customDocNo?: string): OPLDocument => {
  const today = new Date().toISOString().split('T')[0];
  const uniqueId = 'opl-' + Date.now();
  const docNo = customDocNo || `DT-OPL-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`;

  return {
    id: uniqueId,
    docNo,
    revNo: '01',
    effectiveDate: today,
    pageNo: '1 of 1',
    plantName: 'DATIAN FOOTWEAR MFG. CO., LTD.',
    divisionName: 'TRAINING & DEVELOPMENT CENTER • MANUFACTURING STANDARDS',
    title: 'ONE POINT LESSON (OPL)',
    department: 'Stitching',
    lineNo: 'Line 1',
    process: 'Sewing Operations',
    style: 'Standard Process',
    oplType: 'Basic',
    preparedBy: 'Training Specialist',
    preparedDate: today,
    reviewedBy: 'Technical Lead',
    reviewedDate: today,
    approvedBy: 'T&D Manager',
    approvedDate: today,
    approvalStatus: 'Approved',
    purpose: 'Standardize shop floor operation, eliminate process defects, and establish visual tolerance for operators.',
    ngTitle: 'NG: INCORRECT / DEFECT (MALI)',
    ngDescription: 'Improper method or specification violation leading to defect, thread breakage, or material damage.',
    ngImageUrl: '',
    okTitle: 'OK: STANDARD / CORRECT (TAMA)',
    okDescription: 'Correct visual standard, proper alignment, strict tolerance compliance, and verified safety guard position.',
    okImageUrl: '',
    steps: [
      {
        stepNo: 1,
        instruction: 'Inspect parts and machine setup prior to operation.',
        keyPoint: 'Verify alignment notches and clean workspace.',
        reason: 'Prevents skewed assembly and machine jams.'
      },
      {
        stepNo: 2,
        instruction: 'Execute process according to specified speed and pressure.',
        keyPoint: 'Maintain steady guidance without pulling.',
        reason: 'Guarantees uniform tension and zero distortion.'
      }
    ],
    safetyPrecaution: 'Always keep fingers clear of moving needle/blade guard. Wear required safety glasses and hairnet.',
    qualityAlert: 'Check 1st piece at shift startup. Tolerances exceeding ±1.0mm must be quarantined immediately.',
    traineeRoster: [
      {
        id: 'trn-1',
        date: today,
        traineeName: '',
        traineeId: '',
        station: 'Station 1',
        trainerSign: 'Verified',
        result: 'OK'
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
};

export default function OPLDocumentStudio({
  role = 'Manager',
  addToast = () => {},
  onBackToDocuments
}: OPLDocumentStudioProps) {
  // Storage key for persistent OPL documents
  const STORAGE_KEY = 'tms_opl_documents_v2';

  // State: OPL Document List
  const [documents, setDocuments] = useState<OPLDocument[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse stored OPL documents:', e);
    }
    // Clean initial state with 1 ready-to-use standard blank OPL sheet
    return [createBlankOPL('DT-OPL-2026-001')];
  });

  // Currently active/editing document ID
  const [activeDocId, setActiveDocId] = useState<string>(() => {
    return documents[0]?.id || '';
  });

  // Current active document object
  const activeDoc = documents.find(d => d.id === activeDocId) || documents[0] || createBlankOPL();

  // Mode: 'view' (clean Word paper print preview) | 'edit' (interactive form & live paper)
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  
  // Paper Zoom scale: 0.8, 1, 1.15
  const [zoom, setZoom] = useState<number>(1);

  // Search filter for sidebar/manager
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'Basic' | 'Trouble' | 'Kaizen' | 'Safety'>('ALL');
  
  // Save notification status
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string>(new Date().toLocaleTimeString());

  // Ref for Word paper container for direct printing
  const paperRef = useRef<HTMLDivElement>(null);

  // Sync to localStorage and server whenever documents list changes
  const saveAllDocuments = (newDocs: OPLDocument[]) => {
    try {
      setSaveStatus('saving');
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newDocs));
      syncEntityToMaster('oplDocuments', newDocs);
      setSaveStatus('saved');
      setLastSavedTime(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Failed to save OPL:', err);
      setSaveStatus('unsaved');
    }
  };

  // Update current document helper
  const updateActiveDoc = (updater: (prev: OPLDocument) => OPLDocument) => {
    setDocuments(prevDocs => {
      const updatedList = prevDocs.map(doc => {
        if (doc.id === activeDoc.id) {
          const updated = updater(doc);
          return { ...updated, updatedAt: new Date().toISOString() };
        }
        return doc;
      });
      saveAllDocuments(updatedList);
      return updatedList;
    });
  };

  // Explicit Save Function (called by Save button)
  const handleExplicitSave = () => {
    saveAllDocuments(documents);
    addToast(
      'OPL Saved Successfully ✓',
      `Document "${activeDoc.docNo}: ${activeDoc.title}" saved to local storage and synchronized with server master.`,
      'success'
    );
  };

  // Create New OPL
  const handleCreateNewOPL = () => {
    const newDoc = createBlankOPL();
    const updated = [newDoc, ...documents];
    setDocuments(updated);
    setActiveDocId(newDoc.id);
    setMode('edit');
    saveAllDocuments(updated);
    addToast('New OPL Created', `New blank OPL sheet ready for editing (${newDoc.docNo}).`, 'info');
  };

  // Duplicate current OPL
  const handleDuplicateOPL = () => {
    const duplicated: OPLDocument = {
      ...activeDoc,
      id: 'opl-' + Date.now(),
      docNo: `${activeDoc.docNo}-COPY`,
      title: `${activeDoc.title} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const updated = [duplicated, ...documents];
    setDocuments(updated);
    setActiveDocId(duplicated.id);
    saveAllDocuments(updated);
    addToast('OPL Duplicated', `Created a copy: ${duplicated.docNo}`, 'success');
  };

  // Delete current OPL
  const handleDeleteOPL = (idToDelete: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (documents.length <= 1) {
      addToast('Cannot Delete', 'At least one OPL document must be maintained in the repository.', 'warning');
      return;
    }
    const confirmDelete = window.confirm('Are you sure you want to delete this OPL document?');
    if (!confirmDelete) return;

    const remaining = documents.filter(d => d.id !== idToDelete);
    setDocuments(remaining);
    setActiveDocId(remaining[0].id);
    saveAllDocuments(remaining);
    addToast('OPL Deleted', 'Document removed successfully.', 'info');
  };

  // Print function matching Microsoft Word print
  const handlePrintWordFormat = () => {
    window.print();
  };

  // Export to actual Microsoft Word (.doc) file
  const handleExportWordDoc = () => {
    try {
      const htmlContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset="utf-8">
          <title>${activeDoc.docNo} - ${activeDoc.title}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 15mm 15mm 15mm 15mm;
              mso-page-orientation: portrait;
            }
            body {
              font-family: Calibri, 'Segoe UI', Arial, sans-serif;
              font-size: 11pt;
              color: #000000;
              line-height: 1.3;
              margin: 0;
              padding: 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 12px;
            }
            th, td {
              border: 1px solid #1e3a8a;
              padding: 6px 8px;
              vertical-align: top;
            }
            .header-table td {
              border: 1.5px solid #0f2a58;
            }
            .title-banner {
              background-color: #0f2a58;
              color: #ffffff;
              text-align: center;
              font-weight: bold;
              font-size: 15pt;
              padding: 8px;
            }
            .ng-box {
              border: 2px solid #dc2626;
              background-color: #fef2f2;
              padding: 10px;
            }
            .ok-box {
              border: 2px solid #16a34a;
              background-color: #f0fdf4;
              padding: 10px;
            }
            .steps-table th {
              background-color: #1e3a8a;
              color: #ffffff;
              font-weight: bold;
              text-align: left;
            }
            .caution-box {
              border: 1.5px solid #d97706;
              background-color: #fffbeb;
              padding: 8px;
              margin-top: 10px;
            }
          </style>
        </head>
        <body>
          <!-- OFFICIAL HEADER -->
          <table class="header-table">
            <tr>
              <td width="25%" style="text-align:center; font-weight:bold; color:#0f2a58;">
                ${activeDoc.plantName}
              </td>
              <td width="50%" style="text-align:center;">
                <div style="font-size:16pt; font-weight:bold; color:#0f2a58; letter-spacing:1px;">
                  ONE POINT LESSON (OPL)
                </div>
                <div style="font-size:9pt; color:#475569;">
                  ${activeDoc.divisionName}
                </div>
              </td>
              <td width="25%" style="font-size:9pt;">
                <b>Doc No:</b> ${activeDoc.docNo}<br/>
                <b>Rev No:</b> ${activeDoc.revNo}<br/>
                <b>Date:</b> ${activeDoc.effectiveDate}<br/>
                <b>Page:</b> ${activeDoc.pageNo}
              </td>
            </tr>
          </table>

          <!-- METADATA & APPROVAL TABLE -->
          <table>
            <tr style="background-color:#f1f5f9; font-weight:bold;">
              <td width="25%">Department: ${activeDoc.department}</td>
              <td width="25%">Line/Machine: ${activeDoc.lineNo}</td>
              <td width="25%">Process: ${activeDoc.process}</td>
              <td width="25%">Style/Model: ${activeDoc.style}</td>
            </tr>
            <tr>
              <td colspan="2"><b>OPL Classification:</b> [${activeDoc.oplType === 'Basic' ? 'X' : ' '}] Basic Knowledge &nbsp; [${activeDoc.oplType === 'Trouble' ? 'X' : ' '}] Troubleshooting &nbsp; [${activeDoc.oplType === 'Kaizen' ? 'X' : ' '}] Kaizen &nbsp; [${activeDoc.oplType === 'Safety' ? 'X' : ' '}] Safety</td>
              <td colspan="2"><b>Approval:</b> Prep: ${activeDoc.preparedBy} | Rev: ${activeDoc.reviewedBy} | Appr: ${activeDoc.approvedBy}</td>
            </tr>
          </table>

          <!-- TITLE BANNER -->
          <div class="title-banner">
            ${activeDoc.title}
          </div>

          <!-- OBJECTIVE -->
          <div style="padding:6px 0; font-size:10pt;">
            <b>PURPOSE & STANDARD TOLERANCE:</b> ${activeDoc.purpose}
          </div>

          <!-- VISUAL STANDARDS: NG vs OK -->
          <table>
            <tr>
              <td width="50%" class="ng-box">
                <div style="font-weight:bold; color:#dc2626; font-size:12pt; margin-bottom:4px;">
                  ❌ ${activeDoc.ngTitle}
                </div>
                <div style="font-size:10pt; color:#450a0a;">
                  ${activeDoc.ngDescription}
                </div>
              </td>
              <td width="50%" class="ok-box">
                <div style="font-weight:bold; color:#16a34a; font-size:12pt; margin-bottom:4px;">
                  ✅ ${activeDoc.okTitle}
                </div>
                <div style="font-size:10pt; color:#052e16;">
                  ${activeDoc.okDescription}
                </div>
              </td>
            </tr>
          </table>

          <!-- STEPS TABLE -->
          <table class="steps-table">
            <thead>
              <tr>
                <th width="8%">No.</th>
                <th width="42%">Standard Operating Procedure</th>
                <th width="25%">Key Point & Tolerance</th>
                <th width="25%">Reason Why</th>
              </tr>
            </thead>
            <tbody>
              ${activeDoc.steps.map(s => `
                <tr>
                  <td style="text-align:center; font-weight:bold;">${s.stepNo}</td>
                  <td>${s.instruction}</td>
                  <td style="color:#1e3a8a; font-weight:bold;">${s.keyPoint}</td>
                  <td>${s.reason}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <!-- SAFETY & QUALITY -->
          <div class="caution-box">
            <b>⚠️ SAFETY & QUALITY PRECAUTIONS:</b><br/>
            • <b>Safety:</b> ${activeDoc.safetyPrecaution}<br/>
            • <b>Quality Standard:</b> ${activeDoc.qualityAlert}
          </div>

          <div style="margin-top:15px; font-size:8pt; text-align:center; color:#64748b; border-top:1px solid #cbd5e1; padding-top:6px;">
            DATIAN FOOTWEAR MFG. CO., LTD. • Standard Operating Document • Form Ref: DT-FRM-TND-OPL-04 • Audit Ready
          </div>
        </body>
        </html>
      `;

      const blob = new Blob(['\ufeff', htmlContent], {
        type: 'application/msword;charset=utf-8'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeDoc.docNo}_${activeDoc.title.replace(/\s+/g, '_')}.doc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast('Word Document Exported', `Saved as ${activeDoc.docNo}.doc for Microsoft Word.`, 'success');
    } catch (err) {
      console.error('Word export error:', err);
      addToast('Export Failed', 'Unable to generate Word document.', 'warning');
    }
  };

  // Image Upload Handler for NG / OK boxes
  const handleImageUpload = (type: 'ng' | 'ok', file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (type === 'ng') {
        updateActiveDoc(d => ({ ...d, ngImageUrl: dataUrl }));
      } else {
        updateActiveDoc(d => ({ ...d, okImageUrl: dataUrl }));
      }
      addToast('Image Uploaded', `${type.toUpperCase()} visual reference updated.`, 'success');
    };
    reader.readAsDataURL(file);
  };

  // Add Step
  const handleAddStep = () => {
    updateActiveDoc(d => ({
      ...d,
      steps: [
        ...d.steps,
        {
          stepNo: d.steps.length + 1,
          instruction: 'Enter step instruction...',
          keyPoint: 'Enter key tolerance or safety point...',
          reason: 'Enter reason why this standard is critical...'
        }
      ]
    }));
  };

  // Remove Step
  const handleRemoveStep = (index: number) => {
    if (activeDoc.steps.length <= 1) {
      addToast('Cannot Remove', 'OPL must contain at least one operational step.', 'warning');
      return;
    }
    updateActiveDoc(d => {
      const newSteps = d.steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, stepNo: i + 1 }));
      return { ...d, steps: newSteps };
    });
  };

  // Update step field
  const handleUpdateStep = (index: number, field: keyof OPLStepItem, val: string | number) => {
    updateActiveDoc(d => {
      const newSteps = [...d.steps];
      newSteps[index] = { ...newSteps[index], [field]: val };
      return { ...d, steps: newSteps };
    });
  };

  // Add Trainee Row
  const handleAddTrainee = () => {
    updateActiveDoc(d => ({
      ...d,
      traineeRoster: [
        ...d.traineeRoster,
        {
          id: 'trn-' + Date.now(),
          date: new Date().toISOString().split('T')[0],
          traineeName: '',
          traineeId: '',
          station: `Station ${d.traineeRoster.length + 1}`,
          trainerSign: activeDoc.preparedBy || 'Trainer',
          result: 'OK'
        }
      ]
    }));
  };

  // Filtered documents for the left directory list
  const filteredDocs = documents.filter(doc => {
    const matchesSearch = 
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.docNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.process.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || doc.oplType === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-[#070e1b] text-slate-100 flex flex-col font-sans">
      
      {/* 1. TOP TOOLBAR & CONTROLS (Hidden during printing) */}
      <header className="no-print bg-[#091428] border-b border-[#162d59] sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          
          {/* Left: Branding & Breadcrumb */}
          <div className="flex items-center gap-3">
            {onBackToDocuments && (
              <button
                onClick={onBackToDocuments}
                className="p-2 bg-[#0c1d3b] hover:bg-[#122b59] text-slate-300 hover:text-white rounded-xl border border-blue-500/20 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                title="Back to Document Repository"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Repository</span>
              </button>
            )}

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-md">
                <Sparkles className="w-4 h-4 fill-slate-950" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-extrabold text-white tracking-wide">
                    OPL Studio • Microsoft Word Print Format
                  </h1>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    Audit Ready
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono">
                  Standard One-Point Lesson Document Sheet • Standalone Root Repository
                </p>
              </div>
            </div>
          </div>

          {/* Center: Save Status & Mode Switch */}
          <div className="flex items-center gap-2 bg-[#050b17] p-1.5 rounded-xl border border-[#162d59]">
            <button
              onClick={() => setMode('view')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                mode === 'view'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Word Paper View</span>
            </button>

            <button
              onClick={() => setMode('edit')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                mode === 'edit'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileEdit className="w-3.5 h-3.5" />
              <span>Interactive Editor</span>
            </button>
          </div>

          {/* Right: Actions (Save, Print, Export, New) */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Functional Save Button */}
            <button
              onClick={handleExplicitSave}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-extrabold rounded-xl shadow-md transition-all cursor-pointer border border-emerald-400/30"
              title="Save changes to localStorage and synchronize with server database"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save OPL</span>
            </button>

            {/* Print Word Format Button */}
            <button
              onClick={handlePrintWordFormat}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0e2247] hover:bg-[#153266] text-blue-200 hover:text-white text-xs font-bold rounded-xl transition-all cursor-pointer border border-blue-500/30"
              title="Print standard A4/Letter paper layout matching Microsoft Word"
            >
              <Printer className="w-3.5 h-3.5 text-blue-400" />
              <span>Print (Word Format)</span>
            </button>

            {/* Export as Word .doc */}
            <button
              onClick={handleExportWordDoc}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0e2247] hover:bg-[#153266] text-blue-200 hover:text-white text-xs font-bold rounded-xl transition-all cursor-pointer border border-blue-500/30"
              title="Download Microsoft Word .doc file"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>Export Word (.doc)</span>
            </button>

            {/* New OPL Button */}
            <button
              onClick={handleCreateNewOPL}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-sm"
              title="Create new blank OPL document sheet"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New OPL</span>
            </button>
          </div>

        </div>
      </header>

      {/* 2. SUB-BAR: DOCUMENT SWITCHER & ZOOM (Hidden during print) */}
      <div className="no-print bg-[#050c1a] border-b border-[#122347] px-4 py-2 flex flex-wrap items-center justify-between text-xs gap-3">
        {/* Document quick picker */}
        <div className="flex items-center gap-2 overflow-x-auto max-w-2xl py-0.5">
          <span className="text-[11px] font-mono text-slate-400 uppercase font-bold flex-shrink-0">
            Active Sheets ({documents.length}):
          </span>
          {documents.map(d => (
            <button
              key={d.id}
              onClick={() => setActiveDocId(d.id)}
              className={`px-3 py-1 rounded-lg font-mono text-[11px] font-bold flex-shrink-0 flex items-center gap-1.5 transition-all cursor-pointer ${
                d.id === activeDoc.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-[#09152b] text-slate-300 hover:text-white border border-[#162d59]'
              }`}
            >
              <span>{d.docNo}</span>
              <span className="text-[9px] opacity-75 truncate max-w-[120px]">
                {d.title}
              </span>
            </button>
          ))}
        </div>

        {/* Status indicator & Zoom controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400">
            <CheckCircle2 className="w-3 h-3" />
            <span>Saved {lastSavedTime}</span>
          </div>

          <div className="flex items-center gap-1 bg-[#09152b] p-1 rounded-lg border border-[#162d59]">
            <button
              onClick={() => setZoom(z => Math.max(0.75, z - 0.1))}
              className="px-1.5 py-0.5 text-slate-400 hover:text-white font-bold"
              title="Zoom out"
            >
              -
            </button>
            <span className="font-mono text-[10px] text-slate-300 px-1">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(z => Math.min(1.4, z + 0.1))}
              className="px-1.5 py-0.5 text-slate-400 hover:text-white font-bold"
              title="Zoom in"
            >
              +
            </button>
            <button
              onClick={() => setZoom(1)}
              className="px-1.5 py-0.5 text-slate-400 hover:text-white text-[10px] ml-1"
              title="Reset zoom"
            >
              100%
            </button>
          </div>
        </div>
      </div>

      {/* 3. MAIN WORKSPACE */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT PANEL: OPL DIRECTORY & FILTER (Hidden during print) */}
        <aside className="no-print w-72 bg-[#060e1d] border-r border-[#122347] flex flex-col flex-shrink-0">
          <div className="p-3 border-b border-[#122347] space-y-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search OPL sheets..."
                className="w-full pl-8 pr-3 py-1.5 bg-[#09152b] border border-[#162d59] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Category pills */}
            <div className="flex items-center gap-1 overflow-x-auto text-[10px]">
              {(['ALL', 'Basic', 'Trouble', 'Kaizen', 'Safety'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                    categoryFilter === cat
                      ? 'bg-blue-600 text-white'
                      : 'bg-[#09152b] text-slate-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* OPL Document Cards List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredDocs.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                No matching OPL documents found.
              </div>
            ) : (
              filteredDocs.map(doc => {
                const isActive = doc.id === activeDoc.id;
                return (
                  <div
                    key={doc.id}
                    onClick={() => setActiveDocId(doc.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer text-xs space-y-1.5 relative group ${
                      isActive
                        ? 'bg-[#0c1d3b] border-blue-500 text-white shadow-md'
                        : 'bg-[#081224] border-[#162d59] text-slate-300 hover:border-slate-500 hover:bg-[#0a1832]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="font-mono font-bold text-amber-400 text-[11px]">
                        {doc.docNo}
                      </span>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                        doc.oplType === 'Trouble' ? 'bg-rose-950 text-rose-300 border border-rose-800/50' :
                        doc.oplType === 'Kaizen' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/50' :
                        doc.oplType === 'Safety' ? 'bg-amber-950 text-amber-300 border border-amber-800/50' :
                        'bg-blue-950 text-blue-300 border border-blue-800/50'
                      }`}>
                        {doc.oplType}
                      </span>
                    </div>

                    <h4 className="font-bold line-clamp-2 text-white leading-tight">
                      {doc.title}
                    </h4>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-[#122347]">
                      <span>{doc.department} • {doc.lineNo}</span>
                      <span>Rev {doc.revNo}</span>
                    </div>

                    {/* Quick card actions */}
                    <div className="absolute top-2 right-2 hidden group-hover:flex items-center gap-1 bg-[#050b17] p-1 rounded-lg border border-[#162d59]">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteOPL(doc.id, e);
                        }}
                        className="p-1 text-slate-400 hover:text-rose-400"
                        title="Delete OPL"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Info Footer */}
          <div className="p-3 border-t border-[#122347] bg-[#050b17] text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center justify-between">
              <span>Standard Format:</span>
              <span className="text-white font-mono font-bold">A4 Word SOP</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Paper Print:</span>
              <span className="text-emerald-400 font-bold">Active Ready</span>
            </div>
          </div>
        </aside>

        {/* RIGHT AREA: THE MICROSOFT WORD STANDARD PAPER CANVAS */}
        <main className="flex-1 bg-[#0b1424] overflow-y-auto p-4 sm:p-8 flex justify-center items-start">
          
          {/* THE PAPER SHEET CONTAINER (A4 standard: 210mm x 297mm proportion) */}
          <div
            ref={paperRef}
            id="opl-printable-sheet"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
            className="w-full max-w-[850px] bg-white text-slate-900 rounded-sm shadow-2xl p-6 sm:p-8 border border-slate-300 font-sans print:m-0 print:p-0 print:border-none print:shadow-none print:w-full print:max-w-none transition-transform"
          >
            
            {/* 1. DOCUMENT HEADER (Standard Word Table Header) */}
            <div className="border-2 border-[#0f2a58] mb-3">
              <div className="grid grid-cols-12 divide-x-2 divide-[#0f2a58]">
                
                {/* Left: Plant & Logo Box */}
                <div className="col-span-3 p-3 flex flex-col justify-center items-center text-center bg-slate-50">
                  <div className="w-10 h-10 rounded-lg bg-[#0f2a58] flex items-center justify-center text-white font-black text-sm mb-1 shadow-sm">
                    DT
                  </div>
                  <div className="font-extrabold text-[11px] text-[#0f2a58] tracking-tight leading-tight">
                    {mode === 'edit' ? (
                      <input
                        type="text"
                        value={activeDoc.plantName}
                        onChange={e => updateActiveDoc(d => ({ ...d, plantName: e.target.value }))}
                        className="w-full text-center border-b border-blue-400 text-[10px] font-bold"
                      />
                    ) : (
                      activeDoc.plantName
                    )}
                  </div>
                  <span className="text-[8px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
                    Manufacturing Facility
                  </span>
                </div>

                {/* Center: Title & Subtitle */}
                <div className="col-span-6 p-3 flex flex-col justify-center items-center text-center bg-white">
                  <span className="text-[10px] font-bold text-amber-700 tracking-wider uppercase font-mono">
                    STANDARD OPERATING SHEET
                  </span>
                  <h1 className="text-xl sm:text-2xl font-black text-[#0f2a58] tracking-wider my-0.5">
                    ONE POINT LESSON (OPL)
                  </h1>
                  <span className="text-[10px] font-medium text-slate-600 italic">
                    {mode === 'edit' ? (
                      <input
                        type="text"
                        value={activeDoc.divisionName}
                        onChange={e => updateActiveDoc(d => ({ ...d, divisionName: e.target.value }))}
                        className="w-full text-center border-b border-blue-400 text-[9px]"
                      />
                    ) : (
                      activeDoc.divisionName
                    )}
                  </span>
                </div>

                {/* Right: Document Control Box */}
                <div className="col-span-3 p-2 bg-slate-50 text-[10px] flex flex-col justify-center space-y-1 font-mono">
                  <div className="flex justify-between border-b border-slate-200 pb-0.5">
                    <span className="font-bold text-slate-600">Doc No:</span>
                    {mode === 'edit' ? (
                      <input
                        type="text"
                        value={activeDoc.docNo}
                        onChange={e => updateActiveDoc(d => ({ ...d, docNo: e.target.value }))}
                        className="font-bold text-[#0f2a58] text-right w-24 border-b border-blue-400 text-[10px]"
                      />
                    ) : (
                      <span className="font-extrabold text-[#0f2a58]">{activeDoc.docNo}</span>
                    )}
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-0.5">
                    <span className="font-bold text-slate-600">Rev No:</span>
                    {mode === 'edit' ? (
                      <input
                        type="text"
                        value={activeDoc.revNo}
                        onChange={e => updateActiveDoc(d => ({ ...d, revNo: e.target.value }))}
                        className="font-bold text-slate-900 text-right w-12 border-b border-blue-400 text-[10px]"
                      />
                    ) : (
                      <span className="font-bold text-slate-800">{activeDoc.revNo}</span>
                    )}
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-0.5">
                    <span className="font-bold text-slate-600">Date:</span>
                    {mode === 'edit' ? (
                      <input
                        type="date"
                        value={activeDoc.effectiveDate}
                        onChange={e => updateActiveDoc(d => ({ ...d, effectiveDate: e.target.value }))}
                        className="text-slate-800 text-right border-b border-blue-400 text-[9px]"
                      />
                    ) : (
                      <span className="text-slate-800">{activeDoc.effectiveDate}</span>
                    )}
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-600">Page:</span>
                    <span className="text-slate-800 font-bold">{activeDoc.pageNo}</span>
                  </div>
                </div>

              </div>
            </div>

            {/* 2. METADATA & CLASSIFICATION GRID (Word Table) */}
            <table className="w-full border-collapse border border-slate-400 text-xs mb-3">
              <tbody>
                <tr className="bg-slate-100 divide-x divide-slate-300">
                  <td className="p-1.5 border border-slate-400 font-bold text-slate-700 w-1/4">
                    Department:
                    {mode === 'edit' ? (
                      <select
                        value={activeDoc.department}
                        onChange={e => updateActiveDoc(d => ({ ...d, department: e.target.value }))}
                        className="w-full mt-0.5 p-1 bg-white border border-slate-300 rounded font-normal text-xs"
                      >
                        <option value="Stitching">Stitching</option>
                        <option value="Cutting">Cutting</option>
                        <option value="Assembly">Assembly</option>
                        <option value="Maintenance">Maintenance</option>
                        <option value="Quality">Quality Assurance</option>
                        <option value="EHS">EHS / Safety</option>
                        <option value="Warehouse">Warehouse / Material</option>
                      </select>
                    ) : (
                      <span className="block font-normal text-slate-900">{activeDoc.department}</span>
                    )}
                  </td>
                  <td className="p-1.5 border border-slate-400 font-bold text-slate-700 w-1/4">
                    Machine / Line:
                    {mode === 'edit' ? (
                      <input
                        type="text"
                        value={activeDoc.lineNo}
                        onChange={e => updateActiveDoc(d => ({ ...d, lineNo: e.target.value }))}
                        className="w-full mt-0.5 p-1 bg-white border border-slate-300 rounded font-normal text-xs"
                      />
                    ) : (
                      <span className="block font-normal text-slate-900">{activeDoc.lineNo}</span>
                    )}
                  </td>
                  <td className="p-1.5 border border-slate-400 font-bold text-slate-700 w-1/4">
                    Process:
                    {mode === 'edit' ? (
                      <input
                        type="text"
                        value={activeDoc.process}
                        onChange={e => updateActiveDoc(d => ({ ...d, process: e.target.value }))}
                        className="w-full mt-0.5 p-1 bg-white border border-slate-300 rounded font-normal text-xs"
                      />
                    ) : (
                      <span className="block font-normal text-slate-900">{activeDoc.process}</span>
                    )}
                  </td>
                  <td className="p-1.5 border border-slate-400 font-bold text-slate-700 w-1/4">
                    Style / Model:
                    {mode === 'edit' ? (
                      <input
                        type="text"
                        value={activeDoc.style}
                        onChange={e => updateActiveDoc(d => ({ ...d, style: e.target.value }))}
                        className="w-full mt-0.5 p-1 bg-white border border-slate-300 rounded font-normal text-xs"
                      />
                    ) : (
                      <span className="block font-normal text-slate-900">{activeDoc.style}</span>
                    )}
                  </td>
                </tr>

                {/* Classification Checkboxes */}
                <tr className="bg-white">
                  <td colSpan={4} className="p-2 border border-slate-400">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-[#0f2a58]">OPL Classification:</span>
                      
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="oplType"
                          checked={activeDoc.oplType === 'Basic'}
                          onChange={() => updateActiveDoc(d => ({ ...d, oplType: 'Basic' }))}
                          className="text-blue-600"
                        />
                        <span className="font-semibold text-blue-900">Basic Knowledge (Pangunahin)</span>
                      </label>

                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="oplType"
                          checked={activeDoc.oplType === 'Trouble'}
                          onChange={() => updateActiveDoc(d => ({ ...d, oplType: 'Trouble' }))}
                          className="text-rose-600"
                        />
                        <span className="font-semibold text-rose-900">Trouble Case (Problema)</span>
                      </label>

                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="oplType"
                          checked={activeDoc.oplType === 'Kaizen'}
                          onChange={() => updateActiveDoc(d => ({ ...d, oplType: 'Kaizen' }))}
                          className="text-emerald-600"
                        />
                        <span className="font-semibold text-emerald-900">Kaizen (Pagpapabuti)</span>
                      </label>

                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="oplType"
                          checked={activeDoc.oplType === 'Safety'}
                          onChange={() => updateActiveDoc(d => ({ ...d, oplType: 'Safety' }))}
                          className="text-amber-600"
                        />
                        <span className="font-semibold text-amber-900">Safety & 5S (Kaligtasan)</span>
                      </label>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 3. LESSON THEME / TOPIC BANNER */}
            <div className="bg-[#0f2a58] text-white p-2.5 text-center font-bold text-sm sm:text-base tracking-wide rounded-t-sm mb-0">
              {mode === 'edit' ? (
                <div className="flex items-center gap-2">
                  <span className="text-amber-300 text-xs font-mono uppercase">THEME:</span>
                  <input
                    type="text"
                    value={activeDoc.title}
                    onChange={e => updateActiveDoc(d => ({ ...d, title: e.target.value }))}
                    className="flex-1 bg-blue-900/60 text-white font-bold px-2 py-1 rounded border border-blue-400 text-sm focus:outline-none"
                    placeholder="Enter OPL Lesson Theme..."
                  />
                </div>
              ) : (
                <div className="uppercase">THEME: {activeDoc.title}</div>
              )}
            </div>

            {/* 4. PURPOSE & OBJECTIVE BOX */}
            <div className="border-x-2 border-b-2 border-[#0f2a58] bg-slate-50 p-2 text-xs mb-3">
              <div className="flex items-start gap-2">
                <span className="font-black text-[#0f2a58] whitespace-nowrap">
                  PURPOSE & TOLERANCE:
                </span>
                {mode === 'edit' ? (
                  <textarea
                    value={activeDoc.purpose}
                    onChange={e => updateActiveDoc(d => ({ ...d, purpose: e.target.value }))}
                    rows={2}
                    className="flex-1 p-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800"
                    placeholder="Describe purpose and exact quality/safety tolerance expected..."
                  />
                ) : (
                  <span className="text-slate-800 font-medium">{activeDoc.purpose}</span>
                )}
              </div>
            </div>

            {/* 5. VISUAL COMPARISON SECTION: NG (Not Good) vs OK (Good / Standard) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              
              {/* NG BOX (Red Border) */}
              <div className="border-2 border-rose-600 rounded-sm bg-rose-50/40 p-2.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-1.5 border-b border-rose-200 mb-2">
                    <div className="flex items-center gap-1.5 text-rose-700 font-black text-xs uppercase">
                      <X className="w-4 h-4 bg-rose-600 text-white rounded-full p-0.5" />
                      {mode === 'edit' ? (
                        <input
                          type="text"
                          value={activeDoc.ngTitle}
                          onChange={e => updateActiveDoc(d => ({ ...d, ngTitle: e.target.value }))}
                          className="font-black text-rose-700 bg-white border border-rose-300 px-1 py-0.5 rounded text-xs"
                        />
                      ) : (
                        <span>{activeDoc.ngTitle}</span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono font-bold text-rose-600">INCORRECT METHOD</span>
                  </div>

                  {/* NG Image Display / Upload */}
                  <div className="relative aspect-video bg-rose-100 rounded border border-rose-300 overflow-hidden flex items-center justify-center mb-2 group">
                    {activeDoc.ngImageUrl ? (
                      <img
                        src={activeDoc.ngImageUrl}
                        alt="NG Visual Standard"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-3 text-rose-600">
                        <ImageIcon className="w-8 h-8 mx-auto opacity-40 mb-1" />
                        <span className="text-[10px] font-bold block">No NG Photo Attached</span>
                        <span className="text-[9px] text-rose-500">Upload visual of defect/wrong method</span>
                      </div>
                    )}

                    {/* Image Upload Trigger (Editor Mode) */}
                    {mode === 'edit' && (
                      <label className="absolute inset-0 bg-rose-950/60 text-white opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-xs font-bold gap-1">
                        <Upload className="w-5 h-5 text-rose-300" />
                        <span>Change NG Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => e.target.files?.[0] && handleImageUpload('ng', e.target.files[0])}
                        />
                      </label>
                    )}
                  </div>

                  {/* NG Description */}
                  <div className="text-xs text-rose-950">
                    <span className="font-bold block mb-0.5 text-rose-900">Why it is NG (Bakit Mali):</span>
                    {mode === 'edit' ? (
                      <textarea
                        value={activeDoc.ngDescription}
                        onChange={e => updateActiveDoc(d => ({ ...d, ngDescription: e.target.value }))}
                        rows={2}
                        className="w-full p-1.5 bg-white border border-rose-300 rounded text-xs text-rose-950"
                        placeholder="Explain why this method fails or violates standards..."
                      />
                    ) : (
                      <p className="text-[11px] leading-relaxed">{activeDoc.ngDescription}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* OK BOX (Green Border) */}
              <div className="border-2 border-emerald-600 rounded-sm bg-emerald-50/40 p-2.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-1.5 border-b border-emerald-200 mb-2">
                    <div className="flex items-center gap-1.5 text-emerald-700 font-black text-xs uppercase">
                      <Check className="w-4 h-4 bg-emerald-600 text-white rounded-full p-0.5" />
                      {mode === 'edit' ? (
                        <input
                          type="text"
                          value={activeDoc.okTitle}
                          onChange={e => updateActiveDoc(d => ({ ...d, okTitle: e.target.value }))}
                          className="font-black text-emerald-700 bg-white border border-emerald-300 px-1 py-0.5 rounded text-xs"
                        />
                      ) : (
                        <span>{activeDoc.okTitle}</span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono font-bold text-emerald-600">CORRECT STANDARD</span>
                  </div>

                  {/* OK Image Display / Upload */}
                  <div className="relative aspect-video bg-emerald-100 rounded border border-emerald-300 overflow-hidden flex items-center justify-center mb-2 group">
                    {activeDoc.okImageUrl ? (
                      <img
                        src={activeDoc.okImageUrl}
                        alt="OK Visual Standard"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-3 text-emerald-600">
                        <ImageIcon className="w-8 h-8 mx-auto opacity-40 mb-1" />
                        <span className="text-[10px] font-bold block">No OK Photo Attached</span>
                        <span className="text-[9px] text-emerald-500">Upload visual of standard/correct method</span>
                      </div>
                    )}

                    {/* Image Upload Trigger (Editor Mode) */}
                    {mode === 'edit' && (
                      <label className="absolute inset-0 bg-emerald-950/60 text-white opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-xs font-bold gap-1">
                        <Upload className="w-5 h-5 text-emerald-300" />
                        <span>Change OK Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => e.target.files?.[0] && handleImageUpload('ok', e.target.files[0])}
                        />
                      </label>
                    )}
                  </div>

                  {/* OK Description */}
                  <div className="text-xs text-emerald-950">
                    <span className="font-bold block mb-0.5 text-emerald-900">Standard Rule (Tamang Pamamaraan):</span>
                    {mode === 'edit' ? (
                      <textarea
                        value={activeDoc.okDescription}
                        onChange={e => updateActiveDoc(d => ({ ...d, okDescription: e.target.value }))}
                        rows={2}
                        className="w-full p-1.5 bg-white border border-emerald-300 rounded text-xs text-emerald-950"
                        placeholder="Explain the correct standard, precise dimensions, or procedure..."
                      />
                    ) : (
                      <p className="text-[11px] leading-relaxed">{activeDoc.okDescription}</p>
                    )}
                  </div>
                </div>
              </div>

            </div>

            {/* 6. STEP-BY-STEP OPERATIONAL PROCEDURES TABLE (Word Grid) */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black text-[#0f2a58] uppercase tracking-wide">
                  OPERATIONAL PROCEDURE & KEY CONTROL POINTS:
                </span>
                {mode === 'edit' && (
                  <button
                    onClick={handleAddStep}
                    className="flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Step</span>
                  </button>
                )}
              </div>

              <table className="w-full border-collapse border border-slate-400 text-xs">
                <thead>
                  <tr className="bg-[#0f2a58] text-white">
                    <th className="p-1.5 border border-slate-400 w-10 text-center">No.</th>
                    <th className="p-1.5 border border-slate-400 text-left">Standard Procedure (Pamamaraan)</th>
                    <th className="p-1.5 border border-slate-400 text-left w-1/4">Key Point & Tolerance</th>
                    <th className="p-1.5 border border-slate-400 text-left w-1/4">Reason Why (Dahilan)</th>
                    {mode === 'edit' && <th className="p-1.5 border border-slate-400 w-10 text-center">Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {activeDoc.steps.map((step, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="p-1.5 border border-slate-400 text-center font-bold text-[#0f2a58]">
                        {step.stepNo}
                      </td>
                      <td className="p-1.5 border border-slate-400">
                        {mode === 'edit' ? (
                          <textarea
                            value={step.instruction}
                            onChange={e => handleUpdateStep(idx, 'instruction', e.target.value)}
                            rows={2}
                            className="w-full p-1 bg-white border border-slate-300 rounded text-xs"
                          />
                        ) : (
                          <span className="text-slate-800">{step.instruction}</span>
                        )}
                      </td>
                      <td className="p-1.5 border border-slate-400 font-semibold text-blue-950">
                        {mode === 'edit' ? (
                          <textarea
                            value={step.keyPoint}
                            onChange={e => handleUpdateStep(idx, 'keyPoint', e.target.value)}
                            rows={2}
                            className="w-full p-1 bg-white border border-slate-300 rounded text-xs"
                          />
                        ) : (
                          <span>{step.keyPoint}</span>
                        )}
                      </td>
                      <td className="p-1.5 border border-slate-400 text-slate-700">
                        {mode === 'edit' ? (
                          <textarea
                            value={step.reason}
                            onChange={e => handleUpdateStep(idx, 'reason', e.target.value)}
                            rows={2}
                            className="w-full p-1 bg-white border border-slate-300 rounded text-xs"
                          />
                        ) : (
                          <span>{step.reason}</span>
                        )}
                      </td>
                      {mode === 'edit' && (
                        <td className="p-1.5 border border-slate-400 text-center">
                          <button
                            onClick={() => handleRemoveStep(idx)}
                            className="text-rose-600 hover:text-rose-800 p-1"
                            title="Delete step"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 7. SAFETY & QUALITY PRECAUTIONS (Word Callout Box) */}
            <div className="border-2 border-amber-500 bg-amber-50/60 p-2.5 rounded-sm mb-3 text-xs text-amber-950">
              <div className="flex items-center gap-1.5 font-bold text-amber-900 mb-1">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span className="uppercase">SAFETY & QUALITY ALERTS (PAALALA SA KALIGTASAN AT KALIDAD):</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="font-bold text-rose-900 block">• Safety Protection:</span>
                  {mode === 'edit' ? (
                    <input
                      type="text"
                      value={activeDoc.safetyPrecaution}
                      onChange={e => updateActiveDoc(d => ({ ...d, safetyPrecaution: e.target.value }))}
                      className="w-full p-1 bg-white border border-amber-300 rounded text-xs"
                    />
                  ) : (
                    <span>{activeDoc.safetyPrecaution}</span>
                  )}
                </div>
                <div>
                  <span className="font-bold text-blue-900 block">• Quality Verification:</span>
                  {mode === 'edit' ? (
                    <input
                      type="text"
                      value={activeDoc.qualityAlert}
                      onChange={e => updateActiveDoc(d => ({ ...d, qualityAlert: e.target.value }))}
                      className="w-full p-1 bg-white border border-amber-300 rounded text-xs"
                    />
                  ) : (
                    <span>{activeDoc.qualityAlert}</span>
                  )}
                </div>
              </div>
            </div>

            {/* 8. SHOP FLOOR TRAINEE SIGN-OFF ROSTER (Word Grid Table) */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-black text-[#0f2a58] uppercase tracking-wide">
                  OPERATOR TRAINING RECORD & ACKNOWLEDGMENT:
                </span>
                {mode === 'edit' && (
                  <button
                    onClick={handleAddTrainee}
                    className="flex items-center gap-1 text-[10px] font-bold text-blue-700 hover:text-blue-900 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Trainee Row</span>
                  </button>
                )}
              </div>

              <table className="w-full border-collapse border border-slate-400 text-[10px]">
                <thead>
                  <tr className="bg-slate-200 text-slate-800">
                    <th className="p-1 border border-slate-400 w-24">Date</th>
                    <th className="p-1 border border-slate-400">Trainee Name</th>
                    <th className="p-1 border border-slate-400 w-24">ID No.</th>
                    <th className="p-1 border border-slate-400 w-24">Station / Line</th>
                    <th className="p-1 border border-slate-400 w-28">Trainer Sign</th>
                    <th className="p-1 border border-slate-400 w-16 text-center">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {activeDoc.traineeRoster.map((trn, idx) => (
                    <tr key={trn.id || idx} className="bg-white">
                      <td className="p-1 border border-slate-400 text-center font-mono">
                        {mode === 'edit' ? (
                          <input
                            type="date"
                            value={trn.date}
                            onChange={e => {
                              const updated = [...activeDoc.traineeRoster];
                              updated[idx].date = e.target.value;
                              updateActiveDoc(d => ({ ...d, traineeRoster: updated }));
                            }}
                            className="w-full text-center border-b border-slate-300 text-[9px]"
                          />
                        ) : (
                          trn.date
                        )}
                      </td>
                      <td className="p-1 border border-slate-400">
                        {mode === 'edit' ? (
                          <input
                            type="text"
                            value={trn.traineeName}
                            onChange={e => {
                              const updated = [...activeDoc.traineeRoster];
                              updated[idx].traineeName = e.target.value;
                              updateActiveDoc(d => ({ ...d, traineeRoster: updated }));
                            }}
                            placeholder="Operator Full Name"
                            className="w-full border-b border-slate-300 text-[10px]"
                          />
                        ) : (
                          <span className="font-semibold text-slate-900">{trn.traineeName || '—'}</span>
                        )}
                      </td>
                      <td className="p-1 border border-slate-400 text-center font-mono">
                        {mode === 'edit' ? (
                          <input
                            type="text"
                            value={trn.traineeId}
                            onChange={e => {
                              const updated = [...activeDoc.traineeRoster];
                              updated[idx].traineeId = e.target.value;
                              updateActiveDoc(d => ({ ...d, traineeRoster: updated }));
                            }}
                            placeholder="EMP-1234"
                            className="w-full text-center border-b border-slate-300 text-[9px]"
                          />
                        ) : (
                          trn.traineeId || '—'
                        )}
                      </td>
                      <td className="p-1 border border-slate-400 text-center">
                        {mode === 'edit' ? (
                          <input
                            type="text"
                            value={trn.station}
                            onChange={e => {
                              const updated = [...activeDoc.traineeRoster];
                              updated[idx].station = e.target.value;
                              updateActiveDoc(d => ({ ...d, traineeRoster: updated }));
                            }}
                            className="w-full text-center border-b border-slate-300 text-[9px]"
                          />
                        ) : (
                          trn.station
                        )}
                      </td>
                      <td className="p-1 border border-slate-400 text-center font-mono text-[9px]">
                        {mode === 'edit' ? (
                          <input
                            type="text"
                            value={trn.trainerSign}
                            onChange={e => {
                              const updated = [...activeDoc.traineeRoster];
                              updated[idx].trainerSign = e.target.value;
                              updateActiveDoc(d => ({ ...d, traineeRoster: updated }));
                            }}
                            className="w-full text-center border-b border-slate-300 text-[9px]"
                          />
                        ) : (
                          trn.trainerSign
                        )}
                      </td>
                      <td className="p-1 border border-slate-400 text-center font-bold">
                        {mode === 'edit' ? (
                          <select
                            value={trn.result}
                            onChange={e => {
                              const updated = [...activeDoc.traineeRoster];
                              updated[idx].result = e.target.value as 'OK' | 'NG';
                              updateActiveDoc(d => ({ ...d, traineeRoster: updated }));
                            }}
                            className="text-[9px] font-bold"
                          >
                            <option value="OK">OK</option>
                            <option value="NG">NG</option>
                          </select>
                        ) : (
                          <span className={trn.result === 'OK' ? 'text-emerald-700' : 'text-rose-700'}>
                            {trn.result}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 9. APPROVAL & SIGN-OFF BLOCK (Word Signature Table) */}
            <div className="border border-slate-400 mb-3 text-xs">
              <div className="grid grid-cols-3 divide-x divide-slate-400">
                <div className="p-2 text-center bg-slate-50">
                  <span className="font-bold text-slate-600 block text-[10px] uppercase">Prepared By:</span>
                  <div className="font-black text-[#0f2a58] mt-1">
                    {mode === 'edit' ? (
                      <input
                        type="text"
                        value={activeDoc.preparedBy}
                        onChange={e => updateActiveDoc(d => ({ ...d, preparedBy: e.target.value }))}
                        className="text-center font-bold border-b border-blue-300 text-xs w-full"
                      />
                    ) : (
                      activeDoc.preparedBy
                    )}
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono block mt-0.5">
                    Date: {activeDoc.preparedDate}
                  </span>
                </div>

                <div className="p-2 text-center bg-slate-50">
                  <span className="font-bold text-slate-600 block text-[10px] uppercase">Reviewed By (QA / Lead):</span>
                  <div className="font-black text-[#0f2a58] mt-1">
                    {mode === 'edit' ? (
                      <input
                        type="text"
                        value={activeDoc.reviewedBy}
                        onChange={e => updateActiveDoc(d => ({ ...d, reviewedBy: e.target.value }))}
                        className="text-center font-bold border-b border-blue-300 text-xs w-full"
                      />
                    ) : (
                      activeDoc.reviewedBy
                    )}
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono block mt-0.5">
                    Date: {activeDoc.reviewedDate}
                  </span>
                </div>

                <div className="p-2 text-center bg-slate-50">
                  <span className="font-bold text-slate-600 block text-[10px] uppercase">Approved By (T&D Manager):</span>
                  <div className="font-black text-[#0f2a58] mt-1">
                    {mode === 'edit' ? (
                      <input
                        type="text"
                        value={activeDoc.approvedBy}
                        onChange={e => updateActiveDoc(d => ({ ...d, approvedBy: e.target.value }))}
                        className="text-center font-bold border-b border-blue-300 text-xs w-full"
                      />
                    ) : (
                      activeDoc.approvedBy
                    )}
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono block mt-0.5">
                    Date: {activeDoc.approvedDate}
                  </span>
                </div>
              </div>
            </div>

            {/* 10. AUDIT FOOTER */}
            <div className="pt-2 border-t border-slate-300 flex items-center justify-between text-[8px] text-slate-500 font-mono">
              <span>DATIAN FOOTWEAR MFG. CO., LTD. • Quality & Training Management System</span>
              <span>Form Ref: DT-FRM-TND-OPL-04 • Audit Ready Document</span>
            </div>

          </div>
        </main>
      </div>

      {/* PRINT STYLESHEET (Only prints the white paper sheet cleanly like Word) */}
      <style>{`
        @media print {
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
          }
          .no-print {
            display: none !important;
          }
          #opl-printable-sheet {
            transform: none !important;
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
        }
      `}</style>
    </div>
  );
}
