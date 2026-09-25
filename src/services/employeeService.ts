/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Employee } from '../types';

export interface SupabaseEmployeeRow {
  id: number;
  employee_no: string;
  employee_name: string;
  department: string;
  onboard_date: string | null;
  position: string;
  created_at?: string;
  updated_at?: string;
  full_name?: string | null;
  gender?: string | null;
  hire_date?: string | null;
  done?: boolean | null;
  skill_level?: string | null;
  shift?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  avatar?: string | null;
  status?: string | null;
}

/**
 * Maps a Supabase row to the frontend Employee interface
 */
export function mapSupabaseRowToEmployee(
  row: SupabaseEmployeeRow
): Employee {
  return {
    id: String(row.id),
    employeeNo: row.employee_no || '',
    name: row.employee_name || '',
    fullName: row.full_name || undefined,
    department: row.department || 'General',
    position: row.position || 'Staff',
    gender: row.gender || undefined,
    hireDate: row.hire_date || undefined,
    onBoardDate: row.onboard_date || undefined,
    status: (row.status as any) || 'Active',
    done: Boolean(row.done),
    skillLevel: row.skill_level || undefined,
    shift: row.shift || undefined,
    email: row.email || undefined,
    phone: row.phone || undefined,
    notes: row.notes || undefined,
    avatar: row.avatar || undefined,
  };
}

/**
 * Maps a frontend Employee object to Supabase
 */
export function mapEmployeeToSupabasePayload(
  emp: Employee
): Partial<SupabaseEmployeeRow> {
  const payload: Partial<SupabaseEmployeeRow> = {
    employee_no: emp.employeeNo,
    employee_name: emp.name,
    department: emp.department,
    position: emp.position,
    status: emp.status || 'Active',
    done: Boolean(emp.done),
  };

  if (emp.fullName !== undefined) {
    payload.full_name = emp.fullName || null;
  }

  if (emp.gender !== undefined) {
    payload.gender = emp.gender || null;
  }

  if (emp.hireDate !== undefined) {
    payload.hire_date = emp.hireDate || null;
  }

  if (emp.onBoardDate !== undefined) {
    payload.onboard_date = emp.onBoardDate || null;
  }

  if (emp.skillLevel !== undefined) {
    payload.skill_level = emp.skillLevel || null;
  }

  if (emp.shift !== undefined) {
    payload.shift = emp.shift || null;
  }

  if (emp.email !== undefined) {
    payload.email = emp.email || null;
  }

  if (emp.phone !== undefined) {
    payload.phone = emp.phone || null;
  }

  if (emp.notes !== undefined) {
    payload.notes = emp.notes || null;
  }

  if (emp.avatar !== undefined) {
    payload.avatar = emp.avatar || null;
  }

  payload.updated_at = new Date().toISOString();

  return payload;
}

/**
 * Fetch all employees from Supabase with safe timeout and offline fallback
 */
export async function fetchEmployeesFromSupabase(): Promise<{
  data: Employee[] | null;
  error: Error | null;
}> {
  if (!isSupabaseConfigured) {
    return {
      data: null,
      error: null,
    };
  }

  try {
    const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) =>
      setTimeout(
        () =>
          resolve({
            data: null,
            error: new Error('Supabase network timeout - using cached data'),
          }),
        3000
      )
    );

    const fetchPromise = (async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        return {
          data: null,
          error: new Error(error.message),
        };
      }

      if (!data) {
        return {
          data: [],
          error: null,
        };
      }

      const mapped = (data as SupabaseEmployeeRow[]).map(mapSupabaseRowToEmployee);
      return {
        data: mapped,
        error: null,
      };
    })();

    return await Promise.race([fetchPromise, timeoutPromise]);
  } catch (err: any) {
    console.warn('[Supabase] fetchEmployeesFromSupabase:', err?.message || err);

    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Insert a new employee into Supabase
 */
export async function insertEmployeeToSupabase(
  emp: Employee
): Promise<{
  data: Employee | null;
  error: Error | null;
}> {
  if (!isSupabaseConfigured) {
    return {
      data: emp,
      error: null,
    };
  }

  try {
    const payload = mapEmployeeToSupabasePayload(emp);

    const { data, error } = await supabase
      .from('employees')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.warn('[Supabase] Insert employee notice:', error.message);

      return {
        data: null,
        error: new Error(error.message),
      };
    }

    if (data) {
      return {
        data: mapSupabaseRowToEmployee(data as SupabaseEmployeeRow),
        error: null,
      };
    }

    return {
      data: emp,
      error: null,
    };
  } catch (err: any) {
    console.warn('[Supabase] Insert employee exception:', err?.message || err);

    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Update an existing employee in Supabase
 */
export async function updateEmployeeInSupabase(
  emp: Employee
): Promise<{
  success: boolean;
  error: Error | null;
}> {
  if (!isSupabaseConfigured) {
    return {
      success: true,
      error: null,
    };
  }

  try {
    const payload = mapEmployeeToSupabasePayload(emp);
    const isNumericId = /^\d+$/.test(String(emp.id));

    const query = isNumericId
      ? supabase
          .from('employees')
          .update(payload)
          .eq('id', Number(emp.id))
      : supabase
          .from('employees')
          .update(payload)
          .eq('employee_no', emp.employeeNo);

    const { error } = await query;

    if (error) {
      console.warn('[Supabase] Update employee notice:', error.message);

      return {
        success: false,
        error: new Error(error.message),
      };
    }

    return {
      success: true,
      error: null,
    };
  } catch (err: any) {
    console.warn('[Supabase] Update employee exception:', err?.message || err);

    return {
      success: false,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * SAVE EMPLOYEE
 *
 * New employee: INSERT
 * Existing employee: UPDATE
 */
export async function saveEmployeeToSupabase(
  emp: Employee
): Promise<{
  data: Employee | null;
  error: Error | null;
}> {
  if (!isSupabaseConfigured) {
    return {
      data: emp,
      error: null,
    };
  }

  try {
    const payload = mapEmployeeToSupabasePayload(emp);
    const isNumericId = /^\d+$/.test(String(emp.id));

    /*
     * EXISTING EMPLOYEE
     */
    if (isNumericId) {
      const { data, error } = await supabase
        .from('employees')
        .update(payload)
        .eq('id', Number(emp.id))
        .select()
        .single();

      if (error) {
        console.warn('[Supabase] Save/update employee notice:', error.message);

        return {
          data: null,
          error: new Error(error.message),
        };
      }

      if (data) {
        return {
          data: mapSupabaseRowToEmployee(data as SupabaseEmployeeRow),
          error: null,
        };
      }

      return {
        data: emp,
        error: null,
      };
    }

    /*
     * NEW EMPLOYEE
     */
    const { data, error } = await supabase
      .from('employees')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.warn('[Supabase] Save/insert employee notice:', error.message);

      return {
        data: null,
        error: new Error(error.message),
      };
    }

    if (data) {
      return {
        data: mapSupabaseRowToEmployee(data as SupabaseEmployeeRow),
        error: null,
      };
    }

    return {
      data: emp,
      error: null,
    };
  } catch (err: any) {
    console.warn('[Supabase] Save employee exception:', err?.message || err);

    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Delete one employee
 */
export async function deleteEmployeeFromSupabase(
  emp: Employee
): Promise<{
  success: boolean;
  error: Error | null;
}> {
  if (!isSupabaseConfigured) {
    return {
      success: true,
      error: null,
    };
  }

  try {
    const isNumericId = /^\d+$/.test(String(emp.id));

    const query = isNumericId
      ? supabase
          .from('employees')
          .delete()
          .eq('id', Number(emp.id))
      : supabase
          .from('employees')
          .delete()
          .eq('employee_no', emp.employeeNo);

    const { error } = await query;

    if (error) {
      console.warn('[Supabase] Delete employee notice:', error.message);

      return {
        success: false,
        error: new Error(error.message),
      };
    }

    return {
      success: true,
      error: null,
    };
  } catch (err: any) {
    console.warn('[Supabase] Delete employee exception:', err?.message || err);

    return {
      success: false,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Bulk delete employees
 */
export async function bulkDeleteEmployeesFromSupabase(
  employeesToDelete: Employee[]
): Promise<{
  success: boolean;
  error: Error | null;
}> {
  if (!isSupabaseConfigured) {
    return {
      success: true,
      error: null,
    };
  }

  try {
    const numericIds = employeesToDelete
      .filter(e => /^\d+$/.test(String(e.id)))
      .map(e => Number(e.id));

    const empNos = employeesToDelete
      .map(e => e.employeeNo)
      .filter(Boolean);

    if (numericIds.length > 0) {
      const { error } = await supabase
        .from('employees')
        .delete()
        .in('id', numericIds);

      if (error) {
        console.warn('[Supabase] Bulk delete by ID notice:', error.message);

        return {
          success: false,
          error: new Error(error.message),
        };
      }
    }

    if (empNos.length > 0) {
      const { error } = await supabase
        .from('employees')
        .delete()
        .in('employee_no', empNos);

      if (error) {
        console.warn('[Supabase] Bulk delete by employee number notice:', error.message);

        return {
          success: false,
          error: new Error(error.message),
        };
      }
    }

    return {
      success: true,
      error: null,
    };
  } catch (err: any) {
    console.warn('[Supabase] Bulk delete exception:', err?.message || err);

    return {
      success: false,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Bulk insert employees
 */
export async function bulkInsertEmployeesToSupabase(
  employees: Employee[]
): Promise<{
  success: boolean;
  error: Error | null;
}> {
  if (!isSupabaseConfigured) {
    return {
      success: true,
      error: null,
    };
  }

  try {
    const payloads = employees.map(e => mapEmployeeToSupabasePayload(e));
    const CHUNK_SIZE = 50;

    for (let i = 0; i < payloads.length; i += CHUNK_SIZE) {
      const chunk = payloads.slice(i, i + CHUNK_SIZE);
      const { error } = await supabase.from('employees').insert(chunk);

      if (error) {
        console.warn('[Supabase] Bulk insert notice:', error.message);

        return {
          success: false,
          error: new Error(error.message),
        };
      }
    }

    return {
      success: true,
      error: null,
    };
  } catch (err: any) {
    console.warn('[Supabase] Bulk insert exception:', err?.message || err);

    return {
      success: false,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Merge Supabase employee records with local records without duplicates.
 */
export function mergeSupabaseEmployeesWithLocal(
  local: Employee[],
  cloud: Employee[]
): Employee[] {
  if (!cloud || cloud.length === 0) {
    return local;
  }

  const map = new Map<string, Employee>();

  // Add local employees first
  local.forEach(emp => {
    if (!emp) return;
    if (emp.employeeNo) {
      map.set(emp.employeeNo, emp);
    } else {
      map.set(emp.id, emp);
    }
  });

  // Supabase records override local records
  cloud.forEach(cloudEmp => {
    if (!cloudEmp) return;
    if (cloudEmp.employeeNo && map.has(cloudEmp.employeeNo)) {
      const existing = map.get(cloudEmp.employeeNo)!;
      map.set(cloudEmp.employeeNo, {
        ...existing,
        ...cloudEmp,
        traineeLeader: existing.traineeLeader ?? cloudEmp.traineeLeader,
        isTraineeLeader: existing.isTraineeLeader ?? cloudEmp.isTraineeLeader,
        leadershipTrainingStatus: existing.leadershipTrainingStatus ?? cloudEmp.leadershipTrainingStatus,
        leadershipYear: existing.leadershipYear ?? cloudEmp.leadershipYear,
        leadershipBatch: existing.leadershipBatch ?? cloudEmp.leadershipBatch,
        id: cloudEmp.id || existing.id,
      });
    } else if (cloudEmp.employeeNo) {
      map.set(cloudEmp.employeeNo, cloudEmp);
    } else {
      map.set(cloudEmp.id, cloudEmp);
    }
  });

  const merged = Array.from(map.values());
  const seenIds = new Set<string>();
  
  return merged.map((emp, index) => {
    let finalId = emp.id ? String(emp.id) : `emp-${index}`;
    if (seenIds.has(finalId)) {
      finalId = `${finalId}_${index}`;
    }
    seenIds.add(finalId);
    return { ...emp, id: finalId };
  });
}
