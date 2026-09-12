(()=>{
'use strict';
// Page views only. Public history is rendered once by app.js from its snapshot.
if(window.SWEPageViews)return;
const counts=new Map(),pending=new Map();let currentKey='';
function footer(text){
 let el=document.getElementById('swePageViewCount');
 if(!el){el=document.createElement('footer');el.id='swePageViewCount';el.style.cssText='display:block;width:100%;box-sizing:border-box;text-align:center;padding:12px 8px;font-size:11px;color:#64748b;margin-top:16px';document.body.appendChild(el)}
 if(el.textContent!==text)el.textContent=text;
}
function show(n){footer('👁 '+Number(n).toLocaleString('fr-FR')+' vue'+(Number(n)>1?'s':'')+' de cette page')}
async function track(page,token=null,id=null){
 const key=[page,token||'',id||''].join('|');currentKey=key;
 if(counts.has(key)){show(counts.get(key));return counts.get(key)}
 footer('Chargement des vues…');
 if(!pending.has(key))pending.set(key,(async()=>{
   const response=await fetch('https://fbppesfxkvledwjemwsn.supabase.co/rest/v1/rpc/record_swe_page_view',{method:'POST',cache:'no-store',headers:{apikey:'sb_publishable_Kl3HDD4S08YC1EB-cWJKaQ_e9gCbygp','Content-Type':'application/json'},body:JSON.stringify({p_page:page,p_public_token:token,p_entity_id:id})});
   if(!response.ok)throw new Error('Compteur indisponible');const n=Number(await response.json());if(!Number.isFinite(n))throw new Error('Compteur indisponible');counts.set(key,n);return n;
 })());
 try{const n=await pending.get(key);if(currentKey===key)show(n);return n}catch(e){if(currentKey===key)footer('Compteur temporairement indisponible');console.warn('SWÉ vues',e.message)}finally{pending.delete(key)}
}
window.SWEPageViews={track};
function boot(){
 if(window.swePageViewContext){const c=window.swePageViewContext;track(c.page,c.token,c.id);return}
 const path=location.pathname.replace(/\/$/,'/index.html'),q=new URLSearchParams(location.search);
 if(/\/(live|season)\.html$/.test(path))return;
 if((path==='/index.html'||path==='/')&&(q.has('public')||q.has('s')))return;
 const page=/\/forssadmin\//.test(path)?'super_admin':/\/complexe\//.test(path)?'complex_portal':/complexes-partenaires/.test(path)?'complexes':/complexes-reservation/.test(path)?'reservation':/\/(c|carte-joueur)\.html$/.test(path)?'player_card':/reset-/.test(path)?'reset':'home';
 track(page);
}
document.addEventListener('swe:page-view',()=>{const c=window.swePageViewContext;if(c)track(c.page,c.token,c.id)});
document.addEventListener('swe:rendered',()=>{
 try{if(typeof S==='undefined'||S.publicMode)return;const view=S.lastView||'home';const known=['home','myplayer','players','permissions','tournaments','teams','matches','league','cooler','ranking','simple-swe'];if(known.includes(view))track('app:'+view)}catch(_){}
});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
