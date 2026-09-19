(()=>{
'use strict';
if(window.__SWE_TEST_TOURNAMENT_PANEL_5010)return;
window.__SWE_TEST_TOURNAMENT_PANEL_5010=true;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isTest=t=>/^TEST SWÉ\s*—/i.test(String(t?.name||''));
const formatDate=v=>{try{return new Date(v+'T12:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'})}catch(_){return v||''}};
const linksFor=t=>{
  let registration='';
  try{registration=typeof registrationLink==='function'?registrationLink(t)||'':''}catch(_){}
  if(!registration&&t?.short_code){const u=new URL('./',location.href);u.searchParams.set('s',String(t.short_code).toUpperCase());registration=u.toString();}
  const live=new URL('./live.html',location.href);if(t?.short_code)live.searchParams.set('s',String(t.short_code).toUpperCase());else if(S?.workspace?.public_token&&t?.id){live.searchParams.set('public',S.workspace.public_token);live.searchParams.set('tournament',t.id);}
  let payments='';if(t?.payment_short_code){const u=new URL('./',location.href);u.searchParams.set('pay',String(t.payment_short_code).toUpperCase());payments=u.toString();}
  return {registration,live:live.toString(),payments};
};
const config={
  registration:{label:'📝 Inscription',help:'Lien à partager aux joueurs pour rejoindre le tournoi.'},
  live:{label:'📡 Suivi Live',help:'Équipes, classement et résultats en direct.'},
  payments:{label:'💶 Suivi des paiements',help:'Lien de suivi des paiements sur place.'}
};
let mode=localStorage.getItem('swe_tournament_link_mode')||'registration',rendered='';
async function copy(v){try{await navigator.clipboard.writeText(v);return true}catch(_){const x=document.createElement('textarea');x.value=v;x.style.cssText='position:fixed;opacity:0';document.body.appendChild(x);x.select();let ok=false;try{ok=document.execCommand('copy')}catch(__){}x.remove();return ok;}}
function render(){
  if(typeof S==='undefined'||!S?.workspace||!Array.isArray(S.tournaments))return;
  const list=document.getElementById('tournamentList');if(!list)return;
  const running=S.tournaments.filter(t=>t?.format!=='league'&&t?.status!=='finished');
  const test=running.find(isTest);
  const real=running.filter(t=>!isTest(t)&&t.season_id).sort((a,b)=>String(a.tournament_date).localeCompare(String(b.tournament_date)))[0]||null;
  if(!real&&!test)return;
  const sig=[real?.id,real?.short_code,real?.payment_short_code,test?.id,test?.short_code,test?.payment_short_code,mode,S.isSuperAdmin].join('|');
  let panel=document.getElementById('sweTestTournamentPanel5009');if(panel&&rendered===sig)return;
  if(!panel){panel=document.createElement('section');panel.id='sweTestTournamentPanel5009';panel.className='card';panel.style.cssText='margin:0 0 12px;border:2px solid #8dbceb;background:linear-gradient(135deg,#f5faff,#eef8ff)';list.parentElement.insertAdjacentElement('beforebegin',panel);}
  rendered=sig;
  const item=t=>{
    if(!t)return '<div class="player muted">Aucun tournoi disponible.</div>';
    const testItem=isTest(t),url=linksFor(t)[mode]||'';
    return '<article class="player" style="margin-top:10px;border-left:5px solid '+(testItem?'#d68a00':'#1b7f4d')+'"><div class="row" style="justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap"><div style="min-width:230px;flex:1"><div class="sa-eyebrow">'+(testItem?'ENVIRONNEMENT DE TEST':'TOURNOI RÉEL')+'</div><b style="font-size:17px">'+esc(t.name||'Tournoi SWÉ')+'</b><div class="muted" style="margin-top:3px">📅 '+esc(formatDate(t.tournament_date))+(testItem?' · Hors saison · 30 membres':' · Dans la saison')+'</div><input readonly value="'+esc(url||'Lien indisponible')+'" style="margin-top:9px;width:100%;font-size:12px"></div><div class="row" style="gap:7px;flex-wrap:wrap"><a class="button" href="'+esc(url||'#')+'" '+(url?'target="_blank" rel="noopener noreferrer"':'aria-disabled="true" tabindex="-1"')+'>Ouvrir</a><button type="button" class="primary" data-swe-link-copy="'+esc(t.id)+'" '+(!url?'disabled':'')+'>📋 Copier</button>'+(testItem&&S.isSuperAdmin?'<button type="button" class="danger" data-swe-test-delete="'+esc(t.id)+'">Supprimer le test</button>':'')+'</div></div>'+(testItem?'<div class="muted" style="margin-top:8px">🧪 Isolé du classement de saison. Seul le super-admin peut supprimer ce test et ses matchs.</div>':'')+'</article>';
  };
  panel.innerHTML='<div class="sa-eyebrow">LIENS DES TOURNOIS</div><h2 class="sectiontitle" style="margin:3px 0">🔗 Tournoi réel & test</h2><p class="muted">Choisis le type de lien : le même lien apparaît pour les deux tournois afin de ne jamais les confondre.</p><label style="display:block;max-width:430px;margin:10px 0"><span class="muted">Afficher les liens</span><select id="sweTournamentLinkMode" style="margin-top:4px"><option value="registration">📝 Inscription</option><option value="live">📡 Suivi Live</option><option value="payments">💶 Suivi des paiements</option></select></label><div class="readonly-note" style="margin:8px 0"><b>'+config[mode].label+'</b> · '+config[mode].help+'</div>'+item(real)+item(test);
  const select=panel.querySelector('#sweTournamentLinkMode');select.value=mode;select.onchange=()=>{mode=select.value;localStorage.setItem('swe_tournament_link_mode',mode);rendered='';render();};
}
document.addEventListener('click',async e=>{
 const b=e.target.closest?.('[data-swe-link-copy]');if(b){const t=S.tournaments.find(x=>String(x.id)===String(b.dataset.sweLinkCopy)),url=linksFor(t)[mode]||'';if(!url)return toast('Lien indisponible pour ce tournoi.');toast(await copy(url)?'Lien copié ✅':'Sélectionne le lien pour le copier.');return;}
 const del=e.target.closest?.('[data-swe-test-delete]');if(del){if(!S.isSuperAdmin||!confirm('Supprimer uniquement le tournoi TEST et ses matchs de test ?'))return;del.disabled=true;const {error}=await sb.rpc('super_admin_manage_test_tournament',{p_tournament_id:del.dataset.sweTestDelete,p_action:'delete'});if(error){del.disabled=false;return toast(error.message)}await loadAll();renderAll();toast('Tournoi test et matchs de test supprimés ✅');}
},true);
const tick=()=>render();if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',tick,{once:true});else tick();document.addEventListener('swe:rendered',tick);setInterval(tick,1500);
})();