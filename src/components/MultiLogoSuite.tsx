/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  Image as ImageIcon, 
  Trash2, 
  RefreshCcw, 
  Check, 
  FolderPlus, 
  SlidersHorizontal, 
  FileCheck, 
  ShieldAlert, 
  Layers, 
  ArrowUp, 
  ArrowDown, 
  Tags, 
  Info, 
  Sparkles,
  Search,
  CheckCircle,
  Clock,
  ExternalLink,
  Edit2
} from 'lucide-react';

interface LogoAsset {
  id: string;
  name: string;
  url: string; // Base64 or external url
  size: string; // human-readable string (e.g., "1.2 MB")
  bytes: number;
  type: string; // format eg "PNG" or "SVG"
  category: 'Logos' | 'Icons' | 'App Assets' | 'Other';
  timestamp: string;
  order: number;
}

interface MultiLogoSuiteProps {
  companyLogo: string | null;
  setCompanyLogo: (logo: string | null) => void;
  addToast: (title: string, message: string, type: 'success' | 'warning' | 'info') => void;
  role: 'Admin' | 'User';
}

const DA_TIAN_LOGO_SVG = `/datian-logo.svg`;

const DA_TIAN_VECTOR_URI = `/datian-logo.svg`;

const DEFAULT_ASSETS: LogoAsset[] = [
  {
    id: 'dati-1',
    name: 'DA TIAN Official Corporate Logo (New Edition)',
    url: DA_TIAN_LOGO_SVG,
    size: '16 KB',
    bytes: 16384,
    type: 'SVG',
    category: 'Logos',
    timestamp: 'May 28, 2026, 09:00 AM',
    order: 1
  },
  {
    id: 'dati-2',
    name: 'DA TIAN High Definition Master Emblem',
    url: DA_TIAN_VECTOR_URI,
    size: '16 KB',
    bytes: 16384,
    type: 'SVG',
    category: 'Logos',
    timestamp: 'May 28, 2026, 09:05 AM',
    order: 2
  },
  {
    id: 'default-1',
    name: 'TMS Pro Official Banner Primary',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=256&auto=format&fit=crop',
    size: '142 KB',
    bytes: 145408,
    type: 'JPEG',
    category: 'App Assets',
    timestamp: 'May 23, 2026, 09:12 AM',
    order: 3
  },
  {
    id: 'default-2',
    name: 'Blue Label Badge Icon Standard',
    url: 'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=256&auto=format&fit=crop',
    size: '88 KB',
    bytes: 90112,
    type: 'PNG',
    category: 'Icons',
    timestamp: 'May 23, 2026, 10:45 AM',
    order: 4
  }
];

export default function MultiLogoSuite({
  companyLogo,
  setCompanyLogo,
  addToast,
  role
}: MultiLogoSuiteProps) {
  // Saved assets state with persistence
  const [assets, setAssets] = useState<LogoAsset[]>(() => {
    try {
      const stored = localStorage.getItem('brand_suite_assets');
      return stored ? JSON.parse(stored) : DEFAULT_ASSETS;
    } catch {
      return DEFAULT_ASSETS;
    }
  });

  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [activeCategory, setActiveCategory] = useState<'Logos' | 'Icons' | 'App Assets' | 'Other'>('Logos');
  
  // Compression & Uniform setting states
  const [enableCompression, setEnableCompression] = useState<boolean>(true);
  const [compressionQuality, setCompressionQuality] = useState<number>(0.75); // 0.1 - 1.0 scale
  const [uniformSize, setUniformSize] = useState<boolean>(true);
  const [uniformWidth, setUniformWidth] = useState<number>(180);

  // Stats
  const totalSizeKB = assets.reduce((acc, item) => acc + (item.bytes / 1024), 0);

  // History Log logs state
  const [historyLogs, setHistoryLogs] = useState<{ id: string; msg: string; time: string }[]>(() => {
    try {
      const stored = localStorage.getItem('brand_suite_history');
      return stored ? JSON.parse(stored) : [
        { id: '1', msg: 'System configured multi-upload workspace base engine.', time: '09:00 AM' },
        { id: '2', msg: 'Initialized 3 state demo branding assets to local inventory cache.', time: '09:15 AM' }
      ];
    } catch {
      return [];
    }
  });

  // Track single replace file target
  const [replacementTargetId, setReplacementTargetId] = useState<string | null>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const multiInputRef = useRef<HTMLInputElement>(null);

  // Persist State Updates
  useEffect(() => {
    try {
      localStorage.setItem('brand_suite_assets', JSON.stringify(assets));
    } catch (e) {
      console.error('Failed to store assets directly', e);
      addToast('Storage Limit', 'Could not save asset layout to database state. File size might be too large.', 'warning');
    }
  }, [assets]);

  useEffect(() => {
    try {
      localStorage.setItem('brand_suite_history', JSON.stringify(historyLogs));
    } catch (e) {
      console.error(e);
    }
  }, [historyLogs]);

  // Push new event helper
  const addLog = (message: string) => {
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setHistoryLogs(prev => [
      { id: Date.now().toString(), msg: message, time: timeStr },
      ...prev
    ].slice(0, 30));
  };

  // Convert files base64 with compression options
  const processImageFile = (file: File): Promise<{ url: string; sizeStr: string; bytes: number }> => {
    return new Promise((resolve, reject) => {
      // Validate image size (5MB maximum)
      if (file.size > 5 * 1024 * 1024) {
        reject(new Error(`File "${file.name}" exceeds the 5MB size limit.`));
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const resultUrl = event.target?.result as string;

        // Skip compression for SVGs, they are raw vector XML
        if (file.type === 'image/svg+xml' || !enableCompression) {
          const kbSize = (file.size / 1024).toFixed(0);
          resolve({
            url: resultUrl,
            sizeStr: `${kbSize} KB`,
            bytes: file.size
          });
          return;
        }

        // Apply HTML Canvas compression & uniform resize if specified
        const img = new Image();
        img.src = resultUrl;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Uniform resizing bounds
          if (uniformSize && img.width > uniformWidth) {
            const ratio = uniformWidth / img.width;
            width = uniformWidth;
            height = img.height * ratio;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            // Fallback to original Base64 if canvas context fails
            const kbSize = (file.size / 1024).toFixed(0);
            resolve({
              url: resultUrl,
              sizeStr: `${kbSize} KB`,
              bytes: file.size
            });
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          
          // Export with custom compression quality
          const compressedUrl = canvas.toDataURL('image/jpeg', compressionQuality);
          // Calculate approximate base64 length in bytes
          const approxBytes = Math.round((compressedUrl.length - 814) * 0.75);
          const kbSize = (approxBytes / 1024).toFixed(0);

          resolve({
            url: compressedUrl,
            sizeStr: `${kbSize} KB`,
            bytes: approxBytes
          });
        };
        img.onerror = () => {
          // Fallback if image load error
          const kbSize = (file.size / 1024).toFixed(0);
          resolve({
            url: resultUrl,
            sizeStr: `${kbSize} KB`,
            bytes: file.size
          });
        };
      };
      reader.onerror = () => reject(new Error('Failed to read file buffer.'));
      reader.readAsDataURL(file);
    });
  };

  // Upload multiple images array
  const handleMultipleFilesUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    
    let uploadedCount = 0;
    let failedCount = 0;
    const newAssets: LogoAsset[] = [];

    addToast('Processing Uploads', `Verifying and parsing ${fileList.length} files...`, 'info');

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      try {
        const { url, sizeStr, bytes } = await processImageFile(file);
        
        // Push validated asset object
        const cleanName = file.name.replace(/\.[^/.]+$/, ""); // Strip file extension
        const formatLabel = file.type.split('/')[1]?.toUpperCase() || 'IMG';

        newAssets.push({
          id: `asset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: cleanName,
          url: url,
          size: sizeStr,
          bytes: bytes,
          type: formatLabel === 'SVG+XML' ? 'SVG' : formatLabel,
          category: activeCategory,
          timestamp: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ', ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          order: assets.length + i + 1
        });
        
        uploadedCount++;
      } catch (err: any) {
        failedCount++;
        addToast('Upload Blocked', err?.message || 'Invalid image structure rejected.', 'warning');
      }
    }

    if (newAssets.length > 0) {
      setAssets(prev => [...prev, ...newAssets]);
      addLog(`Added ${uploadedCount} brand assets in folder: "${activeCategory}"`);
      addToast(
        'Portfolio Refreshed', 
        `Successfully imported ${uploadedCount} asset(s).${failedCount > 0 ? ` ${failedCount} file(s) skipped.` : ''}`, 
        'success'
      );
    }
  };

  // Single file replacement flow
  const handleSingleReplaceSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !replacementTargetId) return;

    try {
      const { url, sizeStr, bytes } = await processImageFile(file);
      const fileFormat = file.type.split('/')[1]?.toUpperCase() || 'IMG';

      setAssets(prev => prev.map(item => {
        if (item.id === replacementTargetId) {
          // If replaced item is the active main logo, update the global state instantly too!
          if (companyLogo === item.url) {
            setCompanyLogo(url);
          }

          addLog(`Replaced image content of "${item.name}" with new source file.`);
          return {
            ...item,
            url: url,
            size: sizeStr,
            bytes: bytes,
            type: fileFormat === 'SVG+XML' ? 'SVG' : fileFormat,
            timestamp: `Updated: ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
          };
        }
        return item;
      }));

      addToast('Asset Swapped', 'Asset content replaced with pristine source file.', 'success');
    } catch (err: any) {
      addToast('Replacement Fail', err?.message || 'Error parsing replacement file.', 'warning');
    } finally {
      setReplacementTargetId(null);
    }
  };

  // Delete Individual asset
  const handleDeleteAsset = (id: string, name: string) => {
    const target = assets.find(item => item.id === id);
    if (target && companyLogo === target.url) {
      setCompanyLogo(null);
    }
    setAssets(prev => prev.filter(item => item.id !== id));
    addLog(`Deleted file: "${name}" from inventory.`);
    addToast('Asset Banined', `"${name}" removed from local storage.`, 'info');
  };

  // Delete all assets
  const handleDeleteAll = () => {
    if (window.confirm('WARNING: Are you sure you want to completely flush and erase ALL uploaded brand logos and images? This cannot be undone.')) {
      setAssets([]);
      setCompanyLogo(null);
      addLog('Flushed and erased entire corporate image inventory database.');
      addToast('Inventory Wiped', 'All brand assets erased. Standard fallback modules are now active.', 'warning');
    }
  };

  // Dynamic inline editing of Asset Label
  const handleRenameAsset = (id: string, currentName: string) => {
    const newName = window.prompt(`Rename asset label:`, currentName);
    if (newName && newName.trim() !== '') {
      setAssets(prev => prev.map(item => {
        if (item.id === id) {
          addLog(`Renamed asset badge from "${currentName}" to "${newName.trim()}"`);
          return { ...item, name: newName.trim() };
        }
        return item;
      }));
      addToast('Badge Edited', 'Logo metadata updated inline.', 'success');
    }
  };

  // Reorder asset prioritizations (Step Movers)
  const handleShiftOrder = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= assets.length) return;

    const reorderedList = [...assets];
    const temporary = reorderedList[index];
    reorderedList[index] = reorderedList[targetIndex];
    reorderedList[targetIndex] = temporary;

    setAssets(reorderedList);
    addLog(`Swapped asset visual sort prioritize index between ${index + 1} and ${targetIndex + 1}.`);
  };

  // Quick helper to download or view raw Base64 data
  const handleViewRawSrc = (base64Url: string) => {
    const cleanWindow = window.open();
    if (cleanWindow) {
      cleanWindow.document.write(`<iframe src="${base64Url}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
    } else {
      addToast('Popup Blocked', 'Allow popups to inspect raw image vectors.', 'info');
    }
  };

  // Drop down category assignment switch
  const handleChangeAssetCategory = (id: string, newCat: 'Logos' | 'Icons' | 'App Assets' | 'Other') => {
    setAssets(prev => prev.map(item => {
      if (item.id === id) {
        addLog(`Moved "${item.name}" from "${item.category}" to "${newCat}" folder.`);
        return { ...item, category: newCat };
      }
      return item;
    }));
    addToast('Asset Categorized', 'Successfully reassigned workspace folder tag.', 'success');
  };

  // Filter and search logic combined
  const filteredAssets = assets.filter(item => {
    const matchesCategory = filterCategory === 'All' || item.category === filterCategory;
    const matchesQuery = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         item.type.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         item.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  return (
    <div className="space-y-6">
      
      {/* Page Header Introduction */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-50 dark:bg-amber-950/40 text-[10px] uppercase font-bold tracking-wider text-amber-600 border border-amber-200/50 font-mono">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-spin" style={{ animationDuration: '3s' }} />
              Infinite Upload Systems &bull; Active Storage Engine
            </div>
            <h1 className="text-2xl font-display font-black text-slate-900 dark:text-white flex items-center gap-2">
              Corporate Branding Assets Control
            </h1>
            <p className="text-xs text-slate-505 dark:text-slate-400 max-w-2xl leading-relaxed">
              Upload multiple logo files simultaneously, categorize vectors, adjust compression quality real-time to prevent storage bloat, reorder assets visual priorities, and bind assets as company logo inside live headers.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-450 dark:text-slate-400 font-medium">Core capacity used:</span>
            <span className="p-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-mono font-bold text-xs border border-slate-200 dark:border-slate-750">
              {totalSizeKB.toFixed(1)} KB / 5.2 MB
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Column 1: Config uploaders and parameters controller */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Box A: The Multiple Upload dropzone */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4.5">
            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-slate-850 dark:text-white flex items-center gap-1.5 font-sans">
                <Upload className="w-4 h-4 text-blue-500" />
                Upload New Image Streams
              </h3>
              <p className="text-[11px] text-slate-400">
                Choose target workspace tag folder and drag single or multiple source files to save them simultaneously.
              </p>
            </div>

            {/* Folder selection tab tags */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block font-mono">Select Target Category Folder:</span>
              <div className="grid grid-cols-4 gap-1 p-1 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-150 dark:border-slate-850">
                {(['Logos', 'Icons', 'App Assets', 'Other'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`p-1.5 text-[10px] font-bold rounded transition cursor-pointer leading-tight text-center ${
                      activeCategory === cat 
                        ? 'bg-blue-600 text-white shadow-xs' 
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Drag & Drop Main Zone */}
            <div 
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files) {
                  handleMultipleFilesUpload(e.dataTransfer.files);
                }
              }}
              className={`border-2 border-dashed rounded-xl p-6 text-center select-none transition-all duration-150 ${
                isDragging 
                  ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 scale-98 shadow-inner' 
                  : 'border-slate-250 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 bg-slate-50/60 dark:bg-slate-920'
              }`}
            >
              <div className="flex flex-col items-center justify-center space-y-2.5">
                <div className={`p-3 rounded-full ${isDragging ? 'bg-blue-100 text-blue-600' : 'bg-white dark:bg-slate-800 text-slate-400 shadow-xs'}`}>
                  <Upload className="w-6 h-6 animate-bounce" />
                </div>
                <div className="space-y-1 text-xs">
                  <p className="font-bold text-slate-700 dark:text-slate-300">Drag & drop multiple files here</p>
                  <p className="text-[10px] text-slate-400">or click button below to select</p>
                </div>

                <button 
                  type="button"
                  onClick={() => multiInputRef.current?.click()}
                  className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 hover:border-slate-400 border border-slate-200 dark:border-slate-700 text-[11px] font-bold p-2 px-3.5 rounded-lg shadow-2xs transition-all pointer-events-auto cursor-pointer block"
                >
                  Browse Files
                </button>
                <input
                  ref={multiInputRef}
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                  className="hidden"
                  onChange={(e) => handleMultipleFilesUpload(e.target.files)}
                />
              </div>
            </div>

            {/* Validation specifications list */}
            <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-100/40 dark:border-blue-900/40 space-y-1.5">
              <span className="text-[10px] font-bold text-blue-800 dark:text-blue-300 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                <Info className="w-3.5 h-3.5 flex-shrink-0" /> Supported Specs:
              </span>
              <ul className="text-[11px] text-blue-700/90 dark:text-blue-200/80 space-y-1 font-sans list-disc list-inside">
                <li>Files: <strong className="font-semibold text-blue-900 dark:text-blue-100">PNG, JPG, JPEG, SVG</strong> (Uncropped).</li>
                <li>Size constraint: Maximum of <strong className="font-semibold text-blue-900 dark:text-blue-100">5 MB</strong> per file source.</li>
                <li>Target: Persists instantly to cache local database storage.</li>
              </ul>
            </div>
          </div>

          {/* Box B: Canvas pre-compressors parameters */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-850 dark:text-white flex items-center gap-1.5">
              <SlidersHorizontal className="w-4 h-4 text-amber-500" />
              Compress & Size Tuning
            </h3>

            <div className="space-y-3.5">
              {/* Option 1: Compress Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-slate-705 dark:text-slate-300 block">Pre-Compress JPG/PNG</span>
                  <span className="text-[9px] text-slate-400 block">Reduces base64 storage footprints.</span>
                </div>
                <input
                  type="checkbox"
                  checked={enableCompression}
                  onChange={(e) => setEnableCompression(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                />
              </div>

              {enableCompression && (
                <div className="space-y-1.5 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-855">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-slate-500 text-[10px]">Quality coefficient:</span>
                    <span className="text-amber-600 font-bold">{Math.round(compressionQuality * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.4"
                    max="1.0"
                    step="0.05"
                    value={compressionQuality}
                    onChange={(e) => setCompressionQuality(parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                </div>
              )}

              {/* Option 2: Max Width bounding box */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-slate-705 dark:text-slate-300 block">Auto Resize Limits</span>
                  <span className="text-[9px] text-slate-400 block">Constrains high-res files to uniform width bounds.</span>
                </div>
                <input
                  type="checkbox"
                  checked={uniformSize}
                  onChange={(e) => setUniformSize(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                />
              </div>

              {uniformSize && (
                <div className="space-y-1.5 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-855">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-slate-500 text-[10px]">Uniform width pixel:</span>
                    <span className="text-blue-600 font-bold">{uniformWidth}px</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="400"
                    step="10"
                    value={uniformWidth}
                    onChange={(e) => setUniformWidth(parseInt(e.target.value))}
                    className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Column 2: Large asset grid index (unlimited view controller) */}
        <div className="lg:col-span-2 space-y-6">

          {/* Main List Box */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            
            {/* Nav Filter controls & Bulk controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest font-mono">Folder Filter:</span>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold p-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="All">View All Folders</option>
                  <option value="Logos">Logos</option>
                  <option value="Icons">Icons</option>
                  <option value="App Assets">App Assets</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Dynamic Search Box */}
              <div className="relative flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  placeholder="Query assets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-55 pl-8 p-1.5 rounded-lg border border-slate-250 dark:border-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Action Buttons */}
              {assets.length > 0 && (
                <button
                  onClick={handleDeleteAll}
                  className="text-red-600 hover:text-white hover:bg-rose-600 border border-rose-200 p-1.5 px-3 rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer font-sans self-end"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Wipe All ({assets.length})
                </button>
              )}
            </div>

            {/* Assets Grid output */}
            {filteredAssets.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredAssets.map((asset, index) => {
                  const isActiveLogo = companyLogo === asset.url;
                  return (
                    <div 
                      key={asset.id ? `${asset.id}-${index}` : `asset-${index}`} 
                      className={`group border rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-920 p-3.5 space-y-3 transition-all duration-200 ${
                        isActiveLogo 
                          ? 'border-emerald-500/80 ring-2 ring-emerald-50 dark:ring-emerald-950 shadow-sm' 
                          : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 hover:shadow-md'
                      }`}
                    >
                      {/* Flex wrapper for upper info header */}
                      <div className="flex items-start justify-between gap-2.5">
                        
                        {/* Interactive base64 preview badge */}
                        <div className="relative w-16 h-16 bg-white border border-slate-200 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center p-1.5 shadow-2xs group-hover:scale-105 duration-150 transform">
                          <img 
                            src={asset.url} 
                            alt={asset.name} 
                            className="max-w-full max-h-full object-contain"
                            referrerPolicy="no-referrer"
                          />
                          <span className="absolute bottom-0 right-0 p-0.5 text-[8px] bg-slate-900/85 text-white font-mono leading-none rounded-tl-xs font-bold">
                            {asset.type}
                          </span>
                        </div>

                        {/* Middle textual section */}
                        <div className="flex-1 min-w-0 space-y-1">
                          
                          {/* Title with edit capability */}
                          <div className="flex items-center gap-1">
                            <h4 
                              className="font-bold text-slate-800 dark:text-white text-xs truncate max-w-[130px] select-all cursor-pointer hover:text-blue-600 flex items-center gap-1"
                              title="Click to rename asset label"
                              onClick={() => handleRenameAsset(asset.id, asset.name)}
                            >
                              <span>{asset.name}</span>
                              <Edit2 className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            </h4>
                          </div>

                          <div className="flex flex-wrap items-center gap-1">
                            {/* File info statistics badges */}
                            <span className="text-[9px] bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 text-slate-500 rounded px-1.5 py-0.5 font-mono">
                              {asset.size}
                            </span>
                            
                            {/* Category badge selector dropdown */}
                            <select
                              value={asset.category}
                              onChange={(e) => handleChangeAssetCategory(asset.id, e.target.value as any)}
                              className="text-[9px] bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold border border-amber-500/25 p-0.5 px-1 rounded cursor-pointer font-sans"
                            >
                              <option value="Logos">📂 Logos</option>
                              <option value="Icons">📂 Icons</option>
                              <option value="App Assets">📂 App Assets</option>
                              <option value="Other">📂 Other</option>
                            </select>
                          </div>

                          <p className="text-[9px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-300" /> {asset.timestamp}
                          </p>
                        </div>

                        {/* Step re-order & View raw right side actions */}
                        <div className="flex flex-col items-center justify-between gap-1 text-slate-400/80">
                          <button
                            disabled={index === 0}
                            onClick={() => handleShiftOrder(index, 'up')}
                            title="Shift sort prior high"
                            className="p-1 hover:text-slate-700 dark:hover:text-amber-450 disabled:opacity-25 transition"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            disabled={index === filteredAssets.length - 1}
                            onClick={() => handleShiftOrder(index, 'down')}
                            title="Shift sort prior low"
                            className="p-1 hover:text-slate-700 dark:hover:text-amber-450 disabled:opacity-25 transition"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                      </div>

                      {/* Bottom control trigger actions */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-150 dark:border-slate-800">
                        
                        <div className="flex items-center gap-1">
                          {/* Active logo bind trigger */}
                          {isActiveLogo ? (
                            <span className="text-[10px] bg-emerald-500 text-white font-bold p-1 px-2.5 rounded-lg inline-flex items-center gap-1.5 font-sans">
                              <CheckCircle className="w-3.5 h-3.5" /> Active Banner
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                setCompanyLogo(asset.url);
                                addLog(`Activated "${asset.name}" as uniform site-wide header brand logo.`);
                                addToast('Main Logo Bound', `"${asset.name}" is now the active branding anchor!`, 'success');
                              }}
                              className="text-slate-650 hover:bg-slate-200 dark:hover:bg-slate-800 text-[10px] font-bold p-1 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 transition cursor-pointer font-sans"
                            >
                              Set as Active Logo
                            </button>
                          )}

                          {/* Inspect vector raw base64 */}
                          <button
                            onClick={() => handleViewRawSrc(asset.url)}
                            title="Inspect core base64 text vectors inside new frame"
                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-450 hover:text-blue-500 transition cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          {/* Replace single button uploads */}
                          <button
                            onClick={() => {
                              setReplacementTargetId(asset.id);
                              // Trigger hidden file browser
                              replaceInputRef.current?.click();
                            }}
                            title="Replace keeping metadata"
                            className="bg-white hover:bg-slate-100 text-slate-720 border border-slate-250 p-1.5 text-[10px] rounded-lg font-bold font-sans cursor-pointer transition"
                          >
                            Replace
                          </button>

                          {/* Danger delete individual button */}
                          <button
                            onClick={() => handleDeleteAsset(asset.id, asset.name)}
                            title="Destroy asset"
                            className="p-1.5 hover:bg-rose-500 hover:text-white rounded-lg text-slate-400 hover:text-rose-250 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center p-12 bg-slate-50/50 dark:bg-slate-920 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-805 text-slate-400 space-y-2.5">
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-400 shadow-sm">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-705 dark:text-slate-300">No branding assets found</p>
                  <p className="text-xs text-slate-400">Search parameters might be too strict or database cache is currently bare.</p>
                </div>
              </div>
            )}
          </div>

          {/* Activity Upload Log Logs (Small section) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-850 dark:text-white flex items-center gap-1.5 uppercase tracking-wider text-[10px] text-slate-450 font-mono">
              <FileCheck className="w-4 h-4 text-emerald-500" />
              Upload History & Execution Log (Timeline)
            </h3>
            <div className="space-y-2 divide-y divide-slate-100 dark:divide-slate-800 max-h-48 overflow-y-auto pr-1.5">
              {historyLogs.map((item, idx) => (
                <div key={item.id ? `${item.id}-${idx}` : `log-${idx}`} className="pt-2 text-[11px] flex justify-between gap-4 font-sans text-slate-600 dark:text-slate-300 leading-relaxed">
                  <span className="truncate pr-2">{item.msg}</span>
                  <span className="text-[10px] font-mono text-slate-400 flex-shrink-0 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-350" /> {item.time}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* Secret File Browser for replacement */}
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/svg+xml"
        className="hidden"
        onChange={handleSingleReplaceSelect}
      />

    </div>
  );
}
