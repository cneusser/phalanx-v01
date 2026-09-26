import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { useT } from '../i18n';

/**
 * Zurück nach oben.
 *
 * Die Startseite ist lang, und wer unten im Fuß steht, soll nicht zurück
 * wischen müssen. Der Knopf erscheint erst nach einer Bildschirmhöhe, damit
 * er oben nichts verdeckt, und er sitzt über dem Markenwechsler, nicht darauf.
 *
 * Wer die Tastatur benutzt, erreicht ihn regulär in der Tabulatorreihenfolge.
 * Wer eine reduzierte Bewegung eingestellt hat, springt ohne Animation.
 */
export default function NachOben() {
  const t = useT();
  const [sichtbar, setSichtbar] = useState(false);

  useEffect(() => {
    const pruefe = () => setSichtbar(window.scrollY > window.innerHeight * 0.9);
    pruefe();
    window.addEventListener('scroll', pruefe, { passive: true });
    window.addEventListener('resize', pruefe);
    return () => {
      window.removeEventListener('scroll', pruefe);
      window.removeEventListener('resize', pruefe);
    };
  }, []);

  const hoch = () => {
    const ruhig = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: ruhig ? 'auto' : 'smooth' });
    // Der Fokus muss mitwandern, sonst liest ein Vorleseprogramm weiter unten.
    const ziel = document.querySelector('main, h1') || document.body;
    if (ziel && ziel.focus) { ziel.setAttribute('tabindex', '-1'); ziel.focus({ preventScroll: true }); }
  };

  const text = t('allgemein.nach_oben', 'Nach oben');

  return (
    <button
      type="button"
      className={`nach-oben${sichtbar ? ' sichtbar' : ''}`}
      onClick={hoch}
      aria-label={text}
      title={text}
    >
      <ArrowUp aria-hidden="true" />
    </button>
  );
}
