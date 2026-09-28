// ============ LEARN: Portuguese & English — spaced repetition (reviews first, then new words) ============
// Two languages are taught (pt, en); explanations/translations come in the language the user picks.
const LANGS = { pt: { flag: '🇵🇹', voice: 'pt-PT' }, en: { flag: '🇬🇧', voice: 'en-GB' } };
const EXPLAIN = [['ka', 'ქართული'], ['en', 'English'], ['ru', 'Русский'], ['es', 'Español'], ['de', 'Deutsch'], ['zh', '中文'], ['fr', 'Français'], ['tr', 'Türkçe'], ['uk', 'Українська'], ['pt', 'Português']];
const INTERVALS = [0, 1, 2, 4, 7, 15, 30, 60, 120]; // days per box
let LEARN_LANG = 'pt', REVEAL = false;

// built-in explanation languages; the rest load from i18n/<code>.js on demand
const LEARN_TR = {
  ka: {
    ui: { title: 'სწავლა', sub: 'ყოველდღე: ჯერ ძველების გამეორება, მერე ახალი სიტყვები', streak: 'დღე ზედიზედ', due: 'გასამეორებელი', newToday: 'ახალი დღეს', learned: 'ნასწავლი', newWord: 'ახალი სიტყვა', review: 'გამეორება', reverse: 'თარგმნე უცხოურად', listen: 'მოსმენა', tap: 'შეეხე პასუხის სანახავად', no: 'არ ვიცოდი', hard: 'ძნელი', yes: 'ვიცოდი', doneT: 'დღევანდელი დასრულდა', doneS: 'ხვალ ახალი სიტყვები და გამეორება გელოდება.', allSeen: 'ყველა სიტყვა გავლილია — გამეორება გრძელდება.', phrase: 'დღის ფრაზა', where: 'სად ვარ', level: 'დონე', perDay: 'ახალი სიტყვა დღეში', course: 'კურსი / პროცესი', coursePh: 'მაგ. Duolingo unit 12, მასწავლებელთან 2×კვირაში', vocab: 'ლექსიკონი', seen: 'ნანახი', solid: 'მყარად', method: 'მეთოდი: Spaced repetition (Leitner) — სიტყვა ბრუნდება 1, 2, 4, 7, 15, 30… დღეში, ზუსტად მაშინ, როცა ავიწყდება.', read: 'კითხვა — 10 გვერდი დღეში', book: 'წიგნი', readToday: 'დღეს წავიკითხე (გვ.)', week: 'ამ კვირაში', pages: 'გვ.', explain: 'ახსნის ენა', noVoice: 'ხმა ამ მოწყობილობაზე მიუწვდომელია', doneToast: '🎉 დღევანდელი სიტყვები დასრულდა!', langPt: 'პორტუგალიური', langEn: 'ინგლისური' },
    pt: WORDS.pt.map(w => w[1]), en: WORDS.en.map(w => w[1]), ppt: PHRASES.pt.map(p => p[1]), pen: PHRASES.en.map(p => p[1]),
  },
  en: {
    ui: { title: 'Learn', sub: 'Every day: reviews first, then new words', streak: 'days in a row', due: 'To review', newToday: 'New today', learned: 'Learned', newWord: 'New word', review: 'Review', reverse: 'translate into the foreign language', listen: 'Listen', tap: 'Tap to see the answer', no: 'Didn’t know', hard: 'Hard', yes: 'Knew it', doneT: 'Done for today', doneS: 'Tomorrow: new words and reviews.', allSeen: 'All words seen — reviews continue.', phrase: 'Phrase of the day', where: 'Where I am', level: 'Level', perDay: 'New words per day', course: 'Course / progress', coursePh: 'e.g. Duolingo unit 12; teacher 2× a week', vocab: 'Vocabulary', seen: 'seen', solid: 'solid', method: 'Method: spaced repetition (Leitner) — a word comes back after 1, 2, 4, 7, 15, 30… days, right when you’re about to forget it.', read: 'Reading — 10 pages a day', book: 'Book', readToday: 'Read today (pages)', week: 'This week', pages: 'p.', explain: 'Explain in', noVoice: 'Voice isn’t available on this device', doneToast: '🎉 Today’s words are done!', langPt: 'Portuguese', langEn: 'English' },
    pt: WORDS.pt.map(w => w[2]),
    ppt: ['What’s your name?', 'My name is …', 'I don’t understand.', 'Could you repeat, please?', 'Do you speak English?', 'How much is it?', 'The bill, please.', 'Where is the bathroom?', 'A coffee, please.', 'I’m learning Portuguese.', 'I’m going to the gym.', 'I’m a DJ and producer.', 'I’m hungry.', 'I’m thirsty.', 'I’m tired.', 'See you tomorrow!', 'What time is it?', 'Can I pay by card?', 'I really like this.', 'Take it easy / no rush.', 'All good, thanks.', 'Sorry, I’m late.', 'Where is the station?', 'Can you help me?', 'Nice to meet you.'],
  },
};
const _loading = {};
function explainLang(deck = LEARN_LANG) { const x = S.explain || 'ka'; return x === deck ? (deck === 'en' ? 'ka' : 'en') : x; }
function tr() { const x = explainLang(); return LEARN_TR[x] ? x : 'ka'; }
function ensureLang(x) {
  if (LEARN_TR[x] || _loading[x]) return;
  _loading[x] = true; const s = document.createElement('script'); s.src = `i18n/${x}.js`;
  s.onload = () => { _loading[x] = false; if (TAB === 'learn') render(); };
  s.onerror = () => { _loading[x] = false; toast('⚠️ Translation couldn’t load — check your connection'); };
  document.head.appendChild(s);
}
const T = k => (LEARN_TR[tr()].ui[k] ?? LEARN_TR.en.ui[k]);
const meaning = (deck, i) => LEARN_TR[tr()][deck]?.[i] ?? LEARN_TR.ka[deck][i];
const phraseMeaning = (deck, i) => LEARN_TR[tr()]['p' + deck]?.[i] ?? LEARN_TR.ka['p' + deck][i];
const langName = deck => T(deck === 'pt' ? 'langPt' : 'langEn');

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
  const lg = learnLog(); lg[lang] = (lg[lang] || 0) + 1; if (!current(lang)) { lg.done = lg.done || {}; lg.done[lang] = true; toast(T('doneToast')); }
  REVEAL = false; save(); render();
}
function speak(txt, lang) {
  try { const u = new SpeechSynthesisUtterance(txt.split(' / ')[0].replace(/[()…]/g, '')); u.lang = LANGS[lang].voice; u.rate = 0.85;
    const v = speechSynthesis.getVoices().find(v => v.lang.replace('_', '-').startsWith(LANGS[lang].voice)); if (v) u.voice = v;
    speechSynthesis.cancel(); speechSynthesis.speak(u); } catch { toast(T('noVoice')); }
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
CATS.push(['lang', '🗣️', 'Languages']); XSTAT.lang = learnStatus;
function learnStreak() { let n = 0; for (let i = 0; i < 400; i++) { const k = dkey(addDays(new Date(), -i)); const s = learnStatus(k); if (s === 'done') n++; else if (i === 0 && s === 'pend') continue; else break; } return n; }

function vLearn() {
  ensureLang(explainLang());
  const lang = LEARN_LANG, st = L_(lang), q = queueOf(lang), cur = current(lang), w = cur ? WORDS[lang][cur.i] : null, ls = langStats(lang);
  const mean = cur ? meaning(lang, cur.i) : '';
  const reverse = cur && !cur.isNew && (st.cards[cur.i]?.b >= 3) && (cur.i + new Date().getDate()) % 2 === 0;
  const pi = Math.floor(Date.now() / 864e5) % PHRASES[lang].length, ph = PHRASES[lang][pi];
  const book = S.book || {};
  const hint = lang === 'pt' && tr() !== 'en' && w?.[2] ? w[2] : '';
  return `
  <h1>${T('title')}</h1>
  <div class="sub">${T('sub')} · 🔥 ${learnStreak()} ${T('streak')}</div>
  <div class="seg" style="margin:12px 0">${Object.entries(LANGS).map(([k, v]) => `<button class="${k === lang ? 'on' : ''}" onclick="LEARN_LANG='${k}';REVEAL=false;render()">${v.flag} ${langName(k)}</button>`).join('')}</div>
  <label class="f" style="margin-bottom:10px">🌐 ${T('explain')}<select id="explainSel" onchange="S.explain=this.value;save();ensureLang(explainLang());render()">${EXPLAIN.filter(([c]) => c !== lang).map(([c, n]) => `<option value="${c}" ${c === explainLang() ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
  ${_loading[explainLang()] ? '<div class="sub">⏳ …</div>' : ''}

  <div class="grid3"><div class="stat"><span>${T('due')}</span><b>${q.due.length}</b></div><div class="stat"><span>${T('newToday')}</span><b>${q.newLeft}</b></div><div class="stat"><span>${T('learned')}</span><b>${ls.known}</b></div></div>

  ${cur ? `<div class="flash" onclick="if(!REVEAL){REVEAL=true;render()}">
    <div class="sub">${cur.isNew ? '✨ ' + T('newWord') : '🔁 ' + T('review')}${reverse ? ' · ' + T('reverse') : ''}</div>
    <div class="fw">${esc(reverse ? mean : w[0])}</div>
    ${!reverse ? `<button class="btn sm" onclick="event.stopPropagation();speak(${esc(JSON.stringify(w[0]))},'${lang}')">🔊 ${T('listen')}</button>` : ''}
    ${REVEAL ? `<div class="fa">${esc(reverse ? w[0] : mean)}</div>${hint ? `<div class="sub">EN: ${esc(hint)}</div>` : ''}${reverse ? `<button class="btn sm" onclick="event.stopPropagation();speak(${esc(JSON.stringify(w[0]))},'${lang}')">🔊</button>` : ''}` : `<div class="sub" style="margin-top:18px">${T('tap')}</div>`}
  </div>
  ${REVEAL ? `<div class="grade"><button class="btn g0" onclick="answer(0)">✕ ${T('no')}</button><button class="btn g1" onclick="answer(1)">~ ${T('hard')}</button><button class="btn g2" onclick="answer(2)">✓ ${T('yes')}</button></div>` : ''}`
  : `<div class="card ok" style="text-align:center;padding:26px"><div style="font-size:40px">🎉</div><h3>${T('doneT')} · ${langName(lang)}</h3><p class="note">${T('doneS')} ${ls.seen >= ls.total ? T('allSeen') : ''}</p></div>`}

  <div class="card"><div class="sub">💬 ${T('phrase')}</div><div class="row between" style="margin-top:6px"><b style="font-size:17px">${esc(ph[0])}</b><button class="btn sm" onclick="speak(${esc(JSON.stringify(ph[0]))},'${lang}')">🔊</button></div><div class="note">${esc(phraseMeaning(lang, pi))}</div></div>

  <div class="card"><b>📍 ${T('where')}</b>
    <div class="grid2" style="margin-top:8px">
      <label class="f">${T('level')}<select onchange="L_('${lang}').level=this.value;save()">${['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(l => `<option ${st.level === l ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="f">${T('perDay')}<select onchange="L_('${lang}').daily=+this.value;save();render()">${[5, 10, 15, 20].map(n => `<option ${st.daily === n ? 'selected' : ''} value="${n}">${n}</option>`).join('')}</select></label>
    </div>
    <label class="f" style="margin-top:8px">${T('course')}<input value="${esc(st.note)}" placeholder="${esc(T('coursePh'))}" onchange="L_('${lang}').note=this.value;save()"></label>
    <div style="margin-top:10px"><div class="row between sub"><span>${T('vocab')}: ${ls.seen}/${ls.total} ${T('seen')} · ${ls.known} ${T('solid')}</span><span>${Math.round(ls.known / ls.total * 100)}%</span></div><div class="bar"><i style="width:${ls.seen / ls.total * 100}%;opacity:.4"></i></div><div class="bar" style="margin-top:3px"><i style="width:${ls.known / ls.total * 100}%"></i></div></div>
    <p class="note">${T('method')}</p>
  </div>

  <div class="card"><b>📚 ${T('read')}</b>
    <div class="grid2" style="margin-top:8px"><label class="f">${T('book')}<input value="${esc(book.title || '')}" placeholder="Atomic Habits" onchange="(S.book=S.book||{}).title=this.value;save()"></label>
    <label class="f">${T('readToday')}<input inputmode="numeric" value="${book.pages?.[TODAY] || ''}" onchange="S.book=S.book||{};(S.book.pages=S.book.pages||{})[TODAY]=+this.value;save();render()"></label></div>
    <div class="sub" style="margin-top:6px">${T('week')}: ${weekDays(0).reduce((a, k) => a + (book.pages?.[k] || 0), 0)} ${T('pages')}</div></div>`;
}
