// ============================================================================
// VirtualCubeTest — Lecture de l'EEPROM sauvegardée du Photon virtuel
// ----------------------------------------------------------------------------
// Une EEPROM illisible ou d'une autre taille ne doit jamais atteindre le tas du
// WebAssembly : seule une valeur de EEPROM_SIZE octets est acceptée.
// ============================================================================
import { describe, expect, it } from 'vitest';
import { decodeEeprom } from '../../src/room/virtual-cube.ts';
import { EEPROM_SIZE } from '../../src/room/virtual-cube-protocol.ts';

// ----------------------------------------------------------------------------
// Encode n octets de valeur byte en base64, comme la page les sauvegarde.
// ----------------------------------------------------------------------------
function saved(n: number, byte = 7): string {
  return btoa(String.fromCharCode(...new Uint8Array(n).fill(byte)));
}

describe('decodeEeprom', () => {
  it('accepte une EEPROM de la bonne taille', () => {
    const bytes = decodeEeprom(saved(EEPROM_SIZE));
    expect(bytes?.length).toBe(EEPROM_SIZE);
    expect(bytes?.[0]).toBe(7);
  });

  it('refuse une EEPROM tronquée ou trop longue', () => {
    expect(decodeEeprom(saved(EEPROM_SIZE - 1))).toBeNull();
    expect(decodeEeprom(saved(EEPROM_SIZE + 500))).toBeNull();
  });

  it('refuse un texte qui n’est pas du base64', () => {
    expect(decodeEeprom('pas du base64 !')).toBeNull();
  });
});
