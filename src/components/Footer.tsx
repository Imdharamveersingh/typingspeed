import React from 'react';
import Link from 'next/link';

export const Footer: React.FC = () => {
  return (
    <footer className="app-footer" role="contentinfo">
      <div className="container footer-inner">
        <div>
          <p style={{ fontWeight: 500, color: 'var(--text-primary)', marginBottom: '2px' }}>
            Typing Platform
          </p>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
            Practice typing, track progress, and improve.
          </p>
        </div>
        <ul className="footer-links">
          <li>
            <Link href="#privacy" className="footer-link">
              Privacy
            </Link>
          </li>
          <li>
            <Link href="#about" className="footer-link">
              About
            </Link>
          </li>
          <li>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-link"
            >
              GitHub
            </a>
          </li>
        </ul>
      </div>
    </footer>
  );
};

export default Footer;
