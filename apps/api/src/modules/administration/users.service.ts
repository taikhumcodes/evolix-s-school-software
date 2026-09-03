import { prisma } from '../../lib/prisma.js';
import { hashPassword } from '../../lib/crypto.js';
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
  AppError,
} from '../../lib/errors.js';
import { writeAuditLog } from '../../services/audit.service.js';
import { AuthenticatedUser } from '../../middleware/auth.js';

export class UsersService {
  static async listUsers(tenantId: string) {
    const users = await prisma.user.findMany({
      where: {
        tenantId,
        isDeleted: false,
      },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const items = users.map((u) => ({
      id: u.id,
      email: u.email,
      first_name: u.firstName,
      last_name: u.lastName,
      is_active: u.isActive,
      roles: u.userRoles.map((ur) => ({
        id: ur.role.id,
        name: ur.role.name,
      })),
    }));

    return { items, total: items.length };
  }

  static async getUser(userId: string, tenantId: string) {
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        tenantId,
        isDeleted: false,
      },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      first_name: user.firstName,
      last_name: user.lastName,
      is_active: user.isActive,
      roles: user.userRoles.map((ur) => ({
        id: ur.role.id,
        name: ur.role.name,
      })),
    };
  }

  static async createUser(
    data: {
      email: string;
      password: string;
      first_name: string;
      last_name?: string | null;
      is_active?: boolean;
      role_ids?: string[];
    },
    currentUser: AuthenticatedUser
  ) {
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw new ValidationError('Email already registered');
    }

    const roleIds = data.role_ids || [];
    const roles = await prisma.role.findMany({
      where: {
        id: { in: roleIds },
        tenantId: currentUser.tenantId,
      },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
      },
    });

    // Privilege escalation guard
    if (!currentUser.isSuperadmin) {
      for (const role of roles) {
        for (const rp of role.rolePermissions) {
          if (!currentUser.permissions.has(rp.permission.code.toLowerCase())) {
            throw new ForbiddenError("Cannot assign roles with permissions you don't have");
          }
        }
      }
    }

    const hashedPassword = await hashPassword(data.password);

    // Ensure new user is associated with the school
    let defaultSchoolId: string | undefined = currentUser.schools?.[0]?.id;
    if (!defaultSchoolId) {
      const firstSchool = await prisma.school.findFirst({
        where: { tenantId: currentUser.tenantId, isDeleted: false },
      });
      defaultSchoolId = firstSchool?.id;
    }

    const newUser = await prisma.user.create({
      data: {
        tenantId: currentUser.tenantId,
        email: data.email,
        hashedPassword,
        firstName: data.first_name,
        lastName: data.last_name || null,
        isActive: data.is_active !== undefined ? data.is_active : true,
        userRoles: {
          create: roles.map((r) => ({
            roleId: r.id,
          })),
        },
        userSchools: defaultSchoolId
          ? {
              create: [{ schoolId: defaultSchoolId }],
            }
          : undefined,
      },
    });

    await writeAuditLog({
      tenantId: currentUser.tenantId,
      actorId: currentUser.id,
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: newUser.id,
      afterData: {
        email: newUser.email,
        first_name: newUser.firstName,
        last_name: newUser.lastName,
        is_active: newUser.isActive,
      },
    });

    return { id: newUser.id };
  }

  static async updateUser(
    userId: string,
    data: {
      email?: string;
      password?: string;
      first_name?: string;
      last_name?: string | null;
      is_active?: boolean;
      role_ids?: string[];
    },
    currentUser: AuthenticatedUser
  ) {
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        tenantId: currentUser.tenantId,
        isDeleted: false,
      },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const beforeData = {
      email: user.email,
      first_name: user.firstName,
      last_name: user.lastName,
      is_active: user.isActive,
    };

    // Handle role updates
    if (data.role_ids !== undefined) {
      const newRoles = await prisma.role.findMany({
        where: {
          id: { in: data.role_ids },
          tenantId: currentUser.tenantId,
        },
        include: {
          rolePermissions: {
            include: { permission: true },
          },
        },
      });

      // Privilege escalation check
      if (!currentUser.isSuperadmin) {
        for (const role of newRoles) {
          for (const rp of role.rolePermissions) {
            if (!currentUser.permissions.has(rp.permission.code.toLowerCase())) {
              throw new ForbiddenError("Cannot assign roles with permissions you don't have");
            }
          }
        }
      }

      const oldRoleIds = new Set(user.userRoles.map((ur) => ur.roleId));
      const newRoleIds = new Set(newRoles.map((r) => r.id));

      const added = [...newRoleIds].filter((id) => !oldRoleIds.has(id));
      const removed = [...oldRoleIds].filter((id) => !newRoleIds.has(id));

      await prisma.$transaction([
        prisma.userRole.deleteMany({
          where: { userId: user.id },
        }),
        prisma.userRole.createMany({
          data: newRoles.map((r) => ({
            userId: user.id,
            roleId: r.id,
          })),
        }),
      ]);

      if (added.length > 0) {
        await writeAuditLog({
          tenantId: currentUser.tenantId,
          actorId: currentUser.id,
          action: 'USER_ROLE_ASSIGNED',
          entityType: 'User',
          entityId: user.id,
          afterData: { assigned_roles: added },
        });
      }

      if (removed.length > 0) {
        await writeAuditLog({
          tenantId: currentUser.tenantId,
          actorId: currentUser.id,
          action: 'USER_ROLE_REMOVED',
          entityType: 'User',
          entityId: user.id,
          beforeData: { removed_roles: removed },
        });
      }
    }

    const updateFields: any = {};
    if (data.password) {
      updateFields.hashedPassword = await hashPassword(data.password);
    }
    if (data.email !== undefined) updateFields.email = data.email;
    if (data.first_name !== undefined) updateFields.firstName = data.first_name;
    if (data.last_name !== undefined) updateFields.lastName = data.last_name;

    if (data.is_active !== undefined && data.is_active !== user.isActive) {
      updateFields.isActive = data.is_active;
      const action = data.is_active ? 'USER_ACTIVATED' : 'USER_DEACTIVATED';
      await writeAuditLog({
        tenantId: currentUser.tenantId,
        actorId: currentUser.id,
        action,
        entityType: 'User',
        entityId: user.id,
      });
    }

    if (Object.keys(updateFields).length > 0) {
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: updateFields,
      });

      const afterData = {
        email: updated.email,
        first_name: updated.firstName,
        last_name: updated.lastName,
        is_active: updated.isActive,
      };

      await writeAuditLog({
        tenantId: currentUser.tenantId,
        actorId: currentUser.id,
        action: 'USER_UPDATED',
        entityType: 'User',
        entityId: user.id,
        beforeData,
        afterData,
      });
    }

    return { status: 'ok' };
  }

  static async deleteUser(userId: string, currentUser: AuthenticatedUser) {
    if (userId === currentUser.id) {
      throw new AppError('Cannot delete your own account', 400, 'BAD_REQUEST');
    }

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        tenantId: currentUser.tenantId,
        isDeleted: false,
      },
    });

    if (user) {
      await writeAuditLog({
        tenantId: currentUser.tenantId,
        actorId: currentUser.id,
        action: 'USER_DELETED',
        entityType: 'User',
        entityId: user.id,
        beforeData: { email: user.email, first_name: user.firstName },
      });

      await prisma.user.delete({
        where: { id: user.id },
      });
    }

    return { status: 'ok' };
  }
}
