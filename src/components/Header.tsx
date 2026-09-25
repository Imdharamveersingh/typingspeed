'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import logoImg from '@/assets/logo-tight.png';

export const Header: React.FC = () => {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  const isHome = pathname === '/';
  const isPractice = pathname === '/practice' || pathname.startsWith('/practice/');
  const isProgress = pathname === '/progress' || pathname.startsWith('/progress/');
  const isExam = pathname === '/exam' || pathname.startsWith('/exam/');

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Close mobile menu when clicking outside or pressing Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        mobileMenuOpen &&
        headerRef.current &&
        !headerRef.current.contains(e.target as Node)
      ) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [mobileMenuOpen]);

  return (
    <header className="app-header" role="banner" ref={headerRef}>
      <div className="header-inner">
        {/* Brand Logo on the Left */}
        <div className="header-left">
          <Link href="/" className="brand" aria-label="TypingSpeed Home">
            <Image
              src={logoImg}
              alt="TypingSpeed"
              className="brand-logo"
              priority
            />
          </Link>
        </div>

        {/* Primary Desktop Navigation on the Right */}
        <nav className="header-nav" aria-label="Main Navigation">
          <ul className="nav-links">
            <li>
              <Link href="/" className={`nav-link ${isHome ? 'active' : ''}`}>
                Take Test
              </Link>
            </li>
            <li>
              <Link
                href="/practice"
                className={`nav-link ${isPractice ? 'active' : ''}`}
              >
                Practice
              </Link>
            </li>
            <li>
              <Link
                href="/progress"
                className={`nav-link ${isProgress ? 'active' : ''}`}
              >
                Progress
              </Link>
            </li>
            <li>
              <Link
                href="/exam"
                className={`nav-link ${isExam ? 'active' : ''}`}
              >
                Gov Job Test
              </Link>
            </li>
          </ul>
        </nav>

        {/* Mobile Menu Toggle Button */}
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-expanded={mobileMenuOpen}
          aria-label="Toggle navigation menu"
          aria-controls="mobile-navigation"
        >
          {mobileMenuOpen ? (
            /* Close Icon (✕) */
            <svg
              className="mobile-menu-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            /* Hamburger Icon (☰) */
            <svg
              className="mobile-menu-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Navigation Dropdown */}
      <nav
        id="mobile-navigation"
        className={`mobile-nav-menu ${mobileMenuOpen ? 'open' : ''}`}
        aria-label="Mobile Navigation"
      >
        <ul className="mobile-nav-links">
          <li>
            <Link
              href="/"
              className={`mobile-nav-link ${isHome ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Take Test
            </Link>
          </li>
          <li>
            <Link
              href="/practice"
              className={`mobile-nav-link ${isPractice ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Practice
            </Link>
          </li>
          <li>
            <Link
              href="/progress"
              className={`mobile-nav-link ${isProgress ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Progress
            </Link>
          </li>
          <li>
            <Link
              href="/exam"
              className={`mobile-nav-link ${isExam ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Gov Job Test
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
};

export default Header;
