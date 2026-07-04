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
  updateActivePatternSettings,
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

  it('activates a preset by name while preserving color and opacity', () => {
    const storage = normalizeGridStorage(DEFAULT_SETTINGS, SITE_KEY);
    const siteState = getSiteState(storage, SITE_KEY);
    const preset = getPatternsForAxis(siteState, 'columns', 'preset').find(
      (pattern) => pattern.name === 'Web 12',
    );

    expect(preset).toBeDefined();

    const customizedState = updateActivePatternSettings(siteState, {
      ...getActivePattern(siteState).settings,
      color: '#112233',
      opacity: 42,
    });

    const nextState = applyPatternSelection(customizedState, preset!.id);
    const activePattern = getActivePattern(nextState);
    const preservedPreset = nextState.patterns.find((pattern) => pattern.id === preset!.id);

    expect(activePattern.kind).toBe('preset');
    expect(activePattern.name).toBe('Web 12');
    expect(activePattern.settings.count).toBe(12);
    expect(activePattern.settings.color).toBe('#112233');
    expect(activePattern.settings.opacity).toBe(42);
    expect(preservedPreset?.kind).toBe('preset');
    expect(preservedPreset?.settings.count).toBe(12);
  });

  it('creates a new variation when editing a selected preset', () => {
    const storage = normalizeGridStorage(DEFAULT_SETTINGS, SITE_KEY);
    const siteState = getSiteState(storage, SITE_KEY);
    const preset = getPatternsForAxis(siteState, 'columns', 'preset').find(
      (pattern) => pattern.name === 'Web 12',
    );

    expect(preset).toBeDefined();

    const presetState = applyPatternSelection(siteState, preset!.id);
    const editedState = updateActivePatternSettings(presetState, {
      ...getActivePattern(presetState).settings,
      count: 10,
    });
    const activePattern = getActivePattern(editedState);

    expect(activePattern.kind).toBe('variation');
    expect(activePattern.name).toBe('Version 2');
    expect(activePattern.settings.count).toBe(10);
    expect(getPatternsForAxis(editedState, 'columns', 'variation')).toHaveLength(2);
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
