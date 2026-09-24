import type { Metadata, Viewport } from 'next';
import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { SITE_URL } from '@/config/site';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: {
    template: '%s | TypingSpeed',
    default: 'TypingSpeed — Modern Typing Improvement & Speed Practice',
  },
  description:
    'Practice typing, analyze mistakes, isolate weak keys, and prepare for competitive exams with high-precision metrics.',
  applicationName: 'TypingSpeed',
  authors: [{ name: 'TypingSpeed Team' }],
  keywords: [
    'typing test',
    'typing practice',
    'WPM test',
    'typing speed',
    'accuracy test',
    'mistake analysis',
    'weak key practice',
    'SSC typing test',
    'Hindi typing',
  ],
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'TypingSpeed — Modern Typing Improvement & Speed Practice',
    description:
      'Practice typing, understand your mistakes, and improve your speed with targeted diagnostics and exam modes.',
    siteName: 'TypingSpeed',
    type: 'website',
    locale: 'en_US',
    url: '/',
  },
  twitter: {
    card: 'summary',
    title: 'TypingSpeed — Modern Typing Improvement & Speed Practice',
    description:
      'Practice typing, understand your mistakes, and improve your speed with targeted diagnostics and exam modes.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: '#0f1117',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('typingspeed_theme');
                  var theme = saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                  document.documentElement.setAttribute('data-theme', theme);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <div className="app-shell">
          <Header />
          <main id="main-content" className="app-main" tabIndex={-1}>
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
