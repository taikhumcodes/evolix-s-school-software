import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Moon,
  Clock,
  Send,
  ShieldCheck,
  Radio,
  Save,
  CheckCircle2,
  AlertTriangle,
  Info,
  Smartphone,
  Mail,
  MessageSquare,
  Bell,
} from 'lucide-react';
import {
  useCommunicationSettings,
  useUpdateCommunicationSettings,
  useProviderStatuses,
} from '../../../lib/api/communication';

export const SettingsView: React.FC = () => {
  const { data: settings, isLoading: settingsLoading } = useCommunicationSettings();
  const { data: providers, isLoading: providersLoading } = useProviderStatuses();
  const updateMutation = useUpdateCommunicationSettings();

  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietHoursStart, setQuietHoursStart] = useState('21:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState('07:00');
  const [bulkApprovalThreshold, setBulkApprovalThreshold] = useState<number>(100);
  const [defaultChannels, setDefaultChannels] = useState<string[]>(['IN_APP']);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setQuietHoursEnabled(settings.quietHoursEnabled);
      setQuietHoursStart(settings.quietHoursStart || '21:00');
      setQuietHoursEnd(settings.quietHoursEnd || '07:00');
      setBulkApprovalThreshold(settings.bulkApprovalThreshold || 100);
      setDefaultChannels(settings.defaultChannels || ['IN_APP']);
    }
  }, [settings?.id, settings?.version]);

  const handleChannelToggle = (channel: string) => {
    if (defaultChannels.includes(channel)) {
      if (defaultChannels.length === 1) return; // Keep at least one default channel
      setDefaultChannels(defaultChannels.filter((c) => c !== channel));
    } else {
      setDefaultChannels([...defaultChannels, channel]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      await updateMutation.mutateAsync({
        quietHoursEnabled,
        quietHoursStart,
        quietHoursEnd,
        bulkApprovalThreshold: Number(bulkApprovalThreshold),
        defaultChannels,
        version: settings?.version ?? 1, // Optimistic concurrency check (Rule 63)
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      if (err.response?.status === 409) {
        setErrorMessage('Settings have been modified by another user or session. Please refresh the page and try again.');
      } else {
        setErrorMessage(err.response?.data?.message || err.message || 'Failed to update settings');
      }
    }
  };

  const getProviderIcon = (channel: string) => {
    switch (channel) {
      case 'EMAIL':
        return Mail;
      case 'SMS':
        return MessageSquare;
      case 'WHATSAPP':
        return Smartphone;
      default:
        return Bell;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-mehndi-50 text-mehndi-700">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900">Communication & Provider Settings</h2>
            <p className="text-xs text-zinc-500">
              Quiet hours window, bulk safety thresholds, default channels, and provider connectivity
            </p>
          </div>
        </div>

        {saveSuccess && (
          <div className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-4 h-4" />
            <span>Settings saved successfully</span>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Grid: Settings Form & Provider Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Form */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-2xs space-y-6">
            {/* Section 1: Quiet Hours (Rules 25, 26, 27) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                    <Moon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900">Quiet Hours Protection</h3>
                    <p className="text-[11px] text-zinc-500">
                      Prevent disturbing parents and staff during night hours (overnight wrap-around supported)
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={quietHoursEnabled}
                    onChange={(e) => setQuietHoursEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-mehndi-600"></div>
                </label>
              </div>

              {quietHoursEnabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 bg-zinc-50/70 p-4 rounded-xl border border-zinc-200/60">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Start Time (Evening)
                    </label>
                    <div className="relative">
                      <input
                        type="time"
                        value={quietHoursStart}
                        onChange={(e) => setQuietHoursStart(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-xs font-mono font-medium rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-mehndi-500"
                      />
                    </div>
                    <span className="text-[10px] text-zinc-400 mt-1 block">Default: 21:00 (9:00 PM)</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      End Time (Next Morning)
                    </label>
                    <div className="relative">
                      <input
                        type="time"
                        value={quietHoursEnd}
                        onChange={(e) => setQuietHoursEnd(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-xs font-mono font-medium rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-mehndi-500"
                      />
                    </div>
                    <span className="text-[10px] text-zinc-400 mt-1 block">Default: 07:00 (7:00 AM)</span>
                  </div>

                  <div className="sm:col-span-2 text-[11px] text-zinc-600 flex items-start gap-1.5 pt-1">
                    <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                    <span>
                      Routine fee reminders and general broadcasts queued during quiet hours are automatically deferred until <strong>{quietHoursEnd}</strong>. Urgent emergency and student attendance alerts bypass quiet hours.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Section 2: Bulk Approval Threshold (Rules 21, 22) */}
            <div className="space-y-4 pt-4 border-t border-zinc-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">Bulk Send Approval Threshold</h3>
                  <p className="text-[11px] text-zinc-500">
                    Maximum recipients allowed in an automated broadcast before requiring managerial approval
                  </p>
                </div>
              </div>

              <div className="max-w-xs">
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Threshold Count (Recipients)
                </label>
                <input
                  type="number"
                  min="10"
                  max="10000"
                  value={bulkApprovalThreshold}
                  onChange={(e) => setBulkApprovalThreshold(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-mehndi-500"
                />
                <span className="text-[10px] text-zinc-400 mt-1 block">
                  Broadcasts targeting more than {bulkApprovalThreshold} recipients will require manual approval before dispatch.
                </span>
              </div>
            </div>

            {/* Section 3: Default Notification Channels */}
            <div className="space-y-4 pt-4 border-t border-zinc-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">Default Dispatch Channels</h3>
                  <p className="text-[11px] text-zinc-500">
                    Channels enabled for standard school system communications
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: 'IN_APP', label: 'In-App Portal', icon: Bell },
                  { id: 'EMAIL', label: 'Email', icon: Mail },
                  { id: 'SMS', label: 'SMS Gateway', icon: MessageSquare },
                  { id: 'WHATSAPP', label: 'WhatsApp', icon: Smartphone },
                ].map((item) => {
                  const Icon = item.icon;
                  const isChecked = defaultChannels.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleChannelToggle(item.id)}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition ${
                        isChecked
                          ? 'border-mehndi-500 bg-mehndi-50/50 text-mehndi-900 ring-1 ring-mehndi-500'
                          : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                      }`}
                    >
                      <Icon className="w-5 h-5 mb-1 text-zinc-700" />
                      <span className="text-xs font-bold">{item.label}</span>
                      <span className="text-[10px] text-zinc-400 mt-0.5">
                        {isChecked ? 'Enabled' : 'Disabled'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-zinc-100 flex justify-end">
              <button
                type="submit"
                disabled={updateMutation.isPending || settingsLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition active:scale-98 disabled:opacity-50 shadow-sm"
              >
                <Save className="w-4 h-4" />
                <span>{updateMutation.isPending ? 'Saving...' : 'Save Configuration'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right 1 Col: Provider Status Grid (Rules 64 & 68) */}
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-2xs space-y-4">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-mehndi-600" />
              <h3 className="text-sm font-bold text-zinc-900">Provider Status Grid</h3>
            </div>
            <p className="text-xs text-zinc-500">
              Live connectivity checks and environment adapter capabilities (Rule 64 safe status metadata).
            </p>

            {providersLoading ? (
              <div className="flex items-center justify-center p-6 text-zinc-400">
                <Clock className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-3">
                {providers?.map((p) => {
                  const Icon = getProviderIcon(p.channel);
                  return (
                    <div
                      key={p.provider}
                      className="p-3.5 rounded-xl border border-zinc-200/80 bg-zinc-50/50 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-zinc-600" />
                          <span className="text-xs font-bold text-zinc-900">{p.provider}</span>
                        </div>
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                            p.available
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {p.available ? 'AVAILABLE' : 'DEGRADED'}
                        </span>
                      </div>

                      <div className="text-[11px] text-zinc-600">
                        <span className="text-zinc-400 font-semibold">Channel:</span> {p.channel}
                      </div>

                      <div className="text-[11px] text-zinc-500 leading-snug">
                        {p.statusText}
                      </div>

                      <div className="text-[10px] text-zinc-400 flex items-center gap-1 pt-1 border-t border-zinc-200/60 font-mono">
                        <Clock className="w-2.5 h-2.5" />
                        Checked: {new Date(p.lastCheckedAt).toLocaleTimeString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
