/**
 * Namespaced localStorage utilities.
 * Every key is prefixed with `camellia_${ns}_` so different study tabs never share data.
 */

export const nk = (ns, key) => `camellia_${ns}_${key}`;

export const nsGet = (ns, key, fallback = null) => {
  try { return localStorage.getItem(nk(ns, key)) ?? fallback; } catch { return fallback; }
};

export const nsSet = (ns, key, value) => {
  try { localStorage.setItem(nk(ns, key), value); } catch {}
};

export const nsGetJSON = (ns, key, fallback = null) => {
  try {
    const v = localStorage.getItem(nk(ns, key));
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
};

export const nsSetJSON = (ns, key, value) => {
  try { localStorage.setItem(nk(ns, key), JSON.stringify(value)); } catch {}
};

export const nsRemove = (ns, key) => {
  try { localStorage.removeItem(nk(ns, key)); } catch {}
};

/**
 * Record a correct or incorrect answer for a mind-map node.
 * Proficient = net >= 2 correct. Mastered = net >= 5.
 * Three consecutive wrongs decay mastery by 2.
 */
export const updateMastery = (ns, nodeId, isCorrect) => {
  if (!nodeId) return;
  const mastery = nsGetJSON(ns, 'mindmap_mastery', {});
  if (!mastery[nodeId]) mastery[nodeId] = { correct: 0, incorrect: 0, streak: 0 };
  const node = mastery[nodeId];
  if (isCorrect) {
    node.correct += 1;
    node.streak = Math.max(0, node.streak) + 1;
  } else {
    node.incorrect += 1;
    node.streak = Math.min(0, node.streak) - 1;
    if (node.streak <= -3) {
      node.correct = Math.max(0, node.correct - 2);
      node.streak = 0;
    }
  }
  nsSetJSON(ns, 'mindmap_mastery', mastery);
};

export const getMasteryLevel = (masteryMap, nodeId) => {
  if (!masteryMap?.[nodeId]) return null;
  const net = masteryMap[nodeId].correct - masteryMap[nodeId].incorrect;
  if (net >= 5) return 'mastered';
  if (net >= 2) return 'proficient';
  return null;
};
