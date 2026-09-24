# REQUIREMENTS.md — System & Functional Requirements

This document outlines the phased requirements for **Typing Platform**. Requirements are organized logically and prioritized to support phase-by-phase execution without scope creep.

---

## 1. MVP Requirements (Phases 1 - 3 Baseline)

- **Clean Typing Workspace:** Distraction-free, responsive typing canvas supporting 15s, 30s, 60s, and word-count modes (10, 25, 50, 100 words).
- **Accurate Metric Calculations:** Real-time and end-of-test Gross WPM, Net WPM, CPM, and Accuracy percentage.
- **Keystroke State Feedback:** Real-time visual feedback for correct characters, incorrect characters, extra characters, and current cursor position.
- **Keyboard Shortcuts:** Fast keyboard navigation for test restart (`Tab + Enter` or `Esc`), mode switching, and pausing.
- **Post-Test Summary:** Clear breakdown of speed, accuracy, total keystrokes, correct/incorrect strokes, and time elapsed.
- **Zero Login Friction:** Fully usable immediately upon arrival with zero account creation or setup prompts.

---

## 2. Core Typing Engine Requirements

- **Keystroke Handling:**
  - Standardized normalization of space, backspace, and punctuation.
  - Smooth caret movement with zero visual jitter or text reflow glitches.
  - Configurable backspace behavior (standard character erase vs. word erase via `Ctrl+Backspace`).
  - Handling of extra incorrect characters without breaking word alignment.
- **Text Corpus & Modes:**
  - English dictionary sets: Top 200 common words, Top 1000 words, punctuation mode, numbers mode, and quotes mode.
  - Dynamic randomized text generation with configurable length/duration.
- **Timer & Execution Loop:**
  - High-precision timer (`performance.now()`) decoupled from frame rate or browser throttling.
  - Automatic test start on first keystroke.
  - Graceful completion when time expires or target text is completed.

---

## 3. Analytics Requirements

- **Error Breakdown:**
  - Exact counts of missed characters, substituted characters, and extraneous keystrokes.
  - Heatmap or per-key error rate analysis identifying the typist's most frequent error keys.
- **Speed & Consistency Metrics:**
  - WPM over time graph (second-by-second velocity progression).
  - Keystroke latency/burst analysis (identifying hesitation intervals between character pairs).
  - Raw WPM vs. Net WPM differential highlighting penalty impact.

---

## 4. Practice Engine Requirements

- **Weak-Key Drill Generator:**
  - Automated drill generation focusing on keys with error rates above a defined threshold.
  - Bigram and trigram repetition drills (e.g., `th`, `he`, `in`, `er`, `tion`).
- **Targeted Practice Modes:**
  - Problem key isolation mode (custom exercises with high frequency of selected letters).
  - Custom text input (users can paste their own study material or legal/technical passages).
- **Repetition & Mastery Loop:**
  - "Practice Missed Words" one-click button immediately following any test.

---

## 5. Progress Tracking Requirements

- **Local Storage / Persistence:**
  - Local-first storage (IndexedDB / localStorage) recording complete test history.
  - Personal records (All-time best WPM, best accuracy, total tests completed, total time spent typing).
- **Trend Visualization:**
  - Historical progress charts (average WPM over last 10, 50, 100 tests).
  - Filterable by test duration and test mode.
- **Data Portability:**
  - Simple JSON export and import of user history for backup and local migration.

---

## 6. Indian Competitive Exam Requirements

- **Exam Profile Presets:**
  - **SSC (Staff Selection Commission):** CGL / CHSL typing test guidelines (e.g., 2000–2250 key depressions in 15 minutes / 35 WPM in English; strict error penalty calculation).
  - **Railway (RRB NTPC):** 30 WPM English / 25 WPM Hindi without spell-check/editing aids.
  - **Court Typist / Steno Tests:** Specific passage formats and word-for-word verbatim scoring.
- **Exam Environment Simulation:**
  - Passage layout: Split-screen / top-reference & bottom-input window mimicking actual exam software.
  - Strict backspace lock option (configurable to simulate exam rules where backspace is disabled or limited).
  - Keystroke count counter (total depressions) alongside conventional WPM.
  - Evaluation report using official calculation formulas (Full Mistakes, Half Mistakes, Net Qualifying Speed).

---

## 7. Hindi Typing Requirements

- **Font & Layout Support:**
  - **Remington GAIL:** Standard layout for government exams.
  - **InScript (Mangal font):** Unicode-based standard keyboard layout.
  - **KrutiDev 010:** Legacy font character code mapping for state exam compatibility.
- **Complex Script Handling:**
  - Accurate processing of Matras (मात्राएं), conjunct characters (संयुक्त अक्षर), and Halant (्).
  - Dedicated virtual keyboard preview for Hindi finger mapping.
  - Specialized passage collection relevant to Hindi clerical examinations.

---

## 8. Keyboard Visualization Requirements

- **On-Screen Virtual Keyboard:**
  - Real-time key highlight on press.
  - Finger zone coloring showing optimal finger assignment for touch typing.
  - Visual prompts indicating the next key to press.
- **Dynamic Layout Switching:**
  - Support for QWERTY, Dvorak, Colemak, and Hindi InScript/Remington layouts.
  - Toggleable visibility to allow blind typing practice.

---

## 9. Performance & SEO Requirements

- **Performance Targets:**
  - Lighthouse Performance score: 95+.
  - First Contentful Paint (FCP) < 1.0s.
  - Cumulative Layout Shift (CLS) = 0.
  - Interaction to Next Paint (INP) < 50ms during high-frequency typing.
  - Total initial JS bundle < 50KB (uncompressed).
- **SEO Architecture:**
  - Semantic HTML5 structure across all pages.
  - Open Graph, Twitter Cards, and canonical URL meta tags.
  - Dedicated SEO landing pages for high-intent search terms (e.g., "SSC CHSL Typing Test Practice", "Hindi Typing Test KrutiDev", "WPM Calculator").
  - Structured data (Schema.org `WebApplication` & `SoftwareApplication`).

---

## 10. Explicitly Deferred Features (Out of Scope for Initial Phases)

The following features are **strictly deferred** to prevent premature complexity:
- User accounts, OAuth, passwords, and cloud authentication.
- Server-side database (PostgreSQL, MongoDB, Supabase, Firebase).
- Real-time multiplayer racing / WebSocket lobbies.
- Monetization, ad networks, or subscription paywalls.
- Native mobile apps (iOS / Android app stores).
