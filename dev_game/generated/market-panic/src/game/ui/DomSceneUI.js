import { SPEC } from '../data/spec.js';

export default class DomSceneUI {
  constructor(scene, sceneName, className, html) {
    this.scene = scene;
    this.sceneName = sceneName;
    this.root = document.createElement('div');
    this.root.className = `mp-screen-ui ${className}`;
    this.root.dataset.marketPanicSceneUi = sceneName;
    this.root.innerHTML = html;
    document.body.appendChild(this.root);
    this.syncBounds();
    this.scene.scale.on('resize', this.syncBounds, this);
    this.scene.events.once('shutdown', () => this.destroy());
  }

  on(selector, handler) {
    const el = this.root?.querySelector(selector);
    if (!el) return null;
    el.addEventListener('click', (event) => {
      event.preventDefault();
      if (el instanceof HTMLButtonElement) el.disabled = true;
      handler(event, el);
    });
    return el;
  }

  syncBounds() {
    if (!this.root?.isConnected) return;
    const bounds = this.scene.scale.canvasBounds;
    if (!bounds) return;
    const sx = bounds.width / SPEC.canvas.width;
    const sy = bounds.height / SPEC.canvas.height;
    this.root.style.left = '0px';
    this.root.style.top = '0px';
    this.root.style.width = `${SPEC.canvas.width}px`;
    this.root.style.height = `${SPEC.canvas.height}px`;
    this.root.style.transform = `translate(${bounds.left}px, ${bounds.top}px) scale(${sx}, ${sy})`;
    this.publishLayout();
  }

  publishLayout() {
    if (typeof window === 'undefined' || !this.root?.isConnected) return;
    const elements = [...this.root.querySelectorAll('[data-layout-id]')];
    const items = elements.map((el) => {
      const rect = el.getBoundingClientRect();
      const allowOverlapWith = elements
        .filter((other) => other !== el && (el.contains(other) || other.contains(el)))
        .map((other) => other.dataset.layoutId);
      return {
        id: el.dataset.layoutId,
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
        visible: rect.width > 0 && rect.height > 0,
        allowOverlapWith,
      };
    });
    window.__GAME_LAYOUT_BOUNDS__ = { scene: this.sceneName, items };
  }

  destroy() {
    this.scene?.scale?.off('resize', this.syncBounds, this);
    this.root?.remove();
    this.root = null;
  }
}
