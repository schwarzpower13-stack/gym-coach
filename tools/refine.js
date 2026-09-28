import { execFileSync } from 'node:child_process';
const qs = process.argv.slice(2);
for (const q of qs) {
  let r=[]; for (let i=0;i<3 && !r.length;i++) { try { r = JSON.parse(execFileSync('node',['tools/yt.js',q]).toString()); } catch {} }
  console.log('== '+q); r.slice(0,4).forEach(v=>console.log('  ',v.id,'|',v.ch,'|',v.len,'|',v.t));
}
