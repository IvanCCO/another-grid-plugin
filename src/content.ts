import {
  DEFAULT_SETTINGS,
  GRID_MESSAGE_TYPE,
  GRID_OVERLAY_ID,
  STORAGE_KEY,
  type GridAxis,
  type GridSettings,
  getSizeLabel,
  normalizeSettings,
} from './utils';
import {
  createAxisGroup,
  createButton,
  createColorField,
  createDistributionGroup,
  createIcon,
  createLayoutColumn,
  createPopoverHeader,
  createSection,
  createSliderField,
  bindSliderField,
  getAssetUrl,
  getAxisOption,
  renderAxisGroup,
  renderDistributionGroup,
  updateSliderVisual,
} from './content/dom-builders';
import { renderGrid } from './content/grid-render';
import {
  CONTROLLER_VIEWPORT_PADDING,
  clampControllerPosition,
  computePopoverPlacement,
  type PopoverName,
} from './content/popover-position';
import { getSiteIdentity } from './content/site-identity';

type OverlayUi = {
  root: HTMLDivElement;
  gridLayer: HTMLDivElement;
  controller: HTMLDivElement;
  axisTrigger: HTMLButtonElement;
  axisTriggerIcon: HTMLSpanElement;
  adjustTrigger: HTMLButtonElement;
  adjustTriggerIcon: HTMLSpanElement;
  adjustPopover: HTMLDivElement;
  adjustPopoverSiteBadge: HTMLSpanElement;
  adjustPopoverSiteIcon: HTMLImageElement;
  adjustPopoverSiteFallback: HTMLSpanElement;
  adjustPopoverTitle: HTMLElement;
  adjustAxisGroup: HTMLDivElement;
  distributionGroup: HTMLDivElement;
  closeTrigger: HTMLButtonElement;
  countValue: HTMLSpanElement;
  sizeField: HTMLLabelElement;
  sizeLabel: HTMLSpanElement;
  sizeValue: HTMLSpanElement;
  marginValue: HTMLSpanElement;
  gutterValue: HTMLSpanElement;
  opacityValue: HTMLSpanElement;
  countRange: HTMLInputElement;
  sizeRange: HTMLInputElement;
  marginRange: HTMLInputElement;
  gutterRange: HTMLInputElement;
  colorInput: HTMLInputElement;
  opacityRange: HTMLInputElement;
};

type DragState = {
  pointerId: number;
  originX: number;
  originY: number;
  startX: number;
  startY: number;
  moved: boolean;
};

let overlayUi: OverlayUi | null = null;
let currentSettings = DEFAULT_SETTINGS;
let resizeFrame = 0;
let activePopover: PopoverName | null = null;
let isDocumentEventsBound = false;
const PERSIST_DELAY_MS = 250;
let persistTimer = 0;
let dragState: DragState | null = null;
let suppressClickUntil = 0;

const DRAG_THRESHOLD_PX = 6;

function removeOverlay(): void {
  window.clearTimeout(persistTimer);
  overlayUi?.root.remove();
  overlayUi = null;
  activePopover = null;
  dragState = null;
}

function applyControllerPosition(ui: OverlayUi, x: number, y: number): void {
  const width = ui.controller.offsetWidth;
  const height = ui.controller.offsetHeight;
  const next = clampControllerPosition(
    x,
    y,
    width,
    height,
    window.innerWidth,
    window.innerHeight,
  );

  ui.controller.style.left = `${next.x}px`;
  ui.controller.style.top = `${next.y}px`;
  ui.controller.style.right = 'auto';
}

function getControllerPosition(settings: GridSettings, ui: OverlayUi): { x: number; y: number } {
  const width = ui.controller.offsetWidth;
  const height = ui.controller.offsetHeight;
  const defaultX = window.innerWidth - width - CONTROLLER_VIEWPORT_PADDING;
  const defaultY = CONTROLLER_VIEWPORT_PADDING;

  return clampControllerPosition(
    settings.toolbarX ?? defaultX,
    settings.toolbarY ?? defaultY,
    width,
    height,
    window.innerWidth,
    window.innerHeight,
  );
}

function ensureOverlayUi(): OverlayUi {
  if (overlayUi?.root.isConnected) {
    return overlayUi;
  }

  const root = document.createElement('div');
  root.id = GRID_OVERLAY_ID;
  root.className = 'grid-ui';

  const gridLayer = document.createElement('div');
  gridLayer.className = 'grid-ui__layer';
  gridLayer.setAttribute('aria-hidden', 'true');

  const controller = document.createElement('div');
  controller.className = 'grid-ui__controller';
  controller.setAttribute('role', 'toolbar');
  controller.setAttribute('aria-label', 'Grid overlay controls');

  const axisTrigger = createButton(
    'Hide overlay',
    createIcon('open-eye.svg', 'grid-ui__button-icon'),
    'grid-ui__button--primary',
  );
  axisTrigger.classList.add('grid-ui__anchor', 'grid-ui__anchor--start');

  const axisTriggerIcon = axisTrigger.firstChild as HTMLSpanElement;

  const defaultAxis = getAxisOption(DEFAULT_SETTINGS.axis);
  const adjustTrigger = createButton(
    'Adjust grid settings',
    createIcon(defaultAxis.icon, 'grid-ui__button-icon', defaultAxis.rotation ?? 0),
  );
  adjustTrigger.classList.add('grid-ui__anchor', 'grid-ui__anchor--center');
  adjustTrigger.setAttribute('aria-haspopup', 'dialog');
  adjustTrigger.setAttribute('aria-expanded', 'false');

  const adjustTriggerIcon = adjustTrigger.firstChild as HTMLSpanElement;

  const closeTrigger = document.createElement('button');
  closeTrigger.type = 'button';
  closeTrigger.className = 'grid-ui__close';
  closeTrigger.setAttribute('aria-label', 'Disable grid overlay');
  closeTrigger.textContent = '×';

  const adjustPopover = document.createElement('div');
  adjustPopover.className = 'grid-ui__popover';
  adjustPopover.dataset.popover = 'adjust';

  const adjustAxisGroup = createAxisGroup();
  const distributionGroup = createDistributionGroup();

  const layoutSection = document.createElement('div');
  layoutSection.className = 'grid-ui__layout-section';
  layoutSection.append(
    createLayoutColumn('Layout', adjustAxisGroup),
    createLayoutColumn('TYPE', distributionGroup),
  );

  const countField = createSliderField('Count', 1, 24, DEFAULT_SETTINGS.count);
  const sizeField = createSliderField('Width', 1, 400, DEFAULT_SETTINGS.size);
  const marginField = createSliderField('Margin', 0, 240, DEFAULT_SETTINGS.margin);
  const gutterField = createSliderField('Gutter', 0, 240, DEFAULT_SETTINGS.gutter);

  const colorField = createColorField();
  const generalActions = document.createElement('div');
  generalActions.className = 'grid-ui__actions';

  const resetButton = document.createElement('button');
  resetButton.type = 'button';
  resetButton.className = 'grid-ui__text-button';
  resetButton.textContent = 'Reset defaults';
  resetButton.addEventListener('click', () => {
    void applySettings(
      {
        ...DEFAULT_SETTINGS,
        enabled: true,
        toolbarX: currentSettings.toolbarX,
        toolbarY: currentSettings.toolbarY,
      },
      { immediatePersist: true },
    );
  });

  const popoverHeader = createPopoverHeader();

  generalActions.appendChild(resetButton);
  adjustPopover.append(
    popoverHeader.header,
    layoutSection,
    createSection('Measurements'),
    countField.field,
    sizeField.field,
    marginField.field,
    gutterField.field,
    colorField.field,
    generalActions,
  );

  controller.append(axisTrigger, adjustTrigger, closeTrigger);
  root.append(gridLayer, controller, adjustPopover);
  (document.body ?? document.documentElement).appendChild(root);

  root.addEventListener('pointerleave', () => {
    if (!root.matches(':focus-within')) {
      setActivePopover(null);
    }
  });

  if (!isDocumentEventsBound) {
    document.addEventListener('pointerdown', (event) => {
      if (!overlayUi?.root.contains(event.target as Node)) {
        setActivePopover(null);
      }
    });
    isDocumentEventsBound = true;
  }

  axisTrigger.addEventListener('click', () => {
    if (performance.now() < suppressClickUntil) {
      return;
    }
    setActivePopover(null);
    void patchSettings({ visible: !currentSettings.visible });
  });

  adjustTrigger.addEventListener('click', () => {
    if (performance.now() < suppressClickUntil) {
      return;
    }
    togglePopover('adjust');
  });

  adjustAxisGroup.addEventListener('click', (event) => {
    const target = (event.target as HTMLElement).closest<HTMLButtonElement>('.grid-ui__axis-option');
    const axis = target?.dataset.axis as GridAxis | undefined;

    if (!axis) {
      return;
    }

    void patchSettings({
      axis,
      distribution: axis === currentSettings.axis ? currentSettings.distribution : DEFAULT_SETTINGS.distribution,
    });
  });

  closeTrigger.addEventListener('click', () => {
    if (performance.now() < suppressClickUntil) {
      return;
    }
    void applySettings(
      { ...currentSettings, enabled: false },
      { immediatePersist: true },
    );
  });

  controller.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) {
      return;
    }

    if (event.target !== controller) {
      return;
    }

    const rect = controller.getBoundingClientRect();
    dragState = {
      pointerId: event.pointerId,
      originX: rect.left,
      originY: rect.top,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };

    controller.setPointerCapture(event.pointerId);
  });

  controller.addEventListener('pointermove', (event) => {
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;

    if (!dragState.moved) {
      const distance = Math.hypot(deltaX, deltaY);
      if (distance < DRAG_THRESHOLD_PX) {
        return;
      }

      dragState.moved = true;
      root.classList.add('grid-ui--dragging');
      setActivePopover(null);
    }

    event.preventDefault();
    applyControllerPosition(
      overlayUi ?? ensureOverlayUi(),
      dragState.originX + deltaX,
      dragState.originY + deltaY,
    );
  });

  const finishDrag = (event: PointerEvent): void => {
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const didMove = dragState.moved;
    dragState = null;
    root.classList.remove('grid-ui--dragging');

    if (!didMove) {
      return;
    }

    suppressClickUntil = performance.now() + 220;

    const rect = controller.getBoundingClientRect();
    void applySettings(
      {
        ...currentSettings,
        toolbarX: rect.left,
        toolbarY: rect.top,
      },
      { immediatePersist: true },
    );
  };

  controller.addEventListener('pointerup', finishDrag);
  controller.addEventListener('pointercancel', finishDrag);
  controller.addEventListener(
    'click',
    (event) => {
      if (performance.now() < suppressClickUntil) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true,
  );

  bindSliderField(countField.input, countField.valueEl, (value) => {
    void patchSettings({ count: value });
  });
  bindSliderField(
    sizeField.input,
    sizeField.valueEl,
    (value) => {
      void patchSettings({ size: value });
    },
    (value) => String(value),
  );
  bindSliderField(marginField.input, marginField.valueEl, (value) => {
    void patchSettings({ margin: value });
  });
  bindSliderField(gutterField.input, gutterField.valueEl, (value) => {
    void patchSettings({ gutter: value });
  });

  colorField.colorInput.addEventListener('input', () => {
    void patchSettings({ color: colorField.colorInput.value });
  });

  bindSliderField(
    colorField.opacityInput,
    colorField.opacityValue,
    (value) => {
      void patchSettings({ opacity: value });
    },
    (value) => `${value}%`,
  );

  overlayUi = {
    root,
    gridLayer,
    controller,
    axisTrigger,
    axisTriggerIcon,
    adjustTrigger,
    adjustTriggerIcon,
    adjustPopover,
    adjustPopoverSiteBadge: popoverHeader.badge,
    adjustPopoverSiteIcon: popoverHeader.icon,
    adjustPopoverSiteFallback: popoverHeader.fallback,
    adjustPopoverTitle: popoverHeader.title,
    adjustAxisGroup,
    distributionGroup,
    closeTrigger,
    countValue: countField.valueEl,
    sizeField: sizeField.field,
    sizeLabel: sizeField.field.querySelector('.grid-ui__field-label') as HTMLSpanElement,
    sizeValue: sizeField.valueEl,
    marginValue: marginField.valueEl,
    gutterValue: gutterField.valueEl,
    opacityValue: colorField.opacityValue,
    countRange: countField.input,
    sizeRange: sizeField.input,
    marginRange: marginField.input,
    gutterRange: gutterField.input,
    colorInput: colorField.colorInput,
    opacityRange: colorField.opacityInput,
  };

  return overlayUi;
}

function updatePopoverSiteIdentity(ui: OverlayUi): void {
  const identity = getSiteIdentity();
  ui.adjustPopoverTitle.textContent = identity.name;
  ui.adjustPopoverSiteFallback.textContent = identity.fallbackLabel;

  if (!identity.iconUrl) {
    ui.adjustPopoverSiteBadge.dataset.iconState = 'fallback';
    ui.adjustPopoverSiteIcon.removeAttribute('src');
    return;
  }

  ui.adjustPopoverSiteBadge.dataset.iconState = 'loading';

  if (ui.adjustPopoverSiteIcon.getAttribute('src') !== identity.iconUrl) {
    ui.adjustPopoverSiteIcon.src = identity.iconUrl;
    return;
  }

  if (ui.adjustPopoverSiteIcon.complete && ui.adjustPopoverSiteIcon.naturalWidth > 0) {
    ui.adjustPopoverSiteBadge.dataset.iconState = 'loaded';
  }
}

function setActivePopover(next: PopoverName | null): void {
  activePopover = next;

  const ui = overlayUi;
  if (!ui) {
    return;
  }

  const popovers: Array<[PopoverName, HTMLDivElement, HTMLButtonElement]> = [
    ['adjust', ui.adjustPopover, ui.adjustTrigger],
  ];

  for (const [name, popover, trigger] of popovers) {
    const open = next === name;
    popover.dataset.open = String(open);
    trigger.setAttribute('aria-expanded', String(open));
    if (open) {
      positionPopover(name, popover, trigger);
    }
  }
}

function togglePopover(name: PopoverName): void {
  setActivePopover(activePopover === name ? null : name);
}

function positionPopover(
  name: PopoverName,
  popover: HTMLDivElement,
  trigger: HTMLButtonElement,
): void {
  const rect = trigger.getBoundingClientRect();
  const placement = computePopoverPlacement(
    name,
    rect,
    popover.offsetWidth,
    popover.offsetHeight,
    window.innerWidth,
    window.innerHeight,
  );

  popover.dataset.side = placement.side;
  popover.style.top = `${placement.top}px`;
  popover.style.left = `${placement.left}px`;
  popover.style.transformOrigin = `${placement.originX}% ${placement.side === 'bottom' ? '0%' : '100%'}`;
}

function updateSizeAvailability(ui: OverlayUi, settings: GridSettings): void {
  ui.sizeField.hidden = settings.distribution === 'stretch';
}

function renderController(settings: GridSettings): void {
  const ui = ensureOverlayUi();
  updatePopoverSiteIdentity(ui);
  renderDistributionGroup(ui.distributionGroup, settings.axis, settings.distribution, (value) => {
    void patchSettings({ distribution: value });
  });
  renderAxisGroup(ui.adjustAxisGroup, settings.axis);
  const axisOption = getAxisOption(settings.axis);
  ui.adjustTriggerIcon.style.setProperty(
    '--grid-icon-url',
    `url("${getAssetUrl(axisOption.icon)}")`,
  );
  ui.adjustTriggerIcon.style.setProperty(
    '--grid-icon-rotation',
    `${axisOption.rotation ?? 0}deg`,
  );
  ui.axisTriggerIcon.style.setProperty(
    '--grid-icon-url',
    `url("${getAssetUrl(settings.visible ? 'open-eye.svg' : 'closed-eye.svg')}")`,
  );
  ui.axisTriggerIcon.style.setProperty(
    '--grid-icon-rotation',
    '0deg',
  );
  ui.axisTrigger.setAttribute('aria-label', settings.visible ? 'Hide overlay' : 'Show overlay');
  ui.axisTrigger.dataset.state = settings.visible ? 'visible' : 'hidden';
  const controllerPosition = getControllerPosition(settings, ui);
  applyControllerPosition(ui, controllerPosition.x, controllerPosition.y);

  ui.countRange.value = String(settings.count);
  ui.sizeRange.value = String(settings.size);
  ui.marginRange.value = String(settings.margin);
  ui.gutterRange.value = String(settings.gutter);
  ui.colorInput.value = settings.color;
  ui.opacityRange.value = String(settings.opacity);
  updateSliderVisual(ui.countRange);
  updateSliderVisual(ui.sizeRange);
  updateSliderVisual(ui.marginRange);
  updateSliderVisual(ui.gutterRange);
  updateSliderVisual(ui.opacityRange);
  ui.countValue.textContent = String(settings.count);
  ui.sizeLabel.textContent = getSizeLabel(settings.axis);
  ui.sizeValue.textContent = String(settings.size);
  ui.marginValue.textContent = String(settings.margin);
  ui.gutterValue.textContent = String(settings.gutter);
  ui.opacityValue.textContent = `${settings.opacity}%`;
  updateSizeAvailability(ui, settings);

  if (activePopover === 'adjust') {
    positionPopover('adjust', ui.adjustPopover, ui.adjustTrigger);
  }
}

function renderOverlay(settings: GridSettings): void {
  if (!settings.enabled) {
    removeOverlay();
    return;
  }

  const ui = ensureOverlayUi();
  const root = ui.gridLayer;
  root.replaceChildren();
  root.style.opacity = settings.visible ? '1' : '0';

  renderGrid(root, settings);
  renderController(settings);
}

function scheduleRender(settings: GridSettings): void {
  window.cancelAnimationFrame(resizeFrame);
  resizeFrame = window.requestAnimationFrame(() => {
    renderOverlay(settings);
  });
}

async function persistSettings(settings: GridSettings): Promise<void> {
  await chrome.storage.sync.set({ [STORAGE_KEY]: settings });
}

function schedulePersist(settings: GridSettings): void {
  window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(() => {
    void persistSettings(settings).catch(() => undefined);
  }, PERSIST_DELAY_MS);
}

async function applySettings(
  nextSettings: GridSettings,
  options: { immediatePersist?: boolean } = {},
): Promise<void> {
  currentSettings = normalizeSettings(nextSettings);
  scheduleRender(currentSettings);

  if (options.immediatePersist) {
    window.clearTimeout(persistTimer);
    await persistSettings(currentSettings);
    return;
  }

  schedulePersist(currentSettings);
}

async function patchSettings(partial: Partial<GridSettings>): Promise<void> {
  await applySettings({
    ...currentSettings,
    ...partial,
  });
}

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
