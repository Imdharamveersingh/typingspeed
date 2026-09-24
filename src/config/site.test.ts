import { describe, it, expect } from 'vitest';
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from './site';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';

describe('Production Site Configuration & SEO', () => {
  it('defines valid site constants', () => {
    expect(SITE_NAME).toBe('TypingSpeed');
    expect(SITE_DESCRIPTION).toContain('Practice typing');
    expect(SITE_URL).toMatch(/^https?:\/\//);
  });

  it('generates valid robots.txt configuration referencing sitemap', () => {
    const robotsConfig = robots();
    expect(robotsConfig.rules).toBeDefined();
    expect(robotsConfig.sitemap).toBe(`${SITE_URL}/sitemap.xml`);
  });

  it('generates clean sitemap without redirect routes', () => {
    const sitemapEntries = sitemap();
    expect(Array.isArray(sitemapEntries)).toBe(true);

    const urls = sitemapEntries.map((e) => e.url);
    // Verified discoverable canonical routes
    expect(urls).toContain(`${SITE_URL}/`);
    expect(urls).toContain(`${SITE_URL}/practice`);
    expect(urls).toContain(`${SITE_URL}/exam`);
    expect(urls).toContain(`${SITE_URL}/progress`);

    // Must NOT contain redirect-only routes
    expect(urls).not.toContain(`${SITE_URL}/achievements`);
    expect(urls.length).toBe(4);
  });
});
