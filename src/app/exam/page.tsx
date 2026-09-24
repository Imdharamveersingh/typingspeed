import React from 'react';
import type { Metadata } from 'next';
import TypingTest from '@/components/typing/TypingTest';

export const metadata: Metadata = {
  title: 'Government Exam Typing Practice',
  description:
    'Simulate competitive government exam typing tests including SSC, RRB, and CPCT benchmarks with strict error evaluation.',
  alternates: {
    canonical: '/exam',
  },
};

export default function ExamPage() {
  return (
    <div className="container">
      <section style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Exam Simulation Header */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              marginBottom: 'var(--space-2)',
            }}
          >
            <span
              className="brand-badge"
              style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                color: 'var(--accent-primary)',
                borderColor: 'var(--accent-primary)',
                padding: '2px 8px',
              }}
            >
              Practice Simulation
            </span>
          </div>
          <h1
            style={{
              fontSize: 'var(--text-2xl)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              marginBottom: 'var(--space-1)',
              color: 'var(--text-primary)',
            }}
          >
            Government Exam Typing Practice Simulation
          </h1>
          <p
            style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--text-secondary)',
              maxWidth: '680px',
              margin: '0 auto',
            }}
          >
            Simulate standard examination environments and evaluation models for SSC, RRB, and CPCT typing tests.
          </p>
        </div>

        {/* Disclaimer Notice */}
        <div
          role="note"
          aria-label="Government Exam Practice Disclaimer"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3) var(--space-4)',
            marginBottom: 'var(--space-6)',
            fontSize: 'var(--text-xs)',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
          }}
        >
          <strong style={{ color: 'var(--text-primary)' }}>Important Notice: </strong>
          This is an independent practice and simulation environment designed for speed improvement and pacing preparation.
          TypingSpeed is not affiliated with, authorized by, or endorsed by the Staff Selection Commission (SSC),
          Railway Recruitment Boards (RRB), MP CPCT, or any government department or recruitment body. Official evaluation
          rules vary by recruitment notification and category.
        </div>

        {/* Primary Interactive Exam Workspace */}
        <TypingTest initialTestMode="exam" />
      </section>
    </div>
  );
}
