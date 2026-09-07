(()=>{
'use strict';
const BUILD='42.63';
const health=new Map();
const appState=()=>{try{return typeof S!=='undefined'?S:null}catch(_){return null}};
const appSb=()=>{try{return typeof sb!=='undefined'?sb:null}catch(_){return null}};
const canonicalRegistrationLink=t=>{
  try{
    const state=appState();
    if(!t||!state?.workspace?.public_token)return '';
    const q=new URLSearchParams({
      public:String(state.workspace.public_token),
      view:t.format==='league'?'league-session':'tournament',
      tournament:String(t.id)
    });
    if(t.format==='league'&&t.league_id)q.set('league',String(t.league_id));
    return location.origin+'/?'+q.toString();
  }catch(_){return ''}
};
function installCanonicalGenerator(){
  try{
    if(typeof registrationLink==='function'&&registrationLink!==canonicalRegistrationLink)registrationLink=canonicalRegistrationLink;
    window.registrationLink=canonicalRegistrationLink;
  }catch(_){}
}
async function verifyTournament(t){
  const state=appState(),client=appSb();
  if(!t||!client||!state?.workspace?.public_token)return {ok:false,reason:'contexte indisponible'};
  const token=String(state.workspace.public_token);
  try{
    const snap=await client.rpc('get_public_workspace_snapshot_v2',{p_token:token});
    if(snap.error||!snap.data)return {ok:false,reason:snap.error?.message||'snapshot public indisponible'};
    const rows=Array.isArray(snap.data.tournaments)?snap.data.tournaments:[];
    const visible=rows.some(x=>String(x.id)===String(t.id));
    if(!visible)return {ok:false,reason:'tournoi absent du snapshot public'};
    if(t.short_code){
      const r=await client.rpc('resolve_public_tournament_short_link',{p_code:String(t.short_code).toUpperCase()});
      if(r.error||String(r.data?.tournament_id||'')!==String(t.id)||String(r.data?.public_token||'')!==token){
        return {ok:true,short:false,reason:r.error?.message||'raccourci non résolu'};
      }
    }
    return {ok:true,short:true};
  }catch(e){return {ok:false,reason:e?.message||String(e)}}
}
function statusToast(res){
  try{
    if(typeof toast!=='function')return;
    if(res.ok&&res.short!==false)toast('Tournoi créé • lien d’inscription vérifié ✅');
    else if(res.ok)toast('Tournoi créé • lien canonique sécurisé utilisé ✅');
    else toast('Tournoi créé • vérification du lien à relancer');
  }catch(_){}
}
function installCreateGuard(){
  const btn=document.getElementById('createTournament');
  if(!btn||btn.dataset.publicGuard4263==='1'||typeof btn.onclick!=='function')return;
  btn.dataset.publicGuard4263='1';
  const original=btn.onclick;
  btn.onclick=async function(ev){
    const stateBefore=appState(),before=stateBefore?.activeTour||null;
    await original.call(this,ev);
    const state=appState(),after=state?.activeTour||null;
    if(!after||String(after)===String(before))return;
    const t=(state?.tournaments||[]).find(x=>String(x.id)===String(after));
    if(!t)return;
    const res=await verifyTournament(t);
    health.set(String(t.id),res);
    statusToast(res);
    try{if(typeof renderTournaments==='function')renderTournaments()}catch(_){}
  };
}
function relabelGeneralPublicLink(){
  const input=document.getElementById('publicLink');
  if(!input)return;
  const label=[...document.querySelectorAll('label')].find(x=>String(x.textContent||'').includes('Lien public'));
  if(label)label.textContent='Lien public général — consultation uniquement (ne pas utiliser pour les inscriptions)';
}
function boot(){
  installCanonicalGenerator();
  installCreateGuard();
  relabelGeneralPublicLink();
  setTimeout(()=>{installCanonicalGenerator();installCreateGuard();relabelGeneralPublicLink();},1200);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.SWE_PUBLIC_LINK_HEALTH=health;
window.sweVerifyTournamentPublicLink=verifyTournament;
})();