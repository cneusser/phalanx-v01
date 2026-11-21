// ─────────────────────────────────────────────────────────────────────────────
// Die Vertraulichkeitsvereinbarung der Phalanx GmbH, zweisprachig (v0.490)
//
// Anlass, wörtlich: „Ich würde in Zukunft den beigelegten NDA für alle
// Anfragen customized auf Person und Projekt nutzen wollen."
//
// Vorlage ist das Dokument „Projekt_eMessage_NDA_Phalanx_DE-EN.docx". Der Text
// ist unverändert übernommen, an drei Stellen durch Platzhalter ersetzt:
//
//   {{project_codename}}        der Deckname des Mandats
//   {{buyer_company}}           Firma des Interessenten
//   {{buyer_seat}}              Sitz des Interessenten
//   {{buyer_register}}          Register und Nummer
//   {{buyer_representative}}    vertretungsberechtigte Person
//   {{court_venue}}             Gerichtsstand
//
// Die bisherige Vorlage (defaultNdaTemplate.js) bleibt liegen, aber inaktiv.
// Bereits unterzeichnete Vereinbarungen behalten ihren Text und ihren
// Fingerabdruck; was unterschrieben wurde, wird nicht nachträglich umgeschrieben.
//
// Zum Aufbau: Jeder Abschnitt trägt seinen deutschen und seinen englischen
// Text in zwei gleich langen Listen. Das ist keine Schönheit, aber es macht
// prüfbar, dass keine Sprache einen Absatz mehr oder weniger hat, und genau
// das prüft server/tests/vertragsvorlage.test.js. Massgeblich ist nach § 10
// Absatz 4 die deutsche Fassung.
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  name: 'Vertraulichkeitsvereinbarung Phalanx (DE/EN)',
  version: 2,
  court_venue: 'Nürnberg',
  advisor: {
    name: 'Phalanx GmbH',
    contact: 'Dr. Christian Neusser, Geschäftsführer',
    address: 'Helene-Lange-Straße 28',
    city: '91056 Erlangen',
    country: 'Deutschland',
    // Wer für die Phalanx GmbH gegenzeichnet (v0.491). Steht so in der
    // Unterschriftszeile des Dokuments.
    signer: {
      name: 'Dr. Christian Neusser',
      role: 'Geschäftsführer / Managing Director',
      place: 'Erlangen',
    },
  },

  titel: 'Vertraulichkeitsvereinbarung',
  titel_en: 'Confidentiality Agreement',

  preamble:
    'Phalanx berät die Gesellschafter eines Unternehmens (nachfolgend „Verkäufer") bei der möglichen '
    + 'Veräußerung ihrer Beteiligung an diesem Unternehmen und dessen verbundenen Unternehmen (gemeinsam '
    + 'nachfolgend „Zielunternehmen"), geführt unter dem Projektnamen {{project_codename}}. Der Interessent '
    + 'möchte prüfen, ob er sich selbst oder über einen von ihm beratenen Fonds oder eine von ihm beratene '
    + 'Gesellschaft an dem Zielunternehmen beteiligt oder es erwirbt (nachfolgend „Projekt"). Zu diesem Zweck '
    + 'werden Phalanx, der Verkäufer und das Zielunternehmen dem Interessenten vertrauliche Informationen zur '
    + 'Verfügung stellen. Dies vorausgeschickt, vereinbaren die Parteien, was folgt:',
  preamble_en:
    'Phalanx advises the shareholders of a company (hereinafter the "Seller") on the potential sale of their '
    + 'interest in that company and its affiliated companies (together hereinafter the "Target"), conducted under '
    + 'the project name {{project_codename}}. The Prospective Buyer wishes to evaluate whether to acquire or invest '
    + 'in the Target, either itself or through a fund or company advised by it (hereinafter the "Project"). For this '
    + 'purpose, Phalanx, the Seller and the Target will provide the Prospective Buyer with confidential information. '
    + 'Now, therefore, the Parties agree as follows:',

  sections: [
    {
      title: 'Vertrauliche Informationen',
      title_en: 'Confidential Information',
      paragraphs: [
        '(1) Vertrauliche Informationen sind alle Informationen und Unterlagen über das Zielunternehmen, den Verkäufer und das Projekt, die dem Interessenten vor oder nach Unterzeichnung dieser Vereinbarung durch Phalanx, den Verkäufer, das Zielunternehmen oder deren Berater zugänglich gemacht werden, gleich in welcher Form (schriftlich, elektronisch, mündlich, im Datenraum oder bei Besichtigungen). Dazu zählen auch alle Analysen, Auswertungen und Notizen, die der Interessent oder seine Empfänger daraus erstellen (gemeinsam „Vertrauliche Informationen").',
        '(2) Vertrauliche Informationen sind Geschäftsgeheimnisse des Zielunternehmens im Sinne des Gesetzes zum Schutz von Geschäftsgeheimnissen (GeschGehG). Diese Vereinbarung gilt als angemessene Geheimhaltungsmaßnahme im Sinne dieses Gesetzes.',
        '(3) Ebenfalls vertraulich sind die Tatsache, dass das Zielunternehmen zum Verkauf steht, der Name des Zielunternehmens, das Bestehen und der Stand von Gesprächen sowie der Abschluss und der Inhalt dieser Vereinbarung.',
      ],
      paragraphs_en: [
        '(1) Confidential Information means all information and documents relating to the Target, the Seller and the Project that are made available to the Prospective Buyer before or after signing this Agreement by Phalanx, the Seller, the Target or their advisors, in whatever form (in writing, electronically, orally, in the data room or during site visits). This includes all analyses, evaluations and notes prepared from it by the Prospective Buyer or its Recipients (together "Confidential Information").',
        '(2) Confidential Information constitutes trade secrets of the Target within the meaning of the German Trade Secrets Act (GeschGehG). This Agreement shall be deemed an appropriate confidentiality measure within the meaning of that Act.',
        '(3) The fact that the Target is for sale, the name of the Target, the existence and status of discussions as well as the conclusion and content of this Agreement shall also be treated as confidential.',
      ],
    },
    {
      title: 'Ausnahmen',
      title_en: 'Exceptions',
      paragraphs: ['Die Pflichten aus dieser Vereinbarung gelten nicht für Informationen, die nachweislich'],
      paragraphs_en: ['The obligations under this Agreement shall not apply to information which demonstrably'],
      bullets: [
        'a) zum Zeitpunkt der Überlassung bereits öffentlich bekannt waren;',
        'b) nach der Überlassung ohne Verstoß gegen diese Vereinbarung öffentlich bekannt werden;',
        'c) dem Interessenten bereits vor der Überlassung rechtmäßig und ohne Geheimhaltungspflicht bekannt waren;',
        'd) der Interessent von einem Dritten rechtmäßig und ohne Geheimhaltungspflicht erhalten hat.',
      ],
      bullets_en: [
        'a) was already publicly known at the time of disclosure;',
        'b) becomes publicly known after disclosure without breach of this Agreement;',
        'c) was lawfully known to the Prospective Buyer prior to disclosure without any obligation of confidentiality;',
        'd) the Prospective Buyer has lawfully received from a third party without any obligation of confidentiality.',
      ],
    },
    {
      title: 'Verwendung und Weitergabe',
      title_en: 'Use and Disclosure',
      paragraphs: [
        '(1) Der Interessent wird die Vertraulichen Informationen streng vertraulich behandeln und ausschließlich zur Prüfung des Projekts verwenden. Er schützt sie mit mindestens derselben Sorgfalt, die er für eigene vertrauliche Informationen anwendet, jedenfalls aber mit angemessener Sorgfalt.',
        '(2) Der Interessent darf Vertrauliche Informationen nur an solche Organmitglieder, Mitarbeiter, Gesellschafter, Investitionskomitees, verbundene Unternehmen, finanzierende Banken sowie beruflich zur Verschwiegenheit verpflichtete Berater weitergeben, die sie für das Projekt benötigen (nachfolgend „Empfänger"). Der Interessent wird die Empfänger vorab auf die Vertraulichkeit hinweisen und sie zur Einhaltung von Pflichten verpflichten, die dieser Vereinbarung mindestens gleichwertig sind. Der Interessent haftet für Verstöße seiner Empfänger wie für eigene Verstöße.',
        '(3) Kopien und Auszüge darf der Interessent nur anfertigen, soweit dies für die Prüfung des Projekts erforderlich ist. Ein Nachbau, eine Zerlegung, ein Rückentwickeln (Reverse Engineering) oder eine sonstige Nutzung der Vertraulichen Informationen zur Entwicklung eigener Produkte oder Verfahren ist untersagt.',
      ],
      paragraphs_en: [
        '(1) The Prospective Buyer shall keep the Confidential Information strictly confidential and use it solely for evaluating the Project. It shall protect it with at least the same degree of care it applies to its own confidential information, but in any event with reasonable care.',
        '(2) The Prospective Buyer may disclose Confidential Information only to those of its board members, employees, shareholders, investment committees, affiliates, financing banks and professional advisors bound by professional secrecy who need it for the Project (hereinafter "Recipients"). The Prospective Buyer shall inform the Recipients of the confidential nature in advance and bind them to obligations at least equivalent to this Agreement. The Prospective Buyer shall be liable for any breach by its Recipients as for its own breach.',
        '(3) The Prospective Buyer may make copies and extracts only to the extent necessary for evaluating the Project. Replicating, disassembling, reverse engineering or otherwise using the Confidential Information to develop its own products or processes is prohibited.',
      ],
    },
    {
      title: 'Gesetzliche Offenlegungspflichten',
      title_en: 'Required Disclosure',
      paragraphs: [
        'Ist der Interessent oder ein Empfänger aufgrund Gesetzes, behördlicher oder gerichtlicher Anordnung oder Börsenvorschriften zur Offenlegung Vertraulicher Informationen verpflichtet, wird er Phalanx, soweit rechtlich zulässig, unverzüglich vorab in Textform unterrichten, damit geeignete Schutzmaßnahmen ergriffen werden können. Offengelegt wird nur der Teil, zu dessen Offenlegung eine Pflicht besteht.',
      ],
      paragraphs_en: [
        'If the Prospective Buyer or a Recipient is required by law, by order of an authority or court, or by stock exchange rules to disclose Confidential Information, it shall, to the extent legally permitted, notify Phalanx promptly and in advance in text form so that appropriate protective measures can be taken. Only the portion required to be disclosed shall be disclosed.',
      ],
    },
    {
      title: 'Ansprechpartner, Direktansprache und Abwerbeverbot',
      title_en: 'Contact, Non-Circumvention and Non-Solicitation',
      paragraphs: [
        '(1) Sämtliche Kommunikation zum Projekt, insbesondere Informationsanfragen, Besichtigungswünsche und Angebote, erfolgt ausschließlich über Phalanx. Ohne vorherige Zustimmung von Phalanx in Textform wird der Interessent weder unmittelbar noch mittelbar Kontakt zu Gesellschaftern, Organmitgliedern, Mitarbeitern, Kunden, Lieferanten, Finanzierungspartnern oder sonstigen Geschäftspartnern des Zielunternehmens im Zusammenhang mit dem Projekt aufnehmen. Kontakte im gewöhnlichen, vom Projekt unabhängigen Geschäftsverkehr bleiben unberührt.',
        '(2) Für die Dauer von zwölf (12) Monaten ab Unterzeichnung dieser Vereinbarung wird der Interessent weder unmittelbar noch mittelbar Mitarbeiter des Zielunternehmens abwerben oder abzuwerben versuchen. Ausgenommen sind Einstellungen aufgrund allgemeiner, nicht gezielt an Mitarbeiter des Zielunternehmens gerichteter Stellenanzeigen.',
      ],
      paragraphs_en: [
        '(1) All communication regarding the Project, in particular information requests, site visit requests and offers, shall be made exclusively through Phalanx. Without the prior consent of Phalanx in text form, the Prospective Buyer shall not, directly or indirectly, contact any shareholders, board members, employees, customers, suppliers, financing partners or other business partners of the Target in connection with the Project. Contacts in the ordinary course of business unrelated to the Project remain unaffected.',
        '(2) For a period of twelve (12) months from signing this Agreement, the Prospective Buyer shall not, directly or indirectly, solicit or attempt to solicit any employee of the Target. Hiring in response to general job advertisements not specifically directed at employees of the Target is excluded.',
      ],
    },
    {
      title: 'Keine Gewährleistung, keine Rechtseinräumung, keine Abschlusspflicht',
      title_en: 'No Warranty, No Licence, No Obligation to Transact',
      paragraphs: [
        '(1) Phalanx, der Verkäufer und das Zielunternehmen übernehmen keine Gewähr und keine Haftung für die Richtigkeit und Vollständigkeit der Vertraulichen Informationen, soweit nicht Vorsatz vorliegt. Eine Haftung kann sich nur aus einem gesondert abgeschlossenen, endgültigen Vertrag ergeben.',
        '(2) Mit dieser Vereinbarung oder der Überlassung Vertraulicher Informationen werden keine Lizenzen, Schutzrechte oder sonstigen Rechte an den Vertraulichen Informationen eingeräumt.',
        '(3) Diese Vereinbarung begründet keine Pflicht, Verhandlungen aufzunehmen, fortzuführen oder eine Transaktion abzuschließen. Phalanx und der Verkäufer können den Prozess jederzeit ohne Angabe von Gründen ändern oder beenden.',
      ],
      paragraphs_en: [
        '(1) Phalanx, the Seller and the Target give no warranty and assume no liability for the accuracy or completeness of the Confidential Information, except in cases of intent. Any liability may only arise from a separately concluded definitive agreement.',
        '(2) Neither this Agreement nor the disclosure of Confidential Information grants any licence, intellectual property right or other right to the Confidential Information.',
        '(3) This Agreement does not create any obligation to commence or continue negotiations or to conclude a transaction. Phalanx and the Seller may change or terminate the process at any time without stating reasons.',
      ],
    },
    {
      title: 'Rückgabe und Vernichtung',
      title_en: 'Return and Destruction',
      paragraphs: [
        'Auf Aufforderung von Phalanx in Textform, spätestens jedoch bei Beendigung der Gespräche, wird der Interessent alle Vertraulichen Informationen einschließlich Kopien innerhalb von vierzehn (14) Tagen zurückgeben oder vernichten beziehungsweise löschen und dies auf Verlangen in Textform bestätigen. Ausgenommen sind Unterlagen, die aufgrund gesetzlicher Aufbewahrungspflichten aufbewahrt werden müssen, sowie Daten in automatisierten Sicherungskopien, die nicht mit vertretbarem Aufwand gelöscht werden können. Für diese gelten die Pflichten aus dieser Vereinbarung fort.',
      ],
      paragraphs_en: [
        'Upon request by Phalanx in text form, and at the latest upon termination of discussions, the Prospective Buyer shall return or destroy or delete all Confidential Information including copies within fourteen (14) days and confirm this in text form upon request. Excluded are documents that must be retained under statutory retention obligations and data in automated backups that cannot be deleted with reasonable effort. The obligations under this Agreement continue to apply to them.',
      ],
    },
    {
      title: 'Laufzeit',
      title_en: 'Term',
      paragraphs: [
        'Diese Vereinbarung tritt mit Unterzeichnung durch beide Parteien in Kraft. Die Pflichten des Interessenten gelten für drei (3) Jahre ab Unterzeichnung, mindestens jedoch bis zwei (2) Jahre nach Abschluss oder Abbruch der Gespräche über das Projekt. Gesetzliche Pflichten zum Schutz von Geschäftsgeheimnissen bleiben unberührt. Kommt es zum Erwerb des Zielunternehmens durch den Interessenten, enden die Pflichten mit dem Vollzug der Transaktion.',
      ],
      paragraphs_en: [
        'This Agreement enters into force upon signature by both Parties. The obligations of the Prospective Buyer apply for three (3) years from signing, but at least until two (2) years after completion or termination of discussions on the Project. Statutory obligations for the protection of trade secrets remain unaffected. If the Prospective Buyer acquires the Target, the obligations end upon closing of the transaction.',
      ],
    },
    {
      title: 'Vertrag zugunsten Dritter, Unterlassung',
      title_en: 'Third-Party Beneficiaries, Injunctive Relief',
      paragraphs: [
        '(1) Diese Vereinbarung wird auch zugunsten des Verkäufers und des Zielunternehmens geschlossen (§ 328 BGB). Beide sind berechtigt, die Einhaltung der Pflichten des Interessenten selbst geltend zu machen.',
        '(2) Dem Interessenten ist bewusst, dass ein Verstoß gegen diese Vereinbarung einen erheblichen und schwer wiedergutzumachenden Schaden verursachen kann. Phalanx, der Verkäufer und das Zielunternehmen können daher neben Schadensersatz auch Unterlassung verlangen und einstweiligen Rechtsschutz in Anspruch nehmen.',
      ],
      paragraphs_en: [
        '(1) This Agreement is also concluded for the benefit of the Seller and the Target (Section 328 German Civil Code). Both are entitled to enforce the obligations of the Prospective Buyer directly.',
        '(2) The Prospective Buyer acknowledges that a breach of this Agreement may cause substantial and irreparable harm. Phalanx, the Seller and the Target may therefore, in addition to damages, claim injunctive relief and seek interim legal protection.',
      ],
    },
    {
      title: 'Schlussbestimmungen',
      title_en: 'Final Provisions',
      paragraphs: [
        '(1) Änderungen und Ergänzungen dieser Vereinbarung bedürfen der Textform; dies gilt auch für einen Verzicht auf dieses Formerfordernis. Eine Unterzeichnung mittels elektronischer Signatur oder durch Austausch unterzeichneter Kopien per E-Mail ist ausreichend. Bestätigt der Interessent diese Vereinbarung online auf der Plattform des Beraters, indem er seinen vollständigen Namen eingibt und die Bestätigung setzt, steht dies einer Unterzeichnung in Textform gleich und begründet eine rechtswirksame Vertraulichkeitsverpflichtung.',
        '(2) Sollte eine Bestimmung dieser Vereinbarung unwirksam oder undurchführbar sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt. Anstelle der unwirksamen Bestimmung gilt diejenige wirksame Regelung, die dem wirtschaftlichen Zweck der unwirksamen Bestimmung am nächsten kommt.',
        '(3) Diese Vereinbarung unterliegt dem Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts. Ausschließlicher Gerichtsstand für alle Streitigkeiten aus oder im Zusammenhang mit dieser Vereinbarung ist, soweit gesetzlich zulässig, {{court_venue}}.',
        '(4) Diese Vereinbarung ist in deutscher und englischer Sprache abgefasst. Bei Abweichungen zwischen den Fassungen ist die deutsche Fassung maßgeblich.',
      ],
      paragraphs_en: [
        '(1) Amendments and supplements to this Agreement require text form; this also applies to any waiver of this form requirement. Signature by electronic signature or by exchange of signed copies by e-mail is sufficient. If the Prospective Buyer confirms this Agreement online on the advisor’s platform by entering its full name and ticking the confirmation, this is equivalent to signing in text form and creates a legally binding confidentiality obligation.',
        '(2) Should any provision of this Agreement be invalid or unenforceable, the validity of the remaining provisions shall not be affected. The invalid provision shall be replaced by the valid provision that comes closest to its economic purpose.',
        '(3) This Agreement is governed by the laws of the Federal Republic of Germany, excluding the UN Convention on Contracts for the International Sale of Goods. To the extent legally permissible, the exclusive place of jurisdiction for all disputes arising from or in connection with this Agreement is {{court_venue}}, Germany.',
        '(4) This Agreement is executed in German and English. In case of any discrepancy between the versions, the German version shall prevail.',
      ],
    },
  ],
};
