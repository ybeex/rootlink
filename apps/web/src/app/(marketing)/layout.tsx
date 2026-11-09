'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { RootLinkLogo } from '../../components/brand/Logo';
import { PageTransition } from '../../components/layout/PageTransition';

const NAV_LINKS = [
  { href: '/features', label: 'Features' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/blog', label: 'Blog' },
  { href: '/about', label: 'About' },
];

function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <RootLinkLogo size="sm" inverted={inverted} />
    </Link>
  );
}

// Routes whose header sits directly on a dark background image/gradient at
// the top of the page (before any scrolling) — the shared nav below needs
// light text on these specifically, or it's unreadable until scrolled past.
// The homepage already had this exact contrast problem before this file was
// touched for the pricing background (found while making that change, fixed
// alongside it): its own embedded hero nav already renders inverted, but the
// shared sticky nav layered on top of it did not.
const DARK_HEADER_ROUTES = ['/', '/pricing'];

function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const isDarkHeader = DARK_HEADER_ROUTES.includes(pathname) && !scrolled;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setMobileOpen(false), [pathname]);

  return (
    <header
      className="sticky top-0 z-50 transition-shadow duration-300"
      style={{
        background: scrolled
          ? 'var(--bg-surface)'
          : pathname === '/' ? '#06170f' : 'transparent',
        borderBottom: scrolled ? '1px solid var(--border-default)' : '1px solid transparent',
        boxShadow: scrolled ? 'var(--shadow-xs)' : 'none',
        backdropFilter: scrolled ? 'blur(8px)' : 'none',
      }}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Logo inverted={isDarkHeader} />

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium transition-colors"
              style={{
                color: isDarkHeader
                  ? (pathname === link.href ? '#FFFFFF' : 'rgba(255,255,255,0.65)')
                  : (pathname === link.href ? 'var(--text-primary)' : 'var(--text-muted)'),
              }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="text-sm font-medium transition-colors"
            style={{ color: isDarkHeader ? 'rgba(255,255,255,0.65)' : 'var(--text-muted)' }}
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="rounded-full px-4 py-2 text-sm font-medium text-white shadow-sm transition-transform hover:scale-[1.03]"
            style={{ background: 'var(--accent-ember)' }}
          >
            Get started
          </Link>
        </div>

        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-lg md:hidden"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          style={{ color: isDarkHeader && !mobileOpen ? '#FFFFFF' : 'var(--text-primary)' }}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {mobileOpen && (
        <div
          className="flex flex-col gap-1 border-t px-6 py-4 md:hidden"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2.5 text-sm font-medium"
              style={{ color: 'var(--text-primary)' }}
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-2 flex flex-col gap-2 border-t pt-3" style={{ borderColor: 'var(--border-subtle)' }}>
            <Link href="/login" className="rounded-lg px-3 py-2.5 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
              Log in
            </Link>
            <Link
              href="/register"
              className="rounded-full px-4 py-2.5 text-center text-sm font-medium text-white"
              style={{ background: 'var(--accent-ember)' }}
            >
              Get started
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

function MarketingFooter() {
  return (
    <footer style={{ borderTop: '1px solid var(--border-default)', background: 'var(--bg-subtle)' }}>
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <Logo />
            <p className="mt-4 max-w-[220px] text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              A record of who came before, kept for who comes next.
            </p>
          </div>

          <FooterColumn
            title="Product"
            links={[
              { href: '/features', label: 'Features' },
              { href: '/pricing', label: 'Pricing' },
            ]}
          />
          <FooterColumn
            title="Company"
            links={[
              { href: '/about', label: 'About' },
              { href: '/contact', label: 'Contact' },
            ]}
          />
          <FooterColumn
            title="Legal"
            links={[
              { href: '/terms', label: 'Terms of Service' },
              { href: '/privacy', label: 'Privacy Policy' },
            ]}
          />
        </div>

        <div
          className="mt-12 flex flex-col items-start justify-between gap-3 border-t pt-6 text-xs sm:flex-row sm:items-center"
          style={{ borderColor: 'var(--border-default)', color: 'var(--text-faint)' }}
        >
          <span>© {new Date().getFullYear()} RootLink. All rights reserved.</span>
          <span className="font-mono">Built for families, generation by generation.</span>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
        {title}
      </h3>
      <ul className="flex flex-col gap-2.5">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-sm transition-colors" style={{ color: 'var(--text-muted)' }}>
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg-base)' }}>
      <MarketingNav />
      <main><PageTransition>{children}</PageTransition></main>
      <MarketingFooter />
    </div>
  );
}
