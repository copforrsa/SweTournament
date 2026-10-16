/* A player's guest is rated by their authenticated host only.
   Server verifies host identity on every list and write. */
(()=>{
 'use strict';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
 let pending=false;
 async function mount(){
  if(pending||typeof sb==='undefined')return;
  if(document.activeElement?.closest?.('#sweGuestRating'))return;
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
   let panel=document.getElementById('sweGuestRating');
   if(!items.length){panel?.remove();return}
   if(!panel){panel=document.createElement('section');panel.id='sweGuestRating';panel.className='card';target===publicForm?publicForm.append(panel):home.prepend(panel)}
   panel.innerHTML='<h3>⚽ Niveau provisoire de mes invités</h3><p>Tu es le seul à pouvoir renseigner leur estimation avant le tirage. Elle sert à équilibrer les équipes.</p><div class="swe-guest-items"></div>';
   const list=panel.querySelector('.swe-guest-items');
   items.forEach(item=>{
    const form=document.createElement('form');form.className='swe-guest-rating-item';
    form.innerHTML='<strong>'+esc(item.guest_name)+'</strong><small>'+esc(item.tournament_name)+'</small><label>Note estimée sur 10 <select name="rating" required>'+Array.from({length:19},(_,i)=>{const val=(i+2)/2;return '<option value="'+val+'"'+(Number(item.rating)===val?' selected':'')+'>'+val+'/10</option>'}).join('')+'</select></label><label>Appréciation (facultative)<textarea name="comment" maxlength="300" placeholder="Technique, rapidité, expérience…">'+esc(item.comment||'')+'</textarea></label><button type="submit">Enregistrer mon estimation</button><span class="swe-guest-feedback" aria-live="polite"></span>';
    form.onsubmit=async e=>{
     e.preventDefault();const btn=form.querySelector('button');btn.disabled=true;
     const feedback=form.querySelector('.swe-guest-feedback');feedback.textContent='Enregistrement…';
     const {error}=await sb.rpc('rate_my_guest_v1',{p_tournament_id:item.tournament_id,p_guest_id:item.guest_player_id,p_rating:Number(form.elements.rating.value),p_comment:form.elements.comment.value});
     feedback.textContent=error?'Erreur : '+error.message:'✓ Note provisoire enregistrée';
     btn.disabled=false;
    };
    list.append(form);
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
