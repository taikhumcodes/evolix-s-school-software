import { prisma } from '../../lib/prisma.js';
import {
  SECTION_FIELDS,
  SNAKE_TO_CAMEL,
  CAMEL_TO_SNAKE,
} from './configuration.constants.js';
import { NotFoundError, ForbiddenError } from '../../lib/errors.js';
import { AuthenticatedUser } from '../../middleware/auth.js';

export class ConfigurationService {
  static async resolveSchool(
    schoolId: string | undefined,
    tenantId: string,
    currentUser: AuthenticatedUser
  ) {
    let targetId = schoolId;
    if (!targetId || targetId === tenantId) {
      targetId = currentUser.selectedSchoolId || currentUser.schools[0]?.id;
      if (!targetId) {
        const firstSchool = await prisma.school.findFirst({
          where: { tenantId, isDeleted: false },
        });
        if (!firstSchool) {
          throw new NotFoundError('No school available');
        }
        targetId = firstSchool.id;
      }
    }

    const school = await prisma.school.findFirst({
      where: {
        id: targetId,
        tenantId,
        isDeleted: false,
      },
    });

    if (!school) {
      throw new NotFoundError('School not found');
    }

    // Verify user has access to school
    if (!currentUser.isSuperadmin) {
      const hasAccess = currentUser.schools.some((s) => s.id === school.id);
      if (!hasAccess) {
        throw new ForbiddenError('School access denied');
      }
    }

    return school;
  }

  static async getOrCreateConfig(tenantId: string, schoolId: string) {
    let config = await prisma.schoolConfiguration.findUnique({
      where: { schoolId },
    });

    if (!config) {
      config = await prisma.schoolConfiguration.create({
        data: {
          tenantId,
          schoolId,
        },
      });
    }

    return config;
  }

  static async getOrCreateBranding(tenantId: string, schoolId: string) {
    let branding = await prisma.brandingConfiguration.findUnique({
      where: { schoolId },
    });

    if (!branding) {
      branding = await prisma.brandingConfiguration.create({
        data: {
          tenantId,
          schoolId,
        },
      });
    }

    return branding;
  }

  static serializeConfig(config: any) {
    const values: Record<string, any> = {};
    for (const [camelKey, snakeKey] of Object.entries(CAMEL_TO_SNAKE)) {
      if (config[camelKey] !== undefined) {
        const val = config[camelKey];
        // Handle Decimal
        if (val && typeof val === 'object' && 'toNumber' in val) {
          values[snakeKey] = val.toNumber();
        } else {
          values[snakeKey] = val;
        }
      }
    }

    // Also include camelCase versions for universal client compatibility
    for (const [camelKey, val] of Object.entries(config)) {
      if (
        !['id', 'tenantId', 'schoolId', 'version', 'createdAt', 'updatedAt'].includes(camelKey)
      ) {
        if (!values[camelKey]) {
          if (val && typeof val === 'object' && 'toNumber' in (val as any)) {
            values[camelKey] = (val as any).toNumber();
          } else {
            values[camelKey] = val;
          }
        }
      }
    }

    return {
      id: config.id,
      school_id: config.schoolId,
      version: config.version,
      values,
    };
  }

  static serializeBranding(branding: any) {
    const values: Record<string, any> = {
      logo_file_id: branding.logoFileId,
      logo_storage_key: branding.logoStorageKey,
      logo_content_type: branding.logoContentType,
      logo_size: branding.logoSize,
      compact_logo_file_id: branding.compactLogoFileId,
      favicon_file_id: branding.faviconFileId,
      primary_print_color: branding.primaryPrintColor,
      accent_print_color: branding.accentPrintColor,
      letterhead_text: branding.letterheadText,
      footer_text: branding.footerText,
      version: branding.version,
    };

    return {
      id: branding.id,
      school_id: branding.schoolId,
      version: branding.version,
      values,
    };
  }
}
