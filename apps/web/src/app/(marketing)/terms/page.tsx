import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The terms governing your use of RootLink.',
};

const LAST_UPDATED = 'June 16, 2026';

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-20">
      <span
        className="inline-block rounded-full px-3 py-1 font-mono text-2xs font-medium uppercase tracking-wider"
        style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
      >
        Legal
      </span>
      <h1 className="mt-5 font-display text-4xl tracking-tight">Terms of Service</h1>
      <p className="mt-2 text-sm" style={{ color: 'var(--text-faint)' }}>Last updated {LAST_UPDATED}</p>

      <div
        className="mt-8 rounded-2xl p-5 text-sm leading-relaxed"
        style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
      >
        This document is provided as a starting point and has not been
        reviewed by a lawyer on RootLink&rsquo;s behalf. It should be reviewed
        by qualified legal counsel before being relied on as a binding
        agreement, particularly regarding subscription billing, liability
        limits, and the jurisdiction-specific provisions noted below.
      </div>

      <Legal>
        <Section n="1" title="Acceptance of these Terms">
          <p>
            By creating a RootLink account or otherwise using the service,
            you agree to these Terms of Service and to the Privacy Policy,
            which is incorporated by reference. If you do not agree, do not
            use the service.
          </p>
        </Section>

        <Section n="2" title="Who can use RootLink">
          <p>
            You must be at least 16 years old to create an account. By
            registering, you confirm that the information you provide about
            yourself is accurate and that you have the authority to enter
            into these Terms.
          </p>
        </Section>

        <Section n="3" title="Your account">
          <p>
            You are responsible for keeping your password confidential and
            for all activity that occurs under your account. Tell us
            promptly if you believe your account has been accessed without
            your permission. We offer two-factor authentication and
            recommend enabling it.
          </p>
        </Section>

        <Section n="4" title="Content you submit, including content about other people">
          <p>
            RootLink is built around entering information about people who
            are not RootLink users themselves — parents, siblings, distant
            cousins, and other relatives, living and deceased. When you add
            a person to a tree, upload a photo, or write a biographical
            note, you are responsible for having a reasonable basis for
            believing it is appropriate to do so.
          </p>
          <p>
            You retain ownership of the content you submit. You grant
            RootLink a limited license to host, store, process, back up,
            and display that content for the purpose of operating the
            service for you and anyone you&rsquo;ve given access to a tree.
            We do not sell your content, and we do not use it to train
            models other than the narrow, on-request processing described
            in our Privacy Policy.
          </p>
          <p>
            If a living person you&rsquo;ve added to a tree contacts us
            directly to request their information be corrected, hidden, or
            removed, we may act on that request even without your
            involvement, consistent with the Privacy Policy.
          </p>
        </Section>

        <Section n="5" title="Acceptable use">
          <p>You agree not to use RootLink to:</p>
          <ul className="mt-2 flex flex-col gap-1.5 pl-5" style={{ listStyle: 'disc' }}>
            <li>Impersonate another person or misrepresent your relationship to a tree</li>
            <li>Upload content you don&rsquo;t have the right to share, including copyrighted material you don&rsquo;t own</li>
            <li>Attempt to access another user&rsquo;s account or trees without authorization</li>
            <li>Use the service to harass, stalk, or locate someone who does not wish to be found</li>
            <li>Probe, scan, or attempt to bypass the security of the service</li>
            <li>Upload malicious files or attempt to interfere with the service&rsquo;s normal operation</li>
          </ul>
        </Section>

        <Section n="6" title="Sharing features">
          <p>
            RootLink lets you invite collaborators and generate public share
            links for a tree. You are responsible for who you share a tree
            or a link with. Public share links are designed to hide living
            individuals automatically — but the rest of a tree&rsquo;s
            content on a link you generate is visible to anyone who has
            that link, so share it only as widely as you intend.
          </p>
        </Section>

        <Section n="7" title="Subscriptions and billing">
          <p>
            RootLink offers a free plan and paid plans with higher limits.
            Where billing is enabled, paid plans are billed in advance on a
            recurring basis until cancelled. You can cancel at any time;
            cancellation takes effect at the end of the current billing
            period, and we do not provide partial-period refunds except
            where required by law.
          </p>
          <p>
            We may change plan pricing or limits on a going-forward basis.
            If a change affects an active subscription, we&rsquo;ll give you
            reasonable notice before it takes effect.
          </p>
        </Section>

        <Section n="8" title="Exporting and leaving">
          <p>
            You can export any tree you have edit access to as a GEDCOM
            file at any time, on every plan including free. If you close
            your account, your content is deleted according to the
            retention terms in the Privacy Policy.
          </p>
        </Section>

        <Section n="9" title="Third-party services">
          <p>
            Some features rely on third-party providers — for example,
            generating a draft biography or a research prompt sends the
            relevant facts from your tree to an AI processing provider.
            Details are in the Privacy Policy.
          </p>
        </Section>

        <Section n="10" title="Termination">
          <p>
            You may stop using RootLink and delete your account at any
            time from account settings. We may suspend or terminate access
            for violation of these Terms, including the acceptable-use
            provisions above, with notice where practical.
          </p>
        </Section>

        <Section n="11" title="Disclaimers">
          <p>
            RootLink is provided &ldquo;as is.&rdquo; We do not guarantee
            that AI-generated biographies or research prompts are accurate
            — they are starting points for your own research, not verified
            historical findings. We do not guarantee uninterrupted or
            error-free operation of the service.
          </p>
        </Section>

        <Section n="12" title="Limitation of liability">
          <p>
            To the maximum extent permitted by law, RootLink will not be
            liable for indirect, incidental, or consequential damages
            arising from your use of the service. This section is a
            placeholder and should be reviewed against applicable
            consumer-protection law in your jurisdiction before launch.
          </p>
        </Section>

        <Section n="13" title="Governing law">
          <p>
            [Jurisdiction to be specified before launch — these Terms
            should designate a governing law and venue appropriate to where
            RootLink is operated from and where its users are located.]
          </p>
        </Section>

        <Section n="14" title="Changes to these Terms">
          <p>
            We may update these Terms as the service changes. If a change
            is material, we&rsquo;ll notify you by email or in-app notice
            before it takes effect.
          </p>
        </Section>

        <Section n="15" title="Contact">
          <p>
            Questions about these Terms can be sent to{' '}
            <a href="mailto:hello@rootlink.app" className="underline" style={{ color: 'var(--text-primary)' }}>
              hello@rootlink.app
            </a>.
          </p>
        </Section>
      </Legal>
    </div>
  );
}

function Legal({ children }: { children: React.ReactNode }) {
  return <div className="mt-10 flex flex-col gap-10">{children}</div>;
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="flex items-baseline gap-2.5 font-display text-xl tracking-tight">
        <span className="font-mono text-sm" style={{ color: 'var(--accent-ember)' }}>{n}</span>
        {title}
      </h2>
      <div className="mt-3 flex flex-col gap-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {children}
      </div>
    </section>
  );
}
