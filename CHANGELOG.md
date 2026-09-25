# CHANGELOG.md

All notable changes to the **TypingSpeed** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned
- Phase 11: Design V2 & UI polish.

---

## [0.10.0] - 2026-09-25

### Added
- **Phase 10: SEO Architecture & Baseline Audit**:
  - Implemented centralized site configuration (`src/config/site.ts`) with configurable `NEXT_PUBLIC_SITE_URL` support.
  - Added App Router metadata generation (`src/app/sitemap.ts`, `src/app/robots.ts`, `src/app/icon.svg`).
  - Added structured Open Graph and Twitter Card tags across `/`, `/practice`, `/progress`, and `/exam`.
  - Harmonized design tokens in `src/styles/globals.css` with approved TypingSpeed palette.
  - Implemented screen-reader accessible mirror (`.sr-only` and `aria-describedby`) for typing test passage canvas in `PassageDisplay.tsx`.
  - Added Government Exam Simulation discoverability card in `PracticeHub.tsx`.
  - Safely eliminated orphaned components (`AchievementsDashboard.tsx`, `DurationSelector.tsx`, `ExamSelector.tsx`).
  - Synchronized project branding across documentation, metadata, footer, and `package.json`.

---

## [0.9.0] - 2026-09-23

### Added
- **Phase 9: Keyboard Visualization**:
  - Implemented configuration-driven Keyboard Visualization architecture:
    - Pure types in `src/engine/keyboardTypes.ts` (`KeyboardLayout`, `KeyDefinition`, `KeyVisualState`, `KeyboardHighlightState`, `KeyMappingResult`).
    - Standard English QWERTY layout definition (`src/engine/keyboardLayouts.ts`) containing standard number row, character rows, navigation/modifier keys (Shift, Backspace, Caps, Enter, Space).
    - Hindi InScript reference layout definition (`src/engine/keyboardLayouts.ts`) reflecting the Indian Standard IS 13194 / Windows InScript specification with native Devanagari labels and shifted vowels/consonants.
  - Built pure, deterministic layout and next-key mapping adapter (`src/engine/keyboardUtils.ts`):
    - Real-time English character-to-keycode mapping with automatic shift detection.
    - Unicode Devanagari grapheme decomposition for InScript: accurately recognizes multi-keystroke inputs (e.g. `भा` highlights base consonant `भ` [Shift+Y] initially, then matra `ा` [E] after consonant entry via `pendingComposition`).
    - Explicit unmapped/ambiguous fallback: if a Devanagari sequence has no direct physical InScript mapping, displays expected grapheme in status pill without inventing false keys.
  - Developed reusable presentation components (`src/components/keyboard/`):
    - `KeyboardKey.tsx`: accessible (`aria-hidden="true"`, non-focusable) tactile keycaps with primary label, shifted label, and dynamic states (`.key-next`, `.key-pressed`, `.key-correct`, `.key-incorrect`, `.key-focus`, `.key-has-mistakes`).
    - `KeyboardRow.tsx`: flex-spaced row containers preserving proportional physical widths.
    - `VirtualKeyboard.tsx`: top-level visualizer displaying layout identity (`English — QWERTY` or `हिंदी — InScript (Reference)`), expected next key indicator, shift modifier pill, mistake heatmap toggle, and visibility toggle.
  - Integrated into platform workflows:
    - `TypingTest.tsx`: renders `VirtualKeyboard` in both Standard Test and Exam Practice modes, updating highlights on every keystroke.
    - `PracticeSession.tsx`: renders `VirtualKeyboard` during targeted drills, highlighting practice target keys in Focus Keys mode.
    - `ResultCard.tsx`: provides optional visual keyboard inspection in mistake analytics to see mistake frequency distribution physically.
    - `useTypingEngine.ts`: minimally exposes `recentKey` (`{ code, status }`) with automatic 150ms reset for immediate feedback without engine state duplication.
  - Local preference persistence: remembers `typing_platform_keyboard_visible` state in `localStorage` across page reloads.
  - Added full visual styling in `src/styles/globals.css`: sleek dark glassmorphism keycaps, Devanagari typography support (`--font-devanagari`), vibrant next-key pulse, error flash, mistake badges, and responsive scaling ensuring zero horizontal page overflow on 375px mobile viewports.
  - Added 22 new unit and integration tests across `keyboardUtils.test.ts` and `keyboardIntegration.test.ts` (178 total unit tests passing with zero failures).

---


## [0.8.0] - 2026-09-23

### Added
- **Phase 8: Hindi Typing Support**:
  - Implemented Unicode and text segmentation utility (`src/engine/textUtils.ts`):
    - Standards-based grapheme clustering using native `Intl.Segmenter` (`granularity: "grapheme"`) with safe fallback.
    - Unicode NFC normalization (`String.prototype.normalize("NFC")`) ensuring equivalent representations (such as nukhtas) compare identically.
    - Grapheme prefix matching and delegation for multi-keystroke inputs.
    - Universal Unicode punctuation stripping (`\p{P}\p{S}`) for word boundary analysis.
  - Reused core typing engine (`src/engine/typingEngine.ts` and `src/engine/useTypingEngine.ts`) without parallel or duplicate engines:
    - Segmented passage characters by grapheme clusters, preventing broken combining marks (e.g. `◌ि`).
    - Handled single grapheme inputs, multi-keystroke InScript consonant+matra composition, and batch committed strings (`processInputText`).
    - Added full native IME lifecycle support (`compositionstart`, `compositionend`, `beforeinput`, `input`) ignoring intermediate phonetic keystrokes and committing clean Unicode Devanagari text.
  - Added dedicated Hindi passages dataset (`src/data/hindiPassages.ts`) with 6 curated, grammatical, original texts covering education, technology, governance, culture, and environment.
  - Added Hindi mistake practice vocabulary dataset (`src/data/hindiPracticeWords.ts`) with 100+ common Devanagari words and high-frequency character transitions.
  - Added accessible Language Selector (`[ English ] [ हिंदी ]`) to the test controls bar, enabling switching between English and Hindi typing practice with active state indicators.
  - Updated Mistake Analytics (`src/engine/analytics.ts`) to evaluate Devanagari mismatches cleanly at grapheme level without character fragmentation.
  - Upgraded Practice My Mistakes (`src/engine/practiceEngine.ts`) for Hindi: Focus Characters, Missed Words (3x repetition), and Targeted Bigrams using Hindi word pools.
  - Extended history storage (`src/engine/progressStorage.ts` & `src/engine/progressTypes.ts`) with optional `language?: 'en' | 'hi'`, preserving 100% backward compatibility with existing localStorage records.
  - Updated Progress Dashboard (`ProgressHistory.tsx`) with subtle language indicators (`EN` / `HI`).
  - Integrated Hindi tests with Phase 6 gamification: completed Hindi tests award XP, update daily goals, and advance streaks under the existing gamification engine.
  - Upgraded typography (`src/styles/globals.css`): added `--font-devanagari` cross-platform font stack, `.passage-text.lang-hi` line-height and word-wrapping, and compact language toggle styling.
  - Added 43 new unit tests across `textUtils.test.ts`, `hindiTyping.test.ts`, `hindiMistakePractice.test.ts`, and `hindiProgressGamification.test.ts` (156 total project unit tests passing).


## [0.7.0] - 2026-09-22

### Added
- **Phase 7: Indian Competitive Exam Modes**:
  - Implemented configurable, profile-driven exam practice engine (`src/engine/examTypes.ts`, `src/engine/examProfiles.ts`, `src/engine/examEngine.ts`).
  - Added 3 curated initial practice simulation presets:
    - **SSC Typing Practice (`ssc-practice`):** 35 Net WPM target, 10-minute session (600s), 95% minimum accuracy.
    - **RRB Typing Practice (`rrb-practice`):** 30 Net WPM target, 10-minute session (600s), 95% minimum accuracy.
    - **CPCT Typing Practice (`cpct-practice`):** 30 Net WPM target, 15-minute session (900s), 90% minimum accuracy.
  - Added realistic, exam-oriented practice passages in `src/data/passages.ts` covering administrative governance, railway infrastructure, and digital public services.
  - Built `ExamSelector` component enabling seamless switching between `Standard Test` and `Exam Practice` with accessible profile cards.
  - Built `ExamInstructionsCard` displaying session duration, target benchmarks, simulation guidelines, and clear simulation disclaimers.
  - Upgraded `TypingTest.tsx` to run exam practice sessions using the existing core typing engine, timer, and input capture without duplicate engines.
  - Upgraded `ResultCard.tsx` to conditionally display a prominent exam evaluation banner with status (`Target Reached` vs `Below Target`), speed/accuracy comparisons, and disclaimer.
  - Extended history storage (`progressStorage.ts` & `progressTypes.ts`) with optional `testMode?: 'standard' | 'exam'` and `examProfileId?: string`, maintaining 100% backward compatibility with legacy history records.
  - Seamlessly integrated with Phase 6 gamification: completed exam sessions award deterministic XP, update daily goals, and maintain streaks.
  - Added 16 unit tests in `src/engine/examEngine.test.ts` (113 total unit tests passing).
  - Validated via Chrome CDP browser smoke testing verifying mode switching, profile selection, instructions rendering, exam-aware results, progress/achievements consistency, 375px mobile responsiveness (0 overflow), and 0 console errors.

## [0.6.0] - 2026-09-22

### Added
- **Phase 6: Gamification**:
  - Implemented pure deterministic gamification engine (`src/engine/gamificationEngine.ts`):
    - **Daily Goal:** Tracks completed normal typing tests per local calendar day against `DAILY_TEST_GOAL = 3`.
    - **Practice Streaks:** Computes current active streak (with a 1-day grace period for yesterday) and all-time longest streak based on local calendar dates (`YYYY-MM-DD`).
    - **Deterministic XP:** Awards base 10 XP per completed test, accuracy bonuses (+5 XP at >=95%, +10 XP at >=98%), and speed bonuses (+5 XP at >=40 WPM, +10 XP at >=60 WPM, +15 XP at >=80 WPM). Excludes abandoned tests and practice sessions.
    - **Tiered Level Progression:** Predictable XP progression curve (Level 1: 0–99, Level 2: 100–249, Level 3: 250–499, Level 4: 500–999, Level 5: 1000–1749, scaling up to Level 10+) with progress % to next level.
    - **10 Curated Achievements:** `first-test`, `tests-5`, `tests-10`, `speed-40`, `speed-60`, `speed-80`, `accuracy-95`, `accuracy-98`, `streak-3`, and `streak-7`.
    - **Personal Milestones:** Tracks all-time Personal Best Net WPM and Accuracy without comparative rankings.
  - Built dedicated `/achievements` dashboard (`src/app/achievements/page.tsx` & `AchievementsDashboard.tsx`) with SSR/hydration safety.
  - Created modular gamification cards: `GamificationSummary`, `DailyGoalCard`, `PersonalBestsCard`, and `AchievementsCard`.
  - Upgraded `ResultCard.tsx` with a compact, non-intrusive gamification pill showing XP earned for the test attempt, current level, current streak, and "Achievements" button.
  - Added "Achievements" link to `Header.tsx` main navigation.
  - Ensured strict coherence: All gamification state derives from completed test history in `progressStorage.ts`; clearing history resets gamification state consistently.
  - Added 30 unit tests in `src/engine/gamificationEngine.test.ts` (97 total unit tests passing).
  - Verified comprehensive browser smoke test with Chrome CDP: multi-test XP progression, daily goal updates (1/3 -> 2/3), reload persistence, clear progress reset consistency, 375px mobile responsiveness (zero overflow), and zero console errors.

## [0.5.0] - 2026-09-22

### Added
- **Phase 5: Progress tracking**:
  - Implemented local-first persistent storage service (`src/engine/progressStorage.ts`) leveraging `localStorage` with versioned envelope schema and automatic 100-entry capacity bounding.
  - Added pure deterministic progress analytics engine (`src/engine/progressAnalytics.ts`) computing session totals, average Net WPM, personal best WPM, average accuracy, and chronological trends.
  - Implemented cross-test weak character aggregation isolating persistent problem keys across multiple completed test sessions.
  - Built comprehensive `/progress` dashboard route (`src/app/progress/page.tsx`) with SSR/hydration safety guards.
  - Created responsive `ProgressSummary` headline statistics grid, zero-dependency SVG `ProgressTrend` chart, `WeakKeysCard`, and `ProgressHistory` table.
  - Added "Clear Progress" modal dialog with explicit user confirmation and immediate reactive UI reset.
  - Connected test completion workflow in `TypingTest.tsx` to automatically persist test attempts once per completion without duplicate saves.
  - Added "View Progress" link to `ResultCard.tsx` and main `Header.tsx` navigation.
  - Added 16 unit tests for progress storage and analytics in `src/engine/progressAnalytics.test.ts` (67 total project unit tests passing).
  - Verified full end-to-end multi-test flow, trend rendering, clear history, and mobile 375px responsive layout via Chrome CDP browser smoke test.

---

## [0.4.0] - 2026-09-22

### Added
- **Phase 4: Practice engine**:
  - Implemented deterministic Practice Engine (`src/engine/practiceEngine.ts`) turning test mistakes into targeted practice drills.
  - Added Mistyped Character Practice prioritizing meaningful words containing the user's focus keys.
  - Added Missed Word Practice isolating words from the passage where character mistakes occurred.
  - Added Targeted Bigram Practice extracting frequent English bigram transitions for problem characters.
  - Built curated practice vocabulary repository (`src/data/practiceWords.ts`) with common English words and bigrams.
  - Added `PracticeSession` UI component reusing the core typing engine, `PassageDisplay`, and `MetricsBar`.
  - Wired active "Practice My Mistakes" action on the Result Screen with seamless return transitions.
  - Added empty/insufficient mistake state handling ("Not enough mistake data for targeted practice yet").
  - Verified 375px mobile viewport responsiveness with zero horizontal overflow.
  - Added 16 unit tests in `src/engine/practiceEngine.test.ts` (51 total project unit tests passing).
  - Added deterministic test completion hook (`typing:complete` event / `completeTest`) to `useTypingEngine` for robust automated E2E browser verification.
  - Completed and verified full 20-step browser smoke test exercising complete user flow from typing test to mistakes practice to results navigation.

---

## [0.3.0] - 2026-09-22

### Added
- **Phase 3: Results & analytics**:
  - Implemented pure deterministic analytics module (`src/engine/analytics.ts`) computing character-level mistake diagnostics, mistyped frequency breakdown, error categorizations, and position-based mismatch details.
  - Upgraded Result Screen (`src/components/typing/ResultCard.tsx`) with Net WPM as the primary headline metric, alongside Accuracy, Gross WPM, Errors, Total Keystrokes, and Duration.
  - Added "Most Mistyped Characters" frequency breakdown with distinct character pills and space label normalization ('Space').
  - Added "Error Breakdown" distinguishing between correct characters, incorrect existing characters, extra characters, and net accuracy rate.
  - Added readable "Mistake Details" mismatch viewer displaying expected vs. typed character comparisons.
  - Added clear result actions: "Try Again", "Change Test", and a clearly represented "Practice My Mistakes" action (reserved for Phase 4).
  - Resolved mobile viewport responsiveness bug across header nav and typing controls bar (verified 375px mobile viewport with zero horizontal overflow).
  - Added 8 unit tests in `src/engine/analytics.test.ts` (34 total project unit tests passing).

---

## [0.2.0] - 2026-09-22

### Added
- **Phase 2: Typing engine**:
  - Implemented pure, deterministic typing engine state machine (`src/engine/typingEngine.ts`) with zero polling loops.
  - Added support for 1-minute (60s), 3-minute (180s), 5-minute (300s), and 10-minute (600s) test durations.
  - Implemented monotonic high-resolution timer (`performance.now()`) with zero timer drift.
  - Character state management supporting `untyped`, `correct`, `incorrect`, and `extraCharacters` past passage boundary.
  - Natural input capture via hidden input supporting desktop physical keyboards, mobile virtual keyboards (`onBeforeInput`), and preventing paste/drop.
  - Synchronized caret cursor rendering with pulse animation.
  - Integrated real-time metrics (Gross WPM, Net WPM, Accuracy %, Errors, and formatted time countdown).
  - Built comprehensive UI components: `TypingTest`, `PassageDisplay`, `MetricsBar`, `DurationSelector`, and `ResultCard`.
  - Added test passages dataset (`src/data/passages.ts`) with varying difficulties.
  - Added unit test suite (`src/engine/typingEngine.test.ts`) covering all 18 core and edge-case scenarios (26 total unit tests passing).

### Added
- **Phase 1: Technical foundation**:
  - Established Next.js 15 (App Router) + TypeScript minimal foundation with zero runtime bloat.
  - Implemented design token system and global CSS reset (`src/styles/globals.css`) covering colors, typography, spacing, border radii, focus indicators, and reduced-motion preferences.
  - Built semantic application shell with accessible `<Header>` (with skip-link target), responsive container system, and `<Footer>`.
  - Configured SEO baseline with Next.js Metadata API, dynamic `robots.ts`, and dynamic `sitemap.ts`.
  - Added error-handling foundation with `not-found.tsx`, `error.tsx`, and `global-error.tsx`.
  - Set up lightweight testing framework with Vitest (`vitest.config.ts`), verified with core typing metrics utilities (`src/utils/metrics.ts` and `src/utils/metrics.test.ts`).
  - Validated clean execution across `typecheck`, `lint`, `test`, `build`, and `dev` server.

---

## [0.0.1] - 2026-09-22

### Added
- **Phase 0: Project foundation and documentation**:
  - Initialized `README.md` with project vision, status, planned features, roadmap, and local development placeholder.
  - Initialized `BRAIN.md` establishing core product vision, principles, target user profiles, architectural direction, phase roadmap, technical decisions, and AI agent working rules.
  - Initialized `REQUIREMENTS.md` detailing functional specifications for MVP, core typing engine, analytics, practice engine, progress tracking, Indian competitive exam simulations, Hindi typing, keyboard visualization, performance, SEO, and explicitly deferred features.
  - Initialized `CHANGELOG.md` tracking project evolution across development phases.
