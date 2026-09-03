import { prisma } from '../../lib/prisma.js';
import { NotFoundError, ForbiddenError } from '../../lib/errors.js';
import { writeAuditLog } from '../../services/audit.service.js';
import { AuthenticatedUser } from '../../middleware/auth.js';

export class RolesService {
  static async listRoles(tenantId: string) {
    const roles = await prisma.role.findMany({
      where: { tenantId },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return roles.map((r) => ({
      id: r.id,
      name: r.name,
      is_system: r.isSystem,
      permissions: r.rolePermissions.map((rp) => ({
        id: rp.permission.id,
        code: rp.permission.code,
        description: rp.permission.description,
      })),
    }));
  }

  static async createRole(
    data: { name: string; permission_ids: string[] },
    currentUser: AuthenticatedUser
  ) {
    const permissions = await prisma.permission.findMany({
      where: { id: { in: data.permission_ids } },
    });

    const newRole = await prisma.role.create({
      data: {
        tenantId: currentUser.tenantId,
        name: data.name,
        isSystem: false,
        rolePermissions: {
          create: permissions.map((p) => ({
            permissionId: p.id,
          })),
        },
      },
    });

    await writeAuditLog({
      tenantId: currentUser.tenantId,
      actorId: currentUser.id,
      action: 'ROLE_CREATED',
      entityType: 'Role',
      entityId: newRole.id,
      afterData: {
        name: newRole.name,
        permissions: permissions.map((p) => p.code),
      },
    });

    return { id: newRole.id };
  }

  static async updateRole(
    roleId: string,
    data: { name?: string; permission_ids?: string[] },
    currentUser: AuthenticatedUser
  ) {
    const role = await prisma.role.findFirst({
      where: { id: roleId, tenantId: currentUser.tenantId },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
      },
    });

    if (!role) {
      throw new NotFoundError('Role not found');
    }

    if (role.isSystem) {
      throw new ForbiddenError('Cannot modify system roles');
    }

    if (data.name && data.name !== role.name) {
      await writeAuditLog({
        tenantId: currentUser.tenantId,
        actorId: currentUser.id,
        action: 'ROLE_UPDATED',
        entityType: 'Role',
        entityId: role.id,
        beforeData: { name: role.name },
        afterData: { name: data.name },
      });

      await prisma.role.update({
        where: { id: role.id },
        data: { name: data.name },
      });
    }

    if (data.permission_ids !== undefined) {
      const newPermissions = await prisma.permission.findMany({
        where: { id: { in: data.permission_ids } },
      });

      const oldCodes = role.rolePermissions.map((rp) => rp.permission.code).sort();
      const newCodes = newPermissions.map((p) => p.code).sort();

      if (JSON.stringify(oldCodes) !== JSON.stringify(newCodes)) {
        await prisma.$transaction([
          prisma.rolePermission.deleteMany({
            where: { roleId: role.id },
          }),
          prisma.rolePermission.createMany({
            data: newPermissions.map((p) => ({
              roleId: role.id,
              permissionId: p.id,
            })),
          }),
        ]);

        await writeAuditLog({
          tenantId: currentUser.tenantId,
          actorId: currentUser.id,
          action: 'ROLE_PERMISSIONS_CHANGED',
          entityType: 'Role',
          entityId: role.id,
          beforeData: { permissions: oldCodes },
          afterData: { permissions: newCodes },
        });
      }
    }

    return { status: 'ok' };
  }

  static async deleteRole(roleId: string, currentUser: AuthenticatedUser) {
    const role = await prisma.role.findFirst({
      where: { id: roleId, tenantId: currentUser.tenantId },
    });

    if (!role) {
      throw new NotFoundError('Role not found');
    }

    if (role.isSystem) {
      throw new ForbiddenError('Cannot delete system roles');
    }

    await writeAuditLog({
      tenantId: currentUser.tenantId,
      actorId: currentUser.id,
      action: 'ROLE_ARCHIVED',
      entityType: 'Role',
      entityId: role.id,
      beforeData: { name: role.name },
    });

    await prisma.role.delete({
      where: { id: role.id },
    });

    return { status: 'ok' };
  }
}
