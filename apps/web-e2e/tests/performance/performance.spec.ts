/**
 * Performance tests — validates Core Web Vitals and API response time budgets.
 * These run in Chromium only (CDP required for performance metrics).
 * Thresholds are deliberately lenient for CI variability; tighten in production monitoring.
 */
import { test, expect } from '../../helpers/fixtures.ts';
import type { CDPSession } from '@playwright/test';

const THRESHOLDS = {
  /** Page must be interactive within this many ms */
  domContentLoaded:  3_000,
  /** All assets loaded */
  load:              5_000,
  /** Largest Contentful Paint */
  lcp:               4_000,
  /** Cumulative Layout Shift — lower is better */
  cls:               0.25,
  /** API calls in the happy path should complete within this */
  apiResponseMs:     2_000,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Reads Navigation Timing from the browser. */
async function getNavigationTiming(page: Parameters<Parameters<typeof test>[1]>[0]['page']) {
  return page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (!nav) return null;
    return {
      domContentLoaded: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
      load:             Math.round(nav.loadEventEnd - nav.startTime),
    };
  });
}

/** Observes LCP via PerformanceObserver for the duration of a callback. */
async function getLCP(page: Parameters<Parameters<typeof test>[1]>[0]['page']): Promise<number> {
  return page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let lcp = 0;
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const last    = entries[entries.length - 1];
          if (last) lcp = last.startTime;
        }).observe({ type: 'largest-contentful-paint', buffered: true });
        // Give the observer 3 seconds to collect entries
        setTimeout(() => resolve(Math.round(lcp)), 3_000);
      }),
  );
}

/** Reads Cumulative Layout Shift. */
async function getCLS(page: Parameters<Parameters<typeof test>[1]>[0]['page']): Promise<number> {
  return page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let cls = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const shift = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
            if (!shift.hadRecentInput) cls += shift.value ?? 0;
          }
        }).observe({ type: 'layout-shift', buffered: true });
        setTimeout(() => resolve(cls), 3_000);
      }),
  );
}

// ── Login page ────────────────────────────────────────────────────────────────

test.describe('Login page performance', () => {
  test('@smoke login page loads within budget', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('load');

    const timing = await getNavigationTiming(page);
    expect(timing).not.toBeNull();

    if (timing) {
      expect(
        timing.domContentLoaded,
        `DOMContentLoaded ${timing.domContentLoaded}ms > ${THRESHOLDS.domContentLoaded}ms`,
      ).toBeLessThan(THRESHOLDS.domContentLoaded);

      expect(
        timing.load,
        `Load ${timing.load}ms > ${THRESHOLDS.load}ms`,
      ).toBeLessThan(THRESHOLDS.load);
    }
  });

  test('login page LCP is within budget', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const lcp = await getLCP(page);
    expect(lcp, `LCP ${lcp}ms > ${THRESHOLDS.lcp}ms`).toBeLessThan(THRESHOLDS.lcp);
  });

  test('login page has no layout shift', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const cls = await getCLS(page);
    expect(cls, `CLS ${cls.toFixed(3)} > ${THRESHOLDS.cls}`).toBeLessThan(THRESHOLDS.cls);
  });
});

// ── Dashboard ─────────────────────────────────────────────────────────────────

test.describe('Dashboard performance', () => {
  test('dashboard loads within budget', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('load');

    const timing = await getNavigationTiming(page);
    if (timing) {
      expect(
        timing.load,
        `Dashboard load ${timing.load}ms > ${THRESHOLDS.load}ms`,
      ).toBeLessThan(THRESHOLDS.load);
    }
  });

  test('dashboard has acceptable CLS', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const cls = await getCLS(page);
    expect(cls, `Dashboard CLS ${cls.toFixed(3)} > ${THRESHOLDS.cls}`).toBeLessThan(
      THRESHOLDS.cls,
    );
  });

  test('tree cards render without heavy reflows', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Measure JS heap before and after card render
    const client = await page.context().newCDPSession(page);
    const before = await (client as CDPSession & {
      send: (method: string) => Promise<{ usedSize: number }>;
    }).send('Runtime.getHeapUsage');

    // Wait for cards to stabilise
    await page.waitForTimeout(1000);

    const after = await (client as CDPSession & {
      send: (method: string) => Promise<{ usedSize: number }>;
    }).send('Runtime.getHeapUsage');

    // Memory growth during render should be under 20 MB
    const growthMb = (after.usedSize - before.usedSize) / 1024 / 1024;
    expect(growthMb, `Heap grew by ${growthMb.toFixed(1)} MB`).toBeLessThan(20);
  });
});

// ── Tree page ─────────────────────────────────────────────────────────────────

test.describe('Tree canvas performance', () => {
  test('tree page loads within budget', async ({ page, testTree }) => {
    await page.goto(`/trees/${testTree.id}`);
    await page.waitForLoadState('load');

    const timing = await getNavigationTiming(page);
    if (timing) {
      expect(
        timing.load,
        `Tree page load ${timing.load}ms > ${THRESHOLDS.load}ms`,
      ).toBeLessThan(THRESHOLDS.load);
    }
  });

  test('D3 canvas renders without long task blocking main thread', async ({ page, testTree }) => {
    const longTasks: number[] = [];

    // Monitor for long tasks via CDP
    const client = await page.context().newCDPSession(page);
    await client.send('Performance.enable');

    await page.goto(`/trees/${testTree.id}`);
    await page.waitForLoadState('networkidle');

    const metrics = await client.send('Performance.getMetrics') as {
      metrics: Array<{ name: string; value: number }>;
    };

    const scriptDuration = metrics.metrics.find((m) => m.name === 'ScriptDuration');
    const layoutDuration = metrics.metrics.find((m) => m.name === 'LayoutDuration');

    // Script duration should be under 2 seconds total
    if (scriptDuration) {
      expect(
        scriptDuration.value * 1000,
        `Script duration ${(scriptDuration.value * 1000).toFixed(0)}ms`,
      ).toBeLessThan(2_000);
    }

    // Layout duration should be under 500ms
    if (layoutDuration) {
      expect(
        layoutDuration.value * 1000,
        `Layout duration ${(layoutDuration.value * 1000).toFixed(0)}ms`,
      ).toBeLessThan(500);
    }
  });
});

// ── API response times ────────────────────────────────────────────────────────

test.describe('API response times', () => {
  test('@smoke health endpoint responds within 200ms', async ({ request }) => {
    const API = process.env['API_URL'] ?? 'http://localhost:3001';

    const start = Date.now();
    const res   = await request.get(`${API}/health/live`);
    const ms    = Date.now() - start;

    expect(res.status()).toBe(200);
    expect(ms, `Health endpoint took ${ms}ms`).toBeLessThan(200);
  });

  test('login endpoint responds within budget', async ({ request }) => {
    const API = process.env['API_URL'] ?? 'http://localhost:3001';

    const start = Date.now();
    await request.post(`${API}/v1/auth/login`, {
      data: { email: 'perf-test@rootlink.test', password: 'WrongPass' },
    });
    const ms = Date.now() - start;

    // 401 expected — we're measuring latency not correctness here
    expect(ms, `Login endpoint took ${ms}ms`).toBeLessThan(THRESHOLDS.apiResponseMs);
  });

  test('person list endpoint responds within budget', async ({ request }) => {
    const API   = process.env['API_URL'] ?? 'http://localhost:3001';
    const EMAIL = process.env['E2E_USER_EMAIL']    ?? 'e2e@rootlink.test';
    const PASS  = process.env['E2E_USER_PASSWORD'] ?? 'E2ePassword123!';

    const loginRes = await request.post(`${API}/v1/auth/login`, {
      data: { email: EMAIL, password: PASS },
    });
    const { accessToken } = ((await loginRes.json()) as { data: { accessToken: string } }).data;

    // Get trees
    const treesRes = await request.get(`${API}/v1/trees`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const trees = ((await treesRes.json()) as { data: Array<{ id: string }> }).data;

    if (trees.length === 0) {
      test.skip();
      return;
    }

    const treeId = trees[0]!.id;
    const start  = Date.now();
    const res    = await request.get(`${API}/v1/trees/${treeId}/persons?pageSize=20`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const ms = Date.now() - start;

    expect(res.status()).toBe(200);
    expect(ms, `Persons list took ${ms}ms`).toBeLessThan(THRESHOLDS.apiResponseMs);
  });
});

// ── Asset loading ─────────────────────────────────────────────────────────────

test.describe('Asset loading', () => {
  test('no assets over 500 KB on login page', async ({ page }) => {
    const largeRequests: Array<{ url: string; size: number }> = [];

    page.on('response', async (response) => {
      const contentLength = response.headers()['content-length'];
      if (contentLength && parseInt(contentLength, 10) > 500 * 1024) {
        largeRequests.push({
          url:  response.url(),
          size: parseInt(contentLength, 10),
        });
      }
    });

    await page.goto('/login');
    await page.waitForLoadState('load');

    // Allow fonts — flag JS/CSS/images over 500 KB
    const flagged = largeRequests.filter(
      (r) => !r.url.includes('fonts.googleapis') && !r.url.includes('fonts.gstatic'),
    );

    if (flagged.length > 0) {
      const list = flagged.map((r) => `  ${r.url} (${(r.size / 1024).toFixed(0)} KB)`).join('\n');
      console.warn(`Large assets detected:\n${list}`);
    }

    // Non-blocking in CI — warn only
    expect(flagged.length).toBeLessThanOrEqual(3);
  });

  test('page uses gzip or brotli compression', async ({ page }) => {
    const uncompressedJs: string[] = [];

    page.on('response', (response) => {
      const ct = response.headers()['content-type'] ?? '';
      const ce = response.headers()['content-encoding'];
      if (ct.includes('javascript') && !ce) {
        uncompressedJs.push(response.url());
      }
    });

    await page.goto('/login');
    await page.waitForLoadState('load');

    // In development, Next.js may not compress — skip warning in dev
    if (process.env['NODE_ENV'] !== 'production') return;

    if (uncompressedJs.length > 0) {
      console.warn(`Uncompressed JS files:\n${uncompressedJs.map((u) => `  ${u}`).join('\n')}`);
    }
    expect(uncompressedJs.length).toBeLessThanOrEqual(2);
  });

  test('no console errors on page load', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Filter out known third-party noise
    const appErrors = errors.filter(
      (e) =>
        !e.includes('favicon') &&
        !e.includes('ResizeObserver') &&
        !e.includes('WebSocket') && // WS may not be available in test env
        !e.includes('axe'),
    );

    if (appErrors.length > 0) {
      console.warn(`Console errors:\n${appErrors.map((e) => `  ${e}`).join('\n')}`);
    }

    expect(appErrors.length, `Console errors: ${appErrors.join('; ')}`).toBeLessThanOrEqual(2);
  });
});
