import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { DatasetRegistry, ReportDataset } from './dataset.registry.js';
import { BadRequestError, ForbiddenError } from '../../lib/errors.js';

export class ReportsService {
  static async executeReport(
    tenantId: string,
    schoolId: string | undefined,
    userPermissions: string[],
    payload: {
      dataset: string;
      dimensions: string[];
      metrics: string[];
      filters: any[];
      sort: any[];
      limit: number;
      offset: number;
    }
  ) {
    const dataset = DatasetRegistry[payload.dataset];
    if (!dataset) {
      throw new BadRequestError('Invalid dataset');
    }

    // RBAC Check
    const hasPermission = dataset.requiredPermissions.every(p => userPermissions.includes(p));
    if (!hasPermission) {
      throw new ForbiddenError('Missing required permissions for this dataset');
    }

    // Validate dimensions and metrics
    const selectedDims = payload.dimensions.map(id => {
      const dim = dataset.dimensions.find(d => d.id === id);
      if (!dim) throw new BadRequestError(`Invalid dimension: ${id}`);
      return dim;
    });

    const selectedMetrics = payload.metrics.map(id => {
      const met = dataset.metrics.find(m => m.id === id);
      if (!met) throw new BadRequestError(`Invalid metric: ${id}`);
      return met;
    });

    if (selectedDims.length === 0 && selectedMetrics.length === 0) {
      throw new BadRequestError('Must select at least one dimension or metric');
    }

    // Build SELECT clause securely using known dbFields
    const selectParts: string[] = [];
    selectedDims.forEach(d => {
      selectParts.push(`${d.dbField} as "${d.id}"`);
    });

    selectedMetrics.forEach(m => {
      let agg = '';
      if (m.type === 'sum') agg = `COALESCE(SUM(${m.dbField}), 0)`;
      else if (m.type === 'count') agg = `COUNT(${m.dbField})`;
      else if (m.type === 'avg') agg = `AVG(${m.dbField})`;
      else if (m.type === 'min') agg = `MIN(${m.dbField})`;
      else if (m.type === 'max') agg = `MAX(${m.dbField})`;
      selectParts.push(`${agg} as "${m.id}"`);
    });

    const selectClause = selectParts.join(', ');

    // Build WHERE clause
    const whereConditions: Prisma.Sql[] = [];
    // Strict Tenant Isolation
    // Assuming the base table of every dataset has an alias or is handled properly. 
    // We will enforce that the baseQuery has the main table aliased appropriately, or we can just inject tenant_id if all tables have it.
    // For safety, the query building needs to know the base table alias. Let's assume 'i' or 'se' or 'pr'.
    // To be safe and generic, we will rely on a generic replacement or just standard CTE filtering if possible, but actually we can just find the alias.
    // Let's assume the first word after FROM in baseQuery is "table_name" alias.
    
    // Safer approach: define a base alias in the dataset registry, but we don't have it.
    // We will just append the WHERE to the first table. Since we can't easily parse SQL, we should just enforce `tenant_id = ${tenantId}` on the base table.
    // Given the baseQuery starts with `FROM "table" alias`, we can extract the alias.
    const match = dataset.baseQuery.match(/FROM\s+"[^"]+"\s+(\w+)/i);
    const baseAlias = match ? match[1] : '';
    
    if (baseAlias) {
      whereConditions.push(Prisma.sql`${Prisma.raw(baseAlias)}."tenant_id" = ${tenantId}::uuid`);
      if (schoolId) {
        whereConditions.push(Prisma.sql`${Prisma.raw(baseAlias)}."school_id" = ${schoolId}::uuid`);
      }
    } else {
      whereConditions.push(Prisma.sql`"tenant_id" = ${tenantId}::uuid`);
      if (schoolId) {
        whereConditions.push(Prisma.sql`"school_id" = ${schoolId}::uuid`);
      }
    }

    // Filter Building
    for (const filter of payload.filters) {
      const dim = dataset.dimensions.find(d => d.id === filter.id);
      if (!dim) throw new BadRequestError(`Invalid filter dimension: ${filter.id}`);
      
      const field = Prisma.raw(dim.dbField);
      
      switch (filter.operator) {
        case 'equals':
          whereConditions.push(Prisma.sql`${field} = ${filter.value}`);
          break;
        case 'not_equals':
          whereConditions.push(Prisma.sql`${field} != ${filter.value}`);
          break;
        case 'contains':
          whereConditions.push(Prisma.sql`${field} ILIKE ${'%' + filter.value + '%'}`);
          break;
        case 'greater_than':
          whereConditions.push(Prisma.sql`${field} > ${filter.value}`);
          break;
        case 'less_than':
          whereConditions.push(Prisma.sql`${field} < ${filter.value}`);
          break;
        case 'in':
          if (!Array.isArray(filter.value) || filter.value.length === 0) {
             throw new BadRequestError(`Filter 'in' requires a non-empty array for value`);
          }
          whereConditions.push(Prisma.sql`${field} IN (${Prisma.join(filter.value)})`);
          break;
      }
    }

    const whereClause = whereConditions.length > 0 
      ? Prisma.sql`WHERE ${Prisma.join(whereConditions, ' AND ')}` 
      : Prisma.empty;

    // Group By
    const groupByParts = selectedDims.map(d => Prisma.raw(d.dbField));
    const groupByClause = groupByParts.length > 0 
      ? Prisma.sql`GROUP BY ${Prisma.join(groupByParts, ', ')}` 
      : Prisma.empty;

    // Sort Building
    const sortConditions: Prisma.Sql[] = [];
    for (const sort of payload.sort) {
      const dim = dataset.dimensions.find(d => d.id === sort.id);
      const met = dataset.metrics.find(m => m.id === sort.id);
      const field = dim ? dim.dbField : (met ? met.id : null); // metrics are aliased, dimensions use dbField
      
      if (!field) throw new BadRequestError(`Invalid sort field: ${sort.id}`);
      
      const dir = sort.direction === 'desc' ? Prisma.raw('DESC') : Prisma.raw('ASC');
      sortConditions.push(Prisma.sql`${Prisma.raw(field === met?.id ? `"${field}"` : field)} ${dir}`);
    }

    const orderClause = sortConditions.length > 0 
      ? Prisma.sql`ORDER BY ${Prisma.join(sortConditions, ', ')}` 
      : Prisma.empty;

    const limitClause = Prisma.sql`LIMIT ${payload.limit} OFFSET ${payload.offset}`;

    // Combine Query
    const query = Prisma.sql`
      SELECT ${Prisma.raw(selectClause)}
      ${Prisma.raw(dataset.baseQuery)}
      ${whereClause}
      ${groupByClause}
      ${orderClause}
      ${limitClause}
    `;

    // console.log("Executing Query:", query.text, query.values);
    const results = await prisma.$queryRaw(query);

    return results;
  }

  static async saveReport(tenantId: string, schoolId: string | undefined, userId: string, data: any) {
    return await prisma.savedReport.create({
      data: {
        tenantId,
        schoolId,
        createdBy: userId,
        name: data.name,
        description: data.description,
        dataset: data.dataset,
        dimensionsJson: data.dimensions || [],
        metricsJson: data.metrics || [],
        filtersJson: data.filters || [],
        sortJson: data.sort || [],
        visualization: data.visualization || 'TABLE',
        visibility: data.visibility || 'PRIVATE',
      }
    });
  }

  static async listSavedReports(tenantId: string, schoolId: string | undefined, userId: string) {
    return await prisma.savedReport.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
        OR: [
          { visibility: 'SCHOOL_SHARED', schoolId: schoolId || undefined },
          { createdBy: userId }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async getSavedReport(id: string, tenantId: string, userId: string) {
    const report = await prisma.savedReport.findFirst({
      where: {
        id,
        tenantId,
        status: 'ACTIVE'
      }
    });

    if (!report) throw new BadRequestError('Report not found');
    
    // Check visibility
    if (report.visibility === 'PRIVATE' && report.createdBy !== userId) {
      throw new ForbiddenError('Access denied to private report');
    }

    return report;
  }

  static async deleteSavedReport(id: string, tenantId: string, userId: string) {
    const report = await this.getSavedReport(id, tenantId, userId);
    if (report.createdBy !== userId) {
      throw new ForbiddenError('Only the creator can delete this report');
    }

    return await prisma.savedReport.update({
      where: { id },
      data: { status: 'ARCHIVED' }
    });
  }
}
