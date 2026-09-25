/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';

export interface DatianLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'custom';
  width?: number | string;
  height?: number | string;
  withGlow?: boolean;
  imageSrc?: string | null;
  alt?: string;
}

export const DATIAN_LOGO_DATA_URI = `/datian-logo-hd.png`;

export default function DatianLogo({
  className = '',
  size = 'md',
  width,
  height,
  withGlow = false,
  imageSrc,
  alt = 'DATIAN Corporate Logo'
}: DatianLogoProps) {
  const [imgError, setImgError] = useState(false);

  // Size preset mapping with strictly maintained 800:520 aspect ratio
  const sizeClasses = {
    xs: 'w-20 h-13',
    sm: 'w-32 h-21',
    md: 'w-52 h-34',
    lg: 'w-72 h-47',
    xl: 'w-96 h-62',
    custom: ''
  };

  const selectedSizeClass = size === 'custom' ? '' : sizeClasses[size];
  const effectiveSrc = imageSrc || '/datian-logo-hd.png';

  // Render official HD Datian logo with crisp contrast & drop shadow
  if (effectiveSrc && !imgError) {
    return (
      <div 
        className={`relative inline-flex items-center justify-center select-none flex-shrink-0 ${selectedSizeClass} ${className}`}
        style={{ width: width || undefined, height: height || undefined }}
      >
        {withGlow && (
          <div className="absolute -inset-4 bg-gradient-to-r from-blue-600/35 via-amber-500/30 to-blue-600/35 rounded-full blur-2xl -z-10 animate-pulse pointer-events-none" />
        )}
        <img
          src={effectiveSrc}
          alt={alt}
          onError={() => {
            if (effectiveSrc !== '/datian-logo.svg') {
              setImgError(true);
            }
          }}
          style={{ 
            width: width || '100%', 
            height: height || '100%',
            imageRendering: '-webkit-optimize-contrast',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'translateZ(0)'
          }}
          className="max-w-full max-h-full object-contain filter drop-shadow-md"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  // Master Ultra-HD Vectorized SVG Component matching official DATIAN brand logo
  return (
    <div 
      className={`relative inline-flex items-center justify-center select-none flex-shrink-0 ${selectedSizeClass} ${className}`}
      style={{ width: width || undefined, height: height || undefined }}
    >
      {withGlow && (
        <div className="absolute -inset-4 bg-gradient-to-r from-blue-600/40 via-amber-500/30 to-blue-700/40 rounded-full blur-2xl -z-10 animate-pulse pointer-events-none" />
      )}
      
      <svg 
        viewBox="0 0 800 520" 
        className="w-full h-full object-contain filter drop-shadow-[0_8px_24px_rgba(2,8,23,0.45)]"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
        shapeRendering="geometricPrecision"
        textRendering="geometricPrecision"
      >
        <defs>
          {/* Vibrant Golden Gradient for TIAN */}
          <linearGradient id="datianGoldGradComponent" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffe676" />
            <stop offset="45%" stopColor="#fec52e" />
            <stop offset="100%" stopColor="#df9a0e" />
          </linearGradient>

          {/* Bevel depth shadow for 3D TIAN lettering */}
          <filter id="datian3DShadowComponent" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="2" dy="3" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.45" />
          </filter>

          <filter id="hdLogoShadowComponent" x="-15%" y="-15%" width="130%" height="135%">
            <feDropShadow dx="0" dy="10" stdDeviation="14" floodColor="#020817" floodOpacity="0.45" />
          </filter>
        </defs>

        {/* Master Group */}
        <g filter="url(#hdLogoShadowComponent)">
          {/* Base Outer Unified Shape: Two overlapping circular lobes with straight horizontal bottom base */}
          <path 
            d="M 400 132 A 172 172 0 0 1 515 88 A 172 172 0 0 1 687 260 A 172 172 0 0 1 515 432 L 285 432 A 172 172 0 0 1 113 260 A 172 172 0 0 1 285 88 A 172 172 0 0 1 400 132 Z" 
            fill="#205b9f" 
            stroke="#205b9f" 
            strokeWidth="4" 
            strokeLinejoin="round" 
          />

          {/* Left White Interior Area with pointed bottom-right sweep */}
          <path 
            d="M 396 156 A 144 144 0 0 0 285 116 A 144 144 0 0 0 141 260 A 144 144 0 0 0 285 404 L 418 404 C 414 388 406 372 396 360 C 360 316 360 200 396 156 Z" 
            fill="#ffffff" 
          />

          {/* White Crescent Arc Segments (Interlocking C with gap for TIAN) */}
          {/* Top Arc Segment (from top cusp down to y ≈ 202, ending just above T) */}
          <path 
            d="M 400 132 A 172 172 0 0 1 448 202 L 424 212 A 144 144 0 0 0 394 158 Z" 
            fill="#ffffff" 
          />

          {/* Bottom Arc Segment (from y ≈ 308 below T, curving down to bottom intersection) */}
          <path 
            d="M 424 308 L 448 318 A 172 172 0 0 1 400 388 L 392 362 A 144 144 0 0 0 424 308 Z" 
            fill="#ffffff" 
          />

          {/* ============================================== */}
          {/* LEFT TEXT: DA (Royal Blue #205b9f, Bold Clean) */}
          {/* ============================================== */}
          <g fill="#205b9f">
            {/* Letter D */}
            <path d="M 180 200 L 226 200 C 256 200 272 216 272 260 C 272 304 256 320 226 320 L 180 320 Z M 205 224 L 205 296 L 223 296 C 241 296 247 286 247 260 C 247 234 241 224 223 224 Z" />
            {/* Letter A */}
            <path d="M 282 320 L 320 200 L 346 200 L 384 320 L 358 320 L 350 294 L 316 294 L 308 320 Z M 322 272 L 344 272 L 333 234 Z" />
          </g>

          {/* ==================================================== */}
          {/* RIGHT TEXT: TIAN (Golden Yellow with 3D Depth Filter) */}
          {/* ==================================================== */}
          {/* 3D Bevel Underlayer (Extrusion & Dark Edge) */}
          <g fill="#9b6904" opacity="0.85" transform="translate(2.5, 3)">
            <path d="M 424 200 L 486 200 L 486 225 L 468 225 L 468 320 L 442 320 L 442 225 L 424 225 Z" />
            <path d="M 498 200 L 524 200 L 524 320 L 498 320 Z" />
            <path d="M 536 320 L 574 200 L 600 200 L 638 320 L 612 320 L 604 294 L 570 294 L 562 320 Z M 576 272 L 598 272 L 587 234 Z" />
            <path d="M 648 200 L 674 200 L 704 280 L 704 200 L 728 200 L 728 320 L 702 320 L 672 240 L 672 320 L 648 320 Z" />
          </g>

          {/* Front Face Lettering with Gold Gradient & Subtle Glow Filter */}
          <g fill="url(#datianGoldGradComponent)" filter="url(#datian3DShadowComponent)">
            <path d="M 424 200 L 486 200 L 486 225 L 468 225 L 468 320 L 442 320 L 442 225 L 424 225 Z" />
            <path d="M 498 200 L 524 200 L 524 320 L 498 320 Z" />
            <path d="M 536 320 L 574 200 L 600 200 L 638 320 L 612 320 L 604 294 L 570 294 L 562 320 Z M 576 272 L 598 272 L 587 234 Z" />
            <path d="M 648 200 L 674 200 L 704 280 L 704 200 L 728 200 L 728 320 L 702 320 L 672 240 L 672 320 L 648 320 Z" />
          </g>
        </g>
      </svg>
    </div>
  );
}
