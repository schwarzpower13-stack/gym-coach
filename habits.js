// ============ HABITS · nothing is ticked by hand — it completes when it's actually done with the app ============
// drink moment · morning glass (water + creatine, stacked on the breathing) · timed swim/sauna · night mode · room check

// ---------- drink moment (20 s) / morning glass (30 s, with creatine) ----------
function drinkMoment(creatine) {
  keepAwake(); const dur = creatine ? 30 : 20, t0 = Date.now(); SES = { kind: 'drink' };
  overlay(`<button class="x" onclick="closeSession(false)">✕</button>
    <div class="sess-top">${creatine ? 'Morning glass · water + creatine' : 'Drink moment'}</div>
    <div class="glass"><i id="gl"></i></div><div class="sess-big" id="gt">${dur}</div><div class="sess-sub" id="gs"></div>`);
  SES.int = setInterval(() => {
    const el = (Date.now() - t0) / 1000, f = Math.min(1, el / dur), gl = $('#gl'), gs = $('#gs'); if (!gl) return clearInterval(SES?.int);
    gl.style.height = (f * 88) + '%'; $('#gt').textContent = Math.max(0, Math.ceil(dur - el));
    gs.textContent = creatine && el < 10 ? 'Fill a glass with water and stir in one scoop (5 g) of creatine.' : 'Drink slowly — sip by sip. Notice the water.';
    if (el >= dur) {
      clearInterval(SES.int); S.water[TODAY] = (S.water[TODAY] || 0) + (creatine ? 1 : 1); if (creatine) S.creatine[TODAY] = true; save();
      tone(660, .4, .05); closeSession(false); toast(creatine ? 'Morning glass done — creatine ✓' : `Glass ${S.water[TODAY]} ✓`);
    }
  }, 100);
}
const morningGlass = () => drinkMoment(true);

// ---------- timed sessions: swim / sauna (start → do it → stop) ----------
const TIMED_MIN = { swim: 15, sauna: 10 };
function timed(kind) {
  const R = S.recovery[TODAY] = S.recovery[TODAY] || {}, open = S.openSession;
  if (open && open.kind === kind) {
    const min = Math.round((Date.now() - open.t) / 60000); S.openSession = null;
    if (min >= TIMED_MIN[kind]) { R[kind] = { min: Math.min(min, 120), m: R[kind]?.m || 0, timed: 1 }; delete R[kind + 'Miss']; toast(`${kind === 'swim' ? 'Swim' : 'Sauna'} · ${min} min ✓`); if (kind === 'sauna') setTimeout(() => drinkMoment(false), 600); }
    else toast(`Only ${min} min — a ${kind} counts from ${TIMED_MIN[kind]} min`);
    save(); render(); return;
  }
  if (open) { toast(`Finish your ${open.kind} first`); return; }
  S.openSession = { kind, t: Date.now() }; save(); render(); toast(`${kind === 'swim' ? 'Swim' : 'Sauna'} started — tap again when you’re done`);
}
function openBanner() {
  const o = S.openSession; if (!o) return '';
  const min = Math.round((Date.now() - o.t) / 60000);
  return `<div class="next calm"><div class="sub">In progress</div><h2>${o.kind === 'swim' ? '🏊 Swim' : '🧖 Sauna'} · ${min} min</h2><p class="note">Counts from ${TIMED_MIN[o.kind]} min. ${o.kind === 'sauna' ? '2-3 rounds, cool shower between.' : 'Easy pace, long exhales.'}</p><button class="btn acc block" onclick="timed('${o.kind}')">Stop · I’m done</button></div>`;
}

// ---------- room check: darkness (front camera) + quiet (microphone) ----------
async function roomCheck() {
  const out = { dark: null, quiet: null };
  try {
    const st = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 64, height: 48 } }), v = document.createElement('video');
    v.playsInline = true; v.muted = true; v.srcObject = st; await v.play(); await sleep(1500);
    const c = document.createElement('canvas'); c.width = 32; c.height = 24; const g = c.getContext('2d'); g.drawImage(v, 0, 0, 32, 24);
    const d = g.getImageData(0, 0, 32, 24).data; let lum = 0; for (let i = 0; i < d.length; i += 4) lum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    out.lum = Math.round(lum / 768); out.dark = out.lum < 40; st.getTracks().forEach(t => t.stop());
  } catch { }
  try {
    const mic = await openMic(), buf = new Float32Array(mic.an.fftSize), lv = [];
    for (let i = 0; i < 30; i++) { await sleep(100); mic.an.getFloatTimeDomainData(buf); let e = 0; for (const x of buf) e += x * x; lv.push(Math.sqrt(e / buf.length)); }
    mic.close(); out.db = Math.round(20 * Math.log10(median(lv) + 1e-6)); out.quiet = out.db < -50;
  } catch { }
  return out;
}

// ---------- night mode: the phone sleeps with you ----------
function nightKey(t = Date.now()) { const d = new Date(t); return dkey(d.getHours() < 6 ? addDays(d, -1) : d); }
async function nightMode() {
  SES = { kind: 'night' }; keepAwake();
  overlay(`<button class="x" onclick="nightStop(true)">✕</button><div class="orb calm" style="transform:scale(.5)"></div><div class="sess-top">Night mode</div>
    <h2 class="scan-q">Put your phone to sleep with you</h2>
    <p class="sess-sub">First a 5-second room check. Then place the phone face-down — ideally on the charger — and leave it. After 30 undisturbed minutes your screen-free time counts, and tomorrow you’ll see how long you actually rested.</p>
    <button class="btn acc" id="go">Check the room</button><button class="scan-back" id="skip">Skip room check</button>`);
  const doCheck = await new Promise(r => { $('#go').onclick = () => { motionPermission(); r(true); }; $('#skip').onclick = () => { motionPermission(); r(false); }; });
  if (!SES) return;
  if (doCheck) {
    overlay(`<button class="x" onclick="nightStop(true)">✕</button><div class="orb calm" style="transform:scale(.5)"></div><div class="sess-top">Checking light and sound…</div><div class="sess-sub">Hold still for a moment.</div>`);
    const rc = await roomCheck(); if (!SES) return;
    const ok = rc.dark && rc.quiet; if (ok) markRitual('room', true);
    const N = (S.night = S.night || {})[nightKey()] = { ...(S.night?.[nightKey()] || {}), room: rc }; save();
    overlay(`<button class="x" onclick="nightStop(true)">✕</button><div class="sess-top">Room check</div>
      <div class="cmp"><div class="cmp-row"><span>Darkness</span><b>${rc.dark == null ? '—' : rc.dark ? 'dark ✓' : 'too bright'}</b><i></i><b class="sub">${rc.lum ?? ''}</b></div><div class="cmp-row"><span>Quiet</span><b>${rc.quiet == null ? '—' : rc.quiet ? 'quiet ✓' : 'noisy'}</b><i></i><b class="sub">${rc.db != null ? rc.db + ' dB' : ''}</b></div></div>
      <p class="sess-sub">${ok ? 'Perfect for deep sleep.' : rc.dark === false ? 'Dim the lights or use a sleep mask — even small light lowers melatonin.' : rc.quiet === false ? 'Try earplugs or soft steady noise.' : 'Sensors unavailable — that’s fine.'} Keep the room cool, about 18–19 °C.</p>
      <button class="btn acc" id="go">Place phone face-down</button>`);
    await new Promise(r => { $('#go').onclick = r; }); if (!SES) return;
  }
  nightWatch();
}
function nightWatch() {
  const key = nightKey(), N = (S.night = S.night || {})[key] = { ...(S.night?.[key] || {}), start: Date.now(), still: null, end: null }; save();
  overlay(`<div class="night-black" onclick=""><div class="night-t" id="nt"></div><button class="scan-back" style="opacity:.25" onclick="nightStop(true)">end</button></div>`);
  let g0 = null, lastMove = Date.now(), settled = false, marked = false;
  const h = e => {
    const g = e.accelerationIncludingGravity; if (!g || g.x == null) return;
    if (!g0) { g0 = { x: g.x, y: g.y, z: g.z }; return; }
    const dv = Math.hypot(g.x - g0.x, g.y - g0.y, g.z - g0.z);
    if (dv > 1.6) { // picked up
      if (settled && Date.now() - N.still > 30 * 60000) return nightStop(false);
      g0 = { x: g.x, y: g.y, z: g.z }; lastMove = Date.now(); settled = false;
    }
  };
  addEventListener('devicemotion', h); SES.motion = h;
  SES.int = setInterval(() => {
    const now = Date.now(); if (!settled && now - lastMove > 20000) { settled = true; N.still = now - 20000; save(); }
    const restMin = settled ? Math.floor((now - N.still) / 60000) : 0, nt = $('#nt');
    if (nt) nt.textContent = settled ? `${new Date().toTimeString().slice(0, 5)} · resting ${restMin} min` : 'settling…';
    if (settled && restMin >= 30 && !marked) { marked = true; N.screenFree = true; save(); const s = sp(key); s.sleep = s.sleep || []; if (!s.sleep.includes('screen')) s.sleep.push('screen'); save(); }
  }, 1000);
}
function nightStop(manual) {
  if (SES?.motion) removeEventListener('devicemotion', SES.motion);
  clearInterval(SES?.int); const key = nightKey(), N = S.night?.[key];
  if (N?.still) {
    N.end = Date.now(); const h = (N.end - N.still) / 3600000; N.hours = +h.toFixed(1); save();
    if (h >= 3) { const wk = dkey(), H = S.health[wk] = S.health[wk] || {}; if (!H.sleep) { H.sleep = N.hours; H.sleepSrc = 'phone'; } save(); }
    const fmtT = t => new Date(t).toTimeString().slice(0, 5);
    overlay(`<button class="x" onclick="closeSession(false)">✕</button><div class="orb" style="transform:scale(.55)"></div><div class="sess-top">${h >= 3 ? 'Good morning' : 'Night mode ended'}</div>
      <div class="cmp-big small"><span>${fmtT(N.still)}</span><i>→</i><span>${fmtT(N.end)}</span></div>
      <div class="res-name">${Math.floor(h)} h ${Math.round((h % 1) * 60)} min</div>
      <p class="sess-sub">${N.screenFree ? 'Screen-free before sleep ✓ — the phone rested with you.' : 'Less than 30 undisturbed minutes this time.'}${h >= 3 ? ' This is how long your phone lay untouched — a close proxy for your time in bed.' : ''}</p>
      <button class="btn acc" onclick="${h >= 3 ? 'location.reload()' : 'closeSession(false)'}">${h >= 3 ? 'Start the day' : 'Close'}</button>`);
  } else closeSession(false);
}

// a new day while the app stayed open → reload so "today" is really today
document.addEventListener('visibilitychange', () => { if (!document.hidden && dkey() !== TODAY && !SES) location.reload(); });
