import React, { useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Eye, LogOut } from 'lucide-react';

/**
 * Birdview-Banner: immer sichtbar, solange ein Admin die Plattform mit den
 * Augen eines anderen Nutzers sieht. Unübersehbar, damit niemand vergisst, in
 * wessen Ansicht er sich befindet. Der Ausstieg ist immer einen Klick entfernt.
 */
export default function BirdviewBanner() {
  const { user, endBirdview } = useAuth();
  const [busy, setBusy] = useState(false);

  if (!user || !user.impersonated_by) return null;

  const name = [user.title, user.first_name, user.last_name].filter(Boolean).join(' ');

  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 500,
      background: 'linear-gradient(90deg, #b45309, #d97706)', color: '#fff',
      padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: '1rem', flexWrap: 'wrap', boxShadow: '0 2px 10px rgba(0,0,0,0.18)',
    }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 700 }}>
        <Eye size={16} />
        Birdview: Sie sehen die Plattform als <u>{name}</u> ({user.email})
      </span>
      <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.2)', padding: '0.15rem 0.55rem', borderRadius: 20, fontWeight: 700 }}>
        schreibgeschützt
      </span>
      <button
        onClick={async () => { setBusy(true); await endBirdview(); }}
        disabled={busy}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
          background: '#fff', color: '#b45309', border: 'none', borderRadius: 7,
          padding: '0.4rem 0.9rem', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer',
        }}>
        <LogOut size={14} /> {busy ? 'Wird beendet…' : 'Zurück zu meinem Konto'}
      </button>
    </div>
  );
}
