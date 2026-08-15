# Tejeshwar Koneti — Portfolio

I made myself a portfolio with a live, cursor-reactive grid of clocks rendered on HTML5 Canvas. Built as a single-page application with zero build step — just open `index.html`.

## Features

- **Vector Clock Grid Matrix** — a full-screen canvas grid of clocks whose hands smoothly orient toward your cursor with shortest-path angular interpolation, distance-based length scaling, and click/touch shockwave ripples.
- **Terminal CLI UI** — everything reads like a shell session (`$ cat about.md`, `$ ls ~/projects`, `$ ./connect --init`), including a live "now running" indicator and CLI-style navigation.
- **6 Theme Presets** — Blackout, Classic, Stealth, Cyberpunk, Gold, and Glass.
- **Reactive 3D Tilt Cards** — every card tilts in 3D following the cursor.
- **Custom Cursor** — spring-physics cursor with trailing ring, hover labels, and click ripples.
- **Scroll-Linked Reveal** — sections fade/scale smoothly as you scroll.
- **Spinning ASCII Donut** — real-time 3D torus renderer (donut.c algorithm) in the About section.

## Tech Stack

- Vanilla JavaScript (ES Modules)
- HTML5 Canvas
- CSS3 (custom properties for theming)

## Project Structure

```
portfolio/
├── index.html      # Page structure, sections, theme settings panel
├── main.js         # App orchestrator: scroll reveals, tilt, controls, donut
├── clockGrid.js    # ClockGrid engine — canvas clock matrix background
├── cursor.js       # CustomCursor — spring-physics cursor module
└── styles.css      # All styling + theme presets
```

## Usage

```bash
# Serve locally (any static server works)
python3 -m http.server 8000
# then open http://localhost:8000
```

Or just open `index.html` directly in a browser.

## Controls

- **👁 / Background Mode** (top-right) — toggle the portfolio UI to view the background clock matrix alone.
- **🎨 Theme Settings** — open the panel to switch themes, hand styles (Needle / Dual / Arrow / Laser), lattice layout (Honeycomb / Square), and tune clock size, grid gap, tracking fluidity, hand thickness, and distance scaling.
- **CLI nav menu** (left panel) — smooth-scrolls to About / Skills / Projects / Connect.

## Sections

- **About** — bio, focus areas, and a neofetch-style system card.
- **Tech Stack & Skills** — languages, AI/ML, computer vision, backend, system design, and core CS fundamentals.
- **Projects** — Portfolio, Infinix GT Book Control Centre, H.A.N.D (gesture-controlled robotic hand), Episteme (text summarization), GLOBETREK (travel platform), and Trading_bot.
- **Connect** — email, phone, LinkedIn, GitHub, LeetCode, location.

## Contact

- Email: Tejeshwar3510@gmail.com
- LinkedIn: [tejeshwar-koneti16](https://www.linkedin.com/in/tejeshwar-koneti16/)
- GitHub: [Tejeshwar2006](https://github.com/Tejeshwar2006)

---

© 2026 Tejeshwar Koneti
