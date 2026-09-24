import React from 'react';
import { TestDuration, TestStatus } from '@/engine/types';

interface DurationSelectorProps {
  selectedDuration: TestDuration;
  status: TestStatus;
  onSelectDuration: (duration: TestDuration) => void;
}

const DURATIONS: { label: string; value: TestDuration }[] = [
  { label: '1 min', value: 60 },
  { label: '3 min', value: 180 },
  { label: '5 min', value: 300 },
  { label: '10 min', value: 600 },
];

export const DurationSelector: React.FC<DurationSelectorProps> = ({
  selectedDuration,
  status,
  onSelectDuration,
}) => {
  const isRunning = status === 'running';

  return (
    <div
      className="duration-selector"
      role="group"
      aria-label="Select test duration"
    >
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 500, marginRight: 'var(--space-1)' }}>
        Duration:
      </span>
      {DURATIONS.map((d) => {
        const isActive = selectedDuration === d.value;
        return (
          <button
            key={d.value}
            type="button"
            className={`duration-btn ${isActive ? 'active' : ''}`}
            onClick={() => onSelectDuration(d.value)}
            disabled={isRunning}
            aria-pressed={isActive}
            aria-label={`${d.label} test`}
          >
            {d.label}
          </button>
        );
      })}
    </div>
  );
};

export default DurationSelector;
