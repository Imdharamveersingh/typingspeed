'use client';

import React from 'react';
import { ExamProfile } from '@/engine/examTypes';
import { formatDuration } from '@/utils/metrics';

interface ExamSelectorProps {
  testMode: 'standard' | 'exam';
  onSelectTestMode: (mode: 'standard' | 'exam') => void;
  profiles: ExamProfile[];
  selectedProfileId: string;
  onSelectProfile: (profile: ExamProfile) => void;
  disabled: boolean;
}

export const ExamSelector: React.FC<ExamSelectorProps> = ({
  testMode,
  onSelectTestMode,
  profiles,
  selectedProfileId,
  onSelectProfile,
  disabled,
}) => {
  return (
    <div className="exam-selection-container" role="region" aria-label="Test Mode and Exam Selection">
      {/* Primary Mode Switch: Standard Test vs Exam Practice */}
      <div className="test-mode-toggle-bar" role="tablist" aria-label="Test Mode">
        <button
          type="button"
          role="tab"
          aria-selected={testMode === 'standard'}
          className={`test-mode-btn ${testMode === 'standard' ? 'active' : ''}`}
          onClick={() => onSelectTestMode('standard')}
          disabled={disabled}
          data-testid="mode-standard-btn"
        >
          Standard Test
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={testMode === 'exam'}
          className={`test-mode-btn ${testMode === 'exam' ? 'active' : ''}`}
          onClick={() => onSelectTestMode('exam')}
          disabled={disabled}
          data-testid="mode-exam-btn"
        >
          Exam Practice
          <span className="exam-preset-tag">Simulation</span>
        </button>
      </div>

      {/* Profile Selector Cards (Visible when Exam Practice is active) */}
      {testMode === 'exam' && (
        <div className="exam-profiles-wrapper" data-testid="exam-profiles-wrapper">
          <div className="exam-profiles-grid" role="radiogroup" aria-label="Select Exam Practice Preset">
            {profiles.map((profile) => {
              const isSelected = profile.id === selectedProfileId;
              return (
                <button
                  key={profile.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  disabled={disabled}
                  onClick={() => onSelectProfile(profile)}
                  className={`exam-profile-card ${isSelected ? 'active' : ''}`}
                  data-testid={`exam-profile-${profile.id}`}
                >
                  <div className="exam-profile-header">
                    <div className="exam-profile-badge">{profile.shortName}</div>
                    <div className="exam-profile-target">
                      Target: <strong>{profile.targetValue} WPM</strong>
                    </div>
                  </div>
                  <h4 className="exam-profile-name">{profile.name}</h4>
                  <div className="exam-profile-meta">
                    <span>{formatDuration(profile.duration)}</span>
                    {profile.minimumAccuracy && <span>{profile.minimumAccuracy}% min accuracy</span>}
                    <span className="exam-profile-lang">English</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamSelector;
