// ============================================================================
// DaylightTest — Heure de Paris et hauteur du soleil
// ----------------------------------------------------------------------------
// Vérifie l'heure légale (hiver et été), le décalage du paramètre ?heure, la hauteur du
// soleil à des instants connus (solstices, lever d'équinoxe) et la part de jour.
// ============================================================================
import { describe, expect, it } from 'vitest';
import { daylightFor, PARIS, parisClock, parisOffsetFor, solarElevation } from '../../src/room/daylight.ts';

describe('parisClock', () => {
  it('suit l’heure d’hiver (UTC+1) et l’heure d’été (UTC+2)', () => {
    expect(parisClock(new Date('2026-01-15T13:30:05Z'))).toEqual({ hours: 14, minutes: 30, seconds: 5 });
    expect(parisClock(new Date('2026-07-15T13:30:05Z'))).toEqual({ hours: 15, minutes: 30, seconds: 5 });
  });

  it('passe minuit à 0 h, pas à 24 h', () => {
    expect(parisClock(new Date('2026-01-15T23:00:00Z')).hours).toBe(0);
  });
});

describe('parisOffsetFor', () => {
  it('décale l’heure réelle pour afficher l’heure demandée à Paris', () => {
    const now = new Date('2026-01-15T13:30:05.250Z');
    const shifted = new Date(now.getTime() + parisOffsetFor(21, 45, now));
    expect(parisClock(shifted)).toEqual({ hours: 21, minutes: 45, seconds: 0 });
  });
});

describe('solarElevation', () => {
  it('place le soleil haut à midi solaire au solstice d’été, très bas à minuit en hiver', () => {
    expect(solarElevation(new Date('2026-06-21T11:50:00Z'), PARIS.lat, PARIS.lon)).toBeCloseTo(64.6, 0);
    expect(solarElevation(new Date('2026-12-21T23:50:00Z'), PARIS.lat, PARIS.lon)).toBeCloseTo(-64.6, 0);
  });

  it('met le soleil à l’horizon au lever d’équinoxe (vers 7 h 00 à Paris)', () => {
    expect(Math.abs(solarElevation(new Date('2026-03-20T05:57:00Z'), PARIS.lat, PARIS.lon))).toBeLessThan(1.5);
  });
});

describe('daylightFor', () => {
  it('donne la nuit, le crépuscule et le plein jour', () => {
    expect(daylightFor(-20)).toEqual({ day: 0, sun: 0, dusk: 0 });
    expect(daylightFor(30)).toEqual({ day: 1, sun: 1, dusk: 0 });
    const sunset = daylightFor(0);
    expect(sunset.dusk).toBe(1);
    expect(sunset.day).toBeGreaterThan(0.3);
    expect(sunset.day).toBeLessThan(0.7);
  });
});
