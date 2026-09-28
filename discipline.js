// ============ DISCIPLINE: done / partial / missed ============
// statuses: done · part · miss · bonus (extra, not planned) · rest (nothing planned) · pend (today, still open) · none (before app start)
const CATS = [['workout', '🏋️', 'Training'], ['meals', '🍽️', 'Food'], ['swim', '🏊', 'Swim'], ['sauna', '🧖', 'sauna'], ['creatine', '💊', 'Creatine'], ['water', '💧', 'Water']];
const REASONS = [['tired', '😴 Tired'], ['busy', '⏰ No time'], ['sick', '🤒 Sick'], ['pain', '🦴 Pain'], ['mood', '😐 No motivation'], ['other', '… Other']];
const REASON_TIP = {
  tired: 'Tiredness is often a sleep problem: aim for 7-9 h and no screens for 1 h before bed. On a tired day train at RIR 3 — a light workout beats a missed one.',
  busy: 'Short on time? Do a “mini workout”: only the first 3-4 exercises, 35 min. Put training in your calendar like a meeting.',
  sick: 'When you’re sick, resting is the right call. First week back: sets −30%, RIR 3.',
  pain: 'Pain is a signal. Swap the painful exercise (Hack Squat ↔ Leg Press) and do the McGill Big 3 every day. If it lasts more than a week, see a physiotherapist.',
  mood: 'Motivation comes after action, not before: promise yourself just 10 minutes. Once you’re at the gym you usually finish the whole workout.',
  other: 'Think about what got in the way and what could change next time.',
};
const SLOT_TIP = [
  'Breakfast: prep overnight oats the evening before — 5 minutes, ready in the morning.',
  'Snack: always keep skyr, cottage cheese, or fruit + walnuts in your bag.',
  'Lunch: meal prep once a week — chicken/turkey for 3 days.',
  'Post-workout: keep a shake in your bag — it’s a quarter of your daily protein.',
  'Dinner: keep it simple — tuna salad or an omelette in 10 minutes.',
];
const PLAN_DEF = { swim: [2, 6], sauna: [0, 2, 4, 6] };
let MISS_OPEN = null;

function since() { if (!S.since) { S.since = TODAY; save(); } return S.since; }
function recPlan() { if (!S.plan) S.plan = { swim: [...PLAN_DEF.swim], sauna: [...PLAN_DEF.sauna] }; return S.plan; }
function stOf(k) { return (S.status = S.status || {})[k] || {}; }

function workoutStatus(k) {
  if (k < since()) return 'none';
  if (k > TODAY) return 'fut';
  const i = dow(fromKey(k)), L = S.logs[k], day = PROGRAMS[L?.prog || S.program].days[i];
  const done = L ? Object.values(L.sets || {}).flat().filter(s => s?.ok).length : 0;
  if (day.rest) return done ? 'bonus' : 'rest';
  const total = day.ex.reduce((a, e) => a + e[1], 0) * (cycle().deload ? 0.5 : 1);
  if (done >= total * 0.7) return 'done';
  if (done > 0) return k < TODAY || stOf(k).workout ? 'part' : 'pend';
  if (stOf(k).workout) return 'miss';
  return k < TODAY ? 'miss' : 'pend';
}
function mealStatus(k) {
  if (k < since()) return 'none';
  if (k > TODAY) return 'fut';
  const E = S.eaten[k] || [], ok = E.filter(x => x === true).length, resolved = [0, 1, 2, 3, 4].every(j => E[j]);
  if (k === TODAY && !resolved) return ok === 5 ? 'done' : 'pend';
  return ok >= 4 ? 'done' : ok >= 2 ? 'part' : 'miss';
}
function recStatus(kind, k) {
  if (k < since()) return 'none';
  if (k > TODAY) return 'fut';
  const R = S.recovery[k] || {}, planned = recPlan()[kind].includes(dow(fromKey(k)));
  if (R[kind]) return planned ? 'done' : 'bonus';
  if (R[kind + 'Miss']) return 'miss';
  if (!planned) return 'rest';
  return k < TODAY ? 'miss' : 'pend';
}
function simpleStatus(kind, k) {
  if (k < since()) return 'none';
  if (k > TODAY) return 'fut';
  if (kind === 'creatine') return S.creatine[k] ? 'done' : k < TODAY ? 'miss' : 'pend';
  const goal = targets()?.water || 12, w = S.water[k] || 0;
  if (w >= goal * 0.8) return 'done';
  if (k === TODAY) return 'pend';
  return w >= goal * 0.4 ? 'part' : 'miss';
}
const XSTAT = {};
function statusOf(cat, k) {
  if (XSTAT[cat]) return XSTAT[cat](k);
  return cat === 'workout' ? workoutStatus(k) : cat === 'meals' ? mealStatus(k) : cat === 'swim' || cat === 'sauna' ? recStatus(cat, k) : simpleStatus(cat, k);
}
const ST_LABEL = { done: 'Done', part: 'Partial', miss: 'Missed', bonus: 'Bonus', rest: 'Not planned', pend: 'Today', none: '—', fut: 'Upcoming' };

function lastDays(n) { return Array.from({ length: n }, (_, i) => dkey(addDays(new Date(), -(n - 1 - i)))); }
function adherence(cat, n = 28) {
  let score = 0, cnt = 0, miss = 0;
  lastDays(n).forEach(k => { const s = statusOf(cat, k); if (['rest', 'pend', 'none'].includes(s)) return; cnt++; if (s === 'done' || s === 'bonus') score++; else if (s === 'part') score += 0.5; else miss++; });
  return { pct: cnt ? Math.round(score / cnt * 100) : null, cnt, miss, score };
}

// ---- actions ----
function markMiss(cat, reason) {
  if (cat === 'swim' || cat === 'sauna') { const R = S.recovery[TODAY] = S.recovery[TODAY] || {}; delete R[cat]; R[cat + 'Miss'] = reason || true; }
  else { S.status = S.status || {}; S.status[TODAY] = Object.assign(stOf(TODAY), { [cat]: reason || 'other' }); if (cat === 'workout') { S.workout = null; stopRest?.(); } }
  MISS_OPEN = null; save(); render(); toast('❌ Logged — it counts in your stats');
}
function unmarkMiss(cat) {
  if (cat === 'swim' || cat === 'sauna') { const R = S.recovery[TODAY] || {}; delete R[cat + 'Miss']; }
  else { const s = stOf(TODAY); delete s[cat]; }
  save(); render();
}
function openMiss(cat) { MISS_OPEN = MISS_OPEN === cat ? null : cat; render(); }
function missChips(cat) {
  if (MISS_OPEN !== cat) return '';
  return `<div class="misspick"><div class="sub">Why?</div><div class="chips">${REASONS.map(([id, l]) => `<button class="chip" onclick="markMiss('${cat}','${id}')">${l}</button>`).join('')}</div></div>`;
}
const reasonLabel = r => (REASONS.find(x => x[0] === r) || [0, ''])[1];

// ---- visuals ----
function weekStrip() {
  const m = monday();
  return `<div class="week">${Array.from({ length: 7 }, (_, i) => {
    const k = dkey(addDays(m, i)), s = workoutStatus(k);
    const dots = ['meals', 'swim', 'sauna', 'creatine'].map(c => { const x = statusOf(c, k); return ['rest', 'none', 'fut'].includes(x) ? '' : `<i class="st-${x}"></i>`; }).join('');
    return `<div class="wd ${k === TODAY ? 'now' : ''}"><small>${DOW_S[i]}</small><b class="st-${s}" title="${ST_LABEL[s]}">${s === 'done' || s === 'bonus' ? '✓' : s === 'miss' ? '✕' : s === 'part' ? '½' : s === 'rest' ? '·' : ''}</b><span>${dots}</span></div>`;
  }).join('')}</div>`;
}
function heatmap(n = 28) {
  const days = lastDays(n);
  return `<div class="heat">${CATS.map(([c, ic, l]) => `<span class="hl" title="${l}">${ic}</span>${days.map(k => { const s = statusOf(c, k); return `<i class="st-${s}" title="${k.slice(5)} · ${l}: ${ST_LABEL[s]}"></i>`; }).join('')}`).join('')}</div>
  <div class="row between sub" style="font-size:11px;margin-top:4px"><span>${days[0].slice(5)}</span><span class="legend"><i class="st-done"></i>done <i class="st-part"></i>partial <i class="st-miss"></i>missed <i class="st-bonus"></i>Bonus</span><span>Today</span></div>`;
}
function adherenceTiles() {
  return `<div class="grid3">${CATS.map(([c, ic, l]) => { const a = adherence(c); const cls = a.pct == null ? '' : a.pct >= 80 ? 'good' : a.pct >= 50 ? 'warn' : 'bad';
    return `<div class="stat adh ${cls}"><span>${ic} ${l}</span><b>${a.pct == null ? '—' : a.pct + '%'}</b><span>${a.cnt ? `${a.miss} missed. / ${a.cnt}` : 'None yet'}</span></div>`; }).join('')}</div>`;
}

// ---- coach: turns misses into advice ----
function coachNotes() {
  const N = [], d28 = lastDays(28).reverse().filter(k => k >= since()), past = d28.filter(k => k < TODAY);
  const W = d28.map(k => [k, workoutStatus(k)]).filter(([, s]) => !['rest', 'pend', 'none'].includes(s));
  let ms = 0; for (const [, s] of W) { if (s === 'miss') ms++; else break; }
  let ds = 0; for (const [, s] of W) { if (s === 'done' || s === 'bonus') ds++; else break; }
  if (ms >= 2) N.push(['bad', `${ms} workouts missed in a row`, 'Don’t try to catch up on everything. Today just the first 3 exercises (~25 min) — the key is not breaking the habit.']);
  else if (ms === 1) N.push(['warn', 'You missed your last workout', 'One miss is nothing — two in a row is a habit. Make the next workout count.']);
  if (ds >= 3) N.push(['good', `🔥 ${ds} workouts in a row`, 'Great rhythm — keep it up.']);
  const byDay = {}; W.filter(([, s]) => s === 'miss').forEach(([k]) => { const i = dow(fromKey(k)); byDay[i] = (byDay[i] || 0) + 1; });
  const md = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0];
  if (md && md[1] >= 2) N.push(['warn', `Most often missed: ${DOW[md[0]]} (${md[1]}×)`, `${program().days[md[0]].t} isn’t working on this day — try it in the morning or swap it with a rest day.`]);
  const R = {}; d28.forEach(k => { const r = stOf(k).workout; if (r) R[r] = (R[r] || 0) + 1; });
  const tr = Object.entries(R).sort((a, b) => b[1] - a[1])[0];
  if (tr && (tr[1] >= 2 || d28.length < 8)) {
    let tip = REASON_TIP[tr[0]] || REASON_TIP.other;
    if (tr[0] === 'tired') { const sl = past.map(k => S.health[k]?.sleep).filter(Boolean); if (sl.length >= 3) tip = `Average sleep ${(sl.reduce((a, b) => a + b) / sl.length).toFixed(1)} h. ` + tip; }
    N.push(['warn', `Reason for missing: ${reasonLabel(tr[0])}${tr[1] > 1 ? ` (${tr[1]}×)` : ''}`, tip]);
  }
  const slot = [0, 0, 0, 0, 0]; let off = 0;
  past.forEach(k => { const E = S.eaten[k] || []; for (let j = 0; j < 5; j++) { if (E[j] !== true) slot[j]++; if (E[j] === 'off') off++; } });
  const sj = slot.indexOf(Math.max(...slot));
  if (slot[sj] >= 3) N.push(['warn', `Most often missed: ${SLOT[sj].toLowerCase()} (${slot[sj]}×)`, SLOT_TIP[sj]]);
  if (off >= 3) N.push(['warn', `Off-plan eating: ${off}× in recent days`, 'Not a problem if you hit your protein and calories. Take 1 ready meal from home — it’s the most effective fix.']);
  const ma = adherence('meals'); if (ma.pct != null && ma.pct < 60 && ma.cnt >= 3) N.push(['bad', `Food: only ${ma.pct}%`, 'At this level you’re short on protein and calories for muscle growth. First step: a post-workout shake every day.']);
  const wd = dow(), rw = recWeek(), pl = recPlan();
  const due = kind => pl[kind].filter(i => i < wd).length;
  if (due('swim') > rw.swims) N.push(['warn', `Swim: this week ${rw.swims}/${pl.swim.length}`, 'Swimming decompresses the spine and trains the heart without load. Don’t miss the next chance.']);
  if (due('sauna') > rw.sauna + 1) N.push(['warn', `Sauna: this week ${rw.sauna}/${pl.sauna.length}`, '2 sauna rounds after training — recovery and heart health. Add 20 minutes at the end of your workout.']);
  const ca = adherence('creatine'); if (ca.pct != null && ca.pct < 70 && ca.cnt >= 4) N.push(['warn', `Creatine: ${ca.pct}%`, 'Creatine only works when taken daily. Put it next to your toothbrush or coffee machine.']);
  const wa = adherence('water'); if (wa.pct != null && wa.pct < 60 && wa.cnt >= 3) N.push(['warn', `Water: ${wa.pct}%`, 'First thing in the morning — 2 glasses of water. A 1-liter bottle at the gym.']);
  const wa4 = adherence('workout'); if (wa4.pct >= 85 && wa4.cnt >= 6) N.push(['good', `Training: ${wa4.pct}% over the last 4 weeks`, 'That’s elite discipline — results will definitely show.']);
  return N;
}
function coachCard(limit) {
  let N = coachNotes(); if (limit) N = N.filter(n => n[0] !== 'good' || N.length <= limit).slice(0, limit);
  if (!N.length) return '';
  return `<div class="card"><b>🧠 Coach</b>${N.map(([l, t, p]) => `<div class="note-${l}"><b>${t}</b><p>${p}</p></div>`).join('')}</div>`;
}
function planPicker() {
  const pl = recPlan();
  const row = kind => `<div class="row" style="gap:4px;flex-wrap:wrap;margin-top:6px">${DOW_S.map((d, i) => `<button class="chip ${pl[kind].includes(i) ? 'on' : ''}" onclick="togglePlan('${kind}',${i})">${d}</button>`).join('')}</div>`;
  return `<div style="margin-top:12px"><div class="sub">🏊 Swim days</div>${row('swim')}<div class="sub" style="margin-top:10px">🧖 Sauna days</div>${row('sauna')}</div>`;
}
function togglePlan(kind, i) { const a = recPlan()[kind]; const j = a.indexOf(i); j >= 0 ? a.splice(j, 1) : a.push(i); a.sort(); save(); render(); }
