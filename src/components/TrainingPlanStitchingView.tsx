/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Folder, 
  FolderOpen, 
  Plus, 
  Trash2, 
  Save, 
  CheckCircle2, 
  RotateCcw, 
  Download, 
  Printer, 
  Edit3, 
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Layers,
  Sparkles,
  FileSpreadsheet,
  X,
  RefreshCw,
  Link2,
  LogIn,
  LogOut,
  Settings2,
  ShieldCheck,
  ShieldAlert,
  Info,
  Loader2
} from 'lucide-react';
import { User } from 'firebase/auth';
import { StitchingRecord, UserRole, StitchingAuditRow, StitchingFolder } from '../types';
import { 
  getStitchingFolders, 
  saveStitchingFolder, 
  createStitchingFolder, 
  deleteStitchingFolder,
  setActiveStitchingFolder,
  saveSyncedFolderToBackend,
  fetchLiveGoogleSheetTab
} from '../services/stitchingSheetService';
import { 
  signInWithGoogle, 
  signOutGoogle, 
  initGoogleAuth, 
  getGoogleAccessToken,
  getCurrentGoogleUser
} from '../services/googleSheetsAuth';
import { 
  getSpreadsheetDetails, 
  readSheetValues, 
  updateSheetRow, 
  appendSheetRow, 
  syncFolderToGoogleSheet, 
  createNewTrainingPlanSpreadsheet, 
  parseSheetMatrixToTrainingPlan, 
  extractSpreadsheetId, 
  generateDefault22Rows 
} from '../services/googleSheetsApi';
import StitchingCanvaAuditView from './stitching/StitchingCanvaAuditView';

interface TrainingPlanStitchingViewProps {
  records?: StitchingRecord[];
  setRecords?: React.Dispatch<React.SetStateAction<StitchingRecord[]>>;
  role?: UserRole;
  addToast?: (title: string, message: string, type: 'success' | 'warning' | 'info') => void;
  registerBackHandler?: (handler: () => boolean) => () => void;
}

const INITIAL_REQUIRED_FOLDERS: StitchingFolder[] = [
  {
    id: 'stitching-a',
    name: 'Stitching A',
    code: 'STA',
    auditDate: 'Audit Date: September 24, 2026',
    dateColumnHeader: '(09/21~26/26)',
    rows: generateDefault22Rows()
  },
  {
    id: 'stitching-b',
    name: 'Stitching B',
    code: 'STB',
    auditDate: 'Audit Date: September 24, 2026',
    dateColumnHeader: '(09/21~26/26)',
    rows: generateDefault22Rows()
  },
  {
    id: 'stitching-d',
    name: 'Stitching D',
    code: 'STD',
    auditDate: 'Audit Date: September 24, 2026',
    dateColumnHeader: '(09/21~26/26)',
    rows: generateDefault22Rows()
  },
  {
    id: 'stitching-f',
    name: 'Stitching F',
    code: 'STF',
    auditDate: 'Audit Date: September 24, 2026',
    dateColumnHeader: '(09/21~26/26)',
    rows: generateDefault22Rows()
  }
];

export default function TrainingPlanStitchingView({
  setRecords,
  role,
  addToast,
  registerBackHandler
}: TrainingPlanStitchingViewProps) {
  // Folders State
  const [folders, setFolders] = useState<StitchingFolder[]>(INITIAL_REQUIRED_FOLDERS);
  const [activeFolderId, setActiveFolderId] = useState<string>('stitching-a');
  const [viewMode, setViewMode] = useState<'table' | 'grid' | 'canva'>('table');

  // New folder modal state
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Editing date header
  const [isEditingHeader, setIsEditingHeader] = useState<boolean>(false);

  // Save & Sync state
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Google OAuth & Google Sheets API State
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState<boolean>(false);
  
  // Google Spreadsheet Connection Configuration
  const [spreadsheetId, setSpreadsheetId] = useState<string>(() => {
    return localStorage.getItem('datian_training_sheet_id') || '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';
  });
  const [spreadsheetTitle, setSpreadsheetTitle] = useState<string>('Training Plan - Stitching');
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);
  const [tempSheetInput, setTempSheetInput] = useState<string>(spreadsheetId);
  const [isConnectingSheet, setIsConnectingSheet] = useState<boolean>(false);
  const [isSyncingSheet, setIsSyncingSheet] = useState<boolean>(false);
  const [isPushingSheet, setIsPushingSheet] = useState<boolean>(false);
  const [isCreatingNewSheet, setIsCreatingNewSheet] = useState<boolean>(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(true);
  const [lastGoogleSyncTime, setLastGoogleSyncTime] = useState<string | null>(null);
  const [firstSyncCompleted, setFirstSyncCompleted] = useState<boolean>(() => {
    return sessionStorage.getItem('datian_tp_first_sync_done') === 'true';
  });
  const [syncNotificationBanner, setSyncNotificationBanner] = useState<{
    type: 'success' | 'warning' | 'error' | 'info';
    title: string;
    message: string;
    details?: string[];
  } | null>(null);
  const [showConfigDetails, setShowConfigDetails] = useState<boolean>(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Debounce ref
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef<boolean>(true);
  const autoSyncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Clear parent stitchingRecords so no legacy records populate other screens
  useEffect(() => {
    if (setRecords) {
      setRecords([]);
    }
  }, [setRecords]);

  // Back handler integration
  useEffect(() => {
    if (!registerBackHandler) return;
    const unregister = registerBackHandler(() => {
      if (confirmDialog.isOpen) {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        return true;
      }
      if (isConfigModalOpen) {
        setIsConfigModalOpen(false);
        return true;
      }
      if (isNewFolderModalOpen) {
        setIsNewFolderModalOpen(false);
        return true;
      }
      if (viewMode !== 'table') {
        setViewMode('table');
        return true;
      }
      return false;
    });
    return unregister;
  }, [registerBackHandler, confirmDialog.isOpen, isConfigModalOpen, isNewFolderModalOpen, viewMode]);

  // Initialize Google Auth state listener
  useEffect(() => {
    const unsubscribe = initGoogleAuth(
      (user, token) => {
        setGoogleUser(user);
        if (token) setGoogleToken(token);
      },
      () => {
        setGoogleUser(null);
        setGoogleToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Load persistent folders on mount
  useEffect(() => {
    let isMounted = true;
    async function loadFolders() {
      try {
        setIsLoading(true);
        const res = await getStitchingFolders();
        if (isMounted && res && Array.isArray(res.folders) && res.folders.length > 0) {
          // Merge with required folders: Stitching A, B, D, F
          const loadedFolders = [...res.folders];
          for (const req of INITIAL_REQUIRED_FOLDERS) {
            const matchIndex = loadedFolders.findIndex(f => f.id === req.id || f.name.toLowerCase() === req.name.toLowerCase());
            if (matchIndex === -1) {
              loadedFolders.push(req);
            } else {
              // Ensure A1 to A22 if folder had default empty rows
              if (!loadedFolders[matchIndex].rows || loadedFolders[matchIndex].rows.length <= 3) {
                loadedFolders[matchIndex].rows = generateDefault22Rows();
              }
              if (!loadedFolders[matchIndex].auditDate) {
                loadedFolders[matchIndex].auditDate = 'Audit Date: September 24, 2026';
              }
              if (!loadedFolders[matchIndex].dateColumnHeader || loadedFolders[matchIndex].dateColumnHeader === '(Date)') {
                loadedFolders[matchIndex].dateColumnHeader = '(09/21~26/26)';
              }
            }
          }
          setFolders(loadedFolders);
          if (res.activeFolderId && loadedFolders.some(f => f.id === res.activeFolderId)) {
            setActiveFolderId(res.activeFolderId);
          } else {
            setActiveFolderId(loadedFolders[0]?.id || 'stitching-a');
          }
          setSaveStatus('saved');
        }
      } catch (err) {
        console.error('Failed to load stitching folders:', err);
        setSaveStatus('error');
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setTimeout(() => {
            isInitialLoadRef.current = false;
          }, 200);
        }
      }
    }

    loadFolders();

    // Listen for custom folder switch event from Sidebar or header
    function handleFolderSwitch(e: Event) {
      const customEvent = e as CustomEvent<{ folderId: string }>;
      if (customEvent.detail && customEvent.detail.folderId) {
        setActiveFolderId(customEvent.detail.folderId);
        setViewMode('table');
      }
    }
    window.addEventListener('switch-stitching-folder', handleFolderSwitch);

    // Listen for WebSocket entity updates for multi-device sync
    function handleWsMessage(event: MessageEvent) {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'ENTITY_UPDATED' && payload.entity === 'stitchingFolders' && payload.data) {
          if (Array.isArray(payload.data.folders)) {
            setFolders(payload.data.folders);
            if (payload.data.activeFolderId) {
              setActiveFolderId(payload.data.activeFolderId);
            }
            setSaveStatus('saved');
          }
        }
      } catch {}
    }

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws`;
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(wsUrl);
      ws.addEventListener('message', handleWsMessage);
    } catch {}

    return () => {
      isMounted = false;
      window.removeEventListener('switch-stitching-folder', handleFolderSwitch);
      if (ws) {
        try {
          ws.close();
        } catch {}
      }
    };
  }, []);

  // Current active folder
  const currentFolder = folders.find(f => f.id === activeFolderId) || folders[0] || INITIAL_REQUIRED_FOLDERS[0];

  // Trigger Save to backend database for a folder
  const triggerSaveFolder = useCallback(async (
    folderId: string,
    updatedData: Partial<StitchingFolder>,
    isExplicit: boolean = false
  ) => {
    try {
      setSaveStatus('saving');
      const res = await saveStitchingFolder(folderId, {
        ...updatedData,
        updatedBy: role || 'Internal Auditor'
      });
      if (res && res.folder) {
        setFolders(prev => prev.map(f => f.id === folderId ? { ...f, ...res.folder } : f));
        setSaveStatus('saved');
        setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        if (isExplicit && addToast) {
          addToast('Saved to Database', `Folder ${res.folder.name} data permanently saved.`, 'success');
        }
      }
    } catch (err) {
      console.error('Failed to save stitching folder:', err);
      setSaveStatus('error');
      if (isExplicit && addToast) {
        addToast('Save Error', 'Failed to save changes to the database. Please try again.', 'warning');
      }
    }
  }, [role, addToast]);

  // Debounced auto-save for current folder changes
  const scheduleFolderAutoSave = useCallback((
    folderId: string,
    auditDate: string,
    dateColumnHeader: string,
    rows: StitchingAuditRow[]
  ) => {
    if (isInitialLoadRef.current) return;
    setSaveStatus('unsaved');
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      triggerSaveFolder(folderId, { auditDate, dateColumnHeader, rows }, false);
    }, 600);
  }, [triggerSaveFolder]);

  // --------------------------------------------------------------------------
  // GOOGLE SHEETS API BIDIRECTIONAL SYNCHRONIZATION
  // --------------------------------------------------------------------------

  // Sign In With Google Handler
  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleSigningIn(true);
      const res = await signInWithGoogle();
      setGoogleUser(res.user);
      setGoogleToken(res.accessToken);
      if (addToast) {
        addToast('Google Connected', `Signed in as ${res.user.displayName || res.user.email}. Google Sheets API is active.`, 'success');
      }
    } catch (err: any) {
      console.error('Google Sign-in failed:', err);
      if (addToast) {
        addToast('Google Sign-In Failed', err.message || 'Could not authenticate with Google.', 'warning');
      }
    } finally {
      setIsGoogleSigningIn(false);
    }
  };

  // Sign Out With Google Handler
  const handleGoogleSignOut = async () => {
    try {
      await signOutGoogle();
      setGoogleUser(null);
      setGoogleToken(null);
      if (addToast) {
        addToast('Signed Out', 'Disconnected from Google Sheets.', 'info');
      }
    } catch (err: any) {
      console.error('Sign out error:', err);
    }
  };

  // --------------------------------------------------------------------------
  // SYNC GOOGLE SHEETS (7-Step Sequence strictly preserving all data)
  // Step 1: Read latest Google Sheet data
  // Step 2: Retrieve ALL rows and columns (matrix)
  // Step 3: Compare Sheet data with current system data
  // Step 4: Update TRAINING PLAN display
  // Step 5: Preserve exact values from the Sheet without alteration
  // Step 6: Show last synchronization time
  // Step 7: Show clear success / error message
  // --------------------------------------------------------------------------
  const syncFromGoogleSheet = useCallback(async (isManual: boolean = false) => {
    if (!spreadsheetId) {
      if (isManual && addToast) {
        addToast('No Sheet Connected', 'Please specify a Google Sheet URL or ID in Settings.', 'warning');
      }
      setSyncNotificationBanner({
        type: 'warning',
        title: 'Google Sheet Not Configured',
        message: 'No Google Sheet URL or ID is configured. Please specify a spreadsheet ID.'
      });
      return;
    }

    try {
      setIsSyncingSheet(true);
      const activeTabTitle = currentFolder.name || 'Stitching A';
      const token = googleToken || (await getGoogleAccessToken());

      let rawValues: any[][] = [];
      let parsedResult: { auditDate: string; dateColumnHeader: string; rows: StitchingAuditRow[] } | null = null;
      let syncSource = '';

      // Step 1 & 2: Read latest data & retrieve all rows/columns
      if (token) {
        try {
          const range = `'${activeTabTitle}'!A1:F45`;
          try {
            rawValues = await readSheetValues(spreadsheetId, range, token);
          } catch (tabErr) {
            // Fallback to Sheet1 if tab not found
            rawValues = await readSheetValues(spreadsheetId, 'Sheet1!A1:F45', token);
          }
          if (rawValues && rawValues.length > 0) {
            parsedResult = parseSheetMatrixToTrainingPlan(rawValues);
            syncSource = 'Google Sheets API v4 (Authenticated OAuth)';
          }
        } catch (apiErr: any) {
          console.warn('[Google Sheets API Error]:', apiErr);
        }
      }

      // If token read was not available or empty, try server-side live proxy
      if (!parsedResult || parsedResult.rows.length === 0) {
        try {
          const liveRes = await fetchLiveGoogleSheetTab({
            sheetId: spreadsheetId,
            tabName: activeTabTitle,
            folderId: activeFolderId
          });

          if (liveRes.success && liveRes.rows) {
            parsedResult = {
              auditDate: liveRes.auditDate || 'Audit Date: September 24, 2026',
              dateColumnHeader: liveRes.dateColumnHeader || '(09/21~26/26)',
              rows: liveRes.rows
            };
            syncSource = 'Google Sheets Direct Stream';
          } else if (liveRes.requiresAuth && !token) {
            // Step 7: Show exact configuration required when auth is needed
            setSyncNotificationBanner({
              type: 'warning',
              title: 'Google Sheets API Authorization Required',
              message: 'This Google Sheet requires authorized Google account access to read rows.',
              details: [
                'Google Account: internalauditordtpshoes123@gmail.com',
                'Spreadsheet ID: ' + spreadsheetId,
                'Required Scope: https://www.googleapis.com/auth/spreadsheets',
                'Action: Click "Sign in with Google" below to authorize access.'
              ]
            });
            if (isManual && addToast) {
              addToast('Authorization Required', 'Sign in with Google to read from this spreadsheet.', 'warning');
            }
            return;
          }
        } catch (proxyErr: any) {
          console.warn('[Server Live Fetch Error]:', proxyErr);
        }
      }

      if (parsedResult && parsedResult.rows.length > 0) {
        const incomingRows = parsedResult.rows;
        const currentRows = currentFolder.rows || [];

        // Step 3: Compare Sheet data with system data
        let changesCount = 0;
        let newRowsCount = 0;
        incomingRows.forEach((inRow, idx) => {
          const existing = currentRows[idx];
          if (!existing) {
            newRowsCount++;
          } else if (
            existing.lineNo !== inRow.lineNo ||
            existing.name !== inRow.name ||
            existing.date !== inRow.date ||
            existing.style !== inRow.style ||
            existing.findings !== inRow.findings
          ) {
            changesCount++;
          }
        });

        // Step 4 & 5: Update TRAINING PLAN display & preserve exact values
        setFolders(prev => prev.map(f => {
          if (f.id === activeFolderId) {
            return {
              ...f,
              auditDate: parsedResult!.auditDate,
              dateColumnHeader: parsedResult!.dateColumnHeader,
              rows: incomingRows
            };
          }
          return f;
        }));

        // Persist to backend database without altering sheet
        await saveSyncedFolderToBackend({
          folderId: activeFolderId,
          auditDate: parsedResult.auditDate,
          dateColumnHeader: parsedResult.dateColumnHeader,
          rows: incomingRows,
          sheetId: spreadsheetId,
          sheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
        });

        // First synchronization READ-ONLY complete: now safe to enable two-way writes
        setFirstSyncCompleted(true);
        sessionStorage.setItem('datian_tp_first_sync_done', 'true');

        // Step 6: Show last synchronization time
        const syncTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastGoogleSyncTime(syncTimestamp);

        // Step 7: Show clear success message
        const summaryText = `Google Sheets Synced Successfully: Loaded ${incomingRows.length} records (${newRowsCount} new, ${changesCount} updated) from tab "${activeTabTitle}". Exact values preserved.`;
        setSyncNotificationBanner({
          type: 'success',
          title: 'Google Sheets Synced Successfully',
          message: summaryText,
          details: [
            `Total Records: ${incomingRows.length} rows retrieved without alteration`,
            `Audit Date: "${parsedResult.auditDate}"`,
            `Date Column Header: "${parsedResult.dateColumnHeader}"`,
            `Source: ${syncSource || 'Google Sheets API v4'}`,
            `Last Sync Time: ${syncTimestamp}`,
            `Status: 2-Way Synchronization is now enabled`
          ]
        });

        if (isManual && addToast) {
          addToast('Google Sheets Synced', summaryText, 'success');
        }
      } else {
        if (!token) {
          setSyncNotificationBanner({
            type: 'warning',
            title: 'Google Sheets API Authorization Required',
            message: 'Spreadsheet read requires Google OAuth permissions. Click "Sign in with Google" to authorize access.',
            details: [
              'Required OAuth Scope: https://www.googleapis.com/auth/spreadsheets',
              'Connected Spreadsheet: ' + spreadsheetId,
              'User Account: internalauditordtpshoes123@gmail.com'
            ]
          });
          if (isManual && addToast) {
            addToast('Authorization Required', 'Please sign in with Google to read from this spreadsheet.', 'warning');
          }
        } else {
          setSyncNotificationBanner({
            type: 'info',
            title: 'Google Sheet Read Completed',
            message: `Connected to tab "${activeTabTitle}". 22 standard audit rows are ready.`
          });
        }
      }
    } catch (err: any) {
      console.error('Failed to sync from Google Sheet:', err);
      setSyncNotificationBanner({
        type: 'error',
        title: 'Google Sheet Synchronization Failed',
        message: err.message || 'Could not fetch data from Google Sheet.',
        details: [
          'Verify that spreadsheet sharing allows access or sign in with internalauditordtpshoes123@gmail.com.',
          'Verify the spreadsheet contains tab: ' + currentFolder.name
        ]
      });
      if (isManual && addToast) {
        addToast('Sync Failed', err.message || 'Could not fetch data from Google Sheet.', 'warning');
      }
    } finally {
      setIsSyncingSheet(false);
    }
  }, [spreadsheetId, googleToken, currentFolder, activeFolderId, addToast]);

  // 2. SYSTEM -> GOOGLE SHEET: Push current folder to Google Sheet (2-Way Write)
  const syncToGoogleSheet = async (isManual: boolean = false) => {
    if (!spreadsheetId) {
      if (addToast) {
        addToast('No Sheet Connected', 'Please connect a Google Sheet first.', 'warning');
      }
      return;
    }

    // Safety check: ensure first read-only sync has occurred before writing
    if (!firstSyncCompleted && isManual) {
      setConfirmDialog({
        isOpen: true,
        title: 'Initial Sync Recommended',
        message: 'You have not yet performed the initial read from Google Sheet into TRAINING PLAN. We recommend clicking "SYNC GOOGLE SHEETS" first to ensure all existing sheet data is loaded. Do you still want to overwrite the sheet?',
        onConfirm: () => {
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
          executePush();
        }
      });
      return;
    }

    const executePush = async () => {
      try {
        setIsPushingSheet(true);
        const token = googleToken || (await getGoogleAccessToken());
        const activeTabTitle = currentFolder.name || 'Stitching A';

        await syncFolderToGoogleSheet(spreadsheetId, activeTabTitle, currentFolder, token);
        const syncTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastGoogleSyncTime(syncTimestamp);

        setSyncNotificationBanner({
          type: 'success',
          title: 'Google Sheet Updated',
          message: `Successfully pushed ${currentFolder.rows.length} rows to tab "${activeTabTitle}" in Google Sheets.`,
          details: [
            `Tab: ${activeTabTitle}`,
            `Rows Pushed: ${currentFolder.rows.length}`,
            `Timestamp: ${syncTimestamp}`
          ]
        });

        if (addToast) {
          addToast(
            'Google Sheet Updated',
            `Pushed ${currentFolder.rows.length} rows to tab "${activeTabTitle}" in Google Sheets.`,
            'success'
          );
        }
      } catch (err: any) {
        console.error('Failed to push to Google Sheet:', err);
        setSyncNotificationBanner({
          type: 'error',
          title: 'Push to Google Sheet Failed',
          message: err.message || 'Could not update Google Sheet.'
        });
        if (addToast) {
          addToast('Push Error', err.message || 'Could not update Google Sheet.', 'warning');
        }
      } finally {
        setIsPushingSheet(false);
      }
    };

    if (isManual) {
      setConfirmDialog({
        isOpen: true,
        title: 'Push Data to Google Sheet',
        message: `Are you sure you want to write the current ${currentFolder.rows.length} records from ${currentFolder.name} to your connected Google Sheet? This will update the spreadsheet cells.`,
        onConfirm: () => {
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
          executePush();
        }
      });
    } else {
      executePush();
    }
  };

  // Background auto-sync effect (polls every 30s when enabled and signed in)
  useEffect(() => {
    if (!autoSyncEnabled || !googleToken || !spreadsheetId) {
      if (autoSyncIntervalRef.current) clearInterval(autoSyncIntervalRef.current);
      return;
    }

    autoSyncIntervalRef.current = setInterval(() => {
      // Background poll without loud toast
      syncFromGoogleSheet(false);
    }, 30000);

    return () => {
      if (autoSyncIntervalRef.current) clearInterval(autoSyncIntervalRef.current);
    };
  }, [autoSyncEnabled, googleToken, spreadsheetId, syncFromGoogleSheet]);

  // Handle cell edit with instant Google Sheet row update (only after first sync)
  const handleCellChange = (rowIndex: number, field: keyof StitchingAuditRow, value: string) => {
    setFolders(prevFolders => {
      const updatedFolders = prevFolders.map(folder => {
        if (folder.id !== activeFolderId) return folder;
        const updatedRows = [...folder.rows];
        updatedRows[rowIndex] = {
          ...updatedRows[rowIndex],
          [field]: value
        };
        scheduleFolderAutoSave(folder.id, folder.auditDate, folder.dateColumnHeader, updatedRows);
        
        // Only write back to Google Sheet if first read-only sync has occurred
        if (googleToken && spreadsheetId && firstSyncCompleted) {
          const row1Based = rowIndex + 6; // Rows 1-3 blank, row 4 date, row 5 header, data starts row 6
          updateSheetRow(spreadsheetId, folder.name, row1Based, updatedRows[rowIndex], googleToken)
            .catch(e => console.warn('[Google Sheet Row Sync Error]:', e));
        }

        return {
          ...folder,
          rows: updatedRows
        };
      });
      return updatedFolders;
    });
  };

  // Handle Audit Date edit
  const handleAuditDateChange = (value: string) => {
    setFolders(prevFolders => {
      return prevFolders.map(folder => {
        if (folder.id !== activeFolderId) return folder;
        scheduleFolderAutoSave(folder.id, value, folder.dateColumnHeader, folder.rows);
        return {
          ...folder,
          auditDate: value
        };
      });
    });
  };

  // Handle Date column header edit
  const handleDateHeaderChange = (value: string) => {
    setFolders(prevFolders => {
      return prevFolders.map(folder => {
        if (folder.id !== activeFolderId) return folder;
        scheduleFolderAutoSave(folder.id, folder.auditDate, value, folder.rows);
        return {
          ...folder,
          dateColumnHeader: value
        };
      });
    });
  };

  // Add new blank row to current folder
  const handleAddRow = () => {
    const nextLineIndex = currentFolder.rows.length + 1;
    const prefix = currentFolder.code ? currentFolder.code.replace('ST', '') : 'A';
    const newRow: StitchingAuditRow = {
      id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      lineNo: `${prefix}${nextLineIndex}`,
      name: '',
      date: '',
      style: '',
      findings: ''
    };

    setFolders(prevFolders => {
      return prevFolders.map(folder => {
        if (folder.id !== activeFolderId) return folder;
        const updatedRows = [...folder.rows, newRow];
        scheduleFolderAutoSave(folder.id, folder.auditDate, folder.dateColumnHeader, updatedRows);
        
        // Append to Google Sheet only after first sync
        if (googleToken && spreadsheetId && firstSyncCompleted) {
          appendSheetRow(spreadsheetId, folder.name, newRow, googleToken)
            .catch(e => console.warn('[Google Sheet Append Error]:', e));
        }

        return {
          ...folder,
          rows: updatedRows
        };
      });
    });

    if (addToast) {
      addToast('Row Added', `Added row ${newRow.lineNo} to ${currentFolder.name}.`, 'info');
    }
  };

  // Delete row from current folder (with confirmation dialog)
  const handleDeleteRow = (index: number) => {
    const targetRow = currentFolder.rows[index];
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Training Plan Record',
      message: `Are you sure you want to delete row ${targetRow?.lineNo || index + 1} (${targetRow?.name || 'Empty Name'})? This will remove it from the system and update the connected Google Sheet.`,
      onConfirm: () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        setFolders(prevFolders => {
          return prevFolders.map(folder => {
            if (folder.id !== activeFolderId) return folder;
            let updatedRows: StitchingAuditRow[];
            if (folder.rows.length <= 1) {
              updatedRows = [{ id: `row-${Date.now()}`, lineNo: 'A1', name: '', date: '', style: '', findings: '' }];
            } else {
              updatedRows = folder.rows.filter((_, idx) => idx !== index);
            }
            scheduleFolderAutoSave(folder.id, folder.auditDate, folder.dateColumnHeader, updatedRows);
            
            // Sync whole folder to Google Sheet after deletion only if first sync completed
            if (googleToken && spreadsheetId && firstSyncCompleted) {
              syncFolderToGoogleSheet(spreadsheetId, folder.name, { ...folder, rows: updatedRows }, googleToken)
                .catch(e => console.warn('[Google Sheet Delete Sync Error]:', e));
            }

            return {
              ...folder,
              rows: updatedRows
            };
          });
        });
        if (addToast) {
          addToast('Row Deleted', `Record removed from ${currentFolder.name}.`, 'info');
        }
      }
    });
  };

  // Reset current folder table
  const handleResetCurrentFolder = () => {
    setConfirmDialog({
      isOpen: true,
      title: `Reset ${currentFolder.name}`,
      message: `Are you sure you want to clear all data in ${currentFolder.name}? All rows will be reset to default blanks.`,
      onConfirm: () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        const defaultRows = generateDefault22Rows();
        setFolders(prevFolders => {
          return prevFolders.map(folder => {
            if (folder.id !== activeFolderId) return folder;
            const resetFolderData = {
              ...folder,
              auditDate: 'Audit Date: September 24, 2026',
              dateColumnHeader: '(09/21~26/26)',
              rows: defaultRows
            };
            triggerSaveFolder(folder.id, {
              auditDate: 'Audit Date: September 24, 2026',
              dateColumnHeader: '(09/21~26/26)',
              rows: defaultRows
            }, true);
            return resetFolderData;
          });
        });
      }
    });
  };

  // Switch folder tab
  const handleSelectFolder = async (folderId: string) => {
    setActiveFolderId(folderId);
    setViewMode('table');
    try {
      await setActiveStitchingFolder(folderId);
    } catch {}
  };

  // Create new folder
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      const res = await createStitchingFolder({ name: newFolderName.trim() });
      if (res && res.folders) {
        setFolders(res.folders);
        setActiveFolderId(res.activeFolderId);
        setIsNewFolderModalOpen(false);
        setNewFolderName('');
        if (addToast) {
          addToast('Folder Created', `Folder "${newFolderName}" added to Training Plan.`, 'success');
        }
      }
    } catch (err) {
      if (addToast) {
        addToast('Error', 'Failed to create folder.', 'warning');
      }
    }
  };

  // Save new Sheet ID or URL configuration
  const handleSaveSheetConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = extractSpreadsheetId(tempSheetInput);
    if (!cleanId) {
      if (addToast) addToast('Invalid Input', 'Please enter a valid Google Sheet URL or spreadsheet ID.', 'warning');
      return;
    }

    try {
      setIsConnectingSheet(true);
      const token = googleToken || (await getGoogleAccessToken());
      
      let fetchedTitle = 'Training Plan - Stitching';
      if (token) {
        const details = await getSpreadsheetDetails(cleanId, token);
        if (details.title) fetchedTitle = details.title;
      }

      setSpreadsheetId(cleanId);
      setSpreadsheetTitle(fetchedTitle);
      localStorage.setItem('datian_training_sheet_id', cleanId);
      setIsConfigModalOpen(false);

      if (addToast) {
        addToast('Google Sheet Connected', `Connected to "${fetchedTitle}".`, 'success');
      }

      // Automatically trigger initial read from the sheet
      if (token) {
        syncFromGoogleSheet(true);
      }
    } catch (err: any) {
      console.error('Error connecting to sheet:', err);
      // Still allow saving ID even if metadata verification fails
      setSpreadsheetId(cleanId);
      localStorage.setItem('datian_training_sheet_id', cleanId);
      setIsConfigModalOpen(false);
      if (addToast) {
        addToast('Sheet ID Saved', 'Spreadsheet ID saved. Sign in to Google to verify read/write access.', 'info');
      }
    } finally {
      setIsConnectingSheet(false);
    }
  };

  // Create brand new Google Sheet in user's Drive with the exact template
  const handleCreateNewGoogleSheet = async () => {
    if (!googleUser || !googleToken) {
      if (addToast) addToast('Sign In Required', 'Please sign in with Google to create a new Google Sheet.', 'warning');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Create New Google Sheet in Drive',
      message: 'This will create a brand new Google Sheet in your Google Drive titled "DATIAN CSR HUB - Training Plan (Stitching)" with tabs Stitching A, Stitching B, Stitching D, Stitching F pre-filled with the exact template. Continue?',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
          setIsCreatingNewSheet(true);
          const newSheet = await createNewTrainingPlanSpreadsheet(
            'DATIAN CSR HUB - Training Plan (Stitching)',
            googleToken
          );
          setSpreadsheetId(newSheet.spreadsheetId);
          setSpreadsheetTitle('DATIAN CSR HUB - Training Plan (Stitching)');
          localStorage.setItem('datian_training_sheet_id', newSheet.spreadsheetId);
          setIsConfigModalOpen(false);
          
          if (addToast) {
            addToast('Google Sheet Created', 'Created and connected new Google Sheet in your Google Drive!', 'success');
          }
        } catch (err: any) {
          console.error('Failed to create sheet:', err);
          if (addToast) {
            addToast('Creation Error', err.message || 'Could not create Google Sheet.', 'warning');
          }
        } finally {
          setIsCreatingNewSheet(false);
        }
      }
    });
  };

  // Export CSV for current folder
  const handleExportCSV = () => {
    const headers = ['Line No.', 'Name', currentFolder.dateColumnHeader || '(Date)', 'STYLE', 'FINDINGS'];
    const rowsCsv = currentFolder.rows.map(r => [
      `"${(r.lineNo || '').replace(/"/g, '""')}"`,
      `"${(r.name || '').replace(/"/g, '""')}"`,
      `"${(r.date || '').replace(/"/g, '""')}"`,
      `"${(r.style || '').replace(/"/g, '""')}"`,
      `"${(r.findings || '').replace(/"/g, '""')}"`
    ].join(','));

    const csvContent = [
      `"Folder:","${(currentFolder.name || '').replace(/"/g, '""')}"`,
      `"Audit Date:","${(currentFolder.auditDate || '').replace(/"/g, '""')}"`,
      '',
      headers.join(','),
      ...rowsCsv
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const sanitizedName = currentFolder.name.replace(/[^A-Za-z0-9]/g, '_');
    link.setAttribute('download', `Training_Plan_${sanitizedName}_Audit.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print current folder table
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header & Audit Controls */}
      <div className="bg-[#09152a] border border-[#16294d] p-5 rounded-2xl shadow-xl backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                DATIAN CSR HUB • INTERNAL AUDIT
              </span>
              <span className="text-xs text-slate-400">Training Plan</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
              <span>Training Plan — Stitching</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Department audit folders and manual training records. Real-time Google Sheets sync active for <strong>Stitching A</strong>, <strong>Stitching B</strong>, <strong>Stitching D</strong>, and <strong>Stitching F</strong>.
            </p>
          </div>

          {/* Action Buttons & Master DB Save Status */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Save Status Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0e1d38] border border-[#1a3360] text-xs">
              {saveStatus === 'saving' ? (
                <span className="flex items-center gap-1.5 text-yellow-400">
                  <span className="w-2 h-2 rounded-full bg-yellow-400 animate-ping" />
                  Saving...
                </span>
              ) : saveStatus === 'unsaved' ? (
                <span className="flex items-center gap-1.5 text-amber-300">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  Unsaved edits
                </span>
              ) : saveStatus === 'error' ? (
                <span className="flex items-center gap-1.5 text-rose-400">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Sync error
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Saved to Master DB</span>
                  {lastSavedTime && (
                    <span className="text-slate-400 font-mono">({lastSavedTime})</span>
                  )}
                </span>
              )}
            </div>

            {/* Explicit Save Button */}
            <button
              onClick={() => triggerSaveFolder(currentFolder.id, {
                auditDate: currentFolder.auditDate,
                dateColumnHeader: currentFolder.dateColumnHeader,
                rows: currentFolder.rows
              }, true)}
              disabled={saveStatus === 'saving'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Save current folder data immediately to master database"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>

            {/* Add Row Button */}
            {viewMode === 'table' && (
              <button
                onClick={handleAddRow}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-all active:scale-95 cursor-pointer"
                title="Add a new blank row to current folder"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Row</span>
              </button>
            )}

            {/* Export CSV */}
            {viewMode === 'table' && (
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0f2142] hover:bg-[#162e5c] text-slate-200 border border-[#1e3c73] text-xs font-medium transition-all cursor-pointer"
                title="Export this folder as CSV file"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>
            )}

            {/* Print / PDF */}
            {viewMode === 'table' && (
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0f2142] hover:bg-[#162e5c] text-slate-200 border border-[#1e3c73] text-xs font-medium transition-all cursor-pointer"
                title="Print or export to PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
            )}

            {/* Reset Table */}
            {viewMode === 'table' && (
              <button
                onClick={handleResetCurrentFolder}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#0f2142]/60 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border border-[#1e3c73]/60 hover:border-rose-700/50 text-xs transition-all cursor-pointer"
                title="Clear current folder table and reset to blank"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* GOOGLE SHEETS LIVE DATA INTEGRATION SUITE BAR */}
        {/* ========================================================================= */}
        <div className="mt-4 pt-4 border-t border-[#142647] bg-[#071122]/70 rounded-xl p-3.5 border border-[#13284f]">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            {/* Left: Google Sheets Identity & Status */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Google Sheets Real-Time Sync</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      API v4
                    </span>
                  </span>

                  {/* Mode Badge: 1-Way Read-Only until first sync completes */}
                  {!firstSyncCompleted ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      1-Way Read-Only (First Import)
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      2-Way Sync Active
                    </span>
                  )}

                  {googleUser ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-600/40">
                      Google: {googleUser.displayName || googleUser.email?.split('@')[0]}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                      Read-Only Stream
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 font-mono">
                  <span>Connected Sheet: <strong className="text-slate-200 font-medium">{spreadsheetTitle}</strong></span>
                  <span>•</span>
                  <span>Active Tab: <strong className="text-emerald-400 font-medium">{currentFolder.name}</strong></span>
                  {lastGoogleSyncTime && (
                    <>
                      <span>•</span>
                      <span className="text-emerald-400 font-semibold">Last Synced: {lastGoogleSyncTime}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Sync Controls & Sign in with Google */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Google Sign-In Button (Official Google Design) */}
              {!googleUser ? (
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleSigningIn}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 text-xs font-semibold shadow-md transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
                  title="Sign in with Google to enable authenticated 2-way Google Sheets API read & write"
                >
                  {isGoogleSigningIn ? (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                  )}
                  <span>Sign in with Google</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleGoogleSignOut}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs transition cursor-pointer"
                    title="Sign out of Google"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* 1. SYNC GOOGLE SHEETS BUTTON (Prominent Primary Action) */}
              <button
                type="button"
                onClick={() => syncFromGoogleSheet(true)}
                disabled={isSyncingSheet}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-extrabold shadow-lg shadow-emerald-950/50 border border-emerald-400/40 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                title="Execute 7-step synchronization: Read latest Google Sheet records, preserve all exact values, and update TRAINING PLAN"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncingSheet ? 'animate-spin' : ''}`} />
                <span className="tracking-wider">SYNC GOOGLE SHEETS</span>
              </button>

              {/* 2. Push to Google Sheet (Write System -> Sheet, active after first sync) */}
              <button
                type="button"
                onClick={() => syncToGoogleSheet(true)}
                disabled={isPushingSheet}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/80 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                title="Save current Training Plan table directly to the Google Sheet tab (requires completed first sync)"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Push to Sheet</span>
              </button>

              {/* 3. Auto-Sync Toggle */}
              <button
                type="button"
                onClick={() => {
                  const next = !autoSyncEnabled;
                  setAutoSyncEnabled(next);
                  if (addToast) addToast('Auto-Sync', next ? 'Live bidirectional auto-sync enabled.' : 'Auto-sync paused.', 'info');
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition cursor-pointer ${
                  autoSyncEnabled 
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
                    : 'bg-slate-800/60 text-slate-400 border-slate-700'
                }`}
                title="Toggle live background polling and auto-save"
              >
                <span className={`w-2 h-2 rounded-full ${autoSyncEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                <span>Auto-Sync {autoSyncEnabled ? 'ON' : 'OFF'}</span>
              </button>

              {/* 4. Sheet Settings / Change Sheet ID Modal Trigger */}
              <button
                type="button"
                onClick={() => {
                  setTempSheetInput(spreadsheetId);
                  setIsConfigModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#0f2142] hover:bg-[#162e5c] text-slate-200 border border-[#1e3c73] text-xs font-medium transition cursor-pointer"
                title="Configure connected Google Sheet ID or create a new sheet"
              >
                <Settings2 className="w-3.5 h-3.5" />
                <span>Sheet Config</span>
              </button>

              {/* 5. Open in Google Sheets in new tab */}
              {spreadsheetId && (
                <a
                  href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-xl bg-[#0f2142] hover:bg-[#162e5c] text-slate-300 hover:text-white border border-[#1e3c73] transition"
                  title="Open live Google Sheet in Google Drive (new tab)"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>

          {/* Sync Result / Notification Banner */}
          {syncNotificationBanner && (
            <div className={`mt-3 p-3 rounded-xl border flex items-start justify-between gap-3 text-xs ${
              syncNotificationBanner.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-600/40 text-emerald-200'
                : syncNotificationBanner.type === 'warning'
                ? 'bg-amber-950/40 border-amber-600/40 text-amber-200'
                : syncNotificationBanner.type === 'error'
                ? 'bg-rose-950/40 border-rose-600/40 text-rose-200'
                : 'bg-blue-950/40 border-blue-600/40 text-blue-200'
            }`}>
              <div className="flex items-start gap-2.5">
                {syncNotificationBanner.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : syncNotificationBanner.type === 'warning' ? (
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                ) : syncNotificationBanner.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                ) : (
                  <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold">{syncNotificationBanner.title}</div>
                  <div className="mt-0.5 opacity-90 leading-relaxed">{syncNotificationBanner.message}</div>
                  {syncNotificationBanner.details && syncNotificationBanner.details.length > 0 && (
                    <ul className="mt-1.5 space-y-0.5 text-[11px] opacity-85 list-disc list-inside">
                      {syncNotificationBanner.details.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  )}
                  {syncNotificationBanner.type === 'warning' && !googleUser && (
                    <div className="mt-2.5 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] shadow transition cursor-pointer"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        Sign in with Google Now
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSyncNotificationBanner(null)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/10 transition cursor-pointer shrink-0"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* FOLDER TABS BAR - Stitching A, Stitching B, Stitching D, Stitching F */}
        <div className="mt-5 pt-4 border-t border-[#142647] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono mr-1 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              Folders:
            </span>

            {/* Folder Tabs */}
            {folders.map((folder) => {
              const isActive = activeFolderId === folder.id && viewMode === 'table';
              return (
                <button
                  key={folder.id}
                  onClick={() => handleSelectFolder(folder.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-500/20 to-blue-600/20 border border-amber-500/50 text-white shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                      : 'bg-[#081224] hover:bg-[#0e2142] border border-[#14294f] text-slate-300 hover:text-white'
                  }`}
                >
                  {isActive ? (
                    <FolderOpen className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Folder className="w-4 h-4 text-blue-400" />
                  )}
                  <span>{folder.name}</span>
                  <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                    isActive ? 'bg-amber-500/30 text-amber-200' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {folder.rows?.length || 0}
                  </span>
                </button>
              );
            })}

            {/* + Add New Folder Button */}
            <button
              onClick={() => setIsNewFolderModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-[#081224] hover:bg-[#0e2142] border border-dashed border-slate-700 hover:border-slate-500 text-slate-400 hover:text-slate-200 text-xs transition cursor-pointer"
              title="Add another stitching line or folder"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Folder</span>
            </button>
          </div>

          {/* Sub-view switcher (Folders Overview / Canva Proposal Site) */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition cursor-pointer ${
                viewMode === 'grid' 
                  ? 'bg-blue-600 text-white font-semibold' 
                  : 'bg-[#081224] hover:bg-[#0e2142] text-slate-300 border border-[#14294f]'
              }`}
              title="View all folders as department cards"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All Folders Overview</span>
            </button>

            <button
              onClick={() => setViewMode(viewMode === 'canva' ? 'table' : 'canva')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition cursor-pointer ${
                viewMode === 'canva' 
                  ? 'bg-amber-600 text-white font-semibold' 
                  : 'bg-[#081224] hover:bg-[#0e2142] text-amber-300 hover:text-amber-200 border border-amber-500/30'
              }`}
              title="Open Canva Proposal & Evaluation Audit File Site"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Canva Audit Site</span>
            </button>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: ALL FOLDERS OVERVIEW (GRID) */}
      {viewMode === 'grid' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Folder className="w-4 h-4 text-amber-400" />
              <span>Stitching Training Plan Folders ({folders.length})</span>
            </h2>
            <button
              onClick={() => setViewMode('table')}
              className="text-xs text-blue-400 hover:underline cursor-pointer"
            >
              ← Back to {currentFolder.name} Table
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {folders.map((folder) => {
              const isCurrent = folder.id === activeFolderId;
              return (
                <div
                  key={folder.id}
                  onClick={() => handleSelectFolder(folder.id)}
                  className={`p-5 rounded-2xl border transition-all duration-200 cursor-pointer group hover:scale-[1.02] ${
                    isCurrent
                      ? 'bg-gradient-to-b from-[#0f2142] to-[#09152b] border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                      : 'bg-[#071122] hover:bg-[#0b1b36] border-[#13274c] hover:border-blue-500/40'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-400/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                      <Folder className="w-6 h-6" />
                    </div>
                    {isCurrent && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                        ACTIVE
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-white mt-4 group-hover:text-blue-300 transition-colors">
                    {folder.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {folder.code ? `Section Code: ${folder.code}` : 'Stitching Line Audit Record'}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                    <span>Audit Date: <strong className="text-slate-200 font-normal">{folder.auditDate || 'Not set'}</strong></span>
                    <span><strong className="text-blue-400 font-mono">{folder.rows?.length || 0}</strong> rows</span>
                  </div>

                  <div className="mt-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectFolder(folder.id);
                      }}
                      className="w-full py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white text-xs font-semibold border border-blue-500/30 transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Open Folder Table</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW MODE 2: CANVA AUDIT FILE SITE */}
      {viewMode === 'canva' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between bg-[#081224] p-3 rounded-xl border border-[#142647]">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="font-semibold text-white">Canva Audit Site</span>
              <span className="text-slate-500">•</span>
              <span>Proposal Form & Evaluation Form</span>
            </div>
            <button
              onClick={() => setViewMode('table')}
              className="text-xs text-blue-400 hover:underline cursor-pointer"
            >
              ← Back to {currentFolder.name} Table
            </button>
          </div>
          <StitchingCanvaAuditView addToast={addToast || (() => {})} />
        </div>
      )}

      {/* VIEW MODE 3: THE REQUESTED 5-COLUMN AUDIT TABLE FOR CURRENT FOLDER */}
      {viewMode === 'table' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Folder Sub-header / Breadcrumb */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Training Plan</span>
              <ChevronRight className="w-3 h-3 text-slate-600" />
              <span className="text-slate-200">Stitching</span>
              <ChevronRight className="w-3 h-3 text-slate-600" />
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <Folder className="w-3.5 h-3.5" />
                {currentFolder.name}
              </span>
            </div>

            <div className="text-xs text-slate-400">
              Folder: <strong className="text-white font-mono">{currentFolder.name}</strong> • Total Rows: <strong className="text-blue-400 font-mono">{currentFolder.rows.length}</strong>
            </div>
          </div>

          {/* Main Table Card */}
          <div className="bg-[#071122] border border-[#13274c] rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[760px]">
                {/* Table Header: Row 1 - Audit Date */}
                <thead>
                  <tr className="bg-[#0b1b36] border-b border-[#14294f]">
                    {/* Column 1: Audit Date Label */}
                    <th className="py-3.5 px-4 text-xs font-bold text-white uppercase tracking-wider border-r border-[#14294f] w-36 whitespace-nowrap bg-[#0d2042]">
                      <div className="flex items-center gap-1.5">
                        <span>Audit Date:</span>
                      </div>
                    </th>

                    {/* Column 2 to 5: Blank editable value beside Audit Date */}
                    <th colSpan={4} className="py-2 px-3 bg-[#09172f]">
                      <div className="relative flex items-center max-w-md">
                        <input
                          type="text"
                          value={currentFolder.auditDate}
                          onChange={(e) => handleAuditDateChange(e.target.value)}
                          onBlur={() => triggerSaveFolder(currentFolder.id, {
                            auditDate: currentFolder.auditDate,
                            dateColumnHeader: currentFolder.dateColumnHeader,
                            rows: currentFolder.rows
                          }, false)}
                          placeholder="Audit Date: September 24, 2026"
                          className="w-full px-3 py-1.5 bg-[#050c18] border border-[#18315c] focus:border-blue-500 rounded-lg text-sm text-white placeholder-slate-500 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                        />
                        {currentFolder.auditDate && (
                          <button
                            onClick={() => handleAuditDateChange('')}
                            className="absolute right-2.5 text-slate-400 hover:text-white text-xs cursor-pointer"
                            title="Clear audit date"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </th>

                    {/* Action column header spacer */}
                    <th className="w-14 bg-[#09172f] border-l border-[#14294f] px-2 text-center text-[10px] text-slate-400 font-normal">
                      Action
                    </th>
                  </tr>

                  {/* Table Header: Row 2 - 5 Columns exactly: Line No. | Name | (09/21~26/26) | STYLE | FINDINGS */}
                  <tr className="bg-[#0a1830] border-b border-[#14294f] text-xs font-bold text-slate-200">
                    {/* 1. Line No. */}
                    <th className="py-3 px-4 border-r border-[#14294f] w-32 tracking-wider">
                      <div className="text-white font-bold tracking-wide">
                        Line No.
                      </div>
                    </th>

                    {/* 2. Name */}
                    <th className="py-3 px-4 border-r border-[#14294f] w-56 tracking-wider">
                      <div className="text-white font-bold tracking-wide">
                        Name
                      </div>
                    </th>

                    {/* 3. (Date) - Editable header */}
                    <th className="py-3 px-4 border-r border-[#14294f] w-44 tracking-wider">
                      <div className="flex items-center justify-between gap-1 group">
                        {isEditingHeader ? (
                          <input
                            type="text"
                            autoFocus
                            value={currentFolder.dateColumnHeader}
                            onChange={(e) => handleDateHeaderChange(e.target.value)}
                            onBlur={() => {
                              setIsEditingHeader(false);
                              triggerSaveFolder(currentFolder.id, {
                                auditDate: currentFolder.auditDate,
                                dateColumnHeader: currentFolder.dateColumnHeader || '(09/21~26/26)',
                                rows: currentFolder.rows
                              }, false);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                setIsEditingHeader(false);
                                triggerSaveFolder(currentFolder.id, {
                                  auditDate: currentFolder.auditDate,
                                  dateColumnHeader: currentFolder.dateColumnHeader || '(09/21~26/26)',
                                  rows: currentFolder.rows
                                }, false);
                              }
                            }}
                            className="px-2 py-0.5 bg-[#050c18] border border-blue-500 rounded text-xs text-white font-bold w-full focus:outline-none"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => setIsEditingHeader(true)}
                            className="flex items-center gap-1.5 text-left text-white font-bold hover:text-blue-400 transition-colors w-full cursor-pointer"
                            title="Click to rename this date header"
                          >
                            <span className="font-bold">{currentFolder.dateColumnHeader || '(09/21~26/26)'}</span>
                            <Edit3 className="w-3 h-3 text-slate-400 group-hover:text-blue-400 opacity-70 group-hover:opacity-100" />
                          </button>
                        )}
                      </div>
                    </th>

                    {/* 4. STYLE */}
                    <th className="py-3 px-4 border-r border-[#14294f] w-48 tracking-wider">
                      <div className="text-white font-bold tracking-wide">
                        STYLE
                      </div>
                    </th>

                    {/* 5. FINDINGS */}
                    <th className="py-3 px-4 tracking-wider">
                      <div className="text-white font-bold tracking-wide">
                        FINDINGS
                      </div>
                    </th>

                    {/* Row deletion spacer */}
                    <th className="py-3 px-2 text-center w-14 border-l border-[#14294f] text-slate-400 text-xs font-normal">
                      —
                    </th>
                  </tr>
                </thead>

                {/* Table Body - Rows */}
                <tbody className="divide-y divide-[#0f1f3d] text-sm">
                  {currentFolder.rows.map((row, index) => (
                    <tr
                      key={row.id || `row-${index}`}
                      className="hover:bg-[#0a1832] transition-colors group"
                    >
                      {/* 1. Line No. */}
                      <td className="p-2 border-r border-[#0f1f3d] align-top">
                        <input
                          type="text"
                          value={row.lineNo}
                          onChange={(e) => handleCellChange(index, 'lineNo', e.target.value)}
                          onBlur={() => triggerSaveFolder(currentFolder.id, {
                            auditDate: currentFolder.auditDate,
                            dateColumnHeader: currentFolder.dateColumnHeader,
                            rows: currentFolder.rows
                          }, false)}
                          placeholder=""
                          className="w-full px-2.5 py-1.5 bg-[#050c18]/60 hover:bg-[#050c18] focus:bg-[#050c18] border border-transparent hover:border-[#14294f] focus:border-blue-500 rounded text-slate-100 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all placeholder-slate-600"
                        />
                      </td>

                      {/* 2. Name */}
                      <td className="p-2 border-r border-[#0f1f3d] align-top">
                        <input
                          type="text"
                          value={row.name}
                          onChange={(e) => handleCellChange(index, 'name', e.target.value)}
                          onBlur={() => triggerSaveFolder(currentFolder.id, {
                            auditDate: currentFolder.auditDate,
                            dateColumnHeader: currentFolder.dateColumnHeader,
                            rows: currentFolder.rows
                          }, false)}
                          placeholder=""
                          className="w-full px-2.5 py-1.5 bg-[#050c18]/60 hover:bg-[#050c18] focus:bg-[#050c18] border border-transparent hover:border-[#14294f] focus:border-blue-500 rounded text-slate-100 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all placeholder-slate-600"
                        />
                      </td>

                      {/* 3. (Date) */}
                      <td className="p-2 border-r border-[#0f1f3d] align-top">
                        <input
                          type="text"
                          value={row.date}
                          onChange={(e) => handleCellChange(index, 'date', e.target.value)}
                          onBlur={() => triggerSaveFolder(currentFolder.id, {
                            auditDate: currentFolder.auditDate,
                            dateColumnHeader: currentFolder.dateColumnHeader,
                            rows: currentFolder.rows
                          }, false)}
                          placeholder=""
                          className="w-full px-2.5 py-1.5 bg-[#050c18]/60 hover:bg-[#050c18] focus:bg-[#050c18] border border-transparent hover:border-[#14294f] focus:border-blue-500 rounded text-slate-100 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all placeholder-slate-600"
                        />
                      </td>

                      {/* 4. STYLE */}
                      <td className="p-2 border-r border-[#0f1f3d] align-top">
                        <input
                          type="text"
                          value={row.style}
                          onChange={(e) => handleCellChange(index, 'style', e.target.value)}
                          onBlur={() => triggerSaveFolder(currentFolder.id, {
                            auditDate: currentFolder.auditDate,
                            dateColumnHeader: currentFolder.dateColumnHeader,
                            rows: currentFolder.rows
                          }, false)}
                          placeholder=""
                          className="w-full px-2.5 py-1.5 bg-[#050c18]/60 hover:bg-[#050c18] focus:bg-[#050c18] border border-transparent hover:border-[#14294f] focus:border-blue-500 rounded text-slate-100 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all placeholder-slate-600 font-mono text-xs"
                        />
                      </td>

                      {/* 5. FINDINGS */}
                      <td className="p-2 align-top">
                        <textarea
                          rows={1}
                          value={row.findings}
                          onChange={(e) => {
                            handleCellChange(index, 'findings', e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = `${e.target.scrollHeight}px`;
                          }}
                          onBlur={() => triggerSaveFolder(currentFolder.id, {
                            auditDate: currentFolder.auditDate,
                            dateColumnHeader: currentFolder.dateColumnHeader,
                            rows: currentFolder.rows
                          }, false)}
                          placeholder=""
                          className="w-full px-2.5 py-1.5 bg-[#050c18]/60 hover:bg-[#050c18] focus:bg-[#050c18] border border-transparent hover:border-[#14294f] focus:border-blue-500 rounded text-slate-100 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all placeholder-slate-600 resize-none min-h-[38px]"
                        />
                      </td>

                      {/* Action Column: Delete Row */}
                      <td className="p-2 text-center border-l border-[#0f1f3d] align-middle">
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(index)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-40 group-hover:opacity-100 cursor-pointer"
                          title={`Delete Row ${row.lineNo || index + 1}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table Bottom Control Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-[#050c18]/80 border-t border-[#13274c]">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-900/40 transition-all active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add Row to {currentFolder.name}</span>
                </button>
                <span className="text-xs text-slate-400">
                  Total rows: <span className="font-semibold text-slate-200">{currentFolder.rows.length}</span>
                </span>
              </div>

              <div className="text-xs text-slate-400 flex items-center gap-2">
                <span>Click any cell to type and edit. Click</span>
                <button
                  onClick={() => setIsEditingHeader(true)}
                  className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-blue-400 hover:text-blue-300 font-mono cursor-pointer"
                >
                  {currentFolder.dateColumnHeader || '(09/21~26/26)'}
                </button>
                <span>to customize header.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW FOLDER MODAL */}
      {isNewFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#09152b] border border-[#18315c] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#142647]">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Folder className="w-5 h-5 text-blue-400" />
                <span>Create New Stitching Folder</span>
              </h3>
              <button
                onClick={() => setIsNewFolderModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Folder Name (e.g. Stitching C, Stitching E, Special Line)
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g. Stitching C"
                  className="w-full px-3.5 py-2.5 bg-[#050c18] border border-[#18315c] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewFolderModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md cursor-pointer"
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GOOGLE SHEETS CONFIGURATION MODAL */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#0a162b] border border-[#1d3869] rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#142647]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Google Sheets Synchronization Setup
                  </h3>
                  <p className="text-xs text-slate-400">
                    Connect an existing spreadsheet or create a new one in Google Drive
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSheetConfig} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Google Sheet URL or Spreadsheet ID
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={tempSheetInput}
                    onChange={(e) => setTempSheetInput(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                    className="w-full px-3.5 py-2.5 bg-[#050c18] border border-[#18315c] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Paste the full Google Sheet link from your browser address bar or copy just the spreadsheet ID.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#071324] border border-[#13284d] space-y-2 text-xs text-slate-300">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Real Google Sheets API Integration</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  All read, write, update, and delete actions directly communicate with the official Google Sheets API v4. When you edit a cell or add/remove a record, it syncs bidirectionally.
                </p>
              </div>

              <div className="pt-2 border-t border-[#142647] flex flex-col sm:flex-row items-center justify-between gap-3">
                {/* Create New Google Sheet Button */}
                <button
                  type="button"
                  onClick={handleCreateNewGoogleSheet}
                  disabled={isCreatingNewSheet}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition cursor-pointer"
                  title="Generate a brand new sheet in Google Drive pre-configured with Stitching A, B, D, F"
                >
                  {isCreatingNewSheet ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                  )}
                  <span>Create New Google Sheet</span>
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setIsConfigModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isConnectingSheet}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {isConnectingSheet && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Save & Connect</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL FOR DESTRUCTIVE / MUTATING ACTIONS */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0b172e] border border-[#1e396e] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {confirmDialog.title}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Confirm action
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-[#071122] p-3.5 rounded-xl border border-[#13274c]">
              {confirmDialog.message}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md cursor-pointer"
              >
                Confirm & Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
