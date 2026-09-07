import { z } from 'zod';

export const FilterOperatorSchema = z.enum(['equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'in']);

export const ReportFilterSchema = z.object({
  id: z.string().min(1),
  operator: FilterOperatorSchema,
  value: z.any()
}).strict();

export const ReportSortSchema = z.object({
  id: z.string().min(1),
  direction: z.enum(['asc', 'desc'])
}).strict();

export const CreateReportSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  dataset: z.string().min(1),
  dimensions: z.array(z.string().min(1)).max(10),
  metrics: z.array(z.string().min(1)).max(10),
  filters: z.array(ReportFilterSchema).max(20).default([]),
  sort: z.array(ReportSortSchema).max(5).default([]),
  visualization: z.enum(['TABLE', 'BAR', 'LINE', 'PIE']).default('TABLE'),
  visibility: z.enum(['PRIVATE', 'SCHOOL_SHARED']).default('PRIVATE')
}).strict();

export const ExecuteReportSchema = z.object({
  dataset: z.string().min(1),
  dimensions: z.array(z.string().min(1)).max(10),
  metrics: z.array(z.string().min(1)).max(10),
  filters: z.array(ReportFilterSchema).max(20).default([]),
  sort: z.array(ReportSortSchema).max(5).default([]),
  limit: z.number().int().min(1).max(1000).default(100),
  offset: z.number().int().min(0).default(0)
}).strict();
