/** Changelog v0.321 (Einladungs- und Onboarding-Strecke). */
const ENTRY = {
  version: 'v0.321', released_on: '2026-07-21',
  title: 'Kontakte einladen und reiches Onboarding',
  items: [
    'Neuer Knopf „Kontakte einladen" im CRM: E-Mail-Adressen einfügen oder eine Excel/CSV hochladen. Für jede Adresse wird ein Kontakt angelegt (falls neu) und eine DSGVO-konforme Double-Opt-in-Einladung verschickt',
    'Doppelte, bereits eingeladene und widersprochene Adressen werden automatisch übersprungen, mit klarer Ergebnisübersicht',
    'Eigene Onboarding-Strecke nach der Einladung: die Person wählt ihr Interesse (Käufer oder Verkäufer) und füllt schlanke Pflichtfelder plus optional ein reiches Profil aus (Käufertyp, Branchen, Regionen, Fokus, bei Verkäufern Vorhaben)',
    'Die Angaben fließen zurück ins CRM (Stammdaten, Käufertyp, Fokus) und ins Käuferprofil für das Matching. Verkäufer eines Mandats werden dabei automatisch Pfleger',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
