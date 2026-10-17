(()=>{'use strict';let loading=false,when=0,workspace='';
const E=id=>document.getElementById(id);
const fmt=n=>(Number(n||0)/100).toLocaleString('fr-FR',{style:'currency',currency:'EUR'});
async function load(force=false){
 let s;try{s=S}catch(_){return}const root=E('view-cooler');
 if(!root||s?.workspace?.role!=='admin'||!s?.workspace?.id||s.publicMode)return;
 if(loading||(!force&&when>Date.now()-20000&&workspace===s.workspace.id))return;
 loading=true;
 try{
  const {data,error}=await sb.rpc('admin_revolut_glaciere_tournaments_v1',{p_workspace_id:s.workspace.id});
  if(error)throw error;when=Date.now();workspace=s.workspace.id;
  const items=Array.isArray(data)?data:[];
  let box=E('sweRevolutReconcile52');if(!box){box=document.createElement('section');box.id='sweRevolutReconcile52';box.className='card';root.append(box)}
  box.hidden=!items.length;if(!items.length)return;
  box.innerHTML='<h2>💶 Glacière — vérifier les paiements Revolut</h2><p>Le lien Revolut personnel ne confirme pas automatiquement les transactions dans SWÉ. Vérifie d’abord le paiement dans Revolut, puis associe-le au joueur ici.</p><label>Tournoi <select id="sweRevolutTournament52"></select></label><div id="sweRevolutPlayers52" role="status"></div>';
  const select=E('sweRevolutTournament52');
  items.forEach(item=>{const option=document.createElement('option');option.value=item.id;option.textContent=item.name+' · '+item.date;select.append(option)});
  const wanted=items.find(x=>x.date>='2026-10-18');if(wanted)select.value=wanted.id;
  const refresh=async()=>{
   const area=E('sweRevolutPlayers52');area.textContent='Chargement…';
   const {data:result,error:err}=await sb.rpc('admin_revolut_glaciere_review_v1',{p_tournament_id:select.value});
   if(err){area.textContent=err.message;return}
   const players=result?.players||[];area.replaceChildren();
   const label=document.createElement('p');label.textContent='Choisis le joueur dont tu as vérifié le virement. Les paiements confirmés figurent ci-dessous.';area.append(label);
   const form=document.createElement('form');form.className='swe-revolut-form';
   const player=document.createElement('select');player.required=true;
   players.forEach(p=>{const opt=document.createElement('option');opt.value=p.player_id;opt.textContent=p.player_name+(p.confirmed_cents!=null?' — confirmé '+fmt(p.confirmed_cents):'');player.append(opt)});
   const amount=document.createElement('input');amount.type='number';amount.min='0.50';amount.max='500';amount.step='0.01';amount.value='3.00';amount.required=true;amount.setAttribute('aria-label','Montant reçu en euros');
   const reference=document.createElement('input');reference.type='text';reference.maxLength=140;reference.required=true;reference.placeholder='Référence ou date et libellé Revolut';reference.setAttribute('aria-label','Référence de transaction vérifiée');
   const button=document.createElement('button');button.type='submit';button.className='primary';button.textContent='Confirmer le paiement vérifié';
   const status=document.createElement('p');status.setAttribute('role','status');
   for(const [text,input] of [['Joueur',player],['Montant (€)',amount],['Référence Revolut',reference]]){const l=document.createElement('label');l.textContent=text;l.append(input);form.append(l)}
   form.append(button,status);area.append(form);
   form.onsubmit=async ev=>{ev.preventDefault();if(!confirm('As-tu vérifié ce paiement sur ton compte Revolut ?'))return;button.disabled=true;const cents=Math.round(Number(amount.value)*100);const {error:e}=await sb.rpc('admin_confirm_revolut_glaciere_v1',{p_tournament_id:select.value,p_player_id:player.value,p_amount_cents:cents,p_reference:reference.value.trim()});if(e){status.textContent=e.message;button.disabled=false;return}await refresh()};
   for(const p of players.filter(p=>p.confirmed_cents!=null)){const row=document.createElement('p');row.textContent='✓ '+p.player_name+' : '+fmt(p.confirmed_cents)+' vérifiés';area.append(row)}
  };
  select.onchange=refresh;await refresh();
 }catch(e){console.warn('Revolut cooler admin',e)}finally{loading=false}
}
document.addEventListener('swe:rendered',()=>load());window.addEventListener('pageshow',()=>load(true));setInterval(()=>{if(document.visibilityState==='visible')load()},30000);
})();