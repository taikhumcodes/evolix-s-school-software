import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding development database...');

  // 1. Standard Permissions
  const permissionsList = [
    { code: 'users.manage', description: 'Manage user accounts and roles' },
    { code: 'roles.manage', description: 'Manage roles and permissions' },
    { code: 'settings.manage', description: 'Manage configuration and branding' },
    { code: 'security.manage', description: 'Manage security policies, IP restrictions, sessions' },
    { code: 'academic.manage', description: 'Manage academic years and terms' },
    { code: 'students.view', description: 'View student records and profiles' },
    { code: 'students.manage', description: 'Manage student records, enrollments, and status' },
    { code: 'admissions.view', description: 'View admission applications' },
    { code: 'admissions.manage', description: 'Manage, approve, and convert admission applications' },
    { code: 'student.documents.view', description: 'View student and admission documents' },
    { code: 'student.documents.manage', description: 'Upload, verify, and archive student documents' },
    { code: 'student.discipline.view', description: 'View confidential student discipline records' },
    { code: 'student.discipline.manage', description: 'Create and manage student discipline incidents' },
    { code: 'student.import', description: 'Bulk import students via CSV' },
    { code: 'student.export', description: 'Export student lists to CSV' },
    { code: 'finance.manage', description: 'Manage fee structures and receipts' },
    { code: 'attendance.manage', description: 'Manage attendance and locks' },
    { code: 'master_data.view', description: 'View master data reference records' },
    { code: 'master_data.manage', description: 'Create, edit, and archive master data reference records' },
    { code: 'school.create', description: 'Create and initialize a new school within tenant' },
    { code: 'guardians.view', description: 'View guardian and parent profiles' },
    { code: 'guardians.manage', description: 'Create, update, and manage guardians and child links' },
    { code: 'families.view', description: 'View family households and siblings' },
    { code: 'families.manage', description: 'Create, update, and manage family households' },
    { code: 'guardians.merge', description: 'Merge duplicate guardian profiles' },
    { code: 'guardians.documents.view', description: 'View guardian documents' },
    { code: 'guardians.documents.manage', description: 'Upload, verify, and manage guardian documents' },
    { code: 'parent_access.manage', description: 'Provision and manage parent portal user accounts' },
    { code: 'guardian.import', description: 'Bulk import guardians via CSV' },
    { code: 'guardian.export', description: 'Export guardian lists to CSV' },
    { code: 'parent.children.view', description: 'View linked child records in parent portal' },
    { code: 'attendance.view', description: 'View student attendance registers and summaries' },
    { code: 'attendance.mark', description: 'Mark student daily attendance' },
    { code: 'attendance.override', description: 'Override locked attendance and apply administrative corrections' },
    { code: 'student_leave.view', description: 'View student leave requests' },
    { code: 'student_leave.manage', description: 'Create and edit student leave requests' },
    { code: 'student_leave.approve', description: 'Approve or reject student leave requests' },
    { code: 'staff_attendance.view', description: 'View staff attendance and check-in records' },
    { code: 'staff_attendance.manage', description: 'Manage staff attendance and manual corrections' },
    { code: 'staff_leave.view', description: 'View staff leave requests' },
    { code: 'staff_leave.manage', description: 'Create staff leave requests' },
    { code: 'staff_leave.approve', description: 'Approve or reject staff leave requests' },
    { code: 'holidays.view', description: 'View school calendar holidays and closures' },
    { code: 'holidays.manage', description: 'Create, update, and manage school holidays' },
    { code: 'parent.attendance.view', description: 'View linked child attendance in parent portal' },
    { code: 'parent.leave.create', description: 'Submit leave requests for linked child in parent portal' },
    { code: 'parent.leave.view', description: 'View linked child leave status in parent portal' },
    { code: 'academics.view', description: 'View academic structures, terms, and assignments' },
    { code: 'academics.manage', description: 'Manage academic terms, assignments, and policies' },
    { code: 'timetable.view', description: 'View class and teacher timetables' },
    { code: 'timetable.manage', description: 'Create and update timetable schedules and periods' },
    { code: 'homework.view', description: 'View homework assignments' },
    { code: 'homework.manage', description: 'Create, publish, and manage homework' },
    { code: 'exams.view', description: 'View examinations, schedules, and configurations' },
    { code: 'exams.manage', description: 'Create and manage examinations and assessment subjects' },
    { code: 'marks.view', description: 'View examination marks registers' },
    { code: 'marks.enter', description: 'Enter and update examination marks' },
    { code: 'marks.moderate', description: 'Apply grace marks and moderate student scores' },
    { code: 'results.view', description: 'View student results and report cards' },
    { code: 'results.finalize', description: 'Finalize exam results and lock marks' },
    { code: 'results.publish', description: 'Publish or unpublish finalized results' },
    { code: 'promotion.view', description: 'View student promotion registers' },
    { code: 'promotion.manage', description: 'Execute student promotion, detention, and completion' },
    { code: 'parent.homework.view', description: 'View published homework for linked children' },
    { code: 'parent.exams.view', description: 'View exam timetables and schedules for linked children' },
    { code: 'parent.results.view', description: 'View published report cards and results for linked children' },
    { code: 'finance.view', description: 'View finance dashboard, accounts, and overviews' },
    { code: 'finance.fees.view', description: 'View fee structures, assignments, and student dues' },
    { code: 'finance.fees.manage', description: 'Create and manage fee structures, assignments, and invoices' },
    { code: 'finance.collect', description: 'Collect student fee payments and issue receipts' },
    { code: 'finance.concession.manage', description: 'Manage fee concessions and scholarships' },
    { code: 'finance.concession.approve', description: 'Approve or reject fee concessions' },
    { code: 'finance.refunds.manage', description: 'Initiate and manage student fee refunds' },
    { code: 'finance.refunds.approve', description: 'Approve student fee refunds' },
    { code: 'finance.writeoff.manage', description: 'Manage student fee write-offs and bad debts' },
    { code: 'finance.expenses.view', description: 'View expense bills, vouchers, and vendor payables' },
    { code: 'finance.expenses.manage', description: 'Create and manage expense bills and vendor records' },
    { code: 'finance.expenses.approve', description: 'Approve expense bills and vouchers' },
    { code: 'finance.accounts.view', description: 'View chart of accounts and balances' },
    { code: 'finance.accounts.manage', description: 'Manage chart of accounts and mappings' },
    { code: 'finance.journals.view', description: 'View journal register and general ledger' },
    { code: 'finance.journals.post', description: 'Post manual journal entries' },
    { code: 'finance.journals.reverse', description: 'Reverse posted journal entries' },
    { code: 'finance.bank.view', description: 'View bank and cash accounts, transfers, statements' },
    { code: 'finance.bank.manage', description: 'Manage bank accounts, transfers, and statement imports' },
    { code: 'finance.bank.reconcile', description: 'Perform and close bank statement reconciliations' },
    { code: 'finance.reports.view', description: 'View accounting, collection, outstanding, and financial reports' },
    { code: 'finance.export', description: 'Export financial reports and data to CSV' },
    { code: 'finance.opening_balance.manage', description: 'Manage and post opening balances' },
    { code: 'finance.period.close', description: 'Close financial accounting periods' },
    { code: 'finance.period.reopen', description: 'Reopen closed financial accounting periods' },
    { code: 'parent.finance.view', description: 'View linked child fee invoices, receipts, and statement' },
    // HR & Payroll Permissions
    { code: 'hr.view', description: 'View HR dashboard and directory' },
    { code: 'hr.employee.view', description: 'View employee records and profiles' },
    { code: 'hr.employee.manage', description: 'Create and manage employee profiles' },
    { code: 'hr.leave.view', description: 'View employee leaves and balances' },
    { code: 'hr.leave.manage', description: 'Create and manage employee leaves' },
    { code: 'hr.leave.approve', description: 'Approve or reject employee leaves' },
    { code: 'hr.separation.manage', description: 'Initiate and manage employee separations' },
    { code: 'payroll.view', description: 'View payroll runs and payslips' },
    { code: 'payroll.run.manage', description: 'Create and process payroll runs' },
    { code: 'payroll.run.approve', description: 'Approve payroll runs' },
    { code: 'payroll.run.post', description: 'Post finalized payroll runs to Finance' },
    { code: 'payroll.payment.manage', description: 'Record and process payroll disbursements' },
    { code: 'payroll.settings.manage', description: 'Manage salary components, structures, and payroll config' },
    { code: 'payroll.export', description: 'Export payroll summaries and bank disbursement CSVs' },
    // Module 09: School Operations Permissions
    { code: 'operations.view', description: 'View School Operations Overview and dashboard' },
    { code: 'transport.view', description: 'View transport fleet, vehicles, routes, and trips' },
    { code: 'transport.manage', description: 'Create and manage vehicles, routes, stops, and schedules' },
    { code: 'transport.assign', description: 'Assign students and staff to transport routes and vehicles' },
    { code: 'transport.trip.manage', description: 'Manage transport trips, boarding, odometer, and fuel logs' },
    { code: 'transport.export', description: 'Export transport manifests and fleet reports to CSV' },
    { code: 'inventory.view', description: 'View inventory categories, items, locations, and stock ledger' },
    { code: 'inventory.manage', description: 'Manage inventory items, locations, categories, and receipts' },
    { code: 'inventory.issue', description: 'Issue, return, and transfer inventory stock' },
    { code: 'inventory.adjust', description: 'Make manual stock adjustments with audited reasons' },
    { code: 'inventory.assets.view', description: 'View asset register, tagging, and assignment history' },
    { code: 'inventory.assets.manage', description: 'Create, assign, return, transfer, and maintain assets' },
    { code: 'inventory.assets.dispose', description: 'Authorize and execute asset disposals' },
    { code: 'inventory.export', description: 'Export inventory stock and asset registers to CSV' },
    { code: 'gate.view', description: 'View visitor log, gate register, and student pickups' },
    { code: 'gate.manage', description: 'Create and manage visitor profiles and appointments' },
    { code: 'gate.checkin', description: 'Check-in visitors and issue visitor passes' },
    { code: 'gate.checkout', description: 'Check-out visitors and record departures' },
    { code: 'gate.pickup', description: 'Verify guardian authorization and release students' },
    { code: 'gate.pickup.override', description: 'Authorize exceptional student pickup overrides with audited reasons' },
    { code: 'gate.export', description: 'Export gate register and pickup logs to CSV' },
    { code: 'events.view', description: 'View school events, activities, schedules, and venues' },
    { code: 'events.manage', description: 'Create, schedule, publish, and manage school events' },
    { code: 'events.participants.manage', description: 'Manage event coordinators, participants, and bulk enrollment' },
    { code: 'events.results.manage', description: 'Record event attendance, scores, positions, and achievements' },
    { code: 'events.export', description: 'Export event rosters, participant sheets, and results to CSV' },
  ];

  const permissions = [];
  for (const p of permissionsList) {
    const perm = await prisma.permission.upsert({
      where: { code: p.code },
      update: { description: p.description },
      create: { code: p.code, description: p.description },
    });
    permissions.push(perm);
  }

  // 2. Default Tenant
  const tenant = await prisma.tenant.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Acme Education Trust',
      domain: 'acme.evolix.local',
      isActive: true,
    },
  });

  // 3. Default School
  const school = await prisma.school.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      tenantId: tenant.id,
      code: 'GHS01',
      name: 'Greenwood High School',
      isActive: true,
    },
  });

  // 4. Default Roles
  const superadminRole = await prisma.role.upsert({
    where: { id: '00000000-0000-0000-0000-000000000003' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000003',
      tenantId: tenant.id,
      name: 'Superadmin',
      isSystem: true,
    },
  });

  // Assign all permissions to superadmin role
  for (const perm of permissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: superadminRole.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        roleId: superadminRole.id,
        permissionId: perm.id,
      },
    });
  }

  // Parent Role
  const parentRole = await prisma.role.upsert({
    where: { id: '00000000-0000-0000-0000-000000000005' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000005',
      tenantId: tenant.id,
      name: 'Parent',
      isSystem: true,
    },
  });

  const parentPermCodes = [
    'parent.children.view',
    'parent.attendance.view',
    'parent.leave.create',
    'parent.leave.view',
    'parent.homework.view',
    'parent.exams.view',
    'parent.results.view',
    'parent.finance.view',
  ];
  for (const code of parentPermCodes) {
    const perm = permissions.find((p) => p.code === code);
    if (perm) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: parentRole.id,
            permissionId: perm.id,
          },
        },
        update: {},
        create: {
          roleId: parentRole.id,
          permissionId: perm.id,
        },
      });
    }
  }

  // 5. Default Admin User
  const hashedPassword = await bcrypt.hash('Password123!', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@evolix.local' },
    update: {
      hashedPassword,
      firstName: 'System',
      lastName: 'Admin',
      isActive: true,
    },
    create: {
      id: '00000000-0000-0000-0000-000000000004',
      tenantId: tenant.id,
      email: 'admin@evolix.local',
      hashedPassword,
      firstName: 'System',
      lastName: 'Admin',
      isActive: true,
    },
  });

  // Assign user to role
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: superadminRole.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: superadminRole.id,
    },
  });

  // Assign user to school
  await prisma.userSchool.upsert({
    where: {
      userId_schoolId: {
        userId: adminUser.id,
        schoolId: school.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      schoolId: school.id,
    },
  });

  // 6. Security Policy
  await prisma.securityPolicy.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      passwordMinLength: 8,
      passwordRequireUppercase: true,
      passwordRequireLowercase: true,
      passwordRequireNumber: true,
      passwordRequireSpecial: false,
      passwordHistoryCount: 3,
      maxFailedAttempts: 5,
      lockoutMinutes: 15,
      ipRestrictionMode: 'DISABLED',
    },
  });

  // 7. Number Series
  const seriesDefinitions = [
    { code: 'STUDENT', prefix: 'STU-{YYYY}-', padding: 5 },
    { code: 'ADMISSION', prefix: 'ADM-{YY}-', padding: 4 },
    { code: 'RECEIPT', prefix: 'RCPT-{YYYY}-', padding: 6 },
    { code: 'INVOICE', prefix: 'INV-{YYYY}-', padding: 6 },
    { code: 'CREDIT_NOTE', prefix: 'CN-{YYYY}-', padding: 5 },
    { code: 'REFUND', prefix: 'REF-{YYYY}-', padding: 5 },
    { code: 'EXPENSE', prefix: 'EXP-{YYYY}-', padding: 5 },
    { code: 'JOURNAL', prefix: 'JRN-{YYYY}-', padding: 6 },
    { code: 'VENDOR_PAYMENT', prefix: 'VPAY-{YYYY}-', padding: 5 },
    { code: 'BANK_TRANSFER', prefix: 'BT-{YYYY}-', padding: 5 },
  ];
  for (const s of seriesDefinitions) {
    const existing = await prisma.numberSeries.findFirst({
      where: { tenantId: tenant.id, code: s.code },
    });
    if (!existing) {
      await prisma.numberSeries.create({
        data: {
          tenantId: tenant.id,
          schoolId: school.id,
          code: s.code,
          prefix: s.prefix,
          padding: s.padding,
          currentValue: 0,
        },
      });
    }
  }

  // 8. Default School Configuration & Branding
  await prisma.schoolConfiguration.upsert({
    where: { schoolId: school.id },
    update: {},
    create: {
      tenantId: tenant.id,
      schoolId: school.id,
      legalName: 'Greenwood High School Trust',
      shortName: 'Greenwood High',
      board: 'CBSE',
      country: 'IN',
      defaultLanguage: 'en',
      timezone: 'Asia/Kolkata',
    },
  });

  await prisma.brandingConfiguration.upsert({
    where: { schoolId: school.id },
    update: {},
    create: {
      tenantId: tenant.id,
      schoolId: school.id,
      primaryPrintColor: '#4F642C',
      accentPrintColor: '#85A34D',
      letterheadText: 'GREENWOOD HIGH SCHOOL - CBSE AFFILIATED',
    },
  });

  // 11. Geographic Reference Masters
  const india = await prisma.country.upsert({
    where: { isoCode: 'IN' },
    update: {},
    create: {
      name: 'India',
      isoCode: 'IN',
      dialCode: '+91',
      currency: 'INR',
    },
  });

  const mh = await prisma.state.upsert({
    where: { countryId_name: { countryId: india.id, name: 'Maharashtra' } },
    update: {},
    create: { countryId: india.id, name: 'Maharashtra', code: 'MH' },
  });

  const dl = await prisma.state.upsert({
    where: { countryId_name: { countryId: india.id, name: 'Delhi' } },
    update: {},
    create: { countryId: india.id, name: 'Delhi', code: 'DL' },
  });

  await prisma.city.upsert({
    where: { stateId_name: { stateId: mh.id, name: 'Mumbai' } },
    update: {},
    create: { stateId: mh.id, name: 'Mumbai' },
  });

  await prisma.city.upsert({
    where: { stateId_name: { stateId: dl.id, name: 'New Delhi' } },
    update: {},
    create: { stateId: dl.id, name: 'New Delhi' },
  });

  // 12. Demographic Masters
  const religions = ['Hinduism', 'Islam', 'Christianity', 'Sikhism', 'Jainism', 'Buddhism', 'Other'];
  for (const r of religions) {
    const existing = await prisma.religion.findFirst({ where: { tenantId: tenant.id, name: r } });
    if (!existing) {
      await prisma.religion.create({
        data: { tenantId: tenant.id, schoolId: school.id, name: r, code: r.toUpperCase() },
      });
    }
  }

  const categories = ['General', 'OBC', 'SC', 'ST', 'EWS'];
  for (const c of categories) {
    const existing = await prisma.studentCategory.findFirst({ where: { tenantId: tenant.id, name: c } });
    if (!existing) {
      await prisma.studentCategory.create({
        data: { tenantId: tenant.id, schoolId: school.id, name: c, code: c.toUpperCase() },
      });
    }
  }

  // 13. Financial Masters
  const feeHeads = [
    { name: 'Tuition Fee', code: 'TUITION', isRefundable: false, displayOrder: 1 },
    { name: 'Admission Fee', code: 'ADMISSION', isRefundable: false, displayOrder: 2 },
    { name: 'Transport Fee', code: 'TRANSPORT', isRefundable: false, displayOrder: 3 },
    { name: 'Examination Fee', code: 'EXAM', isRefundable: false, displayOrder: 4 },
  ];
  for (const fh of feeHeads) {
    await prisma.feeHead.upsert({
      where: { schoolId_code: { schoolId: school.id, code: fh.code } },
      update: {},
      create: {
        tenantId: tenant.id,
        schoolId: school.id,
        name: fh.name,
        code: fh.code,
        isRefundable: fh.isRefundable,
        displayOrder: fh.displayOrder,
      },
    });
  }

  const expenseHeads = [
    { name: 'Electricity & Utilities', code: 'ELECTRICITY', displayOrder: 1 },
    { name: 'Maintenance & Repairs', code: 'MAINTENANCE', displayOrder: 2 },
    { name: 'Stationery & Printing', code: 'STATIONERY', displayOrder: 3 },
  ];
  for (const eh of expenseHeads) {
    await prisma.expenseHead.upsert({
      where: { schoolId_code: { schoolId: school.id, code: eh.code } },
      update: {},
      create: {
        tenantId: tenant.id,
        schoolId: school.id,
        name: eh.name,
        code: eh.code,
        displayOrder: eh.displayOrder,
      },
    });
  }

  // 14. HR Masters
  const departments = [
    { name: 'Administration', code: 'ADMIN' },
    { name: 'Academics & Teaching', code: 'ACADEMICS' },
    { name: 'Accounts & Finance', code: 'ACCOUNTS' },
    { name: 'Transport', code: 'TRANSPORT' },
  ];
  for (const dep of departments) {
    await prisma.department.upsert({
      where: { schoolId_code: { schoolId: school.id, code: dep.code } },
      update: {},
      create: {
        tenantId: tenant.id,
        schoolId: school.id,
        name: dep.name,
        code: dep.code,
      },
    });
  }

  const designations = [
    { name: 'Principal', code: 'PRINCIPAL', displayOrder: 1 },
    { name: 'Teacher', code: 'TEACHER', displayOrder: 2 },
    { name: 'Accountant', code: 'ACCOUNTANT', displayOrder: 3 },
    { name: 'Driver', code: 'DRIVER', displayOrder: 4 },
  ];
  for (const des of designations) {
    await prisma.designation.upsert({
      where: { schoolId_code: { schoolId: school.id, code: des.code } },
      update: {},
      create: {
        tenantId: tenant.id,
        schoolId: school.id,
        name: des.name,
        code: des.code,
        displayOrder: des.displayOrder,
      },
    });
  }

  // 15. Transport Vehicle Types
  const vehicleTypes = [
    { name: 'School Bus (Large)', code: 'BUS_L', capacity: 50 },
    { name: 'Mini Bus', code: 'MINI_BUS', capacity: 30 },
    { name: 'Van', code: 'VAN', capacity: 15 },
  ];
  for (const vt of vehicleTypes) {
    const existing = await prisma.vehicleType.findFirst({ where: { tenantId: tenant.id, name: vt.name } });
    if (!existing) {
      await prisma.vehicleType.create({
        data: {
          tenantId: tenant.id,
          schoolId: school.id,
          name: vt.name,
          code: vt.code,
          capacity: vt.capacity,
        },
      });
    }
  }

  // 16. Academic Master Defaults
  const sampleClasses = [
    { name: 'Class 1', code: 'CLS-1', displayOrder: 1, level: 'Primary' },
    { name: 'Class 2', code: 'CLS-2', displayOrder: 2, level: 'Primary' },
    { name: 'Class 3', code: 'CLS-3', displayOrder: 3, level: 'Primary' },
  ];
  for (const c of sampleClasses) {
    await prisma.classMaster.upsert({
      where: { schoolId_code: { schoolId: school.id, code: c.code } },
      update: {},
      create: {
        tenantId: tenant.id,
        schoolId: school.id,
        name: c.name,
        code: c.code,
        displayOrder: c.displayOrder,
        academicLevel: c.level,
      },
    });
  }

  const sampleSections = [
    { name: 'A', code: 'SEC-A', displayOrder: 1 },
    { name: 'B', code: 'SEC-B', displayOrder: 2 },
  ];
  for (const s of sampleSections) {
    await prisma.sectionMaster.upsert({
      where: { schoolId_code: { schoolId: school.id, code: s.code } },
      update: {},
      create: {
        tenantId: tenant.id,
        schoolId: school.id,
        name: s.name,
        code: s.code,
        displayOrder: s.displayOrder,
      },
    });
  }

  const sampleSubjects = [
    { name: 'English', code: 'ENG', type: 'THEORY' },
    { name: 'Mathematics', code: 'MATH', type: 'THEORY' },
    { name: 'General Science', code: 'SCI', type: 'BOTH' },
    { name: 'Hindi', code: 'HIN', type: 'THEORY' },
  ];
  for (const sub of sampleSubjects) {
    await prisma.subjectMaster.upsert({
      where: { schoolId_code: { schoolId: school.id, code: sub.code } },
      update: {},
      create: {
        tenantId: tenant.id,
        schoolId: school.id,
        name: sub.name,
        code: sub.code,
        type: sub.type,
      },
    });
  }

  // 17. Chart of Accounts (COA)
  const defaultAccounts = [
    // ASSET
    { code: '1010', name: 'Cash in Hand', type: 'ASSET', normalBalance: 'DEBIT', isSystem: true, description: 'Primary cash on hand account' },
    { code: '1020', name: 'State Bank of India (Main)', type: 'ASSET', normalBalance: 'DEBIT', isSystem: true, description: 'Main operating bank account' },
    { code: '1100', name: 'Student Fee Receivable', type: 'ASSET', normalBalance: 'DEBIT', isSystem: true, description: 'Total outstanding student dues' },
    // LIABILITY
    { code: '2010', name: 'Student Advance / Unapplied Credit', type: 'LIABILITY', normalBalance: 'CREDIT', isSystem: true, description: 'Prepayments and unapplied student fee credits' },
    { code: '2100', name: 'Vendor Accounts Payable', type: 'LIABILITY', normalBalance: 'CREDIT', isSystem: true, description: 'Outstanding payables to vendors' },
    // EQUITY
    { code: '3000', name: 'Opening Balance Equity', type: 'EQUITY', normalBalance: 'CREDIT', isSystem: true, description: 'Offset account for opening balance setup' },
    { code: '3100', name: 'General Fund / Retained Surplus', type: 'EQUITY', normalBalance: 'CREDIT', isSystem: true, description: 'Accumulated surplus and school funds' },
    // INCOME
    { code: '4010', name: 'Tuition Fee Income', type: 'INCOME', normalBalance: 'CREDIT', isSystem: true, description: 'Revenue from tuition fees' },
    { code: '4020', name: 'Admission Fee Income', type: 'INCOME', normalBalance: 'CREDIT', isSystem: true, description: 'Revenue from admission registration fees' },
    { code: '4030', name: 'Transport Fee Income', type: 'INCOME', normalBalance: 'CREDIT', isSystem: true, description: 'Revenue from bus and van transport fees' },
    { code: '4040', name: 'Examination Fee Income', type: 'INCOME', normalBalance: 'CREDIT', isSystem: true, description: 'Revenue from student exam assessments' },
    { code: '4100', name: 'Other Fee Income', type: 'INCOME', normalBalance: 'CREDIT', isSystem: true, description: 'Miscellaneous student fees' },
    // EXPENSE
    { code: '5010', name: 'Electricity & Utilities Expense', type: 'EXPENSE', normalBalance: 'DEBIT', isSystem: true, description: 'Power, water, and utility bills' },
    { code: '5020', name: 'Maintenance & Repairs Expense', type: 'EXPENSE', normalBalance: 'DEBIT', isSystem: true, description: 'Building and campus maintenance' },
    { code: '5030', name: 'Stationery & Printing Expense', type: 'EXPENSE', normalBalance: 'DEBIT', isSystem: true, description: 'Paper, books, exam stationery printing' },
    { code: '5100', name: 'Fee Concessions & Scholarships', type: 'EXPENSE', normalBalance: 'DEBIT', isSystem: true, description: 'Scholarships, sibling, and management discounts' },
    { code: '5200', name: 'Bad Debts / Write-Off Expense', type: 'EXPENSE', normalBalance: 'DEBIT', isSystem: true, description: 'Uncollectible dues write-off' },
    { code: '5300', name: 'General Administration Expense', type: 'EXPENSE', normalBalance: 'DEBIT', isSystem: true, description: 'General operational overheads' },
  ];

  const createdAccounts: Record<string, any> = {};
  for (const acc of defaultAccounts) {
    const account = await prisma.account.upsert({
      where: { schoolId_code: { schoolId: school.id, code: acc.code } },
      update: {
        name: acc.name,
        type: acc.type as any,
        normalBalance: acc.normalBalance as any,
        isSystemAccount: acc.isSystem,
        description: acc.description,
      },
      create: {
        tenantId: tenant.id,
        schoolId: school.id,
        code: acc.code,
        name: acc.name,
        type: acc.type as any,
        normalBalance: acc.normalBalance as any,
        isSystemAccount: acc.isSystem,
        description: acc.description,
        isActive: true,
      },
    });
    createdAccounts[acc.code] = account;
  }

  // Link FeeHeads to income accounts
  const feeHeadMap: Record<string, string> = {
    TUITION: '4010',
    ADMISSION: '4020',
    TRANSPORT: '4030',
    EXAM: '4040',
  };
  for (const [headCode, accCode] of Object.entries(feeHeadMap)) {
    if (createdAccounts[accCode]) {
      await prisma.feeHead.updateMany({
        where: { schoolId: school.id, code: headCode },
        data: { accountId: createdAccounts[accCode].id },
      });
    }
  }

  // Link ExpenseHeads to expense accounts
  const expenseHeadMap: Record<string, string> = {
    ELECTRICITY: '5010',
    MAINTENANCE: '5020',
    STATIONERY: '5030',
  };
  for (const [expCode, accCode] of Object.entries(expenseHeadMap)) {
    if (createdAccounts[accCode]) {
      await prisma.expenseHead.updateMany({
        where: { schoolId: school.id, code: expCode },
        data: { accountId: createdAccounts[accCode].id },
      });
    }
  }

  // 18. Financial Year & Accounting Periods (FY 2026-27)
  const fy2026 = await prisma.financialYear.upsert({
    where: { schoolId_name: { schoolId: school.id, name: 'FY 2026-27' } },
    update: {},
    create: {
      tenantId: tenant.id,
      schoolId: school.id,
      name: 'FY 2026-27',
      startDate: new Date('2026-04-01T00:00:00.000Z'),
      endDate: new Date('2027-03-31T23:59:59.999Z'),
      status: 'OPEN',
    },
  });

  const periodDefs = [
    { name: 'Apr 2026', startDate: '2026-04-01', endDate: '2026-04-30' },
    { name: 'May 2026', startDate: '2026-05-01', endDate: '2026-05-31' },
    { name: 'Jun 2026', startDate: '2026-06-01', endDate: '2026-06-30' },
    { name: 'Jul 2026', startDate: '2026-07-01', endDate: '2026-07-31' },
    { name: 'Aug 2026', startDate: '2026-08-01', endDate: '2026-08-31' },
    { name: 'Sep 2026', startDate: '2026-09-01', endDate: '2026-09-30' },
    { name: 'Oct 2026', startDate: '2026-10-01', endDate: '2026-10-31' },
    { name: 'Nov 2026', startDate: '2026-11-01', endDate: '2026-11-30' },
    { name: 'Dec 2026', startDate: '2026-12-01', endDate: '2026-12-31' },
    { name: 'Jan 2027', startDate: '2027-01-01', endDate: '2027-01-31' },
    { name: 'Feb 2027', startDate: '2027-02-01', endDate: '2027-02-28' },
    { name: 'Mar 2027', startDate: '2027-03-01', endDate: '2027-03-31' },
  ];

  for (const p of periodDefs) {
    await prisma.accountingPeriod.upsert({
      where: { financialYearId_name: { financialYearId: fy2026.id, name: p.name } },
      update: {},
      create: {
        tenantId: tenant.id,
        schoolId: school.id,
        financialYearId: fy2026.id,
        name: p.name,
        startDate: new Date(`${p.startDate}T00:00:00.000Z`),
        endDate: new Date(`${p.endDate}T23:59:59.999Z`),
        status: 'OPEN',
      },
    });
  }

  // 19. Default Bank Account
  if (createdAccounts['1020']) {
    const existingBank = await prisma.bankAccount.findFirst({
      where: { schoolId: school.id, accountId: createdAccounts['1020'].id },
    });
    if (!existingBank) {
      await prisma.bankAccount.create({
        data: {
          tenantId: tenant.id,
          schoolId: school.id,
          accountId: createdAccounts['1020'].id,
          bankName: 'State Bank of India',
          accountDisplayName: 'SBI Main Operational A/C',
          accountNumber: '••••••••4821',
          ifscCode: 'SBIN0001234',
          branchName: 'Main Campus Branch',
          isActive: true,
        },
      });
    }
  }

  console.log('Deterministic seed completed successfully.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
