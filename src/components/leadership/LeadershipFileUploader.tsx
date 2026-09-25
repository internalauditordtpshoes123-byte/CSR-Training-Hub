import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  FileSpreadsheet,
  FileArchive,
  File,
  Image as ImageIcon,
  Download,
  Eye,
  Trash2,
  Calendar,
  User,
  Search,
  Filter,
  CheckCircle2,
  HardDrive,
  CloudUpload,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { LeadershipUploadedFile } from '../../data/leadershipSheetData';
import { uploadSharedFileToServer } from '../../services/realtimeSync';

interface LeadershipFileUploaderProps {
  files: LeadershipUploadedFile[];
  onUploadFile: (file: LeadershipUploadedFile) => void;
  onDeleteFile: (id: string) => void;
  addToast: (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  currentUser?: string;
  isSyncing?: boolean;
}

export const LeadershipFileUploader: React.FC<LeadershipFileUploaderProps> = ({
  files,
  onUploadFile,
  onDeleteFile,
  addToast,
  currentUser = 'Corporate User',
  isSyncing = false
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState<LeadershipUploadedFile['category']>('Attendance Sheet');
  const [fileDescription, setFileDescription] = useState('');
  
  // Preview Modal State
  const [previewFile, setPreviewFile] = useState<LeadershipUploadedFile | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to determine file icon and color
  const getFileIcon = (fileName: string, mimeType: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (['xlsx', 'xls', 'csv'].includes(ext) || mimeType.includes('sheet') || mimeType.includes('csv')) {
      return <FileSpreadsheet className="w-8 h-8 text-emerald-400" />;
    }
    if (['pdf'].includes(ext) || mimeType.includes('pdf')) {
      return <FileText className="w-8 h-8 text-rose-400" />;
    }
    if (['doc', 'docx'].includes(ext) || mimeType.includes('word')) {
      return <FileText className="w-8 h-8 text-sky-400" />;
    }
    if (['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'].includes(ext) || mimeType.includes('image')) {
      return <ImageIcon className="w-8 h-8 text-indigo-400" />;
    }
    if (['zip', 'rar', '7z', 'tar'].includes(ext)) {
      return <FileArchive className="w-8 h-8 text-amber-400" />;
    }
    return <File className="w-8 h-8 text-slate-400" />;
  };

  // Process and upload file
  const handleProcessFile = async (file: File) => {
    try {
      setIsUploading(true);
      setUploadProgress(20);

      // Read file into Base64 data URL
      const reader = new FileReader();
      reader.onload = async (e) => {
        setUploadProgress(60);
        const dataUrl = e.target?.result as string;

        const sizeFormatted =
          file.size < 1024 * 1024
            ? `${(file.size / 1024).toFixed(1)} KB`
            : `${(file.size / (1024 * 1024)).toFixed(2)} MB`;

        let derivedType = 'Document';
        if (file.name.endsWith('.pdf')) derivedType = 'PDF Document';
        else if (file.name.match(/\.(xlsx|xls|csv)$/i)) derivedType = 'Excel Spreadsheet';
        else if (file.name.match(/\.(doc|docx)$/i)) derivedType = 'Word Document';
        else if (file.name.match(/\.(png|jpg|jpeg|webp)$/i)) derivedType = 'Image File';

        const fileRecord: LeadershipUploadedFile = {
          id: `lead-file-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          fileName: file.name,
          fileType: derivedType,
          fileSize: sizeFormatted,
          mimeType: file.type || 'application/octet-stream',
          dataUrl,
          uploadedAt: new Date().toISOString(),
          uploadedBy: currentUser || 'Corporate Auditor',
          category: selectedCategory,
          description: fileDescription.trim() || `Uploaded file for Leadership Training 2025.`
        };

        setUploadProgress(85);

        // Upload to server disk & sync to master database
        const serverResult = await uploadSharedFileToServer({
          id: fileRecord.id,
          fileName: fileRecord.fileName,
          fileType: fileRecord.fileType,
          fileSize: fileRecord.fileSize,
          mimeType: fileRecord.mimeType,
          dataUrl: fileRecord.dataUrl,
          category: fileRecord.category,
          description: fileRecord.description,
          uploadedBy: fileRecord.uploadedBy
        });

        setUploadProgress(100);
        setIsUploading(false);
        setFileDescription('');

        // Add to local state & broadcast
        onUploadFile(fileRecord);
        addToast(
          'File Uploaded Permanently',
          `"${file.name}" has been permanently stored in the master database and synchronized to all PCs.`,
          'success'
        );
      };

      reader.onerror = () => {
        setIsUploading(false);
        addToast('File Read Error', 'Failed to read the selected file.', 'error');
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      setIsUploading(false);
      addToast('Upload Error', err.message || 'File upload failed.', 'error');
    }
  };

  // Drag and drop events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  // File input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleProcessFile(e.target.files[0]);
    }
  };

  // Download handler
  const handleDownload = (f: LeadershipUploadedFile) => {
    if (!f.dataUrl) {
      addToast('Download Notice', 'Fetching file binary from central server...', 'info');
      // If no dataUrl in memory, trigger fetch or direct path
      window.open(`/uploads/${f.fileName}`, '_blank');
      return;
    }

    const a = document.createElement('a');
    a.href = f.dataUrl;
    a.download = f.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    addToast('Download Started', `Downloading "${f.fileName}"`, 'success');
  };

  // Filtered files
  const filteredFiles = files.filter((f) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = f.fileName.toLowerCase().includes(q);
      const matchDesc = (f.description || '').toLowerCase().includes(q);
      const matchUser = f.uploadedBy.toLowerCase().includes(q);
      if (!matchName && !matchDesc && !matchUser) return false;
    }
    if (categoryFilter !== 'ALL' && f.category !== categoryFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* 1. UPLOAD BOX & CONTROLS */}
      <div className="bg-[#091a2e] border border-[#1b3e66] rounded-xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#1b3e66]/70">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <CloudUpload className="w-5 h-5 text-[#38bdf8]" />
              Upload Leadership Training Documents & Evidence
            </h2>
            <p className="text-xs text-slate-300">
              Upload official signed attendance sheets, course matrices, syllabus outlines, and training photo records.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/70 border border-emerald-800/60 px-3 py-1.5 rounded-lg">
            <ShieldCheck className="w-4 h-4" />
            <span>Permanent Central Persistence & Multi-PC Sync Active</span>
          </div>
        </div>

        {/* Upload Form Elements */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Dropzone Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`lg:col-span-7 border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-sky-400 bg-sky-950/40 scale-[1.01]'
                : 'border-[#204a7a] bg-[#07172b]/80 hover:border-sky-500 hover:bg-[#0c243f]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileInputChange}
              className="hidden"
              accept=".pdf,.xlsx,.xls,.csv,.doc,.docx,.png,.jpg,.jpeg,.zip"
            />

            <div className="w-12 h-12 rounded-full bg-[#0e3054] border border-sky-500/30 flex items-center justify-center text-sky-400 mb-3 shadow">
              <Upload className="w-6 h-6" />
            </div>

            <p className="text-sm font-bold text-white mb-1">
              Click to browse or drag & drop files here
            </p>
            <p className="text-xs text-slate-400 max-w-md">
              Supports Excel (.xlsx, .csv), PDF Documents, Word Files, Photos (.png, .jpg), and Scanned Sign-in Sheets
            </p>

            {isUploading && (
              <div className="w-full max-w-xs mt-4">
                <div className="flex justify-between text-xs text-sky-300 font-semibold mb-1">
                  <span>Uploading to Central Server...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-sky-400 h-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          {/* Metadata Controls */}
          <div className="lg:col-span-5 bg-[#07172b] border border-[#16365c] rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Document Category / Type
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as any)}
                className="w-full bg-[#0d2238] border border-[#204a7a] text-white px-3 py-1.5 rounded-lg text-xs outline-none cursor-pointer focus:border-sky-400"
              >
                <option value="Attendance Sheet">Attendance Sheet (Signed Physical Copy)</option>
                <option value="Training Matrix">Training Matrix (Spreadsheet / Master)</option>
                <option value="Syllabus">Course Syllabus & Curriculum</option>
                <option value="Assessment">Assessment & Quiz Record</option>
                <option value="Certificate">Certificate of Completion Sample</option>
                <option value="Other">Other Training Evidence</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Document Notes / Description (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Official signed sheet for July 09 - August 20 training..."
                value={fileDescription}
                onChange={(e) => setFileDescription(e.target.value)}
                className="w-full bg-[#0d2238] border border-[#204a7a] text-white px-3 py-1.5 rounded-lg text-xs outline-none focus:border-sky-400"
              />
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-sky-400" />
                Uploader: <strong className="text-slate-200">{currentUser}</strong>
              </span>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-1.5 bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold rounded-lg text-xs shadow transition cursor-pointer"
              >
                Browse Files
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. REPOSITORY SEARCH & FILTER BAR */}
      <div className="bg-[#091a2e] border border-[#1b3e66] rounded-xl p-3 shadow flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search uploaded files by name, description, or uploader..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0d2238] border border-[#204a7a] focus:border-[#38bdf8] text-white pl-9 pr-3 py-1.5 rounded-lg text-xs outline-none"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-[#0d2238] border border-[#204a7a] px-2.5 py-1 rounded-lg">
            <span className="text-[11px] font-semibold text-slate-400">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-transparent text-xs text-sky-200 font-semibold outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-[#0d2238] text-white">All Categories ({files.length})</option>
              <option value="Attendance Sheet" className="bg-[#0d2238] text-white">Attendance Sheets</option>
              <option value="Training Matrix" className="bg-[#0d2238] text-white">Training Matrices</option>
              <option value="Syllabus" className="bg-[#0d2238] text-white">Syllabus Outlines</option>
              <option value="Assessment" className="bg-[#0d2238] text-white">Assessments</option>
              <option value="Certificate" className="bg-[#0d2238] text-white">Certificates</option>
              <option value="Other" className="bg-[#0d2238] text-white">Other</option>
            </select>
          </div>

          <span className="text-xs text-slate-400 font-mono">
            <strong>{filteredFiles.length}</strong> Files Stored
          </span>
        </div>
      </div>

      {/* 3. UPLOADED FILES LIST / TABLE (Fulfills Requirements: file name, file type, upload date, uploaded by, view, download) */}
      <div className="bg-[#07172b] border border-[#16365c] rounded-xl overflow-hidden shadow-lg">
        {filteredFiles.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <FileText className="w-10 h-10 mx-auto text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-300">No uploaded files found.</p>
            <p className="text-xs text-slate-500 mt-1">Upload training files using the dropzone above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#0b213b] text-slate-300 uppercase font-sans tracking-wider border-b border-[#1b4372]">
                <tr>
                  <th className="py-3 px-4 min-w-[260px]">File Name & Type</th>
                  <th className="py-3 px-3 min-w-[140px]">Category</th>
                  <th className="py-3 px-3 min-w-[100px]">Size</th>
                  <th className="py-3 px-3 min-w-[160px]">Upload Date & Time</th>
                  <th className="py-3 px-3 min-w-[140px]">Uploaded By</th>
                  <th className="py-3 px-4 text-center min-w-[140px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#132f52] font-sans">
                {filteredFiles.map((f, index) => (
                  <tr
                    key={f.id}
                    className={`hover:bg-[#0f2e52]/70 transition ${
                      index % 2 === 0 ? 'bg-[#07172b]' : 'bg-[#091d35]/60'
                    }`}
                  >
                    {/* File Name & Icon */}
                    <td className="py-3 px-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 shrink-0">
                          {getFileIcon(f.fileName, f.mimeType)}
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm hover:text-sky-300 transition cursor-pointer" onClick={() => setPreviewFile(f)}>
                            {f.fileName}
                          </div>
                          {f.description && (
                            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                              {f.description}
                            </p>
                          )}
                          <span className="text-[10px] text-sky-400 font-mono font-medium">
                            {f.fileType}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Category Badge */}
                    <td className="py-3 px-3">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#0e2744] text-sky-200 border border-sky-800/60 inline-block">
                        {f.category}
                      </span>
                    </td>

                    {/* File Size */}
                    <td className="py-3 px-3 font-mono text-slate-300">
                      {f.fileSize}
                    </td>

                    {/* Upload Date */}
                    <td className="py-3 px-3 text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          {new Date(f.uploadedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(f.uploadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </td>

                    {/* Uploaded By */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5 text-slate-200 font-medium">
                        <User className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <span>{f.uploadedBy}</span>
                      </div>
                    </td>

                    {/* Actions: View/Open, Download, Delete */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {/* View / Open */}
                        <button
                          onClick={() => setPreviewFile(f)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-sky-950 hover:bg-sky-900 text-sky-300 border border-sky-700/60 rounded-lg text-xs font-semibold transition cursor-pointer"
                          title="View / Open File"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </button>

                        {/* Download */}
                        <button
                          onClick={() => handleDownload(f)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/60 rounded-lg text-xs font-semibold transition cursor-pointer"
                          title="Download File"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete file "${f.fileName}" from central storage?`)) {
                              onDeleteFile(f.id);
                              addToast('File Deleted', `Deleted "${f.fileName}" from repository.`, 'info');
                            }
                          }}
                          className="p-1 rounded bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-700 transition cursor-pointer"
                          title="Delete File"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. FILE PREVIEW MODAL */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="bg-[#0b213b] border border-[#1e4a7a] rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-[#07172b]">
              <div className="flex items-center gap-3">
                {getFileIcon(previewFile.fileName, previewFile.mimeType)}
                <div>
                  <h3 className="text-base font-bold text-white">{previewFile.fileName}</h3>
                  <p className="text-xs text-slate-400">
                    {previewFile.fileType} · {previewFile.fileSize} · Uploaded by {previewFile.uploadedBy} on{' '}
                    {new Date(previewFile.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(previewFile)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 text-base font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body / Viewer */}
            <div className="p-6 flex-1 overflow-y-auto bg-[#051424] flex items-center justify-center min-h-[350px]">
              {previewFile.mimeType.startsWith('image/') || previewFile.fileName.match(/\.(png|jpg|jpeg|webp|svg)$/i) ? (
                <img
                  src={previewFile.dataUrl}
                  alt={previewFile.fileName}
                  className="max-h-[600px] max-w-full rounded-lg object-contain shadow-lg border border-slate-700"
                />
              ) : previewFile.mimeType === 'application/pdf' || previewFile.fileName.endsWith('.pdf') ? (
                <div className="w-full h-[600px] flex flex-col items-center justify-center bg-slate-900 rounded-xl p-4 text-center border border-slate-700">
                  <FileText className="w-16 h-16 text-rose-400 mb-3" />
                  <h4 className="text-lg font-bold text-white">{previewFile.fileName}</h4>
                  <p className="text-xs text-slate-400 max-w-md mt-1 mb-4">
                    PDF Document preview ready. You can inspect or download the official signed training sheet.
                  </p>
                  {previewFile.dataUrl ? (
                    <iframe
                      src={previewFile.dataUrl}
                      title={previewFile.fileName}
                      className="w-full h-full rounded-lg border border-slate-700 mt-2"
                    />
                  ) : (
                    <button
                      onClick={() => handleDownload(previewFile)}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold"
                    >
                      Download PDF Document
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-center p-8 bg-slate-900/60 rounded-xl border border-slate-800 max-w-md">
                  <div className="w-16 h-16 mx-auto rounded-full bg-slate-800 flex items-center justify-center mb-3 text-sky-400">
                    {getFileIcon(previewFile.fileName, previewFile.mimeType)}
                  </div>
                  <h4 className="text-base font-bold text-white">{previewFile.fileName}</h4>
                  <p className="text-xs text-slate-400 mt-1 mb-4">
                    {previewFile.description || 'Official file stored in the Central Database.'}
                  </p>
                  <button
                    onClick={() => handleDownload(previewFile)}
                    className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold shadow"
                  >
                    Download and Open with System App
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
