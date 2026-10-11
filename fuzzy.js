// fuzzy.js

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const m = [];
  for (let i = 0; i <= b.length; i++) m[i] = [i];
  for (let j = 0; j <= a.length; j++) m[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      m[i][j] = b[i - 1] === a[j - 1]
        ? m[i - 1][j - 1]
        : Math.min(m[i - 1][j - 1] + 1, m[i][j - 1] + 1, m[i - 1][j] + 1);
    }
  }
  return m[b.length][a.length];
}

function similarity(a, b) {
  a = (a || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  b = (b || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!a || !b) return 0;
  const dist = levenshtein(a, b);
  return 1 - dist / Math.max(a.length, b.length);
}

function fuzzyMatch(label, aliasList, threshold) {
  threshold = threshold || 0.72;
  let best = { score: 0, alias: null };
  const words = (label || '').toLowerCase().split(/\s+/).filter(Boolean);
  for (const alias of aliasList) {
    const s1 = similarity(label, alias);
    if (s1 > best.score) best = { score: s1, alias };

    const aliasWords = alias.toLowerCase().split(/\s+/);
    for (let i = 0; i <= words.length - aliasWords.length; i++) {
      const window = words.slice(i, i + aliasWords.length).join(' ');
      const s2 = similarity(window, alias);
      if (s2 > best.score) best = { score: s2, alias };
    }
  }
  return best.score >= threshold ? best : { score: best.score, alias: null };
}

window.fuzzyMatch = fuzzyMatch;
window.similarity = similarity;