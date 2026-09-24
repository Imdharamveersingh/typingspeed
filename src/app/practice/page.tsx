import React from 'react';
import type { Metadata } from 'next';
import PracticeHub from '@/components/practice/PracticeHub';

export const metadata: Metadata = {
  title: 'Typing Practice',
  description:
    'Dedicated typing practice workspace to drill your weak keys, difficult transitions, and missed words with targeted exercises.',
  alternates: {
    canonical: '/practice',
  },
};

export default function PracticePage() {
  return (
    <div className="container">
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <PracticeHub />
      </div>
    </div>
  );
}

