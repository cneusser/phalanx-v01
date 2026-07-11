// Öffentliche Roadmap (kundenseitig, Feedback-Seite). Bewusst kuratiert.
export const ROADMAP_INTRO =
  'Ihre Perspektive gestaltet CapitalMatch. Als Käufer oder Verkäufer kennen Sie die ' +
  'Anforderungen aus der Praxis am besten. Teilen Sie uns Ihre Wünsche, Ideen und Hinweise ' +
  'mit — wir entwickeln die Plattform kontinuierlich weiter und priorisieren neue Funktionen ' +
  'entlang des konkreten Nutzens für beide Seiten. Nachfolgend finden Sie einen transparenten ' +
  'Ausblick auf die nächsten geplanten Funktionen.';

export const PUBLIC_ROADMAP = [
  { status: 'done', title: 'Käufer-Cockpit & Suchprofile',
    text: 'Tabellarische Deal-Übersicht, speicherbare Suchen und automatische Benachrichtigung, sobald ein passendes Mandat verfügbar ist.' },
  { status: 'done', title: 'In-App-Nachrichten & Netzwerk',
    text: 'Direkter, diskreter Austausch zwischen verifizierten Kontakten — Sie entscheiden, was Sie mit wem teilen.' },
  { status: 'done', title: 'Mobil-optimierte Darstellung',
    text: 'Vollständig für Smartphone und Tablet optimiert — Marktplatz, Nachrichten und Bewertung funktionieren unterwegs genauso komfortabel wie am Desktop.' },
  { status: 'planned', title: 'Datengetriebene Bewertung 2.0',
    text: 'Automatisierte, belastbarere indikative Unternehmensbewertungen inklusive Szenario- und Sensitivitätsanalyse.' },
  { status: 'planned', title: '2-Faktor-Authentifizierung',
    text: 'Zusätzliche Absicherung Ihres Zugangs über Ihr Mobilgerät.' },
  { status: 'planned', title: 'Beziehungs- & Deal-Management (CRM)',
    text: 'Behalten Sie Kontakte, Interessenten und den Fortschritt jedes Deals an einem Ort im Blick — mit Aufgaben, Wiedervorlagen und transparentem Status entlang des gesamten Prozesses.' },
  { status: 'done', title: 'Direkte Vernetzung Käufer & Verkäufer',
    text: 'Aus Interesse wird mit einem Klick ein direkter, mandatsbezogener Chat mit Ihrem Berater — begleitet von automatischen Hinweisen zu Prozessschritten (NDA, Due Diligence, LOI, Closing).' },
  { status: 'done', title: 'XP & Level – Belohnung für Aktivität und Abschlüsse',
    text: 'Sammeln Sie Punkte für echte Prozessschritte (NDA, Datenraum, Due Diligence) und für Deals, die Sie über die Plattform abwickeln — sichtbar in Ihrem Bereich, dezent und auf Vertraulichkeit ausgelegt.' },
  { status: 'done', title: 'Newsletter, Folgen & Ähnlichkeits-Vorschläge',
    text: 'Abonnieren Sie neue Mandate, folgen Sie einzelnen Mandaten (automatisch bei Interesse oder manuell per Stern) und erhalten Sie Hinweise auf ähnliche Mandate — mit voller Kontrolle über Ihre Benachrichtigungen im Profil.' },
];

export const ROADMAP_STATUS = {
  progress: { label: 'In Umsetzung', color: '#166534', bg: '#dcfce7' },
  planned: { label: 'Geplant', color: '#1D4E89', bg: '#dbeafe' },
  done: { label: 'Verfügbar', color: '#155e75', bg: '#cffafe' },
};
