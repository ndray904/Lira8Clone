// Sizes the scope window to the sound's pitch so it always shows whole cycles of the real waveform.
// The fundamental comes from a normalised autocorrelation of a 4× decimated copy of the newest audio,
// refined by parabolic interpolation; drones without a clear pitch fall back to a fixed window.
export const CYCLES=3,FALLBACK=1024;
const DECIMATE=4,SPAN=1024,MIN_HZ=25,MAX_HZ=2000,CONFIDENCE=.6;

// Period in samples at the full rate, or 0 when the signal has no clear pitch.
export function findPeriod(samples,sampleRate=48000){
 const n=Math.min(SPAN,Math.floor(samples.length/DECIMATE)),x=new Float32Array(n),from=samples.length-n*DECIMATE;
 for(let i=0;i<n;i++){let s=0;for(let k=0;k<DECIMATE;k++)s+=samples[from+i*DECIMATE+k];x[i]=s/DECIMATE;}
 const rate=sampleRate/DECIMATE,lo=Math.max(2,Math.floor(rate/MAX_HZ)),hi=Math.min(n>>1,Math.ceil(rate/MIN_HZ));
 if(hi<=lo)return 0;
 const r=new Float32Array(hi+2);let best=0;
 for(let lag=lo;lag<=hi+1;lag++){let xy=0,xx=0,yy=0;for(let i=0;i+lag<n;i++){const a=x[i],b=x[i+lag];xy+=a*b;xx+=a*a;yy+=b*b;}r[lag]=xx&&yy?xy/Math.sqrt(xx*yy):0;if(lag<=hi)best=Math.max(best,r[lag]);}
 if(best<CONFIDENCE)return 0;
 // The first peak close to the best avoids locking onto a multiple of the true period.
 for(let lag=lo+1;lag<=hi;lag++)if(r[lag]>=.9*best&&r[lag]>=r[lag-1]&&r[lag]>=r[lag+1]){
  const a=r[lag-1],b=r[lag],c=r[lag+1],d=a-2*b+c,shift=d?(a-c)/(2*d):0;
  return (lag+Math.max(-.5,Math.min(.5,shift)))*DECIMATE;
 }
 return 0;
}

// Steadies the estimate across frames: small drifts glide, jumps must repeat before they are trusted.
export function createPitchWindow(){
 let period=0,pending=0;
 return function window(samples,sampleRate){
  const found=findPeriod(samples,sampleRate);
  if(!found){pending=0;period=0;}
  else if(period&&Math.abs(found/period-1)<.15){period+=(found-period)*.35;pending=0;}
  else if(pending&&Math.abs(found/pending-1)<.15){period=found;pending=0;}
  else pending=found;
  const length=period?Math.min(CYCLES*period,samples.length*.75):FALLBACK;
  // Begin on a rising zero crossing within the last part of the buffer that still fits the window.
  const earliest=Math.max(0,samples.length-length-(period||FALLBACK)*1.5);let start=Math.floor(earliest);
  for(let i=Math.floor(earliest)+1;i<samples.length-length;i++)if(samples[i-1]<=0&&samples[i]>0){start=i;break;}
  return {start,length,period};
 };
}

// Linear interpolation, so a window of any length maps onto a fixed number of drawn points.
export const sampleAt=(samples,pos)=>{const i=Math.floor(pos),f=pos-i;return (samples[i]||0)*(1-f)+(samples[i+1]??samples[i]??0)*f;};
