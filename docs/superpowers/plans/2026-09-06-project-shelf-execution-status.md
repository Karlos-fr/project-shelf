# ProjectShelf — Suivi d’exécution du plan

**Date :** 7 septembre 2026. **Branche :** `feat/static-foundation`.

Ce journal complète `2026-09-06-project-shelf-implementation.md`. Il distingue les comportements réellement vérifiés des intégrations Astro/React qui doivent encore passer la recette complète avec les dépendances npm. `main` n’est pas modifiée et aucun déploiement n’a été effectué.

## T0 — Direction visuelle

- [x] Vues desktop, mobile, fiche, état vide et textes français longs préparés.
- [x] Médias fictifs signalés explicitement.
- [x] Validation de l'auteur consignée dans `docs/design/approval.md`.
- [ ] Archivage Git intégral des références T0 : la revue Markdown est archivée ; le démonstrateur HTML et les captures PNG restent dans la livraison T0 et sont tracés par SHA-256 dans `docs/design/approved-manifest.json`.

## T1 — Socle Astro

Le socle Astro/React, les routes de base, Vitest et Playwright sont configurés. Sur le poste Windows de l'auteur, `astro check` et `astro build` ont réussi le 7 septembre 2026, ainsi que les deux tests build et les deux premiers E2E du shell. La suite complète correspondant au lot T5–T15 ci-dessous n’a pas encore été exécutée sur ce poste après synchronisation du nouveau commit.

Le `package-lock.json` produit localement sur Windows n’est pas présent dans ce workspace Linux et n’est donc pas fabriqué artificiellement. Il devra être commité à partir d’une installation réelle avant de considérer la livraison reproductible.

## T2 — Catalogue et schéma

- [x] Validateurs de dates, slugs, nombres, liens HTTPS et médias locaux.
- [x] Modèle de projet bilingue et schéma Zod strict écrits.
- [x] Catalogue déclaratif et fixtures bilingues fournis.
- [x] Commande `validate:catalogue` et contrats de régression ajoutés.
- [ ] Exécution Vitest/Zod réelle du lot courant à refaire après synchronisation sur un poste avec `node_modules`.

## T3 — Publication et confidentialité

- [x] Projection par liste blanche vers les données publiques.
- [x] Exclusion des projets `hidden` et retrait des URL de dépôt privé.
- [x] Collecte explicite des médias publiables, confinement `realpath` et audit de `dist`.
- [x] Staging `.generated/public` et pipeline fixture/réel séparés.
- [x] Tests de liens portables Windows/Linux ; jonctions Windows utilisées sans exiger le mode développeur.

## T4 — Galerie, routes et langues

- [x] Détection EN/FR, anglais de repli et langue explicite prioritaire.
- [x] Recherche sans casse/accents, AND entre mots, OR entre catégories.
- [x] Tri déterministe `updatedAt`/`createdAt` et catégories localisées.
- [x] URL partageables, critères canoniques, préfixe de déploiement et médias absolus.

## T5–T7 — Pages, grille et navigation

- [x] Sources des routes `/en/`, `/fr/`, fiches projet et endpoint JSON écrites.
- [x] Même contenu de fiche utilisé pour SSR et popin cliente ; pas de `client:only` pour le contenu référencé.
- [x] Grille, filtres, recherche, tri et cartes réutilisables écrits.
- [x] Historique, fermeture/retour, restauration scroll/focus, chargement JSON annulable et validation stricte du détail écrits.
- [ ] Build Astro et E2E complets du lot courant à exécuter après synchronisation sur Windows.

## T8–T11 — Médias et Featured

- [x] Galerie type Steam : grand média, vignettes, vidéo prioritaire, lecture muette contrôlée.
- [x] Coordinateur média global avec priorités fiche > hover > Featured.
- [x] Preview desktop seulement avec `hover: hover` + `pointer: fine`, `preload=none` et reduced-motion respecté.
- [x] Machine Featured et composant : vidéo active non bouclée, deux posters secondaires, fallback poster borné, pause/reprise et navigation manuelle.
- [ ] Codec et comportements navigateur du lot courant à revalider avec Playwright installé.

## T12 — SEO

- [x] Canonical absolue, hreflang EN/FR + x-default, Open Graph et `html lang`.
- [x] Synchronisation des métadonnées lors des navigations clientes.
- [x] `sitemap.xml`, `robots.txt`, `SoftwareApplication` et `VideoObject` lorsque les données le permettent.
- [x] Cas de chaînes dangereuses et pages `noindex` couverts par contrats purs.
- [ ] Audit des HTML/XML construits par Astro à refaire sur le lot courant.

## T13 — Portabilité du déploiement

- [x] Origine/préfixe contrôlés séparément et support racine/sous-répertoire.
- [x] CLI portable Windows avec `pathToFileURL`.
- [x] Paquet statique local et vérificateur HTTP sans GitHub Actions.
- [ ] Deux builds complets racine/sous-répertoire à rejouer après synchronisation.

## T14 — Alimentation LLM

- [x] `docs/content-authoring.md` décrit source → proposition LLM EN/FR → relecture humaine → validation → build.
- [x] Modèle de projet documenté avec les mêmes noms que le schéma.
- [x] Dépôt privé, `hidden`, `indexable`, dates et médias sont distingués explicitement.

## T15 — Recette finale

- [x] Commande `npm run verify` et mesure locale des poids préparées.
- [x] Scénarios E2E accessibilité, performance et résilience écrits.
- [x] `docs/verification.md` cartographie les 37 critères d’acceptation et sépare preuves/contrôles manquants.
- [ ] `npm ci` + `npm run verify` complet du commit publié à exécuter sur Windows.
- [ ] Firefox/WebKit, mobile réel, URL de production et Search Console restent non réalisés.

## Vérification native fraîche avant publication de ce lot

Commande exécutée dans le workspace Linux avec Node **22.16.0** et npm **10.9.2** :

```text
npm run test:native
277 tests, 277 réussites, 0 échec, 0 ignoré
```

Cette preuve couvre les contrats Node indépendants d’Astro. Elle ne remplace pas `astro check`, Vitest, build Astro ni Playwright sur le nouveau lot.

## Prochaine recette après synchronisation GitHub

Sur le poste Windows disposant déjà des dépendances :

```powershell
git pull
npm run check
npm run test:native
npm run test:unit
npm run build -- --fixture --mode production --origin https://example.test
npm run test:build
npm run test:e2e
npm run measure:output
```

Si ces commandes passent sur le commit publié, mettre à jour ce journal avec les sorties réelles et committer le `package-lock.json` issu de l’installation Windows. Aucune GitHub Action n’est requise ni prévue.

## Audit et corrections du 11 novembre 2026

Poste Windows, Node 24.14.1. Corrections issues d’un audit de code :

- **JSON-LD** : `serializeJsonLd` échappe `<`, `>`, `&`, U+2028 et U+2029. Un texte éditorial contenant `</script>` ne peut plus fermer la balise insérée par `set:html` ; le même sérialiseur sert à la synchronisation cliente.
- **Source unique du schéma** : `src/domain/schema.ts` (zod/mini) décrit chaque champ une fois, conformément au plan (`z.infer`). Les types de `project.ts`, la projection publique du build et la validation du détail côté navigateur en dérivent ; le validateur manuel du chargeur et la reconstruction champ par champ sont supprimés. Le schéma est importé à la demande à l’ouverture d’une popin.
- **Résumés allégés** : `ProjectSummary` ne transporte plus le contenu complet des deux langues, seulement l’accroche (`tagline`) en plus des champs de carte, de tri et de Featured. Les props de l’îlot de l’accueil fixture passent de 6,4 Ko à 4,6 Ko.
- **Sentinelles d’audit** : `forbiddenMarkers` est déplacé dans `publish-catalogue.ts` et testé. Les routes des projets masqués sont toujours surveillées ; un nom, identifiant ou libellé masqué qui apparaît aussi dans le texte source d’un élément visible n’est plus retenu, pour éviter les faux positifs.
- **Divers** : mémoïsation effective des critères de galerie, clé de langue `LOCALE_STORAGE_KEY` partagée, messages Zod en français dans `validate:catalogue`.
- **Non modifié** : la bascule de la fiche HTML directe vers la popin après hydratation est conforme à la spécification (« y compris à l’arrivée directe »).

Recette fraîche : voir le tableau ci-dessous.

| Commande (`npm run verify`, PowerShell) | Résultat |
|---|---|
| `validate:catalogue` | catalogue valide (vide) |
| `test:native` | 285 réussis, 0 échec |
| build fixture production | 12 pages, audit de `dist` réussi |
| `check` | 0 erreur |
| `test:unit` | 252 réussis (17 fichiers) |
| `test:build` | 5 réussis |
| `test:e2e` (Chromium) | 11 réussis |
| `measure:output` | 495 911 octets au total, dont 250 762 de JavaScript |
