(()=>{
'use strict';
if(window.__SWE_4271_WA_AVATAR)return;
window.__SWE_4271_WA_AVATAR=true;

// WhatsApp : certains clients affichaient les emojis UTF-8 sous forme de �.
// Pour garantir un message propre, on retire les emojis uniquement des liens WhatsApp.
function cleanWhatsAppText(text){
  return String(text||'')
    .replace(/\uFFFD/g,'')
    .replace(/[\uFE0E\uFE0F]/g,'')
    .replace(/\p{Extended_Pictographic}/gu,'')
    .replace(/[\u{1F1E6}-\u{1F1FF}]/gu,'')
    .replace(/\s+\n/g,'\n')
    .replace(/\n{3,}/g,'\n\n')
    .replace(/^\s+/gm,'')
    .trim();
}
function cleanWhatsAppUrl(raw){
  try{
    const u=new URL(String(raw),location.href);
    if(!/(^|\.)wa\.me$/i.test(u.hostname)&&!/(^|\.)whatsapp\.com$/i.test(u.hostname))return raw;
    if(u.searchParams.has('text'))u.searchParams.set('text',cleanWhatsAppText(u.searchParams.get('text')));
    return u.toString();
  }catch(_){return raw;}
}
const nativeOpen=window.open.bind(window);
window.open=function(url,target,features){
  return nativeOpen(cleanWhatsAppUrl(url),target,features);
};

// Les avatars sont stockés sur Supabase. La CSP historique autorise les connexions
// Supabase mais pas son domaine dans img-src. On récupère donc l'image puis on
// l'affiche via une URL blob: (déjà autorisée par la CSP), sans rendre le bucket privé/public dépendant de l'UI.
const blobCache=new Map();
const repaired=new WeakSet();
function isSupabaseStorageUrl(src){
  try{const u=new URL(src,location.href);return /\.supabase\.co$/i.test(u.hostname)&&/\/storage\/v1\/object\//.test(u.pathname)}catch(_){return false}
}
async function blobUrlFor(src){
  if(blobCache.has(src))return blobCache.get(src);
  const p=(async()=>{
    const r=await fetch(src,{cache:'no-store',credentials:'omit'});
    if(!r.ok)throw new Error('Photo HTTP '+r.status);
    const b=await r.blob();
    if(!/^image\//i.test(b.type||''))throw new Error('Fichier photo invalide');
    return URL.createObjectURL(b);
  })();
  blobCache.set(src,p);
  try{return await p}catch(e){blobCache.delete(src);throw e}
}
async function repairImg(img){
  if(!img||repaired.has(img))return;
  const src=img.getAttribute('src')||img.dataset?.avatarUrl||'';
  if(!isSupabaseStorageUrl(src))return;
  repaired.add(img);
  img.dataset.sweOriginalAvatar=src;
  try{
    const blob=await blobUrlFor(src);
    if(img.isConnected)img.src=blob;
  }catch(e){
    repaired.delete(img);
    console.warn('SWÉ photo',e);
  }
}
function repairBackground(el){
  if(!el||el.dataset?.sweBgAvatarFixed==='1')return;
  const bg=getComputedStyle(el).backgroundImage||'';
  const m=bg.match(/url\(["']?(https?:\/\/[^"')]+supabase\.co\/storage\/v1\/object\/[^"')]+)["']?\)/i);
  if(!m)return;
  el.dataset.sweBgAvatarFixed='1';
  blobUrlFor(m[1]).then(blob=>{if(el.isConnected)el.style.backgroundImage='url("'+blob+'")'}).catch(()=>{delete el.dataset.sweBgAvatarFixed});
}
function scan(root=document){
  const imgs=[];
  if(root?.matches?.('img'))imgs.push(root);
  root?.querySelectorAll?.('img').forEach(i=>imgs.push(i));
  imgs.forEach(repairImg);
  const els=[];
  if(root?.nodeType===1)els.push(root);
  root?.querySelectorAll?.('[style*="supabase.co"],.player-hub-avatar,.player-avatar,.avatar').forEach(e=>els.push(e));
  els.forEach(repairBackground);
}
function installObserver(){
  scan(document);
  const obs=new MutationObserver(ms=>{
    for(const m of ms){
      if(m.type==='attributes'){if(m.target?.matches?.('img'))repairImg(m.target);else repairBackground(m.target);}
      m.addedNodes?.forEach(n=>{if(n.nodeType===1)scan(n)});
    }
  });
  obs.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['src','style']});
  document.addEventListener('error',e=>{if(e.target?.matches?.('img'))repairImg(e.target)},true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installObserver,{once:true});else installObserver();
document.addEventListener('swe:rendered',()=>setTimeout(()=>scan(document),0));
window.addEventListener('pageshow',()=>setTimeout(()=>scan(document),100));
})();
