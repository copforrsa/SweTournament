(()=>{
'use strict';
const E=id=>document.getElementById(id);
function style(){if(E('swePassword4343Style'))return;const s=document.createElement('style');s.id='swePassword4343Style';s.textContent=`
#swePasswordSettings4343{margin-top:14px;padding:16px;border:1px solid #d7e3f4;border-radius:16px;background:#fff}
#swePasswordSettings4343 .swe-pass-head{display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap}
#swePasswordSettings4343 button{font-weight:900}
#swePasswordModal4343{position:fixed;inset:0;z-index:99999;background:rgba(8,27,55,.55);display:flex;align-items:center;justify-content:center;padding:18px}
#swePasswordModal4343.hidden{display:none!important}
#swePasswordModal4343 .box{width:min(460px,100%);background:#fff;border-radius:18px;padding:20px;box-shadow:0 24px 70px rgba(0,0,0,.25)}
#swePasswordModal4343 input{width:100%;box-sizing:border-box;margin-top:9px}
#swePasswordModal4343 .row{margin-top:14px;gap:10px}
`;document.head.appendChild(s)}
function mount(){style();const view=E('view-myplayer');if(!view||E('swePasswordSettings4343'))return;const d=document.createElement('div');d.id='swePasswordSettings4343';d.innerHTML='<div class="swe-pass-head"><div><b>🔐 Mot de passe</b><div class="muted" style="margin-top:4px">Modifie le mot de passe de ton compte SWÉ quand tu le souhaites.</div></div><button type="button" id="sweOpenPassword4343">Modifier mon mot de passe</button></div>';view.appendChild(d)}
function ensureModal(){let m=E('swePasswordModal4343');if(m)return m;m=document.createElement('div');m.id='swePasswordModal4343';m.className='hidden';m.innerHTML='<div class="box"><h3 style="margin:0 0 6px">Modifier mon mot de passe</h3><div class="muted">Choisis un nouveau mot de passe puis confirme-le.</div><input id="swePass1_4343" type="password" autocomplete="new-password" placeholder="Nouveau mot de passe"><input id="swePass2_4343" type="password" autocomplete="new-password" placeholder="Confirmer le nouveau mot de passe"><div class="row"><button type="button" class="primary" id="sweSavePassword4343">Enregistrer</button><button type="button" id="sweCancelPassword4343">Annuler</button></div></div>';document.body.appendChild(m);return m}
async function save(){const p1=E('swePass1_4343')?.value||'',p2=E('swePass2_4343')?.value||'';if(p1.length<8)return toast?.('Le mot de passe doit contenir au moins 8 caractères.');if(p1!==p2)return toast?.('Les deux mots de passe ne correspondent pas.');const b=E('sweSavePassword4343');if(b){b.disabled=true;b.textContent='Enregistrement…'}try{const {error}=await sb.auth.updateUser({password:p1});if(error)throw error;toast?.('Mot de passe modifié ✅');ensureModal().classList.add('hidden');if(E('swePass1_4343'))E('swePass1_4343').value='';if(E('swePass2_4343'))E('swePass2_4343').value=''}catch(err){toast?.(err?.message||'Impossible de modifier le mot de passe.')}finally{if(b){b.disabled=false;b.textContent='Enregistrer'}}}
function wire(){if(window.__SWE_PASSWORD_4343_WIRED)return;window.__SWE_PASSWORD_4343_WIRED=true;document.addEventListener('click',e=>{if(e.target.closest?.('#sweOpenPassword4343')){const m=ensureModal();m.classList.remove('hidden');setTimeout(()=>E('swePass1_4343')?.focus(),20)}else if(e.target.closest?.('#sweCancelPassword4343'))ensureModal().classList.add('hidden');else if(e.target.closest?.('#sweSavePassword4343'))save()},true)}
function boot(){wire();mount()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();document.addEventListener('swe:rendered',()=>queueMicrotask(mount));window.addEventListener('pageshow',()=>setTimeout(mount,50));
})();
