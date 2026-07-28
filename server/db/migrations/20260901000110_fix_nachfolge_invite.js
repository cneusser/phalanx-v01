/**
 * Fix der Nachfolge-Einladung: Begrüßung und Signatur aus dem Vorlagentext
 * entfernen. Der Mailrahmen setzt beides bereits, sonst stand der Name doppelt.
 * Wird nur angewandt, wenn die Vorlage noch die alte Begrüßungszeile enthält
 * (also nicht vom Admin bereits umgeschrieben wurde).
 */
const NEW_BODY = [
  'manche Menschen wollen nicht die nächste Stelle antreten, sondern etwas Eigenes führen. Ein Unternehmen mit Substanz, mit einem eingespielten Team und mit einer Geschichte, die weitergehen soll. Wenn Sie das anspricht, sind Sie bei CapitalMatch genau richtig.',
  'Wir bauen ein Netzwerk für Menschen, die ein Unternehmen übernehmen möchten, ob als Geschäftsführer mit Beteiligung oder als Nachfolger, der selbst investiert. Sie treffen dort auf Übergeber, die einen Nachfolger suchen, auf andere Nachfolgeinteressierte und auf Begleiter, die den Weg schon kennen.',
  'Was Sie erwartet: passende Vorschläge auf der Plattform, Matching-Events, bei denen Sie Übergeber persönlich kennenlernen, und Veranstaltungen rund um die Unternehmensnachfolge. Für Nachfolgeinteressierte ist die Teilnahme kostenfrei.',
  'Der erste Schritt kostet Sie zwei Minuten. Sie bestätigen kurz Ihre Einwilligung, legen Ihr Profil an und sagen uns, in welche Richtung Sie suchen. Um den Rest kümmern wir uns.',
  'Ich freue mich darauf, Sie im Netzwerk zu begrüßen.',
].join('\n\n');

exports.up = async function (knex) {
  await knex('mail_templates')
    .where({ key: 'nachfolge_invite' })
    .andWhere('body', 'like', '%{{anrede}} {{nachname}}%')
    .update({ body: NEW_BODY, updated_at: knex.fn.now() })
    .catch(() => {});
};

exports.down = async function () { /* kein Rückbau nötig */ };
