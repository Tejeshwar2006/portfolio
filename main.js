/**
 * Main Application Orchestrator — Tejeshwar Koneti Portfolio
 * Features Continuous Scroll-Linked Section Reveal Animations, Razor-Sharp Font Rendering,
 * Full Page Dynamic Theme Presets, and 3D Interactive Cursor Tilt Cards.
 */

import { ClockGrid } from './clockGrid.js';
import { CustomCursor } from './cursor.js';

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('clock-canvas');

  // Touch / mobile detection: disable pointer-centric features, drop rendering power
  const IS_MOBILE = window.matchMedia('(pointer: coarse)').matches || window.innerWidth <= 960;

  // Initialize ClockGrid
  const clockGrid = new ClockGrid(canvas, {
    clockRadius: IS_MOBILE ? 18 : 20,
    clockGap: IS_MOBILE ? 14 : 10,
    smoothing: 0.8,
    handStyle: 'needle',
    handWidth: IS_MOBILE ? 1.1 : 1.2,
    layout: 'honeycomb',
    showDiscs: false,
    theme: 'blackout',
    proximityEffect: true,
    distanceScaling: true,
    minLengthRatio: 0.32,
    maxLengthRatio: 1.25,
    falloffRadius: IS_MOBILE ? 420 : 600,
    lowPower: IS_MOBILE
  });

  // Initialize Custom Cursor
  const customCursor = new CustomCursor({
    enabled: !IS_MOBILE,
    style: 'ring'
  });

  // DOM References
  const hudController = document.getElementById('hud-controller');
  const btnThemeSettings = document.getElementById('btn-theme-settings');
  const themeDropdown = document.getElementById('theme-dropdown');
  const themeDropdownBody = document.getElementById('theme-dropdown-body');
  const portfolioOverlay = document.getElementById('portfolio-overlay');
  const btnTogglePortfolio = document.getElementById('btn-toggle-portfolio');
  const portfolioViewIcon = document.getElementById('portfolio-view-icon');
  const portfolioViewText = document.getElementById('portfolio-view-text');
  const nowRunningCmd = document.getElementById('now-running-cmd');

  const cliNavItems = document.querySelectorAll('.cli-nav-item');
  const contentSections = document.querySelectorAll('.content-section');
  const rightScrollPanel = document.getElementById('scroll-main');
  const tiltBlocks = document.querySelectorAll('.tilt-block');

  // Sliders & Controls
  const sliderRadius = document.getElementById('slider-radius');
  const sliderGap = document.getElementById('slider-gap');
  const sliderSmoothing = document.getElementById('slider-smoothing');
  const sliderThickness = document.getElementById('slider-thickness');
  const sliderFalloff = document.getElementById('slider-falloff');
  const toggleDistanceScaling = document.getElementById('toggle-distance-scaling');


  const valRadius = document.getElementById('val-radius');
  const valGap = document.getElementById('val-gap');
  const valSmoothing = document.getElementById('val-smoothing');
  const valThickness = document.getElementById('val-thickness');
  const valFalloff = document.getElementById('val-falloff');

  // Theme & Style Buttons
  const themeBtns = document.querySelectorAll('#theme-selector .seg-btn');
  const handStyleBtns = document.querySelectorAll('#hand-style-selector .seg-btn');
  const layoutBtns = document.querySelectorAll('#layout-selector .seg-btn');


  // ==========================================================================
  // 1. CONTINUOUS SCROLL-LINKED REVEAL ANIMATION (FLUID & RAZOR-SHARP TEXT)
  // Sections enter compressed + transparent, ease up into place, and become
  // fully opaque & unscaled once they reach the viewport — then stay sharp.
  // ==========================================================================
  const updateScrollReveals = () => {
    if (!rightScrollPanel) return;

    const panelHeight = window.innerWidth > 960 ? rightScrollPanel.clientHeight : window.innerHeight;
    const panelCenter = panelHeight / 2;
    const viewportH = window.innerHeight;

    let closestSection = null;
    let minCenterDistance = Infinity;

    contentSections.forEach((section) => {
      const sectionRect = section.getBoundingClientRect();
      const panelRect = window.innerWidth > 960 ? rightScrollPanel.getBoundingClientRect() : { top: 0 };

      // Calculate section center relative to scroll panel container top
      const sectionRelativeTop = sectionRect.top - panelRect.top;
      const sectionCenter = sectionRelativeTop + sectionRect.height / 2;
      const distFromCenter = sectionCenter - panelCenter;

      // Track active section for CLI indicator
      if (Math.abs(distFromCenter) < minCenterDistance) {
        minCenterDistance = Math.abs(distFromCenter);
        closestSection = section;
      }

      // --- Compressed → expanded, transparent → opaque entrance ---
      // Progress 0→1 as the section rises into place from the bottom edge.
      // Full opacity/scale is reached once the top of the section is ~55% up
      // the viewport, so every section (incl. tall ones like Projects) is fully
      // opaque before you start reading it, and stays that way.
      const p = Math.min(1, Math.max(0, (viewportH - sectionRect.top) / (viewportH * 0.55)));
      const e = 1 - Math.pow(1 - p, 3); // easeOutCubic

      section.style.opacity = p.toFixed(3);
      section.style.transform =
        `translate3d(0, ${((1 - e) * 34).toFixed(1)}px, 0) scale(${(0.9 + 0.1 * e).toFixed(3)})`;
    });

    // Update CLI indicator & nav menu active state
    if (closestSection) {
      const sectionId = closestSection.id;
      const cmdText = closestSection.getAttribute('data-command') || `$ cat ${sectionId}`;
      if (nowRunningCmd && nowRunningCmd.textContent !== cmdText) {
        nowRunningCmd.textContent = cmdText;
      }
      cliNavItems.forEach((navItem) => {
        if (navItem.getAttribute('data-section') === sectionId) {
          navItem.classList.add('active');
        } else {
          navItem.classList.remove('active');
        }
      });
    }
  };

  // rAF-batch scroll updates: coalesce rapid scroll events into a single
  // transform/opacity pass per frame for the smoothest possible scrolling.
  let revealFrame = null;
  const scheduleRevealUpdate = () => {
    if (revealFrame === null) {
      revealFrame = requestAnimationFrame(() => {
        revealFrame = null;
        updateScrollReveals();
      });
    }
  };

  // Attach continuous scroll listener
  if (rightScrollPanel) {
    rightScrollPanel.addEventListener('scroll', scheduleRevealUpdate, { passive: true });
  }
  window.addEventListener('scroll', scheduleRevealUpdate, { passive: true });
  window.addEventListener('resize', updateScrollReveals);

  // Initial calculation
  updateScrollReveals();

  // ==========================================================================
  // 2. REACTIVE 3D TILT CARDS (CURSOR-TRACKING RECTANGLES)
  // ==========================================================================
  tiltBlocks.forEach((block) => {
    block.addEventListener('mousemove', (e) => {
      const rect = block.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Subtle 8-deg 3D tilt rotation
      const rotateX = ((y - centerY) / centerY) * -8;
      const rotateY = ((x - centerX) / centerX) * 8;

      block.style.transform = `perspective(800px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateZ(8px)`;
    });

    block.addEventListener('mouseleave', () => {
      block.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
    });
  });

  // --- 3. Smooth Scroll CLI Nav Clicks ---
  cliNavItems.forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = item.getAttribute('data-section');
      const targetSec = document.getElementById(targetId);
      
      if (targetSec) {
        targetSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // --- 4. View Mode Toggle (Portfolio Overlay vs Background Only) ---
  let isPortfolioVisible = true;
  if (btnTogglePortfolio && portfolioOverlay) {
    btnTogglePortfolio.addEventListener('click', () => {
      isPortfolioVisible = !isPortfolioVisible;
      if (isPortfolioVisible) {
        portfolioOverlay.classList.remove('hidden');
        portfolioViewIcon.textContent = '👁';
        portfolioViewText.textContent = 'Background Mode';
      } else {
        portfolioOverlay.classList.add('hidden');
        portfolioViewIcon.textContent = '✨';
        portfolioViewText.textContent = 'Show Portfolio UI';
      }
    });
  }

  // --- 5. THEME SETTINGS DROPDOWN (top bar button) ---
  if (btnThemeSettings && themeDropdown && themeDropdownBody) {
    // Move HUD body controls into the dropdown
    themeDropdown.appendChild(themeDropdownBody);

    // Toggle open/close on button click
    btnThemeSettings.addEventListener('click', (e) => {
      e.stopPropagation();
      themeDropdown.classList.toggle('open');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!themeDropdown.contains(e.target) && e.target !== btnThemeSettings) {
        themeDropdown.classList.remove('open');
      }
    });
  }

  // FULL WEBPAGE THEME PRESET SELECTOR
  themeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      themeBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const theme = btn.dataset.theme;
      
      // Update entire webpage theme on <html> and <body>
      document.documentElement.setAttribute('data-theme', theme);
      document.body.setAttribute('data-theme', theme);
      
      // Update interactive background canvas
      clockGrid.setTheme(theme);
    });
  });

  // Hand Style Controller
  handStyleBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      handStyleBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      clockGrid.updateConfig({ handStyle: btn.dataset.style });
    });
  });

  // Layout Controller
  layoutBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      layoutBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      clockGrid.updateConfig({ layout: btn.dataset.layout });
    });
  });


  // Slider controls
  if (sliderRadius && valRadius) {
    sliderRadius.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      valRadius.textContent = `${val}px`;
      clockGrid.updateConfig({ clockRadius: val });
    });
  }

  if (sliderGap && valGap) {
    sliderGap.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      valGap.textContent = `${val}px`;
      clockGrid.updateConfig({ clockGap: val });
    });
  }

  if (sliderSmoothing && valSmoothing) {
    sliderSmoothing.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      valSmoothing.textContent = `${Math.round(val * 100)}%`;
      clockGrid.updateConfig({ smoothing: val });
    });
  }

  if (sliderThickness && valThickness) {
    sliderThickness.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      valThickness.textContent = `${val.toFixed(1)}px`;
      clockGrid.updateConfig({ handWidth: val });
    });
  }

  if (sliderFalloff && valFalloff) {
    sliderFalloff.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      valFalloff.textContent = `${val}px`;
      clockGrid.updateConfig({ falloffRadius: val });
    });
  }

  if (toggleDistanceScaling) {
    toggleDistanceScaling.addEventListener('change', (e) => {
      clockGrid.updateConfig({ distanceScaling: e.target.checked });
    });
  }



  // Refresh cursor interactables
  customCursor.refreshInteractables();

  // ==========================================================================
  // SPINNING ASCII DONUT — Real-time 3D torus renderer (donut.c algorithm)
  // Color inherits from CSS var(--text-main) → auto follows active theme
  // ==========================================================================
  const donutEl = document.getElementById('ascii-donut');
  if (donutEl) {
    const W = 28, H = 13; // output grid size — fits side-by-side with info
    let A = 1, B = 1;     // rotation angles

    const renderDonut = () => {
      const out = new Array(W * H).fill(' ');
      const zBuf = new Array(W * H).fill(0);

      for (let j = 0; j < 6.28; j += 0.07) {
        for (let i = 0; i < 6.28; i += 0.02) {
          const sinI = Math.sin(i), cosI = Math.cos(i);
          const sinJ = Math.sin(j), cosJ = Math.cos(j);
          const sinA = Math.sin(A), cosA = Math.cos(A);
          const sinB = Math.sin(B), cosB = Math.cos(B);

          const h = cosJ + 2;           // torus radius offset
          const D = 1 / (sinI * h * sinA + sinJ * cosA + 5); // depth
          const t = sinI * h * cosA - sinJ * sinA;

          const x = Math.floor(W / 2 + (W * 0.45) * D * (cosI * h * cosB - t * sinB));
          const y = Math.floor(H / 2 + (H * 0.5) * D * (cosI * h * sinB + t * cosB));
          const o = x + W * y;

          const L = Math.floor(
            8 * ((sinJ * sinA - sinI * cosJ * cosA) * cosB -
                  sinI * cosJ * sinA - sinJ * cosA -
                  cosI * cosJ * sinB)
          );

          if (y >= 0 && y < H && x >= 0 && x < W && D > zBuf[o]) {
            zBuf[o] = D;
            out[o] = '.,-~:;=!*#$@'[Math.max(0, L)] || '.';
          }
        }
      }

      // Build string row by row
      let frame = '';
      for (let r = 0; r < H; r++) {
        frame += out.slice(r * W, r * W + W).join('') + '\n';
      }
      donutEl.textContent = frame;

      A += 0.045;
      B += 0.018;
      requestAnimationFrame(renderDonut);
    };

    requestAnimationFrame(renderDonut);
  }
});
