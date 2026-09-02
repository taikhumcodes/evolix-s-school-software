import { useState, useEffect } from 'react';
import apiClient from '../../../../lib/api-client';
import { ShieldAlert, ShieldCheck, Key, LogIn, Users } from 'lucide-react';

export default function SecurityEventsLog() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const res = await apiClient.get('/security/events');
      setEvents(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8">Loading events...</div>;

  const getEventIcon = (eventType: string, severity: string) => {
    if (severity === 'CRITICAL' || severity === 'WARNING') {
      return (
        <ShieldAlert
          className={`w-4 h-4 ${severity === 'CRITICAL' ? 'text-red-600' : 'text-amber-600'}`}
        />
      );
    }

    if (eventType.includes('PASSWORD')) return <Key className="w-4 h-4 text-indigo-600" />;
    if (eventType.includes('LOGIN') || eventType.includes('SESSION') || eventType.includes('2FA'))
      return <LogIn className="w-4 h-4 text-emerald-600" />;
    if (eventType.includes('POLICY') || eventType.includes('IP_RULE'))
      return <ShieldCheck className="w-4 h-4 text-blue-600" />;

    return <Users className="w-4 h-4 text-zinc-500" />;
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">
            CRITICAL
          </span>
        );
      case 'WARNING':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
            WARNING
          </span>
        );
      case 'INFO':
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 text-zinc-600">
            INFO
          </span>
        );
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">Security Events Log</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Immutable audit log of all security and access-related activities.
        </p>
      </div>

      <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm text-zinc-600">
          <thead className="bg-zinc-50/50 border-b border-zinc-200 text-xs uppercase font-bold text-zinc-500">
            <tr>
              <th className="px-6 py-4">Event</th>
              <th className="px-6 py-4">Severity</th>
              <th className="px-6 py-4">User ID</th>
              <th className="px-6 py-4">IP Address</th>
              <th className="px-6 py-4">Metadata</th>
              <th className="px-6 py-4 text-right">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {events.map((event) => (
              <tr key={event.id} className="hover:bg-zinc-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white border border-zinc-200 flex items-center justify-center shadow-sm">
                      {getEventIcon(event.event_type, event.severity)}
                    </div>
                    <span className="font-bold text-zinc-900">{event.event_type}</span>
                  </div>
                </td>
                <td className="px-6 py-4">{getSeverityBadge(event.severity)}</td>
                <td
                  className="px-6 py-4 font-mono text-[11px] text-zinc-500 truncate max-w-[150px]"
                  title={event.user_id}
                >
                  {event.user_id || 'System'}
                </td>
                <td className="px-6 py-4 font-mono text-xs">{event.ip_address || '-'}</td>
                <td
                  className="px-6 py-4 text-xs text-zinc-500 truncate max-w-[200px]"
                  title={event.metadata_info || ''}
                >
                  {event.metadata_info || '-'}
                </td>
                <td className="px-6 py-4 text-right text-xs whitespace-nowrap">
                  {new Date(event.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-zinc-500 text-sm">
                  No security events found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
