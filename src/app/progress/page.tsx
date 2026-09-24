import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import ProgressDashboard from '@/components/progress/ProgressDashboard';

export const metadata: Metadata = {
  title: 'Progress & Milestones',
  description:
    'Track your personal typing speed progression, accuracy trends, weak keys, and milestone badges with local-first analytics.',
  alternates: {
    canonical: '/progress',
  },
};

export default function ProgressPage() {
  return (
    <div className="container" style={{ paddingBottom: 'var(--space-12)' }}>
      <Suspense
        fallback={
          <div className="progress-loading-placeholder" aria-busy="true">
            <p style={{ color: 'var(--text-muted)' }}>Loading local typing history...</p>
          </div>
        }
      >
        <ProgressDashboard />
      </Suspense>
    </div>
  );
}
