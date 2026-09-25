import React, { useState, useMemo } from 'react';
import {
  PieChart as PieIcon,
  RotateCw,
  Layers,
  Sparkles,
  Maximize2,
  TrendingUp,
  Award,
  Users,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Eye,
  Sliders,
  ChevronDown
} from 'lucide-react';
import { LeadershipTraineeRow, LeadershipDepartmentSummaryItem } from '../../data/leadershipSheetData';

export type PieChartMetric = 'status' | 'department' | 'cohort' | 'modularScore';

interface Leadership3DPieChartProps {
  trainees: LeadershipTraineeRow[];
  departmentSummaries?: LeadershipDepartmentSummaryItem[];
  currentYearFilter?: 'ALL' | '2025' | '2026';
}

interface SliceData {
  id: string;
  label: string;
  value: number;
  color: string;
  darkColor: string;
  lightColor: string;
  percentage: number;
  subtext?: string;
}

export const Leadership3DPieChart: React.FC<Leadership3DPieChartProps> = ({
  trainees,
  currentYearFilter = 'ALL'
}) => {
  // Metric selector
  const [metric, setMetric] = useState<PieChartMetric>('status');
  // Interactive slice hover
  const [hoveredSliceId, setHoveredSliceId] = useState<string | null>(null);
  const [selectedSliceId, setSelectedSliceId] = useState<string | null>(null);
  // 3D Controls
  const [rotationAngle, setRotationAngle] = useState<number>(30); // in degrees
  const [tiltAngle, setTiltAngle] = useState<number>(45); // in degrees (isometric)
  const [depth, setDepth] = useState<number>(26); // extrusion depth in px
  const [isExploded, setIsExploded] = useState<boolean>(false);

  // Filter trainees according to global cohort if applicable
  const activeTrainees = useMemo(() => {
    if (currentYearFilter === 'ALL') return trainees;
    const y = parseInt(currentYearFilter, 10);
    return trainees.filter((t) => t.year === y);
  }, [trainees, currentYearFilter]);

  // Generate Slice Data based on selected Metric
  const slices = useMemo<SliceData[]>(() => {
    const totalCount = activeTrainees.length;
    if (totalCount === 0) return [];

    if (metric === 'status') {
      const completed = activeTrainees.filter((t) => t.status === 'Completed').length;
      const incomplete = activeTrainees.filter((t) => t.status === 'Incomplete').length;
      const noShow = activeTrainees.filter((t) => t.status === 'No Show').length;

      return [
        {
          id: 'completed',
          label: 'Completed & Certified',
          value: completed,
          percentage: Number(((completed / totalCount) * 100).toFixed(1)),
          color: '#eab308', // Yellow-500
          darkColor: '#854d0e', // Yellow-800
          lightColor: '#fef08a', // Yellow-200
          subtext: 'Passed program modular qualification'
        },
        {
          id: 'incomplete',
          label: 'Incomplete Modules',
          value: incomplete,
          percentage: Number(((incomplete / totalCount) * 100).toFixed(1)),
          color: '#3b82f6', // Blue-500
          darkColor: '#1e40af', // Blue-800
          lightColor: '#93c5fd', // Blue-300
          subtext: 'Ongoing modules in progress'
        },
        {
          id: 'noShow',
          label: 'No Show / Absent',
          value: noShow,
          percentage: Number(((noShow / totalCount) * 100).toFixed(1)),
          color: '#64748b', // Slate-500
          darkColor: '#334155', // Slate-700
          lightColor: '#cbd5e1', // Slate-300
          subtext: 'Did not attend scheduled session'
        }
      ].filter((s) => s.value > 0);
    }

    if (metric === 'department') {
      const counts: Record<string, { count: number; color: string; darkColor: string; lightColor: string }> = {
        Stitching: { count: 0, color: '#10b981', darkColor: '#065f46', lightColor: '#6ee7b7' },
        Assembly: { count: 0, color: '#3b82f6', darkColor: '#1e40af', lightColor: '#93c5fd' },
        Cutting: { count: 0, color: '#f59e0b', darkColor: '#92400e', lightColor: '#fcd34d' },
        Rubber: { count: 0, color: '#8b5cf6', darkColor: '#5b21b6', lightColor: '#c4b5fd' },
        'Warehouse & Logistics': { count: 0, color: '#ec4899', darkColor: '#9d174d', lightColor: '#f472b6' }
      };

      activeTrainees.forEach((t) => {
        const dLower = (t.department || '').toLowerCase();
        if (dLower.includes('stitching') || dLower.includes('punching')) counts.Stitching.count++;
        else if (dLower.includes('assembly') || dLower.includes('midsole') || dLower.includes('vulcanizing')) counts.Assembly.count++;
        else if (dLower.includes('cutting')) counts.Cutting.count++;
        else if (dLower.includes('rubber') || dLower.includes('milling') || dLower.includes('d2p') || dLower.includes('dtp')) counts.Rubber.count++;
        else counts['Warehouse & Logistics'].count++;
      });

      return Object.entries(counts)
        .map(([name, meta]) => ({
          id: name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
          label: name,
          value: meta.count,
          percentage: Number(((meta.count / totalCount) * 100).toFixed(1)),
          color: meta.color,
          darkColor: meta.darkColor,
          lightColor: meta.lightColor,
          subtext: `${meta.count} active supervisory leaders`
        }))
        .filter((s) => s.value > 0);
    }

    if (metric === 'cohort') {
      const count2025 = activeTrainees.filter((t) => t.year === 2025).length;
      const count2026 = activeTrainees.filter((t) => t.year === 2026).length;

      return [
        {
          id: 'cohort2025',
          label: '2025 Training Cohort',
          value: count2025,
          percentage: Number(((count2025 / totalCount) * 100).toFixed(1)),
          color: '#eab308',
          darkColor: '#854d0e',
          lightColor: '#fef08a',
          subtext: 'July – August 2025 Foundation'
        },
        {
          id: 'cohort2026',
          label: '2026 Training Cohort',
          value: count2026,
          percentage: Number(((count2026 / totalCount) * 100).toFixed(1)),
          color: '#3b82f6',
          darkColor: '#1e40af',
          lightColor: '#93c5fd',
          subtext: 'January – February 2026 Expansion'
        }
      ].filter((s) => s.value > 0);
    }

    if (metric === 'modularScore') {
      // Breakdown by total completed modules: 8/8, 5-7, 1-4, 0
      const full = activeTrainees.filter((t) => t.total >= 8).length;
      const qualified = activeTrainees.filter((t) => t.total >= 5 && t.total < 8).length;
      const partial = activeTrainees.filter((t) => t.total >= 1 && t.total < 5).length;
      const zero = activeTrainees.filter((t) => t.total === 0).length;

      return [
        {
          id: 'score_full',
          label: 'Perfect Score (8 / 8 Modules)',
          value: full,
          percentage: Number(((full / totalCount) * 100).toFixed(1)),
          color: '#10b981',
          darkColor: '#065f46',
          lightColor: '#a7f3d0',
          subtext: 'Attended 100% of curriculum'
        },
        {
          id: 'score_qualified',
          label: 'Passed (5 to 7 Modules)',
          value: qualified,
          percentage: Number(((qualified / totalCount) * 100).toFixed(1)),
          color: '#eab308',
          darkColor: '#854d0e',
          lightColor: '#fde047',
          subtext: 'Met qualification threshold'
        },
        {
          id: 'score_partial',
          label: 'Incomplete (1 to 4 Modules)',
          value: partial,
          percentage: Number(((partial / totalCount) * 100).toFixed(1)),
          color: '#f97316',
          darkColor: '#9a3412',
          lightColor: '#fdba74',
          subtext: 'Requires makeup sessions'
        },
        {
          id: 'score_zero',
          label: 'Zero Modules Attended',
          value: zero,
          percentage: Number(((zero / totalCount) * 100).toFixed(1)),
          color: '#64748b',
          darkColor: '#334155',
          lightColor: '#cbd5e1',
          subtext: 'No attendance recorded'
        }
      ].filter((s) => s.value > 0);
    }

    return [];
  }, [activeTrainees, metric]);

  // Geometry configuration for SVG 3D Ellipse
  const cx = 240;
  const cy = 145;
  const rx = 150;
  const tiltRatio = Math.sin((tiltAngle * Math.PI) / 180) * 0.75 + 0.15; // 0.35 to 0.75
  const ry = rx * tiltRatio;

  // Calculate angles for each slice
  const totalSum = slices.reduce((acc, s) => acc + s.value, 0);

  const calculatedSlices = useMemo(() => {
    let currentAngle = (rotationAngle * Math.PI) / 180;

    return slices.map((s) => {
      const sliceAngle = totalSum > 0 ? (s.value / totalSum) * 2 * Math.PI : 0;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;
      const midAngle = startAngle + sliceAngle / 2;
      currentAngle = endAngle;

      return {
        ...s,
        startAngle,
        endAngle,
        midAngle,
        sliceAngle
      };
    });
  }, [slices, totalSum, rotationAngle]);

  // Helper to compute (x, y) on the ellipse given angle
  const getPoint = (angle: number, offsetX = 0, offsetY = 0) => {
    return {
      x: cx + offsetX + rx * Math.cos(angle),
      y: cy + offsetY + ry * Math.sin(angle)
    };
  };

  // Helper to generate side extrusion wall paths
  const generateSideWall = (slice: (typeof calculatedSlices)[0], offsetX: number, offsetY: number) => {
    const { startAngle, endAngle } = slice;
    const step = 0.05; // radians per step
    const paths: React.ReactElement[] = [];

    // Check front-facing arcs (where sin(angle) >= -0.05)
    let currentSegment: number[] = [];

    for (let a = startAngle; a <= endAngle + 0.0001; a += step) {
      const actualAngle = Math.min(a, endAngle);
      const sinVal = Math.sin(actualAngle);

      // Facing front/viewer if sinVal >= 0 (since Y goes downwards in SVG)
      if (sinVal >= -0.05) {
        currentSegment.push(actualAngle);
      } else {
        if (currentSegment.length > 1) {
          paths.push(buildWallPath(currentSegment, slice, offsetX, offsetY, paths.length));
          currentSegment = [];
        }
      }
    }

    if (currentSegment.length > 1) {
      paths.push(buildWallPath(currentSegment, slice, offsetX, offsetY, paths.length));
    }

    // Radial cut wall at startAngle if facing forward
    if (Math.cos(startAngle) < 0 && Math.sin(startAngle) > -0.1) {
      const p = getPoint(startAngle, offsetX, offsetY);
      const radPath = `M ${cx + offsetX},${cy + offsetY} L ${p.x},${p.y} L ${p.x},${p.y + depth} L ${cx + offsetX},${cy + offsetY + depth} Z`;
      paths.push(
        <path
          key={`rad_start_${slice.id}`}
          d={radPath}
          fill={slice.darkColor}
          stroke="#000"
          strokeWidth="0.5"
          opacity={0.9}
        />
      );
    }

    // Radial cut wall at endAngle if facing forward
    if (Math.cos(endAngle) > 0 && Math.sin(endAngle) > -0.1) {
      const p = getPoint(endAngle, offsetX, offsetY);
      const radPath = `M ${cx + offsetX},${cy + offsetY} L ${p.x},${p.y} L ${p.x},${p.y + depth} L ${cx + offsetX},${cy + offsetY + depth} Z`;
      paths.push(
        <path
          key={`rad_end_${slice.id}`}
          d={radPath}
          fill={slice.darkColor}
          stroke="#000"
          strokeWidth="0.5"
          opacity={0.85}
        />
      );
    }

    return paths;
  };

  const buildWallPath = (
    angles: number[],
    slice: (typeof calculatedSlices)[0],
    offsetX: number,
    offsetY: number,
    keyIdx: number
  ) => {
    const topPoints = angles.map((a) => getPoint(a, offsetX, offsetY));
    const bottomPoints = angles.map((a) => ({
      x: cx + offsetX + rx * Math.cos(a),
      y: cy + offsetY + ry * Math.sin(a) + depth
    }));

    let d = `M ${topPoints[0].x},${topPoints[0].y}`;
    for (let i = 1; i < topPoints.length; i++) {
      d += ` L ${topPoints[i].x},${topPoints[i].y}`;
    }
    for (let i = bottomPoints.length - 1; i >= 0; i--) {
      d += ` L ${bottomPoints[i].x},${bottomPoints[i].y}`;
    }
    d += ' Z';

    const midAngle = (angles[0] + angles[angles.length - 1]) / 2;
    // Lighting shading factor: simulate light source from top-left (angle ~ 225 deg or -135 deg)
    const lightFactor = Math.max(0.5, Math.min(1.0, 0.65 + 0.35 * Math.sin(midAngle)));

    return (
      <path
        key={`wall_${slice.id}_${keyIdx}`}
        d={d}
        fill={slice.darkColor}
        filter={`brightness(${lightFactor})`}
        stroke="#050507"
        strokeWidth="0.6"
      />
    );
  };

  // Generate top face slice path
  const generateTopFace = (slice: (typeof calculatedSlices)[0], offsetX: number, offsetY: number) => {
    const { startAngle, endAngle } = slice;
    const p1 = getPoint(startAngle, offsetX, offsetY);
    const p2 = getPoint(endAngle, offsetX, offsetY);
    const largeArc = slice.sliceAngle > Math.PI ? 1 : 0;

    const centerPoint = { x: cx + offsetX, y: cy + offsetY };
    const d = `M ${centerPoint.x},${centerPoint.y} L ${p1.x},${p1.y} A ${rx} ${ry} 0 ${largeArc} 1 ${p2.x},${p2.y} Z`;

    const isHovered = hoveredSliceId === slice.id || selectedSliceId === slice.id;

    return (
      <g
        key={`top_${slice.id}`}
        onMouseEnter={() => setHoveredSliceId(slice.id)}
        onMouseLeave={() => setHoveredSliceId(null)}
        onClick={() => setSelectedSliceId(selectedSliceId === slice.id ? null : slice.id)}
        className="cursor-pointer transition-transform duration-200"
      >
        <defs>
          <linearGradient id={`grad_${slice.id}`} x1="0%" y1="0%" x2="70%" y2="100%">
            <stop offset="0%" stopColor={slice.lightColor} stopOpacity="0.9" />
            <stop offset="40%" stopColor={slice.color} />
            <stop offset="100%" stopColor={slice.darkColor} />
          </linearGradient>
        </defs>

        <path
          d={d}
          fill={`url(#grad_${slice.id})`}
          stroke={isHovered ? '#ffffff' : '#050507'}
          strokeWidth={isHovered ? '2.5' : '0.8'}
          className="transition-all duration-200"
        />

        {/* Highlight border on hover */}
        {isHovered && (
          <path
            d={d}
            fill="none"
            stroke="#ffffff"
            strokeWidth="2.5"
            strokeLinejoin="round"
            className="filter drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]"
          />
        )}
      </g>
    );
  };

  // Active highlighted slice details
  const activeSlice = slices.find((s) => s.id === (hoveredSliceId || selectedSliceId)) || null;

  return (
    <div className="bg-[#0c0c0e] border border-[#242426] rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden text-slate-100">
      {/* Background decorative glow */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* HEADER WITH CONTROLS & METRIC SELECTOR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#202024] relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 text-[11px] font-mono font-black uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-yellow-400" />
              3D Interactive Analytics
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              Cohort: {currentYearFilter === 'ALL' ? 'Combined (2025 + 2026)' : `Year ${currentYearFilter}`} • {activeTrainees.length} Total Leaders
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wide flex items-center gap-2">
            <PieIcon className="w-5 h-5 text-yellow-400" />
            LEADERSHIP ACADEMY 3D PIE METRICS
          </h3>
        </div>

        {/* DATASET SELECTOR PILLS */}
        <div className="flex items-center gap-1.5 bg-black/80 p-1.5 rounded-xl border border-[#26262a] overflow-x-auto scrollbar-none">
          <button
            onClick={() => setMetric('status')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition whitespace-nowrap cursor-pointer ${
              metric === 'status'
                ? 'bg-yellow-400 text-black shadow-md font-black'
                : 'text-slate-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            Completion Status
          </button>
          <button
            onClick={() => setMetric('department')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition whitespace-nowrap cursor-pointer ${
              metric === 'department'
                ? 'bg-yellow-400 text-black shadow-md font-black'
                : 'text-slate-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            By Department
          </button>
          <button
            onClick={() => setMetric('modularScore')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition whitespace-nowrap cursor-pointer ${
              metric === 'modularScore'
                ? 'bg-yellow-400 text-black shadow-md font-black'
                : 'text-slate-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            Score Tiers
          </button>
          {currentYearFilter === 'ALL' && (
            <button
              onClick={() => setMetric('cohort')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition whitespace-nowrap cursor-pointer ${
                metric === 'cohort'
                  ? 'bg-yellow-400 text-black shadow-md font-black'
                  : 'text-slate-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              2025 vs 2026
            </button>
          )}
        </div>
      </div>

      {/* 3D PERSPECTIVE CANVAS & INTERACTIVE LEGEND */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4 items-center relative z-10">
        {/* LEFT / CENTER: 3D PIE CHART SVG (COLS 1-7) */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center relative min-h-[360px] bg-gradient-to-b from-[#09090b] to-[#040405] rounded-xl border border-[#1b1b1e] p-4 shadow-inner">
          {/* Quick HUD Tooltip if a slice is hovered */}
          <div className="absolute top-3 left-4 flex items-center gap-2 font-mono text-xs">
            {activeSlice ? (
              <div className="flex items-center gap-2 bg-black/90 border border-yellow-500/40 px-3 py-1 rounded-lg backdrop-blur-sm shadow-lg animate-fadeIn">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: activeSlice.color }}
                />
                <span className="font-bold text-white">{activeSlice.label}:</span>
                <span className="text-yellow-400 font-black">{activeSlice.value}</span>
                <span className="text-slate-400">({activeSlice.percentage}%)</span>
              </div>
            ) : (
              <span className="text-[11px] text-slate-500 font-mono">
                Hover or click any 3D slice to inspect breakdown
              </span>
            )}
          </div>

          {/* 3D Tilt / Rotate Quick Controls */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            <button
              onClick={() => setRotationAngle((prev) => (prev + 45) % 360)}
              className="p-1.5 rounded-lg bg-neutral-900/90 border border-neutral-700 text-slate-300 hover:text-yellow-400 transition cursor-pointer"
              title="Rotate 3D Pie 45°"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsExploded(!isExploded)}
              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                isExploded
                  ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50'
                  : 'bg-neutral-900/90 border-neutral-700 text-slate-300 hover:text-white'
              }`}
              title="Toggle Exploded View"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* SVG 3D STAGE */}
          <div className="w-full max-w-[480px] aspect-[480/320] flex items-center justify-center">
            <svg
              viewBox="0 0 480 320"
              className="w-full h-full select-none overflow-visible"
            >
              <defs>
                {/* Ambient drop shadow under 3D base cylinder */}
                <radialGradient id="pieShadow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#000000" stopOpacity="0.85" />
                  <stop offset="60%" stopColor="#000000" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Floor elliptical shadow */}
              <ellipse
                cx={cx}
                cy={cy + depth + 14}
                rx={rx * 1.08}
                ry={ry * 1.15}
                fill="url(#pieShadow)"
              />

              {/* 1. RENDER 3D SIDE EXTRUSION WALLS */}
              <g id="pie-3d-walls">
                {calculatedSlices.map((slice) => {
                  const isHovered = hoveredSliceId === slice.id || selectedSliceId === slice.id;
                  const explodeDist = isExploded ? 14 : isHovered ? 16 : 0;
                  const offsetX = Math.cos(slice.midAngle) * explodeDist;
                  const offsetY = Math.sin(slice.midAngle) * explodeDist * tiltRatio;

                  return (
                    <g key={`walls_group_${slice.id}`}>
                      {generateSideWall(slice, offsetX, offsetY)}
                    </g>
                  );
                })}
              </g>

              {/* 2. RENDER TOP FACES */}
              <g id="pie-3d-tops">
                {calculatedSlices.map((slice) => {
                  const isHovered = hoveredSliceId === slice.id || selectedSliceId === slice.id;
                  const explodeDist = isExploded ? 14 : isHovered ? 16 : 0;
                  const offsetX = Math.cos(slice.midAngle) * explodeDist;
                  const offsetY = Math.sin(slice.midAngle) * explodeDist * tiltRatio;

                  return generateTopFace(slice, offsetX, offsetY);
                })}
              </g>

              {/* 3. OPTIONAL 3D PERCENTAGE CALLOUT LABELS ON LARGE SLICES */}
              <g id="pie-3d-labels" pointerEvents="none">
                {calculatedSlices.map((slice) => {
                  if (slice.percentage < 7) return null;
                  const isHovered = hoveredSliceId === slice.id || selectedSliceId === slice.id;
                  const explodeDist = isExploded ? 14 : isHovered ? 16 : 0;
                  const labelRadius = rx * 0.65;
                  const lx = cx + Math.cos(slice.midAngle) * (labelRadius + explodeDist);
                  const ly = cy + Math.sin(slice.midAngle) * (labelRadius * tiltRatio + explodeDist * tiltRatio);

                  return (
                    <text
                      key={`lbl_${slice.id}`}
                      x={lx}
                      y={ly + 4}
                      fill="#ffffff"
                      textAnchor="middle"
                      fontSize={isHovered ? '13' : '11'}
                      fontWeight="900"
                      fontFamily="monospace"
                      className="filter drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]"
                    >
                      {slice.percentage}%
                    </text>
                  );
                })}
              </g>
            </svg>
          </div>

          {/* Interactive Tilt & Rotation Sliders Footer */}
          <div className="w-full flex items-center justify-between gap-4 pt-3 mt-1 border-t border-[#18181b] text-[10px] font-mono text-slate-400">
            <div className="flex items-center gap-2">
              <span>Rotation: {rotationAngle}°</span>
              <input
                type="range"
                min="0"
                max="360"
                step="5"
                value={rotationAngle}
                onChange={(e) => setRotationAngle(parseInt(e.target.value, 10))}
                className="w-20 accent-yellow-400 cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-2">
              <span>3D Tilt: {tiltAngle}°</span>
              <input
                type="range"
                min="25"
                max="65"
                step="5"
                value={tiltAngle}
                onChange={(e) => setTiltAngle(parseInt(e.target.value, 10))}
                className="w-16 accent-yellow-400 cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-2">
              <span>Depth: {depth}px</span>
              <input
                type="range"
                min="10"
                max="40"
                step="2"
                value={depth}
                onChange={(e) => setDepth(parseInt(e.target.value, 10))}
                className="w-16 accent-yellow-400 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* RIGHT: INTERACTIVE BREAKDOWN LEGEND & STATS CARDS (COLS 8-12) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-yellow-400" />
              Category Breakdown ({slices.length} Segments)
            </h4>
            <span className="text-[11px] font-mono text-yellow-400 font-black">
              Total: {totalSum} Leaders
            </span>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {slices.map((slice) => {
              const isHovered = hoveredSliceId === slice.id || selectedSliceId === slice.id;
              return (
                <div
                  key={slice.id}
                  onMouseEnter={() => setHoveredSliceId(slice.id)}
                  onMouseLeave={() => setHoveredSliceId(null)}
                  onClick={() => setSelectedSliceId(selectedSliceId === slice.id ? null : slice.id)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isHovered
                      ? 'bg-neutral-900 border-yellow-400/80 shadow-md scale-[1.01]'
                      : 'bg-[#111113] border-[#222225] hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0 shadow-sm ring-2 ring-black"
                      style={{ backgroundColor: slice.color }}
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                        <span>{slice.label}</span>
                        {isHovered && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-yellow-400 text-black font-black font-mono">
                            SELECTED
                          </span>
                        )}
                      </div>
                      {slice.subtext && (
                        <div className="text-[10px] text-slate-400 truncate font-mono">
                          {slice.subtext}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0 font-mono">
                    <div className="text-xs font-black text-white">{slice.value}</div>
                    <div className="text-[10px] font-bold text-yellow-400">
                      {slice.percentage}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Summary Insight Card */}
          <div className="bg-[#121215] border border-[#26262a] rounded-xl p-3 text-xs space-y-1">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-400">Audited Trainees:</span>
              <span className="font-bold text-white">{activeTrainees.length} records</span>
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-400">Top Dominant Segment:</span>
              <span className="font-bold text-yellow-400">
                {slices.length > 0
                  ? [...slices].sort((a, b) => b.value - a.value)[0].label
                  : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono pt-1 border-t border-[#1e1e22]">
              <span className="text-slate-400">Real-Time Sync:</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Firestore Active
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leadership3DPieChart;
