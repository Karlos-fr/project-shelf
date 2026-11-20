"""Convertit un MOC Studio (.io) en maillage compact pour la chambre.
Usage : python scripts/convert-moc.py <dossier scripts lego-moc> <modele.io> <sortie.bin>
Format : uint32 longueur de l'en-tete JSON, en-tete JSON (UTF-8, complete a 4 octets),
puis pour chaque groupe de couleur : positions int16 (x, y, z ; unite = 1/20 LDU),
indices uint32. Repere de sortie : y vers le haut, avant vers +z, origine au centre du
dessous de la base."""
import sys, json, re, struct
from pathlib import Path
import numpy as np
sys.path.insert(0, sys.argv[1])
import audit_moc, render_moc

audit_moc.configure()
src = sys.argv[2]
audit_moc.mount_embedded(src)
parts = audit_moc.parse(src)

# Couleurs officielles : valeur, transparence et finition.
colours = {}
for line in (audit_moc.ROOT / 'LDConfig.ldr').read_text().splitlines():
    m = re.search(r'!COLOUR\s+(\S+)\s+CODE\s+(\d+)\s+VALUE\s+#([0-9A-Fa-f]{6})', line)
    if not m: continue
    alpha = re.search(r'ALPHA\s+(\d+)', line)
    finish = next((f for f in ('CHROME', 'PEARLESCENT', 'METAL', 'RUBBER') if f in line), None)
    colours[int(m[2])] = {'name': m[1], 'rgb': m[3].lower(), 'alpha': int(alpha[1]) / 255 if alpha else 1, 'finish': finish}

groups = {}
for p in parts:
    f, c = render_moc.mesh(p['ref'])
    if not len(f): continue
    w = f @ p['m'].T + p['p']
    c = np.where(c == 16, p['color'], c)
    for code in np.unique(c):
        groups.setdefault(int(code), []).append(w[c == code])

# LDraw : y vers le bas, avant vers -z. On tourne de 180 degres autour de x.
allv = np.concatenate([np.concatenate(g).reshape(-1, 3) for g in groups.values()])
bottom = allv[:, 1].max()
base = allv[allv[:, 1] > bottom - 8]
centre = np.array([(base[:, 0].min() + base[:, 0].max()) / 2, bottom, (base[:, 2].min() + base[:, 2].max()) / 2])
Q = 20
header = {'source': 'Karlos-fr/lego-mocs ' + Path(src).name, 'unit': 0.0004 / Q, 'groups': []}
blobs = []
for code, chunks in sorted(groups.items()):
    tri = np.concatenate(chunks) - centre
    tri = tri * np.array([1, -1, -1])
    q = np.round(tri.reshape(-1, 3) * Q).astype(np.int32)
    assert np.abs(q).max() < 32767
    uniq, index = np.unique(q, axis=0, return_inverse=True)
    index = index.reshape(-1).astype(np.uint32)
    tris = index.reshape(-1, 3)
    keep = (tris[:, 0] != tris[:, 1]) & (tris[:, 1] != tris[:, 2]) & (tris[:, 0] != tris[:, 2])
    index = tris[keep].reshape(-1)
    info = colours.get(code, {'name': str(code), 'rgb': 'ff00ff', 'alpha': 1, 'finish': None})
    header['groups'].append({'code': code, **info, 'vertices': len(uniq), 'indices': len(index)})
    blobs.append(uniq.astype('<i2').tobytes() + (b'\0\0' if len(uniq) * 3 % 2 else b''))
    blobs.append(index.astype('<u4').tobytes())
size = (allv - centre) * 0.4
header['size_mm'] = [round(float(size[:, i].max() - size[:, i].min()), 1) for i in range(3)]
text = json.dumps(header, ensure_ascii=False).encode()
text += b' ' * (-len(text) % 4)
with open(sys.argv[3], 'wb') as out:
    out.write(struct.pack('<I', len(text)) + text + b''.join(blobs))
print(json.dumps({k: header[k] for k in ('size_mm',)}), sum(g['indices'] for g in header['groups']) // 3, 'triangles')
for g in header['groups']: print(g['code'], g['name'], g['rgb'], g['alpha'], g['finish'], g['vertices'], g['indices'] // 3)
