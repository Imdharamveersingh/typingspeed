/**
 * TypingSpeed — Centralized Production Site Configuration
 *
 * Configurable base URL for SEO, canonical tags, Open Graph, and sitemap generation.
 * If NEXT_PUBLIC_SITE_URL is provided in the deployment environment, it is used.
 * Otherwise, falls back to the development local URL without guessing an unverified domain.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://typingspeed.local';

export const SITE_NAME = 'TypingSpeed';

export const SITE_DESCRIPTION =
  'Practice typing, analyze mistakes, isolate weak keys, and prepare for competitive exams with high-precision metrics.';
