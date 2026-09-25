/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';

export type Language = 'en' | 'zh';

export interface TranslationDictionary {
  [key: string]: string;
}

const translations: Record<Language, TranslationDictionary> = {
  en: {
    // Top Bar & Global Header
    'header.searchPlaceholder': 'Search anything in DATIAN CSR HUB...',
    'header.notifications': 'Notifications',
    'header.markAllRead': 'Mark all as read',
    'header.noNotifications': 'No new alerts',
    'header.roleAdmin': 'ADMINISTRATOR',
    'header.roleUser': 'OPERATOR',
    'header.roleViewer': 'AUDITOR',
    'header.settings': 'System Settings',
    'header.branding': 'Customize Branding',
    'header.signOut': 'Sign Out',
    'header.newMessage': 'New Message',
    'header.openChat': 'Open Chat',
    'header.clickToOpen': 'Click to open conversation',

    // Navigation Menu (Sidebar)
    'nav.csrModules': 'CSR MODULES',
    'nav.management': 'MANAGEMENT',
    'nav.system': 'SYSTEM',
    'nav.dashboard': 'Dashboard',
    'nav.employees': 'Employee List',
    'nav.leadership': 'Leadership Training',
    'nav.antiBribery': 'Anti-Bribery',
    'nav.stitching': 'Training Plan (Stitching)',
    'nav.department': 'Department Training',
    'nav.reports': 'Reports & Analytics',
    'nav.messages': 'Messages',
    'nav.calendar': 'Master Calendar',
    'nav.documents': 'File Management',
    'nav.settings': 'Settings',
    'nav.backup': 'Backup & Cloud Sync',
    'nav.logout': 'Log Out',
    'nav.compliance': 'Compliance',
    'nav.integrity': 'Integrity • Accountability • Excellence',

    // Common Actions & Buttons
    'action.save': 'Save Changes',
    'action.cancel': 'Cancel',
    'action.delete': 'Delete',
    'action.edit': 'Edit',
    'action.add': 'Add New',
    'action.create': 'Create',
    'action.export': 'Export',
    'action.exportExcel': 'Export to Excel',
    'action.exportPdf': 'Export PDF',
    'action.import': 'Import CSV',
    'action.search': 'Search',
    'action.filter': 'Filter',
    'action.reset': 'Reset',
    'action.upload': 'Upload',
    'action.uploadFile': 'Upload File',
    'action.download': 'Download',
    'action.preview': 'Preview',
    'action.close': 'Close',
    'action.confirm': 'Confirm',
    'action.submit': 'Submit',
    'action.refresh': 'Refresh',
    'action.send': 'Send',
    'action.viewDetails': 'View Details',
    'action.back': 'Back',
    'action.all': 'All',
    'action.status': 'Status',
    'action.actions': 'Actions',
    'action.loading': 'Loading...',
    'action.processing': 'Processing...',
    'action.success': 'Success',
    'action.error': 'Error',
    'action.warning': 'Warning',
    'action.info': 'Information',

    // Multi-PC Sync Status
    'sync.live': 'LIVE CLOUD SYNC',
    'sync.syncing': 'SYNCHRONIZING...',
    'sync.offline': 'OFFLINE (LOCAL CACHE)',
    'sync.connectedDevices': 'connected device(s)',
    'sync.forceResync': 'Force Master Resync',
    'sync.resyncSuccess': 'Synchronized with Master Database',

    // Dashboard Overview
    'dashboard.title': 'DATIAN CSR HUB DASHBOARD',
    'dashboard.subtitle': 'Enterprise Corporate Social Responsibility, Leadership Academy & Anti-Bribery Compliance Tracking System',
    'dashboard.activeStaff': 'Total Master Staff',
    'dashboard.activeStaffDesc': 'Registered Subic Factory Workforce',
    'dashboard.activeTrainees': 'Active Trainees',
    'dashboard.activeTraineesDesc': 'Enrolled Across Active Batches',
    'dashboard.completedSessions': 'Completed Sessions',
    'dashboard.completedSessionsDesc': 'Official Certified Modules',
    'dashboard.complianceScore': 'CSR Compliance Index',
    'dashboard.complianceScoreDesc': 'Audited Standard Conformance',
    'dashboard.announcements': 'Corporate Announcements & Scheduled Training',
    'dashboard.manageAnnouncements': 'Manage Announcements',
    'dashboard.addAnnouncement': 'Post Announcement',
    'dashboard.priorityUrgent': 'Urgent',
    'dashboard.priorityHigh': 'High',
    'dashboard.priorityNormal': 'Normal',
    'dashboard.todaySchedules': 'Today\'s Training Schedule & Sessions',
    'dashboard.noSchedulesToday': 'No scheduled training sessions for today.',
    'dashboard.viewCalendar': 'View Full Calendar',
    'dashboard.departmentProgress': 'Department Training Progress & Skill Matrix',
    'dashboard.stitchingLineEfficiency': 'Stitching Line Takt & Performance Overview',
    'dashboard.quickActions': 'Quick Operations Hub',
    'dashboard.antiBriberyStatus': 'Anti-Bribery Audit & Integrity Matrix',
    'dashboard.recentActivity': 'Real-Time System Audit Trail',

    // Employee List View
    'employees.title': 'Employee Master Directory',
    'employees.subtitle': 'Complete Roster of 4,462 Subic Factory Employees & Staff Accounts',
    'employees.addEmployee': 'Add New Employee',
    'employees.searchPlaceholder': 'Search employee name, ID number, position, line...',
    'employees.filterDept': 'All Departments',
    'employees.filterStatus': 'All Statuses',
    'employees.colEmpNo': 'Employee No.',
    'employees.colName': 'Full Name',
    'employees.colDepartment': 'Department',
    'employees.colPosition': 'Position / Title',
    'employees.colHireDate': 'Onboard Date',
    'employees.colStatus': 'Account Status',
    'employees.colRole': 'Security Role',
    'employees.colActions': 'Actions',
    'employees.statusActive': 'Active',
    'employees.statusInactive': 'Inactive',
    'employees.statusOnLeave': 'On Leave',
    'employees.modalAddTitle': 'Add New Employee to Master Roster',
    'employees.modalEditTitle': 'Edit Employee Profile',
    'employees.formFullName': 'Full Name',
    'employees.formEmpNo': 'Employee Number',
    'employees.formDepartment': 'Department',
    'employees.formPosition': 'Position / Designation',
    'employees.formRole': 'System Access Level',
    'employees.formStatus': 'Account Status',
    'employees.formOnboardDate': 'Hire / Onboard Date',
    'employees.formEmail': 'Email Address (Optional)',
    'employees.deleteConfirm': 'Are you sure you want to remove this employee from the master roster?',
    'employees.savedSuccess': 'Employee record saved and synchronized across all connected users.',
    'employees.deletedSuccess': 'Employee removed from master directory.',

    // Leadership Training View
    'leadership.title': 'Leadership Training Academy',
    'leadership.subtitle': 'Management Development, Supervisor Conflict Resolution & Quality Governance',
    'leadership.tabOverview': 'Overview & Summary',
    'leadership.tabSchedules': 'Training Schedules',
    'leadership.tabCurriculum': 'Course Curriculum',
    'leadership.tabAttendance': 'Attendance & Records',
    'leadership.tabCertificates': 'Assessments & Certificates',
    'leadership.addSchedule': 'Schedule New Batch',
    'leadership.addCourse': 'Create Course Module',
    'leadership.batchCode': 'Batch Code',
    'leadership.courseName': 'Course Title',
    'leadership.instructor': 'Lead Instructor',
    'leadership.location': 'Venue / Hall',
    'leadership.date': 'Scheduled Date',
    'leadership.traineesCount': 'Enrolled Trainees',
    'leadership.statusScheduled': 'Scheduled',
    'leadership.statusInProgress': 'In Progress',
    'leadership.statusCompleted': 'Completed',

    // Anti-Bribery Hub View
    'antibribery.title': 'Anti-Bribery & Compliance Hub',
    'antibribery.subtitle': 'ISO 37001 Anti-Bribery Management System, Integrity Pledges & Whistleblower Protocol',
    'antibribery.tabWorkbook': 'Master Compliance Workbook',
    'antibribery.tabMatrix': 'Risk Assessment Matrix',
    'antibribery.tabWhistleblower': 'Confidential Reporting System',
    'antibribery.tabPledges': 'Integrity Pledges & Quizzes',
    'antibribery.tabAudit': 'Compliance Audit Trail',
    'antibribery.overallScore': 'Overall Compliance Index',
    'antibribery.riskAssessment': 'Risk Assessment Level',
    'antibribery.whistleblowerReports': 'Reported Inquiries / Cases',
    'antibribery.pledgeCompletion': 'Signed Integrity Pledges',
    'antibribery.saveChanges': 'Save Workbook to Master Cloud',
    'antibribery.savedSuccess': 'Anti-Bribery records saved and broadcast in real time.',

    // Stitching Training Plan View
    'stitching.title': 'Stitching Training Plan & Line Balancing',
    'stitching.subtitle': 'Standard Sewing Protocols, Operator Cycle Times & Takt Time Evaluations',
    'stitching.tabSummary': 'Line Summary',
    'stitching.tabOperators': 'Operator Skill Matrix',
    'stitching.tabSchedules': 'Training Sessions',
    'stitching.tabEvaluations': 'Takt Time & Efficiency',
    'stitching.addRecord': 'Add Operator Evaluation',
    'stitching.lineNo': 'Production Line',
    'stitching.operatorName': 'Operator Name',
    'stitching.operation': 'Sewing Operation',
    'stitching.cycleTime': 'Standard Cycle Time (sec)',
    'stitching.actualTime': 'Actual Cycle Time (sec)',
    'stitching.efficiency': 'Operator Efficiency',
    'stitching.skillGrade': 'Skill Grade',

    // Department Training View
    'department.title': 'Department Training & Skill Matrix',
    'department.subtitle': 'Multi-Department Skill Progression, Environmental Health & Safety (EHS) and QA Protocols',
    'department.tabMatrix': 'Skills Matrix',
    'department.tabPlans': 'Department Plans',
    'department.tabEvaluations': 'Skill Evaluations',
    'department.addEvaluation': 'Add Skill Evaluation',
    'department.department': 'Department',
    'department.skillLevel': 'Mastery Level',
    'department.targetDate': 'Target Completion',

    // Reports & Analytics View
    'reports.title': 'CSR Compliance Reports & Analytics',
    'reports.subtitle': 'Exportable Audit Dossiers, Training Metrics and Regulatory Certifications',
    'reports.filterRange': 'Date Range Filter',
    'reports.filterDept': 'Filter by Department',
    'reports.totalHours': 'Total Training Hours Logged',
    'reports.averagePass': 'Average Assessment Score',
    'reports.certifiedStaff': 'Total Certified Staff',
    'reports.complianceRate': 'Overall Conformance Rate',
    'reports.exportReport': 'Export Complete Audit Report',
    'reports.monthlyTrend': 'Monthly Certification & Hours Trend',
    'reports.deptBreakdown': 'Departmental Training Hours Breakdown',

    // Calendar View
    'calendar.title': 'Master CSR & Training Calendar',
    'calendar.subtitle': 'Enterprise Training Sessions, Audit Deadlines & Compliance Schedules',
    'calendar.today': 'Today',
    'calendar.month': 'Month',
    'calendar.week': 'Week',
    'calendar.day': 'Day',
    'calendar.addEvent': 'Schedule New Event',
    'calendar.eventTitle': 'Event Title',
    'calendar.eventDate': 'Date',
    'calendar.eventTime': 'Time',
    'calendar.eventCategory': 'Category',
    'calendar.eventLocation': 'Location',
    'calendar.eventTrainer': 'Instructor / Lead',
    'calendar.noEvents': 'No events scheduled for this day.',

    // File Management / Documents View
    'documents.title': 'Corporate Document Vault & SOPs',
    'documents.subtitle': 'Cloud Synchronized Standard Operating Procedures, Inspection Sheets & Audit Evidence',
    'documents.uploadBtn': 'Upload New Document',
    'documents.newFolder': 'Create Folder',
    'documents.searchFiles': 'Search documents by title, folder, type...',
    'documents.colFileName': 'Document Name',
    'documents.colFolder': 'Folder / Category',
    'documents.colSize': 'File Size',
    'documents.colUploadDate': 'Upload Date',
    'documents.colUploadedBy': 'Uploaded By',
    'documents.colActions': 'Actions',
    'documents.download': 'Download File',
    'documents.preview': 'View Preview',
    'documents.delete': 'Delete Document',
    'documents.allFiles': 'All Files & Folders',
    'documents.dropzoneText': 'Drag and drop files here, or click to browse (PDF, XLSX, DOCX, JPG, PNG up to 100MB)',
    'documents.deleteConfirm': 'Are you sure you want to delete this document from the server vault?',

    // Message Hub View
    'messages.title': 'Real-Time Enterprise Message Hub',
    'messages.subtitle': 'Live Multi-PC Collaboration, Official Announcements & Direct Colleague Messaging',
    'messages.channels': 'Company Channels',
    'messages.directMessages': 'Direct Messages',
    'messages.onlineStaff': 'Online Colleagues',
    'messages.searchContacts': 'Search chats & employees...',
    'messages.typePlaceholder': 'Type a secure message...',
    'messages.sendPhoto': 'Send Photo Attachment',
    'messages.attachFile': 'Attach File',
    'messages.send': 'Send',
    'messages.noMessages': 'No messages yet in this conversation. Say hello!',
    'messages.privateAlert': 'This is a private end-to-end conversation. Only intended participants have access.',
    'messages.online': 'Online',
    'messages.offline': 'Offline',

    // Settings View
    'settings.title': 'System Settings & Enterprise Configuration',
    'settings.subtitle': 'Security Clearances, Language Selection, Branding Assets, Audit Trail & Database Management',
    'settings.securityClearance': 'Active User Security Clearance',
    'settings.securityDesc': 'Toggle between System Administrator (Full Access) and Standard User (Restricted Purge) to test permissions.',
    'settings.languageSelect': 'System Language / 界面语言',
    'settings.languageDesc': 'Switch between English (EN) and 中文 (ZH) across the entire application interface in real time.',
    'settings.branding': 'Corporate Branding & Logo Suite',
    'settings.brandingDesc': 'Upload high-resolution transparent corporate logos for header, login screen, and reports.',
    'settings.auditTrail': 'Cloud Audit Trail & Event Logs',
    'settings.auditDesc': 'Real-time record of all user actions, logins, record creations, edits, and deletions.',
    'settings.databaseReset': 'Factory Data Reset',
    'settings.databaseResetDesc': 'Reset all local evaluation records back to official factory default seeds.',
    'settings.resetBtn': 'Reset System Data to Default',
    'settings.replayStartup': 'Replay Startup Animation',

    // Authentication & Login Screen
    'login.title': 'DATIAN CSR HUB',
    'login.subtitle': 'Enterprise Corporate Social Responsibility Management System',
    'login.selectEmployee': 'Select Your Name / Identity',
    'login.searchEmployee': 'Type your name to search...',
    'login.employeeNo': 'Password',
    'login.enterEmpNo': 'Enter your password...',
    'login.signInBtn': 'Sign In to CSR HUB',
    'login.verifying': 'Verifying Credentials...',
    'login.adminHint': 'System Administrator? Select "Datian Subic Shoes Inc." and enter your password.',
    'login.footer': 'Subic Factory Internal Compliance System • Authorized Personnel Only',
    'login.errorMissingFields': 'Please select your name and manually enter your password.',
    'login.errorInvalid': 'Invalid password. Please check your password and try again.'
  },
  zh: {
    // Top Bar & Global Header
    'header.searchPlaceholder': '在DATIAN CSR HUB中搜索任何内容...',
    'header.notifications': '系统通知',
    'header.markAllRead': '全部标为已读',
    'header.noNotifications': '暂无新通知',
    'header.roleAdmin': '系统管理员',
    'header.roleUser': '操作主管',
    'header.roleViewer': '审计专员',
    'header.settings': '系统设置',
    'header.branding': '品牌定制',
    'header.signOut': '退出登录',
    'header.newMessage': '新消息',
    'header.openChat': '打开聊天',
    'header.clickToOpen': '点击打开对话',

    // Navigation Menu (Sidebar)
    'nav.csrModules': 'CSR核心模块',
    'nav.management': '管理中心',
    'nav.system': '系统管理',
    'nav.dashboard': '工作台仪表盘',
    'nav.employees': '员工名录表',
    'nav.leadership': '领导力培训',
    'nav.antiBribery': '反贿赂合规',
    'nav.stitching': '培训计划(针车)',
    'nav.department': '部门岗位培训',
    'nav.reports': '报表与分析',
    'nav.messages': '实时消息中心',
    'nav.calendar': '培训日历',
    'nav.documents': '文件资料管理',
    'nav.settings': '系统设置',
    'nav.backup': '备份与云同步',
    'nav.logout': '退出登录',
    'nav.compliance': '合规承诺',
    'nav.integrity': '诚信 • 担当 • 卓越',

    // Common Actions & Buttons
    'action.save': '保存修改',
    'action.cancel': '取消',
    'action.delete': '删除',
    'action.edit': '编辑',
    'action.add': '新增',
    'action.create': '创建',
    'action.export': '导出',
    'action.exportExcel': '导出Excel表格',
    'action.exportPdf': '导出PDF文档',
    'action.import': '导入CSV文件',
    'action.search': '搜索',
    'action.filter': '筛选',
    'action.reset': '重置',
    'action.upload': '上传',
    'action.uploadFile': '上传文件',
    'action.download': '下载',
    'action.preview': '预览',
    'action.close': '关闭',
    'action.confirm': '确认',
    'action.submit': '提交',
    'action.refresh': '刷新',
    'action.send': '发送',
    'action.viewDetails': '查看详情',
    'action.back': '返回',
    'action.all': '全部',
    'action.status': '状态',
    'action.actions': '操作',
    'action.loading': '加载中...',
    'action.processing': '处理中...',
    'action.success': '操作成功',
    'action.error': '操作失败',
    'action.warning': '警告提示',
    'action.info': '系统提示',

    // Multi-PC Sync Status
    'sync.live': '云端实时同步',
    'sync.syncing': '正在同步数据...',
    'sync.offline': '离线模式(本地缓存)',
    'sync.connectedDevices': '台在线设备',
    'sync.forceResync': '强制云端全量同步',
    'sync.resyncSuccess': '已成功从主数据库拉取最新数据',

    // Dashboard Overview
    'dashboard.title': 'DATIAN CSR 企业合规与培训管理中心',
    'dashboard.subtitle': '企业社会责任、领导力管理学院与反贿赂合规全流程实时追踪系统',
    'dashboard.activeStaff': '全厂总员工数',
    'dashboard.activeStaffDesc': '苏比克鞋厂官方注册在册员工',
    'dashboard.activeTrainees': '参训在训学员',
    'dashboard.activeTraineesDesc': '当前各培训班次在训人数',
    'dashboard.completedSessions': '已结训课时',
    'dashboard.completedSessionsDesc': '已完成考核认证官方课程',
    'dashboard.complianceScore': 'CSR合规指数',
    'dashboard.complianceScoreDesc': '第三方审计与规范符合率',
    'dashboard.announcements': '企业重要公告与培训排程',
    'dashboard.manageAnnouncements': '公告管理',
    'dashboard.addAnnouncement': '发布新公告',
    'dashboard.priorityUrgent': '紧急',
    'dashboard.priorityHigh': '重要',
    'dashboard.priorityNormal': '常规',
    'dashboard.todaySchedules': '今日培训排程与授课班次',
    'dashboard.noSchedulesToday': '今日暂无安排培训班次。',
    'dashboard.viewCalendar': '查看完整日历',
    'dashboard.departmentProgress': '各部门技能矩阵与培训进度',
    'dashboard.stitchingLineEfficiency': '针车产线节拍与工效实时总览',
    'dashboard.quickActions': '快捷操作入口',
    'dashboard.antiBriberyStatus': '反贿赂合规审计与诚信矩阵',
    'dashboard.recentActivity': '系统实时审计追踪日志',

    // Employee List View
    'employees.title': '员工总名册与账户目录',
    'employees.subtitle': '苏比克鞋厂 4,462 名在册员工完整档案及系统账号',
    'employees.addEmployee': '新增员工档案',
    'employees.searchPlaceholder': '搜索员工姓名、工号、部门、岗位、产线...',
    'employees.filterDept': '全部部门',
    'employees.filterStatus': '全部状态',
    'employees.colEmpNo': '员工工号',
    'employees.colName': '员工姓名',
    'employees.colDepartment': '所属部门',
    'employees.colPosition': '岗位职称',
    'employees.colHireDate': '入职日期',
    'employees.colStatus': '账户状态',
    'employees.colRole': '权限角色',
    'employees.colActions': '操作',
    'employees.statusActive': '在职',
    'employees.statusInactive': '离职',
    'employees.statusOnLeave': '请假',
    'employees.modalAddTitle': '录入新员工到主名册',
    'employees.modalEditTitle': '编辑员工档案信息',
    'employees.formFullName': '员工全名',
    'employees.formEmpNo': '员工工号 (登录密码)',
    'employees.formDepartment': '所属部门',
    'employees.formPosition': '职务 / 岗位',
    'employees.formRole': '系统权限等级',
    'employees.formStatus': '在职状态',
    'employees.formOnboardDate': '入职 / 报到日期',
    'employees.formEmail': '电子邮箱 (选填)',
    'employees.deleteConfirm': '确定要从主名册中删除此员工吗？此操作将同步给所有在线用户。',
    'employees.savedSuccess': '员工档案已保存并已实时推送至所有在线设备。',
    'employees.deletedSuccess': '员工档案已从主名册删除。',

    // Leadership Training View
    'leadership.title': '领导力培训学院',
    'leadership.subtitle': '中高层管理技能、基层主管冲突解决及品质治理体系',
    'leadership.tabOverview': '总览与指标',
    'leadership.tabSchedules': '培训排期',
    'leadership.tabCurriculum': '课程大纲',
    'leadership.tabAttendance': '学员签到表',
    'leadership.tabCertificates': '考核与证书',
    'leadership.addSchedule': '创建培训班次',
    'leadership.addCourse': '开发新课程',
    'leadership.batchCode': '班次代码',
    'leadership.courseName': '课程名称',
    'leadership.instructor': '主讲讲师',
    'leadership.location': '培训地点',
    'leadership.date': '培训日期',
    'leadership.traineesCount': '参训人数',
    'leadership.statusScheduled': '已排期',
    'leadership.statusInProgress': '进行中',
    'leadership.statusCompleted': '已结训',

    // Anti-Bribery Hub View
    'antibribery.title': '反贿赂与合规管理中心',
    'antibribery.subtitle': 'ISO 37001反贿赂管理体系、廉洁诚信承诺书与举报机制',
    'antibribery.tabWorkbook': '主合规电子表格',
    'antibribery.tabMatrix': '合规风险评估矩阵',
    'antibribery.tabWhistleblower': '保密举报受理系统',
    'antibribery.tabPledges': '诚信承诺书与知识测试',
    'antibribery.tabAudit': '合规审计日志',
    'antibribery.overallScore': '反贿赂综合合规指数',
    'antibribery.riskAssessment': '风险等级评估',
    'antibribery.whistleblowerReports': '举报投诉受理数',
    'antibribery.pledgeCompletion': '已签署诚信承诺数',
    'antibribery.saveChanges': '保存并同步到云端数据库',
    'antibribery.savedSuccess': '反贿赂数据已保存并实时广播。',

    // Stitching Training Plan View
    'stitching.title': '针车培训计划与产线平衡',
    'stitching.subtitle': '标准缝制工艺SOP、操作员节拍时间评定与技能矩阵',
    'stitching.tabSummary': '产线总览',
    'stitching.tabOperators': '车位技能矩阵',
    'stitching.tabSchedules': '针车实操班次',
    'stitching.tabEvaluations': '节拍效率测评',
    'stitching.addRecord': '录入操作员测时',
    'stitching.lineNo': '生产线别',
    'stitching.operatorName': '操作员姓名',
    'stitching.operation': '工序名称',
    'stitching.cycleTime': '标准工时(秒)',
    'stitching.actualTime': '实测工时(秒)',
    'stitching.efficiency': '工效达标率',
    'stitching.skillGrade': '技能等级',

    // Department Training View
    'department.title': '各部门技能培训与矩阵',
    'department.subtitle': '多部门技能进阶体系、环境健康安全(EHS)及品质检验规程',
    'department.tabMatrix': '部门技能矩阵',
    'department.tabPlans': '部门培训计划',
    'department.tabEvaluations': '考核评估记录',
    'department.addEvaluation': '录入技能测评',
    'department.department': '所属部门',
    'department.skillLevel': '熟练度等级',
    'department.targetDate': '目标完成日期',

    // Reports & Analytics View
    'reports.title': 'CSR合规分析与报表中心',
    'reports.subtitle': '官方审计报告导出、培训工时统计与认证达标追踪',
    'reports.filterRange': '日期范围筛选',
    'reports.filterDept': '按部门筛选',
    'reports.totalHours': '累计总培训课时',
    'reports.averagePass': '考核平均达标率',
    'reports.certifiedStaff': '已获证书员工总数',
    'reports.complianceRate': '整体合规达标指数',
    'reports.exportReport': '导出完整审计报表',
    'reports.monthlyTrend': '月度培训课时与认证趋势',
    'reports.deptBreakdown': '各部门培训课时分布占比',

    // Calendar View
    'calendar.title': 'CSR与培训总日历',
    'calendar.subtitle': '全厂培训排期、外部审计节点与合规评估日程表',
    'calendar.today': '今日',
    'calendar.month': '月视图',
    'calendar.week': '周视图',
    'calendar.day': '日视图',
    'calendar.addEvent': '添加新日程',
    'calendar.eventTitle': '日程名称',
    'calendar.eventDate': '日期',
    'calendar.eventTime': '时间',
    'calendar.eventCategory': '培训类别',
    'calendar.eventLocation': '地点/教室',
    'calendar.eventTrainer': '讲师/负责人',
    'calendar.noEvents': '今日暂无安排日程。',

    // File Management / Documents View
    'documents.title': '企业文件资料库与SOP',
    'documents.subtitle': '云端实时同步的标准操作规程、巡检记录与审计证据文件',
    'documents.uploadBtn': '上传新文件',
    'documents.newFolder': '新建文件夹',
    'documents.searchFiles': '搜索文档名称、文件夹、格式...',
    'documents.colFileName': '文件名称',
    'documents.colFolder': '所属分类 / 文件夹',
    'documents.colSize': '文件大小',
    'documents.colUploadDate': '上传日期',
    'documents.colUploadedBy': '上传人',
    'documents.colActions': '操作',
    'documents.download': '下载文件',
    'documents.preview': '在线预览',
    'documents.delete': '删除文件',
    'documents.allFiles': '全部文件与分类',
    'documents.dropzoneText': '拖拽文件至此，或点击选择本地文件 (支持PDF、Excel、Word、图片等，最大100MB)',
    'documents.deleteConfirm': '确定要从服务器云端永久删除此文件吗？此操作将同步给所有用户。',

    // Message Hub View
    'messages.title': '企业实时协作消息中心',
    'messages.subtitle': '多PC多终端实时消息互通、公司官方公告频道与同事一对一私聊',
    'messages.channels': '公司公告群组',
    'messages.directMessages': '同事私信',
    'messages.onlineStaff': '在线同事',
    'messages.searchContacts': '搜索联系人与聊天...',
    'messages.typePlaceholder': '输入安全保密消息...',
    'messages.sendPhoto': '发送图片附件',
    'messages.attachFile': '添加文件附件',
    'messages.send': '发送',
    'messages.noMessages': '暂无聊天记录，发条消息打个招呼吧！',
    'messages.privateAlert': '此对话为点对点私密沟通，仅双方当事人可见。',
    'messages.online': '在线',
    'messages.offline': '离线',

    // Settings View
    'settings.title': '系统设置与企业配置',
    'settings.subtitle': '安全权限管理、全系统多语言切换、品牌标识定制、审计追踪与数据库管理',
    'settings.securityClearance': '当前用户安全权限等级',
    'settings.securityDesc': '切换系统所有者(管理员)与操作主管模式，验证系统安全与数据删除保护策略。',
    'settings.languageSelect': '系统界面语言 / System Language',
    'settings.languageDesc': '一键切换系统界面语言(中文 / English)，全系统各模块即时生效并持久化保存。',
    'settings.branding': '企业品牌标识与LOGO设置',
    'settings.brandingDesc': '上传并应用公司高清晰透明LOGO，自动应用于系统头部、登录页和报表。',
    'settings.auditTrail': '云端操作审计追踪日志',
    'settings.auditDesc': '实时记录所有用户的登录、创建、修改、删除和上传等合规操作。',
    'settings.databaseReset': '系统数据重置',
    'settings.databaseResetDesc': '将所有本地测时与排程恢复至工厂官方初始标准预设。',
    'settings.resetBtn': '重置系统数据为默认状态',
    'settings.replayStartup': '重新播放开机启动动画',

    // Authentication & Login Screen
    'login.title': 'DATIAN CSR 企业管理平台',
    'login.subtitle': '企业社会责任、反贿赂合规与技能培训数字化管理系统',
    'login.selectEmployee': '选择您的姓名 / 身份',
    'login.searchEmployee': '输入姓名进行快速查找...',
    'login.employeeNo': '登录密码',
    'login.enterEmpNo': '请输入您的登录密码...',
    'login.signInBtn': '登录 CSR HUB 系统',
    'login.verifying': '正在验证身份凭据...',
    'login.adminHint': '系统超级管理员？请选择 "Datian Subic Shoes Inc." 并输入管理员密码。',
    'login.footer': '苏比克鞋厂内部合规与技能系统 • 仅限授权员工访问',
    'login.errorMissingFields': '请先选择您的姓名并输入登录密码。',
    'login.errorInvalid': '密码不匹配，请核对密码后重试。'
  }
};

// Global reactive language event bus
const listeners = new Set<(lang: Language) => void>();

export function getSavedLanguage(): Language {
  try {
    const saved = localStorage.getItem('csr_hub_language');
    if (saved === 'zh' || saved === 'en') return saved;
    // Fallback if older 'CN' was stored
    if (saved === 'CN' || saved === 'cn') return 'zh';
    return 'en';
  } catch {
    return 'en';
  }
}

export function setAppLanguage(lang: Language) {
  try {
    localStorage.setItem('csr_hub_language', lang);
  } catch {}
  listeners.forEach(fn => {
    try { fn(lang); } catch {}
  });
}

/**
 * Hook to consume current language and translation helper in any React component
 */
export function useLanguage() {
  const [currentLang, setCurrentLang] = useState<Language>(() => getSavedLanguage());

  useEffect(() => {
    const handler = (newLang: Language) => {
      setCurrentLang(newLang);
    };
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  const t = (key: string, defaultText?: string): string => {
    const dict = translations[currentLang] || translations.en;
    if (dict[key]) return dict[key];
    const fallbackDict = translations.en;
    if (fallbackDict[key]) return fallbackDict[key];
    return defaultText || key;
  };

  const changeLanguage = (lang: Language) => {
    setAppLanguage(lang);
  };

  return {
    language: currentLang,
    setLanguage: changeLanguage,
    t,
    isZh: currentLang === 'zh',
    isEn: currentLang === 'en'
  };
}

/**
 * Direct function translation helper for non-react contexts or simple lookups
 */
export function t(key: string, defaultText?: string, lang?: Language): string {
  const targetLang = lang || getSavedLanguage();
  const dict = translations[targetLang] || translations.en;
  if (dict[key]) return dict[key];
  if (translations.en[key]) return translations.en[key];
  return defaultText || key;
}
