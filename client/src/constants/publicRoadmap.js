// Öffentliche Roadmap (kundenseitig, Feedback-Seite). Bewusst kuratiert.
export const ROADMAP_INTRO =
  'Ihre Perspektive gestaltet CapitalMatch. Als Käufer oder Verkäufer kennen Sie die ' +
  'Anforderungen aus der Praxis am besten. Teilen Sie uns Ihre Wünsche, Ideen und Hinweise ' +
  'mit — wir entwickeln die Plattform kontinuierlich weiter und priorisieren neue Funktionen ' +
  'entlang des konkreten Nutzens für beide Seiten. Nachfolgend finden Sie einen transparenten ' +
  'Ausblick auf die nächsten geplanten Funktionen.';

export const PUBLIC_ROADMAP = [
  { status: 'progress', title: 'Käufer-Cockpit & Suchprofile',
    text: 'Tabellarische Deal-Übersicht, speicherbare Suchen und automatische Benachrichtigung, sobald ein passendes Mandat verfügbar ist.' },
  { status: 'planned', title: 'In-App-Nachrichten & Netzwerk',
    text: 'Direkter, diskreter Austausch zwischen verifizierten Kontakten — Sie entscheiden, was Sie mit wem teilen.' },
  { status: 'planned', title: '2-Faktor-Authentifizierung',
    text: 'Zusätzliche Absicherung Ihres Zugangs über Ihr Mobilgerät.' },
  { status: 'planned', title: 'Datengetriebene Bewertung 2.0',
    text: 'Automatisierte, belastbarere indikative Unternehmensbewertungen inklusive Szenario- und Sensitivitätsanalyse.' },
];

export const ROADMAP_STATUS = {
  progress: { label: 'In Umsetzung', color: '#166534', bg: '#dcfce7' },
  planned: { label: 'Geplant', color: '#1D4E89', bg: '#dbeafe' },
  done: { label: 'Verfügbar', color: '#155e75', bg: '#cffafe' },
};
