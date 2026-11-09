import { Mail, ShieldCheck, MessageCircle } from 'lucide-react';
import { ContactForm } from '../../../components/marketing/ContactForm';

export const metadata = {
  title: 'Contact',
  description: 'Contact RootLink support, privacy, or security about your family history account.',
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
        <section className="lg:order-2 lg:pt-8">
          <span
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium"
            style={{ background: 'var(--accent-ember-soft)', color: 'var(--accent-ember)' }}
          >
            <MessageCircle size={14} /> Contact RootLink
          </span>
          <h1 className="mt-5 max-w-lg font-display text-4xl tracking-tight sm:text-5xl">
            A real person will read your note.
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed sm:text-lg" style={{ color: 'var(--text-muted)' }}>
            Tell us what you need help with. We&rsquo;ll open a ready-to-send email so you can reach us directly.
          </p>

          <div className="mt-10 space-y-4">
            <ContactChannel
              icon={Mail}
              title="General questions and support"
              email="hello@rootlink.app"
            />
            <ContactChannel
              icon={ShieldCheck}
              title="Privacy requests"
              email="privacy@rootlink.app"
            />
          </div>

          <p className="mt-8 max-w-md text-sm leading-relaxed" style={{ color: 'var(--text-faint)' }}>
            Reporting a security issue? Send details that help us reproduce it, and please keep the report private while we investigate.
          </p>
        </section>

        <section
          className="rounded-3xl p-5 sm:p-8 lg:order-1 lg:p-10"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-sm)' }}
        >
          <div className="mb-7">
            <h2 className="font-display text-2xl tracking-tight">Send us a message</h2>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Fill this out and your email app will open with the details ready. You&rsquo;ll review and send it there.
            </p>
          </div>
          <ContactForm />
        </section>
      </div>
    </div>
  );
}

function ContactChannel({
  icon: Icon, title, email,
}: { icon: typeof Mail; title: string; email: string }) {
  return (
    <a
      href={`mailto:${email}`}
      className="flex items-center gap-4 rounded-2xl p-4 transition-colors hover:bg-[var(--bg-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{ border: '1px solid var(--border-default)' }}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
        style={{ background: 'var(--accent-ember-soft)', color: 'var(--accent-ember)' }}>
        <Icon size={19} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</span>
        <span className="block break-all text-sm" style={{ color: 'var(--text-muted)' }}>{email}</span>
      </span>
    </a>
  );
}
