(()=>{
'use strict';
if(window.__SWE_TOURNAMENT_CREATION_FLOW_5048)return;
window.__SWE_TOURNAMENT_CREATION_FLOW_5048=true;
const E=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
let step=0;

function canManage(){
  try{return !!S?.session&&(S.isSuperAdmin===true||(typeof isAdmin==='function'&&isAdmin())||(typeof hasTemporaryAdmin==='function'&&hasTemporaryAdmin())||(typeof isCoorg==='function'&&isCoorg()&&!!S.myPermissions?.can_create_tournaments));}
  catch(_){return false;}
}
function title(text,copy){
  const node=document.createElement('div');
  node.className='sweflow-title';
  node.innerHTML='<h3>'+text+'</h3><p>'+copy+'</p>';
  return node;
}
function field(label,input){
  const node=document.createElement('label');
  node.className='sweflow-field';
  const name=document.createElement('span');
  name.textContent=label;
  node.append(name,input);
  return node;
}
function section(number,label){
  const node=document.createElement('section');
  node.className='sweflow-section';
  node.dataset.step=String(number);
  node.setAttribute('aria-label',label);
  return node;
}
function insertStyle(){
  if(E('sweTournamentCreationFlowCss'))return;
  const style=document.createElement('style');
  style.id='sweTournamentCreationFlowCss';
  style.textContent=`
  #tournamentAdminCard.sweflow-card{padding:0;overflow:hidden;border:1px solid #d5e4f2;background:#fff;box-shadow:0 17px 42px rgba(16,57,99,.12)}
  .sweflow-hero{position:relative;overflow:hidden;padding:24px 26px 20px;background:linear-gradient(118deg,#092146 0%,#123f7d 53%,#0ab5cb 100%);color:#fff}.sweflow-hero:after{content:'';position:absolute;inset:0;background:repeating-linear-gradient(116deg,transparent 0 20px,rgba(255,255,255,.035) 20px 21px);pointer-events:none}.sweflow-hero>*{position:relative;z-index:1}.sweflow-hero .tour-create-hero{margin:0;padding:0;background:transparent;border:0;color:#fff}.sweflow-hero .tour-create-icon{background:radial-gradient(circle at 35% 30%,#fff,#f8d767 19%,#132e5d 21%,#091d3d 62%);box-shadow:0 0 0 8px rgba(255,255,255,.13);font-size:31px}.sweflow-hero .tour-create-copy h2{color:#fff;font-size:28px;margin-top:4px}.sweflow-hero .tour-create-copy p{color:#dcecff;max-width:620px}.sweflow-hero .tour-create-eyebrow{color:#f9d56b}.sweflow-hero .tour-create-guide{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin:18px 0 0;background:transparent}.sweflow-hero .tour-create-guide>div{padding:10px;border:1px solid rgba(255,255,255,.18);border-radius:12px;background:rgba(1,23,56,.18)}.sweflow-hero .tour-create-guide b{color:#fff}.sweflow-hero .tour-create-guide small{color:#d8ebff}
  .sweflow-steps{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));background:#f8fbfe;border-bottom:1px solid #dce8f2}.sweflow-step{appearance:none;border:0;border-right:1px solid #e1ebf3;background:transparent;padding:13px 10px;text-align:left;display:flex;align-items:center;gap:8px;color:#6a829b;font:inherit;font-size:12px;font-weight:800}.sweflow-step:last-child{border-right:0}.sweflow-step i{font-style:normal;width:24px;height:24px;display:grid;place-items:center;border-radius:50%;background:#e5edf5;color:#5d7893;font-size:11px}.sweflow-step.active{background:#edf7ff;color:#1165ba}.sweflow-step.active i{color:#fff;background:#1878dd}.sweflow-step.done{color:#158052}.sweflow-step.done i{background:#e2f6e9;color:#158052}
  .sweflow-body{padding:23px 26px 25px}.sweflow-section{display:none}.sweflow-section.active{display:block}.sweflow-title h3{font-size:20px;color:#112f54;margin:0}.sweflow-title p{margin:6px 0 19px;color:#69839e;font-size:13px;line-height:1.45}.sweflow-field{display:grid;gap:6px;margin-bottom:12px}.sweflow-field>span{color:#385b7c;font-size:12px;font-weight:850}.sweflow-field input{width:100%}.sweflow-section>.grid,.sweflow-section>.player{margin-top:12px}.sweflow-section .player{border-radius:14px}.sweflow-section #tourTeamCompositionMode{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.sweflow-section #tourTeamCompositionMode>label{border:1px solid #d6e4f0;border-radius:13px;padding:12px;background:#fbfdff;align-items:flex-start}.sweflow-section #tourTeamCompositionMode>label:has(input:checked){border:2px solid #1a7bdd;background:#eff8ff}
  .sweflow-services{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:16px 0}.sweflow-service{padding:12px;border:1px solid #d8e6f1;border-radius:13px;background:linear-gradient(135deg,#fbfdff,#f0f8ff)}.sweflow-service b{display:block;color:#1d466e;font-size:13px}.sweflow-service span{display:block;color:#748da5;font-size:11px;line-height:1.4;margin-top:4px}.sweflow-service i{font-style:normal;font-size:18px}
  .sweflow-summary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}.sweflow-summary>div{border:1px solid #dce7f1;border-radius:13px;padding:13px;background:#fbfdff}.sweflow-summary b{display:block;color:#1d456c;font-size:12px}.sweflow-summary span{display:block;color:#6d879f;font-size:12px;line-height:1.55;margin-top:5px}.sweflow-note{margin-top:14px;padding:12px;border-radius:12px;border:1px solid #f0d698;background:#fff8e8;color:#755310;font-size:12px;line-height:1.45}
  .sweflow-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;border-top:1px solid #e3edf5;margin-top:22px;padding-top:18px}.sweflow-footer button{min-height:42px}.sweflow-footer .sweflow-next{background:linear-gradient(135deg,#1676da,#0ebbd0);color:#fff;border:0;box-shadow:0 8px 18px rgba(19,116,213,.24)}.sweflow-footer .sweflow-create{background:linear-gradient(135deg,#11995f,#12b76b)}.sweflow-progress{font-size:12px;color:#66819b;font-weight:800}
  #sweTournamentSwitcher5048{margin:0 0 15px;padding:14px 16px;border:1px solid #d7e6f3;border-radius:16px;background:linear-gradient(135deg,#f9fcff,#edf7ff)}.sweflow-switch-head{display:flex;justify-content:space-between;gap:12px;align-items:center}.sweflow-switch-head b{color:#163d65}.sweflow-switch-head span{font-size:12px;color:#6c869f}.sweflow-switch-list{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.sweflow-tour{border:1px solid #cbddea;background:#fff;border-radius:10px;padding:8px 10px;color:#315876;font:inherit;font-size:12px;font-weight:800}.sweflow-tour.active{background:#103d76;color:#fff;border-color:#103d76}.sweflow-tour small{display:block;font-weight:600;opacity:.8;margin-top:2px}
  @media(max-width:720px){.sweflow-hero{padding:19px 17px}.sweflow-hero .tour-create-guide{grid-template-columns:1fr}.sweflow-steps{overflow-x:auto;grid-template-columns:repeat(5,142px)}.sweflow-body{padding:18px}.sweflow-section #tourTeamCompositionMode,.sweflow-services,.sweflow-summary{grid-template-columns:1fr}.sweflow-footer{flex-wrap:wrap}.sweflow-progress{order:3;width:100%;text-align:center}.sweflow-footer button{flex:1}}
  `;
  document.head.appendChild(style);
}
function read(id,fallback='—'){const element=E(id);return String(element?.value||fallback).trim()||fallback;}
function dateLabel(value){if(!value)return 'À définir';try{return new Date(value+'T12:00:00').toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'});}catch(_){return value;}}
function summaryMarkup(){
  const complex=E('tourComplex'),format=E('tourFormat'),pitches=[...document.querySelectorAll('.tourPitchCheck:checked')].map(x=>x.parentElement?.textContent?.trim()).filter(Boolean);
  const mode=document.querySelector('#tourTeamCompositionMode input:checked')?.value==='collaborative'?'Composition collégiale':'Composition par l’administrateur';
  return '<div><b>📅 Événement</b><span>'+esc(read('tourName','Nouveau SWÉ'))+'<br>'+esc(dateLabel(read('tourDate','')))+' · '+esc(read('tourStartTime','09:00'))+'</span></div>'+
    '<div><b>📍 Lieu & format</b><span>'+esc(complex?.selectedOptions?.[0]?.textContent||'Complexe à définir')+(pitches.length?'<br>'+pitches.map(esc).join(' · '):'')+'<br>'+esc(format?.selectedOptions?.[0]?.textContent||'Format à définir')+'</span></div>'+
    '<div><b>👥 Inscriptions</b><span>'+esc(read('tourMaxPlayers','35'))+' joueurs maximum<br>Clôture : '+esc(read('tourRegistrationDeadline','À définir'))+'<br>'+esc(read('tourEntryFee','0'))+' € / participant</span></div>'+
    '<div><b>⚙️ Organisation</b><span>'+esc(mode)+'<br>'+((E('tourThirdHalfActive')?.checked)?'Glacière activée':'Glacière non activée')+'<br>Tournoi créé en brouillon</span></div>';
}
function refreshSummary(){const box=E('sweflowSummary5048');if(box)box.innerHTML=summaryMarkup();}
function update(){
  const root=E('sweTournamentCreationFlow5048');if(!root)return;
  root.querySelectorAll('.sweflow-section').forEach(section=>section.classList.toggle('active',Number(section.dataset.step)===step));
  root.querySelectorAll('.sweflow-step').forEach((button,index)=>{button.classList.toggle('active',index===step);button.classList.toggle('done',index<step);});
  const previous=E('sweflowPrevious5048'),next=E('sweflowNext5048'),progress=E('sweflowProgress5048');
  if(previous)previous.style.visibility=step===0?'hidden':'visible';
  if(next){next.textContent=step===4?'Créer le tournoi en brouillon ✓':'Continuer →';next.classList.toggle('sweflow-create',step===4);}
  if(progress)progress.textContent='Étape '+(step+1)+' sur 5';
  if(step===4)refreshSummary();
}
async function switchTournament(id){
  if(!id||String(S.activeTour)===String(id))return;
  S.activeTour=id;S.teamCompetitionId=id;
  await loadTournament();
  renderAll();
  if(typeof toast==='function')toast('Tournoi sélectionné');
}
function renderSwitcher(){
  const card=E('tournamentAdminCard');if(!card||!canManage())return;
  let box=E('sweTournamentSwitcher5048');
  if(!box){box=document.createElement('section');box.id='sweTournamentSwitcher5048';card.parentElement?.insertBefore(box,card);}
  const rows=(S.tournaments||[]).filter(t=>String(t.status||'').toLowerCase()!=='finished').slice().sort((a,b)=>String(a.tournament_date||'').localeCompare(String(b.tournament_date||'')));
  box.innerHTML='<div class="sweflow-switch-head"><b>⚽ Tournois à gérer</b><span>Chaque espace garde ses propres équipes, matchs et liens.</span></div><div class="sweflow-switch-list">'+
    (rows.length?rows.map(t=>'<button type="button" class="sweflow-tour '+(String(t.id)===String(S.activeTour)?'active':'')+'" data-swe-tour="'+esc(t.id)+'">'+esc(t.name||'SWÉ du '+t.tournament_date)+'<small>'+esc(t.tournament_date||'')+' · '+(t.status==='draft'?'Brouillon':'En préparation')+'</small></button>').join(''):'<span class="muted">Aucun autre tournoi actif.</span>')+'</div>';
  box.querySelectorAll('[data-swe-tour]').forEach(button=>button.addEventListener('click',()=>switchTournament(button.dataset.sweTour)));
}
function mount(){
  const card=E('tournamentAdminCard');
  if(!card||card.dataset.sweFlowMounted==='1'||!canManage())return;
  const hero=card.querySelector('.tour-create-hero'),guide=card.querySelector('.tour-create-guide');
  const dateGrid=E('tourDate')?.closest('.grid');
  const deadline=E('tourRegistrationDeadline')?.closest('label');
  const nameInput=E('tourName');
  const venue=E('tourComplex')?.closest('.player');
  const capacity=E('tourMaxPlayers')?.closest('.grid');
  const preparation=E('tourTeamCompositionMode')?.closest('.player');
  const discovery=E('tourDiscoveryMode')?.closest('.player');
  const payment=E('tourAdminPaymentProvider')?.closest('.player');
  const thirdHalf=E('thirdHalfTournamentCreate');
  const actions=E('createTournament')?.closest('.row');
  if(!hero||!dateGrid||!deadline||!nameInput||!venue||!capacity||!preparation||!discovery||!payment||!actions)return;
  insertStyle();
  const flow=document.createElement('div');flow.id='sweTournamentCreationFlow5048';
  const heroWrap=document.createElement('div');heroWrap.className='sweflow-hero';heroWrap.append(hero,guide);
  const steps=document.createElement('div');steps.className='sweflow-steps';['Identité','Lieu & format','Inscriptions','Équipes & services','Vérifier'].forEach((label,index)=>{const button=document.createElement('button');button.type='button';button.className='sweflow-step';button.dataset.step=String(index);button.innerHTML='<i>'+String(index+1)+'</i><span>'+label+'</span>';button.addEventListener('click',()=>{step=index;update();});steps.appendChild(button);});
  const body=document.createElement('div');body.className='sweflow-body';
  const one=section(0,'Identité'),two=section(1,'Lieu et format'),three=section(2,'Inscriptions'),four=section(3,'Équipes et services'),five=section(4,'Vérifier');
  one.append(title('Donne une identité claire à ton SWÉ','Ces informations servent au tableau de bord, au lien public et aux communications de ton groupe.'),field('Nom du tournoi',nameInput),dateGrid,deadline);
  two.append(title('Choisis le lieu et le format','Sélectionne le complexe, les terrains réservés et le format de jeu. Les rôles Roi du terrain restent configurables.'),venue);
  three.append(title('Organise les inscriptions','Prépare la capacité, les règles d’accès, la visibilité et les paiements éventuels.'),capacity,discovery,payment);
  const services=document.createElement('div');services.className='sweflow-services';services.innerHTML='<div class="sweflow-service"><i>🔗</i><b>Lien d’inscription</b><span>Créé dès le brouillon, prêt à partager par WhatsApp ou lien court.</span></div><div class="sweflow-service"><i>🧊</i><b>Glacière / 3e mi-temps</b><span>Active le volet et définis les responsables de l’organisation.</span></div><div class="sweflow-service"><i>📊</i><b>Rapports du tournoi</b><span>Résultats, équipes, buteurs, notes et archive accessibles après le SWÉ.</span></div>';
  four.append(title('Prépare les équipes et les services','Le choix de composition, la Glacière et les services du tournoi restent disponibles au bon moment.'),preparation,thirdHalf,services);
  const summary=document.createElement('div');summary.id='sweflowSummary5048';summary.className='sweflow-summary';five.append(title('Vérifie avant de créer','Le tournoi est créé en brouillon : tu pourras ensuite ouvrir les inscriptions, partager le lien et préparer les équipes.'),summary);const note=document.createElement('div');note.className='sweflow-note';note.textContent='Après la création : lien d’inscription, partage WhatsApp, Glacière, salon de composition, matchs, rapports et archives sont rattachés à ce tournoi précis.';five.appendChild(note,actions);
  const footer=document.createElement('div');footer.className='sweflow-footer';const previous=document.createElement('button');previous.type='button';previous.id='sweflowPrevious5048';previous.textContent='← Retour';previous.addEventListener('click',()=>{if(step>0){step--;update();}});const progress=document.createElement('span');progress.id='sweflowProgress5048';progress.className='sweflow-progress';const next=document.createElement('button');next.type='button';next.id='sweflowNext5048';next.className='primary sweflow-next';next.addEventListener('click',()=>{if(step===4){E('createTournament')?.click();return;}step++;update();});footer.append(previous,progress,next);
  body.append(one,two,three,four,five,footer);flow.append(heroWrap,steps,body);
  card.replaceChildren(flow);card.classList.add('sweflow-card');card.dataset.sweFlowMounted='1';
  card.querySelectorAll('input,select').forEach(control=>control.addEventListener('input',refreshSummary));card.querySelectorAll('input,select').forEach(control=>control.addEventListener('change',refreshSummary));
  renderSwitcher();update();
}
function schedule(){setTimeout(()=>{mount();renderSwitcher();},80);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
document.addEventListener('swe:rendered',schedule);
document.addEventListener('click',event=>{if(event.target.closest?.('[data-view="tournaments"],#newTournamentToggle'))schedule();},true);
})();