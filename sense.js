// ============ SENSE · objective measurements from the phone's own sensors ============
// Nothing here asks the user how they feel. Each test measures the body directly and returns raw metrics + a 0-1 sub-score.
//   breath  — phone resting on the chest: accelerometer → breathing rate, rhythm regularity, stillness
//   voice   — sustained hum: microphone → pitch, jitter (pitch wobble), shimmer (loudness wobble), clarity
//   heart   — fingertip over the camera (optional): colour pulse → heart rate + HRV (RMSSD)
//   recovery — sleep / resting HR / HRV from Apple Health (already in the app)

const clamp01 = x => Math.max(0, Math.min(1, x));
const lerp = (x, a, b, va, vb) => va + (vb - va) * clamp01((x - a) / (b - a)); // map x∈[a,b] → [va,vb]
const median = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
const sd = a => { const m = mean(a); return Math.sqrt(mean(a.map(v => (v - m) ** 2))); };
const smoothArr = (a, w) => a.map((_, i) => { let s = 0, c = 0; for (let j = Math.max(0, i - w); j <= Math.min(a.length - 1, i + w); j++) { s += a[j]; c++; } return s / c; });

// ---------- BREATH (accelerometer) ----------
async function motionPermission() {
  if (typeof DeviceMotionEvent === 'undefined') return false;
  if (typeof DeviceMotionEvent.requestPermission === 'function') { try { return (await DeviceMotionEvent.requestPermission()) === 'granted'; } catch { return false; } }
  return true;
}
function recordMotion(seconds, onSample) {
  return new Promise(resolve => {
    const xs = [], ys = [], zs = [], ts = [], jerk = [];
    const h = e => {
      const g = e.accelerationIncludingGravity; if (!g || g.x == null) return;
      const t = performance.now(); xs.push(g.x); ys.push(g.y); zs.push(g.z); ts.push(t);
      const a = e.acceleration; if (a && a.x != null) jerk.push(Math.hypot(a.x, a.y, a.z));
      onSample?.(g, t, xs.length);
    };
    addEventListener('devicemotion', h);
    const stop = () => { removeEventListener('devicemotion', h); resolve({ xs, ys, zs, ts, jerk }); };
    const to = setTimeout(stop, seconds * 1000);
    recordMotion.cancel = () => { clearTimeout(to); removeEventListener('devicemotion', h); };
  });
}
function breathWave(rec) {
  const n = rec.ts.length; if (n < 100) return null;
  const fs = n / ((rec.ts[n - 1] - rec.ts[0]) / 1000);
  const detrend = a => { const long = smoothArr(a, Math.round(fs * 4)); return a.map((v, i) => v - long[i]); };
  const axes = [rec.xs, rec.ys, rec.zs].map(a => smoothArr(detrend(a), Math.round(fs * 0.35)));
  return { sig: axes.sort((a, b) => sd(b) - sd(a))[0], fs };
}
function analyseBreath(rec) {
  const b = breathWave(rec); if (!b) return { ok: false, why: 'Motion sensor unavailable' };
  const { sig, fs } = b, amp = sd(sig), minGap = Math.round(fs * 1.8);
  const peaks = []; for (let i = 1; i < sig.length - 1; i++) if (sig[i] > amp * 0.35 && sig[i] >= sig[i - 1] && sig[i] > sig[i + 1] && (!peaks.length || i - peaks[peaks.length - 1] >= minGap)) peaks.push(i);
  if (peaks.length < 3) return { ok: false, why: 'Breathing not detected — lie back and rest the phone flat on your chest' };
  const iv = peaks.slice(1).map((p, i) => (p - peaks[i]) / fs), rate = 60 / mean(iv), cv = sd(iv) / mean(iv);
  const still = rec.jerk.length ? median(rec.jerk) : 0.02;
  // slow, even breathing = settled nervous system; fast, erratic, restless = activated
  const sRate = rate <= 6 ? 1 : rate <= 10 ? lerp(rate, 6, 10, 1, 0.9) : rate <= 14 ? lerp(rate, 10, 14, 0.9, 0.7) : rate <= 20 ? lerp(rate, 14, 20, 0.7, 0.3) : lerp(rate, 20, 28, 0.3, 0.05);
  const sReg = lerp(cv, 0.08, 0.45, 1, 0.1), sStill = lerp(still, 0.02, 0.25, 1, 0.3);
  return { ok: true, rate: +rate.toFixed(1), cv: +cv.toFixed(2), still: +still.toFixed(3), breaths: peaks.length, wave: sig.filter((_, i) => i % 6 === 0).map(v => +v.toFixed(3)), score: clamp01(sRate * 0.55 + sReg * 0.3 + sStill * 0.15) };
}

// ---------- VOICE (microphone) ----------
async function openMic() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
  actx = actx || new (window.AudioContext || window.webkitAudioContext)(); await actx.resume();
  const src = actx.createMediaStreamSource(stream), an = actx.createAnalyser(); an.fftSize = 2048; src.connect(an);
  return { an, rate: actx.sampleRate, close: () => stream.getTracks().forEach(t => t.stop()) };
}
function periodOf(buf, rate) {
  let e = 0; for (const v of buf) e += v * v; const rms = Math.sqrt(e / buf.length); if (rms < 0.01) return null;
  const minL = Math.floor(rate / 450), maxL = Math.floor(rate / 70); let best = 0, bestL = 0;
  for (let L = minL; L <= maxL; L += 1) { let c = 0, e1 = 0, e2 = 0; for (let i = 0; i < buf.length - L; i += 2) { c += buf[i] * buf[i + L]; e1 += buf[i] * buf[i]; e2 += buf[i + L] * buf[i + L]; } const r = c / Math.sqrt(e1 * e2 || 1); if (r > best) { best = r; bestL = L; } }
  return best < 0.6 ? null : { L: bestL, r: best, rms };
}
function recordVoice(mic, seconds, onFrame) {
  return new Promise(resolve => {
    const buf = new Float32Array(mic.an.fftSize), frames = [], t0 = performance.now();
    const iv = setInterval(() => {
      mic.an.getFloatTimeDomainData(buf); const p = periodOf(buf, mic.rate);
      if (p) frames.push({ f0: mic.rate / p.L, r: p.r, rms: p.rms });
      onFrame?.(p ? mic.rate / p.L : null, p ? p.rms : 0, (performance.now() - t0) / 1000);
      if (performance.now() - t0 >= seconds * 1000) { clearInterval(iv); resolve(frames); }
    }, 40);
    recordVoice.cancel = () => clearInterval(iv);
  });
}
function analyseVoice(frames, seconds) {
  if (frames.length < 25) return { ok: false, why: 'No steady voice detected — hum a little louder' };
  const med = median(frames.map(f => f.f0)), use = frames.filter(f => Math.abs(f.f0 - med) / med < 0.25);
  const F = use.map(f => f.f0), A = use.map(f => f.rms);
  const jitter = mean(F.slice(1).map((v, i) => Math.abs(v - F[i]))) / mean(F) * 100;
  const shimmer = mean(A.slice(1).map((v, i) => Math.abs(v - A[i]))) / mean(A) * 100;
  const clarity = mean(use.map(f => f.r)), voiced = clamp01(use.length * 0.04 / seconds), drift = sd(F) / mean(F) * 100;
  const s = lerp(jitter, 0.6, 4, 1, 0.1) * 0.35 + lerp(shimmer, 3, 20, 1, 0.1) * 0.25 + lerp(clarity, 0.75, 0.97, 0.2, 1) * 0.2 + lerp(voiced, 0.4, 0.9, 0.3, 1) * 0.1 + lerp(drift, 1, 8, 1, 0.2) * 0.1;
  return { ok: true, hz: Math.round(med), note: noteName(med), jitter: +jitter.toFixed(2), shimmer: +shimmer.toFixed(1), clarity: +clarity.toFixed(2), voiced: +voiced.toFixed(2), score: clamp01(s) };
}

// ---------- HEART (camera PPG, optional) ----------
async function openCamera(videoEl) {
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: 160, height: 120, frameRate: 30 } });
  const track = stream.getVideoTracks()[0];
  try { await track.applyConstraints({ advanced: [{ torch: true }] }); } catch { }
  videoEl.playsInline = true; videoEl.muted = true; videoEl.srcObject = stream; await videoEl.play();
  const c = document.createElement('canvas'); c.width = 40; c.height = 30; const g = c.getContext('2d', { willReadFrequently: true });
  return { read: () => { g.drawImage(videoEl, 0, 0, 40, 30); const d = g.getImageData(0, 0, 40, 30).data; let r = 0, gg = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; } return { r: r / 1200, g: gg / 1200 }; }, close: () => stream.getTracks().forEach(t => t.stop()) };
}
function analyseHeart(samples) {
  if (samples.length < 300 || mean(samples.map(s => s.r)) < 60) return { ok: false, why: 'Cover the back camera fully with your fingertip, near a light' };
  const fs = samples.length / ((samples[samples.length - 1].t - samples[0].t) / 1000);
  const raw = samples.map(s => -s.r), base = smoothArr(raw, Math.round(fs * 0.75)), sig = smoothArr(raw.map((v, i) => v - base[i]), 1), amp = sd(sig);
  const peaks = []; for (let i = 1; i < sig.length - 1; i++) if (sig[i] > amp * 0.5 && sig[i] >= sig[i - 1] && sig[i] > sig[i + 1] && (!peaks.length || i - peaks[peaks.length - 1] > fs * 0.33)) peaks.push(i);
  if (peaks.length < 12) return { ok: false, why: 'Pulse too weak — press gently and keep still' };
  let ibi = peaks.slice(1).map((p, i) => (p - peaks[i]) / fs * 1000); const m = median(ibi); ibi = ibi.filter(x => Math.abs(x - m) / m < 0.25);
  if (ibi.length < 10) return { ok: false, why: 'Signal too noisy — try again and keep still' };
  const hr = 60000 / mean(ibi), rmssd = Math.sqrt(mean(ibi.slice(1).map((v, i) => (v - ibi[i]) ** 2)));
  return { ok: true, hr: Math.round(hr), rmssd: Math.round(rmssd), beats: ibi.length + 1, score: clamp01(lerp(rmssd, 15, 70, 0.15, 1) * 0.65 + lerp(hr, 55, 100, 1, 0.2) * 0.35) };
}

// ---------- RECOVERY (Apple Health data already in the app) ----------
function recoverySignal(k = TODAY) {
  const h = S.health[k] || {}, parts = [];
  if (h.sleep) parts.push(lerp(h.sleep, 5, 8, 0.2, 1));
  const brhr = baseline('rhr'); if (h.rhr && brhr) parts.push(lerp(h.rhr - brhr, -2, 8, 1, 0.2));
  const bhrv = baseline('hrv'); if (h.hrv && bhrv) parts.push(lerp(h.hrv / bhrv, 0.7, 1.1, 0.2, 1));
  return parts.length ? { ok: true, score: clamp01(mean(parts)), sleep: h.sleep, rhr: h.rhr, hrv: h.hrv } : { ok: false };
}
