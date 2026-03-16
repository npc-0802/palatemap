// Analytics event helpers — pushes to GTM dataLayer
// All events queue immediately; GTM processes them once loaded

// ── Beta attribution ──
// We persist UTM parameters from the landing URL so that every subsequent
// dataLayer event carries the acquisition source (e.g. which subreddit).
// This lets GA4/GTM build a full beta funnel from landing → onboarding →
// prediction → feedback, segmented by source — even across refreshes,
// auth flows, and resumed onboarding sessions.

const ATTRIBUTION_KEY = 'palatemap_beta_attribution';

/**
 * Read UTM params from the current URL and persist as beta attribution.
 * Only writes if the URL actually contains UTM params (never overwrites
 * existing attribution with empty values from a bare URL).
 * If a later landing includes new UTM params, the stored attribution is updated.
 */
export function persistBetaAttributionFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const utm_source = params.get('utm_source');
  const utm_medium = params.get('utm_medium');
  const utm_campaign = params.get('utm_campaign');
  const utm_content = params.get('utm_content');

  // Only persist if at least utm_source is present
  if (!utm_source) return;

  const attribution = {
    beta_source: utm_source,
    beta_subreddit: utm_content || '',
    utm_source,
    utm_medium: utm_medium || '',
    utm_campaign: utm_campaign || '',
    utm_content: utm_content || '',
    first_seen_at: Date.now(),
  };

  // Preserve original first_seen_at if updating an existing attribution
  const existing = getStoredBetaAttribution();
  if (existing?.first_seen_at) {
    attribution.first_seen_at = existing.first_seen_at;
  }

  try {
    localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
  } catch { /* quota exceeded — non-critical */ }
}

/**
 * Retrieve the stored beta attribution object, or null.
 * Inspectable in console: getStoredBetaAttribution()
 */
export function getStoredBetaAttribution() {
  try {
    const raw = localStorage.getItem(ATTRIBUTION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ── Core event helpers ──

/**
 * Push a structured event to the GTM dataLayer.
 * Beta attribution fields (beta_source, beta_subreddit) are automatically
 * merged into every event so GA4 can segment any milestone by acquisition source.
 */
export function track(event, params = {}) {
  window.dataLayer = window.dataLayer || [];
  const attribution = getStoredBetaAttribution();
  const payload = { event, ...params };
  if (attribution) {
    payload.beta_source = attribution.beta_source;
    payload.beta_subreddit = attribution.beta_subreddit;
  }
  window.dataLayer.push(payload);
}

/**
 * Push a named product milestone event.
 * Same as track() but with explicit naming for milestone events
 * to distinguish them from legacy event names.
 */
export function pushAnalyticsEvent(eventName, params = {}) {
  track(eventName, params);
}

// Session-level user identification (called once on init)
export function identifyUser(user, filmsCount) {
  track('user_identified', {
    user_archetype: user.archetype,
    user_archetype_secondary: user.archetype_secondary,
    user_films_rated: filmsCount,
    user_subscription: user.subscription_status || 'free',
  });
}

// SPA virtual pageview
export function trackPageview(screenId) {
  const titles = {
    myfilms: 'My Films',
    rankings: 'My Films',
    analysis: 'Profile',
    predict: 'Discover',
    profile: 'Profile',
    friends: 'Friends',
    watchlist: 'My Films',
    add: 'Add Film',
    calibration: 'Calibrate',
  };
  track('virtual_pageview', {
    page_path: '/' + screenId,
    page_title: titles[screenId] || screenId,
  });
}

// ── Feedback form attribution ──

// Google Form prefill field entry IDs.
// Update these once the actual form is created.
const FEEDBACK_FORM_CONFIG = {
  baseUrl: 'https://docs.google.com/forms/d/e/YOUR_FORM_ID/viewform',
  fields: {
    beta_source: 'entry.1000000001',
    beta_subreddit: 'entry.1000000002',
    utm_campaign: 'entry.1000000003',
  },
};

/**
 * Build a feedback form URL with attribution prefilled.
 * Does NOT fire analytics — call trackFeedbackFormOpened() on user click.
 */
export function buildFeedbackFormUrl() {
  const { baseUrl, fields } = FEEDBACK_FORM_CONFIG;
  const attribution = getStoredBetaAttribution();
  if (!attribution) return baseUrl;

  const params = new URLSearchParams();
  if (attribution.beta_source) params.set(fields.beta_source, attribution.beta_source);
  if (attribution.beta_subreddit) params.set(fields.beta_subreddit, attribution.beta_subreddit);
  if (attribution.utm_campaign) params.set(fields.utm_campaign, attribution.utm_campaign);

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Fire pm_feedback_form_opened. Call this from the actual click/open handler,
 * not from URL construction, to avoid overcounting from prerenders or rebuilds.
 */
export function trackFeedbackFormOpened() {
  pushAnalyticsEvent('pm_feedback_form_opened', {
    form_name: 'beta_feedback',
    screen_name: 'feedback',
  });
}

// Expose attribution helper on window for console inspection during testing
if (typeof window !== 'undefined') {
  window._pmAttribution = getStoredBetaAttribution;
}
