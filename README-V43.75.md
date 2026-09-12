# V43.75 — Version affichée et règles du Roi du terrain

- Source unique `build-version.js` pour le titre et le badge MAJ. Les anciens modules délèguent au même rendu.
- Détection d’une version plus récente sans rechargement automatique ni interruption de saisie.
- Règles affichées selon les inscrits confirmés : 15 (un terrain), 20, 25, 30 et 35 joueurs ; équipes de cinq et éventuels remplaçants.
- Règles communes des matchs nuls, dont TAB à trois tireurs pour désigner le premier Roi.
- Super Admin > Paramètres : édition des cinq cas et des règles communes. Les visiteurs ne reçoivent que leur cas.
- Cette version enrichit les explications ; elle ne modifie pas le moteur de rotation ni l’arbitrage automatique des matchs.
- Migration `supabase/king-rules-v4375.sql`. Tests SQL transactionnels avec rollback dans `tests/king-rules.sql`, et tests navigateur pour l’éditeur, les changements d’effectif et la conservation des saisies.
- Sauvegarde GitHub : `backup/v43.74-before-version-rules`. Le tournoi réel, ses inscrits et son lien partagé sont conservés.
