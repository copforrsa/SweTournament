'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
test('numeric notes dialog groups all players, filters teammates and opponents, preserves draft scores',async()=>{
 const d=new JSDOM('<div></div>',{runScripts:'outside-only'}),w=d.window;
 try{
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.dispatchEvent(new w.Event('close'))};
 w.S={players:[],workspaceFeatures:{}};w.currentTour=()=>null;
 const participants=Array.from({length:31},(_,i)=>'p'+i),calls=[];
 const c={can_note:true,notes_open:true,participants,participant_details:participants.map((id,i)=>({id,name:'Joueur '+String(i).padStart(2,'0'),current_rating:7})),note_peers:{linked:true,with:['p1','p2'],against:['p3','p4']},note_teams:[{id:'blue',name:'Bleus',players:participants.slice(0,15)},{id:'red',name:'Rouges',players:participants.slice(15,30)}],my_notes:[{player_id:'p0',rating:7.5}]};
 w.sb={rpc:async(name,payload)=>name==='fast_conquest_context'?{data:c}:(calls.push(payload),{data:{}})};
 w.eval(fs.readFileSync('fast-conquest/ui.js','utf8'));await w.SWE_FAST_CONQUEST.openNotes('tour');
 const dialog=w.document.getElementById('fastNotesDialog');assert(dialog.open);assert.equal(dialog.querySelectorAll('textarea').length,0);assert.equal(dialog.querySelectorAll('[data-note-player]').length,31);assert.match(dialog.textContent,/31 \/ 31 joueurs affichés/);
 assert.equal(dialog.querySelector('[data-note-player] select').value,'7.5');assert.doesNotMatch(dialog.textContent,/70 %|30 %|moyenne du tournoi/);assert.equal(dialog.querySelectorAll('[data-note-team]').length,3);const filter=dialog.querySelector('select');filter.value='with';filter.onchange();assert.deepEqual([...dialog.querySelectorAll('[data-note-player]')].filter(x=>!x.hidden).map(x=>x.dataset.noteId),['p1','p2']);filter.value='against';filter.onchange();assert.deepEqual([...dialog.querySelectorAll('[data-note-player]')].filter(x=>!x.hidden).map(x=>x.dataset.noteId),['p3','p4']);filter.value='all';filter.onchange();assert.equal(dialog.querySelector('[data-note-player] select').value,'7.5');assert.doesNotMatch(dialog.textContent,/Maestro|A tenu son rang/);
 const search=dialog.querySelector('input[type=search]');search.value='Joueur 30';search.oninput();assert.equal([...dialog.querySelectorAll('[data-note-player]')].filter(x=>!x.hidden).length,1);
 search.value='';search.oninput();
 const card=dialog.querySelector('[data-note-player]');card.querySelector('select').value='0';card.querySelector('button').click();await new Promise(r=>setTimeout(r,0));
 assert.equal(calls[0].p_payload.rating,0);assert.equal(calls[0].p_payload.code,undefined);assert.equal(calls[0].p_tournament_id,'tour');
 }finally{w.close()}
});
test('first evaluation uses four criteria and role; prior evaluation uses tournament /10',async()=>{
 const d=new JSDOM('<div></div>',{runScripts:'outside-only'}),w=d.window,calls=[];
 try{
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){};w.S={players:[],workspaceFeatures:{}};w.currentTour=()=>null;
 const c={can_note:true,notes_open:true,participants:['new','known'],participant_details:[{id:'new',name:'Nouveau',requires_initial:true},{id:'known',name:'Déjà évalué',requires_initial:false}],my_notes:[],note_teams:[]};
 w.sb={rpc:async(name,p)=>name==='fast_conquest_context'?{data:c}:(calls.push(p),{data:{}})};w.eval(fs.readFileSync('fast-conquest/ui.js','utf8'));await w.SWE_FAST_CONQUEST.openNotes('tour');
 const fresh=w.document.querySelector('[data-note-id="new"]'),known=w.document.querySelector('[data-note-id="known"]');assert.equal(fresh.querySelectorAll('select').length,5);assert.equal(known.querySelectorAll('select').length,1);
 fresh.querySelector('button').click();assert.equal(calls.length,0);
 [...fresh.querySelectorAll('select')].forEach((s,i)=>s.value=i===4?'metronome':'4');fresh.querySelector('button').click();await new Promise(r=>setTimeout(r,0));assert.deepEqual(JSON.parse(JSON.stringify(calls[0].p_payload.initialSkills)),{cardio:4,dribble:4,collectif:4,frappe:4,preferred_role:'metronome'});assert.equal(calls[0].p_payload.rating,undefined);
 known.querySelector('select').value='8';known.querySelector('button').click();await new Promise(r=>setTimeout(r,0));assert.equal(calls[1].p_payload.rating,8);
 await w.SWE_FAST_CONQUEST.openNotes('tour');assert.equal(w.document.querySelector('[data-note-id="new"]').querySelectorAll('select').length,5);
 }finally{w.close()}
});
