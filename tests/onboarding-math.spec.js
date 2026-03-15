// @ts-check
import { test, expect } from '@playwright/test';
import { mockSupabase } from './fixtures.js';

// These tests exercise onboarding math functions via the browser debug helper.
// estimateCategoryScore, applyAbsoluteAdjustment, and ABSOLUTE_BUCKETS are
// exposed on window.__pmOnboardingDebug (dev/test builds only).

const CATS = ['story', 'craft', 'performance', 'world', 'experience', 'hold', 'ending', 'singularity'];

async function setupPage(page) {
  await mockSupabase(page);
  await page.addInitScript(() => { localStorage.clear(); });
  await page.goto('/');
  await page.waitForTimeout(500);
  await page.evaluate(() => window._testSkipToQuiz('Math Test'));
  await page.waitForSelector('[data-testid="guided-search"]', { timeout: 5000 });
}

// ── estimateCategoryScore ──

test.describe('estimateCategoryScore', () => {
  test.beforeEach(async ({ page }) => { await setupPage(page); });

  test('returns prior with alpha=0 when no comparisons', async ({ page }) => {
    const result = await page.evaluate(() => {
      const fn = window.__pmOnboardingDebug.estimateCategoryScore;
      return fn({ prior: 72, comparisons: [], categoryRank: 0 });
    });
    expect(result.score).toBe(72);
    expect(result.alpha).toBe(0);
    expect(result.compCount).toBe(0);
    expect(result.lowerBound).toBeNull();
    expect(result.upperBound).toBeNull();
  });

  test('clamps scores to [20, 98] range', async ({ page }) => {
    const resultHigh = await page.evaluate(() => {
      const fn = window.__pmOnboardingDebug.estimateCategoryScore;
      return fn({ prior: 99, comparisons: [{ anchorScore: 97, won: true }], categoryRank: 0 });
    });
    expect(resultHigh.score).toBeLessThanOrEqual(98);
    expect(resultHigh.score).toBeGreaterThanOrEqual(20);

    const resultLow = await page.evaluate(() => {
      const fn = window.__pmOnboardingDebug.estimateCategoryScore;
      return fn({ prior: 15, comparisons: [{ anchorScore: 22, won: false }], categoryRank: 0 });
    });
    expect(resultLow.score).toBeGreaterThanOrEqual(20);
  });

  test('single win gives lower bound, no upper bound', async ({ page }) => {
    const result = await page.evaluate(() => {
      const fn = window.__pmOnboardingDebug.estimateCategoryScore;
      return fn({ prior: 60, comparisons: [{ anchorScore: 70, won: true }], categoryRank: 0 });
    });
    expect(result.lowerBound).toBe(70);
    expect(result.upperBound).toBeNull();
    expect(result.alpha).toBe(0.35);
    expect(result.compCount).toBe(1);
    expect(result.raw).toBeCloseTo(80.5, 1);
  });

  test('single loss gives upper bound, no lower bound', async ({ page }) => {
    const result = await page.evaluate(() => {
      const fn = window.__pmOnboardingDebug.estimateCategoryScore;
      return fn({ prior: 60, comparisons: [{ anchorScore: 70, won: false }], categoryRank: 0 });
    });
    expect(result.lowerBound).toBeNull();
    expect(result.upperBound).toBe(70);
    expect(result.alpha).toBe(0.35);
    expect(result.raw).toBeCloseTo(52.5, 1);
  });

  test('both bounds (bracket) uses midpoint with alpha=0.7', async ({ page }) => {
    const result = await page.evaluate(() => {
      const fn = window.__pmOnboardingDebug.estimateCategoryScore;
      return fn({
        prior: 60,
        comparisons: [
          { anchorScore: 50, won: true },
          { anchorScore: 80, won: false },
        ],
        categoryRank: 0,
      });
    });
    expect(result.lowerBound).toBe(50);
    expect(result.upperBound).toBe(80);
    expect(result.alpha).toBe(0.7);
    expect(result.raw).toBe(65);
    expect(result.score).toBe(64);
  });

  test('multiple one-sided comparisons get alpha=0.55', async ({ page }) => {
    const result = await page.evaluate(() => {
      const fn = window.__pmOnboardingDebug.estimateCategoryScore;
      return fn({
        prior: 60,
        comparisons: [
          { anchorScore: 50, won: true },
          { anchorScore: 70, won: true },
        ],
        categoryRank: 0,
      });
    });
    expect(result.lowerBound).toBe(70);
    expect(result.upperBound).toBeNull();
    expect(result.alpha).toBe(0.55);
    expect(result.compCount).toBe(2);
  });

  test('ties are excluded before reaching estimateCategoryScore', async ({ page }) => {
    const result = await page.evaluate(() => {
      const fn = window.__pmOnboardingDebug.estimateCategoryScore;
      return fn({ prior: 65, comparisons: [], categoryRank: 0 });
    });
    expect(result.score).toBe(65);
    expect(result.alpha).toBe(0);
  });

  test('blending shrinks toward prior correctly', async ({ page }) => {
    const result = await page.evaluate(() => {
      const fn = window.__pmOnboardingDebug.estimateCategoryScore;
      return fn({
        prior: 50,
        comparisons: [
          { anchorScore: 80, won: true },
          { anchorScore: 90, won: false },
        ],
        categoryRank: 0,
      });
    });
    expect(result.raw).toBe(85);
    expect(result.score).toBe(75);
  });
});

// ── applyAbsoluteAdjustment ──

test.describe('Absolute adjustment algorithm', () => {
  test.beforeEach(async ({ page }) => { await setupPage(page); });

  // Simple calcTotal stub: unweighted mean of all categories
  const simpleTotalFn = `(scores) => {
    const vals = Object.values(scores);
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }`;

  test('moderate upward adjustment toward target', async ({ page }) => {
    const result = await page.evaluate((calcFn) => {
      const fn = window.__pmOnboardingDebug.applyAbsoluteAdjustment;
      const scores = { story: 60, craft: 65, performance: 62, world: 58, experience: 63, hold: 61, ending: 59, singularity: 64 };
      const confidence = { story: 0.4, craft: 0.5, performance: 0.3, world: 0.4, experience: 0.5, hold: 0.3, ending: 0.4, singularity: 0.35 };
      const calcTotal = eval(calcFn);
      const result = fn(scores, confidence, 80, calcTotal);
      return { scores, result };
    }, simpleTotalFn);

    // avgConfidence ≈ 0.39 → absoluteWeight = 0.75
    expect(result.result.absoluteWeight).toBe(0.75);
    // All scores should have shifted upward
    expect(result.result.postAdjustmentTotal).toBeGreaterThan(result.result.pairwiseTotal);
    // The shift should move toward 80 but not fully reach it (partial weight)
    expect(result.result.postAdjustmentTotal).toBeGreaterThan(65);
    expect(result.result.postAdjustmentTotal).toBeLessThan(82);
  });

  test('moderate downward adjustment toward target', async ({ page }) => {
    const result = await page.evaluate((calcFn) => {
      const fn = window.__pmOnboardingDebug.applyAbsoluteAdjustment;
      const scores = { story: 85, craft: 88, performance: 82, world: 90, experience: 86, hold: 84, ending: 87, singularity: 83 };
      const confidence = { story: 0.5, craft: 0.5, performance: 0.4, world: 0.5, experience: 0.5, hold: 0.4, ending: 0.5, singularity: 0.4 };
      const calcTotal = eval(calcFn);
      const result = fn(scores, confidence, 58, calcTotal);
      return { scores, result };
    }, simpleTotalFn);

    // avgConfidence ≈ 0.46 → absoluteWeight = 0.75
    expect(result.result.absoluteWeight).toBe(0.75);
    expect(result.result.rawDelta).toBeLessThan(0); // downward
    expect(result.result.postAdjustmentTotal).toBeLessThan(result.result.pairwiseTotal);
  });

  test('high confidence reduces adjustment magnitude (weight=0.6)', async ({ page }) => {
    const result = await page.evaluate((calcFn) => {
      const fn = window.__pmOnboardingDebug.applyAbsoluteAdjustment;
      const scores = { story: 60, craft: 60, performance: 60, world: 60, experience: 60, hold: 60, ending: 60, singularity: 60 };
      // All high confidence → avgConfidence = 0.7 → weight = 0.6
      const confidence = { story: 0.7, craft: 0.7, performance: 0.7, world: 0.7, experience: 0.7, hold: 0.7, ending: 0.7, singularity: 0.7 };
      const calcTotal = eval(calcFn);
      return fn(scores, confidence, 80, calcTotal);
    }, simpleTotalFn);

    expect(result.absoluteWeight).toBe(0.6);
    // adjustment = 0.6 * (80 - 60) = 12
    expect(result.adjustment).toBe(12);
  });

  test('low confidence increases adjustment magnitude (weight=0.9)', async ({ page }) => {
    const result = await page.evaluate((calcFn) => {
      const fn = window.__pmOnboardingDebug.applyAbsoluteAdjustment;
      const scores = { story: 60, craft: 60, performance: 60, world: 60, experience: 60, hold: 60, ending: 60, singularity: 60 };
      // All low confidence → avgConfidence ≈ 0.2 → weight = 0.9
      const confidence = { story: 0.2, craft: 0.2, performance: 0.2, world: 0.2, experience: 0.2, hold: 0.2, ending: 0.2, singularity: 0.2 };
      const calcTotal = eval(calcFn);
      return fn(scores, confidence, 80, calcTotal);
    }, simpleTotalFn);

    expect(result.absoluteWeight).toBe(0.9);
    // adjustment = 0.9 * (80 - 60) = 18
    expect(result.adjustment).toBe(18);
  });

  test('medium confidence gets weight=0.75', async ({ page }) => {
    const result = await page.evaluate((calcFn) => {
      const fn = window.__pmOnboardingDebug.applyAbsoluteAdjustment;
      const scores = { story: 60, craft: 60, performance: 60, world: 60, experience: 60, hold: 60, ending: 60, singularity: 60 };
      // avgConfidence = 0.45 → between 0.35 and 0.55 → weight = 0.75
      const confidence = { story: 0.45, craft: 0.45, performance: 0.45, world: 0.45, experience: 0.45, hold: 0.45, ending: 0.45, singularity: 0.45 };
      const calcTotal = eval(calcFn);
      return fn(scores, confidence, 80, calcTotal);
    }, simpleTotalFn);

    expect(result.absoluteWeight).toBe(0.75);
    expect(result.adjustment).toBe(15);
  });

  test('near-ceiling clamping prevents scores above 98', async ({ page }) => {
    const result = await page.evaluate((calcFn) => {
      const fn = window.__pmOnboardingDebug.applyAbsoluteAdjustment;
      // Scores already near 98
      const scores = { story: 95, craft: 96, performance: 94, world: 97, experience: 95, hold: 93, ending: 96, singularity: 94 };
      const confidence = { story: 0.2, craft: 0.2, performance: 0.2, world: 0.2, experience: 0.2, hold: 0.2, ending: 0.2, singularity: 0.2 };
      const calcTotal = eval(calcFn);
      fn(scores, confidence, 98, calcTotal);
      return scores;
    }, simpleTotalFn);

    // All scores should be clamped at ≤ 98
    for (const cat of CATS) {
      expect(result[cat]).toBeLessThanOrEqual(98);
      expect(result[cat]).toBeGreaterThanOrEqual(20);
    }
  });

  test('near-floor clamping prevents scores below 20', async ({ page }) => {
    const result = await page.evaluate((calcFn) => {
      const fn = window.__pmOnboardingDebug.applyAbsoluteAdjustment;
      // Scores already near 20
      const scores = { story: 25, craft: 22, performance: 28, world: 23, experience: 26, hold: 24, ending: 21, singularity: 27 };
      const confidence = { story: 0.2, craft: 0.2, performance: 0.2, world: 0.2, experience: 0.2, hold: 0.2, ending: 0.2, singularity: 0.2 };
      const calcTotal = eval(calcFn);
      fn(scores, confidence, 20, calcTotal);
      return scores;
    }, simpleTotalFn);

    for (const cat of CATS) {
      expect(result[cat]).toBeGreaterThanOrEqual(20);
      expect(result[cat]).toBeLessThanOrEqual(98);
    }
  });

  test('total is recomputed after adjustment', async ({ page }) => {
    const result = await page.evaluate((calcFn) => {
      const fn = window.__pmOnboardingDebug.applyAbsoluteAdjustment;
      const scores = { story: 50, craft: 50, performance: 50, world: 50, experience: 50, hold: 50, ending: 50, singularity: 50 };
      const confidence = { story: 0.7, craft: 0.7, performance: 0.7, world: 0.7, experience: 0.7, hold: 0.7, ending: 0.7, singularity: 0.7 };
      const calcTotal = eval(calcFn);
      return fn(scores, confidence, 90, calcTotal);
    }, simpleTotalFn);

    // pairwiseTotal = 50, target = 90, weight = 0.6
    // adjustment = 0.6 * 40 = 24, so scores go to 74
    expect(result.pairwiseTotal).toBe(50);
    expect(result.adjustment).toBe(24);
    expect(result.postAdjustmentTotal).toBe(74);
    expect(result.discrepancy).toBe(74 - 90); // -16
  });

  test('zero-confidence categories get fallback and produce weight=0.9', async ({ page }) => {
    const result = await page.evaluate((calcFn) => {
      const fn = window.__pmOnboardingDebug.applyAbsoluteAdjustment;
      const scores = { story: 70, craft: 70, performance: 70, world: 70, experience: 70, hold: 70, ending: 70, singularity: 70 };
      // All zero confidence → avgConfidence = 0 → weight = 0.9
      const confidence = { story: 0, craft: 0, performance: 0, world: 0, experience: 0, hold: 0, ending: 0, singularity: 0 };
      const calcTotal = eval(calcFn);
      return fn(scores, confidence, 42, calcTotal);
    }, simpleTotalFn);

    expect(result.absoluteWeight).toBe(0.9);
    // adjustment = 0.9 * (42 - 70) = 0.9 * -28 = -25.2
    expect(result.adjustment).toBeCloseTo(-25.2, 1);
  });
});

// ── ABSOLUTE_BUCKETS validation ──

test.describe('ABSOLUTE_BUCKETS', () => {
  test.beforeEach(async ({ page }) => { await setupPage(page); });

  test('has correct target totals', async ({ page }) => {
    const buckets = await page.evaluate(() => window.__pmOnboardingDebug.ABSOLUTE_BUCKETS);
    expect(buckets).toEqual([
      { key: 'favorite', label: 'One of my favorites', target: 90 },
      { key: 'really_liked', label: 'Really liked it', target: 80 },
      { key: 'liked', label: 'Liked it', target: 70 },
      { key: 'mixed', label: 'Mixed on it', target: 58 },
      { key: 'didnt_like', label: "Didn't like it", target: 42 },
    ]);
  });

  test('targets are monotonically decreasing within valid range', async ({ page }) => {
    const buckets = await page.evaluate(() => window.__pmOnboardingDebug.ABSOLUTE_BUCKETS);
    for (let i = 1; i < buckets.length; i++) {
      expect(buckets[i].target).toBeLessThan(buckets[i - 1].target);
    }
    expect(buckets[0].target).toBeLessThan(100);
    expect(buckets[buckets.length - 1].target).toBeGreaterThan(20);
  });
});

// ── Confidence weighting ──

test.describe('Confidence weighting', () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabase(page);
    await page.addInitScript(() => { localStorage.clear(); });
  });

  test('getFilmObservationWeight returns 1.0 for manual/guided films', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);
    const weight = await page.evaluate(() => {
      return import('/src/modules/weight-blend.js').then(mod => {
        return mod.getFilmObservationWeight({ rating_source: 'guided_slider', scores: { story: 80 } }, 'story');
      });
    });
    expect(weight).toBe(1.0);
  });

  test('getFilmObservationWeight uses calibration_confidence for pairwise films', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);
    const weight = await page.evaluate(() => {
      return import('/src/modules/weight-blend.js').then(mod => {
        const film = {
          rating_source: 'onboarding_pairwise',
          calibration_confidence: { story: 0.7, craft: 0.55 },
        };
        return {
          storyWeight: mod.getFilmObservationWeight(film, 'story'),
          craftWeight: mod.getFilmObservationWeight(film, 'craft'),
        };
      });
    });
    expect(weight.storyWeight).toBe(0.7);
    expect(weight.craftWeight).toBe(0.55);
  });

  test('getFilmObservationWeight falls back for zero-confidence pairwise categories', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);
    const weight = await page.evaluate(() => {
      return import('/src/modules/weight-blend.js').then(mod => {
        const film = { rating_source: 'onboarding_pairwise', calibration_confidence: { story: 0, craft: 0.7 } };
        return mod.getFilmObservationWeight(film, 'story');
      });
    });
    expect(weight).toBe(0.25);
  });

  test('getFilmObservationWeight returns 1.0 for null film', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);
    const weight = await page.evaluate(() => {
      return import('/src/modules/weight-blend.js').then(mod => mod.getFilmObservationWeight(null, 'story'));
    });
    expect(weight).toBe(1.0);
  });

  test('computeWeightedCategoryAverages discounts low-confidence categories', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);
    const avgs = await page.evaluate(() => {
      return import('/src/modules/weight-blend.js').then(mod => {
        const movies = [
          { scores: { story: 90 }, rating_source: 'guided_slider' },
          { scores: { story: 50 }, rating_source: 'onboarding_pairwise', calibration_confidence: { story: 0.35 } },
        ];
        return mod.computeWeightedCategoryAverages(movies);
      });
    });
    // (90 * 1.0 + 50 * 0.35) / (1.0 + 0.35) ≈ 79.6
    expect(avgs.story).toBeCloseTo(79.6, 0);
    expect(avgs.story).toBeGreaterThan(75);
  });

  test('isInferredOnboardingFilm correctly identifies pairwise films', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);
    const results = await page.evaluate(() => {
      return import('/src/modules/weight-blend.js').then(mod => ({
        pairwise: mod.isInferredOnboardingFilm({ rating_source: 'onboarding_pairwise' }),
        guided: mod.isInferredOnboardingFilm({ rating_source: 'guided_slider' }),
        manual: mod.isInferredOnboardingFilm({ rating_source: 'manual_rating' }),
        legacy: mod.isInferredOnboardingFilm({}),
        nil: mod.isInferredOnboardingFilm(null),
      }));
    });
    expect(results.pairwise).toBe(true);
    expect(results.guided).toBe(false);
    expect(results.manual).toBe(false);
    expect(results.legacy).toBe(false);
    expect(results.nil).toBe(false);
  });
});

// ── Backward compatibility ──

test.describe('Backward compatibility', () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabase(page);
    await page.addInitScript(() => { localStorage.clear(); });
  });

  test('films without rating_source get weight 1.0', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);
    const weight = await page.evaluate(() => {
      return import('/src/modules/weight-blend.js').then(mod => {
        return mod.getFilmObservationWeight({ scores: { story: 80 } }, 'story');
      });
    });
    expect(weight).toBe(1.0);
  });

  test('films without calibration_confidence use fallback weight', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);
    const weight = await page.evaluate(() => {
      return import('/src/modules/weight-blend.js').then(mod => {
        return mod.getFilmObservationWeight({ rating_source: 'onboarding_pairwise' }, 'story');
      });
    });
    expect(weight).toBe(0.25);
  });
});
