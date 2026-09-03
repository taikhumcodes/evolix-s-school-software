import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import bcrypt from 'bcryptjs';

describe('RBAC & Privilege Escalation Guards', () => {
  let adminToken: string;
  let teacherToken: string;
  let superadminRoleId: string;

  beforeAll(async () => {
    // 1. Admin login (has Superadmin role)
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@evolix.local',
        password: 'Password123!',
      });
    adminToken = adminLogin.body.access_token;

    // 2. Fetch Superadmin role id
    const superRole = await prisma.role.findFirst({
      where: { name: 'Superadmin' },
    });
    superadminRoleId = superRole!.id;

    // 3. Create a Teacher role with only 'attendance.manage' permission
    const attendancePerm = await prisma.permission.findUnique({
      where: { code: 'attendance.manage' },
    });

    const tenant = await prisma.tenant.findFirst();
    const teacherRole = await prisma.role.upsert({
      where: { id: '00000000-0000-0000-0000-000000000020' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000020',
        tenantId: tenant!.id,
        name: 'Teacher',
        isSystem: false,
        rolePermissions: {
          create: [{ permissionId: attendancePerm!.id }],
        },
      },
    });

    // 4. Create Teacher user
    const hash = await bcrypt.hash('Password123!', 10);
    const teacherUser = await prisma.user.upsert({
      where: { email: 'teacher@evolix.local' },
      update: { hashedPassword: hash },
      create: {
        id: '00000000-0000-0000-0000-000000000021',
        tenantId: tenant!.id,
        email: 'teacher@evolix.local',
        hashedPassword: hash,
        firstName: 'John',
        lastName: 'Teacher',
        userRoles: {
          create: [{ roleId: teacherRole.id }],
        },
      },
    });

    const teacherLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'teacher@evolix.local',
        password: 'Password123!',
      });
    teacherToken = teacherLogin.body.access_token;
  });

  it('should allow Superadmin to create users', async () => {
    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: `newuser_${Date.now()}@evolix.local`,
        password: 'Password123!',
        first_name: 'New',
        last_name: 'User',
      });

    expect(res.status).toBe(200);
    expect(res.body.id).toBeDefined();
  });

  it('should deny unauthorized user from accessing users.manage endpoints', async () => {
    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        email: `hacked_${Date.now()}@evolix.local`,
        password: 'Password123!',
        first_name: 'Hacked',
        last_name: 'User',
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('PERMISSION_DENIED');
  });

  it('should block privilege escalation when caller assigns roles with permissions they lack', async () => {
    // Create a Staff user with users.manage but without security.manage
    const usersManagePerm = await prisma.permission.findUnique({
      where: { code: 'users.manage' },
    });
    const tenant = await prisma.tenant.findFirst();

    const staffRole = await prisma.role.create({
      data: {
        tenantId: tenant!.id,
        name: `Staff_${Date.now()}`,
        rolePermissions: {
          create: [{ permissionId: usersManagePerm!.id }],
        },
      },
    });

    const hash = await bcrypt.hash('Password123!', 10);
    const staffUser = await prisma.user.create({
      data: {
        tenantId: tenant!.id,
        email: `staff_${Date.now()}@evolix.local`,
        hashedPassword: hash,
        firstName: 'Staff',
        userRoles: {
          create: [{ roleId: staffRole.id }],
        },
      },
    });

    const staffLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: staffUser.email,
        password: 'Password123!',
      });
    const staffToken = staffLogin.body.access_token;

    // Staff tries to assign Superadmin role to a new user
    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        email: `escalated_${Date.now()}@evolix.local`,
        password: 'Password123!',
        first_name: 'Escalated',
        role_ids: [superadminRoleId],
      });

    expect(res.status).toBe(403);
    expect(res.body.error.message).toContain("Cannot assign roles with permissions you don't have");
  });
});
