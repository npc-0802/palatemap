// ── Synthetic Browser Swarm ──────────────────────────────────────────────────
// Playwright-driven synthetic browser runs that exercise the real app
// with parameterized behavior profiles across many sessions.
//
// Usage:
//   SYNTH_MODE=1 npx playwright test tests/synth/synthetic-swarm.spec.js --workers=4
//
// Environment:
//   SYNTH_MODE=1                       — required, prevents accidental production runs
//   SYNTH_BASE_URL=http://localhost:5173 — target URL (default: localhost)
//   SYNTH_USERS=50                     — number of synthetic user sessions (default: 50)
//   SYNTH_SEED=42                      — RNG seed (default: 42)

import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

// ── Safety gate ──────────────────────────────────────────────────────────────
const SYNTH_MODE = process.env.SYNTH_MODE === '1';
const BASE_URL = process.env.SYNTH_BASE_URL || 'http://localhost:5173';
const SYNTH_USERS = parseInt(process.env.SYNTH_USERS || '50', 10);
const SEED = parseInt(process.env.SYNTH_SEED || '42', 10);

// ── PRNG ─────────────────────────────────────────────────────────────────────
function mulberry32(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createRng(seed) {
  const raw = mulberry32(seed);
  return {
    random: raw,
    int: (min, max) => Math.floor(min + raw() * (max - min + 1)),
    chance: (p) => raw() < p,
    pick: (arr) => arr[Math.floor(raw() * arr.length)],
    range: (min, max) => min + raw() * (max - min),
  };
}

// ── Behavior profiles ────────────────────────────────────────────────────────
const PROFILES = {
  careful:    { weight: 0.25, patience: 3000, clickDelay: 800, abandonProb: 0.05 },
  impatient:  { weight: 0.20, patience: 500,  clickDelay: 150, abandonProb: 0.15 },
  curious:    { weight: 0.15, patience: 1500, clickDelay: 500, abandonProb: 0.10 },
  skeptical:  { weight: 0.15, patience: 2000, clickDelay: 600, abandonProb: 0.20 },
  power_user: { weight: 0.15, patience: 1000, clickDelay: 300, abandonProb: 0.02 },
  abandoner:  { weight: 0.10, patience: 300,  clickDelay: 100, abandonProb: 0.40 },
};

function assignProfile(rng) {
  const keys = Object.keys(PROFILES);
  const weights = keys.map(k => PROFILES[k].weight);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng.random() * total;
  for (let i = 0; i < keys.length; i++) {
    r -= weights[i];
    if (r <= 0) return keys[i];
  }
  return keys[keys.length - 1];
}

// ── Findings collector (shared across all tests in this file) ────────────────
const findings = [];
const sessionResults = [];

function recordFinding(category, screen, action, observed, opts = {}) {
  findings.push({
    category, screen, action, observed,
    message: opts.message || null,
    retryPathExists: opts.retryPathExists ?? false,
    retrySucceeded: opts.retrySucceeded ?? null,
    userId: opts.userId || null,
    behaviorProfile: opts.behaviorProfile || null,
    timestamp: new Date().toISOString(),
  });
}

// ── Generate the test matrix ─────────────────────────────────────────────────
// Pre-generate all synthetic user configs so Playwright can create tests for each.
const masterRng = createRng(SEED);
const userConfigs = [];
for (let i = 0; i < SYNTH_USERS; i++) {
  userConfigs.push({
    id: `swarm_${String(i + 1).padStart(4, '0')}`,
    profile: assignProfile(masterRng),
    seed: SEED + i + 1,
    name: `Synth ${i + 1}`,
  });
}

// ── Smoke tests (always run) ─────────────────────────────────────────────────

test.describe('Smoke: Basic app health', () => {
  test.skip(!SYNTH_MODE, 'SYNTH_MODE=1 required');

  test('cold landing loads without uncaught errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto(BASE_URL);
    await page.waitForTimeout(2000);

    const landing = page.locator('#cold-landing');
    const onboarding = page.locator('#onboarding-overlay');
    const isLanding = await landing.isVisible().catch(() => false);
    const isOnboarding = await onboarding.isVisible().catch(() => false);

    expect(isLanding || isOnboarding).toBeTruthy();
    expect(errors).toHaveLength(0);
  });

  test('skip-to-guided test helper works', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(500);
    await page.evaluate(() => window._testSkipToQuiz?.('Smoke Test'));
    await page.waitForTimeout(500);

    const overlay = page.locator('#onboarding-overlay');
    await expect(overlay).toBeVisible();
  });

  test('refresh mid-onboarding shows resume prompt', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(500);
    await page.evaluate(() => window._testSkipToQuiz?.('Resume Test'));
    await page.waitForTimeout(1000);
    await page.reload();
    await page.waitForTimeout(2000);

    const resumeBtn = page.locator('[data-testid="resume-continue"]');
    const hasResume = await resumeBtn.isVisible().catch(() => false);
    // Resume prompt or onboarding overlay should be visible
    if (!hasResume) {
      const overlay = page.locator('#onboarding-overlay');
      await expect(overlay).toBeVisible();
    }
  });
});

// ── Parameterized swarm sessions ─────────────────────────────────────────────
// Each synthetic user gets their own test. They start onboarding, interact
// according to their behavior profile, and we record findings.

test.describe('Swarm: Parameterized sessions', () => {
  test.skip(!SYNTH_MODE, 'SYNTH_MODE=1 required');

  for (const config of userConfigs) {
    test(`user ${config.id} (${config.profile})`, async ({ page }) => {
      const rng = createRng(config.seed);
      const profile = PROFILES[config.profile];
      const result = {
        userId: config.id,
        profile: config.profile,
        reachedStep: 'none',
        errors: [],
        abandoned: false,
        completedOnboarding: false,
      };

      // Collect errors
      page.on('pageerror', err => {
        result.errors.push(err.message);
        recordFinding('console_error', result.reachedStep, 'runtime',
          err.message, { userId: config.id, behaviorProfile: config.profile });
      });

      // Step 1: Load app
      await page.goto(BASE_URL);
      await page.waitForTimeout(Math.min(profile.patience, 1500));
      result.reachedStep = 'landing';

      // Step 2: Skip to guided flow
      await page.evaluate((name) => window._testSkipToQuiz?.(name), config.name);
      await page.waitForTimeout(profile.clickDelay);

      const overlay = page.locator('#onboarding-overlay');
      if (!await overlay.isVisible().catch(() => false)) {
        recordFinding('dead_end', 'landing', 'skip_to_guided',
          'Onboarding overlay not visible', { userId: config.id, behaviorProfile: config.profile });
        result.reachedStep = 'failed_start';
        sessionResults.push(result);
        return;
      }
      result.reachedStep = 'guided';

      // Step 3: Interact with guided flow
      // Search for a film and try to select it
      const searchInput = page.locator('[data-testid="guided-search"]');
      if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Behavioral: abandoner might leave here
        if (rng.chance(profile.abandonProb)) {
          result.abandoned = true;
          result.reachedStep = 'guided_abandoned';
          sessionResults.push(result);
          return;
        }

        // Type a search query
        const queries = ['inception', 'fight club', 'parasite', 'dark knight', 'pulp fiction',
          'alien', 'matrix', 'godfather', 'spirited away', 'whiplash'];
        const query = rng.pick(queries);
        await searchInput.fill(query);
        await page.waitForTimeout(profile.clickDelay + 500); // wait for TMDB

        // Try to click a search result
        const searchResults = page.locator('.ob-search-result, .ob-film-result, [data-testid="search-result"]');
        const resultCount = await searchResults.count().catch(() => 0);
        if (resultCount > 0) {
          await searchResults.first().click().catch(() => {});
          await page.waitForTimeout(profile.clickDelay);
        } else {
          recordFinding('silent_failure', 'guided', 'film_search',
            `No results for "${query}"`, { userId: config.id, behaviorProfile: config.profile });
        }
      }

      // Step 4: Try to interact with sliders if visible
      const sliders = page.locator('input[type="range"]');
      const sliderCount = await sliders.count().catch(() => 0);
      for (let i = 0; i < Math.min(sliderCount, 8); i++) {
        const slider = sliders.nth(i);
        if (await slider.isVisible().catch(() => false)) {
          const value = rng.int(30, 95);
          await slider.fill(String(value)).catch(() => {});
          await page.waitForTimeout(Math.max(profile.clickDelay / 2, 50));
        }
      }

      // Step 5: Click any visible "next" or "continue" buttons
      const nextBtns = page.locator('button:visible:has-text("next"), button:visible:has-text("continue"), button:visible:has-text("→"), .ob-btn:visible');
      const nextCount = await nextBtns.count().catch(() => 0);
      for (let i = 0; i < Math.min(nextCount, 3); i++) {
        if (rng.chance(profile.abandonProb)) {
          result.abandoned = true;
          break;
        }
        await nextBtns.nth(i).click({ timeout: 1000 }).catch(() => {});
        await page.waitForTimeout(profile.clickDelay);
      }

      // Step 6: Check for refresh resilience
      if (rng.chance(0.3)) { // 30% of sessions test refresh
        await page.reload();
        await page.waitForTimeout(2000);
        const resumeBtn = page.locator('[data-testid="resume-continue"]');
        const hasResume = await resumeBtn.isVisible().catch(() => false);
        if (hasResume) {
          await resumeBtn.click().catch(() => {});
          await page.waitForTimeout(profile.clickDelay);
        } else {
          // Check if we're in a recoverable state
          const anyVisible = await page.locator('#onboarding-overlay:visible, #cold-landing:visible').count();
          if (anyVisible === 0) {
            recordFinding('dead_end', 'refresh_recovery', 'page_reload',
              'No visible UI after refresh', { userId: config.id, behaviorProfile: config.profile });
          }
        }
      }

      // Step 7: Try rapid clicking (stress test for impatient profiles)
      if (config.profile === 'impatient' || config.profile === 'abandoner') {
        const allBtns = page.locator('button:visible');
        const btnCount = await allBtns.count().catch(() => 0);
        for (let i = 0; i < Math.min(btnCount, 5); i++) {
          await allBtns.nth(i).click({ timeout: 200 }).catch(() => {});
          await page.waitForTimeout(50);
        }
      }

      // Record final state
      result.reachedStep = result.abandoned ? `${result.reachedStep}_abandoned` : result.reachedStep;
      sessionResults.push(result);
    });
  }
});

// ── Write findings report ────────────────────────────────────────────────────

test.afterAll(async () => {
  const dir = 'artifacts/synth/swarm-findings';
  mkdirSync(dir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  // Findings detail
  writeFileSync(
    join(dir, `findings-${timestamp}.json`),
    JSON.stringify(findings, null, 2)
  );

  // Session summary
  const summary = {
    totalSessions: sessionResults.length,
    profiles: {},
    reachedSteps: {},
    abandonCount: sessionResults.filter(r => r.abandoned).length,
    errorCount: findings.length,
    errorsByCategory: {},
    sessionsWithErrors: sessionResults.filter(r => r.errors.length > 0).length,
  };

  for (const r of sessionResults) {
    summary.profiles[r.profile] = (summary.profiles[r.profile] || 0) + 1;
    summary.reachedSteps[r.reachedStep] = (summary.reachedSteps[r.reachedStep] || 0) + 1;
  }
  for (const f of findings) {
    summary.errorsByCategory[f.category] = (summary.errorsByCategory[f.category] || 0) + 1;
  }

  writeFileSync(
    join(dir, `summary-${timestamp}.json`),
    JSON.stringify(summary, null, 2)
  );

  console.log(`\n── Swarm Results ──`);
  console.log(`  Sessions: ${sessionResults.length}`);
  console.log(`  Abandoned: ${summary.abandonCount}`);
  console.log(`  Sessions with errors: ${summary.sessionsWithErrors}`);
  console.log(`  Total findings: ${findings.length}`);
  console.log(`  Profiles: ${JSON.stringify(summary.profiles)}`);
  console.log(`  Findings: ${join(dir, `findings-${timestamp}.json`)}`);
});
