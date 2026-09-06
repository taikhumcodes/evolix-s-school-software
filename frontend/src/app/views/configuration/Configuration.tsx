import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  CheckCircle2,
  Image,
  Loader2,
  RefreshCw,
  Save,
  Settings,
} from 'lucide-react';
import { useTenant } from '../../../core/tenancy/TenantContext';
import {
  ConfigurationSection,
  useConfigurationOverview,
  useConfigurationSection,
  useUpdateConfiguration,
} from '../../../lib/api/configuration';

const sections: ConfigurationSection[] = [
  'school',
  'academic',
  'student-identity',
  'attendance',
  'fees',
  'finance',
  'exams',
  'promotion',
  'branding',
  'localization',
  'printing',
];

const fields: Record<ConfigurationSection, string[]> = {
  school: [
    'legal_name',
    'short_name',
    'board',
    'affiliation_number',
    'primary_phone',
    'contact_email',
    'website',
    'address_line_1',
    'city',
    'state',
    'postal_code',
    'country',
  ],
  academic: [
    'working_week',
    'week_start',
    'term_naming',
    'roll_number_scope',
    'academic_locking_enabled',
  ],
  'student-identity': ['student_id_format', 'admission_number_format', 'roll_number_format'],
  attendance: [
    'attendance_lock_enabled',
    'attendance_lock_hours',
    'attendance_correction_allowed',
    'attendance_correction_reason_required',
    'attendance_principal_override',
    'teacher_geofence_enabled',
    'teacher_geofence_radius_meters',
  ],
  fees: [
    'fee_currency',
    'fee_precision',
    'fee_rounding_rule',
    'allow_partial_payment',
    'allow_advance_payment',
    'late_fee_enabled',
    'late_fee_grace_days',
    'auto_generate_receipt',
    'receipt_cancellation_reason_required',
    'refund_approval_required',
    'concession_approval_required',
    'scholarship_approval_required',
    'allowed_payment_methods',
  ],
  finance: [
    'fiscal_year_start_month',
    'fiscal_year_start_day',
    'voucher_approval_required',
    'backdated_transactions_allowed',
    'future_dated_transactions_allowed',
    'reversal_reason_required',
    'gst_enabled',
    'tds_enabled',
  ],
  exams: [
    'grading_mode',
    'passing_percentage',
    'maximum_marks',
    'internal_marks_enabled',
    'practical_marks_enabled',
    'grace_marks_enabled',
    'maximum_grace_marks',
    'revaluation_enabled',
    'rank_calculation_enabled',
    'gpa_enabled',
    'cgpa_enabled',
    'result_publication_approval_required',
    'marks_decimal_precision',
  ],
  promotion: [
    'automatic_promotion_enabled',
    'minimum_attendance_percentage',
    'minimum_passing_percentage',
    'failed_subject_tolerance',
    'grace_marks_considered',
    'manual_promotion_override',
    'principal_promotion_approval_required',
    'promotion_locking_enabled',
  ],
  branding: ['primary_print_color', 'accent_print_color', 'letterhead_text', 'footer_text'],
  localization: ['default_language', 'timezone', 'date_format', 'time_format', 'currency_display'],
  printing: [
    'paper_size',
    'print_orientation',
    'print_language',
    'print_show_logo',
    'print_show_address',
    'print_show_contact',
    'print_show_timestamp',
    'print_show_document_number',
    'signature_placeholders',
    'header_text',
    'footer_text',
  ],
};

const label = (key: string) =>
  key.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const booleanFields = new Set([
  'academic_locking_enabled',
  'attendance_lock_enabled',
  'attendance_correction_allowed',
  'attendance_correction_reason_required',
  'attendance_principal_override',
  'teacher_geofence_enabled',
  'allow_partial_payment',
  'allow_advance_payment',
  'late_fee_enabled',
  'auto_generate_receipt',
  'receipt_cancellation_reason_required',
  'refund_approval_required',
  'concession_approval_required',
  'scholarship_approval_required',
  'voucher_approval_required',
  'backdated_transactions_allowed',
  'future_dated_transactions_allowed',
  'reversal_reason_required',
  'gst_enabled',
  'tds_enabled',
  'internal_marks_enabled',
  'practical_marks_enabled',
  'grace_marks_enabled',
  'revaluation_enabled',
  'rank_calculation_enabled',
  'gpa_enabled',
  'cgpa_enabled',
  'result_publication_approval_required',
  'automatic_promotion_enabled',
  'grace_marks_considered',
  'manual_promotion_override',
  'principal_promotion_approval_required',
  'promotion_locking_enabled',
  'print_show_logo',
  'print_show_address',
  'print_show_contact',
  'print_show_timestamp',
  'print_show_document_number',
  'signature_placeholders',
]);

export default function Configuration() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { section: routeSection } = useParams<{ section: ConfigurationSection }>();
  const { currentTenant } = useTenant();
  const schoolId = currentTenant?.schoolId;
  const section = sections.includes(routeSection as ConfigurationSection)
    ? (routeSection as ConfigurationSection)
    : undefined;
  const overview = useConfigurationOverview(schoolId);
  const config = useConfigurationSection(section || 'school', schoolId);
  const update = useUpdateConfiguration(section || 'school', schoolId);
  const [values, setValues] = useState<Record<string, string | number | boolean | null>>({});
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  const isDirty = Boolean(
    config.data && JSON.stringify(config.data.values) !== JSON.stringify(values)
  );

  useEffect(() => {
    if (config.data) setValues(config.data.values);
  }, [config.data]);

  useEffect(() => {
    const warnBeforeLeave = (event: BeforeUnloadEvent) => {
      if (isDirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warnBeforeLeave);
    return () => window.removeEventListener('beforeunload', warnBeforeLeave);
  }, [isDirty]);

  const handleTabClick = (targetPath: string) => {
    if (isDirty) {
      setPendingNavigation(targetPath);
    } else {
      navigate(targetPath);
    }
  };

  const confirmDiscard = () => {
    if (pendingNavigation) {
      const target = pendingNavigation;
      setPendingNavigation(null);
      navigate(target);
    }
  };

  if (!schoolId || (section && config.isLoading) || (!section && overview.isLoading)) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="flex items-center gap-3 text-zinc-500 text-sm">
          <Loader2 className="w-5 h-5 animate-spin text-mehndi-600" />
          <span>{t('admin.configuration.loading')}</span>
        </div>
      </div>
    );
  }

  if (!section) {
    return (
      <div className="space-y-6">
        <PageHeading
          title={t('admin.configuration.title')}
          subtitle={t('admin.configuration.subtitle')}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sections.map((item) => (
            <Link
              key={item}
              to={item === 'branding' ? '/configuration/branding' : `/configuration/${item}`}
              className="glass-panel p-5 bg-white/70 border border-zinc-200 hover:border-mehndi-300 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-zinc-900 group-hover:text-mehndi-700 transition-colors">
                    {t(`admin.configuration.sections.${item}`)}
                  </h2>
                  <p className="text-xs text-zinc-500 mt-1">
                    {overview.data?.categories[item]?.status || t('admin.configuration.loading')}
                  </p>
                </div>
                {item === 'branding' ? (
                  <Image className="w-5 h-5 text-mehndi-600" />
                ) : (
                  <Settings className="w-5 h-5 text-mehndi-600" />
                )}
              </div>
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link to="/configuration/branding" className="btn-secondary">
            <Image className="w-4 h-4 text-mehndi-600" />
            {t('admin.configuration.sections.branding')}
          </Link>
          <Link to="/configuration/number-series" className="btn-secondary">
            {t('admin.configuration.numberSeries.title')}
          </Link>
          <Link to="/configuration/history" className="btn-secondary">
            {t('admin.configuration.history.title')}
          </Link>
        </div>
      </div>
    );
  }

  const save = async () => {
    if (!config.data) return;
    await update.mutateAsync({ version: config.data.version, values });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeading
          title={t(`admin.configuration.sections.${section}`)}
          subtitle={t('admin.configuration.formSubtitle')}
        />
        {section === 'branding' && (
          <Link to="/configuration/branding" className="btn-secondary text-xs w-fit">
            <Image className="w-4 h-4 text-mehndi-600" />
            {t('admin.configuration.branding.openManager')}
          </Link>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {sections.map((item) => {
          const targetUrl =
            item === 'branding' ? '/configuration/branding' : `/configuration/${item}`;
          const active = item === section;
          return (
            <button
              key={item}
              type="button"
              onClick={() => handleTabClick(targetUrl)}
              className={`shrink-0 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                active
                  ? 'bg-mehndi-100 border-mehndi-300 text-mehndi-800'
                  : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              {t(`admin.configuration.sections.${item}`)}
            </button>
          );
        })}
      </div>

      <div className="glass-panel p-5 md:p-7 bg-white/70 border border-zinc-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {fields[section].map((field) => {
            const value = values[field];
            const boolean = booleanFields.has(field);
            return (
              <label key={field} className="block text-sm font-medium text-zinc-700">
                {t(`admin.configuration.fields.${field}`, label(field))}
                {boolean ? (
                  <span className="flex items-center gap-3 mt-2">
                    <input
                      type="checkbox"
                      checked={value === true}
                      onChange={(event) => setValues({ ...values, [field]: event.target.checked })}
                      className="h-4 w-4 accent-mehndi-600 rounded"
                    />
                    <span className="text-xs text-zinc-500">
                      {value ? t('admin.configuration.enabled') : t('admin.configuration.disabled')}
                    </span>
                  </span>
                ) : (
                  <input
                    type={
                      typeof value === 'number'
                        ? 'number'
                        : field.includes('color')
                          ? 'color'
                          : 'text'
                    }
                    value={typeof value === 'boolean' ? '' : (value ?? '')}
                    onChange={(event) =>
                      setValues({
                        ...values,
                        [field]:
                          typeof value === 'number'
                            ? Number(event.target.value)
                            : event.target.value,
                      })
                    }
                    className="input-field mt-2"
                  />
                )}
              </label>
            );
          })}
        </div>

        {update.isError && (
          <div
            role="alert"
            className="mt-5 flex gap-2 items-start text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded-lg"
          >
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="flex-1">
              {(update.error as { response?: { status?: number } })?.response?.status === 409 ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <span>{t('admin.configuration.conflict')}</span>
                  <button
                    type="button"
                    onClick={() => config.refetch()}
                    className="btn-secondary text-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    {t('admin.configuration.reload')}
                  </button>
                </div>
              ) : (
                <span>
                  {(update.error as any)?.response?.data?.error?.message ||
                    (update.error as any)?.response?.data?.detail ||
                    t('admin.configuration.saveError')}
                </span>
              )}
            </div>
          </div>
        )}

        {update.isSuccess && (
          <div
            role="status"
            className="mt-5 flex gap-2 items-center text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 p-3 rounded-lg"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{t('admin.configuration.saved')}</span>
          </div>
        )}

        <div className="flex justify-end mt-6">
          <button
            onClick={save}
            disabled={update.isPending || config.isLoading}
            className="btn-primary"
          >
            <Save className="w-4 h-4" />
            {update.isPending ? t('admin.configuration.saving') : t('common.actions.save')}
          </button>
        </div>
      </div>

      {/* Unsaved changes confirmation modal */}
      {pendingNavigation && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-zinc-200 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-bold text-zinc-900">
                {t('admin.configuration.unsavedChangesTitle')}
              </h3>
            </div>
            <p className="text-sm text-zinc-600 leading-relaxed">
              {t('admin.configuration.unsavedChangesWarning')}
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPendingNavigation(null)}
                className="btn-secondary"
              >
                {t('admin.configuration.stay')}
              </button>
              <button
                type="button"
                onClick={confirmDiscard}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors shadow-xs"
              >
                {t('admin.configuration.discard')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PageHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900">{title}</h1>
      <p className="text-sm text-zinc-500 mt-1">{subtitle}</p>
    </div>
  );
}
