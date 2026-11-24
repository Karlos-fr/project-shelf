// ============================================================================
// Daylight — Heure de Paris et hauteur du soleil, pour l'horloge et la fenêtre
// ----------------------------------------------------------------------------
// Fonctions pures : heure légale française (heure d'été comprise, via Intl), hauteur du
// soleil au-dessus de l'horizon de Paris (formules simplifiées de l'almanach astronomique,
// précises à quelques dixièmes de degré), et part de jour et de crépuscule qui en découle.
// La scène s'en sert pour l'horloge à LED et le cycle jour / nuit vu par la fenêtre.
// Aucun accès au DOM ni à la scène.
// ============================================================================

// Paris, en degrés : latitude nord et longitude est.
export const PARIS = { lat: 48.8566, lon: 2.3522 } as const;

// Fuseau horaire de l'heure légale française.
const PARIS_ZONE = 'Europe/Paris';

// Heures, minutes et secondes d'une horloge.
export type ClockTime = { hours: number; minutes: number; seconds: number };

// Lecture de l'heure de Paris : un seul formateur, réutilisé à chaque seconde.
const parisFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: PARIS_ZONE, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });

// ----------------------------------------------------------------------------
// Heure légale de Paris à l'instant date (heure d'hiver UTC+1, d'été UTC+2).
// ----------------------------------------------------------------------------
export function parisClock(date: Date): ClockTime {
  const parts = parisFormat.formatToParts(date);
  const read = (type: 'hour' | 'minute' | 'second') => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return { hours: read('hour') % 24, minutes: read('minute'), seconds: read('second') };
}

// ----------------------------------------------------------------------------
// Décalage en millisecondes à ajouter à l'heure réelle pour que l'horloge de Paris
// affiche hours:minutes à l'instant now (secondes remises à zéro). Sert au paramètre
// ?heure=HH:MM de la page, pour voir la chambre de nuit ou au crépuscule.
// ----------------------------------------------------------------------------
export function parisOffsetFor(hours: number, minutes: number, now: Date): number {
  const current = parisClock(now);
  const wanted = hours * 60 + minutes;
  const shown = current.hours * 60 + current.minutes;
  return ((wanted - shown) * 60 - current.seconds) * 1000 - now.getMilliseconds();
}

// ----------------------------------------------------------------------------
// Hauteur du soleil au-dessus de l'horizon, en degrés (négative la nuit).
//
// Paramètres :
// - date : instant considéré.
// - lat, lon : position de l'observateur, en degrés (nord et est positifs).
//
// Retour : hauteur en degrés, sans réfraction atmosphérique (environ 0,5° de moins
// qu'observé au lever et au coucher).
// ----------------------------------------------------------------------------
export function solarElevation(date: Date, lat: number, lon: number): number {
  const rad = Math.PI / 180;
  // Jours depuis l'époque J2000.0.
  const n = date.getTime() / 86_400_000 + 2_440_587.5 - 2_451_545.0;
  const meanLongitude = (280.46 + 0.9856474 * n) % 360;
  const meanAnomaly = ((357.528 + 0.9856003 * n) % 360) * rad;
  const eclipticLongitude = (meanLongitude + 1.915 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly)) * rad;
  const obliquity = (23.439 - 0.0000004 * n) * rad;
  const rightAscension = Math.atan2(Math.cos(obliquity) * Math.sin(eclipticLongitude), Math.cos(eclipticLongitude));
  const declination = Math.asin(Math.sin(obliquity) * Math.sin(eclipticLongitude));
  // Temps sidéral de Greenwich, en degrés, puis angle horaire local.
  const siderealDegrees = (280.46061837 + 360.98564736629 * n) % 360;
  const hourAngle = (siderealDegrees + lon) * rad - rightAscension;
  const latitude = lat * rad;
  const sine = Math.sin(latitude) * Math.sin(declination) + Math.cos(latitude) * Math.cos(declination) * Math.cos(hourAngle);
  return Math.asin(Math.max(-1, Math.min(1, sine))) / rad;
}

// Jour et crépuscule vus par la fenêtre, chacun de 0 à 1.
export type DaylightState = {
  // 0 la nuit (soleil à plus de 6° sous l'horizon), 1 en plein jour (plus de 8° au-dessus).
  day: number;
  // Soleil direct par la fenêtre : nul sous l'horizon, plein à 10° de hauteur.
  sun: number;
  // Teinte orangée du lever et du coucher : maximale à l'horizon, nulle à 10° de part et d'autre.
  dusk: number;
};

// ----------------------------------------------------------------------------
// Part de jour et de crépuscule pour une hauteur de soleil en degrés : le jour monte
// pendant le crépuscule civil (-6°) et atteint son plein quand le soleil passe 8°.
// ----------------------------------------------------------------------------
export function daylightFor(elevation: number): DaylightState {
  const smooth = (edge0: number, edge1: number, x: number) => {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  };
  return { day: smooth(-6, 8, elevation), sun: smooth(-1, 10, elevation), dusk: 1 - smooth(0, 10, Math.abs(elevation)) };
}
