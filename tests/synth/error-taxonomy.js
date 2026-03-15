// ── Error Taxonomy for Browser Swarm Findings ───────────────────────────────
// Structured schema for recording and classifying UX failures
// discovered during synthetic browser testing.

export const ERROR_CATEGORIES = {
  network_error: {
    label: 'Network Error',
    description: 'Failed fetch, timeout, or unreachable endpoint',
    severity: 'high',
  },
  auth_error: {
    label: 'Authentication Error',
    description: 'Auth flow failure, token issue, or session problem',
    severity: 'high',
  },
  quota_error: {
    label: 'Quota Error',
    description: 'Prediction quota exceeded or quota service failure',
    severity: 'medium',
  },
  resume_error: {
    label: 'Resume Error',
    description: 'Autosave/resume flow failure or state corruption',
    severity: 'high',
  },
  dead_end: {
    label: 'Dead End',
    description: 'User reaches a state with no visible path forward',
    severity: 'critical',
  },
  validation_error: {
    label: 'Validation Error',
    description: 'Form submission or input validation failure',
    severity: 'medium',
  },
  stale_state: {
    label: 'Stale State',
    description: 'UI displays outdated data or fails to reflect changes',
    severity: 'medium',
  },
  silent_failure: {
    label: 'Silent Failure',
    description: 'Action fails without visible feedback to user',
    severity: 'high',
  },
  confusing_copy: {
    label: 'Confusing Copy',
    description: 'Error message or UI text is unclear or unhelpful',
    severity: 'low',
  },
  console_error: {
    label: 'Console Error',
    description: 'Uncaught exception or error logged to console',
    severity: 'medium',
  },
  navigation_trap: {
    label: 'Navigation Trap',
    description: 'Modal or overlay prevents expected navigation',
    severity: 'high',
  },
};

/**
 * Create a structured finding record.
 * @param {Object} params
 * @param {string} params.category - One of ERROR_CATEGORIES keys
 * @param {string} params.screen - Which screen/step the error occurred on
 * @param {string} params.action - What the user was trying to do
 * @param {string} params.observed - What actually happened
 * @param {string} [params.message] - Error message shown to user (if any)
 * @param {boolean} params.retryPathExists - Whether the UI offered a recovery action
 * @param {boolean} [params.retrySucceeded] - Whether the retry action worked
 * @param {string} [params.userId] - Synthetic user ID
 * @param {string} [params.behaviorProfile] - User's behavior profile
 * @param {Object} [params.metadata] - Additional context
 */
export function createFinding(params) {
  return {
    id: `finding_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    category: params.category,
    severity: ERROR_CATEGORIES[params.category]?.severity || 'unknown',
    screen: params.screen,
    action: params.action,
    observed: params.observed,
    message: params.message || null,
    retryPathExists: params.retryPathExists,
    retrySucceeded: params.retrySucceeded ?? null,
    userId: params.userId || null,
    behaviorProfile: params.behaviorProfile || null,
    metadata: params.metadata || {},
  };
}

/**
 * Summarize an array of findings into a report-ready structure.
 */
export function summarizeFindings(findings) {
  const byCat = {};
  const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 };
  const byScreen = {};
  const recoveryStats = { offered: 0, succeeded: 0, notOffered: 0 };

  for (const f of findings) {
    byCat[f.category] = (byCat[f.category] || 0) + 1;
    bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1;
    byScreen[f.screen] = (byScreen[f.screen] || 0) + 1;

    if (f.retryPathExists) {
      recoveryStats.offered++;
      if (f.retrySucceeded) recoveryStats.succeeded++;
    } else {
      recoveryStats.notOffered++;
    }
  }

  return {
    totalFindings: findings.length,
    byCategory: byCat,
    bySeverity,
    byScreen,
    recoveryStats,
    worstScreens: Object.entries(byScreen)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([screen, count]) => ({ screen, count })),
    topErrorClasses: Object.entries(byCat)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, count]) => ({ category, count, label: ERROR_CATEGORIES[category]?.label })),
  };
}
