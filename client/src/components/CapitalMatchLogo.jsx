import React, { useState } from 'react';

// CapitalMatch brand colors — exported for use across the platform
export const CM = {
  light: '#29ABE2',  // "Capital" – sky blue
  dark:  '#1A4D8A',  // "Match"   – deep navy
};

const FONT = "'Nunito', 'Poppins', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

/**
 * CapitalMatch Logo
 *
 * Usage:
 *   white={false}  → shows the PNG logo (blue colors) — for light backgrounds (Login, Register, Landing)
 *   white={true}   → renders CSS text in white — for dark/navy backgrounds (Navbar, Footer)
 *   compact={true} → single-line "CapitalMatch" (CSS text, used in Navbar/Footer)
 *   showClaim      → shows tagline below (only in non-compact, non-white mode)
 *
 * Props:
 *   textSize  – base font size in px (default 22); also scales the PNG
 *   white     – render in white for dark backgrounds (skips PNG, uses CSS text)
 *   showClaim – show tagline "Kapital suchen. Partner finden." below
 *   compact   – single-line "CapitalMatch" inline
 */
export default function CapitalMatchLogo({
  textSize  = 22,
  height    = null,   // kept for API compatibility
  size      = null,   // kept for API compatibility
  white     = false,
  showClaim = false,
  compact   = false,
}) {
  const [imgFailed, setImgFailed] = useState(false);

  const colorCapital = white ? 'rgba(255,255,255,0.90)' : CM.light;
  const colorMatch   = white ? '#ffffff'                 : CM.dark;
  const colorClaim   = white ? 'rgba(255,255,255,0.60)' : '#6b7280';

  // ── Claim element (shared between CSS + PNG paths) ───────────────────────
  const claim = showClaim && !compact ? (
    <span style={{
      display: 'block',
      fontFamily: FONT,
      fontWeight: 500,
      fontSize: Math.round(textSize * 0.38),
      color: colorClaim,
      letterSpacing: '0.04em',
      marginTop: '0.45em',
      whiteSpace: 'nowrap',
    }}>
      Kapital suchen. Partner finden.
    </span>
  ) : null;

  // ── WHITE MODE: always CSS text (white on navy/dark backgrounds) ─────────
  if (white) {
    if (compact) {
      return (
        <div style={{ display: 'inline-flex', alignItems: 'baseline', userSelect: 'none', lineHeight: 1 }}>
          <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: textSize, color: colorCapital, letterSpacing: '-0.03em', lineHeight: 1 }}>Capital</span>
          <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: textSize, color: colorMatch,   letterSpacing: '-0.03em', lineHeight: 1 }}>Match</span>
        </div>
      );
    }
    return (
      <div style={{ display: 'inline-flex', flexDirection: 'column', userSelect: 'none', lineHeight: 1 }}>
        <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: textSize, color: colorCapital, letterSpacing: '-0.03em', lineHeight: 1.1 }}>Capital</span>
        <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: textSize, color: colorMatch,   letterSpacing: '-0.03em', lineHeight: 1.1 }}>Match</span>
        {claim}
      </div>
    );
  }

  // ── COLOUR MODE: PNG for light backgrounds (Login, Register, Landing) ────
  // PNG is 320×159 px (stacked: Capital above Match). Scale by textSize.
  const pngHeight = Math.round(textSize * 2.1);
  const pngWidth  = Math.round(pngHeight * (320 / 159));

  if (!imgFailed) {
    return (
      <div style={{ display: 'inline-flex', flexDirection: 'column', userSelect: 'none', lineHeight: 1 }}>
        <img
          src="/assets/capitalmatch-logo.png"
          alt="CapitalMatch"
          width={pngWidth}
          height={pngHeight}
          onError={() => setImgFailed(true)}
          style={{ display: 'block', objectFit: 'contain' }}
          draggable={false}
        />
        {claim}
      </div>
    );
  }

  // ── FALLBACK: CSS text if PNG fails to load ──────────────────────────────
  if (compact) {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'baseline', userSelect: 'none', lineHeight: 1 }}>
        <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: textSize, color: colorCapital, letterSpacing: '-0.03em', lineHeight: 1 }}>Capital</span>
        <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: textSize, color: colorMatch,   letterSpacing: '-0.03em', lineHeight: 1 }}>Match</span>
      </div>
    );
  }
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', userSelect: 'none', lineHeight: 1 }}>
      <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: textSize, color: colorCapital, letterSpacing: '-0.03em', lineHeight: 1.1 }}>Capital</span>
      <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: textSize, color: colorMatch,   letterSpacing: '-0.03em', lineHeight: 1.1 }}>Match</span>
      {claim}
    </div>
  );
}
