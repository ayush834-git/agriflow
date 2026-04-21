# Design System Specification: The Living Field

## 1. Overview & Creative North Star
The "Living Field" is the creative North Star for this design system. Agriculture is a sector of immense scale, tactile reality, and constant movement. To move beyond the sterile "SaaS dashboard" look, this system adopts an **Editorial Intelligence** aesthetic. We treat data not as static numbers, but as a living narrative.

By blending the precision of high-end financial journalism with the warmth of organic growth, we create an experience that feels authoritative yet breathable. We break the rigid, boxy grid through **intentional layering** and **asymmetric focal points**, ensuring that the most critical supply chain insights "float" above a sea of calm, warm neutrals.

---

## 2. Color & Surface Philosophy
The palette is rooted in the earth but refined by technology. We use high-contrast accents to signal market urgency against a soft, cream-based foundation.

### Palette Tokens
*   **Background (The Soil):** `#f8f9fa` — A soft, warm off-white that reduces eye strain compared to pure white.
*   **Primary (Harvest Green):** `#006c49` (Base) | `#10b981` (Container) — Use for growth, stability, and primary actions.
*   **Secondary (Scarcity Red):** `#b61722` — Use for market deficits and high-priority alerts.
*   **Tertiary (Surplus Green):** `#006e2f` — Use for abundance and positive price gaps.

### The "No-Line" Rule
**Explicit Instruction:** Prohibit the use of 1px solid borders for sectioning. Traditional "boxed" layouts feel amateur and cluttered. Instead, define boundaries through:
1.  **Background Shifts:** Place a `surface_container_low` card on a `surface` background.
2.  **Tonal Transitions:** Use subtle color blocks to group related data points.

### Surface Hierarchy & Nesting
Treat the UI as physical layers of fine paper.
*   **Base:** `surface` (#f8f9fa)
*   **Secondary Layer:** `surface_container_low` (#f3f4f5) for large content areas.
*   **Active Layer:** `surface_container_lowest` (#ffffff) for the primary interactive cards to provide a "pop" of clean white.

### The "Glass & Gradient" Rule
To add a premium signature, use **Glassmorphism** for floating navigation or hovering tooltips. Apply `surface_container_lowest` at 80% opacity with a `20px` backdrop blur. For primary CTAs, use a subtle linear gradient from `primary` (#006c49) to `primary_container` (#10b981) to give the button "soul" and depth.

---

## 3. Typography
We utilize a dual-font strategy to balance editorial sophistication with data density.

*   **Display & Headlines (Plus Jakarta Sans):** These are your "Editorial" weights. They should feel bold and expansive. Use `display-lg` (3.5rem) for high-level market summaries. The generous x-height of Jakarta Sans conveys confidence.
*   **Body & UI (Inter):** Inter is used for all functional data. It is highly legible at small scales. Use `body-md` (0.875rem) for general descriptions and `label-md` (0.75rem) for technical metadata.
*   **Price Points:** Use `title-lg` or `headline-sm` with a **Semi-Bold (600)** weight. Pricing is the heartbeat of the platform; it should never be missed.

---

## 4. Elevation & Depth
In this system, depth is a functional tool, not a decoration.

*   **Tonal Layering:** Avoid shadows for static cards. Instead, stack `surface_container_highest` items inside `surface_container_low` containers. The 2-3% difference in value is enough for the human eye to perceive hierarchy.
*   **Ambient Shadows:** For modals or floating action buttons, use a "Cloud Shadow":
    *   `y: 12px, blur: 24px, color: rgba(25, 28, 29, 0.06)`
    *   This mimics natural overhead light, making the element feel like it’s hovering over a desk.
*   **Ghost Borders:** If a border is required for accessibility (e.g., in high-glare environments), use `outline_variant` at **15% opacity**. Never use a 100% opaque stroke.

---

## 5. Components

### Cards & Intelligence Modules
*   **Style:** No borders. 12px corner radius (`xl`).
*   **Layout:** Use generous padding (24px to 32px). 
*   **Constraint:** Never use divider lines. Separate content using `surface_container_high` blocks or vertical whitespace.

### Buttons
*   **Primary:** Gradient fill (`primary` to `primary_container`), white text, 8px radius (`DEFAULT`).
*   **Secondary:** `surface_container_high` fill with `on_surface` text. No border.
*   **Tertiary:** Ghost style; text only in `primary` color, with a subtle background shift on hover.

### Price Gap Heatmaps (Chips)
*   **Scarcity:** `secondary_container` background with `on_secondary_container` text.
*   **Surplus:** `tertiary_container` background with `on_tertiary_container` text.
*   **Shape:** Pill-shaped (`full` roundedness) to contrast against the architectural cards.

### Input Fields
*   **Style:** Minimalist. `surface_container_low` background with a `2px` bottom-bar highlight in `primary` only when focused.
*   **Error State:** Change background to `error_container` and add `label-sm` text in `error`.

### Signature Component: The "Growth Sparkline"
A custom chart component for supply chain trends. Use a 2px stroke width in `primary`. Fill the area under the curve with a fading gradient from `primary` (20% opacity) to transparent.

---

## 6. Do’s and Don’ts

### Do
*   **DO** use whitespace as a separator. If you think you need a line, add 16px of space instead.
*   **DO** lean into the "Warmth." Use the `#f8f9fa` background to make the Harvest Green pop.
*   **DO** use asymmetric layouts for Hero sections. Place a large headline on the left and a "floating" data card overlapping the section break on the right.

### Don't
*   **DON'T** use pure black (#000000). Use `on_surface` (#191c1d) for all text to maintain the premium, soft feel.
*   **DON'T** use standard 4px corners. It looks dated. Stick to the 8px–12px range for a modern, approachable vibe.
*   **DON'T** crowd the data. Supply chain logistics are complex; the UI should be the antidote to that complexity.