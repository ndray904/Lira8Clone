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
