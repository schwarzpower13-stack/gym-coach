// ============ UI helpers: segmented pages (one calm section at a time) ============
// A view marks its sections with <!--SEG:key--> comments; everything before the first marker is the page header.
const SEG = { food: 'today', stats: 'overview', spirit: 'freq' };
function segmented(page, labels, html) {
  const parts = html.split(/<!--SEG:(\w+)-->/), head = parts[0], secs = {};
  for (let i = 1; i < parts.length; i += 2) secs[parts[i]] = (secs[parts[i]] || '') + parts[i + 1];
  if (!secs[SEG[page]]) SEG[page] = Object.keys(labels)[0];
  const bar = `<div class="seg segpage">${Object.entries(labels).map(([k, l]) => `<button class="${SEG[page] === k ? 'on' : ''}" onclick="SEG['${page}']='${k}';render();scrollTo(0,0)">${l}</button>`).join('')}</div>`;
  return head + bar + (secs[SEG[page]] || '');
}
function goSeg(tab, seg) { SEG[tab] = seg; go(tab); }

// gentle daily lines — rotate by date
const AFFIRM = [
  'Slow is smooth, smooth is strong.', 'Show up. That’s the whole trick.', 'Breathe first. Then begin.', 'Small steps, every day, compound.',
  'Your body keeps the score of every kind choice.', 'Rest is part of the plan, not a break from it.', 'Consistency over intensity.',
  'Today: one good workout, one good meal, one good night.', 'Calm mind, strong body.', 'You don’t need motivation. You need a next step.',
  'Progress, not perfection.', 'Be the person your future self thanks.', 'Energy flows where attention goes.', 'Water, protein, sleep. Repeat.',
  'Gentle with yourself, serious about the plan.', 'A missed day is data, not a verdict.', 'Stand tall. Breathe low. Move with intent.',
  'Discipline is remembering what you want.', 'The body achieves what the mind believes.', 'Earn the sleep tonight.',
];
const affirmation = () => AFFIRM[Math.floor(Date.now() / 864e5) % AFFIRM.length];
