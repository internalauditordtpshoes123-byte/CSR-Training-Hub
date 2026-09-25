/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * DA TIAN SUBIC SHOES, INC. — CSR HUB
 * HIGH-DEFINITION PROFESSIONAL STARTUP / SPLASH SCREEN
 * 
 * Layout & Specification:
 * 1. Clean, pure white background (#ffffff)
 * 2. Original DA TIAN overlapping-circle logo preserved exactly (proportions, colors, "DA TIAN" text)
 * 3. Text "CSR DEPARTMENT" (changed from "RUBBER DEPARTMENT")
 * 4. Main title "CSR HUB" (changed from "SCHEDULER HUB")
 * 5. "Da Tian Subic Shoes, Inc." underneath
 * 6. Yellow horizontal accent line
 * 7. Loading / progress bar at the bottom
 * 8. "INITIALIZING" loading text and animated loading indicators
 * 9. Small build/version text in the bottom-right corner
 * 10. Centered composition, corporate hierarchy, and HD razor-sharp presentation
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2, VolumeX } from 'lucide-react';
import { StartupMediaConfig } from '../types';

interface StartupSplashScreenProps {
  onComplete: () => void;
  logoSrc?: string | null;
  startupMedia?: StartupMediaConfig | null;
}

export default function StartupSplashScreen({
  onComplete,
  logoSrc,
  startupMedia
}: StartupSplashScreenProps) {
  const [progress, setProgress] = useState<number>(0);
  const [isClosing, setIsClosing] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>('INITIALIZING');
  const [isMuted, setIsMuted] = useState<boolean>(startupMedia?.soundEnabled ? false : true);
  const [mediaLoadError, setMediaLoadError] = useState<boolean>(false);
  const [hasMerged, setHasMerged] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 640;
    }
    return false;
  });

  const completedRef = useRef<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Resize listener for responsive animation distance
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Timer to merge the left and right circles with lock impact
  useEffect(() => {
    const mergeTimer = setTimeout(() => {
      setHasMerged(true);
    }, 1100);
    return () => clearTimeout(mergeTimer);
  }, []);

  // Clean up legacy old paragraph text media in localStorage if present
  useEffect(() => {
    try {
      const stored = localStorage.getItem('csr_startup_media_config');
      if (stored && (stored.includes('Your_paragraph_text') || stored.includes('Your paragraph text'))) {
        localStorage.removeItem('csr_startup_media_config');
      }
    } catch {}
  }, []);

  // Priority: 1. logoSrc passed from App (custom / uploaded) -> 2. HD Datian Logo -> 3. Standard fallback
  const activeLogoSrc = logoSrc || '/datian-logo-hd.png';

  const isCustomLogo = Boolean(
    logoSrc && 
    logoSrc !== '/datian-logo-hd.png' && 
    logoSrc !== '/datian-logo.png' && 
    logoSrc !== '/datian-logo.svg'
  );

  const leftCircleSrc = isCustomLogo ? activeLogoSrc : '/datian-logo-left.png';
  const rightCircleSrc = isCustomLogo ? activeLogoSrc : '/datian-logo-right.png';
  const travelX = isMobile ? 55 : 90;

  // Detect and ignore the obsolete/placeholder "Your paragraph text.png" image
  const isOldParagraphImage = Boolean(
    startupMedia?.url?.includes('Your_paragraph_text') || 
    startupMedia?.url?.includes('Your paragraph text') ||
    startupMedia?.fileName?.includes('Your paragraph text')
  );

  // Active display mode: 'video' | 'image' | 'default'
  const activeMode = 
    !mediaLoadError && startupMedia?.type === 'video' && startupMedia?.url
      ? 'video'
      : !mediaLoadError && startupMedia?.type === 'image' && startupMedia?.url && !isOldParagraphImage
      ? 'image'
      : 'default';

  // Completion trigger — smooth cinematic cross-fade to Login Screen
  const handleDone = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    setIsClosing(true);
    setTimeout(() => {
      onComplete();
    }, 400);
  };

  // Keyboard shortcut to skip (Space, Enter, Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        handleDone();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Standard HD Startup Progress Timeline (approx 3.6 seconds total)
  useEffect(() => {
    if (activeMode !== 'default') return;

    const startTime = performance.now();
    const duration = 3400; // 3.4 seconds progression + 300ms hold

    const interval = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const currentPct = Math.min(100, (elapsed / duration) * 100);
      setProgress(currentPct);

      // Dynamic initializing step indicators
      if (currentPct < 25) {
        setLoadingStep('INITIALIZING');
      } else if (currentPct < 55) {
        setLoadingStep('INITIALIZING .');
      } else if (currentPct < 85) {
        setLoadingStep('INITIALIZING . .');
      } else {
        setLoadingStep('INITIALIZING . . .');
      }

      if (elapsed >= duration) {
        clearInterval(interval);
        setTimeout(() => {
          handleDone();
        }, 250);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [activeMode]);

  // Handle custom media timeouts
  useEffect(() => {
    if (activeMode === 'image') {
      const durationMs = Math.max(2, startupMedia?.duration || 4) * 1000;
      const start = performance.now();
      const interval = setInterval(() => {
        const elapsed = performance.now() - start;
        setProgress(Math.min(100, (elapsed / durationMs) * 100));
        if (elapsed >= durationMs) {
          clearInterval(interval);
          handleDone();
        }
      }, 50);
      return () => clearInterval(interval);
    }
  }, [activeMode, startupMedia?.duration]);

  return (
    <AnimatePresence>
      {!isClosing && (
        <motion.div
          key="datian-startup-splash"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
          onClick={handleDone}
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-between select-none cursor-pointer overflow-hidden bg-white text-slate-900"
          style={{ backgroundColor: '#ffffff' }}
        >
          {/* ============================================================= */}
          {/* MODE 1: CUSTOM VIDEO STARTUP SCREEN                           */}
          {/* ============================================================= */}
          {activeMode === 'video' && startupMedia?.url ? (
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              <video
                ref={videoRef}
                src={startupMedia.url}
                autoPlay
                playsInline
                muted={isMuted}
                onEnded={handleDone}
                onError={() => {
                  console.warn('Video failed, reverting to default HD splash');
                  setMediaLoadError(true);
                }}
                className={`w-full h-full ${
                  startupMedia.fitMode === 'cover' ? 'object-cover' : 'object-contain'
                }`}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMuted(!isMuted);
                  if (videoRef.current) videoRef.current.muted = !isMuted;
                }}
                className="absolute bottom-6 right-6 z-50 p-3 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/20 transition cursor-pointer"
                title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-amber-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
              </button>
            </div>
          ) : activeMode === 'image' && startupMedia?.url ? (
            /* ============================================================= */
            /* MODE 2: CUSTOM IMAGE STARTUP SCREEN                           */
            /* ============================================================= */
            <div className="relative w-full h-full flex flex-col items-center justify-center p-6 bg-white">
              <img
                src={startupMedia.url}
                alt={startupMedia.title || 'Startup Screen'}
                onError={() => {
                  console.warn('Image failed, reverting to default HD splash');
                  setMediaLoadError(true);
                }}
                className={`transition-transform duration-700 ${
                  startupMedia.fitMode === 'cover'
                    ? 'w-full h-full object-cover'
                    : 'max-w-[90vw] max-h-[82vh] object-contain'
                }`}
                referrerPolicy="no-referrer"
              />
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-100">
                <div
                  className="h-full bg-gradient-to-r from-[#205b9f] via-blue-500 to-[#f59e0b] transition-all duration-75 ease-linear"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            /* ============================================================= */
            /* MODE 3: OFFICIAL HD DA TIAN STARTUP SCREEN (PURE WHITE)       */
            /* ============================================================= */
            <div className="relative w-full h-full flex flex-col items-center justify-between py-10 sm:py-14 px-6 md:px-12 bg-white">
              {/* Top Spacer for optical vertical balance */}
              <div className="w-full flex justify-end">
                {/* Optional Skip Hint */}
                <span className="text-[11px] font-mono uppercase tracking-widest text-slate-300 hover:text-slate-500 transition-colors">
                  Click or Press Space to Skip
                </span>
              </div>

              {/* CENTER CORE: Logo + Department + Title + Subtitle + Accent Line */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="flex flex-col items-center justify-center text-center max-w-2xl mx-auto my-auto space-y-3"
              >
                {/* 2. REAL OFFICIAL HIGH-DEFINITION DA TIAN LOGO WITH CONVERGING CIRCLES ANIMATION */}
                <div className="relative w-80 sm:w-96 md:w-[440px] max-w-full aspect-[623/425] flex items-center justify-center mb-3 select-none">
                  {/* Soft radiant corporate aura behind the logo */}
                  <motion.div
                    initial={{ opacity: 0.25, scale: 0.85 }}
                    animate={
                      hasMerged
                        ? { opacity: [0.35, 0.85, 0.4], scale: [0.95, 1.12, 1] }
                        : { opacity: 0.35, scale: 0.95 }
                    }
                    transition={{ duration: 0.65, ease: 'easeOut' }}
                    className="absolute -inset-6 bg-gradient-to-r from-blue-600/20 via-amber-400/25 to-blue-600/20 rounded-full blur-2xl -z-10 pointer-events-none"
                  />

                  {/* Radiant shockwave ring when the left and right circles converge and lock */}
                  {hasMerged && (
                    <motion.div
                      initial={{ scale: 0.85, opacity: 0.75 }}
                      animate={{ scale: 1.35, opacity: 0 }}
                      transition={{ duration: 0.75, ease: 'easeOut' }}
                      className="absolute inset-0 border-2 border-amber-400/50 rounded-full pointer-events-none -z-5"
                    />
                  )}

                  {/* UNIFIED MASTER LOGO: Cross-fades seamlessly upon convergence for 100% authentic fidelity */}
                  <motion.img
                    src={activeLogoSrc}
                    alt="Da Tian Subic Shoes, Inc."
                    initial={{ opacity: 0 }}
                    animate={{ opacity: hasMerged ? 1 : 0 }}
                    transition={{ duration: 0.35, ease: 'easeInOut' }}
                    className="absolute inset-0 w-full h-full object-contain filter drop-shadow-[0_12px_30px_rgba(15,35,70,0.15)] z-20 pointer-events-none"
                    style={{
                      imageRendering: '-webkit-optimize-contrast',
                      WebkitBackfaceVisibility: 'hidden',
                      transform: 'translateZ(0)'
                    }}
                    referrerPolicy="no-referrer"
                  />

                  {/* LEFT CIRCLE (Left circular lobe + "DA" text) */}
                  <motion.div
                    initial={{ x: -travelX, opacity: 0, scale: 0.92 }}
                    animate={
                      hasMerged
                        ? { x: 0, opacity: 0, scale: 1 }
                        : { x: 0, opacity: 1, scale: 1 }
                    }
                    transition={{
                      x: { duration: 1.05, ease: [0.16, 1, 0.3, 1] },
                      opacity: { duration: hasMerged ? 0.3 : 0.7, ease: 'easeInOut' },
                      scale: { duration: 1.05, ease: [0.16, 1, 0.3, 1] }
                    }}
                    className="absolute inset-0 w-full h-full z-10 pointer-events-none"
                  >
                    <img
                      src={leftCircleSrc}
                      alt="DA Left Circle"
                      className="w-full h-full object-contain filter drop-shadow-[0_10px_24px_rgba(15,35,70,0.12)]"
                      style={{
                        imageRendering: '-webkit-optimize-contrast',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: 'translateZ(0)',
                        ...(isCustomLogo ? { clipPath: 'polygon(0% 0%, 51% 0%, 51% 100%, 0% 100%)' } : {})
                      }}
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        target.src = activeLogoSrc;
                        target.style.clipPath = 'polygon(0% 0%, 51% 0%, 51% 100%, 0% 100%)';
                      }}
                      referrerPolicy="no-referrer"
                    />
                  </motion.div>

                  {/* RIGHT CIRCLE (Right circular lobe + "TIAN" text) */}
                  <motion.div
                    initial={{ x: travelX, opacity: 0, scale: 0.92 }}
                    animate={
                      hasMerged
                        ? { x: 0, opacity: 0, scale: 1 }
                        : { x: 0, opacity: 1, scale: 1 }
                    }
                    transition={{
                      x: { duration: 1.05, ease: [0.16, 1, 0.3, 1] },
                      opacity: { duration: hasMerged ? 0.3 : 0.7, ease: 'easeInOut' },
                      scale: { duration: 1.05, ease: [0.16, 1, 0.3, 1] }
                    }}
                    className="absolute inset-0 w-full h-full z-10 pointer-events-none"
                  >
                    <img
                      src={rightCircleSrc}
                      alt="TIAN Right Circle"
                      className="w-full h-full object-contain filter drop-shadow-[0_10px_24px_rgba(15,35,70,0.12)]"
                      style={{
                        imageRendering: '-webkit-optimize-contrast',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: 'translateZ(0)',
                        ...(isCustomLogo ? { clipPath: 'polygon(49% 0%, 100% 0%, 100% 100%, 49% 100%)' } : {})
                      }}
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        target.src = activeLogoSrc;
                        target.style.clipPath = 'polygon(49% 0%, 100% 0%, 100% 100%, 49% 100%)';
                      }}
                      referrerPolicy="no-referrer"
                    />
                  </motion.div>
                </div>

                {/* 3. CSR DEPARTMENT (Previously RUBBER DEPARTMENT) */}
                <motion.h2 
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8, duration: 0.5 }}
                  className="text-xs sm:text-sm font-bold uppercase tracking-[0.32em] text-[#205b9f] pt-1 select-none"
                >
                  CSR DEPARTMENT
                </motion.h2>

                {/* 4. CSR HUB (Previously SCHEDULER HUB) */}
                <motion.h1 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9, duration: 0.5 }}
                  className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-[#0f1d38] select-none"
                >
                  CSR HUB
                </motion.h1>

                {/* 5. Da Tian Subic Shoes, Inc. underneath */}
                <motion.p 
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.0, duration: 0.5 }}
                  className="text-sm sm:text-base md:text-lg font-medium text-slate-500 tracking-wide select-none"
                >
                  Da Tian Subic Shoes, Inc.
                </motion.p>

                {/* 6. Yellow horizontal accent line */}
                <motion.div 
                  initial={{ opacity: 0, scaleX: 0 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  transition={{ delay: 1.1, duration: 0.5, ease: 'easeOut' }}
                  className="pt-2 pb-1"
                >
                  <div className="w-24 sm:w-32 md:w-36 h-1 bg-gradient-to-r from-amber-400 via-[#fec52e] to-amber-500 rounded-full mx-auto shadow-sm" />
                </motion.div>
              </motion.div>

              {/* BOTTOM SECTION: Loading Indicator + Progress Bar + Build Text */}
              <div className="w-full max-w-md mx-auto flex flex-col items-center pb-2 sm:pb-4 space-y-3">
                {/* 8. "INITIALIZING" loading text & loading indicators */}
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-[0.25em] text-slate-500">
                    {loadingStep}
                  </span>
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                </div>

                {/* 7. Loading / Progress Bar */}
                <div className="w-64 sm:w-80 md:w-96 h-2 bg-slate-100 border border-slate-200/80 rounded-full overflow-hidden shadow-inner p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-[#205b9f] via-blue-500 to-[#f59e0b] rounded-full transition-all duration-150 ease-out shadow-sm"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* 9. Small build/version text in the bottom-right corner */}
              <div className="w-full flex justify-end pt-2">
                <span className="text-[11px] font-mono text-slate-400 tracking-wider select-none pr-1">
                  BUILD 2026.09.16 • v2.4.0 • CSR ENTERPRISE
                </span>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
