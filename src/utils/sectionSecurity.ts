/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Enterprise Section-Level Security & Access Control Engine for DATIAN CSR HUB
 * Enforces strict section-specific boundaries for Section Leaders:
 * - A Section Leader can ONLY access their assigned section/building
 * - Department-wide access is strictly prohibited for Section Leaders
 * - Database, API, URL, and UI filter level enforcement
 */

export interface SecurityUserContext {
  id?: string;
  employeeNo?: string;
  name?: string;
  role?: string;
  department?: string;
  assignedSection?: string;
  section?: string;
}

/**
 * Canonical normalization of section names to prevent case or whitespace bypass
 */
export function normalizeSection(raw?: string | null): string {
  if (!raw) return '';
  return String(raw)
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

/**
 * Intelligently resolve the exact section / building for any employee or record
 */
export function resolveRecordSection(record: any): string {
  if (!record) return 'General';

  // 1. Explicit section field on record
  if (record.section && typeof record.section === 'string' && record.section.trim()) {
    const s = record.section.trim();
    if (s.toLowerCase() !== 'general' && s.toLowerCase() !== 'all') {
      return s;
    }
  }

  // 2. Assigned Section (e.g. for user accounts)
  if (record.assignedSection && typeof record.assignedSection === 'string' && record.assignedSection.trim()) {
    return record.assignedSection.trim();
  }
  if (record.assigned_section && typeof record.assigned_section === 'string' && record.assigned_section.trim()) {
    return record.assigned_section.trim();
  }

  // 3. Group field (e.g. from trainee lists / stitching schedules)
  if (record.group && typeof record.group === 'string' && record.group.trim()) {
    const g = record.group.trim();
    if (g.startsWith('Stitching') || g.startsWith('Assembly') || g.includes('Rubber') || g.startsWith('Cutting')) {
      return g;
    }
  }

  // 4. Resolve from Department name pattern
  const dept = String(record.department || record.dept || record.departmentName || '').trim();
  const deptUpper = dept.toUpperCase();

  // Stitching sections
  if (deptUpper.includes('STITCH')) {
    if (/STITCHING\s*(?:LINE\s*)?A\d*|STITCHING\s*(?:BUILDING\s*)?A|STITCHING\s*A\b/i.test(dept)) {
      return 'Stitching A';
    }
    if (/STITCHING\s*(?:LINE\s*)?B\d*|STITCHING\s*(?:BUILDING\s*)?B|STITCHING\s*B\b/i.test(dept)) {
      return 'Stitching B';
    }
    if (/STITCHING\s*(?:LINE\s*)?C\d*|STITCHING\s*C\b/i.test(dept)) {
      return 'Stitching C';
    }
    if (/STITCHING\s*(?:LINE\s*)?D\d*|STITCHING\s*D\b/i.test(dept)) {
      return 'Stitching D';
    }
    if (/STITCHING\s*(?:LINE\s*)?E\d*|STITCHING\s*E\b/i.test(dept)) {
      return 'Stitching E';
    }
    return 'Stitching A'; // Default factory Stitching division primary
  }

  // Assembly sections
  if (deptUpper.includes('ASSEMBL')) {
    if (/ASSEMBLY.*CHEMICAL.*A|ASSEMBLY.*LINE.*A\d+|ASSEMBLY.*MIDSOLE.*A|ASSEMBLY.*SHOELAST.*A|ASSEMBLY.*VULCANIZING.*A|ASSEMBLY\s*A\b/i.test(dept)) {
      return 'Assembly A';
    }
    if (/ASSEMBLY.*CHEMICAL.*B|ASSEMBLY.*LINE.*B\d+|ASSEMBLY.*REPACKING.*B|ASSEMBLY.*VULCANIZING.*B|ASSEMBLY\s*B\b/i.test(dept)) {
      return 'Assembly B';
    }
    return 'Assembly A';
  }

  // Rubber section
  if (deptUpper.includes('RUBBER')) {
    return 'Rubber';
  }

  // Cutting sections
  if (deptUpper.includes('CUTT')) {
    if (/CUTTING.*AUTO.*A|CUTTING.*BUILDING.*A|CUTTING.*GROUP.*A|CUTTING.*PREPARATION.*A|CUTTING.*PROCESSING.*A|CUTTING\s*A\b/i.test(dept)) {
      return 'Cutting A';
    }
    if (/CUTTING.*AUTO.*B|CUTTING.*GROUP.*B|CUTTING.*PREPARATION.*B|CUTTING.*PROCESSING.*B|CUTTING\s*B\b/i.test(dept)) {
      return 'Cutting B';
    }
    if (/CUTTING.*BUILDING.*C|CUTTING\s*C\b/i.test(dept)) {
      return 'Cutting C';
    }
    if (/CUTTING.*AUTO.*D|CUTTING.*GROUP.*D|CUTTING.*PREPARATION.*D|CUTTING.*PROCESSING.*D|CUTTING\s*D\b/i.test(dept)) {
      return 'Cutting D';
    }
    if (/CUTTING.*AUTO.*E|CUTTING.*GROUP.*E|CUTTING.*PREPARATION.*E|CUTTING.*PROCESSING.*E|CUTTING\s*E\b/i.test(dept)) {
      return 'Cutting E';
    }
    return 'Cutting A';
  }

  // Fallback
  return dept || 'General';
}

/**
 * Resolve the parent department (e.g. Stitching, Assembly, Cutting, Rubber, Administration)
 */
export function resolveRecordDepartment(record: any): string {
  if (!record) return 'General';
  const raw = String(record.department || record.dept || record.departmentName || '').trim();
  const upper = raw.toUpperCase();

  if (upper.includes('STITCH')) return 'Stitching';
  if (upper.includes('ASSEMBL')) return 'Assembly';
  if (upper.includes('RUBBER')) return 'Rubber';
  if (upper.includes('CUTT')) return 'Cutting';
  if (upper.includes('QC') || upper.includes('QUAL')) return 'Quality';
  if (upper.includes('ADMIN')) return 'Administration';
  if (upper.includes('HR')) return 'HR';
  if (upper.includes('PMC')) return 'PMC';
  if (upper.includes('FINANCE')) return 'Finance';

  return raw || 'General';
}

/**
 * Check if the user is a Section Leader
 */
export function isSectionLeader(user?: SecurityUserContext | null): boolean {
  if (!user || !user.role) return false;
  return String(user.role).trim().toLowerCase() === 'section leader';
}

/**
 * Get user's assigned section
 */
export function getUserAssignedSection(user?: SecurityUserContext | null): string {
  if (!user) return '';
  return String(user.assignedSection || user.section || '').trim();
}

/**
 * Core Section Leader Access Verification
 * Strict Rule:
 * IF User Role = Section Leader
 * THEN User can ONLY READ/WRITE records where:
 * record.department = user's department AND record.section = user's assigned section
 */
export function canAccessRecord(
  user?: SecurityUserContext | null,
  record?: any
): { allowed: boolean; reason?: string } {
  // If no user context or user is Admin -> Full access
  if (!user) return { allowed: true };
  if (user.role === 'Admin') return { allowed: true };

  // If NOT a Section Leader, normal role policies apply
  if (!isSectionLeader(user)) {
    return { allowed: true };
  }

  // STRICT SECTION LEADER ENFORCEMENT
  const userAssignedSection = getUserAssignedSection(user);
  if (!userAssignedSection) {
    return {
      allowed: false,
      reason: 'Access Denied: Section Leader account has no assigned section configured.'
    };
  }

  const recordSection = resolveRecordSection(record);
  const userSectionNorm = normalizeSection(userAssignedSection);
  const recordSectionNorm = normalizeSection(recordSection);

  // Exact section boundary check
  const sectionMatches = 
    recordSectionNorm === userSectionNorm ||
    recordSectionNorm.startsWith(userSectionNorm) ||
    userSectionNorm.startsWith(recordSectionNorm);

  if (!sectionMatches) {
    return {
      allowed: false,
      reason: `Access Denied: You are authenticated as Section Leader for [${userAssignedSection}]. Access to records in [${recordSection}] is strictly restricted.`
    };
  }

  // Department check if user has an explicit department
  if (user.department) {
    const userDept = resolveRecordDepartment({ department: user.department });
    const recordDept = resolveRecordDepartment(record);
    if (normalizeSection(userDept) !== normalizeSection(recordDept)) {
      return {
        allowed: false,
        reason: `Access Denied: Section Leader is restricted to [${userDept} - ${userAssignedSection}]. Cannot access [${recordDept}].`
      };
    }
  }

  return { allowed: true };
}

/**
 * Filter an array of records to ONLY what the current user is permitted to see
 */
export function filterRecordsForUser<T>(user?: SecurityUserContext | null, records?: T[]): T[] {
  if (!records || !Array.isArray(records)) return [];
  if (!user || user.role === 'Admin') return records;
  if (!isSectionLeader(user)) return records;

  return records.filter(record => canAccessRecord(user, record).allowed);
}

/**
 * Verify file access for Section Leaders
 */
export function canAccessFile(user?: SecurityUserContext | null, file?: any): boolean {
  if (!user || user.role === 'Admin') return true;
  if (!isSectionLeader(user)) return true;
  if (!file) return false;

  const fileSection = file.section || resolveRecordSection(file);
  const userAssignedSection = getUserAssignedSection(user);

  // General company policies / brand assets are viewable, but specific section files are restricted
  if (file.category === 'Company Policy' || file.category === 'General') {
    return true;
  }

  return normalizeSection(fileSection) === normalizeSection(userAssignedSection);
}

/**
 * List of standard sections for corporate administrative assignment
 */
export const AVAILABLE_SECTIONS = [
  'Stitching A',
  'Stitching B',
  'Stitching C',
  'Stitching D',
  'Stitching E',
  'Assembly A',
  'Assembly B',
  'Rubber',
  'Cutting A',
  'Cutting B',
  'Cutting C',
  'Cutting D',
  'Cutting E'
];

/**
 * Default Section Leader Accounts for Testing and Initial Setup
 */
export const DEFAULT_SECTION_LEADERS: Array<{
  id: string;
  employeeNo: string;
  name: string;
  fullName: string;
  department: string;
  position: string;
  role: 'Section Leader';
  status: 'Active';
  assignedSection: string;
  section: string;
  avatar: string;
  email: string;
}> = [
  {
    id: 'sl-stitching-a',
    employeeNo: 'SL-STITCH-A',
    name: 'Section Leader Stitching A',
    fullName: 'Section Leader - Stitching A (Plant 1)',
    department: 'Stitching',
    position: 'Section Leader',
    role: 'Section Leader',
    status: 'Active',
    assignedSection: 'Stitching A',
    section: 'Stitching A',
    avatar: '🧵',
    email: 'leader.stitching.a@dtpshoes.com'
  },
  {
    id: 'sl-stitching-b',
    employeeNo: 'SL-STITCH-B',
    name: 'Section Leader Stitching B',
    fullName: 'Section Leader - Stitching B (Plant 2)',
    department: 'Stitching',
    position: 'Section Leader',
    role: 'Section Leader',
    status: 'Active',
    assignedSection: 'Stitching B',
    section: 'Stitching B',
    avatar: '🪡',
    email: 'leader.stitching.b@dtpshoes.com'
  },
  {
    id: 'sl-assembly-a',
    employeeNo: 'SL-ASSY-A',
    name: 'Section Leader Assembly A',
    fullName: 'Section Leader - Assembly A (Line 1-12)',
    department: 'Assembly',
    position: 'Section Leader',
    role: 'Section Leader',
    status: 'Active',
    assignedSection: 'Assembly A',
    section: 'Assembly A',
    avatar: '👟',
    email: 'leader.assembly.a@dtpshoes.com'
  }
];
