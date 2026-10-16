/* Super-administrator corrections to definitive guest assessments. */
(()=>{
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const options=['À préciser','Débutant','En progression','Intermédiaire','Bon niveau','Très bon niveau','Excellent niveau'];
let busy=false,loaded=false;
async function refresh(){
 const panel=document.getElementById('saGuestRatings');
 if(!panel||!window.sb||busy)return;
 busy=true;
 try{
  const {data,error}=await sb.rpc('super_admin_guest_ratings_v1');
  if(error)throw error;
  if(!Array.isArray(data)){panel.hidden=true;return}
  panel.hidden=false;
  const container=panel.querySelector('.sa-guest-list');
  const query=(panel.querySelector('.sa-guest-search')?.value||'').toLocaleLowerCase('fr');
  const items=data.filter(x=>[x.guest_name,x.host_name,x.tournament_name].join(' ').toLocaleLowerCase('fr').includes(query));
  container.replaceChildren();
  if(!items.length){container.textContent='Aucune évaluation trouvée.';return}
  items.forEach(item=>{
   const form=document.createElement('form');form.className='sa-guest-rating-card';
   form.innerHTML='<b>'+esc(item.guest_name)+'</b><small>Parrain : '+esc(item.host_name)+' · '+esc(item.tournament_name)+'</small>'+
   '<label>Note sur 10<select name="rating" required>'+Array.from({length:19},(_,i)=>{const v=(i+2)/2;return '<option value="'+v+'"'+(v===Number(item.rating)?' selected':'')+'>'+v+'/10</option>'}).join('')+'</select></label>'+
   '<label>Appréciation<select name="comment">'+options.map(o=>'<option value="'+esc(o)+'"'+(o===item.comment?' selected':'')+'>'+esc(o)+'</option>').join('')+'</select></label>'+
   '<button type="submit">Enregistrer la correction</button><span role="status" aria-live="polite"></span>';
   form.onsubmit=async event=>{
    event.preventDefault();
    if(!confirm('Corriger définitivement l’évaluation de '+item.guest_name+' ?'))return;
    const button=form.querySelector('button');button.disabled=true;
    const status=form.querySelector('[role="status"]');status.textContent='Enregistrement…';
    const {error}=await sb.rpc('rate_my_guest_v1',{p_tournament_id:item.tournament_id,p_guest_id:item.guest_player_id,p_rating:Number(form.elements.rating.value),p_comment:form.elements.comment.value});
    status.textContent=error?'Erreur : '+error.message:'✓ Correction enregistrée';
    button.disabled=false;
   };
   container.append(form);
  });
 }catch(e){panel.querySelector('.sa-guest-list').textContent='Impossible de charger les évaluations : '+e.message}
 finally{busy=false}
}
function mount(){
 const admin=document.getElementById('superAdminPanel');
 if(!admin)return;
 let panel=document.getElementById('saGuestRatings');
 if(!panel){
  panel=document.createElement('section');panel.id='saGuestRatings';panel.className='card sa-guest-ratings';panel.hidden=true;
  panel.innerHTML='<h2>⚽ Évaluations définitives des invités</h2><p>Seul le super-administrateur peut corriger une note enregistrée par un parrain.</p><input class="sa-guest-search" placeholder="Rechercher un invité, un parrain ou un tournoi" aria-label="Rechercher les évaluations"><div class="sa-guest-list"></div>';
  admin.append(panel);
  panel.querySelector('.sa-guest-search').addEventListener('input',()=>{clearTimeout(panel._searchTimer);panel._searchTimer=setTimeout(refresh,250)});
 }
 if(!admin.classList.contains('hidden')&&!loaded){loaded=true;refresh()}
 if(admin.classList.contains('hidden'))loaded=false;
}
document.addEventListener('DOMContentLoaded',mount);
document.addEventListener('swe:rendered',mount);
window.addEventListener('pageshow',mount);
setInterval(mount,3000);
})();
