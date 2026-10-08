const {test}=require('node:test'),assert=require('node:assert/strict'),E=require('./engine.cjs');
function conquest(){const s=E.create(['a','b','c','d','e','f']);for(const id of s.matches.map(m=>m.id))E.finish(s,id,{homeScore:1,awayScore:0});if(s.phase==='qualification'){E.proposeDraw(s,()=>.2);E.validateDraw(s,'organizer')}return s}
test('winner-only penalties complete all conquest phases and ranking without invented kicks',()=>{
 const s=conquest();while(s.phase!=='finished')for(const id of s.matches.filter(m=>m.phase===s.phase&&m.status!=='finished').map(m=>m.id)){const m=s.matches.find(m=>m.id===id);E.finish(s,id,{homeScore:2,awayScore:2,penalties:{winnerTeamId:m.away}});assert.equal(m.winner,m.away);assert.equal(m.loser,m.home);assert.equal(m.penalties.home,undefined)}
 assert.equal(new Set(s.finalRanking).size,6);assert.equal(s.matches.filter(m=>m.phase==='finals').length,2);
});
test('rejects foreign winner, non-tied scores and qualification shootouts',()=>{
 const s=conquest(),m=s.matches.find(m=>m.phase==='conquest_1');
 assert.throws(()=>E.finish(s,m.id,{homeScore:0,awayScore:0,penalties:{winnerTeamId:'foreign'}}));
 assert.throws(()=>E.finish(s,m.id,{homeScore:1,awayScore:0,penalties:{winnerTeamId:m.home}}));
 const q=E.create(['a','b','c','d','e','f']);assert.throws(()=>E.finish(q,'q1_1',{homeScore:0,awayScore:0,penalties:{winnerTeamId:q.matches[0].home}}));
});
