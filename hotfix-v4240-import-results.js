(()=>{
'use strict';

const IMPORT_CODE='5295B17';
const params=new URLSearchParams(location.search);
if(params.get('importResults')!==IMPORT_CODE||params.get('confirm')!=='1')return;

const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function waitForAdmin(){
  for(let i=0;i<120;i++){
    if(typeof sb!=='undefined'&&typeof S!=='undefined'&&S.session&&S.workspace&&Array.isArray(S.tournaments)&&Array.isArray(S.players))return;
    await sleep(250);
  }
  throw new Error('La session administrateur ne s’est pas chargée.');
}

function findNamed(rows,name,aliases=[]){
  const wanted=[name,...aliases].map(normalize);
  return rows.find(row=>wanted.includes(normalize(row.name)));
}

async function runImport(){
  await waitForAdmin();
  if(typeof isAdmin!=='function'||!isAdmin())throw new Error('Seul l’administrateur du groupe peut lancer cet import.');

  const tournament=S.tournaments.find(t=>normalize(t.short_code)===normalize(IMPORT_CODE));
  if(!tournament||String(tournament.workspace_id)!==String(S.workspace.id))throw new Error('Tournoi 5295B17 introuvable dans cet espace.');

  const {data:teams,error:teamsError}=await sb.from('teams').select('*').eq('tournament_id',tournament.id);
  if(teamsError)throw teamsError;
  const {data:players,error:playersError}=await sb.from('players').select('id,name').eq('workspace_id',S.workspace.id);
  if(playersError)throw playersError;

  const team={
    yellow:findNamed(teams,'La Team Rocket'),
    green:findNamed(teams,'Équipe Harry MC',['Equipe Harry MC']),
    blue:findNamed(teams,'Bleus'),
    white:findNamed(teams,'Blancs'),
    red:findNamed(teams,'Rouges')
  };
  const player={
    Forssa:findNamed(players,'Forssa'), Charly:findNamed(players,'Charly'), Mendy:findNamed(players,'Mendy'),
    'Le Rich':findNamed(players,'Le Rich'), Kalvyn:findNamed(players,'Kalvyn U15',['Kalvyn']), Emrick:findNamed(players,'Emrick'),
    Davy:findNamed(players,'Davy',['Davy Guest']), Mathieu:findNamed(players,'Mathieu'), Baptiste:findNamed(players,'Baptiste'),
    Mika:findNamed(players,'Mika'), Yannick:findNamed(players,'Yannick'), Harry:findNamed(players,'Harry MC',['Harry']),
    Vincent:findNamed(players,'Vincent MC',['Vincent']), Steeve:findNamed(players,'Steeve'), Riri:findNamed(players,'Riri'),
    Manu:findNamed(players,'Manu'), Thomax:findNamed(players,'Thomax')
  };
  const missingTeams=Object.entries(team).filter(([,v])=>!v).map(([k])=>k);
  const missingPlayers=Object.entries(player).filter(([,v])=>!v).map(([k])=>k);
  if(missingTeams.length||missingPlayers.length)throw new Error('Données introuvables — équipes : '+(missingTeams.join(', ')||'aucune')+' ; joueurs : '+(missingPlayers.join(', ')||'aucun'));

  const fixtures=[
    ['blue','red',1,1,[['blue','Forssa','Charly'],['red','Mendy']]],
    ['green','white',1,1,[['green','Le Rich'],['white','Kalvyn']]],
    ['blue','white',0,2,[['white','Kalvyn'],['white','Emrick']]],
    ['green','yellow',0,1,[['yellow','Charly','Larry']]],
    ['blue','green',0,2,[['green','Davy'],['green','Mathieu']]],
    ['red','white',0,0,[]],
    ['yellow','white',2,1,[['yellow','Baptiste'],['yellow','Mika'],['white','Yannick']]],
    ['green','red',3,1,[['green','Harry'],['green','Vincent'],['green','Mathieu'],['red','Steeve']]],
    ['blue','yellow',0,2,[['yellow','Mika'],['yellow','Charly']]],
    ['green','white',1,0,[['green','Vincent']]],
    ['red','yellow',0,2,[['yellow','Charly'],['yellow','Charly']]],
    ['blue','white',1,0,[['blue','Riri']]],
    ['yellow','green',1,0,[['yellow','Manu']]],
    ['blue','yellow',1,3,[['blue','Thomax'],['yellow','Charly'],['yellow','Mika'],['yellow','Mika']]],
    ['red','green',0,2,[['green','Davy'],['green','Harry']]]
  ];
  const larry=findNamed(players,'Larry');
  if(!larry)throw new Error('Joueur Larry introuvable.');
  player.Larry=larry;

  const now=new Date().toISOString();
  const newMatches=fixtures.map((f,index)=>({
    tournament_id:tournament.id,
    home_team_id:team[f[0]].id,
    away_team_id:team[f[1]].id,
    home_score:f[2],
    away_score:f[3],
    match_order:101+index,
    status:'finished',
    finished_at:now
  }));

  let createdIds=[];
  try{
    const {data:created,error:createError}=await sb.from('matches').insert(newMatches).select('id,match_order');
    if(createError)throw createError;
    createdIds=(created||[]).map(row=>row.id);
    if(createdIds.length!==fixtures.length)throw new Error('Tous les matchs n’ont pas été créés.');
    const byOrder=new Map(created.map(row=>[Number(row.match_order),row.id]));
    const goalRows=[];
    fixtures.forEach((fixture,index)=>fixture[4].forEach(goal=>goalRows.push({
      match_id:byOrder.get(101+index),
      team_id:team[goal[0]].id,
      scorer_player_id:player[goal[1]].id,
      assister_player_id:goal[2]?player[goal[2]].id:null
    })));
    const {error:goalError}=await sb.from('goals').insert(goalRows);
    if(goalError)throw goalError;

    const {data:oldMatches,error:oldError}=await sb.from('matches').select('id').eq('tournament_id',tournament.id).lt('match_order',101);
    if(oldError)throw oldError;
    const oldIds=(oldMatches||[]).map(row=>row.id);
    if(oldIds.length){
      const {error:deleteError}=await sb.from('matches').delete().in('id',oldIds);
      if(deleteError)throw deleteError;
    }
    for(let index=0;index<fixtures.length;index++){
      const {error:orderError}=await sb.from('matches').update({match_order:index+1}).eq('id',byOrder.get(101+index));
      if(orderError)throw orderError;
    }

    sessionStorage.setItem('swe-results-import-5295B17','done');
    location.replace(APP_URL+'live.html?s='+IMPORT_CODE);
  }catch(error){
    if(createdIds.length)await sb.from('matches').delete().in('id',createdIds);
    throw error;
  }
}

runImport().catch(error=>{
  console.error('Import résultats 5295B17',error);
  const box=document.createElement('div');
  box.style.cssText='position:fixed;inset:16px;z-index:99999;margin:auto;max-width:620px;height:max-content;padding:20px;border-radius:16px;background:#fff1f1;border:2px solid #b42318;color:#67120e;font:16px/1.5 system-ui;box-shadow:0 18px 50px #0004';
  box.innerHTML='<b>Import interrompu</b><div style="margin-top:8px"></div>';
  box.lastChild.textContent=error?.message||String(error);
  document.body.appendChild(box);
});
})();
