import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUsers } from '../../../lib/api/users';
import { Search, Plus, Edit, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function UsersList() {
  const { t } = useTranslation('common');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useUsers(page, 25, search);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t('admin.users.list')}</h1>
        <Link
          to="/admin/users/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
        >
          <Plus size={20} className="mr-2" />
          {t('admin.users.new')}
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder={t('common.actions.search')}
              className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 font-medium text-gray-600">
                    {t('admin.users.firstName')}
                  </th>
                  <th className="text-left p-4 font-medium text-gray-600">
                    {t('admin.users.lastName')}
                  </th>
                  <th className="text-left p-4 font-medium text-gray-600">
                    {t('admin.users.email')}
                  </th>
                  <th className="text-left p-4 font-medium text-gray-600">
                    {t('admin.users.status')}
                  </th>
                  <th className="text-left p-4 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.items.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    <td className="p-4">{user.first_name}</td>
                    <td className="p-4">{user.last_name}</td>
                    <td className="p-4">{user.email}</td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                      >
                        {user.is_active ? t('admin.users.active') : t('admin.users.inactive')}
                      </span>
                    </td>
                    <td className="p-4 flex space-x-2">
                      <Link
                        to={`/admin/users/${user.id}/edit`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit size={18} />
                      </Link>
                      <button className="text-red-600 hover:text-red-800">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && (
          <div className="p-4 border-t flex justify-between items-center text-sm text-gray-600">
            <div>
              Showing {(page - 1) * 25 + 1} to Math.min(page * 25, data.total) of {data.total}{' '}
              entries
            </div>
            <div className="flex space-x-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={page === data.pages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
