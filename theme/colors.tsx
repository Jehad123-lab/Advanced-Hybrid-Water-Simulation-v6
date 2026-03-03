
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const lightThemeColors = {
  Color: {
    Base: {
      Surface: { '1': '#FFFFFF', '2': '#F5F5F5', '3': '#EEEEEE' },
      Content: { '1': '#111111', '2': '#555555', '3': '#888888' }
    },
    Accent: {
      Surface: { '1': '#111111', '2': '#E0E0E0' }, // Grayscale Accent (Black)
      Content: { '1': '#FFFFFF', '2': '#111111' }  // White text on black
    },
    Success: { Surface: { '1': '#E6F4EA' }, Content: { '1': '#1E8E3E' } },
    Warning: { Surface: { '1': '#FFF8E1' }, Content: { '1': '#E67C00' } },
    Error: { Surface: { '1': '#FCE8E6' }, Content: { '1': '#C5221F' } },
    Focus: { Surface: { '1': '#E3F2FD' }, Content: { '1': '#1565C0' } }, // Blue Focus
    Signal: { Surface: { '1': '#F3E5F5' }, Content: { '1': '#6A1B9A' } } // Restored Pastel Purple
  }
};

export const darkThemeColors = {
  Color: {
    Base: {
      Surface: { '1': '#121212', '2': '#1E1E1E', '3': '#282828' },
      Content: { '1': '#E0E0E0', '2': '#AAAAAA', '3': '#777777' }
    },
    Accent: {
      Surface: { '1': '#FFFFFF', '2': '#333333' }, // Grayscale Accent (White)
      Content: { '1': '#000000', '2': '#FFFFFF' }  // Black text on white
    },
    Success: { Surface: { '1': '#1E3E2F' }, Content: { '1': '#6DD78C' } },
    Warning: { Surface: { '1': '#4A340D' }, Content: { '1': '#FF9800' } },
    Error: { Surface: { '1': '#591111' }, Content: { '1': '#FF453A' } }, // Rich Saturated Red
    Focus: { Surface: { '1': '#0D1B2A' }, Content: { '1': '#64B5F6' } }, // Blue Focus
    Signal: { Surface: { '1': '#2E0F45' }, Content: { '1': '#D9A7F7' } } // Deep Purple Surface, Light Purple Content
  }
};
