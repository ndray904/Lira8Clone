import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createControlSender} from './dist/control-sender.js';
const files=JSON.parse(fs.readFileSync(new URL('dist/patches.json',import.meta.url)));
// Test-only meters read each voice before the pair mix; production DSP is untouched.
const voice=files.find(f=>f.path==='abs/lira.voice.pd');
voice.content+='\n#X obj 700 600 env~ 128;\n#X obj 700 620 s probe-\\$2;\n#X obj 700 640 env~ 128;\n#X obj 700 660 s probe-\\$3;\n#X connect 4 0 64 0;\n#X connect 64 0 65 0;\n#X connect 10 0 66 0;\n#X connect 66 0 67 0;\n';
let Processor;const messages=[];
class Base{constructor(){this.port={postMessage:m=>messages.push(m)};}}
vm.runInNewContext(fs.readFileSync(new URL('dist/libpd-worklet.js',import.meta.url),'utf8'),{AudioWorkletProcessor:Base,sampleRate:48000,registerProcessor:(n,p)=>Processor=p,console,TextDecoder,TextEncoder,performance,atob,btoa,setTimeout,clearTimeout});
const engine=new Processor();
for(let i=0;i<200&&!messages.some(m=>m.type==='ready');i++)await new Promise(r=>setTimeout(r,10));
assert(messages.some(m=>m.type==='ready'));
engine._onMessage({type:'load',files,openPath:'_LIRA-8.pd'});
const send=createControlSender((name,value)=>engine._onMessage({type:'float',receiver:'8008-s-'+name,value}),cb=>cb());
for(const c of JSON.parse(fs.readFileSync(new URL('dist/controls.json',import.meta.url))))send(c.name,c.value);
send('hold-1234',0);send('hold-5678',0);send('vibrato',0);send('dsp',1);
for(let i=1;i<=8;i++)engine._onMessage({type:'bind',receiver:'probe-'+i});
const app=fs.readFileSync(new URL('dist/app.js',import.meta.url),'utf8');
const active=new Set(),heldKeys=new Set(),lit=new Set(),handlers={};
const elements=Object.fromEntries(Array.from({length:8},(_,i)=>['#pad-'+(i+1),{classList:{toggle:(name,on)=>on?lit.add(i+1):lit.delete(i+1)},setAttribute(){}}]));
const env={ready:true,context:{state:'running'},active,heldKeys,send,$:s=>elements[s],document:{addEventListener:(name,handler)=>handlers[name]=handler},start(){throw Error('Unexpected restart');},silence(){}};
vm.runInNewContext(app.match(/function touch\(i,on\)\{[^\n]+/)[0],env);
vm.runInNewContext(app.slice(app.indexOf("document.addEventListener('keydown'"),app.indexOf("window.addEventListener('blur'")),env);
function key(n,down){handlers[down?'keydown':'keyup']({key:String(n),code:'Digit'+n,target:{tagName:'INPUT'},preventDefault(){},stopPropagation(){}});}
function render(){messages.length=0;for(let b=0;b<375;b++){const output=[[new Float32Array(128),new Float32Array(128)]];engine.process([],output);for(const v of output[0][0])assert(Number.isFinite(v));}const levels={};for(const m of messages)if(m.type==='recv-float')levels[m.receiver]=m.value;const errors=messages.filter(m=>m.type==='error'||m.type==='print'&&/error:|couldn.t create|connection failed/i.test(m.text));assert.equal(errors.length,0,JSON.stringify(errors));return levels;}
for(const order of [[1,2,6],[6,2,1],[1,2,3,4,5,6,7,8],[8,7,6,5,4,3,2,1]]){
 for(const n of order)key(n,true);
 assert.equal(lit.size,order.length);assert.equal(active.size,order.length);
 const levels=render();for(const n of order)assert(levels['probe-'+n]>20,'Voice '+n+' audible before mixing: '+JSON.stringify(levels));
 console.log('PASS chord',order.join('+'),'voice levels (Pd dB):',JSON.stringify(levels));
 for(const n of order)key(n,false);
 assert.equal(lit.size,0);assert.equal(active.size,0);assert.equal(heldKeys.size,0);render();
}
console.log('PASS: real keyboard handler → touch → control sender → WASM envelopes and per-voice audio, with a slider focused.');
