import { DEFAULT_SETTINGS, type GridAxis, type GridSettings, normalizeSettings } from './utils';

export type GridPatternKind = 'preset' | 'variation';

export type GridPattern = {
  id: string;
  name: string;
  axis: GridAxis;
  kind: GridPatternKind;
  settings: GridSettings;
};

export type SiteGridState = {
  activePatternId: string;
  patterns: GridPattern[];
  appearance?: Pick<GridSettings, 'color' | 'opacity'>;
  session?: Pick<GridSettings, 'enabled' | 'visible' | 'toolbarX' | 'toolbarY'>;
};

export type GridStorageState = {
  version: 2;
  sites: Record<string, SiteGridState>;
};

type PresetDefinition = {
  id: string;
  name: string;
  axis: GridAxis;
  settings: Partial<GridSettings>;
};

const PRESET_DEFINITIONS: PresetDefinition[] = [
  {
    id: 'preset-columns-manuscript-1',
    name: 'Manuscript 1',
    axis: 'columns',
    settings: { count: 1, margin: 80, gutter: 0, distribution: 'stretch' },
  },
  {
    id: 'preset-columns-editorial-2',
    name: 'Editorial 2',
    axis: 'columns',
    settings: { count: 2, margin: 40, gutter: 24, distribution: 'stretch' },
  },
  {
    id: 'preset-columns-editorial-3',
    name: 'Editorial 3',
    axis: 'columns',
    settings: { count: 3, margin: 32, gutter: 24, distribution: 'stretch' },
  },
  {
    id: 'preset-columns-web-4',
    name: 'Web 4',
    axis: 'columns',
    settings: { count: 4, margin: 16, gutter: 16, distribution: 'stretch' },
  },
  {
    id: 'preset-columns-web-6',
    name: 'Web 6',
    axis: 'columns',
    settings: { count: 6, margin: 24, gutter: 20, distribution: 'stretch' },
  },
  {
    id: 'preset-columns-web-8',
    name: 'Web 8',
    axis: 'columns',
    settings: { count: 8, margin: 24, gutter: 20, distribution: 'stretch' },
  },
  {
    id: 'preset-columns-web-12',
    name: 'Web 12',
    axis: 'columns',
    settings: { count: 12, margin: 32, gutter: 24, distribution: 'stretch' },
  },
  {
    id: 'preset-rows-rhythm-4',
    name: 'Rhythm 4',
    axis: 'rows',
    settings: { count: 4, margin: 16, gutter: 0, distribution: 'stretch', size: 4 },
  },
  {
    id: 'preset-rows-rhythm-8',
    name: 'Rhythm 8',
    axis: 'rows',
    settings: { count: 8, margin: 16, gutter: 0, distribution: 'stretch', size: 8 },
  },
  {
    id: 'preset-rows-rhythm-12',
    name: 'Rhythm 12',
    axis: 'rows',
    settings: { count: 12, margin: 20, gutter: 0, distribution: 'stretch', size: 12 },
  },
  {
    id: 'preset-rows-rhythm-16',
    name: 'Rhythm 16',
    axis: 'rows',
    settings: { count: 16, margin: 24, gutter: 0, distribution: 'stretch', size: 16 },
  },
  {
    id: 'preset-rows-baseline-4',
    name: 'Baseline 4',
    axis: 'rows',
    settings: { count: 24, margin: 16, gutter: 0, distribution: 'center', size: 4 },
  },
  {
    id: 'preset-rows-baseline-8',
    name: 'Baseline 8',
    axis: 'rows',
    settings: { count: 24, margin: 24, gutter: 0, distribution: 'center', size: 8 },
  },
  {
    id: 'preset-grid-modular-4',
    name: 'Modular 4',
    axis: 'grid',
    settings: { size: 4, distribution: 'stretch' },
  },
  {
    id: 'preset-grid-modular-8',
    name: 'Modular 8',
    axis: 'grid',
    settings: { size: 8, distribution: 'stretch' },
  },
  {
    id: 'preset-grid-modular-12',
    name: 'Modular 12',
    axis: 'grid',
    settings: { size: 12, distribution: 'stretch' },
  },
  {
    id: 'preset-grid-modular-16',
    name: 'Modular 16',
    axis: 'grid',
    settings: { size: 16, distribution: 'stretch' },
  },
  {
    id: 'preset-grid-modular-24',
    name: 'Modular 24',
    axis: 'grid',
    settings: { size: 24, distribution: 'stretch' },
  },
];

function buildSettings(axis: GridAxis, settings: Partial<GridSettings>): GridSettings {
  return normalizeSettings({
    ...DEFAULT_SETTINGS,
    ...settings,
    axis,
  });
}

function createPattern(
  id: string,
  name: string,
  kind: GridPatternKind,
  settings: Partial<GridSettings>,
  axis: GridAxis = (settings.axis as GridAxis | undefined) ?? DEFAULT_SETTINGS.axis,
): GridPattern {
  const normalized = buildSettings(axis, settings);
  return {
    id,
    name,
    axis: normalized.axis,
    kind,
    settings: normalized,
  };
}

function createPresetPatterns(): GridPattern[] {
  return PRESET_DEFINITIONS.map((preset) =>
    createPattern(preset.id, preset.name, 'preset', preset.settings, preset.axis),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

const PATTERN_SETTING_KEYS = [
  'axis',
  'count',
  'color',
  'opacity',
  'distribution',
  'size',
  'margin',
  'gutter',
] as const satisfies ReadonlyArray<keyof GridSettings>;

function patternSettingsChanged(previous: GridSettings, next: GridSettings): boolean {
  return PATTERN_SETTING_KEYS.some((key) => previous[key] !== next[key]);
}

function normalizeAppearance(
  value: unknown,
): Pick<GridSettings, 'color' | 'opacity'> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  return {
    color: normalizeSettings({ ...DEFAULT_SETTINGS, color: value.color }).color,
    opacity: normalizeSettings({ ...DEFAULT_SETTINGS, opacity: value.opacity }).opacity,
  };
}

function normalizeSession(
  value: unknown,
): Pick<GridSettings, 'enabled' | 'visible' | 'toolbarX' | 'toolbarY'> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const normalized = normalizeSettings(value);
  return {
    enabled: normalized.enabled,
    visible: normalized.visible,
    toolbarX: normalized.toolbarX,
    toolbarY: normalized.toolbarY,
  };
}

function mergePresetPattern(
  pattern: GridPattern,
  siteState: SiteGridState,
): GridPattern {
  const appearance = siteState.appearance ?? {
    color: DEFAULT_SETTINGS.color,
    opacity: DEFAULT_SETTINGS.opacity,
  };
  const session: Partial<Pick<GridSettings, 'enabled' | 'visible' | 'toolbarX' | 'toolbarY'>> =
    siteState.session ?? {};

  return {
    ...pattern,
    settings: normalizeSettings({
      ...pattern.settings,
      ...appearance,
      enabled: session.enabled ?? DEFAULT_SETTINGS.enabled,
      visible: session.visible ?? DEFAULT_SETTINGS.visible,
      toolbarX: session.toolbarX ?? DEFAULT_SETTINGS.toolbarX,
      toolbarY: session.toolbarY ?? DEFAULT_SETTINGS.toolbarY,
    }),
  };
}

function getNextVariationNumber(patterns: GridPattern[]): number {
  return (
    patterns.reduce((max, pattern) => {
      const match = pattern.name.match(/^Version (\d+)$/);
      const value = match ? Number(match[1]) : 0;
      return Number.isFinite(value) ? Math.max(max, value) : max;
    }, 0) + 1
  );
}

function appendMissingPresets(patterns: GridPattern[]): GridPattern[] {
  const byId = new Map(patterns.map((pattern) => [pattern.id, pattern]));
  for (const preset of createPresetPatterns()) {
    if (!byId.has(preset.id)) {
      patterns.push(preset);
    }
  }
  return patterns;
}

function normalizePattern(value: unknown): GridPattern | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = typeof value.id === 'string' && value.id.trim() ? value.id : null;
  const name = typeof value.name === 'string' && value.name.trim() ? value.name : null;
  const kind = value.kind === 'variation' ? 'variation' : 'preset';
  const settings = normalizeSettings(value.settings);
  const axis = value.axis === 'rows' || value.axis === 'grid' ? value.axis : settings.axis;

  if (!id || !name) {
    return null;
  }

  return createPattern(id, name, kind, settings, axis);
}

function createVariationPattern(patterns: GridPattern[], settings: GridSettings): GridPattern {
  const nextNumber = getNextVariationNumber(patterns);
  return createPattern(
    `variation-${nextNumber}`,
    `Version ${nextNumber}`,
    'variation',
    settings,
    settings.axis,
  );
}

function getFirstVariation(siteState: SiteGridState): GridPattern | undefined {
  return siteState.patterns.find((pattern) => pattern.kind === 'variation');
}

function getFirstPresetForAxis(siteState: SiteGridState, axis: GridAxis): GridPattern | undefined {
  return getPatternsForAxis(siteState, axis, 'preset')[0];
}

function createSiteState(baseSettings: GridSettings): SiteGridState {
  const presets = createPresetPatterns();
  const variation = createVariationPattern(presets, baseSettings);
  return {
    activePatternId: variation.id,
    patterns: [variation, ...presets],
  };
}

function normalizeSiteState(value: unknown, fallbackSettings: GridSettings): SiteGridState {
  if (!isRecord(value)) {
    return createSiteState(fallbackSettings);
  }

  const patterns = appendMissingPresets(
    Array.isArray(value.patterns)
      ? value.patterns
          .map((pattern) => normalizePattern(pattern))
          .filter((pattern): pattern is GridPattern => pattern !== null)
      : [],
  );

  if (!patterns.some((pattern) => pattern.kind === 'variation')) {
    patterns.unshift(createVariationPattern(patterns, fallbackSettings));
  }

  const activePattern =
    (typeof value.activePatternId === 'string'
      ? patterns.find((pattern) => pattern.id === value.activePatternId)
      : null) ?? patterns.find((pattern) => pattern.kind === 'variation');

  return {
    activePatternId: activePattern?.id ?? patterns[0]!.id,
    patterns,
    appearance: normalizeAppearance(value.appearance),
    session: normalizeSession(value.session),
  };
}

export function getSiteStorageKey(hostname: string): string {
  return hostname.replace(/^www\./, '').trim().toLowerCase() || 'website';
}

export function normalizeGridStorage(value: unknown, siteKey: string): GridStorageState {
  if (!isRecord(value) || value.version !== 2 || !isRecord(value.sites)) {
    const legacySettings = normalizeSettings(value);
    return {
      version: 2,
      sites: {
        [siteKey]: createSiteState(legacySettings),
      },
    };
  }

  const sites = Object.fromEntries(
    Object.entries(value.sites).map(([key, siteValue]) => {
      const siteState = normalizeSiteState(siteValue, DEFAULT_SETTINGS);
      const activePattern = getActivePattern(siteState);
      return [key, normalizeSiteState(siteValue, activePattern.settings)];
    }),
  );

  if (!sites[siteKey]) {
    sites[siteKey] = createSiteState(DEFAULT_SETTINGS);
  }

  return {
    version: 2,
    sites,
  };
}

export function getSiteState(storage: GridStorageState, siteKey: string): SiteGridState {
  return storage.sites[siteKey] ?? createSiteState(DEFAULT_SETTINGS);
}

export function setSiteState(
  storage: GridStorageState,
  siteKey: string,
  siteState: SiteGridState,
): GridStorageState {
  return {
    ...storage,
    sites: {
      ...storage.sites,
      [siteKey]: siteState,
    },
  };
}

export function getActivePattern(siteState: SiteGridState): GridPattern {
  const pattern =
    siteState.patterns.find((entry) => entry.id === siteState.activePatternId) ??
    getFirstVariation(siteState) ??
    createVariationPattern(createPresetPatterns(), DEFAULT_SETTINGS);

  if (pattern.kind === 'preset') {
    return mergePresetPattern(pattern, siteState);
  }

  return pattern;
}

export function getPatternsForAxis(
  siteState: SiteGridState,
  axis: GridAxis,
  kind?: GridPatternKind,
): GridPattern[] {
  return siteState.patterns.filter((pattern) => {
    return pattern.axis === axis && (kind ? pattern.kind === kind : true);
  });
}

const AXIS_SORT_ORDER: Record<GridAxis, number> = {
  columns: 0,
  rows: 1,
  grid: 2,
};

function sortPatternsByAxis(patterns: GridPattern[]): GridPattern[] {
  return [...patterns].sort((left, right) => {
    const axisDelta = AXIS_SORT_ORDER[left.axis] - AXIS_SORT_ORDER[right.axis];
    if (axisDelta !== 0) {
      return axisDelta;
    }

    return left.name.localeCompare(right.name);
  });
}

export function getPatternsByKind(
  siteState: SiteGridState,
  kind: GridPatternKind,
): GridPattern[] {
  return sortPatternsByAxis(
    siteState.patterns.filter((pattern) => pattern.kind === kind),
  );
}

export function selectPattern(siteState: SiteGridState, patternId: string): SiteGridState {
  if (!siteState.patterns.some((pattern) => pattern.id === patternId)) {
    return siteState;
  }

  return {
    ...siteState,
    activePatternId: patternId,
    appearance: undefined,
    session: undefined,
  };
}

export function ensureAxisPattern(siteState: SiteGridState, axis: GridAxis): SiteGridState {
  const existingVariation = getPatternsForAxis(siteState, axis, 'variation')[0];
  if (existingVariation) {
    return selectPattern(siteState, existingVariation.id);
  }

  const template = getFirstPresetForAxis(siteState, axis)?.settings ?? { ...DEFAULT_SETTINGS, axis };
  const nextPattern = createVariationPattern(siteState.patterns, template);
  return {
    activePatternId: nextPattern.id,
    patterns: [nextPattern, ...siteState.patterns],
    appearance: undefined,
    session: undefined,
  };
}

export function updateActivePatternSettings(
  siteState: SiteGridState,
  settings: GridSettings,
): SiteGridState {
  const normalized = normalizeSettings(settings);
  const rawActive = siteState.patterns.find((pattern) => pattern.id === siteState.activePatternId);

  if (rawActive?.kind === 'preset') {
    const currentSettings = getActivePattern(siteState).settings;

    if (!patternSettingsChanged(currentSettings, normalized)) {
      return {
        ...siteState,
        session: {
          enabled: normalized.enabled,
          visible: normalized.visible,
          toolbarX: normalized.toolbarX,
          toolbarY: normalized.toolbarY,
        },
      };
    }

    const nextPattern = createVariationPattern(siteState.patterns, normalized);
    return {
      ...siteState,
      activePatternId: nextPattern.id,
      patterns: [nextPattern, ...siteState.patterns],
      appearance: undefined,
      session: undefined,
    };
  }

  const ensuredState = ensureAxisPattern(siteState, normalized.axis);
  return {
    ...ensuredState,
    activePatternId: getActivePattern(ensuredState).id,
    appearance: undefined,
    session: undefined,
    patterns: ensuredState.patterns.map((pattern) =>
      pattern.id === ensuredState.activePatternId
        ? {
            ...pattern,
            axis: normalized.axis,
            settings: normalized,
          }
        : pattern,
    ),
  };
}

export function applyPatternSelection(siteState: SiteGridState, patternId: string): SiteGridState {
  const selectedPattern = siteState.patterns.find((pattern) => pattern.id === patternId);
  if (!selectedPattern) {
    return siteState;
  }

  if (selectedPattern.kind === 'variation') {
    return selectPattern(siteState, patternId);
  }

  const currentSettings = getActivePattern(siteState).settings;

  return {
    ...siteState,
    activePatternId: patternId,
    appearance: {
      color: currentSettings.color,
      opacity: currentSettings.opacity,
    },
    session: siteState.session,
  };
}

export function createVariation(siteState: SiteGridState): SiteGridState {
  const nextPattern = createVariationPattern(siteState.patterns, getActivePattern(siteState).settings);
  return {
    activePatternId: nextPattern.id,
    patterns: [nextPattern, ...siteState.patterns],
  };
}

export function deleteVariation(
  siteState: SiteGridState,
  patternId: string,
): SiteGridState | null {
  const pattern = siteState.patterns.find((entry) => entry.id === patternId);
  if (!pattern || pattern.kind !== 'variation') {
    return null;
  }

  const axisVariations = getPatternsForAxis(siteState, pattern.axis, 'variation');
  if (axisVariations.length <= 1) {
    return null;
  }

  const fallbackVariation =
    axisVariations.find((entry) => entry.id !== patternId) ?? axisVariations[0]!;

  return {
    activePatternId:
      siteState.activePatternId === patternId ? fallbackVariation.id : siteState.activePatternId,
    patterns: siteState.patterns.filter((entry) => entry.id !== patternId),
  };
}
