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
// Per-voice and per-pair controls live on the disc; global modules live in the rails.
for(let i=1;i<=8;i++)assert(document.querySelector('#tune-'+i).closest('.disc>.tune'),'Tune '+i+' not on disc');
for(const pair of ['12','34','56','78'])for(const name of ['sharp','mod','source'])assert(document.querySelector('#'+name+'-'+pair).closest('#disc'),'Pair control off disc: '+name+'-'+pair);
for(const name of ['f-a','f-b','andor','time-1','time-2','feedback','del-mix','mod-1','mod-2','del-mod','lfo-wav','pitch-1234','hold-1234','pitch-5678','hold-5678','drv','dst-mix','vol'])assert(document.querySelector('#'+name).closest('.rail'),'Global control outside rails: '+name);
for(const name of ['switch','total-fb','vibrato','quantize'])assert(result.widgets.get(name).input.closest('#routing'),'Network toggle missing: '+name);
for(const [name,widget] of result.widgets)assert(widget.input.closest('#disc,.rail'),'Audio parameter unavailable: '+name);
// Bottom-quadrant controls flip their labels inward; others do not.
for(const name of ['mod-56','tune-5','tune-6'])assert(document.querySelector('#'+name).closest('.inward'),'Expected inward: '+name);
for(const name of ['mod-12','tune-1','tune-4'])assert(!document.querySelector('#'+name).closest('.inward'),'Unexpected inward: '+name);
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
console.log('PASS: disc and rail placement, all 47 parameters, switches/presets, tuning and fine-tune dialog.');
