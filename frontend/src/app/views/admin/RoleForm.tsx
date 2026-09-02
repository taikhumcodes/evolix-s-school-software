import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useRoles, useCreateRole, useUpdateRole, usePermissions } from '../../../lib/api/roles';

export default function RoleForm() {
  const { t } = useTranslation('common');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const { data: roles } = useRoles();
  const { data: permissions, isLoading: isLoadingPermissions } = usePermissions();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();

  const [name, setName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [isSystem, setIsSystem] = useState(false);

  useEffect(() => {
    if (isEditing && roles) {
      const role = roles.find((r) => r.id === id);
      if (role) {
        setName(role.name);
        setIsSystem(role.is_system);
        setSelectedPermissions(new Set(role.permissions.map((p) => p.id)));
      }
    }
  }, [isEditing, roles, id]);

  const togglePermission = (permId: string) => {
    if (isSystem) return; // Cannot edit system roles
    const newSelected = new Set(selectedPermissions);
    if (newSelected.has(permId)) {
      newSelected.delete(permId);
    } else {
      newSelected.add(permId);
    }
    setSelectedPermissions(newSelected);
  };

  const handleSave = async () => {
    try {
      const payload = {
        name,
        permission_ids: Array.from(selectedPermissions),
      };

      if (isEditing) {
        await updateRole.mutateAsync({ id, data: payload });
      } else {
        await createRole.mutateAsync(payload);
      }
      navigate('/admin/roles');
    } catch (error) {
      console.error('Failed to save role', error);
    }
  };

  if (isLoadingPermissions) return <div className="p-8 text-center">Loading...</div>;

  // Group permissions by prefix (e.g. USERS_VIEW -> USERS)
  const groupedPermissions =
    permissions?.reduce(
      (acc, perm) => {
        const group = perm.code.split('_')[0];
        if (!acc[group]) acc[group] = [];
        acc[group].push(perm);
        return acc;
      },
      {} as Record<string, typeof permissions>
    ) || {};

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{isEditing ? 'Edit Role' : t('admin.roles.new')}</h1>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('admin.roles.name')}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSystem}
            className="w-full max-w-md px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
        </div>

        <div>
          <h2 className="text-lg font-medium mb-4">{t('admin.roles.permissions')}</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(groupedPermissions).map(([group, perms]) => (
              <div key={group} className="border rounded-md p-4">
                <h3 className="font-semibold mb-3 border-b pb-2">{group}</h3>
                <div className="space-y-2">
                  {perms.map((perm) => (
                    <label key={perm.id} className="flex items-start space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedPermissions.has(perm.id)}
                        onChange={() => togglePermission(perm.id)}
                        disabled={isSystem}
                        className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                      />
                      <div>
                        <div className="text-sm font-medium">{perm.code}</div>
                        {perm.description && (
                          <div className="text-xs text-gray-500">{perm.description}</div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end space-x-4 pt-4 border-t">
          <button
            type="button"
            onClick={() => navigate('/admin/roles')}
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            {t('common.actions.cancel')}
          </button>
          {!isSystem && (
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {t('common.actions.save')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
