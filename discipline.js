// ============ DISCIPLINE: done / partial / missed ============
// statuses: done · part · miss · bonus (extra, not planned) · rest (nothing planned) · pend (today, still open) · none (before app start)
const CATS = [['workout', '🏋️', 'ვარჯიში'], ['meals', '🍽️', 'კვება'], ['swim', '🏊', 'ცურვა'], ['sauna', '🧖', 'საუნა'], ['creatine', '💊', 'კრეატინი'], ['water', '💧', 'წყალი']];
const REASONS = [['tired', '😴 დაღლილი'], ['busy', '⏰ დრო არ მქონდა'], ['sick', '🤒 ავად'], ['pain', '🦴 ტკივილი'], ['mood', '😐 მოტივაცია არ იყო'], ['other', '… სხვა']];
const REASON_TIP = {
  tired: 'დაღლილობა ხშირად ძილია: 7-9 სთ, ძილამდე 1 სთ ეკრანის გარეშე. დაღლილ დღეს ივარჯიშე RIR 3-ით — მსუბუქი ვარჯიში გამოტოვებულს სჯობს.',
  busy: 'დრო რომ არ გაქვს — „მინი ვარჯიში": მხოლოდ პირველი 3-4 მოძრაობა, 35 წთ. ვარჯიში კალენდარში ჩაწერე, როგორც შეხვედრა.',
  sick: 'ავადობისას დასვენება სწორია. დაბრუნების პირველ კვირას სეტები −30%, RIR 3.',
  pain: 'ტკივილი სიგნალია. მტკივნეული მოძრაობა შეცვალე (Hack Squat ↔ Leg Press), McGill Big 3 ყოველდღე. თუ კვირაზე მეტ ხანს გრძელდება — ფიზიოთერაპევტი.',
  mood: 'მოტივაცია მოქმედების შემდეგ მოდის: შეპირდი თავს მხოლოდ 10 წუთს. დარბაზში მისულს უმეტესად მთელი ვარჯიში გამოგდის.',
  other: 'დაფიქრდი, რა შეგიშალა ხელი და რა შეიძლება შეიცვალოს შემდეგ ჯერზე.',
};
const SLOT_TIP = [
  'საუზმე: წინა საღამოს მოამზადე ღამის ოვსი — 5 წუთი, დილით მზადაა.',
  'წახემსება: ჩანთაში ყოველთვის გქონდეს სკირი, ხაჭო ან ხილი + ნიგოზი.',
  'სადილი: კვირაში 1-ჯერ meal prep — ქათამი/ინდაური 3 დღისთვის.',
  'ვარჯიშის შემდეგ: შეიკი ჩანთაში — დღის ცილის მეოთხედია.',
  'ვახშამი: მარტივი ვარიანტები — თინუსის სალათი ან ომლეტი 10 წუთში.',
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
const ST_LABEL = { done: 'შესრულდა', part: 'ნაწილობრივ', miss: 'გამოტოვებული', bonus: 'ბონუსი', rest: 'არ იყო დაგეგმილი', pend: 'დღეს', none: '—', fut: 'მომავალი' };

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
  MISS_OPEN = null; save(); render(); toast('❌ დაფიქსირდა — სტატისტიკაში ჩაითვლება');
}
function unmarkMiss(cat) {
  if (cat === 'swim' || cat === 'sauna') { const R = S.recovery[TODAY] || {}; delete R[cat + 'Miss']; }
  else { const s = stOf(TODAY); delete s[cat]; }
  save(); render();
}
function openMiss(cat) { MISS_OPEN = MISS_OPEN === cat ? null : cat; render(); }
function missChips(cat) {
  if (MISS_OPEN !== cat) return '';
  return `<div class="misspick"><div class="sub">რატომ?</div><div class="chips">${REASONS.map(([id, l]) => `<button class="chip" onclick="markMiss('${cat}','${id}')">${l}</button>`).join('')}</div></div>`;
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
  <div class="row between sub" style="font-size:11px;margin-top:4px"><span>${days[0].slice(5)}</span><span class="legend"><i class="st-done"></i>შესრ. <i class="st-part"></i>ნაწ. <i class="st-miss"></i>გამოტ. <i class="st-bonus"></i>ბონუსი</span><span>დღეს</span></div>`;
}
function adherenceTiles() {
  return `<div class="grid3">${CATS.map(([c, ic, l]) => { const a = adherence(c); const cls = a.pct == null ? '' : a.pct >= 80 ? 'good' : a.pct >= 50 ? 'warn' : 'bad';
    return `<div class="stat adh ${cls}"><span>${ic} ${l}</span><b>${a.pct == null ? '—' : a.pct + '%'}</b><span>${a.cnt ? `${a.miss} გამოტ. / ${a.cnt}` : 'ჯერ არ არის'}</span></div>`; }).join('')}</div>`;
}

// ---- coach: turns misses into advice ----
function coachNotes() {
  const N = [], d28 = lastDays(28).reverse().filter(k => k >= since()), past = d28.filter(k => k < TODAY);
  const W = d28.map(k => [k, workoutStatus(k)]).filter(([, s]) => !['rest', 'pend', 'none'].includes(s));
  let ms = 0; for (const [, s] of W) { if (s === 'miss') ms++; else break; }
  let ds = 0; for (const [, s] of W) { if (s === 'done' || s === 'bonus') ds++; else break; }
  if (ms >= 2) N.push(['bad', `${ms} ვარჯიში ზედიზედ გამოტოვე`, 'ნუ ცდილობ ყველაფრის დაწევას. დღეს მხოლოდ პირველი 3 მოძრაობა (~25 წთ) — მთავარია ჩვევა არ გაწყდეს.']);
  else if (ms === 1) N.push(['warn', 'ბოლო ვარჯიში გამოტოვე', 'ერთი გამოტოვება არაფერია — ორი ზედიზედ უკვე ჩვევაა. შემდეგი ვარჯიში აუცილებლად.']);
  if (ds >= 3) N.push(['good', `🔥 ${ds} ვარჯიში ზედიზედ`, 'შესანიშნავი რიტმი — ასე გააგრძელე.']);
  const byDay = {}; W.filter(([, s]) => s === 'miss').forEach(([k]) => { const i = dow(fromKey(k)); byDay[i] = (byDay[i] || 0) + 1; });
  const md = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0];
  if (md && md[1] >= 2) N.push(['warn', `ყველაზე ხშირად აცდენ: ${DOW[md[0]]} (${md[1]}×)`, `${program().days[md[0]].t} ამ დღეს არ გამოგდის — სცადე დილით ან გაცვალე დასვენების დღეში.`]);
  const R = {}; d28.forEach(k => { const r = stOf(k).workout; if (r) R[r] = (R[r] || 0) + 1; });
  const tr = Object.entries(R).sort((a, b) => b[1] - a[1])[0];
  if (tr && (tr[1] >= 2 || d28.length < 8)) {
    let tip = REASON_TIP[tr[0]] || REASON_TIP.other;
    if (tr[0] === 'tired') { const sl = past.map(k => S.health[k]?.sleep).filter(Boolean); if (sl.length >= 3) tip = `საშუალო ძილი ${(sl.reduce((a, b) => a + b) / sl.length).toFixed(1)} სთ. ` + tip; }
    N.push(['warn', `გამოტოვების მიზეზი: ${reasonLabel(tr[0])}${tr[1] > 1 ? ` (${tr[1]}×)` : ''}`, tip]);
  }
  const slot = [0, 0, 0, 0, 0]; let off = 0;
  past.forEach(k => { const E = S.eaten[k] || []; for (let j = 0; j < 5; j++) { if (E[j] !== true) slot[j]++; if (E[j] === 'off') off++; } });
  const sj = slot.indexOf(Math.max(...slot));
  if (slot[sj] >= 3) N.push(['warn', `ყველაზე ხშირად აცდენ: ${SLOT[sj].toLowerCase()} (${slot[sj]}×)`, SLOT_TIP[sj]]);
  if (off >= 3) N.push(['warn', `გეგმის გარეთ ჭამა: ${off}× ბოლო დღეებში`, 'არ არის პრობლემა, თუ ცილას და კალორიას აღწევ. სახლიდან წაიღე 1 მზა კვება — ეს ყველაზე ეფექტურია.']);
  const ma = adherence('meals'); if (ma.pct != null && ma.pct < 60 && ma.cnt >= 3) N.push(['bad', `კვება: მხოლოდ ${ma.pct}%`, 'ამ დონეზე ცილა და კალორია არ გყოფნის კუნთის ზრდისთვის. პირველი ნაბიჯი: ყოველდღე პოსტ-ვარჯიშის შეიკი.']);
  const wd = dow(), rw = recWeek(), pl = recPlan();
  const due = kind => pl[kind].filter(i => i < wd).length;
  if (due('swim') > rw.swims) N.push(['warn', `ცურვა: ამ კვირას ${rw.swims}/${pl.swim.length}`, 'ცურვა ხერხემალს ჭიმავს და გულს წვრთნის დატვირთვის გარეშე. შემდეგი შესაძლებლობა არ გამოტოვო.']);
  if (due('sauna') > rw.sauna + 1) N.push(['warn', `საუნა: ამ კვირას ${rw.sauna}/${pl.sauna.length}`, 'საუნა ვარჯიშის შემდეგ 2 რაუნდი — აღდგენა და გული. დაამატე ვარჯიშის ბოლოს 20 წუთი.']);
  const ca = adherence('creatine'); if (ca.pct != null && ca.pct < 70 && ca.cnt >= 4) N.push(['warn', `კრეატინი: ${ca.pct}%`, 'კრეატინი მხოლოდ ყოველდღიურად მუშაობს. დადე კბილის ჯაგრისთან ან ყავის აპარატთან.']);
  const wa = adherence('water'); if (wa.pct != null && wa.pct < 60 && wa.cnt >= 3) N.push(['warn', `წყალი: ${wa.pct}%`, 'დილით პირველი საქმე — 2 ჭიქა წყალი. ვარჯიშზე 1 ლიტრიანი ბოთლი.']);
  const wa4 = adherence('workout'); if (wa4.pct >= 85 && wa4.cnt >= 6) N.push(['good', `ვარჯიში: ${wa4.pct}% ბოლო 4 კვირაში`, 'ეს ელიტური დისციპლინაა — შედეგი აუცილებლად გამოჩნდება.']);
  return N;
}
function coachCard(limit) {
  let N = coachNotes(); if (limit) N = N.filter(n => n[0] !== 'good' || N.length <= limit).slice(0, limit);
  if (!N.length) return '';
  return `<div class="card"><b>🧠 მწვრთნელი</b>${N.map(([l, t, p]) => `<div class="note-${l}"><b>${t}</b><p>${p}</p></div>`).join('')}</div>`;
}
function planPicker() {
  const pl = recPlan();
  const row = kind => `<div class="row" style="gap:4px;flex-wrap:wrap;margin-top:6px">${DOW_S.map((d, i) => `<button class="chip ${pl[kind].includes(i) ? 'on' : ''}" onclick="togglePlan('${kind}',${i})">${d}</button>`).join('')}</div>`;
  return `<div style="margin-top:12px"><div class="sub">🏊 ცურვის დღეები</div>${row('swim')}<div class="sub" style="margin-top:10px">🧖 საუნის დღეები</div>${row('sauna')}</div>`;
}
function togglePlan(kind, i) { const a = recPlan()[kind]; const j = a.indexOf(i); j >= 0 ? a.splice(j, 1) : a.push(i); a.sort(); save(); render(); }
