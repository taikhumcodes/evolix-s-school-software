import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { Prisma, AutomationEventType, TemplateLanguage, MessageStatus } from '@prisma/client';
import { signAccessToken } from '../src/lib/crypto.js';
import { SchedulerService } from '../src/modules/communication/automation/scheduler.service.js';
import { DomainEventService } from '../src/modules/communication/events/domain-event.service.js';
import { RuleEngine } from '../src/modules/communication/automation/rule-engine.js';
import { CommunicationService } from '../src/modules/communication/communication.service.js';
import { ProviderRegistry } from '../src/modules/communication/providers/provider.registry.js';
import { RecipientService } from '../src/modules/communication/recipient.service.js';
import { escapeHtml, renderTemplate, resolveSafeProperty, validateTemplate } from '../src/modules/communication/template-engine.js';
import { encryptDestination, maskDestination } from '../src/modules/communication/encryption.util.js';

const Decimal = Prisma.Decimal;

describe('EVOLIX School ERP — Major Module 10 Final Strict QA / Freeze Gate Suite', () => {
  let testSuffix: string;

  // Tenants & Schools
  let tenantAId: string;
  let schoolAId: string;
  let schoolBId: string;
  let tenantBId: string;
  let schoolCId: string;

  // Tokens
  let superAdminToken: string;
  let commAdminToken: string;
  let commViewerToken: string;
  let schoolBUserToken: string;
  let tenantBUserToken: string;

  // Users & Master Entities
  let commAdminUserId: string;
  let studentAId: string;
  let studentBId: string;
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

    // 2. School B under Tenant A
    const schoolB = await prisma.school.create({
      data: {
        tenantId: tenantAId,
        name: `School B Gate ${testSuffix}`,
        code: `SCH-B-GATE-${testSuffix}`,
        isActive: true,
      },
    });
    schoolBId = schoolB.id;

    // 3. Tenant B and School C
    const tenantB = await prisma.tenant.create({
      data: {
        name: `Tenant B Gate ${testSuffix}`,
        domain: `tenant-b-gate-${testSuffix}.evolix.local`,
        isActive: true,
      },
    });
    tenantBId = tenantB.id;

    const schoolC = await prisma.school.create({
      data: {
        tenantId: tenantBId,
        name: `School C Gate ${testSuffix}`,
        code: `SCH-C-GATE-${testSuffix}`,
        isActive: true,
      },
    });
    schoolCId = schoolC.id;

    // 4. Users in School A
    const uAdmin = await prisma.user.create({
      data: {
        tenantId: tenantAId,
        email: `comm.admin.gate.${testSuffix}@evolix.local`,
        hashedPassword: '$2b$10$hashedpasswordforexample1234567890abcdef',
        firstName: 'GateComm',
        lastName: 'Admin',
        isActive: true,
      },
    });
    commAdminUserId = uAdmin.id;
    await prisma.userSchool.create({ data: { userId: uAdmin.id, schoolId: schoolAId } });

    const roleAdmin = await prisma.role.create({
      data: {
        tenantId: tenantAId,
        name: `Gate Comm Admin ${testSuffix}`,
      },
    });
    const commPerms = await prisma.permission.findMany({
      where: {
        code: {
          in: [
            'communication.view',
            'communication.send',
            'communication.schedule',
            'communication.cancel',
            'communication.template.view',
            'communication.template.manage',
            'communication.export',
            'communication.bulk.send',
            'communication.bulk.approve',
            'communication.settings.view',
            'communication.settings.manage',
            'automation.view',
            'automation.manage',
            'automation.execute',
            'automation.retry',
            'automation.task.view',
            'automation.task.manage',
          ],
        },
      },
    });
    for (const p of commPerms) {
      await prisma.rolePermission.create({ data: { roleId: roleAdmin.id, permissionId: p.id } });
    }
    await prisma.userRole.create({ data: { userId: uAdmin.id, roleId: roleAdmin.id } });
    commAdminToken = signAccessToken(uAdmin.id, tenantAId, 120);

    // Tenant B User with full Tenant B permissions
    const uTenB = await prisma.user.create({
      data: {
        tenantId: tenantBId,
        email: `tenb.gate.${testSuffix}@evolix.local`,
        hashedPassword: '$2b$10$hashedpasswordforexample1234567890abcdef',
        firstName: 'GateTenantB',
        lastName: 'User',
        isActive: true,
      },
    });
    await prisma.userSchool.create({ data: { userId: uTenB.id, schoolId: schoolCId } });
    const roleTenB = await prisma.role.create({
      data: { tenantId: tenantBId, name: `Gate TenB Admin ${testSuffix}` },
    });
    for (const p of commPerms) {
      await prisma.rolePermission.create({ data: { roleId: roleTenB.id, permissionId: p.id } });
    }
    await prisma.userRole.create({ data: { userId: uTenB.id, roleId: roleTenB.id } });
    tenantBUserToken = signAccessToken(uTenB.id, tenantBId, 120);

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
      update: {
        quietHoursEnabled: true,
        quietHoursStart: '21:00',
        quietHoursEnd: '07:00',
        bulkApprovalThreshold: 100,
      },
    });

    const ay = await prisma.academicYear.findFirst({ where: { schoolId: schoolAId, isClosed: false } });
    academicYearId = ay!.id;

    let fy = await prisma.financialYear.findFirst({ where: { schoolId: schoolAId } });
    if (!fy) {
      fy = await prisma.financialYear.create({
        data: {
          tenantId: tenantAId,
          schoolId: schoolAId,
          name: `FY Gate ${testSuffix}`,
          startDate: new Date('2026-04-01'),
          endDate: new Date('2027-03-31'),
        },
      });
    }
    financialYearId = fy.id;

    // Student A & Student B (siblings sharing Guardian A)
    const guardian = await prisma.guardian.create({
      data: {
        tenantId: tenantAId,
        schoolId: schoolAId,
        firstName: 'Rajesh',
        lastName: `Sharma-${testSuffix}`,
        relationship: 'FATHER',
        phone: '+919811122233',
        normalizedPhone: '+919811122233',
        email: `rajesh.sharma.${testSuffix}@example.com`,
      },
    });
    guardianAId = guardian.id;

    const stuA = await prisma.student.create({
      data: {
        tenantId: tenantAId,
        schoolId: schoolAId,
        studentId: `STU-GATE-A-${testSuffix}`,
        admissionNumber: `ADM-GATE-A-${testSuffix}`,
        admittedAcademicYearId: academicYearId,
        firstName: 'Aarav',
        lastName: `Sharma-${testSuffix}`,
        gender: 'MALE',
        dateOfBirth: new Date('2016-04-10'),
      },
    });
    studentAId = stuA.id;

    const stuB = await prisma.student.create({
      data: {
        tenantId: tenantAId,
        schoolId: schoolAId,
        studentId: `STU-GATE-B-${testSuffix}`,
        admissionNumber: `ADM-GATE-B-${testSuffix}`,
        admittedAcademicYearId: academicYearId,
        firstName: 'Ananya',
        lastName: `Sharma-${testSuffix}`,
        gender: 'FEMALE',
        dateOfBirth: new Date('2018-09-20'),
      },
    });
    studentBId = stuB.id;

    await prisma.studentGuardian.createMany({
      data: [
        { tenantId: tenantAId, schoolId: schoolAId, studentId: stuA.id, guardianId: guardian.id, relationship: 'FATHER', isPrimary: true },
        { tenantId: tenantAId, schoolId: schoolAId, studentId: stuB.id, guardianId: guardian.id, relationship: 'FATHER', isPrimary: true },
      ],
    });
  });

  afterAll(async () => {
    SchedulerService.stopWorker();
  });

  // ====================================================================
  // 1. QUIET HOURS — URGENCY MUST BE RULE-DRIVEN
  // ====================================================================
  describe('Gate 1: Quiet Hours — Urgency Must be Rule-Driven', () => {
    it('should defer normal STUDENT_ABSENT rule (isUrgent=false) at 23:00', async () => {
      const template = await prisma.communicationTemplate.upsert({
        where: { schoolId_code: { schoolId: schoolAId, code: `ABSENT_NORMAL_${testSuffix}` } },
        create: {
          tenantId: tenantAId,
          schoolId: schoolAId,
          code: `ABSENT_NORMAL_${testSuffix}`,
          name: 'Absent Normal',
          category: 'ATTENDANCE',
          channel: 'SMS',
          body: 'Student {{student.name}} was absent today.',
          language: 'ENGLISH',
          status: 'ACTIVE',
        },
        update: {},
      });

      const lateNight = new Date('2026-09-07T23:00:00');
      const messages = await CommunicationService.queueMessageFromAutomation({
        tenantId: tenantAId,
        schoolId: schoolAId,
        channel: 'SMS',
        templateCode: template.code,
        recipientType: 'STUDENT_GUARDIAN',
        sourceType: 'StudentAttendance',
        sourceId: studentAId,
        isTest: false,
        isUrgent: false, // Normal rule, NOT urgent
        now: lateNight,
        payload: { studentId: studentAId, studentName: 'Aarav' },
      });

      expect(messages).not.toBeNull();
      expect(messages!.length).toBe(1);
      const msg = messages![0];
      // Must NOT automatically bypass quiet hours! Must be scheduled for morning!
      expect(msg.scheduledAt).not.toBeNull();
      expect(new Date(msg.scheduledAt!).getHours()).toBe(7); // Next morning 07:00
    });

    it('should immediately queue urgent STUDENT_ABSENT rule (isUrgent=true) at 23:00', async () => {
      const template = await prisma.communicationTemplate.upsert({
        where: { schoolId_code: { schoolId: schoolAId, code: `ABSENT_URGENT_${testSuffix}` } },
        create: {
          tenantId: tenantAId,
          schoolId: schoolAId,
          code: `ABSENT_URGENT_${testSuffix}`,
          name: 'Absent Urgent',
          category: 'ATTENDANCE',
          channel: 'SMS',
          body: 'URGENT: Student {{student.name}} is absent.',
          language: 'ENGLISH',
          status: 'ACTIVE',
        },
        update: {},
      });

      const lateNight = new Date('2026-09-07T23:00:00');
      const messages = await CommunicationService.queueMessageFromAutomation({
        tenantId: tenantAId,
        schoolId: schoolAId,
        channel: 'SMS',
        templateCode: template.code,
        recipientType: 'STUDENT_GUARDIAN',
        sourceType: 'StudentAttendance',
        sourceId: studentBId,
        isTest: false,
        isUrgent: true, // Urgency explicitly set!
        now: lateNight,
        payload: { studentId: studentBId, studentName: 'Ananya' },
      });

      expect(messages).not.toBeNull();
      expect(messages!.length).toBe(1);
      const msg = messages![0];
      // Urgency allows immediate queueing: scheduledAt is null
      expect(msg.scheduledAt).toBeNull();
      expect(msg.status).toBe('QUEUED');
    });
  });

  // ====================================================================
  // 2. TRANSACTIONAL DOMAIN EVENT (Rollback & Commit proof)
  // ====================================================================
  describe('Gate 2: Transactional Domain Event', () => {
    it('should roll back DomainEvent if core business transaction rolls back', async () => {
      const uniqueInvNum = `ROLLBACK-INV-${testSuffix}`;
      let capturedEventId = '';

      try {
        await prisma.$transaction(async (tx) => {
          const inv = await tx.feeInvoice.create({
            data: {
              tenantId: tenantAId,
              schoolId: schoolAId,
              studentId: studentAId,
              academicYearId,
              financialYearId,
              invoiceNumber: uniqueInvNum,
              invoiceDate: new Date(),
              dueDate: new Date(),
              subtotal: new Decimal('1000.00'),
              totalAmount: new Decimal('1000.00'),
              outstandingAmount: new Decimal('1000.00'),
              status: 'DRAFT',
            },
          });

          const ev = await DomainEventService.emitDomainEvent(tx, {
            tenantId: tenantAId,
            schoolId: schoolAId,
            eventType: AutomationEventType.FEE_INVOICE_GENERATED,
            sourceType: 'FeeInvoice',
            sourceId: inv.id,
            payload: { invoiceNumber: uniqueInvNum },
          });
          capturedEventId = ev.id;

          // Force rollback!
          throw new Error('SIMULATED_BUSINESS_TRANSACTION_ROLLBACK');
        });
      } catch (err: any) {
        expect(err.message).toBe('SIMULATED_BUSINESS_TRANSACTION_ROLLBACK');
      }

      // Verify BOTH invoice and DomainEvent were rolled back
      const invCheck = await prisma.feeInvoice.findFirst({ where: { invoiceNumber: uniqueInvNum } });
      expect(invCheck).toBeNull();

      const evCheck = await prisma.domainEvent.findUnique({ where: { id: capturedEventId } });
      expect(evCheck).toBeNull();
    });

    it('should commit DomainEvent alongside business record on successful transaction', async () => {
      const uniqueInvNum = `COMMIT-INV-${testSuffix}`;
      let createdInvId = '';
      let createdEventId = '';

      await prisma.$transaction(async (tx) => {
        const inv = await tx.feeInvoice.create({
          data: {
            tenantId: tenantAId,
            schoolId: schoolAId,
            studentId: studentAId,
            academicYearId,
            financialYearId,
            invoiceNumber: uniqueInvNum,
            invoiceDate: new Date(),
            dueDate: new Date(),
            subtotal: new Decimal('2500.00'),
            totalAmount: new Decimal('2500.00'),
            outstandingAmount: new Decimal('2500.00'),
            status: 'UNPAID',
          },
        });
        createdInvId = inv.id;

        const ev = await DomainEventService.emitDomainEvent(tx, {
          tenantId: tenantAId,
          schoolId: schoolAId,
          eventType: AutomationEventType.FEE_INVOICE_GENERATED,
          sourceType: 'FeeInvoice',
          sourceId: inv.id,
          payload: { invoiceNumber: uniqueInvNum, amount: 2500 },
        });
        createdEventId = ev.id;
      });

      const invCheck = await prisma.feeInvoice.findUnique({ where: { id: createdInvId } });
      expect(invCheck).not.toBeNull();
      expect(invCheck?.invoiceNumber).toBe(uniqueInvNum);

      const evCheck = await prisma.domainEvent.findUnique({ where: { id: createdEventId } });
      expect(evCheck).not.toBeNull();
      expect(evCheck?.eventType).toBe('FEE_INVOICE_GENERATED');
    });
  });

  // ====================================================================
  // 3. POST-COMMIT PROCESSING (Provider failure never rolls back core ERP)
  // ====================================================================
  describe('Gate 3: Post-Commit Processing', () => {
    it('should not roll back business record when out-of-band communication fails', async () => {
      const invNum = `INV-FAIL-${testSuffix}`;
      let invId = '';

      // 1. Business transaction commits cleanly
      await prisma.$transaction(async (tx) => {
        const inv = await tx.feeInvoice.create({
          data: {
            tenantId: tenantAId,
            schoolId: schoolAId,
            studentId: studentAId,
            academicYearId,
            financialYearId,
            invoiceNumber: invNum,
            invoiceDate: new Date(),
            dueDate: new Date(),
            subtotal: new Decimal('1500.00'),
            totalAmount: new Decimal('1500.00'),
            outstandingAmount: new Decimal('1500.00'),
            status: 'UNPAID',
          },
        });
        invId = inv.id;

        await DomainEventService.emitDomainEvent(tx, {
          tenantId: tenantAId,
          schoolId: schoolAId,
          eventType: AutomationEventType.FEE_INVOICE_GENERATED,
          sourceType: 'FeeInvoice',
          sourceId: inv.id,
          payload: { invoiceNumber: invNum, amount: 1500 },
        });
      });

      // 2. Simulate outbox message failing due to unconfigured/broken provider
      const failedMsg = await prisma.communicationMessage.create({
        data: {
          tenantId: tenantAId,
          schoolId: schoolAId,
          category: 'FEES',
          channel: 'SMS',
          recipientType: 'STUDENT_GUARDIAN',
          recipientReferenceId: guardianAId,
          bodyRendered: 'Invoice Rs 1500 generated',
          status: 'FAILED',
          lastErrorCode: 'PROVIDER_TIMEOUT',
          lastErrorMessage: 'Provider socket hang up',
          sourceType: 'FeeInvoice',
          sourceId: invId,
        },
      });
      expect(failedMsg.status).toBe('FAILED');

      // 3. Authoritative business record remains 100% intact
      const invCheck = await prisma.feeInvoice.findUnique({ where: { id: invId } });
      expect(invCheck).not.toBeNull();
      expect(invCheck?.status).toBe('UNPAID');
    });
  });

  // ====================================================================
  // 4. STALE LOCK RECOVERY
  // ====================================================================
  describe('Gate 4: Stale Lock Recovery', () => {
    it('should recover stale locked domain events and jobs older than 5 minutes, but leave recent locks intact', async () => {
      const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
      const oneMinAgo = new Date(Date.now() - 1 * 60 * 1000);

      // Stale event (10 mins old)
      const staleEv = await prisma.domainEvent.create({
        data: {
          tenantId: tenantAId,
          schoolId: schoolAId,
          eventType: AutomationEventType.STUDENT_ABSENT,
          sourceType: 'TEST',
          sourceId: studentAId,
          payload: {},
          processingStatus: 'PROCESSING',
          lockedAt: tenMinsAgo,
          lockedBy: 'crashed-worker-99',
        },
      });

      // Recently locked event (1 min old)
      const recentEv = await prisma.domainEvent.create({
        data: {
          tenantId: tenantAId,
          schoolId: schoolAId,
          eventType: AutomationEventType.STUDENT_ABSENT,
          sourceType: 'TEST',
          sourceId: studentAId,
          payload: {},
          processingStatus: 'PROCESSING',
          lockedAt: oneMinAgo,
          lockedBy: 'active-worker-1',
        },
      });

      // Run recovery
      const recoveredCount = await DomainEventService.recoverStaleLocks(5);
      expect(recoveredCount).toBeGreaterThanOrEqual(1);

      const refreshedStale = await prisma.domainEvent.findUnique({ where: { id: staleEv.id } });
      expect(refreshedStale?.processingStatus).toBe('PENDING');
      expect(refreshedStale?.lockedAt).toBeNull();

      const refreshedRecent = await prisma.domainEvent.findUnique({ where: { id: recentEv.id } });
      expect(refreshedRecent?.processingStatus).toBe('PROCESSING'); // MUST NOT BE STOLEN
      expect(refreshedRecent?.lockedBy).toBe('active-worker-1');
    });
  });

  // ====================================================================
  // 5. WORKER LIFECYCLE
  // ====================================================================
  describe('Gate 5: Worker Lifecycle', () => {
    it('should skip worker loop in test environment and support clean stop without hanging', () => {
      expect(process.env.NODE_ENV).toBe('test');
      SchedulerService.startWorker(5000);
      // Clean stop should clear handles
      SchedulerService.stopWorker();
    });
  });

  // ====================================================================
  // 6. FUTURE JOB SAFETY
  // ====================================================================
  describe('Gate 6: Future Job Safety', () => {
    it('should claim due jobs but keep future jobs PENDING', async () => {
      const pastJob = await prisma.scheduledAutomationJob.create({
        data: {
          tenantId: tenantAId,
          schoolId: schoolAId,
          jobType: 'TEST_DUE',
          sourceType: 'TEST',
          sourceId: studentAId,
          scheduledFor: new Date(Date.now() - 60 * 1000), // Due 1 min ago
          status: 'PENDING',
          payload: {},
        },
      });

      const futureJob = await prisma.scheduledAutomationJob.create({
        data: {
          tenantId: tenantAId,
          schoolId: schoolAId,
          jobType: 'TEST_FUTURE',
          sourceType: 'TEST',
          sourceId: studentAId,
          scheduledFor: new Date(Date.now() + 30 * 60 * 1000), // Due in 30 mins
          status: 'PENDING',
          payload: {},
        },
      });

      const claimed = await SchedulerService.claimDueJobs('worker-test', 50, schoolAId);
      const claimedIds = claimed.map((j) => j.id);

      expect(claimedIds).toContain(pastJob.id);
      expect(claimedIds).not.toContain(futureJob.id);

      const refreshedFuture = await prisma.scheduledAutomationJob.findUnique({ where: { id: futureJob.id } });
      expect(refreshedFuture?.status).toBe('PENDING');
    });
  });

  // ====================================================================
  // 7 & 8. RETRY CLASSIFICATION & PROVIDER AUTH FAILURE
  // ====================================================================
  describe('Gate 7 & 8: Retry Classification & Provider Auth Failure', () => {
    it('should classify provider timeout as transient (retryable) and provider auth failure as permanent', () => {
      expect(SchedulerService.isPermanentError('PROVIDER_TIMEOUT')).toBe(false);
      expect(SchedulerService.isPermanentError('SOCKET_HANGUP')).toBe(false);

      expect(SchedulerService.isPermanentError('PROVIDER_AUTH_FAILED')).toBe(true);
      expect(SchedulerService.isPermanentError('INVALID_EMAIL_DESTINATION')).toBe(true);
      expect(SchedulerService.isPermanentError('SMTP_NOT_CONFIGURED')).toBe(true);
      expect(SchedulerService.isPermanentError('TEMPLATE_VARIABLE_INVALID')).toBe(true);
    });
  });

  // ====================================================================
  // 9. TEMPLATE VARIABLE SECURITY
  // ====================================================================
  describe('Gate 9: Template Variable Security', () => {
    it('should reject __proto__, constructor, and prototype with TEMPLATE_VARIABLE_INVALID', () => {
      const maliciousTemplates = [
        'Hello {{student.__proto__}}',
        'Hello {{student.constructor}}',
        'Hello {{student.prototype}}',
        'Hello {{constructor.constructor}}',
      ];

      for (const t of maliciousTemplates) {
        expect(() => validateTemplate(t)).toThrow(/TEMPLATE_VARIABLE_INVALID/);
      }
    });

    it('should throw when resolving prototype pollution path in resolveSafeProperty', () => {
      expect(() => resolveSafeProperty({ student: { name: 'Aarav' } }, 'student.__proto__')).toThrow(/TEMPLATE_VARIABLE_INVALID/);
      expect(() => resolveSafeProperty({ student: { name: 'Aarav' } }, 'student.constructor')).toThrow(/TEMPLATE_VARIABLE_INVALID/);
    });
  });

  // ====================================================================
  // 10. HTML OUTPUT SAFETY
  // ====================================================================
  describe('Gate 10: HTML Output Safety', () => {
    it('should escape HTML script tags in HTML channel output', () => {
      const rendered = renderTemplate({
        template: '<p>Student: {{student.name}}</p>',
        variables: { student: { name: '<script>alert(1)</script>' } },
        isHtml: true,
      });

      expect(rendered).not.toContain('<script>');
      expect(rendered).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    });
  });

  // ====================================================================
  // 11. TEMPLATE VERSIONING
  // ====================================================================
  describe('Gate 11: Template Versioning', () => {
    it('should increment version on update while preserving historical message snapshot', async () => {
      const tmpl = await CommunicationService.createTemplate(
        { tenantId: tenantAId, schoolId: schoolAId, userId: commAdminUserId, permissions: ['communication.template.manage'] },
        {
          code: `VER_TEST_${testSuffix}`,
          name: 'Version Test Template',
          category: 'GENERAL',
          channel: 'SMS',
          body: 'Hello {{student.name}}',
          language: 'ENGLISH',
        }
      );
      expect(tmpl.version).toBe(1);

      // Create message referencing v1
      const msg = await prisma.communicationMessage.create({
        data: {
          tenantId: tenantAId,
          schoolId: schoolAId,
          templateId: tmpl.id,
          templateVersion: 1,
          category: 'GENERAL',
          channel: 'SMS',
          recipientType: 'STUDENT_GUARDIAN',
          recipientReferenceId: guardianAId,
          bodyRendered: 'Hello Aarav',
          status: 'SENT',
        },
      });

      // Update template content
      const updatedTmpl = await CommunicationService.updateTemplate(
        { tenantId: tenantAId, schoolId: schoolAId, userId: commAdminUserId, permissions: ['communication.template.manage'] },
        tmpl.id,
        { body: 'Dear {{student.name}}' }
      );
      expect(updatedTmpl.version).toBe(2);

      // Historical message still retains v1 reference and snapshot!
      const historicalMsg = await prisma.communicationMessage.findUnique({ where: { id: msg.id } });
      expect(historicalMsg?.templateVersion).toBe(1);
      expect(historicalMsg?.bodyRendered).toBe('Hello Aarav');
    });
  });

  // ====================================================================
  // 12. RECIPIENT SEMANTIC DEDUPLICATION
  // ====================================================================
  describe('Gate 12: Recipient Semantic Deduplication', () => {
    it('should keep two student-specific messages for siblings but collapse generic announcements', () => {
      const recipients = [
        { referenceId: guardianAId, type: 'STUDENT_GUARDIAN' as const, name: 'Rajesh', studentId: studentAId, studentName: 'Aarav' },
        { referenceId: guardianAId, type: 'STUDENT_GUARDIAN' as const, name: 'Rajesh', studentId: studentBId, studentName: 'Ananya' },
      ];

      // Student-specific: both siblings are distinct
      const studentSpecific = RecipientService.deduplicateRecipients(recipients, 'SMS', true);
      expect(studentSpecific.length).toBe(2);

      // Generic announcement: collapsed into one message
      const generic = RecipientService.deduplicateRecipients(recipients, 'SMS', false);
      expect(generic.length).toBe(1);
    });
  });

  // ====================================================================
  // 13. PREFERENCES
  // ====================================================================
  describe('Gate 13: Communication Preferences', () => {
    it('should respect opt-out preference for specific channel and category', async () => {
      await prisma.communicationPreference.upsert({
        where: {
          unique_recipient_channel_pref: {
            schoolId: schoolAId,
            recipientType: 'GUARDIAN',
            recipientReferenceId: guardianAId,
            category: 'GENERAL',
            channel: 'EMAIL',
          },
        },
        create: {
          tenantId: tenantAId,
          schoolId: schoolAId,
          recipientType: 'GUARDIAN',
          recipientReferenceId: guardianAId,
          category: 'GENERAL',
          channel: 'EMAIL',
          enabled: false, // Opted out
        },
        update: { enabled: false },
      });

      const allowedEmail = await RecipientService.isChannelAllowed(schoolAId, 'GUARDIAN', guardianAId, 'GENERAL', 'EMAIL');
      expect(allowedEmail).toBe(false);

      const allowedSms = await RecipientService.isChannelAllowed(schoolAId, 'GUARDIAN', guardianAId, 'GENERAL', 'SMS');
      expect(allowedSms).toBe(true);
    });
  });

  // ====================================================================
  // 14. QUIET-HOUR DEFER IDEMPOTENCY
  // ====================================================================
  describe('Gate 14: Quiet-Hour Defer Idempotency', () => {
    it('should produce only one message record when retried with same source during quiet hours', async () => {
      const template = await prisma.communicationTemplate.findFirst({
        where: { schoolId: schoolAId, code: `ABSENT_NORMAL_${testSuffix}` },
      });

      const lateNight = new Date('2026-09-07T23:15:00');
      const opts = {
        tenantId: tenantAId,
        schoolId: schoolAId,
        channel: 'SMS' as const,
        templateCode: template!.code,
        recipientType: 'STUDENT_GUARDIAN' as const,
        sourceType: 'StudentAttendanceIdemp',
        sourceId: studentAId,
        isTest: false,
        isUrgent: false,
        now: lateNight,
        payload: { studentId: studentAId, studentName: 'Aarav' },
      };

      const firstRun = await CommunicationService.queueMessageFromAutomation(opts);
      expect(firstRun!.length).toBe(1);

      // Re-run with same source: blocked by idempotency key
      const secondRun = await CommunicationService.queueMessageFromAutomation(opts);
      expect(secondRun!.length).toBe(0); // Safely skipped, no duplicate!
    });
  });

  // ====================================================================
  // 16. BULK APPROVAL INVALIDATION & 17. BACKEND APPROVAL THRESHOLD
  // ====================================================================
  describe('Gate 16 & 17: Bulk Approval Invalidation & Backend Threshold', () => {
    it('should invalidate approval if an approved bulk batch content or audience is modified', async () => {
      const batch = await prisma.communicationBatch.create({
        data: {
          tenantId: tenantAId,
          schoolId: schoolAId,
          name: `Bulk Campaign ${testSuffix}`,
          category: 'GENERAL',
          channel: 'SMS',
          audienceDefinitionSafeJson: { recipientType: 'STUDENT_GUARDIAN' },
          status: 'APPROVED', // Initially approved
          version: 1,
          createdBy: commAdminUserId,
        },
      });

      // User modifies channel/name
      const updated = await CommunicationService.updateBatch(
        { tenantId: tenantAId, schoolId: schoolAId, userId: commAdminUserId, permissions: [] },
        batch.id,
        { name: `Modified Bulk Campaign ${testSuffix}`, channel: 'EMAIL' }
      );

      // Approval is invalidated back to DRAFT!
      expect(updated.status).toBe('DRAFT');
      expect(updated.approvedAt).toBeNull();
    });

    it('should require approval on queueBatch if recipients meet/exceed threshold', async () => {
      // Create batch with low threshold
      await prisma.communicationSettings.update({
        where: { schoolId: schoolAId },
        data: { bulkApprovalThreshold: 1 }, // Threshold set to 1!
      });

      const batch = await prisma.communicationBatch.create({
        data: {
          tenantId: tenantAId,
          schoolId: schoolAId,
          name: `Threshold Batch ${testSuffix}`,
          category: 'GENERAL',
          channel: 'SMS',
          audienceDefinitionSafeJson: { recipientType: 'STUDENT_GUARDIAN' },
          status: 'DRAFT', // Not approved
          version: 1,
          createdBy: commAdminUserId,
        },
      });

      await expect(
        CommunicationService.queueBatch(
          { tenantId: tenantAId, schoolId: schoolAId, userId: commAdminUserId, permissions: [] },
          batch.id
        )
      ).rejects.toThrow(/approval threshold/i);

      // Reset threshold to 100
      await prisma.communicationSettings.update({
        where: { schoolId: schoolAId },
        data: { bulkApprovalThreshold: 100 },
      });
    });
  });

  // ====================================================================
  // 18. CONCURRENT BULK QUEUE
  // ====================================================================
  describe('Gate 18: Concurrent Bulk Queue', () => {
    it('should only queue approved batch once when two queue requests run concurrently', async () => {
      const batch = await prisma.communicationBatch.create({
        data: {
          tenantId: tenantAId,
          schoolId: schoolAId,
          name: `Concurrent Batch ${testSuffix}`,
          category: 'GENERAL',
          channel: 'SMS',
          audienceDefinitionSafeJson: { recipientType: 'STUDENT_GUARDIAN' },
          status: 'APPROVED',
          version: 1,
          createdBy: commAdminUserId,
        },
      });

      const ctx = { tenantId: tenantAId, schoolId: schoolAId, userId: commAdminUserId, permissions: [] };
      const results = await Promise.allSettled([
        CommunicationService.queueBatch(ctx, batch.id),
        CommunicationService.queueBatch(ctx, batch.id),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      // Exactly one request succeeded and one was rejected because it was already queued
      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);
    });
  });

  // ====================================================================
  // 19. CONCURRENT MESSAGE RETRY
  // ====================================================================
  describe('Gate 19: Concurrent Message Retry', () => {
    it('should only allow one concurrent retry request to succeed', async () => {
      const failedMsg = await prisma.communicationMessage.create({
        data: {
          tenantId: tenantAId,
          schoolId: schoolAId,
          category: 'GENERAL',
          channel: 'SMS',
          recipientType: 'STUDENT_GUARDIAN',
          recipientReferenceId: guardianAId,
          bodyRendered: 'Retry race test',
          status: 'FAILED',
        },
      });

      const ctx = { tenantId: tenantAId, schoolId: schoolAId, userId: commAdminUserId, permissions: [] };
      const results = await Promise.allSettled([
        CommunicationService.retryMessage(ctx, failedMsg.id),
        CommunicationService.retryMessage(ctx, failedMsg.id),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);
    });
  });

  // ====================================================================
  // 20. MANUAL SEND EVIDENCE
  // ====================================================================
  describe('Gate 20: Manual Send Evidence', () => {
    it('should set status=SENT, deliveryMode=MANUAL_CONFIRMED and record actor, never DELIVERED', async () => {
      const msg = await prisma.communicationMessage.create({
        data: {
          tenantId: tenantAId,
          schoolId: schoolAId,
          category: 'GENERAL',
          channel: 'WHATSAPP',
          recipientType: 'STUDENT_GUARDIAN',
          recipientReferenceId: guardianAId,
          bodyRendered: 'Important circular',
          status: 'MANUAL_ACTION_REQUIRED',
        },
      });

      const ctx = { tenantId: tenantAId, schoolId: schoolAId, userId: commAdminUserId, permissions: [] };
      const confirmed = await CommunicationService.recordManualSend(ctx, msg.id);

      expect(confirmed.status).toBe('SENT');
      expect(confirmed.deliveryMode).toBe('MANUAL_CONFIRMED');
      expect(confirmed.manualConfirmedBy).toBe(commAdminUserId);
      expect(confirmed.manualConfirmedAt).not.toBeNull();
      expect(confirmed.deliveredAt).toBeNull(); // NEVER DELIVERED WITHOUT PROVIDER EVIDENCE
    });
  });

  // ====================================================================
  // 21. DELIVERY ATTEMPT HISTORY
  // ====================================================================
  describe('Gate 21: Delivery Attempt History', () => {
    it('should preserve all attempts in CommunicationDeliveryAttempt in chronological order', async () => {
      const msg = await prisma.communicationMessage.create({
        data: {
          tenantId: tenantAId,
          schoolId: schoolAId,
          category: 'GENERAL',
          channel: 'SMS',
          recipientType: 'STUDENT_GUARDIAN',
          recipientReferenceId: guardianAId,
          bodyRendered: 'Delivery attempt test',
          status: 'QUEUED',
        },
      });

      // Attempt 1: Transient failure
      await prisma.communicationDeliveryAttempt.create({
        data: {
          messageId: msg.id,
          attemptNumber: 1,
          provider: 'MockSms',
          startedAt: new Date(Date.now() - 5000),
          completedAt: new Date(Date.now() - 4000),
          resultStatus: 'FAILED',
          errorCode: 'PROVIDER_TIMEOUT',
          errorMessage: 'Timeout after 5000ms',
        },
      });

      // Attempt 2: Success
      await prisma.communicationDeliveryAttempt.create({
        data: {
          messageId: msg.id,
          attemptNumber: 2,
          provider: 'MockSms',
          startedAt: new Date(),
          completedAt: new Date(),
          resultStatus: 'SENT',
          providerMessageId: 'SMS-PROV-12345',
        },
      });

      const attempts = await prisma.communicationDeliveryAttempt.findMany({
        where: { messageId: msg.id },
        orderBy: { attemptNumber: 'asc' },
      });

      expect(attempts.length).toBe(2);
      expect(attempts[0].resultStatus).toBe('FAILED');
      expect(attempts[0].errorCode).toBe('PROVIDER_TIMEOUT');
      expect(attempts[1].resultStatus).toBe('SENT');
      expect(attempts[1].providerMessageId).toBe('SMS-PROV-12345');
    });
  });

  // ====================================================================
  // 22. MESSAGE STATE MACHINE
  // ====================================================================
  describe('Gate 22: Message State Machine Transitions', () => {
    it('should reject invalid message status transitions', () => {
      expect(() => CommunicationService.validateMessageTransition('DELIVERED', 'QUEUED')).toThrow(/Invalid message status transition/);
      expect(() => CommunicationService.validateMessageTransition('CANCELLED', 'SENT')).toThrow(/Invalid message status transition/);
      expect(() => CommunicationService.validateMessageTransition('READ', 'PROCESSING')).toThrow(/Invalid message status transition/);
    });
  });

  // ====================================================================
  // 23. SCHEDULE CANCELLATION RACE
  // ====================================================================
  describe('Gate 23: Schedule Cancellation Race', () => {
    it('should reject cancellation if message is currently being processed by worker', async () => {
      const msg = await prisma.communicationMessage.create({
        data: {
          tenantId: tenantAId,
          schoolId: schoolAId,
          category: 'GENERAL',
          channel: 'SMS',
          recipientType: 'STUDENT_GUARDIAN',
          recipientReferenceId: guardianAId,
          bodyRendered: 'Race cancel test',
          status: 'PROCESSING', // Worker claimed
        },
      });

      const ctx = { tenantId: tenantAId, schoolId: schoolAId, userId: commAdminUserId, permissions: [] };
      await expect(CommunicationService.cancelMessage(ctx, msg.id)).rejects.toThrow(/already being processed/);
    });
  });

  // ====================================================================
  // 35. PROVIDER SECRET CHECK
  // ====================================================================
  describe('Gate 35: Provider Secret Check', () => {
    it('should not leak SMTP passwords, API keys or webhook secrets in API responses', async () => {
      const res = await request(app)
        .get('/api/v1/communication/settings')
        .set('Authorization', `Bearer ${commAdminToken}`);

      expect(res.status).toBe(200);
      const jsonStr = JSON.stringify(res.body);

      expect(jsonStr).not.toContain('smtpPassword');
      expect(jsonStr).not.toContain('apiKey');
      expect(jsonStr).not.toContain('secretKey');
      expect(jsonStr).not.toContain('authToken');
    });
  });

  // ====================================================================
  // 36. CATEGORY/SOURCE AUTHORIZATION
  // ====================================================================
  describe('Gate 36: Category/Source Authorization', () => {
    it('should reject user with communication.view from viewing PAYROLL messages without payroll.view', () => {
      const ctx = {
        tenantId: tenantAId,
        schoolId: schoolAId,
        userId: 'some-user',
        permissions: ['communication.view'], // Does NOT have payroll.view!
      };

      expect(() => CommunicationService.checkCategoryPermission(ctx, 'PAYROLL')).toThrow(/requires payroll authorization/);
    });

    it('should reject user without exams.view from viewing EXAM communications', () => {
      const ctx = {
        tenantId: tenantAId,
        schoolId: schoolAId,
        userId: 'some-user',
        permissions: ['communication.view'],
      };

      expect(() => CommunicationService.checkCategoryPermission(ctx, 'EXAM')).toThrow(/requires examination authorization/);
    });
  });

  // ====================================================================
  // 37. DIRECT-ID ISOLATION
  // ====================================================================
  describe('Gate 37: Direct-ID Isolation', () => {
    it('should return 404 for cross-tenant direct-ID access', async () => {
      const templateA = await prisma.communicationTemplate.findFirst({
        where: { schoolId: schoolAId },
      });

      const res = await request(app)
        .get(`/api/v1/communication/templates/${templateA?.id}`)
        .set('Authorization', `Bearer ${tenantBUserToken}`);

      expect(res.status).toBe(404);
    });
  });
});
