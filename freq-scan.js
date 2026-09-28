// ============ FREQUENCY · scan wizard, shift protocols, share card ============
// Every protocol step: what to do, why it works, and the research behind it. Kinds: breath · sigh · timer · write · act
const PROTOCOLS = {
  ground: [
    { k: 'sigh', min: 3, t: 'Physiological sigh', do: 'Two inhales through the nose (a full one, then a short top-up), then one long, slow exhale through the mouth.', why: 'The fastest real-time way to calm the nervous system. 5 minutes a day improved mood more than mindfulness meditation.', src: 'Balban et al., Cell Reports Medicine 2023' },
    { k: 'write', t: 'Name it', do: 'Write one honest sentence: what exactly do I feel, and where do I feel it in my body?', why: 'Putting a feeling into words turns down the brain’s alarm centre (amygdala).', src: 'Lieberman et al., Psychological Science 2007' },
    { k: 'timer', min: 1, t: 'Cold reset', do: 'Splash cold water on your face or hold something cold on your cheeks for 30–60 seconds.', why: 'Cold on the face triggers the dive reflex — heart rate drops and the body switches to calm.', src: 'Mammalian dive reflex' },
    { k: 'timer', min: 10, t: 'Walk in daylight', do: 'Go outside and walk slowly for 10 minutes. Look far away, not at the phone.', why: 'Daylight and gentle movement lift mood within minutes and reset tonight’s sleep.', src: 'Exercise & mood meta-analyses; circadian research' },
    { k: 'act', t: 'Reach out', do: 'Send one message to someone you trust. Not to solve anything — just to connect.', why: 'Close relationships are the strongest predictor of long-term wellbeing.', src: 'Harvard Study of Adult Development (85 years)' },
  ],
  release: [
    { k: 'timer', min: 3, t: 'Discharge', do: '20 squats, 10 push-ups, then shake out arms and legs. Repeat until the timer ends.', why: 'Short intense movement burns off stress hormones — the urge to react leaves the body instead of your words.', src: 'Acute exercise & stress-hormone research' },
    { k: 'write', t: 'Expressive writing', do: 'Write non-stop for 5–7 minutes: what is really bothering me, and why does it matter to me?', why: 'Writing about what you feel reduces stress and improves health over time.', src: 'Pennebaker, Psychological Science 1997' },
    { k: 'breath', min: 3, inh: 4, exh: 6, t: 'Long exhale', do: 'In through the nose for 4, out slowly for 6.', why: 'A longer exhale activates the vagus nerve and slows the heart.', src: 'Respiratory vagal research' },
    { k: 'write', t: 'One urge I won’t feed today', do: 'Name one urge (scrolling, sugar, an angry reply…) and write: “When I feel it, I will … instead.”', why: 'If-then plans roughly double follow-through.', src: 'Gollwitzer & Sheeran 2006 (meta-analysis)' },
  ],
  build: [
    { k: 'breath', min: 5, inh: 5.5, exh: 5.5, t: 'Resonance breathing', do: 'Breathe with the orb: 5.5 seconds in, 5.5 seconds out.', why: '~6 breaths per minute maximises heart-rate variability — the body’s calm-and-ready state.', src: 'Lehrer & Gevirtz, Frontiers in Psychology 2014' },
    { k: 'write', t: 'Three specific gratitudes', do: 'Write three things you’re grateful for today — specific, not generic (“the way my friend laughed”, not “friends”).', why: 'A simple gratitude practice raises wellbeing and optimism.', src: 'Emmons & McCullough, JPSP 2003' },
    { k: 'timer', min: 10, t: 'One brave action', do: 'Start the one task you’ve been avoiding. Only 10 minutes — just begin.', why: 'Action builds confidence faster than thinking. Courage (200) is the line where you start creating your life instead of reacting to it.', src: 'Behavioural activation research' },
  ],
  expand: [
    { k: 'timer', min: 10, t: 'Stillness', do: 'Sit or stand still, eyes soft, breath low in the belly. Just notice sounds and sensations.', why: 'Regular meditation reduces anxiety and sharpens attention.', src: 'Goyal et al., JAMA Internal Medicine 2014' },
    { k: 'timer', min: 25, t: 'Create', do: 'One focused block: make music, train, or learn. Phone in another room.', why: 'Deep, meaningful work is one of the most reliable sources of lasting positive emotion (“flow”).', src: 'Csikszentmihalyi, Flow' },
    { k: 'write', t: 'Tomorrow’s intention', do: 'One sentence: who do I choose to be tomorrow?', why: 'Clear intentions guide attention and behaviour.', src: 'Goal-setting theory, Locke & Latham' },
  ],
  share: [
    { k: 'write', t: 'Savour', do: 'Write the best moment of today in detail — colours, sounds, people, how it felt.', why: 'Savouring stretches positive emotion and makes it last.', src: 'Bryant & Veroff, Savoring' },
    { k: 'act', t: 'One act of kindness', do: 'Do — or plan — one kind act for someone today.', why: 'Kindness raises happiness for the giver, not only the receiver.', src: 'Lyubomirsky et al. 2005' },
    { k: 'breath', min: 3, inh: 5.5, exh: 5.5, t: 'Anchor it', do: 'Slow breathing to lock the feeling into the body.', why: 'Calm physiology helps high states last instead of burning out.', src: 'HRV coherence research' },
  ],
};
const protoMinutes = (band, quick) => (quick ? PROTOCOLS[band].slice(0, 2) : PROTOCOLS[band]).reduce((a, s) => a + (s.min || 2), 0);

// ================= SCAN =================
let SCAN = null;
function startScan() {
  keepAwake(); SCAN = { i: 0, who: [], stress: 5, control: 5, emo: null, beh: { ...autoBehaviours() } };
  Object.keys(SCAN.beh).forEach(k => SCAN.beh[k] === undefined && delete SCAN.beh[k]);
  SES = { kind: 'scan' }; scanRender();
}
function scanRender() {
  const s = SCAN, total = 9, bar = `<div class="scan-bar"><i style="width:${(s.i / total) * 100}%"></i></div>`;
  let body = '';
  if (s.i === 0) body = `<div class="sess-top">Frequency scan · ~60 s</div><div class="orb calm" style="transform:scale(.55)"></div>
    <h2 class="scan-q">Pause for a moment.</h2><div class="sess-sub">Take one slow breath. Answer honestly — there are no good or bad answers, only where you are right now.</div>
    <button class="btn acc" onclick="SCAN.i++;scanRender()">Begin</button>`;
  else if (s.i <= 5) { const q = s.i - 1;
    body = `<div class="sess-top">Since waking up today…</div><h2 class="scan-q">${WHO5[q]}</h2>
      <div class="scan-opts">${WHO5_SCALE.map((l, v) => `<button class="${s.who[q] === v ? 'on' : ''}" onclick="SCAN.who[${q}]=${v};SCAN.i++;scanRender()"><b>${v}</b>${l}</button>`).join('')}</div>`; }
  else if (s.i === 6) body = `<div class="sess-top">Right now</div><h2 class="scan-q">Stress and control</h2>
    <label class="slider big"><span>😣 Stress</span><input type="range" min="0" max="10" value="${s.stress}" oninput="SCAN.stress=+this.value;this.nextElementSibling.textContent=this.value"><b>${s.stress}</b></label>
    <label class="slider big"><span>🧭 In control</span><input type="range" min="0" max="10" value="${s.control}" oninput="SCAN.control=+this.value;this.nextElementSibling.textContent=this.value"><b>${s.control}</b></label>
    <button class="btn acc" onclick="SCAN.i++;scanRender()">Next</button>`;
  else if (s.i === 7) body = `<div class="sess-top">Right now</div><h2 class="scan-q">Which word is closest to how you feel?</h2>
    <div class="emo-grid">${LADDER.map((l, i) => `<button style="--c:${BANDS[Object.entries(BANDS).find(([, b]) => i >= b.from && i <= b.to)[0]].color}" class="${s.emo === i ? 'on' : ''}" onclick="SCAN.emo=${i};SCAN.i++;scanRender()">${l[2]}</button>`).join('')}</div>`;
  else if (s.i === 8) body = `<div class="sess-top">Last 24 hours</div><h2 class="scan-q">What did you give your body and mind?</h2>
    <div class="beh-grid">${BEHAVIOURS.map(([id, ic, l]) => `<button class="${s.beh[id] ? 'on' : ''}" onclick="SCAN.beh['${id}']=!SCAN.beh['${id}'];scanRender()">${ic} ${l}</button>`).join('')}</div>
    <div class="sub">Some are pre-filled from what you logged in the app.</div>
    <button class="btn acc" onclick="SCAN.i++;scanRender()">See my frequency</button>`;
  else return scanResult();
  overlay(`<button class="x" onclick="closeSession(false)">✕</button>${bar}<div class="scan-body">${body}</div>${s.i > 0 && s.i < 9 ? `<button class="scan-back" onclick="SCAN.i--;scanRender()">← Back</button>` : ''}`);
}
function scanResult() {
  const s = SCAN, rec = { t: Date.now(), who: s.who, stress: s.stress, control: s.control, emo: s.emo, beh: s.beh };
  rec.score = computeScore(rec);
  const F = fr(TODAY); (F.scans = F.scans || []).push(rec); save();
  const st = stepOf(rec.score, rec.emo), B = BANDS[st.band], y = vibeScore(dkey(addDays(new Date(), -1))), avg7 = avgScore(7, 1);
  const cmp = y != null ? rec.score - y : avg7 != null ? Math.round(rec.score - avg7) : null;
  overlay(`<button class="x" onclick="closeSession(false)">✕</button>
    <div class="scan-body result" style="--c:${st.color}">
      <div class="sess-top">Your frequency right now</div>
      <canvas id="wave" class="wave big"></canvas>
      <div class="res-lvl">${st.lvl}</div>
      <div class="res-name">${st.name}</div>
      <div class="res-meta">Score <b id="countUp">0</b>/100 · ${B.name}${cmp != null ? ` · <span style="color:${cmp >= 0 ? 'var(--good)' : 'var(--bad)'}">${cmp >= 0 ? '▲' : '▼'} ${Math.abs(cmp)} ${y != null ? 'vs yesterday' : 'vs your week'}</span>` : ''}</div>
      <p class="sess-sub">${B.goal}</p>
      ${lowForAWhile() ? '<p class="sess-sub" style="color:var(--warn)">Your wellbeing has been low for most of the last two weeks. That’s worth talking about with someone you trust or a professional — you don’t have to carry it alone.</p>' : ''}
      <button class="btn acc block" onclick="startShift('${st.band}')">🌊 Raise it · full shift ~${protoMinutes(st.band)} min</button>
      <div class="row" style="gap:8px;width:100%"><button class="btn" style="flex:1" onclick="startShift('${st.band}',true)">Quick shift ~${protoMinutes(st.band, true)} min</button><button class="btn" onclick="shareCard()">Share</button></div>
      <button class="scan-back" onclick="closeSession(false)">Later</button>
    </div>`);
  const el = $('#countUp'); let n = 0; const tick = () => { n = Math.min(rec.score, n + Math.max(1, Math.round(rec.score / 30))); if (el) { el.textContent = n; if (n < rec.score) requestAnimationFrame(tick); } }; tick();
  startWave(rec.score, $("#sess canvas.wave")); navigator.vibrate?.(30); tone(392 + rec.score * 3, 1.2, .06);
}

// ================= SHIFT (guided raise) =================
let SH = null;
function startShift(band, quick) {
  keepAwake(); const steps = quick ? PROTOCOLS[band].slice(0, 2) : PROTOCOLS[band];
  SH = { band, quick: !!quick, steps, i: -1, pre: { mood: 5, energy: 5, calm: 5 }, post: { mood: 5, energy: 5, calm: 5 }, notes: [] };
  SES = { kind: 'shift' }; shiftRender();
}
const feel3 = (key) => ['mood', 'energy', 'calm'].map(id => `<label class="slider big"><span>${{ mood: '🙂 Mood', energy: '⚡ Energy', calm: '🌊 Calm' }[id]}</span><input type="range" min="1" max="10" value="${SH[key][id]}" oninput="SH.${key}.${id}=+this.value;this.nextElementSibling.textContent=this.value"><b>${SH[key][id]}</b></label>`).join('');
function shiftRender() {
  clearInterval(SH.int); const B = BANDS[SH.band], n = SH.steps.length;
  const bar = `<div class="scan-bar"><i style="width:${Math.max(0, (SH.i + 1) / (n + 1)) * 100}%;background:${B.color}"></i></div>`;
  const shell = inner => overlay(`<button class="x" onclick="closeSession(false)">✕</button>${bar}<div class="scan-body">${inner}</div>`);
  if (SH.i === -1) return shell(`<div class="sess-top">${B.name} → up · ${SH.quick ? 'quick' : 'full'} shift</div><h2 class="scan-q">Before we start — how do you feel?</h2>${feel3('pre')}
    <p class="sess-sub">We’ll measure again at the end, so you can see the shift for yourself.</p><button class="btn acc" onclick="SH.i++;shiftRender()">Start</button>`);
  if (SH.i >= n) return shell(`<div class="sess-top">Done · how do you feel now?</div><h2 class="scan-q">Notice the difference</h2>${feel3('post')}<button class="btn acc" onclick="shiftDone()">Show my shift</button>`);
  const st = SH.steps[SH.i], next = `<button class="btn acc" onclick="${st.k === 'write' ? "SH.notes.push($('#shW').value);" : ''}SH.i++;shiftRender()">${SH.i === n - 1 ? 'Finish' : 'Next step'} →</button>`;
  const head = `<div class="sess-top">Step ${SH.i + 1} of ${n}</div><h2 class="scan-q">${st.t}</h2><p class="sess-sub">${st.do}</p>`;
  const why = `<details class="why-src"><summary>Why this works</summary>${st.why}<br><i>${st.src}</i></details>`;
  if (st.k === 'write') return shell(`${head}<textarea id="shW" class="jin" rows="4" placeholder="Write here…"></textarea>${why}${next}`);
  if (st.k === 'act') return shell(`${head}<div class="orb calm" style="transform:scale(.45)"></div>${why}${next}`);
  // timed steps: breath · sigh · timer
  shell(`${head}<div class="orb ${st.k === 'timer' ? 'calm' : ''}" id="orb"></div><div class="sess-big" id="sBig"></div><div class="sess-sub" id="sSub"></div>${why}${next}`);
  const t0 = Date.now(), dur = st.min * 60;
  SH.int = setInterval(() => {
    const el = (Date.now() - t0) / 1000, left = Math.max(0, Math.ceil(dur - el)), orb = $('#orb'); if (!orb) return clearInterval(SH.int);
    $('#sBig').textContent = `${Math.floor(left / 60)}:${pad(left % 60)}`;
    if (st.k === 'breath') { const cyc = st.inh + st.exh, p = el % cyc, inh = p < st.inh; orb.style.transform = `scale(${inh ? .5 + .5 * p / st.inh : 1 - .5 * (p - st.inh) / st.exh})`; $('#sSub').textContent = inh ? `Inhale… ${st.inh}s` : `Exhale… ${st.exh}s`; }
    else if (st.k === 'sigh') { const p = el % 9; const sc = p < 2 ? .5 + .35 * p / 2 : p < 3 ? .85 + .15 * (p - 2) : 1 - .5 * (p - 3) / 6; orb.style.transform = `scale(${sc})`; $('#sSub').textContent = p < 2 ? 'Inhale through the nose…' : p < 3 ? '…one more short sip of air' : 'Long, slow exhale through the mouth'; }
    else { orb.style.transform = `scale(${.6 + .06 * Math.sin(el / 1.6)})`; $('#sSub').textContent = left ? '' : 'Time — tap next when ready'; }
    if (left === 0 && !SH.rang) { SH.rang = 1; gong(); }
  }, 80); SH.rang = 0; SES.int = SH.int;
}
function shiftDone() {
  const avg = o => (o.mood + o.energy + o.calm) / 3, delta = Math.round((avg(SH.post) - avg(SH.pre)) * 10);
  const F = fr(TODAY); (F.shifts = F.shifts || []).push({ t: Date.now(), band: SH.band, quick: SH.quick, pre: SH.pre, post: SH.post, delta, notes: SH.notes.filter(Boolean) });
  const base = vibeScore() ?? 50, now = Math.max(1, Math.min(100, base + Math.round(delta / 2))), st = stepOf(now, lastScan()?.emo); save();
  overlay(`<button class="x" onclick="closeSession(false)">✕</button><div class="scan-body result" style="--c:${st.color}">
    <div class="sess-top">Your shift</div><div class="res-lvl" style="color:${delta >= 0 ? 'var(--good)' : 'var(--warn)'}">${delta >= 0 ? '+' : ''}${delta}</div>
    <div class="res-name">${delta >= 10 ? 'You moved.' : delta > 0 ? 'A real step up.' : 'Seeds planted.'}</div>
    <p class="sess-sub">${delta > 0 ? `Mood, energy and calm rose by ${delta} points in ${SH.quick ? 'a few' : '~' + protoMinutes(SH.band)} minutes. That’s your frequency responding to what you do — not luck.` : 'Some days the shift shows up later — in your sleep, your choices, your mood tomorrow. Consistency is what moves the needle.'}</p>
    <p class="sess-sub">Feels like <b style="color:${st.color}">${st.name} · ${st.lvl}</b> now. Rescan anytime to lock in the new level.</p>
    <button class="btn acc block" onclick="closeSession(false);startScan()">Rescan</button><button class="scan-back" onclick="closeSession(false)">Close</button></div>`);
  gong();
}

// ================= SHARE CARD =================
function shareCard() {
  const sc = vibeScore() ?? 50, st = stepOf(sc, lastScan()?.emo), W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#16232a'); gr.addColorStop(1, '#0c1114'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const rg = g.createRadialGradient(W / 2, 420, 20, W / 2, 420, 520); rg.addColorStop(0, st.color + '55'); rg.addColorStop(1, 'transparent'); g.fillStyle = rg; g.fillRect(0, 0, W, H);
  for (let L = 0; L < 3; L++) { g.beginPath(); g.lineWidth = L ? 3 : 8; g.strokeStyle = st.color; g.globalAlpha = L ? 0.35 : 1; const cyc = 1 + sc / 100 * 2.6, amp = 70 + sc * 1.4;
    for (let x = 0; x <= W; x += 6) { const y = 420 + Math.sin(x / W * cyc * Math.PI * 2 + L) * amp * (1 - L * .25) * Math.sin(Math.PI * x / W); x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
  g.globalAlpha = 1; g.textAlign = 'center'; g.fillStyle = '#e7eef0';
  g.font = '600 40px Manrope, -apple-system, sans-serif'; g.fillText('MY FREQUENCY TODAY', W / 2, 150);
  g.fillStyle = st.color; g.font = '800 240px Manrope, -apple-system, sans-serif'; g.fillText(String(st.lvl), W / 2, 860);
  g.font = '800 96px Manrope, -apple-system, sans-serif'; g.fillText(st.name, W / 2, 990);
  g.fillStyle = '#a3b3ba'; g.font = '500 40px Manrope, -apple-system, sans-serif'; g.fillText(`${new Date().toDateString()} · score ${sc}/100`, W / 2, 1070);
  g.fillText('Raise yours → Frequency · PPL Coach', W / 2, 1240);
  overlay(`<button class="x" onclick="closeSession(false)">✕</button><div class="scan-body"><div class="sess-top">Share your frequency</div><img src="${c.toDataURL('image/png')}" alt="Frequency card" style="width:min(320px,80vw);border-radius:18px;box-shadow:0 20px 60px rgba(0,0,0,.5)"><p class="sess-sub">Long-press the image → <b>Save to Photos</b> or <b>Share</b>.</p><button class="btn" onclick="closeSession(false)">Done</button></div>`);
}
