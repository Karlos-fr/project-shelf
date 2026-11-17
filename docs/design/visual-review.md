# ProjectShelf — Revue visuelle T0

**Date :** 6 septembre 2026  
**Version :** 0.1 — proposition à valider, non approuvée  
**Périmètre :** références de conception et démonstrateur jetable ; aucune application Astro implémentée.

## Référentiel et état

La revue s'appuie sur le dépôt `Karlos-fr/project-shelf`, examiné au commit `ca91572b31545e15079cd66e8b62035ac7777b50`. Les fichiers locaux AGENT, plan et spécification ont été comparés aux identifiants de blobs publiés avant leur utilisation.

Le plan et `AGENT.md` imposent un point d'arrêt visuel après T0. La demande d'exécution autonome autorise la préparation de cette revue ; aucune approbation de ces images n'est présumée.

- [x] **T0 — Step 1 :** préparer les vues desktop, mobile et fiche, avec variantes de texte long et d'état vide.
- [x] **T0 — Step 2 :** présenter des illustrations explicitement temporaires et des données fictives.
- [ ] **T0 — Step 3 :** obtenir et consigner la validation de l'auteur. Les propositions de jetons ci-dessous ne sont pas encore approuvées.
- [ ] **T0 — Step 4 :** versionner les références approuvées. Aucun commit de ces références non validées n'a été poussé.

Les tâches T1 à T15 ne sont pas entamées. Le plan annoté fourni dans le dossier est une **copie de suivi local**, pas une modification du plan sur `main`.

## Consulter la revue

Ouvrir `project-shelf-preview.html` dans un navigateur avec JavaScript pour manipuler la maquette. Le fichier contient ses styles, scripts et illustrations ; il ne nécessite pas de serveur applicatif ou d'installation npm. L'ouverture par URL/file n'a pas été testée dans le navigateur de cet environnement ; les manipulations ont été vérifiées sur le document injecté directement dans Chromium. Les PNG permettent une consultation sans exécuter le fichier HTML.

| Vue | Référence |
|---|---|
| Accueil desktop, anglais, 1440 pixels | [home-desktop.png](home-desktop.png) |
| Accueil mobile, français, 390 pixels | [home-mobile.png](home-mobile.png) |
| Accueil mobile, page complète | [home-mobile-full.png](home-mobile-full.png) |
| Fiche desktop, français | [project-detail-desktop.png](project-detail-desktop.png) |
| Fiche mobile, français | [project-detail-mobile.png](project-detail-mobile.png) |
| Catégorie et titre français longs, desktop | [home-desktop-long-fr.png](home-desktop-long-fr.png) |
| Catégorie et titre français longs, mobile | [long-copy-mobile.png](long-copy-mobile.png) |
| Aucun résultat, desktop | [empty-state-desktop-fr.png](empty-state-desktop-fr.png) |
| Aucun résultat, mobile | [empty-state-mobile.png](empty-state-mobile.png) |

Dans la maquette, le lien « Review variants » donne accès aux différents états sur desktop. Les paramètres de revue `?lang=fr&view=long`, `?lang=fr&view=empty` et `?lang=fr&view=detail` permettent également de sélectionner une variante lors d'une ouverture du fichier. Ces paramètres sont réservés au démonstrateur : ils ne remplacent pas les routes de production approuvées.

## Direction proposée

Une interface sombre, structurée et relativement dense. L'identité de l'auteur reste au premier plan ; le nom ProjectShelf figure dans la signature, pas comme marque principale de sa vitrine personnelle.

Le header est minimal, suivi d'une accroche courte, de Featured et de la grille. Featured présente un projet dominant et deux suivants. Les posters conservent un ratio 16:9. Sur mobile, un seul Featured est visible ; la grille passe à une colonne.

La même fonction de présentation rend toutes les cartes de cette maquette. Le clic principal ouvre toujours la même fiche. Le bouton de sélection d'un aperçu secondaire reste séparé du lien, conformément à la clarification approuvée.

La fiche comporte un média agrandi, quatre vignettes dont la vidéo illustrative en premier, la description, les catégories, le statut, les fonctionnalités illustratives, les technologies, les dates et les liens exemples. Le sélecteur EN/FR reste accessible à l'intérieur de la fenêtre modale. Le fond devient inerte quand cette dernière est ouverte.

Les noms de carte sont limités à deux lignes pour éviter qu'un titre long ne multiplie la hauteur d'une rangée. Le nom complet reste le nom accessible du lien et apparaît dans la fiche. Les catégories longues se replient dans la barre de filtres ; elles ne font pas déborder la page.

## Jetons proposés pour l'implémentation visuelle T6

| Rôle | Valeur proposée |
|---|---|
| Fond | `#111418` |
| Surface | `#1A1F26` |
| Surface secondaire | `#222933` |
| Filet décoratif | `#303945` |
| Contour de contrôle | `#69788D` |
| Texte principal | `#F0F3F7` |
| Texte secondaire | `#ADB7C6` |
| Accent global approuvé | `#4DA3FF` |
| Texte sur accent | `#0A1726` |
| Police | `"Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif` |
| Largeur utile maximale | 1280 pixels CSS |
| Marge horizontale de conteneur | 48 pixels, puis 32 ; 20 sur mobile |
| Écart de grille | 20 pixels desktop, 17 mobile |
| Ratio des cartes | 16:9 |
| Rayon des cartes | 10 pixels |
| Rayon de la fiche desktop | 13 pixels ; plein écran sans rayon sur mobile |
| Titres | Accroche 39/30 px desktop/mobile ; section 23/21 px ; fiche 29/25 px |
| Nom de carte | 16 px desktop, 18 px mobile ; carte active 23/21 px |
| Corps principal de fiche | 13 px desktop, 12 px mobile ; interligne 1,75 |
| Filtres et métadonnées | 10 à 12 px selon rôle ; proposition à juger visuellement |
| Transitions | 150 ms ; désactivées avec réduction des animations |
| Grille | 4 colonnes dès 1280 px ; 3 dès 1024 ; 2 dès 640 ; 1 en dessous |

La taille des textes secondaires, en particulier sur mobile, est un point à juger lors de la validation : ces valeurs sont une proposition, pas une obligation héritée de la spécification. Les polices système peuvent produire de légères différences entre Linux, Windows et iOS ; aucune police n'est embarquée dans ce dossier.

### Contrastes calculés sur les couleurs uniformes

| Combinaison | Rapport calculé |
|---|---:|
| Texte principal / fond | 16,59:1 |
| Texte secondaire / fond | 9,12:1 |
| Texte secondaire / surface | 8,18:1 |
| Texte secondaire / surface secondaire | 7,23:1 |
| Accent / fond | 7,03:1 |
| Texte foncé / bouton bleu | 6,87:1 |
| Contour de contrôle / fond de champ | 3,81:1 |

Le texte principal clair sur bleu ne donnerait que **2,36:1** : les boutons bleus ont donc un texte foncé, pas blanc. Ces calculs ne constituent pas un audit complet d'accessibilité ; les illustrations, superpositions, contrôles natifs et associations non listées demandent leur propre examen.

## Interactions effectivement présentes dans le démonstrateur

Recherche immédiate, filtres multi-sélection OR, changement de tri, bascule EN/FR, sélection manuelle de Featured, ouverture et fermeture d'une fiche commune, choix d'une vignette, conservation du média lors d'une traduction de fiche, focus contenu dans le dialogue et restauration au déclencheur après fermeture.

Le bouton de démo, de téléchargement ou de code source affiche une explication de lien fictif ; il n'ouvre aucun faux dépôt. Une fiche d'exemple privée ne présente pas de bouton de source.

## Ce qui n'est pas implémenté à ce stade

Pas de lecteur vidéo réel, de preview au survol, de rotation automatique, de test de codec ni d'autoplay. Les triangles, pistes et boutons dessinés dans la zone média illustrent la disposition future et sont signalés comme tels.

Pas de routes Astro, de HTML éditorial pré-généré, de sitemap, de moteur de métadonnées, de canonical, de hreflang ou de données structurées de production. Aucun résultat SEO ni aucune performance terrain ne sont revendiqués.

Pas de véritable catalogue de l'auteur, de lecture GitHub/LLM, de pipeline de publication, d'historique applicatif, de restauration de scroll inter-routes ni de détection de langue persistante. Les comportements démontrés dans ce fichier jetable ne cochent aucune des tâches applicatives T1 à T15.

Sans JavaScript, le démonstrateur fournit seulement son cadre et un avertissement. Cela n'est pas le repli prévu pour l'application finale : les PNG sont le support de revue sans JavaScript, et T5 devra implémenter le vrai contenu HTML autonome.

## Données et illustrations

Les huit noms de projet, accroches, dates, catégories, stacks, liens et fonctionnalités sont des **fixtures fictives**. Ils n'affirment rien sur SpotifyAmp, Quake 2 JS, L3D Studio ou un autre dépôt réel de l'auteur.

Les SVG sont des illustrations originales préparées pour examiner les cartes. Ils ne sont ni des captures de logiciels réels ni des photos du matériel de l'auteur. Leur mention « Illustration temporaire » est visible sur chaque poster. Les illustrations ne sont pas destinées à constituer le catalogue de production.

Le header conserve seulement l'identité et le lien GitHub connus dans la conversation. Aucun contact, compte social supplémentaire, résultat d'audience ou fonctionnalité de projet réel n'est inventé.

## Vérification exécutée

**Chromium 144.0.7559.96, Playwright Python, document injecté directement avec `set_content`.** Les navigations `file://` et HTTP local sont bloquées par la politique du navigateur de cet environnement ; aucune politique n'a été désactivée. La méthode retenue permet de contrôler le rendu et les interactions du contenu fourni, pas le chargement d'une page via son URL.

La suite de revue a exécuté **57 assertions**, toutes réussies lors de la dernière exécution. Les répétitions de Tab comptent comme des assertions distinctes ; il ne s'agit pas de 57 fonctionnalités de l'application finale.

Contrôles : colonnes et débordements aux largeurs 320, 390, 639, 640, 768, 1024 et 1440 ; ratio 16:9 ; Featured 1+2 ou 1 ; filtres OR ; recherche ; dates de tri ; traduction ; états vides ; média initial ; changement de vignette ; sélection linguistique dans la fiche ; focus, Échap et retour au déclencheur ; absence de fausse source privée ; aucune erreur JavaScript observée.

Les images principales ont été inspectées visuellement, puis les contrôles ont été rejoués après correction. Voir `verification.json` pour les résultats détaillés.

Corrections apportées pendant cette revue, sans demande de correction visuelle encore reçue de l'auteur : retour à la ligne du tri sur 320 px, boucle Tab explicite dans la fiche, restauration asynchrone du déclencheur après une traduction, accès EN/FR dans la fiche et limitation des noms de carte à deux lignes.

**Non exécuté :** Safari/iOS réel, Firefox, lecture vidéo, test de chargement file/URL, navigation SEO, lecteur d'écran, hébergement et build Astro. Aucun contrôle de ces domaines n'est marqué réussi.

## Reproduire les références

Les scripts sous `review-tools/` sont des outils de revue jetables, documentés en français. Ils ne doivent pas être déplacés dans `src/` pour contourner le plan.

```sh
python review-tools/make_review.py
python review-tools/verify_review.py
```

Le second script nécessite Playwright pour Python et un Chromium installé. Il utilise un exécutable `chromium` disponible sur le PATH, ou le navigateur Chromium de Playwright. Les captures et le rapport sont réécrits sous `docs/design/`. Il n'installe rien, ne déclenche pas GitHub Actions et n'effectue aucun push.

Références techniques consultées : [captures Playwright](https://playwright.dev/python/docs/screenshots) ; [modèle de dialogue modal WAI](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/). Ces références concernent les méthodes de revue, pas une validation automatique du produit.

## Point d'arrêt

La direction visuelle ci-dessus est proposée à l'auteur. Après sa validation explicite, consigner la décision et les éventuelles corrections, versionner les références acceptées et passer à T1 dans le respect du plan. **Cette revue ne vaut pas sa propre approbation.**
