'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/auth.store';

/**
 * Renders nothing. If an already-authenticated visitor lands on "/" (the
 * public landing page), send them straight to their dashboard instead of
 * showing the marketing pitch again. Waits for the auth store to finish
 * rehydrating from sessionStorage first, so a logged-in user doesn't see a
 * flash of the landing page before being redirected.
 *
 * Deliberately scoped to the landing page only — /pricing, /terms, /privacy,
 * etc. stay visible regardless of auth state, since a logged-in user may
 * reasonably want to revisit them.
 */
export function LandingAuthRedirect() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isLoading, isAuthenticated, router]);

  return null;
}
