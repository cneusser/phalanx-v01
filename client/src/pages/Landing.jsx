// ─────────────────────────────────────────────────────────────────────────────
// Startseite (v0.409, neu aufgebaut).
//
// Warum neu: Ein Nutzer hat gemeldet, die Seite wirke erkennbar maschinell
// erzeugt, und er habe sie anfangs für eine Seite zum Abgreifen von Daten
// gehalten. Die Ursache lag weniger an der Gestaltung als an den Aussagen:
// „100 Prozent Vertraulichkeit", „Identitätsprüfung" und „verifizierte
// Investorenprofile" standen hier, ohne dass irgendetwas davon nachprüfbar
// oder in der Registrierung überhaupt vorhanden gewesen wäre. Solche Sätze
// liest jemand, der Betrug vermutet, als Bestätigung.
//
// Deshalb gilt hier ab sofort: keine Aussage ohne Beleg. Was bleibt, ist
// nachprüfbar (Handelsregister, Promotion, Lehrstuhl, ORCID) oder beschreibt
// nur, was die Plattform tatsächlich tut.
//
// Gestaltung: die Bildsprache von phalanx.de, Werte in styles/marke.css.
// CapitalMatch ist laut Markenarchitektur eine Infrastruktur der Phalanx GmbH
// und soll auch so aussehen, damit der Wechsel zwischen den Auftritten nicht
// wie ein Bruch wirkt.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Menu, X, CalendarDays, Lock, Check, Building2, Landmark, Users,
  FileText, Route, MessageSquare, ShieldCheck,
} from 'lucide-react';
import logoUrl from '../assets/capitalmatch-logo.png';
import portraitUrl from '../assets/christian-neusser.jpg';
import '../styles/marke.css';

const API = import.meta.env.VITE_API_URL || '';

// Terminbuchung läuft über Phalanx OS, nicht über einen fremden Dienst. Der
// Kalender wird damit an einer Stelle gepflegt, und die Daten der Anfragenden
// bleiben im eigenen Haus.
//
// Der Link enthält eine Kennung. Deshalb steht er in einer Umgebungsvariablen:
// Wird sie einmal getauscht, muss niemand Code anfassen. Der Standard hier ist
// nur der Rückfall, damit die Seite auch ohne gesetzte Variable funktioniert.
const TERMIN = import.meta.env.VITE_TERMIN_URL
  || 'https://phalanx-os-production.up.railway.app/api/termine/a9a267e1c8385afadc70e5fd2545c958bcf6cb0e73dd51e8?typ=8&fest=1';

// Die Terminauswahl läuft eingebettet, damit niemand die Seite verlassen muss.
// Das setzt voraus, dass Phalanx OS die Einbettung für diese Herkunft erlaubt
// (frame-ancestors). Sollte dort etwas klemmen, schaltet VITE_TERMIN_EMBED=0
// den Rahmen ab, und es bleibt beim Knopf. Kein Deploy von Code nötig.
const TERMIN_EINGEBETTET = import.meta.env.VITE_TERMIN_EMBED !== '0';

const ABSCHNITTE = [
  ['markt', 'Marktplatz'],
  ['netzwerk', 'Nachfolge-Netzwerk'],
  ['ablauf', 'So funktioniert es'],
  ['person', 'Wer dahintersteht'],
];

// ── Bausteine ───────────────────────────────────────────────────────────────
function Weg({ icon: Icon, titel, text, ziel, label }) {
  return (
    <article>
      <span className="picto"><Icon /></span>
      <h3>{titel}</h3>
      <p>{text}</p>
      <Link className="textlink" to={ziel}>{label} <span aria-hidden="true">&rarr;</span></Link>
    </article>
  );
}

function Feld({ icon: Icon, titel, text }) {
  return (
    <article>
      <span className="picto"><Icon /></span>
      <h3>{titel}</h3>
      <p>{text}</p>
    </article>
  );
}

function Schritt({ nr, titel, text }) {
  return (
    <article>
      <div className="nr">{nr}</div>
      <div><h3>{titel}</h3><p>{text}</p></div>
    </article>
  );
}

// Eine Mandatskachel. Gezeigt werden nur Größenordnungen; der Server liefert
// vor der Freischaltung gar nichts Genaueres (siehe utils/spannen.js).
function Mandat({ p }) {
  const zeilen = p.mandate_type === 'fundraising'
    ? [['Runde', p.investment_needed], ['Phase', p.stage], ['Region', p.region]]
    : [['Umsatz', p.revenue_band], ['EBITDA', p.ebitda_band], ['Region', p.region]];
  return (
    <article className="mandat">
      <div className="meta">
        <span>{p.mandate_type === 'fundraising' ? 'Finanzierung' : (p.deal_type || 'Transaktion')}</span>
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
}

// ── Seite ───────────────────────────────────────────────────────────────────
export default function Landing() {
  const [mandate, setMandate] = useState([]);
  const [menueOffen, setMenueOffen] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/projects`)
      .then(r => r.json())
      .then(d => setMandate((d?.data?.projects || []).slice(0, 3)))
      .catch(() => { /* Die Seite steht auch ohne Mandate */ });
  }, []);

  const zu = () => setMenueOffen(false);

  return (
    <div className="marke">
      {/* Kopf: dezent die Muttermarke, darunter das Logo */}
      <header className="kopf">
        <Link className="wortmarke" to="/">
          <small>Eine Marke der Phalanx GmbH</small>
          <img src={logoUrl} alt="CapitalMatch" />
        </Link>

        <span className="kopf-aktionen">
          <Link to="/login">Anmelden</Link>
          <Link to="/registrieren" className="primaer">Registrieren</Link>
        </span>

        <button
          className="klapp"
          aria-expanded={menueOffen}
          aria-controls="hauptnav"
          aria-label={menueOffen ? 'Menü schließen' : 'Menü öffnen'}
          onClick={() => setMenueOffen(o => !o)}
        >
          {menueOffen ? <X size={26} /> : <Menu size={26} />}
        </button>

        <nav id="hauptnav" className={menueOffen ? 'offen' : ''} aria-label="Hauptnavigation">
          {ABSCHNITTE.map(([id, label]) => (
            <a key={id} href={`#${id}`} onClick={zu}>{label}</a>
          ))}
          <span className="kopf-trenner" aria-hidden="true" />
          <a className="kopf-knopf termin" href="#termin" onClick={zu}>Termin vereinbaren</a>
          <Link className="kopf-knopf" to="/login" onClick={zu}>Anmelden</Link>
          <Link className="kopf-knopf primaer" to="/registrieren" onClick={zu}>Registrieren</Link>
        </nav>
      </header>

      {/* Sprungleiste: auf kleinen Geräten bleiben die Abschnitte erreichbar,
          ohne dass jemand erst das Klappmenü öffnen muss. */}
      <nav className="sprungleiste" aria-label="Abschnitte">
        {ABSCHNITTE.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
        <a className="hervor" href="#termin">Termin</a>
      </nav>

      {/* Hero */}
      <section className="hero">
        <p className="kicker">Marktplatz für Nachfolge und Beteiligung</p>
        <h1>Ein Unternehmen wechselt den Eigentümer. <em>Einmal.</em></h1>
        <p>
          CapitalMatch ist der Transaktionsmarktplatz der Phalanx GmbH. Hier treffen Unternehmen,
          die übergeben oder Kapital aufnehmen wollen, auf Käufer, Investoren und Nachfolgerinnen
          und Nachfolger. Die Plattform ist dabei nur die Oberfläche. Dahinter arbeitet jemand,
          den Sie anrufen können.
        </p>
        <div className="hero-aktionen">
          <Link className="knopf hell" to="/registrieren">Registrieren <span aria-hidden="true">&rarr;</span></Link>
          <a className="textlink aufhell" href="#termin">
            Lieber erst sprechen? Termin wählen <span aria-hidden="true">&rarr;</span>
          </a>
        </div>
        <div className="hero-leiste">
          <div><b>Geführte Mandate</b>Kein Inserateportal. Hinter jedem Mandat steht ein Berater mit Namen.</div>
          <div><b>Vertraulichkeit als Ablauf</b>Öffentlich nur Spannen, Details nach Freischaltung und NDA.</div>
          <div><b>Drei Wege hinein</b>Übergeben, kaufen oder ein Unternehmen übernehmen.</div>
        </div>
      </section>

      {/* Drei Wege */}
      <section className="abschnitt">
        <p className="kicker">Für wen</p>
        <h2>Drei Wege, und jeder beginnt mit einem Gespräch.</h2>
        <div className="wege">
          <Weg
            icon={Building2} titel="Sie übergeben" ziel="/registrieren" label="Für Übergebende"
            text="Sie führen ein mittelständisches Unternehmen und stehen vor Nachfolge oder Verkauf. Wir bereiten die Unterlagen auf, sprechen den Markt an und führen den Prozess bis zur Übergabe."
          />
          <Weg
            icon={Landmark} titel="Sie kaufen oder investieren" ziel="/projekte" label="Zum Marktplatz"
            text="Strategen, Beteiligungsgesellschaften, Family Offices und Kapitalgeber. Sie hinterlegen ein Suchprofil und erhalten passende Mandate, bevor sie breit am Markt sind."
          />
          <Weg
            icon={Users} titel="Sie wollen übernehmen" ziel="/nachfolge" label="Zum Nachfolge-Netzwerk"
            text="Führungskräfte, die ein Unternehmen übernehmen statt die nächste Stelle antreten. Dafür gibt es bei uns ein eigenes Netzwerk, und es kostet Sie nichts."
          />
        </div>
      </section>

      {/* Warum */}
      <section className="abschnitt zitat">
        <p className="kicker">Warum es CapitalMatch gibt</p>
        <blockquote>
          Die meisten Nachfolgen scheitern nicht am Geld. Sie scheitern daran,
          dass zwei Menschen nie voneinander erfahren.
        </blockquote>
        <p>Dr. Christian Neusser, Geschäftsführer der Phalanx GmbH</p>
      </section>

      {/* Marktplatz */}
      <section className="abschnitt markt" id="markt">
        <p className="kicker">Marktplatz</p>
        <h2>Was gerade am Markt ist.</h2>
        {mandate.length > 0 ? (
          <div className="mandate">{mandate.map(p => <Mandat key={p.id} p={p} />)}</div>
        ) : (
          <p style={{ color: '#56616a', maxWidth: '62ch' }}>
            Derzeit ist kein Mandat öffentlich ausgeschrieben. Ein erheblicher Teil unserer Vorhaben
            läuft vertraulich und wird nie inseriert. Hinterlegen Sie ein Suchprofil, dann melden
            wir uns, sobald etwas passt.
          </p>
        )}
        <p className="schlosshinweis">
          <Lock aria-hidden="true" />
          <span>
            Öffentlich stehen ausschließlich Spannen. Firmenname, genaue Zahlen und Unterlagen werden
            erst sichtbar, wenn Sie registriert und freigeschaltet sind und eine
            Vertraulichkeitsvereinbarung unterzeichnet haben. So bleibt ein Verkauf so lange
            vertraulich, wie die verkaufende Seite es will.
          </span>
        </p>
        <div style={{ marginTop: 28 }}>
          <Link className="textlink" to="/projekte">Alle Mandate ansehen <span aria-hidden="true">&rarr;</span></Link>
        </div>
      </section>

      {/* Nachfolge-Netzwerk */}
      <section className="abschnitt dunkel" id="netzwerk">
        <p className="kicker">Nachfolge-Netzwerk</p>
        <h2>Ein Unternehmen übernehmen, statt die nächste Stelle antreten.</h2>
        <p className="vorspann">
          Viele erfahrene Führungskräfte wollen nicht noch eine Position, sondern Verantwortung als
          Eigentümer. Auf der anderen Seite suchen Inhaberinnen und Inhaber jemanden, der ihr
          Lebenswerk weiterführt. Beide finden ohne Hilfe selten zueinander. Genau dazwischen
          arbeitet dieses Netzwerk.
        </p>
        <div className="paar">
          <Feld
            icon={FileText} titel="Suchprofil statt Bewerbung"
            text="Sie hinterlegen Branche, Region, Unternehmensgröße und die Art der Übernahme: reine Beteiligung, strategische Partnerschaft oder operative Führung. Aus diesen Angaben entstehen die Vorschläge, nicht aus einem Lebenslauf."
          />
          <Feld
            icon={Route} titel="Mandate vor der Veröffentlichung"
            text="Ein erheblicher Teil der Nachfolgefälle wird nie inseriert. Passt ein Mandat zu Ihrem Profil, sprechen wir Sie an, bevor es breit am Markt ist. MBI und MBO gehören ausdrücklich dazu."
          />
          <Feld
            icon={MessageSquare} titel="Begleitung, nicht nur Vermittlung"
            text="Kaufpreis, Finanzierungsstruktur, Verkäuferdarlehen, Beteiligung des Alteigentümers, die ersten 100 Tage: An diesen Fragen scheitern Übernahmen, nicht am Kennenlernen. Hier sitzt jemand mit Transaktionserfahrung neben Ihnen."
          />
          <Feld
            icon={ShieldCheck} titel="Diskret, und für Sie kostenfrei"
            text="Ihr Profil liegt nicht offen. Sie entscheiden, wann und mit wem Sie ins Gespräch gehen. Teilnahme, Matching und Veranstaltungen kosten Sie nichts. Getragen wird das Netzwerk von den Übergebenden."
          />
        </div>
        <div className="dunkel-fuss">
          <Link className="knopf linie" to="/nachfolge">Kostenfrei ins Netzwerk <span aria-hidden="true">&rarr;</span></Link>
          <p>Die Registrierung dauert wenige Minuten. Danach melden wir uns, sobald ein Mandat zu Ihrem Profil passt.</p>
        </div>
      </section>

      {/* Person */}
      <section className="abschnitt" id="person">
        <div className="person">
          <div className="portrait">
            <img src={portraitUrl} alt="Dr. Christian Neusser" />
            <div className="portrait-zeile">
              <strong>Dr. Christian Neusser</strong>
              <span>Geschäftsführer der Phalanx GmbH</span>
            </div>
          </div>
          <div>
            <p className="kicker">Wer dahintersteht</p>
            <h2>25 Jahre auf beiden Seiten des Tisches.</h2>
            <p className="fliess">
              Ich habe nicht nur über Transaktionen beraten, ich habe die Unternehmen danach auch
              geführt. Angefangen bei der Sparkasse und bei KPMG in der Due Diligence, dann zwölf
              Jahre als kaufmännischer Geschäftsführer einer Industriegruppe, danach als CFO,
              Geschäftsführer und Sanierungsgeschäftsführer in Maschinenbau, Textil, Handel, Energie
              und Mobilität. Mehr als 35 Transaktionen, und in mehreren davon habe ich am Montag
              nach dem Closing die Verantwortung übernommen. Ich weiß deshalb, was ein Kaufvertrag
              im Alltag anrichtet, und was nicht.
            </p>
            <p className="fliess">
              Dabei habe ich immer wieder dasselbe gesehen: Ein Inhaber findet niemanden, dem er
              sein Lebenswerk zutraut. Und eine erfahrene Führungskraft, die genau das gesucht
              hätte, erfährt nie, dass dieses Unternehmen zu haben wäre. Nicht das Geld fehlt,
              sondern der Zugang zueinander. Dafür haben wir CapitalMatch gebaut.
            </p>
            <p className="fliess">
              Was mir dabei wichtig ist: Die Technik nimmt uns das Sortieren ab, nicht das Gespräch.
              Wer sich hier registriert, bekommt einen Ansprechpartner und keine automatische
              Antwort. Ich lebe mit meiner Familie in Erlangen und bin seit 1996 ehrenamtlich beim
              Roten Kreuz, zuletzt in der Krisenintervention. Das prägt, wie ich mit Menschen
              umgehe, für die gerade viel auf dem Spiel steht.
            </p>
            <ul className="stationen">
              <li><b>Beratung</b><span>KPMG Transaction Services, Financial Due Diligence und Unternehmensbewertung</span></li>
              <li><b>Industrie</b><span>Kaufmännischer Geschäftsführer einer international tätigen Industriegruppe, zwölf Jahre</span></li>
              <li><b>Sondersituationen</b><span>CFO, CEO und Sanierungsgeschäftsführer in Konzern und Mittelstand, Umsatzgrößen von 80 Mio. bis 2,8 Mrd.</span></li>
              <li><b>Transaktionen</b><span>Über 35 begleitete Transaktionen, Sell Side und Buy Side, Nachfolge, Carve-out und Wachstumsfinanzierung</span></li>
              <li><b>Unternehmer</b><span>Phalanx GmbH seit 2010, dazu Minderheitsbeteiligungen und Beiratsmandate</span></li>
            </ul>
            <p className="fussnote">
              Nebenbei forsche ich zu Unternehmensnachfolge in Familienunternehmen, promoviert an
              der Henley Business School, seit 2026 an der Universität Siegen. Für Sie ist daran vor
              allem eines interessant: Ich kenne die Gründe, an denen Übergaben scheitern, nicht nur
              aus meinen eigenen Fällen.
            </p>
          </div>
        </div>
      </section>

      {/* Ablauf */}
      <section className="abschnitt ablauf" id="ablauf">
        <p className="kicker">Ablauf</p>
        <h2>Wie es tatsächlich läuft.</h2>
        <Schritt
          nr="01" titel="Sie registrieren sich, oder sprechen erst mit mir"
          text="Wenige Angaben, damit wir wissen, wer Sie sind und wonach Sie suchen. Wenn Ihnen ein Gespräch lieber ist, buchen Sie einen Termin. Beides führt zum selben Ergebnis."
        />
        <Schritt
          nr="02" titel="Wir schalten Ihr Konto von Hand frei"
          text="Jedes Konto wird geprüft, bevor es Zugang bekommt. Das dauert länger als ein Klick und ist der Grund, warum in unseren Datenräumen keine anonymen Adressen unterwegs sind."
        />
        <Schritt
          nr="03" titel="Aus Spannen werden konkrete Zahlen"
          text="Öffentlich stehen nur Größenordnungen. Nach der Freischaltung sehen Sie den Teaser, nach unterzeichneter Vertraulichkeitsvereinbarung und Freigabe durch die verkaufende Seite das Informationsmemorandum und den Datenraum."
        />
        <Schritt
          nr="04" titel="Jeder Zugriff wird protokolliert"
          text="Wer wann welches Dokument geöffnet oder heruntergeladen hat, steht im Protokoll und ist für die verkaufende Seite einsehbar. Das schützt beide Seiten."
        />
      </section>

      {/* Abschluss mit Terminkarte */}
      <section className="abschnitt abschluss" id="termin">
        <div>
          <p className="kicker">Nächster Schritt</p>
          <h2>Registrieren, oder erst einmal sprechen.</h2>
          <p>
            Sie müssen sich nicht entscheiden, bevor Sie mit jemandem geredet haben.
            Ein Erstgespräch kostet nichts und verpflichtet zu nichts.
          </p>
          <ul>
            <li><Check aria-hidden="true" /><span>15 Minuten Klärungsgespräch, per Video oder Telefon</span></li>
            <li><Check aria-hidden="true" /><span>Sie sprechen mit mir, nicht mit einem Vertrieb</span></li>
            <li><Check aria-hidden="true" /><span>Vertraulich, auch ohne Konto und ohne Registrierung</span></li>
          </ul>
          <Link className="knopf hell" to="/registrieren">Konto anlegen <span aria-hidden="true">&rarr;</span></Link>
        </div>
        <aside className="terminkarte">
          <CalendarDays aria-hidden="true" />
          <h3>Direkt einen Termin buchen</h3>
          <p>
            Wählen Sie einen freien Termin für ein kurzes Klärungsgespräch, 15 Minuten, per Video
            oder Telefon. Sie erhalten sofort eine Bestätigung.
          </p>
          {/* Die Auswahl läuft eingebettet, damit niemand die Seite verlassen muss.
              Der Rahmen lädt erst, wenn er in Sichtweite kommt. Blockiert ein
              Browser die Einbettung, bleibt der Link darunter als Weg. */}
          {TERMIN_EINGEBETTET && (
            <div className="termin-rahmen">
              <iframe
                src={TERMIN}
                title="Freie Termine bei Dr. Christian Neusser"
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          )}
          {TERMIN_EINGEBETTET ? (
            <a className="termin-extern" href={TERMIN} target="_blank" rel="noreferrer">
              Auswahl in einem eigenen Fenster öffnen <span aria-hidden="true">&nearr;</span>
            </a>
          ) : (
            <a className="knopf gold" href={TERMIN} target="_blank" rel="noreferrer">
              Termin wählen <span aria-hidden="true">&nearr;</span>
            </a>
          )}
          <small>Dr. Christian Neusser · Phalanx GmbH · Erlangen</small>
        </aside>
      </section>

      {/* Mitlaufend, wie auf phalanx.de */}
      <a className="termin-fest" href="#termin" aria-label="Termin vereinbaren">
        <CalendarDays aria-hidden="true" /><span>Termin vereinbaren</span>
      </a>
      <div className="wechsler" aria-label="Zwischen Websites wechseln">
        <span>Phalanx-Gruppe</span>
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
              Eine Marke der Phalanx GmbH<br />
              Helene-Lange-Straße 28, 91056 Erlangen<br />
              Amtsgericht Fürth HRB 14306
            </p>
          </div>
          <div>
            <h4>Plattform</h4>
            <ul>
              <li><Link to="/projekte">Marktplatz</Link></li>
              <li><Link to="/nachfolge">Nachfolge-Netzwerk</Link></li>
              <li><Link to="/unternehmenswert">Unternehmenswert schätzen</Link></li>
              <li><Link to="/registrieren">Registrieren</Link></li>
              <li><Link to="/login">Anmelden</Link></li>
            </ul>
          </div>
          <div>
            <h4>Phalanx</h4>
            <ul>
              <li><a href="https://www.phalanx.de">phalanx.de</a></li>
              <li><a href="https://www.phalanx.de/nachfolge">Nachfolge</a></li>
              <li><a href="https://www.phalanx.de/transaktionen">Transaktionen</a></li>
              <li><a href="https://www.phalanx.de/transformation">Transformation</a></li>
              <li><a href="https://www.christian-neusser.de">christian-neusser.de</a></li>
            </ul>
          </div>
          <div>
            <h4>Rechtliches</h4>
            <ul>
              <li><Link to="/impressum">Impressum</Link></li>
              <li><Link to="/datenschutz">Datenschutz</Link></li>
              <li><Link to="/nutzungsbedingungen">Nutzungsbedingungen</Link></li>
              <li><Link to="/cookies">Cookies</Link></li>
              <li><Link to="/kontakt">Kontakt</Link></li>
            </ul>
          </div>
        </div>
        <div className="fuss-unten">
          <span>© {new Date().getFullYear()} Phalanx GmbH</span>
          <span>Server in der Europäischen Union</span>
        </div>
      </footer>
    </div>
  );
}
