import React from 'react';
import { TypingHistoryEntry } from '@/engine/progressTypes';
import { formatDuration } from '@/utils/metrics';

interface ProgressHistoryProps {
  entries: TypingHistoryEntry[];
}

export const ProgressHistory: React.FC<ProgressHistoryProps> = ({ entries }) => {
  if (entries.length === 0) {
    return null;
  }

  const formatTimestamp = (ts: number): string => {
    try {
      const date = new Date(ts);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Recent';
    }
  };

  return (
    <div className="progress-history-card" role="region" aria-label="Detailed Test History">
      <div className="progress-history-header">
        <div>
          <h3>Recent Test History</h3>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            Latest completed tests (stored locally on this device)
          </p>
        </div>
      </div>

      <div className="progress-table-container">
        <table className="progress-table">
          <thead>
            <tr>
              <th>Date &amp; Time</th>
              <th>Duration</th>
              <th>Net WPM</th>
              <th>Accuracy</th>
              <th>Errors</th>
              <th>Keystrokes</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="progress-table-row">
                <td className="progress-table-date">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <span>{formatTimestamp(entry.timestamp)}</span>
                    <span
                      style={{
                        fontSize: '10px',
                        padding: '1px 5px',
                        borderRadius: '3px',
                        background: entry.language === 'hi' ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-surface)',
                        color: entry.language === 'hi' ? '#f59e0b' : 'var(--text-muted)',
                        border: '1px solid var(--border-subtle)',
                        fontWeight: 'var(--font-semibold)',
                      }}
                    >
                      {entry.language === 'hi' ? 'HI' : 'EN'}
                    </span>
                  </div>
                </td>
                <td>{formatDuration(entry.duration)}</td>
                <td className="progress-table-wpm">
                  <strong>{entry.netWpm}</strong> <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>WPM</span>
                </td>
                <td className="progress-table-accuracy">{entry.accuracy}%</td>
                <td className="progress-table-errors">
                  <span style={{ color: entry.incorrectChars + entry.extraChars > 0 ? 'var(--status-error)' : 'inherit' }}>
                    {entry.incorrectChars + entry.extraChars}
                  </span>
                </td>
                <td className="progress-table-strokes">{entry.totalKeystrokes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProgressHistory;
