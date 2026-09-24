'use client';

import React, { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global application error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ backgroundColor: '#0f1117', color: '#f0f3f8', fontFamily: 'sans-serif', padding: '2rem', textAlign: 'center' }}>
        <h1 style={{ marginBottom: '1rem' }}>Application Encountered a Fatal Error</h1>
        <p style={{ marginBottom: '1.5rem', color: '#9da7be' }}>
          Please try refreshing or clicking the button below.
        </p>
        <button
          onClick={() => reset()}
          type="button"
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#38bdf8',
            color: '#0f1117',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          Reload
        </button>
      </body>
    </html>
  );
}
