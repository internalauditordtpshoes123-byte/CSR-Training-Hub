/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ExternalLink, 
  RefreshCw, 
  Copy, 
  Check, 
  Shield, 
  Maximize2, 
  Minimize2, 
  AlertCircle,
  FileCheck,
  FolderOpen
} from 'lucide-react';

interface StitchingCanvaAuditViewProps {
  addToast: (title: string, message: string, type: 'success' | 'warning' | 'info') => void;
}

const CANVA_SITE_URL = 'https://proposal-form-and-evaluation-form.my.canva.site/copy-of-audit-file-site';

export default function StitchingCanvaAuditView({ addToast }: StitchingCanvaAuditViewProps) {
  const [copied, setCopied] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  const handleOpenCanva = () => {
    window.open(CANVA_SITE_URL, '_blank', 'noopener,noreferrer');
    addToast('Opening Canva Site', 'Launching Proposal & Evaluation Audit File site in a new tab.', 'info');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(CANVA_SITE_URL);
    setCopied(true);
    addToast('Link Copied', 'Canva site link copied to clipboard.', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleReload = () => {
    setIframeLoaded(false);
    setIframeKey(prev => prev + 1);
    addToast('Reloading', 'Reloading embedded Canva audit document...', 'info');
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Top Banner & Action Header */}
      <div className="bg-gradient-to-r from-[#0c1c38] via-[#0f274e] to-[#0a1832] rounded-2xl border border-blue-900/40 p-5 text-white shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-400 shadow-sm">
                <FolderOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                  Proposal Form and Evaluation Form — Audit File Site
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                    Canva Integrated
                  </span>
                </h3>
                <p className="text-xs text-slate-300">
                  Directly accessible within the Stitching Training Plan. Review audit proposal documentation, evaluation forms, and verification standards.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1 font-mono text-[11px] text-slate-400">
              <span className="text-slate-400">Target URL:</span>
              <code className="bg-slate-900/80 px-2.5 py-1 rounded-md border border-slate-700 text-blue-300 select-all truncate max-w-md">
                {CANVA_SITE_URL}
              </code>
            </div>
          </div>

          {/* Action Control Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleOpenCanva}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg hover:shadow-amber-500/20 transition-all cursor-pointer active:scale-95"
              id="btn-open-canva-site"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open Canva Site</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Copy Canva URL"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Link'}</span>
            </button>

            <button
              onClick={handleReload}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
              title="Reload Embed"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Expand Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Security & Access Notice */}
        <div className="mt-4 pt-3 border-t border-blue-900/30 flex items-center gap-2 text-[11px] text-slate-300">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>
            If your browser restricts embedding third-party Canva sites due to iframe sandbox or security headers, click the golden <strong>"Open Canva Site"</strong> button above to launch the site instantly in a full browser tab.
          </span>
        </div>
      </div>

      {/* Embedded Canva Site Container */}
      <div 
        className={`bg-slate-900 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl relative transition-all duration-300 ${
          isFullscreen ? 'fixed inset-4 z-50 flex flex-col' : 'min-h-[750px] flex flex-col'
        }`}
      >
        {/* Container Top Toolbar */}
        <div className="bg-slate-800/90 border-b border-slate-700 px-4 py-2.5 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-semibold text-white">Canva Audit Site Viewer</span>
            <span className="text-slate-400 font-mono text-[10px]">| proposal-form-and-evaluation-form.my.canva.site</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenCanva}
              className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold cursor-pointer"
            >
              <span>Launch Full Screen</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Iframe Viewport with Fallback Overlay */}
        <div className="flex-1 relative w-full h-full min-h-[700px] bg-slate-950">
          <iframe
            key={iframeKey}
            src={CANVA_SITE_URL}
            className="w-full h-full min-h-[700px] border-0"
            title="Proposal Form and Evaluation Form - Audit File Site"
            allow="fullscreen; clipboard-read; clipboard-write;"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation allow-downloads"
            onLoad={() => setIframeLoaded(true)}
          />

          {/* Quick External Launch Strip at the bottom */}
          <div className="absolute bottom-4 right-4 z-20">
            <button
              onClick={handleOpenCanva}
              className="px-4 py-2.5 rounded-xl bg-[#0b1b36]/90 hover:bg-[#112a54] text-white border border-blue-500/40 font-bold text-xs flex items-center gap-2 shadow-2xl backdrop-blur-md cursor-pointer transition-all hover:scale-105"
            >
              <ExternalLink className="w-4 h-4 text-amber-400" />
              <span>Open in New Tab</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
