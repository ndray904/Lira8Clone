import {polar,annularSector,sectorClip} from './ring-geometry.js';
// Ring radii in percent of the disc width (50 = outer edge).
export const R={scope:15,padIn:16,padOut:22.6,pairIn:23.4,pairItems:28.6,pairTitle:34.1,pairOut:35.4,tune:40.4,voiceTitle:46.5,voiceOut:48.4};
export const voiceAngle=i=>-112.5+(i-1)*45;
export const PAIRS=[['12',-90],['34',0],['56',90],['78',180]];
// The bottom quadrant runs counter-clockwise so its text and controls read left to right.
export const flipped=a=>a>45&&a<135;
export const padClip=i=>sectorClip(annularSector(R.padIn,R.padOut,voiceAngle(i)-21.4,voiceAngle(i)+21.4));
export function place(el,r,a){const [x,y]=polar(r,a);el.style.left=x+'%';el.style.top=y+'%';return el;}
const ns='http://www.w3.org/2000/svg';
function svg(name,attrs,parent){const el=document.createElementNS(ns,name);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);parent?.append(el);return el;}
function arc(r,a0,a1){const [x0,y0]=polar(r,a0),[x1,y1]=polar(r,a1);return `M${x0} ${y0}A${r} ${r} 0 0 ${a1>a0?1:0} ${x1} ${y1}`;}
let uid=0;
function curvedText(plate,defs,text,r,center,span,cls){
 const id='arc-'+uid++;svg('path',{id,d:flipped(center)?arc(r,center+span,center-span):arc(r,center-span,center+span)},defs);
 const t=svg('text',{class:cls,'text-anchor':'middle','dominant-baseline':'central'},plate);svg('textPath',{href:'#'+id,startOffset:'50%'},t).textContent=text;
}
export function buildPlate(){
 const plate=svg('svg',{viewBox:'0 0 100 100',class:'plate','aria-hidden':'true'}),defs=svg('defs',{},plate);
 const spoke=(r0,r1,a,cls='ring')=>{const [x1,y1]=polar(r0,a),[x2,y2]=polar(r1,a);svg('line',{x1,y1,x2,y2,class:cls},plate);};
 for(const [r,cls] of [[R.scope+.7,'rim'],[R.pairIn,'ring'],[R.pairOut,'ring'],[R.voiceOut,'rim'],[49.7,'ring']])svg('circle',{cx:50,cy:50,r,class:cls},plate);
 for(let k=0;k<4;k++)spoke(R.pairIn,R.pairOut,-135+k*90);
 for(let k=0;k<8;k++)spoke(R.pairOut,R.voiceOut,-135+k*45);
 for(let k=0;k<120;k++)spoke(48.75,k%5?49.1:49.45,k*3,'tick');
 for(const [pair,center] of PAIRS)curvedText(plate,defs,`PAIR ${pair[0]} · ${pair[1]}`,R.pairTitle,center,40,'pair-title');
 for(let i=1;i<=8;i++)curvedText(plate,defs,'VOICE '+i,R.voiceTitle,voiceAngle(i),20,'voice-title');
 return plate;
}
