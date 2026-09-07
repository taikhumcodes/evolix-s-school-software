import { z } from 'zod';

export const DocumentTypeEnum = z.enum([
  'BONAFIDE_CERTIFICATE',
  'TRANSFER_CERTIFICATE',
  'CHARACTER_CERTIFICATE',
  'STUDENT_ID_CARD',
  'ADMISSION_FORM',
  'STUDENT_PROFILE',
  'REPORT_CARD',
  'EXAM_RESULT',
  'MARKS_STATEMENT',
  'FEE_RECEIPT',
  'FEE_STATEMENT',
  'STUDENT_LEDGER_STATEMENT',
  'EMPLOYEE_ID_CARD',
  'EMPLOYMENT_CERTIFICATE',
  'EXPERIENCE_CERTIFICATE',
  'SALARY_CERTIFICATE',
  'APPOINTMENT_LETTER',
  'RELIEVING_LETTER',
  'PAYSLIP',
  'ROUTE_MANIFEST',
  'VISITOR_PASS',
  'STUDENT_PICKUP_RECORD',
  'EVENT_PARTICIPANT_LIST',
  'GENERAL_LETTER',
  'CUSTOM_CERTIFICATE',
]);
export type DocumentType = z.infer<typeof DocumentTypeEnum>;

export const DocumentCategoryEnum = z.enum([
  'STUDENT',
  'ACADEMIC',
  'FINANCE',
  'HR',
  'PAYROLL',
  'OPERATIONS',
  'GENERAL',
]);
export type DocumentCategory = z.infer<typeof DocumentCategoryEnum>;

export const TemplateStatusEnum = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);
export type TemplateStatus = z.infer<typeof TemplateStatusEnum>;

export const DocumentStatusEnum = z.enum([
  'DRAFT',
  'GENERATED',
  'FINALIZED',
  'CANCELLED',
  'SUPERSEDED',
]);
export type DocumentStatus = z.infer<typeof DocumentStatusEnum>;

export const NumberingPolicyEnum = z.enum([
  'NUMBER_SERIES_ON_FINALIZE',
  'SOURCE_NUMBER',
  'NO_OFFICIAL_NUMBER',
]);
export type NumberingPolicy = z.infer<typeof NumberingPolicyEnum>;

export const SignatureAssetTypeEnum = z.enum(['SIGNATURE', 'STAMP', 'SEAL']);
export type SignatureAssetType = z.infer<typeof SignatureAssetTypeEnum>;

export const DocumentActionTypeEnum = z.enum([
  'GENERATED',
  'FINALIZED',
  'PRINTED',
  'DOWNLOADED',
  'REPRINTED',
  'CANCELLED',
  'SUPERSEDED',
  'VERIFIED',
]);
export type DocumentActionType = z.infer<typeof DocumentActionTypeEnum>;

export const BulkJobStatusEnum = z.enum([
  'DRAFT',
  'QUEUED',
  'PROCESSING',
  'COMPLETED',
  'PARTIAL',
  'FAILED',
  'CANCELLED',
]);
export type BulkJobStatus = z.infer<typeof BulkJobStatusEnum>;

export const BulkItemStatusEnum = z.enum([
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'SKIPPED',
]);
export type BulkItemStatus = z.infer<typeof BulkItemStatusEnum>;

// Element Styles Schema
export const ElementStyleSchema = z.object({
  fontSize: z.number().min(6).max(72).optional(),
  fontFamily: z.string().max(50).optional(),
  color: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/).optional(),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  underline: z.boolean().optional(),
  alignment: z.enum(['left', 'center', 'right', 'justify']).optional(),
  marginTop: z.number().min(-100).max(500).optional(),
  marginBottom: z.number().min(-100).max(500).optional(),
  marginLeft: z.number().min(-100).max(500).optional(),
  marginRight: z.number().min(-100).max(500).optional(),
  lineHeight: z.number().min(0.5).max(3).optional(),
  width: z.number().min(1).max(2000).optional(),
  height: z.number().min(1).max(2000).optional(),
  borderWidth: z.number().min(0).max(20).optional(),
  borderColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/).optional(),
  backgroundColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/).optional(),
  lineWidth: z.number().min(0.5).max(20).optional(),
});
export type ElementStyle = z.infer<typeof ElementStyleSchema>;

export const TableColumnSchema = z.object({
  header: z.string().min(1).max(100),
  key: z.string().min(1).max(100),
  width: z.number().min(10).max(1000).optional(),
  align: z.enum(['left', 'center', 'right']).default('left'),
});
export type TableColumn = z.infer<typeof TableColumnSchema>;

export const LayoutElementSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    id: z.string().min(1).max(100),
    type: z.enum([
      'TEXT',
      'PARAGRAPH',
      'ROW',
      'TABLE',
      'IMAGE',
      'LINE',
      'QR_CODE',
      'SIGNATURE',
      'STAMP',
      'PAGE_BREAK',
    ]),
    content: z.string().max(50000).optional(),
    source: z.string().max(500).optional(),
    style: ElementStyleSchema.optional(),
    columns: z.array(TableColumnSchema).max(20).optional(),
    children: z.array(LayoutElementSchema).max(50).optional(),
    condition: z.string().max(255).optional(),
  })
);
export type LayoutElement = z.infer<typeof LayoutElementSchema>;

export const PageMarginsSchema = z.object({
  top: z.number().min(0).max(200).default(36),
  bottom: z.number().min(0).max(200).default(36),
  left: z.number().min(0).max(200).default(36),
  right: z.number().min(0).max(200).default(36),
});

export const WatermarkConfigSchema = z.object({
  text: z.string().min(1).max(100),
  opacity: z.number().min(0.01).max(1).default(0.1),
  angle: z.number().min(-90).max(90).default(-45),
  fontSize: z.number().min(10).max(120).default(50),
  color: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/).default('#94a3b8'),
});

export const LayoutDefinitionSchema = z.object({
  margins: PageMarginsSchema.default({ top: 36, bottom: 36, left: 36, right: 36 }),
  elements: z.array(LayoutElementSchema).min(1).max(500),
  header: z
    .object({
      showOnFirstPage: z.boolean().default(true),
      elements: z.array(LayoutElementSchema).max(20).optional(),
    })
    .optional(),
  footer: z
    .object({
      showOnFirstPage: z.boolean().default(true),
      elements: z.array(LayoutElementSchema).max(20).optional(),
    })
    .optional(),
  watermark: WatermarkConfigSchema.optional(),
  styles: z.record(z.string(), ElementStyleSchema).optional(),
});
export type LayoutDefinition = z.infer<typeof LayoutDefinitionSchema>;

export const PageSettingsSchema = z.object({
  numberingPolicy: NumberingPolicyEnum.default('NUMBER_SERIES_ON_FINALIZE'),
  numberSeriesCode: z.string().max(50).optional().nullable(),
  pageSize: z.enum(['A4', 'A3', 'LETTER', 'LEGAL', 'CARD_CR80']).default('A4'),
  orientation: z.enum(['PORTRAIT', 'LANDSCAPE']).default('PORTRAIT'),
  defaultLanguage: z.string().max(10).default('en'),
});
export type PageSettings = z.infer<typeof PageSettingsSchema>;

// API DTOs
export const CreateTemplateSchema = z.object({
  code: z.string().min(2).max(50).regex(/^[A-Z0-9_-]+$/),
  name: z.string().min(2).max(150),
  documentType: DocumentTypeEnum,
  category: DocumentCategoryEnum,
  pageSize: z.string().max(20).default('A4'),
  orientation: z.enum(['PORTRAIT', 'LANDSCAPE']).default('PORTRAIT'),
  language: z.string().max(10).default('en'),
  numberingPolicy: NumberingPolicyEnum.default('NUMBER_SERIES_ON_FINALIZE'),
  numberSeriesCode: z.string().max(50).optional().nullable(),
  initialLayout: LayoutDefinitionSchema.optional(),
});
export type CreateTemplateDto = z.infer<typeof CreateTemplateSchema>;

export const UpdateTemplateSchema = z.object({
  name: z.string().min(2).max(150).optional(),
  category: DocumentCategoryEnum.optional(),
  pageSize: z.string().max(20).optional(),
  orientation: z.enum(['PORTRAIT', 'LANDSCAPE']).optional(),
  language: z.string().max(10).optional(),
  status: TemplateStatusEnum.optional(),
  numberingPolicy: NumberingPolicyEnum.optional(),
  numberSeriesCode: z.string().max(50).optional().nullable(),
});
export type UpdateTemplateDto = z.infer<typeof UpdateTemplateSchema>;

export const CreateTemplateVersionSchema = z.object({
  layoutDefinition: LayoutDefinitionSchema,
  contentDefinition: z.any().optional(),
  variableSchema: z.any().optional(),
  styleDefinition: z.any().optional(),
  pageSettings: PageSettingsSchema.optional(),
  changeSummary: z.string().max(255).optional(),
  isPublished: z.boolean().default(false),
});
export type CreateTemplateVersionDto = z.infer<typeof CreateTemplateVersionSchema>;

export const GenerateDocumentSchema = z.object({
  templateId: z.string().uuid(),
  templateVersionId: z.string().uuid().optional(),
  sourceType: z.string().min(1).max(50),
  sourceId: z.string().uuid(),
  recipientType: z.string().max(50).optional(),
  recipientId: z.string().uuid().optional(),
  language: z.string().max(10).default('en'),
  options: z
    .object({
      customVariables: z.record(z.string(), z.any()).optional(),
      autoFinalize: z.boolean().default(false),
      reason: z.string().max(255).optional(),
    })
    .optional(),
});
export type GenerateDocumentDto = z.infer<typeof GenerateDocumentSchema>;

export const CancelDocumentSchema = z.object({
  reason: z.string().min(3).max(500),
});
export type CancelDocumentDto = z.infer<typeof CancelDocumentSchema>;

export const CreateBulkJobSchema = z.object({
  templateId: z.string().uuid(),
  templateVersionId: z.string().uuid().optional(),
  sourceType: z.string().min(1).max(50),
  sourceIds: z.array(z.string().uuid()).min(1).max(500),
  autoFinalize: z.boolean().default(false),
  options: z.record(z.string(), z.any()).optional(),
});
export type CreateBulkJobDto = z.infer<typeof CreateBulkJobSchema>;

export const CreateSignatureAssetSchema = z.object({
  name: z.string().min(2).max(150),
  assetType: SignatureAssetTypeEnum,
  storageKey: z.string().min(1).max(500),
  ownerEmployeeId: z.string().uuid().optional().nullable(),
  designationLabel: z.string().max(100).optional().nullable(),
  isActive: z.boolean().default(true),
});
export type CreateSignatureAssetDto = z.infer<typeof CreateSignatureAssetSchema>;
