import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuditLogs } from '../../../lib/api/audit-logs';
import { Search } from 'lucide-react';

export default function AuditLogsList() {
  const { t } = useTranslation('common');
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');

  const { data, isLoading } = useAuditLogs(page, 50, entityType, action);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t('admin.auditLogs.title')}</h1>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Filter by entity type..."
              className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={entityType}
              onChange={(e) => {
                setEntityType(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Filter by action..."
              className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 font-medium text-gray-600">
                    {t('admin.auditLogs.date')}
                  </th>
                  <th className="text-left p-4 font-medium text-gray-600">
                    {t('admin.auditLogs.action')}
                  </th>
                  <th className="text-left p-4 font-medium text-gray-600">
                    {t('admin.auditLogs.entity')}
                  </th>
                  <th className="text-left p-4 font-medium text-gray-600">Entity ID</th>
                  <th className="text-left p-4 font-medium text-gray-600">
                    {t('admin.auditLogs.user')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data?.items.map((log) => (
                  <tr key={log.id} className="border-b hover:bg-gray-50">
                    <td className="p-4 text-gray-500">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="p-4 font-medium">{log.action}</td>
                    <td className="p-4 text-gray-600">{log.entity_type}</td>
                    <td className="p-4 text-gray-500 font-mono text-xs">{log.entity_id || '-'}</td>
                    <td className="p-4 text-gray-600">{log.user_id || 'System'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && (
          <div className="p-4 border-t flex justify-between items-center text-sm text-gray-600">
            <div>
              Showing {(page - 1) * 50 + 1} to {Math.min(page * 50, data.total)} of {data.total}{' '}
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
