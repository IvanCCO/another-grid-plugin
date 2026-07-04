import {
  DEFAULT_SETTINGS,
  GRID_MESSAGE_TYPE,
  GRID_OVERLAY_ID,
  STORAGE_KEY,
  type GridSettings,
  getFixedTrackSpan,
  normalizeSettings,
  toRgba,
} from './utils';

let overlayRoot: HTMLDivElement | null = null;
let resizeFrame = 0;

function removeOverlay(): void {
  overlayRoot?.remove();
  overlayRoot = null;
}

function ensureOverlayRoot(): HTMLDivElement {
  if (overlayRoot?.isConnected) {
    return overlayRoot;
  }

  overlayRoot = document.createElement('div');
  overlayRoot.id = GRID_OVERLAY_ID;
  overlayRoot.setAttribute('aria-hidden', 'true');
  overlayRoot.style.position = 'fixed';
  overlayRoot.style.inset = '0';
  overlayRoot.style.pointerEvents = 'none';
  overlayRoot.style.zIndex = '2147483646';
  overlayRoot.style.display = 'block';

  (document.body ?? document.documentElement).appendChild(overlayRoot);
  return overlayRoot;
}

function createTrack(color: string): HTMLDivElement {
  const track = document.createElement('div');
  track.style.background = color;
  track.style.minWidth = '0';
  track.style.minHeight = '0';
  return track;
}

function getOffset(settings: GridSettings, span: number, viewport: number): number {
  const safeSpan = Math.min(span, viewport);

  switch (settings.distribution) {
    case 'left':
    case 'top':
      return settings.margin;
    case 'right':
    case 'bottom':
      return Math.max(viewport - settings.margin - safeSpan, settings.margin);
    case 'center':
      return Math.max((viewport - safeSpan) / 2, settings.margin);
    default:
      return settings.margin;
  }
}

function applyColumnsGrid(root: HTMLDivElement, settings: GridSettings): void {
  const frame = document.createElement('div');
  const fill = toRgba(settings.color, settings.opacity);

  frame.style.position = 'absolute';
  frame.style.top = '0';
  frame.style.bottom = '0';
  frame.style.display = 'grid';
  frame.style.gap = `${settings.gutter}px`;

  if (settings.distribution === 'stretch') {
    frame.style.left = `${settings.margin}px`;
    frame.style.right = `${settings.margin}px`;
    frame.style.gridTemplateColumns = `repeat(${settings.count}, minmax(0, 1fr))`;
  } else {
    const span = getFixedTrackSpan(settings);
    const left = getOffset(settings, span, window.innerWidth);
    const availableWidth = Math.max(window.innerWidth - settings.margin * 2, 0);

    frame.style.left = `${left}px`;
    frame.style.width = `${Math.min(span, availableWidth)}px`;
    frame.style.gridTemplateColumns = `repeat(${settings.count}, ${settings.size}px)`;
  }

  for (let index = 0; index < settings.count; index += 1) {
    frame.appendChild(createTrack(fill));
  }

  root.appendChild(frame);
}

function applyRowsGrid(root: HTMLDivElement, settings: GridSettings): void {
  const frame = document.createElement('div');
  const fill = toRgba(settings.color, settings.opacity);

  frame.style.position = 'absolute';
  frame.style.left = '0';
  frame.style.right = '0';
  frame.style.display = 'grid';
  frame.style.gap = `${settings.gutter}px`;

  if (settings.distribution === 'stretch') {
    frame.style.top = `${settings.margin}px`;
    frame.style.bottom = `${settings.margin}px`;
    frame.style.gridTemplateRows = `repeat(${settings.count}, minmax(0, 1fr))`;
  } else {
    const span = getFixedTrackSpan(settings);
    const top = getOffset(settings, span, window.innerHeight);
    const availableHeight = Math.max(window.innerHeight - settings.margin * 2, 0);

    frame.style.top = `${top}px`;
    frame.style.height = `${Math.min(span, availableHeight)}px`;
    frame.style.gridTemplateRows = `repeat(${settings.count}, ${settings.size}px)`;
  }

  for (let index = 0; index < settings.count; index += 1) {
    frame.appendChild(createTrack(fill));
  }

  root.appendChild(frame);
}

function renderOverlay(settings: GridSettings): void {
  removeOverlay();

  if (!settings.enabled) {
    return;
  }

  const root = ensureOverlayRoot();
  root.replaceChildren();

  if (settings.axis === 'rows') {
    applyRowsGrid(root, settings);
  } else {
    applyColumnsGrid(root, settings);
  }
}

function scheduleRender(settings: GridSettings): void {
  window.cancelAnimationFrame(resizeFrame);
  resizeFrame = window.requestAnimationFrame(() => {
    renderOverlay(settings);
  });
}

let currentSettings = DEFAULT_SETTINGS;

chrome.runtime.onMessage.addListener(
  (message: { type?: string; settings?: GridSettings }) => {
    if (message.type !== GRID_MESSAGE_TYPE || !message.settings) {
      return;
    }

    currentSettings = normalizeSettings(message.settings);
    scheduleRender(currentSettings);
  },
);

chrome.storage.sync.get({ [STORAGE_KEY]: DEFAULT_SETTINGS }, (result) => {
  currentSettings = normalizeSettings(result[STORAGE_KEY]);
  renderOverlay(currentSettings);
});

window.addEventListener('resize', () => {
  scheduleRender(currentSettings);
});
