/* A player's guest is rated by their authenticated host only.
   Server verifies host identity on every list and write. */
(()=>{
 'use strict';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
 let pending=false;
 async function mount(){
  if(pending||typeof sb==='undefined')return;
  if(document.activeElement?.closest?.('.swe-guest-rating-item'))return;
  const publicForm=document.getElementById('publicGuestFields');
  document.getElementById('sweGuestRating')?.remove();
  if(!publicForm || getComputedStyle(publicForm).display==='none')return;
  pending=true;
  try{
   const {data:session}=await sb.auth.getSession();
   if(!session?.session){document.getElementById('sweGuestRating')?.remove();return}
   const {data,error}=await sb.rpc('my_guest_rating_requests_v1');
   if(error)throw error;
   const items=Array.isArray(data)?data:[];
   const own=document.getElementById('publicOwnGuests');
   const inline=Boolean(own&&publicForm&&getComputedStyle(publicForm).display!=='none');
   document.getElementById('sweGuestRating')?.remove();
   if(!inline)return;
   items.forEach(item=>{
    const form=document.createElement('form');form.className='swe-guest-rating-item';
    form.dataset.guestId=item.guest_player_id;
    const options=['À préciser','Débutant','En progression','Intermédiaire','Bon niveau','Très bon niveau','Excellent niveau'];
    const comment=options.includes(item.comment)?item.comment:'À préciser';
    form.innerHTML='<label>Évaluation définitive sur 10 <select name="rating" required><option value="" '+(item.rating==null?'selected':'')+' disabled>Choisir une note</option>'+Array.from({length:19},(_,i)=>{const val=(i+2)/2;return '<option value="'+val+'"'+(Number(item.rating)===val?' selected':'')+'>'+val+'/10</option>'}).join('')+'</select></label><label>Appréciation <select name="comment">'+options.map(v=>'<option value="'+esc(v)+'"'+(v===comment?' selected':'')+'>'+esc(v)+'</option>').join('')+'</select></label><button type="submit">Enregistrer la note</button><span class="swe-guest-feedback" aria-live="polite"></span>';
    if(item.rating!=null){
      form.querySelectorAll('select').forEach(el=>el.disabled=true);
      form.querySelector('button').remove();
      const state=document.createElement('strong');state.className='swe-guest-locked';state.textContent='✓ Évaluation définitive — modification réservée au super-administrateur';form.append(state);
    }
    form.onsubmit=async e=>{
     e.preventDefault();const btn=form.querySelector('button');btn.disabled=true;
     const feedback=form.querySelector('.swe-guest-feedback');feedback.textContent='Enregistrement…';
     const {error}=await sb.rpc('rate_my_guest_v1',{p_tournament_id:item.tournament_id,p_guest_id:item.guest_player_id,p_rating:Number(form.elements.rating.value),p_comment:form.elements.comment.value});
     feedback.textContent=error?'Erreur : '+error.message:'✓ Évaluation définitive enregistrée';
     if(!error){form.querySelectorAll('select').forEach(el=>el.disabled=true);btn.remove();}
     btn.disabled=false;
    };
    if(inline){const rows=[...own.querySelectorAll('[data-swe-guest-player-id]')];const row=rows.find(el=>el.dataset.sweGuestPlayerId===String(item.guest_player_id));if(row){row.querySelector('.swe-guest-inline')?.remove();const slot=document.createElement('div');slot.className='swe-guest-inline';slot.append(form);row.append(slot)}}
   });
  }catch(e){console.warn('Guest assessment unavailable',e)}finally{pending=false}
 }
 document.addEventListener('DOMContentLoaded',mount);
 document.addEventListener('swe:guest-added',mount);
 document.addEventListener('change',event=>{if(event.target?.id==='publicPlayerSelect')mount()});
 setInterval(()=>{if(document.visibilityState==='visible'&&document.getElementById('publicGuestFields'))mount()},15000);
 document.addEventListener('swe:rendered',()=>{mount()});
 window.addEventListener('pageshow',mount);
})();
