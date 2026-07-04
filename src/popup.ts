import {
  DEFAULT_SETTINGS,
  GRID_MESSAGE_TYPE,
  STORAGE_KEY,
  type GridAxis,
  type GridSettings,
  getDistributionOptions,
  normalizeSettings,
} from './utils';

const enabledToggle = document.getElementById(
  'enabled-toggle',
) as HTMLButtonElement;
const quickAxisButton = document.getElementById(
  'quick-axis',
) as HTMLButtonElement;
const quickAxisIcon = document.getElementById(
  'quick-axis-icon',
) as HTMLSpanElement;
const quickAxisLabel = document.getElementById(
  'quick-axis-label',
) as HTMLSpanElement;
const advancedToggle = document.getElementById(
  'advanced-toggle',
) as HTMLButtonElement;
const advancedPanel = document.getElementById('advanced-panel') as HTMLDivElement;

const axisPicker = document.getElementById('axis-picker') as HTMLDivElement;
const axisInput = document.getElementById('axis') as HTMLSelectElement;
const distributionInput = document.getElementById(
  'distribution',
) as HTMLSelectElement;
const countInput = document.getElementById('count') as HTMLInputElement;
const countValue = document.getElementById('count-value') as HTMLOutputElement;
const sizeField = document.getElementById('size-field') as HTMLLabelElement;
const sizeInput = document.getElementById('size') as HTMLInputElement;
const sizeValue = document.getElementById('size-value') as HTMLOutputElement;
const marginInput = document.getElementById('margin') as HTMLInputElement;
const marginValue = document.getElementById('margin-value') as HTMLOutputElement;
const gutterInput = document.getElementById('gutter') as HTMLInputElement;
const gutterValue = document.getElementById('gutter-value') as HTMLOutputElement;
const colorInput = document.getElementById('color') as HTMLInputElement;
const opacityInput = document.getElementById('opacity') as HTMLInputElement;
const opacityValue = document.getElementById('opacity-value') as HTMLOutputElement;

const PERSIST_DELAY_MS = 250;

const AXIS_OPTIONS: Array<{
  value: GridAxis;
  label: string;
  icon: string;
  rotation?: string;
}> = [
  {
    value: 'columns',
    label: 'Vertical',
    icon: 'assets/measure.svg',
    rotation: '45deg',
  },
  {
    value: 'rows',
    label: 'Horizontal',
    icon: 'assets/measure.svg',
    rotation: '135deg',
  },
  { value: 'grid', label: 'Grid', icon: 'assets/grid.svg' },
];

let currentSettings = DEFAULT_SETTINGS;
let isAdvancedOpen = false;
let persistTimer: number | null = null;
let currentTabUrl = '';

function isSupportedTabUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function notifyActiveTab(settings: GridSettings): Promise<void> {
  const tab = await getActiveTab();
  currentTabUrl = tab?.url ?? '';

  if (tab?.id == null || !isSupportedTabUrl(currentTabUrl)) {
    return;
  }

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

function setAdvancedOpen(next: boolean): void {
  isAdvancedOpen = next;
  advancedPanel.hidden = !next;
  advancedToggle.dataset.open = String(next);
  advancedToggle.setAttribute('aria-expanded', String(next));
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

function renderAxisPicker(selected: GridAxis): void {
  axisPicker.replaceChildren(
    ...AXIS_OPTIONS.map(({ value, label, icon, rotation }) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'axis-option';
      button.dataset.axis = value;
      button.dataset.selected = String(value === selected);
      button.setAttribute('aria-label', label);

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

function render(settings: GridSettings): void {
  currentSettings = settings;
  const isStretch = settings.distribution === 'stretch';

  const axisMeta =
    AXIS_OPTIONS.find((option) => option.value === settings.axis) ?? AXIS_OPTIONS[0];

  enabledToggle.dataset.enabled = String(settings.enabled);
  enabledToggle.setAttribute('aria-pressed', String(settings.enabled));
  enabledToggle.title = settings.enabled ? 'Disable overlay' : 'Enable overlay';

  quickAxisLabel.textContent = axisMeta.label;
  quickAxisIcon.style.setProperty('--icon-url', `url("${axisMeta.icon}")`);
  quickAxisIcon.style.setProperty('--icon-rotation', axisMeta.rotation ?? '0deg');

  axisInput.value = settings.axis;
  renderAxisPicker(settings.axis);
  renderDistributionOptions(settings.axis, settings.distribution);

  countInput.value = String(settings.count);
  countValue.textContent = String(settings.count);
  sizeField.hidden = isStretch;
  sizeInput.value = String(settings.size);
  sizeValue.textContent = String(settings.size);
  marginInput.value = String(settings.margin);
  marginValue.textContent = String(settings.margin);
  gutterInput.value = String(settings.gutter);
  gutterValue.textContent = String(settings.gutter);
  colorInput.value = settings.color;
  opacityInput.value = String(settings.opacity);
  opacityValue.textContent = `${settings.opacity}%`;
}

function readForm(): GridSettings {
  return normalizeSettings({
    ...currentSettings,
    axis: axisInput.value,
    distribution: distributionInput.value,
    count: countInput.value,
    size: sizeInput.value,
    margin: marginInput.value,
    gutter: gutterInput.value,
    color: colorInput.value,
    opacity: opacityInput.value,
  });
}

async function applySettings(
  nextSettings: GridSettings,
  options: { immediatePersist?: boolean } = {},
): Promise<void> {
  const settings = normalizeSettings(nextSettings);
  render(settings);
  await notifyActiveTab(settings);

  if (options.immediatePersist) {
    if (persistTimer != null) {
      window.clearTimeout(persistTimer);
      persistTimer = null;
    }
    await persistSettings(settings);
    return;
  }

  schedulePersist(settings);
}

async function toggleEnabled(): Promise<void> {
  await applySettings(
    {
      ...currentSettings,
      enabled: !currentSettings.enabled,
    },
    { immediatePersist: true },
  );
}

async function cycleAxis(): Promise<void> {
  const currentIndex = AXIS_OPTIONS.findIndex(
    (option) => option.value === currentSettings.axis,
  );
  const nextAxis = AXIS_OPTIONS[(currentIndex + 1) % AXIS_OPTIONS.length]?.value ?? 'columns';

  await applySettings(
    {
      ...currentSettings,
      axis: nextAxis,
      distribution: DEFAULT_SETTINGS.distribution,
    },
    { immediatePersist: true },
  );
}

function bindSlider(
  input: HTMLInputElement,
  output: HTMLOutputElement,
  formatter: (value: number) => string = (value) => String(value),
): void {
  input.addEventListener('input', () => {
    output.textContent = formatter(Number(input.value));
    void applySettings(readForm());
  });
}

function bindForm(): void {
  enabledToggle.addEventListener('click', () => {
    void toggleEnabled();
  });

  quickAxisButton.addEventListener('click', () => {
    void cycleAxis();
  });

  advancedToggle.addEventListener('click', () => {
    setAdvancedOpen(!isAdvancedOpen);
  });

  axisPicker.addEventListener('click', (event) => {
    const target = event.target as HTMLElement | null;
    const button = target?.closest<HTMLButtonElement>('[data-axis]');
    if (!button) {
      return;
    }

    axisInput.value = button.dataset.axis as GridAxis;
    distributionInput.value = DEFAULT_SETTINGS.distribution;
    void applySettings(readForm(), { immediatePersist: true });
  });

  distributionInput.addEventListener('change', () => {
    void applySettings(readForm(), { immediatePersist: true });
  });

  colorInput.addEventListener('input', () => {
    void applySettings(readForm());
  });

  bindSlider(countInput, countValue);
  bindSlider(sizeInput, sizeValue);
  bindSlider(marginInput, marginValue);
  bindSlider(gutterInput, gutterValue);
  bindSlider(opacityInput, opacityValue, (value) => `${value}%`);
}

window.addEventListener('beforeunload', () => {
  if (persistTimer == null) {
    return;
  }

  window.clearTimeout(persistTimer);
  persistTimer = null;
  void persistSettings(readForm()).catch(() => undefined);
});

async function init(): Promise<void> {
  const tab = await getActiveTab();
  currentTabUrl = tab?.url ?? '';

  chrome.storage.sync.get({ [STORAGE_KEY]: DEFAULT_SETTINGS }, (result) => {
    render(normalizeSettings(result[STORAGE_KEY]));
  });

  setAdvancedOpen(false);
  bindForm();
}

void init();
