import { OWNER_MOVIES } from './data/movies.js';
import { CATEGORIES } from './data/categories.js';

export { CATEGORIES };

// Active movie list — starts empty for new users, owner gets OWNER_MOVIES via Supabase
export let MOVIES = [];

export let currentUser = null; // { id, username, display_name, archetype, archetype_secondary, weights, harmony_sensitivity }

export function setCurrentUser(user) {
  currentUser = user;
}

export function setMovies(arr) {
  MOVIES.length = 0;
  arr.forEach(m => MOVIES.push(m));
}

export const LABELS = [
  [90, 'An all-time favorite'], [85, 'Really quite exceptional'], [80, 'Excellent'],
  [75, 'Well above average'], [70, 'Great'], [65, 'Very good'], [60, 'A cut above'],
  [55, 'Good'], [50, 'Solid'], [45, 'Not bad'], [40, 'Sub-par'], [35, 'Multiple flaws'],
  [30, 'Poor'], [25, 'Bad'], [20, "Wouldn't watch by choice"],
  [15, 'So bad I stopped watching'], [10, 'Disgusting'], [2, 'Insulting'], [0, 'Unwatchable']
];

// Merge consecutive single-word entries caused by split-name storage bug
// e.g. ["Kirsten", "Dunst"] → ["Kirsten Dunst"]
export function mergeSplitNames(arr) {
  const out = [];
  let i = 0;
  while (i < arr.length) {
    if (!arr[i].includes(' ') && arr[i + 1] && !arr[i + 1].includes(' ')) {
      out.push(arr[i] + ' ' + arr[i + 1]); i += 2;
    } else { out.push(arr[i]); i++; }
  }
  return out;
}

export function getLabel(score) {
  if (score === 100) return 'No better exists';
  if (score === 1) return 'No worse exists';
  for (const [threshold, label] of LABELS) if (score >= threshold) return label;
  return 'Unwatchable';
}

export function calcTotal(scores) {
  let sum = 0, wsum = 0;
  for (const cat of CATEGORIES) {
    if (scores[cat.key] != null) { sum += scores[cat.key] * cat.weight; wsum += cat.weight; }
  }
  return wsum > 0 ? Math.round((sum / wsum) * 100) / 100 : 0;
}

export function recalcAllTotals() {
  MOVIES.forEach(m => { m.total = calcTotal(m.scores); });
}

export function scoreClass(s) {
  if (s >= 90) return 's90'; if (s >= 80) return 's80'; if (s >= 70) return 's70';
  if (s >= 60) return 's60'; if (s >= 50) return 's50'; if (s >= 40) return 's40';
  return 's30';
}

export function applyUserWeights() {
  if (!currentUser || !currentUser.weights) return;
  const w = currentUser.weights;
  CATEGORIES.forEach(cat => {
    if (w[cat.key] != null) cat.weight = w[cat.key];
  });
  recalcAllTotals();
}
