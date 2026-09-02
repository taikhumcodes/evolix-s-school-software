import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Trash2, ShieldCheck, ShieldAlert } from 'lucide-react';
import apiClient from '../../../../lib/api-client';

export default function IpRestrictionsList() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm();

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      const res = await apiClient.get('/security/ip-restrictions');
      setRules(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: any) => {
    try {
      setError('');
      await apiClient.post('/security/ip-restrictions', data);
      reset();
      setAdding(false);
      loadRules();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to add rule');
    }
  };

  const deleteRule = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this rule?')) return;
    try {
      await apiClient.delete(`/security/ip-restrictions/${id}`);
      loadRules();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="p-8">Loading rules...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">IP Restrictions</h1>
          <p className="text-zinc-500 text-sm mt-1">Manage network access rules for your tenant.</p>
        </div>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-bold hover:bg-zinc-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Rule
          </button>
        )}
      </div>

      {adding && (
        <div className="mb-8 p-6 bg-white border border-zinc-200 rounded-2xl shadow-sm">
          <h2 className="text-lg font-bold text-zinc-900 mb-4">Add New Rule</h2>
          {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">Network CIDR</label>
                <input
                  {...register('network_cidr', { required: true })}
                  placeholder="e.g., 192.168.1.0/24 or 203.0.113.50/32"
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mehndi-500/20 focus:border-mehndi-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">Rule Type</label>
                <select
                  {...register('rule_type')}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mehndi-500/20 focus:border-mehndi-500"
                >
                  <option value="ALLOW">Allow</option>
                  <option value="DENY">Deny</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                  Description (Optional)
                </label>
                <input
                  {...register('description')}
                  placeholder="e.g., Main Office"
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mehndi-500/20 focus:border-mehndi-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="px-4 py-2 bg-white text-zinc-600 border border-zinc-200 rounded-lg text-sm font-semibold hover:bg-zinc-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-bold hover:bg-zinc-800 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? 'Adding...' : 'Add Rule'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm text-zinc-600">
          <thead className="bg-zinc-50/50 border-b border-zinc-200 text-xs uppercase font-bold text-zinc-500">
            <tr>
              <th className="px-6 py-4">Rule Type</th>
              <th className="px-6 py-4">Network (CIDR)</th>
              <th className="px-6 py-4">Description</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {rules.map((rule) => (
              <tr key={rule.id} className="hover:bg-zinc-50/50 transition-colors">
                <td className="px-6 py-4">
                  {rule.rule_type === 'ALLOW' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <ShieldCheck className="w-3.5 h-3.5" /> Allow
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                      <ShieldAlert className="w-3.5 h-3.5" /> Deny
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 font-mono font-medium text-zinc-900">
                  {rule.network_cidr}
                </td>
                <td className="px-6 py-4 text-zinc-500">{rule.description || '-'}</td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => deleteRule(rule.id)}
                    className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Rule"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {rules.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-zinc-500 text-sm">
                  No IP restriction rules configured. All traffic is allowed by default.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
