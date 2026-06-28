import React, { createContext, useContext, useState, useEffect } from 'react';

// theme: 'light' | 'dark' | 'red'
const DarkModeContext = createContext({ dark: false, theme: 'light', setTheme: () => {}, toggle: () => {} });

export function DarkModeProvider({ children }) {
  const [theme, setThemeState] = useState(() => localStorage.getItem('camellia_theme') || 'light');

  const dark = theme === 'dark' || theme === 'red';

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('camellia_theme', theme);
    localStorage.setItem('camellia_dark_mode', dark ? 'true' : 'false');

    // Red theme: swap CSS variables to red palette + force body bg
    const root = document.documentElement;
    if (theme === 'red') {
      root.style.setProperty('--primary', '0 72% 51%');
      root.style.setProperty('--ring', '0 72% 51%');
      root.style.setProperty('--background', '0 20% 5%');
      root.style.setProperty('--foreground', '0 20% 92%');
      root.style.setProperty('--card', '0 20% 8%');
      root.style.setProperty('--border', '0 20% 18%');
      document.body.style.background = '#120508';
      document.body.style.color = '#ffe8e8';
    } else if (theme === 'dark') {
      document.body.style.background = '';
      document.body.style.color = '';
      root.style.setProperty('--primary', '290 60% 55%');
      root.style.setProperty('--ring', '290 60% 55%');
      root.style.setProperty('--background', '270 20% 5%');
      root.style.setProperty('--foreground', '270 20% 92%');
      root.style.setProperty('--card', '270 20% 8%');
      root.style.setProperty('--border', '270 20% 18%');
    } else {
      // Reset body style overrides
      document.body.style.background = '';
      document.body.style.color = '';
      // Reset to light defaults
      root.style.removeProperty('--primary');
      root.style.removeProperty('--ring');
      root.style.removeProperty('--background');
      root.style.removeProperty('--foreground');
      root.style.removeProperty('--card');
      root.style.removeProperty('--border');
    }
  }, [theme, dark]);

  const setTheme = (t) => setThemeState(t);

  // Legacy toggle: light ↔ dark
  const toggle = () => setThemeState(t => t === 'light' ? 'dark' : 'light');

  return (
    <DarkModeContext.Provider value={{ dark, theme, setTheme, toggle }}>
      {children}
    </DarkModeContext.Provider>
  );
}

export function useDarkMode() {
  return useContext(DarkModeContext);
}

// Moon/Sun/Red toggle button cluster
export function DarkModeToggle({ style = {} }) {
  const { dark, theme, setTheme } = useDarkMode();

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, ...style }}>
      {/* Light/Dark toggle */}
      <button
        onClick={() => setTheme(dark ? 'light' : 'dark')}
        title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        style={{
          width: 40, height: 40, borderRadius: '50%',
          background: dark ? 'rgba(199,125,255,0.15)' : 'rgba(123,45,110,0.1)',
          border: dark ? '1.5px solid rgba(199,125,255,0.35)' : '1.5px solid #7b2d6e40',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1rem', transition: 'all 0.2s',
          color: dark ? '#e0b8ff' : '#7b2d6e', fontWeight: 700,
        }}
      >
        {dark ? '☀' : '☽'}
      </button>

      {/* Red theme toggle — only shows in dark or red mode */}
      {dark && (
        <button
          onClick={() => setTheme(theme === 'red' ? 'dark' : 'red')}
          title={theme === 'red' ? 'Switch to purple theme' : 'Switch to red theme'}
          style={{
            width: 40, height: 40, borderRadius: '50%',
            background: theme === 'red' ? 'rgba(220,50,50,0.25)' : 'rgba(199,125,255,0.1)',
            border: theme === 'red' ? '1.5px solid rgba(255,80,80,0.6)' : '1.5px solid rgba(199,125,255,0.25)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.75rem', transition: 'all 0.2s',
            color: theme === 'red' ? '#ff8080' : '#c0a0e0', fontWeight: 700,
            letterSpacing: '-0.02em',
          }}
        >
          {theme === 'red' ? '🔴' : '🟣'}
        </button>
      )}
    </div>
  );
}
