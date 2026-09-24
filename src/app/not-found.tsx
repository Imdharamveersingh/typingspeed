import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container" style={{ textAlign: 'center', padding: 'var(--space-16) var(--space-4)' }}>
      <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', fontSize: 'var(--text-lg)', marginBottom: 'var(--space-2)' }}>
        404
      </p>
      <h1 style={{ marginBottom: 'var(--space-4)' }}>Page Not Found</h1>
      <p style={{ maxWidth: '460px', margin: '0 auto var(--space-6)', fontSize: 'var(--text-base)' }}>
        The page you are looking for does not exist or may have moved.
      </p>
      <Link href="/" className="btn btn-primary">
        Return Home
      </Link>
    </div>
  );
}
