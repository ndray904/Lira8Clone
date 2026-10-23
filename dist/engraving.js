import {polar,annularSector} from './ring-geometry.js';
import {R,padAngle} from './disc.js';
// The plate's engraving (sunburst, rims, pad outlines) painted once per size onto a canvas.
// Lines are drawn as jittered strokes with random breaks and speckled wear, which gives the worn
// scratchboard look without SVG filters (Firefox and Safari re-run those on every repaint).
function random(seed){return ()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};}

// Stroke a polyline given in disc percent, broken and roughened like worn ink.
function wornStroke(ctx,points,scale,{width,colour,breaks=.06,jitter=.07},rnd){
 ctx.strokeStyle=colour;ctx.lineCap='round';
 let drawing=false;ctx.beginPath();
 for(let i=0;i<points.length;i++){
  // Runs of ink end now and then, leaving gaps of a step or two.
  if(rnd()<breaks){drawing=false;continue;}
  const [x,y]=points[i],j=(rnd()-.5)*jitter;
  const px=(x+j)*scale,py=(y+(rnd()-.5)*jitter)*scale;
  if(drawing)ctx.lineTo(px,py);else{ctx.moveTo(px,py);drawing=true;}
 }
 ctx.lineWidth=width*scale*(.85+rnd()*.3);ctx.stroke();
}
// Densify a polyline so the jitter and breaks act along its whole length.
function densify(points,step=.35){
 const out=[];for(let i=1;i<points.length;i++){const [x0,y0]=points[i-1],[x1,y1]=points[i],n=Math.max(1,Math.ceil(Math.hypot(x1-x0,y1-y0)/step));for(let k=0;k<n;k++)out.push([x0+(x1-x0)*k/n,y0+(y1-y0)*k/n]);}
 out.push(points.at(-1));return out;
}
const circle=r=>{const n=Math.ceil(r*8);return Array.from({length:n+1},(_,k)=>polar(r,k/n*360));};

export function paintEngraving(canvas){
 const ctx=canvas.getContext?.('2d');if(!ctx)return false;
 const size=Math.min(2000,Math.round(canvas.clientWidth*(globalThis.devicePixelRatio||1)));
 if(!size)return false;
 canvas.width=canvas.height=size;const scale=size/100,rnd=random(20251023);
 ctx.clearRect(0,0,size,size);
 // Scratched sunburst: uneven hand-cut strokes behind the sliders.
 for(let k=0;k<240;k++){const r0=R.padOut+.8+rnd()*2.5,r1=R.out-1.5-rnd()*6+(k%4?0:2),a=k*1.5+(rnd()-.5)*.6;
  wornStroke(ctx,densify([polar(r0,a),polar(r1,a)],.6),scale,{width:.08,colour:`rgba(233,227,214,${(.05+rnd()*.16).toFixed(2)})`,breaks:.12,jitter:.05},rnd);}
 for(const r of [R.padOut+.4,R.padIn-.4,R.panel-.3])wornStroke(ctx,densify(circle(r)),scale,{width:.2,colour:'#ada495',breaks:.04},rnd);
 for(let i=1;i<=8;i++){const pts=annularSector(R.padIn+.15,R.padOut-.15,padAngle(i)-12,padAngle(i)+12);wornStroke(ctx,densify([...pts,pts[0]],.3),scale,{width:.22,colour:'#e9e3d6',breaks:.07,jitter:.09},rnd);}
 // Speckled wear: tiny flecks knocked out of the ink.
 ctx.globalCompositeOperation='destination-out';ctx.fillStyle='#000';
 for(let k=0;k<size*size/220;k++){const d=Math.max(1,scale*(.05+rnd()*.12));ctx.fillRect(rnd()*size,rnd()*size,d,d);}
 ctx.globalCompositeOperation='source-over';
 return true;
}
