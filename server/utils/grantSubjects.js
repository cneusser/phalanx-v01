// Gemeinsame Definition der Freigabe-Subjekte (Drooms-Modell), damit Safe und
// Datenraum dieselben Typen und Käufergruppen verwenden.
const SUBJECT_TYPES = ['user', 'buyer_group', 'party_all', 'group'];

// Käufergruppen (buyer_type) mit Anzeigenamen.
const BUYER_GROUPS = [
  ['strategic', 'Strategen'],
  ['financial', 'Finanzinvestoren / PE'],
  ['business_angel', 'Business Angels'],
  ['venture_capital', 'Venture Capital'],
  ['family_office', 'Family Offices'],
  ['successor', 'Nachfolger'],
  ['private', 'Privat'],
  ['advisor_mandate', 'Berater mit Mandat'],
];
const BUYER_GROUP_KEYS = BUYER_GROUPS.map(([k]) => k);
const BUYER_GROUP_LABEL = Object.fromEntries(BUYER_GROUPS);

module.exports = { SUBJECT_TYPES, BUYER_GROUPS, BUYER_GROUP_KEYS, BUYER_GROUP_LABEL };
