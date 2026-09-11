(()=>{
'use strict';
if(window.__SWE_4280_REG_STATUS)return;window.__SWE_4280_REG_STATUS=true;
let snap=null,busy=false,timer=null,selectActive=false,pendingForce=false;
const fmt=v=>{if(!v)return'';try{return new Date(v).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}catch(_){return''}};
async function ids(){const q=new URLSearchParams(location.search);let token=q.get('public')||'',tid=q.get('tournament')||window.__sweResolvedShortLink?.tournament||'';if(!token&&q.get('s')&&typeof sb!=='undefined'){const r=await sb.rpc('resolve_public_tournament_short_link',{p_code:String(q.get('s')).trim().toUpperCase()});if(!r.error){token=r.data?.public_token||'';tid=tid||r.data?.tournament_id||''}}try{if(!token&&typeof S!=='undefined')token=S.publicToken||''}catch(_){ }return{token,tid}}
async function load(force=false){if(busy)return snap;if(snap&&!force)return snap;const {token}=await ids();if(!token||typeof sb==='undefined')return null;busy=true;try{const r=await sb.rpc('get_public_workspace_snapshot_v2',{p_token:token});if(!r.error)snap=r.data||null}catch(_){ }finally{busy=false}return snap}
function selectionInProgress(sel){return selectActive||document.activeElement===sel}
async function apply(force=false){
 const sel=document.getElementById('publicPlayerSelect');if(!sel)return;
 if(selectionInProgress(sel)){pendingForce=pendingForce||force;return}
 const s=await load(force);if(!s||selectionInProgress(sel)){pendingForce=pendingForce||force;return}
 const {tid}=await ids();if(!tid||selectionInProgress(sel)){pendingForce=pendingForce||force;return}
 const regs=(Array.isArray(s.tournament_players)?s.tournament_players:[]).filter(r=>String(r.tournament_id)===String(tid));
 const teams=(Array.isArray(s.teams)?s.teams:[]).filter(t=>String(t.tournament_id)===String(tid));
 const tids=new Set(teams.map(t=>String(t.id)));
 const inTeam=new Set((Array.isArray(s.team_players)?s.team_players:[]).filter(tp=>tids.has(String(tp.team_id))).map(tp=>String(tp.player_id)));
 const rm=new Map(regs.map(r=>[String(r.player_id),r])),val=sel.value;
 [...sel.options].forEach(o=>{
   if(!o.value)return;
   const base=o.dataset.sweBaseLabel||o.textContent.split(' — ')[0].trim();o.dataset.sweBaseLabel=base;
   const r=rm.get(String(o.value));let st='';
   if(r){const code=String(r.registration_status||'');if(r.present&&code!=='cancelled'&&code!=='late_withdrawal'){st='Inscrit le '+fmt(r.registered_at);if(inTeam.has(String(o.value)))st+=' • en équipe';else if(r.is_substitute||code==='waitlist')st+=' • remplaçant'}else if(r.deregistered_at||code==='cancelled'||code==='late_withdrawal'){st='Désinscrit le '+fmt(r.deregistered_at||r.registered_at)}}
   const label=base+(st?' — '+st:'');if(o.textContent!==label)o.textContent=label;
 });
 if(sel.value!==val)sel.value=val;sel.dataset.swe4280='1';
}
function finishSelection(){selectActive=false;const force=pendingForce;pendingForce=false;clearTimeout(timer);timer=setTimeout(()=>apply(force),80)}
function watch(){
 const sel=document.getElementById('publicPlayerSelect');if(!sel)return false;
 if(sel.dataset.swe4280Watch==='1')return true;
 sel.dataset.swe4280Watch='1';
 ['pointerdown','touchstart','mousedown','focus'].forEach(evt=>sel.addEventListener(evt,()=>{selectActive=true},{passive:true}));
 sel.addEventListener('change',finishSelection);sel.addEventListener('blur',finishSelection);
 apply(true);return true;
}
function boot(){let n=0;const t=setInterval(()=>{n++;if(watch()||n>40)clearInterval(t)},150)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
document.addEventListener('swe:rendered',()=>setTimeout(()=>{snap=null;watch();apply(true)},60));
window.addEventListener('pageshow',()=>setTimeout(()=>{snap=null;watch();apply(true)},80));
})();