import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
let Processor;const messages=[];
class Base {constructor(){this.port={postMessage:m=>messages.push(m)};}}
const sandbox={AudioWorkletProcessor:Base,sampleRate:48000,registerProcessor:(name,p)=>Processor=p,console,TextDecoder,TextEncoder,performance,atob,btoa,setTimeout,clearTimeout};
vm.runInNewContext(fs.readFileSync(new URL('dist/libpd-worklet.js',import.meta.url),'utf8'),sandbox);
const engine=new Processor();
for(let i=0;i<200&&!messages.some(m=>m.type==='ready');i++)await new Promise(r=>setTimeout(r,10));
assert(messages.some(m=>m.type==='ready'),'WASM booted: '+JSON.stringify(messages));
engine._onMessage({type:'load',files:JSON.parse(fs.readFileSync(new URL('dist/patches.json',import.meta.url))),openPath:'_LIRA-8.pd'});
assert(messages.some(m=>m.type==='patch-opened'&&m.ok),'Patch opened');
const errors=messages.filter(m=>m.type==='error'||(m.type==='print'&&/couldn.t create|error:|no such object/i.test(m.text)));
console.log('Patch diagnostics:',errors);assert.equal(errors.length,0);
const send=(name,value)=>{try{engine._onMessage({type:'float',receiver:'8008-s-'+name,value});}catch(e){console.log('Failed control:',name,value);throw e;}};
for(const c of JSON.parse(fs.readFileSync(new URL('dist/controls.json',import.meta.url))))send(c.name,c.value);
send('dsp',1);send('hold-1234',0);send('hold-5678',0);send('del-mix',0);send('dst-mix',0);send('vibrato',0);
function render(seconds){let peak=0,sum=0,n=0;for(let i=0;i<seconds*48000/128;i++){const l=new Float32Array(128),r=new Float32Array(128);engine.process([],[[l,r]]);for(const v of l){assert(Number.isFinite(v),'Finite audio');peak=Math.max(peak,Math.abs(v));sum+=v*v;n++;}}return{peak,rms:Math.sqrt(sum/n)};}
const silent=render(.3);const voices=[];for(let i=1;i<=8;i++){send('sensor-'+i,1);const result=render(.5);assert(result.rms>.0001,'Voice '+i+' produces audio');voices.push(result);send('sensor-'+i,0);render(.5);}
send('hold-1234',90);send('del-mix',90);send('feedback',100);send('drv',110);send('dst-mix',100);const stress=render(3);assert(stress.peak<20,'Bounded output');
console.log(JSON.stringify({silent,voices,stress},null,2));console.log('PASS: WASM boot, all objects, eight voices, finite feedback output.');
// Exercise control movement, not just stationary patches. Track runtime file I/O.
let fileWrites=0;
const originalWrite=engine.lib.FS.write;
engine.lib.FS.write=function(...args){fileWrites++;return originalWrite.apply(this,args);};
const timings=[];let sweepPeak=0;
for(let frame=0;frame<240;frame++){
  const t=performance.now();
  for(const name of ['feedback','mod-1','mod-2','mod-12','mod-34','mod-56','mod-78'])send(name,(frame%120)/119*127);
  const result=render(1/60);sweepPeak=Math.max(sweepPeak,result.peak);
  timings.push(performance.now()-t);
}
render(.75); // Include the desktop patch's delayed autosave.
const diagnostics=messages.filter(m=>m.type==='error'||(m.type==='print'&&/couldn.t create|error:/i.test(m.text)));
assert.equal(diagnostics.length,0,'No runtime errors during sweeps');
assert(sweepPeak>0&&sweepPeak<20,'Finite, bounded audio during sweeps');
if(!process.argv.includes('--baseline'))assert.equal(fileWrites,0,'Control changes must not write files on the audio thread');
timings.sort((a,b)=>a-b);
console.log(JSON.stringify({sweepPeak,fileWrites,medianFrameMs:timings[120],p95FrameMs:timings[228]},null,2));
