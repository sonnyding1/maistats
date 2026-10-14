import { useEffect, useState } from 'react';

export type EffectiveTheme = 'light' | 'dark';

/** The theme actually in effect, resolving the `system` preference through the media query. */
export function resolveEffectiveTheme(): EffectiveTheme {
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'light') return 'light';
  if (attr === 'dark') return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

/**
 * Tracks the effective theme so canvas and plot renders can redraw when it changes.
 *
 * Plots are drawn outside the CSS cascade, so they read colours once per render
 * and would otherwise keep the palette of whichever theme was active at mount.
 */
export function useEffectiveTheme(): EffectiveTheme {
  const [theme, setTheme] = useState<EffectiveTheme>(() => {
    if (typeof window === 'undefined') return 'dark';
    return resolveEffectiveTheme();
  });

  useEffect(() => {
    const update = () => setTheme(resolveEffectiveTheme());

    // An explicit choice is applied as data-theme on <html>.
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    // `system` leaves the attribute off, so the media query is the only signal.
    const media = window.matchMedia('(prefers-color-scheme: light)');
    media.addEventListener('change', update);

    return () => {
      observer.disconnect();
      media.removeEventListener('change', update);
    };
  }, []);

  return theme;
}
