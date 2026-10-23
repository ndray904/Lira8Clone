import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {createCircularScope} from './dist/circular-scope.js';
import {createControlSender} from './dist/control-sender.js';
import {polar} from './dist/ring-geometry.js';
const {document,window}=parseHTML(fs.readFileSync(new URL('dist/index.html',import.meta.url),'utf8'));
globalThis.document=document;globalThis.Event=window.Event;globalThis.requestAnimationFrame=()=>0;
const disc=await import('./dist/disc.js');
// Linkedom omits the browser's writable select.value and canvas/dialog APIs.
Object.defineProperty(window.HTMLSelectElement.prototype,'value',{get(){return [...this.options].find(o=>o.selected)?.getAttribute('value')??this.options[0]?.getAttribute('value');},set(v){for(const o of this.options)o.toggleAttribute('selected',o.getAttribute('value')===String(v));},configurable:true});
document.querySelector('#scope').getContext=()=>({});
const schema=JSON.parse(fs.readFileSync(new URL('dist/controls.json',import.meta.url)));
const app=fs.readFileSync(new URL('dist/app.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'');
const sandbox={document,window,Event:window.Event,createCircularScope,createControlSender,polar,...disc,fetch:async()=>({json:async()=>schema}),requestAnimationFrame:()=>0,console,Blob,URL,setTimeout,clearTimeout};
const result=await vm.runInNewContext('(async()=>{'+app+';return {widgets,state};})()',sandbox);
assert.equal(result.widgets.size,47);
for(const [name,widget] of result.widgets)assert(document.body.contains(widget.input),'Control detached: '+name);
assert.equal(document.querySelectorAll('#pads .pad').length,8);
for(let i=1;i<=8;i++)assert.match(document.querySelector('#pad-'+i).style.clipPath,/^polygon\(/);
// Everything lives on the disc: one radial slider per former knob, switches and LEDs on their own rays.
assert.equal(document.querySelectorAll('.rail').length,0,'No side rails remain');
for(const [name,widget] of result.widgets)assert(widget.input.closest('#disc>.ray'),'Control off the disc: '+name);
assert.equal(document.querySelectorAll('#disc>.slider').length,31);
for(let i=1;i<=8;i++)assert(document.querySelector('#tune-'+i).closest('.slider.long'),'Tune '+i+' is a long slider');
for(const name of ['mod-12','sharp-56','pitch-1234','hold-5678','time-1','feedback','vol','drv','f-a','f-b','mod-1'])assert(document.querySelector('#'+name).closest('.slider:not(.long)'),'Short slider: '+name);
// Rays never crowd each other, each pad sits under its own tune slider, and left-half labels turn upright.
const angles=disc.LAYOUT.rays.map(r=>r.angle).sort((a,b)=>a-b);
for(let k=1;k<angles.length;k++)assert(angles[k]-angles[k-1]>=6.9,'Rays too close at '+angles[k]);
assert(angles[0]+360-angles.at(-1)>=6.9);
for(let i=1;i<=8;i++)assert.equal(disc.padAngle(i),disc.LAYOUT.rays.find(r=>r.slider==='tune-'+i).angle);
for(const ray of disc.LAYOUT.rays){const el=document.querySelector('#'+(ray.slider||ray.toggle))?.closest('.ray')||result.widgets.get(ray.toggle).input.closest('.ray'),c=Math.cos(ray.angle*Math.PI/180);
 if(c<-.3)assert(el.classList.contains('flip'),'Left-half label not upright: '+(ray.slider||ray.toggle));
 if(c>.3&&Math.sin(ray.angle*Math.PI/180)<.6)assert(!el.classList.contains('flip'),'Right-half label flipped: '+(ray.slider||ray.toggle));}
for(const name of ['source-12','fast-12','del-mod','andor','link'])assert(result.widgets.get(name).input.closest('.ray').style.left,'Inner switch placed: '+name);
assert.equal(document.querySelectorAll('.pill').length,7);
for(const pair of ['12','34','56','78']){
 const input=document.querySelector('#source-'+pair),button=input.closest('.control').querySelector('.pill');
 for(let i=0;i<3;i++){button.onclick();assert.equal(result.state['source-'+pair],Number(input.value));assert.equal(button.getAttribute('aria-valuenow'),input.value);}
 button.onkeydown({key:'End',preventDefault(){},stopPropagation(){}});assert.equal(result.state['source-'+pair],2);
 button.onkeydown({key:'Home',preventDefault(){},stopPropagation(){}});assert.equal(result.state['source-'+pair],0);
}
const combine=document.querySelector('#andor').closest('.control').querySelector('.pill');combine.onclick();assert.equal(combine.getAttribute('aria-checked'),String(result.state.andor===1));
for(const name of ['switch','total-fb','vibrato','quantize']){const input=result.widgets.get(name).input;input.checked=!input.checked;input.dispatchEvent(new window.Event('change'));assert.equal(result.state[name],Number(input.checked));}
document.querySelector('#preset').value='space';document.querySelector('#preset').dispatchEvent(new window.Event('change'));
for(const pair of ['12','34','56','78'])assert.equal(document.querySelector('#source-'+pair).closest('.control').querySelector('.pill').getAttribute('aria-valuenow'),String(result.state['source-'+pair]),'Preset syncs switch');
const tune=document.querySelector('#tune-6');tune.value='73';tune.dispatchEvent(new window.Event('input'));assert.equal(result.state['tune-6'],73,'Dial input updates state');
const dialog=document.querySelector('.voice-dialog');dialog.showModal=()=>dialog.open=true;dialog.close=()=>dialog.open=false;
document.querySelector('[aria-label="Fine tune voice 6"]').onclick();assert(dialog.open);assert.equal(dialog.querySelector('h2').textContent,'Voice 6');assert.match(dialog.querySelector('.voice-context').textContent,/Pair 5 \+ 6 · Group B/);
const fine=dialog.querySelector('#voice-fine-tune');fine.checkValidity=()=>true;fine.value='81.5';fine.dispatchEvent(new window.Event('input'));assert.equal(result.state['tune-6'],81.5,'Fine tune edits live tuning value');
assert.equal(document.querySelector('[aria-label="Fine tune voice 6"]').textContent,'81.5');
console.log('PASS: all 47 parameters on the disc as radial sliders and switches, ray spacing, pad alignment, switches/presets, tuning and fine-tune dialog.');
