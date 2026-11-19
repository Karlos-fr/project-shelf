# Fichiers Windows XP de la chambre

Le bureau du PC de la chambre (`/fr/chambre/`) reprend volontairement l'interface d'origine de Windows XP, à la demande de l'auteur. Les images ci-dessous appartiennent à Microsoft. Elles sont utilisées dans ce projet personnel, non commercial et sans publicité. L'auteur assume ce choix.

Elles sont rangées dans `content/room/xp/` et servies sous `/room/xp/`.

## Provenance

Toutes les images viennent du clone open source [ShizukuIchi/winXP](https://github.com/ShizukuIchi/winXP). Le code de ce clone est sous licence MIT ; ses images sont extraites de Windows XP.

| Fichier | Origine dans winXP | Rôle |
| --- | --- | --- |
| `bliss.jpg` | fond d'écran chargé par `src/WinXP/index.js`, recadré en 1024 × 768 | fond « Bliss » |
| `computer.png` | `windowsIcons/676(32x32).png` | Poste de travail |
| `documents.png` | `windowsIcons/308(32x32).png` | Mes documents |
| `pictures.png` | `windowsIcons/307(32x32).png` | Mes images |
| `music.png` | `windowsIcons/550(32x32).png` | Ma musique |
| `recycle.png` | `windowsIcons/360(32x32).png` | Corbeille |
| `control-panel.png` | `windowsIcons/300(32x32).png` | Panneau de configuration |
| `help.png` | `windowsIcons/747(32x32).png` | Aide et support |
| `search.png` | `windowsIcons/299(32x32).png` | Rechercher |
| `run.png` | `windowsIcons/743(32x32).png` | Exécuter |
| `log-off.png` | `windowsIcons/546(32x32).png` | Fermer la session |
| `turn-off.png` | `windowsIcons/310(32x32).png` | Arrêter l'ordinateur |
| `user.png` | `windowsIcons/user.png` | avatar de session (échiquier) |
| `flag.png` | `windowsIcons/windows-off.png`, rogné et réduit (fond transparent) | drapeau du bouton Démarrer |
| `all-programs.ico` | `windowsIcons/all-programs.ico` | flèche « Tous les programmes » |
| `ie.png` | `windowsIcons/ie-paper.png` | icône Internet Explorer (titre, adresse) |
| `wmp.png`, `wmp-small.png` | `windowsIcons/846(32x32).png`, `846(16x16).png` | Lecteur Windows Media |
| `computer-small.png` | `windowsIcons/676(16x16).png` | Poste de travail (petite) |
| `documents-small.png` | `windowsIcons/308(16x16).png` | Mes documents (petite) |
| `folder-small.png`, `folder.png` | `windowsIcons/318(16x16).png`, `318(48x48).png` | dossier |
| `recycle-small.png` | `windowsIcons/360(32x32).png` | Corbeille (volet de tâches) |
| `disk.png` | `windowsIcons/334(48x48).png` | Disque local (C:) |
| `cd.png` | `windowsIcons/111(48x48).png` | Lecteur CD (D:) |
| `back.png`, `forward.png`, `up.png` | `windowsIcons/back.png`, `forward.png`, `up.png` | Précédente, Suivante, Dossier parent |
| `stop.png`, `refresh.png`, `home.png` | `windowsIcons/stop.png`, `refresh.png`, `home.png` | Arrêter, Actualiser, Démarrage |
| `search-large.png`, `favorites.png`, `history.png` | `windowsIcons/299(32x32).png`, `744(32x32).png`, `history.png` | Rechercher, Favoris, Historique |
| `go.png` | `windowsIcons/290.png` | bouton OK de la barre d'adresse |
| `logo.png` | `windowsIcons/windows-off.png` | drapeau des écrans de démarrage, d'accueil et d'arrêt |
| `throbber.png` | `windowsIcons/windows.png` | logo animé en haut à droite des fenêtres |

## Styles des fenêtres

Les cotes et dégradés des fenêtres Luna (barre de titre, boutons Réduire, Agrandir et Fermer), de la barre des tâches, d'Internet Explorer et du Poste de travail reprennent ceux du même clone, sous licence MIT, réécrits en CSS dans `src/xp/xp-windows.css`. Le Lecteur Windows Media n'existe pas dans le clone ; son habillage est dessiné pour le projet.

## Ce qui n'est pas repris

- **Petite flèche des raccourcis.** Elle n'existe pas dans le clone ; elle est redessinée en SVG (`src/xp/xp-art.ts`).
- **Bouton Démarrer.** Il est fait en CSS pour afficher « démarrer » en français ; seul le drapeau est l'image d'origine.
- **Polices.** Tahoma et Trebuchet MS sont celles du système du visiteur. Le projet ne les embarque pas.

## Affiche de la chambre

`content/room/poster-i-want-to-believe.jpg` est l'image produit de l'affiche officielle « The X-Files - I Want To Believe » (Pyramid Posters, 61 × 91,5 cm) publiée par Europosters (https://www.europosters.fr/affiches-et-posters/the-x-files-i-want-to-believe-v30002), en 473 × 709, la plus grande taille trouvée. Cette affiche reprend la photo d'ovni prise par Billy Meier en Suisse en 1975, utilisée pour le poster du bureau de Mulder. L'image appartient à ses ayants droit (Fox, Pyramid Posters, ayants droit de la photo) ; l'auteur assume ce choix pour ce projet personnel non commercial.

Une première version prise sur Flickr (« I want to believe » par mat-) a été écartée : c'est une version redessinée, pas l'original.
