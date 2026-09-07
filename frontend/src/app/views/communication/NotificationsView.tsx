import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Check,
  ExternalLink,
  Filter,
  Calendar,
  Clock,
  Sparkles,
} from 'lucide-react';
import {
  useMyNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  InAppNotification,
} from '../../../lib/api/communication';

export const NotificationsView: React.FC = () => {
  const navigate = useNavigate();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const { data, isLoading } = useMyNotifications(unreadOnly);
  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();

  const notifications = data?.items || [];
  const unreadCount = data?.unreadCount || 0;

  const categories = [
    'ALL',
    'GENERAL',
    'ATTENDANCE',
    'EXAM',
    'RESULT',
    'FEES',
    'PAYROLL',
    'TRANSPORT',
    'EVENT',
    'SYSTEM',
    'SECURITY',
  ];

  const filteredNotifications = notifications.filter((item) => {
    if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
      return false;
    }
    return true;
  });

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'FEES':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'ATTENDANCE':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'EXAM':
      case 'RESULT':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'PAYROLL':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'TRANSPORT':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'SECURITY':
      case 'SYSTEM':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-zinc-100 text-zinc-700 border-zinc-200';
    }
  };

  const handleActionClick = (notification: InAppNotification) => {
    if (!notification.isRead) {
      markReadMutation.mutate(notification.id);
    }
    if (notification.actionUrl) {
      if (notification.actionUrl.startsWith('http://') || notification.actionUrl.startsWith('https://')) {
        window.open(notification.actionUrl, '_blank');
      } else {
        navigate(notification.actionUrl);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-mehndi-50 text-mehndi-700">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-zinc-900">In-App Notifications</h2>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-black rounded-full bg-rose-500 text-white">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500">
              Personal system alerts, event triggers, and transactional notices
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-zinc-700 cursor-pointer select-none bg-zinc-50 px-3 py-2 rounded-xl border border-zinc-200">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => setUnreadOnly(e.target.checked)}
              className="rounded border-zinc-300 text-mehndi-600 focus:ring-mehndi-500 h-4 w-4"
            />
            <span>Unread only</span>
          </label>

          {unreadCount > 0 && (
            <button
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 transition active:scale-98 disabled:opacity-50"
            >
              <CheckCheck className="w-4 h-4 text-zinc-600" />
              <span>Mark all as read</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-xs font-semibold text-zinc-400 mr-1 flex items-center gap-1">
          <Filter className="w-3.5 h-3.5" /> Filter:
        </span>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              selectedCategory === cat
                ? 'bg-zinc-900 text-white shadow-2xs'
                : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Notification Cards List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-zinc-200/80">
          <Clock className="w-8 h-8 text-zinc-300 animate-spin mb-3" />
          <p className="text-sm font-medium text-zinc-500">Loading notifications...</p>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-zinc-200/80 text-center">
          <Sparkles className="w-10 h-10 text-zinc-300 mb-3" />
          <h3 className="text-sm font-bold text-zinc-900">All caught up!</h3>
          <p className="text-xs text-zinc-500 max-w-sm mt-1">
            {unreadOnly
              ? 'No unread notifications at the moment.'
              : 'There are no notifications matching your filter criteria.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-4 rounded-2xl border transition-all duration-150 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                notif.isRead
                  ? 'border-zinc-200/70 text-zinc-600 opacity-80 hover:opacity-100'
                  : 'border-mehndi-200 shadow-2xs ring-1 ring-mehndi-500/10'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className="mt-0.5">
                  {!notif.isRead ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-mehndi-500 block ring-4 ring-mehndi-100" />
                  ) : (
                    <span className="w-2.5 h-2.5 rounded-full bg-zinc-300 block" />
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${getCategoryBadgeClass(
                        notif.category
                      )}`}
                    >
                      {notif.category}
                    </span>
                    <h4
                      className={`text-sm font-bold ${
                        notif.isRead ? 'text-zinc-700' : 'text-zinc-900'
                      }`}
                    >
                      {notif.title}
                    </h4>
                  </div>
                  <p className="text-xs text-zinc-600 max-w-3xl leading-relaxed whitespace-pre-line">
                    {notif.body}
                  </p>
                  <div className="flex items-center gap-3 pt-1 text-[11px] text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(notif.createdAt).toLocaleString()}
                    </span>
                    {notif.readAt && (
                      <span className="flex items-center gap-1 text-zinc-400">
                        <Check className="w-3 h-3 text-emerald-500" />
                        Read {new Date(notif.readAt).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                {notif.actionUrl && (
                  <button
                    onClick={() => handleActionClick(notif)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-mehndi-50 hover:bg-mehndi-100 text-mehndi-700 transition"
                  >
                    <span>Open</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}

                {!notif.isRead && (
                  <button
                    onClick={() => markReadMutation.mutate(notif.id)}
                    disabled={markReadMutation.isPending}
                    title="Mark as read"
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsView;
