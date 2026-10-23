// Small screens: the disc keeps its full design size and is scaled into a square frame that fits the
// screen. Pinching or dragging on empty parts of the plate zooms and pans the instrument itself, so the
// page never has to zoom; a double tap returns to the fitted view (or zooms in where you tapped).
// Pads, sliders and switches keep their own touches.
const CONTROLS='.pad,.slider,.toggle,.selector,.fine,button,input,label,select';
const MARGIN=.035; // the serpent and its head reach a little past the disc's box

export function createDiscZoom(frame,disc,{maxZoom=3.2}={}){
 let on=false,fit=1,s=1,tx=0,ty=0,gesture=null,lastTap={t:0,x:0,y:0};
 const pointers=new Map();
 const side=()=>frame.clientWidth,size=()=>disc.offsetWidth;
 function clampView(){
  const F=side(),w=size()*s,m=w*MARGIN;
  if(w+2*m<=F){tx=(F-w)/2;ty=(F-w)/2;return;}
  tx=Math.min(m,Math.max(F-w-m,tx));ty=Math.min(m,Math.max(F-w-m,ty));
 }
 function apply(){clampView();disc.style.transform=`translate(${tx}px,${ty}px) scale(${s})`;frame.classList.toggle('zoomed',s>fit*1.02);}
 // Zoom to `next`, keeping the plate point under (x, y) in the frame where it is.
 function zoomAt(next,x,y){next=Math.min(fit*maxZoom,Math.max(fit,next));const cx=(x-tx)/s,cy=(y-ty)/s;s=next;tx=x-cx*s;ty=y-cy*s;apply();}
 function refit(){if(!on||!side()||!size())return;fit=side()/(size()*(1+2*MARGIN));s=fit;apply();}
 const local=e=>{const r=frame.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};};
 function begin(){
  const p=[...pointers.values()];
  gesture=p.length>=2?{dist:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)||1,mid:{x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2},s,tx,ty}:p.length?{x:p[0].x,y:p[0].y,tx,ty}:null;
 }
 frame.addEventListener('pointerdown',e=>{
  if(!on||e.target.closest(CONTROLS))return;
  e.preventDefault();frame.setPointerCapture(e.pointerId);pointers.set(e.pointerId,local(e));begin();
 });
 frame.addEventListener('pointermove',e=>{
  if(!pointers.has(e.pointerId)||!gesture)return;
  pointers.set(e.pointerId,local(e));const p=[...pointers.values()];
  if(p.length>=2){
   const dist=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y),mid={x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2};
   const next=Math.min(fit*maxZoom,Math.max(fit,gesture.s*dist/gesture.dist)),cx=(gesture.mid.x-gesture.tx)/gesture.s,cy=(gesture.mid.y-gesture.ty)/gesture.s;
   s=next;tx=mid.x-cx*s;ty=mid.y-cy*s;
  }else{tx=gesture.tx+p[0].x-gesture.x;ty=gesture.ty+p[0].y-gesture.y;}
  apply();
 });
 const end=e=>{
  if(!pointers.has(e.pointerId))return;
  const p=pointers.get(e.pointerId),moved=gesture&&pointers.size===1&&Math.hypot(p.x-gesture.x,p.y-gesture.y)>8;
  pointers.delete(e.pointerId);begin();
  if(e.type!=='pointerup'||moved||pointers.size)return;
  // Double tap: back to the fitted view, or zoom in on the spot when already fitted.
  const now=performance.now();
  if(now-lastTap.t<320&&Math.hypot(p.x-lastTap.x,p.y-lastTap.y)<30){if(s>fit*1.02){s=fit;apply();}else zoomAt(fit*2.2,p.x,p.y);lastTap.t=0;}
  else lastTap={t:now,x:p.x,y:p.y};
 };
 frame.addEventListener('pointerup',end);frame.addEventListener('pointercancel',end);
 // Trackpad pinches arrive as ctrl+wheel.
 frame.addEventListener('wheel',e=>{if(!on||!e.ctrlKey)return;e.preventDefault();const {x,y}=local(e);zoomAt(s*Math.exp(-e.deltaY*.01),x,y);},{passive:false});
 return {
  set(enabled){on=enabled;pointers.clear();gesture=null;if(on)refit();else{disc.style.transform='';frame.classList.remove('zoomed');}},
  refit,
  get active(){return on;},
  get zoom(){return on?s/fit:1;}
 };
}
