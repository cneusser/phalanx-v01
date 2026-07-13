import React from 'react';
import { Link } from 'react-router-dom';

const C = { navy: '#1A4D8A', steel: '#29ABE2', bg: '#EBF7FC' };

export default function Impressum() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '3rem 1.5rem' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <Link to="/" style={{ color: C.navy, textDecoration: 'none', fontSize: '0.8rem' }}>← Zurück zur Startseite</Link>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: C.navy, marginTop: '1rem', marginBottom: '0.4rem' }}>Impressum</h1>
        <p style={{ color: '#888', fontSize: '0.875rem' }}>Angaben gemäß § 5 TMG</p>
      </div>

      {/* CapitalMatch-Brand-Hinweis */}
      <div style={{ background: C.bg, borderRadius: 8, padding: '1rem 1.25rem', marginBottom: '1.5rem', border: `1px solid ${C.steel}30` }}>
        <p style={{ color: C.navy, fontSize: '0.85rem', margin: 0 }}>
          <strong>CapitalMatch</strong> ist eine eingetragene Marke der Phalanx GmbH.
          Diese Plattform wird betrieben von:
        </p>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, padding: '2.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #dce8f2' }}>

        {/* Unternehmen & Kontakt */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#999', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>UNTERNEHMEN</h2>
            <p style={{ color: '#333', lineHeight: 1.9, fontSize: '0.9rem' }}>
              <strong>Phalanx GmbH</strong><br />
              Helene-Lange-Str. 28<br />
              D-91056 Erlangen<br />
              Deutschland
            </p>
          </div>
          <div>
            <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#999', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>KONTAKT</h2>
            <p style={{ color: '#333', lineHeight: 1.9, fontSize: '0.9rem' }}>
              Telefon: <a href="tel:+4991319206075" style={{ color: C.navy }}>+49 9131 9 20 60 75</a><br />
              Fax: +49 9131 9 20 60 76<br />
              E-Mail: <a href="mailto:info@phalanx.de" style={{ color: C.navy }}>info@phalanx.de</a><br />
              Web: <a href="https://www.phalanx.de" target="_blank" rel="noopener noreferrer" style={{ color: C.navy }}>www.phalanx.de</a>
            </p>
          </div>
        </div>

        {/* Handelsregister & Geschäftsführung */}
        <div style={{ borderTop: '1px solid #e0ddd6', paddingTop: '1.75rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#999', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>HANDELSREGISTER</h2>
            <p style={{ color: '#333', lineHeight: 1.9, fontSize: '0.9rem' }}>
              Registergericht: Fürth<br />
              Registernummer: HRB 14306<br />
              USt-IdNr.: DE 273 832 962
            </p>
          </div>
          <div>
            <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#999', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>GESCHÄFTSFÜHRUNG</h2>
            <p style={{ color: '#333', lineHeight: 1.9, fontSize: '0.9rem' }}>
              Christian Neusser
            </p>
          </div>
        </div>

        {/* Bankverbindung */}
        <div style={{ borderTop: '1px solid #e0ddd6', paddingTop: '1.75rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#999', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>BANKVERBINDUNG</h2>
          <p style={{ color: '#333', lineHeight: 1.9, fontSize: '0.9rem' }}>
            Sparkasse Nürnberg<br />
            IBAN: DE58 7605 0101 0010 8207 28<br />
            BIC: SSKNDE77XXX
          </p>
        </div>

        {/* Berufsrecht */}
        <div style={{ borderTop: '1px solid #e0ddd6', paddingTop: '1.75rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#999', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>BERUFSRECHTLICHE ANGABEN</h2>
          <p style={{ color: '#444', fontSize: '0.875rem', lineHeight: 1.7 }}>
            Die Phalanx GmbH ist ein unabhängiges M&A- und Restrukturierungsberatungsunternehmen.
            Tätigkeiten als Finanzanlagevermittler gemäß § 34f GewO werden nicht ausgeübt.
            Die Plattform <strong>CapitalMatch</strong> dient der strukturierten Anbahnung von M&A-Transaktionen und
            Beteiligungsfinanzierungen für professionelle Investoren und wird ausschließlich von Phalanx GmbH betrieben.
          </p>
        </div>

        {/* Haftungsausschluss */}
        <div style={{ borderTop: '1px solid #e0ddd6', paddingTop: '1.75rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#999', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>HAFTUNGSAUSSCHLUSS</h2>
          <p style={{ color: '#444', fontSize: '0.875rem', lineHeight: 1.7 }}>
            Die Informationen auf dieser Plattform dienen ausschließlich der Information professioneller Kaufinteressenten und Investoren. Sie stellen keine Anlage- oder Finanzberatung dar. Die angezeigten Unternehmensdaten basieren auf Angaben der Mandanten und wurden nicht durch Phalanx GmbH geprüft. Für die Richtigkeit und Vollständigkeit der Angaben wird keine Haftung übernommen.
          </p>
        </div>

        {/* Streitschlichtung */}
        <div style={{ borderTop: '1px solid #e0ddd6', paddingTop: '1.75rem' }}>
          <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#999', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>STREITSCHLICHTUNG</h2>
          <p style={{ color: '#444', fontSize: '0.875rem', lineHeight: 1.7 }}>
            Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{' '}
            <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" style={{ color: C.navy }}>
              https://ec.europa.eu/consumers/odr/
            </a>.<br />
            Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
          </p>
        </div>
      </div>

      <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
        <Link to="/datenschutz" style={{ color: C.navy, textDecoration: 'none', fontSize: '0.875rem', marginRight: '2rem' }}>Datenschutzerklärung</Link>
        <Link to="/agb" style={{ color: C.navy, textDecoration: 'none', fontSize: '0.875rem', marginRight: '2rem' }}>AGB</Link>
        <Link to="/cookies" style={{ color: C.navy, textDecoration: 'none', fontSize: '0.875rem', marginRight: '2rem' }}>Cookie-Richtlinie</Link>
        <Link to="/" style={{ color: '#888', textDecoration: 'none', fontSize: '0.875rem' }}>Startseite</Link>
      </div>
    </div>
  );
}
