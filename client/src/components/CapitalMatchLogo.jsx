import React from 'react';

// CapitalMatch brand colors
export const CM = {
  light: '#29ABE2',  // "Capital" – sky blue
  dark:  '#1A4D8A',  // "Match"   – deep navy
};

/**
 * CapitalMatch Logo Component
 *
 * Props:
 *   size       – height of the logo block in px (default 40)
 *   textSize   – font size for Capital/Match text (default 22)
 *   white      – render in all-white (for dark backgrounds)
 *   showClaim  – show "Kapital suchen. Partner finden." tagline
 *   compact    – single-line layout (Capital + Match side by side, no tagline)
 */
export default function CapitalMatchLogo({
  size = 40,
  textSize = 22,
  white = false,
  showClaim = false,
  compact = false,
}) {
  const lightColor = white ? 'rgba(255,255,255,0.95)' : CM.light;
  const darkColor  = white ? '#fff'                    : CM.dark;
  const claimColor = white ? 'rgba(255,255,255,0.65)'  : CM.dark;

  const fontFamily = "'Nunito', 'Poppins', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

  if (compact) {
    // Single-line: "Capital" + "Match" side by side
    return (
      <div style={{ display: 'inline-flex', alignItems: 'baseline', userSelect: 'none', lineHeight: 1 }}>
        <span style={{
          fontFamily,
          fontWeight: 800,
          fontSize: textSize,
          color: lightColor,
          letterSpacing: '-0.02em',
        }}>Capital</span>
        <span style={{
          fontFamily,
          fontWeight: 800,
          fontSize: textSize,
          color: darkColor,
          letterSpacing: '-0.02em',
        }}>Match</span>
      </div>
    );
  }

  // Stacked two-line layout (default)
  return (
    <div style={{
      display: 'inline-flex',
      flexDirection: 'column',
      lineHeight: 1.05,
      userSelect: 'none',
    }}>
      <span style={{
        fontFamily,
        fontWeight: 800,
        fontSize: textSize,
        color: lightColor,
        letterSpacing: '-0.02em',
        lineHeight: 1.15,
      }}>
        Capital
      </span>
      <span style={{
        fontFamily,
        fontWeight: 800,
        fontSize: textSize,
        color: darkColor,
        letterSpacing: '-0.02em',
        lineHeight: 1.15,
      }}>
        Match
      </span>
      {showClaim && (
        <span style={{
          fontFamily,
          fontWeight: 400,
          fontSize: Math.round(textSize * 0.42),
          color: claimColor,
          letterSpacing: '0.04em',
          marginTop: '0.2em',
          textTransform: 'none',
          whiteSpace: 'nowrap',
        }}>
          Kapital suchen. Partner finden.
        </span>
      )}
    </div>
  );
}
