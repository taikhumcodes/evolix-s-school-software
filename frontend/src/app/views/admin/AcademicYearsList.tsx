import { useTranslation } from 'react-i18next';
import { useAcademicYears } from '../../../lib/api/academic-years';
import { Plus, Edit, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
// Using a fixed school id for now. In a real app this would come from tenant context
const currentSchoolId = '11111111-1111-1111-1111-111111111111';

export default function AcademicYearsList() {
  const { t } = useTranslation('common');
  const { data: years, isLoading } = useAcademicYears(currentSchoolId);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t('admin.academicYears.list')}</h1>
        <Link
          to="/admin/academic-years/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
        >
          <Plus size={20} className="mr-2" />
          {t('admin.academicYears.new')}
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-4 font-medium text-gray-600">
                  {t('admin.academicYears.name')}
                </th>
                <th className="text-left p-4 font-medium text-gray-600">
                  {t('admin.academicYears.startDate')}
                </th>
                <th className="text-left p-4 font-medium text-gray-600">
                  {t('admin.academicYears.endDate')}
                </th>
                <th className="text-left p-4 font-medium text-gray-600">Status</th>
                <th className="text-left p-4 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {years?.map((year) => (
                <tr key={year.id} className="border-b hover:bg-gray-50">
                  <td className="p-4 font-medium flex items-center">
                    <Calendar className="mr-2 text-gray-400" size={18} />
                    {year.name}
                  </td>
                  <td className="p-4 text-gray-600">{year.start_date}</td>
                  <td className="p-4 text-gray-600">{year.end_date}</td>
                  <td className="p-4 space-x-2 flex">
                    {year.is_current && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                        Current
                      </span>
                    )}
                    {year.is_closed && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">
                        Closed
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <Link
                      to={`/admin/academic-years/${year.id}/edit`}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Edit size={18} />
                    </Link>
                  </td>
                </tr>
              ))}
              {(!years || years.length === 0) && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    No academic years found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
