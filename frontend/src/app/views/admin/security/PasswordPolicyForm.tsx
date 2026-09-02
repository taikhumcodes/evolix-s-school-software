import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import apiClient from '../../../../lib/api-client';

export default function PasswordPolicyForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const { register, handleSubmit, reset } = useForm();

  useEffect(() => {
    const loadPolicy = async () => {
      try {
        const res = await apiClient.get('/security/policy');
        reset(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadPolicy();
  }, [reset]);

  const onSubmit = async (data: any) => {
    try {
      setSaving(true);
      setSuccess(false);
      await apiClient.patch('/security/policy', data);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8">Loading policy...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Password Policy</h1>
          <p className="text-zinc-500 text-sm mt-1">
            Configure security requirements for all user accounts.
          </p>
        </div>
        {success && (
          <div className="px-4 py-2 bg-emerald-50 text-emerald-700 text-sm font-bold rounded-lg border border-emerald-200">
            Policy saved successfully
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 md:p-8 space-y-8">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 mb-4 pb-2 border-b border-zinc-100">
              Complexity Requirements
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                  Minimum Length
                </label>
                <input
                  {...register('password_min_length', { valueAsNumber: true })}
                  type="number"
                  min="8"
                  max="32"
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mehndi-500/20 focus:border-mehndi-500"
                />
              </div>
              <div className="space-y-3 pt-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    {...register('password_require_uppercase')}
                    className="rounded border-zinc-300 text-mehndi-600 focus:ring-mehndi-500"
                  />
                  <span className="text-sm text-zinc-700 font-medium">
                    Require Uppercase Letter
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    {...register('password_require_lowercase')}
                    className="rounded border-zinc-300 text-mehndi-600 focus:ring-mehndi-500"
                  />
                  <span className="text-sm text-zinc-700 font-medium">
                    Require Lowercase Letter
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    {...register('password_require_number')}
                    className="rounded border-zinc-300 text-mehndi-600 focus:ring-mehndi-500"
                  />
                  <span className="text-sm text-zinc-700 font-medium">Require Number</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    {...register('password_require_special')}
                    className="rounded border-zinc-300 text-mehndi-600 focus:ring-mehndi-500"
                  />
                  <span className="text-sm text-zinc-700 font-medium">
                    Require Special Character
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-zinc-900 mb-4 pb-2 border-b border-zinc-100">
              Expiration & History
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                  Password Expiration (Days)
                </label>
                <input
                  {...register('password_expiry_days', { valueAsNumber: true })}
                  type="number"
                  placeholder="0 for never"
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mehndi-500/20 focus:border-mehndi-500"
                />
                <p className="text-[11px] text-zinc-500 mt-1">Set to 0 to disable expiration.</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                  Enforce Password History
                </label>
                <input
                  {...register('password_history_count', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  max="24"
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mehndi-500/20 focus:border-mehndi-500"
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  Number of previous passwords that cannot be reused.
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-zinc-900 mb-4 pb-2 border-b border-zinc-100">
              Lockout Policy
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                  Max Failed Attempts
                </label>
                <input
                  {...register('max_failed_attempts', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mehndi-500/20 focus:border-mehndi-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                  Lockout Duration (Minutes)
                </label>
                <input
                  {...register('lockout_minutes', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mehndi-500/20 focus:border-mehndi-500"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-200 flex justify-end gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-zinc-900 text-white rounded-lg text-sm font-bold hover:bg-zinc-800 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Save Policy'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
