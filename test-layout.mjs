import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {mountOrbit} from './dist/concentric-layout.js';
import {createCircularScope} from './dist/circular-scope.js';
import {createControlSender} from './dist/control-sender.js';
import {REFERENCE} from './dist/reference-layout.js';
const {document,window}=parseHTML(fs.readFileSync(new URL('dist/index.html',import.meta.url),'utf8'));
globalThis.document=document;globalThis.Event=window.Event;globalThis.requestAnimationFrame=()=>0;
// Linkedom omits the browser's writable select.value and canvas/dialog APIs.
Object.defineProperty(window.HTMLSelectElement.prototype,'value',{get(){return [...this.options].find(o=>o.selected)?.getAttribute('value')??this.options[0]?.getAttribute('value');},set(v){for(const o of this.options)o.selected=o.getAttribute('value')===String(v);},configurable:true});
document.querySelector('#scope').getContext=()=>({});
const schema=JSON.parse(fs.readFileSync(new URL('dist/controls.json',import.meta.url)));
const app=fs.readFileSync(new URL('dist/app.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'');
const sandbox={document,window,mountOrbit,createCircularScope,createControlSender,fetch:async()=>({json:async()=>schema}),requestAnimationFrame:()=>0,console,Blob,URL,setTimeout,clearTimeout};
const result=await vm.runInNewContext('(async()=>{'+app+';return {widgets,state};})()',sandbox);
assert.equal(result.widgets.size,47);
for(const [name,widget] of result.widgets)assert(document.body.contains(widget.input),'Control detached: '+name);
assert.equal(document.querySelectorAll('#pad-ring .pad').length,8);
assert.equal(document.querySelectorAll('.voice-tune').length,8);
assert.equal(document.querySelectorAll('.voice-menu').length,8);
assert.equal(document.querySelectorAll('.network-button').length,4);
assert.equal(document.querySelectorAll('.ring-switch').length,10); // Fast x4, network x4, Link, Latch.
for(const name of ['drv','dst-mix','vol','time-1','time-2','feedback','del-mix','pitch-1234','hold-1234','pitch-5678','hold-5678'])assert(document.querySelector('#'+name).closest('.ring-controls'),'Missing shared ring control '+name);
for(const pair of ['12','34','56','78'])for(const param of ['sharp','mod','source'])assert(document.querySelector('#'+param+'-'+pair).closest('.ring-controls'),'Pair control not in ring');
for(const name of ['mod-1','mod-2','del-mod','lfo-wav'])assert(document.querySelector('#'+name).closest('.settings-dialog'),'Advanced control unavailable: '+name);
for(const name of ['f-a','f-b','andor'])assert(document.querySelector('#'+name).closest('.reference-lfo'),'Hyper LFO outside top dock: '+name);
for(const [name,widget] of result.widgets)assert(widget.input.closest('#orbit,.settings-dialog'),'Audio parameter unavailable: '+name);
for(const id of ['power','panic','latch'])assert(document.querySelector('#'+id).closest('#orbit'),'Performance control outside panel');
assert.equal(document.querySelectorAll('.reference-dock').length,2);
assert(!document.querySelector('.ring-plate circle[r="425"]'),'Remove extra utility ring');
for(let i=1;i<=8;i++){const tune=document.querySelector('#tune-'+i).closest('.voice-tune');assert.equal(parseFloat(tune.style.left),REFERENCE.voiceTune[i-1][0]);assert.equal(parseFloat(tune.style.top),REFERENCE.voiceTune[i-1][1]);}
const settings=document.querySelector('.settings-dialog');settings.showModal=()=>settings.open=true;settings.close=()=>settings.open=false;document.querySelector('#patch-settings').onclick();assert(settings.open,'Patch button opens additional live controls');settings.close();
assert.equal(document.querySelectorAll('.selector-switch').length,5);
for(const pair of ['12','34','56','78']){
 const input=document.querySelector('#source-'+pair),button=input.closest('.control').querySelector('.selector-switch');
 for(let i=0;i<3;i++){button.onclick();assert.equal(result.state['source-'+pair],Number(input.value));assert.equal(button.getAttribute('aria-valuenow'),input.value);}
 button.onkeydown({key:'End',preventDefault(){},stopPropagation(){}});assert.equal(result.state['source-'+pair],2);
 button.onkeydown({key:'Home',preventDefault(){},stopPropagation(){}});assert.equal(result.state['source-'+pair],0);
}
const combine=document.querySelector('#andor').closest('.control').querySelector('.selector-switch');combine.onclick();assert.equal(combine.getAttribute('aria-checked'),String(result.state.andor===1));
for(const name of ['switch','total-fb','vibrato','quantize']){const input=result.widgets.get(name).input;input.checked=!input.checked;input.dispatchEvent(new window.Event('change'));assert.equal(result.state[name],Number(input.checked));}
document.querySelector('#preset').value='space';document.querySelector('#preset').dispatchEvent(new window.Event('change'));
for(const pair of ['12','34','56','78'])assert.equal(document.querySelector('#source-'+pair).closest('.control').querySelector('.selector-switch').getAttribute('aria-valuenow'),String(result.state['source-'+pair]),'Preset syncs switch');
for(let i=1;i<=8;i++)assert.match(document.querySelector('#pad-'+i).style.clipPath,/^polygon\(/);
const tune=document.querySelector('#tune-6');tune.value='73.2';tune.dispatchEvent(new window.Event('input'));assert.equal(result.state['tune-6'],73.2,'Relocated dial updates original state');
const dialog=document.querySelector('.voice-dialog');dialog.showModal=()=>dialog.open=true;dialog.close=()=>dialog.open=false;
document.querySelector('[aria-label="Open voice 6 menu"]').onclick();assert(dialog.open);assert.equal(dialog.querySelector('h2').textContent,'VOICE 6');assert.match(dialog.querySelector('.voice-context').textContent,/Pair 5 \+ 6 · Group B/);
const fine=dialog.querySelector('#voice-fine-tune');fine.checkValidity=()=>true;fine.value='81.5';fine.dispatchEvent(new window.Event('input'));assert.equal(result.state['tune-6'],81.5,'Menu edits original live tuning value');
for(let i=1;i<=8;i++)document.querySelector('[aria-label="Open voice '+i+' menu"]').onclick();
assert(!document.querySelector('.effects'));assert(!document.querySelector('#groups'));
console.log('PASS: reference ring geometry, measured voice positions, top/bottom docks, Patch settings access, all 47 parameters, switches/presets, tuning and menus.');
