/** Changelog v0.390 (Datenraum: Ordner beim Upload, Import aus Ordnerbaum). */
const ENTRY = {
  version: 'v0.390', released_on: '2026-07-26',
  title: 'Datenraum: Ordnerstruktur und Import aus einem Ordnerbaum',
  items: [
    'Beim Hochladen lässt sich jetzt ein Ordnerpfad mitgeben. Der Käufer-Datenraum baut daraus seine Navigation, Unterlagen sind dadurch auffindbar statt in einer langen Liste zu stehen',
    'Neues Import-Skript für die Erstbefüllung: Es liest einen vorbereiteten Ordnerbaum ein und legt jede Datei mit Ordnerpfad, sprechendem Namen und Zugriffsstufe an; Trockenlauf möglich, zweiter Lauf legt keine Doubletten an',
    'Die Zugriffsstufe „Freigegeben" bleibt der Standard für Datenraum-Unterlagen: sichtbar erst nach persönlicher Freigabe je Interessent. Ein Clean-Team-Abschnitt lässt sich bewusst ausnehmen und später separat freigeben',
    'Die Kategorie eines Dokuments wird beim Upload jetzt passend zur Zugriffsstufe gesetzt, statt nur hergeleitet zu werden',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
