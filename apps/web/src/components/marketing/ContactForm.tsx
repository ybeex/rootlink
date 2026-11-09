'use client';

import { useState, type FormEvent } from 'react';
import { ArrowUpRight, Check } from 'lucide-react';

const INPUT_CLASS = 'mt-2 block w-full rounded-xl px-3.5 py-3 text-sm outline-none transition-colors focus:border-[var(--accent-ember)] focus:ring-2 focus:ring-[var(--accent-ember)]/20';
const INPUT_STYLE = {
  background: 'var(--bg-subtle)',
  border: '1px solid var(--border-default)',
  color: 'var(--text-primary)',
};

export function ContactForm() {
  const [draftReady, setDraftReady] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get('name') ?? '').trim();
    const email = String(formData.get('email') ?? '').trim();
    const topic = String(formData.get('topic') ?? 'General question');
    const message = String(formData.get('message') ?? '').trim();
    const recipient = topic === 'Privacy request' ? 'privacy@rootlink.app' : 'hello@rootlink.app';
    const subject = `${topic} from ${name}`;
    const body = `Name: ${name}\nEmail: ${email}\nTopic: ${topic}\n\n${message}`;

    window.location.href = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setDraftReady(true);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Your name
          <input
            className={INPUT_CLASS}
            style={INPUT_STYLE}
            type="text"
            name="name"
            autoComplete="name"
            maxLength={100}
            required
          />
        </label>
        <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Email address
          <input
            className={INPUT_CLASS}
            style={INPUT_STYLE}
            type="email"
            name="email"
            autoComplete="email"
            maxLength={254}
            required
          />
        </label>
      </div>

      <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
        What can we help with?
        <select className={INPUT_CLASS} style={INPUT_STYLE} name="topic" defaultValue="General question">
          <option>General question</option>
          <option>Account support</option>
          <option>Privacy request</option>
          <option>Security report</option>
          <option>Something else</option>
        </select>
      </label>

      <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
        Message
        <textarea
          className={`${INPUT_CLASS} min-h-36 resize-y`}
          style={INPUT_STYLE}
          name="message"
          minLength={10}
          maxLength={5000}
          placeholder="Include any details that will help us understand your question."
          required
        />
        <span className="mt-1.5 block text-xs font-normal" style={{ color: 'var(--text-faint)' }}>
          Please don&rsquo;t include passwords or sensitive family records.
        </span>
      </label>

      <button
        type="submit"
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ background: 'var(--accent-primary)' }}
      >
        Send message <ArrowUpRight size={16} />
      </button>

      {draftReady && (
        <p role="status" className="flex items-start gap-2 text-sm" style={{ color: 'var(--accent-canopy)' }}>
          <Check size={16} className="mt-0.5 shrink-0" />
          Your draft is ready in your email app. Send it there to reach us.
        </p>
      )}
    </form>
  );
}
