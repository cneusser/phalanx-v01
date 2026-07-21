// ─────────────────────────────────────────────────────────────────────────────
// Deal-Funnel als eigener Bereich im Hauptmenü (v0.302).
//
// Zwei Sichten aus einer Seite:
//   · Team (Admin/Berater): das vollständige Board mit allen Werkzeugen.
//   · Verkäufer (Mandant):  der reduzierte Prozessstand seiner eigenen Mandate,
//     mit Klarname und Firma, aber ohne jede Kontaktdatei.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import DealFunnelBoard from '../components/DealFunnelBoard';
import SellerFunnel from '../components/SellerFunnel';

const C = { navy: '#0D1B36', accent: '#1D4E89', bg: '#F8FAFC', card: '#FFFFFF', border: '#E2E8F0', muted: '#64748B' };

export default function Funnel() {
  const { user, isAdmin, isSeller } = useAuth();
  const navigate = useNavigate();
  const [myProjects, setMyProjects] = useState([]);
  const [msg, setMsg] = useState('');
  const show = (t) => { setMsg(t); setTimeout(() => setMsg(''), 4000); };

  useEffect(() => {
    if (user && !isAdmin && !isSeller) navigate('/dashboard', { replace: true });
  }, [user, isAdmin, isSeller, navigate]);

  useEffect(() => {
    if (isSeller) api.get('/projects/my-projects').then(d => setMyProjects(d || [])).catch(() => {});
  }, [isSeller]);

  if (!user) return null;

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ marginBottom: '1.2rem' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: C.navy, marginBottom: '0.2rem' }}>Deal-Funnel</h1>
        <p style={{ color: C.muted, fontSize: '0.85rem' }}>
          {isAdmin
            ? 'Alle Mandate, Beteiligte und Prozessstufen an einer Stelle.'
            : 'Der Stand Ihrer Mandate: wer ist interessiert und wie weit ist der Prozess.'}
        </p>
      </div>

      {msg && (
        <div style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 8, padding: '0.7rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', color: '#065f46' }}>
          {msg}
        </div>
      )}

      {isAdmin ? (
        <DealFunnelBoard show={show} />
      ) : (
        <>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '0.9rem 1.1rem', marginBottom: '1rem', fontSize: '0.8rem', color: C.muted, lineHeight: 1.6 }}>
            Sie sehen Name und Unternehmen der Interessenten sowie deren Stand im Prozess.
            Kontaktdaten wie E-Mail und Telefon zeigen wir aus Vertraulichkeitsgründen nicht.
            Die Kommunikation läuft über die Plattform.
          </div>
          <SellerFunnel projects={myProjects} show={show} />
        </>
      )}
    </div>
  );
}
