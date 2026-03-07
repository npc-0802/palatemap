import { CATEGORIES, currentUser, recalcAllTotals, applyUserWeights } from '../state.js';
import { ARCHETYPES } from '../data/archetypes.js';
import { saveToStorage } from './storage.js';
import { renderRankings } from './rankings.js';

export function showSyncPanel() {
  if (!currentUser) {
    import('./onboarding.js').then(m => m.launchOnboarding());
    return;
  }
  openArchetypeModal();
}

export function openArchetypeModal() {
  if (!currentUser) return;
  const weights = currentUser.weights || {};
  const maxWeight = Math.max(...Object.values(weights));

  document.getElementById('archetypeModalContent').innerHTML = `
    <button class="modal-close" onclick="closeArchetypeModal()">×</button>
    <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:2px;color:var(--dim);margin-bottom:6px">Your archetype</div>
    <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:32px;font-weight:900;color:var(--blue);margin-bottom:4px">${currentUser.archetype || '—'}</div>
    ${currentUser.archetype_secondary ? `<div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);margin-bottom:4px">Secondary: ${currentUser.archetype_secondary}</div>` : ''}
    <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-bottom:28px">${currentUser.username || ''}</div>

    <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--dim);margin-bottom:16px;padding-bottom:8px;border-bottom:1px solid var(--rule)">
      Weighting formula <span style="font-weight:400;font-style:italic;letter-spacing:0;text-transform:none"> — edit to customize</span>
    </div>

    <div id="archetype-weights-form">
      ${CATEGORIES.map(cat => {
        const w = weights[cat.key] || 1;
        const pct = Math.round((w / maxWeight) * 100);
        return `<div class="archetype-weight-row">
          <div class="archetype-weight-label">${cat.label}</div>
          <div class="archetype-weight-bar-wrap"><div class="archetype-weight-bar" id="awbar_${cat.key}" style="width:${pct}%"></div></div>
          <input class="archetype-weight-input" type="number" min="1" max="5" value="${w}"
            id="awval_${cat.key}" oninput="previewWeight('${cat.key}', this.value)">
        </div>`;
      }).join('')}
    </div>

    <div class="btn-row" style="margin-top:24px">
      <button class="btn btn-outline" onclick="resetArchetypeWeights()">Reset to archetype</button>
      <button class="btn btn-primary" onclick="saveArchetypeWeights()">Apply weights</button>
    </div>
    <div style="margin-top:20px;padding-top:20px;border-top:1px solid var(--rule);text-align:center">
      <span onclick="logOutUser()" style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1px;color:var(--dim);cursor:pointer;text-decoration:underline">Sign out</span>
    </div>
  `;
  document.getElementById('archetypeModal').classList.add('open');
}

export function previewWeight(key, val) {
  const allInputs = CATEGORIES.map(c => ({
    key: c.key,
    val: parseFloat(document.getElementById('awval_' + c.key)?.value) || 1
  }));
  const max = Math.max(...allInputs.map(x => x.val));
  allInputs.forEach(x => {
    const bar = document.getElementById('awbar_' + x.key);
    if (bar) bar.style.width = Math.round((x.val / max) * 100) + '%';
  });
}

export function resetArchetypeWeights() {
  if (!currentUser || !currentUser.archetype) return;
  const archWeights = ARCHETYPES[currentUser.archetype]?.weights;
  if (!archWeights) return;
  CATEGORIES.forEach(cat => {
    const input = document.getElementById('awval_' + cat.key);
    if (input) input.value = archWeights[cat.key] || 1;
  });
  previewWeight();
}

function detectArchetype(weights) {
  // Returns { primary, secondary } based on cosine similarity to archetype weight vectors
  const keys = CATEGORIES.map(c => c.key);
  const norm = v => { const mag = Math.sqrt(keys.reduce((s,k) => s + (v[k]||1)**2, 0)); return keys.map(k => (v[k]||1)/mag); };
  const userVec = norm(weights);
  const scores = Object.entries(ARCHETYPES).map(([name, arch]) => {
    const archVec = norm(arch.weights);
    const sim = userVec.reduce((s, u, i) => s + u * archVec[i], 0);
    return { name, sim };
  }).sort((a, b) => b.sim - a.sim);
  return { primary: scores[0].name, secondary: scores[1].name };
}

export function saveArchetypeWeights() {
  const newWeights = {};
  CATEGORIES.forEach(cat => {
    const v = parseFloat(document.getElementById('awval_' + cat.key)?.value);
    newWeights[cat.key] = isNaN(v) || v < 1 ? 1 : Math.min(5, v);
  });

  const prevArchetype = currentUser.archetype;
  const detected = detectArchetype(newWeights);

  currentUser.weights = newWeights;
  currentUser.archetype = detected.primary;
  currentUser.archetype_secondary = detected.secondary;

  import('../modules/supabase.js').then(m => {
    m.saveUserLocally();
    m.syncToSupabase().catch(() => {});
  });
  applyUserWeights();
  renderRankings();
  saveToStorage();
  closeArchetypeModal();

  // Show archetype shift notification if it changed
  if (detected.primary !== prevArchetype) {
    window.showToast?.(`${prevArchetype} → ${detected.primary}`, { duration: 5000 });
  }
}

window.logOutUser = async function() {
  if (!confirm('Sign out? Your data is saved to the cloud.')) return;
  const { signOutUser } = await import('./supabase.js');
  await signOutUser();
};

export function closeArchetypeModal(e) {
  if (!e || e.target === document.getElementById('archetypeModal')) {
    document.getElementById('archetypeModal').classList.remove('open');
  }
}
