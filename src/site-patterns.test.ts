import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, type GridAxis } from './utils';
import {
  applyPatternSelection,
  createVariation,
  deleteVariation,
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

  it('removes a variation and falls back to another version on the same axis', () => {
    const storage = normalizeGridStorage(DEFAULT_SETTINGS, SITE_KEY);
    let siteState = getSiteState(storage, SITE_KEY);
    siteState = createVariation(siteState);
    siteState = createVariation(siteState);

    const axisVariations = getPatternsForAxis(siteState, 'columns', 'variation');
    expect(axisVariations).toHaveLength(3);

    const deletedId = axisVariations[0]!.id;
    const nextState = deleteVariation(siteState, deletedId, 'columns');

    expect(nextState).not.toBeNull();
    expect(getPatternsForAxis(nextState!, 'columns', 'variation')).toHaveLength(2);
    expect(nextState!.patterns.some((pattern) => pattern.id === deletedId)).toBe(false);
    expect(getActivePattern(nextState!).id).not.toBe(deletedId);
  });

  it('does not delete the last variation for an axis', () => {
    const storage = normalizeGridStorage(DEFAULT_SETTINGS, SITE_KEY);
    const siteState = getSiteState(storage, SITE_KEY);
    const onlyVariation = getPatternsForAxis(siteState, 'columns', 'variation')[0]!;

    expect(deleteVariation(siteState, onlyVariation.id, 'columns')).toBeNull();
  });
});
