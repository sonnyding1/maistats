import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  detectSystemLanguage,
  interpolate,
  normalizeLanguagePreference,
} from './i18n';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('interpolate', () => {
  it('replaces provided template variables', () => {
    expect(interpolate('Hello, {{name}}!', { name: 'maistats' })).toBe('Hello, maistats!');
  });

  it('keeps missing placeholders visible', () => {
    expect(interpolate('Hello, {{name}}!', {})).toBe('Hello, {{name}}!');
  });
});

describe('detectSystemLanguage', () => {
  it('detects chinese from navigator languages', () => {
    vi.stubGlobal('navigator', {
      languages: ['zh-CN', 'en-US'],
      language: 'en-US',
    });

    expect(detectSystemLanguage()).toBe('zh');
  });

  it('falls back to english for non-chinese locales', () => {
    vi.stubGlobal('navigator', {
      languages: ['ja-JP'],
      language: 'ja-JP',
    });

    expect(detectSystemLanguage()).toBe('en');
  });
});

describe('normalizeLanguagePreference', () => {
  it('accepts supported preferences', () => {
    expect(normalizeLanguagePreference('system')).toBe('system');
    expect(normalizeLanguagePreference('zh')).toBe('zh');
    expect(normalizeLanguagePreference('en')).toBe('en');
  });

  it('falls back to system for unknown values', () => {
    expect(normalizeLanguagePreference('ja')).toBe('system');
    expect(normalizeLanguagePreference(null)).toBe('system');
  });
});
