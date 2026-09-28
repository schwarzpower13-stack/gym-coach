// ============ FOOD PHOTO LOG + WEEKLY REPORT ============
// photos live in IndexedDB (too big for localStorage); metadata in S.photos[date] = [{id, slot, time}]
const MEAL_TIMES_DEF = ['08:00', '11:00', '14:00', '18:30', '21:00'];
const mealTimes = () => (S.mealTimes = S.mealTimes || [...MEAL_TIMES_DEF]);
const toMin = t => { const [h, m] = String(t).split(':').map(Number); return h * 60 + (m || 0); };
const nowHM = (d = new Date()) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

let _db;
function db() {
  return _db || (_db = new Promise((ok, no) => {
    const r = indexedDB.open('coach-photos', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('p');
    r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error);
  }));
}
async function idb(mode, fn) { const d = await db(); return new Promise((ok, no) => { const tx = d.transaction('p', mode); const r = fn(tx.objectStore('p')); tx.oncomplete = () => ok(r?.result); tx.onerror = () => no(tx.error); }); }
const putPhoto = (id, blob) => idb('readwrite', s => s.put(blob, id));
const getPhoto = id => idb('readonly', s => s.get(id));
const delPhoto = id => idb('readwrite', s => s.delete(id));

// EXIF DateTimeOriginal from a JPEG (if the photo still carries it)
function exifTime(buf) {
  try {
    const v = new DataView(buf); if (v.getUint16(0) !== 0xFFD8) return null;
    let o = 2;
    while (o < v.byteLength - 4) {
      const mk = v.getUint16(o), len = v.getUint16(o + 2);
      if (mk === 0xFFE1 && v.getUint32(o + 4) === 0x45786966) {
        const t = o + 10, le = v.getUint16(t) === 0x4949, g16 = p => v.getUint16(p, le), g32 = p => v.getUint32(p, le);
        const scan = ifd => { const n = g16(t + ifd); for (let i = 0; i < n; i++) { const e = t + ifd + 2 + i * 12, tag = g16(e);
          if (tag === 0x8769) { const r = scan(g32(e + 8)); if (r) return r; }
          if (tag === 0x9003 || tag === 0x0132) { const off = t + g32(e + 8); let s = ''; for (let k = 0; k < 19; k++) s += String.fromCharCode(v.getUint8(off + k)); return s; } } return null; };
        const s = scan(g32(t + 4)); if (!s) return null;
        const m = s.match(/(\d{4}):(\d\d):(\d\d) (\d\d):(\d\d)/); return m ? new Date(+m[1], m[2] - 1, +m[3], +m[4], +m[5]) : null;
      }
      o += 2 + len;
    }
  } catch { }
  return null;
}
async function shrink(file, max = 1100) {
  const url = URL.createObjectURL(file);
  const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = url; });
  const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
  c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
  return new Promise(ok => c.toBlob(ok, 'image/jpeg', 0.72));
}

let PHOTO_SLOT = null;
function pickPhoto(slot) { PHOTO_SLOT = slot; const f = $('#photoIn'); f.value = ''; f.click(); }
async function onPhoto(input) {
  const file = input.files?.[0]; if (!file) return;
  toast('📷 Processing...');
  try {
    const shot = exifTime(await file.arrayBuffer());
    const recent = Date.now() - file.lastModified < 12 * 3600e3 ? new Date(file.lastModified) : null;
    const when = shot || recent || new Date();
    const date = dkey(when) <= TODAY && dkey(when) >= dkey(addDays(new Date(), -2)) ? dkey(when) : TODAY;
    const blob = await shrink(file), id = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    await putPhoto(id, blob);
    const list = (S.photos = S.photos || {})[date] = S.photos[date] || [];
    list.push({ id, slot: PHOTO_SLOT, time: nowHM(when) });
    if (typeof PHOTO_SLOT === 'number') { const e = S.eaten[date] = S.eaten[date] || []; if (e[PHOTO_SLOT] !== 'off') e[PHOTO_SLOT] = true; }
    save(); render(); toast(`✅ Photo added · ${nowHM(when)}${shot ? ' (photo time)' : ''}`);
  } catch (e) { toast('⚠️ Couldn’t process the photo'); }
}
function setPhotoTime(date, id, t) { const p = (S.photos[date] || []).find(x => x.id === id); if (p && t) { p.time = t; save(); render(); } }
async function removePhoto(date, id) { S.photos[date] = (S.photos[date] || []).filter(x => x.id !== id); save(); try { await delPhoto(id); } catch { } render(); }
// fill <img data-pid> after render
const _urls = {};
async function hydratePhotos() {
  for (const el of document.querySelectorAll('img[data-pid]')) {
    const id = el.dataset.pid;
    if (!_urls[id]) { try { const b = await getPhoto(id); if (b) _urls[id] = URL.createObjectURL(b); } catch { } }
    if (_urls[id]) el.src = _urls[id];
  }
}

// ---- today's timeline in the food tab ----
function timeline(dateKey) {
  const times = mealTimes(), E = S.eaten[dateKey] || [], P = (S.photos || {})[dateKey] || [], md = mealDay(dow(fromKey(dateKey))), now = toMin(nowHM());
  const row = (k) => {
    const ph = P.filter(p => p.slot === k), st = E[k], late = ph[0] ? toMin(ph[0].time) - toMin(times[k]) : null;
    const overdue = !st && !ph.length && dateKey === TODAY && now > toMin(times[k]) + 90;
    return `<div class="tl ${st === true || ph.length ? 'ok' : st === 'skip' || st === 'off' || overdue ? 'bad' : ''}">
      <div class="tl-t"><b>${times[k]}</b><small>${SLOT[k]}</small></div>
      <div class="tl-m"><div class="tl-n">${esc(MEALS[md.ids[k]].n)}</div>
        ${ph.length ? `<div class="thumbs">${ph.map(p => `<figure><img data-pid="${p.id}" alt=""><figcaption><input type="time" value="${p.time}" onchange="setPhotoTime('${dateKey}','${p.id}',this.value)" aria-label="Meal time"><button onclick="removePhoto('${dateKey}','${p.id}')" aria-label="delete">✕</button></figcaption></figure>`).join('')}</div>` : ''}
        ${late != null && Math.abs(late) > 60 ? `<div class="sub" style="color:var(--warn)">⏰ ${late > 0 ? '+' : ''}${late} min from plan</div>` : ''}
        ${overdue ? '<div class="sub" style="color:var(--bad)">not logged yet</div>' : ''}
      </div>
      <button class="cam" onclick="pickPhoto(${k})" aria-label="Add photo">📷</button></div>`;
  };
  const extra = P.filter(p => p.slot === 'x');
  return `<div class="card"><div class="row between"><b>📸 Today’s meals</b><button class="btn sm" onclick="editTimes()">🕗 Times</button></div>
    <div class="note">Take a photo before eating — the time is saved automatically. At the end of the week everything goes into the report.</div>
    ${[0, 1, 2, 3, 4].map(row).join('')}
    ${extra.length ? `<div class="tl"><div class="tl-t"><b>+</b><small>Extra</small></div><div class="tl-m"><div class="thumbs">${extra.map(p => `<figure><img data-pid="${p.id}" alt=""><figcaption><input type="time" value="${p.time}" onchange="setPhotoTime('${dateKey}','${p.id}',this.value)"><button onclick="removePhoto('${dateKey}','${p.id}')">✕</button></figcaption></figure>`).join('')}</div></div></div>` : ''}
    <button class="btn block" style="margin-top:10px" onclick="pickPhoto('x')">📷 Extra meal / Snack</button>
    <button class="btn acc block" style="margin-top:8px" onclick="go('report')">📤 Weekly report</button></div>`;
}
function editTimes() {
  app.innerHTML = `<h1>Meal times</h1><div class="card">${SLOT.map((s, k) => `<label class="f" style="margin-top:8px">${s}<input type="time" id="mt${k}" value="${mealTimes()[k]}"></label>`).join('')}
  <p class="note">Tip: eat the post-workout meal within 0-2 hours of training. between meals 3-4 hours (Schoenfeld & Aragon 2018).</p>
  <button class="btn acc block" onclick="S.mealTimes=[0,1,2,3,4].map(k=>$('#mt'+k).value||MEAL_TIMES_DEF[k]);save();go('food')">Save</button></div>`;
  scrollTo(0, 0);
}

// ---- weekly report ----
let REP_WEEK = 0;
function weekDays(off) { const m = addDays(monday(), -7 * off); return Array.from({ length: 7 }, (_, i) => dkey(addDays(m, i))); }
function reportText(off) {
  const days = weekDays(off), t = targets(), p = S.profile, times = mealTimes();
  const L = [];
  L.push(`# Weekly report: ${days[0]} — ${days[6]}`);
  L.push(`Profile: ${p.w || '?'} kg, ${p.h || '?'} cm, ${p.age || '?'} y. Goal: ${p.goal === 'cut' ? 'Fat loss' : p.goal === 'keep' ? 'Recomposition' : 'lean bulk'}. ${t ? `Daily goal: ${t.kcal} kcal, protein ${t.protein}g, carbs. ${t.carbs}g, fat ${t.fat}g.` : ''}`);
  L.push(`Plan: ${program().name}. Meal times: ${times.map((x, k) => `${SLOT[k]} ${x}`).join(', ')}.`);
  L.push('');
  days.forEach(k => {
    const i = dow(fromKey(k)), d = PROGRAMS[S.logs[k]?.prog || S.program].days[i], ws = workoutStatus(k);
    const sets = S.logs[k] ? Object.values(S.logs[k].sets || {}).flat().filter(s => s?.ok).length : 0;
    const E = S.eaten[k] || [], P = (S.photos || {})[k] || [], h = S.health[k] || {}, R = S.recovery[k] || {}, sp = (S.spirit || {})[k] || {};
    L.push(`## ${DOW[i]} ${k}`);
    L.push(`- Training (${d.t}): ${ST_LABEL[ws]}${sets ? `, ${sets} set` : ''}${S.logs[k]?.min ? `, ${S.logs[k].min} min` : ''}${stOf(k).workout ? `, Reason: ${reasonLabel(stOf(k).workout)}` : ''}`);
    L.push(`- Food: ${[0, 1, 2, 3, 4].map(j => { const ph = P.filter(x => x.slot === j); const st = E[j] === true ? '✓' : E[j] === 'skip' ? '✕ skipped' : E[j] === 'off' ? '⚠ Other' : '—'; return `${SLOT[j]} (Plan ${times[j]}): ${st}${ph.length ? `, photo ${ph.map(x => x.time).join('/')}` : ''}`; }).join('; ')}`);
    const ex = P.filter(x => x.slot === 'x'); if (ex.length) L.push(`- Extra meal: ${ex.map(x => x.time).join(', ')}`);
    L.push(`- Water ${S.water[k] || 0} glasses · Creatine ${S.creatine[k] ? '✓' : '✕'} · Swim ${R.swim ? `✓ ${R.swim.min || ''}min ${R.swim.m || ''}m` : R.swimMiss ? '✕' : '—'} · sauna ${R.sauna ? `✓ ${R.sauna.min}min` : R.saunaMiss ? '✕' : '—'}`);
    if (h.steps || h.w || h.sleep) L.push(`- Health: ${h.steps ? `${h.steps} Steps` : ''}${h.sleep ? `, Sleep ${h.sleep}h` : ''}${h.rhr ? `, Pulse ${h.rhr}` : ''}${S.weights[k] ? `, weight ${S.weights[k]} kg` : ''}`);
    if (typeof spiritLine === 'function') { const s = spiritLine(k); if (s) L.push('- ' + s); }
  });
  L.push('');
  L.push('## Summary');
  CATS.forEach(([c, ic, l]) => { let sc = 0, n = 0; days.forEach(k => { const s = statusOf(c, k); if (['rest', 'pend', 'none', 'fut'].includes(s)) return; n++; sc += s === 'done' || s === 'bonus' ? 1 : s === 'part' ? .5 : 0; }); if (n) L.push(`- ${ic} ${l}: ${Math.round(sc / n * 100)}% (${n} Day)`); });
  const photos = days.reduce((a, k) => a + ((S.photos || {})[k] || []).length, 0);
  L.push(`- Meal photos: ${photos}`);
  const notes = coachNotes(); if (notes.length) { L.push(''); L.push('## App notes'); notes.forEach(([, a, b]) => L.push(`- ${a}: ${b}`)); }
  L.push('');
  L.push('## Request for the AI');
  L.push(`Attached is my weekly meal photo collage (each photo shows the meal time). Please: 1) estimate approximate calories and protein for each photo; 2) add up the daily totals and compare them to my goal${t ? ` (${t.kcal} kcal, ${t.protein}g protein)` : ''}; 3) evaluate my meal times against the plan; 4) give me 3 concrete improvements for next week, considering training, sleep and discipline.`);
  return L.join('\n');
}
async function reportCollage(off) {
  const days = weekDays(off), times = mealTimes(), W = 1080, head = 120, rowH = 210, th = 150, c = document.createElement('canvas');
  c.width = W; c.height = head + rowH * 7 + 20; const g = c.getContext('2d');
  g.fillStyle = '#0c0d10'; g.fillRect(0, 0, W, c.height);
  g.fillStyle = '#c6ff3d'; g.font = 'bold 40px -apple-system, sans-serif'; g.fillText('Weekly meals', 30, 60);
  g.fillStyle = '#9aa0ab'; g.font = '26px -apple-system, sans-serif'; g.fillText(`${days[0]} — ${days[6]} · Plan: ${times.join(' / ')}`, 30, 100);
  for (let r = 0; r < 7; r++) {
    const k = days[r], y = head + r * rowH, P = [...((S.photos || {})[k] || [])].sort((a, b) => toMin(a.time) - toMin(b.time));
    g.fillStyle = r % 2 ? '#16181d' : '#121419'; g.fillRect(0, y, W, rowH);
    g.fillStyle = '#f2f3f5'; g.font = 'bold 30px -apple-system, sans-serif'; g.fillText(DOW_S[r], 24, y + 50);
    g.fillStyle = '#6b717c'; g.font = '22px -apple-system, sans-serif'; g.fillText(k.slice(5), 24, y + 84);
    const ms = mealStatus(k); g.fillStyle = { done: '#3ddc84', part: '#ffb547', miss: '#ff5d5d' }[ms] || '#2a2e37'; g.fillRect(24, y + 104, 60, 8);
    if (!P.length) { g.fillStyle = '#6b717c'; g.font = '24px -apple-system, sans-serif'; g.fillText('No photos', 130, y + 110); continue; }
    for (let j = 0; j < Math.min(P.length, 6); j++) {
      const x = 120 + j * (th + 8), b = await getPhoto(P[j].id).catch(() => null); if (!b) continue;
      const bmp = await createImageBitmap(b); const s = Math.max(th / bmp.width, th / bmp.height), sw = th / s, sh = th / s;
      g.drawImage(bmp, (bmp.width - sw) / 2, (bmp.height - sh) / 2, sw, sh, x, y + 20, th, th);
      g.fillStyle = 'rgba(0,0,0,.65)'; g.fillRect(x, y + 20 + th - 34, th, 34);
      g.fillStyle = '#fff'; g.font = 'bold 22px -apple-system, sans-serif'; g.fillText(P[j].time + (P[j].slot === 'x' ? ' +' : ''), x + 8, y + 20 + th - 10);
    }
    if (P.length > 6) { g.fillStyle = '#9aa0ab'; g.fillText(`+${P.length - 6}`, W - 60, y + 110); }
  }
  return c.toDataURL('image/jpeg', 0.85);
}
function vReport() {
  const days = weekDays(REP_WEEK);
  setTimeout(async () => { const el = $('#collage'); if (el) { el.src = await reportCollage(REP_WEEK); el.closest('.card').classList.remove('loading'); } }, 50);
  return `<button class="btn sm" onclick="go('food')">← Food</button>
  <h1>Weekly report</h1>
  <div class="seg" style="margin:10px 0"><button class="${REP_WEEK === 0 ? 'on' : ''}" onclick="REP_WEEK=0;render()">this week</button><button class="${REP_WEEK === 1 ? 'on' : ''}" onclick="REP_WEEK=1;render()">Last week</button></div>
  <div class="sub">${days[0]} — ${days[6]}</div>
  <h2>1. Photo collage</h2>
  <div class="card loading"><img id="collage" alt="Weekly meal collage" style="width:100%;border-radius:10px;min-height:120px;background:var(--card2)"><p class="note">Long-press the image → <b>Save to Photos</b> or <b>Share</b>.</p></div>
  <h2>2. Text for the AI</h2>
  <div class="card"><textarea id="repText" readonly rows="12" style="width:100%;background:var(--card2);border:1px solid var(--line);border-radius:10px;padding:10px;font-size:13px;color:var(--text)">${esc(reportText(REP_WEEK))}</textarea>
  <button class="btn acc block" style="margin-top:8px" onclick="copyReport()">📋 Copy text</button></div>
  <h2>3. Send</h2>
  <div class="card"><ol class="steps"><li>Save the collage (top)</li><li>Copy the text</li><li>Open Claude chat → paste the text + attach the collage → send</li></ol><p class="note">AI will estimate calories and protein from the photos, compare them to your goal and give you a plan for next week.</p></div>`;
}
function copyReport() {
  const ta = $('#repText'); const txt = ta.value;
  const fallback = () => { ta.removeAttribute('readonly'); ta.focus(); ta.setSelectionRange(0, txt.length); const ok = document.execCommand('copy'); ta.setAttribute('readonly', ''); toast(ok ? '📋 Copied' : 'Select the text and Copy'); };
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(txt).then(() => toast('📋 Copied'), fallback); else fallback();
}
