// ============ FREQUENCY · immersive flows: measure → read → tune → measure again → compare ============
const TECH = {
  sigh:      { t: 'Physiological sigh', min: 3, video: 'kSZKIupBUuc', vlen: '4:48', guide: 'sigh', for: ['breath', 'heart', 'perception'],
               how: ['Inhale deeply through the nose.', 'At the top, sip in a second short inhale to fully open the lungs.', 'Let it all go through the mouth — a long, slow exhale.'],
               effect: 'The fastest known way to downshift the nervous system in real time — one to three sighs already slow the heart.' },
  resonance: { t: 'Resonance breathing', min: 5, video: 'ZXh-IGyBegQ', vlen: '5:01', guide: 'res', for: ['heart', 'breath'],
               how: ['In through the nose for 5.5 seconds.', 'Out through the nose for 5.5 seconds.', 'Belly soft, shoulders still. Follow the light.'],
               effect: 'At about 5.5 breaths a minute heart rhythm, breath and blood pressure fall into sync — heart-rate variability rises.' },
  bhramari:  { t: 'Humming bee breath', min: 3, video: 'KkurfEQrg94', vlen: '2:09', guide: 'hum', for: ['voice', 'breath'],
               how: ['Close your eyes. Optionally close your ears with your thumbs.', 'Inhale through the nose.', 'Exhale on a long, even “mmmm”. Keep the tone as steady as you can — the ring shows how steady you are.'],
               effect: 'A long humming exhale stimulates the vagus nerve and steadies the voice — you can watch the steadiness climb.' },
  panoramic: { t: 'Panoramic vision', min: 2, video: 'jp5vzd9R360', vlen: '0:52', guide: 'pano', for: ['perception'],
               how: ['Look at one point far away — a window, a wall across the room.', 'Without moving your eyes, widen your attention to everything at the edges at once.', 'Keep the face and jaw soft. Breathe slowly.'],
               effect: 'Narrow, focused vision is wired to alertness; wide panoramic vision is wired to calm. Widening the gaze widens the mind.' },
  box:       { t: 'Box breathing', min: 3, video: 'tEmt1Znux58', vlen: '2:48', guide: 'box', for: ['breath', 'voice'],
               how: ['Inhale for 4.', 'Hold for 4.', 'Exhale for 4.', 'Hold for 4 — and again.'],
               effect: 'An even, square rhythm gives a racing mind something steady to follow.' },
  nsdr:      { t: 'Non-sleep deep rest', min: 10, video: 'KHIbgSN2qAU', vlen: '10:43', guide: 'video', for: ['recovery'],
               how: ['Lie down and close your eyes.', 'Follow the voice in the video.', 'Let the body get heavy. You don’t need to fall asleep.'],
               effect: 'Deep rest without sleep restores energy and focus — useful after a short night.' },
};
const PLAN_FOR = { breath: ['sigh', 'resonance'], voice: ['bhramari'], perception: ['panoramic', 'sigh'], heart: ['resonance'], recovery: ['nsdr'] };
function planFor(dims) {
  const order = weakest(dims), out = [];
  for (const d of order) for (const t of PLAN_FOR[d] || []) if (!out.includes(t) && out.length < 3 && (t !== 'nsdr' || order[0] === 'recovery')) out.push(t);
  for (const t of ['sigh', 'panoramic', 'resonance']) if (out.length < 2 && !out.includes(t)) out.push(t);
  return out;
}
const planMin = p => p.reduce((a, t) => a + TECH[t].min, 0);

// ---------- overlay plumbing ----------
let FLOW = null;
function stage(html, prog) {
  overlay(`<button class="x" onclick="abortFlow()">✕</button>${prog != null ? `<div class="scan-bar"><i style="width:${prog * 100}%"></i></div>` : ''}<div class="scan-body" id="stageBody">${html}</div>`);
  return $('#stageBody');
}
function abortFlow() { try { recordMotion.cancel?.(); recordVoice.cancel?.(); FLOW?.mic?.close(); FLOW?.cam?.close(); clearInterval(FLOW?.int); } catch { } FLOW = null; closeSession(false); }
const alive = () => FLOW && SES;
function waitTap(id = 'go', before) { return new Promise(r => { const b = $('#' + id); if (b) b.onclick = () => r(before ? before() : true); }); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ico = {
  breath: '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M3 12c3-6 6 6 9 0s6 6 9 0"/></svg>',
  voice: '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 10v4M8 7v10M12 4v16M16 7v10M20 10v4"/></svg>',
  perception: '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  heart: '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/><path d="M7 12h3l1-2 2 4 1-2h3"/></svg>',
  recovery: '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>',
};
function trace(canvas, values, color = '#86d5c0') {
  const g = canvas.getContext('2d'), W = canvas.width = canvas.clientWidth * 2, H = canvas.height = canvas.clientHeight * 2; g.clearRect(0, 0, W, H);
  if (values.length < 2) return; const mn = Math.min(...values), mx = Math.max(...values), span = mx - mn || 1;
  g.beginPath(); g.lineWidth = 4; g.strokeStyle = color; g.lineJoin = 'round';
  values.forEach((v, i) => { const x = i / (values.length - 1) * W, y = H - 8 - (v - mn) / span * (H - 16); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke();
}

// ---------- measurement steps ----------
async function stepBreath(sec, prog) {
  stage(`<div class="step-ico">${ico.breath}</div><div class="sess-top">Breath · ${sec} s</div><h2 class="scan-q">Lie back and rest the phone flat on your chest</h2>
    <p class="sess-sub">Screen facing up. Breathe naturally — don’t change anything. A soft tone will tell you when it’s done.</p><button class="btn acc" id="go">Start</button><button class="scan-back" id="skip">Skip</button>`, prog);
  const skip = new Promise(r => { $('#skip').onclick = () => r('skip'); });
  const ok = await Promise.race([waitTap('go', () => motionPermission()), skip]); if (ok === 'skip' || !alive()) return null;
  if (!(await ok)) { toast('Motion access was declined — skipping breath'); return null; }
  stage(`<div class="sess-top">Breathing naturally…</div><canvas class="live" id="lv"></canvas><div class="sess-big" id="cd">${sec}</div><div class="sess-sub">Keep still. Eyes can close.</div>`, prog);
  const buf = [], t0 = Date.now(); let base = null;
  FLOW.int = setInterval(() => { const el = $('#cd'); if (el) el.textContent = Math.max(0, Math.ceil(sec - (Date.now() - t0) / 1000)); }, 250);
  const rec = await recordMotion(sec, g => { const v = g.z + g.y * 0.3; base = base == null ? v : base * 0.995 + v * 0.005; buf.push(v - base); if (buf.length > 300) buf.shift(); if (buf.length % 3 === 0) { const c = $('#lv'); if (c) trace(c, buf); } });
  clearInterval(FLOW?.int); if (!alive()) return null; gong();
  const res = analyseBreath(rec); if (!res.ok) toast(res.why); return res;
}
async function stepVoice(sec, prog) {
  stage(`<div class="step-ico">${ico.voice}</div><div class="sess-top">Voice · ${sec} s</div><h2 class="scan-q">Sit up, take a breath, and hum one steady note</h2>
    <p class="sess-sub">“mmmm” — any comfortable pitch. As even and relaxed as you can, for the whole time.</p><button class="btn acc" id="go">Start humming</button>`, prog);
  let micP; await waitTap('go', () => { micP = openMic().catch(() => null); }); if (!alive()) return null;
  const mic = await micP; if (!mic) { toast('Microphone access is needed for the voice reading'); return null; } FLOW.mic = mic;
  stage(`<div class="sess-top">Hum…</div><canvas class="live" id="lv"></canvas><div class="sess-big" id="hz">—</div><div class="lvl"><i id="lvl"></i></div><div class="sess-sub" id="cd"></div>`, prog);
  const pts = [];
  const frames = await recordVoice(mic, sec, (f0, rms, el) => { if (f0) pts.push(f0); if (pts.length > 120) pts.shift(); const h = $('#hz'); if (h) h.textContent = f0 ? Math.round(f0) + ' Hz' : '…'; const l = $('#lvl'); if (l) l.style.width = Math.min(100, rms * 900) + '%'; const c = $('#lv'); if (c && pts.length % 2 === 0) trace(c, pts, '#b8a8f0'); const cd = $('#cd'); if (cd) cd.textContent = `${Math.max(0, Math.ceil(sec - el))} s`; });
  mic.close(); FLOW.mic = null; if (!alive()) return null;
  const res = analyseVoice(frames, sec); if (!res.ok) toast(res.why); return res;
}
async function stepField(prog, trials) {
  stage(`<div class="step-ico">${ico.perception}</div><div class="sess-top">Perception · field of view</div><h2 class="scan-q">How wide do you see right now?</h2>
    <p class="sess-sub">Hold the phone at reading distance. Look only at the centre + . A dot flashes once, somewhere — then tap the direction it came from.</p><button class="btn acc" id="go">Start</button>`, prog);
  await waitTap(); if (!alive()) return null;
  const host = stage('', prog); return runField(host, trials);
}
async function stepSmiles(prog, rounds) {
  stage(`<div class="step-ico">${ico.perception}</div><div class="sess-top">Perception · opportunities</div><h2 class="scan-q">Find the smile</h2>
    <p class="sess-sub">Every crowd has exactly one smiling face. Find it as fast as you can.</p><button class="btn acc" id="go">Start</button>`, prog);
  await waitTap(); if (!alive()) return null;
  const host = stage('', prog); return runSmiles(host, rounds);
}
async function stepHeart(prog) {
  stage(`<div class="step-ico">${ico.heart}</div><div class="sess-top">Heart · optional · 40 s</div><h2 class="scan-q">Add a heart reading?</h2>
    <p class="sess-sub">Rest your fingertip gently over the back camera (and flash). Works best near a bright light. Gives heart rate and HRV — the most precise stress signal.</p>
    <button class="btn acc" id="go">Measure heart</button><button class="scan-back" id="skip">Skip</button>`, prog);
  const skip = new Promise(r => { $('#skip').onclick = () => r('skip'); });
  const vid = document.createElement('video'); let camP;
  const pick = await Promise.race([waitTap('go', () => { camP = openCamera(vid).catch(() => null); return 'go'; }), skip]); if (pick === 'skip' || !alive()) return null;
  const cam = await camP; if (!cam) { toast('Camera access is needed for the heart reading'); return null; } FLOW.cam = cam;
  stage(`<div class="sess-top">Keep your finger still…</div><canvas class="live" id="lv"></canvas><div class="sess-big" id="cd">40</div>`, prog);
  const samples = [], t0 = performance.now(), show = [];
  await new Promise(res => { FLOW.int = setInterval(() => { const v = cam.read(), t = performance.now(); samples.push({ t, r: v.r }); show.push(-v.r); if (show.length > 150) show.shift(); const c = $('#lv'); if (c) trace(c, show, '#e39a8f'); const cd = $('#cd'); if (cd) cd.textContent = Math.max(0, Math.ceil(40 - (t - t0) / 1000)); if (t - t0 > 40000 || !alive()) { clearInterval(FLOW?.int); res(); } }, 33); });
  cam.close(); if (FLOW) FLOW.cam = null; if (!alive()) return null;
  const r = analyseHeart(samples); if (!r.ok) toast(r.why); return r;
}

// ---------- full measurement ----------
async function measure(kind = 'full') {
  keepAwake(); FLOW = { kind }; SES = { kind: 'flow' };
  const after = kind === 'after', m = {};
  if (!after) { stage(`<div class="orb calm" style="transform:scale(.55)"></div><div class="sess-top">Frequency scan · about 2 minutes</div><h2 class="scan-q">Nothing to fill in. Your body answers.</h2>
      <div class="chips-row">${['breath', 'voice', 'perception', 'heart'].map(d => `<span class="dchip">${ico[d]}${DIMS[d].t}${d === 'heart' ? ' · optional' : ''}</span>`).join('')}</div>
      <p class="sess-sub">Find a quiet place where you can lie back or recline for a minute.</p><button class="btn acc" id="go">Begin</button>`, 0);
    await waitTap(); if (!alive()) return null; }
  m.breath = await stepBreath(after ? 30 : 45, 0.1); if (!alive()) return null;
  m.voice = await stepVoice(after ? 8 : 10, 0.35); if (!alive()) return null;
  m.field = await stepField(0.55, after ? 12 : 16); if (!alive()) return null;
  m.smiles = await stepSmiles(0.75, after ? 6 : 8); if (!alive()) return null;
  if (!after) { m.heart = await stepHeart(0.9); if (!alive()) return null; }
  m.recovery = recoverySignal();
  stage(`<div class="orb" style="transform:scale(.7)" id="orb"></div><div class="sess-top">Reading your signal…</div>`, 1);
  await sleep(1400);
  const dims = dimensionScores(m), score = scoreOf(dims);
  if (score == null) { abortFlow(); toast('Not enough signal — try again in a quiet place'); return null; }
  const slim = JSON.parse(JSON.stringify(m)); if (slim.breath) delete slim.breath.wave;
  const rec = { v: 3, kind, t: Date.now(), m: slim, dims, score, freq: freqIndex(score) };
  const F = fr(TODAY); (F.scans = F.scans || []).push(rec); save();
  return rec;
}
async function startMeasure() { const rec = await measure('full'); if (rec) showReading(rec); }

// ---------- reading ----------
function spectrum(dims, m) {
  const cal = v3Scans().filter(s => s.kind !== 'after').length >= 5;
  return `<div class="spectrum">${Object.keys(DIMS).filter(k => dims[k] != null).map(k => `<div class="sp-row"><span class="sp-ico">${ico[k]}</span><div class="sp-mid"><div class="sp-top"><b>${DIMS[k].t}</b><small>${DIMS[k].unit(metricsLine(m)[k])}</small></div><div class="sp-bar"><i style="width:${Math.round(dims[k] * 100)}%;background:${stepOf(dims[k] * 100).color}"></i></div></div><b class="sp-val">${Math.round(dims[k] * 100)}</b></div>`).join('')}</div>${cal ? '<div class="sub" style="margin-top:6px">Calibrated to your personal normal.</div>' : ''}`;
}
function showReading(rec) {
  const st = stepOf(rec.score), B = BANDS[st.band], plan = planFor(rec.dims), low = weakest(rec.dims).slice(0, 2).map(k => DIMS[k].t.toLowerCase());
  stage(`<div class="result" style="--c:${st.color}">
    <div class="sess-top">Your frequency right now</div><canvas class="wave big" id="rw"></canvas>
    <div class="res-lvl" id="cu">0</div><div class="res-name">${st.name}</div><span class="pill" style="border-color:${st.color};color:${st.color}">${B.name}</span>
    <p class="sess-sub">${B.read}</p>
    ${spectrum(rec.dims, rec.m)}
    ${rec.m.field?.ok ? `<div class="lens"><div>${fieldSVG(rec.m.field.map, st.color, 132)}</div><div><b>Your lens</b><p class="sub">You caught <b>${rec.m.field.width}%</b> of what flashed at the edges${rec.m.smiles?.ok ? ` and spotted <b>${rec.m.smiles.perMin}</b> smiles a minute` : ''}. This is how much of your surroundings is reaching you right now.</p></div></div>` : ''}
    <p class="sess-sub">Pulling it down most: <b>${low.join(' and ')}</b>.</p>
    <button class="btn acc block" onclick="startTuneUp()">Tune up · ~${planMin(plan)} min</button>
    <button class="scan-back" onclick="abortFlow()">Close</button></div>`);
  const el = $('#cu'); let n = 20; const tick = () => { n = Math.min(rec.freq, n + Math.max(2, Math.round(rec.freq / 40))); if (el) { el.textContent = n; if (n < rec.freq) requestAnimationFrame(tick); } }; tick();
  startWave(rec.score, $('#rw')); tone(300 + rec.score * 3, 1.4, .05);
}

// ---------- tune-up: techniques → measure again → compare ----------
async function startTuneUp(only) {
  let before = lastScan();
  if (!before || before.v !== 3) { before = await measure('full'); if (!before) return; }
  const plan = only ? [only] : planFor(before.dims);
  FLOW = { kind: 'tune' }; SES = { kind: 'flow' }; keepAwake();
  for (let i = 0; i < plan.length; i++) { await playTech(plan[i], i, plan.length); if (!alive()) return; }
  stage(`<div class="orb calm" style="transform:scale(.6)"></div><div class="sess-top">Now let’s see what changed</div><h2 class="scan-q">Same tests, one minute.</h2><p class="sess-sub">Your body will show the shift — you don’t have to judge it.</p><button class="btn acc" id="go">Measure again</button>`);
  await waitTap(); if (!alive()) return;
  const after = await measure('after'); if (!after) return;
  const F = fr(TODAY); (F.shifts = F.shifts || []).push({ t: Date.now(), plan, before: before.freq, after: after.freq, delta: after.freq - before.freq }); save();
  showCompare(before, after, plan);
}
function playTech(id, i, n) {
  const T = TECH[id];
  return new Promise(done => {
    stage(`<div class="sess-top">Step ${i + 1} of ${n} · ${T.min} min</div><h2 class="scan-q">${T.t}</h2>
      <details class="watch"><summary>Watch how · ${T.vlen}</summary><div style="margin-top:8px">${video(T.video)}</div></details>
      <ol class="how">${T.how.map(h => `<li>${h}</li>`).join('')}</ol>
      <div class="guide" id="guide"></div><div class="sess-big" id="gt"></div><div class="sess-sub" id="gs"></div>
      <p class="effect">${T.effect}</p>
      <button class="btn acc" id="go">${i === n - 1 ? 'Finish' : 'Next'} →</button>`, (i + 0.5) / (n + 1));
    const end = Date.now() + T.min * 60000, g = $('#guide'); let mic = null, pts = [];
    if (T.guide === 'hum') openMic().then(m => { mic = m; FLOW.mic = m; }).catch(() => { });
    g.innerHTML = T.guide === 'box' ? '<div class="box-g"><i id="bd"></i></div>' : T.guide === 'pano' ? '<div class="pano-g"><i></i><b></b></div>' : T.guide === 'video' ? '' : '<div class="orb" id="gorb"></div>';
    if (T.guide === 'video') { const w = document.querySelector('.watch'); w.open = true; w.querySelector('.play')?.click(); }
    const buf = new Float32Array(2048);
    FLOW.int = setInterval(() => {
      if (!alive()) return clearInterval(FLOW?.int);
      const left = Math.max(0, Math.ceil((end - Date.now()) / 1000)), el = (T.min * 60 - left), gt = $('#gt'), gs = $('#gs'), orb = $('#gorb');
      if (gt) gt.textContent = `${Math.floor(left / 60)}:${pad(left % 60)}`;
      if (T.guide === 'sigh' && orb) { const p = el % 9; orb.style.transform = `scale(${p < 2 ? .5 + .3 * p / 2 : p < 3 ? .8 + .2 * (p - 2) : 1 - .5 * (p - 3) / 6})`; gs.textContent = p < 2 ? 'Inhale through the nose' : p < 3 ? '…top it up' : 'Long exhale through the mouth'; }
      if (T.guide === 'res' && orb) { const p = el % 11, inh = p < 5.5; orb.style.transform = `scale(${inh ? .5 + .5 * p / 5.5 : 1 - .5 * (p - 5.5) / 5.5})`; gs.textContent = inh ? 'In… 5.5' : 'Out… 5.5'; }
      if (T.guide === 'box') { const p = el % 16, side = Math.floor(p / 4), f = (p % 4) / 4, d = $('#bd'); const xy = [[f, 0], [1, f], [1 - f, 1], [0, 1 - f]][side]; if (d) { d.style.left = xy[0] * 100 + '%'; d.style.top = xy[1] * 100 + '%'; } gs.textContent = ['Inhale 4', 'Hold 4', 'Exhale 4', 'Hold 4'][side]; }
      if (T.guide === 'pano') gs.textContent = ['Soft eyes on one far point', 'Now feel the ceiling and the floor at once', 'Left and right edges too — all together', 'Let the whole room in'][Math.floor(el / 8) % 4];
      if (T.guide === 'hum' && orb) {
        if (mic) { mic.an.getFloatTimeDomainData(buf); const p = periodOf(buf, mic.rate); if (p) { pts.push(mic.rate / p.L); if (pts.length > 25) pts.shift(); } else if (pts.length) pts.shift();
          const st = pts.length > 6 ? Math.round(100 * clamp01(1 - sd(pts) / mean(pts) * 12)) : 0; orb.style.transform = `scale(${.5 + st / 200})`; orb.style.filter = `saturate(${0.4 + st / 100})`; gs.textContent = pts.length > 6 ? `Steadiness ${st}%` : 'Inhale… then hum'; }
        else gs.textContent = 'Inhale, then hum a long “mmmm”';
      }
      if (left === 0 && !FLOW.rang) { FLOW.rang = 1; gong(); }
    }, 80); FLOW.rang = 0;
    $('#go').onclick = () => { clearInterval(FLOW.int); mic?.close(); if (FLOW) FLOW.mic = null; done(); };
  });
}
function showCompare(b, a, plan) {
  const sb = stepOf(b.score), sa = stepOf(a.score), d = a.freq - b.freq;
  const row = (label, x, y, unit, better) => x == null || y == null ? '' : `<div class="cmp-row"><span>${label}</span><b>${x}${unit}</b><i>→</i><b style="color:${(better === 'down' ? y < x : y > x) ? 'var(--good)' : y === x ? 'var(--text)' : 'var(--warn)'}">${y}${unit}</b></div>`;
  const fw = [b.m.field?.width, a.m.field?.width], sm = [b.m.smiles?.perMin, a.m.smiles?.perMin];
  const wider = fw[0] && fw[1] ? Math.round((fw[1] - fw[0]) / Math.max(1, fw[0]) * 100) : null, faster = sm[0] && sm[1] ? Math.round((sm[1] - sm[0]) / sm[0] * 100) : null;
  stage(`<div class="result" style="--c:${sa.color}">
    <div class="sess-top">Before → after · ${planMin(plan)} minutes</div>
    <div class="cmp-big"><span style="color:${sb.color}">${b.freq}</span><i>→</i><span style="color:${sa.color}">${a.freq}</span></div>
    <div class="res-name">${d > 0 ? `+${d}` : d}</div><div class="sub">${sb.name} → ${sa.name}</div>
    ${a.m.field?.ok && b.m.field?.ok ? `<div class="lens"><div>${fieldSVG(a.m.field.map, sa.color, 140, b.m.field.map)}</div><div><b>What reaches you now</b><p class="sub">Dashed: your field before. Filled: now.${wider != null ? ` <b>${wider >= 0 ? wider + '% wider' : Math.abs(wider) + '% narrower'}</b>.` : ''}${faster != null ? ` You spot opportunities <b>${faster >= 0 ? faster + '% faster' : Math.abs(faster) + '% slower'}</b>.` : ''}</p></div></div>` : ''}
    <div class="cmp">${row('Breath', b.m.breath?.rate, a.m.breath?.rate, '/min', 'down')}${row('Voice jitter', b.m.voice?.jitter, a.m.voice?.jitter, '%', 'down')}${row('Field of view', fw[0], fw[1], '%')}${row('Smiles found', sm[0], sm[1], '/min')}</div>
    <p class="sess-sub">${compareStory(b, a, d, wider, faster)}</p>
    <button class="btn acc block" onclick="abortFlow()">Done</button><button class="scan-back" onclick="shareCard()">Share my shift</button></div>`);
  if (d > 0) { tone(523, .5, .05); setTimeout(() => tone(659, .5, .05), 180); setTimeout(() => tone(784, .9, .05), 360); }
}
// the closing sentence only claims what the sensors actually showed
function compareStory(b, a, d, wider, faster) {
  const wins = [];
  if (b.m.breath?.rate && a.m.breath?.rate && a.m.breath.rate < b.m.breath.rate - 0.5) wins.push(`your breathing slowed from ${b.m.breath.rate} to ${a.m.breath.rate} per minute`);
  if (b.m.voice?.jitter && a.m.voice?.jitter && a.m.voice.jitter < b.m.voice.jitter - 0.1) wins.push('your voice steadied');
  if (wider > 5) wins.push(`your field of view opened ${wider}%`);
  if (faster > 5) wins.push(`you found the positive ${faster}% faster`);
  if (d > 0 && wins.length) return `Same room, same eyes, a few minutes later — ${wins.join(', ')}. More of the world is getting through. That is what raising your frequency means.`;
  if (d > 0) return 'Your overall signal rose. Some parts moved more than others — keep repeating the techniques that fit you best.';
  return 'The body doesn’t always move on command. The shift often shows up later — in your sleep, your choices, tomorrow’s reading. Keep going.';
}
function practice(id) { FLOW = { kind: 'practice' }; SES = { kind: 'flow' }; keepAwake(); playTech(id, 0, 1).then(() => abortFlow()); }

// ---------- share card ----------
function shareCard() {
  const sc = vibeScore() ?? 50, st = stepOf(sc), W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const sh = (frGet(TODAY).shifts || []).slice(-1)[0];
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#16232a'); gr.addColorStop(1, '#0c1114'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const rg = g.createRadialGradient(W / 2, 420, 20, W / 2, 420, 520); rg.addColorStop(0, st.color + '55'); rg.addColorStop(1, 'transparent'); g.fillStyle = rg; g.fillRect(0, 0, W, H);
  for (let L = 0; L < 3; L++) { g.beginPath(); g.lineWidth = L ? 3 : 8; g.strokeStyle = st.color; g.globalAlpha = L ? 0.35 : 1; const cyc = 1 + sc / 100 * 2.6, amp = 70 + sc * 1.4;
    for (let x = 0; x <= W; x += 6) { const y = 420 + Math.sin(x / W * cyc * Math.PI * 2 + L) * amp * (1 - L * .25) * Math.sin(Math.PI * x / W); x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
  g.globalAlpha = 1; g.textAlign = 'center'; g.fillStyle = '#e7eef0'; g.font = '600 40px Manrope, -apple-system, sans-serif'; g.fillText(sh ? 'MY FREQUENCY SHIFT' : 'MY FREQUENCY TODAY', W / 2, 150);
  g.fillStyle = st.color; g.font = '800 220px Manrope, -apple-system, sans-serif'; g.fillText(sh ? `${sh.before}→${sh.after}` : String(st.lvl), W / 2, 860);
  g.font = '800 96px Manrope, -apple-system, sans-serif'; g.fillText(st.name, W / 2, 990);
  g.fillStyle = '#a3b3ba'; g.font = '500 40px Manrope, -apple-system, sans-serif'; g.fillText(`${new Date().toDateString()} · measured, not guessed`, W / 2, 1070); g.fillText('Frequency · PPL Coach', W / 2, 1240);
  stage(`<div class="sess-top">Share</div><img src="${c.toDataURL('image/png')}" alt="Frequency card" style="width:min(320px,80vw);border-radius:18px;box-shadow:0 20px 60px rgba(0,0,0,.5)"><p class="sess-sub">Long-press the image → <b>Save to Photos</b> or <b>Share</b>.</p><button class="btn" onclick="abortFlow()">Done</button>`);
}
