'use client';

import React, { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log client error for debugging in development
    console.error('Unhandled runtime error:', error);
  }, [error]);

  return (
    <div className="container" style={{ textAlign: 'center', padding: 'var(--space-16) var(--space-4)' }}>
      <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--status-error)', fontSize: 'var(--text-lg)', marginBottom: 'var(--space-2)' }}>
        Error
      </p>
      <h1 style={{ marginBottom: 'var(--space-4)' }}>Something Went Wrong</h1>
      <p style={{ maxWidth: '460px', margin: '0 auto var(--space-6)', fontSize: 'var(--text-base)' }}>
        An unexpected error occurred. You can attempt to reload the application state.
      </p>
      <button onClick={() => reset()} className="btn btn-primary" type="button">
        Try Again
      </button>
    </div>
  );
}
