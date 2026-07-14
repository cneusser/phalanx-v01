// ─────────────────────────────────────────────────────────────────────────────
// Standard-NDA-Vorlage (Sprint 3): wird beim ersten Start in nda_templates
// geseedet und ist danach in der DB konfigurierbar (Admin/SQL).
//
// Platzhalter (werden beim Generieren aus Buyer-/Deal-Daten befüllt):
//   {{project_codename}}  Deckname des Mandats
//   {{buyer_name}}        Vor- + Nachname des Interessenten
//   {{buyer_company}}     Firma des Interessenten
//   {{court_venue}}       Gerichtsstand
//   {{advisor_name}}      Name des Transaktionsberaters
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  name: 'Standard-NDA (beidseitig, DE)',
  version: 1,
  court_venue: 'München',
  advisor: {
    name: 'Phalanx GmbH',
    contact: 'M&A Advisory Team',
    address: 'Helene-Lange-Straße 28',
    city: '91056 Erlangen',
    country: 'Deutschland',
  },
  preamble:
    'Die Vertragsparteien beabsichtigen, Gespräche über das unter dem Projektnamen {{project_codename}} genannte Mandat zu führen und sich untereinander vertrauliche Unterlagen und Informationen bereitzustellen. Der Transaktionsberater handelt hierbei als exklusiver M&A‑Berater für den Eigentümer und wurde vom Eigentümer und dem Zielunternehmen autorisiert, diese Vertraulichkeitsvereinbarung zugunsten des Eigentümers und des Zielunternehmens abzuschließen. Zweck dieser Vertraulichkeitsvereinbarung ist es, die vertraulichen Informationen beider Parteien vor unberechtigter Verwendung oder Veröffentlichung zu schützen.',
  sections: [
    {
      title: 'Verpflichtung zur Vertraulichkeit',
      paragraphs: [
        '1.1  Die Vertragsparteien verpflichten sich gegenseitig, sämtliche verkörperten oder mündlich übermittelten Informationen und Erkenntnisse, die ihnen im Zusammenhang mit dem Projekt zugänglich gemacht werden, vertraulich zu behandeln, ausschließlich für das Projekt zu verwenden und nicht anderweitig zu nutzen, unabhängig davon, auf welchem Trägermedium die Informationen verkörpert sind.',
        '1.2  Der Zugang zu vertraulichen Informationen wird auf solche Mitarbeiter, Organe und Berater beschränkt, die die Informationen im Rahmen ihrer Tätigkeit und zum Zweck des Projekts benötigen. Diese Personen sind zur Vertraulichkeit zu verpflichten, sofern eine gleichwertige berufsrechtliche Verschwiegenheitsverpflichtung nicht besteht.',
        '1.3  Die Weitergabe vertraulicher Informationen an Geschäftsführer, Führungskräfte, Mitarbeiter, Berater, Gutachter, verbundene Gesellschaften oder Finanzierungspartner ist nur zulässig, wenn diese zuvor schriftlich und in mindestens gleichwertiger Weise zur Geheimhaltung verpflichtet wurden. Dies gilt nicht, soweit eine berufsrechtliche Pflicht zur Verschwiegenheit bereits besteht oder die Informationen im Zusammenhang mit dem Projekt zwingend offengelegt werden müssen.',
        '1.4  Auf Verlangen der jeweils anderen Vertragspartei werden alle überlassenen vertraulichen Informationen und Unterlagen unverzüglich zurückgegeben oder vernichtet. Davon ausgenommen sind Unterlagen, deren Aufbewahrung aufgrund gesetzlicher Aufbewahrungspflichten oder interner Compliance‑ beziehungsweise IT‑Backup‑Regeln erforderlich ist.',
      ],
    },
    {
      title: 'Ausnahmen von der Vertraulichkeit',
      paragraphs: ['Diese Vertraulichkeitsvereinbarung erstreckt sich nicht auf Informationen, die:'],
      bullets: [
        'ohne Zutun der empfangenden Partei allgemein bekannt oder öffentlich zugänglich waren oder werden;',
        'nach Offenlegung ohne Verletzung dieser Vertraulichkeitsvereinbarung veröffentlicht werden;',
        'sich nachweislich bereits rechtmäßig im Besitz der empfangenden Partei befanden;',
        'rechtmäßig von einem Dritten erhalten wurden;',
        'von der empfangenden Partei unabhängig und ohne Nutzung vertraulicher Informationen entwickelt wurden; oder',
        'aufgrund gesetzlicher, behördlicher oder gerichtlicher Anordnung offengelegt werden müssen.',
      ],
    },
    {
      title: 'Anzeige bei Verlust',
      paragraphs: ['Der Verlust oder die unberechtigte Offenlegung vertraulicher Informationen ist der jeweils anderen Vertragspartei unverzüglich schriftlich anzuzeigen. Dies gilt auch bei Verlusten infolge Diebstahls oder ähnlicher Ereignisse.'],
    },
    {
      title: 'Unentgeltliche Überlassung',
      paragraphs: ['Die Überlassung vertraulicher Informationen erfolgt unentgeltlich.'],
    },
    {
      title: 'Laufzeit',
      paragraphs: ['Diese Vertraulichkeitsvereinbarung gilt für einen Zeitraum von zwei (2) Jahren ab Unterzeichnung durch den Interessenten. Sofern die Vertraulichkeitsvereinbarung online abgeschlossen wird, beginnt die Laufzeit mit dem Zugang der per E‑Mail übermittelten Vertragsexemplare beim Interessenten.'],
    },
    {
      title: 'Anwendbares Recht und Gerichtsstand',
      paragraphs: ['Diese Vertraulichkeitsvereinbarung unterliegt dem Recht der Bundesrepublik Deutschland. Ausschließlicher Gerichtsstand für alle Streitigkeiten aus oder im Zusammenhang mit dieser Vereinbarung ist {{court_venue}}.'],
    },
    {
      title: 'Haftungsbeschränkung und Nichtübertragbarkeit',
      paragraphs: ['Für den Fall eines Verstoßes gegen diese Vertraulichkeitsvereinbarung gelten die allgemeinen gesetzlichen Regelungen. Eine Haftung besteht nur für unmittelbare Schäden; Folgeschäden, entgangener Gewinn oder sonstige indirekte Schäden sind ausgeschlossen. Sämtliche Ansprüche können pro Verstoß nur einmal geltend gemacht werden. Rechte und Pflichten aus dieser Vertraulichkeitsvereinbarung sind nicht übertragbar.'],
    },
    {
      title: 'Salvatorische Klausel',
      paragraphs: ['Sollten einzelne Bestimmungen dieser Vertraulichkeitsvereinbarung unwirksam oder undurchführbar sein oder werden, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt. Die Vertragsparteien werden die unwirksame oder undurchführbare Bestimmung durch eine wirksame Bestimmung ersetzen, die dem wirtschaftlichen Zweck der unwirksamen Bestimmung am nächsten kommt.'],
    },
    {
      title: 'Keine Verpflichtung zum Abschluss; Schriftform',
      paragraphs: ['Durch die Unterzeichnung dieser Vertraulichkeitsvereinbarung kommt keine Verpflichtung zum Abschluss einer Transaktion zustande. Der Prozess bleibt für die Vertragsparteien unverbindlich, und keine Partei ist verpflichtet, eine Transaktion abzuschließen. Diese Vertraulichkeitsvereinbarung stellt die vollständige Vereinbarung zwischen den Vertragsparteien dar. Mündliche Nebenabreden bestehen nicht. Änderungen und Ergänzungen dieser Vertraulichkeitsvereinbarung sowie Kündigungen bedürfen der Schriftform; die elektronische Form ist hierfür nicht ausreichend. Dies gilt auch für eine Änderung oder Aufhebung dieser Schriftformklausel.'],
    },
    {
      title: 'Wirksamkeit bei Online‑Abschluss',
      paragraphs: ['Wenn der Interessent diese Vertraulichkeitsvereinbarung online auf der Internetseite des Transaktionsberaters bestätigt, erkennt der Interessent die Verbindlichkeit dieser Vereinbarung auch ohne eigenhändige Unterschrift an. Der online erklärte Konsens hat für den Interessenten dieselbe rechtliche Wirkung wie eine handschriftliche Unterschrift und begründet eine rechtswirksame Vertraulichkeitsverpflichtung zwischen den Parteien.'],
    },
  ],
};
