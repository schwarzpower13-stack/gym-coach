// ============ FREQUENCY · page, living wave, sound bath ============
let _waveRAF = {};
function startWave(score, cv) {
  cv = cv || [...document.querySelectorAll('canvas.wave')].pop(); if (!cv) return;
  const id = cv.id || 'w'; cancelAnimationFrame(_waveRAF[id]);
  const dpr = devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr;
  const g = cv.getContext('2d'); g.scale(dpr, dpr);
  const sc = score ?? vibeScore() ?? 50, col = stepOf(sc).color, cycles = 1 + sc / 100 * 2.6, amp = H * (0.14 + sc / 100 * 0.2);
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
const noteName = hz => { const n = Math.round(12 * Math.log2(hz / 440) + 69), N = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']; return N[n % 12] + (Math.floor(n / 12) - 1); };

// ---- sound bath: soft tones + resonance breathing ----
const TONES = { t432: ['432 Hz drone', 432], t528: ['528 Hz drone', 528], theta: ['Theta 6 Hz binaural · headphones', 0], ocean: ['Ocean', -1] };
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
    const min = Math.round((Date.now() - SES.t0) / 60000); if (save_ && min >= 1) { const F = fr(TODAY); F.tune = (F.tune || 0) + min; save(); toast(`${min} min of calm`); } closeSession(false); };
  SES.finish = finish;
  overlay(`<button class="x" onclick="SES.finish(true)">✕</button><div class="sess-top">${TONES[kind][0]} · ${minutes} min</div><div class="orb calm" id="orb"></div><div class="sess-big" id="sBig"></div><div class="sess-sub" id="sSub"></div><button class="btn" onclick="SES.finish(true)">Finish</button>`);
  SES.int = setInterval(() => {
    const el = (Date.now() - SES.t0) / 1000, ph = (el % 11) / 11, inh = ph < 0.5, left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
    $('#orb').style.transform = `scale(${0.55 + 0.45 * Math.sin(ph * Math.PI)})`;
    $('#sBig').textContent = `${Math.floor(left / 60)}:${pad(left % 60)}`; $('#sSub').textContent = inh ? 'Breathe in… 5.5' : 'Breathe out… 5.5';
    if (left <= 0) { gong(); finish(true); }
  }, 100);
}

// ---- page ----
function vFreq() {
  const scan = lastScan(), v3 = scan?.v === 3 ? scan : null, reading = latestReading(), v = vibeToday(), st = v ? stepOf(v.score) : null;
  const shifts = (frGet(TODAY).shifts || []).filter(s => s.plan), lastShift = shifts[shifts.length - 1], plan = v3 ? planFor(v3.dims) : null;
  const hist = lastDays(30).map(k => [k, lastScan(k)]).filter(([, s]) => s).map(([k, s]) => [k, s.freq || freqIndex(s.score)]);
  const fieldHist = v3Scans().filter(s => s.m?.field?.ok).slice(-14).map(s => [s.k, s.m.field.width]);
  const ins = insights(), avg7 = avgScore(7, 1), trend = v && avg7 != null ? freqIndex(v.score) - freqIndex(avg7) : null;
  setTimeout(() => startWave(v?.score, $('#wave')), 0);
  return `
  <div class="card freq-hero" style="--c:${st ? st.color : 'var(--lav)'}">
    <canvas id="wave" class="wave" aria-hidden="true"></canvas>
    ${v ? `<div class="fh-top"><div><div class="sub">Your frequency${reading?.kind === 'after' ? ' · after tune-up' : ''}</div><div class="fh-lvl">${reading?.freq || st.lvl}</div><div class="fh-name">${st.name}</div></div>
        <div class="fh-side"><span class="pill" style="border-color:${st.color};color:${st.color}">${BANDS[st.band].name}</span>${trend != null ? `<div class="sub" style="color:${trend >= 0 ? 'var(--good)' : 'var(--bad)'}">${trend >= 0 ? '▲' : '▼'} ${Math.abs(trend)} vs your week</div>` : ''}<div class="sub">${reading ? 'measured ' + new Date(reading.t).toTimeString().slice(0, 5) : ''}</div></div></div>
        <p class="fh-goal">${BANDS[st.band].read}</p>
        ${v3 ? `<button class="btn acc block" onclick="startTuneUp()">Tune up · ~${planMin(plan)} min</button>` : ''}
        <button class="btn ${v3 ? '' : 'acc'} block" style="margin-top:8px" onclick="startMeasure()">${v3 ? 'Measure again' : 'Measure with sensors · 2 min'}</button>`
      : `<div class="fh-top"><div><div class="sub">Your frequency</div><div class="fh-lvl">—</div><div class="fh-name">Not measured</div></div></div>
        <p class="fh-goal">Two minutes. Nothing to fill in. Your breath, your voice and how much of your surroundings you actually take in are read by the phone’s own sensors — and turned into one number.</p>
        <button class="btn acc block" onclick="startMeasure()">Measure my frequency</button>`}
  </div>

  ${lastShift ? `<div class="card shift-card"><div class="sub">Today’s tune-up</div><div class="cmp-big small"><span>${lastShift.before}</span><i>→</i><span style="color:var(--good)">${lastShift.after}</span></div><div class="sub">${lastShift.plan.map(t => TECH[t].t).join(' · ')}</div></div>` : ''}

  ${v3 ? `<div class="card"><b>Spectrum</b>${spectrum(v3.dims, v3.m)}</div>` : ''}
  ${v3?.m.field?.ok ? `<div class="card lens"><div>${fieldSVG(v3.m.field.map, st.color, 132)}</div><div><b>Your lens</b><p class="sub">You caught <b>${v3.m.field.width}%</b> of what flashed at the edges${v3.m.smiles?.ok ? ` and spotted <b>${v3.m.smiles.perMin}</b> smiles a minute` : ''}. In a contracted state this shrinks — in an open state the world gets in.</p></div></div>` : ''}

  ${hist.length > 1 ? `<div class="card"><b>Frequency · 30 days</b>${lineChart(hist, { color: 'var(--lav)', fmtY: v => v })}</div>` : ''}
  ${fieldHist.length > 1 ? `<div class="card"><b>Field of view · recent</b>${lineChart(fieldHist, { color: 'var(--acc)', fmtY: v => v + '%' })}</div>` : ''}
  ${ins.length ? `<div class="card"><b>What raises yours</b>${ins.slice(0, 5).map(x => `<div class="ins"><span>${x.label}</span><b style="color:${x.d > 0 ? 'var(--good)' : 'var(--bad)'}">${x.d > 0 ? '+' : ''}${x.d}</b></div>`).join('')}<p class="note">Your average frequency on days with vs without — from your own ${ins[0].n} readings and what the app already logs.</p></div>`
    : `<div class="card"><b>What raises yours</b><p class="note">After six days of readings the app shows which of your habits — sleep, training, sauna, breathwork, journaling — move your frequency most. Personal, measured, nothing to fill in.</p></div>`}

  <h2>Techniques</h2>
  <div class="tech-grid">${Object.entries(TECH).map(([id, T]) => `<div class="tech"><img loading="lazy" src="https://i.ytimg.com/vi/${T.video}/mqdefault.jpg" alt=""><div class="tech-b"><b>${T.t}</b><small>${T.min} min · ${T.for.map(d => DIMS[d].t).join(', ')}</small><p>${T.effect}</p><div class="row" style="gap:6px"><button class="btn sm acc" onclick="practice('${id}')">Practice</button><button class="btn sm" onclick="startTuneUp('${id}')">With before/after</button></div></div></div>`).join('')}</div>

  <details class="card"><summary><b>Sound bath</b> <span class="sub">tones + slow breathing</span></summary>
    <div class="tunes">${Object.entries(TONES).map(([k, [n]]) => `<div class="tune"><b>${n}</b><div class="row" style="gap:6px">${[5, 10, 20].map(m => `<button class="chip" onclick="startTune('${k}',${m})">${m} min</button>`).join('')}</div></div>`).join('')}</div></details>

  <details class="card ladder-card"><summary><b>The scale</b> <span class="sub">20 → 600</span></summary>
    <div class="ladder">${LADDER.map((l, i) => [l, i]).reverse().map(([l, i]) => { const b = Object.values(BANDS).find(x => i >= x.from && i <= x.to);
      return `${i === 7 ? '<div class="line200">200 — below it life happens to you, above it you create it</div>' : ''}<div class="rung ${st && st.i === i ? 'on' : ''}" style="--c:${b.color}"><b>${l[0]}</b><span>${l[1]}</span><small>${b.name}</small></div>`; }).join('')}</div></details>

  <details class="card"><summary><b>How it’s measured</b></summary>
    <div class="how-grid">
      <p><b>Breath</b> — the accelerometer reads your chest: rate per minute, how even the rhythm is, how still you are. Slow and even means a settled nervous system.</p>
      <p><b>Voice</b> — the microphone reads a sustained hum: pitch, jitter (tiny pitch wobble) and shimmer (loudness wobble). Tension shows in the voice before you notice it.</p>
      <p><b>Perception</b> — how wide your field of view is and how fast you find the positive in a crowd. Stress narrows both; calm widens them.</p>
      <p><b>Heart</b> (optional) — fingertip on the camera: heart rate and HRV, the gold-standard stress signal.</p>
      <p><b>Recovery</b> — sleep and resting heart rate from Apple Health.</p>
      <p class="sub">After five readings every dimension is also compared with your own normal. The index uses the 20–600 language of Hawkins’ Map of Consciousness; what’s measured is your nervous system and perception, not a physical vibration. Not a medical device.</p>
    </div></details>`;
}

function vMind() {
  const sp = vSpirit(), cut = sp.indexOf('<!--SEG:morning-->');
  return segmented('spirit', { freq: 'Frequency', morning: 'Morning', evening: 'Evening' }, sp.slice(0, cut) + '<!--SEG:freq-->' + vFreq() + sp.slice(cut));
}
