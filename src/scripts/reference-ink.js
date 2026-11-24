/* InkStroke: reusable lines, circles and arbitrary paths with paper-grain ink.
   No dependency; transparent canvas; responsive and retina-ready. */
const InkStroke = (() => {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = t => { t = clamp(t, 0, 1); return t*t*(3-2*t); };
  function hash(i, seed) {
    let h = (Math.imul(i | 0, 0x9e3779b1) ^ Math.imul(seed | 0, 0x85ebca6b)) | 0;
    h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15;
    h = Math.imul(h, 0x846ca68b); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function noise(x, seed) {
    const i = Math.floor(x), t = ease(x-i);
    return hash(i, seed)*(1-t) + hash(i+1, seed)*t;
  }
  function rng(seed) {
    let v = (seed || 1) | 0;
    return () => { v ^= v << 13; v ^= v >>> 17; v ^= v << 5; return (v >>> 0) / 4294967296; };
  }
  function rgb(hex) {
    const value = (hex || '#26212a').trim();
    if (/^#[0-9a-f]{3}$/i.test(value))
      return [...value.slice(1)].map(x => parseInt(x+x,16));
    if (/^#[0-9a-f]{6}$/i.test(value))
      return [1,3,5].map(i => parseInt(value.slice(i,i+2),16));
    return [38,33,42];
  }
  function shapePath(w,h,o) {
    const p = Math.max(1.5,Number(o.padding ?? 12));
    if (o.shape === 'circle') {
      const r = Math.max(1,Math.min(w,h)/2-p), cx=w/2, cy=h/2;
      return {closed: true, length: 2*Math.PI*r, point:t => {
        const a = -Math.PI/2 + t*Math.PI*2;
        return [cx+r*Math.cos(a),cy+r*Math.sin(a)];
      }};
    }
    if (typeof o.path === 'function') {
      // A caller can provide any mathematically defined shape in canvas px.
      const n=400; let length=0,prev=o.path(0,w,h);
      for(let i=1;i<=n;i++) { const pt=o.path(i/n,w,h); length+=Math.hypot(pt[0]-prev[0],pt[1]-prev[1]);prev=pt; }
      return {closed:!!o.closed, length, point:t=>o.path(t,w,h)};
    }
    const a=Number(o.angle || 0)*Math.PI/180;
    const c=Math.cos(a),s=Math.sin(a);
    let cx=w/2,cy=h/2;
    if (o.snapToPixels) {
      const snap=v=>(Math.round(v*o.pixelRatio-.5)+.5)/o.pixelRatio;
      if (Math.abs(s)<.0001) cy=snap(cy);
      if (Math.abs(c)<.0001) cx=snap(cx);
    }
    const length=Math.min((w-2*p)/Math.max(.0001,Math.abs(c)),(h-2*p)/Math.max(.0001,Math.abs(s)));
    return {closed:false, length, point:t=>[cx+(t-.5)*length*c,cy+(t-.5)*length*s]};
  }
  function stroke(canvas, supplied = {}) {
    const o = {
      shape:canvas.dataset.shape || 'line',
      weight:canvas.dataset.weight || 'fine',
      color:canvas.dataset.color || '#2d2630',
      seed:Number(canvas.dataset.seed || 27),
      angle:Number(canvas.dataset.angle || 0),
      texture:Number(canvas.dataset.texture || 1),
      padding:Number(canvas.dataset.padding || 13),
      ...supplied
    };
    const rect=canvas.getBoundingClientRect();
    const w=rect.width, h=rect.height;
    if (!(w>2 && h>2)) return;
    const dpr=Math.min(window.devicePixelRatio||1,3);
    canvas.width=Math.ceil(w*dpr); canvas.height=Math.ceil(h*dpr);
    const ctx=canvas.getContext('2d');
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,w,h);
    const [R,G,B]=rgb(o.color), color=a=>`rgba(${R},${G},${B},${clamp(a,0,1).toFixed(3)})`;
    const width = Number(o.width ?? (o.weight==='thick'?4.5:0.95));
    const texture=clamp(o.texture,0,3);
    const path=shapePath(w,h,{...o,pixelRatio:dpr});
    const L=path.length;
    if (L<=0) return;
    const steps=clamp(Math.ceil(L/.75),40,6000);
    const pts=Array.from({length:steps+1},(_,i)=>path.point(i/steps));
    const prng=rng(o.seed+101);
    const taperDist=Math.min(90,L*.10);
    const taper=u => path.closed ? 1 : (.035+.965*ease(Math.min(u,L-u)/taperDist));
    const opacity = u => {
      const big=2*noise(u/57,o.seed+1)-1;
      const mid=2*noise(u/13,o.seed+2)-1;
      const fine=2*noise(u/2.6,o.seed+3)-1;
      const fiber=2*noise(u/.8,o.seed+4)-1;
      const light=clamp((.36-big*.29-mid*.37-fine*.10)*texture,0,.93);
      const pigment=(width>2? .63:.55)+texture*(.26*big+.22*mid+.11*fine+.075*fiber)-light*.22;
      return clamp(pigment*clamp(Number(o.density ?? 1),.5,2),.025,.96);
    };
    // Extremely faint guide pigment follows the exact geometric center line.
    ctx.beginPath(); pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
    if(path.closed) ctx.closePath();
    ctx.lineWidth=Math.max(.2,width*.19); ctx.strokeStyle=color(.07);ctx.lineCap='round';ctx.stroke();
    // Independent microscopic ink deposits make the paper visible through the stroke.
    // The geometry remains perfectly straight/circular; only ink distribution varies.
    ctx.lineCap='round';ctx.lineJoin='round';
    for (let i=0;i<steps;i++) {
      const u=(i+.5)*L/steps;
      const [x,y]=pts[i], [xx,yy]=pts[i+1];
      const unit=2*noise(u/24,o.seed+6)-1;
      const micro=2*noise(u/3.2,o.seed+7)-1;
      const jitter=width>.9 ? width*.052*micro : .012*micro;
      const dx=xx-x,dy=yy-y,dist=Math.hypot(dx,dy)||1;
      const nx=-dy/dist,ny=dx/dist;
      const wSeg=Math.max(.03,width*taper(u)*(0.83+.12*unit+.09*micro));
      ctx.beginPath();ctx.moveTo(x+nx*jitter,y+ny*jitter);ctx.lineTo(xx+nx*jitter,yy+ny*jitter);
      ctx.strokeStyle=color(opacity(u));ctx.lineWidth=wSeg;ctx.stroke();
    }
    // Ink capillary bleeds; no separate background texture.
    const bleedCount=Math.round(L*(width>2?.75:.40)*texture);
    for(let i=0;i<bleedCount;i++) {
      const u=prng()*L, t=u/L;
      if(prng() > opacity(u)*.85) continue;
      const pt=path.point(t);
      const pt2=path.point((t+.0001)%1);
      const dx=pt2[0]-pt[0],dy=pt2[1]-pt[1],mag=Math.hypot(dx,dy)||1;
      const nx=-dy/mag,ny=dx/mag;
      const cross=(prng()+prng()-1)*width*.47;
      const len=(.28+prng()*2.9)*(width>2?1.4:1);
      const rad=width>2?.17:.07;
      ctx.beginPath();ctx.moveTo(pt[0]+nx*cross,pt[1]+ny*cross);
      ctx.lineTo(pt[0]+nx*(cross+(prng()-.5)*rad*4)+(dx/mag)*len,pt[1]+ny*(cross+(prng()-.5)*rad*4)+(dy/mag)*len);
      ctx.lineWidth=.04+prng()*(width>2?.33:.12);
      ctx.strokeStyle=color((.05+prng()*.40)*taper(u)*texture);ctx.stroke();
    }
    // Erase pinholes along the existing stroke, never paint paper grain on the background.
    const scratchCount=Math.round(L*(width>2?.25:.075)*texture);
    ctx.save(); ctx.globalCompositeOperation='destination-out';ctx.lineCap='round';
    for(let i=0;i<scratchCount;i++) {
      const u=prng()*L;
      if(prng()<.30) continue;
      const p=path.point(u/L),p2=path.point(Math.min(.999999,u/L+.0001));
      const dx=p2[0]-p[0],dy=p2[1]-p[1],mag=Math.hypot(dx,dy)||1;
      const nx=-dy/mag,ny=dx/mag,offset=(prng()-.5)*width*.67;
      const len=.25+prng()*(width>2?5.4:1.4);
      ctx.beginPath();ctx.moveTo(p[0]+nx*offset,p[1]+ny*offset);
      ctx.lineTo(p[0]+nx*offset+(dx/mag)*len,p[1]+ny*offset+(dy/mag)*len);
      ctx.lineWidth=.08+prng()*(width>2?.46:.16);
      ctx.strokeStyle=`rgba(0,0,0,${.28+prng()*.72})`;
      ctx.stroke();
    }
    ctx.restore();
    return canvas;
  }
  return {draw:stroke};
})();
export default InkStroke;
