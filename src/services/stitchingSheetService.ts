/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StitchingRecord, StitchingAuditTableData, StitchingFolder, StitchingFoldersResponse, StitchingAuditRow } from '../types';

export interface StitchingSheetConfig {
  sheetId?: string;
  sheetUrl: string;
  sheetName: string;
  apiKey?: string;
  autoSync: boolean;
  syncIntervalSeconds: number;
  lastSynced: string;
  syncStatus: 'synced' | 'syncing' | 'error' | 'connected' | 'empty';
  recordsSyncedCount: number;
  totalRecords?: number;
}

export interface SyncSheetResult {
  success: boolean;
  count: number;
  records: StitchingRecord[];
  lastSynced: string;
  syncStatus: 'synced' | 'syncing' | 'error' | 'connected' | 'empty';
  recordsSyncedCount: number;
  message?: string;
  error?: string;
}

/**
 * Fetch current Google Sheet sync configuration and status
 */
export async function getStitchingSheetConfig(): Promise<StitchingSheetConfig> {
  try {
    const res = await fetch('/api/stitching/sheet-config');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.config;
  } catch (err) {
    console.warn('[Stitching Sheet] Failed to fetch sheet config:', err);
    return {
      sheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      sheetUrl: 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',
      sheetName: 'Training Plan - Stitching',
      apiKey: '',
      autoSync: true,
      syncIntervalSeconds: 30,
      lastSynced: new Date().toISOString(),
      syncStatus: 'connected',
      recordsSyncedCount: 0,
      totalRecords: 0
    };
  }
}

/**
 * Save updated Google Sheet sync configuration
 */
export async function updateStitchingSheetConfig(config: Partial<StitchingSheetConfig>): Promise<StitchingSheetConfig> {
  const res = await fetch('/api/stitching/sheet-config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  });
  if (!res.ok) throw new Error(`Failed to update config: HTTP ${res.status}`);
  const data = await res.json();
  return data.config;
}

/**
 * Fetch the current training plan records from Google Sheet data source
 */
export async function getStitchingSheetData(): Promise<{ records: StitchingRecord[]; sheetRows: any[]; totalRecords: number; lastSynced: string; syncStatus: string; config?: StitchingSheetConfig }> {
  const res = await fetch('/api/stitching/sheet-data');
  if (!res.ok) throw new Error(`Failed to fetch sheet data: HTTP ${res.status}`);
  const data = await res.json();
  return {
    ...data,
    sheetRows: data.records || data.sheetRows || []
  };
}

/**
 * Add a new record directly to the Google Sheet source
 */
export async function addStitchingSheetRecord(record: Partial<StitchingRecord>): Promise<{
  success: boolean;
  newRecord: StitchingRecord;
  records: StitchingRecord[];
  lastSynced: string;
  recordsSyncedCount: number;
}> {
  const res = await fetch('/api/stitching/sync-rows', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows: [record] })
  });
  if (!res.ok) throw new Error(`Add record failed with HTTP ${res.status}`);
  const data = await res.json();
  return {
    success: true,
    newRecord: record as StitchingRecord,
    records: data.records || [],
    lastSynced: data.lastSynced || new Date().toISOString(),
    recordsSyncedCount: data.count || 0
  };
}

/**
 * Edit an existing record in the Google Sheet source
 */
export async function editStitchingSheetRecord(record: Partial<StitchingRecord>): Promise<{
  success: boolean;
  updatedRecord: StitchingRecord;
  records: StitchingRecord[];
  lastSynced: string;
  recordsSyncedCount: number;
}> {
  const res = await fetch('/api/stitching/sync-rows', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows: [record] })
  });
  if (!res.ok) throw new Error(`Edit record failed with HTTP ${res.status}`);
  const data = await res.json();
  return {
    success: true,
    updatedRecord: record as StitchingRecord,
    records: data.records || [],
    lastSynced: data.lastSynced || new Date().toISOString(),
    recordsSyncedCount: data.count || 0
  };
}

/**
 * Perform on-demand manual or automatic synchronization with Google Sheet
 */
export async function syncStitchingGoogleSheet(): Promise<SyncSheetResult> {
  const res = await fetch('/api/stitching/sync-google-sheet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new Error(`Sync failed with HTTP ${res.status}`);
  return res.json();
}

/**
 * Push parsed rows directly to synchronize data
 */
export async function syncStitchingRows(rows: any[]): Promise<SyncSheetResult> {
  const res = await fetch('/api/stitching/sync-rows', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows })
  });
  if (!res.ok) throw new Error(`Sync rows failed with HTTP ${res.status}`);
  return res.json();
}

/**
 * Clear stitching records back to a clean empty state
 */
export async function clearStitchingRecords(): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/stitching/clear-records', {
    method: 'POST'
  });
  if (!res.ok) throw new Error(`Clear records failed with HTTP ${res.status}`);
  return res.json();
}

/**
 * Get the persistent manual Stitching Audit Table data
 */
export async function getStitchingAuditTable(): Promise<StitchingAuditTableData> {
  const res = await fetch('/api/stitching/audit-table');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.data;
}

/**
 * Save the persistent manual Stitching Audit Table data
 */
export async function saveStitchingAuditTable(data: Partial<StitchingAuditTableData>): Promise<StitchingAuditTableData> {
  const res = await fetch('/api/stitching/audit-table', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.data;
}

/**
 * Get all Stitching Folders (Stitching A, Stitching B, Stitching D, Stitching F, etc.)
 */
export async function getStitchingFolders(): Promise<StitchingFoldersResponse> {
  const res = await fetch('/api/stitching/folders');
  if (!res.ok) throw new Error(`Failed to fetch stitching folders: HTTP ${res.status}`);
  return res.json();
}

/**
 * Save / Update a specific Stitching Folder's audit data (Audit Date, Date column header, rows, name)
 */
export async function saveStitchingFolder(
  folderId: string, 
  data: Partial<StitchingFolder>
): Promise<{ success: boolean; folder: StitchingFolder; folders: StitchingFolder[]; activeFolderId: string }> {
  const res = await fetch(`/api/stitching/folders/${encodeURIComponent(folderId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`Failed to save stitching folder: HTTP ${res.status}`);
  return res.json();
}

/**
 * Switch or update active folder
 */
export async function setActiveStitchingFolder(activeFolderId: string): Promise<StitchingFoldersResponse> {
  const res = await fetch('/api/stitching/folders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activeFolderId })
  });
  if (!res.ok) throw new Error(`Failed to set active stitching folder: HTTP ${res.status}`);
  return res.json();
}

/**
 * Create a new folder on Training Plan Stitching
 */
export async function createStitchingFolder(newFolder: { name: string; code?: string }): Promise<StitchingFoldersResponse> {
  const res = await fetch('/api/stitching/folders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newFolder })
  });
  if (!res.ok) throw new Error(`Failed to create stitching folder: HTTP ${res.status}`);
  return res.json();
}

/**
 * Delete a folder on Training Plan Stitching
 */
export async function deleteStitchingFolder(folderId: string): Promise<StitchingFoldersResponse> {
  const res = await fetch(`/api/stitching/folders/${encodeURIComponent(folderId)}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error(`Failed to delete stitching folder: HTTP ${res.status}`);
  return res.json();
}

/**
 * Save folder data received directly from Google Sheets API to the backend database
 */
export async function saveSyncedFolderToBackend(payload: {
  folderId: string;
  auditDate?: string;
  dateColumnHeader?: string;
  rows?: StitchingAuditRow[];
  sheetId?: string;
  sheetUrl?: string;
}): Promise<{ success: boolean; folder: StitchingFolder; folders: StitchingFolder[]; activeFolderId: string; lastSynced: string }> {
  const res = await fetch('/api/stitching/google-sheet/sync-from-sheet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`Failed to save synced folder to backend: HTTP ${res.status}`);
  return res.json();
}

/**
 * Fetch live tab from connected Google Sheet (read-only) via server-side proxy
 */
export async function fetchLiveGoogleSheetTab(params: {
  sheetId: string;
  tabName: string;
  folderId: string;
}): Promise<{
  success: boolean;
  requiresAuth?: boolean;
  folder?: StitchingFolder;
  auditDate?: string;
  dateColumnHeader?: string;
  rows?: StitchingAuditRow[];
  count?: number;
  message?: string;
  error?: string;
}> {
  const query = new URLSearchParams({
    sheetId: params.sheetId,
    tabName: params.tabName,
    folderId: params.folderId
  });
  const res = await fetch(`/api/stitching/google-sheet/read-live-tab?${query.toString()}`);
  return res.json();
}


