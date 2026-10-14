/**
 * Q&A: Kategorie, Verantwortlicher, interne Notiz und zwei weitere Stände (v0.460).
 *
 * Anlass: Elf Fragen von Foscari zum Mandat FARADAY, per E-Mail eingegangen.
 * Die Vorlage dafür führt Kategorie, Verantwortlichen und eine interne Notiz;
 * im Modell gab es keines davon. Ebenso wenig die Zustände „in Bearbeitung"
 * und „zurückgestellt bis Due Diligence".
 *
 * ── Warum die alten Statuswerte bleiben ────────────────────────────────────
 *
 * Es wäre schöner, durchgehend deutsche Werte zu führen: offen, in_bearbeitung,
 * zurueckgestellt, beantwortet. Dafür müsste an einem Dutzend Stellen in
 * Routen und Oberfläche der Vergleich mitgezogen werden, und jede übersehene
 * Stelle zählt danach stillschweigend falsch. Deshalb kommen die beiden neuen
 * Werte hinzu, und `open` und `answered` bleiben, wie sie sind.
 *
 * Das hat eine Folge, die mit erledigt werden muss: Wer bisher „offene Fragen"
 * zählte, fragte nach status = 'open'. Eine Frage in Bearbeitung verschwände
 * damit aus jeder Zählung, obwohl sie offener ist als je zuvor. Die Zähler
 * fragen deshalb ab jetzt nach „nicht beantwortet".
 *
 * ── Die interne Notiz ──────────────────────────────────────────────────────
 *
 * Sie steht in derselben Zeile wie die Frage, und Zeilen werden irgendwann von
 * jemandem mit SELECT * geholt. Die Käuferansicht in routes/projects.js zählt
 * ihre Felder einzeln auf; das bleibt so, und ein Test hält es fest. Eine
 * Notiz wie „vor Antwort mit Herrn Knaus abstimmen" beim Interessenten zu
 * zeigen, wäre der teuerste denkbare Fehler dieses Moduls.
 */

const NEUE_STAENDE = ['open', 'in_bearbeitung', 'zurueckgestellt', 'answered'];

exports.up = async function (knex) {
  for (const [name, bauen] of [
    ['kategorie', (t) => t.text('kategorie')],
    ['verantwortlich_id', (t) => t.integer('verantwortlich_id').references('id').inTable('users').onDelete('SET NULL')],
    ['interne_notiz', (t) => t.text('interne_notiz')],
    // Woher die Frage kam. Bisher gab es nur den Weg über die Plattform,
    // deshalb musste das nirgends stehen. Jetzt gibt es auch E-Mail und
    // Telefon, und dann ist „wann kam das rein" eine echte Frage.
    ['herkunft', (t) => t.text('herkunft')],
  ]) {
    if (!(await knex.schema.hasColumn('qa_threads', name))) {
      await knex.schema.alterTable('qa_threads', bauen);
    }
  }

  await knex.raw('ALTER TABLE qa_threads DROP CONSTRAINT IF EXISTS qa_threads_status_check');
  await knex.raw(
    `ALTER TABLE qa_threads ADD CONSTRAINT qa_threads_status_check
     CHECK (status IN (${NEUE_STAENDE.map((s) => `'${s}'`).join(',')}))`);
};

exports.down = async function (knex) {
  // Zurück auf die beiden alten Werte, sonst scheitert die alte Bedingung an
  // Zeilen, die es vorher nicht geben konnte.
  await knex('qa_threads').whereIn('status', ['in_bearbeitung', 'zurueckgestellt']).update({ status: 'open' });
  await knex.raw('ALTER TABLE qa_threads DROP CONSTRAINT IF EXISTS qa_threads_status_check');
  await knex.raw(`ALTER TABLE qa_threads ADD CONSTRAINT qa_threads_status_check CHECK (status IN ('open','answered'))`);
  for (const name of ['herkunft', 'interne_notiz', 'verantwortlich_id', 'kategorie']) {
    if (await knex.schema.hasColumn('qa_threads', name)) {
      await knex.schema.alterTable('qa_threads', (t) => t.dropColumn(name));
    }
  }
};
