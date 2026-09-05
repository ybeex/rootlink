'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { LogOut, Sun, Moon, Monitor, Bell, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { api } from '../../lib/api-client';
import { NotificationsPanel } from '../../components/layout/NotificationsPanel';
import { PageTransition } from '../../components/layout/PageTransition';
import { useQuery } from '@tanstack/react-query';
import type { User } from '@rootlink/shared';
import { RootLinkIcon } from '../../components/brand/Logo';
import { OfflineBanner } from '../../components/OfflineBanner';
import {
  TreeNavIcon, PeopleNavIcon, MediaNavIcon,
  SearchNavIcon, SettingsNavIcon, AdminNavIcon, DnaNavIcon,
} from '../../components/brand/icons';

const NAV = [
  { href: '/dashboard', label: 'Trees',   Icon: TreeNavIcon   },
  { href: '/people',    label: 'People',  Icon: PeopleNavIcon },
  { href: '/media',     label: 'Media',   Icon: MediaNavIcon  },
  { href: '/search',    label: 'Search',  Icon: SearchNavIcon },
];

const TIER_LABEL: Record<string, string> = {
  free: 'Free', plus: 'Plus', pro: 'Pro',
};
const TIER_COLOR: Record<string, { bg: string; text: string }> = {
  free: { bg: 'var(--bg-subtle)',       text: 'var(--text-faint)'  },
  plus: { bg: 'rgba(59,130,246,0.10)',  text: '#2563EB'            },
  pro:  { bg: 'var(--accent-ember-soft)', text: 'var(--accent-ember)' },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, clearAuth, setUser } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) router.replace('/login');
  }, [isAuthenticated, router]);

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn:  () => api.get<User>('/v1/users/me'),
    enabled:  isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => { if (user) setUser(user); }, [user, setUser]);

  const handleLogout = async () => {
    try { await api.post('/v1/auth/logout', {}); } catch { /* ignore */ }
    clearAuth();
    router.replace('/login');
  };

  if (!isAuthenticated) return null;

  const tier = (user?.subscriptionTier ?? 'free') as string;
  const tierStyle = TIER_COLOR[tier] ?? TIER_COLOR.free;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-base)' }}>

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside
        className="flex shrink-0 flex-col border-r transition-all duration-300"
        style={{
          width: collapsed ? '64px' : '220px',
          background: 'var(--bg-surface)',
          borderColor: 'var(--border-default)',
        }}
      >
        {/* Logo row */}
        <div
          className="flex h-[60px] shrink-0 items-center justify-between border-b px-4"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <Link href="/dashboard" className="flex items-center gap-2.5 overflow-hidden">
            <RootLinkIcon size={30} className="shrink-0" />
            {!collapsed && (
              <div className="flex items-baseline leading-none overflow-hidden">
                <span className="font-display font-bold text-lg tracking-tight truncate"
                  style={{ color: 'var(--accent-primary)' }}>Root</span>
                <span className="font-display font-normal text-lg tracking-tight"
                  style={{ color: 'var(--accent-canopy)' }}>Link</span>
              </div>
            )}
          </Link>

          <button
            onClick={() => setCollapsed(c => !c)}
            className="shrink-0 rounded-lg p-1.5 transition-colors hover:bg-[var(--bg-subtle)]"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed
              ? <ChevronRight size={14} style={{ color: 'var(--text-faint)' }} />
              : <ChevronLeft  size={14} style={{ color: 'var(--text-faint)' }} />
            }
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 space-y-0.5 px-2 py-4">
          {NAV.map(({ href, label, Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href} href={href}
                title={collapsed ? label : undefined}
                className="flex items-center gap-3 rounded-xl transition-all duration-150 group"
                style={{
                  padding: collapsed ? '10px' : '9px 12px',
                  background:   active ? undefined : 'transparent',
                  position:     'relative',
                }}
              >
                {/* Active indicator — amber left bar */}
                {active && (
                  <div
                    className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full"
                    style={{ background: 'var(--accent-ember)' }}
                  />
                )}
                {/* Background */}
                {active && (
                  <div
                    className="absolute inset-0 rounded-xl"
                    style={{ background: 'var(--bg-subtle)', opacity: 0.9 }}
                  />
                )}
                <Icon
                  size={18}
                  color={active ? 'var(--accent-primary)' : 'var(--text-muted)'}
                  className="relative shrink-0 transition-colors group-hover:text-[var(--text-primary)]"
                />
                {!collapsed && (
                  <span
                    className="relative text-sm font-medium transition-colors"
                    style={{ color: active ? 'var(--text-primary)' : 'var(--text-muted)' }}
                  >
                    {label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div
          className="space-y-0.5 border-t px-2 py-3"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <Link
            href="/settings"
            title={collapsed ? 'Settings' : undefined}
            className="flex items-center gap-3 rounded-xl transition-colors group"
            style={{ padding: collapsed ? '10px' : '9px 12px' }}
          >
            <SettingsNavIcon
              size={18} color="var(--text-muted)"
              className="shrink-0 transition-colors group-hover:text-[var(--text-primary)]"
            />
            {!collapsed && (
              <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                Settings
              </span>
            )}
          </Link>

          {user?.subscriptionTier === 'pro' && (
            <Link
              href="/dna"
              title={collapsed ? 'DNA Matching' : undefined}
              className="flex items-center gap-3 rounded-xl transition-colors group"
              style={{ padding: collapsed ? '10px' : '9px 12px' }}
            >
              <DnaNavIcon
                size={18} color="var(--text-muted)"
                className="shrink-0 transition-colors group-hover:text-[var(--text-primary)]"
              />
              {!collapsed && (
                <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                  DNA Matching
                </span>
              )}
            </Link>
          )}

          {user?.isAdmin && (
            <Link
              href="/admin"
              title={collapsed ? 'Admin' : undefined}
              className="flex items-center gap-3 rounded-xl transition-colors"
              style={{ padding: collapsed ? '10px' : '9px 12px' }}
            >
              <AdminNavIcon size={18} color="var(--accent-ember)" className="shrink-0" />
              {!collapsed && (
                <span className="text-sm font-medium" style={{ color: 'var(--accent-ember)' }}>
                  Admin
                </span>
              )}
            </Link>
          )}

          {/* User card */}
          {user && (
            <div
              className="mt-2 flex items-center gap-2.5 rounded-xl"
              style={{
                padding: collapsed ? '10px' : '10px 10px',
                background: 'var(--bg-subtle)',
              }}
            >
              {/* Avatar */}
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                style={{ background: 'var(--accent-ember-soft)', color: 'var(--accent-ember)' }}
              >
                {user.firstName.charAt(0)}{user.lastName.charAt(0)}
              </div>

              {!collapsed && (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {user.firstName} {user.lastName}
                    </p>
                    <span
                      className="inline-block mt-0.5 rounded-full px-1.5 py-0.5 text-2xs font-medium"
                      style={{ background: tierStyle.bg, color: tierStyle.text }}
                    >
                      {TIER_LABEL[tier] ?? tier}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    aria-label="Log out"
                    className="rounded-lg p-1.5 transition-colors hover:bg-[var(--bg-muted)]"
                  >
                    <LogOut size={13} style={{ color: 'var(--text-faint)' }} />
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <OfflineBanner />
        {/* Top bar */}
        <header
          className="flex h-[60px] shrink-0 items-center justify-between border-b px-6"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}
        >
          <PageTitle pathname={pathname} />
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <NotificationsPanel />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}

function PageTitle({ pathname }: { pathname: string }) {
  const parts = pathname.split('/').filter(Boolean);
  const last  = parts[parts.length - 1] ?? 'Dashboard';

  // Acronym exception — the generic Title Case pass below would render
  // this as "Dna" otherwise.
  if (last === 'dna') {
    return (
      <h1 className="font-display font-semibold text-base tracking-tight"
        style={{ color: 'var(--text-primary)' }}>
        DNA Matching
      </h1>
    );
  }

  const title = last
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());

  return (
    <h1 className="font-display font-semibold text-base tracking-tight"
      style={{ color: 'var(--text-primary)' }}>
      {title}
    </h1>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const next = theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark';
  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;
  return (
    <button
      onClick={() => setTheme(next)}
      className="rounded-xl p-2 transition-colors hover:bg-[var(--bg-subtle)]"
      aria-label={`Switch to ${next} theme`}
    >
      <Icon size={16} style={{ color: 'var(--text-muted)' }} />
    </button>
  );
}
