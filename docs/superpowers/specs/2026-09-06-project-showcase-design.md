# Vitrine de projets — Spécification de conception

**Date :** 6 septembre 2026  
**Version :** 1.0 — consolidation soumise à relecture  
**Porteur :** Karlos-fr  
**Chemin prévu dans le futur dépôt :** `docs/superpowers/specs/2026-09-06-project-showcase-design.md`

## 1. Objet et statut du document

Créer une vitrine publique des projets sélectionnés par l'auteur : portages de jeux, applications Windows, applications web et expérimentations. Le dépôt source d’un projet peut être public ou privé. Le visiteur doit comprendre rapidement ce que fait le projet, voir son rendu et accéder à sa démonstration lorsqu’elle existe.

La priorité est une présentation attractive et vivante, pas un CV. Aucun univers artificiel Windows, arcade, laboratoire, néon ou rétro ne s’impose à l’ensemble. Les réalisations constituent le contenu central.

Ce document consolide les choix validés dans la conversation. Les précisions nécessaires pour lever les ambiguïtés sont regroupées en section 2 ; elles ne sont pas présentées comme des décisions déjà explicitement approuvées. Il s’agit d’une conception, pas d’une implémentation ni d’un compte rendu de tests de l’application.

Le nom définitif du site, le dépôt, le domaine de production et le catalogue initial ne sont pas encore fournis. Ce sont des paramètres de mise en service, non des raisons de recommencer la conception. Aucun dépôt existant n’est désigné ou modifié par ce document.

## 2. Clarifications de conception à confirmer à la relecture

**Clic dans Featured.** Deux réponses antérieures proposaient des comportements incompatibles : ouvrir toute carte directement, ou activer un poster secondaire au premier clic puis ouvrir sa fiche au second. La proposition consolidée conserve un véritable lien vers la fiche sur chaque carte. Une commande distincte « Lire cet aperçu » permet de sélectionner un poster secondaire dans le carrousel. Les flèches changent également le projet actif. On évite ainsi un double clic implicite pour accéder à une fiche.

**Popin et HTML autonome.** La même fiche est présentée en popin lorsque JavaScript fonctionne, y compris à l’arrivée directe. Sans JavaScript, elle reste un article lisible dans la page. Aucun second contenu éditorial n’est maintenu pour ce repli.

**Retour après arrivée directe.** Fermer une fiche ouverte depuis la galerie restaure cette galerie. Fermer une fiche arrivée depuis Google ou un lien externe conduit à l’accueil localisé, sans appeler aveuglément `history.back()`. Le bouton Retour du navigateur conserve toutefois son comportement normal et peut revenir au site externe dans ce dernier cas.

**État partageable et défilement.** Recherche, catégories, tri et projet ouvert sont dans l’URL. La position de défilement et le focus sont conservés pour la navigation locale, dans l’état de navigation ; un lien partagé ne promet pas de reproduire une position en pixels.

**Dates.** `createdAt` et `updatedAt` décrivent le projet et pilotent le tri. Une date de modification éditoriale par langue peut compléter ces valeurs pour le sitemap. Le LLM ne doit pas confondre premier commit importé, date de création du dépôt et naissance réelle du projet.

**Publication.** `hidden` exclut un projet de l’export public, et pas seulement de la grille. Une fiche non indexable reste publique. Le caractère privé du dépôt source n’interdit pas une fiche référencée.

**Lecture automatique.** Autoplay est un comportement demandé, pas une garantie du navigateur. Les replis et les commandes d’arrêt font partie du fonctionnement normal, sans abandonner le carrousel validé. [S19]

## 3. Décisions principales validées

| Sujet | Décision |
|---|---|
| Organisation | Header minimal, Featured, All Projects, footer minimal |
| Présentation | Moderne et vivante, sans thème rétro imposé |
| Thème | Sombre uniquement, fond anthracite |
| Accent | Une couleur globale : bleu `#4DA3FF` |
| Cartes | Médias 16:9 ; quatre colonnes sur desktop comme base ajustable |
| Grille | Poster ; vidéo muette en boucle au survol desktop ; clic vers la fiche |
| Featured | Carrousel automatique ; un projet actif en vidéo et deux posters suivants sur desktop |
| Avancement | Fin de la preview vidéo, puis projet suivant ; pas de limite codée au nombre de Featured |
| Fiche | Popin riche commune à tous les projets, URL partageable |
| Galerie de fiche | Grand média au-dessus ; vignettes en dessous ; vidéo en première position lorsqu’elle existe |
| Catalogue | `projects.ts`, préparé et maintenu avec un LLM, relu avant publication |
| Catégories | Multiples par projet, issues des données, filtres OR, affichage alphabétique |
| Recherche | Instantanée, combinable avec les catégories et le tri |
| Dates | Création et mise à jour ; tri par mise à jour décroissante par défaut |
| Navigation | Recherche, catégories et tri dans l’URL ; état conservé à l’ouverture des fiches |
| Langues | Anglais et français ; détection automatique ; anglais par défaut |
| Technique | Astro + TypeScript + React pour l’interactivité |
| Hébergement | Export statique portable entre Vercel, GitHub Pages et OVH |
| Médias | Locaux par défaut ; URL externes également acceptées |
| SEO | Pages HTML par projet et langue, métadonnées, liens, canonical, hreflang, sitemap et vérifications |

## 4. Structure et identité visuelle

Le header affiche l’identité configurée, une éventuelle accroche courte, un lien GitHub et le sélecteur EN / FR. Aucun contact ni compte social ne doit être inventé. Les liens supplémentaires n’apparaissent que s’ils sont renseignés.

Featured précède All Projects. Le footer reste réduit aux liens réellement utiles et aux informations de site. La première version n’inclut ni section biographique longue, ni timeline, ni statistiques GitHub, ni blog, ni espace administrateur.

Le fond anthracite et les surfaces légèrement plus claires restent neutres. Les posters et vidéos fournissent la majorité des couleurs. L’accent bleu sert aux actions importantes, filtres sélectionnés, indicateurs de progression et focus. Il est défini dans un unique jeton de thème ; aucun champ d’accent par projet n’est prévu.

La maquette doit fixer les nuances exactes, espacements et typographies avant l’implémentation visuelle. Les coins sont légèrement arrondis, les ombres discrètes et les animations courtes. Pas de glassmorphism généralisé, de halo permanent ou de décoration qui concurrence les projets.

Les contrastes sont à mesurer sur le rendu réel, y compris pour les boutons bleus. Le bleu choisi ne vaut pas validation automatique de toutes les associations texte/fond.

## 5. Featured : carrousel de projets

### 5.1 Composition et ordre

Desktop : trois projets distincts visibles sur une ligne, avec le projet actif dominant visuellement et les deux suivants sur leur poster. Mobile : un seul projet principal, commandes accessibles et geste de balayage horizontal. Les règles de carte, de contenu et de fiche sont communes à All Projects ; seules la disposition et la politique de lecture changent.

La sélection comprend les projets publiés avec `featured: true`. `featuredOrder` les classe par ordre croissant. Sans ordre explicite, ils viennent après les projets ordonnés ; les égalités sont départagées par `updatedAt` décroissant puis par identifiant stable.

Aucune limite artificielle de Featured. Avec zéro projet, la section disparaît. Avec un seul, pas de navigation entre projets ni de rotation simulée ; avec deux, on ne duplique pas un projet pour remplir trois emplacements. Un compteur compact évite une interminable rangée de points lorsque la sélection grandit.

### 5.2 Lecture et progression

Seule la preview courte du projet actif démarre automatiquement, avec `muted` et `playsInline`. Elle n’est **pas en boucle** : l’événement de fin déclenche le passage au suivant. Le carrousel revient au début après le dernier projet.

La vidéo longue de la fiche n’est pas utilisée implicitement comme preview. En l’absence de preview, le poster reste six secondes, valeur globale surchargeable par projet, avant de passer au suivant. Les clips de six à douze secondes sont une recommandation éditoriale, pas une contrainte de format.

Si la lecture est refusée, si la vidéo échoue ou si elle ne peut pas démarrer après un délai technique borné, on conserve le poster et le délai de repli. Une commande de lecture manuelle reste disponible. Le carrousel ne reste jamais bloqué sur un chargement infini. La progression correspond à la vidéo ou au délai réellement utilisé. [S19]

### 5.3 Interaction et interruption

Les flèches sélectionnent immédiatement le précédent ou le suivant. Une commande de lecture sur un poster secondaire sélectionne ce projet sans ouvrir la fiche. Le lien principal de la carte ouvre la fiche, conformément à la clarification de la section 2.

Une commande visible permet d’arrêter et de relancer la lecture/rotation automatiques. Le survol suspend l’avancement : la vidéo peut finir, mais la carte ne se déplace pas sous la souris. Une interaction clavier ou une navigation manuelle arrête la rotation jusqu’à une demande explicite de reprise. Ces exigences suivent le principe de contrôle utilisateur du modèle de carrousel WAI. [S17]

L’ouverture d’une fiche, la sortie du carrousel de la zone visible ou le passage de l’onglet en arrière-plan suspendent ses médias et temporisations. Une reprise ne doit pas annuler un arrêt volontaire. Une préférence de réduction des animations désactive le démarrage automatique ; le visiteur conserve la possibilité de lancer un aperçu.

## 6. All Projects : grille, filtres et recherche

### 6.1 Cartes et responsive

La grille affiche tous les projets non masqués, y compris les Featured, sans pagination dans la première version. Les cartes utilisent un média 16:9, le nom, une accroche brève, les catégories et la date de mise à jour. Une longue liste de catégories est visuellement abrégée sans perdre les valeurs utilisées pour filtrer.

Base responsive proposée : quatre colonnes à partir de 1280 pixels, trois à partir de 1024, deux à partir de 640 et une en dessous. Ces seuils sont des valeurs de départ à vérifier sur maquette, pas un engagement rigide indépendamment de la largeur utile.

Desktop avec véritable capacité de survol : le poster est remplacé par la preview muette en boucle. À la sortie, la lecture s’arrête et le poster revient. Sur écran tactile, le poster reste affiché ; un toucher ouvre directement la fiche. Les actions ne dépendent jamais exclusivement d’un survol.

Le cadrage des cartes peut utiliser un recadrage configuré par projet. La fiche présente les médias complets, sans couper une interface Windows, des textes ou une capture verticale pour remplir artificiellement un 16:9.

### 6.2 Catégories

Les catégories sont entièrement définies dans `projects.ts`, avec identifiants stables et libellés EN/FR. Les filtres affichent uniquement les catégories référencées par au moins un projet publié. Ajouter une catégorie dans les données ne demande aucune modification de composant.

L’affichage suit l’ordre alphabétique des libellés dans la langue active. Les identifiants, et non les traductions, servent au filtrage et à l’URL.

Aucune catégorie sélectionnée signifie « tous les projets ». Plusieurs catégories sont combinées en **OR** : Windows et Audio sélectionnés affichent les projets appartenant à au moins une des deux. La liste des filtres ne disparaît pas au fur et à mesure de la recherche. Un bouton permet de réinitialiser les critères.

### 6.3 Recherche et tri

La recherche porte sur le nom, l’accroche, la description, les fonctionnalités, les catégories et la stack. Proposition de cohérence bilingue : indexer les textes des deux langues, afin qu’une recherche conservée lors d’un changement de langue ne devienne pas artificiellement introuvable.

La comparaison ignore la casse et les accents ; les mots de la requête doivent tous être présents dans les champs indexés du projet, sans obligation d’être dans le même champ. Aucun moteur externe, recherche sémantique, LLM en ligne ou correction floue n’est nécessaire.

Le résultat doit correspondre à la recherche **ET** au groupe de catégories sélectionnées. Il est trié ensuite. Le nombre de résultats et un état vide explicite sont affichés sans retirer les commandes permettant de corriger la recherche.

Le tri initial est `updatedAt` décroissant ; le second choix est `createdAt` décroissant. Les égalités sont départagées par l’autre date puis par identifiant stable. L’ordre est donc déterministe.

## 7. Fiche commune et galerie de médias

La fiche comporte le nom, l’accroche, le statut, les catégories, le média sélectionné, la bande de vignettes, la description, les fonctionnalités principales, la stack, les dates et les liens disponibles. Une section facultative sur la motivation ou les limites du projet peut compléter la description ; aucune section vide n’est rendue.

Le média principal est grand, avec des vignettes navigables en dessous, selon l’organisation souhaitée d’une fiche Steam. La première vignette représente une vidéo lorsqu’une vidéo de démonstration est fournie. Plusieurs vidéos sont possibles. Sans vidéo, la première capture est sélectionnée ; sans autre média, le poster sert de repli.

À l’ouverture, la vidéo initiale tente de démarrer muette, avec lecture intégrée et contrôles permettant pause, son et plein écran. Si autoplay est bloqué, le poster et le bouton Lecture restent visibles. Chaque nouvelle fiche démarre muette ; un son activé dans une autre fiche n’est pas réappliqué automatiquement. [S19]

Choisir une image met la vidéo en pause et la remplace dans la grande zone. Revenir sur une vidéo reprend la position conservée durant cette ouverture ; une vidéo terminée repart au début si le visiteur la relance. La galerie ne change pas automatiquement de média à la fin de la démonstration. Fermer la fiche arrête ses lectures ; une réouverture repart du premier média.

Les vignettes possèdent un libellé accessible. Les captures importantes ont une description alternative FR/EN. Les vidéos contenant une narration utile nécessitent des sous-titres ou une transcription correspondante avant publication ; un aperçu purement visuel n’invente pas de piste parlée.

Les liens portent des libellés honnêtes : essayer une démo web, ouvrir un site, consulter les sources ou accéder à une release. Une application Windows sans version web n’affiche pas un bouton « Live demo » trompeur. Pour un dépôt privé, on affiche l’indication de confidentialité du code, sans lien de dépôt public.

## 8. URL, historique et continuité de navigation

### 8.1 Routes publiques

Les routes sont pré-générées avec barre oblique finale :

```text
/en/
/fr/
/en/projects/spotifyamp/
/fr/projects/spotifyamp/
```

Un préfixe de déploiement configurable peut précéder ces chemins. Les exemples ne supposent donc pas que le site sera toujours hébergé à la racine d’un domaine.

Chaque carte est un vrai lien HTML. JavaScript intercepte la navigation ordinaire pour ouvrir la fiche ; ouvrir dans un nouvel onglet ou naviguer sans JavaScript doit continuer à fonctionner. Des liens explorables et de vraies réponses HTML constituent les bases techniques retenues, plutôt qu’une dépendance à des clics de robot. [S4]

### 8.2 État de galerie

```text
/fr/?categories=audio,windows&sort=created&q=spotify
/fr/projects/spotifyamp/?categories=audio,windows&sort=created&q=spotify
```

`sort=updated` est implicite et peut être omis. Les catégories sont dédupliquées, ordonnées par identifiant dans l’URL et encodées correctement. Les paramètres vides sont retirés. Une valeur de tri inconnue revient au tri par défaut ; une catégorie inconnue est ignorée. La normalisation ne crée pas d’entrée supplémentaire dans l’historique.

La recherche reste immédiatement visible dans la grille, mais ne crée pas une entrée d’historique par caractère : une session d’édition ajoute une entrée, ensuite remplacée pendant la saisie. Le changement de catégories ou de tri crée une étape de navigation. Toute saisie en attente est enregistrée avant d’ouvrir une fiche.

### 8.3 Ouverture et fermeture

Depuis la galerie, on enregistre sa position et le lien déclencheur puis on ajoute l’URL du projet à l’historique. Retour ferme la fiche ; Suivant la rouvre. La fermeture par croix ou Échap utilise ce retour uniquement lorsque l’application sait que l’entrée précédente est la galerie correspondante.

À l’arrivée directe, fermer remplace la route courante par l’accueil de la langue active, avec les mêmes critères. Aucun historique fictif ne doit piéger le visiteur. Un changement de langue conserve le projet et les critères ; fermer ensuite mène à la galerie de la langue désormais active.

Les changements de route actualisent le titre et les métadonnées depuis les mêmes données que les pages pré-générées. Recharger une URL de fiche doit fournir un HTML cohérent avec cet état de route. Les critères ne transforment pas une fiche projet en une autre ressource éditoriale.

La position exacte de défilement est une information locale de navigation. Sans historique local, on peut restaurer la sélection et les filtres, mais pas deviner le pixel où un autre visiteur s’était arrêté.

## 9. Bilingue et détection automatique

La langue explicite de l’URL est prioritaire. L’accueil sans préfixe `/` utilise ensuite le choix manuel mémorisé, puis la première langue prise en charge dans les préférences du navigateur, puis l’anglais. Les variantes telles que `fr-CA` et `en-US` sont ramenées à leur langue prise en charge. Aucune géolocalisation IP n’est utilisée.

L’entrée `/` fournit un contenu HTML anglais utilisable et des liens EN/FR. Un petit script peut l’orienter vers l’accueil choisi, en remplaçant l’entrée de navigation et en conservant les critères. Sans script, les liens restent fonctionnels. Cette entrée dupliquant l’anglais désigne `/en/` comme canonical et n’est pas ajoutée au sitemap.

Une visite sur `/fr/` ou `/en/` n’est jamais redirigée sur la seule base de la détection. Le sélecteur de langue mène au contenu équivalent, pas systématiquement à l’accueil. Google recommande des versions accessibles à des adresses distinctes et met en garde contre les redirections linguistiques qui empêchent leur consultation. [S5]

Les textes de projet, métadonnées, légendes et libellés d’interface existent dans les deux langues avant publication. Les noms propres, médias, liens et données techniques peuvent être communs. Le choix de langue est mémorisé localement lorsque le stockage est disponible ; un refus ou une erreur de stockage ne bloque pas le site.

## 10. Contrat des données et alimentation par LLM

### 10.1 Source de vérité

`src/data/projects.ts` contient des données déclaratives, sans logique d’extraction GitHub ni appel distant. Il exporte le catalogue des projets et le registre des catégories traduites. La configuration générale du site et les libellés d’interface peuvent être séparés ; les catégories de projet ne doivent pas être recodées ailleurs.

| Champ de projet | Rôle et règle |
|---|---|
| `id` | Identifiant stable unique, utilisé comme slug dans les deux langues |
| `name` | Nom propre du projet |
| `categories` | Tableau d’identifiants de catégories définies dans le même fichier |
| `createdAt` | Date de création documentée, format `YYYY-MM-DD` |
| `updatedAt` | Date d’évolution significative, au moins égale à `createdAt` |
| `status` | Identifiant de statut avec libellé traduit ; proposition : prototype, active, stable, archived |
| `repositoryVisibility` | public ou private ; ne détermine pas la publication de la fiche |
| `repositoryUrl` | Facultatif ; exporté et affiché uniquement pour une source publique |
| `hidden` | Booléen explicite ; exclut le projet de l’export public |
| `featured` | Appartenance à la sélection Featured |
| `featuredOrder` | Ordre éditorial facultatif, indépendant du tri général |
| `stack` | Liste courte de technologies réellement utilisées |
| `preview` | Poster obligatoire, vidéo courte facultative, durée de poster facultative, cadrage facultatif |
| `media` | Liste ordonnée des vidéos et captures de la fiche |
| `links` | Liens typés et facultatifs : demo, website, release, documentation |
| `content.en`, `content.fr` | Accroche, description, fonctionnalités, limites facultatives, SEO facultatif |
| `pageUpdatedAt.en`, `pageUpdatedAt.fr` | Dates éditoriales facultatives et vérifiées pour le sitemap |
| `indexable` | Booléen explicite, indépendant de `hidden` et de la visibilité du dépôt |

Chaque catégorie possède un identifiant stable et un libellé par langue. Chaque média possède un type, une source et une description adaptée ; les vidéos ajoutent un poster et peuvent préciser une miniature, une durée et une date réelle de publication pour le balisage vidéo. Un poster n’est pas une URL vidéo.

Les champs SEO optionnels par langue permettent de remplacer le titre et la description générés à partir du contenu. Une image de partage dédiée est facultative ; le poster sert de repli. Aucun champ `meta keywords` n’est nécessaire à cette conception.

### 10.2 Validation

Avant le build public : unicité des slugs, catégories référencées existantes, traductions obligatoires complètes, dates réelles et cohérentes, types de médias valides, absence de sources de dépôt privé dans les objets publics, schémas d’URL autorisés et existence des médias locaux.

Un problème structurel produit un échec explicite, pas une correction silencieuse inventée. Les textes de données sont échappés ; le catalogue ne fournit pas de HTML ou de scripts exécutables. Les URL externes de contenu sont HTTPS. Les chemins locaux sont relatifs à la racine logique de l’application et résolus avec son préfixe de déploiement.

### 10.3 Flux éditorial

Le LLM consulte uniquement les sources auxquelles il est autorisé à accéder, prépare les descriptions EN/FR et propose les dates et catégories. Il doit distinguer ce qui fonctionne déjà de ce qui figure dans une roadmap. Une date incertaine, une fonctionnalité non testée ou un lien de démo inaccessible n’est pas déclaré fiable par défaut.

L'auteur relit la publication, notamment pour les dépôts privés. Les médias sont fournis ou capturés séparément ; une image conceptuelle ne doit pas être présentée comme une capture réelle. Les notes de provenance et les informations non publiables restent hors des données exportées.

Le flux cible est : sources autorisées → proposition du LLM → relecture → données et médias validés → build statique. Aucun LLM ni token GitHub n’intervient pendant la visite du site.

## 11. Architecture et responsabilité des composants

Astro produit les routes HTML au build ; React apporte les interactions par hydratation de composants déjà rendus. Astro permet ce rendu initial avec les directives de client appropriées ; `client:only` est donc exclu pour le contenu principal à référencer. [S1, S2]

| Ensemble | Responsabilité |
|---|---|
| Validation/publication | Vérifier les données, retirer les projets masqués et les champs internes |
| Routes Astro | Produire les accueils, fiches EN/FR, sitemap et page 404 |
| Layout et SEO | Métadonnées issues d’un générateur commun, langue, identité et structure HTML |
| Contrôleur de navigation | Lire l’URL, synchroniser la galerie, ouvrir/fermer les fiches, restaurer l’état |
| `ProjectCard` | Présentation unique, utilisée dans la grille et Featured |
| `FeaturedCarousel` | Sélection active, lecture, avancement et commandes |
| `ProjectGrid` / filtres | Recherche, sélection OR, tri et compteur |
| `ProjectDetails` | Contenu unique de fiche, utilisable en article et dans la popin |
| `ProjectModal` | Présentation modale, focus, fermeture et isolation de l’arrière-plan |
| `MediaCarousel` | Sélection des médias et bande de vignettes |
| Coordination des médias | Arbitrage entre fiche, aperçu survolé et Featured |

Les composants d’une même zone interactive peuvent partager une racine React pour éviter des états concurrents. Aucun composant indépendant par carte ne doit importer séparément tout le catalogue d’origine. Les pages directes et les popins réutilisent la même fiche ; on n’écrit pas une version SEO divergente.

Le build peut générer des fichiers statiques de détail chargés à l’ouverture d’une fiche, plutôt que sérialiser toutes les galeries et descriptions dans l’accueil. Ce ne sont pas des API serveur : il s’agit de fichiers publics, construits à partir des seules données autorisées. La page HTML directe contient déjà le détail du projet concerné.

Une panne de chargement du détail depuis la galerie offre un lien vers la vraie page. Sans JavaScript, les fiches et liens restent accessibles ; recherche, filtres et rotation ne prétendent pas fonctionner et leurs commandes sont masquées ou remplacées par un message approprié.

## 12. Médias, performance et accessibilité

Posters et captures sont optimisés, avec WebP comme base et AVIF possible lorsque les variantes sont produites. Les previews locales utilisent MP4/H.264 comme cible de départ, à vérifier sur les navigateurs de recette. Les composants acceptent aussi des URL externes stables ; aucun lecteur tiers n’est imposé.

Le HTML initial ne déclenche pas les automatismes avant la prise en compte des préférences de mouvement. La vidéo principale de la fiche reste identifiable et lisible manuellement dans ce HTML ; les previews décoratives de la grille ne chargent leur source qu’à la demande.

Les originaux peuvent rester dans le dépôt, mais seuls les médias nécessaires aux projets publiés sont copiés dans la sortie. Une vidéo lourde peut être déplacée vers un stockage externe sans modifier les composants. Le budget média doit être mesuré avant de promettre une bonne performance avec un catalogue réel.

Priorité de lecture proposée : fiche ouverte, puis aperçu de carte survolée, puis Featured. Le lecteur moins prioritaire est suspendu ; on évite de faire tourner plusieurs vidéos décoratives simultanément. Aucun téléchargement de toutes les previews au chargement : poster principal prioritaire, autres images différées, sources vidéo attachées à la demande.

Les dimensions sont réservées pour éviter les sauts de mise en page. Dans une fiche, les captures conservent leur ratio complet. Le texte reste lisible avec agrandissement et les commandes sont utilisables au clavier et au toucher.

La popin possède un nom accessible, un focus initial approprié, une navigation clavier contenue, une fermeture par Échap et une restauration du focus. L’arrière-plan est inerte tant qu’elle est ouverte. À l’arrivée directe sans déclencheur, la fermeture donne le focus à une destination logique de la galerie. [S18]

Les préférences de réduction des animations priment sur les effets décoratifs automatiques. Les flèches et vignettes restent utilisables sans balayage. La lecture, la pause et l’ouverture d’une fiche ne doivent jamais être déclenchées uniquement par la couleur ou une animation.

Objectifs après mesure : LCP au plus 2,5 secondes, INP au plus 200 millisecondes et CLS au plus 0,1. Ils ne sont pas des performances déjà obtenues. Ces seuils se vérifient au 75e percentile des visites, en distinguant mobile et desktop lorsque les données sont suffisantes. Les mesures de laboratoire servent au diagnostic ; les observations réelles en production complètent la validation. [S10, S23]

## 13. SEO dès la première version

### 13.1 Contenu et exploration

Chaque projet publié fournit une page propre par langue, avec titre visible, description utile, fonctionnalités honnêtes, médias et liens. Les cartes du HTML initial permettent d’atteindre l’ensemble des projets sans attendre la rotation de Featured. Les chemins lisibles sont un choix d’organisation ; la présence d’un paramètre dans une URL n’est pas, à elle seule, une impossibilité de référencement. [S4, S7]

Un texte de projet ne doit pas devenir une succession de mots-clés. Il expose le résultat, le public concerné, l’intérêt du portage ou de l’application et ses limites. Les descriptions EN/FR ne sont pas uniquement des menus traduits autour d’un contenu laissé dans une autre langue. Aucun volume arbitraire de mots n’est imposé. [S15]

### 13.2 Métadonnées et partage

Chaque page possède un titre descriptif, une meta description, une langue HTML et une hiérarchie de titres cohérente. Les titres et descriptions doivent être distincts entre fiches. Le moteur peut choisir un autre titre ou extrait dans ses résultats : ces champs ne garantissent pas l’affichage exact souhaité. [S15]

Open Graph fournit le titre, la description, l’URL propre et une image partageable. L’image dédiée est privilégiée lorsqu’elle existe, sinon le poster est utilisé. Les adresses sont absolues et les images accessibles publiquement. Ces données facilitent la description du lien par les plateformes qui les exploitent ; elles ne sont pas une promesse de classement. [S20]

### 13.3 Canonical et langues

Chaque fiche EN ou FR a une canonical vers elle-même, sans recherche ni filtres. La fiche française ne désigne pas l’anglaise comme sa canonical. Les variantes de galerie désignent l’accueil de leur langue ; les variantes de fiche désignent cette fiche. La canonical est un signal, non un contrôle d’accès ni une interdiction absolue d’indexer une autre URL. [S7]

Les équivalents sont liés par `hreflang` EN et FR, avec autoréférence et correspondances réciproques. `x-default` pointe vers l’équivalent anglais. Les liens sont absolus et ciblent uniquement des versions réellement publiées et indexables. Les annotations HTML constituent l’implémentation principale pour ne pas entretenir trois systèmes parallèles. [S6]

Les critères restent utiles aux visiteurs mais ne génèrent ni pages statiques combinatoires ni catalogue de liens de filtres destiné aux robots. Les liens éditoriaux et le sitemap privilégient les routes propres.

### 13.4 Sitemap et robots

Le sitemap XML automatique contient les deux accueils localisés et les fiches indexables, avec leurs URL canoniques absolues. Il exclut les variantes à paramètres, l’entrée `/`, les projets masqués, les fiches non indexables et les erreurs. Une date `lastmod` n’est émise que si une modification significative de la page est connue ; sinon on l’omet, plutôt que d’utiliser systématiquement l’heure du build. [S8]

Les fiches explicitement non indexables et les builds de prévisualisation contiennent une directive `noindex` dès le HTML initial. Les pages dont on veut faire lire cette directive ne sont pas bloquées simultanément dans `robots.txt`. `noindex` n’est jamais présenté comme une protection de confidentialité. [S9]

Sur un déploiement en sous-répertoire, le contrôle du `robots.txt` à la racine de l’origine doit être vérifié : un fichier placé seulement dans le sous-répertoire n’est pas un remplacement de ce contrôle. Les directives meta de page ne dépendent pas de cette faculté. Le sitemap peut également être soumis explicitement dans Search Console. [S22]

### 13.5 Données structurées et vidéos

Les données structurées JSON-LD sont générées uniquement à partir d’informations vraies, visibles et adaptées au contenu. Un type décrivant un logiciel est utilisé lorsque le projet est bien une application ; aucune note, aucun avis ni prix ne sont inventés pour remplir des champs de résultat enrichi. L’éligibilité à un résultat enrichi n’est pas garantie par la seule validité syntaxique du JSON. [S13, S14]

`VideoObject` est émis pour les vidéos consultables sur la fiche lorsque les métadonnées nécessaires sont disponibles : nom, miniature, vraie date de publication, description pertinente et adresse de contenu stable. La date du projet ne remplace pas arbitrairement celle de la vidéo. [S12]

Une vidéo complémentaire dans une fiche ne garantit pas un résultat vidéo Google ; les fonctionnalités vidéo imposent notamment des exigences sur la place centrale de la vidéo. La première version n’ajoute donc pas des pages vidéo artificielles pour contourner cette limite. [S11]

### 13.6 Suivi

Après une publication autorisée : vérifier le domaine dans Search Console, soumettre le sitemap, inspecter un accueil et plusieurs fiches EN/FR, contrôler l’indexation puis suivre requêtes, impressions, clics et éventuelles erreurs. Ce suivi ne requiert pas d’ajouter un outil publicitaire à la vitrine. Il n’a pas été exécuté à ce stade. [S16]

L’objectif est de faciliter la découverte et la compréhension des projets, pas de garantir leur indexation, un trafic donné ou une première position.

## 14. Séparation entre privé, masqué et non indexable

| État | Visible dans la galerie | Page publique | Sitemap / référencement demandé |
|---|---|---|---|
| Dépôt public, fiche publiée | Oui | Oui | Oui si `indexable` |
| Dépôt privé, fiche publiée | Oui | Oui, sans lien de code privé | Oui si `indexable` |
| Fiche publiée, `indexable: false` | Oui | Oui | Non ; directive `noindex` |
| `hidden: true` | Non | Non | Non |

Les champs internes, projets masqués et médias exclusivement associés à ces projets sont exclus du HTML, JSON, scripts, index de recherche, plans de site et fichiers distribués. Le code client ne doit pas importer le fichier source intégral puis filtrer les données à l’affichage.

Point d’attention Astro : le contenu placé dans `public/` est copié tel quel au build. Ce dossier ne doit donc pas contenir de médias confidentiels ou de brouillons que l’on espère protéger avec `hidden`. Le pipeline utilise une liste de médias publiables, avec contrôle de la sortie. [S3]

La confidentialité du dépôt de la vitrine est une question distincte : publier son code source peut révéler ses fichiers d’entrée et son historique, même si le site généré retire certains projets. Les informations confidentielles ne doivent pas être commitées dans un dépôt public. Une ressource externe déjà publique n’est pas rendue privée par sa suppression du catalogue.

Aucun token, secret, fichier d’environnement ni détail extrait d’un dépôt privé sans validation éditoriale ne doit se retrouver dans la sortie. Les sites de démonstration liés restent responsables de leurs propres accès : une fiche publique ne permet pas de contourner leur authentification.

## 15. Build et hébergement portable

Le résultat attendu est un répertoire statique avec des `index.html` pour les routes, des ressources et une page 404. Astro permet de pré-générer ses routes à partir des données connues lors du build. La vitrine ne nécessite pas de runtime Node, base de données ou fonction serveur pour être consultée. [S1]

L’origine publique et le préfixe de chemin sont des paramètres de build. Liens, médias locaux, sitemap, canonical et hreflang en tiennent compte. Changer d’origine ou de préfixe peut nécessiter un nouveau build ; « portable » ne signifie pas copier aveuglément des canonicals contenant l’ancien domaine. [S3]

Vercel, OVH et GitHub Pages restent des cibles possibles, à valider sur la configuration retenue. Aucune réécriture générale vers l’accueil ne doit transformer les projets inexistants en réponses 200. Les routes directes et la réponse HTTP 404 sont testées sur la cible réelle. [S4]

Les builds et les tests du projet doivent pouvoir être exécutés localement, sans dépendre de jobs GitHub Actions lancés depuis cette conversation. Nuance importante : GitHub indique que son service Pages réalise lui-même la publication via un workflow Actions, même lorsque les fichiers ont déjà été construits et poussés sur une branche. Ce mécanisme de publication ne doit pas être confondu avec un besoin d’utiliser Actions pour développer ou tester ; une interdiction totale d’Actions conduirait à choisir une autre cible. [S21]

Un mode de build de prévisualisation force le non-référencement et ne publie pas un sitemap de production. En production, un domaine HTTPS explicite doit être fourni avant de produire les métadonnées définitives. Les tests de conception utilisent une origine fictive clairement réservée aux fixtures, jamais une adresse supposée appartenir à l'auteur.

## 16. Recette et critères d’acceptation

Les éléments ci-dessous sont des tests à réaliser, pas des tests déjà exécutés.

| ID | Vérification attendue |
|---|---|
| DATA-01 | Les identifiants dupliqués, traductions manquantes et catégories inconnues font échouer la validation |
| DATA-02 | Les dates sont valides ; une mise à jour antérieure à la création est rejetée |
| DATA-03 | Un projet masqué et ses marqueurs de test sont absents de toute la sortie publique |
| DATA-04 | Une source privée n’expose ni URL de dépôt privé ni provenance interne |
| GRID-01 | Quatre cartes à la largeur desktop cible ; adaptation trois, deux, une sans débordement |
| GRID-02 | Les médias des cartes restent en 16:9 ; les médias complets ne sont pas tronqués dans la fiche |
| GRID-03 | Le survol lance une preview muette ; la sortie remet le poster ; le toucher ouvre la fiche |
| FILTER-01 | Les catégories viennent des données et sont triées par libellé dans la langue active |
| FILTER-02 | OR entre catégories, puis intersection avec la recherche ; état vide et réinitialisation corrects |
| SORT-01 | Mise à jour décroissante par défaut ; création disponible ; égalités déterministes |
| FEATURED-01 | Un actif et deux posters si au moins trois projets ; cas zéro, un et deux corrects |
| FEATURED-02 | Pas de boucle vidéo sur l’actif ; fin de preview → projet suivant → retour au premier |
| FEATURED-03 | Absence, erreur, refus autoplay et chargement bloqué donnent un repli utilisable |
| FEATURED-04 | Flèches, sélection d’aperçu, lien de fiche et pause ont des actions distinctes |
| FEATURED-05 | Focus clavier, survol, fiche ouverte et onglet masqué empêchent l’avancement indésirable |
| DETAIL-01 | La fiche et son contenu sont identiques depuis Featured, la grille et une arrivée directe |
| DETAIL-02 | Vidéo initiale muette, contrôles accessibles, choix d’image, reprise et fermeture corrects |
| DETAIL-03 | La dernière vidéo ouverte ne conserve pas automatiquement l’activation du son |
| NAV-01 | Filtres, recherche, tri et projet ouvert survivent à un rechargement |
| NAV-02 | Retour/Suivant restaurent les états ; aucune entrée d’historique par caractère tapé |
| NAV-03 | La croix et Échap ne quittent pas le site à l’aveugle après arrivée externe |
| NAV-04 | Fermeture après changement de langue conserve cette langue et les critères |
| I18N-01 | URL explicite prioritaire ; choix mémorisé puis préférences navigateur puis anglais |
| I18N-02 | `fr-CA`, `en-US`, langue inconnue et stockage indisponible ont des résultats prévisibles |
| SEO-01 | Le HTML brut contient une fiche lisible, les métadonnées et de vrais liens, sans React exécuté |
| SEO-02 | Canonical unique, propre et de bonne langue pour chaque route, avec ou sans paramètres |
| SEO-03 | Hreflang réciproques, autoréférencés et absolus ; équivalent anglais pour x-default |
| SEO-04 | Sitemap sans paramètres, projets masqués ou non indexables ; dates éditoriales honnêtes |
| SEO-05 | Prévisualisation et fiches exclues portent `noindex` dès le HTML |
| SEO-06 | JSON-LD cohérent avec le contenu, sans avis, dates ou fonctionnalités fabriqués |
| A11Y-01 | Navigation clavier, focus modal, restauration, zoom et contraste vérifiés manuellement |
| A11Y-02 | Réduction des animations et pause désactivent les automatismes concernés |
| PERF-01 | Les ressources réseau initiales ne téléchargent pas toutes les vidéos |
| PERF-02 | Pas de lecture concurrente indésirable ; arrêt effectif des médias en arrière-plan |
| DEPLOY-01 | Build servi à la racine puis sous un préfixe : routes, médias et métadonnées corrects |
| DEPLOY-02 | Une fiche inconnue reçoit une vraie 404 sur l’hébergement choisi |
| FALLBACK-01 | Sans JavaScript, accueils, liens de langue, fiches et médias de base restent consultables |

La recette couvre au minimum desktop, mobile tactile, clavier seul, JavaScript désactivé et réseau ralenti. Elle vérifie Chromium, Firefox et Safari, avec un appareil iOS réel lorsque disponible ; une émulation ou un moteur WebKit automatisé ne doit pas être annoncé comme un test matériel réel.

Les rapports doivent distinguer contrôles automatiques du build, essais de navigateur et vérifications sur hébergement. Un score SEO de laboratoire ne prouve ni l’indexation ni le positionnement.

## 17. Périmètre exclu et suite

La première version n’intègre pas d’administration en ligne, d’authentification, de base de données, de synchronisation GitHub à l’exécution, de création automatique de vidéos, de moteur de recherche externe, de thème clair, de mode faux bureau Windows, de statistiques de popularité ni de commentaires visiteurs.

Les médias et dates réels du catalogue ne sont pas fabriqués dans ce document. Les prévisualisations graphiques futures doivent signaler les illustrations temporaires lorsqu’elles ne sont pas de vraies captures.

Étapes suivantes : relecture de cette consolidation, maquette de l’accueil desktop/mobile et de la fiche, puis plan d’implémentation découpé en tâches testables. Le choix du dépôt et les paramètres de publication seront renseignés avant toute intégration ou mise en ligne. Aucune implémentation ne découle automatiquement de la livraison de cette spécification.

## Références techniques

Sources primaires consultées le 6 septembre 2026. Les liens justifient les contraintes techniques ; les choix de présentation et de produit proviennent de la conversation ou des clarifications explicitement proposées ci-dessus.

- **[S1] Astro — Routing.** <https://docs.astro.build/en/guides/routing/>
- **[S2] Astro — Front-end frameworks.** <https://docs.astro.build/en/guides/framework-components/>
- **[S3] Astro — Configuration reference.** <https://docs.astro.build/en/reference/configuration-reference/>
- **[S4] Google — JavaScript SEO basics.** <https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics>
- **[S5] Google — Managing multilingual sites.** <https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites>
- **[S6] Google — Localized versions / hreflang.** <https://developers.google.com/search/docs/specialty/international/localized-versions>
- **[S7] Google — Canonical URLs.** <https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls>
- **[S8] Google — Build and submit a sitemap.** <https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap>
- **[S9] Google — Block indexing with noindex.** <https://developers.google.com/search/docs/crawling-indexing/block-indexing>
- **[S10] Google — Core Web Vitals.** <https://developers.google.com/search/docs/appearance/core-web-vitals>
- **[S11] Google — Video SEO best practices.** <https://developers.google.com/search/docs/appearance/video>
- **[S12] Google — Video structured data.** <https://developers.google.com/search/docs/appearance/structured-data/video>
- **[S13] Google — General structured data guidelines.** <https://developers.google.com/search/docs/appearance/structured-data/sd-policies>
- **[S14] Google — Software application structured data.** <https://developers.google.com/search/docs/appearance/structured-data/software-app>
- **[S15] Google — SEO starter guide.** <https://developers.google.com/search/docs/fundamentals/seo-starter-guide>
- **[S16] Google — Get started with Search Console.** <https://developers.google.com/search/docs/monitor-debug/search-console-start>
- **[S17] W3C WAI — Carousel pattern.** <https://www.w3.org/WAI/ARIA/apg/patterns/carousel/>
- **[S18] W3C WAI — Modal dialog pattern.** <https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/>
- **[S19] MDN — Autoplay guide.** <https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay>
- **[S20] Open Graph protocol.** <https://ogp.me/>
- **[S21] GitHub — Configuring a Pages publishing source.** <https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site>
- **[S22] Google — robots.txt specification et emplacement.** <https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec>
- **[S23] web.dev — Web Vitals et mesure au 75e percentile.** <https://web.dev/articles/vitals>
