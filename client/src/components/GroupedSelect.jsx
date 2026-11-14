import React from 'react';
import { useI18n } from '../i18n';
import { naceLabel, naceGruppe } from '../constants/projectOptions';

/**
 * Select mit Options-Gruppen (z. B. NACE-Abschnitte).
 * groups: [{ group: 'Label', options: ['…'] }] ODER flaches Array von Strings.
 * Legacy-Werte (nicht in der Liste) bleiben auswählbar, damit Bestandsprojekte
 * editierbar sind.
 *
 * Zweisprachig seit v0.470: Angezeigt wird die Beschriftung in der gewählten
 * Sprache, gespeichert wird weiterhin der deutsche Wert. Wer die Sprache
 * umschaltet, soll dieselbe Branche behalten und nicht eine neue bekommen.
 */
export default function GroupedSelect({ value, onChange, groups, style, required }) {
  const { t, lang } = useI18n();
  const groupList = Array.isArray(groups) && groups.length && typeof groups[0] === 'string'
    ? [{ group: null, options: groups }]
    : groups;
  const allOptions = groupList.flatMap(g => g.options);
  const zeige = (o) => naceLabel(o, lang);
  return (
    <select value={value || ''} onChange={onChange} required={required} style={{ background: '#fff', ...style }}>
      <option value="">{t('allgemein.bitte_waehlen', 'Bitte wählen…')}</option>
      {value && !allOptions.includes(value) && (
        <option value={value}>{value} {t('allgemein.bisheriger_wert', '(bisheriger Wert)')}</option>
      )}
      {groupList.map((g, i) => g.group ? (
        <optgroup key={i} label={naceGruppe(g.group, lang)}>
          {g.options.map(o => <option key={o} value={o}>{zeige(o)}</option>)}
        </optgroup>
      ) : (
        g.options.map(o => <option key={o} value={o}>{zeige(o)}</option>)
      ))}
    </select>
  );
}
