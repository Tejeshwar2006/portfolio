/**
 * Custom Cursor Module
 * Fluid spring-physics cursor with trailing aura, interactive magnetic snapping,
 * and selectable visual styles.
 */

export class CustomCursor {
  constructor(options = {}) {
    this.options = {
      enabled: true,
      style: 'reference', // 'reference' (Red dot as in screenshot), 'ring', 'reticle', 'glow_orb'
      trailLength: 5,
      ...options
    };

    this.mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    this.pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    this.trailPos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    this.isHovered = false;
    this.isClicking = false;
    this.hoverText = '';

    this.createDOM();
    this.bindEvents();
    this.update();
  }

  createDOM() {
    // Container
    this.el = document.createElement('div');
    this.el.className = `custom-cursor-container ${this.options.style}`;
    this.el.id = 'custom-cursor';

    // Dot
    this.dot = document.createElement('div');
    this.dot.className = 'cursor-dot';

    // Outer ring / aura
    this.ring = document.createElement('div');
    this.ring.className = 'cursor-ring';

    // Label / badge on hover
    this.label = document.createElement('div');
    this.label.className = 'cursor-label';

    this.el.appendChild(this.dot);
    this.el.appendChild(this.ring);
    this.el.appendChild(this.label);

    document.body.appendChild(this.el);
    this.updateVisibility();
  }

  bindEvents() {
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      this.el.classList.remove('hidden');
    });

    window.addEventListener('mousedown', () => {
      this.isClicking = true;
      this.el.classList.add('clicking');
      this.spawnClickRipple(this.mouse.x, this.mouse.y);
    });

    window.addEventListener('mouseup', () => {
      this.isClicking = false;
      this.el.classList.remove('clicking');
    });

    document.addEventListener('mouseleave', () => {
      this.el.classList.add('hidden');
    });

    document.addEventListener('mouseenter', () => {
      this.el.classList.remove('hidden');
    });

    // Interactive element detection
    this.refreshInteractables();
  }

  refreshInteractables() {
    const interactables = document.querySelectorAll('button, a, input, select, .interactive-card, [data-cursor]');
    interactables.forEach((el) => {
      el.addEventListener('mouseenter', () => {
        this.isHovered = true;
        this.el.classList.add('hovering');
        const customText = el.getAttribute('data-cursor-text');
        if (customText) {
          this.label.textContent = customText;
          this.label.style.display = 'block';
        }
      });

      el.addEventListener('mouseleave', () => {
        this.isHovered = false;
        this.el.classList.remove('hovering');
        this.label.style.display = 'none';
        this.label.textContent = '';
      });
    });
  }

  spawnClickRipple(x, y) {
    const ripple = document.createElement('div');
    ripple.className = 'cursor-click-ripple';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    document.body.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  }

  setStyle(styleName) {
    this.options.style = styleName;
    this.el.className = `custom-cursor-container ${styleName} ${this.isHovered ? 'hovering' : ''} ${this.isClicking ? 'clicking' : ''}`;
  }

  setEnabled(enabled) {
    this.options.enabled = enabled;
    this.updateVisibility();
  }

  updateVisibility() {
    if (this.options.enabled) {
      document.body.classList.add('custom-cursor-active');
      this.el.style.display = 'block';
    } else {
      document.body.classList.remove('custom-cursor-active');
      this.el.style.display = 'none';
    }
  }

  update() {
    if (this.options.enabled) {
      // Direct fast dot follow
      this.pos.x += (this.mouse.x - this.pos.x) * 0.65;
      this.pos.y += (this.mouse.y - this.pos.y) * 0.65;

      // Smooth trailing ring follow
      this.trailPos.x += (this.mouse.x - this.trailPos.x) * 0.2;
      this.trailPos.y += (this.mouse.y - this.trailPos.y) * 0.2;

      this.dot.style.transform = `translate3d(${this.pos.x}px, ${this.pos.y}px, 0)`;
      this.ring.style.transform = `translate3d(${this.trailPos.x}px, ${this.trailPos.y}px, 0)`;
      this.label.style.transform = `translate3d(${this.trailPos.x + 18}px, ${this.trailPos.y + 18}px, 0)`;
    }

    requestAnimationFrame(() => this.update());
  }
}
