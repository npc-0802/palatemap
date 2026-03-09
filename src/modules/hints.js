// src/modules/hints.js — Contextual inline hints system

const HINT_PREFIX = 'pm_hint_';

export function shouldShowHint(key, condition) {
  if (localStorage.getItem(HINT_PREFIX + key)) return false;
  return condition();
}

export function dismissHint(key) {
  localStorage.setItem(HINT_PREFIX + key, '1');
}

export function renderHint(key, content) {
  return `
    <div class="inline-hint" id="hint-${key}">
      <div class="inline-hint-content">${content}</div>
      <button class="inline-hint-dismiss" onclick="dismissInlineHint('${key}')">✕</button>
    </div>
  `;
}

window.dismissInlineHint = function(key) {
  dismissHint(key);
  const el = document.getElementById('hint-' + key);
  if (el) { el.style.opacity = '0'; el.style.transition = 'opacity 0.2s'; setTimeout(() => el.remove(), 200); }
};
