import {createControlSender} from './control-sender.js';
import {createCircularScope} from './circular-scope.js';
import {createSphereScope} from './sphere-scope.js';
import {polar} from './ring-geometry.js';
import {R,LAYOUT,padAngle,padClip,place,buildPlate} from './disc.js';
const $=s=>document.querySelector(s);
const schema=await fetch('controls.json').then(r=>r.json());
const state=Object.fromEntries(schema.map(c=>[c.name,c.value]));
const widgets=new Map(), active=new Set(), heldKeys=new Set();
let context,node,gain,analyser,ready=false,starting=false;
const prints=[];
const send=createControlSender((name,value)=>node?.port.postMessage({type:'float',receiver:'8008-s-'+name,value}));
function set(name,value,defer=false){state[name]=value;const w=widgets.get(name);if(w){w.input.value=value;if(w.input.type==='checkbox')w.input.checked=!!value;w.update?.();}if(ready)send(name,value,defer);}
const disc=$('#disc');disc.prepend(buildPlate());
const unit=v=>Math.max(0,Math.min(1,v));
// Each control is a strip rotated onto its ray and anchored at its inner end; children lay out along it.
function ray(r0,len,angle,flip,cls){const el=document.createElement('div');el.className='ray '+cls+(flip?' flip':'');place(el,r0,angle,angle);el.style.setProperty('--len',len+'cqw');disc.append(el);return el;}
// Sliders: drag along the ray (Shift for fine); the hidden range input keeps keyboard and screen-reader access.
function slider({slider:name,label,aria=label,long,angle,flip}){const r0=long?R.longIn:R.shortIn,len=R.out-r0,box=ray(r0,len,angle,flip,'control slider'+(long?' long':''));
 box.innerHTML=`<div class="track"><i class="fill"></i><i class="thumb"></i></div><input aria-label="${aria}" id="${name}" type="range" min="0" max="127" step="1" value="${state[name]}"><span class="ray-label"><label for="${name}">${label}</label><output for="${name}"></output></span>`;
 const input=box.querySelector('input'),out=box.querySelector('output');
 const update=()=>{const v=+state[name];box.style.setProperty('--v',v/127);out.value=Math.round(v);};
 widgets.set(name,{input,update});input.addEventListener('input',()=>set(name,+input.value,true));
 const [ax,ay]=polar(r0,angle),cos=Math.cos(angle*Math.PI/180),sin=Math.sin(angle*Math.PI/180);
 const along=e=>{const b=disc.getBoundingClientRect();return ((e.clientX-b.left-ax/100*b.width)*cos+(e.clientY-b.top-ay/100*b.height)*sin)/(len/100*b.width);};
 box.onpointerdown=e=>{if(e.button||e.target.closest('button'))return;e.preventDefault();box.setPointerCapture(e.pointerId);input.focus({preventScroll:true});box.classList.add('dragging');
  let last=along(e),v=e.shiftKey?+state[name]:unit(last)*127;set(name,Math.round(v*10)/10,true);
  box.onpointermove=m=>{const t=along(m);v=m.shiftKey?Math.max(0,Math.min(127,v+(t-last)*127*.15)):unit(t)*127;last=t;set(name,Math.round(v*10)/10,true);};};
 box.onpointerup=box.onpointercancel=()=>{box.onpointermove=null;box.classList.remove('dragging');};update();return box;}
function toggle({toggle:name,label,aria=label},r0,angle,flip,cls=''){const el=ray(r0,4.4,angle,flip,'control toggle '+cls);el.innerHTML=`<label><input type="checkbox" aria-label="${aria}" ${state[name]?'checked':''}><span class="ray-label">${label}</span></label>`;const input=el.querySelector('input');input.onchange=()=>set(name,+input.checked);widgets.set(name,{input});return el;}
// Multi-position switch on a short ray; the hidden select stays the canonical value for presets and patch files.
function selector({step:name,label,options,aria=label},angle,flip){const box=ray(R.inner,3.4,angle,flip,'control selector');box.innerHTML=`<select id="${name}" hidden tabindex="-1">${options.map((s,i)=>`<option value="${i}">${s}</option>`).join('')}</select><button type="button" class="pill" aria-label="${aria}" role="${options.length===2?'switch':'slider'}"></button><span class="ray-label">${label} <output></output></span>`;const input=box.querySelector('select'),button=box.querySelector('button'),out=box.querySelector('output');
 const update=()=>{const i=+state[name];button.style.setProperty('--switch-index',i);button.style.setProperty('--switch-stops',options.length-1);out.value=options[i];button.title=aria+': '+options[i];if(options.length===2)button.setAttribute('aria-checked',String(i===1));else{button.setAttribute('aria-valuemin','0');button.setAttribute('aria-valuemax',String(options.length-1));button.setAttribute('aria-valuenow',String(i));button.setAttribute('aria-valuetext',options[i]);}};
 button.onclick=()=>set(name,(+state[name]+1)%options.length);
 button.onkeydown=e=>{let i=+state[name];if(e.key==='ArrowLeft'||e.key==='ArrowDown')i=Math.max(0,i-1);else if(e.key==='ArrowRight'||e.key==='ArrowUp')i=Math.min(options.length-1,i+1);else if(e.key==='Home')i=0;else if(e.key==='End')i=options.length-1;else return;e.preventDefault();e.stopPropagation();set(name,i);};
 widgets.set(name,{input,update});input.value=state[name];update();return box;}
for(const r of LAYOUT.rays){
 if(r.slider)slider(r);else toggle(r,R.shortIn-1.2,r.angle,r.flip,'solo');
 if(r.under?.step)selector(r.under,r.angle,r.flip);else if(r.under)toggle(r.under,R.inner,r.angle,r.flip);
}
const voiceDialog=document.createElement('dialog');voiceDialog.className='voice-dialog';voiceDialog.setAttribute('aria-labelledby','voice-menu-title');voiceDialog.innerHTML='<form method="dialog"><button class="close-menu" aria-label="Close">×</button></form><h2 id="voice-menu-title"></h2><p class="voice-context"></p><label for="voice-fine-tune">Fine tuning · 0–127</label><input id="voice-fine-tune" type="number" min="0" max="127" step="0.1">';document.body.append(voiceDialog);let fineVoice=1;
voiceDialog.querySelector('input').oninput=e=>{if(e.target.value!==''&&e.target.checkValidity())set('tune-'+fineVoice,+e.target.value,true);};voiceDialog.addEventListener('click',e=>{if(e.target===voiceDialog)voiceDialog.close();});
function touch(i,on){if(!ready)return;if(on)active.add(i);else active.delete(i);send('sensor-'+i,+on);const pad=$('#pad-'+i);pad.classList.toggle('active',on);pad.setAttribute('aria-pressed',String(on));}
for(let v=1;v<=8;v++){const a=padAngle(v),pair=Math.floor((v-1)/2)*2+1;
 const tune=$('#tune-'+v).closest('.slider');const fine=document.createElement('button');fine.type='button';fine.className='fine';fine.setAttribute('aria-label','Fine tune voice '+v);fine.setAttribute('aria-haspopup','dialog');tune.querySelector('output').replaceWith(fine);
 const w=widgets.get('tune-'+v),base=w.update;w.update=()=>{base();fine.textContent=(+state['tune-'+v]).toFixed(1);};w.update();
 fine.onclick=()=>{fineVoice=v;voiceDialog.querySelector('h2').textContent='Voice '+v;voiceDialog.querySelector('.voice-context').textContent=`Pair ${pair} + ${pair+1} · Group ${v<=4?'A':'B'} · Key ${v}`;voiceDialog.querySelector('input').value=state['tune-'+v];voiceDialog.showModal();};
 const pad=document.createElement('button');pad.id='pad-'+v;pad.className='pad';pad.style.clipPath=padClip(v);pad.setAttribute('aria-label','Play voice '+v);pad.setAttribute('aria-pressed','false');const num=document.createElement('span');num.className='pad-number';num.textContent=v;const [x,y]=polar((R.padIn+R.padOut)/2,a);num.style.left=x+'%';num.style.top=y+'%';const ray=LAYOUT.rays.find(r=>r.voice===v);num.style.setProperty('--rot',(ray.flip?a+180:a)+'deg');pad.append(num);$('#pads').append(pad);
 pad.onpointerdown=e=>{if(!ready){$('#status').textContent='Start audio to play';return;}e.preventDefault();pad.setPointerCapture(e.pointerId);touch(v,$('#latch').checked?!active.has(v):true);};pad.onpointerup=()=>{if(!$('#latch').checked)touch(v,false);};pad.onpointercancel=()=>touch(v,false);pad.onlostpointercapture=()=>{if(!$('#latch').checked)touch(v,false);};pad.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&!e.repeat){e.preventDefault();e.stopPropagation();touch(v,$('#latch').checked?!active.has(v):true);}};pad.onkeyup=e=>{if(e.key==='Enter'||e.key===' '){e.stopPropagation();if(!$('#latch').checked)touch(v,false);}};}
// Phones scroll the full-size disc sideways; start centred on the pads.
const wrap=$('.disc-wrap');wrap.scrollLeft=(wrap.scrollWidth-wrap.clientWidth)/2;
function status(text,on=false){$('#status').textContent=text;$('#lamp').classList.toggle('on',on);$('#power').classList.toggle('on',on);}
function applyPreset(type){for(const c of schema)set(c.name,c.value);for(const id of ['1234','5678'])set('hold-'+id,0);set('vol',95);if(type==='init'){set('drv',20);set('dst-mix',25);set('del-mix',25);set('feedback',30);set('vibrato',0);}if(type==='drone'){set('drv',34);set('dst-mix',35);set('del-mix',64);set('feedback',66);set('f-a',20);set('f-b',35);for(const p of ['12','34','56','78']){set('fast-'+p,0);set('mod-'+p,24);}}if(type==='metal'){set('drv',100);set('dst-mix',100);set('del-mix',60);set('feedback',80);for(const p of ['12','34','56','78']){set('sharp-'+p,100);set('mod-'+p,78);}}if(type==='space'){set('time-1',108);set('time-2',98);set('del-mix',90);set('feedback',88);set('mod-1',72);set('mod-2',60);set('drv',30);set('f-a',12);set('f-b',25);}}
applyPreset('init');
function awaitMessage(type,action){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{node.port.removeEventListener('message',listener);reject(new Error('Audio engine timed out. Please retry.'));},20000);function listener(e){if(e.data.type===type||e.data.type==='error'){clearTimeout(timer);node.port.removeEventListener('message',listener);if(e.data.type==='error'||e.data.ok===false)reject(new Error(e.data.message||'Could not open patch'));else resolve(e.data);}}node.port.addEventListener('message',listener);node.port.start();action?.();});}
async function start(){if(starting)return;starting=true;$('#power').disabled=true;try{if(context&&ready){await context.resume();gain.gain.setTargetAtTime(.6,context.currentTime,.03);for(const i of heldKeys)touch(i,true);status('Audio running',true);$('#power').textContent='Audio on';return;}status('Waking the circuit…');context=new AudioContext();await context.resume();await context.audioWorklet.addModule('libpd-worklet.js');node=new AudioWorkletNode(context,'libpd',{outputChannelCount:[2]});node.port.addEventListener('message',e=>{if(e.data.type==='print'){prints.push(e.data.text);if(/couldn.t create|error:/i.test(e.data.text))console.warn(e.data.text);}});await awaitMessage('ready');const files=await fetch('patches.json').then(r=>r.json());await awaitMessage('patch-opened',()=>node.port.postMessage({type:'load',files,openPath:'_LIRA-8.pd'}));gain=context.createGain();gain.gain.value=.6;const limiter=context.createDynamicsCompressor();limiter.threshold.value=-6;limiter.knee.value=6;limiter.ratio.value=20;limiter.attack.value=.003;limiter.release.value=.12;analyser=context.createAnalyser();analyser.fftSize=2048;node.connect(limiter).connect(gain).connect(analyser).connect(context.destination);ready=true;for(const [n,v] of Object.entries(state))send(n,v);send('dsp',1);for(const i of heldKeys)touch(i,true);status('Audio running · touch a voice',true);$('#power').textContent='Audio on';}catch(e){console.error(e);status(e.message);ready=false;await context?.close();context=null;node=null;$('#power').textContent='Retry audio';}finally{starting=false;$('#power').disabled=false;}}
async function silence(){for(const i of [...active])touch(i,false);heldKeys.clear();set('hold-1234',0);set('hold-5678',0);if(context){gain?.gain.setValueAtTime(0,context.currentTime);await context.suspend();}status('Silent · resume when ready');$('#power').textContent='Resume audio';}
$('#power').onclick=()=>{if(context?.state==='running'&&ready)silence();else start();};$('#panic').onclick=silence;
$('#preset').onchange=()=>{for(const i of [...active])touch(i,false);applyPreset($('#preset').value);};
$('#latch').onchange=()=>{for(const i of [...active])touch(i,false);};
document.addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey||e.isComposing||e.target.closest?.('.voice-dialog'))return;if(/^[1-8]$/.test(e.key)){e.preventDefault();e.stopPropagation();if(e.repeat)return;heldKeys.add(+e.key);if(ready&&context?.state==='running')touch(+e.key,true);else start();return;}if(/INPUT|SELECT|TEXTAREA|BUTTON/.test(e.target.tagName))return;if(e.code==='Space'){e.preventDefault();silence();}},true);
document.addEventListener('keyup',e=>{if(heldKeys.has(+e.key)){touch(+e.key,false);heldKeys.delete(+e.key);}});
window.addEventListener('blur',()=>{for(const i of [...active])if(!$('#latch').checked)touch(i,false);heldKeys.clear();});
$('#save').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({format:'lira-eight',version:1,parameters:state},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='lira-eight-patch.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('#load').onclick=()=>$('#file').click();$('#file').onchange=async()=>{try{const file=$('#file').files[0];if(!file)return;const p=JSON.parse(await file.text());if(p.format!=='lira-eight'||p.version!==1||!p.parameters)throw Error('Choose a LIRA Eight patch file.');for(const c of schema){const v=p.parameters[c.name],w=widgets.get(c.name);const max=w.input.type==='checkbox'?1:w.input.tagName==='SELECT'?w.input.options.length-1:127;if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>max)throw Error('Invalid value for '+c.name);}for(const i of [...active])touch(i,false);for(const c of schema)set(c.name,p.parameters[c.name]);status('Patch loaded',context?.state==='running');}catch(e){status(e.message);}finally{$('#file').value='';}};
// Scope views share the canvas: the flat ring, or the two 3D views of the same samples.
const drawRing=createCircularScope($('#scope')),drawSphere=createSphereScope($('#scope'));
let scopeMode='ring';try{scopeMode=localStorage.getItem('lira-scope')||'ring';}catch{}
function setScopeMode(mode){scopeMode=['ring','sphere','radiate'].includes(mode)?mode:'ring';for(const b of document.querySelectorAll('.scope-mode button'))b.setAttribute('aria-pressed',String(b.dataset.mode===scopeMode));try{localStorage.setItem('lira-scope',scopeMode);}catch{}}
for(const b of document.querySelectorAll('.scope-mode button'))b.onclick=()=>setScopeMode(b.dataset.mode);
setScopeMode(scopeMode);
function draw(time){requestAnimationFrame(draw);if(document.hidden)return;const on=context?.state==='running';if(scopeMode==='ring')drawRing(analyser,on,time);else drawSphere(analyser,on,time,scopeMode);}
requestAnimationFrame(draw);
