// ============================================================================
// softPointShadow — Filtre d'ombre doux et sans bruit pour une lumière ponctuelle
// ----------------------------------------------------------------------------
// Le filtre PCF de Three.js en WebGPU fait tourner ses cinq échantillons selon un
// bruit par pixel (interleaved gradient noise) : sans lissage temporel, il laisse une
// trame diagonale visible, et avec, elle crépite. Ici, une grille fixe de 3 x 3
// échantillons dans le plan tangent, chacun déjà adouci par la comparaison bilinéaire
// du GPU : bord dégradé, identique d'une image à l'autre. Branché par shadow.filterNode ;
// même calcul de profondeur que PointShadowNode (tampon de profondeur classique).
// ============================================================================
import * as THREE from 'three/webgpu';
import { abs, cross, cubeTexture, float, Fn, max, normalize, reference, renderGroup, vec3 } from 'three/tsl';

type FilterInputs = { depthTexture: THREE.DepthTexture; bd3D: THREE.Node<'vec3'>; distance: THREE.Node<'float'>; shadow: THREE.LightShadow };

// spread : écart entre deux échantillons voisins, en texels de la carte d'ombre.
export function softPointShadow(spread: number) {
  return Fn(({ depthTexture, bd3D, distance, shadow }: FilterInputs) => {
    const mapSize = reference('mapSize', 'vec2', shadow).setGroup(renderGroup);
    const near = reference('near', 'float', shadow.camera).setGroup(renderGroup);
    const far = reference('far', 'float', shadow.camera).setGroup(renderGroup);
    const bias = reference('bias', 'float', shadow).setGroup(renderGroup);
    const step = float(2 * spread).div(mapSize.x).toConst();
    const absDir = abs(bd3D);
    const tangent = normalize(cross(bd3D, absDir.x.greaterThan(absDir.z).select(vec3(0, 1, 0), vec3(1, 0, 0)))).toConst();
    const bitangent = cross(bd3D, tangent).toConst();
    // Profondeur attendue sur la face du cube où tombe chaque échantillon.
    const depthA = far.div(far.sub(near)).add(bias).toConst();
    const depthB = near.mul(far).div(far.sub(near).mul(distance)).negate().toConst();
    let lit: THREE.Node<'float'> = float(0);
    for (const u of [-1, 0, 1]) {
      for (const v of [-1, 0, 1]) {
        const direction = bd3D.add(tangent.mul(u).add(bitangent.mul(v)).mul(step)).toConst();
        const a = abs(direction);
        const maxAbs = max(a.x, max(a.y, a.z));
        lit = lit.add(cubeTexture(depthTexture as unknown as THREE.CubeTexture, direction).compare(depthA.add(depthB.div(maxAbs))) as unknown as THREE.Node<'float'>);
      }
    }
    return lit.div(9);
  });
}
