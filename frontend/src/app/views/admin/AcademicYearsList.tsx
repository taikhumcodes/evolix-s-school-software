import { useTranslation } from 'react-i18next';
import { useAcademicYears } from '../../../lib/api/academic-years';
import { Plus, Edit, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTenant } from '../../../core/tenancy/TenantContext';
import { useAuth } from '../../../core/auth/AuthContext';

export default function AcademicYearsList() {
  const { t } = useTranslation('common');
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const currentSchoolId = currentTenant?.schoolId || user?.school_id || '';
  const { data: years, isLoading } = useAcademicYears(currentSchoolId);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">{t('admin.academicYears.list')}</h1>
          <p className="text-xs text-zinc-500 mt-1">Manage school terms and current academic session</p>
        </div>
        <Link
          to="/admin/academic-years/new"
          className="bg-mehndi-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-mehndi-700 flex items-center justify-center gap-2 shadow-sm transition-colors w-fit"
        >
          <Plus size={18} />
          {t('admin.academicYears.new')}
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-zinc-500">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr>
                  <th className="text-left p-4 font-semibold text-zinc-600">
                    {t('admin.academicYears.name')}
                  </th>
                  <th className="text-left p-4 font-semibold text-zinc-600">
                    {t('admin.academicYears.startDate')}
                  </th>
                  <th className="text-left p-4 font-semibold text-zinc-600">
                    {t('admin.academicYears.endDate')}
                  </th>
                  <th className="text-left p-4 font-semibold text-zinc-600">Status</th>
                  <th className="text-left p-4 font-semibold text-zinc-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {years?.map((year) => (
                  <tr key={year.id} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="p-4 font-medium text-zinc-900 flex items-center">
                      <Calendar className="mr-2 text-zinc-400 shrink-0" size={18} />
                      <span className="whitespace-nowrap">{year.name}</span>
                    </td>
                    <td className="p-4 text-zinc-600 whitespace-nowrap">{year.start_date}</td>
                    <td className="p-4 text-zinc-600 whitespace-nowrap">{year.end_date}</td>
                    <td className="p-4 space-x-2 whitespace-nowrap">
                      {year.is_current && (
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-semibold">
                          Current
                        </span>
                      )}
                      {year.is_closed && (
                        <span className="px-2.5 py-1 bg-zinc-100 text-zinc-700 rounded-full text-xs font-semibold">
                          Closed
                        </span>
                      )}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <Link
                        to={`/admin/academic-years/${year.id}/edit`}
                        className="text-mehndi-600 hover:text-mehndi-800 font-semibold p-1 rounded inline-flex items-center"
                        title="Edit Academic Year"
                      >
                        <Edit size={18} />
                      </Link>
                    </td>
                  </tr>
                ))}
                {(!years || years.length === 0) && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-zinc-500">
                      No academic years found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
