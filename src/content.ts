import {
  DEFAULT_SETTINGS,
  GRID_MESSAGE_TYPE,
  GRID_OVERLAY_ID,
  STORAGE_KEY,
  type GridAxis,
  type GridDistribution,
  type GridSettings,
  getDistributionOptions,
  getFixedTrackSpan,
  getSizeLabel,
  normalizeSettings,
  toRgba,
} from './utils';

type OverlayUi = {
  root: HTMLDivElement;
  gridLayer: HTMLDivElement;
  controller: HTMLDivElement;
  axisTrigger: HTMLButtonElement;
  axisTriggerIcon: HTMLSpanElement;
  adjustTrigger: HTMLButtonElement;
  adjustTriggerIcon: HTMLSpanElement;
  adjustPopover: HTMLDivElement;
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

const AXIS_OPTIONS: Array<{
  value: GridAxis;
  label: string;
  icon: string;
  rotation?: number;
}> = [
  { value: 'columns', label: 'Vertical', icon: 'measure.svg', rotation: 45 },
  { value: 'rows', label: 'Horizontal', icon: 'measure.svg', rotation: 135 },
  { value: 'grid', label: 'Grid', icon: 'grid-2x2.svg' },
];

function getAxisOption(axis: GridAxis): (typeof AXIS_OPTIONS)[number] {
  return AXIS_OPTIONS.find((option) => option.value === axis) ?? AXIS_OPTIONS[0];
}

const DISTRIBUTION_ICONS: Record<
  GridAxis,
  Record<GridDistribution, { icon: string; rotation?: number } | undefined>
> = {
  columns: {
    stretch: { icon: 'dimension.svg', rotation: 90 },
    center: { icon: 'align-center-vertical.svg' },
    left: { icon: 'align-start-vertical.svg' },
    right: { icon: 'align-end-vertical.svg' },
    top: undefined,
    bottom: undefined,
  },
  rows: {
    stretch: { icon: 'dimension.svg' },
    center: { icon: 'align-center-vertical.svg', rotation: 90 },
    top: { icon: 'align-start-horizontal.svg' },
    bottom: { icon: 'align-end-horizontal.svg' },
    left: undefined,
    right: undefined,
  },
  grid: {
    stretch: { icon: 'grid-dimensions.svg' },
    center: { icon: 'square-square.svg' },
    left: undefined,
    right: undefined,
    top: undefined,
    bottom: undefined,
  },
};

let overlayUi: OverlayUi | null = null;
let currentSettings = DEFAULT_SETTINGS;
let resizeFrame = 0;
let activePopover: 'adjust' | null = null;
let isDocumentEventsBound = false;
const PERSIST_DELAY_MS = 250;
let persistTimer = 0;
let dragState: DragState | null = null;
let suppressClickUntil = 0;

const CONTROLLER_VIEWPORT_PADDING = 18;
const DRAG_THRESHOLD_PX = 6;
const POPOVER_VIEWPORT_PADDING = 12;
const POPOVER_GAP = 10;

function getAssetUrl(filename: string): string {
  return chrome.runtime.getURL(`assets/${filename}`);
}

function removeOverlay(): void {
  window.clearTimeout(persistTimer);
  overlayUi?.root.remove();
  overlayUi = null;
  activePopover = null;
  dragState = null;
}

function createIcon(filename: string, className: string, rotation = 0): HTMLSpanElement {
  const icon = document.createElement('span');
  icon.className = className;
  icon.style.setProperty('--grid-icon-url', `url("${getAssetUrl(filename)}")`);
  icon.style.setProperty('--grid-icon-rotation', `${rotation}deg`);
  return icon;
}

function createButton(
  label: string,
  icon: HTMLSpanElement,
  extraClass = '',
): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `grid-ui__button ${extraClass}`.trim();
  button.setAttribute('aria-label', label);
  button.appendChild(icon);
  return button;
}

function createSliderField(
  label: string,
  min: number,
  max: number,
  value: number,
): { field: HTMLLabelElement; input: HTMLInputElement; valueEl: HTMLSpanElement } {
  const field = document.createElement('label');
  field.className = 'grid-ui__field grid-ui__field--slider';

  const row = document.createElement('span');
  row.className = 'grid-ui__slider-row';

  const title = document.createElement('span');
  title.className = 'grid-ui__field-label';
  title.textContent = label;

  const ruler = document.createElement('span');
  ruler.className = 'grid-ui__slider-ruler';
  ruler.setAttribute('aria-hidden', 'true');

  const valueEl = document.createElement('span');
  valueEl.className = 'grid-ui__field-value';
  valueEl.textContent = String(value);

  row.append(title, ruler, valueEl);

  const handle = document.createElement('span');
  handle.className = 'grid-ui__slider-handle';
  handle.setAttribute('aria-hidden', 'true');

  const input = document.createElement('input');
  input.className = 'grid-ui__range';
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = '1';
  input.value = String(value);

  field.append(row, handle, input);
  updateSliderVisual(input);
  return { field, input, valueEl };
}

function createSelectField(
  label: string,
): { field: HTMLLabelElement; select: HTMLSelectElement } {
  const field = document.createElement('label');
  field.className = 'grid-ui__field';

  const title = document.createElement('span');
  title.className = 'grid-ui__field-label';
  title.textContent = label;

  const select = document.createElement('select');
  select.className = 'grid-ui__select';

  field.append(title, select);
  return { field, select };
}

function createColorField(): {
  field: HTMLLabelElement;
  colorInput: HTMLInputElement;
  opacityInput: HTMLInputElement;
  opacityValue: HTMLSpanElement;
} {
  const field = document.createElement('label');
  field.className = 'grid-ui__field';

  const row = document.createElement('span');
  row.className = 'grid-ui__field-row';

  const title = document.createElement('span');
  title.className = 'grid-ui__field-label';
  title.textContent = 'Color';

  const opacityValue = document.createElement('span');
  opacityValue.className = 'grid-ui__field-value';
  opacityValue.textContent = '12%';

  row.append(title, opacityValue);

  const stack = document.createElement('span');
  stack.className = 'grid-ui__color-stack';

  const colorInput = document.createElement('input');
  colorInput.className = 'grid-ui__color';
  colorInput.type = 'color';

  const opacityInput = document.createElement('input');
  opacityInput.className = 'grid-ui__range';
  opacityInput.type = 'range';
  opacityInput.min = '0';
  opacityInput.max = '100';
  opacityInput.step = '1';

  stack.append(colorInput, opacityInput);
  field.append(row, stack);

  return { field, colorInput, opacityInput, opacityValue };
}

function createSection(title: string): HTMLDivElement {
  const section = document.createElement('div');
  section.className = 'grid-ui__section-copy';

  const heading = document.createElement('strong');
  heading.className = 'grid-ui__section-title';
  heading.textContent = title;

  section.appendChild(heading);
  return section;
}

function createLayoutColumn(title: string, controls: HTMLElement): HTMLDivElement {
  const column = document.createElement('div');
  column.className = 'grid-ui__layout-column';

  const heading = document.createElement('strong');
  heading.className = 'grid-ui__section-title';
  heading.textContent = title;

  column.append(heading, controls);
  return column;
}

function createAxisGroup(): HTMLDivElement {
  const group = document.createElement('div');
  group.className = 'grid-ui__axis-group';
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', 'Grid type');

  for (const { value, label, icon, rotation } of AXIS_OPTIONS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'grid-ui__axis-option';
    button.dataset.axis = value;
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-label', label);

    const iconEl = createIcon(icon, 'grid-ui__axis-option-icon', rotation ?? 0);
    button.appendChild(iconEl);
    group.appendChild(button);
  }

  return group;
}

function createDistributionGroup(): HTMLDivElement {
  const group = document.createElement('div');
  group.className = 'grid-ui__distribution-group';
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', 'Distribution type');

  return group;
}

function createDivider(): HTMLDivElement {
  const divider = document.createElement('div');
  divider.className = 'grid-ui__divider';
  divider.setAttribute('aria-hidden', 'true');
  return divider;
}

function clampControllerPosition(
  x: number,
  y: number,
  width: number,
  height: number,
): { x: number; y: number } {
  return {
    x: Math.min(
      Math.max(x, CONTROLLER_VIEWPORT_PADDING),
      window.innerWidth - width - CONTROLLER_VIEWPORT_PADDING,
    ),
    y: Math.min(
      Math.max(y, CONTROLLER_VIEWPORT_PADDING),
      window.innerHeight - height - CONTROLLER_VIEWPORT_PADDING,
    ),
  };
}

function applyControllerPosition(ui: OverlayUi, x: number, y: number): void {
  const width = ui.controller.offsetWidth;
  const height = ui.controller.offsetHeight;
  const next = clampControllerPosition(x, y, width, height);

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
    createLayoutColumn('Tipo', distributionGroup),
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
      { ...DEFAULT_SETTINGS, enabled: true },
      { immediatePersist: true },
    );
  });

  generalActions.appendChild(resetButton);
  adjustPopover.append(
    createPopoverHeader('Adjust grid'),
    layoutSection,
    createDivider(),
    createSection('Measurements'),
    countField.field,
    sizeField.field,
    marginField.field,
    gutterField.field,
    createDivider(),
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
    (value) => `${value} ${getSizeLabel(currentSettings.axis).toLowerCase()}`,
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

function createPopoverHeader(title: string): HTMLDivElement {
  const header = document.createElement('div');
  header.className = 'grid-ui__popover-header';

  const heading = document.createElement('strong');
  heading.className = 'grid-ui__popover-title';
  heading.textContent = title;

  header.appendChild(heading);
  return header;
}

function updateSliderVisual(input: HTMLInputElement): void {
  const min = Number(input.min || 0);
  const max = Number(input.max || 100);
  const value = Number(input.value || min);
  const percent = max === min ? 0 : ((value - min) / (max - min)) * 100;
  const field = input.closest('.grid-ui__field--slider') as HTMLElement | null;

  if (!field) {
    return;
  }

  field.style.setProperty('--slider-percent', `${percent}`);
}

function bindSliderField(
  input: HTMLInputElement,
  output: HTMLElement,
  onChange: (value: number) => void,
  formatValue: (value: number) => string = (value) => String(value),
): void {
  input.addEventListener('input', () => {
    const value = Number(input.value);
    output.textContent = formatValue(value);
    updateSliderVisual(input);
    void onChange(value);
  });
}

function setActivePopover(next: typeof activePopover): void {
  activePopover = next;

  const ui = overlayUi;
  if (!ui) {
    return;
  }

  const popovers: Array<[typeof activePopover, HTMLDivElement, HTMLButtonElement]> = [
    ['adjust', ui.adjustPopover, ui.adjustTrigger],
  ];

  for (const [name, popover, trigger] of popovers) {
    const open = next === name;
    popover.dataset.open = String(open);
    trigger.setAttribute('aria-expanded', String(open));
    if (open && name) {
      positionPopover(name, popover, trigger);
    }
  }
}

function togglePopover(name: Exclude<typeof activePopover, null>): void {
  setActivePopover(activePopover === name ? null : name);
}

function positionPopover(
  name: Exclude<typeof activePopover, null>,
  popover: HTMLDivElement,
  trigger: HTMLButtonElement,
): void {
  const rect = trigger.getBoundingClientRect();
  const width = popover.offsetWidth || 304;
  const height = popover.offsetHeight || 420;

  let left = rect.right - width;
  let preferredAnchorX = rect.right;

  if (name === 'adjust') {
    left = rect.left + rect.width / 2 - width / 2;
    preferredAnchorX = rect.left + rect.width / 2;
  }

  const clampedLeft = Math.min(
    Math.max(left, POPOVER_VIEWPORT_PADDING),
    window.innerWidth - width - POPOVER_VIEWPORT_PADDING,
  );

  const originX = Math.min(
    Math.max(((preferredAnchorX - clampedLeft) / width) * 100, 12),
    88,
  );
  const spaceBelow = window.innerHeight - rect.bottom - POPOVER_GAP - POPOVER_VIEWPORT_PADDING;
  const spaceAbove = rect.top - POPOVER_GAP - POPOVER_VIEWPORT_PADDING;
  const openBelow = spaceBelow >= height || spaceBelow >= spaceAbove;
  const top = openBelow
    ? rect.bottom + POPOVER_GAP
    : rect.top - POPOVER_GAP - height;
  const clampedTop = Math.min(
    Math.max(top, POPOVER_VIEWPORT_PADDING),
    window.innerHeight - height - POPOVER_VIEWPORT_PADDING,
  );

  popover.dataset.side = openBelow ? 'bottom' : 'top';
  popover.style.top = `${clampedTop}px`;
  popover.style.left = `${clampedLeft}px`;
  popover.style.transformOrigin = `${originX}% ${openBelow ? '0%' : '100%'}`;
}

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

function applyRowsGrid(root: HTMLDivElement, settings: GridSettings): void {
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

function applySquareGrid(root: HTMLDivElement, settings: GridSettings): void {
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

function renderDistributionGroup(ui: OverlayUi, settings: GridSettings): void {
  const group = ui.distributionGroup;
  group.replaceChildren();

  const options = getDistributionOptions(settings.axis);
  
  for (const { value, label } of options) {
    const iconConfig = DISTRIBUTION_ICONS[settings.axis][value];
    if (!iconConfig) continue;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'grid-ui__distribution-option';
    button.dataset.distribution = value;
    button.setAttribute('aria-pressed', String(value === settings.distribution));
    button.setAttribute('aria-label', label);

    const iconEl = createIcon(iconConfig.icon, 'grid-ui__distribution-icon', iconConfig.rotation ?? 0);
    button.appendChild(iconEl);
    
    button.addEventListener('click', () => {
      void patchSettings({ distribution: value });
    });

    group.appendChild(button);
  }
}

function renderAdjustAxisGroup(ui: OverlayUi, settings: GridSettings): void {
  for (const button of Array.from(
    ui.adjustAxisGroup.querySelectorAll<HTMLButtonElement>('.grid-ui__axis-option'),
  )) {
    const active = button.dataset.axis === settings.axis;
    button.dataset.active = String(active);
    button.setAttribute('aria-pressed', String(active));
  }
}

function updateSizeAvailability(ui: OverlayUi, settings: GridSettings): void {
  ui.sizeField.hidden = settings.distribution === 'stretch';
}

function renderController(settings: GridSettings): void {
  const ui = ensureOverlayUi();
  renderDistributionGroup(ui, settings);
  renderAdjustAxisGroup(ui, settings);
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
  ui.sizeValue.textContent = `${settings.size} ${getSizeLabel(settings.axis).toLowerCase()}`;
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

  if (settings.axis === 'grid') {
    applySquareGrid(root, settings);
  } else if (settings.axis === 'rows') {
    applyRowsGrid(root, settings);
  } else {
    applyColumnsGrid(root, settings);
  }

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
