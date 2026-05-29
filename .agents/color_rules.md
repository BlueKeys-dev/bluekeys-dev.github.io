# BlueKeys UI & Aesthetic Design System

## 1. Color Palette

The color system is built around a sleek, minimalist "Light Mode" aesthetic, balancing stark typography with soft, airy backgrounds.

| Role | Color Hex / Value | Description |
| :--- | :--- | :--- |
C|
| **Global Background** | `#f9fbf9` | A very soft, slightly cool-tinted light grey/white that serves as the base page background. |
| **Text (On-Surface)**| `#1a1a1a` (Dark Grey)| Primary readable text color ensuring high contrast without the harshness of pure black. |
| **Surface Low** | `hsla(197, 60%, 93%, 0.4)`| Very subtle, transparent blue tint used for layered interface elements. |

## 2. Typography Rules

The UI relies on a dual-font system to separate bold marketing statements from clean, readable data.

*   **Headline Font (`Manrope`)**: 
    *   Used for impact. Large headers should use `font-extrabold` and `tracking-tighter` (tight letter spacing) for a modern, dense editorial feel.
    *   *Example: Hero header uses text sizes up to `text-9xl` with negative tracking and `leading-[1]`.*
*   **Body Font (`Inter`)**: 
    *   Used for paragraphs and UI components. Promotes maximum legibility.
    *   Paragraphs use `font-light` with lower opacity (`text-primary/70`) to establish clear hierarchy underneath bold headers.
*   **Micro-Typography (Labels/Tags)**:
    *   Small UI text (e.g., "Universal", "Low Latency", "How it works") should be heavily stylized: `text-xs font-bold tracking-widest uppercase`.
    *   This provides a technical, sophisticated, and "engineered" look to secondary information.

## 3. Professional UI & Aesthetic Guidelines

### Depth & Dimension
*   **Layered Gradients (Background)**: The page background isn't flat. It uses a fixed, low-opacity radial gradient combining `rgba(142, 202, 230, 0.1)` on the top-left and bottom-right to create "volume" behind the UI.
*   **Ambient Glows (Gradients & Blurs)**: Instead of hard shapes, background interest is created using massive, deeply blurred circles (e.g., `w-[160%] bg-[#8ecae6]/20 blur-[120px]`). This creates an ambient, "glassy" environment.
*   **Text Gradients**: Premium text elements (like the main H1) avoid looking flat by applying a subtle metallic gradient using Tailwind's `bg-clip-text text-transparent bg-gradient-to-r from-neutral-900 to-neutral-500`. (Always add `pr-4 w-fit` to prevent italic/bold clipping).
*   **Multi-Layered Shadows**: Elements that need to float (like CTA buttons) use a custom `.btn-shadow` which layers a sharp drop shadow over a softer, wider colored shadow for realistic depth.

### Motion & Micro-Interactions
*   **Smooth, Slow Transitions**: UI transitions should feel deliberate and expensive. Use `transition-all duration-700` for hover states.
*   **Physical Button Feel**: Buttons use `hover:-translate-y-1` to lift on hover, and `active:scale-[0.98]` to simulate a physical push-down feeling when clicked.
*   **Icon Nudging**: Secondary buttons featuring arrows or icons should apply a slight translation to the icon on hover (e.g., `group-hover:translate-x-1`) to encourage interaction.


