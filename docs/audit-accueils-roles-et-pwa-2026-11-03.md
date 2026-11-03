# SWÉ Tournament — Audit des trois accueils (03/11/2026)

## Constat vérifié dans le code

- \`index.html\` charge **61 scripts externes**, dont **12 hotfixes**. Plusieurs modules retravaillent le même DOM après le rendu principal, ce qui produit des empilements et des changements de place tardifs.
- Le navigateur partage un seul \`index.html\` et \`app.js\` entre les profils. \`navigation-spaces.js\` impose les espaces \`player\` et \`management\`, et \`coorganizer-dashboard-v4399.js\` masque toute la page d'accueil native par CSS pour un co-gestionnaire.
- \`admin-player-cards-v52.js\` ajoutait la longue section « Fiches des joueurs et désistements » **à la fin de \`view-home\`** ; les désistements récents étaient également répétés par \`organizer-notifications-v54.js\`.
- \`organizer-pending-requests-v5203.js\` ajoute un encart « Demandes de participation » même lorsqu'il n'y a **aucune demande**. \`organizer-notifications-v54.js\` ajoute aussi les notifications et l'activation du push sur l'accueil, parfois sur la page joueur.
- La homepage gestionnaire contient à elle seule accueil, statistiques, offres/commercial, Stripe, profils à vérifier, gestion d'adjoints, demandes, notifications, actions rapides et plusieurs modules insérés par scripts. Les fonctions importantes sont noyées.
- La homepage co-gestionnaire répète identité, autorisations, deux notes, quatre KPI, onboarding, salon de vote et raccourcis. Certains éléments sont des informations de profil, d'autres des tâches.
- La page joueur comporte une structure native « Mon profil joueur » et un second système de sous-navigation dans \`player-home.js\`. Les alertes administratives ne doivent pas y apparaître.

## Principe de conception à retenir

Chaque espace doit répondre, sans défilement, à trois questions :
1. **Quel est mon prochain SWÉ / tournoi ?**
2. **Quelle action dois-je faire maintenant ?**
3. **Où retrouver les informations secondaires sans les perdre ?**

Aucun bloc secondaire ne doit s'imposer au-dessus d'une action urgente. Une action sensible garde son contrôle d'autorisation côté base.

| Espace | Accueil recommandé (au premier écran) | Rubriques de rangement, hors accueil | À garder absolument |
|---|---|---|---|
| **Gestionnaire** | prochain tournoi en évidence, état des inscriptions, 1-3 actions réellement en attente, 3 raccourcis : Tournois, Équipes, Matchs | Joueurs / Notes : fiches privées et désistements ; Notifications ; Réglages et abonnement ; Paiements | demandes urgentes de validation, raccourcis opérationnels et mise en évidence des blocages de paiement *seulement si activés* |
| **Co-gestionnaire** | tournoi assigné, mission en cours, droits disponibles, bouton direct pour noter ou saisir un score | Mon profil et historique de notes ; détails des permissions ; statistiques complètes | ne jamais afficher un bouton interdit ou un état d'attente non actionnable |
| **Joueur simple** | prochain tournoi et mon inscription, mes actions (confirmer, payer, me désister), résultats récents, accès Mes SWÉ | Mon profil / ID, Mes stats détaillées, Mes groupes, découvertes, offres | aucune donnée privée admin, pas de marketing prioritaire devant la prochaine inscription |

## Règles UX communes

- Une **action** visible si et seulement si l'utilisateur peut vraiment la faire (permission serveur préservée). Sinon, lien d'explication plutôt que faux bouton.
- Une **notification** n'est pas une tâche : cloche + page dédiée, compteur des non lus ; ne pas multiplier des boîtes pleines sur l'accueil.
- Les collections privées et longues restent sous **liste recherchable ou volet repliable**.
- **État vide** compact : « Rien à traiter » sur une ligne, pas une grande carte vide.
- Chaque carte doit avoir un propriétaire précis (un seul module la monte) et un emplacement stable. Pas d'injection \`prepend\` concurrente dans l'accueil.
- Mobile : 1 colonne, actions primaires à portée du pouce ; pas de saut de scroll provoqué par le rendu asynchrone.
- Un rôle ne doit jamais voir une action d'un autre rôle par simple masquage cosmétique : maintenir les vérifications de permissions et RLS existantes.
- Vérifier le scénario multi-espace (organisateur d'un groupe, co-gestionnaire d'un autre) avant d'afficher le rôle et les tâches.

## Première correction incluse dans cette PR

- La section « Fiches des joueurs et désistements » quitte \`view-home\` pour rejoindre **\`view-players\`** (Joueurs / Notes).
- Elle devient un **volet repliable** réservé au gestionnaire, avec recherche des joueurs, notes et informations existantes conservées.
- Les 5 dernières alertes de désistement, auparavant affichées dans le bloc Notifications de l'accueil, rejoignent ce même volet protégé.
- Les appels de récupération des fiches administratives ne s'exécutent que lorsque **Joueurs / Notes** est réellement ouvert.
- Aucune table, aucun match ni aucune statistique de joueur n'est modifié. La PR ne modifie pas les rôles.

## Lot de refonte proposé, avant toute migration d'adresse

**Lot 2 — Accueil gestionnaire opérationnel**
- Déplacer le centre de notifications et le paramétrage push hors de l'accueil vers un espace identifiable.
- Les demandes en attente restent sur l'accueil **uniquement si elles existent** ; les autres restent consultables sous Joueurs.
- Mettre en avant le prochain tournoi et ses 1-3 actions critiques. Réduire les offres à un lien « Mon abonnement et mes options ».
- Éliminer les répétitions de statistiques et les cartes vides. Garantir un seul propriétaire de chaque carte.

**Lot 3 — Deux autres espaces**
- Co-gestionnaire : panneau de missions et permissions simples, profil et notes détaillées séparés.
- Joueur : prochain SWÉ, mon inscription, raccourcis utiles ; découvrir/organiser dans des écrans secondaires.

**Lot 4 — Démarrage et URL de la nouvelle interface**
- Conserver pour l'instant le domaine \`app.swetournament.fr\`, les liens d'inscription partagés et l'identité PWA. Ne pas créer une deuxième application involontairement.
- Décider **une URL canonique unique** après connexion, avec redirections sûres pour les anciennes entrées. Ne pas lancer des pages V52, V53, V54 successivement.
- \`index.html\` redirige aujourd'hui vers \`connexion.html\` si les paramètres d'entrée spéciale ne s'appliquent pas et que la session de retour n'est pas connue.
- \`manifest.webmanifest\` déclare \`id: "./"\`, \`start_url: "./?source=pwa"\` et \`scope: "./"\`. Ne pas changer \`id\` ni \`scope\` sans plan d'installation/migration.
- \`sw.js\` met les fichiers en cache, a une ancienne version qui peut encore contrôler des sessions déjà ouvertes, et \`app.js\` déclenche un rechargement après \`controllerchange\`. Remplacer ces mécanismes graduellemement par un déploiement atomique : manifest stable, fichiers JS/CSS identifiés par **hash de build**, page HTML **network-first / no-store**, version visible unique, bascule contrôlée avec message « Nouvelle version prête, actualiser » sans perdre une saisie en cours.
- Une URL « nouvelle » ne corrige pas à elle seule des scripts concurrents ou un ancien service worker. Préparer une compatibilité temporaire pour anciens liens et PWA déjà installées.
- Ajouter un **test de non-régression** avec les 3 rôles, login/logout, changement de groupe, navigation PWA depuis l'icône, mobile et hors-ligne avant bascule du trafic.

## Vérifications de sortie

- En admin, aucun listing de fiches ou de désistements sur Accueil ; il est disponible sous Joueurs / Notes (dépliable).
- En co-gestionnaire, aucune fiche privée administrative ; ses tâches et droits autorisés restent disponibles.
- En joueur simple, aucune fuite de fiche privée et aucun changement d'inscription.
- Aucun doublon du panneau lors du retour à Accueil, rechargement, changement de groupe ou reprise PWA.
- Sur \`app.swetournament.fr\`, la version et le comportement visibles sont cohérents à chaque rafraîchissement.
