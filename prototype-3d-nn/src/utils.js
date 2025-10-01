export function sigmoid(x){ return 1/(1+Math.exp(-x)); }
export function relu(x){ return Math.max(0,x); }
export function randomArray(n){ return Array.from({length:n},()=>Math.random()); }
export function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

export function lerp(a,b,t){ return a + (b-a)*t; }
export function hexToRgb(h){ const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h); return m?{r:parseInt(m[1],16),g:parseInt(m[2],16),b:parseInt(m[3],16)}:null; }
export function rgbToHex({r,g,b}){ const to=v=>v.toString(16).padStart(2,'0'); return `#${to(r)}${to(g)}${to(b)}`; }
export function lerpColor(c1,c2,t){ const a=hexToRgb(c1), b=hexToRgb(c2); return rgbToHex({r:Math.round(lerp(a.r,b.r,t)), g:Math.round(lerp(a.g,b.g,t)), b:Math.round(lerp(a.b,b.b,t))}); }
