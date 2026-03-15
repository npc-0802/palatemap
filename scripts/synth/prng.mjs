// ── Seeded PRNG utilities ────────────────────────────────────────────────────
// Deterministic random number generation for reproducible simulations.
// Uses mulberry32 as the core PRNG.

export function mulberry32(seed) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Create a PRNG instance with convenience methods
export function createRng(seed = 42) {
  const raw = mulberry32(seed);

  const rng = {
    // [0, 1)
    random: raw,

    // [min, max)
    range(min, max) {
      return min + raw() * (max - min);
    },

    // Integer in [min, max] inclusive
    int(min, max) {
      return Math.floor(min + raw() * (max - min + 1));
    },

    // Normal distribution via Box-Muller
    normal(mean = 0, std = 1) {
      const u1 = raw();
      const u2 = raw();
      const z = Math.sqrt(-2 * Math.log(u1 || 1e-10)) * Math.cos(2 * Math.PI * u2);
      return mean + z * std;
    },

    // Clamped normal
    clampedNormal(mean, std, min, max) {
      return Math.max(min, Math.min(max, rng.normal(mean, std)));
    },

    // Pick one from array
    pick(arr) {
      return arr[Math.floor(raw() * arr.length)];
    },

    // Pick n unique from array
    pickN(arr, n) {
      const copy = [...arr];
      const result = [];
      const count = Math.min(n, copy.length);
      for (let i = 0; i < count; i++) {
        const idx = Math.floor(raw() * copy.length);
        result.push(copy[idx]);
        copy.splice(idx, 1);
      }
      return result;
    },

    // Weighted pick by probabilities array (parallel to items array)
    weightedPick(items, weights) {
      const total = weights.reduce((a, b) => a + b, 0);
      let r = raw() * total;
      for (let i = 0; i < items.length; i++) {
        r -= weights[i];
        if (r <= 0) return items[i];
      }
      return items[items.length - 1];
    },

    // Shuffle array in place
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(raw() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    },

    // Boolean with probability p
    chance(p) {
      return raw() < p;
    },
  };

  return rng;
}
