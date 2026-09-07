import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { prisma } from '../../lib/prisma.js';
import {
  CreateBulkJobDto,
  CreateSignatureAssetDto,
  CreateTemplateDto,
  CreateTemplateVersionDto,
  DocumentActionType,
  DocumentStatus,
  GenerateDocumentDto,
  LayoutDefinition,
  PageSettings,
  UpdateTemplateDto,
} from './documents.types.js';
import { TemplateLayoutEngine } from './template-layout.engine.js';
import { PdfRendererService } from './pdf-renderer.service.js';
import { DocumentResolverRegistry } from './resolvers/document-resolver.registry.js';
import { StudentNumberingService } from '../../services/student-numbering.service.js';

export class DocumentsService {
  private static readonly STORAGE_BASE_DIR = path.resolve(process.cwd(), 'uploads/documents');

  private static ensureStorageDir(subPath = ''): string {
    const fullPath = path.join(this.STORAGE_BASE_DIR, subPath);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
    return fullPath;
  }

  // ==========================================
  // TEMPLATES & VERSIONS
  // ==========================================

  public static async listTemplates(
    tenantId: string,
    schoolId: string,
    filters?: { category?: string; documentType?: string; status?: string; search?: string }
  ) {
    const where: any = { tenantId, schoolId };
    if (filters?.category) where.category = filters.category;
    if (filters?.documentType) where.documentType = filters.documentType;
    if (filters?.status) where.status = filters.status;
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { code: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return await prisma.documentTemplate.findMany({
      where,
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  public static async getTemplateById(tenantId: string, schoolId: string, id: string) {
    const template = await prisma.documentTemplate.findFirst({
      where: { id, tenantId, schoolId },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
        },
      },
    });
    if (!template) {
      throw new Error(`Document template not found for ID: ${id}`);
    }
    return template;
  }

  public static getDefaultInitialLayout(documentType: string, name: string): LayoutDefinition {
    if (documentType === 'STUDENT_ID_CARD') {
      return {
        margins: { top: 30, bottom: 30, left: 30, right: 30 },
        elements: [
          { id: 'school_title', type: 'TEXT', content: '{{school.name}}', style: { fontSize: 18, bold: true, alignment: 'center', color: '#1e3a8a' } },
          { id: 'doc_title', type: 'TEXT', content: 'STUDENT IDENTITY CARD', style: { fontSize: 12, bold: true, alignment: 'center', marginTop: 6, color: '#475569' } },
          { id: 'divider_1', type: 'LINE', style: { marginTop: 12, lineWidth: 1.5, lineColor: '#cbd5e1' } },
          { id: 'student_name', type: 'TEXT', content: 'Student Name: {{student.fullName}}', style: { fontSize: 14, bold: true, marginTop: 16 } },
          { id: 'student_adm', type: 'TEXT', content: 'Admission No: {{student.admissionNumber}}', style: { fontSize: 11, marginTop: 6 } },
          { id: 'student_class', type: 'TEXT', content: 'Class: {{academic.className}}', style: { fontSize: 11, marginTop: 6 } },
          { id: 'student_dob', type: 'TEXT', content: 'Date of Birth: {{student.dateOfBirthFormatted}}', style: { fontSize: 11, marginTop: 6 } },
          { id: 'student_blood', type: 'TEXT', content: 'Blood Group: {{student.bloodGroup}}', style: { fontSize: 11, marginTop: 6 } },
          { id: 'student_contact', type: 'TEXT', content: 'Emergency Contact: {{student.emergencyContact}}', style: { fontSize: 11, marginTop: 6 } },
          { id: 'divider_2', type: 'LINE', style: { marginTop: 20, lineWidth: 1, lineColor: '#e2e8f0' } },
          { id: 'qr', type: 'QR_CODE', style: { width: 60, height: 60, marginTop: 15, alignment: 'right' } },
        ],
      };
    }

    if (documentType === 'BONAFIDE_CERTIFICATE') {
      return {
        margins: { top: 40, bottom: 40, left: 40, right: 40 },
        elements: [
          { id: 'header_title', type: 'TEXT', content: '{{school.name}}', style: { fontSize: 20, bold: true, alignment: 'center', color: '#1e3a8a' } },
          { id: 'doc_title', type: 'TEXT', content: 'BONAFIDE CERTIFICATE', style: { fontSize: 16, bold: true, alignment: 'center', marginTop: 15 } },
          { id: 'ref_row', type: 'ROW', style: { marginTop: 20 }, children: [
            { id: 'ref_no', type: 'TEXT', content: 'Ref No: {{document.number}}', style: { bold: true } },
            { id: 'issue_date', type: 'TEXT', content: 'Date: {{document.dateFormatted}}', style: { alignment: 'right' } },
          ]},
          { id: 'cert_body', type: 'PARAGRAPH', style: { marginTop: 30, lineHeight: 1.6, fontSize: 12 }, content: 'This is to certify that {{student.fullName}} (Admission No: {{student.admissionNumber}}) is a bonafide student of {{school.name}} studying in {{academic.className}} during the academic session {{academic.academicYear}}.' },
          { id: 'qr', type: 'QR_CODE', style: { width: 70, height: 70, marginTop: 40, alignment: 'left' } },
        ],
      };
    }

    if (documentType === 'CHARACTER_CERTIFICATE') {
      return {
        margins: { top: 40, bottom: 40, left: 40, right: 40 },
        elements: [
          { id: 'header_title', type: 'TEXT', content: '{{school.name}}', style: { fontSize: 20, bold: true, alignment: 'center', color: '#1e3a8a' } },
          { id: 'doc_title', type: 'TEXT', content: 'CHARACTER CERTIFICATE', style: { fontSize: 16, bold: true, alignment: 'center', marginTop: 15 } },
          { id: 'ref_row', type: 'ROW', style: { marginTop: 20 }, children: [
            { id: 'ref_no', type: 'TEXT', content: 'Ref No: {{document.number}}', style: { bold: true } },
            { id: 'issue_date', type: 'TEXT', content: 'Date: {{document.dateFormatted}}', style: { alignment: 'right' } },
          ]},
          { id: 'cert_body', type: 'PARAGRAPH', style: { marginTop: 30, lineHeight: 1.6, fontSize: 12 }, content: 'This is to certify that {{student.fullName}} (Admission No: {{student.admissionNumber}}) has been a student of good moral character at {{school.name}}.' },
          { id: 'qr', type: 'QR_CODE', style: { width: 70, height: 70, marginTop: 40, alignment: 'left' } },
        ],
      };
    }

    return {
      margins: { top: 36, bottom: 36, left: 36, right: 36 },
      elements: [
        { id: 'title', type: 'TEXT', content: name, style: { fontSize: 18, bold: true, alignment: 'center' } },
        { id: 'body', type: 'PARAGRAPH', content: 'Document content for {{student.fullName}} (Admission: {{student.admissionNumber}}).', style: { marginTop: 20, fontSize: 11 } },
        { id: 'qr', type: 'QR_CODE', style: { width: 60, height: 60, marginTop: 30, alignment: 'right' } },
      ],
    };
  }

  public static async createTemplate(
    tenantId: string,
    schoolId: string,
    userId: string,
    dto: CreateTemplateDto
  ) {
    const existing = await prisma.documentTemplate.findFirst({
      where: { schoolId, code: dto.code },
    });
    if (existing) {
      throw new Error(`A template with code '${dto.code}' already exists in this school.`);
    }

    const initialLayout: LayoutDefinition =
      dto.initialLayout || this.getDefaultInitialLayout(dto.documentType, dto.name);

    TemplateLayoutEngine.validateLayout(initialLayout);

    return await prisma.documentTemplate.create({
      data: {
        tenantId,
        schoolId,
        code: dto.code,
        name: dto.name,
        documentType: dto.documentType,
        category: dto.category,
        pageSize: dto.pageSize || 'A4',
        orientation: dto.orientation || 'PORTRAIT',
        language: dto.language || 'en',
        status: 'PUBLISHED',
        createdBy: userId,
        versions: {
          create: {
            versionNumber: 1,
            layoutDefinition: initialLayout as any,
            pageSettings: {
              numberingPolicy: dto.numberingPolicy,
              numberSeriesCode: dto.numberSeriesCode || null,
              pageSize: dto.pageSize,
              orientation: dto.orientation,
            },
            isPublished: true,
            createdBy: userId,
          },
        },
      },
      include: {
        versions: true,
      },
    });
  }

  public static async updateTemplate(
    tenantId: string,
    schoolId: string,
    id: string,
    userId: string,
    dto: UpdateTemplateDto
  ) {
    const template = await this.getTemplateById(tenantId, schoolId, id);

    return await prisma.documentTemplate.update({
      where: { id: template.id },
      data: {
        name: dto.name ?? template.name,
        category: dto.category ?? template.category,
        pageSize: dto.pageSize ?? template.pageSize,
        orientation: dto.orientation ?? template.orientation,
        language: dto.language ?? template.language,
        status: (dto.status as any) ?? template.status,
        updatedBy: userId,
      },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
      },
    });
  }

  public static async createTemplateVersion(
    tenantId: string,
    schoolId: string,
    templateId: string,
    userId: string,
    dto: CreateTemplateVersionDto
  ) {
    const template = await this.getTemplateById(tenantId, schoolId, templateId);
    TemplateLayoutEngine.validateLayout(dto.layoutDefinition);

    const latest = await prisma.documentTemplateVersion.findFirst({
      where: { templateId },
      orderBy: { versionNumber: 'desc' },
    });
    const nextVersionNumber = (latest?.versionNumber || 0) + 1;

    const createdVersion = await prisma.documentTemplateVersion.create({
      data: {
        templateId,
        versionNumber: nextVersionNumber,
        layoutDefinition: dto.layoutDefinition as any,
        contentDefinition: dto.contentDefinition as any,
        variableSchema: dto.variableSchema as any,
        styleDefinition: dto.styleDefinition as any,
        pageSettings: (dto.pageSettings as any) || latest?.pageSettings || {},
        isPublished: dto.isPublished ?? false,
        createdBy: userId,
      },
    });

    if (dto.isPublished) {
      await prisma.documentTemplate.update({
        where: { id: templateId },
        data: {
          currentVersionId: createdVersion.id,
          status: 'PUBLISHED',
          updatedBy: userId,
        },
      });
    }

    return createdVersion;
  }

  public static async publishVersion(
    tenantId: string,
    schoolId: string,
    templateId: string,
    versionId: string,
    userId: string
  ) {
    await this.getTemplateById(tenantId, schoolId, templateId);

    const version = await prisma.documentTemplateVersion.findFirst({
      where: { id: versionId, templateId },
    });
    if (!version) {
      throw new Error(`Version '${versionId}' not found for template '${templateId}'`);
    }

    await prisma.documentTemplateVersion.update({
      where: { id: versionId },
      data: { isPublished: true },
    });

    return await prisma.documentTemplate.update({
      where: { id: templateId },
      data: {
        currentVersionId: version.id,
        status: 'PUBLISHED',
        updatedBy: userId,
      },
      include: {
        versions: true,
      },
    });
  }

  // ==========================================
  // PREVIEW (NON-MUTATING / NO OFFICIAL NUMBER)
  // ==========================================

  public static async previewDocument(
    tenantId: string,
    schoolId: string,
    templateId: string,
    sourceType: string,
    sourceId: string,
    options?: {
      templateVersionId?: string;
      customVariables?: Record<string, any>;
      layoutDefinition?: LayoutDefinition;
    }
  ) {
    const template = await this.getTemplateById(tenantId, schoolId, templateId);

    let layout: LayoutDefinition;
    let pageSettings: PageSettings;

    if (options?.layoutDefinition) {
      layout = options.layoutDefinition;
      pageSettings = {
        pageSize: (template.pageSize as any) || 'A4',
        orientation: (template.orientation as any) || 'PORTRAIT',
        numberingPolicy: 'NO_OFFICIAL_NUMBER',
        defaultLanguage: template.language || 'en',
      };
    } else {
      let version = null;
      if (options?.templateVersionId) {
        version = await prisma.documentTemplateVersion.findFirst({
          where: { id: options.templateVersionId, templateId },
        });
      }
      if (!version) {
        version = await prisma.documentTemplateVersion.findFirst({
          where: { templateId, isPublished: true },
          orderBy: { versionNumber: 'desc' },
        });
      }
      if (!version) {
        version = await prisma.documentTemplateVersion.findFirst({
          where: { templateId },
          orderBy: { versionNumber: 'desc' },
        });
      }
      if (!version) {
        throw new Error(`No layout version available for template: ${templateId}`);
      }

      layout = version.layoutDefinition as unknown as LayoutDefinition;
      pageSettings = {
        pageSize: (template.pageSize as any) || 'A4',
        orientation: (template.orientation as any) || 'PORTRAIT',
        numberingPolicy: 'NO_OFFICIAL_NUMBER',
        defaultLanguage: template.language || 'en',
        ...((version.pageSettings as any) || {}),
      };
    }

    const resolvedData = await DocumentResolverRegistry.resolve({
      tenantId,
      schoolId,
      documentType: template.documentType as any,
      category: template.category as any,
      sourceId,
      isOfficialFinalize: false,
      customVariables: options?.customVariables,
    });

    // Mark preview distinctly
    resolvedData.document.number = 'PREVIEW-DRAFT';
    resolvedData.document.status = 'DRAFT';

    const renderLayout: LayoutDefinition = {
      ...layout,
      watermark: {
        text: 'PREVIEW / DRAFT',
        opacity: 0.15,
        angle: -45,
        fontSize: 55,
        color: '#94a3b8',
      },
    };

    const result = await PdfRendererService.renderPdf(
      renderLayout,
      pageSettings,
      resolvedData,
      'https://evolix.local/verify/document/preview'
    );

    return {
      pdfBuffer: result.pdfBuffer,
      pageCount: result.pageCount,
      checksumSha256: result.checksumSha256,
      dataSnapshot: resolvedData,
    };
  }

  // ==========================================
  // DOCUMENT GENERATION & ATOMIC FINALIZATION
  // ==========================================

  public static async generateDocument(
    tenantId: string,
    schoolId: string,
    userId: string,
    dto: GenerateDocumentDto
  ) {
    const template = await this.getTemplateById(tenantId, schoolId, dto.templateId);

    let version = null;
    if (dto.templateVersionId) {
      version = await prisma.documentTemplateVersion.findFirst({
        where: { id: dto.templateVersionId, templateId: template.id },
      });
    }
    if (!version) {
      version = await prisma.documentTemplateVersion.findFirst({
        where: { templateId: template.id, isPublished: true },
        orderBy: { versionNumber: 'desc' },
      });
    }
    if (!version) {
      version = await prisma.documentTemplateVersion.findFirst({
        where: { templateId: template.id },
        orderBy: { versionNumber: 'desc' },
      });
    }
    if (!version) {
      throw new Error(`No template version found for template ${template.id}`);
    }

    const versionSettings = (version.pageSettings as any) || {};
    const numberingPolicy = versionSettings.numberingPolicy || 'NUMBER_SERIES_ON_FINALIZE';

    const resolvedData = await DocumentResolverRegistry.resolve({
      tenantId,
      schoolId,
      documentType: template.documentType as any,
      category: template.category as any,
      sourceId: dto.sourceId,
      isOfficialFinalize: Boolean(dto.options?.autoFinalize),
      customVariables: dto.options?.customVariables,
    });

    // Create Draft GeneratedDocument record
    const document = await prisma.generatedDocument.create({
      data: {
        tenantId,
        schoolId,
        documentType: template.documentType,
        category: template.category,
        numberingPolicy,
        templateId: template.id,
        templateVersionId: version.id,
        sourceType: dto.sourceType,
        sourceId: dto.sourceId,
        recipientType: dto.recipientType || 'STUDENT',
        recipientId: dto.recipientId || dto.sourceId,
        language: dto.language || 'en',
        dataSnapshotJson: resolvedData as any,
        status: 'DRAFT',
        generatedBy: userId,
      },
    });

    await this.logDocumentAction({
      documentId: document.id,
      tenantId,
      schoolId,
      action: 'GENERATED',
      actorId: userId,
      metadata: { autoFinalize: dto.options?.autoFinalize },
    });

    if (dto.options?.autoFinalize) {
      return await this.finalizeDocument(tenantId, schoolId, document.id, userId);
    }

    return document;
  }

  /**
   * Atomically finalizes draft document, allocates official NumberSeries (if policy mandates),
   * renders immutable PDF bytes, computes SHA-256 checksum, generates verification token,
   * stores PDF on disk.
   */
  public static async finalizeDocument(
    tenantId: string,
    schoolId: string,
    documentId: string,
    userId: string
  ) {
    const document = await prisma.generatedDocument.findFirst({
      where: { id: documentId, tenantId, schoolId },
      include: {
        template: true,
        templateVersion: true,
      },
    });

    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }
    if (document.status === 'FINALIZED') {
      return document; // Idempotent
    }
    if (document.status === 'CANCELLED' || document.status === 'SUPERSEDED') {
      throw new Error(`Cannot finalize document with status '${document.status}'`);
    }

    const version = document.templateVersion;
    const versionSettings = (version.pageSettings as any) || {};
    const layout = version.layoutDefinition as unknown as LayoutDefinition;
    const numberingPolicy = document.numberingPolicy;

    // 1. Allocate official document number
    let allocatedNumber: string | null = null;

    if (numberingPolicy === 'NUMBER_SERIES_ON_FINALIZE') {
      const seriesCode =
        versionSettings.numberSeriesCode || `DOC_${document.documentType}`;

      // Acquire exclusive row-level lock and increment via StudentNumberingService
      const nextSeq = await StudentNumberingService.getNextSequenceValue(
        tenantId,
        schoolId,
        seriesCode
      );

      // Check number series format prefix
      const seriesRecord = await prisma.numberSeries.findFirst({
        where: { tenantId, code: seriesCode },
      });
      const pattern = seriesRecord?.prefix
        ? `${seriesRecord.prefix}{SEQ:${seriesRecord.padding || 5}}`
        : `DOC-{YYYY}-{SEQ:05}`;

      allocatedNumber = StudentNumberingService.interpolatePattern(pattern, nextSeq);
    } else if (numberingPolicy === 'SOURCE_NUMBER') {
      // Re-use source number resolved in snapshot
      const snapshot: any = document.dataSnapshotJson;
      allocatedNumber =
        snapshot.finance?.receiptNumber ||
        snapshot.gate?.passNumber ||
        snapshot.payroll?.runNumber ||
        snapshot.student?.admissionNumber ||
        `SRC-${document.sourceId.slice(0, 8).toUpperCase()}`;
    } else {
      // NO_OFFICIAL_NUMBER
      allocatedNumber = null;
    }

    // 2. Generate 32-byte secure verification token & SHA-256 hash
    const rawVerificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenHash = crypto
      .createHash('sha256')
      .update(rawVerificationToken)
      .digest('hex');

    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const qrVerificationUrl = `${appUrl}/verify/document/${rawVerificationToken}`;

    // 3. Update snapshot with official allocated number and finalized status
    const updatedSnapshot: any = {
      ...(document.dataSnapshotJson as any),
      document: {
        ...((document.dataSnapshotJson as any)?.document || {}),
        number: allocatedNumber || 'OFFICIAL',
        status: 'FINALIZED',
        finalizedAt: new Date().toISOString(),
      },
    };

    // 4. Render authoritative PDF
    const pageSettings: PageSettings = {
      pageSize: (document.template.pageSize as any) || 'A4',
      orientation: (document.template.orientation as any) || 'PORTRAIT',
      numberingPolicy: numberingPolicy as any,
      defaultLanguage: document.language || 'en',
      ...versionSettings,
    };

    const renderResult = await PdfRendererService.renderPdf(
      layout,
      pageSettings,
      updatedSnapshot,
      qrVerificationUrl
    );

    // 5. Store byte-immutable PDF file to disk
    const tenantDir = this.ensureStorageDir(path.join(tenantId, schoolId));
    const filename = `${document.id}.pdf`;
    const fullFilePath = path.join(tenantDir, filename);
    fs.writeFileSync(fullFilePath, renderResult.pdfBuffer);

    // 6. Persist finalized record
    const finalizedDoc = await prisma.generatedDocument.update({
      where: { id: document.id },
      data: {
        status: 'FINALIZED',
        documentNumber: allocatedNumber,
        verificationTokenHash,
        storageKey: fullFilePath,
        checksumSha256: renderResult.checksumSha256,
        dataSnapshotJson: updatedSnapshot,
        renderedMetadataJson: {
          pageCount: renderResult.pageCount,
          fileSizeBytes: renderResult.pdfBuffer.length,
          renderedAt: new Date(),
        },
        finalizedAt: new Date(),
      },
    });

    await this.logDocumentAction({
      documentId: document.id,
      tenantId,
      schoolId,
      action: 'FINALIZED',
      actorId: userId,
      metadata: {
        documentNumber: allocatedNumber,
        checksumSha256: renderResult.checksumSha256,
      },
    });

    return finalizedDoc;
  }

  // ==========================================
  // REPRINT & BYTE-IMMUTABLE RETRIEVAL
  // ==========================================

  public static async getOrReprintDocument(
    tenantId: string,
    schoolId: string,
    documentId: string,
    userId?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const document = await prisma.generatedDocument.findFirst({
      where: { id: documentId, tenantId, schoolId },
    });
    if (!document) {
      throw new Error(`Generated document not found: ${documentId}`);
    }

    if (!['FINALIZED', 'CANCELLED', 'SUPERSEDED'].includes(document.status) || !document.storageKey) {
      throw new Error(
        `Document cannot be downloaded: current status is '${document.status}'. Finalize document first.`
      );
    }

    if (!fs.existsSync(document.storageKey)) {
      throw new Error(`Document storage artifact missing on server for: ${documentId}`);
    }

    // Read authoritative bytes directly from storage
    const storedBytes = fs.readFileSync(document.storageKey);
    const checksum = crypto.createHash('sha256').update(storedBytes).digest('hex');

    // Assert byte-immutability
    if (document.checksumSha256 && checksum !== document.checksumSha256) {
      throw new Error(`Document integrity check failed: file checksum mismatch!`);
    }

    // Increment reprint count & log action
    const updated = await prisma.generatedDocument.update({
      where: { id: documentId },
      data: {
        reprintCount: { increment: 1 },
      },
    });

    await this.logDocumentAction({
      documentId,
      tenantId,
      schoolId,
      action: updated.reprintCount === 1 ? 'DOWNLOADED' : 'REPRINTED',
      actorId: userId,
      ipAddress,
      userAgent,
      metadata: {
        reprintNumber: updated.reprintCount,
        checksumSha256: checksum,
      },
    });

    return {
      document: updated,
      pdfBuffer: storedBytes,
      checksumSha256: checksum,
      filename: `${document.documentNumber || document.id}.pdf`,
    };
  }

  // ==========================================
  // CANCELLATION & SUPERSEDING
  // ==========================================

  public static async cancelDocument(
    tenantId: string,
    schoolId: string,
    documentId: string,
    userId: string,
    reason: string
  ) {
    const document = await prisma.generatedDocument.findFirst({
      where: { id: documentId, tenantId, schoolId },
    });
    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }
    if (document.status !== 'FINALIZED') {
      throw new Error(`Cannot cancel document: only FINALIZED documents can be cancelled.`);
    }

    const cancelled = await prisma.generatedDocument.update({
      where: { id: documentId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledBy: userId,
        cancellationReason: reason,
      },
    });

    await this.logDocumentAction({
      documentId,
      tenantId,
      schoolId,
      action: 'CANCELLED',
      actorId: userId,
      metadata: { reason },
    });

    return cancelled;
  }

  public static async supersedeDocument(
    tenantId: string,
    schoolId: string,
    oldDocumentId: string,
    userId: string,
    dto: GenerateDocumentDto
  ) {
    const oldDoc = await prisma.generatedDocument.findFirst({
      where: { id: oldDocumentId, tenantId, schoolId },
    });
    if (!oldDoc) {
      throw new Error(`Previous document not found: ${oldDocumentId}`);
    }
    if (oldDoc.status !== 'FINALIZED') {
      throw new Error(`Cannot supersede document: previous document must be FINALIZED.`);
    }

    // Generate new document pointing to previous
    const newDoc = await this.generateDocument(tenantId, schoolId, userId, {
      ...dto,
      options: {
        ...dto.options,
        autoFinalize: true,
      },
    });

    const updatedNewDoc = await prisma.generatedDocument.update({
      where: { id: newDoc.id },
      data: {
        supersedesDocumentId: oldDoc.id,
      },
    });

    // Mark previous document as SUPERSEDED
    await prisma.generatedDocument.update({
      where: { id: oldDoc.id },
      data: {
        status: 'SUPERSEDED',
      },
    });

    await this.logDocumentAction({
      documentId: oldDoc.id,
      tenantId,
      schoolId,
      action: 'SUPERSEDED',
      actorId: userId,
      metadata: { supersedingDocumentId: newDoc.id },
    });

    return updatedNewDoc;
  }

  // ==========================================
  // BULK GENERATION JOBS
  // ==========================================

  public static async createBulkJob(
    tenantId: string,
    schoolId: string,
    userId: string,
    dto: CreateBulkJobDto
  ) {
    const template = await this.getTemplateById(tenantId, schoolId, dto.templateId);
    const version = dto.templateVersionId
      ? await prisma.documentTemplateVersion.findFirst({
          where: { id: dto.templateVersionId, templateId: template.id },
        })
      : await prisma.documentTemplateVersion.findFirst({
          where: { templateId: template.id, isPublished: true },
          orderBy: { versionNumber: 'desc' },
        });

    if (!version) {
      throw new Error(`No published version found for template ${template.id}`);
    }

    const job = await prisma.bulkDocumentJob.create({
      data: {
        tenantId,
        schoolId,
        documentTemplateId: template.id,
        templateVersionId: version.id,
        sourceSelectionSafeJson: {
          sourceType: dto.sourceType,
          sourceIds: dto.sourceIds,
          options: dto.options || {},
          autoFinalize: dto.autoFinalize,
        },
        status: 'QUEUED',
        totalCount: dto.sourceIds.length,
        createdBy: userId,
        items: {
          create: dto.sourceIds.map((sourceId) => ({
            tenantId,
            schoolId,
            sourceType: dto.sourceType,
            sourceId,
            status: 'PENDING',
          })),
        },
      },
      include: { items: true },
    });

    // Run processing asynchronously in background
    setImmediate(() => {
      this.processBulkJob(job.id, userId).catch((err) => {
        console.error(`Bulk job execution error for ${job.id}:`, err);
      });
    });

    return job;
  }

  public static async processBulkJob(jobId: string, userId?: string) {
    const job = await prisma.bulkDocumentJob.findUnique({
      where: { id: jobId },
      include: { items: true },
    });
    if (!job) return;

    await prisma.bulkDocumentJob.update({
      where: { id: jobId },
      data: { status: 'PROCESSING', startedAt: new Date() },
    });

    const meta: any = job.sourceSelectionSafeJson;
    const autoFinalize = Boolean(meta.autoFinalize);

    let successCount = 0;
    let failedCount = 0;

    for (const item of job.items) {
      try {
        await prisma.bulkDocumentJobItem.update({
          where: { id: item.id },
          data: { status: 'PROCESSING', attemptCount: item.attemptCount + 1 },
        });

        const doc = await this.generateDocument(job.tenantId, job.schoolId, userId || '', {
          templateId: job.documentTemplateId,
          templateVersionId: job.templateVersionId,
          sourceType: item.sourceType,
          sourceId: item.sourceId,
          recipientId: item.sourceId,
          language: 'en',
          options: {
            autoFinalize,
          },
        });

        await prisma.bulkDocumentJobItem.update({
          where: { id: item.id },
          data: {
            status: 'COMPLETED',
            generatedDocumentId: doc.id,
          },
        });
        successCount++;
      } catch (err: any) {
        failedCount++;
        await prisma.bulkDocumentJobItem.update({
          where: { id: item.id },
          data: {
            status: 'FAILED',
            errorCode: 'GENERATE_FAILED',
            errorMessage: err?.message || 'Generation failed',
          },
        });
      }
    }

    const finalStatus =
      failedCount === 0 ? 'COMPLETED' : successCount === 0 ? 'FAILED' : 'PARTIAL';

    return await prisma.bulkDocumentJob.update({
      where: { id: jobId },
      data: {
        status: finalStatus,
        processedCount: successCount + failedCount,
        successCount,
        failedCount,
        completedAt: new Date(),
      },
      include: { items: true },
    });
  }

  public static async getBulkJobById(tenantId: string, schoolId: string, jobId: string) {
    const job = await prisma.bulkDocumentJob.findFirst({
      where: { id: jobId, tenantId, schoolId },
      include: {
        items: {
          include: { generatedDocument: true },
        },
        template: true,
      },
    });
    if (!job) {
      throw new Error(`Bulk document job not found: ${jobId}`);
    }
    return job;
  }

  // ==========================================
  // PUBLIC VERIFICATION (NON-PII)
  // ==========================================

  public static async verifyToken(rawToken: string) {
    if (!rawToken || typeof rawToken !== 'string') {
      return { isValid: false, reason: 'INVALID_TOKEN' };
    }

    const verificationTokenHash = crypto
      .createHash('sha256')
      .update(rawToken.trim())
      .digest('hex');

    const document = await prisma.generatedDocument.findFirst({
      where: { verificationTokenHash },
      include: {
        school: {
          include: { configuration: true },
        },
      },
    });

    if (!document) {
      return {
        isValid: false,
        status: 'INVALID',
        reason: 'DOCUMENT_NOT_FOUND',
      };
    }

    const dateFormatted = document.finalizedAt
      ? new Date(document.finalizedAt).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        })
      : '';

    // Public verify strictly proves DOCUMENT authenticity with ZERO recipient identity and ZERO private reasons
    return {
      isValid: document.status === 'FINALIZED',
      status: document.status,
      documentNumber: document.documentNumber || undefined,
      documentType: document.documentType,
      category: document.category,
      schoolName: document.school?.name || '',
      issueDate: dateFormatted,
      cancelledAt: document.cancelledAt ? document.cancelledAt.toISOString() : undefined,
      message: document.status === 'SUPERSEDED' ? 'A newer document has been issued.' : undefined,
      checksumSha256: document.checksumSha256 || undefined,
    };
  }

  // ==========================================
  // SIGNATURES & BRANDING ASSETS
  // ==========================================

  public static async listSignatureAssets(tenantId: string, schoolId: string) {
    return await prisma.documentSignatureAsset.findMany({
      where: { tenantId, schoolId, isActive: true },
      select: {
        id: true,
        name: true,
        assetType: true,
        ownerEmployeeId: true,
        designationLabel: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  public static async createSignatureAsset(
    tenantId: string,
    schoolId: string,
    dto: CreateSignatureAssetDto
  ) {
    return await prisma.documentSignatureAsset.create({
      data: {
        tenantId,
        schoolId,
        name: dto.name,
        assetType: dto.assetType,
        storageKey: dto.storageKey,
        ownerEmployeeId: dto.ownerEmployeeId || null,
        designationLabel: dto.designationLabel || null,
        isActive: dto.isActive ?? true,
      },
    });
  }

  // ==========================================
  // ACTION AUDIT LOGGING
  // ==========================================

  public static async logDocumentAction(params: {
    documentId: string;
    tenantId: string;
    schoolId: string;
    action: DocumentActionType;
    actorId?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
  }) {
    return await prisma.documentActionLog.create({
      data: {
        documentId: params.documentId,
        tenantId: params.tenantId,
        schoolId: params.schoolId,
        action: params.action,
        actorId: params.actorId || null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
        metadata: (params.metadata as any) || null,
      },
    });
  }

  public static async listGeneratedDocuments(
    tenantId: string,
    schoolId: string,
    filters?: {
      documentType?: string;
      category?: string;
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { tenantId, schoolId };
    if (filters?.documentType) where.documentType = filters.documentType;
    if (filters?.category) where.category = filters.category;
    if (filters?.status) where.status = filters.status;
    if (filters?.search) {
      where.OR = [
        { documentNumber: { contains: filters.search, mode: 'insensitive' } },
        { sourceType: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.generatedDocument.count({ where }),
      prisma.generatedDocument.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          tenantId: true,
          schoolId: true,
          templateId: true,
          templateVersionId: true,
          documentType: true,
          category: true,
          documentNumber: true,
          numberingPolicy: true,
          sourceType: true,
          sourceId: true,
          recipientType: true,
          recipientId: true,
          language: true,
          reprintCount: true,
          status: true,
          checksumSha256: true,
          supersedesDocumentId: true,
          cancelledAt: true,
          cancelledBy: true,
          cancellationReason: true,
          finalizedAt: true,
          createdAt: true,
          updatedAt: true,
          template: { select: { name: true, code: true } },
        },
      }),
    ]);

    return { total, page, limit, items };
  }

  public static async exportDocumentRegisterCsv(
    tenantId: string,
    schoolId: string
  ): Promise<string> {
    const docs = await prisma.generatedDocument.findMany({
      where: { tenantId, schoolId },
      orderBy: { createdAt: 'desc' },
      select: {
        documentNumber: true,
        documentType: true,
        category: true,
        status: true,
        finalizedAt: true,
        cancelledAt: true,
        checksumSha256: true,
        reprintCount: true,
        createdAt: true,
      },
    });

    const headers = [
      'Document Number',
      'Document Type',
      'Category',
      'Status',
      'Finalized At',
      'Cancelled At',
      'Checksum SHA-256',
      'Reprint Count',
      'Created At',
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = docs.map((d) => [
      escapeCsv(d.documentNumber || '-'),
      escapeCsv(d.documentType),
      escapeCsv(d.category),
      escapeCsv(d.status),
      escapeCsv(d.finalizedAt ? d.finalizedAt.toISOString() : '-'),
      escapeCsv(d.cancelledAt ? d.cancelledAt.toISOString() : '-'),
      escapeCsv(d.checksumSha256 || '-'),
      escapeCsv(d.reprintCount),
      escapeCsv(d.createdAt.toISOString()),
    ]);

    return [headers.map((h) => `"${h}"`).join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  }
}
