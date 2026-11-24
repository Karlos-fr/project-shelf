// ============================================================================
// VirtualCubeProtocol — Messages entre la page et le Photon virtuel du cube L3D
// ----------------------------------------------------------------------------
// Types partagés par le worker du firmware (virtual-cube-worker.ts), la page qui le
// lance (virtual-cube.ts) et le modèle 3D du cube (l3d-cube.ts, l3d/photon-led.ts).
// Ce module ne contient aucun code exécuté : l'importer ne démarre pas le worker.
// ============================================================================

// Taille de l'EEPROM émulée du Photon, en octets (Device OS : 2047 octets utilisables).
export const EEPROM_SIZE = 2047;

// Signaux de la LED d'état de Device OS, dans l'ordre d'un démarrage.
export type PhotonSignal = 'off' | 'power-on' | 'network-connecting' | 'cloud-connecting' | 'cloud-handshake' | 'cloud-connected';

// Message de la page au worker : module du firmware et EEPROM sauvegardée (ou null).
export type WorkerInit = { kind: 'init'; emulatorUrl: string; eeprom: Uint8Array | null };

// Message de la page au worker : met le firmware en pause (onglet masqué) ou le relance.
export type WorkerPause = { kind: 'pause'; paused: boolean };

// Tous les messages de la page au worker.
export type WorkerIn = WorkerInit | WorkerPause;

// Messages du worker à la page : image des LED (RGB, ordre y, x, z), EEPROM modifiée et
// signal de la LED d'état.
export type WorkerOut =
  | { kind: 'frame'; rgb: Uint8Array }
  | { kind: 'eeprom'; bytes: Uint8Array }
  | { kind: 'led'; signal: PhotonSignal };
