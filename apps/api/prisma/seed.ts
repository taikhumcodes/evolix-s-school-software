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
    { code: 'students.manage', description: 'Manage student records' },
    { code: 'finance.manage', description: 'Manage fee structures and receipts' },
    { code: 'attendance.manage', description: 'Manage attendance and locks' },
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
    { code: 'RECEIPT', prefix: 'REC-', padding: 5 },
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
