import { prisma } from '../../lib/prisma.js';
import { AuthenticatedUser } from '../../middleware/auth.js';

export interface GlobalSearchResult {
  id: string;
  type: 'class' | 'section' | 'subject' | 'academic_year' | 'user' | 'role' | 'student' | 'admission' | 'guardian' | 'family' | 'page' | 'leave' | 'vehicle' | 'route' | 'inventory_item' | 'asset' | 'event' | 'visitor' | 'document_template' | 'document';
  category: string;
  title: string;
  subtitle: string;
  code?: string;
  url: string;
  score: number;
}

export function normalizeSearchText(value: string | null | undefined): string {
  if (!value) return '';
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[-_/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function toCompactText(value: string | null | undefined): string {
  if (!value) return '';
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function expandTokenAliases(token: string): string[] {
  if (token === 'class') return ['class', 'grade'];
  if (token === 'grade') return ['grade', 'class'];
  return [token];
}

export function tokenizeQuery(query: string): string[] {
  const norm = normalizeSearchText(query);
  if (!norm) return [];
  return norm.split(' ').filter(Boolean);
}

export function matchesRecord(
  fields: (string | null | undefined)[],
  tokens: string[],
  normQuery: string,
  compactQuery: string
): boolean {
  if (tokens.length === 0) return false;

  const valid = fields.filter(Boolean) as string[];
  const normText = valid.map(normalizeSearchText).join(' ');
  const compactText = valid.map(toCompactText).join(' ');

  if (normText.includes(normQuery)) return true;
  if (compactQuery && compactText.includes(compactQuery)) return true;

  const words = normText.split(' ').filter(Boolean);

  return tokens.every((token) => {
    const aliases = expandTokenAliases(token);
    return aliases.some((alias) => {
      if (normText.includes(alias)) return true;
      if (words.some((w) => w === alias || w.startsWith(alias))) return true;
      const aliasCompact = toCompactText(alias);
      if (aliasCompact && compactText.includes(aliasCompact)) return true;
      return false;
    });
  });
}

export function calculateScore(
  name: string,
  code: string | null | undefined,
  related: (string | null | undefined)[],
  query: string
): number {
  const normQuery = normalizeSearchText(query);
  if (!normQuery) return 0;

  const queryCompact = toCompactText(query);
  const tokens = tokenizeQuery(query);

  const normName = normalizeSearchText(name);
  const compactName = toCompactText(name);
  const normCode = normalizeSearchText(code);
  const compactCode = toCompactText(code);

  let score = 0;

  if (normName === normQuery) {
    score += 1000;
  } else if (compactName === queryCompact && queryCompact.length > 0) {
    score += 950;
  } else if (normCode && (normCode === normQuery || compactCode === queryCompact)) {
    score += 900;
  } else if (normName.startsWith(normQuery)) {
    score += 750;
  } else if (normCode && normCode.startsWith(normQuery)) {
    score += 700;
  } else if (normName.split(' ').some((w) => w.startsWith(normQuery))) {
    score += 650;
  }

  if (tokens.length > 1) {
    const allInName = tokens.every((t) => {
      const aliases = expandTokenAliases(t);
      return aliases.some((a) => normName.includes(a) || compactName.includes(toCompactText(a)));
    });
    if (allInName) score += 500;
  }

  if (normCode && tokens.every((t) => normCode.includes(t) || compactCode.includes(toCompactText(t)))) {
    score += 400;
  }

  const lengthDiff = Math.abs(normName.length - normQuery.length);
  score -= Math.min(50, lengthDiff);

  return Math.max(1, score);
}

export class SearchService {
  static async search(
    query: string,
    tenantId: string,
    schoolId: string,
    user: AuthenticatedUser
  ): Promise<GlobalSearchResult[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const normQuery = normalizeSearchText(trimmed);
    const compactQuery = toCompactText(trimmed);
    const tokens = tokenizeQuery(trimmed);
    if (tokens.length === 0) return [];

    const results: GlobalSearchResult[] = [];
    const perms = user.permissions;
    const isSuper = user.isSuperadmin;

    // 1. Classes (RBAC: master_data.view | master_data.manage | settings.manage | isSuperadmin)
    if (isSuper || perms.has('master_data.view') || perms.has('master_data.manage') || perms.has('settings.manage')) {
      const classes = await prisma.classMaster.findMany({
        where: { tenantId, schoolId, archivedAt: null },
        select: { id: true, name: true, code: true, academicLevel: true },
      });

      for (const cls of classes) {
        if (matchesRecord([cls.name, cls.code, cls.academicLevel], tokens, normQuery, compactQuery)) {
          const score = calculateScore(cls.name, cls.code, [cls.academicLevel], trimmed);
          results.push({
            id: cls.id,
            type: 'class',
            category: 'Classes',
            title: cls.name,
            subtitle: `Code: ${cls.code} • Level: ${cls.academicLevel || 'Standard'}`,
            code: cls.code,
            url: `/master-data?tab=academic&sub=classes&search=${encodeURIComponent(cls.name)}`,
            score,
          });
        }
      }
    }

    // 2. Sections (RBAC: master_data.view | master_data.manage | settings.manage | isSuperadmin)
    if (isSuper || perms.has('master_data.view') || perms.has('master_data.manage') || perms.has('settings.manage')) {
      const sections = await prisma.sectionMaster.findMany({
        where: { tenantId, schoolId, archivedAt: null },
        select: { id: true, name: true, code: true },
      });

      for (const sec of sections) {
        if (matchesRecord([sec.name, sec.code], tokens, normQuery, compactQuery)) {
          const score = calculateScore(sec.name, sec.code, [], trimmed);
          results.push({
            id: sec.id,
            type: 'section',
            category: 'Sections',
            title: `Section ${sec.name}`,
            subtitle: `Code: ${sec.code}`,
            code: sec.code,
            url: `/master-data?tab=academic&sub=sections&search=${encodeURIComponent(sec.name)}`,
            score,
          });
        }
      }
    }

    // 3. Subjects (RBAC: master_data.view | master_data.manage | settings.manage | isSuperadmin)
    if (isSuper || perms.has('master_data.view') || perms.has('master_data.manage') || perms.has('settings.manage')) {
      const subjects = await prisma.subjectMaster.findMany({
        where: { tenantId, schoolId, archivedAt: null },
        select: { id: true, name: true, code: true, type: true },
      });

      for (const sub of subjects) {
        if (matchesRecord([sub.name, sub.code, sub.type], tokens, normQuery, compactQuery)) {
          const score = calculateScore(sub.name, sub.code, [sub.type], trimmed);
          results.push({
            id: sub.id,
            type: 'subject',
            category: 'Subjects',
            title: sub.name,
            subtitle: `Code: ${sub.code} • Type: ${sub.type}`,
            code: sub.code,
            url: `/master-data?tab=academic&sub=subjects&search=${encodeURIComponent(sub.name)}`,
            score,
          });
        }
      }
    }

    // 4. Academic Years (RBAC: academic.manage | settings.manage | master_data.view | isSuperadmin)
    if (isSuper || perms.has('academic.manage') || perms.has('settings.manage') || perms.has('master_data.view')) {
      const academicYears = await prisma.academicYear.findMany({
        where: { schoolId, isDeleted: false },
        select: { id: true, name: true, isCurrent: true, startDate: true, endDate: true },
      });

      for (const ay of academicYears) {
        if (matchesRecord([ay.name], tokens, normQuery, compactQuery)) {
          const score = calculateScore(ay.name, null, [], trimmed);
          results.push({
            id: ay.id,
            type: 'academic_year',
            category: 'Academic Years',
            title: ay.name,
            subtitle: ay.isCurrent ? 'Current Active Academic Year' : 'Academic Calendar Period',
            url: `/admin/academic-years?search=${encodeURIComponent(ay.name)}`,
            score,
          });
        }
      }
    }

    // 5. Users (RBAC: users.manage | isSuperadmin)
    if (isSuper || perms.has('users.manage')) {
      const users = await prisma.user.findMany({
        where: {
          tenantId,
          isDeleted: false,
          ...(isSuper ? {} : { userSchools: { some: { schoolId } } }),
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          userRoles: { select: { role: { select: { name: true } } } },
        },
        take: 30,
      });

      for (const u of users) {
        const fullName = `${u.firstName} ${u.lastName || ''}`.trim();
        const roleNames = u.userRoles.map((ur) => ur.role.name).join(', ');
        if (matchesRecord([fullName, u.email, roleNames], tokens, normQuery, compactQuery)) {
          const score = calculateScore(fullName, u.email, [roleNames], trimmed);
          results.push({
            id: u.id,
            type: 'user',
            category: 'Users',
            title: fullName,
            subtitle: `${u.email} • ${roleNames || 'No Role'}`,
            url: `/admin/users?search=${encodeURIComponent(u.email)}`,
            score,
          });
        }
      }
    }

    // 6. Roles (RBAC: roles.manage | isSuperadmin)
    if (isSuper || perms.has('roles.manage')) {
      const roles = await prisma.role.findMany({
        where: { tenantId },
        select: { id: true, name: true, isSystem: true },
      });

      for (const r of roles) {
        if (matchesRecord([r.name], tokens, normQuery, compactQuery)) {
          const score = calculateScore(r.name, null, [], trimmed);
          results.push({
            id: r.id,
            type: 'role',
            category: 'Roles',
            title: r.name,
            subtitle: r.isSystem ? 'System Defined Role' : 'Custom School Role',
            url: `/admin/roles?search=${encodeURIComponent(r.name)}`,
            score,
          });
        }
      }
    }

    // 7. Students (RBAC: students.view | isSuperadmin)
    if (isSuper || perms.has('students.view')) {
      const students = await prisma.student.findMany({
        where: {
          tenantId,
          schoolId,
          archivedAt: null,
          ...(tokens.length > 0
            ? {
                OR: [
                  ...tokens.map((tok) => ({
                    firstName: { contains: tok, mode: 'insensitive' as const },
                  })),
                  ...tokens.map((tok) => ({
                    lastName: { contains: tok, mode: 'insensitive' as const },
                  })),
                  ...tokens.map((tok) => ({
                    studentId: { contains: tok, mode: 'insensitive' as const },
                  })),
                  ...tokens.map((tok) => ({
                    admissionNumber: { contains: tok, mode: 'insensitive' as const },
                  })),
                ],
              }
            : {}),
        },
        select: {
          id: true,
          studentId: true,
          admissionNumber: true,
          firstName: true,
          lastName: true,
          displayName: true,
          status: true,
          enrollments: {
            where: { status: 'ACTIVE' },
            take: 1,
            select: {
              rollNumber: true,
              class: { select: { name: true } },
              section: { select: { name: true } },
            },
          },
          guardians: {
            take: 1,
            select: {
              guardian: { select: { firstName: true, lastName: true, phone: true } },
            },
          },
        },
        take: 100,
      });

      for (const st of students) {
        const fullName = `${st.firstName} ${st.lastName}`.trim();
        const activeClass = st.enrollments[0]?.class?.name || '';
        const activeSection = st.enrollments[0]?.section?.name || '';
        const roll = st.enrollments[0]?.rollNumber || '';
        const guardianName = st.guardians[0]?.guardian
          ? `${st.guardians[0].guardian.firstName} ${st.guardians[0].guardian.lastName}`.trim()
          : '';
        const guardianPhone = st.guardians[0]?.guardian?.phone || '';

        const fields = [
          fullName,
          st.displayName,
          st.studentId,
          st.admissionNumber,
          activeClass,
          activeSection,
          roll,
          guardianName,
          guardianPhone,
        ];

        if (matchesRecord(fields, tokens, normQuery, compactQuery)) {
          const score = calculateScore(fullName, st.studentId, [st.admissionNumber, roll, guardianPhone], trimmed);
          const classSectionDesc = activeClass ? ` • ${activeClass}${activeSection ? ` - ${activeSection}` : ''}` : '';
          results.push({
            id: st.id,
            type: 'student',
            category: 'Students',
            title: fullName,
            subtitle: `${st.studentId} • Adm No: ${st.admissionNumber}${classSectionDesc} • ${st.status}`,
            code: st.studentId,
            url: `/students/${st.id}`,
            score: score + 100, // Priority boost for students
          });
        }
      }
    }

    // 8. Admissions (RBAC: admissions.view | isSuperadmin)
    if (isSuper || perms.has('admissions.view')) {
      const admissions = await prisma.admissionApplication.findMany({
        where: {
          tenantId,
          schoolId,
          archivedAt: null,
        },
        select: {
          id: true,
          applicationNumber: true,
          firstName: true,
          lastName: true,
          status: true,
          guardianName: true,
          guardianPhone: true,
          appliedClass: { select: { name: true } },
        },
        take: 50,
      });

      for (const adm of admissions) {
        const applicantName = `${adm.firstName} ${adm.lastName}`.trim();
        const appliedClassName = adm.appliedClass?.name || '';
        const fields = [
          applicantName,
          adm.applicationNumber,
          appliedClassName,
          adm.guardianName,
          adm.guardianPhone,
        ];

        if (matchesRecord(fields, tokens, normQuery, compactQuery)) {
          const score = calculateScore(applicantName, adm.applicationNumber, [adm.guardianPhone], trimmed);
          results.push({
            id: adm.id,
            type: 'admission',
            category: 'Admissions',
            title: applicantName,
            subtitle: `App No: ${adm.applicationNumber} • Applied: ${appliedClassName} • ${adm.status}`,
            code: adm.applicationNumber,
            url: `/students/admissions/${adm.id}`,
            score: score + 50,
          });
        }
      }
    }

    // 9. Guardians (RBAC: guardians.view | isSuperadmin)
    if (isSuper || perms.has('guardians.view')) {
      const guardians = await prisma.guardian.findMany({
        where: {
          tenantId,
          schoolId,
          archivedAt: null,
        },
        select: {
          id: true,
          firstName: true,
          middleName: true,
          lastName: true,
          phone: true,
          normalizedPhone: true,
          email: true,
          relationship: true,
          students: {
            take: 3,
            select: {
              student: { select: { firstName: true, lastName: true, studentId: true } },
            },
          },
        },
        take: 50,
      });

      for (const g of guardians) {
        const fullName = [g.firstName, g.middleName, g.lastName].filter(Boolean).join(' ');
        const studentSummary = g.students
          .map((s) => `${s.student.firstName} ${s.student.lastName}`)
          .join(', ');

        const fields = [
          fullName,
          g.phone,
          g.normalizedPhone,
          g.email,
          g.relationship,
          studentSummary,
        ];

        if (matchesRecord(fields, tokens, normQuery, compactQuery)) {
          const score = calculateScore(fullName, g.phone, [g.email, studentSummary], trimmed);
          results.push({
            id: g.id,
            type: 'guardian',
            category: 'Parents & Guardians',
            title: fullName,
            subtitle: `${g.relationship} • Phone: ${g.phone}${studentSummary ? ` • Children: ${studentSummary}` : ''}`,
            code: g.phone,
            url: `/guardians/${g.id}`,
            score: score + 80,
          });
        }
      }
    }

    // 10. Families (RBAC: families.view | isSuperadmin)
    if (isSuper || perms.has('families.view')) {
      const families = await prisma.family.findMany({
        where: {
          tenantId,
          schoolId,
          archivedAt: null,
        },
        select: {
          id: true,
          familyNumber: true,
          familyName: true,
          primaryGuardian: {
            select: { firstName: true, lastName: true, phone: true },
          },
          students: {
            take: 3,
            select: {
              student: { select: { firstName: true, lastName: true } },
            },
          },
        },
        take: 50,
      });

      for (const f of families) {
        const primaryName = f.primaryGuardian
          ? `${f.primaryGuardian.firstName} ${f.primaryGuardian.lastName}`.trim()
          : '';
        const studentNames = f.students
          .map((s) => `${s.student.firstName} ${s.student.lastName}`)
          .join(', ');

        const fields = [
          f.familyName,
          f.familyNumber,
          primaryName,
          f.primaryGuardian?.phone,
          studentNames,
        ];

        if (matchesRecord(fields, tokens, normQuery, compactQuery)) {
          const score = calculateScore(f.familyName, f.familyNumber, [primaryName, studentNames], trimmed);
          results.push({
            id: f.id,
            type: 'family',
            category: 'Families',
            title: f.familyName,
            subtitle: `${f.familyNumber}${primaryName ? ` • Primary: ${primaryName}` : ''}${studentNames ? ` • Members: ${studentNames}` : ''}`,
            code: f.familyNumber,
            url: `/families/${f.id}`,
            score: score + 70,
          });
        }
      }
    }

    // 11. Attendance Pages & Quick Actions
    const attendancePages = [
      { id: 'page-att-overview', title: 'Attendance & Leave Overview', subtitle: 'Attendance KPIs, student and staff summaries', url: '/attendance/overview', terms: ['attendance', 'leave', 'absent', 'present', 'overview'] },
      { id: 'page-att-register', title: 'Student Attendance Register', subtitle: 'Take daily attendance by class and section', url: '/attendance/students', terms: ['student attendance', 'register', 'mark attendance', 'roll call'] },
      { id: 'page-att-student-leave', title: 'Student Leave Requests', subtitle: 'Manage student leave applications and approvals', url: '/attendance/student-leave', terms: ['student leave', 'leave application', 'sick leave'] },
      { id: 'page-att-staff', title: 'Staff Attendance & Geofence', subtitle: 'Staff daily attendance and GPS check-in/out', url: '/attendance/staff', terms: ['staff attendance', 'teacher attendance', 'geofence', 'check in', 'check out'] },
      { id: 'page-att-staff-leave', title: 'Staff Leave Management', subtitle: 'Staff leave applications and approvals', url: '/attendance/staff-leave', terms: ['staff leave', 'teacher leave', 'leave approval'] },
      { id: 'page-att-holidays', title: 'School Holidays & Closures', subtitle: 'Calendar holidays, vacations, and working day overrides', url: '/attendance/holidays', terms: ['holiday', 'vacation', 'closure', 'calendar'] },
      { id: 'page-att-reports', title: 'Attendance Reports', subtitle: 'Daily, monthly summaries, and CSV exports', url: '/attendance/reports', terms: ['attendance report', 'monthly attendance', 'attendance csv'] },
    ];

    for (const page of attendancePages) {
      const match = page.terms.some((term) => normQuery.includes(term) || term.includes(normQuery) || tokens.some((t) => term.includes(t)));
      if (match) {
        results.push({
          id: page.id,
          type: 'page',
          category: 'Navigation',
          title: page.title,
          subtitle: page.subtitle,
          url: page.url,
          score: 85,
        });
      }
    }

    // 12. Student Leaves (RBAC: student_leave.view | isSuperadmin)
    if (isSuper || perms.has('student_leave.view')) {
      const leaves = await prisma.studentLeave.findMany({
        where: { tenantId, schoolId },
        include: {
          student: { select: { firstName: true, lastName: true, admissionNumber: true } },
        },
        take: 30,
        orderBy: { createdAt: 'desc' },
      });

      for (const l of leaves) {
        const studentName = `${l.student.firstName} ${l.student.lastName}`.trim();
        const fields = [studentName, l.student.admissionNumber, l.leaveType, l.reason, l.status];
        if (matchesRecord(fields, tokens, normQuery, compactQuery)) {
          results.push({
            id: l.id,
            type: 'leave',
            category: 'Student Leaves',
            title: `${studentName} — ${l.leaveType} Leave`,
            subtitle: `Status: ${l.status} • Reason: ${l.reason.slice(0, 40)}`,
            code: l.student.admissionNumber,
            url: `/attendance/student-leave`,
            score: 75,
          });
        }
      }
    }

    // 13. Operations: Vehicles (RBAC: transport.view | isSuperadmin)
    if (isSuper || perms.has('transport.view')) {
      const vehicles = await prisma.vehicle.findMany({
        where: { tenantId, schoolId, archivedAt: null },
        take: 20,
      });
      for (const v of vehicles) {
        const fields = [v.registrationNumber, v.vehicleNumber, v.make, v.model, v.status];
        if (matchesRecord(fields, tokens, normQuery, compactQuery)) {
          const score = calculateScore(v.registrationNumber, v.vehicleNumber, [v.make, v.model], trimmed);
          results.push({
            id: v.id,
            type: 'vehicle',
            category: 'Transport Vehicles',
            title: v.registrationNumber,
            subtitle: `${v.make || ''} ${v.model || ''} • Capacity: ${v.seatingCapacity} • Status: ${v.status}`.trim(),
            code: v.vehicleNumber || undefined,
            url: `/operations/transport?vehicle=${v.id}`,
            score: score + 80,
          });
        }
      }

      // Routes
      const routes = await prisma.transportRoute.findMany({
        where: { tenantId, schoolId, archivedAt: null },
        take: 20,
      });
      for (const r of routes) {
        const fields = [r.routeName, r.routeCode, r.startLocation, r.endLocation, r.status];
        if (matchesRecord(fields, tokens, normQuery, compactQuery)) {
          const score = calculateScore(r.routeName, r.routeCode, [r.startLocation, r.endLocation], trimmed);
          results.push({
            id: r.id,
            type: 'route',
            category: 'Transport Routes',
            title: `${r.routeName} (${r.routeCode})`,
            subtitle: `${r.startLocation} ➔ ${r.endLocation} • Status: ${r.status}`,
            code: r.routeCode,
            url: `/operations/transport?route=${r.id}`,
            score: score + 80,
          });
        }
      }
    }

    // 14. Operations: Inventory Items (RBAC: inventory.view | isSuperadmin)
    if (isSuper || perms.has('inventory.view')) {
      const items = await prisma.inventoryItem.findMany({
        where: { tenantId, schoolId, status: { not: 'ARCHIVED' } },
        include: { category: true },
        take: 20,
      });
      for (const item of items) {
        const fields = [item.name, item.itemCode, item.category.name, item.unitOfMeasure, item.itemType];
        if (matchesRecord(fields, tokens, normQuery, compactQuery)) {
          const score = calculateScore(item.name, item.itemCode, [item.category.name], trimmed);
          results.push({
            id: item.id,
            type: 'inventory_item',
            category: 'Inventory Items',
            title: item.name,
            subtitle: `${item.itemCode} • Category: ${item.category.name} • Unit: ${item.unitOfMeasure}`,
            code: item.itemCode,
            url: `/operations/inventory?item=${item.id}`,
            score: score + 80,
          });
        }
      }
    }

    // 15. Operations: Assets (RBAC: inventory.assets.view | inventory.view | isSuperadmin)
    if (isSuper || perms.has('inventory.assets.view') || perms.has('inventory.view')) {
      const assets = await prisma.asset.findMany({
        where: { tenantId, schoolId, status: { not: 'ARCHIVED' } },
        include: { inventoryItem: true, location: true },
        take: 20,
      });
      for (const asset of assets) {
        const fields = [asset.assetTag, asset.serialNumber, asset.inventoryItem.name, asset.location.name, asset.status];
        if (matchesRecord(fields, tokens, normQuery, compactQuery)) {
          const score = calculateScore(asset.assetTag, asset.serialNumber, [asset.inventoryItem.name], trimmed);
          results.push({
            id: asset.id,
            type: 'asset',
            category: 'Fixed Assets',
            title: `${asset.inventoryItem.name} (${asset.assetTag})`,
            subtitle: `Location: ${asset.location.name} • Status: ${asset.status}`,
            code: asset.assetTag,
            url: `/operations/assets?asset=${asset.id}`,
            score: score + 80,
          });
        }
      }
    }

    // 16. Operations: Events (RBAC: events.view | isSuperadmin)
    if (isSuper || perms.has('events.view')) {
      const events = await prisma.schoolEvent.findMany({
        where: { tenantId, schoolId, status: { not: 'ARCHIVED' } },
        include: { category: true },
        take: 20,
      });
      for (const evt of events) {
        const fields = [evt.title, evt.eventCode, evt.category.name, evt.venue, evt.status];
        if (matchesRecord(fields, tokens, normQuery, compactQuery)) {
          const score = calculateScore(evt.title, evt.eventCode, [evt.category.name, evt.venue], trimmed);
          results.push({
            id: evt.id,
            type: 'event',
            category: 'School Events',
            title: evt.title,
            subtitle: `${evt.eventCode} • Venue: ${evt.venue} • Status: ${evt.status}`,
            code: evt.eventCode,
            url: `/operations/events?event=${evt.id}`,
            score: score + 80,
          });
        }
      }
    }

    // 17. Operations: Visitors (STRICT PRIVACY: ONLY gate.view | isSuperadmin)
    // Amendment 42 & 47: Global Search must NOT expose visitor info to users lacking gate permissions!
    if (isSuper || perms.has('gate.view')) {
      const visitors = await prisma.visitor.findMany({
        where: { tenantId, schoolId },
        take: 15,
      });
      for (const v of visitors) {
        const fields = [v.name, v.phone, v.organization];
        if (matchesRecord(fields, tokens, normQuery, compactQuery)) {
          const score = calculateScore(v.name, null, [v.phone, v.organization], trimmed);
          results.push({
            id: v.id,
            type: 'visitor',
            category: 'Gate Visitors',
            title: v.name,
            subtitle: `${v.organization ? `${v.organization} • ` : ''}${v.phone}`,
            url: `/operations/gate?visitor=${v.id}`,
            score: score + 75,
          });
        }
      }
    }

    // 18. Operations Navigation Pages
    const operationsPages = [
      { id: 'page-ops-overview', title: 'School Operations Overview', subtitle: 'Transport, Inventory, Gate, and Events Dashboard', url: '/operations/overview', terms: ['operations', 'school operations', 'facility'] },
      { id: 'page-ops-transport', title: 'Transport Management', subtitle: 'Vehicles, routes, stops, schedules, and trips', url: '/operations/transport', terms: ['transport', 'bus', 'vehicle', 'route', 'driver'] },
      { id: 'page-ops-inventory', title: 'Inventory & Stock Management', subtitle: 'Stock ledger, inward, issue, transfer, items', url: '/operations/inventory', terms: ['inventory', 'stock', 'warehouse', 'supplies', 'consumables'] },
      { id: 'page-ops-assets', title: 'Asset Management Register', subtitle: 'Fixed assets, tags, assignment, maintenance, disposal', url: '/operations/assets', terms: ['asset', 'equipment', 'tag', 'fixed asset', 'maintenance'] },
      { id: 'page-ops-gate', title: 'Gate & Visitor Management', subtitle: 'Visitor passes, entry logs, and student pickup authorization', url: '/operations/gate', terms: ['gate', 'visitor', 'pickup', 'security', 'guard'] },
      { id: 'page-ops-events', title: 'School Activities & Events', subtitle: 'Event schedule, participant registration, achievements', url: '/operations/events', terms: ['event', 'activity', 'sports', 'competition', 'annual function'] },
      { id: 'page-ops-reports', title: 'Operations Reports', subtitle: 'Transport, inventory, asset, visitor, and event CSV reports', url: '/operations/reports', terms: ['operations report', 'transport report', 'inventory report'] },
    ];

    for (const page of operationsPages) {
      const match = page.terms.some((term) => normQuery.includes(term) || term.includes(normQuery) || tokens.some((t) => term.includes(t)));
      if (match) {
        results.push({
          id: page.id,
          type: 'page',
          category: 'Navigation',
          title: page.title,
          subtitle: page.subtitle,
          url: page.url,
          score: 85,
        });
      }
    }

    // 19. Document Templates (Module 11)
    if (perms.has('documents.templates.view') || perms.has('documents.templates.manage') || isSuper) {
      const templates = await prisma.documentTemplate.findMany({
        where: { tenantId, schoolId, status: 'PUBLISHED' },
        take: 20,
      });
      for (const t of templates) {
        const fields = [t.name, t.code, t.category, t.documentType];
        if (matchesRecord(fields, tokens, normQuery, compactQuery)) {
          const score = calculateScore(t.name, t.code, [t.category, t.documentType], trimmed);
          results.push({
            id: t.id,
            type: 'document_template',
            category: 'Document Templates',
            title: t.name,
            subtitle: `${t.category} • ${t.documentType}`,
            code: t.code,
            url: `/documents/templates?id=${t.id}`,
            score: score + 80,
          });
        }
      }
    }

    // 20. Generated Documents (Module 11)
    if (perms.has('documents.verify.view') || perms.has('documents.generate') || isSuper) {
      const docs = await prisma.generatedDocument.findMany({
        where: { tenantId, schoolId, status: 'FINALIZED' },
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
      for (const d of docs) {
        const fields = [d.documentNumber, d.documentType, d.category];
        if (matchesRecord(fields, tokens, normQuery, compactQuery)) {
          const score = calculateScore(d.documentNumber || 'Document', null, [d.documentType], trimmed);
          results.push({
            id: d.id,
            type: 'document',
            category: 'Generated Documents',
            title: d.documentNumber || 'Document',
            subtitle: `${d.documentType} • ${d.category} • ${d.status}`,
            code: d.documentNumber || undefined,
            url: `/documents/generated?id=${d.id}`,
            score: score + 70,
          });
        }
      }
    }

    // 21. Document Navigation Pages
    const documentPages = [
      { id: 'page-docs-overview', title: 'Documents & Printing Hub', subtitle: 'Centralized certificates, identity cards, and printing hub', url: '/documents/overview', terms: ['document', 'certificate', 'printing', 'bonafide', 'tc'] },
      { id: 'page-docs-templates', title: 'Document Templates', subtitle: 'Layout designs, variable bindings, and versioning', url: '/documents/templates', terms: ['template', 'document template', 'layout editor'] },
      { id: 'page-docs-generate', title: 'Generate Certificate / Document', subtitle: 'Issue student certificates, ID cards, and receipts', url: '/documents/generate', terms: ['generate', 'issue bonafide', 'issue certificate'] },
      { id: 'page-docs-generated', title: 'Generated Documents Register', subtitle: 'Reprint, download, audit, and cancel issued certificates', url: '/documents/generated', terms: ['reprint', 'download pdf', 'document register'] },
      { id: 'page-docs-bulk', title: 'Bulk Document Generation', subtitle: 'Batch issue ID cards and certificates', url: '/documents/bulk', terms: ['bulk generate', 'bulk id cards', 'bulk print'] },
      { id: 'page-docs-signatures', title: 'Signatures & School Seals', subtitle: 'Authorized signatories and stamps', url: '/documents/signatures', terms: ['signature', 'stamp', 'seal', 'signatory'] },
    ];

    for (const page of documentPages) {
      const match = page.terms.some((term) => normQuery.includes(term) || term.includes(normQuery) || tokens.some((t) => term.includes(t)));
      if (match) {
        results.push({
          id: page.id,
          type: 'page',
          category: 'Navigation',
          title: page.title,
          subtitle: page.subtitle,
          url: page.url,
          score: 85,
        });
      }
    }

    // Sort descending by score
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, 30);
  }
}
