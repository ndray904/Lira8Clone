import {polar,annularSector,sectorClip} from './ring-geometry.js';
import {REFERENCE} from './reference-layout.js';
const $=s=>document.querySelector(s);
const ns='http://www.w3.org/2000/svg';
function svgEl(name,attrs){const el=document.createElementNS(ns,name);for(const [k,v]of Object.entries(attrs))el.setAttribute(k,v);return el;}
function position(el,r,a){const [x,y]=polar(r,a);el.style.left=x+'%';el.style.top=y+'%';return el;}
function node(tag,cls,text){const el=document.createElement(tag);el.className=cls;if(text)el.textContent=text;return el;}
function control(name){const input=$('#'+name);if(!input)throw Error('Missing control '+name);return input.closest('.control');}
export function mountOrbit(widgets){
 const orbit=$('#orbit');orbit.classList.add('concentric','reference');
 const padRing=$('#pad-ring'),tuneRing=$('#tune-ring');
 const plate=svgEl('svg',{viewBox:'0 0 1000 1000','aria-hidden':'true',class:'ring-plate'});
 for(const r of [135,139,187,190,285,290,368,372,482,488,497])plate.append(svgEl('circle',{cx:500,cy:500,r,fill:'none',stroke:r>480?'#b09363':'#96744a','stroke-width':r>480?1.5:1.4}));
 for(const [ri,ro,starts,step] of [[139,187,-135,45],[190,285,-135,90],[290,368,-135,90],[372,482,-135,45]]){
  for(let a=starts;a<starts+360;a+=step){const p=polar(ri/10,a),q=polar(ro/10,a);plate.append(svgEl('line',{x1:p[0]*10,y1:p[1]*10,x2:q[0]*10,y2:q[1]*10,stroke:'#927249','stroke-width':1.5}));}
 }
 for(let i=0;i<144;i++){const a=i*2.5,p=polar(48.5,a),q=polar(49.3,a+1.25),r=polar(48.5,a+2.5);plate.append(svgEl('path',{d:`M${p[0]*10} ${p[1]*10} Q${q[0]*10} ${q[1]*10} ${r[0]*10} ${r[1]*10}`,fill:'none',stroke:'#a58b62','stroke-width':1.3}));}
 orbit.prepend(plate);
 const ringControls=node('div','ring-controls');orbit.append(ringControls);
 const put=(el,r,a,extra='')=>{el.classList.add('ring-item');if(extra)el.classList.add(extra);position(el,r,a);ringControls.append(el);return el;};
 const at=(el,point)=>{el.style.left=point[0]+'%';el.style.top=point[1]+'%';return el;};
 const title=(text,r,a,rotation=0)=>{const el=put(node('h2','ring-title',text),r,a);el.style.setProperty('--title-rotation',rotation+'deg');return el;};
 const move=(name,r,a,label)=>{const el=control(name);el.classList.remove('orbit-tune');if(label)el.querySelector('label').textContent=label;el.querySelector('input,select').setAttribute('aria-label',label||el.querySelector('label').textContent);return put(el,r,a);};
 const switchify=(name,accessibleLabel)=>{
  const original=$('#'+name),box=control(name),options=[...original.options];
  const button=node('button','selector-switch');button.type='button';button.setAttribute('aria-label',accessibleLabel);button.setAttribute('role',options.length===2?'switch':'slider');
  const value=node('output','switch-value');original.hidden=true;original.tabIndex=-1;box.classList.add('selector-control');box.append(button,value);
  const sync=()=>{const index=Number(original.value);button.style.setProperty('--switch-index',index);button.style.setProperty('--switch-stops',options.length-1);value.textContent=options[index].textContent;button.title=accessibleLabel+': '+options[index].textContent;
   if(options.length===2)button.setAttribute('aria-checked',String(index===1));else{button.setAttribute('aria-valuemin','0');button.setAttribute('aria-valuemax',String(options.length-1));button.setAttribute('aria-valuenow',String(index));button.setAttribute('aria-valuetext',options[index].textContent);}
  };
  const choose=index=>{original.value=String(index);original.dispatchEvent(new Event('change',{bubbles:true}));sync();};
  button.onclick=()=>choose((Number(original.value)+1)%options.length);
  button.onkeydown=e=>{let index=Number(original.value);if(e.key==='ArrowLeft'||e.key==='ArrowDown')index=Math.max(0,index-1);else if(e.key==='ArrowRight'||e.key==='ArrowUp')index=Math.min(options.length-1,index+1);else if(e.key==='Home')index=0;else if(e.key==='End')index=options.length-1;else return;e.preventDefault();e.stopPropagation();choose(index);};
  original.addEventListener('change',sync);widgets.get(name).update=sync;sync();return box;
 };
 const voiceMenus=[];
 for(let i=1;i<=8;i++){
  const a=-112.5+(i-1)*45;
  const pad=$('#pad-'+i);pad.replaceChildren();pad.style.clipPath=sectorClip(annularSector(14,18.6,a-21.8,a+21.8));
  const number=node('span','wedge-number',String(i));position(number,16.3,a);pad.append(number);padRing.append(pad);
  const tune=at(move('tune-'+i,44,a-3,'Tune '+i),REFERENCE.voiceTune[i-1]);tune.classList.add('voice-tune');tuneRing.append(tune);
  const voiceLabel=at(node('label','voice-engraving','VOICE '+i),REFERENCE.voiceLabel[i-1]);voiceLabel.htmlFor='tune-'+i;tuneRing.append(voiceLabel);
  const menu=node('button','voice-menu','MENU');menu.type='button';menu.setAttribute('aria-label','Open voice '+i+' menu');menu.setAttribute('aria-haspopup','dialog');at(menu,REFERENCE.voiceMenu[i-1]);tuneRing.append(menu);voiceMenus.push([i,menu]);
 }
 title('DISTORTION',26,-90);['drv','dst-mix','vol'].forEach((name,i)=>at(move(name,23.1,-110+i*20),REFERENCE.distortion[i]));
 title('DELAY',26.4,90);['time-1','time-2','feedback','del-mix'].forEach((name,i)=>at(move(name,23.1,63+i*18),REFERENCE.delay[i]));
 for(const [group,ids,center] of [['A','1234',0],['B','5678',180]]){
  const x=group==='A'?73.2:26.8;
  at(title('GROUP '+group+' · '+(group==='A'?'1–4':'5–8'),26.7,center),[x,40.2]);
  at(move('pitch-'+ids,23.1,center-11,'Pitch'),[x,46.5]);at(move('hold-'+ids,23.1,center+11,'Hold'),[x,57]);
 }
 for(const [pair,center]of [['12',-90],['34',0],['56',90],['78',180]]){
  const fast=control('mod-'+pair).closest('.pair-controls').querySelector('.switch');
  const names=['sharp-'+pair,'mod-'+pair,'fast-'+pair,'source-'+pair];
  at(title('PAIR '+pair[0]+' + '+pair[1],35.3,center),REFERENCE.pairTitles[pair]);
  switchify('source-'+pair,'FM source pair '+pair[0]+' and '+pair[1]);
  for(let i=0;i<names.length;i++){
   let el;if(i===2){el=fast;if(!el)throw Error('Missing Fast '+pair);el.querySelector('input').setAttribute('aria-label','Fast pair '+pair[0]+' and '+pair[1]);}
   else el=control(names[i]);
   at(put(el,31.6,center-18+i*12,i===2?'ring-switch':'pair-control'),REFERENCE.pairs[pair][i]);
  }
 }
 // Docks match the reference. Extra settings share the Patch dialog rather than
 // adding an unpictured fifth control ring and shrinking the voice sectors.
 const lfo=node('section','reference-dock reference-lfo');lfo.setAttribute('aria-label','Hyper LFO');lfo.append(node('h2','','HYPER LFO'));const lfoControls=node('div','dock-controls');lfo.append(lfoControls);orbit.append(lfo);
 switchify('andor','Hyper LFO Combine');
 const link=widgets.get('link').input.closest('.switch');link.classList.add('ring-switch');
 lfoControls.append(control('f-a'),control('f-b'),link,control('andor'));
 const settings=node('dialog','settings-dialog');settings.setAttribute('aria-labelledby','settings-title');settings.innerHTML='<form method="dialog"><button class="settings-close" aria-label="Close patch settings">×</button></form><h2 id="settings-title">PATCH & MODULATION</h2>';
 settings.append($('.patch'));const extraSection=node('section','settings-section');extraSection.append(node('h3','','DELAY MODULATION'));const extraControls=node('div','knobs');for(const name of ['mod-1','mod-2','del-mod','lfo-wav'])extraControls.append(control(name));extraSection.append(extraControls);settings.append(extraSection);
 const network=node('section','settings-section');network.append(node('h3','','VOICE NETWORK'));const networkControls=node('div','network-controls');for(const name of ['switch','total-fb','vibrato','quantize']){const label=widgets.get(name).input.closest('.switch');label.classList.add('ring-switch','network-button');networkControls.append(label);}network.append(networkControls);settings.append(network);document.body.append(settings);
 settings.addEventListener('click',e=>{if(e.target===settings)settings.close();});
 const performance=node('section','reference-dock reference-performance');performance.setAttribute('aria-label','Performance controls');orbit.append(performance);
 const action=(button,label)=>{const slot=node('div','panel-action');button.classList.add('panel-button');slot.append(button,node('span','panel-action-label',label));performance.append(slot);};
 action($('#power'),'Audio on');const latch=$('#latch').closest('label');for(const child of latch.childNodes)if(child.nodeType===3)child.textContent='Latch';latch.classList.add('ring-switch');performance.append(latch);
 const patchButton=node('button','patch-panel-button','Patch');patchButton.id='patch-settings';patchButton.type='button';patchButton.setAttribute('aria-haspopup','dialog');patchButton.onclick=()=>settings.showModal();action(patchButton,'Patch');action($('#panic'),'Silence');
 $('.routing').remove();
 $('.effects').remove();$('#groups').remove();
 // Per-voice menu: edit the same underlying tuning input, no duplicate DSP state.
 const dialog=node('dialog','voice-dialog');dialog.innerHTML='<form method="dialog"><button class="close-menu" aria-label="Close voice menu">×</button></form><h2 id="voice-menu-title"></h2><p class="voice-context"></p><label for="voice-fine-tune">Fine tuning · 0–127</label><input id="voice-fine-tune" type="number" min="0" max="127" step="0.1"><p class="voice-menu-help">Shared controls in the rings affect the pair or four-voice group shown above.</p><button type="button" class="jump-tune">Focus tuning knob</button>';
 dialog.setAttribute('aria-labelledby','voice-menu-title');document.body.append(dialog);let selected=1;
 for(const [i,button]of voiceMenus)button.onclick=()=>{selected=i;const pair=Math.floor((i-1)/2)*2+1;dialog.querySelector('h2').textContent='VOICE '+i;dialog.querySelector('.voice-context').textContent=`Pair ${pair} + ${pair+1} · Group ${i<=4?'A · 1–4':'B · 5–8'} · Key ${i}`;dialog.querySelector('#voice-fine-tune').value=$('#tune-'+i).value;dialog.showModal();};
 dialog.querySelector('#voice-fine-tune').oninput=e=>{if(e.target.value===''||!e.target.checkValidity())return;const original=$('#tune-'+selected);original.value=e.target.value;original.dispatchEvent(new Event('input',{bubbles:true}));};
 dialog.querySelector('.jump-tune').onclick=()=>{dialog.close();$('#tune-'+selected).focus();};
 dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
 const viewport=node('div','orbit-viewport');orbit.before(viewport);viewport.append(orbit);
 viewport.before(node('p','orbit-scroll-hint','On smaller screens, scroll sideways to reach every ring.'));
 const legend=node('aside','reference-legend');legend.innerHTML='<h1>LIRA EIGHT</h1><p class="reference-subtitle">THE LIVING CIRCUIT</p><section><h2><b>04</b> PER-VOICE MENUS</h2><p>Eight menu sectors, one per voice.<br>TUNE control + MENU.</p></section><section><h2><b>03</b> VOICE PAIRS</h2><p>Pair controls for 1 + 2, 3 + 4, 5 + 6, 7 + 8.<br>SHARP, MOD, FAST, SOURCE.</p></section><section><h2><b>02</b> GLOBAL + GROUP</h2><p>DISTORTION and DELAY.<br>Group A (1–4) and Group B (5–8),<br>each with PITCH and HOLD.</p></section><section><h2><b>01</b> TOUCH PADS</h2><p>Eight flat touch pads (1–8)<br>around the oscilloscope.</p></section><p class="settings-hint">PATCH opens presets, Delay Modulation and Voice Network.</p>';
 legend.append($('.status'));$('.performance').after(legend);$('.toolbar').remove();
 document.body.classList.add('concentric-ready','reference-ready');
}
