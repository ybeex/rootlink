import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How RootLink handles your data — and the data of people who never signed up.',
};

const LAST_UPDATED = 'June 16, 2026';

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-20">
      <span
        className="inline-block rounded-full px-3 py-1 font-mono text-2xs font-medium uppercase tracking-wider"
        style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
      >
        Legal
      </span>
      <h1 className="mt-5 font-display text-4xl tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm" style={{ color: 'var(--text-faint)' }}>Last updated {LAST_UPDATED}</p>

      <div
        className="mt-8 rounded-2xl p-5 text-sm leading-relaxed"
        style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
      >
        This document is provided as a starting point and has not been
        reviewed by a lawyer on RootLink&rsquo;s behalf. Before launch, it
        should be reviewed against the specific data-protection laws that
        apply to where RootLink operates and where its users live (for
        example GDPR, UK GDPR, or US state privacy laws), and the
        jurisdiction-specific sections below should be completed.
      </div>

      <Legal>
        <Section title="The short version">
          <p>
            RootLink stores two kinds of information: information about
            you, the account holder, and information about the people in
            your family tree — many of whom have never created an account
            and never will. This policy treats those two categories
            differently, and the section on the second one matters even if
            you&rsquo;re only here as a casual reader and not a lawyer.
          </p>
        </Section>

        <Section title="Information we collect from you directly">
          <p>When you create an account, we collect your name, email address, and password (stored as a one-way hash, never in plain text). If you enable two-factor authentication, we store the information needed to verify it. If billing is enabled on your plan, payment details are handled by our payment processor — we do not store full card numbers ourselves.</p>
        </Section>

        <Section title="Information you enter about other people">
          <p>
            Building a family tree means entering data about people other
            than yourself: names, birth and death dates, places, relationship
            structures, biographical notes, and photographs or documents.
            Most of these individuals are not RootLink users and have not
            agreed to this policy — they are the subject of data you, as
            the account holder, have chosen to enter.
          </p>
          <p>
            We treat this category of data with the same security
            protections as your own account data. Living individuals
            marked as such in a tree are automatically hidden from anyone
            viewing that tree through a public share link, regardless of
            what else is visible on that link.
          </p>
        </Section>

        <Section title="If you are in someone else's tree and are not a RootLink user">
          <p>
            If you believe a family member has added information about you
            to a RootLink tree and you would like to see what&rsquo;s
            recorded, request a correction, or ask that it be removed,
            contact{' '}
            <a href="mailto:privacy@rootlink.app" className="underline" style={{ color: 'var(--text-primary)' }}>
              privacy@rootlink.app
            </a>
            . We will work with you directly on this — you do not need the
            account holder&rsquo;s permission to make this request, though
            we may need to verify your identity and your relationship to
            the record in question before acting on it.
          </p>
        </Section>

        <Section title="How we use information">
          <p>We use the information described above to operate the service: rendering your tree, enabling collaboration and sharing, generating thumbnails for uploaded media, sending account-related emails (verification, password resets, invitations), and computing data-quality indicators on a person's record. We do not sell personal information, and we do not use it for advertising.</p>
        </Section>

        <Section title="AI-assisted features">
          <p>
            If you use biography generation or request a research prompt,
            the relevant facts already in that person&rsquo;s record (not
            your full account or unrelated tree data) are sent to a
            third-party AI provider for processing and are not used by that
            provider to train its models on our customers&rsquo; data. You
            can decline to use these features entirely; nothing else in the
            product depends on them.
          </p>
        </Section>

        <Section title="Sharing and disclosure">
          <p>
            We share tree content with the collaborators and share-link
            recipients you explicitly choose to share it with. We use
            third-party infrastructure providers (hosting, file storage,
            email delivery) to operate the service, bound by their own
            confidentiality obligations to us. We do not otherwise share
            your data with third parties, and we disclose information to
            law enforcement only when legally required to.
          </p>
        </Section>

        <Section title="Cookies and similar technologies">
          <p>
            We use one essential, first-party cookie to keep you signed in
            securely between sessions; it cannot be read by other websites
            or by scripts running on this one. We do not use third-party
            advertising or tracking cookies, and we do not run third-party
            analytics that profile you across other sites.
          </p>
        </Section>

        <Section title="Data retention and deletion">
          <p>
            We keep your account and tree data for as long as your account
            is active. Deleted media and accounts are retained briefly in a
            recoverable state in case of accidental deletion, then
            permanently removed. You can export a full GEDCOM copy of any
            tree you can edit before deleting anything.
          </p>
        </Section>

        <Section title="Your rights and choices">
          <p>You can access, correct, or export your account information and tree content directly from your account settings at any time. You can delete your account, which removes your personal account data and any trees you solely own, following the retention period above. Depending on where you live, you may have additional rights under local law; contact us to exercise them.</p>
        </Section>

        <Section title="Children's privacy">
          <p>
            RootLink is not directed at children under 16, and we do not
            knowingly collect account information from them. A child may
            appear as a person within someone else&rsquo;s family tree
            (entered by a parent or relative) without that constituting an
            account of their own; the protections in this policy for
            non-user individuals apply to them as well.
          </p>
        </Section>

        <Section title="International data transfers">
          <p>
            [To be completed before launch: where RootLink&rsquo;s
            infrastructure is located, and the transfer mechanism relied on
            for users outside that region, e.g. Standard Contractual
            Clauses for EU/UK users.]
          </p>
        </Section>

        <Section title="Security">
          <p>
            Passwords are hashed, never stored in plain text. Two-factor
            authentication is available on every account. Data is
            encrypted in transit. No system is perfectly secure, and we
            disclose significant incidents as required by applicable law.
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            If we make a material change to how we handle personal
            information, we&rsquo;ll notify account holders by email before
            it takes effect.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Privacy questions, including requests from people who appear in
            someone else&rsquo;s tree, go to{' '}
            <a href="mailto:privacy@rootlink.app" className="underline" style={{ color: 'var(--text-primary)' }}>
              privacy@rootlink.app
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-xl tracking-tight">{title}</h2>
      <div className="mt-3 flex flex-col gap-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {children}
      </div>
    </section>
  );
}
