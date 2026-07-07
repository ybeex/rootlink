import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── Forest palette (authority, trust, nature) ──────────────────────
        forest: {
          950: '#060E0B',
          900: '#091810',
          800: '#0D2118',
          700: '#152F28',   // brand deep — sidebar, hero bg
          600: '#1E4037',   // hover states
          500: '#2D6455',   // interactive, accents
          400: '#4A8A78',   // lighter accents
          300: '#78BEA8',   // on-dark text
          200: '#B0D8CC',
          100: '#D8EDE8',
          50:  '#EFF7F4',
        },
        // ── Amber palette (warmth, heritage, CTAs) ────────────────────────
        amber: {
          950: '#4A1A00',
          900: '#7A2F00',
          800: '#A04010',
          700: '#C97B2F',   // brand amber — primary CTA
          600: '#D4862A',   // hover
          500: '#E8941F',
          400: '#F2A747',
          300: '#F7C070',
          200: '#FBDAA3',
          100: '#FDF0D8',
          50:  '#FEF7ED',
        },
        // ── Bone palette (warmth, parchment, backgrounds) ─────────────────
        bone: {
          950: '#2A2218',
          900: '#3D3325',
          800: '#5A4D3C',
          700: '#7A6A56',
          600: '#9A8870',
          500: '#B8A890',
          400: '#D0C4B0',
          300: '#E4DDD0',
          200: '#F0EAE0',
          100: '#F7F3EC',
          50:  '#FBFAF7',
        },
        // ── Sage (success, privacy, verified states) ──────────────────────
        sage: {
          700: '#2D5A3D',
          600: '#3D7554',
          500: '#4A8A62',
          400: '#60A87C',
          300: '#82C49A',
          200: '#B4DFC4',
          100: '#DCF0E4',
          50:  '#EEF8F2',
        },
        // ── Crimson (errors, destructive) ─────────────────────────────────
        crimson: {
          700: '#8B1A1A',
          600: '#B02020',
          500: '#D42B2B',
          400: '#E85252',
          100: '#FEE8E8',
          50:  '#FFF4F4',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        body:    ['var(--font-body)',    'system-ui', 'sans-serif'],
        mono:    ['var(--font-mono)',    'Menlo', 'monospace'],
      },
      fontSize: {
        '2xs':  ['0.625rem',  { lineHeight: '0.875rem' }],
        '3xl':  ['1.875rem',  { lineHeight: '2.25rem',  letterSpacing: '-0.025em' }],
        '4xl':  ['2.25rem',   { lineHeight: '2.5rem',   letterSpacing: '-0.03em'  }],
        '5xl':  ['3rem',      { lineHeight: '1.1',      letterSpacing: '-0.03em'  }],
        '6xl':  ['3.75rem',   { lineHeight: '1.05',     letterSpacing: '-0.035em' }],
        '7xl':  ['4.5rem',    { lineHeight: '1.0',      letterSpacing: '-0.04em'  }],
        '8xl':  ['6rem',      { lineHeight: '1.0',      letterSpacing: '-0.04em'  }],
      },
      spacing: {
        '18': '4.5rem',  '22': '5.5rem',   '26': '6.5rem',
        '88': '22rem',   '100': '25rem',    '112': '28rem',
        '128': '32rem',  '144': '36rem',    '160': '40rem',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      backgroundImage: {
        'gradient-grove':     'linear-gradient(170deg, #060E0B 0%, #152F28 45%, #1A3830 100%)',
        'gradient-forest':    'linear-gradient(135deg, #1E4037, #152F28)',
        'gradient-amber':     'linear-gradient(135deg, #E8941F, #C97B2F)',
        'gradient-amber-rev': 'linear-gradient(135deg, #C97B2F, #A04010)',
        'gradient-vault':     'linear-gradient(160deg, #FDFBF7, #F0EAE0)',
        'shimmer':            'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
      },
      boxShadow: {
        // 3D press — bottom edge = depth plane
        'btn-forest': '0 2px 0 #0A1F1A, 0 4px 16px rgba(21,47,40,0.35)',
        'btn-amber':  '0 2px 0 #8A4A0A, 0 4px 16px rgba(201,123,47,0.40)',
        'btn-ghost':  '0 1px 3px rgba(14,28,24,0.10)',
        // Card lifts — warm amber-tinted
        'card':       '0 1px 0 rgba(255,255,255,0.9) inset, 0 1px 3px rgba(14,28,24,0.06), 0 4px 16px rgba(14,28,24,0.05)',
        'card-hover': '0 1px 0 rgba(255,255,255,0.9) inset, 0 4px 12px rgba(14,28,24,0.10), 0 12px 32px rgba(14,28,24,0.08)',
        'card-lifted': '0 1px 0 rgba(255,255,255,0.9) inset, 0 8px 24px rgba(14,28,24,0.14), 0 20px 48px rgba(14,28,24,0.08)',
        // Ambient glow
        'glow-amber': '0 0 32px rgba(201,123,47,0.25), 0 0 80px rgba(201,123,47,0.08)',
        'glow-forest': '0 0 32px rgba(45,100,85,0.20)',
        // Node in pedigree tree
        'node':    '0 2px 8px rgba(14,28,24,0.12)',
        'node-sel': '0 0 0 2px var(--accent-ember), 0 4px 16px rgba(14,28,24,0.16)',
      },
      keyframes: {
        // Page / component entry
        fadeIn:   { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp:  { '0%': { transform: 'translateY(16px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        slideDown:{ '0%': { transform: 'translateY(-12px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        slideLeft:{ '0%': { transform: 'translateX(20px)', opacity: '0' }, '100%': { transform: 'translateX(0)', opacity: '1' } },
        scaleIn:  { '0%': { transform: 'scale(0.92)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        // Ambient
        float:       { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        floatSlow:   { '0%,100%': { transform: 'translateY(0) rotate(0deg)' }, '50%': { transform: 'translateY(-6px) rotate(0.5deg)' } },
        breathe:     { '0%,100%': { transform: 'scale(1)', opacity: '1' }, '50%': { transform: 'scale(1.04)', opacity: '0.85' } },
        pulseGlow:   { '0%,100%': { boxShadow: '0 0 32px rgba(201,123,47,0.25)' }, '50%': { boxShadow: '0 0 48px rgba(201,123,47,0.45), 0 0 100px rgba(201,123,47,0.15)' } },
        // Tree animations
        branchDraw: { to: { strokeDashoffset: '0' } },
        nodeBloom:  { '0%': { transform: 'scale(0)', opacity: '0' }, '60%': { transform: 'scale(1.2)', opacity: '1' }, '100%': { transform: 'scale(1)' } },
        // Skeleton
        shimmer:    { from: { backgroundPosition: '-200% 0' }, to: { backgroundPosition: '200% 0' } },
        // Counter
        countUp:    { from: { transform: 'translateY(100%)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        // Sidebar item
        sidebarIn:  { from: { transform: 'translateX(-8px)', opacity: '0' }, to: { transform: 'translateX(0)', opacity: '1' } },
      },
      animation: {
        'fade-in':    'fadeIn   0.35s cubic-bezier(0.33,1,0.68,1) both',
        'slide-up':   'slideUp  0.45s cubic-bezier(0.16,1,0.3,1) both',
        'slide-down': 'slideDown 0.35s cubic-bezier(0.16,1,0.3,1) both',
        'slide-left': 'slideLeft 0.40s cubic-bezier(0.16,1,0.3,1) both',
        'scale-in':   'scaleIn  0.25s cubic-bezier(0.16,1,0.3,1) both',
        'float':      'float      4s ease-in-out infinite',
        'float-slow': 'floatSlow  6s ease-in-out infinite',
        'breathe':    'breathe    3s ease-in-out infinite',
        'pulse-glow': 'pulseGlow  3s ease-in-out infinite',
        'shimmer':    'shimmer   1.8s linear infinite',
        'count-up':   'countUp  0.6s cubic-bezier(0.16,1,0.3,1) both',
        'sidebar-in': 'sidebarIn 0.3s cubic-bezier(0.16,1,0.3,1) both',
      },
    },
  },
  plugins: [],
};

export default config;
