import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, type GridSettings } from '../utils';
import { getOffset, renderGrid } from './grid-render';

function setViewport(width: number, height: number): void {
  vi.stubGlobal('innerWidth', width);
  vi.stubGlobal('innerHeight', height);
}

describe('getOffset', () => {
  const settings: GridSettings = { ...DEFAULT_SETTINGS, margin: 10 };

  it('anchors to the margin for left/top', () => {
    expect(getOffset({ ...settings, distribution: 'left' }, 100, 500)).toBe(10);
    expect(getOffset({ ...settings, distribution: 'top' }, 100, 500)).toBe(10);
  });

  it('anchors to the far edge minus margin for right/bottom', () => {
    expect(getOffset({ ...settings, distribution: 'right' }, 100, 500)).toBe(390);
    expect(getOffset({ ...settings, distribution: 'bottom' }, 100, 500)).toBe(390);
  });

  it('never pushes right/bottom past the margin when the span exceeds the viewport', () => {
    expect(getOffset({ ...settings, distribution: 'right' }, 1000, 500)).toBe(10);
  });

  it('centers the span within the viewport', () => {
    expect(getOffset({ ...settings, distribution: 'center' }, 100, 500)).toBe(200);
  });

  it('falls back to the margin for stretch (unused branch)', () => {
    expect(getOffset({ ...settings, distribution: 'stretch' }, 100, 500)).toBe(10);
  });
});

describe('renderGrid', () => {
  let root: HTMLDivElement;

  beforeEach(() => {
    root = document.createElement('div');
    setViewport(1000, 800);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders a stretch column grid spanning the full width minus margins', () => {
    renderGrid(root, { ...DEFAULT_SETTINGS, axis: 'columns', distribution: 'stretch', count: 4 });
    const frame = root.firstElementChild as HTMLDivElement;
    expect(frame.style.gridTemplateColumns).toBe('repeat(4, minmax(0, 1fr))');
    expect(frame.children).toHaveLength(4);
  });

  it('renders a fixed-size column grid with a pixel width and left offset', () => {
    renderGrid(root, {
      ...DEFAULT_SETTINGS,
      axis: 'columns',
      distribution: 'left',
      count: 3,
      size: 50,
      gutter: 10,
      margin: 20,
    });
    const frame = root.firstElementChild as HTMLDivElement;
    expect(frame.style.left).toBe('20px');
    expect(frame.style.width).toBe(`${3 * 50 + 2 * 10}px`);
    expect(frame.style.gridTemplateColumns).toBe('repeat(3, 50px)');
  });

  it('renders a rows grid using height/top instead of width/left', () => {
    renderGrid(root, {
      ...DEFAULT_SETTINGS,
      axis: 'rows',
      distribution: 'top',
      count: 2,
      size: 40,
      gutter: 0,
      margin: 5,
    });
    const frame = root.firstElementChild as HTMLDivElement;
    expect(frame.style.top).toBe('5px');
    expect(frame.style.height).toBe('80px');
    expect(frame.style.gridTemplateRows).toBe('repeat(2, 40px)');
  });

  it('renders a square grid with count*count tracks', () => {
    renderGrid(root, {
      ...DEFAULT_SETTINGS,
      axis: 'grid',
      distribution: 'stretch',
      count: 3,
    });
    const frame = root.firstElementChild as HTMLDivElement;
    expect(frame.children).toHaveLength(9);
    expect(frame.style.gridTemplateColumns).toBe('repeat(3, minmax(0, 1fr))');
    expect(frame.style.gridTemplateRows).toBe('repeat(3, minmax(0, 1fr))');
  });

  it('centers a fixed-size square grid around the viewport midpoint', () => {
    renderGrid(root, {
      ...DEFAULT_SETTINGS,
      axis: 'grid',
      distribution: 'center',
      count: 2,
      size: 100,
      gutter: 0,
      margin: 0,
    });
    const frame = root.firstElementChild as HTMLDivElement;
    expect(frame.style.left).toBe('400px');
    expect(frame.style.top).toBe('300px');
  });

  it('fills every track with the requested rgba color', () => {
    renderGrid(root, {
      ...DEFAULT_SETTINGS,
      axis: 'columns',
      distribution: 'stretch',
      count: 2,
      color: '#FF0000',
      opacity: 50,
    });
    const frame = root.firstElementChild as HTMLDivElement;
    const track = frame.firstElementChild as HTMLDivElement;
    expect(track.style.background).toBe('rgba(255, 0, 0, 0.5)');
  });
});
