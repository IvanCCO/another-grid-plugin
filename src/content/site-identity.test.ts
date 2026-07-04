import { afterEach, describe, expect, it } from 'vitest';
import {
  getHostnameLabel,
  getSiteFallbackLabel,
  getSiteIdentity,
  getSiteNameFromTitle,
} from './site-identity';

function resetHead(): void {
  document.head.innerHTML = '';
  document.title = '';
}

describe('getSiteNameFromTitle', () => {
  it('returns null when there is nothing to split', () => {
    expect(getSiteNameFromTitle('Homepage')).toBeNull();
  });

  it('picks the shorter segment when there are exactly two', () => {
    expect(getSiteNameFromTitle('Article Title | Acme')).toBe('Acme');
    expect(getSiteNameFromTitle('Acme | A Much Longer Article Title')).toBe('Acme');
  });

  it('picks the last segment when there are three or more', () => {
    expect(getSiteNameFromTitle('Section - Article Title - Acme News')).toBe('Acme News');
  });
});

describe('getHostnameLabel', () => {
  it('strips the www prefix from the hostname', () => {
    expect(getHostnameLabel()).toBe(window.location.hostname.replace(/^www\./, '') || 'Website');
  });
});

describe('getSiteFallbackLabel', () => {
  it('returns the first alphanumeric character uppercased', () => {
    expect(getSiteFallbackLabel('acme')).toBe('A');
    expect(getSiteFallbackLabel('42 Studio')).toBe('4');
  });

  it('falls back to a bullet when there is no alphanumeric character', () => {
    expect(getSiteFallbackLabel('•••')).toBe('•');
  });
});

describe('getSiteIdentity', () => {
  afterEach(() => {
    resetHead();
  });

  it('prefers og:site_name over other sources', () => {
    document.head.innerHTML = `
      <meta property="og:site_name" content="Acme Corp" />
      <meta name="application-name" content="Ignored" />
    `;
    document.title = 'Ignored Title';

    expect(getSiteIdentity().name).toBe('Acme Corp');
  });

  it('falls back to application-name then apple-mobile-web-app-title', () => {
    document.head.innerHTML = `<meta name="application-name" content="App Name" />`;
    expect(getSiteIdentity().name).toBe('App Name');

    document.head.innerHTML = `<meta name="apple-mobile-web-app-title" content="Apple Name" />`;
    expect(getSiteIdentity().name).toBe('Apple Name');
  });

  it('falls back to the document title, then the hostname', () => {
    document.title = 'My Article | My Site';
    expect(getSiteIdentity().name).toBe('My Site');

    document.title = '';
    expect(getSiteIdentity().name).toBe(getHostnameLabel());
  });

  it('resolves an absolute icon url from a relative favicon link', () => {
    document.head.innerHTML = `<link rel="icon" href="/favicon.png" />`;
    const identity = getSiteIdentity();
    expect(identity.iconUrl).toBe(new URL('/favicon.png', window.location.href).href);
  });

  it('falls back to /favicon.ico at the origin when no icon link exists', () => {
    document.head.innerHTML = '';
    const identity = getSiteIdentity();
    expect(identity.iconUrl).toBe(new URL('/favicon.ico', window.location.origin).href);
  });

  it('derives the fallback label from the resolved name', () => {
    document.head.innerHTML = `<meta property="og:site_name" content="zebra" />`;
    expect(getSiteIdentity().fallbackLabel).toBe('Z');
  });
});
