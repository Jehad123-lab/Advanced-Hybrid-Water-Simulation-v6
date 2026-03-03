
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const typography = {
  Type: {
    Expressive: {
      Display: {
        L: { fontSize: { desktop: '56px', tablet: '52px', mobile: '48px' }, lineHeight: 1.2, fontWeight: 700, letterSpacing: '-0.02em', tag: 'h1', fontFamily: "'Bebas Neue', sans-serif" },
        M: { fontSize: { desktop: '44px', tablet: '40px', mobile: '40px' }, lineHeight: 1.2, fontWeight: 700, letterSpacing: '-0.02em', tag: 'h2', fontFamily: "'Bebas Neue', sans-serif" },
        S: { fontSize: '36px', lineHeight: 1.2, fontWeight: 700, letterSpacing: '-0.02em', tag: 'h3', fontFamily: "'Bebas Neue', sans-serif" },
      },
      Headline: {
        L: { fontSize: '32px', lineHeight: 1.25, fontWeight: 700, letterSpacing: '0em', tag: 'h4', fontFamily: "'Bebas Neue', sans-serif" },
        M: { fontSize: '28px', lineHeight: 1.25, fontWeight: 700, letterSpacing: '0em', tag: 'h5', fontFamily: "'Bebas Neue', sans-serif" },
        S: { fontSize: '24px', lineHeight: 1.25, fontWeight: 700, letterSpacing: '0em', tag: 'h6', fontFamily: "'Bebas Neue', sans-serif" },
      },
      Quote: { fontSize: '24px', lineHeight: 1.5, fontWeight: 400, letterSpacing: '0.01em', tag: 'blockquote', fontFamily: "'Comic Neue', cursive" },
      Data: { fontSize: '12px', lineHeight: 1.5, fontWeight: 400, letterSpacing: '0.03em', tag: 'code', fontFamily: "'Victor Mono', monospace" },
    },
    Readable: {
      Title: {
        L: { fontSize: '22px', lineHeight: '28px', fontWeight: 600, letterSpacing: '0em', tag: 'h3', fontFamily: "'Inter', sans-serif" },
        M: { fontSize: '16px', lineHeight: '24px', fontWeight: 600, letterSpacing: '0em', tag: 'h4', fontFamily: "'Inter', sans-serif" },
        S: { fontSize: '14px', lineHeight: '20px', fontWeight: 600, letterSpacing: '0em', tag: 'h5', fontFamily: "'Inter', sans-serif" },
      },
      Body: {
        L: { fontSize: '16px', lineHeight: '24px', fontWeight: 400, letterSpacing: '0.01em', tag: 'p', fontFamily: "'Inter', sans-serif" },
        M: { fontSize: '14px', lineHeight: '20px', fontWeight: 400, letterSpacing: '0.01em', tag: 'p', fontFamily: "'Inter', sans-serif" },
        S: { fontSize: '12px', lineHeight: '16px', fontWeight: 400, letterSpacing: '0.01em', tag: 'p', fontFamily: "'Inter', sans-serif" },
        // New responsive token for subheadings
        PageSubheading: { fontSize: { mobile: '14px', tablet: '16px' }, lineHeight: { mobile: '20px', tablet: '24px' }, fontWeight: 400, letterSpacing: '0.01em', tag: 'p', fontFamily: "'Inter', sans-serif" },
      },
      Label: {
        L: { fontSize: '14px', lineHeight: '20px', fontWeight: 500, letterSpacing: '0.02em', tag: 'span', fontFamily: "'Inter', sans-serif" }, // Medium weight
        M: { fontSize: '12px', lineHeight: '16px', fontWeight: 500, letterSpacing: '0.02em', tag: 'span', fontFamily: "'Inter', sans-serif" },
        S: { fontSize: '11px', lineHeight: '16px', fontWeight: 500, letterSpacing: '0.02em', tag: 'span', fontFamily: "'Inter', sans-serif" },
      },
    }
  }
};
