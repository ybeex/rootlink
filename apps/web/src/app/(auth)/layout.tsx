import { PageTransition } from '../../components/layout/PageTransition';

// AuthLayout itself stays a Server Component (no hooks needed here) — it
// simply renders the client-only PageTransition component as a child,
// which is the standard, valid way to mix Server/Client Components in the
// App Router. Login → register → forgot-password now cross-fade instead
// of hard-cutting between near-identical card layouts.

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
