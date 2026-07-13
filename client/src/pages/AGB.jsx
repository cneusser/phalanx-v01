// Nutzungsbedingungen (AGB) für die Plattform CapitalMatch.
// Entwurf auf Basis der tatsächlichen Funktionsweise der Plattform — vor dem
// Livegang anwaltlich prüfen lassen (siehe Hinweis am Ende der Seite).
import React from 'react';
import { Link } from 'react-router-dom';

const C = { navy: '#0D1B36', accent: '#1D4E89', border: '#E2E8F0', muted: '#64748B' };

const S = ({ n, title, children }) => (
  <section style={{ marginBottom: '1.9rem' }}>
    <h2 style={{ color: C.navy, fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.6rem' }}>
      {n}. {title}
    </h2>
    <div style={{ fontSize: '0.92rem', lineHeight: 1.8, color: '#334155' }}>{children}</div>
  </section>
);

export default function AGB() {
  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '3rem 1.5rem' }}>
      <h1 style={{ color: C.navy, fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.4rem' }}>
        Nutzungsbedingungen (AGB)
      </h1>
      <p style={{ color: C.muted, fontSize: '0.85rem', marginBottom: '2rem' }}>
        Für die Plattform CapitalMatch · Stand: Juli 2026
      </p>

      <S n="1" title="Anbieter und Gegenstand">
        Anbieterin der Plattform CapitalMatch ist die <strong>Phalanx GmbH</strong>, Helene-Lange-Straße 28,
        91056 Erlangen (nachfolgend „Phalanx"). CapitalMatch ist eine Marke der Phalanx GmbH.
        <br /><br />
        CapitalMatch ist eine geschlossene Plattform, über die Phalanx Transaktionsmandate (Unternehmensverkauf,
        Nachfolge, Wachstumsfinanzierung) anonymisiert vorstellt und den weiteren Prozess strukturiert: Teaser,
        Vertraulichkeitsvereinbarung, Information Memorandum, Datenraum, Rückfragen und Kommunikation.
        Diese Bedingungen regeln die Nutzung der Plattform — nicht die Beratungsleistung selbst.
      </S>

      <S n="2" title="Kein Beratungs- oder Vermittlungsvertrag durch die Nutzung">
        Die Registrierung und Nutzung der Plattform begründet <strong>kein Mandats-, Beratungs- oder
        Maklerverhältnis</strong>. Beratungsleistungen der Phalanx GmbH kommen ausschließlich durch einen gesonderten,
        schriftlichen Vertrag zustande. Die auf der Plattform bereitgestellten Inhalte sind <strong>keine Anlage-,
        Rechts- oder Steuerberatung</strong> und stellen kein Angebot und keine Aufforderung zur Abgabe eines Angebots
        zum Kauf oder Verkauf von Unternehmen oder Unternehmensanteilen dar.
      </S>

      <S n="3" title="Zugang, Registrierung, Freischaltung">
        Die Nutzung setzt eine Registrierung mit wahrheitsgemäßen Angaben und eine Bestätigung der E-Mail-Adresse
        voraus. Phalanx entscheidet über die Freischaltung nach eigenem Ermessen und kann sie ohne Angabe von
        Gründen verweigern oder widerrufen; ein Anspruch auf Zugang besteht nicht. Zugangsdaten sind geheim zu halten
        und dürfen nicht weitergegeben werden. Die Nutzung ist beruflichen Interessenten vorbehalten und richtet sich
        nicht an Verbraucher im Sinne des § 13 BGB.
      </S>

      <S n="4" title="Vertraulichkeit">
        Sämtliche über die Plattform zugänglichen Informationen zu Mandaten sind vertraulich — auch dann, wenn sie
        anonymisiert sind. Der Nutzer verpflichtet sich, sie ausschließlich zur Prüfung der jeweiligen Transaktion zu
        verwenden, nicht zu vervielfältigen und Dritten nicht zugänglich zu machen. Für den Zugang zu
        Information Memorandum und Datenraum ist zusätzlich eine <strong>gesonderte Vertraulichkeitsvereinbarung
        (NDA)</strong> zu unterzeichnen; deren Regelungen gehen diesen Bedingungen im Zweifel vor.
        <br /><br />
        Der Versuch, die Identität eines anonymisierten Unternehmens ohne vorherige Freigabe zu ermitteln oder
        Beteiligte des Zielunternehmens (Mitarbeiter, Kunden, Lieferanten) unmittelbar anzusprechen, ist untersagt.
      </S>

      <S n="5" title="Protokollierung von Zugriffen">
        Zugriffe auf vertrauliche Unterlagen (Aufrufe, Downloads, Freigaben) werden protokolliert und dem jeweiligen
        Nutzerkonto zugeordnet. Das dient dem Schutz der Mandanten und der Nachvollziehbarkeit des Prozesses; die
        Protokolle können dem Mandanten in aggregierter oder — bei Verstößen — personenbezogener Form offengelegt
        werden. Näheres regelt die <Link to="/datenschutz" style={{ color: C.accent, fontWeight: 700 }}>Datenschutzerklärung</Link>.
      </S>

      <S n="6" title="Pflichten des Nutzers">
        Der Nutzer sichert zu, dass er über die erforderliche Vertretungsmacht verfügt, seine Angaben zutreffend sind
        und er die Plattform nicht missbräuchlich nutzt. Untersagt sind insbesondere: das automatisierte Auslesen von
        Inhalten (Scraping), das Umgehen von Zugangsbeschränkungen, die Weitergabe von Unterlagen, die Nutzung der
        Kontaktdaten zu Werbezwecken sowie jede Handlung, die den Betrieb der Plattform beeinträchtigt.
      </S>

      <S n="7" title="Inhalte, Richtigkeit, Bewertungsergebnisse">
        Angaben zu Mandaten beruhen auf Informationen der jeweiligen Verkäufer. Phalanx prüft sie mit der Sorgfalt
        eines ordentlichen Kaufmanns, übernimmt jedoch <strong>keine Gewähr für Vollständigkeit und Richtigkeit</strong>.
        Die Ergebnisse der Bewertungswerkzeuge (Quick-Check, ausführliche Bewertung, DCF, Benchmarking) sind
        <strong> indikative Orientierungswerte</strong> auf Basis der eingegebenen Daten und offen ausgewiesener Annahmen.
        Sie ersetzen kein Bewertungsgutachten (etwa nach IDW S 1) und entsprechen nicht dem am Markt erzielbaren Preis.
        Eine eigene Prüfung (Due Diligence) bleibt in jedem Fall erforderlich.
      </S>

      <S n="8" title="Verfügbarkeit">
        Phalanx bemüht sich um einen möglichst störungsfreien Betrieb, schuldet aber keine bestimmte Verfügbarkeit.
        Wartungsarbeiten, Weiterentwicklungen und Störungen können zu Unterbrechungen führen. Ein Anspruch auf den
        Fortbestand einzelner Funktionen besteht nicht.
      </S>

      <S n="9" title="Haftung">
        Phalanx haftet unbeschränkt bei Vorsatz und grober Fahrlässigkeit sowie bei Verletzung von Leben, Körper oder
        Gesundheit und nach dem Produkthaftungsgesetz. Bei einfacher Fahrlässigkeit haftet Phalanx nur bei Verletzung
        einer wesentlichen Vertragspflicht (Kardinalpflicht) und begrenzt auf den bei Vertragsschluss typischerweise
        vorhersehbaren Schaden. Im Übrigen ist die Haftung ausgeschlossen — insbesondere für Entscheidungen, die ein
        Nutzer auf Grundlage der über die Plattform erhaltenen Informationen oder der indikativen Bewertungsergebnisse
        trifft.
      </S>

      <S n="10" title="Preise">
        Die Nutzung der Plattform ist für Interessenten derzeit kostenfrei. Einzelne Zusatzleistungen können
        kostenpflichtig sein; sie werden vor Inanspruchnahme deutlich als solche gekennzeichnet und erfordern eine
        gesonderte Bestätigung. Honorare für Beratungsleistungen richten sich ausschließlich nach dem jeweiligen
        Mandatsvertrag.
      </S>

      <S n="11" title="Laufzeit und Beendigung">
        Das Nutzungsverhältnis läuft auf unbestimmte Zeit und kann von beiden Seiten jederzeit ohne Einhaltung einer
        Frist beendet werden. Phalanx kann den Zugang bei Verstößen gegen diese Bedingungen — insbesondere gegen die
        Vertraulichkeit — mit sofortiger Wirkung sperren. Vertraulichkeitspflichten bestehen über das Ende der Nutzung
        hinaus fort.
      </S>

      <S n="12" title="Änderungen dieser Bedingungen">
        Phalanx kann diese Bedingungen mit Wirkung für die Zukunft ändern. Registrierte Nutzer werden über wesentliche
        Änderungen per E-Mail informiert. Widerspricht der Nutzer nicht innerhalb von sechs Wochen oder nutzt er die
        Plattform weiter, gelten die geänderten Bedingungen als angenommen; auf diese Folge wird in der Mitteilung
        gesondert hingewiesen.
      </S>

      <S n="13" title="Schlussbestimmungen">
        Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts. Ausschließlicher Gerichtsstand für Streitigkeiten
        mit Kaufleuten, juristischen Personen des öffentlichen Rechts und öffentlich-rechtlichen Sondervermögen ist
        Erlangen. Sollte eine Bestimmung unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.
        <br /><br />
        Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung bereit
        (<a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noreferrer" style={{ color: C.accent }}>ec.europa.eu/consumers/odr</a>).
        Zur Teilnahme an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle sind wir nicht
        verpflichtet und nicht bereit.
      </S>

      <div style={{ background: '#FFFBEB', border: '1px solid #fcd34d', borderRadius: 10, padding: '1rem 1.15rem', marginTop: '2rem', fontSize: '0.85rem', color: '#92400e', lineHeight: 1.7 }}>
        <strong>Hinweis:</strong> Dieser Text ist ein sorgfältig erstellter Entwurf, der die tatsächliche Funktionsweise
        der Plattform abbildet — er ersetzt jedoch keine anwaltliche Prüfung. Vor dem öffentlichen Livegang sollten
        Nutzungsbedingungen, Datenschutzerklärung und NDA-Vorlage von einer Rechtsanwältin oder einem Rechtsanwalt
        geprüft und aufeinander abgestimmt werden.
      </div>

      <div style={{ marginTop: '2rem', paddingTop: '1.25rem', borderTop: `1px solid ${C.border}`, fontSize: '0.8rem', color: C.muted }}>
        <Link to="/impressum" style={{ color: C.accent, marginRight: 14 }}>Impressum</Link>
        <Link to="/datenschutz" style={{ color: C.accent, marginRight: 14 }}>Datenschutz</Link>
        <Link to="/cookies" style={{ color: C.accent }}>Cookie-Richtlinie</Link>
      </div>
    </div>
  );
}
