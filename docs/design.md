# Design — Toko Laptop POS (Uber Design System)

Sistem ini menggunakan **Uber Design System** — confident minimalism dengan black & white universe, whisper-soft shadows, dan pill-shaped interactions.

## Filosofi

Confident minimalism - black & white universe, whisper-soft shadows, pill-shaped interactions, information-dense layouts. Setiap pixel harus punya purpose. Tidak ada dekorasi tanpa fungsi.

## Color Tokens

| Token | Value | Penggunaan |
|-------|-------|------------|
| primary | #000000 | CTA utama, headlines, sidebar |
| primary-deep | #1a1a1a | Pressed state |
| secondary | #efefef | Chip/filter bg, secondary buttons |
| background | #ffffff | Page canvas |
| background-canvas | #fafafa | Page-level backdrop |
| background-bone | #f0f0f0 | Inset card groups |
| surface | #ffffff | Default surface |
| surface-card | #ffffff | Card backgrounds |
| surface-dark | #000000 | Footer, dark sections, sidebar |
| surface-deep | #1a1a1a | Deepest surfaces |
| ink | #000000 | Primary headings |
| body | #000000 | Body text |
| charcoal | #222222 | Captions, metadata |
| ash | #4b4b4b | Secondary text |
| stone | #afafaf | Disabled, placeholders |
| on-primary | #ffffff | Text di atas primary black |
| on-dark | #fcfcfc | Text di atas dark surface |
| on-dark-mute | rgba(252,252,252,0.72) | Secondary text di dark |
| hairline | #efefef | Border halus |
| hairline-strong | #000000 | Border tegas (inputs) |
| divider | #e0e0e0 | Section divider |
| badge-success | #34d399 | Status sukses |
| badge-warning | #f59e0b | Status warning |
| badge-info | #3b82f6 | Status info |
| danger | #dc2626 | Error/destructive |

## Typography

### Font
- **Satu font untuk semua**: `DM Sans` (400, 500, 700)
- **Mono**: `ui-monospace, Cascadia Code, JetBrains Mono, Consolas`

### Prinsip
- Headlines SELALU bold (700) - billboard impact
- Body & UI text pakai 400-500
- Tidak ada decorative type treatment (no uppercase labels, no letter-spacing tricks)
- Line-height ketat di headings (1.0-1.22), longgar di body (1.5)

## Spacing (Base: 8px)

| Token | Value |
|-------|-------|
| xxs | 4px |
| xs | 8px |
| sm | 12px |
| md | 16px |
| lg | 24px |
| xl | 32px |
| xxl | 48px |
| xxxl | 64px |

## Border Radius

| Token | Value | Penggunaan |
|-------|-------|------------|
| none | 0px | Nav bars, full-bleed |
| xs | 4px | Micro elements |
| sm | 8px | Cards, inputs, containers |
| md | 12px | Featured cards |
| lg | 16px | Modals, panels |
| full | 9999px | SEMUA buttons, chips, pills, badges, tabs |

**ATURAN**: Buttons SELALU rounded-full (pill shape). Cards SELALU rounded-sm (8px).

## Elevation (Whisper Shadows)

| Level | Shadow | Penggunaan |
|-------|--------|------------|
| 0 | none | Inline content |
| 1 (card) | 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06) | Standard cards |
| 2 (card-hover) | 0 4px 12px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.08) | Hover state |
| 3 (elevated) | 0 8px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08) | Dropdowns, popovers |
| 4 (float) | 0 12px 32px rgba(0,0,0,0.16), 0 4px 12px rgba(0,0,0,0.08) | FAB, floating |

**ATURAN**: Shadow opacity MAKSIMAL 0.16. Tidak ada colored shadows. Tidak ada glow effects.

## Component Specs

### Buttons
- **Primary**: bg-primary text-on-primary rounded-full h-[44px] px-6 font-medium. Hover: bg-primary-deep
- **Secondary**: bg-surface text-ink rounded-full h-[44px] px-6 border border-hairline shadow-card. Hover: shadow-card-hover
- **Chip**: bg-secondary text-ink rounded-full h-[44px] px-4 text-body-sm font-medium
- **Ghost**: text-ink rounded-full hover:bg-secondary

### Cards
- bg-surface-card rounded-sm shadow-card p-6. Hover: shadow-card-hover transition-shadow
- NO borders by default - cards defined by shadow
- Information-dense, minimal internal padding

### Inputs
- bg-surface-card text-ink rounded-sm h-[44px] px-4 border border-hairline-strong
- Focus: ring-focus (black 50% opacity)

### Sidebar
- bg-surface-dark text-on-dark h-full
- Nav items: rounded-sm hover:bg-white/10
- Active: bg-white/15 text-on-dark font-medium

### Badges
- bg-primary text-on-primary rounded-full px-2 py-0.5 text-caption font-medium

## Aturan Implementasi

1. **WAJIB** pakai shadow-card di semua card - BUKAN border
2. **DILARANG** pakai gradient apapun - semua surface flat solid color
3. **DILARANG** pakai border di card - depth via shadow only
4. **WAJIB** rounded-full untuk semua buttons dan interactive pills
5. **WAJIB** rounded-sm (8px) untuk semua cards dan containers
6. **DILARANG** pakai warna selain black/white/gray di UI chrome
7. **Font**: DM Sans only, weight 400/500/700
8. **Shadows**: Whisper-soft only (max 0.16 opacity)
9. **Layout**: Information-dense, compact, efficient - bukan airy
10. **Hover pada card**: transition dari shadow-card ke shadow-card-hover
