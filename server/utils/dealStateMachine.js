// ─────────────────────────────────────────────────────────────────────────────
// Sprint 2: Deal-Zustandsautomat (Sell-Side-Funnel)
//
// Zwei Ebenen:
//   1. Deal-Status (projects.deal_status): Zustand des Mandats
//   2. Interest-Stage (interests.stage): Zustand je Interessent, Grundlage
//      für ALLE Zugriffs-Gates. Serverseitig strikt durchgesetzt: Kein Nutzer
//      erreicht eine Ressource, deren Gate seine Stage nicht passiert hat.
// ─────────────────────────────────────────────────────────────────────────────

// Interest-Funnel in Reihenfolge (rejected = terminal, außerhalb der Ordnung)
const INTEREST_STAGES = ['requested', 'nda_pending', 'nda_signed', 'im_granted', 'dataroom_granted', 'loi'];

// Erlaubte Interest-Übergänge (strikt vorwärts + rejected aus jedem Zustand)
const INTEREST_TRANSITIONS = {
  requested:        ['nda_pending', 'nda_signed', 'rejected'],   // nda_signed direkt bei Online-Signatur
  nda_pending:      ['nda_signed', 'rejected'],
  nda_signed:       ['im_granted', 'dataroom_granted', 'rejected'], // dataroom direkt bei Admin-Freigabe
  im_granted:       ['dataroom_granted', 'rejected'],
  dataroom_granted: ['loi', 'rejected'],
  loi:              ['rejected'],
  rejected:         [],
};

// Deal-Status-Übergänge
// „outreach" (Ansprache): Teaser steht, die Käuferansprache läuft über den
// CRM-Funnel: aber noch niemand ist in der Prüfung.
const DEAL_TRANSITIONS = {
  draft:        ['teaser_live', 'withdrawn'],
  teaser_live:  ['outreach', 'in_diligence', 'draft', 'withdrawn'],
  outreach:     ['in_diligence', 'teaser_live', 'withdrawn'],
  in_diligence: ['loi', 'outreach', 'teaser_live', 'withdrawn'],
  loi:          ['closed', 'in_diligence', 'withdrawn'],
  closed:       [],
  withdrawn:    ['draft'],
};

// Mindest-Stage je Ressource. 'teaser' ist für eingeloggte Nutzer frei.
const RESOURCE_GATES = {
  teaser:   null,                // Login genügt
  im:       'nda_signed',        // IM/Exposé erst nach unterschriebenem NDA
  details:  'dataroom_granted',  // Projekt-Detaildaten (Finanzen, Team)
  dataroom: 'dataroom_granted',  // Datenraum-Dokumente
  qa:       'dataroom_granted',  // Q&A-Modul (Sprint 4)
};

function stageRank(stage) {
  return INTEREST_STAGES.indexOf(stage); // rejected → -1
}

// Hat die Stage das Gate der Ressource passiert?
function stageAllows(stage, resource) {
  const gate = RESOURCE_GATES[resource];
  if (gate === undefined) return false;          // unbekannte Ressource → verweigern
  if (gate === null) return true;                // kein Gate
  if (!stage || stage === 'rejected') return false;
  return stageRank(stage) >= stageRank(gate);
}

function canTransitionInterest(from, to) {
  return (INTEREST_TRANSITIONS[from] || []).includes(to);
}

function canTransitionDeal(from, to) {
  return (DEAL_TRANSITIONS[from] || []).includes(to);
}

module.exports = {
  INTEREST_STAGES,
  INTEREST_TRANSITIONS,
  DEAL_TRANSITIONS,
  RESOURCE_GATES,
  stageAllows,
  stageRank,
  canTransitionInterest,
  canTransitionDeal,
};
