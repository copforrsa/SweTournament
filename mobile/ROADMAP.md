# SWÉ — application iOS et Android

Cadrage initial du 11 octobre 2026. État : audit initial effectué ; aucun binaire mobile construit ou soumis.

## Architecture proposée

Réutiliser l'interface SWÉ et Supabase avec Capacitor. Embarquer les ressources web dans les applications ; ne pas utiliser server.url vers le site de production comme architecture de livraison. Conserver le site et la PWA. Identifiant provisoire proposé : fr.swetournament.app ; à confirmer avant enregistrement auprès des stores.

## Constats vérifiés

- manifest.webmanifest, icônes 192/512 et affichage standalone existants.
- Aucun projet Capacitor, iOS ou Android identifié dans l'audit initial.
- Bibliothèque Supabase actuellement chargée depuis un CDN : intégrer une dépendance locale au paquet mobile.
- La CSP autorise les requêtes Supabase ; les origines mobiles et les retours de connexion devront être vérifiés.
- Nombreux modules web : produire un paquet reproductible depuis GitHub main, sans reprendre les modifications locales non publiées.
- Connexion, sélection joueur/organisateur et navigation doivent être testées après fermeture et relance de l'application.

## Étapes de réalisation

1. Créer un environnement mobile isolé et un build reproductible des ressources web avec dépendances et versions verrouillées.
2. Générer les projets iOS et Android ; adapter zones de sécurité, clavier, bouton Retour et ouverture des liens externes.
3. Intégrer les liens vers inscriptions, salons et direct, avec reprise après connexion.
4. Intégrer le partage natif et préparer les notifications pour inscriptions, votes et début de match, avec autorisations explicites.
5. Vérifier création/suppression de compte, politique de confidentialité, déclarations de données et parcours d'abonnement. Distinguer abonnement numérique et paiement d'une participation physique ; décider du parcours store après examen des règles applicables.
6. Construire une version Android interne et une version TestFlight ; vérifier sur appareils réels avant soumission.

## Recette avant publication

- Compte joueur, organisateur et co-gestionnaire : connexion, reprise de session, refresh et changements d'espace.
- Inscriptions, invités, retraits et glacière.
- Salon collégial, génération des équipes, confidentialité et verrouillage.
- Fast Conquête complet, qualifications dans les deux ordres, scores, départage, finales et notation.
- Liens partagés, retour Android, clavier, images, mise en veille et reprise réseau.
- Absence de fuite de notes confidentielles et de secrets serveur dans le paquet.
- Aucun résultat ou statistique officielle modifié par les tests.

## Éléments à fournir pour la distribution

Comptes Apple Developer / App Store Connect et Google Play Console du propriétaire, type de compte Google, nom public de l'application, entité éditrice et coordonnées support. Les accès de signature et de soumission sont nécessaires à la distribution, pas à l'audit ni à la préparation du code. Pas de promesse de date de publication tant que les comptes, les essais matériels et les validations stores ne sont pas établis.

## Références officielles

- https://capacitorjs.com/docs
- https://capacitorjs.com/docs/config
- https://developer.apple.com/app-store/review/guidelines/
- https://support.google.com/googleplay/android-developer/answer/14151465
