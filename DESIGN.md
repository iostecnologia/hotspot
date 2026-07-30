---
name: Hotspot Dark Obsidian
colors:
  background: "#0f111a"
  surface: "#1a1d27"
  surface-hover: "#252b3b"
  input: "#0d1117"
  border: "#1f2937"
  accent: "#3b82f6"
  accent-hover: "#2563eb"
  text: "#f3f4f6"
  text-muted: "#9ca3af"
  danger: "#ef4444"
  danger-hover: "#dc2626"
typography:
  fontFamily: "Inter, system-ui, sans-serif"
  h1:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: "700"
    lineHeight: "1.2"
  h2:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: "600"
    lineHeight: "1.3"
  body-md:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: "400"
    lineHeight: "1.5"
  label-sm:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: "500"
    lineHeight: "1.4"
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    border: "1px solid {colors.border}"
    padding: "{spacing.md}"
  input:
    backgroundColor: "{colors.input}"
    rounded: "{rounded.md}"
    border: "1px solid {colors.border}"
    padding: "10px 14px"
    textColor: "{colors.text}"
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "10px 20px"
---

# Hotspot Dark Obsidian - Design System

## Overview
An immersive, technical dark theme customized for a WiFi captive portal and administration management tool. 

The visual identity evokes security, modernity, and performance. Layouts feature clean lines, sharp geometry with soft rounded accents (8px/12px), and a high-contrast dark palette to avoid eye strain during long operation shifts.

## Colors
- **Background (#0f111a):** Deep charcoal ink representing negative space.
- **Surface (#1a1d27):** Soft navy slate that acts as container backgrounds for cards and widgets.
- **Input (#0d1117):** Clean dark hollow representing inputs and terminal boxes.
- **Accent (#3b82f6):** Electric blue for call-to-actions, status markers, and focus rings.

## Typography
Semantic styles mapped to standard scale:
- `h1`: Bold, prominent title (30px).
- `h2`: Strong subtitle (20px).
- `body-md`: Clear, highly readable text (14px) for descriptions and logs.
- `label-sm`: Small utility text (12px) for buttons, badges, and fields.

## Layout & Spacing
Built on a standard 8-point grid:
- `xs` (4px), `sm` (8px), `md` (16px), `lg` (24px), `xl` (32px).
- Responsive spacing transitions from `md` on mobile to `lg`/`xl` on desktop.

## Shapes & Radii
- Cards use `rounded-xl` (12px) or `rounded-lg` (8px) for containers to present a modern SaaS feel.
- Badges use `rounded` (4px) or `rounded-full` (9999px).
- Inputs and buttons use `rounded-md` (8px).

## Do's and Don'ts
- **Do** respect the Purple Ban: Never introduce purple, violet, or indigo colors in standard components.
- **Do** maintain a clean contrast ratio of at least 4.5:1 for accessibility.
- **Don't** use mesh gradients or auroras in standard widgets. Use raw container borders and flat dark tones.
- **Do** provide smooth transitions (`transition-colors duration-200`) for all interactive elements.
