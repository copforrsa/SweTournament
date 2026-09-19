(()=>{
'use strict';
if(window.__SWE_TEST_TOURNAMENT_PANEL_5009)return;
window.__SWE_TEST_TOURNAMENT_PANEL_5009=true;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isTest=t=>/^TEST SWÉ\s*—/i.test(String(t?.name||''));
const registrationUrl=t=>{
  try{if(typeof registrationLink==='function')return registrationLink(t)||''}catch(_){}
  if(!t?.short_code)return '';
  const u=new URL('./',location.href);u.searchParams.set('s',String(t.short_code).toUpperCase());return u.toString();
};
const copy=async value=>{
  try{await navigator.clipboard.writeText(value);return true}catch(_){
    const input=document.createElement('textarea');input.value=value;input.setAttribute('readonly','');input.style.cssText='position:fixed;opacity:0';document.body.appendChild(input);input.select();
    let ok=false;try{ok=document.execCommand('copy')}catch(__){}input.remove();return ok;
  }
};
const labelDate=date=>{try{return new Date(date+'T12:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'})}catch(_){return date||''}};
let key='';
function render(){
  if(typeof S==='undefined'||!S?.workspace||!Array.isArray(S.tournaments))return;
  const view=document.getElementById('view-tournaments'),list=document.getElementById('tournamentList');
  if(!view||!list)return;
  const current=S.tournaments.filter(t=>t?.format!=='league'&&t?.status!=='finished');
  const test=current.find(isTest);
  const real=current.filter(t=>!isTest(t)&&t.season_id).sort((a,b)=>String(a.tournament_date).localeCompare(String(b.tournament_date)))[0]||null;
  if(!real&&!test)return;
  const nextKey=[real?.id,real?.short_code,test?.id,test?.short_code,S.isSuperAdmin].join('|');
  let panel=document.getElementById('sweTestTournamentPanel5009');
  if(panel&&key===nextKey)return;
  if(!panel){
    panel=document.createElement('section');panel.id='sweTestTournamentPanel5009';panel.className='card';
    panel.style.cssText='margin:0 0 12px;border:2px solid #8dbceb;background:linear-gradient(135deg,#f5faff,#eef8ff)';
    list.parentElement.insertAdjacentElement('beforebegin',panel);
  }
  key=nextKey;
  const item=(t,kind)=>{
    if(!t)return '<div class="player"><b>'+kind+'</b><div class="muted">Aucun tournoi disponible.</div></div>';
    const url=registrationUrl(t),testItem=isTest(t);
    return '<article class="player" style="margin-top:10px;border-left:5px solid '+(testItem?'#d68a00':'#1b7f4d')+'">'+
      '<div class="row" style="justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap"><div style="min-width:230px;flex:1"><div class="sa-eyebrow">'+(testItem?'ENVIRONNEMENT DE TEST':'TOURNOI RÉEL')+'</div><b style="font-size:17px">'+esc(t.name||'Tournoi SWÉ')+'</b><div class="muted" style="margin-top:3px">📅 '+esc(labelDate(t.tournament_date))+(testItem?' · Hors saison · 30 membres':' · Dans la saison')+'</div><input readonly value="'+esc(url||'Lien indisponible')+'" aria-label="Lien d’inscription '+esc(t.name||'')+'" style="margin-top:9px;width:100%;font-size:12px"></div>'+
      '<div class="row" style="gap:7px;flex-wrap:wrap"><button type="button" data-swe-test-open="'+esc(t.id)+'">Ouvrir</button><button type="button" class="primary" data-swe-test-copy="'+esc(t.id)+'" '+(!url?'disabled':'')+'>📋 Copier</button>'+(testItem&&S.isSuperAdmin?'<button type="button" class="danger" data-swe-test-delete="'+esc(t.id)+'">Supprimer le test</button>':'')+'</div></div>'+
      (testItem?'<div class="muted" style="margin-top:8px">🧪 Ce tournoi est isolé du classement de saison. Seul le super-admin peut le supprimer, avec les matchs de test associés.</div>':'')+
    '</article>';
  };
  panel.innerHTML='<div class="sa-eyebrow">LIENS D’INSCRIPTION</div><h2 class="sectiontitle" style="margin:3px 0">🔗 Tournoi réel & test</h2><p class="muted">Deux liens distincts : partage le lien réel avec le groupe et conserve le lien test pour les vérifications.</p>'+item(real,'Tournoi réel')+item(test,'Tournoi test');
  panel.dataset.realUrl=real?registrationUrl(real):'';panel.dataset.testUrl=test?registrationUrl(test):'';
}
document.addEventListener('click',async event=>{
  const open=event.target.closest?.('[data-swe-test-open]');
  if(open){
    const t=S.tournaments.find(x=>String(x.id)===String(open.dataset.sweTestOpen));if(!t)return;
    S.activeTour=t.id;await loadTournament();renderAll();toast('Tournoi sélectionné ✅');return;
  }
  const copyBtn=event.target.closest?.('[data-swe-test-copy]');
  if(copyBtn){
    const t=S.tournaments.find(x=>String(x.id)===String(copyBtn.dataset.sweTestCopy)),url=registrationUrl(t);
    if(!url)return toast('Lien indisponible.');
    toast(await copy(url)?'Lien d’inscription copié ✅':'Sélectionne le lien pour le copier.');return;
  }
  const del=event.target.closest?.('[data-swe-test-delete]');
  if(del){
    if(!S.isSuperAdmin)return;
    if(!confirm('Supprimer uniquement ce tournoi TEST et tous ses matchs de test ? Le tournoi réel ne sera pas touché.'))return;
    del.disabled=true;
    const {error}=await sb.rpc('super_admin_manage_test_tournament',{p_tournament_id:del.dataset.sweTestDelete,p_action:'delete'});
    if(error){del.disabled=false;return toast(error.message)}
    await loadAll();renderAll();toast('Tournoi test et matchs de test supprimés ✅');
  }
},true);
const tick=()=>render();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',tick,{once:true});else tick();
document.addEventListener('swe:rendered',tick);
setInterval(tick,1500);
})();