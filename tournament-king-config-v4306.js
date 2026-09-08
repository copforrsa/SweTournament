(()=>{
'use strict';
if(window.__SWE_KING_CONFIG_4306)return;window.__SWE_KING_CONFIG_4306=true;
const $=s=>document.querySelector(s);
function selectedPitches(){return [...document.querySelectorAll('#tourPitchChoices .tourPitchCheck:checked')].map(x=>String(x.value))}
function pitchLabel(id){try{return (S.sportsPitches||[]).find(p=>String(p.id)===String(id))?.name||'Terrain'}catch(_){return 'Terrain'}}
function ensureBox(){
 const anchor=$('#tourPitchChoices');if(!anchor||$('#sweKingConfig4306'))return;
 const box=document.createElement('div');box.id='sweKingConfig4306';box.className='player hidden';box.style.cssText='margin-top:10px;background:#fff8e8;border:1px solid #f2d18a';
 box.innerHTML='<b>👑 Format Roi du terrain</b><div class="muted" style="margin:5px 0 10px">Définis le terrain du Roi. Avec 3 terrains, définis aussi le terrain Ruisseau ; le terrain restant devient automatiquement le terrain intermédiaire.</div><div class="grid g2"><label><span class="muted">👑 Terrain du Roi</span><select id="sweKingPitch"><option value="">Choisir</option></select></label><label><span class="muted">🌊 Terrain Ruisseau / terrain bas</span><select id="sweStreamPitch"><option value="">Choisir</option></select></label></div><div id="sweMiddlePitchHint" class="muted" style="margin-top:8px"></div>';
 anchor.insertAdjacentElement('afterend',box);refresh();
}
function refresh(){
 ensureBox();const box=$('#sweKingConfig4306');if(!box)return;
 const kingMode=$('#tourFormat')?.value==='king_of_pitch';box.classList.toggle('hidden',!kingMode);if(!kingMode)return;
 const ids=selectedPitches(),opts='<option value="">Choisir</option>'+ids.map(id=>'<option value="'+id+'">'+pitchLabel(id)+'</option>').join('');
 const k=$('#sweKingPitch'),s=$('#sweStreamPitch');const kv=k?.value,sv=s?.value;if(k)k.innerHTML=opts;if(s)s.innerHTML=opts;if(k&&ids.includes(kv))k.value=kv;if(s&&ids.includes(sv))s.value=sv;
 if(ids.length===2&&s&&!s.value){const other=ids.find(id=>id!==k?.value);if(other)s.value=other||''}
 updateHint();
}
function updateHint(){const ids=selectedPitches(),k=$('#sweKingPitch')?.value||'',low=$('#sweStreamPitch')?.value||'',h=$('#sweMiddlePitchHint');if(!h)return;if(ids.length<2){h.textContent='Sélectionne au moins 2 terrains pour le format Roi du terrain.';return}if(k&&low&&k===low){h.textContent='⚠️ Le terrain du Roi et le terrain bas doivent être différents.';return}if(ids.length===3&&k&&low){const mid=ids.find(id=>id!==k&&id!==low);h.textContent=mid?'Terrain intermédiaire : '+pitchLabel(mid):'Choisis deux terrains différents.'}else if(ids.length===2&&k){const mid=ids.find(id=>id!==k);h.textContent=mid?'Deux terrains : Roi = '+pitchLabel(k)+' • Rotation = '+pitchLabel(mid):''}else h.textContent=''}
function config(){const ids=selectedPitches(),king=$('#sweKingPitch')?.value||'',low=$('#sweStreamPitch')?.value||'';if($('#tourFormat')?.value!=='king_of_pitch')return {mode:'standard'};if(ids.length<2||ids.length>3)throw new Error('Le Roi du terrain nécessite 2 ou 3 terrains.');if(!king||!ids.includes(king))throw new Error('Choisis le terrain du Roi.');if(ids.length===3&&(!low||!ids.includes(low)||low===king))throw new Error('Choisis un terrain Ruisseau différent du terrain du Roi.');const remaining=ids.filter(id=>id!==king&&id!==low);if(ids.length===2){const middle=ids.find(id=>id!==king);return {mode:'king_of_pitch',king,middle,stream:null}}return {mode:'king_of_pitch',king,middle:remaining[0]||null,stream:low}}
function wrapCreate(){const btn=$('#createTournament');if(!btn||btn.dataset.sweKingWrapped==='1'||typeof btn.onclick!=='function')return false;btn.dataset.sweKingWrapped='1';const original=btn.onclick;btn.onclick=async function(e){let cfg;try{cfg=config()}catch(err){toast(err.message);return}const started=new Date().toISOString();await original.call(this,e);if(cfg.mode!=='king_of_pitch')return;try{const q=await sb.from('tournaments').select('id,created_at,format').eq('workspace_id',S.workspace.id).eq('format','king_of_pitch').gte('created_at',started).order('created_at',{ascending:false}).limit(1).maybeSingle();if(q.error||!q.data)return;await sb.from('tournaments').update({rotation_mode:'king_of_pitch',king_pitch_id:cfg.king,middle_pitch_id:cfg.middle,stream_pitch_id:cfg.stream,rotation_state:{version:1,queue:[],pending:{},active:{},initialized:false}}).eq('id',q.data.id);await loadAll();toast('Tournoi Roi du terrain configuré 👑')}catch(err){console.error('SWÉ king config',err);toast('Tournoi créé, mais configuration des terrains à vérifier.')}};return true}
function boot(){ensureBox();$('#tourFormat')?.addEventListener('change',refresh);$('#tourPitchChoices')?.addEventListener('change',()=>setTimeout(refresh,0));$('#sweKingConfig4306')?.addEventListener('change',updateHint);if(!wrapCreate())setTimeout(wrapCreate,500)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();