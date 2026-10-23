import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const code=fs.readFileSync(new URL('dist/app.js',import.meta.url),'utf8');
const handlers={},heldKeys=new Set(),notes=[];let starts=0;
const env={heldKeys,ready:true,context:{state:'running'},document:{addEventListener:(name,fn)=>handlers[name]=fn},touch:(...args)=>notes.push(args),start:()=>starts++,silence:()=>{}};
vm.runInNewContext(code.slice(code.indexOf("document.addEventListener('keydown'"),code.indexOf("window.addEventListener('blur'")),env);
function event(key,tagName='INPUT',extra={}){return {key,code:'Digit'+key,target:{tagName},preventDefault(){this.prevented=true;},stopPropagation(){},...extra};}
for(const tag of ['INPUT','SELECT','BUTTON','DIV'])for(let i=1;i<=8;i++){
 const e=event(String(i),tag);handlers.keydown(e);assert(e.prevented);assert(heldKeys.has(i));handlers.keyup(e);assert(!heldKeys.has(i));assert.deepEqual(notes.at(-2),[i,true]);assert.deepEqual(notes.at(-1),[i,false]);
}
const before=notes.length;handlers.keydown(event('2','INPUT',{repeat:true}));handlers.keydown(event('2','INPUT',{ctrlKey:true}));assert.equal(notes.length,before);
// Reproduce reported chord, then add every remaining voice without releasing it.
for(const i of [1,2,6])handlers.keydown(event(String(i)));
assert.deepEqual([...heldKeys],[1,2,6]);
assert.deepEqual(notes.slice(-3),[[1,true],[2,true],[6,true]]);
for(const i of [3,4,5,7,8])handlers.keydown(event(String(i)));
assert.equal(heldKeys.size,8,'All eight keyboard voices can be held together');
for(let i=1;i<=8;i++)handlers.keyup(event(String(i)));
assert.equal(heldKeys.size,0);
console.log('PASS: 1 + 2 + 6 and all eight simultaneous pad key events.');
const menuEvent=event('6');menuEvent.target.closest=()=>({});const beforeMenu=notes.length;handlers.keydown(menuEvent);assert.equal(notes.length,beforeMenu);assert(!menuEvent.prevented,'Voice menu permits typing a numeric tuning value');
env.context.state='suspended';handlers.keydown(event('3'));assert.equal(starts,1);handlers.keyup(event('3'));assert(!heldKeys.has(3));
env.ready=false;handlers.keydown(event('4'));assert.equal(starts,2);handlers.keyup(event('4'));
assert(code.includes('for(const i of heldKeys)touch(i,true);'), 'Play only keys still held after audio startup');
console.log('PASS: keys 1–8 from sliders, menus, buttons and panel; release, repeats, modifiers, audio startup/resume.');
