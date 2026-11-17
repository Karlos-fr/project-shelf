// ============================================================================
// ProjectCatalogue — Source déclarative des projets réellement publiables
// ----------------------------------------------------------------------------
// Ce fichier est la source de vérité éditoriale préparée avec assistance LLM puis
// relue humainement. Les médias des projets restent hébergés dans leurs propres
// dépôts et sont référencés ici par URL HTTPS.
// ============================================================================
import type { Catalogue } from '../domain/project.ts';

// Bases des fichiers des dépôts de projets servis par GitHub.
const LACTEA_RAW = 'https://raw.githubusercontent.com/Karlos-fr/lactea/main';
const PROSCENIUM_RAW = 'https://raw.githubusercontent.com/Karlos-fr/proscenium/main';

// Catalogue de production ; les fixtures de test vivent dans tests/.
export const PROJECT_CATALOGUE: Catalogue = {
  categories: [
    { id: 'android-tv-apps', label: { en: 'Android TV apps', fr: 'Applications Android TV' } },
  ],
  projects: [
    {
      id: 'lactea',
      name: 'Lactea',
      categories: ['android-tv-apps'],
      createdAt: '2026-11-16',
      updatedAt: '2026-11-17',
      // Version 0.1.0 en cours : aucune version publiée pour l'instant.
      status: 'active',
      repositoryVisibility: 'public',
      repositoryUrl: 'https://github.com/Karlos-fr/lactea',
      hidden: false,
      featured: true,
      featuredOrder: 1,
      stack: ['Kotlin', 'Android TV / Google TV', 'C++ (JNI)', 'projectM 4.1.8 (fork)', 'OpenGL ES 3', 'Android NDK', 'CMake', 'Python'],
      // La boucle d'aperçu courte reste à créer : la scène affiche le poster seul.
      preview: {
        poster: `${LACTEA_RAW}/logos/lactea-v2-banner.png`,
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
      // Le lien de version téléchargeable sera ajouté à la première release.
      links: [
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
            'No release published yet.',
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
            'Aucune version publiée pour l\'instant.',
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
      featuredOrder: 2,
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
  ],
};
