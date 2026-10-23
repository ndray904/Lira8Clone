// Bundles dist/ into one self-contained HTML file: modules inlined in dependency order,
// JSON and the audio worklet embedded as inert script blocks, images as data URIs.
// Usage: node build-single.mjs [output.html]   (default LIRA-8.html beside this script)
// The worklet loads from a data: URL because browsers refuse blob: worklets on file:// pages.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dist=fileURLToPath(new URL('./dist/',import.meta.url));
const out=path.resolve(process.argv[2]||fileURLToPath(new URL('./LIRA-8.html',import.meta.url)));
const read=f=>fs.readFileSync(path.join(dist,f),'utf8');
const dataUri=(f,type)=>`data:${type};base64,${fs.readFileSync(path.join(dist,f)).toString('base64')}`;
const inert=s=>s.replace(/<\/script/gi,'<\\/script').replace(/<!--/g,'<\\!--');
const assert=(ok,msg)=>{if(!ok)throw Error(msg);};

// Each library module becomes a function returning its exports; imports become destructuring.
function wrap(file,src){
 const names=[...src.matchAll(/^export (?:const|function|let) (\w+)/gm)].map(m=>m[1]);
 const body=src.replace(/^import \{([^}]+)\} from '\.\/([\w-]+\.js)';$/gm,(_,ids,dep)=>`const {${ids}}=__mods['${dep}'];`).replace(/^export /gm,'');
 return `__mods['${file}']=(()=>{\n${body}\nreturn {${names.join(',')}};\n})();`;
}
const order=['ring-geometry.js','disc.js','control-sender.js','circular-scope.js','sphere-scope.js'];
let app=read('app.js').replace(/^import \{([^}]+)\} from '\.\/([\w-]+\.js)';$/gm,(_,ids,dep)=>`const {${ids}}=__mods['${dep}'];`);
const swaps=[
 ["fetch('controls.json').then(r=>r.json())","JSON.parse(document.getElementById('lira-controls').textContent)"],
 ["fetch('patches.json').then(r=>r.json())","JSON.parse(document.getElementById('lira-patches').textContent)"],
 ["addModule('libpd-worklet.js')","addModule('data:text/javascript;base64,'+btoa(unescape(encodeURIComponent(document.getElementById('lira-worklet').textContent))))"],
];
for(const [a,b] of swaps){assert(app.includes(a),'Missing in app.js: '+a);app=app.replace(a,b);}
assert(!/^import /m.test(app),'Unresolved import in app.js');

let css=read('style.css');assert(css.includes('url(slider-knob.png)'),'Knob image reference moved');
css=css.replace('url(slider-knob.png)',`url(${dataUri('slider-knob.png','image/png')})`);
let html=read('index.html');
const swapsHtml=[
 ['<link rel="stylesheet" href="style.css">',`<style>\n${css}\n</style>`],
 ['src="ouroboros.webp"',`src="${dataUri('ouroboros.webp','image/webp')}"`],
 ['<a href="LICENSES.txt">Third-party licenses</a>','<a href="https://github.com/ndray904/Lira8Clone/blob/main/dist/LICENSES.txt">Third-party licenses</a>'],
 ['<script type="module" src="input-monitor.js"></script><script type="module" src="app.js"></script>',
  `<script type="application/json" id="lira-controls">${inert(read('controls.json'))}</script>\n`+
  `<script type="application/json" id="lira-patches">${inert(read('patches.json'))}</script>\n`+
  `<script type="text/plain" id="lira-worklet">${inert(read('libpd-worklet.js'))}</script>\n`+
  `<script type="module">\n${inert(read('input-monitor.js'))}\n</script>\n`+
  `<script type="module">\nconst __mods={};\n${order.map(f=>inert(wrap(f,read(f)))).join('\n')}\n${inert(app)}\n</script>`],
];
for(const [a,b] of swapsHtml){assert(html.includes(a),'Missing in index.html: '+a.slice(0,50));html=html.replace(a,()=>b);}
// Keep the licence text with the file: it travels as a comment at the top.
html=html.replace('<!doctype html>',`<!doctype html>\n<!--\nLIRA·8 browser synthesizer, single-file build.\n${read('LICENSES.txt').replace(/--/g,'—')}\n-->`);
fs.writeFileSync(out,html);
console.log('Wrote',out,(fs.statSync(out).size/1048576).toFixed(2),'MB');
