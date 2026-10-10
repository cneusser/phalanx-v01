/**
 * Zugriff prüfen: Was sieht dieser Kontakt wirklich? (v0.455)
 *
 * Anlass: „Ich bekomme bei Herrn Eder den Hinweis, dass er die Dokumente nicht
 * anklicken kann. Ich würde das gerne in seinem Blick nachvollziehen."
 *
 * Die Birdview gibt es schon, sie meldet sich als die betreffende Person an.
 * Nur scheitert sie genau an dem Fall, der hier vorliegt: Wer kein Konto hat,
 * lässt sich nicht ansehen. Diese Ansicht beantwortet deshalb die Frage
 * dahinter, und zwar auch dann, wenn es nichts zu sehen gibt.
 *
 * Gezeigt wird nicht, was die Oberfläche annimmt, sondern was der Server
 * entschieden hat. Jede Zeile hier ist ein Urteil derselben Funktionen, die
 * auch einen Klick zulassen oder abweisen. Eine zweite, freundlichere Rechnung
 * wäre wertlos: Sie würde das prüfen, was sie selbst behauptet.
 */
import React, { useState } from 'react';
import { Eye, ChevronDown, ChevronRight } from 'lucide-react';
import { api } from '../api/client';

const URTEIL = {
  laden: { text: 'Ansicht und Download', farbe: '#065f46', hg: '#ECFDF5', rand: '#a7f3d0' },
  nur_ansicht: { text: 'nur Ansicht', farbe: '#92400e', hg: '#FFFBEB', rand: '#fcd34d' },
  gesperrt: { text: 'gesperrt', farbe: '#9a3412', hg: '#FFF7ED', rand: '#fdba74' },
  unsichtbar: { text: 'unsichtbar', farbe: '#991b1b', hg: '#FEF2F2', rand: '#fca5a5' },
};

export default function ZugriffPruefen({ C, contactId, onBirdview }) {
  const [daten, setDaten] = useState(null);
  const [fehler, setFehler] = useState('');
  const [laeuft, setLaeuft] = useState(false);
  const [offen, setOffen] = useState({});
  const [erinnerung, setErinnerung] = useState(null);
  const [erinnertLaeuft, setErinnertLaeuft] = useState(false);

  async function pruefen() {
    setLaeuft(true); setFehler(''); setDaten(null); setErinnerung(null);
    try { setDaten(await api.get(`/admin/contacts/${contactId}/zugriff`)); }
    catch (e) { setFehler(e.message); }
    setLaeuft(false);
  }

  async function erinnern(senden) {
    setErinnertLaeuft(true);
    try { setErinnerung(await api.post(`/crm/contacts/${contactId}/invite/erinnern`, { senden })); }
    catch (e) { setErinnerung({ fehler: e.message }); }
    setErinnertLaeuft(false);
  }

  // Die Beschriftung nennt den Zustand, nicht das Ziel. „○ Nutzerkonto
  // vorhanden" las sich wie das Gegenteil dessen, was gemeint war.
  const pille = (gut, text) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', fontWeight: 600,
      color: gut ? '#065f46' : '#92400e', background: gut ? '#ECFDF5' : '#FFFBEB',
      border: `1px solid ${gut ? '#a7f3d0' : '#fcd34d'}`, borderRadius: 20, padding: '2px 9px' }}>
      {gut ? `✓ ${text}` : `✗ ${text}: nein`}
    </span>
  );

  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: '0.8rem', marginBottom: '0.8rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.68rem', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
          <Eye size={13} /> Zugriff prüfen
        </span>
        <button onClick={pruefen} disabled={laeuft}
          style={{ background: C.navy, color: '#fff', border: 'none', borderRadius: 7, padding: '0.35rem 0.8rem', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}>
          {laeuft ? 'Wird geprüft…' : 'Mit seinen Augen ansehen'}
        </button>
      </div>

      <div style={{ fontSize: '0.72rem', color: C.muted, lineHeight: 1.5, marginTop: '0.4rem' }}>
        Zeigt Mandat für Mandat, was diese Person sehen und laden darf, und wo es hakt. Es wird nichts
        verändert und nichts an sie gesendet.
      </div>

      {fehler && (
        <div style={{ marginTop: '0.6rem', fontSize: '0.78rem', color: '#991b1b', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '0.55rem 0.7rem' }}>
          {fehler}
        </div>
      )}

      {daten && (
        <div style={{ marginTop: '0.7rem' }}>
          {/* Das Konto. Ohne Konto endet die Prüfung hier, und das ist die Antwort. */}
          {!daten.konto ? (
            <div style={{ fontSize: '0.78rem', color: '#92400e', background: '#FFFBEB', border: '1px solid #fcd34d', borderRadius: 8, padding: '0.6rem 0.75rem', lineHeight: 1.6 }}>
              {/* Eine gescheiterte Suche ist kein Befund über die Person. Sie
                  darf deshalb auch nicht so überschrieben werden. */}
              <strong>
                {daten.suchfehler ? 'Konto nicht feststellbar.'
                  : daten.konten_mit_dieser_adresse ? 'Widerspruch.'
                    : 'Kein Nutzerkonto.'}
              </strong> {daten.befund}
              {(daten.einladungen || []).length > 0 && (
                <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid #fcd34d', fontSize: '0.74rem' }}>
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>Einladungen</div>
                  {daten.einladungen.map((e) => (
                    <div key={e.id}>
                      {new Date(e.invited_at).toLocaleDateString('de-DE')} verschickt · Stand {e.status}
                      {e.opened_at ? `, geöffnet am ${new Date(e.opened_at).toLocaleDateString('de-DE')}` : ', nicht geöffnet'}
                      {e.consent_at ? `, eingewilligt am ${new Date(e.consent_at).toLocaleDateString('de-DE')}` : ''}
                      {e.registered_at ? `, angemeldet am ${new Date(e.registered_at).toLocaleDateString('de-DE')}` : ''}
                    </div>
                  ))}
                </div>
              )}

              {/* Der Ausweg gehört neben den Befund, nicht in ein anderes Menü. */}
              {(daten.einladungen || []).length > 0 && (
                <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button onClick={() => erinnern(true)} disabled={erinnertLaeuft}
                    style={{ background: '#92400e', color: '#fff', border: 'none', borderRadius: 7, padding: '0.32rem 0.8rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                    {erinnertLaeuft ? 'Läuft…' : 'Erinnerung senden'}
                  </button>
                  <button onClick={() => erinnern(false)} disabled={erinnertLaeuft}
                    style={{ background: '#fff', color: '#92400e', border: '1px solid #fcd34d', borderRadius: 7, padding: '0.32rem 0.8rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                    Nur Link zeigen
                  </button>
                  <span style={{ fontSize: '0.72rem', color: '#78350f' }}>
                    Die Einwilligung bleibt bestehen und wird nicht erneut abgefragt.
                  </span>
                </div>
              )}

              {erinnerung && erinnerung.fehler && (
                <div style={{ marginTop: 6, fontSize: '0.75rem', color: '#991b1b' }}>{erinnerung.fehler}</div>
              )}
              {erinnerung && erinnerung.link && (
                <div style={{ marginTop: 6, background: '#fff', border: '1px solid #fcd34d', borderRadius: 8, padding: '0.5rem 0.6rem' }}>
                  <div style={{ fontSize: '0.72rem', color: '#78350f', marginBottom: 4 }}>
                    {erinnerung.versendet ? 'Erinnerung versendet. ' : 'Nicht versendet. '}
                    Link zum Weitergeben, gültig bis {new Date(erinnerung.gueltig_bis).toLocaleDateString('de-DE')}:
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input readOnly value={erinnerung.link} onFocus={(e) => e.target.select()}
                      style={{ flex: 1, fontSize: '0.74rem', padding: '0.3rem 0.45rem', border: `1px solid ${C.border}`, borderRadius: 6 }} />
                    <button onClick={() => navigator.clipboard?.writeText(erinnerung.link)}
                      style={{ background: C.navy, color: '#fff', border: 'none', borderRadius: 6, padding: '0.3rem 0.65rem', fontSize: '0.73rem', fontWeight: 700, cursor: 'pointer' }}>
                      Kopieren
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: '0.76rem', color: C.text, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0.55rem 0.75rem', lineHeight: 1.6 }}>
              Konto <strong>{daten.konto.email}</strong> · {daten.konto.role}
              {daten.konto.gefunden_ueber ? ` · ${daten.konto.gefunden_ueber}` : ''}
              {onBirdview && (
                <button onClick={() => onBirdview(daten.konto.id)}
                  style={{ marginLeft: 8, background: 'none', border: 'none', padding: 0, color: '#b45309', fontWeight: 700, fontSize: '0.74rem', textDecoration: 'underline', cursor: 'pointer' }}>
                  Als diese Person ansehen
                </button>
              )}
            </div>
          )}

          {daten.befund && daten.konto && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: C.muted }}>{daten.befund}</div>
          )}

          {(daten.mandate || []).map((m) => {
            const auf = !!offen[m.project_id];
            const dr = m.datenraum;
            return (
              <div key={m.project_id} style={{ borderTop: `1px solid ${C.border}`, marginTop: '0.6rem', paddingTop: '0.6rem' }}>
                <button onClick={() => setOffen((o) => ({ ...o, [m.project_id]: !auf }))}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                  {auf ? <ChevronDown size={14} color={C.muted} /> : <ChevronRight size={14} color={C.muted} />}
                  <strong style={{ color: C.navy, fontSize: '0.86rem' }}>{m.codename}</strong>
                  <span style={{ fontSize: '0.72rem', color: C.muted }}>
                    {dr && dr.offen
                      ? `${dr.dateien_ladbar} von ${dr.dateien_gesamt} Dateien ladbar`
                      : 'kein Datenraum-Zugang'}
                  </span>
                </button>

                {auf && (
                  <div style={{ marginTop: '0.5rem', marginLeft: 20 }}>
                    {/* Die Kette. Der erste offene Punkt ist der, der alles Weitere blockiert. */}
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                      {(m.kette || []).map((s) => <span key={s.name}>{pille(s.erfuellt, s.name)}</span>)}
                    </div>
                    {(() => {
                      // Eine leere Kette ist kein Freibrief. Ohne geprüfte
                      // Punkte gibt es auch keine Aussage, und „kommt
                      // vollständig hinein" wäre dann die falsche.
                      const kette = m.kette || [];
                      const ersteLuecke = kette.find((s) => !s.erfuellt);
                      if (!kette.length) return null;
                      return (
                        <div style={{ fontSize: '0.74rem', color: ersteLuecke ? '#92400e' : '#065f46', lineHeight: 1.55, marginBottom: '0.5rem' }}>
                          {ersteLuecke ? ersteLuecke.hinweis : 'Diese Person kommt vollständig hinein.'}
                        </div>
                      );
                    })()}

                    {dr && !dr.offen && (
                      <div style={{ fontSize: '0.74rem', color: C.muted, marginBottom: '0.4rem' }}>{dr.grund}</div>
                    )}

                    {dr && dr.offen && (
                      <div style={{ fontSize: '0.72rem', color: C.muted, marginBottom: '0.4rem' }}>
                        Datenraum: {dr.dateien_sichtbar} von {dr.dateien_gesamt} Dateien sichtbar,
                        {' '}{dr.dateien_ladbar} ladbar, {dr.eintraege_gesperrt} Einträge gesperrt.
                      </div>
                    )}

                    {(m.dateien || []).length > 0 && (
                      <div style={{ maxHeight: 260, overflowY: 'auto', border: `1px solid ${C.border}`, borderRadius: 8 }}>
                        {m.dateien.map((f) => {
                          const u = URTEIL[f.urteil] || URTEIL.unsichtbar;
                          return (
                            <div key={f.id} title={f.grund}
                              style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between', padding: '0.3rem 0.6rem', borderBottom: `1px solid ${C.border}`, fontSize: '0.76rem' }}>
                              <span style={{ minWidth: 0, overflowWrap: 'anywhere', color: C.text }}>{f.name}</span>
                              <span style={{ flexShrink: 0, fontSize: '0.68rem', fontWeight: 700, color: u.farbe, background: u.hg, border: `1px solid ${u.rand}`, borderRadius: 20, padding: '1px 8px' }}>
                                {u.text}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {(m.unterlagen || []).length > 0 && (
                      <div style={{ marginTop: '0.5rem' }}>
                        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 3 }}>
                          Teaser, IM und einzelne Unterlagen
                        </div>
                        {m.unterlagen.map((d) => (
                          <div key={d.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', justifyContent: 'space-between', padding: '0.25rem 0', borderTop: `1px solid ${C.border}`, fontSize: '0.75rem' }}>
                            <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                              {d.name} <span style={{ color: C.muted }}>· {d.kategorie}{d.beschraenkt ? ', beschränkt' : ''}</span>
                            </span>
                            <span style={{ flexShrink: 0, color: d.erlaubt ? '#065f46' : '#991b1b', fontWeight: 600, maxWidth: '55%', textAlign: 'right' }}>
                              {d.erlaubt ? 'Download erlaubt' : d.grund}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {(daten.mandate || []).length === 0 && !daten.befund && (
            <div style={{ fontSize: '0.78rem', color: C.muted, marginTop: '0.5rem' }}>
              Keine Mandats-Zuordnung.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
