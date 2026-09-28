// ============ MOVE DATA from the old home-Wi-Fi app to the permanent (GitHub Pages) app ============
// Each web address has its own storage on iPhone, so data travels once through the clipboard: copy in the old app → paste in the new one.
const APP_HOME = 'https://schwarzpower13-stack.github.io/gym-coach/';
const IS_LAN = /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.|localhost$|127\.)/.test(location.hostname);
try { navigator.storage?.persist?.(); } catch { } // ask iOS to never evict this app's data

async function packData() {
  const P = {};
  for (const list of Object.values(S.photos || {})) for (const p of list) {
    try { const b = await getPhoto(p.id); if (b) { const small = await shrink(b, 800); P[p.id] = await new Promise(ok => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(small); }); } } catch { }
  }
  return 'COACHDATA1:' + JSON.stringify({ S, P });
}
async function copyForMove(btn) {
  btn.disabled = true; btn.textContent = '⏳ Preparing...';
  const txt = await packData();
  const ta = document.createElement('textarea'); ta.value = txt; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
  document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, txt.length);
  let ok = false; try { ok = document.execCommand('copy'); } catch { }
  if (!ok && navigator.clipboard) { try { await navigator.clipboard.writeText(txt); ok = true; } catch { } }
  ta.remove(); btn.disabled = false;
  btn.textContent = ok ? '✅ Copied — now open the new app and paste' : '⚠️ Couldn’t copy, try again';
}
async function importMoved(txt) {
  const i = txt.indexOf('COACHDATA1:'); if (i < 0) { toast('⚠️ This isn’t data from the old app'); return; }
  try {
    const { S: old, P } = JSON.parse(txt.slice(i + 11));
    for (const [id, url] of Object.entries(P || {})) { const b = await (await fetch(url)).blob(); await putPhoto(id, b); }
    S = Object.assign({}, DEF, old, { migrated: true }); save(); render(); toast('🎉 All data moved over');
  } catch { toast('⚠️ Couldn’t read the data — try copying again'); }
}
function moveCard() {
  if (IS_LAN && APP_HOME) return `<div class="card" style="border-color:var(--acc)"><b>🚀 The app moved to a permanent address</b>
    <p class="note">The new app works everywhere — without the computer and home Wi-Fi. Let’s move your data over once:</p>
    <ol class="steps"><li>In Safari open <b style="user-select:all">${APP_HOME}</b> → Share → <b>Add to Home Screen</b></li><li>tap the button below here</li><li>open the new app → tap the field → <b>Paste</b></li><li>delete the old icon</li></ol>
    <button class="btn acc block" onclick="copyForMove(this)">📦 Copy data</button></div>`;
  const empty = !Object.keys(S.logs).length && !S.profile.w && !Object.keys(S.photos || {}).length && !Object.keys(S.health).length;
  if (!IS_LAN && !S.migrated && empty) return `<div class="card" style="border-color:var(--acc)"><b>👋 Move from the old app</b>
    <p class="note">In the old app (home Wi-Fi) tap „📦 Copy data", then tap the field here → <b>Paste</b>.</p>
    <textarea rows="2" placeholder="Tap here → Paste" onpaste="setTimeout(() => importMoved(this.value), 50)" style="width:100%;background:var(--card2);border:1px dashed var(--acc);border-radius:10px;padding:12px;font-size:16px;color:var(--text)"></textarea>
    <button class="btn sm" style="margin-top:8px" onclick="S.migrated=true;save();render()">Start fresh</button></div>`;
  return '';
}
