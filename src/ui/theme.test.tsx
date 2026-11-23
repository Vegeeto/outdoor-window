import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { App } from './App';
import { applyTheme, nextTheme } from './theme';
import { KEY, load } from '../data/storage';

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});
afterEach(cleanup);

describe('theme preference', () => {
  it('ignores invalid stored themes', () => {
    localStorage.setItem(KEY, JSON.stringify({ theme: 'purple' }));
    expect(load().theme).toBeNull();
    localStorage.setItem(KEY, JSON.stringify({ theme: 'dark' }));
    expect(load().theme).toBe('dark');
  });

  it('toggles between light and dark', () => {
    expect(nextTheme('light')).toBe('dark');
    expect(nextTheme('dark')).toBe('light');
  });

  it('sets and clears the override on <html> and theme-color', () => {
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.media = '(prefers-color-scheme: light)';
    document.head.append(meta);
    applyTheme('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(meta.content).toBe('#0f1412');
    applyTheme(null);
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(meta.content).toBe('#f5f7f6');
    meta.remove();
  });
});

describe('theme toggle', () => {
  it('follows the system first, then saves an explicit choice that survives a reload', () => {
    render(<App />);
    // jsdom has no dark system preference, so the app starts light and offers dark.
    expect(document.documentElement.dataset.theme).toBeUndefined();
    fireEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(JSON.parse(localStorage.getItem(KEY) ?? '{}').theme).toBe('dark');

    cleanup();
    render(<App />);
    expect(document.documentElement.dataset.theme).toBe('dark');
    fireEvent.click(screen.getByRole('button', { name: 'Switch to light mode' }));
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});
