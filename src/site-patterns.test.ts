import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from './utils';
import {
  applyPatternSelection,
  ensureAxisPattern,
  getActivePattern,
  getPatternsForAxis,
  getSiteState,
  normalizeGridStorage,
} from './site-patterns';

const SITE_KEY = 'acme.com';

describe('site patterns', () => {
  it('creates a variation for the selected axis instead of activating a preset directly', () => {
    const storage = normalizeGridStorage(DEFAULT_SETTINGS, SITE_KEY);
    const siteState = getSiteState(storage, SITE_KEY);

    const nextState = ensureAxisPattern(siteState, 'rows');
    const activePattern = getActivePattern(nextState);

    expect(activePattern.kind).toBe('variation');
    expect(activePattern.axis).toBe('rows');
    expect(getPatternsForAxis(nextState, 'rows', 'variation')).toHaveLength(1);
  });

  it('applies preset settings onto the active variation without mutating the preset entry', () => {
    const storage = normalizeGridStorage(DEFAULT_SETTINGS, SITE_KEY);
    const siteState = getSiteState(storage, SITE_KEY);
    const preset = getPatternsForAxis(siteState, 'columns', 'preset').find(
      (pattern) => pattern.name === 'Web 12',
    );

    expect(preset).toBeDefined();

    const nextState = applyPatternSelection(siteState, preset!.id);
    const activePattern = getActivePattern(nextState);
    const preservedPreset = nextState.patterns.find((pattern) => pattern.id === preset!.id);

    expect(activePattern.kind).toBe('variation');
    expect(activePattern.name).toBe('Version 1');
    expect(activePattern.settings.count).toBe(12);
    expect(preservedPreset?.kind).toBe('preset');
    expect(preservedPreset?.settings.count).toBe(12);
  });
});
