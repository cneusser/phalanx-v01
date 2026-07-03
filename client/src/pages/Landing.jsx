import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock, Users, FileText, ChevronRight, Building2, TrendingUp, Eye } from 'lucide-react';
import CapitalMatchLogo from '../components/CapitalMatchLogo';

const API = import.meta.env.VITE_API_URL || '';

const C = {
  navy:    '#1A4D8A',   // CapitalMatch dark blue
  accent:  '#29ABE2',   // CapitalMatch light blue
  steel:   '#29ABE2',
  heroBg:  '#0C2C5F',   // Hero deep navy
  bg:      '#F4F8FC',
  card:    '#FFFFFF',
  border:  '#DDE8F3',
  text:    '#0F172A',
  muted:   '#64748B',
};

const FeatureCard = ({ icon: Icon, title, text }) => (
  <div style={{
    background: C.card,
    borderRadius: 6,
    padding: '1.75rem',
    border: `1px solid ${C.border}`,
  }}>
    <div style={{
      width: 44, height: 44,
      background: `${C.navy}0f`,
      borderRadius: 6,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      marginBottom: '1rem',
    }}>
      <Icon size={20} color={C.navy} />
    </div>
    <h3 style={{ fontWeight: 700, color: C.text, marginBottom: '0.5rem', fontSize: '0.95rem' }}>{title}</h3>
    <p style={{ color: C.muted, fontSize: '0.875rem', lineHeight: 1.65 }}>{text}</p>
  </div>
);

const StatBox = ({ value, label, sublabel }) => (
  <div style={{ textAlign: 'center' }}>
    <div style={{ fontSize: '2.2rem', fontWeight: 700, color: C.accent, lineHeight: 1 }}>{value}</div>
    <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem', fontWeight: 600, marginTop: '0.3rem' }}>{label}</div>
    {sublabel && <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', marginTop: '0.15rem' }}>{sublabel}</div>}
  </div>
);

// Initialen-Avatar für Projektkacheln
function ProjectAvatar({ name, color }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
  return (
    <div style={{
      width: 44, height: 44, borderRadius: 6,
      background: color || `${C.navy}12`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      {initials ? (
        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: C.navy }}>{initials}</span>
      ) : (
        <Building2 size={18} color={C.navy} />
      )}
    </div>
  );
}

// Kachel für ein Mandat — Daten kommen aus der API, nichts hartkodiert
function MandateTile({ p }) {
  const isStartup = p.mandate_type === 'fundraising';
  const metrics = isStartup
    ? [['RUNDE', p.investment_needed], ['STAKE', p.equity_stake], ['POST-M.', p.post_money_valuation]]
    : [['UMSATZ', p.revenue_band], ['EBITDA', p.ebitda_band]];

  return (
    <div style={{ background: C.card, borderRadius: 6, padding: '1.75rem', border: `1px solid ${C.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <span style={{ background: isStartup ? '#EDE9FE' : '#EDF4FA', color: isStartup ? '#5B21B6' : C.navy, padding: '0.2rem 0.55rem', borderRadius: 6, fontSize: '0.68rem', fontWeight: 700 }}>
          {isStartup ? 'Fundraising' : 'M&A'}
        </span>
        <span style={{ background: '#FEF3C7', color: '#92400E', padding: '0.2rem 0.55rem', borderRadius: 6, fontSize: '0.68rem', fontWeight: 700 }}>
          {p.stage || p.deal_type}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
        {p.has_image === 1
          ? <img src={`${API}/api/projects/${p.id}/image`} alt="" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, border: `1px solid ${C.border}`, flexShrink: 0 }} />
          : <ProjectAvatar name={p.codename} color={`${C.accent}18`} />}
        <div>
          <div style={{ fontWeight: 700, color: C.text, fontSize: '0.97rem' }}>{p.codename}</div>
          <div style={{ fontSize: '0.73rem', color: C.muted }}>
            {[p.industry, p.location_city || p.region].filter(Boolean).join(' · ')}
          </div>
        </div>
      </div>
      <p style={{ fontSize: '0.83rem', color: '#444', lineHeight: 1.55, marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {p.short_description}
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.1rem' }}>
        {metrics.map(([l, v]) => (
          <div key={l} style={{ flex: 1, background: C.bg, borderRadius: 6, padding: '0.45rem 0.5rem', textAlign: 'center', border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: '0.6rem', color: C.muted, fontWeight: 700, marginBottom: '0.1rem' }}>{l}</div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: C.text }}>{v || '—'}</div>
          </div>
        ))}
      </div>
      <Link to="/projekte" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', background: C.navy, color: '#fff', padding: '0.55rem', borderRadius: 6, textDecoration: 'none', fontSize: '0.82rem', fontWeight: 600 }}>
        Teaser ansehen <ChevronRight size={13} />
      </Link>
    </div>
  );
}

export default function Landing() {
  const [platformStats, setPlatformStats] = useState(null);
  const [mandates, setMandates] = useState([]);

  useEffect(() => {
    fetch(`${API}/api/projects/stats`)
      .then(r => r.json())
      .then(d => { if (d.success) setPlatformStats(d.data); })
      .catch(() => {/* silent fallback to defaults */});

    // Aktuelle Mandate dynamisch laden (anonymisierte Teaser-Daten aus der DB)
    fetch(`${API}/api/projects`)
      .then(r => r.json())
      .then(d => { if (d.success) setMandates((d.data.projects || []).slice(0, 2)); })
      .catch(() => {/* Sektion wird bei Fehler ausgeblendet */});
  }, []);

  // Fallback values while loading or on error
  const stats = platformStats || { ma: { active: 0 }, fundraising: { active: 0 }, investors: 0 };

  return (
    <div style={{ background: C.bg }}>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section style={{
        background: C.heroBg,
        backgroundImage: `radial-gradient(circle, rgba(41,171,226,0.07) 1px, transparent 1px)`,
        backgroundSize: '28px 28px',
        color: '#fff',
        padding: '5rem 1.5rem 4rem',
      }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto',
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: '3rem', alignItems: 'center',
        }}>
          <div>
            {/* Badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              background: 'rgba(41,171,226,0.12)',
              border: '1px solid rgba(41,171,226,0.3)',
              borderRadius: 6, padding: '0.35rem 0.9rem',
              fontSize: '0.75rem', color: C.accent,
              letterSpacing: '0.09em', marginBottom: '1.5rem',
              fontWeight: 600,
            }}>
              VERTRAULICH · PROFESSIONELL · DISKRET
            </div>

            {/* Logo mit Claim im Hero */}
            <div style={{ marginBottom: '1.5rem' }}>
              <CapitalMatchLogo textSize={42} white={true} showClaim={true} />
            </div>

            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '1.05rem', lineHeight: 1.7, marginBottom: '2rem' }}>
              Der Marktplatz für M&A-Transaktionen und Startup-Finanzierung —
              vom ersten Kontakt bis zum Signing. Diskret. Strukturiert. Zuverlässig.
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <Link to="/projekte" style={{
                background: C.accent, color: '#fff',
                padding: '0.75rem 1.75rem', borderRadius: 6,
                fontWeight: 700, textDecoration: 'none',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                letterSpacing: '0.01em',
              }}>
                Zum Marktplatz <ChevronRight size={16} />
              </Link>
              <Link to="/registrieren" style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.22)',
                color: '#fff',
                padding: '0.75rem 1.75rem', borderRadius: 6,
                fontWeight: 600, textDecoration: 'none',
              }}>
                Als Investor registrieren
              </Link>
            </div>
          </div>

          {/* Feature-Box rechts */}
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(41,171,226,0.18)',
            borderRadius: 8, padding: '2rem',
          }}>
            <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <CapitalMatchLogo textSize={20} white={true} compact={true} />
              <div style={{ fontSize: '0.72rem', color: 'rgba(41,171,226,0.8)', marginLeft: '0.25rem', marginTop: '0.1rem' }}>
                eine Marke der Phalanx GmbH
              </div>
            </div>
            {[
              { icon: Shield, text: 'DSGVO-konforme Datenverarbeitung' },
              { icon: Lock, text: 'Verschlüsselte Dokumentenübertragung' },
              { icon: FileText, text: 'NDA-geschützter Informationszugang' },
              { icon: Eye, text: 'Vollständiger Audit-Trail' },
              { icon: Users, text: 'Verifizierte Investorenprofile' },
              { icon: Building2, text: 'EU-Hosting, keine US-Cloud' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.6rem 0',
                borderBottom: '1px solid rgba(41,171,226,0.1)',
              }}>
                <Icon size={15} color={C.accent} />
                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats bar (dynamisch) ────────────────────────────── */}
      <section style={{
        background: C.navy,
        padding: '2.5rem 1.5rem',
        borderTop: `2px solid ${C.accent}`,
      }}>
        <div style={{
          maxWidth: 1000, margin: '0 auto',
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2rem',
        }}>
          <StatBox
            value={stats.ma.active > 0 ? `${stats.ma.active}` : '—'}
            label="M&A-Mandate"
            sublabel="Unternehmensverkauf"
          />
          <StatBox
            value={stats.fundraising.active > 0 ? `${stats.fundraising.active}` : '—'}
            label="Fundraising-Mandate"
            sublabel="Seed · Angel · Series-A"
          />
          <StatBox
            value={stats.investors > 0 ? `${stats.investors}+` : '—'}
            label="Qualifizierte Investoren"
            sublabel="geprüft & freigegeben"
          />
          <StatBox
            value="100%"
            label="Vertraulichkeit"
            sublabel="NDA · DSGVO · EU-Hosting"
          />
        </div>
      </section>

      {/* ── Aktuelle Mandate ─────────────────────────────────── */}
      <section style={{ padding: '4rem 1.5rem', background: C.card }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: C.accent, fontWeight: 700, letterSpacing: '0.1em', marginBottom: '0.4rem' }}>
                AKTUELLE MANDATE
              </div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: C.text }}>Ausgewählte Finanzierungsopportunitäten</h2>
            </div>
            <Link to="/projekte" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: C.navy, textDecoration: 'none', fontWeight: 600, fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
              Alle Mandate <ChevronRight size={14} />
            </Link>
          </div>

          {mandates.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {mandates.map(p => <MandateTile key={p.id} p={p} />)}
            </div>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: C.muted, fontSize: '0.875rem', background: C.bg, borderRadius: 6, border: `1px solid ${C.border}` }}>
              Aktuelle Mandate werden geladen …
            </div>
          )}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section style={{ padding: '5rem 1.5rem', background: C.bg }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 700, color: C.text, marginBottom: '0.75rem' }}>Warum CapitalMatch?</h2>
            <p style={{ color: C.muted, maxWidth: 560, margin: '0 auto', lineHeight: 1.7 }}>
              Wir kombinieren M&A-Expertise mit moderner Technologie für einen sicheren und effizienten Transaktionsprozess — von der Seed-Runde bis zur Nachfolge.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
            <FeatureCard icon={TrendingUp} title="Startup-Finanzierung"
              text="Seed-, Angel- und Series-A-Mandate von geprüften Gründerteams. Investoren erhalten nach NDA vollständige CIMs und Finanzpläne." />
            <FeatureCard icon={Building2} title="M&A-Transaktionen"
              text="Nachfolge, MBO, MBI und Wachstumskapital für den Mittelstand — diskret, anonymisiert und strukturiert begleitet." />
            <FeatureCard icon={Shield} title="Maximale Vertraulichkeit"
              text="Alle Mandate NDA-geschützt. Detailinformationen nur nach Registrierung, Identitätsprüfung und Freigabe." />
            <FeatureCard icon={FileText} title="Fundraising Advisory"
              text="Phalanx GmbH begleitet Mandanten von der Teaser-Erstellung über den Investorenprozess bis zum Closing — persönlich und professionell." />
          </div>
        </div>
      </section>

      {/* ── Prozess ──────────────────────────────────────────── */}
      <section style={{ padding: '5rem 1.5rem', background: C.lightBg || '#EBF7FC' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 700, color: C.text, textAlign: 'center', marginBottom: '3rem' }}>
            Wie es funktioniert
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
            {[
              { step: '01', title: 'Registrieren', text: 'Erstellen Sie Ihr Investorenprofil mit Ihren Suchkriterien und Investitionsinteressen.' },
              { step: '02', title: 'Projekte entdecken', text: 'Durchsuchen Sie Projektteaser und finden Sie passende Transaktionen und Finanzierungsrunden.' },
              { step: '03', title: 'NDA anfordern', text: 'Fordern Sie für interessante Projekte eine Vertraulichkeitsvereinbarung an.' },
              { step: '04', title: 'Detailinformationen', text: 'Nach Freigabe erhalten Sie Zugang zum Informationsmemorandum und allen Finanzdaten.' },
            ].map(({ step, title, text }) => (
              <div key={step} style={{ textAlign: 'center' }}>
                <div style={{
                  width: 52, height: 52,
                  background: C.navy, borderRadius: 6,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 1rem',
                  color: C.accent, fontWeight: 700, fontSize: '0.9rem',
                }}>
                  {step}
                </div>
                <h3 style={{ fontWeight: 700, color: C.text, marginBottom: '0.5rem' }}>{title}</h3>
                <p style={{ color: C.muted, fontSize: '0.875rem', lineHeight: 1.65 }}>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section style={{ background: C.navy, padding: '4rem 1.5rem', textAlign: 'center' }}>
        <h2 style={{ color: '#fff', fontSize: '1.8rem', fontWeight: 700, marginBottom: '1rem' }}>
          Bereit für Ihren nächsten Schritt?
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', maxWidth: 500, margin: '0 auto 2rem', lineHeight: 1.7 }}>
          Registrieren Sie sich kostenlos und erhalten Sie Zugang zu exklusiven Transaktionsmandaten — vertraulich und professionell.
        </p>
        <Link to="/registrieren" style={{
          background: C.accent, color: '#fff',
          padding: '0.9rem 2.5rem', borderRadius: 6,
          fontWeight: 700, textDecoration: 'none', fontSize: '1rem',
          letterSpacing: '0.01em',
        }}>
          Jetzt kostenlos registrieren
        </Link>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer style={{
        background: '#050E1D', color: 'rgba(255,255,255,0.4)',
        padding: '2rem 1.5rem', fontSize: '0.8rem',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <CapitalMatchLogo textSize={14} white={true} compact={true} />
            <div style={{ marginTop: '0.3rem', opacity: 0.5, fontSize: '0.72rem' }}>eine Marke der Phalanx GmbH</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            © 2026 Phalanx GmbH · Helene-Lange-Str. 28 · D-91056 Erlangen
          </div>
          <div>
            <Link to="/datenschutz" style={{ color: C.accent, textDecoration: 'none' }}>Datenschutz</Link>
            {' '}&nbsp;·&nbsp;{' '}
            <Link to="/impressum" style={{ color: C.accent, textDecoration: 'none' }}>Impressum</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
