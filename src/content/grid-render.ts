import { type GridSettings, getFixedTrackSpan, toRgba } from '../utils';

function createTrack(color: string): HTMLDivElement {
  const track = document.createElement('div');
  track.style.background = color;
  track.style.minWidth = '0';
  track.style.minHeight = '0';
  return track;
}

function createFrame(settings: GridSettings): HTMLDivElement {
  const frame = document.createElement('div');
  frame.style.position = 'absolute';
  frame.style.display = 'grid';
  frame.style.gap = `${settings.gutter}px`;
  return frame;
}

function appendTracks(frame: HTMLDivElement, count: number, color: string): void {
  for (let index = 0; index < count; index += 1) {
    frame.appendChild(createTrack(color));
  }
}

export function getOffset(settings: GridSettings, span: number, viewport: number): number {
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

export function applyColumnsGrid(root: HTMLDivElement, settings: GridSettings): void {
  const frame = createFrame(settings);
  const fill = toRgba(settings.color, settings.opacity);

  frame.style.top = '0';
  frame.style.bottom = '0';

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

  appendTracks(frame, settings.count, fill);
  root.appendChild(frame);
}

export function applyRowsGrid(root: HTMLDivElement, settings: GridSettings): void {
  const frame = createFrame(settings);
  const fill = toRgba(settings.color, settings.opacity);

  frame.style.left = '0';
  frame.style.right = '0';

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

  appendTracks(frame, settings.count, fill);
  root.appendChild(frame);
}

export function applySquareGrid(root: HTMLDivElement, settings: GridSettings): void {
  const frame = createFrame(settings);
  const fill = toRgba(settings.color, settings.opacity);

  if (settings.distribution === 'stretch') {
    frame.style.inset = `${settings.margin}px`;
    frame.style.gridTemplateColumns = `repeat(${settings.count}, minmax(0, 1fr))`;
    frame.style.gridTemplateRows = `repeat(${settings.count}, minmax(0, 1fr))`;
  } else {
    const span = getFixedTrackSpan(settings);
    const availableWidth = Math.max(window.innerWidth - settings.margin * 2, 0);
    const availableHeight = Math.max(window.innerHeight - settings.margin * 2, 0);

    frame.style.left = `${Math.max((window.innerWidth - span) / 2, settings.margin)}px`;
    frame.style.top = `${Math.max((window.innerHeight - span) / 2, settings.margin)}px`;
    frame.style.width = `${Math.min(span, availableWidth)}px`;
    frame.style.height = `${Math.min(span, availableHeight)}px`;
    frame.style.gridTemplateColumns = `repeat(${settings.count}, ${settings.size}px)`;
    frame.style.gridTemplateRows = `repeat(${settings.count}, ${settings.size}px)`;
  }

  appendTracks(frame, settings.count * settings.count, fill);
  root.appendChild(frame);
}

export function renderGrid(root: HTMLDivElement, settings: GridSettings): void {
  if (settings.axis === 'grid') {
    applySquareGrid(root, settings);
  } else if (settings.axis === 'rows') {
    applyRowsGrid(root, settings);
  } else {
    applyColumnsGrid(root, settings);
  }
}
