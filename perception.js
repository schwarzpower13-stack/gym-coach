// ============ PERCEPTION · how much of reality you take in (measured, not self-reported) ============
// 1) FIELD — a dot flashes for a split second somewhere in the periphery while you look at the centre; you point where it was.
//    Under stress the useful field of view narrows ("tunnel vision"); when you settle, it widens again.
// 2) OPPORTUNITIES — a crowd of faces; find the one smile as fast as you can.
//    Low states make the brain faster at threats and slower at the positive; high states flip it.

const DIRS = 8, RINGS = [0.45, 0.9]; // 8 directions × near/far ring (fraction of the arena radius)
const face = (kind, s = 44) => `<svg viewBox="-20 -20 40 40" width="${s}" height="${s}" aria-hidden="true"><circle r="17" fill="#26343c" stroke="#3a4b55" stroke-width="1.5"/><circle cx="-6" cy="-4" r="2.2" fill="#9fb0b8"/><circle cx="6" cy="-4" r="2.2" fill="#9fb0b8"/>${kind === 'smile' ? '<path d="M-7 5 Q0 12 7 5" stroke="#9fb0b8" stroke-width="2.2" fill="none" stroke-linecap="round"/>' : kind === 'frown' ? '<path d="M-7 10 Q0 3 7 10" stroke="#9fb0b8" stroke-width="2.2" fill="none" stroke-linecap="round"/>' : '<path d="M-6 7 H6" stroke="#9fb0b8" stroke-width="2.2" stroke-linecap="round"/>'}</svg>`;

// ---------- FIELD OF VIEW ----------
function runField(host, trials = 16) {
  return new Promise(resolve => {
    const order = []; for (let r = 0; r < RINGS.length; r++) for (let d = 0; d < DIRS; d++) order.push([d, r]);
    order.sort(() => Math.random() - 0.5); const plan = order.slice(0, trials), hits = [];
    host.innerHTML = `<div class="arena" id="arena"><div class="fix">+</div></div><div class="sess-sub" id="fldMsg">Keep your eyes on the + . A dot will flash once — then tap where it was.</div>`;
    const arena = host.querySelector('#arena'), R = arena.clientWidth / 2, msg = host.querySelector('#fldMsg');
    const pos = (d, r) => { const a = d / DIRS * Math.PI * 2 - Math.PI / 2, rr = RINGS[r] * (R - 16); return [R + Math.cos(a) * rr, R + Math.sin(a) * rr]; };
    let i = 0;
    const next = () => {
      if (i >= plan.length) return finish();
      arena.innerHTML = '<div class="fix">+</div>';
      setTimeout(() => {
        const [d, r] = plan[i], [x, y] = pos(d, r), dot = document.createElement('i'); dot.className = 'flash-dot'; dot.style.left = x + 'px'; dot.style.top = y + 'px'; arena.appendChild(dot);
        setTimeout(() => { dot.remove(); arena.classList.add('mask'); setTimeout(() => { arena.classList.remove('mask'); ask(d, r); }, 120); }, r ? 150 : 120);
      }, 700 + Math.random() * 900);
    };
    const ask = (d, r) => {
      arena.innerHTML = '<div class="fix">?</div>' + Array.from({ length: DIRS }, (_, k) => { const a = k / DIRS * Math.PI * 2 - Math.PI / 2, rr = R * 0.72; return `<button class="dir" style="left:${R + Math.cos(a) * rr}px;top:${R + Math.sin(a) * rr}px" data-k="${k}"></button>`; }).join('');
      msg.textContent = 'Where was it? Tap the direction.';
      arena.querySelectorAll('.dir').forEach(b => b.onclick = () => { hits.push({ d, r, ok: +b.dataset.k === d }); navigator.vibrate?.(8); i++; msg.textContent = `${i}/${plan.length}`; next(); });
    };
    const finish = () => {
      const byRing = RINGS.map((_, r) => { const t = hits.filter(h => h.r === r); return t.length ? t.filter(h => h.ok).length / t.length : 0; });
      const map = Array.from({ length: DIRS }, (_, d) => { const far = hits.find(h => h.d === d && h.r === 1), near = hits.find(h => h.d === d && h.r === 0); return far?.ok ? 1 : near?.ok ? 0.55 : 0.2; });
      const width = byRing[0] * 0.35 + byRing[1] * 0.65;
      resolve({ ok: true, near: Math.round(byRing[0] * 100), far: Math.round(byRing[1] * 100), width: Math.round(width * 100), map, score: clamp01(width) });
    };
    next();
  });
}
// polygon of the measured field (for before/after pictures)
function fieldSVG(map, color = 'var(--acc)', size = 150, ghost) {
  const c = size / 2, pts = m => m.map((v, d) => { const a = d / DIRS * Math.PI * 2 - Math.PI / 2, r = (0.15 + 0.85 * v) * (c - 6); return `${(c + Math.cos(a) * r).toFixed(1)},${(c + Math.sin(a) * r).toFixed(1)}`; }).join(' ');
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" class="fieldsvg" aria-hidden="true">
    ${[0.33, 0.66, 1].map(k => `<circle cx="${c}" cy="${c}" r="${(c - 6) * k}" fill="none" stroke="var(--line)" stroke-width="1"/>`).join('')}
    ${ghost ? `<polygon points="${pts(ghost)}" fill="none" stroke="var(--dim)" stroke-width="1.5" stroke-dasharray="3 3"/>` : ''}
    <polygon points="${pts(map)}" fill="${color}" fill-opacity=".22" stroke="${color}" stroke-width="2"/>
    <circle cx="${c}" cy="${c}" r="3" fill="${color}"/></svg>`;
}

// ---------- OPPORTUNITIES (find the smile) ----------
function runSmiles(host, rounds = 8) {
  return new Promise(resolve => {
    const rts = []; let misses = 0, r = 0;
    host.innerHTML = `<div class="crowd" id="crowd"></div><div class="sess-sub" id="smMsg">Find the one smiling face — tap it as fast as you can.</div>`;
    const crowd = host.querySelector('#crowd'), msg = host.querySelector('#smMsg');
    const round = () => {
      if (r >= rounds) return finish();
      const n = 16, target = Math.floor(Math.random() * n);
      crowd.innerHTML = Array.from({ length: n }, (_, k) => `<button data-k="${k}">${face(k === target ? 'smile' : Math.random() < 0.6 ? 'frown' : 'neutral', 40)}</button>`).join('');
      const t0 = performance.now();
      crowd.querySelectorAll('button').forEach(b => b.onclick = () => {
        if (+b.dataset.k === target) { rts.push(performance.now() - t0); navigator.vibrate?.(10); r++; msg.textContent = `${r}/${rounds}`; crowd.innerHTML = ''; setTimeout(round, 350); }
        else { misses++; b.classList.add('wrong'); }
      });
    };
    const finish = () => {
      const med = median(rts), perMin = Math.round(60000 / (med + 350));
      resolve({ ok: true, rt: Math.round(med), misses, perMin, score: clamp01(lerp(med, 900, 3200, 1, 0.1) * 0.8 + lerp(misses, 0, 4, 1, 0.3) * 0.2) });
    };
    round();
  });
}
