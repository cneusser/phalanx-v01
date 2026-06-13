import React, { useState } from 'react';

// CapitalMatch brand colors
export const CM = {
  light: '#29ABE2',  // "Capital" – sky blue
  dark:  '#1A4D8A',  // "Match"   – deep navy
};

const LOGO_PNG = '/assets/capitalmatch-logo.png';

const fontFamily = "'Nunito', 'Poppins', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

/**
 * CapitalMatch Logo Component
 *
 * Props:
 *   height     – height of the logo image in px (default 52)
 *   textSize   – font size used in text-fallback / compact mode (default 22)
 *   white      – render in all-white text (for dark/coloured backgrounds)
 *   showClaim  – show "Kapital suchen. Partner finden." tagline (text mode only)
 *   compact    – single-line layout (Capital + Match side by side, always text)
 *
 * Behaviour:
 *   - Default (colored, stacked): renders PNG image from /assets/capitalmatch-logo.png
 *     → if the PNG is missing, falls back to styled two-line text
 *   - white=true: always uses styled text in white (PNG can't be recolored live)
 *   - compact=true: always uses single-line styled text
 */
export default function CapitalMatchLogo({
  height    = 52,
  size      = 40,   // legacy alias for height
  textSize  = 22,
  white     = false,
  showClaim = false,
  compact   = false,
}) {
  const [imgError, setImgError] = useState(false);
  const logoHeight = height || size || 52;

  // ── Compact (single-line text, no image) ────────────────────────────────
  if (compact) {
    const lightColor = white ? 'rgba(255,255,255,0.95)' : CM.light;
    const darkColor  = white ? '#fff'                    : CM.dark;
    return (
      <div style={{ display: 'inline-flex', alignItems: 'baseline', userSelect: 'none', lineHeight: 1 }}>
        <span style={{ fontFamily, fontWeight: 800, fontSize: textSize, color: lightColor, letterSpacing: '-0.02em' }}>
          Capital
        </span>
        <span style={{ fontFamily, fontWeight: 800, fontSize: textSize, color: darkColor, letterSpacing: '-0.02em' }}>
          Match
        </span>
      </div>
    );
  }

  // ── White mode (always text, two-line) ──────────────────────────────────
  if (white) {
    return (
      <div style={{ display: 'inline-flex', flexDirection: 'column', lineHeight: 1.05, userSelect: 'none' }}>
        <span style={{ fontFamily, fontWeight: 800, fontSize: textSize, color: 'rgba(255,255,255,0.95)', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
          Capital
        </span>
        <span style={{ fontFamily, fontWeight: 800, fontSize: textSize, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
          Match
        </span>
        {showClaim && (
          <span style={{ fontFamily, fontWeight: 400, fontSize: Math.round(textSize * 0.42), color: 'rgba(255,255,255,0.65)', letterSpacing: '0.04em', marginTop: '0.2em', whiteSpace: 'nowrap' }}>
            Kapital suchen. Partner finden.
          </span>
        )}
      </div>
    );
  }

  // ── Default: PNG image (with text fallback if PNG missing) ──────────────
  if (!imgError) {
    return (
      <img
        src={LOGO_PNG}
        alt="CapitalMatch"
        height={logoHeight}
        style={{ display: 'block', objectFit: 'contain', userSelect: 'none' }}
        onError={() => setImgError(true)}
      />
    );
  }

  // ── Fallback: styled two-line text (shown when PNG not found) ───────────
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', lineHeight: 1.05, userSelect: 'none' }}>
      <span style={{ fontFamily, fontWeight: 800, fontSize: textSize, color: CM.light, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
        Capital
      </span>
      <span style={{ fontFamily, fontWeight: 800, fontSize: textSize, color: CM.dark, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
        Match
      </span>
      {showClaim && (
        <span style={{ fontFamily, fontWeight: 400, fontSize: Math.round(textSize * 0.42), color: CM.dark, letterSpacing: '0.04em', marginTop: '0.2em', whiteSpace: 'nowrap' }}>
          Kapital suchen. Partner finden.
        </span>
      )}
    </div>
  );
}
