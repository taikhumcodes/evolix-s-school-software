import React, { useState, useRef, useEffect, useMemo } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { TenantSwitcher } from './TenantSwitcher';
import {
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  X,
  Settings,
  Users,
  CalendarCheck,
  CreditCard,
  BookOpen,
  Award,
  ServerCog,
  Layers,
  Sparkles,
  Briefcase,
  Bus,
  MapPin,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../core/auth/AuthContext';
import { useTenant } from '../../core/tenancy/TenantContext';
import { useTranslation } from 'react-i18next';
import { useGlobalSearch } from '../../lib/api/search';
import { highlightMatches } from '../../lib/search/search-engine';
import { NotificationBell } from '../notifications/NotificationBell';

const HighlightedText: React.FC<{ text: string; query: string; className?: string }> = ({
  text,
  query,
  className = '',
}) => {
  const chunks = useMemo(() => highlightMatches(text, query), [text, query]);
  return (
    <span className={className}>
      {chunks.map((c, i) =>
        c.isMatch ? (
          <mark
            key={i}
            className="bg-yellow-200/90 text-zinc-950 font-bold px-0.5 rounded-xs"
          >
            {c.text}
          </mark>
        ) : (
          <span key={i}>{c.text}</span>
        )
      )}
    </span>
  );
};

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission, logout } = useAuth();
  const { hasEntitlement } = useTenant();
  const { t, i18n } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape') {
        setIsSearchOpen(false);
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const searchItems = useMemo(() => {
    return [
      {
        title: t('navigation.configuration', 'Configuration'),
        subtitle: 'School Profile, Identity & General Settings',
        path: '/configuration/school',
        category: 'Configuration',
        icon: Settings,
        keywords: 'settings profile school identity affiliaton board general setup',
      },
      {
        title: t('admin.configuration.branding', 'Branding & Theme'),
        subtitle: 'Logos, Favicon & Color Palette',
        path: '/configuration/branding',
        category: 'Configuration',
        icon: Settings,
        keywords: 'branding logo color theme accent dark mode assets',
      },
      {
        title: t('admin.configuration.numberSeries', 'Number Series'),
        subtitle: 'Auto-generation sequences for IDs & receipts',
        path: '/configuration/number-series',
        category: 'Configuration',
        icon: Settings,
        keywords: 'number series format sequence admission roll receipt auto numbering',
      },
      {
        title: t('admin.configuration.history', 'Configuration Audit History'),
        subtitle: 'Review previous configuration revisions',
        path: '/configuration/history',
        category: 'Configuration',
        icon: Settings,
        keywords: 'audit history revision version rollback change log',
      },
      {
        title: t('navigation.masterData', 'Master Data Reference Hub'),
        subtitle: 'Centralized reference entities & school taxonomy',
        path: '/master-data',
        category: 'Master Data',
        icon: Layers,
        keywords: 'master data classes sections subjects castes religions heads',
      },
      {
        title: t('masterData.academic.classes', 'Classes & Grades'),
        subtitle: 'Manage classes, grades and levels',
        path: '/master-data?tab=academic&sub=classes',
        category: 'Master Data',
        icon: BookOpen,
        keywords: 'class classes grades primary secondary higher level',
      },
      {
        title: t('masterData.academic.sections', 'Sections'),
        subtitle: 'Manage classroom sections',
        path: '/master-data?tab=academic&sub=sections',
        category: 'Master Data',
        icon: BookOpen,
        keywords: 'section sections class divisions a b c',
      },
      {
        title: t('masterData.academic.mappings', 'Class-Section Assignment'),
        subtitle: 'Assign sections to classes with capacity limits',
        path: '/master-data?tab=academic&sub=class-sections',
        category: 'Master Data',
        icon: BookOpen,
        keywords: 'assignment mapping capacity class section allocate',
      },
      {
        title: t('masterData.academic.subjects', 'Subjects'),
        subtitle: 'Theory and practical subjects catalogue',
        path: '/master-data?tab=academic&sub=subjects',
        category: 'Master Data',
        icon: BookOpen,
        keywords: 'subject subjects theory practical both curriculum courses',
      },
      {
        title: t('masterData.academic.classSubjects', 'Subject-Class Assignment'),
        subtitle: 'Link subjects to classes as core or elective',
        path: '/master-data?tab=academic&sub=class-subjects',
        category: 'Master Data',
        icon: BookOpen,
        keywords: 'course elective core curriculum subject class mapping',
      },
      {
        title: t('masterData.tabs.student', 'Demographics & Social Categories'),
        subtitle: 'Religions, social categories and castes',
        path: '/master-data?tab=student',
        category: 'Master Data',
        icon: Users,
        keywords: 'demographics religions categories castes social community',
      },
      {
        title: t('masterData.tabs.finance', 'Financial Heads'),
        subtitle: 'Fee heads and expense categorization',
        path: '/master-data?tab=finance',
        category: 'Master Data',
        icon: CreditCard,
        keywords: 'finance fees fee heads expense heads accounting receipts ledger',
      },
      {
        title: t('masterData.tabs.hr', 'Departments & Designations'),
        subtitle: 'Staff functional departments and job titles',
        path: '/master-data?tab=hr',
        category: 'Master Data',
        icon: Briefcase,
        keywords: 'departments designations hr staff jobs roles employees',
      },
      {
        title: t('masterData.tabs.transport', 'Transport & Vehicle Types'),
        subtitle: 'Vehicle fleet classification and passenger capacity',
        path: '/master-data?tab=transport',
        category: 'Master Data',
        icon: Bus,
        keywords: 'transport vehicle types buses vans fleet capacity drivers',
      },
      {
        title: t('masterData.tabs.locations', 'Geographic Locations'),
        subtitle: 'Countries, states, and cities',
        path: '/master-data?tab=locations',
        category: 'Master Data',
        icon: MapPin,
        keywords: 'geographic locations countries states cities address postal',
      },
      {
        title: t('navigation.users', 'Users Management'),
        subtitle: 'Manage administrative and staff accounts',
        path: '/admin/users',
        category: 'Administration',
        icon: Users,
        keywords: 'users staff admin teacher accounts password access',
      },
      {
        title: t('navigation.roles', 'Roles & Permissions'),
        subtitle: 'Role-based access control and capabilities',
        path: '/admin/roles',
        category: 'Administration',
        icon: ShieldCheck,
        keywords: 'roles permissions rbac security access privileges',
      },
      {
        title: t('navigation.security', 'Security & Access Control'),
        subtitle: 'Password policies, IP restrictions and 2FA overview',
        path: '/admin/security/overview',
        category: 'Administration',
        icon: ServerCog,
        keywords: 'security 2fa ip policy lockout password whitelist two factor',
      },
      {
        title: t('navigation.academicYears', 'Academic Years'),
        subtitle: 'Academic calendar periods and current active term',
        path: '/admin/academic-years',
        category: 'Administration',
        icon: Award,
        keywords: 'academic year session calendar term dates terms',
      },
      {
        title: t('navigation.setupWizard', 'School Setup Wizard'),
        subtitle: 'Register new school branch or reconfigure setup',
        path: '/admin/setup-wizard',
        category: 'Administration',
        icon: Sparkles,
        keywords: 'wizard setup onboard create new school branch registration',
      },
      {
        title: t('navigation.auditLogs', 'Audit Logs'),
        subtitle: 'Immutable system change audit trail',
        path: '/admin/audit-logs',
        category: 'Administration',
        icon: BookOpen,
        keywords: 'audit logs trail history changes security events compliance',
      },
      {
        title: t('navigation.accountSecurity', 'My Account Security'),
        subtitle: 'Change password, view active sessions and manage 2FA',
        path: '/account/security',
        category: 'Account',
        icon: ShieldCheck,
        keywords: 'account profile 2fa password sessions totp recovery personal',
      },
    ];
  }, [t]);

  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(globalSearch.trim());
    }, 250);
    return () => clearTimeout(handler);
  }, [globalSearch]);

  const { currentTenant } = useTenant();
  const schoolId = currentTenant?.schoolId;
  const { data: erpResults = [], isFetching: isSearchingBackend } = useGlobalSearch(
    debouncedSearch,
    schoolId,
    isSearchOpen && Boolean(debouncedSearch)
  );

  const filteredNavItems = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    if (!q) return searchItems.slice(0, 6);
    return searchItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.keywords.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [globalSearch, searchItems]);

  interface UnifiedItem {
    id: string;
    title: string;
    subtitle: string;
    category: string;
    path: string;
    icon: any;
    isErp: boolean;
  }

  const combinedItems = useMemo<UnifiedItem[]>(() => {
    const items: UnifiedItem[] = [];
    if (globalSearch.trim() && erpResults.length > 0) {
      for (const erp of erpResults) {
        let Icon = BookOpen;
        if (erp.type === 'section') Icon = Layers;
        else if (erp.type === 'academic_year') Icon = Award;
        else if (erp.type === 'user') Icon = Users;
        else if (erp.type === 'role') Icon = ShieldCheck;

        items.push({
          id: `erp-${erp.id}`,
          title: erp.title,
          subtitle: erp.subtitle,
          category: erp.category,
          path: erp.url,
          icon: Icon,
          isErp: true,
        });
      }
    }
    for (const nav of filteredNavItems) {
      items.push({
        id: `nav-${nav.path}`,
        title: nav.title,
        subtitle: nav.subtitle,
        category: nav.category,
        path: nav.path,
        icon: nav.icon,
        isErp: false,
      });
    }
    return items;
  }, [globalSearch, erpResults, filteredNavItems]);

  const [selectedIndex, setSelectedIndex] = useState(-1);
  useEffect(() => {
    setSelectedIndex(-1);
  }, [globalSearch]);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isSearchOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (combinedItems.length > 0) {
        setSelectedIndex((prev) => (prev + 1) % combinedItems.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (combinedItems.length > 0) {
        setSelectedIndex((prev) => (prev - 1 + combinedItems.length) % combinedItems.length);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target =
        selectedIndex >= 0 && selectedIndex < combinedItems.length
          ? combinedItems[selectedIndex]
          : combinedItems[0];
      if (target) {
        navigate(target.path);
        setIsSearchOpen(false);
        setGlobalSearch('');
      }
    }
  };

  const businessNav = [
    {
      name: t('navigation.configuration', 'Configuration'),
      path: '/configuration',
      icon: Settings,
      permission: 'settings.manage',
    },
    { name: t('navigation.masterData', 'Master Data'), path: '/master-data', icon: Layers, permission: 'master_data.view' },
    {
      name: t('navigation.students', 'Students & Admissions'),
      path: '/students',
      icon: Users,
      entitlement: 'students.enabled',
    },
    {
      name: t('navigation.attendance', 'Attendance & Geofence'),
      path: '/attendance',
      icon: CalendarCheck,
      entitlement: 'attendance.enabled',
    },
    { name: t('navigation.finance', 'Finance & Fees'), path: '/finance', icon: CreditCard, entitlement: 'finance.enabled' },
    {
      name: t('navigation.academics', 'Academics & Classes'),
      path: '/academics',
      icon: BookOpen,
      entitlement: 'academics.enabled',
    },
    { name: t('navigation.exams', 'Examinations'), path: '/exams', icon: Award, entitlement: 'exams.enabled' },
  ].filter((item) => {
    if (item.permission && !hasPermission(item.permission)) return false;
    if (item.entitlement && !hasEntitlement(item.entitlement)) return false;
    return true;
  });

  const adminNav = [
    { name: t('navigation.users', 'Users'), path: '/admin/users', icon: Users, permission: 'users.manage' },
    {
      name: t('navigation.roles', 'Roles & Permissions'),
      path: '/admin/roles',
      icon: ShieldCheck,
      permission: 'roles.manage',
    },
    {
      name: t('navigation.security', 'Security & Access'),
      path: '/admin/security/overview',
      icon: ServerCog,
      permission: 'security.manage',
    },
    {
      name: t('navigation.academicYears', 'Academic Years'),
      path: '/admin/academic-years',
      icon: Award,
      permission: 'academic.manage',
    },
    {
      name: t('navigation.setupWizard', 'Setup Wizard'),
      path: '/admin/setup-wizard',
      icon: Sparkles,
      permission: 'settings.manage',
    },
    { name: t('navigation.auditLogs', 'Audit Logs'), path: '/admin/audit-logs', icon: BookOpen, permission: 'users.manage' },
  ].filter((item) => hasPermission(item.permission));

  return (
    <>
      <header className="h-16 sm:h-20 border-b border-zinc-200 bg-white px-3 sm:px-6 md:px-8 flex items-center justify-between sticky top-0 z-30 shrink-0">
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden p-2 rounded-xl text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <TenantSwitcher />
          <div className="relative hidden lg:block w-80">
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-zinc-50 border border-zinc-200 focus-within:border-mehndi-500 focus-within:ring-2 focus-within:ring-mehndi-500/20 focus-within:bg-white text-xs text-zinc-500 w-full shadow-inner transition-all">
              <Search className="w-4 h-4 text-zinc-400 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={globalSearch}
                onChange={(e) => {
                  setGlobalSearch(e.target.value);
                  setIsSearchOpen(true);
                }}
                onFocus={() => setIsSearchOpen(true)}
                onKeyDown={handleInputKeyDown}
                placeholder={t('navigation.searchPlaceholder', 'Search students, staff, receipts... (Ctrl+K)')}
                className="bg-transparent border-none outline-none text-xs text-zinc-900 placeholder-zinc-400 w-full"
              />
              {globalSearch ? (
                <button
                  type="button"
                  onClick={() => {
                    setGlobalSearch('');
                    searchInputRef.current?.focus();
                  }}
                  className="text-zinc-400 hover:text-zinc-600 p-0.5 rounded-full"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <kbd className="hidden xl:inline-block px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 bg-zinc-100 border border-zinc-200 rounded">
                  Ctrl K
                </kbd>
              )}
            </div>

            {/* Live Search Results Dropdown */}
            {isSearchOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setIsSearchOpen(false)}
                />
                <div className="absolute left-0 mt-2 w-96 max-h-[28rem] overflow-y-auto origin-top-left rounded-2xl bg-white border border-zinc-200 shadow-2xl z-40 p-2 text-zinc-800 animate-fade-in flex flex-col">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between border-b border-zinc-100 pb-1.5 mb-1 shrink-0">
                    <span>{globalSearch ? t('navigation.searchResults', 'Search Results') : t('navigation.quickNav', 'Quick Navigation')}</span>
                    {isSearchingBackend ? (
                      <span className="flex items-center gap-1 text-mehndi-600 font-mono text-[10px]">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Searching...</span>
                      </span>
                    ) : (
                      <span className="font-mono text-mehndi-600 text-[10px]">{combinedItems.length} matches</span>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2">
                    {combinedItems.length === 0 && !isSearchingBackend ? (
                      <div className="p-6 text-center text-xs text-zinc-400">
                        No matching records, pages or features found for &ldquo;{globalSearch}&rdquo;
                      </div>
                    ) : (
                      <>
                        {/* School Records Group */}
                        {erpResults.length > 0 && (
                          <div>
                            <div className="px-2.5 py-1 text-[10px] font-bold text-mehndi-800 uppercase tracking-wider bg-mehndi-50/70 rounded-lg mb-1 flex items-center justify-between">
                              <span>{t('navigation.schoolRecords', 'School Records & Master Data')}</span>
                              <span className="font-mono text-mehndi-700">{erpResults.length}</span>
                            </div>
                            <div className="space-y-1">
                              {combinedItems
                                .filter((item) => item.isErp)
                                .map((item) => {
                                  const Icon = item.icon;
                                  const globalIdx = combinedItems.findIndex((ci) => ci.id === item.id);
                                  const isSelected = selectedIndex === globalIdx;
                                  return (
                                    <button
                                      key={item.id}
                                      onClick={() => {
                                        navigate(item.path);
                                        setIsSearchOpen(false);
                                        setGlobalSearch('');
                                      }}
                                      className={`w-full flex items-center gap-3 p-2 rounded-xl text-left border transition-all cursor-pointer group ${
                                        isSelected
                                          ? 'bg-mehndi-50 border-mehndi-300 ring-1 ring-mehndi-400/30'
                                          : 'hover:bg-zinc-50 border-transparent hover:border-zinc-200'
                                      }`}
                                    >
                                      <div className="w-7 h-7 rounded-lg bg-mehndi-100 text-mehndi-700 flex items-center justify-center shrink-0">
                                        <Icon className="w-3.5 h-3.5" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-1">
                                          <HighlightedText
                                            text={item.title}
                                            query={globalSearch}
                                            className="font-bold text-xs text-zinc-900 group-hover:text-mehndi-800 truncate"
                                          />
                                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-mehndi-100 text-mehndi-800 uppercase tracking-wider shrink-0">
                                            {item.category}
                                          </span>
                                        </div>
                                        <HighlightedText
                                          text={item.subtitle}
                                          query={globalSearch}
                                          className="text-[11px] text-zinc-500 truncate block mt-0.5"
                                        />
                                      </div>
                                    </button>
                                  );
                                })}
                            </div>
                          </div>
                        )}

                        {/* Navigation & Features Group */}
                        {filteredNavItems.length > 0 && (
                          <div>
                            {erpResults.length > 0 && (
                              <div className="px-2.5 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider bg-zinc-50 rounded-lg mb-1 flex items-center justify-between mt-2">
                                <span>{t('navigation.modulesPages', 'System Modules & Features')}</span>
                                <span className="font-mono text-zinc-400">{filteredNavItems.length}</span>
                              </div>
                            )}
                            <div className="space-y-1">
                              {combinedItems
                                .filter((item) => !item.isErp)
                                .map((item) => {
                                  const Icon = item.icon;
                                  const globalIdx = combinedItems.findIndex((ci) => ci.id === item.id);
                                  const isSelected = selectedIndex === globalIdx;
                                  return (
                                    <button
                                      key={item.id}
                                      onClick={() => {
                                        navigate(item.path);
                                        setIsSearchOpen(false);
                                        setGlobalSearch('');
                                      }}
                                      className={`w-full flex items-center gap-3 p-2 rounded-xl text-left border transition-all cursor-pointer group ${
                                        isSelected
                                          ? 'bg-zinc-100 border-zinc-300 ring-1 ring-zinc-400/30'
                                          : 'hover:bg-zinc-50 border-transparent hover:border-zinc-200'
                                      }`}
                                    >
                                      <div className="w-7 h-7 rounded-lg bg-zinc-100 group-hover:bg-zinc-200 text-zinc-600 flex items-center justify-center shrink-0">
                                        <Icon className="w-3.5 h-3.5" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-1">
                                          <HighlightedText
                                            text={item.title}
                                            query={globalSearch}
                                            className="font-semibold text-xs text-zinc-900 group-hover:text-mehndi-800 truncate"
                                          />
                                          <span className="text-[9px] font-mono text-zinc-400 uppercase shrink-0">
                                            {item.category}
                                          </span>
                                        </div>
                                        <HighlightedText
                                          text={item.subtitle}
                                          query={globalSearch}
                                          className="text-[11px] text-zinc-400 truncate block mt-0.5"
                                        />
                                      </div>
                                    </button>
                                  );
                                })}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Dropdown Footer */}
                  <div className="px-2 pt-2 pb-0.5 border-t border-zinc-100 mt-1 flex items-center justify-between text-[10px] text-zinc-400 shrink-0 select-none">
                    <div className="flex items-center gap-2">
                      <span>↑↓ to navigate</span>
                      <span>•</span>
                      <span>Enter to select</span>
                      <span>•</span>
                      <span>Esc to close</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{t('navigation.isolated', 'Isolated')}</span>
          </div>

          <div
            className="flex items-center rounded-xl border border-zinc-200 bg-zinc-50 p-0.5"
            role="group"
            aria-label="Language Selector"
          >
            <button
              onClick={() => i18n.changeLanguage('en')}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                i18n.language === 'en'
                  ? 'bg-white text-mehndi-700 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
              aria-label="English"
            >
              EN
            </button>
            <button
              onClick={() => i18n.changeLanguage('hi')}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                i18n.language === 'hi'
                  ? 'bg-white text-mehndi-700 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
              aria-label="हिंदी"
            >
              हिंदी
            </button>
            <button
              onClick={() => i18n.changeLanguage('hinglish')}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                i18n.language === 'hinglish'
                  ? 'bg-white text-mehndi-700 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
              aria-label="Hinglish"
            >
              Hinglish
            </button>
          </div>

          <NotificationBell />

          <button
            onClick={logout}
            className="p-2 rounded-xl text-zinc-500 hover:text-red-600 bg-white hover:bg-red-50 border border-zinc-200 transition-all"
            title={t('navigation.logout', 'Logout')}
            aria-label={t('navigation.logout', 'Logout')}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative w-4/5 max-w-xs bg-white h-full shadow-2xl flex flex-col z-10 overflow-y-auto">
            <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-mehndi-600 to-mehndi-500 flex items-center justify-center text-white font-extrabold text-sm shadow">
                  E
                </div>
                <span className="font-extrabold text-base tracking-tight text-zinc-900">
                  EVOLIX
                </span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-xl text-zinc-500 hover:bg-zinc-100"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 p-4 space-y-4">
              {/* Modules */}
              <div>
                <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  {t('navigation.schoolModules', 'School Modules')}
                </div>
                <div className="space-y-1">
                  {businessNav.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                            isActive
                              ? 'bg-mehndi-100 text-mehndi-800 font-semibold'
                              : 'text-zinc-600 hover:bg-zinc-50'
                          }`
                        }
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.name}</span>
                      </NavLink>
                    );
                  })}
                </div>
              </div>

              {/* Administration */}
              {adminNav.length > 0 && (
                <div className="pt-2 border-t border-zinc-100">
                  <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    {t('navigation.administration', 'Administration')}
                  </div>
                  <div className="space-y-1">
                    {adminNav.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          onClick={() => setMobileMenuOpen(false)}
                          className={({ isActive }) =>
                            `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                              isActive
                                ? 'bg-zinc-100 text-zinc-900 font-semibold'
                                : 'text-zinc-600 hover:bg-zinc-50'
                            }`
                          }
                        >
                          <Icon className="w-4 h-4" />
                          <span>{item.name}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Account Security */}
              <div className="pt-2 border-t border-zinc-100">
                <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  {t('navigation.account', 'Account')}
                </div>
                <NavLink
                  to="/account/security"
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-zinc-100 text-zinc-900 font-semibold'
                        : 'text-zinc-600 hover:bg-zinc-50'
                    }`
                  }
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{t('navigation.accountSecurity', 'Account Security')}</span>
                </NavLink>
              </div>
            </div>

            {/* Language Selector for Mobile */}
            <div className="p-4 border-t border-zinc-100">
              <div className="px-1 pb-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                {t('navigation.language', 'Language')}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => i18n.changeLanguage('en')}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    i18n.language === 'en'
                      ? 'bg-mehndi-50 border-mehndi-300 text-mehndi-700'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-600'
                  }`}
                >
                  English
                </button>
                <button
                  onClick={() => i18n.changeLanguage('hi')}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    i18n.language === 'hi'
                      ? 'bg-mehndi-50 border-mehndi-300 text-mehndi-700'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-600'
                  }`}
                >
                  हिंदी
                </button>
                <button
                  onClick={() => i18n.changeLanguage('hinglish')}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    i18n.language === 'hinglish'
                      ? 'bg-mehndi-50 border-mehndi-300 text-mehndi-700'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-600'
                  }`}
                >
                  Hinglish
                </button>
              </div>
            </div>

            {/* Bottom logout */}
            <div className="p-4 border-t border-zinc-200">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-sm font-semibold transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>{t('navigation.logout', 'Logout')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
