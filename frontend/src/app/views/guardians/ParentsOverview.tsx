import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Users,
  Home,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Globe,
  ArrowRight,
  GitMerge,
  ExternalLink,
} from 'lucide-react';
import { ParentsNav } from './ParentsNav';
import { useGuardiansOverview, useGuardians } from '../../../lib/api/guardians';
import { useFamilies } from '../../../lib/api/families';
import { GuardianMergeModal } from './GuardianMergeModal';

export default function ParentsOverview() {
  const { t } = useTranslation();
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);

  const { data: overview, isLoading: isOverviewLoading } = useGuardiansOverview();
  const { data: recentGuardians, isLoading: isGuardiansLoading } = useGuardians({ limit: 5 });
  const { data: recentFamilies, isLoading: isFamiliesLoading } = useFamilies({ limit: 4 });

  return (
    <div className="space-y-6 pb-12">
      <ParentsNav onOpenMerge={() => setIsMergeModalOpen(true)} />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Guardians */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              {t('parentsModule.kpi.totalGuardians', 'Total Guardians')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-mehndi-50 text-mehndi-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-zinc-900 tracking-tight">
              {isOverviewLoading ? '—' : overview?.totalGuardians ?? 0}
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">
            {t('parentsModule.kpi.activeRecords', 'Active records')}
          </p>
        </div>

        {/* Total Families */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              {t('parentsModule.kpi.totalFamilies', 'Family Households')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Home className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-zinc-900 tracking-tight">
              {isOverviewLoading ? '—' : overview?.totalFamilies ?? 0}
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">
            {t('parentsModule.kpi.groupedHouseholds', 'Grouped households')}
          </p>
        </div>

        {/* Portal Access Active */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              {t('parentsModule.kpi.portalActive', 'Portal Active')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-zinc-900 tracking-tight">
              {isOverviewLoading ? '—' : overview?.portalAccessCount ?? 0}
            </span>
          </div>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">
            {overview && overview.totalGuardians > 0
              ? `${Math.round((overview.portalAccessCount / overview.totalGuardians) * 100)}% coverage`
              : '0% coverage'}
          </p>
        </div>

        {/* Portal Access Pending */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              {t('parentsModule.kpi.portalPending', 'No Portal Login')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-zinc-100 text-zinc-600 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-zinc-900 tracking-tight">
              {isOverviewLoading ? '—' : overview?.noPortalAccessCount ?? 0}
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">
            {t('parentsModule.kpi.requiresInvitation', 'Unprovisioned')}
          </p>
        </div>

        {/* Duplicate Candidates */}
        <div
          onClick={() => setIsMergeModalOpen(true)}
          className={`rounded-2xl border p-5 shadow-sm transition-all cursor-pointer ${
            (overview?.duplicateCandidatesCount ?? 0) > 0
              ? 'bg-amber-50/70 border-amber-300 hover:border-amber-400 hover:shadow-md'
              : 'bg-white border-zinc-200/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
              {t('parentsModule.kpi.duplicates', 'Duplicate Candidates')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-900 tracking-tight">
              {isOverviewLoading ? '—' : overview?.duplicateCandidatesCount ?? 0}
            </span>
            {(overview?.duplicateCandidatesCount ?? 0) > 0 && (
              <span className="text-xs font-semibold text-amber-700 underline">
                {t('parentsModule.actions.resolve', 'Resolve')}
              </span>
            )}
          </div>
          <p className="text-[11px] text-amber-700/80 mt-1">
            {t('parentsModule.kpi.sharedContacts', 'Matching phones/emails')}
          </p>
        </div>
      </div>

      {/* Language Distribution & Quick Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Language Preferences Card */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-zinc-500" />
              <h3 className="font-bold text-zinc-900 text-sm">
                {t('parentsModule.overview.languagePrefs', 'Communication Language Preference')}
              </h3>
            </div>
            <span className="text-xs text-zinc-400">Trilingual</span>
          </div>

          <div className="space-y-4 mt-5">
            <div>
              <div className="flex justify-between text-xs mb-1 font-medium">
                <span className="text-zinc-700">English</span>
                <span className="font-bold text-zinc-900">
                  {overview?.languageDistribution?.en ?? 0}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-zinc-100 overflow-hidden">
                <div
                  className="h-full bg-mehndi-600 rounded-full transition-all"
                  style={{
                    width: `${
                      overview?.totalGuardians
                        ? ((overview.languageDistribution?.en ?? 0) / overview.totalGuardians) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1 font-medium">
                <span className="text-zinc-700">हिंदी (Hindi)</span>
                <span className="font-bold text-zinc-900">
                  {overview?.languageDistribution?.hi ?? 0}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-zinc-100 overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{
                    width: `${
                      overview?.totalGuardians
                        ? ((overview.languageDistribution?.hi ?? 0) / overview.totalGuardians) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1 font-medium">
                <span className="text-zinc-700">Hinglish</span>
                <span className="font-bold text-zinc-900">
                  {overview?.languageDistribution?.hinglish ?? 0}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-zinc-100 overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full transition-all"
                  style={{
                    width: `${
                      overview?.totalGuardians
                        ? ((overview.languageDistribution?.hinglish ?? 0) / overview.totalGuardians) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Duplicate Resolution Banner */}
        <div className="lg:col-span-2 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white rounded-2xl border border-amber-200/80 p-6 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
              <GitMerge className="w-4 h-4" />
              <span>{t('parentsModule.overview.mergeBannerTitle', 'Guardian Deduplication Engine')}</span>
            </div>
            <p className="text-xs text-zinc-600 mt-2 leading-relaxed">
              {t(
                'parentsModule.overview.mergeBannerDesc',
                'Keep student records and communication clean. Merge duplicate records interactively: consolidate student links, documents, and notes onto the primary guardian profile.'
              )}
            </p>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={() => setIsMergeModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2"
            >
              <GitMerge className="w-4 h-4" />
              <span>{t('parentsModule.overview.launchMerge', 'Launch Merge Tool')}</span>
            </button>
            <Link
              to="/guardians?status=ACTIVE"
              className="px-4 py-2 rounded-xl bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-semibold transition-all flex items-center gap-1.5"
            >
              <span>{t('parentsModule.overview.viewAllGuardians', 'View All Guardians')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Two-Column Grid: Recent Guardians & Recent Families */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Guardians */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
            <h3 className="font-bold text-zinc-900 text-sm">
              {t('parentsModule.overview.recentGuardians', 'Recent Guardians')}
            </h3>
            <Link
              to="/guardians"
              className="text-xs text-mehndi-700 hover:text-mehndi-800 font-semibold flex items-center gap-1"
            >
              <span>{t('parentsModule.overview.viewDirectory', 'Directory')}</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="divide-y divide-zinc-100">
            {isGuardiansLoading ? (
              <div className="py-8 text-center text-xs text-zinc-400">Loading...</div>
            ) : (recentGuardians?.data?.length ?? 0) === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-400">
                No guardians recorded yet
              </div>
            ) : (
              recentGuardians?.data.map((guardian) => (
                <div key={guardian.id} className="py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-mehndi-50 text-mehndi-700 font-bold text-xs flex items-center justify-center border border-mehndi-200/60">
                      {guardian.firstName?.[0]}
                      {guardian.lastName?.[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/guardians/${guardian.id}`}
                          className="font-bold text-zinc-900 text-xs hover:text-mehndi-700 transition-colors"
                        >
                          {guardian.fullName}
                        </Link>
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600">
                          {guardian.relationship}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        {guardian.phone} {guardian.email ? `• ${guardian.email}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {guardian.hasPortalAccess ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Portal
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500">
                        No Login
                      </span>
                    )}
                    <Link
                      to={`/guardians/${guardian.id}`}
                      className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Families */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
            <h3 className="font-bold text-zinc-900 text-sm">
              {t('parentsModule.overview.recentFamilies', 'Family Households')}
            </h3>
            <Link
              to="/families"
              className="text-xs text-mehndi-700 hover:text-mehndi-800 font-semibold flex items-center gap-1"
            >
              <span>{t('parentsModule.overview.viewAllFamilies', 'All Households')}</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="divide-y divide-zinc-100">
            {isFamiliesLoading ? (
              <div className="py-8 text-center text-xs text-zinc-400">Loading...</div>
            ) : (recentFamilies?.data?.length ?? 0) === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-400">
                No family households created yet
              </div>
            ) : (
              recentFamilies?.data.map((family) => (
                <div key={family.id} className="py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center border border-blue-200/60">
                      <Home className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/families/${family.id}`}
                          className="font-bold text-zinc-900 text-xs hover:text-blue-700 transition-colors"
                        >
                          {family.familyName}
                        </Link>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600">
                          {family.familyNumber}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        {family.primaryGuardianName
                          ? `Primary: ${family.primaryGuardianName}`
                          : 'No primary guardian'}
                        {family.city ? ` • ${family.city}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-right">
                    <span className="text-xs font-bold text-zinc-700">
                      {family.studentsCount ?? 0} children
                    </span>
                    <Link
                      to={`/families/${family.id}`}
                      className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Duplicate Merge Modal */}
      {isMergeModalOpen && (
        <GuardianMergeModal
          isOpen={isMergeModalOpen}
          onClose={() => setIsMergeModalOpen(false)}
        />
      )}
    </div>
  );
}
