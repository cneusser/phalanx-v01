// ─────────────────────────────────────────────────────────────────────────────
// Startseite (v0.411, zweisprachig).
//
// Warum die Seite so aussieht, wie sie aussieht: Ein Nutzer hat gemeldet, sie
// wirke erkennbar maschinell erzeugt, und er habe sie anfangs für eine Seite
// zum Abgreifen von Daten gehalten. Die Ursache lag weniger an der Gestaltung
// als an den Aussagen. „100 Prozent Vertraulichkeit", „Identitätsprüfung" und
// „verifizierte Investorenprofile" standen hier, ohne dass irgendetwas davon
// nachprüfbar oder in der Registrierung überhaupt vorhanden gewesen wäre.
// Solche Sätze liest jemand, der Betrug vermutet, als Bestätigung.
//
// Es gilt deshalb: keine Aussage ohne Beleg. Was bleibt, ist nachprüfbar
// (Handelsregister, Promotion, Lehrstuhl) oder beschreibt nur, was die
// Plattform tatsächlich tut.
//
// Alle Texte stehen in landingTexte.js, deutsch und englisch nebeneinander.
// Gestaltung: die Bildsprache von phalanx.de, Werte in styles/marke.css.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Menu, X, CalendarDays, Lock, Check, Building2, Landmark, Users,
  FileText, Route, MessageSquare, ShieldCheck,
} from 'lucide-react';
import logoUrl from '../assets/capitalmatch-logo.png';
import portraitUrl from '../assets/christian-neusser.jpg';
import { useI18n } from '../i18n';
import { LANDING } from './landingTexte';
import '../styles/marke.css';

const API = import.meta.env.VITE_API_URL || '';

// Terminbuchung läuft über Phalanx OS, nicht über einen fremden Dienst. Der
// Kalender wird an einer Stelle gepflegt, und die Daten der Anfragenden bleiben
// im eigenen Haus. Über die Variable austauschbar, ohne Codeänderung.
const TERMIN = import.meta.env.VITE_TERMIN_URL
  || 'https://phalanx-os-production.up.railway.app/api/termine/a9a267e1c8385afadc70e5fd2545c958bcf6cb0e73dd51e8?typ=8&fest=1';

// Klemmt die Einbettung in Produktion, schaltet VITE_TERMIN_EMBED=0 auf den
// Knopf zurück. Kein Deploy von Code nötig.
const TERMIN_EINGEBETTET = import.meta.env.VITE_TERMIN_EMBED !== '0';

const WEG_SYMBOLE = [Building2, Landmark, Users];
const WEG_ZIELE = ['/registrieren', '/projekte', '/nachfolge'];
const NETZ_SYMBOLE = [FileText, Route, MessageSquare, ShieldCheck];

export default function Landing() {
  const { lang } = useI18n();
  const T = LANDING[lang] || LANDING.de;

  const [mandate, setMandate] = useState([]);
  const [menueOffen, setMenueOffen] = useState(false);

  useEffect(() => {
    // Die Sprache geht mit: Der Server entscheidet, ob eine freigegebene
    // englische Fassung des Mandatstexts vorliegt.
    fetch(`${API}/api/projects?sprache=${lang}`)
      .then(r => r.json())
      .then(d => setMandate((d?.data?.projects || []).slice(0, 3)))
      .catch(() => { /* Die Seite steht auch ohne Mandate */ });
  }, [lang]);

  const zu = () => setMenueOffen(false);
  const abschnitte = [
    ['markt', T.nav.markt], ['netzwerk', T.nav.netzwerk],
    ['ablauf', T.nav.ablauf], ['person', T.nav.person],
  ];

  return (
    <div className="marke">
      {/* Kopf: dezent die Muttermarke, darunter das Logo */}
      <header className="kopf">
        <Link className="wortmarke" to="/">
          <small>{T.marke_zusatz}</small>
          <img src={logoUrl} alt="CapitalMatch" />
        </Link>

        <span className="kopf-aktionen">
          <Link to="/login">{T.nav.anmelden}</Link>
          <Link to="/registrieren" className="primaer">{T.nav.registrieren}</Link>
        </span>

        <button
          className="klapp"
          aria-expanded={menueOffen}
          aria-controls="hauptnav"
          aria-label={menueOffen ? T.nav.menue_zu : T.nav.menue_auf}
          onClick={() => setMenueOffen(o => !o)}
        >
          {menueOffen ? <X size={26} /> : <Menu size={26} />}
        </button>

        <nav id="hauptnav" className={menueOffen ? 'offen' : ''} aria-label={T.nav.haupt}>
          {abschnitte.map(([id, label]) => <a key={id} href={`#${id}`} onClick={zu}>{label}</a>)}
          <span className="kopf-trenner" aria-hidden="true" />
          <a className="kopf-knopf termin" href="#termin" onClick={zu}>{T.nav.termin}</a>
          <Link className="kopf-knopf" to="/login" onClick={zu}>{T.nav.anmelden}</Link>
          <Link className="kopf-knopf primaer" to="/registrieren" onClick={zu}>{T.nav.registrieren}</Link>
        </nav>
      </header>

      {/* Sprungleiste: auf kleinen Geräten bleiben die Abschnitte erreichbar,
          ohne dass jemand erst das Klappmenü öffnen muss. */}
      <nav className="sprungleiste" aria-label={T.nav.abschnitte}>
        {abschnitte.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
        <a className="hervor" href="#termin">{T.nav.termin_kurz}</a>
      </nav>

      {/* Hero */}
      <section className="hero">
        <p className="kicker">{T.hero.kicker}</p>
        <h1>{T.hero.titel} <em>{T.hero.titel_betont}</em></h1>
        <p>{T.hero.text}</p>
        <div className="hero-aktionen">
          <Link className="knopf hell" to="/registrieren">
            {T.nav.registrieren} <span aria-hidden="true">&rarr;</span>
          </Link>
          <a className="textlink aufhell" href="#termin">
            {T.hero.erst_sprechen} <span aria-hidden="true">&rarr;</span>
          </a>
        </div>
        <div className="hero-leiste">
          {T.hero.leiste.map(([titel, text]) => (
            <div key={titel}><b>{titel}</b>{text}</div>
          ))}
        </div>
      </section>

      {/* Drei Wege */}
      <section className="abschnitt">
        <p className="kicker">{T.wege.kicker}</p>
        <h2>{T.wege.titel}</h2>
        <div className="wege">
          {T.wege.liste.map((w, i) => {
            const Symbol = WEG_SYMBOLE[i];
            return (
              <article key={w.titel}>
                <span className="picto"><Symbol /></span>
                <h3>{w.titel}</h3>
                <p>{w.text}</p>
                <Link className="textlink" to={WEG_ZIELE[i]}>
                  {w.label} <span aria-hidden="true">&rarr;</span>
                </Link>
              </article>
            );
          })}
        </div>
      </section>

      {/* Warum */}
      <section className="abschnitt zitat">
        <p className="kicker">{T.zitat.kicker}</p>
        <blockquote>{T.zitat.satz}</blockquote>
        <p>{T.zitat.quelle}</p>
      </section>

      {/* Marktplatz. Öffentlich stehen nur Spannen, dafür sorgt der Server. */}
      <section className="abschnitt markt" id="markt">
        <p className="kicker">{T.markt.kicker}</p>
        <h2>{T.markt.titel}</h2>
        {mandate.length > 0 ? (
          <div className="mandate">
            {mandate.map((p) => {
              const istFinanzierung = p.mandate_type === 'fundraising';
              const zeilen = istFinanzierung
                ? [[T.markt.runde, p.investment_needed], [T.markt.phase, p.stage], [T.markt.region, p.region]]
                : [[T.markt.umsatz, p.revenue_band], [T.markt.ebitda, p.ebitda_band], [T.markt.region, p.region]];
              return (
                <article className="mandat" key={p.id}>
                  <div className="meta">
                    <span>{istFinanzierung ? T.markt.finanzierung : (p.deal_type || T.markt.transaktion)}</span>
                    <span>{p.industry}</span>
                  </div>
                  <h3>{p.codename}</h3>
                  <p>{p.short_description}</p>
                  <div className="kennzahlen">
                    {zeilen.filter(([, w]) => w && w !== 'k. A.').map(([l, w]) => (
                      <div key={l}><span>{l}</span><strong>{w}</strong></div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p style={{ color: '#56616a', maxWidth: '62ch' }}>{T.markt.leer}</p>
        )}
        <p className="schlosshinweis">
          <Lock aria-hidden="true" />
          <span>{T.markt.hinweis}</span>
        </p>
        <div style={{ marginTop: 28 }}>
          <Link className="textlink" to="/projekte">{T.markt.alle} <span aria-hidden="true">&rarr;</span></Link>
        </div>
      </section>

      {/* Nachfolge-Netzwerk */}
      <section className="abschnitt dunkel" id="netzwerk">
        <p className="kicker">{T.netzwerk.kicker}</p>
        <h2>{T.netzwerk.titel}</h2>
        <p className="vorspann">{T.netzwerk.vorspann}</p>
        <div className="paar">
          {T.netzwerk.felder.map((f, i) => {
            const Symbol = NETZ_SYMBOLE[i];
            return (
              <article key={f.titel}>
                <span className="picto"><Symbol /></span>
                <h3>{f.titel}</h3>
                <p>{f.text}</p>
              </article>
            );
          })}
        </div>
        <div className="dunkel-fuss">
          <Link className="knopf linie" to="/nachfolge">
            {T.netzwerk.knopf} <span aria-hidden="true">&rarr;</span>
          </Link>
          <p>{T.netzwerk.fuss}</p>
        </div>
      </section>

      {/* Person */}
      <section className="abschnitt" id="person">
        <div className="person">
          <div className="portrait">
            <img src={portraitUrl} alt="Dr. Christian Neusser" />
            <div className="portrait-zeile">
              <strong>Dr. Christian Neusser</strong>
              <span>{T.person.rolle}</span>
            </div>
          </div>
          <div>
            <p className="kicker">{T.person.kicker}</p>
            <h2>{T.person.titel}</h2>
            {T.person.absaetze.map((a, i) => <p className="fliess" key={i}>{a}</p>)}
            <ul className="stationen">
              {T.person.stationen.map(([k, v]) => (
                <li key={k}><b>{k}</b><span>{v}</span></li>
              ))}
            </ul>
            <p className="fussnote">{T.person.fussnote}</p>
          </div>
        </div>
      </section>

      {/* Ablauf */}
      <section className="abschnitt ablauf" id="ablauf">
        <p className="kicker">{T.ablauf.kicker}</p>
        <h2>{T.ablauf.titel}</h2>
        {T.ablauf.schritte.map((s, i) => (
          <article key={s.titel}>
            <div className="nr">{String(i + 1).padStart(2, '0')}</div>
            <div><h3>{s.titel}</h3><p>{s.text}</p></div>
          </article>
        ))}
      </section>

      {/* Abschluss mit eingebetteter Terminauswahl */}
      <section className="abschnitt abschluss" id="termin">
        <div>
          <p className="kicker">{T.abschluss.kicker}</p>
          <h2>{T.abschluss.titel}</h2>
          <p>{T.abschluss.text}</p>
          <ul>
            {T.abschluss.punkte.map((p) => (
              <li key={p}><Check aria-hidden="true" /><span>{p}</span></li>
            ))}
          </ul>
          <Link className="knopf hell" to="/registrieren">
            {T.abschluss.knopf} <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
        <aside className="terminkarte">
          <CalendarDays aria-hidden="true" />
          <h3>{T.abschluss.karte_titel}</h3>
          <p>{T.abschluss.karte_text}</p>
          {/* Der Parameter einbettung=1 lässt Phalanx OS seine eigene Kopfzeile
              und Karte weg, sonst stünde eine Karte in der Karte. Neuere Browser
              erkennen das ohnehin über Sec-Fetch-Dest, der Parameter ist der
              Rückfall. Blockiert ein Browser die Einbettung, bleibt der Link. */}
          {TERMIN_EINGEBETTET && (
            <div className="termin-rahmen">
              <iframe
                src={`${TERMIN}${TERMIN.includes('?') ? '&' : '?'}einbettung=1`}
                title={T.abschluss.karte_titel}
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          )}
          {TERMIN_EINGEBETTET ? (
            <a className="termin-extern" href={TERMIN} target="_blank" rel="noreferrer">
              {T.abschluss.karte_extern} <span aria-hidden="true">↗</span>
            </a>
          ) : (
            <a className="knopf gold" href={TERMIN} target="_blank" rel="noreferrer">
              {T.abschluss.karte_knopf} <span aria-hidden="true">↗</span>
            </a>
          )}
          <small>{T.abschluss.karte_fuss}</small>
        </aside>
      </section>

      {/* Mitlaufend, wie auf phalanx.de */}
      <a className="termin-fest" href="#termin" aria-label={T.nav.termin}>
        <CalendarDays aria-hidden="true" /><span>{T.nav.termin}</span>
      </a>
      <div className="wechsler" aria-label={T.fuss.wechsler}>
        <span>{T.fuss.gruppe}</span>
        <a href="https://www.phalanx.de">phalanx.de</a>
        <a className="aktiv" aria-current="page" href="/">capitalmatch.de</a>
        <a href="https://www.christian-neusser.de">christian-neusser.de</a>
      </div>

      {/* Fuß */}
      <footer className="fuss">
        <div className="fuss-raster">
          <div>
            <span className="fuss-marke"><img src={logoUrl} alt="CapitalMatch" /></span>
            <p className="klein">
              {T.marke_zusatz}<br />
              {T.fuss.sitz}<br />
              {T.fuss.register}
            </p>
          </div>
          <div>
            <h4>{T.fuss.plattform}</h4>
            <ul>
              <li><Link to="/projekte">{T.nav.markt}</Link></li>
              <li><Link to="/nachfolge">{T.nav.netzwerk}</Link></li>
              <li><Link to="/unternehmenswert">{T.fuss.wert}</Link></li>
              <li><Link to="/registrieren">{T.nav.registrieren}</Link></li>
              <li><Link to="/login">{T.nav.anmelden}</Link></li>
            </ul>
          </div>
          <div>
            <h4>Phalanx</h4>
            <ul>
              <li><a href="https://www.phalanx.de">phalanx.de</a></li>
              <li><a href="https://www.phalanx.de/nachfolge">{T.fuss.nachfolge}</a></li>
              <li><a href="https://www.phalanx.de/transaktionen">{T.fuss.transaktionen}</a></li>
              <li><a href="https://www.phalanx.de/transformation">{T.fuss.transformation}</a></li>
              <li><a href="https://www.christian-neusser.de">christian-neusser.de</a></li>
            </ul>
          </div>
          <div>
            <h4>{T.fuss.rechtliches}</h4>
            <ul>
              <li><Link to="/impressum">{T.fuss.impressum}</Link></li>
              <li><Link to="/datenschutz">{T.fuss.datenschutz}</Link></li>
              <li><Link to="/nutzungsbedingungen">{T.fuss.agb}</Link></li>
              <li><Link to="/cookies">{T.fuss.cookies}</Link></li>
              <li><Link to="/kontakt">{T.fuss.kontakt}</Link></li>
            </ul>
          </div>
        </div>
        <div className="fuss-unten">
          <span>© {new Date().getFullYear()} Phalanx GmbH</span>
          <span>{T.fuss.server}</span>
        </div>
      </footer>
    </div>
  );
}
