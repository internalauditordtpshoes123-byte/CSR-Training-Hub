/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  fetchSpreadsheetFromServer,
  syncSpreadsheetToServer,
  subscribeToRealtimeSync
} from '../services/realtimeSync';
import {
  FileSpreadsheet,
  Plus,
  Trash2,
  Download,
  Upload,
  Undo2,
  Redo2,
  Search,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ChevronDown,
  Sparkles,
  ArrowRight,
  Square,
  Circle,
  HelpCircle,
  MoreHorizontal,
  PlusCircle,
  FolderPlus,
  RefreshCw,
  Image as ImageIcon,
  CheckSquare,
  List,
  Type,
  Maximize2,
  Minimize2,
  Scissors,
  Copy,
  Clipboard,
  X,
  FileEdit,
  Info
} from 'lucide-react';
import { UserRole } from '../types';

interface SpreadsheetCell {
  value: string;
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  backgroundColor?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  align?: 'left' | 'center' | 'right';
  valign?: 'top' | 'middle' | 'bottom';
  wrapText?: boolean;
  checkbox?: boolean;
  dropdown?: string[];
  borderAll?: boolean;
  borderLeft?: boolean;
  borderRight?: boolean;
  borderTop?: boolean;
  borderBottom?: boolean;
  comment?: string;
}

interface SpreadsheetMergedRange {
  sc: number; // start col
  sr: number; // start row
  ec: number; // end col
  er: number; // end row
}

interface ShapeItem {
  id: string;
  type: 'rect' | 'circle' | 'arrow' | 'star' | 'textbox';
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

interface ImageItem {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Worksheet {
  name: string;
  cells: { [key: string]: SpreadsheetCell }; // "row,col" key
  rowsCount: number;
  colsCount: number;
  columnWidths: { [col: number]: number };
  rowHeights: { [row: number]: number };
  freezeRows: number;
  freezeCols: number;
  merges: SpreadsheetMergedRange[];
  shapes: ShapeItem[];
  images: ImageItem[];
}

interface SpreadsheetFile {
  id: string;
  name: string;
  updatedAt: string;
  sheets: Worksheet[];
  activeSheetIndex: number;
}

interface ExcelSpreadsheetProps {
  storageKey: string;
  role: UserRole;
  addToast: (title: string, message: string, type: 'success' | 'warning' | 'info') => void;
  defaultTemplateName: string;
  initialTemplateData: SpreadsheetFile[];
}

export default function ExcelSpreadsheet({
  storageKey,
  role,
  addToast,
  defaultTemplateName,
  initialTemplateData,
}: ExcelSpreadsheetProps) {
  // Check read-only state based on role
  const isReadOnly = role === 'User';

  const checkPermission = (): boolean => {
    if (isReadOnly) {
      addToast(
        'Read-Only Mode',
        'Your user profile is set to Read-Only. Toggle Admin Mode in Settings to unlock editing.',
        'warning'
      );
      return false;
    }
    return true;
  };

  // State
  const [files, setFiles] = useState<SpreadsheetFile[]>(() => {
    const saved = localStorage.getItem(`excel_workspace_${storageKey}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (err) {
        console.error('Error parsing spreadsheet storage', err);
      }
    }
    return initialTemplateData;
  });

  const [activeFileId, setActiveFileId] = useState<string>(() => {
    const savedId = localStorage.getItem(`excel_active_file_${storageKey}`);
    if (savedId) {
      return savedId;
    }
    return files[0]?.id || '';
  });

  // Active File, Active Sheet references
  const activeFile = useMemo(() => {
    return files.find((f) => f.id === activeFileId) || files[0] || null;
  }, [files, activeFileId]);

  const activeSheetIndex = activeFile ? activeFile.activeSheetIndex : 0;
  const activeSheet = useMemo(() => {
    if (!activeFile) return null;
    return activeFile.sheets[activeSheetIndex] || activeFile.sheets[0] || null;
  }, [activeFile, activeSheetIndex]);

  // UI Selection states
  const [selectedRange, setSelectedRange] = useState<{
    sr: number; // start row
    sc: number; // start col
    er: number; // end row
    ec: number; // end col
  } | null>(null);

  const [editingCell, setEditingCell] = useState<{ r: number; c: number } | null>(null);
  const [editInputVal, setEditInputVal] = useState('');
  const [dragStartCell, setDragStartCell] = useState<{ r: number; c: number } | null>(null);
  const [isDraggingToSelect, setIsDraggingToSelect] = useState(false);

  // Drag-to-fill features
  const [isDraggingToFill, setIsDraggingToFill] = useState(false);
  const [fillRange, setFillRange] = useState<{ sr: number; sc: number; er: number; ec: number } | null>(null);

  // Undo/Redo history stack per file
  const [undoStack, setUndoStack] = useState<{ [fileId: string]: Worksheet[][] }>({});
  const [redoStack, setRedoStack] = useState<{ [fileId: string]: Worksheet[][] }>({});

  const pushToHistory = (fileId: string, currentSheetsState: Worksheet[]) => {
    // Deep clone state
    const clone = JSON.parse(JSON.stringify(currentSheetsState));
    setUndoStack((prev) => {
      const fileStack = prev[fileId] || [];
      // Keep max 20 states
      return {
        ...prev,
        [fileId]: [...fileStack.slice(-19), clone],
      };
    });
    // Clear redo
    setRedoStack((prev) => ({ ...prev, [fileId]: [] }));
  };

  const handleUndo = () => {
    if (!activeFile) return;
    const fileId = activeFile.id;
    const fileStack = undoStack[fileId] || [];
    if (fileStack.length === 0) {
      addToast('No Undo History', 'Nothing left to undo.', 'info');
      return;
    }

    const prevSheetsState = fileStack[fileStack.length - 1];
    const newUndoStack = fileStack.slice(0, -1);

    // Push current to redo
    const currentClone = JSON.parse(JSON.stringify(activeFile.sheets));
    setRedoStack((prev) => {
      const fileRedo = prev[fileId] || [];
      return {
        ...prev,
        [fileId]: [...fileRedo, currentClone],
      };
    });

    setUndoStack((prev) => ({ ...prev, [fileId]: newUndoStack }));

    // Apply previous state
    setFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, sheets: prevSheetsState, updatedAt: new Date().toISOString() } : f))
    );
    addToast('Undo', 'Reverted last change.', 'info');
  };

  const handleRedo = () => {
    if (!activeFile) return;
    const fileId = activeFile.id;
    const fileRedo = redoStack[fileId] || [];
    if (fileRedo.length === 0) {
      addToast('No Redo History', 'Nothing left to redo.', 'info');
      return;
    }

    const nextSheetsState = fileRedo[fileRedo.length - 1];
    const newRedoStack = fileRedo.slice(0, -1);

    // Push current to undo
    const currentClone = JSON.parse(JSON.stringify(activeFile.sheets));
    setUndoStack((prev) => {
      const fileUndo = prev[fileId] || [];
      return {
        ...prev,
        [fileId]: [...fileUndo, currentClone],
      };
    });

    setRedoStack((prev) => ({ ...prev, [fileId]: newRedoStack }));

    setFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, sheets: nextSheetsState, updatedAt: new Date().toISOString() } : f))
    );
    addToast('Redo', 'Applied redone change.', 'info');
  };

  // Clipboard context
  const [clipboard, setClipboard] = useState<{
    cells: { [key: string]: SpreadsheetCell };
    sr: number;
    sc: number;
    er: number;
    ec: number;
    isCut: boolean;
  } | null>(null);

  // Search & Replace
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);

  // Selected column to filter / sort
  const [activeFilterCol, setActiveFilterCol] = useState<number | null>(null);
  const [columnFilterText, setColumnFilterText] = useState('');

  // Floating shape/image states
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [isResizingOrMoving, setIsResizingOrMoving] = useState<boolean>(false);

  // Active inputs for note validation etc
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);
  const [validationType, setValidationType] = useState<'checkbox' | 'dropdown'>('dropdown');
  const [validationOptions, setValidationOptions] = useState('');

  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [commentText, setCommentText] = useState('');

  const [activeCellRef, setActiveCellRef] = useState<string>('');

  // Custom dialog states to replace native prompt and confirm in sandboxed iframe environments
  const [promptModal, setPromptModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    defaultValue: string;
    onOk: (val: string) => void;
  } | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const isSyncingFromPeerRef = useRef(false);

  // Cloud Database Initial Load & Real-Time Sync Subscription
  useEffect(() => {
    let mounted = true;

    // 1. Initial Load from Authoritative Cloud Server
    fetchSpreadsheetFromServer(storageKey).then((cloudData) => {
      if (!mounted) return;
      if (cloudData && Array.isArray(cloudData) && cloudData.length > 0) {
        isSyncingFromPeerRef.current = true;
        setFiles(cloudData);
        if (cloudData[0]?.id) {
          setActiveFileId((prev) => (cloudData.some((f: any) => f.id === prev) ? prev : cloudData[0].id));
        }
        setTimeout(() => {
          isSyncingFromPeerRef.current = false;
        }, 400);
      }
    });

    // 2. Real-Time Broadcast Listener from Connected PCs
    const unsubscribe = subscribeToRealtimeSync((event) => {
      if (event.entity === `spreadsheet_${storageKey}` || event.type === 'SPREADSHEET_UPDATED') {
        if (event.data?.key === storageKey && event.data?.spreadsheet) {
          isSyncingFromPeerRef.current = true;
          setFiles(event.data.spreadsheet);
          setTimeout(() => {
            isSyncingFromPeerRef.current = false;
          }, 300);
        }
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [storageKey]);

  // Auto-Save Persistence & Real-Time Cloud Broadcast
  useEffect(() => {
    try {
      localStorage.setItem(`excel_workspace_${storageKey}`, JSON.stringify(files));
    } catch {}

    if (!isSyncingFromPeerRef.current && files && files.length > 0) {
      syncSpreadsheetToServer(storageKey, files);
    }
  }, [files, storageKey]);

  useEffect(() => {
    if (activeFileId) {
      try {
        localStorage.setItem(`excel_active_file_${storageKey}`, activeFileId);
      } catch {}
    }
  }, [activeFileId, storageKey]);

  // Update formula bar active status coordinate string
  useEffect(() => {
    if (selectedRange) {
      const colLetter = String.fromCharCode(65 + selectedRange.sc);
      const rowNum = selectedRange.sr + 1;
      setActiveCellRef(`${colLetter}${rowNum}`);
      const valStr = activeSheet?.cells[`${selectedRange.sr},${selectedRange.sc}`]?.value || '';
      setEditInputVal(String(valStr));
    } else {
      setActiveCellRef('');
      setEditInputVal('');
    }
  }, [selectedRange, activeSheet]);

  // keydown event handler to clear selected cell range contents when pressing 'Delete' or 'Backspace'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If user typing inside an input or textarea, don't clear cells
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.getAttribute('contenteditable') === 'true')
      ) {
        return;
      }
      
      if (editingCell) return;
      if (!selectedRange || !activeSheet || isReadOnly) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        
        pushToHistory(activeFileId, activeFile!.sheets);

        updateActiveSheet((sheet) => {
          const newCells = { ...sheet.cells };
          for (let r = selectedRange.sr; r <= selectedRange.er; r++) {
            for (let c = selectedRange.sc; c <= selectedRange.ec; c++) {
              const key = `${r},${c}`;
              if (newCells[key]) {
                newCells[key] = { ...newCells[key], value: '' };
              }
            }
          }
          return {
            ...sheet,
            cells: newCells,
          };
        });
        
        setEditInputVal('');
        addToast('Cleared Range', 'Erased data inside selected cell range.', 'info');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedRange, activeSheet, activeFileId, editingCell, isReadOnly]);

  // General utility
  const colIndexToLabel = (index: number): string => {
    let label = '';
    let temp = index;
    while (temp >= 0) {
      label = String.fromCharCode((temp % 26) + 65) + label;
      temp = Math.floor(temp / 26) - 1;
    }
    return label;
  };

  // Convert A1 / B12 labels back into row column index coordinates
  const labelToCellCoords = (label: string): { r: number; c: number } | null => {
    const match = label.toUpperCase().match(/^([A-Z]+)([0-9]+)$/);
    if (!match) return null;
    const colStr = match[1];
    const rowStr = match[2];

    let col = 0;
    for (let i = 0; i < colStr.length; i++) {
      col = col * 26 + (colStr.charCodeAt(i) - 64);
    }
    col -= 1; // 0-indexed
    const row = parseInt(rowStr, 10) - 1; // 0-indexed
    return { r: row, c: col };
  };

  // Sheet operations
  const updateActiveSheet = (updater: (sheet: Worksheet) => Worksheet) => {
    if (!activeFile || !activeSheet) return;
    pushToHistory(activeFile.id, activeFile.sheets);

    setFiles((prev) =>
      prev.map((f) => {
        if (f.id !== activeFile.id) return f;
        const newSheets = f.sheets.map((s, idx) => (idx === activeSheetIndex ? updater(s) : s));
        return {
          ...f,
          sheets: newSheets,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  // Modify cell value or visual format properties
  const handleCellChange = (r: number, c: number, updates: Partial<SpreadsheetCell>) => {
    if (!checkPermission()) return;
    updateActiveSheet((sheet) => {
      const key = `${r},${c}`;
      const existing = sheet.cells[key] || { value: '' };
      return {
        ...sheet,
        cells: {
          ...sheet.cells,
          [key]: { ...existing, ...updates },
        },
      };
    });
  };

  // Batch update of formatting style across a selected range
  const applyStyleToSelection = (updates: Partial<SpreadsheetCell>) => {
    if (!selectedRange || !activeSheet) return;
    if (!checkPermission()) return;

    updateActiveSheet((sheet) => {
      const newCells = { ...sheet.cells };
      for (let r = selectedRange.sr; r <= selectedRange.er; r++) {
        for (let c = selectedRange.sc; c <= selectedRange.ec; c++) {
          const key = `${r},${c}`;
          const existing = sheet.cells[key] || { value: '' };

          // Construct fresh styles or toggle values if needed
          const newCell = { ...existing };
          Object.keys(updates).forEach((prop) => {
            const k = prop as keyof SpreadsheetCell;
            if (updates[k] === 'toggle') {
              // Boolean toggle properties
              if (k === 'bold') newCell.bold = !existing.bold;
              else if (k === 'italic') newCell.italic = !existing.italic;
              else if (k === 'underline') newCell.underline = !existing.underline;
              else if (k === 'strikethrough') newCell.strikethrough = !existing.strikethrough;
              else if (k === 'wrapText') newCell.wrapText = !existing.wrapText;
              else if (k === 'checkbox') newCell.checkbox = !existing.checkbox;
            } else {
              // Standard value assignment
              (newCell as any)[k] = updates[k];
            }
          });

          newCells[key] = newCell;
        }
      }
      return { ...sheet, cells: newCells };
    });
    addToast('Range Updated', 'Successfully modified formatting across selected range.', 'success');
  };

  // Rows and columns modifications
  const handleAddRow = () => {
    if (!checkPermission()) return;
    updateActiveSheet((sheet) => ({
      ...sheet,
      rowsCount: sheet.rowsCount + 10,
    }));
    addToast('Rows Appended', 'Added 10 more rows at the bottom of the worksheet.', 'success');
  };

  const handleInsertRow = () => {
    if (!selectedRange || !checkPermission()) return;
    const targetRow = selectedRange.sr;

    updateActiveSheet((sheet) => {
      const newCells: { [key: string]: SpreadsheetCell } = {};
      Object.keys(sheet.cells).forEach((k) => {
        const [rStr, cStr] = k.split(',');
        const r = parseInt(rStr, 10);
        const c = parseInt(cStr, 10);
        if (r >= targetRow) {
          newCells[`${r + 1},${c}`] = sheet.cells[k];
        } else {
          newCells[k] = sheet.cells[k];
        }
      });

      // Shift merges
      const newMerges = sheet.merges.map((m) => {
        if (m.sr >= targetRow) return { ...m, sr: m.sr + 1, er: m.er + 1 };
        if (m.er >= targetRow) return { ...m, er: m.er + 1 };
        return m;
      });

      return {
        ...sheet,
        rowsCount: sheet.rowsCount + 1,
        cells: newCells,
        merges: newMerges,
      };
    });
    addToast('Row Inserted', `Inserted a new empty row above row ${targetRow + 1}.`, 'success');
  };

  const handleDeleteRow = () => {
    if (!selectedRange || !checkPermission()) return;
    const startRow = selectedRange.sr;
    const endRow = selectedRange.er;
    const rowsToDelete = endRow - startRow + 1;

    updateActiveSheet((sheet) => {
      const newCells: { [key: string]: SpreadsheetCell } = {};
      Object.keys(sheet.cells).forEach((k) => {
        const [rStr, cStr] = k.split(',');
        const r = parseInt(rStr, 10);
        const c = parseInt(cStr, 10);
        if (r < startRow) {
          newCells[k] = sheet.cells[k];
        } else if (r > endRow) {
          newCells[`${r - rowsToDelete},${c}`] = sheet.cells[k];
        }
      });

      // Revise merges
      const newMerges = sheet.merges
        .map((m) => {
          if (m.sr > endRow) return { ...m, sr: m.sr - rowsToDelete, er: m.er - rowsToDelete };
          if (m.er < startRow) return m;
          // overlaps merge box
          return null;
        })
        .filter((m): m is SpreadsheetMergedRange => m !== null);

      return {
        ...sheet,
        rowsCount: Math.max(10, sheet.rowsCount - rowsToDelete),
        cells: newCells,
        merges: newMerges,
      };
    });
    setSelectedRange(null);
    addToast('Rows Deleted', 'Successfully removed selected row rows.', 'success');
  };

  const handleInsertCol = () => {
    if (!selectedRange || !checkPermission()) return;
    const targetCol = selectedRange.sc;

    updateActiveSheet((sheet) => {
      const newCells: { [key: string]: SpreadsheetCell } = {};
      Object.keys(sheet.cells).forEach((k) => {
        const [rStr, cStr] = k.split(',');
        const r = parseInt(rStr, 10);
        const c = parseInt(cStr, 10);
        if (c >= targetCol) {
          newCells[`${r},${c + 1}`] = sheet.cells[k];
        } else {
          newCells[k] = sheet.cells[k];
        }
      });

      // Shift merges
      const newMerges = sheet.merges.map((m) => {
        if (m.sc >= targetCol) return { ...m, sc: m.sc + 1, ec: m.ec + 1 };
        if (m.ec >= targetCol) return { ...m, ec: m.ec + 1 };
        return m;
      });

      return {
        ...sheet,
        colsCount: sheet.colsCount + 1,
        cells: newCells,
        merges: newMerges,
      };
    });
    addToast('Column Inserted', `Inserted a new empty column to the left of Column ${colIndexToLabel(targetCol)}.`, 'success');
  };

  const handleDeleteCol = () => {
    if (!selectedRange || !checkPermission()) return;
    const startCol = selectedRange.sc;
    const endCol = selectedRange.ec;
    const colsToDelete = endCol - startCol + 1;

    updateActiveSheet((sheet) => {
      const newCells: { [key: string]: SpreadsheetCell } = {};
      Object.keys(sheet.cells).forEach((k) => {
        const [rStr, cStr] = k.split(',');
        const r = parseInt(rStr, 10);
        const c = parseInt(cStr, 10);
        if (c < startCol) {
          newCells[k] = sheet.cells[k];
        } else if (c > endCol) {
          newCells[`${r},${c - colsToDelete}`] = sheet.cells[k];
        }
      });

      // Revise merges
      const newMerges = sheet.merges
        .map((m) => {
          if (m.sc > endCol) return { ...m, sc: m.sc - colsToDelete, ec: m.ec - colsToDelete };
          if (m.ec < startCol) return m;
          return null;
        })
        .filter((m): m is SpreadsheetMergedRange => m !== null);

      return {
        ...sheet,
        colsCount: Math.max(5, sheet.colsCount - colsToDelete),
        cells: newCells,
        merges: newMerges,
      };
    });
    setSelectedRange(null);
    addToast('Columns Deleted', 'Successfully removed selected columns from sheet.', 'success');
  };

  // Merge & Unmerge
  const handleMergeSelection = () => {
    if (!selectedRange || !checkPermission()) return;
    const { sr, sc, er, ec } = selectedRange;
    if (sr === er && sc === ec) {
      addToast('Cannot Merge', 'Select at least 2 cells to merge them together.', 'warning');
      return;
    }

    updateActiveSheet((sheet) => {
      // Clean overlap
      const filteredMerges = sheet.merges.filter(
        (m) => !(m.sr >= sr && m.er <= er && m.sc >= sc && m.ec <= ec)
      );

      const newMerge: SpreadsheetMergedRange = { sr, sc, er, ec };
      return {
        ...sheet,
        merges: [...filteredMerges, newMerge],
      };
    });
    addToast('Cells Merged', 'Merged your active range selection into a single visual span.', 'success');
  };

  const handleUnmergeSelection = () => {
    if (!selectedRange || !checkPermission()) return;
    const { sr, sc, er, ec } = selectedRange;

    updateActiveSheet((sheet) => {
      const filteredMerges = sheet.merges.filter(
        (m) => !(m.sr >= sr && m.er <= er && m.sc >= sc && m.ec <= ec)
      );
      return {
        ...sheet,
        merges: filteredMerges,
      };
    });
    addToast('Cells Unmerged', 'Separated previously merged blocks inside range boundary.', 'success');
  };

  // Copy/Cut/Paste values
  const handleCopy = () => {
    if (!selectedRange || !activeSheet) return;
    const { sr, sc, er, ec } = selectedRange;
    const cellsToCopy: { [key: string]: SpreadsheetCell } = {};

    for (let r = sr; r <= er; r++) {
      for (let c = sc; c <= ec; c++) {
        const key = `${r},${c}`;
        if (activeSheet.cells[key]) {
          cellsToCopy[`${r - sr},${c - sc}`] = { ...activeSheet.cells[key] };
        }
      }
    }

    setClipboard({
      cells: cellsToCopy,
      sr,
      sc,
      er,
      ec,
      isCut: false,
    });
    addToast('Copied', 'Selection copied to workspace clipboard.', 'info');
  };

  const handleCut = () => {
    if (!selectedRange || !activeSheet || !checkPermission()) return;
    const { sr, sc, er, ec } = selectedRange;
    const cellsToCopy: { [key: string]: SpreadsheetCell } = {};

    for (let r = sr; r <= er; r++) {
      for (let c = sc; c <= ec; c++) {
        const key = `${r},${c}`;
        if (activeSheet.cells[key]) {
          cellsToCopy[`${r - sr},${c - sc}`] = { ...activeSheet.cells[key] };
        }
      }
    }

    setClipboard({
      cells: cellsToCopy,
      sr,
      sc,
      er,
      ec,
      isCut: true,
    });
    addToast('Cut Selection', 'Selection moved to workspace clipboard (Cut).', 'info');
  };

  const handlePaste = () => {
    if (!clipboard || !selectedRange || !checkPermission()) {
      addToast('Clipboard Empty', 'Nothing copied or cut. Select cells and press copy first.', 'warning');
      return;
    }

    const { sr, sc } = selectedRange; // paste starting anchor
    const sourceRows = clipboard.er - clipboard.sr + 1;
    const sourceCols = clipboard.ec - clipboard.sc + 1;

    updateActiveSheet((sheet) => {
      const newCells = { ...sheet.cells };

      // Paste data
      Object.keys(clipboard.cells).forEach((k) => {
        const [offsetRStr, offsetCStr] = k.split(',');
        const offsetR = parseInt(offsetRStr, 10);
        const offsetC = parseInt(offsetCStr, 10);

        const targetR = sr + offsetR;
        const targetC = sc + offsetC;

        if (targetR < sheet.rowsCount && targetC < sheet.colsCount) {
          newCells[`${targetR},${targetC}`] = { ...clipboard.cells[k] };
        }
      });

      // Clear source if cut action
      if (clipboard.isCut) {
        for (let r = clipboard.sr; r <= clipboard.er; r++) {
          for (let c = clipboard.sc; c <= clipboard.ec; c++) {
            const key = `${r},${c}`;
            delete newCells[key];
          }
        }
        setClipboard(null); // clear clipboard
      }

      return {
        ...sheet,
        cells: newCells,
      };
    });

    // Automatically expand selection to include newly pasted range
    setSelectedRange({
      sr,
      sc,
      er: Math.min(activeSheet!.rowsCount - 1, sr + sourceRows - 1),
      ec: Math.min(activeSheet!.colsCount - 1, sc + sourceCols - 1),
    });

    addToast('Pasted', 'Pasted content from clipboard successfully.', 'success');
  };

  // Drag-to-fill features
  const handleDragFillStart = (e: React.MouseEvent, r: number, c: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!checkPermission()) return;
    setIsDraggingToFill(true);
    setFillRange({ sr: r, sc: c, er: r, ec: c });
  };

  const handleCellMouseEnter = (r: number, c: number) => {
    if (isDraggingToSelect && dragStartCell) {
      setSelectedRange({
        sr: Math.min(dragStartCell.r, r),
        sc: Math.min(dragStartCell.c, c),
        er: Math.max(dragStartCell.r, r),
        ec: Math.max(dragStartCell.c, c),
      });
    } else if (isDraggingToFill && selectedRange) {
      // Drag either vertical or horizontal, prioritizing direction of greater offset
      const vertOffset = r - selectedRange.er;
      const horizOffset = c - selectedRange.ec;

      if (Math.abs(vertOffset) >= Math.abs(horizOffset)) {
        // Drag vertical
        setFillRange({
          sr: selectedRange.sr,
          sc: selectedRange.sc,
          er: Math.max(selectedRange.er, r),
          ec: selectedRange.ec,
        });
      } else {
        // Drag horizontal
        setFillRange({
          sr: selectedRange.sr,
          sc: selectedRange.sc,
          er: selectedRange.er,
          ec: Math.max(selectedRange.ec, c),
        });
      }
    }
  };

  const handleDragMouseUp = () => {
    if (isDraggingToSelect) {
      setIsDraggingToSelect(false);
      setDragStartCell(null);
    } else if (isDraggingToFill && selectedRange && fillRange) {
      setIsDraggingToFill(false);
      const { sr, sc, er, ec } = selectedRange;
      const fRange = fillRange;

      // Handle autofill cell logic
      updateActiveSheet((sheet) => {
        const newCells = { ...sheet.cells };

        // Determine source block pattern values
        const sourceKeys = [];
        for (let r = sr; r <= er; r++) {
          for (let c = sc; c <= ec; c++) {
            sourceKeys.push({ r, c, val: sheet.cells[`${r},${c}`] });
          }
        }

        if (sourceKeys.length === 0) return sheet;

        // Populate vertical fill range
        if (fRange.er > er) {
          const patternHeight = er - sr + 1;
          for (let r = er + 1; r <= fRange.er; r++) {
            for (let c = sc; c <= ec; c++) {
              const srcOffsetRow = sr + ((r - er - 1) % patternHeight);
              const srcCell = sheet.cells[`${srcOffsetRow},${c}`];
              if (srcCell) {
                // Suffix numeric incrementer support
                let finalVal = srcCell.value;
                const matchNum = String(finalVal).match(/^(.*?)(\d+)$/);
                if (matchNum) {
                  const prefix = matchNum[1];
                  const numVal = parseInt(matchNum[2], 10);
                  const step = Math.floor((r - er - 1) / patternHeight) + 1;
                  finalVal = `${prefix}${numVal + step}`;
                }
                newCells[`${r},${c}`] = { ...srcCell, value: finalVal };
              }
            }
          }
        }
        // Populate horizontal fill range
        else if (fRange.ec > ec) {
          const patternWidth = ec - sc + 1;
          for (let r = sr; r <= er; r++) {
            for (let c = ec + 1; c <= fRange.ec; c++) {
              const srcOffsetCol = sc + ((c - ec - 1) % patternWidth);
              const srcCell = sheet.cells[`${r},${srcOffsetCol}`];
              if (srcCell) {
                let finalVal = srcCell.value;
                const matchNum = String(finalVal).match(/^(.*?)(\d+)$/);
                if (matchNum) {
                  const prefix = matchNum[1];
                  const numVal = parseInt(matchNum[2], 10);
                  const step = Math.floor((c - ec - 1) / patternWidth) + 1;
                  finalVal = `${prefix}${numVal + step}`;
                }
                newCells[`${r},${c}`] = { ...srcCell, value: finalVal };
              }
            }
          }
        }

        return { ...sheet, cells: newCells };
      });

      setSelectedRange({
        sr: fRange.sr,
        sc: fRange.sc,
        er: fRange.er,
        ec: fRange.ec,
      });
      setFillRange(null);
      addToast('Smart Filled', 'Replicated content and extended numbering patterns down range.', 'success');
    }
  };

  useEffect(() => {
    window.addEventListener('mouseup', handleDragMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleDragMouseUp);
    };
  }, [isDraggingToSelect, isDraggingToFill, selectedRange, fillRange, dragStartCell]);

  // Validation data structures
  const handleApplyValidation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkPermission()) return;
    const opts = validationOptions.split(',').map((o) => o.trim()).filter((o) => o.length > 0);

    applyStyleToSelection({
      checkbox: validationType === 'checkbox',
      dropdown: validationType === 'dropdown' ? opts : undefined,
    });

    setIsValidationModalOpen(false);
    addToast('Data Validation Applied', `Successfully modified selected cell validation controls.`, 'success');
  };

  // Comments addition
  const handleApplyComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkPermission()) return;

    applyStyleToSelection({
      comment: commentText.trim() ? commentText.trim() : undefined,
    });

    setIsCommentModalOpen(false);
    addToast('Annotation Saved', 'Comments linked to active selection successfully.', 'success');
  };

  // Column level Sorting and Filtering
  const handleSortZToA = (colIdx: number) => {
    if (!activeSheet || !checkPermission()) return;
    updateActiveSheet((sheet) => {
      // Find row ranges that are populated to sort them without losing entire formatting indices
      const sortedRows = Array.from({ length: sheet.rowsCount }, (_, i) => i)
        .slice(1); // skip headers (standard Row 0 is header)

      sortedRows.sort((a, b) => {
        const valA = String(sheet.cells[`${a},${colIdx}`]?.value || '').trim();
        const valB = String(sheet.cells[`${b},${colIdx}`]?.value || '').trim();
        // Numeric sort fallback if applicable
        const numA = parseFloat(valA);
        const numB = parseFloat(valB);
        if (!isNaN(numA) && !isNaN(numB)) {
          return numB - numA;
        }
        return valB.localeCompare(valA);
      });

      const newCells: { [key: string]: SpreadsheetCell } = {};
      // Retain header row unchanged
      for (let c = 0; c < sheet.colsCount; c++) {
        if (sheet.cells[`0,${c}`]) {
          newCells[`0,${c}`] = sheet.cells[`0,${c}`];
        }
      }

      // Map rows
      sortedRows.forEach((oldRowIdx, newRowIdx) => {
        const targetRow = newRowIdx + 1; // skip header row index
        for (let c = 0; c < sheet.colsCount; c++) {
          const oldKey = `${oldRowIdx},${c}`;
          if (sheet.cells[oldKey]) {
            newCells[`${targetRow},${c}`] = sheet.cells[oldKey];
          }
        }
      });

      return {
        ...sheet,
        cells: newCells,
      };
    });
    addToast('Column Sorted', 'Column items sorted in descending Z-A sequence.', 'success');
  };

  const handleSortAToZ = (colIdx: number) => {
    if (!activeSheet || !checkPermission()) return;
    updateActiveSheet((sheet) => {
      const sortedRows = Array.from({ length: sheet.rowsCount }, (_, i) => i).slice(1);

      sortedRows.sort((a, b) => {
        const valA = String(sheet.cells[`${a},${colIdx}`]?.value || '').trim();
        const valB = String(sheet.cells[`${b},${colIdx}`]?.value || '').trim();
        const numA = parseFloat(valA);
        const numB = parseFloat(valB);
        if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB;
        }
        return valA.localeCompare(valB);
      });

      const newCells: { [key: string]: SpreadsheetCell } = {};
      for (let c = 0; c < sheet.colsCount; c++) {
        if (sheet.cells[`0,${c}`]) {
          newCells[`0,${c}`] = sheet.cells[`0,${c}`];
        }
      }

      sortedRows.forEach((oldRowIdx, newRowIdx) => {
        const targetRow = newRowIdx + 1;
        for (let c = 0; c < sheet.colsCount; c++) {
          const oldKey = `${oldRowIdx},${c}`;
          if (sheet.cells[oldKey]) {
            newCells[`${targetRow},${c}`] = sheet.cells[oldKey];
          }
        }
      });

      return {
        ...sheet,
        cells: newCells,
      };
    });
    addToast('Column Sorted', 'Column items sorted in ascending A-Z sequence.', 'success');
  };

  // Search and replace functionality
  const handleSearchReplace = (replaceOption: 'single' | 'all') => {
    if (!activeSheet || !searchQuery || !checkPermission()) return;

    updateActiveSheet((sheet) => {
      const newCells = { ...sheet.cells };
      let updatedCount = 0;

      Object.keys(sheet.cells).forEach((key) => {
        const cell = sheet.cells[key];
        const textVal = String(cell.value);

        if (textVal.toLowerCase().includes(searchQuery.toLowerCase())) {
          if (replaceOption === 'single' && updatedCount > 0) return;

          // Replace occurrence
          const re = new RegExp(searchQuery, 'gi');
          const finalVal = textVal.replace(re, replaceQuery);
          newCells[key] = { ...cell, value: finalVal };
          updatedCount++;
        }
      });

      if (updatedCount > 0) {
        addToast(
          'Replaced successfully',
          `Substituted match pattern inside ${updatedCount} spreadsheet cells.`,
          'success'
        );
      } else {
        addToast('No match found', `The query pattern "${searchQuery}" didn't match any cells.`, 'warning');
      }

      return {
        ...sheet,
        cells: newCells,
      };
    });
  };

  // Dropdowns selection trigger
  const handleDropdownCellValChange = (r: number, c: number, val: string) => {
    handleCellChange(r, c, { value: val });
  };

  // Import / Export Excel Logic
  const handleExportToExcelFile = () => {
    if (!activeFile) return;

    try {
      const wb = XLSX.utils.book_new();

      activeFile.sheets.forEach((sheet) => {
        // Build 2D array representation
        const matrix: any[][] = [];
        for (let r = 0; r < sheet.rowsCount; r++) {
          const rowData: any[] = [];
          for (let c = 0; c < sheet.colsCount; c++) {
            const cellVal = sheet.cells[`${r},${c}`]?.value || '';
            rowData.push(cellVal);
          }
          matrix.push(rowData);
        }

        const ws = XLSX.utils.aoa_to_sheet(matrix);

        // Apply column widths to Excel output if configured
        const wscols: any[] = [];
        for (let c = 0; c < sheet.colsCount; c++) {
          const w = sheet.columnWidths[c] || 100;
          wscols.push({ wch: Math.round(w / 8.5) + 3 });
        }
        ws['!cols'] = wscols;

        // Applies row merges
        if (sheet.merges.length > 0) {
          ws['!merges'] = sheet.merges.map((m) => ({
            s: { r: m.sr, c: m.sc },
            e: { r: m.er, c: m.ec },
          }));
        }

        XLSX.utils.book_append_sheet(wb, ws, sheet.name);
      });

      // trigger download
      XLSX.writeFile(wb, `${activeFile.name}.xlsx`);
      addToast('Excel Exported', 'Downloaded file directly as high-fidelity workbook.', 'success');
    } catch (err) {
      console.error(err);
      addToast('Error Exporting', 'Failed to generate binary excel package.', 'warning');
    }
  };

  const handleImportExcelFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!checkPermission()) return;
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        if (!data) return;

        const workbook = XLSX.read(data, { type: 'binary' });
        const importSheets: Worksheet[] = [];

        workbook.SheetNames.forEach((sheetName) => {
          const ws = workbook.Sheets[sheetName];
          const rawAoa = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });

          // Sizing matrix
          const rowsCount = Math.max(50, rawAoa.length + 10);
          let maxCols = 15;
          rawAoa.forEach((row) => {
            if (row && row.length > maxCols) {
              maxCols = row.length;
            }
          });
          const colsCount = Math.max(20, maxCols + 5);

          const cells: { [key: string]: SpreadsheetCell } = {};

          rawAoa.forEach((row, ri) => {
            if (!row) return;
            row.forEach((cellVal, ci) => {
              if (cellVal !== undefined && cellVal !== null) {
                cells[`${ri},${ci}`] = {
                  value: String(cellVal),
                };
              }
            });
          });

          // Extract Merges
          const mergesList: SpreadsheetMergedRange[] = [];
          if (ws['!merges']) {
            ws['!merges'].forEach((m) => {
              mergesList.push({
                sr: m.s.r,
                sc: m.s.c,
                er: m.e.r,
                ec: m.e.c,
              });
            });
          }

          importSheets.push({
            name: sheetName,
            cells,
            rowsCount,
            colsCount,
            columnWidths: {},
            rowHeights: {},
            freezeRows: 0,
            freezeCols: 0,
            merges: mergesList,
            shapes: [],
            images: [],
          });
        });

        if (importSheets.length === 0) {
          addToast('Empty Document', 'Active excel document had 0 sheets.', 'warning');
          return;
        }

        // Add a new file with import sheets
        const newFile: SpreadsheetFile = {
          id: `excel_${Date.now()}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          updatedAt: new Date().toISOString(),
          sheets: importSheets,
          activeSheetIndex: 0,
        };

        setFiles((prev) => [newFile, ...prev]);
        setActiveFileId(newFile.id);
        setSelectedRange(null);
        addToast('Excel Imported', `Loaded "${file.name}" with ${importSheets.length} sheet tabs successfully!`, 'success');
      } catch (err) {
        console.error(err);
        addToast('Import Error', 'Failed parsing raw spreadsheet values. Check integrity.', 'warning');
      }
    };
    reader.readAsBinaryString(file);
    // clear value
    e.target.value = '';
  };

  // Add workbooks
  const handleAddNewWorkbook = () => {
    if (!checkPermission()) return;
    const newFile: SpreadsheetFile = {
      id: `excel_${Date.now()}`,
      name: `${defaultTemplateName} Workspace ${files.length + 1}`,
      updatedAt: new Date().toISOString(),
      sheets: [
        {
          name: 'Sheet 1',
          cells: {},
          rowsCount: 60,
          colsCount: 15,
          columnWidths: {},
          rowHeights: {},
          freezeRows: 0,
          freezeCols: 0,
          merges: [],
          shapes: [],
          images: [],
        },
      ],
      activeSheetIndex: 0,
    };

    setFiles((prev) => [newFile, ...prev]);
    setActiveFileId(newFile.id);
    setSelectedRange(null);
    addToast('Created Workspace', 'Opened a new blank sheet tracking workspace.', 'success');
  };

  const handleRenameWorkbook = (fileId: string) => {
    if (!checkPermission()) return;
    const file = files.find((f) => f.id === fileId);
    if (!file) return;

    setPromptModal({
      isOpen: true,
      title: 'Rename Spreadsheet Workspace',
      message: 'Enter a new title for this spreadsheet workspace:',
      defaultValue: file.name,
      onOk: (newName) => {
        if (newName && newName.trim()) {
          setFiles((prev) =>
            prev.map((f) => (f.id === fileId ? { ...f, name: newName.trim(), updatedAt: new Date().toISOString() } : f))
          );
          addToast('Workspace Renamed', `Changed title to "${newName.trim()}".`, 'success');
        }
      }
    });
  };

  const handleDeleteWorkbook = (fileId: string) => {
    if (!checkPermission()) return;
    if (files.length <= 1) {
      addToast('Action Prohibited', 'You cannot delete the sole remaining workspace. Create another first.', 'warning');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Delete Spreadsheet',
      message: 'Are you sure you want to delete this spreadsheet? All data and attachments inside will be permanently destroyed.',
      onConfirm: () => {
        const remaining = files.filter((f) => f.id !== fileId);
        setFiles(remaining);
        setActiveFileId(remaining[0].id);
        setSelectedRange(null);
        addToast('File Deleted', 'Workspace wiped out from memory storage.', 'success');
      }
    });
  };

  // Sheet Tabs Addition / Rename / Delete
  const handleAddSheetTab = () => {
    if (!activeFile || !checkPermission()) return;
    const nextIdx = activeFile.sheets.length + 1;

    pushToHistory(activeFile.id, activeFile.sheets);
    setFiles((prev) =>
      prev.map((f) => {
        if (f.id !== activeFile.id) return f;
        const freshTab: Worksheet = {
          name: `Sheet ${nextIdx}`,
          cells: {},
          rowsCount: 60,
          colsCount: 15,
          columnWidths: {},
          rowHeights: {},
          freezeRows: 0,
          freezeCols: 0,
          merges: [],
          shapes: [],
          images: [],
        };
        return {
          ...f,
          sheets: [...f.sheets, freshTab],
          activeSheetIndex: f.sheets.length,
          updatedAt: new Date().toISOString(),
        };
      })
    );
    setSelectedRange(null);
    addToast('Sheet Added', `Created empty workspace tab "Sheet ${nextIdx}".`, 'success');
  };

  const handleRenameSheetTab = (idx: number) => {
    if (!activeFile || !checkPermission()) return;
    const targetSheet = activeFile.sheets[idx];
    if (!targetSheet) return;

    setPromptModal({
      isOpen: true,
      title: 'Rename Sheet Tab',
      message: 'Enter a new label for this sheet tab:',
      defaultValue: targetSheet.name,
      onOk: (newName) => {
        if (newName && newName.trim()) {
          pushToHistory(activeFile.id, activeFile.sheets);
          setFiles((prev) =>
            prev.map((f) => {
              if (f.id !== activeFile.id) return f;
              const freshSheets = f.sheets.map((s, i) => (i === idx ? { ...s, name: newName.trim() } : s));
              return {
                ...f,
                sheets: freshSheets,
                updatedAt: new Date().toISOString(),
              };
            })
          );
          addToast('Tab Renamed', `Label changed to "${newName.trim()}".`, 'success');
        }
      }
    });
  };

  const handleDeleteSheetTab = (idx: number) => {
    if (!activeFile || !checkPermission()) return;
    if (activeFile.sheets.length <= 1) {
      addToast('Prohibited action', 'Workbooks require at least one active sheet.', 'warning');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Delete Sheet Tab',
      message: 'Wipe out this sheet tab and all its cell data? This action is irreversible.',
      onConfirm: () => {
        pushToHistory(activeFile.id, activeFile.sheets);
        setFiles((prev) =>
          prev.map((f) => {
            if (f.id !== activeFile.id) return f;
            const freshSheets = f.sheets.filter((_, i) => i !== idx);
            return {
              ...f,
              sheets: freshSheets,
              activeSheetIndex: Math.max(0, f.activeSheetIndex - 1),
              updatedAt: new Date().toISOString(),
            };
          })
        );
        setSelectedRange(null);
        addToast('Tab deleted', 'Sheet wiped out from memory.', 'success');
      }
    });
  };

  // Freeze top/left selectors
  const handleToggleFreezeTopRow = () => {
    if (!activeSheet || !checkPermission()) return;
    updateActiveSheet((sheet) => ({
      ...sheet,
      freezeRows: sheet.freezeRows === 0 ? 1 : 0,
    }));
    addToast('Freeze Changed', activeSheet.freezeRows === 0 ? 'Locked the first row in place.' : 'Unlocked top row.', 'info');
  };

  const handleToggleFreezeLeftCol = () => {
    if (!activeSheet || !checkPermission()) return;
    updateActiveSheet((sheet) => ({
      ...sheet,
      freezeCols: sheet.freezeCols === 0 ? 1 : 0,
    }));
    addToast('Freeze Changed', activeSheet.freezeCols === 0 ? 'Locked the first column in place.' : 'Unlocked first column.', 'info');
  };

  // Add notes dialog triggers
  const openCommentDialog = () => {
    if (!selectedRange || !activeSheet) {
      addToast('Select cell', 'Click a cell to bind comments.', 'warning');
      return;
    }
    const val = activeSheet.cells[`${selectedRange.sr},${selectedRange.sc}`]?.comment || '';
    setCommentText(val);
    setIsCommentModalOpen(true);
  };

  // Add shapes overlays
  const handleInsertShape = (type: ShapeItem['type']) => {
    if (!activeSheet || !checkPermission()) return;

    const newShape: ShapeItem = {
      id: `shape_${Date.now()}`,
      type,
      label: type === 'textbox' ? 'Double click to edit visual text' : `Shape: ${type}`,
      x: 150 + (activeSheet.shapes.length * 20),
      y: 150 + (activeSheet.shapes.length * 20),
      width: type === 'textbox' ? 180 : 120,
      height: type === 'textbox' ? 80 : 100,
      color: type === 'textbox' ? '#fdf6e2' : '#3b82f6', // soft orange for textbox or clear blue
    };

    updateActiveSheet((sheet) => ({
      ...sheet,
      shapes: [...sheet.shapes, newShape],
    }));

    setSelectedShapeId(newShape.id);
    setSelectedImageId(null);
    addToast('Shape Added', `Placed draggable ${type} shape on the worksheet workspace!`, 'success');
  };

  const handleMoveOrResizeShape = (shapeId: string, updates: Partial<ShapeItem>) => {
    updateActiveSheet((sheet) => ({
      ...sheet,
      shapes: sheet.shapes.map((s) => (s.id === shapeId ? { ...s, ...updates } : s)),
    }));
  };

  const handleDeleteShape = (shapeId: string) => {
    updateActiveSheet((sheet) => ({
      ...sheet,
      shapes: sheet.shapes.filter((s) => s.id !== shapeId),
    }));
    setSelectedShapeId(null);
    addToast('Item Removed', 'Visual layout item deleted.', 'success');
  };

  // Insert attachment image
  const handleInsertImageAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeSheet || !checkPermission()) return;
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const srcStr = evt.target?.result as string;
      if (!srcStr) return;

      const newImg: ImageItem = {
        id: `img_${Date.now()}`,
        src: srcStr,
        x: 200 + (activeSheet.images.length * 30),
        y: 200 + (activeSheet.images.length * 30),
        width: 160,
        height: 120,
      };

      updateActiveSheet((sheet) => ({
        ...sheet,
        images: [...sheet.images, newImg],
      }));

      setSelectedImageId(newImg.id);
      setSelectedShapeId(null);
      addToast('Image Linked', 'Securely embedded visual media attachment over spreadsheet.', 'success');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleMoveOrResizeImage = (imgId: string, updates: Partial<ImageItem>) => {
    updateActiveSheet((sheet) => ({
      ...sheet,
      images: sheet.images.map((im) => (im.id === imgId ? { ...im, ...updates } : im)),
    }));
  };

  const handleDeleteImage = (imgId: string) => {
    updateActiveSheet((sheet) => ({
      ...sheet,
      images: sheet.images.filter((im) => im.id !== imgId),
    }));
    setSelectedImageId(null);
    addToast('Image deleted', 'Wiped attachment from workbook memory.', 'success');
  };

  // Sum / Avg status bar computation
  const statusBarStats = useMemo(() => {
    if (!selectedRange || !activeSheet) return null;
    let sum = 0;
    let count = 0;
    let numericCount = 0;

    for (let r = selectedRange.sr; r <= selectedRange.er; r++) {
      for (let c = selectedRange.sc; c <= selectedRange.ec; c++) {
        count++;
        const cellVal = activeSheet.cells[`${r},${c}`]?.value;
        if (cellVal !== undefined && cellVal !== null && cellVal !== '') {
          const num = parseFloat(String(cellVal));
          if (!isNaN(num)) {
            sum += num;
            numericCount++;
          }
        }
      }
    }

    if (numericCount === 0) return { count };
    return {
      count,
      sum: sum.toFixed(2),
      avg: (sum / numericCount).toFixed(2),
      numericCount,
    };
  }, [selectedRange, activeSheet]);

  // Merge checking map
  const mergeCellLookup = useMemo(() => {
    if (!activeSheet) return { spans: {}, hidden: {} };
    const spans: { [key: string]: { rspan: number; cspan: number } } = {};
    const hidden: { [key: string]: boolean } = {};

    activeSheet.merges.forEach((m) => {
      spans[`${m.sr},${m.sc}`] = {
        rspan: m.er - m.sr + 1,
        cspan: m.ec - m.sc + 1,
      };

      for (let r = m.sr; r <= m.er; r++) {
        for (let c = m.sc; c <= m.ec; c++) {
          if (r === m.sr && c === m.sc) continue;
          hidden[`${r},${c}`] = true;
        }
      }
    });

    return { spans, hidden };
  }, [activeSheet]);

  return (
    <div id="excel_canvas_root" className="bg-[#f8fafc] text-slate-800 rounded-xl border border-slate-200 overflow-hidden flex flex-col h-[700px] shadow-sm select-none">
      
      {/* SECTION 1: WORKSPACE SUB-HEADER FILE MANAGER */}
      <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3 overflow-x-auto scrollbar-none py-1">
          <div className="flex items-center gap-1.5 font-bold text-blue-400 mr-2 flex-shrink-0">
            <FileSpreadsheet className="w-5 h-5 text-blue-500" />
            <span className="uppercase tracking-wide">Excel Docs</span>
          </div>

          {files.map((file) => {
            const isActive = file.id === activeFileId;
            return (
              <div
                key={file.id}
                onClick={() => {
                  setActiveFileId(file.id);
                  setSelectedRange(null);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer transition ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <span className="max-w-[140px] truncate">{file.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRenameWorkbook(file.id);
                  }}
                  className="hover:text-amber-300 p-0.5"
                  title="Rename workspace"
                >
                  <FileEdit className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteWorkbook(file.id);
                  }}
                  className="hover:text-red-400 p-0.5"
                  title="Delete file permanently"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}

          <button
            onClick={handleAddNewWorkbook}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold cursor-pointer whitespace-nowrap"
          >
            <FolderPlus className="w-3.5 h-3.5 text-blue-400" /> Add New
          </button>
        </div>

        {/* Binary Importers */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <label className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-md cursor-pointer transition">
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            <span>Import XLS</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleImportExcelFile}
              className="hidden"
            />
          </label>
          <button
            onClick={handleExportToExcelFile}
            className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-md transition font-semibold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export XLS</span>
          </button>
        </div>
      </div>

      {/* SECTION 2: EXCEL FUNCTION RIBBON TOOLBAR */}
      <div className="bg-white border-b border-slate-200 px-4 py-2 flex flex-wrap items-center justify-between gap-2.5 text-xs">
        
        {/* Ribbon group 1: Undo stack, alignment, font toggle */}
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center gap-0.5 bg-slate-100 rounded-md p-0.5">
            <button
              onClick={handleUndo}
              className="p-1 px-2 rounded-md hover:bg-white text-slate-600 transition"
              title="Undo Action"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleRedo}
              className="p-1 px-2 rounded-md hover:bg-white text-slate-600 transition"
              title="Redo Action"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <span className="h-5 w-px bg-slate-200 mx-1"></span>

          {/* Inline family & size sizing */}
          <div className="flex items-center gap-1">
            <select
              onChange={(e) => applyStyleToSelection({ fontFamily: e.target.value })}
              className="p-1 border border-slate-200 rounded bg-slate-50 text-xs font-semibold cursor-pointer"
              defaultValue="Inter"
              title="Font Family"
            >
              <option value="Inter">Inter (Sans)</option>
              <option value="Space Grotesk">Space Grotesk</option>
              <option value="JetBrains Mono">JetBrains Mono</option>
              <option value="Arial">Arial</option>
              <option value="Georgia">Georgia</option>
            </select>

            <select
              onChange={(e) => applyStyleToSelection({ fontSize: parseInt(e.target.value, 10) })}
              className="p-1 border border-slate-200 rounded bg-slate-50 text-xs font-semibold cursor-pointer w-14"
              defaultValue="13"
              title="Font Size"
            >
              {[9, 10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32].map((sz) => (
                <option key={sz} value={sz}>
                  {sz}px
                </option>
              ))}
            </select>
          </div>

          <span className="h-5 w-px bg-slate-200 mx-1"></span>

          {/* Type Decorations */}
          <div className="flex items-center gap-0.5 bg-slate-100 rounded p-0.5">
            <button
              onClick={() => applyStyleToSelection({ bold: 'toggle' as any })}
              className={`p-1 px-2 rounded hover:bg-white transition text-slate-700`}
              title="Bold text"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => applyStyleToSelection({ italic: 'toggle' as any })}
              className={`p-1 px-2 rounded hover:bg-white transition text-slate-700`}
              title="Italic text"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => applyStyleToSelection({ underline: 'toggle' as any })}
              className={`p-1 px-2 rounded hover:bg-white transition text-slate-700`}
              title="Underline"
            >
              <Underline className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => applyStyleToSelection({ strikethrough: 'toggle' as any })}
              className={`p-1 px-2 rounded hover:bg-white transition text-slate-700`}
              title="Strikethrough"
            >
              <Strikethrough className="w-3.5 h-3.5" />
            </button>
          </div>

          <span className="h-5 w-px bg-slate-200 mx-1"></span>

          {/* Color pickers */}
          <div className="flex items-center gap-1 bg-slate-100 rounded p-1">
            <div className="flex items-center gap-1" title="Font Text Color">
              <span className="font-bold text-slate-600 block text-[10px] uppercase">A</span>
              <input
                type="color"
                onChange={(e) => applyStyleToSelection({ color: e.target.value })}
                className="w-4 h-4 border border-slate-300 rounded cursor-pointer p-0"
                defaultValue="#1e293b"
              />
            </div>
            <span className="h-3 w-px bg-slate-200 mx-0.5"></span>
            <div className="flex items-center gap-1" title="Cell Background Color">
              <span className="font-bold text-slate-600 block text-[10px] uppercase">Fill</span>
              <input
                type="color"
                onChange={(e) => applyStyleToSelection({ backgroundColor: e.target.value })}
                className="w-4 h-4 border border-slate-300 rounded cursor-pointer p-0"
                defaultValue="#ffffff"
              />
            </div>
          </div>
        </div>

        {/* Ribbon group 2: Alignment, Merge/Unmerge, and validations */}
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center gap-0.5 bg-slate-100 rounded p-0.5">
            <button
              onClick={() => applyStyleToSelection({ align: 'left' })}
              className="p-1 px-2 rounded hover:bg-white transition text-slate-700"
              title="Align Left"
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => applyStyleToSelection({ align: 'center' })}
              className="p-1 px-2 rounded hover:bg-white transition text-slate-700"
              title="Align Center"
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => applyStyleToSelection({ align: 'right' })}
              className="p-1 px-2 rounded hover:bg-white transition text-slate-700"
              title="Align Right"
            >
              <AlignRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <span className="h-5 w-px bg-slate-200 mx-1"></span>

          {/* Merge actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleMergeSelection}
              className="p-1 px-2 bg-slate-100 border border-slate-200 rounded hover:bg-slate-200 transition text-slate-700 font-semibold cursor-pointer"
              title="Merge Selected Cells Range"
            >
              Merge
            </button>
            <button
              onClick={handleUnmergeSelection}
              className="p-1 px-2 bg-slate-100 border border-slate-200 rounded hover:bg-slate-200 transition text-slate-600 cursor-pointer"
              title="Unmerge Selected Range"
            >
              Unmerge
            </button>
          </div>

          <span className="h-5 w-px bg-slate-200 mx-1"></span>

          {/* Clipboard utilities */}
          <div className="flex items-center gap-0.5 bg-slate-100 rounded p-0.5">
            <button
              onClick={handleCopy}
              className="p-1 px-2 rounded hover:bg-white transition text-slate-600"
              title="Copy Selected Cell (Styles & Data)"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleCut}
              className="p-1 px-2 rounded hover:bg-white transition text-slate-600"
              title="Cut Selection"
            >
              <Scissors className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handlePaste}
              className="p-1 px-2 rounded hover:bg-white transition text-slate-600"
              title="Paste Content"
            >
              <Clipboard className="w-3.5 h-3.5" />
            </button>
          </div>

          <span className="h-5 w-px bg-slate-200 mx-1"></span>

          {/* Data Validation Controls */}
          <button
            onClick={() => {
              if (selectedRange) {
                setValidationOptions('Pending, In Progress, Completed');
                setIsValidationModalOpen(true);
              } else {
                addToast('Select Cell', 'Choose cell range first to apply validations.', 'warning');
              }
            }}
            className="flex items-center gap-1 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 text-yellow-800 px-2 py-1 rounded transition text-[11px] font-semibold cursor-pointer"
            title="Form Controls (Checkbox / Dropdown validation)"
          >
            <CheckSquare className="w-3.5 h-3.5 text-yellow-600" />
            <span>Form Controls</span>
          </button>

          {/* Notes Annotation */}
          <button
            onClick={openCommentDialog}
            className="flex items-center gap-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 px-2.5 py-1 rounded transition text-[11px] font-semibold cursor-pointer"
            title="Link Comments or Note annotations to active cell block"
          >
            <Type className="w-3.5 h-3.5" />
            <span>Insert Note</span>
          </button>
        </div>
      </div>

      {/* ROW LAYER B: ADDITIONAL DESIGN ELEMENTS, SHAPES & SEARCH */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        
        {/* Draw shape widgets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Floating Widgets:</span>
          
          <button
            onClick={() => handleInsertShape('textbox')}
            className="flex items-center gap-1 bg-white border border-slate-200 hover:bg-slate-100 px-2 py-1 rounded transition cursor-pointer text-[11px]"
          >
            <FileEdit className="w-3 h-3 text-emerald-500" /> Text Box
          </button>

          <button
            onClick={() => handleInsertShape('rect')}
            className="flex items-center gap-1 bg-white border border-slate-200 hover:bg-slate-100 px-2 py-1 rounded transition cursor-pointer text-[11px]"
          >
            <Square className="w-3 h-3 text-blue-500" /> Rectangle
          </button>

          <button
            onClick={() => handleInsertShape('circle')}
            className="flex items-center gap-1 bg-white border border-slate-200 hover:bg-slate-100 px-2 py-1 rounded transition cursor-pointer text-[11px]"
          >
            <Circle className="w-3 h-3 text-indigo-500" /> Oval
          </button>

          <label className="flex items-center gap-1 bg-white border border-slate-200 hover:bg-slate-100 px-2 py-1 rounded transition cursor-pointer text-[11px]">
            <ImageIcon className="w-3 h-3 text-rose-500" />
            <span>Add Attachment</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleInsertImageAttach}
              className="hidden"
            />
          </label>
        </div>

        {/* Freezes and Borders quick actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleToggleFreezeTopRow}
            className={`p-1 px-2.5 rounded border transition font-medium cursor-pointer ${
              activeSheet?.freezeRows ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
            title="Lock Row 1 at top when scrolling"
          >
            Freeze Row 1
          </button>
          <button
            onClick={handleToggleFreezeLeftCol}
            className={`p-1 px-2.5 rounded border transition font-medium cursor-pointer ${
              activeSheet?.freezeCols ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
            title="Lock Column A at left when scrolling left-to-right"
          >
            Freeze Col A
          </button>

          <span className="h-5 w-px bg-slate-200 mx-1"></span>

          <button
            onClick={() => applyStyleToSelection({ borderAll: true })}
            className="p-1 px-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded transition cursor-pointer font-semibold"
            title="Apply standard visible borders to selected block"
          >
            All Borders
          </button>
          <button
            onClick={() =>
              applyStyleToSelection({
                borderAll: undefined,
                borderLeft: undefined,
                borderRight: undefined,
                borderTop: undefined,
                borderBottom: undefined,
              })
            }
            className="p-1 px-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-500 rounded transition cursor-pointer"
            title="Clear all border formatting"
          >
            No Borders
          </button>
        </div>

        {/* Search & Replace Floating Sub-bar */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setIsSearchActive(!isSearchActive)}
            className={`px-2.5 py-1 rounded border transition font-semibold cursor-pointer flex items-center gap-1 ${
              isSearchActive ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search & Replace</span>
          </button>
        </div>
      </div>

      {/* SECTION 2B: SEARCH ACTIVE COLLAPSIBLE WORKSPACE */}
      {isSearchActive && (
        <div className="bg-orange-50 border-b border-orange-100 p-2.5 px-4 flex flex-wrap items-center justify-between gap-3 text-xs animate-fadeIn">
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <div className="flex items-center gap-1 bg-white border border-slate-300 rounded px-2 py-1">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Find text..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-xs w-36 text-slate-800"
              />
            </div>
            <div className="flex items-center gap-1 bg-white border border-slate-300 rounded px-2 py-1">
              <ArrowRight className="w-3.5 h-3.5 text-emerald-500" />
              <input
                type="text"
                placeholder="Replace with..."
                value={replaceQuery}
                onChange={(e) => setReplaceQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-xs w-36 text-slate-800"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSearchReplace('single')}
              className="bg-orange-600 hover:bg-orange-700 text-white font-bold p-1 py-1.5 px-3 rounded cursor-pointer transition text-[11px]"
            >
              Replace Case
            </button>
            <button
              onClick={() => handleSearchReplace('all')}
              className="bg-orange-800 hover:bg-orange-900 text-white font-bold p-1 py-1.5 px-3 rounded cursor-pointer transition text-[11px]"
            >
              Replace All Rows
            </button>
            <button
              onClick={() => {
                setSearchQuery('');
                setReplaceQuery('');
                setIsSearchActive(false);
              }}
              className="p-1 hover:text-red-500 text-slate-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* SECTION 3: FORMULA BAR AND SELECTED COORDINATE INDICATOR */}
      <div className="bg-slate-150 border-b border-slate-200 px-4 py-1.5 flex items-center gap-2 text-xs">
        <div className="bg-white border border-slate-300 font-mono text-center text-slate-700 px-2.5 py-1 w-14 rounded shadow-2xs font-extrabold select-none">
          {activeCellRef || '--'}
        </div>
        <div className="text-slate-400 font-bold select-none text-[13px] px-1">fx</div>
        <div className="flex-1 bg-white border border-slate-300 rounded-md shadow-2xs overflow-hidden flex items-center pr-2">
          <input
            type="text"
            value={editInputVal}
            onChange={(e) => {
              setEditInputVal(e.target.value);
              if (selectedRange) {
                handleCellChange(selectedRange.sr, selectedRange.sc, { value: e.target.value });
              }
            }}
            disabled={!selectedRange}
            placeholder={selectedRange ? "Enter formula values or text" : "Click any cell to edit details"}
            className="w-full bg-transparent border-none outline-none px-3 py-1 text-slate-800 font-medium text-xs placeholder:text-slate-400"
          />
          {selectedRange && (
            <button
              onClick={() => {
                setEditingCell(null);
                setSelectedRange(null);
              }}
              className="text-slate-400 hover:text-slate-600"
              title="Clear focus Selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Row & Column quick operations */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={handleInsertRow}
            className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 p-1 px-2.5 rounded text-[11px] font-medium cursor-pointer"
            title="Insert blank row in front of active index"
          >
            + Insert Row
          </button>
          <button
            onClick={handleDeleteRow}
            className="bg-red-50 border border-red-200 hover:bg-red-100 text-red-900 p-1 px-2.5 rounded text-[11px] font-medium cursor-pointer"
            title="Delete currently selected Rows"
          >
            - Delete Row
          </button>
          <button
            onClick={handleInsertCol}
            className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 p-1 px-2.5 rounded text-[11px] font-medium cursor-pointer"
            title="Insert Column left of active cursor"
          >
            + Col
          </button>
          <button
            onClick={handleDeleteCol}
            className="bg-red-50 border border-red-200 hover:bg-red-100 text-red-900 p-1 px-2.5 rounded text-[11px] font-medium cursor-pointer"
            title="Delete Selected Column"
          >
            - Col
          </button>
        </div>
      </div>

      {/* SECTION 4: MAIN EXCEL COMPUTATION GRID CANVAS */}
      <div className="flex-1 overflow-auto relative bg-slate-100 scrollbar-thin">
        {activeSheet && (
          <table className="border-collapse table-fixed select-none bg-white font-sans text-xs">
            
            {/* Headers line */}
            <thead className="sticky top-0 z-25 bg-slate-100 text-slate-600 uppercase font-bold text-center">
              <tr className="h-6">
                <th className="sticky left-0 z-30 bg-slate-250 border-r border-b border-slate-300 w-11 flex-shrink-0 text-[10px] grid-header-corner"></th>
                {Array.from({ length: activeSheet.colsCount }).map((_, colIdx) => {
                  const label = colIndexToLabel(colIdx);
                  const isColFrozen = colIdx < activeSheet.freezeCols;
                  
                  return (
                    <th
                      key={colIdx}
                      style={{
                        width: activeSheet.columnWidths[colIdx] || 116,
                        left: isColFrozen ? colIdx * 116 + 44 : undefined,
                      }}
                      className={`border-r border-b border-slate-300 relative text-[10px] font-extrabold tracking-wider bg-slate-100 text-slate-500 hover:bg-slate-200 ${
                        isColFrozen ? 'sticky z-20 shadow-[2px_0_4px_rgba(0,0,0,0.05)]' : ''
                      }`}
                    >
                      <span className="block py-1 cursor-pointer" onClick={() => setSelectedRange({ sr: 0, sc: colIdx, er: activeSheet.rowsCount - 1, ec: colIdx })}>
                        {label}
                      </span>
                      {/* Sorting options trigger menu icon */}
                      <button
                        onClick={() => setActiveFilterCol(activeFilterCol === colIdx ? null : colIdx)}
                        className="absolute right-1 top-1 text-slate-400 hover:text-slate-800 p-0.5"
                        title="Sort operations"
                      >
                        <ChevronDown className="w-2.5 h-2.5" />
                      </button>

                      {activeFilterCol === colIdx && (
                        <div className="absolute right-0 top-6 bg-white border border-slate-200 shadow-lg rounded-md p-1.5 w-32 text-left text-[11px] text-slate-700 z-50 normal-case font-normal select-none">
                          <button
                            onClick={() => {
                              handleSortAToZ(colIdx);
                              setActiveFilterCol(null);
                            }}
                            className="w-full text-left p-1.5 hover:bg-slate-100 rounded text-slate-700 block cursor-pointer"
                          >
                            Sort A to Z (Asc)
                          </button>
                          <button
                            onClick={() => {
                              handleSortZToA(colIdx);
                              setActiveFilterCol(null);
                            }}
                            className="w-full text-left p-1.5 hover:bg-slate-100 rounded text-slate-700 block cursor-pointer"
                          >
                            Sort Z to A (Desc)
                          </button>
                          <div className="border-t border-slate-100 my-1"></div>
                          <button
                            onClick={() => setActiveFilterCol(null)}
                            className="w-full text-center text-red-500 hover:bg-red-50 p-1 rounded"
                          >
                            Close
                          </button>
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Table Cell Grid Content */}
            <tbody>
              {Array.from({ length: activeSheet.rowsCount }).map((_, rIdx) => {
                const isRowFrozen = rIdx < activeSheet.freezeRows;

                return (
                  <tr
                    key={rIdx}
                    style={{
                      height: activeSheet.rowHeights[rIdx] || 25,
                    }}
                    className={`h-[25px] border-b border-slate-200 ${
                      isRowFrozen ? 'sticky z-20 shadow-[0_2px_4px_rgba(0,0,0,0.05)] bg-slate-50' : 'hover:bg-slate-50/50'
                    }`}
                  >
                    {/* Index header cell left */}
                    <td
                      onClick={() => setSelectedRange({ sr: rIdx, sc: 0, er: rIdx, ec: activeSheet.colsCount - 1 })}
                      className="sticky left-0 z-20 bg-slate-100 border-r border-slate-300 border-b text-center text-[10px] text-slate-400 font-extrabold cursor-pointer hover:bg-slate-250 select-none"
                    >
                      {rIdx + 1}
                    </td>

                    {/* Data Cells */}
                    {Array.from({ length: activeSheet.colsCount }).map((__, cIdx) => {
                      const cellKey = `${rIdx},${cIdx}`;

                      // Check layout merges state
                      if (mergeCellLookup.hidden[cellKey]) return null;
                      const span = mergeCellLookup.spans[cellKey];
                      const rspan = span ? span.rspan : undefined;
                      const cspan = span ? span.cspan : undefined;

                      const cell = activeSheet.cells[cellKey] || { value: '' };

                      // Active ranges selections evaluation
                      const isSelected =
                        selectedRange &&
                        rIdx >= selectedRange.sr &&
                        rIdx <= selectedRange.er &&
                        cIdx >= selectedRange.sc &&
                        cIdx <= selectedRange.ec;

                      // Highlight outline borders
                      const isSelectionTopLeft = selectedRange && rIdx === selectedRange.sr && cIdx === selectedRange.sc;
                      const isSelectionBottomRight = selectedRange && rIdx === selectedRange.er && cIdx === selectedRange.ec;

                      const isEditing = editingCell && editingCell.r === rIdx && editingCell.c === cIdx;

                      // Custom styling configurations
                      const cellStyle: React.CSSProperties = {
                        fontFamily: cell.fontFamily || 'inherit',
                        fontSize: cell.fontSize ? `${cell.fontSize}px` : undefined,
                        color: cell.color || undefined,
                        backgroundColor: isSelected ? '#eff6ff' : (cell.backgroundColor || undefined),
                        fontWeight: cell.bold ? 'bold' : 'normal',
                        fontStyle: cell.italic ? 'italic' : 'normal',
                        textDecoration: [
                          cell.underline ? 'underline' : '',
                          cell.strikethrough ? 'line-through' : '',
                        ]
                          .filter(Boolean)
                          .join(' '),
                        textAlign: cell.align || 'left',
                        whiteSpace: cell.wrapText ? 'normal' : 'nowrap',
                        // borders formatting
                        borderLeft: cell.borderLeft || cell.borderAll ? '1px solid #94a3b8' : undefined,
                        borderRight: cell.borderRight || cell.borderAll ? '1px solid #94a3b8' : undefined,
                        borderTop: cell.borderTop || cell.borderAll ? '1px solid #94a3b8' : undefined,
                        borderBottom: cell.borderBottom || cell.borderAll ? '1px solid #94a3b8' : undefined,
                      };

                      return (
                        <td
                          key={cIdx}
                          rowSpan={rspan}
                          colSpan={cspan}
                          onClick={(e) => {
                            if (e.shiftKey && selectedRange) {
                              setSelectedRange({
                                ...selectedRange,
                                er: rIdx,
                                ec: cIdx,
                              });
                            } else {
                              setSelectedRange({ sr: rIdx, sc: cIdx, er: rIdx, ec: cIdx });
                            }
                          }}
                          onDoubleClick={() => {
                            if (!checkPermission()) return;
                            setEditingCell({ r: rIdx, c: cIdx });
                            setEditInputVal(String(cell.value || ''));
                          }}
                          onMouseDown={(e) => {
                            if (e.button !== 0) return; // only left click
                            setIsDraggingToSelect(true);
                            setDragStartCell({ r: rIdx, c: cIdx });
                            setSelectedRange({ sr: rIdx, sc: cIdx, er: rIdx, ec: cIdx });
                          }}
                          onMouseEnter={() => handleCellMouseEnter(rIdx, cIdx)}
                          style={cellStyle}
                          className={`border-r border-b border-slate-300 relative px-1.5 leading-snug truncate group select-none ${
                            isSelected ? 'bg-blue-50/70 border-blue-300/60 ring-1 ring-blue-500/10' : ''
                          }`}
                        >
                          {/* Inner cell interactive items */}
                          {isEditing ? (
                            <input
                              type="text"
                              value={editInputVal}
                              onChange={(e) => setEditInputVal(e.target.value)}
                              onBlur={() => {
                                handleCellChange(rIdx, cIdx, { value: editInputVal });
                                setEditingCell(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleCellChange(rIdx, cIdx, { value: editInputVal });
                                  setEditingCell(null);
                                  // Move select cursor down
                                  if (rIdx < activeSheet.rowsCount - 1) {
                                    setSelectedRange({ sr: rIdx + 1, sc: cIdx, er: rIdx + 1, ec: cIdx });
                                  }
                                } else if (e.key === 'Escape') {
                                  setEditingCell(null);
                                }
                              }}
                              autoFocus
                              className="absolute inset-0 w-full h-full bg-white outline-indigo-600 border border-indigo-600 px-1 text-slate-800 z-40 text-xs font-semibold"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-between min-h-[18px]">
                              
                              {/* Validation checkbox view */}
                              {cell.checkbox ? (
                                <input
                                  type="checkbox"
                                  checked={cell.value === 'true' || cell.value === '1' || cell.value === 'Yes' || cell.value === 'Completed'}
                                  onChange={(e) => {
                                    if (!checkPermission()) return;
                                    handleCellChange(rIdx, cIdx, { value: e.target.checked ? 'Completed' : 'Pending' });
                                  }}
                                  className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer mx-auto block"
                                />
                              ) : cell.dropdown && cell.dropdown.length > 0 ? (
                                <select
                                  value={cell.value}
                                  onChange={(e) => handleDropdownCellValChange(rIdx, cIdx, e.target.value)}
                                  className="w-full border-none bg-transparent outline-none py-0 text-xs text-slate-700 font-semibold cursor-pointer"
                                >
                                  <option value="">-- Choose --</option>
                                  {cell.dropdown.map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span className="truncate block pr-1 leading-normal w-full select-text">{cell.value}</span>
                              )}

                              {/* Comment indicator (red triangle in top right header corner) */}
                              {cell.comment && (
                                <div
                                  className="absolute top-0 right-0 w-0 h-0 border-t-[6px] border-t-red-600 border-l-[6px] border-l-transparent"
                                  title="Hover to read comment/notes"
                                >
                                  {/* Red comment indicator popover hover */}
                                  <div className="pointer-events-none absolute hidden group-hover:block bg-slate-900 text-white p-2 rounded shadow-lg text-[10px] w-48 font-normal z-50 right-2 top-2 select-all prose whitespace-pre-wrap">
                                    <div className="text-amber-300 font-bold block bg-slate-800 p-0.5 rounded px-1 text-[8px] uppercase tracking-wider mb-1 w-fit">Annotation:</div>
                                    {cell.comment}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Bounding box drag-to-fill mini anchor button */}
                          {isSelectionBottomRight && !isReadOnly && (
                            <div
                              onMouseDown={(e) => handleDragFillStart(e, rIdx, cIdx)}
                              className="absolute bottom-[-2px] right-[-2px] w-[5.5px] h-[5.5px] bg-blue-600 border border-white cursor-crosshair z-30 shadow-xs hover:scale-125 transition"
                              title="Smart Drag Fill cells"
                            ></div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* OVERLAID TRANSPARENT LAYOUT WIDGETS: SHAPES & TEXTBOXES */}
        {activeSheet?.shapes.map((shape) => {
          const isSelected = selectedShapeId === shape.id;
          return (
            <div
              key={shape.id}
              style={{
                position: 'absolute',
                left: shape.x,
                top: shape.y,
                width: shape.width,
                height: shape.height,
                backgroundColor: shape.type === 'textbox' ? shape.color : `${shape.color}25`,
                border: isSelected ? '2px shadow border-indigo-600' : `2.5px solid ${shape.color}`,
                borderRadius: shape.type === 'circle' ? '50%' : '4px',
              }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedShapeId(shape.id);
                setSelectedImageId(null);
              }}
              draggable={!isReadOnly}
              onDragEnd={(e) => {
                if (isReadOnly) return;
                const container = document.getElementById('excel_canvas_root');
                if (!container) return;
                const rect = container.getBoundingClientRect();
                const x = e.clientX - rect.left - 40;
                const y = e.clientY - rect.top - 80;
                handleMoveOrResizeShape(shape.id, { x: Math.max(20, x), y: Math.max(20, y) });
              }}
              className="flex items-center justify-center p-2.5 z-40 shadow-xs select-none transition-all group cursor-move"
            >
              {shape.type === 'textbox' ? (
                <textarea
                  value={shape.label}
                  disabled={isReadOnly}
                  onChange={(e) => handleMoveOrResizeShape(shape.id, { label: e.target.value })}
                  className="w-full h-full bg-transparent border-none outline-none resize-none overflow-hidden font-medium text-[11px] text-slate-800 placeholder:text-slate-400 font-sans leading-normal text-center"
                />
              ) : (
                <span className="text-[10px] font-bold text-slate-700 tracking-tight text-center">{shape.label}</span>
              )}

              {/* Adjust shape properties floating banner on selection */}
              {isSelected && !isReadOnly && (
                <div className="absolute top-[-26px] bg-white border border-slate-300 shadow-lg p-1 px-1.5 rounded-md flex items-center gap-1.5 text-[9px] z-50 whitespace-nowrap">
                  <input
                    type="color"
                    onChange={(e) => handleMoveOrResizeShape(shape.id, { color: e.target.value })}
                    className="w-3.5 h-3.5 border-none cursor-pointer p-0"
                    defaultValue={shape.color}
                  />
                  <input
                    type="text"
                    onChange={(e) => handleMoveOrResizeShape(shape.id, { label: e.target.value })}
                    value={shape.label}
                    className="p-0.5 border border-slate-300 rounded text-[9px] w-20"
                    placeholder="Shape text..."
                  />
                  <button
                    onClick={() => handleDeleteShape(shape.id)}
                    className="text-red-500 hover:text-red-700 hover:underline p-0.5 font-bold"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* OVERLAID ATTACHMENT MEDIA IMAGES LAYOUT */}
        {activeSheet?.images.map((img) => {
          const isSelected = selectedImageId === img.id;
          return (
            <div
              key={img.id}
              style={{
                position: 'absolute',
                left: img.x,
                top: img.y,
                width: img.width,
                height: img.height,
                border: isSelected ? '2.5px solid #2563eb' : '1px solid #cbd5e1',
              }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedImageId(img.id);
                setSelectedShapeId(null);
              }}
              draggable={!isReadOnly}
              onDragEnd={(e) => {
                if (isReadOnly) return;
                const container = document.getElementById('excel_canvas_root');
                if (!container) return;
                const rect = container.getBoundingClientRect();
                const x = e.clientX - rect.left - 40;
                const y = e.clientY - rect.top - 80;
                handleMoveOrResizeImage(img.id, { x: Math.max(20, x), y: Math.max(20, y) });
              }}
              className="absolute bg-white overflow-hidden z-40 shadow-md group cursor-move flex items-center justify-center rounded"
            >
              <img
                src={img.src}
                alt="sheet attachment"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover select-none pointer-events-none"
              />

              {/* Operations bubble for attached images */}
              {isSelected && !isReadOnly && (
                <div className="absolute bottom-2 right-2 bg-slate-900/90 text-white hover:bg-red-600 px-2 py-1 rounded text-[10px] cursor-pointer transition flex items-center gap-1 font-semibold" onClick={() => handleDeleteImage(img.id)}>
                  <Trash2 className="w-3 h-3" />
                  <span>Remove Image</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* SECTION 5: FOOTER WORKBOOK SHEETS WORKWORK TABS AND STATS BAR */}
      <div className="bg-white border-t border-slate-200 px-4 py-2 flex items-center justify-between gap-4 text-xs select-none">
        
        {/* Tab worksheets controls */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
          {activeFile?.sheets.map((sheet, idx) => {
            const isTabActive = idx === activeSheetIndex;
            return (
              <div
                key={idx}
                onClick={() => {
                  if (activeFile) {
                    setFiles((prev) =>
                      prev.map((f) => (f.id === activeFile.id ? { ...f, activeSheetIndex: idx } : f))
                    );
                    setSelectedRange(null);
                  }
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1 rounded-sm cursor-pointer transition border border-b-0 ${
                  isTabActive
                    ? 'bg-white border-slate-300 border-t-2 border-t-emerald-500 font-extrabold text-emerald-800 shadow-2xs translate-y-[2.5px] z-10'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200 hover:text-slate-800'
                }`}
              >
                <span>{sheet.name}</span>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRenameSheetTab(idx);
                  }}
                  className="text-slate-400 hover:text-slate-900 block p-0.5 text-[9px]"
                  title="Rename tab label"
                >
                  ✎
                </span>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSheetTab(idx);
                  }}
                  className="text-slate-400 hover:text-red-600 block p-0.5 text-[9px]"
                  title="Delete Worksheet"
                >
                  ✕
                </span>
              </div>
            );
          })}

          <button
            onClick={handleAddSheetTab}
            className="p-1 px-2.5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold flex items-center gap-1 text-[11px] cursor-pointer"
            title="Create fresh vacant Worksheet tab"
          >
            <Plus className="w-3.5 h-3.5 text-slate-500" />
            <span>New Sheet</span>
          </button>
        </div>

        {/* Statistical readout bar: sum average details */}
        {statusBarStats && (
          <div className="flex items-center gap-4 text-[11px] text-slate-500 font-mono bg-slate-50 px-3 py-1 rounded-md border border-slate-200 selection:bg-transparent">
            {statusBarStats.sum !== undefined && (
              <>
                <span>
                  SUM: <strong className="text-slate-700">{statusBarStats.sum}</strong>
                </span>
                <span className="w-px h-3 bg-slate-300"></span>
                <span>
                  AVERAGE: <strong className="text-slate-700">{statusBarStats.avg}</strong>
                </span>
                <span className="w-px h-3 bg-slate-300"></span>
              </>
            )}
            <span>
              COUNT: <strong className="text-slate-700">{statusBarStats.count}</strong>
            </span>
          </div>
        )}
      </div>

      {/* MODAL 1: FORM CONTROLS DATA VALIDATION */}
      {isValidationModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 animate-fadeIn backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden w-full max-w-sm">
            <div className="bg-slate-950 text-white px-4 py-3 flex items-center justify-between">
              <h4 className="font-bold text-xs uppercase tracking-wide">Data Validation Wizard</h4>
              <button onClick={() => setIsValidationModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleApplyValidation} className="p-4 space-y-3 text-xs text-slate-700">
              <p className="text-[11px] text-slate-500">
                Transform active selected grid coordinates to standardized input form widgets.
              </p>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Control Type</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer font-semibold">
                    <input
                      type="radio"
                      name="validation_opt"
                      checked={validationType === 'checkbox'}
                      onChange={() => setValidationType('checkbox')}
                    />
                    <span>Checkbox (Yes/No)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer font-semibold">
                    <input
                      type="radio"
                      name="validation_opt"
                      checked={validationType === 'dropdown'}
                      onChange={() => setValidationType('dropdown')}
                    />
                    <span>Dropdown List Options</span>
                  </label>
                </div>
              </div>

              {validationType === 'dropdown' && (
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Dropdown choices (Comma-separated)</label>
                  <input
                    type="text"
                    value={validationOptions}
                    onChange={(e) => setValidationOptions(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 outline-indigo-600"
                    placeholder="Pending, In Progress, Completed"
                  />
                  <span className="text-[9px] text-slate-400 block mt-0.5">
                    Separate items with commas to formulate choices list.
                  </span>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => setIsValidationModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4.5 py-1.5 rounded cursor-pointer"
                >
                  Apply Form Controls
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: INTERACTIVE NOTES / ANNOTATION COMMENT */}
      {isCommentModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 animate-fadeIn backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden w-full max-w-sm">
            <div className="bg-slate-950 text-white px-4 py-3 flex items-center justify-between">
              <h4 className="font-bold text-xs uppercase tracking-wide">Attach Note Annotation</h4>
              <button onClick={() => setIsCommentModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleApplyComment} className="p-4 space-y-3.5 text-xs text-slate-700">
              <p className="text-[11px] text-slate-500">
                A subtle red triangle will appear in the cell's top corner. Hovering reveals the note.
              </p>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Notes text content</label>
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="w-full h-24 bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 outline-indigo-600 font-medium"
                  placeholder="Insert notes, specs, or task remarks here..."
                ></textarea>
              </div>

              <div className="pt-1 flex justify-end gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => setIsCommentModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded font-bold cursor-pointer"
                >
                  Save Annotation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOM PROMPT INPUT DIALOG */}
      {promptModal && promptModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 animate-fadeIn backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden w-full max-w-sm">
            <div className="bg-slate-950 text-white px-4 py-3 flex items-center justify-between">
              <h4 className="font-bold text-xs uppercase tracking-wide">{promptModal.title}</h4>
              <button onClick={() => setPromptModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3 text-xs text-slate-700">
              <p className="font-medium text-slate-600">{promptModal.message}</p>
              <input
                type="text"
                id="promptInput"
                defaultValue={promptModal.defaultValue}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = (e.currentTarget as HTMLInputElement).value;
                    promptModal.onOk(val);
                    setPromptModal(null);
                  }
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 outline-indigo-600 font-semibold"
              />
              <div className="pt-2 flex justify-end gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => setPromptModal(null)}
                  className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const inputEl = document.getElementById('promptInput') as HTMLInputElement;
                    if (inputEl) {
                      promptModal.onOk(inputEl.value);
                    }
                    setPromptModal(null);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-1.5 rounded cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRM DELETE DIALOG */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 animate-fadeIn backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden w-full max-w-sm">
            <div className="bg-slate-950 text-white px-4 py-3 flex items-center justify-between">
              <h4 className="font-bold text-xs uppercase tracking-wide">{confirmModal.title}</h4>
              <button onClick={() => setConfirmModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3 text-xs text-slate-700">
              <div className="flex items-start gap-2 text-amber-600 bg-amber-50 p-2.5 rounded border border-amber-200">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="font-semibold leading-normal">{confirmModal.message}</p>
              </div>
              <div className="pt-2 flex justify-end gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => setConfirmModal(null)}
                  className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    confirmModal.onConfirm();
                    setConfirmModal(null);
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-1.5 rounded cursor-pointer"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
