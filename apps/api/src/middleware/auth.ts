import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { verifyJwtToken, AccessTokenPayload } from '../lib/crypto.js';
import { UnauthorizedError, ForbiddenError } from '../lib/errors.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
  tenantId: string;
  roles: { id: string; name: string; isSystem: boolean }[];
  permissions: Set<string>;
  schools: { id: string; name: string; code: string }[];
  isSuperadmin: boolean;
  selectedSchoolId?: string;
  mustChangePassword: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      schoolId?: string;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Could not validate credentials'));
  }

  const token = authHeader.substring(7).trim();
  try {
    const payload = verifyJwtToken<AccessTokenPayload>(token);
    if (!payload || payload.type !== 'access' || !payload.sub) {
      return next(new UnauthorizedError('Could not validate credentials'));
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
        userSchools: {
          include: {
            school: true,
          },
        },
      },
    });

    if (!user || user.isDeleted) {
      return next(new UnauthorizedError('Could not validate credentials'));
    }

    if (!user.isActive) {
      return next(new UnauthorizedError('Inactive user'));
    }

    const permissions = new Set<string>();
    let isSuperadmin = false;
    const roles: { id: string; name: string; isSystem: boolean }[] = [];

    for (const ur of user.userRoles) {
      roles.push({
        id: ur.role.id,
        name: ur.role.name,
        isSystem: ur.role.isSystem,
      });

      if (ur.role.name.toLowerCase() === 'superadmin') {
        isSuperadmin = true;
      }

      for (const rp of ur.role.rolePermissions) {
        permissions.add(rp.permission.code.toLowerCase());
      }
    }

    const schools = user.userSchools.map((us) => ({
      id: us.school.id,
      name: us.school.name,
      code: us.school.code,
    }));

    const requestedSchoolId =
      (req.headers['x-school-id'] as string) ||
      (req.query.school_id as string) ||
      (req.body && typeof req.body === 'object' ? req.body.school_id : undefined);

    let selectedSchoolId: string | undefined = undefined;
    if (requestedSchoolId && typeof requestedSchoolId === 'string' && requestedSchoolId.trim()) {
      const cleanRequested = requestedSchoolId.trim();
      const hasAccess = schools.some((s) => s.id === cleanRequested);
      if (hasAccess || isSuperadmin) {
        selectedSchoolId = cleanRequested;
      }
    }

    if (!selectedSchoolId && schools.length > 0) {
      selectedSchoolId = schools[0].id;
    }

    req.schoolId = selectedSchoolId;
    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      tenantId: user.tenantId,
      roles,
      permissions,
      schools,
      isSuperadmin,
      selectedSchoolId,
      mustChangePassword: user.mustChangePassword,
    };

    if (user.mustChangePassword) {
      const url = req.originalUrl || req.url;
      const isAllowed =
        url.includes('/auth/me') ||
        url.includes('/auth/logout') ||
        url.includes('/security/password') ||
        url.includes('/security/policy');
      if (!isAllowed) {
        return next(
          new ForbiddenError('Password change required before accessing application', {
            code: 'PASSWORD_CHANGE_REQUIRED',
          })
        );
      }
    }

    next();
  } catch (err) {
    return next(new UnauthorizedError('Could not validate credentials'));
  }
}
