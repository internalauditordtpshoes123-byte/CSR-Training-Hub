/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Enterprise IndexedDB + Storage Engine for DATIAN CSR HUB
 * Persists large files (PDF, Images, Excel, Word, PPTX, CSV, TXT, ZIP, Audio, Video)
 * and large datasets (Anti-Bribery workbooks, document metadata, audit logs)
 * ensuring data never disappears on page refresh, browser reload, or desktop app restart.
 */

const DB_NAME = 'datian_csr_hub_files_db';
const DB_VERSION = 2;
const STORE_FILES = 'stored_files';
const STORE_WORKBOOKS = 'stored_workbooks';
const STORE_DATASETS = 'stored_datasets';

export interface StoredFileRecord {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: string;
  mimeType: string;
  dataUrl: string; // Base64 data url or blob string
  uploadedAt: string;
  folderId?: string;
  category?: string;
  description?: string;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        console.warn('IndexedDB not supported in current environment');
        return reject(new Error('IndexedDB not supported'));
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(STORE_FILES)) {
          const store = db.createObjectStore(STORE_FILES, { keyPath: 'id' });
          store.createIndex('folderId', 'folderId', { unique: false });
          store.createIndex('fileName', 'fileName', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORE_WORKBOOKS)) {
          db.createObjectStore(STORE_WORKBOOKS, { keyPath: 'key' });
        }

        if (!db.objectStoreNames.contains(STORE_DATASETS)) {
          db.createObjectStore(STORE_DATASETS, { keyPath: 'key' });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('Failed opening IndexedDB:', request.error);
        reject(request.error);
      };
    });
  }
  return dbPromise;
}

/**
 * Save file binary / dataUrl to IndexedDB
 */
export async function saveFileToIndexedDB(fileRecord: StoredFileRecord): Promise<boolean> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_FILES], 'readwrite');
      const store = transaction.objectStore(STORE_FILES);
      const request = store.put(fileRecord);

      request.onsuccess = () => resolve(true);
      request.onerror = (e) => {
        console.error('Error saving file to IndexedDB:', e);
        resolve(false);
      };
    });
  } catch (error) {
    console.warn('IndexedDB save fallback error:', error);
    return false;
  }
}

/**
 * Retrieve file by ID from IndexedDB
 */
export async function getFileFromIndexedDB(id: string): Promise<StoredFileRecord | null> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_FILES], 'readonly');
      const store = transaction.objectStore(STORE_FILES);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => {
        resolve(null);
      };
    });
  } catch (error) {
    console.warn('IndexedDB get fallback error:', error);
    return null;
  }
}

/**
 * Retrieve all files from IndexedDB
 */
export async function getAllFilesFromIndexedDB(): Promise<StoredFileRecord[]> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_FILES], 'readonly');
      const store = transaction.objectStore(STORE_FILES);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

/**
 * Delete file by ID from IndexedDB
 */
export async function deleteFileFromIndexedDB(id: string): Promise<boolean> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_FILES], 'readwrite');
      const store = transaction.objectStore(STORE_FILES);
      const request = store.delete(id);

      request.onsuccess = () => resolve(true);
      request.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

/**
 * Save large complex datasets or workbooks to IndexedDB
 */
export async function saveDatasetToIndexedDB<T>(key: string, data: T): Promise<boolean> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_WORKBOOKS], 'readwrite');
      const store = transaction.objectStore(STORE_WORKBOOKS);
      const request = store.put({ key, data, updatedAt: new Date().toISOString() });

      request.onsuccess = () => resolve(true);
      request.onerror = () => resolve(false);
    });
  } catch (e) {
    console.warn('saveDatasetToIndexedDB error:', e);
    // Fallback to local storage
    try {
      localStorage.setItem(`csr_ds_${key}`, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Retrieve large complex dataset or workbook from IndexedDB
 */
export async function getDatasetFromIndexedDB<T>(key: string): Promise<T | null> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_WORKBOOKS], 'readonly');
      const store = transaction.objectStore(STORE_WORKBOOKS);
      const request = store.get(key);

      request.onsuccess = () => {
        if (request.result && request.result.data) {
          resolve(request.result.data as T);
        } else {
          // Check localStorage fallback
          try {
            const ls = localStorage.getItem(`csr_ds_${key}`);
            resolve(ls ? JSON.parse(ls) : null);
          } catch {
            resolve(null);
          }
        }
      };
      request.onerror = () => {
        try {
          const ls = localStorage.getItem(`csr_ds_${key}`);
          resolve(ls ? JSON.parse(ls) : null);
        } catch {
          resolve(null);
        }
      };
    });
  } catch {
    try {
      const ls = localStorage.getItem(`csr_ds_${key}`);
      return ls ? JSON.parse(ls) : null;
    } catch {
      return null;
    }
  }
}

/**
 * Format bytes to readable size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Read File object to Base64 Data URL
 */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Helper to trigger immediate browser download of any file with proper MIME type
 */
export function triggerFileDownload(dataUrl: string, fileName: string) {
  try {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (e) {
    console.error('Download error:', e);
    // Fallback direct window navigation if needed
    window.open(dataUrl, '_blank');
  }
}

/**
 * Validate JSON text with exact error location extraction
 */
export function validateJsonData(text: string): { valid: boolean; error?: string; line?: number; parsed?: any } {
  if (!text || !text.trim()) {
    return { valid: false, error: 'Content is empty' };
  }
  try {
    const parsed = JSON.parse(text);
    return { valid: true, parsed };
  } catch (err: any) {
    const errorMsg = err.message || 'Invalid JSON syntax';
    // Extract position if available
    let line: number | undefined;
    const posMatch = errorMsg.match(/position\s+(\d+)/i) || errorMsg.match(/line\s+(\d+)/i);
    if (posMatch && posMatch[1]) {
      const pos = parseInt(posMatch[1], 10);
      line = text.substring(0, pos).split('\n').length;
    }
    return { valid: false, error: errorMsg, line };
  }
}

/**
 * Validate and parse CSV / TSV text
 */
export function validateCsvData(text: string): { valid: boolean; error?: string; headers?: string[]; rowCount?: number; rows?: string[][] } {
  if (!text || !text.trim()) {
    return { valid: false, error: 'CSV content is empty' };
  }

  const lines = text.trim().split('\n').filter(l => l.trim().length > 0);
  if (lines.length === 0) {
    return { valid: false, error: 'CSV contains no rows' };
  }

  // Detect delimiter (, or \t or ;)
  const firstLine = lines[0];
  let delimiter = ',';
  if (firstLine.includes('\t')) delimiter = '\t';
  else if (firstLine.includes(';') && !firstLine.includes(',')) delimiter = ';';

  const rows = lines.map(line => {
    const row: string[] = [];
    let inQuotes = false;
    let curr = '';
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if (c === delimiter && !inQuotes) {
        row.push(curr.trim());
        curr = '';
      } else {
        curr += c;
      }
    }
    row.push(curr.trim());
    return row;
  });

  const headers = rows[0];
  if (headers.length === 0 || (headers.length === 1 && !headers[0])) {
    return { valid: false, error: 'Invalid CSV: No column headers detected' };
  }

  const dataRows = rows.slice(1);
  return {
    valid: true,
    headers,
    rowCount: dataRows.length,
    rows: dataRows
  };
}
