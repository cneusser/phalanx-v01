import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock, Users, FileText, ChevronRight, CheckCircle, Building2, TrendingUp, Eye } from 'lucide-react';

const C = { navy: '#1B3A5C', gold: '#C8A97E', bg: '#F5F3EF', darkBg: '#EAE7E0' };

const FeatureCard = ({ icon: Icon, title, text }) => (
  <div style={{ background: '#fff', borderRadius: 12, padding: '1.75rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e8e4dc' }}>
    <div style={{ width: 48, height: 48, background: `${C.navy}10`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
      <Icon size={22} color={C.navy} />
    </div>
    <h3 style={{ fontWeight: 600, color: C.navy, marginBottom: '0.5rem', fontSize: '1rem' }}>{title}</h3>
    <p style={{ color: '#666', fontSize: '0.875rem', lineHeight: 1.6 }}>{text}</p>
  </div>
);

const StatBox = ({ value, label }) => (
  <div style={{ textAlign: 'center' }}>
    <div style={{ fontSize: '2.2rem', fontWeight: 700, color: C.gold }}>{value}</div>
    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginTop: '0.25rem' }}>{label}</div>
  </div>
);

export default function Landing() {
  return (
    <div>
      {/* Hero */}
      <section style={{ background: `linear-gradient(135deg, ${C.navy} 0%, #243f65 100%)`, color: '#fff', padding: '5rem 1.5rem 4rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-block', background: `${C.gold}20`, border: `1px solid ${C.gold}40`, borderRadius: 20, padding: '0.35rem 0.9rem', fontSize: '0.78rem', color: C.gold, letterSpacing: '0.08em', marginBottom: '1.5rem' }}>
              VERTRAULICH · PROFESSIONELL · DISKRET
            </div>
            <h1 style={{ fontSize: '2.6rem', fontWeight: 700, lineHeight: 1.2, marginBottom: '1.25rem' }}>
              Der vertrauliche Marktplatz für Unternehmens­transaktionen
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: '1.05rem', lineHeight: 1.7, marginBottom: '2rem' }}>
              Phalanx verbindet Unternehmensverkäufer und qualifizierte Käufer in einem geschützten, professionellen Umfeld. Diskret. Strukturiert. Zuverlässig.
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <Link to="/projekte" style={{ background: C.gold, color: C.navy, padding: '0.75rem 1.75rem', borderRadius: 8, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Transaktionen ansehen <ChevronRight size={16} />
              </Link>
              <Link to="/registrieren" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', padding: '0.75rem 1.75rem', borderRadius: 8, fontWeight: 600, textDecoration: 'none' }}>
                Als Käufer registrieren
              </Link>
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, padding: '2rem' }}>
            {[
              { icon: Shield, text: 'DSGVO-konforme Datenverarbeitung' },
              { icon: Lock, text: 'Verschlüsselte Dokumentenübertragung' },
              { icon: FileText, text: 'NDA-geschützter Informationszugang' },
              { icon: Eye, text: 'Vollständiger Audit-Trail' },
              { icon: Users, text: 'Verifiziertierte Käuferprofile' },
              { icon: Building2, text: 'EU-Hosting, keine US-Cloud' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <Icon size={16} color={C.gold} />
                <span style={{ color: 'rgba(255,255,255,0.82)', fontSize: '0.875rem' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ background: C.navy, padding: '2.5rem 1.5rem', borderTop: `3px solid ${C.gold}` }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2rem' }}>
          <StatBox value="12+" label="Aktive Transaktionen" />
          <StatBox value="€ 1,2 Mrd." label="Transaktionsvolumen" />
          <StatBox value="150+" label="Qualifizierte Käufer" />
          <StatBox value="98%" label="Vertraulichkeitsrate" />
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '5rem 1.5rem', background: C.bg }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 700, color: C.navy, marginBottom: '0.75rem' }}>Warum Phalanx?</h2>
            <p style={{ color: '#666', maxWidth: 560, margin: '0 auto', lineHeight: 1.7 }}>
              Wir kombinieren M&A-Expertise mit moderner Technologie für einen sicheren und effizienten Transaktionsprozess.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
            <FeatureCard icon={Shield} title="Maximale Vertraulichkeit" text="Alle Projektdaten werden anonymisiert. Detailinformationen sind nur nach Login, Identitätsprüfung und NDA-Freigabe zugänglich." />
            <FeatureCard icon={Users} title="Qualifizierte Käufer" text="Registrierte Interessenten werden durch Phalanx geprüft. Nur relevante Käufer erhalten Zugang zu Projektdetails." />
            <FeatureCard icon={TrendingUp} title="Strukturierter Prozess" text="Von der ersten Anfrage über das NDA bis zur Due-Diligence – alles in einem strukturierten, transparenten Workflow." />
            <FeatureCard icon={FileText} title="Professionelle Begleitung" text="Unser erfahrenes M&A-Team begleitet jede Transaktion persönlich und steht für Fragen jederzeit zur Verfügung." />
          </div>
        </div>
      </section>

      {/* Process */}
      <section style={{ padding: '5rem 1.5rem', background: C.darkBg }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 700, color: C.navy, textAlign: 'center', marginBottom: '3rem' }}>Wie es funktioniert</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
            {[
              { step: '01', title: 'Registrieren', text: 'Erstellen Sie Ihr Käuferprofil mit Ihren Suchkriterien und Investitionsinteressen.' },
              { step: '02', title: 'Projekte entdecken', text: 'Durchsuchen Sie anonymisierte Projektteaser und finden Sie passende Transaktionen.' },
              { step: '03', title: 'NDA anfordern', text: 'Fordern Sie für interessante Projekte eine Vertraulichkeits­vereinbarung an.' },
              { step: '04', title: 'Detailinformationen', text: 'Nach Freigabe erhalten Sie Zugang zum Informationsmemorandum und Finanzdaten.' },
            ].map(({ step, title, text }) => (
              <div key={step} style={{ textAlign: 'center' }}>
                <div style={{ width: 52, height: 52, background: C.navy, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: C.gold, fontWeight: 700, fontSize: '0.9rem' }}>{step}</div>
                <h3 style={{ fontWeight: 600, color: C.navy, marginBottom: '0.5rem' }}>{title}</h3>
                <p style={{ color: '#666', fontSize: '0.875rem', lineHeight: 1.6 }}>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: C.navy, padding: '4rem 1.5rem', textAlign: 'center' }}>
        <h2 style={{ color: '#fff', fontSize: '1.8rem', fontWeight: 700, marginBottom: '1rem' }}>Bereit für Ihren nächsten Schritt?</h2>
        <p style={{ color: 'rgba(255,255,255,0.72)', marginBottom: '2rem', maxWidth: 500, margin: '0 auto 2rem' }}>
          Registrieren Sie sich kostenlos und erhalten Sie Zugang zu exklusiven Transaktionsmandaten.
        </p>
        <Link to="/registrieren" style={{ background: C.gold, color: C.navy, padding: '0.9rem 2.5rem', borderRadius: 8, fontWeight: 700, textDecoration: 'none', fontSize: '1rem' }}>
          Jetzt kostenlos registrieren
        </Link>
      </section>

      {/* Footer */}
      <footer style={{ background: '#111', color: 'rgba(255,255,255,0.5)', padding: '2rem 1.5rem', textAlign: 'center', fontSize: '0.8rem' }}>
        <div>© 2025 Phalanx GmbH · Alle Rechte vorbehalten · <Link to="/datenschutz" style={{ color: C.gold, textDecoration: 'none' }}>Datenschutz</Link> · <Link to="/impressum" style={{ color: C.gold, textDecoration: 'none' }}>Impressum</Link></div>
      </footer>
    </div>
  );
}
