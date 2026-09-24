'use client';

import React from 'react';
import { ExamProfile } from '@/engine/examTypes';
import { formatDuration } from '@/utils/metrics';

interface ExamInstructionsCardProps {
  profile: ExamProfile;
}

export const ExamInstructionsCard: React.FC<ExamInstructionsCardProps> = ({ profile }) => {
  return (
    <div className="exam-instructions-card" role="region" aria-label="Exam Practice Instructions" data-testid="exam-instructions-card">
      <div className="exam-instructions-header">
        <div className="exam-inst-title-block">
          <span className="exam-preset-tag">
            Practice Simulation
          </span>
          <h3 className="exam-inst-title">{profile.name}</h3>
          <p className="exam-inst-desc">{profile.description}</p>
        </div>

        {/* Target Benchmark Chips */}
        <div className="exam-target-chips">
          <div className="exam-target-chip">
            <span className="chip-label">Target Speed</span>
            <span className="chip-value" data-testid="exam-target-speed">{profile.targetValue} Net WPM</span>
          </div>
          {profile.minimumAccuracy && (
            <div className="exam-target-chip">
              <span className="chip-label">Accuracy Target</span>
              <span className="chip-value" data-testid="exam-target-accuracy">{profile.minimumAccuracy}%</span>
            </div>
          )}
          <div className="exam-target-chip">
            <span className="chip-label">Session Duration</span>
            <span className="chip-value" data-testid="exam-target-duration">{formatDuration(profile.duration)}</span>
          </div>
        </div>
      </div>

      {/* Instructions list */}
      <div className="exam-instructions-body">
        <h4 className="exam-guidelines-heading">Simulation Guidelines</h4>
        <ul className="exam-guidelines-list">
          {profile.instructions.map((inst, idx) => (
            <li key={idx}>{inst}</li>
          ))}
        </ul>
      </div>

      {/* Explicit Disclaimer */}
      <div className="exam-disclaimer-box" data-testid="exam-disclaimer">
        <span className="disclaimer-icon">ℹ️</span>
        <span className="disclaimer-text">{profile.simulationDisclaimer}</span>
      </div>
    </div>
  );
};

export default ExamInstructionsCard;
