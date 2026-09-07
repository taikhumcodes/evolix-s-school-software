import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FileBadge,
  LayoutTemplate,
  FilePlus,
  FileCheck,
  Layers,
  Stamp,
  BarChart3,
} from 'lucide-react';

export const DocumentsLayout: React.FC = () => {
  const { t } = useTranslation();

  const navTabs = [
    { name: t('documents.nav.overview', 'Overview'), path: '/documents', icon: FileBadge, end: true },
    { name: t('documents.nav.templates', 'Templates'), path: '/documents/templates', icon: LayoutTemplate },
    { name: t('documents.nav.generate', 'Generate'), path: '/documents/generate', icon: FilePlus },
    { name: t('documents.nav.register', 'Document Register'), path: '/documents/register', icon: FileCheck },
    { name: t('documents.nav.bulk', 'Bulk Generation'), path: '/documents/bulk', icon: Layers },
    { name: t('documents.nav.signatures', 'Signatures & Seals'), path: '/documents/signatures', icon: Stamp },
    { name: t('documents.nav.reports', 'Reports & Analytics'), path: '/documents/reports', icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-zinc-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-mehndi-50 text-mehndi-700">
              <FileBadge className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-zinc-900">
              {t('documents.title', 'Documents, Certificates & Printing')}
            </h1>
            <span className="text-[11px] font-bold tracking-wider px-2 py-0.5 rounded-md bg-mehndi-100 text-mehndi-800 uppercase">
              M11
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1 max-w-2xl leading-relaxed">
            {t(
              'documents.subtitle',
              'Centralized document engine for verified student certificates, report cards, ID cards, receipts, payslips, and QR-verifiable official records.'
            )}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <NavLink
            to="/documents/generate"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-mehndi-600 hover:bg-mehndi-700 text-white font-semibold text-xs transition-all shadow-sm hover:shadow active:scale-98"
          >
            <FilePlus className="w-4 h-4" />
            <span>{t('documents.actions.newDocument', 'Issue Certificate')}</span>
          </NavLink>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-zinc-200 scrollbar-none">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              end={tab.end}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-mehndi-600 text-white shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{tab.name}</span>
            </NavLink>
          );
        })}
      </div>

      {/* View Content */}
      <Outlet />
    </div>
  );
};

export default DocumentsLayout;
