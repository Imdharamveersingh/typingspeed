import Link from 'next/link';
import { AggregatedWeakCharacter } from '@/engine/progressTypes';

interface WeakKeysCardProps {
  weakKeys: AggregatedWeakCharacter[];
}

export const WeakKeysCard: React.FC<WeakKeysCardProps> = ({ weakKeys }) => {
  return (
    <div className="progress-weak-keys-card" role="region" aria-label="Persistent Weak Keys Summary">
      <div className="weak-keys-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h3>Focus Keys &amp; Problem Characters</h3>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            Most frequent mistyped characters aggregated across all completed tests
          </p>
        </div>
        {weakKeys.length > 0 && (
          <Link
            href="/practice"
            className="btn btn-outline"
            style={{ fontSize: 'var(--text-xs)', padding: 'var(--space-1) var(--space-3)' }}
            data-testid="practice-weak-keys-btn"
          >
            Practice Weaknesses →
          </Link>
        )}
      </div>

      {weakKeys.length === 0 ? (
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--status-success)', marginTop: 'var(--space-2)' }}>
          No persistent weak keys detected yet! Great accuracy.
        </p>
      ) : (
        <div className="weak-keys-grid">
          {weakKeys.map((item, idx) => (
            <div key={idx} className="weak-key-item">
              <div className="weak-key-char-badge">{item.displayLabel}</div>
              <div className="weak-key-details">
                <div className="weak-key-count">
                  {item.totalMistakes} {item.totalMistakes === 1 ? 'mistake' : 'mistakes'}
                </div>
                <div className="weak-key-meta">
                  Across {item.testsCount} {item.testsCount === 1 ? 'test' : 'tests'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WeakKeysCard;
