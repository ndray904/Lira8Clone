import {polar,annularSector,sectorClip} from './ring-geometry.js';
// Radii in percent of the disc width (50 = outer edge). The serpent rides 40.1–46.6; its head dips to 37.5 between -98° and -77°.
export const R={scope:13.8,padIn:14.6,padOut:20.6,inner:21.4,longIn:22.4,shortIn:25.8,out:37.6,title:38.9,panel:40.6};
// Rays run clockwise; each group reads as one engraved section. `under` sits in the inner band below a slider.
// `flip` turns a group's labels so text on the left and bottom halves reads upright.
const SEQUENCE=[
 {title:'Delay mod',rays:[{slider:'mod-1',label:'Mod 1',aria:'Delay mod 1',under:{step:'del-mod',label:'Source',options:['Self','Off','LFO'],aria:'Delay modulation source'}},{slider:'mod-2',label:'Mod 2',aria:'Delay mod 2',under:{step:'lfo-wav',label:'Shape',options:['Tri','Sqr'],aria:'Delay LFO shape'}}]},
 {title:'Delay',head:true,rays:[{slider:'time-1',label:'Time 1'},{slider:'time-2',label:'Time 2'},{slider:'feedback',label:'Feedback'},{slider:'del-mix',label:'Mix',aria:'Delay mix'}]},
 {title:'Output',rays:[{slider:'vol',label:'Volume'},{slider:'dst-mix',label:'Mix',aria:'Distortion mix'},{slider:'drv',label:'Drive',aria:'Distortion drive'}],end:'top'},
 ...voices(1,'A'),
 {title:'Network',flip:true,rays:[{toggle:'quantize',label:'Quantize'},{toggle:'vibrato',label:'Vibrato'},{toggle:'total-fb',label:'Total FB'},{toggle:'switch',label:'FM route'}]},
 {title:'Hyper LFO',flip:true,rays:[{slider:'f-b',label:'Rate B',aria:'LFO rate B',under:{step:'andor',label:'And·Or',options:['AND','OR'],aria:'LFO combine'}},{slider:'f-a',label:'Rate A',aria:'LFO rate A',under:{toggle:'link',label:'Link',aria:'Link LFO rates'}}],end:'bottom'},
 ...voices(5,'B',true)
];
function voices(first,group,flip=false){
 const pair=(a)=>{const id=`${a}${a+1}`,of=` pair ${a}+${a+1}`;return {title:`Voices ${a} · ${a+1}`,flip,rays:[
  {slider:'tune-'+a,label:'Tune '+a,long:true,voice:a},
  {slider:'mod-'+id,label:'Mod',aria:'Mod'+of,under:{step:'source-'+id,label:'Source',options:['Voices','Off','LFO·FB'],aria:'FM source'+of}},
  {slider:'sharp-'+id,label:'Sharp',aria:'Sharp'+of,under:{toggle:'fast-'+id,label:'Fast',aria:'Fast'+of}},
  {slider:'tune-'+(a+1),label:'Tune '+(a+1),long:true,voice:a+1}]};};
 const ids=`${first}${first+1}${first+2}${first+3}`,span=`${first}–${first+3}`;
 return [pair(first),{title:`Group ${group} · ${span}`,flip,rays:[{slider:'pitch-'+ids,label:'Pitch',aria:`Group ${group} pitch`},{slider:'hold-'+ids,label:'Hold',aria:`Group ${group} hold`}]},{...pair(first+2),end:flip?'top':'bottom'}];
}
const STEP=8.3,TOGGLE=7,GAP=5,HEAD={center:-88,width:20};
// Lay rays out clockwise, leaving the serpent's head a clear gap after Delay and spreading spare angle between the four regions.
export const LAYOUT=(()=>{
 const width=g=>g.rays.length*(g.rays[0].toggle?TOGGLE:STEP);
 let used=HEAD.width-GAP,regions=0;for(const g of SEQUENCE){used+=width(g);if(g.end)regions++;}
 used+=GAP*(SEQUENCE.length-regions);const sep=(360-used)/regions;
 const before=SEQUENCE.slice(0,SEQUENCE.findIndex(g=>g.head)+1).reduce((s,g)=>s+width(g)+GAP,-GAP);
 let a=HEAD.center-HEAD.width/2-before;const groups=[],rays=[];
 SEQUENCE.forEach((g,k)=>{const w=g.rays[0].toggle?TOGGLE:STEP,start=a,mid=a+width(g)/2,flip=!!g.flip||Math.cos(mid*Math.PI/180)<-.4;
  for(const ray of g.rays){rays.push({...ray,angle:a+w/2,flip,group:g.title});a+=w;}
  groups.push({title:g.title,center:(start+a)/2,span:a-start,flip:!!g.flip});
  a+=g.head?HEAD.width:g.end?sep:GAP;});
 return {rays,groups};
})();
// Each pad sits directly beneath its voice's tune slider.
export const padAngle=i=>LAYOUT.rays.find(r=>r.voice===i).angle;
export const padClip=i=>sectorClip(annularSector(R.padIn,R.padOut,padAngle(i)-12,padAngle(i)+12));
// Place an element's anchor at radius r, angle a; rotate it along the ray if asked.
export function place(el,r,a,rotate=null){const [x,y]=polar(r,a);el.style.left=x+'%';el.style.top=y+'%';if(rotate!==null)el.style.setProperty('--rot',rotate+'deg');return el;}
const ns='http://www.w3.org/2000/svg';
function svg(name,attrs,parent){const el=document.createElementNS(ns,name);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);parent?.append(el);return el;}
function arc(r,a0,a1){const [x0,y0]=polar(r,a0),[x1,y1]=polar(r,a1);return `M${x0} ${y0}A${r} ${r} 0 ${Math.abs(a1-a0)>180?1:0} ${a1>a0?1:0} ${x1} ${y1}`;}
let uid=0;
function curvedText(plate,defs,text,r,center,span,flip,cls){
 const id='arc-'+uid++;svg('path',{id,d:flip?arc(r,center+span,center-span):arc(r,center-span,center+span)},defs);
 const t=svg('text',{class:cls,'text-anchor':'middle','dominant-baseline':'central'},plate);svg('textPath',{href:'#'+id,startOffset:'50%'},t).textContent=text;
}
// Engraved plate: a faint sunburst behind the sliders, the pad ring, groove for each ray and group titles.
export function buildPlate(){
 const plate=svg('svg',{viewBox:'0 0 100 100',class:'plate','aria-hidden':'true'}),defs=svg('defs',{},plate);
 const line=(r0,r1,a,cls)=>{const [x1,y1]=polar(r0,a),[x2,y2]=polar(r1,a);svg('line',{x1,y1,x2,y2,class:cls},plate);};
 for(let k=0;k<240;k++)line(R.padOut+.8,k%4?R.out-1.5:R.out+.4,k*1.5,'ray');
 for(const [r,cls] of [[R.padOut+.4,'rim'],[R.padIn-.4,'rim'],[R.panel-.3,'rim']])svg('circle',{cx:50,cy:50,r,class:cls},plate);
 for(const ray of LAYOUT.rays)if(ray.slider)line(ray.long?R.longIn:R.shortIn,R.out,ray.angle,'groove');
 for(const g of LAYOUT.groups)curvedText(plate,defs,g.title.toUpperCase(),R.title,g.center,Math.max(g.span/2+3,9),g.flip||Math.sin(g.center*Math.PI/180)>.6,'group-title');
 return plate;
}
