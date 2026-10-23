import {createPitchWindow,sampleAt} from './pitch-window.js';
export function radialPoint(index,count,sample,base=.31,depth=.17){
 const angle=index/count*Math.PI*2-Math.PI/2;
 const radius=base+Math.max(-1,Math.min(1,Number.isFinite(sample)?sample:0))*depth;
 return [Math.cos(angle)*radius,Math.sin(angle)*radius];
}

// Plot actual time-domain samples in polar coordinates. The window is sized to three cycles of
// the detected pitch and starts on a rising zero crossing, so the shape holds still, and it is
// scaled to its own peak (floored for near-silence) like a scope's auto-gain; there is no
// artificial signal. The trace is drawn flat, without canvas blur, to stay cheap on phones.
export function createCircularScope(canvas){
 const ctx=canvas.getContext('2d'),fit=createPitchWindow();
 let samples=new Float32Array(2048),lastFrame=0;
 function draw(analyser,running,time){
  if(time-lastFrame<1000/30)return;
  lastFrame=time;
  const size=Math.max(240,Math.min(720,Math.round(canvas.clientWidth*(globalThis.devicePixelRatio||1))));
  if(canvas.width!==size){canvas.width=size;canvas.height=size;}
  if(analyser&&samples.length!==analyser.fftSize)samples=new Float32Array(analyser.fftSize||2048);
  if(running&&analyser)analyser.getFloatTimeDomainData(samples);else samples.fill(0);
  ctx.clearRect(0,0,size,size);ctx.save();ctx.translate(size/2,size/2);
  ctx.fillStyle='#0d0605';ctx.beginPath();ctx.arc(0,0,size*.5,0,Math.PI*2);ctx.fill();
  ctx.lineWidth=Math.max(1,size/650);
  for(const r of [.18,.31,.455]){ctx.strokeStyle=r===.31?'#5a2520':'#34201c';ctx.setLineDash(r===.455?[1,size*.023]:[1,size*.012]);ctx.beginPath();ctx.arc(0,0,size*r,0,Math.PI*2);ctx.stroke();}
  ctx.setLineDash([]);
  for(const major of [false,true]){ctx.beginPath();for(let i=0;i<64;i++){if((i%8===0)!==major)continue;const a=i/64*Math.PI*2,r=major?.484:.477;ctx.moveTo(Math.cos(a)*size*.469,Math.sin(a)*size*.469);ctx.lineTo(Math.cos(a)*size*r,Math.sin(a)*size*r);}ctx.strokeStyle=major?'#b15b47':'#512e25';ctx.stroke();}
  const {start,length}=fit(samples,analyser?.context?.sampleRate),count=1024,step=length/count;
  let peak=0;for(let i=Math.floor(start);i<start+length;i++)peak=Math.max(peak,Math.abs(samples[i]||0));
  const gain=.9/Math.max(peak,.06);
  ctx.beginPath();
  for(let i=0;i<count;i++){// Blend a short seam so the closed trace cannot acquire a spurious spike.
   const blend=Math.max(0,(i-(count-33))/32);
   const sample=(sampleAt(samples,start+i*step)*(1-blend)+samples[start]*blend)*gain;
   const [x,y]=radialPoint(i,count,sample);
   if(i)ctx.lineTo(x*size,y*size);else ctx.moveTo(x*size,y*size);
  }
  ctx.closePath();
  ctx.strokeStyle=running?'#ff655455':'#73372e55';ctx.lineWidth=Math.max(2,size*.009);ctx.stroke();
  ctx.strokeStyle=running?'#ff7a66':'#8d5142';ctx.lineWidth=Math.max(1,size*.0028);ctx.stroke();ctx.restore();
 }
 return draw;
}
