import { useTranslation } from 'react-i18next';
import { useRoles, useDeleteRole } from '../../../lib/api/roles';
import { Plus, Edit, Trash2, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function RolesList() {
  const { t } = useTranslation('common');
  const { data: roles, isLoading } = useRoles();
  const deleteRole = useDeleteRole();

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this role?')) {
      await deleteRole.mutateAsync(id);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t('admin.roles.list')}</h1>
        <Link
          to="/admin/roles/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
        >
          <Plus size={20} className="mr-2" />
          {t('admin.roles.new')}
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-4 font-medium text-gray-600">{t('admin.roles.name')}</th>
                <th className="text-left p-4 font-medium text-gray-600">Type</th>
                <th className="text-left p-4 font-medium text-gray-600">Permissions</th>
                <th className="text-left p-4 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {roles?.map((role) => (
                <tr key={role.id} className="border-b hover:bg-gray-50">
                  <td className="p-4 font-medium flex items-center">
                    <Shield className="mr-2 text-gray-400" size={18} />
                    {role.name}
                  </td>
                  <td className="p-4">
                    {role.is_system ? (
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                        System
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                        Custom
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-gray-500">{role.permissions.length} assigned</td>
                  <td className="p-4 flex space-x-2">
                    <Link
                      to={`/admin/roles/${role.id}/edit`}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Edit size={18} />
                    </Link>
                    {!role.is_system && (
                      <button
                        onClick={() => handleDelete(role.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
