// ─────────────────────────────────────────────────────────────────────────────
// Investoren-Anschreiben einlesen und abgleichen (v0.439).
//
// Geprüft wird an der echten Mail, die den Anlass gegeben hat. Eine erfundene
// Beispielmail würde nur zeigen, dass der Parser das trifft, wofür er gebaut
// wurde.
//
// Vier Fehler hat genau dieser Versuch beim Bauen aufgedeckt, und für jeden
// steht unten eine Prüfung:
//   · "Umsatz|Revenue" ohne Klammer band falsch, das blosse Wort traf ohne Zahl
//   · "Fokus" traf das Wort "fokussiert" mitten im Fliesstext
//   · der Terminkalender der Person landete als Webseite der Gesellschaft
//   · ein Satzpunkt hing an der Adresse
// ─────────────────────────────────────────────────────────────────────────────
const { lese } = require('../utils/investorAnschreiben');
const { bewerte, vorschlagen, mio } = require('../utils/investorMatch');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };

const MAIL = [
  'Sehr geehrter Herr Neusser,',
  '',
  'hiermit wollen wir uns kurz vorstellen: NextGen Equity Partners ist eine neu formierte',
  'Beteiligungsgesellschaft (www.nextgen-equity.com), die sich auf den Dienstleistungs-Mittelstand',
  'in DACH fokussiert.',
  '',
  'Unser Akquisitionsprofil:',
  '',
  '* Sektor: Business Services',
  '* Region: Deutschland, Österreich, Schweiz (DACH)',
  '* Zielgröße: Umsatz 10–100 Mio. € | EBITDA 2-15 Mio. €',
  '',
  'Hierzu können Sie über folgenden Link einen Termin buchen:',
  'https://calendly.com/gerald-weitbrecht-nextgen-equity/30min.',
  '',
  'Sollten Sie einen Newsletter haben, fügen Sie uns gerne mit dieser Email',
  '"deals@nextgen-equity.com" auf die Verteilerliste hinzu.',
  '',
  'Herzliche Grüße',
  '',
  'Gerald Weitbrecht',
  'Founding Member',
  't: +49 173 5246230 | e: gerald.weitbrecht@nextgen-equity.com',
  'NextGen Equity Partners GmbH',
  'Leopoldstr. 21 | 80802 München | Germany',
  'www.nextgen-equity.com',
  'Geschäftsführer: Maximilian Göppert, Leander Heyken, Dr. Amon Göppert | Amtsgericht München HRB 290761',
].join('\n');

const d = lese(MAIL);
const f = d.felder;

ok('Firma mit Rechtsform', f.firma && f.firma.wert === 'NextGen Equity Partners GmbH');
ok('Ansprechpartner mit Rolle', f.person && f.person.wert === 'Gerald Weitbrecht' && /Founding Member/.test(f.person.rolle));
ok('persönliche Adresse, nicht die aus der Verteiler-Bitte', f.email && f.email.wert === 'gerald.weitbrecht@nextgen-equity.com');
ok('Telefon', f.telefon && /173 5246230/.test(f.telefon.wert));
ok('Anschrift zerlegt', f.anschrift && f.anschrift.plz === '80802' && f.anschrift.ort === 'München' && /Leopoldstr/.test(f.anschrift.strasse));
ok('Geschäftsführung', f.geschaeftsfuehrer && /Leander Heyken/.test(f.geschaeftsfuehrer.wert));
ok('Registereintrag', f.registereintrag && /HRB 290761/.test(f.registereintrag.wert));

// Der Terminkalender einer Person ist nicht die Webseite der Gesellschaft.
ok('Webseite ist die der Gesellschaft', f.website && /nextgen-equity\.com/.test(f.website.wert) && !/calendly/.test(f.website.wert));
ok('Terminlink getrennt gefuehrt', f.terminlink && /calendly/.test(f.terminlink.wert));
ok('und ohne Satzpunkt am Ende', f.terminlink && !/\.$/.test(f.terminlink.wert));

// Sektor: aus der Angabezeile, nicht aus dem Fliesstext.
ok('Sektor im Klartext', f.sektor && f.sektor.text === 'Business Services');
ok('Sektor auf das Vokabular abgebildet', f.sektor && f.sektor.wert === 'dienstleistung');
ok('und nicht aus dem Wort "fokussiert" geraten', f.sektor && !/fokussiert/.test(f.sektor.text));

ok('Region als DACH erkannt', f.regionen && f.regionen.werte.includes('dach'));
ok('Umsatzspanne gelesen', f.umsatz && f.umsatz.von === 10 && f.umsatz.bis === 100);
ok('EBITDA-Spanne gelesen', f.ebitda && f.ebitda.von === 2 && f.ebitda.bis === 15);

ok('die Verteiler-Bitte ist erkannt', f.verteiler && f.verteiler.adresse === 'deals@nextgen-equity.com');
ok('und im Wortlaut belegt', f.verteiler && /Verteilerliste/.test(f.verteiler.beleg));
ok('nichts blieb offen', d.offen.length === 0);

// Jeder Wert trägt seine Herkunft. Ohne sie ist eine Bestätigung wertlos.
for (const [name, v] of [['Firma', f.firma], ['Sektor', f.sektor], ['Region', f.regionen], ['Umsatz', f.umsatz]]) {
  ok(`${name} nennt die Zeile, aus der er stammt`, !!(v && v.beleg));
}

// ── Nichts raten ────────────────────────────────────────────────────────────
{
  const leer = lese('Guten Tag, wir melden uns unverbindlich. Viele Grüße, Max Mustermann');
  ok('ohne Angaben wird nichts erfunden',
    !leer.felder.sektor && !leer.felder.umsatz && !leer.felder.ebitda);
  ok('und das Fehlende wird benannt', leer.offen.length >= 3);

  const ohneEinheit = lese('* Sektor: IT & Software\n* Zielgröße: Umsatz 10 bis 100');
  ok('eine Zahl ohne Einheit ist keine Größenangabe', !ohneEinheit.felder.umsatz);

  const fremd = lese('* Sektor: Raumfahrt und Weltraumbergbau\n* Region: Mars');
  ok('ein unbekannter Sektor wird gemeldet statt zugeordnet',
    fremd.felder.sektor && fremd.felder.sektor.wert === null
    && fremd.offen.some((o) => /Vokabular/.test(o)));
}

// ── Der Abgleich mit einem Mandat ───────────────────────────────────────────
{
  const nextgen = {
    id: 1, focus_industries: '["dienstleistung"]', focus_regions: '["dach"]',
    ticket_min: 2, ticket_max: 15,
  };
  const faraday = { industry: 'Elektrotechnik', region: 'Bayern', ebitda_band: 'EBITDA 0,3 Mio.' };
  const treffend = { industry: 'Business Services', region: 'Bayern', ebitda_band: 'EBITDA 5 Mio.' };

  const a = bewerte(nextgen, faraday);
  ok('FARADAY passt nicht', a.treffer === false);
  ok('und es steht dabei, warum nicht', a.ausschluss.some((g) => /Branche/.test(g)) && a.ausschluss.some((g) => /ausserhalb/.test(g)));

  const b = bewerte(nextgen, treffend);
  ok('ein passendes Mandat trifft', b.treffer === true);
  ok('mit Begründung je Kriterium', b.gruende.length === 3);

  ok('ein Kontakt ohne jedes Kriterium taucht nicht auf',
    vorschlagen([{ id: 2, focus_industries: '[]', focus_regions: '[]' }], treffend).length === 0);
  ok('ein leeres Kriterium schränkt nicht ein',
    bewerte({ focus_industries: '[]', focus_regions: '["dach"]' }, treffend).treffer === true);
  ok('Millionen werden aus dem Freitext gelesen', mio('EBITDA 1,5 bis 2 Mio. EUR') === 2);
  ok('ohne Einheit keine Zahl', mio('2 bis 15') === null);
}

process.exit(fail ? 1 : 0);
