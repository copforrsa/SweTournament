const assert=require('node:assert/strict');
const test=require('node:test');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const helper=source.slice(source.indexOf('function hasGeneratedTournamentTeams'),source.indexOf('function teamReviewStatusLabel'));
const generation=source.slice(source.indexOf('async function runSmartTeamGeneration'),source.indexOf("$('#smartAutoTeams').onclick"));

function harness(teams){
  const tournament={id:'tournoi-mika',format:'king_of_pitch',generated_team_count:4,max_team_redraws:1,team_review_duration_minutes:120};
  const elements={
    '#playersPerTeam':{value:'5'},
    '#smartAutoTeams':{disabled:false,textContent:''},
    '#applyTeamRedraw':{disabled:false,textContent:''},
    '#teamBalanceInfo':{textContent:'',innerHTML:''}
  };
  const calls=[];
  const context={
    S:{activeTour:tournament.id,teamCompetitionId:null,tournaments:[tournament],tPlayers:Array.from({length:10},(_,i)=>({player_id:'p'+i,present:true,registration_status:'confirmed'})),teams:[...teams],matches:[],workspaceFeatures:{team_review_enabled:true},myPermissions:{can_generate_teams:true},teamReviewState:null},
    $:selector=>elements[selector],
    isAdmin:()=>true,isCoorg:()=>false,hasTemporaryAdmin:()=>false,
    currentTour(){return context.S.tournaments.find(t=>t.id===context.S.activeTour)},
    confirm:()=>true,esc:value=>String(value),renderAll:()=>{},setView:view=>{context.lastView=view},
    toast:message=>{context.lastToast=message},
    loadAll:async()=>{context.S.activeTour=null;context.S.teamCompetitionId=null},
    loadTournament:async()=>{context.loadedTournament=context.S.activeTour},
    sb:{rpc:async(name,args)=>{
      calls.push({name,args});
      if(name==='generate_swe_tournament_teams')return {data:{team_count:2,pitch_count:1,substitute_count:0,team_scores:[]},error:null};
      return {data:{status:'pending'},error:null};
    }},
    console
  };
  vm.createContext(context);
  vm.runInContext(helper+generation,context);
  return {context,calls};
}

test('a stale generated counter does not block regeneration when only Mika preformed team remains',async()=>{
  const {context,calls}=harness([{id:'mika',is_preformed:true}]);
  await context.runSmartTeamGeneration(false);
  assert.deepEqual(calls.map(call=>call.name),['admin_configure_tournament_team_review','generate_swe_tournament_teams','start_tournament_team_review']);
  assert.equal(calls[0].args.p_requested,true);
  assert.equal(calls[0].args.p_duration_minutes,120);
  assert.equal(context.S.activeTour,'tournoi-mika');
  assert.equal(context.S.teamCompetitionId,'tournoi-mika');
  assert.equal(context.loadedTournament,'tournoi-mika');
  assert.equal(context.lastView,'teams');
});

test('an existing generated team still protects the active draw',async()=>{
  const {context,calls}=harness([{id:'mika',is_preformed:true},{id:'bleus',is_preformed:false}]);
  await context.runSmartTeamGeneration(false);
  assert.equal(calls.length,0);
  assert.match(context.lastToast,/tirage existe déjà/i);
});
