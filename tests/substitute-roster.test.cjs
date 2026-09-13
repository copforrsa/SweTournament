const assert=require('node:assert/strict');
const test=require('node:test');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.join(__dirname,'..','match-extras-v4306.js'),'utf8');
const functions=source.slice(source.indexOf('function teamIds'),source.indexOf('async function ensureAssignments'));

function eligible(otherStatus){
  const context={
    state:{
      players:[{id:'starter',name:'Starter'},{id:'sub',name:'Remplaçant'}],
      tPlayers:[{tournament_id:'tour',player_id:'starter',present:true,registration_status:'confirmed'},{tournament_id:'tour',player_id:'sub',present:true,registration_status:'confirmed',is_substitute:true}],
      teams:[{id:'home'},{id:'away'}],teamPlayers:[],
      matches:[{id:'match',tournament_id:'tour',home_team_id:'home',away_team_id:'away',status:'scheduled'},{id:'other',tournament_id:'tour',home_team_id:'home',away_team_id:'away',status:otherStatus}],
      matchAssignments:[{match_id:'match',player_id:'starter',team_id:'home'},{match_id:'other',player_id:'sub',team_id:'away'}]
    }
  };
  context.player=id=>context.state.players.find(p=>p.id===id);
  vm.createContext(context);vm.runInContext(functions,context);
  return context.eligibleSubs(context.state.matches[0]).map(p=>p.id);
}

test('future scheduled assignments do not hide a tournament substitute',()=>{
  assert.deepEqual(eligible('scheduled'),['sub']);
});

test('players engaged in a live match remain unavailable as substitutes',()=>{
  assert.deepEqual(eligible('live'),[]);
});

test('the roster synchronization migration recalculates substitutes and scheduled assignments',()=>{
  const sql=fs.readFileSync(path.join(__dirname,'..','supabase','migrations','20260912223000_coorganizer_instructions_and_substitutes_v4382.sql'),'utf8');
  assert.match(sql,/row_number\(\) over\(order by tr\.registered_at/);
  assert.match(sql,/set is_substitute=\(v_capacity>0 and u\.position>v_free\)/);
  assert.match(sql,/m\.status='scheduled'/);
});

test('manual attendance changes immediately recalculate substitute status',()=>{
  const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
  const attendance=app.slice(app.indexOf("c.onchange=async()=>{"),app.indexOf("const tp=S.tPlayers.find",app.indexOf("c.onchange=async()=>{")));
  assert.match(attendance,/await syncTournamentSubstitutes\(t\.id\)/);
  assert.match(attendance,/fresh\?\.registration_status==='waitlist'\|\|fresh\?\.is_substitute/);
});

test('admin quick registration recalculates players added after team creation',()=>{
  const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
  const start=app.indexOf("if(e.target?.id==='manualRegisterPlayer')");
  const end=app.indexOf("if(e.target?.id==='managerAddGuest')",start);
  const manualRegistration=app.slice(start,end);
  assert.match(manualRegistration,/add_registered_member_to_tournament/);
  assert.match(manualRegistration,/S\.teams\.length/);
  assert.match(manualRegistration,/await syncTournamentSubstitutes\(t\.id\)/);
  assert.match(manualRegistration,/fresh\?\.is_substitute/);
});
