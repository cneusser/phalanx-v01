/**
 * Systemvorlagen für die Käuferansprache (eine je Prozessschritt).
 *
 * Diese Datei ist die Quelle der Wahrheit. Die Migration mail_templates legt die
 * Vorlagen bei einer frischen Datenbank an, die Migration texts_v267 zieht sie in
 * bestehenden Datenbanken nach. Vorlagen, die im Admin bearbeitet wurden
 * (updated_by ist gesetzt), bleiben unangetastet.
 *
 * Ton: geschäftlich, aber gesprochen. Kurze Sätze neben langen. Keine Floskeln,
 * keine Gedankenstriche. Wer eine Mail von uns liest, soll einen Menschen hören.
 *
 * Platzhalter: {{anrede}} {{vorname}} {{nachname}} {{unternehmen}} {{position}}
 *              {{mandat}} {{branche}} {{region}} {{umsatz}} {{ebitda}}
 *              {{transaktionsart}} {{berater}} {{berater_mail}} {{berater_tel}}
 *              {{frist}} {{datum}}
 * CTA-Ziele:   project | consent | profile | none
 */

const T = (key, name, stage, subject, body, cta_label, cta_target, sort) => ({
  key, name, stage, subject, body, cta_label, cta_target, sort,
  is_system: 1, is_active: 1, tenant_id: 1,
});

const TEMPLATES = [
  T('reengage', 'Wiederaufnahme der Kommunikation', 2,
    '[Vertraulich] {{mandat}}: wir nehmen den Faden wieder auf',
    'wir hatten uns zum Mandat {{mandat}} schon einmal ausgetauscht. Danach ist der Kontakt eingeschlafen, auf beiden Seiten. Dafür bitte ich um Nachsicht.\n\n' +
    'Der Prozess läuft weiter, und Ihr Profil passt aus unserer Sicht unverändert: {{branche}}, {{region}}, Umsatz {{umsatz}}, {{transaktionsart}}.\n\n' +
    'Bevor wir den Kreis der Gesprächspartner enger ziehen, möchte ich Ihnen die Tür noch einmal aufhalten. Ein Klick genügt. Oder eine kurze Nachricht, wenn das Thema für Sie erledigt ist. Beides ist in Ordnung.',
    'Mandat ansehen', 'project', 10),

  T('first_approach', 'Erstansprache (Longlist)', 1,
    '[Vertraulich] {{mandat}}: vertrauliche Vorabinformation',
    'wir begleiten im Auftrag unseres Mandanten eine Transaktion, die zu Ihrem Suchprofil passt: {{branche}}, {{region}}, Umsatz {{umsatz}}, {{transaktionsart}}.\n\n' +
    'Vorgestellt wird das Vorhaben zunächst anonym. Wer dahintersteht, erfahren Sie, sobald eine Vertraulichkeitsvereinbarung unterzeichnet ist. So will es unser Mandant, und ich halte das für richtig.\n\n' +
    'Wenn das für Sie relevant klingt, schicke ich Ihnen den anonymen Teaser sofort.',
    'Kurzprofil ansehen', 'consent', 20),

  T('follow_up', 'Nachfassen ohne Rückmeldung', 1,
    '[Vertraulich] {{mandat}}: kurze Nachfrage',
    'ich komme kurz auf meine Ansprache zum Mandat {{mandat}} zurück. Solche Nachrichten gehen in einer vollen Woche unter, das kenne ich von mir selbst. Deshalb diese eine Erinnerung, mehr wird es nicht.\n\n' +
    'Der Prozess läuft. Wer jetzt einsteigt, verliert nichts. Passt das Vorhaben nicht in Ihr Raster, sagen Sie bitte kurz ab. Dann nehme ich Sie aus dem Verteiler.',
    'Kurzprofil ansehen', 'project', 30),

  T('nda_request', 'NDA anfordern', 3,
    '[Vertraulich] {{mandat}}: Vertraulichkeitsvereinbarung',
    'danke für Ihr Interesse an {{mandat}}. Für den nächsten Schritt brauchen wir eine unterzeichnete Vertraulichkeitsvereinbarung.\n\n' +
    'Zeichnen können Sie direkt auf der Plattform, ohne Ausdruck und ohne Postweg. Danach schalten wir das Information Memorandum und die übrigen Unterlagen für Sie frei.',
    'NDA digital zeichnen', 'project', 40),

  T('nda_reminder', 'NDA ausstehend, Erinnerung', 3,
    '[Vertraulich] {{mandat}}: NDA noch offen',
    'die Vertraulichkeitsvereinbarung zu {{mandat}} liegt noch bei Ihnen. Ohne sie kommen die Unterlagen nicht heraus. Das ist eine Auflage unseres Mandanten, keine Formalie von uns.\n\n' +
    'Auf der Plattform dauert die Zeichnung keine zwei Minuten. Haben Sie inhaltliche Anmerkungen zur NDA, rufen Sie mich an, dann klären wir das am Telefon statt per Fassung und Gegenfassung.',
    'NDA digital zeichnen', 'project', 50),

  T('im_release', 'IM und Unterlagen freigegeben', 4,
    '[Vertraulich] {{mandat}}: Information Memorandum freigeschaltet',
    'danke für die unterzeichnete Vertraulichkeitsvereinbarung. Das Information Memorandum zu {{mandat}} und die weiteren Unterlagen sind für Sie freigeschaltet.\n\n' +
    'Drin stehen Geschäftsmodell, Marktposition, Organisation, Finanzhistorie und der Planungsrahmen. Fragen zum Unternehmen stellen Sie am besten über die Plattform. Dann sind Frage und Antwort für beide Seiten dokumentiert, und niemand sucht später in E-Mail-Ketten.\n\n' +
    'Für eine erste Einschätzung nehme ich mir gern 20 Minuten am Telefon.',
    'Unterlagen öffnen', 'project', 60),

  T('meeting_invite', 'Management-Gespräch anbieten', 5,
    '[Vertraulich] {{mandat}}: Management-Gespräch',
    'Sie haben die Unterlagen zu {{mandat}} gesichtet. Der nächste Schritt ist das Gespräch mit dem Management.\n\n' +
    'Der Inhaber steht für ein Treffen bereit, persönlich oder virtuell. Über den Deal entscheidet dieses Gespräch meist mehr als jede weitere Unterlage. Es geht um Betrieb, Team, Kunden und darum, wie eine Übergabe aussehen kann.\n\n' +
    'Nennen Sie mir zwei bis drei Zeitfenster in den nächsten zwei Wochen, ich stimme sie mit dem Mandanten ab.',
    'Mandat ansehen', 'project', 70),

  T('loi_request', 'Indikatives Angebot anfordern', 6,
    '[Vertraulich] {{mandat}}: indikatives Angebot bis {{frist}}',
    'nach den bisherigen Gesprächen zu {{mandat}} gehen wir in die nächste Phase. Wir bitten die verbliebenen Interessenten um ein unverbindliches, indikatives Angebot bis zum {{frist}}.\n\n' +
    'Auf den Euro genau muss das nicht sein. Wir erwarten eine belastbare Bandbreite und die Annahmen dahinter: Bewertungsansatz und Multiple, Struktur (Share Deal, cash- und debt-free), Finanzierung, Zeitplan, Umgang mit Team und Standort sowie die Rolle des Inhabers nach dem Closing.\n\n' +
    'Auf dieser Grundlage entscheidet der Mandant, mit wem er in die Due Diligence geht. Bei Rückfragen zu den Annahmen erreichen Sie mich jederzeit.',
    'Unterlagen öffnen', 'project', 80),

  T('dd_start', 'Due Diligence startet', 7,
    '[Vertraulich] {{mandat}}: Freigabe zur Due Diligence',
    'unser Mandant hat entschieden, mit Ihnen in die Due Diligence zu gehen. Herzlichen Glückwunsch, und danke für die saubere Arbeit im bisherigen Prozess.\n\n' +
    'Der Datenraum ist für Ihr Team offen. Bitte schicken Sie Ihre Fragen gebündelt über die Plattform. Wir beantworten sie in festen Zyklen, damit der laufende Betrieb des Unternehmens darunter nicht leidet.\n\n' +
    'Den Zeitplan bis zum Signing stimmen wir in einem kurzen Call zu Beginn ab.',
    'Datenraum öffnen', 'project', 90),

  T('rejection', 'Absage im Prozess (höflich)', 8,
    '[Vertraulich] {{mandat}}: Entscheidung unseres Mandanten',
    'danke für Ihr Interesse an {{mandat}} und für die Zeit, die Sie in den Prozess gesteckt haben.\n\n' +
    'Unser Mandant führt die Gespräche mit einer anderen Partei weiter. Das ist kein Urteil über Ihr Haus. Den Ausschlag gaben Struktur und Zeitplan.\n\n' +
    'Ihr Suchprofil halte ich aktiv und melde mich, sobald ein passendes Mandat in die Ansprache geht. Und falls der laufende Prozess wider Erwarten scheitert, komme ich auf Sie zurück.',
    'Suchprofil aktualisieren', 'profile', 100),

  T('dormant_close', 'Kontakt schließen (kein Interesse)', 0,
    '[Vertraulich] {{mandat}}: wir nehmen Sie heraus',
    'zu {{mandat}} haben wir nichts von Ihnen gehört. Ich werte das als Desinteresse und nehme Sie aus diesem Prozess. Weitere Nachrichten zu diesem Mandat bekommen Sie nicht.\n\n' +
    'Damit unsere Ansprache künftig besser trifft: Über den Link unten hinterlegen Sie in einer Minute, welche Branchen, Regionen und Ticketgrößen für Sie überhaupt infrage kommen. Oder Sie melden sich vollständig ab, auch das geht dort.',
    'Suchprofil pflegen oder abmelden', 'profile', 110),
];

module.exports = { TEMPLATES };
