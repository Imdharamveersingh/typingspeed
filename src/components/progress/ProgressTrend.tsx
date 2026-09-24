import React from 'react';
import { ProgressTrendPoint } from '@/engine/progressTypes';

interface ProgressTrendProps {
  points: ProgressTrendPoint[];
}

export const ProgressTrend: React.FC<ProgressTrendProps> = ({ points }) => {
  if (points.length === 0) {
    return null;
  }

  // Chart dimensions
  const width = 600;
  const height = 220;
  const padLeft = 45;
  const padRight = 30;
  const padTop = 30;
  const padBottom = 40;

  const chartWidth = width - padLeft - padRight;
  const chartHeight = height - padTop - padBottom;

  // Calculate scales for WPM
  const wpmValues = points.map((p) => p.netWpm);
  const minWpmRaw = Math.min(...wpmValues);
  const maxWpmRaw = Math.max(...wpmValues);

  // Pad the range slightly so lines don't clip against borders
  const minWpm = Math.max(0, minWpmRaw === maxWpmRaw ? minWpmRaw - 10 : minWpmRaw - 5);
  const maxWpm = minWpmRaw === maxWpmRaw ? maxWpmRaw + 10 : maxWpmRaw + 5;
  const wpmRange = maxWpm - minWpm || 1;

  // Generate SVG coordinates
  const getX = (idx: number) => {
    if (points.length === 1) return padLeft + chartWidth / 2;
    return padLeft + (idx / (points.length - 1)) * chartWidth;
  };

  const getY = (wpm: number) => {
    const fraction = (wpm - minWpm) / wpmRange;
    return padTop + chartHeight - fraction * chartHeight;
  };

  // Build SVG path
  const pathD = points
    .map((p, idx) => {
      const x = getX(idx);
      const y = getY(p.netWpm);
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  // Gradient area path
  const firstX = getX(0);
  const lastX = getX(points.length - 1);
  const baselineY = padTop + chartHeight;
  const areaD = `${pathD} L ${lastX.toFixed(1)} ${baselineY} L ${firstX.toFixed(1)} ${baselineY} Z`;

  return (
    <div className="progress-trend-card" role="region" aria-label="WPM Progress Trend Chart">
      <div className="progress-trend-header">
        <div>
          <h3>Speed Progression</h3>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            Net WPM history across the last {points.length} {points.length === 1 ? 'test' : 'tests'}
          </p>
        </div>
        <div className="trend-legend">
          <span className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: 'var(--accent-primary)' }} />
            Net WPM
          </span>
        </div>
      </div>

      <div className="trend-svg-wrapper">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="trend-svg"
          preserveAspectRatio="none"
          role="img"
          aria-label={`Progress chart showing WPM ranging from ${Math.round(minWpm)} to ${Math.round(maxWpm)}`}
        >
          <defs>
            <linearGradient id="wpmAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.10" />
              <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Background grid lines */}
          <line
            x1={padLeft}
            y1={padTop}
            x2={width - padRight}
            y2={padTop}
            stroke="var(--border-subtle)"
            strokeDasharray="4 4"
          />
          <line
            x1={padLeft}
            y1={padTop + chartHeight / 2}
            x2={width - padRight}
            y2={padTop + chartHeight / 2}
            stroke="var(--border-subtle)"
            strokeDasharray="4 4"
          />
          <line
            x1={padLeft}
            y1={baselineY}
            x2={width - padRight}
            y2={baselineY}
            stroke="var(--border-subtle)"
          />

          {/* Y Axis Labels */}
          <text
            x={padLeft - 8}
            y={padTop + 4}
            fill="var(--text-muted)"
            fontSize="10"
            textAnchor="end"
            fontFamily="monospace"
          >
            {Math.round(maxWpm)}
          </text>
          <text
            x={padLeft - 8}
            y={padTop + chartHeight / 2 + 3}
            fill="var(--text-muted)"
            fontSize="10"
            textAnchor="end"
            fontFamily="monospace"
          >
            {Math.round((maxWpm + minWpm) / 2)}
          </text>
          <text
            x={padLeft - 8}
            y={baselineY + 3}
            fill="var(--text-muted)"
            fontSize="10"
            textAnchor="end"
            fontFamily="monospace"
          >
            {Math.round(minWpm)}
          </text>

          {/* Shaded Area */}
          <path d={areaD} fill="url(#wpmAreaGradient)" />

          {/* Main Trend Line */}
          <path
            d={pathD}
            fill="none"
            stroke="var(--accent-primary)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points */}
          {points.map((p, idx) => {
            const cx = getX(idx);
            const cy = getY(p.netWpm);
            return (
              <g key={idx} className="trend-point-group">
                <circle
                  cx={cx}
                  cy={cy}
                  r="4"
                  fill="var(--bg-primary)"
                  stroke="var(--accent-primary)"
                  strokeWidth="2"
                />
                <text
                  x={cx}
                  y={cy - 9}
                  fill="var(--text-primary)"
                  fontSize="10"
                  textAnchor="middle"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {p.netWpm}
                </text>
                <text
                  x={cx}
                  y={baselineY + 16}
                  fill="var(--text-muted)"
                  fontSize="9"
                  textAnchor="middle"
                >
                  #{p.index}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

export default ProgressTrend;
