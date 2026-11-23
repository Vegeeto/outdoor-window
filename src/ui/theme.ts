import { useEffect, useState } from 'react';
import type { Theme } from '../data/storage';

/** Page background per theme, also used for the browser UI (`theme-color`). Keep in sync with styles.css. */
const THEME_COLORS: Record<Theme, string> = { light: '#f5f7f6', dark: '#0f1412' };

export function systemTheme(): Theme {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

/**
 * Reflect the theme on <html>. `null` removes the override so CSS follows the system.
 * Kept in sync with the pre-paint script in index.html.
 */
export function applyTheme(theme: Theme | null): void {
  const root = document.documentElement;
  if (theme) root.dataset.theme = theme;
  else delete root.dataset.theme;

  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    // Without an override, each tag gets back its own colour (they carry prefers-color-scheme media queries).
    const own = meta.media.includes('dark') ? THEME_COLORS.dark : THEME_COLORS.light;
    meta.content = theme ? THEME_COLORS[theme] : own;
  });
}

/** The theme a click on the toggle should switch to. */
export function nextTheme(current: Theme): Theme {
  return current === 'dark' ? 'light' : 'dark';
}

/**
 * Apply the saved theme (or follow the system when none is saved) and report the
 * theme actually on screen, so the toggle can show the right icon.
 */
export function useTheme(saved: Theme | null): Theme {
  const [system, setSystem] = useState<Theme>(systemTheme);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setSystem(query.matches ? 'dark' : 'light');
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  useEffect(() => applyTheme(saved), [saved]);

  return saved ?? system;
}
