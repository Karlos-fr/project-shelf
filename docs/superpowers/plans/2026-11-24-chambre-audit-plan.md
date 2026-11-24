# La chambre — plan de corrections après audit

> Date : 24 novembre 2026. Statut : **lots 1 et 2 faits**, lots 3 à 5 à faire.
> Source : audit en lecture seule du 23 novembre 2026 (scène, page, PC et bureau XP, cube L3D, île LEGO, objets).
> Hors périmètre : le repli WebGL, écarté pour l'instant.

Les numéros de ligne sont ceux de l'audit, au commit `72ba7e2`. Relire le code avant chaque étape : ils ont pu bouger.

## Règles pour toutes les étapes

- Respecter [AGENT.md](../../../AGENT.md) : commentaires en français, en-tête par fichier, fonction et constante.
- Écrire d'abord un test qui échoue, quand c'est possible (TDD).
- Après chaque lot :
  - lancer `npm run test:unit`, puis `npm run check` ;
  - vérifier dans le navigateur, avec `?fps` dans l'URL pour toute étape de performance ;
  - faire un commit ciblé.
- Pour la performance, noter le FPS ou le nombre d'images dessinées **avant et après**, dans les mêmes conditions : même vue, même machine, PC allumé, cube éteint, sauf mention contraire.
- Ne déployer qu'avec l'accord explicite de l'auteur.

---

## Lot 1 — Bugs bloquants

### 1.1 Page de secours bloquée après un rechargement

- **Problème.** Un F5 pendant le chargement, ou dans les 6 s qui suivent, laisse le marqueur de `sessionStorage`. Ensuite, la page n'affiche plus que la liste des projets, à chaque rechargement, tant que l'onglet reste ouvert.
- **Fichiers.** [src/components/RoomPage.tsx:97](../../../src/components/RoomPage.tsx), et la même logique dans [src/components/ProjectShelf.tsx:73](../../../src/components/ProjectShelf.tsx).
- **Correctif.**
  - Dans la branche « marqueur présent », effacer le marqueur après avoir affiché la page de secours : on ne la saute qu'une fois.
  - Effacer aussi le marqueur à `pagehide`, pour une navigation ou un rechargement normaux.
  - Ajouter un bouton « Réessayer la 3D » sur la page de secours. Il efface le marqueur et recharge.
- **Tests.**
  - Test unitaire du garde-fou : marqueur posé, lecture, effacement.
  - Test e2e : poser le marqueur, charger la page, constater la page de secours, recharger, constater que la 3D se relance.

### 1.2 Fenêtres XP perdues quand l'écran sort du champ

- **Problème.** `overlayOn` repasse à faux dès que `screenQuad()` renvoie `null`, par exemple quand on se retourne dos au bureau. `XpDesktop` est alors démonté : fenêtres fermées, iframe rechargée, vidéo remise à zéro.
- **Fichiers.** [src/components/RoomPage.tsx:199](../../../src/components/RoomPage.tsx) et `:341-352`.
- **Correctif.**
  - Garder l'overlay monté tant que `pc !== 'off'`.
  - Quand le quadrilatère est `null`, le masquer avec `visibility: hidden`, sans démontage.
  - `setScreenOverlay` (reflets seuls sur la vitre) suit la visibilité, pas le montage.
- **Vérification.** Ouvrir IE, sortir, se retourner, revenir : la fenêtre est toujours là, à la même page.

### 1.3 Son et démos qui continuent hors de l'écran

- **Problème.** Une vidéo du Lecteur Windows Media ou une démo dans IE continue de tourner, son compris, quand on quitte la vue écran.
- **Fichiers.** [src/xp/XpPrograms.tsx:150-160](../../../src/xp/XpPrograms.tsx), [src/xp/XpDesktop.tsx](../../../src/xp/XpDesktop.tsx), [src/components/RoomPage.tsx](../../../src/components/RoomPage.tsx).
- **Correctif.**
  - Passer au bureau XP une propriété `active`, vraie seulement si `view === 'screen'`.
  - Si `active` est faux, mettre les `<video>` en pause. Mettre aussi en pause celles d'une fenêtre réduite.
  - Pour les iframes, remplacer le contenu par une capture figée ou par `about:blank`, en gardant l'URL pour la recharger au retour.
  - Ne pas relancer automatiquement une vidéo que l'utilisateur avait mise en pause.
- **Test.** Test de composant : `active` passe à faux, la méthode `pause()` de la vidéo est appelée.

### 1.4 Clavier capturé pendant le démarrage du PC

- **Problème.**
  - Pendant le BIOS, toute touche sauf Échap reçoit `preventDefault` : Tab et les flèches de l'étagère sont bloqués, même quand on regarde ailleurs.
  - Pendant le reste du démarrage, Maj, Ctrl ou Alt seuls sautent la séquence.
- **Fichier.** [src/components/RoomPage.tsx:303-304](../../../src/components/RoomPage.tsx).
- **Correctif.**
  - N'intercepter les touches que si `view === 'screen'`.
  - Ignorer Tab, `event.repeat` et les touches de modification seules (`Shift`, `Control`, `Alt`, `Meta`).
- **Test.** Test de composant du gestionnaire de touches : Tab n'est pas bloqué en BIOS, et Maj seul ne saute pas le démarrage.

### 1.5 Cube virtuel bloqué si le firmware ne charge pas

- **Problème.** Si le WebAssembly ne se charge pas (404, CSP, mémoire), le worker reste bloqué :
  - `booting` garde la promesse rejetée ;
  - `void serve()` produit un rejet non traité ;
  - les requêtes du studio s'empilent sans réponse ;
  - la LED reste sur `cloud-handshake`, qui clignote toutes les 100 ms.
- **Fichiers.** [src/room/virtual-cube-worker.ts:105-114](../../../src/room/virtual-cube-worker.ts) et `:150-161`, [src/room/virtual-cube.ts](../../../src/room/virtual-cube.ts).
- **Correctif.**
  - Si `boot()` échoue : remettre `booting = null`, répondre `failure()` à toute la file, poster `led: 'off'`.
  - Attraper l'erreur de `serve()`.
  - Côté page, ajouter `worker.onerror` et `onmessageerror`, qui éteignent le cube.

### 1.6 Course au redémarrage du firmware

- **Problème.** Lors d'un `System.reset()`, `restart()` remet `serving = false` alors que l'ancienne boucle `serve()` tourne encore. Celle-ci reprend la file 4,5 s plus tard et envoie les requêtes à un émulateur mort.
- **Fichier.** [src/room/virtual-cube-worker.ts:103-108](../../../src/room/virtual-cube-worker.ts) et `:150-161`.
- **Correctif.**
  - Relire l'émulateur courant à chaque tour de file (`await ensure()` dans la boucle).
  - Sortir de la boucle quand `generation` a changé.

### 1.7 EEPROM non contrôlée

- **Problème.** `HEAPU8.set(eeprom, _emu_eeprom())` accepte une EEPROM de longueur quelconque, venue de `localStorage`. Une valeur corrompue écrase le tas WebAssembly.
- **Fichiers.** [src/room/virtual-cube-worker.ts:79](../../../src/room/virtual-cube-worker.ts), [src/room/virtual-cube.ts](../../../src/room/virtual-cube.ts).
- **Correctif.** N'accepter que `eeprom.length === 2047`, sinon l'ignorer et effacer la clé. Le contrôle se fait dans la page et dans le worker.
- **Test.** Test unitaire du décodage : base64 invalide ou trop long, la valeur est rejetée.

### 1.8 Boutons du lecteur vidéo inertes

- **Problème.** `const video = videoRef.current` est lu pendant le rendu, donc il vaut `null` au premier rendu. Si la lecture automatique est refusée, Lecture, Stop, l'avance et le volume ne réagissent pas avant l'arrivée de `loadedmetadata`.
- **Fichier.** [src/xp/XpPrograms.tsx:158-160](../../../src/xp/XpPrograms.tsx).
- **Correctif.** Lire `videoRef.current` dans chaque gestionnaire.

---

## Lot 2 — Rendu à la demande et performance

Le rendu de la chambre ne dessine que si quelque chose bouge. Les étapes 2.1 à 2.3 rétablissent ce principe. Mesurer avec `?fps` : à l'arrêt, le nombre d'images dessinées doit cesser d'augmenter.

### 2.1 Placement du bureau XP calculé hors de React

- **Problème.** La boucle `follow` tourne à chaque `requestAnimationFrame`, même quand rien ne bouge. À chaque passage :
  - `getBoundingClientRect()` force un calcul de mise en page ;
  - une clé de 16 nombres est construite par `join(',')` ;
  - `quadTransform` est entièrement recalculé ;
  - `setScreenTransform` relance le rendu React de `RoomPage` et de `XpDesktop` pendant chaque mouvement de caméra.
  - L'overlay a sans doute une image de retard sur le canvas.
- **Fichiers.** [src/components/RoomPage.tsx:186-197](../../../src/components/RoomPage.tsx), [src/room/room-scene.ts](../../../src/room/room-scene.ts) (`screenQuad`, `frame`).
- **Correctif.**
  - La scène expose `onScreenQuad(callback)`, appelé depuis `frame()` seulement quand la caméra a bougé ou au redimensionnement.
  - La page écrit `style.transform` directement sur l'élément, via une ref, sans état React. Seule la visibilité (quadrilatère présent ou non) reste un état.
  - Mettre en cache la taille du canvas, mise à jour par `resize()`.
- **Mesure.** Images dessinées et rendus React (React Profiler) pendant 10 s à l'arrêt, avant et après.

### 2.2 Compteur du BIOS

- **Problème.** `useElapsed` fait un `setNow` à chaque image, sans fin, y compris quand le BIOS attend F1.
- **Fichier.** [src/xp/XpPower.tsx:174-183](../../../src/xp/XpPower.tsx).
- **Correctif.** Animer à chaque image seulement jusqu'à `haltAt`. Ensuite, mettre à jour au rythme du clignotement (480 ms) avec un `setTimeout`.

### 2.3 Respiration de la LED du Photon

- **Problème.** Une fois le firmware démarré, la LED « respire » sur 4 s. La clé `toFixed(3)` change à presque chaque image, donc `cubeChanged` force un rendu complet de la chambre, même cube hors champ.
- **Fichiers.** [src/room/l3d/photon-led.ts:25-37](../../../src/room/l3d/photon-led.ts), [src/room/l3d-cube.ts:62-67](../../../src/room/l3d-cube.ts).
- **Correctif.**
  - Limiter la respiration à environ 10 niveaux ou 10 i/s.
  - Ne la redessiner que si le cube est dans le champ (test du frustum sur sa boîte englobante).

### 2.4 Firmware en pause avec l'onglet

- **Problème.** `setRunning(false)` arrête le rendu, mais pas le worker : le `tick` du firmware et `pump` (33 ms) continuent.
- **Fichiers.** [src/room/room-scene.ts](../../../src/room/room-scene.ts) (`setRunning`), [src/room/virtual-cube.ts](../../../src/room/virtual-cube.ts), [src/room/virtual-cube-worker.ts](../../../src/room/virtual-cube-worker.ts).
- **Correctif.** Ajouter des messages `pause` et `resume` au protocole du worker, envoyés par `setRunning`.

### 2.5 Cube L3D dessiné hors champ

- **Problème.** `frustumCulled = false` sur les 4 `InstancedMesh` : les 512 LED, les barrettes et les broches sont dessinées même cube hors champ.
- **Fichier.** [src/room/l3d/cube-model.ts:304](../../../src/room/l3d/cube-model.ts).
- **Correctif.** Retirer la ligne et appeler `computeBoundingSphere()` après les `setMatrixAt`.
- **Vérification.** Faire le tour du cube pour s'assurer qu'aucune pièce ne disparaît à tort.

### 2.6 Lumière inutile du Photon

- **Problème.** Un `PointLight` de 9 cm de portée et d'intensité 0,004 est ajouté à la scène. Tous les matériaux l'évaluent à chaque pixel, et il entre dans `sceneLights` (les reflets de l'écran).
- **Fichier.** [src/room/l3d/photon-model.ts:225](../../../src/room/l3d/photon-model.ts) et `:259`.
- **Correctif.** Supprimer la lumière : l'émission de la lentille suffit. Vérifier le rendu en vue `cube`.

### 2.7 Appels de dessin

- **Étagère** ([src/room/pine-rack.ts:163-165](../../../src/room/pine-rack.ts)) :
  - 68 encoches ont chacune leur `BoxGeometry` : passer à un seul `InstancedMesh` ;
  - fusionner les lattes d'un même niveau (`mergeGeometries`) ;
  - réduire les 41 matériaux bois en partageant ceux qui ont les mêmes réglages.
- **Cube et Photon** ([src/room/l3d/cube-model.ts](../../../src/room/l3d/cube-model.ts), [photon-model.ts](../../../src/room/l3d/photon-model.ts)) :
  - fusionner par matériau à la construction ;
  - couper `castShadow` sur les pièces de moins de 3 mm.
- **Magazines** ([src/room/magazines.ts:146](../../../src/room/magazines.ts)) : un matériau par revue sur un atlas (couverture, dos, tranche, pages), au lieu de 6 groupes par revue.
- **Mesure.** Noter `renderer.info.render.calls`, en vue d'ensemble et en vue étagère, avant et après.

### 2.8 Île LEGO plus légère

- **Problème.** Les indices sont en `Uint32`, alors que les 15 groupes ont tous moins de 65 536 sommets.
- **Fichiers.** [scripts/convert-moc.py:92](../../../scripts/convert-moc.py), [src/room/lego-moc.ts:65](../../../src/room/lego-moc.ts), `content/room/moc/ile-du-tresor.bin`.
- **Correctif.**
  - Écrire `<u2` quand le groupe le permet, avec un drapeau dans l'en-tête et un alignement sur 2 octets.
  - Lire un `Uint16Array`.
  - Régénérer le `.bin`, qui doit passer d'environ 3,0 Mo à 2,0 Mo.

### 2.9 Bureau peint sur l'écran 3D

- **Problème.** `paintDesktop` télécharge l'affiche de chaque projet et dessine 1024 × 768, alors que le bureau HTML le recouvre presque toujours. L'horloge y est figée à l'heure du chargement.
- **Fichier.** [src/room/pc-model.ts:186-191](../../../src/room/pc-model.ts) et `:373-436`.
- **Correctif.** Ne peindre que le fond Bliss et la barre des tâches, sans les affiches. Ou peindre ce bureau à la demande, seulement quand l'overlay est absent.

### 2.10 Démineur qui se recadre en boucle

- **Problème.** `setInterval(fit, 200)` tourne tant que la fenêtre existe, même réduite. Si le plateau reste trop petit, `update` crée une nouvelle liste à chaque passage, d'où un rendu React perpétuel.
- **Fichiers.** [src/xp/XpPrograms.tsx:78-91](../../../src/xp/XpPrograms.tsx), [src/xp/XpDesktop.tsx:56-57](../../../src/xp/XpDesktop.tsx).
- **Correctif.**
  - Arrêter quand la fenêtre est réduite.
  - Ne rien modifier si le cadre est identique.
  - Remplacer l'intervalle par un `ResizeObserver`.

### 2.11 Test du pointeur à chaque mouvement de souris

- **Problème.** `pick()` lance un rayon contre toute la scène à chaque `pointermove`.
- **Fichier.** [src/components/RoomPage.tsx:251-281](../../../src/components/RoomPage.tsx).
- **Correctif.** Ne garder que la dernière position et tester au plus une fois par image.

### 2.12 Libération des ressources du cube

- **Problème.** Certaines ressources ne passent pas par `keep()` et ne sont pas libérées à la fermeture :
  - la texture `face.glow` ;
  - l'attribut `colours` ;
  - les `instanceMatrix` des `InstancedMesh`.
- **Fichiers.** [src/room/l3d-cube.ts:36-44](../../../src/room/l3d-cube.ts), [src/room/l3d/cube-model.ts:278](../../../src/room/l3d/cube-model.ts) et `:285`.
- **Correctif.** Appeler `dispose()` sur les `InstancedMesh`, et passer explicitement la texture et l'attribut à `keep`.

### 2.13 Qualité adaptative

- Plafonner la densité de pixels selon la taille du canvas, par exemple au plus environ 4 millions de pixels dessinés, au lieu de `min(devicePixelRatio, 2)`.
- Réduire les cartes d'ombre (2048 → 1024) sur les GPU intégrés, détectés via `adapter.info`, ou si le FPS mesuré au démarrage est bas.
- Mesurer sur au moins deux machines avant de garder un réglage.

---

## Lot 3 — Accessibilité

### 3.1 Naviguer entre les vues au clavier

- **Problème.** Le plan d'origine voulait que le clavier suffise. Aujourd'hui il n'y a qu'Échap et les flèches : on ne peut pas aller au bureau, à l'écran, à l'étagère, aux affiches, au cube ou à l'île.
- **Fichiers.** [src/components/RoomPage.tsx](../../../src/components/RoomPage.tsx), [src/i18n/messages.ts](../../../src/i18n/messages.ts).
- **Correctif.**
  - Une liste de boutons, masquée visuellement et visible au focus, un par vue, avec des libellés FR et EN. La page reste « 3D seule » à la souris.
  - Entrée sur l'écran ouvre le bureau XP et y place le focus.
  - Un bouton pour l'interrupteur et un pour le bouton d'alimentation.
- **Test.** Test e2e au clavier : Tab jusqu'à « Étagère », Entrée, la vue change.

### 3.2 Menu Démarrer et focus des fenêtres

- **Problème.**
  - Le menu Démarrer a `role="menu"`, mais pas le comportement clavier attendu : pas de flèches, le focus n'y entre pas et ne revient pas au bouton.
  - Ouvrir une fenêtre n'y déplace pas le focus.
  - Réduire la fenêtre active envoie le focus sur `body`.
- **Fichier.** [src/xp/XpDesktop.tsx:59-69](../../../src/xp/XpDesktop.tsx) et `:182-220`.
- **Correctif.**
  - Focus sur le premier élément à l'ouverture, flèches haut et bas, Échap ramène au bouton.
  - Focus sur la fenêtre ouverte, et sur le bouton de la barre des tâches quand on réduit.
  - Si c'est trop lourd, retirer les rôles ARIA de menu.

### 3.3 Sortie de l'écran signalée

- **Problème.** Seul Échap permet de quitter l'écran, et rien ne l'indique. Le libellé `exit` ([src/xp/xp-art.ts:21](../../../src/xp/xp-art.ts) et `:42`) n'est utilisé nulle part.
- **Correctif.** Ajouter un bouton « Quitter l'écran », visible au focus ou en coin d'écran, qui utilise ce libellé.

---

## Lot 4 — Architecture et qualité

### 4.1 Découper `room-scene.ts`

- Le fichier fait environ 900 lignes : pièce, fenêtre, éclairage, bureau, chaise, contrôleur.
- Extraire, sur le modèle des objets récents :
  - `src/room/desk.ts` (bureau et tiroirs) ;
  - `src/room/chair.ts` (chaise et paille, avec `rushSeatCanvas` et les profils tournés) ;
  - `src/room/room-shell.ts` (murs, plinthes, fenêtre, paysage) ;
  - `src/room/room-lights.ts` (soleil, ciel, ampoule, HDRI).
- `room-scene.ts` garde l'assemblage, les vues, la boucle et le contrôleur.
- Aucun changement visuel : comparer une capture de chaque vue avant et après.

### 4.2 Données au catalogue plutôt que codées en dur

- **Démineur en fenêtre.** `WINDOWED = new Set(['minesweeper-infinite'])` ([src/xp/xp-apps.ts:21](../../../src/xp/xp-apps.ts)) devient une propriété du projet dans le catalogue, par exemple `link.window: true`.
  - Mettre à jour `src/domain/schema.ts`, la projection publique et le test `xp-apps`.
- **Langue de l'écran 3D.** Elle est déduite d'un libellé ([src/room/pc-model.ts:335](../../../src/room/pc-model.ts)). Passer `locale` explicitement dans `PcEnv`.

### 4.3 Protocole du cube partagé

- `PhotonSignal`, `WorkerInit` et `WorkerOut` sont importés depuis le fichier du worker par le modèle 3D, alors que l'en-tête de `l3d/` dit l'inverse.
- Les déplacer dans `src/room/virtual-cube-protocol.ts`, importé par le worker, la page et le modèle.

### 4.4 Code mort

- Prop `onReady` d'`AwardBios` ([src/xp/XpPower.tsx:33](../../../src/xp/XpPower.tsx) et `:59`).
- `PcModel.monitor` et `PcModel.tower`, s'ils restent inutilisés.
- Message `{kind:'status'}` du worker, jamais lu : le supprimer ou l'exploiter.
- `acrylicFace` et `acrylicEdge`, et le 6ᵉ champ des tuples `parts` ([src/room/l3d/cube-model.ts:97](../../../src/room/l3d/cube-model.ts) et `:194-198`).
- `silk.offset` fixé deux fois ([src/room/l3d/cube-textures.ts:136](../../../src/room/l3d/cube-textures.ts), [cube-model.ts:232](../../../src/room/l3d/cube-model.ts)).
- Boutons « Arrêter » et « Démarrage » d'IE : les brancher ou les laisser décoratifs, en le disant en commentaire.

### 4.5 Commentaires conformes à AGENT.md

- **En-têtes de fonction manquants** :
  - `goTo`, `zoomTo`, `step`, `back` et `handlePointer*` (RoomPage) ;
  - `formatClock` (XpDesktop) ;
  - `MenuBar`, `Tool`, `formatTime` et `XpBrowser` (XpPrograms) ;
  - `svgUrl` (xp-art) ;
  - `buildDoor` et `buildOutlet` ;
  - `ensure`, `transact` et `failure` (worker) ;
  - `toBase64` et `fromBase64`.
- **Séparateurs manquants** : `solve` et `quadTransform` (homography), `roundedRect`, `roundedRectPoints` et `loft` (pc-model).
- **En-tête mal placé** : « Internet Explorer 6 » dans XpPrograms.
- **Lambdas à documenter** : `add`, `taper`, `led`, `tube`, `icon`, `keyCap`, `row`.
- **Constantes** :
  - sans commentaire : `XP_TASKBAR`, `XP_LABELS`, `CRASH_FLAG`, `BOOTING`, `DOOR_W`, `DOOR_H`, `CASING` ;
  - partageant un seul commentaire : `XP_WIDTH` et `XP_HEIGHT` ;
  - groupées sous un commentaire vague : `PITCH`, `PANEL`, `INNER` et `PCB`.
- **Commentaires faux ou périmés** :
  - l'en-tête de `RoomPage.tsx` (« vue d'ensemble, bureau, étagère ») et la ligne 36 (« tant que l'allumage n'existe pas ») ;
  - la ligne 185 (« Masqué si un objet passe devant », alors qu'aucun test d'occultation n'existe) ;
  - le doublon « Rectangle de la dalle » dans le type `RoomScene` ;
  - `lego-moc.ts:20` (« w = 1 sur le dessus »).
- **Accents** dans les commentaires de `src/room/l3d/*`.

---

## Lot 5 — Tests

- **e2e de la chambre** ([tests/e2e/](../../../tests/e2e)) :
  - la page `/fr/chambre/` et `/en/chambre/` sert le titre et la liste des projets sans JavaScript ;
  - le scénario du garde-fou (1.1) ;
  - si le navigateur de test a WebGPU, la page passe de `loading` à `ready`, sinon elle affiche le message sans WebGPU.
- **Homographie** ([tests/unit/homography.test.ts](../../../tests/unit/homography.test.ts)) :
  - un rectangle identité ;
  - un quadrilatère dégénéré, qui doit renvoyer `null` ;
  - un seuil de pivot **relatif** à la place du `1e-12` absolu ([src/room/homography.ts:19](../../../src/room/homography.ts)), avec un test de quadrilatère presque aligné.
- **xp-apps** ([tests/unit/xp-apps.test.ts](../../../tests/unit/xp-apps.test.ts)) : les branches `website` et `preview.video`.
- **Machine d'états du PC** : extraire `PC_NEXT`, `powerOf`, `screenOf` et le traitement des touches en fonctions pures, dans `src/room/pc-power.ts`, et les tester.

---

## Ordre conseillé

1. Lot 1, bugs bloquants : 1.1 à 1.4 d'abord, car ils se voient tout de suite ; puis 1.5 à 1.8.
2. Lot 2, de 2.1 à 2.4, pour le rendu à la demande, avec mesures.
3. Lot 5, tests, en même temps que les corrections qu'ils couvrent.
4. Lot 3, accessibilité.
5. Lot 2, de 2.5 à 2.13, pour les appels de dessin et le chargement, avec mesures.
6. Lot 4, architecture et commentaires : le découpage en dernier, sur un code déjà corrigé.

## Suivi

| Étape | Fait | Commit | Mesure ou preuve |
|---|---|---|---|
| 1.1 Garde-fou de rechargement | ☑ | | tests/unit/crash-guard.test.ts ; navigateur : plantage simulé → page de secours une fois, bouton « Réessayer » → 3D prête. Test e2e pas encore écrit (lot 5). |
| 1.2 Fenêtres XP conservées | ☑ | | Navigateur : Lecteur ouvert, dos au bureau → `is-hidden`, fenêtre toujours là ; retour → même fenêtre, même position de lecture. |
| 1.3 Pause hors écran | ☑ | | Navigateur : vidéo en lecture, Échap → `paused` vrai. Suspension d'IE (5 s) non vérifiée au navigateur. |
| 1.4 Clavier au démarrage | ☑ | | tests/unit/pc-power.test.ts (machine d'états extraite dans src/room/pc-power.ts). Pas vérifié au navigateur. |
| 1.5 Échec du firmware | ☑ | | Relecture du code ; pas de test automatisé du worker, pas provoqué au navigateur. |
| 1.6 Course au redémarrage | ☑ | | Relecture du code ; non reproduit (demande un System.reset() depuis le studio). |
| 1.7 EEPROM contrôlée | ☑ | | tests/unit/virtual-cube.test.ts (decodeEeprom) ; contrôle de taille aussi dans le worker. |
| 1.8 Boutons du lecteur | ☑ | | Relecture du code (référence lue au clic). |
| 2.1 Placement XP hors React | ☑ | | Suivi de la dalle appelé par la scène quand la caméra bouge, transformation écrite sans rendu React. Navigateur : bureau XP aligné pendant la transition et après redimensionnement. Ajout : les amortissements (regard, inclinaison) se calent sur leur cible, un glissé de 5 px ne redessine plus ~4 s mais ~1,5 s. |
| 2.2 Compteur du BIOS | ☑ | | Rendu React par image jusqu'à l'invite F1, puis toutes les 240 ms. Ajout : le voyant disque ne redessine plus la pièce qu'à ses changements. Navigateur (?draws), BIOS en attente de F1 : 0 à 2 img/s au lieu d'un rendu par image ; F1 mène bien au bureau. |
| 2.3 Respiration de la LED | ☑ | | 24 paliers de luminosité ; images du cube ignorées pour le rendu hors du champ. Non mesuré : demande le studio L3D pour démarrer le firmware. |
| 2.4 Firmware en pause | ☑ | | Messages pause/reprise du worker, envoyés par setRunning. Relecture du code ; non mesuré (firmware non démarré). |
| 2.5 Culling du cube | ☑ | | Sphères englobantes des instances ; vue du cube vérifiée au navigateur (rien ne disparaît). |
| 2.6 Lumière du Photon | ☑ | | Lumière retirée, lentille émissive seule. |
| 2.7 Appels de dessin | ☑ | | ?draws, Intel gen-9, 1024 × 768 : vue d'ensemble 559 → 238 appels, étagère 356 → 146 ; vue du cube 126, bureau 65 (pas de mesure avant). Étagère en 4 maillages (veinage inscrit dans les UV), magazines en 6, pièces fixes du cube et du PC fusionnées par matériau (src/room/merge-static.ts), plus d'ombre sous 3 mm. |
| 2.8 Île LEGO en Uint16 | ☑ | | ile-du-tresor.bin 3 043 372 → 2 023 464 octets, réencodé sans la source Studio et relu à l'identique ; convertisseur et chargeur à jour (anciens fichiers toujours lus). |
| 2.9 Bureau peint allégé | ☑ | | Plus d'affiches de projets ni d'horloge figée ; langue passée explicitement (une partie de 4.2). |
| 2.10 Démineur | ☑ | | Suivi arrêté hors champ ou fenêtre réduite ; une mise à jour sans écart ne relance plus de rendu. Intervalle gardé (le plateau est dans une iframe). Non vérifié au navigateur. |
| 2.11 Pointeur par image | ☑ | | Lancer de rayon au plus une fois par image ; curseur et clics vérifiés au navigateur. |
| 2.12 Libération du cube | ☑ | | InstancedMesh et texture de halo libérés. L'attribut de couleur des LED n'a pas de dispose() : il part avec le renderer. |
| 2.13 Qualité adaptative | ◐ | | Plafond de 4 millions de pixels (src/room/render-quality.ts, testé). Ombres gardées en 2048 : elles ne sont recalculées qu'au déplacement d'une boîte, leur taille pèse peu sur l'image courante. Non mesuré sur une seconde machine. |
| 3.1 Vues au clavier | ☐ | | |
| 3.2 Menu Démarrer et focus | ☐ | | |
| 3.3 Bouton Quitter l'écran | ☐ | | |
| 4.1 Découpage de room-scene | ☐ | | |
| 4.2 Données au catalogue | ☐ | | |
| 4.3 Protocole du cube | ☑ | | src/room/virtual-cube-protocol.ts, fait avec 1.7 (taille d'EEPROM partagée). |
| 4.4 Code mort | ☐ | | |
| 4.5 Commentaires | ☐ | | |
| 5 Tests | ☐ | | |
