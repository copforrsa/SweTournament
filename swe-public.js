(()=>{'use strict';
const $=id=>document.getElementById(id);
const params=new URLSearchParams(location.search),id=params.get('swe');
const client=window.supabase?.createClient('https://fbppesfxkvledwjemwsn.supabase.co','sb_publishable_Kl3HDD4S08YC1EB-cWJKaQ_e9gCbygp',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'}});
let event=null,session=null;
function message(value,error=false){$('feedback').textContent=value;$('feedback').classList.toggle('error',error)}
function dateText(s){return new Date(s).toLocaleString('fr-FR',{timeZone:'America/Martinique',weekday:'long',day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})}
function detail(label,value){const p=document.createElement('div');const b=document.createElement('strong');b.textContent=label+' : ';p.append(b,document.createTextNode(value));$('details').append(p)}
async function refresh(){
 if(!client||!id||!/^[0-9a-f-]{36}$/i.test(id)){message('Lien de match invalide.',true);return}
 const {data,error}=await client.rpc('public_community_swe_details_v1',{p_swe_id:id});
 if(error){message('Impossible de charger ce match.',true);return}
 event=data;$('details').replaceChildren();
 if(!data?.available){$('title').textContent='Match indisponible';message('Ce SWÉ est terminé, privé ou n’accepte plus d’inscriptions.',true);$('join').classList.add('hidden');return}
 $('title').textContent=data.title||'SWÉ public';
 detail('Date',dateText(data.start_at));detail('Complexe',data.venue_name||'À préciser');
 if(data.terrain_label)detail('Terrain',data.terrain_label);
 if(data.venue_address)detail('Adresse',data.venue_address);
 detail('Places restantes',String(data.remaining)+' / '+data.max_players);
 detail('Tarif sur place',Number(data.onsite_entry_fee_cents)>0?(Number(data.onsite_entry_fee_cents)/100).toLocaleString('fr-FR')+' €':'À confirmer');
 const {data:{session:current}}=await client.auth.getSession();session=current;
 $('member').classList.toggle('hidden',!session);$('visitor').classList.toggle('hidden',!!session);
 $('join').classList.toggle('hidden',data.remaining<=0);
 if(data.remaining<=0)message('Ce match est complet.',true);
}
async function registration(method,args,button){
 if(!event?.available)return;
 button.disabled=true;message('Inscription en cours…');
 try{const {data,error}=await client.rpc(method,args);if(error)throw error;
 message(data==='already_registered'?'Tu es déjà inscrit à ce match.':data==='already_pending'?'Ton invitation ou ta demande existe déjà.':'✅ Inscription confirmée ! Tu peux partager ce lien avec tes amis.');
 await refresh();
 }catch(err){message(err.message||'Inscription impossible, réessaie.',true)}
 finally{button.disabled=false}
}
$('guestForm').addEventListener('submit',e=>{e.preventDefault();if(session)return;const name=$('guestName').value.trim();if(name.length<2)return message('Indique ton nom.',true);registration('public_join_community_swe_guest_v1',{p_swe_id:id,p_display_name:name},e.submitter)});
$('memberJoin').addEventListener('click',e=>registration('public_join_community_swe_member_v1',{p_swe_id:id},e.currentTarget));
$('loginForm').addEventListener('submit',async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;message('Connexion…');try{const {error}=await client.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(error)throw error;await refresh();if(event?.remaining>0)await registration('public_join_community_swe_member_v1',{p_swe_id:id},$('memberJoin'))}catch(err){message(err.message||'Connexion impossible.',true)}finally{b.disabled=false}});
refresh().catch(()=>message('Erreur de chargement. Réessaie.',true));
})();