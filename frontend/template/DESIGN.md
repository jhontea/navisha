---
name: Navisha Design System
colors:
  surface: '#f9f9ff'
  surface-dim: '#d8d9e5'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f3fe'
  surface-container: '#ecedf9'
  surface-container-high: '#e6e8f3'
  surface-container-highest: '#e0e2ed'
  on-surface: '#181c23'
  on-surface-variant: '#414755'
  inverse-surface: '#2d3039'
  inverse-on-surface: '#eef0fc'
  outline: '#717786'
  outline-variant: '#c1c6d7'
  surface-tint: '#005bc1'
  primary: '#0058bc'
  on-primary: '#ffffff'
  primary-container: '#0070eb'
  on-primary-container: '#fefcff'
  inverse-primary: '#adc6ff'
  secondary: '#50616b'
  on-secondary: '#ffffff'
  secondary-container: '#d3e5f1'
  on-secondary-container: '#566771'
  tertiary: '#9e3d00'
  on-tertiary: '#ffffff'
  tertiary-container: '#c64f00'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a41'
  on-primary-fixed-variant: '#004493'
  secondary-fixed: '#d3e5f1'
  secondary-fixed-dim: '#b7c9d5'
  on-secondary-fixed: '#0c1e26'
  on-secondary-fixed-variant: '#384953'
  tertiary-fixed: '#ffdbcc'
  tertiary-fixed-dim: '#ffb595'
  on-tertiary-fixed: '#351000'
  on-tertiary-fixed-variant: '#7c2e00'
  background: '#f9f9ff'
  on-background: '#181c23'
  surface-variant: '#e0e2ed'
  transport-blue: '#DBEAFE'
  stay-purple: '#EDE9FE'
  budget-green: '#DCFCE7'
  note-yellow: '#FEF9C3'
  destructive-red: '#EF4444'
typography:
  display:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 1.5rem
  margin-mobile: 1rem
  margin-desktop: 2.5rem
  max-width: 1200px
---

## Brand & Style

The brand personality is **Adventurous, Clean, and Organized**. It targets Gen Z and Millennial travelers who seek a frictionless planning experience that feels as exciting as the trip itself. The visual language is professional yet vibrant, prioritizing clarity and ease of use to reduce the cognitive load of itinerary management.

The design style is **Modern Minimalism**. It relies on high-quality whitespace to create a sense of calm, paired with crisp typography and subtle depth. Rather than heavy decorative elements, the system uses purposeful color accents and soft shadows to guide the user's eye and establish hierarchy. The interface should feel like a high-end digital planner—structured, tactile, and highly responsive.

## Colors

The palette is built on a "Fresh Air" primary blue that serves as the core brand driver for CTAs and active states. The foundation is a pure white background, ensuring maximum legibility and a clean "paper-like" feel.

- **Primary**: A vibrant, modern blue for high-contrast actions (e.g., "Create Trip").
- **Secondary**: A light wash of the primary blue used for selection states and subtle highlights.
- **Categorical Pastels**: Specific low-saturation hues are reserved for the three main pillars of travel: Transport (Soft Blue), Stay (Soft Purple), and Budget (Soft Green).
- **Neutral Structure**: A range of cool grays is used for borders, secondary labels, and structural lines to maintain a professional polish without clutter.

## Typography

The system utilizes a dual-font strategy. **Geist** is used for headlines and display text to provide a technical, modern, and high-end feel. **Inter** is used for body copy and labels, ensuring exceptional legibility across all device sizes.

Hierarchy is established through weight and generous line heights, facilitating a comfortable reading experience for long itineraries. Letter spacing is slightly tightened on large headings for a more cohesive, "designed" appearance, while labels use slight tracking for better readability in UI components like buttons and chips.

## Layout & Spacing

This design system uses a **fixed-fluid hybrid grid**. On desktop, content is contained within a 1200px max-width container to prevent line lengths from becoming unreadable. On mobile and tablet, the layout becomes fluid with dynamic margins.

The spacing rhythm follows a 4px/8px base unit. 
- **Desktop**: 12-column grid, 24px (1.5rem) gutters, and 40px (2.5rem) outer margins.
- **Tablet**: 8-column grid, 16px gutters, 24px margins.
- **Mobile**: 4-column grid (or single column stack), 16px gutters, 16px margins.

Vertical rhythm is critical: use larger gaps (32px-48px) between distinct trip days and smaller gaps (12px-16px) between individual activities within a day.

## Elevation & Depth

Hierarchy is primarily achieved through **Tonal Layers** and **Subtle Shadows**. 

1.  **Background**: The lowest level (pure white).
2.  **Surface/Cards**: White background with a very subtle 1px border (`#F1F5F9`) and a soft, diffused shadow. Shadows should have a large blur radius (12px-24px) but very low opacity (3-5%) to avoid looking "heavy."
3.  **Interactive Overlays**: Dialogs and dropdowns use a slightly more pronounced shadow and a backdrop blur (glassmorphism) of 8px to maintain context while focusing the user.

Avoid using black shadows; instead, use a blue-tinted dark gray shadow to maintain the "Air" feel of the brand.

## Shapes

The shape language is **Rounded and Friendly**. A base radius of 0.5rem (8px) is applied to standard inputs and small components. Larger components like cards and primary containers use `rounded-xl` (1.5rem) to evoke a modern, app-like feel that is soft to the touch.

Buttons should consistently use `rounded-lg` or `rounded-full` (pill) depending on their prominence, with the pill shape reserved for floating action buttons or high-priority global triggers.

## Components

- **Buttons**:
    - **Primary**: Solid primary blue with white text. High contrast, `rounded-lg`.
    - **Secondary**: Light blue background with primary blue text. Subtle, low-contrast.
    - **Ghost**: No background, primary or neutral text. Used for less frequent actions like "Add Note."
- **Cards**:
    - Trip and Activity cards should use a white background, `rounded-xl` corners, and the subtle shadow defined in Elevation. 
    - Activities within an itinerary should use a left-side colored border (4px) corresponding to their category (Transport, Stay, Budget).
- **Input Fields**:
    - Clean, 1px neutral borders that thicken and turn primary blue on focus. 
    - Use `Geist` for placeholder text to keep the modern aesthetic consistent.
- **Chips/Badges**:
    - Used for activity types. These are pill-shaped with the categorical pastel backgrounds and a darker version of the same hue for the text.
- **Tabs**:
    - Minimalist line-based tabs or "pill" style containers with a white background for the active state and a muted gray for inactive states.
- **Icons**:
    - Use Lucide React (stroke width: 2px). Icons should be monochromatic (neutral-500) unless active, where they take the primary blue.