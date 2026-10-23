// Procedural ouroboros. Every pixel of the ring is shaded as a scaled cylinder lit
// from the upper left; the head, seen in profile, opens its jaws around the tail.
// Angles run clockwise from east, matching canvas coordinates.
const TAU=Math.PI*2;
const clamp=(v,a=0,b=1)=>v<a?a:v>b?b:v;
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
const wrap=a=>((a%TAU)+TAU)%TAU;
function hash(x,y){let h=(x|0)*374761393+(y|0)*668265263;h=(h^(h>>>13))*1274126177;return ((h^(h>>>16))>>>0)/4294967296;}
function noise(x,y){const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,ux=fx*fx*(3-2*fx),uy=fy*fy*(3-2*fy);
 const a=hash(ix,iy),b=hash(ix+1,iy),c=hash(ix,iy+1),d=hash(ix+1,iy+1);return a+(b-a)*ux+(c-a)*uy+(a-b-c+d)*ux*uy;}
const fbm=(x,y)=>noise(x,y)*.6+noise(x*2.1+5.2,y*2.1+1.3)*.28+noise(x*4.3+9.1,y*4.3+3.7)*.12;
const unit=v=>{const n=Math.hypot(...v);return v.map(c=>c/n);};
const LIGHT=unit([-.45,-.55,.7]),HALF=unit([LIGHT[0],LIGHT[1],LIGHT[2]+1]);
const BASE=[88,84,78],SADDLE=[34,32,30],NET=[200,194,184];

// Head profile in body widths: X runs forward from the neck, Y outward from the ring's centreline.
const SNOUT=3,HINGE=1.25,JAW=2.6;
const lipU=X=>.1+.1*(X-HINGE)/(SNOUT-HINGE);
const lipL=X=>-.48*clamp((X-HINGE)/(JAW-HINGE))**1.1;
function top(X){const t=X<=1.6?.5+.75*Math.sin(Math.PI/2*X/1.6):1.25-.85*((X-1.6)/1.25)**1.5;
 return X<2.85?t:lipU(X)+(t-lipU(X))*Math.sqrt(clamp(1-((X-2.85)/.15)**2));}
function bottom(X){if(X>JAW)return lipU(X);const b=-.5-.12*clamp(X/2.45)**1.4;return X<2.45?b:lipL(X)+(b-lipL(X))*Math.sqrt(clamp(1-((X-2.45)/.15)**2));}

export function drawOuroboros(canvas,{radius=.432,width=.062,head=-84}={}){
 const S=canvas.width,ctx=canvas.getContext('2d'),c=S/2,R=radius*S,W=width*S;
 const neck=wrap(head*Math.PI/180),tip=wrap(neck+1.2*W/R),body=wrap(neck-tip),tailLen=body*R*.24;
 const off=document.createElement('canvas');off.width=off.height=S;const octx=off.getContext('2d');
 const img=octx.createImageData(S,S),px=img.data,cache=new Map();
 const rMin=R-W*.9,rMax=R+W*1.3,sz=W/5.4;
 const taper=l=>{const t=clamp(l/tailLen);return .3+.7*(1-(1-t)*(1-t));};
 // Shade one point of a scaled cylinder; v is -1..1 across it, a/b scale-lattice coordinates.
 function shade(i,v,a,b,cos,sin,col,{net=true,alpha=1,dim=1,slope=0}={}){
  const av=Math.abs(v),nz=Math.sqrt(Math.max(0,1-v*v)),p=a+b,q=a-b,ip=Math.floor(p),iq=Math.floor(q),fp=p-ip-.5,fq=q-iq-.5;
  const e=2*Math.max(Math.abs(fp),Math.abs(fq)),h=1-e**2.4,groove=smooth(.72,.97,e);
  if(!col){const key=ip*8192+iq;col=cache.get(key);if(!col){const ac=(ip+iq+1)/2,bc=(ip-iq)/2,n=fbm(ac*.09,bc*.3+3.1),n2=fbm(ac*.035+9,bc*.16),k=.84+.3*hash(ip+77,iq-31);
   const dark=1-smooth(.03,.08,Math.abs(n-.5)),sad=smooth(.48,.6,n2);col=[0,1,2].map(j=>(BASE[j]+(SADDLE[j]-BASE[j])*Math.max(sad,dark*.8))*k);cache.set(key,col);}}
  const dh=-4.8*e**1.4,gp=Math.abs(fp)>=Math.abs(fq)?dh*Math.sign(fp):0,gq=Math.abs(fq)>Math.abs(fp)?dh*Math.sign(fq):0,da=gp+gq,db=gp-gq,k=.3;
  const tx=-sin,ty=cos;let nx=v*cos-k*(da*tx+db*cos*nz)+slope*tx,ny=v*sin-k*(da*ty+db*sin*nz)+slope*ty,nzz=nz+k*db*v;
  const nl=Math.hypot(nx,ny,nzz);nx/=nl;ny/=nl;nzz/=nl;
  const diff=Math.max(0,nx*LIGHT[0]+ny*LIGHT[1]+nzz*LIGHT[2]),spec=Math.max(0,nx*HALF[0]+ny*HALF[1]+nzz*HALF[2])**28*.55*(.35+.65*h);
  const lit=(.16+.95*diff)*(.84+.22*h)*dim,m=net?groove*(.35+.65*nz):0,g=net?0:groove;
  for(let j=0;j<3;j++)px[i+j]=clamp((col[j]*(1-m)+NET[j]*m*(.45+.55*diff))*lit*(1-.7*g)+spec*250*(1-groove),0,255);
  px[i+3]=255*alpha*clamp((1-av)*10);
 }
 for(let y=0;y<S;y++){const dy=y+.5-c;
  for(let x=0;x<S;x++){const dx=x+.5-c,r2=dx*dx+dy*dy;if(r2<rMin*rMin||r2>rMax*rMax)continue;
   const r=Math.sqrt(r2),phi=Math.atan2(dy,dx),cos=dx/r,sin=dy/r,i=(y*S+x)*4;
   const X=wrap(phi-neck)*R/W,Y=(r-R)/W;
   const d=wrap(phi-tip),l=d*R,tw=d<=body?taper(l)/2:0,tailV=Y/tw,onTail=tw>0&&Math.abs(tailV)<1;
   if(X<=SNOUT&&Y<=top(X)&&Y>=bottom(X)){
    const upper=Y>=(X<HINGE?-1:lipU(X)),lower=X>=HINGE&&X<=JAW+.15&&Y<=lipL(X);
    if(upper||lower){
     const lo=upper?(X<HINGE?bottom(X):lipU(X)):bottom(X),hi=upper?top(X):lipL(X),v=(Y-(lo+hi)/2)/((hi-lo)/2);
     // Fine scales on the face, a row of large labial plates along each lip, smooth crown.
     const nearLip=upper?X>HINGE&&Y-lipU(X)<.16:X>HINGE&&lipL(X)-Y<.14;
     const crown=upper&&Y-lipU(X)>.45&&X>.9,cs=crown?.2:.11;
     const a=nearLip?X/.2:X/cs,b=nearLip?(upper?(Y-lipU(X))/.16:(lipL(X)-Y)/.14):Y/cs;
     shade(i,clamp(v,-.98,.98),a,b,cos,sin,null,{slope:upper?.9*smooth(1.6,SNOUT,X):0,dim:lower?.72:.88});
     continue;
    }
    // Inside the open mouth: the tail where it passes, dark gullet elsewhere.
    if(onTail){shade(i,tailV,l/(sz*1.25),Math.asin(clamp(tailV,-1,1))*tw*W/sz,cos,sin,null,{dim:.8});continue;}
    const gum=smooth(.6,1,Math.max((Y-lipL(X))/(lipU(X)-lipL(X)),0)),depth=clamp((X-HINGE)/(JAW-HINGE));px[i]=18+60*depth*(.4+.6*gum);px[i+1]=4+8*depth;px[i+2]=5+8*depth;px[i+3]=255;continue;
   }
   if(X<=SNOUT+.05&&!onTail)continue;
   if(d>body){if(X>SNOUT)continue;}
   const w=d<=body?W*taper(l):W,v=(r-R)/(w/2);if(Math.abs(v)>=1)continue;
   shade(i,v,l/(sz*1.25),Math.asin(clamp(v,-1,1))*(w/2)/sz,cos,sin);
  }}
 octx.putImageData(img,0,0);
 ctx.clearRect(0,0,S,S);
 const at=(X,Y)=>{const ang=neck+X*W/R,rr=R+Y*W;return [c+rr*Math.cos(ang),c+rr*Math.sin(ang)];};
 const headPath=()=>{ctx.beginPath();for(let X=0;X<=SNOUT;X+=.05){const [px,py]=at(X,top(X));X?ctx.lineTo(px,py):ctx.moveTo(px,py);}for(let X=SNOUT;X>=0;X-=.05){const [px,py]=at(X,X>JAW?lipU(X):bottom(X));ctx.lineTo(px,py);}ctx.closePath();};
 // Soft cast shadow on the panel, drawn a full canvas width away and offset back.
 ctx.save();ctx.shadowColor='rgba(0,0,0,.8)';ctx.shadowBlur=W*.4;ctx.shadowOffsetX=S+W*.12;ctx.shadowOffsetY=W*.2;ctx.translate(-S,0);
 ctx.lineWidth=W*.9;ctx.strokeStyle='#000';ctx.beginPath();ctx.arc(c,c,R,0,TAU);ctx.stroke();
 headPath();ctx.fillStyle='#000';ctx.fill();ctx.restore();
 ctx.drawImage(off,0,0);
 const poly=pts=>{ctx.beginPath();pts.forEach(([X,Y],k)=>{const [px,py]=at(X,Y);k?ctx.lineTo(px,py):ctx.moveTo(px,py);});ctx.closePath();};
 // Engraved outline round the head and along both lips.
 ctx.save();ctx.lineJoin='round';ctx.strokeStyle='rgba(6,5,4,.95)';ctx.lineWidth=Math.max(1.5,W*.035);headPath();ctx.stroke();
 for(const f of [lipU,lipL]){ctx.beginPath();for(let X=HINGE-.15;X<=(f===lipU?SNOUT-.05:JAW);X+=.05){const [px,py]=at(X,f(Math.max(X,HINGE)));X>HINGE-.15?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.stroke();}
 ctx.restore();
 // Fangs and teeth.
 ctx.fillStyle='#e2dbcd';ctx.strokeStyle='rgba(0,0,0,.6)';ctx.lineWidth=Math.max(1,W*.01);
 for(let X=1.7;X<2.8;X+=.16){const y=lipU(X);poly([[X-.04,y],[X,y-.08],[X+.04,y]]);ctx.fill();ctx.stroke();}
 for(let X=1.7;X<2.5;X+=.17){const y=lipL(X);poly([[X-.035,y],[X,y+.07],[X+.035,y]]);ctx.fill();ctx.stroke();}
 poly([[2.6,lipU(2.6)],[2.68,lipU(2.68)-.42],[2.75,lipU(2.75)]]);ctx.fill();ctx.stroke();
 poly([[2.3,lipL(2.3)],[2.37,lipL(2.37)+.34],[2.44,lipL(2.44)]]);ctx.fill();ctx.stroke();
 // Eye with a heavy brow ridge, slit pupil and a red glow.
 const [ex,ey]=at(1.9,.78),er=W*.19,dir=neck+1.9*W/R+Math.PI/2;
 ctx.save();ctx.fillStyle='rgba(0,0,0,.75)';ctx.beginPath();ctx.arc(ex,ey,er*1.35,0,TAU);ctx.fill();
 const g=ctx.createRadialGradient(ex-er*.3,ey-er*.3,er*.1,ex,ey,er);g.addColorStop(0,'#ffb08a');g.addColorStop(.4,'#e02a12');g.addColorStop(1,'#400604');
 ctx.shadowColor='#ff2a10';ctx.shadowBlur=W*.25;ctx.fillStyle=g;ctx.beginPath();ctx.arc(ex,ey,er,0,TAU);ctx.fill();ctx.restore();
 ctx.save();ctx.translate(ex,ey);ctx.rotate(dir);ctx.fillStyle='#0a0000';ctx.beginPath();ctx.ellipse(0,0,er*.75,er*.2,0,0,TAU);ctx.fill();ctx.restore();
 ctx.fillStyle='rgba(255,238,220,.85)';ctx.beginPath();ctx.arc(ex-er*.38,ey-er*.38,er*.17,0,TAU);ctx.fill();
 ctx.strokeStyle='rgba(10,9,8,.9)';ctx.lineWidth=W*.07;ctx.lineCap='round';ctx.beginPath();[[1.5,.98],[1.9,1.08],[2.3,.92]].forEach(([X,Y],k)=>{const [px,py]=at(X,Y);k?ctx.lineTo(px,py):ctx.moveTo(px,py);});ctx.stroke();
 const [nx,ny]=at(2.8,.38);ctx.fillStyle='#050505';ctx.beginPath();ctx.ellipse(nx,ny,W*.045,W*.025,dir,0,TAU);ctx.fill();
}
