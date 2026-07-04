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
  axisMenu: HTMLDivElement;
  adjustTrigger: HTMLButtonElement;
  adjustPopover: HTMLDivElement;
  closeTrigger: HTMLButtonElement;
  countValue: HTMLSpanElement;
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
  distributionSelect: HTMLSelectElement;
};

const AXIS_OPTIONS: Array<{
  value: GridAxis;
  label: string;
  icon: string;
  rotation?: number;
}> = [
  { value: 'columns', label: 'Vertical', icon: 'measure.svg', rotation: 90 },
  { value: 'rows', label: 'Horizontal', icon: 'measure.svg', rotation: 180 },
  { value: 'grid', label: 'Grid', icon: 'grid.svg' },
];

let overlayUi: OverlayUi | null = null;
let currentSettings = DEFAULT_SETTINGS;
let resizeFrame = 0;
let activePopover: 'axis' | 'adjust' | null = null;
let isDocumentEventsBound = false;
const PERSIST_DELAY_MS = 250;
let persistTimer = 0;

function getAssetUrl(filename: string): string {
  return chrome.runtime.getURL(`assets/${filename}`);
}

function removeOverlay(): void {
  overlayUi?.root.remove();
  overlayUi = null;
  activePopover = null;
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
  field.className = 'grid-ui__field';

  const row = document.createElement('span');
  row.className = 'grid-ui__field-row';

  const title = document.createElement('span');
  title.className = 'grid-ui__field-label';
  title.textContent = label;

  const valueEl = document.createElement('span');
  valueEl.className = 'grid-ui__field-value';
  valueEl.textContent = String(value);

  row.append(title, valueEl);

  const input = document.createElement('input');
  input.className = 'grid-ui__range';
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = '1';
  input.value = String(value);

  field.append(row, input);
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

function createSection(title: string, subtitle: string): HTMLDivElement {
  const section = document.createElement('div');
  section.className = 'grid-ui__section-copy';

  const heading = document.createElement('strong');
  heading.className = 'grid-ui__section-title';
  heading.textContent = title;

  const text = document.createElement('span');
  text.className = 'grid-ui__section-subtitle';
  text.textContent = subtitle;

  section.append(heading, text);
  return section;
}

function createDivider(): HTMLDivElement {
  const divider = document.createElement('div');
  divider.className = 'grid-ui__divider';
  divider.setAttribute('aria-hidden', 'true');
  return divider;
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
    'Change grid orientation',
    createIcon('grid.svg', 'grid-ui__button-icon'),
    'grid-ui__button--primary',
  );
  axisTrigger.classList.add('grid-ui__anchor', 'grid-ui__anchor--start');
  axisTrigger.setAttribute('aria-haspopup', 'menu');
  axisTrigger.setAttribute('aria-expanded', 'false');

  const axisTriggerIcon = axisTrigger.firstChild as HTMLSpanElement;

  const adjustTrigger = createButton(
    'Adjust grid settings',
    createIcon('dimension.svg', 'grid-ui__button-icon'),
  );
  adjustTrigger.classList.add('grid-ui__anchor', 'grid-ui__anchor--center');
  adjustTrigger.setAttribute('aria-haspopup', 'dialog');
  adjustTrigger.setAttribute('aria-expanded', 'false');

  const closeTrigger = document.createElement('button');
  closeTrigger.type = 'button';
  closeTrigger.className = 'grid-ui__close';
  closeTrigger.setAttribute('aria-label', 'Disable grid overlay');
  closeTrigger.textContent = '×';

  const axisMenu = document.createElement('div');
  axisMenu.className = 'grid-ui__popover grid-ui__popover--menu';
  axisMenu.dataset.popover = 'axis';
  axisMenu.setAttribute('role', 'menu');

  const adjustPopover = document.createElement('div');
  adjustPopover.className = 'grid-ui__popover';
  adjustPopover.dataset.popover = 'adjust';

  const countField = createSliderField('Count', 1, 24, DEFAULT_SETTINGS.count);
  const sizeField = createSliderField('Width', 1, 400, DEFAULT_SETTINGS.size);
  const marginField = createSliderField('Margin', 0, 240, DEFAULT_SETTINGS.margin);
  const gutterField = createSliderField('Gutter', 0, 240, DEFAULT_SETTINGS.gutter);

  const distributionField = createSelectField('Distribution');
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
    createPopoverHeader('Adjust grid', 'Density, spacing and appearance'),
    createSection('Density', 'Quick sizing controls'),
    countField.field,
    sizeField.field,
    marginField.field,
    gutterField.field,
    createDivider(),
    createSection('Appearance', 'Layout and color'),
    distributionField.field,
    colorField.field,
    generalActions,
  );

  controller.append(axisTrigger, adjustTrigger, closeTrigger);
  root.append(gridLayer, controller, axisMenu, adjustPopover);
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
    togglePopover('axis');
  });

  adjustTrigger.addEventListener('click', () => {
    togglePopover('adjust');
  });

  closeTrigger.addEventListener('click', () => {
    void applySettings(
      { ...currentSettings, enabled: false },
      { immediatePersist: true },
    );
  });

  bindSliderField(countField.input, countField.valueEl, (value) => {
    void patchSettings({ count: value });
  });
  bindSliderField(sizeField.input, sizeField.valueEl, (value) => {
    void patchSettings({ size: value });
  });
  bindSliderField(marginField.input, marginField.valueEl, (value) => {
    void patchSettings({ margin: value });
  });
  bindSliderField(gutterField.input, gutterField.valueEl, (value) => {
    void patchSettings({ gutter: value });
  });

  distributionField.select.addEventListener('change', () => {
    void patchSettings({
      distribution: distributionField.select.value as GridDistribution,
    });
  });

  colorField.colorInput.addEventListener('input', () => {
    void patchSettings({ color: colorField.colorInput.value });
  });

  bindSliderField(colorField.opacityInput, colorField.opacityValue, (value) => {
    colorField.opacityValue.textContent = `${value}%`;
    void patchSettings({ opacity: value });
  }, true);

  overlayUi = {
    root,
    gridLayer,
    controller,
    axisTrigger,
    axisTriggerIcon,
    axisMenu,
    adjustTrigger,
    adjustPopover,
    closeTrigger,
    countValue: countField.valueEl,
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
    distributionSelect: distributionField.select,
  };

  return overlayUi;
}

function createPopoverHeader(title: string, subtitle: string): HTMLDivElement {
  const header = document.createElement('div');
  header.className = 'grid-ui__popover-header';

  const heading = document.createElement('strong');
  heading.className = 'grid-ui__popover-title';
  heading.textContent = title;

  const text = document.createElement('span');
  text.className = 'grid-ui__popover-subtitle';
  text.textContent = subtitle;

  header.append(heading, text);
  return header;
}

function bindSliderField(
  input: HTMLInputElement,
  output: HTMLElement,
  onChange: (value: number) => void,
  suffixOnly = false,
): void {
  input.addEventListener('input', () => {
    const value = Number(input.value);
    output.textContent = suffixOnly ? `${value}%` : String(value);
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
    ['axis', ui.axisMenu, ui.axisTrigger],
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
  const width = 304;
  const gap = 10;
  const viewportPadding = 12;

  let left = rect.right - width;
  let originX = '100%';

  if (name === 'axis') {
    left = rect.left;
    originX = '0%';
  } else if (name === 'adjust') {
    left = rect.left + rect.width / 2 - width / 2;
    originX = '50%';
  }

  const clampedLeft = Math.min(
    Math.max(left, viewportPadding),
    window.innerWidth - width - viewportPadding,
  );

  popover.style.top = `${rect.bottom + gap}px`;
  popover.style.left = `${clampedLeft}px`;
  popover.style.transformOrigin = `${originX} 0%`;
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

function renderAxisMenu(ui: OverlayUi, settings: GridSettings): void {
  ui.axisMenu.replaceChildren(
    createPopoverHeader('Grid mode', 'Quiet controls, fast switching'),
    ...AXIS_OPTIONS.map(({ value, label, icon, rotation }) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'grid-ui__menu-item';
      button.dataset.active = String(settings.axis === value);

      const iconEl = createIcon(icon, 'grid-ui__menu-icon', rotation ?? 0);
      const textWrap = document.createElement('span');
      textWrap.className = 'grid-ui__menu-copy';

      const title = document.createElement('span');
      title.className = 'grid-ui__menu-title';
      title.textContent = label;

      const hint = document.createElement('span');
      hint.className = 'grid-ui__menu-hint';
      hint.textContent =
        value === 'columns'
          ? 'Measure by columns'
          : value === 'rows'
            ? 'Measure by rows'
            : 'Square overlay';

      textWrap.append(title, hint);
      button.append(iconEl, textWrap);

      button.addEventListener('click', () => {
        void patchSettings({
          axis: value,
          distribution: value === settings.axis ? settings.distribution : DEFAULT_SETTINGS.distribution,
        });
        setActivePopover(null);
      });

      return button;
    }),
  );
}

function renderDistributionOptions(
  select: HTMLSelectElement,
  settings: GridSettings,
): void {
  select.replaceChildren(
    ...getDistributionOptions(settings.axis).map(({ value, label }) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      option.selected = value === settings.distribution;
      return option;
    }),
  );
}

function renderController(settings: GridSettings): void {
  const ui = ensureOverlayUi();
  renderAxisMenu(ui, settings);
  renderDistributionOptions(ui.distributionSelect, settings);

  const axisMeta = AXIS_OPTIONS.find((option) => option.value === settings.axis) ?? AXIS_OPTIONS[0];
  ui.axisTriggerIcon.style.setProperty(
    '--grid-icon-url',
    `url("${getAssetUrl(axisMeta.icon)}")`,
  );
  ui.axisTriggerIcon.style.setProperty(
    '--grid-icon-rotation',
    `${axisMeta.rotation ?? 0}deg`,
  );

  ui.countRange.value = String(settings.count);
  ui.sizeRange.value = String(settings.size);
  ui.marginRange.value = String(settings.margin);
  ui.gutterRange.value = String(settings.gutter);
  ui.colorInput.value = settings.color;
  ui.opacityRange.value = String(settings.opacity);
  ui.countValue.textContent = String(settings.count);
  ui.sizeLabel.textContent = getSizeLabel(settings.axis);
  ui.sizeValue.textContent = `${settings.size} ${getSizeLabel(settings.axis).toLowerCase()}`;
  ui.marginValue.textContent = String(settings.margin);
  ui.gutterValue.textContent = String(settings.gutter);
  ui.opacityValue.textContent = `${settings.opacity}%`;
}

function renderOverlay(settings: GridSettings): void {
  if (!settings.enabled) {
    removeOverlay();
    return;
  }

  const ui = ensureOverlayUi();
  const root = ui.gridLayer;
  root.replaceChildren();

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
