/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  User, 
  KeyRound, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  Upload, 
  Check, 
  RefreshCw, 
  X, 
  ShieldCheck, 
  ArrowRight,
  ImageIcon,
  Sparkles,
  CheckCircle2,
  Building2,
  Search
} from 'lucide-react';
import { UserRole, AuthenticatedEmployee, Employee } from '../types';
import { 
  loginWithEmployeeCredentials, 
  saveCompanyLogoPermanently, 
  resetCompanyLogoPermanently 
} from '../services/realtimeSync';
import { getSavedEmployees } from '../data';
import { DEFAULT_SECTION_LEADERS } from '../utils/sectionSecurity';

interface LoginScreenProps {
  onLoginSuccess: (
    username: string, 
    role?: UserRole, 
    userEmail?: string, 
    employee?: AuthenticatedEmployee
  ) => void;
  customLogo?: string | null;
  employees?: Employee[];
  onLogoChange?: (newLogo: string | null) => void;
}

const ADMIN_ACCOUNT: AuthenticatedEmployee = {
  id: 'admin-master',
  employeeNo: 'ADMIN-01',
  name: 'Datian Subic Shoes Inc.',
  fullName: 'Datian Subic Shoes Inc. (System Administrator)',
  department: 'Executive Administration',
  position: 'System Administrator',
  status: 'Active',
  role: 'Admin',
  avatar: '👑',
  email: 'internalauditordtpshoes123@gmail.com'
};

export default function LoginScreen({ 
  onLoginSuccess, 
  customLogo: propLogo, 
  employees: propEmployees,
  onLogoChange 
}: LoginScreenProps) {
  // 1. Employee records for real validation
  const masterEmployees = useMemo(() => {
    const list = (propEmployees && propEmployees.length > 0) ? propEmployees : getSavedEmployees();
    return list;
  }, [propEmployees]);

  const activeEmployees = useMemo(() => {
    return masterEmployees.filter(emp => {
      if (!emp) return false;
      const status = String(emp.status || 'Active').trim().toLowerCase();
      return status !== 'inactive' && status !== 'resigned' && status !== 'terminated';
    });
  }, [masterEmployees]);

  // 2. Active Company Logo Resolution (Prop -> Server Cache -> Local Storage -> Fallback)
  const [activeLogo, setActiveLogo] = useState<string>(() => {
    if (propLogo) return propLogo;
    try {
      const stored = localStorage.getItem('tms_company_logo');
      if (stored) return stored;
    } catch {}
    return '/datian-logo.svg';
  });

  // Sync prop changes
  useEffect(() => {
    if (propLogo) {
      setActiveLogo(propLogo);
    }
  }, [propLogo]);

  // Fetch verified logo from server on mount
  useEffect(() => {
    let isMounted = true;
    fetch('/api/company-logo')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (isMounted && data && data.success && data.logo) {
          setActiveLogo(data.logo);
          try {
            localStorage.setItem('tms_company_logo', data.logo);
          } catch {}
        }
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, []);

  // 3. Login Form States - strictly blank by default with manual password authentication
  const [fullName, setFullName] = useState<string>('');
  const [selectedEmployee, setSelectedEmployee] = useState<{ id?: string; name: string; employeeNo?: string; department?: string; position?: string } | null>(null);
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSearchingName, setIsSearchingName] = useState<boolean>(false);

  // 4. Logo Customization Modal State
  const [isLogoModalOpen, setIsLogoModalOpen] = useState<boolean>(false);
  const [stagedLogoData, setStagedLogoData] = useState<string | null>(null);
  const [stagedLogoMeta, setStagedLogoMeta] = useState<{ name: string; size: string; type: string } | null>(null);
  const [isSavingLogo, setIsSavingLogo] = useState<boolean>(false);
  const [logoSaveSuccess, setLogoSaveSuccess] = useState<boolean>(false);
  const [logoError, setLogoError] = useState<string>('');

  const nameInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchDropdownRef = useRef<HTMLDivElement>(null);

  // Filter employee name suggestions (IDENTIFICATION ONLY - passwords never exposed)
  const nameSuggestions = useMemo(() => {
    if (!fullName || fullName.trim().length < 2) return [];
    const query = fullName.toLowerCase().trim();
    
    // Include Admin identity
    const suggestions: Array<{ id?: string; name: string; employeeNo?: string; department?: string; position?: string }> = [];
    if ('datian subic shoes inc.'.includes(query) || 'admin'.includes(query) || 'system administrator'.includes(query)) {
      suggestions.push({
        id: ADMIN_ACCOUNT.id,
        name: ADMIN_ACCOUNT.name,
        employeeNo: ADMIN_ACCOUNT.employeeNo,
        department: ADMIN_ACCOUNT.department,
        position: ADMIN_ACCOUNT.position
      });
    }

    const matches = activeEmployees
      .filter(emp => {
        const empName = (emp.name || emp.fullName || '').toLowerCase();
        return empName.includes(query);
      })
      .slice(0, 6)
      .map(emp => ({
        id: emp.id,
        name: emp.fullName || emp.name,
        employeeNo: emp.employeeNo,
        department: emp.department,
        position: emp.position
      }));

    return [...suggestions, ...matches].slice(0, 7);
  }, [fullName, activeEmployees]);

  // Click outside suggestion dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(e.target as Node)) {
        setIsSearchingName(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 5. Authentication Submission Handler (Manual Password Required)
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const trimmedName = fullName.trim();
    const trimmedPassword = password.trim();

    if (!trimmedName) {
      setErrorMessage('Please search or select your Employee Name.');
      nameInputRef.current?.focus();
      return;
    }

    if (!trimmedPassword) {
      setErrorMessage('Please manually enter your password.');
      passwordInputRef.current?.focus();
      return;
    }

    setIsLoading(true);

    try {
      // Validate credentials against master database
      const result = await loginWithEmployeeCredentials(
        trimmedName, 
        trimmedPassword, 
        selectedEmployee?.id
      );

      if (!result.success || !result.employee) {
        setErrorMessage(result.error || 'Invalid password. Please check your password and try again.');
        setIsLoading(false);
        return;
      }

      const authEmp = result.employee;
      const role: UserRole = authEmp.role || 'Staff';

      // Record successful access and pass to parent
      onLoginSuccess(
        authEmp.fullName || authEmp.name, 
        role, 
        authEmp.email, 
        authEmp
      );
    } catch {
      setErrorMessage('Unable to connect to authentication server. Please check your network connection.');
    } finally {
      setIsLoading(false);
    }
  };

  // Select employee from list - strictly identification, never auto-fill password
  const handleSelectEmployee = (item: { id?: string; name: string; employeeNo?: string; department?: string; position?: string }) => {
    setFullName(item.name);
    setSelectedEmployee(item);
    setPassword(''); // STRICT SECURITY RULE: Password must ALWAYS remain blank by default
    setIsSearchingName(false);
    setErrorMessage('');
    setTimeout(() => {
      passwordInputRef.current?.focus();
    }, 60);
  };

  // Quick-select identity for System Administrator (Password remains strictly blank for manual entry)
  const handleQuickSelectAdmin = () => {
    setFullName(ADMIN_ACCOUNT.name);
    setSelectedEmployee(ADMIN_ACCOUNT);
    setPassword(''); // NEVER auto-fill password! STRICT SECURITY
    setErrorMessage('');
    setIsSearchingName(false);
    setTimeout(() => {
      passwordInputRef.current?.focus();
    }, 60);
  };

  // Quick-select identity for Section Leaders (Password remains strictly blank for manual entry)
  const handleQuickSelectLeader = (sl: typeof DEFAULT_SECTION_LEADERS[0]) => {
    setFullName(sl.name);
    setSelectedEmployee({
      id: sl.id,
      employeeNo: sl.employeeNo,
      name: sl.name,
      fullName: sl.fullName || sl.name,
      department: sl.department,
      position: sl.position || 'Section Leader',
      status: 'Active',
      role: 'Section Leader',
      assignedSection: sl.assignedSection,
      section: sl.section || sl.assignedSection
    });
    setPassword(''); // NEVER auto-fill password! STRICT SECURITY
    setErrorMessage('');
    setIsSearchingName(false);
    setTimeout(() => {
      passwordInputRef.current?.focus();
    }, 60);
  };

  // 6. Logo File Upload & Staging
  const handleLogoFileSelect = (file: File) => {
    setLogoError('');
    setLogoSaveSuccess(false);

    if (!file.type.startsWith('image/')) {
      setLogoError('Please select a valid image file (PNG, SVG, JPG, or WebP).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setLogoError('Logo image must be smaller than 8MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const resultStr = event.target?.result as string;
      if (resultStr) {
        setStagedLogoData(resultStr);
        setStagedLogoMeta({
          name: file.name,
          size: `${(file.size / 1024).toFixed(1)} KB`,
          type: file.type
        });
      }
    };
    reader.onerror = () => {
      setLogoError('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  // Save Staged Logo Permanently to Server Database & Disk & Local Storage
  const handleSaveLogoPermanently = async () => {
    if (!stagedLogoData) return;

    setIsSavingLogo(true);
    setLogoError('');

    try {
      const res = await saveCompanyLogoPermanently(stagedLogoData);
      if (!res.success) {
        setLogoError(res.error || 'Failed to save logo permanently.');
        setIsSavingLogo(false);
        return;
      }

      const savedUrl = res.logo || stagedLogoData;
      setActiveLogo(savedUrl);
      if (onLogoChange) {
        onLogoChange(savedUrl);
      }

      setLogoSaveSuccess(true);
      setTimeout(() => {
        setIsLogoModalOpen(false);
        setStagedLogoData(null);
        setStagedLogoMeta(null);
        setLogoSaveSuccess(false);
      }, 1200);
    } catch (err: any) {
      setLogoError(err.message || 'An unexpected error occurred saving logo.');
    } finally {
      setIsSavingLogo(false);
    }
  };

  // Reset to Default DA TIAN Logo
  const handleResetToDefaultLogo = async () => {
    setIsSavingLogo(true);
    setLogoError('');

    try {
      const res = await resetCompanyLogoPermanently();
      const defaultUrl = res.logo || '/datian-logo.svg';
      setActiveLogo(defaultUrl);
      if (onLogoChange) {
        onLogoChange(defaultUrl);
      }
      setStagedLogoData(null);
      setStagedLogoMeta(null);
      setLogoSaveSuccess(true);
      setTimeout(() => {
        setIsLogoModalOpen(false);
        setLogoSaveSuccess(false);
      }, 1000);
    } catch (err: any) {
      setLogoError(err.message || 'Failed to reset logo.');
    } finally {
      setIsSavingLogo(false);
    }
  };

  return (
    <div 
      id="login_page_container"
      className="min-h-screen w-full bg-[#061429] flex flex-col justify-between items-center relative overflow-x-hidden selection:bg-blue-600 selection:text-white"
    >
      {/* Background Accent Lighting (Pure CSS, No Unsolicited Graphics) */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#081a36] via-[#061429] to-[#040e1d] pointer-events-none" />
      <div className="absolute top-0 inset-x-0 h-64 bg-radial from-blue-900/15 via-transparent to-transparent pointer-events-none" />

      {/* Top Header Bar */}
      <header 
        id="login_top_header"
        className="w-full max-w-7xl px-4 sm:px-8 py-5 flex items-center justify-between relative z-10"
      >
        <div className="flex items-center gap-2 text-slate-300 text-xs font-medium tracking-wide">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>CSR Master Authentication System</span>
        </div>

        {/* Professional Logo Customization Trigger */}
        <button
          id="btn_open_logo_customization"
          type="button"
          onClick={() => {
            setStagedLogoData(null);
            setLogoError('');
            setLogoSaveSuccess(false);
            setIsLogoModalOpen(true);
          }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/90 text-slate-200 hover:text-white text-xs font-medium border border-slate-700/70 shadow-sm transition-all active:scale-95 cursor-pointer"
          title="Upload or update company logo"
        >
          <Upload className="w-3.5 h-3.5 text-blue-400" />
          <span>Upload Company Logo</span>
        </button>
      </header>

      {/* Center Main Content Card */}
      <main className="w-full flex items-center justify-center px-4 py-8 relative z-10 flex-1">
        <div 
          id="login_card_main"
          className="w-full max-w-[440px] bg-white rounded-2xl shadow-2xl border border-slate-100/90 p-7 sm:p-9 text-slate-900 relative transition-all"
        >
          {/* Company Branding & Official Logo Header */}
          <div className="text-center mb-6">
            {/* Logo Display with Exact Proportions & Crisp Rendering */}
            <div className="relative inline-block mx-auto mb-3.5 group">
              <div 
                id="login_company_logo_wrapper"
                className="h-16 max-h-16 flex items-center justify-center p-1 rounded-lg transition-transform"
              >
                <img 
                  id="img_login_company_logo"
                  src={activeLogo} 
                  alt="DA TIAN SUBIC SHOES INC. Logo" 
                  className="max-h-14 max-w-[240px] w-auto h-auto object-contain drop-shadow-xs"
                  loading="eager"
                  onError={(e) => {
                    // Fallback to official svg if custom logo fails
                    (e.currentTarget as HTMLImageElement).src = '/datian-logo.svg';
                  }}
                />
              </div>

              {/* Subtle hover prompt to change logo */}
              <button
                type="button"
                onClick={() => {
                  setStagedLogoData(null);
                  setLogoError('');
                  setIsLogoModalOpen(true);
                }}
                className="absolute -top-1 -right-2 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 p-1.5 rounded-full border border-slate-200 shadow-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                title="Change Logo"
              >
                <ImageIcon className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Mandatory Company Name */}
            <h1 
              id="heading_company_name"
              className="text-xl sm:text-2xl font-bold tracking-tight text-[#0a2540] leading-snug"
            >
              DA TIAN SUBIC SHOES INC.
            </h1>

            {/* System Subtitle */}
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">
              CSR HUB • Compliance & Training System
            </p>
          </div>

          {/* Hairline Divider */}
          <div className="h-px w-full bg-slate-100 mb-6" />

          {/* Validation Error Banner */}
          {errorMessage && (
            <div 
              id="login_error_alert"
              role="alert"
              className="mb-5 p-3.5 bg-red-50/90 border border-red-200 rounded-xl text-red-700 text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in duration-200"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">
                {errorMessage}
              </div>
              <button 
                type="button"
                onClick={() => setErrorMessage('')}
                className="text-red-400 hover:text-red-600 p-0.5 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Login Form */}
          <form 
            id="login_form"
            onSubmit={handleLoginSubmit} 
            className="space-y-4"
          >
            {/* Field 1: Search / Select Employee Name (Identification Only) */}
            <div className="relative">
              <div className="flex items-center justify-between mb-1.5">
                <label 
                  htmlFor="input_employee_name"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                >
                  Employee Name
                </label>
                <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                  Identification
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  ref={nameInputRef}
                  id="input_employee_name"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    setSelectedEmployee(null);
                    setPassword(''); // Clear password whenever name is edited
                    setErrorMessage('');
                    setIsSearchingName(true);
                  }}
                  onFocus={() => setIsSearchingName(true)}
                  placeholder="Search or select your employee name..."
                  autoComplete="off"
                  className="w-full pl-9 pr-8 py-2.5 bg-slate-50/70 hover:bg-slate-50 focus:bg-white text-slate-900 text-sm font-medium rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 outline-hidden transition"
                />
                {fullName && (
                  <button
                    type="button"
                    onClick={() => {
                      setFullName('');
                      setSelectedEmployee(null);
                      setPassword('');
                      setErrorMessage('');
                      nameInputRef.current?.focus();
                    }}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    title="Clear Name"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Autocomplete Name Dropdown (Displays Name & Department only - Passwords NEVER exposed) */}
              {isSearchingName && nameSuggestions.length > 0 && (
                <div 
                  ref={searchDropdownRef}
                  id="dropdown_name_suggestions"
                  className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto"
                >
                  <div className="p-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
                    <span>Select Your Identity</span>
                    <span className="text-[9px] text-slate-400">Identification Only</span>
                  </div>
                  {nameSuggestions.map((item, idx) => (
                    <button
                      key={`${item.name}_${idx}`}
                      type="button"
                      onClick={() => handleSelectEmployee(item)}
                      className="w-full px-3 py-2.5 text-left hover:bg-blue-50/70 flex items-center justify-between gap-2 border-b border-slate-50 last:border-0 transition-colors cursor-pointer"
                    >
                      <div className="truncate">
                        <div className="text-xs font-semibold text-slate-800 truncate">
                          {item.name}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {item.department ? `${item.department} • ` : ''}{item.position || 'Staff'}
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md shrink-0">
                        {item.name.includes('Datian Subic Shoes') ? 'Administrator' : item.department || 'Employee'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Identity Confirmation Card */}
            {selectedEmployee && (
              <div 
                id="selected_employee_card"
                className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl flex items-center justify-between gap-2 animate-in fade-in duration-200"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#1b4d8c] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                    {selectedEmployee.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-800 truncate">
                      {selectedEmployee.name}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {selectedEmployee.department ? `${selectedEmployee.department} • ` : ''}{selectedEmployee.position || 'Staff'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  id="btn_change_employee_identity"
                  onClick={() => {
                    setSelectedEmployee(null);
                    setFullName('');
                    setPassword('');
                    nameInputRef.current?.focus();
                  }}
                  className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 px-2 py-1 hover:bg-blue-100/60 rounded-md cursor-pointer shrink-0"
                >
                  Change
                </button>
              </div>
            )}

            {/* Field 2: Password Field (Authentication - Shown after selecting/entering Employee Name) */}
            {fullName.trim().length > 0 ? (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between mb-1">
                  <label 
                    htmlFor="input_login_password"
                    className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                  >
                    Password
                  </label>
                  <span className="text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-md">
                    Manual entry required
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    ref={passwordInputRef}
                    id="input_login_password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrorMessage('');
                    }}
                    placeholder="Type your password"
                    autoComplete="new-password"
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-50/70 hover:bg-slate-50 focus:bg-white text-slate-900 text-sm font-medium rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 outline-hidden transition font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showPassword ? "Hide Password" : "Show Password"}
                    aria-label={showPassword ? "Hide Password" : "Show Password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Password is blank by default and must be typed manually.
                </p>
              </div>
            ) : (
              <div 
                id="login_step_guide"
                className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-center text-xs text-slate-500 flex items-center justify-center gap-2"
              >
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <span>Search and select your Employee Name above to enter your password.</span>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                id="btn_submit_login"
                type="submit"
                disabled={isLoading || !fullName.trim() || !password.trim()}
                className="w-full py-3 px-5 bg-[#1b4d8c] hover:bg-[#153e72] active:bg-[#103058] disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl shadow-md shadow-blue-900/10 transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to CSR HUB</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Access Helper Bar */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Quick Identification:</span>
              <button
                id="btn_fill_system_admin"
                type="button"
                onClick={handleQuickSelectAdmin}
                className="text-blue-700 hover:text-blue-800 font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>System Administrator</span>
              </button>
            </div>

            {/* Section Leader Quick Identities */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-slate-400 font-medium mr-1">Section Leaders:</span>
              {DEFAULT_SECTION_LEADERS.slice(0, 4).map((sl) => (
                <button
                  key={sl.employeeNo}
                  id={`btn_select_${sl.employeeNo.toLowerCase().replace(/[^a-z0-9]/g, '_')}`}
                  type="button"
                  onClick={() => handleQuickSelectLeader(sl)}
                  className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-200 transition-colors cursor-pointer"
                  title={`Select ${sl.name} (${sl.assignedSection})`}
                >
                  {sl.assignedSection}
                </button>
              ))}
            </div>

            <div className="text-center text-[11px] text-slate-400 pt-1">
              Employee Name = Identification only • Password = Authentication (Manual entry required)
            </div>
          </div>
        </div>
      </main>

      {/* Footer Notice */}
      <footer className="w-full max-w-7xl px-4 py-4 text-center text-xs text-slate-400 relative z-10">
        <p>
          Da Tian Subic Shoes, Inc. • Build 2026.09.16 • Confidential & Proprietary
        </p>
      </footer>

      {/* ==================================================================== */}
      {/* COMPANY LOGO CUSTOMIZATION MODAL                                    */}
      {/* ==================================================================== */}
      {isLogoModalOpen && (
        <div 
          id="modal_logo_customization"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div 
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-150 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base leading-tight">
                    Company Logo Customization
                  </h3>
                  <p className="text-xs text-slate-500">
                    DA TIAN SUBIC SHOES INC.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLogoModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              <p className="text-xs text-slate-600 leading-relaxed">
                Upload your official company logo. The exact file is stored in full original quality, 
                preserving its natural proportions across all application views, reports, and headers.
              </p>

              {/* Live High-Resolution Comparison Preview */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row items-center justify-around gap-4 text-center">
                <div>
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Current Active Logo
                  </div>
                  <div className="h-16 w-36 bg-white rounded-lg border border-slate-200 flex items-center justify-center p-2 shadow-2xs">
                    <img 
                      src={activeLogo} 
                      alt="Current Active Logo" 
                      className="max-h-full max-w-full object-contain" 
                    />
                  </div>
                </div>

                {stagedLogoData && (
                  <div>
                    <div className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider mb-2 flex items-center justify-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      <span>New Staged Logo</span>
                    </div>
                    <div className="h-16 w-36 bg-white rounded-lg border-2 border-blue-500 flex items-center justify-center p-2 shadow-2xs">
                      <img 
                        src={stagedLogoData} 
                        alt="Staged New Logo" 
                        className="max-h-full max-w-full object-contain" 
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Upload Drop Zone */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-6 text-center bg-slate-50/50 hover:bg-blue-50/30 transition cursor-pointer group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/svg+xml,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleLogoFileSelect(file);
                  }}
                />
                <Upload className="w-8 h-8 text-slate-400 group-hover:text-blue-600 mx-auto mb-2 transition-colors" />
                <div className="text-sm font-semibold text-slate-800">
                  Click to Browse or Drag Image Here
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Supports High-Resolution PNG, SVG, JPG, or WebP (up to 8MB)
                </div>

                {stagedLogoMeta && (
                  <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-blue-100/70 text-blue-800 text-xs rounded-full font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>{stagedLogoMeta.name} ({stagedLogoMeta.size})</span>
                  </div>
                )}
              </div>

              {/* Feedback messages */}
              {logoError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{logoError}</span>
                </div>
              )}

              {logoSaveSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Logo permanently saved to database and system storage.</span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-150 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleResetToDefaultLogo}
                disabled={isSavingLogo}
                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                Reset to Default DA TIAN Logo
              </button>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIsLogoModalOpen(false)}
                  disabled={isSavingLogo}
                  className="flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-transparent rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveLogoPermanently}
                  disabled={!stagedLogoData || isSavingLogo}
                  className="flex-1 sm:flex-initial px-5 py-2 text-xs font-bold text-white bg-[#1b4d8c] hover:bg-[#153e72] disabled:bg-slate-300 rounded-lg shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSavingLogo ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Permanently...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Save & Apply Logo</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
