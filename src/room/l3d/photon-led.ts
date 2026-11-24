// ============================================================================
// PhotonLed - Motifs de la LED d'état du Photon, comme Device OS
// ----------------------------------------------------------------------------
// Couleurs et périodes du thème par défaut de Device OS (particle-iot/device-os,
// system/src/system_led_signal.cpp et services/inc/rgbled.h) :
// - NETWORK_CONNECTING : vert 0x00FF00, clignotement normal (200 ms) ;
// - CLOUD_CONNECTING : cyan 0x00FFFF, clignotement normal (200 ms) ;
// - CLOUD_HANDSHAKE : cyan, clignotement rapide (100 ms) ;
// - CLOUD_CONNECTED : cyan, respiration normale (4000 ms).
// A la mise sous tension, la LED clignote en blanc. Ce fichier ne connaît que le temps.
// ============================================================================

import type { PhotonSignal } from "../virtual-cube-protocol.ts";

type Rgb = [number, number, number];
const WHITE: Rgb = [1, 1, 1];
const GREEN: Rgb = [0, 1, 0];
const CYAN: Rgb = [0, 1, 1];
const OFF: Rgb = [0, 0, 0];

const scale = ([r, g, b]: Rgb, level: number): Rgb => [r * level, g * level, b * level];
// Clignotement : allumée la première moitié de chaque période.
const blink = (colour: Rgb, period: number, t: number): Rgb => ((t % period) < period / 2 ? colour : OFF);
// Respiration : montée et descente douces, sans jamais s'éteindre tout à fait.
const breathe = (colour: Rgb, period: number, t: number): Rgb =>
  scale(colour, 0.04 + 0.96 * (0.5 - 0.5 * Math.cos((2 * Math.PI * t) / period)));

// ----------------------------------------------------------------------------
// Couleur de la LED pour un signal, t millisecondes après son début.
// ----------------------------------------------------------------------------
export function photonLedColour(signal: PhotonSignal, t: number): Rgb {
  switch (signal) {
    case "power-on": return WHITE;
    case "network-connecting": return blink(GREEN, 200, t);
    case "cloud-connecting": return blink(CYAN, 200, t);
    case "cloud-handshake": return blink(CYAN, 100, t);
    case "cloud-connected": return breathe(CYAN, 4000, t);
    default: return OFF;
  }
}
