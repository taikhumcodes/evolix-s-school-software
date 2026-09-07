import React, { useState, useRef, useEffect } from 'react';
import { Bell, CheckCheck, ExternalLink, Inbox } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMyNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '../../lib/api/communication';

export const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useMyNotifications(false);
  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();

  const unreadCount = data?.unreadCount || 0;
  const notifications = data?.items?.slice(0, 6) || [];

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = async (notif: any) => {
    if (!notif.isRead) {
      await markReadMutation.mutateAsync(notif.id);
    }
    if (notif.actionUrl && notif.actionUrl.startsWith('/')) {
      navigate(notif.actionUrl);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-zinc-600 hover:text-zinc-900 bg-white hover:bg-zinc-50 border border-zinc-200 shadow-2xs transition-all focus:outline-hidden focus:ring-2 focus:ring-mehndi-500/20"
        aria-label="Notifications"
        title="In-App Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-mehndi-600 text-[10px] font-bold text-white shadow-xs animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-zinc-200/80 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="p-3.5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-zinc-900">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-mehndi-100 text-mehndi-700">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                className="text-xs font-semibold text-mehndi-600 hover:text-mehndi-700 flex items-center gap-1 transition-colors disabled:opacity-50"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-zinc-100">
            {isLoading ? (
              <div className="p-8 text-center text-zinc-400 text-xs font-medium">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center text-zinc-400">
                <Inbox className="w-8 h-8 stroke-[1.5] mb-2 text-zinc-300" />
                <p className="text-xs font-medium text-zinc-500">No notifications yet</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">System and event alerts will appear here</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-3.5 transition-colors cursor-pointer flex gap-3 items-start ${
                    n.isRead ? 'bg-white hover:bg-zinc-50/80' : 'bg-mehndi-50/30 hover:bg-mehndi-50/60'
                  }`}
                >
                  <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${n.isRead ? 'bg-transparent' : 'bg-mehndi-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs ${n.isRead ? 'text-zinc-700 font-medium' : 'text-zinc-900 font-bold'}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2 leading-relaxed">
                      {n.body}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-zinc-400">
                      <span>{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {n.actionUrl && (
                        <span className="flex items-center gap-0.5 text-mehndi-600 font-semibold hover:underline">
                          View details <ExternalLink className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-2 border-t border-zinc-100 bg-zinc-50/60 text-center">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/communication/notifications');
              }}
              className="w-full py-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900 hover:bg-white rounded-lg transition-colors"
            >
              Open Notification Center →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
