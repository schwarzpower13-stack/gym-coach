// ============ STORE ============
const KEY = 'ppl-coach.v1';
const DEF = { program: 'pro', start: null, profile: {}, logs: {}, health: {}, weights: {}, water: {}, creatine: {}, eaten: {}, recovery: {}, kcalAdj: 0, workout: null };
let S;
try { S = Object.assign({}, DEF, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { S = { ...DEF }; }
S.recovery = S.recovery || {};
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { toast('⚠️ Couldn’t save'); } };

// ============ DATES ============
const pad = n => String(n).padStart(2, '0');
const dkey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const dow = (d = new Date()) => (d.getDay() + 6) % 7; // Mon=0
const DOW = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DOW_S = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const TODAY = dkey();
const monday = (d = new Date()) => addDays(new Date(d.getFullYear(), d.getMonth(), d.getDate()), -dow(d));
if (!S.start) { S.start = dkey(monday()); save(); }

function cycle() {
  const days = Math.floor((monday() - fromKey(S.start)) / 864e5);
  const wk = Math.max(0, Math.floor(days / 7));
  return { week: (wk % 6) + 1, deload: wk % 6 === 5, cycle: Math.floor(wk / 6) + 1 };
}

// ============ HELPERS ============
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = n => Math.round(n).toLocaleString('en-US');
let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2600); }
const range = reps => { const m = String(reps).match(/^(\d+)-(\d+)/); return m ? [+m[1], +m[2]] : null; };
const e1rm = (w, r) => w * (1 + r / 30); // Epley

function program() { return PROGRAMS[S.program]; }
function dayPlan(i) {
  const d = program().days[i];
  const c = cycle();
  const ex = d.ex.map(([id, sets, reps, note, v, nm]) => ({ id, sets: c.deload ? Math.max(1, Math.ceil(sets / 2)) : sets, reps, note, v: v || EX[id].v, name: nm || EX[id].n, vert: !!v && Object.values(USER_V).includes(v) }));
  return { ...d, ex };
}

// muscle groups for weekly volume
const GROUPS = [['Chest', 'Chest'], ['delt', 'Shoulders'], ['Shoulder', 'Shoulders'], ['Tricep', 'Triceps'], ['Back', 'Back'], ['Bicep', 'Biceps'], ['Brachialis', 'Biceps'], ['Quad', 'Quads'], ['Hamstring', 'Hamstrings'], ['Glute', 'Glutes'], ['Calv', 'Calves'], ['Abs', 'Core'], ['Core', 'Core'], ['Oblique', 'Core']];
const group = id => (GROUPS.find(([k]) => EX[id].m.includes(k)) || [0, 'Other'])[1];

// last completed sets for exercise before today
function prevSets(id) {
  const keys = Object.keys(S.logs).filter(k => k < TODAY).sort().reverse();
  for (const k of keys) {
    const L = S.logs[k];
    for (const [key, sets] of Object.entries(L.sets || {})) {
      if (key.split(':')[1] === id && sets.some(s => s.ok)) return { date: k, sets: sets.filter(s => s.ok) };
    }
  }
  return null;
}
function suggestion(ex) {
  const p = prevSets(ex.id); const rg = range(ex.reps);
  if (!p) return 'First time — pick a weight where the last 2 reps are "a fight" (RIR 1-2).';
  const w = Math.max(...p.sets.map(s => +s.w || 0));
  if (rg && w > 0 && p.sets.every(s => +s.r >= rg[1])) return `🔥 You hit ${rg[1]}+ in every set — today try ${w + 2.5} kg`;
  if (w > 0) return `Last time: ${p.sets.map(s => `${s.w}×${s.r}`).join(', ')} — Today +1 at least +1 rep`;
  return '';
}

// ============ HEALTH SYNC (iOS Shortcut → URL) ============
function num(v) { if (v == null || v === '') return undefined; const n = numLoose(String(v)); return isFinite(n) ? n : undefined; }
// "9 432", "9,432", "9.432 steps", "82,4 kg", "58 count/min" → number
function numLoose(str, thousandsDot) {
  const m = String(str).match(/-?\d[\d\s  .,']*/); if (!m) return NaN;
  let t = m[0].replace(/[\s  ']/g, '').replace(/[.,]+$/, '');
  if (t.includes(',') && t.includes('.')) t = t.replace(/,/g, '');
  else if (/^\d{1,3}(,\d{3})+$/.test(t)) t = t.replace(/,/g, '');
  else if (thousandsDot && /^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  else t = t.replace(',', '.');
  return parseFloat(t);
}
// sleep: "7 hr 24 min", "7:24:00", "26640" (sec), "444" (min), "7.4"
function hours(str) {
  const s = String(str).toLowerCase();
  const h = s.match(/(\d+(?:[.,]\d+)?)\s*(h|hr|hrs|hour|hours|h|ч)/), mi = s.match(/(\d+)\s*(m|min|mins|minutes|min|мин)\b/);
  if (h || mi) return (h ? numLoose(h[1]) : 0) + (mi ? +mi[1] / 60 : 0);
  const c = s.match(/(\d+):(\d{2})(?::(\d{2}))?/); if (c) return +c[1] + +c[2] / 60;
  let n = numLoose(s); if (!isFinite(n)) return undefined;
  if (n > 1000) n /= 3600; else if (n > 24) n /= 60;
  return n;
}
const HKEYS = { dist: /^(dist|walk|dist)/, flights: /^(flight|floor|flights)/, steps: /^(steps?|steps)/, rhr: /^(rhr|resting)/, hrv: /^hrv/, hr: /^(hr|heart)/, sleep: /^(sleep|sleep)/, kcal: /^(kcal|active|energy)/, w: /^(w|weight|weight|body)/, swim: /^(swim|swim)/ };
function parseHealth(txt) {
  const out = {};
  String(txt).replace(/&/g, '\n').split(/\n|;/).forEach(line => {
    const m = line.match(/^\s*([^:=]+?)\s*[:=]\s*(.*)$/); if (!m || !m[2].trim()) return;
    const k = m[1].trim().toLowerCase(), v = m[2];
    const key = Object.keys(HKEYS).find(x => HKEYS[x].test(k)); if (!key || out[key] !== undefined) return;
    let n = key === 'sleep' ? hours(v) : numLoose(v, key === 'steps' || key === 'swim');
    if (key === 'w' && /lb/i.test(v)) n *= 0.4536;
    if (key === 'swim' && /km/i.test(v)) n *= 1000;
    if (key === 'dist' && /mi/i.test(v)) n *= 1.609;
    if (key === 'dist' && /(^|d|s)m/.test(v) && !/km/i.test(v)) n /= 1000;
    if (isFinite(n) && n > 0) out[key] = key === 'sleep' || key === 'w' || key === 'dist' ? +n.toFixed(1) : Math.round(n);
  });
  return out;
}
function applyHealth(h, date = TODAY) {
  const n = Object.keys(h).length; if (!n) return 0;
  const { swim, ...rest } = h;
  S.health[date] = Object.assign(S.health[date] || {}, rest, { t: Date.now() });
  if (rest.w) S.weights[date] = rest.w;
  if (swim > 0) { const R = S.recovery[date] = S.recovery[date] || {}; R.swim = Object.assign(R.swim || {}, { m: swim, src: 'health' }); }
  save(); return n;
}
function importHealth() {
  const src = location.hash.startsWith('#sync') ? location.hash.slice(location.hash.indexOf('?') + 1) : location.search.slice(1);
  if (!src) return;
  const q = new URLSearchParams(src);
  const txt = q.get('d') ?? [...q.entries()].map(([k, v]) => k + '=' + v).join('\n');
  const n = applyHealth(parseHealth(txt), q.get('date') || TODAY);
  history.replaceState(null, '', location.pathname);
  setTimeout(() => toast(n ? `❤️ Apple Health synced (${n} metrics)` : '⚠️ Data arrived but couldn’t be read — Health. → Paste'), 300);
}
function pasteHealth(txt) {
  const n = applyHealth(parseHealth(txt));
  if (n) { render(); toast(`❤️ Saved: ${n} metrics`); } else toast('⚠️ No data found in this text');
}
async function pasteFromClipboard() {
  try { pasteHealth(await navigator.clipboard.readText()); } catch { toast('Paste it manually into the field below'); $('#hpaste')?.focus(); }
}
function baseline(field, days = 7) {
  const vals = [];
  for (let i = 1; i <= days; i++) { const v = S.health[dkey(addDays(new Date(), -i))]?.[field]; if (v) vals.push(v); }
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}
function readiness() {
  const h = S.health[TODAY]; if (!h || (!h.sleep && !h.rhr && !h.hrv)) return null;
  let score = 0, wsum = 0; const why = [];
  if (h.sleep) { const s = Math.min(1, h.sleep / 8); score += s * 40; wsum += 40; if (h.sleep < 6.5) why.push(`Only slept ${h.sleep} h`); }
  const brhr = baseline('rhr');
  if (h.rhr && brhr) { const d = h.rhr - brhr; const s = Math.max(0, Math.min(1, 1 - d / 10)); score += s * 40; wsum += 40; if (d >= 4) why.push(`resting HR +${Math.round(d)} above normal`); }
  const bhrv = baseline('hrv');
  if (h.hrv && bhrv) { const r = h.hrv / bhrv; const s = Math.max(0, Math.min(1, (r - 0.7) / 0.4)); score += s * 20; wsum += 20; if (r < 0.85) why.push('HRV below normal'); }
  if (!wsum) return null;
  const sc = Math.round(score / wsum * 100);
  const lvl = sc >= 75 ? ['Ready for a PR 💪', 'good', 'Train as planned and push for progress..'] : sc >= 55 ? ['Normal day', 'warn', 'Train as planned, RIR 2 — don’t go to failure.'] : ['Recovery day', 'bad', 'per exercise −1 set, RIR 3. or just a walk + McGill Big 3.'];
  return { sc, t: lvl[0], cls: lvl[1], tip: lvl[2], why };
}

// ============ NUTRITION MATH ============
function targets() {
  const p = S.profile; if (!p.w || !p.h || !p.age) return null;
  const bmr = 10 * p.w + 6.25 * p.h - 5 * p.age + (p.sex === 'f' ? -161 : 5); // Mifflin-St Jeor
  const tdee = bmr * (+p.act || 1.55);
  const goal = p.goal || 'bulk';
  const mult = goal === 'bulk' ? 1.10 : goal === 'cut' ? 0.80 : 1.0;
  const kcal = Math.round((tdee * mult + (S.kcalAdj || 0)) / 10) * 10;
  const protein = Math.round(p.w * (goal === 'cut' ? 2.2 : 2.0));
  const fat = Math.round(p.w * 0.9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { bmr: Math.round(bmr), tdee: Math.round(tdee), kcal, protein, fat, carbs, water: Math.round(p.w * 37 / 250) };
}
function weightSeries(days = 60) {
  const all = { ...S.weights };
  const out = [];
  for (let i = days - 1; i >= 0; i--) { const k = dkey(addDays(new Date(), -i)); if (all[k]) out.push([k, all[k]]); }
  return out;
}
function weeklyRate() {
  const avg = (a, b) => { const v = []; for (let i = a; i < b; i++) { const w = S.weights[dkey(addDays(new Date(), -i))]; if (w) v.push(w); } return v.length >= 3 ? v.reduce((x, y) => x + y) / v.length : null; };
  const now = avg(0, 7), prev = avg(7, 14);
  if (!now || !prev) return null;
  return { now, prev, pct: (now - prev) / prev * 100 };
}
function kcalAdvice() {
  const r = weeklyRate(); const g = S.profile.goal || 'bulk'; if (!r) return null;
  const lo = g === 'bulk' ? 0.2 : g === 'cut' ? -1.0 : -0.15, hi = g === 'bulk' ? 0.6 : g === 'cut' ? -0.4 : 0.15;
  if (r.pct < lo) return { r, d: +150, t: `weight ${r.pct.toFixed(2)}%/week — slower than the goal. +150 kcal.` };
  if (r.pct > hi) return { r, d: -150, t: `weight ${r.pct.toFixed(2)}%/week — too fast (fat). −150 kcal.` };
  return { r, d: 0, t: `weight ${r.pct >= 0 ? '+' : ''}${r.pct.toFixed(2)}%/week — you’re right in the ideal zone ✅` };
}
function mealDay(i) {
  const ids = MEAL_DAYS[i];
  const sum = ids.reduce((a, id) => a + MEALS[id].k, 0);
  const t = targets();
  const f = t ? Math.min(1.8, Math.max(0.6, Math.round(t.kcal / sum * 20) / 20)) : 1;
  return { ids, f, sum };
}

// ============ CHARTS ============
function lineChart(pts, { color = 'var(--acc)', h = 120, fmtY = v => v } = {}) {
  if (pts.length < 2) return '<div class="sub" style="padding:20px 0;text-align:center">Not enough data yet</div>';
  const W = 320, P = 6, ys = pts.map(p => p[1]); let mn = Math.min(...ys), mx = Math.max(...ys); if (mn === mx) { mn -= 1; mx += 1; }
  const x = i => P + i * (W - 2 * P) / (pts.length - 1), y = v => h - 18 - (v - mn) / (mx - mn) * (h - 30);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p[1]).toFixed(1)}`).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${h}" preserveAspectRatio="none"><path d="${d}" fill="none" stroke="${color}" stroke-width="2.5" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>${pts.map((p, i) => `<circle cx="${x(i)}" cy="${y(p[1])}" r="2.5" fill="${color}"/>`).join('')}<text x="${P}" y="${h - 3}" fill="var(--dim)" font-size="10">${pts[0][0].slice(5)}</text><text x="${W - P}" y="${h - 3}" fill="var(--dim)" font-size="10" text-anchor="end">${pts.at(-1)[0].slice(5)} · ${fmtY(pts.at(-1)[1])}</text></svg>`;
}
function barChart(pts, { color = 'var(--acc)', h = 120, goal } = {}) {
  const W = 320, n = pts.length, mx = Math.max(goal || 0, ...pts.map(p => p[1] || 0), 1), bw = (W - 8) / n;
  const gy = goal ? h - 18 - goal / mx * (h - 26) : null;
  return `<svg class="chart" viewBox="0 0 ${W} ${h}" preserveAspectRatio="none">${pts.map((p, i) => { const bh = (p[1] || 0) / mx * (h - 26); return `<rect x="${4 + i * bw + 2}" y="${h - 18 - bh}" width="${bw - 4}" height="${bh}" rx="3" fill="${goal && p[1] >= goal ? 'var(--good)' : color}" opacity="${p[1] ? 1 : .15}"/>`; }).join('')}${gy ? `<line x1="0" x2="${W}" y1="${gy}" y2="${gy}" stroke="var(--dim)" stroke-dasharray="4 4"/>` : ''}${pts.map((p, i) => i % Math.ceil(n / 7) === 0 ? `<text x="${4 + i * bw + bw / 2}" y="${h - 4}" fill="var(--dim)" font-size="10" text-anchor="middle">${p[0].slice(8)}</text>` : '').join('')}</svg>`;
}
function ring(pct, label, color = 'var(--acc)') {
  const r = 44, c = 2 * Math.PI * r;
  return `<div class="ring"><svg width="104" height="104"><circle cx="52" cy="52" r="${r}" stroke="var(--card2)" stroke-width="10" fill="none"/><circle cx="52" cy="52" r="${r}" stroke="${color}" stroke-width="10" fill="none" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - Math.min(1, pct))}"/></svg><b>${label}</b></div>`;
}

// ============ VIEWS ============
let TAB = 'today', SEL_DAY = dow(), MEAL_SEL = dow(), OPEN = new Set();
const app = $('#app');

function render() {
  document.querySelectorAll('nav button').forEach(b => b.classList.toggle('on', b.dataset.tab === TAB));
  const NAV = { health: 'stats', report: 'food' };
  document.querySelectorAll('nav button').forEach(b => b.classList.toggle('on', b.dataset.tab === (NAV[TAB] || TAB)));
  app.innerHTML = ({ today: vToday, train: vTrain, food: () => segmented('food', { today: '📸 Today', menu: '🍽️ Menu', guide: '📘 Guide' }, vFood()), health: vHealth, stats: () => segmented('stats', { overview: '🌿 Discipline', strength: '💪 Strength', settings: '⚙️ Settings' }, vStats()), spirit: vMind, learn: vLearn, report: vReport })[TAB]();
  if (TAB === 'food' || TAB === 'today') hydratePhotos();
  if (TAB === 'train') tickWorkout();
}
function go(tab, extra) { TAB = tab; Object.assign(window, extra || {}); render(); scrollTo(0, 0); }

// ---------- TODAY ----------
// ---------- DAILY RITUALS (spirit + learning) ----------
function ritualsCard() {
  const items = [
    ['breath', '🌬️', 'DMT Breathing', 'spirit', 'morning'],
    ['static', '🧍', `Static pose ${staticTarget()} min`, 'spirit', ''],
    ['lang', '🗣️', `Words · ${queueOf('pt').due.length + queueOf('pt').newLeft + queueOf('en').due.length + queueOf('en').newLeft} left`, 'learn', ''],
    ['journal', '📖', 'Gratitude + manifestation', 'spirit', 'before bed'],
  ];
  return `<div class="card"><b>✨ Daily rituals</b>${items.map(([c, ic, t, tab, when]) => { const s = statusOf(c, TODAY);
    return `<button class="ritrow st-row-${s}" onclick="go('${tab}')"><i class="st-${s}">${s === 'done' ? '✓' : s === 'miss' ? '✕' : s === 'part' ? '½' : ''}</i><span>${ic} ${t}</span><small>${when}</small><em>›</em></button>`; }).join('')}</div>`;
}
// ---------- SWIM & SAUNA ----------
function recWeek(offset = 0) {
  const a = addDays(monday(), -7 * offset); let swimMin = 0, swimM = 0, swims = 0, sauna = 0, saunaMin = 0;
  for (let i = 0; i < 7; i++) { const R = S.recovery[dkey(addDays(a, i))]; if (!R) continue; if (R.swim) { swims++; swimMin += R.swim.min || 0; swimM += R.swim.m || 0; } if (R.sauna) { sauna++; saunaMin += R.sauna.min || 0; } }
  return { swims, swimMin, swimM, sauna, saunaMin };
}
function recoveryCard() {
  const R = S.recovery[TODAY] || {}, w = recWeek();
  return `<div class="card"><div class="row between"><div class="sub">Swim & sauna · this week</div><span class="sub">Goal: 🏊 ${recPlan().swim.length} · 🧖 ${recPlan().sauna.length}</span></div>
    <div class="grid2" style="margin-top:8px">
      <div class="stat"><span>🏊 Swim</span><b>${w.swims}×</b><span>${w.swimMin} min${w.swimM ? ' · ' + fmt(w.swimM) + 'm' : ''}</span></div>
      <div class="stat"><span>🧖 Sauna</span><b>${w.sauna}×</b><span>${w.saunaMin} min</span></div>
    </div>
    ${['swim', 'sauna'].map(kind => { const st = recStatus(kind, TODAY), done = R[kind], ic = kind === 'swim' ? '🏊 Swim' : '🧖 Sauna';
      const lbl = done ? '✅ ' + ic + ' ' + (done.min ? done.min + 'min' : '') + (done.m ? ' ' + done.m + 'm' : '') : ic + (st === 'pend' ? ' — planned today' : ' today');
      return `<div class="recrow rec-${st}"><button class="btn sm ${done ? '' : st === 'miss' ? '' : 'acc'}" style="flex:1" onclick="${kind === 'swim' ? 'logSwim()' : 'logSauna()'}">${st === 'miss' ? '✕ ' + ic + ' Missed' : lbl}</button>
        ${st === 'miss' ? `<button class="btn sm" onclick="unmarkMiss('${kind}')">↩︎</button>` : !done ? `<button class="btn sm ghost-bad" onclick="markMiss('${kind}')" aria-label="Couldn’t make it">✕</button>` : ''}</div>`; }).join('')}
  </div>`;
}
function logSwim() {
  const R = S.recovery[TODAY] = S.recovery[TODAY] || {};
  const min = prompt('Swim — how many minutes? (0 = delete)', R.swim?.min || 30); if (min === null) return;
  if (+min === 0) { delete R.swim; save(); return render(); }
  const m = prompt('Distance in meters (optional):', R.swim?.m || '');
  R.swim = { min: +min || 0, m: +m || R.swim?.m || 0 }; delete R.swimMiss; save(); render(); toast('🏊 Swim logged');
}
function logSauna() {
  const R = S.recovery[TODAY] = S.recovery[TODAY] || {};
  const min = prompt('sauna — total minutes? (0 = delete)', R.sauna?.min || 30); if (min === null) return;
  if (+min === 0) { delete R.sauna; save(); return render(); }
  R.sauna = { min: +min || 0 }; delete R.saunaMiss; save(); render(); toast('🧖 Sauna logged · drink 0.5-1 L water');
}
function swimPlan() {
  return `<h2>🏊 ${SWIM_PLAN.t}</h2><div class="card"><div class="sub">~${SWIM_PLAN.min} min · ${SWIM_PLAN.m}m</div>
    <ol class="steps" style="margin-top:8px">${SWIM_PLAN.sets.map(([d, t]) => `<li><b>${d}</b> — ${esc(t)}</li>`).join('')}</ol>
    ${SWIM_PLAN.rules.map(r => `<div class="spine">🦴 ${esc(r)}</div>`).join('')}
    ${SWIM_PLAN.v.map(([id, t]) => `<div class="note" style="margin-top:10px">▶ ${esc(t)}</div>${video(id)}`).join('')}</div>`;
}
function saunaProtocol() {
  return `<h2>🧖 Sauna protocol</h2><div class="card">${SAUNA_PROTOCOL.steps.map(([e, t, p]) => `<div class="why"><div class="e">${e}</div><div><b>${t}</b><p>${p}</p></div></div>`).join('')}<p class="note">🔬 ${SAUNA_PROTOCOL.why}</p></div>`;
}
function toggleCreatine() { S.creatine[TODAY] = !S.creatine[TODAY]; save(); render(); }
function addWater(n) { S.water[TODAY] = Math.max(0, (S.water[TODAY] || 0) + n); save(); render(); }

// ---------- TRAIN ----------
function vTrain() {
  const plan = dayPlan(SEL_DAY), c = cycle(), isToday = SEL_DAY === dow();
  const w = S.workout?.date === TODAY;
  const L = S.logs[TODAY];
  return `
  <div class="wbar ${w && isToday ? 'on' : ''} row between"><div><div class="sub">Workout in progress</div><b id="wTime" style="font-size:20px;font-variant-numeric:tabular-nums">0:00</b></div><button class="btn sm acc" onclick="finishWorkout()">Finish ✓</button></div>
  <h1>Training</h1>
  <div class="seg" style="margin:10px 0">${Object.entries(PROGRAMS).map(([k, p]) => `<button class="${S.program === k ? 'on' : ''}" onclick="S.program='${k}';save();render()">${esc(p.name)}</button>`).join('')}</div>
  <div class="sub" style="margin-bottom:6px">${esc(program().sub)}</div>
  <div class="days">${program().days.map((d, k) => `<button class="${k === SEL_DAY ? 'on' : ''} ${k === dow() ? 'today' : ''}" onclick="SEL_DAY=${k};render()"><small>${DOW_S[k]}</small><b style="font-size:13px">${esc(d.t)}</b></button>`).join('')}</div>
  ${c.deload && !plan.rest ? '<div class="spine">🔄 Deload week: sets halved, same weight, RIR 3. next week a new cycle starts.</div>' : ''}
  <h2 style="margin-top:8px">${DOW[SEL_DAY]} — ${esc(plan.t)} <span class="sub">· ${esc(plan.f)}</span></h2>
  ${plan.rest ? restDay() : `
    ${S.program === 'pro' ? `<div class="sub" style="margin:6px 0">🔥 Warm-up (~8 min): 5 min bike/treadmill + McGill Big 3</div>${WARMUP.map((e, k) => exCard({ id: e[0], sets: e[1], reps: e[2], note: e[3], v: EX[e[0]].v, name: EX[e[0]].n }, 'w' + k, false)).join('')}<div class="sub" style="margin:14px 0 6px">💪 Working sets</div>` : ''}
    ${plan.ex.map((e, k) => exCard(e, k, true, L)).join('')}
    ${isToday && !w ? `<button class="btn acc block" style="margin-top:12px" onclick="startWorkout()">Start workout ▶</button>` : ''}
    ${!isToday ? `<p class="note" style="text-align:center">Sets are logged to today’s date.</p>` : ''}
    <div class="card"><b>After the workout 🧖</b><p class="note">sauna 2 rounds × 10-15 min or 20 min easy swim — recovery and heart health. No sauna before training.</p><div class="row" style="gap:8px"><button class="btn sm" onclick="logSauna()">🧖 Sauna +</button><button class="btn sm" onclick="logSwim()">🏊 Swim +</button></div></div>
    ${S.program === 'pro' ? proWhy() : ''}
  `}`;
}
function restDay() {
  return `<div class="card"><h3>Active recovery 🏊 🧖</h3><ul class="cues" style="margin-top:8px"><li>Swim 30 min (plan below)</li><li>sauna 2-3 rounds</li><li>8-10 k steps</li><li>McGill Big 3 — 6 min</li><li>Sleep 8+ h</li></ul></div>
  ${recoveryCard()}${swimPlan()}${saunaProtocol()}
  <h2>McGill Big 3</h2>${WARMUP.map((e, k) => exCard({ id: e[0], sets: e[1], reps: e[2], note: e[3], v: EX[e[0]].v, name: EX[e[0]].n }, 'r' + k, false)).join('')}`;
}
function proWhy() {
  return `<h2>Why PRO Plan?</h2><div class="card">${PRO_WHY.map(([e, t, p]) => `<div class="why"><div class="e">${e}</div><div><b>${t}</b><p>${p}</p></div></div>`).join('')}</div>`;
}
function exCard(e, k, loggable, L) {
  const X = EX[e.id], key = `${k}:${e.id}`, open = OPEN.has(key);
  const sets = (L?.sets?.[key]) || [];
  const done = loggable && sets.filter(s => s.ok).length >= e.sets;
  const p = loggable ? prevSets(e.id) : null;
  const rows = loggable ? Array.from({ length: e.sets }, (_, j) => {
    const s = sets[j] || {}; const pv = p?.sets[j];
    return `<tr class="${s.ok ? 'ok' : ''}"><td>${j + 1}</td><td class="prev">${pv ? `${pv.w}×${pv.r}` : '—'}</td><td><input inputmode="decimal" placeholder="${pv?.w || 'kg'}" value="${s.w ?? ''}" onchange="setVal('${key}',${j},'w',this.value)"></td><td><input inputmode="numeric" placeholder="${pv?.r || range(e.reps)?.[1] || ''}" value="${s.r ?? ''}" onchange="setVal('${key}',${j},'r',this.value)"></td><td><button class="ck" aria-label="Set done" onclick="checkSet('${key}',${j},${range(e.reps)?.[0] <= 8 ? 150 : 90})"></button></td></tr>`;
  }).join('') : '';
  return `<div class="ex ${open ? 'open' : ''} ${done ? 'done' : ''}" id="ex-${key}">
    <button class="ex-h" onclick="toggleEx('${key}')"><div class="ex-n">${done ? '✓' : typeof k === 'number' ? k + 1 : '•'}</div><div class="ex-t"><b>${esc(e.name)}</b><span>${esc(X.m)}${X.s ? ' · ⚠️' : ''}</span></div><div class="ex-sr">${e.sets}×${esc(e.reps)}</div></button>
    <div class="ex-b">
      ${open ? video(e.v, e.vert) : ''}
      ${e.note ? `<div class="note">📝 ${esc(e.note)}</div>` : ''}
      <ul class="cues">${X.c.map(c => `<li>${esc(c)}</li>`).join('')}</ul>
      ${X.s ? `<div class="spine">🦴 ${esc(X.s)}</div>` : ''}
      ${loggable ? `<div class="sug">${esc(suggestion(e))}</div><table class="sets"><tr><th>#</th><th>Prev</th><th>kg</th><th>reps</th><th></th></tr>${rows}</table>` : ''}
    </div></div>`;
}
function video(id, vert) {
  return `<div class="vid ${vert ? 'vert' : ''}" data-v="${id}"><img loading="lazy" src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt=""><button class="play" aria-label="Play video" onclick="playVid(this.parentNode)"><i></i></button></div>`;
}
function playVid(el) {
  const id = el.dataset.v;
  el.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&rel=0&modestbranding=1&loop=1&playlist=${id}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
}
function toggleEx(key) { OPEN.has(key) ? OPEN.delete(key) : OPEN.add(key); const el = document.getElementById('ex-' + key); const L = S.logs[TODAY]; const [k, id] = key.split(':');
  if (/^\d+$/.test(k)) { const e = dayPlan(SEL_DAY).ex[+k]; el.outerHTML = exCard(e, +k, true, L); }
  else { const src = WARMUP[+k.slice(1)]; el.outerHTML = exCard({ id, sets: src[1], reps: src[2], note: src[3], v: EX[id].v, name: EX[id].n }, k, false); }
}
function logFor() {
  if (!S.logs[TODAY]) S.logs[TODAY] = { prog: S.program, day: SEL_DAY, sets: {} };
  return S.logs[TODAY];
}
function setVal(key, j, f, v) {
  const L = logFor(); L.sets[key] = L.sets[key] || []; L.sets[key][j] = L.sets[key][j] || {}; L.sets[key][j][f] = v === '' ? '' : +v; save();
}
function checkSet(key, j, rest) {
  const L = logFor(); L.sets[key] = L.sets[key] || []; const s = L.sets[key][j] = L.sets[key][j] || {};
  const row = document.querySelectorAll(`#ex-${CSS.escape(key)} tr`)[j + 1];
  const ins = row.querySelectorAll('input');
  const before = L.sets[key][j - 1] || {}; // empty fields: reuse the previous set, then last session
  if (s.w === undefined || s.w === '') s.w = +ins[0].value || before.w || +ins[0].placeholder || 0;
  if (s.r === undefined || s.r === '') s.r = +ins[1].value || before.r || +ins[1].placeholder || 0;
  ins[0].value = s.w || ''; ins[1].value = s.r || '';
  s.ok = !s.ok;
  if (s.ok && !S.workout) startWorkout(true);
  save();
  const [k] = key.split(':'); const e = dayPlan(SEL_DAY).ex[+k];
  // update in place so a playing video keeps playing
  row.classList.toggle('ok', s.ok);
  const card = document.getElementById('ex-' + key), done = L.sets[key].filter(x => x?.ok).length >= e.sets;
  card.classList.toggle('done', done); card.querySelector('.ex-n').textContent = done ? '✓' : +k + 1;
  if (s.ok) { startRest(rest); const p = prevSets(e.id); const best = p ? Math.max(...p.sets.map(x => e1rm(+x.w, +x.r))) : 0; if (p && e1rm(s.w, s.r) > best * 1.001) toast(`🏆 New PR! e1RM ${Math.round(e1rm(s.w, s.r))} kg`); }
}

// workout timer + wake lock
let wakeLock = null, wTimer;
async function startWorkout(silent) {
  if (S.workout?.date !== TODAY) { S.workout = { date: TODAY, start: Date.now() }; save(); }
  try { wakeLock = await navigator.wakeLock?.request('screen'); } catch { }
  if (!silent) render();
}
function tickWorkout() {
  clearInterval(wTimer);
  if (S.workout?.date !== TODAY) return;
  const upd = () => { const el = $('#wTime'); if (!el) return clearInterval(wTimer); const s = Math.floor((Date.now() - S.workout.start) / 1000); el.textContent = `${Math.floor(s / 60)}:${pad(s % 60)}`; };
  upd(); wTimer = setInterval(upd, 1000);
}
function finishWorkout() {
  const L = logFor(); L.min = Math.round((Date.now() - S.workout.start) / 60000);
  const sets = Object.values(L.sets).flat().filter(s => s.ok);
  const vol = sets.reduce((a, s) => a + (+s.w || 0) * (+s.r || 0), 0);
  S.workout = null; save(); wakeLock?.release?.(); wakeLock = null; stopRest();
  toast(`✅ ${L.min} min · ${sets.length} sets · ${fmt(vol)} kg volume`);
  go('today');
}
// rest timer
let restEnd = 0, restInt;
function startRest(sec) {
  restEnd = Date.now() + sec * 1000; $('#rest').classList.add('on'); clearInterval(restInt);
  const upd = () => { const s = Math.ceil((restEnd - Date.now()) / 1000); if (s <= 0) { beep(); stopRest(); toast('⏱️ Next set!'); return; } $('#restT').textContent = `${Math.floor(s / 60)}:${pad(s % 60)}`; };
  upd(); restInt = setInterval(upd, 250);
}
function stopRest() { clearInterval(restInt); $('#rest').classList.remove('on'); }
$('#restPlus').onclick = () => restEnd += 15000;
$('#restMinus').onclick = () => restEnd -= 15000;
$('#restSkip').onclick = stopRest;
let actx;
function beep() {
  try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); [0, .25, .5].forEach(t => { const o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = 880; o.connect(g); g.connect(actx.destination); g.gain.setValueAtTime(.3, actx.currentTime + t); g.gain.exponentialRampToValueAtTime(.001, actx.currentTime + t + .2); o.start(actx.currentTime + t); o.stop(actx.currentTime + t + .2); }); } catch { }
  navigator.vibrate?.([200, 100, 200]);
}

// ---------- FOOD ----------
function vFood() {
  const t = targets(), p = S.profile, md = mealDay(MEAL_SEL), dateKey = MEAL_SEL === dow() ? TODAY : null;
  const eaten = dateKey ? (S.eaten[TODAY] || []) : [];
  const got = md.ids.reduce((a, id, k) => { if (eaten[k] !== true) return a; const m = MEALS[id]; return { k: a.k + m.k * md.f, p: a.p + m.p * md.f }; }, { k: 0, p: 0 });
  const adv = kcalAdvice();
  return `
  <h1>Food</h1>
<!--SEG:today-->  ${timeline(TODAY)}
  <div class="sub">Built on ISSN guidelines and modern sports-nutrition science</div>
  ${t ? `
  <div class="card">
    <div class="row between"><div><div class="sub">Daily goal (${p.goal === 'cut' ? 'Fat loss' : p.goal === 'keep' ? 'Maintenance' : 'Lean bulk'})</div><b style="font-size:30px">${fmt(t.kcal)} <span class="sub">kcal</span></b></div><button class="btn sm" onclick="editProfile()">✏️ Profile</button></div>
    <div class="grid3" style="margin-top:10px">
      <div class="stat"><span>Protein</span><b>${t.protein}g</b></div>
      <div class="stat"><span>Carbs.</span><b>${t.carbs}g</b></div>
      <div class="stat"><span>fat</span><b>${t.fat}g</b></div>
    </div>
    <div class="note">BMR ${fmt(t.bmr)} · TDEE ${fmt(t.tdee)}${S.kcalAdj ? ` · adjustment ${S.kcalAdj > 0 ? '+' : ''}${S.kcalAdj}` : ''}</div>
    ${dateKey ? `<div style="margin-top:10px"><div class="row between sub"><span>Eaten: ${fmt(got.k)} kcal · ${Math.round(got.p)}g protein</span><span>${Math.round(got.k / t.kcal * 100)}%</span></div><div class="bar"><i style="width:${Math.min(100, got.k / t.kcal * 100)}%"></i></div></div>` : ''}
    ${adv ? `<div class="spine" style="margin-top:10px;color:${adv.d ? 'var(--warn)' : 'var(--good)'};background:var(--card2)">📊 ${adv.t}${adv.d ? ` <button class="btn sm acc" style="margin-left:6px" onclick="S.kcalAdj=(S.kcalAdj||0)+${adv.d};save();render()">Apply</button>` : ''}</div>` : `<div class="note">⚖️ Weigh yourself in the morning, 2 weeks the app will adjust your calories automatically.</div>`}
  </div>
  <div class="card"><div class="row between"><div class="sub">💧 Water · 250 ml glass</div><b>${S.water[TODAY] || 0}/${t.water} glasses</b></div><div class="water">${Array.from({ length: Math.min(t.water, 16) }, (_, k) => `<button class="${k < (S.water[TODAY] || 0) ? 'f' : ''}" onclick="S.water[TODAY]=${k + 1 === (S.water[TODAY] || 0) ? k : k + 1};save();render()" aria-label="glasses ${k + 1}"></button>`).join('')}</div></div>
  ` : profileForm()}

<!--SEG:menu-->
  <h2>Menu</h2>
  <div class="days">${MEAL_DAYS.map((_, k) => `<button class="${k === MEAL_SEL ? 'on' : ''} ${k === dow() ? 'today' : ''}" onclick="MEAL_SEL=${k};render()"><small>${DOW_S[k]}</small><b style="font-size:13px">Day ${k + 1}</b></button>`).join('')}</div>
  ${t ? `<div class="sub">Portions are scaled to your goal: ×${md.f.toFixed(2)} (${fmt(md.sum * md.f)} kcal)</div>` : ''}
  ${md.ids.map((id, k) => mealCard(id, k, md.f, dateKey ? eaten[k] : undefined, !!dateKey)).join('')}

<!--SEG:guide-->
  <h2>Professional rules</h2>
  <div class="card">${NUTRI_RULES.map(([e, tt, pp]) => `<div class="why"><div class="e">${e}</div><div><b>${tt}</b><p>${pp}</p></div></div>`).join('')}</div>
  <p class="note">Photos: TheMealDB and Wikimedia Commons (CC BY / CC BY-SA authors). Calories are approximate. Because of osteochondrosis, check with a doctor/physiotherapist before starting a new program.</p>`;
}
function mealCard(id, k, f, state, canEat) {
  const isEaten = state === true, bad = state === 'skip' || state === 'off';
  const m = MEALS[id];
  const g = v => v == null ? '' : `${Math.round(v * f / 5) * 5 || Math.round(v * f)}g `;
  return `<div class="meal ${isEaten ? 'eaten' : bad ? 'missed' : ''}"><img loading="lazy" src="img/meals/${m.img}" alt="${esc(m.n)}"><div class="mb">
    <div class="slot">🕗 ${mealTimes()[k]} · ${SLOT[k]} · ${m.t} min</div><h3 style="margin-top:2px">${esc(m.n)}</h3>
    <div class="macros"><span><b>${fmt(m.k * f)}</b> kcal</span><span>P <b>${Math.round(m.p * f)}</b>g</span><span>C <b>${Math.round(m.c * f)}</b>g</span><span>F <b>${Math.round(m.f * f)}</b>g</span></div>
    <details><summary>Ingredients & method</summary><ul>${m.i.map(([gr, n]) => `<li>${g(gr)}${esc(n)}</li>`).join('')}</ul><ol>${m.s.map(s => `<li>${esc(s)}</li>`).join('')}</ol></details>
    ${canEat ? (state ? `<div class="row eat" style="gap:8px"><span class="pill ${isEaten ? 'good' : 'bad'}">${isEaten ? '✓ Ate it' : state === 'skip' ? '✕ Skipped' : '⚠ Ate something else'}</span><button class="btn sm" onclick="eat(${k}, null)">↩︎ Undo</button></div>`
      : `<div class="row eat" style="gap:6px"><button class="btn sm acc" style="flex:1" onclick="eat(${k}, true)">✓ Ate it</button><button class="btn sm ghost-bad" onclick="eat(${k}, 'skip')">✕ Skipped</button><button class="btn sm ghost-bad" onclick="eat(${k}, 'off')">⚠ Other</button></div>`) : ''}
  </div></div>`;
}
function eat(k, v) { const e = S.eaten[TODAY] = S.eaten[TODAY] || []; e[k] = v; save(); render(); if (v === 'skip' || v === 'off') toast('❌ Logged — it counts in your stats'); }
function profileForm() {
  const p = S.profile;
  return `<div class="card"><h3>Your profile</h3><p class="note">To calculate calories, protein and portions precisely.</p>
  <div class="grid2">
    <label class="f">Weight (kg)<input id="pw" inputmode="decimal" value="${p.w || ''}"></label>
    <label class="f">Height (cm)<input id="ph" inputmode="numeric" value="${p.h || ''}"></label>
    <label class="f">Age<input id="pa" inputmode="numeric" value="${p.age || ''}"></label>
    <label class="f">Sex<select id="ps"><option value="m" ${p.sex !== 'f' ? 'selected' : ''}>Male</option><option value="f" ${p.sex === 'f' ? 'selected' : ''}>Female</option></select></label>
    <label class="f">Activity<select id="pact"><option value="1.55" ${p.act == 1.55 ? 'selected' : ''}>6 workouts, desk job</option><option value="1.7" ${!p.act || p.act == 1.7 ? 'selected' : ''}>6 workouts + 8-10k steps</option><option value="1.85" ${p.act == 1.85 ? 'selected' : ''}>Very active / physical job</option></select></label>
    <label class="f">Goal<select id="pg"><option value="bulk" ${!p.goal || p.goal === 'bulk' ? 'selected' : ''}>Muscle gain (lean bulk)</option><option value="keep" ${p.goal === 'keep' ? 'selected' : ''}>Recomposition</option><option value="cut" ${p.goal === 'cut' ? 'selected' : ''}>Fat loss</option></select></label>
  </div>
  <button class="btn acc block" style="margin-top:12px" onclick="saveProfile()">Save</button></div>`;
}
function editProfile() { TAB = 'food'; app.innerHTML = '<h1>Profile</h1>' + profileForm(); scrollTo(0, 0); }
function saveProfile() {
  const v = id => +$('#' + id).value.replace(',', '.');
  S.profile = { w: v('pw'), h: v('ph'), age: v('pa'), sex: $('#ps').value, act: +$('#pact').value, goal: $('#pg').value };
  if (!S.profile.w || !S.profile.h || !S.profile.age) return toast('Fill in weight, height and age');
  S.weights[TODAY] = S.weights[TODAY] || S.profile.w; save(); TAB = 'food'; render(); toast('✅ Saved');
}

// ---------- HEALTH ----------
function vHealth() {
  const h = S.health[TODAY] || {}, last = Object.keys(S.health).sort().at(-1);
  const days = n => Array.from({ length: n }, (_, i) => dkey(addDays(new Date(), i - n + 1)));
  const steps = days(14).map(k => [k, S.health[k]?.steps || 0]);
  const rhr = days(30).map(k => [k, S.health[k]?.rhr]).filter(p => p[1]);
  const sleep = days(14).map(k => [k, S.health[k]?.sleep || 0]);
  const url = location.origin + location.pathname;
  return `
  <h1>Health</h1>
  <div class="sub">${last ? `Last sync: ${last === TODAY ? 'Today' : last}${S.health[last].t ? ' ' + new Date(S.health[last].t).toTimeString().slice(0, 5) : ''}` : 'Apple Health not connected yet'}</div>
  <div class="grid2" style="margin-top:12px">
    <div class="stat"><span>👟 Steps</span><b>${h.steps ? fmt(h.steps) : '—'}</b></div>
    <div class="stat"><span>🚶 Distance</span><b>${h.dist ? h.dist + ' km' : '—'}</b></div>
    <div class="stat"><span>🪜 Flights</span><b>${h.flights ?? '—'}</b></div>
    <div class="stat"><span>🔥 Active kcal</span><b>${h.kcal ? fmt(h.kcal) : '—'}</b></div>
    <div class="stat"><span>❤️ Resting HR</span><b>${h.rhr ? Math.round(h.rhr) : '—'}</b></div>
    <div class="stat"><span>📈 HRV</span><b>${h.hrv ? Math.round(h.hrv) + 'ms' : '—'}</b></div>
    <div class="stat"><span>😴 Sleep</span><b>${h.sleep ? h.sleep + ' h' : '—'}</b></div>
    <div class="stat"><span>⚖️ Weight</span><b>${h.w || S.weights[TODAY] || '—'}</b></div>
  </div>
  <div class="card"><div class="row between"><b>Steps — 14 days</b><span class="sub">Goal 8 000</span></div>${barChart(steps, { goal: 8000 })}</div>
  <div class="card"><b>Sleep — 14 days</b>${barChart(sleep, { goal: 7.5, color: 'var(--blue)' })}</div>
  <div class="card"><b>Resting HR — 30 days</b><div class="note">Going down = heart and fitness are improving</div>${lineChart(rhr, { color: 'var(--bad)' })}</div>

  <h2>⚡ Connect Apple Health</h2>
  <div class="card">
    <p class="note" style="margin-top:0">Apple doesn’t let web apps read Health directly, so we use the free <b>Shortcuts</b> app as a bridge. Set it up once (~5 min) — after that it’s one tap.</p>
    <ol class="steps">
      <li>Open <b>Shortcuts</b> → <b>+</b> (top right). Use the <b>Search Actions</b> field at the bottom to find each action by name.</li>
      <li>Add <b>Find Health Samples</b> → tap “Type” → <b>Steps</b>. <b>Add Filter</b> → <b>Start Date</b> · <b>is today</b>.<br>Then add <b>Calculate Statistics</b> → <b>Sum</b>.</li>
      <li>Add another <b>Find Health Samples</b> → <b>Resting Heart Rate</b>. Sort by <b>Start Date</b>, Order <b>Latest First</b>, turn on Limit → <b>1</b>.</li>
      <li>Another <b>Find Health Samples</b> → <b>Sleep Analysis</b>. Filters: <b>Start Date is in the last 1 days</b>, <b>Value is not In Bed</b>, <b>Value is not Awake</b>.<br>Then <b>Get Details of Health Sample</b> → <b>Duration</b>, then <b>Calculate Statistics</b> → <b>Sum</b>.</li>
      <li>Another <b>Find Health Samples</b> → <b>Weight</b>, Latest First, Limit <b>1</b>. (Skip this if you don’t log weight in Health.)</li>
      <li>Add <b>Text</b> and type these lines. After each colon insert the matching result (from the bar above the keyboard or <b>Select Variable</b>):
        <pre style="background:var(--card2);border-radius:10px;padding:10px;margin:8px 0;font-size:13px;white-space:pre-wrap">steps: [Statistics — steps]
rhr: [Health Samples — resting HR]
sleep: [Statistics — sleep]
w: [Health Samples — weight]</pre></li>
      <li>Finally add <b>Copy to Clipboard</b>. Run it ▶. The first time, Health asks for permission → <b>Turn On All → Allow</b>.</li>
      <li>✨ Long-press the shortcut → <b>Share → Add to Home Screen</b> for a one-tap “Coach” button.</li>
      <li><b>Every day:</b> tap “Coach” → open this app → on the <b>Today</b> page tap the Health field → <b>Paste</b>. Saved instantly.</li>
    </ol>
    <details class="note"><summary>Using the app in Safari instead of the Home Screen icon?</summary>After Copy to Clipboard add <b>URL Encode</b>, then <b>URL</b>: <code>${esc(url)}?d=</code> <button class="btn sm" onclick="copyTpl()">📋</button> + the URL Encoded Text, then <b>Open URLs</b> — no pasting needed. (The Home Screen app has its own storage, separate from Safari, so there you paste.)</details>
    <b style="display:block;margin-top:12px">Paste</b><textarea id="hpaste" rows="2" placeholder="Tap here → Paste" onpaste="setTimeout(() => pasteHealth(this.value), 50)" style="width:100%;margin-top:8px;background:var(--card2);border:1px dashed var(--acc);border-radius:10px;padding:12px;font-size:16px;color:var(--text)"></textarea><button class="btn block" style="margin-top:8px" onclick="pasteHealth($('#hpaste').value)">Import</button>
  </div>

  <h2>Manual entry</h2>
  <div class="card"><div class="grid2">
    <label class="f">Steps<input id="hs" inputmode="numeric" value="${h.steps || ''}"></label>
    <label class="f">Resting HR<input id="hr" inputmode="numeric" value="${h.rhr || ''}"></label>
    <label class="f">Sleep (h)<input id="hsl" inputmode="decimal" value="${h.sleep || ''}"></label>
    <label class="f">Morning weight (kg)<input id="hw" inputmode="decimal" value="${h.w || S.weights[TODAY] || ''}"></label>
  </div><button class="btn acc block" style="margin-top:12px" onclick="saveManual()">Save</button></div>`;
}
function copyTpl() { const c = document.querySelector('.steps code').textContent; if (!navigator.clipboard) { toast('Select and copy it manually'); return; } navigator.clipboard?.writeText(c).then(() => toast('📋 Copied'), () => toast('Select and copy it manually')); }
function saveManual() {
  const v = id => { const x = parseFloat($('#' + id).value.replace(',', '.')); return isFinite(x) ? x : undefined; };
  const h = S.health[TODAY] = S.health[TODAY] || {};
  [['steps', 'hs'], ['rhr', 'hr'], ['sleep', 'hsl'], ['w', 'hw']].forEach(([k, id]) => { const x = v(id); if (x !== undefined) h[k] = x; });
  h.t = Date.now(); if (h.w) S.weights[TODAY] = h.w; save(); render(); toast('✅ Saved');
}

// ---------- STATS ----------
function vStats() {
  const logs = Object.entries(S.logs).filter(([, L]) => Object.values(L.sets || {}).flat().some(s => s.ok)).sort();
  const mon = dkey(monday());
  // weekly sets per muscle
  const vol = {};
  logs.filter(([k]) => k >= mon).forEach(([, L]) => Object.entries(L.sets).forEach(([key, sets]) => { const id = key.split(':')[1]; if (!EX[id]) return; const g = group(id); vol[g] = (vol[g] || 0) + sets.filter(s => s.ok).length; }));
  const allG = [...new Set(GROUPS.map(g => g[1]))];
  // PRs
  const pr = {};
  logs.forEach(([k, L]) => Object.entries(L.sets).forEach(([key, sets]) => { const id = key.split(':')[1]; sets.filter(s => s.ok && s.w > 0).forEach(s => { const v = e1rm(+s.w, +s.r); if (!pr[id] || v > pr[id].v) pr[id] = { v, w: s.w, r: s.r, k }; }); }));
  const prs = Object.entries(pr).sort((a, b) => b[1].v - a[1].v).slice(0, 10);
  // streak (weeks with 4+ sessions) & totals
  const thisWeek = logs.filter(([k]) => k >= mon).length;
  const totalVol = logs.reduce((a, [, L]) => a + Object.values(L.sets).flat().filter(s => s.ok).reduce((b, s) => b + (+s.w || 0) * (+s.r || 0), 0), 0);
  const ws = weightSeries(60);
  const volWeeks = Array.from({ length: 8 }, (_, i) => { const a = dkey(addDays(monday(), -7 * (7 - i))), b = dkey(addDays(monday(), -7 * (6 - i))); return [a, logs.filter(([k]) => k >= a && k < b).reduce((x, [, L]) => x + Object.values(L.sets).flat().filter(s => s.ok).length, 0)]; });
  return `
  <h1>Progress</h1>
<!--SEG:overview-->  <button class="btn block" style="margin-top:10px" onclick="go('health')">❤️ Health & Apple Health →</button>
  <h2>Discipline · 4 weeks</h2>
  ${adherenceTiles()}
  <div class="card"><b>Day by day</b><div style="margin-top:10px">${heatmap()}</div></div>
  ${coachCard()}
  ${missReasons()}
<!--SEG:strength-->
  <h2>Strength & volume</h2>
  <div class="grid3" style="margin-top:12px">
    <div class="stat"><span>This week</span><b>${thisWeek}/6</b></div>
    <div class="stat"><span>Total workouts</span><b>${logs.length}</b></div>
    <div class="stat"><span>Tonnes lifted</span><b>${(totalVol / 1000).toFixed(1)}</b></div>
  </div>
  <div class="card"><div class="row between"><b>Weekly sets per muscle</b><span class="sub">optimal 10-20</span></div><div class="muscles" style="margin-top:8px">${allG.map(g => { const v = vol[g] || 0; return `<div><span>${g}</span><div class="bar"><i style="width:${Math.min(100, v / 20 * 100)}%;background:${v >= 10 ? 'var(--good)' : 'var(--acc)'}"></i></div><b style="text-align:right">${v}</b></div>`; }).join('')}</div></div>
  <div class="card"><b>🏊 Swim (times) — 8 weeks</b>${barChart(Array.from({ length: 8 }, (_, i) => [dkey(addDays(monday(), -7 * (7 - i))), recWeek(7 - i).swims]), { color: 'var(--blue)', goal: 2 })}<b>🧖 Sauna (times) — 8 weeks</b>${barChart(Array.from({ length: 8 }, (_, i) => [dkey(addDays(monday(), -7 * (7 - i))), recWeek(7 - i).sauna]), { color: 'var(--warn)', goal: 3 })}</div>
  <div class="card"><b>Sets per week — 8 weeks</b>${barChart(volWeeks, { color: 'var(--blue)' })}</div>
  <div class="card"><div class="row between"><b>Body weight</b><button class="btn sm" onclick="logWeight()">+ Weigh in</button></div>${lineChart(ws, { fmtY: v => v + ' kg' })}${(() => { const r = weeklyRate(); return r ? `<div class="note">7-day average: ${r.now.toFixed(1)} kg (${r.pct >= 0 ? '+' : ''}${r.pct.toFixed(2)}%/week)</div>` : ''; })()}</div>
  <div class="card"><b>🏆 Personal records (e1RM)</b>${prs.length ? prs.map(([id, p]) => `<div class="row between" style="padding:8px 0;border-top:1px solid var(--line)"><span>${esc(EX[id]?.n || id)}</span><span><b>${Math.round(p.v)}</b> <span class="sub">kg · ${p.w}×${p.r}</span></span></div>`).join('') : '<p class="note">Shows up after your first workout.</p>'}</div>
<!--SEG:settings-->
  <h2>Settings</h2>
  <div class="card">
    <label class="f">Cycle start (Deload count)<input type="date" id="cycStart" value="${S.start}" onchange="S.start=this.value;save();render()"></label>
    ${planPicker()}
    <div class="row" style="margin-top:12px;gap:8px"><button class="btn sm" onclick="editProfile()">✏️ Profile</button></div>
    <p class="note">Data is stored on your phone, inside the app — it’s never sent anywhere.</p>
  </div>`;
}
function missReasons() {
  const R = {}; lastDays(28).forEach(k => { const r = stOf(k).workout; if (r) R[r] = (R[r] || 0) + 1; });
  const e = Object.entries(R).sort((a, b) => b[1] - a[1]); if (!e.length) return '';
  const mx = e[0][1];
  return `<div class="card"><b>Why I miss workouts</b><div class="muscles" style="margin-top:8px">${e.map(([r, n]) => `<div><span>${reasonLabel(r)}</span><div class="bar"><i style="width:${n / mx * 100}%;background:var(--bad)"></i></div><b style="text-align:right">${n}</b></div>`).join('')}</div></div>`;
}
function logWeight() { const w = parseFloat((prompt('Today’s weight (kg), in the morning, before eating:', S.weights[TODAY] || S.profile.w || '') || '').replace(',', '.')); if (w > 30) { S.weights[TODAY] = w; if (S.profile.w) S.profile.w = w; save(); render(); } }
function exportData() {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(S)], { type: 'application/json' })); a.download = `coach-backup-${TODAY}.json`; a.click();
}
function importData(f) { if (!f) return; f.text().then(t => { try { S = Object.assign({}, DEF, JSON.parse(t)); save(); render(); toast('✅ Restored'); } catch { toast('⚠️ Couldn’t read the file'); } }); }

// ============ BOOT ============
document.querySelectorAll('nav button').forEach(b => b.onclick = () => go(b.dataset.tab));
window.addEventListener("hashchange", () => { importHealth(); render(); });
importHealth();
if (location.hash === '#train') TAB = 'train';
render();
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js');
