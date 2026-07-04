import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_SETTINGS,
  GRID_MESSAGE_TYPE,
  GRID_OVERLAY_ID,
  STORAGE_KEY,
  type GridSettings,
  normalizeSettings,
} from './utils';
import {
  getActivePattern,
  getSiteState,
  getSiteStorageKey,
  normalizeGridStorage,
} from './site-patterns';

type StoredSettings = Record<string, unknown>;

function createChromeMock(initial: Partial<GridSettings> = {}) {
  let stored: unknown = normalizeSettings({ ...DEFAULT_SETTINGS, ...initial });
  const messageListeners: Array<(message: { type?: string; settings?: GridSettings }) => void> = [];

  const chromeMock = {
    runtime: {
      getURL: (path: string) => `chrome-extension://test-id/${path}`,
      onMessage: {
        addListener: vi.fn(
          (listener: (message: { type?: string; settings?: GridSettings }) => void) => {
            messageListeners.push(listener);
          },
        ),
      },
    },
    storage: {
      sync: {
        get: vi.fn((_defaults: StoredSettings, callback: (result: StoredSettings) => void) => {
          callback({ [STORAGE_KEY]: stored });
        }),
        set: vi.fn((values: StoredSettings) => {
          stored = values[STORAGE_KEY] as GridSettings;
          return Promise.resolve();
        }),
      },
    },
  };

  return {
    chromeMock,
    emitMessage: (message: { type?: string; settings?: GridSettings }) => {
      messageListeners.forEach((listener) => listener(message));
    },
    getStoredSettings: () => {
      const siteKey = getSiteStorageKey(window.location.hostname);
      const storage = normalizeGridStorage(stored, siteKey);
      return getActivePattern(getSiteState(storage, siteKey)).settings;
    },
  };
}

async function loadContentScript(initial: Partial<GridSettings> = {}) {
  const { chromeMock, emitMessage, getStoredSettings } = createChromeMock(initial);
  vi.stubGlobal('chrome', chromeMock);
  vi.resetModules();
  await import('./content');
  return { chromeMock, emitMessage, getStoredSettings };
}

function flushPromises(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function getOverlay(): HTMLElement {
  const overlay = document.getElementById(GRID_OVERLAY_ID);
  if (!overlay) {
    throw new Error('overlay not rendered');
  }
  return overlay;
}

beforeEach(() => {
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0);
    return 0;
  });
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('initial render', () => {
  it('renders the overlay with the default stretch column grid', async () => {
    await loadContentScript();

    const overlay = getOverlay();
    const gridLayer = overlay.querySelector('.grid-ui__layer') as HTMLElement;
    const frame = gridLayer.firstElementChild as HTMLElement;

    expect(frame.children).toHaveLength(DEFAULT_SETTINGS.count);
    expect(frame.style.gridTemplateColumns).toBe(`repeat(${DEFAULT_SETTINGS.count}, minmax(0, 1fr))`);
  });

  it('reads the site identity from the page metadata for the popover header', async () => {
    document.head.innerHTML = '<meta property="og:site_name" content="Acme Corp" />';

    await loadContentScript();

    const title = document.querySelector('.grid-ui__popover-title');
    expect(title?.textContent).toBe('Acme Corp');
  });
});

describe('visibility toggle', () => {
  it('hides the grid layer and flips the trigger icon state', async () => {
    await loadContentScript();
    const overlay = getOverlay();
    const axisTrigger = overlay.querySelector('.grid-ui__anchor--start') as HTMLButtonElement;
    const gridLayer = overlay.querySelector('.grid-ui__layer') as HTMLElement;

    axisTrigger.click();

    expect(gridLayer.style.opacity).toBe('0');
    expect(axisTrigger.dataset.state).toBe('hidden');
    expect(axisTrigger.getAttribute('aria-label')).toBe('Show overlay');
  });

  it('persists the change to chrome.storage.sync after the debounce delay', async () => {
    const { chromeMock, getStoredSettings } = await loadContentScript();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

    const overlay = getOverlay();
    const axisTrigger = overlay.querySelector('.grid-ui__anchor--start') as HTMLButtonElement;
    axisTrigger.click();

    expect(chromeMock.storage.sync.set).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(300);

    expect(chromeMock.storage.sync.set).toHaveBeenCalled();
    expect(getStoredSettings().visible).toBe(false);
  });
});

describe('adjust popover', () => {
  it('opens on trigger click and closes when clicked again', async () => {
    await loadContentScript();
    const overlay = getOverlay();
    const adjustTrigger = overlay.querySelector('.grid-ui__anchor--center') as HTMLButtonElement;
    const popover = overlay.querySelector('[data-popover="adjust"]') as HTMLElement;

    adjustTrigger.click();
    expect(popover.dataset.open).toBe('true');
    expect(adjustTrigger.getAttribute('aria-expanded')).toBe('true');

    adjustTrigger.click();
    expect(popover.dataset.open).toBe('false');
    expect(adjustTrigger.getAttribute('aria-expanded')).toBe('false');
  });
});

describe('pattern picker', () => {
  it('filters variations and defaults by the active axis', async () => {
    await loadContentScript();
    const overlay = getOverlay();
    const adjustTrigger = overlay.querySelector('.grid-ui__anchor--center') as HTMLButtonElement;
    const patternTrigger = overlay.querySelector('.grid-ui__pattern-trigger') as HTMLButtonElement;

    adjustTrigger.click();
    patternTrigger.click();

    const initialOptions = Array.from(
      overlay.querySelectorAll('.grid-ui__pattern-option'),
      (option) => option.textContent,
    );

    expect(initialOptions).toContain('Version 1');
    expect(initialOptions).toContain('Web 12');
    expect(initialOptions).not.toContain('Rhythm 8');

    const rowsOption = overlay.querySelector('[data-axis="rows"]') as HTMLButtonElement;
    rowsOption.click();
    patternTrigger.click();

    const rowOptions = Array.from(
      overlay.querySelectorAll('.grid-ui__pattern-option'),
      (option) => option.textContent,
    );

    expect(rowOptions).toContain('Version 2');
    expect(rowOptions).toContain('Rhythm 8');
    expect(rowOptions).not.toContain('Web 12');
  });

  it('applies defaults onto the active variation and can snapshot a new version', async () => {
    const { getStoredSettings } = await loadContentScript();
    const overlay = getOverlay();
    const adjustTrigger = overlay.querySelector('.grid-ui__anchor--center') as HTMLButtonElement;
    const patternTrigger = overlay.querySelector('.grid-ui__pattern-trigger') as HTMLButtonElement;
    const patternLabel = overlay.querySelector('.grid-ui__pattern-trigger-label') as HTMLSpanElement;
    const addButton = overlay.querySelector('.grid-ui__pattern-action') as HTMLButtonElement;

    adjustTrigger.click();
    patternTrigger.click();

    const webTwelve = Array.from(
      overlay.querySelectorAll<HTMLButtonElement>('.grid-ui__pattern-option'),
    ).find((option) => option.textContent === 'Web 12');

    webTwelve?.click();

    expect(patternLabel.textContent).toBe('Version 1');
    const frame = (overlay.querySelector('.grid-ui__layer') as HTMLElement).firstElementChild as HTMLElement;
    expect(frame.children).toHaveLength(12);

    addButton.click();

    expect(patternLabel.textContent).toBe('Version 2');
    expect(getStoredSettings().count).toBe(12);
  });
});

describe('measurement controls', () => {
  it('updates the count and the rendered grid when the count slider changes', async () => {
    await loadContentScript();
    const overlay = getOverlay();
    const countRange = overlay.querySelector('.grid-ui__field--slider input[min="1"][max="24"]') as HTMLInputElement;

    countRange.value = '10';
    countRange.dispatchEvent(new Event('input'));

    const frame = (overlay.querySelector('.grid-ui__layer') as HTMLElement).firstElementChild as HTMLElement;
    expect(frame.children).toHaveLength(10);
  });

  it('hides the size field for stretch and shows it for a fixed distribution', async () => {
    await loadContentScript();
    const overlay = getOverlay();
    const sizeField = overlay.querySelector('.grid-ui__field--slider--color')
      ?.parentElement?.querySelectorAll('label')[1] as HTMLLabelElement | undefined;
    const distributionGroup = overlay.querySelector('.grid-ui__distribution-group') as HTMLElement;
    const leftOption = distributionGroup.querySelector('[data-distribution="left"]') as HTMLButtonElement;

    expect(sizeField?.hidden).toBe(true);

    leftOption.click();

    expect(sizeField?.hidden).toBe(false);
    const frame = (overlay.querySelector('.grid-ui__layer') as HTMLElement).firstElementChild as HTMLElement;
    expect(frame.style.width).not.toBe('');
  });
});

describe('axis switching', () => {
  it('resets the distribution and re-renders the grid for the new axis', async () => {
    const { getStoredSettings } = await loadContentScript();
    const overlay = getOverlay();
    const rowsOption = overlay.querySelector('[data-axis="rows"]') as HTMLButtonElement;

    rowsOption.click();

    expect(rowsOption.dataset.active).toBe('true');
    expect(rowsOption.getAttribute('aria-pressed')).toBe('true');

    const sizeLabel = overlay.querySelector('.grid-ui__field-value')
      ? (Array.from(overlay.querySelectorAll('.grid-ui__field-label')).find(
          (el) => el.textContent === 'Height',
        ) as HTMLElement | undefined)
      : undefined;
    expect(sizeLabel?.textContent).toBe('Height');

    const frame = (overlay.querySelector('.grid-ui__layer') as HTMLElement).firstElementChild as HTMLElement;
    expect(getStoredSettings().axis).toBe('rows');
    expect(frame.style.gridTemplateRows).toBe(
      `repeat(${getStoredSettings().count}, minmax(0, 1fr))`,
    );
  });
});

describe('disabling and resetting', () => {
  it('removes the overlay from the DOM and persists enabled:false immediately when closed', async () => {
    const { chromeMock, getStoredSettings } = await loadContentScript();
    const overlay = getOverlay();
    const closeTrigger = overlay.querySelector('.grid-ui__close') as HTMLButtonElement;

    closeTrigger.click();
    await flushPromises();

    expect(document.getElementById(GRID_OVERLAY_ID)).toBeNull();
    expect(chromeMock.storage.sync.set).toHaveBeenCalled();
    expect(getStoredSettings().enabled).toBe(false);
  });

  it('restores default measurements but keeps the current toolbar position on reset', async () => {
    const { getStoredSettings } = await loadContentScript({ toolbarX: 42, toolbarY: 84 });
    const overlay = getOverlay();
    const countRange = overlay.querySelector('.grid-ui__field--slider input[min="1"][max="24"]') as HTMLInputElement;
    countRange.value = '20';
    countRange.dispatchEvent(new Event('input'));

    const resetButton = overlay.querySelector('.grid-ui__text-button') as HTMLButtonElement;
    resetButton.click();
    await flushPromises();

    const stored = getStoredSettings();
    expect(stored.count).toBe(DEFAULT_SETTINGS.count);
    expect(stored.toolbarX).toBe(42);
    expect(stored.toolbarY).toBe(84);
  });
});

describe('background/popup messaging', () => {
  it('re-renders when a GRID_SETTINGS_UPDATED message arrives', async () => {
    const { emitMessage } = await loadContentScript();
    const overlay = getOverlay();

    emitMessage({
      type: GRID_MESSAGE_TYPE,
      settings: { ...DEFAULT_SETTINGS, axis: 'grid', count: 3 },
    });

    const frame = (overlay.querySelector('.grid-ui__layer') as HTMLElement).firstElementChild as HTMLElement;
    expect(frame.children).toHaveLength(9);
  });

  it('ignores messages with an unrelated type', async () => {
    const { emitMessage } = await loadContentScript();
    const overlay = getOverlay();
    const frameBefore = (overlay.querySelector('.grid-ui__layer') as HTMLElement).firstElementChild as HTMLElement;
    const childCountBefore = frameBefore.children.length;

    emitMessage({ type: 'SOME_OTHER_MESSAGE' });

    const frameAfter = (overlay.querySelector('.grid-ui__layer') as HTMLElement).firstElementChild as HTMLElement;
    expect(frameAfter.children).toHaveLength(childCountBefore);
  });
});

describe('controller drag suppresses the trailing click', () => {
  it('does not toggle visibility when a click follows a drag', async () => {
    await loadContentScript();
    const overlay = getOverlay();
    const controller = overlay.querySelector('.grid-ui__controller') as HTMLElement;
    const axisTrigger = overlay.querySelector('.grid-ui__anchor--start') as HTMLButtonElement;

    controller.dispatchEvent(
      new PointerEvent('pointerdown', { pointerId: 1, clientX: 100, clientY: 100, button: 0 }),
    );
    controller.dispatchEvent(
      new PointerEvent('pointermove', { pointerId: 1, clientX: 140, clientY: 100 }),
    );
    expect(overlay.classList.contains('grid-ui--dragging')).toBe(true);

    controller.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1 }));
    expect(overlay.classList.contains('grid-ui--dragging')).toBe(false);

    axisTrigger.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(axisTrigger.dataset.state).toBe('visible');
  });
});
