// Analytics event helpers — pushes to GTM dataLayer
// All events queue immediately; GTM processes them once loaded

export function track(event, params = {}) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...params });
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
    rankings: 'Rankings',
    analysis: 'Analysis',
    predict: 'For You',
    profile: 'Profile',
    friends: 'Friends',
    watchlist: 'Watch List',
    add: 'Add Film',
    calibration: 'Calibrate',
  };
  track('virtual_pageview', {
    page_path: '/' + screenId,
    page_title: titles[screenId] || screenId,
  });
}
