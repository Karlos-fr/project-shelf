// ============================================================================
// PagesTargetCases — Contrats de cible et de limites GitHub Pages
// ----------------------------------------------------------------------------
// Ces tests vérifient la déduction de l'adresse Pages et les limites de taille
// sans lancer git, le build ni aucun accès réseau.
// ============================================================================
import assert from 'node:assert/strict';
import { checkPagesLimits, parseDeployOptions, parseGitHubRemote, resolvePagesTarget } from '../../scripts/pages-target.ts';
import type { RegisterCase } from './validation.ts';

// ----------------------------------------------------------------------------
// Enregistre les scénarios de publication Pages auprès du runner actif.
// ----------------------------------------------------------------------------
export function registerPagesTargetTests(register: RegisterCase): void {
  register('lit les dépôts distants HTTPS et SSH', remoteCase);
  register('publie un dépôt de projet sous son nom', projectSiteCase);
  register('publie le dépôt <owner>.github.io à la racine', userSiteCase);
  register('publie un domaine personnalisé à la racine', cnameCase);
  register('laisse priorité aux options explicites', explicitCase);
  register('refuse de pousser les projets de test', fixturePushCase);
  register('refuse option inconnue ou valeur manquante', invalidOptionCase);
  register('applique les limites de taille de Pages', limitsCase);
}

// ----------------------------------------------------------------------------
// Vérifie les formats d'URL distante produits par git et GitHub.
// ----------------------------------------------------------------------------
function remoteCase(): void {
  assert.deepEqual(parseGitHubRemote('https://github.com/Karlos-fr/project-shelf.git'), { owner: 'Karlos-fr', repo: 'project-shelf' });
  assert.deepEqual(parseGitHubRemote('git@github.com:Karlos-fr/project-shelf.git\n'), { owner: 'Karlos-fr', repo: 'project-shelf' });
  assert.throws(() => parseGitHubRemote('https://gitlab.com/a/b.git'), /github\.com/u);
}

// ----------------------------------------------------------------------------
// Vérifie l'adresse standard d'un site de projet.
// ----------------------------------------------------------------------------
function projectSiteCase(): void {
  const target = resolvePagesTarget(parseDeployOptions([]), 'https://github.com/Karlos-fr/project-shelf.git');
  assert.deepEqual(target, {
    origin: 'https://karlos-fr.github.io', base: '/project-shelf/', url: 'https://karlos-fr.github.io/project-shelf/',
  });
}

// ----------------------------------------------------------------------------
// Vérifie qu'un site utilisateur est servi à la racine de son origine.
// ----------------------------------------------------------------------------
function userSiteCase(): void {
  const target = resolvePagesTarget(parseDeployOptions([]), 'https://github.com/Karlos-fr/karlos-fr.github.io.git');
  assert.equal(target.url, 'https://karlos-fr.github.io/');
}

// ----------------------------------------------------------------------------
// Vérifie qu'un domaine personnalisé impose la racine et produit un CNAME.
// ----------------------------------------------------------------------------
function cnameCase(): void {
  const target = resolvePagesTarget(parseDeployOptions(['--cname', 'shelf.example.org']), undefined);
  assert.deepEqual(target, { origin: 'https://shelf.example.org', base: '/', url: 'https://shelf.example.org/', cname: 'shelf.example.org' });
  assert.throws(() => resolvePagesTarget(parseDeployOptions(['--cname', 'https://x.org/']), undefined), /--cname/u);
}

// ----------------------------------------------------------------------------
// Vérifie que --origin et --base remplacent la déduction depuis le dépôt.
// ----------------------------------------------------------------------------
function explicitCase(): void {
  const target = resolvePagesTarget(parseDeployOptions(['--origin', 'https://a.github.io', '--base', '/shelf/']), undefined);
  assert.equal(target.url, 'https://a.github.io/shelf/');
  assert.throws(() => resolvePagesTarget(parseDeployOptions([]), undefined), /--origin/u);
}

// ----------------------------------------------------------------------------
// Vérifie qu'un essai avec fixtures ne peut jamais être publié.
// ----------------------------------------------------------------------------
function fixturePushCase(): void {
  assert.throws(() => parseDeployOptions(['--fixture', '--push']), /--fixture/u);
  assert.deepEqual(parseDeployOptions(['--fixture']), { fixture: true, push: false });
}

// ----------------------------------------------------------------------------
// Vérifie le refus des options hors contrat.
// ----------------------------------------------------------------------------
function invalidOptionCase(): void {
  assert.throws(() => parseDeployOptions(['--force']), /inconnue/u);
  assert.throws(() => parseDeployOptions(['--origin']), /manquante/u);
  assert.throws(() => parseDeployOptions(['--base', '--push']), /manquante/u);
}

// ----------------------------------------------------------------------------
// Vérifie avertissement à 50 Mo, refus à 100 Mo par fichier et 1 Go au total.
// ----------------------------------------------------------------------------
function limitsCase(): void {
  const megabyte = 1024 * 1024;
  assert.deepEqual(checkPagesLimits([{ path: 'index.html', bytes: 10 }]), []);
  assert.equal(checkPagesLimits([{ path: 'media/a.mp4', bytes: 66 * megabyte }]).length, 1);
  assert.throws(() => checkPagesLimits([{ path: 'media/b.mp4', bytes: 101 * megabyte }]), /100 Mo/u);
  const many = Array.from({ length: 12 }, (_, index) => ({ path: `media/${index}.mp4`, bytes: 90 * megabyte }));
  assert.throws(() => checkPagesLimits(many), /1 Go/u);
}
