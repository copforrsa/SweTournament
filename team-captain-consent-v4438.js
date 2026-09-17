/* Adds a deliberate consent choice to the existing public team builder. */
(()=>{
  'use strict';
  const URL='https://fbppesfxkvledwjemwsn.supabase.co';
  const KEY='sb_publishable_Kl3HDD4S08YC1EB-cWJKaQ_e9gCbygp';
  const $=s=>document.querySelector(s);
  const params=new URLSearchParams(location.search);
  const token=params.get('public'),tournamentId=params.get('tournament');
  if(!token||!tournamentId||!window.supabase?.createClient)return;
  const client=window.supabase.createClient(URL,KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});

  function status(text){const el=$('#publicTeamStatus');if(el)el.textContent=text;}
  function installChoices(){
    document.querySelectorAll('[data-team-mate]').forEach(mate=>{
      const id=mate.dataset.teamMate;
      const row=mate.closest('label');
      if(!row||row.querySelector('[data-team-consent]'))return;
      const consent=document.createElement('label');
      consent.style.cssText='display:block;margin:5px 0 2px 28px;font-size:.88rem;color:#31506f';
      consent.innerHTML='<input type="checkbox" data-team-consent="'+id+'" style="width:auto" disabled> ✅ Il m’a donné son accord : l’ajouter directement';
      row.after(consent);
      mate.addEventListener('change',()=>{consent.querySelector('input').disabled=!mate.checked;if(!mate.checked)consent.querySelector('input').checked=false;});
    });
  }
  function scheduleChoices(){setTimeout(installChoices,350);setTimeout(installChoices,900);}
  document.addEventListener('click',event=>{
    if(event.target.closest('#publicValidateTeamCode'))scheduleChoices();
  });

  document.addEventListener('click',async event=>{
    const button=event.target.closest('#publicCreateTeam');
    if(!button||button.dataset.consentHandled==='1')return;
    event.preventDefault();event.stopImmediatePropagation();
    const creator=$('#publicTeamCreator')?.value||'';
    const code=$('#publicTeamCode')?.value.trim()||'';
    const name=$('#publicTeamName')?.value.trim()||'';
    const color=[...document.querySelectorAll('#publicTeamColorChoices [data-team-color]')].find(x=>x.style.outline)?.dataset.teamColor||'';
    const mates=[...document.querySelectorAll('[data-team-mate]:checked')].map(x=>x.dataset.teamMate);
    const confirmed=[...document.querySelectorAll('[data-team-consent]:checked')].map(x=>x.dataset.teamConsent).filter(id=>mates.includes(id));
    const guests=[...document.querySelectorAll('[data-team-guest]')].map(x=>x.value.trim()).filter(Boolean);
    if(!code)return status('Valide d’abord ton code secret équipe.');
    if(!creator)return status('Choisis ton nom.');
    if(!name)return status('Donne un nom à ton équipe.');
    if(!color)return status('Choisis la couleur des maillots de ton équipe.');
    if(mates.length+guests.length>4)return status('Ton équipe ne peut pas dépasser 5 places, créateur compris.');
    button.disabled=true;status('Enregistrement de la composition…');
    const {error}=await client.rpc('public_create_team_with_member_code_v3',{p_token:token,p_tournament_id:tournamentId,p_player_id:creator,p_code:code,p_team_name:name,p_team_color:color,p_player_ids:mates,p_confirmed_player_ids:confirmed,p_guest_names:guests});
    button.disabled=false;
    if(error){status(error.message||'Impossible d’enregistrer l’équipe.');return;}
    status('✅ Équipe enregistrée. Les membres cochés sont confirmés ; les autres doivent répondre à la proposition.');
    button.dataset.consentHandled='1';
    setTimeout(()=>location.reload(),650);
  },true);
  scheduleChoices();
})();
