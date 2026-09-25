/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  X, 
  Search, 
  Download, 
  FileSpreadsheet, 
  Copy, 
  Check, 
  ArrowUpDown,
  Filter,
  Columns
} from 'lucide-react';
import { DataRecord } from '../../types';
import { validateCsvData, validateJsonData } from '../../services/fileStorage';

interface DataRecordTableViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: DataRecord | null;
  onEdit: (record: DataRecord) => void;
  addToast: (title: string, message: string, type: 'success' | 'warning' | 'info') => void;
}

export default function DataRecordTableViewerModal({
  isOpen,
  onClose,
  record,
  onEdit,
  addToast
}: DataRecordTableViewerModalProps) {
  if (!isOpen || !record) return null;

  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  // Parse table data
  const tableData = useMemo(() => {
    if (record.format === 'csv') {
      const parsed = validateCsvData(record.content);
      if (parsed.valid && parsed.headers && parsed.rows) {
        return {
          headers: parsed.headers,
          rows: parsed.rows
        };
      }
    } else if (record.format === 'json') {
      try {
        const parsed = JSON.parse(record.content);
        if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
          const headers = Object.keys(parsed[0]);
          const rows = parsed.map(item => headers.map(h => String(item[h] ?? '')));
          return { headers, rows };
        }
      } catch {}
    }
    return null;
  }, [record]);

  // Filter and Sort rows
  const filteredRows = useMemo(() => {
    if (!tableData) return [];
    let list = [...tableData.rows];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(row => row.some(cell => cell.toLowerCase().includes(q)));
    }

    if (sortCol !== null && sortCol < tableData.headers.length) {
      list.sort((a, b) => {
        const valA = a[sortCol] || '';
        const valB = b[sortCol] || '';
        const numA = parseFloat(valA);
        const numB = parseFloat(valB);
        if (!isNaN(numA) && !isNaN(numB)) {
          return sortAsc ? numA - numB : numB - numA;
        }
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    }

    return list;
  }, [tableData, searchTerm, sortCol, sortAsc]);

  const handleCopy = () => {
    navigator.clipboard.writeText(record.content);
    setCopied(true);
    addToast('Copied', 'Table data copied to clipboard.', 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    const ext = record.format === 'json' ? '.json' : record.format === 'csv' ? '.csv' : '.txt';
    const mime = record.format === 'json' ? 'application/json' : record.format === 'csv' ? 'text/csv' : 'text/plain';
    const blob = new Blob([record.content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${record.title.replace(/[^a-zA-Z0-9_-]/g, '_')}${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast('Download Started', `File "${link.download}" saved.`, 'success');
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 animate-fadeIn select-none font-sans">
      <div className="bg-[#091429] border border-[#162d59] rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="p-4 bg-[#060e1d] border-b border-[#122347] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0e2247] border border-blue-500/30 flex items-center justify-center text-amber-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-500/30">
                  {record.format.toUpperCase()} Tabular View
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {filteredRows.length} {filteredRows.length === 1 ? 'row' : 'rows'}
                </span>
              </div>
              <h3 className="text-sm font-bold text-white truncate">{record.title}</h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onEdit(record);
              }}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-blue-900/30"
            >
              Edit in Workspace
            </button>

            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0e2247] hover:bg-[#153166] text-blue-300 hover:text-white text-xs font-bold transition-all cursor-pointer border border-blue-500/30"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Download</span>
            </button>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#060e1d] hover:bg-[#122347] text-slate-200 text-xs font-bold transition-all cursor-pointer border border-[#122347]"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#122347] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-3 bg-[#071122] border-b border-[#122347] flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search table rows..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#040812] border border-[#122347] rounded-xl text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div className="text-[11px] font-mono text-slate-400">
            Click column headers to sort ascending / descending
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto p-4 bg-[#03060e]">
          {tableData ? (
            <div className="border border-[#122347] rounded-xl overflow-hidden shadow-md">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse font-sans">
                  <thead>
                    <tr className="bg-[#050b17] border-b border-[#122347] font-mono text-[10px] text-amber-400 uppercase tracking-wider">
                      <th className="p-3 w-12 text-center text-slate-500 border-r border-[#122347]">#</th>
                      {tableData.headers.map((head, idx) => (
                        <th
                          key={idx}
                          onClick={() => {
                            if (sortCol === idx) {
                              setSortAsc(!sortAsc);
                            } else {
                              setSortCol(idx);
                              setSortAsc(true);
                            }
                          }}
                          className="p-3 font-bold whitespace-nowrap cursor-pointer hover:bg-[#0e2247] transition-colors border-r border-[#122347] last:border-r-0"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{head}</span>
                            <ArrowUpDown className="w-3 h-3 text-slate-500 hover:text-amber-400" />
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#102040]">
                    {filteredRows.length > 0 ? (
                      filteredRows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-[#0c1a36]/60 transition-colors">
                          <td className="p-3 font-mono text-slate-500 text-center border-r border-[#122347]">{rIdx + 1}</td>
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="p-3 text-slate-200 whitespace-nowrap border-r border-[#122347] last:border-r-0">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={tableData.headers.length + 1} className="p-8 text-center text-slate-400 font-mono">
                          No matching records found for "{searchTerm}"
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-[#071122] rounded-xl border border-[#122347]">
              <pre className="font-mono text-xs text-amber-300 text-left whitespace-pre-wrap">
                {record.content}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#060e1d] border-t border-[#122347] flex items-center justify-between text-xs">
          <span className="text-[11px] font-mono text-slate-400">
            Category: <strong className="text-white">{record.category}</strong> • Size: <strong className="text-white">{record.size}</strong> • Permanent Retention Enabled
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#091429] hover:bg-[#122347] text-white font-bold rounded-xl cursor-pointer border border-[#122347] transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
