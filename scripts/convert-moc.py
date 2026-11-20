"""Convertit un MOC Studio (.io) en maillage compact pour la chambre.
Usage : python scripts/convert-moc.py <dossier scripts lego-moc> <modele.io> <sortie.bin>
Format : uint32 longueur de l'en-tete JSON, en-tete JSON (UTF-8, complete a 4 octets),
puis pour chaque groupe de couleur : positions int16 (x, y, z ; unite = 1/20 LDU),
indices uint32, et 4 octets int8 par sommet (u, v, w, 0) : sur le dessus des tenons,
(u, v) donne la position dans le disque (±120 au bord, axes x et z du tenon) et w = 127
pour y poser le logo LEGO ; ailleurs, -128. Repere de sortie : y vers le haut, avant vers +z, origine au centre du
dessous de la base."""
import sys, json, re, struct
from functools import lru_cache
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

# Tenons pleins (stud.dat) d'une piece : matrice et position dans le repere de la piece.
@lru_cache(None)
def stud_frames(ref):
    out = []
    for line in audit_moc.resolve(ref.replace(chr(92), '/')).read_text(errors='replace').splitlines():
        t = line.split()
        if not t or t[0] != '1': continue
        m = np.array(t[5:14], float).reshape(3, 3); q = np.array(t[2:5], float); sub = ' '.join(t[14:])
        name = sub.lower().replace(chr(92), '/').split('/')[-1]
        if name == 'stud.dat': out.append((m, q))
        elif not name.startswith(('stud', 'stu2', '4-4', '1-4', '2-4', '3-4', '1-8', '3-8', '5-8', '7-8', '1-16')):
            out.extend((m @ ms, m @ qs + q) for ms, qs in stud_frames(sub))
    return tuple(out)

# Coordonnees (u, v) dans le disque du dessus de chaque tenon ; NaN ailleurs.
def stud_tops(ref, f):
    uv = np.full(f.shape[:2] + (2,), np.nan)
    for m, q in stud_frames(ref):
        top = m @ np.array([0, -4, 0]) + q
        axis = m @ np.array([0, -1, 0]); axis /= np.linalg.norm(axis)
        ex = m @ np.array([1, 0, 0]); ez = m @ np.array([0, 0, 1])
        d = f - top
        u = d @ ex / (ex @ ex) / 6
        v = d @ ez / (ez @ ez) / 6
        hit = (np.abs(d @ axis) < 0.05).all(1) & (u * u + v * v < 1.02).all(1)
        uv[hit] = np.stack([u, v], -1)[hit]
    return uv

groups = {}
for p in parts:
    f, c = render_moc.mesh(p['ref'])
    if not len(f): continue
    w = f @ p['m'].T + p['p']
    uv = stud_tops(p['ref'], f)
    c = np.where(c == 16, p['color'], c)
    for code in np.unique(c):
        groups.setdefault(int(code), []).append((w[c == code], uv[c == code]))

# LDraw : y vers le bas, avant vers -z. On tourne de 180 degres autour de x.
allv = np.concatenate([np.concatenate([t for t, _ in g]).reshape(-1, 3) for g in groups.values()])
bottom = allv[:, 1].max()
base = allv[allv[:, 1] > bottom - 8]
centre = np.array([(base[:, 0].min() + base[:, 0].max()) / 2, bottom, (base[:, 2].min() + base[:, 2].max()) / 2])
Q = 20
header = {'source': 'Karlos-fr/lego-mocs ' + Path(src).name, 'unit': 0.0004 / Q, 'logo': True, 'groups': []}
blobs = []
studs = 0
for code, chunks in sorted(groups.items()):
    tri = np.concatenate([t for t, _ in chunks]) - centre
    tuv = np.concatenate([u for _, u in chunks]).reshape(-1, 2)
    tri = tri * np.array([1, -1, -1])
    q = np.round(tri.reshape(-1, 3) * Q).astype(np.int32)
    assert np.abs(q).max() < 32767
    uniq, index = np.unique(q, axis=0, return_inverse=True)
    index = index.reshape(-1).astype(np.uint32)
    index_all = index.copy()
    tris = index.reshape(-1, 3)
    keep = (tris[:, 0] != tris[:, 1]) & (tris[:, 1] != tris[:, 2]) & (tris[:, 0] != tris[:, 2])
    index = tris[keep].reshape(-1)
    info = colours.get(code, {'name': str(code), 'rgb': 'ff00ff', 'alpha': 1, 'finish': None})
    header['groups'].append({'code': code, **info, 'vertices': len(uniq), 'indices': len(index)})
    blobs.append(uniq.astype('<i2').tobytes() + (b'\0\0' if len(uniq) * 3 % 2 else b''))
    blobs.append(index.astype('<u4').tobytes())
    # Logo : un sommet garde les coordonnees du dessus de tenon qu'il borde, s'il en borde un.
    logo = np.full((len(uniq), 4), -128, np.int16); logo[:, 3] = 0
    marked = ~np.isnan(tuv[:, 0])
    flat = index_all[marked]
    logo[flat, 0] = np.clip(np.round(tuv[marked, 0] * 120), -120, 120)
    logo[flat, 1] = np.clip(np.round(tuv[marked, 1] * 120), -120, 120)
    logo[flat, 2] = 127
    studs += int(marked.sum()) // 3
    blobs.append(logo.astype('<i1').tobytes())
size = (allv - centre) * 0.4
header['size_mm'] = [round(float(size[:, i].max() - size[:, i].min()), 1) for i in range(3)]
text = json.dumps(header, ensure_ascii=False).encode()
text += b' ' * (-len(text) % 4)
with open(sys.argv[3], 'wb') as out:
    out.write(struct.pack('<I', len(text)) + text + b''.join(blobs))
print(json.dumps({k: header[k] for k in ('size_mm',)}), sum(g['indices'] for g in header['groups']) // 3, 'triangles ;', studs, 'triangles de dessus de tenon')
for g in header['groups']: print(g['code'], g['name'], g['rgb'], g['alpha'], g['finish'], g['vertices'], g['indices'] // 3)
