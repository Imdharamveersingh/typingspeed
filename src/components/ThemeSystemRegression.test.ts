import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ThemeToggle } from './ThemeToggle';
import { Header } from './Header';

describe('TypingSpeed Light and Dark Theme System Refinements', () => {
  const cssPath = path.resolve(__dirname, '../styles/globals.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');

  // =========================================================================
  // 1. Light Theme Tokens
  // =========================================================================
  describe('1. Light Theme Tokens (#FFFFFF Pure White Canvas)', () => {
    it('defines --bg-primary as #FFFFFF and --bg-surface as #FFFFFF in :root', () => {
      const rootBlockMatch = cssContent.match(/:root\s*\{([^}]+)\}/);
      expect(rootBlockMatch).not.toBeNull();
      const rootBlock = rootBlockMatch![1];

      expect(rootBlock).toMatch(/--bg-primary:\s*#FFFFFF/i);
      expect(rootBlock).toMatch(/--bg-surface:\s*#FFFFFF/i);
      expect(rootBlock).toMatch(/--text-primary:\s*#111827/i);
      expect(rootBlock).toMatch(/--border-subtle:\s*#E4E4E7/i);
    });
  });

  // =========================================================================
  // 2. Dark Theme Tokens
  // =========================================================================
  describe('2. Dark Theme Tokens (#0F0F10 Foundation)', () => {
    it('defines the dark theme foundation tokens in [data-theme="dark"]', () => {
      const darkBlockMatch = cssContent.match(/\[data-theme="dark"\]\s*\{([^}]+)\}/);
      expect(darkBlockMatch).not.toBeNull();
      const darkBlock = darkBlockMatch![1];

      expect(darkBlock).toMatch(/--bg-primary:\s*#0F0F10/i);
      expect(darkBlock).toMatch(/--bg-surface:\s*#18181B/i);
      expect(darkBlock).toMatch(/--bg-secondary:\s*#202023/i);
      expect(darkBlock).toMatch(/--text-primary:\s*#F5F5F5/i);
      expect(darkBlock).toMatch(/--text-secondary:\s*#A1A1AA/i);
      expect(darkBlock).toMatch(/--border-subtle:\s*#2F2F33/i);
    });
  });

  // =========================================================================
  // 3. Header & Body Merging Without Separator
  // =========================================================================
  describe('3. Header & Body Seamless Merge', () => {
    it('body and header both use var(--bg-primary) with no header border', () => {
      expect(cssContent).toMatch(/body\s*\{[^}]*background-color:\s*var\(--bg-primary\);/s);
      expect(cssContent).toMatch(/\.app-header\s*\{[^}]*background-color:\s*var\(--bg-primary\);/s);
      expect(cssContent).toMatch(/\.app-header\s*\{[^}]*border-bottom:\s*none;/s);
    });
  });

  // =========================================================================
  // 4. Theme Toggle Component & Header Placement
  // =========================================================================
  describe('4. Theme Toggle & Accessibility', () => {
    it('renders ThemeToggle button with accessible aria-label and icon SVG', () => {
      const html = renderToStaticMarkup(React.createElement(ThemeToggle));
      expect(html).toContain('theme-toggle-btn');
      expect(html).toContain('aria-label');
      expect(html).toContain('svg');
      expect(html).toContain('theme-toggle-icon');
    });

    it('Header renders ThemeToggle inside header-actions', () => {
      const html = renderToStaticMarkup(React.createElement(Header));
      expect(html).toContain('header-actions');
      expect(html).toContain('theme-toggle-btn');
      expect(html).toContain('Take Test');
      expect(html).toContain('Practice');
      expect(html).toContain('Progress');
      expect(html).toContain('Gov Job Test');
    });
  });

  // =========================================================================
  // 5. Layout Theme Initialization
  // =========================================================================
  describe('5. Theme Script in layout.tsx', () => {
    const layoutPath = path.resolve(__dirname, '../app/layout.tsx');
    const layoutContent = fs.readFileSync(layoutPath, 'utf-8');

    it('layout initializes typingspeed_theme with light default', () => {
      expect(layoutContent).toContain('typingspeed_theme');
      expect(layoutContent).toContain('data-theme');
      expect(layoutContent).toMatch(/data-theme="light"/);
    });
  });
});
