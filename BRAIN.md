# BRAIN.md — Project Memory & Architecture Context

## 1. Product Vision

**"Practice typing, understand your mistakes, and improve your speed."**

TypingSpeed is not just another minimal typing-test clone. It is a targeted skill-building and diagnostic typing platform designed to help users identify their exact mechanical weaknesses (problem keys, slow transitions, high-error combinations) and fix them through targeted practice. Additionally, it addresses an underserved need by providing purpose-built typing test simulations for Indian competitive examinations and regional language typing (Hindi).

---

## 2. Product Principles

- **Fast:** Instant page load, zero input lag, 60fps+ rendering during typing.
- **Simple:** Clean, distraction-free interface; immediate focus on typing.
- **Accurate:** Mathematically rigorous calculations for WPM, Net WPM, accuracy, and keystroke events conforming to standard typing metrics and examination grading criteria.
- **Keyboard-first:** Every primary action (restart, change mode, pause, drill weak keys) must be executable via keyboard shortcuts without needing a mouse.
- **Mobile-friendly:** Responsive layouts with functional review and practice interfaces adaptable to touchscreen viewports.
- **Accessible:** Semantic markup, high-contrast readable themes, ARIA attributes, and screen-reader awareness.
- **Privacy-friendly:** Local-first storage for user progress; no tracking scripts or unnecessary personal data collection.
- **Free-first:** Core features available with zero paywalls and zero friction.
- **Minimal dependencies:** Prefer native web APIs (vanilla JS/CSS or lightweight modern tooling); no bloat libraries.
- **No unnecessary backend:** Client-side compute by default; do not introduce servers, databases, or cloud functions unless explicitly required by a specific phase.
- **No unnecessary complexity:** Keep state transitions simple and predictable. Avoid premature abstractions.

---

## 3. Target Users

1. **Competitive-Exam Aspirants:** Candidates preparing for tests such as SSC CGL/CHSL, RRB, State High Court Steno/Typist, and DSSSB requiring specific WPM thresholds, error penalties, and strict backspace/highlight rules.
2. **Students & Job Seekers:** Learners looking to develop professional typing speed for office productivity and tech careers.
3. **Beginners:** Individuals learning touch typing fundamentals, home row positioning, and finger assignments.
4. **Indian Regional Language Typists:** Users practicing Hindi typing (KrutiDev / Mangal InScript / Remington) for government or clerical examinations.
5. **General Enthusiasts:** Typists who want deep diagnostics into their speed bottlenecks, weak keys, and progress trends.

---

## 4. Architecture Direction

- **Client-First Runtime:** All keystroke processing, real-time timer logic, and metric calculations run 100% on the client.
- **Modular Engines:** Decouple the Core Typing Engine (keystroke ingestion, event loop, timer) from the Analytics Engine (error aggregation, weak-key isolation) and Practice Engine (text generation, drill building).
- **Local Persistence:** Utilize `localStorage` and `IndexedDB` for test histories, personal bests, and analytics history.
- **Minimalistic Tooling:** Lean build pipeline with zero heavyweight runtime overhead.
- **Clean State Management:** Predictable state transitions (`idle` -> `active` -> `paused` -> `completed`).

---

## 5. Current Phase & Progress

- **Current Phase:** Phase 10: SEO Architecture & Baseline Audit (Completed)
- **Next Phase:** Phase 11: Design V2 & UI Polish
- **Completed Phases:**
  - [x] Phase 0: Project foundation and documentation
  - [x] Phase 1: Technical foundation
  - [x] Phase 2: Typing engine
  - [x] Phase 3: Results and analytics
  - [x] Phase 4: Practice engine
  - [x] Phase 5: Progress tracking
  - [x] Phase 6: Gamification
  - [x] Phase 7: Indian Competitive Exam Modes
  - [x] Phase 8: Hindi Typing Support
  - [x] Phase 9: Keyboard Visualization
  - [x] Phase 10: SEO Architecture

---

## 6. Important Technical Decisions

- **First-Class Hindi Support Without Engine Duplication:** Hindi typing reuses the core typing engine (`useTypingEngine`, `typingEngine.ts`), metrics bar, passage display, and result card. Language is handled strictly as configuration and metadata (`TypingLanguage = 'en' | 'hi'`), completely avoiding duplicate or parallel engines.
- **Standards-Based Unicode Grapheme Segmentation:** Uses `Intl.Segmenter` with `granularity: 'grapheme'` to segment Devanagari syllables and conjuncts into user-perceived typographic characters. This ensures combining marks (matras, viramas, anusvaras) are never isolated or rendered with broken dotted circles (`◌`).
- **Strict NFC Normalization Strategy:** All text comparisons normalize strings to Unicode NFC (`String.prototype.normalize('NFC')`). This guarantees precomposed and decomposed Unicode representations (such as nukhtas) are compared accurately without registering false typing errors.
- **Browser/OS/IME Native Input Architecture:** Rather than building an application-level phonetic transliteration engine, the platform integrates with native browser/OS input methods (Windows Hindi IME, Google Input Tools, InScript, Gboard). The input layer safely tracks composition events (`compositionstart`, `compositionend`, `beforeinput`, `input`), suppresses intermediate phonetic composition keys, and commits clean Unicode text.
- **InScript Multi-Keystroke Prefix Delegation:** For direct InScript keyboard inputs where consonants and matras are typed sequentially, the engine detects grapheme prefixes, holds composition state, and either completes the grapheme or delegates to the next character upon consonant sequence.
- **Deterministic Hindi Passages & Practice Vocabulary:** Created original, grammatical Hindi passages covering education, technology, governance, environment, and culture (`src/data/hindiPassages.ts`). Built curated Hindi vocabulary pools (`src/data/hindiPracticeWords.ts`) powering targeted mistake practice (Focus Characters, Missed Words with repetition, and Targeted Bigrams).
- **Backward-Compatible Unified Storage & Gamification:** Extended `TypingHistoryEntry` with optional `language?: 'en' | 'hi'`, maintaining 100% backward compatibility with legacy history records in `typing_platform_history`. Hindi tests award deterministic XP, contribute to daily typing goals, and advance streaks under the existing gamification system without split databases.

- **Configurable Indian Competitive Exam Mode Architecture:** Indian competitive exam modes (SSC, RRB, CPCT) are implemented strictly through a configuration-driven architecture (`src/engine/examProfiles.ts` and `src/engine/examTypes.ts`). Zero duplicate typing engines are created; the existing deterministic `useTypingEngine` state machine is reused by feeding exam-specific durations (e.g., 10 min, 15 min) and deterministic exam passages.
- **Transparent Practice Simulation Policy:** All exam modes are explicitly branded and labeled as practice simulations with clear UI disclaimers ("Practice simulation — not an official examination result"). Unverified rules or thresholds are never claimed as official, preventing false expectations of official exam qualification.
- **Pure Deterministic Exam Evaluation Layer:** Post-test exam assessments are performed by a pure deterministic function (`evaluateExamResult` in `src/engine/examEngine.ts`) decoupled from React UI. It validates Net WPM against target benchmarks and enforces minimum accuracy thresholds (e.g., 95% for SSC/RRB, 90% for CPCT), returning structured status (`passed`, `failed`, or `informational`).
- **Backward-Compatible History & Single-Session Gamification:** Extended `TypingHistoryEntry` with optional metadata (`testMode?: 'standard' | 'exam'` and `examProfileId?: string`) with standard fallbacks, ensuring existing Phase 5 localStorage data remains fully readable and valid. Exam practice tests count as normal completed sessions, participating in single-session gamification XP and streak tracking without duplicate records or split databases.

- **Derived Gamification Architecture Without Redundant Storage:** Gamification states (Daily Goals, Practice Streaks, XP, Levels, Curated Achievements, and Personal Bests) derive directly and deterministically from existing Phase 5 completed test history (`loadHistory()`). This avoids redundant database/localStorage states and guarantees that when a user clears their progress history, gamification immediately and consistently resets without orphaned records.
- **Local-First Calendar-Aware Streaks & Daily Goals:** Practice streaks and daily typing goals respect the browser's local timezone dates (`YYYY-MM-DD`) rather than raw UTC timestamps, preventing false breaks or skips around midnight. A 1-day grace period is supported so streaks remain active and recoverable across consecutive calendar days.
- **Deterministic XP & Tiered Level Progression:** XP is awarded once per completed normal test using a deterministic rule set (base 10 XP + accuracy bonuses up to +10 XP + speed bonuses up to +15 XP) and excluded from abandoned tests or practice drills. Level thresholds scale predictably without external game engines or random rewards.
- **Non-Intrusive Secondary Gamification:** Gamification is strictly secondary to the typing workflow. ResultCard displays a compact, unobtrusive pill strip (+XP earned, level, streak), completely avoiding blocking modals, popups, sounds, canvas confetti, or animation delays that degrade typing productivity.
- **Local-First Progress Persistence via localStorage:** Stored test results are preserved entirely in client-side `localStorage` under a single namespaced key (`typing_platform_history`) with a versioned envelope schema (`{ version: 1, entries: [...] }`). Safe universal guards (`getStorage()`) ensure zero SSR hydration mismatches, and JSON parse failures recover gracefully without crashing.
- **Strict 100-Entry Capacity Boundary:** To prevent unbounded storage consumption and performance degradation on constrained mobile devices, history is automatically bounded to the latest 100 completed tests (`MAX_HISTORY_ENTRIES = 100`), trimming the oldest records upon subsequent saves.
- **Zero-Dependency Responsive Trend Visualization:** Speed progression curves are rendered using lightweight, pure inline SVGs (`src/components/progress/ProgressTrend.tsx`). This avoids heavy third-party charting libraries, maintains full mobile responsiveness without horizontal overflow, and gracefully accommodates single-point, multi-point, or identical-value scenarios.
- **Cross-Session Weak Character Aggregation:** Problem keys are aggregated across historical test attempts (`src/engine/progressAnalytics.ts`), enabling users to identify chronic finger/key coordination weaknesses across sessions rather than relying solely on single-test anomalies.
- **Deterministic Practice Generation Without AI/LLMs:** Targeted practice drills (`src/engine/practiceEngine.ts`) are generated deterministically using local scoring and curated English vocabulary. Mistyped characters, missed passage words, and common bigrams are isolated and transformed into structured `PracticePlan` instances without random gibberish or external dependencies.
- **Engine Reuse for Practice Drills:** Practice sessions compile generated drill texts into standard `Passage` objects fed directly into the core `useTypingEngine` state machine. This eliminates duplicate typing engines while maintaining identical timer, caret, and metric precision.
- **Deterministic Analytics Separation:** All post-test performance evaluations, character frequency aggregations, and mismatch mappings are computed via `analyzeTypingResult` in `src/engine/analytics.ts` outside React component lifecycles, ensuring deterministic testing and zero re-render computation overhead during live typing.
- **Pure Typing Engine State Machine:** The typing engine core (`src/engine/typingEngine.ts`) is designed as a pure, deterministic state machine decoupled from React and DOM APIs. Keystrokes, backspace, extra character overflow, and timer ticks can be simulated and tested 100% deterministically.
- **Monotonic High-Resolution Timing:** Timers derive elapsed duration strictly from `performance.now()` against a recorded `startTime` rather than accumulated intervals, preventing timer drift during system latency or tab suspension.
- **Input Capture Architecture:** Uses an accessible hidden input element bound to the typing canvas, enabling seamless input across physical desktop keyboards and touch/mobile virtual keyboards (`onKeyDown` + `onBeforeInput`), while blocking paste and drag-and-drop.
- **Framework & Architecture:** Next.js 15 (App Router) + TypeScript in strict mode. Provides static export capability (`output: 'export'`), native SEO primitives, fast client-side navigation, and zero server hosting cost.
- **Styling Strategy:** Vanilla CSS with custom property tokens (`src/styles/globals.css`). No Tailwind or heavy component libraries, ensuring maximum speed, clean CSS variables, and zero runtime styling overhead.
- **Testing Setup:** Vitest for lightning-fast TypeScript unit and business logic testing without complex configurations.
- **Client-Side Metric Computation:** Standardized on the 5-strokes-per-word definition:
  - $\text{Gross WPM} = \frac{\text{All Keystrokes} / 5}{\text{Time in Minutes}}$
  - $\text{Net WPM} = \text{Gross WPM} - \frac{\text{Uncorrected Errors}}{\text{Time in Minutes}}$
- **Phase 9 Keyboard Visualization Architecture:**
  - **Single Source of Truth:** The visual keyboard is strictly a presentation overlay. It consumes `TypingState` from `useTypingEngine` and `TypingAnalytics` from `analyzeTypingResult`. No secondary state machines, parallel keydown processors, or duplicate accuracy calculators were introduced.
  - **Explicit Layout Identities:** Standard `English — QWERTY` and `हिंदी — InScript (Reference Layout)` (conforming to BIS IS 13194 / Windows InScript standards). InScript is explicitly labeled as a reference layout in the UI, acknowledging that users with phonetic IMEs or Google Input Tools produce Unicode directly.
  - **Unicode & Grapheme Sequence Awareness:** Decomposes complex Devanagari graphemes across `pendingComposition` state (e.g. `भा` highlights base consonant `भ` [Shift+Y] initially, then matra `ा` [E] after consonant entry). If a grapheme is unmapped or ambiguous, the status indicator displays the expected grapheme and does not invent false keys.
  - **Non-Interactive Accessible Presentation:** Visual keycaps are presentation elements (`aria-hidden="true"` and non-focusable), ensuring they never intercept typing focus or keyboard navigation away from the native hidden input.
  - **Responsive Layout & Persistence:** Fully responsive scaling with internal scroll containment prevents horizontal page overflow at 375px mobile viewports (`scrollWidth <= viewport width`). User visibility preference is persisted cleanly in `localStorage` under `typing_platform_keyboard_visible`.
- **Phase-by-Phase Delivery:** No jumping ahead to implement multi-phase features concurrently.
- **Zero Backend at Inception:** No database, auth, or API layer until multiplayer or remote sync is explicitly mandated.

---


## 7. Important Constraints

- **Input Latency:** Zero perceptible input latency during high-speed typing (150+ WPM). No heavy operations on keydown listeners.
- **Backspace & Navigation Constraints:** In certain Indian exam modes, backspace may be restricted or disabled, and scrolling must replicate official exam interfaces.
- **Multilingual Input Handling:** Hindi typing requires dealing with IME compositions, legacy font encodings (KrutiDev mapping), and Unicode InScript layouts without breaking the core engine.
- **No Heavy External UI Libraries:** No massive component frameworks that inflate bundle size or slow down initial paint.

---

## 8. Future Direction

- **Phase 1 to 3:** Robust technical baseline, high-precision typing engine, and detailed post-test diagnostic analytics.
- **Phase 4 to 6:** Automated weak-key practice generation, longitudinal progress tracking, and lightweight gamification.
- **Phase 7 to 9:** Indian government exam simulation modules, Hindi typing layouts, and interactive visual keyboard overlays.
- **Phase 10 to 12:** Production SEO architecture, Core Web Vitals optimization, and public launch.

---

## 9. AI Agent Working Rules

1. **Step-by-Step Phase Discipline:** Never implement multiple major phases at once unless explicitly instructed.
2. **Pre-flight Routine:** Before starting any phase:
   - Read `BRAIN.md`
   - Read `REQUIREMENTS.md`
   - Inspect the current codebase
   - Verify completed work and constraints
   - Implement strictly what the target phase specifies
3. **Post-flight Routine:** After completing a phase:
   - Test and verify code execution and behavior
   - Fix all runtime errors and lints
   - Check for regressions against existing functionality
   - Update `CHANGELOG.md`
   - Update `BRAIN.md` if an architectural decision changed
   - Report exactly what changed and stop
4. **Code Preservation:** Do not rewrite or refactor working code unnecessarily.
5. **Simplicity First:** Do not introduce a database, authentication, API, or backend unless the active phase explicitly requires it.
