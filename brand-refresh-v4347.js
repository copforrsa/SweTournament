(()=>{
'use strict';
if(window.__SWE_BRAND_4347)return;window.__SWE_BRAND_4347=true;
const BRAND='/swe-brand-v4347.svg?v=4347';
function favicon(){
 document.querySelectorAll('link[rel~="icon"],link[rel="shortcut icon"],link[rel="apple-touch-icon"]').forEach(x=>x.remove());
 const icon=document.createElement('link');icon.rel='icon';icon.type='image/svg+xml';icon.href=BRAND;document.head.appendChild(icon);
 const shortcut=document.createElement('link');shortcut.rel='shortcut icon';shortcut.href=BRAND;document.head.appendChild(shortcut);
 const apple=document.createElement('link');apple.rel='apple-touch-icon';apple.href=BRAND;document.head.appendChild(apple);
}
function logos(){
 document.querySelectorAll('img').forEach(img=>{
   const src=(img.getAttribute('src')||'').toLowerCase();
   if(src.includes('favicon.png')||src.includes('icon-192.png')||src.includes('icon-512.png')){
     img.src=BRAND;img.removeAttribute('srcset');
   }
 });
}
function social(){
 const abs=new URL(BRAND,location.origin).href;
 [['meta[property="og:image"]','content'],['meta[name="twitter:image"]','content']].forEach(([sel,attr])=>{const m=document.querySelector(sel);if(m)m.setAttribute(attr,abs)});
}
function apply(){favicon();logos();social();document.documentElement.dataset.sweBrand='4347'}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
document.addEventListener('swe:rendered',apply);window.addEventListener('pageshow',apply);
})();