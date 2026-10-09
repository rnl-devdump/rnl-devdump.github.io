# Design Direction: Kiruu Ecosystem (rnl-devdump)

This document establishes the authentic visual identity, personality, typography, color palettes, and liveliness dials for each application in the `rnl-devdump` ecosystem (excluding Tawir and Movie apps per scope).

---

## 1. Root Portal & Hub (`/index.html`)

- **Page Kind:** Central ecosystem navigator & application launchpad.
- **Audience:** Developers, translators, researchers, and community visitors.
- **Personality:** Tactile editorial, neo-brutalist warmth, artisanal developer portfolio.
- **Dials:** `ENERGY 2 / RHYTHM 2 / MOTION 1`
- **Palette:**
  - Base background: Tinted ambient slate `#dceef9` with subtle paper gradient
  - Surface cards: Crisp off-white `#ffffff` with solid 2px outline `#111111`
  - Accent: Warm peach `#fee6e3` (hover: `#ffdeda`)
  - Text: High-contrast ink `#111827` (subtext: `#475569`)
- **Typography:**
  - Display / Headings: `Vandelvira` / Georgia (classic serif craft)
  - Body / UI: System UI stack / Plus Jakarta Sans
- **Rules & Restraints:**
  - No decorative sparkles or pulsing dots.
  - Category filters reflow into a clean horizontal wrap or dropdown on mobile.
  - Card touch targets minimum 44px with 2px hard drop-shadow.

---

## 2. Analytics & App Dashboard (`/dashboard`)

- **Page Kind:** Project health, build status, and sublink routing management.
- **Audience:** Ecosystem maintainer and technical users.
- **Personality:** Clean functional telemetry, calm, high legibility.
- **Dials:** `ENERGY 1 / RHYTHM 2 / MOTION 1`
- **Palette:**
  - Background: Crisp cool neutral `#f8fafc`
  - Cards: Pure white `#ffffff` with subtle borders `#e2e8f0`
  - Accents: Deep slate `#0f172a` for primary controls, emerald `#059669` for live state (no glow).
- **Typography:**
  - Display / Headers: Plus Jakarta Sans (600/700)
  - Data / Metrics: Monospace `ui-monospace, SFMono-Regular`
- **Rules & Restraints:**
  - Metrics reflect real sublink health and status from `sublinks.json`.
  - No generic 4-stat cards with invented percentage trends.
  - Mobile view collapses sidebar into a clean top drawer or tab bar.

---

## 3. Utility Rates Tracker (`/bill`)

- **Page Kind:** Regional electric and water cooperative billing calculator and rate sheet.
- **Audience:** Residents and household budget managers in Northern Luzon.
- **Personality:** Trustworthy civic utility, clear high-contrast tables.
- **Dials:** `ENERGY 1 / RHYTHM 1 / MOTION 1`
- **Palette:**
  - Primary: Deep naval blue `#1e3a5f`
  - Accent: Amber `#d97706` for rate adjustments
  - Neutral: Off-white `#fdfdfd` on slate `#f1f5f9`
- **Typography:**
  - Inter or system sans-serif for numbers and billing tables.
- **Rules & Restraints:**
  - Numeric inputs feature large touch targets and explicit calculation feedback.
  - Zero decorative buzzwords. Clear breakdown of kilowatt-hour tiers.

---

## 4. Dataset Annotator & Validation Suite (`/dataset`, `/validation`)

- **Page Kind:** Multilingual sentence alignment and validation tool.
- **Audience:** Linguists, translators, and NLP researchers.
- **Personality:** Precision workspace, maximum readability, zero eye-strain.
- **Dials:** `ENERGY 1 / RHYTHM 2 / MOTION 1`
- **Palette:**
  - Editor background: `#0f172a` (dark mode) / `#ffffff` (light mode) with full functional parity.
  - Syntax highlights: Restrained blue `#38bdf8`, sage green `#4ade80`.
- **Typography:**
  - Parallel text viewer: JetBrains Mono / SFMono-Regular for bilingual alignment.
- **Rules & Restraints:**
  - Empty, loading, and completed state screens must be informative and actionable.
  - Full keyboard shortcuts (Enter to submit, Tab navigation, Escape to cancel).

---

## 5. Anime Hub (`/anime`)

- **Page Kind:** Media catalogue, release schedule, and episode index.
- **Audience:** Anime community and viewers.
- **Personality:** Cinematic, dark ink canvas, rich poster gallery.
- **Dials:** `ENERGY 2 / RHYTHM 3 / MOTION 1`
- **Palette:**
  - Base: Deep obsidian `#0b0f19`
  - Card surfaces: Dark slate `#161e2e`
  - Accent: Crimson vermilion `#f43f5e`
- **Rules & Restraints:**
  - Real aspect-ratio card grids (2:3 for posters) with fluid responsive collapse.
  - Clean bottom nav or thumb-friendly header on mobile screens.

---

## 6. Community Forum (`/forum`)

- **Page Kind:** Threaded discussion board and announcement log.
- **Audience:** Project collaborators and community testers.
- **Personality:** Editorial warmth, comfortable reading width (65ch).
- **Dials:** `ENERGY 1 / RHYTHM 2 / MOTION 1`
- **Palette:**
  - Base: Ivory cream `#faf9f6`
  - Text: Charcoal `#1c1917`
  - Accent: Rust terra-cotta `#c2410c`

---

## 7. Web Chess (`/chess`)

- **Page Kind:** Interactive browser chess game.
- **Audience:** Casual players.
- **Personality:** Timeless classic board, distraction-free play area.
- **Dials:** `ENERGY 1 / RHYTHM 1 / MOTION 1`
- **Palette:** Warm slate `#292524`, wood board cream `#f5f5f4` / walnut `#78716c`.

---

## 8. Vibe Video & Screen Share (`/vibe`)

- **Page Kind:** Peer-to-peer secure video calling and screen sharing room (Google Meet aesthetic).
- **Audience:** Collaborators, teammates, and friends.
- **Personality:** Focused, distraction-free meeting canvas; tactile matte controls; clear participant states.
- **Dials:** `ENERGY 1 / RHYTHM 1 / MOTION 1`
- **Palette:**
  - Canvas background: `#202124` (Google Meet dark slate)
  - Surface tiles: `#3c4043` / `#2d2e30`
  - Accent / Positive: Google Blue `#1a73e8` / `#8ab4f8`
  - End Call: Vibrant Crimson `#ea4335`
  - Text: High-contrast pure white `#ffffff` and muted `#bdc1c6`
- **Typography:**
  - Plus Jakarta Sans / Roboto / system sans-serif stack
- **Rules & Restraints:**
  - Passcode verification required for room entry on both sides.
  - Video stream dynamically fits aspect ratio without cropping vital screen share details.
  - Controls bar pinned at the bottom with accessible >=44px buttons, clear active/muted toggles, and tooltip feedback.
  - No decorative AI fluff: clear audio indicator, camera preview, participant avatar tiles with initial when video is off.

