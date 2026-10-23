import {createPitchWindow,sampleAt} from './pitch-window.js';
// Three-dimensional views of the same output samples the ring scope reads; nothing is synthesised.
// Both views auto-scale to the window's peak, as a scope's auto-gain does; relative shape and the
// 1/r falloff between shells are unchanged.
// 'sphere'  winds three cycles of the detected pitch (or 1024 samples) pole to pole around a sphere,
//           each sample pushing its radius.
// 'radiate' treats the output as a point source. The outgoing solution of the scalar spherical wave
//           equation, ∇²p = (1/c²)∂²p/∂t², is p(r,t) = (r₀/r)·s(t − (r − r₀)/c): each shell shows the
//           signal as it left the centre a little earlier, weakened in proportion to distance.
const WINDOW=1024,TURNS=14,SHELLS=6,R0=.2,TAU=Math.PI*2;
// Peak of the window, floored so near-silence is not blown up into noise.
const gain=samples=>{let m=0;for(let i=samples.length-WINDOW;i<samples.length;i++)m=Math.max(m,Math.abs(samples[i]));return 1/Math.max(m,.05);};
const clamp=v=>Math.max(-1,Math.min(1,Number.isFinite(v)?v:0));

// Unit-space points [x,y,z,brightness]. `samples` holds the analyser frame; the newest sample is last.
export function spherePoints(samples,start,length=WINDOW){
 const pts=[],g=gain(samples),step=length/WINDOW;
 for(let i=0;i<WINDOW;i++){const y=1-2*(i+.5)/WINDOW,rho=Math.sqrt(1-y*y),a=i*TURNS*TAU/WINDOW,r=.8*(1+.32*clamp(sampleAt(samples,start+i*step)*g));pts.push([r*rho*Math.cos(a),r*y,r*rho*Math.sin(a),1]);}
 return pts;
}
// Shells drawn as wireframes (three latitudes, two meridians), each a list of polylines.
const SEG=48,RINGS=[...[-.55,0,.55].map(lat=>Array.from({length:SEG+1},(_,k)=>{const a=k/SEG*TAU;return [Math.cos(lat)*Math.cos(a),Math.sin(lat),Math.cos(lat)*Math.sin(a)];})),
 ...[0,1].map(m=>Array.from({length:SEG+1},(_,k)=>{const t=k/SEG*TAU,a=m*Math.PI/2;return [Math.cos(t)*Math.cos(a),Math.sin(t),Math.cos(t)*Math.sin(a)];}))];
export function radiateShells(samples){
 const shells=[],newest=samples.length-1,g=gain(samples);
 for(let j=0;j<SHELLS;j++){
  const r=R0+(1-R0)*j/(SHELLS-1),delay=Math.round(j*(WINDOW-1)/(SHELLS-1)),p=clamp(samples[newest-delay]*g)*R0/r;
  // Each shell is displaced and lit in proportion to the local pressure, so the source breathes the most.
  const radius=.86*(r+.12*p);
  shells.push({p,radius,lines:RINGS.map(ring=>ring.map(([x,y,z])=>[x*radius,y*radius,z*radius,0]))});
 }
 return shells;
}
// Rotate (yaw about the vertical axis, then a fixed tilt) and project with gentle perspective.
export function project(pts,yaw,tilt=.42,distance=3.4){
 const cy=Math.cos(yaw),sy=Math.sin(yaw),ct=Math.cos(tilt),st=Math.sin(tilt);
 return pts.map(([x,y,z,b])=>{const x1=x*cy+z*sy,z1=-x*sy+z*cy,y1=y*ct-z1*st,z2=y*st+z1*ct,k=distance/(distance-z2);return [x1*k*.88,y1*k*.88,z2,b];});
}

// Segments are grouped into a few depth bands and each band is stroked once, which keeps a frame to a
// handful of draw calls instead of one per segment.
const BANDS=6;
function strokeBands(ctx,segments,colour){
 const paths=Array.from({length:BANDS},()=>[]);
 for(const seg of segments)paths[Math.min(BANDS-1,Math.floor(seg[4]*BANDS))].push(seg);
 paths.forEach((band,k)=>{if(!band.length)return;ctx.beginPath();for(const [x0,y0,x1,y1] of band){ctx.moveTo(x0,y0);ctx.lineTo(x1,y1);}ctx.strokeStyle=colour((k+.5)/BANDS);ctx.stroke();});
}
export function createSphereScope(canvas){
 const ctx=canvas.getContext('2d'),fit=createPitchWindow();
 let samples=new Float32Array(2048),lastFrame=0;
 return function draw(analyser,running,time,mode){
  if(time-lastFrame<1000/30)return;
  lastFrame=time;
  if(analyser&&samples.length!==analyser.fftSize)samples=new Float32Array(analyser.fftSize||2048);
  if(running&&analyser)analyser.getFloatTimeDomainData(samples);else samples.fill(0);
  const size=Math.max(240,Math.min(720,Math.round(canvas.clientWidth*(globalThis.devicePixelRatio||1))));
  if(canvas.width!==size){canvas.width=size;canvas.height=size;}
  ctx.clearRect(0,0,size,size);ctx.save();ctx.translate(size/2,size/2);
  ctx.fillStyle='#0d0605';ctx.beginPath();ctx.arc(0,0,size*.5,0,TAU);ctx.fill();
  const half=size*.47,lit=running?1:.45,depth=d=>.25+.75*d,yaw=time*.00025;
  // Segment endpoints in pixels plus a 0–1 depth (1 = nearest the viewer).
  const segments=q=>{const out=[];for(let i=1;i<q.length;i++)out.push([q[i-1][0]*half,q[i-1][1]*half,q[i][0]*half,q[i][1]*half,Math.max(0,Math.min(.999,((q[i-1][2]+q[i][2])/2+1)/2))]);return out;};
  ctx.globalCompositeOperation='lighter';
  if(mode==='radiate'){
   ctx.lineWidth=Math.max(1,size/600);
   for(const {p,lines} of radiateShells(samples)){const glow=Math.min(1,.28+1.6*Math.abs(p));
    strokeBands(ctx,lines.flatMap(line=>segments(project(line,yaw))),d=>`rgba(255,${80+80*glow|0},60,${(.6*glow*depth(d)*lit).toFixed(3)})`);}
  }else{
   const {start,length}=fit(samples,analyser?.context?.sampleRate);
   ctx.lineWidth=Math.max(1,size/500);
   strokeBands(ctx,segments(project(spherePoints(samples,start,length),yaw)),d=>`rgba(255,95,72,${(.85*depth(d)*lit).toFixed(3)})`);
  }
  ctx.restore();
 };
}
