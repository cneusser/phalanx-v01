// Cookie-Richtlinie — was CapitalMatch im Browser speichert und was nicht.
import React from 'react';
import { Link } from 'react-router-dom';

const C = { navy: '#0D1B36', accent: '#1D4E89', border: '#E2E8F0', muted: '#64748B', bg: '#F8FAFC' };

const ENTRIES = [
  {
    name: 'phalanx_token',
    art: 'Lokaler Speicher (localStorage)',
    zweck: 'Hält Ihre Anmeldung aufrecht. Ohne diesen Eintrag müssten Sie sich bei jedem Seitenwechsel neu anmelden.',
    dauer: 'Bis zur Abmeldung, längstens 7 Tage',
    rechtsgrundlage: 'Technisch erforderlich (§ 25 Abs. 2 Nr. 2 TTDSG); Vertragserfüllung, Art. 6 Abs. 1 lit. b DSGVO',
  },
  {
    name: 'cm_lang',
    art: 'Lokaler Speicher (localStorage)',
    zweck: 'Merkt sich, ob Sie die Oberfläche auf Deutsch oder Englisch nutzen.',
    dauer: 'Bis Sie den Browserspeicher löschen',
    rechtsgrundlage: 'Technisch erforderlich (§ 25 Abs. 2 Nr. 2 TTDSG)',
  },
  {
    name: 'cm_cookie_notice',
    art: 'Lokaler Speicher (localStorage)',
    zweck: 'Merkt sich, dass Sie den Hinweis zu Cookies gesehen haben — damit er nicht bei jedem Besuch erscheint.',
    dauer: 'Bis Sie den Browserspeicher löschen',
    rechtsgrundlage: 'Technisch erforderlich (§ 25 Abs. 2 Nr. 2 TTDSG)',
  },
];

export default function Cookies() {
  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '3rem 1.5rem' }}>
      <h1 style={{ color: C.navy, fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.4rem' }}>Cookie-Richtlinie</h1>
      <p style={{ color: C.muted, fontSize: '0.85rem', marginBottom: '2rem' }}>Stand: Juli 2026</p>

      <div style={{ background: '#EDF4FA', border: '1px solid #bfdbfe', borderRadius: 10, padding: '1.1rem 1.25rem', marginBottom: '2rem' }}>
        <div style={{ fontWeight: 800, color: C.navy, marginBottom: 6 }}>Kurz gesagt</div>
        <p style={{ margin: 0, fontSize: '0.92rem', lineHeight: 1.7, color: '#334155' }}>
          CapitalMatch setzt <strong>keine</strong> Analyse-, Werbe- oder Tracking-Cookies und bindet keine Dienste ein,
          die Ihr Verhalten über Websites hinweg verfolgen. Gespeichert wird ausschließlich, was für den Betrieb der
          Plattform erforderlich ist. Deshalb finden Sie hier auch keinen Einwilligungs-Dialog mit Häkchen: Es gibt
          nichts abzulehnen, was wir nicht ohnehin unterlassen.
        </p>
      </div>

      <h2 style={{ color: C.navy, fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.8rem' }}>Was wir speichern</h2>
      <p style={{ fontSize: '0.92rem', lineHeight: 1.75, color: '#334155', marginBottom: '1.2rem' }}>
        Technisch handelt es sich nicht um Cookies im klassischen Sinn, sondern um Einträge im lokalen Speicher Ihres
        Browsers (localStorage). Sie werden nicht bei jeder Anfrage an den Server mitgeschickt und sind für andere
        Websites nicht lesbar.
      </p>

      <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden', marginBottom: '2rem' }}>
        {ENTRIES.map((e, i) => (
          <div key={e.name} style={{ padding: '1rem 1.15rem', borderTop: i ? `1px solid ${C.border}` : 'none', background: i % 2 ? C.bg : '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: 6 }}>
              <code style={{ fontWeight: 800, color: C.navy, fontSize: '0.9rem' }}>{e.name}</code>
              <span style={{ fontSize: '0.75rem', color: C.muted }}>{e.art} · {e.dauer}</span>
            </div>
            <div style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.65 }}>{e.zweck}</div>
            <div style={{ fontSize: '0.75rem', color: C.muted, marginTop: 4 }}>{e.rechtsgrundlage}</div>
          </div>
        ))}
      </div>

      <h2 style={{ color: C.navy, fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.8rem' }}>Was wir nicht tun</h2>
      <p style={{ fontSize: '0.92rem', lineHeight: 1.75, color: '#334155', marginBottom: '1.2rem' }}>
        Kein Google Analytics, kein Facebook-Pixel, kein LinkedIn-Insight-Tag, keine Werbenetzwerke, kein
        geräteübergreifendes Profiling. Wir protokollieren zwar Zugriffe auf vertrauliche Unterlagen — das ist bei
        M&A-Prozessen unverzichtbar und im Interesse aller Beteiligten — aber innerhalb der Plattform, nicht über
        Dritte und nicht für Werbezwecke. Näheres in der{' '}
        <Link to="/datenschutz" style={{ color: C.accent, fontWeight: 700 }}>Datenschutzerklärung</Link>.
      </p>

      <h2 style={{ color: C.navy, fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.8rem' }}>Kontrolle</h2>
      <p style={{ fontSize: '0.92rem', lineHeight: 1.75, color: '#334155' }}>
        Sie können den lokalen Speicher jederzeit in den Einstellungen Ihres Browsers löschen. Danach sind Sie
        abgemeldet, und die Sprachwahl fällt auf Deutsch zurück — die Plattform funktioniert im Übrigen unverändert.
      </p>

      <div style={{ marginTop: '2.5rem', paddingTop: '1.25rem', borderTop: `1px solid ${C.border}`, fontSize: '0.8rem', color: C.muted, lineHeight: 1.7 }}>
        Verantwortlich: Phalanx GmbH, Helene-Lange-Straße 28, 91056 Erlangen ·{' '}
        <a href="mailto:info@phalanx.de" style={{ color: C.accent }}>info@phalanx.de</a> ·{' '}
        <Link to="/impressum" style={{ color: C.accent }}>Impressum</Link>
      </div>
    </div>
  );
}
