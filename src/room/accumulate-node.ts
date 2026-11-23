// ============================================================================
// AccumulateNode — Moyenne progressive des images quand la caméra est immobile
// ----------------------------------------------------------------------------
// Le TRAA de Three.js garde toujours 5 % de l'image courante et découpe son
// historique au plus près : à l'arrêt, le décalage sous-pixel de la caméra et le
// bruit du SSGI ne convergent jamais tout à fait, et les murs comme les bords
// d'ombre crépitent d'une image à l'autre. Ce nœud, placé en bout de chaîne, fait
// la moyenne exacte des images rendues depuis l'arrêt (poids 1/k pour la k-ième) :
// l'écart entre deux images tend vers zéro et l'image se fige, lisse.
// Deux rectangles (écran du PC, cube à LED) restent en direct : ce qui y change
// franchement n'est pas moyenné. weight vaut 1 dès que la caméra ou la scène bouge.
// ============================================================================
import * as THREE from 'three/webgpu';
import { Fn, abs, max, mix, passTexture, screenUV, smoothstep, step, texture, uniform, vec4 } from 'three/tsl';

let rendererState: ReturnType<typeof THREE.RendererUtils.resetRendererState> | undefined;

export class AccumulateNode extends THREE.Node {
  // Poids de l'image courante : 1 en mouvement, 1/k la k-ième image à l'arrêt.
  readonly weight = uniform(1);
  // Zones en direct, en coordonnées d'écran (0 à 1, origine en haut à gauche) : x0, y0, x1, y1.
  readonly live = [uniform(new THREE.Vector4()), uniform(new THREE.Vector4())];
  private readonly input: THREE.TextureNode;
  private current = new THREE.RenderTarget(1, 1, { depthBuffer: false, type: THREE.HalfFloatType });
  private previous = new THREE.RenderTarget(1, 1, { depthBuffer: false, type: THREE.HalfFloatType });
  private readonly output: THREE.TextureNode;
  private readonly history: THREE.TextureNode;
  private readonly material = new THREE.NodeMaterial();
  private readonly quad = new THREE.QuadMesh(this.material);
  private readonly size = new THREE.Vector2();

  constructor(input: THREE.TextureNode) {
    super('vec4');
    this.input = input;
    this.output = passTexture(this as unknown as THREE.PassNode, this.current.texture);
    this.history = texture(this.previous.texture);
    this.updateBeforeType = THREE.NodeUpdateType.FRAME;
  }

  override setup(): THREE.TextureNode {
    const inside = (rect: THREE.UniformNode<'vec4', THREE.Vector4>) =>
      step(rect.x, screenUV.x).mul(step(screenUV.x, rect.z)).mul(step(rect.y, screenUV.y)).mul(step(screenUV.y, rect.w));
    this.material.name = 'Accumulate';
    this.material.fragmentNode = Fn(() => {
      const fresh = this.input.sample(screenUV);
      const old = this.history.sample(screenUV);
      // Dans les zones en direct, seul ce qui change franchement (une LED, l'écran) remplace
      // l'historique ; le bruit de rendu, petit, y reste moyenné comme ailleurs.
      const delta = abs(fresh.rgb.sub(old.rgb));
      const change = smoothstep(0.02, 0.12, max(delta.r, max(delta.g, delta.b)));
      const w = this.weight.max(change.mul(inside(this.live[0]!).max(inside(this.live[1]!))));
      return vec4(mix(old.rgb, fresh.rgb, w), 1);
    })();
    return this.output;
  }

  override updateBefore(frame: THREE.NodeFrame): undefined {
    const renderer = frame.renderer as THREE.Renderer;
    rendererState = THREE.RendererUtils.resetRendererState(renderer, rendererState as Parameters<typeof THREE.RendererUtils.resetRendererState>[1]);
    renderer.getDrawingBufferSize(this.size);
    // Nouvelle taille : l'historique ne vaut plus rien, on repart de l'image courante.
    if (this.current.width !== this.size.x || this.current.height !== this.size.y) {
      this.current.setSize(this.size.x, this.size.y);
      this.previous.setSize(this.size.x, this.size.y);
      this.weight.value = 1;
    }
    this.output.value = this.current.texture;
    this.history.value = this.previous.texture;
    renderer.setRenderTarget(this.current);
    this.quad.render(renderer);
    [this.current, this.previous] = [this.previous, this.current];
    THREE.RendererUtils.restoreRendererState(renderer, rendererState);
    return undefined;
  }

  override dispose(): void {
    super.dispose();
    this.current.dispose();
    this.previous.dispose();
    this.material.dispose();
  }
}
