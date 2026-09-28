// ============ SPIRIT: breathwork · static pose · gratitude & manifestation · sleep ritual ============
const sp = k => ((S.spirit = S.spirit || {})[k] = S.spirit[k] || {});
const spGet = k => (S.spirit || {})[k] || {};

// static pose progression: 3 sessions per level, +5 min, 15 → 60
function staticDone() { return Object.values(S.spirit || {}).filter(x => x.static?.min >= 10).length; }
function staticTarget() { return S.staticOverride || Math.min(60, 15 + 5 * Math.floor(staticDone() / 3)); }
function staticNext() { const n = staticDone(), t = staticTarget(); return t >= 60 ? 'მაქსიმუმზე ხარ — 60 წთ' : `კიდევ ${3 - n % 3} სესია → ${t + 5} წთ`; }

const SLEEP_RITUAL = [
  ['screen', '📵', 'ეკრანი გვერდზე 30-60 წთ ადრე', 'ცისფერი შუქი მელატონინს თრგუნავს; ტელეფონი სხვა ოთახში ან Night Shift + Sleep Focus.'],
  ['dump', '📝', 'Brain dump — გონების დაცლა', 'ჩაწერე ხვალინდელი საქმეები და ფიქრები. Scullin et al. 2018: 5 წუთიანი to-do სია ძილს ~9 წუთით აჩქარებს.'],
  ['journal', '🙏', 'მადლიერება + მანიფესტაცია', '3 მადლიერება და მანიფესტაცია აწმყო დროში — გონება დადებით ნოტაზე მთავრდება.'],
  ['478', '🌬️', '4-7-8 სუნთქვა ×4', 'ჩაისუნთქე 4, შეიკავე 7, ამოისუნთქე 8 — პარასიმპათიკური სისტემა, გულისცემა ნელდება.'],
  ['scan', '🧘', 'Body scan — სხეულის დამშვიდება', '10 წუთი: ყურადღება ფეხის თითებიდან თავამდე, ყველა კუნთი თანდათან მოდუნდება (Yoga Nidra-ს ბაზა).'],
  ['room', '🌡️', 'ოთახი: გრილი (18-19°C), ბნელი, წყნარი', 'სხეულის ტემპერატურის დაწევა ძილის სიგნალია. საუნის შემდეგ 1-2 სთ-ში ძილი განსაკუთრებით ღრმაა.'],
];
const BODY_SCAN = ['ფეხის თითები და ტერფები', 'კოჭები და წვივები', 'მუხლები და ბარძაყები', 'მენჯი და დუნდულები', 'მუცელი — სუნთქვა ნელდება', 'წელი და ხერხემალი — ყოველი მალა თავისუფლდება', 'მკერდი და გული', 'მხრები — ჩამოუშვი ყურებიდან', 'ხელები, მტევნები, თითები', 'კისერი და ყბა — გაახსენი კბილები', 'სახე, თვალები, შუბლი', 'მთელი სხეული ერთად — მძიმე, თბილი, უსაფრთხო'];
const MANI_PROMPTS = ['მე ვარ ძლიერი, ჯანმრთელი ათლეტი, ჩემი სხეული ყოველდღე იზრდება.', 'მე ვარ წარმატებული DJ/პროდიუსერი, ჩემი მუსიკა ხალხს აერთიანებს.', 'მე თავისუფლად ვლაპარაკობ პორტუგალიურად და ინგლისურად.', 'ყოველი დღე მაახლოებს ჩემს საუკეთესო ვერსიასთან.'];

// ---- statuses for discipline ----
function spStatus(kind, k) {
  if (k < since()) return 'none'; if (k > TODAY) return 'fut';
  const s = spGet(k);
  const done = kind === 'breath' ? s.breath : kind === 'static' ? s.static : (s.journal?.g?.some(Boolean) || s.journal?.m);
  if (done) return kind === 'static' && s.static.min < staticTarget() * 0.8 && k === TODAY ? 'part' : 'done';
  return k < TODAY ? 'miss' : 'pend';
}
CATS.push(['breath', '🌬️', 'სუნთქვა'], ['static', '🧍', 'სტატიკა'], ['journal', '📖', 'დღიური']);
XSTAT.breath = k => spStatus('breath', k); XSTAT.static = k => spStatus('static', k); XSTAT.journal = k => spStatus('journal', k);
function spiritLine(k) {
  const s = spGet(k), a = [];
  if (s.breath) a.push(`სუნთქვა ✓ (შეკავება ${s.breath.r.map(x => x + 'წმ').join('/')})`);
  if (s.static) a.push(`სტატიკა ${s.static.min} წთ`);
  if (s.journal?.g?.some(Boolean)) a.push('მადლიერების დღიური ✓');
  if (s.sleep?.length) a.push(`ძილის რიტუალი ${s.sleep.length}/${SLEEP_RITUAL.length}`);
  return a.length ? 'სული: ' + a.join(', ') : '';
}

// ---- guided session overlay (breath / 4-7-8 / static / body scan) ----
let SES = null;
function tone(f = 440, d = .25, v = .15) { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); const o = actx.createOscillator(), g = actx.createGain(); o.type = 'sine'; o.frequency.value = f; o.connect(g); g.connect(actx.destination); g.gain.setValueAtTime(0, actx.currentTime); g.gain.linearRampToValueAtTime(v, actx.currentTime + .03); g.gain.exponentialRampToValueAtTime(.001, actx.currentTime + d); o.start(); o.stop(actx.currentTime + d + .05); } catch { } }
function gong() { tone(196, 2.5, .25); setTimeout(() => tone(294, 2, .12), 60); navigator.vibrate?.([300, 150, 300]); }
function overlay(html) { let o = $('#sess'); if (!o) { o = document.createElement('div'); o.id = 'sess'; document.body.appendChild(o); } o.innerHTML = html; o.hidden = false; }
function closeSession(save_) { if (SES?.int) clearInterval(SES.int); if (save_ && SES?.onEnd) SES.onEnd(); SES = null; const o = $('#sess'); if (o) o.hidden = true; try { wakeLock?.release?.(); } catch { } render(); }
async function keepAwake() { try { wakeLock = await navigator.wakeLock?.request('screen'); } catch { } }

// DMT breathwork — follows "Breathwork for DMT Release | 15 Min" (Breathe With Sandy):
// shamanic breathing (open mouth: belly-in, chest-in, relaxed exhale) → hold top → exhale & hold bottom →
// 5 rounds of [30s shamanic breathing → slow "straw" inhale belly→face with pelvic-floor + belly locks → squeeze hold → release with a sigh] → meditation
const DMT_VIDEO = 'CRKGZ2sR6xQ';
const DMT_HOLDS = [25, 30, 40, 50, 55];
const STRAW = ['მუცელი', 'ნეკნები', 'გული', 'ზედა მკერდი', 'ყელი', 'სახე'];
function dmtSteps() {
  const S_ = [
    { k: 'txt', d: 20, top: 'მომზადება', big: 'დაჯექი', sub: 'ხერხემალი სწორი (ბალიშზე), ნაზი ღიმილი, თვალები დახუჭე. მზერა დახუჭული თვალებით — შუბლის ცენტრისკენ, ზემოთ.' },
    { k: 'shaman', d: 165, top: 'გახურება · შამანური სუნთქვა' },
    { k: 'txt', d: 5, top: 'ნელდება', big: 'ამოისუნთქე', sub: 'სუნთქვა შეანელე. დიდი ამოსუნთქვა.', orb: .55 },
    { k: 'txt', d: 6, top: 'ნელდება', big: 'ჩაისუნთქე → ოხვრა', sub: 'დიდი ჩასუნთქვა და ოხვრით ამოსუნთქვა.', orb: .9 },
    { k: 'txt', d: 6, top: 'ნელდება', big: 'კიდევ ერთხელ', sub: 'დიდი ჩასუნთქვა და ოხვრით ამოსუნთქვა.', orb: .9 },
    { k: 'count', d: 15, top: 'შეკავება ზემოთ', sub: 'სრულად ჩაისუნთქე და შეიკავე. ყურადღება შუბლის ცენტრში.', orb: 1 },
    { k: 'free', d: 80, max: 150, top: 'შეკავება ქვემოთ', sub: 'ოხვრით ამოისუნთქე და შეიკავე ცარიელ ფილტვებზე. გაუშვი სხეული, სრული მოდუნება.', btn: 'ჩავისუნთქე', orb: .45, log: 'bottom' },
    { k: 'count', d: 10, top: 'აღდგენა', sub: 'სრულად ჩაისუნთქე და შეიკავე.', orb: 1 },
    { k: 'txt', d: 5, top: 'აღდგენა', big: 'ოხვრა', sub: 'ოხვრით ამოისუნთქე. ახლა — DMT squeeze რაუნდები.', orb: .6 },
  ];
  DMT_HOLDS.forEach((h, i) => {
    const r = `რაუნდი ${i + 1}/5`;
    S_.push({ k: 'shaman', d: 30, top: `${r} · შამანური სუნთქვა` });
    S_.push({ k: 'straw', d: 9, top: `${r} · ნელი ჩასუნთქვა` });
    S_.push({ k: 'free', d: h, max: h + 30, top: `${r} · DMT squeeze`, sub: 'შეიკავე. მენჯის ფსკერი აწეული, მუცელი ხერხემლისკენ, დიაფრაგმა დაჭიმული — ყველაფერი მოჭიმე. მზერა შუბლის ცენტრში. არაფერს ელოდო, უბრალოდ იყავი.', btn: 'ამოვისუნთქე', orb: 1, squeeze: 1, log: 'r' });
    S_.push({ k: 'txt', d: 6, top: r, big: 'მოდუნება', sub: 'გაუშვი ყველა ჩაკეტვა და ოხვრით ამოისუნთქე.', orb: .55 });
    if (i < 4) S_.push({ k: 'txt', d: 15, top: r, big: 'აწმყოში', sub: 'რამდენიმე ჩვეულებრივი სუნთქვა. დარჩი ამ შეგრძნებაში.', orb: .6, calm: 1 });
  });
  S_.push({ k: 'txt', d: 180, top: 'მედიტაცია', big: 'სინათლე', sub: 'ჩვეულებრივი სუნთქვა ცხვირით. მზერა შუბლის ცენტრში. გაუშვი ფიზიკური სხეული. დაე, მანტრა ან აფირმაცია თავისით მოვიდეს.', orb: .7, calm: 1, clock: 1 });
  return S_;
}
function drum(v = .35) { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime; o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(45, t + .25); o.connect(g); g.connect(actx.destination); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + .35); o.start(t); o.stop(t + .4); } catch { } }
function startBreath() {
  tone(660, .1, .01); keepAwake();
  SES = { kind: 'dmt', steps: dmtSteps(), i: 0, t0: Date.now(), holds: [], bottom: null, beat: -1 };
  SES.onEnd = () => { if (SES.holds.length) { sp(TODAY).breath = { r: SES.holds, bottom: SES.bottom, v: 2, t: Date.now() }; save(); toast('🌬️ DMT სუნთქვა დაფიქსირდა'); } };
  overlay(`<button class="x" onclick="closeSession(true)">✕</button><div class="sess-top" id="sTop"></div><div class="orb" id="orb"></div><div class="sess-big" id="sBig"></div><div class="sess-sub" id="sSub"></div><div class="sess-steps" id="sSteps"></div><button class="btn acc" id="sBtn" hidden onclick="dmtNext(true)"></button>`);
  gong(); SES.int = setInterval(dmtTick, 50); dmtTick();
}
function dmtNext(user) {
  const s = SES, st = s.steps[s.i]; if (!st) return;
  if (st.log) { const sec = Math.round((Date.now() - s.t0) / 1000); if (st.log === 'r') s.holds.push(sec); else s.bottom = sec; }
  s.i++; s.t0 = Date.now(); s.beat = -1; s.cue = 0; $("#sBtn").hidden = true;
  const nx = s.steps[s.i];
  if (!nx) { clearInterval(s.int); dmtEnd(); return; }
  tone(nx.k === 'free' ? 330 : nx.k === 'shaman' ? 520 : 440, .35, .07);
}
function dmtTick() {
  const s = SES; if (!s || s.kind !== 'dmt') return; const st = s.steps[s.i]; if (!st) return;
  const el = (Date.now() - s.t0) / 1000, left = Math.max(0, Math.ceil(st.d - el)), orb = $('#orb');
  const done = s.steps.slice(0, s.i).reduce((a, x) => a + x.d, 0), total = s.steps.reduce((a, x) => a + x.d, 0);
  $('#sTop').textContent = `${st.top} · ${Math.round((done + Math.min(el, st.d)) / total * 100)}%`;
  orb.classList.toggle('calm', !!st.calm); orb.classList.toggle('squeeze', !!st.squeeze);
  $('#sSteps').innerHTML = '';
  if (st.k === 'shaman') {
    // open mouth: inhale belly · inhale chest · relaxed exhale  (one cycle ≈ 1.5 s)
    const cyc = 1.5, ph = (el % cyc) / cyc, beat = Math.floor(el / cyc);
    if (beat !== s.beat) { s.beat = beat; drum(); }
    const sc = ph < .3 ? .6 + .2 * (ph / .3) : ph < .6 ? .8 + .2 * ((ph - .3) / .3) : 1 - .4 * ((ph - .6) / .4);
    orb.style.transform = `scale(${sc})`;
    $('#sBig').textContent = ph < .3 ? 'მუცელი' : ph < .6 ? 'მკერდი' : 'ჰაა';
    $('#sSub').textContent = `ღია პირით: ორი ჩასუნთქვა (მუცელი → მკერდი), ერთი მოდუნებული ამოსუნთქვა. მზერა შუბლის ცენტრში. ${left} წმ`;
  } else if (st.k === 'straw') {
    const f = Math.min(1, el / st.d), part = Math.min(STRAW.length - 1, Math.floor(f * STRAW.length));
    orb.style.transform = `scale(${.5 + .5 * f})`;
    $('#sBig').textContent = STRAW[part];
    $('#sSub').textContent = f < .2 ? 'ნელა, პირით, თითქოს საწრუპით. დასაწყისშივე მოჭიმე და აწიე მენჯის ფსკერის კუნთები.' : f < .45 ? 'აგრძელებ ჩასუნთქვას — მუცელი შეიწიე ხერხემლისკენ და ასე დაიჭირე.' : 'სუნთქვა მაღლა ადის — ყოველ ნაწილს „კეტავ" სანამ ზემოთ არ მიხვალ.';
    $('#sSteps').innerHTML = STRAW.map((p, j) => `<span class="${j <= part ? 'on' : ''}">${p}</span>`).join('');
  } else if (st.k === 'free') {
    const sec = Math.floor(el);
    orb.style.transform = `scale(${st.orb + (st.squeeze ? .03 * Math.sin(Date.now() / 300) : 0)})`;
    $('#sBig').textContent = el < st.d ? `${Math.ceil(st.d - el)}` : `+${Math.floor(el - st.d)}`;
    $('#sSub').textContent = st.sub + (el >= st.d ? ' — დრო შესრულდა, როცა მზად იქნები.' : '');
    const b = $('#sBtn'); b.hidden = false; b.textContent = st.btn + ` · ${sec} წმ`;
    if (el >= st.d && !s.cue) { s.cue = 1; tone(392, .8, .08); }
    if (el >= st.max) { s.cue = 0; dmtNext(); }
    return;
  } else {
    orb.style.transform = `scale(${(st.orb || .7) + (st.calm ? .05 * Math.sin(Date.now() / 1400) : 0)})`;
    $('#sBig').textContent = st.k === 'count' ? left : st.clock ? `${Math.floor(left / 60)}:${pad(left % 60)}` : st.big;
    $('#sSub').textContent = st.sub;
  }
  s.cue = 0;
  if (el >= st.d) dmtNext();
}
function dmtEnd() {
  const s = SES; gong();
  overlay(`<button class="x" onclick="closeSession(true)">✕</button><div class="sess-top">დასრულდა 🙏</div><div class="orb calm" style="transform:scale(.7)"></div>
    <div class="sess-sub">DMT squeeze შეკავება: ${s.holds.map(x => `<b>${x}წმ</b>`).join(' · ')}${s.bottom ? `<br>შეკავება ქვემოთ: <b>${s.bottom}წმ</b>` : ''}</div>
    <textarea id="dmtAff" class="jin" rows="2" placeholder="რა მანტრა ან აფირმაცია მოვიდა?" style="max-width:340px"></textarea>
    <button class="btn acc" onclick="const a=$('#dmtAff').value.trim(); if(a){const J=sp(TODAY).journal=sp(TODAY).journal||{}; J.aff=a;} closeSession(true)">შენახვა და დასრულება</button>`);
}

// generic paced breathing (4-7-8)
function start478() {
  keepAwake(); const P = [['ჩაისუნთქე ცხვირით', 4, 1], ['შეიკავე', 7, 1], ['ამოისუნთქე პირით, ნელა', 8, .5]];
  SES = { kind: '478', c: 0, p: 0, t0: Date.now() };
  SES.onEnd = () => { markRitual('478', true); };
  overlay(`<button class="x" onclick="closeSession(true)">✕</button><div class="sess-top" id="sTop"></div><div class="orb" id="orb"></div><div class="sess-big" id="sBig"></div><div class="sess-sub" id="sSub"></div>`);
  tone(440, .3, .08);
  SES.int = setInterval(() => { const s = SES; const [txt, dur, sc] = P[s.p]; const el = Date.now() - s.t0, left = dur - Math.floor(el / 1000);
    $('#sTop').textContent = `ციკლი ${s.c + 1}/4`; $('#sSub').textContent = txt; $('#sBig').textContent = Math.max(1, left);
    const prev = P[(s.p + 2) % 3][2], f = Math.min(1, el / (dur * 1000)); $('#orb').style.transform = `scale(${0.5 + 0.5 * (prev + (sc - prev) * f)})`;
    if (el >= dur * 1000) { s.p++; s.t0 = Date.now(); if (s.p > 2) { s.p = 0; s.c++; } if (s.c >= 4) { clearInterval(s.int); gong(); closeSession(true); toast('🌬️ 4-7-8 დასრულდა'); return; } tone([440, 392, 330][s.p], .3, .06); } }, 100);
}
// body scan (≈10 min)
function startScan() {
  keepAwake(); const per = 50; SES = { kind: 'scan', i: 0, t0: Date.now() }; SES.onEnd = () => markRitual('scan', true); tone(392, 1, .1);
  overlay(`<button class="x" onclick="closeSession(true)">✕</button><div class="sess-top" id="sTop"></div><div class="orb calm" id="orb"></div><div class="sess-sub" id="sBig" style="font-size:22px;color:var(--text)"></div><div class="sess-sub" id="sSub"></div>`);
  SES.int = setInterval(() => { const s = SES, i = Math.floor((Date.now() - s.t0) / 1000 / per);
    if (i >= BODY_SCAN.length) { clearInterval(s.int); gong(); closeSession(true); toast('🧘 Body scan დასრულდა — ძილი ნებისა'); return; }
    if (i !== s.i) { s.i = i; tone(392, 1, .06); }
    $('#sTop').textContent = `${i + 1}/${BODY_SCAN.length}`; $('#sBig').textContent = BODY_SCAN[i]; $('#sSub').textContent = 'ყურადღება აქ. ჩაისუნთქე ამ ადგილში, ამოსუნთქვაზე მოადუნე.';
    $('#orb').style.transform = `scale(${0.75 + 0.2 * Math.sin(Date.now() / 1600)})`; }, 100);
}
// static pose timer
function startStatic() {
  const target = staticTarget(); keepAwake(); gong();
  SES = { kind: 'static', t0: Date.now(), target, last5: 0 };
  SES.onEnd = () => { const min = Math.floor((Date.now() - SES.t0) / 60000); if (min >= 1) { sp(TODAY).static = { min, t: Date.now(), pose: S.staticPose || '' }; save(); toast(`🧍 სტატიკა: ${min} წთ`); } };
  overlay(`<button class="x" onclick="closeSession(true)">✕</button><div class="sess-top">🧍 სტატიკა · მიზანი ${target} წთ</div><div class="ring-big"><svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="88" stroke="var(--card2)" stroke-width="10" fill="none"/><circle id="stR" cx="100" cy="100" r="88" stroke="var(--acc)" stroke-width="10" fill="none" stroke-linecap="round" stroke-dasharray="553" stroke-dashoffset="553" transform="rotate(-90 100 100)"/></svg><b id="sBig"></b></div><div class="sess-sub" id="sSub">სუნთქე ცხვირით, ნელა. მუხლები რბილად. მხრები ჩამოშვებული. ყოველ 5 წუთში — ნაზი ზარი.</div><button class="btn" onclick="closeSession(true)">დასრულება და ჩაწერა</button>`);
  SES.int = setInterval(() => { const s = SES, el = (Date.now() - s.t0) / 1000, left = Math.max(0, s.target * 60 - el);
    $('#sBig').textContent = `${Math.floor(left / 60)}:${pad(Math.floor(left % 60))}`; $('#stR').style.strokeDashoffset = 553 * (1 - Math.min(1, el / (s.target * 60)));
    const m5 = Math.floor(el / 300); if (m5 > s.last5 && left > 0) { s.last5 = m5; tone(528, 1.2, .08); }
    if (left <= 0 && !s.fin) { s.fin = 1; gong(); $('#sSub').innerHTML = '<b style="color:var(--acc)">✓ მიზანი შესრულდა!</b> შეგიძლია გააგრძელო ან დაასრულო.'; } }, 250);
}

function markRitual(id, on) { const s = sp(TODAY); s.sleep = s.sleep || []; const i = s.sleep.indexOf(id); if (on && i < 0) s.sleep.push(id); if (!on && i >= 0) s.sleep.splice(i, 1); save(); }
function toggleRitual(id) { const s = sp(TODAY); markRitual(id, !(s.sleep || []).includes(id)); render(); }
function saveJournal() {
  const s = sp(TODAY); s.journal = { g: [0, 1, 2].map(i => $('#jg' + i).value.trim()), m: $('#jm').value.trim(), dump: $('#jd').value.trim(), t: Date.now() };
  if (s.journal.g.some(Boolean) || s.journal.m) markRitual('journal', true); if (s.journal.dump) markRitual('dump', true);
  save(); render(); toast('📖 დღიური შენახულია');
}

// ---- view ----
function vSpirit() {
  const s = spGet(TODAY), J = s.journal || {}, tgt = staticTarget(), hr = new Date().getHours();
  const past = Object.entries(S.spirit || {}).filter(([k, v]) => k < TODAY && (v.journal?.g?.some(Boolean) || v.journal?.m)).sort().reverse().slice(0, 10);
  const holds = Object.entries(S.spirit || {}).filter(([, v]) => v.breath).sort().slice(-14).map(([k, v]) => [k, Math.max(...v.breath.r)]);
  const statics = Object.entries(S.spirit || {}).filter(([, v]) => v.static).sort().slice(-14).map(([k, v]) => [k, v.static.min]);
  const card = (st, inner) => `<div class="card ${st === 'miss' ? 'miss' : st === 'done' ? 'ok' : ''}">${inner}</div>`;
  const pillSt = st => st === 'done' ? '<span class="pill good">✓ შესრულდა</span>' : st === 'miss' ? '<span class="pill bad">✕ გამოტოვებული</span>' : st === 'part' ? '<span class="pill warn">ნაწილობრივ</span>' : '';
  return `
  <h1>სული</h1>
  <div class="sub">დილის ენერგია · დღის სიმშვიდე · ღამის გაწმენდა</div>

  <h2>🌅 გაღვიძებისას</h2>
  ${card(spStatus('breath', TODAY), `<div class="row between"><b>🌬️ DMT სუნთქვა</b>${pillSt(spStatus('breath', TODAY))}</div>
    <p class="note">ვიდეოს მიხედვით (Breathe With Sandy), ~16 წთ: შამანური სუნთქვა → შეკავება ზემოთ და ქვემოთ → <b>5 რაუნდი DMT squeeze</b> (30 წმ სუნთქვა → ნელი ჩასუნთქვა მენჯის და მუცლის მოჭიმვით → შეკავება ${DMT_HOLDS.join('/')} წმ) → 3 წთ მედიტაცია.</p>
    ${s.breath ? `<div class="sub">დღეს: შეკავება ${s.breath.r.map(x => `<b>${x}წმ</b>`).join(' · ')}${s.breath.bottom ? ` · ქვემოთ <b>${s.breath.bottom}წმ</b>` : ''}</div>` : ''}
    <button class="btn acc block" style="margin-top:10px" onclick="startBreath()">▶ დაწყება (აპის გიდით)</button>
    <details style="margin-top:8px"><summary class="sub">▶ ან ივარჯიშე ორიგინალ ვიდეოსთან ერთად</summary><div style="margin-top:8px">${video(DMT_VIDEO)}</div></details>
    <details class="note"><summary>როგორ კეთდება</summary><ol style="padding-left:18px;margin:6px 0">
      <li><b>შამანური სუნთქვა:</b> ღია პირით ორი ჩასუნთქვა (მუცელი, მერე მკერდი) და ერთი მოდუნებული ამოსუნთქვა, რიტმულად.</li>
      <li><b>ნელი ჩასუნთქვა „საწრუპით":</b> მუცელი → ნეკნები → გული → ზედა მკერდი → ყელი → სახე.</li>
      <li><b>Squeeze:</b> ჩასუნთქვის დასაწყისში აწიე და მოჭიმე მენჯის ფსკერის კუნთები, შემდეგ მუცელი შეიწიე ხერხემლისკენ და ზემოთ შეიკავე — ყველაფერი დაჭიმული.</li>
      <li>მთელი დროის განმავლობაში მზერა დახუჭული თვალებით შუბლის ცენტრისკენ.</li></ol>
      ვიდეოს ავტორის ახსნით, ეს ზურგის ტვინის სითხეს ფიჭვისებრი ჯირკვლისკენ „ტუმბავს" — ეს მეცნიერულად დადასტურებული არ არის, მაგრამ სუნთქვითი ვარჯიში სტრესის შემცირებასა და ფოკუსში ეხმარება.</details>
    <div class="spine">⚠️ მხოლოდ ჯდომით. არასდროს წყალში, აბაზანაში, საჭესთან. არა — ორსულობის, ეპილეფსიის ან გულის/წნევის პრობლემისას. ჩხვლეტა, თავბრუ, ყურში შუილი ნორმალურია; თუ ცუდად გახდები — გაჩერდი.</div>
    ${holds.length > 1 ? `<div class="sub" style="margin-top:8px">საუკეთესო შეკავება (წმ) — იზრდება, როცა ნერვული სისტემა წყნარდება</div>${lineChart(holds, { color: 'var(--blue)', fmtY: v => v + 'წმ' })}` : ''}`)}

  <h2>🧍 სტატიკა (ასანა)</h2>
  ${card(spStatus('static', TODAY), `<div class="row between"><div><b>დღევანდელი მიზანი: ${tgt} წთ</b><div class="sub">${staticNext()} · სულ ${staticDone()} სესია</div></div>${pillSt(spStatus('static', TODAY))}</div>
    <div class="bar" style="margin:10px 0"><i style="width:${(tgt - 15) / 45 * 100}%"></i></div><div class="row between sub" style="font-size:11px"><span>15 წთ</span><span>60 წთ</span></div>
    ${s.static ? `<p class="note">დღეს: <b>${s.static.min} წთ</b></p>` : ''}
    <label class="f" style="margin-top:8px">პოზა<input value="${esc(S.staticPose || '')}" placeholder="მაგ. ხის პოზა / Zhan Zhuang / Warrior" onchange="S.staticPose=this.value;save()"></label>
    <button class="btn acc block" style="margin-top:10px" onclick="startStatic()">▶ ${tgt} წუთი — დაწყება</button>
    <p class="note">პროგრესია: 3 სესია ყოველ დონეზე, შემდეგ +5 წთ: 15 → 20 → 25 … → 60. ტელეფონის ეკრანი არ ჩაიკეტოს (Settings → Display → Auto-Lock → Never, სანამ დგახარ).</p>
    <details class="note"><summary>დონის ხელით შეცვლა</summary><select onchange="S.staticOverride=+this.value||0;save();render()" style="margin-top:6px;background:var(--card2);border:1px solid var(--line);border-radius:8px;padding:6px"><option value="0">ავტომატური</option>${[15, 20, 25, 30, 35, 40, 45, 50, 55, 60].map(m => `<option ${S.staticOverride === m ? 'selected' : ''} value="${m}">${m} წთ</option>`).join('')}</select></details>
    ${statics.length > 1 ? lineChart(statics, { fmtY: v => v + 'წთ' }) : ''}`)}

  <h2>🌙 ძილის წინ</h2>
  ${card(spStatus('journal', TODAY), `<div class="row between"><b>📖 მადლიერება და მანიფესტაცია</b>${pillSt(spStatus('journal', TODAY))}</div>
    <div class="sub" style="margin-top:8px">დღეს მადლიერი ვარ...</div>
    ${[0, 1, 2].map(i => `<input id="jg${i}" class="jin" value="${esc(J.g?.[i] || '')}" placeholder="${i + 1}. ${['ადამიანი, ვინც დღეს დამეხმარა', 'პატარა რამ, რამაც გამახარა', 'რაღაც ჩემში, რითიც ვამაყობ'][i]}">`).join('')}
    <div class="sub" style="margin-top:10px">მანიფესტაცია — აწმყო დროში, თითქოს უკვე ასეა</div>
    <textarea id="jm" rows="3" class="jin" placeholder="${esc(MANI_PROMPTS[new Date().getDate() % MANI_PROMPTS.length])}">${esc(J.m || '')}</textarea>
    <div class="sub" style="margin-top:10px">📝 Brain dump — რაც თავში ტრიალებს, აქ დატოვე</div>
    <textarea id="jd" rows="3" class="jin" placeholder="ხვალინდელი საქმეები, ფიქრები, საზრუნავი...">${esc(J.dump || '')}</textarea>
    <button class="btn acc block" style="margin-top:10px" onclick="saveJournal()">შენახვა</button>`)}

  <div class="card"><div class="row between"><b>🌌 ძილის გაწმენდის რიტუალი</b><span class="sub">${(s.sleep || []).length}/${SLEEP_RITUAL.length}</span></div>
    ${SLEEP_RITUAL.map(([id, ic, t, p]) => `<div class="rit ${(s.sleep || []).includes(id) ? 'on' : ''}"><button class="ck" onclick="toggleRitual('${id}')" aria-label="${esc(t)}"></button><div><b>${ic} ${t}</b><p>${p}</p>
      ${id === '478' ? '<button class="btn sm acc" onclick="start478()">▶ 4-7-8 (1.5 წთ)</button>' : id === 'scan' ? '<button class="btn sm acc" onclick="startScan()">▶ Body scan (10 წთ)</button>' : ''}</div></div>`).join('')}
    ${hr >= 20 ? '<p class="note">🕯️ რიტუალის თანმიმდევრობა: ეკრანი → brain dump → დღიური → 4-7-8 → body scan საწოლში. ბოლოს ტელეფონი შორს.</p>' : ''}
  </div>

  ${past.length ? `<h2>📚 დღიურის ისტორია</h2>${past.map(([k, v]) => `<details class="card"><summary><b>${k}</b> <span class="sub">${esc((v.journal.g || []).filter(Boolean)[0] || v.journal.m || '').slice(0, 40)}</span></summary>
    ${(v.journal.g || []).filter(Boolean).map(g => `<p class="note">🙏 ${esc(g)}</p>`).join('')}${v.journal.m ? `<p class="note">✨ ${esc(v.journal.m)}</p>` : ''}</details>`).join('')}` : ''}`;
}
