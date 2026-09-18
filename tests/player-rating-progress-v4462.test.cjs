const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
test('team name selection shows rating evolution and ignores a stale player response',async()=>{
 const dom=new JSDOM('<section id="publicTeamBuilderCard"><select id="publicTeamCreator"><option value="">Choisir</option><option value="a">Alice</option><option value="b">Bob</option></select></section>',{runScripts:'outside-only'}),w=dom.window;
 const source=fs.readFileSync(path.join(__dirname,'../registration-presentation.js'),'utf8');
 const stats=source.slice(source.indexOf(' function updatePlayerStats('),source.indexOf(' function updateMissions('));
 const bind=source.slice(source.indexOf(' let teamRatingKey='),source.indexOf(' const controller='));
 const waiting={};w.ctx={data:()=>({tournament:{id:'t'},seasons:[],tournaments:[],matches:[],goals:[],teamPlayers:[],players:[{id:'a',name:'Alice'},{id:'b',name:'Bob'}]}),loadRating:id=>new Promise(resolve=>waiting[id]=resolve)};
 w.eval("const E=id=>document.getElementById(id),esc=v=>String(v??''),setHtml=(el,h)=>{if(el.innerHTML!==h)el.innerHTML=h},started=()=>false;let select=null,playerPanel=null,ratingState='',ratingPlayer=null,ratingResult=null;"+stats+bind);
 const creator=w.document.querySelector('select');creator.value='a';creator.dispatchEvent(new w.Event('change'));
 creator.value='b';creator.dispatchEvent(new w.Event('change'));
 waiting.b({avg_rating:3.3,rating_delta:0.3});for(let i=0;i<10;i++)await Promise.resolve();
 waiting.a({avg_rating:1,rating_delta:-0.2});for(let i=0;i<10;i++)await Promise.resolve();
 const panel=w.document.querySelector('#registrationTeamPlayerStats');assert.match(panel.textContent,/Bob/);assert.match(panel.textContent,/\+0,3 d’évolution/);assert.doesNotMatch(panel.textContent,/Alice/);
});
test('relation buttons live in Joueurs / Notes and preserve unsaved rating inputs',async()=>{
 const dom=new JSDOM('<div id="view-players"><div id="playersList"><div class="player"><div class="row">A</div><input value="draft"></div><div class="player"><div class="row">B</div></div></div></div><div id="view-myplayer"></div>',{runScripts:'outside-only'}),w=dom.window;
 w.S={workspace:{id:'w',role:'admin'},session:{user:{id:'u'}},players:[{id:'a'},{id:'b'}]};
 w.sb={rpc:async()=>({data:{profile_linked:true,players:[{player_id:'a',played_with:true,played_against:false,rating:{avg_rating:3.3,rating_delta:0.3}},{player_id:'b',played_with:false,played_against:true}]}})};
 w.eval(fs.readFileSync(path.join(__dirname,'../player-rating-progress-v4462.js'),'utf8'));
 for(let i=0;i<10;i++)await Promise.resolve();
 const bar=w.document.querySelector('#swePlayerRelations4462');assert.equal(bar.parentElement.id,'view-players');
 const input=w.document.querySelector('input');
 bar.querySelector('[data-relation="against"]').click();
 assert.equal(w.document.querySelector('[data-rating-player="a"]').classList.contains('swe-relation-hidden'),true);
 assert.equal(w.document.querySelector('[data-rating-player="b"]').classList.contains('swe-relation-hidden'),false);
 bar.querySelector('[data-relation="with"]').click();assert.equal(w.document.querySelector('input'),input);assert.equal(input.value,'draft');
 assert.match(w.document.querySelector('.swe-rating-evolution').textContent,/3,3\/5 · \+0,3/);
});
