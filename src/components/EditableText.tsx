/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Edit3, Check, X, Save, RotateCcw } from 'lucide-react';
import { syncEntityToMaster, subscribeToRealtimeSync } from '../services/realtimeSync';

// Define context state types
interface EditableContextType {
  textOverrides: Record<string, string>;
  updateOverride: (key: string, value: string) => void;
  resetAllOverrides: () => void;
  editMode: boolean;
  setEditMode: (active: boolean) => void;
}

// Create Context with defaults
const EditableContext = createContext<EditableContextType | undefined>(undefined);

// Provider Component
export function EditableProvider({ children }: { children: React.ReactNode }) {
  const [textOverrides, setTextOverrides] = useState<Record<string, string>>(() => {
    try {
      const stored = localStorage.getItem('text_overrides');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const [editMode, setEditMode] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('text_edit_mode_active');
      return stored === 'true';
    } catch {
      return false;
    }
  });

  const isSyncingFromPeerRef = useRef(false);

  // Subscribe to real-time text updates across other PCs
  useEffect(() => {
    const unsubscribe = subscribeToRealtimeSync((event) => {
      if (event.entity === 'textOverrides' && event.data && typeof event.data === 'object') {
        isSyncingFromPeerRef.current = true;
        setTextOverrides(event.data);
        try {
          localStorage.setItem('text_overrides', JSON.stringify(event.data));
        } catch {}
        setTimeout(() => {
          isSyncingFromPeerRef.current = false;
        }, 400);
      }
    });
    return () => unsubscribe();
  }, []);

  // Persist edits and sync to cloud across PCs
  useEffect(() => {
    try {
      localStorage.setItem('text_overrides', JSON.stringify(textOverrides));
      if (!isSyncingFromPeerRef.current && Object.keys(textOverrides).length > 0) {
        syncEntityToMaster('textOverrides', textOverrides);
      }
    } catch (e) {
      console.error("Error storing text overrides", e);
    }
  }, [textOverrides]);

  // Persist edit mode toggle
  useEffect(() => {
    try {
      localStorage.setItem('text_edit_mode_active', String(editMode));
    } catch (e) {
      console.error("Error storing edit mode preference", e);
    }
  }, [editMode]);

  const updateOverride = (key: string, value: string) => {
    setTextOverrides(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const resetAllOverrides = () => {
    setTextOverrides({});
    localStorage.removeItem('text_overrides');
  };

  return (
    <EditableContext.Provider value={{
      textOverrides,
      updateOverride,
      resetAllOverrides,
      editMode,
      setEditMode
    }}>
      {children}
    </EditableContext.Provider>
  );
}

// Custom hook to consume context
export function useEditable() {
  const context = useContext(EditableContext);
  if (!context) {
    return {
      textOverrides: {},
      updateOverride: () => {},
      resetAllOverrides: () => {},
      editMode: false,
      setEditMode: () => {},
    };
  }
  return context;
}

// Editable Text Renderer
interface EditableTextProps {
  id: string;
  defaultText: string;
  className?: string;
  /**
   * 'input' for single line (titles, labels, buttons)
   * 'textarea' for multiple lines (paragraphs, descriptions)
   */
  type?: 'input' | 'textarea';
  /**
   * Stop click propagation in edit mode. Essential for buttons and clickable lists!
   */
  stopPropagation?: boolean;
  /**
   * Direct wrap style helper
   */
  isButtonText?: boolean;
}

export function EditableText({
  id,
  defaultText,
  className = '',
  type = 'input',
  stopPropagation = true,
  isButtonText = false
}: EditableTextProps) {
  const { textOverrides, updateOverride, editMode } = useEditable();
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(textOverrides[id] || defaultText);
  const [autoSaved, setAutoSaved] = useState(false);
  
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  // Sync state if external dictionary updates
  useEffect(() => {
    if (textOverrides[id] !== undefined) {
      setValue(textOverrides[id]);
    } else {
      setValue(defaultText);
    }
  }, [textOverrides, id, defaultText]);

  // Focus input automatically when editing triggers
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      // Select text for quick editing
      if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select();
      }
    }
  }, [isEditing]);

  const handleSave = () => {
    const trimmed = value.trim();
    const finalValue = trimmed === '' ? defaultText : trimmed;
    updateOverride(id, finalValue);
    setIsEditing(false);
    
    // Mini visual toast confirm
    setAutoSaved(true);
    setTimeout(() => {
      setAutoSaved(false);
    }, 1500);
  };

  const handleCancel = () => {
    setValue(textOverrides[id] || defaultText);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && type === 'input') {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (editMode) {
      if (stopPropagation) {
        e.preventDefault();
        e.stopPropagation();
      }
      setIsEditing(true);
    }
  };

  const activeTextDisplay = textOverrides[id] || defaultText;

  // Render direct interactive editor panel inline
  if (isEditing) {
    return (
      <span 
        onClick={(e) => stopPropagation && e.stopPropagation()} 
        className="inline-flex items-center gap-1.5 w-full relative z-30"
      >
        {type === 'textarea' ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="w-full min-h-[80px] text-xs p-1.5 border-2 border-blue-500 rounded bg-white text-slate-900 font-sans focus:outline-none shadow-sm focus:ring-1 focus:ring-blue-500 transition-all font-medium inline-block"
            rows={3}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className={`px-1.5 py-0.5 border-2 border-blue-500 rounded bg-white text-slate-900 focus:outline-none shadow-xs font-medium w-full max-w-full ${
              isButtonText ? 'text-slate-800 text-xs text-center font-bold' : ''
            }`}
          />
        )}
        
        {/* Helper Control Keys strictly inline so they don't break flex layouts */}
        <span className="flex items-center gap-1 flex-shrink-0 bg-slate-100 p-0.5 rounded border border-slate-200">
          <button
            onMouseDown={(e) => {
              // use onMouseDown to fire before input blur
              e.preventDefault();
              e.stopPropagation();
              handleSave();
            }}
            title="Auto-save & Apply"
            className="p-1 hover:bg-emerald-500 hover:text-white rounded text-slate-705 transition cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleCancel();
            }}
            title="Discard changes"
            className="p-1 hover:bg-rose-500 hover:text-white rounded text-slate-500 transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </span>
      </span>
    );
  }

  // Visual layout for element rendered normally but supporting editor mode
  return (
    <span
      onClick={handleClick}
      onDoubleClick={() => setIsEditing(true)}
      title={editMode ? "Click to edit directly" : "Double-click to edit text"}
      className={`relative group/editable transition-all duration-150 inline-block max-w-full ${
        editMode 
          ? 'cursor-pointer hover:bg-yellow-50/70 border-b border-dashed border-amber-400/60 transition bg-yellow-50/10 px-0.5 rounded' 
          : 'hover:bg-slate-100/30'
      } ${className}`}
    >
      {activeTextDisplay}
      
      {/* Small Edit indicators rendered dynamically for edit mode */}
      {editMode && (
        <span className="absolute -top-3.5 -right-3.5 bg-amber-500 text-white rounded-full p-0.5 shadow opacity-0 group-hover/editable:opacity-100 transition-opacity duration-150 pointer-events-none scale-75 z-20">
          <Edit3 className="w-2.5 h-2.5" />
        </span>
      )}

      {/* Temp flash for auto-saved confirming */}
      {autoSaved && (
        <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[9px] px-1.5 py-0.5 rounded shadow animate-ping font-mono font-bold whitespace-nowrap z-30">
          Auto-saved
        </span>
      )}
    </span>
  );
}
