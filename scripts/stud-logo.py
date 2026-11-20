"""Image en relief du logo LEGO des tenons, pour la chambre.
Usage : python scripts/stud-logo.py <dossier scripts lego-moc> <sortie.png>
Rasterise vu de dessus le logo LDraw en relief (p/logo3.dat, place comme dans
stud-logo3.dat) : niveaux de gris = hauteur au-dessus du dessus du tenon. L'image couvre
le disque du tenon (rayon 6 LDU) ; x vers la droite, z vers le haut de l'image, comme les
coordonnees que scripts/convert-moc.py donne au dessus de chaque tenon."""
import sys
import numpy as np
from PIL import Image, ImageFilter
sys.path.insert(0, sys.argv[1])
import audit_moc, render_moc

audit_moc.configure()
faces, _ = render_moc.mesh(str(audit_moc.ROOT / 'p' / 'logo3.dat'))
SIZE = 256
R = 6.0
height = np.zeros((SIZE, SIZE))
# Centres des pixels, en LDU ; la ligne 0 de l'image est z = +R.
xs = (np.arange(SIZE) + 0.5) / SIZE * 2 * R - R
X, Z = np.meshgrid(xs, -xs)
for tri in faces:
    a, b, c = tri[:, [0, 2]]
    d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
    if abs(d) < 1e-9: continue
    l1 = ((b[1] - c[1]) * (X - c[0]) + (c[0] - b[0]) * (Z - c[1])) / d
    l2 = ((c[1] - a[1]) * (X - c[0]) + (a[0] - c[0]) * (Z - c[1])) / d
    l3 = 1 - l1 - l2
    inside = (l1 >= -1e-6) & (l2 >= -1e-6) & (l3 >= -1e-6)
    # LDraw : y vers le bas ; le logo monte au-dessus de y = 0.
    h = -(l1 * tri[0, 1] + l2 * tri[1, 1] + l3 * tri[2, 1])
    height = np.where(inside, np.maximum(height, h), height)
height = np.clip(height / max(height.max(), 1e-6), 0, 1)
image = Image.fromarray((height * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
image.save(sys.argv[2], optimize=True)
print(len(faces), 'triangles ; hauteur max', round(float(-faces[:, :, 1].min()), 3), 'LDU')
