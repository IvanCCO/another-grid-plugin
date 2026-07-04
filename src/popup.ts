import {
  DEFAULT_SETTINGS,
  getAxisLabel,
  GRID_MESSAGE_TYPE,
  STORAGE_KEY,
  type GridAxis,
  type GridSettings,
  getDistributionOptions,
  getSizeLabel,
  normalizeSettings,
} from './utils';

const enabledInput = document.getElementById('enabled') as HTMLInputElement;
const axisInput = document.getElementById('axis') as HTMLSelectElement;
const axisPicker = document.getElementById('axis-picker') as HTMLDivElement;
const countInput = document.getElementById('count') as HTMLInputElement;
const countValue = document.getElementById('count-value') as HTMLOutputElement;
const colorInput = document.getElementById('color') as HTMLInputElement;
const opacityInput = document.getElementById('opacity') as HTMLInputElement;
const distributionInput = document.getElementById(
  'distribution',
) as HTMLSelectElement;
const sizeInput = document.getElementById('size') as HTMLInputElement;
const marginInput = document.getElementById('margin') as HTMLInputElement;
const marginValue = document.getElementById('margin-value') as HTMLOutputElement;
const gutterInput = document.getElementById('gutter') as HTMLInputElement;
const gutterValue = document.getElementById('gutter-value') as HTMLOutputElement;
const sizeLabel = document.querySelector(
  '[data-size-label]',
) as HTMLSpanElement;
const sizeHint = document.querySelector('[data-size-hint]') as HTMLSpanElement;
const statusEl = document.getElementById('status') as HTMLParagraphElement;
const PERSIST_DELAY_MS = 250;
let persistTimer: number | null = null;

const AXIS_OPTIONS: Array<{
  value: GridAxis;
  label: string;
  icon: string;
  rotation?: string;
}> = [
  { value: 'columns', label: 'Vertical', icon: 'assets/measure.svg', rotation: '90deg' },
  { value: 'rows', label: 'Horizontal', icon: 'assets/measure.svg', rotation: '180deg' },
  { value: 'grid', label: 'Grid', icon: 'assets/grid.svg' },
];

function setStatus(settings: GridSettings): void {
  if (!settings.enabled) {
    statusEl.textContent = 'Overlay paused on the current page.';
    return;
  }

  const sizeWord =
    settings.axis === 'rows'
      ? 'height'
      : settings.axis === 'grid'
        ? 'cell'
        : 'width';
  const autoOrValue =
    settings.distribution === 'stretch'
      ? 'auto'
      : `${settings.size}px ${sizeWord}`;

  statusEl.textContent = `${getAxisLabel(settings.axis)} · ${settings.count} tracks · ${settings.distribution} · ${autoOrValue}`;
}

function renderAxisOptions(selected: GridAxis): void {
  axisPicker.replaceChildren(
    ...AXIS_OPTIONS.map(({ value, label, icon, rotation }) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'axis-option';
      button.dataset.axis = value;
      button.setAttribute('role', 'radio');
      button.setAttribute('aria-checked', String(value === selected));
      button.setAttribute('aria-label', label);
      button.dataset.selected = String(value === selected);

      const iconEl = document.createElement('span');
      iconEl.className = 'axis-option-icon';
      iconEl.style.setProperty('--icon-url', `url("${icon}")`);
      iconEl.style.setProperty('--icon-rotation', rotation ?? '0deg');

      const textEl = document.createElement('span');
      textEl.className = 'axis-option-label';
      textEl.textContent = label;

      button.append(iconEl, textEl);
      return button;
    }),
  );
}

function renderDistributionOptions(axis: GridAxis, selected: string): void {
  distributionInput.replaceChildren(
    ...getDistributionOptions(axis).map(({ value, label }) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      option.selected = value === selected;
      return option;
    }),
  );
}

function renderSlider(input: HTMLInputElement, output: HTMLOutputElement): void {
  const min = Number(input.min || 0);
  const max = Number(input.max || 100);
  const value = Number(input.value || min);
  const percent = max === min ? 0 : ((value - min) / (max - min)) * 100;

  const shell = input.closest('[data-slider-shell]') as HTMLElement | null;
  shell?.style.setProperty('--slider-fill', `${percent}%`);
  output.value = String(value);
  output.textContent = String(value);
}

function render(settings: GridSettings): void {
  enabledInput.checked = settings.enabled;
  axisInput.value = settings.axis;
  renderAxisOptions(settings.axis);
  countInput.value = String(settings.count);
  colorInput.value = settings.color;
  opacityInput.value = String(settings.opacity);
  marginInput.value = String(settings.margin);
  gutterInput.value = String(settings.gutter);
  sizeInput.value = String(settings.size);

  renderDistributionOptions(settings.axis, settings.distribution);

  const isStretch = settings.distribution === 'stretch';
  sizeInput.disabled = isStretch;
  sizeLabel.textContent = getSizeLabel(settings.axis);
  sizeHint.textContent = isStretch ? 'Auto in stretch mode' : 'Fixed track size';
  renderSlider(countInput, countValue);
  renderSlider(marginInput, marginValue);
  renderSlider(gutterInput, gutterValue);
  setStatus(settings);
}

function readForm(): GridSettings {
  return normalizeSettings({
    enabled: enabledInput.checked,
    axis: axisInput.value,
    count: countInput.value,
    color: colorInput.value,
    opacity: opacityInput.value,
    distribution: distributionInput.value,
    size: sizeInput.value,
    margin: marginInput.value,
    gutter: gutterInput.value,
  });
}

async function notifyActiveTab(settings: GridSettings): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id == null) return;

  chrome.tabs
    .sendMessage(tab.id, { type: GRID_MESSAGE_TYPE, settings })
    .catch(() => undefined);
}

async function persistSettings(settings: GridSettings): Promise<void> {
  await chrome.storage.sync.set({ [STORAGE_KEY]: settings });
}

function schedulePersist(settings: GridSettings): void {
  if (persistTimer != null) {
    window.clearTimeout(persistTimer);
  }

  persistTimer = window.setTimeout(() => {
    persistTimer = null;
    void persistSettings(settings).catch(() => undefined);
  }, PERSIST_DELAY_MS);
}

async function persistAndBroadcast(immediate = false): Promise<void> {
  const settings = readForm();
  render(settings);
  await notifyActiveTab(settings);

  if (immediate) {
    if (persistTimer != null) {
      window.clearTimeout(persistTimer);
      persistTimer = null;
    }
    await persistSettings(settings);
    return;
  }

  schedulePersist(settings);
}

async function persistAxisChange(): Promise<void> {
  const settings = normalizeSettings({
    ...readForm(),
    distribution: DEFAULT_SETTINGS.distribution,
  });

  render(settings);
  await notifyActiveTab(settings);
  await persistSettings(settings);
}

function bindForm(): void {
  const controls = [
    countInput,
    colorInput,
    opacityInput,
    sizeInput,
    marginInput,
    gutterInput,
  ];

  for (const control of controls) {
    control.addEventListener('input', () => {
      void persistAndBroadcast();
    });
  }

  [enabledInput, distributionInput].forEach((control) => {
    control.addEventListener('change', () => {
      void persistAndBroadcast(true);
    });
  });

  axisInput.addEventListener('change', () => {
    void persistAxisChange();
  });

  axisPicker.addEventListener('click', (event) => {
    const target = event.target as HTMLElement | null;
    const button = target?.closest<HTMLButtonElement>('[data-axis]');
    if (!button) {
      return;
    }

    const axis = button.dataset.axis as GridAxis;
    if (axisInput.value === axis) {
      return;
    }

    axisInput.value = axis;
    void persistAxisChange();
  });
}

window.addEventListener('beforeunload', () => {
  if (persistTimer == null) {
    return;
  }

  window.clearTimeout(persistTimer);
  persistTimer = null;
  void persistSettings(readForm()).catch(() => undefined);
});

chrome.storage.sync.get({ [STORAGE_KEY]: DEFAULT_SETTINGS }, (result) => {
  render(normalizeSettings(result[STORAGE_KEY]));
});

bindForm();
