
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { createContext, useContext, useState, useMemo } from 'react';
import { useBreakpoint, Breakpoint } from './hooks/useBreakpoint.tsx';
import { lightThemeColors, darkThemeColors } from './theme/colors.tsx';
import { typography } from './theme/typography.tsx';
import { spacing, radius, effects, time } from './theme/tokens.tsx';

// --- DESIGN TOKENS (Tier 2, System Prompt) ---

const rawTheme = { Type: typography.Type, spacing, radius, effects, time };

const themes = { light: lightThemeColors, dark: darkThemeColors };

// --- LOGIC FOR CREATING A "SMART" THEME ---

const isResponsiveObject = (value: any): value is { [key in Breakpoint]?: any } => {
  return value && typeof value === 'object' && ('mobile' in value || 'tablet' in value || 'desktop' in value);
};

// Recursively traverses the theme tokens and resolves any responsive values.
const resolveTokens = (obj: any, breakpoint: Breakpoint): any => {
  const resolved: { [key: string]: any } = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      if (isResponsiveObject(value)) {
        resolved[key] = value[breakpoint] ?? value.desktop ?? value.tablet ?? value.mobile;
      } else if (typeof value === 'object' && value !== null) {
        resolved[key] = resolveTokens(value, breakpoint);
      } else {
        resolved[key] = value;
      }
    }
  }
  return resolved;
};

// --- GLOBAL STYLES & THEME PROVIDER ---

const GlobalStyles = () => { /* ... (no changes needed) ... */
    const globalCss = `
      *, *::before, *::after { box-sizing: border-box; }
      html, body, #root { height: 100%; margin: 0; padding: 0; font-family: ${typography.Type.Readable.Body.M.fontFamily}; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; text-rendering: optimizeLegibility; }
      body { transition: background-color ${time['Time.3x']} ease; }
    `;
    return <style>{globalCss}</style>;
};

type Resolved<T> = T extends { mobile: any } | { tablet: any } | { desktop: any }
  ? T[keyof T]
  : T extends object
  ? { [P in keyof T]: Resolved<T[P]> }
  : T;

type ResolvedRawTheme = Resolved<typeof rawTheme>;


type ThemeName = 'light' | 'dark';
type ThemeContextType = {
  themeName: ThemeName;
  setThemeName: (themeName: ThemeName) => void;
  theme: typeof lightThemeColors & ResolvedRawTheme;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: React.PropsWithChildren) => {
  const [themeName, setThemeName] = useState<ThemeName>('dark');
  const breakpoint = useBreakpoint();

  const smartTheme = useMemo(() => {
    const colorTheme = themes[themeName];
    const resolvedRawTheme = resolveTokens(rawTheme, breakpoint);
    return { ...colorTheme, ...resolvedRawTheme };
  }, [themeName, breakpoint]);

  const value = {
    themeName,
    setThemeName,
    theme: smartTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      <GlobalStyles />
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};