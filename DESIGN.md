# Design System: Grid Systems Overlay
**Project ID:** Local repository analysis only (`grid-systems-overlay`)  
**Source:** `public/content.css`, `public/popup.html`, `src/utils.ts`

## 1. Visual Theme & Atmosphere
This interface lives in two related but distinct visual modes:

- The in-page overlay is a light, frosted utility surface. It feels precise, compact, and quietly technical rather than decorative.
- The browser popup is warmer and slightly softer. It uses a cream-tinted canvas and brighter controls to feel more app-like and approachable.

The overall aesthetic is minimalist and utilitarian with polished micro-interactions. Rounded geometry, translucent whites, soft shadows, and a restrained orange accent keep the tool visible without overpowering the page it sits on top of.

## 2. Color Palette & Roles

### Overlay palette
- **Frosted Page White** (`rgba(255, 255, 255, 0.94)`)  
  Used for the floating controller background.
- **Glass Panel White** (`rgba(255, 255, 255, 0.98)`)  
  Used for popovers, slider shells, and color swatches.
- **Soft Ink Border** (`rgba(0, 0, 0, 0.08)`)  
  Used for hairline borders and separators.
- **Primary Soft Black** (`rgba(28, 28, 30, 0.88)`)  
  Used for main text, slider handles, icons, and dark emphasis states.
- **Muted System Gray** (`rgba(60, 60, 67, 0.55)`)  
  Used for section headings, hints, lower-emphasis labels, and the slider handle.
- **Surface Mist** (`rgba(0, 0, 0, 0.04)`)  
  Used for passive button and control backgrounds.
- **Surface Mist Hover** (`rgba(0, 0, 0, 0.06)`)  
  Used for hover reinforcement on secondary controls.
- **Signal Orange** (`#FF8A3D`)  
  Used as the core accent for active slider fill and visual emphasis.
- **Signal Orange Wash** (`rgba(255, 138, 61, 0.18)`)  
  Used for selected pills, active chips, and the slider’s filled region.
- **Signal Orange Sheen** (`rgba(255, 138, 61, 0.10)`)  
  Used to soften the active slider gradient and keep the accent airy.

### Popup palette
- **Warm Canvas** (`#F4F3EF`)  
  Used for the popup page background.
- **Pure Panel White** (`#FFFFFF`)  
  Used for cards, sliders, and primary popup surfaces.
- **Soft Ivory Panel** (`#F6F6F3`)  
  Used for secondary button surfaces like the quick-axis control.
- **Popup Text Ink** (`#111827`)  
  Used for primary text and toggle dots.
- **Popup Muted Gray** (`#6B7280`)  
  Used for supporting labels and section headings.
- **Action Blue** (`#1F8FFF`)  
  Used as the popup’s interactive accent.
- **Action Blue Wash** (`rgba(31, 143, 255, 0.12)`)  
  Used for selected/open states in popup controls.
- **Popup Orange** (`#F28C28`)  
  Used as the enabled-state accent in the popup toggle.
## 3. Typography Rules
- The system uses `SF Pro Display`, falling back to `Segoe UI`, `system-ui`, and platform sans-serifs.
- Primary control labels use compact, high-legibility sans typography with low line-height and minimal tracking.
- Section headings use uppercase micro-headings with expanded tracking (`0.08em`) to create structure without adding heavy borders.
- Value text is slightly denser and darker than helper text, often uppercase in compact controls to read like instrument values.
- The type hierarchy is intentionally shallow: title, section heading, control label, control value, helper text.

## 4. Component Stylings
- **Buttons:** Mostly pill-shaped or softly rounded rectangles. Passive states use misty neutral fills; active or selected states pick up accent washes. Press feedback uses subtle scale-down interaction.
- **Cards/Containers:** Generously rounded corners, translucent white surfaces, and whisper-soft diffused shadows. The overlay prefers a glass-panel feeling over opaque blocks.
- **Inputs/Forms:** Borders are light and quiet. Selects and swatches use softly rounded rectangles (`12px`) with white or near-white fills.
- **Sliders:** Rounded rectangular shells with full white backgrounds, a softened orange filled region, heavier medium-plus labeling, and a muted gray vertical handle. Internal rulers and the handle appear only on hover/focus to keep the default state calm.
- **Icon toggles:** Circular or pill-like controls with dark iconography by default and accent color only when state changes matter.

## 5. Layout Principles
- Spacing is compact but breathable. Most control groups sit in `6px`, `8px`, `10px`, `12px`, `14px`, and `16px` increments.
- The overlay panel favors stacked sections with spacing and section headings rather than heavy structural chrome.
- Rounded corners establish hierarchy:
  - **Full pill** for micro-controls and toggle capsules
  - **18px** for major popovers/cards
  - **14px** for slider containers and medium controls
  - **12px** for selects, swatches, and compact inputs
  - **10px** for small segmented options
- Layouts use simple grids for option groups and flex rows for labels/values. The goal is tool-like clarity, not expressive asymmetry.

## 6. Motion & Interaction Rules
- Motion is short and property-specific. Most interactions live between `140ms` and `180ms`.
- The primary easing curve is a strong ease-out: `cubic-bezier(0.23, 1, 0.32, 1)`.
- Hover states should reveal detail, not create spectacle. The slider ruler and handle are a good model: hidden at rest, softly revealed on intent.
- Press states should feel tactile through small scale changes rather than dramatic motion.
- Reduced-motion handling should preserve clarity while removing nonessential transform-heavy effects.

## 7. Design Intent Summary
The design language is best described as:

- **Precise**
- **Softly technical**
- **Lightweight**
- **Rounded**
- **Glass-inflected**
- **Accent-sparing**

When extending this system, prefer neutral white and soft-black foundations, reserve saturated color for state changes, and keep the interface feeling like an instrument panel rather than a marketing surface.
