'use client';

import { useEffect } from 'react';
import { useAuthStore } from '../store/auth.store';

// Offline caching (see public/sw.js) is a Plus/Pro feature
// (SUBSCRIPTION_LIMITS.canOfflineAccess) — gated here at registration time
// rather than inside the service worker itself, since a service worker has
// no clean way to check the current user's subscription tier before
// deciding whether to activate. A Free-tier user (or a Plus/Pro user who
// has downgraded) gets the service worker actively unregistered instead,
// so a past subscription doesn't leave stale offline caching running for
// someone no longer entitled to it.
export function ServiceWorkerRegistration() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const eligible = isAuthenticated && user?.subscriptionTier !== 'free';

    if (eligible) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        // Non-fatal — the app works fully online without it. Logged for
        // visibility only; there's nothing actionable for the user to do.
        console.error('Service worker registration failed:', err);
      });
    } else {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        for (const reg of regs) void reg.unregister();
      });
    }
  }, [isAuthenticated, user?.subscriptionTier]);

  return null;
}
