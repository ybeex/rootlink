import { Mail, MessageSquare } from 'lucide-react';

export const metadata = {
  title: 'Contact',
  description: 'Get in touch with RootLink.',
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-xl px-6 py-20">
      <span
        className="inline-block rounded-full px-3 py-1 font-mono text-2xs font-medium uppercase tracking-wider"
        style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
      >
        Contact
      </span>

      <h1 className="mt-5 font-display text-4xl tracking-tight sm:text-5xl">Talk to us directly.</h1>

      <p className="mt-4 text-lg leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        No ticket system, no chatbot in between. Write to a real address and
        a person reads it.
      </p>

      <div className="mt-10 flex flex-col gap-4">
        <ContactRow
          icon={Mail}
          title="General & support"
          detail="hello@rootlink.app"
          href="mailto:hello@rootlink.app"
        />
        <ContactRow
          icon={MessageSquare}
          title="Privacy questions"
          detail="privacy@rootlink.app"
          href="mailto:privacy@rootlink.app"
        />
      </div>

      <p className="mt-10 text-sm leading-relaxed" style={{ color: 'var(--text-faint)' }}>
        If you&rsquo;re reporting a security issue, please include enough
        detail to reproduce it and avoid sharing it anywhere public first.
        We read every report.
      </p>
    </div>
  );
}

function ContactRow({
  icon: Icon, title, detail, href,
}: { icon: React.ComponentType<{ size?: number }>; title: string; detail: string; href: string }) {
  return (
    <a
      href={href}
      className="flex items-center gap-4 rounded-2xl p-5 transition-colors"
      style={{ background: 'var(--bg-subtle)' }}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ background: 'var(--bg-surface)', color: 'var(--accent-ember)' }}
      >
        <Icon size={18} />
      </div>
      <div>
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{detail}</p>
      </div>
    </a>
  );
}
