const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const sql=fs.readFileSync(path.join(__dirname,'..','supabase','migrations','20260913210000_automatic_substitute_recalculation_v4390.sql'),'utf8');

assert.match(sql,/row_number\(\) over\(order by tr\.registered_at nulls last,tr\.player_id\)/);
assert.match(sql,/and u\.position>v_free/);
assert.match(sql,/after insert or delete on public\.tournament_players/);
assert.match(sql,/after update of present,registration_status,registered_at,player_id on public\.tournament_players/);
assert.match(sql,/after insert or delete on public\.team_players/);
assert.match(sql,/after insert or delete on public\.teams/);
assert.match(sql,/private\.recalculate_tournament_substitute_flags\(coalesce\(new\.tournament_id,old\.tournament_id\)\)/);
assert.match(sql,/if \(select auth\.uid\(\)\) is null or not/);
assert.match(sql,/revoke all on function private\.recalculate_tournament_substitute_flags\(uuid\) from public,anon,authenticated/);
assert.match(sql,/where t\.status<>'finished'/);
assert.doesNotMatch(sql,/delete from public\.(tournament_players|team_players|teams|tournaments)/i);
console.log('Automatic substitute recalculation contract: OK');
