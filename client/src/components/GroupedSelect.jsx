import React from 'react';

/**
 * Select mit Options-Gruppen (z. B. NACE-Abschnitte).
 * groups: [{ group: 'Label', options: ['…'] }] ODER flaches Array von Strings.
 * Legacy-Werte (nicht in der Liste) bleiben auswählbar, damit Bestandsprojekte
 * editierbar sind.
 */
export default function GroupedSelect({ value, onChange, groups, style, required }) {
  const groupList = Array.isArray(groups) && groups.length && typeof groups[0] === 'string'
    ? [{ group: null, options: groups }]
    : groups;
  const allOptions = groupList.flatMap(g => g.options);
  return (
    <select value={value || ''} onChange={onChange} required={required} style={{ background: '#fff', ...style }}>
      <option value="">Bitte wählen…</option>
      {value && !allOptions.includes(value) && (
        <option value={value}>{value} (bisheriger Wert)</option>
      )}
      {groupList.map((g, i) => g.group ? (
        <optgroup key={i} label={g.group}>
          {g.options.map(o => <option key={o} value={o}>{o}</option>)}
        </optgroup>
      ) : (
        g.options.map(o => <option key={o} value={o}>{o}</option>)
      ))}
    </select>
  );
}
