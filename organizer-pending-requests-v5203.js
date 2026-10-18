/* Requests visible on organizer home; existing server RPCs enforce workspace admin rights. */
(()=>{
'use strict';
let pending=false,stamp=0;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
async function render(force=false){
 let s;try{s=S}catch(_){return}
 const root=document.getElementById('view-home');
 if(!root||!s?.session||!s?.workspace?.id||s.workspace.role!=='admin'||s.publicMode){document.getElementById('sweOrganizerRequests')?.remove();return}
 if(pending||(!force&&Date.now()-stamp<12000))return;
 pending=true;
 try{
  const {data,error}=await sb.rpc('list_workspace_player_requests',{p_workspace_id:s.workspace.id});
  if(error)throw error;
  stamp=Date.now();
  const rows=(Array.isArray(data)?data:[]).filter(x=>x.status==='pending');
  let box=document.getElementById('sweOrganizerRequests');
  if(!box){box=document.createElement('section');box.id='sweOrganizerRequests';box.className='card';root.prepend(box)}
  box.replaceChildren();
  const title=document.createElement('h2');title.className='sectiontitle';title.textContent='🙋 Demandes de participation à valider ('+rows.length+')';box.append(title);
  const intro=document.createElement('p');intro.textContent='Joueurs SWÉ extérieurs au groupe. Une acceptation crée leur inscription au tournoi, sous réserve des règles de places et de paiement.';box.append(intro);
  if(!rows.length){const empty=document.createElement('p');empty.className='muted';empty.textContent='Aucune demande en attente.';box.append(empty);return}
  for(const r of rows){
    const item=document.createElement('article');item.className='swe-organizer-request';
    const top=document.createElement('div');top.className='swe-request-top';
    const avatar=document.createElement('div');avatar.className='swe-request-avatar';avatar.textContent=String(r.display_name||'J').trim().charAt(0).toUpperCase();
    const content=document.createElement('div');content.className='swe-request-main';
    const headline=document.createElement('div');headline.className='swe-request-headline';
    const heading=document.createElement('h3');heading.textContent=r.display_name||'Joueur';
    const role=document.createElement('span');role.className='swe-request-role';role.textContent='Joueur extérieur';headline.append(heading,role);
    const details=document.createElement('div');details.className='swe-request-meta';
    const tour=document.createElement('p');tour.className='swe-request-tournament';tour.textContent=r.tournament_name||'Tournoi SWÉ';
    if(r.tournament_date){const d=document.createElement('span');d.className='swe-request-chip';d.textContent='📅 '+new Date(String(r.tournament_date)+'T12:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'});details.append(d)}
    if(r.start_time){const time=document.createElement('span');time.className='swe-request-chip';time.textContent='⏰ '+String(r.start_time).slice(0,5);details.append(time)}
    content.append(headline,tour,details);top.append(avatar,content);
    const message=document.createElement('div');message.className='swe-request-message';
    const messageTitle=document.createElement('strong');messageTitle.textContent='MESSAGE DU JOUEUR';
    const messageBody=document.createElement('p');messageBody.textContent=r.message||'Aucun message du joueur';message.append(messageTitle,messageBody);
    const action=document.createElement('div');action.className='swe-organizer-request-actions';
    const feedback=document.createElement('span');feedback.setAttribute('role','status');
    for(const [accept,label] of [[true,'✅ Accepter'],[false,'Refuser']]){
      const btn=document.createElement('button');btn.type='button';btn.textContent=label;if(accept)btn.className='primary';
      btn.onclick=async()=>{if(!confirm((accept?'Accepter':'Refuser')+' la demande de '+r.display_name+' ?'))return;
       action.querySelectorAll('button').forEach(b=>b.disabled=true);
       const {data:result,error}=await sb.rpc('respond_global_player_participation_request',{p_request_id:r.request_id,p_accept:accept});
       if(error){feedback.textContent=error.message;action.querySelectorAll('button').forEach(b=>b.disabled=false);return}
       feedback.textContent=accept?(result?.payment_required?'Acceptée — paiement du joueur en attente':'Demande acceptée — inscription créée'):'Demande refusée';
       stamp=0;item.remove();
      };action.append(btn);
    }
    action.append(feedback);item.append(heading,details,message,action);box.append(item);
  }
 }catch(e){console.warn('Organizer pending SWÉ requests',e)}
 finally{pending=false}
}
document.addEventListener('DOMContentLoaded',()=>render(true));
document.addEventListener('swe:rendered',()=>render());
document.addEventListener('swe:page-view',()=>render());
window.addEventListener('pageshow',()=>render(true));
setInterval(()=>{if(document.visibilityState==='visible')render()},16000);
})();
