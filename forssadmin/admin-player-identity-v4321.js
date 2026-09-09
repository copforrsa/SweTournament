(()=>{
'use strict';
if(window.__SWE_ADMIN_PLAYER_IDENTITY_4321)return;window.__SWE_ADMIN_PLAYER_IDENTITY_4321=true;
const {createClient}=window.supabase||{};if(!createClient)return;
const sb=createClient('https://fbppesfxkvledwjemwsn.supabase.co','sb_publishable_Kl3HDD4S08YC1EB-cWJKaQ_e9gCbygp',{auth:{flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'swe-forssadmin-auth-v1'}});
let directory=[];
const norm=s=>String(s||'').trim().toUpperCase();
const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
async function load(){const {data,error}=await sb.rpc('super_admin_get_players_directory_v4');if(error){console.warn('SWÉ admin identité joueurs',error);return[]}directory=Array.isArray(data)?data:[];return directory}
function inject(){const title=document.getElementById('pageTitle');if(!title||!String(title.textContent||'').includes('Joueurs SWÉ'))return false;const table=document.querySelector('#content table');if(!table)return false;if(table.dataset.sweIdentity4321==='1')return true;const ths=table.querySelectorAll('thead th');if(ths.length<4)return false;const th=document.createElement('th');th.textContent='Identité compte';ths[0].insertAdjacentElement('afterend',th);table.querySelectorAll('tbody tr').forEach(tr=>{const cells=tr.querySelectorAll('td');if(cells.length<4)return;const sweId=norm(cells[3].textContent);const p=directory.find(x=>norm(x.public_player_id)===sweId);const td=document.createElement('td');if(p){const name=[p.first_name,p.last_name].filter(Boolean).join(' ');td.innerHTML=`<b>${esc(name||'—')}</b>${p.nickname?`<div class="muted">Pseudo : ${esc(p.nickname)}</div>`:''}<div class="muted">${esc(p.email||'—')}</div><div class="muted">${esc(p.phone_number||'Tél. non renseigné')}</div>`}else td.innerHTML='<span class="muted">Profil non complété</span>';cells[0].insertAdjacentElement('afterend',td)});table.dataset.sweIdentity4321='1';return true}
async function apply(){await load();let n=0;const t=setInterval(()=>{n++;if(inject()||n>20)clearInterval(t)},200)}
document.addEventListener('click',e=>{if(e.target.closest?.('[data-view="players"]'))setTimeout(apply,120)});window.addEventListener('pageshow',()=>setTimeout(()=>{if(document.getElementById('pageTitle')?.textContent.includes('Joueurs SWÉ'))apply()},200));
})();