/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { OPLItem } from '../types';

export const DEFAULT_OPL_ITEMS: OPLItem[] = [
  {
    id: 'opl-1',
    title: 'STITCHING PROCESS',
    department: 'Stitching',
    category: 'Process',
    process: 'Stitching Process',
    lineNo: 'Line 1',
    style: 'DT-Pro-Running-01',
    topic: 'Double-Needle Upper Stitching & Seam Margin Control',
    producerDate: '2026-05-10',
    reviewStatus: 'Reviewed',
    reviewedBy: 'Carlos Reyes (QA Specialist)',
    reviewedDate: '2026-05-12',
    approvalStatus: 'Approved',
    approvedBy: 'John Smith (T&D Manager)',
    approvedDate: '2026-05-14',
    preparedBy: 'Kay Anne Mendoza (CSR / Admin)',
    imageUrl: 'https://images.unsplash.com/photo-1590105251760-af8f9bb19ac4?q=80&w=800&auto=format&fit=crop',
    isFavorite: true,
    docNo: 'DT-OPL-ST-001',
    revNo: '02',
    description: 'Standard single and double needle high-speed sewing procedure for athletic shoe upper joining. Focuses on seam margin tolerances, needle temperature management, tension synchronization, and prevention of thread breakage or needle hole tearing.',
    objectives: 'Establish uniform stitching tension across curved panels, achieve 10-12 stitches per inch (SPI), and maintain strict 1.5mm edge seam margins to pass Blue Label pull-test specifications.',
    keyPoints: [
      'Always verify needle gauge #14/90 ball point for synthetic mesh uppers.',
      'Check bobbin thread tension with tensiometer (target: 25-30g).',
      'Keep fingers behind safety needle guard plate at all times.',
      'Ensure zero puckering at collar backstay corners.'
    ],
    safetyPrecautions: [
      'Eye protection glasses required due to high-speed needle friction.',
      'Stop machine completely before threading or changing bobbins.',
      'Maintain hair tied back and loose jewelry removed.'
    ],
    steps: [
      {
        stepNo: 1,
        instruction: 'Inspect pre-cut vamp and quarter panels for clean edge skiving and alignment notches.',
        keyPoint: 'Match triangle registration marks exactly.',
        reason: 'Prevents asymmetrical upper pull and crooked eyelet stay distortion.'
      },
      {
        stepNo: 2,
        instruction: 'Thread upper needle using core-spun polyester thread #40 and insert bobbin with clockwise rotation.',
        keyPoint: 'Pull 5cm thread tail out before lower presser foot drop.',
        reason: 'Prevents bird-nesting tangles under throat plate on start stroke.'
      },
      {
        stepNo: 3,
        instruction: 'Stitch collar seam following the 1.5mm guide line at consistent 2,200 RPM motor speed.',
        keyPoint: 'Maintain continuous gentle fabric feed without pushing or pulling.',
        reason: 'Excess tension creates wave wrinkles after shoe lasting.'
      },
      {
        stepNo: 4,
        instruction: 'Execute automatic backtack of 3 locking stitches at the end of the seam.',
        keyPoint: 'Cut threads flush to within 2mm.',
        reason: 'Guarantees seam will not unravel under 25kg tensile pull.'
      }
    ],
    createdAt: '2026-05-10T08:00:00Z',
    updatedAt: '2026-05-18T14:30:00Z'
  },
  {
    id: 'opl-2',
    title: 'CUTTING PROCESS',
    department: 'Cutting',
    category: 'Process',
    process: 'Cutting Process',
    lineNo: 'Line 2',
    style: 'DT-Sport-Low',
    topic: 'Hydraulic Die Cutting & Multi-Layer Fabric Alignment',
    producerDate: '2026-05-12',
    reviewStatus: 'Reviewed',
    reviewedBy: 'Sarah Jenkins (T&D Lead)',
    reviewedDate: '2026-05-13',
    approvalStatus: 'Approved',
    approvedBy: 'John Smith (T&D Manager)',
    approvedDate: '2026-05-15',
    preparedBy: 'Kay Anne Mendoza (CSR / Admin)',
    imageUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=800&auto=format&fit=crop',
    isFavorite: false,
    docNo: 'DT-OPL-CT-002',
    revNo: '01',
    description: 'Precision hydraulic die press cutting operation for leather, microfiber, and technical textile layers. Emphasizes nest pattern optimization, zero-waste edge clearance, die sharpness checks, and dual-hand safety actuation.',
    objectives: 'Maximize material yield to above 88%, eliminate frayed or burred edges, and maintain die strike pressure at 25 metric tons for clean perpendicular cuts.',
    keyPoints: [
      'Check die blade with finger nail test for nicks before shift startup.',
      'Place nesting dies with 2mm minimum inter-die spacing.',
      'Verify grain stretch orientation runs lengthwise across toe box.',
      'Ensure cutting board is rotated 90 degrees every 2 hours to avoid uneven grooving.'
    ],
    safetyPrecautions: [
      'Two-hand simultaneous button actuation is strictly mandatory—never bypass interlocks.',
      'Keep cutting table cleared of tools, scraps, and liquids.',
      'Wear cut-resistant Kevlar glove on material-holding hand.'
    ],
    steps: [
      {
        stepNo: 1,
        instruction: 'Inspect fabric roll for shading differences, warp slubs, or laminate bubbling.',
        keyPoint: 'Flag and skip defective roll segments.',
        reason: 'Substandard fabric cuts result in high scrap rates at final QA.'
      },
      {
        stepNo: 2,
        instruction: 'Lay max 6 ply layers on zinc-coated bed, clamping head and tail with pneumatic grips.',
        keyPoint: 'Keep tension smooth without stretching elastic fibers.',
        reason: 'Over-tensioned fabric shrinks back after cutting, producing undersized panels.'
      },
      {
        stepNo: 3,
        instruction: 'Position hardened steel cutting die over pattern area following layout CAD sheet.',
        keyPoint: 'Keep blade edge flush with no overhang over board edge.',
        reason: 'Prevents die blade warping and incomplete bottom ply severing.'
      },
      {
        stepNo: 4,
        instruction: 'Depress both green safety buttons simultaneously until hydraulic head strikes cutting stroke.',
        keyPoint: 'Release immediately upon head auto-return.',
        reason: 'Ensures full compliance with machine safety standard ISO 12100.'
      }
    ],
    createdAt: '2026-05-12T09:15:00Z',
    updatedAt: '2026-05-19T10:00:00Z'
  },
  {
    id: 'opl-3',
    title: 'ASSEMBLY PROCESS',
    department: 'Assembly',
    category: 'Process',
    process: 'Assembly Process',
    lineNo: 'Line 3',
    style: 'DT-Pro-Runner',
    topic: 'Upper-to-Last Cementing & High-Pressure Sole Bonding',
    producerDate: '2026-05-15',
    reviewStatus: 'Reviewed',
    reviewedBy: 'Elena Torres (Safety Officer)',
    reviewedDate: '2026-05-16',
    approvalStatus: 'Approved',
    approvedBy: 'Robert Vance (Floor Director)',
    approvedDate: '2026-05-17',
    preparedBy: 'Kay Anne Mendoza (CSR / Admin)',
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=800&auto=format&fit=crop',
    isFavorite: true,
    docNo: 'DT-OPL-AS-003',
    revNo: '03',
    description: 'Toe-lasting, hot-melt adhesive priming, infrared activation chamber heating, and pneumatic bag sole pressing for sports sneakers. Focuses on bond line purity, zero cement squeeze-out, and 30-second dwell time.',
    objectives: 'Achieve sole bond peel strength ≥ 4.0 kgf/cm, ensure zero air pockets in arch region, and prevent adhesive discoloration along white foxing lines.',
    keyPoints: [
      'Pre-heat activation oven to 75°C ± 3°C monitored by digital thermometer.',
      'Apply primer with single uniform brush stroke; avoid puddle accumulation.',
      'Align outsole toe lip precisely to lasted upper center reference crosshair.',
      'Maintain universal bag press pressure at 35-40 kg/cm² for 12 seconds.'
    ],
    safetyPrecautions: [
      'Chemical exhaust hoods must be energized before opening adhesive drums.',
      'Wear chemical-resistant nitrile gloves and organic vapor respirators.',
      'Keep solvent containers covered with spring-loaded flame arrester lids.'
    ],
    steps: [
      {
        stepNo: 1,
        instruction: 'Scuff lasted upper bottom perimeter with rotary wire brush to remove silicone release agents.',
        keyPoint: 'Rough to uniform 0.2mm depth without cutting stitch cords.',
        reason: 'Roughing creates micro-pores critical for polyurethane glue mechanical keying.'
      },
      {
        stepNo: 2,
        instruction: 'Apply water-based poly-cement coating evenly across bottom upper and rubber outsole cavity.',
        keyPoint: 'Keep glue 1mm inside the outer lasting line.',
        reason: 'Excess glue squeezes out onto exterior shoe leather creating aesthetic rejects.'
      },
      {
        stepNo: 3,
        instruction: 'Pass both assemblies through infrared conveyor tunnel for 90 seconds at 75°C.',
        keyPoint: 'Confirm tackiness with touch test before joining.',
        reason: 'Incomplete drying causes weak molecular cross-linking and delamination.'
      },
      {
        stepNo: 4,
        instruction: 'Fit shoe into hydraulic inflatable bladder press, clamping heel and toe simultaneous.',
        keyPoint: 'Verify pressure gauge reads 3.8 Bar throughout 15s dwell.',
        reason: 'Guarantees 360-degree contour contact without crushed midsole foam.'
      }
    ],
    createdAt: '2026-05-15T11:00:00Z',
    updatedAt: '2026-05-20T16:00:00Z'
  },
  {
    id: 'opl-4',
    title: 'RUBBER PROCESS',
    department: 'Rubber',
    category: 'Process',
    process: 'Rubber Process',
    lineNo: 'Line 4',
    style: 'DT-Vulcan-Core',
    topic: 'Compression Mold Temperature & Outsole Vulcanization',
    producerDate: '2026-05-18',
    reviewStatus: 'Reviewed',
    reviewedBy: 'Carlos Reyes (QA Specialist)',
    reviewedDate: '2026-05-19',
    approvalStatus: 'Approved',
    approvedBy: 'John Smith (T&D Manager)',
    approvedDate: '2026-05-20',
    preparedBy: 'Kay Anne Mendoza (CSR / Admin)',
    imageUrl: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=800&auto=format&fit=crop',
    isFavorite: false,
    docNo: 'DT-OPL-RB-004',
    revNo: '01',
    description: 'Raw rubber compounding, sheet pre-forming, hydraulic compression platen molding, and post-cure flash trimming. Sets temperature, cure duration, and sulfur cross-linking standards to prevent undercure or overbaked brittleness.',
    objectives: 'Achieve DIN abrasion resistance ≤ 120 mm³, Shore A hardness 62 ± 2, and complete flash separation without damaging traction lug profiles.',
    keyPoints: [
      'Mold upper platen temperature: 165°C ± 2°C; lower platen: 160°C ± 2°C.',
      'Weigh rubber preform slug accurately to within ± 1.5 grams of target spec.',
      'Execute mold bump/degas cycle at 15 seconds to vent trapped air pockets.',
      'Cool molded outsoles in water bath for 60 seconds immediately post-ejection.'
    ],
    safetyPrecautions: [
      'Thermal insulation Kevlar sleeves and heat-resistant gloves mandatory.',
      'Pinch point hazard: keep both hands clear of closing platen jaws.',
      'Ensure local exhaust ventilation is operational to capture vulcanizing vapors.'
    ],
    steps: [
      {
        stepNo: 1,
        instruction: 'Spray semi-permanent silicone mold release lightly onto cavity grooves.',
        keyPoint: 'Wipe excess release agent with lint-free cotton cloth.',
        reason: 'Excess mold release causes poor paint/glue adhesion during subsequent lasting.'
      },
      {
        stepNo: 2,
        instruction: 'Center weighed raw rubber preform slug into heel and forefoot cavities.',
        keyPoint: 'Ensure preform temperature is room temperature (25°C - 30°C).',
        reason: 'Cold preforms create uneven melt flow and void cavities in sole lugs.'
      },
      {
        stepNo: 3,
        instruction: 'Initiate cure cycle: 380 seconds at 150 kg/cm² platen clamping pressure.',
        keyPoint: 'Verify digital countdown timer runs without interruption.',
        reason: 'Undercured rubber exhibits high permanent set and rapid tread wear.'
      },
      {
        stepNo: 4,
        instruction: 'Extract cured outsole using brass hook tool and place into cold quench tank.',
        keyPoint: 'Inspect tread pattern for zero porosity or short shots.',
        reason: 'Rapid quenching locks in dimensional stability and prevents sole warpage.'
      }
    ],
    createdAt: '2026-05-18T13:45:00Z',
    updatedAt: '2026-05-20T17:30:00Z'
  },
  {
    id: 'opl-5',
    title: 'QUALITY CONTROL PROCESS',
    department: 'Quality',
    category: 'Quality',
    process: 'Inspection Process',
    lineNo: 'Line 1',
    style: 'DT-General-Standard',
    topic: 'End-of-Line Shoe Inspection & Blue Label Verification',
    producerDate: '2026-05-19',
    reviewStatus: 'Reviewed',
    reviewedBy: 'Sarah Jenkins (T&D Lead)',
    reviewedDate: '2026-05-20',
    approvalStatus: 'Approved',
    approvedBy: 'Robert Vance (Floor Director)',
    approvedDate: '2026-05-21',
    preparedBy: 'Kay Anne Mendoza (CSR / Admin)',
    imageUrl: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?q=80&w=800&auto=format&fit=crop',
    isFavorite: false,
    docNo: 'DT-OPL-QC-005',
    revNo: '02',
    description: 'Comprehensive 100% final cosmetic and functional inspection standard: upper symmetry, collar height gauge check, zero needle punctures, outsole adhesion check, and packaging tag accuracy.',
    objectives: 'Maintain zero defect escape to customer (AQL 0.65 Major / 1.5 Minor), ensure matching pair color consistency, and verify complete barcode traceability.',
    keyPoints: [
      'Perform 6-point visual clockwise inspection rotation on both left and right shoes.',
      'Check pair height tolerance: difference must not exceed 1.0mm.',
      'Check inside lining for protruding needle points or sharp cement lumps.',
      'Scan UPC barcode label to verify size and style match carton manifest.'
    ],
    safetyPrecautions: [
      'Inspect shoe interior carefully with safety probe before inserting bare hands.',
      'Handle sharp inspection scissors and trimming blades pointing downward.'
    ],
    steps: [
      {
        stepNo: 1,
        instruction: 'Place pair on inspection turntable under 1000 Lux daylight-balanced lamp.',
        keyPoint: 'Check color shading between left and right shoes.',
        reason: 'Different dye lots create mismatched pairs that fail brand customer audits.'
      },
      {
        stepNo: 2,
        instruction: 'Measure backstay collar height using digital vernier height gauge.',
        keyPoint: 'Tolerance must be within ± 1.0mm of style standard.',
        reason: 'Uneven collar height causes ankle friction and consumer returns.'
      },
      {
        stepNo: 3,
        instruction: 'Pass both shoes through dual-head conveyor metal detector.',
        keyPoint: 'Sensitivity test piece must trigger auto-reject chime at 1.0mm Fe.',
        reason: 'Prevents broken needle fragments from reaching retail end-users.'
      }
    ],
    createdAt: '2026-05-19T08:30:00Z',
    updatedAt: '2026-05-21T09:00:00Z'
  },
  {
    id: 'opl-6',
    title: 'MAINTENANCE PROCESS',
    department: 'Maintenance',
    category: 'Maintenance',
    process: 'Preventive Maintenance',
    lineNo: 'Line 2',
    style: 'All Styles',
    topic: 'Daily TPM & Needle Bar Lubrication Procedure',
    producerDate: '2026-05-20',
    reviewStatus: 'Reviewed',
    reviewedBy: 'Elena Torres (Safety Officer)',
    reviewedDate: '2026-05-20',
    approvalStatus: 'Approved',
    approvedBy: 'John Smith (T&D Manager)',
    approvedDate: '2026-05-21',
    preparedBy: 'Kay Anne Mendoza (CSR / Admin)',
    imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=800&auto=format&fit=crop',
    isFavorite: false,
    docNo: 'DT-OPL-MN-006',
    revNo: '01',
    description: 'Shift-based Total Productive Maintenance (TPM) protocol for sewing line mechanics: lint blowdown, pneumatic reservoir drainage, oil wick flow inspection, and rotary hook timing calibration.',
    objectives: 'Prevent premature needle bar bushing wear, eliminate oil spray contamination on upper fabrics, and maintain machine uptime at 99.2%.',
    keyPoints: [
      'Use high-purity white mineral oil ISO VG 10 only.',
      'Drain pneumatic moisture trap filter daily before startup.',
      'Check hook-to-needle clearance with 0.05mm feeler gauge.',
      'Sign daily TPM yellow tag on machine head.'
    ],
    safetyPrecautions: [
      'Lock out electrical breaker before opening motor pulley cover.',
      'Wear safety glasses when using compressed air blow gun (max 30 PSI).'
    ],
    steps: [
      {
        stepNo: 1,
        instruction: 'Power off machine main switch and disconnect air supply coupler.',
        keyPoint: 'Apply lock-out tag to foot pedal switch.',
        reason: 'Accidental pedal tap while fingers are in hook assembly causes severe injury.'
      },
      {
        stepNo: 2,
        instruction: 'Remove needle plate and blow away compressed lint from feed dog teeth.',
        keyPoint: 'Point blow gun away from coworkers.',
        reason: 'Lint compaction prevents smooth feed dog stroke and causes stitch skips.'
      },
      {
        stepNo: 3,
        instruction: 'Add 2 drops of white oil to rotary hook race via oil wick.',
        keyPoint: 'Run machine on scrap fabric for 10 seconds to expel excess oil.',
        reason: 'Excess oil will stain white shoe fabrics on production run.'
      }
    ],
    createdAt: '2026-05-20T10:15:00Z',
    updatedAt: '2026-05-21T11:00:00Z'
  }
];
