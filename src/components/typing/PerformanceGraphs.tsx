'use client';

import React, { useId, useState } from 'react';
import { PerformanceSample } from '@/engine/types';

interface PerformanceGraphsProps {
  snapshots?: PerformanceSample[];
  duration: number;
}

type GraphTab = 'speed' | 'accuracy' | 'combined';

export const PerformanceGraphs: React.FC<PerformanceGraphsProps> = ({
  snapshots,
  duration,
}) => {
  const [activeTab, setActiveTab] = useState<GraphTab>('speed');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const gradientId = useId();

  // If no snapshots, don't crash; show clean notice
  if (!snapshots || snapshots.length === 0) {
    return (
      <div className="performance-graph-card" role="region" aria-label="Performance Graphs">
        <p className="graph-empty-notice">No performance timeline recorded for this session.</p>
      </div>
    );
  }

  // Ensure points are sorted by elapsedSeconds
  const points = [...snapshots].sort((a, b) => a.elapsedSeconds - b.elapsedSeconds);

  // SVG dimensions & margins
  const width = 640;
  const height = 220;
  const paddingLeft = 46;
  const paddingRight = 24;
  const paddingTop = 24;
  const paddingBottom = 32;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const maxElapsed = Math.max(
    duration,
    points[points.length - 1]?.elapsedSeconds ?? 1
  );

  // Scale functions
  const getX = (elapsed: number) => {
    return paddingLeft + (elapsed / maxElapsed) * chartWidth;
  };

  // Speed scale
  const maxWpmValue = Math.max(
    40,
    ...points.map((p) => Math.max(p.grossWpm, p.netWpm))
  );
  // Round up to nearest 10 or 20
  const speedMaxY = Math.ceil(maxWpmValue / 10) * 10 + 10;
  const speedMinY = 0;

  const getSpeedY = (wpm: number) => {
    const clamped = Math.max(speedMinY, Math.min(speedMaxY, wpm));
    return paddingTop + chartHeight - ((clamped - speedMinY) / (speedMaxY - speedMinY)) * chartHeight;
  };

  // Accuracy scale: focus on 70%-100% or min accuracy if lower
  const minAccValue = Math.min(...points.map((p) => p.accuracy));
  const accMinY = Math.max(0, Math.floor((minAccValue - 5) / 10) * 10);
  const accMaxY = 100;

  const getAccY = (acc: number) => {
    const clamped = Math.max(accMinY, Math.min(accMaxY, acc));
    return paddingTop + chartHeight - ((clamped - accMinY) / (accMaxY - accMinY)) * chartHeight;
  };

  // Build SVG path strings
  const buildPath = (getY: (p: PerformanceSample) => number): string => {
    if (points.length === 0) return '';
    if (points.length === 1) {
      const x = getX(points[0].elapsedSeconds);
      const y = getY(points[0]);
      return `M ${x} ${y} L ${width - paddingRight} ${y}`;
    }
    return points
      .map((p, idx) => {
        const x = getX(p.elapsedSeconds);
        const y = getY(p);
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  };

  const netWpmPath = buildPath((p) => getSpeedY(p.netWpm));
  const grossWpmPath = buildPath((p) => getSpeedY(p.grossWpm));
  const accPath = buildPath((p) => getAccY(p.accuracy));

  // Area under Net WPM curve
  const netWpmArea = points.length > 0
    ? `${netWpmPath} L ${getX(points[points.length - 1].elapsedSeconds).toFixed(1)} ${paddingTop + chartHeight} L ${getX(points[0].elapsedSeconds).toFixed(1)} ${paddingTop + chartHeight} Z`
    : '';

  // Area under Accuracy curve
  const accArea = points.length > 0
    ? `${accPath} L ${getX(points[points.length - 1].elapsedSeconds).toFixed(1)} ${paddingTop + chartHeight} L ${getX(points[0].elapsedSeconds).toFixed(1)} ${paddingTop + chartHeight} Z`
    : '';

  // Generate 4-5 X-axis tick marks
  const tickCount = 4;
  const xTicks = Array.from({ length: tickCount + 1 }).map((_, i) => {
    const val = Math.round((maxElapsed / tickCount) * i);
    return {
      value: `${val}s`,
      x: getX(val),
    };
  });

  // Generate 4 Y-axis tick marks
  const speedTicks = [
    { label: `${speedMaxY}`, y: getSpeedY(speedMaxY) },
    { label: `${Math.round(speedMaxY * 0.66)}`, y: getSpeedY(speedMaxY * 0.66) },
    { label: `${Math.round(speedMaxY * 0.33)}`, y: getSpeedY(speedMaxY * 0.33) },
    { label: '0', y: getSpeedY(0) },
  ];

  const accTicks = [
    { label: '100%', y: getAccY(100) },
    { label: `${Math.round(accMinY + (accMaxY - accMinY) * 0.66)}%`, y: getAccY(accMinY + (accMaxY - accMinY) * 0.66) },
    { label: `${Math.round(accMinY + (accMaxY - accMinY) * 0.33)}%`, y: getAccY(accMinY + (accMaxY - accMinY) * 0.33) },
    { label: `${accMinY}%`, y: getAccY(accMinY) },
  ];

  const activeHoveredPoint = hoveredIndex !== null && points[hoveredIndex] ? points[hoveredIndex] : null;

  return (
    <div
      className="performance-graph-card"
      role="region"
      aria-label="Performance Analytics Chart"
      data-testid="performance-graph-card"
    >
      <div className="graph-header">
        <div className="graph-titles">
          <h3 className="graph-title">
            {activeTab === 'speed' && 'Typing Speed'}
            {activeTab === 'accuracy' && 'Accuracy'}
            {activeTab === 'combined' && 'Speed vs Accuracy'}
          </h3>
          <p className="graph-subtitle">
            {activeTab === 'speed' && 'Your WPM progression throughout the test'}
            {activeTab === 'accuracy' && 'How consistent your precision remained over time'}
            {activeTab === 'combined' && 'Direct comparison of typing cadence against accuracy'}
          </p>
        </div>

        <div className="graph-tab-group" role="tablist" aria-label="Graph Mode">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'speed'}
            className={`graph-tab-btn ${activeTab === 'speed' ? 'active' : ''}`}
            onClick={() => setActiveTab('speed')}
            data-testid="graph-tab-speed"
          >
            Speed
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'accuracy'}
            className={`graph-tab-btn ${activeTab === 'accuracy' ? 'active' : ''}`}
            onClick={() => setActiveTab('accuracy')}
            data-testid="graph-tab-accuracy"
          >
            Accuracy
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'combined'}
            className={`graph-tab-btn ${activeTab === 'combined' ? 'active' : ''}`}
            onClick={() => setActiveTab('combined')}
            data-testid="graph-tab-combined"
          >
            Speed vs Acc
          </button>
        </div>
      </div>

      <div className="graph-svg-wrapper">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="performance-svg"
          preserveAspectRatio="none"
          role="img"
          aria-label={
            activeTab === 'speed'
              ? 'WPM progression chart'
              : activeTab === 'accuracy'
              ? 'Accuracy percentage chart'
              : 'Speed vs Accuracy comparative chart'
          }
        >
          <defs>
            <linearGradient id={`speed-grad-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--brand-primary, #2563eb)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--brand-primary, #2563eb)" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id={`acc-grad-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--status-success, #16a34a)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--status-success, #16a34a)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {(activeTab === 'speed' || activeTab === 'combined' ? speedTicks : accTicks).map((tick, i) => (
            <g key={`grid-y-${i}`} className="graph-grid-line">
              <line
                x1={paddingLeft}
                y1={tick.y}
                x2={width - paddingRight}
                y2={tick.y}
                stroke="var(--border-subtle, #e2e8f0)"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text
                x={paddingLeft - 8}
                y={tick.y + 4}
                textAnchor="end"
                className="graph-axis-text"
              >
                {tick.label}
              </text>
            </g>
          ))}

          {/* X axis ticks */}
          {xTicks.map((tick, i) => (
            <g key={`grid-x-${i}`}>
              <line
                x1={tick.x}
                y1={paddingTop + chartHeight}
                x2={tick.x}
                y2={paddingTop + chartHeight + 4}
                stroke="var(--border-subtle, #cbd5e1)"
                strokeWidth="1"
              />
              <text
                x={tick.x}
                y={paddingTop + chartHeight + 18}
                textAnchor="middle"
                className="graph-axis-text"
              >
                {tick.value}
              </text>
            </g>
          ))}

          {/* Base axes */}
          <line
            x1={paddingLeft}
            y1={paddingTop + chartHeight}
            x2={width - paddingRight}
            y2={paddingTop + chartHeight}
            stroke="var(--border-subtle, #cbd5e1)"
            strokeWidth="1.5"
          />

          {/* Render Curves */}
          {activeTab === 'speed' && (
            <>
              {netWpmArea && (
                <path d={netWpmArea} fill={`url(#speed-grad-${gradientId})`} />
              )}
              {/* Gross WPM subtle dashed line */}
              <path
                d={grossWpmPath}
                fill="none"
                stroke="var(--text-muted, #94a3b8)"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                opacity="0.8"
              />
              {/* Net WPM primary line */}
              <path
                d={netWpmPath}
                fill="none"
                stroke="var(--brand-primary, #2563eb)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {points.map((p, idx) => (
                <circle
                  key={`dot-${idx}`}
                  cx={getX(p.elapsedSeconds)}
                  cy={getSpeedY(p.netWpm)}
                  r={hoveredIndex === idx ? 5 : 3}
                  fill="var(--brand-primary, #2563eb)"
                  stroke="var(--bg-surface, #ffffff)"
                  strokeWidth="2"
                  className="graph-data-point"
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              ))}
            </>
          )}

          {activeTab === 'accuracy' && (
            <>
              {accArea && (
                <path d={accArea} fill={`url(#acc-grad-${gradientId})`} />
              )}
              <path
                d={accPath}
                fill="none"
                stroke="var(--status-success, #16a34a)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {points.map((p, idx) => (
                <circle
                  key={`dot-acc-${idx}`}
                  cx={getX(p.elapsedSeconds)}
                  cy={getAccY(p.accuracy)}
                  r={hoveredIndex === idx ? 5 : 3}
                  fill="var(--status-success, #16a34a)"
                  stroke="var(--bg-surface, #ffffff)"
                  strokeWidth="2"
                  className="graph-data-point"
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              ))}
            </>
          )}

          {activeTab === 'combined' && (
            <>
              <path
                d={netWpmPath}
                fill="none"
                stroke="var(--brand-primary, #2563eb)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={accPath}
                fill="none"
                stroke="var(--status-success, #16a34a)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {points.map((p, idx) => (
                <g key={`dot-comb-${idx}`}>
                  <circle
                    cx={getX(p.elapsedSeconds)}
                    cy={getSpeedY(p.netWpm)}
                    r={hoveredIndex === idx ? 5 : 3}
                    fill="var(--brand-primary, #2563eb)"
                    stroke="var(--bg-surface, #ffffff)"
                    strokeWidth="2"
                    className="graph-data-point"
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                  <circle
                    cx={getX(p.elapsedSeconds)}
                    cy={getAccY(p.accuracy)}
                    r={hoveredIndex === idx ? 5 : 3}
                    fill="var(--status-success, #16a34a)"
                    stroke="var(--bg-surface, #ffffff)"
                    strokeWidth="2"
                    className="graph-data-point"
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                </g>
              ))}
            </>
          )}
        </svg>

        {/* Hover detail tooltip overlay */}
        {activeHoveredPoint && (
          <div
            className="graph-tooltip"
            style={{
              left: `${(getX(activeHoveredPoint.elapsedSeconds) / width) * 100}%`,
            }}
          >
            <div className="tooltip-time">{activeHoveredPoint.elapsedSeconds}s</div>
            <div className="tooltip-val" style={{ color: 'var(--brand-primary, #2563eb)' }}>
              {activeHoveredPoint.netWpm} Net WPM
            </div>
            <div className="tooltip-val" style={{ color: 'var(--status-success, #16a34a)' }}>
              {activeHoveredPoint.accuracy}% Acc
            </div>
            {activeHoveredPoint.errors > 0 && (
              <div className="tooltip-val" style={{ color: 'var(--status-error, #dc2626)' }}>
                {activeHoveredPoint.errors} {activeHoveredPoint.errors === 1 ? 'error' : 'errors'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend below graph */}
      <div className="graph-legend">
        {(activeTab === 'speed' || activeTab === 'combined') && (
          <div className="legend-item">
            <span className="legend-indicator" style={{ backgroundColor: 'var(--brand-primary, #2563eb)' }} />
            <span>Net WPM</span>
          </div>
        )}
        {activeTab === 'speed' && (
          <div className="legend-item">
            <span
              className="legend-indicator"
              style={{
                backgroundColor: 'transparent',
                borderBottom: '2px dashed var(--text-muted, #94a3b8)',
                height: 0,
                width: 14,
              }}
            />
            <span>Gross WPM</span>
          </div>
        )}
        {(activeTab === 'accuracy' || activeTab === 'combined') && (
          <div className="legend-item">
            <span className="legend-indicator" style={{ backgroundColor: 'var(--status-success, #16a34a)' }} />
            <span>Accuracy %</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceGraphs;
