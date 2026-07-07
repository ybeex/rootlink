import type { Metadata, Viewport } from 'next';
import { Providers } from './providers';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: {
    default: 'RootLink — Your family\'s story, kept whole.',
    template: '%s — RootLink',
  },
  description:
    'Build the tree. Attach the photographs and certificates that prove it. Control who sees what — down to keeping living relatives off anything shared publicly.',
  applicationName: 'RootLink',
  keywords: ['family tree', 'genealogy', 'ancestry', 'heritage', 'family history'],
  authors: [{ name: 'RootLink' }],
  creator: 'RootLink',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://rootlink.app',
    siteName: 'RootLink',
    title: 'RootLink — Your family\'s story, kept whole.',
    description: 'Build the tree. Attach the photographs and certificates that prove it. Control who sees what, down to keeping living relatives private.',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'RootLink — Your family\'s story, kept whole.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RootLink — Your family\'s story, kept whole.',
    description: 'Build, share, and preserve your family history — privately by default.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F7F5F1' },
    { media: '(prefers-color-scheme: dark)',  color: '#080F0D' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
