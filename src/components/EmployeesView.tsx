/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Download,
  Upload,
  Printer,
  Trash2,
  Edit3,
  Eye,
  CheckCircle2,
  AlertCircle,
  Building2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  FileSpreadsheet,
  ArrowUpDown,
  CheckSquare,
  Briefcase,
  RefreshCw,
  Award,
  Sparkles,
  GraduationCap,
  Star,
  ShieldCheck,
  FileText,
  Info,
  HelpCircle,
  CheckCheck
} from 'lucide-react';

import { Employee, UserRole, AuthenticatedEmployee } from '../types';
import { EditableText } from './EditableText';
import leadershipTraineesRaw from '../data/leadershipSheetData.json';
import { 
  isSectionLeader, 
  getUserAssignedSection, 
  filterRecordsForUser,
  canAccessRecord,
  resolveRecordSection
} from '../utils/sectionSecurity';

import {
  insertEmployeeToSupabase,
  updateEmployeeInSupabase,
  deleteEmployeeFromSupabase,
  bulkDeleteEmployeesFromSupabase,
  bulkInsertEmployeesToSupabase,
  fetchEmployeesFromSupabase,
  mergeSupabaseEmployeesWithLocal
} from '../services/employeeService';

interface EmployeesViewProps {
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  role: UserRole;
  addToast: (
    title: string,
    message: string,
    type: 'success' | 'warning' | 'info'
  ) => void;
  registerBackHandler?: (handler: () => boolean) => () => void;
  currentEmployee?: AuthenticatedEmployee | null;
}

export default function EmployeesView({
  employees,
  setEmployees,
  role,
  addToast,
  registerBackHandler,
  currentEmployee
}: EmployeesViewProps) {
  const isLeader = isSectionLeader(currentEmployee);
  const userAssignedSection = isLeader ? getUserAssignedSection(currentEmployee) : null;

  // Base list of employees scoped strictly for Section Leader
  const scopedEmployees = useMemo(() => {
    if (isLeader) {
      return filterRecordsForUser(currentEmployee, employees);
    }
    return employees;
  }, [employees, isLeader, currentEmployee]);

  // =========================================================
  // STATES
  // =========================================================

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState(isLeader && userAssignedSection ? userAssignedSection : 'ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState<
    'ALL' | 'TRAINEE_LEADERS' | 'COMPLETED' | 'NEW_TRAINEE_LEADER'
  >('ALL');

  const [sortField, setSortField] =
    useState<keyof Employee>('employeeNo');
  const [sortAsc, setSortAsc] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [jumpPageInput, setJumpPageInput] = useState('');

  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set()
  );

  const [isSyncing, setIsSyncing] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] =
    useState<Employee | null>(null);
  const [viewingEmployee, setViewingEmployee] =
    useState<Employee | null>(null);
  const [deletingEmployee, setDeletingEmployee] =
    useState<Employee | null>(null);

  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] =
    useState(false);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isUnmatchedModalOpen, setIsUnmatchedModalOpen] = useState(false);
  const [unmatchedSearch, setUnmatchedSearch] = useState('');
  const [unmatchedTab, setUnmatchedTab] = useState<'ALL' | 'MATCHED' | 'UNMATCHED'>('ALL');

  const [formData, setFormData] = useState<Partial<Employee>>({
    employeeNo: '',
    name: '',
    department: 'Stitching Line A1',
    position: 'Stitching Operator',
    onBoardDate: new Date().toISOString().split('T')[0],
    status: 'Active',
    traineeLeader: 'No',
    leadershipTrainingStatus: 'None'
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // =========================================================
  // LOAD EMPLOYEES FROM SUPABASE (Non-blocking Background Sync)
  // =========================================================

  useEffect(() => {
    let mounted = true;

    const loadEmployees = async () => {
      try {
        const result = await fetchEmployeesFromSupabase();

        if (!mounted) return;

        if (result.error) {
          console.warn(
            '[Supabase] Background employee sync notice:',
            result.error.message
          );
          return;
        }

        if (result.data && result.data.length > 0) {
          setEmployees(prev =>
            mergeSupabaseEmployeesWithLocal(prev, result.data!)
          );
        }
      } catch (error) {
        console.warn(
          '[Supabase] Background load notice:',
          error
        );
      }
    };

    loadEmployees();

    return () => {
      mounted = false;
    };
  }, [setEmployees]);

  // =========================================================
  // BACK HANDLER
  // =========================================================

  useEffect(() => {
    if (!registerBackHandler) return;

    const unregister = registerBackHandler(() => {
      if (viewingEmployee) {
        setViewingEmployee(null);
        return true;
      }

      if (editingEmployee) {
        setEditingEmployee(null);
        return true;
      }

      if (isAddModalOpen) {
        setIsAddModalOpen(false);
        return true;
      }

      if (deletingEmployee) {
        setDeletingEmployee(null);
        return true;
      }

      if (isBulkDeleteModalOpen) {
        setIsBulkDeleteModalOpen(false);
        return true;
      }

      if (isImportModalOpen) {
        setIsImportModalOpen(false);
        return true;
      }

      return false;
    });

    return unregister;
  }, [
    registerBackHandler,
    viewingEmployee,
    editingEmployee,
    isAddModalOpen,
    deletingEmployee,
    isBulkDeleteModalOpen,
    isImportModalOpen
  ]);

  // ==========================================
  // DEPARTMENTS
  // ==========================================

  const departmentsList = useMemo(() => {
    if (isLeader && userAssignedSection) {
      return [userAssignedSection];
    }
    const departments = new Set<string>();

    scopedEmployees.forEach(employee => {
      if (employee.department?.trim()) {
        departments.add(employee.department.trim());
      }
    });

    return Array.from(departments).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [scopedEmployees, isLeader, userAssignedSection]);

  // =========================================================
  // KPI
  // =========================================================

  const stats = useMemo(() => {
    const total = scopedEmployees.length;

    let stitching = 0;
    let assembly = 0;
    let cutting = 0;
    let qc = 0;
    let admin = 0;
    let traineeLeaders = 0;
    let completedLeaders = 0;
    let newTraineeLeaders = 0;

    scopedEmployees.forEach(employee => {
      const department = (
        employee.department || ''
      ).toLowerCase();

      const isLeaderRole =
        employee.traineeLeader === 'Yes' ||
        Boolean(employee.isTraineeLeader) ||
        Boolean(employee.leadershipTrainingStatus);

      if (isLeaderRole) {
        traineeLeaders++;
        if (employee.leadershipTrainingStatus === 'Completed') {
          completedLeaders++;
        } else if (
          employee.leadershipTrainingStatus === 'New Trainee Leader' ||
          !employee.leadershipTrainingStatus
        ) {
          newTraineeLeaders++;
        }
      }

      if (department.includes('stitching')) {
        stitching++;
      } else if (department.includes('assembly')) {
        assembly++;
      } else if (department.includes('cutting')) {
        cutting++;
      } else if (
        department.includes('qc') ||
        department.includes('quality') ||
        department.includes('lab') ||
        department.includes('iqc') ||
        department.includes('fqa')
      ) {
        qc++;
      } else if (
        department.includes('admin') ||
        department.includes('hr') ||
        department.includes('finance') ||
        department.includes('ie') ||
        department.includes('pmc') ||
        department.includes('expat')
      ) {
        admin++;
      }
    });

    return {
      total,
      stitching,
      assembly,
      cutting,
      qc,
      admin,
      traineeLeaders,
      completedLeaders,
      newTraineeLeaders
    };
  }, [scopedEmployees]);

  const primaryLeadershipCategories = [
    {
      id: 'ALL' as const,
      label: 'All Employees',
      count: stats.total,
      icon: Users
    },
    {
      id: 'TRAINEE_LEADERS' as const,
      label: 'Trainee Leader',
      count: stats.traineeLeaders,
      icon: Award
    },
    {
      id: 'COMPLETED' as const,
      label: 'Leadership Training — Completed',
      count: stats.completedLeaders,
      icon: CheckCircle2
    },
    {
      id: 'NEW_TRAINEE_LEADER' as const,
      label: 'New Trainee Leader',
      count: stats.newTraineeLeaders,
      icon: Sparkles
    }
  ];

  const deptCategories = [
    {
      id: 'ALL',
      label: 'All Depts',
      count: stats.total
    },
    {
      id: 'Stitching',
      label: 'Stitching Dept',
      count: stats.stitching
    },
    {
      id: 'Assembly',
      label: 'Assembly Dept',
      count: stats.assembly
    },
    {
      id: 'Cutting',
      label: 'Cutting Dept',
      count: stats.cutting
    },
    {
      id: 'QC',
      label: 'Quality / QC',
      count: stats.qc
    },
    {
      id: 'Admin',
      label: 'Admin / Expat',
      count: stats.admin
    }
  ];

  // =========================================================
  // TRAINEE VERIFICATION & UNMATCHED ANALYSIS
  // =========================================================

  const traineeVerificationList = useMemo(() => {
    const empByNo = new Map<string, Employee>();
    const empByName = new Map<string, Employee>();
    const empByNormalizedName = new Map<string, Employee>();

    employees.forEach(emp => {
      if (emp.employeeNo) {
        empByNo.set(emp.employeeNo.trim().toUpperCase(), emp);
      }
      if (emp.name) {
        empByName.set(emp.name.trim().toLowerCase(), emp);
        const norm = emp.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        if (norm) empByNormalizedName.set(norm, emp);
      }
    });

    return (leadershipTraineesRaw as Array<{
      sheet?: string;
      no?: number;
      employeeNo?: string;
      name?: string;
      gender?: string;
      dept?: string;
      status?: string;
      trainer?: string;
      venue?: string;
      schedule?: string;
    }>).map((trainee, idx) => {
      const rawNo = (trainee.employeeNo || '').trim().toUpperCase();
      const rawName = (trainee.name || '').trim();
      const normName = rawName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

      let matchedEmp: Employee | undefined;
      let matchType: 'EMPLOYEE_NO' | 'EXACT_NAME' | 'NORMALIZED_NAME' | 'NONE' = 'NONE';

      if (rawNo && empByNo.has(rawNo)) {
        matchedEmp = empByNo.get(rawNo);
        matchType = 'EMPLOYEE_NO';
      } else if (rawName && empByName.has(rawName.toLowerCase())) {
        matchedEmp = empByName.get(rawName.toLowerCase());
        matchType = 'EXACT_NAME';
      } else if (normName && empByNormalizedName.has(normName)) {
        matchedEmp = empByNormalizedName.get(normName);
        matchType = 'NORMALIZED_NAME';
      }

      return {
        id: `trainee-${idx}`,
        sheet: trainee.sheet || 'Leadership Training',
        employeeNo: trainee.employeeNo || '',
        name: trainee.name || '',
        gender: trainee.gender || '',
        dept: trainee.dept || '',
        trainingStatus: trainee.status || 'Active',
        trainer: trainee.trainer || '',
        venue: trainee.venue || '',
        schedule: trainee.schedule || '',
        matchedEmp,
        matchType,
        isMatched: Boolean(matchedEmp)
      };
    });
  }, [employees]);

  const traineeVerificationStats = useMemo(() => {
    const total = traineeVerificationList.length;
    const matched = traineeVerificationList.filter(t => t.isMatched).length;
    const unmatched = total - matched;
    return { total, matched, unmatched };
  }, [traineeVerificationList]);

  const filteredTraineeVerification = useMemo(() => {
    const q = unmatchedSearch.trim().toLowerCase();
    return traineeVerificationList.filter(item => {
      if (unmatchedTab === 'MATCHED' && !item.isMatched) return false;
      if (unmatchedTab === 'UNMATCHED' && item.isMatched) return false;

      if (!q) return true;

      const nameMatch = item.name.toLowerCase().includes(q);
      const deptMatch = item.dept.toLowerCase().includes(q);
      const sheetMatch = item.sheet.toLowerCase().includes(q);
      const noMatch = item.employeeNo && item.employeeNo.toLowerCase().includes(q);
      const matchedEmpMatch = item.matchedEmp && (
        item.matchedEmp.name.toLowerCase().includes(q) ||
        item.matchedEmp.employeeNo.toLowerCase().includes(q) ||
        (item.matchedEmp.department && item.matchedEmp.department.toLowerCase().includes(q))
      );

      return nameMatch || deptMatch || sheetMatch || noMatch || Boolean(matchedEmpMatch);
    });
  }, [traineeVerificationList, unmatchedTab, unmatchedSearch]);

  // =========================================================
  // FILTER + SORT
  // =========================================================

  const filteredEmployees = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return [...scopedEmployees]
      .filter(employee => {
        const isLeader =
          employee.traineeLeader === 'Yes' ||
          Boolean(employee.isTraineeLeader) ||
          Boolean(employee.leadershipTrainingStatus);

        // Filter by Leadership Category
        if (selectedCategory === 'TRAINEE_LEADERS') {
          if (!isLeader) return false;
        } else if (selectedCategory === 'COMPLETED') {
          if (employee.leadershipTrainingStatus !== 'Completed') return false;
        } else if (selectedCategory === 'NEW_TRAINEE_LEADER') {
          if (
            employee.leadershipTrainingStatus !== 'New Trainee Leader' &&
            !(isLeader && !employee.leadershipTrainingStatus)
          ) {
            return false;
          }
        }

        if (query) {
          const employeeNo = (
            employee.employeeNo || ''
          ).toLowerCase();

          const name = (
            employee.name || ''
          ).toLowerCase();

          const department = (
            employee.department || ''
          ).toLowerCase();

          const position = (
            employee.position || ''
          ).toLowerCase();

          const leaderStatus = (
            employee.leadershipTrainingStatus || ''
          ).toLowerCase();

          const batch = (
            employee.leadershipBatch || ''
          ).toLowerCase();

          const isLeaderTag = isLeader ? 'trainee leader yes' : '';

          const matches =
            employeeNo.includes(query) ||
            name.includes(query) ||
            department.includes(query) ||
            position.includes(query) ||
            leaderStatus.includes(query) ||
            batch.includes(query) ||
            isLeaderTag.includes(query);

          if (!matches) return false;
        }

        if (selectedDept !== 'ALL') {
          const department = (
            employee.department || ''
          ).toLowerCase();

          if (
            selectedDept === 'Stitching' &&
            !department.includes('stitching')
          ) {
            return false;
          }

          if (
            selectedDept === 'Assembly' &&
            !department.includes('assembly')
          ) {
            return false;
          }

          if (
            selectedDept === 'Cutting' &&
            !department.includes('cutting')
          ) {
            return false;
          }

          if (
            selectedDept === 'QC' &&
            !department.includes('qc') &&
            !department.includes('quality') &&
            !department.includes('lab') &&
            !department.includes('iqc') &&
            !department.includes('fqa')
          ) {
            return false;
          }

          if (
            selectedDept === 'Admin' &&
            !department.includes('admin') &&
            !department.includes('expat') &&
            !department.includes('hr') &&
            !department.includes('finance') &&
            !department.includes('ie') &&
            !department.includes('pmc')
          ) {
            return false;
          }

          const isCategory =
            selectedDept === 'Stitching' ||
            selectedDept === 'Assembly' ||
            selectedDept === 'Cutting' ||
            selectedDept === 'QC' ||
            selectedDept === 'Admin';

          if (!isCategory) {
            if (employee.department !== selectedDept) {
              return false;
            }
          }
        }

        if (
          selectedStatus !== 'ALL' &&
          employee.status !== selectedStatus
        ) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        let valueA = a[sortField] ?? '';
        let valueB = b[sortField] ?? '';

        if (typeof valueA === 'string') {
          valueA = valueA.toLowerCase();
        }

        if (typeof valueB === 'string') {
          valueB = valueB.toLowerCase();
        }

        if (valueA < valueB) {
          return sortAsc ? -1 : 1;
        }

        if (valueA > valueB) {
          return sortAsc ? 1 : -1;
        }

        return 0;
      });
  }, [
    scopedEmployees,
    searchQuery,
    selectedCategory,
    selectedDept,
    selectedStatus,
    sortField,
    sortAsc
  ]);

  // =========================================================
  // PAGINATION
  // =========================================================

  const totalPages = Math.max(
    1,
    Math.ceil(filteredEmployees.length / pageSize)
  );

  const safeCurrentPage = Math.min(
    currentPage,
    totalPages
  );

  const paginatedEmployees = useMemo(() => {
    const start =
      (safeCurrentPage - 1) * pageSize;

    return filteredEmployees.slice(
      start,
      start + pageSize
    );
  }, [
    filteredEmployees,
    safeCurrentPage,
    pageSize
  ]);

  // =========================================================
  // SORT
  // =========================================================

  const handleSort = (field: keyof Employee) => {
    if (sortField === field) {
      setSortAsc(prev => !prev);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // =========================================================
  // SELECTION
  // =========================================================

  const toggleSelectAllPage = () => {
    const pageIds = paginatedEmployees.map(
      employee => employee.id
    );

    const next = new Set(selectedIds);

    const allSelected =
      pageIds.length > 0 &&
      pageIds.every(id => next.has(id));

    if (allSelected) {
      pageIds.forEach(id => next.delete(id));
    } else {
      pageIds.forEach(id => next.add(id));
    }

    setSelectedIds(next);
  };

  const toggleSelectRow = (id: string) => {
    const next = new Set(selectedIds);

    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }

    setSelectedIds(next);
  };

  // =========================================================
  // ADD MODAL
  // =========================================================

  const handleOpenAddModal = () => {
    setEditingEmployee(null);

    setFormData({
      employeeNo: '',
      name: '',
      department:
        isLeader && userAssignedSection
          ? userAssignedSection
          : (departmentsList[0] || 'Stitching Line A1'),
      position: 'Stitching Operator',
      onBoardDate:
        new Date().toISOString().split('T')[0],
      status: 'Active',
      traineeLeader: 'No',
      leadershipTrainingStatus: 'None'
    });

    setIsAddModalOpen(true);
  };

  // =========================================================
  // VIEW EMPLOYEE (Strict Section Access Guard)
  // =========================================================

  const handleViewEmployee = (employee: Employee) => {
    if (isLeader) {
      const access = canAccessRecord(currentEmployee, employee);
      if (!access.allowed) {
        addToast(
          'Access Denied',
          access.reason || 'Section Leader restriction: you cannot view employees outside your assigned section.',
          'warning'
        );
        return;
      }
    }
    setViewingEmployee(employee);
  };

  // =========================================================
  // EDIT MODAL
  // =========================================================

  const handleOpenEditModal = (
    employee: Employee
  ) => {
    if (isLeader) {
      const access = canAccessRecord(currentEmployee, employee);
      if (!access.allowed) {
        addToast(
          'Access Denied',
          access.reason || 'Section Leader restriction: you cannot edit employees outside your assigned section.',
          'warning'
        );
        return;
      }
    }

    setEditingEmployee(employee);

    setFormData({
      employeeNo: employee.employeeNo,
      name: employee.name,
      department: employee.department,
      position: employee.position,
      onBoardDate:
        employee.onBoardDate ||
        employee.hireDate ||
        '',
      status: employee.status || 'Active',
      traineeLeader:
        employee.traineeLeader === 'Yes' ||
        employee.isTraineeLeader ||
        Boolean(employee.leadershipTrainingStatus)
          ? 'Yes'
          : 'No',
      leadershipTrainingStatus:
        employee.leadershipTrainingStatus || 'None',
      leadershipBatch: employee.leadershipBatch || ''
    });
  };

  // =========================================================
  // SAVE EMPLOYEE
  // =========================================================

  const handleSaveEmployee = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    const employeeNo =
      formData.employeeNo?.trim() || '';

    const name =
      formData.name?.trim() || '';

    const department =
      isLeader && userAssignedSection
        ? userAssignedSection
        : (formData.department?.trim() || 'Stitching Line A1');

    const position =
      formData.position?.trim() ||
      'Stitching Operator';

    const onBoardDate =
      formData.onBoardDate ||
      new Date().toISOString().split('T')[0];

    const status =
      formData.status || 'Active';

    const isTrainee = formData.traineeLeader === 'Yes';
    const leadershipStatus =
      isTrainee &&
      formData.leadershipTrainingStatus &&
      formData.leadershipTrainingStatus !== 'None'
        ? (formData.leadershipTrainingStatus as
            | 'Completed'
            | 'New Trainee Leader')
        : undefined;

    if (!employeeNo || !name) {
      addToast(
        'Validation Error',
        'Employee ID and Name are required.',
        'warning'
      );

      return;
    }

    // -------------------------------------------------------
    // EDIT
    // -------------------------------------------------------

    if (editingEmployee) {
      const updatedEmployee: Employee = {
        ...editingEmployee,
        employeeNo,
        name,
        department,
        position,
        onBoardDate,
        status: status as Employee['status'],
        traineeLeader: isTrainee ? 'Yes' : undefined,
        isTraineeLeader: isTrainee,
        leadershipTrainingStatus: leadershipStatus,
        leadershipBatch: isTrainee
          ? formData.leadershipBatch || editingEmployee.leadershipBatch
          : undefined
      };

      // Optimistic UI update
      setEmployees(previous =>
        previous.map(employee =>
          employee.id === editingEmployee.id
            ? updatedEmployee
            : employee
        )
      );

      try {
        const result =
          await updateEmployeeInSupabase(
            updatedEmployee
          );

        if (result?.error) {
          console.warn(
            '[Supabase] Update notice:',
            result.error
          );

          addToast(
            'Database Warning',
            `Employee updated on screen, but Supabase update failed: ${result.error.message}`,
            'warning'
          );

          return;
        }

        addToast(
          'Employee Updated',
          `Successfully updated ${name}.`,
          'success'
        );

        setEditingEmployee(null);
      } catch (error: any) {
        console.warn(
          '[Supabase] Update exception:',
          error
        );

        addToast(
          'Database Warning',
          error?.message ||
            'Employee was updated locally but could not be saved to Supabase.',
          'warning'
        );
      }

      return;
    }

    // -------------------------------------------------------
    // ADD
    // -------------------------------------------------------

    const tempId =
      `emp_${employeeNo}_${Date.now()}`;

    const newEmployee: Employee = {
      id: tempId,
      employeeNo,
      name,
      department,
      position,
      onBoardDate,
      status: status as Employee['status'],
      traineeLeader: isTrainee ? 'Yes' : undefined,
      isTraineeLeader: isTrainee,
      leadershipTrainingStatus: leadershipStatus,
      leadershipBatch: isTrainee
        ? formData.leadershipBatch
        : undefined,
      done: false
    };

    // Optimistic UI
    setEmployees(previous => [
      newEmployee,
      ...previous
    ]);

    setIsAddModalOpen(false);

    try {
      const result =
        await insertEmployeeToSupabase(
          newEmployee
        );

      if (result?.error) {
        console.warn(
          '[Supabase] Insert notice:',
          result.error
        );

        addToast(
          'Save Failed',
          `Employee was added on screen but Supabase rejected the save: ${result.error.message}`,
          'warning'
        );

        return;
      }

      const cloudEmployee =
        result?.data;

      if (
        cloudEmployee?.id &&
        cloudEmployee.id !== tempId
      ) {
        setEmployees(previous =>
          previous.map(employee =>
            employee.id === tempId
              ? {
                  ...employee,
                  id: cloudEmployee.id
                }
              : employee
          )
        );
      }

      addToast(
        'Employee Added',
        `${name} was successfully saved to the employee database.`,
        'success'
      );
    } catch (error: any) {
      console.warn(
        '[Supabase] Insert exception:',
        error
      );

      addToast(
        'Save Failed',
        error?.message ||
          'Employee could not be saved to Supabase.',
        'warning'
      );
    }
  };

  // =========================================================
  // DELETE ONE
  // =========================================================

  const handleConfirmDelete =
    async () => {
      if (!deletingEmployee) return;

      const target =
        deletingEmployee;

      const name = target.name;
      const employeeNo =
        target.employeeNo;

      // Optimistic UI
      setEmployees(previous =>
        previous.filter(
          employee =>
            employee.id !== target.id
        )
      );

      setSelectedIds(previous => {
        const next = new Set(previous);
        next.delete(target.id);
        return next;
      });

      setDeletingEmployee(null);

      try {
        const result =
          await deleteEmployeeFromSupabase(
            target
          );

        if (result?.error) {
          console.warn(
            '[Supabase] Delete notice:',
            result.error
          );

          addToast(
            'Delete Warning',
            `The record was removed from the screen, but Supabase delete failed: ${result.error.message}`,
            'warning'
          );

          return;
        }

        addToast(
          'Employee Deleted',
          `Removed ${name} (${employeeNo}) from the system.`,
          'info'
        );
      } catch (error: any) {
        console.warn(
          '[Supabase] Delete exception:',
          error
        );

        addToast(
          'Delete Warning',
          error?.message ||
            'Could not delete employee from Supabase.',
          'warning'
        );
      }
    };

  // =========================================================
  // BULK DELETE
  // =========================================================

  const handleConfirmBulkDelete =
    async () => {
      const recordsToDelete =
        employees.filter(employee =>
          selectedIds.has(employee.id)
        );

      const count =
        recordsToDelete.length;

      if (count === 0) {
        setIsBulkDeleteModalOpen(false);
        return;
      }

      // Optimistic UI
      setEmployees(previous =>
        previous.filter(
          employee =>
            !selectedIds.has(employee.id)
        )
      );

      setSelectedIds(new Set());
      setIsBulkDeleteModalOpen(false);

      try {
        const result =
          await bulkDeleteEmployeesFromSupabase(
            recordsToDelete
          );

        if (result?.error) {
          console.warn(
            '[Supabase] Bulk delete notice:',
            result.error
          );

          addToast(
            'Bulk Delete Warning',
            `Removed ${count} records from screen, but Supabase returned an error: ${result.error.message}`,
            'warning'
          );

          return;
        }

        addToast(
          'Bulk Deletion Complete',
          `Successfully removed ${count} employee records.`,
          'info'
        );
      } catch (error: any) {
        console.warn(
          '[Supabase] Bulk delete exception:',
          error
        );

        addToast(
          'Bulk Delete Warning',
          error?.message ||
            'Could not complete Supabase bulk deletion.',
          'warning'
        );
      }
    };

  // =========================================================
  // EXPORT CSV
  // =========================================================

  const handleExportCSV = () => {
    const headers = [
      'Employee No',
      'Employee Name',
      'Department',
      'Position',
      'Trainee Leader',
      'Leadership Training Status',
      'On-Board Date',
      'Status'
    ];

    const escapeCSV = (
      value: unknown
    ) => {
      const text =
        String(value ?? '');

      return `"${text.replace(
        /"/g,
        '""'
      )}"`;
    };

    const rows =
      filteredEmployees.map(employee =>
        [
          employee.employeeNo,
          employee.name,
          employee.department,
          employee.position,
          employee.traineeLeader === 'Yes' ||
          employee.isTraineeLeader ||
          Boolean(employee.leadershipTrainingStatus)
            ? 'Yes'
            : 'No',
          employee.leadershipTrainingStatus || '-',
          employee.onBoardDate ||
            employee.hireDate ||
            '',
          employee.status ||
            'Active'
        ]
          .map(escapeCSV)
          .join(',')
      );

    const csv =
      [headers.join(','), ...rows]
        .join('\n');

    const blob =
      new Blob([csv], {
        type: 'text/csv;charset=utf-8;'
      });

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement('a');

    link.href = url;

    link.download =
      `DTP_Employee_Master_Roster_${new Date()
        .toISOString()
        .split('T')[0]}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    addToast(
      'Export Successful',
      `Exported ${filteredEmployees.length} employee records.`,
      'success'
    );
  };

  // =========================================================
  // PRINT
  // =========================================================

  const handlePrint = () => {
    window.print();
  };

  // =========================================================
  // CSV IMPORT
  // =========================================================

  const parseCSVLine = (
    line: string
  ): string[] => {
    const result: string[] = [];
    let current = '';
    let insideQuotes = false;

    for (
      let i = 0;
      i < line.length;
      i++
    ) {
      const char = line[i];

      if (char === '"') {
        if (
          insideQuotes &&
          line[i + 1] === '"'
        ) {
          current += '"';
          i++;
        } else {
          insideQuotes =
            !insideQuotes;
        }

        continue;
      }

      if (
        char === ',' &&
        !insideQuotes
      ) {
        result.push(
          current.trim()
        );

        current = '';

        continue;
      }

      current += char;
    }

    result.push(
      current.trim()
    );

    return result;
  };

  const handleFileUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) return;

    const reader =
      new FileReader();

    reader.onload = async () => {
      try {
        const text =
          String(
            reader.result || ''
          );

        const lines =
          text
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(Boolean);

        if (lines.length < 2) {
          addToast(
            'Import Warning',
            'CSV file is empty or has no employee data.',
            'warning'
          );

          return;
        }

        const headers =
          parseCSVLine(
            lines[0]
          ).map(header =>
            header
              .toLowerCase()
              .replace(/[\s_-]/g, '')
          );

        const findColumn = (
          names: string[],
          fallback: number
        ) => {
          const index =
            headers.findIndex(
              header =>
                names.includes(header)
            );

          return index >= 0
            ? index
            : fallback;
        };

        const employeeNoIndex =
          findColumn(
            [
              'employeeno',
              'employeeid',
              'empno',
              'id'
            ],
            0
          );

        const nameIndex =
          findColumn(
            [
              'name',
              'employeename',
              'fullname'
            ],
            1
          );

        const departmentIndex =
          findColumn(
            [
              'department',
              'dept',
              'section'
            ],
            2
          );

        const positionIndex =
          findColumn(
            [
              'position',
              'designation',
              'jobtitle'
            ],
            3
          );

        const dateIndex =
          findColumn(
            [
              'onboarddate',
              'onboard',
              'hiredate',
              'date'
            ],
            4
          );

        const statusIndex =
          findColumn(
            ['status'],
            5
          );

        const importedEmployees: Employee[] = [];

        for (
          let i = 1;
          i < lines.length;
          i++
        ) {
          const parts =
            parseCSVLine(
              lines[i]
            );

          const employeeNo =
            parts[employeeNoIndex]?.trim();

          const name =
            parts[nameIndex]?.trim();

          if (
            !employeeNo &&
            !name
          ) {
            continue;
          }

          const department =
            parts[
              departmentIndex
            ]?.trim() ||
            'Stitching Line A1';

          const position =
            parts[
              positionIndex
            ]?.trim() ||
            'Stitching Operator';

          const onBoardDate =
            parts[dateIndex]?.trim() ||
            new Date()
              .toISOString()
              .split('T')[0];

          const status =
            parts[statusIndex]
              ?.trim() ||
            'Active';

          importedEmployees.push({
            id:
              `import_${employeeNo || 'emp'}_${Date.now()}_${i}`,
            employeeNo:
              employeeNo ||
              `P${Math.floor(
                10000 +
                  Math.random() *
                    90000
              )}`,
            name:
              name ||
              'Unknown Employee',
            department,
            position,
            onBoardDate,
            status:
              status as Employee['status'],
            done:
              status.toLowerCase() ===
              'done'
          });
        }

        if (
          importedEmployees.length === 0
        ) {
          addToast(
            'Import Warning',
            'No valid employee records were found.',
            'warning'
          );

          return;
        }

        // ---------------------------------------------------
        // MERGE LOCALLY BY EMPLOYEE NUMBER
        // ---------------------------------------------------

        setEmployees(previous => {
          const employeeMap =
            new Map<
              string,
              Employee
            >();

          previous.forEach(employee => {
            employeeMap.set(
              employee.employeeNo,
              employee
            );
          });

          importedEmployees.forEach(employee => {
            const existing =
              employeeMap.get(
                employee.employeeNo
              );

            if (existing) {
              employeeMap.set(
                employee.employeeNo,
                {
                  ...existing,
                  ...employee,
                  id: existing.id
                }
              );
            } else {
              employeeMap.set(
                employee.employeeNo,
                employee
              );
            }
          });

          return Array.from(
            employeeMap.values()
          );
        });

        // ---------------------------------------------------
        // SAVE TO SUPABASE
        // ---------------------------------------------------

        try {
          const result =
            await bulkInsertEmployeesToSupabase(
              importedEmployees
            );

          if (result?.error) {
            console.warn(
              '[Supabase] Import notice:',
              result.error
            );

            addToast(
              'Import Warning',
              `Imported locally, but Supabase returned an error: ${result.error.message}`,
              'warning'
            );

            return;
          }

          addToast(
            'Import Successful',
            `Merged and saved ${importedEmployees.length} employee records.`,
            'success'
          );

          setIsImportModalOpen(false);
        } catch (error: any) {
          console.warn(
            '[Supabase] Import exception:',
            error
          );

          addToast(
            'Import Warning',
            error?.message ||
              'Records were imported locally but could not be saved to Supabase.',
            'warning'
          );
        }
      } catch (error) {
        console.error(
          '[Import] Parse error:',
          error
        );

        addToast(
          'Import Error',
          'Failed to read the CSV file. Please check the format.',
          'warning'
        );
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    reader.readAsText(file);
  };

  // =========================================================
  // MANUAL SYNC
  // =========================================================

  const handleSyncWithSupabase =
    async () => {
      setIsSyncing(true);

      try {
        const result =
          await fetchEmployeesFromSupabase();

        if (result.error) {
          addToast(
            'Supabase Sync Failed',
            result.error.message ||
              'Could not fetch employee records.',
            'warning'
          );

          return;
        }

        const cloudEmployees =
          result.data || [];

        setEmployees(previous =>
          mergeSupabaseEmployeesWithLocal(
            previous,
            cloudEmployees
          )
        );

        addToast(
          'Supabase Synced',
          `${cloudEmployees.length.toLocaleString()} records loaded from the database.`,
          'success'
        );
      } catch (error: any) {
        console.warn(
          '[Supabase] Sync notice:',
          error
        );

        addToast(
          'Supabase Error',
          error?.message ||
            'Database synchronization failed.',
          'warning'
        );
      } finally {
        setIsSyncing(false);
      }
    };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="space-y-5 animate-fadeIn pb-12">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#fffdf0] p-5 rounded-2xl border border-yellow-200/90 shadow-2xs">

        <div>
          <div className="flex items-center gap-2.5">

            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-sm">
              <Users className="w-5 h-5" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">

                <EditableText
                  id="employees_header_title"
                  defaultText="Employee Master Directory"
                />

                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-yellow-100 text-amber-900 border border-yellow-300">
                  {employees.length.toLocaleString()} Total Records
                </span>

              </h2>

              <p className="text-xs text-yellow-900/80 mt-0.5 font-medium">
                Master employee roster with Employee ID,
                name, department, position, and status.
              </p>
            </div>

          </div>
        </div>

        {/* ACTIONS */}

        <div className="flex items-center gap-2 flex-wrap">

          <button
            type="button"
            onClick={() => setIsUnmatchedModalOpen(true)}
            className="px-3.5 py-2 bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold text-xs rounded-xl border border-amber-300 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Review Official Leadership Training Rosters & Unmatched Trainees"
          >
            <GraduationCap className="w-4 h-4 text-amber-800" />
            <span>Trainee Review</span>
            <span className="bg-amber-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
              201
            </span>
          </button>

          <button
            type="button"
            onClick={handleSyncWithSupabase}
            disabled={isSyncing}
            className="px-3.5 py-2 bg-yellow-50 hover:bg-yellow-100 disabled:opacity-50 text-yellow-900 font-semibold text-xs rounded-xl border border-yellow-300 transition flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw
              className={`w-4 h-4 text-amber-700 ${
                isSyncing
                  ? 'animate-spin'
                  : ''
              }`}
            />

            <span>
              {isSyncing
                ? 'Syncing...'
                : 'Sync Cloud'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-900 font-semibold text-xs rounded-xl border border-yellow-300 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4 text-amber-700" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() =>
              setIsImportModalOpen(true)
            }
            className="px-3.5 py-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-900 font-semibold text-xs rounded-xl border border-yellow-300 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-4 h-4 text-amber-700" />
            <span>Import</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-900 font-semibold text-xs rounded-xl border border-yellow-300 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-amber-700" />
            <span>Print</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer border border-amber-600/30"
          >
            <Plus className="w-4 h-4" />
            <span>Add Employee</span>
          </button>

        </div>
      </div>

      {/* SECTION LEADER STRICT ACCESS RESTRICTION BANNER */}
      {isLeader && (
        <div 
          id="banner_employees_section_leader_security"
          className="bg-amber-950/90 border border-amber-500/60 rounded-2xl p-4 text-amber-200 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-xl text-amber-400 border border-amber-500/30 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">
                  SECTION LEADER ACCESS RESTRICTION ACTIVE
                </span>
                <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-amber-500 text-slate-950">
                  {userAssignedSection}
                </span>
              </div>
              <p className="text-xs text-amber-300/80 mt-0.5">
                Employee directory and records are restricted strictly to your assigned section: <strong>{userAssignedSection}</strong>. You cannot access or modify employees from other sections (e.g. Stitching B, Stitching C, Assembly, Rubber) or departments.
              </p>
            </div>
          </div>
          <div className="text-xs font-mono font-bold text-amber-400 bg-amber-900/60 px-3 py-1.5 rounded-xl border border-amber-600/40 shrink-0 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Strict Boundary Enforced</span>
          </div>
        </div>
      )}

      {/* =====================================================
          KPI CARDS
      ====================================================== */}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">

        <button
          type="button"
          onClick={() => {
            setSelectedCategory('ALL');
            setSelectedDept('ALL');
            setCurrentPage(1);
          }}
          className={`p-4 rounded-xl border text-left transition cursor-pointer shadow-2xs ${
            selectedCategory === 'ALL' && selectedDept === 'ALL'
              ? 'bg-amber-100/90 border-amber-400 ring-2 ring-amber-400/40'
              : 'bg-[#fffdf0] border-yellow-200/90 hover:bg-yellow-100/60'
          }`}
        >
          <span className="text-[10px] font-bold text-yellow-900/70 uppercase tracking-wider font-mono block">
            Total Roster
          </span>

          <span className="text-2xl font-bold text-slate-950 font-mono mt-1 block">
            {stats.total.toLocaleString()}
          </span>

          <span className="text-[10px] text-amber-800 font-bold mt-1 flex items-center gap-1">
            <Users className="w-3 h-3 text-amber-600" />
            Master Database
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedCategory('TRAINEE_LEADERS');
            setCurrentPage(1);
          }}
          className={`p-4 rounded-xl border text-left transition cursor-pointer shadow-2xs ${
            selectedCategory === 'TRAINEE_LEADERS'
              ? 'bg-amber-200/90 border-amber-500 ring-2 ring-amber-400/50'
              : 'bg-[#fffdf0] border-yellow-200/90 hover:bg-yellow-100/60'
          }`}
        >
          <span className="text-[10px] font-bold text-amber-950 uppercase tracking-wider font-mono block">
            Trainee Leaders
          </span>

          <span className="text-2xl font-bold text-amber-950 font-mono mt-1 block">
            {stats.traineeLeaders.toLocaleString()}
          </span>

          <span className="text-[10px] text-amber-900 font-bold mt-1 flex items-center gap-1">
            <Award className="w-3 h-3 text-amber-700" />
            Leadership Trainees
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedCategory('COMPLETED');
            setCurrentPage(1);
          }}
          className={`p-4 rounded-xl border text-left transition cursor-pointer shadow-2xs ${
            selectedCategory === 'COMPLETED'
              ? 'bg-emerald-100 border-emerald-400 ring-2 ring-emerald-400/50'
              : 'bg-[#fffdf0] border-yellow-200/90 hover:bg-yellow-100/60'
          }`}
        >
          <span className="text-[10px] font-bold text-emerald-950 uppercase tracking-wider font-mono block">
            Completed
          </span>

          <span className="text-2xl font-bold text-emerald-900 font-mono mt-1 block">
            {stats.completedLeaders.toLocaleString()}
          </span>

          <span className="text-[10px] text-emerald-800 font-bold mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Training Completed
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedCategory('NEW_TRAINEE_LEADER');
            setCurrentPage(1);
          }}
          className={`p-4 rounded-xl border text-left transition cursor-pointer shadow-2xs ${
            selectedCategory === 'NEW_TRAINEE_LEADER'
              ? 'bg-sky-100 border-sky-400 ring-2 ring-sky-400/50'
              : 'bg-[#fffdf0] border-yellow-200/90 hover:bg-yellow-100/60'
          }`}
        >
          <span className="text-[10px] font-bold text-sky-950 uppercase tracking-wider font-mono block">
            New Trainee Leader
          </span>

          <span className="text-2xl font-bold text-sky-900 font-mono mt-1 block">
            {stats.newTraineeLeaders.toLocaleString()}
          </span>

          <span className="text-[10px] text-sky-800 font-bold mt-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-sky-600" />
            Assigned Trainees
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedCategory('ALL');
            setSelectedDept('Stitching');
            setCurrentPage(1);
          }}
          className={`p-4 rounded-xl border text-left transition cursor-pointer shadow-2xs ${
            selectedDept === 'Stitching'
              ? 'bg-blue-100 border-blue-400 ring-2 ring-blue-400/50'
              : 'bg-[#fffdf0] border-yellow-200/90 hover:bg-yellow-100/60'
          }`}
        >
          <span className="text-[10px] font-bold text-blue-950 uppercase tracking-wider font-mono block">
            Stitching Dept
          </span>

          <span className="text-2xl font-bold text-blue-900 font-mono mt-1 block">
            {stats.stitching.toLocaleString()}
          </span>

          <span className="text-[10px] text-blue-800 font-medium mt-1 block">
            Sewing & Lines
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedCategory('ALL');
            setSelectedDept('Assembly');
            setCurrentPage(1);
          }}
          className={`p-4 rounded-xl border text-left transition cursor-pointer shadow-2xs ${
            selectedDept === 'Assembly'
              ? 'bg-indigo-100 border-indigo-400 ring-2 ring-indigo-400/50'
              : 'bg-[#fffdf0] border-yellow-200/90 hover:bg-yellow-100/60'
          }`}
        >
          <span className="text-[10px] font-bold text-indigo-950 uppercase tracking-wider font-mono block">
            Assembly Dept
          </span>

          <span className="text-2xl font-bold text-indigo-900 font-mono mt-1 block">
            {stats.assembly.toLocaleString()}
          </span>

          <span className="text-[10px] text-indigo-800 font-medium mt-1 block">
            Assembly & Lines
          </span>
        </button>

      </div>

      {/* =====================================================
          TABLE CARD
      ====================================================== */}

      <div className="bg-[#fffdf0] rounded-2xl border border-yellow-200/90 shadow-xs overflow-hidden">

        {/* PRIMARY LEADERSHIP & FILTER TABS */}

        <div className="p-4 border-b border-yellow-200/90 bg-[#fef9c3]/70 space-y-3">

          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-yellow-950 uppercase tracking-wider font-mono">
                Category Filter:
              </span>
            </div>

            <div className="text-xs text-yellow-900 font-mono font-semibold">
              Showing{' '}
              <strong className="text-slate-950 font-bold">
                {filteredEmployees.length.toLocaleString()}
              </strong>{' '}
              matching records
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
            {primaryLeadershipCategories.map(cat => {
              const Icon = cat.icon;
              const isActive = selectedCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setCurrentPage(1);
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-2 ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 shadow-xs border border-amber-600/40 ring-1 ring-amber-600/30'
                      : 'bg-white text-yellow-950 hover:bg-yellow-100 border border-yellow-300/80 shadow-2xs'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-amber-700'}`} />
                  <span>{cat.label}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                      isActive
                        ? 'bg-slate-950 text-amber-300'
                        : 'bg-yellow-100 text-amber-950 border border-yellow-300'
                    }`}
                  >
                    {cat.count.toLocaleString()}
                  </span>
                </button>
              );
            })}
          </div>

          {/* DEPARTMENT SUB-TABS */}

          <div className="flex items-center gap-1.5 overflow-x-auto pt-1 border-t border-yellow-300/60 max-w-full">
            <span className="text-[11px] font-bold text-yellow-900/80 font-mono mr-1">
              {isLeader ? 'Assigned Section:' : 'Dept:'}
            </span>

            {isLeader && userAssignedSection ? (
              <div className="px-3 py-1 rounded-lg text-xs font-bold bg-amber-600 text-white flex items-center gap-1.5 shadow-2xs">
                <Lock className="w-3 h-3 text-amber-200" />
                <span>{userAssignedSection} (Locked)</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-amber-700 text-white">
                  {scopedEmployees.length.toLocaleString()}
                </span>
              </div>
            ) : (
              deptCategories.map(category => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => {
                    setSelectedDept(category.id);
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                    selectedDept === category.id
                      ? 'bg-amber-600 text-white font-bold shadow-2xs'
                      : 'bg-white/70 text-yellow-950 hover:bg-yellow-100 border border-yellow-300/60'
                  }`}
                >
                  <span>{category.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                      selectedDept === category.id
                        ? 'bg-amber-700 text-white'
                        : 'bg-yellow-100 text-amber-900'
                    }`}
                  >
                    {category.count.toLocaleString()}
                  </span>
                </button>
              ))
            )}
          </div>

        </div>

        {/* FILTER TOOLBAR */}

        <div className="p-4 border-b border-yellow-200/90 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-[#fffdf0]">

          <div className="md:col-span-2 relative">

            <Search className="w-4 h-4 text-amber-700 absolute left-3 top-1/2 -translate-y-1/2" />

            <input
              type="text"
              placeholder="Search Employee ID, Name, Department, Position..."
              value={searchQuery}
              onChange={event => {
                setSearchQuery(
                  event.target.value
                );
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-8 py-2 bg-yellow-50/70 border border-yellow-300 rounded-xl text-xs text-slate-900 placeholder-yellow-800/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition font-medium"
            />

            {searchQuery && (
              <button
                type="button"
                onClick={() =>
                  setSearchQuery('')
                }
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

          </div>

          <div>
            {isLeader && userAssignedSection ? (
              <div className="w-full py-2 px-3 bg-yellow-100/90 border border-yellow-400 rounded-xl text-xs text-yellow-950 font-bold flex items-center justify-between">
                <span className="flex items-center gap-1.5 truncate">
                  <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>{userAssignedSection}</span>
                </span>
                <span className="text-[10px] bg-amber-600 text-white font-mono px-1.5 py-0.5 rounded ml-1 shrink-0">
                  Locked
                </span>
              </div>
            ) : (
              <select
                value={selectedDept}
                onChange={event => {
                  setSelectedDept(
                    event.target.value
                  );
                  setCurrentPage(1);
                }}
                aria-label="Filter by Department"
                className="w-full py-2 px-3 bg-yellow-50/70 border border-yellow-300 rounded-xl text-xs text-yellow-950 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 cursor-pointer"
              >
                <option value="ALL">
                  All Departments (
                  {departmentsList.length}
                  )
                </option>

                {departmentsList.map(
                  department => (
                    <option
                      key={department}
                      value={department}
                    >
                      {department}
                    </option>
                  )
                )}
              </select>
            )}
          </div>

          <div>
            <select
              value={pageSize}
              onChange={event => {
                setPageSize(
                  Number(
                    event.target.value
                  )
                );
                setCurrentPage(1);
              }}
              aria-label="Records per page"
              className="w-full py-2 px-3 bg-yellow-50/70 border border-yellow-300 rounded-xl text-xs text-yellow-950 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 cursor-pointer"
            >
              <option value={25}>
                25 per page
              </option>
              <option value={50}>
                50 per page
              </option>
              <option value={100}>
                100 per page
              </option>
              <option value={250}>
                250 per page
              </option>
              <option value={500}>
                500 per page
              </option>
            </select>
          </div>

        </div>

        {/* BULK ACTION */}

        {selectedIds.size > 0 && (
          <div className="p-3 bg-yellow-100 border-b border-yellow-300 flex items-center justify-between flex-wrap gap-2 text-xs">

            <div className="flex items-center gap-2 text-yellow-950 font-bold">
              <CheckSquare className="w-4 h-4 text-amber-700" />

              <span>
                {selectedIds.size}{' '}
                employees selected
              </span>
            </div>

            <div className="flex items-center gap-2">

              <button
                type="button"
                onClick={() =>
                  setIsBulkDeleteModalOpen(
                    true
                  )
                }
                className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-2xs transition cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Delete Selected
              </button>

              <button
                type="button"
                onClick={() =>
                  setSelectedIds(
                    new Set()
                  )
                }
                className="px-2 py-1 text-yellow-900 hover:text-slate-950 font-semibold cursor-pointer"
              >
                Clear Selection
              </button>

            </div>

          </div>
        )}

        {/* TABLE */}

        <div className="overflow-x-auto">

          <table className="w-full text-left border-collapse text-xs">

            <thead>
              <tr className="bg-[#fef08a] border-b border-yellow-300 text-yellow-950 font-mono text-[11px] font-bold uppercase tracking-wider">

                <th className="p-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      paginatedEmployees.length >
                        0 &&
                      paginatedEmployees.every(
                        employee =>
                          selectedIds.has(
                            employee.id
                          )
                      )
                    }
                    onChange={
                      toggleSelectAllPage
                    }
                    aria-label="Select all employees on this page"
                    className="rounded border-yellow-400 text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                </th>

                <th className="p-3.5 w-12 text-center">
                  #
                </th>

                <th
                  className="p-3.5 font-bold cursor-pointer hover:text-amber-800 transition"
                  onClick={() =>
                    handleSort(
                      'employeeNo'
                    )
                  }
                >
                  <div className="flex items-center gap-1.5">
                    <span>
                      Employee ID
                    </span>

                    <ArrowUpDown className="w-3 h-3 text-yellow-700" />
                  </div>
                </th>

                <th
                  className="p-3.5 font-bold cursor-pointer hover:text-amber-800 transition"
                  onClick={() =>
                    handleSort('name')
                  }
                >
                  <div className="flex items-center gap-1.5">
                    <span>
                      Employee Name
                    </span>

                    <ArrowUpDown className="w-3 h-3 text-yellow-700" />
                  </div>
                </th>

                <th
                  className="p-3.5 font-bold cursor-pointer hover:text-amber-800 transition"
                  onClick={() =>
                    handleSort(
                      'department'
                    )
                  }
                >
                  <div className="flex items-center gap-1.5">
                    <span>
                      Department / Section
                    </span>

                    <ArrowUpDown className="w-3 h-3 text-yellow-700" />
                  </div>
                </th>

                <th
                  className="p-3.5 font-bold cursor-pointer hover:text-amber-800 transition"
                  onClick={() =>
                    handleSort(
                      'position'
                    )
                  }
                >
                  <div className="flex items-center gap-1.5">
                    <span>
                      Position / Designation
                    </span>

                    <ArrowUpDown className="w-3 h-3 text-yellow-700" />
                  </div>
                </th>

                <th className="p-3.5 font-bold text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Award className="w-3 h-3 text-amber-700" />
                    <span>Trainee Leader</span>
                  </div>
                </th>

                <th className="p-3.5 font-bold text-center">
                  <div className="flex items-center justify-center gap-1">
                    <GraduationCap className="w-3 h-3 text-amber-700" />
                    <span>Leadership Training Status</span>
                  </div>
                </th>

                <th className="p-3.5 font-bold">
                  On-Board Date
                </th>

                <th className="p-3.5 font-bold text-center">
                  Status
                </th>

                <th className="p-3.5 font-bold text-right pr-4">
                  Actions
                </th>

              </tr>
            </thead>

            <tbody className="divide-y divide-yellow-100 font-sans">

              {paginatedEmployees.length >
              0 ? (
                paginatedEmployees.map(
                  (
                    employee,
                    index
                  ) => {
                    const selected =
                      selectedIds.has(
                        employee.id
                      );

                    const rowNumber =
                      (safeCurrentPage -
                        1) *
                        pageSize +
                      index +
                      1;

                    const isTrainee = employee.traineeLeader === 'Yes';
                    const trainingStatus = employee.leadershipTrainingStatus;

                    return (
                      <tr
                        key={
                          employee.id
                            ? `${employee.id}-${employee.employeeNo || index}-${index}`
                            : `emp-row-${index}`
                        }
                        className={`hover:bg-yellow-100/70 transition-colors group ${
                          selected
                            ? 'bg-yellow-200/70'
                            : isTrainee
                            ? 'bg-amber-50/40'
                            : index %
                                2 ===
                              0
                            ? 'bg-white'
                            : 'bg-[#fffdf0]'
                        }`}
                      >

                        <td className="p-3.5 text-center">
                          <input
                            type="checkbox"
                            checked={
                              selected
                            }
                            onChange={() =>
                              toggleSelectRow(
                                employee.id
                              )
                            }
                            aria-label={`Select ${employee.name}`}
                            className="rounded border-yellow-400 text-amber-600 focus:ring-amber-500 cursor-pointer"
                          />
                        </td>

                        <td className="p-3.5 text-center font-mono text-yellow-900/60 font-semibold text-[11px]">
                          {rowNumber}
                        </td>

                        <td className="p-3.5 font-mono font-bold text-blue-900">
                          <span className="bg-yellow-100/90 text-amber-950 px-2 py-0.5 rounded border border-yellow-300/80 font-mono font-bold">
                            {employee.employeeNo}
                          </span>
                        </td>

                        <td className="p-3.5 font-bold text-slate-900">
                          <div className="flex items-center gap-1.5">
                            <span>{employee.name}</span>
                            {isTrainee && (
                              <span
                                className="inline-flex items-center justify-center p-0.5 bg-amber-500/20 text-amber-900 rounded"
                                title="Leadership Trainee Leader"
                              >
                                <Award className="w-3 h-3 text-amber-700" />
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="p-3.5">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-yellow-100/70 text-yellow-950 border border-yellow-300/60">
                            <Building2 className="w-3 h-3 text-amber-700" />

                            <span>
                              {employee.department ||
                                'General'}
                            </span>
                          </span>
                        </td>

                        <td className="p-3.5 text-slate-900 font-medium">
                          <span className="inline-flex items-center gap-1.5">
                            <Briefcase className="w-3 h-3 text-amber-700" />

                            <span>
                              {employee.position ||
                                'Plant Operator'}
                            </span>
                          </span>
                        </td>

                        <td className="p-3.5 text-center">
                          {isTrainee ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-950 border border-amber-300 font-mono">
                              <Award className="w-3 h-3 text-amber-700" />
                              Yes
                            </span>
                          ) : (
                            <span className="text-yellow-900/40 font-mono text-[11px]">-</span>
                          )}
                        </td>

                        <td className="p-3.5 text-center">
                          {trainingStatus === 'Completed' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-950 border border-emerald-300 font-mono">
                              <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                              Completed
                            </span>
                          ) : trainingStatus === 'New Trainee Leader' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-950 border border-sky-300 font-mono">
                              <Sparkles className="w-3 h-3 text-sky-700" />
                              New Trainee Leader
                            </span>
                          ) : (
                            <span className="text-yellow-900/40 font-mono text-[11px]">-</span>
                          )}
                        </td>

                        <td className="p-3.5 font-mono text-slate-700 font-medium text-[11px]">
                          {employee.onBoardDate ||
                            employee.hireDate ||
                            '-'}
                        </td>

                        <td className="p-3.5 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono border ${
                              employee.status ===
                              'Active'
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                : 'bg-yellow-200 text-yellow-950 border-yellow-400'
                            }`}
                          >
                            {employee.status ||
                              'Active'}
                          </span>
                        </td>

                        <td className="p-3.5 text-right pr-4">

                          <div className="flex items-center justify-end gap-1 opacity-90 group-hover:opacity-100 transition">

                            <button
                              type="button"
                              onClick={() =>
                                handleViewEmployee(
                                  employee
                                )
                              }
                              className="p-1.5 text-yellow-900 hover:text-blue-800 hover:bg-yellow-200/80 rounded-lg transition cursor-pointer"
                              title="View Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleOpenEditModal(
                                  employee
                                )
                              }
                              className="p-1.5 text-yellow-900 hover:text-amber-800 hover:bg-yellow-200/80 rounded-lg transition cursor-pointer"
                              title="Edit Record"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setDeletingEmployee(
                                  employee
                                )
                              }
                              className="p-1.5 text-yellow-900 hover:text-red-700 hover:bg-red-100 rounded-lg transition cursor-pointer"
                              title="Delete Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                          </div>

                        </td>

                      </tr>
                    );
                  }
                )
              ) : (
                <tr>
                  <td
                    colSpan={11}
                    className="p-12 text-center text-yellow-900/60"
                  >
                    <Users className="w-10 h-10 mx-auto text-yellow-700 mb-2" />

                    <p className="font-bold text-slate-800 text-sm">
                      No employee records found
                    </p>

                    <p className="text-xs text-yellow-900/70 mt-1">
                      Try changing your search
                      or department filter.
                    </p>
                  </td>
                </tr>
              )}

            </tbody>

          </table>

        </div>

        {/* PAGINATION */}

        <div className="p-4 border-t border-yellow-200/90 bg-[#fef9c3]/70 flex items-center justify-between flex-wrap gap-4 text-xs select-none">

          <div className="text-yellow-950 font-mono font-semibold">

            Showing{' '}

            <strong className="text-slate-950 font-bold">
              {filteredEmployees.length ===
              0
                ? 0
                : (safeCurrentPage -
                    1) *
                    pageSize +
                  1}
            </strong>

            {' '}to{' '}

            <strong className="text-slate-950 font-bold">
              {Math.min(
                filteredEmployees.length,
                safeCurrentPage *
                  pageSize
              )}
            </strong>

            {' '}of{' '}

            <strong className="text-slate-950 font-bold">
              {filteredEmployees.length.toLocaleString()}
            </strong>

            {' '}entries

          </div>

          <div className="flex items-center gap-1.5">

            <button
              type="button"
              disabled={
                safeCurrentPage <= 1
              }
              onClick={() =>
                setCurrentPage(1)
              }
              className="p-1.5 bg-white border border-yellow-300 rounded-lg text-yellow-950 hover:bg-yellow-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              disabled={
                safeCurrentPage <= 1
              }
              onClick={() =>
                setCurrentPage(
                  previous =>
                    Math.max(
                      1,
                      previous - 1
                    )
                )
              }
              className="p-1.5 bg-white border border-yellow-300 rounded-lg text-yellow-950 hover:bg-yellow-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 py-1 bg-white border border-yellow-300 rounded-lg font-mono font-bold text-yellow-950">
              Page{' '}
              {safeCurrentPage}{' '}
              of {totalPages}
            </span>

            <button
              type="button"
              disabled={
                safeCurrentPage >=
                totalPages
              }
              onClick={() =>
                setCurrentPage(
                  previous =>
                    Math.min(
                      totalPages,
                      previous + 1
                    )
                )
              }
              className="p-1.5 bg-white border border-yellow-300 rounded-lg text-yellow-950 hover:bg-yellow-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              disabled={
                safeCurrentPage >=
                totalPages
              }
              onClick={() =>
                setCurrentPage(
                  totalPages
                )
              }
              className="p-1.5 bg-white border border-yellow-300 rounded-lg text-yellow-950 hover:bg-yellow-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>

            <form
              onSubmit={event => {
                event.preventDefault();

                const page =
                  Number(
                    jumpPageInput
                  );

                if (
                  Number.isInteger(
                    page
                  ) &&
                  page >= 1 &&
                  page <=
                    totalPages
                ) {
                  setCurrentPage(
                    page
                  );

                  setJumpPageInput(
                    ''
                  );
                }
              }}
              className="flex items-center gap-1 ml-2"
            >
              <input
                type="number"
                min={1}
                max={totalPages}
                placeholder="Jump"
                value={
                  jumpPageInput
                }
                onChange={event =>
                  setJumpPageInput(
                    event.target.value
                  )
                }
                className="w-16 px-2 py-1 bg-white border border-yellow-300 rounded-lg text-xs font-mono text-center focus:outline-none focus:ring-1 focus:ring-amber-500 font-bold"
              />

              <button
                type="submit"
                className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold cursor-pointer"
              >
                Go
              </button>
            </form>

          </div>
        </div>

      </div>

      {/* =====================================================
          ADD / EDIT MODAL
      ====================================================== */}

      {(isAddModalOpen ||
        editingEmployee) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[999] animate-fadeIn">

          <div className="bg-[#fffdf0] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-yellow-300">

            <div className="bg-amber-500 text-slate-950 p-4 flex items-center justify-between border-b border-amber-600/30">

              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />

                <h3 className="font-bold text-sm tracking-wide">
                  {editingEmployee
                    ? 'Edit Employee Record'
                    : 'Add Employee'}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(
                    false
                  );
                  setEditingEmployee(
                    null
                  );
                }}
                className="text-slate-900 hover:text-black cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

            </div>

            <form
              onSubmit={
                handleSaveEmployee
              }
              className="p-6 space-y-4 text-xs"
            >

              <div>

                <label className="block text-yellow-950 font-bold mb-1">
                  Employee Number / ID *
                </label>

                <input
                  type="text"
                  required
                  value={
                    formData.employeeNo ||
                    ''
                  }
                  onChange={event =>
                    setFormData(
                      previous => ({
                        ...previous,
                        employeeNo:
                          event.target
                            .value
                      })
                    )
                  }
                  placeholder="e.g. P00005"
                  className="w-full p-2.5 bg-yellow-50/80 border border-yellow-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500/30 font-mono font-bold text-slate-950"
                />

              </div>

              <div>

                <label className="block text-yellow-950 font-bold mb-1">
                  Full Name *
                </label>

                <input
                  type="text"
                  required
                  value={
                    formData.name ||
                    ''
                  }
                  onChange={event =>
                    setFormData(
                      previous => ({
                        ...previous,
                        name:
                          event.target
                            .value
                      })
                    )
                  }
                  placeholder="Last, First, Middle"
                  className="w-full p-2.5 bg-yellow-50/80 border border-yellow-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500/30 font-semibold text-slate-950"
                />

              </div>

              <div>

                <label className="block text-yellow-950 font-bold mb-1">
                  Department / Section *
                </label>

                <input
                  type="text"
                  required
                  value={
                    formData.department ||
                    ''
                  }
                  onChange={event =>
                    setFormData(
                      previous => ({
                        ...previous,
                        department:
                          event.target
                            .value
                      })
                    )
                  }
                  placeholder="e.g. Stitching Line A1"
                  className="w-full p-2.5 bg-yellow-50/80 border border-yellow-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500/30 text-slate-950"
                />

              </div>

              <div>

                <label className="block text-yellow-950 font-bold mb-1">
                  Position / Designation *
                </label>

                <input
                  type="text"
                  required
                  value={
                    formData.position ||
                    ''
                  }
                  onChange={event =>
                    setFormData(
                      previous => ({
                        ...previous,
                        position:
                          event.target
                            .value
                      })
                    )
                  }
                  placeholder="e.g. Stitching Operator"
                  className="w-full p-2.5 bg-yellow-50/80 border border-yellow-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500/30 text-slate-950"
                />

              </div>

              <div>

                <label className="block text-slate-700 font-semibold mb-1">
                  On-Board Date
                </label>

                <input
                  type="date"
                  value={
                    formData.onBoardDate ||
                    ''
                  }
                  onChange={event =>
                    setFormData(
                      previous => ({
                        ...previous,
                        onBoardDate:
                          event.target
                            .value
                      })
                    )
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 font-mono"
                />

              </div>

              {/* LEADERSHIP TRAINING FIELDS */}

              <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/80 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950 font-mono">
                  <Award className="w-3.5 h-3.5 text-amber-700" />
                  <span>Leadership Training Assignment</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-amber-950 font-semibold mb-1">
                      Trainee Leader?
                    </label>
                    <select
                      value={formData.traineeLeader || 'No'}
                      onChange={event => {
                        const val = event.target.value as 'Yes' | 'No';
                        setFormData(prev => ({
                          ...prev,
                          traineeLeader: val,
                          isTraineeLeader: val === 'Yes',
                          leadershipTrainingStatus: val === 'Yes' 
                            ? (prev.leadershipTrainingStatus === 'Completed' ? 'Completed' : 'New Trainee Leader')
                            : 'None'
                        }));
                      }}
                      className="w-full p-2 bg-white border border-amber-300 rounded-lg text-slate-900 font-semibold focus:ring-2 focus:ring-amber-500/30"
                    >
                      <option value="No">No (Regular Employee)</option>
                      <option value="Yes">Yes (Trainee Leader)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-amber-950 font-semibold mb-1">
                      Training Status
                    </label>
                    <select
                      value={formData.leadershipTrainingStatus || 'None'}
                      disabled={formData.traineeLeader !== 'Yes'}
                      onChange={event =>
                        setFormData(prev => ({
                          ...prev,
                          leadershipTrainingStatus: event.target.value as 'Completed' | 'New Trainee Leader' | 'None'
                        }))
                      }
                      className="w-full p-2 bg-white border border-amber-300 rounded-lg text-slate-900 font-semibold disabled:opacity-50 focus:ring-2 focus:ring-amber-500/30"
                    >
                      <option value="None">None</option>
                      <option value="Completed">Completed</option>
                      <option value="New Trainee Leader">New Trainee Leader</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">

                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(
                      false
                    );
                    setEditingEmployee(
                      null
                    );
                  }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl cursor-pointer transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md cursor-pointer transition"
                >
                  {editingEmployee
                    ? 'Save Changes'
                    : 'Add Employee'}
                </button>

              </div>

            </form>

          </div>
        </div>
      )}

      {/* =====================================================
          VIEW MODAL
      ====================================================== */}

      {viewingEmployee && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[999]">

          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">

            <div className="bg-slate-900 text-white p-5 relative">

              <button
                type="button"
                onClick={() =>
                  setViewingEmployee(
                    null
                  )
                }
                className="absolute top-4 right-4 text-white/70 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3.5">

                <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-xl font-bold text-white shadow-md">
                  {(
                    viewingEmployee.name ||
                    'U'
                  ).charAt(0)}
                </div>

                <div>

                  <h3 className="text-base font-bold text-white">
                    {viewingEmployee.name}
                  </h3>

                  <div className="flex items-center gap-2 mt-0.5">

                    <span className="text-xs font-mono bg-blue-950 px-2 py-0.5 rounded text-blue-200 font-bold">
                      {
                        viewingEmployee.employeeNo
                      }
                    </span>

                    <span className="text-xs text-slate-300 font-medium">
                      {
                        viewingEmployee.position
                      }
                    </span>

                  </div>

                </div>

              </div>

            </div>

            <div className="p-5 space-y-3.5 text-xs">

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">

                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-medium">
                    Employee ID
                  </span>

                  <span className="font-mono font-bold text-blue-700">
                    {
                      viewingEmployee.employeeNo
                    }
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-medium">
                    Department
                  </span>

                  <span className="font-bold text-slate-800">
                    {
                      viewingEmployee.department
                    }
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-medium">
                    Position
                  </span>

                  <span className="font-bold text-slate-800">
                    {
                      viewingEmployee.position
                    }
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-medium">
                    On-Board Date
                  </span>

                  <span className="font-mono font-bold text-slate-800">
                    {viewingEmployee.onBoardDate ||
                      viewingEmployee.hireDate ||
                      '-'}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-medium">
                    Trainee Leader
                  </span>

                  <span className="font-bold">
                    {viewingEmployee.traineeLeader === 'Yes' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-950 border border-amber-300 font-mono">
                        <Award className="w-3 h-3 text-amber-700" />
                        Yes (Trainee Leader)
                      </span>
                    ) : (
                      <span className="text-slate-500 font-mono">No</span>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-medium">
                    Leadership Training Status
                  </span>

                  <span className="font-bold">
                    {viewingEmployee.leadershipTrainingStatus === 'Completed' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-950 border border-emerald-300 font-mono">
                        <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                        Completed
                      </span>
                    ) : viewingEmployee.leadershipTrainingStatus === 'New Trainee Leader' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-950 border border-sky-300 font-mono">
                        <Sparkles className="w-3 h-3 text-sky-700" />
                        New Trainee Leader
                      </span>
                    ) : (
                      <span className="text-slate-400 font-mono">-</span>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">
                    Status
                  </span>

                  <span className="font-bold text-emerald-700">
                    {
                      viewingEmployee.status ||
                      'Active'
                    }
                  </span>
                </div>

              </div>

              <div className="pt-2 flex items-center justify-end gap-2">

                <button
                  type="button"
                  onClick={() => {
                    const employee =
                      viewingEmployee;

                    setViewingEmployee(
                      null
                    );

                    handleOpenEditModal(
                      employee
                    );
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl cursor-pointer"
                >
                  Edit Record
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setViewingEmployee(
                      null
                    )
                  }
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl cursor-pointer"
                >
                  Close
                </button>

              </div>

            </div>

          </div>
        </div>
      )}

      {/* =====================================================
          DELETE MODAL
      ====================================================== */}

      {deletingEmployee && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[999]">

          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">

            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center mb-3">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="font-bold text-base text-slate-900 mb-1">
              Delete Employee Record
            </h3>

            <p className="text-xs text-slate-500 mb-4">
              Are you sure you want to remove{' '}
              <strong className="text-slate-800">
                {
                  deletingEmployee.name
                }
              </strong>{' '}
              (
              {
                deletingEmployee.employeeNo
              }
              )?
            </p>

            <div className="flex items-center justify-center gap-2.5">

              <button
                type="button"
                onClick={() =>
                  setDeletingEmployee(
                    null
                  )
                }
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  handleConfirmDelete
                }
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-xl shadow-md cursor-pointer"
              >
                Yes, Delete
              </button>

            </div>

          </div>
        </div>
      )}

      {/* =====================================================
          BULK DELETE MODAL
      ====================================================== */}

      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[999]">

          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">

            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>

            <h3 className="font-bold text-base text-slate-900 mb-1">
              Delete{' '}
              {selectedIds.size}{' '}
              Employees?
            </h3>

            <p className="text-xs text-slate-500 mb-4">
              You are about to permanently
              delete{' '}
              <strong className="text-slate-800">
                {selectedIds.size}{' '}
                selected employee records
              </strong>
              .
            </p>

            <div className="flex items-center justify-center gap-2.5">

              <button
                type="button"
                onClick={() =>
                  setIsBulkDeleteModalOpen(
                    false
                  )
                }
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  handleConfirmBulkDelete
                }
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-xl shadow-md cursor-pointer"
              >
                Delete Selected
              </button>

            </div>

          </div>
        </div>
      )}

      {/* =====================================================
          IMPORT MODAL
      ====================================================== */}

      {isImportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[999]">

          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 p-6">

            <div className="flex items-center justify-between mb-4">

              <div className="flex items-center gap-2">

                <Upload className="w-5 h-5 text-blue-600" />

                <h3 className="font-bold text-sm text-slate-900">
                  Import Employee Roster
                </h3>

              </div>

              <button
                type="button"
                onClick={() =>
                  setIsImportModalOpen(
                    false
                  )
                }
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

            </div>

            <p className="text-xs text-slate-500 mb-4">
              Upload a CSV containing:
              Employee No, Name,
              Department, Position,
              On-Board Date and Status.
            </p>

            <div
              onClick={() =>
                fileInputRef.current?.click()
              }
              className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/50 rounded-xl p-8 text-center cursor-pointer transition mb-4"
            >

              <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto mb-2" />

              <span className="text-xs font-semibold text-slate-700 block">
                Click to select CSV file
              </span>

              <span className="text-[10px] text-slate-400 block mt-1">
                Supports standard CSV format
              </span>

              <input
                type="file"
                ref={fileInputRef}
                accept=".csv,.txt"
                onChange={
                  handleFileUpload
                }
                className="hidden"
              />

            </div>

            <div className="flex justify-end">

              <button
                type="button"
                onClick={() =>
                  setIsImportModalOpen(
                    false
                  )
                }
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>

            </div>

          </div>
        </div>
      )}

      {/* =====================================================
          LEADERSHIP TRAINEES VERIFICATION & AUDIT MODAL
      ====================================================== */}

      {isUnmatchedModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[999]">
          <div className="bg-[#fffdf0] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-yellow-300">
            
            {/* MODAL HEADER */}
            <div className="bg-[#fef08a] text-yellow-950 p-5 border-b border-yellow-300 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-2xs">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-950 flex items-center gap-2">
                    Leadership Training Roster Verification
                    <span className="bg-amber-600 text-white text-xs px-2 py-0.5 rounded-full font-mono font-bold">
                      {traineeVerificationStats.total} Records
                    </span>
                  </h3>
                  <p className="text-xs text-yellow-900 font-medium mt-0.5">
                    Matching official Leadership Training spreadsheets with Employee Master Database.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsUnmatchedModalOpen(false)}
                className="p-1.5 text-yellow-900 hover:text-slate-950 hover:bg-yellow-200/80 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* AUDIT SUMMARY CHIPS */}
            <div className="p-4 bg-yellow-100/60 border-b border-yellow-200/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-white p-3 rounded-xl border border-yellow-300 shadow-2xs">
                <span className="text-[10px] font-bold text-yellow-900 uppercase tracking-wider font-mono block">
                  Total Leadership Trainees
                </span>
                <span className="text-xl font-bold text-slate-950 font-mono mt-0.5 block">
                  {traineeVerificationStats.total}
                </span>
                <span className="text-[10px] text-yellow-800 font-medium block mt-0.5">
                  Extracted from official program sheets
                </span>
              </div>

              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-300 shadow-2xs">
                <span className="text-[10px] font-bold text-emerald-950 uppercase tracking-wider font-mono block">
                  Matched in Employee List
                </span>
                <span className="text-xl font-bold text-emerald-900 font-mono mt-0.5 block">
                  {traineeVerificationStats.matched}
                </span>
                <span className="text-[10px] text-emerald-800 font-medium block mt-0.5">
                  High-confidence Employee ID & Name matches
                </span>
              </div>

              <div className="bg-amber-50 p-3 rounded-xl border border-amber-300 shadow-2xs">
                <span className="text-[10px] font-bold text-amber-950 uppercase tracking-wider font-mono block">
                  Flagged for Review
                </span>
                <span className="text-xl font-bold text-amber-950 font-mono mt-0.5 block">
                  {traineeVerificationStats.unmatched}
                </span>
                <span className="text-[10px] text-amber-800 font-medium block mt-0.5">
                  Not auto-added to preserve roster accuracy
                </span>
              </div>
            </div>

            {/* FILTER & SEARCH TOOLBAR */}
            <div className="p-4 border-b border-yellow-200 bg-[#fffdf0] flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setUnmatchedTab('ALL')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                    unmatchedTab === 'ALL'
                      ? 'bg-amber-500 text-slate-950 shadow-2xs'
                      : 'bg-yellow-100/80 text-yellow-950 hover:bg-yellow-200 border border-yellow-300'
                  }`}
                >
                  All ({traineeVerificationStats.total})
                </button>

                <button
                  type="button"
                  onClick={() => setUnmatchedTab('MATCHED')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                    unmatchedTab === 'MATCHED'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-emerald-50 text-emerald-950 hover:bg-emerald-100 border border-emerald-300'
                  }`}
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Matched ({traineeVerificationStats.matched})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setUnmatchedTab('UNMATCHED')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                    unmatchedTab === 'UNMATCHED'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-amber-50 text-amber-950 hover:bg-amber-100 border border-amber-300'
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Review Needed ({traineeVerificationStats.unmatched})</span>
                </button>
              </div>

              <div className="relative flex-1 sm:w-64 max-w-xs">
                <Search className="w-3.5 h-3.5 text-amber-700 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search trainee, ID, sheet..."
                  value={unmatchedSearch}
                  onChange={e => setUnmatchedSearch(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 bg-yellow-50/70 border border-yellow-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                />
                {unmatchedSearch && (
                  <button
                    type="button"
                    onClick={() => setUnmatchedSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* TABLE BODY */}
            <div className="overflow-y-auto flex-1 p-4">
              <div className="rounded-xl border border-yellow-300 overflow-hidden bg-white">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#fef08a] border-b border-yellow-300 text-yellow-950 font-mono text-[11px] font-bold uppercase">
                      <th className="p-3 w-10 text-center">#</th>
                      <th className="p-3">Trainee Name</th>
                      <th className="p-3">Department (Sheet)</th>
                      <th className="p-3">Program Sheet</th>
                      <th className="p-3 text-center">Matching Status</th>
                      <th className="p-3">Matched Employee Record</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-yellow-100 font-sans">
                    {filteredTraineeVerification.map((item, index) => (
                      <tr
                        key={item.id}
                        className={`hover:bg-yellow-50 transition ${
                          item.isMatched ? 'bg-white' : 'bg-amber-50/20'
                        }`}
                      >
                        <td className="p-3 text-center font-mono text-slate-400 text-[11px]">
                          {index + 1}
                        </td>

                        <td className="p-3 font-bold text-slate-900">
                          <div>
                            <span>{item.name}</span>
                            {item.employeeNo && (
                              <span className="ml-1.5 text-[10px] font-mono bg-yellow-100 text-amber-950 px-1.5 py-0.2 rounded border border-yellow-300">
                                {item.employeeNo}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="p-3 text-slate-700">
                          <span className="inline-flex items-center gap-1 text-xs">
                            <Building2 className="w-3 h-3 text-amber-700" />
                            {item.dept || 'General'}
                          </span>
                        </td>

                        <td className="p-3 font-mono text-[11px] text-slate-600">
                          {item.sheet}
                        </td>

                        <td className="p-3 text-center">
                          {item.isMatched ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-950 border border-emerald-300 font-mono">
                              <CheckCheck className="w-3 h-3 text-emerald-700" />
                              Matched ({item.matchType})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-950 border border-amber-300 font-mono">
                              <AlertCircle className="w-3 h-3 text-amber-700" />
                              Flagged for Review
                            </span>
                          )}
                        </td>

                        <td className="p-3">
                          {item.matchedEmp ? (
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 text-[11px]">
                                {item.matchedEmp.employeeNo}
                              </span>
                              <span className="font-bold text-slate-800 text-xs">
                                {item.matchedEmp.name}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                ({item.matchedEmp.department})
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-amber-800/80 italic font-mono">
                              Not automatically added
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 p-3 bg-yellow-50 rounded-xl border border-yellow-300/80 flex items-start gap-2 text-xs text-yellow-950">
                <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p>
                  <strong>HR Data Integrity Guarantee:</strong> In strict adherence to system rules, only candidates with verified matching Employee IDs or names are updated in the live Employee List. Unmatched candidates remain preserved in the Leadership Training database without modifying regular employee rosters.
                </p>
              </div>
            </div>

            {/* MODAL FOOTER */}
            <div className="p-4 bg-yellow-100/70 border-t border-yellow-200/80 flex items-center justify-between text-xs">
              <span className="text-yellow-950 font-mono font-semibold">
                Showing {filteredTraineeVerification.length} of {traineeVerificationStats.total} candidates
              </span>

              <button
                type="button"
                onClick={() => setIsUnmatchedModalOpen(false)}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl transition cursor-pointer shadow-2xs border border-amber-600/30"
              >
                Close Verification View
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}