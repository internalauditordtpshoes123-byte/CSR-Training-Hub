/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StitchingAuditRow, StitchingFolder } from '../types';
import { getGoogleAccessToken } from './googleSheetsAuth';

export interface GoogleSpreadsheetMetadata {
  spreadsheetId: string;
  title: string;
  sheets: Array<{
    sheetId: number;
    title: string;
    index: number;
  }>;
}

export interface ParseSheetResult {
  auditDate: string;
  dateColumnHeader: string;
  rows: StitchingAuditRow[];
  rawValues?: any[][];
}

/**
 * Extracts the 44-character Google Sheet ID from full URL or returns raw ID
 */
export function extractSpreadsheetId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

/**
 * Fetch spreadsheet metadata including sheet tabs
 */
export async function getSpreadsheetDetails(
  spreadsheetId: string,
  token?: string | null
): Promise<GoogleSpreadsheetMetadata> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const accessToken = token || (await getGoogleAccessToken());

  if (!accessToken) {
    throw new Error('Google authentication required. Please sign in with Google to access the Sheets API.');
  }

  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${cleanId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const message = errData.error?.message || `HTTP ${res.status}: ${res.statusText}`;
    throw new Error(`Google Sheets API error: ${message}`);
  }

  const data = await res.json();
  return {
    spreadsheetId: data.spreadsheetId,
    title: data.properties?.title || 'Untitled Spreadsheet',
    sheets: (data.sheets || []).map((s: any) => ({
      sheetId: s.properties?.sheetId,
      title: s.properties?.title,
      index: s.properties?.index
    }))
  };
}

/**
 * Read range values from a Google Sheet
 */
export async function readSheetValues(
  spreadsheetId: string,
  range: string,
  token?: string | null
): Promise<any[][]> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const accessToken = token || (await getGoogleAccessToken());

  if (!accessToken) {
    throw new Error('Google authentication required. Please sign in with Google to read from Google Sheets.');
  }

  const encodedRange = encodeURIComponent(range);
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodedRange}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const message = errData.error?.message || `HTTP ${res.status}: ${res.statusText}`;
    throw new Error(`Failed to read from Google Sheet: ${message}`);
  }

  const data = await res.json();
  return data.values || [];
}

/**
 * Parse raw Google Sheet matrix into structured Training Plan data
 * Handles exact structure provided:
 * Row 4: Column F "Audit Date: September 24, 2026"
 * Row 5: Column B "Line No.", Column C "Name", Column D "(09/21~26/26)", Column E "STYLE", Column F "FINDINGS"
 * Rows 6+: "A1", "A2", ...
 */
export function parseSheetMatrixToTrainingPlan(matrix: any[][]): ParseSheetResult {
  let auditDate = 'Audit Date: September 24, 2026';
  let dateColumnHeader = '(09/21~26/26)';
  const rows: StitchingAuditRow[] = [];

  if (!matrix || !Array.isArray(matrix) || matrix.length === 0) {
    return { auditDate, dateColumnHeader, rows };
  }

  let headerRowIndex = -1;
  let lineNoCol = -1;
  let nameCol = -1;
  let dateCol = -1;
  let styleCol = -1;
  let findingsCol = -1;

  // 1. Scan for Audit Date in the first 10 rows
  for (let r = 0; r < Math.min(matrix.length, 10); r++) {
    const row = matrix[r] || [];
    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c] || '').trim();
      if (cell.toLowerCase().includes('audit date')) {
        auditDate = cell;
      }
    }
  }

  // 2. Scan for Header row with "Line No." or "Line"
  for (let r = 0; r < Math.min(matrix.length, 12); r++) {
    const row = matrix[r] || [];
    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c] || '').trim().toLowerCase();
      if (cell === 'line no.' || cell === 'line no' || cell === 'line') {
        headerRowIndex = r;
        lineNoCol = c;
        break;
      }
    }
    if (headerRowIndex !== -1) break;
  }

  if (headerRowIndex !== -1) {
    const headerRow = matrix[headerRowIndex] || [];
    for (let c = 0; c < headerRow.length; c++) {
      const val = String(headerRow[c] || '').trim();
      const lower = val.toLowerCase();
      if (c === lineNoCol) continue;
      if (lower === 'name' || lower.includes('operator')) {
        nameCol = c;
      } else if (lower.includes('style')) {
        styleCol = c;
      } else if (lower.includes('finding') || lower.includes('remark') || lower.includes('result')) {
        findingsCol = c;
      } else if (val.includes('/') || lower.includes('date') || val.startsWith('(')) {
        dateCol = c;
        dateColumnHeader = val;
      }
    }

    // Fallbacks if columns were not recognized by name
    if (nameCol === -1 && lineNoCol + 1 < headerRow.length) nameCol = lineNoCol + 1;
    if (dateCol === -1 && lineNoCol + 2 < headerRow.length) dateCol = lineNoCol + 2;
    if (styleCol === -1 && lineNoCol + 3 < headerRow.length) styleCol = lineNoCol + 3;
    if (findingsCol === -1 && lineNoCol + 4 < headerRow.length) findingsCol = lineNoCol + 4;

    // 3. Parse Data Rows starting after headerRowIndex
    for (let r = headerRowIndex + 1; r < matrix.length; r++) {
      const row = matrix[r] || [];
      const lineNo = lineNoCol !== -1 && row[lineNoCol] !== undefined ? String(row[lineNoCol]).trim() : '';
      const name = nameCol !== -1 && row[nameCol] !== undefined ? String(row[nameCol]) : '';
      const date = dateCol !== -1 && row[dateCol] !== undefined ? String(row[dateCol]) : '';
      const style = styleCol !== -1 && row[styleCol] !== undefined ? String(row[styleCol]) : '';
      const findings = findingsCol !== -1 && row[findingsCol] !== undefined ? String(row[findingsCol]) : '';

      // Preserve all rows from the sheet
      rows.push({
        id: `row-${r}-${lineNo || Math.random().toString(36).substr(2, 4)}`,
        lineNo: lineNo || (r <= headerRowIndex + 22 ? `A${r - headerRowIndex}` : ''),
        name,
        date,
        style,
        findings
      });
    }
  } else {
    // If no standard header was found, attempt positional reading
    for (let r = 0; r < matrix.length; r++) {
      const row = matrix[r] || [];
      if (row.length >= 2) {
        const lineNo = String(row[1] || row[0] || '').trim();
        if (lineNo.startsWith('A') || lineNo.startsWith('B') || lineNo.startsWith('D') || lineNo.startsWith('F')) {
          rows.push({
            id: `row-${r}`,
            lineNo,
            name: String(row[2] || row[1] || '').trim(),
            date: String(row[3] || row[2] || '').trim(),
            style: String(row[4] || row[3] || '').trim(),
            findings: String(row[5] || row[4] || '').trim()
          });
        }
      }
    }
  }

  // Ensure standard A1-A22 lines are present if empty
  if (rows.length === 0) {
    for (let i = 1; i <= 22; i++) {
      rows.push({
        id: `row-A${i}`,
        lineNo: `A${i}`,
        name: '',
        date: '',
        style: '',
        findings: ''
      });
    }
  }

  return {
    auditDate,
    dateColumnHeader,
    rows,
    rawValues: matrix
  };
}

/**
 * Write/Update a full range in Google Sheet
 */
export async function writeSheetValues(
  spreadsheetId: string,
  range: string,
  values: any[][],
  token?: string | null
): Promise<any> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const accessToken = token || (await getGoogleAccessToken());

  if (!accessToken) {
    throw new Error('Google authentication required. Please sign in with Google to update the Google Sheet.');
  }

  const encodedRange = encodeURIComponent(range);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodedRange}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        range,
        majorDimension: 'ROWS',
        values
      })
    }
  );

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const message = errData.error?.message || `HTTP ${res.status}: ${res.statusText}`;
    throw new Error(`Failed to write to Google Sheet: ${message}`);
  }

  return res.json();
}

/**
 * Update a single row in Google Sheets
 */
export async function updateSheetRow(
  spreadsheetId: string,
  sheetTab: string,
  rowIndex1Based: number,
  row: StitchingAuditRow,
  token?: string | null
): Promise<any> {
  const range = `'${sheetTab}'!A${rowIndex1Based}:F${rowIndex1Based}`;
  const values = [
    ['', row.lineNo || '', row.name || '', row.date || '', row.style || '', row.findings || '']
  ];
  return writeSheetValues(spreadsheetId, range, values, token);
}

/**
 * Append a new row to Google Sheets
 */
export async function appendSheetRow(
  spreadsheetId: string,
  sheetTab: string,
  row: StitchingAuditRow,
  token?: string | null
): Promise<any> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const accessToken = token || (await getGoogleAccessToken());

  if (!accessToken) {
    throw new Error('Google authentication required. Please sign in with Google.');
  }

  const range = `'${sheetTab}'!A:F`;
  const encodedRange = encodeURIComponent(range);
  const values = [
    ['', row.lineNo || '', row.name || '', row.date || '', row.style || '', row.findings || '']
  ];

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodedRange}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        range,
        majorDimension: 'ROWS',
        values
      })
    }
  );

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const message = errData.error?.message || `HTTP ${res.status}: ${res.statusText}`;
    throw new Error(`Failed to append row to Google Sheet: ${message}`);
  }

  return res.json();
}

/**
 * Convert an entire StitchingFolder to the exact 2D matrix matching the user's template
 */
export function buildFolderMatrix(folder: StitchingFolder): any[][] {
  const matrix: any[][] = [];

  // Rows 1-3: Blank padding
  matrix.push(['', '', '', '', '', '']);
  matrix.push(['', '', '', '', '', '']);
  matrix.push(['', '', '', '', '', '']);

  // Row 4: Audit Date in Column F
  matrix.push(['', '', '', '', '', folder.auditDate || 'Audit Date: September 24, 2026']);

  // Row 5: Column headers
  matrix.push([
    '',
    'Line No.',
    'Name',
    folder.dateColumnHeader || '(09/21~26/26)',
    'STYLE',
    'FINDINGS'
  ]);

  // Rows 6+: Data rows
  const rows = folder.rows && folder.rows.length > 0 ? folder.rows : generateDefault22Rows();
  for (const r of rows) {
    matrix.push([
      '',
      r.lineNo || '',
      r.name || '',
      r.date || '',
      r.style || '',
      r.findings || ''
    ]);
  }

  return matrix;
}

/**
 * Generate standard default A1 through A22 rows
 */
export function generateDefault22Rows(): StitchingAuditRow[] {
  const result: StitchingAuditRow[] = [];
  for (let i = 1; i <= 22; i++) {
    result.push({
      id: `row-A${i}`,
      lineNo: `A${i}`,
      name: '',
      date: '',
      style: '',
      findings: ''
    });
  }
  return result;
}

/**
 * Push an entire folder's data into the Google Sheet tab
 */
export async function syncFolderToGoogleSheet(
  spreadsheetId: string,
  sheetTab: string,
  folder: StitchingFolder,
  token?: string | null
): Promise<any> {
  const matrix = buildFolderMatrix(folder);
  const range = `'${sheetTab}'!A1:F${matrix.length}`;
  return writeSheetValues(spreadsheetId, range, matrix, token);
}

/**
 * Create a brand new Google Sheet in the user's Google Drive populated with
 * tabs Stitching A, Stitching B, Stitching D, Stitching F pre-filled with the exact template.
 */
export async function createNewTrainingPlanSpreadsheet(
  title: string = 'DATIAN CSR HUB - Training Plan (Stitching)',
  token?: string | null
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const accessToken = token || (await getGoogleAccessToken());

  if (!accessToken) {
    throw new Error('Google authentication required. Please sign in with Google to create a Google Sheet.');
  }

  // 1. Create spreadsheet with sheets Stitching A, Stitching B, Stitching D, Stitching F
  const tabs = ['Stitching A', 'Stitching B', 'Stitching D', 'Stitching F'];
  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        title
      },
      sheets: tabs.map(tabName => ({
        properties: {
          title: tabName,
          gridProperties: {
            rowCount: 40,
            columnCount: 10
          }
        }
      }))
    })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const message = errData.error?.message || `HTTP ${res.status}: ${res.statusText}`;
    throw new Error(`Failed to create Google Sheet: ${message}`);
  }

  const created = await res.json();
  const spreadsheetId = created.spreadsheetId;
  const spreadsheetUrl = created.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // 2. Populate each tab with the default template (Rows A1 to A22, Audit Date, headers)
  try {
    for (const tabName of tabs) {
      const dummyFolder: StitchingFolder = {
        id: tabName.toLowerCase().replace(/\s+/g, '-'),
        name: tabName,
        auditDate: 'Audit Date: September 24, 2026',
        dateColumnHeader: '(09/21~26/26)',
        rows: generateDefault22Rows()
      };
      await syncFolderToGoogleSheet(spreadsheetId, tabName, dummyFolder, accessToken);
    }
  } catch (seedErr) {
    console.warn('[Google Sheets] Seeded initial template warning:', seedErr);
  }

  return {
    spreadsheetId,
    spreadsheetUrl
  };
}
