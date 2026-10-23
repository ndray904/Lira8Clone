import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root = new URL('.', import.meta.url);
const dest = new URL('dist/', root);
fs.mkdirSync(dest, {recursive:true});
const source = new URL('upstream/LIRA-8_Pd_Standalone/',root);
const files=[];
function walk(dir,rel='') { for(const e of fs.readdirSync(dir,{withFileTypes:true})) { const p=path.join(dir,e.name), r=rel+e.name; if(e.isDirectory()) walk(p,r+'/'); else if(/\.(pd|txt)$/.test(r)) files.push({path:r,content:fs.readFileSync(p,'utf8')}); } }
walk(fileURLToPath(source));
const main=files.find(f=>f.path==='_LIRA-8.pd');
// A stable namespace lets browser messages address the original engine.
main.content=main.content.replaceAll('\\$0','8008');
const controls=[...main.content.matchAll(/gui\.link 8008 (\d+) ([\w-]+);/g)].map(m=>({index:+m[1],name:m[2]})).sort((a,b)=>a.index-b.index);
const initial=files.find(f=>f.path==='parameters.txt').content.split(';').map(Number);
// Desktop widgets have GUI-only methods unsupported by this WASM build.
// Keep object positions and connection indices; browser messages drive DSP receives directly.
main.content=main.content.replace(/#X obj (\d+) (\d+) (?:cnv|vsl|hsl|tgl|hradio|vradio|nbx|bng)\s[^;]*;/g,'#X obj $1 $2 list;');
// This runtime's random.seed method traps in WASM; retain Pd's default RNG seeds.
main.content=main.content.replace('s 8008-seed;', 's browser-unused-seed;');
// Browser owns patch persistence; desktop text updates/autosave are unnecessary
// on the real-time audio thread. Keep the original upstream source intact.
const guiLink=files.find(f=>f.path==='abs/gui.link/gui.link.pd');
guiLink.content=guiLink.content.replace('r \\$1-s-\\$3;', 'r browser-unused-parameter;');
// Smooth hand-operated modulation depths and feedback gain across 60 ms.
// Do not filter the LFO/audio modulation signals or alter the feedback routing.
for(const pos of ['290 477','500 199','708 199']){
  const before=`#X msg ${pos} \\$1 23.22;`;
  if(!main.content.includes(before))throw Error('Missing control ramp: '+pos);
  main.content=main.content.replace(before,`#X msg ${pos} \\$1 60;`);
}
const voice=files.find(f=>f.path==='abs/lira.voice.pd');
if(!voice.content.includes('#X msg 12 96 \\$1 23.22;'))throw Error('Missing voice modulation ramp');
voice.content=voice.content.replace('#X msg 12 96 \\$1 23.22;', '#X msg 12 96 \\$1 60;');
fs.writeFileSync(new URL('patches.json',dest),JSON.stringify(files));
fs.writeFileSync(new URL('controls.json',dest),JSON.stringify(controls.map(c=>({...c,value:initial[c.index-1]}))));
if(!fs.existsSync(new URL('libpd-worklet.js',dest)))fs.copyFileSync(new URL('../vendor/libpd-wasm/demo/libpd-worklet.js',root),new URL('libpd-worklet.js',dest));
fs.writeFileSync(new URL('LICENSES.txt',dest),'LIRA•8 — Miguel Moreno\n'+fs.readFileSync(new URL('upstream/LIRA-LICENSE.txt',root),'utf8')+'\n\nlibpd-wasm / Pure Data\n'+fs.readFileSync(new URL('upstream/LIBPD-LICENSE.txt',root),'utf8'));
console.log(`Prepared ${files.length} patch files and ${controls.length} controls.`);
