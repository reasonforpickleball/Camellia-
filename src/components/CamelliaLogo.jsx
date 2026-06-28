import React from 'react';

// New logo URLs from NewLogosCA.zip
// 1.png = square icon with yellow bg (for sidebars/bottom bars)
// 2.png = flower only, no text, no bg (for small logos)
// 3.png = flower + "camellia" text (for big logos)
const LOGO_ICON = 'https://media.base44.com/images/public/6a36d7f24a9a8c3a2c9b47d9/c2cb1a65a_1.png';
const LOGO_SMALL = 'https://media.base44.com/images/public/6a36d7f24a9a8c3a2c9b47d9/73e5dfbbe_2.png';
const LOGO_WITH_TEXT = 'https://media.base44.com/images/public/6a36d7f24a9a8c3a2c9b47d9/407d67e21_3.png';

// Large logo (big areas, hero, landing) — with text
export function CamelliaLogoLarge() {
  return (
    <img
      src={LOGO_WITH_TEXT}
      alt="Camellia"
      style={{ width: 90, height: 90, objectFit: 'contain' }}
    />
  );
}

// Sidebar/nav logo — icon with yellow background
export function CamelliaLogoSidebar() {
  return (
    <img
      src={LOGO_ICON}
      alt="Camellia"
      style={{ width: 52, height: 52, objectFit: 'contain', borderRadius: 12 }}
    />
  );
}

// Small logo (nav, pop quiz header, footers) — flower only, no text
export function CamelliaLogoSmall() {
  return (
    <img
      src={LOGO_SMALL}
      alt="Camellia"
      style={{ width: 44, height: 44, objectFit: 'contain', flexShrink: 0 }}
    />
  );
}

// Chat mini (ask panel) — flower only
export function CamelliaLogoChatMini() {
  return (
    <img
      src={LOGO_SMALL}
      alt="Camellia"
      style={{ width: 48, height: 48, objectFit: 'contain', flexShrink: 0 }}
    />
  );
}

// Keep old names as aliases
export const DsLogoLarge = CamelliaLogoLarge;
export const DsLogoSmall = CamelliaLogoSmall;
export const DsLogoChatMini = CamelliaLogoChatMini;

export { LOGO_ICON, LOGO_SMALL, LOGO_WITH_TEXT };
