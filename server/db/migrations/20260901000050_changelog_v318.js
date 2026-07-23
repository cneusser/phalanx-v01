/** Changelog v0.318 (Mandatsseite spiegelt den Freigabe-Status der Stufe). */
const ENTRY = {
  version: 'v0.318', released_on: '2026-07-21',
  title: 'IM-Freigabe auf der Mandatsseite sichtbar',
  items: [
    'Das IM blieb auf der Mandatsseite als „NDA erforderlich" gesperrt, obwohl der Interessent bereits freigeschaltet war und die Deal-Karte „Unterlagen freigegeben" zeigte',
    'Ursache: Die Mandatsseite las nur den NDA-Antrag, nicht die tatsächliche Freigabe-Stufe. Wurde diese über den Funnel („NDA liegt vor") oder ohne NDA (Startup-Finanzierung) erteilt, fehlte der NDA-Antrag',
    'Jetzt spiegelt die Statusabfrage die Freigabe-Stufe: „IM freigeschaltet" ab NDA/Freigabe, „Vollzugriff" ab Datenraum-Freigabe',
    'Damit ist das Informationsmemorandum auf der Mandatsseite tatsächlich abrufbar, sobald es freigegeben ist',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
