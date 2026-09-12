# SWÉ Tournament V43.81

- Le bouton de génération se débloque si seules les équipes préformées, comme l’équipe de Mika, sont encore présentes.
- Après génération, l’onglet Équipes conserve le tournoi actif et affiche immédiatement les compositions créées.
- La validation collaborative est activée avant le tirage pour les offres qui incluent ce module ; l’état des votes est ensuite rechargé avec les équipes.
- La suppression de la dernière équipe générée remet automatiquement l’état du tirage à zéro, tout en conservant les équipes préformées.
- Deux tests de non-régression couvrent le compteur désynchronisé et la protection d’un tirage réellement existant.
