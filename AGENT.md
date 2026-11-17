# Instructions Agent — ProjectShelf

Ce fichier définit les règles de travail pour les agents intervenant sur ce dépôt. Il complète la spécification et le plan d'implémentation ; il ne les remplace pas.

Les règles de commentaires et de discipline de développement sont adaptées de [`Karlos-fr/spotifyamp/AGENT.md`](https://github.com/Karlos-fr/spotifyamp/blob/main/AGENT.md), consulté le 6 septembre 2026 (blob `3769b3bb42c33cf4bba4e97e84be2cee4d86ef8b`). Les contraintes propres à Spotify, Winamp, C++ et à l'audio Windows ne sont pas transposées à ProjectShelf.

## Documents normatifs et périmètre

Avant toute modification non triviale, lire :

- `README.md` ;
- `docs/superpowers/specs/2026-09-06-project-showcase-design.md` ;
- `docs/superpowers/plans/2026-09-06-project-shelf-implementation.md` ;
- les éventuelles consignes locales et références de maquette relatives aux fichiers modifiés.

Conserver les décisions explicitement validées. Si une contradiction apparaît, la signaler et proposer l'ajustement minimal ; ne pas redéfinir silencieusement l'architecture. Les exemples abrégés des plans ne dispensent pas d'appliquer les règles de commentaires au code réellement ajouté.

Respecter l'ordre T0, puis T1 à T15 et les points de validation du plan. La validation de la spécification, du plan ou de ce fichier ne vaut pas validation de la maquette. Une tâche documentaire n'autorise ni le démarrage du développement applicatif ni un déploiement.

## Contexte et invariants d'architecture

ProjectShelf présente des projets sélectionnés : portages de jeux, applications Windows, applications web et expérimentations. Il s'agit d'une vitrine, pas d'un client Spotify ni d'un portfolio limité à une seule catégorie.

- Astro pré-génère les pages ; TypeScript strict et React assurent les interactions prévues. Ne pas remplacer cette architecture par une SPA exclusivement cliente, un CMS ou un serveur applicatif.
- Le site reste exportable en fichiers statiques, avec origine et préfixe configurables pour Vercel, GitHub Pages ou OVH. Ne pas imposer un service propriétaire à l'exécution.
- `src/data/projects.ts` reste un catalogue déclaratif, préparé avec un LLM puis relu. Aucun appel GitHub, LLM, base de données ou jeton n'intervient pendant une visite.
- Le catalogue brut est réservé au pipeline de publication. Le navigateur ne reçoit que les données explicitement autorisées à être publiques.
- Les catégories multiples proviennent des données. Le filtrage est OR entre catégories, combiné à la recherche ; le tri par défaut est `updatedAt` décroissant.
- Une seule carte et un seul contenu de fiche sont réutilisés dans Featured, la grille et les routes directes. Ne pas créer une seconde version éditoriale réservée au SEO.
- Le thème est sombre uniquement, avec accent global `#4DA3FF`. Les médias des cartes sont en 16:9 ; la grille desktop part de quatre colonnes.
- L'interface et le contenu publié sont disponibles en anglais et en français. L'anglais est le repli ; une langue explicite dans l'URL prime sur la détection.
- Les routes localisées fournissent leur contenu HTML sans attendre une interaction ou React. Ne pas utiliser `client:only` pour le contenu principal à référencer.
- Une demande de fonctionnalité ne permet pas de supprimer les garanties de SEO, d'accessibilité, de confidentialité ou de repli sans JavaScript.

## Organisation du code

Préférer des modules petits, explicites et centrés sur une seule responsabilité. Éviter les fichiers fourre-tout et les noms génériques `utils`, `helpers` ou `common` lorsqu'un nom métier décrit mieux la responsabilité.

Respecter la carte des fichiers du plan :

- `src/data/` porte le catalogue d'origine ; `src/domain/` porte les contrats, schémas et fonctions pures de galerie, routes et langue.
- `scripts/` valide, sélectionne, copie et audite les données et médias distribués. Il ne délègue pas l'exclusion des données confidentielles aux composants.
- `src/navigation/` gère URL, historique, chargements annulables et restauration. Les détails du navigateur restent hors des fonctions pures.
- `src/media/` et `src/featured/` portent les cycles de lecture et la rotation ; les composants ne réimplémentent pas chacun leur propre arbitrage.
- `src/components/` présente les données publiques et les interactions ; il ne lit ni les secrets ni le catalogue brut.
- `src/seo/` fournit les modèles communs au HTML généré et aux changements de route. `src/pages/` compose les routes, sans dupliquer ces règles.
- `src/i18n/` et `src/styles/` portent les libellés et la présentation. Les libellés des catégories restent dans les données du catalogue.

Ne pas accéder à `window`, `document`, au stockage navigateur ou à un élément vidéo au niveau d'un module exécuté pendant le build. Isoler ces accès dans le cycle client approprié et tester le rendu sans JavaScript.

## Règles de commentaires

Toutes les sources écrites manuellement doivent respecter les règles ci-dessous. Le code produit par un agent ou un LLM et destiné à être maintenu est soumis aux mêmes exigences : il n'est pas exempté au motif qu'un assistant l'a rédigé.

### Langue et champ d'application

Tous les nouveaux commentaires dans les fichiers source doivent être écrits en **français**.

Cette règle concerne notamment :

- TypeScript `.ts`, `.tsx`, `.mts`, `.cts`, y compris déclarations de types ;
- JavaScript `.js`, `.jsx`, `.mjs`, `.cjs` ;
- fichiers Astro `.astro`, frontmatter et commentaires de template ;
- CSS, HTML et commentaires JSX/TSX ;
- scripts shell, PowerShell et scripts d'outillage ;
- configurations écrites dans un langage acceptant les commentaires ;
- tests unitaires, tests de composants, tests de build, tests E2E et fixtures maintenues.

La langue des commentaires est indépendante de celle des identifiants, des clés de données et des textes de l'interface. Les contenus destinés aux visiteurs restent EN/FR selon la spécification ; ne pas les transformer en français uniquement pour satisfaire cette règle.

Exceptions :

- code réellement généré par un outil de build ou de génération, non maintenu à la main ;
- dépendances tierces ou code vendored non maintenu par ProjectShelf ;
- fichiers produits dans `dist/`, `.generated/`, `.astro/`, caches, rapports et artefacts ;
- syntaxe, annotation ou texte imposé mot pour mot par une API, un format, une licence ou un outil externe.

Ne pas modifier du code généré ou tiers uniquement pour satisfaire ces règles. Conserver les mentions légales. Les annotations techniques telles que `@vitest-environment` restent exactes ; l'explication qui les accompagne est en français.

Les fichiers JSON stricts, fichiers de verrouillage et formats binaires ne reçoivent pas de commentaires invalides. Documenter les contraintes utiles dans leur schéma ou le module propriétaire.

### En-tête de fichier

Chaque nouveau fichier source écrit manuellement doit commencer par un commentaire d'en-tête en français décrivant :

- le nom du module ;
- sa responsabilité ;
- ses frontières importantes avec les autres modules.

Pour TypeScript et JavaScript, y compris TSX/JSX et les configurations :

```ts
// ============================================================================
// GalleryFilters — Sélection des projets publics de la galerie
// ----------------------------------------------------------------------------
// Ce module applique la recherche, les catégories et le tri aux données publiques.
// Il ne lit ni le catalogue brut, ni le DOM, ni l'historique du navigateur.
// ============================================================================
```

Pour un fichier de types ou de déclarations, adapter le titre et les frontières :

```ts
// ============================================================================
// ProjectModels — Déclaration des modèles de projet
// ----------------------------------------------------------------------------
// Ce fichier expose les types dérivés du schéma validé du catalogue.
// Il ne publie aucune donnée et ne contient ni navigation ni rendu React.
// ============================================================================
```

Pour Astro, placer l'en-tête au début du frontmatter, après son délimiteur d'ouverture et avant les imports ou le code :

```astro
---
// ============================================================================
// ProjectPage — Composition de la route localisée d'une fiche
// ----------------------------------------------------------------------------
// Ce fichier compose le HTML initial à partir du projet public et de sa langue.
// Les métadonnées viennent du module SEO ; l'historique reste côté navigateur.
// ============================================================================
---
```

Pour CSS :

```css
/* ============================================================================
 * ThemeTokens — Définition du thème sombre commun
 * ----------------------------------------------------------------------------
 * Ce fichier centralise les couleurs et jetons de présentation validés.
 * Il ne définit ni thème clair ni accent spécifique à un projet.
 * ========================================================================= */
```

Pour HTML et les commentaires de template :

```html
<!-- =========================================================================
     StaticShell — Structure initiale de la vitrine
     -------------------------------------------------------------------------
     Ce fichier fournit une structure lisible sans JavaScript.
     La navigation interactive reste dans les modules dédiés.
     ========================================================================= -->
```

Dans JSX/TSX, utiliser la syntaxe de commentaire `{/* ... */}` à l'intérieur du rendu, et non un commentaire HTML.

Pour shell, PowerShell et configurations à commentaires `#` :

```sh
# =============================================================================
# VerifyExport — Vérification locale des fichiers distribués
# -----------------------------------------------------------------------------
# Ce script contrôle l'export sans lancer de publication distante.
# Il ne lit aucun secret et ne remplace pas les tests de navigation.
# =============================================================================
```

Placer l'en-tête avant les imports, déclarations, styles ou code, sans déplacer les éléments que le langage impose en tête : shebang, doctype ou délimiteur Astro. Dans ces cas, l'en-tête vient immédiatement après l'élément obligatoire, à l'emplacement syntaxiquement valide.

### Commentaires de fonctions, méthodes, composants et hooks

Chaque fonction ou méthode écrite manuellement doit avoir un commentaire d'en-tête en français décrivant :

- ce qu'elle fait ;
- ses paramètres, lorsque pertinent ;
- sa valeur de retour, lorsque pertinent ;
- ses effets de bord importants ;
- ses erreurs et conditions d'annulation, lorsqu'elles comptent ;
- les contraintes d'exécution, de durée de vie ou de concurrence pertinentes.

Utiliser cette structure, adaptée ici au contrat `loadProject(id, base, signal)` du plan :

```ts
// ----------------------------------------------------------------------------
// Charge le détail public d'un projet depuis l'export statique et le valide.
//
// Paramètres :
// - id : identifiant stable du projet demandé.
// - base : préfixe de déploiement utilisé pour résoudre le fichier public.
// - signal : signal d'annulation associé à la navigation en cours.
//
// Retour :
// - promesse du projet public validé, sans données internes du catalogue.
//
// Effets de bord :
// - lit un fichier JSON public par HTTP ; ne modifie pas l'historique.
//
// Erreurs :
// - rejette la promesse en cas d'annulation, d'échec HTTP ou de détail invalide.
//
// Contexte et durée de vie :
// - appelé côté navigateur ; la navigation propriétaire gère l'annulation
//   et ignore les réponses devenues obsolètes.
// ----------------------------------------------------------------------------
```

Omettre une rubrique uniquement lorsqu'elle ne s'applique réellement pas. Ne pas ajouter un paragraphe vide ou une contrainte de thread fictive à une fonction pure. Nommer les paramètres documentés exactement comme dans la signature.

Documenter notamment :

- fonctions exportées et internes ;
- méthodes publiques et privées, constructeurs à logique non triviale ;
- composants React, leurs props et les interactions qu'ils exposent ;
- hooks personnalisés et leurs conditions de nettoyage ;
- callbacks DOM, médias, réseau, temporisation et observateurs ;
- fonctions passées aux effets React et fonctions de nettoyage significatives ;
- lambdas ou fonctions fléchées contenant une logique significative ;
- fonctions de test, hooks de préparation/nettoyage et fabriques de fixtures ;
- helpers locaux écrits manuellement.

Une courte fonction nommée reste documentée. Pour une fonction fléchée avec logique significative au milieu d'une expression ou de JSX, l'extraire en fonction nommée si cela rend le contrat et son commentaire lisibles. Ne pas multiplier les enveloppes uniquement pour déplacer un commentaire.

Conserver les lignes séparatrices ouvrante et fermante autour de chaque commentaire de fonction. Un commentaire de fichier, de section ou de composant ne remplace pas la documentation de ses fonctions internes. Pour une surcharge sans implémentation distincte, un contrat commun peut couvrir les signatures adjacentes s'il décrit chaque forme.

### Constantes et données structurées

Chaque constante écrite manuellement doit avoir un commentaire dédié en français expliquant sa signification et, si utile, son unité ou sa provenance. Placer le commentaire immédiatement au-dessus de la constante.

La règle couvre les constantes globales et locales, seuils responsive, délais, clés de stockage, statuts, jetons de thème et valeurs de test. Une fonction déclarée avec `const` est décrite par son bloc de fonction ; ne pas ajouter une ligne redondante qui ne ferait que répéter ce bloc.

```ts
// Durée de présentation d'un poster Featured sans vidéo, en millisecondes.
export const DEFAULT_POSTER_DURATION_MS = 6_000;

// Largeur initiale de passage à quatre colonnes dans la grille, en pixels CSS.
export const DESKTOP_GRID_BREAKPOINT_PX = 1_280;
```

Ne pas regrouper plusieurs constantes différentes sous un commentaire vague commun. Pour une table de traductions, un objet de configuration, un catalogue ou une fixture formant une donnée structurée unique, un commentaire de table peut couvrir ses entrées explicites ; les valeurs surprenantes, unités ou exceptions restent expliquées au plus près.

Dans CSS, documenter également les variables personnalisées et valeurs de référence :

```css
:root {
  /* Accent global validé ; il reste identique quel que soit le projet ouvert. */
  --color-accent: #4da3ff;
}
```

### Qualité et maintien des commentaires

Les commentaires doivent expliquer en priorité :

- l'intention et les frontières entre modules ;
- les hypothèses, unités et provenances ;
- les effets de bord et les contraintes de build, de rendu initial ou de navigateur ;
- la durée de vie des abonnements, requêtes, temporisations et lecteurs vidéo ;
- les règles d'annulation, de reprise et de protection contre les réponses tardives ;
- la séparation entre données internes, données publiques et données non indexables ;
- les raisons des choix de SEO, d'historique, de langue et d'accessibilité ;
- les différences voulues entre Featured, survol de grille et lecture en fiche.

Éviter les commentaires qui paraphrasent simplement le code. Un commentaire obligatoire doit exprimer un contrat utile, pas du remplissage. Ne pas y annoncer une garantie que le code ou les tests ne fournissent pas.

Pour un comportement repris d'une référence externe complexe, documenter la raison et le point de référence utile, avec version ou commit lorsque pertinent ; ne pas coller de longs extraits externes.

Mettre les commentaires à jour avec le comportement. Lorsqu'une fonction, une constante ou un fichier existant est substantiellement modifié, mettre sa documentation au même niveau sans reformater des modules sans rapport avec la tâche.

## Tests, vérification et suivi du plan

Appliquer TDD aux fonctionnalités et corrections lorsqu'un test automatisé pertinent est possible : test du comportement attendu, échec observé pour la bonne raison, implémentation minimale, test ciblé réussi, régressions pertinentes, revue puis commit cohérent.

- Utiliser les outils et commandes du plan une fois réellement disponibles ; ne pas annoncer un script, un build ou un navigateur comme exécuté s'il ne l'est pas.
- Les suites ordinaires reposent sur des fixtures locales déterministes. Elles ne nécessitent pas de compte GitHub, de compte hébergeur ou d'appel LLM.
- Ne pas affaiblir silencieusement une assertion pour masquer une régression.
- Tester selon la tâche : fonctions pures, composants, export HTML/JSON, navigation navigateur, accès direct sans JavaScript, SEO, accessibilité et exclusion des données privées.
- Lancer builds et tests localement dans l'environnement disponible. Ne pas créer ni lancer des jobs GitHub Actions pour remplacer cette exécution. Ne pas supposer l'accès au PC Windows de l'auteur.
- Distinguer les contrôles locaux de la publication éventuellement gérée par le service GitHub Pages, comme le fait la spécification.
- Cocher les étapes du plan uniquement après leur réalisation vérifiée. Conserver non cochés les contrôles manuels, d'hébergement ou de navigateur non exécutés et expliquer la limite.
- Une modification documentaire seule nécessite une relecture des règles, chemins et différences ; elle ne justifie pas de prétendre que les tests de l'application ont passé.

## Confidentialité, contenu et SEO

Ne jamais committer ni publier de jeton GitHub, clé de déploiement, secret, fichier d'environnement personnel ou journal contenant des informations d'authentification.

- Un projet `hidden` et ses médias exclusivement associés sont exclus de tous les fichiers distribués, pas simplement masqués par CSS ou JavaScript.
- Un dépôt privé peut avoir une fiche publique autorisée ; son URL privée et les notes internes ne font pas partie de l'export public.
- `indexable: false` ne constitue pas une protection de confidentialité. La fiche reste publique, avec `noindex` et exclusion du sitemap.
- Ne pas placer les médias confidentiels dans un répertoire copié publiquement sans sélection. Auditer également HTML, JSON, scripts, index de recherche, médias et éventuelles source maps.
- Le LLM n'invente ni fonctionnalités réalisées, dates, captures, liens de démo, notes d'utilisateurs ni résultats de tests. Distinguer les fixtures et illustrations des preuves d'un projet réel.
- Valider les données et URL ; échapper les textes. Ne pas exécuter du HTML fourni par le catalogue.
- Les pages FR/EN, canonicals, alternates, métadonnées et données structurées proviennent du même contenu public. Ne pas créer de variantes indexables pour chaque filtre.
- Conserver les vrais liens, les routes directes, les erreurs 404 et le contenu sans JavaScript ; un score d'outil ne remplace pas ces contrôles.

## Médias, accessibilité et performance

Ne pas contourner l'arbitrage commun des lecteurs. Respecter les différences de boucle entre preview Featured et preview de grille, ainsi que les commandes d'arrêt et les replis d'autoplay du plan.

Nettoyer lecteurs, abonnements, observateurs et temporisations lors des changements de propriétaire. Respecter réduction des animations, onglet masqué, sortie de zone visible et focus clavier ; ne pas réactiver une rotation arrêtée volontairement.

Préserver le focus de la popin, la navigation clavier, le retour au déclencheur et les libellés EN/FR. Ne pas rendre une action accessible uniquement au survol.

Ne pas charger toutes les vidéos au démarrage. Justifier les optimisations par des mesures reproductibles ; ne pas annoncer une performance terrain ou une indexation Google à partir d'une simple inspection du code ou d'un score de laboratoire.

## Flux Git et modifications ciblées

Respecter les consignes explicites de l'utilisateur pour la branche et le périmètre. La règle propre à SpotifyAmp imposant systématiquement `main` n'est pas transposée : le plan ProjectShelf prévoit l'isolation du travail d'implémentation lorsque le dépôt est partagé. Une publication documentaire sur `main` ne supprime pas cette règle pour les tâches suivantes.

Ne pas supprimer, réinitialiser ou écraser le travail d'un autre agent. Lire l'état courant avant d'écrire et limiter chaque commit aux fichiers de la tâche. Ne pas modifier la spécification approuvée ou cocher des étapes sans justification.

Ne pas refactorer des modules sans rapport, introduire une dépendance lourde non prévue ou contourner une frontière pour gagner quelques lignes. Si un contrat doit évoluer, mettre à jour le code, les tests et la documentation concernés dans la même tâche après résolution de la contradiction.

## Vérification avant livraison

Avant d'annoncer une tâche terminée :

- vérifier le diff et le périmètre exact ;
- exécuter les tests ciblés, régressions et build applicables, et distinguer ceux qui ne sont pas disponibles ;
- relire les en-têtes de fichiers, fonctions, callbacks et constantes pour leur français, leur structure et leur exactitude ;
- vérifier les frontières d'architecture, les données distribuées et l'absence de secrets ;
- contrôler la cohérence avec la maquette validée, la spécification et l'étape courante du plan ;
- mettre à jour les cases et preuves uniquement pour ce qui a réellement été réalisé ;
- après un push, vérifier le fichier ou le commit publié ;
- ne jamais déclarer une publication, un résultat de test, une mesure ou un comportement navigateur comme validé sans preuve réelle.
