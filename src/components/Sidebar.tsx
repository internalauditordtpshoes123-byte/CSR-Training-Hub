/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ActiveTab, UserRole } from '../types';
import { EditableText } from './EditableText';
import DatianLogo from './DatianLogo';
import { useLanguage } from '../services/i18n';
import { 
  Building2, 
  GraduationCap, 
  LayoutDashboard, 
  Scissors, 
  Users, 
  BookOpen, 
  Folder,
  BarChart3,
  MessageSquare,
  Calendar,
  Settings,
  Database,
  LogOut,
  Cloud,
  Shield,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  Sparkles,
  Globe
} from 'lucide-react';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  role: UserRole;
  setRole: (role: UserRole) => void;
  companyLogo: string | null;
  onClickLogo?: () => void;
  unreadCount?: number;
  onLogout?: () => void;
  onTriggerBackup?: () => void;
}

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  collapsed, 
  setCollapsed,
  role,
  setRole,
  companyLogo,
  onClickLogo,
  unreadCount = 0,
  onLogout,
  onTriggerBackup
}: SidebarProps) {
  const { language, setLanguage, t } = useLanguage();
  
  // Expanded states for nested root repositories
  const [trainingProgramOpen, setTrainingProgramOpen] = React.useState(true);
  const [leaderBatchesOpen, setLeaderBatchesOpen] = React.useState(false);

  const navigateToFolder = (folderId: string, rootCategory: 'ALL' | 'OPL' | 'TP' | 'LDR' | 'EHS' | 'AB' | 'ST', tab: ActiveTab) => {
    setActiveTab(tab);
    window.dispatchEvent(new CustomEvent('open-document-folder', { 
      detail: { folderId, rootCategory } 
    }));
  };

  // 2. Root Architecture: Training Program Sub-Branches & Cohorts
  const leaderCohorts = [
    { id: 'f-ldr-2025-b1', label: '2025 1st Batch (Jul-Aug)' },
    { id: 'f-ldr-2025-b2', label: '2025 2nd Batch (Jul-Aug)' },
    { id: 'f-ldr-2026-b1', label: '2026 1st Batch (Jan-Feb)' },
    { id: 'f-ldr-2026-b2', label: '2026 2nd Batch (Jan-Feb)' },
    { id: 'f-ldr-2026-b3', label: '2026 1st Batch (Aug-Sep)' },
    { id: 'f-ldr-2026-b4', label: '2026 2nd Batch (Aug-Sep)' }
  ];

  // Operations & Master section items
  const operationsItems = [
    { 
      id: 'employees' as ActiveTab, 
      label: t('nav.employees', 'Employee List'), 
      icon: Users,
      badge: null
    },
    { 
      id: 'dashboard' as ActiveTab, 
      label: t('nav.dashboard', 'Dashboard'), 
      icon: LayoutDashboard,
      badge: null
    },
    { 
      id: 'documents' as ActiveTab, 
      label: t('nav.documents', 'File Management'), 
      icon: Folder,
      badge: null
    }
  ];

  // Management section items (ONLY Messages may have a realtime unread count badge)
  const managementItems = [
    { 
      id: 'reports' as ActiveTab, 
      label: t('nav.reports', 'Reports'), 
      icon: BarChart3,
      badge: null
    },
    { 
      id: 'messages' as ActiveTab, 
      label: t('nav.messages', 'Messages'), 
      icon: MessageSquare,
      badge: (unreadCount && unreadCount > 0) ? String(unreadCount) : null
    },
    { 
      id: 'calendar' as ActiveTab, 
      label: t('nav.calendar', 'Calendar'), 
      icon: Calendar,
      badge: null
    }
  ];

  // System section items
  const systemItems = [
    { 
      id: 'settings' as ActiveTab, 
      label: t('nav.settings', 'Settings'), 
      icon: Settings,
      badge: null
    },
    { 
      id: 'backup' as ActiveTab, 
      label: t('nav.backup', 'Backup & Cloud Sync'), 
      icon: Database,
      badge: null
    }
  ];

  return (
    <aside 
      className={`bg-[#060c18] border-r border-[#121f38] text-slate-200 flex flex-col h-screen transition-all duration-300 ease-in-out select-none flex-shrink-0 relative z-30 shadow-2xl ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* 1. Brand Logo & Header Area (Clean, Transparent Background with No White Box) */}
      <div className="p-3 border-b border-[#121f38] flex items-center justify-between min-h-[86px]">
        <div 
          onClick={onClickLogo}
          className="w-full flex items-center justify-center overflow-hidden cursor-pointer group transition-transform active:scale-98"
          title="Click to customize company branding"
        >
          <div className="w-full h-16 rounded-xl bg-transparent flex items-center justify-center px-1 py-1 flex-shrink-0 group-hover:scale-[1.03] transition-transform">
            <DatianLogo size="custom" className="w-full max-w-[210px] h-12" imageSrc={companyLogo} />
          </div>
        </div>
        
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="text-slate-400 hover:text-amber-400 p-1.5 rounded-lg hover:bg-[#0f1d38] cursor-pointer hidden md:flex items-center justify-center transition-colors ml-1"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* 2. Scrollable Navigation Menu */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin">
        
        {/* Section 1: REPOSITORY ROOT NAVIGATION */}
        <div>
          {!collapsed && (
            <div className="flex items-center justify-between px-3 mb-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                {t('nav.repoRoot', 'ROOT REPOSITORIES')}
              </p>
              <span className="text-[9px] font-mono text-amber-400 font-bold bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/30">
                AUDIT ARCHITECTURE
              </span>
            </div>
          )}

          <ul className="space-y-2">
            
            {/* 1. ROOT 1: OPL (One-Point Lesson) - Direct Clean Root */}
            <li>
              <button
                onClick={() => {
                  setActiveTab('opl');
                  window.dispatchEvent(new CustomEvent('open-document-folder', { 
                    detail: { folderId: 'f-opl-root', rootCategory: 'OPL' } 
                  }));
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all duration-200 cursor-pointer ${
                  activeTab === 'opl' 
                    ? 'bg-[#2a2007] border border-[#a17014] text-[#fbbf24] shadow-[0_0_12px_rgba(245,158,11,0.2)] font-bold' 
                    : 'text-slate-300 hover:text-white hover:bg-[#0d182e] border border-transparent font-medium'
                }`}
                title={collapsed ? "OPL (One-Point Lesson)" : undefined}
              >
                <Sparkles className={`w-4 h-4 flex-shrink-0 ${activeTab === 'opl' ? 'text-[#fbbf24]' : 'text-amber-400'}`} />
                {!collapsed && (
                  <span className="truncate flex-1 text-left">OPL (One-Point Lesson)</span>
                )}
                {!collapsed && (
                  <span className="text-[9px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 px-1.5 py-0.5 rounded font-mono">
                    Root
                  </span>
                )}
              </button>
            </li>

            {/* 2. ROOT 2: Training Program */}
            <li>
              <div className="space-y-1">
                <button
                  onClick={() => {
                    setActiveTab('training-program');
                    window.dispatchEvent(new CustomEvent('open-document-folder', { 
                      detail: { folderId: 'f-tp-root', rootCategory: 'TP' } 
                    }));
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all duration-200 cursor-pointer ${
                    activeTab === 'training-program' 
                      ? 'bg-[#0f291e] border border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)] font-bold' 
                      : 'text-slate-300 hover:text-white hover:bg-[#0d182e] border border-transparent font-medium'
                  }`}
                  title={collapsed ? "Training Program" : undefined}
                >
                  <GraduationCap className={`w-4 h-4 flex-shrink-0 ${activeTab === 'training-program' ? 'text-emerald-300' : 'text-emerald-400'}`} />
                  {!collapsed && (
                    <span className="truncate flex-1 text-left">Training Program</span>
                  )}
                  {!collapsed && (
                    <span className="text-[9px] font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 px-1.5 py-0.5 rounded font-mono">
                      Hub
                    </span>
                  )}
                </button>

                {/* Training Program Sub-Branches */}
                {!collapsed && (
                  <ul className="ml-4 pl-3 border-l border-emerald-500/30 space-y-1 animate-fadeIn">
                    
                    {/* Branch A: New Trainee Leader */}
                    <li>
                      <button
                        onClick={() => setActiveTab('leadership')}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-[11px] transition-colors cursor-pointer text-left ${
                          activeTab === 'leadership' 
                            ? 'text-amber-300 bg-amber-950/40 font-bold' 
                            : 'text-slate-300 hover:text-amber-300 hover:bg-[#122347]'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Users className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                          <span className="truncate font-semibold">New Trainee Leader</span>
                        </div>
                        <span className="text-[9px] font-mono text-slate-400">6 Batches</span>
                      </button>

                      {/* 6 Batch Cohorts */}
                      {(activeTab === 'leadership' || leaderBatchesOpen) && (
                        <ul className="ml-3 pl-2.5 border-l border-blue-500/20 space-y-0.5 my-1">
                          {leaderCohorts.map(cohort => (
                            <li key={cohort.id}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigateToFolder(cohort.id, 'LDR', 'training-program');
                                }}
                                className="w-full flex items-center gap-1.5 px-1.5 py-1 rounded text-[10px] text-slate-400 hover:text-white hover:bg-[#09152b] transition-colors cursor-pointer truncate text-left"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400/80 flex-shrink-0" />
                                <span className="truncate">{cohort.label}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>

                    {/* Branch B: EHS Relevant */}
                    <li>
                      <button
                        onClick={() => {
                          setActiveTab('ehs');
                          window.dispatchEvent(new CustomEvent('open-document-folder', { 
                            detail: { folderId: 'f-tp-ehs-root', rootCategory: 'EHS' } 
                          }));
                        }}
                        className={`w-full flex items-center gap-2 px-2 py-1 rounded-lg text-[11px] transition-colors cursor-pointer text-left ${
                          activeTab === 'ehs' 
                            ? 'text-emerald-300 bg-emerald-950/40 font-bold' 
                            : 'text-slate-300 hover:text-emerald-300 hover:bg-[#122347]'
                        }`}
                      >
                        <Shield className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        <span className="truncate font-semibold">EHS Relevant</span>
                      </button>
                    </li>

                    {/* Branch C: Anti Bribery */}
                    <li>
                      <button
                        onClick={() => setActiveTab('brand-hub')}
                        className={`w-full flex items-center gap-2 px-2 py-1 rounded-lg text-[11px] transition-colors cursor-pointer text-left ${
                          activeTab === 'brand-hub' 
                            ? 'text-purple-300 bg-purple-950/40 font-bold' 
                            : 'text-slate-300 hover:text-purple-300 hover:bg-[#122347]'
                        }`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                        <span className="truncate font-semibold">Anti Bribery</span>
                      </button>
                    </li>

                    {/* Branch D: Stitching Skill */}
                    <li>
                      <button
                        onClick={() => setActiveTab('stitching')}
                        className={`w-full flex items-center gap-2 px-2 py-1 rounded-lg text-[11px] transition-colors cursor-pointer text-left ${
                          activeTab === 'stitching' 
                            ? 'text-amber-300 bg-amber-950/40 font-bold' 
                            : 'text-slate-300 hover:text-amber-300 hover:bg-[#122347]'
                        }`}
                      >
                        <Scissors className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                        <span className="truncate font-semibold">Stitching Skill</span>
                      </button>

                      {/* Stitching Line Sub-Folders */}
                      {activeTab === 'stitching' && (
                        <ul className="ml-3 pl-2.5 border-l border-amber-500/20 space-y-0.5 my-1">
                          {[
                            { id: 'stitching-a', name: 'Stitching A' },
                            { id: 'stitching-b', name: 'Stitching B' },
                            { id: 'stitching-d', name: 'Stitching D' },
                            { id: 'stitching-f', name: 'Stitching F' }
                          ].map((subFolder) => (
                            <li key={subFolder.id}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveTab('stitching');
                                  window.dispatchEvent(new CustomEvent('switch-stitching-folder', { detail: { folderId: subFolder.id } }));
                                }}
                                className="w-full flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[10px] text-slate-400 hover:text-amber-300 hover:bg-[#1a1405] transition-colors cursor-pointer text-left"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80 flex-shrink-0" />
                                <span className="truncate">{subFolder.name}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>

                    {/* Branch E: Department Training */}
                    <li>
                      <button
                        onClick={() => setActiveTab('department')}
                        className={`w-full flex items-center gap-2 px-2 py-1 rounded-lg text-[11px] transition-colors cursor-pointer text-left ${
                          activeTab === 'department' 
                            ? 'text-blue-300 bg-blue-950/40 font-bold' 
                            : 'text-slate-300 hover:text-blue-300 hover:bg-[#122347]'
                        }`}
                      >
                        <Building2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                        <span className="truncate font-semibold">Department Training</span>
                      </button>
                    </li>

                  </ul>
                )}
              </div>
            </li>

          </ul>
        </div>

        {/* Section 2: OPERATIONS & MASTER DIRECTORY */}
        <div className="pt-2 border-t border-[#121f38]/80">
          {!collapsed && (
            <div className="flex items-center justify-between px-3 mb-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                {t('nav.operations', 'OPERATIONS & DATA')}
              </p>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </div>
          )}
          <ul className="space-y-1.5">
            {operationsItems.map((item) => {
              const IconComp = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <li key={item.id}>
                  <button
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all duration-200 cursor-pointer ${
                      isActive 
                        ? 'bg-[#312308] border border-[#785311]/70 text-[#fbbf24] shadow-[0_0_15px_rgba(245,158,11,0.15)] font-bold' 
                        : 'text-slate-300 hover:text-white hover:bg-[#0d182e] border border-transparent font-medium'
                    }`}
                    title={collapsed ? item.label : undefined}
                  >
                    <IconComp className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-[#fbbf24]' : 'text-slate-400'}`} />
                    {!collapsed && (
                      <span className="truncate flex-1 text-left">{item.label}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Section 2: MANAGEMENT */}
        <div className="pt-2 border-t border-[#121f38]/80">
          {!collapsed && (
            <div className="flex items-center justify-between px-3 mb-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                {t('nav.management', 'MANAGEMENT')}
              </p>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </div>
          )}
          <ul className="space-y-1.5">
            {managementItems.map((item) => {
              const IconComp = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <li key={item.id}>
                  <button
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all duration-200 cursor-pointer ${
                      isActive 
                        ? 'bg-[#312308] border border-[#785311]/70 text-[#fbbf24] shadow-[0_0_15px_rgba(245,158,11,0.15)] font-bold' 
                        : 'text-slate-300 hover:text-white hover:bg-[#0d182e] border border-transparent font-medium'
                    }`}
                    title={collapsed ? item.label : undefined}
                  >
                    <IconComp className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-[#fbbf24]' : 'text-slate-400'}`} />
                    {!collapsed && (
                      <span className="truncate flex-1 text-left">{item.label}</span>
                    )}
                    {!collapsed && item.badge && (
                      <span className="text-[10px] font-bold bg-[#f59e0b] text-slate-950 w-5 h-5 flex items-center justify-center rounded-full font-mono shadow-sm shadow-amber-500/20">
                        {item.badge}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Section 3: System */}
        <div className="pt-2 border-t border-[#121f38]/80">
          {!collapsed && (
            <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 font-mono">
              {t('nav.system', 'SYSTEM')}
            </p>
          )}
          <ul className="space-y-1.5">
            {systemItems.map((item) => {
              const IconComp = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <li key={item.id}>
                  <button
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all duration-200 cursor-pointer ${
                      isActive 
                        ? 'bg-[#312308] border border-[#785311]/70 text-[#fbbf24] shadow-[0_0_15px_rgba(245,158,11,0.15)] font-bold' 
                        : 'text-slate-300 hover:text-white hover:bg-[#0d182e] border border-transparent font-medium'
                    }`}
                    title={collapsed ? item.label : undefined}
                  >
                    <IconComp className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-[#fbbf24]' : 'text-slate-400'}`} />
                    {!collapsed && (
                      <span className="truncate flex-1 text-left">{item.label}</span>
                    )}
                  </button>
                </li>
              );
            })}

            {/* Language Switcher in Sidebar */}
            <li>
              <button
                onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs text-slate-300 hover:text-amber-300 hover:bg-[#0d182e] transition-all cursor-pointer font-medium"
                title={language === 'en' ? '切换为中文' : 'Switch to English'}
              >
                <Globe className="w-4 h-4 text-amber-400 flex-shrink-0" />
                {!collapsed && (
                  <div className="flex-1 flex items-center justify-between">
                    <span className="truncate text-left">{language === 'en' ? 'Language / 语言' : '语言 / Language'}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {language === 'en' ? 'EN' : '中文'}
                    </span>
                  </div>
                )}
              </button>
            </li>

            {/* Backup / Cloud Sync Button */}
            <li>
              <button
                onClick={onTriggerBackup}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-[#0d182e] transition-all cursor-pointer font-medium"
                title={collapsed ? t('nav.backup', 'Backup & Cloud Sync') : undefined}
              >
                <Cloud className="w-4 h-4 text-slate-400 flex-shrink-0" />
                {!collapsed && (
                  <span className="truncate flex-1 text-left">{t('nav.backup', 'Backup & Cloud Sync')}</span>
                )}
              </button>
            </li>

            {/* Log Out Button */}
            <li>
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs text-slate-300 hover:text-rose-400 hover:bg-[#1a0f1d] transition-all cursor-pointer font-medium"
                title={collapsed ? t('nav.logout', 'Log Out') : undefined}
              >
                <LogOut className="w-4 h-4 text-slate-400 flex-shrink-0" />
                {!collapsed && (
                  <span className="truncate flex-1 text-left">{t('nav.logout', 'Log Out')}</span>
                )}
              </button>
            </li>
          </ul>
        </div>

      </div>

      {/* 3. Bottom Compliance Status Card */}
      <div className="p-3 border-t border-[#121f38] bg-[#050914]">
        {!collapsed ? (
          <div className="p-3 rounded-xl bg-[#091326] border border-amber-500/30 flex items-center gap-3 shadow-md shadow-black/40">
            <div className="w-9 h-9 rounded-lg bg-[#142347] border border-amber-500/40 flex items-center justify-center text-amber-400 flex-shrink-0">
              <Shield className="w-5 h-5 text-amber-400" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white tracking-wide">{t('nav.compliance', 'Compliance')}</div>
              <div className="text-[9px] text-amber-200/80 truncate font-medium">
                {t('nav.integrity', 'Integrity • Accountability • Excellence')}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center" title={`${t('nav.compliance', 'Compliance')}: ${t('nav.integrity', 'Integrity • Accountability • Excellence')}`}>
            <div className="w-9 h-9 rounded-lg bg-[#091326] border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Shield className="w-4 h-4" />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

