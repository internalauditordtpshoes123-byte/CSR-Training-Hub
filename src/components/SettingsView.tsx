/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useEditable } from './EditableText';
import { 
  Settings, 
  ShieldAlert, 
  Database, 
  UserSquare2, 
  RefreshCw, 
  Palette, 
  AlertTriangle,
  Upload,
  Image as ImageIcon,
  Trash2,
  Edit3,
  Sparkles,
  Play,
  Globe,
  Check,
  CheckCircle2,
  BellRing,
  Laptop,
  Volume2,
  ExternalLink,
  Video,
  Film,
  Eye,
  RotateCcw,
  VolumeX,
  Maximize2,
  Lock,
  SlidersHorizontal,
  Type,
  Plus,
  Sliders,
  Layers,
  Sun,
  Moon,
  Link as LinkIcon
} from 'lucide-react';
import { UserRole, StartupMediaConfig } from '../types';
import DatianLogo from './DatianLogo';
import { useLanguage } from '../services/i18n';
import {
  requestDesktopNotificationPermission,
  getNotificationPermissionStatus,
  triggerTestDesktopNotification,
  playChime,
  isDesktopNotificationSupported
} from '../services/desktopNotifications';
import {
  AppearanceSettings,
  PRESET_THEME_COLORS,
  PRESET_WALLPAPERS,
  DEFAULT_APPEARANCE,
  getInitialAppearance,
  saveAppearanceSettings,
  resetAppearanceSettings,
  applyAppearanceToDOM
} from '../services/appearanceService';

interface SettingsViewProps {
  role: UserRole;
  setRole: (role: UserRole) => void;
  onResetData: () => void;
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
  addToast: (title: string, message: string, type: 'success' | 'warning' | 'info') => void;
  companyLogo: string | null;
  setCompanyLogo: (logo: string | null) => void;
  registerBackHandler?: (handler: () => boolean) => () => void;
  onReplayStartup?: () => void;
  startupMedia?: StartupMediaConfig | null;
  setStartupMedia?: (media: StartupMediaConfig | null) => void;
  appearance?: AppearanceSettings;
  setAppearance?: React.Dispatch<React.SetStateAction<AppearanceSettings>>;
  onSaveAppearance?: (newSettings: AppearanceSettings) => Promise<void>;
  onResetAppearance?: () => Promise<void>;
}

export default function SettingsView({
  role,
  setRole,
  onResetData,
  darkMode,
  setDarkMode,
  addToast,
  companyLogo,
  setCompanyLogo,
  registerBackHandler,
  onReplayStartup,
  startupMedia: initialStartupMedia,
  setStartupMedia: setExternalStartupMedia,
  appearance: externalAppearance,
  setAppearance: setExternalAppearance,
  onSaveAppearance,
  onResetAppearance
}: SettingsViewProps) {
  const { language, setLanguage, t } = useLanguage();
  const { textOverrides, resetAllOverrides, editMode, setEditMode } = useEditable();

  // Appearance & Visual Personalization Suite State
  const [localAppearance, setLocalAppearance] = useState<AppearanceSettings>(() => {
    return externalAppearance || getInitialAppearance();
  });

  useEffect(() => {
    if (externalAppearance) {
      setLocalAppearance(externalAppearance);
    }
  }, [externalAppearance]);

  const [appearanceTab, setAppearanceTab] = useState<'text' | 'color' | 'background' | 'transparency'>('text');
  const [customColorInput, setCustomColorInput] = useState<string>('#205b9f');
  const [customBgUrlInput, setCustomBgUrlInput] = useState<string>('');
  const [isUploadingBg, setIsUploadingBg] = useState<boolean>(false);
  const [bgUploadProgress, setBgUploadProgress] = useState<number>(0);
  const [bgDragActive, setBgDragActive] = useState<boolean>(false);
  const bgFileInputRef = useRef<HTMLInputElement>(null);

  const updateAppearance = async (partial: Partial<AppearanceSettings>, message?: string) => {
    const updated: AppearanceSettings = {
      ...localAppearance,
      ...partial
    };
    setLocalAppearance(updated);
    applyAppearanceToDOM(updated);

    if (setExternalAppearance) {
      setExternalAppearance(updated);
    }

    if (onSaveAppearance) {
      await onSaveAppearance(updated);
    } else {
      await saveAppearanceSettings(updated, role);
    }

    if (message) {
      addToast('Appearance Updated', message, 'success');
    }
  };

  const handleCustomColorAdd = async () => {
    const cleanHex = customColorInput.trim();
    if (!/^#[0-9A-Fa-f]{6}$/.test(cleanHex)) {
      addToast('Invalid Color Code', 'Please enter a valid 6-digit hex color code (e.g. #2563eb).', 'warning');
      return;
    }

    const currentList = localAppearance.customColors || [];
    const updatedList = currentList.some(c => c.toLowerCase() === cleanHex.toLowerCase())
      ? currentList
      : [cleanHex, ...currentList];

    await updateAppearance({
      themeColor: cleanHex,
      customColors: updatedList
    }, `Applied ${cleanHex} as active theme color and saved to your palette.`);
  };

  const handleDeleteCustomColor = async (hexToDelete: string) => {
    const updatedList = (localAppearance.customColors || []).filter(c => c.toLowerCase() !== hexToDelete.toLowerCase());
    const isCurrentActive = localAppearance.themeColor?.toLowerCase() === hexToDelete.toLowerCase();
    const fallbackColor = updatedList[0] || '#205b9f';

    await updateAppearance({
      themeColor: isCurrentActive ? fallbackColor : localAppearance.themeColor,
      customColors: updatedList
    }, `Removed ${hexToDelete} from custom palette.`);
  };

  const handleBgFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      addToast('Invalid Image', 'Please choose an image file (PNG, JPG, WEBP, SVG, GIF).', 'warning');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      addToast('File Too Large', 'Maximum image size is 25MB.', 'warning');
      return;
    }

    setIsUploadingBg(true);
    setBgUploadProgress(20);

    const reader = new FileReader();
    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        setBgUploadProgress(Math.round((e.loaded / e.total) * 80));
      }
    };
    reader.onload = async () => {
      setBgUploadProgress(100);
      const dataUrl = reader.result as string;
      await updateAppearance({
        backgroundImage: dataUrl
      }, `Custom background wallpaper applied.`);
      setIsUploadingBg(false);
      setBgUploadProgress(0);
    };
    reader.onerror = () => {
      setIsUploadingBg(false);
      setBgUploadProgress(0);
      addToast('Upload Error', 'Failed to read image file.', 'warning');
    };
    reader.readAsDataURL(file);
  };

  const handleResetAppearance = async () => {
    if (confirm('Revert all visual settings (text size, theme colors, background image, and transparency) back to factory defaults?')) {
      if (onResetAppearance) {
        await onResetAppearance();
      } else {
        const reset = await resetAppearanceSettings(role);
        setLocalAppearance(reset);
        if (setExternalAppearance) setExternalAppearance(reset);
      }
      addToast('Appearance Restored', 'Visual theme, text scaling, and transparency reverted to defaults.', 'success');
    }
  };

  // Brand Customizer Extended Suite
  const [previewTheme, setPreviewTheme] = useState<'dark' | 'light'>('dark');
  const [selectedFileBase64, setSelectedFileBase64] = useState<string | null>(null);
  const [scale, setScale] = useState<number>(1.0);
  const [fitMode, setFitMode] = useState<'contain' | 'cover'>('contain');
  const [bgColor, setBgColor] = useState<string>('transparent');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [dragActive, setDragActive] = useState<boolean>(false);

  // Logo history
  const [logoHistory, setLogoHistory] = useState<{ id: string; url: string; timestamp: string }[]>(() => {
    try {
      const stored = localStorage.getItem('logo_history');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Startup Screen Media Customizer State
  const [localStartupMedia, setLocalStartupMedia] = useState<StartupMediaConfig | null>(initialStartupMedia || null);
  const [isUploadingStartup, setIsUploadingStartup] = useState<boolean>(false);
  const [startupUploadProgress, setStartupUploadProgress] = useState<number>(0);
  const [startupDragActive, setStartupDragActive] = useState<boolean>(false);
  const [startupFitMode, setStartupFitMode] = useState<'contain' | 'cover'>(initialStartupMedia?.fitMode || 'contain');
  const [startupDuration, setStartupDuration] = useState<number>(initialStartupMedia?.duration || 5);
  const [startupSound, setStartupSound] = useState<boolean>(initialStartupMedia?.soundEnabled ?? false);
  const [startupTitle, setStartupTitle] = useState<string>(initialStartupMedia?.title || '');
  const [startupSubtitle, setStartupSubtitle] = useState<string>(initialStartupMedia?.subtitle || '');
  const [showLiveStartupPreview, setShowLiveStartupPreview] = useState<boolean>(false);
  const startupFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialStartupMedia !== undefined) {
      setLocalStartupMedia(initialStartupMedia);
      if (initialStartupMedia) {
        setStartupFitMode(initialStartupMedia.fitMode || 'contain');
        setStartupDuration(initialStartupMedia.duration || 5);
        setStartupSound(initialStartupMedia.soundEnabled ?? false);
        setStartupTitle(initialStartupMedia.title || '');
        setStartupSubtitle(initialStartupMedia.subtitle || '');
      }
    }
  }, [initialStartupMedia]);

  const handleStartupFileUpload = async (file: File) => {
    if (role !== 'Admin') {
      addToast('Permission Denied', 'Only administrators can customize the startup screen.', 'warning');
      return;
    }

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (!isVideo && !isImage) {
      addToast('Invalid File Type', 'Please upload a valid image (PNG, JPG, SVG, WebP, GIF) or video (MP4, WebM, MOV) file.', 'warning');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      addToast('File Too Large', 'Maximum file size for startup media is 50MB.', 'warning');
      return;
    }

    setIsUploadingStartup(true);
    setStartupUploadProgress(15);

    const reader = new FileReader();
    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        setStartupUploadProgress(Math.round((e.loaded / e.total) * 75));
      }
    };

    reader.onload = async () => {
      setStartupUploadProgress(85);
      const dataUrl = reader.result as string;

      try {
        const payload = {
          type: isVideo ? 'video' : 'image',
          dataUrl,
          fileName: file.name,
          fileSize: file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : `${(file.size / 1024).toFixed(1)} KB`,
          mimeType: file.type,
          duration: isVideo ? 8 : 5,
          soundEnabled: false,
          fitMode: startupFitMode,
          title: startupTitle,
          subtitle: startupSubtitle,
          updatedBy: 'System Administrator'
        };

        const res = await fetch('/api/startup/media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const result = await res.json();
        setStartupUploadProgress(100);

        if (result.success && result.media) {
          setLocalStartupMedia(result.media);
          if (setExternalStartupMedia) {
            setExternalStartupMedia(result.media);
          }
          try {
            localStorage.setItem('csr_startup_media_config', JSON.stringify(result.media));
          } catch {}
          addToast('Startup Media Applied', `Custom ${isVideo ? 'video' : 'image'} successfully configured as the startup screen.`, 'success');
        } else {
          throw new Error(result.error || 'Server could not save startup media');
        }
      } catch (err: any) {
        console.error('Failed to save startup media:', err);
        addToast('Upload Failed', err.message || 'Could not upload media.', 'warning');
      } finally {
        setIsUploadingStartup(false);
        setStartupUploadProgress(0);
      }
    };

    reader.onerror = () => {
      setIsUploadingStartup(false);
      setStartupUploadProgress(0);
      addToast('File Read Error', 'Failed to read media file.', 'warning');
    };

    reader.readAsDataURL(file);
  };

  const handleUpdateStartupSettings = async (updates: Partial<StartupMediaConfig>) => {
    if (role !== 'Admin') {
      addToast('Permission Denied', 'Only administrators can modify startup settings.', 'warning');
      return;
    }
    if (!localStartupMedia || localStartupMedia.type === 'default') {
      return;
    }

    try {
      const payload = {
        ...localStartupMedia,
        ...updates,
        updatedBy: 'System Administrator'
      };

      const res = await fetch('/api/startup/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (result.success && result.media) {
        setLocalStartupMedia(result.media);
        if (setExternalStartupMedia) {
          setExternalStartupMedia(result.media);
        }
        try {
          localStorage.setItem('csr_startup_media_config', JSON.stringify(result.media));
        } catch {}
        addToast('Settings Updated', 'Startup screen display parameters saved.', 'success');
      }
    } catch (err: any) {
      addToast('Update Failed', err.message || 'Could not update settings.', 'warning');
    }
  };

  const handleResetStartupToDefault = async () => {
    if (role !== 'Admin') {
      addToast('Permission Denied', 'Only administrators can modify startup settings.', 'warning');
      return;
    }

    try {
      const payload = {
        type: 'default',
        url: '',
        duration: 5,
        soundEnabled: false,
        fitMode: 'contain',
        title: '',
        subtitle: '',
        updatedBy: 'System Administrator'
      };

      const res = await fetch('/api/startup/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (result.success && result.media) {
        setLocalStartupMedia(result.media);
        if (setExternalStartupMedia) {
          setExternalStartupMedia(result.media);
        }
        try {
          localStorage.removeItem('csr_startup_media_config');
        } catch {}
        addToast('Reset to Default', 'Standard official DATIAN cinematic animation restored.', 'success');
      }
    } catch (err: any) {
      addToast('Reset Failed', err.message || 'Could not reset startup screen.', 'warning');
    }
  };

  // Desktop Notifications Controller
  const [desktopPermStatus, setDesktopPermStatus] = useState<NotificationPermission | 'unsupported'>(() => getNotificationPermissionStatus());
  const [testingNotification, setTestingNotification] = useState(false);

  const handleEnableDesktopNotifications = async () => {
    const perm = await requestDesktopNotificationPermission();
    setDesktopPermStatus(perm);
    if (perm === 'granted') {
      addToast('Desktop Alerts Activated', 'You will now receive desktop notifications even when this window is closed or minimized.', 'success');
      await triggerTestDesktopNotification();
    } else if (perm === 'denied') {
      addToast('Notifications Blocked', 'Please allow notifications in browser site permissions to receive desktop alerts.', 'warning');
    }
  };

  const handleTestDesktopNotification = async () => {
    setTestingNotification(true);
    playChime();
    if (desktopPermStatus !== 'granted') {
      await handleEnableDesktopNotifications();
      setTestingNotification(false);
      return;
    }
    await triggerTestDesktopNotification();
    addToast('Desktop Notification Dispatched', 'Check your OS desktop/taskbar for the live toast alert!', 'info');
    setTimeout(() => setTestingNotification(false), 1000);
  };

  // Sync logo history
  useEffect(() => {
    localStorage.setItem('logo_history', JSON.stringify(logoHistory));
  }, [logoHistory]);

  // Update canvas helper
  useEffect(() => {
    if (!selectedFileBase64) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = selectedFileBase64;
    img.onload = () => {
      try {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // BG Color
        if (bgColor === 'transparent') {
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else {
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Calculate sizes
        const cw = canvas.width;
        const h_canvas = canvas.height;
        const iw = img.width || cw;
        const ih = img.height || h_canvas;

        let dw = cw;
        let dh = h_canvas;

        if (fitMode === 'contain') {
          const ratio = Math.min(cw / iw, h_canvas / ih);
          dw = iw * ratio;
          dh = ih * ratio;
        } else { // cover
          const ratio = Math.max(cw / iw, h_canvas / ih);
          dw = iw * ratio;
          dh = ih * ratio;
        }

        // Scale slider setting
        dw *= scale;
        dh *= scale;

        const dx = (cw - dw) / 2;
        const dy = (h_canvas - dh) / 2;

        ctx.drawImage(img, dx, dy, dw, dh);
      } catch (err) {
        console.error("Error updating preview canvas", err);
      }
    };
    img.onerror = () => {
      console.warn("Failed to load review canvas image");
    };
  }, [selectedFileBase64, scale, fitMode, bgColor]);

  const handleLogoFile = (file: File) => {
    const isImage = file.type.startsWith('image/') || 
                    /\.(jpg|jpeg|png|gif|svg|webp)$/i.test(file.name);
    if (!isImage) {
      addToast('Invalid File Type', 'Please upload a corporate image item (PNG, JPG, JPEG, or SVG).', 'warning');
      return;
    }

    const max_bytes = 5 * 1024 * 1024;
    if (file.size > max_bytes) {
      addToast('File Too Large', 'Maximum brand emblem size allowed is 5MB. Please optimize your logo.', 'warning');
      return;
    }

    setIsProcessing(true);
    setUploadProgress(15);

    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + Math.floor(Math.random() * 25) + 5;
      });
    }, 100);

    const reader = new FileReader();
    reader.onload = (event) => {
      setTimeout(() => {
        clearInterval(interval);
        setUploadProgress(100);
        setTimeout(() => {
          if (event.target?.result) {
            const rawData = event.target.result as string;
            setSelectedFileBase64(rawData);
            setCompanyLogo(rawData); // INSTANTLY apply as default baseline configuration
            setScale(1.0);
            addToast('Logo Applied', 'Corporate logo applied and saved successfully. Adjust the cropping sliders below if needed.', 'success');

            const newHistoryItem = {
              id: Date.now().toString(),
              url: rawData,
              timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) + ' - ' + new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            };
            setLogoHistory(prev => {
              const filtered = prev.filter(item => item.url !== rawData);
              return [newHistoryItem, ...filtered].slice(0, 6);
            });
          }
          setIsProcessing(false);
        }, 150);
      }, 200);
    };
    reader.onerror = () => {
      clearInterval(interval);
      setIsProcessing(false);
      addToast('Error Reading File', 'Failed to read branding image item.', 'warning');
    };
    reader.readAsDataURL(file);
  };

  const handleApplyLogo = () => {
    if (!selectedFileBase64) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setCompanyLogo(selectedFileBase64);
      addToast('Branding Applied', 'Uniform corporate logo applied successfully (fallback mode).', 'success');
      setSelectedFileBase64(null);
      return;
    }

    const img = new Image();
    img.src = selectedFileBase64;
    img.onload = () => {
      try {
        ctx.clearRect(0, 0, 256, 256);

        if (bgColor !== 'transparent') {
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, 256, 256);
        }

        const cw = 256;
        const ch = 256;
        const iw = img.width || 256;
        const ih = img.height || 256;

        let dw = cw;
        let dh = ch;

        if (fitMode === 'contain') {
          const ratio = Math.min(cw / iw, ch / ih);
          dw = iw * ratio;
          dh = ih * ratio;
        } else {
          const ratio = Math.max(cw / iw, ch / ih);
          dw = iw * ratio;
          dh = ih * ratio;
        }

        dw *= scale;
        dh *= scale;

        const dx = (cw - dw) / 2;
        const dy = (ch - dh) / 2;

        ctx.drawImage(img, dx, dy, dw, dh);

        const finalUrl = canvas.toDataURL('image/png');
        setCompanyLogo(finalUrl);

        const newHistoryItem = {
          id: Date.now().toString(),
          url: finalUrl,
          timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) + ' - ' + new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        };
        
        setLogoHistory(prev => {
          const filtered = prev.filter(item => item.url !== finalUrl);
          return [newHistoryItem, ...filtered].slice(0, 6);
        });

        setSelectedFileBase64(null);
        addToast('Branding Applied', 'Uniform corporate logo applied and saved successfully.', 'success');
      } catch (err) {
        console.warn("Canvas crop failed (possibly tainted SVG), saving fallback base64 file", err);
        setCompanyLogo(selectedFileBase64);

        const newHistoryItem = {
          id: Date.now().toString(),
          url: selectedFileBase64,
          timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) + ' - ' + new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        };
        setLogoHistory(prev => {
          const filtered = prev.filter(item => item.url !== selectedFileBase64);
          return [newHistoryItem, ...filtered].slice(0, 6);
        });

        setSelectedFileBase64(null);
        addToast('Branding Applied', 'Logo applied successfully (bypass canvas processing).', 'success');
      }
    };
    img.onerror = () => {
      // Direct raw save
      setCompanyLogo(selectedFileBase64);
      setSelectedFileBase64(null);
      addToast('Branding Applied', 'Applied original logo source.', 'success');
    };
  };

  const triggerReset = () => {
    if (confirm('Are you sure you want to revert all changes? This will flush all your custom schedules, operator Takt evaluations, and newly uploaded SOP PDFs back to factory standard initial seeds.')) {
      onResetData();
      addToast('System Data Restored', 'The master catalog and local evaluation tables have been reset to factory defaults.', 'success');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl animate-fadeIn">
      
      {/* Header title */}
      <div className="bg-white p-5 border border-slate-200/80 rounded-xl shadow-sm">
        <h2 className="text-xl font-bold text-slate-850 flex items-center gap-1.5 font-sans">
          <Settings className="w-5 h-5 text-slate-500" />
          {t('settings.title', 'System Preferences & Configuration Panel')}
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          {t('settings.subtitle', 'Configure system language, database permissions, security clearance, and corporate identity.')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card 0: System Language Configuration */}
        <div className="bg-white p-5 border border-slate-200/80 rounded-xl shadow-xs space-y-4">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 pb-2.5 border-b border-slate-100">
            <Globe className="w-4 h-4 text-blue-600 animate-pulse" />
            {t('settings.languageTitle', 'System Display Language')}
          </h3>

          <p className="text-xs text-slate-500 leading-normal">
            {t('settings.languageDesc', 'Choose your preferred language across the entire system. Supports English and Chinese (中文) with immediate sync.')}
          </p>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setLanguage('en');
                addToast('Language Updated', 'System language switched to English.', 'success');
              }}
              className={`p-3 rounded-xl border font-bold text-xs flex items-center justify-between cursor-pointer transition-all ${
                language === 'en'
                  ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-xs ring-2 ring-blue-500/20'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className="flex flex-col text-left">
                <span className="font-black text-sm">English</span>
                <span className="text-[10px] text-slate-400 font-mono">EN (Default)</span>
              </div>
              {language === 'en' && <Check className="w-4 h-4 text-blue-600" />}
            </button>

            <button
              onClick={() => {
                setLanguage('zh');
                addToast('语言已更新', '系统界面已切换为中文 (Chinese)。', 'success');
              }}
              className={`p-3 rounded-xl border font-bold text-xs flex items-center justify-between cursor-pointer transition-all ${
                language === 'zh'
                  ? 'bg-amber-50 border-amber-500 text-amber-700 shadow-xs ring-2 ring-amber-500/20'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className="flex flex-col text-left">
                <span className="font-black text-sm">中文 (Chinese)</span>
                <span className="text-[10px] text-slate-400 font-mono">ZH (Mandarin)</span>
              </div>
              {language === 'zh' && <Check className="w-4 h-4 text-amber-600" />}
            </button>
          </div>

          <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-150 text-[11px] text-blue-800 font-medium">
            {language === 'zh' 
              ? '✓ 全局语言切换已生效：导航栏、员工名册、培训模块及消息通知均已本地化。' 
              : '✓ Global localization active: Sidebar, modules, notifications, and login forms are translated.'}
          </div>
        </div>

        {/* Card: Desktop & Background OS Notifications */}
        <div className="bg-white p-5 border border-slate-200/80 rounded-xl shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Laptop className="w-4 h-4 text-blue-600 animate-pulse" />
              <span>{language === 'zh' ? '桌面系统后台通知' : 'Desktop OS Background Alerts'}</span>
            </h3>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
              desktopPermStatus === 'granted'
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : desktopPermStatus === 'denied'
                ? 'bg-red-100 text-red-800 border border-red-300'
                : 'bg-amber-100 text-amber-800 border border-amber-300'
            }`}>
              {desktopPermStatus === 'granted'
                ? '● ACTIVE'
                : desktopPermStatus === 'denied'
                ? '● BLOCKED'
                : '● PERMISSION REQUIRED'}
            </span>
          </div>

          <p className="text-xs text-slate-500 leading-normal">
            {language === 'zh'
              ? '当有同事在系统中给您发送消息时，即使用户端已最小化或处于后台，电脑桌面右下角也会弹出即时通知和提示音。'
              : 'Receive native OS desktop notifications when someone messages you, even if DATIAN CSR HUB is minimized, running in the background, or this window is inactive.'}
          </p>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-600 font-medium">Desktop Notification Status:</span>
              <span className="font-bold text-slate-800 font-mono capitalize">
                {desktopPermStatus === 'granted' ? 'Allowed by browser' : desktopPermStatus}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-600 font-medium">Background Service Worker:</span>
              <span className="font-bold text-emerald-700 font-mono">Registered (/sw.js)</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-600 font-medium">Click Action:</span>
              <span className="font-bold text-slate-700">Focuses window & opens chat</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {desktopPermStatus !== 'granted' ? (
              <button
                onClick={handleEnableDesktopNotifications}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-sm"
              >
                <BellRing className="w-4 h-4" />
                <span>{language === 'zh' ? '开启桌面通知' : 'Enable Desktop Alerts'}</span>
              </button>
            ) : (
              <button
                onClick={handleTestDesktopNotification}
                disabled={testingNotification}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-sm"
              >
                <BellRing className="w-4 h-4" />
                <span>{testingNotification ? 'Sending Toast...' : 'Send Test Desktop Alert'}</span>
              </button>
            )}

            <button
              onClick={() => {
                playChime();
                addToast('Audio Chime', 'Playing high-fidelity message notification chime.', 'info');
              }}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer border border-slate-200"
              title="Play notification sound"
            >
              <Volume2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Test Chime</span>
            </button>
          </div>

          <div className="p-2.5 bg-blue-50/70 rounded-lg border border-blue-200/80 text-[10px] text-blue-900 leading-relaxed">
            💡 <strong>Tip:</strong> Alerts show directly in your Windows/macOS notification tray even when working in Excel, Word, or other desktop apps.
          </div>
        </div>

        {/* Card 1: Clearance Role Controller (ADMIN VS USER) */}
        <div className="bg-white p-5 border border-slate-200/80 rounded-xl shadow-xs space-y-4">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 pb-2.5 border-b border-slate-100">
            <UserSquare2 className="w-4 h-4 text-blue-600 animate-pulse" />
            {t('settings.securityClearance', 'Active User Security Clearance')}
          </h3>

          <p className="text-xs text-slate-500 leading-normal">
            {language === 'zh' 
              ? '切换您的安全访问级别。支持系统管理员与运营主管权限切换。' 
              : 'Toggle your active clearance grade. Simulates permissions for System Owner vs Operations Supervisors.'}
          </p>

          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => {
                setRole('Admin');
                addToast('Clearance Switched', 'Identity conforms to System Owner / Main Administrator. Full Purge permissions enabled.', 'success');
              }}
              className={`flex-1 text-center py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                role === 'Admin'
                  ? 'bg-gradient-to-r bg-white text-blue-650 shadow-3xs'
                  : 'text-slate-400 hover:text-slate-650'
              }`}
            >
              👑 {language === 'zh' ? '系统总管理员' : 'System Owner'}
            </button>
            <button
              onClick={() => {
                setRole('User');
                addToast('Clearance Switched', 'Identity conforms to Operations Supervisor. Delete/Rename permissions locks active.', 'warning');
              }}
              className={`flex-1 text-center py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                role === 'User'
                  ? 'bg-gradient-to-r bg-white text-blue-650 shadow-3xs'
                  : 'text-slate-400 hover:text-slate-650'
              }`}
            >
              👥 {language === 'zh' ? '运营主管' : 'Operations Supervisor'}
            </button>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 space-y-1.5 text-[10px]">
            <div className="flex items-center justify-between font-medium">
              <span className="text-slate-500">{language === 'zh' ? '文件查看/下载:' : 'File View / Download Access:'}</span>
              <span className="text-emerald-600 font-bold">● {language === 'zh' ? '已授权 (所有角色)' : 'Authorized (All Roles)'}</span>
            </div>
            <div className="flex items-center justify-between font-medium">
              <span className="text-slate-500">{language === 'zh' ? '文档上传/保存:' : 'Document Upload / Save Access:'}</span>
              <span className="text-emerald-600 font-bold">● {language === 'zh' ? '已授权 (所有角色)' : 'Authorized (All Roles)'}</span>
            </div>
            <div className="flex items-center justify-between font-medium">
              <span className="text-slate-500">{language === 'zh' ? '永久删除权限:' : 'Permanent Purging/Deletion Access:'}</span>
              {role === 'Admin' ? (
                <span className="text-indigo-600 font-bold font-sans">● {language === 'zh' ? '完整管理员权限' : 'Full Admin Disposal Granted'}</span>
              ) : (
                <span className="text-rose-600 font-bold font-sans">🔒 {language === 'zh' ? '仅限系统管理员' : 'Restricted to System Owner'}</span>
              )}
            </div>
          </div>
        </div>
        

        {/* Card 2: Database Storage Seeding Tools */}
        <div className="bg-white p-5 border border-slate-200/80 rounded-xl shadow-xs space-y-4">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 pb-2.5 border-b border-slate-100">
            <Database className="w-4 h-4 text-indigo-500" />
            Local Database Utilities
          </h3>

          <p className="text-xs text-slate-500 leading-normal">
            Flushes client-side variables stored inside metadata local storage. Use this if you want to wipe test inputs and reload compliant boot-up data.
          </p>

          <div className="flex items-center justify-between gap-4 p-3 border border-red-100 rounded-xl bg-red-50/20 text-xs">
            <div className="space-y-0.5 pr-2">
              <span className="font-bold text-red-600 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Force Database Restore
              </span>
              <p className="text-[10px] text-slate-450 leading-relaxed">Wipe all operator history and reload standard initial seeds.</p>
            </div>

            <button 
              onClick={triggerReset}
              className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-3xs"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reseed Local DB
            </button>
          </div>
        </div>

        {/* Card 3: Workspace Visual Personalization Suite (Full Span) */}
        <div className="bg-white p-6 border border-slate-200/80 rounded-xl shadow-sm md:col-span-2 space-y-6">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-150">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Palette className="w-4 h-4 text-blue-600 animate-pulse" />
                  <span>{language === 'zh' ? '界面视觉与个性化配置' : 'Workspace Visual Personalization Suite'}</span>
                </h3>
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {language === 'zh' ? '全员开放调节' : 'Open to All Users'}
                </span>
                {localAppearance.backgroundImage && (
                  <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" />
                    {language === 'zh' ? '自定义背景激活' : 'Wallpaper Active'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {language === 'zh'
                  ? '自由调节字体大小、添加自定义主题颜色、上传工作区背景壁纸，并实时微调面板与背景透明度。'
                  : 'Adjust workspace font scaling (Txt size), pick or add any custom theme color, upload background wallpapers, and fine-tune live transparency.'}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Dark / Light Mode Switch */}
              <button
                onClick={() => {
                  setDarkMode(!darkMode);
                  addToast('Theme Swapped', `Visual framework transitioned to ${!darkMode ? 'Dark' : 'Light'} Mode.`, 'info');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                  darkMode 
                    ? 'bg-slate-900 text-cyan-300 border-slate-700 shadow-xs' 
                    : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700 shadow-xs'
                }`}
              >
                {darkMode ? <Moon className="w-3.5 h-3.5 text-cyan-400" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
                <span>{darkMode ? 'Dark Blueprint' : 'Light Mode'}</span>
              </button>

              {/* Reset to Factory Defaults */}
              <button
                onClick={handleResetAppearance}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg shadow-xs transition-all active:scale-95 cursor-pointer"
                title="Restore default text size, colors, background, and transparency"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{language === 'zh' ? '恢复默认外观' : 'Reset Defaults'}</span>
              </button>
            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200 overflow-x-auto">
            <button
              onClick={() => setAppearanceTab('text')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                appearanceTab === 'text'
                  ? 'bg-white text-blue-700 shadow-xs ring-1 ring-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Type className="w-3.5 h-3.5 text-blue-600" />
              <span>{language === 'zh' ? '字体大小 (Txt Size)' : 'Text Size (Txt Size)'}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 font-bold">
                {localAppearance.fontSize}%
              </span>
            </button>

            <button
              onClick={() => setAppearanceTab('color')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                appearanceTab === 'color'
                  ? 'bg-white text-blue-700 shadow-xs ring-1 ring-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Palette className="w-3.5 h-3.5 text-amber-500" />
              <span>{language === 'zh' ? '主题颜色 (全颜色支持)' : 'Theme Color (Add Any Color)'}</span>
              <span 
                className="w-3.5 h-3.5 rounded-full border border-black/20 shadow-xs inline-block"
                style={{ backgroundColor: localAppearance.themeColor }}
              />
            </button>

            <button
              onClick={() => setAppearanceTab('background')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                appearanceTab === 'background'
                  ? 'bg-white text-blue-700 shadow-xs ring-1 ring-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5 text-purple-600" />
              <span>{language === 'zh' ? '背景图片与壁纸' : 'Background Wallpaper'}</span>
              {localAppearance.backgroundImage && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              )}
            </button>

            <button
              onClick={() => setAppearanceTab('transparency')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                appearanceTab === 'transparency'
                  ? 'bg-white text-blue-700 shadow-xs ring-1 ring-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-emerald-600" />
              <span>{language === 'zh' ? '透明度调节 (全员可用)' : 'Transparency Controls'}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 font-bold">
                {localAppearance.panelTransparency}% glass
              </span>
            </button>
          </div>

          {/* TAB 1: TEXT SIZE (TXT SIZE) */}
          {appearanceTab === 'text' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-blue-50/50 p-3.5 rounded-xl border border-blue-150">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                    <Type className="w-4 h-4 text-blue-600" />
                    {language === 'zh' ? '全局字体大小缩放 (Text Scale)' : 'Global Workspace Typography Scale'}
                  </span>
                  <p className="text-[11px] text-blue-800/80">
                    {language === 'zh' 
                      ? '通过根比例动态缩放系统文字，适合工厂平板巡检或大屏监控。' 
                      : 'Proportionally scales all typography across dashboards, data tables, navigation, and audit sheets.'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{language === 'zh' ? '当前缩放比:' : 'Active Scale:'}</span>
                  <span className="px-2.5 py-1 bg-blue-600 text-white font-mono font-bold text-xs rounded-lg shadow-xs">
                    {localAppearance.fontSize}%
                  </span>
                </div>
              </div>

              {/* Slider & Presets */}
              <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
                    {language === 'zh' ? '微调滑动条 (80% - 150%)' : 'Fine-Tune Text Slider (80% - 150%)'}
                  </span>
                  <span className="font-mono text-blue-700 font-bold">
                    {localAppearance.fontSize <= 85 ? 'Compact / Small' :
                     localAppearance.fontSize <= 100 ? 'Standard Default (100%)' :
                     localAppearance.fontSize <= 120 ? 'Medium-Large (115%)' :
                     localAppearance.fontSize <= 135 ? 'Large (130%)' : 'Extra Large (145%)'}
                  </span>
                </div>

                <input
                  type="range"
                  min={80}
                  max={150}
                  step={5}
                  value={localAppearance.fontSize}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    updateAppearance({ fontSize: val });
                  }}
                  className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                />

                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>80% (Compact)</span>
                  <span>100% (Standard)</span>
                  <span>120% (Expanded)</span>
                  <span>150% (Max)</span>
                </div>

                {/* Preset Chips */}
                <div className="pt-2 border-t border-slate-200/80">
                  <span className="text-[11px] font-semibold text-slate-600 block mb-2">
                    {language === 'zh' ? '快速预设尺寸:' : 'Quick Presets:'}
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                      { label: 'Compact', size: 85, desc: 'Small (85%)' },
                      { label: 'Standard', size: 100, desc: 'Default (100%)' },
                      { label: 'Medium', size: 115, desc: 'Comfort (115%)' },
                      { label: 'Large', size: 130, desc: 'Clear (130%)' },
                      { label: 'Extra Large', size: 145, desc: 'Maximum (145%)' }
                    ].map((preset) => (
                      <button
                        key={preset.size}
                        onClick={() => updateAppearance({ fontSize: preset.size }, `Font size set to ${preset.desc}`)}
                        className={`p-2.5 rounded-lg border text-xs font-bold text-center cursor-pointer transition-all ${
                          localAppearance.fontSize === preset.size
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-500/20'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <div className="truncate">{preset.label}</div>
                        <div className={`text-[10px] font-mono mt-0.5 ${localAppearance.fontSize === preset.size ? 'text-blue-100' : 'text-slate-400'}`}>
                          {preset.size}%
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Live Interactive Typography Preview Box */}
              <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 text-white space-y-2.5 shadow-inner">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-[10px] font-mono uppercase text-cyan-400 tracking-wider font-bold">
                    {language === 'zh' ? '实时文字缩放效果预览' : 'Real-Time Typography Scale Preview'}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    scale = {localAppearance.fontSize}%
                  </span>
                </div>

                <div 
                  className="space-y-2 transition-all duration-150"
                  style={{ fontSize: `${localAppearance.fontSize}%` }}
                >
                  <h4 className="font-bold text-slate-100 text-base leading-snug">
                    DATIAN Footwear CSR & Operator Training Evaluation System
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Stitching Section Line 04 • Operator: Nguyễn Văn Minh (EMP-1049) • Cycle Takt Efficiency: 98.4%
                  </p>
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <span 
                      className="px-2 py-0.5 rounded text-[11px] font-bold text-white shadow-xs"
                      style={{ backgroundColor: localAppearance.themeColor }}
                    >
                      Theme Accent Badge
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-mono">
                      STATUS: VERIFIED COMPLIANT
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: THEME COLOR (ALL COLORS CAN BE ADDED) */}
          {appearanceTab === 'color' && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Add Custom Color Section */}
              <div className="p-4 bg-gradient-to-r from-blue-50/70 via-slate-50 to-amber-50/70 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Plus className="w-4 h-4 text-blue-600" />
                      {language === 'zh' ? '添加任意自定义颜色 (All Colors Can Be Added)' : 'Pick & Add Any Custom Color (All Colors Can Be Added)'}
                    </span>
                    <p className="text-[11px] text-slate-500">
                      {language === 'zh' 
                        ? '支持任意颜色选择器或输入 HEX 颜色代码，保存至您的个性化调色板。' 
                        : 'Use the interactive color picker or type any custom HEX code to instantly add it to your theme palette.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium">Active:</span>
                    <div 
                      className="w-7 h-7 rounded-lg border-2 border-white shadow-md flex items-center justify-center text-white"
                      style={{ backgroundColor: localAppearance.themeColor }}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-mono font-bold text-xs text-slate-800 uppercase">
                      {localAppearance.themeColor}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                  {/* Native HTML5 Color Picker swatch */}
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <label className="relative cursor-pointer flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-slate-300 hover:border-blue-500 shadow-xs transition">
                      <input
                        type="color"
                        value={customColorInput}
                        onChange={(e) => setCustomColorInput(e.target.value)}
                        className="w-7 h-7 rounded-lg cursor-pointer border-0 p-0 bg-transparent"
                        title="Click to open color picker spectrum"
                      />
                      <span className="text-xs font-bold text-slate-700">Open Color Wheel</span>
                    </label>
                  </div>

                  {/* Hex Text Input */}
                  <div className="flex-1 w-full flex items-center gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">#</span>
                      <input
                        type="text"
                        value={customColorInput.replace('#', '')}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6);
                          setCustomColorInput(`#${val}`);
                        }}
                        placeholder="2563eb"
                        maxLength={6}
                        className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold uppercase text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <button
                      onClick={handleCustomColorAdd}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{language === 'zh' ? '添加颜色' : 'Add to Palette'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* User's Custom Saved Colors Shelf */}
              {localAppearance.customColors && localAppearance.customColors.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      {language === 'zh' ? '我的自定义调色板' : 'My Saved Custom Colors'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {localAppearance.customColors.length} colors saved
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap p-3 bg-slate-50 rounded-xl border border-slate-200">
                    {localAppearance.customColors.map((hex) => {
                      const isActive = localAppearance.themeColor?.toLowerCase() === hex.toLowerCase();
                      return (
                        <div
                          key={hex}
                          className="relative group flex items-center"
                        >
                          <button
                            onClick={() => updateAppearance({ themeColor: hex }, `Theme color switched to ${hex}`)}
                            className={`w-9 h-9 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-center shadow-xs active:scale-90 ${
                              isActive
                                ? 'border-slate-900 scale-105 shadow-md ring-2 ring-blue-400'
                                : 'border-white hover:scale-105'
                            }`}
                            style={{ backgroundColor: hex }}
                            title={`Apply custom color ${hex}`}
                          >
                            {isActive && <Check className="w-4 h-4 text-white drop-shadow-md" />}
                          </button>

                          {/* Delete color button on hover */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCustomColor(hex);
                            }}
                            className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xs cursor-pointer hover:bg-red-700 text-[10px]"
                            title="Remove color from palette"
                          >
                            &times;
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Standard Curated Color Palette */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">
                    {language === 'zh' ? '官方与企业精选配色:' : 'Official DATIAN & Corporate Preset Palette:'}
                  </span>
                  <span className="text-[10px] text-slate-400">Click any color swatch to apply instantly</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
                  {PRESET_THEME_COLORS.map((preset) => {
                    const isActive = localAppearance.themeColor?.toLowerCase() === preset.hex.toLowerCase();
                    return (
                      <button
                        key={preset.hex}
                        onClick={() => updateAppearance({ themeColor: preset.hex }, `Switched theme accent to ${preset.name}`)}
                        className={`p-2 rounded-xl border transition-all cursor-pointer flex flex-col items-center gap-1.5 text-center active:scale-95 ${
                          isActive
                            ? 'bg-blue-50 border-blue-500 shadow-sm ring-2 ring-blue-500/20'
                            : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        <div 
                          className="w-8 h-8 rounded-lg border border-black/15 shadow-xs flex items-center justify-center"
                          style={{ backgroundColor: preset.hex }}
                        >
                          {isActive && <Check className="w-4 h-4 text-white drop-shadow-md" />}
                        </div>
                        <div className="w-full">
                          <span className="text-[11px] font-bold text-slate-800 block truncate leading-tight">
                            {preset.name}
                          </span>
                          <span className="text-[9px] font-mono text-slate-400 uppercase">
                            {preset.hex}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Live Preview of Theme Accent Elements */}
              <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 text-white space-y-3 shadow-inner">
                <span className="text-[10px] font-mono uppercase text-cyan-400 tracking-wider font-bold block">
                  {language === 'zh' ? '主题颜色在界面组件中的生效预览' : 'Theme Accent Component Live Preview'}
                </span>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    className="px-4 py-2 rounded-xl text-white font-bold text-xs shadow-md transition"
                    style={{ backgroundColor: localAppearance.themeColor }}
                  >
                    Primary Theme Button
                  </button>

                  <button
                    className="px-3.5 py-1.5 rounded-xl border font-semibold text-xs bg-slate-800/80 transition"
                    style={{ borderColor: localAppearance.themeColor, color: localAppearance.themeColor }}
                  >
                    Border Outline Accent
                  </button>

                  <span
                    className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold text-white shadow-xs"
                    style={{ backgroundColor: localAppearance.themeColor }}
                  >
                    ACTIVE BADGE
                  </span>

                  <div 
                    className="px-3 py-1.5 rounded-lg text-xs font-mono text-white bg-slate-800/90 border"
                    style={{ 
                      borderColor: localAppearance.themeColor,
                      boxShadow: `0 0 12px ${localAppearance.themeColor}55` 
                    }}
                  >
                    Glow Element
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BACKGROUND WALLPAPER (UPLOAD & PRESETS) */}
          {appearanceTab === 'background' && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* File Upload Zone */}
              <div className="space-y-3">
                <input
                  ref={bgFileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleBgFileUpload(file);
                    e.target.value = '';
                  }}
                />

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setBgDragActive(true);
                  }}
                  onDragLeave={() => setBgDragActive(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setBgDragActive(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleBgFileUpload(file);
                  }}
                  onClick={() => bgFileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 relative overflow-hidden ${
                    bgDragActive
                      ? 'border-purple-500 bg-purple-50/50 scale-[1.01]'
                      : 'border-slate-300 hover:border-purple-500/70 hover:bg-slate-50/80 bg-slate-50/40'
                  }`}
                >
                  {isUploadingBg ? (
                    <div className="w-full max-w-xs space-y-3 py-3">
                      <RefreshCw className="w-7 h-7 text-purple-600 animate-spin mx-auto" />
                      <p className="text-xs font-bold text-slate-800">Applying background image...</p>
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-blue-600 h-2 rounded-full transition-all duration-200"
                          style={{ width: `${bgUploadProgress}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-mono text-slate-500">{bgUploadProgress}%</span>
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/10 to-blue-600/15 border border-purple-500/30 flex items-center justify-center text-purple-600 shadow-xs">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-800">
                          {language === 'zh' ? '点击或拖拽上传背景图片 (PNG, JPG, WebP, SVG, GIF)' : 'Click to Browse or Drag & Drop Background Image'}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {language === 'zh'
                            ? '支持高清工厂实景、企业蓝图、设计图或壁纸（最大支持 25MB）。'
                            : 'Upload company facility photos, blueprint schematics, or clean texture wallpapers up to 25MB.'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-[10px] font-medium font-mono text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded">
                          PNG / JPG / WEBP / SVG / GIF
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Direct Image URL input */}
                <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
                  <LinkIcon className="w-4 h-4 text-slate-400 ml-2" />
                  <input
                    type="url"
                    value={customBgUrlInput}
                    onChange={(e) => setCustomBgUrlInput(e.target.value)}
                    placeholder="Or paste direct image URL (https://...)"
                    className="flex-1 bg-transparent border-0 text-xs text-slate-700 focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      if (customBgUrlInput.trim()) {
                        updateAppearance({ backgroundImage: customBgUrlInput.trim() }, 'Custom image URL applied as background.');
                        setCustomBgUrlInput('');
                      }
                    }}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg transition cursor-pointer"
                  >
                    Apply URL
                  </button>
                </div>
              </div>

              {/* Built-in Preset Wallpapers */}
              <div className="space-y-2.5">
                <span className="text-xs font-bold text-slate-700 block">
                  {language === 'zh' ? '精选企业壁纸预设:' : 'Curated Geometric & Tech Wallpaper Presets:'}
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {PRESET_WALLPAPERS.map((wp) => {
                    const isSelected = localAppearance.backgroundImage === wp.dataUrl;
                    return (
                      <button
                        key={wp.id}
                        onClick={() => updateAppearance({ backgroundImage: wp.dataUrl }, `Applied ${wp.name} wallpaper`)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                          isSelected
                            ? 'border-purple-600 bg-purple-50/50 shadow-sm ring-2 ring-purple-500/20'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div 
                          className="w-full h-16 rounded-lg mb-2 border border-slate-700 shadow-inner relative overflow-hidden"
                          style={{
                            backgroundImage: `url("${wp.dataUrl}")`,
                            backgroundSize: 'cover'
                          }}
                        >
                          {isSelected && (
                            <div className="absolute top-1 right-1 bg-purple-600 text-white rounded p-0.5">
                              <Check className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                        <span className="text-xs font-bold text-slate-800 block truncate">{wp.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">SVG Vector Grid</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Background Status Card */}
              {localAppearance.backgroundImage && (
                <div className="flex items-center justify-between p-3.5 bg-purple-50/60 rounded-xl border border-purple-200">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-lg border border-purple-300 shadow-sm overflow-hidden"
                      style={{
                        backgroundImage: `url(${localAppearance.backgroundImage})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }}
                    />
                    <div>
                      <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-purple-600" />
                        {language === 'zh' ? '自定义背景壁纸已激活' : 'Custom Wallpaper Currently Active'}
                      </span>
                      <p className="text-[11px] text-purple-700">
                        {language === 'zh' ? '在右侧“透明度调节”中可调整不透明度和模糊度。' : 'Adjust transparency & blur in the next tab to fine-tune visibility.'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => updateAppearance({ backgroundImage: null }, 'Wallpaper cleared. Reverted to standard solid background.')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-bold transition cursor-pointer shadow-2xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{language === 'zh' ? '清除背景' : 'Remove Wallpaper'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: TRANSPARENCY & GLASSMORPHISM ("anyone can adjust transparentcy functional") */}
          {appearanceTab === 'transparency' && (
            <div className="space-y-6 animate-fadeIn">
              
              <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2.5">
                <Sliders className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>{language === 'zh' ? '全员透明度调节功能已启用:' : 'Interactive Live Transparency Active for All Users:'}</strong>{' '}
                  {language === 'zh' 
                    ? '无需管理员权限，任何用户都可以拖动下方滑块，实时微调面板磨砂玻璃透光度和背景图片显示强度。' 
                    : 'Anyone can adjust these sliders to personalize card translucency (frosted glass) and background picture opacity in real-time.'}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Control 1: Background Picture Opacity */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                      {language === 'zh' ? '背景图片不透明度' : 'Background Picture Opacity'}
                    </span>
                    <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-blue-100 text-blue-800">
                      {localAppearance.backgroundOpacity}%
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    {language === 'zh' 
                      ? '控制背景图片显现强度。较低值呈现典雅水印，较高值呈现浓郁壁纸。' 
                      : 'Controls how visible the background picture is behind your content. 25% provides a subtle watermark, 50% gives a balanced wallpaper.'}
                  </p>

                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={localAppearance.backgroundOpacity}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      updateAppearance({ backgroundOpacity: val });
                    }}
                    className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                  />

                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span>0% (Hidden)</span>
                    <span>25% (Watermark)</span>
                    <span>50% (Standard)</span>
                    <span>100% (Solid)</span>
                  </div>

                  <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                    {[
                      { label: 'Subtle', val: 20 },
                      { label: 'Balanced', val: 45 },
                      { label: 'Atmospheric', val: 70 },
                      { label: 'Full', val: 100 }
                    ].map((chip) => (
                      <button
                        key={chip.val}
                        onClick={() => updateAppearance({ backgroundOpacity: chip.val })}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold border transition cursor-pointer ${
                          localAppearance.backgroundOpacity === chip.val
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {chip.label} ({chip.val}%)
                      </button>
                    ))}
                  </div>
                </div>

                {/* Control 2: UI Panel Frosted Glass Transparency */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-emerald-600" />
                      {language === 'zh' ? '界面面板磨砂透光度' : 'UI Panel Glass Transparency'}
                    </span>
                    <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-emerald-100 text-emerald-800">
                      {localAppearance.panelTransparency}% glass
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    {language === 'zh' 
                      ? '调节系统卡片与面板的半透明玻璃效果，让背景壁纸优雅透现。' 
                      : 'Applies backdrop frosted glassmorphism to cards, tables, and views so your background wallpaper shows through.'}
                  </p>

                  <input
                    type="range"
                    min={0}
                    max={75}
                    step={5}
                    value={localAppearance.panelTransparency}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      updateAppearance({ panelTransparency: val });
                    }}
                    className="w-full accent-emerald-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                  />

                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span>0% (Solid)</span>
                    <span>15% (Subtle)</span>
                    <span>35% (Medium Glass)</span>
                    <span>75% (Sheer)</span>
                  </div>

                  <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                    {[
                      { label: 'Solid', val: 0 },
                      { label: 'Subtle Frost', val: 15 },
                      { label: 'Frosted Glass', val: 35 },
                      { label: 'Translucent', val: 55 }
                    ].map((chip) => (
                      <button
                        key={chip.val}
                        onClick={() => updateAppearance({ panelTransparency: chip.val })}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold border transition cursor-pointer ${
                          localAppearance.panelTransparency === chip.val
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {chip.label} ({chip.val}%)
                      </button>
                    ))}
                  </div>
                </div>

                {/* Control 3: Background Picture Blur */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      {language === 'zh' ? '背景图片柔化模糊度 (0px - 20px)' : 'Background Picture Blur Defocus (0px - 20px)'}
                    </span>
                    <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-purple-100 text-purple-800">
                      {localAppearance.backgroundBlur}px
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    {language === 'zh' 
                      ? '轻微模糊背景图片，确保图表、名册文字与表格数据在任何复杂背景下都清晰锐利、不刺眼。' 
                      : 'Gentle Gaussian blur prevents busy photos or factory textures from interfering with text clarity.'}
                  </p>

                  <input
                    type="range"
                    min={0}
                    max={20}
                    step={1}
                    value={localAppearance.backgroundBlur}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      updateAppearance({ backgroundBlur: val });
                    }}
                    className="w-full accent-purple-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                  />

                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span>0px (Crisp Sharp)</span>
                    <span>2px (Subtle Softness)</span>
                    <span>6px (Balanced Defocus)</span>
                    <span>20px (Dreamy Glow)</span>
                  </div>
                </div>

              </div>

              {/* Live Composite Real-Time Preview Card */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase text-slate-500 font-bold tracking-wider">
                  {language === 'zh' ? '透明度与壁纸融合实时效果预览' : 'Live Real-Time Transparency & Glassmorphism Preview'}
                </span>

                <div 
                  className="rounded-2xl border border-slate-800 p-6 min-h-[200px] relative overflow-hidden flex items-center justify-center shadow-inner"
                  style={{
                    backgroundColor: '#040a17'
                  }}
                >
                  {/* Simulated Background Layer */}
                  {localAppearance.backgroundImage && (
                    <div 
                      className="absolute inset-0 pointer-events-none transition-all duration-200"
                      style={{
                        backgroundImage: `url(${localAppearance.backgroundImage})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        opacity: localAppearance.backgroundOpacity / 100,
                        filter: localAppearance.backgroundBlur > 0 ? `blur(${localAppearance.backgroundBlur}px)` : 'none'
                      }}
                    />
                  )}

                  {/* Translucent Frosted Glass Card */}
                  <div 
                    className="relative z-10 max-w-md w-full p-4 rounded-xl border border-white/20 shadow-2xl transition-all duration-200"
                    style={{
                      backgroundColor: `rgba(9, 21, 42, ${(100 - localAppearance.panelTransparency) / 100})`,
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                      fontSize: `${localAppearance.fontSize}%`
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-white text-xs flex items-center gap-1.5">
                        <span 
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: localAppearance.themeColor }}
                        />
                        DATIAN Glassmorphic Preview
                      </span>
                      <span 
                        className="text-[9px] font-mono font-bold px-2 py-0.5 rounded text-white"
                        style={{ backgroundColor: localAppearance.themeColor }}
                      >
                        ACTIVE THEME
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Notice how the background wallpaper gracefully filters through this frosted card with {localAppearance.panelTransparency}% transparency!
                    </p>

                    <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400 font-mono pt-2 border-t border-white/10">
                      <span>Font: {localAppearance.fontSize}%</span>
                      <span>Wallpaper: {localAppearance.backgroundOpacity}%</span>
                      <span>Blur: {localAppearance.backgroundBlur}px</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Card 4: Factory General Compliance Status */}
        <div className="bg-white p-5 border border-slate-200/80 rounded-xl shadow-xs space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 pb-2.5 border-b border-slate-100">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              General Audit Integrity
            </h3>
            <p className="text-xs text-slate-500">
              All training programs are logged and structured into offline client buffers, making them secure from external leaks while maintaining operational flexibility on high-noise plant floors.
            </p>
          </div>

          <div className="py-2 px-3 bg-blue-50/50 text-[11px] text-blue-800 rounded-lg border border-blue-100/40 font-medium font-sans">
            SOP Standard Compliance: <strong>VERIFIED PRO</strong>
          </div>
        </div>

        {/* Card 5: Customize Startup Screen (Image / Video Media Studio) - Full Span */}
        <div className="bg-white p-6 border border-slate-200/80 rounded-xl shadow-sm md:col-span-2 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-150">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Film className="w-4 h-4 text-cyan-600 animate-pulse" />
                  Customize Startup Screen
                </h3>
                {localStartupMedia?.type === 'video' ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono uppercase px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                    <Video className="w-3 h-3" /> Custom Video Active
                  </span>
                ) : localStartupMedia?.type === 'image' ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono uppercase px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                    <ImageIcon className="w-3 h-3" /> Custom Image Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                    <Sparkles className="w-3 h-3 text-amber-500" /> Default Animation Active
                  </span>
                )}
                {role !== 'Admin' && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                    <Lock className="w-3 h-3" /> Admin Only
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Admins can upload an image or video to display as the application startup screen across all user sessions and devices.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {localStartupMedia && localStartupMedia.type !== 'default' && (
                <button
                  onClick={handleResetStartupToDefault}
                  disabled={role !== 'Admin'}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Revert startup screen back to default DATIAN cinematic vector animation"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore Default Animation</span>
                </button>
              )}

              {onReplayStartup && (
                <button
                  onClick={onReplayStartup}
                  className="flex items-center gap-2 px-4 py-2 bg-[#020617] hover:bg-[#0f172a] text-cyan-400 border border-cyan-500/40 text-xs font-bold rounded-lg shadow-md transition-all active:scale-95 cursor-pointer self-start sm:self-auto"
                >
                  <Play className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
                  <span>Replay Startup Screen</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Upload Zone */}
            <div className="lg:col-span-7 space-y-4">
              <input
                ref={startupFileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif,video/mp4,video/webm,video/ogg,video/quicktime"
                className="hidden"
                disabled={role !== 'Admin' || isUploadingStartup}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleStartupFileUpload(file);
                  e.target.value = '';
                }}
              />

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  if (role === 'Admin') setStartupDragActive(true);
                }}
                onDragLeave={() => setStartupDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setStartupDragActive(false);
                  if (role !== 'Admin') {
                    addToast('Permission Denied', 'Only administrators can upload startup media.', 'warning');
                    return;
                  }
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleStartupFileUpload(file);
                }}
                onClick={() => {
                  if (role !== 'Admin') {
                    addToast('Admin Required', 'Only administrators have access to change the startup screen.', 'info');
                    return;
                  }
                  startupFileInputRef.current?.click();
                }}
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 relative overflow-hidden ${
                  role !== 'Admin'
                    ? 'border-slate-200 bg-slate-50/70 cursor-not-allowed opacity-80'
                    : startupDragActive
                    ? 'border-cyan-500 bg-cyan-50/50 scale-[1.01]'
                    : 'border-slate-300 hover:border-cyan-500/70 hover:bg-slate-50/80 bg-slate-50/30'
                }`}
              >
                {isUploadingStartup ? (
                  <div className="w-full max-w-xs space-y-3 py-4">
                    <RefreshCw className="w-8 h-8 text-cyan-600 animate-spin mx-auto" />
                    <p className="text-xs font-bold text-slate-800">Uploading and processing startup media...</p>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-cyan-500 to-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${startupUploadProgress}%` }}
                      ></div>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500">{startupUploadProgress}%</span>
                  </div>
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-600/15 border border-cyan-500/30 flex items-center justify-center text-cyan-600 shadow-xs">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-800">
                        {role === 'Admin' ? 'Click to select or drag & drop startup media' : 'Startup media customization restricted to Admin'}
                      </p>
                      <p className="text-[11px] text-slate-500 max-w-md">
                        Supports high-resolution <strong>Images</strong> (PNG, JPG, SVG, WebP, GIF) or <strong>Videos</strong> (MP4, WebM, MOV) up to 50MB.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[10px] font-medium font-mono text-cyan-700 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded">
                        PNG / JPG / WEBP / SVG
                      </span>
                      <span className="text-[10px] font-medium font-mono text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded">
                        MP4 / WEBM / MOV
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Startup Media Controls (when custom media active) */}
              {localStartupMedia && localStartupMedia.type !== 'default' && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-600" />
                      Playback & Layout Adjustments
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {localStartupMedia.fileName || 'custom-media'} ({localStartupMedia.fileSize || 'Standard'})
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Fit Mode */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-slate-600 block">Screen Scaling</label>
                      <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-white w-full">
                        <button
                          type="button"
                          disabled={role !== 'Admin'}
                          onClick={() => {
                            setStartupFitMode('contain');
                            handleUpdateStartupSettings({ fitMode: 'contain' });
                          }}
                          className={`flex-1 py-1 text-xs font-medium rounded-md cursor-pointer transition text-center ${
                            startupFitMode === 'contain' ? 'bg-cyan-600 text-white font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Contain (Fit)
                        </button>
                        <button
                          type="button"
                          disabled={role !== 'Admin'}
                          onClick={() => {
                            setStartupFitMode('cover');
                            handleUpdateStartupSettings({ fitMode: 'cover' });
                          }}
                          className={`flex-1 py-1 text-xs font-medium rounded-md cursor-pointer transition text-center ${
                            startupFitMode === 'cover' ? 'bg-cyan-600 text-white font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Cover (Fill)
                        </button>
                      </div>
                    </div>

                    {/* Duration */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-slate-600 flex items-center justify-between">
                        <span>Duration</span>
                        <span className="font-mono text-cyan-700">{startupDuration}s</span>
                      </label>
                      <select
                        disabled={role !== 'Admin'}
                        value={startupDuration}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setStartupDuration(val);
                          handleUpdateStartupSettings({ duration: val });
                        }}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      >
                        <option value={3}>3 seconds (Fast)</option>
                        <option value={5}>5 seconds (Standard)</option>
                        <option value={8}>8 seconds (Extended)</option>
                        <option value={10}>10 seconds (Cinematic)</option>
                        <option value={15}>15 seconds (Full Sequence)</option>
                      </select>
                    </div>

                    {/* Sound (if video) */}
                    {localStartupMedia.type === 'video' ? (
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-slate-600 block">Startup Audio</label>
                        <button
                          type="button"
                          disabled={role !== 'Admin'}
                          onClick={() => {
                            const newSound = !startupSound;
                            setStartupSound(newSound);
                            handleUpdateStartupSettings({ soundEnabled: newSound });
                          }}
                          className={`w-full py-1 px-2.5 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition cursor-pointer ${
                            startupSound
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {startupSound ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                          <span>{startupSound ? 'Sound Enabled' : 'Muted (Default)'}</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-slate-600 block">Interactive Skip</label>
                        <div className="py-1 px-2.5 text-center rounded-lg bg-white border border-slate-200 text-xs text-slate-600">
                          Esc / Space / Enter
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Live Media Preview Column */}
            <div className="lg:col-span-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest font-mono">
                  Startup Screen Preview
                </span>
                <span className="text-[10px] font-mono text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-100">
                  {localStartupMedia?.type === 'video' ? 'Video Player' : localStartupMedia?.type === 'image' ? 'Image View' : 'Cinematic Animation'}
                </span>
              </div>

              <div className="border border-slate-800 bg-[#020617] rounded-2xl p-4 flex flex-col items-center justify-center min-h-[240px] relative overflow-hidden shadow-inner group">
                {/* Background Grid Accent */}
                <div 
                  className="absolute inset-0 opacity-15 pointer-events-none"
                  style={{
                    backgroundImage: `radial-gradient(circle at 1px 1px, rgba(56, 189, 248, 0.4) 1px, transparent 0)`,
                    backgroundSize: '16px 16px'
                  }}
                />

                {localStartupMedia?.type === 'video' ? (
                  <div className="w-full h-44 rounded-xl overflow-hidden relative flex items-center justify-center bg-black/60 border border-slate-800">
                    <video
                      src={localStartupMedia.url}
                      className={`w-full h-full ${startupFitMode === 'cover' ? 'object-cover' : 'object-contain'}`}
                      autoPlay
                      loop
                      muted={!startupSound}
                      playsInline
                    />
                    <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded text-[9px] font-mono text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                      <Video className="w-2.5 h-2.5" /> VIDEO
                    </div>
                  </div>
                ) : localStartupMedia?.type === 'image' ? (
                  <div className="w-full h-44 rounded-xl overflow-hidden relative flex items-center justify-center bg-black/60 border border-slate-800 p-2">
                    <img
                      src={localStartupMedia.url}
                      alt="Startup Preview"
                      className={`max-w-full max-h-full ${startupFitMode === 'cover' ? 'w-full h-full object-cover' : 'object-contain'}`}
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded text-[9px] font-mono text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                      <ImageIcon className="w-2.5 h-2.5" /> IMAGE
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-4">
                    <DatianLogo size="lg" withGlow={true} />
                    <span className="text-[9px] font-bold font-mono uppercase px-2.5 py-0.5 rounded-full shadow-xs text-cyan-400 bg-cyan-950/80 border border-cyan-500/40">
                      OFFICIAL DUAL-LOBE VECTOR ANIMATION
                    </span>
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between w-full text-[10px] text-slate-400 font-mono px-1">
                  <span>Press <strong className="text-cyan-300">Space/Esc</strong> to Skip</span>
                  <span>Duration: <strong className="text-cyan-300">{localStartupMedia?.duration || 5}s</strong></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 6: Permanent Corporate Brand Identity Guidelines (Full Span) */}
        <div className="bg-white p-6 border border-slate-200/80 rounded-xl shadow-sm md:col-span-2 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-150">
            <div className="space-y-1">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-blue-600" />
                Permanent Master Corporate Logo Guidelines
              </h3>
              <p className="text-xs text-slate-400">
                The official DATIAN corporate emblem standards across all training and compliance modules.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  localStorage.removeItem('tms_company_logo');
                  setCompanyLogo(null);
                  addToast('Official Logo Enforced', 'The official DATIAN corporate logo is active across all system screens.', 'success');
                }}
                className="flex items-center gap-2 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold rounded-lg shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Enforce Master DATIAN Logo</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">Corporate Branding Guidelines (New Master Logo)</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                The official <strong>DATIAN</strong> corporate emblem features dual interlocking circular lobes engineered on an executive royal blue (<span className="font-mono text-blue-700 font-semibold">#205b9f</span>) foundation. The left lobe showcases an ultra-clean white field with crisp royal blue <strong className="text-blue-700">"DA"</strong> typography, seamlessly interlocking through dual precision crescent arcs with the right lobe featuring vibrant 3D golden yellow (<span className="font-mono text-amber-600 font-semibold">#fec236</span>) <strong className="text-amber-600">"TIAN"</strong> typography.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 text-xs space-y-1">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#205b9f]"></span>
                    Royal Blue Foundation (#205b9f)
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    Represents institutional trust, CSR integrity, and lean factory manufacturing accuracy.
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 text-xs space-y-1">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#fec236]"></span>
                    3D Golden Yellow (#fec236)
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    Represents craftsmanship excellence, footwear assembly prestige, and team energy.
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-blue-50/60 text-xs text-blue-900 rounded-xl border border-blue-100 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Dual Animation & Custom Media:</strong> The startup screen seamlessly supports both the custom uploaded image or video (with custom sound and aspect ratio) as well as the default dual-lobe vector animation.
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest font-mono">Active Brand Preview</span>
                <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100 text-[10px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setPreviewTheme('dark')}
                    className={`px-2 py-0.5 rounded-md cursor-pointer transition ${previewTheme === 'dark' ? 'bg-slate-900 text-cyan-400 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
                  >
                    Dark
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewTheme('light')}
                    className={`px-2 py-0.5 rounded-md cursor-pointer transition ${previewTheme === 'light' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
                  >
                    Light
                  </button>
                </div>
              </div>

              <div className={`border rounded-xl p-5 flex items-center justify-center min-h-[170px] shadow-xs relative overflow-hidden transition-colors ${previewTheme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex flex-col items-center gap-3">
                  <DatianLogo size="lg" withGlow={previewTheme === 'dark'} />
                  <span className={`text-[9px] font-bold font-mono uppercase px-2.5 py-0.5 rounded-full shadow-xs ${previewTheme === 'dark' ? 'text-cyan-400 bg-cyan-950/80 border border-cyan-500/40' : 'text-blue-700 bg-blue-100 border border-blue-200'}`}>
                    OFFICIAL NEW DATIAN EMBLEM
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 6: Inline Text Overrides Supervisor (Full Span) */}
        <div className="bg-white p-6 border border-slate-200/80 rounded-xl shadow-sm md:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="space-y-1">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-500" />
                Inline Workspace Text Configurator Repo
              </h3>
              <p className="text-xs text-slate-400">
                Manage, review, or flush all customized text overwrites you edited inline across titles, labels, or paragraphs.
              </p>
            </div>
            {Object.keys(textOverrides).length > 0 && (
              <button
                onClick={() => {
                  if (confirm('Revert all customized text back to factory core defaults? This action is irreversible.')) {
                    resetAllOverrides();
                    addToast('Text Restored', 'Reverted all custom inline workspace labels.', 'success');
                  }
                }}
                className="text-red-650 hover:text-white hover:bg-rose-600 border border-rose-200 p-2 px-3.5 rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5 self-start cursor-pointer font-sans"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reset Custom Text
              </button>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-150 dark:border-slate-800">
              <span className="text-slate-600 dark:text-slate-300 font-medium">Active Customized Overwrites Count:</span>
              <span className="px-2.5 py-1 bg-amber-500 text-white rounded-md font-mono font-bold text-xs">
                {Object.keys(textOverrides).length} labels
              </span>
            </div>

            {Object.keys(textOverrides).length > 0 ? (
              <div className="border border-slate-150 dark:border-slate-800 rounded-lg overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-920 border-b border-slate-150 dark:border-slate-800 text-slate-550 font-mono text-[10px] uppercase">
                    <tr>
                      <th className="p-3">Reference Identifier</th>
                      <th className="p-3">Modified Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                    {Object.entries(textOverrides).map(([key, value], idx) => (
                      <tr key={`${key}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                        <td className="p-3 font-mono text-[10px] text-slate-450">{key}</td>
                        <td className="p-3 text-slate-800 dark:text-slate-200 font-medium">{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center p-6 bg-slate-50/50 dark:bg-slate-920 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 space-y-1">
                <p className="text-xs font-medium dark:text-slate-300">No customized text modifications found.</p>
                <p className="text-[11px] text-slate-400">Use the <strong className="text-amber-505 font-semibold text-amber-500">"Edit Page Text"</strong> button at the top header console to click and rename any visible element!</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
