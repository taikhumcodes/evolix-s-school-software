import { useState, useMemo } from 'react';
import { ChevronDown, Filter, History } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTenant } from '../../../core/tenancy/TenantContext';
import { useConfigurationHistory, ConfigurationHistoryEntry } from '../../../lib/api/configuration';

export default function ConfigurationHistory() {
  const { t } = useTranslation();
  const { currentTenant } = useTenant();
  const [action, setAction] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const history = useConfigurationHistory(currentTenant?.schoolId, action, dateFrom, dateTo);

  const actionOptions = useMemo(() => {
    const set = new Set<string>();
    history.data?.forEach((item) => {
      if (item.action) set.add(item.action);
    });
    return Array.from(set);
  }, [history.data]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">
          {t('admin.configuration.history.title')}
        </h1>
        <p className="text-sm text-zinc-500 mt-1">{t('admin.configuration.history.subtitle')}</p>
      </div>

      <div className="glass-panel p-4 bg-white/70 border border-zinc-200 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-zinc-500 text-xs font-semibold uppercase tracking-wider">
          <Filter className="w-4 h-4" />
          <span>{t('admin.configuration.history.filter')}</span>
        </div>

        <div className="flex-1 min-w-[200px]">
          <select
            id="configuration-action"
            value={action}
            onChange={(event) => setAction(event.target.value)}
            className="input-field w-full text-sm"
          >
            <option value="">{t('admin.configuration.history.allActions')}</option>
            {actionOptions.map((act) => (
              <option key={act} value={act}>
                {act}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-zinc-600">
            {t('admin.configuration.history.from')}
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="input-field mt-1 text-xs"
            />
          </label>
          <label className="text-xs font-medium text-zinc-600">
            {t('admin.configuration.history.to')}
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="input-field mt-1 text-xs"
            />
          </label>
        </div>
      </div>

      <div className="glass-panel overflow-hidden bg-white/70 border border-zinc-200">
        {history.data?.length ? (
          <div className="divide-y divide-zinc-100">
            {history.data.map((item) => (
              <HistoryRow key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="p-12 text-center text-sm text-zinc-500 flex flex-col items-center justify-center gap-2">
            <History className="w-8 h-8 text-zinc-300" />
            <span>{t('admin.configuration.history.empty')}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryRow({ item }: { item: ConfigurationHistoryEntry }) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  const formatJson = (data: unknown) => {
    if (!data) return t('admin.configuration.history.none');
    if (typeof data === 'object') {
      try {
        return JSON.stringify(data, null, 2);
      } catch {
        return String(data);
      }
    }
    return String(data);
  };

  return (
    <div className="p-4 hover:bg-zinc-50/50 transition-colors">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-left"
        type="button"
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-900 text-sm">{item.action}</span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 border border-zinc-200">
              {item.entity_type}
            </span>
          </div>
          <span className="block text-xs text-zinc-500 mt-1">
            {new Date(item.created_at).toLocaleString()} ·{' '}
            {item.user_id
              ? `${t('admin.configuration.history.user')}: ${item.user_id}`
              : t('admin.configuration.history.systemUser')}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-xs">
          <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 overflow-auto">
            <strong className="block text-zinc-700 font-semibold mb-1">
              {t('admin.configuration.history.before')}
            </strong>
            <pre className="font-mono text-[11px] whitespace-pre-wrap text-zinc-600">
              {formatJson(item.before_data)}
            </pre>
          </div>
          <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 overflow-auto">
            <strong className="block text-zinc-700 font-semibold mb-1">
              {t('admin.configuration.history.after')}
            </strong>
            <pre className="font-mono text-[11px] whitespace-pre-wrap text-zinc-600">
              {formatJson(item.after_data)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
