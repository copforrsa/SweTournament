/* Keep the third-half contribution summary visible when registration is closed. */
(()=>{
  'use strict';
  const url='https://fbppesfxkvledwjemwsn.supabase.co';
  const key='sb_publishable_Kl3HDD4S08YC1EB-cWJKaQ_e9gCbygp';
  const query=new URLSearchParams(location.search);
  const token=query.get('public'),tournamentId=query.get('tournament');
  if(!token||!tournamentId)return;
  const labels={cooler:'Une glacière',ice:'Des glaçons',beers_3:'3 bières',beers_6:'6 bières',beers_12:'12 bières',ti_punch:'Du ti-punch',fruits:'Des fruits',cups:'Des gobelets',soft_drinks:'Des boissons sans alcool',snacks:'Des amuse-gueules',other:'Un autre apport'};
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const money=value=>(Math.max(0,Number(value)||0)/100).toLocaleString('fr-FR',{style:'currency',currency:'EUR'});
  let client=null,lastKey='';

  function render(data){
    const card=document.getElementById('publicThirdHalfDonorCard');
    const host=document.getElementById('publicCoolerDonors');
    if(!card||!host)return false;
    const contributions=Array.isArray(data?.contributions)?data.contributions:[];
    const pool=Math.max(0,Number(data?.money_pool_cents)||0);
    const material=contributions.filter(item=>item.contribution_mode==='supplies').length;
    const signature=[pool,contributions.map(item=>[item.player_id,item.contribution_mode,item.contribution_amount_cents,item.contribution_item].join(':')).join('|')].join('~');
    if(signature===lastKey)return true;
    lastKey=signature;
    const row=item=>'<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 0;border-top:1px solid #e4edf4"><span><b>'+esc(item.player_name||'Joueur')+'</b></span><strong style="color:#0f766e">'+(item.contribution_mode==='money'?'💶 '+money(item.contribution_amount_cents):'🎒 '+esc(labels[item.contribution_item]||'Apport matériel'))+'</strong></div>';
    const preview=contributions.slice(0,4).map(row).join('');
    const more=contributions.length>4?'<details style="margin-top:4px"><summary style="cursor:pointer;font-weight:700">Voir les '+(contributions.length-4)+' autres participations</summary><div style="margin-top:6px">'+contributions.slice(4).map(row).join('')+'</div></details>':'';
    const intro=card.querySelector('p.muted'); if(intro)intro.remove();
    host.innerHTML='<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:12px 0"><div style="padding:12px;border-radius:12px;background:#ecfdf5"><small style="display:block;color:#41736a;font-weight:700">CAGNOTTE ANNONCÉE</small><b style="font-size:1.25rem;color:#065f46">'+money(pool)+'</b><small style="display:block;color:#41736a">'+Number(data?.money_donor_count||0)+' participation'+(Number(data?.money_donor_count||0)>1?'s':'')+' financière'+(Number(data?.money_donor_count||0)>1?'s':'')+'</small></div><div style="padding:12px;border-radius:12px;background:#eff6ff"><small style="display:block;color:#486581;font-weight:700">APPORTS MATÉRIELS</small><b style="font-size:1.25rem;color:#1d4ed8">'+material+'</b><small style="display:block;color:#486581">déjà prévus par le groupe</small></div></div>'+(contributions.length?'<div><b>Ce que le groupe apporte</b>'+preview+more+'</div>':'<p class="muted">Aucune participation n’a encore été annoncée.</p>');
    return true;
  }

  async function load(){
    if(!document.getElementById('publicThirdHalfDonorCard')||!window.supabase?.createClient)return;
    client=client||window.supabase.createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
    const result=await client.rpc('get_public_third_half_contributions_v1',{p_token:token,p_tournament_id:tournamentId});
    if(!result.error)render(result.data||{});
  }
  // The main application builds the card asynchronously.  These one-off
  // retries catch that render without using an observer or a polling loop.
  [250,900,2200,4500].forEach(delay=>setTimeout(load,delay));
  document.addEventListener('swe:rendered',()=>setTimeout(load,80));
})();
