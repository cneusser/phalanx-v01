/**
 * Kontakt, in der Bildsprache der Startseite.
 *
 * Vorher waren das zwei weiße Karten mit runden Ecken auf hellgrauem Grund,
 * also die Sprache eines beliebigen Baukastens. Jetzt trägt die Seite dieselbe
 * Handschrift wie die Startseite und wie phalanx.de: Georgia in den
 * Überschriften, scharfe Kanten, der Goldton als einziger Akzent.
 *
 * Inhaltlich ändert sich eines: der Termin steht gleichberechtigt neben dem
 * Formular. Wer schreiben möchte, schreibt. Wer lieber spricht, sucht sich
 * direkt einen Termin aus, ohne die Seite zu verlassen.
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useT } from '../i18n';
import { Mail, Phone, MapPin, Globe, Send, CheckCircle, CalendarDays } from 'lucide-react';
import '../styles/marke.css';

const TERMIN = import.meta.env.VITE_TERMIN_URL
  || 'https://phalanx-os-production.up.railway.app/api/termine/a9a267e1c8385afadc70e5fd2545c958bcf6cb0e73dd51e8?typ=8&fest=1';
const TERMIN_EINGEBETTET = import.meta.env.VITE_TERMIN_EMBED !== '0';

export default function Contact() {
  const t = useT();
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [human, setHuman] = useState(false);
  const [hp, setHp] = useState('');
  const [sent, setSent] = useState(false);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    if (!form.name || !form.email || form.message.trim().length < 5) {
      setMsg(t('contact.required', 'Bitte Name, E-Mail und eine Nachricht angeben.')); return;
    }
    if (!human) { setMsg(t('contact.robot_required', 'Bitte bestätigen Sie, dass Sie kein Roboter sind.')); return; }
    setBusy(true); setMsg('');
    try { await api.post('/community/contact', { ...form, human, company_website: hp }); setSent(true); }
    catch (err) { setMsg(t('contact.error', 'Es hat nicht geklappt') + ': ' + err.message); }
    finally { setBusy(false); }
  }

  const angaben = [
    [MapPin, 'Helene-Lange-Straße 28, D-91056 Erlangen', null],
    [Phone, '+49 9131-9 20 60 75', 'tel:+4991319206075'],
    [Mail, 'info@phalanx.de', 'mailto:info@phalanx.de'],
    [Globe, 'www.phalanx.de', 'https://www.phalanx.de'],
  ];

  return (
    <div className="marke">
      <section className="abschnitt kontakt-kopf">
        <p className="kicker">{t('contact.kicker', 'Sprechen Sie uns an')}</p>
        <h1>{t('contact.titel', 'Ein Gespräch kostet Sie zwanzig Minuten')}</h1>
        <p>{t('contact.intro', 'Sie haben Fragen zu CapitalMatch, einem Mandat oder unserer Beratung? Schreiben Sie uns, oder suchen Sie sich gleich einen Termin aus. Wir antworten persönlich, nicht aus einem Textbaustein.')}</p>
      </section>

      <section className="abschnitt kontakt-raster">
        {/* Schreiben */}
        <div className="kontakt-formular">
          {sent ? (
            <div className="kontakt-danke">
              <CheckCircle aria-hidden="true" />
              <h2>{t('contact.thanks', 'Vielen Dank')}</h2>
              <p>{t('contact.thanks_text', 'Ihre Nachricht ist eingegangen, wir melden uns zeitnah.')}</p>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <h2>{t('contact.send', 'Nachricht senden')}</h2>
              <label htmlFor="k-name">{t('contact.name_label', 'Ihr Name')}</label>
              <input id="k-name" value={form.name} onChange={set('name')} autoComplete="name" required />
              <label htmlFor="k-mail">{t('contact.email_label', 'Ihre E-Mail-Adresse')}</label>
              <input id="k-mail" type="email" value={form.email} onChange={set('email')} autoComplete="email" required />
              <label htmlFor="k-text">{t('contact.message_label', 'Ihre Nachricht')}</label>
              <textarea id="k-text" rows={6} value={form.message} onChange={set('message')} required />
              {/* Honigtopf: Menschen sehen das Feld nicht, Maschinen füllen es aus. */}
              <input value={hp} onChange={(e) => setHp(e.target.value)} name="company_website"
                tabIndex={-1} autoComplete="off" aria-hidden="true" className="honigtopf" />
              <label className="kontakt-haken">
                <input type="checkbox" checked={human} onChange={(e) => setHuman(e.target.checked)} />
                <span>{t('contact.not_robot', 'Ich bin kein Roboter.')}</span>
              </label>
              {msg && <p className="kontakt-fehler" role="alert">{msg}</p>}
              <button className="knopf dunkel" type="submit" disabled={busy}>
                <Send aria-hidden="true" />
                {busy ? t('contact.sending', 'Wird gesendet…') : t('contact.send', 'Nachricht senden')}
              </button>
              <small>{t('contact.datenschutz', 'Wir nutzen Ihre Angaben nur, um Ihre Anfrage zu beantworten. Server in der Europäischen Union.')}</small>
            </form>
          )}
        </div>

        {/* Sprechen */}
        <aside className="terminkarte">
          <CalendarDays aria-hidden="true" />
          <h3>{t('contact.termin_titel', 'Lieber direkt sprechen')}</h3>
          <p>{t('contact.termin_text', 'Suchen Sie sich einen Termin aus. Zwanzig Minuten, vertraulich, ohne Verpflichtung.')}</p>
          {TERMIN_EINGEBETTET && (
            <div className="termin-rahmen">
              <iframe
                src={`${TERMIN}${TERMIN.includes('?') ? '&' : '?'}einbettung=1`}
                title={t('contact.termin_titel', 'Lieber direkt sprechen')}
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          )}
          <a className={TERMIN_EINGEBETTET ? 'termin-extern' : 'knopf gold'} href={TERMIN} target="_blank" rel="noreferrer">
            {t('contact.termin_extern', 'Terminauswahl in einem eigenen Fenster öffnen')} <span aria-hidden="true">↗</span>
          </a>

          <div className="kontakt-angaben">
            <h4>Phalanx GmbH</h4>
            {angaben.map(([Icon, text, href]) => (
              <p key={text}>
                <Icon aria-hidden="true" />
                {href ? <a href={href}>{text}</a> : <span>{text}</span>}
              </p>
            ))}
            <small>
              {t('contact.brand_note', 'CapitalMatch ist eine Marke der Phalanx GmbH. Weitere Angaben im')}{' '}
              <Link to="/impressum">{t('footer.imprint', 'Impressum')}</Link>.
            </small>
          </div>
        </aside>
      </section>
    </div>
  );
}
