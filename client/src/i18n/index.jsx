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

  // Mandatsdetail, ergänzt v0.414
  'pd.datei_nicht_hochgeladen': 'The file has not been uploaded yet.',
  'pd.gestellt_am': 'Asked on',
  'pd.oeffnen': 'Open',

  'pd.nda_unterschrieben': 'NDA signed, approval pending',
  'pd.zugang_frei': 'Access granted',
  'pd.zugang_abgelehnt': 'Access declined',

  'msg.intro': 'Discreet exchange with your confirmed contacts.',
  'msg.kontakt_hinzufuegen': 'ADD A CONTACT',
  'msg.keine_kontakte': 'No contacts yet. Add someone by email above.',
  'msg.links_waehlen': 'Choose a conversation on the left.',
  'msg.keine_nachrichten': 'No messages yet. Write the first one.',
  'msg.uebernehmen': 'Apply',
  'msg.zuruecknehmen': 'Withdraw',
  'msg.erst_nach_annahme': 'Messages are possible once the contact request has been accepted.',
  'msg.nda_freigeben': 'Approve the NDA and open the data room for this contact',
  'msg.platzhalter': 'Message…  Enter starts a new line.',
  'msg.senden_tastatur': 'Send (Cmd or Ctrl + Enter)',
  'msg.zuruecknehmen_frage': 'Withdraw this message? It has not been delivered yet.',
  'msg.nda_freigegeben': 'NDA approved, data room opened ✓',
  'fb.an_team': 'Message to the team',
  'fb.danke': 'Thank you for your feedback',
  'fb.danke_text': 'We look at every note and get in touch if we have questions.',
  'fb.was_ist_neu': 'What is new',
  'fb.platzhalter': 'What could we do better? Which feature would you like to see?',
  'fb.aenderungswunsch': 'Change request',
  'fb.zu_kurz': 'Please write your message (at least 5 characters).',
  'fb.kein_roboter': 'Please confirm that you are not a robot.',
  'vk.keine_interessenten': 'No interested parties in your mandates yet.',
  'vk.keine_bewegung': 'No activity in the past 14 days.',
  'vk.kein_unternehmen': 'No company submitted yet',
  'vk.kein_unternehmen_text': 'Click "Submit a company" to get started.',
  'vk.schliessen': 'Close',
  'vk.keine_im_prozess': 'Nobody in the process yet.',
  'vk.vertraulich': 'Confidential, visible only to invited people',
  'vk.stand_fehlt': 'Process status not available: ',
  'vk.eingereicht': 'Submitted. It becomes visible once an administrator has reviewed it.',
  'vk.status_geaendert': 'Status changed.',
  'vk.in_pruefung': 'Under review',
  'vk.schliessen_frage': 'Really close this listing? It will no longer be visible afterwards.',
  'prof.unvollstaendig': 'Profile incomplete.',
  'prof.pflicht': '(required to take part in a process)',
  'prof.bitte_waehlen': 'Please choose…',
  'prof.pitchbook': 'Your profile (pitchbook)',
  'prof.suchkriterien': 'Search criteria and investment preferences',
  'prof.umsatz_von': 'Revenue from (EUR m)',
  'prof.sofort': 'Immediately, as soon as something is posted',
  'prof.woechentlich': 'Once a week, bundled',
  'prof.gar_nicht': 'Not at all',
  'prof.strasse': 'Street and number *',
  'prof.ueber_uns': 'About us and our investment approach',
  'prof.ueber_unternehmen': 'About the company',
  'prof.ph_ansatz': 'e.g. focus, ticket sizes, previous investments, how you add value…',
  'prof.ph_unternehmen': 'e.g. business model, history, reason for the transaction…',
  'prof.hinweis_neu': 'A note as soon as a new mandate is published in the marketplace.',
  'prof.hinweis_folgen': 'Changes, new documents, the profile and status changes (due diligence, LOI, closing). You follow a mandate automatically once you express interest, or manually via the star.',
  'prof.hinweis_aehnlich_titel': 'Notes about similar mandates',
  'prof.hinweis_aehnlich': 'Matching new mandates based on the ones you have shown interest in so far.',
  'nf.laedt': 'Loading profile...',
  'nf.passende': 'Succession mandates that match you',
  'nf.basiswert': 'Base score. Add sector, region and revenue and the score rises.',
  'nf.plz_ort': 'Postcode and town',
  'nf.fuehrung': 'Leadership experience (number of employees)',
  'nf.zielllaender': 'Target countries',
  'nf.regionen': 'Regions and states (several possible, empty means nationwide)',
  'nf.umsatzgroesse': 'Revenue size',
  'nf.bitte_waehlen': 'Please choose',
  'nf.branchenfokus': 'Sector focus (several possible)',
  'nf.verfuegbarkeit': 'Availability',
  'nf.wie_berechnet': 'How is the match calculated?',
  'nf.ph_plz': 'e.g. 90402 Nuremberg',
  'nf.ph_branchen': 'Which sectors have you worked in?',
  'nf.ph_funktionen': 'e.g. sales, production, finance, management',
  'nf.finanzierung': 'Funding and availability',
  'nf.ph_mittel': 'e.g. EUR 300,000 of own funds, a development loan is conceivable',
  'nf.ph_ab_wann': 'e.g. right away, or in three months',
  'nf.ph_sonstiges': 'What else should we know?',
  'nf.gespeichert': 'Saved. Thank you, your succession profile is up to date.',
  'nf.umsatz_1': 'under EUR 1m',
  'nf.umsatz_1_3': 'EUR 1m to 3m',
  'nf.umsatz_3_10': 'EUR 3m to 10m',
  'nf.umsatz_10_30': 'EUR 10m to 30m',
  'nf.umsatz_30': 'over EUR 30m',
  'nf.mbi_beteiligung': 'Investment only',
  'nf.mbi_partnerschaft': 'Strategic partnership',
  'nf.mbi_fuehrung': 'Taking over operational leadership',
  'nf.mbi_andere': 'Other',
  'bw.titel': 'What is your company worth?',
  'bw.ihre_angaben': 'Your figures',
  'bw.bitte_waehlen': 'Please choose …',
  'bw.gruendungsjahr': 'Year founded',
  'bw.falls_nicht_ebit': 'if not already included in EBIT',
  'bw.sondertraege': 'one-off income, will be adjusted out',
  'bw.fuer_equity': 'for the equity value indication',
  'bw.qualitaet': 'Quality factors',
  'bw.korridor': 'Your indicative value range',
  'bw.nicht_positiv': 'The adjusted sustainable result is not positive, so earnings-based methods give no meaningful value here. Talk to us for an individual assessment.',
  'bw.nach_abzug': 'After deducting net financial debt (equity value, indicative): approx.',
  'bw.report_erhalten': 'Receive the detailed PDF report',
  'bw.cta_titel': 'Planning a sale or a succession?',
  'bw.cta_text': 'We accompany you from a sound valuation through to closing, confidentially and professionally.',
  'bw.ph_name': 'Your name',
  'bw.ph_mail': 'Your email address *',
  'bw.frage_inhaber': 'How much does the business depend on the owner?',
  'bw.stark_abhaengig': 'Highly dependent',
  'bw.laeuft_ohne': 'Runs without the owner',
  'bw.frage_kunden': 'What does the customer base look like?',
  'bw.wenige_grosse': 'A few large customers',
  'bw.frage_wiederkehrend': 'Recurring revenue?',
  'bw.frage_fuehrung': 'Second tier of management or a team?',
  'bw.fehlt_branche': 'Please choose a sector.',
  'bw.fehlt_zahlen': 'Please enter revenue and/or EBIT.',
  'bw.fehlt_mail': 'Please enter an email address and accept the privacy notice.',
  'bw.report_fertig': 'Your valuation report has been created and downloaded, and also sent by email.',
  'ab.titel': 'Detailed company valuation',
  'ab.intro': 'A guided, multi-step valuation with adjustments, a quality scorecard, capitalised earnings and a debt service check, delivered as a detailed PDF report. Indicative, not an IDW S1 opinion.',
  'ab.frei_bis': 'The detailed valuation is available until',
  'ab.ihre_bewertungen': 'Your valuations',
  'ab.keine': 'No valuation yet. Start a new one at the top right.',
  'ab.oeffnen': 'Open',
  'ab.uebersicht': 'Back to the overview',
  'ab.vom_ebit_ab': 'is deducted from EBIT',
  'ab.ueberzahlung': 'Overpayment to shareholders, added back',
  'ab.fuer_equity': 'for the equity value',
  'ab.scorecard_hinweis': 'Rate each factor from −2 (very weak) to +2 (very good). This shifts the multiple and the risk premium.',
  'ab.kapitaldienst': 'Debt service assumptions (buyer view)',
  'ab.small_size': 'Small size premium (%)',
  'ab.personalquote': 'for the sector comparison of the personnel cost ratio',
  'ab.kein_ergebnis': 'No result yet. Click "Calculate".',
  'ab.nicht_positiv': 'The adjusted sustainable result is not positive, so earnings-based methods give no meaningful value here.',
  'ab.equity_value': 'Equity value (after net financial debt): approx.',
  'ab.report_laden': 'Download the detailed PDF report',
  'ab.zurueck': 'Back',
  'ab.ph_historie': 'from history',
  'ab.f_inhaber': 'Dependence on the owner',
  'ab.f_inhaber_frage': 'Does the business run without the owner?',
  'ab.f_kunden_frage': 'How broad is the customer base?',
  'ab.f_fuehrung': 'Second tier of management',
  'ab.f_fuehrung_frage': 'Does a team carry the responsibility?',
  'ab.f_wettbewerb_frage': 'How strong is the competitive position?',
  'ab.f_stabilitaet': 'Stability',
  'ab.f_stabilitaet_frage': 'How independent of economic cycles and seasons?',
  'ab.f_prozesse_frage': 'How mature are processes and IT?',
  'ab.geprueft': 'Audited',
  'ab.fehlt_branche': 'Please choose a sector.',
  'ab.substanz': 'Asset base and buyer',
  'ab.fortfuehrungswert': 'Share of going concern value',
  'bw.einwilligung': 'I consent to my details being stored and used to create and send the report and to contact me about projects',
  'bw.widerruf': 'You can withdraw this at any time.',
  'ab.kostenlos': 'free of charge.',
  'fb.kat_idee': 'Idea or wish',
  'fb.kat_fehler': 'Report a problem',
  'fb.kat_sonst': 'Other',
  'bw.teils': 'Partly',
  'bw.gemischt': 'Mixed',
  'bw.breit': 'Widely spread',
  'bw.kaum': 'Hardly any',
  'bw.teilweise': 'In part',
  'bw.hoher_anteil': 'A high share',
  'bw.frage_stau': 'Deferred investment?',
  'bw.hoch': 'High',
  'bw.etwas': 'Some',
  'bw.kein_stau': 'None',
  'bw.fehlt': 'Missing',
  'bw.im_aufbau': 'Being built up',
  'bw.etabliert': 'Established',
  'ab.f_kunden': 'Customer spread',
  'ab.f_markt': 'Market position',
  'ab.f_investition': 'Investment situation',
  'ab.f_investition_frage': 'Is there deferred investment?',
  'ab.f_digital': 'Digitalisation',
  'ab.st_entwurf': 'Draft',
  'ab.st_berechnet': 'Calculated',
  // Kontakt, ergänzt v0.414
  'contact.kicker': 'Get in touch',
  'contact.titel': 'A conversation costs you twenty minutes',
  'contact.name_label': 'Your name',
  'contact.email_label': 'Your email address',
  'contact.message_label': 'Your message',
  'contact.error': 'It did not work',
  'contact.datenschutz': 'We use your details only to answer your enquiry. Servers in the European Union.',
  'contact.termin_titel': 'Rather talk directly',
  'contact.termin_text': 'Pick a time that suits you. Twenty minutes, confidential, no obligation.',
  'contact.termin_extern': 'Open the booking page in its own window',

  // Datenraum, ergänzt v0.414
  'dr.hinweis': 'Open a folder with one click; you can view every document.',
  'dr.zurueck': 'Back to the folder',
  'dr.leer': 'This folder is empty.',
  'dr.groesse': 'Size',
  'dr.geaendert': 'Changed',
  'dr.vertraulich': 'Confidential, approval required. Please get in touch.',
  'dr.suche': 'Search the data room, including document text',
  'dr.hoeher': 'One level up (backspace)',
  'dr.alles_markieren': 'Select everything on this level',
  'dr.download_fehler': 'Download not possible.',
  'dr.archiv_packt': 'Packing the archive…',
  'dr.und': ' and ',

  // Mein Bereich, ergänzt v0.414
  'db.freigegeben': 'Released for you',
  'db.bereich_nachfolge': 'Your personal succession area',
  'db.profil_nachfolge': 'Your succession profile',
  'db.keine_treffer': 'No matches yet',
  'db.profil_ausfuellen': 'Complete your profile',
  'db.so_finden_sie': 'How to find your company',
  'db.bereich_ma': 'Your personal M&A area',
  'db.stand_unten': 'You can see where each mandate stands below under "My deals".',
  'db.vorbereitete': 'Mandates prepared for you',
  'db.vorbereitete_text': 'We have prepared these mandates for you. Sign the confidentiality agreement and we will release the documents.',
  'db.suchen_nachfolge': 'Looking for a company to take over?',
  'db.suchen_nachfolge_text': 'Complete the succession profile and receive matching mandates.',
  'db.kein_deal': 'No deal started yet',
  'db.kaeuferprofil': 'Complete your buyer profile',
  'db.kaeuferprofil_text': 'Define your search criteria for automatic matching',
  'db.gesperrt': 'still locked',
  'db.fragebogen_offen': 'Not completed yet. The questionnaire is the basis for matching mandates.',
  'db.fragebogen_ausfuellen': 'Complete the questionnaire',
  'db.profil_fertig': 'Profile completed',
  'db.nachfolgeprofil_ausfuellen': 'Complete the succession profile',
  'db.schritt1': 'Experience, target sectors, region, budget and scenario (MBI or MBO).',
  'db.schritt2': 'Sign the NDA for a matching mandate and request the documents.',
  'db.schritt3_titel': 'Enter the process',
  'db.schritt3': 'Data room, talks with the owner, through to the handover.',
  'db.ma_schritt1_titel': 'Choose a mandate',
  'db.ma_schritt1': 'Open an anonymous short profile in the marketplace that fits you.',
  'db.ma_schritt2': 'Request access and sign the confidentiality agreement online. It takes two minutes.',
  'db.ma_schritt3': 'After signing we release the profile, the information memorandum and the data room for you.',
  'db.ma_schritt4_titel': 'Talks and offer',
  'db.ma_schritt4': 'Ask questions via Q&A, then come the management meeting and an indicative offer.',
  'db.ansehen_zugang': 'View and request access',
  'db.ansehen_nda': 'View and sign the NDA',
  'db.siegel_aktiv': 'Your seal is active. Sellers can see that you commit to discretion.',
  'db.siegel_text': 'A one-time, platform-wide promise of confidentiality. It signals that you are serious and improves your chances of finding the right company.',
  'db.hoechstes_level': 'Highest level reached 🎉',
  'pd.laedt': 'Loading mandate...',
  'pd.expose_ansehen': 'View the full profile',
  'pd.beschreibung_voll': 'Full description',
  'pd.problem_loesung': 'Problem and solution',
  'pd.aehnliche': 'Similar mandates',
  'pd.details_im_cim': 'Company details are provided in the CIM.',
  'pd.finanzplan_im_cim': 'A detailed financial plan is available in the CIM.',
  'pd.dok_oeffentlich': 'Public documents',
  'pd.ohne_nda': 'Available without an NDA',
  'pd.kein_teaser': 'No public teaser available.',
  'pd.unterlagen_nach_nda': 'Full documents once the NDA is approved',
  'pd.keine_vertraulichen': 'No confidential documents uploaded yet.',
  'pd.keine_fragen': 'No questions asked yet.',
  'pd.ihr_zugang': 'Your access',
  'pd.gruendungsjahr': 'YEAR FOUNDED',
  'pd.frage_platzhalter': 'Your question about this mandate…',
  'pd.aehnliche_anzeigen': 'Show similar mandates',
  'pd.dealtyp_anzeigen': 'Show mandates with this deal type',
  'pd.nda_angefordert': 'NDA requested, review pending',
  'pd.nda_versendet': 'NDA sent, please sign',
  'pd.hinweis_registrieren': 'Register to request access to confidential information.',
  'pd.hinweis_unterzeichnet': 'Your confidentiality agreement is signed and under brief review. We will then open the data room and Q&A.',
  'pd.hinweis_ein_schritt': 'One step left: sign the confidentiality agreement digitally, it takes two minutes. The short profile, documents and data room open immediately afterwards.',
  'pd.hinweis_zugang_anfordern': 'Request access and you can sign the confidentiality agreement digitally right away and receive the documents.',
  'pd.unterlagen_nach_freigabe': 'Documents once approved',
  'pd.infos_nach_nda': 'Full information once the NDA is approved',
  'pd.hinweis_pitchdeck': 'We release the pitch deck and short profile after a brief review, no NDA needed. For the data room we will contact you separately.',
  'pd.hinweis_nach_nda': 'The full company description, financials, team details and confidential documents become available once the NDA is approved.',
  'pd.hinweis_angefragt': 'Requested. We will review briefly and then release the documents.',
  'pd.gruenderteam': 'Founding team',
  'pd.download_fehler': 'Download failed, please try again later.',
  'pd.expose_fehlt': 'Profile PDF not available',
  'pd.datei_folgt': 'Your adviser will provide the file shortly',
  'pd.folgt_in_kuerze': 'Coming shortly',
  'pd.frage_uebermittelt': 'Question submitted. We will email you as soon as there is an answer.',
  'pd.antwort_gespeichert': 'Answer saved and emailed to the person who asked.',
  'pd.haeufige_frage': 'Frequent question',
  'pd.fuer_alle_sichtbar': 'Visible to everyone',
  'pd.frage_von_anderem': 'Asked by another interested party',
  'pd.wartet_auf_antwort': 'Awaiting an answer',
  'pd.wird_geoeffnet': 'Opening…',
  'pd.chat_starten': 'Start a chat with your adviser',
  'pd.nicht_mehr_folgen': 'Stop following this mandate',
  'pd.folgen': 'Follow this mandate and be notified of changes',
  'pd.sie_folgen': '★ Following',
  'pd.nda_unterzeichnen': 'Sign the NDA now',
  'pd.nda_anfordern_cim': 'Request an NDA to receive the full CIM, team details and financial plan.',
  'pd.nda_anfordern_zugang': 'Request a confidentiality agreement (NDA) to gain access.',
  'pd.tab_overview': 'Overview',
  'pd.tab_company': 'Company',
  'pd.tab_market': 'Market and potential',
  'pd.tab_financials': 'Financials',
  'pd.tab_documents': 'Documents',
  'pd.tab_contact': 'Contact',
  'pd.management': 'Management',
  'pd.beantwortet': 'Answered',
  'pd.folgen_kurz': '☆ Follow',
  'qa.titel': 'Q&A',
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
