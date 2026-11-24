// ============================================================================
// ProjectCatalogue — Source déclarative des projets réellement publiables
// ----------------------------------------------------------------------------
// Ce fichier est la source de vérité éditoriale préparée avec assistance LLM puis
// relue humainement. Les médias des projets restent hébergés dans leurs propres
// dépôts et sont référencés ici par URL HTTPS.
// ============================================================================
import type { Catalogue } from '../domain/project.ts';

// Bases des fichiers des dépôts de projets servis par GitHub.
const FUN_TRACKS_RAW = 'https://raw.githubusercontent.com/Karlos-fr/fun-tracks-recomp-releases/main';
const QUAKE2JS_RAW = 'https://raw.githubusercontent.com/Karlos-fr/Quake-2-JS/master';
const LACTEA_RAW = 'https://raw.githubusercontent.com/Karlos-fr/lactea/main';
const PROSCENIUM_RAW = 'https://raw.githubusercontent.com/Karlos-fr/proscenium/main';
const MINE_RAW = 'https://raw.githubusercontent.com/Karlos-fr/la-mine-aux-diamants-to8-web/main';
// Les vidéos de La Mine aux Diamants sont dans Git LFS : raw.githubusercontent.com
// ne renvoie que le fichier pointeur, le contenu est servi par media.githubusercontent.com.
const MINE_LFS = 'https://media.githubusercontent.com/media/Karlos-fr/la-mine-aux-diamants-to8-web/main';
const MINESWEEPER_RAW = 'https://raw.githubusercontent.com/Karlos-fr/minesweeper-infinite/main';

// Catalogue de production ; les fixtures de test vivent dans tests/.
export const PROJECT_CATALOGUE: Catalogue = {
  categories: [
    { id: 'android-tv-apps', label: { en: 'Android TV apps', fr: 'Applications Android TV' } },
    { id: 'games-ports', label: { en: 'Games & Ports', fr: 'Jeux et portages' } },
    { id: 'web', label: { en: 'Web', fr: 'Web' } },
    { id: 'reverse-engineering', label: { en: 'Reverse engineering', fr: 'Rétro-ingénierie' } },
    { id: 'retro-computing', label: { en: 'Retro Computing', fr: 'Rétro-informatique' } },
  ],
  projects: [
    {
      id: 'fun-tracks-recomp',
      name: 'Fun Tracks Recomp',
      categories: ['games-ports', 'reverse-engineering'],
      // Premier commit de la décompilation ; mise à jour : nouvelle bande-annonce.
      createdAt: '2026-08-21',
      updatedAt: '2026-11-17',
      // Alphas publiques, dernière : 0.10.0-alpha du 2026-11-08.
      status: 'active',
      // Le code source vit dans un dépôt privé : seul le dépôt des versions est public,
      // il est donc lié comme téléchargement et documentation, pas comme « sources ».
      repositoryVisibility: 'private',
      hidden: false,
      featured: true,
      featuredOrder: 1,
      stack: ['C11', 'CMake', 'SDL3', 'WebGPU (wgpu-native)', 'Vulkan / Direct3D 12', 'Android NDK / Gradle', 'Ogg Vorbis', 'Python', 'MSVC 4.2'],
      // La bande-annonce sert aussi de vidéo d'aperçu, comme pour les autres projets.
      preview: {
        poster: `${FUN_TRACKS_RAW}/video/fun_tracks_recomp_trailer.jpg`,
        video: `${FUN_TRACKS_RAW}/video/fun_tracks_recomp_trailer.mp4`,
      },
      media: [
        {
          type: 'video',
          src: `${FUN_TRACKS_RAW}/video/fun_tracks_recomp_trailer.mp4`,
          poster: `${FUN_TRACKS_RAW}/video/fun_tracks_recomp_trailer.jpg`,
          title: { en: 'Trailer', fr: 'Bande-annonce' },
          description: {
            en: 'One minute tour: the 1997 renderer, the 3D renderer, all tracks, weather, split screen and the HD pack.',
            fr: 'Une minute de visite : le rendu de 1997, le rendu 3D, les circuits, la météo, l\'écran partagé et le pack HD.',
          },
          durationSeconds: 60,
          uploadDate: '2026-11-17',
          width: 1280,
          height: 720,
        },
      ],
      // Toutes les versions sont des pré-versions : /releases/latest renverrait à la liste.
      links: [
        { type: 'release', url: 'https://github.com/Karlos-fr/fun-tracks-recomp-releases/releases' },
        { type: 'documentation', url: 'https://github.com/Karlos-fr/fun-tracks-recomp-releases#readme' },
      ],
      content: {
        en: {
          tagline: 'The 1997 racer Fun Tracks, rebuilt from its original code for modern PCs, Android and Linux.',
          description: 'Fun Tracks Recomp brings the 1997 arcade racer back to life. The game was decompiled into readable C, then rebuilt as a native program for today\'s systems. The original renderer still reproduces the 1997 picture exactly, frame for frame. A new 3D renderer adds widescreen, a smooth frame rate, modern lighting and an optional HD texture pack. It needs the original game files: CD, GOG or Steam.',
          features: [
            'Same game, same physics: rebuilt from the original code, deterministic down to the frame.',
            'Original 1997 renderer, 1:1, or a modern 3D renderer (Vulkan, Direct3D 12).',
            'Widescreen, high resolutions, smooth frame rate with interpolation.',
            'Dynamic lighting, shadows, reflections, weather and time-of-day options.',
            'Free HD texture pack covering all seven tracks.',
            'Analog gamepad support, split screen for up to 6 players, network play.',
            'Windows, Android and Linux, plus a test build for PortMaster handhelds.',
            'Six languages.',
          ],
          limitations: [
            'Alpha builds.',
            'The original game files are required.',
            'Linux and handheld builds are still test builds.',
            'Network play is experimental.',
            'Devices without Vulkan only run the original renderer.',
          ],
          about: 'Fun Tracks was a small 1997 racer full of character that only ran on old Windows. This project started as a decompilation, matched byte for byte against the original compiler, and grew into a full recompilation: the same game, playable again on today\'s hardware, with optional modern visuals.',
        },
        fr: {
          tagline: 'Le jeu de course Fun Tracks de 1997, reconstruit à partir de son code d\'origine pour PC, Android et Linux.',
          description: 'Fun Tracks Recomp fait revivre le jeu de course arcade de 1997. Le jeu a été décompilé en C lisible, puis reconstruit en programme natif pour les systèmes actuels. Le rendu d\'origine reproduit toujours l\'image de 1997 à l\'identique, image par image. Un nouveau rendu 3D ajoute l\'écran large, une animation fluide, un éclairage moderne et un pack de textures HD facultatif. Il faut les fichiers du jeu d\'origine : CD, GOG ou Steam.',
          features: [
            'Même jeu, même physique : reconstruit à partir du code d\'origine, identique à l\'image près.',
            'Rendu d\'origine de 1997, à l\'identique, ou rendu 3D moderne (Vulkan, Direct3D 12).',
            'Écran large, hautes résolutions, animation fluide par interpolation.',
            'Éclairage dynamique, ombres, reflets, météo et heure du jour au choix.',
            'Pack de textures HD gratuit pour les sept circuits.',
            'Manette analogique, écran partagé jusqu\'à 6 joueurs, jeu en réseau.',
            'Windows, Android et Linux, plus une version d\'essai pour consoles portables PortMaster.',
            'Six langues.',
          ],
          limitations: [
            'Versions alpha.',
            'Les fichiers du jeu d\'origine sont nécessaires.',
            'Les versions Linux et consoles portables sont encore des versions d\'essai.',
            'Le jeu en réseau est expérimental.',
            'Sans Vulkan, seul le rendu d\'origine fonctionne.',
          ],
          about: 'Fun Tracks était un petit jeu de course de 1997, plein de charme, qui ne tournait plus que sur de vieux Windows. Le projet a commencé par une décompilation, vérifiée octet par octet avec le compilateur d\'origine, puis il est devenu une recompilation complète : le même jeu, de nouveau jouable sur le matériel actuel, avec des graphismes modernes en option.',
        },
      },
      application: { category: 'GameApplication', operatingSystems: ['Windows', 'Android', 'Linux'] },
      indexable: true,
    },
    {
      id: 'quake2js',
      name: 'Quake2JS',
      categories: ['games-ports', 'web'],
      // Premier commit et création du dépôt GitHub.
      createdAt: '2026-04-19',
      updatedAt: '2026-11-17',
      // Jouable en ligne, mais des corrections restent prévues (TODO.md).
      status: 'active',
      repositoryVisibility: 'public',
      repositoryUrl: 'https://github.com/Karlos-fr/Quake-2-JS',
      hidden: false,
      featured: true,
      featuredOrder: 2,
      stack: ['TypeScript', 'Three.js', 'WebGPU / WebGL', 'Vite', 'Web Audio API', 'GitHub Pages'],
      // La bannière du dépôt sert de poster et la présentation de vidéo d'aperçu.
      preview: {
        poster: `${QUAKE2JS_RAW}/docs/assets/quake2js-banner.png`,
        video: `${QUAKE2JS_RAW}/video/quake2js-presentation.mp4`,
      },
      media: [
        {
          type: 'video',
          src: `${QUAKE2JS_RAW}/video/quake2js-presentation.mp4`,
          poster: `${QUAKE2JS_RAW}/docs/assets/quake2js-banner.png`,
          title: { en: 'Quake2JS — one-minute presentation', fr: 'Quake2JS — présentation en une minute' },
          description: {
            en: 'The game\'s startup demo, running in the browser at 1080p60.',
            fr: 'La démo de démarrage du jeu, tournant dans le navigateur en 1080p60.',
          },
          durationSeconds: 60,
          uploadDate: '2026-11-17',
          width: 1920,
          height: 1080,
        },
        {
          type: 'image',
          src: `${QUAKE2JS_RAW}/docs/assets/quake2js-banner.png`,
          alt: { en: 'Quake II JS logo', fr: 'Logo de Quake II JS' },
          width: 2172,
          height: 724,
        },
      ],
      links: [
        { type: 'demo', url: 'https://karlos-fr.github.io/Quake-2-JS/' },
        { type: 'documentation', url: 'https://github.com/Karlos-fr/Quake-2-JS#readme' },
      ],
      content: {
        en: {
          tagline: 'The original Quake II engine, ported line by line to TypeScript and running in your browser.',
          description: 'Quake2JS is a browser port of id Software\'s open-source Quake II code. It is not a remake: the engine, game logic, client, server, file formats and renderer are carried over from the original C source into a modern TypeScript codebase, and they keep the original names so each function can be traced back to its source. A Three.js renderer draws the game with WebGPU, or WebGL when WebGPU is not available. The public build ships with the shareware data and can be played instantly on any modern browser, including on mobile.',
          features: [
            'TypeScript port of the original qcommon, client, server and game code',
            'Three.js renderer with WebGPU and WebGL fallback',
            'Virtual filesystem that mounts original .pak archives',
            'Readers for the original BSP, MD2, PCX, WAL and PAK formats',
            'Original menus, console, HUD, sound and save games',
            'Startup demo loop and .cin cinematics with retail data',
            'Touch controls on mobile',
            'Shareware data included: playable instantly online',
            'Optional renderer/FPS overlay (?hud=1)',
          ],
          limitations: [
            'The public build only includes the shareware episode, so the full game needs your own retail pak0.pak.',
            'Single-player only: there is no online multiplayer.',
            'Rendering stays close to the original look; widescreen HUD, dynamic lighting and other modern enhancements are planned but not implemented.',
            'A few gameplay details are still being corrected.',
          ],
          about: 'The goal was to see how far an AI coding assistant can go on a faithful, large-scale port. Instead of rewriting a Quake-like game, the project carries about 140 original C/H files into roughly 145,000 lines of TypeScript. A matrix-based audit maps every original function to its TypeScript counterpart.',
        },
        fr: {
          tagline: 'Le moteur original de Quake II, porté ligne à ligne en TypeScript et jouable dans le navigateur.',
          description: 'Quake2JS est un portage pour navigateur du code open source de Quake II publié par id Software. Ce n\'est pas un remake : le moteur, la logique de jeu, le client, le serveur, les formats de fichiers et le rendu sont transposés du C original vers une base TypeScript moderne, en gardant les noms d\'origine pour que chaque fonction reste traçable jusqu\'à sa source. Un moteur de rendu Three.js affiche le jeu en WebGPU, ou en WebGL quand WebGPU n\'est pas disponible. La version publique embarque les données shareware et se lance immédiatement dans n\'importe quel navigateur récent, y compris sur mobile.',
          features: [
            'Portage TypeScript du code original qcommon, client, serveur et jeu',
            'Rendu Three.js en WebGPU, avec repli WebGL',
            'Système de fichiers virtuel qui monte les archives .pak originales',
            'Lecture des formats originaux BSP, MD2, PCX, WAL et PAK',
            'Menus, console, HUD, son et sauvegardes d\'origine',
            'Boucle de démos au démarrage et cinématiques .cin avec les données du jeu complet',
            'Commandes tactiles sur mobile',
            'Données shareware incluses : jouable immédiatement en ligne',
            'Affichage optionnel du moteur de rendu et des FPS (?hud=1)',
          ],
          limitations: [
            'La version publique ne contient que l\'épisode shareware : le jeu complet demande ton propre pak0.pak du jeu complet.',
            'Le jeu est en solo uniquement, sans multijoueur en ligne.',
            'Le rendu reste fidèle à l\'original ; le HUD adapté aux écrans larges, l\'éclairage dynamique et les autres améliorations modernes sont prévus mais pas encore faits.',
            'Quelques détails de gameplay sont encore en cours de correction.',
          ],
          about: 'L\'objectif était de voir jusqu\'où un assistant de code IA peut aller sur un portage fidèle et de grande ampleur. Plutôt que de réécrire un jeu « à la Quake », le projet transpose environ 140 fichiers C/H originaux en près de 145 000 lignes de TypeScript. Un audit par matrices relie chaque fonction d\'origine à son équivalent TypeScript.',
        },
      },
      application: { category: 'GameApplication', operatingSystems: ['Web browser'] },
      indexable: true,
    },
    {
      id: 'lactea',
      name: 'Lactea',
      categories: ['android-tv-apps'],
      createdAt: '2026-11-16',
      updatedAt: '2026-11-17',
      // Version 1.0.0 publiée le 2026-11-17.
      status: 'stable',
      repositoryVisibility: 'public',
      repositoryUrl: 'https://github.com/Karlos-fr/lactea',
      hidden: false,
      featured: true,
      featuredOrder: 4,
      stack: ['Kotlin', 'Android TV / Google TV', 'C++ (JNI)', 'projectM 4.1.8 (fork)', 'OpenGL ES 3', 'Android NDK', 'CMake', 'Python'],
      // La démo complète sert aussi de vidéo d'aperçu, comme pour Proscenium.
      preview: {
        poster: `${LACTEA_RAW}/logos/lactea-v2-banner.png`,
        video: `${LACTEA_RAW}/video/lactea-demo.mp4`,
      },
      media: [
        {
          type: 'video',
          src: `${LACTEA_RAW}/video/lactea-demo.mp4`,
          poster: `${LACTEA_RAW}/logos/lactea-v2-banner.png`,
          title: { en: 'Lactea in one minute', fr: 'Lactea en une minute' },
          description: {
            en: 'Presets, track title and cover, options, preset packs and remote control, filmed on a Sony BRAVIA.',
            fr: 'Presets, titre et pochette, options, packs et télécommande, filmés sur une Sony BRAVIA.',
          },
          durationSeconds: 60,
          uploadDate: '2026-11-17',
          width: 1920,
          height: 1080,
        },
        {
          type: 'image',
          src: `${LACTEA_RAW}/images/screenshots.jpg`,
          alt: {
            en: 'Three Lactea visualizations and the preset test screen on a TV',
            fr: 'Trois visualisations de Lactea et l\'écran de test des presets sur une TV',
          },
          width: 1528,
          height: 862,
        },
      ],
      links: [
        { type: 'release', url: 'https://github.com/Karlos-fr/lactea/releases/tag/v1.0.0' },
        { type: 'documentation', url: 'https://github.com/Karlos-fr/lactea/blob/main/doc/BUILDING.md' },
      ],
      content: {
        en: {
          tagline: 'MilkDrop-style music visuals for Android TV, reacting to any music app.',
          description: 'Lactea turns the music played on your TV into psychedelic visuals, like Winamp\'s famous MilkDrop plugin. It listens to whatever the TV plays (Spotify, Deezer, YouTube Music, Plex…) and plays the original MilkDrop presets through projectM: almost 10,000 visualizations made by the community over twenty years. It is designed for the remote, runs up to 4K, and knows how heavy each preset is, so modest TVs stay smooth.',
          features: [
            'Reacts to any music app, even through an HDMI soundbar',
            '9,857 presets, all of them load (projectM fixed for MilkDrop compatibility)',
            'Track title and album cover, also inside some visuals',
            'Opens by itself when music starts',
            'Remote-first: every key can be remapped',
            'Up to 4K, smart transitions, slow presets skipped',
            'Preset packs downloaded from GitHub, list updated automatically',
            'Built-in benchmark of every preset on your TV',
            'Six languages: EN, FR, DE, IT, ES, SV',
          ],
          limitations: [
            'Track title and auto-launch need permissions granted once from a computer (adb).',
            'Sound sent to Bluetooth devices may not be picked up.',
            'Tested on one TV only (Sony BRAVIA, Google TV).',
          ],
          about: 'MilkDrop made music visible on PCs twenty years ago. Lactea brings that experience to the living-room TV, with the music apps people use today. Testing the whole preset collection on a TV also led to fixes in projectM itself, proposed back to its authors.',
        },
        fr: {
          tagline: 'Les visuels musicaux de MilkDrop sur Android TV, au rythme de n\'importe quelle appli de musique.',
          description: 'Lactea transforme la musique jouée sur ta TV en images psychédéliques, comme le célèbre plugin MilkDrop de Winamp. Il écoute ce que joue la TV (Spotify, Deezer, YouTube Music, Plex…) et affiche les presets MilkDrop d\'origine grâce à projectM : près de 10 000 visualisations créées par la communauté en vingt ans. Il se pilote entièrement à la télécommande, va jusqu\'en 4K et connaît le poids de chaque preset, pour rester fluide même sur une TV modeste.',
          features: [
            'Réagit à toute appli de musique, même avec une barre de son HDMI',
            '9 857 presets, qui se chargent tous (projectM corrigé pour la compatibilité MilkDrop)',
            'Titre du morceau et pochette, aussi intégrée à certains visuels',
            'S\'ouvre tout seul quand la musique démarre',
            'Pensé pour la télécommande : chaque touche se reconfigure',
            'Jusqu\'en 4K, transitions intelligentes, presets lents écartés',
            'Packs de presets téléchargés depuis GitHub, liste mise à jour toute seule',
            'Test intégré de la fluidité de chaque preset sur ta TV',
            'Six langues : anglais, français, allemand, italien, espagnol, suédois',
          ],
          limitations: [
            'Le titre du morceau et l\'ouverture automatique demandent des autorisations à accorder une fois depuis un ordinateur (adb).',
            'Le son envoyé vers un appareil Bluetooth peut ne pas être capté.',
            'Testé sur une seule TV (Sony BRAVIA, Google TV).',
          ],
          about: 'Il y a vingt ans, MilkDrop rendait la musique visible sur nos PC. Lactea ramène cette expérience sur la TV du salon, avec les applis de musique d\'aujourd\'hui. Tester toute la collection de presets sur une TV a aussi permis de corriger projectM lui-même, et ces corrections ont été proposées à ses auteurs.',
        },
      },
      application: { category: 'MultimediaApplication', operatingSystems: ['Android TV'] },
      indexable: true,
    },
    {
      id: 'proscenium',
      name: 'Proscenium',
      categories: ['android-tv-apps'],
      // Date déduite des premiers fichiers : l'historique git a été recréé.
      createdAt: '2026-10-25',
      updatedAt: '2026-11-17',
      status: 'stable',
      repositoryVisibility: 'public',
      repositoryUrl: 'https://github.com/Karlos-fr/proscenium',
      hidden: false,
      featured: true,
      featuredOrder: 5,
      stack: ['Java', 'Android SDK', 'Android TV / Google TV', 'aapt2 / d8 / apksigner', 'TMDB API', 'Open-Meteo', 'Python'],
      preview: {
        poster: `${PROSCENIUM_RAW}/images/banner.png`,
        video: `${PROSCENIUM_RAW}/video/proscenium-demo.mp4`,
      },
      media: [
        {
          type: 'video',
          src: `${PROSCENIUM_RAW}/video/proscenium-demo.mp4`,
          poster: `${PROSCENIUM_RAW}/images/banner.png`,
          title: { en: 'Proscenium demo', fr: 'Démo de Proscenium' },
          description: {
            en: 'A one-minute tour on a real TV: home screen, glass bar, console shortcuts, settings and cinema mode.',
            fr: 'Une minute de visite sur une vraie TV : accueil, barre en verre, raccourcis consoles, réglages et mode cinéma.',
          },
          durationSeconds: 55,
          uploadDate: '2026-11-17',
          width: 1920,
          height: 1080,
        },
      ],
      links: [
        { type: 'release', url: 'https://github.com/Karlos-fr/proscenium/releases/tag/v1.0' },
        { type: 'documentation', url: 'https://github.com/Karlos-fr/proscenium#readme' },
      ],
      content: {
        en: {
          tagline: 'A cinema-style home screen for Android TV: big film backdrops, a glass app bar and a cinema mode.',
          description: 'Proscenium replaces the home screen of Android TV and Google TV sets with a movie theatre. Full-screen film backdrops drift slowly behind a refractive glass app bar, with the time and live weather above. When the remote is put down, the interface fades away: letterbox bars frame the picture and the film\'s official logo appears. Everything is driven with the remote, in six languages.',
          features: [
            'Full-screen film backdrops with Ken Burns motion and transitions',
            'Colours that follow each picture (glass, glow, icons)',
            'Refractive glass app bar with presets and water, liquid or rain effects',
            'Selected app with tilt, shine and a coloured glow from its logo',
            'HDMI shortcuts for consoles, with 24 console icons',
            'Cinema mode: letterbox bars, official film logo and year',
            'Clock with rolling digits, weather with wind and gusts',
            'One-click themed backdrop packs (Disney & Pixar, Ghibli, Marvel), no key needed',
            'Custom TMDB playlists, with the key entered from the phone by QR code',
            'Also works as an Android screensaver',
            'Six languages (EN, FR, DE, IT, ES, SV)',
          ],
          limitations: [
            'Tested on a Sony Bravia (Android 14) only.',
            'On Google TV, the Home button needs an accessibility service to open Proscenium.',
            'Some pack films have no logo in DE, IT, ES or SV, so the English one is used.',
          ],
          about: 'Stock Android TV home screens are cluttered with ads and recommendations. Proscenium started as a wish for a calm, beautiful home screen that feels like the lights going down in a cinema, built entirely by hand and without Gradle.',
        },
        fr: {
          tagline: 'Un écran d\'accueil façon salle de cinéma pour Android TV : grands fonds de films, barre d\'applis en verre et mode cinéma.',
          description: 'Proscenium remplace l\'écran d\'accueil des TV Android TV et Google TV par une salle de cinéma. Des fonds de films en plein écran dérivent lentement derrière une barre d\'applis en verre réfractant, surmontée de l\'heure et de la météo en direct. Quand la télécommande reste posée, l\'interface s\'efface : des bandes noires recadrent l\'image et le logo officiel du film apparaît. Tout se pilote à la télécommande, en six langues.',
          features: [
            'Fonds de films plein écran avec effet Ken Burns et transitions',
            'Couleurs qui suivent chaque image (verre, lumière, icônes)',
            'Barre d\'applis en verre réfractant, préréglages et effets eau, liquide ou pluie',
            'Appli sélectionnée inclinée, avec reflet et halo à la couleur de son logo',
            'Raccourcis HDMI pour les consoles, avec 24 icônes',
            'Mode cinéma : bandes noires, logo officiel du film et année',
            'Horloge à chiffres roulants, météo avec vent et rafales',
            'Packs de fonds thématiques en un clic (Disney & Pixar, Ghibli, Marvel), sans clé',
            'Playlists TMDB perso, clé saisie depuis le téléphone par QR code',
            'Fonctionne aussi comme économiseur d\'écran Android',
            'Six langues (EN, FR, DE, IT, ES, SV)',
          ],
          limitations: [
            'Testé uniquement sur une Sony Bravia (Android 14).',
            'Sur Google TV, le bouton Accueil a besoin d\'un service d\'accessibilité pour ouvrir Proscenium.',
            'Certains films des packs n\'ont pas de logo en DE, IT, ES ou SV : le logo anglais est utilisé.',
          ],
          about: 'Les accueils Android TV d\'origine sont encombrés de publicités et de recommandations. Proscenium est né de l\'envie d\'un accueil calme et beau, qui donne l\'impression que la salle s\'éteint au cinéma, construit entièrement à la main et sans Gradle.',
        },
      },
      application: { category: 'MultimediaApplication', operatingSystems: ['Android TV'] },
      indexable: true,
    },
    {
      id: 'la-mine-aux-diamants-web',
      name: 'La Mine aux Diamants',
      categories: ['games-ports', 'retro-computing'],
      createdAt: '2026-06-02',
      updatedAt: '2026-11-17',
      status: 'active',
      repositoryVisibility: 'public',
      repositoryUrl: 'https://github.com/Karlos-fr/la-mine-aux-diamants-to8-web',
      hidden: false,
      featured: true,
      featuredOrder: 3,
      stack: ['TypeScript', 'Vite', 'Canvas 2D', 'Three.js (WebGL)', 'Web Audio API', 'Node.js', 'GitHub Pages'],
      // L'écran titre sert de poster, la présentation d'une minute de vidéo d'aperçu.
      preview: {
        poster: `${MINE_RAW}/docs/screenshots/screen-title.png`,
        video: `${MINE_LFS}/video/presentation-1min.mp4`,
      },
      media: [
        {
          type: 'video',
          src: `${MINE_LFS}/video/presentation-1min.mp4`,
          poster: `${MINE_RAW}/docs/screenshots/screen-title.png`,
          title: { en: 'One-minute overview', fr: 'Présentation en 1 minute' },
          description: {
            en: 'A quick tour of the port: gameplay, options, 3D mode, showcase, editors.',
            fr: 'Tour rapide du portage : niveaux en jeu, options, mode 3D, vitrine, éditeurs.',
          },
          durationSeconds: 61,
          uploadDate: '2026-11-17',
          width: 1920,
          height: 1080,
        },
        {
          type: 'video',
          src: `${MINE_LFS}/docs/videos/2026-06-12%2016-53-44.mp4`,
          poster: `${MINE_RAW}/docs/screenshots/level-01.png`,
          title: { en: 'Demo', fr: 'Démonstration' },
          description: {
            en: 'Extended in-browser gameplay demonstration.',
            fr: 'Démonstration longue du jeu dans le navigateur.',
          },
          durationSeconds: 277,
          uploadDate: '2026-06-12',
          width: 1920,
          height: 1080,
        },
        { type: 'image', src: `${MINE_RAW}/docs/screenshots/screen-title.png`, alt: { en: 'Title screen: the miner holding a diamond', fr: 'Écran titre : le mineur tient un diamant' }, width: 1280, height: 800 },
        { type: 'image', src: `${MINE_RAW}/docs/screenshots/level-01.png`, alt: { en: 'Gallery 01 in play with the TO8 HUD', fr: 'Galerie 01 en jeu avec le HUD TO8' }, width: 1280, height: 800 },
        { type: 'image', src: `${MINE_RAW}/docs/screenshots/diorama-3d.png`, alt: { en: 'A level rendered as a 3D diorama', fr: 'Un niveau rendu en diorama 3D' }, width: 1280, height: 800 },
        { type: 'image', src: `${MINE_RAW}/docs/screenshots/options-display.png`, alt: { en: 'Options panel, Display tab', fr: 'Panneau d\'options, onglet Affichage' }, width: 880, height: 498 },
        { type: 'image', src: `${MINE_RAW}/docs/screenshots/showcase.png`, alt: { en: 'Level showcase with previews', fr: 'Vitrine des niveaux avec aperçus' }, width: 1280, height: 800 },
        { type: 'image', src: `${MINE_RAW}/docs/screenshots/editor.png`, alt: { en: 'Built-in level editor', fr: 'Éditeur de niveaux intégré' }, width: 1280, height: 800 },
        { type: 'image', src: `${MINE_RAW}/docs/screenshots/character-editor.png`, alt: { en: 'Character color editor', fr: 'Éditeur de couleurs du personnage' }, width: 1280, height: 720 },
        { type: 'image', src: `${MINE_RAW}/docs/screenshots/level-generator.png`, alt: { en: 'Experimental level generator', fr: 'Générateur de niveaux expérimental' }, width: 1280, height: 800 },
      ],
      links: [
        { type: 'demo', url: 'https://karlos-fr.github.io/la-mine-aux-diamants-to8-web/' },
        { type: 'documentation', url: 'https://github.com/Karlos-fr/la-mine-aux-diamants-to8-web#readme' },
      ],
      content: {
        en: {
          tagline: 'The 1986 Thomson TO8 game, ported pixel-close to TypeScript and playable in the browser.',
          description: 'A modern port of La Mine aux Diamants, published by Infogrames in 1986 for the Thomson TO8. Graphics, levels, fonts and sounds were extracted or rebuilt from the original binaries and an analysis of the 6809 assembly. The gameplay is then reproduced tile by tile in a modern TypeScript architecture. Besides the TO8-faithful rendering, the project offers a true 3D diorama mode, a level editor, a level generator and a character editor.',
          features: [
            'Infogrames splash and animated title screen with its music',
            'Original attract/demo mode with its decoded hidden level',
            'Tile-based engine: rocks, diamonds, monsters, special creature, transformer block, gravity, explosions',
            'Original levels decoded from the floppy disk',
            'TO8 HUD: score, time, high score, gallery, goal',
            'Options panel: zoom, stretch, density, smooth movement',
            'Diorama TO8 mode in true 3D (Three.js), purely visual',
            'Level showcase with animated previews',
            'Built-in JSON level editor',
            'Seeded procedural level generator',
            'Free-color character editor',
          ],
          limitations: [
            'Timing is not yet perfectly matched to the TO8.',
            'Some behaviors remain hypotheses until the assembly analysis settles them.',
            'Level progression and unlocking are not wired in yet.',
            'The level generator is still experimental.',
          ],
          about: 'A preservation project around a classic of 1980s French home computing. The goal is to play the game as it was, documenting every choice from the original sources, then give it modern tools. Rights to the original game remain with their respective owners.',
        },
        fr: {
          tagline: 'Le jeu Thomson TO8 de 1986, porté au plus près du pixel en TypeScript et jouable dans le navigateur.',
          description: 'Portage moderne de La Mine aux Diamants, publié par Infogrames en 1986 sur Thomson TO8. Les graphismes, les niveaux, les polices et les sons ont été extraits ou reconstruits à partir des binaires et de l\'analyse de l\'ASM 6809 d\'origine. Le gameplay est ensuite reproduit case par case dans une architecture TypeScript moderne. En plus du rendu fidèle au TO8, le projet propose un mode diorama en vraie 3D, un éditeur de niveaux, un générateur de niveaux et un éditeur de personnage.',
          features: [
            'Écran Infogrames, écran titre animé avec sa musique',
            'Mode démo (attract) d\'origine, avec son niveau caché décodé',
            'Moteur case par case : rochers, diamants, monstres, créature spéciale, bloc transformateur, gravité, explosions',
            'Niveaux originaux décodés depuis la disquette',
            'HUD TO8 : score, temps, record, galerie, objectif',
            'Panneau d\'options : zoom, étirage, densité, mouvements fluides',
            'Mode Diorama TO8 en vraie 3D (Three.js), purement visuel',
            'Vitrine des niveaux avec aperçus animés',
            'Éditeur de niveaux JSON intégré',
            'Générateur de niveaux à partir d\'une graine (seed)',
            'Éditeur de personnage aux couleurs libres',
          ],
          limitations: [
            'Le cadencement n\'est pas encore parfaitement calé sur le TO8.',
            'Certains comportements restent des hypothèses tant que l\'analyse de l\'ASM n\'a pas tranché.',
            'La progression et le déblocage des niveaux ne sont pas encore branchés.',
            'Le générateur de niveaux reste expérimental.',
          ],
          about: 'Un travail de préservation autour d\'un classique de l\'informatique française des années 80. L\'objectif est de rejouer le jeu tel qu\'il était, en documentant chaque choix à partir des sources d\'origine, puis de lui offrir des outils modernes. Les droits du jeu original restent à leurs ayants droit.',
        },
      },
      application: { category: 'GameApplication', operatingSystems: ['Web browser'] },
      indexable: true,
    },
    {
      id: 'minesweeper-infinite',
      name: 'Minesweeper Infinite',
      categories: ['games-ports', 'web'],
      // Premier commit et dernière mise à jour du dépôt.
      createdAt: '2026-08-03',
      updatedAt: '2026-08-17',
      status: 'stable',
      repositoryVisibility: 'public',
      repositoryUrl: 'https://github.com/Karlos-fr/minesweeper-infinite',
      hidden: false,
      featured: false,
      stack: ['TypeScript', 'Vite', 'Canvas 2D', 'Service Worker', 'GitHub Pages'],
      // L'icône du dépôt sert de poster : c'est elle qui apparaît sur le bureau XP du PC de la chambre.
      preview: { poster: `${MINESWEEPER_RAW}/doc/icon.png` },
      media: [
        { type: 'image', src: `${MINESWEEPER_RAW}/doc/header.png`, alt: { en: 'Minesweeper Infinite banner', fr: 'Bannière de Minesweeper Infinite' }, width: 2172, height: 724 },
        { type: 'image', src: `${MINESWEEPER_RAW}/doc/icon.png`, alt: { en: 'Minesweeper Infinite icon: a mine on an infinite grid', fr: 'Icône de Minesweeper Infinite : une mine sur une grille infinie' }, width: 1254, height: 1254 },
      ],
      links: [
        { type: 'demo', url: 'https://karlos-fr.github.io/minesweeper-infinite/', window: true },
        { type: 'documentation', url: 'https://github.com/Karlos-fr/minesweeper-infinite#readme' },
      ],
      content: {
        en: {
          tagline: 'The classic Windows XP Minesweeper, faithfully rebuilt for the browser, with a grid that fills any window.',
          description: 'Minesweeper Infinite recreates the classic Minesweeper in strict TypeScript, with the pixel-art look of the Windows XP version: sprites, counters, smiley face and menu. It runs in any modern browser with no installation. On top of the three classic difficulties, a Fit to window mode sizes the grid and the mine count to the available space, and three zoom levels keep the pixel art sharp.',
          features: [
            'Complete game engine: mine placement, recursive opening, flags, chord opening, win and loss detection',
            'Windows XP pixel-art interface: sprites, counters, faces and menu',
            'Beginner, Intermediate and Expert difficulties',
            'Fit to window mode that adapts the grid and the mine count',
            '1x, 1.5x and 2x zoom, for every difficulty',
            'Mouse and touch controls, with long press for flags',
            'Timer, remaining-mine counter and sound effects',
            'Basic offline play through a service worker',
          ],
          limitations: [
            'Best times are not saved yet.',
          ],
          about: 'A small, faithful remake of a desktop classic, written from scratch in TypeScript. The visual presentation is based on ShizukuIchi/minesweeper.',
        },
        fr: {
          tagline: 'Le Démineur classique de Windows XP, refait fidèlement pour le navigateur, avec une grille qui remplit n\'importe quelle fenêtre.',
          description: 'Minesweeper Infinite reproduit le Démineur classique en TypeScript strict, avec l\'aspect pixel art de la version Windows XP : sprites, compteurs, smiley et menu. Il se lance dans n\'importe quel navigateur récent, sans installation. En plus des trois difficultés classiques, le mode « Fit to window » dimensionne la grille et le nombre de mines selon la place disponible, et trois niveaux de zoom gardent un pixel art net.',
          features: [
            'Moteur de jeu complet : placement des mines, ouverture récursive, drapeaux, ouverture combinée, victoire et défaite',
            'Interface pixel art de Windows XP : sprites, compteurs, visages et menu',
            'Difficultés Débutant, Intermédiaire et Expert',
            'Mode « Fit to window » qui adapte la grille et le nombre de mines',
            'Zoom 1x, 1,5x et 2x, pour chaque difficulté',
            'Contrôles à la souris et au tactile, appui long pour les drapeaux',
            'Chronomètre, compteur de mines restantes et effets sonores',
            'Jeu hors ligne de base grâce à un service worker',
          ],
          limitations: [
            'Les meilleurs temps ne sont pas encore enregistrés.',
          ],
          about: 'Un petit remake fidèle d\'un classique du bureau, écrit de zéro en TypeScript. La présentation visuelle s\'appuie sur ShizukuIchi/minesweeper.',
        },
      },
      application: { category: 'GameApplication', operatingSystems: ['Web browser'] },
      indexable: true,
    },
  ],
};
