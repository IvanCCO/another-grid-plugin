import { type GridAxis, type GridDistribution, getDistributionOptions } from '../utils';

export const AXIS_OPTIONS: Array<{
  value: GridAxis;
  label: string;
  icon: string;
  rotation?: number;
}> = [
  { value: 'columns', label: 'Vertical', icon: 'measure.svg', rotation: 45 },
  { value: 'rows', label: 'Horizontal', icon: 'measure.svg', rotation: 135 },
  { value: 'grid', label: 'Grid', icon: 'grid-2x2.svg' },
];

export function getAxisOption(axis: GridAxis): (typeof AXIS_OPTIONS)[number] {
  return AXIS_OPTIONS.find((option) => option.value === axis) ?? AXIS_OPTIONS[0];
}

export const DISTRIBUTION_ICONS: Record<
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

export function getAssetUrl(filename: string): string {
  return chrome.runtime.getURL(`assets/${filename}`);
}

export function createIcon(filename: string, className: string, rotation = 0): HTMLSpanElement {
  const icon = document.createElement('span');
  icon.className = className;
  icon.style.setProperty('--grid-icon-url', `url("${getAssetUrl(filename)}")`);
  icon.style.setProperty('--grid-icon-rotation', `${rotation}deg`);
  return icon;
}

export function createButton(
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

export function updateSliderVisual(input: HTMLInputElement): void {
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

export function bindSliderField(
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

export function createSliderField(
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

export function createColorField(): {
  field: HTMLDivElement;
  colorInput: HTMLInputElement;
  opacityInput: HTMLInputElement;
  opacityValue: HTMLSpanElement;
} {
  const field = document.createElement('div');
  field.className = 'grid-ui__field grid-ui__field--slider grid-ui__field--slider--color';

  const row = document.createElement('span');
  row.className = 'grid-ui__slider-row grid-ui__slider-row--color';

  const label = document.createElement('span');
  label.className = 'grid-ui__field-label';
  label.textContent = 'Color';

  const valueGroup = document.createElement('span');
  valueGroup.className = 'grid-ui__color-value';

  const swatch = document.createElement('span');
  swatch.className = 'grid-ui__color-swatch';

  const colorInput = document.createElement('input');
  colorInput.className = 'grid-ui__color';
  colorInput.type = 'color';

  const opacityValue = document.createElement('span');
  opacityValue.className = 'grid-ui__field-value';
  opacityValue.textContent = '12%';

  const ruler = document.createElement('span');
  ruler.className = 'grid-ui__slider-ruler';
  ruler.setAttribute('aria-hidden', 'true');

  const handle = document.createElement('span');
  handle.className = 'grid-ui__slider-handle';
  handle.setAttribute('aria-hidden', 'true');

  const opacityInput = document.createElement('input');
  opacityInput.className = 'grid-ui__range';
  opacityInput.type = 'range';
  opacityInput.min = '0';
  opacityInput.max = '100';
  opacityInput.step = '1';

  swatch.appendChild(colorInput);
  valueGroup.append(swatch, opacityValue);
  row.append(label, ruler, valueGroup);
  field.append(row, handle, opacityInput);

  updateSliderVisual(opacityInput);

  return { field, colorInput, opacityInput, opacityValue };
}

export function createSection(title: string, trailing?: HTMLElement): HTMLDivElement {
  const section = document.createElement('div');
  section.className = 'grid-ui__section-copy';

  const heading = document.createElement('strong');
  heading.className = 'grid-ui__section-title';
  heading.textContent = title;

  section.append(heading, ...(trailing ? [trailing] : []));
  return section;
}

export function createLayoutColumn(title: string, controls: HTMLElement): HTMLDivElement {
  const column = document.createElement('div');
  column.className = 'grid-ui__layout-column';

  const heading = document.createElement('strong');
  heading.className = 'grid-ui__section-title';
  heading.textContent = title;

  column.append(heading, controls);
  return column;
}

export function createAxisGroup(): HTMLDivElement {
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

export function createDistributionGroup(): HTMLDivElement {
  const group = document.createElement('div');
  group.className = 'grid-ui__distribution-group';
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', 'Distribution type');

  return group;
}

export function createPopoverHeader(): {
  header: HTMLDivElement;
  badge: HTMLSpanElement;
  icon: HTMLImageElement;
  fallback: HTMLSpanElement;
  title: HTMLElement;
} {
  const header = document.createElement('div');
  header.className = 'grid-ui__popover-header';

  const badge = document.createElement('span');
  badge.className = 'grid-ui__site-badge';
  badge.dataset.iconState = 'fallback';

  const icon = document.createElement('img');
  icon.className = 'grid-ui__site-icon';
  icon.alt = '';
  icon.decoding = 'async';

  const fallback = document.createElement('span');
  fallback.className = 'grid-ui__site-fallback';

  icon.addEventListener('load', () => {
    if (icon.currentSrc) {
      badge.dataset.iconState = 'loaded';
    }
  });

  icon.addEventListener('error', () => {
    badge.dataset.iconState = 'fallback';
    icon.removeAttribute('src');
  });

  badge.append(icon, fallback);

  const heading = document.createElement('strong');
  heading.className = 'grid-ui__popover-title';
  heading.textContent = 'Website';

  header.append(badge, heading);
  return { header, badge, icon, fallback, title: heading };
}

export function renderDistributionGroup(
  group: HTMLDivElement,
  axis: GridAxis,
  distribution: GridDistribution,
  onSelect: (value: GridDistribution) => void,
): void {
  group.replaceChildren();

  const options = getDistributionOptions(axis);

  for (const { value, label } of options) {
    const iconConfig = DISTRIBUTION_ICONS[axis][value];
    if (!iconConfig) continue;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'grid-ui__distribution-option';
    button.dataset.distribution = value;
    button.setAttribute('aria-pressed', String(value === distribution));
    button.setAttribute('aria-label', label);

    const iconEl = createIcon(
      iconConfig.icon,
      'grid-ui__distribution-icon',
      iconConfig.rotation ?? 0,
    );
    button.appendChild(iconEl);

    button.addEventListener('click', () => {
      onSelect(value);
    });

    group.appendChild(button);
  }
}

export function renderAxisGroup(group: HTMLDivElement, axis: GridAxis): void {
  for (const button of Array.from(
    group.querySelectorAll<HTMLButtonElement>('.grid-ui__axis-option'),
  )) {
    const active = button.dataset.axis === axis;
    button.dataset.active = String(active);
    button.setAttribute('aria-pressed', String(active));
  }
}
