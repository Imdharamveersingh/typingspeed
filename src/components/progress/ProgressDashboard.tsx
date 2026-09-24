'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { TypingHistoryEntry } from '@/engine/progressTypes';
import { clearHistory, loadHistory } from '@/engine/progressStorage';
import {
  aggregateWeakCharacters,
  calculateProgressSummary,
  getProgressTrend,
} from '@/engine/progressAnalytics';
import { getGamificationOverview } from '@/engine/gamificationEngine';
import ProgressSummary from './ProgressSummary';
import ProgressTrend from './ProgressTrend';
import WeakKeysCard from './WeakKeysCard';
import ProgressHistory from './ProgressHistory';
import GamificationSummary from '../gamification/GamificationSummary';
import DailyGoalCard from '../gamification/DailyGoalCard';
import PersonalBestsCard from '../gamification/PersonalBestsCard';
import AchievementsCard from '../gamification/AchievementsCard';

export type ProgressTab = 'overview' | 'trends' | 'milestones';

interface ProgressDashboardProps {
  initialTab?: ProgressTab;
}

export const ProgressDashboard: React.FC<ProgressDashboardProps> = ({ initialTab }) => {
  const [entries, setEntries] = useState<TypingHistoryEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const clearTriggerRef = useRef<HTMLButtonElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const wasModalOpenRef = useRef<boolean>(false);

  useEffect(() => {
    if (showClearConfirm) {
      wasModalOpenRef.current = true;
      cancelBtnRef.current?.focus();
    } else if (wasModalOpenRef.current) {
      wasModalOpenRef.current = false;
      clearTriggerRef.current?.focus();
    }
  }, [showClearConfirm]);

  // Read search parameters safely (resilient to test environments)
  let tabQuery: string | null = null;
  try {
    const searchParams = useSearchParams();
    tabQuery = searchParams?.get('tab') ?? null;
  } catch {
    tabQuery = null;
  }

  const resolvedInitialTab: ProgressTab =
    initialTab ||
    (tabQuery === 'trends' || tabQuery === 'milestones' ? tabQuery : 'overview');

  const [activeTab, setActiveTab] = useState<ProgressTab>(resolvedInitialTab);

  // Sync state if URL query param changes
  useEffect(() => {
    if (tabQuery === 'trends' || tabQuery === 'milestones') {
      setActiveTab(tabQuery);
    } else if (tabQuery === 'overview' || (!tabQuery && !initialTab)) {
      setActiveTab('overview');
    }
  }, [tabQuery, initialTab]);

  // Load history safely on client mount (avoids hydration mismatch)
  useEffect(() => {
    const loaded = loadHistory();
    setEntries(loaded);
    setIsLoaded(true);
  }, []);

  const handleTabChange = (newTab: ProgressTab) => {
    setActiveTab(newTab);
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      const url = newTab === 'overview' ? '/progress' : `/progress?tab=${newTab}`;
      window.history.replaceState(null, '', url);
    }
  };

  // Keyboard navigation for ARIA tabs
  const handleTabKeyDown = (e: React.KeyboardEvent) => {
    const tabs: ProgressTab[] = ['overview', 'trends', 'milestones'];
    const currentIndex = tabs.indexOf(activeTab);

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % tabs.length;
      handleTabChange(tabs[nextIndex]);
      document.getElementById(`tab-${tabs[nextIndex]}`)?.focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      handleTabChange(tabs[prevIndex]);
      document.getElementById(`tab-${tabs[prevIndex]}`)?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      handleTabChange(tabs[0]);
      document.getElementById(`tab-${tabs[0]}`)?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      handleTabChange(tabs[tabs.length - 1]);
      document.getElementById(`tab-${tabs[tabs.length - 1]}`)?.focus();
    }
  };

  const handleClearHistory = () => {
    clearHistory();
    setEntries([]);
    setShowClearConfirm(false);
  };

  if (!isLoaded) {
    return (
      <div className="progress-loading-placeholder" aria-busy="true">
        <p style={{ color: 'var(--text-muted)' }}>Loading local typing history...</p>
      </div>
    );
  }

  const hasHistory = entries.length > 0;
  const summary = calculateProgressSummary(entries);
  const trendPoints = getProgressTrend(entries, 15);
  const weakKeys = aggregateWeakCharacters(entries, 5);
  const overview = getGamificationOverview(entries);

  // Diagnostic insight for Overview
  const latestEntry = entries.length > 0 ? entries[entries.length - 1] : null;
  const unlockedAchievementsCount = overview.achievements.filter((a) => a.isUnlocked).length;

  return (
    <div className="progress-dashboard-container" aria-label="Typing Progress Hub">
      {/* Top Header Bar */}
      <div className="progress-header-bar">
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', letterSpacing: '-0.02em', marginBottom: 'var(--space-1)' }}>
            Your Progress
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
            Personal typing growth, performance trends, and earned milestones
          </p>
        </div>

        <div className="progress-header-actions">
          <Link href="/" className="btn btn-primary" style={{ fontSize: 'var(--text-xs)', padding: 'var(--space-2) var(--space-4)' }}>
            Take a Test
          </Link>
          {hasHistory && (
            <button
              ref={clearTriggerRef}
              type="button"
              className="btn btn-outline"
              style={{ fontSize: 'var(--text-xs)', padding: 'var(--space-2) var(--space-3)' }}
              onClick={() => setShowClearConfirm(true)}
              data-testid="clear-progress-btn"
            >
              Clear Progress
            </button>
          )}
        </div>
      </div>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div
          className="confirm-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-dialog-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowClearConfirm(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              setShowClearConfirm(false);
            } else if (e.key === 'Tab') {
              if (e.shiftKey && document.activeElement === cancelBtnRef.current) {
                e.preventDefault();
                confirmBtnRef.current?.focus();
              } else if (!e.shiftKey && document.activeElement === confirmBtnRef.current) {
                e.preventDefault();
                cancelBtnRef.current?.focus();
              }
            }
          }}
        >
          <div className="confirm-modal-card">
            <h3 id="clear-dialog-title" style={{ marginBottom: 'var(--space-2)' }}>Clear All Local History?</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)' }}>
              This action will permanently remove all {entries.length} recorded tests from this browser. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
              <button
                ref={cancelBtnRef}
                type="button"
                className="btn btn-outline"
                onClick={() => setShowClearConfirm(false)}
                style={{ fontSize: 'var(--text-xs)' }}
              >
                Cancel
              </button>
              <button
                ref={confirmBtnRef}
                type="button"
                className="btn btn-primary"
                onClick={handleClearHistory}
                style={{ backgroundColor: 'var(--status-error)', borderColor: 'var(--status-error)', fontSize: 'var(--text-xs)' }}
                data-testid="confirm-clear-btn"
              >
                Yes, Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State: Honest and clean when no history */}
      {!hasHistory ? (
        <div className="progress-empty-state" role="region" aria-label="No Progress History Available">
          <div className="progress-empty-card">
            <h2 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-2)' }}>No Tests Recorded Yet</h2>
            <p style={{ color: 'var(--text-muted)', maxWidth: '440px', margin: '0 auto var(--space-6)', fontSize: 'var(--text-sm)', lineHeight: '1.6' }}>
              Your progress will appear here after your first test. Complete a standard typing test to start tracking speed curves, accuracy trends, streaks, and milestone badges.
            </p>
            <Link href="/" className="btn btn-primary">
              Start Your First Test
            </Link>
          </div>
        </div>
      ) : (
        /* Unified Navigation Tabs & Content Panels */
        <div className="progress-hub-content">
          <div className="progress-nav-tabs-wrapper">
            <div
              role="tablist"
              aria-label="Progress sections"
              className="progress-nav-tabs"
              onKeyDown={handleTabKeyDown}
            >
              <button
                type="button"
                role="tab"
                id="tab-overview"
                aria-selected={activeTab === 'overview'}
                aria-controls="panel-overview"
                tabIndex={activeTab === 'overview' ? 0 : -1}
                className={`progress-nav-tab ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => handleTabChange('overview')}
                data-testid="tab-overview"
              >
                Overview
              </button>
              <button
                type="button"
                role="tab"
                id="tab-trends"
                aria-selected={activeTab === 'trends'}
                aria-controls="panel-trends"
                tabIndex={activeTab === 'trends' ? 0 : -1}
                className={`progress-nav-tab ${activeTab === 'trends' ? 'active' : ''}`}
                onClick={() => handleTabChange('trends')}
                data-testid="tab-trends"
              >
                Trends &amp; History
              </button>
              <button
                type="button"
                role="tab"
                id="tab-milestones"
                aria-selected={activeTab === 'milestones'}
                aria-controls="panel-milestones"
                tabIndex={activeTab === 'milestones' ? 0 : -1}
                className={`progress-nav-tab ${activeTab === 'milestones' ? 'active' : ''}`}
                onClick={() => handleTabChange('milestones')}
                data-testid="tab-milestones"
              >
                Milestones
              </button>
            </div>
          </div>

          {/* TAB PANEL 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div
              role="tabpanel"
              id="panel-overview"
              aria-labelledby="tab-overview"
              className="progress-tab-panel"
              tabIndex={0}
            >
              {/* Primary Performance Snapshot Hero */}
              <div className="progress-overview-hero" role="region" aria-label="Core Performance Summary">
                <div className="overview-headline">
                  <div className="overview-metric-block">
                    <span className="overview-metric-label">Average Speed</span>
                    <div className="overview-metric-value">
                      <span>{summary.averageNetWpm}</span>
                      <span className="overview-metric-unit">WPM</span>
                    </div>
                    <span className="overview-metric-sub">Net typing speed</span>
                  </div>

                  <div className="overview-metric-divider" aria-hidden="true" />

                  <div className="overview-metric-block">
                    <span className="overview-metric-label">Average Accuracy</span>
                    <div className="overview-metric-value">
                      <span>{summary.averageAccuracy}</span>
                      <span className="overview-metric-unit">%</span>
                    </div>
                    <span className="overview-metric-sub">Clean precision</span>
                  </div>
                </div>

                {/* Secondary Pill Strip */}
                <div className="progress-overview-pills">
                  <span className="overview-pill">
                    <span className="pill-muted">Best:</span>
                    <strong>{summary.bestNetWpm} WPM</strong>
                  </span>
                  <span className="overview-pill">
                    <span aria-hidden="true">🔥</span>
                    <strong>{overview.streak.currentStreak} day streak</strong>
                  </span>
                  <span className="overview-pill">
                    <span className="pill-muted">Level:</span>
                    <strong>{overview.level.level}</strong>
                    <span className="pill-sub">({overview.totalXp} XP)</span>
                  </span>
                  <span className="overview-pill">
                    <span className="pill-muted">Tests:</span>
                    <strong>{summary.totalTests} completed</strong>
                  </span>
                </div>

                {/* Contextual Growth Diagnostic & Quick Actions */}
                <div className="progress-overview-insight">
                  <div className="insight-text">
                    <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                      {latestEntry && latestEntry.netWpm >= summary.averageNetWpm ? (
                        <>You reached <strong>{latestEntry.netWpm} Net WPM</strong> in your most recent test, performing at or above your session average.</>
                      ) : (
                        <>Consistent practice builds clean muscle memory. Average accuracy is holding at <strong>{summary.averageAccuracy}%</strong>.</>
                      )}
                    </p>
                    {weakKeys.length > 0 && (
                      <p style={{ margin: 'var(--space-1) 0 0 0', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        Top focus character: <strong>&apos;{weakKeys[0].displayLabel}&apos;</strong> ({weakKeys[0].totalMistakes} errors recorded).
                      </p>
                    )}
                  </div>

                  <div className="insight-actions">
                    <Link
                      href="/practice"
                      className="btn btn-primary"
                      style={{ fontSize: 'var(--text-xs)', padding: 'var(--space-2) var(--space-4)' }}
                    >
                      Practice Weaknesses
                    </Link>
                    <Link
                      href="/"
                      className="btn btn-outline"
                      style={{ fontSize: 'var(--text-xs)', padding: 'var(--space-2) var(--space-4)' }}
                    >
                      Test Again
                    </Link>
                  </div>
                </div>
              </div>

              {/* Progressive Disclosure: Deep-dive links */}
              <div className="progress-quick-cards-grid">
                <div className="progress-quick-card">
                  <div className="quick-card-body">
                    <div className="quick-card-header">
                      <h4>Speed Trends &amp; History</h4>
                      <span className="quick-card-badge">{trendPoints.length} graphed</span>
                    </div>
                    <p className="quick-card-desc">
                      Detailed Net WPM curves, error frequencies by character, and complete chronological session history.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline quick-card-action"
                    onClick={() => handleTabChange('trends')}
                    style={{ fontSize: 'var(--text-xs)' }}
                  >
                    View Trends &amp; History →
                  </button>
                </div>

                <div className="progress-quick-card">
                  <div className="quick-card-body">
                    <div className="quick-card-header">
                      <h4>Milestones &amp; Badges</h4>
                      <span className="quick-card-badge">{unlockedAchievementsCount} / {overview.achievements.length} badges</span>
                    </div>
                    <p className="quick-card-desc">
                      Daily goal tracker ({overview.dailyGoal.completedToday} / {overview.dailyGoal.target} today), all-time personal best records, and unlocked achievements.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline quick-card-action"
                    onClick={() => handleTabChange('milestones')}
                    style={{ fontSize: 'var(--text-xs)' }}
                  >
                    View Milestones →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB PANEL 2: TRENDS & HISTORY */}
          {activeTab === 'trends' && (
            <div
              role="tabpanel"
              id="panel-trends"
              aria-labelledby="tab-trends"
              className="progress-tab-panel"
              tabIndex={0}
            >
              <ProgressSummary summary={summary} />
              <ProgressTrend points={trendPoints} />
              <div className="progress-details-split">
                <WeakKeysCard weakKeys={weakKeys} />
              </div>
              <ProgressHistory entries={entries} />
            </div>
          )}

          {/* TAB PANEL 3: MILESTONES */}
          {activeTab === 'milestones' && (
            <div
              role="tabpanel"
              id="panel-milestones"
              aria-labelledby="tab-milestones"
              className="progress-tab-panel"
              tabIndex={0}
            >
              <GamificationSummary
                level={overview.level}
                streak={overview.streak}
                totalXp={overview.totalXp}
              />
              <div className="gamification-mid-grid">
                <DailyGoalCard dailyGoal={overview.dailyGoal} />
                <PersonalBestsCard
                  milestones={overview.milestones}
                  totalTests={entries.length}
                />
              </div>
              <AchievementsCard achievements={overview.achievements} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProgressDashboard;
