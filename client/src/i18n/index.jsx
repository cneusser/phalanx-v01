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
  'allgemein.nach_oben': 'Back to top',
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
  'reg.company': 'Company',
  'reg.seller_note': 'you register free of charge. Once your account is approved you can create your company profile and upload documents.',
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


  // Marktplatz, ergänzt v0.412
  'projects.filter': 'Filters',
  'projects.filter_reset': 'Reset filters',
  'projects.locked_title': 'Detailed information and documents after registration',
  'projects.locked_text': 'Register free of charge, request a non-disclosure agreement and receive the full documentation.',
  'projects.register_free': 'Register free of charge',
  'projects.open': 'Open mandate',
  'projects.watch': 'Add to watchlist',
  'projects.unwatch': 'Remove from watchlist',
  'projects.profile_prompt': 'A name for this search profile (we will notify you when a matching mandate comes up):',
  'projects.profile_saved': 'Search profile saved. We will notify you when a mandate matches.',

  // Stand einer Anfrage
  'nda.requested': 'Non-disclosure agreement requested',
  'nda.sent': 'Non-disclosure agreement sent',
  'nda.signed': 'Non-disclosure agreement signed',
  'nda.approved': 'Access granted',
  'nda.rejected': 'Declined',

  // Nachfolge-Netzwerk
  'succ.kicker': 'SUCCESSION NETWORK',
  'succ.hero_title': 'Take over a company rather than take the next job',
  'succ.cta_free': 'Register free of charge',
  'succ.hero_text': 'CapitalMatch brings together people with entrepreneurial ambition and owners looking for a successor. On the platform, at matching events and in person. Free of charge for those interested in succession.',
  'succ.for_whom_text': 'For aspiring entrepreneurs, experienced managers and investors who would like to take over a company. As a managing director with a stake (MBI), as part of a management buy-out (MBO), or as a successor bringing in capital themselves. With or without an equity stake of your own, you will find the right route here.',
  'succ.questions': 'Questions? Talk to us',
  'succ.for_whom': 'Who is this network for?',
  'succ.how_start': 'Getting started is simple',
  'succ.p1_t': 'Matching on the platform',
  'succ.p2_t': 'Matching events',
  'succ.p3_t': 'Events and exchange',
  'succ.text1': 'You record your profile and your search criteria. We suggest matching succession situations, discreetly and without putting your details on public display.',
  'succ.text2': 'At our events you meet owners handing over in person. A conversation often says more than any prospectus, particularly in a succession.',
  'succ.text3': 'Impulses, first-hand accounts and a network of people taking the same step, or who have already taken it.',
  'succ.s1_t': 'Create a profile and search criteria',
  'succ.s2_t': 'Discover matching successions',
  'succ.s3_t': 'Start a conversation',
  'succ.text4': 'You register as someone interested in succession and choose whether you are looking with or without an equity stake.',
  'succ.text5': 'Industry, region, size and your experience. The clearer your profile, the better the suggestions.',
  'succ.text6': 'You receive suggestions on the platform and invitations to matching events.',
  'succ.text7': 'If it fits, we put you in touch with the owner and accompany the road from there.',
  'succ.free_title': 'Free of charge for those interested in succession',
  'succ.free_text': 'Your membership, the matching and the events cost you nothing. The network is funded by the owners who are looking for a successor.',
  'succ.discreet_title': 'Discreet and compliant with data protection law',
  'succ.discreet_text': 'Your details are not on public display. You decide when and with whom you enter a conversation. Everything runs confidentially through the platform.',
  'succ.first_step': 'Take the first step',
  'succ.first_step_text': 'Registration takes two minutes. After that we take care of finding the right suggestions.',
  'succ.join_now': 'Join now, free of charge',

  // Kontakt
  'contact.name': 'Your name *',
  'contact.email': 'Your email address *',
  'contact.message': 'Your message *',
  'contact.subject': 'Subject',
  'contact.send': 'Send message',
  'contact.sending': 'Sending…',
  'contact.thanks': 'Thank you',
  'contact.thanks_text': 'Your message has arrived, we will come back to you shortly.',
  'contact.not_robot': 'I am not a robot.',
  'contact.required': 'Please provide a name, an email address and a message.',
  'contact.robot_required': 'Please confirm that you are not a robot.',
  'contact.intro': 'Do you have questions about CapitalMatch, about a mandate or about our advisory work? We look forward to your message and will come back to you in person shortly.',
  'contact.brand_note': 'CapitalMatch is a brand of Phalanx GmbH. Further details in the',

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
