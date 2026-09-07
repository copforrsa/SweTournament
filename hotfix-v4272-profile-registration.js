(()=>{
'use strict';
if(window.__SWE_4272_PROFILE_REG)return;
window.__SWE_4272_PROFILE_REG=true;

const ROLE_LABELS={
  defenseur:'Défenseur',metronome:'Métronome',ratisseur:'Ratisseur',finisseur:'Finisseur',
  dribbleur:'Dribbleur',frappeur:'Frappeur',top_player:'Top Player',couteau_suisse:'Couteau suisse'
};
let profileSummary=null;
let profileSummaryBusy=false;
let publicSnapshot=null;
let publicSnapshotBusy=false;

function fmtDate(v){
  if(!v)return '';
  try{return new Date(v).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}catch(_){return ''}
}
function escHtml(s){return String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));}

async function ensureProfileSummary(){
  if(profileSummaryBusy)return;
  if(typeof sb==='undefined'||typeof S==='undefined'||!S.session)return;
  profileSummaryBusy=true;
  try{
    const {data,error}=await sb.rpc('get_my_player_profile_summary_v1');
    if(!error)profileSummary=data||{};
  }catch(e){console.warn('SWÉ profil résumé',e)}finally{profileSummaryBusy=false}
}

function enhanceProfileForm(){
  const view=document.querySelector('#view-myplayer');
  if(!view)return;
  const file=view.querySelector('input[type="file"]');
  if(file){
    file.accept='image/jpeg,image/png,image/webp';
    if(!file.dataset.swe4272Help){
      file.dataset.swe4272Help='1';
      const help=document.createElement('div');
      help.className='muted';
      help.style.cssText='margin-top:6px;font-size:12px;line-height:1.45';
      help.textContent='Formats acceptés : JPG, PNG ou WebP • taille maximale : 5 Mo.';
      file.insertAdjacentElement('afterend',help);
    }
  }
  const p=(typeof S!=='undefined'&&S.playerDashboard?.profile)||null;
  if(p){
    view.querySelectorAll('button').forEach(b=>{
      const t=(b.textContent||'').trim();
      if(/Enregistrer mon profil/i.test(t)&&(p.age||p.avatar_url))b.textContent='Modifier mon profil';
    });
    const broken=view.querySelector('img[src*="supabase.co/storage/v1/object/"]');
    if(broken&&p.avatar_url&&broken.dataset.swe4272Blob!=='1'){
      broken.dataset.swe4272Blob='1';
      fetch(p.avatar_url,{cache:'no-store',credentials:'omit'}).then(r=>{if(!r.ok)throw new Error('Photo '+r.status);return r.blob()}).then(blob=>{
        if(!/^image\//i.test(blob.type||''))throw new Error('Format image invalide');
        if(broken.isConnected)broken.src=URL.createObjectURL(blob);
      }).catch(e=>{delete broken.dataset.swe4272Blob;console.warn('SWÉ avatar profil',e)});
    }
  }
}

async function enhanceProfileStats(){
  const box=document.querySelector('#myPlayerStats');
  if(!box||typeof S==='undefined'||!S.playerDashboard?.profile)return;
  if(!profileSummary)await ensureProfileSummary();
  const st=S.playerDashboard.stats||{};
  const rating=profileSummary?.rating??st.rating;
  const roleKey=profileSummary?.preferred_role||null;
  const role=roleKey?(ROLE_LABELS[roleKey]||roleKey):'—';
  const ratingTxt=rating==null?'—':Number(rating).toFixed(1)+'/5';
  const cards=[
    ['🏟️','Groupes',st.groups||0],
    ['🎮','Tournois joués',st.tournaments||0],
    ['⚽','Matchs',st.matches||0],
    ['✅','Victoires',st.wins||0],
    ['🏆','Trophées',st.trophies||0],
    ['🥅','Buts',st.goals||0],
    ['🎯','Passes',st.assists||0],
    ['⭐','Note',ratingTxt],
    ['🧩','Rôle préféré',role]
  ];
  box.innerHTML=cards.map(x=>'<div><span>'+x[0]+'</span><small>'+escHtml(x[1])+'</small><b>'+escHtml(x[2])+'</b></div>').join('');
}

function currentPublicIds(){
  const u=new URL(location.href);
  let token=u.searchParams.get('public')||'';
  let tid=u.searchParams.get('tournament')||window.__sweResolvedShortLink?.tournament||'';
  try{if(!token&&typeof S!=='undefined')token=S.publicToken||''}catch(_){ }
  return {token,tid};
}
async function ensurePublicSnapshot(){
  if(publicSnapshotBusy||publicSnapshot)return publicSnapshot;
  const {token}=currentPublicIds();
  if(!token||typeof sb==='undefined')return null;
  publicSnapshotBusy=true;
  try{
    const {data,error}=await sb.rpc('get_public_workspace_snapshot_v2',{p_token:token});
    if(!error)publicSnapshot=data||null;
  }catch(e){console.warn('SWÉ statut inscriptions',e)}finally{publicSnapshotBusy=false}
  return publicSnapshot;
}
function annotateSelectFromSnapshot(snap){
  const select=document.querySelector('#publicPlayerSelect');
  if(!select||!snap)return;
  const {tid}=currentPublicIds();
  if(!tid)return;
  const regs=(Array.isArray(snap.tournament_players)?snap.tournament_players:[]).filter(r=>String(r.tournament_id)===String(tid));
  const teams=(Array.isArray(snap.teams)?snap.teams:[]).filter(t=>String(t.tournament_id)===String(tid));
  const teamIds=new Set(teams.map(t=>String(t.id)));
  const inTeam=new Set((Array.isArray(snap.team_players)?snap.team_players:[]).filter(tp=>teamIds.has(String(tp.team_id))).map(tp=>String(tp.player_id)));
  const regMap=new Map(regs.map(r=>[String(r.player_id),r]));
  const selected=select.value;
  [...select.options].forEach(opt=>{
    if(!opt.value)return;
    const base=opt.dataset.sweBaseLabel||opt.textContent.split(' — ')[0].trim();
    opt.dataset.sweBaseLabel=base;
    const r=regMap.get(String(opt.value));
    let status='';
    if(r){
      const statusCode=String(r.registration_status||'');
      if(r.present&&statusCode!=='cancelled'&&statusCode!=='late_withdrawal'){
        if(inTeam.has(String(opt.value))) status='Inscrit le '+fmtDate(r.registered_at)+' • en équipe';
        else if(r.is_substitute||statusCode==='waitlist') status='Inscrit le '+fmtDate(r.registered_at)+' • remplaçant';
        else status='Inscrit le '+fmtDate(r.registered_at);
      }else if(r.deregistered_at||statusCode==='cancelled'||statusCode==='late_withdrawal'){
        status='Désinscrit le '+fmtDate(r.deregistered_at||r.registered_at);
      }
    }
    opt.textContent=base+(status?' — '+status:'');
  });
  select.value=selected;
}
async function enhancePublicSelect(force=false){
  if(force)publicSnapshot=null;
  const snap=await ensurePublicSnapshot();
  annotateSelectFromSnapshot(snap);
  const select=document.querySelector('#publicPlayerSelect');
  if(select&&!select.dataset.swe4272Bound){
    select.dataset.swe4272Bound='1';
    select.addEventListener('change',()=>setTimeout(()=>annotateSelectFromSnapshot(publicSnapshot),50));
  }
}

async function applyAll(){
  enhanceProfileForm();
  await enhanceProfileStats();
  await enhancePublicSelect(false);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(applyAll,250),{once:true});
else setTimeout(applyAll,100);
[600,1500,3000].forEach(ms=>setTimeout(applyAll,ms));
document.addEventListener('swe:rendered',()=>setTimeout(applyAll,80));
window.addEventListener('pageshow',()=>setTimeout(applyAll,150));
})();