/* Offer comparison before launching a player's organizer workspace. */
(()=>{
 'use strict';
 const E=id=>document.getElementById(id);
 let selected='standard',billing='monthly';
 function mount(){
  const view=E('view-myplayer');
  if(!view)return;
  let card=E('sweOrganizerOffers52');
  if(!card){
   card=document.createElement('section');
   card.id='sweOrganizerOffers52';
   card.className='card';
   card.dataset.playerSections='organizer';
   card.style.setProperty('--player-order','1');
   card.innerHTML='<h2>🏆 Créer mon espace organisateur</h2><p>Compare les formules SWÉ et leurs options avant de choisir ton espace.</p><div id="sweOrganizerCatalog52"></div><p class="swe-organizer-disclaimer">Le choix d’une formule ici ne déclenche aucun paiement ni abonnement. Les éventuelles conditions commerciales seront confirmées dans le parcours de souscription.</p><button type="button" class="primary" id="sweOrganizerContinue52">Continuer vers la création de mon espace →</button><p id="sweOrganizerOfferStatus52" role="status"></p>';
   view.append(card);
   E('sweOrganizerContinue52').onclick=()=>{
     try{localStorage.setItem('swe_selected_offer',selected);localStorage.setItem('swe_selected_billing',billing)}catch(_){}
     if(typeof window.SWEPlayerHome?.openOffers==='function')window.SWEPlayerHome.openOffers();
     else E('becomeOrganizer')?.click();
   };
  }
  card.classList.toggle('swe-player-filtered',view.dataset.playerPanel!=='organizer');
  const catalog=E('sweOrganizerCatalog52');
  if(!catalog.dataset.offerMounted){
    if(typeof window.SWEOffers?.mount==='function'){
      window.SWEOffers.mount(catalog,{organizer:true,onSelect:(code,annual)=>{
       if(code)selected=code;
       billing=annual?'annual':'monthly';
       const line=E('sweOrganizerOfferStatus52');
       if(line)line.textContent=code?'Formule choisie : '+(code==='standard'?'Standard':code==='pro'?'Pro':code)+'. Tu peux consulter toutes les options avant de poursuivre.':'';
      }});
    }else catalog.textContent='Catalogue temporairement indisponible. Réessaie après actualisation.';
  }
 }
 document.addEventListener('swe:rendered',mount);
 document.addEventListener('swe:page-view',mount);
 window.addEventListener('pageshow',mount);
 window.SWEOrganizerOffers52={mount};
})();