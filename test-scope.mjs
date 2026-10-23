import assert from 'node:assert/strict';
import {radialPoint,createCircularScope} from './dist/circular-scope.js';
const radius=point=>Math.hypot(...point);
for(let i=0;i<1024;i++){
 assert(Math.abs(radius(radialPoint(i,1024,0))-.31)<1e-9,'Silence forms the base circle');
 const point=radialPoint(i,1024,Math.sin(i/1024*Math.PI*16));
 assert(radius(point)>=.14-1e-9&&radius(point)<=.48+1e-9,'Trace stays inside the disc');
}
assert(Math.abs(radius(radialPoint(0,1024,NaN))-.31)<1e-9);
assert(Math.abs(radius(radialPoint(0,1024,10))-.48)<1e-9);
let reads=0,clears=0;const coords=[];
const ctx={save(){},restore(){},translate(){},clearRect(){clears++;},createRadialGradient(){return {addColorStop(){}};},beginPath(){},arc(){},fill(){},setLineDash(){},moveTo(...v){coords.push(v);},lineTo(...v){coords.push(v);},stroke(){},closePath(){}};
const canvas={width:720,height:720,clientWidth:360,getContext:()=>ctx};
const draw=createCircularScope(canvas);
const analyser={getFloatTimeDomainData(samples){reads++;for(let i=0;i<samples.length;i++)samples[i]=Math.sin(i/128*Math.PI*2)*.5;}};
draw(analyser,true,100);assert.equal(reads,1);assert.equal(canvas.width,360);
draw(analyser,true,110);assert.equal(reads,1,'Rendering is capped at 30 FPS');
draw(analyser,false,200);assert.equal(reads,1,'Stopped audio draws a quiet ring');
canvas.clientWidth=150;draw(analyser,true,300);assert.equal(canvas.width,240,'Small screens keep a usable backing resolution');
assert.equal(clears,3);assert(coords.every(point=>point.every(Number.isFinite)));
console.log('PASS: silence circle, live samples, bounded geometry, resize, frame cap, stopped state.');
// 3D views: built from the same samples, bounded, and the radiating field obeys p(r,t) = (r0/r)·s(t − r/c).
const {spherePoints,radiateShells,project,createSphereScope}=await import('./dist/sphere-scope.js');
const quiet=new Float32Array(2048),tone=new Float32Array(2048);for(let i=0;i<2048;i++)tone[i]=.25*Math.sin(i*2*Math.PI*4/1024);
const still=spherePoints(quiet,0);assert.equal(still.length,1024);
for(const [x,y,z] of still)assert(Math.abs(Math.hypot(x,y,z)-.8)<1e-9,'Silence is a perfect sphere');
const moved=spherePoints(tone,0);assert(moved.some((p,i)=>Math.abs(Math.hypot(...p.slice(0,3))-Math.hypot(...still[i].slice(0,3)))>.05),'Samples push the sphere surface');
assert(moved.every((p,i)=>Math.sign(Math.hypot(...p.slice(0,3))-.8)===Math.sign(tone[i])||Math.abs(tone[i])<1e-6),'Surface follows each sample sign');
// Impulse that left the source a known time ago: only the shell at that delay should carry it.
const impulse=new Float32Array(2048);const shells=radiateShells(quiet).length,delay=Math.round(2*1023/(shells-1));impulse[2047-delay]=.5;
const field=radiateShells(impulse);field.forEach((s,j)=>assert.equal(Math.abs(s.p)>0,j===2,'Wave reaches shell '+j+' only at its delay'));
const steady=new Float32Array(2048).fill(.3),spread=radiateShells(steady);
for(let j=1;j<spread.length;j++){const r0=.2,r=r0+(1-r0)*j/(spread.length-1);assert(Math.abs(spread[j].p-spread[0].p*r0/r)<1e-9,'Pressure falls as 1/r');}
for(const [x,y] of project(moved,1.3))assert(Math.abs(x)<1&&Math.abs(y)<1,'Projection stays inside the scope');
const canvas3={clientWidth:300,width:0,height:0,getContext:()=>new Proxy({},{get:(t,k)=>k in t?t[k]:()=>({})})};
const draw3=createSphereScope(canvas3);let reads3=0;const analyser3={getFloatTimeDomainData:d=>{reads3++;d.set(tone);}};
draw3(analyser3,true,100,'sphere');draw3(analyser3,true,110,'radiate');draw3(analyser3,true,200,'radiate');assert.equal(reads3,2,'3D views share the 30 FPS cap and read live samples');
console.log('PASS: 3D views use real samples; silence is a true sphere; radiated wave arrives at its delay and falls as 1/r.');
// Pitch-fitted window: the period of known tones is found within 1%, and the window spans three whole cycles.
const {findPeriod,createPitchWindow,CYCLES,FALLBACK}=await import('./dist/pitch-window.js');
const rate=48000,tones=[31,55,110,220,440,1000];
for(const hz of tones){const s=new Float32Array(8192);for(let i=0;i<s.length;i++)s[i]=.3*Math.sin(i*2*Math.PI*hz/rate)+.12*Math.sin(i*2*Math.PI*hz*2/rate+.4);
 const found=findPeriod(s,rate);assert(Math.abs(found/(rate/hz)-1)<.01,`${hz} Hz period found: ${found} vs ${rate/hz}`);
 const fit=createPitchWindow();let w;for(let k=0;k<3;k++)w=fit(s,rate);
 assert(Math.abs(w.length/(CYCLES*rate/hz)-1)<.02,`${hz} Hz window spans ${CYCLES} cycles`);
 assert(s[w.start-1]<=0&&s[w.start]>0,`${hz} Hz window starts on a rising zero crossing`);
 assert(w.start+w.length<=s.length,'Window fits the buffer');}
const noise=new Float32Array(8192);let seed=1;for(let i=0;i<noise.length;i++){seed=(seed*16807)%2147483647;noise[i]=seed/2147483647-.5;}
assert.equal(findPeriod(noise,rate),0,'Noise has no pitch');assert.equal(createPitchWindow()(noise,rate).length,FALLBACK,'No pitch falls back to the fixed window');
assert.equal(findPeriod(new Float32Array(8192),rate),0,'Silence has no pitch');
console.log('PASS: pitch found within 1% from 31 Hz to 1 kHz; window spans three cycles from a rising zero crossing; noise and silence fall back.');
