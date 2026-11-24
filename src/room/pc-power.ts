// ============================================================================
// PcPower — États d'allumage et d'extinction du PC de la chambre
// ----------------------------------------------------------------------------
// Fonctions pures : enchaînement des écrans (arrêt, POST du BIOS, démarrage de XP),
// voyants et image de la dalle 3D pour chaque état, et effet d'une touche pendant le
// démarrage. La page garde l'état React et les minuteries ; la scène 3D ne reçoit que
// les voyants et l'image. Aucun accès au DOM ni à la scène.
// ============================================================================
import type { PcPower, PcScreen } from './pc-model.ts';

// États du PC : allumé, séquence d'arrêt (écran d'arrêt, image qui s'écrase), éteint, puis
// séquence d'allumage (tube qui chauffe, POST Award, démarrage de XP, accueil).
export type PcState = 'on' | 'shutdown' | 'collapse' | 'off' | 'warmup' | 'bios' | 'boot' | 'welcome';

// Durée de chaque étape automatique, en millisecondes, et étape suivante. Le BIOS
// n'avance pas seul : il s'arrête sur « Press F1 to continue ».
export const PC_NEXT: Partial<Record<PcState, [number, PcState]>> = {
  shutdown: [2600, 'collapse'], collapse: [750, 'off'],
  warmup: [1000, 'bios'], boot: [4200, 'welcome'], welcome: [2000, 'on'],
};

// États de la séquence d'allumage, qu'une touche ou un clic peut passer.
export const BOOTING: readonly PcState[] = ['warmup', 'bios', 'boot', 'welcome'];

// Touches qui ne passent jamais la séquence : modificateurs seuls et navigation du focus.
const PASSIVE_KEYS: ReadonlySet<string> = new Set(['Tab', 'Shift', 'Control', 'Alt', 'Meta', 'AltGraph', 'CapsLock', 'Escape']);

// ----------------------------------------------------------------------------
// Voyants et dalle 3D : éteint dès que l'image s'écrase, occupé pendant les séquences.
// ----------------------------------------------------------------------------
export function powerOf(state: PcState): PcPower {
  return state === 'on' ? 'on' : state === 'off' || state === 'collapse' ? 'off' : 'busy';
}

// ----------------------------------------------------------------------------
// Image de la dalle 3D pour chaque état : la séquence continue quand on regarde ailleurs.
// ----------------------------------------------------------------------------
export function screenOf(state: PcState): PcScreen {
  return ({ on: 'desktop', shutdown: 'shutdown', collapse: 'black', off: 'black', warmup: 'black', bios: 'bios', boot: 'boot', welcome: 'welcome' } as const)[state];
}

// ----------------------------------------------------------------------------
// Effet d'une touche pendant l'allumage, seulement quand on regarde l'écran.
//
// Paramètres :
// - state : état courant du PC.
// - key : event.key de la touche.
// - repeat : vrai pour une répétition automatique de touche maintenue.
// - onScreen : vrai si la caméra est face à l'écran.
//
// Retour :
// - null : la touche ne concerne pas le PC (elle garde son rôle habituel) ;
// - 'hold' : la touche est absorbée sans effet (BIOS en attente de F1) ;
// - un état : le PC y passe (F1 au BIOS, toute autre touche ailleurs dans l'allumage).
// ----------------------------------------------------------------------------
export function bootKey(state: PcState, key: string, repeat: boolean, onScreen: boolean): PcState | 'hold' | null {
  if (!onScreen || !BOOTING.includes(state) || repeat || PASSIVE_KEYS.has(key)) return null;
  if (state === 'bios') return key === 'F1' ? 'boot' : 'hold';
  return 'on';
}
