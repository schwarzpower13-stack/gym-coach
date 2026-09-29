// ============ TODAY: one calm screen — day ring, one next step, simple checklist ============
function todayItems() {
  const i = dow(), plan = dayPlan(i), t = targets(), goal = t?.water || 12, w = S.water[TODAY] || 0, pl = recPlan();
  const eaten = (S.eaten[TODAY] || []).filter(x => x === true).length;
  const left = queueOf('pt').due.length + queueOf('pt').newLeft + queueOf('en').due.length + queueOf('en').newLeft;
  const it = [
    { id: 'breath', when: 0, ic: '🌬️', t: 'DMT breathing', sub: '16 min · on waking', s: spStatus('breath', TODAY), go: "goSeg('spirit','morning')" },
    { id: 'creatine', when: 0, ic: '💊', t: 'Morning glass · creatine', sub: '30 s · follows your breathing', s: S.creatine[TODAY] ? 'done' : 'pend', go: 'morningGlass()', quick: 1 },
    { id: 'water', when: 0, ic: '💧', t: `Water ${w}/${goal}`, sub: '20-second drink moment', s: w >= goal * 0.8 ? 'done' : 'pend', go: 'drinkMoment(false)', quick: 1 },
  ];
  if (!plan.rest) it.push({ id: 'workout', when: 1, ic: '🏋️', t: plan.t, sub: plan.f, s: workoutStatus(TODAY), go: `SEL_DAY=${i};go('train')` });
  it.push({ id: 'meals', when: 1, ic: '🍽️', t: `Meals ${eaten}/5`, sub: 'snap a photo before eating', s: mealStatus(TODAY), go: "goSeg('food','today')" });
  if (pl.swim.includes(i)) it.push({ id: 'swim', when: 2, ic: '🏊', t: 'Swim', sub: S.openSession?.kind === 'swim' ? 'running — tap to stop' : 'tap Start at the pool, Stop after', s: recStatus('swim', TODAY), go: "timed('swim')" });
  if (pl.sauna.includes(i)) it.push({ id: 'sauna', when: 2, ic: '🧖', t: 'Sauna', sub: S.openSession?.kind === 'sauna' ? 'running — tap to stop' : 'tap Start at the door, Stop after', s: recStatus('sauna', TODAY), go: "timed('sauna')" });
  it.push({ id: 'static', when: 2, ic: '🧍', t: `Static pose ${staticTarget()} min`, sub: 'stand, breathe, be still', s: spStatus('static', TODAY), go: "goSeg('spirit','morning')" });
  it.push({ id: 'lang', when: 2, ic: '🗣️', t: 'Words', sub: left ? `${left} waiting` : 'all done', s: learnStatus(TODAY), go: "go('learn')" });
  it.push({ id: 'night', when: 2, ic: '🌙', t: 'Night mode', sub: 'phone to sleep · 30 min screen-free', s: (spGet(nightKey()).sleep || []).includes('screen') ? 'done' : 'pend', go: 'nightMode()' });
  it.push({ id: 'journal', when: 2, ic: '📖', t: 'Gratitude & manifestation', sub: 'before bed', s: spStatus('journal', TODAY), go: "goSeg('spirit','evening')" });
  return it;
}
const DONE = s => s === 'done' || s === 'bonus';
function nextUp(items) {
  const hr = new Date().getHours(), now = hr < 11 ? 0 : hr < 18 ? 1 : 2;
  const open = items.filter(x => x.s === 'pend' || x.s === 'part');
  return open.filter(x => x.when <= now && !x.quick)[0] || open.filter(x => !x.quick)[0] || open[0];
}
function vToday() {
  const d = new Date(), i = dow(), plan = dayPlan(i), c = cycle(), rd = readiness(), h = S.health[TODAY] || {};
  const items = todayItems(), done = items.filter(x => DONE(x.s)).length, pct = done / items.length;
  const nx = nextUp(items), ws = workoutStatus(TODAY), why = stOf(TODAY).workout, vibe = typeof vibeToday === 'function' ? vibeToday() : null;
  const hr = d.getHours(), greet = hr < 5 ? 'Still up' : hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
  const L = S.logs[TODAY], doneSets = L ? Object.values(L.sets).flat().filter(s => s?.ok).length : 0, total = plan.ex.reduce((a, e) => a + e.sets, 0);
  const next = !nx ? `<div class="next calm"><div class="sub">All done for today</div><h2>🌙 Beautiful work.</h2><p class="note">Everything on today’s list is complete. Rest, hydrate, sleep early.</p></div>`
    : nx.id === 'workout' ? `<div class="next">
        <div class="sub">Next step · ${c.deload ? 'deload week · ' : ''}week ${c.week}/6</div>
        <h2>${nx.ic} ${esc(plan.t)} <span class="sub">· ${esc(plan.f)}</span></h2>
        <div class="bar" style="margin:12px 0 6px"><i style="width:${total ? Math.min(100, doneSets / total * 100) : 0}%"></i></div>
        <div class="sub">${doneSets}/${total} sets · ${plan.ex.length} exercises · ~${Math.round(total * 2.6 + 8)} min</div>
        <button class="btn acc block" style="margin-top:14px" onclick="SEL_DAY=${i};startWorkout();go('train')">${S.workout?.date === TODAY || doneSets ? 'Continue' : 'Start workout'} ▶</button>
        <button class="btn sm ghost" style="margin-top:8px;width:100%" onclick="openMiss('workout')">Not today</button>${missChips('workout')}</div>`
    : `<div class="next"><div class="sub">Next step</div><h2>${nx.ic} ${esc(nx.t)}</h2><p class="note">${esc(nx.sub)}</p>
        <button class="btn acc block" style="margin-top:10px" onclick="${nx.go}">${nx.quick ? 'Mark done' : 'Open'} ▶</button></div>`;
  return `
  <div class="sub">${DOW[i]}, ${d.getDate()} ${MON[d.getMonth()]}</div>
  <h1>${greet}</h1>
  <p class="affirm">“${affirmation()}”</p>
  ${moveCard()}
  ${openBanner()}

  <div class="dayhead">
    ${ring(pct, `${Math.round(pct * 100)}%`)}
    <div class="dh-r">
      <div class="sub">Today</div><b>${done} of ${items.length} done</b>
      ${rd ? `<div class="note">Readiness <b style="color:var(--${rd.cls})">${rd.sc}</b> · ${esc(rd.t)}</div>` : ''}
      <button class="vibe-chip" onclick="goSeg('spirit','freq')">${vibe ? `〰️ Frequency <b>${vibe.lvl}</b> · ${vibe.name}` : '〰️ Check your frequency'}</button>
    </div>
  </div>

  ${ws === 'miss' ? `<div class="next rest"><div class="sub">Workout</div><h2>🌿 Rest taken today</h2>
    <p class="note">${reasonLabel(why) ? 'Reason: ' + reasonLabel(why) + '. ' : ''}${REASON_TIP[why] || REASON_TIP.other}</p>
    <div class="row" style="gap:8px"><button class="btn sm" onclick="unmarkMiss('workout')">Undo</button><button class="btn sm acc" style="flex:1" onclick="unmarkMiss('workout');SEL_DAY=${i};startWorkout();go('train')">Train anyway ▶</button></div></div>` : ''}
  ${next}

  <div class="card list">
    ${items.map(x => `<button class="trow ${x.s === 'miss' ? 'soft-miss' : ''} ${nx && x.id === nx.id ? 'is-next' : ''}" onclick="${x.go}">
      <i class="st-${x.s}">${DONE(x.s) ? '✓' : x.s === 'miss' ? '·' : x.s === 'part' ? '½' : ''}</i>
      <span><b>${x.ic} ${esc(x.t)}</b><small>${x.s === 'miss' ? 'not today' : esc(x.sub)}</small></span><em>›</em></button>`).join('')}
  </div>

  ${weekStrip()}
  ${coachCard(1)}

  <div class="grid3">
    <div class="stat"><span>Steps</span><b>${h.steps ? fmt(h.steps) : '—'}</b></div>
    <div class="stat"><span>Resting HR</span><b>${h.rhr ? Math.round(h.rhr) : '—'}</b></div>
    <div class="stat"><span>Sleep</span><b>${h.sleep ? h.sleep + 'h' : '—'}</b></div>
  </div>
  ${!S.health[TODAY]?.t ? `<div class="card"><div class="row between"><b>❤️ Apple Health</b><button class="btn sm" onclick="go('health')">How?</button></div><div class="note">Run the “Coach” shortcut, then tap here → <b>Paste</b></div><textarea id="tpaste" rows="1" placeholder="Tap here → Paste" onpaste="setTimeout(() => pasteHealth(this.value), 50)" class="pastebox"></textarea></div>` : ''}`;
}
