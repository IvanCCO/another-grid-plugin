export const STORAGE_KEY = 'gridSettings';
export const PRESET_STORAGE_KEY = 'gridSitePresets';
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

export type GridPresetSettings = Pick<
  GridSettings,
  'axis' | 'count' | 'distribution' | 'size' | 'margin' | 'gutter'
>;

export interface GridPreset {
  id: string;
  name: string;
  axis: GridAxis;
  settings: GridPresetSettings;
}

export type GridSitePresetLibrary = Record<string, GridPreset[]>;

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
  color: '#EC6725',
  opacity: 12,
  distribution: 'stretch',
  size: 72,
  margin: 32,
  gutter: 20,
};

const PRESET_SETTING_KEYS = [
  'axis',
  'count',
  'distribution',
  'size',
  'margin',
  'gutter',
] as const;

function createPreset(
  id: string,
  name: string,
  axis: GridAxis,
  settings: Partial<GridPresetSettings>,
): GridPreset {
  return {
    id,
    name,
    axis,
    settings: getPresetSettings({
      ...DEFAULT_SETTINGS,
      ...settings,
      axis,
    }),
  };
}

export const DEFAULT_PRESETS: Record<GridAxis, GridPreset[]> = {
  columns: [
    createPreset('default-columns-manuscript-1', 'Manuscript 1', 'columns', {
      count: 1,
      margin: 64,
      gutter: 0,
    }),
    createPreset('default-columns-editorial-2', 'Editorial 2', 'columns', {
      count: 2,
      margin: 40,
      gutter: 24,
    }),
    createPreset('default-columns-editorial-3', 'Editorial 3', 'columns', {
      count: 3,
      margin: 40,
      gutter: 20,
    }),
    createPreset('default-columns-web-4', 'Web 4', 'columns', {
      count: 4,
      margin: 24,
      gutter: 16,
    }),
    createPreset('default-columns-web-6', 'Web 6', 'columns', {
      count: 6,
      margin: 24,
      gutter: 20,
    }),
    createPreset('default-columns-web-8', 'Web 8', 'columns', {
      count: 8,
      margin: 32,
      gutter: 20,
    }),
    createPreset('default-columns-web-12', 'Web 12', 'columns', {
      count: 12,
      margin: 32,
      gutter: 24,
    }),
  ],
  rows: [
    createPreset('default-rows-rhythm-4', 'Rhythm 4', 'rows', {
      count: 24,
      distribution: 'stretch',
      margin: 16,
      gutter: 4,
    }),
    createPreset('default-rows-rhythm-8', 'Rhythm 8', 'rows', {
      count: 16,
      distribution: 'stretch',
      margin: 16,
      gutter: 8,
    }),
    createPreset('default-rows-rhythm-12', 'Rhythm 12', 'rows', {
      count: 12,
      distribution: 'stretch',
      margin: 16,
      gutter: 12,
    }),
    createPreset('default-rows-rhythm-16', 'Rhythm 16', 'rows', {
      count: 10,
      distribution: 'stretch',
      margin: 16,
      gutter: 16,
    }),
    createPreset('default-rows-baseline-4', 'Baseline 4', 'rows', {
      count: 24,
      distribution: 'stretch',
      margin: 0,
      gutter: 4,
    }),
    createPreset('default-rows-baseline-8', 'Baseline 8', 'rows', {
      count: 16,
      distribution: 'stretch',
      margin: 0,
      gutter: 8,
    }),
  ],
  grid: [
    createPreset('default-grid-modular-4', 'Modular 4', 'grid', {
      count: 24,
      distribution: 'center',
      size: 4,
      margin: 24,
      gutter: 0,
    }),
    createPreset('default-grid-modular-8', 'Modular 8', 'grid', {
      count: 16,
      distribution: 'center',
      size: 8,
      margin: 24,
      gutter: 0,
    }),
    createPreset('default-grid-modular-12', 'Modular 12', 'grid', {
      count: 12,
      distribution: 'center',
      size: 12,
      margin: 24,
      gutter: 0,
    }),
    createPreset('default-grid-modular-16', 'Modular 16', 'grid', {
      count: 10,
      distribution: 'center',
      size: 16,
      margin: 24,
      gutter: 0,
    }),
    createPreset('default-grid-modular-24', 'Modular 24', 'grid', {
      count: 8,
      distribution: 'center',
      size: 24,
      margin: 24,
      gutter: 0,
    }),
  ],
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

export function getPresetSettings(settings: GridSettings): GridPresetSettings {
  return {
    axis: settings.axis,
    count: settings.count,
    distribution: settings.distribution,
    size: settings.size,
    margin: settings.margin,
    gutter: settings.gutter,
  };
}

export function applyPresetSettings(
  settings: GridSettings,
  presetSettings: GridPresetSettings,
): GridSettings {
  return normalizeSettings({
    ...settings,
    ...presetSettings,
  });
}

export function matchesPresetSettings(
  settings: GridSettings,
  presetSettings: GridPresetSettings,
): boolean {
  const current = getPresetSettings(settings);
  return PRESET_SETTING_KEYS.every((key) => current[key] === presetSettings[key]);
}

export function getDefaultPresets(axis: GridAxis): GridPreset[] {
  return DEFAULT_PRESETS[axis];
}

export function normalizePresetLibrary(value: unknown): GridSitePresetLibrary {
  if (!value || typeof value !== 'object') {
    return {};
  }

  const entries = Object.entries(value as Record<string, unknown>);
  return Object.fromEntries(
    entries.map(([siteKey, presets]) => {
      const normalized = Array.isArray(presets)
        ? presets
            .map((preset, index) => normalizePreset(siteKey, preset, index))
            .filter((preset): preset is GridPreset => preset !== null)
        : [];

      return [siteKey, normalized];
    }),
  );
}

function normalizePreset(siteKey: string, value: unknown, index: number): GridPreset | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const source = value as Partial<GridPreset> & { settings?: Partial<GridPresetSettings> };
  const name = typeof source.name === 'string' && source.name.trim() ? source.name.trim() : null;
  if (!name) {
    return null;
  }

  const settings = getPresetSettings(
    normalizeSettings({
      ...DEFAULT_SETTINGS,
      ...source.settings,
      axis: source.axis ?? source.settings?.axis ?? DEFAULT_SETTINGS.axis,
    }),
  );

  return {
    id:
      typeof source.id === 'string' && source.id.trim()
        ? source.id
        : `${siteKey}-${settings.axis}-${index + 1}`,
    name,
    axis: settings.axis,
    settings,
  };
}

export function createSitePreset(
  siteKey: string,
  name: string,
  settings: GridSettings,
): GridPreset {
  const axis = settings.axis;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'preset';

  return {
    id: `${siteKey}-${axis}-${slug}-${Date.now()}`,
    name,
    axis,
    settings: getPresetSettings(settings),
  };
}

export function getSitePresets(
  library: GridSitePresetLibrary,
  siteKey: string,
  axis: GridAxis,
): GridPreset[] {
  return (library[siteKey] ?? []).filter((preset) => preset.axis === axis);
}

export function upsertSitePreset(
  library: GridSitePresetLibrary,
  siteKey: string,
  preset: GridPreset,
): GridSitePresetLibrary {
  const nextSitePresets = [...(library[siteKey] ?? []), preset];
  return {
    ...library,
    [siteKey]: nextSitePresets,
  };
}

export function getNextSitePresetName(presets: GridPreset[]): string {
  const nextVersion = presets.reduce((max, preset) => {
    const match = preset.name.match(/^Version\s+(\d+)$/i);
    const value = match ? Number(match[1]) : 0;
    return Math.max(max, value);
  }, 0);

  return `Version ${nextVersion + 1}`;
}

export function toRgba(hex: string, opacity: number): string {
  const normalized = normalizeColor(hex);
  const match = normalized.match(/^#(..)(..)(..)$/);
  if (!match) return 'rgba(236, 103, 37, 0.12)';

  const [, red, green, blue] = match;
  return `rgba(${parseInt(red, 16)}, ${parseInt(green, 16)}, ${parseInt(blue, 16)}, ${
    clamp(opacity, MIN_OPACITY, MAX_OPACITY) / 100
  })`;
}

export function getFixedTrackSpan(settings: GridSettings): number {
  return settings.count * settings.size + (settings.count - 1) * settings.gutter;
}
