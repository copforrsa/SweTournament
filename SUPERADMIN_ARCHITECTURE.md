# Architecture cible — Super Admin SWÉ

## Objectif

Séparer progressivement l'administration globale de l'application organisateur afin d'arrêter l'empilement de hotfixs et d'obtenir une navigation stable.

Sous-domaine cible : `admin.swetournament.fr`

Application organisateur : `app.swetournament.fr`

Les deux interfaces continuent d'utiliser le même backend Supabase et les mêmes données. Le rôle Super Admin reste vérifié côté backend/RPC et jamais uniquement dans l'interface.

## Routeur unique

À partir de V42.56, un seul routeur Super Admin doit être chargé :

`hotfix-v4250-superadmin-stable.js`

Le bootstrap historique et `hotfix-v4251-superadmin-commerce-authority.js` ne doivent plus être chargés. Les autres modules Super Admin ne doivent être que des renderers ou des contrôleurs métier et ne doivent jamais changer eux-mêmes l'onglet actif.

Routes officielles :

- `overview` — Vue d'ensemble
- `spaces` — Espaces clients
- `organizers` — Organisateurs
- `players` — Joueurs SWÉ
- `subscriptions` — Abonnements & modules
- `venues` — Complexes & terrains
- `visuals` — Visuels publics
- `payments` — Paiements & suivi
- `settings` — Paramètres plateforme
- `security` — Logs & sécurité
- `support` — Support

L'onglet actif est conservé dans `sessionStorage` via `SWE_SA_ACTIVE_VIEW`.

## Règles de stabilité

1. Un seul composant décide de la route active.
2. Aucun renderer ne doit écouter les classes du menu pour changer lui-même de page.
3. Les compteurs globaux sont visibles uniquement sur `overview`.
4. La session Supabase est l'autorité d'authentification.
5. Le menu Super Admin n'est affiché que lorsque `S.isSuperAdmin === true`.
6. Une perte transitoire de lecture de session ne doit pas afficher le login.
7. Les changements de données doivent rafraîchir uniquement la vue concernée ; éviter les `loadAll()` globaux.
8. Les nouveaux développements Super Admin doivent aller dans des modules propres et non dans de nouveaux `hotfix-v42xx` de navigation.

## Migration vers admin.swetournament.fr

Le code peut rester dans le même dépôt pendant la transition, mais le sous-domaine doit avoir son propre point d'entrée à terme.

Étapes :

1. stabiliser V42.56 avec le routeur unique ;
2. déplacer le shell et les renderers Super Admin dans un dossier/module dédié ;
3. créer un point d'entrée dédié pour `admin.swetournament.fr` ;
4. configurer le DNS et l'hébergement du sous-domaine ;
5. conserver `app.swetournament.fr` pour les organisateurs/joueurs ;
6. bloquer l'accès au sous-domaine admin pour tout compte non Super Admin ;
7. supprimer progressivement les anciens fichiers Super Admin une fois les fonctionnalités reprises et testées.

## Important pour GitHub Pages

Le dépôt utilise actuellement le domaine personnalisé `app.swetournament.fr` via le fichier `CNAME`. Le simple ajout d'un second CNAME DNS ne suffit pas forcément à publier `admin.swetournament.fr` sur le même site GitHub Pages avec son propre certificat. Le sous-domaine admin devra donc être configuré explicitement côté DNS/hébergement (OVH/Cloudflare ou autre point d'entrée) avant sa mise en ligne. Ne pas modifier le fichier `CNAME` de production tant que ce point n'est pas prêt.
