/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  X, 
  FolderTree, 
  Download, 
  CheckCircle2, 
  FileText, 
  Copy, 
  Check, 
  ShieldCheck, 
  Sparkles, 
  GraduationCap, 
  Folder, 
  ChevronRight, 
  ChevronDown, 
  Layers, 
  RefreshCw,
  Search,
  ExternalLink,
  BookOpen,
  ArrowRight
} from 'lucide-react';
import { 
  STANDARDIZED_REPOSITORY_FOLDERS, 
  ESSENTIAL_DOCUMENT_TYPES, 
  FILE_NAMING_RULE, 
  DocumentTypeSpec 
} from '../../data/repositoryBlueprint';
import { StoredFolderItem, TrainingDoc } from '../../types';

interface BlueprintArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyStandardFolders: () => void;
  foldersCount: number;
  documentsCount: number;
  onSelectFolder?: (folderId: string) => void;
}

export default function BlueprintArchitectureModal({
  isOpen,
  onClose,
  onApplyStandardFolders,
  foldersCount,
  documentsCount,
  onSelectFolder
}: BlueprintArchitectureModalProps) {
  const [activeTab, setActiveTab] = useState<'hierarchy' | 'naming' | 'doctypes' | 'checklist'>('hierarchy');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    'f-opl-root': true,
    'f-tp-root': true,
    'f-tp-leader-root': true,
    'f-tp-ehs-root': true,
    'f-tp-antibribery-root': true,
    'f-tp-stitching-root': true,
    'f-ldr-2026-b1': true
  });
  
  // Interactive File Naming Generator state
  const [genSystem, setGenSystem] = useState('TP');
  const [genCategory, setGenCategory] = useState('LDR_2026B1');
  const [genDoctype, setGenDoctype] = useState('SCH');
  const [genDesc, setGenDesc] = useState('OnboardingMasterTimeline');
  const [genDate, setGenDate] = useState(new Date().toISOString().split('T')[0].replace(/-/g, ''));
  const [genVersion, setGenVersion] = useState('v1.0');
  const [genExt, setGenExt] = useState('xlsx');
  const [copiedFilename, setCopiedFilename] = useState(false);
  const [copiedBlueprintReport, setCopiedBlueprintReport] = useState(false);

  // Search filter for Document Types table
  const [docTypeSearch, setDocTypeSearch] = useState('');

  if (!isOpen) return null;

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    STANDARDIZED_REPOSITORY_FOLDERS.forEach(f => { allExpanded[f.id] = true; });
    setExpandedFolders(allExpanded);
  };

  const collapseAll = () => {
    setExpandedFolders({});
  };

  const generatedFileName = useMemo(() => {
    const cleanDesc = genDesc.trim().replace(/[^a-zA-Z0-9]/g, '') || 'DocumentTitle';
    return `${genSystem}_${genCategory}_${genDoctype}_${cleanDesc}_${genDate}_${genVersion}.${genExt}`;
  }, [genSystem, genCategory, genDoctype, genDesc, genDate, genVersion, genExt]);

  const handleCopyFilename = () => {
    navigator.clipboard.writeText(generatedFileName);
    setCopiedFilename(true);
    setTimeout(() => setCopiedFilename(false), 2000);
  };

  // Generate markdown report for audit export
  const generateMarkdownBlueprint = () => {
    let md = `# DATIAN CSR HUB - TRAINING & DEVELOPMENT REPOSITORY BLUEPRINT\n`;
    md += `*Generated: ${new Date().toLocaleDateString()} | Author: Training & Development Manager*\n`;
    md += `*Audit Compliance: ISO 9001:2015, ISO 37001:2016, EHS/DOLE Standards*\n\n`;
    md += `## 1. ROOT DIRECTORY ARCHITECTURE\n\n`;
    md += `### ROOT 1: OPL (One-Point Lesson)\n`;
    md += `Standalone main directory dedicated to concise, visual single-point lessons, quick shop floor troubleshooting tips, and machine/process maintenance reminders.\n`;
    md += `- 01 Shop Floor Safety & PPE Visuals\n`;
    md += `- 02 Quick Machine Troubleshooting Tips\n`;
    md += `- 03 Machine & Process Maintenance Reminders\n`;
    md += `- 04 Rapid Quality Standard Guides\n\n`;

    md += `### ROOT 2: Training Program\n`;
    md += `Housing core training modules and cohorts subdivided into:\n`;
    md += `#### A. New Trainee Leader (Organized by Year & Batch Cohorts with 5 Essential Sub-folders):\n`;
    const batches = [
      '2025 1st Batch (July to August)',
      '2025 2nd Batch (July to August)',
      '2026 1st Batch (January to February)',
      '2026 2nd Batch (January to February)',
      '2026 1st Batch (August to September)',
      '2026 2nd Batch (August to September)'
    ];
    batches.forEach(b => {
      md += `- **${b}**\n`;
      md += `  1. Leadership Onboarding Schedules\n`;
      md += `  2. Attendance Sheets\n`;
      md += `  3. Training Modules\n`;
      md += `  4. Coaching Logs\n`;
      md += `  5. Evaluations\n`;
    });

    md += `\n#### B. EHS Relevant\n`;
    md += `- 01 Safety Guidelines & Manuals\n`;
    md += `- 02 Standard Operating Procedures (SOP)\n`;
    md += `- 03 Safety Compliance Documentation & Permits\n`;
    md += `- 04 Incident Reporting Tools & CAPA Logs\n\n`;

    md += `#### C. Anti Bribery\n`;
    md += `- 01 Migrated Anti-Bribery Policies (ISO 37001)\n`;
    md += `- 02 Code of Conduct Handbooks\n`;
    md += `- 03 Employee Sign-Off & Acknowledgment Forms\n`;
    md += `- 04 Compliance Training Records & Quizzes\n\n`;

    md += `#### D. Stitching Skill\n`;
    md += `- 01 Technical Sewing Training Modules\n`;
    md += `- 02 Sewing Operations Standard Operating Procedures\n`;
    md += `- 03 Quality Defect Guidelines & Blue Label Criteria\n`;
    md += `- 04 Instructional Materials & Visual Job Aids\n\n`;

    md += `## 2. STANDARDIZED FILE NAMING CONVENTION\n\n`;
    md += `**Syntax:** \`${FILE_NAMING_RULE.formula}\`\n\n`;
    md += `| Component | Description | Examples |\n|---|---|---|\n`;
    FILE_NAMING_RULE.components.forEach(c => {
      md += `| ${c.label} | ${c.description} | \`${c.examples.join('`, `')}\` |\n`;
    });

    md += `\n## 3. ESSENTIAL DOCUMENT TYPES SPECIFICATION\n\n`;
    md += `| Doctype | Name | Target Category | Retention | Approver | Audit Scope |\n|---|---|---|---|---|---|\n`;
    ESSENTIAL_DOCUMENT_TYPES.forEach(d => {
      md += `| ${d.code} | ${d.name} | ${d.category} | ${d.retentionYears} yrs | ${d.approvalAuthority} | ${d.auditRelevance} |\n`;
    });

    return md;
  };

  const handleDownloadBlueprintReport = () => {
    const md = generateMarkdownBlueprint();
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DATIAN_Repository_Blueprint_Specification_${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredDocTypes = useMemo(() => {
    if (!docTypeSearch.trim()) return ESSENTIAL_DOCUMENT_TYPES;
    const q = docTypeSearch.toLowerCase();
    return ESSENTIAL_DOCUMENT_TYPES.filter(d => 
      d.name.toLowerCase().includes(q) || 
      d.code.toLowerCase().includes(q) || 
      d.category.toLowerCase().includes(q) ||
      d.auditRelevance.toLowerCase().includes(q)
    );
  }, [docTypeSearch]);

  // Group folders by root
  const oplFolders = STANDARDIZED_REPOSITORY_FOLDERS.filter(f => f.rootCategory === 'OPL');
  const tpFolders = STANDARDIZED_REPOSITORY_FOLDERS.filter(f => f.rootCategory === 'Training Program');

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-[#071122] border border-[#1a3564] rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl shadow-blue-950/60 overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-5 bg-[#09162e] border-b border-[#162d59] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-tr from-amber-500 to-blue-600 rounded-2xl shadow-md text-slate-950 font-bold">
              <FolderTree className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-white tracking-tight">
                  T&D Document Repository Blueprint
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40">
                  Audit-Ready Specification
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Separated Root Navigation Layout: OPL (One-Point Lesson) • Training Program (New Trainee Leader Batches, EHS, Anti-Bribery, Stitching)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadBlueprintReport}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0e2247] hover:bg-[#153166] text-blue-300 hover:text-white rounded-xl text-xs font-bold transition-all border border-blue-500/30 cursor-pointer"
              title="Download Blueprint Report as Markdown"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Export Blueprint</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-[#122347] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="px-5 pt-3 border-b border-[#162d59] bg-[#060c18] flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('hierarchy')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'hierarchy' 
                  ? 'border-amber-400 text-amber-300' 
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FolderTree className="w-4 h-4" />
              <span>1. Root Navigation & Folder Architecture</span>
            </button>

            <button
              onClick={() => setActiveTab('naming')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'naming' 
                  ? 'border-amber-400 text-amber-300' 
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>2. File Naming Standard & Generator</span>
            </button>

            <button
              onClick={() => setActiveTab('doctypes')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'doctypes' 
                  ? 'border-amber-400 text-amber-300' 
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>3. Essential Document Types</span>
            </button>

            <button
              onClick={() => setActiveTab('checklist')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'checklist' 
                  ? 'border-amber-400 text-amber-300' 
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>4. Audit Readiness & Governance</span>
            </button>
          </div>

          <div className="flex items-center gap-2 py-1">
            <button
              onClick={onApplyStandardFolders}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-extrabold shadow-md cursor-pointer active:scale-98"
              title="Apply complete 40+ folder structure into active file management system"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-300" />
              <span>Re-align & Provision All Folders</span>
            </button>
          </div>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          
          {/* TAB 1: ROOT NAVIGATION & HIERARCHY TREE */}
          {activeTab === 'hierarchy' && (
            <div className="space-y-6">
              
              {/* Executive Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-[#0a1832] border border-blue-500/30 rounded-2xl p-4 flex items-start gap-3 shadow-lg">
                  <div className="p-3 bg-blue-600/20 text-amber-400 border border-blue-500/30 rounded-xl">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                      ROOT 1: OPL (One-Point Lesson)
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-900/60 text-blue-300">Standalone Root</span>
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      Dedicated shop-floor visual repository containing single-point lessons, quick machine troubleshooting tips, process maintenance reminders, and visual quality acceptance criteria.
                    </p>
                    <div className="mt-2 text-[11px] font-mono text-amber-400 flex items-center gap-3">
                      <span>4 Core Visual Sub-directories</span>
                      <span>•</span>
                      <span>Target Read Time: ≤3 min</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#0a1832] border border-blue-500/30 rounded-2xl p-4 flex items-start gap-3 shadow-lg">
                  <div className="p-3 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-xl">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                      ROOT 2: Training Program
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300">Master Enterprise Hub</span>
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      Core enterprise repository subdivided into New Trainee Leader cohorts (2025 & 2026), EHS compliance guidelines, ISO 37001 Anti-Bribery management, and technical Stitching Skills.
                    </p>
                    <div className="mt-2 text-[11px] font-mono text-emerald-400 flex items-center gap-3">
                      <span>4 Primary Branches</span>
                      <span>•</span>
                      <span>6 Batches (30 Subfolders)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tree Controls */}
              <div className="flex items-center justify-between text-xs bg-[#091429] p-3 rounded-xl border border-[#162d59]">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-slate-400">Blueprint Explorer Controls:</span>
                  <button onClick={expandAll} className="px-2.5 py-1 bg-[#102449] hover:bg-[#163266] text-blue-300 rounded text-[11px] font-bold">Expand All</button>
                  <button onClick={collapseAll} className="px-2.5 py-1 bg-[#102449] hover:bg-[#163266] text-slate-300 rounded text-[11px] font-bold">Collapse All</button>
                </div>
                <span className="text-slate-400 font-mono text-[11px]">
                  Total Architecture: 42 Standardized Directories
                </span>
              </div>

              {/* Interactive Folder Hierarchy Tree */}
              <div className="space-y-4">
                
                {/* SECTION 1: ROOT OPL */}
                <div className="bg-[#050b17] border border-[#162d59] rounded-2xl p-4 space-y-3">
                  <div 
                    onClick={() => toggleFolder('f-opl-root')}
                    className="flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      {expandedFolders['f-opl-root'] ? (
                        <ChevronDown className="w-4 h-4 text-amber-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white" />
                      )}
                      <div className="p-1.5 bg-blue-950 rounded-lg text-amber-400 border border-blue-500/30">
                        <Folder className="w-4 h-4 fill-amber-400/20 text-amber-400" />
                      </div>
                      <span className="font-extrabold text-sm text-white group-hover:text-amber-300">
                        OPL (One-Point Lesson)
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-900/50 text-blue-300">
                        /01_OPL_One_Point_Lessons/
                      </span>
                    </div>

                    {onSelectFolder && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onSelectFolder('f-opl-root'); onClose(); }}
                        className="text-[11px] font-bold text-blue-400 hover:text-white flex items-center gap-1"
                      >
                        Open Directory <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {expandedFolders['f-opl-root'] && (
                    <div className="pl-6 border-l-2 border-blue-900/40 space-y-2 pt-1">
                      <div className="bg-[#071328] p-3 rounded-xl border border-amber-500/30 flex items-start gap-3">
                        <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                        <div className="text-xs space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">Direct Standalone OPL Repository</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                              Zero Subfolder Architecture
                            </span>
                          </div>
                          <p className="text-slate-300 text-[11px] leading-relaxed">
                            Dedicated workspace for visual single-point lessons formatted for Microsoft Word standard paper printing (A4/Letter). Operates as a flat, direct directory for rapid shop floor troubleshooting and process standards without nested subfolder overhead.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* SECTION 2: ROOT TRAINING PROGRAM */}
                <div className="bg-[#050b17] border border-[#162d59] rounded-2xl p-4 space-y-4">
                  <div 
                    onClick={() => toggleFolder('f-tp-root')}
                    className="flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      {expandedFolders['f-tp-root'] ? (
                        <ChevronDown className="w-4 h-4 text-amber-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white" />
                      )}
                      <div className="p-1.5 bg-emerald-950 rounded-lg text-emerald-400 border border-emerald-500/30">
                        <GraduationCap className="w-4 h-4" />
                      </div>
                      <span className="font-extrabold text-sm text-white group-hover:text-emerald-300">
                        Training Program
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-900/50 text-emerald-300">
                        /02_Training_Program/
                      </span>
                    </div>

                    {onSelectFolder && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onSelectFolder('f-tp-root'); onClose(); }}
                        className="text-[11px] font-bold text-emerald-400 hover:text-white flex items-center gap-1"
                      >
                        Open Directory <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {expandedFolders['f-tp-root'] && (
                    <div className="pl-6 border-l-2 border-emerald-900/40 space-y-4 pt-1">
                      
                      {/* Branch A: New Trainee Leader */}
                      <div className="bg-[#071328] border border-[#162d59] rounded-xl p-3 space-y-3">
                        <div 
                          onClick={() => toggleFolder('f-tp-leader-root')}
                          className="flex items-center justify-between cursor-pointer group"
                        >
                          <div className="flex items-center gap-2">
                            {expandedFolders['f-tp-leader-root'] ? (
                              <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                            )}
                            <Folder className="w-4 h-4 text-amber-400" />
                            <span className="text-xs font-bold text-white group-hover:text-amber-300">
                              New Trainee Leader (6 Cohort Batches)
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              (5 Subfolders each: Schedules, Attendance, Modules, Coaching, Evaluations)
                            </span>
                          </div>
                        </div>

                        {expandedFolders['f-tp-leader-root'] && (
                          <div className="pl-5 space-y-3 border-l border-blue-900/30">
                            {[
                              { id: 'f-ldr-2025-b1', name: '2025 1st Batch (July to August)' },
                              { id: 'f-ldr-2025-b2', name: '2025 2nd Batch (July to August)' },
                              { id: 'f-ldr-2026-b1', name: '2026 1st Batch (January to February) ★ Active Q1' },
                              { id: 'f-ldr-2026-b2', name: '2026 2nd Batch (January to February)' },
                              { id: 'f-ldr-2026-b3', name: '2026 1st Batch (August to September)' },
                              { id: 'f-ldr-2026-b4', name: '2026 2nd Batch (August to September)' }
                            ].map(batch => (
                              <div key={batch.id} className="bg-[#050d1a] border border-[#122347] rounded-lg p-2.5 space-y-2">
                                <div 
                                  onClick={() => toggleFolder(batch.id)}
                                  className="flex items-center justify-between cursor-pointer"
                                >
                                  <div className="flex items-center gap-2">
                                    {expandedFolders[batch.id] ? (
                                      <ChevronDown className="w-3 h-3 text-amber-400" />
                                    ) : (
                                      <ChevronRight className="w-3 h-3 text-slate-500" />
                                    )}
                                    <Folder className="w-3.5 h-3.5 text-blue-400" />
                                    <span className="text-xs font-bold text-slate-200">{batch.name}</span>
                                  </div>
                                  <span className="text-[10px] font-mono text-slate-500">5 audit folders</span>
                                </div>

                                {expandedFolders[batch.id] && (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 pl-5 pt-1">
                                    {STANDARDIZED_REPOSITORY_FOLDERS.filter(f => f.parentId === batch.id).map(sub => (
                                      <div 
                                        key={sub.id}
                                        onClick={() => { if (onSelectFolder) { onSelectFolder(sub.id); onClose(); } }}
                                        className="text-[11px] p-1.5 rounded bg-[#09152b] hover:bg-[#0e2145] text-slate-300 hover:text-white border border-[#142852] cursor-pointer flex items-center justify-between gap-1"
                                      >
                                        <span className="truncate">{sub.name}</span>
                                        <ChevronRight className="w-3 h-3 text-slate-500 flex-shrink-0" />
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Branch B: EHS Relevant */}
                      <div className="bg-[#071328] border border-[#162d59] rounded-xl p-3 space-y-2">
                        <div 
                          onClick={() => toggleFolder('f-tp-ehs-root')}
                          className="flex items-center justify-between cursor-pointer group"
                        >
                          <div className="flex items-center gap-2">
                            {expandedFolders['f-tp-ehs-root'] ? (
                              <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                            )}
                            <Folder className="w-4 h-4 text-emerald-400" />
                            <span className="text-xs font-bold text-white group-hover:text-emerald-300">
                              EHS Relevant
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              (Guidelines, SOPs, Safety Compliance, Incident Reporting Tools)
                            </span>
                          </div>
                        </div>

                        {expandedFolders['f-tp-ehs-root'] && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-5 pt-1">
                            {STANDARDIZED_REPOSITORY_FOLDERS.filter(f => f.parentId === 'f-tp-ehs-root').map(sub => (
                              <div 
                                key={sub.id} 
                                onClick={() => { if (onSelectFolder) { onSelectFolder(sub.id); onClose(); } }}
                                className="bg-[#050d1a] hover:bg-[#0c1e3d] p-2 rounded-lg border border-[#122347] flex items-center justify-between cursor-pointer"
                              >
                                <span className="text-xs font-bold text-slate-300 hover:text-white truncate">{sub.name}</span>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Branch C: Anti Bribery */}
                      <div className="bg-[#071328] border border-[#162d59] rounded-xl p-3 space-y-2">
                        <div 
                          onClick={() => toggleFolder('f-tp-antibribery-root')}
                          className="flex items-center justify-between cursor-pointer group"
                        >
                          <div className="flex items-center gap-2">
                            {expandedFolders['f-tp-antibribery-root'] ? (
                              <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                            )}
                            <Folder className="w-4 h-4 text-purple-400" />
                            <span className="text-xs font-bold text-white group-hover:text-purple-300">
                              Anti Bribery
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              (Migrated Policies, Code Handbooks, Employee Sign-Offs, Compliance Records)
                            </span>
                          </div>
                        </div>

                        {expandedFolders['f-tp-antibribery-root'] && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-5 pt-1">
                            {STANDARDIZED_REPOSITORY_FOLDERS.filter(f => f.parentId === 'f-tp-antibribery-root').map(sub => (
                              <div 
                                key={sub.id} 
                                onClick={() => { if (onSelectFolder) { onSelectFolder(sub.id); onClose(); } }}
                                className="bg-[#050d1a] hover:bg-[#0c1e3d] p-2 rounded-lg border border-[#122347] flex items-center justify-between cursor-pointer"
                              >
                                <span className="text-xs font-bold text-slate-300 hover:text-white truncate">{sub.name}</span>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Branch D: Stitching Skill */}
                      <div className="bg-[#071328] border border-[#162d59] rounded-xl p-3 space-y-2">
                        <div 
                          onClick={() => toggleFolder('f-tp-stitching-root')}
                          className="flex items-center justify-between cursor-pointer group"
                        >
                          <div className="flex items-center gap-2">
                            {expandedFolders['f-tp-stitching-root'] ? (
                              <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                            )}
                            <Folder className="w-4 h-4 text-amber-400" />
                            <span className="text-xs font-bold text-white group-hover:text-amber-300">
                              Stitching Skill
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              (Technical Modules, Sewing SOPs, Quality Defect Guidelines, Visual Aids)
                            </span>
                          </div>
                        </div>

                        {expandedFolders['f-tp-stitching-root'] && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-5 pt-1">
                            {STANDARDIZED_REPOSITORY_FOLDERS.filter(f => f.parentId === 'f-tp-stitching-root').map(sub => (
                              <div 
                                key={sub.id} 
                                onClick={() => { if (onSelectFolder) { onSelectFolder(sub.id); onClose(); } }}
                                className="bg-[#050d1a] hover:bg-[#0c1e3d] p-2 rounded-lg border border-[#122347] flex items-center justify-between cursor-pointer"
                              >
                                <span className="text-xs font-bold text-slate-300 hover:text-white truncate">{sub.name}</span>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: FILE NAMING CONVENTION & GENERATOR */}
          {activeTab === 'naming' && (
            <div className="space-y-6">
              <div className="bg-[#0a1832] border border-blue-500/30 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-400" />
                    Standard Audit File Naming Formula
                  </h3>
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                    Strict Audit Rule
                  </span>
                </div>
                <div className="bg-[#050b17] border border-[#162d59] rounded-xl p-3 font-mono text-sm text-amber-300 font-bold tracking-wide overflow-x-auto">
                  {FILE_NAMING_RULE.formula}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Every file uploaded or migrated into the DATIAN CSR HUB repository must comply with this standardized structure. It eliminates broken links, ensures cross-platform compatibility, supports chronological archiving, and passes Buyer / ISO 9001 / ISO 37001 document control audits.
                </p>
              </div>

              {/* Breakdown Table */}
              <div className="bg-[#050b17] border border-[#162d59] rounded-2xl overflow-hidden">
                <div className="p-3 bg-[#09162e] border-b border-[#162d59]">
                  <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                    Formula Segments & Controlled Vocabulary
                  </h4>
                </div>
                <div className="divide-y divide-[#122347] text-xs">
                  {FILE_NAMING_RULE.components.map((comp) => (
                    <div key={comp.label} className="p-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div className="font-mono font-bold text-amber-300">[{comp.label}]</div>
                      <div className="text-slate-300">{comp.description}</div>
                      <div className="font-mono text-[11px] text-blue-300">{comp.examples.join(', ')}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Interactive File Name Generator */}
              <div className="bg-[#071328] border border-blue-500/40 rounded-2xl p-5 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-white uppercase font-mono tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Interactive File Name Generator & Validator
                  </h4>
                  <span className="text-[11px] text-slate-400">Generate audit-ready filename instantly</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-1">1. ROOT SYSTEM</label>
                    <select
                      value={genSystem}
                      onChange={(e) => setGenSystem(e.target.value)}
                      className="w-full bg-[#050b17] border border-[#162d59] rounded-lg px-2.5 py-1.5 text-white font-mono"
                    >
                      <option value="OPL">OPL (One-Point Lesson)</option>
                      <option value="TP">TP (Training Program)</option>
                      <option value="EHS">EHS (Safety)</option>
                      <option value="AB">AB (Anti-Bribery)</option>
                      <option value="ST">ST (Stitching)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-1">2. CATEGORY / BATCH</label>
                    <select
                      value={genCategory}
                      onChange={(e) => setGenCategory(e.target.value)}
                      className="w-full bg-[#050b17] border border-[#162d59] rounded-lg px-2.5 py-1.5 text-white font-mono"
                    >
                      <option value="LDR_2025B1">LDR_2025B1</option>
                      <option value="LDR_2025B2">LDR_2025B2</option>
                      <option value="LDR_2026B1">LDR_2026B1</option>
                      <option value="LDR_2026B2">LDR_2026B2</option>
                      <option value="LDR_2026B3">LDR_2026B3</option>
                      <option value="LDR_2026B4">LDR_2026B4</option>
                      <option value="SAF">SAF (Safety)</option>
                      <option value="MCH">MCH (Machine)</option>
                      <option value="POL">POL (Policy)</option>
                      <option value="QAS">QAS (Quality)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-1">3. DOCTYPE</label>
                    <select
                      value={genDoctype}
                      onChange={(e) => setGenDoctype(e.target.value)}
                      className="w-full bg-[#050b17] border border-[#162d59] rounded-lg px-2.5 py-1.5 text-white font-mono"
                    >
                      <option value="SCH">SCH (Schedule)</option>
                      <option value="ATT">ATT (Attendance)</option>
                      <option value="MOD">MOD (Module)</option>
                      <option value="LOG">LOG (Coaching Log)</option>
                      <option value="EVAL">EVAL (Evaluation)</option>
                      <option value="SOP">SOP (Standard Proc)</option>
                      <option value="INC">INC (Incident Report)</option>
                      <option value="ACK">ACK (Sign-off Ack)</option>
                      <option value="DEF">DEF (Defect Guide)</option>
                      <option value="OPL">OPL (Lesson Card)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2 lg:col-span-1">
                    <label className="block text-[10px] font-mono text-slate-400 mb-1">4. DESCRIPTION</label>
                    <input
                      type="text"
                      value={genDesc}
                      onChange={(e) => setGenDesc(e.target.value)}
                      placeholder="PascalCaseTitle"
                      className="w-full bg-[#050b17] border border-[#162d59] rounded-lg px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-1">5. VERSION & EXT</label>
                    <div className="flex gap-1">
                      <select
                        value={genVersion}
                        onChange={(e) => setGenVersion(e.target.value)}
                        className="w-1/2 bg-[#050b17] border border-[#162d59] rounded-lg px-1.5 py-1.5 text-white font-mono text-[11px]"
                      >
                        <option value="v1.0">v1.0</option>
                        <option value="v1.1">v1.1</option>
                        <option value="v2.0">v2.0</option>
                        <option value="v3.0">v3.0</option>
                      </select>
                      <select
                        value={genExt}
                        onChange={(e) => setGenExt(e.target.value)}
                        className="w-1/2 bg-[#050b17] border border-[#162d59] rounded-lg px-1.5 py-1.5 text-white font-mono text-[11px]"
                      >
                        <option value="pdf">.pdf</option>
                        <option value="xlsx">.xlsx</option>
                        <option value="docx">.docx</option>
                        <option value="pptx">.pptx</option>
                        <option value="png">.png</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Generated Output */}
                <div className="p-3 bg-[#050b17] border border-amber-400/40 rounded-xl flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono text-slate-400 uppercase block">Generated Compliant Filename:</span>
                    <span className="text-xs font-mono font-bold text-amber-300 truncate block mt-0.5 select-all">
                      {generatedFileName}
                    </span>
                  </div>
                  <button
                    onClick={handleCopyFilename}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex-shrink-0"
                  >
                    {copiedFilename ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Copied ✓</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Name</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ESSENTIAL DOCUMENT TYPES SPECIFICATION */}
          {activeTab === 'doctypes' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-extrabold text-white">Essential Audit-Ready Document Types</h3>
                  <p className="text-xs text-slate-400">Specifications, retention periods, approval authority, and audit evidence requirements</p>
                </div>
                <div className="relative w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={docTypeSearch}
                    onChange={(e) => setDocTypeSearch(e.target.value)}
                    placeholder="Filter document types..."
                    className="w-full pl-8 pr-3 py-1 bg-[#050b17] border border-[#162d59] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="bg-[#050b17] border border-[#162d59] rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-[#09162e] border-b border-[#162d59] text-[11px] font-mono text-slate-400 uppercase">
                      <tr>
                        <th className="p-3">Doctype Code</th>
                        <th className="p-3">Official Document Title</th>
                        <th className="p-3">Repository Branch</th>
                        <th className="p-3">Approval Authority</th>
                        <th className="p-3">Retention</th>
                        <th className="p-3">Audit Scope</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#122347]">
                      {filteredDocTypes.map((doc) => (
                        <tr key={doc.code} className="hover:bg-[#09152b] transition-colors">
                          <td className="p-3 font-mono font-bold text-amber-400">{doc.code}</td>
                          <td className="p-3">
                            <span className="font-bold text-white block">{doc.name}</span>
                            <span className="text-[11px] text-slate-400 line-clamp-1">{doc.description}</span>
                          </td>
                          <td className="p-3 font-mono text-[11px] text-blue-300">{doc.category}</td>
                          <td className="p-3 text-[11px]">{doc.approvalAuthority}</td>
                          <td className="p-3 font-mono text-[11px] text-emerald-400">{doc.retentionYears} Years</td>
                          <td className="p-3 text-[11px] text-slate-400">{doc.auditRelevance}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: AUDIT READINESS & GOVERNANCE */}
          {activeTab === 'checklist' && (
            <div className="space-y-5">
              <div className="bg-[#0a1832] border border-blue-500/30 rounded-2xl p-4">
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  ISO 9001 / ISO 37001 / DOLE & Buyer Audit Readiness Framework
                </h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  To achieve 100% audit compliance during brand factory inspections and formal ISO certifications, all training repositories must enforce the following 5 Document Control Criteria:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-[#050b17] border border-[#162d59] rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-white">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>1. Strict Folder Cohort Separation</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    Each New Trainee Leader batch (2025 1st & 2nd, 2026 1st & 2nd, 2026 August-September) must never mix records. Schedules, attendance, modules, coaching logs, and evaluations must reside solely in their respective batch sub-folders.
                  </p>
                </div>

                <div className="bg-[#050b17] border border-[#162d59] rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-white">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>2. Attendance Verification & Sign-off Integrity</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    Attendance sheets must have employee signatures or verified biometric machine clock-in matching production timecards to verify paid training hours without unrecorded overtime.
                  </p>
                </div>

                <div className="bg-[#050b17] border border-[#162d59] rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-white">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>3. Anti-Bribery 100% Employee Attestation</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    Under ISO 37001 and buyer CSR codes, 100% of newly onboarded trainee leaders and floor supervisors must have signed anti-bribery acknowledgments filed within 30 days of hiring.
                  </p>
                </div>

                <div className="bg-[#050b17] border border-[#162d59] rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-white">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>4. OPL Visual Shop Floor Auditing</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    OPL visual lessons must be laminated or digitally accessible at workstations, reviewed every 6 months, and obsolete versions stamped "SUPERSEDED" to prevent unauthorized shop floor deviations.
                  </p>
                </div>
              </div>

              {/* Action Banner */}
              <div className="p-4 bg-gradient-to-r from-blue-950 to-indigo-950 border border-blue-500/40 rounded-2xl flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-extrabold text-white">Ensure Repository is Fully Aligned</h4>
                  <p className="text-xs text-slate-300">Click below to ensure all 42 directories and audit-ready template documents are instantiated in your system.</p>
                </div>

                <button
                  onClick={onApplyStandardFolders}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold rounded-xl text-xs shadow-lg cursor-pointer transition-all active:scale-95"
                >
                  Apply Audit Architecture to Storage
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-[#060c18] border-t border-[#162d59] flex items-center justify-between text-xs text-slate-400">
          <span className="font-mono">
            Active System Status: {foldersCount} folders • {documentsCount} repository files
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#0e2247] hover:bg-[#163266] text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Close Blueprint
          </button>
        </div>

      </div>
    </div>
  );
}
