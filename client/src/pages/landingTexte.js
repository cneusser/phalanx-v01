// ─────────────────────────────────────────────────────────────────────────────
// Texte der Startseite, deutsch und englisch (v0.411).
//
// Warum ein Inhaltsobjekt und nicht hundert Einzelschlüssel im Wörterbuch:
// Auf einer Textseite gehören die Absätze zusammen. Wer die deutsche Fassung
// ändert, muss die englische danebenliegen sehen, sonst driften beide
// auseinander, und genau das war der Ausgangspunkt dieser ganzen Arbeit.
//
// Für Bedienelemente, die auf vielen Seiten vorkommen, bleibt das Wörterbuch
// in i18n/index.jsx zuständig. Hier steht nur, was zu dieser einen Seite gehört.
// ─────────────────────────────────────────────────────────────────────────────

export const LANDING = {
  de: {
    marke_zusatz: 'Eine Marke der Phalanx GmbH',
    nav: {
      markt: 'Marktplatz',
      netzwerk: 'Nachfolge-Netzwerk',
      ablauf: 'So funktioniert es',
      person: 'Wer dahintersteht',
      termin: 'Termin vereinbaren',
      termin_kurz: 'Termin',
      anmelden: 'Anmelden',
      registrieren: 'Registrieren',
      menue_auf: 'Menü öffnen',
      menue_zu: 'Menü schließen',
      haupt: 'Hauptnavigation',
      abschnitte: 'Abschnitte',
    },
    hero: {
      kicker: 'Marktplatz für Nachfolge und Beteiligung',
      titel: 'Ein Unternehmen wechselt den Eigentümer.',
      titel_betont: 'Einmal.',
      text: 'CapitalMatch ist der Transaktionsmarktplatz der Phalanx GmbH. Hier treffen Unternehmen, '
        + 'die übergeben oder Kapital aufnehmen wollen, auf Käufer, Investoren und Nachfolgerinnen '
        + 'und Nachfolger. Die Plattform ist dabei nur die Oberfläche. Dahinter arbeitet jemand, '
        + 'den Sie anrufen können.',
      erst_sprechen: 'Lieber erst sprechen? Termin wählen',
      leiste: [
        ['Geführte Mandate', 'Kein Inserateportal. Hinter jedem Mandat steht ein Berater mit Namen.'],
        ['Vertraulichkeit als Ablauf', 'Öffentlich nur Spannen, Details nach Freischaltung und NDA.'],
        ['Drei Wege hinein', 'Übergeben, kaufen oder ein Unternehmen übernehmen.'],
      ],
    },
    wege: {
      kicker: 'Für wen',
      titel: 'Drei Wege, und jeder beginnt mit einem Gespräch.',
      liste: [
        {
          titel: 'Sie übergeben', label: 'Für Übergebende',
          text: 'Sie führen ein mittelständisches Unternehmen und stehen vor Nachfolge oder Verkauf. '
            + 'Wir bereiten die Unterlagen auf, sprechen den Markt an und führen den Prozess bis zur Übergabe.',
        },
        {
          titel: 'Sie kaufen oder investieren', label: 'Zum Marktplatz',
          text: 'Strategen, Beteiligungsgesellschaften, Family Offices und Kapitalgeber. Sie hinterlegen '
            + 'ein Suchprofil und erhalten passende Mandate, bevor sie breit am Markt sind.',
        },
        {
          titel: 'Sie wollen übernehmen', label: 'Zum Nachfolge-Netzwerk',
          text: 'Führungskräfte, die ein Unternehmen übernehmen statt die nächste Stelle antreten. '
            + 'Dafür gibt es bei uns ein eigenes Netzwerk, und es kostet Sie nichts.',
        },
      ],
    },
    zitat: {
      kicker: 'Warum es CapitalMatch gibt',
      satz: 'Die meisten Nachfolgen scheitern nicht am Geld. Sie scheitern daran, dass zwei Menschen '
        + 'nie voneinander erfahren.',
      quelle: 'Dr. Christian Neusser, Geschäftsführer der Phalanx GmbH',
    },
    markt: {
      kicker: 'Marktplatz',
      titel: 'Was gerade am Markt ist.',
      leer: 'Derzeit ist kein Mandat öffentlich ausgeschrieben. Ein erheblicher Teil unserer Vorhaben '
        + 'läuft vertraulich und wird nie inseriert. Hinterlegen Sie ein Suchprofil, dann melden wir '
        + 'uns, sobald etwas passt.',
      hinweis: 'Öffentlich stehen ausschließlich Spannen. Firmenname, genaue Zahlen und Unterlagen '
        + 'werden erst sichtbar, wenn Sie registriert und freigeschaltet sind und eine '
        + 'Vertraulichkeitsvereinbarung unterzeichnet haben. So bleibt ein Verkauf so lange '
        + 'vertraulich, wie die verkaufende Seite es will.',
      alle: 'Alle Mandate ansehen',
      finanzierung: 'Finanzierung', transaktion: 'Transaktion',
      umsatz: 'Umsatz', ebitda: 'EBITDA', region: 'Region', runde: 'Runde', phase: 'Phase',
    },
    netzwerk: {
      kicker: 'Nachfolge-Netzwerk',
      titel: 'Ein Unternehmen übernehmen, statt die nächste Stelle antreten.',
      vorspann: 'Viele erfahrene Führungskräfte wollen nicht noch eine Position, sondern Verantwortung '
        + 'als Eigentümer. Auf der anderen Seite suchen Inhaberinnen und Inhaber jemanden, der ihr '
        + 'Lebenswerk weiterführt. Beide finden ohne Hilfe selten zueinander. Genau dazwischen arbeitet '
        + 'dieses Netzwerk.',
      felder: [
        { titel: 'Suchprofil statt Bewerbung',
          text: 'Sie hinterlegen Branche, Region, Unternehmensgröße und die Art der Übernahme: reine '
            + 'Beteiligung, strategische Partnerschaft oder operative Führung. Aus diesen Angaben '
            + 'entstehen die Vorschläge, nicht aus einem Lebenslauf.' },
        { titel: 'Mandate vor der Veröffentlichung',
          text: 'Ein erheblicher Teil der Nachfolgefälle wird nie inseriert. Passt ein Mandat zu Ihrem '
            + 'Profil, sprechen wir Sie an, bevor es breit am Markt ist. MBI und MBO gehören ausdrücklich dazu.' },
        { titel: 'Begleitung, nicht nur Vermittlung',
          text: 'Kaufpreis, Finanzierungsstruktur, Verkäuferdarlehen, Beteiligung des Alteigentümers, '
            + 'die ersten 100 Tage: An diesen Fragen scheitern Übernahmen, nicht am Kennenlernen. '
            + 'Hier sitzt jemand mit Transaktionserfahrung neben Ihnen.' },
        { titel: 'Diskret, und für Sie kostenfrei',
          text: 'Ihr Profil liegt nicht offen. Sie entscheiden, wann und mit wem Sie ins Gespräch gehen. '
            + 'Teilnahme, Matching und Veranstaltungen kosten Sie nichts. Getragen wird das Netzwerk '
            + 'von den Übergebenden.' },
      ],
      knopf: 'Kostenfrei ins Netzwerk',
      fuss: 'Die Registrierung dauert wenige Minuten. Danach melden wir uns, sobald ein Mandat zu Ihrem Profil passt.',
    },
    person: {
      kicker: 'Wer dahintersteht',
      titel: '25 Jahre auf beiden Seiten des Tisches.',
      rolle: 'Geschäftsführer der Phalanx GmbH',
      absaetze: [
        'Ich habe nicht nur über Transaktionen beraten, ich habe die Unternehmen danach auch geführt. '
        + 'Angefangen bei der Sparkasse und bei KPMG in der Due Diligence, dann zwölf Jahre als '
        + 'kaufmännischer Geschäftsführer einer Industriegruppe, danach als CFO, Geschäftsführer und '
        + 'Sanierungsgeschäftsführer in Maschinenbau, Textil, Handel, Energie und Mobilität. Mehr als '
        + '35 Transaktionen, und in mehreren davon habe ich am Montag nach dem Closing die Verantwortung '
        + 'übernommen. Ich weiß deshalb, was ein Kaufvertrag im Alltag anrichtet, und was nicht.',
        'Dabei habe ich immer wieder dasselbe gesehen: Ein Inhaber findet niemanden, dem er sein '
        + 'Lebenswerk zutraut. Und eine erfahrene Führungskraft, die genau das gesucht hätte, erfährt '
        + 'nie, dass dieses Unternehmen zu haben wäre. Nicht das Geld fehlt, sondern der Zugang '
        + 'zueinander. Dafür haben wir CapitalMatch gebaut.',
        'Was mir dabei wichtig ist: Die Technik nimmt uns das Sortieren ab, nicht das Gespräch. Wer '
        + 'sich hier registriert, bekommt einen Ansprechpartner und keine automatische Antwort. Ich '
        + 'lebe mit meiner Familie in Erlangen und bin seit 1996 ehrenamtlich beim Roten Kreuz, zuletzt '
        + 'in der Krisenintervention. Das prägt, wie ich mit Menschen umgehe, für die gerade viel auf '
        + 'dem Spiel steht.',
      ],
      stationen: [
        ['Beratung', 'KPMG Transaction Services, Financial Due Diligence und Unternehmensbewertung'],
        ['Industrie', 'Kaufmännischer Geschäftsführer einer international tätigen Industriegruppe, zwölf Jahre'],
        ['Sondersituationen', 'CFO, CEO und Sanierungsgeschäftsführer in Konzern und Mittelstand, Umsatzgrößen von 80 Mio. bis 2,8 Mrd.'],
        ['Transaktionen', 'Über 35 begleitete Transaktionen, Sell Side und Buy Side, Nachfolge, Carve-out und Wachstumsfinanzierung'],
        ['Unternehmer', 'Phalanx GmbH seit 2010, dazu Minderheitsbeteiligungen und Beiratsmandate'],
      ],
      fussnote: 'Nebenbei forsche ich zu Unternehmensnachfolge in Familienunternehmen, promoviert an der '
        + 'Henley Business School, seit 2026 an der Universität Siegen. Für Sie ist daran vor allem eines '
        + 'interessant: Ich kenne die Gründe, an denen Übergaben scheitern, nicht nur aus meinen eigenen Fällen.',
    },
    ablauf: {
      kicker: 'Ablauf',
      titel: 'Wie es tatsächlich läuft.',
      schritte: [
        { titel: 'Sie registrieren sich, oder sprechen erst mit mir',
          text: 'Wenige Angaben, damit wir wissen, wer Sie sind und wonach Sie suchen. Wenn Ihnen ein '
            + 'Gespräch lieber ist, buchen Sie einen Termin. Beides führt zum selben Ergebnis.' },
        { titel: 'Wir schalten Ihr Konto von Hand frei',
          text: 'Jedes Konto wird geprüft, bevor es Zugang bekommt. Das dauert länger als ein Klick und '
            + 'ist der Grund, warum in unseren Datenräumen keine anonymen Adressen unterwegs sind.' },
        { titel: 'Aus Spannen werden konkrete Zahlen',
          text: 'Öffentlich stehen nur Größenordnungen. Nach der Freischaltung sehen Sie den Teaser, nach '
            + 'unterzeichneter Vertraulichkeitsvereinbarung und Freigabe durch die verkaufende Seite das '
            + 'Informationsmemorandum und den Datenraum.' },
        { titel: 'Jeder Zugriff wird protokolliert',
          text: 'Wer wann welches Dokument geöffnet oder heruntergeladen hat, steht im Protokoll und ist '
            + 'für die verkaufende Seite einsehbar. Das schützt beide Seiten.' },
      ],
    },
    abschluss: {
      kicker: 'Nächster Schritt',
      titel: 'Registrieren, oder erst einmal sprechen.',
      text: 'Sie müssen sich nicht entscheiden, bevor Sie mit jemandem geredet haben. Ein Erstgespräch '
        + 'kostet nichts und verpflichtet zu nichts.',
      punkte: [
        '15 Minuten Klärungsgespräch, per Video oder Telefon',
        'Sie sprechen mit mir, nicht mit einem Vertrieb',
        'Vertraulich, auch ohne Konto und ohne Registrierung',
      ],
      knopf: 'Konto anlegen',
      karte_titel: 'Direkt einen Termin buchen',
      karte_text: 'Wählen Sie einen freien Termin für ein kurzes Klärungsgespräch, 15 Minuten, per Video '
        + 'oder Telefon. Sie erhalten sofort eine Bestätigung.',
      karte_knopf: 'Termin wählen',
      karte_extern: 'Auswahl in einem eigenen Fenster öffnen',
      karte_fuss: 'Dr. Christian Neusser · Phalanx GmbH · Erlangen',
    },
    fuss: {
      wechsler: 'Zwischen Websites wechseln', gruppe: 'Phalanx-Gruppe',
      plattform: 'Plattform', rechtliches: 'Rechtliches',
      wert: 'Unternehmenswert schätzen', suchprofil: 'Suchprofil hinterlegen',
      impressum: 'Impressum', datenschutz: 'Datenschutz',
      agb: 'Nutzungsbedingungen', cookies: 'Cookies', kontakt: 'Kontakt',
      sitz: 'Helene-Lange-Straße 28, 91056 Erlangen',
      register: 'Amtsgericht Fürth HRB 14306',
      server: 'Server in der Europäischen Union',
      nachfolge: 'Nachfolge', transaktionen: 'Transaktionen', transformation: 'Transformation',
    },
  },

  en: {
    marke_zusatz: 'A brand of Phalanx GmbH',
    nav: {
      markt: 'Marketplace',
      netzwerk: 'Succession network',
      ablauf: 'How it works',
      person: 'Who is behind it',
      termin: 'Arrange a call',
      termin_kurz: 'Call',
      anmelden: 'Log in',
      registrieren: 'Register',
      menue_auf: 'Open menu',
      menue_zu: 'Close menu',
      haupt: 'Main navigation',
      abschnitte: 'Sections',
    },
    hero: {
      kicker: 'A marketplace for succession and investment',
      titel: 'A company changes hands.',
      titel_betont: 'Once.',
      text: 'CapitalMatch is the transaction marketplace of Phalanx GmbH. It brings together companies '
        + 'looking to hand over or raise capital and the buyers, investors and successors on the other '
        + 'side. The platform is only the surface. Behind it is someone you can call.',
      erst_sprechen: 'Rather talk first? Pick a time',
      leiste: [
        ['Mandates we run', 'Not a listings portal. Behind every mandate there is an adviser with a name.'],
        ['Confidentiality by process', 'Only ranges in public, details after approval and an NDA.'],
        ['Three ways in', 'Hand over, buy, or take over a company.'],
      ],
    },
    wege: {
      kicker: 'Who this is for',
      titel: 'Three ways in, and each begins with a conversation.',
      liste: [
        {
          titel: 'You are handing over', label: 'For owners handing over',
          text: 'You run a mid-sized company and are facing succession or a sale. We prepare the '
            + 'documents, approach the market and run the process through to handover.',
        },
        {
          titel: 'You are buying or investing', label: 'To the marketplace',
          text: 'Strategic buyers, private equity firms, family offices and lenders. You leave a search '
            + 'profile with us and receive matching mandates before they are widely on the market.',
        },
        {
          titel: 'You want to take over', label: 'To the succession network',
          text: 'Senior managers who would rather take over a company than take the next job. We run a '
            + 'separate network for that, and it costs you nothing.',
        },
      ],
    },
    zitat: {
      kicker: 'Why CapitalMatch exists',
      satz: 'Most successions do not fail over money. They fail because two people never hear of each other.',
      quelle: 'Dr Christian Neusser, Managing Director of Phalanx GmbH',
    },
    markt: {
      kicker: 'Marketplace',
      titel: 'What is on the market right now.',
      leer: 'No mandate is publicly listed at the moment. A significant part of our work runs '
        + 'confidentially and is never advertised. Leave a search profile and we will come back to you '
        + 'as soon as something fits.',
      hinweis: 'Only ranges are shown in public. The company name, exact figures and documents become '
        + 'visible once you are registered and approved and have signed a non-disclosure agreement. '
        + 'That way a sale stays confidential for as long as the selling side wants it to.',
      alle: 'See all mandates',
      finanzierung: 'Financing', transaktion: 'Transaction',
      umsatz: 'Revenue', ebitda: 'EBITDA', region: 'Region', runde: 'Round', phase: 'Stage',
    },
    netzwerk: {
      kicker: 'Succession network',
      titel: 'Take over a company rather than take the next job.',
      vorspann: 'Many experienced managers do not want another position, they want the responsibility of '
        + 'ownership. On the other side, owners are looking for someone to carry on their life’s work. '
        + 'Left to themselves, the two rarely find each other. This network works in exactly that gap.',
      felder: [
        { titel: 'A search profile, not an application',
          text: 'You record the industry, region, company size and the kind of takeover you have in mind: '
            + 'a pure shareholding, a strategic partnership or operational leadership. The suggestions '
            + 'come from those details, not from a CV.' },
        { titel: 'Mandates before they are published',
          text: 'A significant share of succession cases is never advertised. If a mandate fits your '
            + 'profile we approach you before it is widely on the market. MBI and MBO are expressly included.' },
        { titel: 'Guidance, not just an introduction',
          text: 'Price, financing structure, vendor loans, a continued stake for the previous owner, the '
            + 'first hundred days: takeovers fail on these questions, not on the first meeting. Here you '
            + 'have someone with transaction experience sitting next to you.' },
        { titel: 'Discreet, and free for you',
          text: 'Your profile is not on public display. You decide when and with whom you enter a '
            + 'conversation. Membership, matching and events cost you nothing. The network is funded by '
            + 'the owners handing over.' },
      ],
      knopf: 'Join the network free of charge',
      fuss: 'Registration takes a few minutes. After that we come back to you as soon as a mandate fits your profile.',
    },
    person: {
      kicker: 'Who is behind it',
      titel: '25 years on both sides of the table.',
      rolle: 'Managing Director of Phalanx GmbH',
      absaetze: [
        'I have not only advised on transactions, I have run the companies afterwards. I started at a '
        + 'savings bank and at KPMG in due diligence, then spent twelve years as commercial managing '
        + 'director of an industrial group, and later worked as CFO, managing director and chief '
        + 'restructuring officer in mechanical engineering, textiles, retail, energy and mobility. More '
        + 'than 35 transactions, and in several of them I took charge on the Monday after closing. So I '
        + 'know what a purchase agreement does in daily practice, and what it does not.',
        'Along the way I kept seeing the same thing. An owner cannot find anyone he trusts with his '
        + 'life’s work. And an experienced manager who was looking for exactly that never hears the '
        + 'company is available. It is not the money that is missing, it is access to one another. That '
        + 'is what we built CapitalMatch for.',
        'What matters to me: the technology takes the sorting off our hands, not the conversation. '
        + 'Anyone who registers here gets a named contact, not an automated reply. I live with my family '
        + 'in Erlangen and have volunteered with the Red Cross since 1996, most recently in crisis '
        + 'intervention. That shapes how I deal with people who have a great deal at stake.',
      ],
      stationen: [
        ['Advisory', 'KPMG Transaction Services, financial due diligence and company valuation'],
        ['Industry', 'Commercial managing director of an internationally active industrial group, twelve years'],
        ['Special situations', 'CFO, CEO and chief restructuring officer in corporate groups and mid-sized companies, revenues from 80 million to 2.8 billion euros'],
        ['Transactions', 'More than 35 transactions, sell side and buy side, succession, carve-out and growth financing'],
        ['Entrepreneur', 'Phalanx GmbH since 2010, plus minority shareholdings and advisory board mandates'],
      ],
      fussnote: 'Alongside this I research succession in family businesses, with a doctorate from Henley '
        + 'Business School and a position at the University of Siegen since 2026. For you, one thing '
        + 'about that matters: I know the reasons handovers fail, and not only from my own cases.',
    },
    ablauf: {
      kicker: 'How it works',
      titel: 'How this actually runs.',
      schritte: [
        { titel: 'You register, or you talk to me first',
          text: 'A few details, so that we know who you are and what you are looking for. If you would '
            + 'rather have a conversation, book a time. Both lead to the same place.' },
        { titel: 'We approve your account by hand',
          text: 'Every account is checked before it is given access. That takes longer than a click, and '
            + 'it is the reason there are no anonymous addresses in our data rooms.' },
        { titel: 'Ranges become concrete figures',
          text: 'Only orders of magnitude are public. After approval you see the teaser; after a signed '
            + 'non-disclosure agreement and the selling side’s release you see the information '
            + 'memorandum and the data room.' },
        { titel: 'Every access is logged',
          text: 'Who opened or downloaded which document, and when, is in the log and visible to the '
            + 'selling side. That protects both sides.' },
      ],
    },
    abschluss: {
      kicker: 'Next step',
      titel: 'Register, or simply talk first.',
      text: 'You do not have to decide before you have spoken to someone. A first conversation costs '
        + 'nothing and commits you to nothing.',
      punkte: [
        'A 15-minute introductory call, by video or phone',
        'You speak to me, not to a sales team',
        'Confidential, with no account and no registration',
      ],
      knopf: 'Create an account',
      karte_titel: 'Book a time directly',
      karte_text: 'Choose a free slot for a short introductory call of 15 minutes, by video or phone. '
        + 'You receive a confirmation straight away.',
      karte_knopf: 'Choose a time',
      karte_extern: 'Open the calendar in its own window',
      karte_fuss: 'Dr Christian Neusser · Phalanx GmbH · Erlangen',
    },
    fuss: {
      wechsler: 'Switch between websites', gruppe: 'Phalanx group',
      plattform: 'Platform', rechtliches: 'Legal',
      wert: 'Estimate company value', suchprofil: 'Leave a search profile',
      impressum: 'Imprint', datenschutz: 'Privacy',
      agb: 'Terms of use', cookies: 'Cookies', kontakt: 'Contact',
      sitz: 'Helene-Lange-Strasse 28, 91056 Erlangen, Germany',
      register: 'Fürth local court, HRB 14306',
      server: 'Servers in the European Union',
      nachfolge: 'Succession', transaktionen: 'Transactions', transformation: 'Transformation',
    },
  },
};

export default LANDING;
