'use strict';
// Emit a rollback-only integration fixture for an authorized test workspace.
// SQL contains test UUIDs, never credentials. Execute using the Supabase SQL tool.
const fs=require('node:fs'),E=require('./engine.cjs');
const uuid=value=>{if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value||''))throw Error('Valid test UUID required');return value};
const owner=uuid(process.env.FAST_TEST_OWNER),workspace=uuid(process.env.FAST_TEST_WORKSPACE),pitches=(process.env.FAST_TEST_PITCHES||'').split(',').map(uuid);if(pitches.length!==3)throw Error('Three reserved pitches required');
const tid='51000000-0000-4000-8000-000000000099',teams=Array.from({length:6},(_,i)=>'51000000-0000-4000-8000-00000000000'+i),s=E.create(teams),steps=[{action:'start',state:structuredClone(s)}];
while(s.phase!=='finished'){
 for(const id of s.matches.filter(m=>m.phase===s.phase&&m.status!=='finished').map(m=>m.id)){E.finish(s,id,{homeScore:1,awayScore:0});steps.push({action:'finish',match:id,state:structuredClone(s)})}
 if(s.phase==='qualification'){E.proposeDraw(s,()=>.42);steps.push({action:'draw',state:structuredClone(s)});E.validateDraw(s,owner);steps.push({action:'validate_draw',state:structuredClone(s)})}
}
const migrations=['20261007090000_fast_conquest.sql','20261007091000_fast_conquest_shared_substitutes.sql'].map(name=>fs.readFileSync('supabase/migrations/'+name,'utf8')).join('\n');
console.log(`begin; set local statement_timeout='15s';
${migrations}
select set_config('request.jwt.claim.sub','${owner}',true);
select set_config('request.jwt.claims','{"sub":"${owner}","role":"authenticated"}',true);
insert into public.tournaments(id,workspace_id,name,tournament_date,format,fast_team_mode,reserved_pitch_ids,max_players) values('${tid}','${workspace}','Fast rollback fixture',current_date+7,'fast_conquest','admin',array[${pitches.map(id=>"'"+id+"'::uuid").join(',')}],30);
insert into public.teams(id,tournament_id,name) select value::uuid,'${tid}','Test '||ordinality from jsonb_array_elements_text('${JSON.stringify(teams)}') with ordinality;
select public.fast_conquest_manage('${tid}','lock');
do $fixture$ declare r jsonb; v integer; m public.matches%rowtype; c jsonb; begin
for r in select value from jsonb_array_elements($steps$${JSON.stringify(steps)}$steps$::jsonb) loop
 if r->>'action'='finish' then
  update public.matches set home_score=1,away_score=0 where tournament_id='${tid}' and format_slot='fast:'||(r->>'match');
  select * into m from public.matches where tournament_id='${tid}' and format_slot='fast:'||(r->>'match');
  -- Internal fixture setup; production confirmations require the captain RPC.
  insert into private.fast_conquest_confirmations values(m.id,m.home_team_id,private.fast_digest(m.id),auth.uid()),(m.id,m.away_team_id,private.fast_digest(m.id),auth.uid()) on conflict do nothing;
 end if;
 select version into v from private.fast_conquest_sessions where tournament_id='${tid}';
 c:=public.fast_conquest_commit('${tid}',auth.uid(),v,r->'state',r->>'action',r->>'match');
end loop;
if (select count(*) from public.matches where tournament_id='${tid}')<>14 then raise exception 'Expected 14 matches';end if;
if (select count(*) from public.matches where tournament_id='${tid}' and format_stage='finals')<>2 then raise exception 'Expected 2 finals';end if;
if exists(select 1 from public.matches where tournament_id='${tid}' and format_stage='finals' and pitch='Boulogne') then raise exception 'Unexpected Boulogne final';end if;
if c->'state'->>'phase'<>'finished' or jsonb_array_length(c->'state'->'finalRanking')<>6 then raise exception 'Invalid final ranking';end if;
if has_function_privilege('authenticated','public.fast_conquest_commit(uuid,uuid,integer,jsonb,text,text)','EXECUTE') or has_table_privilege('authenticated','private.fast_conquest_notes','SELECT') then raise exception 'Private API leaked';end if;
end $fixture$;
select 'Fast Conquête SQL integration passed' as verification;
rollback;`);
