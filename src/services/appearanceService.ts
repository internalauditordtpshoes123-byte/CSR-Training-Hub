/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AppearanceSettings {
  fontSize: number; // percentage, e.g. 100 for normal, 85 for small, 115 for medium-large, 130 for large, 145 for extra large
  themeColor: string; // hex string, e.g. '#2563eb'
  customColors: string[]; // user-added custom hex colors
  backgroundImage: string | null; // dataUrl or image URL
  backgroundOpacity: number; // 0 to 100 (%)
  backgroundBlur: number; // 0 to 20 (px)
  panelTransparency: number; // 0 to 80 (%)
  updatedAt?: string;
  updatedBy?: string;
}

export const PRESET_THEME_COLORS: { name: string; hex: string; category?: string }[] = [
  { name: 'Datian Royal Blue', hex: '#205b9f', category: 'Official' },
  { name: 'Imperial Amber', hex: '#f59e0b', category: 'Official' },
  { name: 'Electric Azure', hex: '#2563eb', category: 'Modern' },
  { name: 'Emerald Jade', hex: '#10b981', category: 'Modern' },
  { name: 'Crimson Ruby', hex: '#e11d48', category: 'Modern' },
  { name: 'Electric Violet', hex: '#8b5cf6', category: 'Modern' },
  { name: 'Cyan Aqua', hex: '#06b6d4', category: 'Modern' },
  { name: 'Tangerine Sunset', hex: '#f97316', category: 'Vibrant' },
  { name: 'Rose Blossom', hex: '#ec4899', category: 'Vibrant' },
  { name: 'Deep Indigo', hex: '#6366f1', category: 'Corporate' },
  { name: 'Teal Forest', hex: '#14b8a6', category: 'Corporate' },
  { name: 'Golden Yellow', hex: '#fec236', category: 'Official' },
  { name: 'Obsidian Slate', hex: '#64748b', category: 'Neutral' },
  { name: 'Midnight Navy', hex: '#1e293b', category: 'Neutral' }
];

export const PRESET_WALLPAPERS: { id: string; name: string; preview: string; dataUrl: string }[] = [
  {
    id: 'blueprint-grid',
    name: 'Executive Blueprint',
    preview: 'bg-blue-950',
    dataUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(37,99,235,0.25)" stroke-width="1"/><circle cx="40" cy="40" r="1.5" fill="rgba(37,99,235,0.4)"/></pattern></defs><rect width="100%" height="100%" fill="%23060f1e"/><rect width="100%" height="100%" fill="url(%23grid)"/></svg>`
  },
  {
    id: 'carbon-dots',
    name: 'High-Tech Carbon Matrix',
    preview: 'bg-slate-950',
    dataUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><defs><pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="12" cy="12" r="1" fill="rgba(245,158,11,0.25)"/><circle cx="0" cy="0" r="0.8" fill="rgba(56,189,248,0.2)"/></pattern></defs><rect width="100%" height="100%" fill="%23040914"/><rect width="100%" height="100%" fill="url(%23dots)"/></svg>`
  },
  {
    id: 'geometric-diamonds',
    name: 'Datian Precision Lattice',
    preview: 'bg-[#09152a]',
    dataUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60"><path d="M30 0 L60 30 L30 60 L0 30 Z" fill="none" stroke="rgba(32,91,159,0.2)" stroke-width="1"/><path d="M30 15 L45 30 L30 45 L15 30 Z" fill="none" stroke="rgba(254,194,54,0.15)" stroke-width="0.8"/><rect width="100%" height="100%" fill="none"/></svg>`
  },
  {
    id: 'ambient-waves',
    name: 'Atmospheric Deep Ocean',
    preview: 'bg-indigo-950',
    dataUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23030712"/><stop offset="50%" stop-color="%230b1933"/><stop offset="100%" stop-color="%23020617"/></linearGradient></defs><rect width="100%" height="100%" fill="url(%23grad)"/><circle cx="20" cy="30" r="40" fill="rgba(37,99,235,0.08)"/><circle cx="80" cy="70" r="50" fill="rgba(245,158,11,0.05)"/></svg>`
  }
];

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  fontSize: 100, // 100% default
  themeColor: '#205b9f', // Datian Royal Blue
  customColors: ['#205b9f', '#f59e0b', '#10b981', '#e11d48', '#8b5cf6', '#06b6d4', '#f97316', '#6366f1'],
  backgroundImage: null,
  backgroundOpacity: 45, // 45% default opacity
  backgroundBlur: 2, // 2px default blur
  panelTransparency: 20 // 20% default glass transparency
};

const LOCAL_STORAGE_KEY = 'datian_csr_appearance_settings_v2';

/**
 * Helper to convert hex to RGB components
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let cleanHex = hex.replace('#', '').trim();
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(c => c + c).join('');
  }
  const intVal = parseInt(cleanHex, 16);
  if (isNaN(intVal) || cleanHex.length !== 6) {
    return { r: 32, g: 91, b: 159 }; // Fallback to #205b9f
  }
  return {
    r: (intVal >> 16) & 255,
    g: (intVal >> 8) & 255,
    b: intVal & 255
  };
}

/**
 * Helper to darken or lighten a hex color
 */
export function adjustHexBrightness(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex);
  const factor = 1 + percent / 100;
  const newR = Math.min(255, Math.max(0, Math.round(r * factor)));
  const newG = Math.min(255, Math.max(0, Math.round(g * factor)));
  const newB = Math.min(255, Math.max(0, Math.round(b * factor)));
  return `#${((1 << 24) + (newR << 16) + (newG << 8) + newB).toString(16).slice(1)}`;
}

/**
 * Directly applies appearance settings to document DOM and CSS variables
 */
export function applyAppearanceToDOM(settings: AppearanceSettings): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  // 1. Text Size (Scales entire app via rem base)
  const fontPercent = Math.max(75, Math.min(160, settings.fontSize || 100));
  root.style.fontSize = `${fontPercent}%`;

  // 2. Theme Colors
  const themeHex = settings.themeColor || '#205b9f';
  const rgb = hexToRgb(themeHex);
  const hoverHex = adjustHexBrightness(themeHex, -15);
  const glowRgba = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.35)`;

  root.style.setProperty('--theme-color', themeHex);
  root.style.setProperty('--theme-color-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
  root.style.setProperty('--theme-color-hover', hoverHex);
  root.style.setProperty('--theme-glow', glowRgba);

  // 3. Transparency & Opacity
  const panelAlpha = Math.max(0.15, Math.min(1, (100 - (settings.panelTransparency || 0)) / 100));
  root.style.setProperty('--theme-panel-opacity', panelAlpha.toString());
  root.style.setProperty('--panel-transparency', `${(settings.panelTransparency || 0) / 100}`);
  root.style.setProperty('--bg-image-opacity', `${(settings.backgroundOpacity ?? 45) / 100}`);
  root.style.setProperty('--bg-image-blur', `${settings.backgroundBlur || 0}px`);

  // Data attributes for targeted CSS selectors
  root.setAttribute('data-panel-glass', (settings.panelTransparency || 0) > 0 ? 'true' : 'false');
  root.setAttribute('data-has-custom-bg', settings.backgroundImage ? 'true' : 'false');
}

/**
 * Load initial appearance from localStorage or defaults
 */
export function getInitialAppearance(): AppearanceSettings {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...DEFAULT_APPEARANCE,
        ...parsed,
        customColors: Array.isArray(parsed.customColors) && parsed.customColors.length > 0
          ? parsed.customColors
          : DEFAULT_APPEARANCE.customColors
      };
    }
  } catch (err) {
    console.warn('Failed to parse appearance settings from localStorage:', err);
  }
  return DEFAULT_APPEARANCE;
}

/**
 * Fetch appearance from server
 */
export async function fetchServerAppearance(): Promise<AppearanceSettings | null> {
  try {
    const res = await fetch('/api/settings/appearance');
    if (!res.ok) return null;
    const json = await res.json();
    if (json.success && json.appearance) {
      // Sync into localStorage
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(json.appearance));
      } catch {}
      return json.appearance;
    }
  } catch (err) {
    // Graceful fallback to client state
  }
  return null;
}

/**
 * Save appearance settings to server and localStorage
 */
export async function saveAppearanceSettings(
  settings: AppearanceSettings,
  user?: string
): Promise<AppearanceSettings> {
  const updated: AppearanceSettings = {
    ...settings,
    updatedAt: new Date().toISOString(),
    updatedBy: user || 'User'
  };

  // 1. Immediately apply to local DOM
  applyAppearanceToDOM(updated);

  // 2. Save to localStorage for instant reload
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('LocalStorage save failed:', e);
  }

  // 3. Sync to server database
  try {
    const res = await fetch('/api/settings/appearance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.appearance) {
        return json.appearance;
      }
    }
  } catch (err) {
    console.warn('Server sync failed, retained local settings:', err);
  }

  return updated;
}

/**
 * Reset appearance back to factory defaults
 */
export async function resetAppearanceSettings(user?: string): Promise<AppearanceSettings> {
  const resetData: AppearanceSettings = {
    ...DEFAULT_APPEARANCE,
    updatedAt: new Date().toISOString(),
    updatedBy: user || 'User'
  };

  applyAppearanceToDOM(resetData);

  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(resetData));
  } catch {}

  try {
    await fetch('/api/settings/appearance/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updatedBy: user || 'User' })
    });
  } catch {}

  return resetData;
}
