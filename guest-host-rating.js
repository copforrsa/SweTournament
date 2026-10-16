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
  const home=document.getElementById('view-home');
  const target=publicForm && getComputedStyle(publicForm).display!=='none' ? publicForm : home;
  if(!target)return;
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
   if(!inline && !home)return;
   let panel=null,list=null;
   if(!inline){
     panel=document.createElement('section');panel.id='sweGuestRating';panel.className='card';
     panel.innerHTML='<h3>⚽ Niveau provisoire de mes invités</h3><p>Estime leur niveau avant le tirage.</p><div class="swe-guest-items"></div>';
     home.prepend(panel);list=panel.querySelector('.swe-guest-items');
   }
   items.forEach(item=>{
    const form=document.createElement('form');form.className='swe-guest-rating-item';
    form.dataset.guestId=item.guest_player_id;
    const options=['À préciser','Débutant','En progression','Intermédiaire','Bon niveau','Très bon niveau','Excellent niveau'];
    const comment=options.includes(item.comment)?item.comment:'À préciser';
    form.innerHTML='<label>Note de départ sur 10 <select name="rating" required><option value="" '+(item.rating==null?'selected':'')+' disabled>Choisir une note</option>'+Array.from({length:19},(_,i)=>{const val=(i+2)/2;return '<option value="'+val+'"'+(Number(item.rating)===val?' selected':'')+'>'+val+'/10</option>'}).join('')+'</select></label><label>Appréciation <select name="comment">'+options.map(v=>'<option value="'+esc(v)+'"'+(v===comment?' selected':'')+'>'+esc(v)+'</option>').join('')+'</select></label><button type="submit">Enregistrer la note</button><span class="swe-guest-feedback" aria-live="polite"></span>';
    form.onsubmit=async e=>{
     e.preventDefault();const btn=form.querySelector('button');btn.disabled=true;
     const feedback=form.querySelector('.swe-guest-feedback');feedback.textContent='Enregistrement…';
     const {error}=await sb.rpc('rate_my_guest_v1',{p_tournament_id:item.tournament_id,p_guest_id:item.guest_player_id,p_rating:Number(form.elements.rating.value),p_comment:form.elements.comment.value});
     feedback.textContent=error?'Erreur : '+error.message:'✓ Note provisoire enregistrée';
     btn.disabled=false;
    };
    if(inline){const rows=[...own.querySelectorAll('[data-swe-guest-player-id]')];const row=rows.find(el=>el.dataset.sweGuestPlayerId===String(item.guest_player_id));if(row){const slot=document.createElement('div');slot.className='swe-guest-inline';slot.append(form);row.append(slot)}}else{const heading=document.createElement('strong');heading.textContent=item.guest_name+' — '+item.tournament_name;form.prepend(heading);list.append(form)}
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
