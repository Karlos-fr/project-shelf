# ProjectShelf — Approbation visuelle T0

**Approbation :** L'auteur a répondu « Je valide » à la livraison de la revue visuelle T0, le 6 septembre 2026. Cette réponse autorise la suite du plan après T0. Elle n'approuve pas à l'avance les résultats de tests ni un déploiement.

La maquette approuvée est le démonstrateur autonome `project-shelf-preview.html`, avec les captures desktop, mobile et fiches jointes à la livraison T0. Les huit projets illustratifs demeurent fictifs ; ils ne sont pas un catalogue de production.

## Jetons approuvés

| Rôle | Valeur |
|---|---|
| Fond | `#111418` |
| Surface / surface secondaire | `#1A1F26` / `#222933` |
| Filet décoratif / contour de contrôle | `#303945` / `#69788D` |
| Texte principal / secondaire | `#F0F3F7` / `#ADB7C6` |
| Accent / texte sur accent | `#4DA3FF` / `#0A1726` |
| Police | `"Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif` |
| Largeur utile maximale | 1280 pixels CSS |
| Marges de conteneur | 48 puis 32 pixels ; 20 sur mobile |
| Écart de grille | 20 pixels desktop ; 17 mobile |
| Colonnes | 4 dès 1280, 3 dès 1024, 2 dès 640, sinon 1 |
| Cartes | Médias 16:9 ; rayon de 10 pixels |
| Fiche | Rayon desktop de 13 pixels ; plein écran sans rayon sur mobile |
| Accroche / section / fiche | 39/30, 23/21, 29/25 pixels desktop/mobile |
| Nom de carte / carte active | 16/18 et 23/21 pixels desktop/mobile |
| Corps de fiche | 13/12 pixels desktop/mobile ; interligne 1,75 |
| Filtres et métadonnées | 10 à 12 pixels selon leur rôle |
| Transitions | 150 millisecondes ; désactivées avec réduction des animations |

Les rapports de contraste consignés lors de la revue concernent les couleurs uniformes : notamment 6,87:1 pour le texte foncé sur le bouton bleu. Ils ne prouvent pas un audit complet d'accessibilité ni la conformité d'un composant non encore implémenté.

## Traçabilité

Le manifeste `approved-manifest.json` identifie les fichiers validés par SHA-256. La revue `visual-review.md` est archivée dans Git. Le démonstrateur `project-shelf-preview.html` et les captures PNG originales restent dans la livraison T0 ; leurs empreintes SHA-256 et tailles sont consignées dans le manifeste afin de conserver une traçabilité vérifiable.

Les 57 assertions de la revue T0 proviennent de la session précédente, sur le démonstrateur injecté dans Chromium. Elles n'ont pas été rejouées ni transformées en tests Astro lors de cette étape. Aucune lecture vidéo réelle, aucun build Astro et aucun déploiement ne sont validés par cette approbation.

## Évolution « Cinéma » — 11 novembre 2026

À la demande de l'auteur, qui jugeait la direction T0 trop sobre, trois directions ont été maquettées (Galerie nocturne, Éditorial, Cinéma). **L'auteur a retenu « Cinéma ».** Elle remplace la présentation T0 sans changer l'architecture ni les invariants de la spécification :

- thème sombre uniquement, accent d'action unique `#4DA3FF` ; fond `#050608`, surfaces translucides ;
- police unique auto-hébergée **Bricolage Grotesque** (variable), graisse 800 pour les titres ;
- Featured devient une scène plein écran : poster du projet actif en décor, titre, accroche et appel « Voir le projet » superposés, projets suivants en vignettes ; rotation, pause et commandes clavier inchangées ;
- cartes de grille en 16:9 avec texte superposé sur le média, quatre colonnes desktop conservées ;
- popin avec voile flouté et entrée animée ; animations désactivées par `prefers-reduced-motion`.

Les jetons du tableau ci-dessus restent la trace historique de T0 ; les valeurs en vigueur sont dans `src/styles/tokens.css`. Les contrastes de la nouvelle direction n'ont pas fait l'objet d'un audit complet.
