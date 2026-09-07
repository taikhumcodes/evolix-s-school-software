import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { signAccessToken } from '../src/lib/crypto.js';
import { TemplateLayoutEngine } from '../src/modules/documents/template-layout.engine.js';
import { PdfRendererService } from '../src/modules/documents/pdf-renderer.service.js';
import { DocumentsService } from '../src/modules/documents/documents.service.js';

describe('EVOLIX School ERP — Major Module 11 Documents, Certificates & Printing Strict QA Suite', () => {
  let testSuffix: string;

  // Tenants & Schools
  let tenantAId: string;
  let schoolAId: string;
  let schoolBId: string; // Same tenant A, different school
  let tenantBId: string; // Different tenant
  let schoolCId: string;

  // Auth Tokens
  let superAdminToken: string;
  let docAdminToken: string;
  let docViewerToken: string;
  let noPermToken: string;
  let tenantBToken: string;

  // Test Entities
  let docAdminUserId: string;
  let studentAId: string;
  let employeeAId: string;
  let paymentAId: string;
  let examPublishedId: string;
  let examDraftId: string;
  let transportRouteAId: string;
  let visitorVisitAId: string;
  let testTemplateAId: string;
  let reportCardTemplateId: string;

  beforeAll(async () => {
    testSuffix = Date.now().toString().slice(-6);

    // 1. Superadmin Login
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
        name: `School B Documents QA ${testSuffix}`,
        code: `SCH-B-DOC-${testSuffix}`,
        isActive: true,
      },
    });
    schoolBId = schoolB.id;

    // 3. Tenant B and School C (for multi-tenant isolation tests)
    const tenantB = await prisma.tenant.create({
      data: {
        name: `Tenant B Documents QA ${testSuffix}`,
        domain: `tenant-b-doc-${testSuffix}.evolix.local`,
        isActive: true,
      },
    });
    tenantBId = tenantB.id;

    const schoolC = await prisma.school.create({
      data: {
        tenantId: tenantBId,
        name: `School C Documents QA ${testSuffix}`,
        code: `SCH-C-DOC-${testSuffix}`,
        isActive: true,
      },
    });
    schoolCId = schoolC.id;

    // 4. Create scoped users
    // Doc Admin User with full document permissions
    const docAdminUser = await prisma.user.create({
      data: {
        tenantId: tenantAId,
        email: `docadmin_${testSuffix}@evolix.local`,
        hashedPassword: 'HashedPassword123!',
        firstName: 'Doc',
        lastName: 'Admin',
        isActive: true,
      },
    });
    docAdminUserId = docAdminUser.id;

    const docAdminRole = await prisma.role.create({
      data: {
        tenantId: tenantAId,
        name: `Document Admin Role ${testSuffix}`,
        isSystem: false,
      },
    });

    const docPermCodes = [
      'documents.templates.view',
      'documents.templates.manage',
      'documents.generate',
      'documents.finalize',
      'documents.reprint',
      'documents.cancel',
      'documents.bulk.manage',
      'documents.branding.manage',
      'documents.verify.view',
      'documents.export',
      'documents.salary_cert.generate',
      'payroll.view',
    ];
    const perms = await prisma.permission.findMany({
      where: { code: { in: docPermCodes } },
    });
    for (const p of perms) {
      await prisma.rolePermission.create({
        data: { roleId: docAdminRole.id, permissionId: p.id },
      });
    }

    await prisma.userRole.create({
      data: { userId: docAdminUser.id, roleId: docAdminRole.id },
    });
    await prisma.userSchool.create({
      data: { userId: docAdminUser.id, schoolId: schoolAId },
    });

    docAdminToken = signAccessToken(docAdminUser.id, tenantAId);

    // Doc Viewer (view permissions only)
    const docViewerUser = await prisma.user.create({
      data: {
        tenantId: tenantAId,
        email: `docviewer_${testSuffix}@evolix.local`,
        hashedPassword: 'HashedPassword123!',
        firstName: 'Doc',
        lastName: 'Viewer',
        isActive: true,
      },
    });

    const viewerRole = await prisma.role.create({
      data: {
        tenantId: tenantAId,
        name: `Viewer Role ${testSuffix}`,
        isSystem: false,
      },
    });
    const viewerPerms = await prisma.permission.findMany({
      where: { code: { in: ['documents.templates.view', 'documents.verify.view'] } },
    });
    for (const p of viewerPerms) {
      await prisma.rolePermission.create({
        data: { roleId: viewerRole.id, permissionId: p.id },
      });
    }
    await prisma.userRole.create({
      data: { userId: docViewerUser.id, roleId: viewerRole.id },
    });
    await prisma.userSchool.create({
      data: { userId: docViewerUser.id, schoolId: schoolAId },
    });

    docViewerToken = signAccessToken(docViewerUser.id, tenantAId);

    // No Perm User
    const noPermUser = await prisma.user.create({
      data: {
        tenantId: tenantAId,
        email: `noperm_${testSuffix}@evolix.local`,
        hashedPassword: 'HashedPassword123!',
        firstName: 'No',
        lastName: 'Perm',
        isActive: true,
      },
    });
    await prisma.userSchool.create({
      data: { userId: noPermUser.id, schoolId: schoolAId },
    });

    noPermToken = signAccessToken(noPermUser.id, tenantAId);

    // Tenant B User
    const tenantBUser = await prisma.user.create({
      data: {
        tenantId: tenantBId,
        email: `tenantb_${testSuffix}@evolix.local`,
        hashedPassword: 'HashedPassword123!',
        firstName: 'TenantB',
        lastName: 'Admin',
        isActive: true,
      },
    });

    const tenantBRole = await prisma.role.create({
      data: {
        tenantId: tenantBId,
        name: `Tenant B Admin Role ${testSuffix}`,
        isSystem: false,
      },
    });
    for (const p of perms) {
      await prisma.rolePermission.create({
        data: { roleId: tenantBRole.id, permissionId: p.id },
      });
    }
    await prisma.userRole.create({
      data: { userId: tenantBUser.id, roleId: tenantBRole.id },
    });
    await prisma.userSchool.create({
      data: { userId: tenantBUser.id, schoolId: schoolCId },
    });

    tenantBToken = signAccessToken(tenantBUser.id, tenantBId);

    // 5. Seed Test Master Data
    // Student A
    const academicYear = await prisma.academicYear.findFirst({
      where: { schoolId: schoolAId },
    });
    const studentA = await prisma.student.create({
      data: {
        tenantId: tenantAId,
        schoolId: schoolAId,
        studentId: `STU-QA-${testSuffix}`,
        admissionNumber: `ADM-QA-${testSuffix}`,
        firstName: 'Aarav',
        lastName: 'Sharma',
        gender: 'MALE',
        dateOfBirth: new Date('2012-05-15'),
        status: 'ACTIVE',
        admittedAcademicYearId: academicYear!.id,
      },
    });
    studentAId = studentA.id;

    // Guardian
    const guardianA = await prisma.guardian.create({
      data: {
        tenantId: tenantAId,
        schoolId: schoolAId,
        firstName: 'Rajesh',
        lastName: 'Sharma',
        relationship: 'FATHER',
        phone: '+919876543210',
        normalizedPhone: '+919876543210',
      },
    });
    await prisma.studentGuardian.create({
      data: {
        tenantId: tenantAId,
        schoolId: schoolAId,
        studentId: studentA.id,
        guardianId: guardianA.id,
        relationship: 'FATHER',
        isPrimary: true,
        isEmergencyContact: true,
      },
    });

    // Employee A
    const employeeA = await prisma.employee.create({
      data: {
        tenantId: tenantAId,
        schoolId: schoolAId,
        employeeNumber: `EMP-QA-${testSuffix}`,
        firstName: 'Sunita',
        lastName: 'Patel',
        displayName: 'Sunita Patel',
        phone: '+919876500000',
        email: `sunita_${testSuffix}@evolix.local`,
        joiningDate: new Date('2020-06-01'),
        status: 'ACTIVE',
      },
    });
    employeeAId = employeeA.id;

    // Financial Account & Fee Payment
    const account = await prisma.account.findFirst({
      where: { schoolId: schoolAId },
    });
    const finYear = await prisma.financialYear.findFirst({
      where: { schoolId: schoolAId },
    });
    const paymentA = await prisma.feePayment.create({
      data: {
        tenantId: tenantAId,
        schoolId: schoolAId,
        studentId: studentA.id,
        financialYearId: finYear!.id,
        receiptNumber: `RCPT-QA-${testSuffix}`,
        paymentDate: new Date(),
        totalAmount: 15000,
        allocatedAmount: 15000,
        paymentMethod: 'UPI',
        receivingAccountId: account!.id,
        receivedByUserId: docAdminUserId,
        status: 'POSTED',
      },
    });
    paymentAId = paymentA.id;

    // Exams: one PUBLISHED, one DRAFT
    const examPub = await prisma.exam.create({
      data: {
        tenantId: tenantAId,
        schoolId: schoolAId,
        academicYearId: academicYear!.id,
        name: `Final Term Exam ${testSuffix}`,
        code: `EX-PUB-${testSuffix}`,
        startDate: new Date(),
        endDate: new Date(),
        status: 'PUBLISHED',
      },
    });
    examPublishedId = examPub.id;

    const examDraft = await prisma.exam.create({
      data: {
        tenantId: tenantAId,
        schoolId: schoolAId,
        academicYearId: academicYear!.id,
        name: `Draft Mid Term ${testSuffix}`,
        code: `EX-DFT-${testSuffix}`,
        startDate: new Date(),
        endDate: new Date(),
        status: 'DRAFT',
      },
    });
    examDraftId = examDraft.id;

    const classMaster = await prisma.classMaster.findFirst({
      where: { schoolId: schoolAId },
    });
    const subjectMaster = await prisma.subjectMaster.findFirst({
      where: { schoolId: schoolAId },
    });
    if (classMaster && subjectMaster) {
      await prisma.studentEnrollment.create({
        data: {
          tenantId: tenantAId,
          schoolId: schoolAId,
          studentId: studentA.id,
          classId: classMaster.id,
          academicYearId: academicYear!.id,
          status: 'ACTIVE',
          rollNumber: '101',
        },
      });

      await prisma.studentExamMark.create({
        data: {
          tenantId: tenantAId,
          schoolId: schoolAId,
          examId: examPub.id,
          studentId: studentA.id,
          classId: classMaster.id,
          subjectId: subjectMaster.id,
          status: 'PRESENT',
          finalMarks: 95,
          grade: 'A',
          enteredByUserId: docAdminUserId,
        },
      });

      await prisma.studentExamMark.create({
        data: {
          tenantId: tenantAId,
          schoolId: schoolAId,
          examId: examDraft.id,
          studentId: studentA.id,
          classId: classMaster.id,
          subjectId: subjectMaster.id,
          status: 'PRESENT',
          finalMarks: 78,
          grade: 'B',
          enteredByUserId: docAdminUserId,
        },
      });
    }

    const reportCardTemplate = await prisma.documentTemplate.create({
      data: {
        tenantId: tenantAId,
        schoolId: schoolAId,
        code: `QA_REPORT_CARD_${testSuffix}`,
        name: 'QA Academic Report Card',
        documentType: 'REPORT_CARD',
        category: 'ACADEMIC',
        pageSize: 'A4',
        orientation: 'PORTRAIT',
        status: 'PUBLISHED',
        createdBy: docAdminUserId,
        versions: {
          create: {
            versionNumber: 1,
            layoutDefinition: {
              margins: { top: 30, bottom: 30, left: 30, right: 30 },
              elements: [
                { id: 't', type: 'TEXT', content: '{{school.name}} - Report Card' },
                { id: 's', type: 'TEXT', content: 'Student: {{student.fullName}}' },
                {
                  id: 'tbl',
                  type: 'TABLE',
                  source: 'result.subjects',
                  columns: [
                    { header: 'Sub', key: 'subjectName', width: 200 },
                    { header: 'Marks', key: 'marksObtained', width: 100 },
                  ],
                },
              ],
            },
            pageSettings: {
              numberingPolicy: 'NUMBER_SERIES_ON_FINALIZE',
              numberSeriesCode: 'DOC_BONAFIDE',
            },
            isPublished: true,
            createdBy: docAdminUserId,
          },
        },
      },
    });
    reportCardTemplateId = reportCardTemplate.id;

    // Transport Route
    const routeA = await prisma.transportRoute.create({
      data: {
        tenantId: tenantAId,
        schoolId: schoolAId,
        routeCode: `RT-QA-${testSuffix}`,
        routeName: `Route North ${testSuffix}`,
        startLocation: 'Main Campus',
        endLocation: 'North Sector',
        status: 'ACTIVE',
      },
    });
    transportRouteAId = routeA.id;

    // Visitor Visit
    const visitorA = await prisma.visitor.create({
      data: {
        tenantId: tenantAId,
        schoolId: schoolAId,
        name: 'Vikram Mehta',
        phone: '+919876511111',
      },
    });
    const visitA = await prisma.visitorVisit.create({
      data: {
        tenantId: tenantAId,
        schoolId: schoolAId,
        visitorId: visitorA.id,
        visitNumber: `VIS-QA-${testSuffix}`,
        purpose: 'Vendor Meeting',
        checkInAt: new Date(),
        checkedInByUserId: docAdminUserId,
        status: 'CHECKED_IN',
      },
    });
    visitorVisitAId = visitA.id;
  });

  afterAll(async () => {
    // Cleanup storage files created during test run
    const testStorageDir = path.resolve(process.cwd(), `uploads/documents/${tenantAId}`);
    if (fs.existsSync(testStorageDir)) {
      try {
        fs.rmSync(testStorageDir, { recursive: true, force: true });
      } catch (e) {
        // ignore
      }
    }
  });

  // =========================================================================
  // SUITE 1: TEMPLATE MANAGEMENT & VERSIONING
  // =========================================================================
  describe('Suite 1: Template Management & Versioning', () => {
    it('should create a new document template with initial published version', async () => {
      const res = await request(app)
        .post('/api/v1/documents/templates')
        .set('Authorization', `Bearer ${docAdminToken}`)
        .send({
          code: `QA_BONAFIDE_${testSuffix}`,
          name: 'QA Custom Bonafide Certificate',
          documentType: 'BONAFIDE_CERTIFICATE',
          category: 'STUDENT',
          pageSize: 'A4',
          orientation: 'PORTRAIT',
          numberingPolicy: 'NUMBER_SERIES_ON_FINALIZE',
          numberSeriesCode: 'DOC_BONAFIDE',
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.code).toBe(`QA_BONAFIDE_${testSuffix}`);
      expect(res.body.versions).toHaveLength(1);
      expect(res.body.versions[0].versionNumber).toBe(1);
      expect(res.body.versions[0].isPublished).toBe(true);

      testTemplateAId = res.body.id;
    });

    it('should forbid duplicate template codes within the same school', async () => {
      const res = await request(app)
        .post('/api/v1/documents/templates')
        .set('Authorization', `Bearer ${docAdminToken}`)
        .send({
          code: `QA_BONAFIDE_${testSuffix}`,
          name: 'Duplicate Code Template',
          documentType: 'BONAFIDE_CERTIFICATE',
          category: 'STUDENT',
        });

      expect(res.status).toBe(500); // Unique constraint violation caught
    });

    it('should create a new version v2 without mutating v1', async () => {
      const res = await request(app)
        .post(`/api/v1/documents/templates/${testTemplateAId}/versions`)
        .set('Authorization', `Bearer ${docAdminToken}`)
        .send({
          layoutDefinition: {
            margins: { top: 40, bottom: 40, left: 40, right: 40 },
            elements: [
              {
                id: 'header_v2',
                type: 'TEXT',
                content: '{{school.name}} - Version 2 Layout',
                style: { fontSize: 22, bold: true, alignment: 'center' },
              },
              {
                id: 'body_v2',
                type: 'PARAGRAPH',
                content: 'Updated bonafide certificate text for {{student.fullName}}.',
                style: { marginTop: 25, fontSize: 12 },
              },
            ],
          },
          changeSummary: 'Added custom header styling',
          isPublished: false,
        });

      expect(res.status).toBe(201);
      expect(res.body.versionNumber).toBe(2);
      expect(res.body.isPublished).toBe(false);

      // Verify v1 is still published and unchanged
      const templateRes = await request(app)
        .get(`/api/v1/documents/templates/${testTemplateAId}`)
        .set('Authorization', `Bearer ${docAdminToken}`);

      expect(templateRes.body.versions).toHaveLength(2);
      const v1 = templateRes.body.versions.find((v: any) => v.versionNumber === 1);
      expect(v1.isPublished).toBe(true);
    });

    it('should publish version v2 and update template active version', async () => {
      const versions = await prisma.documentTemplateVersion.findMany({
        where: { templateId: testTemplateAId },
      });
      const v2 = versions.find((v) => v.versionNumber === 2);
      expect(v2).toBeDefined();

      const res = await request(app)
        .post(`/api/v1/documents/templates/${testTemplateAId}/versions/${v2!.id}/publish`)
        .set('Authorization', `Bearer ${docAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.currentVersionId).toBe(v2!.id);
      expect(res.body.status).toBe('PUBLISHED');
    });
  });

  // =========================================================================
  // SUITE 2: SAFE DATA VARIABLE MAPPING & FORMATTERS
  // =========================================================================
  describe('Suite 2: Safe Data Variable Mapping & Formatters', () => {
    it('should interpolate variable expressions and apply uppercase, lowercase, and capitalize filters', () => {
      const data = {
        student: { firstName: 'aarav', lastName: 'sharma' },
      };

      const upper = TemplateLayoutEngine.interpolateString('{{student.firstName | uppercase}}', data);
      expect(upper).toBe('AARAV');

      const lower = TemplateLayoutEngine.interpolateString('{{student.firstName | lowercase}}', data);
      expect(lower).toBe('aarav');

      const cap = TemplateLayoutEngine.interpolateString('{{student.firstName | capitalize}}', data);
      expect(cap).toBe('Aarav');
    });

    it('should correctly format currency and dates', () => {
      const data = {
        amount: 25400.5,
        issueDate: '2026-09-07T10:30:00Z',
      };

      const curr = TemplateLayoutEngine.interpolateString('{{amount | currency:₹}}', data);
      expect(curr).toContain('₹');
      expect(curr).toContain('25,400.50');

      const dateDef = TemplateLayoutEngine.interpolateString('{{issueDate | date}}', data);
      expect(dateDef).toMatch(/\d{2}\/\d{2}\/\d{4}/);

      const dateIso = TemplateLayoutEngine.interpolateString('{{issueDate | date:YYYY-MM-DD}}', data);
      expect(dateIso).toBe('2026-09-07');
    });

    it('should reject prototype pollution attempts via path traversal', () => {
      const data = { student: { name: 'Valid' } };

      const protoVal = TemplateLayoutEngine.getSafeValue(data, '__proto__.polluted');
      expect(protoVal).toBeUndefined();

      const constrVal = TemplateLayoutEngine.getSafeValue(data, 'constructor.prototype');
      expect(constrVal).toBeUndefined();
    });

    it('should safely evaluate conditions without eval() or Function()', () => {
      const data = {
        student: { isActive: true, score: 85 },
      };

      expect(TemplateLayoutEngine.evaluateCondition('{{student.isActive}}', data)).toBe(true);
      expect(TemplateLayoutEngine.evaluateCondition('!{{student.isActive}}', data)).toBe(false);
      expect(TemplateLayoutEngine.evaluateCondition('{{student.score}} >= 80', data)).toBe(true);
      expect(TemplateLayoutEngine.evaluateCondition('{{student.score}} < 50', data)).toBe(false);
    });
  });

  // =========================================================================
  // SUITE 3: LAYOUT ENGINE & SSRF PROTECTION
  // =========================================================================
  describe('Suite 3: Layout Engine & SSRF Protection', () => {
    it('should block external URLs (http/https/file) in image and signature sources', () => {
      expect(() => {
        TemplateLayoutEngine.validateLayout({
          margins: { top: 20, bottom: 20, left: 20, right: 20 },
          elements: [
            {
              id: 'ssrf_img',
              type: 'IMAGE',
              source: 'http://169.254.169.254/latest/meta-data/',
            },
          ],
        });
      }).toThrow(/Insecure image source rejected/);

      expect(() => {
        TemplateLayoutEngine.validateLayout({
          margins: { top: 20, bottom: 20, left: 20, right: 20 },
          elements: [
            {
              id: 'ssrf_file',
              type: 'SIGNATURE',
              source: 'file:///etc/passwd',
            },
          ],
        });
      }).toThrow(/Insecure image source rejected/);
    });

    it('should enforce resource limit on maximum elements (<= 500)', () => {
      const tooManyElements: any[] = [];
      for (let i = 0; i < 505; i++) {
        tooManyElements.push({ id: `el_${i}`, type: 'TEXT', content: `Text ${i}` });
      }

      expect(() => {
        TemplateLayoutEngine.validateLayout({
          margins: { top: 20, bottom: 20, left: 20, right: 20 },
          elements: tooManyElements,
        });
      }).toThrow();
    });
  });

  // =========================================================================
  // SUITE 4: PREVIEW VS FINALIZATION & NUMBERING POLICY
  // =========================================================================
  describe('Suite 4: Preview vs Finalization & Numbering Policy', () => {
    it('should generate document preview without assigning official sequence or mutating database', async () => {
      const countBefore = await prisma.generatedDocument.count({
        where: { schoolId: schoolAId },
      });

      const res = await request(app)
        .post('/api/v1/documents/preview')
        .set('Authorization', `Bearer ${docAdminToken}`)
        .send({
          templateId: testTemplateAId,
          sourceType: 'STUDENT',
          sourceId: studentAId,
        });

      expect(res.status).toBe(200);
      expect(res.body.pageCount).toBeGreaterThanOrEqual(1);
      expect(res.body.checksumSha256).toBeDefined();
      expect(res.body.dataSnapshot.document.number).toBe('PREVIEW-DRAFT');

      const countAfter = await prisma.generatedDocument.count({
        where: { schoolId: schoolAId },
      });
      expect(countAfter).toBe(countBefore); // Zero DB mutation on preview
    });

    it('should generate draft document with status DRAFT and allocate official number ONLY on finalize', async () => {
      // 1. Generate Draft
      const genRes = await request(app)
        .post('/api/v1/documents/generate')
        .set('Authorization', `Bearer ${docAdminToken}`)
        .send({
          templateId: testTemplateAId,
          sourceType: 'STUDENT',
          sourceId: studentAId,
          options: {
            autoFinalize: false,
          },
        });

      expect(genRes.status).toBe(201);
      expect(genRes.body.status).toBe('DRAFT');
      expect(genRes.body.documentNumber).toBeNull(); // No official number assigned for draft

      const draftDocId = genRes.body.id;

      // 2. Finalize Document
      const finRes = await request(app)
        .post(`/api/v1/documents/${draftDocId}/finalize`)
        .set('Authorization', `Bearer ${docAdminToken}`);

      expect(finRes.status).toBe(200);
      expect(finRes.body.status).toBe('FINALIZED');
      expect(finRes.body.documentNumber).toMatch(/^BON-\d{4}-\d{5}$/); // Allocated via NumberSeries!
      expect(finRes.body.verificationTokenHash).toBeDefined();
      expect(finRes.body.checksumSha256).toBeDefined();
      expect(finRes.body.storageKey).toBeDefined();
    });

    it('should strictly reuse Module 07 receiptNumber for FEE_RECEIPT under SOURCE_NUMBER policy', async () => {
      const feeTemplate = await prisma.documentTemplate.findFirst({
        where: { schoolId: schoolAId, documentType: 'FEE_RECEIPT' },
      });
      expect(feeTemplate).toBeDefined();

      const genRes = await request(app)
        .post('/api/v1/documents/generate')
        .set('Authorization', `Bearer ${docAdminToken}`)
        .send({
          templateId: feeTemplate!.id,
          sourceType: 'FEE_PAYMENT',
          sourceId: paymentAId,
          options: {
            autoFinalize: true,
          },
        });

      expect(genRes.status).toBe(201);
      expect(genRes.body.status).toBe('FINALIZED');
      expect(genRes.body.numberingPolicy).toBe('SOURCE_NUMBER');
      // Must exactly equal Module 07 receiptNumber!
      expect(genRes.body.documentNumber).toBe(`RCPT-QA-${testSuffix}`);
    });

    it('should strictly reuse Module 09 visitNumber for VISITOR_PASS under SOURCE_NUMBER policy', async () => {
      const visitorTemplate = await prisma.documentTemplate.findFirst({
        where: { schoolId: schoolAId, documentType: 'VISITOR_PASS' },
      });
      expect(visitorTemplate).toBeDefined();

      const genRes = await request(app)
        .post('/api/v1/documents/generate')
        .set('Authorization', `Bearer ${docAdminToken}`)
        .send({
          templateId: visitorTemplate!.id,
          sourceType: 'VISITOR_VISIT',
          sourceId: visitorVisitAId,
          options: {
            autoFinalize: true,
          },
        });

      expect(genRes.status).toBe(201);
      expect(genRes.body.status).toBe('FINALIZED');
      expect(genRes.body.numberingPolicy).toBe('SOURCE_NUMBER');
      expect(genRes.body.documentNumber).toBe(`VIS-QA-${testSuffix}`);
    });
  });

  // =========================================================================
  // SUITE 5: BYTE-IMMUTABLE STORAGE & REPRINT IDEMPOTENCY
  // =========================================================================
  describe('Suite 5: Byte-Immutable Storage & Reprint Idempotency', () => {
    let finalizedDocId: string;
    let initialChecksum: string;
    let initialBytes: Buffer;

    beforeAll(async () => {
      const doc = await DocumentsService.generateDocument(tenantAId, schoolAId, docAdminUserId, {
        templateId: testTemplateAId,
        sourceType: 'STUDENT',
        sourceId: studentAId,
        language: 'en',
        options: { autoFinalize: true },
      });
      finalizedDocId = doc.id;
      initialChecksum = doc.checksumSha256!;
      initialBytes = fs.readFileSync(doc.storageKey!);
    });

    it('should return exact stored PDF bytes and identical SHA-256 checksum on reprint', async () => {
      const reprintRes = await request(app)
        .get(`/api/v1/documents/${finalizedDocId}/reprint`)
        .set('Authorization', `Bearer ${docAdminToken}`);

      expect(reprintRes.status).toBe(200);
      expect(reprintRes.header['content-type']).toBe('application/pdf');
      expect(reprintRes.header['x-checksum-sha256']).toBe(initialChecksum);

      const returnedBytes = reprintRes.body;
      const returnedChecksum = crypto.createHash('sha256').update(returnedBytes).digest('hex');
      expect(returnedChecksum).toBe(initialChecksum);
    });

    it('should increment reprintCount and log REPRINTED in DocumentActionLog', async () => {
      const docBefore = await prisma.generatedDocument.findUnique({
        where: { id: finalizedDocId },
      });
      const countBefore = docBefore!.reprintCount;

      await request(app)
        .get(`/api/v1/documents/${finalizedDocId}/download`)
        .set('Authorization', `Bearer ${docAdminToken}`);

      const docAfter = await prisma.generatedDocument.findUnique({
        where: { id: finalizedDocId },
      });
      expect(docAfter!.reprintCount).toBe(countBefore + 1);

      const log = await prisma.documentActionLog.findFirst({
        where: { documentId: finalizedDocId },
        orderBy: { createdAt: 'desc' },
      });
      expect(log).toBeDefined();
      expect(['DOWNLOADED', 'REPRINTED']).toContain(log!.action);
    });
  });

  // =========================================================================
  // SUITE 6: CANCELLATION & SUPERSEDING
  // =========================================================================
  describe('Suite 6: Cancellation & Superseding', () => {
    let cancelTargetDocId: string;
    let initialCancelChecksum: string;
    let supersedeTargetDocId: string;

    beforeAll(async () => {
      const doc1 = await DocumentsService.generateDocument(tenantAId, schoolAId, docAdminUserId, {
        templateId: testTemplateAId,
        sourceType: 'STUDENT',
        sourceId: studentAId,
        language: 'en',
        options: { autoFinalize: true },
      });
      cancelTargetDocId = doc1.id;
      initialCancelChecksum = doc1.checksumSha256!;

      const doc2 = await DocumentsService.generateDocument(tenantAId, schoolAId, docAdminUserId, {
        templateId: testTemplateAId,
        sourceType: 'STUDENT',
        sourceId: studentAId,
        language: 'en',
        options: { autoFinalize: true },
      });
      supersedeTargetDocId = doc2.id;
    });

    it('should cancel a finalized document with audit reason', async () => {
      const res = await request(app)
        .post(`/api/v1/documents/${cancelTargetDocId}/cancel`)
        .set('Authorization', `Bearer ${docAdminToken}`)
        .send({ reason: 'Student transferred out to another district' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('CANCELLED');
      expect(res.body.cancellationReason).toBe('Student transferred out to another district');

      const log = await prisma.documentActionLog.findFirst({
        where: { documentId: cancelTargetDocId, action: 'CANCELLED' },
      });
      expect(log).toBeDefined();
    });

    it('should allow reprinting cancelled document and return byte-identical archived PDF', async () => {
      const res = await request(app)
        .get(`/api/v1/documents/${cancelTargetDocId}/reprint`)
        .set('Authorization', `Bearer ${docAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toBe('application/pdf');
      expect(res.header['x-checksum-sha256']).toBe(initialCancelChecksum);

      const returnedChecksum = crypto.createHash('sha256').update(res.body).digest('hex');
      expect(returnedChecksum).toBe(initialCancelChecksum);
    });

    it('should supersede previous document and link supersedesDocumentId', async () => {
      const res = await request(app)
        .post(`/api/v1/documents/${supersedeTargetDocId}/supersede`)
        .set('Authorization', `Bearer ${docAdminToken}`)
        .send({
          templateId: testTemplateAId,
          sourceType: 'STUDENT',
          sourceId: studentAId,
          language: 'en',
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('FINALIZED');
      expect(res.body.supersedesDocumentId).toBe(supersedeTargetDocId);

      // Verify old document is SUPERSEDED
      const oldDoc = await prisma.generatedDocument.findUnique({
        where: { id: supersedeTargetDocId },
      });
      expect(oldDoc!.status).toBe('SUPERSEDED');
    });

    it('should reject invalid state transitions (CANCELLED -> FINALIZED, SUPERSEDED -> FINALIZED)', async () => {
      await expect(
        DocumentsService.finalizeDocument(tenantAId, schoolAId, cancelTargetDocId, docAdminUserId)
      ).rejects.toThrow(/Cannot finalize document with status 'CANCELLED'/);

      await expect(
        DocumentsService.finalizeDocument(tenantAId, schoolAId, supersedeTargetDocId, docAdminUserId)
      ).rejects.toThrow(/Cannot finalize document with status 'SUPERSEDED'/);
    });
  });

  // =========================================================================
  // SUITE 7: ACADEMIC REPORT CARD PUBLISHED STATUS CHECK
  // =========================================================================
  describe('Suite 7: Academic Report Card Published Status Check', () => {
    it('should reject finalizing report card if examination status is not PUBLISHED', async () => {
      // Attempting to finalize academic report for draft exam must throw
      await expect(
        DocumentsService.generateDocument(tenantAId, schoolAId, docAdminUserId, {
          templateId: reportCardTemplateId,
          sourceType: 'ACADEMIC',
          sourceId: examDraftId,
          language: 'en',
          options: { autoFinalize: true },
        })
      ).rejects.toThrow(/must be 'PUBLISHED'/);
    });

    it('should permit generating report card for PUBLISHED examination', async () => {
      const doc = await DocumentsService.generateDocument(tenantAId, schoolAId, docAdminUserId, {
        templateId: reportCardTemplateId,
        sourceType: 'ACADEMIC',
        sourceId: examPublishedId,
        language: 'en',
        options: { autoFinalize: true },
      });

      expect(doc.status).toBe('FINALIZED');
    });
  });

  // =========================================================================
  // SUITE 8: PUBLIC VERIFICATION (NO PII LEAKS)
  // =========================================================================
  describe('Suite 8: Public Verification & Privacy Protection', () => {
    let validToken: string;
    let cancelledDocToken: string;

    beforeAll(async () => {
      // Create a doc and extract raw token before hash
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      await prisma.generatedDocument.create({
        data: {
          tenantId: tenantAId,
          schoolId: schoolAId,
          documentType: 'BONAFIDE_CERTIFICATE',
          category: 'STUDENT',
          templateId: testTemplateAId,
          templateVersionId: (await prisma.documentTemplateVersion.findFirst({ where: { templateId: testTemplateAId } }))!.id,
          documentNumber: `BON-QA-VERIFY-${testSuffix}`,
          sourceType: 'STUDENT',
          sourceId: studentAId,
          status: 'FINALIZED',
          verificationTokenHash: tokenHash,
          checksumSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          dataSnapshotJson: {
            student: { fullName: 'Aarav Sharma', admissionNumber: 'ADM-12345' },
          },
        },
      });
      validToken = rawToken;

      const rawToken2 = crypto.randomBytes(32).toString('hex');
      const tokenHash2 = crypto.createHash('sha256').update(rawToken2).digest('hex');
      await prisma.generatedDocument.create({
        data: {
          tenantId: tenantAId,
          schoolId: schoolAId,
          documentType: 'BONAFIDE_CERTIFICATE',
          category: 'STUDENT',
          templateId: testTemplateAId,
          templateVersionId: (await prisma.documentTemplateVersion.findFirst({ where: { templateId: testTemplateAId } }))!.id,
          documentNumber: `BON-QA-CANCEL-${testSuffix}`,
          sourceType: 'STUDENT',
          sourceId: studentAId,
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancellationReason: 'Certificate Revoked',
          verificationTokenHash: tokenHash2,
          dataSnapshotJson: {
            student: { fullName: 'Priya Verma' },
          },
        },
      });
      cancelledDocToken = rawToken2;
    });

    it('should verify valid token with zero PII and zero recipient identity', async () => {
      const res = await request(app).get(`/api/public/documents/verify/${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.isValid).toBe(true);
      expect(res.body.status).toBe('FINALIZED');
      expect(res.body.documentNumber).toBe(`BON-QA-VERIFY-${testSuffix}`);
      expect(res.body.documentType).toBe('BONAFIDE_CERTIFICATE');
      expect(res.body.schoolName).toBeDefined();
      expect(res.body.checksumSha256).toBeDefined();

      // Zero recipient identity & zero PII assertions
      expect(res.body.recipientName).toBeUndefined();
      expect(res.body.recipientMasked).toBeUndefined();
      expect(res.body.student).toBeUndefined();
      expect(res.body.dateOfBirth).toBeUndefined();
      expect(res.body.guardianName).toBeUndefined();
      expect(res.body.guardianPhone).toBeUndefined();
      expect(res.body.address).toBeUndefined();
      expect(res.body.marks).toBeUndefined();
      expect(res.body.feeAmounts).toBeUndefined();
      expect(res.body.salary).toBeUndefined();
      expect(res.body.tenantId).toBeUndefined();
      expect(res.body.schoolId).toBeUndefined();
      expect(res.body.sourceId).toBeUndefined();
      expect(res.body.storageKey).toBeUndefined();
      expect(res.body.verificationTokenHash).toBeUndefined();
      expect(res.body.cancellationReason).toBeUndefined();
    });

    it('should return status CANCELLED and hide cancellationReason from public', async () => {
      const res = await request(app).get(`/api/public/documents/verify/${cancelledDocToken}`);

      expect(res.status).toBe(200);
      expect(res.body.isValid).toBe(false);
      expect(res.body.status).toBe('CANCELLED');
      expect(res.body.cancelledAt).toBeDefined();
      expect(res.body.cancellationReason).toBeUndefined();
      expect(res.body.cancelledBy).toBeUndefined();
      expect(res.body.recipientMasked).toBeUndefined();
      expect(res.body.recipientName).toBeUndefined();
      expect(res.body.tenantId).toBeUndefined();
      expect(res.body.schoolId).toBeUndefined();
      expect(res.body.storageKey).toBeUndefined();
      expect(res.body.verificationTokenHash).toBeUndefined();
    });

    it('should return status SUPERSEDED and safe message without exposing internal IDs', async () => {
      const supersededRawToken = crypto.randomBytes(32).toString('hex');
      const supersededHash = crypto.createHash('sha256').update(supersededRawToken).digest('hex');

      await prisma.generatedDocument.create({
        data: {
          tenantId: tenantAId,
          schoolId: schoolAId,
          documentType: 'BONAFIDE_CERTIFICATE',
          category: 'STUDENT',
          templateId: testTemplateAId,
          templateVersionId: (await prisma.documentTemplateVersion.findFirst({ where: { templateId: testTemplateAId } }))!.id,
          documentNumber: `BON-QA-SUPER-${testSuffix}`,
          sourceType: 'STUDENT',
          sourceId: studentAId,
          status: 'SUPERSEDED',
          verificationTokenHash: supersededHash,
          checksumSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          dataSnapshotJson: {},
        },
      });

      const res = await request(app).get(`/api/public/documents/verify/${supersededRawToken}`);
      expect(res.status).toBe(200);
      expect(res.body.isValid).toBe(false);
      expect(res.body.status).toBe('SUPERSEDED');
      expect(res.body.message).toBe('A newer document has been issued.');
      expect(res.body.supersedesDocumentId).toBeUndefined();
      expect(res.body.supersededByDocumentId).toBeUndefined();
      expect(res.body.replacementId).toBeUndefined();
      expect(res.body.sourceId).toBeUndefined();
      expect(res.body.tenantId).toBeUndefined();
      expect(res.body.schoolId).toBeUndefined();
    });

    it('should reject non-existent or tampered token', async () => {
      const fakeToken = crypto.randomBytes(32).toString('hex');
      const res = await request(app).get(`/api/public/documents/verify/${fakeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.isValid).toBe(false);
      expect(res.body.reason).toBe('DOCUMENT_NOT_FOUND');
    });
  });

  // =========================================================================
  // SUITE 9: MULTI-TENANCY & SCHOOL ISOLATION
  // =========================================================================
  describe('Suite 9: Multi-Tenancy & School Isolation', () => {
    it('should forbid Tenant B from accessing Tenant A document templates', async () => {
      const res = await request(app)
        .get(`/api/v1/documents/templates/${testTemplateAId}`)
        .set('Authorization', `Bearer ${tenantBToken}`);

      expect(res.status).toBe(500); // Scoped findFirst throws not found
    });

    it('should forbid user without documents.templates.manage from creating templates', async () => {
      const res = await request(app)
        .post('/api/v1/documents/templates')
        .set('Authorization', `Bearer ${noPermToken}`)
        .send({
          code: `QA_UNAUTH_${testSuffix}`,
          name: 'Unauthorized Template',
          documentType: 'BONAFIDE_CERTIFICATE',
          category: 'STUDENT',
        });

      expect(res.status).toBe(403);
    });

    it('should forbid user without documents.reprint from reprinting documents', async () => {
      const doc = await prisma.generatedDocument.findFirst({
        where: { tenantId: tenantAId, schoolId: schoolAId, status: 'FINALIZED' },
      });

      const res = await request(app)
        .get(`/api/v1/documents/${doc!.id}/reprint`)
        .set('Authorization', `Bearer ${noPermToken}`);

      expect(res.status).toBe(403);
    });

    it('should verify signature assets are private and omit raw storageKey', async () => {
      const res = await request(app)
        .get('/api/v1/documents/signatures')
        .set('Authorization', `Bearer ${docAdminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      for (const asset of res.body) {
        expect(asset.storageKey).toBeUndefined();
      }
    });
  });

  // =========================================================================
  // SUITE 10: BULK GENERATION JOBS
  // =========================================================================
  describe('Suite 10: Bulk Generation Jobs', () => {
    it('should create and process bulk document job with item status tracking', async () => {
      const res = await request(app)
        .post('/api/v1/documents/bulk-jobs')
        .set('Authorization', `Bearer ${docAdminToken}`)
        .send({
          templateId: testTemplateAId,
          sourceType: 'STUDENT',
          sourceIds: [studentAId],
          autoFinalize: true,
        });

      expect(res.status).toBe(202);
      expect(res.body.id).toBeDefined();
      expect(res.body.status).toBe('QUEUED');
      expect(res.body.totalCount).toBe(1);

      const jobId = res.body.id;

      // Poll or wait briefly for setImmediate job execution
      await new Promise((resolve) => setTimeout(resolve, 800));

      const jobRes = await request(app)
        .get(`/api/v1/documents/bulk-jobs/${jobId}`)
        .set('Authorization', `Bearer ${docAdminToken}`);

      expect(jobRes.status).toBe(200);
      expect(['PROCESSING', 'COMPLETED']).toContain(jobRes.body.status);
      expect(jobRes.body.items).toHaveLength(1);
    });
  });

  // =========================================================================
  // SUITE 11: DEVANAGARI / HINDI TEXT RENDERING
  // =========================================================================
  describe('Suite 11: Devanagari / Hindi Text Rendering', () => {
    it('should render PDF containing Hindi characters without throwing font error', async () => {
      const hindiLayout = {
        margins: { top: 30, bottom: 30, left: 30, right: 30 },
        elements: [
          {
            id: 'hindi_title',
            type: 'TEXT' as const,
            content: 'विद्यालय प्रमाण पत्र (ग्रीनवुड हाई स्कूल)',
            style: { fontSize: 16, alignment: 'center' as const },
          },
        ],
      };

      const result = await PdfRendererService.renderPdf(
        hindiLayout,
        { pageSize: 'A4', orientation: 'PORTRAIT', numberingPolicy: 'NO_OFFICIAL_NUMBER', defaultLanguage: 'hi' },
        {}
      );

      expect(result.pdfBuffer.length).toBeGreaterThan(1000);
      expect(result.pageCount).toBe(1);
      expect(result.checksumSha256).toBeDefined();
    });
  });

  // =========================================================================
  // SUITE 12: GLOBAL SEARCH FOR DOCUMENTS & TEMPLATES
  // =========================================================================
  describe('Suite 12: Global Search Integration', () => {
    it('should find document templates and navigation pages in global search', async () => {
      const searchRes = await request(app)
        .get('/api/v1/search?q=Bonafide')
        .set('Authorization', `Bearer ${docAdminToken}`);

      expect(searchRes.status).toBe(200);
      expect(Array.isArray(searchRes.body.results)).toBe(true);

      const hasTemplateOrNav = searchRes.body.results.some(
        (r: any) => r.type === 'document_template' || r.type === 'page'
      );
      expect(hasTemplateOrNav).toBe(true);
    });
  });

  // =========================================================================
  // SUITE 13: DOCUMENT REGISTER CSV SECURITY
  // =========================================================================
  describe('Suite 13: Document Register CSV Security', () => {
    it('should export CSV without leaking verification tokens, storage paths, or sensitive source data', async () => {
      const res = await request(app)
        .get('/api/v1/documents/reports/export-csv')
        .set('Authorization', `Bearer ${docAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toContain('text/csv');

      const csvText = res.text;
      expect(csvText).toContain('Document Number');
      expect(csvText).toContain('Status');
      expect(csvText).toContain('Checksum SHA-256');

      // Security: verification tokens, internal paths, and source PII must be completely absent
      expect(csvText).not.toContain('verificationToken');
      expect(csvText).not.toContain('verificationTokenHash');
      expect(csvText).not.toContain('dataSnapshotJson');
      expect(csvText).not.toContain('storageKey');
      expect(csvText).not.toContain('.pdf');
      expect(csvText).not.toContain('salary');
      expect(csvText).not.toContain('guardian');
      expect(csvText).not.toContain('parent');
    });
  });
});
