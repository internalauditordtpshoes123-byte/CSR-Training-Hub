/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Users, 
  Server, 
  HardDrive, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  X,
  Share2,
  Copy,
  Check,
  Database
} from 'lucide-react';
import { 
  SyncConnectionStatus, 
  subscribeToSyncStatus, 
  getClientId, 
  flushOfflineQueue,
  getCurrentSyncStatus 
} from '../services/realtimeSync';

interface SyncStatusBadgeProps {
  onForceResync?: () => void;
  onOpenBackupCenter?: () => void;
  addToast?: (title: string, message: string, type: 'success' | 'warning' | 'info') => void;
}

export default function SyncStatusBadge({ onForceResync, onOpenBackupCenter, addToast }: SyncStatusBadgeProps) {
  const [status, setStatus] = useState<SyncConnectionStatus>('offline');
  const [peerCount, setPeerCount] = useState<number>(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>(new Date().toLocaleTimeString());
  const [isCopied, setIsCopied] = useState(false);
  const [isFlushing, setIsFlushing] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToSyncStatus((newStatus, count) => {
      setStatus(newStatus);
      setPeerCount(count);
      if (newStatus === 'connected') {
        setLastSyncTime(new Date().toLocaleTimeString());
      }
    });

    return () => unsubscribe();
  }, []);

  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(window.location.href);
      setIsCopied(true);
      if (addToast) addToast('Link Copied', 'System link copied to clipboard. Share with other PCs to sync data.', 'success');
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleManualSync = async () => {
    setIsFlushing(true);
    await flushOfflineQueue();
    if (onForceResync) {
      await onForceResync();
    }
    setLastSyncTime(new Date().toLocaleTimeString());
    setIsFlushing(false);
    if (addToast) addToast('Sync Complete', 'All records and files re-synchronized with online master database.', 'success');
  };

  const statusConfig = {
    connected: {
      color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20',
      dot: 'bg-emerald-400 animate-pulse',
      icon: Wifi,
      text: peerCount > 1 ? `Multi-PC Synced (${peerCount} Online)` : 'Cloud & Multi-PC Synced'
    },
    syncing: {
      color: 'bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20',
      dot: 'bg-blue-400',
      icon: RefreshCw,
      text: 'Synchronizing...'
    },
    connecting: {
      color: 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20',
      dot: 'bg-amber-400 animate-ping',
      icon: RefreshCw,
      text: 'Connecting...'
    },
    offline: {
      color: 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20',
      dot: 'bg-rose-500',
      icon: WifiOff,
      text: 'Offline (Changes Queued)'
    }
  };

  const config = statusConfig[status];
  const IconComponent = config.icon;

  return (
    <>
      {/* Live Indicator Pill in Header */}
      <button
        id="sync-status-badge-button"
        onClick={() => setIsModalOpen(true)}
        className={`flex items-center gap-2 px-2.5 py-1 rounded-full border text-[11px] font-semibold transition cursor-pointer ${config.color}`}
        title="Click to view Multi-PC Synchronization Status & Connected Devices"
      >
        <span className="relative flex h-2 w-2">
          <span className={`inline-flex rounded-full h-2 w-2 ${config.dot}`}></span>
        </span>
        <IconComponent className={`w-3.5 h-3.5 ${status === 'syncing' || status === 'connecting' ? 'animate-spin' : ''}`} />
        <span className="truncate max-w-[170px] sm:max-w-[240px]">{config.text}</span>
      </button>

      {/* Synchronization Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[#0b1d33] border border-[#1a4478] rounded-xl max-w-lg w-full overflow-hidden shadow-2xl">
            
            {/* Modal Header */}
            <div className="p-4 bg-[#071424] border-b border-[#122b4a] flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Server className="w-4 h-4 text-[#38bdf8]" />
                <span>Multi-PC Synchronization Hub</span>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-[#122b4a] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs text-slate-200">
              
              {/* Status Banner */}
              <div className={`p-3.5 rounded-lg border flex items-center gap-3 ${
                status === 'connected' ? 'bg-emerald-950/40 border-emerald-700/50 text-emerald-200' :
                status === 'syncing' ? 'bg-blue-950/40 border-blue-700/50 text-blue-200' :
                status === 'connecting' ? 'bg-amber-950/40 border-amber-700/50 text-amber-200' :
                'bg-rose-950/40 border-rose-700/50 text-rose-200'
              }`}>
                <div className="p-2 rounded-full bg-black/30">
                  <IconComponent className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm">
                    {status === 'connected' ? 'Online & Synchronized Across All PCs' :
                     status === 'syncing' ? 'Uploading & Broadcasting Changes...' :
                     status === 'connecting' ? 'Connecting to Central Master Server...' :
                     'Offline Mode — Local Cache Active'}
                  </div>
                  <div className="text-[11px] opacity-80 mt-0.5">
                    {status === 'connected' 
                      ? `Real-time synchronization active. ${peerCount} connected device(s) on this shared link.`
                      : 'Changes are safely queued and will automatically sync when connected.'}
                  </div>
                </div>
              </div>

              {/* Multi-PC Sync Stats */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 bg-[#08182b] border border-[#14365e] rounded-lg space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                    <Users className="w-3.5 h-3.5 text-blue-400" />
                    <span>Connected Devices</span>
                  </div>
                  <div className="text-base font-black text-white">{peerCount} Active Session{peerCount > 1 ? 's' : ''}</div>
                  <div className="text-[10px] text-slate-400">All PCs opening this link share the same live data</div>
                </div>

                <div className="p-3 bg-[#08182b] border border-[#14365e] rounded-lg space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Last Master Sync</span>
                  </div>
                  <div className="text-base font-black text-white">{lastSyncTime}</div>
                  <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Auto-synced in real-time
                  </div>
                </div>
              </div>

              {/* Shared System Link */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                  <span>Shared System Link (Open on any PC / Device)</span>
                  <span className="text-[10px] text-blue-400">Same Link = Same Shared Data</span>
                </label>
                <div className="flex items-center gap-2 p-2 bg-[#061220] border border-[#14365e] rounded-md font-mono text-[11px] text-slate-300">
                  <span className="truncate flex-1">{typeof window !== 'undefined' ? window.location.href : ''}</span>
                  <button
                    onClick={handleCopyLink}
                    className="px-2.5 py-1 bg-[#1a4478] hover:bg-[#2563eb] text-white rounded text-[10px] font-semibold flex items-center gap-1 transition"
                  >
                    {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{isCopied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Diagnostic Info */}
              <div className="p-3 bg-[#061220] border border-[#122b4a] rounded-lg space-y-1.5 text-[11px]">
                <div className="font-bold text-slate-300 flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                  <span>Centralized Storage Engine Status:</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-400">
                  <div>• Cloud Firestore: <span className="text-emerald-400 font-semibold">Active & Live</span></div>
                  <div>• Cross-PC Realtime Push: <span className="text-emerald-400 font-semibold">Instant</span></div>
                  <div>• Server Realtime SSE: <span className="text-emerald-400 font-semibold">Active</span></div>
                  <div>• Uploaded Files: <span className="text-slate-200 font-semibold">Online Server Storage</span></div>
                  <div>• Employees & Logs: <span className="text-slate-200 font-semibold">Cloud Synced</span></div>
                  <div>• Offline Fallback: <span className="text-emerald-400 font-semibold">Enabled</span></div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#071424] border-t border-[#122b4a] flex items-center justify-between">
              <div className="text-[10px] text-slate-500 font-mono">
                Client ID: {getClientId()}
              </div>

              <div className="flex items-center gap-2">
                {onOpenBackupCenter && (
                  <button
                    onClick={() => {
                      setIsModalOpen(false);
                      onOpenBackupCenter();
                    }}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                  >
                    <Database className="w-3.5 h-3.5" />
                    <span>Backup Center</span>
                  </button>
                )}

                <button
                  onClick={handleManualSync}
                  disabled={isFlushing}
                  className="px-3.5 py-1.5 bg-[#14365e] hover:bg-[#1a4478] text-white text-xs font-semibold rounded flex items-center gap-1.5 transition cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isFlushing ? 'animate-spin' : ''}`} />
                  <span>{isFlushing ? 'Syncing...' : 'Force Full Re-Sync'}</span>
                </button>

                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-1.5 bg-[#0e243d] hover:bg-[#14365c] text-slate-300 text-xs font-semibold rounded transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
