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

## Ce qui n'est pas repris

- **Petite flèche des raccourcis.** Elle n'existe pas dans le clone ; elle est redessinée en SVG (`src/xp/xp-art.ts`).
- **Bouton Démarrer.** Il est fait en CSS pour afficher « démarrer » en français ; seul le drapeau est l'image d'origine.
- **Polices.** Tahoma et Trebuchet MS sont celles du système du visiteur. Le projet ne les embarque pas.
