'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowRight, ChevronLeft } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { api, ApiClientError } from '../../../lib/api-client';
import { RootLinkLogo } from '../../../components/brand/Logo';
import { toast } from 'sonner';

// ── Onboarding ─────────────────────────────────────────────────────────────
// Philosophy: one action per step, no overwhelm. The growing mini tree
// in the preview pane is the reward — each person added makes it bigger.
// Visual mode: GROVE (dark) sidebar + WORKBENCH (white) form area.

interface OnboardingState {
  yourName:     string;
  birthYear:    string;
  birthPlace:   string;
  parentName:   string;
  parentType:   'mother' | 'father';
}

const STEPS = [
  { id: 'welcome',  label: 'You'        },
  { id: 'birth',    label: 'Details'    },
  { id: 'parent',   label: 'A parent'   },
  { id: 'done',     label: 'Your tree'  },
] as const;

// ── Mini tree preview SVG ────────────────────────────────────────────────────
function MiniTreePreview({ step, data }: { step: number; data: OnboardingState }) {
  const reduceMotion = useReducedMotion();
  const hasYou     = step >= 0 && data.yourName;
  const hasParent  = step >= 2 && data.parentName;
  const white      = 'rgba(255,255,255,0.75)';
  const amber      = '#C97B2F';
  const amberLight = '#F2A747';

  return (
    <div className="relative flex items-center justify-center h-full">
      <svg viewBox="0 0 200 220" className="w-full max-w-[220px]" fill="none">
        {/* Ground */}
        <line x1="70" y1="200" x2="130" y2="200"
          stroke={amber} strokeWidth="1" strokeLinecap="round" opacity="0.3" />

        {/* Trunk */}
        {hasYou && (
          <motion.line x1="100" y1="200" x2="100" y2="150"
            stroke={white} strokeWidth="2.5" strokeLinecap="round"
            initial={{ pathLength: reduceMotion ? 1 : 0 }} animate={{ pathLength: 1 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.6, ease: [0.65, 0, 0.35, 1] }} />
        )}

        {/* Parent branch */}
        {hasParent && (
          <motion.path
            d={data.parentType === 'mother'
              ? 'M100 160 Q70 145 50 130'
              : 'M100 160 Q130 145 150 130'}
            stroke={white} strokeWidth="2" strokeLinecap="round" fill="none"
            initial={{ pathLength: reduceMotion ? 1 : 0 }} animate={{ pathLength: 1 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.7, ease: [0.65, 0, 0.35, 1] }} />
        )}

        {/* You node */}
        {hasYou && (
          <motion.g
            initial={{ scale: reduceMotion ? 1 : 0, opacity: reduceMotion ? 1 : 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 15 }}
            style={{ transformOrigin: '100px 145px' }}>
            <circle cx="100" cy="145" r="14" fill={amber} />
            <circle cx="100" cy="145" r="14" fill="url(#ob-amber-grad)" />
            <circle cx="95" cy="140" r="4" fill="rgba(255,255,255,0.4)" />
            <text x="100" y="178" textAnchor="middle"
              fontFamily="var(--font-mono)" fontSize="10" fill={amberLight}
              letterSpacing="0.05em">
              {data.yourName.split(' ')[0].slice(0, 10).toUpperCase() || 'YOU'}
            </text>
          </motion.g>
        )}

        {/* Parent node */}
        {hasParent && (
          <motion.g
            initial={{ scale: reduceMotion ? 1 : 0, opacity: reduceMotion ? 1 : 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 280, damping: 15, delay: 0.2 }}
            style={{
              transformOrigin: data.parentType === 'mother' ? '50px 125px' : '150px 125px',
            }}>
            <circle
              cx={data.parentType === 'mother' ? 50 : 150}
              cy={125}
              r={11}
              fill={white} />
            <text
              x={data.parentType === 'mother' ? 50 : 150}
              y={112}
              textAnchor="middle"
              fontFamily="var(--font-mono)" fontSize="9"
              fill="rgba(255,255,255,0.55)" letterSpacing="0.04em">
              {data.parentName.split(' ')[0].slice(0, 8).toUpperCase()}
            </text>
          </motion.g>
        )}

        {/* Placeholder nodes (future additions) */}
        {hasYou && !hasParent && (
          <>
            <circle cx="55" cy="125" r="10"
              stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"
              strokeDasharray="3 2" fill="none" />
            <circle cx="145" cy="125" r="10"
              stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"
              strokeDasharray="3 2" fill="none" />
          </>
        )}

        {/* Roots hint */}
        {hasYou && (
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}>
            <path d="M95 200 Q88 207 82 212" stroke={amber} strokeWidth="1.5"
              strokeLinecap="round" opacity="0.5" />
            <path d="M100 201 Q100 208 99 214" stroke={amber} strokeWidth="1.5"
              strokeLinecap="round" opacity="0.6" />
            <path d="M105 200 Q112 207 118 212" stroke={amber} strokeWidth="1.5"
              strokeLinecap="round" opacity="0.5" />
          </motion.g>
        )}

        <defs>
          <radialGradient id="ob-amber-grad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#F2A747" />
            <stop offset="100%" stopColor="#8A4A0A" />
          </radialGradient>
        </defs>
      </svg>

      {/* Preview label */}
      {!hasYou && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-center text-sm px-6"
            style={{ color: 'rgba(255,255,255,0.25)' }}>
            Your tree will appear<br />here as you build it
          </p>
        </div>
      )}
    </div>
  );
}

// ── Onboarding page ───────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [step, setStep]   = useState(0);
  const [data, setData]   = useState<OnboardingState>({
    yourName: '', birthYear: '', birthPlace: '',
    parentName: '', parentType: 'mother',
  });
  const [error, setError] = useState('');

  // Create tree + first person mutations
  const createTree = useMutation({
    mutationFn: () => api.post('/v1/trees', {
      name: `${data.yourName.split(' ')[0] || 'My'} Family Tree`,
      privacyLevel: 'private',
    }),
  });

  const handleNext = async () => {
    setError('');
    if (step === 0) {
      if (!data.yourName.trim()) { setError('Please enter your name to continue.'); return; }
      setStep(1);
    } else if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      if (!data.parentName.trim()) { setError('Please enter a name, or skip this step.'); return; }
      setStep(3);
    } else {
      // Build the actual tree + redirect
      try {
        await createTree.mutateAsync();
        router.push('/dashboard?onboarded=1');
      } catch (e) {
        toast.error(e instanceof ApiClientError ? e.message : 'Something went wrong');
      }
    }
  };

  const handleSkip = () => {
    if (step < 3) setStep(s => s + 1);
    else router.push('/dashboard?onboarded=1');
  };

  const canProgress = step === 0 ? data.yourName.trim().length > 0
    : step === 2 ? data.parentName.trim().length > 0
    : true;

  return (
    <div className="flex min-h-dvh">
      {/* ── Left: dark grove sidebar with tree preview ─────────────────── */}
      <div className="hidden lg:flex w-[420px] shrink-0 flex-col"
        style={{ background: 'var(--gradient-grove)' }}>
        {/* Logo */}
        <div className="px-10 pt-10">
          <RootLinkLogo size="sm" inverted />
        </div>

        {/* Steps indicator */}
        <div className="px-10 mt-10 space-y-2">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-3">
              <div className="h-5 w-5 rounded-full flex items-center justify-center text-xs font-mono font-medium shrink-0"
                style={{
                  background: i < step   ? 'var(--accent-ember)'
                    : i === step ? 'rgba(255,255,255,0.15)'
                    : 'transparent',
                  border: i > step ? '1px solid rgba(255,255,255,0.15)' : 'none',
                  color: i <= step ? '#fff' : 'rgba(255,255,255,0.3)',
                }}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className="text-sm"
                style={{ color: i === step ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)' }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Live tree preview */}
        <div className="flex-1 flex items-center justify-center px-8 pb-8">
          <MiniTreePreview step={step} data={data} />
        </div>
      </div>

      {/* ── Right: form area (workbench) ─────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12"
        style={{ background: 'var(--bg-base)' }}>
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 lg:hidden">
            <RootLinkLogo size="md" />
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={step}
              initial={{ opacity: 0, x: reduceMotion ? 0 : 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: reduceMotion ? 0 : -16 }}
              transition={{ duration: 0.3, ease: [0.33, 1, 0.68, 1] }}
              className="onboarding-step">

              {step === 0 && (
                <>
                  <p className="text-xs font-mono uppercase tracking-widest mb-3"
                    style={{ color: 'var(--accent-ember)' }}>Step 1 of 4</p>
                  <h1 className="font-display text-3xl font-semibold mb-2"
                    style={{ color: 'var(--text-primary)' }}>
                    Your tree starts with you.
                  </h1>
                  <p className="mb-8 text-base" style={{ color: 'var(--text-muted)' }}>
                    Start with your full name. Everything else can come later.
                  </p>
                  <Field
                    label="Your full name"
                    value={data.yourName}
                    onChange={v => setData(d => ({ ...d, yourName: v }))}
                    placeholder="e.g. Sarah Okonkwo"
                    autoFocus
                    onEnter={canProgress ? handleNext : undefined}
                  />
                </>
              )}

              {step === 1 && (
                <>
                  <p className="text-xs font-mono uppercase tracking-widest mb-3"
                    style={{ color: 'var(--accent-ember)' }}>Step 2 of 4</p>
                  <h1 className="font-display text-3xl font-semibold mb-2"
                    style={{ color: 'var(--text-primary)' }}>
                    When were you born?
                  </h1>
                  <p className="mb-8 text-base" style={{ color: 'var(--text-muted)' }}>
                    Approximate is fine. You can always refine it later.
                  </p>
                  <Field
                    label="Birth year"
                    value={data.birthYear}
                    onChange={v => setData(d => ({ ...d, birthYear: v }))}
                    placeholder="e.g. 1988"
                    type="number"
                  />
                  <div className="mt-4">
                    <Field
                      label="Where were you born? (optional)"
                      value={data.birthPlace}
                      onChange={v => setData(d => ({ ...d, birthPlace: v }))}
                      placeholder="e.g. Lagos, Nigeria"
                    />
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <p className="text-xs font-mono uppercase tracking-widest mb-3"
                    style={{ color: 'var(--accent-ember)' }}>Step 3 of 4</p>
                  <h1 className="font-display text-3xl font-semibold mb-2"
                    style={{ color: 'var(--text-primary)' }}>
                    Who do you come from?
                  </h1>
                  <p className="mb-8 text-base" style={{ color: 'var(--text-muted)' }}>
                    Add one parent to connect your first relationship. A name is enough.
                  </p>

                  {/* Parent type toggle */}
                  <div className="flex gap-2 mb-5">
                    {(['mother', 'father'] as const).map(type => (
                      <button key={type} onClick={() => setData(d => ({ ...d, parentType: type }))}
                        className="flex-1 py-2.5 rounded-xl text-sm font-medium capitalize transition-all"
                        style={data.parentType === type
                          ? { background: 'var(--accent-primary)', color: '#fff', boxShadow: 'var(--shadow-btn-primary)' }
                          : { background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}>
                        {type}
                      </button>
                    ))}
                  </div>

                  <Field
                    label={`Your ${data.parentType}'s name`}
                    value={data.parentName}
                    onChange={v => setData(d => ({ ...d, parentName: v }))}
                    placeholder={`e.g. ${data.parentType === 'mother' ? 'Grace Adeyemi' : 'Emmanuel Okonkwo'}`}
                    autoFocus
                    onEnter={canProgress ? handleNext : undefined}
                  />
                </>
              )}

              {step === 3 && (
                <>
                  <p className="text-xs font-mono uppercase tracking-widest mb-3"
                    style={{ color: 'var(--accent-ember)' }}>Step 4 of 4</p>
                  <h1 className="font-display text-3xl font-semibold mb-2"
                    style={{ color: 'var(--text-primary)' }}>
                    Your tree is alive.
                  </h1>
                  <p className="mb-8 text-base" style={{ color: 'var(--text-muted)' }}>
                    {data.parentName
                      ? `You've added yourself and ${data.parentName}. Your tree now has two people in it. That's a start.`
                      : `You've added yourself. Your tree has one person in it. That's a start.`}
                  </p>
                  <div className="rounded-2xl p-5 mb-6"
                    style={{ background: 'var(--accent-ember-soft)', border: '1px solid rgba(201,123,47,0.2)' }}>
                    <p className="text-sm font-medium mb-1" style={{ color: 'var(--accent-ember)' }}>
                      What happens next
                    </p>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      Add more family members, attach photographs, and invite relatives to
                      contribute what they know. There&rsquo;s no right order — start wherever
                      feels most interesting.
                    </p>
                  </div>
                </>
              )}

              {/* Error */}
              {error && (
                <p className="mt-3 text-xs" style={{ color: '#ef4444' }}>{error}</p>
              )}

              {/* Action row */}
              <div className="mt-8 flex items-center gap-3">
                {step > 0 && (
                  <button onClick={() => setStep(s => s - 1)}
                    className="btn btn-ghost px-3 py-2.5 text-sm gap-1.5">
                    <ChevronLeft size={14} /> Back
                  </button>
                )}
                <button
                  onClick={handleNext}
                  disabled={step === 3 && createTree.isPending}
                  className="btn btn-primary flex-1 py-3 text-sm gap-2">
                  {step === 3
                    ? (createTree.isPending ? 'Creating…' : 'Open my tree')
                    : step === 2 && !data.parentName
                    ? 'Skip for now'
                    : 'Continue'}
                  <ArrowRight size={15} />
                </button>
              </div>

              {/* Skip link */}
              {step < 3 && step > 0 && (
                <button onClick={handleSkip}
                  className="mt-4 block w-full text-center text-xs"
                  style={{ color: 'var(--text-faint)' }}>
                  Skip this step
                </button>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ── Reusable input field ──────────────────────────────────────────────────────
function Field({
  label, value, onChange, placeholder, type = 'text', autoFocus, onEnter,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; autoFocus?: boolean; onEnter?: () => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2"
        style={{ color: 'var(--text-secondary)' }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onEnter?.()}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full rounded-xl px-4 py-3 text-base outline-none transition-all"
        style={{
          background:   'var(--bg-surface)',
          border:       '1.5px solid var(--border-default)',
          color:        'var(--text-primary)',
          caretColor:   'var(--accent-ember)',
        }}
        onFocus={e => (e.target.style.borderColor = 'var(--accent-ember)')}
        onBlur={e  => (e.target.style.borderColor = 'var(--border-default)')}
      />
    </div>
  );
}
