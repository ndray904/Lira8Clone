export const polar=(radius,degrees)=>[50+radius*Math.cos(degrees*Math.PI/180),50+radius*Math.sin(degrees*Math.PI/180)];
export function annularSector(inner,outer,start,end){
 const points=[];const steps=Math.ceil(Math.abs(end-start)/2);
 for(let i=0;i<=steps;i++)points.push(polar(outer,start+(end-start)*i/steps));
 for(let i=steps;i>=0;i--)points.push(polar(inner,start+(end-start)*i/steps));
 return points;
}
export const sectorClip=points=>'polygon('+points.map(p=>p.map(v=>v.toFixed(4)+'%').join(' ')).join(',')+')';
