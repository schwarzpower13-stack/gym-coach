// ============ FREQUENCY · page, living wave, hum test, tune-in ============
const PRINCIPLES = [
  ['Your state is your lens', 'In a low state the brain scans for threats and remembers the bad; in a high state it notices chances and people. Same world, different life.', 'Bower 1981 — mood-congruent memory & attention'],
  ['Low states choose short-term relief', 'Stress pushes the brain from thoughtful choices to habits and quick fixes — scrolling, sugar, snapping at people. The choices then feed the low state.', 'Schwabe & Wolf 2009 — stress and habitual decisions'],
  ['High states broaden and build', 'Positive emotion widens attention and, over weeks, builds real resources: skills, health, relationships.', 'Fredrickson 2001 — broaden-and-build theory'],
  ['Like attracts like', 'Moods spread through people up to three degrees of separation. Your frequency shapes who comes close and how they respond to you.', 'Fowler & Christakis, BMJ 2008'],
  ['The body leads the mind', 'Breath, sleep, light and movement change your state faster than thinking. One night of bad sleep makes the brain’s alarm 60% more reactive.', 'Balban 2023; Yoo et al. 2007'],
  ['Name it to tame it', 'Honestly naming where you are is the first step up. You can’t raise what you won’t look at.', 'Lieberman et al. 2007 — affect labelling'],
  ['Small daily shifts compound', 'New habits take on average ~66 days to become automatic. One scan and one shift a day is how the baseline itself moves up.', 'Lally et al. 2010'],
];

// ---- living wave: frequency, amplitude and colour follow the score ----
let _waveRAF = {};
function startWave(score, cv) {
  cv = cv || [...document.querySelectorAll('canvas.wave')].pop(); if (!cv) return;
  const id = cv.id || 'w'; cancelAnimationFrame(_waveRAF[id]);
  const dpr = devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr;
  const g = cv.getContext('2d'); g.scale(dpr, dpr);
  const sc = score ?? vibeScore() ?? 50, col = stepOf(sc, lastScan()?.emo).color, cycles = 1 + sc / 100 * 2.6, amp = H * (0.14 + sc / 100 * 0.2);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const draw = t => {
    if (!document.body.contains(cv)) return;
    g.clearRect(0, 0, W, H);
    for (let layer = 0; layer < 3; layer++) {
      g.beginPath(); g.lineWidth = layer ? 1.2 : 2.8; g.strokeStyle = col; g.globalAlpha = layer ? 0.3 - layer * 0.07 : 0.95;
      const ph = t / (2200 + layer * 900) + layer * 1.3;
      for (let x = 0; x <= W; x += 3) { const y = H / 2 + Math.sin(x / W * cycles * Math.PI * 2 + ph) * amp * (1 - layer * 0.25) * Math.sin(Math.PI * x / W); x ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke();
    }
    g.globalAlpha = 1; if (!reduce) _waveRAF[id] = requestAnimationFrame(draw);
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
  overlay(`<button class="x" onclick="SES.stop()">✕</button><div class="sess-top">Hum test · 12 s</div><div class="orb calm" id="orb"></div><div class="sess-big" id="sBig">—</div><div class="sess-sub" id="sSub">Close your mouth and hum one comfortable, steady note — “mmmm”. Long, slow, relaxed.</div>`);
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
        <div class="sess-sub">Note <b>${noteName(med)}</b> · steadiness <b>${steady}%</b> · voiced ${sec} s<br><br>${steady >= 80 ? 'Very steady — your nervous system is calm.' : steady >= 55 ? 'Fairly steady. A few slow breaths and a longer exhale will smooth it out.' : 'Wobbly today — a signal to slow down. Try 5 rounds of humming breath (bhramari).'}<br><br>Your steadiness now counts in your frequency score.</div>
        <button class="btn acc" onclick="closeSession(false)">Done</button>`);
    }
  }, 50);
}

// ---- calming sound + resonance breathing (5.5 breaths/min) ----
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
    $('#orb').style.transform = `scale(${0.55 + 0.45 * Math.sin(ph * Math.PI)})`;
    $('#sBig').textContent = `${Math.floor(left / 60)}:${pad(left % 60)}`; $('#sSub').textContent = inh ? 'Breathe in through the nose… 5.5 s' : 'Breathe out, slow and soft… 5.5 s';
    if (left <= 0) { gong(); finish(true); }
  }, 100);
}

// ---- page ----
function vFreq() {
  const v = vibeToday(), f = frGet(TODAY), scan = lastScan(), avg7 = avgScore(7, 1), trend = v && avg7 != null ? Math.round(v.score - avg7) : null;
  const st = v ? stepOf(v.score, scan?.emo) : null, band = st ? st.band : 'build', ins = insights(), sh = shiftsAll(), allScans = Object.values(S.freq || {}).reduce((a, x) => a + (x.scans?.length || 0), 0);
  const hist = lastDays(30).map(k => [k, vibeScore(k)]).filter(p => p[1] != null);
  const avgShift = sh.length ? Math.round(sh.reduce((a, s) => a + s.delta, 0) / sh.length) : null;
  setTimeout(() => startWave(v?.score, $('#wave')), 0);
  return `
  <div class="card freq-hero" style="--c:${st ? st.color : 'var(--lav)'}">
    <canvas id="wave" class="wave" aria-hidden="true"></canvas>
    ${v ? `<div class="fh-top"><div><div class="sub">Your frequency</div><div class="fh-lvl">${st.lvl}</div><div class="fh-name">${st.name}</div></div>
        <div class="fh-side"><span class="pill" style="border-color:${st.color};color:${st.color}">${BANDS[band].name}</span><div class="sub">score ${v.score}/100</div>${trend != null ? `<div class="sub" style="color:${trend >= 0 ? 'var(--good)' : 'var(--bad)'}">${trend >= 0 ? '▲' : '▼'} ${Math.abs(trend)} vs your week</div>` : ''}<div class="sub">${scan ? 'scanned ' + new Date(scan.t).toTimeString().slice(0, 5) : 'quick check-in'}</div></div></div>
        <p class="fh-goal">${BANDS[band].goal}</p>
        <button class="btn acc block" onclick="startShift('${band}')">🌊 Raise my frequency · ~${protoMinutes(band)} min</button>
        <div class="row" style="gap:8px;margin-top:8px"><button class="btn" style="flex:1" onclick="startScan()">↻ Rescan</button><button class="btn" style="flex:1" onclick="startShift('${band}',true)">⚡ Quick ~${protoMinutes(band, true)} min</button><button class="btn" onclick="shareCard()" aria-label="Share">⤴</button></div>`
      : `<div class="fh-top"><div><div class="sub">Your frequency</div><div class="fh-lvl">?</div><div class="fh-name">Not measured yet</div></div></div>
        <p class="fh-goal">Five honest questions about your day, your stress, one feeling and what you gave your body — about 60 seconds. You’ll see exactly where you vibrate right now and how to rise.</p>
        <button class="btn acc block" onclick="startScan()">〰️ Scan my frequency · 60 s</button>`}
  </div>

  <details class="card ladder-card" ${v ? '' : 'open'}><summary><b>🪜 The ladder</b> <span class="sub">16 levels · where you are</span></summary>
    <div class="ladder">${LADDER.map((l, i) => [l, i]).reverse().map(([l, i]) => { const b = Object.entries(BANDS).find(([, x]) => i >= x.from && i <= x.to)[1];
      return `${i === 7 ? '<div class="line200">— the 200 line: below it life happens to you, above it you create it —</div>' : ''}<div class="rung ${st && st.i === i ? 'on' : ''}" style="--c:${b.color}"><b>${l[0]}</b><span>${l[1]}</span><small>${l[2]}</small></div>`; }).join('')}</div>
    <p class="note">Level names and numbers follow David R. Hawkins’ <i>Map of Consciousness</i> — a spiritual framework used here as a ladder to climb. Your position on it is calculated from validated measures, not guessed.</p></details>

  <div class="card"><div class="row between"><b>🌊 Your protocol · ${BANDS[band].name}</b><span class="sub">~${protoMinutes(band)} min</span></div>
    <ol class="steps proto">${PROTOCOLS[band].map(s => `<li><b>${s.t}</b>${s.min ? ` <span class="sub">· ${s.min} min</span>` : ''}<p>${s.do}</p><small>${s.src}</small></li>`).join('')}</ol>
    <button class="btn acc block" onclick="startShift('${band}')">Start the shift</button></div>

  <div class="card"><b>🔍 What moves YOUR frequency</b>
    ${ins.length ? ins.slice(0, 5).map(x => `<div class="ins"><span>${x.ic} ${x.label}</span><b style="color:${x.d > 0 ? 'var(--good)' : 'var(--bad)'}">${x.d > 0 ? '+' : ''}${x.d}</b></div>`).join('') + `<p class="note">Average score on days with vs without, from your last ${ins[0].n} scans.</p>`
      : `<p class="note">After a week of daily scans, the app shows which habits raise your frequency the most — your personal data, not general advice. ${allScans ? `${allScans} scan${allScans > 1 ? 's' : ''} so far.` : ''}</p>`}</div>

  <div class="grid3"><div class="stat"><span>Scan streak</span><b>${scanStreak()}</b></div><div class="stat"><span>Shifts</span><b>${sh.length}</b></div><div class="stat"><span>Avg shift</span><b>${avgShift != null ? (avgShift >= 0 ? '+' : '') + avgShift : '—'}</b></div></div>
  ${hist.length > 1 ? `<div class="card"><b>〰️ 30 days</b>${lineChart(hist, { color: 'var(--lav)', fmtY: v => v })}</div>` : ''}
  <div class="badges">${BADGES.map(([id, ic, l, ok]) => `<div class="badge ${ok() ? 'on' : ''}"><i>${ic}</i><span>${l}</span></div>`).join('')}</div>

  <h2>🧰 Tools</h2>
  <div class="card"><div class="row between"><b>🎙️ Hum test</b>${f.hum ? `<span class="pill good">${f.hum.hz} Hz · ${f.hum.steady}% steady</span>` : ''}</div>
    <p class="note">A <b>real measurement</b>: hum one steady note for 12 seconds; the app reads your voice’s pitch and how steady it is. Steadiness feeds your body score — a long, even hum means a calm nervous system.</p>
    <button class="btn block" onclick="humTest()">🎙️ Start hum test</button></div>
  <div class="card"><b>🎧 Tune in</b><p class="note">Soft tones while you breathe at 5.5 breaths per minute — the pace that measurably raises heart-rate variability. The tones relax; the breathing does the work.</p>
    <div class="tunes">${Object.entries(TONES).map(([k, [n]]) => `<div class="tune"><b>${n}</b><div class="row" style="gap:6px">${[5, 10, 20].map(m => `<button class="chip" onclick="startTune('${k}',${m})">${m} min</button>`).join('')}</div></div>`).join('')}</div>
    ${f.tune ? `<div class="sub" style="margin-top:8px">Today: ${f.tune} min of calm</div>` : ''}</div>

  <h2>📜 The Frequency Principle</h2>
  <div class="card manifesto"><p class="lead">Low frequency attracts low-quality outcomes — not by magic, but because a low state changes what you notice, what you choose and who you draw close. Raise your frequency, and your world responds.</p>
    ${PRINCIPLES.map(([t, p, s], i) => `<details><summary><b>${i + 1}. ${t}</b></summary><p>${p}</p><small>${s}</small></details>`).join('')}</div>
  <p class="note" style="text-align:center">How it’s measured: WHO-5 Well-Being Index (35%), stress & sense of control (15%), the feeling you choose (20%), body signals — sleep, readiness, hum steadiness (15%) — and your last 24 hours of habits (15%). It measures your state, not physical vibrations. Not a medical tool.</p>`;
}

function vMind() {
  const sp = vSpirit(), cut = sp.indexOf('<!--SEG:morning-->');
  return segmented('spirit', { freq: '〰️ Frequency', morning: '🌅 Morning', evening: '🌙 Evening' }, sp.slice(0, cut) + '<!--SEG:freq-->' + vFreq() + sp.slice(cut));
}
