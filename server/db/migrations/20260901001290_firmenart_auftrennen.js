/**
 * Firmenart auftrennen (v0.405).
 *
 * Das Feld `company_type` mischte zwei Dinge, die nichts miteinander zu tun
 * haben: Was ein Unternehmen tut (Sektor) und welche Stellung es in einem
 * Vorhaben einnimmt (Rolle). „Stratege" ist keine Branche, und „Private Equity"
 * ist keine Rolle. Solange beides in einem Feld steht, lässt sich weder nach
 * Branche auswerten noch nach Rolle filtern.
 *
 * Neu sind drei Felder:
 *   sektor       Pflichtfeld, eine Auswahl, wortgleich zu Phalanx OS
 *   schwerpunkt  optional, hängt vom Sektor ab
 *   rollen_json  optional, mehrere möglich
 *
 * `company_type` bleibt unverändert erhalten, bis die Umstellung geprüft ist.
 * Nichts wird gelöscht und nichts geraten: Wo eine Regel keinen Sektor hergibt,
 * bleibt er leer und wird später nachgepflegt.
 *
 * Wie viele Datensätze je Regel umgestellt wurden, steht danach in der Tabelle
 * `migration_reports` und im Log des Starts.
 */

// Regelwerk wie abgestimmt. Schlüssel ist der alte Wert in Kleinschreibung,
// Leerzeichen und Schrägstriche vereinheitlicht.
const REGELN = [
  { alt: 'stratege', sektor: 'Industrie und verarbeitendes Gewerbe', schwerpunkt: null, rollen: ['Stratege'] },
  { alt: 'private equity', sektor: 'Finanz- und Beteiligungswirtschaft', schwerpunkt: 'Private Equity', rollen: [] },
  { alt: 'family office', sektor: 'Finanz- und Beteiligungswirtschaft', schwerpunkt: 'Family Office', rollen: [] },
  { alt: 'bank/finanzierer', sektor: 'Finanz- und Beteiligungswirtschaft', schwerpunkt: 'Bank und Finanzierung', rollen: [] },
  { alt: 'bank oder finanzierer', sektor: 'Finanz- und Beteiligungswirtschaft', schwerpunkt: 'Bank und Finanzierung', rollen: [] },
  { alt: 'berater', sektor: 'Dienstleistungen', schwerpunkt: 'Unternehmensberatung', rollen: ['Berater'] },
  { alt: 'mbi/mbo-kandidat', sektor: null, schwerpunkt: null, rollen: ['MBI/MBO-Kandidat'] },
  { alt: 'mbi/mbo', sektor: null, schwerpunkt: null, rollen: ['MBI/MBO-Kandidat'] },
  { alt: 'zielunternehmen', sektor: null, schwerpunkt: null, rollen: ['Zielunternehmen'] },
  // k. A. und Sonstige bleiben bewusst leer, damit sie in der Datenpflege auffallen.
  { alt: 'k. a.', sektor: null, schwerpunkt: null, rollen: [] },
  { alt: 'k.a.', sektor: null, schwerpunkt: null, rollen: [] },
  { alt: 'sonstige', sektor: null, schwerpunkt: null, rollen: [] },
];

const normal = (s) => String(s || '').trim().toLowerCase().replace(/\s*\/\s*/g, '/').replace(/\s+/g, ' ');

exports.up = async function (knex) {
  const fehlt = async (name) => !(await knex.schema.hasColumn('crm_companies', name).catch(() => false));
  if (await fehlt('sektor')) await knex.schema.alterTable('crm_companies', (t) => { t.text('sektor'); });
  if (await fehlt('schwerpunkt')) await knex.schema.alterTable('crm_companies', (t) => { t.text('schwerpunkt'); });
  if (await fehlt('rollen_json')) await knex.schema.alterTable('crm_companies', (t) => { t.text('rollen_json'); });
  await knex.raw('CREATE INDEX IF NOT EXISTS crm_companies_sektor_idx ON crm_companies (sektor)').catch(() => {});

  // Tabelle für den Bericht, damit das Ergebnis nachlesbar bleibt und nicht nur
  // im Startlog steht.
  const hatBericht = await knex.schema.hasTable('migration_reports').catch(() => false);
  if (!hatBericht) {
    await knex.schema.createTable('migration_reports', (t) => {
      t.increments('id').primary();
      t.text('migration').notNullable();
      t.text('regel').notNullable();
      t.integer('anzahl').notNullable().defaultTo(0);
      t.text('hinweis');
      t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
      t.index('migration');
    });
  }

  const firmen = await knex('crm_companies')
    .select('id', 'company_type', 'sektor', 'schwerpunkt', 'rollen_json')
    .catch(() => []);

  const zaehler = new Map();
  const unbekannt = new Map();
  const zaehle = (k) => zaehler.set(k, (zaehler.get(k) || 0) + 1);

  for (const f of firmen) {
    // Schon umgestellt? Dann nicht erneut anfassen, damit ein zweiter Lauf
    // nichts überschreibt.
    if (f.sektor || f.schwerpunkt || f.rollen_json) { zaehle('bereits umgestellt'); continue; }
    const wert = normal(f.company_type);
    if (!wert) { zaehle('ohne Firmenart, bleibt leer'); continue; }

    const regel = REGELN.find((r) => r.alt === wert);
    if (!regel) {
      unbekannt.set(f.company_type, (unbekannt.get(f.company_type) || 0) + 1);
      zaehle('unbekannter Wert, bleibt leer');
      continue;
    }
    const patch = {};
    if (regel.sektor) patch.sektor = regel.sektor;
    if (regel.schwerpunkt) patch.schwerpunkt = regel.schwerpunkt;
    if (regel.rollen.length) patch.rollen_json = JSON.stringify(regel.rollen);
    if (Object.keys(patch).length) {
      await knex('crm_companies').where({ id: f.id }).update(patch).catch(() => {});
    }
    zaehle(f.company_type);
  }

  const zeilen = [...zaehler.entries()].map(([regel, anzahl]) => ({
    migration: '20260901001290_firmenart_auftrennen', regel, anzahl,
    hinweis: REGELN.find((r) => r.alt === normal(regel))
      ? `→ Sektor ${REGELN.find((r) => r.alt === normal(regel)).sektor || 'leer'}`
      : null,
  }));
  for (const [wert, anzahl] of unbekannt) {
    zeilen.push({
      migration: '20260901001290_firmenart_auftrennen',
      regel: `unbekannt: ${wert}`, anzahl, hinweis: 'bitte von Hand zuordnen',
    });
  }
  if (zeilen.length) await knex('migration_reports').insert(zeilen).catch(() => {});

  console.log('📊 Firmenart aufgetrennt:');
  for (const z of zeilen.sort((a, b) => b.anzahl - a.anzahl)) {
    console.log(`   ${String(z.anzahl).padStart(5)}  ${z.regel}${z.hinweis ? '  ' + z.hinweis : ''}`);
  }
  if (!zeilen.length) console.log('   keine Firmen vorhanden');
};

exports.down = async function (knex) {
  await knex.raw('DROP INDEX IF EXISTS crm_companies_sektor_idx').catch(() => {});
  for (const name of ['rollen_json', 'schwerpunkt', 'sektor']) {
    const da = await knex.schema.hasColumn('crm_companies', name).catch(() => false);
    if (da) await knex.schema.alterTable('crm_companies', (t) => t.dropColumn(name));
  }
  await knex('migration_reports').where({ migration: '20260901001290_firmenart_auftrennen' }).del().catch(() => {});
};

exports.REGELN = REGELN;
exports.normal = normal;
