// ============ FREQUENCY: check-in → vibe score (a metaphor), real hum-pitch test, calming tones ============
const VIBE_LEVELS = [
  [0, 'Low tide', '#e39a8f', 'Your system is asking for rest, not force. Hydrate, eat, go to bed early. A 10-minute walk and 5 slow breaths are enough today.'],
  [35, 'Grounded', '#e6c27f', 'Stable base. One small win (a walk, a good meal, 5 minutes of humming) will lift you into flow.'],
  [55, 'Flow', '#9fd49a', 'Good rhythm. Protect it: train with focus, eat well, keep the evening calm.'],
  [70, 'Radiant', '#86d5c0', 'High energy and calm together — a great day to push a PR or create something.'],
  [85, 'Peak', '#b8a8f0', 'Rare air. Enjoy it, share it, and still go to bed on time.'],
];
const CHECKS = [['mood', '🙂', 'Mood'], ['energy', '⚡', 'Energy'], ['calm', '🌊', 'Calm'], ['grat', '🙏', 'Gratitude'], ['connect', '🤝', 'Connection']];
const fr = k => ((S.freq = S.freq || {})[k] = S.freq[k] || {});
const frGet = k => (S.freq || {})[k] || {};
const level = sc => [...VIBE_LEVELS].reverse().find(l => sc >= l[0]);

function vibeScore(k = TODAY) {
  const f = frGet(k); if (!f.check) return null;
  const c = CHECKS.reduce((a, [id]) => a + (f.check[id] || 5), 0) / CHECKS.length / 10;
  const h = S.health[k] || {}, body = [];
  if (h.sleep) body.push(Math.min(1, h.sleep / 8));
  if (k === TODAY) { const rd = readiness(); if (rd) body.push(rd.sc / 100); }
  if (f.hum) body.push(f.hum.steady / 100);
  const b = body.length ? body.reduce((x, y) => x + y) / body.length : c;
  let habit = c;
  if (k === TODAY) { const it = todayItems(); habit = Math.min(1, it.filter(x => DONE(x.s)).length / Math.max(4, it.length * 0.6)); }
  const sc = Math.round((c * 0.55 + b * 0.25 + habit * 0.2) * 100);
  return Math.max(1, Math.min(100, sc));
}
function vibeToday() { const sc = vibeScore(); if (sc == null) return null; const l = level(sc); return { score: sc, name: l[1], color: l[2], tip: l[3] }; }

function saveCheck() {
  const f = fr(TODAY); f.check = {}; CHECKS.forEach(([id]) => f.check[id] = +$('#ck_' + id).value); f.word = $('#ck_word').value.trim(); f.t = Date.now();
  save(); render(); const v = vibeToday(); toast(`〰️ ${v.name} · ${v.score}`);
}

// ---- living wave (canvas): frequency, amplitude and colour follow the score ----
let _waveRAF;
function startWave() {
  cancelAnimationFrame(_waveRAF); const cv = $('#wave'); if (!cv) return;
  const dpr = devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr;
  const g = cv.getContext('2d'); g.scale(dpr, dpr);
  const sc = vibeScore() ?? 50, col = (level(sc) || VIBE_LEVELS[2])[2], cycles = 1 + sc / 100 * 2.6, amp = H * (0.12 + sc / 100 * 0.18);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const draw = t => {
    if (!document.body.contains(cv)) return;
    g.clearRect(0, 0, W, H);
    for (let layer = 0; layer < 3; layer++) {
      g.beginPath(); g.lineWidth = layer ? 1.2 : 2.6; g.strokeStyle = col; g.globalAlpha = layer ? 0.28 - layer * 0.06 : 0.95;
      const ph = t / (2200 + layer * 900) + layer * 1.3;
      for (let x = 0; x <= W; x += 3) { const y = H / 2 + Math.sin(x / W * cycles * Math.PI * 2 + ph) * amp * (1 - layer * 0.25) * Math.sin(Math.PI * x / W); x ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke();
    }
    g.globalAlpha = 1; if (!reduce) _waveRAF = requestAnimationFrame(draw);
  };
  draw(0);
}

// ---- hum test: real pitch (Hz) + steadiness from the microphone ----
function detectPitch(buf, rate) {
  let rms = 0; for (const v of buf) rms += v * v; rms = Math.sqrt(rms / buf.length); if (rms < 0.012) return null;
  const minLag = Math.floor(rate / 500), maxLag = Math.floor(rate / 70); let best = -1, bestC = 0;
  for (let lag = minLag; lag <= maxLag; lag++) { let c = 0; for (let i = 0; i < buf.length - lag; i++) c += buf[i] * buf[i + lag]; if (c > bestC) { bestC = c; best = lag; } }
  let norm = 0; for (const v of buf) norm += v * v;
  return best > 0 && bestC / norm > 0.5 ? rate / best : null;
}
const noteName = hz => { const n = Math.round(12 * Math.log2(hz / 440) + 69), N = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']; return N[n % 12] + (Math.floor(n / 12) - 1); };
async function humTest() {
  let stream; try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }); }
  catch { toast('🎙️ Microphone access is needed for the hum test'); return; }
  actx = actx || new (window.AudioContext || window.webkitAudioContext)(); await actx.resume();
  const src = actx.createMediaStreamSource(stream), an = actx.createAnalyser(); an.fftSize = 2048; src.connect(an);
  const buf = new Float32Array(an.fftSize), pitches = [], dur = 12000, t0 = Date.now(); let voiced = 0;
  SES = { kind: 'hum' };
  overlay(`<button class="x" onclick="SES.stop()">✕</button><div class="sess-top">Hum test · 12 s</div><div class="orb calm" id="orb"></div><div class="sess-big" id="sBig">—</div><div class="sess-sub" id="sSub">Close your mouth and hum one comfortable, steady note — like “mmmm”. Long, slow, relaxed.</div>`);
  const stop = () => { clearInterval(SES.int); stream.getTracks().forEach(t => t.stop()); };
  SES.stop = () => { stop(); closeSession(false); };
  SES.int = setInterval(() => {
    an.getFloatTimeDomainData(buf); const p = detectPitch(buf, actx.sampleRate), el = Date.now() - t0;
    if (p) { pitches.push(p); voiced += 50; $('#sBig').textContent = Math.round(p) + ' Hz'; $('#orb').style.transform = `scale(${0.7 + Math.min(0.3, voiced / dur * 0.4)})`; }
    else $('#orb').style.transform = 'scale(.6)';
    if (el >= dur) {
      stop();
      if (pitches.length < 20) { closeSession(false); toast('Couldn’t hear a steady hum — try a bit louder'); return; }
      const sorted = [...pitches].sort((a, b) => a - b), med = sorted[Math.floor(sorted.length / 2)];
      const mean = pitches.reduce((a, b) => a + b) / pitches.length, sd = Math.sqrt(pitches.reduce((a, b) => a + (b - mean) ** 2, 0) / pitches.length);
      const steady = Math.round(100 * Math.max(0, 1 - Math.min(1, (sd / mean) * 6))), sec = Math.round(voiced / 100) / 10;
      fr(TODAY).hum = { hz: Math.round(med), steady, sec, note: noteName(med), t: Date.now() }; save();
      overlay(`<button class="x" onclick="closeSession(false)">✕</button><div class="sess-top">Your hum</div><div class="sess-big">${Math.round(med)} Hz</div>
        <div class="sess-sub">Note <b>${noteName(med)}</b> · steadiness <b>${steady}%</b> · voiced ${sec} s<br><br>${steady >= 80 ? 'Very steady — your nervous system is calm.' : steady >= 55 ? 'Fairly steady. A few slow breaths and a longer exhale will smooth it out.' : 'Wobbly today — that’s a signal to slow down. Try 5 rounds of humming breath (bhramari).'}</div>
        <button class="btn acc" onclick="closeSession(false)">Done</button>`);
    }
  }, 50);
}

// ---- calming sound + coherent breathing (5.5 breaths/min) ----
const TONES = { t432: ['432 Hz drone', 432], t528: ['528 Hz drone', 528], theta: ['Theta 6 Hz binaural (headphones)', 0], ocean: ['Ocean noise', -1] };
function startTune(kind, minutes) {
  actx = actx || new (window.AudioContext || window.webkitAudioContext)(); actx.resume(); keepAwake();
  const out = actx.createGain(); out.gain.value = 0; out.gain.linearRampToValueAtTime(0.22, actx.currentTime + 4); out.connect(actx.destination);
  const nodes = [];
  const osc = (f, v, pan) => { const o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = f; g.gain.value = v; o.connect(g);
    if (pan != null) { const p = actx.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(out); } else g.connect(out); o.start(); nodes.push(o); };
  const f = TONES[kind][1];
  if (f > 0) { osc(f, 0.5); osc(f * 1.5, 0.12); osc(f / 2, 0.25); const lfo = actx.createOscillator(), lg = actx.createGain(); lfo.frequency.value = 0.09; lg.gain.value = 0.08; lfo.connect(lg); lg.connect(out.gain); lfo.start(); nodes.push(lfo); }
  else if (f === 0) { osc(200, 0.5, -1); osc(206, 0.5, 1); }
  else { const len = actx.sampleRate * 4, b = actx.createBuffer(1, len, actx.sampleRate), d = b.getChannelData(0); let last = 0; for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
    const n = actx.createBufferSource(); n.buffer = b; n.loop = true; const lp = actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; const sw = actx.createGain(); n.connect(lp); lp.connect(sw); sw.connect(out);
    const lfo = actx.createOscillator(), lg = actx.createGain(); lfo.frequency.value = 1 / 11; lg.gain.value = 0.5; lfo.connect(lg); lg.connect(sw.gain); lfo.start(); n.start(); nodes.push(n, lfo); }
  const end = Date.now() + minutes * 60000;
  SES = { kind: 'tune', t0: Date.now() };
  const finish = save_ => { clearInterval(SES.int); out.gain.cancelScheduledValues(actx.currentTime); out.gain.setValueAtTime(out.gain.value, actx.currentTime); out.gain.linearRampToValueAtTime(0, actx.currentTime + 2); setTimeout(() => nodes.forEach(n => { try { n.stop(); } catch { } }), 2200);
    const min = Math.round((Date.now() - SES.t0) / 60000); if (save_ && min >= 1) { const F = fr(TODAY); F.tune = (F.tune || 0) + min; save(); toast(`〰️ ${min} min of calm`); } closeSession(false); };
  SES.finish = finish;
  overlay(`<button class="x" onclick="SES.finish(true)">✕</button><div class="sess-top">${TONES[kind][0]} · ${minutes} min</div><div class="orb calm" id="orb"></div><div class="sess-big" id="sBig"></div><div class="sess-sub" id="sSub"></div><button class="btn" onclick="SES.finish(true)">Finish</button>`);
  SES.int = setInterval(() => {
    const el = (Date.now() - SES.t0) / 1000, ph = (el % 11) / 11, inh = ph < 0.5, left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
    $('#orb').style.transform = `scale(${inh ? 0.55 + 0.45 * Math.sin(ph * Math.PI) : 0.55 + 0.45 * Math.sin(ph * Math.PI)})`;
    $('#sBig').textContent = `${Math.floor(left / 60)}:${pad(left % 60)}`; $('#sSub').textContent = inh ? 'Breathe in through the nose… 5.5 s' : 'Breathe out, slow and soft… 5.5 s';
    if (left <= 0) { gong(); finish(true); }
  }, 100);
}

function vFreq() {
  const f = frGet(TODAY), v = vibeToday(), ck = f.check || {};
  const hist = lastDays(14).map(k => [k, vibeScore(k)]).filter(p => p[1] != null);
  setTimeout(startWave, 0);
  return `
  <div class="card freq-hero">
    <canvas id="wave" class="wave" aria-hidden="true"></canvas>
    ${v ? `<div class="fh-row"><div><div class="sub">Your frequency today</div><div class="fh-score" style="color:${v.color}">${v.score}<span>/100</span></div><b style="color:${v.color}">${v.name}</b></div>
      <div class="fh-tip">${v.tip}</div></div>` : `<div class="fh-row"><div><div class="sub">Your frequency today</div><div class="fh-score">—</div><b>Check in below</b></div><div class="fh-tip">Five quick sliders. It takes 20 seconds and tunes the whole app to how you actually feel.</div></div>`}
    <div class="fh-scale">${VIBE_LEVELS.map(l => `<span style="--c:${l[2]}" class="${v && v.name === l[1] ? 'on' : ''}">${l[1]}</span>`).join('')}</div>
  </div>

  <div class="card"><b>🎚️ Check-in</b><span class="sub"> · how are you, honestly?</span>
    ${CHECKS.map(([id, ic, l]) => `<label class="slider"><span>${ic} ${l}</span><input type="range" id="ck_${id}" min="1" max="10" value="${ck[id] || 6}" oninput="this.nextElementSibling.textContent=this.value"><b>${ck[id] || 6}</b></label>`).join('')}
    <input id="ck_word" class="jin" placeholder="One word for today (optional)" value="${esc(f.word || '')}">
    <button class="btn acc block" style="margin-top:10px" onclick="saveCheck()">${f.check ? 'Update' : 'Save'} check-in</button></div>

  <div class="card"><div class="row between"><b>🎙️ Hum test</b>${f.hum ? `<span class="pill good">${f.hum.hz} Hz · ${f.hum.steady}% steady</span>` : ''}</div>
    <p class="note">This one is a <b>real measurement</b>: hum a steady note for 12 seconds and the app reads the pitch of your voice and how steady it is. A long, steady hum means a calm nervous system — humming lengthens the exhale and stimulates the vagus nerve.</p>
    <button class="btn block" onclick="humTest()">🎙️ Start hum test</button></div>

  <div class="card"><b>🎧 Tune in</b><p class="note">Soft tones with slow breathing at 5.5 breaths per minute — the pace that measurably raises heart-rate variability (resonance breathing). The tones themselves are for relaxation; the breathing does the work.</p>
    <div class="tunes">${Object.entries(TONES).map(([k, [n]]) => `<div class="tune"><b>${n}</b><div class="row" style="gap:6px">${[5, 10, 20].map(m => `<button class="chip" onclick="startTune('${k}',${m})">${m} min</button>`).join('')}</div></div>`).join('')}</div>
    ${f.tune ? `<div class="sub" style="margin-top:8px">Today: ${f.tune} min of calm</div>` : ''}</div>

  ${hist.length > 1 ? `<div class="card"><b>〰️ Last 14 days</b>${lineChart(hist, { color: 'var(--lav)', fmtY: v => v })}</div>` : ''}
  <p class="note" style="text-align:center">“Frequency” here is a metaphor for your overall state, built from how you feel, your body data and your habits — not a physical measurement of vibrations. The hum test is the one real frequency reading.</p>`;
}

function vMind() {
  const sp = vSpirit(), cut = sp.indexOf('<!--SEG:morning-->');
  return segmented('spirit', { freq: '〰️ Frequency', morning: '🌅 Morning', evening: '🌙 Evening' }, sp.slice(0, cut) + '<!--SEG:freq-->' + vFreq() + sp.slice(cut));
}
