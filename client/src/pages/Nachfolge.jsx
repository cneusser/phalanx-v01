import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Calendar, Building2, ShieldCheck, ArrowRight, CheckCircle } from 'lucide-react';

const C = {
  navy: '#1A4D8A', accent: '#29ABE2', heroBg: '#0C2C5F',
  bg: '#F4F8FC', card: '#FFFFFF', border: '#DDE8F3', text: '#0F172A', muted: '#64748B',
};

const Pillar = ({ icon: Icon, title, text }) => (
  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '1.6rem' }}>
    <div style={{ width: 44, height: 44, borderRadius: 10, background: '#EDF4FA', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.9rem' }}>
      <Icon size={22} color={C.navy} />
    </div>
    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: C.text, margin: '0 0 0.4rem' }}>{title}</h3>
    <p style={{ fontSize: '0.88rem', color: C.muted, lineHeight: 1.6, margin: 0 }}>{text}</p>
  </div>
);

const Step = ({ n, title, text }) => (
  <div style={{ display: 'flex', gap: '0.9rem', alignItems: 'flex-start' }}>
    <div style={{ flexShrink: 0, width: 30, height: 30, borderRadius: '50%', background: C.navy, color: '#fff', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{n}</div>
    <div>
      <div style={{ fontWeight: 700, color: C.text, fontSize: '0.92rem' }}>{title}</div>
      <div style={{ fontSize: '0.86rem', color: C.muted, lineHeight: 1.55 }}>{text}</div>
    </div>
  </div>
);

export default function Nachfolge() {
  return (
    <div style={{ background: C.bg, minHeight: '100vh' }}>
      {/* Hero */}
      <section style={{ background: C.heroBg, color: '#fff', padding: '4rem 1.5rem 3.5rem' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', background: 'rgba(41,171,226,0.18)', color: '#9AD6F0', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', padding: '0.3rem 0.8rem', borderRadius: 20, marginBottom: '1.2rem' }}>
            NACHFOLGE-NETZWERK
          </div>
          <h1 style={{ fontSize: '2.3rem', fontWeight: 800, lineHeight: 1.15, margin: '0 0 1rem' }}>
            Ein Unternehmen übernehmen, statt die nächste Stelle antreten
          </h1>
          <p style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, maxWidth: 680, margin: '0 auto 1.8rem' }}>
            CapitalMatch bringt Menschen mit unternehmerischem Anspruch und Übergeber zusammen, die einen Nachfolger suchen. Auf der Plattform, bei Matching-Events und im persönlichen Austausch. Für Nachfolge-Interessierte kostenfrei.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/registrieren" style={{ background: C.accent, color: '#0C2C5F', fontWeight: 700, padding: '0.75rem 1.5rem', borderRadius: 8, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              Kostenfrei registrieren <ArrowRight size={16} />
            </Link>
            <Link to="/kontakt" style={{ border: '1px solid rgba(255,255,255,0.4)', color: '#fff', fontWeight: 600, padding: '0.75rem 1.5rem', borderRadius: 8, textDecoration: 'none' }}>
              Fragen? Sprechen Sie uns an
            </Link>
          </div>
        </div>
      </section>

      {/* Für wen */}
      <section style={{ padding: '3.5rem 1.5rem 1rem' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: C.text, margin: '0 0 0.8rem' }}>Für wen ist das Netzwerk gedacht?</h2>
          <p style={{ fontSize: '0.95rem', color: C.muted, lineHeight: 1.65, maxWidth: 700, margin: '0 auto' }}>
            Für angehende Unternehmer, erfahrene Führungskräfte und Investoren, die ein Unternehmen übernehmen möchten. Ob als Geschäftsführer mit Beteiligung (MBI), im Rahmen eines Management-Buy-out (MBO) oder als Nachfolger, der selbst Kapital einbringt. Ob mit oder ohne eigene Beteiligung, Sie finden hier den passenden Weg.
          </p>
        </div>
      </section>

      {/* Drei Säulen */}
      <section style={{ padding: '2rem 1.5rem 3.5rem' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
          <Pillar icon={Building2} title="Matching auf der Plattform"
            text="Sie hinterlegen Ihr Profil und Ihre Suchkriterien. Passende Nachfolge-Situationen schlagen wir Ihnen vor, diskret und ohne dass Ihre Daten offen liegen." />
          <Pillar icon={Users} title="Matching-Events"
            text="Bei unseren Veranstaltungen lernen Sie Übergeber persönlich kennen. Ein Gespräch sagt oft mehr als jedes Exposé, gerade bei der Nachfolge." />
          <Pillar icon={Calendar} title="Veranstaltungen und Austausch"
            text="Impulse, Erfahrungsberichte und ein Netzwerk aus Menschen, die denselben Schritt gehen oder ihn schon gegangen sind." />
        </div>
      </section>

      {/* So funktioniert es */}
      <section style={{ padding: '0 1.5rem 3.5rem' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '2rem' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: C.text, margin: '0 0 1.4rem' }}>So einfach starten Sie</h2>
          <div style={{ display: 'grid', gap: '1.1rem' }}>
            <Step n="1" title="Kostenfrei registrieren" text="Sie melden sich als Nachfolge-Interessent an und wählen, ob Sie mit oder ohne Kapitalbeteiligung suchen." />
            <Step n="2" title="Profil und Suchkriterien anlegen" text="Branche, Region, Größenordnung und Ihre Erfahrung. Je klarer Ihr Profil, desto besser die Vorschläge." />
            <Step n="3" title="Passende Nachfolgen entdecken" text="Sie erhalten Vorschläge auf der Plattform und Einladungen zu Matching-Events." />
            <Step n="4" title="Ins Gespräch kommen" text="Wenn es passt, stellen wir den Kontakt zum Übergeber her und begleiten den weiteren Weg." />
          </div>
        </div>
      </section>

      {/* Kosten / Vertrauen */}
      <section style={{ padding: '0 1.5rem 4rem' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
          <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 12, padding: '1.6rem' }}>
            <CheckCircle size={22} color="#166534" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#065f46', margin: '0.6rem 0 0.4rem' }}>Kostenfrei für Nachfolge-Interessierte</h3>
            <p style={{ fontSize: '0.88rem', color: '#065f46', lineHeight: 1.6, margin: 0 }}>
              Ihre Teilnahme am Netzwerk, das Matching und die Events kosten Sie nichts. Getragen wird das Netzwerk von den Übergebern, die einen Nachfolger suchen.
            </p>
          </div>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '1.6rem' }}>
            <ShieldCheck size={22} color={C.navy} />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: C.text, margin: '0.6rem 0 0.4rem' }}>Diskret und DSGVO-konform</h3>
            <p style={{ fontSize: '0.88rem', color: C.muted, lineHeight: 1.6, margin: 0 }}>
              Ihre Daten liegen nicht offen. Sie entscheiden, wann und mit wem Sie ins Gespräch gehen. Alles läuft vertraulich über die Plattform.
            </p>
          </div>
        </div>
      </section>

      {/* Abschluss-CTA */}
      <section style={{ background: C.navy, color: '#fff', padding: '3rem 1.5rem', textAlign: 'center' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 0.7rem' }}>Machen Sie den ersten Schritt</h2>
          <p style={{ fontSize: '0.98rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, margin: '0 0 1.5rem' }}>
            Die Registrierung dauert zwei Minuten. Danach kümmern wir uns um die passenden Vorschläge.
          </p>
          <Link to="/registrieren" style={{ background: C.accent, color: '#0C2C5F', fontWeight: 700, padding: '0.8rem 1.8rem', borderRadius: 8, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            Jetzt kostenfrei dabei sein <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
