/**
 * Fragen erfassen, die nicht über die Plattform kamen (v0.460).
 *
 * Anlass: Elf Fragen eines Interessenten, per E-Mail eingegangen. Q&A-Einträge
 * entstanden bisher nur, wenn jemand selbst auf der Plattform fragt. Für den
 * Weg, auf dem Fragen tatsächlich meistens eintreffen, gab es keine Eingabe.
 *
 * Mehrere Fragen auf einmal, weil elf Fragen sonst elf Dialoge sind. Eine
 * Zeile je Frage, Kategorie und Verantwortlicher daneben, die interne Notiz
 * deutlich abgesetzt.
 *
 * Es wird nichts versendet. Das steht auch so im Fenster, denn beim Erfassen
 * fremder Fragen ist die erste Sorge immer, ob gerade eine Mail rausgeht.
 */
import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Lock } from 'lucide-react';
import { api } from '../api/client';

const STAENDE = [
  ['open', 'offen'],
  ['in_bearbeitung', 'in Bearbeitung'],
  ['zurueckgestellt', 'zurückgestellt'],
  ['answered', 'beantwortet'],
];

const leer = () => ({ frage: '', kategorie: '', status: 'open', verantwortlich_id: '', interne_notiz: '', antwort: '' });

export default function QaErfassen({ C, onFertig, onAbbrechen }) {
  const [projekte, setProjekte] = useState([]);
  const [kategorien, setKategorien] = useState([]);
  const [team, setTeam] = useState([]);
  const [interessenten, setInteressenten] = useState([]);
  const [projectId, setProjectId] = useState('');
  const [buyerId, setBuyerId] = useState('');
  const [herkunft, setHerkunft] = useState('E-Mail');
  const [eingang, setEingang] = useState(new Date().toISOString().slice(0, 10));
  const [zeilen, setZeilen] = useState([leer()]);
  const [laeuft, setLaeuft] = useState(false);
  const [ergebnis, setErgebnis] = useState(null);
  const [fehler, setFehler] = useState('');

  useEffect(() => {
    api.get('/admin/projects').then((d) => setProjekte(d || [])).catch(() => {});
    api.get('/crm/vokabular').then((d) => setKategorien((d && d.qa_kategorien) || [])).catch(() => {});
    api.get('/admin/users').then((d) => setTeam((d || []).filter((u) => ['super_admin', 'advisor', 'tenant_owner', 'assistant', 'analyst'].includes(u.role)))).catch(() => {});
  }, []);

  useEffect(() => {
    setBuyerId(''); setInteressenten([]);
    if (!projectId) return;
    api.get(`/admin/projects/${projectId}/interests`).then((d) => setInteressenten(d || [])).catch(() => {});
  }, [projectId]);

  const aendern = (i, feld, wert) => setZeilen((z) => z.map((r, n) => (n === i ? { ...r, [feld]: wert } : r)));

  async function speichern() {
    setLaeuft(true); setFehler(''); setErgebnis(null);
    const fragen = zeilen
      .filter((z) => z.frage.trim().length >= 5)
      .map((z) => ({ ...z, verantwortlich_id: z.verantwortlich_id || null }));
    if (!fragen.length) { setFehler('Bitte mindestens eine Frage eintragen.'); setLaeuft(false); return; }
    try {
      const d = await api.post('/admin/questions', {
        project_id: Number(projectId), buyer_id: Number(buyerId),
        herkunft, eingegangen_am: eingang, fragen,
      });
      setErgebnis(d);
      if (d.angelegt && d.angelegt.length && onFertig) onFertig();
    } catch (e) { setFehler(e.message); }
    setLaeuft(false);
  }

  const IN = { width: '100%', padding: '0.4rem 0.55rem', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: '0.82rem', boxSizing: 'border-box', fontFamily: 'inherit' };
  const LBL = { fontSize: '0.68rem', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 3 };

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '1rem', marginBottom: '1rem' }}>
      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: C.navy, marginBottom: '0.3rem' }}>
        Fragen erfassen
      </div>
      <div style={{ fontSize: '0.78rem', color: C.muted, lineHeight: 1.55, marginBottom: '0.8rem' }}>
        Für Fragen, die nicht über die Plattform kamen. Es wird nichts versendet und niemand
        benachrichtigt. Alle Einträge sind nur für diesen Interessenten und für Sie sichtbar.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.6rem', marginBottom: '0.8rem' }}>
        <div>
          <div style={LBL}>Mandat</div>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} style={IN}>
            <option value="">wählen…</option>
            {projekte.map((p) => <option key={p.id} value={p.id}>{p.codename}</option>)}
          </select>
        </div>
        <div>
          <div style={LBL}>Fragesteller</div>
          <select value={buyerId} onChange={(e) => setBuyerId(e.target.value)} style={IN} disabled={!projectId}>
            <option value="">wählen…</option>
            {interessenten.map((i) => (
              <option key={i.buyer_id} value={i.buyer_id}>
                {i.buyer_name}{i.buyer_company ? ` (${i.buyer_company})` : ''}
              </option>
            ))}
          </select>
          {projectId && interessenten.length === 0 && (
            <div style={{ fontSize: '0.7rem', color: '#92400e', marginTop: 3, lineHeight: 1.45 }}>
              Zu diesem Mandat ist niemand als Interessent geführt. Eine Frage hängt am
              Nutzerkonto, nicht am CRM-Kontakt.
            </div>
          )}
        </div>
        <div>
          <div style={LBL}>Eingegangen am</div>
          <input type="date" value={eingang} onChange={(e) => setEingang(e.target.value)} style={IN} />
        </div>
        <div>
          <div style={LBL}>Herkunft</div>
          <select value={herkunft} onChange={(e) => setHerkunft(e.target.value)} style={IN}>
            <option>E-Mail</option><option>Telefon</option><option>Besprechung</option><option>Sonstiges</option>
          </select>
        </div>
      </div>

      {zeilen.map((z, i) => (
        <div key={i} style={{ border: `1px solid ${C.border}`, borderRadius: 7, padding: '0.7rem', marginBottom: '0.6rem', background: C.bg }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
            <span style={{ ...LBL, margin: 0 }}>Frage {i + 1}</span>
            {zeilen.length > 1 && (
              <button onClick={() => setZeilen((r) => r.filter((_, n) => n !== i))}
                style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 0 }}>
                <Trash2 size={14} />
              </button>
            )}
          </div>
          <textarea value={z.frage} onChange={(e) => aendern(i, 'frage', e.target.value)} rows={2}
            placeholder="Frage im Wortlaut des Interessenten" style={{ ...IN, resize: 'vertical', marginBottom: 6 }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr', gap: '0.5rem', marginBottom: 6 }}>
            <input list="qa-kategorien" value={z.kategorie} onChange={(e) => aendern(i, 'kategorie', e.target.value)}
              placeholder="Kategorie" style={IN} />
            <select value={z.status} onChange={(e) => aendern(i, 'status', e.target.value)} style={IN}>
              {STAENDE.map(([w, l]) => <option key={w} value={w}>{l}</option>)}
            </select>
            <select value={z.verantwortlich_id} onChange={(e) => aendern(i, 'verantwortlich_id', e.target.value)} style={IN}>
              <option value="">Verantwortlich…</option>
              {team.map((u) => <option key={u.id} value={u.id}>{[u.first_name, u.last_name].filter(Boolean).join(' ')}</option>)}
            </select>
          </div>
          {z.status === 'answered' && (
            <textarea value={z.antwort} onChange={(e) => aendern(i, 'antwort', e.target.value)} rows={2}
              placeholder="Antworttext. Ohne ihn lässt sich die Frage nicht als beantwortet erfassen."
              style={{ ...IN, resize: 'vertical', marginBottom: 6 }} />
          )}
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
            <Lock size={13} style={{ color: C.muted, marginTop: 7, flexShrink: 0 }} />
            <input value={z.interne_notiz} onChange={(e) => aendern(i, 'interne_notiz', e.target.value)}
              placeholder="Interne Notiz. Sieht nur Phalanx, nie der Interessent." style={IN} />
          </div>
        </div>
      ))}
      <datalist id="qa-kategorien">
        {kategorien.map((k) => <option key={k} value={k} />)}
      </datalist>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={() => setZeilen((z) => [...z, leer()])}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#fff', color: C.navy, border: `1px solid ${C.border}`, borderRadius: 6, padding: '0.45rem 0.9rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}>
          <Plus size={13} /> Weitere Frage
        </button>
        <button onClick={speichern} disabled={laeuft || !projectId || !buyerId}
          style={{ background: (!projectId || !buyerId) ? '#cbd5e1' : C.navy, color: '#fff', border: 'none', borderRadius: 6, padding: '0.45rem 1.1rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}>
          {laeuft ? 'Wird gespeichert…' : 'Erfassen, ohne zu senden'}
        </button>
        {onAbbrechen && (
          <button onClick={onAbbrechen}
            style={{ background: 'none', border: 'none', color: C.muted, fontSize: '0.82rem', cursor: 'pointer' }}>
            Abbrechen
          </button>
        )}
      </div>

      {fehler && (
        <div style={{ marginTop: '0.7rem', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 7, padding: '0.55rem 0.75rem', fontSize: '0.8rem', color: '#991b1b', lineHeight: 1.5 }}>
          {fehler}
        </div>
      )}
      {ergebnis && (
        <div style={{ marginTop: '0.7rem', background: '#ECFDF5', border: '1px solid #a7f3d0', borderRadius: 7, padding: '0.55rem 0.75rem', fontSize: '0.8rem', color: '#065f46', lineHeight: 1.55 }}>
          {ergebnis.angelegt.length} Frage(n) angelegt. {ergebnis.hinweis}
          {ergebnis.abgelehnt && ergebnis.abgelehnt.length > 0 && (
            <div style={{ marginTop: 5, color: '#92400e' }}>
              Nicht angelegt: {ergebnis.abgelehnt.map((a) => `${a.frage} (${a.grund})`).join('; ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
