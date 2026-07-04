export const STORAGE_KEY = 'gridSettings';
export const GRID_OVERLAY_ID = 'grid-systems-overlay';
export const GRID_MESSAGE_TYPE = 'GRID_SETTINGS_UPDATED';

export type GridAxis = 'columns' | 'rows' | 'grid';
export type GridDistribution =
  | 'stretch'
  | 'center'
  | 'left'
  | 'right'
  | 'top'
  | 'bottom';

export interface GridSettings {
  enabled: boolean;
  visible: boolean;
  toolbarX: number | null;
  toolbarY: number | null;
  axis: GridAxis;
  count: number;
  color: string;
  opacity: number;
  distribution: GridDistribution;
  size: number;
  margin: number;
  gutter: number;
}

const MIN_COUNT = 1;
const MAX_COUNT = 24;
const MIN_OPACITY = 0;
const MAX_OPACITY = 100;
const MIN_SIZE = 1;
const MAX_SIZE = 400;
const MIN_SPACING = 0;
const MAX_SPACING = 240;

export const DEFAULT_SETTINGS: GridSettings = {
  enabled: true,
  visible: true,
  toolbarX: null,
  toolbarY: null,
  axis: 'columns',
  count: 6,
  color: '#FF3B30',
  opacity: 12,
  distribution: 'stretch',
  size: 72,
  margin: 32,
  gutter: 20,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function parseNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function normalizeNullableNumber(value: unknown): number | null {
  if (value == null || value === '') {
    return null;
  }

  const parsed = parseNumber(value, Number.NaN);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeColor(value: unknown): string {
  if (typeof value !== 'string') {
    return DEFAULT_SETTINGS.color;
  }

  const normalized = value.trim().toUpperCase();
  return /^#[0-9A-F]{6}$/.test(normalized) ? normalized : DEFAULT_SETTINGS.color;
}

function normalizeAxis(value: unknown): GridAxis {
  if (value === 'rows' || value === 'grid') {
    return value;
  }

  return 'columns';
}

function normalizeDistribution(
  value: unknown,
  axis: GridAxis,
): GridDistribution {
  const allowed = getDistributionOptions(axis).map(({ value }) => value);
  return allowed.includes(value as GridDistribution)
    ? (value as GridDistribution)
    : DEFAULT_SETTINGS.distribution;
}

export function getDistributionOptions(
  axis: GridAxis,
): Array<{ value: GridDistribution; label: string }> {
  if (axis === 'grid') {
    return [
      { value: 'stretch', label: 'Stretch' },
      { value: 'center', label: 'Center' },
    ];
  }

  if (axis === 'rows') {
    return [
      { value: 'stretch', label: 'Stretch' },
      { value: 'center', label: 'Center' },
      { value: 'top', label: 'Top' },
      { value: 'bottom', label: 'Bottom' },
    ];
  }

  return [
    { value: 'stretch', label: 'Stretch' },
    { value: 'center', label: 'Center' },
    { value: 'left', label: 'Left' },
    { value: 'right', label: 'Right' },
  ];
}

export function getSizeLabel(axis: GridAxis): string {
  if (axis === 'rows') {
    return 'Height';
  }

  if (axis === 'grid') {
    return 'Cell';
  }

  return 'Width';
}

export function getAxisLabel(axis: GridAxis): string {
  if (axis === 'rows') {
    return 'horizontal';
  }

  if (axis === 'grid') {
    return 'grid';
  }

  return 'vertical';
}

export function normalizeSettings(value: unknown): GridSettings {
  const source =
    value != null && typeof value === 'object'
      ? (value as Partial<GridSettings>)
      : {};

  const axis = normalizeAxis(source.axis);

  return {
    enabled:
      typeof source.enabled === 'boolean'
        ? source.enabled
        : DEFAULT_SETTINGS.enabled,
    visible:
      typeof source.visible === 'boolean'
        ? source.visible
        : DEFAULT_SETTINGS.visible,
    toolbarX: normalizeNullableNumber(source.toolbarX),
    toolbarY: normalizeNullableNumber(source.toolbarY),
    axis,
    count: clamp(
      Math.round(parseNumber(source.count, DEFAULT_SETTINGS.count)),
      MIN_COUNT,
      MAX_COUNT,
    ),
    color: normalizeColor(source.color),
    opacity: clamp(
      Math.round(parseNumber(source.opacity, DEFAULT_SETTINGS.opacity)),
      MIN_OPACITY,
      MAX_OPACITY,
    ),
    distribution: normalizeDistribution(source.distribution, axis),
    size: clamp(
      Math.round(parseNumber(source.size, DEFAULT_SETTINGS.size)),
      MIN_SIZE,
      MAX_SIZE,
    ),
    margin: clamp(
      Math.round(parseNumber(source.margin, DEFAULT_SETTINGS.margin)),
      MIN_SPACING,
      MAX_SPACING,
    ),
    gutter: clamp(
      Math.round(parseNumber(source.gutter, DEFAULT_SETTINGS.gutter)),
      MIN_SPACING,
      MAX_SPACING,
    ),
  };
}

export function toRgba(hex: string, opacity: number): string {
  const normalized = normalizeColor(hex);
  const match = normalized.match(/^#(..)(..)(..)$/);
  if (!match) return 'rgba(255, 59, 48, 0.12)';

  const [, red, green, blue] = match;
  return `rgba(${parseInt(red, 16)}, ${parseInt(green, 16)}, ${parseInt(blue, 16)}, ${
    clamp(opacity, MIN_OPACITY, MAX_OPACITY) / 100
  })`;
}

export function getFixedTrackSpan(settings: GridSettings): number {
  return settings.count * settings.size + (settings.count - 1) * settings.gutter;
}
