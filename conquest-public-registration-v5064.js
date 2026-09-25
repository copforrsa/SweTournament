(()=>{
'use strict';
if(window.__SWE_CONQUEST_PUBLIC_REGISTRATION_5064)return;
window.__SWE_CONQUEST_PUBLIC_REGISTRATION_5064=true;

const E=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[char]));

function installStyle(){
  if(E('sweConquestPublicRegistrationCss'))return;
  const style=document.createElement('style');
  style.id='sweConquestPublicRegistrationCss';
  style.textContent=`
    #publicView.swe-conquest-public-registration #publicWorkspaceName{
      color:#fff!important;
      -webkit-text-fill-color:#fff!important;
      text-shadow:0 2px 14px rgba(31,2,10,.3)!important;
    }
    #publicView.swe-conquest-public-registration #registrationFormat{
      color:#ffd9df!important;
      background:#79152a!important;
      border:1px solid #ee7790;
      border-radius:999px;
      display:inline-flex;
      padding:6px 10px;
      box-shadow:0 8px 18px rgba(66,4,18,.25);
    }
    #publicView.swe-conquest-public-registration .sp-hero{
      background:radial-gradient(circle at 88% 42%,rgba(191,36,68,.55),transparent 32%),linear-gradient(135deg,#2f0610 0%,#681227 57%,#9b2743 100%)!important;
    }
  `;
  document.head.appendChild(style);
}
function rowValue(row){
  const label=row?.querySelector('b')?.textContent?.trim()||'';
  return row?.textContent?.slice(label.length).trim()||'';
}
function shortenVenue(){
  const meta=E('registrationMeta');
  if(!meta)return;
  const rows=[...meta.querySelectorAll('span')];
  const venueRow=rows.find(row=>row.querySelector('b')?.textContent?.trim()==='Lieu');
  const terrainRow=rows.find(row=>row.querySelector('b')?.textContent?.trim()==='Terrains');
  const venue=rowValue(venueRow),terrains=rowValue(terrainRow);
  if(!venueRow||!venue||!terrains)return;
  const venueLower=venue.toLocaleLowerCase('fr-FR'),terrainLower=terrains.toLocaleLowerCase('fr-FR');
  if(!venueLower.endsWith(terrainLower))return;
  const shortened=venue.slice(0,venue.length-terrains.length).replace(/[—–-]\s*$/,'').trim();
  if(shortened)venueRow.innerHTML='<b>Lieu</b>'+esc(shortened);
}
function apply(){
  installStyle();
  const format=E('registrationFormat')?.textContent||'';
  const root=E('publicView');
  if(!root)return;
  const conquest=/conqu[êe]te/i.test(format);
  root.classList.toggle('swe-conquest-public-registration',conquest);
  if(conquest)shortenVenue();
}
function queue(){[0,150,600,1200].forEach(delay=>setTimeout(apply,delay));}
document.addEventListener('swe:page-view',queue);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',queue,{once:true});else queue();
})();
