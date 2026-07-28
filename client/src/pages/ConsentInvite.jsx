import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { ShieldCheck, CheckCircle, AlertCircle } from 'lucide-react';

const C = { navy: '#0D1B36', accent: '#1D4E89', steel: '#29ABE2', bg: '#F4F8FC', card: '#FFFFFF', border: '#DDE8F3', text: '#0F172A', muted: '#64748B' };
const INPUT = { width: '100%', padding: '0.6rem 0.8rem', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' };
const LABEL = { display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#333', marginBottom: '0.3rem' };

export default function ConsentInvite() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [inv, setInv] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [form, setForm] = useState({
    salutation: '', title: '', first_name: '', last_name: '', company: '', position: '', mobile: '', password: '',
    linkedin_url: '', interest: '', buyer_type: '', succession_type: '',
    industries: '', regions: '', deal_types: '', investment_focus: '',
  });

  const load = useCallback(async () => {
    if (!token) { setErr('Kein Token gefunden.'); setLoading(false); return; }
    try {
      const d = await api.get(`/crm/invite/${token}`);
      setInv(d);
      // Namen aus dem CRM vorbelegen, Interesse vorbelegen falls bekannt
      setForm(f => ({
        ...f,
        ...(d.name ? { first_name: d.name.split(' ').slice(0, -1).join(' '), last_name: d.name.split(' ').slice(-1)[0] } : {}),
        ...(d.suggested_role ? { interest: d.suggested_role } : {}),
      }));
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }, [token]);
  useEffect(() => { load(); }, [load]);

  async function giveConsent() {
    setBusy(true); setErr('');
    try { await api.post(`/crm/invite/${token}/consent`, { accepted: true }); await load(); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }
  async function decline() {
    if (!window.confirm('Möchten Sie der Kontaktaufnahme widersprechen? Wir werden Sie dann nicht erneut anschreiben.')) return;
    setBusy(true);
    try { await api.post(`/crm/invite/${token}/decline`, {}); await load(); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }
  async function register(e) {
    e.preventDefault();
    if (!form.interest) { setErr('Bitte wählen Sie, ob Sie kaufen/investieren oder verkaufen möchten.'); return; }
    setBusy(true); setErr('');
    const toArr = (s) => String(s || '').split(',').map(x => x.trim()).filter(Boolean);
    const payload = {
      ...form,
      industries: toArr(form.industries),
      regions: toArr(form.regions),
      deal_types: toArr(form.deal_types),
    };
    try {
      const d = await api.post(`/crm/invite/${token}/register`, payload);
      localStorage.setItem('phalanx_token', d.token);
      window.location.href = '/projekte';
    } catch (e) { setErr(e.message); setBusy(false); }
  }
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const card = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '2rem', boxShadow: '0 2px 12px rgba(13,27,54,0.06)' };

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center', color: C.muted }}>Einladung wird geprüft…</div>;

  if (!inv) return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '3rem 1.5rem' }}>
      <div style={card}>
        <div style={{ display: 'flex', gap: '0.7rem', alignItems: 'center', color: '#991b1b' }}><AlertCircle size={20} /> <strong>Einladung nicht verfügbar</strong></div>
        <p style={{ color: C.muted, fontSize: '0.88rem', marginTop: '0.75rem' }}>{err}</p>
        <Link to="/" style={{ color: C.accent, fontSize: '0.85rem', fontWeight: 600 }}>Zur Startseite</Link>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 660, margin: '0 auto', padding: '3rem 1.5rem' }}>
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
          <ShieldCheck size={22} color={C.accent} />
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: C.navy, margin: 0 }}>Einladung zu CapitalMatch</h1>
        </div>
        <p style={{ fontSize: '0.88rem', color: C.text, lineHeight: 1.7 }}>
          <strong>{inv.inviter}</strong> lädt Sie zu CapitalMatch ein: der Plattform, über die die Phalanx GmbH ihre
          M&A-Mandate vertraulich bereitstellt: anonymisierte Kurzprofile, Unterlagen nach NDA, Datenraum und direkte
          Kommunikation an einem Ort.
        </p>
        {inv.message && (
          <div style={{ background: '#F4F8FC', borderLeft: `3px solid ${C.steel}`, padding: '0.7rem 1rem', fontSize: '0.85rem', color: '#333', margin: '0.75rem 0' }}>{inv.message}</div>
        )}

        {err && <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', borderRadius: 8, padding: '0.7rem 0.9rem', fontSize: '0.83rem', margin: '0.75rem 0' }}>{err}</div>}

        {/* Bereits abgelehnt / abgelaufen */}
        {['declined', 'revoked'].includes(inv.status) && (
          <div style={{ background: '#f1f5f9', borderRadius: 8, padding: '1rem', fontSize: '0.87rem', color: '#334155' }}>
            Ihr Widerspruch wurde vermerkt. Wir werden Sie nicht erneut kontaktieren.
          </div>
        )}
        {inv.status === 'expired' && (
          <div style={{ background: '#fef3c7', borderRadius: 8, padding: '1rem', fontSize: '0.87rem', color: '#92400e' }}>
            Diese Einladung ist abgelaufen. Bitte fordern Sie eine neue an.
          </div>
        )}
        {inv.status === 'registered' && (
          <div style={{ background: '#d1fae5', borderRadius: 8, padding: '1rem', fontSize: '0.87rem', color: '#065f46' }}>
            <CheckCircle size={15} style={{ verticalAlign: -2 }} /> Ihr Konto wurde bereits angelegt. <Link to="/login" style={{ color: '#065f46', fontWeight: 700 }}>Zur Anmeldung</Link>
          </div>
        )}

        {/* Schritt 1: Einwilligung (Double-Opt-in) */}
        {['invited', 'opened'].includes(inv.status) && (
          <div style={{ marginTop: '1.25rem' }}>
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '1.1rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: C.muted, letterSpacing: '0.05em', marginBottom: '0.6rem' }}>
                SCHRITT 1: EINWILLIGUNG (DSGVO)
              </div>
              <p style={{ fontSize: '0.84rem', color: C.text, lineHeight: 1.7, margin: 0 }}>
                Bevor wir ein Konto für Sie anlegen oder Ihnen Mandatsinformationen zusenden, benötigen wir Ihre
                ausdrückliche Einwilligung. Ohne Ihre Bestätigung geschieht <strong>nichts</strong>.
              </p>
              <label style={{ display: 'flex', gap: '0.7rem', alignItems: 'flex-start', margin: '0.9rem 0 0', cursor: 'pointer' }}>
                <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} style={{ marginTop: 4, width: 16, height: 16, flexShrink: 0 }} />
                <span style={{ fontSize: '0.83rem', color: '#333', lineHeight: 1.6 }}>
                  Ich willige ein, dass die Phalanx GmbH meine Kontaktdaten (<strong>{inv.email}</strong>) speichert und mich
                  im Rahmen von CapitalMatch zu M&A-Mandaten und passenden Transaktionsgelegenheiten kontaktiert.
                  Ich kann diese Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen, per E-Mail oder direkt in
                  meinem Profil. Es gilt die <Link to="/datenschutz" target="_blank" style={{ color: C.accent }}>Datenschutzerklärung</Link>.
                </span>
              </label>
              <div style={{ fontSize: '0.7rem', color: C.muted, marginTop: '0.6rem' }}>
                Einwilligungstext-Version {inv.consent_version} · Ihre Bestätigung wird mit Zeitpunkt revisionssicher protokolliert.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              <button onClick={giveConsent} disabled={!accepted || busy} style={{
                background: accepted ? C.navy : '#cbd5e1', color: '#fff', border: 'none', borderRadius: 8,
                padding: '0.75rem 1.5rem', fontWeight: 700, fontSize: '0.9rem', cursor: accepted ? 'pointer' : 'default',
              }}>
                {busy ? 'Wird bestätigt…' : 'Einwilligung bestätigen'}
              </button>
              <button onClick={decline} disabled={busy} style={{ background: '#fff', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0.75rem 1.25rem', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}>
                Nicht kontaktieren
              </button>
            </div>
          </div>
        )}

        {/* Schritt 2: Konto anlegen (erst nach Einwilligung) */}
        {inv.status === 'consented' && (
          <form onSubmit={register} style={{ marginTop: '1.25rem' }}>
            <div style={{ background: '#d1fae5', borderRadius: 8, padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#065f46', marginBottom: '1rem' }}>
              <CheckCircle size={15} style={{ verticalAlign: -2 }} /> Einwilligung bestätigt: danke! Legen Sie jetzt Ihr Konto an.
            </div>
            {inv.has_account ? (
              <div style={{ fontSize: '0.87rem', color: C.text }}>
                Für <strong>{inv.email}</strong> besteht bereits ein Konto. <Link to="/login" style={{ color: C.accent, fontWeight: 700 }}>Bitte melden Sie sich an.</Link>
              </div>
            ) : (
              <>
                {/* Interesse: die zentrale Weiche */}
                <label style={LABEL}>Ich interessiere mich als *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.7rem', marginBottom: '1rem' }}>
                  {[['buyer', 'Käufer / Investor', 'Ich suche Unternehmen oder Beteiligungen'],
                    ['seller', 'Verkäufer / Kapitalsuchend', 'Ich möchte verkaufen oder Kapital aufnehmen']].map(([val, t, sub]) => (
                    <button type="button" key={val} onClick={() => setForm(f => ({ ...f, interest: val }))}
                      style={{ textAlign: 'left', padding: '0.7rem 0.85rem', borderRadius: 8, cursor: 'pointer',
                        border: `1.5px solid ${form.interest === val ? C.accent : C.border}`,
                        background: form.interest === val ? '#EDF4FA' : '#fff' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: C.navy }}>{t}</div>
                      <div style={{ fontSize: '0.74rem', color: C.muted, marginTop: 2 }}>{sub}</div>
                    </button>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.7rem' }}>
                  <div><label style={LABEL}>Anrede *</label>
                    <select value={form.salutation} onChange={set('salutation')} required style={INPUT}>
                      <option value="">Bitte wählen</option><option>Herr</option><option>Frau</option><option>Divers</option>
                    </select>
                  </div>
                  <div><label style={LABEL}>Titel</label><input value={form.title} onChange={set('title')} style={INPUT} /></div>
                  <div><label style={LABEL}>Vorname *</label><input value={form.first_name} onChange={set('first_name')} required style={INPUT} /></div>
                  <div><label style={LABEL}>Nachname *</label><input value={form.last_name} onChange={set('last_name')} required style={INPUT} /></div>
                  <div><label style={LABEL}>Unternehmen</label><input value={form.company} onChange={set('company')} style={INPUT} /></div>
                  <div><label style={LABEL}>Position</label><input value={form.position} onChange={set('position')} style={INPUT} /></div>
                  <div><label style={LABEL}>Mobilnummer *</label><input value={form.mobile} onChange={set('mobile')} required placeholder="+49 …" style={INPUT} /></div>
                  <div><label style={LABEL}>Passwort * (min. 8)</label><input type="password" value={form.password} onChange={set('password')} required minLength={8} style={INPUT} /></div>
                  <div style={{ gridColumn: '1 / -1' }}><label style={LABEL}>LinkedIn (optional)</label><input value={form.linkedin_url} onChange={set('linkedin_url')} placeholder="https://linkedin.com/in/…" style={INPUT} /></div>
                </div>

                {/* Käuferprofil (optional, schnell) */}
                {form.interest === 'buyer' && (
                  <div style={{ marginTop: '1rem', padding: '0.9rem 1rem', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.8rem', color: C.navy, marginBottom: '0.6rem' }}>Ihr Investitionsfokus (optional)</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.7rem' }}>
                      <div><label style={LABEL}>Käufertyp</label>
                        <select value={form.buyer_type} onChange={set('buyer_type')} style={INPUT}>
                          <option value="">Bitte wählen</option>
                          <option value="strategic">Stratege</option>
                          <option value="financial">Finanzinvestor / PE</option>
                          <option value="business_angel">Business Angel</option>
                          <option value="venture_capital">Venture Capital</option>
                          <option value="family_office">Family Office</option>
                          <option value="successor">Nachfolger / MBI / MBO</option>
                          <option value="private">Privat</option>
                          <option value="advisor_mandate">Berater mit Mandat</option>
                        </select>
                      </div>
                      {form.buyer_type === 'successor' ? (
                        <div><label style={LABEL}>Nachfolge-Interesse</label>
                          <select value={form.succession_type} onChange={set('succession_type')} style={INPUT}>
                            <option value="">Bitte wählen</option>
                            <option value="mit_beteiligung">Mit Kapitalbeteiligung</option>
                            <option value="ohne_beteiligung">Ohne Beteiligung (operative Führung)</option>
                          </select>
                        </div>
                      ) : (
                        <div><label style={LABEL}>Ticket / Umsatzband</label><input value={form.deal_types} onChange={set('deal_types')} placeholder="z. B. 1-5 Mio." style={INPUT} /></div>
                      )}
                      <div><label style={LABEL}>Wunschbranchen</label><input value={form.industries} onChange={set('industries')} placeholder="Komma-getrennt" style={INPUT} /></div>
                      <div><label style={LABEL}>Regionen</label><input value={form.regions} onChange={set('regions')} placeholder="z. B. DACH, Bayern" style={INPUT} /></div>
                      <div style={{ gridColumn: '1 / -1' }}><label style={LABEL}>Stichworte / Fokus</label><textarea value={form.investment_focus} onChange={set('investment_focus')} rows={2} placeholder="Worauf achten Sie besonders?" style={{ ...INPUT, resize: 'vertical' }} /></div>
                    </div>
                  </div>
                )}

                {/* Verkäufer-/Vorhaben-Angaben (optional) */}
                {form.interest === 'seller' && (
                  <div style={{ marginTop: '1rem', padding: '0.9rem 1rem', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.8rem', color: C.navy, marginBottom: '0.6rem' }}>Ihr Vorhaben (optional)</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.7rem' }}>
                      <div><label style={LABEL}>Branche</label><input value={form.industries} onChange={set('industries')} placeholder="z. B. Maschinenbau" style={INPUT} /></div>
                      <div><label style={LABEL}>Umsatzband</label><input value={form.deal_types} onChange={set('deal_types')} placeholder="z. B. 5-10 Mio." style={INPUT} /></div>
                      <div style={{ gridColumn: '1 / -1' }}><label style={LABEL}>Anlass und Vorhaben</label><textarea value={form.investment_focus} onChange={set('investment_focus')} rows={2} placeholder="Nachfolge, Wachstum, Kapitalbedarf …" style={{ ...INPUT, resize: 'vertical' }} /></div>
                    </div>
                  </div>
                )}

                <button type="submit" disabled={busy} style={{ marginTop: '1rem', width: '100%', background: C.navy, color: '#fff', border: 'none', borderRadius: 8, padding: '0.8rem', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
                  {busy ? 'Konto wird angelegt…' : 'Konto anlegen'}
                </button>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
