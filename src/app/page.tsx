import React from 'react';
import TypingTest from '@/components/typing/TypingTest';

export default function HomePage() {
  return (
    <div className="container">
      <section className="test-workspace-section" aria-label="Typing test workspace">
        <div id="practice" className="test-workspace-canvas">
          <TypingTest />
        </div>
      </section>
    </div>
  );
}
