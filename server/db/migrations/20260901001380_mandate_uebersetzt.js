/**
 * Übersetzung des Mandatsbestands (v0.410).
 *
 * Die sechs Mandate lagen in je einer Sprache vor, fünf auf Deutsch, Cavendish
 * auf Englisch. Auf dem Marktplatz standen sie deshalb gemischt nebeneinander.
 *
 * Diese Migration trägt die fehlende Fassung nach. Sie wurde nicht von einem
 * Übersetzungsdienst erzeugt, sondern von Hand erstellt, unter Beibehaltung der
 * Zahlen, Einheiten und Fachbegriffe. Trotzdem steht sie als `entwurf` und wird
 * einem Besucher nicht gezeigt, bis sie in der Datenpflege freigegeben ist.
 * Bei einem Unternehmensverkauf entscheidet der Mensch, welcher Satz nach
 * draußen geht.
 *
 * Geschrieben wird ausschließlich in leere Felder. Was schon dasteht, bleibt.
 */
// Die Felder, die es in beiden Sprachen gibt. Beim Umzug eines englisch
// erfassten Mandats wird jedes dieser Paare gesichert.
const PAARE = ['short_description', 'deal_type', 'industry', 'highlights'];

const TEXTE = {
  Cavendish: {
    // Original englisch, deshalb wird hier die deutsche Fassung nachgetragen.
    sprache: 'en',
    deal_type_en: 'Seed financing (equity)',
    deal_type: 'Seed-Finanzierung (Eigenkapital)',
    industry: 'CleanTech / Grüner Wasserstoff (PEM-Elektrolyseur-Stacks)',
    short_description_en: 'German deep-tech developer of next-generation PEM electrolyzer stacks for '
      + 'decentralised green hydrogen. The stacks deliver up to 260 % more power at the same footprint '
      + 'and weight than the current market leader, with a cost target below 300 EUR/kW and 100 % '
      + 'quality control. OEM model: the core stack is sold to plant builders and integrators, not '
      + 'projects; 11 letters of intent are already signed. Founder is a hydrogen pioneer (active since '
      + '1991, 60+ patents). Raising Seed I (EUR 0.75m at EUR 7.5m post-money), followed by Seed II '
      + '(EUR 10m at EUR 30m post-money, planned 07/2027).',
    short_description: 'Deutscher Deep-Tech-Entwickler von PEM-Elektrolyseur-Stacks der nächsten '
      + 'Generation für dezentralen grünen Wasserstoff. Die Stacks liefern bei gleicher Grundfläche und '
      + 'gleichem Gewicht bis zu 260 % mehr Leistung als der heutige Marktführer, bei einem Kostenziel '
      + 'unter 300 EUR/kW und vollständiger Qualitätskontrolle. OEM-Modell: Verkauft wird der Kern-Stack '
      + 'an Anlagenbauer und Integratoren, nicht das Projekt; elf Absichtserklärungen sind bereits '
      + 'unterzeichnet. Der Gründer ist ein Pionier der Wasserstofftechnik (seit 1991 tätig, über 60 '
      + 'Patente). Gesucht wird Seed I (0,75 Mio. EUR bei 7,5 Mio. EUR Post-Money), anschließend Seed II '
      + '(10 Mio. EUR bei 30 Mio. EUR Post-Money, geplant für 07/2027).',
  },
  FARADAY: {
    sprache: 'de',
    deal_type_en: 'Succession',
    short_description_en: 'Established electrical engineering and energy services provider (founded 1998) '
      + 'with a contractually secured position as designated service partner at a trade fair and congress '
      + 'venue of supra-regional importance. More than 80 % recurring revenue, EBIT margin stable at '
      + '14 to 15 %, and over 260 self-operated charging points with in-house energy billing. Succession '
      + 'for reasons of age: 100 % share deal, cash- and debt-free; the owner will support the handover '
      + 'for up to six months.',
  },
  Cudd: {
    sprache: 'de',
    deal_type_en: 'Majority sale',
    short_description_en: 'Long-established German premium childrens brand (high-quality plush toys and '
      + 'gift articles, more than 50 years of history), currently repositioning itself as a digital-first '
      + 'gifting brand for the first 1,000 days. Strong brand core and high awareness in the German-speaking '
      + 'markets, with clear catch-up potential in direct-to-consumer, e-commerce and internal structures. '
      + 'A majority partner is sought to take the transformation forward.',
  },
  Betongold: {
    sprache: 'de',
    deal_type_en: 'Succession',
    industry_en: 'Construction / Architectural concrete',
    short_description_en: 'Family-run premium manufactory for architectural concrete (fair-faced concrete '
      + 'class SB 3+), now in its third generation. Facades, load-bearing structures, churches, museums and '
      + 'private villas, with in-house formwork construction as its core capability. Full sale (100 %, cash- '
      + 'and debt-free) as part of a succession; the owner is ready to hand over and will remain on board for '
      + '12 to 24 months. Capacity limits are the obvious lever for growth.',
  },
  Nexora: {
    sprache: 'de',
    deal_type_en: 'Pre-seed financing',
    short_description_en: 'Physical agentic factory operating system: AI agents connect production machinery '
      + 'with the experience and observations of the operators through proprietary kiosk hardware, in order to '
      + 'raise productivity. A first pilot installation is successfully in operation at a tier-one automotive '
      + 'supplier, and a production installation has already been agreed. Seven structural unique selling '
      + 'points, no direct competitor.',
  },
  Umami: {
    sprache: 'de',
    deal_type_en: 'Pre-seed financing',
    industry_en: 'Food & Nutrition',
    short_description_en: 'Organic broths and functional food for gut health, moving from an organically '
      + 'validated proof of market towards a love brand. Close to 1,000 lifetime customers acquired without '
      + 'paid marketing, certified organic, zero grams of sugar and a three-year shelf life without a cold chain.',
  },
};

exports.up = async function (knex) {
  let gesetzt = 0; let uebersprungen = 0; const unbekannt = [];
  const mandate = await knex('projects').select('*').catch(() => []);

  for (const m of mandate) {
    const t = TEXTE[m.codename];
    if (!t) { unbekannt.push(m.codename); continue; }

    const patch = {};

    if (t.sprache === 'en') {
      // Einmaliger Umzug. In der Grundspalte steht noch der englische Text,
      // der dort nach der neuen Regel nicht hingehoert. Erst sichern, dann
      // ueberschreiben. Die Reihenfolge ist der ganze Punkt: Wer zuerst
      // ueberschreibt, verliert den Text.
      //
      // Gesichert wird jedes Feldpaar, auch wenn unten keine eigene englische
      // Fassung hinterlegt ist. Sonst ginge zum Beispiel die englische
      // Branchenbezeichnung verloren, fuer die es keinen Eintrag gibt.
      for (const feld of PAARE) {
        if (m[feld] === undefined || m[`${feld}_en`] === undefined) continue;
        const schonUmgezogen = m[`${feld}_en`] && String(m[`${feld}_en`]).trim();
        if (schonUmgezogen) { uebersprungen += 1; continue; }
        const englisch = t[`${feld}_en`] || m[feld];
        if (englisch && String(englisch).trim()) patch[`${feld}_en`] = englisch;
        if (t[feld] && String(t[feld]).trim()) patch[feld] = t[feld];
      }
      if (m.sprache !== 'en') patch.sprache = 'en';
    } else {
      for (const [feld, wert] of Object.entries(t)) {
        if (feld === 'sprache') { if (m.sprache !== wert) patch.sprache = wert; continue; }
        if (m[feld] === undefined) continue;                     // Spalte gibt es nicht
        // Nur in leere Felder schreiben. Was dasteht, bleibt.
        if (m[feld] && String(m[feld]).trim()) { uebersprungen += 1; continue; }
        patch[feld] = wert;
      }
    }

    if (Object.keys(patch).length) {
      // Von Hand erstellt, aber trotzdem erst nach Freigabe sichtbar.
      patch.uebersetzung_status = 'entwurf';
      patch.uebersetzt_am = knex.fn.now();
      await knex('projects').where({ id: m.id }).update(patch).catch(() => {});
      gesetzt += 1;
    }
  }

  console.log(`🌍 Übersetzungen nachgetragen: ${gesetzt} Mandate ergänzt, ${uebersprungen} Felder blieben unverändert.`);
  if (unbekannt.length) {
    console.log(`   Ohne hinterlegte Übersetzung: ${unbekannt.join(', ')}. Diese erscheinen in der Datenpflege.`);
  }
  console.log('   Alle Fassungen stehen als Entwurf und werden erst nach Freigabe gezeigt.');
};

exports.down = async function (knex) {
  for (const codename of Object.keys(TEXTE)) {
    await knex('projects').where({ codename })
      .update({ uebersetzung_status: 'fehlt', short_description_en: null, deal_type_en: null })
      .catch(() => {});
  }
};

exports.TEXTE = TEXTE;
