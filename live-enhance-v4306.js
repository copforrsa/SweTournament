(()=>{
'use strict';
if(window.__SWE_LIVE_ENHANCE_4306)return;window.__SWE_LIVE_ENHANCE_4306=true;
function css(){if(document.getElementById('sweLive4306Css'))return;const s=document.createElement('style');s.id='sweLive4306Css';s.textContent=`
#publicView .swe-live-match4306{padding:14px 12px!important;border:1px solid #e2e8f0!important;border-radius:16px!important;margin:10px 0!important;background:#fff!important}
#publicView .swe-live-match4306 .swe-live-scoreline4306{font-size:1.12rem!important;display:grid!important;grid-template-columns:minmax(0,1fr) 88px minmax(0,1fr)!important;align-items:center!important;gap:10px!important;text-align:center!important;font-weight:800!important}
#publicView .swe-live-match4306 .small{font-size:.88rem!important;padding:6px 8px!important;margin-top:6px!important;border-radius:9px!important;background:#f8fafc!important}
#publicView .swe-live-match4306 .small .muted{font-weight:700!important}
@media(max-width:650px){#publicView .swe-live-match4306 .swe-live-scoreline4306{font-size:.95rem!important;grid-template-columns:minmax(0,1fr) 78px minmax(0,1fr)!important;gap:6px!important}}
`;document.head.appendChild(s)}
function enhance(){css();const root=document.getElementById('publicView');if(!root)return;root.querySelectorAll('.player').forEach(card=>{if(card.classList.contains('swe-live-match4306'))return;const first=card.querySelector(':scope > .muted');if(!first||!/^Match\s+\d+/i.test((first.textContent||'').trim()))return;const scoreLine=first.nextElementSibling;if(!scoreLine)return;card.classList.add('swe-live-match4306');scoreLine.classList.add('swe-live-scoreline4306');card.querySelectorAll('.small').forEach(line=>{const html=line.innerHTML;if(/←\s*passe/i.test(html)&&!line.dataset.sweLive4306){line.dataset.sweLive4306='1';line.setAttribute('title','Buteur et passeur décisif')}})})}
['DOMContentLoaded','swe:rendered','swe:match-remote-final'].forEach(ev=>document.addEventListener(ev,()=>setTimeout(enhance,80)));[250,800,1800,4000].forEach(t=>setTimeout(enhance,t));
})();