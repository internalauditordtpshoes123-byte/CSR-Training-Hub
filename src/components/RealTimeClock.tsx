/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Clock, Activity, Sun, Moon } from 'lucide-react';

interface RealTimeClockProps {
  variant?: 'compact' | 'full' | 'banner';
  className?: string;
  showSeconds?: boolean;
  showShift?: boolean;
}

export default function RealTimeClock({
  variant = 'compact',
  className = '',
  showSeconds = true,
  showShift = false,
}: RealTimeClockProps) {
  const [now, setNow] = useState<Date>(new Date());
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const currentDate = new Date();
      setNow(currentDate);
      setPulse(p => !p);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format hours, minutes, seconds, and period
  const hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = (hours % 12 || 12).toString().padStart(2, '0');

  const fullDateString = now.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });

  // Shift logic based on 24h schedule
  const getShiftInfo = (hour: number) => {
    if (hour >= 6 && hour < 14) {
      return { name: 'Shift 1 (Morning)', icon: Sun, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
    } else if (hour >= 14 && hour < 22) {
      return { name: 'Shift 2 (Afternoon)', icon: Sun, color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' };
    } else {
      return { name: 'Shift 3 (Night)', icon: Moon, color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' };
    }
  };

  const shift = getShiftInfo(hours);
  const ShiftIcon = shift.icon;

  if (variant === 'compact') {
    return (
      <div
        className={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-[#081224] border border-[#16274a] shadow-xs select-none ${className}`}
      >
        <div className="relative flex items-center justify-center">
          <Clock className="w-4 h-4 text-[#f59e0b] flex-shrink-0" />
          <span
            className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 ${
              pulse ? 'opacity-100 scale-110' : 'opacity-40 scale-90'
            } transition-all duration-300`}
          />
        </div>

        <div className="flex flex-col text-right">
          <div className="flex items-baseline gap-1 font-mono text-white leading-none">
            <span className="text-xs sm:text-sm font-black tracking-tight">{displayHours}</span>
            <span className={`text-amber-400 font-bold ${pulse ? 'opacity-100' : 'opacity-30'} transition-opacity`}>:</span>
            <span className="text-xs sm:text-sm font-black tracking-tight">{minutes}</span>
            {showSeconds && (
              <>
                <span className={`text-amber-400 font-bold ${pulse ? 'opacity-100' : 'opacity-30'} transition-opacity`}>:</span>
                <span className="text-xs sm:text-sm font-black text-amber-400 tracking-tight">{seconds}</span>
              </>
            )}
            <span className="text-[10px] font-bold text-slate-400 ml-0.5">{period}</span>
          </div>

          <span className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5 whitespace-nowrap">
            {fullDateString}
          </span>
        </div>
      </div>
    );
  }

  if (variant === 'banner') {
    return (
      <div
        className={`flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-[#0a1835] via-[#09152b] to-[#0d2044] border border-[#183060] shadow-lg text-white select-none ${className}`}
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[#f59e0b] shadow-inner">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 font-mono">
                Real-Time Operations Clock
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live Counting
              </span>
            </div>

            <div className="flex items-baseline gap-1.5 font-mono mt-0.5">
              <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">{displayHours}</span>
              <span className={`text-2xl font-black text-amber-400 ${pulse ? 'opacity-100' : 'opacity-20'}`}>:</span>
              <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">{minutes}</span>
              <span className={`text-2xl font-black text-amber-400 ${pulse ? 'opacity-100' : 'opacity-20'}`}>:</span>
              <span className="text-2xl sm:text-3xl font-black text-amber-400 tracking-tight">{seconds}</span>
              <span className="text-sm font-black text-slate-400 ml-1">{period}</span>
              <span className="text-xs text-slate-400 font-normal ml-2 hidden md:inline">PST (UTC+8)</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {showShift && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold ${shift.color}`}>
              <ShiftIcon className="w-3.5 h-3.5" />
              <span>{shift.name}</span>
            </div>
          )}

          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-slate-200">{dayOfWeek}</div>
            <div className="text-[11px] text-slate-400 font-mono">{fullDateString}</div>
          </div>
        </div>
      </div>
    );
  }

  // Full widget
  return (
    <div className={`p-4 rounded-2xl bg-[#091429] border border-[#16274a] shadow-xl text-white select-none ${className}`}>
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#122347]">
        <div className="flex items-center gap-2 text-xs font-bold text-amber-400 font-mono uppercase tracking-wider">
          <Activity className="w-4 h-4" />
          <span>Real-Time Subic Operations Time</span>
        </div>
        <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Ticking Active
        </span>
      </div>

      <div className="flex items-center justify-between mt-2">
        <div className="flex items-baseline gap-1 font-mono">
          <span className="text-3xl font-black text-white">{displayHours}</span>
          <span className={`text-2xl font-bold text-amber-400 ${pulse ? 'opacity-100' : 'opacity-25'}`}>:</span>
          <span className="text-3xl font-black text-white">{minutes}</span>
          <span className={`text-2xl font-bold text-amber-400 ${pulse ? 'opacity-100' : 'opacity-25'}`}>:</span>
          <span className="text-3xl font-black text-amber-400">{seconds}</span>
          <span className="text-sm font-bold text-slate-400 ml-1">{period}</span>
        </div>

        <div className="text-right">
          <span className="text-xs font-bold text-white block">{dayOfWeek}</span>
          <span className="text-[10px] text-slate-400 font-mono block">{fullDateString}</span>
        </div>
      </div>
    </div>
  );
}
