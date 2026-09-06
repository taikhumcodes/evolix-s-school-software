import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Home,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MapPin,
} from 'lucide-react';
import { ParentsNav } from '../guardians/ParentsNav';
import { useFamilies } from '../../../lib/api/families';

export default function FamiliesList() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Number(searchParams.get('page')) || 1;
  const limit = Number(searchParams.get('limit')) || 20;
  const search = searchParams.get('search') || '';

  const { data: response, isLoading } = useFamilies({ page, limit, search });

  const handleSearch = (term: string) => {
    const updated = new URLSearchParams(searchParams);
    if (term.trim()) {
      updated.set('search', term.trim());
    } else {
      updated.delete('search');
    }
    updated.set('page', '1');
    setSearchParams(updated);
  };

  return (
    <div className="space-y-6 pb-12">
      <ParentsNav />

      {/* Search and Action Bar */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
          <input
            type="text"
            placeholder={t('parentsModule.families.searchPlaceholder', 'Search by family name, number, guardian, or student...')}
            defaultValue={search}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch((e.target as HTMLInputElement).value);
            }}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-zinc-200 bg-zinc-50/50 focus:bg-white focus:outline-none focus:border-mehndi-500"
          />
        </div>

        <Link
          to="/families/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold shadow-sm transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t('parentsModule.actions.createFamily', 'New Family Household')}</span>
        </Link>
      </div>

      {/* Family Directory Table */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-xs text-zinc-400">Loading family households...</div>
        ) : (response?.data?.length ?? 0) === 0 ? (
          <div className="py-20 text-center space-y-3">
            <Home className="w-10 h-10 text-zinc-300 mx-auto" />
            <p className="text-sm font-semibold text-zinc-700">No family households found</p>
            <p className="text-xs text-zinc-400">
              Create a family household to group siblings and shared guardians together.
            </p>
            <Link
              to="/families/new"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 text-white text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Household</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/50 text-zinc-500 font-bold">
                  <th className="py-3 px-4">Family Household</th>
                  <th className="py-3 px-4">Primary Guardian</th>
                  <th className="py-3 px-4">Children / Siblings</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {response?.data.map((family) => (
                  <tr key={family.id} className="hover:bg-zinc-50/70 transition-colors">
                    {/* Family Name & Number */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 font-extrabold text-xs flex items-center justify-center border border-blue-200/60 shrink-0">
                          <Home className="w-4 h-4" />
                        </div>
                        <div>
                          <Link
                            to={`/families/${family.id}`}
                            className="font-bold text-zinc-900 hover:text-blue-700 transition-colors"
                          >
                            {family.familyName}
                          </Link>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600">
                              {family.familyNumber}
                            </span>
                            <span className="text-[10px] text-zinc-400">
                              • {family.guardiansCount ?? 0} guardians
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Primary Guardian */}
                    <td className="py-3.5 px-4 text-zinc-700">
                      {family.primaryGuardian ? (
                        <div>
                          <Link
                            to={`/guardians/${family.primaryGuardian.id}`}
                            className="font-semibold text-zinc-800 hover:text-mehndi-700"
                          >
                            {family.primaryGuardian.firstName} {family.primaryGuardian.lastName}
                          </Link>
                          <p className="text-[11px] text-zinc-400 mt-0.5">
                            {family.primaryGuardian.phone}
                          </p>
                        </div>
                      ) : (
                        <span className="text-zinc-400 italic">Not assigned</span>
                      )}
                    </td>

                    {/* Children / Siblings */}
                    <td className="py-3.5 px-4">
                      {(family.studentNames?.length ?? 0) === 0 ? (
                        <span className="text-zinc-400 italic">No students linked</span>
                      ) : (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {family.studentNames?.map((name, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 text-[11px] font-medium"
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Location */}
                    <td className="py-3.5 px-4 text-zinc-500 text-[11px]">
                      {family.city ? (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-zinc-400" />
                          <span>
                            {family.city}
                            {family.state ? `, ${family.state}` : ''}
                          </span>
                        </div>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to={`/families/${family.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-zinc-600 hover:text-zinc-900 transition-colors font-semibold"
                      >
                        <span>View</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {response && response.meta.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-zinc-200 flex items-center justify-between text-xs text-zinc-500 bg-zinc-50/50">
            <span>
              Showing {((page - 1) * limit) + 1} to{' '}
              {Math.min(page * limit, response.meta.total)} of {response.meta.total} records
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => {
                  const updated = new URLSearchParams(searchParams);
                  updated.set('page', String(page - 1));
                  setSearchParams(updated);
                }}
                className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-3 font-semibold text-zinc-700">
                {page} / {response.meta.totalPages}
              </span>
              <button
                disabled={page >= response.meta.totalPages}
                onClick={() => {
                  const updated = new URLSearchParams(searchParams);
                  updated.set('page', String(page + 1));
                  setSearchParams(updated);
                }}
                className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-40"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
