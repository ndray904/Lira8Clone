export function radialPoint(index,count,sample,base=.31,depth=.17){
 const angle=index/count*Math.PI*2-Math.PI/2;
 const radius=base+Math.max(-1,Math.min(1,Number.isFinite(sample)?sample:0))*depth;
 return [Math.cos(angle)*radius,Math.sin(angle)*radius];
}

// Plot actual time-domain samples in polar coordinates. A positive-going zero
// crossing anchors the window to reduce rotation; there is no artificial signal.
export function createCircularScope(canvas){
 const ctx=canvas.getContext('2d');
 const samples=new Float32Array(2048);
 let lastFrame=0;
 function draw(analyser,running,time){
  if(time-lastFrame<1000/30)return;
  lastFrame=time;
  if(running&&analyser)analyser.getFloatTimeDomainData(samples);else samples.fill(0);
  const size=Math.max(240,Math.min(1000,Math.round(canvas.clientWidth*(globalThis.devicePixelRatio||1))));
  if(canvas.width!==size){canvas.width=size;canvas.height=size;}
  ctx.clearRect(0,0,size,size);ctx.save();ctx.translate(size/2,size/2);
  const disc=ctx.createRadialGradient(0,0,0,0,0,size/2);disc.addColorStop(0,'#100807');disc.addColorStop(.7,'#180908');disc.addColorStop(1,'#080707');
  ctx.fillStyle=disc;ctx.beginPath();ctx.arc(0,0,size*.5,0,Math.PI*2);ctx.fill();
  ctx.lineWidth=Math.max(1,size/650);
  for(const r of [.18,.31,.455]){ctx.strokeStyle=r===.31?'#5a2520':'#34201c';ctx.setLineDash(r===.455?[1,size*.023]:[1,size*.012]);ctx.beginPath();ctx.arc(0,0,size*r,0,Math.PI*2);ctx.stroke();}
  ctx.setLineDash([]);
  for(let i=0;i<64;i++){const a=i/64*Math.PI*2,major=i%8===0;ctx.strokeStyle=major?'#b15b47':'#512e25';ctx.beginPath();ctx.moveTo(Math.cos(a)*size*.469,Math.sin(a)*size*.469);ctx.lineTo(Math.cos(a)*size*(major?.484:.477),Math.sin(a)*size*(major?.484:.477));ctx.stroke();}
  let start=0;
  for(let i=1;i<512;i++)if(samples[i-1]<=0&&samples[i]>0){start=i;break;}
  const count=1024;
  ctx.beginPath();
  for(let i=0;i<count;i++){// Blend a short seam so the closed trace cannot acquire a spurious spike.
   const blend=Math.max(0,(i-(count-33))/32);
   const sample=samples[start+i]*(1-blend)+samples[start]*blend;
   const [x,y]=radialPoint(i,count,sample);
   if(i)ctx.lineTo(x*size,y*size);else ctx.moveTo(x*size,y*size);
  }
  ctx.closePath();ctx.strokeStyle=running?'#ff6554':'#73372e';ctx.shadowColor='#ff3020';ctx.shadowBlur=running?size*.025:0;ctx.lineWidth=Math.max(1,size*.0025);ctx.stroke();
  ctx.shadowBlur=0;ctx.strokeStyle=running?'#ffb49b':'#8d5142';ctx.lineWidth=Math.max(.5,size*.0008);ctx.stroke();ctx.restore();
 }
 return draw;
}
