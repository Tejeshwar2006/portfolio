/**
 * ClockGrid Engine
 * High-performance 2D Canvas rendering for a dynamic grid of clocks
 * orienting towards the cursor with shortest-path angular interpolation,
 * proximity effects, and shockwave physics.
 */

export class ClockGrid {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    // Configuration
    this.config = {
      clockRadius: options.clockRadius || 24,
      clockGap: options.clockGap || 6,
      handLengthRatio: options.handLengthRatio || 0.85,
      handWidth: options.handWidth || 2.2,
      smoothing: options.smoothing !== undefined ? options.smoothing : 0.18, // 1 = instant, lower = smoother
      handStyle: options.handStyle || 'needle', // 'needle', 'tapered', 'dual', 'laser'
      layout: options.layout || 'honeycomb', // 'honeycomb' (hexagonal packing), 'square'
      showDiscs: options.showDiscs !== undefined ? options.showDiscs : false, // False = only hands appear
      proximityEffect: options.proximityEffect !== undefined ? options.proximityEffect : true,
      proximityRadius: options.proximityRadius || 180,
      theme: options.theme || 'blackout',
      // Dynamic distance-based arrow length scaling
      distanceScaling: options.distanceScaling !== undefined ? options.distanceScaling : true,
      minLengthRatio: options.minLengthRatio !== undefined ? options.minLengthRatio : 0.32,
      maxLengthRatio: options.maxLengthRatio !== undefined ? options.maxLengthRatio : 1.25,
      falloffRadius: options.falloffRadius || 450,
      falloffCurve: options.falloffCurve !== undefined ? options.falloffCurve : 1.3,
      ...options
    };

    // State
    this.clocks = [];
    this.cols = 0;
    this.rows = 0;
    this.dpr = window.devicePixelRatio || 1;
    this.width = 0;
    this.height = 0;
    
    // Mouse state
    this.mouse = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      targetX: window.innerWidth / 2,
      targetY: window.innerHeight / 2,
      isHovering: true,
      lastMoveTime: performance.now(),
      speed: 0
    };

    // Shockwaves from clicks
    this.shockwaves = [];

    // Themes
    this.themes = {
      blackout: {
        background: '#000000',
        clockBg: 'transparent',
        clockBorder: 'transparent',
        handColor: '#30303a', // Dark charcoal/black-gray far away
        handGlow: 'rgba(255, 255, 255, 0.6)',
        accentDot: '#00f0ff', // Vibrant cyan accent dot near cursor
        centerDot: '#181822', // Dark charcoal pivot dot far away
        proximityAccent: '#ffffff' // Brilliant pure white near cursor
      },
      classic: {
        background: '#ffffff',
        clockBg: '#080808',
        clockBorder: 'transparent',
        handColor: '#94a3b8', // Muted slate gray far away
        handGlow: 'rgba(255, 45, 85, 0.4)',
        accentDot: '#ff2d55',
        centerDot: 'rgba(15, 23, 42, 0.5)',
        proximityAccent: '#0f172a' // Dark charcoal black near cursor
      },
      stealth: {
        background: '#090a0f',
        clockBg: '#12151e',
        clockBorder: 'rgba(255, 255, 255, 0.05)',
        handColor: '#1e293b', // Dark slate far away
        handGlow: 'rgba(0, 240, 255, 0.6)',
        accentDot: '#00f0ff',
        centerDot: '#00f0ff',
        proximityAccent: '#00f0ff' // Electric cyan near cursor
      },
      cyberpunk: {
        background: '#0d0221',
        clockBg: '#190a36',
        clockBorder: 'rgba(255, 0, 128, 0.2)',
        handColor: '#5b146f', // Deep purple far away
        handGlow: 'rgba(255, 230, 0, 0.7)',
        accentDot: '#ff007f',
        centerDot: '#ff007f',
        proximityAccent: '#ffe600' // Neon yellow near cursor
      },
      gold: {
        background: '#0c0b0a',
        clockBg: '#1a1815',
        clockBorder: 'rgba(212, 175, 55, 0.15)',
        handColor: '#4a3e23', // Dark bronze far away
        handGlow: 'rgba(243, 229, 171, 0.5)',
        accentDot: '#d4af37',
        centerDot: '#d4af37',
        proximityAccent: '#f3e5ab' // Champagne gold near cursor
      },
      glass: {
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        clockBg: 'rgba(255, 255, 255, 0.07)',
        clockBorder: 'rgba(255, 255, 255, 0.12)',
        handColor: '#334155', // Dark glass slate far away
        handGlow: 'rgba(255, 255, 255, 0.3)',
        accentDot: '#38bdf8',
        centerDot: 'rgba(255,255,255,0.7)',
        proximityAccent: '#38bdf8' // Sky cyan blue near cursor
      }
    };

    this.init();
  }

  parseColor(colorStr) {
    if (!colorStr) return [255, 255, 255, 1];
    if (colorStr.startsWith('#')) {
      let c = colorStr.replace('#', '');
      if (c.length === 3) c = c.split('').map(x => x + x).join('');
      const num = parseInt(c, 16);
      return [num >> 16, (num >> 8) & 255, num & 255, 1];
    }
    const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (match) {
      return [
        parseInt(match[1], 10),
        parseInt(match[2], 10),
        parseInt(match[3], 10),
        match[4] !== undefined ? parseFloat(match[4]) : 1
      ];
    }
    return [255, 255, 255, 1];
  }

  blendColors(col1, col2, factor) {
    const t = Math.max(0, Math.min(1, factor));
    const c1 = this.parseColor(col1);
    const c2 = this.parseColor(col2);
    const r = Math.round(c1[0] + (c2[0] - c1[0]) * t);
    const g = Math.round(c1[1] + (c2[1] - c1[1]) * t);
    const b = Math.round(c1[2] + (c2[2] - c1[2]) * t);
    const a = c1[3] + (c2[3] - c1[3]) * t;
    return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
  }

  init() {
    this.handleResize();
    this.bindEvents();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  bindEvents() {
    window.addEventListener('resize', () => this.handleResize());

    window.addEventListener('mousemove', (e) => {
      const now = performance.now();
      const dt = Math.max(1, now - this.mouse.lastMoveTime);
      const dx = e.clientX - this.mouse.targetX;
      const dy = e.clientY - this.mouse.targetY;
      this.mouse.speed = Math.sqrt(dx * dx + dy * dy) / dt;
      
      this.mouse.targetX = e.clientX;
      this.mouse.targetY = e.clientY;
      this.mouse.isHovering = true;
      this.mouse.lastMoveTime = now;
    });

    window.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        this.mouse.targetX = e.touches[0].clientX;
        this.mouse.targetY = e.touches[0].clientY;
        this.mouse.isHovering = true;
      }
    }, { passive: true });

    window.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        this.mouse.targetX = e.touches[0].clientX;
        this.mouse.targetY = e.touches[0].clientY;
        this.addShockwave(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    window.addEventListener('pointerdown', (e) => {
      // Trigger shockwave on click/tap
      this.addShockwave(e.clientX, e.clientY);
    });

    document.addEventListener('mouseleave', () => {
      // Return to center when mouse leaves
      this.mouse.targetX = this.width / (2 * this.dpr);
      this.mouse.targetY = this.height / (2 * this.dpr);
    });
  }

  addShockwave(x, y) {
    this.shockwaves.push({
      x,
      y,
      radius: 0,
      maxRadius: Math.max(this.width, this.height) * 0.85,
      speed: 16 + this.config.clockRadius * 0.3,
      strength: 1.5,
      wavelength: 90,
      decay: 0.985
    });
  }

  handleResize() {
    this.dpr = window.devicePixelRatio || 1;
    this.width = window.innerWidth * this.dpr;
    this.height = window.innerHeight * this.dpr;

    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.canvas.style.width = `${window.innerWidth}px`;
    this.canvas.style.height = `${window.innerHeight}px`;

    this.rebuildGrid();
  }

  rebuildGrid() {
    const diameter = this.config.clockRadius * 2;
    const step = diameter + this.config.clockGap;
    const isHoneycomb = this.config.layout === 'honeycomb';
    
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    const stepX = step;
    const stepY = isHoneycomb ? step * (Math.sqrt(3) / 2) : step; // ~0.866025 for true hexagonal packing

    this.cols = Math.ceil(viewportW / stepX) + (isHoneycomb ? 3 : 1);
    this.rows = Math.ceil(viewportH / stepY) + 2;

    // Centering offset
    const totalGridW = (this.cols - 1) * stepX;
    const totalGridH = (this.rows - 1) * stepY;
    const offsetX = (viewportW - totalGridW) / 2 - (isHoneycomb ? stepX * 0.25 : 0);
    const offsetY = (viewportH - totalGridH) / 2;

    const newClocks = [];

    for (let r = 0; r < this.rows; r++) {
      const y = offsetY + r * stepY;
      // Stagger alternate rows for honeycomb structure
      const rowShift = (isHoneycomb && (r % 2 !== 0)) ? (stepX / 2) : 0;

      for (let c = 0; c < this.cols; c++) {
        const x = offsetX + c * stepX + rowShift;

        // Keep buffer for smooth edge rotation
        if (x < -stepX || x > viewportW + stepX || y < -stepY || y > viewportH + stepY) {
          continue;
        }

        const initialAngle = Math.atan2(this.mouse.y - y, this.mouse.x - x);
        const initDx = this.mouse.x - x;
        const initDy = this.mouse.y - y;
        const initDist = Math.sqrt(initDx * initDx + initDy * initDy);
        const initT = Math.max(0, 1 - initDist / (this.config.falloffRadius || 450));
        const initCurvedT = Math.pow(initT, this.config.falloffCurve || 1.3);
        const initRatio = this.config.distanceScaling
          ? (this.config.minLengthRatio + (this.config.maxLengthRatio - this.config.minLengthRatio) * initCurvedT)
          : this.config.handLengthRatio;

        newClocks.push({
          x,
          y,
          r,
          c,
          currentAngle: initialAngle,
          targetAngle: initialAngle,
          angularVelocity: 0,
          currentLengthRatio: initRatio,
          targetLengthRatio: initRatio,
          scale: 1,
          proximity: initT,
          highlight: false
        });
      }
    }

    this.clocks = newClocks;
  }

  setTheme(themeName) {
    if (this.themes[themeName]) {
      this.config.theme = themeName;
    }
  }

  updateConfig(newConfig) {
    const needRebuild = 
      (newConfig.clockRadius !== undefined && newConfig.clockRadius !== this.config.clockRadius) ||
      (newConfig.clockGap !== undefined && newConfig.clockGap !== this.config.clockGap) ||
      (newConfig.layout !== undefined && newConfig.layout !== this.config.layout);

    this.config = { ...this.config, ...newConfig };

    if (needRebuild) {
      this.rebuildGrid();
    }
  }

  updateShockwaves() {
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += sw.speed;
      sw.strength *= sw.decay;

      if (sw.radius > sw.maxRadius || sw.strength < 0.01) {
        this.shockwaves.splice(i, 1);
      }
    }
  }

  animate(currentTime) {
    // Smooth mouse interpolation
    this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.25;
    this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.25;

    this.updateShockwaves();
    this.render();

    requestAnimationFrame(this.animate);
  }

  render() {
    const ctx = this.ctx;
    const dpr = this.dpr;
    const theme = this.themes[this.config.theme] || this.themes.classic;
    const radius = this.config.clockRadius;
    const smoothing = this.config.smoothing;
    const handLen = radius * this.config.handLengthRatio;
    const handWidth = this.config.handWidth;
    const handStyle = this.config.handStyle;
    const proxRadius = this.config.proximityRadius;
    const isProximityOn = this.config.proximityEffect;
    const isDistanceScaling = this.config.distanceScaling;
    const minLenRatio = this.config.minLengthRatio;
    const maxLenRatio = this.config.maxLengthRatio;
    const falloffRad = this.config.falloffRadius;
    const falloffExponent = this.config.falloffCurve;

    ctx.save();
    ctx.scale(dpr, dpr);

    // Clear background
    if (theme.background.startsWith('linear')) {
      const grad = ctx.createLinearGradient(0, 0, window.innerWidth, window.innerHeight);
      grad.addColorStop(0, '#1e293b');
      grad.addColorStop(1, '#0f172a');
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = theme.background;
    }
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    const mouseX = this.mouse.x;
    const mouseY = this.mouse.y;
    const numClocks = this.clocks.length;

    // 1. Calculate angles and optionally draw clock background discs
    const shouldDrawDiscs = this.config.showDiscs && theme.clockBg && theme.clockBg !== 'transparent';
    if (shouldDrawDiscs) {
      ctx.fillStyle = theme.clockBg;
      if (theme.clockBorder !== 'transparent') {
        ctx.strokeStyle = theme.clockBorder;
        ctx.lineWidth = 1;
      }
    }

    for (let i = 0; i < numClocks; i++) {
      const clock = this.clocks[i];
      const cx = clock.x;
      const cy = clock.y;

      // Distance to cursor
      const dx = mouseX - cx;
      const dy = mouseY - cy;
      const distSq = dx * dx + dy * dy;
      const dist = Math.sqrt(distSq);

      // Base target angle pointing directly at cursor
      let target = Math.atan2(dy, dx);
      let shockwaveScaleBonus = 0;

      // Apply shockwave disturbance
      if (this.shockwaves.length > 0) {
        for (let s = 0; s < this.shockwaves.length; s++) {
          const sw = this.shockwaves[s];
          const swDx = cx - sw.x;
          const swDy = cy - sw.y;
          const swDist = Math.sqrt(swDx * swDx + swDy * swDy);
          const waveDelta = swDist - sw.radius;

          if (Math.abs(waveDelta) < sw.wavelength) {
            const waveFactor = Math.sin((waveDelta / sw.wavelength) * Math.PI * 2);
            const attenuation = (1 - Math.abs(waveDelta) / sw.wavelength) * sw.strength;
            target += waveFactor * attenuation * 1.2;
            shockwaveScaleBonus += waveFactor * attenuation * 0.35;
          }
        }
      }

      clock.targetAngle = target;

      // Shortest path angular interpolation
      if (smoothing >= 0.99) {
        clock.currentAngle = target;
      } else {
        let diff = clock.targetAngle - clock.currentAngle;
        // Normalize diff to [-PI, PI]
        diff = ((diff + Math.PI) % (Math.PI * 2));
        if (diff < 0) diff += Math.PI * 2;
        diff -= Math.PI;

        clock.currentAngle += diff * smoothing;
      }

      // Distance-based Length Scaling
      if (isDistanceScaling) {
        // Distance falloff from 0 (closest -> max length) to falloffRad (far -> min length)
        const t = Math.max(0, 1 - dist / falloffRad);
        // Smooth power curve for natural kinetic elasticity
        const curvedT = Math.pow(t, falloffExponent);
        const targetLenRatio = minLenRatio + (maxLenRatio - minLenRatio) * curvedT + shockwaveScaleBonus;
        
        // Fluid interpolation for length changes so moving cursor creates smooth wave of growth/shrink
        const lengthSmoothing = Math.min(1, smoothing * 1.6);
        clock.currentLengthRatio += (targetLenRatio - clock.currentLengthRatio) * lengthSmoothing;
        clock.proximity = t;
      } else {
        clock.currentLengthRatio = this.config.handLengthRatio;
        if (isProximityOn && dist < proxRadius) {
          clock.proximity = 1 - (dist / proxRadius);
        } else {
          clock.proximity = 0;
        }
      }

      // Draw clock disk if enabled
      if (shouldDrawDiscs) {
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
        if (theme.clockBorder !== 'transparent') {
          ctx.stroke();
        }
      }
    }

    // 2. Draw clock hands / arrows
    for (let i = 0; i < numClocks; i++) {
      const clock = this.clocks[i];
      const cx = clock.x;
      const cy = clock.y;
      const angle = clock.currentAngle;
      const prox = clock.proximity;
      const lengthRatio = clock.currentLengthRatio;

      // Distance falloff opacity: far hands and pivot centers fade out and disappear eventually
      const handOpacity = isDistanceScaling
        ? Math.max(0, Math.min(1, Math.pow(prox, 0.8)))
        : 1.0;

      // Skip drawing completely invisible clocks far outside falloff radius
      if (handOpacity <= 0.008) {
        continue;
      }

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.globalAlpha = handOpacity;

      // Hand styling & dynamic distance-based color blending
      let currentHandColor = theme.handColor;
      if (theme.proximityAccent && theme.handColor) {
        currentHandColor = this.blendColors(theme.handColor, theme.proximityAccent, prox);
      }

      ctx.strokeStyle = currentHandColor;
      ctx.fillStyle = currentHandColor;

      if (theme.handGlow && theme.handGlow !== 'rgba(255, 255, 255, 0)') {
        ctx.shadowColor = currentHandColor;
        ctx.shadowBlur = 2 + prox * 12;
      }

      const effectiveHandLen = isDistanceScaling
        ? radius * lengthRatio
        : handLen * (1 + prox * 0.15);

      // Proportional hand thickness scaling based on distance/length
      const widthScale = isDistanceScaling
        ? 0.72 + (lengthRatio / maxLenRatio) * 0.48
        : (1 + prox * 0.3);
      const effectiveHandWidth = handWidth * widthScale;

      switch (handStyle) {
        case 'tapered': {
          // Dynamic aerodynamic Arrow with shaft and sharp arrowhead
          const headLen = Math.min(effectiveHandLen * 0.48, Math.max(7, effectiveHandWidth * 3.2));
          const shaftLen = Math.max(0, effectiveHandLen - headLen);
          const shaftHalfW = effectiveHandWidth * 0.45;
          const headHalfW = effectiveHandWidth * 1.55;

          ctx.beginPath();
          // Shaft tail
          ctx.moveTo(-radius * 0.1, -shaftHalfW);
          ctx.lineTo(shaftLen, -shaftHalfW);
          // Left barb
          ctx.lineTo(shaftLen, -headHalfW);
          // Arrow tip
          ctx.lineTo(effectiveHandLen, 0);
          // Right barb
          ctx.lineTo(shaftLen, headHalfW);
          ctx.lineTo(shaftLen, shaftHalfW);
          // Tail
          ctx.lineTo(-radius * 0.1, shaftHalfW);
          ctx.closePath();
          ctx.fill();
          break;
        }

        case 'dual': {
          // Minute hand (long, pointing to cursor)
          ctx.lineWidth = effectiveHandWidth;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(effectiveHandLen, 0);
          ctx.stroke();

          // Hour hand (short, at offset for classic kinetic feel)
          ctx.save();
          ctx.rotate(Math.PI / 2.4);
          ctx.lineWidth = effectiveHandWidth * 1.35;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(effectiveHandLen * 0.58, 0);
          ctx.stroke();
          ctx.restore();
          break;
        }

        case 'laser': {
          // Glowing tapered beam
          ctx.lineWidth = effectiveHandWidth;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(-radius * 0.15, 0);
          ctx.lineTo(effectiveHandLen, 0);
          ctx.stroke();

          // Laser tip bright pip
          ctx.beginPath();
          ctx.arc(effectiveHandLen, 0, Math.max(1.8, effectiveHandWidth * 1.1), 0, Math.PI * 2);
          ctx.fill();
          break;
        }

        case 'needle':
        default: {
          // Tapered clock needle: thicker at the start/pivot base, tapering to a fine sharp tip pointing to the cursor
          const baseHalfW = Math.max(1.5, effectiveHandWidth * 1.2);
          const tipHalfW = Math.max(0.3, effectiveHandWidth * 0.15);
          const backOverhang = radius * 0.1;

          ctx.beginPath();
          // Rounded base cap at center
          ctx.arc(-backOverhang, 0, baseHalfW, Math.PI / 2, -Math.PI / 2);
          // Top edge tapering from thick base to thin tip
          ctx.lineTo(effectiveHandLen, -tipHalfW);
          // Sharp needle tip
          ctx.lineTo(effectiveHandLen + tipHalfW, 0);
          ctx.lineTo(effectiveHandLen, tipHalfW);
          // Bottom edge tapering back to base
          ctx.closePath();
          ctx.fill();
          break;
        }
      }

      // Center pivot dot (needle origin) with dynamic distance-based color blending & glowing halo
      if (theme.centerDot || theme.accentDot) {
        const baseCenterColor = theme.centerDot || '#181822';
        const targetAccentColor = theme.accentDot || '#00f0ff';
        const dotProxFactor = Math.pow(prox, 0.65);
        const currentCenterColor = this.blendColors(baseCenterColor, targetAccentColor, dotProxFactor);

        ctx.save();
        ctx.fillStyle = currentCenterColor;

        if (dotProxFactor > 0.05) {
          ctx.shadowColor = targetAccentColor;
          ctx.shadowBlur = 4 + dotProxFactor * 14;
        }

        ctx.beginPath();
        const pivotSize = Math.max(1.8, Math.min(4.2, effectiveHandWidth * 0.8 + dotProxFactor * 1.2));
        ctx.arc(0, 0, pivotSize, 0, Math.PI * 2);
        ctx.fill();

        // Extra vibrant inner core pip when near cursor
        if (dotProxFactor > 0.2) {
          ctx.fillStyle = targetAccentColor;
          ctx.beginPath();
          ctx.arc(0, 0, Math.max(1.0, pivotSize * 0.55), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      ctx.restore();
    }

    // Draw active shockwave ripples
    if (this.shockwaves.length > 0) {
      for (let s = 0; s < this.shockwaves.length; s++) {
        const sw = this.shockwaves[s];
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${sw.strength * 0.25})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}

