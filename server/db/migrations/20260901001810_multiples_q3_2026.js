/**
 * DUB KMU-Multiples Q3/2026, und die alten Werte bleiben (v0.448).
 *
 * Zwei Dinge auf einmal, und das zweite ist das wichtigere:
 *
 *   1. Die Werte von dub.de/de/kmu-multiples, Stand Q3/26, kommen dazu.
 *   2. Die Tabelle bekommt eine Zeitachse. Bisher war ein Stand gleich dem
 *      Bestand: Wer aktualisierte, überschrieb. Für die Bewertung reicht das,
 *      für eine Zeitreihe nicht, und ohne alte Stände lässt sich nicht
 *      untersuchen, wie sich ein Markt bewegt hat.
 *
 * Deshalb wird aus dem Schlüssel (tenant_id, industry_key) der Schlüssel
 * (tenant_id, industry_key, stand), dazu ein Kennzeichen `aktiv`. Genau ein
 * Stand je Mandant ist aktiv; er wird für Bewertungen benutzt. Alle übrigen
 * bleiben lesbar.
 *
 * ── Ein Befund, der nicht verschwiegen gehört ───────────────────────────────
 *
 * Die Tabelle auf dub.de führt EBITDA-Multiples. Die Seite sagt es zweimal:
 * „auf Basis der aktuellen EBITDA-Multiples" und in der Beispielrechnung
 * „bereinigter EBITDA 0,5 Mio. € x EBITDA-Faktor 5,0". Die Spalten hier heißen
 * `*_ebit_*`, und die Bewertungs-Engine multipliziert den EBIT.
 *
 * Das ist keine Formsache. EBIT und EBITDA unterscheiden sich um die
 * Abschreibungen, bei FARADAY zum Beispiel um ein Viertel. Einen
 * EBITDA-Multiple auf einen EBIT anzuwenden, ergibt einen zu niedrigen Wert,
 * und zwar umso deutlicher, je anlagenintensiver das Unternehmen ist.
 *
 * Auch der Stand Q2/2026 enthielt EBITDA-Multiples; die Spalten heissen nur
 * anders. Beide Stände tragen deshalb `kennzahl = 'ebitda'`.
 *
 * Die Engines sind in derselben Fassung umgestellt worden und multiplizieren
 * jetzt den EBITDA, siehe valuation/multipleBasis.js. Bereits gespeicherte
 * Bewertungen bleiben, wie sie sind: Sie neu zu rechnen hiesse, Zahlen zu
 * ändern, die jemand bereits gesehen und weitergegeben hat.
 *
 * Die Umsatz-Multiples stehen nicht auf der Seite, sondern nur im PDF-Report.
 * Sie werden deshalb aus dem alten Stand übernommen und nicht erfunden.
 */

// key, micro von/bis, small von/bis, mid von/bis  (Quelle: dub.de, Stand Q3/26)
const Q3_2026 = [
  ['maschinenbau',   3.6, 5.1, 4.6, 6.0, 5.6, 7.3],
  ['automotive',     2.7, 4.5, 3.9, 5.1, 4.7, 6.1],
  ['elektrotechnik', 4.2, 6.0, 5.7, 7.6, 6.8, 8.5],
  ['metall',         3.4, 4.2, 4.1, 5.5, 5.0, 7.2],
  ['chemie',         3.6, 4.6, 5.4, 6.5, 6.5, 8.1],
  ['medizintechnik', 5.9, 7.6, 7.1, 9.0, 8.2, 10.0],
  ['software',       5.6, 7.6, 7.2, 9.0, 8.3, 10.6],
  ['it_services',    5.2, 6.7, 6.3, 8.5, 7.1, 9.6],
  ['medien',         3.2, 5.0, 4.4, 6.3, 6.0, 7.5],
  ['telekom',        4.2, 6.1, 5.7, 7.2, 6.3, 7.7],
  ['gesundheit',     4.0, 5.9, 6.0, 8.1, 8.6, 10.1],
  ['b2b_dienste',    3.8, 5.7, 5.0, 7.2, 6.4, 8.0],
  ['bau',            3.7, 5.0, 4.4, 5.8, 5.0, 6.8],
  ['immobilien',     4.1, 5.0, 5.0, 6.9, 6.5, 8.1],
  ['finanz',         4.7, 5.9, 6.0, 7.2, 8.4, 10.0],
  ['nahrung',        4.4, 5.7, 5.5, 6.6, 6.8, 8.0],
  ['konsum',         2.5, 4.0, 3.6, 5.6, 4.8, 6.3],
  ['ecommerce',      4.3, 6.9, 5.4, 7.4, 7.3, 9.3],
  ['handel',         3.4, 4.5, 4.4, 5.4, 5.2, 6.7],
  ['logistik',       3.7, 5.0, 4.5, 5.7, 5.6, 7.2],
];

const STAND_NEU = 'Q3/2026';
const STAND_ALT = 'Q2/2026';
const QUELLE_NEU = 'DUB KMU-Multiples (Q3/2026), dub.de/de/kmu-multiples';

exports.up = async function (knex) {
  // ── 1. Zeitachse an die Tabelle ──────────────────────────────────────────
  for (const [name, bauen] of [
    ['stand', (t) => t.string('stand', 20)],
    ['kennzahl', (t) => t.string('kennzahl', 10)],
    ['aktiv', (t) => t.boolean('aktiv').notNullable().defaultTo(false)],
  ]) {
    if (!(await knex.schema.hasColumn('valuation_multiples', name))) {
      await knex.schema.alterTable('valuation_multiples', bauen);
    }
  }

  // Der alte Bestand bekommt seinen Stand. Dass auch Q2/2026 EBITDA-Multiples
  // waren, ist bestätigt; die Spalten heissen nur anders.
  await knex('valuation_multiples').whereNull('stand')
    .update({ stand: STAND_ALT, kennzahl: 'ebitda', aktiv: false });

  // Der alte Schlüssel ließ nur einen Stand je Branche zu.
  await knex.raw('ALTER TABLE valuation_multiples DROP CONSTRAINT IF EXISTS valuation_multiples_tenant_id_industry_key_unique').catch(() => {});
  await knex.raw(`CREATE UNIQUE INDEX IF NOT EXISTS valuation_multiples_stand_idx
    ON valuation_multiples (tenant_id, industry_key, stand)`).catch(() => {});
  // Nur ein aktiver Stand je Mandant. Zwei aktive Stände hiessen: Die
  // Bewertung haengt davon ab, welche Zeile die Abfrage zuerst findet.
  await knex.raw(`CREATE UNIQUE INDEX IF NOT EXISTS valuation_multiples_aktiv_idx
    ON valuation_multiples (tenant_id, industry_key) WHERE aktiv = true`).catch(() => {});

  // ── 2. Den neuen Stand einfügen ──────────────────────────────────────────
  const alte = await knex('valuation_multiples').where({ stand: STAND_ALT });
  const nachKey = new Map(alte.map((r) => [r.industry_key, r]));

  for (const [key, miMin, miMax, smMin, smMax, mdMin, mdMax] of Q3_2026) {
    const alt = nachKey.get(key);
    if (!alt) continue;                       // unbekannte Branche: nicht erfinden
    const schon = await knex('valuation_multiples').where({ tenant_id: alt.tenant_id, industry_key: key, stand: STAND_NEU }).first();
    if (schon) continue;
    await knex('valuation_multiples').insert({
      tenant_id: alt.tenant_id,
      industry_key: key,
      label: alt.label,
      micro_ebit_min: miMin, micro_ebit_max: miMax,
      small_ebit_min: smMin, small_ebit_max: smMax,
      mid_ebit_min: mdMin, mid_ebit_max: mdMax,
      // Nicht auf der Seite veroeffentlicht, nur im PDF-Report. Uebernommen
      // statt erfunden, und im Bericht als uebernommen gekennzeichnet.
      revenue_multiple_min: alt.revenue_multiple_min,
      revenue_multiple_max: alt.revenue_multiple_max,
      source: QUELLE_NEU,
      sort_order: alt.sort_order,
      stand: STAND_NEU,
      kennzahl: 'ebitda',
      aktiv: true,
    });
  }

  // Die Auffangbranche steht nicht in der DUB-Tabelle. Sie wird mitgefuehrt,
  // damit ein Mandat ohne Zuordnung weiter bewertet werden kann, und traegt
  // die alten Werte mit einem deutlichen Vermerk.
  const sonstige = nachKey.get('sonstige');
  if (sonstige) {
    const schon = await knex('valuation_multiples').where({ tenant_id: sonstige.tenant_id, industry_key: 'sonstige', stand: STAND_NEU }).first();
    if (!schon) {
      await knex('valuation_multiples').insert({
        ...sonstige, id: undefined,
        source: 'Phalanx, Auffangwert (nicht Teil der DUB-Tabelle)',
        stand: STAND_NEU, kennzahl: null, aktiv: true,
      });
    }
  }
};

exports.down = async function (knex) {
  await knex('valuation_multiples').where({ stand: STAND_NEU }).del();
  await knex('valuation_multiples').where({ stand: STAND_ALT }).update({ aktiv: true });
  await knex.raw('DROP INDEX IF EXISTS valuation_multiples_aktiv_idx').catch(() => {});
  await knex.raw('DROP INDEX IF EXISTS valuation_multiples_stand_idx').catch(() => {});
  for (const name of ['aktiv', 'kennzahl', 'stand']) {
    if (await knex.schema.hasColumn('valuation_multiples', name)) {
      await knex.schema.alterTable('valuation_multiples', (t) => t.dropColumn(name));
    }
  }
};
