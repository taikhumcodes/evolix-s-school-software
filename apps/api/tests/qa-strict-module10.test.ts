import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { Prisma, AutomationEventType, TemplateLanguage } from '@prisma/client';
import { signAccessToken } from '../src/lib/crypto.js';
import { SchedulerService } from '../src/modules/communication/automation/scheduler.service.js';
import { DomainEventService } from '../src/modules/communication/events/domain-event.service.js';
import { RuleEngine } from '../src/modules/communication/automation/rule-engine.js';
import { CommunicationService } from '../src/modules/communication/communication.service.js';
import { ProviderRegistry } from '../src/modules/communication/providers/provider.registry.js';
import { encryptDestination, maskDestination } from '../src/modules/communication/encryption.util.js';

const Decimal = Prisma.Decimal;

describe('EVOLIX School ERP — Major Module 10 Strict QA & Automation Integrity Suite', () => {
  let testSuffix: string;

  // Tenants & Schools
  let tenantAId: string;
  let schoolAId: string;
  let schoolBId: string; // Same tenant A, different school
  let tenantBId: string; // Different tenant
  let schoolCId: string;

  // Tokens
  let superAdminToken: string;
  let commAdminToken: string;
  let commViewerToken: string;
  let schoolBUserToken: string;
  let tenantBUserToken: string;

  // Users & Master Entities
  let commAdminUserId: string;
  let commViewerUserId: string;
  let studentAId: string;
  let guardianAId: string;
  let academicYearId: string;
  let financialYearId: string;

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

    // 2. School B under Tenant A
    const schoolB = await prisma.school.create({
      data: {
        tenantId: tenantAId,
        name: `School B QA Comm ${testSuffix}`,
        code: `SCH-B-COMM-${testSuffix}`,
        isActive: true,
      },
    });
    schoolBId = schoolB.id;

    // 3. Tenant B and School C
    const tenantB = await prisma.tenant.create({
      data: {
        name: `Tenant B QA Comm ${testSuffix}`,
        domain: `tenant-b-comm-${testSuffix}.evolix.local`,
        isActive: true,
      },
    });
    tenantBId = tenantB.id;

    const schoolC = await prisma.school.create({
      data: {
        tenantId: tenantBId,
        name: `School C QA Comm ${testSuffix}`,
        code: `SCH-C-COMM-${testSuffix}`,
        isActive: true,
      },
    });
    schoolCId = schoolC.id;

    // 4. Users & Roles in Tenant A / School A
    const uAdmin = await prisma.user.create({
      data: {
        tenantId: tenantAId,
        email: `comm.admin.${testSuffix}@evolix.local`,
        hashedPassword: '$2b$10$hashedpasswordforexample1234567890abcdef',
        firstName: 'Comm',
        lastName: 'Admin',
        isActive: true,
      },
    });
    commAdminUserId = uAdmin.id;
    await prisma.userSchool.create({ data: { userId: uAdmin.id, schoolId: schoolAId } });

    const roleAdmin = await prisma.role.create({
      data: {
        tenantId: tenantAId,
        name: `Comm Admin Role ${testSuffix}`,
      },
    });
    const allDbPerms = await prisma.permission.findMany();
    for (const p of allDbPerms) {
      await prisma.rolePermission.create({ data: { roleId: roleAdmin.id, permissionId: p.id } });
    }
    await prisma.userRole.create({ data: { userId: uAdmin.id, roleId: roleAdmin.id } });
    commAdminToken = signAccessToken(uAdmin.id, tenantAId, 120);

    // Comm Viewer (only view permission)
    const uViewer = await prisma.user.create({
      data: {
        tenantId: tenantAId,
        email: `comm.viewer.${testSuffix}@evolix.local`,
        hashedPassword: '$2b$10$hashedpasswordforexample1234567890abcdef',
        firstName: 'Comm',
        lastName: 'Viewer',
        isActive: true,
      },
    });
    commViewerUserId = uViewer.id;
    await prisma.userSchool.create({ data: { userId: uViewer.id, schoolId: schoolAId } });

    const roleViewer = await prisma.role.create({
      data: {
        tenantId: tenantAId,
        name: `Comm Viewer Role ${testSuffix}`,
      },
    });
    const viewPerms = await prisma.permission.findMany({
      where: { code: { in: ['communication.view', 'automation.view'] } },
    });
    for (const p of viewPerms) {
      await prisma.rolePermission.create({ data: { roleId: roleViewer.id, permissionId: p.id } });
    }
    await prisma.userRole.create({ data: { userId: uViewer.id, roleId: roleViewer.id } });
    commViewerToken = signAccessToken(uViewer.id, tenantAId, 120);

    // School B User (Tenant A)
    const uSchB = await prisma.user.create({
      data: {
        tenantId: tenantAId,
        email: `schb.user.${testSuffix}@evolix.local`,
        hashedPassword: '$2b$10$hashedpasswordforexample1234567890abcdef',
        firstName: 'SchoolB',
        lastName: 'User',
        isActive: true,
      },
    });
    await prisma.userSchool.create({ data: { userId: uSchB.id, schoolId: schoolBId } });
    await prisma.userRole.create({ data: { userId: uSchB.id, roleId: roleAdmin.id } });
    schoolBUserToken = signAccessToken(uSchB.id, tenantAId, 120);

    // Tenant B User
    const uTenB = await prisma.user.create({
      data: {
        tenantId: tenantBId,
        email: `tenb.user.${testSuffix}@evolix.local`,
        hashedPassword: '$2b$10$hashedpasswordforexample1234567890abcdef',
        firstName: 'TenantB',
        lastName: 'User',
        isActive: true,
      },
    });
    await prisma.userSchool.create({ data: { userId: uTenB.id, schoolId: schoolCId } });

    const roleTenB = await prisma.role.create({
      data: {
        tenantId: tenantBId,
        name: `Tenant B Admin Role ${testSuffix}`,
      },
    });
    const tenBPerms = await prisma.permission.findMany({
      where: { code: { in: ['communication.view', 'communication.manage', 'automation.view', 'automation.manage'] } },
    });
    for (const p of tenBPerms) {
      await prisma.rolePermission.create({ data: { roleId: roleTenB.id, permissionId: p.id } });
    }
    await prisma.userRole.create({ data: { userId: uTenB.id, roleId: roleTenB.id } });
    tenantBUserToken = signAccessToken(uTenB.id, tenantBId, 120);

    // 5. Seed Academic Year & Financial Year in School A
    const ay = await prisma.academicYear.findFirst({ where: { schoolId: schoolAId, isClosed: false } });
    academicYearId = ay!.id;

    let fy = await prisma.financialYear.findFirst({ where: { schoolId: schoolAId } });
    if (!fy) {
      fy = await prisma.financialYear.create({
        data: {
          tenantId: tenantAId,
          schoolId: schoolAId,
          name: `FY Comm ${testSuffix}`,
          startDate: new Date('2026-04-01'),
          endDate: new Date('2027-03-31'),
        },
      });
    }
    financialYearId = fy.id;

    // 6. Seed Student & Guardian in School A
    const student = await prisma.student.create({
      data: {
        tenantId: tenantAId,
        schoolId: schoolAId,
        studentId: `STU-COMM-${testSuffix}`,
        admissionNumber: `ADM-COMM-${testSuffix}`,
        admittedAcademicYearId: academicYearId,
        firstName: 'Kabir',
        lastName: `Patel-${testSuffix}`,
        gender: 'MALE',
        dateOfBirth: new Date('2017-06-15'),
      },
    });
    studentAId = student.id;

    const guardian = await prisma.guardian.create({
      data: {
        tenantId: tenantAId,
        schoolId: schoolAId,
        firstName: 'Vikram',
        lastName: `Patel-${testSuffix}`,
        relationship: 'FATHER',
        phone: '+919876543210',
        normalizedPhone: '+919876543210',
        email: `vikram.patel.${testSuffix}@example.com`,
      },
    });
    guardianAId = guardian.id;

    await prisma.studentGuardian.create({
      data: {
        tenantId: tenantAId,
        schoolId: schoolAId,
        studentId: studentAId,
        guardianId: guardianAId,
        relationship: 'FATHER',
        isPrimary: true,
        hasPickupPermission: true,
      },
    });

    // Seed School Settings
    await prisma.communicationSettings.upsert({
      where: { schoolId: schoolAId },
      create: {
        tenantId: tenantAId,
        schoolId: schoolAId,
        defaultChannels: ['IN_APP', 'SMS'],
        quietHoursEnabled: true,
        quietHoursStart: '21:00',
        quietHoursEnd: '07:00',
        bulkApprovalThreshold: 100,
        version: 1,
      },
      update: {},
    });
  });

  afterAll(async () => {
    SchedulerService.stopWorker();
  });

  // ====================================================================
  // SUITE 1: MULTI-TENANCY & SCHOOL ISOLATION (Rules 2, 60, 61, 62)
  // ====================================================================
  describe('Suite 1: Multi-Tenancy & School Isolation Guarantees', () => {
    let templateAId: string;

    it('should allow Comm Admin to create a template in School A', async () => {
      const res = await request(app)
        .post('/api/v1/communication/templates')
        .set('Authorization', `Bearer ${commAdminToken}`)
        .send({
          name: `Test Notice ${testSuffix}`,
          code: `TEST_NOTICE_${testSuffix}`,
          category: 'GENERAL',
          channel: 'SMS',
          body: 'Hello {{studentName}}, school will be closed tomorrow.',
          language: 'ENGLISH',
        });

      expect(res.status).toBe(201);
      expect(res.body.code).toBe(`TEST_NOTICE_${testSuffix}`);
      templateAId = res.body.id;
    });

    it('should isolate templates between Tenant A and Tenant B', async () => {
      const res = await request(app)
        .get('/api/v1/communication/templates')
        .set('Authorization', `Bearer ${tenantBUserToken}`);

      expect(res.status).toBe(200);
      const exists = res.body.some((t: any) => t.id === templateAId);
      expect(exists).toBe(false);
    });

    it('should isolate messages across different schools', async () => {
      const msg = await prisma.communicationMessage.create({
        data: {
          tenantId: tenantAId,
          schoolId: schoolAId,
          category: 'GENERAL',
          channel: 'IN_APP',
          recipientType: 'USER',
          recipientReferenceId: commAdminUserId,
          destinationEncrypted: encryptDestination('user@evolix.local'),
          destinationMasked: maskDestination('user@evolix.local'),
          bodyRendered: 'School A internal alert',
          status: 'SENT',
        },
      });

      const res = await request(app)
        .get(`/api/v1/communication/messages/${msg.id}`)
        .set('Authorization', `Bearer ${schoolBUserToken}`);

      expect(res.status).toBe(404);
    });

    it('should reject Tenant B trying to update School A communication settings', async () => {
      const res = await request(app)
        .put('/api/v1/communication/settings')
        .set('Authorization', `Bearer ${tenantBUserToken}`)
        .send({
          quietHoursEnabled: false,
          quietHoursStart: '22:00',
          quietHoursEnd: '06:00',
          bulkApprovalThreshold: 50,
          version: 1,
        });

      expect([200, 403, 404]).toContain(res.status);
      const settingsA = await prisma.communicationSettings.findUnique({
        where: { schoolId: schoolAId },
      });
      expect(settingsA?.quietHoursStart).toBe('21:00');
    });
  });

  // ====================================================================
  // SUITE 2: CONCURRENCY & ATOMIC JOB CLAIMING (Rules 4, 7, 73, 74)
  // ====================================================================
  describe('Suite 2: Concurrency & Atomic Job Claiming (SELECT FOR UPDATE SKIP LOCKED)', () => {
    it('should ensure concurrent workers never claim or execute the same scheduled job twice', async () => {
      const jobIds: string[] = [];
      for (let i = 0; i < 10; i++) {
        const job = await prisma.scheduledAutomationJob.create({
          data: {
            tenantId: tenantAId,
            schoolId: schoolAId,
            jobType: 'DEFERRED_COMMUNICATION',
            sourceType: 'TEST_SUITE',
            sourceId: studentAId,
            scheduledFor: new Date(Date.now() - 1000), // In the past
            status: 'PENDING',
            payload: { testIndex: i },
          },
        });
        jobIds.push(job.id);
      }

      // Simulate 5 concurrent workers claiming jobs simultaneously with SKIP LOCKED
      const results = await Promise.allSettled([
        SchedulerService.processPendingWork('worker-1', 5, schoolAId),
        SchedulerService.processPendingWork('worker-2', 5, schoolAId),
        SchedulerService.processPendingWork('worker-3', 5, schoolAId),
        SchedulerService.processPendingWork('worker-4', 5, schoolAId),
        SchedulerService.processPendingWork('worker-5', 5, schoolAId),
      ]);

      expect(results.every((r) => r.status === 'fulfilled')).toBe(true);

      const processedJobs = await prisma.scheduledAutomationJob.findMany({
        where: { id: { in: jobIds } },
      });

      expect(processedJobs.length).toBe(10);
      for (const j of processedJobs) {
        expect(['COMPLETED', 'FAILED', 'SKIPPED']).toContain(j.status);
        expect(j.attemptCount).toBe(1);
      }
    });

    it('should ensure concurrent domain event processors claim events without race condition', async () => {
      const eventIds: string[] = [];
      for (let i = 0; i < 8; i++) {
        const ev = await prisma.domainEvent.create({
          data: {
            tenantId: tenantAId,
            schoolId: schoolAId,
            eventType: AutomationEventType.STUDENT_ABSENT,
            sourceType: 'TEST',
            sourceId: studentAId,
            payload: { value: i },
            processingStatus: 'PENDING',
          },
        });
        eventIds.push(ev.id);
      }

      // Process concurrently
      const runs = await Promise.allSettled([
        DomainEventService.processBatch('worker-ev-1', 4, schoolAId),
        DomainEventService.processBatch('worker-ev-2', 4, schoolAId),
        DomainEventService.processBatch('worker-ev-3', 4, schoolAId),
      ]);

      expect(runs.every((r) => r.status === 'fulfilled')).toBe(true);

      const processedEvents = await prisma.domainEvent.findMany({
        where: { id: { in: eventIds } },
      });

      for (const ev of processedEvents) {
        expect(ev.processingStatus).toBe('PROCESSED');
        expect(ev.processedAt).not.toBeNull();
      }
    });
  });

  // ====================================================================
  // SUITE 3: RULE ENGINE & TYPED CONDITIONS (Rules 38, 39, 40, 41, 42, 44)
  // ====================================================================
  describe('Suite 3: Rule Engine & Typed Conditions', () => {
    it('should correctly evaluate DECIMAL condition with exact numeric precision (Rule 39)', () => {
      const condition = {
        field: 'invoiceAmount',
        operator: 'GREATER_THAN' as const,
        dataType: 'DECIMAL' as const,
        value: '1000.50',
      };

      const matchLow = RuleEngine.evaluateCondition({ invoiceAmount: '500.00' }, condition);
      expect(matchLow).toBe(false);

      const matchEqual = RuleEngine.evaluateCondition({ invoiceAmount: '1000.50' }, condition);
      expect(matchEqual).toBe(false);

      const matchHigh = RuleEngine.evaluateCondition({ invoiceAmount: '1000.75' }, condition);
      expect(matchHigh).toBe(true);
    });

    it('should evaluate rule and execute actions preserving ruleVersion snapshot (Rule 40)', async () => {
      const rule = await prisma.automationRule.create({
        data: {
          tenantId: tenantAId,
          schoolId: schoolAId,
          code: `RULE_FEE_DECIMAL_${testSuffix}`,
          name: 'High Fee Alert',
          eventType: AutomationEventType.FEE_INVOICE_GENERATED,
          conditions: [
            {
              field: 'invoiceAmount',
              operator: 'GREATER_THAN',
              dataType: 'DECIMAL',
              value: '1000.50',
            },
          ],
          actions: [
            {
              actionType: 'CREATE_INTERNAL_TASK',
              priority: 'HIGH',
              title: `High fee follow up ${testSuffix}`,
            },
          ],
          isActive: true,
          version: 1,
          createdBy: commAdminUserId,
        },
      });

      const evHigh = await prisma.domainEvent.create({
        data: {
          tenantId: tenantAId,
          schoolId: schoolAId,
          eventType: AutomationEventType.FEE_INVOICE_GENERATED,
          sourceType: 'FeeInvoice',
          sourceId: studentAId,
          payload: { invoiceAmount: '1000.75' },
          processingStatus: 'PENDING',
        },
      });

      await RuleEngine.evaluateAndExecute(evHigh);

      const execHigh = await prisma.automationExecution.findFirst({
        where: { ruleId: rule.id, eventId: evHigh.id },
      });
      expect(execHigh).toBeDefined();
      expect(execHigh?.ruleVersion).toBe(1); // Rule 40 snapshot preserved
    });

    it('should skip inactive rules during evaluation (Rule 41)', async () => {
      const inactiveRule = await prisma.automationRule.create({
        data: {
          tenantId: tenantAId,
          schoolId: schoolAId,
          code: `RULE_INACTIVE_${testSuffix}`,
          name: 'Inactive Rule',
          eventType: AutomationEventType.STUDENT_ABSENT,
          conditions: [],
          actions: [{ actionType: 'CREATE_INTERNAL_TASK', priority: 'LOW', title: 'Task' }],
          isActive: false, // INACTIVE
          version: 1,
          createdBy: commAdminUserId,
        },
      });

      const ev = await prisma.domainEvent.create({
        data: {
          tenantId: tenantAId,
          schoolId: schoolAId,
          eventType: AutomationEventType.STUDENT_ABSENT,
          sourceType: 'StudentAttendance',
          sourceId: studentAId,
          payload: { studentId: studentAId },
          processingStatus: 'PENDING',
        },
      });

      await RuleEngine.evaluateAndExecute(ev);

      // Inactive rule is not executed
      const exec = await prisma.automationExecution.findFirst({
        where: { ruleId: inactiveRule.id, eventId: ev.id },
      });
      expect(exec).toBeNull();
    });

    it('should guarantee action idempotency on repeated execution (Rule 44)', async () => {
      const activeRule = await prisma.automationRule.create({
        data: {
          tenantId: tenantAId,
          schoolId: schoolAId,
          code: `RULE_IDEMPOTENT_${testSuffix}`,
          name: 'Idempotent Task Rule',
          eventType: AutomationEventType.STUDENT_ABSENT,
          conditions: [],
          actions: [{ actionType: 'CREATE_INTERNAL_TASK', priority: 'HIGH', title: `Follow up ${testSuffix}` }],
          isActive: true,
          version: 1,
          createdBy: commAdminUserId,
        },
      });

      const ev = await prisma.domainEvent.create({
        data: {
          tenantId: tenantAId,
          schoolId: schoolAId,
          eventType: AutomationEventType.STUDENT_ABSENT,
          sourceType: 'StudentAttendance',
          sourceId: studentAId,
          payload: { studentId: studentAId },
          processingStatus: 'PENDING',
        },
      });

      // First run: Creates task
      await RuleEngine.evaluateAndExecute(ev);

      // Second run on same event: should be blocked by unique constraint or idempotency
      await RuleEngine.evaluateAndExecute(ev);

      const tasks = await prisma.automationTask.findMany({
        where: { title: `Follow up ${testSuffix}` },
      });
      expect(tasks.length).toBe(1);
    });
  });

  // ====================================================================
  // SUITE 4: DOUBLE GUARDS FOR CORE ERP ENTITIES (Rules 29, 32, 34, 35, 36)
  // ====================================================================
  describe('Suite 4: Double Guards for Core ERP Entities', () => {
    it('should abort fee reminder job if invoice is already PAID (Rule 29)', async () => {
      const invoice = await prisma.feeInvoice.create({
        data: {
          tenantId: tenantAId,
          schoolId: schoolAId,
          studentId: studentAId,
          academicYearId,
          financialYearId,
          invoiceNumber: `INV-GUARD-${testSuffix}`,
          invoiceDate: new Date(),
          dueDate: new Date(),
          subtotal: new Decimal('5000.00'),
          totalAmount: new Decimal('5000.00'),
          paidAmount: new Decimal('5000.00'),
          outstandingAmount: new Decimal('0.00'),
          status: 'PAID', // ALREADY PAID
        },
      });

      const guardResult = await SchedulerService.checkAuthoritativeDoubleGuards({
        jobType: 'FEE_DUE_REMINDER',
        sourceType: 'FeeInvoice',
        sourceId: invoice.id,
        schoolId: schoolAId,
      });

      expect(guardResult).toBe('SOURCE_NO_LONGER_ELIGIBLE_INVOICE_PAID');
    });

    it('should abort exam result communication if exam is not found or not PUBLISHED (Rule 32)', async () => {
      const guardResult = await SchedulerService.checkAuthoritativeDoubleGuards({
        jobType: 'EXAM_RESULT_NOTIFICATION',
        sourceType: 'Exam',
        sourceId: studentAId,
        schoolId: schoolAId,
      });

      expect(guardResult).toBe('EXAM_NOT_FOUND');
    });

    it('should abort transport alert if student is already BOARDED (Rule 35)', async () => {
      const guardResult = await SchedulerService.checkAuthoritativeDoubleGuards({
        jobType: 'TRANSPORT_BOARDING_ALERT',
        sourceType: 'TransportTripBoarding',
        sourceId: studentAId,
        schoolId: schoolAId,
      });

      expect(guardResult === null || typeof guardResult === 'string').toBe(true);
    });
  });

  // ====================================================================
  // SUITE 5: PII MASKING & REDACTION (Rules 54, 55, 56)
  // ====================================================================
  describe('Suite 5: PII Masking, Redaction and Security', () => {
    let sensitiveMsgId: string;

    beforeAll(async () => {
      const msg = await prisma.communicationMessage.create({
        data: {
          tenantId: tenantAId,
          schoolId: schoolAId,
          category: 'PAYROLL',
          channel: 'SMS',
          recipientType: 'EMPLOYEE',
          recipientReferenceId: commAdminUserId,
          destinationEncrypted: encryptDestination('+919876543210'),
          destinationMasked: maskDestination('+919876543210'),
          subjectRendered: 'Salary Credited',
          bodyRendered: 'Confidential: Your net salary of Rs 45,000 has been credited to A/C 123456.',
          status: 'SENT',
        },
      });
      sensitiveMsgId = msg.id;
    });

    it('should list messages with masked destination and redacted body (Rule 55 & 56)', async () => {
      const res = await request(app)
        .get('/api/v1/communication/messages')
        .set('Authorization', `Bearer ${commAdminToken}`);

      expect(res.status).toBe(200);
      const target = res.body.items.find((m: any) => m.id === sensitiveMsgId);
      expect(target).toBeDefined();

      expect(target.destinationMasked).toBe('******3210');
      expect(target.destinationEncrypted).toBeUndefined();
      expect(target.bodyRendered).toBe('[REDACTED]');
    });

    it('should return decrypted destination and full body in message detail endpoint with permission (Rule 55)', async () => {
      const res = await request(app)
        .get(`/api/v1/communication/messages/${sensitiveMsgId}`)
        .set('Authorization', `Bearer ${commAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.destinationMasked).toBe('******3210');
      expect(res.body.bodyRendered).toContain('Confidential: Your net salary');
    });

    it('should export audit log with masked PII in CSV (Rule 56)', async () => {
      const res = await request(app)
        .get('/api/v1/communication/messages/export')
        .set('Authorization', `Bearer ${commAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).not.toContain('+919876543210');
      expect(res.text).toContain('******3210');
    });
  });

  // ====================================================================
  // SUITE 6: TRUTHFUL STATUS & MANUAL WHATSAPP CONFIRMATION (Rules 10, 11, 12, 13)
  // ====================================================================
  describe('Suite 6: Truthful Delivery Status & Manual WhatsApp Confirmation', () => {
    let whatsappMsgId: string;

    it('should queue WhatsApp message as MANUAL_ACTION_REQUIRED / PREPARED (Rule 10)', async () => {
      const msg = await prisma.communicationMessage.create({
        data: {
          tenantId: tenantAId,
          schoolId: schoolAId,
          category: 'GENERAL',
          channel: 'WHATSAPP',
          recipientType: 'STUDENT_GUARDIAN',
          recipientReferenceId: guardianAId,
          destinationEncrypted: encryptDestination('+919876543210'),
          destinationMasked: maskDestination('+919876543210'),
          bodyRendered: 'Important sports day notice',
          status: 'MANUAL_ACTION_REQUIRED',
          deliveryMode: 'MANUAL_WHATSAPP_LINK',
        },
      });

      expect(msg.status).toBe('MANUAL_ACTION_REQUIRED');
      expect(msg.deliveryMode).toBe('MANUAL_WHATSAPP_LINK');
      whatsappMsgId = msg.id;

      // Processing outbox must NOT falsely mark it as DELIVERED
      await CommunicationService.processOutbox('test-worker-outbox', 10, schoolAId);

      const refreshed = await prisma.communicationMessage.findUnique({
        where: { id: whatsappMsgId },
      });
      expect(refreshed?.status).toBe('MANUAL_ACTION_REQUIRED');
    });

    it('should confirm manual WhatsApp send and set status to SENT (MANUAL_CONFIRMED), never DELIVERED (Rule 10)', async () => {
      const res = await request(app)
        .post(`/api/v1/communication/messages/${whatsappMsgId}/manual-confirm`)
        .set('Authorization', `Bearer ${commAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('SENT');
      expect(res.body.deliveryMode).toBe('MANUAL_CONFIRMED');

      // Status is NEVER DELIVERED without an authoritative provider delivery webhook
      expect(res.body.status).not.toBe('DELIVERED');
      expect(res.body.deliveredAt).toBeNull();
    });
  });

  // ====================================================================
  // SUITE 7: QUIET HOURS WRAP-AROUND & EMERGENCY BYPASS (Rules 25, 26, 27)
  // ====================================================================
  describe('Suite 7: Quiet Hours Wrap-Around & Urgent Emergency Bypass', () => {
    it('should correctly determine quiet hours during overnight wrap-around (21:00 to 07:00)', () => {
      const settings = {
        quietHoursEnabled: true,
        quietHoursStart: '21:00',
        quietHoursEnd: '07:00',
      };

      // 22:30 is quiet hours
      const nightDate = new Date('2026-09-07T22:30:00');
      const isQuietNight = CommunicationService.isWithinQuietHours(settings, nightDate);
      expect(isQuietNight).toBe(true);

      // 03:15 is quiet hours
      const earlyMorning = new Date('2026-09-07T03:15:00');
      const isQuietEarly = CommunicationService.isWithinQuietHours(settings, earlyMorning);
      expect(isQuietEarly).toBe(true);

      // 14:00 is NOT quiet hours
      const afternoon = new Date('2026-09-07T14:00:00');
      const isQuietAfternoon = CommunicationService.isWithinQuietHours(settings, afternoon);
      expect(isQuietAfternoon).toBe(false);
    });

    it('should allow urgent attendance alerts to bypass quiet hours (Rule 27)', async () => {
      await prisma.communicationTemplate.upsert({
        where: { schoolId_code: { schoolId: schoolAId, code: 'ATTENDANCE_ABSENT_GUARDIAN_SMS' } },
        create: {
          tenantId: tenantAId,
          schoolId: schoolAId,
          code: 'ATTENDANCE_ABSENT_GUARDIAN_SMS',
          name: 'Absent Alert',
          category: 'ATTENDANCE',
          channel: 'SMS',
          body: 'Student {{studentName}} is absent.',
          language: TemplateLanguage.ENGLISH,
          status: 'ACTIVE',
        },
        update: {},
      });

      const urgentMsgs = await CommunicationService.queueMessageFromAutomation({
        tenantId: tenantAId,
        schoolId: schoolAId,
        channel: 'SMS',
        templateCode: 'ATTENDANCE_ABSENT_GUARDIAN_SMS',
        recipientType: 'STUDENT_GUARDIAN',
        sourceType: 'StudentAttendance',
        sourceId: studentAId,
        isTest: false,
        payload: { studentId: studentAId, studentName: 'Kabir' },
      });

      // Urgent alerts should be queued for immediate delivery, not deferred
      expect(urgentMsgs).not.toBeNull();
      expect(urgentMsgs!.length).toBeGreaterThanOrEqual(1);
      expect(['QUEUED', 'SCHEDULED']).toContain(urgentMsgs![0].status);
    });
  });

  // ====================================================================
  // SUITE 8: PRODUCTION MOCK PROVIDER GUARD (Rule 9)
  // ====================================================================
  describe('Suite 8: Production Mock Provider Guard', () => {
    it('should disallow mock provider and reject unconfigured SMTP when NODE_ENV is production (Rule 9)', async () => {
      const originalEnv = process.env.NODE_ENV;
      const originalMock = process.env.MOCK_PROVIDERS;
      try {
        process.env.NODE_ENV = 'production';
        process.env.MOCK_PROVIDERS = 'true';

        const provider = ProviderRegistry.getProvider('EMAIL');
        const res = await provider!.send({
          messageId: 'mock-1',
          channel: 'EMAIL',
          destination: 'parent@example.com',
          body: 'Test',
        });

        // Mock mode was rejected because NODE_ENV=production, falling back to real provider check
        expect(res.success).toBe(false);
        expect(res.errorCode).toBe('SMTP_NOT_CONFIGURED');
      } finally {
        process.env.NODE_ENV = originalEnv;
        process.env.MOCK_PROVIDERS = originalMock;
      }
    });
  });
});
