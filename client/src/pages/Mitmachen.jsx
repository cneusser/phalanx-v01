import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ShieldCheck, FileText, Database, MessageSquare, Lock, ArrowRight, CheckCircle } from 'lucide-react';
import CapitalMatchLogo from '../components/CapitalMatchLogo';

const C = { navy: '#14314F', accent: '#1A4D8A', steel: '#29ABE2', bg: '#F3F7FB', border: '#DDE8F3', text: '#0F172A', muted: '#5B6B7F' };

// Mitmachen-Landingpage. Der Link, den Sie z. B. auf LinkedIn teilen, trägt
// ?src=linkedin. Der Wert wird an die Registrierung durchgereicht und dort
// dauerhaft gespeichert, damit die Herkunft der Anmeldungen sichtbar wird.
export default function Mitmachen() {
  const [params] = useSearchParams();
  const src = (params.get('src') || params.get('utm_source') || 'direct').toLowerCase();
  const regTo = `/registrieren?src=${encodeURIComponent(src)}`;

  const benefits = [
    ['Exklusive Mandate', 'Anonyme Kurzprofile zu Unternehmensnachfolgen, Mehrheitsverkäufen und Beteiligungen, die Sie sonst nirgends sehen.', FileText],
    ['Vertraulich von Anfang an', 'Die Identität des Unternehmens wird erst nach digital gezeichneter Vertraulichkeitserklärung sichtbar.', ShieldCheck],
    ['Datenraum und Unterlagen', 'Nach der Unterschrift erhalten Sie Exposé, Information Memorandum und den Datenraum an einem Ort.', Database],
    ['Direkter Draht', 'Fragen und Antworten laufen dokumentiert über die Plattform, ohne verlorene E-Mail-Ketten.', MessageSquare],
  ];
  const steps = [
    ['1', 'Registrieren', 'Kostenlos in zwei Minuten, mit Ihrem Suchprofil.'],
    ['2', 'Mandat wählen', 'Passende anonyme Kurzprofile im Marktplatz öffnen.'],
    ['3', 'NDA zeichnen', 'Vertraulichkeitserklärung digital unterschreiben.'],
    ['4', 'Unterlagen erhalten', 'Datenraum, Gespräch und indikatives Angebot.'],
  ];

  const btn = { display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', color: C.accent, padding: '0.9rem 2rem', borderRadius: 10, textDecoration: 'none', fontWeight: 800, fontSize: '1rem' };

  return (
    <div style={{ background: '#fff', color: C.text }}>
      {/* Hero */}
      <div style={{ background: `linear-gradient(135deg, ${C.navy}, ${C.accent})`, color: '#fff', padding: '3rem 1.5rem 3.5rem' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <CapitalMatchLogo textSize={30} white={true} showClaim={false} />
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.85rem', margin: '0.6rem 0 2rem', letterSpacing: '0.02em' }}>Exklusive Mandatsplattform, eine Marke der Phalanx GmbH</p>
          <h1 style={{ fontSize: '2.3rem', lineHeight: 1.15, fontWeight: 800, margin: '0 0 1rem', maxWidth: 760 }}>
            Zugang zu vertraulichen M&A- und Beteiligungsmandaten
          </h1>
          <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.9)', lineHeight: 1.55, maxWidth: 680, margin: '0 0 2rem' }}>
            Als Käufer, Investor oder Nachfolger sehen Sie kuratierte, anonyme Kurzprofile und fordern die Unterlagen mit einem Klick an. Diskret, strukturiert und auf M&A-Niveau.
          </p>
          <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <Link to={regTo} style={btn}>Jetzt kostenlos registrieren <ArrowRight size={18} /></Link>
            <Link to="/login" style={{ color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: '0.9rem', opacity: 0.9 }}>Schon dabei? Anmelden</Link>
          </div>
          <div style={{ display: 'flex', gap: '1.2rem', flexWrap: 'wrap', marginTop: '1.6rem', fontSize: '0.82rem', color: 'rgba(255,255,255,0.8)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Lock size={14} /> Vertraulich</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><CheckCircle size={14} /> Kostenlose Registrierung</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><ShieldCheck size={14} /> DSGVO-konform</span>
          </div>
        </div>
      </div>

      {/* Nutzen */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '3rem 1.5rem 1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          {benefits.map(([t, d, Icon]) => (
            <div key={t} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '1.3rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fff', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.8rem' }}>
                <Icon size={20} color={C.accent} />
              </div>
              <div style={{ fontWeight: 800, color: C.navy, fontSize: '1rem', marginBottom: 4 }}>{t}</div>
              <div style={{ fontSize: '0.88rem', color: C.muted, lineHeight: 1.55 }}>{d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* So funktioniert es */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: C.navy, marginBottom: '1.2rem' }}>So funktioniert es</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {steps.map(([n, t, d]) => (
            <div key={n} style={{ padding: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ width: 28, height: 28, borderRadius: '50%', background: C.accent, color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>{n}</span>
                <span style={{ fontWeight: 800, color: C.navy }}>{t}</span>
              </div>
              <div style={{ fontSize: '0.85rem', color: C.muted, lineHeight: 1.5, paddingLeft: 36 }}>{d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Abschluss-CTA */}
      <div style={{ background: C.bg, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: '2.5rem 1.5rem', textAlign: 'center', marginTop: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: C.navy, margin: '0 0 0.6rem' }}>Werden Sie Teil von CapitalMatch</h2>
        <p style={{ color: C.muted, fontSize: '0.95rem', maxWidth: 560, margin: '0 auto 1.4rem', lineHeight: 1.55 }}>Registrieren Sie sich kostenlos und sehen Sie die aktuellen Mandate. Sie entscheiden selbst, welche Unterlagen Sie anfordern.</p>
        <Link to={regTo} style={{ ...btn, background: C.accent, color: '#fff' }}>Jetzt kostenlos registrieren <ArrowRight size={18} /></Link>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '1.5rem', textAlign: 'center', color: C.muted, fontSize: '0.78rem' }}>
        Phalanx GmbH · M&A und Corporate Finance · <a href="https://www.phalanx.de" style={{ color: C.accent }}>www.phalanx.de</a>
        {' · '}<Link to="/datenschutz" style={{ color: C.accent }}>Datenschutz</Link>
      </div>
    </div>
  );
}
