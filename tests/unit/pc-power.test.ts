// ============================================================================
// PcPowerTest — États et clavier de l'allumage du PC de la chambre
// ----------------------------------------------------------------------------
// Vérifie l'enchaînement des écrans, les voyants, et qu'une touche ne passe le
// démarrage que face à l'écran, sans bloquer Tab ni réagir aux modificateurs seuls.
// ============================================================================
import { describe, expect, it } from 'vitest';
import { bootKey, PC_NEXT, powerOf, screenOf } from '../../src/room/pc-power.ts';

describe('pc-power', () => {
  it('enchaîne l’arrêt jusqu’à éteint et l’allumage jusqu’au BIOS', () => {
    expect(PC_NEXT.shutdown?.[1]).toBe('collapse');
    expect(PC_NEXT.collapse?.[1]).toBe('off');
    expect(PC_NEXT.warmup?.[1]).toBe('bios');
    expect(PC_NEXT.bios).toBeUndefined();
    expect(PC_NEXT.welcome?.[1]).toBe('on');
  });

  it('éteint les voyants dès que l’image s’écrase', () => {
    expect(powerOf('collapse')).toBe('off');
    expect(powerOf('boot')).toBe('busy');
    expect(screenOf('warmup')).toBe('black');
    expect(screenOf('on')).toBe('desktop');
  });

  it('au BIOS, F1 démarre et les autres touches sont absorbées face à l’écran', () => {
    expect(bootKey('bios', 'F1', false, true)).toBe('boot');
    expect(bootKey('bios', 'a', false, true)).toBe('hold');
  });

  it('laisse passer Tab, Échap et les modificateurs seuls', () => {
    for (const key of ['Tab', 'Escape', 'Shift', 'Control', 'Alt', 'Meta']) {
      expect(bootKey('bios', key, false, true)).toBeNull();
      expect(bootKey('boot', key, false, true)).toBeNull();
    }
  });

  it('ignore les touches quand on regarde ailleurs ou quand la touche se répète', () => {
    expect(bootKey('bios', 'ArrowLeft', false, false)).toBeNull();
    expect(bootKey('boot', 'Enter', true, true)).toBeNull();
  });

  it('passe le reste de l’allumage au bureau avec une vraie touche', () => {
    expect(bootKey('boot', 'Enter', false, true)).toBe('on');
    expect(bootKey('welcome', ' ', false, true)).toBe('on');
    expect(bootKey('on', 'Enter', false, true)).toBeNull();
  });
});
