import { PrismaClient, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { BadRequestError, ForbiddenError } from '../../lib/errors.js';
import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';

const execAsync = util.promisify(exec);

export class PlatformService {
  static async getOverview(tenantId: string) {
    const [schoolsCount, usersCount, storageUsed] = await Promise.all([
      prisma.school.count({ where: { tenantId } }),
      prisma.user.count({ where: { tenantId } }),
      // Mock storage used for now since actual file storage calculation might require cloud calls
      Promise.resolve(1024 * 1024 * 500) // 500MB mock
    ]);

    return {
      version: process.env.npm_package_version || '1.0.0',
      schoolsCount,
      usersCount,
      storageUsed,
    };
  }

  static async getBasicHealth() {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', db: 'connected' };
    } catch (error) {
      return { status: 'error', db: 'disconnected' };
    }
  }

  static async getDetailedHealth(tenantId: string) {
    const basic = await this.getBasicHealth();
    
    // Check actual job systems
    const recentFailedJobs = await prisma.bulkDocumentJob.count({
      where: {
        tenantId,
        status: 'FAILED',
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    });

    const activeJobs = await prisma.bulkDocumentJob.count({
      where: {
        tenantId,
        status: { in: ['PROCESSING', 'QUEUED'] }
      }
    });

    return {
      ...basic,
      jobs: {
        healthy: recentFailedJobs === 0,
        recentFailures: recentFailedJobs,
        active: activeJobs
      },
      system: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage()
      }
    };
  }

  static async getAuditLogs(tenantId: string, schoolId?: string, limit = 50, offset = 0) {
    const filters = schoolId ? Prisma.sql`AND "school_id" = ${schoolId}::uuid` : Prisma.sql``;
    
    const logs = await prisma.$queryRaw<any[]>`
      SELECT * FROM "audit_logs"
      WHERE "tenant_id" = ${tenantId}::uuid
      ${filters}
      ORDER BY "created_at" DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return logs;
  }

  static async initiateExport(tenantId: string, schoolId: string | undefined, userId: string, datasets: string[]) {
    // Generate JSON manifest
    const exportRecord = await prisma.dataExport.create({
      data: {
        tenantId,
        schoolId,
        exportVersion: '1.0',
        appVersion: process.env.npm_package_version || '1.0.0',
        status: 'PROCESSING',
        includedDatasets: datasets,
        createdBy: userId,
        startedAt: new Date(),
      }
    });

    // Mock background job for export creation.
    // In reality this would dispatch to a queue.
    setTimeout(async () => {
      try {
        await prisma.dataExport.update({
          where: { id: exportRecord.id },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            privateStorageReference: 'exports/' + tenantId + '/' + exportRecord.id + '.zip',
            sizeBytes: 1024 * 1024 * 5, // 5MB mock
            checksum: 'mock-checksum'
          }
        });
      } catch (err) {
        console.error('Export failed', err);
      }
    }, 5000);

    return exportRecord;
  }

  static async initiateBackup(tenantId: string, userId: string, type: 'FULL' | 'SCHEMA_ONLY' | 'DATA_ONLY') {
    // We only trigger this if the user is a superadmin, which is handled in controller/permissions
    const backupRecord = await prisma.backupRecord.create({
      data: {
        tenantId, // Can be null if system-wide
        type,
        status: 'IN_PROGRESS',
        createdBy: userId,
        startedAt: new Date(),
      }
    });

    // Run pg_dump safely using child_process.execFile avoiding bash shell injection.
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error('Database URL not configured');
    
    const pgDumpArgs: string[] = [];
    if (type === 'SCHEMA_ONLY') pgDumpArgs.push('--schema-only');
    if (type === 'DATA_ONLY') pgDumpArgs.push('--data-only');
    pgDumpArgs.push('--dbname', dbUrl.split('?')[0]);
    
    const backupDir = path.join(process.cwd(), 'storage', 'backups');
    fs.mkdirSync(backupDir, { recursive: true });
    
    const fileName = `${backupRecord.id}.sql`;
    const filePath = path.join(backupDir, fileName);
    pgDumpArgs.push('--file', filePath);

    // Run asynchronously
    setTimeout(async () => {
      try {
        const execFileAsync = util.promisify(execFile);
        const pgDumpExe = process.platform === 'win32' 
          ? 'C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe' 
          : 'pg_dump';
        await execFileAsync(pgDumpExe, pgDumpArgs);
        
        const stats = fs.statSync(filePath);
        console.log(`[BackupService] Backup completed. File: ${filePath}, Size: ${stats.size} bytes`);
        
        await prisma.backupRecord.update({
          where: { id: backupRecord.id },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            privateStorageReference: `backups/${fileName}`,
            sizeBytes: stats.size
          }
        });
      } catch (err) {
        console.error('[BackupService] Backup failed', err);
        await prisma.backupRecord.update({
          where: { id: backupRecord.id },
          data: { status: 'FAILED', completedAt: new Date() }
        });
      }
    }, 0);

    return backupRecord;
  }

  static async restorePreflight(backupId: string) {
    const backup = await prisma.backupRecord.findUnique({ where: { id: backupId } });
    if (!backup) throw new BadRequestError('Backup not found');
    if (backup.status !== 'COMPLETED') throw new BadRequestError('Backup is not complete');

    // Simulate preflight check
    return {
      safe: true,
      warnings: [],
      affectedTables: ['tenants', 'schools', 'users', 'student_enrollments'],
      estimatedDowntimeMinutes: 5
    };
  }
}
