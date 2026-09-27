import { useI18n } from '../i18n';

/**
 * Hinweis auf deutschsprachige Rechtstexte.
 *
 * Datenschutzerklärung, AGB, Cookie-Richtlinie und die Vertraulichkeits-
 * vereinbarung bleiben bewusst deutsch. Eine Übersetzung wäre kein
 * Komfortgewinn, sondern ein Risiko: eine englische Fassung kann im Streitfall
 * anders ausgelegt werden als die deutsche, und wir sind keine Anwälte.
 *
 * Englische Leser sollen aber nicht vor einer Wand aus Fremdsprache stehen.
 * Deshalb hier: ein klarer Hinweis, welche Fassung gilt, plus eine kurze
 * Zusammenfassung der Kernpunkte in ihrer Sprache. Die Zusammenfassung ist
 * ausdrücklich unverbindlich, das steht auch dort.
 *
 * Für deutsche Leser erscheint nichts. Der Hinweis wäre für sie sinnlos.
 */
export default function RechtsHinweis({ punkte = [] }) {
  const { lang } = useI18n();
  if (lang !== 'en') return null;

  return (
    <aside
      lang="en"
      style={{
        background: '#f4f6f7', borderLeft: '3px solid #c9a96e',
        padding: '1.1rem 1.3rem', margin: '0 0 2rem', fontSize: '0.88rem',
        lineHeight: 1.65, color: '#33424d',
      }}
    >
      <strong style={{ display: 'block', marginBottom: '0.5rem', color: '#111820' }}>
        This document is available in German only
      </strong>
      <p style={{ margin: '0 0 0.75rem' }}>
        The German text below is the legally binding version. The summary that follows is an
        informal courtesy translation of the main points. It is not legally binding, it is not
        complete, and it does not replace reading the German text or taking your own legal advice.
      </p>
      {punkte.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: '1.1rem', display: 'grid', gap: '0.4rem' }}>
          {punkte.map((p) => <li key={p}>{p}</li>)}
        </ul>
      )}
    </aside>
  );
}
