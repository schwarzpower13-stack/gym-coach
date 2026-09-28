// ============ FREQUENCY · core model ============
// Score 0-100 built from:  WHO-5 wellbeing (35%) · stress & control (15%) · emotion self-placement (20%)
//                          body signals (15%) · last-24h behaviours (15%)   — weights renormalise if a part is missing.
// The score is placed on a 16-step ladder (names/numbers from D. R. Hawkins' "Map of Consciousness" — used as a
// motivational framework, not as physics). Bands decide the protocol that raises it.

const LADDER = [
  [20, 'Shame', 'Ashamed'], [30, 'Guilt', 'Guilty'], [50, 'Apathy', 'Numb / flat'], [75, 'Grief', 'Sad / heavy'], [100, 'Fear', 'Anxious / afraid'],
  [125, 'Desire', 'Craving / restless'], [150, 'Anger', 'Irritated / angry'], [175, 'Pride', 'Defensive / proud'],
  [200, 'Courage', 'Brave / ready'], [250, 'Neutrality', 'Okay / neutral'], [310, 'Willingness', 'Willing / hopeful'],
  [350, 'Acceptance', 'At ease / accepting'], [400, 'Reason', 'Clear / focused'],
  [500, 'Love', 'Warm / loving'], [540, 'Joy', 'Joyful'], [600, 'Peace', 'Peaceful / still'],
];
const BANDS = {
  ground:  { name: 'Heavy',    color: '#e39a8f', from: 0,  to: 4,  goal: 'Stabilise the body first. Nothing big — just calm, warm, safe.' },
  release: { name: 'Reactive', color: '#e6b27f', from: 5,  to: 7,  goal: 'There is energy here — let it move out of the body instead of into your choices.' },
  build:   { name: 'Rising',   color: '#9fd49a', from: 8,  to: 10, goal: 'You are above the line. Build momentum with one brave action and real gratitude.' },
  expand:  { name: 'Clear',    color: '#86d5c0', from: 11, to: 12, goal: 'Clear mind — the best state to create, learn and train with focus.' },
  share:   { name: 'Radiant',  color: '#b8a8f0', from: 13, to: 15, goal: 'High and calm. Share it, savour it, and protect your sleep.' },
};
const WHO5 = [
  'I have felt cheerful and in good spirits', 'I have felt calm and relaxed', 'I have felt active and vigorous',
  'I woke up feeling fresh and rested', 'My day has been filled with things that interest me',
];
const WHO5_SCALE = ['Not at all', 'A little', 'Some of the time', 'Often', 'Most of the time', 'All the time'];
const BEHAVIOURS = [
  ['sleep', '😴', 'Slept 7+ hours'], ['moved', '🏃', 'Trained or moved 30+ min'], ['fed', '🥗', 'Ate 3+ real meals'], ['light', '☀️', 'Got daylight outside'],
  ['breath', '🌬️', 'Did breathwork or meditation'], ['grat', '🙏', 'Wrote or felt gratitude'], ['people', '🤝', 'Had a real conversation'], ['screen', '📵', 'No doom-scrolling'],
];

const fr = k => ((S.freq = S.freq || {})[k] = S.freq[k] || {});
const frGet = k => (S.freq || {})[k] || {};
// score → ladder: average wellbeing sits around the 200 line; low rungs need genuinely low scores.
// The feeling the user picked anchors the name (35%), so a calm, neutral person is never labelled “Anger”.
const RUNG_AT = [0, 6, 11, 16, 21, 27, 33, 38, 44, 52, 60, 67, 74, 81, 88, 94];
const ladderIdx = (sc, emo) => { let i = 0; RUNG_AT.forEach((t, j) => { if (sc >= t) i = j; }); return emo == null ? i : Math.max(0, Math.min(15, Math.round(i * 0.65 + emo * 0.35))); };
const bandOf = (sc, emo) => { const i = ladderIdx(sc, emo); return Object.entries(BANDS).find(([, b]) => i >= b.from && i <= b.to)[0]; };
const stepOf = (sc, emo) => { const i = ladderIdx(sc, emo), band = bandOf(sc, emo); return { i, lvl: LADDER[i][0], name: LADDER[i][1], feel: LADDER[i][2], band, color: BANDS[band].color }; };

// behaviours we can already see in the app's own data (the user confirms / adds the rest in the scan)
function autoBehaviours(k = TODAY) {
  const h = S.health[k] || {}, sp = (S.spirit || {})[k] || {}, R = S.recovery[k] || {}, E = S.eaten[k] || [];
  return {
    sleep: h.sleep >= 7 || undefined,
    moved: ['done', 'part', 'bonus'].includes(workoutStatus(k)) || h.steps >= 7000 || !!R.swim || undefined,
    fed: E.filter(x => x === true).length >= 3 || undefined,
    breath: !!(sp.breath || sp.static || frGet(k).tune) || undefined,
    grat: !!(sp.journal?.g?.some(Boolean)) || undefined,
  };
}
function bodySignal(k = TODAY, hum) {
  const h = S.health[k] || {}, parts = [];
  if (h.sleep) parts.push(Math.min(1, h.sleep / 8));
  if (k === TODAY) { const rd = readiness(); if (rd) parts.push(rd.sc / 100); }
  const hm = hum || frGet(k).hum; if (hm) parts.push(hm.steady / 100);
  return parts.length ? parts.reduce((a, b) => a + b) / parts.length : null;
}
function computeScore(sc) {
  const parts = [
    [0.35, sc.who ? sc.who.reduce((a, b) => a + b, 0) / 25 : null],
    [0.15, sc.stress != null ? ((10 - sc.stress) + sc.control) / 20 : null],
    [0.20, sc.emo != null ? sc.emo / 15 : null],
    [0.15, bodySignal(TODAY, sc.hum)],
    [0.15, sc.beh ? Object.values(sc.beh).filter(Boolean).length / BEHAVIOURS.length : null],
  ].filter(p => p[1] != null);
  const w = parts.reduce((a, p) => a + p[0], 0);
  return Math.max(1, Math.min(100, Math.round(parts.reduce((a, p) => a + p[0] * p[1], 0) / w * 100)));
}
function lastScan(k = TODAY) { const s = frGet(k).scans; return s?.length ? s[s.length - 1] : null; }
function vibeScore(k = TODAY) {
  const s = lastScan(k); if (s) return s.score;
  const c = frGet(k).check; if (!c) return null; // legacy quick check-in
  return Math.round(Object.values(c).reduce((a, b) => a + b, 0) / Object.values(c).length * 10);
}
function vibeToday() { const sc = vibeScore(); if (sc == null) return null; const st = stepOf(sc, lastScan()?.emo); return { score: sc, name: st.name, lvl: st.lvl, color: st.color, band: st.band }; }
function avgScore(days, offset = 0) { const v = lastDays(days + offset).slice(0, days).map(k => vibeScore(k)).filter(x => x != null); return v.length ? v.reduce((a, b) => a + b) / v.length : null; }

// ---- insights: what actually moves YOUR frequency (with vs without, last 60 days) ----
function insights() {
  const rows = lastDays(60).map(k => [k, lastScan(k)]).filter(([, s]) => s && s.beh);
  const out = [];
  for (const [id, ic, label] of BEHAVIOURS) {
    const on = rows.filter(([, s]) => s.beh[id]).map(([, s]) => s.score), off = rows.filter(([, s]) => !s.beh[id]).map(([, s]) => s.score);
    if (on.length >= 3 && off.length >= 3) { const d = on.reduce((a, b) => a + b) / on.length - off.reduce((a, b) => a + b) / off.length; if (Math.abs(d) >= 3) out.push({ ic, label, d: Math.round(d), n: rows.length }); }
  }
  return out.sort((a, b) => b.d - a.d);
}
function shiftsAll() { return Object.values(S.freq || {}).flatMap(f => f.shifts || []); }
function scanStreak() { let n = 0; for (let i = 0; i < 400; i++) { const k = dkey(addDays(new Date(), -i)); if (lastScan(k)) n++; else if (i === 0) continue; else break; } return n; }
const BADGES = [
  ['first', '🌱', 'First scan', () => Object.values(S.freq || {}).some(f => f.scans?.length)],
  ['line', '🔥', 'Crossed the 200 line', () => Object.values(S.freq || {}).some(f => (f.scans || []).some(s => ladderIdx(s.score, s.emo) >= 8))],
  ['shift', '🌊', 'First shift', () => shiftsAll().length > 0],
  ['jump', '🚀', '+20 in one shift', () => shiftsAll().some(s => s.delta >= 20)],
  ['week', '📅', '7-day scan streak', () => scanStreak() >= 7],
  ['peace', '🕊️', 'Reached Peace', () => Object.values(S.freq || {}).some(f => (f.scans || []).some(s => s.score >= 94))],
  ['thirty', '💎', '30 scans', () => Object.values(S.freq || {}).reduce((a, f) => a + (f.scans?.length || 0), 0) >= 30],
];
// WHO-5 guidance: raw score ≤ 13 (≤ 52%) over time = poor wellbeing → suggest talking to someone
function lowForAWhile() { const v = lastDays(14).map(k => lastScan(k)).filter(Boolean); return v.length >= 7 && v.filter(s => s.who && s.who.reduce((a, b) => a + b) <= 13).length >= 5; }
