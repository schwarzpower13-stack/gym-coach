// ============ LEARN: Portuguese & English — spaced repetition (reviews first, then new words) ============
const LANGS = { pt: { n: 'პორტუგალიური', flag: '🇵🇹', voice: 'pt-PT' }, en: { n: 'ინგლისური', flag: '🇬🇧', voice: 'en-GB' } };
const INTERVALS = [0, 1, 2, 4, 7, 15, 30, 60, 120]; // days per box
let LEARN_LANG = 'pt', REVEAL = false;

function L_(lang) { const L = (S.learn = S.learn || {}); return L[lang] = L[lang] || { daily: 10, level: 'A1', note: '', cards: {}, intro: {} }; }
function learnLog(k = TODAY) { const L = (S.learn = S.learn || {}); L.log = L.log || {}; return L.log[k] = L.log[k] || {}; }
function queueOf(lang) {
  const st = L_(lang), words = WORDS[lang];
  const due = Object.entries(st.cards).filter(([, c]) => c.due <= TODAY).sort((a, b) => (a[1].t || 0) - (b[1].t || 0)).map(([i]) => +i);
  const introToday = st.intro.date === TODAY ? st.intro.n : 0, newLeft = Math.max(0, st.daily - introToday);
  let nextNew = -1; if (newLeft > 0) for (let i = 0; i < words.length; i++) if (!st.cards[i]) { nextNew = i; break; }
  return { due, newLeft: nextNew >= 0 ? Math.min(newLeft, words.length - Object.keys(st.cards).length) : 0, nextNew, introToday };
}
function current(lang) { const q = queueOf(lang); if (q.due.length) return { i: q.due[0], isNew: false }; if (q.newLeft > 0) return { i: q.nextNew, isNew: true }; return null; }
function answer(grade) {
  const lang = LEARN_LANG, st = L_(lang), cur = current(lang); if (!cur) return;
  let c = st.cards[cur.i];
  if (cur.isNew) { st.intro = st.intro.date === TODAY ? { date: TODAY, n: st.intro.n + 1 } : { date: TODAY, n: 1 }; c = st.cards[cur.i] = { b: 0, due: TODAY }; }
  if (grade === 0) { c.b = 0; c.due = TODAY; }
  else if (grade === 1) { c.b = Math.max(1, c.b); c.due = dkey(addDays(new Date(), 1)); }
  else { c.b = Math.min(INTERVALS.length - 1, c.b + 1); c.due = dkey(addDays(new Date(), INTERVALS[c.b])); }
  c.t = Date.now(); c.n = (c.n || 0) + 1;
  const lg = learnLog(); lg[lang] = (lg[lang] || 0) + 1; if (!current(lang)) { lg.done = lg.done || {}; lg.done[lang] = true; toast('🎉 დღევანდელი სიტყვები დასრულდა!'); }
  REVEAL = false; save(); render();
}
function speak(txt, lang) {
  try { const u = new SpeechSynthesisUtterance(txt.split(' / ')[0].replace(/[()…]/g, '')); u.lang = LANGS[lang].voice; u.rate = 0.85;
    const v = speechSynthesis.getVoices().find(v => v.lang.replace('_', '-').startsWith(LANGS[lang].voice)); if (v) u.voice = v;
    speechSynthesis.cancel(); speechSynthesis.speak(u); } catch { toast('ხმა ამ მოწყობილობაზე მიუწვდომელია'); }
}
function langStats(lang) {
  const st = L_(lang), cs = Object.values(st.cards);
  return { known: cs.filter(c => c.b >= 4).length, learning: cs.filter(c => c.b < 4).length, total: WORDS[lang].length, seen: cs.length };
}
function learnStatus(k) {
  if (k < since()) return 'none'; if (k > TODAY) return 'fut';
  const lg = (S.learn?.log || {})[k] || {};
  if (lg.done && Object.keys(lg.done).length) return 'done';
  if (lg.pt || lg.en) return k < TODAY ? 'part' : 'pend';
  return k < TODAY ? 'miss' : 'pend';
}
CATS.push(['lang', '🗣️', 'ენები']); XSTAT.lang = learnStatus;
function learnStreak() { let n = 0; for (let i = 0; i < 400; i++) { const k = dkey(addDays(new Date(), -i)); const s = learnStatus(k); if (s === 'done') n++; else if (i === 0 && s === 'pend') continue; else break; } return n; }

function vLearn() {
  const lang = LEARN_LANG, st = L_(lang), q = queueOf(lang), cur = current(lang), w = cur ? WORDS[lang][cur.i] : null, ls = langStats(lang);
  const reverse = cur && !cur.isNew && (st.cards[cur.i]?.b >= 3) && (cur.i + new Date().getDate()) % 2 === 0;
  const ph = PHRASES[lang][Math.floor(Date.now() / 864e5) % PHRASES[lang].length];
  const book = S.book || {};
  return `
  <h1>სწავლა</h1>
  <div class="sub">ყოველდღე: ჯერ ძველების გამეორება, მერე ახალი სიტყვები · 🔥 ${learnStreak()} დღე ზედიზედ</div>
  <div class="seg" style="margin:12px 0">${Object.entries(LANGS).map(([k, v]) => `<button class="${k === lang ? 'on' : ''}" onclick="LEARN_LANG='${k}';REVEAL=false;render()">${v.flag} ${v.n}</button>`).join('')}</div>

  <div class="grid3"><div class="stat"><span>გასამეორებელი</span><b>${q.due.length}</b></div><div class="stat"><span>ახალი დღეს</span><b>${q.newLeft}</b></div><div class="stat"><span>ნასწავლი</span><b>${ls.known}</b></div></div>

  ${cur ? `<div class="flash" onclick="if(!REVEAL){REVEAL=true;render()}">
    <div class="sub">${cur.isNew ? '✨ ახალი სიტყვა' : '🔁 გამეორება'}${reverse ? ' · თარგმნე უცხოურად' : ''}</div>
    <div class="fw">${esc(reverse ? w[1] : w[0])}</div>
    ${!reverse ? `<button class="btn sm" onclick="event.stopPropagation();speak(${esc(JSON.stringify(w[0]))},'${lang}')">🔊 მოსმენა</button>` : ''}
    ${REVEAL ? `<div class="fa">${esc(reverse ? w[0] : w[1])}</div>${w[2] && lang === 'pt' ? `<div class="sub">${esc(w[2])}</div>` : ''}${reverse ? `<button class="btn sm" onclick="event.stopPropagation();speak(${esc(JSON.stringify(w[0]))},'${lang}')">🔊</button>` : ''}` : `<div class="sub" style="margin-top:18px">შეეხე პასუხის სანახავად</div>`}
  </div>
  ${REVEAL ? `<div class="grade"><button class="btn g0" onclick="answer(0)">✕ არ ვიცოდი</button><button class="btn g1" onclick="answer(1)">~ ძნელი</button><button class="btn g2" onclick="answer(2)">✓ ვიცოდი</button></div>` : ''}`
  : `<div class="card ok" style="text-align:center;padding:26px"><div style="font-size:40px">🎉</div><h3>დღევანდელი ${LANGS[lang].n} დასრულდა</h3><p class="note">ხვალ ახალი სიტყვები და გამეორება გელოდება. ${ls.seen >= ls.total ? 'ყველა სიტყვა გავლილია — გამეორება გრძელდება.' : ''}</p></div>`}

  <div class="card"><div class="sub">💬 დღის ფრაზა</div><div class="row between" style="margin-top:6px"><b style="font-size:17px">${esc(ph[0])}</b><button class="btn sm" onclick="speak(${esc(JSON.stringify(ph[0]))},'${lang}')">🔊</button></div><div class="note">${esc(ph[1])}</div></div>

  <div class="card"><b>📍 სად ვარ</b>
    <div class="grid2" style="margin-top:8px">
      <label class="f">დონე<select onchange="L_('${lang}').level=this.value;save()">${['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(l => `<option ${st.level === l ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="f">ახალი სიტყვა დღეში<select onchange="L_('${lang}').daily=+this.value;save();render()">${[5, 10, 15, 20].map(n => `<option ${st.daily === n ? 'selected' : ''} value="${n}">${n}</option>`).join('')}</select></label>
    </div>
    <label class="f" style="margin-top:8px">კურსი / პროცესი<input value="${esc(st.note)}" placeholder="მაგ. Duolingo unit 12, მასწავლებელთან 2×კვირაში" onchange="L_('${lang}').note=this.value;save()"></label>
    <div style="margin-top:10px"><div class="row between sub"><span>ლექსიკონი: ${ls.seen}/${ls.total} ნანახი · ${ls.known} მყარად</span><span>${Math.round(ls.known / ls.total * 100)}%</span></div><div class="bar"><i style="width:${ls.seen / ls.total * 100}%;opacity:.4;position:relative"></i></div><div class="bar" style="margin-top:3px"><i style="width:${ls.known / ls.total * 100}%"></i></div></div>
    <p class="note">მეთოდი: Spaced repetition (Leitner) — სიტყვა ბრუნდება 1, 2, 4, 7, 15, 30… დღეში, ზუსტად მაშინ, როცა ავიწყდები.</p>
  </div>

  <div class="card"><b>📚 კითხვა — 10 გვერდი დღეში</b>
    <div class="grid2" style="margin-top:8px"><label class="f">წიგნი<input value="${esc(book.title || '')}" placeholder="მაგ. Atomic Habits" onchange="(S.book=S.book||{}).title=this.value;save()"></label>
    <label class="f">დღეს წავიკითხე (გვ.)<input inputmode="numeric" value="${book.pages?.[TODAY] || ''}" onchange="S.book=S.book||{};(S.book.pages=S.book.pages||{})[TODAY]=+this.value;save();render()"></label></div>
    <div class="sub" style="margin-top:6px">ამ კვირაში: ${weekDays(0).reduce((a, k) => a + (book.pages?.[k] || 0), 0)} გვ.</div></div>`;
}
