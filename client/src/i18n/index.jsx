// ─────────────────────────────────────────────────────────────────────────────
// Sprachumschaltung (DE/EN).
//
// Deutsch ist die Ausgangssprache und steht als Fallback direkt im Code:
//   t('nav.marketplace', 'Marktplatz')
// Für Englisch greift das Wörterbuch unten. Fehlt ein Schlüssel, erscheint der
// deutsche Text: die Oberfläche bleibt also immer bedienbar, auch während wir
// die Übersetzung Seite für Seite vervollständigen.
//
// Die Wahl steht im localStorage (sofort wirksam) und wird beim eingeloggten
// Nutzer zusätzlich im Profil gespeichert (users.language).
//
// Beim ersten Besuch wird die Sprache erkannt: erst die eigene Wahl, dann die
// Sprache des Browsers, sonst Deutsch. Ist der Nutzer angemeldet, schlägt sein
// Profil die Sprache vor, aber nur solange er noch nie selbst gewählt hat.
// Eine getroffene Wahl wird nie überschrieben.
// ─────────────────────────────────────────────────────────────────────────────
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';

const EN = {
  // Navigation
  'nav.marketplace': 'Marketplace',
  'nav.valuation': 'Company value',
  'nav.detailed_valuation': 'Valuation',
  'nav.messages': 'Messages',
  'nav.feedback': 'Feedback',
  'nav.contact': 'Contact',
  'nav.dashboard': 'My area',
  'nav.crm': 'CRM',
  'nav.admin': 'Admin',
  'nav.login': 'Log in',
  'nav.register': 'Register',
  'nav.logout': 'Log out',
  'nav.profile': 'Profile',
  'nav.admin_area': 'Admin area',
  'nav.watchlist': 'Watchlist',
  'nav.search_profiles': 'Search profiles',

  // Rollen
  'role.super_admin': 'Administrator',
  'role.advisor': 'Advisor',
  'role.buyer': 'Investor',

  // Marktplatz
  'projects.title': 'Marketplace',
  'projects.subtitle': 'Current mandates: succession, majority sales, growth financing',
  'projects.search': 'Search mandates…',
  'projects.filter.industry': 'Industry',
  'projects.filter.region': 'Region',
  'projects.filter.revenue': 'Revenue',
  'projects.filter.ebitda': 'EBITDA',
  'projects.filter.deal_type': 'Transaction type',
  'projects.filter.all': 'All',
  'projects.empty': 'No mandates match your filters.',
  'projects.details': 'Details',
  'projects.interest': 'Express interest',
  'projects.revenue': 'Revenue',
  'projects.ebitda': 'EBITDA',
  'projects.region': 'Region',
  'projects.industry': 'Industry',
  'projects.type': 'Type',
  'projects.count_one': 'mandate',
  'projects.count_many': 'mandates',

  // Allgemein
  'common.loading': 'Loading…',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.and': 'and the',

  // Cookie-Hinweis
  'cookie.title': 'We do not track you',
  'cookie.text': 'CapitalMatch sets no analytics, advertising or tracking cookies. We store only what is needed to run the service: your login and your language setting, locally in your browser. Details are in the',
  'cookie.policy': 'cookie policy',
  'cookie.privacy': 'privacy notice',
  'cookie.ok': 'Understood',
  'common.close': 'Close',
  'common.send': 'Send',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.back': 'Back',
  'common.language': 'Language',
  'common.german': 'German',
  'common.english': 'English',


  // Marktplatz (Detail)
  'projects.hero_kicker': 'PHALANX MARKETPLACE',
  'projects.hero_title': 'Transaction mandates',
  'projects.hero_sub': 'Anonymised M&A transactions and startup financings. You learn who is behind them once the NDA is signed.',
  'projects.loading': 'Loading mandates…',
  'projects.all': 'All',
  'projects.fundraising': 'Fundraising',
  'projects.search_ph': 'Search…',
  'projects.filter.deal': 'Deal type',
  'projects.filter.revenue_band': 'Revenue band',
  'projects.filter.ebitda_band': 'EBITDA band',
  'projects.none': 'No mandates match these filters.',
  'projects.save_search': '★ Save search',
  'projects.watchlist': '★ Watchlist',
  'projects.view_cards': 'Cards',
  'projects.view_table': 'Table',
  'projects.register_cta': 'Register now & request NDA',
  'projects.col.mandate': 'Mandate',
  'projects.col.type': 'Type',
  'projects.col.new_since': 'New since',
  'projects.view': 'View →',
  'projects.reset': 'Reset filters',

  // Anmeldung / Registrierung
  'auth.login_title': 'Log in',
  'auth.login_sub': 'Access to mandates, documents and the data room',
  'auth.email': 'Email address',
  'auth.password': 'Password',
  'auth.forgot': 'Forgot password?',
  'auth.no_account': 'No account yet?',
  'auth.register_now': 'Register',
  'auth.register_title': 'Register',
  'auth.have_account': 'Already registered?',
  'auth.login_now': 'Log in',
  'auth.submitting': 'Please wait…',

  // Dashboard
  'dashboard.title': 'My area',


  // Navigation, ergänzt v0.411
  'nav.succession': 'Succession',
  'nav.succession_profile': 'Succession profile',

  // Anmelden
  'auth.claim': 'Exclusive mandate platform · a brand of Phalanx GmbH',
  'auth.resend_verification': 'Send the confirmation email again',
  'auth.twofactor_hint': 'Your account is protected by two-factor authentication. Please enter the six-digit code from your authenticator app, or one of your backup codes.',
  'auth.code': 'Code',
  'auth.checking': 'Checking…',
  'auth.confirm': 'Confirm',
  'auth.sso_failed': 'Signing in via Phalanx OS did not work',
  'auth.sso_fallback': 'Please sign in with your email address and password.',
  'auth.sso_button': 'Sign in with Phalanx OS',
  'auth.sso_note': 'For staff of Phalanx GmbH',
  'auth.register_now': 'Register now',

  // Registrierung
  'reg.title': 'Free registration: access to selected mandates',
  'reg.verify_title': 'Please confirm your email address',
  'reg.verify_sent_to': 'Confirmation email sent to:',
  'reg.to_login': 'To the login',
  'reg.role_buyer': 'I am looking (buyer)',
  'reg.role_seller': 'I am selling (seller)',
  'reg.salutation': 'Form of address *',
  'reg.password': 'Password *',
  'reg.segment_q': 'What describes you best?',
  'reg.succession_interest': 'Your interest in succession',
  'reg.succ_with_equity': 'Succession with an equity stake',
  'reg.succ_without_equity': 'Succession without a stake (operational leadership)',
  'reg.buyer_type': 'Type of buyer',
  'reg.as_seller': 'As a seller',
  'reg.mobile_note': 'Required: the basis for two-factor authentication later on.',
  'reg.privacy_link': 'privacy notice',
  'reg.accept_privacy': 'Please accept the privacy notice.',
  'reg.submit': 'Register free of charge',
  'reg.submitting': 'Registering…',
  'reg.seg_successor': 'Interested in succession',
  'reg.seg_professional': 'Professional buyer',
  'reg.seg_successor_note': 'MBI or MBO, I would like to take over a company',
  'reg.seg_professional_note': 'Strategic buyer, investor, family office, adviser',
  'reg.company_selling': 'Company (for sale)',
  'reg.network_note': 'As someone interested in succession you are part of our succession network, free of charge, with matching and events.',

  // Käufertypen
  'buyer.strategic': 'Strategic buyer',
  'buyer.financial': 'Financial investor / private equity',
  'buyer.angel': 'Business angel',
  'buyer.vc': 'Venture capital',
  'buyer.family_office': 'Family office',
  'buyer.advisor': 'M&A adviser with a search mandate',

  // Allgemein
  'common.cancel': 'Cancel',
  'common.choose': 'Please choose…',

  // Footer
  'footer.imprint': 'Imprint',
  'footer.privacy': 'Privacy',
  'footer.contact': 'Contact',
  'footer.terms': 'Terms',
  'footer.cookies': 'Cookies',
};

const DICT = { de: {}, en: EN };
const I18nCtx = createContext({ lang: 'de', t: (k, d) => d, setLang: () => {}, gewaehlt: false });

const SPRACHEN = ['de', 'en'];
const normal = (l) => (SPRACHEN.includes(String(l || '').slice(0, 2).toLowerCase())
  ? String(l).slice(0, 2).toLowerCase() : null);

/**
 * Welche Sprache gilt beim ersten Aufschlag?
 *
 * Reihenfolge, und die ist bewusst so:
 *   1. die eigene Wahl, falls schon einmal getroffen. Sie gewinnt immer.
 *   2. die Sprache des Browsers. Wer sein Geraet auf Englisch stellt, will
 *      keine deutsche Seite.
 *   3. Deutsch.
 *
 * Die Sprache aus dem Profil kommt spaeter dazu, sobald der Nutzer geladen
 * ist, und nur dann, wenn er noch nie selbst gewaehlt hat.
 */
function ersteSprache() {
  try {
    const gewaehlt = normal(localStorage.getItem('cm_lang'));
    if (gewaehlt) return { lang: gewaehlt, gewaehlt: true };
  } catch { /* privater Modus */ }
  try {
    const liste = navigator.languages && navigator.languages.length
      ? navigator.languages : [navigator.language];
    for (const l of liste) { const n = normal(l); if (n) return { lang: n, gewaehlt: false }; }
  } catch { /* kein Browser */ }
  return { lang: 'de', gewaehlt: false };
}

export function I18nProvider({ children }) {
  const start = ersteSprache();
  const [lang, setLangState] = useState(start.lang);
  // Hat der Nutzer selbst gewaehlt? Dann ueberschreibt nichts mehr seine Wahl.
  const [gewaehlt, setGewaehlt] = useState(start.gewaehlt);

  // Das Sprachattribut des Dokuments mitfuehren: Vorleseprogramme, Suchmaschinen
  // und die Silbentrennung des Browsers richten sich danach.
  useEffect(() => {
    try { document.documentElement.lang = lang; } catch { /* SSR */ }
  }, [lang]);

  /**
   * Sprache aus dem Profil uebernehmen, aber nur als Vorschlag.
   * Wer schon selbst gewaehlt hat, behaelt seine Wahl.
   */
  const ausProfil = useCallback((sprache) => {
    const l = normal(sprache);
    if (!l || gewaehlt) return;
    setLangState(l);
  }, [gewaehlt]);

  const setLang = useCallback((next) => {
    const l = next === 'en' ? 'en' : 'de';
    setLangState(l);
    setGewaehlt(true);
    try { localStorage.setItem('cm_lang', l); } catch { /* privater Modus */ }
    try { document.documentElement.lang = l; } catch { /* SSR-Sicherheit */ }
    // Beim eingeloggten Nutzer die Präferenz mitschreiben (still, ohne UI-Effekt)
    try {
      const token = localStorage.getItem('token');
      if (token) {
        fetch('/api/profile/language', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ language: l }),
        }).catch(() => {});
      }
    } catch { /* egal */ }
  }, []);

  // t(schlüssel, deutscherText): deutscher Text ist zugleich der Fallback
  const t = useCallback((key, de) => {
    if (lang === 'de') return de;
    return DICT[lang]?.[key] ?? de;
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t, gewaehlt, ausProfil }),
    [lang, setLang, t, gewaehlt, ausProfil]);
  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export const useI18n = () => useContext(I18nCtx);
export const useT = () => useContext(I18nCtx).t;
