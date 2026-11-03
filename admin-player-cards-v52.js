(()=>{'use strict';
const $=id=>document.getElementById(id);
let busy=false,seen=0,lastWorkspace='';
function safely(v){return String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
async function refresh(){
 let s;try{s=S}catch(_){return}
 // Administrative details are not dashboard content: keep them in Joueurs / Notes.
 const view=$('view-players');
 const oldPanel=$('sweAdminPlayerIdentity52');
 if(!view||!s?.session?.user?.id||!s?.workspace?.id||s.workspace.role!=='admin'||s.publicMode){
  oldPanel?.remove();
  return;
 }
 if(oldPanel&&oldPanel.parentElement!==view)view.append(oldPanel);
 // Avoid loading the entire private player directory on every homepage refresh.
 if(!view.classList.contains('active'))return;
 if(lastWorkspace!==String(s.workspace.id)){lastWorkspace=String(s.workspace.id);seen=0}
 if(busy||Date.now()-seen<30000)return;busy=true;
 try{
  const {data,error}=await sb.rpc('admin_player_identity_cards_v52',{p_workspace_id:s.workspace.id});
  if(error)throw error;seen=Date.now();
  let block=$('sweAdminPlayerIdentity52');
  if(!block||block.tagName!=='DETAILS'){
   const replacement=document.createElement('details');
   replacement.id='sweAdminPlayerIdentity52';
   replacement.className='card swe-admin-player-details';
   if(block)block.replaceWith(replacement);else {const listCard=$('playersList')?.closest('.card');if(listCard)listCard.before(replacement);else view.append(replacement);}
   block=replacement;
  }else if(block.parentElement!==view)view.append(block);
  const previousSearch=$('sweAdminPlayerSearch52')?.value||'';
  const wasOpen=block.open;
  const players=(Array.isArray(data)?data:[]).filter(p=>!s.playerAliases?.[String(p.player_id)]);
  block.innerHTML='<summary class="sectiontitle">👤 Fiches administratives des joueurs <span class="muted" style="font-weight:400;font-size:.8em">· ouvrir les détails</span></summary><p class="muted">Informations réservées à l’administration : identité, participations, notation et historique des désistements tardifs (moins de 24 h avant le tournoi).</p><input id="sweAdminPlayerSearch52" placeholder="Rechercher un joueur" aria-label="Rechercher un joueur"><div id="sweAdminPlayerRows52"></div>';
  block.open=wasOpen;
  const rows=$('sweAdminPlayerRows52'),search=$('sweAdminPlayerSearch52');
  search.value=previousSearch;
  const paint=()=>{
   const needle=search.value.toLocaleLowerCase('fr');
   rows.replaceChildren();
   for(const p of players.filter(p=>[p.name,p.first_name,p.last_name,p.nickname].join(' ').toLocaleLowerCase('fr').includes(needle)).slice(0,80)){
    const card=document.createElement('details');card.className='swe-admin-player-card';
    const pct=p.late_withdrawal_pct==null?'Historique insuffisant':p.late_withdrawal_pct+' % ('+p.late_withdrawals+'/'+p.eligible_registrations+')';
    const kind=p.member?'Membre du groupe':p.guest_of?'Invité de '+p.guest_of:'Joueur extérieur SWÉ';
    const summary=document.createElement('summary');summary.textContent=(p.nickname||p.name||'Joueur')+' · '+kind;card.append(summary);
    const content=document.createElement('div');const count=s.playerParticipations?.[String(p.player_id)];content.innerHTML=(Number.isFinite(count)?'<p><strong>Tournois joués :</strong> '+count+'</p>':'')+'<p><strong>Identité :</strong> '+safely([p.first_name,p.last_name].filter(Boolean).join(' ')||'Non renseignée')+'</p><p><strong>Surnom :</strong> '+safely(p.nickname||'Non renseigné')+'</p><p><strong>Date de naissance :</strong> '+safely(p.birth_date||'Non renseignée')+'</p><p><strong>Niveau déclaré :</strong> '+safely(p.skill_level||'Non renseigné')+'</p><p><strong>Désistements de dernière minute :</strong> '+safely(pct)+'</p>';
    if(p.avatar_url){const img=document.createElement('img');img.src=p.avatar_url;img.alt='Photo de '+(p.nickname||p.name);img.width=64;img.height=64;img.style.borderRadius='50%';content.prepend(img)}
    card.append(content);rows.append(card);
   }
  };
  search.oninput=paint;paint();
  // Keep the last withdrawal alerts in the protected admin directory, not on the homepage.
  const {data:lateAlerts,error:lateError}=await sb.from('community_swe_organizer_alerts_v1')
    .select('id,player_name,minutes_before_start').order('id',{ascending:false}).limit(5);
  if(!lateError&&Array.isArray(lateAlerts)&&lateAlerts.length){
    const recent=document.createElement('section');recent.id='sweAdminRecentWithdrawals52';
    const title=document.createElement('h3');title.textContent='🚨 Désistements récents';recent.append(title);
    for(const item of lateAlerts){
      const line=document.createElement('p');line.textContent=String(item.player_name||'Joueur')+
        (item.minutes_before_start===null?'':' · '+String(item.minutes_before_start)+' min avant le début');
      recent.append(line);
    }
    search.before(recent);
  }
 }catch(e){console.warn('Admin player identities',e)}finally{busy=false}
}
document.addEventListener('swe:rendered',refresh);document.addEventListener('swe:page-view',refresh);window.addEventListener('pageshow',()=>{seen=0;refresh()});setInterval(()=>{if(document.visibilityState==='visible')refresh()},30000);
})();