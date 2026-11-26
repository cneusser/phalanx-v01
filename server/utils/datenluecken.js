// ─────────────────────────────────────────────────────────────────────────────
// Wo fehlen Angaben? (v0.509)
//
// Anlass, wörtlich: „Gut wäre natürlich dann auch eine Funktion zu haben, wo
// ich jederzeit sehe, wo Daten eventuell noch nachgepflegt werden müssen."
//
// Für Firmenstammdaten gibt es das seit v0.405 (utils/vollstaendigkeit.js).
// Diese Datei ist das Gegenstück für Personen und für die Angaben, die eine
// Ansprache erst brauchbar machen.
//
// Zwei Dinge wie beim Vorbild:
//
//   1. Keine Prozentzahl. „72 Prozent vollständig" sagt niemandem, was zu tun
//      ist. Zurück kommt eine Liste mit Namen.
//   2. Dieselbe Wahrheit an jeder Stelle. Die Kontaktakte, der Bericht und die
//      Erinnerungsmail fragen dieselbe Funktion, sonst stehen drei Zahlen im
//      Haus und keine stimmt.
//
// Und eine Festlegung, die aus der Sache folgt: Ein fehlendes Feld ist kein
// Mangel an der Person. Die Erinnerung ist eine Bitte, keine Mahnung, und
// wer nichts nachträgt, bleibt ein vollwertiger Kontakt.
// ─────────────────────────────────────────────────────────────────────────────

// Was ein brauchbarer Kontakt braucht, in der Reihenfolge der Anzeige.
//
// `wer` sagt, wen man fragen kann: 'person' bedeutet, die Angabe kann die
// Person selbst nachtragen, 'wir' bedeutet, das ist unsere Arbeit. Nur die
// erste Sorte darf in einer Erinnerungsmail landen.
const KONTAKT_FELDER = [
  { schluessel: 'email', label: 'E-Mail-Adresse', wer: 'wir' },
  { schluessel: 'firma', label: 'Firmenzuordnung', wer: 'wir' },
  { schluessel: 'responsibility', label: 'Funktion im Unternehmen', wer: 'person' },
  { schluessel: 'phone', label: 'Telefon', wer: 'person' },
  { schluessel: 'buyer_type', label: 'Art des Interessenten', wer: 'wir' },
  { schluessel: 'city', label: 'Ort', wer: 'person' },
  { schluessel: 'suchprofil', label: 'Suchkriterien', wer: 'person' },
];

// Was eine Firma braucht, damit ein Abgleich mit einem Mandat überhaupt
// etwas austrägt. Branche und Größenordnung stehen oben, weil ohne sie jeder
// Vorschlag geraten wäre.
const FIRMA_FELDER = [
  { schluessel: 'sektor', label: 'Branche oder Sektor', wer: 'person' },
  { schluessel: 'revenue_band', label: 'Umsatzgrößenordnung', wer: 'person' },
  { schluessel: 'employees', label: 'Mitarbeiterzahl', wer: 'person' },
  { schluessel: 'region', label: 'Region', wer: 'person' },
  { schluessel: 'website', label: 'Webseite', wer: 'person' },
  { schluessel: 'city', label: 'Ort', wer: 'person' },
];

const leer = (v) => v == null || String(v).trim() === '';

// Wie viele Zeilen überhaupt gelesen werden. Die Zählung soll stimmen, und
// eine Grenze, die die Anzeige begrenzt, darf nicht heimlich auch die Zahlen
// begrenzen: Genau daran ist die erste Fassung gescheitert, ein eben
// angelegter Kontakt fehlte in der Auswertung. Wird diese Grenze erreicht,
// steht das im Ergebnis.
const OBERGRENZE = 5000;

/**
 * Welche Angaben fehlen an einem Kontakt?
 *
 * @param kontakt  die Zeile aus crm_contacts
 * @param extra    { firma: bool, suchprofil: bool } was nur mit einer zweiten
 *                 Abfrage zu wissen ist
 * @returns [{ schluessel, label, wer }]
 */
function kontaktLuecken(kontakt = {}, extra = {}) {
  const raus = [];
  for (const f of KONTAKT_FELDER) {
    if (f.schluessel === 'firma') { if (!extra.firma) raus.push(f); continue; }
    if (f.schluessel === 'suchprofil') { if (!extra.suchprofil) raus.push(f); continue; }
    if (leer(kontakt[f.schluessel])) raus.push(f);
  }
  return raus;
}

/** Welche Angaben fehlen an einer Firma? */
function firmaLuecken(firma = {}) {
  return FIRMA_FELDER.filter((f) => {
    if (f.schluessel === 'employees') return !(Number(firma.employees) > 0);
    // Der Sektor steht in zwei Spalten, je nach Alter des Datensatzes.
    if (f.schluessel === 'sektor') return leer(firma.sektor) && leer(firma.industry);
    return leer(firma[f.schluessel]);
  });
}

/** Nur das, wonach man eine Person fragen kann. */
const fuerDiePerson = (luecken) => luecken.filter((l) => l.wer === 'person');

/**
 * Die Übersicht über alle Kontakte und Firmen.
 *
 * Gemeldet wird, nicht geändert. Wer nichts nachträgt, bleibt in der Liste und
 * wird deswegen nicht angefasst.
 *
 * @param db     Datenbankzugriff mit all()
 * @param grenze wie viele Zeilen je Abschnitt höchstens
 */
async function uebersicht(db, grenze = 200, suche = '') {
  // Die Anzeige ist gekappt, die Zählung nicht. Wer eine bestimmte Person
  // sucht, findet sie über das Suchwort, auch wenn sie weit hinten steht.
  const s = String(suche || '').trim().toLowerCase();
  const passt = (name, email) => !s || `${name} ${email || ''}`.toLowerCase().includes(s);
  const kontakte = await db.all(
    `SELECT k.id, k.first_name, k.last_name, k.email, k.phone, k.city, k.responsibility, k.buyer_type,
            k.consent_status, k.contact_status,
            (SELECT count(*) FROM crm_company_contacts cc WHERE cc.contact_id = k.id) AS firmen,
            (SELECT count(*) FROM search_profiles sp WHERE sp.user_id = k.user_id) AS profile,
            (SELECT count(*) FROM crm_deal_parties dp WHERE dp.contact_id = k.id) AS mandate
       FROM crm_contacts k
      WHERE k.anonymized_at IS NULL AND COALESCE(k.contact_status, 'active') <> 'blocked'
      ORDER BY (SELECT count(*) FROM crm_deal_parties dp WHERE dp.contact_id = k.id) DESC, k.id DESC
      LIMIT ?`, [OBERGRENZE]).catch(() => []);

  const firmen = await db.all(
    `SELECT c.id, c.name, c.sektor, c.industry, c.revenue_band, c.employees, c.region, c.website, c.city,
            (SELECT count(*) FROM crm_company_contacts cc WHERE cc.company_id = c.id) AS kontakte
       FROM crm_companies c
      ORDER BY (SELECT count(*) FROM crm_company_contacts cc WHERE cc.company_id = c.id) DESC, c.id DESC
      LIMIT ?`, [OBERGRENZE]).catch(() => []);

  const kZeilen = (kontakte || []).map((k) => {
    const luecken = kontaktLuecken(k, { firma: Number(k.firmen) > 0, suchprofil: Number(k.profile) > 0 });
    return {
      id: k.id,
      name: `${k.first_name || ''} ${k.last_name || ''}`.trim() || '(ohne Namen)',
      email: k.email || null,
      mandate: Number(k.mandate) || 0,
      fehlt: luecken.map((l) => l.label),
      fragbar: fuerDiePerson(luecken).length,
      eingewilligt: k.consent_status === 'opt_in',
    };
  }).filter((z) => z.fehlt.length);

  const fZeilen = (firmen || []).map((c) => {
    const luecken = firmaLuecken(c);
    return {
      id: c.id,
      name: c.name,
      kontakte: Number(c.kontakte) || 0,
      fehlt: luecken.map((l) => l.label),
    };
  }).filter((z) => z.fehlt.length);

  // Was fehlt am häufigsten? Die Zahl entscheidet, woran zu arbeiten sich
  // lohnt, und nicht der Eindruck beim Durchblättern.
  const zaehlung = {};
  for (const z of [...kZeilen, ...fZeilen]) {
    for (const f of z.fehlt) zaehlung[f] = (zaehlung[f] || 0) + 1;
  }
  const haeufig = Object.entries(zaehlung).sort((a, b) => b[1] - a[1]).map(([label, anzahl]) => ({ label, anzahl }));

  return {
    kontakte: kZeilen.filter((z) => passt(z.name, z.email)).slice(0, grenze),
    firmen: fZeilen.filter((z) => passt(z.name, null)).slice(0, grenze),
    kontakte_gesamt: kZeilen.length,
    firmen_gesamt: fZeilen.length,
    // Ehrlich bleiben, wenn nicht alles gelesen wurde.
    abgeschnitten: (kontakte || []).length >= OBERGRENZE || (firmen || []).length >= OBERGRENZE,
    // Wen könnte man überhaupt fragen: eingewilligt, Adresse bekannt, und es
    // fehlt etwas, das die Person selbst weiss.
    fragbar: kZeilen.filter((z) => z.eingewilligt && z.email && z.fragbar > 0).length,
    haeufig,
  };
}

module.exports = {
  KONTAKT_FELDER, FIRMA_FELDER,
  kontaktLuecken, firmaLuecken, fuerDiePerson, uebersicht,
};
