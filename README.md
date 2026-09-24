# Typing Platform

A fast, modern, and purposeful typing improvement platform designed to help users understand their mistakes, target weak keys, and systematically increase their typing speed and accuracy.

> **Core Philosophy:** "Practice typing, understand your mistakes, and improve your speed."

---

## Current Status
 
- **Current Phase:** Phase 9: Keyboard visualization (Completed)
- **Build Status:** Interactive visual keyboard visualization active across English (QWERTY) and Hindi (InScript reference layout), featuring real-time next-key highlighting, multi-keystroke Devanagari sequence awareness, recent keystroke feedback (pressed, correct, incorrect), mistake heatmap mode, practice focus key highlighting, responsive mobile scaling, and non-interactive accessible presentation.
- **Next Phase:** Phase 10: SEO architecture

---

## Planned Capabilities

- **Core Typing Engine:** High-precision WPM (raw & net), accuracy, CPM measurement, and real-time cursor feedback.
- **Mistake Analysis & Diagnostics:** Heatmaps, error categorization, missed character tracking, and hesitation detection.
- **Targeted Practice Modes:** Weak-key drilling, common n-gram/bigram practice, and custom text drills.
- **Progress Tracking:** Local-first metrics, history tracking, speed trends, and personal records without forced account creation.
- **Lightweight Gamification:** Daily goals, calendar-day streaks, XP, level progression, and curated achievements.
- **Indian Competitive Exam Modes:** Prescribed layout standards, paragraph formats, and scoring criteria matching exams like SSC CGL/CHSL, RRB, State High Courts, and Banking.
- **Hindi Typing Support:** Unicode Devanagari text support, IME integration, curated passages, and targeted Hindi mistake practice.
- **Keyboard Visualization:** Interactive on-screen visualizer guiding finger placement and keystroke rhythm.
- **Fast, Accessible & Keyboard-First:** Zero clutter, instant load times, seamless keyboard shortcuts, and full accessibility.

---

## Development Approach

The platform is developed methodically using a strict phased roadmap:

1. **Phase 0:** Project foundation and documentation *(Completed)*
2. **Phase 1:** Technical foundation *(Completed)*
3. **Phase 2:** Typing engine *(Completed)*
4. **Phase 3:** Results and analytics *(Completed)*
5. **Phase 4:** Practice engine *(Completed)*
6. **Phase 5:** Progress tracking *(Completed)*
7. **Phase 6:** Gamification *(Completed)*
8. **Phase 7:** Indian exam typing modes *(Completed)*
9. **Phase 8:** Hindi typing *(Completed)*
10. **Phase 9:** Keyboard visualization *(Completed)*
11. **Phase 10:** SEO architecture *(Next)*
12. **Phase 11:** Technical SEO and performance
13. **Phase 12:** Launch and iteration

Each phase is implemented independently with regression checks, minimal dependencies, and no premature backend or architecture over-engineering.

---

## Local Development

### Prerequisites
- Node.js >= 18 (Tested on v24.20.0)
- npm >= 9 (Tested on v11.19.0)

### Setup & Run
```bash
# Install dependencies
npm install

# Start local development server (runs on http://localhost:3000)
npm run dev

# Run TypeScript type check
npm run typecheck

# Run linter
npm run lint

# Run unit tests
npm run test

# Build production bundle
npm run build
```
