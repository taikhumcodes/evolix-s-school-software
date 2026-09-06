import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Users,
  Home,
  UserPlus,
  PlusCircle,
  GitMerge,
  Upload,
  Download,
} from 'lucide-react';
import { useAuth } from '../../../core/auth/AuthContext';

interface ParentsNavProps {
  onOpenMerge?: () => void;
  onExport?: () => void;
}

export const ParentsNav: React.FC<ParentsNavProps> = ({ onOpenMerge, onExport }) => {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();

  const canManageGuardians = hasPermission('guardians.manage');
  const canManageFamilies = hasPermission('families.manage');
  const canMerge = hasPermission('guardians.merge');
  const canImport = hasPermission('guardian.import');
  const canExport = hasPermission('guardian.export');

  return (
    <div className="bg-white border-b border-zinc-200 pb-0 -mx-6 -mt-6 md:-mx-8 md:-mt-8 px-6 md:px-8 pt-6 mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
              {t('parentsModule.title', 'Parents & Family Management')}
            </h1>
            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-mehndi-50 text-mehndi-700 border border-mehndi-200">
              Module 04
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            {t('parentsModule.subtitle', 'Manage canonical guardians, households, sibling links, and portal access')}
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {canManageGuardians && (
            <NavLink
              to="/guardians/new"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-mehndi-600 hover:bg-mehndi-700 text-white text-xs font-semibold shadow-sm shadow-mehndi-600/20 transition-all"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{t('parentsModule.actions.addGuardian', 'Add Guardian')}</span>
            </NavLink>
          )}

          {canManageFamilies && (
            <NavLink
              to="/families/new"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold shadow-sm transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{t('parentsModule.actions.createFamily', 'New Family')}</span>
            </NavLink>
          )}

          {canMerge && onOpenMerge && (
            <button
              onClick={onOpenMerge}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-800 text-xs font-semibold transition-all"
            >
              <GitMerge className="w-3.5 h-3.5 text-amber-600" />
              <span>{t('parentsModule.actions.mergeDuplicates', 'Merge Duplicates')}</span>
            </button>
          )}

          {canImport && (
            <NavLink
              to="/guardians/import"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-medium transition-all"
            >
              <Upload className="w-3.5 h-3.5 text-zinc-500" />
              <span>{t('parentsModule.actions.importCsv', 'Import CSV')}</span>
            </NavLink>
          )}

          {canExport && onExport && (
            <button
              onClick={onExport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-medium transition-all"
            >
              <Download className="w-3.5 h-3.5 text-zinc-500" />
              <span>{t('parentsModule.actions.exportCsv', 'Export')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto border-t border-zinc-100 pt-1 -mb-px">
        <NavLink
          to="/guardians/overview"
          className={({ isActive }) =>
            `flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
              isActive
                ? 'border-mehndi-600 text-mehndi-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 hover:border-zinc-300'
            }`
          }
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span>{t('parentsModule.tabs.overview', 'Overview')}</span>
        </NavLink>

        <NavLink
          to="/guardians"
          end
          className={({ isActive }) =>
            `flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
              isActive
                ? 'border-mehndi-600 text-mehndi-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 hover:border-zinc-300'
            }`
          }
        >
          <Users className="w-3.5 h-3.5" />
          <span>{t('parentsModule.tabs.guardians', 'Guardians Directory')}</span>
        </NavLink>

        <NavLink
          to="/families"
          className={({ isActive }) =>
            `flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
              isActive
                ? 'border-mehndi-600 text-mehndi-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 hover:border-zinc-300'
            }`
          }
        >
          <Home className="w-3.5 h-3.5" />
          <span>{t('parentsModule.tabs.families', 'Family Households')}</span>
        </NavLink>
      </div>
    </div>
  );
};
