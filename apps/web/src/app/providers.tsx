'use client';

import { ThemeProvider } from 'next-themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'sonner';
import { useState } from 'react';
import { ApiClientError } from '../lib/api-client';
import { ServiceWorkerRegistration } from '../components/ServiceWorkerRegistration';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            gcTime: 5 * 60 * 1000,
            retry: (failureCount, error) => {
              if (error instanceof ApiClientError && error.status < 500) return false;
              return failureCount < 2;
            },
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange={false}
        storageKey="rootlink-theme"
      >
        {children}
        <ServiceWorkerRegistration />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background:  'var(--bg-surface)',
              border:      '1px solid var(--border-default)',
              color:       'var(--text-primary)',
              fontFamily:  'var(--font-body)',
            },
          }}
          richColors
          closeButton
        />
      </ThemeProvider>
      {process.env['NODE_ENV'] === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
