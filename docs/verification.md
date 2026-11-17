# ProjectShelf — Rapport de vérification

Ce document distingue **ce qui a réellement été exécuté** de ce qui reste à tester sur l’environnement final. Il ne transforme ni une maquette, ni une inspection de source, ni un test synthétique en preuve de production.

## État courant des preuves

Environnement de développement autonome : Linux, Node 22.16.0. Le registre npm n’est pas accessible dans cet environnement ; les tests nécessitant Astro, React, Zod, Vitest ou Playwright ne peuvent donc pas y être rejoués sur le dernier état tant que les dépendances ne sont pas présentes.

Preuves exécutées sur le dernier état avant la rédaction de ce rapport :

- `npm run test:native` : suite Node hors dépendances npm, verte ; le nombre exact est à reporter après la dernière passe T15.
- tests rouges puis verts du script `measure-output.ts` sur de vrais fichiers temporaires synthétiques.
- vérification source des invariants Astro/React, SEO, Featured et déploiement par la suite bootstrap native.

Une recette Windows antérieure a validé `astro check`, un build statique, les tests statiques et les E2E Chromium sur une version précédente de la branche. **Elle n’est pas utilisée comme preuve du dernier état** : la recette complète devra être rejouée après synchronisation du commit final.

## Commande de recette locale

Après installation reproductible des dépendances :

```sh
npm ci
npm run verify
```

`npm run verify` valide le catalogue réel, exécute la suite native, construit les fixtures, lance `astro check`, les tests Vitest, les tests statiques, les E2E Chromium et mesure le poids de `dist`. Il ne publie rien et ne lance aucune GitHub Action.

Pour les deux montages portables :

```sh
npm run build -- --fixture --mode production --origin https://example.test --base /
npm run build -- --fixture --mode production --origin https://example.test --base /project-shelf/
```

Les domaines `.test` ne sont autorisés en production que pour les fixtures explicites. Ils ne sont jamais une origine à mettre en ligne.

## Mesure du poids

```sh
npm run measure:output
```

La commande rapporte les octets JavaScript, images, vidéos, autres fichiers et le média individuel le plus lourd. **Aucun seuil arbitraire n’est imposé par défaut**, conformément à la spécification qui exige d’abord une mesure avec le vrai catalogue.

Des budgets explicites peuvent être testés par exemple avec :

```sh
npm run measure:output -- --max-js-bytes 250000 --max-media-bytes 5000000
```

Ces nombres sont uniquement un exemple de syntaxe, pas des budgets produit approuvés.

## Matrice des 37 critères

| Critère | Preuve prévue / état actuel |
|---|---|
| DATA-01 | Schéma strict + tests catalogue ; recette Vitest finale à rejouer. |
| DATA-02 | Relations dates/catégories/slugs testées nativement ; recette Vitest finale à rejouer. |
| DATA-03 | Projection par liste blanche, médias sélectionnés et audit `dist` ; build final à rejouer. |
| DATA-04 | Guide LLM/relecture + exemple schéma ; test documentaire Vitest à rejouer. |
| GRID-01 | Maquette approuvée + CSS responsive ; comparaison navigateur finale à rejouer. |
| GRID-02 | Ratio cartes et galerie complète implémentés ; recette navigateur finale à rejouer. |
| GRID-03 | Hover fin/mouvement réduit + lien tactile natif ; E2E final à rejouer. |
| FILTER-01 | OR catégories et recherche testés nativement ; UI finale à rejouer. |
| FILTER-02 | Catégories dynamiques et ordre localisé testés nativement ; UI finale à rejouer. |
| SORT-01 | `updatedAt` puis `createdAt` testés nativement ; UI finale à rejouer. |
| FEATURED-01 | Machine 0/1/2/N + composant 1 actif/2 posters ; E2E final à rejouer. |
| FEATURED-02 | Fin vidéo → suivant sans boucle testée au niveau machine/source ; navigateur final à rejouer. |
| FEATURED-03 | Repli poster 6 s/watchdog et contrôles implémentés ; navigateur final à rejouer. |
| FEATURED-04 | Même ouverture de fiche et même détail ; navigateur final à rejouer. |
| FEATURED-05 | Coordinateur média priorité détail > hover > Featured testé nativement. |
| DETAIL-01 | Pages HTML localisées + dialog client ; sans-JS et E2E final à rejouer. |
| DETAIL-02 | Galerie vidéo/image et priorité détail ; navigateur final à rejouer. |
| DETAIL-03 | Vidéo d’abord, vignettes et poster de repli ; navigateur final à rejouer. |
| NAV-01 | URL critères/projet/langue testée nativement. |
| NAV-02 | Recherche regroupée dans History testée nativement. |
| NAV-03 | Retour/fermeture arrivée galerie ou directe testés nativement ; E2E final à rejouer. |
| NAV-04 | Scroll/focus restaurés dans le composant ; E2E accessibilité final à rejouer. |
| I18N-01 | Priorité URL/mémoire/navigateur/anglais testée nativement. |
| I18N-02 | Bascule EN/FR et stockage refusé couverts ; E2E final à rejouer. |
| SEO-01 | HTML par langue/projet et head SSR implémentés ; build final à inspecter. |
| SEO-02 | canonical/hreflang et sync client testés nativement ; build final à inspecter. |
| SEO-03 | Sitemap indexable uniquement testé nativement ; build final à inspecter. |
| SEO-04 | URL à paramètres canonisées vers route propre testée nativement. |
| SEO-05 | 404 et `noindex` preview ; HTTP final à rejouer. |
| SEO-06 | JSON-LD factuel logiciel/vidéo testé nativement ; build final à inspecter. |
| A11Y-01 | Maquette + dialog/focus ; clavier, contraste et zoom manuels restent à faire. |
| A11Y-02 | Reduced motion et pause volontaire implémentés ; E2E final à rejouer. |
| PERF-01 | Copie média sélective/audit + script de mesure ; mesure avec vrai catalogue NON RÉALISÉE. |
| PERF-02 | Arbitre média testé ; réseau/médias bloqués E2E final à rejouer. |
| DEPLOY-01 | Préfixes/routes testés nativement ; deux builds Astro finaux à rejouer. |
| DEPLOY-02 | Paquet local et vérificateur HTTP sans publication ; hébergement réel NON RÉALISÉ. |
| FALLBACK-01 | Routes SSR et liens natifs ; test sans JavaScript final à rejouer. |

## Contrôles explicitement NON RÉALISÉS

- **iPhone/iPad réel : NON RÉALISÉ.** WebKit automatisé ne serait pas une preuve matérielle.
- **Firefox et WebKit sur le dernier build : NON RÉALISÉS** tant que leurs navigateurs Playwright ne sont pas installés et exécutés.
- **Contraste mesuré et zoom manuel sur le dernier rendu : NON RÉALISÉS.**
- **LCP/CLS laboratoire sur le vrai catalogue : NON RÉALISÉS.**
- **INP terrain au 75e percentile : NON RÉALISÉ** et impossible à déduire d’un test local.
- **URL de production, OVH/Vercel/GitHub Pages : NON RÉALISÉS** faute de cible de publication choisie/autorisée.
- **Search Console, indexation Google, impressions/clics : NON RÉALISÉS.**
- **Mise en ligne : NON RÉALISÉE.**

## Checklist manuelle avant livraison publique

1. Comparer desktop et mobile à `docs/design/approval.md` et aux références T0.
2. Tester clavier seul : ouverture fiche → focus titre → Tab/Shift+Tab → Échap → focus carte.
3. Vérifier le zoom navigateur et l’absence de contenu tronqué à 200 %.
4. Mesurer les contrastes réels des textes, focus et boutons sur les nuances finales.
5. Vérifier l’autoplay muet, le refus d’autoplay, le reduced motion et la pause volontaire.
6. Tester directement une route projet EN et FR avec JavaScript désactivé.
7. Vérifier une vraie 404 HTTP, les MIME/cache médias et l’absence de `noindex` en production.
8. Mesurer le poids avec le vrai catalogue avant de fixer ou annoncer un budget média.
