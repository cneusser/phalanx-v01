// ─────────────────────────────────────────────────────────────────────────────
// Die Beratung wird ihren Mandaten zugeordnet (v0.495)
//
// Bis hierher öffnete die Rolle advisor jedes Mandat, schreibend. Ab dieser
// Fassung entscheidet die Zuordnung: wer das Mandat angelegt hat oder in
// project_members steht.
//
// Damit am Tag der Umstellung niemandem etwas wegbricht, trägt diese Migration
// jede heute bestehende Beratung als Mitglied (editor) in jedes heute
// bestehende Mandat ein. Der Zustand von gestern bleibt damit erhalten, und
// alles Neue beginnt mit der engeren Regel: Ein neues Mandat gehört zunächst
// dem, der es anlegt, und die Verwaltung ordnet weitere Personen zu.
//
// Bewusst NICHT getan: Rechte wegnehmen. Diese Migration entfernt keine
// Zuordnung und keine Rolle. Wer nach der Umstellung weniger sehen soll, wird
// von Hand aus project_members entfernt, nachvollziehbar und einzeln.
// ─────────────────────────────────────────────────────────────────────────────

exports.up = async function (knex) {
  const berater = await knex('users').where({ role: 'advisor' }).select('id', 'email');
  if (!berater.length) return;

  const mandate = await knex('projects').select('id', 'tenant_id', 'created_by');
  let gesetzt = 0;
  for (const b of berater) {
    for (const m of mandate) {
      if (m.created_by === b.id) continue; // ist ohnehin Pflegender
      const da = await knex('project_members').where({ project_id: m.id, user_id: b.id }).first().catch(() => null);
      if (da) continue;
      await knex('project_members').insert({
        tenant_id: m.tenant_id || 1,
        project_id: m.id,
        user_id: b.id,
        member_role: 'editor',
      }).catch(() => {});
      gesetzt += 1;
    }
  }
  console.log(`🔗 Beraterbindung: ${berater.length} Beratung(en) an ${mandate.length} Mandat(e), ${gesetzt} Zuordnung(en) neu angelegt.`);
};

exports.down = async function () {
  // Zuordnungen bleiben stehen. Sie wegzuräumen hiesse, jemandem den Zugang zu
  // nehmen, den er vorher hatte, und das soll eine Rücknahme nie tun.
};
