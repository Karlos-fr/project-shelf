# La chambre — plan

> Date : 19 novembre 2026. Statut : **étapes 1 à 4 faites** (pièce, mobilier, étagère, navigation ; PC et bureau XP ; fenêtres ; allumage et extinction), étape 5 à venir.
> Cible : **desktop uniquement**. L'iPhone et le mobile sont mis de côté pour cette version.

## 1. Idée

On propose une troisième version du site, à côté de la vitrine (`/{langue}/`) et de l'étagère seule (`/{langue}/shelf/`). C'est une petite chambre d'ado de la fin des années 90 et du début des années 2000, en vraie 3D temps réel, avec un bureau et un PC de l'époque.

- On ne se promène pas dans la pièce. On **clique** pour déplacer la caméra entre des points de vue fixes.
- Le **PC** est le cœur de l'expérience. On clique sur l'écran, la caméra zoome, puis on utilise un Windows XP interactif d'où l'on lance tous les projets.
- L'**étagère** ne garde que les projets qui ont eu un **support physique** (boîtes, boîtiers).
- Les murs portent des **posters**, et le bureau reçoit des **objets d'époque**.

## 2. Adresse et intégration

- Pages statiques `/fr/chambre/` et `/en/chambre/`, sur le modèle de `src/pages/[lang]/shelf.astro` : SEO, URL canonique et variantes de langue propres.
- Nouveau composant de page `src/components/RoomPage.tsx`, sur le modèle de `ShelfPage.tsx`, avec un en-tête « retour à la vitrine » et un lien vers l'autre langue.
- Code de scène dans un nouveau dossier `src/room/`. On réutilise ce qui existe dans `src/shelf/` : matériau bois en TSL, boîtes à jaquettes, plaques en laiton, chargement asynchrone, garde-fou anti-crash.
- Les assets vont dans `content/room/`, servis sous `/room/` comme `content/shelf/`.
- Sans JavaScript, la page reste utilisable : titre et liste HTML des liens vers les fiches projets.
- Lien depuis le README du dépôt, à côté de ceux de la vitrine et de l'étagère.
- Déploiement sur GitHub Pages comme aujourd'hui, **uniquement avec l'accord explicite de l'auteur**.

## 3. La pièce (3D)

### Mobilier
- **Bureau en hêtre clair** (d'abord prévu en pin, éclairci à la demande de l'auteur : les meubles de l'époque étaient clairs). L'étagère de la chambre passe aussi en hêtre ; l'étagère seule reste en noyer.
- **Chaise paysanne en hêtre** (bois plus fin et régulier que le pin), **assise paillée**.
- **Étagère sur pieds en pin brut à lattes** (src/room/pine-rack.ts), posée au sol contre le mur de gauche, 90 × 30 × 172 cm : les boîtes sont au 4e niveau, sans plaque. L'étagère seule (/shelf/) garde son meuble en noyer.
- Murs, sol et plafond sobres : le décor doit mettre en valeur les objets, pas rivaliser avec eux.

### Le PC de l'époque
- **Tour beige**, plastique légèrement jauni. Façade avec lecteur de disquette 3,5″, lecteur CD-ROM, voyants d'alimentation et de disque dur.
- Le **bouton d'alimentation en façade est cliquable** (voir §5).
- **Écran CRT** beige, dalle bombée, reflet du verre.
- **Clavier filaire** beige, touches en série, et **souris à boule filaire** sur un tapis.
- Les câbles sont visibles entre les périphériques et la tour.

### Objets d'époque (ajoutés plus tard)
- ✅ Pile de magazines au coin droit du bureau (src/room/magazines.ts) : PC Team n°36 (1998), 59 et 61 (2000) et Casus Belli n°89 et 90 (1995), couvertures d'abandonware-magazines.org.
- ✅ Cube à LED L3D 8 x 8 x 8 de l'auteur sur le niveau sous les boîtes de jeu (src/room/l3d-cube.ts), d'après les plans du boîtier enjrolas/L3D-Hardware ; LED éteintes par défaut, câble noir jusqu'à une prise murale française à côté de l'étagère.
- ✅ Horloge murale radiopilotée à LED bleues (d'après la Lunartec 60 LED, 27,5 x 27,5 cm) au mur du fond, entre l'affiche X-Files et la fenêtre (src/room/led-clock.ts) : heure de Paris en direct, couronne des secondes, fil d'alimentation jusque derrière le bureau.
- ✅ Cycle jour / nuit par la fenêtre (src/room/daylight.ts) : hauteur réelle du soleil sur Paris, ciel de jour, teinte du crépuscule, nuit étoilée avec lune ; soleil, ciel et ambiance suivent, mis à jour chaque minute. `?heure=HH:MM` dans l'adresse fait partir l'horloge et le jour d'une autre heure.
- **À venir : relier le cube au studio L3D de l'auteur (github.com/Karlos-fr/l3d-studio)** pour y jouer ses animations.
- **À venir : les magazines pourront s'ouvrir et se feuilleter comme de vrais magazines** (pages scannées du même site).
Game Boy, Walkman rouge, disquettes, CD, magazines PC Team. La liste sera complétée par l'auteur.

### Posters
- La page n'affiche que la vue 3D : ni boutons de vue, ni étiquettes, ni légende. On clique dans la pièce ; un clic à côté ou Échap recule.
- ✅ Poster « I WANT TO BELIEVE » au-dessus du bureau (src/room/poster.ts) : affiche officielle (Pyramid Posters, photo de Billy Meier de 1975), collée à la pâte à fixe ; un clic dessus place la caméra en face.
- ✅ Poster d'Alerte à Malibu (Pamela Anderson en C.J. Parker sur la plage, format 23 x 35 pouces) au mur de gauche, entre l'étagère et la porte (src/room/poster.ts) ; un clic dessus place la caméra en face.
- Posters muraux d'esprit années 90. Le contenu est à définir ; une idée est de faire de fausses affiches d'époque pour les projets.

### Fabrication des modèles
- Formes simples (tour, CRT, clavier, bureau, chaise) **construites en code** dans Three.js, avec des matériaux PBR : plastique, bois, paille tressée.
- Objets complexes (lampe, Walkman, Game Boy) : modèles CC0, ou modèles faits par l'auteur dans Blender (glTF).
- **Textures** pin, hêtre, paille et murs : sources **CC0** en haute résolution (Poly Haven ou équivalent), comme le noyer de l'étagère.

### Lumière et rendu
- Même pile que l'étagère : Three.js r187, WebGPU avec repli WebGL, HDR d'ambiance, ombres douces.
- La caméra ne bouge qu'entre des points fixes. On peut donc **précalculer une partie de l'éclairage** (occlusion ambiante, lumière de la pièce) pour un rendu plus riche et moins coûteux.
- Lampe de bureau, et lumière de l'écran CRT qui éclaire le bureau.

## 4. Navigation par clic

- **Vues fixes** :
  - vue d'ensemble ;
  - bureau ;
  - écran du PC ;
  - étagère ;
  - mur aux posters.
- On clique sur une zone ou un objet pour aller à la vue correspondante, avec une transition de caméra douce.
- `Échap` ou un bouton « retour » ramène à la vue précédente, puis à la vue d'ensemble.
- Sur l'étagère, on garde les interactions actuelles (zoom sur une boîte, plaque, lien vers la fiche).
- Le clavier suffit pour naviguer, avec focus visible et libellés accessibles.

## 5. Le PC : allumage et extinction

### Extinction (clic sur le bouton en façade, PC allumé)
1. Écran « Windows s'arrête… ».
2. Effet d'extinction du CRT : l'image s'écrase en une ligne horizontale, puis en un point lumineux, puis noir.
3. Le voyant d'alimentation de la tour s'éteint.

### Allumage (clic sur le bouton, PC éteint)
1. Le voyant s'allume, le tube chauffe et l'image apparaît progressivement.
2. **Écran POST de BIOS d'époque** :
   - logo et nom du BIOS ;
   - CPU détecté ;
   - **test mémoire qui compte** ;
   - détection des disques IDE (maître/esclave) ;
   - « Press DEL to enter SETUP ».
3. Écran de démarrage **Windows XP** avec la barre de progression animée.
4. Écran d'accueil.
5. Bureau.

- Un clic ou une touche permet de passer la séquence.
- L'état allumé/éteint est gardé pendant la visite.

## 6. Windows XP (interface HTML)

### Principe technique
Quand on clique sur l'écran, la caméra zoome jusqu'à ce que l'écran remplisse la vue. Ensuite, une **vraie interface HTML/React prend le relais en plein écran**, avec un effet CRT en CSS (lignes de balayage, léger bombé, cadre beige). En sortant, on revient à la 3D.

Ce choix garde un texte net, des interactions natives (clavier, focus, accessibilité) et une interface facile à faire évoluer. Les deux autres approches ont été écartées :
- dessiner Windows dans une texture 3D et convertir les clics en coordonnées sur l'écran ;
- superposer une page HTML en 3D CSS.

### Apparence
- **Reproduction fidèle de l'interface Windows XP** (thème Luna) : barre des tâches bleue, bouton « Démarrer » vert, fenêtres aux coins arrondis, fond d'écran, icônes.
- On s'inspire des clones open source existants, par exemple **XP.css** (paquet npm, licence MIT) pour le style des fenêtres et **winXP** pour le menu Démarrer et l'explorateur.
- **Provenance à documenter.** Le code des clones est sous licence libre, mais les images reprises de Windows (fond d'écran, icônes, logos, sons) appartiennent à Microsoft. C'est un choix assumé par l'auteur pour ce projet personnel non commercial. Chaque élément repris sera listé dans un fichier de provenance.

### Contenu
- **Bureau** : un **raccourci par projet**. Le double-clic fait l'une de deux choses selon le projet :
  - ouvrir une fenêtre façon **Lecteur Windows Media** avec la vidéo du projet ;
  - **lancer le projet** dans une fenêtre façon **Internet Explorer** (iframe). Les sites qui refusent d'être intégrés s'ouvrent dans un nouvel onglet.
- **Menu Démarrer** d'époque : projets, Poste de travail, Mes documents, « Arrêter l'ordinateur » (qui déclenche l'extinction du §5).
- **Explorateur de fichiers** : Poste de travail, Mes documents, projets rangés par catégorie, vue en icônes ou en liste.
- **Gestionnaire de fenêtres** : déplacer, réduire, agrandir et fermer les fenêtres, premier plan au clic, boutons dans la barre des tâches, horloge.
- **Démineur** : le portage de l'auteur sera intégré **plus tard**, dans une fenêtre.

### Données
- On ajoute au catalogue (ou à une table dédiée, comme `SHELF_OBJECTS`) la **place de chaque projet** :
  - **étagère** : support physique (`bigbox`, `case`) ;
  - **bureau XP** : tous les projets, avec l'**action du raccourci** (`video` ou `launch`) et son icône.
- Les écrans TV de l'étagère actuelle (Lactea, Proscenium) ne sont pas des supports physiques : ces projets passent sur le bureau XP.

## 7. Étapes

1. **La pièce brute.** ✅ Fait le 19 novembre 2026 (`src/room/room-scene.ts`, `src/components/RoomPage.tsx`).
   - Murs, sol, bureau en pin, chaise en hêtre, étagère déplacée.
   - Navigation par clic entre les vues fixes.
   - Page `/fr/chambre/` et `/en/chambre/`.
2. **Le PC et le passage à l'écran.** ✅ Fait le 19 novembre 2026 (src/room/pc-model.ts, src/xp/XpDesktop.tsx). Fond Bliss et icônes d'origine de XP (provenance : docs/xp-assets.md) ; un double-clic ouvre pour l'instant la fiche du projet dans un nouvel onglet.
   - Tour, CRT, clavier, souris.
   - Zoom sur l'écran, puis bureau XP en HTML : fond, icônes des projets, barre des tâches, menu Démarrer.
3. **Les fenêtres.** ✅ Fait le 19 novembre 2026 (src/xp/XpWindow.tsx, src/xp/XpPrograms.tsx, src/xp/xp-apps.ts). Démo en ligne → Internet Explorer ; sinon vidéo → Lecteur Windows Media ; Explorateur pour le Poste de travail, Mes documents (un dossier par catégorie) et la Corbeille.
   - Gestionnaire de fenêtres.
   - Lecteur vidéo, navigateur (iframe), explorateur de fichiers.
4. **Allumage et extinction.** ✅ Fait le 19 novembre 2026 (src/xp/XpPower.tsx, séquenceur dans src/components/RoomPage.tsx). BIOS Award 4.51PG (440BX, Pentium III 500 MHz, 128 Mo) ; bouton de la tour ou menu Démarrer ; un clic ou une touche passe la séquence.
   - Bouton en façade, extinction du CRT.
   - POST du BIOS, démarrage de XP, écran d'accueil.
5. **L'habillage.**
   - Posters, objets d'époque (Game Boy, Walkman rouge, disquettes, CD, magazines PC Team).
   - Éclairage précalculé, finitions.
6. **Plus tard.**
   - Démineur dans une fenêtre.
   - Éventuelle version mobile.

À chaque étape :
- on lance `npm run verify` (vérification des types, tests unitaires, tests du build, tests e2e) ;
- on vérifie dans le navigateur ;
- on fait un commit ;
- on ne déploie qu'avec l'accord de l'auteur.

## 8. Points ouverts

- Le contenu des posters.
- La liste complète des objets d'époque, et les modèles 3D à fabriquer ou à trouver.
- Pour chaque projet : raccourci vidéo ou lancement direct, et son icône.
- Quels projets acceptent d'être affichés dans une iframe.
- L'emplacement et la technologie du portage du Démineur.
