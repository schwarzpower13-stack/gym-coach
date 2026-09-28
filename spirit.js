// ============ SPIRIT: breathwork · static pose · gratitude & manifestation · sleep ritual ============
const sp = k => ((S.spirit = S.spirit || {})[k] = S.spirit[k] || {});
const spGet = k => (S.spirit || {})[k] || {};

// static pose progression: 3 sessions per level, +5 min, 15 → 60
function staticDone() { return Object.values(S.spirit || {}).filter(x => x.static?.min >= 10).length; }
function staticTarget() { return S.staticOverride || Math.min(60, 15 + 5 * Math.floor(staticDone() / 3)); }
function staticNext() { const n = staticDone(), t = staticTarget(); return t >= 60 ? 'You’re at the max — 60 min' : `Another ${3 - n % 3} sessions → ${t + 5} min`; }

const SLEEP_RITUAL = [
  ['screen', '📵', 'Put the screen away 30-60 min before', 'blue light suppresses melatonin; phone in another room or Night Shift + Sleep Focus.'],
  ['dump', '📝', 'Brain dump — Empty your mind', 'write down tomorrow’s tasks and thoughts. Scullin et al. 2018: 5-minute to-do list speeds up falling asleep by ~9 minutes.'],
  ['journal', '🙏', 'Gratitude + manifestation', '3 gratitudes and a present-tense manifestation — your mind ends the day on a positive note.'],
  ['478', '🌬️', '4-7-8 Breathing ×4', 'Inhale 4, hold 7, exhale 8 — parasympathetic system, heart rate slows down.'],
  ['scan', '🧘', 'Body scan — calm the body', '10 minutes: attention from your toes to your head, every muscle gradually relaxes (Yoga Nidra basics).'],
  ['room', '🌡️', 'Room: cool (18-19°C), dark, quiet', 'a lower body temperature signals sleep. Sleep 1-2 h after a sauna is especially deep.'],
];
const BODY_SCAN = ['Toes and feet', 'Ankles and calves', 'Knees and thighs', 'Pelvis and glutes', 'Belly — breathing slows', 'Lower back and spine — every vertebra releases', 'Chest and heart', 'Shoulders — drop them away from your ears', 'Arms, hands, fingers', 'Neck and jaw — unclench your teeth', 'Face, eyes, forehead', 'The whole body together — heavy, warm, safe'];
const MANI_PROMPTS = ['I am a strong, healthy athlete, and my body grows every day..', 'I am a successful DJ/producer, and my music brings people together..', 'I speak Portuguese and English fluently..', 'Every day brings me closer to my best self..'];

// ---- statuses for discipline ----
function spStatus(kind, k) {
  if (k < since()) return 'none'; if (k > TODAY) return 'fut';
  const s = spGet(k);
  const done = kind === 'breath' ? s.breath : kind === 'static' ? s.static : (s.journal?.g?.some(Boolean) || s.journal?.m);
  if (done) return kind === 'static' && s.static.min < staticTarget() * 0.8 && k === TODAY ? 'part' : 'done';
  return k < TODAY ? 'miss' : 'pend';
}
CATS.push(['breath', '🌬️', 'Breathing'], ['static', '🧍', 'Static pose'], ['journal', '📖', 'Journal']);
XSTAT.breath = k => spStatus('breath', k); XSTAT.static = k => spStatus('static', k); XSTAT.journal = k => spStatus('journal', k);
function spiritLine(k) {
  const s = spGet(k), a = [];
  if (s.breath) a.push(`Breathing ✓ (Hold ${s.breath.r.map(x => x + 's').join('/')})`);
  if (s.static) a.push(`Static pose ${s.static.min} min`);
  if (s.journal?.g?.some(Boolean)) a.push('Gratitude journal ✓');
  if (s.sleep?.length) a.push(`Sleep ritual ${s.sleep.length}/${SLEEP_RITUAL.length}`);
  return a.length ? 'Mind: ' + a.join(', ') : '';
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
const STRAW = ['Belly', 'Ribs', 'Heart', 'Upper chest', 'Throat', 'Face'];
function dmtSteps() {
  const S_ = [
    { k: 'txt', d: 20, top: 'Preparation', big: 'Sit down', sub: 'Spine straight (on a cushion), gentle smile, close your eyes. Gaze with closed eyes — toward the center of your forehead, upward.' },
    { k: 'shaman', d: 165, top: 'Warm-up · shamanic breathing' },
    { k: 'txt', d: 5, top: 'Slowing down', big: 'exhale', sub: 'Slow the breath down. Big exhale.', orb: .55 },
    { k: 'txt', d: 6, top: 'Slowing down', big: 'Inhale → Sigh', sub: 'Big inhale and exhale with a sigh.', orb: .9 },
    { k: 'txt', d: 6, top: 'Slowing down', big: 'One more', sub: 'Big inhale and exhale with a sigh.', orb: .9 },
    { k: 'count', d: 15, top: 'Hold at the top', sub: 'Breathe in fully and hold. Attention on the center of your forehead.', orb: 1 },
    { k: 'free', d: 80, max: 150, top: 'Hold at the bottom', sub: 'Exhale with a sigh and hold on empty lungs. Let the body go, complete relaxation.', btn: 'I inhaled', orb: .45, log: 'bottom' },
    { k: 'count', d: 10, top: 'Recovery', sub: 'Breathe in fully and hold.', orb: 1 },
    { k: 'txt', d: 5, top: 'Recovery', big: 'Sigh', sub: 'Exhale with a sigh. Now — DMT squeeze rounds.', orb: .6 },
  ];
  DMT_HOLDS.forEach((h, i) => {
    const r = `rounds ${i + 1}/5`;
    S_.push({ k: 'shaman', d: 30, top: `${r} · shamanic breathing` });
    S_.push({ k: 'straw', d: 9, top: `${r} · slow inhale` });
    S_.push({ k: 'free', d: h, max: h + 30, top: `${r} · DMT squeeze`, sub: 'hold. Pelvic floor lifted, belly toward the spine, diaphragm tense — squeeze everything. Gaze at the center of your forehead. Expect nothing, just be.', btn: 'I exhaled', orb: 1, squeeze: 1, log: 'r' });
    S_.push({ k: 'txt', d: 6, top: r, big: 'Release', sub: 'Let go of all the locks and exhale with a sigh.', orb: .55 });
    if (i < 4) S_.push({ k: 'txt', d: 15, top: r, big: 'Present', sub: 'A few normal breaths. stay with this feeling.', orb: .6, calm: 1 });
  });
  S_.push({ k: 'txt', d: 180, top: 'Meditation', big: 'Light', sub: 'Normal breathing through the nose. Gaze at the center of your forehead. Let go of the physical body. Let a mantra or affirmation come on its own.', orb: .7, calm: 1, clock: 1 });
  return S_;
}
function drum(v = .35) { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime; o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(45, t + .25); o.connect(g); g.connect(actx.destination); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + .35); o.start(t); o.stop(t + .4); } catch { } }
function startBreath() {
  tone(660, .1, .01); keepAwake();
  SES = { kind: 'dmt', steps: dmtSteps(), i: 0, t0: Date.now(), holds: [], bottom: null, beat: -1 };
  SES.onEnd = () => { if (SES.holds.length) { sp(TODAY).breath = { r: SES.holds, bottom: SES.bottom, v: 2, t: Date.now() }; save(); toast('🌬️ DMT breathing logged'); } };
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
    $('#sBig').textContent = ph < .3 ? 'Belly' : ph < .6 ? 'Chest' : 'Haa';
    $('#sSub').textContent = `Open mouth: two inhales (Belly → Chest), one relaxed exhale. Gaze at the center of your forehead. ${left} s`;
  } else if (st.k === 'straw') {
    const f = Math.min(1, el / st.d), part = Math.min(STRAW.length - 1, Math.floor(f * STRAW.length));
    orb.style.transform = `scale(${.5 + .5 * f})`;
    $('#sBig').textContent = STRAW[part];
    $('#sSub').textContent = f < .2 ? 'Slowly, through the mouth, as if through a straw. Right at the start, squeeze and lift your pelvic floor muscles.' : f < .45 ? 'keep inhaling — pull your belly toward your spine and hold it.' : 'the breath rises — each part „lock" until you reach the top.';
    $('#sSteps').innerHTML = STRAW.map((p, j) => `<span class="${j <= part ? 'on' : ''}">${p}</span>`).join('');
  } else if (st.k === 'free') {
    const sec = Math.floor(el);
    orb.style.transform = `scale(${st.orb + (st.squeeze ? .03 * Math.sin(Date.now() / 300) : 0)})`;
    $('#sBig').textContent = el < st.d ? `${Math.ceil(st.d - el)}` : `+${Math.floor(el - st.d)}`;
    $('#sSub').textContent = st.sub + (el >= st.d ? ' — Time’s up — when you’re ready.' : '');
    const b = $('#sBtn'); b.hidden = false; b.textContent = st.btn + ` · ${sec} s`;
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
  overlay(`<button class="x" onclick="closeSession(true)">✕</button><div class="sess-top">Done 🙏</div><div class="orb calm" style="transform:scale(.7)"></div>
    <div class="sess-sub">DMT squeeze Hold: ${s.holds.map(x => `<b>${x}s</b>`).join(' · ')}${s.bottom ? `<br>Hold at the bottom: <b>${s.bottom}s</b>` : ''}</div>
    <textarea id="dmtAff" class="jin" rows="2" placeholder="What mantra or affirmation came to you?" style="max-width:340px"></textarea>
    <button class="btn acc" onclick="const a=$('#dmtAff').value.trim(); if(a){const J=sp(TODAY).journal=sp(TODAY).journal||{}; J.aff=a;} closeSession(true)">Save and finish</button>`);
}

// generic paced breathing (4-7-8)
function start478() {
  keepAwake(); const P = [['Inhale through the nose', 4, 1], ['hold', 7, 1], ['Exhale through the mouth, slowly', 8, .5]];
  SES = { kind: '478', c: 0, p: 0, t0: Date.now() };
  SES.onEnd = () => { markRitual('478', true); };
  overlay(`<button class="x" onclick="closeSession(true)">✕</button><div class="sess-top" id="sTop"></div><div class="orb" id="orb"></div><div class="sess-big" id="sBig"></div><div class="sess-sub" id="sSub"></div>`);
  tone(440, .3, .08);
  SES.int = setInterval(() => { const s = SES; const [txt, dur, sc] = P[s.p]; const el = Date.now() - s.t0, left = dur - Math.floor(el / 1000);
    $('#sTop').textContent = `Cycle ${s.c + 1}/4`; $('#sSub').textContent = txt; $('#sBig').textContent = Math.max(1, left);
    const prev = P[(s.p + 2) % 3][2], f = Math.min(1, el / (dur * 1000)); $('#orb').style.transform = `scale(${0.5 + 0.5 * (prev + (sc - prev) * f)})`;
    if (el >= dur * 1000) { s.p++; s.t0 = Date.now(); if (s.p > 2) { s.p = 0; s.c++; } if (s.c >= 4) { clearInterval(s.int); gong(); closeSession(true); toast('🌬️ 4-7-8 done'); return; } tone([440, 392, 330][s.p], .3, .06); } }, 100);
}
// body scan (≈10 min)
function startScan() {
  keepAwake(); const per = 50; SES = { kind: 'scan', i: 0, t0: Date.now() }; SES.onEnd = () => markRitual('scan', true); tone(392, 1, .1);
  overlay(`<button class="x" onclick="closeSession(true)">✕</button><div class="sess-top" id="sTop"></div><div class="orb calm" id="orb"></div><div class="sess-sub" id="sBig" style="font-size:22px;color:var(--text)"></div><div class="sess-sub" id="sSub"></div>`);
  SES.int = setInterval(() => { const s = SES, i = Math.floor((Date.now() - s.t0) / 1000 / per);
    if (i >= BODY_SCAN.length) { clearInterval(s.int); gong(); closeSession(true); toast('🧘 Body scan done — sleep well'); return; }
    if (i !== s.i) { s.i = i; tone(392, 1, .06); }
    $('#sTop').textContent = `${i + 1}/${BODY_SCAN.length}`; $('#sBig').textContent = BODY_SCAN[i]; $('#sSub').textContent = 'Attention here. breathe into this area, relax it as you exhale.';
    $('#orb').style.transform = `scale(${0.75 + 0.2 * Math.sin(Date.now() / 1600)})`; }, 100);
}
// static pose timer
function startStatic() {
  const target = staticTarget(); keepAwake(); gong();
  SES = { kind: 'static', t0: Date.now(), target, last5: 0 };
  SES.onEnd = () => { const min = Math.floor((Date.now() - SES.t0) / 60000); if (min >= 1) { sp(TODAY).static = { min, t: Date.now(), pose: S.staticPose || '' }; save(); toast(`🧍 Static pose: ${min} min`); } };
  overlay(`<button class="x" onclick="closeSession(true)">✕</button><div class="sess-top">🧍 Static pose · Goal ${target} min</div><div class="ring-big"><svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="88" stroke="var(--card2)" stroke-width="10" fill="none"/><circle id="stR" cx="100" cy="100" r="88" stroke="var(--acc)" stroke-width="10" fill="none" stroke-linecap="round" stroke-dasharray="553" stroke-dashoffset="553" transform="rotate(-90 100 100)"/></svg><b id="sBig"></b></div><div class="sess-sub" id="sSub">Breathe through the nose, slowly. Knees soft. shoulders down. Every 5 minutes — a soft bell.</div><button class="btn" onclick="closeSession(true)">Finish and log</button>`);
  SES.int = setInterval(() => { const s = SES, el = (Date.now() - s.t0) / 1000, left = Math.max(0, s.target * 60 - el);
    $('#sBig').textContent = `${Math.floor(left / 60)}:${pad(Math.floor(left % 60))}`; $('#stR').style.strokeDashoffset = 553 * (1 - Math.min(1, el / (s.target * 60)));
    const m5 = Math.floor(el / 300); if (m5 > s.last5 && left > 0) { s.last5 = m5; tone(528, 1.2, .08); }
    if (left <= 0 && !s.fin) { s.fin = 1; gong(); $('#sSub').innerHTML = '<b style="color:var(--acc)">✓ Goal reached!</b> You can keep going or finish.'; } }, 250);
}

function markRitual(id, on) { const s = sp(TODAY); s.sleep = s.sleep || []; const i = s.sleep.indexOf(id); if (on && i < 0) s.sleep.push(id); if (!on && i >= 0) s.sleep.splice(i, 1); save(); }
function toggleRitual(id) { const s = sp(TODAY); markRitual(id, !(s.sleep || []).includes(id)); render(); }
function saveJournal() {
  const s = sp(TODAY); s.journal = { g: [0, 1, 2].map(i => $('#jg' + i).value.trim()), m: $('#jm').value.trim(), dump: $('#jd').value.trim(), t: Date.now() };
  if (s.journal.g.some(Boolean) || s.journal.m) markRitual('journal', true); if (s.journal.dump) markRitual('dump', true);
  save(); render(); toast('📖 Journal saved');
}

// ---- view ----
function vSpirit() {
  const s = spGet(TODAY), J = s.journal || {}, tgt = staticTarget(), hr = new Date().getHours();
  const past = Object.entries(S.spirit || {}).filter(([k, v]) => k < TODAY && (v.journal?.g?.some(Boolean) || v.journal?.m)).sort().reverse().slice(0, 10);
  const holds = Object.entries(S.spirit || {}).filter(([, v]) => v.breath).sort().slice(-14).map(([k, v]) => [k, Math.max(...v.breath.r)]);
  const statics = Object.entries(S.spirit || {}).filter(([, v]) => v.static).sort().slice(-14).map(([k, v]) => [k, v.static.min]);
  const card = (st, inner) => `<div class="card ${st === 'miss' ? 'miss' : st === 'done' ? 'ok' : ''}">${inner}</div>`;
  const pillSt = st => st === 'done' ? '<span class="pill good">✓ Done</span>' : st === 'miss' ? '<span class="pill bad">✕ Missed</span>' : st === 'part' ? '<span class="pill warn">Partial</span>' : '';
  return `
  <h1>Mind</h1>
  <div class="sub">Morning energy · daytime calm · nightly cleanse</div>

<!--SEG:morning-->
  <h2>🌅 On waking</h2>
  ${card(spStatus('breath', TODAY), `<div class="row between"><b>🌬️ DMT Breathing</b>${pillSt(spStatus('breath', TODAY))}</div>
    <p class="note">Following the video (Breathe With Sandy), ~16 min: shamanic breathing → hold at the top and the bottom → <b>5 rounds DMT squeeze</b> (30 s breathing → slow inhale with pelvic-floor and belly squeeze → Hold ${DMT_HOLDS.join('/')} s) → 3 min meditation.</p>
    ${s.breath ? `<div class="sub">Today: Hold ${s.breath.r.map(x => `<b>${x}s</b>`).join(' · ')}${s.breath.bottom ? ` · below <b>${s.breath.bottom}s</b>` : ''}</div>` : ''}
    <button class="btn acc block" style="margin-top:10px" onclick="startBreath()">▶ Start (app-guided)</button>
    <details style="margin-top:8px"><summary class="sub">▶ or practice along with the original video</summary><div style="margin-top:8px">${video(DMT_VIDEO)}</div></details>
    <details class="note"><summary>How it’s done</summary><ol style="padding-left:18px;margin:6px 0">
      <li><b>shamanic breathing:</b> open mouth, two inhales (belly, then chest) and one relaxed exhale, rhythmically.</li>
      <li><b>slow inhale „through a straw":</b> Belly → Ribs → Heart → Upper chest → Throat → Face.</li>
      <li><b>Squeeze:</b> at the start of the inhale lift and squeeze your pelvic floor muscles, then pull your belly toward your spine and hold at the top — everything tense.</li>
      <li>The whole time, gaze with closed eyes toward the center of your forehead.</li></ol>
      According to the video’s author, this pumps spinal fluid toward the pineal gland „pumps" — that isn’t scientifically proven, but breathwork does help with stress and focus.</details>
    <div class="spine">⚠️ Seated only. Never in water, in the bath or while driving. Not during pregnancy, epilepsy, or heart/blood-pressure problems. Tingling, dizziness and ringing in the ears are normal; if you feel unwell — stop.</div>
    ${holds.length > 1 ? `<div class="sub" style="margin-top:8px">Best hold (s) — it grows as your nervous system calms down</div>${lineChart(holds, { color: 'var(--blue)', fmtY: v => v + 's' })}` : ''}`)}

  <h2>🧍 Static pose (asana)</h2>
  ${card(spStatus('static', TODAY), `<div class="row between"><div><b>Today’s goal: ${tgt} min</b><div class="sub">${staticNext()} · total ${staticDone()} sessions</div></div>${pillSt(spStatus('static', TODAY))}</div>
    <div class="bar" style="margin:10px 0"><i style="width:${(tgt - 15) / 45 * 100}%"></i></div><div class="row between sub" style="font-size:11px"><span>15 min</span><span>60 min</span></div>
    ${s.static ? `<p class="note">Today: <b>${s.static.min} min</b></p>` : ''}
    <label class="f" style="margin-top:8px">Pose<input value="${esc(S.staticPose || '')}" placeholder="e.g. tree pose / Zhan Zhuang / Warrior" onchange="S.staticPose=this.value;save()"></label>
    <button class="btn acc block" style="margin-top:10px" onclick="startStatic()">▶ ${tgt} minutes — Start</button>
    <p class="note">Progression: 3 sessions per level, then +5 min: 15 → 20 → 25 … → 60. Don’t let the phone screen lock (Settings → Display → Auto-Lock → Never, while you’re standing).</p>
    <details class="note"><summary>Change level manually</summary><select onchange="S.staticOverride=+this.value||0;save();render()" style="margin-top:6px;background:var(--card2);border:1px solid var(--line);border-radius:8px;padding:6px"><option value="0">Automatic</option>${[15, 20, 25, 30, 35, 40, 45, 50, 55, 60].map(m => `<option ${S.staticOverride === m ? 'selected' : ''} value="${m}">${m} min</option>`).join('')}</select></details>
    ${statics.length > 1 ? lineChart(statics, { fmtY: v => v + 'min' }) : ''}`)}

<!--SEG:evening-->
  <h2>🌙 Before bed</h2>
  ${card(spStatus('journal', TODAY), `<div class="row between"><b>📖 Gratitude & manifestation</b>${pillSt(spStatus('journal', TODAY))}</div>
    <div class="sub" style="margin-top:8px">Today I’m grateful for...</div>
    ${[0, 1, 2].map(i => `<input id="jg${i}" class="jin" value="${esc(J.g?.[i] || '')}" placeholder="${i + 1}. ${['a person who helped me today', 'a small thing that made me happy', 'something in me I’m proud of'][i]}">`).join('')}
    <div class="sub" style="margin-top:10px">Manifestation — in the present tense, as if it’s already true</div>
    <textarea id="jm" rows="3" class="jin" placeholder="${esc(MANI_PROMPTS[new Date().getDate() % MANI_PROMPTS.length])}">${esc(J.m || '')}</textarea>
    <div class="sub" style="margin-top:10px">📝 Brain dump — leave here whatever is spinning in your head</div>
    <textarea id="jd" rows="3" class="jin" placeholder="tomorrow’s tasks, thoughts, worries...">${esc(J.dump || '')}</textarea>
    <button class="btn acc block" style="margin-top:10px" onclick="saveJournal()">Save</button>`)}

  <div class="card"><div class="row between"><b>🌌 Sleep cleanse ritual</b><span class="sub">${(s.sleep || []).length}/${SLEEP_RITUAL.length}</span></div>
    ${SLEEP_RITUAL.map(([id, ic, t, p]) => `<div class="rit ${(s.sleep || []).includes(id) ? 'on' : ''}"><button class="ck" onclick="toggleRitual('${id}')" aria-label="${esc(t)}"></button><div><b>${ic} ${t}</b><p>${p}</p>
      ${id === '478' ? '<button class="btn sm acc" onclick="start478()">▶ 4-7-8 (1.5 min)</button>' : id === 'scan' ? '<button class="btn sm acc" onclick="startScan()">▶ Body scan (10 min)</button>' : ''}</div></div>`).join('')}
    ${hr >= 20 ? '<p class="note">🕯️ Ritual order: screen → brain dump → Journal → 4-7-8 → body scan in bed. finally, phone far away.</p>' : ''}
  </div>

  ${past.length ? `<h2>📚 Journal history</h2>${past.map(([k, v]) => `<details class="card"><summary><b>${k}</b> <span class="sub">${esc((v.journal.g || []).filter(Boolean)[0] || v.journal.m || '').slice(0, 40)}</span></summary>
    ${(v.journal.g || []).filter(Boolean).map(g => `<p class="note">🙏 ${esc(g)}</p>`).join('')}${v.journal.m ? `<p class="note">✨ ${esc(v.journal.m)}</p>` : ''}</details>`).join('')}` : ''}`;
}
