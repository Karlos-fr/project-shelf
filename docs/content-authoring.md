# ProjectShelf — Guide d’alimentation du catalogue

Ce guide décrit **le flux éditorial** autour de `src/data/projects.ts`. Le schéma exécutable reste `src/domain/schema.ts` : ce document ne définit pas un second modèle concurrent.

## Flux obligatoire

**Source autorisée → proposition LLM EN/FR → relecture humaine → validation locale → build.**

1. Rassembler uniquement des sources que l’on est autorisé à utiliser : dépôt, README, documentation, historique Git, démo, captures et vidéos publiables.
2. Demander au LLM une proposition structurée en anglais et en français. Le LLM synthétise ; il ne doit jamais inventer un fait absent des sources.
3. Relire humainement les textes, liens, dates, statut, catégories et médias. Pour un dépôt privé, décider explicitement si la fiche elle-même peut être publique.
4. Lancer `npm run validate:catalogue`. Une erreur de schéma se corrige dans le catalogue ; on ne contourne pas le parseur.
5. Construire avec `npm run build`. Le pipeline projette alors les seules données publiables et copie seulement les médias référencés.

## Preuves attendues avant ajout

Pour chaque projet, conserver une source permettant de justifier :

- `createdAt` : naissance réelle du projet, pas automatiquement la date de création du dépôt si le projet existait avant ;
- `updatedAt` : dernière évolution **significative du projet**, pas une correction de README ou une simple retouche éditoriale ;
- `status` : état réellement observable (`prototype`, `active`, `stable`, `archived`) ;
- `features` : fonctionnalités qui existent déjà ; une roadmap reste une limitation ou une information éditoriale, pas une fonctionnalité livrée ;
- `stack` et `application` : technologies et plateformes réellement utilisées ;
- liens et démos : URL effectivement accessibles et honnêtement nommées ;
- médias : droit de publication, absence de secret et correspondance avec le projet montré.

Il n’existe **aucune auto-date** au build. Le LLM ne doit jamais déduire automatiquement `updatedAt` de l’heure courante ni faire remonter un projet à cause d’une modification de sa fiche.

`pageUpdatedAt` décrit, lorsqu’il est renseigné, une modification éditoriale de la page dans une langue donnée. Il reste distinct de `updatedAt`, qui décrit le projet.

## Dépôts privés, projets masqués et indexation

Une **source privée n’est pas un projet masqué**. Les trois notions sont indépendantes :

- `repositoryVisibility: "private"` : le dépôt source n’est pas public. La fiche peut néanmoins être publique ; son URL de dépôt est retirée de la projection publique.
- `hidden: true` : le projet est exclu du catalogue distribué, des catégories publiques, des routes générées et des données envoyées au navigateur.
- `indexable: false` : la fiche reste publique mais reçoit les directives SEO prévues pour ne pas être indexée et n’est pas traitée comme une page SEO normale.

Publier une fiche issue d’un dépôt privé est donc une **décision éditoriale explicite**. On ne publie jamais une note interne, une URL privée, un secret, une capture confidentielle ou un artefact non autorisé simplement parce qu’un LLM l’a trouvé dans la source.

## Ce que le LLM ne doit jamais inventer

Le LLM ne crée pas, en l’absence de preuve :

- une capture ou une vidéo ;
- une URL de démo, de release, de documentation ou de dépôt ;
- une mesure de performance ;
- une date ;
- un système d’exploitation pris en charge ;
- une fonctionnalité encore prévue mais non réalisée ;
- un statut plus flatteur que la réalité ;
- une note, une statistique ou un avis utilisateur.

Une information incertaine doit être omise, formulée comme limitation lorsqu’elle est utile, ou soumise à validation humaine.

## Champs du catalogue

La liste ci-dessous reprend les noms du schéma `src/domain/schema.ts`. Les champs non marqués facultatifs sont obligatoires.

### Racine

- `categories`: catégories traduites disponibles.
- `projects`: projets sources.

### Catégorie

- `id`: identifiant ASCII stable en minuscules, utilisable dans l’URL et les filtres.
- `label.en`, `label.fr`: libellés affichés.

### Projet

- `id`: identifiant stable du projet.
- `name`: nom propre, commun aux langues.
- `categories`: un ou plusieurs identifiants de catégories connues.
- `createdAt`, `updatedAt`: dates calendrier `YYYY-MM-DD` sourcées.
- `status`: `prototype`, `active`, `stable` ou `archived`.
- `repositoryVisibility`: `public` ou `private`.
- `repositoryUrl` *(facultatif)*: URL HTTPS du dépôt. Elle n’est exposée que si `repositoryVisibility` vaut `public`.
- `hidden`: exclusion complète de la publication lorsqu’il vaut `true`.
- `featured`: présence dans la sélection Featured.
- `featuredOrder` *(facultatif)*: entier positif pour l’ordre éditorial Featured.
- `stack`: technologies principales.
- `preview`: aperçu de carte.
- `media`: galerie ordonnée de fiche.
- `links`: actions publiques (`demo`, `website`, `release`, `documentation`).
- `content.en`, `content.fr`: contenu éditorial bilingue.
- `pageUpdatedAt` *(facultatif)*: date éditoriale `en` et/ou `fr`.
- `application` *(facultatif)*: métadonnées factuelles utilisées pour le JSON-LD logiciel.
- `indexable`: autorisation d’indexation de la fiche publique.

### Preview

- `poster`: image locale `/media/...` ou URL HTTPS.
- `video` *(facultatif)*: courte vidéo de preview.
- `posterDurationMs` *(facultatif)*: durée positive utilisée lorsque Featured n’a pas de vidéo.
- `focus` *(facultatif)*: `{ x, y }` entre 0 et 100 pour cadrer le poster 16:9.

### Média image

- `type: "image"`.
- `src`.
- `thumbnail` *(facultatif)*.
- `alt.en`, `alt.fr`.
- `width`, `height` *(facultatifs, positifs)*.

### Média vidéo

- `type: "video"`.
- `src`, `poster`.
- `thumbnail` *(facultatif)*.
- `title.en`, `title.fr`.
- `description.en`, `description.fr` *(facultatifs ensemble)*.
- `captions` *(facultatif)* : pistes avec `src`, `language` (`en` ou `fr`) et `label` bilingue.
- `durationSeconds`, `uploadDate`, `width`, `height` *(facultatifs)*. `uploadDate` ne doit jamais être inventée pour obtenir du balisage vidéo.

### Contenu localisé

- `tagline`.
- `description`.
- `features`.
- `limitations` *(facultatif)*.
- `about` *(facultatif)*.
- `seo` *(facultatif)* : `title`, `description`, `image`. Ne pas remplir mécaniquement si le contenu normal suffit.

### Application

- `category`: catégorie logicielle factuelle.
- `operatingSystems` *(facultatif)*.

## Médias et confidentialité

Les médias locaux de production restent sous le répertoire source prévu par le pipeline. Une référence locale doit commencer par `/media/`. Les médias distants utilisent uniquement HTTPS.

Avant publication :

- vérifier les droits de diffusion ;
- retirer métadonnées ou contenu confidentiel si nécessaire ;
- ne jamais déposer de secret, token, URL privée réutilisable ou information interne dans le dépôt ni dans son historique Git ;
- préférer une image complète dans la fiche plutôt qu’un recadrage destructif de l’interface ;
- fournir des sous-titres/transcription lorsqu’une narration utile existe.

Les médias synthétiques de `tests/fixtures/` servent uniquement aux tests. Ils ne constituent jamais le catalogue de production.

## Validation

Avant tout commit de contenu :

```sh
npm run validate:catalogue
npm run test:unit -- tests/unit/content-contract.test.ts tests/unit/schema.test.ts
```

Lorsqu’un média local est ajouté, exécuter ensuite le build complet afin que la copie sélective et l’audit de `dist` vérifient aussi le fichier.
