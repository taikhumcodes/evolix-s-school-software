import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Eye, Loader2, Lock, RefreshCw, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTenant } from '../../../core/tenancy/TenantContext';
import {
  NumberSeries,
  useNumberSeries,
  useNumberSeriesPreview,
  useUpdateNumberSeries,
} from '../../../lib/api/configuration';

export default function NumberSeriesConfiguration() {
  const { t } = useTranslation();
  const { currentTenant } = useTenant();
  const schoolId = currentTenant?.schoolId;
  const series = useNumberSeries(schoolId);
  const update = useUpdateNumberSeries(schoolId);
  const [selected, setSelected] = useState<NumberSeries>();
  const [values, setValues] = useState<Partial<NumberSeries>>({});
  const preview = useNumberSeriesPreview(selected?.id, values, schoolId);

  useEffect(() => {
    if (series.data?.length && !selected) {
      setSelected(series.data[0]);
      setValues(series.data[0]);
    }
  }, [series.data, selected]);

  const choose = (item: NumberSeries) => {
    setSelected(item);
    setValues(item);
  };

  const save = async () => {
    if (selected) await update.mutateAsync({ id: selected.id, values });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">
          {t('admin.configuration.numberSeries.title')}
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          {t('admin.configuration.numberSeries.subtitle')}
        </p>
      </div>
      {series.isLoading || !schoolId ? (
        <div className="flex items-center justify-center p-12">
          <div className="flex items-center gap-3 text-zinc-500 text-sm">
            <Loader2 className="w-5 h-5 animate-spin text-mehndi-600" />
            <span>{t('admin.configuration.loading')}</span>
          </div>
        </div>
      ) : series.data?.length ? (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-5">
          <div className="glass-panel p-4 bg-white/70 border border-zinc-200 space-y-2">
            {series.data.map((item) => (
              <button
                key={item.id}
                onClick={() => choose(item)}
                className={`w-full text-left px-3 py-3 rounded-lg border text-sm transition-colors ${item.id === selected?.id ? 'border-mehndi-300 bg-mehndi-50' : 'border-zinc-200 bg-white hover:bg-zinc-50'}`}
              >
                <span className="font-semibold text-zinc-900">
                  {t(`admin.configuration.numberSeries.codes.${item.code}`, item.code)}
                </span>
                <span className="block text-xs text-zinc-500 mt-1 font-mono">
                  {item.prefix || ''}
                  {String(item.current_value + 1).padStart(item.padding, '0')}
                  {item.suffix || ''}
                </span>
              </button>
            ))}
          </div>

          <div className="glass-panel p-5 md:p-7 bg-white/70 border border-zinc-200 space-y-5">
            {selected && (
              <>
                <div className="flex items-center justify-between p-3 bg-zinc-50 border border-zinc-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-zinc-400 shrink-0" />
                    <div>
                      <span className="text-xs font-semibold text-zinc-700 block">
                        {t('admin.configuration.numberSeries.currentSequence')}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {t('admin.configuration.numberSeries.sequenceLockNotice')}
                      </span>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-zinc-900 bg-white px-3 py-1 rounded border border-zinc-200 text-sm">
                    {selected.current_value}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <Field
                      label={t('admin.configuration.numberSeries.prefix')}
                      value={values.prefix || ''}
                      onChange={(value) => setValues({ ...values, prefix: value })}
                    />
                    <span className="text-[11px] text-zinc-500 mt-1 block">
                      {t('admin.configuration.numberSeries.tokenHelp')}
                    </span>
                  </div>

                  <div>
                    <Field
                      label={t('admin.configuration.numberSeries.suffix')}
                      value={values.suffix || ''}
                      onChange={(value) => setValues({ ...values, suffix: value })}
                    />
                    <span className="text-[11px] text-zinc-500 mt-1 block">
                      {t('admin.configuration.numberSeries.tokenHelp')}
                    </span>
                  </div>

                  <label className="block text-sm font-medium text-zinc-700">
                    {t('admin.configuration.numberSeries.padding')}
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={values.padding || 1}
                      onChange={(event) =>
                        setValues({ ...values, padding: Number(event.target.value) })
                      }
                      className="input-field mt-2"
                    />
                    <span className="text-[11px] text-zinc-500 mt-1 block">
                      {t('admin.configuration.numberSeries.paddingHelp')}
                    </span>
                  </label>

                  <label className="block text-sm font-medium text-zinc-700">
                    {t('admin.configuration.numberSeries.resetStrategy')}
                    <select
                      value={values.reset_strategy || 'NEVER'}
                      onChange={(event) =>
                        setValues({ ...values, reset_strategy: event.target.value })
                      }
                      className="input-field mt-2"
                    >
                      <option value="NEVER">{t('admin.configuration.numberSeries.never')}</option>
                      <option value="ACADEMIC_YEAR">
                        {t('admin.configuration.numberSeries.academicYear')}
                      </option>
                      <option value="CALENDAR_YEAR">
                        {t('admin.configuration.numberSeries.calendarYear')}
                      </option>
                      <option value="MONTHLY">
                        {t('admin.configuration.numberSeries.monthly')}
                      </option>
                    </select>
                    <span className="text-[11px] text-zinc-500 mt-1 block">
                      {t('admin.configuration.numberSeries.resetHelp')}
                    </span>
                  </label>
                </div>

                <div className="p-4 rounded-lg bg-zinc-900 text-white shadow-sm">
                  <div className="flex items-center gap-2 text-xs text-zinc-300 font-medium">
                    <Eye className="w-4 h-4 text-mehndi-400" />
                    {t('admin.configuration.numberSeries.preview')}
                  </div>
                  <div className="font-mono text-xl mt-2 tracking-wider text-mehndi-200">
                    {preview.data?.preview || t('admin.configuration.loading')}
                  </div>
                </div>

                {update.isError && (
                  <div
                    role="alert"
                    className="flex gap-2 items-start text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded-lg"
                  >
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      {(update.error as { response?: { status?: number } })?.response?.status ===
                      409 ? (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <span>{t('admin.configuration.conflict')}</span>
                          <button
                            type="button"
                            onClick={() => series.refetch()}
                            className="btn-secondary text-xs"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            {t('admin.configuration.reload')}
                          </button>
                        </div>
                      ) : (
                        <span>{t('admin.configuration.saveError')}</span>
                      )}
                    </div>
                  </div>
                )}

                {update.isSuccess && (
                  <div
                    role="status"
                    className="flex gap-2 items-center text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 p-3 rounded-lg"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{t('admin.configuration.saved')}</span>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button onClick={save} disabled={update.isPending} className="btn-primary">
                    <Save className="w-4 h-4" />
                    {update.isPending ? t('admin.configuration.saving') : t('common.actions.save')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="glass-panel p-8 text-center text-sm text-zinc-500">
          {t('admin.configuration.numberSeries.empty')}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-medium text-zinc-700">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="input-field mt-2"
      />
    </label>
  );
}
