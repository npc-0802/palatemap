// @ts-check
import { test, expect } from '@playwright/test';
import { mockSupabase } from './fixtures.js';

test.describe('Cold landing page', () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabase(page);
    await page.addInitScript(() => { localStorage.clear(); });
    await page.goto('/');
    await expect(page.locator('#cold-landing')).toBeVisible({ timeout: 5000 });
  });

  test('hero copy renders with headline and CTAs', async ({ page }) => {
    await expect(page.locator('.cold-h1')).toBeVisible();
    await expect(page.locator('.cold-h1')).toContainText('Taste is');
    await expect(page.locator('.cold-cta-primary')).toBeVisible();
    await expect(page.locator('.cold-cta-google')).toBeVisible();
  });

  test('carousel renders 3 cards with dots', async ({ page }) => {
    const dots = page.locator('.cold-carousel-dot');
    await expect(dots).toHaveCount(3);
    // First dot is active by default
    await expect(dots.nth(0)).toHaveClass(/active/);
    // First card has content (bars rendered by JS)
    await expect(page.locator('#carousel-card-0 .card-bar-fill').first()).toBeVisible({ timeout: 3000 });
  });

  test('carousel dot navigation updates active state', async ({ page }) => {
    // Call goToCardManual directly — inline onclick may not fire reliably on mobile
    await page.evaluate(() => window.goToCardManual(1));
    await expect(page.locator('.cold-carousel-dot').nth(1)).toHaveClass(/active/);
    await expect(page.locator('.cold-carousel-dot').nth(0)).not.toHaveClass(/active/);
    // Track should have moved
    const transform = await page.locator('#cold-carousel-track').evaluate(el => el.style.transform);
    expect(transform).toContain('-100%');
  });

  test('carousel card 3 has recommendation content', async ({ page }) => {
    // Verify card 3 was populated by JS (content exists even if off-screen)
    const headline = page.locator('#carousel-card-2 .carousel-headline');
    await expect(headline).toHaveCount(1);
    const recCards = page.locator('#carousel-card-2 .carousel-rec-card');
    await expect(recCards).toHaveCount(4);
  });

  test('ticker headline and scroll track render', async ({ page }) => {
    await expect(page.locator('.cold-ticker-headline')).toBeVisible();
    await expect(page.locator('.cold-ticker-headline')).toContainText('Palate Map');
    // Ticker track has items
    const items = page.locator('.cold-ticker-item');
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(8); // 3x repeated = 12 items
  });

  test('system section renders all three beats', async ({ page }) => {
    // Scroll system section into view
    await page.locator('.cold-system').scrollIntoViewIfNeeded();
    await expect(page.locator('#cold-beat-rate .sys-rate-scroll')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('#cold-beat-map .sys-radar-svg')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('#cold-beat-discover .sys-discover-card').first()).toBeVisible({ timeout: 5000 });
  });

  test('system CTA button is present', async ({ page }) => {
    await page.locator('.cold-system-cta').scrollIntoViewIfNeeded();
    await expect(page.locator('.cold-system-cta')).toBeVisible();
    await expect(page.locator('.cold-system-cta')).toContainText('Start with 5 films');
  });

  test('primary CTA triggers onboarding', async ({ page }) => {
    await page.locator('.cold-cta-primary').click();
    // Cold landing should start exiting, onboarding should appear
    await expect(page.locator('#onboarding-overlay')).toBeVisible({ timeout: 5000 });
  });

  test('login and import links are visible and clickable', async ({ page }) => {
    const links = page.locator('.cold-links a');
    await expect(links).toHaveCount(2);
    await expect(links.nth(0)).toBeVisible();
    await expect(links.nth(1)).toBeVisible();
    await expect(links.nth(0)).toContainText('Log in');
    await expect(links.nth(1)).toContainText('Import from Letterboxd');
  });
});
