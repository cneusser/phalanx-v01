import React from 'react';
import { Link } from 'react-router-dom';

const C = { navy: '#1A4D8A', steel: '#29ABE2', bg: '#EBF7FC' };

const Section = ({ title, children }) => (
  <div style={{ marginBottom: '2rem' }}>
    <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: C.navy, marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid #e0ddd6' }}>{title}</h2>
    <div style={{ color: '#444', fontSize: '0.875rem', lineHeight: 1.8 }}>{children}</div>
  </div>
);

export default function Datenschutz() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '3rem 1.5rem' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <Link to="/" style={{ color: C.navy, textDecoration: 'none', fontSize: '0.8rem' }}>← Zurück zur Startseite</Link>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: C.navy, marginTop: '1rem', marginBottom: '0.4rem' }}>Datenschutzerklärung</h1>
        <p style={{ color: '#888', fontSize: '0.875rem' }}>Stand: Juni 2026</p>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, padding: '2.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #dce8f2' }}>

        <Section title="1. Verantwortliche Stelle">
          <p>Verantwortlich für die Datenverarbeitung auf dieser Plattform ist:</p>
          <p style={{ marginTop: '0.75rem', fontWeight: 500 }}>
            Phalanx GmbH<br />
            Helene-Lange-Str. 28<br />
            D-91056 Erlangen<br />
            E-Mail: <a href="mailto:info@phalanx.de" style={{ color: C.navy }}>info@phalanx.de</a><br />
            Telefon: +49 9131 9 20 60 75
          </p>
          <p style={{ marginTop: '0.75rem' }}>
            <strong>CapitalMatch</strong> ist eine Marke der Phalanx GmbH.
            Diese Datenschutzerklärung gilt für die gesamte CapitalMatch-Plattform.
          </p>
        </Section>

        <Section title="2. Erhobene Daten">
          <p>Wir erheben und verarbeiten folgende personenbezogene Daten im Rahmen der Plattformnutzung:</p>
          <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem' }}>
            <li>Registrierungsdaten: Name, E-Mail-Adresse, Unternehmen, Position, Telefonnummer</li>
            <li>Investorenprofil: Branchenpräferenzen, Investitionskriterien, Käufertyp</li>
            <li>Zugangsdaten: verschlüsseltes Passwort (bcrypt), Login-Zeitstempel</li>
            <li>NDA-Prozessdaten: Anfrage, Versand, Unterzeichnung und Freigabe von Vertraulichkeitsvereinbarungen</li>
            <li>Dokumentenzugriffe: Audit-Trail aller Downloads (Zeitstempel, Dokument, IP-Adresse)</li>
            <li>Technische Daten: IP-Adresse (anonymisiert nach 7 Tagen), Browser-Typ</li>
          </ul>
        </Section>

        <Section title="3. Zweck der Datenverarbeitung">
          <p>Die erhobenen Daten werden ausschließlich für folgende Zwecke genutzt:</p>
          <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem' }}>
            <li>Bereitstellung und Betrieb der CapitalMatch-Plattform</li>
            <li>Identitätsprüfung und Qualifizierung von Investoren</li>
            <li>Durchführung des NDA-Prozesses und Dokumentenzugang</li>
            <li>Compliance und Audit-Trail bei Dokumentenzugriffen</li>
            <li>Kommunikation im Rahmen von M&A- und Fundraising-Prozessen</li>
          </ul>
        </Section>

        <Section title="4. Rechtsgrundlage">
          <p>
            Die Verarbeitung erfolgt auf Basis von Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) für die
            Plattformnutzung, Art. 6 Abs. 1 lit. f DSGVO (berechtigte Interessen) für Sicherheits- und
            Compliance-Zwecke sowie Art. 6 Abs. 1 lit. a DSGVO (Einwilligung) für die Registrierung.
          </p>
        </Section>

        <Section title="5. Datenweitergabe">
          <p>
            Ihre Daten werden nicht an Dritte verkauft. Im Rahmen von M&A-Prozessen werden —
            nach NDA-Unterzeichnung und expliziter Freigabe — anonymisierte Projektinformationen
            zwischen Mandanten und geprüften Investoren ausgetauscht. Die Identität der Parteien
            wird erst nach gegenseitiger Freigabe durch Phalanx GmbH offengelegt.
          </p>
        </Section>

        <Section title="6. Datenspeicherung und -löschung">
          <p>
            Nutzerdaten werden für die Dauer der aktiven Plattformnutzung gespeichert.
            Nach Kontoauflösung werden personenbezogene Daten innerhalb von 30 Tagen gelöscht,
            sofern keine gesetzlichen Aufbewahrungspflichten entgegenstehen.
            Audit-Logs werden aus Compliance-Gründen 7 Jahre aufbewahrt.
          </p>
        </Section>

        <Section title="7. Ihre Rechte">
          <p>Sie haben das Recht auf:</p>
          <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem' }}>
            <li>Auskunft über gespeicherte Daten (Art. 15 DSGVO)</li>
            <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO)</li>
            <li>Löschung Ihrer Daten (Art. 17 DSGVO)</li>
            <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
            <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
            <li>Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)</li>
          </ul>
          <p style={{ marginTop: '0.75rem' }}>
            Richten Sie entsprechende Anfragen an:{' '}
            <a href="mailto:info@phalanx.de" style={{ color: C.navy }}>info@phalanx.de</a>
          </p>
        </Section>

        <Section title="8. Cookies und technische Speicherung">
          <p>
            Die CapitalMatch-Plattform verwendet ausschließlich technisch notwendige Einträge im lokalen
            Browserspeicher: das Sitzungs-Token (JWT) zur Anmeldung, die Spracheinstellung und den Hinweis,
            dass Sie die Cookie-Information gesehen haben. Es werden <strong>keine</strong> Tracking-Cookies,
            Analyse-Werkzeuge oder Marketing-Dienste eingesetzt — daher gibt es auch keinen Einwilligungs-Dialog.
            Einzelheiten in der <Link to="/cookies" style={{ color: C.navy, fontWeight: 700 }}>Cookie-Richtlinie</Link>.
          </p>
        </Section>

        <Section title="8a. Ansprache von Interessenten (CRM)">
          <p>
            Wir führen ein internes Kontaktverzeichnis potenzieller Erwerber und Investoren. Verarbeitet werden
            Name, geschäftliche Kontaktdaten, Position, Investitionsfokus (Branchen, Regionen, Ticketgröße) sowie
            der Verlauf unserer Ansprache (versendete Nachrichten, Erinnerungen, Reaktionen, Prozessstand).
            Rechtsgrundlage ist unser berechtigtes Interesse an der Anbahnung von Transaktionen
            (Art. 6 Abs. 1 lit. f DSGVO) bzw. Ihre Einwilligung (Art. 6 Abs. 1 lit. a DSGVO), soweit Sie diese
            über den Bestätigungslink erteilt haben.
          </p>
          <p>
            Jede Ansprache enthält einen Hinweis auf Ihr <strong>Widerspruchsrecht</strong>. Über einen persönlichen
            Link können Sie jederzeit einsehen, welche Angaben zu Ihnen gespeichert sind, diese selbst korrigieren,
            die Häufigkeit der Ansprache steuern oder sich vollständig abmelden. Nach einem Widerspruch sperren wir
            Ihren Kontakt dauerhaft für jede weitere Ansprache. Erinnerungen enden spätestens nach zwei Nachfassungen
            und in jedem Fall, sobald Sie reagieren.
          </p>
        </Section>

        <Section title="8b. Protokollierung und Zwei-Faktor-Authentifizierung">
          <p>
            Zugriffe auf vertrauliche Unterlagen (Aufrufe, Downloads, Freigaben) sowie sicherheitsrelevante Vorgänge
            (Anmeldungen, Rollenänderungen, Versand von Nachrichten) werden protokolliert. Das ist bei
            M&amp;A-Prozessen zum Schutz der Mandanten unverzichtbar; Rechtsgrundlage ist unser berechtigtes Interesse
            (Art. 6 Abs. 1 lit. f DSGVO) sowie die Rechenschaftspflicht nach Art. 5 Abs. 2 DSGVO.
          </p>
          <p>
            Wenn Sie die Zwei-Faktor-Authentifizierung aktivieren, speichern wir ein zufälliges Geheimnis für die
            Erzeugung der Einmalcodes sowie Ihre Backup-Codes ausschließlich als kryptografischen Hash. Beides dient
            allein der Absicherung Ihres Zugangs.
          </p>
        </Section>

        <Section title="9. Hosting und Datensicherheit">
          <p>
            Die Plattform wird auf europäischen Servern gehostet.
            Alle Datenübertragungen erfolgen verschlüsselt über HTTPS/TLS.
            Passwörter werden ausschließlich als bcrypt-Hash gespeichert.
            Dokumentenzugriffe werden vollständig protokolliert (Audit-Trail).
          </p>
        </Section>

        <Section title="10. Beschwerderecht">
          <p>
            Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren.
            Die zuständige Aufsichtsbehörde für die Phalanx GmbH ist das Bayerische Landesamt
            für Datenschutzaufsicht (BayLDA), Promenade 18, 91522 Ansbach.
          </p>
        </Section>

      </div>

      <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
        <Link to="/impressum" style={{ color: C.navy, textDecoration: 'none', fontSize: '0.875rem', marginRight: '2rem' }}>Impressum</Link>
        <Link to="/agb" style={{ color: C.navy, textDecoration: 'none', fontSize: '0.875rem', marginRight: '2rem' }}>AGB</Link>
        <Link to="/cookies" style={{ color: C.navy, textDecoration: 'none', fontSize: '0.875rem', marginRight: '2rem' }}>Cookies</Link>
        <Link to="/" style={{ color: '#888', textDecoration: 'none', fontSize: '0.875rem' }}>Startseite</Link>
      </div>
    </div>
  );
}
