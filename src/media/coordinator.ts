// ============================================================================
// MediaCoordinator — Arbitrage unique des lecteurs décoratifs et de détail
// ----------------------------------------------------------------------------
// Ce module attribue une seule priorité de lecture à la fois. Il ne manipule ni
// élément vidéo ni DOM : chaque propriétaire fournit uniquement sa fonction pause.
// ============================================================================

export type MediaLease = {
  isGranted(): boolean;
  release(): void;
};

export type MediaCoordinator = {
  request(owner: string, priority: number, pause: () => void): MediaLease;
  subscribe(listener: () => void): () => void;
  suspendAll(): void;
  resumeAll(): void;
};

type RequestRecord = {
  owner: string;
  priority: number;
  pause: () => void;
  sequence: number;
  leaseId: number;
};

// ----------------------------------------------------------------------------
// Crée un arbitre de lecture isolé pour une page de vitrine.
// Retour : contrôleur mutable dont les baux exposent seulement accord et libération.
// Effets de bord : appelle les callbacks pause lors d'une perte réelle de priorité
// et les abonnés lors d'un changement de propriétaire accordé.
// ----------------------------------------------------------------------------
export function createMediaCoordinator(): MediaCoordinator {
  // Les demandes sont indexées par propriétaire afin qu'un remontage remplace son bail.
  const requests = new Map<string, RequestRecord>();
  // Les abonnés servent aux hooks qui doivent retenter une lecture quand le bail change.
  const listeners = new Set<() => void>();
  // La séquence départage les priorités identiques sans oscillation entre lecteurs.
  let sequence = 0;
  // L'identifiant de bail invalide explicitement une ancienne demande du même propriétaire.
  let leaseId = 0;
  // Le propriétaire courant est nul lorsqu'aucune demande n'est accordée ou en suspension.
  let activeOwner: string | null = null;
  // Une suspension globale ne détruit pas les demandes qui pourront être réévaluées ensuite.
  let suspended = false;

  // ----------------------------------------------------------------------------
  // Enregistre ou remplace la demande d'un propriétaire.
  // Paramètres : owner est stable par lecteur ; priority est finie ; pause interrompt
  // immédiatement le lecteur si une demande plus prioritaire prend la main.
  // Retour : bail invalidé par remplacement ou libération ; release est idempotent.
  // Erreurs : refuse propriétaire vide, priorité non finie et callback non fonctionnel.
  // ----------------------------------------------------------------------------
  function request(owner: string, priority: number, pause: () => void): MediaLease {
    if (!owner.trim()) throw new Error('Le propriétaire média ne peut pas être vide.');
    if (!Number.isFinite(priority)) throw new Error('La priorité média doit être finie.');
    if (typeof pause !== 'function') throw new Error('Le callback de pause média est obligatoire.');
    const id = ++leaseId;
    const existing = requests.get(owner);
    requests.set(owner, {
      owner,
      priority,
      pause,
      sequence: existing?.sequence ?? ++sequence,
      leaseId: id,
    });
    recompute();
    let released = false;
    return {
      // ------------------------------------------------------------------------
      // Indique si ce bail précis possède actuellement l'autorisation de lecture.
      // Retour : faux après remplacement, libération ou suspension globale.
      // ------------------------------------------------------------------------
      isGranted(): boolean {
        return !released && !suspended && activeOwner === owner && requests.get(owner)?.leaseId === id;
      },
      // ------------------------------------------------------------------------
      // Libère ce bail sans supprimer une demande plus récente du même propriétaire.
      // Effets de bord : peut accorder immédiatement la demande suivante.
      // ------------------------------------------------------------------------
      release(): void {
        if (released) return;
        released = true;
        if (requests.get(owner)?.leaseId !== id) return;
        requests.delete(owner);
        recompute();
      },
    };
  }

  // ----------------------------------------------------------------------------
  // Abonne un observateur aux changements de propriétaire accordé.
  // Paramètres : listener est appelé après la transition ; retour : désabonnement idempotent.
  // ----------------------------------------------------------------------------
  function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    let subscribed = true;
    // --------------------------------------------------------------------------
    // Retire l'observateur sans erreur lorsqu'il est déjà désabonné.
    // --------------------------------------------------------------------------
    return function unsubscribe(): void {
      if (!subscribed) return;
      subscribed = false;
      listeners.delete(listener);
    };
  }

  // ----------------------------------------------------------------------------
  // Suspend tous les lecteurs sans oublier les demandes enregistrées.
  // Effets de bord : pause le propriétaire actif et notifie la perte d'autorisation.
  // ----------------------------------------------------------------------------
  function suspendAll(): void {
    if (suspended) return;
    suspended = true;
    recompute();
  }

  // ----------------------------------------------------------------------------
  // Réévalue les demandes après une suspension globale.
  // Effets de bord : peut accorder de nouveau le propriétaire prioritaire ; la décision
  // de relancer effectivement une vidéo reste à la politique locale de ce lecteur.
  // ----------------------------------------------------------------------------
  function resumeAll(): void {
    if (!suspended) return;
    suspended = false;
    recompute();
  }

  // ----------------------------------------------------------------------------
  // Recalcule le propriétaire à partir des demandes présentes et de la suspension.
  // Effets de bord : appelle la pause de l'ancien propriétaire avant notification.
  // ----------------------------------------------------------------------------
  function recompute(): void {
    const next = suspended ? null : highestPriorityOwner();
    if (next === activeOwner) return;
    const previous = activeOwner;
    activeOwner = next;
    if (previous !== null) requests.get(previous)?.pause();
    for (const listener of listeners) listener();
  }

  // ----------------------------------------------------------------------------
  // Sélectionne la demande de priorité maximale avec ancienneté comme départage stable.
  // Retour : propriétaire retenu ou null lorsque la file est vide.
  // ----------------------------------------------------------------------------
  function highestPriorityOwner(): string | null {
    let selected: RequestRecord | null = null;
    for (const candidate of requests.values()) {
      if (selected === null
        || candidate.priority > selected.priority
        || (candidate.priority === selected.priority && candidate.sequence < selected.sequence)) {
        selected = candidate;
      }
    }
    return selected?.owner ?? null;
  }

  return { request, subscribe, suspendAll, resumeAll };
}
