// ============ FREQUENCY · model (v3 — measured, not self-reported) ============
// Five dimensions, each 0-1, measured by the phone:
//   breath (25%) · voice (20%) · perception (30%: field of view + opportunity detection) · heart (15%, optional) · recovery (10%, Apple Health)
// Missing dimensions are dropped and weights renormalise. After 5 scans every dimension is also compared with the
// person's own normal (40%), so the index tracks *your* state, not an average person's.
// The 0-100 score is shown as a continuous frequency index on the 20–600 scale of D. R. Hawkins' Map of Consciousness
// (used as a framework and a language, not as a physical measurement).

const LADDER = [
  [20, 'Shame'], [30, 'Guilt'], [50, 'Apathy'], [75, 'Grief'], [100, 'Fear'], [125, 'Desire'], [150, 'Anger'], [175, 'Pride'],
  [200, 'Courage'], [250, 'Neutrality'], [310, 'Willingness'], [350, 'Acceptance'], [400, 'Reason'], [500, 'Love'], [540, 'Joy'], [600, 'Peace'],
];
const RUNG_AT = [0, 6, 11, 16, 21, 27, 33, 38, 44, 52, 60, 67, 74, 81, 88, 94, 100];
const BANDS = {
  ground:  { name: 'Contracted', color: '#e39a8f', from: 0, to: 4,   read: 'Your system is in protection mode. Breath is fast, attention narrows to threats, and the good around you is hard to see.' },
  release: { name: 'Reactive',   color: '#e6b27f', from: 5, to: 7,   read: 'Energy is high but pointed outward — quick to react, slow to notice what is working.' },
  build:   { name: 'Opening',    color: '#9fd49a', from: 8, to: 10,  read: 'Above the line. Your field is widening; you start to see options instead of obstacles.' },
  expand:  { name: 'Clear',      color: '#86d5c0', from: 11, to: 12, read: 'Calm body, wide attention, steady voice. The state for creating, deciding and connecting.' },
  share:   { name: 'Radiant',    color: '#b8a8f0', from: 13, to: 15, read: 'Coherent and open. People and opportunities come easily into view — and toward you.' },
};
const DIMS = {
  breath:     { t: 'Breath',     w: 0.25, unit: m => m ? `${m.rate}/min · ${m.cv < 0.2 ? 'even' : m.cv < 0.35 ? 'uneven' : 'erratic'}` : '' },
  voice:      { t: 'Voice',      w: 0.20, unit: m => m ? `${m.hz} Hz · jitter ${m.jitter}%` : '' },
  perception: { t: 'Perception', w: 0.30, unit: m => m ? `field ${m.field}% · ${m.perMin} finds/min` : '' },
  heart:      { t: 'Heart',      w: 0.15, unit: m => m ? `${m.hr} bpm · HRV ${m.rmssd} ms` : '' },
  recovery:   { t: 'Recovery',   w: 0.10, unit: m => m ? [m.sleep && `sleep ${m.sleep}h`, m.rhr && `RHR ${m.rhr}`].filter(Boolean).join(' · ') : '' },
};

const fr = k => ((S.freq = S.freq || {})[k] = S.freq[k] || {});
const frGet = k => (S.freq || {})[k] || {};
const allScans = () => Object.entries(S.freq || {}).sort().flatMap(([k, f]) => (f.scans || []).map(s => ({ ...s, k })));
const v3Scans = () => allScans().filter(s => s.v === 3);

const ladderIdx = sc => { let i = 0; for (let j = 0; j < 16; j++) if (sc >= RUNG_AT[j]) i = j; return i; };
const bandOf = sc => { const i = ladderIdx(sc); return Object.entries(BANDS).find(([, b]) => i >= b.from && i <= b.to)[0]; };
// continuous index between rungs: 43 → ~190, 58 → ~295 …
function freqIndex(sc) { const i = ladderIdx(sc), a = LADDER[i][0], b = i < 15 ? LADDER[i + 1][0] : 700, f = (sc - RUNG_AT[i]) / (RUNG_AT[i + 1] - RUNG_AT[i]); return Math.round(a + (b - a) * Math.max(0, Math.min(1, f))); }
const stepOf = sc => { const i = ladderIdx(sc), band = bandOf(sc); return { i, lvl: freqIndex(sc), rung: LADDER[i][0], name: LADDER[i][1], band, color: BANDS[band].color }; };

// raw metrics → dimension values; personal calibration once there is history
function dimensionScores(m) {
  const d = {};
  if (m.breath?.ok) d.breath = m.breath.score;
  if (m.voice?.ok) d.voice = m.voice.score;
  if (m.field?.ok || m.smiles?.ok) d.perception = [m.field?.ok && m.field.score, m.smiles?.ok && m.smiles.score].filter(x => x !== false && x != null).reduce((a, b, _, arr) => a + b / arr.length, 0);
  if (m.heart?.ok) d.heart = m.heart.score;
  if (m.recovery?.ok) d.recovery = m.recovery.score;
  const hist = v3Scans().filter(s => s.kind !== 'after');
  if (hist.length >= 5) for (const k of Object.keys(d)) {
    const past = hist.map(s => s.dims?.[k]).filter(x => x != null); if (past.length < 5) continue;
    const med = median(past), spread = Math.max(0.05, sd(past));
    d[k] = clamp01(d[k] * 0.6 + clamp01(0.5 + (d[k] - med) / (spread * 4)) * 0.4);
  }
  return d;
}
function scoreOf(d) { const k = Object.keys(d); if (!k.length) return null; const w = k.reduce((a, x) => a + DIMS[x].w, 0); return Math.max(1, Math.min(100, Math.round(k.reduce((a, x) => a + DIMS[x].w * d[x], 0) / w * 100))); }
function weakest(d) { return Object.entries(d).filter(([k]) => k !== 'recovery' || Object.keys(d).length === 1).sort((a, b) => a[1] - b[1]).map(([k]) => k); }
function metricsLine(m) { return { breath: m.breath?.ok ? m.breath : null, voice: m.voice?.ok ? m.voice : null, perception: m.field?.ok || m.smiles?.ok ? { field: m.field?.width ?? '—', perMin: m.smiles?.perMin ?? '—' } : null, heart: m.heart?.ok ? m.heart : null, recovery: m.recovery?.ok ? m.recovery : null }; }

function lastScan(k = TODAY) { const s = (frGet(k).scans || []).filter(x => x.kind !== 'after'); return s.length ? s[s.length - 1] : null; }
function latestReading(k = TODAY) { const s = frGet(k).scans || []; return s.length ? s[s.length - 1] : null; }
function vibeScore(k = TODAY) { const s = latestReading(k); if (s) return s.score; const c = frGet(k).check; return c ? Math.round(Object.values(c).reduce((a, b) => a + b, 0) / Object.values(c).length * 10) : null; }
function vibeToday() { const sc = vibeScore(); if (sc == null) return null; const st = stepOf(sc); return { score: sc, name: st.name, lvl: st.lvl, color: st.color, band: st.band }; }
function avgScore(days, offset = 0) { const v = lastDays(days + offset).slice(0, days).map(k => vibeScore(k)).filter(x => x != null); return v.length ? v.reduce((a, b) => a + b) / v.length : null; }
function shiftsAll() { return Object.values(S.freq || {}).flatMap(f => f.shifts || []); }
function scanStreak() { let n = 0; for (let i = 0; i < 400; i++) { const k = dkey(addDays(new Date(), -i)); if (lastScan(k)) n++; else if (i === 0) continue; else break; } return n; }

// what moves YOUR frequency — from what the app already knows about each day (nothing to fill in)
function appBehaviours(k) {
  const h = S.health[k] || {}, sp = (S.spirit || {})[k] || {}, R = S.recovery[k] || {}, E = S.eaten[k] || [], y = S.health[dkey(addDays(fromKey(k), -1))] || {};
  return {
    'Slept 7+ hours': (h.sleep || y.sleep || 0) >= 7, 'Trained': ['done', 'part', 'bonus'].includes(workoutStatus(k)), 'Walked 7k+ steps': (h.steps || 0) >= 7000,
    'Sauna or swim': !!(R.sauna || R.swim), 'Breathwork': !!(sp.breath || frGet(k).tune), 'Gratitude journal': !!sp.journal?.g?.some(Boolean), 'Ate 4+ planned meals': E.filter(x => x === true).length >= 4,
  };
}
function insights() {
  const days = lastDays(60).filter(k => lastScan(k)); if (days.length < 6) return [];
  const out = []; const labels = Object.keys(appBehaviours(TODAY));
  for (const l of labels) {
    const on = days.filter(k => appBehaviours(k)[l]).map(k => lastScan(k).score), off = days.filter(k => !appBehaviours(k)[l]).map(k => lastScan(k).score);
    if (on.length >= 3 && off.length >= 3) { const d = mean(on) - mean(off); if (Math.abs(d) >= 3) out.push({ label: l, d: Math.round(freqIndex(Math.min(100, 50 + d)) - freqIndex(50)), n: days.length }); }
  }
  return out.sort((a, b) => b.d - a.d);
}
