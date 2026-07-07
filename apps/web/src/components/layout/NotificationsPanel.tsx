'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Check, Lightbulb, BookOpen, Calendar, Users } from 'lucide-react';
import { useState } from 'react';
import { api } from '../../lib/api-client';
import { TreeNavIcon } from '../brand/icons';
import type { Notification } from '@rootlink/shared';
import { formatDistanceToNow } from 'date-fns';

const TYPE_ICONS: Record<string, React.ReactNode> = {
  tree_invite:          <Users    size={14} />,
  hint_found:           <Lightbulb size={14} />,
  bio_ready:            <BookOpen  size={14} />,
  birthday_reminder:    <Calendar  size={14} />,
  anniversary_reminder: <Calendar  size={14} />,
  edit_made:            <TreeNavIcon size={14} />,
  conflict_detected:    <TreeNavIcon size={14} />,
};

const TYPE_COLORS: Record<string, string> = {
  hint_found:        'rgba(199,154,74,0.12)',
  bio_ready:         'rgba(102,136,204,0.12)',
  tree_invite:       'rgba(74,124,89,0.12)',
  birthday_reminder: 'rgba(242,78,14,0.10)',
  conflict_detected: 'rgba(227,50,9,0.10)',
};

export function NotificationsPanel() {
  const [open, setOpen]   = useState(false);
  const queryClient       = useQueryClient();

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<{ data: Notification[] }>('/v1/users/me/notifications?pageSize=20'),
    refetchInterval: 30 * 1000,
  });

  const notifications = data?.data ?? [];
  const unreadCount   = notifications.filter((n) => !n.read).length;

  const markAllMutation = useMutation({
    mutationFn: () => api.patch('/v1/users/me/notifications/read-all', {}),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-lg p-2 transition-colors hover:bg-[var(--bg-muted)]"
        aria-label="Notifications"
        aria-expanded={open}>
        <Bell size={15} style={{ color: 'var(--text-muted)' }} />
        {unreadCount > 0 && (
          <span
            className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full text-2xs font-bold text-white"
            style={{ background: 'var(--accent-ember)', fontSize: '9px' }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-10 z-50 w-80 overflow-hidden rounded-2xl"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                boxShadow: 'var(--shadow-lg)',
              }}>

              {/* Header */}
              <div className="flex items-center justify-between border-b px-4 py-3"
                style={{ borderColor: 'var(--border-subtle)' }}>
                <span className="text-sm font-semibold"
                  style={{ color: 'var(--text-primary)' }}>
                  Notifications
                </span>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllMutation.mutate()}
                      className="flex items-center gap-1 text-xs transition-colors"
                      style={{ color: 'var(--accent-ember)' }}>
                      <Check size={11} /> Mark all read
                    </button>
                  )}
                  <button onClick={() => setOpen(false)}
                    className="rounded p-0.5 transition-colors hover:bg-[var(--bg-muted)]">
                    <X size={13} style={{ color: 'var(--text-faint)' }} />
                  </button>
                </div>
              </div>

              {/* List */}
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-10 text-center">
                    <Bell size={24} className="mx-auto mb-2" style={{ color: 'var(--text-faint)' }} />
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      All caught up.
                    </p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className="flex items-start gap-3 border-b px-4 py-3 last:border-0"
                      style={{
                        borderColor: 'var(--border-subtle)',
                        background: n.read ? 'transparent' : 'var(--bg-subtle)',
                      }}>
                      <div
                        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                        style={{
                          background: TYPE_COLORS[n.type] ?? 'var(--bg-muted)',
                          color: 'var(--text-secondary)',
                        }}>
                        {TYPE_ICONS[n.type] ?? <Bell size={14} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium leading-snug"
                          style={{ color: 'var(--text-primary)' }}>
                          {n.title}
                        </p>
                        <p className="mt-0.5 text-xs leading-relaxed"
                          style={{ color: 'var(--text-muted)' }}>
                          {n.body}
                        </p>
                        <p className="mt-1 text-2xs" style={{ color: 'var(--text-faint)' }}>
                          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      {!n.read && (
                        <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                          style={{ background: 'var(--accent-ember)' }} />
                      )}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
