(()=>{
'use strict';
const roles=[['king_pitch_id','👑 Terrain du Roi'],['middle_pitch_id','⚔ Terrain des Conquérants'],['stream_pitch_id','🛡 Terres des Bannis']];
function validate(t,ids,values){
 const selected=roles.map(([key])=>values[key]).filter(Boolean);
 if(!values.king_pitch_id)throw Error('Choisis le terrain du Roi.');
 if(ids.length>=2&&!values.stream_pitch_id)throw Error('Choisis les Terres des Bannis.');
 if(ids.length===3&&!values.middle_pitch_id)throw Error('Choisis le terrain des Conquérants.');
 if(selected.length!==ids.length||new Set(selected).size!==selected.length||selected.some(id=>!ids.includes(id)))throw Error('Chaque terrain réservé doit avoir un rôle différent.');
 if(t.rotation_state?.initialized&&roles.some(([key])=>!!t[key]!==!!values[key]))throw Error('Le circuit est lancé : conserve le même nombre de rôles pour préserver les rotations en attente.');
 return Object.fromEntries(roles.map(([key])=>[key,values[key]||null]));
}
function editor(t,getIds){
 const node=document.createElement('fieldset');node.className='player';node.style.marginTop='10px';
 const legend=document.createElement('legend');legend.textContent='Rôles des terrains — Roi du terrain';node.append(legend);
 const fields={};
 for(const [key,label] of roles){const wrap=document.createElement('label'),text=document.createElement('span'),select=document.createElement('select');text.textContent=label;wrap.append(text,select);node.append(wrap);fields[key]=select;}
 const missing=document.createElement('p');missing.className='muted';missing.setAttribute('role','status');node.append(missing);
 const note=document.createElement('p');note.className='muted';note.textContent='Les matchs avec un rôle déjà enregistré le conservent. Les nouveaux matchs suivent cette configuration. Équipes et résultats conservés.';node.append(note);
 let initial=true;
 function refresh(){const ids=getIds();missing.textContent=ids.length?'':'Aucun terrain réservé : ouvre Modifier le tournoi et sélectionne le complexe et ses terrains.';for(const [key] of roles){const select=fields[key],keep=initial?t[key]:select.value;select.replaceChildren(new Option('Choisir', ''));for(const id of ids){const pitch=(S.sportsPitches||[]).find(p=>String(p.id)===String(id));select.add(new Option(pitch?.name||'Terrain indisponible',id));}select.value=ids.includes(keep)?keep:'';select.disabled=!ids.length;select.parentElement.hidden=ids.length>0&&(key==='middle_pitch_id'?ids.length<3:key==='stream_pitch_id'?ids.length<2:false);}for(const [key] of roles)if(fields[key].parentElement.hidden)fields[key].value='';initial=false;}
 refresh();return {node,refresh,patch:()=>validate(t,getIds(),Object.fromEntries(roles.map(([key])=>[key,fields[key].value])))};
}
async function update(t,patch){
 let query=sb.from('tournaments').update(patch).eq('id',t.id);
 for(const [key] of roles)query=t[key]?query.eq(key,t[key]):query.is(key,null);
 query=t.rotation_state==null?query.is('rotation_state',null):query.eq('rotation_state',JSON.stringify(t.rotation_state));
 const result=await query.select('id').maybeSingle();
 if(!result.error&&!result.data)return {error:Error('Le tournoi a changé. Ferme ce réglage et actualise les données avant de réessayer.')};
 return result;
}
function mountMatches(t){
 const old=document.getElementById('matchPitchRoleSettings');
 if(old&&old.dataset.tournamentId===String(t?.id)&&old.open)return;
 old?.remove();
 if(!t||t.rotation_mode!=='king_of_pitch'||S.publicMode||!hasAdminOps())return;
 const anchor=document.getElementById('matchCompetitionStatus');if(!anchor)return;
 const box=document.createElement('details');box.id='matchPitchRoleSettings';box.dataset.tournamentId=t.id;box.className='player';
 const summary=document.createElement('summary');summary.textContent='⚙ Vérifier / modifier les rôles des terrains';box.append(summary);
 const form=editor(t,()=>t.reserved_pitch_ids||[]);box.append(form.node);
 const status=document.createElement('p');status.setAttribute('role','status');
 const save=document.createElement('button');save.type='button';save.className='primary';save.textContent='Enregistrer les rôles';box.append(save,status);
 save.onclick=async()=>{save.disabled=true;status.textContent='';try{
  if(!navigator.onLine)throw Error('Reconnecte-toi pour enregistrer les rôles.');
  const patch=form.patch();
  const {error}=await update(t,patch);if(error)throw error;
  Object.assign(t,patch);status.textContent='Rôles enregistrés. Équipes et résultats conservés.';
 }catch(error){status.textContent=error.message;}finally{save.disabled=false;}};
 anchor.after(box);
}
window.SWEPitchRoles={editor,mountMatches,validate,update};
})();
