/** Changelog v0.409 (Neue Oberfläche, neue Mails, Spannen statt Zahlen). */
const ENTRY = {
  version: 'v0.409', released_on: '2026-09-26',
  title: 'Neues Gesicht, und ein ehrlicheres dazu',
  items: [
    'Startseite in der Bildsprache von phalanx.de: Georgia-Überschriften, Phalanx-Navy, ein Goldakzent, Trennlinien statt bunter Karten. Wer zwischen den Auftritten wechselt, merkt keinen Bruch mehr',
    'Unten rechts läuft der Markenwechsler mit, unten links die Terminbuchung. Beides wie auf phalanx.de',
    'Ein Designsystem als eine Datei statt fünf verschiedener Blautöne in fünf Dateien',
    'Jede Aussage gestrichen, die sich nicht belegen lässt: kein "100 Prozent Vertraulichkeit", keine "Identitätsprüfung", die es nie gab, keine Zahlenleiste, die auf "k. A." fallen kann',
    'Stattdessen steht dort, wer hinter der Plattform arbeitet, mit Werdegang und nachprüfbaren Angaben',
    'Eigener Abschnitt für das Nachfolge-Netzwerk: Suchprofil statt Bewerbung, Mandate vor der Veröffentlichung, Begleitung bei Kaufpreis und Finanzierung, kostenfrei für Übernehmende',
    'Öffentlich zeigt der Marktplatz nur noch Größenordnungen. Stadt, Highlights, Bewertung und Anteil erscheinen erst nach Freischaltung, Unterlagen erst nach Vertraulichkeitsvereinbarung',
    'Alle Mails der Plattform sehen neu aus. Das Layout steht an einer Stelle, deshalb gilt es sofort für Registrierung, Freischaltung, Passwort, Benachrichtigungen und Kampagnen',
    'Jede Mail bietet jetzt einen Termin an und verweist auf die aktuellen Mandate',
    'Die Terminbuchung läuft über Phalanx OS statt über einen fremden Dienst. Der Kalender wird an einer Stelle gepflegt, die Daten der Anfragenden bleiben im Haus',
    'Neue Rundmail an registrierte Konten: nur bestätigte, aktive und freigeschaltete Adressen, Widerspruch und Sperrliste gelten, Versand in Rationen von Hand, Abmeldung über einen Einmal-Link',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
