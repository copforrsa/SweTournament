/*
 * Point d'entrée conservé pour la page actuellement publiée.
 * La page d'accueil existante charge déjà ce fichier : il charge donc la
 * version active du salon sans nécessiter de remplacer index.html.
 */
(()=>{
  'use strict';
  if(window.SWETeamDrawSalonV2||document.querySelector('script[data-swe-team-draw-v2]'))return;
  const script=document.createElement('script');
  script.src='./team-draw-room-salon-v5037.js?v=5041';
  script.async=false;
  script.defer=true;
  script.dataset.sweTeamDrawV2='true';
  document.head.appendChild(script);
  const conquest=document.createElement('script');
  conquest.src='./conquest-rotation-v1.js?v=2';
  conquest.defer=true;
  document.head.appendChild(conquest);
})();