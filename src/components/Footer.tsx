import React from 'react';
import Link from 'next/link';

export const Footer: React.FC = () => {
  return (
    <footer className="app-footer" role="contentinfo">
      <div className="container footer-inner">
        <div>
          <p style={{ fontWeight: 500, color: 'var(--text-primary)', marginBottom: '2px' }}>
            TypingSpeed
          </p>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
            Practice typing, analyze mistakes, and systematically improve.
          </p>
        </div>
        <ul className="footer-links">
          <li>
            <Link href="/practice" className="footer-link">
              Practice
            </Link>
          </li>
          <li>
            <Link href="/exam" className="footer-link">
              Exam Simulation
            </Link>
          </li>
          <li>
            <Link href="/progress" className="footer-link">
              Progress
            </Link>
          </li>
          <li>
            <a
              href="https://github.com/Imdharamveersingh/TypingSpeed"
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
