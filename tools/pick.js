import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const list = {
 bench_press:'barbell bench press', incline_db_press:'incline dumbbell press', machine_chest_press:'machine chest press',
 db_lateral_raise:'dumbbell lateral raise', arnold_press:'arnold press', cable_front_raise:'cable front raise',
 rope_pushdown:'rope triceps pushdown', oh_db_triceps:'overhead dumbbell triceps extension', dips:'chest dips',
 pullup:'pull up', lat_pulldown:'wide grip lat pulldown', chest_supported_row:'chest supported t-bar row',
 one_arm_db_row:'one arm dumbbell row', face_pull:'cable face pull', barbell_curl:'barbell curl', incline_db_curl:'incline dumbbell curl',
 hammer_curl:'hammer curl', cable_curl:'cable curl', hack_squat:'hack squat', bulgarian_split_squat:'bulgarian split squat',
 leg_press:'leg press', lying_leg_curl:'lying leg curl', db_rdl:'dumbbell romanian deadlift', standing_calf_raise:'standing calf raise machine',
 hanging_leg_raise:'hanging leg raise', cable_crunch:'cable crunch', plank:'plank', incline_barbell_press:'incline barbell bench press',
 db_flat_press:'dumbbell bench press', pec_deck:'pec deck fly', shoulder_press:'seated dumbbell shoulder press', upright_row:'ez bar upright row',
 skull_crusher:'ez bar skull crusher', rope_oh_ext:'cable rope overhead triceps extension', pushup:'push up', weighted_pullup:'weighted pull up',
 smith_front_squat:'smith machine front squat', walking_lunge:'dumbbell walking lunges', leg_extension:'leg extension', hip_thrust:'barbell hip thrust',
 ab_wheel:'ab wheel rollout', side_plank:'side plank', hanging_knee_raise:'hanging knee raise',
 cable_lateral_raise:'cable lateral raise', cable_fly_low_high:'low to high cable fly', reverse_pec_deck:'reverse pec deck',
 seated_cable_row:'seated cable row', seated_leg_curl:'seated leg curl', seated_calf_raise:'seated calf raise', machine_shoulder_press:'machine shoulder press',
 single_arm_pushdown:'single arm cable triceps pushdown', mcgill_curlup:'mcgill curl up', bird_dog:'bird dog exercise', pallof_press:'pallof press',
 dead_bug:'dead bug exercise', close_grip_pulldown:'close grip lat pulldown', preacher_curl:'preacher curl', concentration_curl:'concentration curl',
 seated_row_machine:'seated row machine', meadows_row:'meadows row', machine_incline_press:'incline machine chest press'
};
const trusted = ['Renaissance Periodization','Jeff Nippard','Jeremy Ethier','Scott Herman Fitness','ScottHermanFitness','Mind Pump TV','Squat University','Athlean-X','ATHLEAN-X™','Dr. Mike Israetel','Built With Science','Alan Thrall','Mike Thurston','Jesse James West','Muscle & Strength','Buff Dudes'];
const sec = s => { if(!s) return 9999; const p=s.split(':').map(Number); return p.reduce((a,b)=>a*60+b,0); };
const res = {};
for (const [k, name] of Object.entries(list)) {
  let r = [];
  for (const q of [name + ' renaissance periodization', name + ' how to proper form']) {
    try { r = r.concat(JSON.parse(execFileSync('node', ['tools/yt.js', q]).toString())); } catch {}
  }
  const score = v => (trusted.some(t => (v.ch||'').toLowerCase() === t.toLowerCase()) ? 10 : 0) + (sec(v.len) <= 180 ? 4 : sec(v.len) <= 600 ? 2 : 0) + ((v.t||'').toLowerCase().includes(name.split(' ').slice(-1)[0]) ? 3 : 0);
  r.sort((a, b) => score(b) - score(a));
  res[k] = r[0];
  console.log(k.padEnd(22), r[0]?.id, '|', r[0]?.ch, '|', r[0]?.len, '|', r[0]?.t);
}
fs.writeFileSync('tools/videos.json', JSON.stringify(res, null, 1));
