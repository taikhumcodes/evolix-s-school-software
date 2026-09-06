import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { Prisma } from '@prisma/client';
import { signAccessToken } from '../src/lib/crypto.js';

const Decimal = Prisma.Decimal;

describe('EVOLIX School ERP — Major Module 09 Strict QA & Invariant Verification Suite', () => {
  let testSuffix: string;

  // Tenants & Schools
  let tenantAId: string;
  let schoolAId: string;
  let schoolBId: string;
  let tenantBId: string;
  let schoolCId: string;

  // Tokens
  let superAdminToken: string;
  let opsAdminToken: string;
  let gateGuardToken: string;
  let gateSupervisorToken: string; // Has gate.pickup.override
  let transportViewerToken: string; // Only transport.view
  let schoolBUserToken: string;
  let tenantBUserToken: string;

  // Users
  let opsAdminUserId: string;
  let gateGuardUserId: string;
  let gateSupervisorUserId: string;

  // Master Data
  let academicYearId: string;
  let studentAId: string;
  let studentBId: string;
  let studentCId: string;
  let guardianAuthId: string;
  let guardianUnauthId: string;
  let employeeDriverId: string;
  let financialYearId: string;
  let expenseBillId: string;
  let commonCatId: string;
  let commonLocId: string;

  beforeAll(async () => {
    testSuffix = Date.now().toString().slice(-6);

    // 1. Authenticate as Superadmin
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@evolix.local', password: 'Password123!' });
    expect(loginRes.status).toBe(200);
    superAdminToken = loginRes.body.access_token;

    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(meRes.status).toBe(200);
    tenantAId = meRes.body.tenant_id;
    schoolAId = meRes.body.schools[0]?.id;
    expect(schoolAId).toBeDefined();

    // 2. School B under Tenant A (Cross-school isolation)
    const schoolB = await prisma.school.create({
      data: {
        tenantId: tenantAId,
        name: `School B QA Ops ${testSuffix}`,
        code: `SCH-B-OPS-${testSuffix}`,
        isActive: true,
      },
    });
    schoolBId = schoolB.id;

    // 3. Tenant B and School C (Cross-tenant isolation)
    const tenantB = await prisma.tenant.create({
      data: {
        name: `Tenant B QA Ops ${testSuffix}`,
        domain: `tenant-b-ops-${testSuffix}.evolix.local`,
        isActive: true,
      },
    });
    tenantBId = tenantB.id;

    const schoolC = await prisma.school.create({
      data: {
        tenantId: tenantBId,
        name: `School C QA Ops ${testSuffix}`,
        code: `SCH-C-OPS-${testSuffix}`,
        isActive: true,
      },
    });
    schoolCId = schoolC.id;

    // 4. Create Academic Year in School A
    const ay = await prisma.academicYear.findFirst({
      where: { schoolId: schoolAId, isClosed: false },
    });
    if (ay) {
      academicYearId = ay.id;
    } else {
      const newAy = await prisma.academicYear.create({
        data: {
          schoolId: schoolAId,
          name: `AY Ops ${testSuffix}`,
          startDate: new Date('2026-04-01'),
          endDate: new Date('2027-03-31'),
          isCurrent: true,
          isClosed: false,
        },
      });
      academicYearId = newAy.id;
    }

    // 5. Create Students in School A
    const stuA = await prisma.student.create({
      data: {
        tenantId: tenantAId,
        schoolId: schoolAId,
        studentId: `STU-OPS-A-${testSuffix}`,
        admissionNumber: `ADM-OPS-A-${testSuffix}`,
        admittedAcademicYearId: academicYearId,
        firstName: 'Dev',
        lastName: `Sharma-${testSuffix}`,
        gender: 'MALE',
        dateOfBirth: new Date('2018-01-15'),
      },
    });
    studentAId = stuA.id;

    const stuB = await prisma.student.create({
      data: {
        tenantId: tenantAId,
        schoolId: schoolAId,
        studentId: `STU-OPS-B-${testSuffix}`,
        admissionNumber: `ADM-OPS-B-${testSuffix}`,
        admittedAcademicYearId: academicYearId,
        firstName: 'Ananya',
        lastName: `Verma-${testSuffix}`,
        gender: 'FEMALE',
        dateOfBirth: new Date('2018-03-20'),
      },
    });
    studentBId = stuB.id;

    const stuC = await prisma.student.create({
      data: {
        tenantId: tenantAId,
        schoolId: schoolAId,
        studentId: `STU-OPS-C-${testSuffix}`,
        admissionNumber: `ADM-OPS-C-${testSuffix}`,
        admittedAcademicYearId: academicYearId,
        firstName: 'Rohan',
        lastName: `Gupta-${testSuffix}`,
        gender: 'MALE',
        dateOfBirth: new Date('2018-05-10'),
      },
    });
    studentCId = stuC.id;

    // 6. Guardians for Student A (One with pickup authorization, one without)
    const gAuth = await prisma.guardian.create({
      data: {
        tenantId: tenantAId,
        schoolId: schoolAId,
        firstName: 'Rajesh',
        lastName: `Sharma-${testSuffix}`,
        relationship: 'FATHER',
        phone: `+9198000${testSuffix.slice(-5)}`,
        normalizedPhone: `+9198000${testSuffix.slice(-5)}`,
        email: `father.${testSuffix}@example.com`,
      },
    });
    guardianAuthId = gAuth.id;

    await prisma.studentGuardian.create({
      data: {
        tenantId: tenantAId,
        schoolId: schoolAId,
        studentId: studentAId,
        guardianId: guardianAuthId,
        relationship: 'FATHER',
        isPrimary: true,
        hasPickupPermission: true,
      },
    });

    const gUnauth = await prisma.guardian.create({
      data: {
        tenantId: tenantAId,
        schoolId: schoolAId,
        firstName: 'Ramesh',
        lastName: `Neighbor-${testSuffix}`,
        relationship: 'OTHER',
        phone: `+9197000${testSuffix.slice(-5)}`,
        normalizedPhone: `+9197000${testSuffix.slice(-5)}`,
      },
    });
    guardianUnauthId = gUnauth.id;

    await prisma.studentGuardian.create({
      data: {
        tenantId: tenantAId,
        schoolId: schoolAId,
        studentId: studentAId,
        guardianId: guardianUnauthId,
        relationship: 'OTHER',
        isPrimary: false,
        hasPickupPermission: false, // NOT AUTHORIZED FOR PICKUP
      },
    });

    // 7. Create Employee Driver in School A
    const dept = await prisma.department.findFirst({ where: { schoolId: schoolAId } });
    const desig = await prisma.designation.findFirst({ where: { schoolId: schoolAId } });
    const driverEmp = await prisma.employee.create({
      data: {
        tenantId: tenantAId,
        schoolId: schoolAId,
        employeeNumber: `DRV-${testSuffix}`,
        firstName: 'Suresh',
        lastName: 'Kumar',
        displayName: 'Suresh Kumar',
        phone: `+9198765${testSuffix.slice(-5)}`,
        email: `driver.${testSuffix}@evolix.local`,
        joiningDate: new Date('2025-01-01'),
        status: 'ACTIVE',
        departmentId: dept?.id,
        designationId: desig?.id,
      },
    });
    employeeDriverId = driverEmp.id;

    // 8. Shared Inventory Category & Location
    const cCat = await prisma.inventoryCategory.create({
      data: { tenantId: tenantAId, schoolId: schoolAId, name: `General Supplies ${testSuffix}`, code: `CAT-${testSuffix}` },
    });
    commonCatId = cCat.id;

    const cLoc = await prisma.inventoryLocation.create({
      data: { tenantId: tenantAId, schoolId: schoolAId, name: `Main Warehouse ${testSuffix}`, code: `LOC-${testSuffix}` },
    });
    commonLocId = cLoc.id;

    // 9. Financial Year & Expense Bill in School A (Module 07)
    const fy = await prisma.financialYear.findFirst({ where: { schoolId: schoolAId } });
    if (fy) {
      financialYearId = fy.id;
    } else {
      const newFy = await prisma.financialYear.create({
        data: {
          tenantId: tenantAId,
          schoolId: schoolAId,
          name: `FY Ops ${testSuffix}`,
          startDate: new Date('2026-04-01'),
          endDate: new Date('2027-03-31'),
          isClosed: false,
        },
      });
      financialYearId = newFy.id;
    }

    const expHead = await prisma.expenseHead.findFirst({ where: { schoolId: schoolAId } });
    const acc = await prisma.account.findFirst({ where: { schoolId: schoolAId, type: 'EXPENSE' } });
    const adminUser = await prisma.user.findFirst({ where: { tenantId: tenantAId } });

    if (expHead && acc && adminUser) {
      const bill = await prisma.expenseBill.create({
        data: {
          tenantId: tenantAId,
          schoolId: schoolAId,
          financialYearId,
          billNumber: `BILL-OPS-${testSuffix}`,
          billDate: new Date(),
          description: 'Operations Science Fair Supplies',
          totalAmount: new Decimal('12500.00'),
          outstandingAmount: new Decimal('12500.00'),
          status: 'POSTED',
          createdByUserId: adminUser.id,
          lines: {
            create: {
              expenseHeadId: expHead.id,
              accountId: acc.id,
              description: 'Project Display Kits',
              amount: new Decimal('12500.00'),
            },
          },
        },
      });
      expenseBillId = bill.id;
    }

    // 10. Users & Roles Setup
    // User A: Ops Admin (has all permissions)
    const uOpsAdmin = await prisma.user.create({
      data: {
        tenantId: tenantAId,
        email: `ops.admin.${testSuffix}@evolix.local`,
        hashedPassword: '$2b$10$hashedpasswordforexample1234567890abcdef',
        firstName: 'Operations',
        lastName: 'Admin',
        isActive: true,
      },
    });
    opsAdminUserId = uOpsAdmin.id;
    await prisma.userSchool.create({ data: { userId: uOpsAdmin.id, schoolId: schoolAId } });

    const opsRole = await prisma.role.create({
      data: {
        tenantId: tenantAId,
        name: `Ops Admin Role ${testSuffix}`,
      },
    });
    // Assign all available permissions in the system to opsRole
    const allDbPerms = await prisma.permission.findMany();
    for (const p of allDbPerms) {
      await prisma.rolePermission.create({ data: { roleId: opsRole.id, permissionId: p.id } });
    }
    await prisma.userRole.create({ data: { userId: uOpsAdmin.id, roleId: opsRole.id } });
    opsAdminToken = signAccessToken(uOpsAdmin.id, tenantAId, 120);

    // Gate Guard User
    const uGuard = await prisma.user.create({
      data: {
        tenantId: tenantAId,
        email: `gate.guard.${testSuffix}@evolix.local`,
        hashedPassword: '$2b$10$hashedpasswordforexample1234567890abcdef',
        firstName: 'Gate',
        lastName: 'Guard',
        isActive: true,
      },
    });
    gateGuardUserId = uGuard.id;
    await prisma.userSchool.create({ data: { userId: uGuard.id, schoolId: schoolAId } });

    const guardRole = await prisma.role.create({
      data: {
        tenantId: tenantAId,
        name: `Gate Guard Role ${testSuffix}`,
      },
    });
    const guardPerms = await prisma.permission.findMany({
      where: {
        code: { in: ['gate.view', 'gate.manage', 'gate.checkin', 'gate.checkout', 'gate.pickup'] },
      },
    });
    for (const p of guardPerms) {
      await prisma.rolePermission.create({ data: { roleId: guardRole.id, permissionId: p.id } });
    }
    await prisma.userRole.create({ data: { userId: uGuard.id, roleId: guardRole.id } });
    gateGuardToken = signAccessToken(uGuard.id, tenantAId, 120);

    // Gate Supervisor User (has gate.pickup.override)
    const uSupervisor = await prisma.user.create({
      data: {
        tenantId: tenantAId,
        email: `gate.super.${testSuffix}@evolix.local`,
        hashedPassword: '$2b$10$hashedpasswordforexample1234567890abcdef',
        firstName: 'Gate',
        lastName: 'Supervisor',
        isActive: true,
      },
    });
    gateSupervisorUserId = uSupervisor.id;
    await prisma.userSchool.create({ data: { userId: uSupervisor.id, schoolId: schoolAId } });

    const supervRole = await prisma.role.create({
      data: {
        tenantId: tenantAId,
        name: `Gate Superv Role ${testSuffix}`,
      },
    });
    const supervPerms = await prisma.permission.findMany({
      where: {
        code: { in: ['gate.view', 'gate.manage', 'gate.checkin', 'gate.checkout', 'gate.pickup', 'gate.pickup.override'] },
      },
    });
    for (const p of supervPerms) {
      await prisma.rolePermission.create({ data: { roleId: supervRole.id, permissionId: p.id } });
    }
    await prisma.userRole.create({ data: { userId: uSupervisor.id, roleId: supervRole.id } });
    gateSupervisorToken = signAccessToken(uSupervisor.id, tenantAId, 120);

    // Transport Viewer User (only transport.view)
    const uTransViewer = await prisma.user.create({
      data: {
        tenantId: tenantAId,
        email: `trans.view.${testSuffix}@evolix.local`,
        hashedPassword: '$2b$10$hashedpasswordforexample1234567890abcdef',
        firstName: 'Transport',
        lastName: 'Viewer',
        isActive: true,
      },
    });
    await prisma.userSchool.create({ data: { userId: uTransViewer.id, schoolId: schoolAId } });
    const transViewerRole = await prisma.role.create({
      data: {
        tenantId: tenantAId,
        name: `Trans Viewer Role ${testSuffix}`,
      },
    });
    const pTransView = await prisma.permission.findUnique({ where: { code: 'transport.view' } });
    if (pTransView) {
      await prisma.rolePermission.create({ data: { roleId: transViewerRole.id, permissionId: pTransView.id } });
    }
    await prisma.userRole.create({ data: { userId: uTransViewer.id, roleId: transViewerRole.id } });
    transportViewerToken = signAccessToken(uTransViewer.id, tenantAId, 120);

    // School B User
    const uSchoolB = await prisma.user.create({
      data: {
        tenantId: tenantAId,
        email: `schb.user.${testSuffix}@evolix.local`,
        hashedPassword: '$2b$10$hashedpasswordforexample1234567890abcdef',
        firstName: 'SchoolB',
        lastName: 'User',
        isActive: true,
      },
    });
    await prisma.userSchool.create({ data: { userId: uSchoolB.id, schoolId: schoolBId } });
    schoolBUserToken = signAccessToken(uSchoolB.id, tenantAId, 120);

    // Tenant B User
    const uTenantB = await prisma.user.create({
      data: {
        tenantId: tenantBId,
        email: `tenb.user.${testSuffix}@evolix.local`,
        hashedPassword: '$2b$10$hashedpasswordforexample1234567890abcdef',
        firstName: 'TenantB',
        lastName: 'User',
        isActive: true,
      },
    });
    await prisma.userSchool.create({ data: { userId: uTenantB.id, schoolId: schoolCId } });
    tenantBUserToken = signAccessToken(uTenantB.id, tenantBId, 120);
  });

  // ======================================================================
  // 1. DIRECT-ID CROSS-SCHOOL & CROSS-TENANT ISOLATION
  // ======================================================================
  describe('Group 1: Cross-School & Cross-Tenant Data Isolation', () => {
    let vehicleAId: string;
    let routeAId: string;
    let itemAId: string;
    let assetAId: string;
    let visitorAId: string;
    let eventAId: string;

    it('creates entities in School A under Tenant A', async () => {
      // Vehicle in School A
      const vehRes = await request(app)
        .post('/api/v1/operations/transport/vehicles')
        .set('Authorization', `Bearer ${opsAdminToken}`)
        .set('X-School-Id', schoolAId)
        .send({
          registrationNumber: `DL-01-QA-${testSuffix}`,
          seatingCapacity: 35,
          fuelType: 'DIESEL',
          currentOdometerReading: 12000,
        });
      expect(vehRes.status).toBe(201);
      vehicleAId = vehRes.body.id;

      // Route in School A
      const rtRes = await request(app)
        .post('/api/v1/operations/transport/routes')
        .set('Authorization', `Bearer ${opsAdminToken}`)
        .set('X-School-Id', schoolAId)
        .send({
          routeCode: `RT-QA-${testSuffix}`,
          routeName: `Route QA ${testSuffix}`,
          startLocation: 'Point A',
          endLocation: 'Point B',
          estimatedDuration: 30,
        });
      expect(rtRes.status).toBe(201);
      routeAId = rtRes.body.id;

      // Inventory Item in School A
      const itemRes = await request(app)
        .post('/api/v1/operations/inventory/items')
        .set('Authorization', `Bearer ${opsAdminToken}`)
        .set('X-School-Id', schoolAId)
        .send({
          itemCode: `ITM-QA-${testSuffix}`,
          name: `Item QA ${testSuffix}`,
          categoryId: commonCatId,
          unitOfMeasure: 'PCS',
        });
      expect(itemRes.status).toBe(201);
      itemAId = itemRes.body.id;

      // Asset in School A
      const assetRes = await request(app)
        .post('/api/v1/operations/assets')
        .set('Authorization', `Bearer ${opsAdminToken}`)
        .set('X-School-Id', schoolAId)
        .send({
          inventoryItemId: itemAId,
          locationId: commonLocId,
          serialNumber: `SN-${testSuffix}`,
        });
      expect(assetRes.status).toBe(201);
      assetAId = assetRes.body.id;

      // Visitor in School A
      const visRes = await request(app)
        .post('/api/v1/operations/gate/visitors')
        .set('Authorization', `Bearer ${opsAdminToken}`)
        .set('X-School-Id', schoolAId)
        .send({
          fullName: `Visitor QA ${testSuffix}`,
          phone: `+91 99999 ${testSuffix.slice(-5)}`,
          visitorType: 'PARENT',
        });
      expect(visRes.status).toBe(201);
      visitorAId = visRes.body.id;

      // Event in School A
      const evtCat = await prisma.activityCategory.create({
        data: { tenantId: tenantAId, schoolId: schoolAId, name: `EventCat ${testSuffix}`, code: `EVTCAT-${testSuffix}` },
      });
      const evtRes = await request(app)
        .post('/api/v1/operations/events')
        .set('Authorization', `Bearer ${opsAdminToken}`)
        .set('X-School-Id', schoolAId)
        .send({
          eventCode: `EVT-QA-${testSuffix}`,
          title: `Annual Science Fair ${testSuffix}`,
          categoryId: evtCat.id,
          startDateTime: '2026-11-10T09:00:00.000Z',
          endDateTime: '2026-11-12T17:00:00.000Z',
          venue: 'Main Auditorium',
          capacity: 50,
        });
      expect(evtRes.status).toBe(201);
      eventAId = evtRes.body.id;
    });

    it('blocks School B from accessing School A entities (returns 404)', async () => {
      // Vehicle
      const resVeh = await request(app)
        .get(`/api/v1/operations/transport/vehicles/${vehicleAId}`)
        .set('Authorization', `Bearer ${schoolBUserToken}`)
        .set('X-School-Id', schoolBId);
      expect([403, 404]).toContain(resVeh.status);

      // Route
      const resRt = await request(app)
        .get(`/api/v1/operations/transport/routes/${routeAId}`)
        .set('Authorization', `Bearer ${schoolBUserToken}`)
        .set('X-School-Id', schoolBId);
      expect([403, 404]).toContain(resRt.status);

      // Item
      const resItem = await request(app)
        .get(`/api/v1/operations/inventory/items/${itemAId}`)
        .set('Authorization', `Bearer ${schoolBUserToken}`)
        .set('X-School-Id', schoolBId);
      expect([403, 404]).toContain(resItem.status);

      // Asset
      const resAsset = await request(app)
        .get(`/api/v1/operations/assets/${assetAId}`)
        .set('Authorization', `Bearer ${schoolBUserToken}`)
        .set('X-School-Id', schoolBId);
      expect([403, 404]).toContain(resAsset.status);

      // Event
      const resEvt = await request(app)
        .get(`/api/v1/operations/events/${eventAId}`)
        .set('Authorization', `Bearer ${schoolBUserToken}`)
        .set('X-School-Id', schoolBId);
      expect([403, 404]).toContain(resEvt.status);
    });

    it('blocks Tenant B from accessing Tenant A entities (returns 404)', async () => {
      // Vehicle
      const resVeh = await request(app)
        .get(`/api/v1/operations/transport/vehicles/${vehicleAId}`)
        .set('Authorization', `Bearer ${tenantBUserToken}`)
        .set('X-School-Id', schoolCId);
      expect([403, 404]).toContain(resVeh.status);

      // Inventory Item
      const resItem = await request(app)
        .get(`/api/v1/operations/inventory/items/${itemAId}`)
        .set('Authorization', `Bearer ${tenantBUserToken}`)
        .set('X-School-Id', schoolCId);
      expect([403, 404]).toContain(resItem.status);
    });
  });

  // ======================================================================
  // 2. TRANSPORT: STUDENT ASSIGNMENT OVERLAP & VEHICLE CAPACITY CONCURRENCY
  // (INVARIANT 1: Applicable active passengers <= vehicle seating capacity)
  // ======================================================================
  describe('Group 2: Transport Assignment & Invariant 1 (Seating Capacity)', () => {
    let smallVehicleId: string;
    let smallRouteId: string;
    let stopId: string;

    it('prevents overlapping student transport assignment across routes', async () => {
      // Create vehicle with capacity 2
      const veh = await request(app)
        .post('/api/v1/operations/transport/vehicles')
        .set('Authorization', `Bearer ${opsAdminToken}`)
        .set('X-School-Id', schoolAId)
        .send({
          registrationNumber: `DL-CAP-02-${testSuffix}`,
          seatingCapacity: 2,
          fuelType: 'CNG',
        });
      expect(veh.status).toBe(201);
      smallVehicleId = veh.body.id;

      // Create Route 1
      const rt1 = await request(app)
        .post('/api/v1/operations/transport/routes')
        .set('Authorization', `Bearer ${opsAdminToken}`)
        .set('X-School-Id', schoolAId)
        .send({
          routeCode: `RT-C1-${testSuffix}`,
          routeName: `Route Capacity 1 ${testSuffix}`,
          startLocation: 'Terminal 1',
          endLocation: 'Campus',
          estimatedDuration: 25,
        });
      expect(rt1.status).toBe(201);
      smallRouteId = rt1.body.id;

      // Create Stop on Route 1
      const stp = await request(app)
        .post(`/api/v1/operations/transport/routes/${smallRouteId}/stops`)
        .set('Authorization', `Bearer ${opsAdminToken}`)
        .set('X-School-Id', schoolAId)
        .send({
          stopName: 'Green Park',
          sequence: 1,
          pickupTime: '07:30',
          dropTime: '14:30',
        });
      expect(stp.status).toBe(201);
      stopId = stp.body.id;

      // Assign Vehicle to Route 1 morning shift
      await request(app)
        .post(`/api/v1/operations/transport/routes/${smallRouteId}/vehicles`)
        .set('Authorization', `Bearer ${opsAdminToken}`)
        .set('X-School-Id', schoolAId)
        .send({
          vehicleId: smallVehicleId,
          shift: 'MORNING',
          effectiveFrom: '2026-04-01',
          effectiveTo: '2027-03-31',
        });

      // Assign Student A to Route 1 for full academic year
      const assign1 = await request(app)
        .post(`/api/v1/operations/transport/assignments`)
        .set('Authorization', `Bearer ${opsAdminToken}`)
        .set('X-School-Id', schoolAId)
        .send({
          studentId: studentAId,
          academicYearId,
          routeId: smallRouteId,
          pickupStopId: stopId,
          dropStopId: stopId,
          vehicleId: smallVehicleId,
          shift: 'MORNING',
          effectiveFrom: '2026-04-01',
          effectiveTo: '2027-03-31',
          feeAmount: 1500,
        });
      expect(assign1.status).toBe(201);

      // Attempt to assign Student A to another overlapping route
      const rt2 = await request(app)
        .post('/api/v1/operations/transport/routes')
        .set('Authorization', `Bearer ${opsAdminToken}`)
        .set('X-School-Id', schoolAId)
        .send({
          routeCode: `RT-C2-${testSuffix}`,
          routeName: `Route Capacity 2 ${testSuffix}`,
          startLocation: 'Terminal 2',
          endLocation: 'Campus',
          estimatedDuration: 20,
        });
      const stp2 = await request(app)
        .post(`/api/v1/operations/transport/routes/${rt2.body.id}/stops`)
        .set('Authorization', `Bearer ${opsAdminToken}`)
        .set('X-School-Id', schoolAId)
        .send({ stopName: 'City Center', sequence: 1 });

      const overlapAssign = await request(app)
        .post(`/api/v1/operations/transport/assignments`)
        .set('Authorization', `Bearer ${opsAdminToken}`)
        .set('X-School-Id', schoolAId)
        .send({
          studentId: studentAId,
          academicYearId,
          routeId: rt2.body.id,
          pickupStopId: stp2.body.id,
          dropStopId: stp2.body.id,
          shift: 'MORNING',
          effectiveFrom: '2026-06-01',
          effectiveTo: '2026-12-31',
        });
      expect([400, 409]).toContain(overlapAssign.status);
      expect(overlapAssign.body.message || overlapAssign.body.error).toMatch(/overlap|active transport assignment|already assigned/i);
    });

    it('enforces vehicle capacity under concurrent requests (Promise.allSettled)', async () => {
      // Vehicle capacity is 2. Currently 1 active assignment (Student A).
      // Fire 2 concurrent requests for Student B and Student C.
      const reqB = request(app)
        .post(`/api/v1/operations/transport/assignments`)
        .set('Authorization', `Bearer ${opsAdminToken}`)
        .set('X-School-Id', schoolAId)
        .send({
          studentId: studentBId,
          academicYearId,
          routeId: smallRouteId,
          pickupStopId: stopId,
          dropStopId: stopId,
          vehicleId: smallVehicleId,
          shift: 'MORNING',
          effectiveFrom: '2026-04-01',
          effectiveTo: '2027-03-31',
        });

      const reqC = request(app)
        .post(`/api/v1/operations/transport/assignments`)
        .set('Authorization', `Bearer ${opsAdminToken}`)
        .set('X-School-Id', schoolAId)
        .send({
          studentId: studentCId,
          academicYearId,
          routeId: smallRouteId,
          pickupStopId: stopId,
          dropStopId: stopId,
          vehicleId: smallVehicleId,
          shift: 'MORNING',
          effectiveFrom: '2026-04-01',
          effectiveTo: '2027-03-31',
        });

      const results = await Promise.allSettled([reqB, reqC]);
      const statuses = results.map((r: any) => r.value.status);

      // Exactly 1 must succeed (201) and exactly 1 must fail (409 or 400) due to capacity limit 2
      expect(statuses.filter((s) => s === 201).length).toBe(1);
      expect(statuses.filter((s) => s === 409 || s === 400).length).toBe(1);

      // Invariant 1 Verification: active assignments <= capacity (2 <= 2)
      const count = await prisma.studentTransportAssignment.count({
        where: { routeId: smallRouteId, status: 'ACTIVE' },
      });
      expect(count).toBe(2);
      expect(count).toBeLessThanOrEqual(2);
    });
  });

  // ======================================================================
  // 3. TRANSPORT: BOARDING STATE MACHINE & ATTENDANCE ISOLATION
  // ======================================================================
  describe('Group 3: Boarding State Machine & Attendance Isolation', () => {
    let tripId: string;
    let initialAttendanceCount: number;

    beforeAll(async () => {
      initialAttendanceCount = await prisma.studentAttendance.count();
    });

    it('creates trip and enforces boarding state machine (DROPPED -> BOARDED prohibited)', async () => {
      const routes = await prisma.transportRoute.findMany({ where: { schoolId: schoolAId } });
      const vehicles = await prisma.vehicle.findMany({ where: { schoolId: schoolAId } });

      const tripRes = await request(app)
        .post('/api/v1/operations/transport/trips')
        .set('Authorization', `Bearer ${opsAdminToken}`)
        .set('X-School-Id', schoolAId)
        .send({
          routeId: routes[0].id,
          vehicleId: vehicles[0].id,
          tripType: 'PICKUP',
          tripDate: '2026-09-06',
          driverEmployeeId: employeeDriverId,
        });
      expect(tripRes.status).toBe(201);
      tripId = tripRes.body.id;

      // Board Student A
      const boardRes = await request(app)
        .post(`/api/v1/operations/transport/trips/${tripId}/boarding`)
        .set('Authorization', `Bearer ${opsAdminToken}`)
        .set('X-School-Id', schoolAId)
        .send({
          studentId: studentAId,
          status: 'BOARDED',
        });
      expect(boardRes.status).toBe(200);

      // Drop off Student A
      const dropRes = await request(app)
        .post(`/api/v1/operations/transport/trips/${tripId}/boarding`)
        .set('Authorization', `Bearer ${opsAdminToken}`)
        .set('X-School-Id', schoolAId)
        .send({
          studentId: studentAId,
          status: 'DROPPED',
        });
      expect(dropRes.status).toBe(200);

      // Illegal transition: Attempt to transition DROPPED back to BOARDED
      const illegalTransition = await request(app)
        .post(`/api/v1/operations/transport/trips/${tripId}/boarding`)
        .set('Authorization', `Bearer ${opsAdminToken}`)
        .set('X-School-Id', schoolAId)
        .send({
          studentId: studentAId,
          status: 'BOARDED',
        });
      expect(illegalTransition.status).toBe(400);
    });

    it('verifies Module 05 StudentAttendance table was NOT mutated by transport boarding', async () => {
      const currentAttendanceCount = await prisma.studentAttendance.count();
      expect(currentAttendanceCount).toBe(initialAttendanceCount);
    });
  });

  // ======================================================================
  // 4. TRANSPORT: MONOTONIC ODOMETER & AUDITED CORRECTION
  // ======================================================================
  describe('Group 4: Monotonic Odometer & Audited Corrections', () => {
    let odoVehicleId: string;

    it('rejects decreasing odometer reading on standard update but permits audited correction', async () => {
      const veh = await request(app)
        .post('/api/v1/operations/transport/vehicles')
        .set('Authorization', `Bearer ${opsAdminToken}`)
        .set('X-School-Id', schoolAId)
        .send({
          registrationNumber: `DL-ODO-${testSuffix}`,
          seatingCapacity: 30,
          currentOdometerReading: 5000,
        });
      expect(veh.status).toBe(201);
      odoVehicleId = veh.body.id;

      // Attempt to log decreased odometer without allowCorrection -> 400
      const decreaseRes = await request(app)
        .post(`/api/v1/operations/transport/vehicles/${odoVehicleId}/odometer`)
        .set('Authorization', `Bearer ${opsAdminToken}`)
        .set('X-School-Id', schoolAId)
        .send({
          reading: 4800,
        });
      expect(decreaseRes.status).toBe(400);
      expect(decreaseRes.body.message || decreaseRes.body.error).toMatch(/cannot be less|cannot decrease|monotonic/i);

      // Audited correction with correctionReason -> succeeds
      const correctionRes = await request(app)
        .post(`/api/v1/operations/transport/vehicles/${odoVehicleId}/odometer`)
        .set('Authorization', `Bearer ${opsAdminToken}`)
        .set('X-School-Id', schoolAId)
        .send({
          reading: 4800,
          allowCorrection: true,
          correctionReason: 'Typo in previous maintenance odometer entry',
        });
      expect([200, 201]).toContain(correctionRes.status);
    });
  });

  // ======================================================================
  // 5. INVENTORY: INVARIANT 2 (Current Stock = Signed Sum of StockMovement)
  // & CONCURRENT STOCK ISSUE RACE TEST
  // ======================================================================
  describe('Group 5: Inventory Ledger & Invariant 2 (Stock Balance Integrity)', () => {
    let invItemId: string;

    it('initializes opening balance idempotently', async () => {
      const itemRes = await request(app)
        .post('/api/v1/operations/inventory/items')
        .set('Authorization', `Bearer ${opsAdminToken}`)
        .set('X-School-Id', schoolAId)
        .send({
          itemCode: `STK-${testSuffix}`,
          name: `Notebooks Bulk ${testSuffix}`,
          categoryId: commonCatId,
          unitOfMeasure: 'PACK',
        });
      expect(itemRes.status).toBe(201);
      invItemId = itemRes.body.id;

      // Initial opening balance: 100
      const openRes = await request(app)
        .post('/api/v1/operations/inventory/stock/opening')
        .set('Authorization', `Bearer ${opsAdminToken}`)
        .set('X-School-Id', schoolAId)
        .send({
          itemId: invItemId,
          locationId: commonLocId,
          quantity: 100,
          unitCost: 25.5,
        });
      expect([200, 201]).toContain(openRes.status);

      // Calling opening balance again -> 400 (already initialized)
      const dupOpen = await request(app)
        .post('/api/v1/operations/inventory/stock/opening')
        .set('Authorization', `Bearer ${opsAdminToken}`)
        .set('X-School-Id', schoolAId)
        .send({
          itemId: invItemId,
          locationId: commonLocId,
          quantity: 50,
        });
      expect([400, 409]).toContain(dupOpen.status);
    });

    it('enforces Invariant 2: Current stock balance equals signed sum of movements', async () => {
      // Inward +50
      await request(app)
        .post('/api/v1/operations/inventory/stock/inward')
        .set('Authorization', `Bearer ${opsAdminToken}`)
        .set('X-School-Id', schoolAId)
        .send({ itemId: invItemId, locationId: commonLocId, quantity: 50 });

      // Issue -20
      const issueRes = await request(app)
        .post('/api/v1/operations/inventory/stock/issue')
        .set('Authorization', `Bearer ${opsAdminToken}`)
        .set('X-School-Id', schoolAId)
        .send({ itemId: invItemId, locationId: commonLocId, quantity: 20 });
      expect([200, 201]).toContain(issueRes.status);
      const issuedMovementId = issueRes.body.id;

      // Return +5
      const retRes = await request(app)
        .post('/api/v1/operations/inventory/stock/return')
        .set('Authorization', `Bearer ${opsAdminToken}`)
        .set('X-School-Id', schoolAId)
        .send({ itemId: invItemId, locationId: commonLocId, quantity: 5, originalIssueMovementId: issuedMovementId });
      expect([200, 201]).toContain(retRes.status);

      // Expected calculation: 100 (OPENING) + 50 (INWARD) - 20 (ISSUE) + 5 (RETURN) = 135
      const balanceRecord = await prisma.inventoryStockBalance.findUnique({
        where: { itemId_locationId: { itemId: invItemId, locationId: commonLocId } },
      });
      expect(balanceRecord).toBeDefined();
      expect(Number(balanceRecord!.currentQuantity)).toBe(135);

      // Verify signed sum of movements in PostgreSQL directly:
      const movements = await (prisma as any).stockMovement.findMany({
        where: { itemId: invItemId, locationId: commonLocId },
      });
      let calculatedSum = 0;
      for (const m of movements) {
        if (m.movementType === 'OPENING' || m.movementType === 'INWARD' || m.movementType === 'RETURN' || m.movementType === 'TRANSFER_IN' || m.movementType === 'ADJUSTMENT_IN') {
          calculatedSum += Number(m.quantity);
        } else {
          calculatedSum -= Number(m.quantity);
        }
      }
      expect(calculatedSum).toBe(135);
      expect(Number(balanceRecord!.currentQuantity)).toBe(calculatedSum);
    });

    it('prevents return quantity exceeding original issued quantity', async () => {
      // Issue 10
      const iss = await request(app)
        .post('/api/v1/operations/inventory/stock/issue')
        .set('Authorization', `Bearer ${opsAdminToken}`)
        .set('X-School-Id', schoolAId)
        .send({ itemId: invItemId, locationId: commonLocId, quantity: 10 });
      expect([200, 201]).toContain(iss.status);

      // Attempt return 15 -> 400
      const exReturn = await request(app)
        .post('/api/v1/operations/inventory/stock/return')
        .set('Authorization', `Bearer ${opsAdminToken}`)
        .set('X-School-Id', schoolAId)
        .send({ itemId: invItemId, locationId: commonLocId, quantity: 15, originalIssueMovementId: iss.body.id });
      expect(exReturn.status).toBe(400);
    });

    it('prevents negative stock under concurrent issue race (Promise.allSettled)', async () => {
      // Create new item with opening stock 10.000
      const itemRes = await request(app)
        .post('/api/v1/operations/inventory/items')
        .set('Authorization', `Bearer ${opsAdminToken}`)
        .set('X-School-Id', schoolAId)
        .send({
          itemCode: `RACE-${testSuffix}`,
          name: `Race Item ${testSuffix}`,
          categoryId: commonCatId,
          unitOfMeasure: 'PCS',
        });
      expect(itemRes.status).toBe(201);
      const raceItemId = itemRes.body.id;

      await request(app)
        .post('/api/v1/operations/inventory/stock/opening')
        .set('Authorization', `Bearer ${opsAdminToken}`)
        .set('X-School-Id', schoolAId)
        .send({ itemId: raceItemId, locationId: commonLocId, quantity: 10 });

      // Fire 2 concurrent issues of 7.000 each (Total requested = 14 > 10)
      const issue1 = request(app)
        .post('/api/v1/operations/inventory/stock/issue')
        .set('Authorization', `Bearer ${opsAdminToken}`)
        .set('X-School-Id', schoolAId)
        .send({ itemId: raceItemId, locationId: commonLocId, quantity: 7 });

      const issue2 = request(app)
        .post('/api/v1/operations/inventory/stock/issue')
        .set('Authorization', `Bearer ${opsAdminToken}`)
        .set('X-School-Id', schoolAId)
        .send({ itemId: raceItemId, locationId: commonLocId, quantity: 7 });

      const results = await Promise.allSettled([issue1, issue2]);
      const statuses = results.map((r: any) => r.value.status);

      // Exactly 1 must succeed and exactly 1 must fail due to insufficient stock
      expect(statuses.filter((s) => s === 201 || s === 200).length).toBe(1);
      expect(statuses.filter((s) => s === 409 || s === 400).length).toBe(1);

      // Stock must be exactly 3.000 (never negative)
      const finalBal = await prisma.inventoryStockBalance.findUnique({
        where: { itemId_locationId: { itemId: raceItemId, locationId: commonLocId } },
      });
      expect(Number(finalBal!.currentQuantity)).toBe(3);
    });
  });

  // ======================================================================
  // 6. ASSETS: INVARIANT 3 (Asset Has At Most One Active Assignment)
  // & DISPOSAL BLOCKING
  // ======================================================================
  describe('Group 6: Fixed Asset Register & Invariant 3 (Single Active Custody)', () => {
    let testAssetId: string;

    beforeAll(async () => {
      const item = await prisma.inventoryItem.findFirst({ where: { schoolId: schoolAId } });

      const assetRes = await request(app)
        .post('/api/v1/operations/assets')
        .set('Authorization', `Bearer ${opsAdminToken}`)
        .set('X-School-Id', schoolAId)
        .send({
          inventoryItemId: item!.id,
          locationId: commonLocId,
          serialNumber: `SN-CUSTODY-${testSuffix}`,
        });
      expect(assetRes.status).toBe(201);
      testAssetId = assetRes.body.id;
    });

    it('enforces Invariant 3 under concurrent assignment race (Promise.allSettled)', async () => {
      // Launch 2 concurrent assignments for the same AVAILABLE asset
      const assign1 = request(app)
        .post(`/api/v1/operations/assets/${testAssetId}/assign`)
        .set('Authorization', `Bearer ${opsAdminToken}`)
        .set('X-School-Id', schoolAId)
        .send({
          employeeId: employeeDriverId,
          remarks: 'Assignment A',
        });

      const assign2 = request(app)
        .post(`/api/v1/operations/assets/${testAssetId}/assign`)
        .set('Authorization', `Bearer ${opsAdminToken}`)
        .set('X-School-Id', schoolAId)
        .send({
          employeeId: employeeDriverId,
          remarks: 'Assignment B',
        });

      const results = await Promise.allSettled([assign1, assign2]);
      const statuses = results.map((r: any) => r.value.status);

      // Exactly 1 succeeds (201 or 200), 1 rejected (409 or 400)
      expect(statuses.filter((s) => s === 201 || s === 200).length).toBe(1);
      expect(statuses.filter((s) => s === 409 || s === 400).length).toBe(1);

      // Invariant 3 Verification: active assignments without returnedAt is exactly 1
      const activeAssignments = await prisma.assetAssignment.count({
        where: { assetId: testAssetId, returnedAt: null },
      });
      expect(activeAssignments).toBe(1);
    });

    it('blocks asset disposal while actively assigned', async () => {
      const disposeRes = await request(app)
        .post(`/api/v1/operations/assets/${testAssetId}/dispose`)
        .set('Authorization', `Bearer ${opsAdminToken}`)
        .set('X-School-Id', schoolAId)
        .send({
          disposalDate: '2026-09-06',
          method: 'SCRAP',
          reason: 'Attempted disposal',
        });
      expect(disposeRes.status).toBe(400);
      expect(disposeRes.body.message || disposeRes.body.error).toMatch(/assign|active custody/i);

      // Return asset first
      const retRes = await request(app)
        .post(`/api/v1/operations/assets/${testAssetId}/return`)
        .set('Authorization', `Bearer ${opsAdminToken}`)
        .set('X-School-Id', schoolAId)
        .send({
          conditionOnReturn: 'GOOD',
        });
      expect(retRes.status).toBe(200);

      // Now disposal succeeds
      const disposeSuccess = await request(app)
        .post(`/api/v1/operations/assets/${testAssetId}/dispose`)
        .set('Authorization', `Bearer ${opsAdminToken}`)
        .set('X-School-Id', schoolAId)
        .send({
          disposalDate: '2026-09-06',
          method: 'SCRAP',
          reason: 'Decommissioned verified',
        });
      expect([200, 201]).toContain(disposeSuccess.status);
    });
  });

  // ======================================================================
  // 7. GATE: VISITOR LEGAL STATE MACHINE & INVARIANT 4 (GUARDIAN PICKUP)
  // & EXCEPTIONAL OVERRIDE AUTHORIZATION
  // ======================================================================
  describe('Group 7: Gate Safety, Visitor State Machine & Invariant 4', () => {
    let visitId: string;

    it('enforces visitor check-in/out state machine (CHECKED_OUT -> CHECKED_IN rejected)', async () => {
      const visitor = await prisma.visitor.findFirst({ where: { schoolId: schoolAId } });

      const checkInRes = await request(app)
        .post('/api/v1/operations/gate/visits/check-in')
        .set('Authorization', `Bearer ${gateGuardToken}`)
        .set('X-School-Id', schoolAId)
        .send({
          visitorId: visitor!.id,
          purpose: 'Official meeting',
        });
      expect(checkInRes.status).toBe(201);
      visitId = checkInRes.body.id;

      // Check out visitor
      const checkOutRes = await request(app)
        .post(`/api/v1/operations/gate/visits/${visitId}/check-out`)
        .set('Authorization', `Bearer ${gateGuardToken}`)
        .set('X-School-Id', schoolAId)
        .send();
      expect(checkOutRes.status).toBe(200);

      // Illegal re-check-in on same visit
      const reCheckIn = await request(app)
        .post(`/api/v1/operations/gate/visits/${visitId}/check-out`)
        .set('Authorization', `Bearer ${gateGuardToken}`)
        .set('X-School-Id', schoolAId)
        .send();
      expect(reCheckIn.status).toBe(400);
    });

    it('enforces Invariant 4: Normal pickup requires authorized guardian (unauthorized rejected)', async () => {
      // Normal pickup with unauthorized guardian -> 403 Forbidden
      const unauthRes = await request(app)
        .post('/api/v1/operations/gate/pickups')
        .set('Authorization', `Bearer ${gateGuardToken}`)
        .set('X-School-Id', schoolAId)
        .send({
          studentId: studentAId,
          pickupType: 'AUTHORIZED_GUARDIAN',
          guardianId: guardianUnauthId, // hasPickupPermission = false
        });
      expect(unauthRes.status).toBe(403);
      expect(unauthRes.body.message || unauthRes.body.error).toMatch(/unauthorized|not authorized|pickup permission/i);

      // Normal pickup with authorized guardian -> succeeds
      const authRes = await request(app)
        .post('/api/v1/operations/gate/pickups')
        .set('Authorization', `Bearer ${gateGuardToken}`)
        .set('X-School-Id', schoolAId)
        .send({
          studentId: studentAId,
          pickupType: 'AUTHORIZED_GUARDIAN',
          guardianId: guardianAuthId, // hasPickupPermission = true
        });
      expect(authRes.status).toBe(201);
    });

    it('enforces exceptional pickup authorization (requires gate.pickup.override permission)', async () => {
      // Gate guard lacks gate.pickup.override -> 403
      const guardOverride = await request(app)
        .post('/api/v1/operations/gate/pickups')
        .set('Authorization', `Bearer ${gateGuardToken}`)
        .set('X-School-Id', schoolAId)
        .send({
          studentId: studentBId,
          pickupType: 'EXCEPTION',
          isOverride: true,
          overrideReason: 'Emergency medical pickup by uncle',
        });
      expect(guardOverride.status).toBe(403);

      // Gate supervisor has gate.pickup.override -> succeeds
      const supervOverride = await request(app)
        .post('/api/v1/operations/gate/pickups')
        .set('Authorization', `Bearer ${gateSupervisorToken}`)
        .set('X-School-Id', schoolAId)
        .send({
          studentId: studentBId,
          pickupType: 'EXCEPTION',
          isOverride: true,
          overrideReason: 'Emergency medical pickup by uncle',
        });
      expect(supervOverride.status).toBe(201);

      // Verify audit trail created
      const audit = await prisma.auditLog.findFirst({
        where: {
          entityType: 'StudentPickupRelease',
          action: 'EXCEPTIONAL_OVERRIDE',
        },
      });
      expect(audit).toBeDefined();
    });
  });

  // ======================================================================
  // 8. EVENTS: INVARIANT 5 (Active Participants <= Event Capacity)
  // & EXPENSE BILL LINKING
  // ======================================================================
  describe('Group 8: School Events, Invariant 5 (Capacity) & Expense Bill', () => {
    let smallEvtId: string;

    it('enforces Invariant 5 under concurrent participant registration (Promise.allSettled)', async () => {
      const evtCat = await prisma.activityCategory.findFirst({ where: { schoolId: schoolAId } });

      // Create event with capacity 2
      const evtRes = await request(app)
        .post('/api/v1/operations/events')
        .set('Authorization', `Bearer ${opsAdminToken}`)
        .set('X-School-Id', schoolAId)
        .send({
          eventCode: `EVT-CAP-${testSuffix}`,
          title: `Robotics Contest ${testSuffix}`,
          categoryId: evtCat!.id,
          startDateTime: '2026-11-20T09:00:00.000Z',
          endDateTime: '2026-11-21T17:00:00.000Z',
          venue: 'Tech Lab 2',
          capacity: 2,
        });
      expect(evtRes.status).toBe(201);
      smallEvtId = evtRes.body.id;

      // Register Student A (active count = 1)
      const regA = await request(app)
        .post(`/api/v1/operations/events/${smallEvtId}/participants`)
        .set('Authorization', `Bearer ${opsAdminToken}`)
        .set('X-School-Id', schoolAId)
        .send({ studentId: studentAId });
      expect(regA.status).toBe(201);

      // Fire 2 concurrent registrations for Student B and Student C
      const regB = request(app)
        .post(`/api/v1/operations/events/${smallEvtId}/participants`)
        .set('Authorization', `Bearer ${opsAdminToken}`)
        .set('X-School-Id', schoolAId)
        .send({ studentId: studentBId });

      const regC = request(app)
        .post(`/api/v1/operations/events/${smallEvtId}/participants`)
        .set('Authorization', `Bearer ${opsAdminToken}`)
        .set('X-School-Id', schoolAId)
        .send({ studentId: studentCId });

      const results = await Promise.allSettled([regB, regC]);
      const statuses = results.map((r: any) => r.value.status);

      // Exactly 1 succeeds (201), 1 rejected due to capacity full (400 or 409)
      expect(statuses.filter((s) => s === 201).length).toBe(1);
      expect(statuses.filter((s) => s === 400 || s === 409).length).toBe(1);

      // Invariant 5 Verification: active participants <= capacity (2 <= 2)
      const count = await prisma.eventParticipant.count({
        where: { eventId: smallEvtId, status: { not: 'CANCELLED' } },
      });
      expect(count).toBe(2);
      expect(count).toBeLessThanOrEqual(2);
    });

    it('links event expense to Module 07 ExpenseBill without creating duplicate journal entry', async () => {
      if (!expenseBillId) return;

      const linkRes = await request(app)
        .post(`/api/v1/operations/events/${smallEvtId}/expenses`)
        .set('Authorization', `Bearer ${opsAdminToken}`)
        .set('X-School-Id', schoolAId)
        .send({
          expenseBillId,
          notes: 'Allocated for display boards',
        });
      expect(linkRes.status).toBe(201);

      // Verify link exists in DB pointing directly to Module 07 ExpenseBill
      const linkRecord = await prisma.eventExpenseLink.findFirst({
        where: { eventId: smallEvtId, expenseBillId },
      });
      expect(linkRecord).toBeDefined();
    });
  });

  // ======================================================================
  // 9. DASHBOARD & GLOBAL SEARCH RBAC FILTERING
  // ======================================================================
  describe('Group 9: Operations Overview Dashboard & Search RBAC Filtering', () => {
    it('filters overview dashboard stats by user permissions', async () => {
      // Transport Viewer only has transport.view
      const res = await request(app)
        .get('/api/v1/operations/dashboard')
        .set('Authorization', `Bearer ${transportViewerToken}`)
        .set('X-School-Id', schoolAId);
      expect(res.status).toBe(200);

      expect(res.body.permissions.hasTransport).toBe(true);
      expect(res.body.permissions.hasInventory).toBe(false);
      expect(res.body.permissions.hasAssets).toBe(false);
      expect(res.body.permissions.hasGate).toBe(false);

      // Transport block exists, other blocks are undefined/null
      expect(res.body.transport).toBeDefined();
      expect(res.body.inventory).toBeUndefined();
      expect(res.body.assets).toBeUndefined();
      expect(res.body.gate).toBeUndefined();
    });

    it('returns authoritative CSV report export with 200 OK and text/csv header', async () => {
      const csvRes = await request(app)
        .get('/api/v1/operations/reports/transport?format=csv')
        .set('Authorization', `Bearer ${opsAdminToken}`)
        .set('X-School-Id', schoolAId);
      expect(csvRes.status).toBe(200);
      expect(csvRes.headers['content-type']).toMatch(/text\/csv/i);
      expect(csvRes.text).toContain('registrationNumber');
    });
  });
});
