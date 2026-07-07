'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { api } from '../../../lib/api-client';
import type { User } from '@rootlink/shared';
import { RootLinkIcon } from '../../../components/brand/Logo';
import { AdminNavIcon } from '../../../components/brand/icons';
import { BranchLoader } from '../../../components/ui/BrandedLoader';
import { PageTransition } from '../../../components/layout/PageTransition';

// ── Admin shell ───────────────────────────────────────────────────────────────
// Visual mode: GROVE sidebar (dark forest — signals "this is privileged
// territory, not the everyday product") + WORKBENCH content area (clean,
// data-dense). The dark/light split inside one screen is deliberate: it's
// the same trick airline cockpits and bank vaults use — the control surface
// reads as categorically different from the regular interface around it.

const NAV = [
  { href: '/admin',            label: 'Overview',  icon: OverviewIcon },
  { href: '/admin/users',      label: 'Users',      icon: UsersIcon    },
  { href: '/admin/trees',      label: 'Trees',      icon: TreesIcon    },
  { href: '/admin/audit-logs', label: 'Audit log',  icon: AuditIcon    },
] as const;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();

  const { data: user, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn:  () => api.get<User>('/v1/users/me'),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!isLoading && user && !user.isAdmin) router.replace('/dashboard');
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <BranchLoader size="lg" label="Verifying access…" />
      </div>
    );
  }
  if (!user?.isAdmin) return null;

  return (
    <div className="flex h-full">
      {/* ── Grove sidebar ────────────────────────────────────────────────── */}
      <aside
        className="flex w-60 shrink-0 flex-col relative overflow-hidden"
        style={{ background: 'var(--gradient-grove)' }}
      >
        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(201,123,47,0.10), transparent)' }} />

        {/* Header */}
        <div className="relative flex items-center gap-2.5 px-5 py-5 border-b"
          style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <RootLinkIcon size={26} />
          <div>
            <p className="font-display text-sm font-semibold leading-none" style={{ color: '#fff' }}>
              RootLink
            </p>
            <p className="text-2xs font-mono uppercase tracking-widest mt-1"
              style={{ color: 'var(--accent-ember)' }}>
              Admin
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="relative flex-1 space-y-1 px-3 py-5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/admin' && pathname.startsWith(href + '/'));
            return (
              <Link key={href} href={href}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all relative"
                style={{
                  background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
                  color:      active ? '#fff' : 'rgba(255,255,255,0.55)',
                }}>
                {active && (
                  <div className="absolute left-0 top-2 bottom-2 w-[2.5px] rounded-full"
                    style={{ background: 'var(--accent-ember)' }} />
                )}
                <Icon active={active} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Job queues — external link */}
        <div className="relative px-3 pb-3">
          <a href="/admin/queues" target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.55)' }}>
            <span className="flex items-center gap-3">
              <QueuesIcon />
              Job queues
            </span>
            <span className="text-2xs" style={{ color: 'rgba(255,255,255,0.3)' }}>↗</span>
          </a>
        </div>

        {/* Footer */}
        <div className="relative border-t px-3 py-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <Link href="/dashboard"
            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs transition-colors"
            style={{ color: 'rgba(255,255,255,0.4)' }}>
            <ArrowLeft size={13} />
            Back to app
          </Link>
        </div>
      </aside>

      {/* ── Workbench content ────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto" style={{ background: 'var(--bg-base)' }}>
        <PageTransition>{children}</PageTransition>
      </div>
    </div>
  );
}

// ── Custom nav icons (consistent stroke language with the rest of the app) ──

function iconColor(active?: boolean) {
  return active ? 'var(--accent-ember)' : 'rgba(255,255,255,0.5)';
}

function OverviewIcon({ active }: { active?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
      <rect x="2.5" y="2.5" width="6.5" height="6.5" rx="1.5" stroke={iconColor(active)} strokeWidth="1.6" />
      <rect x="11" y="2.5" width="6.5" height="9.5" rx="1.5" stroke={iconColor(active)} strokeWidth="1.6" />
      <rect x="2.5" y="11" width="6.5" height="6.5" rx="1.5" stroke={iconColor(active)} strokeWidth="1.6" />
      <rect x="11" y="14" width="6.5" height="3.5" rx="1.5" stroke={iconColor(active)} strokeWidth="1.6" />
    </svg>
  );
}

function UsersIcon({ active }: { active?: boolean }) {
  const c = iconColor(active);
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
      <circle cx="7" cy="6" r="3" stroke={c} strokeWidth="1.6" />
      <path d="M1 18 Q1 11 7 11 Q13 11 13 18" stroke={c} strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <circle cx="14.5" cy="6.5" r="2.2" stroke={c} strokeWidth="1.4" opacity="0.6" />
      <path d="M13 18 Q13 12.5 17.5 12.5" stroke={c} strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.6" />
    </svg>
  );
}

function TreesIcon({ active }: { active?: boolean }) {
  const c = iconColor(active);
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
      <path d="M10 18 L10 12" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M10 13 Q6 11 3 8" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M10 13 Q14 11 17 8" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="10" cy="5" r="2.3" fill={c} />
      <circle cx="3" cy="7.5" r="1.7" fill={c} opacity="0.7" />
      <circle cx="17" cy="7.5" r="1.7" fill={c} opacity="0.7" />
    </svg>
  );
}

function AuditIcon({ active }: { active?: boolean }) {
  const c = iconColor(active);
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
      <rect x="3" y="2" width="14" height="16" rx="2" stroke={c} strokeWidth="1.6" />
      <line x1="6" y1="6.5" x2="14" y2="6.5" stroke={c} strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
      <line x1="6" y1="10" x2="14" y2="10" stroke={c} strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
      <line x1="6" y1="13.5" x2="11" y2="13.5" stroke={c} strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

function QueuesIcon() {
  const c = 'rgba(255,255,255,0.5)';
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
      <rect x="2" y="4" width="16" height="3" rx="1.5" fill={c} opacity="0.8" />
      <rect x="2" y="9" width="11" height="3" rx="1.5" fill={c} opacity="0.55" />
      <rect x="2" y="14" width="14" height="3" rx="1.5" fill={c} opacity="0.4" />
    </svg>
  );
}
