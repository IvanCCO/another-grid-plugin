import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, GRID_OVERLAY_ID, STORAGE_KEY, normalizeSettings } from './utils';

// Kept in its own file: content.ts registers a window resize listener on
// import that is never torn down, so re-importing the module in a
// vitest file that reuses the same jsdom `window` (as content.test.ts does
// across its many `it` blocks) would accumulate stale listeners. A
// dedicated file gets a fresh jsdom environment, avoiding that leak.
describe('resize handling', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    });
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
  });

  it('re-renders the grid when the window is resized', async () => {
    const stored = normalizeSettings({ ...DEFAULT_SETTINGS, enabled: true });
    vi.stubGlobal('chrome', {
      runtime: {
        getURL: (path: string) => `chrome-extension://test-id/${path}`,
        onMessage: { addListener: vi.fn() },
      },
      storage: {
        sync: {
          get: vi.fn((_defaults: unknown, callback: (result: Record<string, unknown>) => void) => {
            callback({ [STORAGE_KEY]: stored });
          }),
          set: vi.fn(() => Promise.resolve()),
        },
      },
    });

    await import('./content');

    const overlay = document.getElementById(GRID_OVERLAY_ID) as HTMLElement;
    const gridLayer = overlay.querySelector('.grid-ui__layer') as HTMLElement;
    const frameBefore = gridLayer.firstElementChild;

    window.dispatchEvent(new Event('resize'));

    const frameAfter = gridLayer.firstElementChild;
    expect(frameAfter).not.toBeNull();
    expect(frameAfter).not.toBe(frameBefore);
  });
});
