export type SiteIdentity = {
  name: string;
  iconUrl: string | null;
  fallbackLabel: string;
};

function getMetaContent(selector: string): string | null {
  const content = document.querySelector<HTMLMetaElement>(selector)?.content?.trim();
  return content ? content : null;
}

export function getSiteNameFromTitle(title: string): string | null {
  const segments = title
    .split(/\s+[|·\-–—:]\s+/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length >= 3) {
    return segments[segments.length - 1] ?? null;
  }

  if (segments.length === 2) {
    return segments[0].length <= segments[1].length ? segments[0] : segments[1];
  }

  return null;
}

export function getHostnameLabel(): string {
  return window.location.hostname.replace(/^www\./, '').trim() || 'Website';
}

function getSiteIconUrl(): string | null {
  const selectors = [
    'link[rel="apple-touch-icon"]',
    'link[rel="apple-touch-icon-precomposed"]',
    'link[rel="icon"]',
    'link[rel="shortcut icon"]',
    'link[rel*="icon"]',
  ];

  for (const selector of selectors) {
    const href = document.querySelector<HTMLLinkElement>(selector)?.href?.trim();
    if (href) {
      return new URL(href, window.location.href).href;
    }
  }

  return window.location.origin.startsWith('http')
    ? new URL('/favicon.ico', window.location.origin).href
    : null;
}

export function getSiteFallbackLabel(name: string): string {
  const match = name.match(/[A-Za-z0-9]/);
  return match?.[0]?.toUpperCase() ?? '•';
}

export function getSiteIdentity(): SiteIdentity {
  const name =
    getMetaContent('meta[property="og:site_name"]') ??
    getMetaContent('meta[name="application-name"]') ??
    getMetaContent('meta[name="apple-mobile-web-app-title"]') ??
    getSiteNameFromTitle(document.title) ??
    getHostnameLabel();

  return {
    name,
    iconUrl: getSiteIconUrl(),
    fallbackLabel: getSiteFallbackLabel(name),
  };
}
